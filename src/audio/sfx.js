// Web Audio: sounds baked once from code (sfx-defs.js, and each game's own through define()), and recorded samples a
// game loads, played once or as held loops. Browsers keep audio off until the first key or tap, so everything starts
// then.
//
// The mix: effects → their bus (EFFECTS_LEVEL × Effects volume) → a compressor ┐
//          music (audio/music.js, its own level × Music volume) → musicOut ─────┴→ master (Master volume) → a limiter → out
// Settings (game/settings.js) apply here: the three volumes, Mono audio, and Play in the background.
import { FLAGS } from '../platform/engine.js';
import { RATE } from '../lib/synth.js';
import { events } from '../game/events.js';
import { setting } from '../game/settings.js';
import { SFX_DEFS } from './sfx-defs.js';

// at the default volumes (80% and 80%) effects reach the compressor at full level and leave it at .85, as in 1.0.0
const EFFECTS_LEVEL = 1 / .64;  // the effects bus at full Effects volume
const OUT_LEVEL = .85 / .64;    // after Master volume, into the limiter
const SLIDE = .04;              // seconds (time constant) for a volume change to settle
/** a volume setting (0 to 1) as a gain: squared, so the slider sounds even across its length */
export const volumeGain = (v)=> Math.max(0, Math.min(1, v ?? 1)) ** 2;

let ctx = null, master = null, effectsBus = null, masterGain = null, musicBus = null;
const enabled = !FLAGS.mute;
const buffers = {}, last = {};
// baked sounds a game brings along: { name: def }, in the same form as SFX_DEFS
const defs = {};
// recorded samples a game asks for: { name: { url, level } }, decoded once audio starts; held loops by name
const samples = {}, loops = {};

function start()
{
    if (ctx || !enabled) return;
    const AC = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    effectsBus = ctx.createGain();
    master = ctx.createDynamicsCompressor();
    master.threshold.value = -14; master.ratio.value = 5;
    masterGain = ctx.createGain();
    // a safety limiter, so loud music and a burst of effects at the top of every slider don't clip
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = .002; limiter.release.value = .1;
    const out = ctx.createGain();
    out.gain.value = OUT_LEVEL;
    effectsBus.connect(master).connect(masterGain);
    masterGain.connect(out).connect(limiter).connect(ctx.destination);
    // the soundtrack (audio/music.js) joins after the compressor, so the effects don't pump it
    musicBus = ctx.createGain();
    musicBus.connect(masterGain);
    applyAll(true);
    for (const [name, def] of Object.entries(SFX_DEFS)) bake(name, def);
    for (const [name, def] of Object.entries(defs)) bake(name, def);
    for (const name of Object.keys(samples)) decode(name);
}

function applyAll(now = false)
{
    if (!ctx) return;
    const t = ctx.currentTime;
    const set = (param, value)=> { if (now) param.value = value; else param.setTargetAtTime(value, t, SLIDE); };
    set(masterGain.gain, volumeGain(setting('audio.master')));
    set(effectsBus.gain, EFFECTS_LEVEL * volumeGain(setting('audio.sfx')));
    // mono: everything folded to one channel at the master, then spread to both ears again
    const mono = !!setting('audio.mono');
    masterGain.channelCount = mono ? 1 : 2;
    masterGain.channelCountMode = mono ? 'explicit' : 'max';
    masterGain.channelInterpretation = 'speakers';
}
events.on('settings:changed', ({ id })=> { if (id.startsWith('audio.')) applyAll(); });

function bake(name, def)
{
    const data = def.make();
    const b = ctx.createBuffer(1, data.length, RATE);
    b.copyToChannel(/** @type {Float32Array<ArrayBuffer>} */ (data), 0);
    buffers[name] = b;
}
async function decode(name)
{
    const s = samples[name];
    if (!ctx || s.loading) return;
    s.loading = true;
    try
    {
        const data = await (await fetch(s.url)).arrayBuffer();
        buffers[name] = await ctx.decodeAudioData(data);
    }
    catch (e) { console.warn('sound', name, e); }
}
for (const type of ['keydown', 'pointerdown']) addEventListener(type, ()=> { start(); ctx?.resume(); }, { capture: true });
// a hidden tab goes quiet unless Play in the background is on; sound comes back with the tab (a phone may have
// suspended it meanwhile)
document.addEventListener('visibilitychange', ()=>
{
    if (!ctx) return;
    if (document.hidden) { if (!setting('audio.background')) ctx.suspend().catch(()=> {}); }
    else ctx.resume().catch(()=> {});
});

export const sfx = {
    // the context and where music goes, once audio has started; null before the first key or tap
    get context() { return ctx; },
    get musicOut() { return musicBus; },
    // a game's own baked sound, made when audio starts
    define(name, def)
    {
        defs[name] = def;
        if (ctx) bake(name, def);
    },
    // a recorded sound from a file, played with play() or loop() once it has loaded
    load(name, url, level = 1)
    {
        samples[name] = { url, level };
        if (ctx) decode(name);
    },
    play(name, volume = 1, pitch = 1)
    {
        const def = SFX_DEFS[name] ?? defs[name] ?? samples[name], buf = buffers[name];
        if (!def || !buf || !enabled) return;
        const now = ctx.currentTime;
        if (now - (last[name] ?? -9) < (def.gap ?? .03)) return;
        last[name] = now;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = pitch * (1 + (Math.random() - .5) * (def.vary ?? 0));
        const g = ctx.createGain();
        g.gain.value = volume * (def.level ?? 1);
        src.connect(g).connect(effectsBus);
        src.start();
    },
    // a looping sound held at a volume and pitch, eased toward each new setting; volume 0 is silent
    loop(name, volume, pitch = 1)
    {
        if (!ctx || !enabled) return;
        let l = loops[name];
        if (!l)
        {
            const buf = buffers[name];
            if (!buf || volume <= 0) return;
            const src = ctx.createBufferSource();
            src.buffer = buf; src.loop = true;
            const g = ctx.createGain();
            g.gain.value = 0;
            src.connect(g).connect(effectsBus);
            src.start();
            l = loops[name] = { src, g };
        }
        const t = ctx.currentTime;
        l.g.gain.setTargetAtTime(volume * (samples[name]?.level ?? 1), t, .05);
        l.src.playbackRate.setTargetAtTime(pitch, t, .05);
    },
};
