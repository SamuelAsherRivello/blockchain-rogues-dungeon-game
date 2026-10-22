export const gameZoomPresets = Object.freeze([0.25, 0.5, 1, 2, 4]);
export const defaultGameZoomPresets = Object.freeze([1, 2]);
export function availableGameZoomPresets(zoomTest = false) { return zoomTest ? gameZoomPresets : defaultGameZoomPresets; }
export function getTileCssSize(zoom = 1, tileSize = 32) { return tileSize * (gameZoomPresets.includes(zoom) ? zoom : 1); }

/** Keep cutscene bars close to one source row while rounding their height to whole grid rows. */
export function getCutsceneBarHeightPx(zoom = 1, tileSize = 32) {
  const normalizedZoom = gameZoomPresets.includes(zoom) ? zoom : 1;
  const rows = normalizedZoom >= 4 ? 1 : normalizedZoom >= 2 ? 2 : Math.max(1, Math.round(2 / normalizedZoom));
  return rows * getTileCssSize(normalizedZoom, tileSize);
}

/** Convert the sprite view's backing-pixel scale into the matching CSS-pixel tile size. */
export function getRenderedTileCssSize({ zoom = 1, tileSize = 32, devicePixelRatio = 1, backingPixelsPerCssPixel = devicePixelRatio }: { zoom?: number; tileSize?: number; devicePixelRatio?: number; backingPixelsPerCssPixel?: number } = {}) {
  const viewScale = getTileCssSize(zoom, 1) * (Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1);
  const backingScale = Number.isFinite(backingPixelsPerCssPixel) && backingPixelsPerCssPixel > 0 ? backingPixelsPerCssPixel : 1;
  return tileSize * viewScale / backingScale;
}
