import mongoose from "mongoose";

/**
 * `next dev` keeps compiled Mongoose models across hot reloads. If a model was
 * compiled before a field was added to its schema, the old copy is reused and
 * silently drops that field on every write. Call this just before a model is
 * registered to throw away such a stale copy.
 */
export function dropStaleModel(name: string, requiredPath: string): void {
  const existing = mongoose.models[name];
  if (existing && !existing.schema.path(requiredPath)) {
    mongoose.deleteModel(name);
  }
}
