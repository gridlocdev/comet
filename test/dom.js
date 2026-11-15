// A stand-in for the browser, just enough for the game's modules to load under node --test and for a test to press
// keys: elements that accept anything, a 2D context that draws nothing, and window events the test can fire.
// Import it before anything from src/.
const listeners = {};

class FakeElement
{
    constructor() { this.style = {}; this.hidden = false; this.children = []; this.textContent = ''; this.innerHTML = ''; this.className = ''; this.width = 0; this.height = 0; }
    get classList() { return { toggle() {}, add() {}, remove() {}, contains: ()=> false }; }
    get firstElementChild() { return new FakeElement(); }
    addEventListener() {}
    removeEventListener() {}
    querySelector() { return new FakeElement(); }
    querySelectorAll() { return [new FakeElement(), new FakeElement(), new FakeElement()]; }
    replaceChildren(...c) { this.children = c; }
    prepend() {}
    append() {}
    setPointerCapture() {}
    setAttribute() {}
    getAttribute() { return null; }
    scrollIntoView() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
    animate() { return { finished: Promise.resolve(), cancel() {} }; }
    getContext() { return new Proxy({}, { get: (t, k)=> k in t ? t[k] : ()=> ({ width: 0 }), set: (t, k, v)=> { t[k] = v; return true; } }); }
}

const media = ()=> ({ matches: false, addEventListener() {}, removeEventListener() {} });
Object.assign(globalThis, {
    document: {
        body: new FakeElement(), documentElement: new FakeElement(),
        createElement: ()=> new FakeElement(), getElementById: ()=> new FakeElement(),
        addEventListener() {}, fullscreenElement: null, fullscreenEnabled: false, hidden: false,
    },
    location: { search: '', href: 'http://localhost/' },
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    matchMedia: media,
    addEventListener: (type, fn)=> (listeners[type] ??= []).push(fn),
    removeEventListener() {},
    requestAnimationFrame() {},
    HTMLCanvasElement: FakeElement,
});
globalThis.window = globalThis;

// fire a window event, e.g. fire('keydown', { code: 'Space' })
export function fire(type, props = {})
{
    const e = { type, repeat: false, preventDefault() {}, ...props };
    for (const fn of listeners[type] ?? []) fn(e);
}
