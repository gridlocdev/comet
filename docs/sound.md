# Sound

Every sound effect is made from code in [`src/audio/sfx-defs.js`](../src/audio/sfx-defs.js) when audio starts; there are no sound files. Comet's own sounds are soft single tones in the soundtrack's key, A dorian, on round waves (sine and triangle) so they sit with the music instead of buzzing over it; the game changes their pitch as it plays them. 1.0.0 played the release, crash, swing hum and run-start blips as square and saw waves; they were softened to fit the soundtrack, and the mote ping and the drone are unchanged. The menus share Babonk-style ticks. Mix levels, the buses and the settings that set them are in [`src/audio/sfx.js`](../src/audio/sfx.js) and [settings.md](settings.md).

To hear them, run `just serve` and open http://localhost:8142/tools/sound-board.html. `just old-sounds` copies 1.0.0's recordings out of git so the board can play each one next to the sound that replaced it. `just sounds` measures every sound and checks this table against the code.

## Events

Priority: **high** must be heard over anything else, **mid** helps play, **low** is comfort. A run has at most a few sounds at once, so nothing is cut for space.

| Event | What the player sees | What the sound tells them | How often | Priority | Sound |
|---|---|---|---|---|---|
| Clean release | the tether vanishes, the comet flies off faster | the swing counted | every swing | high | `release` |
| Short release | the tether vanishes, no speed-up | it didn't count | often | mid | `release` (×0.7) |
| Tether snaps | held too long: the tether goes red, blinks, breaks | you held on too long | sometimes | high | `release` (×0.5) |
| Mote collected | the mote disappears | points, and how long the chain is | every few seconds | high | `mote` (higher each chain step) |
| Perfect release | a white halo round the comet | a bonus | sometimes | mid | `mote` (×1.26 over the chain's pitch) |
| Extra life | a yellow ring grows from the comet | a life gained | rarely | mid | `mote` (×1.5 then ×2) |
| Crash | red flash on the screen's edge, the comet gone | a life lost | rarely | high | `crash` |
| Swinging | the comet circles an anchor | how fast it's going | most of a run | low | `swingLoop` (pitch follows speed) |
| Run going | the field, the edge closing in | time is passing, faster as the run goes | the whole run | low | `pulseLoop` (pitch rises over the run) |
| Run starts | title gives way to the field | the game took your press | once a run | mid | `runStart` |
| Latch | the tether appears | none needed: the line shows it at once, and the swing hum starts | every swing | — | none |
| Game over | GAME OVER | the crash already said it; the music's sting will | once a run | — | none |
| Initial letter changed | the letter steps | the press took | entering a score | low | `letterChange` |
| Menu focus moved, or back | the focus ring moves | the press took | in menus | low | `uiMove` |
| Menu pick | the card is chosen | you picked it | in menus | low | `uiPick` |
