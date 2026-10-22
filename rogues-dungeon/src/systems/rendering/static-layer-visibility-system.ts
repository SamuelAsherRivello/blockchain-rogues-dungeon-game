import type { Sprite2DHandle, Sprite2DLayer } from "@babylonjs/lite";

// Lite hides individual sprites by zeroing their size, but still submits their
// layer. Cache which static layers contain permitted sprites at visibility changes.
export function createStaticLayerVisibility(layers: readonly Sprite2DLayer[], sprites: readonly { handle: Sprite2DHandle; visible: boolean }[]) {
  const permitted = new Set<Sprite2DLayer>();
  let inView = false;
  return {
    update(prepare: () => void) {
      // Sprite patch writers skip hidden layers. Enable them while refreshing so
      // newly discovered sprites can return after a whole row was suppressed.
      for (const layer of layers) layer.visible = true;
      prepare();
      permitted.clear();
      for (const sprite of sprites) if (sprite.visible) permitted.add(sprite.handle.layer);
    },
    apply(visible: boolean) {
      const entered = visible && !inView;
      inView = visible;
      for (const layer of layers) layer.visible = visible && permitted.has(layer);
      return entered;
    },
  };
}
