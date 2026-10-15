export type ActivityEvent = {
  id: string;
  campaignId: string;
  campaignName: string;
  text: string;
  status: string;
  reason: string;
  createdAt: number;
  test: number;
  trigger: string;
  eventAt: number;
  attemptAt: number;
  acceptedAt: number;
  senderId: string;
  senderUsername: string;
  mediaId: string;
  matchedKeyword: string;
  replyText: string;
  instagramMessageId: string;
};

export type ActivityAutomation = { id: string; name: string; trigger: string };
export type ActivityPage = {
  items: ActivityEvent[];
  automations: ActivityAutomation[];
  summary: { total: number; accepted: number; pending: number; attention: number; tests: number };
  page: number;
  pageSize: number;
  pages: number;
  asOf: number;
};
