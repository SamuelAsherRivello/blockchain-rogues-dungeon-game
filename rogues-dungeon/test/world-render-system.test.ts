import assert from "node:assert/strict";
import test from "node:test";
import { applyAction, createCampaign } from "../src/systems/procedural/world-procedural-system.ts";
import { OBJECTS_OVERLAY_DOOR_CLOSED_FRAME, puzzleObjectSpriteFrame, worldPickupPresentation } from "../src/systems/rendering/world-object-sprite-system.ts";
import { throwItems } from "../src/systems/animation/item-throw-animation-system.ts";
import { WorldRender, compileStaticWorldPresentation, getVisibleWorldCellBounds, isWorldCellVisible, isWorldChunkVisible } from "../src/systems/rendering/world-render-system.ts";

test("compiled static presentation is reused for unchanged floor layers", () => {
  const cells = [[{ walkable: true, terrain: "floor" }]] as never;
  const ground = [1];
  const walls = [0];
  const first = compileStaticWorldPresentation(cells, 32, ground, walls);
  const second = compileStaticWorldPresentation(cells, 32, ground, walls);

  assert.strictEqual(second, first);
  assert.strictEqual(second.terrain, first.terrain);
});

test("visible world bounds retain a one-cell sprite margin", () => {
  const bounds = getVisibleWorldCellBounds({ x: 10, y: 10 }, 4, 4);
  assert.equal(isWorldCellVisible({ x: 7, y: 10 }, bounds), true);
  assert.equal(isWorldCellVisible({ x: 6, y: 10 }, bounds), false);
});

test("static chunks activate only when they intersect the camera cull area", () => {
  const near = getVisibleWorldCellBounds({ x: 8, y: 8 }, 8, 8);
  const far = getVisibleWorldCellBounds({ x: 40, y: 8 }, 8, 8);
  const firstChunk = { minX: 0, maxX: 15, minY: 0, maxY: 15 };
  const secondChunk = { minX: 32, maxX: 47, minY: 0, maxY: 15 };
  assert.equal(isWorldChunkVisible(firstChunk, near), true);
  assert.equal(isWorldChunkVisible(secondChunk, near), false);
  assert.equal(isWorldChunkVisible(firstChunk, far), false);
  assert.equal(isWorldChunkVisible(secondChunk, far), true);
});

test("discovery does not remove static dungeon geometry", () => {
  const cells = [
    [{ walkable: true, terrain: "floor" }, { walkable: true, terrain: "floor" }],
    [{ walkable: true, terrain: "floor" }, { walkable: true, terrain: "floor" }],
  ] as never;
  const model = WorldRender.Render({ cells, player: { x: 0, y: 0, hasMass: true }, isDiscovered: () => false });

  assert.equal(model.grounds.length, 4);
});

test("a closed door in a vertical wall keeps the closed front-door frame", () => {
  const map = [
    [1, 1, 1],
    [0, 1, 0],
    [1, 1, 1],
  ];
  const model = WorldRender.Render({
    map,
    player: { x: 0, y: 0, hasMass: true },
    objectSets: [{ id: "vertical-wall-door", kind: "floor-trigger-door-barrel", barrel: { x: 2, y: 2 }, trigger: { x: 0, y: 2 }, door: { x: 1, y: 1 }, regionRole: "optional-reward" }],
  });
  const door = model.puzzleObjects.find((object) => object.kind === "door");

  assert.ok(door);
  assert.equal(door.active, false);
  assert.equal(door.wallAxis, "vertical");
  assert.equal(puzzleObjectSpriteFrame("door", door.active, door.wallAxis), OBJECTS_OVERLAY_DOOR_CLOSED_FRAME);
});

for (const resource of ["health", "mana", "stamina"] as const) {
  test(`dropped ${resource} potions use native potion art in both world views and flights`, () => {
    for (const source of ["inventory", "quick-slot"] as const) {
      const campaign = createCampaign(1901);
      const item = { id: `${resource}-drop`, name: `${resource} potion`, group: "weapons" as const, modifiers: {}, category: "consumable" as const, consumableResource: resource, isStackable: true, quantity: 2 };
      if (source === "inventory") campaign.player.inventory = [item];
      else campaign.player.quickSlots = [{ item, quantity: 2 }, null];
      const result = applyAction(campaign, { type: "drop-item", source: source === "inventory" ? { kind: source, itemId: item.id } : { kind: source, index: 0 } });
      assert.equal(result.accepted, true);
      const entity = result.state.floor.entities.find(entry => entry.kind === "item" && entry.item.id === item.id)!;
      assert.ok(entity);
      const presentation = worldPickupPresentation(entity);
      assert.deepEqual(presentation, { kind: "potion", resource });
      const [flight] = throwItems(campaign.player, [{ id: entity.id, ...presentation, destination: entity }], 0);
      assert.equal(flight.kind, "potion");
      assert.equal(flight.resource, resource);
      for (const view of ["game", "minimap"]) {
        const model = WorldRender.Render({ map: result.state.floor.map, cells: result.state.floor.cells, player: result.state.player, entities: [entity], view });
        assert.equal(model.objects[0].kind, "potion");
        assert.equal(model.objects[0].resource, resource);
        assert.deepEqual(model.objects[0].item, item);
      }
    }
  });
}
