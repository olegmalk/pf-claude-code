---
name: slack
description: Send messages, read threads, resolve users, and react in Slack
tools: ["Bash"]
---

# Slack Skill

Interact with Slack workspaces using xoxc browser tokens. No bot app required for most operations.

## Setup

Credentials in `~/.pf-claude-code/slack.env`:
```
SLACK_USER_TOKEN=xoxc-...
SLACK_COOKIE=xd-...
SLACK_BOT_TOKEN=xoxb-...  # optional, for lookupByEmail
SLACK_WORKSPACE_URL=https://yourworkspace.slack.com  # optional
```

See `skills/slack/README.md` for token extraction steps.

## Commands

Run from the `skills/slack/` directory:

```bash
bun run src/slack.ts send <channel> <text> [thread_ts]   # send message (always reply in threads)
bun run src/slack.ts thread <channel> <ts>                # read thread with resolved names
bun run src/slack.ts members <channel>                    # list active channel members
bun run src/slack.ts resolve <name-or-email>              # find user by email (needs bot token)
bun run src/slack.ts react <channel> <ts> <emoji>         # add emoji reaction
bun run src/slack.ts delete <channel> <ts>                # delete a message
```

## Message Formatting

Text is validated for Slack mrkdwn. Markdown syntax (`**bold**`, `[text](url)`, `# heading`) is auto-converted.

Use Slack mrkdwn natively:
- Bold: `*text*`
- Links: `<https://url|text>`
- Mentions: `<@U12345>`
- Code: `` `inline` `` or ` ```block``` `

## API Functions (import from client.ts)

| Function | Description |
|----------|-------------|
| `sendMessage(ch, text, thread_ts?)` | Send or reply |
| `updateMessage(ch, ts, text)` | Edit in-place |
| `deleteMessage(ch, ts)` | Delete |
| `reactToMessage(ch, ts, emoji)` | Add reaction |
| `removeReaction(ch, ts, emoji)` | Remove reaction |
| `peekThread(ch, ts)` | Full thread (parent + replies) |
| `readThread(ch, ts)` | Thread replies only |
| `readChannel(ch, limit?)` | Recent messages |
| `readChannelHistory(ch, oldest, latest?, limit?)` | Time-range query |
| `getMessage(ch, ts)` | Single message |
| `searchMessages(query, opts?)` | Search |
| `resolveUsers(ids[])` | IDs → names |
| `resolveChannelMembers(ch)` | Active members |
| `lookupByEmail(email)` | Email → user (bot token) |
| `lookupByEmails(emails[])` | Batch email lookup |
| `openDmChannel(userId)` | Open/get DM channel |
| `listRecentDMs(limit?)` | Recent DM channels |
| `slackPermalink(ch, ts)` | Build permalink URL |
| `authTest()` | Verify credentials |
