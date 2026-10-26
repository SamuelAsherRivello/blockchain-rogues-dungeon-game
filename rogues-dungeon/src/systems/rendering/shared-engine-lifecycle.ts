interface EngineLease<Engine, Canvas> {
  engine: Engine;
  primaryCanvas: Canvas;
  start(): Promise<void>;
  release(): void;
}

/** Pending acquisitions own a reference before engine creation can settle. */
export function createSharedEngineLifecycle<Engine, Canvas>(operations: {
  create(canvas: Canvas): Promise<Engine>;
  start(engine: Engine): Promise<void>;
  dispose(engine: Engine): void;
}) {
  interface Record {
    primaryCanvas: Canvas;
    ready: Promise<Engine>;
    engine?: Engine;
    references: number;
    disposed: boolean;
    starting?: Promise<void>;
  }
  let current: Record | null = null;
  const release = (record: Record) => {
    record.references--;
    if (record.references || record.disposed) return;
    record.disposed = true;
    if (current === record) current = null;
    if (record.engine !== undefined) operations.dispose(record.engine);
  };
  return {
    async acquire(canvas: Canvas): Promise<EngineLease<Engine, Canvas>> {
      if (!current) {
        const record: Record = { primaryCanvas: canvas, references: 0, disposed: false, ready: null! };
        current = record;
        record.ready = Promise.resolve().then(() => operations.create(canvas)).then(engine => {
          record.engine = engine;
          return engine;
        });
      }
      const record = current;
      record.references++;
      let engine: Engine;
      try { engine = await record.ready; }
      catch (error) {
        // A failed acquisition must not clear a newer engine's record.
        if (current === record) current = null;
        release(record);
        throw error;
      }
      let released = false;
      return {
        engine,
        primaryCanvas: record.primaryCanvas,
        start() {
          if (released) return Promise.reject(new Error("Cannot start a released engine lease."));
          // Any live surface may start the engine, including after its original
          // preview canvas unmounts. Cache failures until all leases release it.
          return record.starting ??= Promise.resolve().then(() => {
            if (record.disposed) throw new Error("Cannot start a disposed shared engine.");
            return operations.start(engine);
          });
        },
        release() {
          if (released) return;
          released = true;
          release(record);
        },
      };
    },
  };
}
