// The soundtrack: one entry per file in music/. Written by tools/music/render.mjs (just music); don't edit by hand.
// Content only. Times are seconds into the file. offset is where the first beat falls, so beats sit at
// offset + n * 60 / tempo, and end is where the last bar ends (a one-shot's reverb rings on after it). loop is the
// part a looping track repeats, start and end on bar lines; null plays once. frames at rate is the file's exact
// length, for checking a decoder trimmed the mp3's encoder delay. bars, when the meter changes, lists every bar line
// (seconds into the file) up to the loop's end.
export const TRACKS = {
    "title": {
        "file": "music/title.mp3",
        "title": "Comet",
        "tempo": 96,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 50.3,
        "frames": 2218230,
        "rate": 44100,
        "loop": {
            "start": 10.05,
            "end": 50.05
        }
    },
    "play": {
        "file": "music/play.mp3",
        "title": "Orbit",
        "tempo": 112,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": null,
        "seconds": 77.4429,
        "frames": 3415230,
        "rate": 44100,
        "loop": {
            "start": 8.62143,
            "end": 77.19286
        }
    },
    "over": {
        "file": "music/over.mp3",
        "title": "Lost Orbit",
        "tempo": 120,
        "beatsPerBar": 4,
        "offset": 0.05,
        "end": 8.31279,
        "seconds": 12.3128,
        "frames": 542995,
        "rate": 44100,
        "loop": null
    }
};
