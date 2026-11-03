import mongoose, { type ClientSession } from "mongoose";

function transactionsUnsupported(error: unknown): boolean {
  const e = error as { code?: number; codeName?: string; message?: string } | null;
  return (
    e?.code === 20 ||
    e?.codeName === "IllegalOperation" ||
    /Transaction numbers are only allowed|replica set|transactions? (is|are) not supported/i.test(e?.message ?? "")
  );
}

/**
 * Runs `work` as one MongoDB transaction when the deployment supports it
 * (replica set / Atlas), so a bill write and its LR sync commit or fail
 * together.
 *
 * On a standalone server (no transactions) `work` runs without a session and,
 * if it throws, `compensate` is called to undo what was already written.
 */
export async function atomically<T>(
  work: (session?: ClientSession) => Promise<T>,
  compensate?: () => Promise<void>
): Promise<T> {
  let session: ClientSession | undefined;
  try {
    session = await mongoose.startSession();
  } catch {
    session = undefined;
  }

  if (session) {
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      if (!transactionsUnsupported(error)) throw error;
      // fall through to the non-transactional path
    } finally {
      await session.endSession();
    }
  }

  try {
    return await work(undefined);
  } catch (error) {
    if (compensate) {
      try {
        await compensate();
      } catch (compensateError) {
        console.error("Rollback after a failed bill write also failed:", compensateError);
      }
    }
    throw error;
  }
}
