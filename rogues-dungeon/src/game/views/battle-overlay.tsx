import { useEffect, useId, useRef, useState } from "react";
import type { Position } from "../types.ts";
import { tacticalRowSpans, type TacticalRectangle } from "../tactical-area.ts";

export function BattleIndicator({ active, visible = true }: { active: boolean; visible?: boolean }) {
  const [phase, setPhase] = useState<"hidden" | "entry" | "settled" | "exit">("hidden");
  const presented = useRef(false);
  useEffect(() => {
    if (!active) {
      presented.current = false;
      setPhase((current) => current === "hidden" ? "hidden" : "exit");
    } else if (visible && !presented.current) {
      presented.current = true;
      setPhase("entry");
    }
  }, [active, visible]);
  useEffect(() => {
    if (phase !== "entry" && phase !== "exit") return;
    const timer = setTimeout(() => setPhase(phase === "entry" ? "settled" : "hidden"), phase === "entry" ? 3350 : 180);
    return () => clearTimeout(timer);
  }, [phase]);
  if (phase === "hidden") return null;
  return <div className="battle-indicator" style={{ visibility: visible ? "visible" : "hidden" }} data-phase={phase} role="status" aria-label={active ? "Battle Mode. One step per input." : "General Mode"}>
    <div className="battle-indicator__ribbon" aria-hidden="true"><span>BATTLE MODE</span></div>
    <div className="battle-indicator__icon" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none"><g stroke="currentColor" strokeWidth="4" strokeLinejoin="round"><path d="M13 7 24 11 49 45 43 49 17 16Z" fill="currentColor"/><path d="m51 7-11 4-25 34 6 4 26-33Z" fill="currentColor"/><path d="m9 40 17 13M38 53l17-13M18 49l-8 9M46 49l8 9" strokeWidth="6"/></g></svg>
    </div>
  </div>;
}

export function TacticalAreaOverlay({ rectangles, center, width, height, tileSize, variant }: {
  rectangles: readonly TacticalRectangle[]; center: Position; width: number; height: number; tileSize: number; variant: 1 | 2;
}) {
  const maskId = `tactical-${useId().replace(/:/g, "")}`;
  const bounds = { minX: Math.floor(center.x - width / tileSize / 2) - 1, maxX: Math.ceil(center.x + width / tileSize / 2) + 1,
    minY: Math.floor(center.y - height / tileSize / 2) - 1, maxY: Math.ceil(center.y + height / tileSize / 2) + 1 };
  const path = tacticalRowSpans(rectangles, bounds).map((span) => {
    const x = width / 2 + (span.x - center.x - .5) * tileSize;
    const y = height / 2 + (span.y - center.y - .5) * tileSize;
    return `M${x},${y}h${span.width * tileSize}v${tileSize}h${-span.width * tileSize}Z`;
  }).join(" ");
  return <svg className="tactical-area" data-variant={variant} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" shapeRendering="crispEdges">
    {variant === 1 ? <path d={path} fill="#fff1c9" opacity=".14" /> : <>
      <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}><rect width={width} height={height} fill="white"/><path d={path} fill="black"/></mask></defs>
      <rect width={width} height={height} fill="#05040b" opacity=".44" mask={`url(#${maskId})`} />
    </>}
  </svg>;
}
