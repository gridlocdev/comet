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
- [ ] The pause menu and initials entry are neon cards over the field (http://localhost:8142/?debug&shot=initials). Keep them, or draw them on the field in the pixel font like the first version?

- [ ] Try the settings (http://localhost:8142/?debug&shot=settings): each tab, the bars with keys, mouse and a pad, Reset to defaults, and Back. Do Brightness, Show frame rate, Reduce flashing (crash, respawn blink, a tether about to snap) and Game speed 50% do what they say?
- [ ] Pause a run (http://localhost:8142/?debug&shot=pause): Continue, Settings, Restart and Quit to title, with their No/Yes questions.
- [ ] Listen on the sound board (`just old-sounds`, `just serve`, then http://localhost:8142/tools/sound-board.html): each sound's ▶ next to its gold 1.0.0 button at every pitch. They match sample for sample in numbers; do they sound the same? Then play a run and listen for any click where the swing and pulse loops repeat.
- [ ] Settings, Display, Graphics quality (http://localhost:8142/?debug&shot=settings): Low should look softer, High as before. With `?debug` the readout's `gfx` shows the preset; on a slow phone, does Automatic step down (`gfx:auto medium` and lower) and keep the run smooth?
- [ ] Listen to the soundtrack (http://localhost:8142): the title and run tracks are lead-free backing tracks (pad, arp, bass; a light kit in the run). Are they chill enough, or too empty? Does the music sit under the swing hum and the rising drone, or fight them? Does the run's track change on a beat when you start, and does the game-over sting cut straight in? Pause: the music should dip and keep going. Settings, Audio: Music off, then on; Music volume.
- [ ] Listen: Master and Effects volume at the defaults should sound exactly as loud as before; Mono audio and Play in the background.

## Follow-ups

- [x] No home-screen icon or web manifest yet: `manifest.json` and `icons/` (drawn by `just icons`).
- [x] The title has no on-screen way to change the sound setting: the standard settings screen opens from the title (Esc, menu button, touch pause) and the pause menu.
