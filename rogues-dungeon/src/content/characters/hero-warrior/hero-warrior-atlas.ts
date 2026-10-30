import type { SpriteFrame } from "../../../systems/animation/sprite-animation-system.ts";

/** Decode a PNG animation frame into pixels for Babylon Lite's GPU sprite atlas. */
export async function loadSpriteAtlasFrame(path: string) {
  const response = await fetch(path); if (!response.ok) throw new Error(`Could not load sprite frame: ${path}`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
  const context = canvas.getContext("2d")!; context.drawImage(bitmap, 0, 0); bitmap.close();
  return { pixels: new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data), width: canvas.width, height: canvas.height, name: path };
}

export const loadHeroWarriorAtlasFrame = loadSpriteAtlasFrame;

export function heroWarriorAtlasFrameKey(frame: SpriteFrame) {
  return frame.sheetFrame === undefined ? frame.path : `${frame.path}#${frame.sheetFrame}`;
}

export function heroWarriorFrameSourceRect(frame: SpriteFrame, imageWidth: number, imageHeight: number): readonly [number, number, number, number] {
  const { widthPx: width, heightPx: height, sheetFrame } = frame;
  if (sheetFrame === undefined) {
    if (imageWidth !== width || imageHeight !== height) throw new Error(`Invalid Hero Warrior frame dimensions: ${frame.path}`);
    return [0, 0, width, height];
  }
  const columns = imageWidth / width, rows = imageHeight / height;
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || !Number.isInteger(sheetFrame) || sheetFrame < 0 || sheetFrame >= columns * rows) throw new Error(`Invalid Hero Warrior sheet frame: ${frame.path}#${sheetFrame}`);
  return [(sheetFrame % columns) * width, Math.floor(sheetFrame / columns) * height, width, height];
}

/** Decode each source image once, crop native cells, and close every bitmap. */
export async function loadHeroWarriorAtlasFrames(frames: readonly SpriteFrame[]) {
  const paths = [...new Set(frames.map((frame) => frame.path))];
  const sources = await Promise.allSettled(paths.map(async (path) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load sprite frame: ${path}`);
    return createImageBitmap(await response.blob());
  }));
  const bitmaps = new Map<string, ImageBitmap>();
  sources.forEach((source, index) => { if (source.status === "fulfilled") bitmaps.set(paths[index]!, source.value); });
  try {
    const failure = sources.find((source) => source.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    return frames.map((frame) => {
      const bitmap = bitmaps.get(frame.path)!;
      const [x, y, width, height] = heroWarriorFrameSourceRect(frame, bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error(`Could not decode Hero Warrior frame: ${frame.path}`);
      context.imageSmoothingEnabled = false;
      context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
      return { pixels: new Uint8Array(context.getImageData(0, 0, width, height).data), width, height, name: heroWarriorAtlasFrameKey(frame) };
    });
  } finally {
    bitmaps.forEach((bitmap) => bitmap.close());
  }
}
