import { useEffect, useState } from "react";

const portraits = new Map<string, Promise<string>>();

/** Remove only transparent margins, preserving every visible source pixel. */
function fittedPortrait(src: string): Promise<string> {
  const cached = portraits.get(src);
  if (cached) return cached;
  const result = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) { resolve(src); return; }
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (pixels.data[(y * canvas.width + x) * 4 + 3] === 0) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      if (right < left) { resolve(src); return; }
      canvas.width = right - left + 1; canvas.height = bottom - top + 1;
      context.imageSmoothingEnabled = false;
      context.drawImage(image, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL());
    };
    image.onerror = reject;
    image.src = src;
  });
  portraits.set(src, result);
  return result;
}

export function EnemyPortrait({ src, name }: { src: string; name: string }) {
  const [portrait, setPortrait] = useState<{ source: string; image: string } | null>(null);
  useEffect(() => {
    let active = true;
    fittedPortrait(src).then((image) => { if (active) setPortrait({ source: src, image }); })
      .catch(() => { if (active) setPortrait({ source: src, image: src }); });
    return () => { active = false; };
  }, [src]);
  return <img src={portrait?.source === src ? portrait.image : undefined} alt={`${name} idle pose`} style={{ visibility: portrait?.source === src ? "visible" : "hidden" }} />;
}
