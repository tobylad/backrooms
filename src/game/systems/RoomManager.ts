import Phaser from 'phaser';
import { COLS, ROWS, TILE_SIZE } from '../constants';
import { getRoom, isDoor, isWall } from '../../data/rooms';
import { setPlayerRoom } from './playerLocation';
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

    // A room may stitch several screen-sized subrooms onto a local sub-grid;
    // ordinary rooms are just one. Each subroom renders at its own offset so the
    // whole space is laid out in one continuous coordinate system the camera can
    // scroll across.
    for (const sub of room.subrooms) {
      const baseX = sub.subCol * COLS * TILE_SIZE;
      const baseY = sub.subRow * ROWS * TILE_SIZE;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = sub.tiles[r][c];
          const x = baseX + c * TILE_SIZE;
          const y = baseY + r * TILE_SIZE;

          // Door art is drawn for a horizontal opening (DL/DR side by side).
          // On the left/right subroom edges the doorway is vertical, so rotate
          // the sprite 90° to match. Rotation pivots around the sprite's origin,
          // so for these we center the origin (and position) — a square tile
          // rotated about its center stays within the same cell — instead of
          // the usual top-left origin used for axis-aligned tiles.
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

          // Solid filler is purely visual (unreachable behind real walls), so it
          // needs no collision bodies of its own.
          if (!sub.solid && isWall(tile)) {
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
    }

    this.current = room;
    // Publish the active room so the world map (and any other listener) knows
    // where the player is. Every room load funnels through here, so this single
    // call covers the initial spawn and every door transition. Subrooms stay
    // internal — the map only ever sees the one room cell.
    setPlayerRoom(col, row);
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
}
