import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";

// bnd253a ratchet: src/ holds only JSON that a src module imports. Test-only and tool-only JSON (recordings, probes,
// audit catalogs, extractor sidecars) lives in tests/fixtures/data/ so it never enters the type graph or a bundle
// (docs/bnd253a-test-json.md). The full graph check is `node --experimental-strip-types tools/build/srcJsonShipped.ts`
// (about 40 s, builds lib + headless + app in memory); this Tier-1 test is its static approximation: a JSON file under
// src/ must be named by an import / readFileSync / URL in a non-test src module, or be on the shrink-only list below.

/** Known-unshipped src/ JSON that stays for now (100+ tool references each). May only shrink. */
const UNSHIPPED_ALLOWLIST: readonly string[] = [
  "src/data/gen/battle-animation-components.json",
  "src/data/gen/factory-animation-inventory.json",
];

/**
 * Runtime data committed ahead of its importer (not part of the shrink-only list): aud244a's sound-asset manifest is
 * loaded by the aud245 WebAudio player (dynamic import, handoff item 0). Delete the entry when aud245 imports it.
 */
const PENDING_RUNTIME_IMPORT: readonly string[] = ["src/assets/gen/audio/manifest.json"];

function walk(dir: string, suffix: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, suffix, out);
    else if (entry.name.endsWith(suffix)) out.push(path);
  }
  return out;
}

const JSON_REFERENCE = /["'`]([^"'`\s]*\.json)["'`]/g;

function srcReferencedJson(): Map<string, string[]> {
  const referencedBy = new Map<string, string[]>();
  for (const file of walk("src", ".ts")) {
    const text = readFileSync(file, "utf8");
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const match of code.matchAll(JSON_REFERENCE)) {
      const spec = match[1]!;
      const resolved = spec.startsWith(".") ? normalize(join(dirname(file), spec)) : normalize(spec);
      referencedBy.set(resolved, [...(referencedBy.get(resolved) ?? []), file]);
    }
  }
  return referencedBy;
}

describe("bnd253a: src/ JSON is shipped JSON", () => {
  const onDisk = walk("src", ".json").map((path) => path.split("\\").join("/")).sort();
  const referenced = srcReferencedJson();
  // Only a path-qualified reference counts: bare names built from a directory constant are matched by basename below.
  const referencedBasenames = new Set([...referenced.keys()].map((path) => path.split("/").pop()!));

  it("every JSON under src/ is named by a src module, or is on the shrink-only unshipped list", () => {
    const orphans = onDisk.filter((path) => !referenced.has(path) && !referencedBasenames.has(path.split("/").pop()!) && !UNSHIPPED_ALLOWLIST.includes(path) && !PENDING_RUNTIME_IMPORT.includes(path));
    expect(orphans, "move test/tool-only JSON to tests/fixtures/data/ instead of src/").toEqual([]);
  });

  it("the unshipped list only shrinks: each entry exists and still has no src importer", () => {
    for (const path of UNSHIPPED_ALLOWLIST) {
      expect(onDisk, `${path} is gone: delete it from UNSHIPPED_ALLOWLIST`).toContain(path);
      expect(referenced.has(path), `${path} is now imported by src: delete it from UNSHIPPED_ALLOWLIST`).toBe(false);
    }
    expect(UNSHIPPED_ALLOWLIST.length).toBeLessThanOrEqual(2);
  });

  it("each pending runtime import exists and has no src importer yet", () => {
    for (const path of PENDING_RUNTIME_IMPORT) {
      expect(onDisk, `${path} is gone: delete it from PENDING_RUNTIME_IMPORT`).toContain(path);
      expect(referenced.has(path), `${path} is now imported by src: delete it from PENDING_RUNTIME_IMPORT`).toBe(false);
    }
  });

  it("no src module reaches into tests/ for data", () => {
    const reaching = [...referenced.keys()].filter((path) => path.startsWith("tests/") || path.includes("/tests/"));
    expect(reaching).toEqual([]);
  });
});
