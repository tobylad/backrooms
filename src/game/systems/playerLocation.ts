import { START_ROOM, key } from '../../data/rooms';

/**
 * A tiny observable for "which room is the player in right now" plus the set of
 * rooms they have discovered so far.
 *
 * The world map reads this to flash its beacon over the current room and to
 * fog-of-war unvisited rooms, and subscribes so both follow the player as they
 * move while the map is open. Kept framework-free (a plain module-level store)
 * so any future system — minimap, save state, room-entry events — can publish
 * or listen without reaching into the Phaser scene.
 *
 * Discovery state lives in memory only: refreshing or restarting the game wipes
 * it, so exploration begins again from the spawn room.
 */
export interface RoomCoord {
  col: number;
  row: number;
}

type Listener = (coord: RoomCoord) => void;

let current: RoomCoord = { col: START_ROOM.col, row: START_ROOM.row };
const visited = new Set<string>([key(START_ROOM.col, START_ROOM.row)]);
const listeners = new Set<Listener>();

/** Record the room the player just entered (marking it visited) and notify. */
export function setPlayerRoom(col: number, row: number): void {
  current = { col, row };
  visited.add(key(col, row));
  for (const fn of listeners) fn(current);
}

/** The room the player is currently in. */
export function getPlayerRoom(): RoomCoord {
  return current;
}

/** Keys (`col,row`) of every room the player has discovered this session. */
export function getVisitedRooms(): Set<string> {
  return new Set(visited);
}

/** Subscribe to room changes. Returns an unsubscribe function. */
export function onPlayerRoom(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
