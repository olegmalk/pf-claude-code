# Slack Skill

Claude Code skill to send/read Slack messages from the terminal using your personal Slack identity. No bot accounts, no admin approval needed.

## Prerequisites

- [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

## Extract Browser Tokens

1. Open **Slack in your browser** (not the desktop app) and log in.
2. Open DevTools (F12) → **Console** tab.
3. Paste to extract your `xoxc-` token:
   ```js
   JSON.parse(localStorage.localConfig_v2).teams[Object.keys(JSON.parse(localStorage.localConfig_v2).teams)[0]].token
   ```
   If you have multiple workspaces, list all:
   ```js
   Object.values(JSON.parse(localStorage.localConfig_v2).teams).map(t => ({ name: t.name, token: t.token }))
   ```
4. DevTools → **Application** tab → **Cookies** → `https://app.slack.com` → copy the value of the `d` cookie (starts with `xoxd-`).

**Security warning:** These tokens grant full access to your Slack account. Treat them like a password. Never paste into untrusted tools. They expire when you log out of Slack in that browser session.

## Store Credentials

Create `~/.pf-claude-code/slack.env`:

```bash
mkdir -p ~/.pf-claude-code
cat > ~/.pf-claude-code/slack.env << 'EOF'
SLACK_USER_TOKEN=xoxc-your-token-here
SLACK_COOKIE=xoxd-your-cookie-here
# Optional: for users.lookupByEmail (requires bot token from Slack App admin)
# SLACK_BOT_TOKEN=xoxb-your-bot-token
# Optional: override workspace URL (default: propertyfinder.slack.com)
# SLACK_WORKSPACE_URL=https://yourworkspace.slack.com
EOF
chmod 600 ~/.pf-claude-code/slack.env
```

The file lives in `$HOME`, never in the repo. `config.ts` loads it automatically.

## Install

```bash
git clone https://github.com/olegmalk/pf-claude-code.git
cd pf-claude-code/skills/slack && bun install
```

To use as a Claude Code skill, launch Claude Code with `--add-dir`:
```bash
claude --add-dir /path/to/pf-claude-code/skills/slack
```

Or copy `SKILL.md` to your project's `.claude/commands/slack.md`.

## Verify

```bash
cd skills/slack
bun run src/slack.ts send C0YOUR_CHANNEL "test message"
```

## Usage

```bash
# Send a message
bun run src/slack.ts send C0AGF6M0HUL "hello from the terminal"

# Reply in a thread
bun run src/slack.ts send C0AGF6M0HUL "thread reply" 1771170150.277659

# Read a thread with resolved usernames
bun run src/slack.ts thread C0AGF6M0HUL 1771170150.277659

# Look up a user by email (requires SLACK_BOT_TOKEN)
bun run src/slack.ts resolve user@company.com

# List active members in a channel
bun run src/slack.ts members C0AGF6M0HUL

# React to a message
bun run src/slack.ts react C0AGF6M0HUL 1771170150.277659 thumbsup

# Delete a message
bun run src/slack.ts delete C0AGF6M0HUL 1771170150.277659
```

### Slack URL to Timestamp

Slack permalinks use `p`-prefixed timestamps. Convert to the dotted format functions expect:

```
p1770889672443569 → remove p, insert . before last 6 digits → 1770889672.443569
```

## Formatting

Messages are validated for Slack mrkdwn. Markdown syntax is auto-converted:
- `**bold**` → `*bold*`
- `[text](url)` → `<url|text>`
- `# heading` → `*heading*`

Native mrkdwn: `*bold*`, `_italic_`, `<https://url|text>`, `<@U12345>`, `<#C12345>`.

## Security / Limits

- Tokens are personal. Revoking = log out of that browser session.
- No rate limiting enforced. Slack's own limits apply.
- Messages are sent as YOU. Double-check before sending to production channels.
- No dedup, no guardrails, no approval flow. What you send is what goes out.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `invalid_auth` | xoxc token expired. Re-extract from browser. |
| `not_authed` | Missing `d` cookie or cookie doesn't match the xoxc workspace. |
| `users.lookupByEmail` fails | Needs a bot token. Set `SLACK_BOT_TOKEN` in slack.env. |
| `missing_scope` | Your xoxc token doesn't have the required scope. Re-extract from a fresh browser login. |
