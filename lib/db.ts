import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI environment variable is not set");
}

// Extend globalThis so TypeScript accepts the cache property in strict mode.
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

// Re-use the cached promise across hot-reloads in Next.js dev mode.
const connectionPromise: Promise<typeof mongoose> =
  globalThis._mongooseConnectionPromise ??
  mongoose.connect(uri, { bufferCommands: false });

if (process.env.NODE_ENV !== "production") {
  globalThis._mongooseConnectionPromise = connectionPromise;
}

export async function connectDB(): Promise<void> {
  await connectionPromise;
}
