import type { Direction, Position } from "./types.ts";

/** Sends movement attempts to prompts before the world handles the move. */
export class MovementPromptController {
  private readonly handlers = new Set<(direction: Direction) => boolean>();

  subscribe(handler: (direction: Direction) => boolean) {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  respondToMove(direction: Direction) {
    let consumed = false;
    for (const handler of [...this.handlers]) consumed = handler(direction) || consumed;
    return consumed;
  }
}

export function movementDirection(from: Position, to: Position): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (!dx && !dy) return null;
  return Math.abs(dx) >= Math.abs(dy) ? dx > 0 ? "e" : "w" : dy > 0 ? "s" : "n";
}
