import type { Campaign } from "../../game/types.ts";
import { encounterLockdownSets, floorTriggerDoorSets, isEncounterLockdownDoorOpen, isObjectSetDoorOpen } from "../procedural/world-procedural-system.ts";
import { isWalkable } from "../procedural/level-grid-system.ts";
import { GRID_LIGHTING, playerGridLights, wallLightOrigin, type GridLight, type LightingScene } from "./grid-lighting-system.ts";

/** Per-view adapter; never retained globally across campaigns or renderer teardown. */
export function createCampaignLightingReader() {
  let previous: Campaign | undefined, result: LightingScene | undefined;
  return (campaign: Campaign) => {
    if (campaign === previous && result) return result;
    const floor = campaign.floor;
    const closed = [
      ...floorTriggerDoorSets(floor).filter((set) => !isObjectSetDoorOpen(set, campaign.player, floor.entities)).map((set) => set.door),
      ...encounterLockdownSets(floor).filter((set) => !isEncounterLockdownDoorOpen(set)).flatMap((set) => set.doors),
    ];
    const blocked = new Set(closed.map((p) => `${p.x},${p.y}`));
    const opaque = (x: number, y: number) => !isWalkable(floor, x, y) || blocked.has(`${x},${y}`);
    const sources: GridLight[] = playerGridLights(campaign.player);
    for (const torch of floor.decorations ?? []) if (torch.kind === "torch") {
      const origin = torch.wallMounted ? wallLightOrigin(torch, opaque) : torch;
      if (origin) sources.push({ x: torch.x, y: torch.y, ...(torch.wallMounted ? { castFrom: origin } : {}), id: `torch:${torch.id}`, radius: GRID_LIGHTING.torchRadius, color: GRID_LIGHTING.torchColor });
    }
    for (const fire of floor.entities) if (fire.kind === "campfire") sources.push({ ...fire, id: `fire:${fire.id}`, radius: GRID_LIGHTING.campfireRadius, color: GRID_LIGHTING.campfireColor });
    for (const torch of floor.tiledDecorations ?? []) if (torch.gid === 137 && !(floor.decorations ?? []).some(d => d.kind === "torch" && d.x === torch.x && d.y === torch.y)) {
      const origin = wallLightOrigin(torch, opaque);
      if (origin) sources.push({ x: torch.x, y: torch.y, castFrom: origin, id: `authored-torch:${torch.x},${torch.y}`, radius: GRID_LIGHTING.torchRadius, color: GRID_LIGHTING.torchColor });
    }
    previous = campaign;
    return result = { width: floor.width, height: floor.height, terrain: floor.cells, opaque, blockerRevision: [...blocked].sort().join(";"), sources };
  };
}
