// xorshift32: a small seeded random number generator, so the same seed gives the same run.
export function prng(seed)
{
    let x = (seed >>> 0) || 1;
    const next = ()=>
    {
        x ^= x << 13; x >>>= 0;
        x ^= x >>> 17;
        x ^= x << 5; x >>>= 0;
        return x;
    };
    // 0 ≤ float() < 1
    const float = ()=> (next() & 0xFFFFFF) / 0x1000000;
    return { float, range: (a, b)=> a + float() * (b - a), reseed(s) { x = (s >>> 0) || 1; } };
}
