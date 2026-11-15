import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIG, LEVEL, SCREEN } from '../../src/world/comet-data.js';

test('comet-data is plain data that imports nothing', ()=>
{
    const src = readFileSync(new URL('../../src/world/comet-data.js', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /^\s*(import|export \{[^}]*\} from)/m);
    for (const v of [SCREEN, CONFIG, LEVEL]) assert.equal(typeof v, 'object');
    for (const [k, v] of Object.entries(CONFIG)) assert.ok(Number.isFinite(v), k);
});

test('the numbers are in range', ()=>
{
    const c = CONFIG;
    assert.ok(c.vMin < c.vSpawn && c.vSpawn < c.vMax);
    assert.ok(c.latchRangeMin < c.latchRangeBase);
    assert.ok(c.anchorCooldownBase < c.anchorCooldownMax);
    assert.ok(c.lives > 0 && c.lives <= c.maxLives);
    assert.ok(c.borderMax < SCREEN.h / 2, 'the edge never closes the field');
    assert.ok(c.spawnDelayMin < c.spawnDelayMax);
});

test('the arena fits the screen, with one mote per slot', ()=>
{
    for (const [x, y] of [...LEVEL.anchors, ...LEVEL.motes]) assert.ok(x > 0 && x < SCREEN.w && y > 0 && y < SCREEN.h);
    assert.equal(LEVEL.motes.length, CONFIG.moteCount);
});
