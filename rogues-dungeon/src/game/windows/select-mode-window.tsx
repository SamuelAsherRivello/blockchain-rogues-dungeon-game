import { useState } from "react";
import type { CampaignMode } from "../types.ts";
import { Dialog, type DialogBounds } from "../../ui/dialog.tsx";

const berlinTraits = [
  "ASCII",
  "Permadeath",
  "Combat",
  "Dungeon",
  "Explore/discover",
  "Grid movement",
  "Multiple tactics",
  "Non-modal",
  "One hero",
  "Random worlds",
  "Resources",
  "Shared rules",
  "Tactics",
  "Turns",
] as const;

type BerlinTrait = (typeof berlinTraits)[number];
type Mode = { id: CampaignMode; title: string; kicker?: string; description: string; berlin: ReadonlySet<BerlinTrait> };

const allTraitsExceptAscii = new Set<BerlinTrait>(berlinTraits.filter((trait) => trait !== "ASCII"));
const modes: readonly Mode[] = [
  { id: "journey", title: "Journey", kicker: "Easy", description: "... restart from last campfire with character attributes.", berlin: new Set([...allTraitsExceptAscii].filter((trait) => trait !== "Permadeath")) },
  { id: "adventure", title: "Adventure", kicker: "Default", description: "... restart the same level with character attributes.", berlin: new Set([...allTraitsExceptAscii].filter((trait) => trait !== "Permadeath")) },
  { id: "classic", title: "Classic", kicker: "Hard", description: "... permanently retire this saved game.", berlin: allTraitsExceptAscii },
];

export function SelectModeWindow({ bounds, onConfirm, onClose }: { bounds?: DialogBounds | null; onConfirm(mode: CampaignMode): void; onClose(): void }) {
  const [selected, setSelected] = useState<CampaignMode>("adventure");
  const mode = modes.find((item) => item.id === selected)!;
  return <Dialog title="Create Game" onClose={onClose} bounds={bounds} className="select-mode-window create-character-window create-character-window--menu" menuMotion dismissible={false} showCloseButton footer={<div className="create-character-window__actions select-mode-window__footer"><button type="button" onClick={() => onConfirm(selected)}>Confirm</button></div>}>
    <p className="body_text select-mode-window__intro">Player's death will ...</p>
    <div className="select-mode-window__cards" role="radiogroup" aria-label="Campaign mode">
      {modes.map((item) => <button key={item.id} type="button" role="radio" aria-checked={selected === item.id} className={selected === item.id ? "select-mode-window__card select-mode-window__card--selected" : "select-mode-window__card"} onClick={() => setSelected(item.id)}>
        <span className="select-mode-window__card-heading"><strong>{item.title}</strong>{item.kicker && <em>{item.kicker}</em>}</span>
        <span className="select-mode-window__card-description">{item.description}</span>
      </button>)}
    </div>
    <section className="select-mode-window__traits" aria-live="polite"><h3><a href="https://en.wikipedia.org/wiki/Roguelike#Berlin_Interpretation" target="_blank" rel="noreferrer">Roguelike Berlin Criteria</a></h3><ul>{berlinTraits.map((trait) => <li key={trait} data-matches={mode.berlin.has(trait)}><span aria-hidden="true">{mode.berlin.has(trait) ? "✓" : "×"}</span>{trait}</li>)}</ul></section>
  </Dialog>;
}
