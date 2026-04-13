import { describe, expect, test } from "bun:test";
import { slackPermalink } from "../src/client";

describe("slackPermalink", () => {
  test("converts channel + ts to permalink URL", () => {
    expect(slackPermalink("C0AGF6M0HUL", "1771170150.277659")).toBe(
      "https://propertyfinder.slack.com/archives/C0AGF6M0HUL/p1771170150277659"
    );
  });

  test("removes dot from timestamp", () => {
    const url = slackPermalink("C123ABC", "1234567890.123456");
    expect(url).not.toContain(".1");
    expect(url).toContain("p1234567890123456");
  });
});
