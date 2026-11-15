// The museum as a smoke test: every exhibit runs on the real rules and ends where its check says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXHIBITS } from '../../src/dev/museum-data.js';
import { RUNNERS } from '../../src/dev/museum-exhibits.js';

test('every exhibit has a sign, files and a runner', ()=>
{
    for (const e of EXHIBITS)
    {
        assert.ok(e.title && e.text && e.wrong && e.files.length, e.id);
        assert.ok(RUNNERS[e.id], e.id);
    }
});

test('every exhibit runs to its check', ()=>
{
    const seconds = { motion: 30, closing: 15.5, chain: 2, lives: 6 };
    for (const e of EXHIBITS)
    {
        const r = RUNNERS[e.id], s = r.build();
        for (let t = 0; t < seconds[e.id]; t += 1 / 60) r.step(s, 1 / 60);
        const c = r.check(s);
        assert.ok(c.ok, `${e.id}: ${c.detail}`);
        assert.ok(r.readout(s).length, e.id);
    }
});
