import type { Model } from "mongoose";

const done = new Map<string, Promise<void>>();

/**
 * Drops an old single-field UNIQUE index (e.g. Customer `name_1`, Bill
 * `billNo_1`) so uniqueness can be per company instead of global. Runs once
 * per process; harmless if the index is already gone.
 */
export function dropLegacyUniqueIndex(model: Model<any>, field: string): Promise<void> {
  const key = `${model.modelName}:${field}`;
  let promise = done.get(key);
  if (!promise) {
    promise = (async () => {
      try {
        const indexes = await model.collection.indexes();
        const legacy = indexes.filter(
          (i) => i.unique === true && Object.keys(i.key).length === 1 && (i.key as Record<string, unknown>)[field] === 1
        );
        for (const index of legacy) {
          if (index.name) await model.collection.dropIndex(index.name).catch(() => undefined);
        }
      } catch (error) {
        // Collection doesn't exist yet (code 26) -> nothing to drop.
        if ((error as { code?: number })?.code !== 26) throw error;
      }
      await model.createIndexes().catch(() => undefined);
    })();
    done.set(key, promise);
    promise.catch(() => done.delete(key)); // retry on the next request if it failed
  }
  return promise;
}
