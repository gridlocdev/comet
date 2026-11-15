// The comet's motion, one fixed step at a time: wait by the middle anchor and drift in, fly straight, latch onto an
// anchor and swing round it at a fixed radius, let go along the tangent. Scoring and crashing are the run's
// (world/sim.js); these only move the comet and rest the anchor it leaves.
import { CONFIG, SCREEN } from '../world/comet-data.js';

const CX = SCREEN.w / 2, CY = SCREEN.h / 2;

export function newComet()
{
    return {
        x: 0, y: 0, vx: 0, vy: 0, v: 0,
        latched: false, anchor: -1, r: 0, theta: 0, sign: 1, swept: 0, invulnUntil: 0,
        trail: [],      // oldest first, at most trailLen points
    };
}

export const isLive = (a, now)=> now >= a.dormantUntil;

// how far away an anchor can be grabbed: shrinks as the run goes on
export const latchRange = (t, c = CONFIG)=> Math.max(c.latchRangeMin, c.latchRangeBase - c.latchRangeRamp * t);
// how long an anchor rests after you let go of it: grows as the run goes on
export const anchorCooldown = (t, c = CONFIG)=> Math.min(c.anchorCooldownMax, c.anchorCooldownBase + c.anchorCooldownRamp * t);
// a full swing loop is 2π; past this many radians on one anchor the tether snaps
export const swingLimit = (c = CONFIG)=> c.maxSwingRotations * Math.PI * 2;

export function pushTrail(w)
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
export function beginSpawn(w, initial)
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

export function launch(w)
{
    const p = w.player;
    const dx = CX - p.x, dy = CY - p.y, d = Math.hypot(dx, dy);
    const [ux, uy] = d > 1e-3 ? [dx / d, dy / d] : [1, 0];
    p.vx = p.v * ux; p.vy = p.v * uy;
    w.life = 'active';
}

export function fly(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; }

export function orbit(w, dt)
{
    const p = w.player, a = w.anchors[p.anchor];
    const omega = p.v / p.r;
    p.theta += p.sign * omega * dt;
    p.swept += Math.abs(omega * dt);
    p.x = a.x + p.r * Math.cos(p.theta);
    p.y = a.y + p.r * Math.sin(p.theta);
}

// grab the nearest live anchor in reach, or with a bias { x, y } (y down), the one most that way
/** The anchor a hold would latch to now (-1 for none): the live one in reach most in the bias's direction, else the nearest. */
export function latchTarget(w, now, bias)
{
    const p = w.player, range = latchRange(w.t, w.cfg);
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
    return best;
}

export function tryLatch(w, now, bias)
{
    const c = w.cfg, p = w.player, range = latchRange(w.t, c);
    const best = latchTarget(w, now, bias);
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

// off along the tangent at the current speed; the anchor rests a while
export function letGo(w, now)
{
    const p = w.player, a = w.anchors[p.anchor];
    const tx = p.sign * -Math.sin(p.theta), ty = p.sign * Math.cos(p.theta);
    p.vx = p.v * tx; p.vy = p.v * ty;
    p.latched = false;
    a.dormantUntil = now + anchorCooldown(w.t, w.cfg);
}

// how near the latch is to snapping, 0..1, for the tether's warning
export const swingWarn = (w)=> w.player.latched ? Math.min(1, Math.max(0, w.player.swept / swingLimit(w.cfg))) : 0;
