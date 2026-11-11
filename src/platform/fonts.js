// Loads the game's own fonts before anything draws text, so canvas text never starts in a fallback font and the
// HTML layer doesn't flash from one font to another. A slow or missing file never holds the game for long: after the
// timeout it carries on, and text falls back until the font arrives.
//   await loadFonts(FONTS) in main.js, before the loop starts
//   { family: 'Game Display', url: 'fonts/display.woff2', weight: '700' }
export async function loadFonts(fonts, timeout = 3000)
{
    if (!fonts.length || typeof FontFace === 'undefined') return [];
    const loads = fonts.map(async (f)=>
    {
        const face = new FontFace(f.family, `url(${f.url})`, { weight: f.weight ?? 'normal', style: f.style ?? 'normal', display: 'block' });
        document.fonts.add(face);
        await face.load();
        return f.family;
    });
    const settled = Promise.allSettled(loads);
    const result = await Promise.race([settled, new Promise((resolve)=> setTimeout(()=> resolve(null), timeout))]);
    if (!result) { console.warn('fonts still loading after', timeout, 'ms'); return []; }
    for (const r of result) if (r.status === 'rejected') console.warn('a font failed to load', r.reason);
    return result.filter((r)=> r.status === 'fulfilled').map((r)=> r.value);
}
