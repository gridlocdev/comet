# Stage 5: Release

## Where things stand

1.1.0 shipped on 2026-11-15 ([release](https://github.com/gridlocdev/comet/releases/tag/v1.1.0), live at [gridloc.dev/games/comet](https://gridloc.dev/games/comet/)). It holds, since 1.0.0: the code split by layer, the standard settings (from the title and the pause menu), every sound effect made from code and then softened, a lead-free soundtrack, graphics quality presets with a frame-rate watchdog, a web manifest and home-screen icons, menus and the field's words in a light system font (the pixel font is gone), reach rings round the anchors, rocks in place of the hazard bars (placed fairly), and the dev rooms (`?debug&room=hub`). Everything was checked headless, in numbers and screenshots; nothing has been heard or played by hand yet.

It went out before the checks under For you were played, at your request. Next: play them on the live build or locally; anything they turn up goes into a 1.1.1 patch.

## For you

- To play: 12 checks, under To play
- To hear: 4 checks, under To hear
- Not yet checked: 3 devices or setups

### To play

- [ ] **The game as a whole**: [http://localhost:8142](http://localhost:8142): play a few runs. It should play exactly like 1.0.0: same rules, numbers and field.
- [ ] **Reach rings**: [http://localhost:8142](http://localhost:8142): play a few runs. While you fly, each anchor in or near reach has a ring at the latch reach: muted green, then amber and rose, fading as you near its edge and gone a little past it; rings ease in and out; the bold one is what a hold takes. Can you now tell which anchor you'll get? Too busy on screen? The look on its own: [http://localhost:8142/?debug&mute&room=zoo&group=field&item=reach](http://localhost:8142/?debug&mute&room=zoo&group=field&item=reach).
- [ ] **Rocks instead of bars**: [http://localhost:8142](http://localhost:8142): play past a minute or two. Each rock fades in harmless over about a second, never lands round the middle anchor or right in front of the comet, and a respawn always drifts out on a clear line. Do they read as danger, and is a rock ever placed where you can't get round it? The look: [http://localhost:8142/?debug&mute&room=zoo&group=field&item=hazard](http://localhost:8142/?debug&mute&room=zoo&group=field&item=hazard).
- [ ] **Words in the light font**: [http://localhost:8142](http://localhost:8142): the title, HUD, crash and game over now use the menus' light system font instead of the pixel font. Easy to read at a glance mid-run?
- [ ] **Menus drawn like the field**: [http://localhost:8142/?debug&mute&shot=pause](http://localhost:8142/?debug&mute&shot=pause), then Settings; and [http://localhost:8142/?debug&mute&shot=initials](http://localhost:8142/?debug&mute&shot=initials): thin outlines, flat colours, a light system font, cyan for focus. Do they sit with the game?
- [ ] **Pause**: [http://localhost:8142/?debug&mute&shot=pause](http://localhost:8142/?debug&mute&shot=pause): Continue, Settings, Restart and Quit to title, with their No/Yes questions.
- [ ] **Settings**: [http://localhost:8142/?debug&mute&shot=settings](http://localhost:8142/?debug&mute&shot=settings): each tab, the bars with keys, mouse and a pad, Reset to defaults and Back. Brightness, Show frame rate, Reduce flashing (crash, respawn blink, a tether about to snap) and Game speed 50% should do what they say.
- [ ] **Graphics quality**: [http://localhost:8142/?debug&mute&shot=settings](http://localhost:8142/?debug&mute&shot=settings), Display tab: Low should look softer, High as before; the readout's `gfx` names the preset.
- [ ] **Dev rooms hub**: [http://localhost:8142/?debug&mute&room=hub](http://localhost:8142/?debug&mute&room=hub): walk every page. Anything missing you'd want to look up there?
- [ ] **Gym, latch reach**: [http://localhost:8142/?debug&mute&room=gym&row=latch](http://localhost:8142/?debug&mute&room=gym&row=latch): hold as each comet passes its ring. The orange cases should be hard but fair, the red one out of reach. A band that play says is wrong moves in `src/dev/gym-data.js`, with a note why.
- [ ] **Gym, swing to count and perfect release**: [http://localhost:8142/?debug&mute&room=gym&row=swing](http://localhost:8142/?debug&mute&room=gym&row=swing) (your own swing is the bottom lane) and [http://localhost:8142/?debug&mute&room=gym&row=perfect](http://localhost:8142/?debug&mute&room=gym&row=perfect): the shortest green swing easy to hit, the orange one tight; the cone matches what feels like aiming at a mote.
- [ ] **Zoo check views**: [http://localhost:8142/?debug&mute&room=zoo&group=field&view=gray](http://localhost:8142/?debug&mute&room=zoo&group=field&view=gray) (V cycles the views): in gray, the comet, anchor, mote and hazard are still told apart; in blackout only the danger is left.

### To hear

- [ ] **Sound effects against 1.0.0**: `just old-sounds`, `just serve`, then [http://localhost:8142/tools/sound-board.html](http://localhost:8142/tools/sound-board.html): each sound's ▶ next to its gold 1.0.0 button at every pitch. The release, crash, swing hum and blips were softened after they sounded sharp and buzzy (sine and triangle now, 3–12× less bright in numbers). Do they mesh with the soundtrack? Is the release still clear enough to time swings by, and does the crash still read as a life lost under the music?
- [ ] **Loops**: [http://localhost:8142](http://localhost:8142): play a run and listen for any click where the swing and pulse loops repeat.
- [ ] **Soundtrack**: [http://localhost:8142](http://localhost:8142): the title and run tracks are lead-free backing tracks (pad, arp, bass; a light kit in the run). Chill enough, or too empty? Does the music sit under the swing hum and the rising drone? The run's track should change on a beat when you start, the game-over sting cut straight in, and pause dip the music and keep it going.
- [ ] **Audio settings**: [http://localhost:8142/?debug&shot=settings](http://localhost:8142/?debug&shot=settings): Master and Effects volume at the defaults set the same levels as before (the softened sounds are quieter by design); Music off, then on; Music volume; Mono audio; Play in the background.

### Not yet checked

- [ ] Touch on a real phone (`just lan`): the stick, SWING and pause buttons haven't been used on a real or an emulated device.
- [ ] Home screen on a phone (`just lan`, reload, then Share → Add to Home Screen): the icon shows the comet on its tether, not a letter, and the game opens full screen.
- [ ] Automatic graphics quality on a slow phone: with `?debug` the readout's `gfx` should step down (`auto medium` and lower) and keep the run smooth.

## Claude's recommendations

### Choices made without the user

- Stage: Release. 1.0.0 and 1.1.0 shipped, so every stage is done; this plan tracks the checks and fixes for the next patch.
- Reach rings: drawn while flying only (not while swinging, where the next reach depends on where you let go), for every live anchor up to 1.5× the reach; muted green, amber and rose, faint except the bold one; no setting to turn them off yet.
- Menus: the system font in a light weight, uppercase banners spaced wide, 1 px lines in the field's frame colour, the anchor's cyan for focus, and banners that fade in. Written into `src/ui/style.css`.

## Answered

### Decisions

- Screen shake: dropped; the field stays still, as in the first version.
- Audio direction: orbit chip in A dorian, dry and calm (`docs/audio.md`).
- Soundtrack: backing tracks with no lead, so nothing chirps over the comet's own sounds.
- Sound effects: soft single tones on round waves that mesh with the soundtrack.
- Menus: the minimal shape-based look of the field, not the arcade look and not the pixel font.
- Hazards: lumpy rocks in place of the red bars, round to collide with (a graze forgiven), fading in harmless for 1.2 s, kept 210 px from the respawn anchor and 160 px from the comet's next second; a respawn aims clear of them.
- Field words: the pixel font dropped; everything in the same light system font.
- Reach rings: coloured rings round the anchors, green to rose, fading toward the edge of the reach, so you can tell which anchor a hold will take.
- Dev rooms: a gym, zoo and museum under `?debug`, with smoke tests; spatial notes wait for levels (`after-1.0.md`).
