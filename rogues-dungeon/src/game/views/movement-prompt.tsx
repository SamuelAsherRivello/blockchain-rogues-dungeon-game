import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import type { Direction } from "../types.ts";
import type { MovementPromptController } from "../movement-prompt-controller.ts";
import { GameCard } from "../cards/game-card.tsx";

export interface MovementPromptProps {
  movement: MovementPromptController;
  title: string;
  heading: string;
  body: ReactNode;
  affirmation?: {
    direction: Direction;
    label: string;
    disabled?: boolean;
    confirming?: boolean;
    onAffirm(): void;
  };
  negationLabel?: string;
  negationHint?: string;
  onNegate(): void;
  visible?: boolean;
  centered?: boolean;
  panelRef?: Ref<HTMLElement>;
  style?: CSSProperties;
}

/** The affirmation direction consumes the move; every other direction cancels. */
export function MovementPrompt({ movement, title, heading, body, affirmation, negationLabel = "Close", negationHint = "(walk to cancel)", onNegate, visible = true, centered = false, panelRef, style }: MovementPromptProps) {
  const resolved = useRef(false);
  const affirm = () => {
    if (!affirmation || affirmation.disabled || affirmation.confirming || resolved.current) return;
    resolved.current = true;
    affirmation.onAffirm();
  };
  const negate = () => {
    if (resolved.current) return;
    resolved.current = true;
    onNegate();
  };
  useLayoutEffect(() => movement.subscribe((direction) => {
    if (affirmation && direction === affirmation.direction) {
      affirm();
      return true;
    }
    negate();
    return false;
  }), [movement, affirmation, onNegate]);

  return <section ref={panelRef} className={`movement-prompt item-comparison-panel${centered ? " movement-prompt--centered" : ""}`} aria-label={title} aria-live="polite" style={{ ...style, visibility: visible ? "visible" : "hidden" }} onMouseDown={(event) => event.stopPropagation()} onMouseUp={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
    <GameCard title={title} className="movement-prompt__panel">
      <h3>{heading}</h3>
      <p className="movement-prompt__body">{body}</p>
      <button type="button" className={`movement-prompt__action${affirmation?.confirming ? " movement-prompt__action--confirming" : ""}`} disabled={affirmation?.disabled || affirmation?.confirming} onClick={affirmation ? affirm : negate}>
        {affirmation?.label ?? negationLabel}<br /><i>{negationHint}</i>
      </button>
    </GameCard>
  </section>;
}
