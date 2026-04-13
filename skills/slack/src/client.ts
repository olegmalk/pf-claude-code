import { getSlackConfig, type SlackConfig } from "./config";
import { validateSlackMrkdwn, fixSlackMrkdwn } from "./formatting";

let _cfg: SlackConfig | null = null;
function cfg(): SlackConfig {
  if (!_cfg) _cfg = getSlackConfig();
  return _cfg;
}

async function slackFetch(method: string, params: Record<string, string>): Promise<any> {
  const c = cfg();
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${c.token}`,
      "Cookie": `d=${encodeURIComponent(c.cookie)}`,
    },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json() as any;
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error}`);
  return data;
}

async function slackBotFetch(method: string, params: Record<string, string>): Promise<any> {
  const c = cfg();
  if (!c.botToken) throw new Error(`${method} requires SLACK_BOT_TOKEN (xoxb-). See README.md.`);
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${c.botToken}`,
    },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json() as any;
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error}`);
  return data;
}

// In-memory user cache (name lookups)
const userCache = new Map<string, string>();

export function slackPermalink(channelId: string, ts: string, workspaceUrl?: string): string {
  const base = workspaceUrl || _cfg?.workspaceUrl || process.env.SLACK_WORKSPACE_URL || "https://propertyfinder.slack.com";
  return `${base}/archives/${channelId}/p${ts.replace(".", "")}`;
}

export async function authTest() {
  return slackFetch("auth.test", {});
}

export async function readChannel(channel: string, limit = 20) {
  const data = await slackFetch("conversations.history", { channel, limit: String(limit) });
  return (data.messages as any[]) || [];
}

export async function getRecentMessages(channel: string, limit = 50): Promise<any[]> {
  const data = await slackFetch("conversations.history", { channel, limit: String(limit) });
  return (data.messages as any[]) || [];
}

export async function readChannelHistory(channel: string, oldestTs: string, latestTs?: string, limit = 200): Promise<any[]> {
  const allMessages: any[] = [];
  let cursor: string | undefined;
  do {
    const params: Record<string, string> = { channel, oldest: oldestTs, limit: String(Math.min(limit - allMessages.length, 200)), inclusive: "true" };
    if (latestTs) params.latest = latestTs;
    if (cursor) params.cursor = cursor;
    const data = await slackFetch("conversations.history", params);
    allMessages.push(...((data.messages as any[]) || []));
    cursor = data.response_metadata?.next_cursor;
  } while (cursor && allMessages.length < limit);
  return allMessages;
}

export async function getMessage(channel: string, ts: string): Promise<any | null> {
  const data = await slackFetch("conversations.history", {
    channel, latest: ts, oldest: ts, inclusive: "true", limit: "1",
  });
  return data.messages?.[0] || null;
}

export async function peekThread(channel: string, threadTs: string): Promise<{ parent: any | null; replies: any[] }> {
  const data = await slackFetch("conversations.replies", { channel, ts: threadTs, limit: "200" });
  const messages = (data.messages as any[]) || [];
  const parent = messages.find((m: any) => m.ts === threadTs) || null;
  const replies = messages.filter((m: any) => m.ts !== threadTs);
  return { parent, replies };
}

export async function readThread(channel: string, threadTs: string): Promise<any[]> {
  const data = await slackFetch("conversations.replies", { channel, ts: threadTs, limit: "200" });
  const messages = (data.messages as any[]) || [];
  return messages.filter((m: any) => m.ts !== threadTs);
}

export async function searchMessages(query: string, opts?: { count?: number; sort?: "timestamp" | "score" }): Promise<{ messages: any[]; total: number }> {
  const data = await slackFetch("search.messages", {
    query, count: String(opts?.count || 20), sort: opts?.sort || "timestamp",
  });
  return { messages: data.messages?.matches || [], total: data.messages?.total || 0 };
}

function autoFixMrkdwn(text: string): string {
  try {
    validateSlackMrkdwn(text);
    return text;
  } catch {
    text = fixSlackMrkdwn(text);
    validateSlackMrkdwn(text);
    return text;
  }
}

export async function sendMessage(channel: string, text: string, thread_ts?: string, reply_broadcast = false): Promise<string> {
  text = autoFixMrkdwn(text);
  const params: Record<string, string> = { channel, text };
  if (thread_ts) params.thread_ts = thread_ts;
  if (reply_broadcast) params.reply_broadcast = "true";
  const data = await slackFetch("chat.postMessage", params);
  return data.ts as string;
}

export async function updateMessage(channel: string, ts: string, text: string): Promise<void> {
  text = autoFixMrkdwn(text);
  await slackFetch("chat.update", { channel, ts, text });
}

export async function deleteMessage(channel: string, ts: string): Promise<void> {
  await slackFetch("chat.delete", { channel, ts });
}

export async function reactToMessage(channel: string, ts: string, emoji: string): Promise<void> {
  try {
    await slackFetch("reactions.add", { channel, name: emoji, timestamp: ts });
  } catch (e: any) {
    if (!e.message?.includes("already_reacted") && !e.message?.includes("message_not_found")) throw e;
  }
}

export async function removeReaction(channel: string, ts: string, emoji: string): Promise<void> {
  try {
    await slackFetch("reactions.remove", { channel, name: emoji, timestamp: ts });
  } catch (e: any) {
    if (!e.message?.includes("no_reaction")) throw e;
  }
}

export async function resolveUsers(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds)];
  const result: Record<string, string> = {};
  const toFetch: string[] = [];
  for (const id of unique) {
    const cached = userCache.get(id);
    if (cached) { result[id] = cached; } else { toFetch.push(id); }
  }
  for (const id of toFetch) {
    try {
      const data = await slackFetch("users.info", { user: id });
      const name = data.user?.real_name || data.user?.name || id;
      userCache.set(id, name);
      result[id] = name;
    } catch {
      userCache.set(id, id);
      result[id] = id;
    }
  }
  return result;
}

export async function resolveChannelMembers(channel: string): Promise<Record<string, string>> {
  const msgs = await readChannel(channel, 50);
  const ids = [...new Set(msgs.map((m: any) => m.user).filter(Boolean))];
  return resolveUsers(ids);
}

export async function lookupByEmail(email: string): Promise<{ id: string; name: string } | null> {
  try {
    const data = await slackBotFetch("users.lookupByEmail", { email });
    const name = data.user?.real_name || data.user?.name || email;
    userCache.set(data.user.id, name);
    return { id: data.user.id, name };
  } catch {
    return null;
  }
}

export async function lookupByEmails(emails: string[]): Promise<Record<string, { id: string; name: string }>> {
  const result: Record<string, { id: string; name: string }> = {};
  for (const email of emails) {
    const user = await lookupByEmail(email);
    if (user) result[email] = user;
  }
  return result;
}

export async function openDmChannel(userId: string): Promise<string> {
  const data = await slackFetch("conversations.open", { users: userId });
  return data.channel.id as string;
}

export async function listRecentDMs(limit = 20): Promise<{ id: string; user: string; updated: number }[]> {
  const data = await slackFetch("conversations.list", { types: "im", limit: String(limit) });
  return ((data.channels as any[]) || [])
    .filter((c: any) => !c.is_archived)
    .map((c: any) => ({ id: c.id, user: c.user, updated: c.updated || 0 }));
}
