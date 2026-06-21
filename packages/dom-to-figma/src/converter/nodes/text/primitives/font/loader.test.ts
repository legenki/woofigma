import { afterEach, describe, expect, it, vi } from "vitest";
import { createFontsourceLoader } from "./loader";

// Minimal valid-looking bytes; the loader only forwards bytes, it does not
// parse them (parsing happens later in loadFont, which these tests don't call).
const FAKE_FONT_BYTES = new Uint8Array([1, 2, 3, 4]).buffer;

function mockFetch() {
  const urls: Array<string> = [];
  const spy = vi.fn((url: string) => {
    urls.push(url);
    return Promise.resolve(new Response(FAKE_FONT_BYTES, { status: 200 }));
  });
  vi.stubGlobal("fetch", spy);
  return { urls };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createFontsourceLoader generic-family mapping", () => {
  it("maps monospace to roboto-mono with one fetch and no monospace URL", async () => {
    const { urls } = mockFetch();
    const load = createFontsourceLoader();

    const file = await load({
      family: "monospace",
      weight: 400,
      italic: false,
    });

    expect(file.resolvedFamily).toBe("Roboto Mono");
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("/roboto-mono@");
    expect(urls.some((u) => u.includes("/monospace@"))).toBe(false);
  });

  it("maps sans-serif through the configured fallbackFamily (default Inter)", async () => {
    const { urls } = mockFetch();
    const load = createFontsourceLoader();

    const file = await load({
      family: "sans-serif",
      weight: 400,
      italic: false,
    });

    expect(file.resolvedFamily).toBe("Inter");
    expect(urls[0]).toContain("/inter@");
    expect(urls.some((u) => u.includes("/sans-serif@"))).toBe(false);
  });

  it("honors a custom fallbackFamily for sans generics", async () => {
    const { urls } = mockFetch();
    const load = createFontsourceLoader({ fallbackFamily: "Roboto" });

    const file = await load({
      family: "system-ui",
      weight: 400,
      italic: false,
    });

    expect(file.resolvedFamily).toBe("Roboto");
    expect(urls[0]).toContain("/roboto@");
  });

  it("maps serif to pt-serif regardless of fallbackFamily", async () => {
    const { urls } = mockFetch();
    const load = createFontsourceLoader({ fallbackFamily: null });

    const file = await load({ family: "serif", weight: 400, italic: false });

    expect(file.resolvedFamily).toBe("PT Serif");
    expect(urls[0]).toContain("/pt-serif@");
  });

  it("throws an explicit error for sans generics when fallbackFamily is null", async () => {
    mockFetch();
    const load = createFontsourceLoader({ fallbackFamily: null });

    await expect(
      load({ family: "sans-serif", weight: 400, italic: false })
    ).rejects.toThrow(/requires a fallbackFamily/);
  });

  it("treats -apple-system (leading hyphen) as a sans generic", async () => {
    const { urls } = mockFetch();
    const load = createFontsourceLoader();

    const file = await load({
      family: "-apple-system",
      weight: 400,
      italic: false,
    });

    expect(file.resolvedFamily).toBe("Inter");
    expect(urls.some((u) => u.includes("apple-system@"))).toBe(false);
  });

  it("does not treat a real missing family as generic (no regression)", async () => {
    // Verdana is not generic: it goes through the normal fetch + fallback path.
    // The mock 404s the verdana URLs and serves the inter fallback.
    const urls: Array<string> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        urls.push(url);
        const ok = !url.includes("/verdana@");
        return Promise.resolve(
          new Response(ok ? FAKE_FONT_BYTES : null, { status: ok ? 200 : 404 })
        );
      })
    );
    const load = createFontsourceLoader();

    const file = await load({ family: "Verdana", weight: 400, italic: false });

    expect(file.resolvedFamily).toBe("Inter");
    expect(urls.some((u) => u.includes("/verdana@"))).toBe(true);
  });
});
