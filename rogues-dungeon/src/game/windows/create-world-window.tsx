import type { Campaign, WorldAttributes } from '../types.ts';
import { Dialog, type DialogBounds } from '../../ui/Dialog.tsx';
import { AttributePanel } from '../panels/attribute-panel.tsx';
import { GameCard } from '../cards/game-card.tsx';
import { BabylonWorld } from '../../systems/rendering/babylon-render-system.tsx';
import { useAttributeRoll } from './use-attribute-roll.ts';
import { worldAttributeHelp, worldAttributeLabels, worldAttributeNames } from '../../systems/procedural/world-attributes.ts';

const identityNames = ['world', 'level', 'run', 'slot', 'seed'] as const;
export interface WorldIdentity { world: number; level: number; run: number; slot: number; seed: number }
export function CreateWorldWindow({ attributes, preview, identity, bounds, onRoll, onRandomize, onConfirm, onClose }: {
  attributes: WorldAttributes | null; preview: Campaign | null; identity: WorldIdentity; bounds?: DialogBounds | null;
  onRoll(): void; onRandomize(): void; onConfirm(): void; onClose(): void;
}) {
  const { roll, cosmetic, randomizing } = useAttributeRoll(worldAttributeNames, 0, 5, onRoll, onRandomize);
  const empty = Object.fromEntries(worldAttributeNames.map(n => [n, 0])) as WorldAttributes;
  return <Dialog title="Create World" onClose={onClose} bounds={bounds} className="create-character-window create-world-window create-character-window--menu" menuMotion dismissible={false} showCloseButton>
    <div className="create-character-window__content">
      <div className="create-character-window__attributes"><GameCard title="World Attributes" panelPopup={randomizing ? { title: 'Randomizing ...' } : undefined}><AttributePanel attributes={cosmetic ?? attributes ?? empty} names={worldAttributeNames} labels={worldAttributeLabels} help={worldAttributeHelp} /></GameCard></div>
      <div className="create-character-window__attributes"><GameCard title="Generation Identity"><AttributePanel attributes={identity} names={identityNames} labels={{ world: 'World', level: 'Level', run: 'Run', slot: 'Slot', seed: 'Seed' }} help={{ seed: 'Base world seed. Reproducing a custom world also requires its saved attributes, difficulty, and generation rules.', level: 'Starting dungeon level. Character level is separate.', slot: 'The Saved Game selected on the menu.', run: 'A new run after death advances this number.', world: 'The world containing this dungeon.' }} /></GameCard></div>
      <div className="create-world-window__preview" aria-label="World minimap preview">{preview ? <BabylonWorld campaign={preview} minimap zoom={.14} /> : <p className="body_text">Roll to preview your world.</p>}</div>
      <p className="body_text create-world-window__hint">Roll 30 points across your world attributes. Each roll shapes a different adventure.</p>
    </div>
    <div className="create-character-window__actions"><button type="button" disabled={randomizing} onClick={roll}>Roll</button><button type="button" disabled={!attributes || !preview || randomizing} onClick={onConfirm}>Confirm</button></div>
  </Dialog>;
}
