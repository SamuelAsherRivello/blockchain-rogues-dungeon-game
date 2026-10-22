import { useContext, type ReactNode } from "react";
import { LayoutContext } from "../../ui/layout-context.ts";
import { useUiMotion } from "../../ui/ui-transition-system.tsx";

export function WorldViewRegion({ children, primaryOpen, secondaryOpen, dimmed = false }: { children: ReactNode; primaryOpen: boolean; secondaryOpen: boolean; dimmed?: boolean }) {
  const { orientation } = useContext(LayoutContext);
  const width = orientation === "portrait" ? "100%" : primaryOpen ? secondaryOpen ? "calc(100% - 78.222222cqh)" : "calc(100% - 39.111111cqh)" : secondaryOpen ? "calc(100% - 39.111111cqh)" : "100%";
  const motion = useUiMotion("game-view", { opacity: 1 });
  return <section className="world-view-region" style={{ ...motion, width }}>{children}{dimmed && <div className="world-view-region__backdrop" aria-hidden="true" />}</section>;
}
