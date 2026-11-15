// Every sound effect: what it tells the player, and how it's made. All of them are built from code when audio starts;
// there are no sound files. Comet's own sounds are single chip-style tones at a fixed pitch, as 1.0.0's recordings
// were, sample for sample; the game changes their pitch as it plays them. Imports only lib/, so tests build every
// sound in node. The table of events and sounds is in docs/sound.md.
// { says, family, make() → Float32Array, level?, gap?, vary?, loop? }
// loop: a held loop for sfx.loop(); it is rendered with no fade at its ends, a whole number of cycles long, so it
// repeats without a seam.
import { RATE, normalize, osc, pluck, render, sine, square, tri } from '../lib/synth.js';

// a tone at one pitch and loudness for `seconds`, faded in and out in straight lines over `fade` seconds
function tone(wave, hz, amp, seconds, fade)
{
    const n = Math.round(seconds * RATE), f = Math.round(fade * RATE);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = amp * wave(hz * (i / RATE)) * (f ? Math.min(1, i / f, (n - 1 - i) / f) : 1);
    return out;
}
// 1.0.0's waves, so each sound comes out as its recording did: a saw rising from -1 (lib's saw starts at 0), and a
// square taken from a sine's sign
const rise = (p)=> 2 * (p - Math.floor(p)) - 1;
const block = (p)=> sine(p) >= 0 ? 1 : -1;

export const SFX_DEFS = {
    // the run's own sounds
    release: {
        says: 'A short bright square blip: the tether lets go. Full pitch for a clean release, lower for a swing too short to count, lowest when it snaps on its own.',
        family: 'comet', level: .5, vary: 0,
        make: ()=> tone(block, 660, .5, .08, .005),
    },
    mote: {
        says: 'A pure high sine ping: a mote collected. Each step of the chain plays it higher, a perfect release plays it a third above that, and an extra life plays it twice, high.',
        family: 'comet', level: .45, vary: 0,
        make: ()=> tone(sine, 880, .45, .12, .01),
    },
    crash: {
        says: 'A low buzzing saw, a third of a second: the comet hit the edge or a hazard.',
        family: 'comet', level: .6, vary: 0,
        make: ()=> tone(rise, 90, .6, .3, .02),
    },
    swingLoop: {
        says: 'A held saw hum while the comet swings on a tether, rising in pitch with its speed.',
        family: 'comet', level: .35, vary: 0, loop: true,
        make: ()=> tone(rise, 220, .35, .5, 0),
    },
    pulseLoop: {
        says: 'A low sine drone under the whole run, rising in pitch as the run goes on.',
        family: 'comet', level: .4, vary: 0, loop: true,
        make: ()=> tone(sine, 110, .4, .5, 0),
    },

    // menus
    runStart: {
        says: 'A short square blip: a run starts.',
        family: 'interface', level: .4, vary: 0,
        make: ()=> tone(block, 520, .4, .06, .005),
    },
    letterChange: {
        says: 'A short square blip: the high-score letter changed.',
        family: 'interface', level: .4, vary: 0,
        make: ()=> tone(block, 520, .4, .06, .005),
    },
    uiMove: {
        says: 'A tiny bright tick: focus moved to another card, or a menu went back.', family: 'interface', level: .3, vary: 0, gap: .03,
        make() { const a = osc(1320, tri); return normalize(render(.04, (t)=> a(t) * pluck(t, .001, 90))); },
    },
    uiPick: {
        says: 'Two quick rising square notes: you picked this.', family: 'interface', level: .55, vary: 0,
        make() { const a = osc((t)=> t < .05 ? 880 : 1320, square); return normalize(render(.14, (t)=> a(t) * .6 * pluck(t, .002, 22))); },
    },
};
