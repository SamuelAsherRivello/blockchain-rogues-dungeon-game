import { useState } from "react";
import type { Preferences } from "../types.ts";
import { ConfirmationDialog } from "../../ui/confirmation-dialog.tsx";
import { Dialog, dialogBounds, type DialogBounds, type DialogCenter } from "../../ui/dialog.tsx";

export function SettingsWindow({ onClose, onOpenHowToPlay, onSaveAndQuit, onClearLocalStorage, preferences, setPreference, mutedByUrl, origin, helpOpen, bounds, center }: { onClose(): void; onOpenHowToPlay(bounds: DialogBounds): void; onSaveAndQuit(): void; onClearLocalStorage(): void; onFullscreen?(): void; fullscreenActual?: boolean; preferences: Preferences; setPreference(value: Partial<Preferences>): void; mutedByUrl: boolean; origin: "menu" | "game"; helpOpen: boolean; bounds?: DialogBounds | null; center?: DialogCenter | null }) {
  const [confirmingClearStorage, setConfirmingClearStorage] = useState(false);
  const openHowToPlay = (button: HTMLButtonElement) => {
    const dialog = button.closest<HTMLElement>(".settings-window")!;
    const bounds = dialogBounds(dialog);
    // Opening animation scales the visible rectangle, not the final layout width.
    if (origin === "game") bounds.width = Number.parseFloat(getComputedStyle(dialog).width);
    onOpenHowToPlay(bounds);
  };
  return <><Dialog title="Settings" onClose={onClose} className={`settings-window settings-window--${origin}`} bounds={bounds} center={center} menuMotion dismissible={!helpOpen}><div className="settings-window__actions"><div className="settings-window__audio"><label className="settings-window__slider"><span>SFX Volume <output>{preferences.sfxVolume}%</output></span><input tabIndex={-1} type="range" min="0" max="100" step="1" value={preferences.sfxVolume} aria-label="SFX volume" aria-valuetext={`${preferences.sfxVolume}%`} onChange={(event) => setPreference({ sfxVolume: Number(event.target.value) })} /></label><label className="settings-window__slider"><span>Music Volume <output>{preferences.musicVolume}%</output></span><input tabIndex={-1} type="range" min="0" max="100" step="1" value={preferences.musicVolume} aria-label="Music volume" aria-valuetext={`${preferences.musicVolume}%`} onChange={(event) => setPreference({ musicVolume: Number(event.target.value) })} /></label><label className="settings-window__mute"><input tabIndex={-1} type="checkbox" checked={preferences.muteAll || mutedByUrl} onChange={(event) => setPreference({ muteAll: event.target.checked })} /> Mute All</label></div><button tabIndex={-1} type="button" onClick={(event) => openHowToPlay(event.currentTarget)}>How To Play</button>{origin === "game" && <button tabIndex={-1} type="button" onClick={onSaveAndQuit}>Save &amp; Exit</button>}<a tabIndex={-1} href="https://github.com/SamuelAsherRivello/blockchain-rogues-dungeon-game" target="_blank" rel="noopener noreferrer">GitHub</a><button tabIndex={-1} className="settings-window__clear-storage" onClick={() => setConfirmingClearStorage(true)}>Clear Local Storage</button></div></Dialog>{confirmingClearStorage && <ConfirmationDialog title="Are you sure?" message="Clear all saved games and settings?" onConfirm={onClearLocalStorage} onCancel={() => setConfirmingClearStorage(false)} center={center} />}</>;
}
