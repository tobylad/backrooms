import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { RoomManager } from '../systems/RoomManager';
import { PlayerController } from '../systems/PlayerController';
import { Sfx } from '../systems/Sfx';
import { START_ROOM, entrySpawn } from '../../data/rooms';
import type { Edge, RoomDef } from '../../types';

const FADE_MS = 150;

const OPPOSITE: Record<Edge, Edge> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

export class GameScene extends Phaser.Scene {
  private rooms!: RoomManager;
  private player!: PlayerController;
  private sfx!: Sfx;
  private flicker!: Phaser.GameObjects.Rectangle;
  private isTransitioning = false;
  // Which subroom the player is currently standing in. Tracked so crossing an
  // open wall into the next subroom can play the scroll breeze exactly once.
  private subPos = { sc: 0, sr: 0 };
  private multiSub = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.rooms = new RoomManager(this);
    const room = this.rooms.loadRoom(START_ROOM.col, START_ROOM.row);

    this.sfx = new Sfx(this);
    this.player = new PlayerController(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.sfx);

    // The wall group instance persists across room loads (it is cleared and
    // refilled in place), so a single collider keeps working for every room.
    this.physics.add.collider(this.player.sprite, this.rooms.getWallGroup());

    this.addAtmosphere();
    this.configureCamera(room);
    this.resetSubTracking(room);
    this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
  }

  /** Green cast + slow fluorescent flicker, layered above tiles, below player. */
  private addAtmosphere(): void {
    // Glued to the viewport (scrollFactor 0) so the cast and flicker cover the
    // screen even while the camera scrolls across a multi-screen room.
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a3a1a, 0.04)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(5);

    this.flicker = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a3a1a, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(6);
  }

  /**
   * Bound the camera to the room's full pixel size and follow the player. For an
   * ordinary single-screen room the bounds equal the viewport, so the camera
   * stays locked; for a scroll room it pans to keep the player in view.
   */
  private configureCamera(room: RoomDef): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, room.subCols * GAME_WIDTH, room.subRows * GAME_HEIGHT);
    cam.startFollow(this.player.sprite, true, 0.2, 0.2);
    // Snap the scroll to the player now (while the screen is mid-fade) so the
    // room appears already centred rather than panning in from the old position.
    cam.centerOn(this.player.sprite.x, this.player.sprite.y);
  }

  /** Reset the "current subroom" tracker to wherever the player just landed. */
  private resetSubTracking(room: RoomDef): void {
    this.multiSub = room.subrooms.filter((s) => !s.solid).length > 1;
    this.subPos = this.subAt();
  }

  private subAt(): { sc: number; sr: number } {
    const room = this.rooms.current;
    const p = this.player.sprite;
    const sc = Phaser.Math.Clamp(Math.floor(p.x / GAME_WIDTH), 0, room.subCols - 1);
    const sr = Phaser.Math.Clamp(Math.floor(p.y / GAME_HEIGHT), 0, room.subRows - 1);
    return { sc, sr };
  }

  update(time: number): void {
    this.player.update();
    this.checkEdges();
    this.checkSubroomScroll();

    // ~2s sine cycle between alpha 0 and 0.04 — unstable lighting.
    const a = (Math.sin(time * 0.003) * 0.5 + 0.5) * 0.04;
    this.flicker.setAlpha(a);
  }

  /** Play the light breeze the first frame the player enters a new subroom. */
  private checkSubroomScroll(): void {
    if (this.isTransitioning || !this.multiSub) return;
    const { sc, sr } = this.subAt();
    if (sc !== this.subPos.sc || sr !== this.subPos.sr) {
      this.sfx.scroll();
      this.subPos = { sc, sr };
    }
  }

  private checkEdges(): void {
    if (this.isTransitioning) return;
    const room = this.rooms.current;
    const w = room.subCols * GAME_WIDTH;
    const h = room.subRows * GAME_HEIGHT;
    const p = this.player.sprite;
    let edge: Edge | null = null;
    // Only the room's OUTER bounds count — open walls between subrooms sit well
    // inside these limits, so scrolling between subrooms never triggers a swap.
    if (p.y < 0) edge = 'north';
    else if (p.y > h) edge = 'south';
    else if (p.x < 0) edge = 'west';
    else if (p.x > w) edge = 'east';
    if (!edge) return;

    const next = this.rooms.getAdjacentRoom(edge);
    if (!next) return; // perimeter walls should make this unreachable

    this.transition(edge, next.col, next.row);
  }

  private transition(edge: Edge, nextCol: number, nextRow: number): void {
    this.isTransitioning = true;
    this.player.frozen = true;
    this.sfx.roomTransition(); // door creak + breeze as the room swaps

    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const room = this.rooms.loadRoom(nextCol, nextRow);
      // Enter through the new room's door on the opposite edge, facing inward.
      const spawn = entrySpawn(room, OPPOSITE[edge]);
      this.player.placeAt(spawn.x, spawn.y, spawn.facing);
      this.configureCamera(room);
      this.resetSubTracking(room);
      this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
      this.isTransitioning = false;
      this.player.frozen = false;
    });
  }
}
