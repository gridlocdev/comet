// Web Audio: baked UI sounds from sfx-defs.js, and recorded samples a game loads, played once or as held loops.
// Browsers keep audio off until the first key or tap, so everything starts then.
import { FLAGS } from '../platform/engine.js';
import { RATE } from '../lib/synth.js';
import { SFX_DEFS } from './sfx-defs.js';

let ctx = null, master = null, enabled = !FLAGS.mute;
const buffers = {}, last = {};
// recorded samples a game asks for: { name: { url, level } }, decoded once audio starts
const samples = {}, loops = {};

function start()
{
    if (ctx || !enabled) return;
    const AC = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createDynamicsCompressor();
    master.threshold.value = -14; master.ratio.value = 5;
    const out = ctx.createGain();
    out.gain.value = .85;
    master.connect(out).connect(ctx.destination);
    for (const [name, def] of Object.entries(SFX_DEFS)) bake(name, def);
    for (const name of Object.keys(samples)) decode(name);
}

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

export const sfx = {
    setEnabled(on)
    {
        enabled = on && !FLAGS.mute;
        if (enabled) { start(); ctx?.resume(); }
        else if (ctx) ctx.suspend();
    },
    // a recorded sound from a file, played with play() or loop() once it has loaded
    load(name, url, level = 1)
    {
        samples[name] = { url, level };
        if (ctx) decode(name);
    },
    play(name, volume = 1, pitch = 1)
    {
        const def = SFX_DEFS[name] ?? samples[name], buf = buffers[name];
        if (!def || !buf || !enabled) return;
        const now = ctx.currentTime;
        if (now - (last[name] ?? -9) < (def.gap ?? .03)) return;
        last[name] = now;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = pitch * (1 + (Math.random() - .5) * (def.vary ?? 0));
        const g = ctx.createGain();
        g.gain.value = volume * (def.level ?? 1);
        src.connect(g).connect(master);
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
            src.connect(g).connect(master);
            src.start();
            l = loops[name] = { src, g };
        }
        const t = ctx.currentTime;
        l.g.gain.setTargetAtTime(volume * (samples[name]?.level ?? 1), t, .05);
        l.src.playbackRate.setTargetAtTime(pitch, t, .05);
    },
};
