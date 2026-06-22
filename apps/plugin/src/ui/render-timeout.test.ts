import { describe, expect, it } from "vitest";
import { computeLoadTimeout } from "./render-timeout";

describe("computeLoadTimeout", () => {
  it("uses the 10 s base for small documents", () => {
    expect(computeLoadTimeout(0)).toBe(10_000);
    expect(computeLoadTimeout(500_000)).toBe(10_000);
  });

  it("adds 1 s per MB of HTML", () => {
    expect(computeLoadTimeout(10_000_000)).toBe(20_000);
  });

  it("caps at 60 s", () => {
    expect(computeLoadTimeout(100_000_000)).toBe(60_000);
  });
});
