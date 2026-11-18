// aud239 bundle boundary (aud245: the lib build's synchronous graph is pinned too) (docs/s11-audio-design.md section 5 "Location / loading"): the headless rollup graph may
// contain exactly one module under src/audio/, the tiny pure type module, and nothing from the audio assets or the
// aud238 source table. A future player (src/audio/player.ts) must stay behind lib.ts's dynamic import.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { build, type Rollup } from "vite";
import { assetsInlineLimit, manualChunks } from "../vite.config.ts";
import { monPicFilesPlugin } from "../tools/build/monPicFiles.ts";

describe("headless build graph has no audio beyond the SoundEvent type module", () => {
  it("only src/audio/soundEvents.ts, and no audio assets / sound-source data", async () => {
    const result = await build({
      root: ".",
      configFile: false,
      logLevel: "silent",
      define: { __POKEBENCH_ENGINE_BUILD__: JSON.stringify("test") },
      build: {
        write: false,
        target: "es2022",
        minify: false,
        sourcemap: false,
        reportCompressedSize: false,
        lib: { entry: { headless: "src/headless.ts" }, formats: ["es"], fileName: (_format, name) => `${name}.js` },
        rollupOptions: { output: { chunkFileNames: "chunks-headless/[name]-[hash].js" } },
      },
    });
    const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
    const modules = outputs
      .flatMap((output) => output.output.flatMap((item) => (item.type === "chunk" ? Object.entries(item.modules) : [])))
      .map(([id, info]) => ({ id: id.split("?")[0]!.replaceAll("\\", "/"), rendered: info.renderedLength }));
    const audio = modules.filter(({ id }) => /\/src\/audio\//.test(id)).map(({ id }) => id.slice(id.indexOf("/src/audio/")));
    expect(audio).toEqual(["/src/audio/soundEvents.ts"]);
    expect(modules.filter(({ id }) => /audio-sound-sources|\/assets\/gen\/audio\//.test(id))).toEqual([]);
    const types = modules.find(({ id }) => id.endsWith("/src/audio/soundEvents.ts"))!;
    expect(types.rendered).toBeLessThan(4096);
  }, 180_000);

  it("the browser lib build keeps the player and the audio assets out of the synchronous graph (aud245)", async () => {
    const result = await build({
      root: ".",
      configFile: false,
      logLevel: "silent",
      define: { __POKEBENCH_ENGINE_BUILD__: JSON.stringify("test"), __POKEBENCH_SPRITE_FILES__: "true", __POKEBENCH_SPRITE_FULL__: "false" },
      plugins: [monPicFilesPlugin()], // dl3
      build: {
        write: false,
        target: "es2022",
        minify: false,
        sourcemap: false,
        reportCompressedSize: false,
        assetsInlineLimit,
        lib: { entry: { index: "src/lib.ts" }, formats: ["es"], fileName: (_format, name) => `${name}.js` },
        rollupOptions: { output: { chunkFileNames: "chunks/[name]-[hash].js", manualChunks } },
      },
    });
    const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
    const chunks = outputs.flatMap((output) => output.output.filter((item): item is Rollup.OutputChunk => item.type === "chunk"));
    const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
    const entry = chunks.find((chunk) => chunk.isEntry)!;
    const sync = new Set<string>();
    const walk = (name: string): void => {
      if (sync.has(name)) return;
      sync.add(name);
      for (const next of byName.get(name)!.imports) if (byName.has(next)) walk(next);
    };
    walk(entry.fileName);
    const ids = (names: Iterable<string>): string[] => [...names].flatMap((name) => Object.keys(byName.get(name)!.modules)).map((id) => id.split("?")[0]!.replaceAll("\\", "/"));
    const syncIds = ids(sync);
    expect(syncIds.filter((id) => /\/src\/audio\/(player|playerAssets)\.ts$|\/assets\/gen\/audio\//.test(id))).toEqual([]);
    expect(syncIds.some((id) => id.endsWith("/src/audio/soundEvents.ts"))).toBe(true);
    // It is reachable, but only through a dynamic import: player.ts sits in a chunk the entry imports dynamically, never statically.
    const playerChunk = chunks.find((chunk) => Object.keys(chunk.modules).some((id) => id.endsWith("/src/audio/player.ts")))!;
    expect(playerChunk).toBeDefined();
    expect(sync.has(playerChunk.fileName)).toBe(false);
    // bnd257d: the entry's code may sit in a shared chunk (src/lib.ts imports the sprite installer dynamically), so look at every synchronous chunk.
    expect([...sync].flatMap((name) => byName.get(name)!.dynamicImports)).toContain(playerChunk.fileName);
    // The manifest / song table live in the audio-only chunk, not in the shared assets-gen chunk.
    const dataChunk = chunks.find((chunk) => Object.keys(chunk.modules).some((id) => id.endsWith("/assets/gen/audio/manifest.json")))!;
    expect(dataChunk.fileName).toMatch(/audio-data/);
    expect(sync.has(dataChunk.fileName)).toBe(false);
  }, 300_000);

  it("the type module is pure: no imports, no DOM, no WebAudio", () => {
    const source = readFileSync("src/audio/soundEvents.ts", "utf8");
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\b(document|window|AudioContext|HTMLCanvasElement|fetch)\b/);
  });
});
