// The gym as a smoke test of the tuning: every case runs through the real rules, the bot holding the button for the
// latch row, and each green or orange case must pass and each red one fail. A failure names the case.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../../src/world/comet-data.js';
import { band, gymRows } from '../../src/dev/gym-data.js';
import { buildGym, stepRow, verdicts } from '../../src/dev/gym-lanes.js';

test('bands: green to 80% of the limit, orange to the limit, red past it', ()=>
{
    assert.equal(band(80, 100), 'green');
    assert.equal(band(81, 100), 'orange');
    assert.equal(band(100, 100), 'orange');
    assert.equal(band(101, 100), 'red');
});

test('the cases follow the tuning', ()=>
{
    const tuned = gymRows({ ...CONFIG, latchRangeBase: 200 });
    assert.deepEqual(tuned[0].cases.map((c)=> c.value), [100, 150, 180, 196, 210, 250]);
    assert.ok(tuned[0].sign.includes('200 px'));
    for (const row of gymRows()) for (const c of row.cases) assert.ok(['green', 'orange', 'red'].includes(c.band), c.id);
});

test('every case passes or fails as its band says', ()=>
{
    for (const row of buildGym())
    {
        for (let i = 0; i < 60 * 30 && row.lanes.some((l)=> l.c.band && !l.runs); i++) stepRow(row, true, i === 0);
        const v = verdicts(row);
        assert.equal(v.length, row.cases.length, `${row.id}: every case finished a run`);
        for (const c of v) assert.ok(c.ok, `${c.id} is ${c.band} but ${c.shown}`);
    }
});
