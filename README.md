# Comet

A one-button swing game in the browser. Hold to latch onto the nearest anchor and swing round it, let go to fly off. Chain good swings for a bigger multiplier, catch motes for points, speed and extra lives, and stay clear of the deadly edge as it closes in. Three lives, and a top-ten table with your initials.

## Run it

It's plain ES modules with no build step and no dependencies, served from any static server:

```bash
just serve
```

Then open http://localhost:8142. (Without `just`: `python3 -m http.server 8142`.)

## Controls

| | Keyboard and mouse | Gamepad | Touch |
|---|---|---|---|
| Start, swing (hold) | Space, J, Shift or the mouse button | A or right trigger | SWING |
| Prefer the anchor that way | WASD or arrows | Left stick or d-pad | Stick |
| Pause | Esc or P | Start | Pause button |
| Menus | Arrows, Enter or Space, Esc to go back | D-pad or stick, A, B | Tap |

## Credits

Comet is a port of its first version, Comet2D (C# and raylib), keeping its rules, numbers, look and sounds. Menu fonts: Bangers, Monoton and Chakra Petch (licences in `assets/fonts/`).

## For developers

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
