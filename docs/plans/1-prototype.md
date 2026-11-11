# Stage 1: Prototype

## Now: Comet on its own

Comet was a cabinet in a walkable 3D arcade; it is now its own game. Decided: plain 2D canvas, no three.js; the page opens on Comet's title, with no attract mode and no way to step away; the same layered feature-folder layout; the first version's rules, numbers, look and sounds unchanged.

- [x] Rules (`sim.js`, `comet-data.js`) and their tests carried over unchanged.
- [x] `view.js` rewritten for the 2D canvas: same field, colours, layout, pixel font and effects, letterboxed on black and sharp at pixel ratio 2.
- [x] Title, play, pause (Resume, Sound, End the run), game over, top ten with initials; keyboard, mouse, gamepad and touch input; its WAVs and loops.
- [x] `just check`, `just test`, and headless Firefox screenshots of the title, a run, a pilot's run, game over and initials, at 60 fps.

## For you

- [ ] Play Comet (http://localhost:8142). Does it play like the first version, and do its sounds and loops sound right? They have only been checked as code, not heard.
- [ ] Try it on a phone (`just lan`): the stick, SWING and pause buttons haven't been used on a real device or an emulated one.
- [ ] Is "End the run" on the pause menu wanted, or should it only have Resume and Sound?
- [ ] The pause menu and initials entry are neon cards over the field (http://localhost:8142/?debug&shot=initials). Keep them, or draw them on the field in the pixel font like the first version?

## Follow-ups

- [ ] No home-screen icon or web manifest yet; the arcade's were for the hall.
- [ ] The title has no on-screen way to change the sound setting; it is only on the pause menu.
