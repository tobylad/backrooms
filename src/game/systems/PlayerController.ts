import Phaser from 'phaser';
import type { Edge } from '../../types';
import { Sfx } from './Sfx';

const SPEED = 160;

// Edge vocabulary -> animation suffix (BootScene uses down/up/left/right).
const ANIM: Record<Edge, string> = {
  north: 'up',
  south: 'down',
  west: 'left',
  east: 'right',
};

export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private lastDir: Edge = 'south';
  /** When true, input is ignored (e.g. during a room transition). */
  frozen = false;

  constructor(scene: Phaser.Scene, x: number, y: number, sfx?: Sfx) {
    const sprite = scene.physics.add.sprite(x, y, 'player', 0);
    sprite.setSize(20, 20); // smaller collision box than the 32x48 art
    sprite.setOffset(6, 24); // anchored to the lower half (the "feet")
    sprite.setCollideWorldBounds(false); // edges handled manually
    sprite.setDepth(10);
    this.sprite = sprite;

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    sprite.anims.play('idle-down');

    // Footsteps are synced to the two contact frames of every walk cycle
    // (array positions 1 and 3 -> 1-based frame.index 2 and 4), so each
    // visible step plants a sound.
    if (sfx) {
      sprite.on(
        Phaser.Animations.Events.ANIMATION_UPDATE,
        (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
          if (!anim.key.startsWith('walk-')) return;
          if (frame.index === 2 || frame.index === 4) sfx.footstep();
        }
      );
    }
  }

  /** Place the player and reset to an idle pose facing into the room. */
  placeAt(x: number, y: number, facing: Edge): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
    this.lastDir = facing;
    this.sprite.anims.play(`idle-${ANIM[facing]}`, true);
  }

  update(): void {
    const body = this.sprite;
    if (this.frozen) {
      body.setVelocity(0, 0);
      return;
    }

    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    let vx = 0;
    let vy = 0;
    if (left) vx -= SPEED;
    if (right) vx += SPEED;
    if (up) vy -= SPEED;
    if (down) vy += SPEED;

    // Normalize diagonals so combined speed stays constant.
    if (vx !== 0 && vy !== 0) {
      const inv = 1 / Math.SQRT2;
      vx *= inv;
      vy *= inv;
    }
    body.setVelocity(vx, vy);

    if (vx === 0 && vy === 0) {
      body.anims.play(`idle-${ANIM[this.lastDir]}`, true);
      return;
    }

    // Pick the dominant axis for the directional animation.
    if (Math.abs(vx) >= Math.abs(vy)) {
      this.lastDir = vx < 0 ? 'west' : 'east';
    } else {
      this.lastDir = vy < 0 ? 'north' : 'south';
    }
    body.anims.play(`walk-${ANIM[this.lastDir]}`, true);
  }
}
