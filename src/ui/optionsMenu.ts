import Phaser from 'phaser';

const SCENE_KEY = 'GameScene';

/**
 * Plain DOM options overlay. Opening it pauses the active Phaser scene; closing
 * it resumes. No framework — just class toggles on the existing containers.
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
      <button id="opt-resume" type="button">Resume</button>
    </div>
  `;

  const open = (): void => {
    if (!menu.classList.contains('hidden')) return;
    menu.classList.remove('hidden');
    toggle.classList.add('hidden');
    if (game.scene.isActive(SCENE_KEY)) game.scene.pause(SCENE_KEY);
  };

  const close = (): void => {
    if (menu.classList.contains('hidden')) return;
    menu.classList.add('hidden');
    toggle.classList.remove('hidden');
    if (game.scene.isPaused(SCENE_KEY)) game.scene.resume(SCENE_KEY);
  };

  toggle.addEventListener('click', open);
  document.getElementById('opt-resume')?.addEventListener('click', close);

  // Master volume. The synthesized SFX (Sfx.ts) route through the WebAudio
  // sound manager, so this scales them too.
  const vol = document.getElementById('opt-volume') as HTMLInputElement | null;
  vol?.addEventListener('input', () => {
    game.sound.volume = Number(vol.value) / 100;
  });

  // Esc toggles the menu as well.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menu.classList.contains('hidden')) open();
    else close();
  });
}
