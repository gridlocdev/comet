// Three letters for the high-score table, picked with ▲ and ▼ under each and a Done button, on a card over
// the screen. Works with keys, a pad and touch through cards.menu; call cards.update() each frame while it shows.
//   showInitials({ start: 'AAA', banner, change(), move(), done(name) })
import { nextLetter } from '../lib/high-scores.js';
import { cards } from './cards.js';
import { letterIn, spellOut } from './kinetic.js';

export function showInitials({ start = 'AAA', banner = 'HIGH SCORE!', change = ()=> {}, move = ()=> {}, done })
{
    const letters = start.split('');
    const col = (i)=> `<div class="ini-col"><button class="btn ini-up" data-i="${i}">▲</button><div class="ini-letter" id="ini-${i}">${letters[i]}</div><button class="btn ini-down" data-i="${i}">▼</button></div>`;
    cards.show(`
        <div class="banner" style="color:var(--yellow)"></div>
        <div class="ini">${[0, 1, 2].map(col).join('')}</div>
        <div class="col"><button class="btn big" id="ini-ok">Done</button></div>
    `);
    const root = cards.root;
    letterIn(spellOut(root.querySelector('.banner'), banner), { stagger: 28, dur: 300 });
    const turn = (i, dir)=> ()=>
    {
        letters[i] = nextLetter(letters[i], dir);
        root.querySelector(`#ini-${i}`).textContent = letters[i];
        change();
    };
    const finish = ()=> { cards.hide(); done(letters.join('')); };
    const ups = [...root.querySelectorAll('.ini-up')], downs = [...root.querySelectorAll('.ini-down')];
    cards.menu([
        ups.map((el, i)=> ({ el, pick: turn(i, 1) })),
        downs.map((el, i)=> ({ el, pick: turn(i, -1) })),
        [{ el: root.querySelector('#ini-ok'), pick: finish }],
    ], { focus: [2, 0], back: finish, move });
}
