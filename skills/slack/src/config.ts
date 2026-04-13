import { config } from "dotenv";
import { join } from "path";
import { existsSync } from "fs";

const envPath = join(process.env.HOME || "~", ".pf-claude-code", "slack.env");
if (existsSync(envPath)) config({ path: envPath });

export interface SlackConfig {
  token: string;
  cookie: string;
  botToken: string | undefined;
  workspaceUrl: string;
}

export function getSlackConfig(): SlackConfig {
  const token = process.env.SLACK_USER_TOKEN;
  const cookie = process.env.SLACK_COOKIE;
  if (!token || !cookie) {
    console.error(
      "Missing SLACK_USER_TOKEN or SLACK_COOKIE.\n" +
      "See README.md for how to extract browser tokens.\n" +
      `Expected env file: ${envPath}`
    );
    process.exit(1);
  }
  return {
    token,
    cookie,
    botToken: process.env.SLACK_BOT_TOKEN,
    workspaceUrl: process.env.SLACK_WORKSPACE_URL || "https://propertyfinder.slack.com",
  };
}
