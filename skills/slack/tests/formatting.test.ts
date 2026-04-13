import { describe, expect, test } from "bun:test";
import { validateSlackMrkdwn, fixSlackMrkdwn } from "../src/formatting";

describe("validateSlackMrkdwn", () => {
  test("accepts valid mrkdwn", () => {
    expect(() => validateSlackMrkdwn("*bold* and <https://example.com|link>")).not.toThrow();
  });

  test("rejects markdown links", () => {
    expect(() => validateSlackMrkdwn("Check [this link](https://example.com)")).toThrow("Markdown links detected");
  });

  test("rejects markdown bold", () => {
    expect(() => validateSlackMrkdwn("This is **bold** text")).toThrow("Markdown bold");
  });

  test("rejects markdown headings", () => {
    expect(() => validateSlackMrkdwn("# Heading\nSome text")).toThrow("Markdown headings");
  });
});

describe("fixSlackMrkdwn", () => {
  test("converts markdown bold to mrkdwn bold", () => {
    expect(fixSlackMrkdwn("**bold**")).toBe("*bold*");
  });

  test("converts markdown links to mrkdwn links", () => {
    expect(fixSlackMrkdwn("[click here](https://example.com)")).toBe("<https://example.com|click here>");
  });

  test("converts markdown headings to bold", () => {
    expect(fixSlackMrkdwn("# Heading")).toBe("*Heading*");
    expect(fixSlackMrkdwn("### Sub-heading")).toBe("*Sub-heading*");
  });

  test("handles mixed markdown", () => {
    const input = "# Title\n**bold** and [link](https://example.com)";
    const expected = "*Title*\n*bold* and <https://example.com|link>";
    expect(fixSlackMrkdwn(input)).toBe(expected);
  });
});
