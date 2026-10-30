import assert from "node:assert/strict";
import test from "node:test";
import type { Enemy, Floor } from "../src/game/types.ts";
import { planEnemyActions } from "../src/game/enemy-ai-system.ts";

function guard(): Enemy {
  return { id: "guard", kind: "enemy", name: "Guard", x: 0, y: 0, hp: 1, maxHp: 1, damage: 1, xp: 1, resources: { health: { current: 1, currentMax: 1 }, stamina: { current: 0, currentMax: 0 }, offense: { current: 1, currentMax: 1 }, defense: { current: 0, currentMax: 0 }, mana: { current: 0, currentMax: 0 }, xp: { current: 1, currentMax: 1 } }, awareness: 10, actionCooldown: 1, nextActionAt: 0, ai: { state: "idle", targetId: null } };
}

test("an opaque closed door keeps an otherwise-aware enemy idle", () => {
  const enemy = guard();
  const floor = { width: 3, height: 1, cells: [[{ walkable: true, role: "floor" }, { walkable: true, role: "floor" }, { walkable: true, role: "floor" }]], entities: [enemy] } as unknown as Floor;
  const [intent] = planEnemyActions({ floor, player: { x: 2, y: 0 }, time: 1, enemies: [enemy], effectiveAwareness: () => 10, canSee: () => false, canAttack: () => false, canEnter: () => true });
  assert.deepEqual(intent, { enemyId: "guard", kind: "idle", state: "idle" });
});
