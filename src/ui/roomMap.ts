import { ROOM_META, type RoomMeta } from '../data/rooms';
import type { Edge } from '../types';

/**
 * Renders the world map as a CSS-grid diagram, in plain DOM (no framework).
 *
 * The map is data-driven from ROOM_META: each room is placed at its own
 * (col, row) in the grid, so the diagram is spatially accurate — a room one
 * step north of another sits directly above it, a room to the west sits to its
 * left, and so on. Doors are drawn as little nubs on the relevant edges. Adding
 * a room to SPECS in src/data/rooms.ts makes it show up here automatically.
 *
 * The returned element styles itself via src/ui/roomMap.css. Its parent should
 * be `container-type: size` with a definite height so the map can contain-fit
 * itself to the available space (the in-game dialog and the doc page both do
 * this).
 */
export interface RoomMapOptions {
  /**
   * Grid coordinate to flash a "you are here" beacon over. Omit (or pass null)
   * to render a plain reference map with no beacon — e.g. the public doc page.
   */
  current?: RoomCoord | null;
  /**
   * Fog of war: only render rooms whose `col,row` key is in this set, and size
   * the grid to just those so the map fills in as the player explores. Omit (or
   * pass null) to render every defined room — the public doc page does this to
   * show the full world as a design reference.
   */
  visited?: Set<string> | null;
}

interface RoomCoord {
  col: number;
  row: number;
}

const EDGES: Edge[] = ['north', 'south', 'east', 'west'];

export function renderRoomMap(options: RoomMapOptions = {}): HTMLElement {
  const current = options.current ?? null;
  const visited = options.visited ?? null;

  const grid = document.createElement('div');
  grid.className = 'room-map';

  // Render every room, or — when a visited set is given — only discovered ones.
  const rooms = visited
    ? ROOM_META.filter((r) => visited.has(`${r.col},${r.row}`))
    : ROOM_META;

  if (rooms.length === 0) {
    grid.classList.add('room-map--empty');
    grid.textContent = 'No rooms discovered yet.';
    return grid;
  }

  // Grid bounds across the rendered rooms, so a fog-of-war map grows outward as
  // new rooms are discovered while keeping every room's relative position.
  const minCol = Math.min(...rooms.map((r) => r.col));
  const minRow = Math.min(...rooms.map((r) => r.row));
  const maxCol = Math.max(...rooms.map((r) => r.col));
  const maxRow = Math.max(...rooms.map((r) => r.row));

  grid.style.setProperty('--map-cols', String(maxCol - minCol + 1));
  grid.style.setProperty('--map-rows', String(maxRow - minRow + 1));

  for (const room of rooms) {
    grid.appendChild(buildCell(room, minCol, minRow, current));
  }

  return grid;
}

function buildCell(
  room: RoomMeta,
  minCol: number,
  minRow: number,
  current: RoomCoord | null,
): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'room-cell';
  // Grid is 1-indexed; offset by the bounds so the layout starts at the corner.
  cell.style.gridColumn = String(room.col - minCol + 1);
  cell.style.gridRow = String(room.row - minRow + 1);

  const exits = EDGES.filter((edge) => room.doors[edge]);
  cell.dataset.roomId = room.id;
  cell.tabIndex = 0;
  cell.title =
    `${room.id} — exits: ${exits.length ? exits.join(', ') : 'none (dead end)'}`;

  for (const edge of exits) {
    const door = document.createElement('span');
    door.className = `room-door room-door--${edge}`;
    cell.appendChild(door);
  }

  const label = document.createElement('span');
  label.className = 'room-label';
  label.textContent = room.id;
  cell.appendChild(label);

  const isHere = !!current && current.col === room.col && current.row === room.row;
  if (isHere) {
    cell.classList.add('is-current');
    const beacon = document.createElement('span');
    beacon.className = 'room-beacon';
    beacon.setAttribute('aria-label', 'You are here');
    cell.appendChild(beacon);
  }

  // Lightweight interactivity: click/focus to pin a highlight on a room so it's
  // easy to trace a path across a large map.
  cell.addEventListener('click', () => {
    const wasSelected = cell.classList.contains('is-selected');
    cell
      .closest('.room-map')
      ?.querySelectorAll('.room-cell.is-selected')
      .forEach((el) => el.classList.remove('is-selected'));
    if (!wasSelected) cell.classList.add('is-selected');
  });

  return cell;
}
