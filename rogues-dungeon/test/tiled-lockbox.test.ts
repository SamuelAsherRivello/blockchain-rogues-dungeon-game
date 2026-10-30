import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readAuthoredLockboxes } from "../src/systems/procedural/tiled-lockbox-system.ts";
import { applyAction, createRunCampaign } from "../src/systems/procedural/world-procedural-system.ts";
import { getMouseMovementFromSelectedCell, getMousePathResult } from "../src/game/mouse-selection.ts";

const source = readFileSync(new URL("../public/assets/art/game-view/maps/prefabs/player-home.tmx", import.meta.url), "utf8");

test("reads only the two human-authored home lockboxes with bottom-left tile anchors", () => {
  assert.deepEqual(readAuthoredLockboxes(source).map(({ id, x, y, gid }) => ({ id, x, y, gid })), [
    { id: "player-home:3", x: 1, y: 8, gid: 153 },
    { id: "player-home:4", x: 8, y: 8, gid: 153 },
  ]);
});

test("mouse travel approaches each blocked authored lockbox and bumps without entering it", () => {
  const campaign = createRunCampaign(39, 1, 1);
  const arrow = campaign.floor.entities.find(entity => entity.kind === "teleport-arrow")!;
  campaign.player.x = arrow.x; campaign.player.y = arrow.y;
  const home = applyAction(campaign, { type: "enter-teleport" }).state;
  for (const box of home.floor.lockboxes!) {
    home.player.x = 5; home.player.y = 7;
    const selection = { ...box, pressed: true, sprint: false };
    const route = getMousePathResult(selection, home);
    assert.equal(route.reachable, true);
    assert.ok(route.path?.length);
    for (const cell of route.path!.slice(1)) { home.player.x = cell.x; home.player.y = cell.y; }
    const move = getMouseMovementFromSelectedCell(selection, home)!;
    assert.ok(move);
    const result = applyAction(home, { type: "move", direction: move.direction });
    assert.equal(result.ticks, 0);
    assert.equal(result.events.find(event => event.type === "lockbox.opened")?.facts.id, box.storageId);
    assert.notDeepEqual({ x: result.state.player.x, y: result.state.player.y }, { x: box.x, y: box.y });
  }
  home.player.x = 2; home.player.y = 9;
  assert.equal(applyAction(home, { type: "move", direction: "nw" }).accepted, false);
});

test("a moved or removed lockbox has no independent fallback placement", () => {
  const moved = source.replace('name="lockbox-left" type="lockbox" x="32"', 'name="lockbox-left" type="lockbox" x="64"');
  assert.equal(readAuthoredLockboxes(moved)[0]!.x, 2);
  assert.equal(readAuthoredLockboxes(moved)[0]!.id, "player-home:3");
  assert.equal(readAuthoredLockboxes(source.replace(/<object\b[^>]*type="lockbox"[\s\S]*?<\/object>/g, "")).length, 0);
});

test("rejects malformed lockbox dimensions, identity, geometry, and blocking properties", () => {
  for (const [from, to] of [
    ['id="3" name="lockbox-left"', 'id="4" name="lockbox-left"'],
    ['x="32" y="288" width="32" height="32" gid="153"', 'x="33" y="288" width="32" height="32" gid="153"'],
    ['x="32" y="288" width="32" height="32" gid="153"', 'x="320" y="288" width="32" height="32" gid="153"'],
    ['name="walkable" type="bool" value="false"', 'name="walkable" type="bool" value="true"'],
  ]) assert.throws(() => readAuthoredLockboxes(source.replace(from!, to!)), /lockbox/i);
});

test("home lockboxes are blocked authored interactables while generated levels contain none", () => {
  const campaign = createRunCampaign(39, 1, 1);
  assert.equal(campaign.floor.lockboxes?.length ?? 0, 0);
  const arrow = campaign.floor.entities.find(entity => entity.kind === "teleport-arrow")!;
  campaign.player.x = arrow.x; campaign.player.y = arrow.y;
  const home = applyAction(campaign, { type: "enter-teleport" }).state;
  assert.deepEqual(home.floor.lockboxes?.map(box => box.id), ["player-home:3", "player-home:4"]);
  home.player.x = 2; home.player.y = 8;
  const bumped = applyAction(home, { type: "move", direction: "w" });
  assert.equal(bumped.accepted, true);
  assert.equal(bumped.ticks, 0);
  assert.equal(bumped.state.player.x, 2);
  assert.equal(bumped.state.floor.time, home.floor.time);
  assert.equal(bumped.state.floor.cells[8]![1]!.walkable, false);
  assert.equal(bumped.events.find(event => event.type === "lockbox.opened")?.facts.id, "shared-lockbox");
});
