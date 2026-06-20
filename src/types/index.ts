export type Edge = 'north' | 'south' | 'east' | 'west';

export interface RoomDef {
  id: string;
  /** World-grid column of this room. */
  col: number;
  /** World-grid row of this room. */
  row: number;
  /** ROWS (15) arrays of COLS (20) tile indices. */
  tiles: number[][];
}
