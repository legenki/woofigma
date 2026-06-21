import { describe, expect, it } from "vitest";
import { parseSVGPath } from "./tokenizer";

describe("parseSVGPath", () => {
  it("parses a simple absolute moveto + lineto", () => {
    expect(parseSVGPath("M10 20 L30 40")).toEqual([
      { type: "M", args: [10, 20] },
      { type: "L", args: [30, 40] },
    ]);
  });

  it("treats commas the same as whitespace", () => {
    expect(parseSVGPath("M10,20 L30,40")).toEqual([
      { type: "M", args: [10, 20] },
      { type: "L", args: [30, 40] },
    ]);
  });

  it("preserves command case for absolute vs relative", () => {
    const parsed = parseSVGPath("M10 20 m1 2");
    expect(parsed[0]?.type).toBe("M");
    expect(parsed[1]?.type).toBe("m");
  });

  it("parses a cubic bezier with six args", () => {
    expect(parseSVGPath("C30 40 50 60 70 80")).toEqual([
      { type: "C", args: [30, 40, 50, 60, 70, 80] },
    ]);
  });

  it("includes the close command even with no args", () => {
    const parsed = parseSVGPath("M0 0 L10 10 Z");
    expect(parsed.at(-1)).toEqual({ type: "Z", args: [] });
  });

  it("parses scientific notation", () => {
    expect(parseSVGPath("M1.5e2 -1.2e1")).toEqual([
      { type: "M", args: [150, -12] },
    ]);
  });

  it("splits on consecutive minus signs", () => {
    expect(parseSVGPath("M10-5")).toEqual([{ type: "M", args: [10, -5] }]);
  });

  it("handles leading negatives without explicit separator", () => {
    expect(parseSVGPath("M-10-20")).toEqual([{ type: "M", args: [-10, -20] }]);
  });

  it("splits when a digit is followed by .number", () => {
    expect(parseSVGPath("M0.5.5")).toEqual([{ type: "M", args: [0.5, 0.5] }]);
  });

  it("returns an empty array for an empty path", () => {
    expect(parseSVGPath("")).toEqual([]);
  });
});
