// Comet's numbers and its one arena, as plain data. Distances are in screen pixels on a
// 1280 × 720 field with y down; times in seconds; T is the run's clock, which only runs while the comet flies.
export const SCREEN = { w: 1280, h: 720 };

export const CONFIG = {
    playerRadius: 5, trailLen: 14,
    vSpawn: 220, vMin: 180, vMax: 900,
    swingBoost: 26, minArc: .60, rMin: 24,
    latchRangeBase: 140, latchRangeMin: 90, latchRangeRamp: .20,
    anchorCooldownBase: .70, anchorCooldownRamp: .004, anchorCooldownMax: 2.0,
    anchorRadius: 6, moteRadius: 9, moteCount: 5,
    moteScore: 50, moteSpeed: 10, moteRespawn: 3.0,
    perfectConeDeg: 30, perfectRange: 200, perfectBonusScore: 250, perfectBonusSpeed: 18,
    swingScore: 100, scoreRate: .5,
    chainTier: 4, chainMultStep: .5, chainMultMax: 4.0,
    borderRate: 1.0, borderMax: 230,
    hazardInterval: 30, hazardMax: 6, hazardW: 64, hazardH: 12,
    invulnTime: 1.2, lives: 3, maxLives: 9, prngSeed: 12345,
    spawnRadius: 50, spawnDelayMin: .35, spawnDelayMax: 1.0,
    maxSwingRotations: 4,
};

export const LEVEL = {
    anchors: [[640, 360], [380, 220], [900, 220], [380, 500], [900, 500], [200, 360], [1080, 360]],
    motes: [[500, 300], [780, 300], [500, 440], [780, 440], [640, 200]],
};

const clamp = (v, a, b)=> Math.max(a, Math.min(b, v));

// how far away an anchor can be grabbed: shrinks as the run goes on
export const latchRange = (t, c = CONFIG)=> Math.max(c.latchRangeMin, c.latchRangeBase - c.latchRangeRamp * t);
// how long an anchor rests after you let go of it: grows as the run goes on
export const anchorCooldown = (t, c = CONFIG)=> Math.min(c.anchorCooldownMax, c.anchorCooldownBase + c.anchorCooldownRamp * t);
// how far the deadly edge has crept in from every side
export const border = (t, c = CONFIG)=> clamp(c.borderRate * t, 0, c.borderMax);
// the score multiplier for a chain of good swings: +0.5 every 4, up to ×4
export const mult = (chain, c = CONFIG)=> clamp(1 + Math.floor(chain / c.chainTier) * c.chainMultStep, 1, c.chainMultMax);
// a full swing loop is 2π; past this many radians on one anchor the tether snaps
export const swingLimit = (c = CONFIG)=> c.maxSwingRotations * Math.PI * 2;

// the swing loop's pitch follows speed, the pulse loop's follows the run's clock
const map = (x, a, b, c, d)=> c + (clamp(x, a, b) - a) / (b - a) * (d - c);
export const swingPitch = (v, c = CONFIG)=> map(v, c.vMin, c.vMax, .7, 2);
export const pulsePitch = (t)=> map(t, 0, 230, 1, 2.2);

// the high-score table rules live in lib/, so the tests can check them without a page
export { TABLE_SIZE, insertScore, nextLetter, qualifies, sanitize, topScore } from '../../lib/high-scores.js';
