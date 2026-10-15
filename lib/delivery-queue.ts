import { start } from "workflow/api";
import { drainDeliveries } from "@/workflows/delivery";
import { runtime, settings } from "./server";

export async function scheduleDelivery(userId?: string) {
  if (!settings().live || runtime().DELIVERY_WORKFLOW_ENABLED !== "true") return null;
  const run = await start(drainDeliveries, [userId]);
  return run.runId;
}
