import type { Dispatch, SetStateAction } from "react";
import type { GameLayout, Orientation } from "./layout.ts";
import { createContext } from "react";

export const LayoutContext = createContext<{ platform: string; layout: GameLayout; setLayout: (layout: GameLayout) => void; orientation: Orientation; canOverride: boolean; showPivotPoints: boolean; setShowPivotPoints: Dispatch<SetStateAction<boolean>> }>({ platform: "pc", layout: "desktop", setLayout() {}, orientation: "landscape", canOverride: false, showPivotPoints: false, setShowPivotPoints() {} });
