import type { WorldGrowthEvent } from '../types.ts';
import { Dialog, type DialogCenter } from '../../ui/Dialog.tsx';
import { AttributePanel } from '../panels/attribute-panel.tsx';
import { GameCard } from '../cards/game-card.tsx';
import { worldAttributeHelp, worldAttributeLabels, worldAttributeNames } from '../../systems/procedural/world-attributes.ts';

export function WorldProgressionWindow({ event, center, onContinue }: { event: WorldGrowthEvent; center?: DialogCenter | null; onContinue(): void }) {
  if (!event.before || !event.after) return null;
  const changed = worldAttributeNames.filter(n => event.after![n] !== event.before![n]);
  return <Dialog title="Level Up — World" onClose={onContinue} center={center} className="progression-window world-progression-window">
    <p className="progression-window__points body_text">Your world grows with character level {event.level}.</p>
    <div className="progression-window__attributes"><GameCard title="World Attributes"><AttributePanel attributes={event.before} preview={event.after} names={worldAttributeNames} labels={worldAttributeLabels} help={worldAttributeHelp} /></GameCard></div>
    <p className="progression-window__results-heading body_text">Earned Results</p>
    <ul className="progression-window__results" aria-label="Earned world results">{changed.map(name => <li className="body_text" key={name}>{worldAttributeLabels[name]} +{event.after![name] - event.before![name]}. {worldAttributeHelp[name]}</li>)}{Boolean(event.unused) && <li className="body_text">All world attributes are at 99. {event.unused} points unused.</li>}</ul>
    <div className="progression-window__actions"><button type="button" onClick={onContinue}>Continue</button></div>
  </Dialog>;
}
