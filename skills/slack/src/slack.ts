/**
 * Slack skill — CLI entry point.
 *
 * Usage:
 *   bun run src/slack.ts resolve <name>                    — find user by name
 *   bun run src/slack.ts send <channel> <text> [thread_ts] — send message
 *   bun run src/slack.ts thread <channel> <ts>             — read full thread
 *   bun run src/slack.ts members <channel>                 — list active members
 *   bun run src/slack.ts react <channel> <ts> <emoji>      — add reaction
 *   bun run src/slack.ts delete <channel> <ts>             — delete message
 */

import {
  resolveUsers,
  resolveChannelMembers,
  peekThread,
  sendMessage,
  reactToMessage,
  deleteMessage,
  slackPermalink,
  lookupByEmail,
} from "./client";

const [cmd, ...rawArgs] = process.argv.slice(2);
const args = rawArgs.map(a => a.replace(/\\n/g, "\n"));

async function resolve(query: string) {
  // Try email lookup first if query looks like an email
  if (query.includes("@")) {
    const user = await lookupByEmail(query);
    if (user) {
      console.log(JSON.stringify([{ slack_id: user.id, mention: `<@${user.id}>`, name: user.name }]));
      return;
    }
  }
  console.error(`No match for "${query}". Try an exact email address with SLACK_BOT_TOKEN configured.`);
  process.exit(1);
}

async function send(channel: string, text: string, threadTs?: string) {
  const ts = await sendMessage(channel, text, threadTs);
  console.log(JSON.stringify({ sent: true, ts, permalink: slackPermalink(channel, ts) }));
}

async function thread(channel: string, ts: string) {
  const { parent, replies } = await peekThread(channel, ts);
  const allMsgs = parent ? [parent, ...replies] : replies;
  const userIds = [...new Set(allMsgs.map((m: any) => m.user).filter(Boolean))];
  const users = await resolveUsers(userIds);
  const formatted = allMsgs.map((m: any) => ({
    user: users[m.user] || m.user,
    user_id: m.user,
    text: m.text,
    ts: m.ts,
  }));
  console.log(JSON.stringify({ channel, thread_ts: ts, permalink: slackPermalink(channel, ts), messages: formatted }));
}

async function members(channel: string) {
  const result = await resolveChannelMembers(channel);
  const entries = Object.entries(result).map(([id, name]) => ({ slack_id: id, mention: `<@${id}>`, name }));
  console.log(JSON.stringify(entries));
}

async function react(channel: string, ts: string, emoji: string) {
  await reactToMessage(channel, ts, emoji);
  console.log(JSON.stringify({ reacted: true, channel, ts, emoji }));
}

async function del(channel: string, ts: string) {
  await deleteMessage(channel, ts);
  console.log(JSON.stringify({ deleted: true, channel, ts }));
}

async function main() {
  switch (cmd) {
    case "resolve":
      if (!args[0]) { console.error("Usage: resolve <name-or-email>"); process.exit(1); }
      await resolve(args.join(" "));
      break;
    case "send":
      if (!args[0] || !args[1]) { console.error("Usage: send <channel> <text> [thread_ts]"); process.exit(1); }
      await send(args[0], args[1], args[2]);
      break;
    case "react":
      if (!args[0] || !args[1] || !args[2]) { console.error("Usage: react <channel> <ts> <emoji>"); process.exit(1); }
      await react(args[0], args[1], args[2]);
      break;
    case "delete":
      if (!args[0] || !args[1]) { console.error("Usage: delete <channel> <ts>"); process.exit(1); }
      await del(args[0], args[1]);
      break;
    case "thread":
      if (!args[0] || !args[1]) { console.error("Usage: thread <channel> <ts>"); process.exit(1); }
      await thread(args[0], args[1]);
      break;
    case "members":
      if (!args[0]) { console.error("Usage: members <channel>"); process.exit(1); }
      await members(args[0]);
      break;
    default:
      console.error("Commands: resolve | send | react | delete | thread | members");
      process.exit(1);
  }
}

main();
