import { getDb } from "./mongodb";
import { getSessionAccount, ownsClientId } from "./auth";

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

// Server-enforced ban check. If the request is authenticated, we check every
// clientId owned by the account (so a banned user cannot evade the ban by
// regenerating their clientId). Otherwise we fall back to the supplied one.
export async function isBannedRequest(
  req: any,
  clientId: string
): Promise<boolean> {
  const account = await getSessionAccount(req);
  if (account) {
    const list: string[] = (account as any).clientIds || [];
    for (const cid of list) {
      if (await isBanned(cid)) return true;
    }
    if (account.clientId && (await isBanned(account.clientId))) return true;
    return false;
  }
  return isBanned(clientId);
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
