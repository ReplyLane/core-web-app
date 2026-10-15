import { sleep } from "workflow";
import { start } from "workflow/api";
import { deliverOne } from "@/lib/delivery";
import { db, settings } from "@/lib/server";

export async function drainDeliveries(userId?: string) {
  "use workflow";
  for (let i = 0; i < 1100; i++) {
    if (!await processNext(userId)) return;
    await sleep("20s");
  }
  await start(drainDeliveries, [userId]);
}

async function processNext(userId?: string) {
  "use step";
  if (!settings().live) return false;
  await deliverOne(userId);
  const pending = await db().prepare("SELECT COUNT(*) AS count FROM activities WHERE test=0 AND status IN ('queued','processing')" + (userId ? " AND user_id=?" : "")).bind(...(userId ? [userId] : [])).first<{count: number}>();
  return !!pending?.count;
}
