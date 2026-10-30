import type { CSSProperties, MouseEventHandler, PointerEventHandler, ReactNode } from "react";
import { slotColorProperties } from "../../ui/slot-colors.ts";
import type { Orientation } from "../../ui/layout.ts";

export function GameScreen({ children, onPointerDown, onClickCapture, orientation = "landscape", storageOpen = false }: { children: ReactNode; onPointerDown?: PointerEventHandler<HTMLElement>; onClickCapture?: MouseEventHandler<HTMLElement>; orientation?: Orientation; storageOpen?: boolean }) {
  return <main className="game-screen" data-orientation={orientation} data-lockbox-open={storageOpen || undefined} style={slotColorProperties as CSSProperties} onPointerDown={onPointerDown} onClickCapture={onClickCapture}>{children}</main>;
}
