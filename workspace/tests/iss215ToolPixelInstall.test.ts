// iss215 (ISSUES #215): since bnd257d battleScene reads sprite pixels only through src/engine/monPicPixels.ts. Vitest's setup installs them, but a tool
// run as its own node process must import src/engine/monPicPixelsInstall.ts itself, or the first render throws "mon pic pixels not installed".
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

/** Tools that import core.ts / battleScene.ts but may skip the installer. Empty: all 30 were fixed; nothing under src/ imports tools/. */
const ALLOWLIST: readonly string[] = [];

function toolFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? toolFiles(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("iss215: tools that render battle scenes install the sprite pixel provider", () => {
  it("every tools/**/*.ts importing engine/core.ts or engine/battleScene.ts imports monPicPixelsInstall.ts", () => {
    const rendering = /(?:from\s*|import\s*\(?\s*)["'][^"']*src\/engine\/(?:core|battleScene)\.ts["']/;
    // Static side-effect import, or the awaited dynamic import tools/compare/appTrace.ts uses (optional so --harness-from-head can overlay it on older checkouts).
    const installer = /^\s*(?:import\s+|await\s+import\s*\(\s*)["'][^"']*src\/engine\/monPicPixelsInstall\.ts["']/m;
    const missing = toolFiles(join(root, "tools"))
      .filter((path) => {
        const text = readFileSync(path, "utf8");
        return rendering.test(text) && !installer.test(text);
      })
      .map((path) => path.slice(root.length + 1).replaceAll("\\", "/"))
      .filter((path) => !ALLOWLIST.includes(path));
    expect(missing).toEqual([]);
  });

  it("every allowlist entry still exists and still needs the exemption", () => {
    for (const path of ALLOWLIST) {
      const text = readFileSync(join(root, path), "utf8");
      expect(text).not.toMatch(/monPicPixelsInstall/);
    }
  });
});
