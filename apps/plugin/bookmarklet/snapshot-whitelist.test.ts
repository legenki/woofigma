import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SNAPSHOT_STYLE_PROPS } from "./snapshot.js";

const CONVERTER_ROOT = join(
  import.meta.dirname,
  "../../../packages/dom-to-figma/src/converter"
);

function walk(dir: string): Array<string> {
  let out: Array<string> = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      out = out.concat(walk(p));
    } else if (p.endsWith(".ts") && !p.includes(".test.")) {
      out.push(p);
    }
  }
  return out;
}

function camelToKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function converterReadProps(): Set<string> {
  const props = new Set<string>();
  for (const file of walk(CONVERTER_ROOT)) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/computedStyle\.([a-zA-Z]+)/g)) {
      props.add(camelToKebab(m[1] as string));
    }
    for (const m of src.matchAll(/getPropertyValue\(\s*["'`]([a-z-]+)["'`]/g)) {
      props.add(m[1] as string);
    }
  }
  props.delete("get-property-value");
  return props;
}

describe("snapshot whitelist", () => {
  it("covers every CSS property the converter reads", () => {
    const whitelist = new Set(SNAPSHOT_STYLE_PROPS);
    const missing = [...converterReadProps()].filter((p) => !whitelist.has(p));
    expect(missing).toEqual([]);
  });
});
