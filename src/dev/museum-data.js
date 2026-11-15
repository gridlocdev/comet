// The museum's signs: what each exhibit shows, its rules, the mistake to avoid, and where it lives in the code. Plain
// data, with the numbers from the tuning. museum-exhibits.js runs each one.
import { CONFIG as c, LEVEL, SCREEN } from '../world/comet-data.js';

const minutes = (s)=> `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
// anchors the deadly edge reaches before it stops, and when
const swallowed = LEVEL.anchors
    .map(([x, y])=> ({ x, y, d: Math.min(x, y, SCREEN.w - x, SCREEN.h - y) - c.playerRadius }))
    .filter((a)=> a.d < c.borderMax);

export const EXHIBITS = [
    {
        id: 'motion', title: 'Latch, swing, let go',
        text: `The comet's one move, run by a simple pilot at half speed. The state on screen is the one the rules are in.
Hold: grab the nearest resting-free anchor in reach (the stick picks the one most that way). The swing's radius is where you grabbed, at least ${c.rMin} px. Let go: fly off along the tangent at the same speed.`,
        wrong: `Don't add speed on the latch: the speed only changes on a counted release (+${c.swingBoost}), a mote (+${c.moteSpeed}) or a perfect (+${c.perfectBonusSpeed}), up to ${c.vMax}.`,
        files: ['src/player/comet.js', 'src/world/sim.js'],
    },
    {
        id: 'closing', title: 'The arena closes in',
        text: `Five minutes of a run in fifteen seconds, the comet left out. The red edge creeps in ${c.borderRate} px a second to ${c.borderMax} px; a rock fades in every ${c.hazardInterval} s, up to ${c.hazardMax}, clear of the respawn anchor, the anchors and the comet; each anchor's reach (the rings) shrinks from ${c.latchRangeBase} to ${c.latchRangeMin} px, and its rest after use grows from ${c.anchorCooldownBase} to ${c.anchorCooldownMax} s.`,
        wrong: swallowed.length
            ? `An anchor nearer the side than ${c.borderMax} px is swallowed late in a run: here ${swallowed.length} of ${LEVEL.anchors.length}, from ${[...new Set(swallowed.map((a)=> minutes(a.d / c.borderRate)))].sort().join(' and ')} of flight (red). Place one there only to shrink the arena on purpose.`
            : `Every anchor stays clear of the edge's ${c.borderMax} px.`,
        files: ['src/world/hazards.js', 'src/player/comet.js', '  latchRange, anchorCooldown'],
    },
    {
        id: 'chain', title: 'Chain and multiplier',
        text: `Each counted release adds one to the chain; a crash resets it. The multiplier rises by ${c.chainMultStep} every ${c.chainTier} in the chain, up to ×${c.chainMultMax}, and multiplies every point: distance flown, swings (${c.swingScore}), motes (${c.moteScore}) and perfects (${c.perfectBonusScore}).`,
        wrong: 'A short swing or a snap neither adds to the chain nor breaks it: only a crash breaks it.',
        files: ['src/world/score.js', 'src/world/sim.js'],
    },
    {
        id: 'lives', title: 'Motes and extra lives',
        text: `The comet is moved onto each mote in turn. A mote gives points and speed, and comes back ${c.moteRespawn} s later somewhere a swing can reach. Extra lives come at 3 motes, then 4 more, 5 more and so on, up to ${c.maxLives} lives.`,
        wrong: 'A mote the edge creeps up to moves at once to a reachable place; never leave one where it can only be reached by crashing.',
        files: ['src/world/motes.js'],
    },
];
