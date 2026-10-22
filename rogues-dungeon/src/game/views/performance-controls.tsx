import { useEffect, useState, useSyncExternalStore } from "react";
import type { Campaign } from "../types.ts";
import { performanceOptions, readPerformanceMetrics, resetPerformanceMetrics, setPerformanceOptions, subscribePerformance } from "../../systems/rendering/performance-system.ts";

export function PerformanceControls({ campaign, exit, regenerate, enemyScenario, setEnemyLogic, error }: { campaign: Campaign; exit(): void; regenerate(size: number): void; enemyScenario(): void; setEnemyLogic(enabled: boolean): void; error: string }) {
  const options = useSyncExternalStore(subscribePerformance, performanceOptions);
  const [metrics, setMetrics] = useState(readPerformanceMetrics);
  useEffect(() => {
    if (!options.enabled) return;
    const timer = window.setInterval(() => setMetrics(readPerformanceMetrics()), 1000);
    return () => window.clearInterval(timer);
  }, [options.enabled]);
  if (!options.enabled) return null;
  return <section className="performance-controls" aria-label="Performance controls">
    <header className="performance-controls__summary">
      <output aria-live="off">{metrics.fps.toFixed(0)} FPS <span>median {metrics.median.toFixed(1)} ms · p95 {metrics.p95.toFixed(1)} ms</span></output>
      <p>Temporary session. Normal saves are unchanged.</p>
      <p>Seed {campaign.floor.seed} · {campaign.floor.width}×{campaign.floor.height} · {campaign.floor.entities.length} objects</p>
    </header>
    <div className="performance-controls__body">
      <fieldset><legend>Simulation</legend><div className="performance-controls__buttons">
        <button type="button" aria-pressed={!options.enemyLogic} onClick={() => setEnemyLogic(!options.enemyLogic)}>Enemy logic: {options.enemyLogic ? "Live" : "Off"}</button>
        <button type="button" aria-pressed={options.simulation === "frozen"} onClick={() => setPerformanceOptions({ simulation: options.simulation === "live" ? "frozen" : "live" })}>Simulation: {options.simulation}</button>
      </div></fieldset>
      <fieldset><legend>Rendering</legend><div className="performance-controls__buttons">
        <button type="button" aria-pressed={options.local} onClick={() => setPerformanceOptions({ local: !options.local })}>Draw: {options.local ? "20×20" : "Camera"}</button>
        <button type="button" aria-pressed={!options.animated} onClick={() => setPerformanceOptions({ animated: !options.animated })}>Animation: {options.animated ? "Full" : "Static"}</button>
        <button type="button" aria-pressed={!options.dynamic} onClick={() => setPerformanceOptions({ dynamic: !options.dynamic })}>Dynamic: {options.dynamic ? "On" : "Off"}</button>
        <button type="button" onClick={() => setPerformanceOptions({ minimap: options.minimap === "live" ? "frozen" : options.minimap === "frozen" ? "off" : "live" })}>Minimap: {options.minimap}</button>
      </div></fieldset>
      <fieldset><legend>Repeatable scenarios</legend><div className="performance-controls__buttons">
        <button type="button" disabled={Boolean(campaign.activePrefab)} onClick={() => regenerate(campaign.floor.width === 100 ? 50 : campaign.floor.width === 50 ? 200 : 100)}>World Size: {campaign.floor.width}×{campaign.floor.height}</button>
        <button type="button" disabled={Boolean(campaign.activePrefab)} onClick={enemyScenario}>Enemy test: 50×50 / 8</button>
        <button type="button" onClick={() => regenerate(campaign.floor.width)}>Restart route</button>
        <button type="button" onClick={() => { resetPerformanceMetrics(); setMetrics(readPerformanceMetrics()); }}>Reset sample</button>
      </div></fieldset>
      {campaign.activePrefab && <p className="performance-controls__hint">Leave the authored interior to regenerate.</p>}
      {options.simulation === "frozen" && <p className="performance-controls__hint">Time is paused. Movement only; interactions are disabled.</p>}
      {!options.enemyLogic && <p className="performance-controls__hint">Enemies stay visible but do not think, move or attack. World time and player actions remain live.</p>}
      {campaign.floor.entities.some(entity => entity.id.startsWith("perf-enemy-")) && <p className="performance-controls__hint">Eight nearby pursuers, boosted Health and Perception. Click Enemy test again to reset.</p>}
      <details><summary>Work counters and CPU milliseconds</summary><pre>{JSON.stringify(metrics, null, 2)}</pre></details>
      {error && <p role="alert">{error}</p>}
    </div>
    <footer className="performance-controls__footer"><p>C moves or collapses this column.</p><button type="button" onClick={exit}>Exit Perf</button></footer>
  </section>;
}
