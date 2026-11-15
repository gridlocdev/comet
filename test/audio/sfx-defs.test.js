// Every sound builds, says what it means, starts promptly and peaks in range; a loop repeats without a seam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RATE } from '../../src/lib/synth.js';
import { SFX_DEFS } from '../../src/audio/sfx-defs.js';

test('every sound builds, says what it means, starts within 10 ms and peaks between .1 and 1', ()=>
{
    for (const [name, def] of Object.entries(SFX_DEFS))
    {
        assert.ok(def.says, name);
        assert.ok(def.family, name);
        const data = def.make();
        assert.ok(data.length > 0, name);
        assert.ok(data.every(Number.isFinite), `${name} has a bad sample`);
        let peak = 0; for (const x of data) peak = Math.max(peak, Math.abs(x));
        assert.ok(peak >= .1 && peak <= 1, `${name} peaks at ${peak}`);
        const start = data.findIndex((x)=> Math.abs(x) > peak * .1);
        assert.ok(start / RATE < .01, `${name} takes ${(start / RATE * 1000).toFixed(1)} ms to start`);
        assert.ok(data.length / RATE <= 2, `${name} is over 2 s`);
    }
});

test('a loop joins its own start: no jump bigger than the wave makes anywhere else', ()=>
{
    for (const [name, def] of Object.entries(SFX_DEFS))
    {
        if (!def.loop) continue;
        const d = def.make();
        let biggest = 0;
        for (let i = 1; i < d.length; i++) biggest = Math.max(biggest, Math.abs(d[i] - d[i - 1]));
        assert.ok(Math.abs(d[0] - d[d.length - 1]) <= biggest + 1e-6, `${name} clicks where it repeats`);
    }
});
