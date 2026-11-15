// Runs in render.mjs's hidden window, at the root of the music-generator folder. ?id=<track> composes that track
// and plays it through music-generator's song player on an OfflineAudioContext, then hands back a WAV.
//
// The song player was written for a live AudioContext: it schedules notes a little ahead on a timer, and voices
// tidy up on timers and when they end. Here those timers run on a virtual clock in audio time. The context renders
// in 25 ms steps (suspend/resume), and at each stop whatever was due runs, so voice stealing, releases and sample
// tails behave exactly as they would live.
const host = /** @type {any} */ (window).renderHost;
const params = new URLSearchParams(location.search);

const LEAD_IN = 0.25;       // song-player.js: seconds between play and the first beat
const KEEP = 0.05;          // of that, kept before the first beat, so a note nudged early isn't clipped
const TAIL = 4;             // seconds after the last beat, for the reverb and delay to ring out
const LOOP_SPARE = 0.25;   // seconds a looping track's file runs past its loop's end
const SEAM = 0.04;          // seconds crossfaded at a loop's end (no more than KEEP, which is all there is before it)
const STEP = 0.025;         // song-player.js schedules every 25 ms
const RATE = 44100;
const TARGET_RMS_DB = -20;  // every track is brought to the same loudness...
const PEAK_DB = -1;         // ...unless that would push a peak past this

// ---------------------------------------------------------------- the virtual clock
const real = { setTimeout: window.setTimeout.bind(window) };
let ctx = null;
const clock = ()=> ctx ? ctx.currentTime : 0;
let timers = [], nextId = 1;
const add = (fn, ms, every)=> { const id = nextId++; timers.push({ id, fn, at: clock() + (ms || 0) / 1000, every }); return id; };
const clear = (id)=> { timers = timers.filter((t)=> t.id !== id); };
Object.assign(window, {
    setTimeout: (fn, ms, ...a)=> add(()=> fn(...a), ms, 0),
    setInterval: (fn, ms, ...a)=> add(()=> fn(...a), ms, Math.max(1, ms) / 1000),
    clearTimeout: clear,
    clearInterval: clear,
    // ticker.js runs its timer in a Worker; without one it falls back to setInterval, which is the clock above
    Worker: function () { throw new Error('no workers while rendering'); },
});
function runDue()
{
    for (;;)
    {
        const now = clock();
        const due = timers.filter((t)=> t.at <= now + 1e-9).sort((a, b)=> a.at - b.at)[0];
        if (!due) return;
        if (due.every) due.at += due.every;
        else clear(due.id);
        due.fn();
    }
}
// lets queued events (a voice's onended) run between steps
const yieldTask = ()=> new Promise((r)=> real.setTimeout(r, 0));

// ---------------------------------------------------------------- rendering
async function render(id)
{
    const { TRACKS } = await import('/__songs.js');
    const track = TRACKS.find((t)=> t.id === id);
    if (!track) throw new Error(`no track ${id}`);
    const { compose } = await import('/src/composer/compose.js');
    const { toProject } = await import('/src/composer/to-project.js');
    const { beatToSeconds } = await import('/src/lib/tempo-map.js');
    const score = compose(track.spec);
    track.shape?.(score);
    if (track.loop) steadyGrid(id, score, track.loop);
    const length = Math.ceil((LEAD_IN + score.seconds + TAIL) * RATE);
    ctx = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate: RATE });
    // audio-engine.js makes its context with `new AudioContext()`; a constructor that returns an object makes `new`
    // give that object, so the master chain, the mixer and every voice are built on the offline context
    /** @type {any} */ (window).AudioContext = function () { return ctx; };

    // music-generator plays a song as a project (the score's parts as tracks, its mix baked in, the Humanize FX on
    // every track), as its own Play and Export do
    const { loadInstruments } = await import('/src/daw/instruments.js');
    const { playProject } = await import('/src/daw/player.js');
    const { registerFx } = await import('/src/daw/fx.js');
    const { HUMANIZE, humanizeFx } = await import('/src/composer/humanize-fx.js');
    registerFx(HUMANIZE, humanizeFx);
    const project = { ...toProject(score), loop: null };
    let last = '';
    const instruments = await loadInstruments(project.tracks, (s)=> { if (s && (s.replace(/\d+%/, '') !== last.replace(/\d+%/, '') || s.endsWith('100%'))) host.log(`  ${s}`); last = s ?? ''; });
    // the player's ticker is driven by the virtual clock below
    playProject(project, instruments, { from: 0, until: score.beats, ticker: (ms, fn)=> { const t = setInterval(fn, ms); return ()=> clearInterval(t); } });

    const end = length / RATE;
    let next = STEP;
    const step = async ()=>
    {
        runDue();
        await yieldTask();
        runDue();
        next += STEP;
        if (next < end - 128 / RATE) ctx.suspend(next).then(step);
        ctx.resume();
    };
    ctx.suspend(STEP).then(step);
    runDue();
    const buffer = await ctx.startRendering();

    // the composer's tempo map, not one tempo: an ending's ritardando moves a cue's end
    const at = (beat)=> +(KEEP + beatToSeconds(score.tempoMap, beat)).toFixed(5);
    if (track.loop && score.sections[track.loop[0]].type !== score.sections[track.loop[1]].type)
        throw new Error(`${id}: the loop ends on a ${score.sections[track.loop[1]].type}, but starts on a ${score.sections[track.loop[0]].type}`);
    let loop = track.loop && { start: at(score.sections[track.loop[0]].beat), end: at(score.sections[track.loop[1]].beat) };
    // a trimmed track starts at its loop: what came before it is only there to ring into it
    const cut = track.trim && loop ? loop.start - KEEP : 0;
    if (cut) loop = { start: KEEP, end: +(loop.end - cut).toFixed(5) };

    // drop most of the lead-in; a looping track never plays past its loop's end, so it stops a moment after it
    const skip = Math.round((LEAD_IN - KEEP + cut) * RATE);
    const keep = loop ? Math.round((loop.end + LOOP_SPARE) * RATE) : Infinity;
    const chans = [0, 1].map((c)=> buffer.getChannelData(c).subarray(skip, skip + keep));
    // the bars after a loop's end are nearly, not exactly, the bars at its start (a repeat plays a little louder,
    // and notes drift by a few ms), so the wrap could click: fade the loop's last moments into what comes just
    // before its start, which is what the start follows on from
    if (loop)
    {
        const n = Math.round(SEAM * RATE), end = Math.round(loop.end * RATE), start = Math.round(loop.start * RATE);
        for (const d of chans) for (let i = 0; i < n; i++) { const w = (i + 1) / n; d[end - n + i] = d[end - n + i] * (1 - w) + d[start - n + i] * w; }
    }
    let sum = 0, n = 0, peak = 0;
    for (const d of chans) for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); peak = Math.max(peak, v); if (v > 1e-4) { sum += v * v; n++; } }
    const rmsDb = 10 * Math.log10(sum / Math.max(1, n) + 1e-12), peakDb = 20 * Math.log10(peak + 1e-12);
    const gainDb = Math.min(TARGET_RMS_DB - rmsDb, PEAK_DB - peakDb);
    const gain = 10 ** (gainDb / 20);

    // a track whose meter changes lists its bar lines (seconds into the file, to its loop's end), as the game can't
    // count them from one meter
    let bars = null;
    if (score.sections.some((s)=> s.beatsPerBar !== score.beatsPerBar))
    {
        const last = loop ? loop.end : at(score.beats);
        bars = [];
        for (const s of score.sections)
            for (let b = s.beat; b < s.beat + s.beats - 1e-9; b += s.beatsPerBar)
            {
                const x = +(at(b) - cut).toFixed(5);
                if (x >= 0 && x <= last + 1e-4) bars.push(x);
            }
        if (loop && !bars.some((x)=> Math.abs(x - loop.end) < 1e-4)) bars.push(loop.end);
    }

    const frames = chans[0].length;
    const info = {
        title: score.title, tempo: score.tempo, beatsPerBar: score.beatsPerBar, offset: KEEP, seconds: frames / RATE, end: loop ? null : at(score.beats),
        frames, sampleRate: RATE, loop, gainDb, bars,
    };
    return { info, wav: wav32(chans, gain) };
}

// The game finds bar lines from one tempo (tracks-data.js), so a looping track must keep it from its start to its
// loop's end. The composer pushes the tempo a little from the climax on, and a section can set its own tempo; either
// before the loop's end would put the game's beats out of step with the music. A section may change the meter: the
// track then lists its bar lines (`bars`).
function steadyGrid(id, score, loop)
{
    const until = score.sections[loop[1]].beat;
    const change = score.tempoMap.find((m, i)=> m.beat < until - 1e-9 && (i > 0 || m.to !== undefined));
    if (change)
        throw new Error(`${id}: the tempo changes at beat ${change.beat}, before the loop's end at beat ${until}, and the game counts bars at one tempo. ` +
            `Set push: 0 in the spec (the climax's push), or take the tempo off that section`);
}

// interleaved 32-bit float WAV
function wav32(chans, gain)
{
    const frames = chans[0].length, bytes = frames * chans.length * 4;
    const buf = new ArrayBuffer(44 + bytes), v = new DataView(buf);
    const str = (o, s)=> { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, chans.length, true);
    v.setUint32(24, RATE, true); v.setUint32(28, RATE * chans.length * 4, true); v.setUint16(32, chans.length * 4, true); v.setUint16(34, 32, true);
    str(36, 'data'); v.setUint32(40, bytes, true);
    const out = new Float32Array(buf, 44);
    for (let i = 0, k = 0; i < frames; i++) for (const d of chans) out[k++] = d[i] * gain;
    return buf;
}

// how a file decodes, the way the game decodes it: its length, and the first frame that isn't silent
/** @type {any} */ (window).checkLength = async (url, rate)=>
{
    const data = await (await fetch(url)).arrayBuffer();
    const decoded = await new OfflineAudioContext(2, 1, rate).decodeAudioData(data);
    const d = decoded.getChannelData(0);
    let onset = 0;
    while (onset < d.length && Math.abs(d[onset]) < 1e-3) onset++;
    return { frames: decoded.length, onset };
};

const id = params.get('id');
if (id) render(id).then(({ info, wav })=> host.rendered(info, wav), (e)=> host.failed(String(e?.stack || e)));
