import Phaser from 'phaser';
import { initMapDialog } from './mapDialog';

const SCENE_KEY = 'GameScene';

/**
 * Plain DOM options overlay. Opening it pauses the active Phaser scene; closing
 * it resumes. No framework — just class toggles on the existing containers. It
 * also owns the world-map dialog (opened from the "World Map" button) and the
 * single Escape handler that coordinates the two overlays.
 */
export function initOptionsMenu(game: Phaser.Game): void {
  const menu = document.getElementById('options-menu');
  const toggle = document.getElementById('menu-toggle');
  if (!menu || !toggle) throw new Error('Options menu containers missing');

  menu.innerHTML = `
    <div class="options-panel">
      <h1>OPTIONS</h1>
      <label class="opt-row">
        <span>Volume</span>
        <input id="opt-volume" type="range" min="0" max="100" value="100" />
      </label>
      <button id="opt-map" type="button">World Map</button>
      <button id="opt-resume" type="button">Resume</button>
    </div>
  `;

  const map = initMapDialog(game);

  const open = (): void => {
    if (!menu.classList.contains('hidden')) return;
    menu.classList.remove('hidden');
    toggle.classList.add('hidden');
    if (game.scene.isActive(SCENE_KEY)) game.scene.pause(SCENE_KEY);
  };

  // `resume` is suppressed when handing off to the map dialog, which keeps the
  // scene paused and resumes it itself on exit.
  const close = (resume = true): void => {
    if (menu.classList.contains('hidden')) return;
    menu.classList.add('hidden');
    toggle.classList.remove('hidden');
    if (resume && game.scene.isPaused(SCENE_KEY)) game.scene.resume(SCENE_KEY);
  };

  toggle.addEventListener('click', open);
  document.getElementById('opt-resume')?.addEventListener('click', () => close());

  // Open the map from the menu: hide the options panel without resuming the
  // game, then hand off to the map dialog (which resumes on its own exit).
  document.getElementById('opt-map')?.addEventListener('click', () => {
    close(false);
    // Opened from the menu: surface the "M toggles the map" hint.
    map.open(true);
  });

  // Master volume. The synthesized SFX (Sfx.ts) route through the WebAudio
  // sound manager, so this scales them too.
  const vol = document.getElementById('opt-volume') as HTMLInputElement | null;
  vol?.addEventListener('input', () => {
    game.sound.volume = Number(vol.value) / 100;
  });

  // Single Escape handler. The map takes priority when it's open (so Esc backs
  // out of the map to the game); otherwise Esc toggles the options panel.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (map.isOpen()) {
      map.close();
      return;
    }
    if (menu.classList.contains('hidden')) open();
    else close();
  });

  // "M" hotkey: quick toggle for the map. Opened this way it's silent (no hint).
  // Ignored while the options panel is up so the two overlays never stack.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'm' && e.key !== 'M') return;
    if (map.isOpen()) map.close();
    else if (menu.classList.contains('hidden')) map.open();
  });
}
