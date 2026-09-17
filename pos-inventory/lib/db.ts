// lib/db.ts
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const MONGODB_URI = process.env.MONGODB_URI ?? "";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
  var _memoryMongoServer: MongoMemoryServer | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };

if (!global._mongoose) {
  global._mongoose = cached;
}

async function ensureMemoryMongo(): Promise<string> {
  if (!global._memoryMongoServer) {
    global._memoryMongoServer = await MongoMemoryServer.create();
  }

  return global._memoryMongoServer.getUri();
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const candidates: string[] = [];

  if (MONGODB_URI) {
    candidates.push(MONGODB_URI);
  }

  if (process.env.NODE_ENV !== "production") {
    candidates.push(await ensureMemoryMongo());
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