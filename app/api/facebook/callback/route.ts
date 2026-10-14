import { connectionError, consumeState, facebookAccounts, storePending } from "@/lib/meta";
export async function GET(request: Request) {
  try {
    const state = await consumeState(request, "facebook");
    return await storePending(request, state, await facebookAccounts(request));
  } catch (error) { return connectionError(request, error); }
}
