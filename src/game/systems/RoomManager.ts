import Phaser from 'phaser';
import { COLS, ROWS, TILE_SIZE } from '../constants';
import { getRoom, isDoor, isWall } from '../../data/rooms';
import type { Edge, RoomDef } from '../../types';

/**
 * Owns the currently-rendered room: builds its tile sprites and wall collision
 * bodies, and tears them down when moving to another room. Perimeter wall tiles
 * are themselves collidable, so any screen edge without a door opening is fully
 * walled and blocks the player — no extra invisible barriers are required.
 */
export class RoomManager {
  private scene: Phaser.Scene;
  private tileLayer: Phaser.GameObjects.Group;
  private wallGroup: Phaser.Physics.Arcade.StaticGroup;
  current!: RoomDef;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.tileLayer = scene.add.group();
    this.wallGroup = scene.physics.add.staticGroup();
  }

  getWallGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.wallGroup;
  }

  /** Tear down the previous room and render the room at (col,row). */
  loadRoom(col: number, row: number): RoomDef {
    const room = getRoom(col, row);
    if (!room) throw new Error(`No room at ${col},${row}`);

    this.tileLayer.clear(true, true);
    this.wallGroup.clear(true, true);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = room.tiles[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        // Door art is drawn for a horizontal opening (DL/DR side by side).
        // On the left/right room edges the doorway is vertical, so rotate the
        // sprite 90° to match. Rotation pivots around the sprite's origin, so
        // for these we center the origin (and position) — a square tile rotated
        // about its center stays within the same cell — instead of the usual
        // top-left origin used for axis-aligned tiles.
        const onVerticalEdge = c === 0 || c === COLS - 1;
        const rotateDoor = isDoor(tile) && onVerticalEdge;

        const img = rotateDoor
          ? this.scene.add
              .image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 'tileset', tile)
              .setOrigin(0.5, 0.5)
              .setAngle(90)
          : this.scene.add.image(x, y, 'tileset', tile).setOrigin(0, 0);
        img.setDepth(0);
        this.tileLayer.add(img);

        if (isWall(tile)) {
          // Static body sized to the tile, top-left aligned.
          // The visible tile is already drawn above; this body is collision
          // only, so keep it invisible to avoid double-drawing.
          const body = this.wallGroup.create(x, y, 'tileset', tile) as
            Phaser.Physics.Arcade.Sprite;
          body.setOrigin(0, 0);
          body.setVisible(false);
          body.refreshBody();
        }
      }
    }

    this.current = room;
    return room;
  }

  /** Neighbor room across the given edge, or null if there is none. */
  getAdjacentRoom(edge: Edge): RoomDef | null {
    const { col, row } = this.current;
    switch (edge) {
      case 'north':
        return getRoom(col, row - 1) ?? null;
      case 'south':
        return getRoom(col, row + 1) ?? null;
      case 'west':
        return getRoom(col - 1, row) ?? null;
      case 'east':
        return getRoom(col + 1, row) ?? null;
    }
  }

  /**
   * Tile columns/rows along an edge that are walkable (door openings). Returned
   * for completeness / debugging; transition repositioning relies on the
   * standardized door coordinates so both sides always line up.
   */
  findDoorPositions(room: RoomDef, edge: Edge): number[] {
    const out: number[] = [];
    if (edge === 'north' || edge === 'south') {
      const r = edge === 'north' ? 0 : ROWS - 1;
      for (let c = 0; c < COLS; c++) if (!isWall(room.tiles[r][c])) out.push(c);
    } else {
      const c = edge === 'west' ? 0 : COLS - 1;
      for (let r = 0; r < ROWS; r++) if (!isWall(room.tiles[r][c])) out.push(r);
    }
    return out;
  }
}
