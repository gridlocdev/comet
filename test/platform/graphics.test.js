// The quality presets and the frame-rate watchdog that steps down through them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, graphics, watchFrames } from '../../src/platform/graphics.js';

const run = (seconds, fps)=> { for (let t = 0; t < seconds; t += 1 / fps) watchFrames(1 / fps); };

test('high is the game as designed, at up to 2 pixels per CSS pixel, and each lower preset fills fewer', ()=>
{
    assert.equal(PRESETS.high.dpr, 2);
    assert.ok(PRESETS.medium.dpr < PRESETS.high.dpr && PRESETS.low.dpr < PRESETS.medium.dpr);
});

test('Automatic stays on high at full speed, and steps down one rung at a time while frames run slow', ()=>
{
    let changes = 0;
    graphics.onChange(()=> changes++);
    graphics.set('auto');
    run(30, 60);
    assert.equal(graphics.name, 'auto high');
    run(4, 25);
    assert.equal(graphics.name, 'auto medium');
    assert.equal(graphics.dpr, 1.5);
    run(5, 25);
    assert.equal(graphics.name, 'auto medium', 'at most one step every ten seconds');
    run(6, 25);
    assert.equal(graphics.name, 'auto low');
    run(60, 25);
    assert.equal(graphics.dpr, .7, 'past Low it lowers the pixel ratio further, to .7');
    run(30, 60);
    assert.equal(graphics.dpr, .7, 'it does not step back up on its own');
    assert.equal(changes, 4, 'the engine hears every step');
});

test('a short stall is not a step, and choosing a preset by hand holds it and starts Automatic over', ()=>
{
    graphics.set('auto');
    run(5, 60); run(1, 20); run(5, 60);
    assert.equal(graphics.name, 'auto high');
    graphics.set('medium');
    run(30, 20);
    assert.equal(graphics.name, 'medium');
    graphics.set('auto');
    assert.equal(graphics.name, 'auto high');
    graphics.set('nonsense');
    assert.equal(graphics.name, 'auto high');
});
