import type { Campaign, Position } from "../../game/types.ts";
import { changedDiscoveryCells, discoveryRealmKey, discoveryRevision, isCellDiscovered } from "../procedural/map-discovery-system.ts";
import { createCampaignLightingReader } from "./campaign-lighting-system.ts";
import { createGridLighting, type LightColor } from "./grid-lighting-system.ts";
import { countPerformance, measurePerformance } from "./performance-system.ts";
import { normalizeRenderTestMode, renderTestEffects, type RenderTestMode } from "./render-test-system.ts";

/** One renderer-neutral RGBA field shared by floor pixels and anchored sprites. */
export function createWorldPresentationField() {
  const light = createGridLighting(), readLight = createCampaignLightingReader();
  let realm = "", discovery = "", mode: RenderTestMode = 0, revision = 0;
  let pixels = new Uint8ClampedArray();
  let previousCampaign: Campaign | undefined;
  return {
    update(campaign: Campaign, selected: RenderTestMode) {
      const nextMode = normalizeRenderTestMode(selected), effects = renderTestEffects(nextMode);
      if (campaign === previousCampaign && mode === nextMode) return false;
      previousCampaign = campaign;
      if (nextMode === 0) { mode = 0; return false; }
      const key = discoveryRealmKey(campaign), reset = key !== realm || mode !== nextMode;
      if (reset) {
        pixels = new Uint8ClampedArray(campaign.floor.width * campaign.floor.height * 4).fill(255);
        realm = key; discovery = "";
        if (effects.fog) for (let i = 3; i < pixels.length; i += 4) pixels[i] = 0;
      }
      mode = nextMode;
      const lightChanged = effects.lighting && light.update(readLight(campaign));
      if (effects.lighting && (reset || lightChanged)) {
        const indices = reset ? Array.from({ length: pixels.length / 4 }, (_, i) => i) : light.changedCells;
        for (const i of indices) for (let c = 0; c < 3; c++) pixels[i * 4 + c] = light.pixels[i * 4 + c]!;
      }
      const nextDiscovery = effects.fog ? discoveryRevision(campaign) : "";
      const fogChanged = effects.fog && (reset || nextDiscovery !== discovery);
      if (fogChanged) measurePerformance("fog preparation", () => {
        changedDiscoveryCells(discovery, campaign, (i, known) => { pixels[i * 4 + 3] = known ? 255 : 0; countPerformance("fog cells updated"); });
        discovery = nextDiscovery;
      });
      if (reset || lightChanged || fogChanged) { revision++; return true; }
      return false;
    },
    allowed(campaign: Campaign, position: Position) { return !renderTestEffects(mode).fog || isCellDiscovered(campaign, position); },
    tint(position: Position, wallViewer?: Position): LightColor { return renderTestEffects(mode).lighting ? light.sample(position, wallViewer) : [1, 1, 1]; },
    get pixels() { return pixels; }, get revision() { return revision; }, get sourceCount() { return light.sourceCount; },
    dispose() { light.dispose(); realm = ""; discovery = ""; previousCampaign = undefined; pixels = new Uint8ClampedArray(); mode = 0; },
  };
}

export const FLOOR_FIELD_FRAGMENT = `
let base = textureSample(atlasTex, atlasSamp, in.uv) * in.tint * L.opacityMul;
let world = (in.p.xy / L.viewScale + L.viewPos) / 32.0;
let dimensions = vec2f(textureDimensions(fieldTex));
let sample = textureSample(fieldTex, fieldSamp, world / dimensions);
return vec4f(base.rgb * sample.rgb * sample.a, base.a);
`;
