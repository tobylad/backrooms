import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { initOptionsMenu } from './ui/optionsMenu';

const game = new Phaser.Game(gameConfig);
initOptionsMenu(game);
