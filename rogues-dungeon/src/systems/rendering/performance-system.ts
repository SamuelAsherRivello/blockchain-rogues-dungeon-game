export interface PerformanceOptions {
  enabled: boolean;
  local: boolean;
  animated: boolean;
  dynamic: boolean;
  minimap: "live" | "frozen" | "off";
  simulation: "live" | "frozen";
  enemyLogic: boolean;
}
const defaults: PerformanceOptions = { enabled: false, local: false, animated: true, dynamic: true, minimap: "live", simulation: "live", enemyLogic: true };
let options = { ...defaults };
const listeners = new Set<() => void>();
// The renderer never sees diagnostic overrides outside the opt-in Perf session.
export const performanceOptions = () => options.enabled ? options : defaults;
export function setPerformanceOptions(patch: Partial<PerformanceOptions>) {
  options = { ...options, ...patch };
  if (!options.enabled) options = { ...defaults };
  resetPerformanceMetrics(); listeners.forEach((listener) => listener());
}
export function resetPerformanceOptions() { setPerformanceOptions(defaults); }
export function subscribePerformance(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const counts: Record<string, number> = {};
const times: Record<string, { total: number; count: number; max: number }> = {};
let intervals: number[] = []; let lastFrame = 0;
export function countPerformance(name: string, count = 1) { if (options.enabled) counts[name] = (counts[name] ?? 0) + count; }
export function gaugePerformance(name: string, value: number) { if (options.enabled) counts[name] = value; }
export function timePerformance(name: string, duration: number) {
  if (!options.enabled) return;
  const entry = times[name] ??= { total: 0, count: 0, max: 0 };
  entry.total += duration; entry.count++; entry.max = Math.max(entry.max, duration);
}
export function measurePerformance<T>(name: string, work: () => T): T {
  if (!options.enabled) return work();
  const start = performance.now(); try { return work(); } finally { timePerformance(name, performance.now() - start); }
}
export function performanceFrame(time: number) {
  if (!options.enabled) return;
  if (lastFrame && time > lastFrame) { intervals.push(time - lastFrame); if (intervals.length > 2400) intervals.shift(); }
  lastFrame = time;
}
export function resetPerformanceMetrics() { intervals = []; lastFrame = 0; for (const key of Object.keys(counts)) delete counts[key]; for (const key of Object.keys(times)) delete times[key]; }
export function readPerformanceMetrics() {
  const sorted = [...intervals].sort((a, b) => a - b);
  return { frames: sorted.length, fps: intervals.length ? 1000 * intervals.length / intervals.reduce((a, b) => a + b, 0) : 0,
    median: sorted[Math.floor(sorted.length * .5)] ?? 0, p95: sorted[Math.floor(sorted.length * .95)] ?? 0,
    counts: { ...counts }, cpu: Object.fromEntries(Object.entries(times).map(([name, entry]) => [name, { mean: entry.total / entry.count, max: entry.max, count: entry.count }])) };
}
