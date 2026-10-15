import { actor, db, handle, json } from "@/lib/server";
import { z } from "zod";
import type { ActivityAutomation, ActivityEvent, ActivityPage } from "@/lib/activity-types";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().trim().max(200).default(""),
  automation: z.union([z.literal("all"), z.string().uuid()]).default("all"),
  status: z.enum(["all", "sent", "pending", "attention", "failed", "needs_review", "skipped", "expired", "limit_reached", "test_matched", "test_no_match"]).default("all"),
  trigger: z.enum(["all", "comment", "message"]).default("all"),
  source: z.enum(["all", "live", "test"]).default("all"),
  from: z.coerce.number().int().min(0).max(8640000000000000).optional(),
  until: z.coerce.number().int().min(0).max(8640000000000000).optional(),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
}).refine(q => q.from === undefined || q.until === undefined || q.from < q.until, { message: "Choose an end date after the start date." });

export function GET(request: Request) {
  return handle(async () => {
    const user = await actor(request);
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const store = db();
    const conditions = ["a.user_id=?"];
    const args: (string | number)[] = [user.userId];
    if (query.automation !== "all") { conditions.push("a.campaign_id=?"); args.push(query.automation); }
    if (query.trigger !== "all") { conditions.push("a.trigger=?"); args.push(query.trigger); }
    if (query.source !== "all") conditions.push(query.source === "test" ? "a.test=1" : "a.test=0");
    if (query.status === "pending") conditions.push("a.test=0 AND a.status IN ('queued','processing')");
    else if (query.status === "attention") conditions.push("a.test=0 AND a.status IN ('failed','needs_review','expired','limit_reached')");
    else if (query.status !== "all") { conditions.push("a.status=?"); args.push(query.status); }
    if (query.from !== undefined) { conditions.push("a.created_at>=?"); args.push(query.from); }
    if (query.until !== undefined) { conditions.push("a.created_at<?"); args.push(query.until); }
    if (query.q) {
      const escaped = "%" + query.q.replace(/[\\%_]/g, "\\$&") + "%";
      conditions.push("(a.text LIKE ? ESCAPE '\\' OR a.campaign_name LIKE ? ESCAPE '\\' OR a.sender_username LIKE ? ESCAPE '\\' OR a.sender_id LIKE ? ESCAPE '\\' OR a.reply_text LIKE ? ESCAPE '\\')");
      args.push(...Array(5).fill(escaped));
    }
    const source = "FROM activities a WHERE " + conditions.join(" AND ");
    const [counts, history] = await Promise.all([
      store.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN a.test=0 AND a.status='sent' THEN 1 ELSE 0 END),0) AS accepted,COALESCE(SUM(CASE WHEN a.test=0 AND a.status IN ('queued','processing') THEN 1 ELSE 0 END),0) AS pending,COALESCE(SUM(CASE WHEN a.test=0 AND a.status IN ('failed','needs_review','expired','limit_reached') THEN 1 ELSE 0 END),0) AS attention,COALESCE(SUM(CASE WHEN a.test=1 THEN 1 ELSE 0 END),0) AS tests " + source).bind(...args).first<ActivityPage["summary"]>(),
      // SQLite returns the name/trigger from the latest row associated with MAX.
      store.prepare("SELECT campaign_id AS id,campaign_name AS name,trigger,MAX(created_at) AS lastEventAt FROM activities WHERE user_id=? AND campaign_id<>'' GROUP BY campaign_id ORDER BY lastEventAt DESC").bind(user.userId).all<ActivityAutomation>(),
    ]);
    const summary = counts || { total: 0, accepted: 0, pending: 0, attention: 0, tests: 0 };
    const pageSize = 25, pages = Math.max(1, Math.ceil(summary.total / pageSize));
    const page = Math.min(query.page, pages);
    const rows = await store.prepare("SELECT a.id,a.campaign_id AS campaignId,a.campaign_name AS campaignName,a.text,a.status,a.reason,a.created_at AS createdAt,a.test,a.trigger,a.event_at AS eventAt,a.attempt_at AS attemptAt,a.accepted_at AS acceptedAt,a.sender_id AS senderId,a.sender_username AS senderUsername,a.media_id AS mediaId,a.matched_keyword AS matchedKeyword,a.reply_text AS replyText,a.instagram_message_id AS instagramMessageId " + source + " ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?").bind(...args, pageSize, (page - 1) * pageSize).all<ActivityEvent>();
    return json({ items: rows.results, automations: history.results.map(({ id, name, trigger }) => ({ id, name, trigger })), summary, page, pageSize, pages, asOf: Date.now() } satisfies ActivityPage);
  });
}
