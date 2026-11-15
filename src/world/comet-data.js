// Comet's numbers and its one arena, as plain data that imports nothing. Distances are in screen pixels on a
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
    // rocks: one every hazardInterval s of flight, up to hazardMax, hazardR across; harmless for hazardArrive s while
    // they fade in; never within hazardClearSpawn of the middle anchor (where the comet respawns), hazardClearAnchor of
    // another anchor, or hazardClearComet of the comet or the next second of its path
    hazardInterval: 30, hazardMax: 6, hazardR: 14, hazardArrive: 1.2,
    hazardClearSpawn: 210, hazardClearAnchor: 72, hazardClearComet: 160,
    invulnTime: 1.2, lives: 3, maxLives: 9, prngSeed: 12345,
    spawnRadius: 50, spawnDelayMin: .35, spawnDelayMax: 1.0,
    maxSwingRotations: 4,
};

export const LEVEL = {
    anchors: [[640, 360], [380, 220], [900, 220], [380, 500], [900, 500], [200, 360], [1080, 360]],
    motes: [[500, 300], [780, 300], [500, 440], [780, 440], [640, 200]],
};
