import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prng } from '../../src/lib/rng.js';

test('the same seed gives the same numbers, in [0, 1)', ()=>
{
    const a = prng(12345), b = prng(12345);
    const xs = Array.from({ length: 1000 }, ()=> a.float());
    assert.deepEqual(xs, Array.from({ length: 1000 }, ()=> b.float()));
    assert.ok(xs.every((x)=> x >= 0 && x < 1));
    a.reseed(12345);
    assert.equal(a.float(), xs[0]);
    assert.notEqual(prng(1).float(), xs[0]);
});
