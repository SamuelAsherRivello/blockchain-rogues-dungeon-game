import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { TabControl } from "../../ui/TabControl.tsx";
import { dismissTooltips, Tooltip } from "../../ui/Tooltip.tsx";

export type PanelPopup = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?(): void;
};

export type GameCardFocus = {
  focused?: boolean;
  onTitleClick?(): void;
  onCollapse?(): void;
};

const cardHelp: Partial<Record<string, string>> = {
  Minimap: "Shows explored map and your position.",
  Quest: "Your current objective.",
  Log: "Recent dungeon and combat events.",
  Status: "Tracks Health, Stamina, Mana, and XP.",
  Attributes: "Character stats and current values.",
  Abilities: "Assigned abilities; each costs Mana.",
  Equipment: "Equipped items change your attributes.",
  Inventory: "Carried items; drag gear to equipment to equip it.",
};

export function GameCard({ title, children, className = "", showTab = false, tabOffsetY = "0px", tabExpanded, onTabClick, tabAriaLabel, contentHidden = false, panelPopup, shineToken, titleTooltip, focused = false, onTitleClick, onCollapse }: {
  title: string;
  children: ReactNode;
  className?: string;
  showTab?: boolean;
  tabOffsetY?: string;
  tabExpanded?: boolean;
  onTabClick?(): void;
  tabAriaLabel?: string;
  contentHidden?: boolean;
  panelPopup?: PanelPopup;
  shineToken?: number;
  titleTooltip?: ReactNode;
  focused?: boolean;
  onTitleClick?(): void;
  onCollapse?(): void;
}) {
  const key = title.startsWith("Inventory") ? "Inventory" : title;
  const handleTitleClick = onTitleClick ? () => { dismissTooltips(); onTitleClick(); } : undefined;
  const titleTrigger = <Tooltip content={titleTooltip ?? cardHelp[key] ?? title}><button tabIndex={onTitleClick ? 0 : -1} type="button" onClick={handleTitleClick} className="game-card__title-trigger">{title}</button></Tooltip>;
  const cardContent = <><h2>{titleTrigger}</h2>{children}</>;
  const centeredCard = focused && typeof document !== "undefined" ? document.querySelector<HTMLElement>(".world-view-region") : null;
  const centered = focused && centeredCard ? createPortal(<section className={`game-card game-card--centered ${className}`} aria-label={`${key} centered view`}>
    <h2><button type="button" className="game-card__title-trigger" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onCollapse?.(); }} onPointerUp={(event) => { event.preventDefault(); event.stopPropagation(); onCollapse?.(); }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); onCollapse?.(); }} onMouseUp={(event) => { event.preventDefault(); event.stopPropagation(); onCollapse?.(); }} onClick={onCollapse}>{title}</button></h2>
    <div>{children}</div>
  </section>, centeredCard) : null;
  return <>
    <section key={shineToken} className={`game-card ${shineToken ? "game-card--shine" : ""} ${className}`}>
    {showTab && onTabClick && <div className="game-card__tab-placement" style={{ top: tabOffsetY }}><TabControl ariaLabel={tabAriaLabel} expanded={tabExpanded} onClick={onTabClick} /></div>}
    <div aria-hidden={contentHidden || undefined}>{cardContent}</div>
    {focused && <section className="panel-popup panel-popup--collapse" aria-label={`${key} panel controls`}><div className="panel-popup__content"><button type="button" onClick={onCollapse}>Back</button></div></section>}
    {!focused && panelPopup && <section className="panel-popup" aria-labelledby={`${key.toLowerCase().replaceAll(" ", "-")}-panel-popup-title`}><div className="panel-popup__content"><h3 id={`${key.toLowerCase().replaceAll(" ", "-")}-panel-popup-title`}>{panelPopup.title}</h3>{panelPopup.body && <p>{panelPopup.body}</p>}{panelPopup.actionLabel && <button type="button" onClick={panelPopup.onAction}>{panelPopup.actionLabel}</button>}</div></section>}
    </section>
    {centered}
  </>;
}
