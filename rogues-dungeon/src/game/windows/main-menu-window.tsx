import type { ReactNode } from "react";
import { easeInCubic, easeOutCubic } from "../../systems/animation/tween-animation-system.ts";
import { useUiMotion } from "../../ui/ui-transition-system.tsx";
import versionText from "../../../../version.txt?raw";

export function MainMenuWindow({ children, footer, exiting = false, onExitComplete }: { children: ReactNode; footer: ReactNode; exiting?: boolean; onExitComplete?(): void }) {
  const motion = useUiMotion("main-menu", { opacity: exiting ? 0 : 1, scale: exiting ? .8 : 1, depth: 2 }, 125, exiting ? easeInCubic : easeOutCubic, exiting ? onExitComplete : undefined);
  return <section className="main-menu-window" style={motion}>{children}<div className="main-menu-window__footer">{footer}</div><span className="main-menu-window__version">v{versionText.trim().replace(/^version=/, "")}</span></section>;
}
