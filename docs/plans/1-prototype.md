# Stage 1: Prototype

## Now: Comet on its own

Comet was a cabinet in a walkable 3D arcade; it is now its own game. Decided: plain 2D canvas, no three.js; the page opens on Comet's title, with no attract mode and no way to step away; the same layered feature-folder layout; the first version's rules, numbers, look and sounds unchanged.

- [x] Rules (`sim.js`, `comet-data.js`) and their tests carried over unchanged.
- [x] `view.js` rewritten for the 2D canvas: same field, colours, layout, pixel font and effects, letterboxed on black and sharp at pixel ratio 2.
- [x] Title, play, pause (Resume, Sound, End the run), game over, top ten with initials; keyboard, mouse, gamepad and touch input; its sounds and loops (WAVs then; rebuilt from code since).
- [x] `just check`, `just test`, and headless Firefox screenshots of the title, a run, a pilot's run, game over and initials, at 60 fps.

## For you

- [ ] Play Comet (http://localhost:8142). Does it play like the first version, and do its sounds and loops sound right? They have only been checked as code, not heard.
- [ ] Add Comet to a phone's home screen (`just lan`, reload, then Share → Add to Home Screen): the icon should show the comet on its tether, not a letter, and it should open full screen.
- [ ] Try it on a phone (`just lan`): the stick, SWING and pause buttons haven't been used on a real device or an emulated one.
- [ ] The pause menu, settings and initials are now drawn like the field: thin outlines, flat colours, a light system font, cyan for focus (http://localhost:8142/?debug&shot=pause, then Settings; http://localhost:8142/?debug&shot=initials). Do they sit with the game, and read on a phone?

- [ ] Try the settings (http://localhost:8142/?debug&shot=settings): each tab, the bars with keys, mouse and a pad, Reset to defaults, and Back. Do Brightness, Show frame rate, Reduce flashing (crash, respawn blink, a tether about to snap) and Game speed 50% do what they say?
- [ ] Pause a run (http://localhost:8142/?debug&shot=pause): Continue, Settings, Restart and Quit to title, with their No/Yes questions.
- [ ] Listen on the sound board (`just old-sounds`, `just serve`, then http://localhost:8142/tools/sound-board.html): each sound's ▶ next to its gold 1.0.0 button at every pitch. The release, crash, swing hum and blips were softened after you found them sharp and buzzy (sine and triangle now, 3–12× less bright in numbers): do they mesh with the soundtrack now? Is the release still clear enough to time swings by, and does the crash still read as a life lost under the music? Then play a run and listen for any click where the swing and pulse loops repeat.
- [ ] Settings, Display, Graphics quality (http://localhost:8142/?debug&shot=settings): Low should look softer, High as before. With `?debug` the readout's `gfx` shows the preset; on a slow phone, does Automatic step down (`gfx:auto medium` and lower) and keep the run smooth?
- [ ] Listen to the soundtrack (http://localhost:8142): the title and run tracks are lead-free backing tracks (pad, arp, bass; a light kit in the run). Are they chill enough, or too empty? Does the music sit under the swing hum and the rising drone, or fight them? Does the run's track change on a beat when you start, and does the game-over sting cut straight in? Pause: the music should dip and keep going. Settings, Audio: Music off, then on; Music volume.
- [ ] Listen: Master and Effects volume at the defaults set the same levels as before (the softened sounds are quieter by design); Mono audio and Play in the background.
- [ ] Walk the dev rooms from the hub (http://localhost:8142/?debug&room=hub). Is anything missing that you'd want to look up there?
- [ ] Gym, latch reach (http://localhost:8142/?debug&room=gym&row=latch): hold as each comet passes its ring. Are the orange cases hard but fair, and is the red one out of reach as it should be?
- [ ] Gym, swing to count (http://localhost:8142/?debug&room=gym&row=swing): time your own swing in the bottom lane against the numbered ones. Is the shortest green swing easy to hit, the orange one tight?
- [ ] Gym, perfect release (http://localhost:8142/?debug&room=gym&row=perfect): does the cone match what feels like aiming at a mote? Any band that play says is wrong gets moved in `src/dev/gym-data.js` with a note why.
- [ ] Zoo, check views (http://localhost:8142/?debug&room=zoo&group=field, V to cycle): in gray, can you still tell the comet, anchor, mote and hazard apart? In blackout, is only the danger left?

## Recommendations

- [ ] When Comet gets levels or hand-placed arenas, add spatial notes: short labels in the arena under `?debug` saying what each placement is for (a gap to swing across, an anchor the edge swallows on purpose). Until then the one arena's notes are the museum's closing exhibit.

## Follow-ups

- [x] No home-screen icon or web manifest yet: `manifest.json` and `icons/` (drawn by `just icons`).
- [x] The title has no on-screen way to change the sound setting: the standard settings screen opens from the title (Esc, menu button, touch pause) and the pause menu.
