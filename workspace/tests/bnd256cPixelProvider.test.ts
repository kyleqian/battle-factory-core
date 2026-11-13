// bnd256c: sprite pixels come from an installable provider (src/engine/monPicPixels.ts), not from JSON imported by the tick path
// (docs/bnd256c-pixel-provider.md). Pins the uninstalled behaviour, lazy `pic` reads, and that the headless graph never installs.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import backSprites from "../src/assets/gen/battle-back-sprites.json" with { type: "json" };
import frontSprites from "../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import speciesAsset from "../src/data/gen/species-stats.json" with { type: "json" };
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { backPixels, frontPixels, installMonPicPixels, monPicPixelsInstalled, type MonPicPixelTables } from "../src/engine/monPicPixels.ts";

const speciesId = (symbol: string) => (speciesAsset as { species: { id: number; name: string }[] }).species.find((s) => s.name === `SPECIES_${symbol}`)!.id;
const realTables = { back: backSprites, front: frontSprites } as unknown as MonPicPixelTables;

function field(player: number, opponent: number, extra: Record<string, unknown> = {}) {
  return { player: { species: player }, opponent: { species: opponent, ...extra } } as never;
}

describe("bnd256c pixel provider", () => {
  it("a fresh provider throws before install and returns the JSON objects by identity after", async () => {
    vi.resetModules();
    const fresh = await import("../src/engine/monPicPixels.ts");
    expect(fresh.monPicPixelsInstalled()).toBe(false);
    expect(() => fresh.backPixels("ONIX")).toThrow("mon pic pixels not installed");
    expect(() => fresh.frontPixels("ONIX")).toThrow("mon pic pixels not installed");
    fresh.installMonPicPixels(realTables);
    expect(fresh.monPicPixelsInstalled()).toBe(true);
    expect(fresh.backPixels("ONIX")).toBe((backSprites as Record<string, unknown>).ONIX);
    expect(fresh.frontPixels("ONIX")).toBe((frontSprites as Record<string, unknown>).ONIX);
    expect(fresh.frontPixels("NOT_A_SPECIES")).toBeUndefined();
  });

  it("the suite setup installs the real tables (the renderers rely on it)", () => {
    expect(monPicPixelsInstalled()).toBe(true);
    expect(backPixels("ONIX")).toBe((backSprites as Record<string, unknown>).ONIX);
    expect(frontPixels("ONIX")).toBe((frontSprites as Record<string, unknown>).ONIX);
  });

  it("building a field art view reads no pixels (plain, transformed, doll); pic reads are lazy and hit the tables", () => {
    const reads: string[] = [];
    const spy = (side: "back" | "front") => new Proxy(realTables[side], { get: (target, key) => { reads.push(`${side}/${String(key)}`); return Reflect.get(target, key); } });
    installMonPicPixels({ back: spy("back"), front: spy("front") });
    try {
      const onix = speciesId("ONIX");
      const golbat = speciesId("GOLBAT");
      const plain = createBattleCommandFieldArtView(field(onix, golbat));
      const transformed = createBattleCommandFieldArtView(field(onix, onix, { transform: { species: golbat, personality: 0 } }));
      const doll = createBattleCommandFieldArtView(field(onix, golbat, { substituteDoll: true }));
      for (const view of [plain, transformed, doll]) for (const side of ["player", "opponent"] as const) {
        expect(view[side].pic.palette.length).toBeGreaterThan(0);
        expect(view[side].picGeometry.rows).toBeGreaterThan(0);
      }
      expect(reads).toEqual([]);

      expect(plain.opponent.pic.tileset).toBe((frontSprites as Record<string, { tileset: unknown }>).GOLBAT!.tileset);
      expect((plain.opponent.pic as { frame2?: unknown }).frame2).toBe((frontSprites as Record<string, { frame2: unknown }>).GOLBAT!.frame2);
      expect(plain.player.pic.tileset).toBe((backSprites as Record<string, { tileset: unknown }>).ONIX!.tileset);
      expect("frame2" in plain.player.pic).toBe(false);
      expect(transformed.opponent.pic.tileset).toBe((frontSprites as Record<string, { tileset: unknown }>).GOLBAT!.tileset);
      expect(reads.length).toBeGreaterThan(0);
    } finally {
      installMonPicPixels(realTables);
    }
  });

  it("uninstalled, a view still builds and only the pixel read throws", async () => {
    vi.resetModules();
    const fresh = await import("../src/engine/monPicPixels.ts");
    const art = await import("../src/engine/battleCommandFieldArt.ts");
    expect(fresh.monPicPixelsInstalled()).toBe(false);
    const view = art.createBattleCommandFieldArtView(field(speciesId("ONIX"), speciesId("GOLBAT"), { transform: { species: speciesId("ONIX"), personality: 0 } }));
    expect(view.opponent.pic.palette.length).toBeGreaterThan(0);
    expect(() => view.opponent.pic.tileset).toThrow("mon pic pixels not installed");
    expect(() => view.player.pic.tileset).toThrow("mon pic pixels not installed");
  });
});

const root = resolve(import.meta.dirname, "..");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("bnd256c static ratchets", () => {
  it("battleCommandFieldArt.ts imports no sprite pixel JSON", () => {
    const source = strip(readFileSync(resolve(root, "src/engine/battleCommandFieldArt.ts"), "utf8"));
    expect(source).not.toMatch(/battle-back-sprites|battle-opponent-front-sprites|party-mon-icons/);
    expect(strip(readFileSync(resolve(root, "src/engine/monPicPixels.ts"), "utf8"))).not.toMatch(/\.json/);
  });

  it("the headless graph (src/headless.ts, static + dynamic imports) never reaches the install module", () => {
    const seen = new Set<string>();
    const stack = [resolve(root, "src/headless.ts")];
    while (stack.length > 0) {
      const file = stack.pop()!;
      if (seen.has(file) || !file.endsWith(".ts")) continue;
      seen.add(file);
      const source = strip(readFileSync(file, "utf8"));
      for (const match of source.matchAll(/(?:from|import)\s*\(?\s*"(\.[^"]+)"/g)) stack.push(resolve(dirname(file), match[1]!));
    }
    expect(seen.size).toBeGreaterThan(100);
    expect([...seen].filter((file) => file.endsWith("monPicPixelsInstall.ts"))).toEqual([]);
    expect(seen.has(resolve(root, "src/lib.ts"))).toBe(false);
  });

  it("src/lib.ts imports the install module dynamically (bnd257d) and calls the installer", () => {
    const lib = strip(readFileSync(resolve(root, "src/lib.ts"), "utf8"));
    expect(lib).not.toMatch(/^import .*monPicPixelsInstall\.ts"/m);
    // A call after the import: package.json `"sideEffects": false` drops a bare side-effect import from bundles.
    expect(lib).toMatch(/import\("\.\/engine\/monPicPixelsInstall\.ts"\)\.then\(\(module\) => module\.installBundledMonPicPixels\(\)\)/);
  });

  // Needs `npm run build:lib` first (dist-lib is git-ignored), so it only runs where a build exists. Manual check: after build:lib,
  // `ls -l dist-lib/chunks-headless` has no assets-sprites chunk larger than a stub and `du -sb` of the folder is ~7.6 MB.
  const headlessChunks = resolve(root, "dist-lib/chunks-headless");
  it.skipIf(!existsSync(headlessChunks))("the built headless output carries no sprite pixel chunk", () => {
    for (const name of readdirSync(headlessChunks)) {
      if (name.startsWith("assets-sprites")) expect(statSync(resolve(headlessChunks, name)).size).toBeLessThan(1024);
    }
    expect(readFileSync(resolve(root, "dist-lib/headless.js"), "utf8")).not.toContain("assets-sprites");
  });
});
