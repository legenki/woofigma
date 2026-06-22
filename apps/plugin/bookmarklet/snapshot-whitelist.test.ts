import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SNAPSHOT_SKIP_PROPS } from "./snapshot.js";

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

// Guards the snapshot blacklist (SNAPSHOT_SKIP_PROPS), not a whitelist: the
// snapshot now inlines everything except the blacklist, so the converter's read
// properties must never be blacklisted, and layout-critical props must stay out
// of the blacklist.
describe("snapshot blacklist", () => {
  it("never blacklists a property the converter reads", () => {
    const blacklisted = [...converterReadProps()].filter((p) =>
      SNAPSHOT_SKIP_PROPS.has(p)
    );
    expect(blacklisted).toEqual([]);
  });

  it("keeps layout-critical properties out of the blacklist", () => {
    expect(SNAPSHOT_SKIP_PROPS.has("display")).toBe(false);
    expect(SNAPSHOT_SKIP_PROPS.has("width")).toBe(false);
    expect(SNAPSHOT_SKIP_PROPS.has("flex-direction")).toBe(false);
  });
});
