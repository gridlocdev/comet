// The zoo's entries: every thing Comet draws, every sound and every colour, with what it is called, where it is made
// and its numbers from the tuning. Sounds and colours are listed straight from their tables, so a new one shows up
// here without touching this file; a new shape on the field needs an entry below and a setup in zoo.js.
import { CONFIG as c } from '../world/comet-data.js';
import { C } from '../render/palette.js';
import { SFX_DEFS } from '../audio/sfx-defs.js';

const FIELD = 'src/render/field.js';
export const ZOO_GROUPS = [
    { id: 'field', title: 'Field' },
    { id: 'sounds', title: 'Sounds' },
    { id: 'colours', title: 'Colours' },
];

/** @type {{ group: string, key: string, name: string, file: string, facts: string[] }[]} */
export const ZOO = [
    { group: 'field', key: 'comet', name: 'Comet', file: `${FIELD}, src/player/comet.js`, facts: [`radius ${c.playerRadius} px, trail ${c.trailLen} points`, `speed ${c.vMin}–${c.vMax} px/s, ${c.vSpawn} at the start`] },
    { group: 'field', key: 'anchor', name: 'Anchor', file: FIELD, facts: [`ring radius ${c.anchorRadius} px`, `latch reach ${c.latchRangeBase} px, shrinking to ${c.latchRangeMin}`] },
    { group: 'field', key: 'anchorResting', name: 'Anchor, resting', file: FIELD, facts: [`rests ${c.anchorCooldownBase} s after you let go,`, `growing to ${c.anchorCooldownMax} s over a run`] },
    { group: 'field', key: 'tether', name: 'Tether', file: FIELD, facts: ['from the comet to its anchor while you hold', `swing radius at least ${c.rMin} px`] },
    { group: 'field', key: 'tetherStrain', name: 'Tether, straining', file: FIELD, facts: [`reddens past half of ${c.maxSwingRotations} turns`] },
    { group: 'field', key: 'tetherSnap', name: 'Tether, about to snap', file: FIELD, facts: [`blinks past 85% of ${c.maxSwingRotations} turns`, 'steady with Reduce flashing'] },
    { group: 'field', key: 'mote', name: 'Mote', file: `${FIELD}, src/world/motes.js`, facts: [`radius ${c.moteRadius} px, ${c.moteCount} at once`, `+${c.moteScore} points, +${c.moteSpeed} speed, back in ${c.moteRespawn} s`] },
    { group: 'field', key: 'hazard', name: 'Hazard bar', file: `${FIELD}, src/world/hazards.js`, facts: [`${c.hazardW} × ${c.hazardH} px`, `one every ${c.hazardInterval} s of flight, up to ${c.hazardMax}`] },
    { group: 'field', key: 'edge', name: 'Deadly edge', file: `${FIELD}, src/world/hazards.js`, facts: [`creeps in ${c.borderRate} px a second of flight,`, `up to ${c.borderMax} px from every side`] },
    { group: 'field', key: 'oneUp', name: '1UP ring', file: FIELD, facts: ['an extra life: 3 motes, then 4 more, 5 more…', `up to ${c.maxLives} lives`] },
    { group: 'field', key: 'perfect', name: 'Perfect halo', file: FIELD, facts: [`a release aimed within ${c.perfectConeDeg}° of a mote`, `+${c.perfectBonusScore} points, +${c.perfectBonusSpeed} speed`] },
    { group: 'field', key: 'safe', name: 'Comet, safe', file: FIELD, facts: [`blinks for ${c.invulnTime} s after a respawn`, 'half bright with Reduce flashing'] },
    { group: 'field', key: 'crash', name: 'Crash flash', file: FIELD, facts: ['the screen edge flashes red for 8 steps', 'half as bright with Reduce flashing'] },
    ...Object.entries(SFX_DEFS).map(([key, d])=> ({ group: 'sounds', key, name: key, file: 'src/audio/sfx-defs.js', facts: [d.says ?? '', `level ${d.level ?? 1}${d.loop ? ', loops' : ''}`] })),
    ...Object.entries(C).map(([key, hex])=> ({ group: 'colours', key, name: key, file: 'src/render/palette.js', facts: [hex] })),
];
