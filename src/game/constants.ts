// Pure dimension constants with no imports — kept separate from config.ts so
// data modules (e.g. rooms.ts) can use them without pulling in the scene
// classes, which would create a circular import.
export const GAME_WIDTH = 1120; // 28 tiles wide
export const GAME_HEIGHT = 840; // 21 tiles tall
export const TILE_SIZE = 40;
export const COLS = GAME_WIDTH / TILE_SIZE; // 28
export const ROWS = GAME_HEIGHT / TILE_SIZE; // 21
