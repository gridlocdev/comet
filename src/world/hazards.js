// What kills the comet: the deadly edge creeping in from every side, and a new hazard bar every 30 seconds of flight,
// up to six, kept clear of the middle, the anchors and each other.
import { CONFIG, SCREEN } from './comet-data.js';

const CX = SCREEN.w / 2, CY = SCREEN.h / 2;
const dist = (ax, ay, bx, by)=> Math.hypot(ax - bx, ay - by);

// how far the deadly edge has crept in from every side
export const border = (t, c = CONFIG)=> Math.max(0, Math.min(c.borderMax, c.borderRate * t));

export function trySpawnHazards(w)
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

// whether the comet touches the edge or a hazard
export function hitsDanger(w)
{
    const c = w.cfg, p = w.player, pr = c.playerRadius;
    const b = border(w.t, c);
    if (p.x < b + pr || p.x > SCREEN.w - b - pr || p.y < b + pr || p.y > SCREEN.h - b - pr) return true;
    return w.hazards.some((h)=> p.x - pr < h.x + h.w && p.x + pr > h.x && p.y - pr < h.y + h.h && p.y + pr > h.y);
}

