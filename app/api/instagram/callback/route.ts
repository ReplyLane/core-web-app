import { connectionError, consumeState, finishConnection, instagramAccount } from "@/lib/meta";
export async function GET(request: Request) {
  try {
    const state = await consumeState(request, "instagram");
    const account = await instagramAccount(request);
    return await finishConnection(request, state, "instagram", account, account.id);
  } catch (error) { return connectionError(request, error); }
}
