import { getDb } from "./mongodb";

export interface BanEntry {
  _id?: unknown;
  clientId: string;
  bannedAt: number;
  reason?: string;
}

// Returns true if the given clientId is currently banned.
export async function isBanned(clientId: string): Promise<boolean> {
  if (!clientId) return false;
  try {
    const db = await getDb();
    const doc = await db.collection("banned").findOne({ clientId });
    return !!doc;
  } catch {
    return false;
  }
}

// Set or clear a ban for a clientId.
export async function setBanned(
  clientId: string,
  banned: boolean,
  reason?: string
): Promise<void> {
  const db = await getDb();
  if (banned) {
    await db
      .collection("banned")
      .updateOne(
        { clientId },
        { $set: { clientId, bannedAt: Date.now(), reason: reason || "" } },
        { upsert: true }
      );
  } else {
    await db.collection("banned").deleteOne({ clientId });
  }
}

// List all banned clientIds.
export async function listBanned(): Promise<string[]> {
  try {
    const db = await getDb();
    const docs = await db.collection("banned").find({}).toArray();
    return docs.map((d: any) => d.clientId as string);
  } catch {
    return [];
  }
}
