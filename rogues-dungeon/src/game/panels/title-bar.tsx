import type { SyntheticEvent } from "react";
import type { Campaign, Preferences } from "../types.ts";
import { gameZoomPresets } from "../../content/world/zoom.ts";
import { Tooltip } from "../../ui/Tooltip.tsx";

const itemArtBase = `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/items/`;

const cameraHelp = {
  center: "Center: Keeps the player centered.",
  deadzone: "Deadzone: Follows near view edges.",
  screen: "Screen: Follows across screen zones.",
};

export function TitleBar({ campaign, visibleCounters, preferences, setPreference, onFullscreen, onSettings, fullscreenActual }: {
  campaign: Campaign;
  visibleCounters?: Campaign["counters"];
  preferences: Preferences;
  setPreference(value: Partial<Preferences>): void;
  onFullscreen(): void;
  onSettings(): void;
  fullscreenActual: boolean;
}) {
  const counters = visibleCounters ?? campaign.counters;
  const selectPreference = (event: SyntheticEvent<HTMLElement>, preference: Partial<Preferences>) => {
    setPreference(preference);
    event.currentTarget.blur();
  };
  return <header className="title-bar">
    <div className="title-bar__left">
      <span className="title-bar__identity">Rogue's Dungeon</span>
      <span className="title-bar__progress">
        <Tooltip content="Current world." placement="below"><span>World: {campaign.world === "One" ? 1 : campaign.world}</span></Tooltip>
        <Tooltip content="Current dungeon level." placement="below"><span>Level: {campaign.floor.level ?? campaign.floor.depth ?? 1}</span></Tooltip>
      </span>
      <span className="title-bar__counters">
        <Tooltip content="Time advances 1 per tick." placement="below"><span className="title-bar__counter"><span className="title-bar__icon title-bar__icon--time" role="img" aria-label="Time">⏱️</span><span className="title-bar__counter-value">{String(campaign.floor.time).padStart(2, "0")}</span></span></Tooltip>
        <Tooltip content="Gold pays for goods." placement="below"><span className="title-bar__counter" data-ui-counter="gold"><span className="title-bar__icon title-bar__icon--gold" data-ui-counter-icon="gold" role="img" aria-label="Gold"><img className="title-bar__icon-image" src={`${itemArtBase}animated/frames/gold-coin/00.png`} alt="" /></span><span className="title-bar__counter-value">{counters.gold}</span></span></Tooltip>
        <Tooltip content="Keys open doors." placement="below"><span className="title-bar__counter" data-ui-counter="key"><span className="title-bar__icon title-bar__icon--keys" data-ui-counter-icon="key" role="img" aria-label="Keys"><img className="title-bar__icon-image" src={`${itemArtBase}static/golden-key.png`} alt="" /></span><span className="title-bar__counter-value">{String(counters.keys).padStart(2, "0")}</span></span></Tooltip>
      </span>
    </div>
    <div className="title-bar__right">
      <Tooltip content="Zoom to change the game view." placement="below"><label className="title-bar__utility title-bar__select-utility" aria-label="Zoom"><span className="title-bar__icon title-bar__icon--zoom" aria-hidden="true">⌕</span><select tabIndex={-1} value={preferences.zoom} onChange={(event) => selectPreference(event, { zoom: Number(event.target.value) })}>{gameZoomPresets.map((value) => <option key={value} value={value}>{value}x</option>)}</select></label></Tooltip>
      <Tooltip content={cameraHelp[preferences.camera] ?? cameraHelp.center} placement="below"><label className="title-bar__utility title-bar__select-utility" aria-label="Camera"><span className="title-bar__icon title-bar__icon--camera" aria-hidden="true">▣</span><select tabIndex={-1} value={preferences.camera} onChange={(event) => selectPreference(event, { camera: event.target.value as Preferences["camera"] })}><option value="center">Center</option><option value="deadzone">Deadzone</option><option value="screen">Screen</option></select></label></Tooltip>
      <Tooltip content={<span className="movement-mode-help">Grid-snap moves instantly. Grid-tween animates steps. Gridless stops on whole pixels. Battle limits each press to one cell and temporarily uses Grid-tween for Gridless.</span>} placement="below"><label className="title-bar__utility title-bar__select-utility" aria-label="Movement"><svg className="title-bar__icon title-bar__icon--movement" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="14" cy="3.5" r="2.5" /><path d="m10 7 4-1 3 5 4 2-1 2-5-2-2-3-1 5 5 6-2 2-6-7-1-4-2 3-4 1-1-2 4-2 3-5Zm-2 9 3 3-4 5-2-2Z" /></svg><select tabIndex={-1} aria-label="Movement mode" value={preferences.movementMode} onChange={(event) => selectPreference(event, { movementMode: event.target.value as Preferences["movementMode"] })}><option value="grid-snap">Grid-snap</option><option value="grid-tween">Grid-tween</option><option value="gridless">Gridless</option></select></label></Tooltip>
      <Tooltip content="Enter or leave fullscreen." placement="below"><button tabIndex={-1} className="title-bar__utility" aria-label="Fullscreen" aria-pressed={fullscreenActual} onClick={onFullscreen}><span className="title-bar__icon title-bar__icon--fullscreen" aria-hidden="true">⛶</span></button></Tooltip>
      <Tooltip content="Adjust sound and return to menu." placement="below"><button tabIndex={-1} className="title-bar__utility" aria-label="Settings" onClick={onSettings}><span className="title-bar__icon title-bar__icon--settings" aria-hidden="true">⚙</span></button></Tooltip>
    </div>
  </header>;
}
