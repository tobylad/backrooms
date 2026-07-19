import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Tileset — each tile 40x40, sheet 160x80 (4 cols x 2 rows = 8 tiles).
    this.load.spritesheet('tileset-40', 'assets/tileset-40.png', {
      frameWidth: 40,
      frameHeight: 40,
    });

    // Player — each frame 48x48, sheet 144x192 (3 cols x 4 rows = 12 frames).
    this.load.spritesheet('player', 'assets/player.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
  }

  create(): void {
    this.createPlayerAnimations();
    this.scene.start('GameScene');
  }

  private createPlayerAnimations(): void {
    const f = (frame: number) => ({ key: 'player', frame });

    // Walk cycles: idle -> left step -> idle -> right step.
    this.anims.create({
      key: 'walk-down',
      frames: [f(0), f(1), f(0), f(2)],
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-up',
      frames: [f(3), f(4), f(3), f(5)],
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-left',
      frames: [f(6), f(7), f(6), f(8)],
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-right',
      frames: [f(9), f(10), f(9), f(11)],
      frameRate: 8,
      repeat: -1,
    });

    // Idle frames (first frame of each direction).
    this.anims.create({ key: 'idle-down', frames: [f(0)], frameRate: 1 });
    this.anims.create({ key: 'idle-up', frames: [f(3)], frameRate: 1 });
    this.anims.create({ key: 'idle-left', frames: [f(6)], frameRate: 1 });
    this.anims.create({ key: 'idle-right', frames: [f(9)], frameRate: 1 });
  }
}
