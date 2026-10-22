export type RenderTestMode = 0 | 1 | 2 | 3;
export const DEFAULT_RENDER_TEST_MODE: RenderTestMode = 3;
export const RENDER_TEST_TOOLTIP = "Render Test: 0 both off; 1 fog only; 2 lighting only; 3 both on. Session only.";
export function normalizeRenderTestMode(value: unknown): RenderTestMode {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : DEFAULT_RENDER_TEST_MODE;
}
export function nextRenderTestMode(value: unknown): RenderTestMode { return ((normalizeRenderTestMode(value) + 1) % 4) as RenderTestMode; }
export function renderTestEffects(value: unknown = 3) {
  const mode = normalizeRenderTestMode(value);
  return { fog: Boolean(mode & 1), lighting: Boolean(mode & 2) };
}
export function effectiveRenderTestMode(value: unknown, canOverride: boolean): RenderTestMode {
  return canOverride ? normalizeRenderTestMode(value) : DEFAULT_RENDER_TEST_MODE;
}
