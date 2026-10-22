import { useEffect, useRef, useState } from 'react';

/** Shared cosmetic roll; only the completed callback commits gameplay values. */
export function useAttributeRoll<N extends string>(names: readonly N[], min: number, max: number, onRoll: () => void, onRandomize: () => void) {
  const [randomizing, setRandomizing] = useState(false);
  const [cosmetic, setCosmetic] = useState<Record<N, number> | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const roll = () => {
    if (timer.current) return;
    const frame = () => setCosmetic(Object.fromEntries(names.map(name => [name, min + Math.floor(Math.random() * (max - min + 1))])) as Record<N, number>);
    onRandomize(); setRandomizing(true); frame(); let ticks = 0;
    timer.current = setInterval(() => {
      frame(); if (++ticks < 4) return;
      clearInterval(timer.current!); timer.current = null;
      onRoll(); setCosmetic(null); setRandomizing(false);
    }, 500);
  };
  return { roll, randomizing, cosmetic };
}
