import type { Direction, Position } from "./types.ts";

export function rightStickPromptResponse(direction: Direction, affirmation?: { direction: Direction; disabled?: boolean; confirming?: boolean }) {
  if (!affirmation || direction !== affirmation.direction) return "cancel";
  return affirmation.disabled || affirmation.confirming ? "blocked" : "confirm";
}

/** Sends movement attempts to prompts before the world handles the move. */
export class MovementPromptController {
  private readonly handlers = new Set<(direction: Direction) => boolean>();
  private readonly rightStickHandlers = new Set<(direction: Direction) => void>();
  revision = 0;

  get hasRightStickPrompt() { return this.rightStickHandlers.size > 0; }

  subscribeRightStick(handler: (direction: Direction) => void) {
    this.rightStickHandlers.add(handler); this.revision++;
    return () => { if (this.rightStickHandlers.delete(handler)) this.revision++; };
  }

  respondToRightStick(direction: Direction) {
    const handler = [...this.rightStickHandlers].at(-1);
    if (!handler) return false;
    handler(direction);
    return true;
  }

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
