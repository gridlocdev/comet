// The soundtrack: one track per place or moment, from music/ (rendered from music-generator songs by tools/music),
// changing on the beat.
//
// The area decides what plays (setMusicArea; 'main' until something sets it). A change waits for the playing track's next
// bar line (or beat, when bars are long), starts the new track there and lets the old one fade out across about a
// bar, so the music turns a corner instead of cutting. A track marked with musicCutIn (a game over sting) doesn't
// wait: it stops whatever is playing and starts at once, and is kept decoded so it never waits to load either.
import { MOBILE } from '../platform/engine.js';
import { events } from '../game/events.js';
import { setting } from '../game/settings.js';
import { sfx, volumeGain } from './sfx.js';
import { TRACKS } from './tracks-data.js';

// the sound effects' context; music starts with it, after the first key or tap (and never with ?mute)
let audioContext = null, audioMasterGain = null;

const LEVEL = 1.6;          // the music bus at full Music volume. Set against the effects' level in audio/sfx.js so
                            // the two sit close at the default volumes (docs/audio.md)
const SLIDE = .05;          // seconds (time constant) for a slider change to settle
const MAX_WAIT = 2.5;       // seconds; when a bar is longer than this, a change waits for the next beat instead
const FADE = [1.2, 3];      // seconds; an old track fades out over a bar, kept inside these
const ONE_SHOT_IN = .3;     // seconds; a one-shot comes in quickly, it was written to start
const CUT = .02;            // seconds; a cut-in track's attack, and how fast it silences the old one (no click)
const LEAD = .06;           // seconds of scheduling headroom
const KEEP_DECODED = MOBILE ? 1 : 3;     // decoded tracks kept (a long one is about 60 MB; a phone may reload the tab)

let started = false, bus = null, busLevel = -1, settleUntil = 0, volume = 1, duck = 1;
let area = ()=> 'main';     // the track that plays
/** @param {() => string} fn the area's track id, asked every frame */
export const setMusicArea = (fn)=> { area = fn; };
/** lowers the music (0 to 1) without stopping it, as under a pause menu; 1 for full */
export const setMusicDuck = (v)=> { duck = v; };
let current = null;         // { id, track, src, gain, when, at, shift }: the source starts at `when`, its first beat is `at`
const fading = [];          // tracks on their way out
const cutIn = new Set();    // tracks that interrupt instead of waiting for a downbeat

/**
 * Marks a track to cut in: the moment it is wanted it stops the playing track and starts, with no wait for a bar line
 * and no crossfade. It is decoded as soon as the music starts and kept, so it can start the same frame.
 * @param {string} id a track id in tracks-data.js
 */
export function musicCutIn(id)
{
    cutIn.add(id);
    if (bus) load(id);
}


// ---------------------------------------------------------------- loading
const files = new Map();        // id → Promise<ArrayBuffer | null>: the small encoded files, kept once fetched
const ready = new Map();        // id → { buf, shift }: decoded, most recently used last
const decoding = new Set(), failed = new Set();
function load(id)
{
    if (ready.has(id) || decoding.has(id) || failed.has(id)) return;
    const t = TRACKS[id];
    decoding.add(id);
    if (!files.has(id)) files.set(id, fetch(t.file).then((r)=> r.ok ? r.arrayBuffer() : null).catch(()=> null));
    // decodeAudioData takes the buffer it is given, so it gets a copy and the file stays for next time
    files.get(id)
        .then((data)=> data && audioContext.decodeAudioData(data.slice(0)))
        .catch(()=> null)
        .then((buf)=>
        {
            decoding.delete(id);
            if (!buf) { failed.add(id); return; }     // a missing file is silence, not an error
            // a decoder that left the mp3's encoder delay in (about 1105 frames) would put every beat late; follow it
            const shift = buf.length / buf.sampleRate - t.frames / t.rate > .02 ? 1105 / t.rate : 0;
            ready.set(id, { buf, shift });
            for (const old of [...ready.keys()])
                if (ready.size > KEEP_DECODED + cutIn.size && old !== id && old !== current?.id && !cutIn.has(old) && !fading.some((f)=> f.id === old)) ready.delete(old);
        });
}
function use(id)
{
    const r = ready.get(id);
    ready.delete(id); ready.set(id, r);
    return r;
}

// ---------------------------------------------------------------- timing
const spb = (t)=> 60 / t.tempo;
// where in its file a track is at audio time `now`, following its loop
function position(v, now)
{
    const p = now - v.when - v.shift;
    const loop = v.track.loop;
    if (!loop || p < loop.end) return p;
    return loop.start + (p - loop.start) % (loop.end - loop.start);
}
// the audio time of the playing track's next bar line (or beat), never sooner than `earliest`
function nextDownbeat(v, earliest)
{
    const t = v.track, p = position(v, earliest);
    // a track that changes meter lists its bar lines
    if (t.bars)
    {
        const bar = t.bars.find((x)=> x >= p - 1e-6);
        if (bar !== undefined && bar - p <= MAX_WAIT) return earliest + (bar - p);
    }
    const step = spb(t) * (spb(t) * t.beatsPerBar <= MAX_WAIT ? t.beatsPerBar : 1);
    const beat = p - t.offset;
    if (beat < 0) return earliest - beat;
    const next = Math.ceil(beat / step - 1e-6) * step;
    return earliest + (next - beat);
}

// ---------------------------------------------------------------- playing
function startTrack(id, at)
{
    const t = TRACKS[id], { buf, shift } = use(id);
    const ctx = audioContext;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (t.loop) { src.loop = true; src.loopStart = t.loop.start + shift; src.loopEnd = t.loop.end + shift; }
    const gain = ctx.createGain();
    src.connect(gain).connect(bus);
    // the file's first beat lands on `at`, when there is time to start it a hair early
    const when = Math.max(ctx.currentTime + .01, at - t.offset - shift);
    src.start(when);
    const fadeIn = cutIn.has(id) ? CUT : t.loop ? clampFade(spb(t) * t.beatsPerBar) : ONE_SHOT_IN;
    curve(gain.gain, 0, 1, when, fadeIn);
    return { id, track: t, src, gain, when, at, shift };
}
const clampFade = (s)=> Math.min(FADE[1], Math.max(FADE[0], s));
// an eased ramp: a raised cosine from a to b
function curve(param, a, b, at, dur)
{
    const now = audioContext.currentTime;
    const n = 32, c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = a + (b - a) * (.5 - .5 * Math.cos(Math.PI * i / (n - 1)));
    param.cancelScheduledValues(now);
    param.setValueAtTime(a, now);
    try { param.setValueCurveAtTime(c, Math.max(at, now + .005), dur); }
    catch (e) { param.linearRampToValueAtTime(b, Math.max(at, now + .005) + dur); }
}
function fadeOut(v, at, dur)
{
    const now = audioContext.currentTime;
    const level = v.gain.gain.value;
    curve(v.gain.gain, level, 0, at, dur);
    v.fadeAt = at;
    try { v.src.stop(Math.max(at, now) + dur + .05); } catch (e) {}
    v.src.onended = ()=> { v.gain.disconnect(); const i = fading.indexOf(v); if (i >= 0) fading.splice(i, 1); };
    fading.push(v);
}

function change(id)
{
    const now = audioContext.currentTime;
    // a cut-in silences everything now, whatever was playing or waiting, and starts at once
    if (cutIn.has(id))
    {
        if (current) fadeOut(current, now, CUT);
        current = startTrack(id, now + .005);
        return;
    }
    // a change still waiting for its downbeat is changed again: the same downbeat, or back to what was playing
    if (current && current.at > now + .005)
    {
        try { current.src.stop(); } catch (e) {}
        current.gain.disconnect();
        const at = current.at, back = fading[fading.length - 1];
        if (back && back.id === id && back.fadeAt > now) { fading.pop(); restart(back); }
        else current = startTrack(id, at);
        return;
    }
    let at = now + LEAD;
    if (current)
    {
        const t = current.track, p = position(current, now);
        if (!t.loop && p >= t.seconds) current.gain.disconnect();     // long over
        else if (!t.loop && p >= t.end) fadeOut(current, at, FADE[1]);  // a one-shot's last bar has passed: let it ring out
        else
        {
            at = nextDownbeat(current, now + LEAD);
            fadeOut(current, at, clampFade(spb(t) * t.beatsPerBar));
        }
    }
    current = startTrack(id, at);
}
// Web Audio can't take back a scheduled stop, so a track called back from its fade starts again where it is
function restart(v)
{
    const now = audioContext.currentTime, at = now + LEAD;
    const p = position(v, at);
    try { v.src.stop(); } catch (e) {}
    v.src.onended = null;
    v.gain.disconnect();
    const t = v.track, { buf, shift } = use(v.id);
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    if (t.loop) { src.loop = true; src.loopStart = t.loop.start + shift; src.loopEnd = t.loop.end + shift; }
    const gain = audioContext.createGain();
    src.connect(gain).connect(bus);
    src.start(at, Math.max(0, p + shift));
    current = { ...v, src, gain, when: at - p - shift, at };
}

function musicUpdate()
{
    if (!bus) { musicStart(); if (!bus) return; }
    const now = audioContext.currentTime;
    const level = LEVEL * volume * duck;
    if (level !== busLevel) { busLevel = level; bus.gain.setTargetAtTime(level, now, SLIDE); }
    if (now < settleUntil) return;      // a moment for the game to set its area before the music starts
    const want = area();
    if (want === current?.id || !TRACKS[want]) return;
    if (!ready.has(want)) { load(want); return; }    // keeps the old track going until the new one is decoded
    change(want);
}

// starts the music; call it from the first click or key press (a title screen's Start), when the browser lets audio play
function musicStart()
{
    if (started || !sfx.context) return;
    audioContext = sfx.context; audioMasterGain = sfx.musicOut;
    try
    {
        bus = audioContext.createGain();
        bus.gain.value = 0;
        bus.connect(audioMasterGain);
        started = true;
        settleUntil = audioContext.currentTime + .5;
        load(area());
        for (const id of cutIn) load(id);
    }
    catch (e) { bus = null; }
}
export const musicSystem = {
    build()
    {
        const read = ()=> { volume = setting('audio.musicOn') === false ? 0 : volumeGain(setting('audio.music')); };
        read();
        events.on('settings:changed', ({ id })=> { if (id === 'audio.music' || id === 'audio.musicOn') read(); });
    },
    update: musicUpdate,
};
