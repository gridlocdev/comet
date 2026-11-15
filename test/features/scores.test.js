// The scores feature through its contract: a run ends, the player enters initials with the keys, and the save, the
// events and the best() hook show it. The save starts as 1.0.0 left it, to check it carries over.
import { fire } from '../dom.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearPresses, pollInput } from '../../src/platform/input.js';
import { storage } from '../../src/platform/storage.js';
import { state } from '../../src/game/state.js';
import { events } from '../../src/game/events.js';
import scores from '../../src/features/scores/index.js';

const KEY = 'comet-save-v1';
const saved = { [KEY]: JSON.stringify({ comet: { table: [{ name: 'OLD', score: 100 }], lastName: 'OLD' } }) };
storage.backend = { async load() { return { ...saved }; }, write(all) { Object.assign(saved, all); } };
const ctx = { state, events };
const press = (code)=> { fire('keydown', { code }); pollInput(); scores.update(1 / 60, ctx); clearPresses(); fire('keyup', { code }); };
const slice = ()=> JSON.parse(saved[KEY]).scores;

test('1.0.0 saves keep their top ten', async ()=>
{
    await storage.init();
    state.load();
    scores.build(ctx);
    assert.equal(scores.best(), 100);
});

test('a score that makes the ten asks for initials, saves them and says when it is done', ()=>
{
    let done = 0;
    events.on('scores-done', ()=> done++);
    events.emit('run-ended', { score: 500 });
    assert.equal(done, 0, 'waits for the initials');
    // focus starts on Done, under the last name; up to the ▼ row, pick it (O → N), down to Done, pick it
    press('ArrowUp');
    press('Enter');
    press('ArrowDown');
    press('Enter');
    assert.equal(done, 1);
    assert.deepEqual(slice().table, [{ name: 'NLD', score: 500 }, { name: 'OLD', score: 100 }]);
    assert.equal(slice().lastName, 'NLD');
    assert.equal(scores.best(), 500);
});

test('a score that misses the ten is done at once', ()=>
{
    let done = 0;
    events.on('scores-done', ()=> done++);
    events.emit('run-ended', { score: 0 });
    assert.equal(done, 1);
    assert.equal(slice().table.length, 2);
});
