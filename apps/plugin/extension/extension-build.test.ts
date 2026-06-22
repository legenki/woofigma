import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildExtension } from "./build-extension.mjs";

const CONTENT_JS = join(import.meta.dirname, "content.js");

beforeAll(async () => {
  await buildExtension();
});

describe("extension content bundle", () => {
  it("writes content.js", () => {
    expect(existsSync(CONTENT_JS)).toBe(true);
  });

  it("bundles the snapshot delivery logic", () => {
    const text = readFileSync(CONTENT_JS, "utf8");
    // The download filename is a stable marker that runSnapshot is wired in.
    expect(text).toContain("woofigma-snapshot.html");
  });
});
