import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../constants';
import { RoomManager } from '../systems/RoomManager';
import { PlayerController } from '../systems/PlayerController';
import { Sfx } from '../systems/Sfx';
import { START_ROOM } from '../../data/rooms';
import type { Edge } from '../../types';

const FADE_MS = 150;

export class GameScene extends Phaser.Scene {
  private rooms!: RoomManager;
  private player!: PlayerController;
  private sfx!: Sfx;
  private flicker!: Phaser.GameObjects.Rectangle;
  private isTransitioning = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.rooms = new RoomManager(this);
    this.rooms.loadRoom(START_ROOM.col, START_ROOM.row);

    this.sfx = new Sfx(this);
    this.player = new PlayerController(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.sfx);

    // The wall group instance persists across room loads (it is cleared and
    // refilled in place), so a single collider keeps working for every room.
    this.physics.add.collider(this.player.sprite, this.rooms.getWallGroup());

    this.addAtmosphere();
    this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
  }

  /** Green cast + slow fluorescent flicker, layered above tiles, below player. */
  private addAtmosphere(): void {
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a3a1a, 0.04)
      .setOrigin(0, 0)
      .setDepth(5);

    this.flicker = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a3a1a, 0)
      .setOrigin(0, 0)
      .setDepth(6);
  }

  update(time: number): void {
    this.player.update();
    this.checkEdges();

    // ~2s sine cycle between alpha 0 and 0.04 — unstable lighting.
    const a = (Math.sin(time * 0.003) * 0.5 + 0.5) * 0.04;
    this.flicker.setAlpha(a);
  }

  private checkEdges(): void {
    if (this.isTransitioning) return;
    const p = this.player.sprite;
    let edge: Edge | null = null;
    if (p.y < 0) edge = 'north';
    else if (p.y > GAME_HEIGHT) edge = 'south';
    else if (p.x < 0) edge = 'west';
    else if (p.x > GAME_WIDTH) edge = 'east';
    if (!edge) return;

    const next = this.rooms.getAdjacentRoom(edge);
    if (!next) return; // perimeter walls should make this unreachable

    this.transition(edge, next.col, next.row);
  }

  private transition(edge: Edge, nextCol: number, nextRow: number): void {
    this.isTransitioning = true;
    this.player.frozen = true;
    this.sfx.roomTransition(); // door creak + breeze as the room swaps

    const p = this.player.sprite;
    const margin = TILE_SIZE + 4;
    let nx = p.x;
    let ny = p.y;
    // Appear at the opposite edge of the new room, preserving the cross axis so
    // the player lands in the matching (standardized) door opening.
    switch (edge) {
      case 'north':
        ny = GAME_HEIGHT - margin;
        break;
      case 'south':
        ny = margin;
        break;
      case 'west':
        nx = GAME_WIDTH - margin;
        break;
      case 'east':
        nx = margin;
        break;
    }

    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.rooms.loadRoom(nextCol, nextRow);
      this.player.placeAt(nx, ny, edge);
      this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
      this.isTransitioning = false;
      this.player.frozen = false;
    });
  }
}
