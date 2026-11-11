import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RATE, clamp01, normalize, osc, pluck, render, sine, square, tri } from '../../src/lib/synth.js';

test('waves stay in -1..1 and start where they should', ()=>
{
    for (const wave of [sine, tri, square])
        for (let p = 0; p < 3; p += .01) assert.ok(Math.abs(wave(p)) <= 1 + 1e-12);
    assert.equal(sine(0), 0);
    assert.equal(tri(0), 1);
    assert.equal(square(.25), 1);
    assert.equal(square(.75), -1);
});

test('render makes the right length, clipped, with faded ends', ()=>
{
    const s = render(.1, ()=> 2);
    assert.equal(s.length, Math.round(.1 * RATE));
    assert.equal(s[0], 0);
    assert.equal(s.at(-1), 0);
    assert.equal(s[s.length >> 1], 1);
});

test('an oscillator at 1 Hz takes one second for a cycle', ()=>
{
    const a = osc(1, sine, 100);
    const out = Array.from({ length: 101 }, (_, i)=> a(i / 100));
    assert.ok(Math.abs(out[25] - 1) < 1e-9);
    assert.ok(Math.abs(out[100]) < 1e-9);
});

test('envelopes and normalize', ()=>
{
    assert.equal(clamp01(-1), 0);
    assert.equal(clamp01(2), 1);
    assert.equal(pluck(0, .01, 10), 0);
    assert.equal(pluck(.01, .01, 10), 1);
    assert.ok(pluck(.5, .01, 10) < .01);
    const n = normalize(new Float32Array([.1, -.5, .25]));
    assert.ok(Math.abs(Math.max(...n.map(Math.abs)) - .9) < 1e-6);
});
