import { COLS, ROWS } from '../game/constants';
import type { Edge, RoomDef } from '../types';

// Tile index constants (match tileset.png order).
export const F1 = 0; // Floor A
export const F2 = 1; // Floor B
export const WT = 2; // Wall Top
export const WF = 3; // Wall Front
export const WL = 4; // Wall Left Cap
export const WR = 5; // Wall Right Cap
export const DL = 6; // Door Frame Left  (dark doorway, walkable)
export const DR = 7; // Door Frame Right (dark doorway, walkable)

/** Wall tile indices are the only collidable tiles. */
export const COLLIDABLE = new Set<number>([WT, WF, WL, WR]);
export function isWall(tile: number): boolean {
  return COLLIDABLE.has(tile);
}

/** Door frame tile indices (walkable doorway sprites). */
export function isDoor(tile: number): boolean {
  return tile === DL || tile === DR;
}

// --- Standardized door openings ---------------------------------------------
// Both rooms on either side of a door MUST use the same opening cells so that
// when the player is repositioned to the opposite edge (preserving the cross-
// axis coordinate) they always land inside the matching gap.
//
// Vertical doors (north/south edges): 2 tiles wide, columns 9 & 10.
// Horizontal doors (east/west edges): 2 tiles tall, rows 7 & 8.
export const DOOR_COLS = [9, 10] as const; // for north / south openings
export const DOOR_ROWS = [7, 8] as const; // for east / west openings

interface RoomSpec {
  id: string;
  col: number;
  row: number;
  doors: Partial<Record<Edge, boolean>>;
  /** Interior wall cells [col, row], applied before door landings are cleared. */
  walls?: Array<[number, number]>;
}

// Deterministic floor variety: ~30% F2, scattered irregularly (not a grid).
function floorTile(c: number, r: number, seed: number): number {
  const h = Math.sin(c * 12.9898 + r * 78.233 + seed * 37.719) * 43758.5453;
  const frac = h - Math.floor(h);
  return frac < 0.3 ? F2 : F1;
}

function blankGrid(seed: number): number[][] {
  const g: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const rowArr: number[] = [];
    for (let c = 0; c < COLS; c++) rowArr.push(floorTile(c, r, seed));
    g.push(rowArr);
  }
  return g;
}

function buildRoom(spec: RoomSpec): RoomDef {
  const seed = spec.id.charCodeAt(spec.id.length - 1);
  const tiles = blankGrid(seed);

  // Perimeter walls.
  for (let c = 0; c < COLS; c++) {
    tiles[0][c] = WT;
    tiles[ROWS - 1][c] = WF;
  }
  for (let r = 0; r < ROWS; r++) {
    tiles[r][0] = WL;
    tiles[r][COLS - 1] = WR;
  }

  // Interior walls.
  for (const [c, r] of spec.walls ?? []) {
    if (c > 0 && c < COLS - 1 && r > 0 && r < ROWS - 1) tiles[r][c] = WF;
  }

  // Carve door openings (dark doorway tiles, walkable) + a floor landing just
  // inside so the player never spawns in a wall and the door stays reachable.
  if (spec.doors.north) {
    tiles[0][DOOR_COLS[0]] = DL;
    tiles[0][DOOR_COLS[1]] = DR;
    clearLanding(tiles, 8, 11, 1, 2);
  }
  if (spec.doors.south) {
    tiles[ROWS - 1][DOOR_COLS[0]] = DL;
    tiles[ROWS - 1][DOOR_COLS[1]] = DR;
    clearLanding(tiles, 8, 11, ROWS - 3, ROWS - 2);
  }
  if (spec.doors.west) {
    tiles[DOOR_ROWS[0]][0] = DL;
    tiles[DOOR_ROWS[1]][0] = DR;
    clearLanding(tiles, 1, 2, 6, 9);
  }
  if (spec.doors.east) {
    tiles[DOOR_ROWS[0]][COLS - 1] = DL;
    tiles[DOOR_ROWS[1]][COLS - 1] = DR;
    clearLanding(tiles, COLS - 3, COLS - 2, 6, 9);
  }

  return { id: spec.id, col: spec.col, row: spec.row, tiles };
}

function clearLanding(
  tiles: number[][],
  c0: number,
  c1: number,
  r0: number,
  r1: number,
): void {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (c > 0 && c < COLS - 1 && r > 0 && r < ROWS - 1) tiles[r][c] = F1;
    }
  }
}

// --- Wall-segment helpers (for readable room specs) -------------------------
function hLine(r: number, c0: number, c1: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let c = c0; c <= c1; c++) out.push([c, r]);
  return out;
}
function vLine(c: number, r0: number, r1: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let r = r0; r <= r1; r++) out.push([c, r]);
  return out;
}

// --- World layout -----------------------------------------------------------
//        [R1]
//         |
//   [R2]-[R3]-[R4]
//              |
//        [R5]-[R6]
//
//   (1,0)=R1
//   (0,1)=R2  (1,1)=R3  (2,1)=R4
//             (1,2)=R5  (2,2)=R6
const SPECS: RoomSpec[] = [
  // R1 — open antechamber, single south door.
  { id: 'R1', col: 1, row: 0, doors: { south: true } },

  // R2 — dead-end with an L-shaped wall.
  {
    id: 'R2',
    col: 0,
    row: 1,
    doors: { east: true },
    walls: [...vLine(6, 4, 9), ...hLine(9, 6, 12)],
  },

  // R3 — central hub, three doors (N, W, E) + four pillars.
  {
    id: 'R3',
    col: 1,
    row: 1,
    doors: { north: true, west: true, east: true },
    walls: [
      [6, 5],
      [13, 5],
      [6, 9],
      [13, 9],
    ],
  },

  // R4 — corridor feel via two offset vertical walls (W and S doors).
  {
    id: 'R4',
    col: 2,
    row: 1,
    doors: { west: true, south: true },
    walls: [...vLine(6, 1, 6), ...vLine(13, 8, 13)],
  },

  // R5 — dead-end with two offset blocks (E door only).
  {
    id: 'R5',
    col: 1,
    row: 2,
    doors: { east: true },
    walls: [...vLine(5, 3, 6), ...vLine(14, 8, 11)],
  },

  // R6 — horizontal corridor feel (N and W doors).
  {
    id: 'R6',
    col: 2,
    row: 2,
    doors: { north: true, west: true },
    walls: [...hLine(3, 1, 6), ...hLine(3, 13, 18), ...hLine(11, 1, 18)],
  },
];

// --- Map metadata -----------------------------------------------------------
// Lightweight, tile-free view of every room, derived from the SAME SPECS that
// build the playable rooms. The world-map UI (src/ui/roomMap.ts) renders from
// this, so ANY room added to SPECS above appears on the map automatically — no
// second list to maintain. See map.html for the full documentation.
export interface RoomMeta {
  id: string;
  col: number;
  row: number;
  doors: Partial<Record<Edge, boolean>>;
}

export const ROOM_META: RoomMeta[] = SPECS.map((spec) => ({
  id: spec.id,
  col: spec.col,
  row: spec.row,
  doors: spec.doors,
}));

const ROOMS = new Map<string, RoomDef>();
for (const spec of SPECS) ROOMS.set(`${spec.col},${spec.row}`, buildRoom(spec));

export function key(col: number, row: number): string {
  return `${col},${row}`;
}

export function getRoom(col: number, row: number): RoomDef | undefined {
  return ROOMS.get(key(col, row));
}

/** Room the player spawns in: R1, the open antechamber at the top. */
export const START_ROOM = { col: 1, row: 0 };
