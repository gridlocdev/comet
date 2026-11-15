## Architecture

This game follows the layered, feature-folder layout in `docs/architecture.md`. Before adding or moving code, read its core sections (the intro, Layout, Rules and Checking), then only the section for the system you're changing. In short:

- `lib → platform → game → (world, render, ui, audio) → features → main.js`; imports only point down that chain.
- A new feature goes in `src/features/<name>/` and is registered in `src/features/index.js`. Don't add top-level `src/*.js` files, and don't edit `main.js` for features.
- Features don't import each other; use `game/events.js` or a registry.
- Each feature owns its save slice and its `*-data.js` content.
- `src/platform/engine.js` is the only place that sets up the drawing surface (the 2D canvas), reads the URL flags and runs the loop; other files import from there.
- `lib/` and `*-data.js` files import no DOM code and have tests in `test/`.
- The current stage is Prototype: `docs/plans/1-prototype.md` (change this line when the stage changes). Pending work (what's for the user, Claude's recommendations, follow-ups) goes there, later stages' work into their own plans, and ideas held back from 1.0 into their own plan file in `docs/plans/`, not into other docs.
- After changes run `just check` (syntax, layer rules via `tools/coupling-report.mjs`, and types via `jsconfig.json`) and `just test`.
