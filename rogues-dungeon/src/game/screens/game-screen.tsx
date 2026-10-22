import type { CSSProperties, MouseEventHandler, PointerEventHandler, ReactNode } from "react";
import { slotColorProperties } from "../../ui/slot-colors.ts";
import type { Orientation } from "../../ui/layout.ts";

export function GameScreen({ children, onPointerDown, onClickCapture, orientation = "landscape" }: { children: ReactNode; onPointerDown?: PointerEventHandler<HTMLElement>; onClickCapture?: MouseEventHandler<HTMLElement>; orientation?: Orientation }) {
  return <main className="game-screen" data-orientation={orientation} style={slotColorProperties as CSSProperties} onPointerDown={onPointerDown} onClickCapture={onClickCapture}>{children}</main>;
}
