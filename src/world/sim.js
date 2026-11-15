// Comet's rules, one fixed step at a time, with no drawing or sound: hold to latch onto the nearest anchor and swing
// round it, let go to fly off along the tangent. Good swings build a chain that multiplies the score; motes give
// points, speed and extra lives; the deadly edge creeps in and hazards appear as the run goes on.
// step() queues sounds in world.sfx as { id: 'snap' | 'chime' | 'crash', pitch } for the caller to play and clear.
import { CONFIG, LEVEL, SCREEN, anchorCooldown, border, latchRange, mult, swingLimit } from './comet-data.js';

const CX = SCREEN.w / 2, CY = SCREEN.h / 2;
export const LIFE_FLASH = 42;

// xorshift32: the same seed gives the same run
function prng(seed)
{
    let x = (seed >>> 0) || 1;
    const next = ()=>
    {
        x ^= x << 13; x >>>= 0;
        x ^= x >>> 17;
        x ^= x << 5; x >>>= 0;
        return x;
    };
    const float = ()=> (next() & 0xFFFFFF) / 0x1000000;
    return { float, range: (a, b)=> a + float() * (b - a), reseed(s) { x = (s >>> 0) || 1; } };
}

const dist = (ax, ay, bx, by)=> Math.hypot(ax - bx, ay - by);

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

function newPlayer(cfg)
{
    return {
        x: 0, y: 0, vx: 0, vy: 0, v: 0,
        latched: false, anchor: -1, r: 0, theta: 0, sign: 1, swept: 0, invulnUntil: 0,
        trail: [],      // oldest first, at most trailLen points
    };
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
    w.player = newPlayer(c);
    beginSpawn(w, true);
}

export const score = (w)=> Math.floor(w.scoreAccum) + w.eventPoints;
export const isLive = (a, now)=> now >= a.dormantUntil;
export const invulnerable = (w)=> w.t < w.player.invulnUntil;
export const motesToNextLife = (w)=> Math.max(0, w.nextLifeAt - w.motesCollected);
// how near the latch is to snapping, 0..1, for the tether's warning
export const swingWarn = (w)=> w.player.latched ? Math.min(1, Math.max(0, w.player.swept / swingLimit(w.cfg))) : 0;

function pushTrail(w)
{
    const p = w.player;
    p.trail.push(p.x, p.y);
    if (p.trail.length > w.cfg.trailLen * 2) p.trail.splice(0, 2);
}

function nearestAnchorToCentre(w)
{
    let idx = 0, best = Infinity;
    w.anchors.forEach((a, i)=> { const d = (a.x - CX) ** 2 + (a.y - CY) ** 2; if (d < best) { best = d; idx = i; } });
    return idx;
}

// wait by the middle anchor a moment, then drift in toward the centre
function beginSpawn(w, initial)
{
    const c = w.cfg, p = w.player;
    const idx = nearestAnchorToCentre(w);
    const r = Math.max(c.rMin, c.spawnRadius);
    const theta = w.rng.range(0, Math.PI * 2);
    p.v = initial ? c.vSpawn : c.vMin;
    p.vx = p.vy = 0;
    p.latched = false; p.anchor = -1; p.r = r; p.swept = 0;
    p.x = w.anchors[idx].x + r * Math.cos(theta);
    p.y = w.anchors[idx].y + r * Math.sin(theta);
    p.invulnUntil = w.t + c.invulnTime;
    p.trail.length = 0;
    w.anchors[idx].dormantUntil = w.t;
    w.launchAt = w.t + w.rng.range(c.spawnDelayMin, c.spawnDelayMax);
    w.life = 'spawning';
}

function launch(w)
{
    const p = w.player;
    const dx = CX - p.x, dy = CY - p.y, d = Math.hypot(dx, dy);
    const [ux, uy] = d > 1e-3 ? [dx / d, dy / d] : [1, 0];
    p.vx = p.v * ux; p.vy = p.v * uy;
    w.life = 'active';
}

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
    if (!invulnerable(w)) checkCrash(w);
    pushTrail(w);
}

function fly(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; }

function orbit(w, dt)
{
    const p = w.player, a = w.anchors[p.anchor];
    const omega = p.v / p.r;
    p.theta += p.sign * omega * dt;
    p.swept += Math.abs(omega * dt);
    p.x = a.x + p.r * Math.cos(p.theta);
    p.y = a.y + p.r * Math.sin(p.theta);
}

const tangent = (p)=> [p.sign * -Math.sin(p.theta), p.sign * Math.cos(p.theta)];

function tryLatch(w, now, bias)
{
    const c = w.cfg, p = w.player;
    const range = latchRange(w.t, c);
    const bl = Math.hypot(bias.x, bias.y);
    const biased = bl > 1e-3;
    let best = -1, bestScore = -Infinity;
    w.anchors.forEach((a, i)=>
    {
        if (!isLive(a, now)) return;
        const tx = a.x - p.x, ty = a.y - p.y, d = Math.hypot(tx, ty);
        if (d > range) return;
        const s = biased ? (d > 1e-3 ? (tx / d * bias.x + ty / d * bias.y) / bl : 0) : -d;
        if (s > bestScore) { bestScore = s; best = i; }
    });
    if (best < 0) return;
    const a = w.anchors[best];
    const rx = p.x - a.x, ry = p.y - a.y;
    const r = Math.min(range, Math.max(c.rMin, Math.hypot(rx, ry)));
    const theta = Math.atan2(ry, rx);
    const cross = rx * p.vy - ry * p.vx;
    p.latched = true; p.anchor = best; p.r = r; p.theta = theta; p.sign = cross < 0 ? -1 : 1; p.swept = 0;
    p.x = a.x + r * Math.cos(theta);
    p.y = a.y + r * Math.sin(theta);
}

function release(w, now)
{
    const c = w.cfg, p = w.player, a = w.anchors[p.anchor];
    const [tx, ty] = tangent(p);
    p.vx = p.v * tx; p.vy = p.v * ty;
    p.latched = false;
    a.dormantUntil = now + anchorCooldown(w.t, c);
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
    const p = w.player, a = w.anchors[p.anchor];
    const [tx, ty] = tangent(p);
    p.vx = p.v * tx; p.vy = p.v * ty;
    p.latched = false;
    a.dormantUntil = now + anchorCooldown(w.t, w.cfg);
    w.sfx.push({ id: 'snap', pitch: .5 });
    p.anchor = -1;
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

function updateMotes(w, now)
{
    const c = w.cfg, p = w.player;
    const reach = c.playerRadius + c.moteRadius;
    for (const m of w.motes)
    {
        if (m.active)
        {
            // the edge has crept up to it: move it somewhere it can still be reached
            const edge = border(now, c) + c.moteRadius + 6;
            if (m.x < edge || m.x > SCREEN.w - edge || m.y < edge || m.y > SCREEN.h - edge) Object.assign(m, findMoteSpawn(w));
            if (dist(p.x, p.y, m.x, m.y) <= reach)
            {
                const k = mult(w.chain, c);
                w.eventPoints += Math.round(c.moteScore * k);
                p.v = Math.min(c.vMax, p.v + c.moteSpeed);
                w.sfx.push({ id: 'chime', pitch: 1 + .15 * (k - 1) });
                m.active = false;
                m.respawnAt = now + c.moteRespawn;
                w.motesCollected++;
                if (w.motesCollected >= w.nextLifeAt)
                {
                    if (w.lives < c.maxLives) { w.lives++; w.earnedLives++; w.lifeFlash = LIFE_FLASH; }
                    w.lifeStep++;
                    w.nextLifeAt += w.lifeStep;
                    w.sfx.push({ id: 'chime', pitch: 1.5 }, { id: 'chime', pitch: 2 });
                }
            }
        }
        else if (now >= m.respawnAt)
        {
            Object.assign(m, findMoteSpawn(w));
            m.active = true;
        }
    }
}

// a place for a mote that can be collected: clear of the edge, on a swing's path round an anchor that's in play
export function findMoteSpawn(w)
{
    const c = w.cfg, rng = w.rng;
    const b = border(w.t, c), margin = c.moteRadius + 18;
    const x0 = b + margin, x1 = SCREEN.w - b - margin, y0 = b + margin, y1 = SCREEN.h - b - margin;
    if (x1 <= x0 || y1 <= y0) return { x: CX, y: CY };
    const reach = w.anchors.filter((a)=> a.x >= x0 && a.x <= x1 && a.y >= y0 && a.y <= y1);
    const range = latchRange(w.t, c);
    const rMin = c.rMin + 6, rMax = Math.max(rMin + 12, range * .85);
    const pad = c.playerRadius + c.moteRadius + 6;
    for (let attempt = 0; attempt < 48; attempt++)
    {
        let x, y;
        if (reach.length)
        {
            const k = Math.min(reach.length - 1, Math.floor(rng.float() * reach.length));
            const r = rng.range(rMin, rMax), ang = rng.range(0, Math.PI * 2);
            x = reach[k].x + r * Math.cos(ang); y = reach[k].y + r * Math.sin(ang);
        }
        else { x = rng.range(x0, x1); y = rng.range(y0, y1); }
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        if (dist(x, y, CX, CY) < 40) continue;
        if (w.anchors.some((a)=> dist(x, y, a.x, a.y) < c.anchorRadius + c.moteRadius + 6)) continue;
        if (w.hazards.some((h)=> x > h.x - pad && x < h.x + h.w + pad && y > h.y - pad && y < h.y + h.h + pad)) continue;
        return { x, y };
    }
    return { x: CX, y: CY };
}

// a new hazard every 30 seconds of flight, up to six, kept clear of the middle, the anchors and each other
function trySpawnHazards(w)
{
    const c = w.cfg, rng = w.rng;
    if (w.hazardsSpawned >= c.hazardMax) return;
    if (w.t < (w.hazardsSpawned + 1) * c.hazardInterval) return;
    const b = border(w.t, c);
    const x0 = b, x1 = SCREEN.w - b - c.hazardW, y0 = b, y1 = SCREEN.h - b - c.hazardH;
    if (x1 <= x0 || y1 <= y0) return;
    for (let attempt = 0; attempt < 24; attempt++)
    {
        const x = rng.range(x0, x1), y = rng.range(y0, y1);
        const mx = x + c.hazardW / 2, my = y + c.hazardH / 2;
        if (dist(mx, my, CX, CY) < 60) continue;
        if (w.anchors.some((a)=> dist(mx, my, a.x, a.y) < 60)) continue;
        if (w.hazards.some((h)=> dist(mx, my, h.x + h.w / 2, h.y + h.h / 2) < 60)) continue;
        w.hazards.push({ x, y, w: c.hazardW, h: c.hazardH });
        w.hazardsSpawned++;
        return;
    }
    // nowhere fitted: try again next step
}

function checkCrash(w)
{
    const c = w.cfg, p = w.player, pr = c.playerRadius;
    const b = border(w.t, c);
    let hit = p.x < b + pr || p.x > SCREEN.w - b - pr || p.y < b + pr || p.y > SCREEN.h - b - pr;
    if (!hit) hit = w.hazards.some((h)=> p.x - pr < h.x + h.w && p.x + pr > h.x && p.y - pr < h.y + h.h && p.y + pr > h.y);
    if (hit) crash(w);
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
