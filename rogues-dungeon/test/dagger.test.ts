import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, worldDroppableItemInstance, applyAction, createResourcesModel } from '../src/systems/procedural/world-procedural-system.ts';
import type { Enemy } from '../src/game/types.ts';

test('Throwing Knife is a separate stack of three and hits the nearest eligible enemy', () => {
  const state = createCampaign(221); const {x,y} = state.player;
  for (let dx = 0; dx <= 4; dx++) state.floor.cells[y][x + dx].walkable = true;
  const dagger = worldDroppableItemInstance('Throwing Knife', 'dagger-test');
  assert.equal(dagger.quantity, 3);
  state.player.inventory = [dagger];
  let result = applyAction(state, {type:'assign-quick-slot', itemId:dagger.id, index:0}, {enemyLogicDisabled:true});
  assert.equal(result.state.player.quickSlots?.[0]?.quantity, 3);
  const enemy = (id:string, x:number): Enemy => ({id, kind:'enemy', name:id, x, y, hp:20, maxHp:20, damage:0, xp:0, resources:createResourcesModel({health:{current:20,currentMax:20}}), awareness:0, actionCooldown:99, nextActionAt:999, ai:{state:'idle',targetId:null}});
  result.state.floor.entities = [enemy('far', x+4), enemy('near', x+2)];
  result = applyAction(result.state, {type:'use-quick-slot', index:0}, {enemyLogicDisabled:true});
  assert.equal(result.accepted, true);
  assert.equal(result.state.player.quickSlots?.[0]?.quantity, 2);
  const cast = result.events.find(event => event.type === 'ability.used');
  assert.equal(cast?.facts.targetId, 'near');
  result = applyAction(result.state, {type:'resolve-ability', abilityId:cast!.facts.abilityId!, targetId:'near'}, {enemyLogicDisabled:true});
  assert.ok((result.state.floor.entities.find(e => e.id === 'near') as Enemy).hp < 20);
  assert.equal((result.state.floor.entities.find(e => e.id === 'far') as Enemy).hp, 20);
});

import { serializeFloorToTiled, floorFromTiledRepairMap } from '../src/systems/rendering/tile-map-system.ts';

test('Tiled Throwing Knife tile objects load at their bottom edge and validate pickup data', () => {
  const campaign = createCampaign(221);
  const map = serializeFloorToTiled({ campaign });
  const layer = map.layers.find(layer => layer.type === 'objectgroup' && layer.name === 'Pickups');
  assert.ok(layer && layer.type === 'objectgroup');
  const { x, y } = campaign.floor.start;
  const object = { id: 9876, name: 'authored-dagger', type: 'dagger-pickup', gid: 1, x: x * 32, y: (y + 1) * 32, width: 32, height: 32, properties: [{ name: 'quantity', value: 3 }, { name: 'walkable', value: true }] };
  map.tilesets.push({ firstgid: 9999, source: 'dagger.tsx' });
  object.gid = 9999;
  layer.objects.push(object);
  const floor = floorFromTiledRepairMap(map, campaign.floor);
  const pickup = floor.entities.find(entity => entity.id === 'tiled-dagger-9876');
  assert.ok(pickup?.kind === 'item');
  assert.equal(pickup.item.name, 'Throwing Knife');
  assert.equal(pickup.item.quantity, 3);
  assert.deepEqual({x: pickup.x, y: pickup.y}, {x,y});
  object.properties[0].value = 0;
  assert.throws(() => floorFromTiledRepairMap(map, campaign.floor), /Invalid dagger pickup/);
});

test('collecting a Throwing Knife pickup adds three and removes its world object', () => {
  const state = createCampaign(221);
  const {x,y} = state.player;
  state.floor.cells[y][x+1].walkable = true;
  state.floor.entities = [{id:'pickup-dagger', kind:'item', x:x+1, y, item:worldDroppableItemInstance('Throwing Knife','pickup-dagger')}];
  const result = applyAction(state, {type:'move', direction:'e'}, {enemyLogicDisabled:true});
  assert.equal(result.state.player.inventory.find(item => item.name === 'Throwing Knife')?.quantity, 3);
  assert.equal(result.state.floor.entities.some(entity => entity.id === 'pickup-dagger'), false);
});
