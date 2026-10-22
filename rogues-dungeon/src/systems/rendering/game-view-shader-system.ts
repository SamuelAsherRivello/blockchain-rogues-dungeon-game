export type GameViewShaderId = 0 | 1;

export interface GameViewShader {
  readonly id: GameViewShaderId;
  readonly canvasClassName: string | null;
}

/** Selects the single visual shader applied to the primary Game View canvas. */
export class GameViewShaderSystem {
  private readonly shaders: readonly GameViewShader[] = [
    { id: 0, canvasClassName: null },
    { id: 1, canvasClassName: "world-view__canvas--green-monochrome" },
  ];

  normalize(id: number): GameViewShaderId {
    return this.shaders.some((shader) => shader.id === id) ? id as GameViewShaderId : 0;
  }

  next(id: GameViewShaderId): GameViewShaderId {
    return this.shaders[(this.shaders.findIndex((shader) => shader.id === id) + 1) % this.shaders.length].id;
  }

  canvasClassName(id: GameViewShaderId, minimap: boolean): string {
    const shader = this.shaders.find((candidate) => candidate.id === this.normalize(id));
    return !minimap && shader?.canvasClassName ? ` ${shader.canvasClassName}` : "";
  }
}

export const gameViewShaderSystem = new GameViewShaderSystem();
