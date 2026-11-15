// The rendered soundtrack's data: every track's file, timing and loop points make sense, and every layer has a track.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS } from '../../src/audio/tracks-data.js';

test('every track has a file, a tempo and a length', ()=>
{
    for (const [id, t] of Object.entries(TRACKS))
    {
        assert.equal(t.file, `music/${id}.mp3`, id);
        assert.ok(t.tempo > 0 && t.beatsPerBar > 0, `${id}: tempo and meter`);
        assert.ok(t.seconds > 0 && t.frames > 0 && t.rate > 0, `${id}: length`);
    }
});

test('loops sit inside their files, on whole bars', ()=>
{
    for (const [id, t] of Object.entries(TRACKS))
    {
        if (!t.loop) { assert.ok(t.end > 0 && t.end <= t.seconds, `${id}: a one-shot ends inside its file`); continue; }
        assert.ok(t.loop.start >= 0 && t.loop.end > t.loop.start && t.loop.end <= t.seconds, `${id}: loop inside the file`);
        if (t.bars)
        {
            for (const at of [t.loop.start, t.loop.end]) assert.ok(t.bars.some((x)=> Math.abs(x - at) < 1e-3), `${id}: loop point ${at} on a bar line`);
            assert.ok(t.bars.every((x, i)=> i === 0 || x > t.bars[i - 1]), `${id}: bar lines in order`);
            continue;
        }
        const bars = (t.loop.end - t.loop.start) / (60 / t.tempo * t.beatsPerBar);
        assert.ok(Math.abs(bars - Math.round(bars)) < 1e-3, `${id}: loop is ${bars} bars`);
    }
});

test('a layer fits its track: same tempo and meter, its loop a whole number of times into the track\'s', ()=>
{
    for (const [id, t] of Object.entries(TRACKS))
    {
        if (!t.layerOf) continue;
        const base = TRACKS[t.layerOf];
        assert.ok(base?.loop, `${id}: ${t.layerOf} is a looping track`);
        assert.equal(t.tempo, base.tempo, `${id}: tempo`);
        assert.equal(t.beatsPerBar, base.beatsPerBar, `${id}: meter`);
        const n = (base.loop.end - base.loop.start) / (t.loop.end - t.loop.start);
        assert.ok(Math.abs(n - Math.round(n)) < 1e-3, `${id}: fits ${n} times`);
    }
});
