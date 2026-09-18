import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

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

async function getMemoryMongoUri(): Promise<string> {
  if (!global._memoryMongoServer) {
    global._memoryMongoServer = await MongoMemoryServer.create();
  }

  return global._memoryMongoServer.getUri();
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  const candidateUris: string[] = [];

  if (process.env.MONGODB_URI) {
    candidateUris.push(process.env.MONGODB_URI);
  }

  if (process.env.NODE_ENV !== "production") {
    candidateUris.push(await getMemoryMongoUri());
  }

  if (candidateUris.length === 0) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local"
    );
  }

  let lastError: unknown;

  for (const uri of candidateUris) {
    try {
      cached.promise = mongoose.connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 15000,
      });
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (error) {
      lastError = error;
      cached.promise = null;
      cached.conn = null;
    }
  }

  throw lastError ?? new Error("Database connection failed");
}

export default dbConnect;