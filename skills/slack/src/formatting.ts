/** Validate text uses Slack mrkdwn, not Markdown. Throws on common mistakes. */
export function validateSlackMrkdwn(text: string): void {
  const mdLinks = text.match(/\[([^\]]+)\]\(http[^)]+\)/g);
  if (mdLinks) throw new Error(`Markdown links detected — use Slack mrkdwn format <url|text> instead: ${mdLinks.join(", ")}`);
  const mdBold = text.match(/\*\*[^*]+\*\*/g);
  if (mdBold) throw new Error(`Markdown bold (**) detected — use Slack mrkdwn *single asterisks* instead: ${mdBold.join(", ")}`);
  const mdHeadings = text.match(/^#{1,6} .+/m);
  if (mdHeadings) throw new Error(`Markdown headings (#) detected — Slack doesn't support headings, use *bold* instead: ${mdHeadings[0]}`);
}

/** Auto-fix Markdown → Slack mrkdwn. Returns corrected text. */
export function fixSlackMrkdwn(text: string): string {
  text = text.replace(/\*\*([^*]+)\*\*/g, "*$1*");
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "<$2|$1>");
  text = text.replace(/^#{1,6} (.+)/gm, "*$1*");
  return text;
}
