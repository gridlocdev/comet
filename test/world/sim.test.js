import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, LEVEL, SCREEN, anchorCooldown, border, latchRange, mult, swingLimit } from '../../src/world/comet-data.js';
import { createWorld, findMoteSpawn, motesToNextLife, reset, score, step } from '../../src/world/sim.js';

const DT = 1 / 60;
const none = { x: 0, y: 0 };
// fly until the spawn pause is over and the comet is moving
const launched = (w)=> { while (w.life === 'spawning') step(w, DT, false, false); return w; };
// a world with the comet placed by hand, moving at (vx, vy), safe from crashing
function placed(x, y, vx, vy)
{
    const w = launched(createWorld());
    Object.assign(w.player, { x, y, vx, vy, v: Math.hypot(vx, vy), invulnUntil: 1e9 });
    return w;
}

test('derived numbers follow the run clock', ()=>
{
    assert.equal(latchRange(0), 140);
    assert.equal(latchRange(100), 120);
    assert.equal(latchRange(1000), 90);
    assert.equal(anchorCooldown(0), .7);
    assert.equal(anchorCooldown(1000), 2);
    assert.equal(border(10), 10);
    assert.equal(border(999), 230);
    assert.deepEqual([0, 3, 4, 8, 11, 12, 100].map((c)=> mult(c)), [1, 1, 1.5, 2, 2, 2.5, 4]);
    assert.ok(Math.abs(swingLimit() - 8 * Math.PI) < 1e-12);
});

test('the level fits the screen and every anchor is reachable from the start', ()=>
{
    for (const [x, y] of [...LEVEL.anchors, ...LEVEL.motes]) assert.ok(x > 0 && x < SCREEN.w && y > 0 && y < SCREEN.h);
    assert.equal(LEVEL.motes.length, CONFIG.moteCount);
});

test('a run starts paused by the middle anchor, then drifts toward the centre', ()=>
{
    const w = createWorld();
    assert.equal(w.life, 'spawning');
    assert.equal(w.lives, 3);
    assert.ok(Math.abs(Math.hypot(w.player.x - 640, w.player.y - 360) - 50) < 1e-9);
    launched(w);
    assert.equal(w.life, 'active');
    const p = w.player;
    const towardCentre = (640 - p.x) * p.vx + (360 - p.y) * p.vy;
    assert.ok(towardCentre > 0);
});

test('the same seed plays the same run', ()=>
{
    const a = createWorld(), b = createWorld();
    for (let i = 0; i < 600; i++)
    {
        const held = (i % 90) < 50;
        step(a, DT, held, (i % 90) === 0, none);
        step(b, DT, held, (i % 90) === 0, none);
    }
    assert.deepEqual([a.player.x, a.player.y, score(a), a.lives], [b.player.x, b.player.y, score(b), b.lives]);
    reset(a);
    const c = createWorld();
    assert.deepEqual([a.player.x, a.player.y, a.launchAt], [c.player.x, c.player.y, c.launchAt]);
});

test('holding latches onto the nearest live anchor and swings at a fixed radius', ()=>
{
    const w = placed(640, 300, 300, 0);       // 60 above the middle anchor, moving right
    step(w, DT, true, true);
    const p = w.player;
    assert.ok(p.latched);
    assert.equal(p.anchor, 0);
    assert.ok(Math.abs(p.r - 60) < 1e-9);
    for (let i = 0; i < 20; i++) step(w, DT, true, false);
    assert.ok(Math.abs(Math.hypot(p.x - 640, p.y - 360) - 60) < 1e-6);
    assert.ok(p.swept > 0);
});

test('a direction picks the anchor that way instead of the nearest', ()=>
{
    const near = placed(300, 440, 0, -300);
    step(near, DT, true, true);
    assert.equal(near.player.anchor, 3);           // (380, 500) is nearest
    const w = placed(300, 440, 0, -300);
    step(w, DT, true, true, { x: -1, y: -.6 });    // up and left: the anchor at (200, 360)
    assert.equal(w.player.anchor, 5);
});

test('a long enough swing boosts speed, scores and builds the chain; a short one only snaps', ()=>
{
    const w = placed(640, 300, 300, 0);
    for (const m of w.motes) m.active = false, m.respawnAt = 1e9;     // nothing to aim at, so no perfect
    step(w, DT, true, true);
    const v0 = w.player.v;
    while (w.player.swept < CONFIG.minArc) step(w, DT, true, false);
    step(w, DT, false, false);
    assert.equal(w.chain, 1);
    assert.equal(w.player.v, v0 + CONFIG.swingBoost);
    assert.equal(w.eventPoints, 100);
    assert.ok(w.sfx.some((e)=> e.id === 'snap' && e.pitch === 1));
    assert.ok(w.anchors[0].dormantUntil > w.t);

    const s = placed(900, 160, 300, 0);       // 60 above (900, 220)
    step(s, DT, true, true);
    step(s, DT, false, false);
    assert.equal(s.chain, 0);
    assert.equal(s.eventPoints, 0);
    assert.ok(s.sfx.some((e)=> e.id === 'snap' && e.pitch === .7));
});

test('letting go toward a mote close ahead is a perfect', ()=>
{
    const w = placed(640, 300, 300, 0);
    for (const m of w.motes) m.active = false, m.respawnAt = 1e9;
    step(w, DT, true, true);
    while (w.player.swept < CONFIG.minArc) step(w, DT, true, false);
    // put a mote 100 ahead along the way the comet will leave
    const p = w.player, tx = -Math.sin(p.theta) * p.sign, ty = Math.cos(p.theta) * p.sign;
    Object.assign(w.motes[0], { active: true, x: p.x + tx * 100, y: p.y + ty * 100 });
    step(w, DT, false, false);
    assert.equal(w.eventPoints, 100 + 250);
    assert.equal(w.perfectFlash, 6);
});

test('swinging four full turns snaps the tether with no reward', ()=>
{
    const w = placed(640, 300, 300, 0);
    step(w, DT, true, true);
    let n = 0;
    while (w.player.latched && n++ < 5000) step(w, DT, true, false);
    assert.ok(!w.player.latched);
    assert.ok(w.player.swept >= swingLimit());
    assert.equal(w.chain, 0);
    assert.ok(w.sfx.some((e)=> e.id === 'snap' && e.pitch === .5));
});

test('flying past the creeping edge crashes, and a press respawns', ()=>
{
    const w = launched(createWorld());
    Object.assign(w.player, { x: 20, y: 360, vx: -300, vy: 0, invulnUntil: 0 });
    w.t = 30;   // the edge is 30 in
    step(w, DT, false, false);
    assert.equal(w.life, 'dead');
    assert.equal(w.lives, 2);
    assert.ok(w.sfx.some((e)=> e.id === 'crash'));
    const t = w.t;
    step(w, DT, false, false);
    assert.equal(w.t, t, 'the clock waits while crashed');
    step(w, DT, false, true);
    assert.equal(w.life, 'spawning');
    assert.equal(w.player.v, CONFIG.vMin);
});

test('running out of lives ends the run', ()=>
{
    const w = launched(createWorld());
    w.lives = 1;
    Object.assign(w.player, { x: 2, y: 360, vx: -300, vy: 0, invulnUntil: 0 });
    step(w, DT, false, false);
    assert.ok(w.gameOver);
});

test('motes give points and speed, and extra lives at 3, 7, 12 and 18', ()=>
{
    const w = placed(500, 300, 0, 0);
    const lifeAt = [];
    for (let n = 1; n <= 18; n++)
    {
        const m = w.motes[0];
        m.active = true;
        Object.assign(w.player, { x: m.x, y: m.y });
        const before = w.lives;
        step(w, DT, false, false);
        assert.equal(w.motesCollected, n);
        if (w.lives > before) lifeAt.push(n);
    }
    assert.deepEqual(lifeAt, [3, 7, 12, 18]);
    assert.equal(w.earnedLives, 4);
    assert.equal(motesToNextLife(w), 7);
});

test('a hazard appears after 30 seconds, clear of the middle and the anchors', ()=>
{
    const w = placed(640, 300, 0, 0);
    w.t = 29.99;
    step(w, DT, false, false);
    assert.equal(w.hazards.length, 1);
    const h = w.hazards[0];
    const mx = h.x + h.w / 2, my = h.y + h.h / 2;
    assert.ok(Math.hypot(mx - 640, my - 360) >= 60);
    for (const a of w.anchors) assert.ok(Math.hypot(mx - a.x, my - a.y) >= 60);
});

test('a respawned mote lands inside the edge and off the anchors', ()=>
{
    const w = createWorld();
    w.t = 120;
    for (let i = 0; i < 50; i++)
    {
        const p = findMoteSpawn(w);
        const edge = border(w.t) + CONFIG.moteRadius + 18;
        assert.ok(p.x >= edge && p.x <= SCREEN.w - edge && p.y >= edge && p.y <= SCREEN.h - edge);
        for (const a of w.anchors) assert.ok(Math.hypot(p.x - a.x, p.y - a.y) >= CONFIG.anchorRadius + CONFIG.moteRadius + 6);
    }
});
