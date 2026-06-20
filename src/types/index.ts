export type Edge = 'north' | 'south' | 'east' | 'west';

/**
 * A single screen-sized cell (COLS x ROWS tiles) within a room. Most rooms are
 * one subroom, but a "scroll room" stitches several together on a local
 * sub-grid: adjacent subrooms joined by `open` edges form one continuous space
 * the camera scrolls across, while the player stays in the same map cell.
 */
export interface SubroomDef {
  /** Code-only id, e.g. "R7-1". Never shown to the player. */
  id: string;
  /** Position on the room's local sub-grid. */
  subCol: number;
  subRow: number;
  /** ROWS (15) arrays of COLS (20) tile indices. */
  tiles: number[][];
  /** Outer-edge doors — a fade transition to the neighbouring room. */
  doors: Partial<Record<Edge, boolean>>;
  /** Open boundaries to an adjacent subroom — a seamless scroll + breeze. */
  open: Partial<Record<Edge, boolean>>;
  /**
   * Filler for an empty sub-grid cell in a non-rectangular room: rendered as a
   * solid wall block so the camera never reveals void, but unreachable, so it
   * needs no collision bodies of its own.
   */
  solid?: boolean;
}

export interface RoomDef {
  id: string;
  /** World-grid column of this room. */
  col: number;
  /** World-grid row of this room. */
  row: number;
  /** Extent of the local sub-grid (1x1 for an ordinary single-screen room). */
  subCols: number;
  subRows: number;
  /** Every subroom that makes up this room (just one for ordinary rooms). */
  subrooms: SubroomDef[];
  /**
   * Outer-edge doors aggregated across the subrooms. Drives the world map and
   * the room-to-room transition lookup — subrooms are an internal detail.
   */
  doors: Partial<Record<Edge, boolean>>;
}
