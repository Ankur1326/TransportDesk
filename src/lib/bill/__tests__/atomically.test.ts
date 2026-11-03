import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { atomically } from "../../with-transaction";

/** A session stub whose withTransaction behaves like the driver on a given deployment. */
function stubSession(behaviour: "commit" | "unsupported" | "fail") {
  return {
    ended: false,
    async withTransaction(fn: () => Promise<void>) {
      if (behaviour === "unsupported") {
        throw Object.assign(new Error("Transaction numbers are only allowed on a replica set member or mongos"), { code: 20 });
      }
      await fn();
      if (behaviour === "fail") throw new Error("commit failed");
    },
    async endSession() {
      this.ended = true;
    },
  };
}

function withSession<T>(session: unknown, run: () => Promise<T>): Promise<T> {
  const original = mongoose.startSession;
  (mongoose as unknown as { startSession: unknown }).startSession = async () => session;
  return run().finally(() => {
    (mongoose as unknown as { startSession: unknown }).startSession = original;
  });
}

test("runs inside the transaction when supported", async () => {
  const session = stubSession("commit");
  let seen: unknown;
  const out = await withSession(session, () =>
    atomically(async (s) => {
      seen = s;
      return "done";
    })
  );
  assert.equal(out, "done");
  assert.equal(seen, session);
  assert.equal(session.ended, true);
});

test("standalone MongoDB: falls back to a session-less run", async () => {
  const session = stubSession("unsupported");
  let seen: unknown = "unset";
  const out = await withSession(session, () =>
    atomically(async (s) => {
      seen = s;
      return 42;
    })
  );
  assert.equal(out, 42);
  assert.equal(seen, undefined);
  assert.equal(session.ended, true);
});

test("standalone MongoDB: compensates when the work fails halfway", async () => {
  const session = stubSession("unsupported");
  let compensated = 0;
  await assert.rejects(
    withSession(session, () =>
      atomically(
        async () => {
          throw new Error("sync failed");
        },
        async () => {
          compensated += 1;
        }
      )
    ),
    /sync failed/
  );
  assert.equal(compensated, 1);
});

test("a real transaction error propagates without compensation", async () => {
  const session = stubSession("fail");
  let compensated = 0;
  await assert.rejects(
    withSession(session, () => atomically(async () => "x", async () => { compensated += 1; })),
    /commit failed/
  );
  assert.equal(compensated, 0);
});

test("a failing compensation does not hide the original error", async () => {
  const session = stubSession("unsupported");
  await assert.rejects(
    withSession(session, () =>
      atomically(
        async () => { throw new Error("original"); },
        async () => { throw new Error("compensation also failed"); }
      )
    ),
    /original/
  );
});
