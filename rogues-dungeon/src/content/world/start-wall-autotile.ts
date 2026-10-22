import type { Room, TerrainCell } from "../../game/types.ts";

export interface StartRoomDecoration { id: string; x: number; y: number; frame: number }

// Verified live in Tiled 1.12.2 against the vendor reference maps on 2026-10-25.
// wall_combinations02.tmx, Walls: (2,1)/(3,1)/(4,1) = NW/N/NE 0/1/5;
// (2,2)/(4,2) = W/E 12/17; (2,3)/(4,3) = SW/SE doorway ends 48/53;
// its walkable doorway at (3,3) has no wall; south face 49 occurs at (11,4).
// dungeon_example.tmx confirms these room faces/corners and separate inner joins.
// wall_combinations01.tmx's (2..4,2..4) is the obstacle motif 6/7/8,
// 18/19/20,30/31/32. Its opaque void-center 19 never belongs on this room ring.
const perimeterFrames = Object.freeze({
  northwest: 0, north: 1, northeast: 5,
  west: 12, east: 17,
  southwest: 48, south: 49, southeast: 53,
});

function blocked(cells: TerrainCell[][], x: number, y: number) { return cells[y]?.[x]?.walkable === false; }

/** Builds only the one-cell exterior ring of a recorded start room. */
export function planStartRoomDecoration(cells: TerrainCell[][], room: Room | undefined): StartRoomDecoration[] {
  if (!room || room.w < 1 || room.h < 1) return [];
  const candidates = [
    { x: room.x - 1, y: room.y - 1, frame: perimeterFrames.northwest },
    ...Array.from({ length: room.w }, (_, offset) => ({ x: room.x + offset, y: room.y - 1, frame: perimeterFrames.north })),
    { x: room.x + room.w, y: room.y - 1, frame: perimeterFrames.northeast },
    ...Array.from({ length: room.h }, (_, offset) => ({ x: room.x - 1, y: room.y + offset, frame: perimeterFrames.west })),
    ...Array.from({ length: room.h }, (_, offset) => ({ x: room.x + room.w, y: room.y + offset, frame: perimeterFrames.east })),
    { x: room.x - 1, y: room.y + room.h, frame: perimeterFrames.southwest },
    ...Array.from({ length: room.w }, (_, offset) => ({ x: room.x + offset, y: room.y + room.h, frame: perimeterFrames.south })),
    { x: room.x + room.w, y: room.y + room.h, frame: perimeterFrames.southeast },
  ];
  return candidates.filter(({ x, y }) => blocked(cells, x, y)).map(({ x, y, frame }) => ({ id: `start-room-wall-${x}-${y}`, x, y, frame }));
}
