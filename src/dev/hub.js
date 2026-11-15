// The hub (?debug&room=hub): the one dev URL to remember. A card of buttons to every gym row, zoo group and museum
// exhibit, and back to the game; arrows or the d-pad move, Space or A opens, or tap one.
import { cards } from '../ui/cards.js';
import { gymRows } from './gym-data.js';
import { ZOO_GROUPS } from './zoo-data.js';
import { EXHIBITS } from './museum-data.js';
import { frame, grid, roomUrl } from './labels.js';

export function hubRoom()
{
    const sections = [
        { title: 'Gym', items: gymRows().map((r)=> ({ text: r.title, url: roomUrl('gym', { row: r.id }) })) },
        { title: 'Zoo', items: ZOO_GROUPS.map((z)=> ({ text: z.title, url: roomUrl('zoo', { group: z.id }) })) },
        { title: 'Museum', items: EXHIBITS.map((e)=> ({ text: e.title, url: roomUrl('museum', { exhibit: e.id }) })) },
        { title: 'Game', items: [{ text: 'Play', url: '?debug' }, { text: 'Pilot', url: '?debug&shot=bot' }] },
    ];
    cards.show(`<div class="banner" style="color:var(--cyan)">DEV ROOMS</div>${sections.map((s, i)=>
        `<div style="font:12px ui-monospace,Menlo,monospace;color:#9fb4c7">${s.title}</div><div class="row-btns">${s.items.map((it, j)=>
            `<button class="btn" data-k="${i}-${j}"></button>`).join('')}</div>`).join('')}`);
    const rows = sections.map((s, i)=> s.items.map((it, j)=>
    {
        const el = /** @type {HTMLElement} */ (cards.root.querySelector(`[data-k="${i}-${j}"]`));
        el.textContent = it.text;
        return { el, pick: ()=> { location.search = it.url; } };
    }));
    cards.menu(rows);
    Object.assign(window, { room: { name: 'hub', links: sections.flatMap((s)=> s.items.map((it)=> it.url)) } });
    return {
        id: 'hub',
        update() { cards.update(); },
        draw() { grid(frame()); },
        debug: ()=> ({ room: 'hub' }),
    };
}
