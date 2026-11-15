// What kills the comet: the deadly edge creeping in from every side, and a rock every 30 seconds of flight, up to six.
// A rock fades in harmless for a moment, and never lands where it can't be got round: clear of the middle anchor the
// comet respawns at, of the other anchors, of each other, and of the comet and where it is heading.
import { CONFIG, SCREEN } from './comet-data.js';

const CX = SCREEN.w / 2, CY = SCREEN.h / 2;
const dist = (ax, ay, bx, by)=> Math.hypot(ax - bx, ay - by);

/** how far point (px, py) is from the segment (ax, ay)–(bx, by) */
export function segmentDistance(px, py, ax, ay, bx, by)
{
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    return dist(px, py, ax + u * dx, ay + u * dy);
}

// how far the deadly edge has crept in from every side
export const border = (t, c = CONFIG)=> Math.max(0, Math.min(c.borderMax, c.borderRate * t));

// the anchor nearest the middle, where the comet respawns
const spawnAnchor = (w)=> w.anchors.reduce((best, a)=> dist(a.x, a.y, CX, CY) < dist(best.x, best.y, CX, CY) ? a : best);

export function trySpawnHazards(w)
{
    const c = w.cfg, rng = w.rng, p = w.player;
    if (w.hazardsSpawned >= c.hazardMax) return;
    if (w.t < (w.hazardsSpawned + 1) * c.hazardInterval) return;
    const b = border(w.t, c) + c.hazardR + 8;
    const x0 = b, x1 = SCREEN.w - b, y0 = b, y1 = SCREEN.h - b;
    if (x1 <= x0 || y1 <= y0) return;
    const home = spawnAnchor(w);
    for (let attempt = 0; attempt < 24; attempt++)
    {
        const x = rng.range(x0, x1), y = rng.range(y0, y1);
        if (dist(x, y, home.x, home.y) < c.hazardClearSpawn) continue;
        if (w.anchors.some((a)=> dist(x, y, a.x, a.y) < c.hazardClearAnchor)) continue;
        if (w.hazards.some((h)=> dist(x, y, h.x, h.y) < 4 * c.hazardR)) continue;
        if (segmentDistance(x, y, p.x, p.y, p.x + p.vx, p.y + p.vy) < c.hazardClearComet) continue;
        w.hazards.push({ x, y, r: c.hazardR, bornAt: w.t });
        w.hazardsSpawned++;
        return;
    }
    // nowhere fitted: try again next step
}

/** whether a rock has finished fading in and can hurt */
export const hazardArmed = (w, h)=> w.t >= h.bornAt + w.cfg.hazardArrive;

// whether the comet touches the edge or an armed rock (a rock's edge is drawn inside r, so a graze is forgiven)
export function hitsDanger(w)
{
    const c = w.cfg, p = w.player, pr = c.playerRadius;
    const b = border(w.t, c);
    if (p.x < b + pr || p.x > SCREEN.w - b - pr || p.y < b + pr || p.y > SCREEN.h - b - pr) return true;
    return w.hazards.some((h)=> hazardArmed(w, h) && dist(p.x, p.y, h.x, h.y) < .85 * h.r + pr);
}
