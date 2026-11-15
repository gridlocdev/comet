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

// each letter fades in a moment after the one before, rising a little: quiet, like the field
export function letterIn(letters, { delay = 0, stagger = 55, dur = 520 } = {})
{
    letters.forEach((s, i)=>
    {
        if (reduced) return;
        s.animate([
            { transform: 'translateY(.15em)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
        ], { duration: dur, delay: delay + i * stagger, fill: 'both', easing: 'ease-out' });
    });
}
