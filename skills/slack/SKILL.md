---
name: slack
description: Send and read Slack messages using your personal Slack identity via xoxc + d cookie. No bot accounts, no admin. Use when asked to message, read threads, resolve users, or react in Slack.
---

# Slack Skill

Send messages, read threads, resolve users, and react in Slack.

**Input:** `$ARGUMENTS` — what to do (e.g., "message Michael in thread 1770907663.761449 asking for PR review")

## Workflow

1. **Resolve people** — before composing ANY message, resolve every person mentioned:
   ```bash
   bun run src/slack.ts resolve "user@company.com"
   ```
   Returns verified `slack_id` + `<@ID>` mention. **Never guess or remember user IDs** — always resolve first.

2. **Gather context** — if replying to a thread, read it first:
   ```bash
   bun run src/slack.ts thread <channel> <ts>
   ```

3. **Compose message** — use only verified `<@ID>` mentions from step 1. Follow Slack mrkdwn rules (below).

4. **Draft and confirm.** Show the destination, full message text, and people tagged. Ask before sending.

5. **Send:**
   ```bash
   bun run src/slack.ts send <channel> "<text>" [thread_ts]
   ```

6. **On feedback** — revise and present again.

## Other Commands

```bash
bun run src/slack.ts resolve <email>              # look up user
bun run src/slack.ts thread <channel> <ts>        # read thread with resolved names
bun run src/slack.ts members <channel>            # list active members
bun run src/slack.ts react <channel> <ts> <emoji> # add reaction
bun run src/slack.ts delete <channel> <ts>        # delete message
```

## Slack mrkdwn Formatting

Slack uses mrkdwn, NOT standard Markdown:
- **Links**: `<https://example.com|display text>` (NOT `[text](url)`)
- **Bold**: `*bold*` (single asterisk, NOT `**`)
- **Italic**: `_italic_`
- **Bold link**: `*<https://example.com|text>*`
- **User mention**: `<@U01SLHHQHD5>`
- **Channel mention**: `<#C0ADR4VF4KY>`

Markdown syntax is auto-converted, but prefer native mrkdwn.

## API Quick Reference

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
| `getMessage(ch, ts)` | Single message |
| `searchMessages(query, opts?)` | Search |
| `resolveUsers(ids[])` | IDs → names |
| `lookupByEmail(email)` | Email → user (bot token) |
| `slackPermalink(ch, ts)` | Build permalink URL |

## Common Mistakes

- `peekThread` returns `{ parent, replies }` — NOT an array. Destructure: `const { parent, replies } = await peekThread(ch, ts)`
- `users.lookupByEmail` fails with user token — always use `lookupByEmail()` which uses bot token internally.
- `updateMessage` may escape `<>` in links. Prefer delete + resend when message contains links.

## Slack URL → Timestamp

Slack permalink format: `p1770889672443569` → remove `p`, insert `.` before last 6 digits → `1770889672.443569`

```
url.replace(/^p/, '').replace(/(\d{6})$/, '.$1')
```

All functions expect the dotted format (e.g. `1770889672.443569`), never the `p`-prefixed URL format.
