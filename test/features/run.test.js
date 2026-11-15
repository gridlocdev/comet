// The run feature through its contract: build it with the real game/ modules, press keys like a player, and check
// what the rest of the game sees: its debug() readout, the events it emits and the best() hook it reads.
import { fire } from '../dom.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearPresses, pollInput } from '../../src/platform/input.js';
import { storage } from '../../src/platform/storage.js';
import { state } from '../../src/game/state.js';
import { events } from '../../src/game/events.js';
import { loop } from '../../src/game/loop.js';
import run from '../../src/features/run/index.js';

storage.backend = { async load() { return {}; }, write() {} };
const DT = 1 / 60;
const ctx = { state, events };

// one fixed step; tap is a key pressed and let go within it, hold a key kept down
function step(tap)
{
    if (tap) fire('keydown', { code: tap });
    pollInput();
    run.update(DT, ctx);
    run.draw(DT, ctx);
    clearPresses();
    if (tap) fire('keyup', { code: tap });
}
const steps = (n, tap)=> { for (let i = 0; i < n; i++) step(tap); };
const mode = ()=> run.debug().mode;

test('title → run → pause → resume → game over → results close → title', async ()=>
{
    await storage.init();
    state.load();
    loop.use([{ best: ()=> 1234 }, run]);       // another feature that keeps the best score
    loop.build();
    const ended = [];
    events.on('run-ended', (e)=> ended.push(e));

    assert.equal(mode(), 'menu');
    steps(15);
    step('Space');
    assert.equal(mode(), 'play');
    assert.equal(run.debug().lives, 3);

    steps(30);
    step('Escape');
    assert.equal(mode(), 'paused');
    const t = run.debug().t;
    steps(30);
    assert.equal(run.debug().t, t, 'the run waits while paused');
    step('Escape');                             // back resumes
    assert.equal(mode(), 'play');

    // never swing: the comet flies into the edge; press to come back each time, until the lives run out
    let n = 0;
    while (mode() === 'play' && n++ < 20000) step(run.debug().life === 'dead' ? 'Space' : null);
    assert.equal(mode(), 'over');
    assert.equal(run.debug().lives, 0);
    const score = run.debug().score;
    assert.ok(score > 0, 'flying scores');

    step('Space');                              // too soon: the results stay a moment
    assert.equal(mode(), 'over');
    steps(80);
    step('Space');
    assert.deepEqual(ended, [{ score }]);
    assert.equal(mode(), 'scores', 'waits for the top ten');
    events.emit('scores-done');
    assert.equal(mode(), 'menu');
});

test('holding the button on the way past an anchor swings and builds the chain', ()=>
{
    steps(15);
    step('Space');
    assert.equal(mode(), 'play');
    // the comet drifts in from beside the middle anchor; hold through it, then let go
    let chained = false;
    fire('keydown', { code: 'Space' });
    for (let i = 0; i < 600 && !chained; i++)
    {
        steps(1);
        if (i === 120) fire('keyup', { code: 'Space' });
        if (i > 120) chained = run.debug().chain > 0;
    }
    fire('keyup', { code: 'Space' });
    assert.ok(chained);
});
