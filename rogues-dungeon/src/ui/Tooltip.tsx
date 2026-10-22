import type { HTMLAttributes, ReactNode } from "react";
import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { findTooltipPosition, type TooltipPlacement } from "./tooltip-position.ts";

export function Tooltip({ content, children, placement = "side" }: { content: ReactNode; children: ReactNode; placement?: TooltipPlacement }) {
  const anchorRef = useRef<HTMLElement | SVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const id = useId();
  const visible = hovered || focused;

  const dismissIfAnchorIsHidden = () => {
    const anchor = anchorRef.current;
    if (!anchor || !anchor.isConnected) {
      setHovered(false);
      setFocused(false);
      return;
    }
    for (let element: HTMLElement | SVGElement | null = anchor; element; element = element.parentElement) {
      const style = window.getComputedStyle(element);
      if (element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true" || style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        setHovered(false);
        setFocused(false);
        return;
      }
    }
  };

  useEffect(() => {
    const activate = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) return;
      setHovered(false);
      setFocused(false);
    };
    window.addEventListener("tooltip-activate", activate);
    return () => window.removeEventListener("tooltip-activate", activate);
  }, [id]);

  useEffect(() => {
    const dismiss = () => { setHovered(false); setFocused(false); };
    window.addEventListener("tooltip-dismiss", dismiss);
    return () => window.removeEventListener("tooltip-dismiss", dismiss);
  }, []);

  useEffect(() => {
    if (!visible || typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const observer = new MutationObserver(dismissIfAnchorIsHidden);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-hidden", "class", "hidden", "style"] });
    dismissIfAnchorIsHidden();
    return () => observer.disconnect();
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible) return undefined;
    const update = () => {
      if (anchorRef.current && tooltipRef.current) {
        const viewportElement = document.getElementById("viewport");
        const uiLayer = document.getElementById("ui_layer");
        const bounds = viewportElement?.getBoundingClientRect();
        if (bounds && uiLayer) {
          const result = findTooltipPosition({ left: 0, top: 0, right: bounds.width, bottom: bounds.height, originLeft: bounds.left, originTop: bounds.top }, anchorRef.current.getBoundingClientRect(), tooltipRef.current.getBoundingClientRect(), placement === "below" ? 5 : 8, placement);
          setPosition({ left: result.left, top: result.top });
        }
      }
    };
    update();
    const observer = new ResizeObserver(update);
    if (anchorRef.current) observer.observe(anchorRef.current);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [visible, content, placement]);

  if (!isValidElement<HTMLAttributes<HTMLElement | SVGElement>>(children)) return children ?? null;
  const originalEnter = children.props.onPointerEnter;
  const originalLeave = children.props.onPointerLeave;
  const originalFocus = children.props.onFocus;
  const originalBlur = children.props.onBlur;
  const originalClick = children.props.onClick;
  const trigger = cloneElement(children, {
    "aria-describedby": visible ? id : children.props["aria-describedby"],
    onPointerEnter: (event) => { anchorRef.current = event.currentTarget; activateTooltip(id); setHovered(true); originalEnter?.(event); },
    onPointerLeave: (event) => { setHovered(false); originalLeave?.(event); },
    onFocus: (event) => { anchorRef.current = event.currentTarget; activateTooltip(id); setFocused(true); originalFocus?.(event); },
    onBlur: (event) => { setFocused(false); originalBlur?.(event); },
    onClick: (event) => { dismissTooltips(); originalClick?.(event); },
  });
  const uiLayer = document.getElementById("ui_layer");
  return <>{trigger}{visible && uiLayer && createPortal(<div ref={tooltipRef} id={id} className="ui_tooltip" role="tooltip" style={{ left: position.left, top: position.top }}>{content}</div>, uiLayer)}</>;
}

export function dismissTooltips() {
  window.dispatchEvent(new Event("tooltip-dismiss"));
}

export function activateTooltip(owner: string) {
  window.dispatchEvent(new CustomEvent("tooltip-activate", { detail: owner }));
}
