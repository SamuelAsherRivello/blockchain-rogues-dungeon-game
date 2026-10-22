import assert from 'node:assert/strict';
import test from 'node:test';
import type { Campaign, Floor } from '../src/game/types.ts';
import { copyCampaignMutableState } from '../src/systems/procedural/campaign-copy-system.ts';
import { applyAction, compactCampaignForSave, createGameSession, createRunCampaign, restoreCompactCampaign } from '../src/systems/procedural/world-procedural-system.ts';
import { DEFAULT_WORLD_ATTRIBUTES } from '../src/systems/procedural/world-attributes.ts';

const make = () => createRunCampaign(739060, 1, 1, 2, 2, { worldAttributes: DEFAULT_WORLD_ATTRIBUTES });
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

test('generation ownership detaches caller metadata then shares only deeply frozen snapshots', () => {
  const source = make(), original = source.floor.generation!, snapshot = json(original);
  const copy = copyCampaignMutableState(source), owned = copy.floor.generation!;
  assert.notStrictEqual(owned, original); assert.deepEqual(owned, original);
  assert.equal(Object.isFrozen(original), false);
  for (const object of [owned, owned.topology!, owned.topology!.rooms, owned.topology!.rooms[0]!, owned.topology!.edges[0]!.path, owned.topology!.edges[0]!.path[0]!, owned.quality!, owned.quality!.issues]) assert.equal(Object.isFrozen(object), true);
  assert.throws(() => { owned.topology!.rooms[0]!.x = -100; }, TypeError);
  assert.throws(() => { owned.topology!.edges[0]!.path.push({ x: -1, y: -1 }); }, TypeError);
  assert.throws(() => { owned.quality!.issues.push({ code: 'mutation', message: 'mutation' }); }, TypeError);
  original.topology!.rooms[0]!.x = -200;
  assert.deepEqual(json(owned), snapshot);
  // Unknown mutable callers are not cached by identity, so intentional replacement
  // or editing of their inputs cannot accidentally reuse a stale owned snapshot.
  assert.equal(copyCampaignMutableState(source).floor.generation!.topology!.rooms[0]!.x, -200);
  const next = copyCampaignMutableState(copy);
  assert.strictEqual(next.floor.generation, owned);
  next.floor.generation = { ...owned, seed: 99 };
  const replaced = copyCampaignMutableState(next);
  assert.notStrictEqual(replaced.floor.generation, owned); assert.equal(replaced.floor.generation!.seed, 99);
  assert.equal(owned.seed, snapshot.seed);
});

test('actor, puzzle, resource, discovery and recovery state remain independently mutable', () => {
  const source = make();
  source.floors = { '2': source.floor };
  source.adventureBaseline = structuredClone(source); source.journeyCheckpoint = structuredClone(source);
  source.journeyCheckpoint.adventureBaseline = undefined;
  source.adventureBaseline.floor.generation = source.floor.generation;
  source.journeyCheckpoint.floor.generation = source.floor.generation;
  source.floor.objectSets = [{ id: 'copy-fixture', kind: 'floor-trigger-door-barrel', regionRole: 'optional-reward', barrel: { x: 1, y: 1 }, trigger: { x: 2, y: 1 }, door: { x: 3, y: 1 } }];
  const before = JSON.stringify(source), copy = copyCampaignMutableState(source);
  assert.strictEqual(copy.floor, copy.floors!['2']);
  assert.strictEqual(copy.floor.generation, copy.adventureBaseline!.floor.generation);
  assert.strictEqual(copy.floor.generation, copy.journeyCheckpoint!.floor.generation);
  assert.strictEqual(copy.floor.cells, source.floor.cells);
  copy.floor.entities[0]!.x = -1;
  copy.floor.objectSets![0]!.barrel.x = -2;
  copy.player.resources.health.current = 0;
  copy.discovery!['copy-fixture'] = 'new';
  copy.adventureBaseline!.player.resources.health.current = 0;
  copy.journeyCheckpoint!.counters.gold = 999;
  assert.equal(JSON.stringify(source), before);
  assert.notEqual(copy.journeyCheckpoint!.player.resources.health.current, 0);
  assert.notEqual(copy.adventureBaseline!.counters.gold, 999);
});

test('unrecognized mutable metadata types retain independent structured clone semantics', () => {
  const source = make();
  const generation = { ...source.floor.generation!, debug: new Map([['mutable', { value: 1 }]]) };
  source.floor.generation = generation;
  const copy = copyCampaignMutableState(source);
  const copied = copy.floor.generation as typeof generation;
  assert.notStrictEqual(copied, generation); assert.equal(Object.isFrozen(copied), false);
  copied.debug.get('mutable')!.value = 2;
  assert.equal(generation.debug.get('mutable')!.value, 1);
  source.floor.generation = 'historical-extension' as unknown as NonNullable<Floor['generation']>;
  assert.equal(copyCampaignMutableState(source).floor.generation, 'historical-extension');
});

test('owned metadata is excluded from subsequent structured clone payloads', () => {
  const owned = copyCampaignMutableState(make()), generation = owned.floor.generation;
  const clone = globalThis.structuredClone;
  let calls = 0;
  globalThis.structuredClone = ((value: unknown, options?: StructuredSerializeOptions) => {
    calls++;
    assert.equal(JSON.stringify(value).includes('exitAttachment'), false);
    return clone(value, options);
  }) as typeof clone;
  try {
    const copy = copyCampaignMutableState(owned);
    assert.strictEqual(copy.floor.generation, generation); assert.equal(calls, 1);
  } finally { globalThis.structuredClone = clone; }
});

test('sharing preserves gameplay results, compact-save contents and JSON reload isolation', () => {
  const initial = make();
  const baseline = structuredClone(initial), checkpoint = structuredClone(initial);
  initial.adventureBaseline = baseline; initial.journeyCheckpoint = checkpoint;
  const session = createGameSession(copyCampaignMutableState(initial), { getEnemyLogicDisabled: () => true });
  let control: Campaign = structuredClone(initial);
  const metadata = json(initial.floor.generation);
  for (let index = 0; index < 4; index++) {
    const previous = session.getState(), serialized = JSON.stringify(previous);
    const result = session.dispatch({ type: 'wait' })!;
    assert.ok('state' in result);
    control = applyAction(structuredClone(control), { type: 'wait' }, { enemyLogicDisabled: true }).state;
    assert.equal(JSON.stringify(previous), serialized);
    assert.deepEqual(json(result.state), json(control));
    assert.deepEqual(json(result.state.floor.generation), metadata);
  }
  const state = session.getState(), compact = compactCampaignForSave(state), expected = compactCampaignForSave(control);
  assert.deepEqual(json(compact), json(expected));
  const beforeSavedMutation = JSON.stringify(state);
  compact.adventureBaseline!.player.resources.health.current = 0;
  compact.journeyCheckpoint!.counters.gold = 999;
  assert.equal(JSON.stringify(state), beforeSavedMutation);
  const reloaded = restoreCompactCampaign(json(compact) as Campaign);
  assert.deepEqual(json(reloaded.floor.generation), metadata);
  const frozenReload = copyCampaignMutableState(reloaded);
  assert.notStrictEqual(frozenReload.floor.generation, state.floor.generation);
  assert.deepEqual(json(frozenReload.floor.generation), metadata);
  const detached = structuredClone(frozenReload.floor.generation) as NonNullable<Floor['generation']>;
  detached.topology!.rooms[0]!.x = -999;
  assert.deepEqual(json(state.floor.generation), metadata);
});
