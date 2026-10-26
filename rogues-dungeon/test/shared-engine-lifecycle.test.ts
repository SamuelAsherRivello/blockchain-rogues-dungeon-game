import assert from "node:assert/strict";
import test from "node:test";
import { createSharedEngineLifecycle } from "../src/systems/rendering/shared-engine-lifecycle.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

test("canceling a pending preview preserves the engine reserved by game and minimap", async () => {
  const creation = deferred<{ disposed: boolean }>();
  const engine = { disposed: false };
  let creates = 0, starts = 0, disposals = 0;
  const lifecycle = createSharedEngineLifecycle({
    create: async (_canvas: string) => { creates++; return creation.promise; },
    start: async (value) => { assert.equal(value.disposed, false); starts++; },
    dispose: (value) => { value.disposed = true; disposals++; },
  });
  const preview = lifecycle.acquire("preview").then(lease => { lease.release(); lease.release(); });
  const game = lifecycle.acquire("game"), minimap = lifecycle.acquire("minimap");
  creation.resolve(engine);
  await preview;
  const [gameLease, minimapLease] = await Promise.all([game, minimap]);
  assert.equal(creates, 1);
  assert.equal(disposals, 0);
  assert.equal(gameLease.engine, engine);
  assert.equal(minimapLease.engine, engine);
  assert.equal(gameLease.primaryCanvas, "preview");
  // Neither remaining view owns the original canvas, but either can start it.
  await Promise.all([gameLease.start(), minimapLease.start(), gameLease.start()]);
  assert.equal(starts, 1);
  gameLease.release(); gameLease.release();
  assert.equal(disposals, 0);
  minimapLease.release();
  assert.equal(disposals, 1);
});

test("failed creation releases all reservations without clearing its replacement", async () => {
  const creation = deferred<{ id: number }>();
  const failure = new Error("adapter unavailable");
  let creates = 0, disposals = 0;
  const lifecycle = createSharedEngineLifecycle({
    create: async (_canvas: string) => ++creates === 1 ? creation.promise : { id: creates },
    start: async () => {},
    dispose: () => { disposals++; },
  });
  const first = lifecycle.acquire("preview").catch(error => {
    assert.equal(error, failure);
    return lifecycle.acquire("replacement");
  });
  const second = assert.rejects(lifecycle.acquire("game"), failure);
  creation.reject(failure);
  const [replacement] = await Promise.all([first, second]);
  const follower = await lifecycle.acquire("minimap");
  assert.equal(creates, 2);
  assert.equal(replacement.engine, follower.engine);
  replacement.release(); follower.release();
  assert.equal(disposals, 1);
});

test("startup failure is shared once and a later engine can start after cleanup", async () => {
  const failure = new Error("first frame failed");
  let creates = 0, starts = 0, disposals = 0;
  const lifecycle = createSharedEngineLifecycle({
    create: async (_canvas: string) => ({ id: ++creates }),
    start: async (engine) => { starts++; if (engine.id === 1) throw failure; },
    dispose: () => { disposals++; },
  });
  const [preview, game] = await Promise.all([lifecycle.acquire("preview"), lifecycle.acquire("game")]);
  await Promise.all([assert.rejects(preview.start(), failure), assert.rejects(game.start(), failure)]);
  assert.equal(starts, 1);
  preview.release(); game.release();
  assert.equal(disposals, 1);
  const replacement = await lifecycle.acquire("new game");
  await replacement.start();
  assert.equal(starts, 2);
  replacement.release();
  assert.equal(disposals, 2);
});

test("canceling the last consumer before scheduled startup never starts its disposed engine", async () => {
  let starts = 0, disposals = 0;
  const lifecycle = createSharedEngineLifecycle({
    create: async (_canvas: string) => ({}),
    start: async () => { starts++; },
    dispose: () => { disposals++; },
  });
  const preview = await lifecycle.acquire("preview");
  const starting = preview.start();
  preview.release();
  await assert.rejects(starting, /disposed shared engine/);
  assert.equal(starts, 0);
  assert.equal(disposals, 1);
  await assert.rejects(preview.start(), /released engine lease/);
});
