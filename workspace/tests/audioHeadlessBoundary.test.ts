// aud239 bundle boundary (docs/s11-audio-design.md section 5 "Location / loading"): the headless rollup graph may
// contain exactly one module under src/audio/, the tiny pure type module, and nothing from the audio assets or the
// aud238 source table. A future player (src/audio/player.ts) must stay behind lib.ts's dynamic import.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { build, type Rollup } from "vite";

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

  it("the type module is pure: no imports, no DOM, no WebAudio", () => {
    const source = readFileSync("src/audio/soundEvents.ts", "utf8");
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\b(document|window|AudioContext|HTMLCanvasElement|fetch)\b/);
  });
});
