import type { Position } from "../../game/types.ts";

/** Renderer-neutral cell presentation inputs; neither field changes terrain geometry. */
export interface WorldVisibilityCell extends Position {
  discovered: boolean;
  light: number;
}

export function normalizeWorldLight(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function createWorldVisibilityCell(position: Position, discovered = false, light = 0): WorldVisibilityCell {
  return { ...position, discovered, light: normalizeWorldLight(light) };
}

export function worldVisibilityKey(position: Position) {
  return `${position.x},${position.y}`;
}

/** Split a unioned row at unknown cells so tactical shapes disclose no hidden bounds. */
export function knownWorldRowSpans<T extends Position & { width: number }>(spans: readonly T[], allowed: (position: Position) => boolean): T[] {
  return spans.flatMap((span) => {
    const result: T[] = [];
    let start: number | null = null;
    for (let x = span.x; x <= span.x + span.width; x++) {
      if (x < span.x + span.width && allowed({ x, y: span.y })) start ??= x;
      else if (start !== null) { result.push({ ...span, x: start, width: x - start }); start = null; }
    }
    return result;
  });
}
