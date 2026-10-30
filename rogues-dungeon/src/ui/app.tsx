import type { ReactNode } from "react";
import type { Orientation } from "./layout.ts";
import { useEffect, useMemo, useState } from "react";
import { BrowserSurface } from "./browser-surface.tsx";
import { classifyPlatform, layoutForPlatform } from "./layout.ts";
import { LayoutContext } from "./layout-context.ts";
import { DEV_SETTINGS_STORAGE_KEYS, readDevAspect, readDevBoolean, writeDevAspect, writeDevBoolean } from "./dev-settings.ts";
const SEQUENTIALLY_FOCUSABLE_SELECTOR = "a[href], area[href], button, input, select, textarea, iframe, object, embed, [contenteditable]:not([contenteditable=\"false\"]), [tabindex]";
function scrollStepHeight(scroller: HTMLElement) {
  const candidates = scroller.querySelectorAll<HTMLElement>(".slot_item, p, li, button, [role=\"option\"]");
  for (const candidate of candidates) {
    const height = candidate.getBoundingClientRect().height;
    if (height > 0) return height;
  }
  const styles = getComputedStyle(scroller);
  const lineHeight = Number.parseFloat(styles.lineHeight);
  const fontSize = Number.parseFloat(styles.fontSize);
  return lineHeight || fontSize * 1.35 || 16;
}

function scrollableAncestor(target: Element, direction: number) {
  let element: HTMLElement | null = target instanceof HTMLElement ? target : target.parentElement;
  while (element) {
    const overflowY = getComputedStyle(element).overflowY;
    const maxScroll = element.scrollHeight - element.clientHeight;
    const canScroll = maxScroll > 0 && (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay");
    const canMove = direction < 0 ? element.scrollTop > 0 : element.scrollTop < maxScroll;
    if (canScroll && canMove) return element;
    element = element.parentElement;
  }
  return null;
}

function handleWheelScroll(event: WheelEvent) {
  if (event.ctrlKey || event.deltaY === 0) return;
  const target = event.target;
  if (!(target instanceof Element) || target.closest(".world-view, .minimap-view")) return;
  const direction = Math.sign(event.deltaY);
  const scroller = scrollableAncestor(target, direction);
  if (!scroller) return;

  scroller.scrollTop += direction * scrollStepHeight(scroller);
  event.preventDefault();
  event.stopPropagation();
}

function readShowPivotPoints() {
  return readDevBoolean(DEV_SETTINGS_STORAGE_KEYS.pivots);
}

export function App({ content = null, gutters = {} }: { content?: ReactNode; gutters?: Partial<Record<string, ReactNode>> }) {
  useEffect(() => {
    // The game is pointer, touch, and game-key controlled: never let its UI join
    // the browser's sequential focus navigation, including controls added later.
    const removeFromTabOrder = (root: ParentNode) => {
      const elements: HTMLElement[] = root instanceof HTMLElement && root.matches(SEQUENTIALLY_FOCUSABLE_SELECTOR)
        ? [root, ...root.querySelectorAll<HTMLElement>(SEQUENTIALLY_FOCUSABLE_SELECTOR)]
        : Array.from(root.querySelectorAll<HTMLElement>(SEQUENTIALLY_FOCUSABLE_SELECTOR));
      elements.forEach((element) => {
        if (element.tabIndex !== -1) element.tabIndex = -1;
      });
    };
    removeFromTabOrder(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) removeFromTabOrder(mutation.target);
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) removeFromTabOrder(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["tabindex", "href", "contenteditable"] });
    const preventTabNavigation = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      // A pointer activation can leave a control focused even when it is not
      // in the tab order. Clear that focus as well so Tab never leaves a
      // visible focus state behind on a clicked game control.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", preventTabNavigation, true);
    document.addEventListener("wheel", handleWheelScroll, { capture: true, passive: false });
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", preventTabNavigation, true);
      document.removeEventListener("wheel", handleWheelScroll, true);
    };
  }, []);
  const platform = classifyPlatform({ userAgentDataMobile: navigator.userAgentData?.mobile, userAgent: navigator.userAgent });
  const canOverride = platform === "pc" && import.meta.env.DEV;
  const [aspectRatio, setAspectRatioState] = useState<Orientation | null>(readDevAspect);
  const [showPivotPoints, setShowPivotPoints] = useState(readShowPivotPoints);
  const setPersistentShowPivotPoints = (value: boolean | ((current: boolean) => boolean)) => setShowPivotPoints((current) => {
    const next = typeof value === "function" ? value(current) : value;
    writeDevBoolean(DEV_SETTINGS_STORAGE_KEYS.pivots, next);
    return next;
  });
  const setAspectRatio = (value: Orientation) => { writeDevAspect(value); setAspectRatioState(value); };
  const layout = layoutForPlatform(platform, aspectRatio);
  const context = useMemo(() => ({ platform, orientation: layout.orientation, canOverride, showPivotPoints: canOverride && showPivotPoints, setShowPivotPoints: setPersistentShowPivotPoints, setAspectRatio }), [platform, layout.orientation, canOverride, showPivotPoints]);
  return <LayoutContext.Provider value={context}><BrowserSurface layout={layout} gutters={gutters}>{content}</BrowserSurface></LayoutContext.Provider>;
}
