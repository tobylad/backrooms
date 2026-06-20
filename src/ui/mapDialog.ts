import type Phaser from 'phaser';
import { renderRoomMap } from './roomMap';
import {
  getPlayerRoom,
  getVisitedRooms,
  onPlayerRoom,
} from '../game/systems/playerLocation';

const SCENE_KEY = 'GameScene';

/**
 * The in-game world map: a dialog sized to the game screen that overlays the
 * play area. It shows the CSS-grid room diagram with a beacon flashing over the
 * room the player is currently in, and offers an easy exit (× button, backdrop
 * click, or Esc — the last is driven by the options menu) straight back to the
 * game.
 *
 * Opening the map pauses the scene; closing it resumes. While open it subscribes
 * to player-location changes so the beacon stays correct.
 *
 * The map can also be toggled with the "M" hotkey. When it's opened from the
 * options menu, `open(true)` surfaces a small hint reminding the player they can
 * use "M" to toggle it; the hotkey itself opens silently.
 */
export interface MapDialog {
  open: (showHint?: boolean) => void;
  close: () => void;
  isOpen: () => boolean;
}

export function initMapDialog(game: Phaser.Game): MapDialog {
  const host = document.getElementById('map-dialog');
  const toggle = document.getElementById('menu-toggle');
  if (!host) throw new Error('Map dialog container missing');

  host.innerHTML = `
    <div class="map-panel" role="dialog" aria-modal="true" aria-label="World map">
      <header class="map-header">
        <h1>MAP</h1>
        <button id="map-close" type="button" aria-label="Close map">&times;</button>
      </header>
      <div class="map-body"><div id="map-canvas"></div></div>
      <footer class="map-footer">
        <span class="map-legend"><span class="beacon-swatch"></span> You are here</span>
        <span id="map-status" class="map-status" hidden>Press <kbd class="map-key">M</kbd> to toggle map</span>
        <span class="map-hint">Esc or &times; to return</span>
      </footer>
    </div>
  `;

  const canvas = host.querySelector('#map-canvas') as HTMLElement;
  const status = host.querySelector('#map-status') as HTMLElement;
  let unsubscribe: (() => void) | null = null;

  const draw = (): void => {
    canvas.replaceChildren(
      renderRoomMap({ current: getPlayerRoom(), visited: getVisitedRooms() }),
    );
  };

  const isOpen = (): boolean => !host.classList.contains('hidden');

  const open = (showHint = false): void => {
    if (isOpen()) return;
    draw();
    // The "use M to toggle" hint is only relevant when the player opened the map
    // some other way (the menu) and may not know about the hotkey.
    status.hidden = !showHint;
    host.classList.remove('hidden');
    toggle?.classList.add('hidden');
    if (game.scene.isActive(SCENE_KEY)) game.scene.pause(SCENE_KEY);
    // Keep the beacon following the player if they change rooms while open.
    unsubscribe = onPlayerRoom(draw);
  };

  const close = (): void => {
    if (!isOpen()) return;
    host.classList.add('hidden');
    toggle?.classList.remove('hidden');
    unsubscribe?.();
    unsubscribe = null;
    if (game.scene.isPaused(SCENE_KEY)) game.scene.resume(SCENE_KEY);
  };

  host.querySelector('#map-close')?.addEventListener('click', close);
  // Click on the backdrop (outside the panel) closes the map.
  host.addEventListener('click', (e) => {
    if (e.target === host) close();
  });

  return { open, close, isOpen };
}
