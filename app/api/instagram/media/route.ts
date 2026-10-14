import { handle, json, runtime } from "@/lib/server";
import { connectedAccount, graphHost, metaRequest, safeImage } from "@/lib/meta";
export function GET(request: Request) {
  return handle(async () => {
    const account = await connectedAccount(request);
    const url = new URL(`${graphHost(account.provider)}/${runtime().META_API_VERSION}/${account.instagram_id}/media`);
    url.search = new URLSearchParams({ fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp", limit: "24" }).toString();
    const value = await metaRequest<{ data: { id: string; caption?: string; media_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string }[] }>(url, account.token);
    return json({ media: (Array.isArray(value.data) ? value.data : []).filter(m => /^\d+$/.test(m.id)).map(m => ({ id: m.id, caption: m.caption?.slice(0,160) || "Untitled post", type: m.media_type, image: safeImage(m.thumbnail_url || (m.media_type === "VIDEO" ? "" : m.media_url)), permalink: safeImage(m.permalink) })) });
  });
}
