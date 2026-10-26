import { useEffect, useState } from "react";
import type { Campaign } from "../types.ts";
import { discoveredCoverage } from "../../systems/procedural/world-procedural-system.ts";
import { BabylonWorld } from "../../systems/rendering/babylon-render-system.tsx";
import { Dialog, type DialogCenter } from "../../ui/dialog.tsx";
import { ScrollArea } from "../../ui/ScrollArea.tsx";
import { GameCard } from "../cards/game-card.tsx";

export type DeathRecapAction = "recover" | "menu";

export function DeathRecapWindow({ campaign, lines, center, onAction }: { campaign: Campaign; lines: readonly string[]; center: DialogCenter | null; onAction(action: DeathRecapAction): void }) {
  const actions: { id: DeathRecapAction; label: string }[] = campaign.mode === "classic"
    ? [{ id: "menu", label: "Return to Main Menu" }]
    : campaign.mode === "journey"
      ? [{ id: "recover", label: "Resume at Checkpoint" }, { id: "menu", label: "Return to Main Menu" }]
      : [{ id: "recover", label: "Restart Level" }, { id: "menu", label: "Return to Main Menu" }];
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); setSelected((value) => (value + actions.length - 1) % actions.length); }
      else if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); setSelected((value) => (value + 1) % actions.length); }
      else if (event.key === "Enter") { event.preventDefault(); onAction(actions[selected]!.id); }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [actions, onAction, selected]);
  const progress = campaign.progression.nextXp ? Math.round(campaign.progression.xp / campaign.progression.nextXp * 100) : 0;
  return <Dialog title="YOU DIED" onClose={() => {}} className="death-recap-window settings-window settings-window--game" center={center} dismissible={false} showCloseButton={false} footer={<div className="settings-window__actions death-recap-window__actions" role="group" aria-label="Death recovery actions">{actions.map((action, index) => <button key={action.id} type="button" aria-pressed={index === selected} onMouseEnter={() => setSelected(index)} onFocus={() => setSelected(index)} onClick={() => onAction(action.id)}>{action.label}</button>)}</div>}>
    <div className="death-recap-window__summary"><p>World {campaign.world === "One" ? 1 : campaign.world} · Level {campaign.floor.level}</p><p>{discoveredCoverage(campaign)}% map discovered · {progress}% to next XP level</p></div>
    <div className="death-recap-window__body">
      <GameCard title="Minimap" className="death-recap-window__panel death-recap-window__map"><div className="minimap-view-region"><BabylonWorld campaign={campaign} renderTestMode={1} minimap /></div></GameCard>
      <GameCard title="Log" className="death-recap-window__panel death-recap-window__log"><ScrollArea className="log_scroll">{lines.map((line, index) => <p key={`${index}:${line}`}>{line}</p>)}</ScrollArea></GameCard>
    </div>
  </Dialog>;
}
