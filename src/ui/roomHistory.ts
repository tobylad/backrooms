import { ROOM_META } from '../data/rooms';
import type { RoomCoord } from '../game/systems/playerLocation';

/**
 * Renders the player's recent room trail as a horizontal list of chips, most
 * recent first. Sits directly below the grid map in the in-game dialog as a
 * lightweight log of where the player has been — rooms can appear more than once
 * if they were re-entered (e.g. backtracking through a door).
 *
 * Styles itself via src/ui/roomHistory.css.
 */

// How many of the most recent rooms to surface. Kept here rather than exposed in
// the UI copy so the list just reads as "recent history".
const HISTORY_LIMIT = 10;

/** Look up a room's display id from its grid coordinate. */
function roomLabel(coord: RoomCoord): string {
  const meta = ROOM_META.find((r) => r.col === coord.col && r.row === coord.row);
  return meta?.id ?? `${coord.col},${coord.row}`;
}

export function renderRoomHistory(history: RoomCoord[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'room-history';

  const heading = document.createElement('span');
  heading.className = 'room-history__title';
  heading.textContent = 'HISTORY';
  wrap.appendChild(heading);

  const list = document.createElement('ol');
  list.className = 'room-history__list';

  if (history.length === 0) {
    list.classList.add('room-history__list--empty');
    list.textContent = 'No movement yet.';
    wrap.appendChild(list);
    return wrap;
  }

  for (const coord of history.slice(0, HISTORY_LIMIT)) {
    const item = document.createElement('li');
    item.className = 'room-history__item';
    item.textContent = roomLabel(coord);
    list.appendChild(item);
  }

  wrap.appendChild(list);
  return wrap;
}
