export type Orientation = "landscape" | "portrait";
export interface Layout { orientation: Orientation; width: number; height: number; minAspectRatio?: number; maxAspectRatio?: number; label?: string; gutterBackground?: string }
// Layout dimensions are CSS pixels; renderer resolution and DPR belong to a future integration.
export const aspectRatioPresets = Object.freeze({
  landscape: Object.freeze({ width: 16, height: 9, minAspectRatio: 16 / 10, maxAspectRatio: 16 / 9, label: "16:10–16:9" }),
  portrait: Object.freeze({ width: 9, height: 16, minAspectRatio: 9 / 16, maxAspectRatio: 10 / 16, label: "9:16–10:16" }),
});

export const defaultLayout: Readonly<Layout> = Object.freeze({
  orientation: "landscape",
  ...aspectRatioPresets.landscape,
});

const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;
export function classifyPlatform({ userAgentDataMobile, userAgent = "", maxTouchPoints = 0, coarsePointer = false, viewportWidth = Infinity, viewportHeight = Infinity }: { userAgentDataMobile?: boolean; userAgent?: string; maxTouchPoints?: number; coarsePointer?: boolean; viewportWidth?: number; viewportHeight?: number } = {}) {
  const touchViewport = (maxTouchPoints > 0 || coarsePointer) && Math.min(viewportWidth, viewportHeight) <= 900;
  const desktopIpad = /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
  if (userAgentDataMobile === true || mobileUserAgent.test(userAgent) || touchViewport || desktopIpad) return "mobile";
  return "pc";
}
export function layoutForPlatform(platform: string, developerAspect: Orientation | null = null) {
  const orientation = platform === "mobile" ? "portrait" : developerAspect === "portrait" ? "portrait" : "landscape";
  return Object.freeze({ orientation, ...aspectRatioPresets[orientation] });
}

export function validateLayout(layout: Layout) {
  const { width, height, orientation } = layout;
  if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Viewport width and height must be finite positive numbers; for example, 16 and 9.");
  }
  const fixedAspectRatio = width / height;
  const minAspectRatio = layout.minAspectRatio ?? fixedAspectRatio;
  const maxAspectRatio = layout.maxAspectRatio ?? fixedAspectRatio;
  if (![fixedAspectRatio, minAspectRatio, maxAspectRatio].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Viewport aspect ratios must be finite positive numbers.");
  }
  if (minAspectRatio > maxAspectRatio) {
    throw new Error("Viewport minimum aspect ratio must not exceed its maximum aspect ratio.");
  }
  const matchesOrientation = orientation === "landscape" ? minAspectRatio > 1 : maxAspectRatio < 1;
  if (!matchesOrientation) {
    throw new Error("Rogue's Dungeon layout aspect bounds must match its named orientation.");
  }
  return layout;
}

export function fitViewport(surfaceWidth: number, surfaceHeight: number, layout: Layout) {
  validateLayout(layout);
  if (![surfaceWidth, surfaceHeight].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("Browser surface dimensions must be finite nonnegative CSS pixel values.");
  }
  const fixedAspectRatio = layout.width / layout.height;
  const minAspectRatio = layout.minAspectRatio ?? fixedAspectRatio;
  const maxAspectRatio = layout.maxAspectRatio ?? fixedAspectRatio;
  const surfaceAspectRatio = surfaceHeight > 0 ? surfaceWidth / surfaceHeight : fixedAspectRatio;
  const ratio = Math.min(maxAspectRatio, Math.max(minAspectRatio, surfaceAspectRatio));
  const width = Math.min(surfaceWidth, surfaceHeight * ratio);
  const height = width / ratio;
  return { width, height, x: (surfaceWidth - width) / 2, y: (surfaceHeight - height) / 2 };
}
