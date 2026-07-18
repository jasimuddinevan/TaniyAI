import "./dns-setup";
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  // We throw lazily (inside getDb) so the app still builds without the var set.
  console.warn("[mongodb] MONGODB_URI is not set; persistence is disabled.");
}

// Reuse the client across hot-reloads / serverless invocations.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }
  if (clientPromise) return clientPromise;
  if (global._mongoClientPromise) {
    clientPromise = global._mongoClientPromise;
    return clientPromise;
  }
  client = new MongoClient(uri);
  clientPromise = client.connect();
  global._mongoClientPromise = clientPromise;
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getClientPromise();
  return c.db("taniyai");
}

export interface StoredConversation {
  _id?: string;
  clientId: string;
  id: string;
  title: string;
  messages: unknown[];
  updatedAt: number;
}
