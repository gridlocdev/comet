// The soundtrack as song specs for music-generator's composer (its docs/COMPOSING.md, "The song spec").
// tools/music/render.mjs composes and renders each one to music/<id>.mp3; `just music` runs it. docs/audio.md has the
// direction: orbit chip, A dorian on the bare chip voices, dry and calm. The looping tracks are backing tracks with no
// lead: a pad, a soft arp and the bass, so nothing chirps over the comet's own sounds. Only the game-over sting has a
// tune, the swing-and-fling motif. `fullness` brings the arp in (it plays from 0.6) while the energy stays low.
//
// id: the track's name; the area's track or a cue's name.
// loop: the sections a looping track repeats, as [first, end) indexes into its form; null plays once. The section at
// `end` must be the same type as the one at `first`, so what comes after the loop's end is what the loop jumps back to.
// band: chip programs per role (music-generator's audio/chip-instruments-data.js), null for silent:
//   leads 80 pulse 25%, 82 thin pulse 12.5%, 83 hollow square, 84 PWM, 85 soft triangle, 86/87 NES pulse 25%/50%;
//   46 pluck; 90 PWM pad; bass 38 NES triangle, 39 pulse, 33 DPCM; kits 0 chip, 1 NES, 2 DPCM.

// The motif: a quick circle round the tonic, then a fling up to the octave: a swing, and a release.
const ORBIT = '1:0.5 3:0.5 5:0.5 3:0.5 1:0.5 5:0.5 8:1';

// A dorian (minor, with the raised 6th's bright IV), the key of the effects: the run's drone is A2, the swing hum A3,
// the mote A5. One tempo through every loop (push 0), as the music's bar grid needs.
const HOME = { sound: 'chip', key: 'A', mode: 'dorian', motif: ORBIT, push: 0 };

export const TRACKS = [
    {
        // The title: COMET in white on black, the hint and a blinking PRESS SPACE, nothing moving. Still and cool:
        // a PWM pad breathing over the triangle bass, a soft pluck turning slowly underneath, no drums, no tune.
        id: 'title', loop: [1, 3],
        spec: {
            title: 'Comet', ...HOME, emotion: 'serene', tempo: 96, groove: 'rock', comp: 'sustain', arp: 'updown',
            legato: 0.95, dynamics: 0.4,
            form: ['intro', 'A', 'B', 'A'],
            band: { lead: null, counter: null, arp: 46, chords: null, pad: 90, bass: 38, drums: null },
            sections: {
                intro: { bars: 4, progression: 'i IV i IV', energy: 0.25 },
                A: { bars: 8, progression: 'i IV i VII i IV v i', energy: 0.35, fullness: 0.65 },
                B: { bars: 8, progression: 'III VII IV i III VII v v', energy: 0.32, fullness: 0.65, endOn: 'dominant' },
            },
        },
    },
    {
        // A run: black space, thin cyan rings, yellow motes, one white comet and its fading trail, the red edge creeping
        // in. Focused and calm, a backing track: a soft triangle arp circling like the swing, a PWM pad, the triangle
        // bass on a steady pulse, the chip kit low and light. No lead: the swing hum, the drone that rises as the run
        // goes and the mote pings are the tune, and the music stays under them.
        id: 'play', loop: [1, 5],
        spec: {
            title: 'Orbit', ...HOME, emotion: 'mysterious', tempo: 112, groove: 'rock', comp: 'eighths', arp: 'updown',
            legato: 0.85, dynamics: 0.45,
            form: ['intro', 'verse', 'chorus', 'bridge', 'chorus', 'verse'],
            band: { lead: null, counter: null, arp: 85, chords: null, pad: 90, bass: 38, drums: 0 },
            sections: {
                intro: { bars: 4, progression: 'i i IV IV', energy: 0.3, fullness: 0.38 },
                verse: { bars: 8, progression: 'i IV i VII i IV v i', energy: 0.4, fullness: 0.62 },
                chorus: { bars: 8, progression: 'i IV i VII i IV v i', energy: 0.5, fullness: 0.7 },
                bridge: { bars: 8, progression: 'VI VII i i VI VII v v', energy: 0.4, fullness: 0.62, endOn: 'dominant' },
            },
        },
    },
    {
        // Game over: GAME OVER in red on black, the score under it. It cuts straight in over the run: the motif's
        // circle, then the fling falls instead of rising, and lands low. A short, soft sting on the triangle.
        id: 'over', loop: null,
        spec: {
            title: 'Lost Orbit', sound: 'chip', key: 'A', mode: 'minor', emotion: 'melancholy', tempo: 120, groove: 'rock',
            comp: 'eighths', arp: 'tracker', legato: 0.75, dynamics: 0.7, ritardando: true,
            band: { lead: 85, counter: null, arp: null, chords: null, pad: 90, bass: 38, drums: null },
            form: ['A', 'outro'],
            sections: {
                A: { bars: 2, progression: 'i iv', melody: ORBIT + ' | 6:0.5 4:0.5 3:0.5 2:0.5 1:2', energy: 0.65 },
                outro: { bars: 2, progression: 'v i', melody: '5:0.5 4:0.5 2:1 7,:2 | 1:4', energy: 0.5 },
            },
        },
    },
];
