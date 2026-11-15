# Audio

**Identity: orbit chip, laid back.** Cool and calm: chip voices in A dorian, dry, in a steady 4/4, played as a backing track. The title and the run have no lead, so nothing chirps over the comet's own sounds: the swing hum, the rising drone and the mote pings are the tune. Only the game-over sting has one, the motif: a quick circle round the tonic and a fling up to the octave (a swing, then a release).

- **Palette**: a PWM pad, a slow up-and-down arp on a soft triangle or a pluck, the triangle bass, the chip kit low and light. No pulse leads, no General MIDI instruments, no reverb, nothing realistic.
- **Key**: A, because the effects are already there: the run's drone is A2, the swing hum A3, the mote ping A5 (`audio/sfx-defs.js`, [sound.md](sound.md)).
- **Touchstones**: the NES's lean two-pulse action loops; a tracker's one-voice chord shimmer; old vector arcade games, where the screen is black and every sound is a line.

## What's on screen

Black space, thin cyan anchor rings, yellow motes, one white comet with a fading trail, and a red edge that creeps in as a run goes on. Nothing in it makes a sound by itself, and there's no room or weather: the music is dry and up front.

- **Title** (`?debug&shot=title`): COMET in white, the hint, a blinking PRESS SPACE. Still and cool, waiting.
- **A run** (`?debug&shot=bot`): the comet circling and flying between rings. Focused; the pressure as the edge closes in comes from the drone and the effects, not the music.
- **Game over** (`?debug&shot=over`): GAME OVER in red, the score. A short drop, not a funeral.
- **Effects**: hard, dry chip tones; the swing hum and the drone rise in pitch with speed and time, so the music keeps out of their way.
- **Ambience**: none. The run's drone is the bed; the music is over it.

## The tracks

One home key (A), and one motif (`1:0.5 3:0.5 5:0.5 3:0.5 1:0.5 5:0.5 8:1`), heard only in the sting. Specs in `tools/music/songs.js`; `just music` renders them into `music/`.

| Track | Plays on | Keeps | Changes |
|---|---|---|---|
| `title` | the title and its settings | A dorian, no lead | 96 bpm, no drums: a pad, a slow pluck arp and the triangle bass |
| `play` | a run, and under the pause menu (quieter) | A dorian, no lead | 112 bpm: a pad, a soft triangle arp, the triangle bass and a light chip kit |
| `over` | game over and initials (once) | the motif's circle | A minor, 120 bpm, on a soft triangle over the pad; the fling falls instead of rising, and slows to the end |

## What the music follows

| State | Player feels | Music | Into the next |
|---|---|---|---|
| Title | ready | `title` | a run starts: `play` on the next bar |
| Run | focus, then pressure | `play`; dips to 40% under the pause menu and its settings | the last life lost: `over` at once |
| Game over | loss | `over` once, then quiet | back to the title: `title` |

The run's mode picks the track (`musicFor` in `features/run/index.js`); `audio/music.js` changes on the next bar line, except game over, which cuts the run's music off and starts at once (`musicCutIn`). Music on/off and its volume are in Settings, Audio ([settings.md](settings.md)); Master volume at 0 mutes everything.

The mix: every track is rendered to the same loudness, and the music bus (`LEVEL` in `audio/music.js`) sits under Comet's effects bus (`EFFECTS_LEVEL` in `audio/sfx.js`), so at the default volumes the effects play several dB over the music.

Intensity (the run getting faster as the edge closes in) is carried by the drone's rising pitch, not the music: a rendered track can't speed up. A layer that swells in late in a run would be its own task.
