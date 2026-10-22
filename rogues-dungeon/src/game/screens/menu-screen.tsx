import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

const menuImageIds = ["logo", "rear", "frame", "hero", "rocks"] as const;

export function MenuScreen({ children, onReady }: { children: ReactNode; onReady(ready: boolean): void }) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [loadedImageIds, setLoadedImageIds] = useState<ReadonlySet<string>>(() => new Set());
  const imageRefs = useRef<Partial<Record<(typeof menuImageIds)[number], HTMLImageElement | null>>>({});
  const resetLayers = () => setPointer({ x: 0, y: 0 });
  const markImageReady = useCallback((id: (typeof menuImageIds)[number]) => {
    setLoadedImageIds((loaded) => loaded.has(id) ? loaded : new Set([...loaded, id]));
  }, []);
  useEffect(() => {
    for (const id of menuImageIds) if (imageRefs.current[id]?.complete) markImageReady(id);
  }, [markImageReady]);
  const ready = loadedImageIds.size === menuImageIds.length;
  useEffect(() => { onReady(ready); }, [onReady, ready]);
  const moveLayers = (event: PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({ x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: (event.clientY - bounds.top) / bounds.height * 2 - 1 });
  };
  const layerStyle = { "--menu-parallax-x": `${pointer.x * 5}px`, "--menu-parallax-y": `${pointer.y * 5}px` } as CSSProperties;
  return <main className="menu-screen" aria-busy={!ready} onPointerDown={(event) => {
    if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={moveLayers} onPointerUp={resetLayers} onPointerCancel={resetLayers} onPointerLeave={resetLayers} style={layerStyle}>
    <div className="menu-screen__art" aria-hidden="true">
      <img ref={(image) => { imageRefs.current.rear = image; }} className="menu-screen__layer menu-screen__layer--rear" src={`${import.meta.env.BASE_URL}assets/art/ui/menu/dungeon-hallway-rear.png`} alt="" onLoad={() => markImageReady("rear")} onError={() => markImageReady("rear")} />
      <img ref={(image) => { imageRefs.current.frame = image; }} className="menu-screen__layer menu-screen__layer--frame" src={`${import.meta.env.BASE_URL}assets/art/ui/menu/dungeon-environment-frame.png`} alt="" onLoad={() => markImageReady("frame")} onError={() => markImageReady("frame")} />
      <img ref={(image) => { imageRefs.current.hero = image; }} className="menu-screen__layer menu-screen__layer--hero" src={`${import.meta.env.BASE_URL}assets/art/ui/menu/dungeon-hero.png`} alt="" onLoad={() => markImageReady("hero")} onError={() => markImageReady("hero")} />
      <img ref={(image) => { imageRefs.current.rocks = image; }} className="menu-screen__layer menu-screen__layer--rocks" src={`${import.meta.env.BASE_URL}assets/art/ui/menu/dungeon-foreground-rocks.png`} alt="" onLoad={() => markImageReady("rocks")} onError={() => markImageReady("rocks")} />
    </div>
    <img ref={(image) => { imageRefs.current.logo = image; }} className="menu-screen__logo" src={`${import.meta.env.BASE_URL}assets/art/ui/menu/rogues-dungeon-logo.png`} alt="Rogue's Dungeon" onLoad={() => markImageReady("logo")} onError={() => markImageReady("logo")} />
    {ready ? children : <p className="menu-screen__loading" role="status">Loading Rogue's Dungeon...</p>}
  </main>;
}
