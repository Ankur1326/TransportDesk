import mongoose from "mongoose";

/**
 * Cached connection promise (survives hot reloads in dev and is shared by
 * concurrent requests, so a burst of sign-ins opens one connection, not many).
 *
 * Previous behaviour, now fixed:
 *  - a failed connection called process.exit(1), taking the whole server down
 *    and turning a brief DB blip into an outage — it now throws, so only the
 *    affected request fails and the next one retries;
 *  - the full MONGODB_URI (including the password) was written to the logs on
 *    every connect.
 *
 * The database name still defaults to "UTS" so existing data is untouched;
 * set MONGODB_DB_NAME to use a different one.
 */
const globalCache = globalThis as unknown as { __mongoose?: Promise<typeof mongoose> };

async function dbConnect(): Promise<void> {
    if (mongoose.connection.readyState === 1) return;

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");

    if (!globalCache.__mongoose) {
        const dbName = process.env.MONGODB_DB_NAME || "UTS";
        globalCache.__mongoose = mongoose.connect(`${uri}/${dbName}`).catch((error) => {
            globalCache.__mongoose = undefined; // allow the next request to retry
            console.error("Database connection failed:", error instanceof Error ? error.message : error);
            throw error;
        });
    }

    await globalCache.__mongoose;
}

export default dbConnect;
