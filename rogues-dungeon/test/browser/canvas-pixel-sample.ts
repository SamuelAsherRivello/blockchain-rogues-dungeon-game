import type { Page } from "@playwright/test";

/** Inspect the composited screenshot, including the actual WebGPU output. */
export async function sampleCanvasPixels(page: Page, png: Buffer) {
  return page.evaluate(async base64 => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let hash = 2166136261, activePuzzlePixels = 0, inactivePuzzlePixels = 0, nonBlackPixels = 0;
    for (let index = 0; index < pixels.length; index++) hash = Math.imul(hash ^ pixels[index], 16777619) >>> 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) > 24) nonBlackPixels++;
      if (pixels[index] === 203 && pixels[index + 1] === 143 && pixels[index + 2] === 224) activePuzzlePixels++;
      if (pixels[index] === 138 && pixels[index + 1] === 185 && pixels[index + 2] === 225) inactivePuzzlePixels++;
    }
    bitmap.close();
    return { hash, activePuzzlePixels, inactivePuzzlePixels, nonBlackPixels, width: canvas.width, height: canvas.height };
  }, png.toString("base64"));
}
