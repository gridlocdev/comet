// The gym's cases, generated from the tuning in world/comet-data.js, so they move when it does. Plain data: imports
// only the tuning. Each case has a band from its numbers: green is easy, orange is hard but possible, red can't be
// done. Bands follow the formula below until play says otherwise; a case moved by play says why in `note`.
import { CONFIG } from '../world/comet-data.js';

const deg = (rad)=> rad * 180 / Math.PI;

/**
 * green up to 80% of the limit, orange from 80% to the limit, red past it
 * @param {number} value
 * @param {number} limit
 */
export const band = (value, limit)=> value > limit ? 'red' : value > .8 * limit ? 'orange' : 'green';

/** @param {typeof CONFIG} c */
export function gymRows(c = CONFIG)
{
    const reach = c.latchRangeBase, minArc = deg(c.minArc), snap = c.maxSwingRotations * 360;
    const cone = c.perfectConeDeg, range = c.perfectRange;
    return [
        {
            id: 'latch', title: 'Latch reach',
            sign: `Hold as the comet flies down past each ring. It latches if the ring is within ${reach} px; the reach shrinks by ${c.latchRangeRamp} px a second of flight, to ${c.latchRangeMin} px.`,
            // how far each ring sits from the comet's straight path, as a share of the reach
            cases: [.5, .75, .9, .98, 1.05, 1.25].map((k)=>
            {
                const d = Math.round(k * reach);
                return { id: `latch-${d}`, label: `${d} px`, value: d, band: band(d, reach) };
            }),
        },
        {
            id: 'swing', title: 'Swing to count',
            sign: `A swing counts (chain +1, +${c.swingBoost} speed) once it has gone ${Math.round(minArc)}°. At ${c.maxSwingRotations} turns the tether snaps. Each comet lets go at its number; the bottom one is yours.`,
            // degrees swept before letting go; a swing only just past the minimum is a hard one to time
            cases: [20, 30, Math.round(minArc * 1.15), 90, Math.round(snap * .85), snap + 30].map((d)=>
                ({ id: `swing-${d}`, label: d >= 360 ? `${(d / 360).toFixed(2)} turns` : `${d}°`, value: d,
                    band: d < minArc || d >= snap ? 'red' : d < minArc * 1.25 || d > snap * .8 ? 'orange' : 'green' })),
        },
        {
            id: 'perfect', title: 'Perfect release',
            sign: `A counted release aimed within ${cone}° of a mote up to ${range} px ahead is a perfect: +${c.perfectBonusScore} points and +${c.perfectBonusSpeed} speed. Each comet lets go flying right.`,
            cases: [
                ...[.5, .8, .95, 1.1].map((k)=> ({ dist: Math.round(k * range), angle: 0 })),
                ...[.65, .93, 1.17].map((k)=> ({ dist: Math.round(.6 * range), angle: Math.round(k * cone) })),
            ].map(({ dist, angle })=>
            {
                const worst = [band(dist, range), band(angle, cone)].sort((a, b)=> RANK[b] - RANK[a])[0];
                return { id: `perfect-${dist}-${angle}`, label: `${dist} px ${angle}°`, value: dist, angle, band: worst };
            }),
        },
    ];
}
const RANK = { green: 0, orange: 1, red: 2 };

// the bands' colours, and a word with each so colour isn't the only signal
export const BAND_LOOK = {
    green: { colour: '#3ddc84', word: 'EASY' },
    orange: { colour: '#ffa53d', word: 'HARD' },
    red: { colour: '#ff4d4d', word: 'NO' },
};
