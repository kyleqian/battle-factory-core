// Library build of the game package (`@pokebench/factory`), browser entry:
//   dist-lib/index.js     src/lib.ts      mountFactoryGame (+ dist-lib/chunks/*)
// plus the hand-maintained declarations from lib-types/. The headless entry
// (dist-lib/headless.js, src/headless.ts) is built by vite.headless.config.ts
// in its own rollup graph so the renderer and its assets tree-shake away.
// The app build (vite.config.ts) is unchanged apart from sharing the chunking.
//
//   npm run build:lib   (runs both configs)
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { defineConfig } from "vite";
import { assetsInlineLimit, engineBuildDefine, manualChunks } from "./vite.config.ts";
import { monPicFilesPlugin } from "./tools/build/monPicFiles.ts";

export default defineConfig(async () => ({
  root: ".",
  // dl3: the library carries the per-species picture files only (no full-table chunk).
  define: { ...(await engineBuildDefine("build")), __POKEBENCH_SPRITE_FILES__: "true", __POKEBENCH_SPRITE_FULL__: "false" },
  build: {
    outDir: "dist-lib",
    emptyOutDir: true,
    target: "es2022",
    assetsInlineLimit,
    // Readable output: the host bundler (the website's Vite) minifies.
    minify: false,
    sourcemap: false,
    lib: {
      entry: { index: "src/lib.ts" },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      output: {
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "audio/[name]-[hash][extname]",
        manualChunks,
      },
    },
  },
  plugins: [
    monPicFilesPlugin(),
    {
      // Vite inlines every asset in lib mode (the player chunk would carry ~15 MB of base64). The audio files are emitted as
      // real files next to the chunks and referenced with new URL(..., import.meta.url), so the host bundler / CDN serves them.
      name: "pokebench-lib-audio-assets",
      enforce: "pre" as const,
      load(this: { emitFile(file: { type: "asset"; name: string; source: Buffer }): string }, id: string) {
        const file = id.replace(/\?.*$/, "").replaceAll("\\", "/");
        if (!/\/assets\/gen\/audio\/(?:aac\/)?[^/]+\.(?:ogg|m4a)$/.test(file)) return null;
        const ref = this.emitFile({ type: "asset", name: basename(file), source: readFileSync(file) });
        return `export default new URL(import.meta.ROLLUP_FILE_URL_${ref}).href;`;
      },
    },
    {
      name: "pokebench-lib-types",
      closeBundle() {
        mkdirSync("dist-lib", { recursive: true });
        cpSync("lib-types/index.d.ts", "dist-lib/index.d.ts");
        cpSync("lib-types/headless.d.ts", "dist-lib/headless.d.ts");
      },
    },
  ],
}));
