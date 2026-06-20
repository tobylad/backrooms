import { renderRoomMap } from './roomMap';

/**
 * Entry point for the standalone documentation page (map.html). Renders the
 * same data-driven room diagram as the in-game dialog, minus the beacon (there
 * is no live player on the doc page).
 */
const root = document.getElementById('map-root');
if (root) root.appendChild(renderRoomMap());
