import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

interface ScrollMetrics { clientHeight: number; scrollHeight: number; scrollTop: number }

/** A scroll region with a permanent, draggable in-game scrollbar. */
export function ScrollArea({ autoScroll = false, children, className = "", onScroll, ...props }: HTMLAttributes<HTMLDivElement> & { autoScroll?: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const dragRef = useRef<{ startPosition: number; startScrollTop: number; trackHeight: number } | null>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>({ clientHeight: 0, scrollHeight: 0, scrollTop: 0 });
  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = { clientHeight: viewport.clientHeight, scrollHeight: viewport.scrollHeight, scrollTop: viewport.scrollTop };
    setMetrics((current) => current.clientHeight === next.clientHeight && current.scrollHeight === next.scrollHeight && current.scrollTop === next.scrollTop ? current : next);
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current!;
    const follow = () => {
      if (autoScroll && following.current) viewport.scrollTop = viewport.scrollHeight;
      measure();
    };
    follow();
    const observer = new ResizeObserver(follow);
    observer.observe(viewport);
    for (const child of viewport.children) observer.observe(child);
    return () => observer.disconnect();
  }, [autoScroll, children, measure]);

  const maxScroll = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
  const thumbHeight = metrics.clientHeight ? Math.min(metrics.clientHeight, Math.max(24, metrics.clientHeight * metrics.clientHeight / Math.max(metrics.scrollHeight, 1))) : 0;
  const thumbTravel = Math.max(0, metrics.clientHeight - thumbHeight);
  const thumbTop = maxScroll ? metrics.scrollTop / maxScroll * thumbTravel : 0;
  // Portrait mobile rotates the entire game surface, so its vertical axis runs right to left on screen.
  const trackPosition = (event: ReactPointerEvent<HTMLDivElement>, track: HTMLDivElement) => {
    const rect = track.getBoundingClientRect();
    const rotated = document.querySelector('#browser_surface[data-platform="mobile"]') && window.matchMedia('(orientation: portrait)').matches;
    return rotated ? rect.right - event.clientX : event.clientY - rect.top;
  };
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !maxScroll || !thumbTravel) return;
    const position = trackPosition(event, event.currentTarget);
    const onThumb = (event.target as Element).closest('.scroll-area__thumb');
    if (!onThumb) viewport.scrollTop = Math.max(0, Math.min(maxScroll, (position - thumbHeight / 2) / thumbTravel * maxScroll));
    dragRef.current = { startPosition: position, startScrollTop: viewport.scrollTop, trackHeight: metrics.clientHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
    measure();
  };
  const dragThumb = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const drag = dragRef.current;
    if (!viewport || !drag || !maxScroll || !thumbTravel) return;
    const delta = trackPosition(event, event.currentTarget) - drag.startPosition;
    viewport.scrollTop = Math.max(0, Math.min(maxScroll, drag.startScrollTop + delta / Math.max(1, drag.trackHeight - thumbHeight) * maxScroll));
    event.preventDefault();
    event.stopPropagation();
    measure();
  };

  return <div {...props} className={`scroll-area ${className}`}>
    <div ref={viewportRef} className="scroll-area__viewport" onScroll={(event) => {
      const viewport = event.currentTarget;
      if (autoScroll && viewport.clientHeight > 0) following.current = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 1;
      measure();
      onScroll?.(event);
    }}>{children}</div>
    <div className="scroll-area__track" data-scrollable={maxScroll > 0} aria-hidden="true" onPointerDown={startDrag} onPointerMove={dragThumb} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onLostPointerCapture={() => { dragRef.current = null; }}><div className="scroll-area__thumb" style={{ height: `${thumbHeight}px`, transform: `translateY(${thumbTop}px)` }} /></div>
  </div>;
}
