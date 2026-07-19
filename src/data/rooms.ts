import { COLS, ROWS, TILE_SIZE } from '../game/constants';
import type { Edge, RoomDef, SubroomDef } from '../types';

// Tile index constants (match tileset-40.png order).
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
// Vertical doors (north/south edges): 2 tiles wide, centered columns.
// Horizontal doors (east/west edges): 2 tiles tall, centered rows.
export const DOOR_COLS = [13, 14] as const; // for north / south openings
export const DOOR_ROWS = [10, 11] as const; // for east / west openings

// --- Standardized open boundaries (scroll rooms) ----------------------------
// Where two subrooms of the same room meet, an `open` edge replaces the wall
// with a wide gap the player walks straight through while the camera scrolls.
// Like doors, both sides use the same standardized cells so the openings line
// up exactly — "the walls from each scrolling area fit together". Wider than a
// door (and drawn as plain floor, no door art) so it reads as an open wall.
export const OPEN_COLS = [10, 11, 12, 13, 14, 15, 16, 17] as const; // north / south
export const OPEN_ROWS = [7, 8, 9, 10, 11, 12, 13] as const; // east / west

/** A subroom: one screen of a room, on the room's local sub-grid. */
interface SubroomSpec {
  /** Sub-grid position within the room. Defaults to (0, 0). */
  subCol?: number;
  subRow?: number;
  /** Doors on the room's OUTER edges — fade transition to a neighbour room. */
  doors?: Partial<Record<Edge, boolean>>;
  /** Open edges to an ADJACENT subroom — seamless scroll + light breeze. */
  open?: Partial<Record<Edge, boolean>>;
  /** Interior wall cells [col, row], applied before openings are cleared. */
  walls?: Array<[number, number]>;
}

interface RoomSpec {
  id: string;
  col: number;
  row: number;
  // Single-screen shorthand — most rooms use this and omit `subrooms`.
  doors?: Partial<Record<Edge, boolean>>;
  walls?: Array<[number, number]>;
  // Scroll rooms list their screens here instead; `doors`/`walls` are ignored.
  subrooms?: SubroomSpec[];
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

/** Tile grid for one subroom: perimeter + interior walls, then carved openings. */
function buildSubroomTiles(sub: SubroomSpec, seed: number): number[][] {
  const tiles = blankGrid(seed);
  const doors = sub.doors ?? {};
  const open = sub.open ?? {};

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
  for (const [c, r] of sub.walls ?? []) {
    if (c > 0 && c < COLS - 1 && r > 0 && r < ROWS - 1) tiles[r][c] = WF;
  }

  // Carve door openings (dark doorway tiles, walkable) + a floor landing just
  // inside so the player never spawns in a wall and the door stays reachable.
  if (doors.north) {
    tiles[0][DOOR_COLS[0]] = DL;
    tiles[0][DOOR_COLS[1]] = DR;
    clearLanding(tiles, DOOR_COLS[0] - 1, DOOR_COLS[1] + 1, 1, 2);
  }
  if (doors.south) {
    tiles[ROWS - 1][DOOR_COLS[0]] = DL;
    tiles[ROWS - 1][DOOR_COLS[1]] = DR;
    clearLanding(tiles, DOOR_COLS[0] - 1, DOOR_COLS[1] + 1, ROWS - 3, ROWS - 2);
  }
  if (doors.west) {
    tiles[DOOR_ROWS[0]][0] = DL;
    tiles[DOOR_ROWS[1]][0] = DR;
    clearLanding(tiles, 1, 2, DOOR_ROWS[0] - 1, DOOR_ROWS[1] + 1);
  }
  if (doors.east) {
    tiles[DOOR_ROWS[0]][COLS - 1] = DL;
    tiles[DOOR_ROWS[1]][COLS - 1] = DR;
    clearLanding(tiles, COLS - 3, COLS - 2, DOOR_ROWS[0] - 1, DOOR_ROWS[1] + 1);
  }

  // Carve open boundaries: a wide gap of plain floor (no door art) plus a deep
  // landing, so two subrooms that face each other read as one continuous space.
  if (open.north) {
    for (const c of OPEN_COLS) tiles[0][c] = F1;
    clearLanding(tiles, OPEN_COLS[0], OPEN_COLS[OPEN_COLS.length - 1], 1, 3);
  }
  if (open.south) {
    for (const c of OPEN_COLS) tiles[ROWS - 1][c] = F1;
    clearLanding(tiles, OPEN_COLS[0], OPEN_COLS[OPEN_COLS.length - 1], ROWS - 4, ROWS - 2);
  }
  if (open.west) {
    for (const r of OPEN_ROWS) tiles[r][0] = F1;
    clearLanding(tiles, 1, 3, OPEN_ROWS[0], OPEN_ROWS[OPEN_ROWS.length - 1]);
  }
  if (open.east) {
    for (const r of OPEN_ROWS) tiles[r][COLS - 1] = F1;
    clearLanding(tiles, COLS - 4, COLS - 2, OPEN_ROWS[0], OPEN_ROWS[OPEN_ROWS.length - 1]);
  }

  return tiles;
}

/** A solid wall block filling an empty sub-grid cell (rendered, never entered). */
function solidTiles(): number[][] {
  const tiles: number[][] = [];
  for (let r = 0; r < ROWS; r++) tiles.push(new Array(COLS).fill(WF));
  return tiles;
}

function buildRoom(spec: RoomSpec): RoomDef {
  // Normalize: an ordinary room is just one subroom at (0, 0).
  const specs: SubroomSpec[] = spec.subrooms ?? [
    { subCol: 0, subRow: 0, doors: spec.doors, walls: spec.walls },
  ];

  const subCols = Math.max(...specs.map((s) => s.subCol ?? 0)) + 1;
  const subRows = Math.max(...specs.map((s) => s.subRow ?? 0)) + 1;

  const seedBase = spec.id.charCodeAt(spec.id.length - 1);
  const filled = new Set<string>();
  const subrooms: SubroomDef[] = specs.map((s, i) => {
    const subCol = s.subCol ?? 0;
    const subRow = s.subRow ?? 0;
    filled.add(`${subCol},${subRow}`);
    return {
      id: specs.length > 1 ? `${spec.id}-${i + 1}` : spec.id,
      subCol,
      subRow,
      tiles: buildSubroomTiles(s, seedBase + subCol * 3 + subRow * 7),
      doors: s.doors ?? {},
      open: s.open ?? {},
    };
  });

  // Fill any empty sub-grid cell with a solid wall block so a non-rectangular
  // room never shows void at the edges of the camera.
  for (let sr = 0; sr < subRows; sr++) {
    for (let sc = 0; sc < subCols; sc++) {
      if (filled.has(`${sc},${sr}`)) continue;
      subrooms.push({
        id: `${spec.id}-fill-${sc}-${sr}`,
        subCol: sc,
        subRow: sr,
        tiles: solidTiles(),
        doors: {},
        open: {},
        solid: true,
      });
    }
  }

  // Outer doors, aggregated for the map and transition lookup.
  const doors: Partial<Record<Edge, boolean>> = {};
  for (const sub of subrooms) {
    for (const edge of EDGES) if (sub.doors[edge]) doors[edge] = true;
  }

  return { id: spec.id, col: spec.col, row: spec.row, subCols, subRows, subrooms, doors };
}

const EDGES: Edge[] = ['north', 'south', 'east', 'west'];

/**
 * World-pixel spawn point for a player entering `room` through its outer edge
 * `enterEdge` (the edge opposite their direction of travel). Lands them just
 * inside the matching door, facing into the room. Falls back to the room centre
 * if no such door exists.
 */
export function entrySpawn(
  room: RoomDef,
  enterEdge: Edge,
): { x: number; y: number; facing: Edge } {
  const margin = TILE_SIZE + 4;
  const screenW = COLS * TILE_SIZE;
  const screenH = ROWS * TILE_SIZE;
  // Centre of the standardized door openings, in subroom-local pixels.
  const doorY = ((DOOR_ROWS[0] + DOOR_ROWS[1] + 1) / 2) * TILE_SIZE;
  const doorX = ((DOOR_COLS[0] + DOOR_COLS[1] + 1) / 2) * TILE_SIZE;

  const sub =
    room.subrooms.find((s) => !s.solid && s.doors[enterEdge]) ?? room.subrooms[0];
  const ox = sub.subCol * screenW;
  const oy = sub.subRow * screenH;

  switch (enterEdge) {
    case 'west':
      return { x: ox + margin, y: oy + doorY, facing: 'east' };
    case 'east':
      return { x: ox + screenW - margin, y: oy + doorY, facing: 'west' };
    case 'north':
      return { x: ox + doorX, y: oy + margin, facing: 'south' };
    case 'south':
      return { x: ox + doorX, y: oy + screenH - margin, facing: 'north' };
  }
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
//        [R5]-[R6]-[R7]   <- R7 is a multi-screen "scroll room"
//
//   (1,0)=R1
//   (0,1)=R2  (1,1)=R3  (2,1)=R4
//             (1,2)=R5  (2,2)=R6  (3,2)=R7
const SPECS: RoomSpec[] = [
  // R1 — open antechamber, single south door.
  { id: 'R1', col: 1, row: 0, doors: { south: true } },

  // R2 — dead-end with an L-shaped wall.
  {
    id: 'R2',
    col: 0,
    row: 1,
    doors: { east: true },
    walls: [...vLine(8, 5, 13), ...hLine(13, 8, 17), ...vLine(20, 3, 7)],
  },

  // R3 — central hub, three doors (N, W, E) + four pillars.
  {
    id: 'R3',
    col: 1,
    row: 1,
    doors: { north: true, west: true, east: true },
    walls: [
      [8, 7],
      [18, 7],
      [8, 13],
      [18, 13],
      [8, 16],
      [18, 16],
    ],
  },

  // R4 — corridor feel via two offset vertical walls (W and S doors).
  {
    id: 'R4',
    col: 2,
    row: 1,
    doors: { west: true, south: true },
    walls: [...vLine(8, 1, 8), ...vLine(18, 11, 19), ...vLine(13, 13, 17)],
  },

  // R5 — dead-end with two offset blocks (E door only).
  {
    id: 'R5',
    col: 1,
    row: 2,
    doors: { east: true },
    walls: [...vLine(7, 4, 8), ...vLine(20, 11, 16), ...hLine(11, 3, 6)],
  },

  // R6 — horizontal corridor feel (N, W and now E doors; E leads to R7).
  {
    id: 'R6',
    col: 2,
    row: 2,
    doors: { north: true, west: true, east: true },
    walls: [
      ...hLine(4, 1, 8),
      ...hLine(4, 18, 26),
      ...hLine(16, 1, 26),
      [11, 8],
      [16, 8],
    ],
  },

  // R7 — the first SCROLL ROOM: three screen-sized subrooms stitched into one
  // L-shaped space. The player enters from R6 (west door of R7-1), scrolls east
  // through an open wall into R7-2, then south into the R7-3 dead-end pocket —
  // all without leaving the single "R7" cell on the map. The empty (0,1) corner
  // is auto-filled with a solid wall block.
  //
  //   R7-1 -- R7-2
  //            |
  //           R7-3
  {
    id: 'R7',
    col: 3,
    row: 2,
    subrooms: [
      // R7-1 — entry hall. Door back to R6 on the west; open wall east to R7-2.
      {
        subCol: 0,
        subRow: 0,
        doors: { west: true },
        open: { east: true },
        walls: [...vLine(10, 1, 4), ...vLine(17, 16, 19), ...hLine(5, 10, 13)],
      },
      // R7-2 — junction. Open west to R7-1, open south down to R7-3.
      {
        subCol: 1,
        subRow: 0,
        open: { west: true, south: true },
        walls: [...vLine(21, 2, 17), [7, 2], [8, 2]],
      },
      // R7-3 — dead-end pocket. Open north back up to R7-2.
      {
        subCol: 1,
        subRow: 1,
        open: { north: true },
        walls: [...hLine(10, 2, 7), ...hLine(10, 20, 24), [13, 16], [14, 16]],
      },
    ],
  },
];

// Build every room once, then derive everything else from the result. A scroll
// room collapses to a single entry here — its subrooms are an internal detail,
// so it occupies exactly one cell with its OUTER doors, just like any other.
const ROOMS = new Map<string, RoomDef>();
for (const spec of SPECS) ROOMS.set(`${spec.col},${spec.row}`, buildRoom(spec));

// --- Map metadata -----------------------------------------------------------
// Lightweight, tile-free view of every room, derived from the SAME built rooms
// that power the game. The world-map UI (src/ui/roomMap.ts) renders from this,
// so ANY room added to SPECS above appears on the map automatically — no second
// list to maintain. See map.html for the full documentation.
export interface RoomMeta {
  id: string;
  col: number;
  row: number;
  doors: Partial<Record<Edge, boolean>>;
}

export const ROOM_META: RoomMeta[] = [...ROOMS.values()].map((room) => ({
  id: room.id,
  col: room.col,
  row: room.row,
  doors: room.doors,
}));

export function key(col: number, row: number): string {
  return `${col},${row}`;
}

export function getRoom(col: number, row: number): RoomDef | undefined {
  return ROOMS.get(key(col, row));
}

/** Room the player spawns in: R1, the open antechamber at the top. */
export const START_ROOM = { col: 1, row: 0 };
