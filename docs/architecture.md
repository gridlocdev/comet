# Architecture

Comet is plain ES modules drawn on a 2D canvas, with no bundler and no runtime dependencies. Each part of the game is a feature; Comet itself is the one feature so far. Its rules live in a headless simulation; what you see and hear reacts to what it announces.

## Layout

```
src/
  lib/        pure helpers: pixel-font (the bitmap font), high-scores (the top-ten table), synth (sound synthesis)
  platform/   engine.js (the canvas, letterboxing, URL flags, MOBILE, the fixed-step loop), input, storage, fonts
  game/       events (pub/sub), state (the save and its slices), loop (the feature list)
  world/      (empty so far) shared things in the play field
  render/     (empty so far) shared drawing
  ui/         cards (menus you move through with keys, a pad or a finger), initials (the three-letter entry), kinetic
              (banner lettering), settings, touch controls, pixel-text (lib/pixel-font.js on a 2D canvas), style.css
  audio/      sfx.js (Web Audio: baked UI sounds, loaded samples and loops), sfx-defs.js (the UI sounds as code)
  features/
    comet/    sim.js (rules), comet-data.js (numbers, level, score table), view.js (the picture), index.js (screens,
              sound, save)
  dev/        ?debug tools, loaded only with that flag
  main.js     boot
```

## Rules

- Imports only point down `lib → platform → game → (world, render, ui, audio) → features → main.js`. `dev/` sits on top and may read any layer through the public entry points.
- `platform/engine.js` is the only file that creates the drawing surface, reads the URL and runs the loop. Others import `surface`, `FLAGS`, `MOBILE` and `clock` from it.
- Features don't import each other. They talk through `game/events.js` or a registry.
- A feature owns its save slice and its `*-data.js`.
- `lib/` and `*-data.js` import no engine or DOM code and have tests. So does `sim.js`, which runs in node.
- A new feature goes in `src/features/<name>/` and is registered in `src/features/index.js`.

## Checking

`just check` (syntax and layer rules, through `tools/coupling-report.mjs` and `architecture.json`) and `just test`. `just dead` lists modules, exports and assets nothing uses; it only reports.

`just bench` times frames in Playwright's Firefox, pinned through `package.json` (`just install-bench` once): headless, muted, a fresh profile, at 1440x900 and pixel ratio 2 unless `--size` and `--dpr` say otherwise. Each argument is a run (`"debug&shot=bot"`); add `|js` to run code in the page before timing, `--repeat 2` to interleave runs through a busy machine, and `--shots DIR` to save a screenshot of each. It prints page and console errors as they happen. 60 fps with p95 under ~18 ms is healthy.

## The surface

`engine.js` makes one canvas. `fitSurface(w, h)` sets the logical field (Comet's view asks for 1280 × 720); the canvas is then sized to the largest rectangle of that aspect the window holds, centred on the black page. Its backing store is the CSS size times the device pixel ratio, capped at 2, and `surface.scale` is backing pixels per logical pixel. It refits on resize and when the pixel ratio changes, and bumps `surface.version` so drawing code can resize anything it keeps.

The loop runs `update(dt)` at a fixed 60 Hz and `draw(dt)` once a display frame. `clock.speed` scales the fixed steps (slow motion and fast forward under `?debug`).

## Comet

`sim.js` is a fixed-step port of the first version's rules: `step(world, dt, held, pressed, bias)`, with every number in `comet-data.js` and the same xorshift32 seed, so a run replays exactly. It queues sounds in `world.sfx` for `index.js` to play. Distances are screen pixels on a 1280 × 720 field with y down.

`view.js` draws each frame with the 2D context: shapes in field units under a transform of `surface.scale`, back to front (the deadly edge and its frame, hazards, anchor rings, tether, motes, trail, 1UP ring, comet, crash flash). Words (HUD, messages, prompt) are drawn in the bitmap font of `lib/pixel-font.js` onto their own canvases at the surface's real resolution, so every font pixel lands on whole device pixels, and only when their text changes, the HUD at most about 15 times a second. It keeps the first version's palette and layout, and nothing glows.

`index.js` runs the screens: title (`menu`) → `play` → `paused` or `over` → `initials` when the score makes the ten → title. The pause menu and initials are `ui/cards.js` cards over the field. Its sounds are WAVs in `assets/audio/`, loaded with `sfx.load()`; the swing and pulse loops run through `sfx.loop(name, volume, pitch)`, held at 0 when silent. The top ten and the last initials are the `comet` save slice; the sound setting is `core`. The save is one localStorage key, `comet-save-v1`.

On a touch screen `ui/touch.js` shows a stick, the SWING button and, during a run, a pause button.

## Debug flags

Add to the URL. `?debug` is needed for `shot` and `speed`.

| Flag | Does |
|---|---|
| `?debug` | readout, `window.game`, keys: 1 slow motion, 2 fast forward |
| `?shot=play`, `bot`, `over`, `initials` | skip to a run, a run played by a simple pilot, the game over, the initials entry |
| `?speed=4` | game speed |
| `?mute` | no sound |
