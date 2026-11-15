// Motes: touch one for points and speed, scaled by the chain's multiplier; every few motes is an extra life, each
// costing one more mote than the last (3, 7, 12, 18…). A taken mote comes back a few seconds later somewhere it can be
// reached, and one the deadly edge creeps up to moves.
import { latchRange } from '../player/comet.js';
import { SCREEN } from './comet-data.js';
import { border } from './hazards.js';
import { mult } from './score.js';

const CX = SCREEN.w / 2, CY = SCREEN.h / 2;
const dist = (ax, ay, bx, by)=> Math.hypot(ax - bx, ay - by);

// how long the 1UP ring lasts, in steps
export const LIFE_FLASH = 42;

export const motesToNextLife = (w)=> Math.max(0, w.nextLifeAt - w.motesCollected);

export function updateMotes(w, now)
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
        if (w.hazards.some((h)=> Math.hypot(x - h.x, y - h.y) < h.r + pad)) continue;
        return { x, y };
    }
    return { x: CX, y: CY };
}

