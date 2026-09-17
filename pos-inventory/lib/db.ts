// lib/db.ts
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const MONGODB_URI = process.env.MONGODB_URI ?? "";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
  var _memoryMongoServer: MongoMemoryReplSet | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };

if (!global._mongoose) {
  global._mongoose = cached;
}

async function ensureMemoryMongo(): Promise<string> {
  if (!global._memoryMongoServer) {
    global._memoryMongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
  }

  return global._memoryMongoServer.getUri();
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const candidates: string[] = [];
  const supportsTransactions = MONGODB_URI.startsWith("mongodb+srv://") || MONGODB_URI.includes("replicaSet=");

  if (MONGODB_URI && (process.env.NODE_ENV === "production" || supportsTransactions)) {
    candidates.push(MONGODB_URI);
  }

  if (process.env.NODE_ENV !== "production") {
    candidates.push(await ensureMemoryMongo());
  }

  if (MONGODB_URI && !candidates.includes(MONGODB_URI)) {
    candidates.push(MONGODB_URI);
  }

  if (candidates.length === 0) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local"
    );
  }

  let lastError: unknown;

  for (const uri of candidates) {
    if (cached.promise) {
      cached.promise = null;
    }

    try {
      cached.promise = mongoose.connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 15000,
      });
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (err) {
      lastError = err;
      cached.promise = null;
      cached.conn = null;
    }
  }

  throw lastError ?? new Error("Database connection failed");
}

export default dbConnect;