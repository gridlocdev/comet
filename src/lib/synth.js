// Tiny sound synthesis: oscillators and envelopes that write mono samples into a Float32Array.
// The UI's sound effects are built from these at startup. Pure math, no engine or DOM.

export const RATE = 44100;
const TAU = Math.PI * 2;

// waves take a phase in cycles and return -1..1
export const sine = (p)=> Math.sin(p * TAU);
export const tri = (p)=> 1 - 4 * Math.abs(p - Math.floor(p + .5));
export const square = (p, duty = .5)=> (p - Math.floor(p)) < duty ? 1 : -1;

// Renders `seconds` of sound by calling fn(t, i) for each sample. The ends fade over a few samples so nothing clicks.
export function render(seconds, fn, rate = RATE)
{
    const n = Math.max(1, Math.round(seconds * rate));
    const out = new Float32Array(n);
    const edge = Math.min(96, n / 4);
    for (let i = 0; i < n; i++)
    {
        const v = fn(i / rate, i) || 0;
        const fade = Math.min(1, i / edge, (n - 1 - i) / edge);
        out[i] = Math.max(-1, Math.min(1, v)) * fade;
    }
    return out;
}

// An oscillator whose frequency can change over time without clicks: it accumulates phase.
// freq is a number or a function of time; wave is one of the waves above.
export function osc(freq, wave = sine, rate = RATE)
{
    let phase = 0;
    const f = typeof freq === 'function' ? freq : ()=> freq;
    return (t)=>
    {
        const v = wave(phase);
        phase += f(t) / rate;
        return v;
    };
}

// envelopes, all functions of time in seconds
export const clamp01 = (x)=> x < 0 ? 0 : x > 1 ? 1 : x;
// a quick rise then an exponential fall
export const pluck = (t, attack, decay)=> clamp01(t / Math.max(attack, 1e-4)) * Math.exp(-Math.max(0, t - attack) * decay);

// scales samples so the loudest one is at `peak`
export function normalize(samples, peak = .9)
{
    let m = 0;
    for (const s of samples) m = Math.max(m, Math.abs(s));
    if (m > 0) for (let i = 0; i < samples.length; i++) samples[i] *= peak / m;
    return samples;
}
