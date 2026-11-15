// The museum's exhibits as running systems, with no drawing: each builds a world from the real rules, steps it, and
// checks where it ended up, so the node tests and the browser run the same exhibits.
//   build() → the exhibit's state; step(state, dt); readout(state) → lines to show; check(state) → { ok, detail }
import { prng } from '../lib/rng.js';
import { CONFIG } from '../world/comet-data.js';
import { createWorld, step } from '../world/sim.js';
import { border, trySpawnHazards } from '../world/hazards.js';
import { updateMotes } from '../world/motes.js';
import { mult } from '../world/score.js';
import { anchorCooldown, latchRange } from '../player/comet.js';

const STEP = 1 / 60;
const deg = (rad)=> Math.round(rad * 180 / Math.PI);

export const RUNNERS = {
    motion: {
        // a pilot like the run's ?shot=bot: swing a random amount, let go, grab again after a moment
        build: ()=> ({ w: createWorld(), rng: prng(7), turn: 2.5, flewAt: 0, state: '', counted: 0, last: '', acc: 0 }),
        step(s, dt)
        {
            s.acc += dt * .5;
            while (s.acc >= STEP)
            {
                s.acc -= STEP;
                const w = s.w, p = w.player;
                let held;
                if (p.latched) { s.flewAt = w.t; held = p.swept < s.turn; }
                else { if (w.t - s.flewAt < .2) s.turn = 1.6 + s.rng.float() * 2; held = w.life === 'active' && w.t - s.flewAt > .25; }
                step(w, STEP, held, w.life === 'dead');
                for (const e of w.sfx) if (e.id === 'snap') { s.last = e.pitch === 1 ? 'counted' : e.pitch === .5 ? 'snapped' : 'too short'; if (e.pitch === 1) s.counted++; }
                w.sfx.length = 0;
                if (w.gameOver) Object.assign(s, RUNNERS.motion.build(), { counted: s.counted });
            }
            const p = s.w.player;
            s.state = s.w.life === 'spawning' ? 'spawning: waiting by the middle anchor'
                : s.w.life === 'dead' ? 'crashed: waiting for a press'
                    : p.latched ? `latched: radius ${Math.round(p.r)} px, swept ${deg(p.swept)}°` : `flying at ${Math.round(p.v)} px/s`;
        },
        readout: (s)=> [s.state, `last release: ${s.last || '-'}`, `counted releases: ${s.counted}`, `chain ${s.w.chain}, ×${mult(s.w.chain)}`],
        check: (s)=> ({ ok: s.counted >= 1, detail: `${s.counted} counted releases` }),
    },
    closing: {
        build: ()=> { const w = createWorld(); w.life = 'dead'; return { w, time: 0 }; },
        step(s, dt)
        {
            s.time += dt;
            if (s.time > 16) Object.assign(s, RUNNERS.closing.build());
            const target = Math.min(300, s.time * 20);
            while (s.w.t < target) { s.w.t = Math.min(target, s.w.t + STEP); trySpawnHazards(s.w); }
        },
        readout: (s)=> [`flight time ${Math.floor(s.w.t / 60)}:${String(Math.floor(s.w.t % 60)).padStart(2, '0')}`,
            `edge ${Math.round(border(s.w.t))} px`, `reach ${Math.round(latchRange(s.w.t))} px`,
            `anchor rest ${anchorCooldown(s.w.t).toFixed(2)} s`, `hazards ${s.w.hazards.length}`],
        check: (s)=> ({ ok: border(s.w.t) === CONFIG.borderMax && latchRange(s.w.t) === CONFIG.latchRangeMin && s.w.hazards.length === CONFIG.hazardMax,
            detail: `edge ${border(s.w.t)}, reach ${latchRange(s.w.t)}, hazards ${s.w.hazards.length}` }),
    },
    chain: {
        build: ()=> ({ time: 0, chain: 0 }),
        step(s, dt) { s.time += dt; s.chain = Math.floor(s.time * 4) % 29; },
        readout: (s)=> [`chain ${s.chain}`, `multiplier ×${mult(s.chain)}`],
        check: ()=> ({ ok: mult(0) === 1 && mult(CONFIG.chainTier) === 1 + CONFIG.chainMultStep && mult(1000) === CONFIG.chainMultMax,
            detail: `×${mult(0)} at 0, ×${mult(CONFIG.chainTier)} at ${CONFIG.chainTier}, ×${mult(1000)} at most` }),
    },
    lives: {
        build: ()=> { const w = createWorld(); w.life = 'active'; w.player.invulnUntil = 0; return { w, time: 0, next: 0 }; },
        step(s, dt)
        {
            s.time += dt;
            if (s.time < s.next) return;
            s.next = s.time + .35;
            const w = s.w, p = w.player;
            w.t += .7;
            const m = w.motes.find((x)=> x.active);
            if (m) { p.x = m.x; p.y = m.y; p.trail.length = 0; }
            updateMotes(w, w.t);
            w.sfx.length = 0;
            if (w.lifeFlash > 0) w.lifeFlash = Math.max(0, w.lifeFlash - 20);
            if (w.motesCollected >= 30) Object.assign(s, RUNNERS.lives.build());
        },
        readout: (s)=> [`motes ${s.w.motesCollected}`, `lives ${s.w.lives}`, `next life at ${s.w.nextLifeAt} motes`],
        check: (s)=> ({ ok: s.w.motesCollected < 12 || s.w.lives >= CONFIG.lives + 3, detail: `${s.w.motesCollected} motes, ${s.w.lives} lives` }),
    },
};
