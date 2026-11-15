// The first version's palette: flat colours on black, nothing glowing. The field, the HUD and the screens' words share it.
export const C = {
    lethal: '#3a0e0e', frame: '#1e2a38', hazard: '#ff3355',
    anchor: '#33ccff', dormant: '#1a4456', tether: '#88e0ff',
    mote: '#ffe066', trail: '#b8e8ff', comet: '#ffffff',
    white: '#ffffff', dim: '#9fb4c7', muted: '#6f8090', gold: '#ffe066',
    accent: '#33ccff', red: '#ff6677', crash: '#ff3355',
    // the reach rings, muted so they sit behind the anchors: well in reach, near the edge of it, out of it
    rockCore: '#1a0a10',     // the inside of a rock, a shade off the black
    reachNear: '#5f9e84', reachEdge: '#b8946a', reachOut: '#b56a6e',
};

// The dev rooms' check views (?debug&view=gray|silhouette|blackout), as palettes over the same draw calls. The shipped
// game never draws them. backdrop: what the field is drawn on.
//   gray: the game's own colours by their luminance, so values can be compared.
//   silhouette: every thing a flat ink on a light backdrop, the arena's edge and frame a step darker than the backdrop.
//   blackout: every thing black except the danger: the deadly edge, the rocks, the tether's red and the crash.
const lum = (hex)=> { const [r, g, b] = [1, 3, 5].map((i)=> parseInt(hex.slice(i, i + 2), 16)); return Math.round(.2126 * r + .7152 * g + .0722 * b); };
const grey = (v)=> `#${v.toString(16).padStart(2, '0').repeat(3)}`;
const mapAll = (fn)=> Object.fromEntries(Object.entries(C).map(([k, v])=> [k, fn(k, v)]));
const INK = '#16161c', SET = '#a9a9b2', PAPER = '#d4d4da', DARK = '#0c0c10';
const DANGER = ['lethal', 'hazard', 'crash', 'rockCore'];
export const VIEWS = {
    gray: { ...mapAll((k, v)=> grey(lum(v))), backdrop: '#000000' },
    silhouette: { ...mapAll(()=> INK), lethal: SET, frame: SET, dormant: SET, backdrop: PAPER },
    blackout: { ...mapAll((k, v)=> DANGER.includes(k) ? v : DARK), tether: '#000000', backdrop: '#000000' },
};
