// The UI's sound effects: what each tells the player, and how it's made. Comet's own sounds are recorded WAVs in
// assets/audio/. Imports only lib/, so tests build every sound in node.
// { says, make() → Float32Array, level?, gap?, vary? }
import { normalize, osc, pluck, render, square, tri } from '../lib/synth.js';

export const SFX_DEFS = {
    uiMove: { says: 'Focus moved to another card.', level: .3, vary: 0, gap: .03, make() { const a = osc(1320, tri); return normalize(render(.04, (t)=> a(t) * pluck(t, .001, 90))); } },
    uiPick: {
        says: 'You picked this.', level: .55, vary: 0,
        make() { const a = osc((t)=> t < .05 ? 880 : 1320, square); return normalize(render(.14, (t)=> a(t) * .6 * pluck(t, .002, 22))); },
    },
};
