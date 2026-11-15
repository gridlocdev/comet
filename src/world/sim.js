// Comet's rules, one fixed step at a time, with no drawing or sound: hold to latch onto the nearest anchor and swing
// round it, let go to fly off along the tangent. Good swings build a chain that multiplies the score; motes give
// points, speed and extra lives; the deadly edge creeps in and hazards appear as the run goes on.
// step() queues sounds in world.sfx as { id: 'snap' | 'chime' | 'crash', pitch } for the caller to play and clear.
// The comet's own motion is in player/comet.js, the motes in motes.js, the edge and hazards in hazards.js.
import { prng } from '../lib/rng.js';
import { beginSpawn, fly, launch, letGo, newComet, orbit, pushTrail, swingLimit, tryLatch } from '../player/comet.js';
import { CONFIG, LEVEL } from './comet-data.js';
import { hitsDanger, trySpawnHazards } from './hazards.js';
import { updateMotes } from './motes.js';
import { mult } from './score.js';

export function createWorld(cfg = CONFIG, level = LEVEL)
{
    const w = {
        cfg, level, rng: prng(cfg.prngSeed),
        player: null, anchors: [], motes: [], hazards: [],
        t: 0, lives: 0, earnedLives: 0, scoreAccum: 0, eventPoints: 0, chain: 0, motesCollected: 0,
        nextLifeAt: 0, lifeStep: 0, hazardsSpawned: 0, launchAt: 0,
        gameOver: false, life: 'spawning',      // spawning | active | dead
        sfx: [], crashFlash: 0, perfectFlash: 0, lifeFlash: 0,
    };
    reset(w);
    return w;
}

export function reset(w)
{
    const c = w.cfg;
    w.t = 0; w.lives = c.lives; w.scoreAccum = 0; w.eventPoints = 0; w.chain = 0; w.motesCollected = 0; w.earnedLives = 0;
    w.lifeStep = 3; w.nextLifeAt = 3;       // each extra life costs one more mote than the last: 3, 7, 12, 18…
    w.gameOver = false; w.hazardsSpawned = 0;
    w.crashFlash = w.perfectFlash = w.lifeFlash = 0;
    w.rng.reseed(c.prngSeed);
    w.sfx.length = 0;
    w.anchors = w.level.anchors.map(([x, y])=> ({ x, y, dormantUntil: 0 }));
    w.motes = w.level.motes.map(([x, y])=> ({ x, y, active: true, respawnAt: 0 }));
    w.hazards = [];
    w.player = newComet();
    beginSpawn(w, true);
}

export const invulnerable = (w)=> w.t < w.player.invulnUntil;

// held: the swing button is down. pressed: it went down this step. bias: { x, y } toward the anchor to prefer (y down)
export function step(w, dt, held, pressed, bias = { x: 0, y: 0 })
{
    if (w.gameOver) return;
    if (w.crashFlash > 0) w.crashFlash--;
    if (w.perfectFlash > 0) w.perfectFlash--;
    if (w.lifeFlash > 0) w.lifeFlash--;

    // crashed: everything waits, the clock too, until the button is pressed
    if (w.life === 'dead')
    {
        if (pressed) beginSpawn(w, false);
        return;
    }

    w.t += dt;
    const now = w.t, p = w.player;

    if (w.life === 'spawning')
    {
        if (now >= w.launchAt) launch(w);
        else { pushTrail(w); return; }
    }

    if (p.latched)
    {
        if (held)
        {
            orbit(w, dt);
            if (p.swept >= swingLimit(w.cfg)) forceSnap(w, now);
        }
        else
        {
            release(w, now);
            fly(p, dt);
        }
    }
    else
    {
        if (held) tryLatch(w, now, bias);
        if (!p.latched) fly(p, dt);
    }

    updateMotes(w, now);
    trySpawnHazards(w);
    w.scoreAccum += p.v * dt * w.cfg.scoreRate * mult(w.chain, w.cfg);
    if (!invulnerable(w) && hitsDanger(w)) crash(w);
    pushTrail(w);
}

// let go: a long enough swing builds the chain, speeds up and scores
function release(w, now)
{
    const c = w.cfg, p = w.player;
    letGo(w, now);
    if (p.swept >= c.minArc)
    {
        w.chain++;
        p.v = Math.min(c.vMax, p.v + c.swingBoost);
        w.eventPoints += Math.round(c.swingScore * mult(w.chain, c));
        w.sfx.push({ id: 'snap', pitch: 1 });
        perfectCheck(w);
    }
    else w.sfx.push({ id: 'snap', pitch: .7 });       // too short a swing: a softer snap, no reward
    p.anchor = -1;
}

// held on too long: off along the tangent, with nothing for it
function forceSnap(w, now)
{
    letGo(w, now);
    w.sfx.push({ id: 'snap', pitch: .5 });
    w.player.anchor = -1;
}

// a release aimed at a mote close ahead is a perfect: a bonus and more speed
function perfectCheck(w)
{
    const c = w.cfg, p = w.player;
    const cone = c.perfectConeDeg * Math.PI / 180;
    const vl = Math.hypot(p.vx, p.vy);
    const [ux, uy] = vl > 1e-3 ? [p.vx / vl, p.vy / vl] : [0, 0];
    let best = -1, bestD = Infinity;
    w.motes.forEach((m, i)=>
    {
        if (!m.active) return;
        const tx = m.x - p.x, ty = m.y - p.y, d = Math.hypot(tx, ty);
        if (d > c.perfectRange || d < 1e-3) return;
        const ang = Math.acos(Math.max(-1, Math.min(1, ux * tx / d + uy * ty / d)));
        if (ang > cone) return;
        if (d < bestD) { bestD = d; best = i; }
    });
    if (best < 0) return;
    const k = mult(w.chain, c);
    w.eventPoints += Math.round(c.perfectBonusScore * k);
    p.v = Math.min(c.vMax, p.v + c.perfectBonusSpeed);
    w.sfx.push({ id: 'chime', pitch: (1 + .15 * (k - 1)) * 1.26 });
    w.perfectFlash = 6;
}

function crash(w)
{
    const p = w.player;
    w.lives--;
    w.earnedLives = Math.min(w.earnedLives, w.lives);     // the starting lives go first, so an earned one stays yellow
    w.chain = 0;
    w.sfx.push({ id: 'crash', pitch: 1 });
    w.crashFlash = 8;
    p.latched = false; p.anchor = -1; p.vx = p.vy = 0;
    p.trail.length = 0;
    if (w.lives <= 0) w.gameOver = true;
    else w.life = 'dead';
}
