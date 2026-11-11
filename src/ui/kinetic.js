// Kinetic type for card banners: a word is a row of letters that each move on their own.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// letters of a banner, built ready for CSS; animate them in with letterIn
export function spellOut(el, text)
{
    el.replaceChildren(...[...text].map((ch)=>
    {
        const s = document.createElement('span');
        s.textContent = ch === ' ' ? ' ' : ch;
        return s;
    }));
    return [...el.children];
}

// each letter is driven in like a screw: it spins, overshoots and bites
export function letterIn(letters, { delay = 0, stagger = 55, dur = 520 } = {})
{
    letters.forEach((s, i)=>
    {
        if (reduced) return;
        s.animate([
            { transform: `translateY(-1.2em) rotateY(${540 + i * 40}deg) scale(1.8)`, opacity: 0, offset: 0 },
            { transform: 'translateY(.1em) rotateY(0deg) scale(.86,1.12)', opacity: 1, offset: .62 },
            { transform: 'translateY(-.04em) scale(1.06,.95)', offset: .8 },
            { transform: 'translateY(0) scale(1)', opacity: 1, offset: 1 },
        ], { duration: dur, delay: delay + i * stagger, fill: 'both', easing: 'ease-out' });
    });
}
