// Every sound effect: what it tells the player, and how it's made. All of them are built from code when audio starts;
// there are no sound files. Comet's own sounds are soft single tones in the soundtrack's key, A dorian: round waves
// (sine and triangle, nothing buzzy), so they sit with the music's chip pad and triangle bass instead of cutting over
// them. The game changes their pitch as it plays them. Imports only lib/, so tests build every sound in node. The
// table of events and sounds is in docs/sound.md.
// { says, family, make() → Float32Array, level?, gap?, vary?, loop? }
// loop: a held loop for sfx.loop(); it is rendered with no fade at its ends, a whole number of cycles long, so it
// repeats without a seam.
import { RATE, noise, normalize, osc, pluck, render, sine, svf, tri } from '../lib/synth.js';

// a tone at one pitch and loudness for `seconds`, faded in and out in straight lines over `fade` seconds
function tone(wave, hz, amp, seconds, fade)
{
    const n = Math.round(seconds * RATE), f = Math.round(fade * RATE);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = amp * wave(hz * (i / RATE)) * (f ? Math.min(1, i / f, (n - 1 - i) / f) : 1);
    return out;
}
// a sine with a little of its octave: warmer than a bare sine, nothing like a saw's buzz
const warm = (p)=> (sine(p) + .25 * sine(2 * p)) / 1.2;
// a soft plucked note: quick rise, gentle fall, faded to zero at its end so it doesn't click
function soft(wave, hz, amp, seconds, decay)
{
    const a = osc(hz, wave);
    return render(seconds, (t)=> amp * a(t) * pluck(t, .003, decay) * Math.min(1, (seconds - t) / .01));
}

// which sound plays for each sound the rules queue in world.sfx (world/sim.js)
export const WORLD_SFX = { snap: 'release', chime: 'mote', crash: 'crash' };

export const SFX_DEFS = {
    // the run's own sounds
    release: {
        says: 'A soft round blip on E5: the tether lets go. Full pitch for a clean release, lower for a swing too short to count, lowest when it snaps on its own.',
        family: 'comet', level: .5, vary: 0,
        make: ()=> soft(tri, 659.26, .5, .12, 18),
    },
    mote: {
        says: 'A pure high sine ping: a mote collected. Each step of the chain plays it higher, a perfect release plays it a third above that, and an extra life plays it twice, high.',
        family: 'comet', level: .45, vary: 0,
        make: ()=> tone(sine, 880, .45, .12, .01),
    },
    crash: {
        says: 'A low soft thud falling from A2, with a breath of muffled noise: the comet hit the edge or a hazard.',
        family: 'comet', level: .6, vary: 0,
        make()
        {
            const a = osc((t)=> 110 * 2 ** (-t / .15), sine), n = noise(7), f = svf();
            return normalize(render(.35, (t)=>
                (a(t) + .35 * f(n(), 500).lp) * pluck(t, .004, 9) * Math.min(1, (.35 - t) / .02)), .6);
        },
    },
    swingLoop: {
        says: 'A held soft hum on A3 while the comet swings on a tether, rising in pitch with its speed.',
        family: 'comet', level: .35, vary: 0, loop: true,
        make: ()=> tone(warm, 220, .35, .5, 0),
    },
    pulseLoop: {
        says: 'A low sine drone under the whole run, rising in pitch as the run goes on.',
        family: 'comet', level: .4, vary: 0, loop: true,
        make: ()=> tone(sine, 110, .4, .5, 0),
    },

    // menus
    runStart: {
        says: 'A short soft blip on C5: a run starts.',
        family: 'interface', level: .4, vary: 0,
        make: ()=> soft(tri, 523.25, .4, .08, 35),
    },
    letterChange: {
        says: 'A short soft blip on C5: the high-score letter changed.',
        family: 'interface', level: .4, vary: 0,
        make: ()=> soft(tri, 523.25, .4, .08, 35),
    },
    uiMove: {
        says: 'A tiny bright tick: focus moved to another card, or a menu went back.', family: 'interface', level: .3, vary: 0, gap: .03,
        make() { const a = osc(1320, tri); return normalize(render(.04, (t)=> a(t) * pluck(t, .001, 90))); },
    },
    uiPick: {
        says: 'Two quick rising soft notes, A5 then E6: you picked this.', family: 'interface', level: .55, vary: 0,
        make() { const a = osc((t)=> t < .05 ? 880 : 1318.5, tri); return normalize(render(.14, (t)=> a(t) * .6 * pluck(t, .002, 22) * Math.min(1, (.14 - t) / .01))); },
    },
};
