import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createCampaign, createResourcesModel, worldDroppableItemInstance } from '../src/systems/procedural/world-procedural-system.ts';
import { formatLogEvent } from '../src/game/log-policy.ts';
import type { Enemy } from '../src/game/types.ts';

test('bomb is collected, assigned, thrown and damages only the cross at impact', () => {
  const state = createCampaign(221); const { x, y } = state.player;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 4; dx++) { const cell = state.floor.cells[y + dy]?.[x + dx]; if (cell) cell.walkable = true; }
  const bomb = worldDroppableItemInstance('Bomb', 'test-bomb');
  state.floor.entities = [{ id: 'test-bomb', kind: 'item', item: bomb, x: x + 1, y }];
  let result = applyAction(state, { type: 'move', direction: 'e' }, { enemyLogicDisabled: true });
  assert.equal(result.state.player.inventory.find(item => item.name === 'Bomb')?.quantity, 3);
  result = applyAction(result.state, { type: 'assign-quick-slot', itemId: bomb.id, index: 0 }, { enemyLogicDisabled: true });
  assert.equal(result.accepted, true);
  assert.equal(result.state.player.quickSlots?.[0]?.quantity, 3);
  result.state.player.resources.mana.current = result.state.player.resources.mana.currentMax;
  const rejected = applyAction(result.state, { type: 'use-quick-slot', index: 0 }, { enemyLogicDisabled: true });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.state.player.quickSlots?.[0]?.quantity, 3);
  const rejection = rejected.events.find(event => event.type === 'quick-slot.use.rejected');
  assert.equal(rejection?.facts.reason, 'no-valid-target');
  assert.equal(formatLogEvent(rejection!), 'Bomb disabled. Enemy out of range.');
  const enemy = (id: string, ex: number, ey: number): Enemy => ({ id, kind: 'enemy', name: id, x: ex, y: ey, hp: 20, maxHp: 20, damage: 0, xp: 0, resources: createResourcesModel({ health: { current: 20, currentMax: 20 }, xp: { current: 0, currentMax: 0 } }), awareness: 0, actionCooldown: 99, nextActionAt: 999, ai: { state: 'idle', targetId: null } });
  result.state.floor.entities = [enemy('target', x + 3, y), enemy('adjacent', x + 3, y + 1), enemy('diagonal', x + 4, y + 1)];
  result = applyAction(result.state, { type: 'use-quick-slot', index: 0 }, { enemyLogicDisabled: true });
  assert.equal(result.accepted, true); assert.equal(result.state.player.quickSlots?.[0]?.quantity, 2);
  assert.equal(result.state.player.resources.mana.current, result.state.player.resources.mana.currentMax);
  const impact = result.events.find(event => event.type === 'bomb.thrown')?.facts.targetPosition; assert.deepEqual(impact, { x: x + 3, y });
  result = applyAction(result.state, { type: 'resolve-bomb', position: impact! }, { enemyLogicDisabled: true });
  const hp = (id: string) => (result.state.floor.entities.find(entry => entry.id === id) as Enemy).hp;
  assert.equal(hp('target'), 10); assert.equal(hp('adjacent'), 10); assert.equal(hp('diagonal'), 20);
});

test('bomb blast damages the player and crates only on walkable cross cells', () => {
  const state = createCampaign(222); const { x, y } = state.player;
  state.floor.objectSets = []; state.floor.tiledDecorations = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 2; dx++) { const cell = state.floor.cells[y + dy]?.[x + dx]; if (cell) cell.walkable = true; }
  state.floor.cells[y - 1][x + 1].walkable = false;
  if (state.floor.map) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 2; dx++) state.floor.map[y + dy][x + dx] = state.floor.cells[y + dy][x + dx].walkable ? 0 : 1;
  state.floor.entities = [
    { id: 'crate', kind: 'crate', x: x + 2, y, health: 10 },
    { id: 'wall-crate', kind: 'crate', x: x + 1, y: y - 1, health: 10 },
    { id: 'diagonal-crate', kind: 'crate', x: x + 2, y: y + 1, health: 10 },
  ];
  const result = applyAction(state, { type: 'resolve-bomb', position: { x: x + 1, y } }, { enemyLogicDisabled: true });
  assert.equal(result.state.player.resources.health.current, Math.max(0, state.player.resources.health.current - 10));
  const crate = result.state.floor.entities.find(entity => entity.id === 'crate');
  assert.ok(crate?.kind === 'crate' && crate.opened);
  for (const id of ['wall-crate', 'diagonal-crate']) {
    const untouched = result.state.floor.entities.find(entity => entity.id === id);
    assert.ok(untouched?.kind === 'crate' && !untouched.opened && untouched.health === 10);
  }
  assert.ok(result.events.some(event => event.type === 'crate.opened' && event.facts.id === 'crate'));
});

test('bomb throw range grows with Strength and rejects distant enemies', () => {
  const state = createCampaign(223); const { x, y } = state.player;
  for (let dx = 0; dx <= 5; dx++) state.floor.cells[y][x + dx].walkable = true;
  state.player.quickSlots = [{ item: worldDroppableItemInstance('Bomb', 'range-bomb'), quantity: 3 }, null];
  state.player.equipment = { weapons: [null, null], armor: [null, null], jewels: [null, null] };
  state.progression.attributes.strength = 1;
  state.floor.entities = [{ id: 'target', kind: 'enemy', name: 'target', x: x + 3, y, hp: 20, maxHp: 20, damage: 0, xp: 0, resources: createResourcesModel({ health: { current: 20, currentMax: 20 } }), awareness: 0, actionCooldown: 99, nextActionAt: 999, ai: { state: 'idle', targetId: null } }];
  const distant = applyAction(state, { type: 'use-quick-slot', index: 0 }, { enemyLogicDisabled: true });
  assert.equal(distant.accepted, false);
  assert.equal(distant.events.find(event => event.type === 'quick-slot.use.rejected')?.facts.amount, 2);
  assert.equal(formatLogEvent(distant.events.find(event => event.type === 'quick-slot.use.rejected')!), 'Bomb disabled. Enemy out of range.');
  state.progression.attributes.strength = 3;
  const inRange = applyAction(state, { type: 'use-quick-slot', index: 0 }, { enemyLogicDisabled: true });
  assert.equal(inRange.accepted, true);
});

test('a lethal bomb blast emits the normal player death event', () => {
  const state = createCampaign(224);
  state.floor.entities = [];
  state.player.resources.health.current = 5;
  const result = applyAction(state, { type: 'resolve-bomb', position: { x: state.player.x, y: state.player.y } }, { enemyLogicDisabled: true });
  assert.equal(result.state.player.resources.health.current, 0);
  assert.equal(result.events.filter(event => event.type === 'player.died').length, 1);
});
