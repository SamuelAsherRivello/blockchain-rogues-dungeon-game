import { useAttributeRoll } from './use-attribute-roll.ts';
import type { Attributes } from "../types.ts";
import { progressionStatNames } from "../../systems/procedural/world-procedural-system.ts";
import { Dialog, type DialogBounds } from "../../ui/Dialog.tsx";
import { AttributesCard } from "../panels/attribute-panel.tsx";
import { ImageTextRow } from "./image-text-row.tsx";

export function CreateCharacterWindow({ attributes, bounds, onRoll, onRandomize, onConfirm, onClose }: { attributes: Attributes | null; bounds?: DialogBounds | null; onRoll(): void; onRandomize(): void; onConfirm(): void; onClose(): void }) {
  const emptyAttributes = Object.fromEntries(progressionStatNames.map((name) => [name, 0])) as Attributes;
  const idleFramePath = (frame: number) => `${import.meta.env.BASE_URL}assets/art/game-view/characters/hero-warrior/frames/idle/down/${String(frame).padStart(2, "0")}.png`;
  const { roll, randomizing, cosmetic: cosmeticAttributes } = useAttributeRoll(progressionStatNames, 1, 5, onRoll, onRandomize);
  const displayedAttributes = cosmeticAttributes ?? attributes ?? emptyAttributes;
  const asset = (path: string) => `${import.meta.env.BASE_URL}assets/art/${path}`;
  return <Dialog title="Create Character" onClose={onClose} className="create-character-window create-character-window--menu" bounds={bounds} menuMotion dismissible={false} showCloseButton><div className="create-character-window__content"><div className="create-character-window__attributes"><AttributesCard attributes={displayedAttributes} titleTooltip="Character Attributes and Current Values." panelPopup={randomizing ? { title: "Randomizing ..." } : undefined} /></div><div className="create-character-window__details-list"><ImageTextRow className="create-character-window__details" image={<div className="create-character-window__hero" role="img" aria-label="Idle dungeon hero"><img src={idleFramePath(0)} alt="" /></div>}><p className="body_text">(Re)roll to randomize 30 points across your character attributes.</p></ImageTextRow><ImageTextRow className="create-character-window__details" imagePosition="right" image={<img className="create-character-window__illustration" src={asset("game-view/enemies/slime-blue/frames/idle/idle00.png")} alt="Idle slime enemy" />}><p className="body_text">Earn experience through actions and combat.</p></ImageTextRow><ImageTextRow className="create-character-window__details" image={<span className="create-character-window__attribute-points" role="img" aria-label="attribute points reward"><span aria-hidden="true">✦</span><b aria-hidden="true">+</b></span>}><p className="body_text">Level up to spend attribute points.</p></ImageTextRow></div></div><div className="create-character-window__actions"><button type="button" disabled={randomizing} onClick={roll}>Roll</button><button type="button" disabled={!attributes || randomizing} onClick={onConfirm}>Confirm</button></div></Dialog>;
}
