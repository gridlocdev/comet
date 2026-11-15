// The settings screen (docs/settings.md): a tab per group (Audio, Controls, Display, Accessibility), a row per setting
// with its label on the left and its value on the right, a help line, and Reset to defaults at the end of each tab.
//
// Up and down move between rows; left and right change the focused value, one step a press, repeating while held;
// confirm flips a toggle. A range also has a bar the mouse can drag and a finger slide. Q and E, or LB and RB, switch
// tabs, as does moving along the tab row. Changes apply at once; Back saves and goes back to what opened the screen.
import { MOBILE } from '../platform/engine.js';
import { input } from '../platform/input.js';
import { formatSetting } from '../lib/settings.js';
import {
    SCHEMA, changeSetting, resetSettingsGroup, saveSettings, setting, settingTabs, stepSettingBy,
} from '../game/settings.js';
import { cards } from './cards.js';

let lastTab = 0;     // the tab the screen reopens on

const esc = (s)=> String(s).replace(/[&<>"]/g, (c)=> ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * @param {{ close: () => void, sound: (what: 'move' | 'pick' | 'effects') => void, color?: string }} o
 * close goes back to whatever opened it; sound plays a menu sound, and 'effects' a sample at the new effects level
 */
export function showSettings({ close, sound, color = '' })
{
    const tabs = settingTabs();
    let tab = Math.min(lastTab, tabs.length - 1);
    let armed = false;     // Reset to defaults was pressed once and waits for a second press

    function render(focus = [1, 0])
    {
        lastTab = tab;
        armed = false;
        const { group, rows } = tabs[tab];
        const keys = MOBILE ? ['', ''] : input.hasPad ? ['LB', 'RB'] : ['Q', 'E'];
        cards.show(`
            <div class="banner set-banner" ${color ? `style="color:${color}"` : ''}>SETTINGS</div>
            <div class="tabs" role="tablist">
                ${keys[0] ? `<span class="tab-key">${keys[0]}</span>` : ''}
                ${tabs.map((t, i)=> `<button class="tab" role="tab" aria-selected="${i === tab}" data-i="${i}">${esc(t.label)}</button>`).join('')}
                ${keys[1] ? `<span class="tab-key">${keys[1]}</span>` : ''}
            </div>
            <div class="col settings" role="tabpanel">
                ${rows.map((e)=> `
                <div class="btn row" data-id="${e.id}" ${e.type === 'range' ? `role="slider" aria-valuemin="${e.min}" aria-valuemax="${e.max}"` : `role="${e.type === 'toggle' ? 'switch' : 'button'}"`} aria-label="${esc(e.label)}">
                    <span class="r-label">${esc(e.label)}</span>
                    ${e.type === 'range' ? '<span class="r-bar"><i></i></span>' : ''}
                    <span class="r-val"></span>
                </div>`).join('')}
                ${group === 'display' && document.fullscreenEnabled ? `
                <div class="btn row" id="b-full" role="switch"><span class="r-label">Full screen</span><span class="r-val"></span></div>` : ''}
                <button class="btn" id="b-reset">Reset to defaults</button>
                <button class="btn" id="b-back">Back</button>
            </div>
            <div class="help" aria-live="polite"></div>
        `);
        const root = cards.root;
        const help = /** @type {HTMLElement} */ (root.querySelector('.help'));

        const paintRow = (id)=>
        {
            const e = SCHEMA.find((s)=> s.id === id), el = root.querySelector(`[data-id="${id}"]`), v = setting(id);
            if (!el) return;
            el.querySelector('.r-val').textContent = formatSetting(e, v);
            if (e.type === 'range')
            {
                el.setAttribute('aria-valuenow', String(v));
                el.setAttribute('aria-valuetext', formatSetting(e, v));
                /** @type {HTMLElement} */ (el.querySelector('.r-bar i')).style.width = `${(v - e.min) / (e.max - e.min) * 100}%`;
            }
            else el.setAttribute('aria-checked', String(!!v));
        };
        const paintFull = ()=>
        {
            const el = root.querySelector('#b-full');
            if (el) { el.querySelector('.r-val').textContent = document.fullscreenElement ? 'On' : 'Off'; el.setAttribute('aria-checked', String(!!document.fullscreenElement)); }
        };
        rows.forEach((e)=> paintRow(e.id));
        paintFull();
        document.onfullscreenchange = paintFull;

        const helpFor = (it)=>
        {
            if (it?.entry)
            {
                const e = it.entry, opt = e.type === 'choice' ? e.options.find((o)=> o.value === setting(e.id)) : null;
                return (opt?.help ?? e.help ?? '') + (e.reload ? ' Takes effect after a restart.' : '');
            }
            return it?.help ?? '';
        };
        const showHelp = (it)=> { help.textContent = helpFor(it); };

        // a change heard and seen at once; volumes play a sample through the new mix (music speaks for itself)
        const changed = (id, did)=>
        {
            if (!did) return;
            paintRow(id);
            if (id === 'audio.sfx' || id === 'audio.master') sound('effects');
            else if (!id.startsWith('audio.music')) sound('move');
            showHelp(items.find((i)=> i.entry?.id === id));
        };

        // the bar: a drag sets the value under the pointer; letting go saves
        for (const e of rows.filter((r)=> r.type === 'range'))
        {
            const el = /** @type {HTMLElement} */ (root.querySelector(`[data-id="${e.id}"]`)), bar = /** @type {HTMLElement} */ (el.querySelector('.r-bar'));
            let drag = null;
            const at = (ev)=>
            {
                const r = bar.getBoundingClientRect();
                const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
                changed(e.id, changeSetting(e.id, e.min + f * (e.max - e.min)));
            };
            el.addEventListener('pointerdown', (ev)=>
            {
                const r = bar.getBoundingClientRect();
                if (ev.clientX < r.left - 12 || ev.clientX > r.right + 12) return;     // the label and value leave it alone
                drag = ev.pointerId;
                el.setPointerCapture(ev.pointerId);
                at(ev);
            });
            el.addEventListener('pointermove', (ev)=> { if (ev.pointerId === drag) at(ev); });
            for (const t of ['pointerup', 'pointercancel']) el.addEventListener(t, ()=> { if (drag !== null) { drag = null; saveSettings(); } });
        }

        const resetBtn = /** @type {HTMLElement} */ (root.querySelector('#b-reset'));
        const disarm = ()=> { if (armed) { armed = false; resetBtn.textContent = 'Reset to defaults'; } };
        const items = [
            ...rows.map((e)=> ({
                entry: e,
                el: /** @type {HTMLElement} */ (root.querySelector(`[data-id="${e.id}"]`)),
                adjust: (d)=> changed(e.id, stepSettingBy(e.id, d)),
                pick: e.type === 'range' ? null : ()=> changed(e.id, stepSettingBy(e.id, 1)),
            })),
            ...(root.querySelector('#b-full') ? [{
                el: /** @type {HTMLElement} */ (root.querySelector('#b-full')),
                help: 'Fill the screen. The browser leaves full screen with Esc.',
                pick()
                {
                    sound('pick');
                    if (document.fullscreenElement) document.exitFullscreen?.().catch(()=> {});
                    else document.documentElement.requestFullscreen?.().catch(()=> {});
                },
            }] : []),
            {
                el: resetBtn,
                help: `Put every ${tabs[tab].label} setting back.`,
                pick()
                {
                    if (!armed) { armed = true; resetBtn.textContent = 'Press again to reset'; sound('move'); return; }
                    armed = false;
                    resetBtn.textContent = 'Reset to defaults';
                    resetSettingsGroup(group);
                    rows.forEach((e)=> paintRow(e.id));
                    saveSettings();
                    sound('pick');
                },
            },
            { el: /** @type {HTMLElement} */ (root.querySelector('#b-back')), pick: back },
        ];
        const tabItems = [...root.querySelectorAll('.tab')].map((el, i)=> ({ el: /** @type {HTMLElement} */ (el), tab: i, pick: ()=> switchTab(i, true) }));

        cards.menu([tabItems, ...items.map((it)=> [it])], {
            focus,
            back,
            move(it, how)
            {
                disarm();
                // moving along the tab row switches tabs; a mouse passing over one doesn't, a click does
                if (it.tab !== undefined && it.tab !== tab && how === 'nav') { switchTab(it.tab, false); return; }
                sound('move');
                showHelp(it);
            },
            tick()
            {
                const d = input.tabPrev() ? -1 : input.tabNext() ? 1 : 0;
                if (!d) return false;
                const next = Math.max(0, Math.min(tabs.length - 1, tab + d));
                if (next !== tab) switchTab(next, true);
                return true;
            },
        });
        // the row that has focus explains itself; on the tab row, the first row's help
        showHelp(focus[0] > 0 ? [tabItems, ...items.map((i)=> [i])][focus[0]]?.[0] : null);
    }

    // a new tab keeps the focus where it was: on the tab row, or on the new tab's first row
    function switchTab(i, keepRow)
    {
        if (i === tab) return;
        tab = i;
        sound('move');
        render(keepRow ? [cards.focusRow > 0 ? 1 : 0, cards.focusRow > 0 ? 0 : tab] : [0, tab]);
    }

    function back()
    {
        document.onfullscreenchange = null;
        saveSettings();
        sound('move');
        close();
    }

    render([1, 0]);
}
