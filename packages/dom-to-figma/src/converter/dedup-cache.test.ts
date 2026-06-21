import { describe, expect, it, vi } from "vitest";
import { DedupCache } from "./dedup-cache";

const id = (key: string) => key;

describe("DedupCache", () => {
  it("calls load once per key on a cache hit", async () => {
    const load = vi.fn(async (key: string) => `loaded:${key}`);
    const cache = new DedupCache({ load, toCacheKey: id });

    expect(await cache.get("a")).toBe("loaded:a");
    expect(await cache.get("a")).toBe("loaded:a");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("loads different keys independently", async () => {
    const load = vi.fn(async (key: string) => key.toUpperCase());
    const cache = new DedupCache({ load, toCacheKey: id });

    await Promise.all([cache.get("a"), cache.get("b")]);

    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledWith("a");
    expect(load).toHaveBeenCalledWith("b");
  });

  it("dedupes concurrent loads of the same key into one call", async () => {
    let resolveLoad: ((value: string) => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoad = resolve;
        })
    );
    const cache = new DedupCache({ load, toCacheKey: id });

    const a = cache.get("k");
    const b = cache.get("k");
    const c = cache.get("k");

    expect(load).toHaveBeenCalledTimes(1);
    resolveLoad?.("ok");

    expect(await Promise.all([a, b, c])).toEqual(["ok", "ok", "ok"]);
  });

  it("uses toCacheKey to normalize compound keys", async () => {
    const load = vi.fn(async (key: { a: number; b: number }) => key.a + key.b);
    const cache = new DedupCache({
      load,
      toCacheKey: (key) => `${key.a}|${key.b}`,
    });

    const first = await cache.get({ a: 1, b: 2 });
    const second = await cache.get({ a: 1, b: 2 });

    expect(first).toBe(3);
    expect(second).toBe(3);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("clears the slot on failure so the next call can retry", async () => {
    let attempt = 0;
    const load = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) {
        return Promise.reject(new Error("transient"));
      }
      return Promise.resolve("ok");
    });
    const cache = new DedupCache({ load, toCacheKey: id });

    await expect(cache.get("k")).rejects.toThrow("transient");
    await expect(cache.get("k")).resolves.toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("clear() drops cached values and in-flight promises", async () => {
    const load = vi.fn(async (key: string) => key);
    const cache = new DedupCache({ load, toCacheKey: id });

    await cache.get("a");
    cache.clear();
    await cache.get("a");

    expect(load).toHaveBeenCalledTimes(2);
  });
});
