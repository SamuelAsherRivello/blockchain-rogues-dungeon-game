import type { Position } from "../../game/types.ts";
import type { WorldRender } from "./world-render-system.ts";

type World = ReturnType<typeof WorldRender.Render>;

export function minimapBackgroundRevision(world: World, discovery: string) {
  return JSON.stringify([discovery, world.objects.map(object => [object.id, object.kind, object.x, object.y, object.opened])]);
}

export function minimapMarkerEntries(world: World, player: Position, detected: ReadonlySet<string>, positionOf: (id: string, fallback: Position) => Position, allowed: (position: Position) => boolean = () => true) {
  return [
    { position: player, frame: 0 },
    ...world.actors.filter(actor => detected.has(actor.id)).map(actor => ({ position: positionOf(actor.id, actor), frame: 1 })),
    ...world.puzzleObjects.map(object => ({ position: object.kind === "barrel" ? positionOf(object.id, object) : object, frame: object.active ? 5 : 4 })),
  ].filter((entry) => allowed(entry.position));
}
