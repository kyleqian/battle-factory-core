// Library build of the game package (`@pokebench/factory`), browser entry:
//   dist-lib/index.js     src/lib.ts      mountFactoryGame (+ dist-lib/chunks/*)
// plus the hand-maintained declarations from lib-types/. The headless entry
// (dist-lib/headless.js, src/headless.ts) is built by vite.headless.config.ts
// in its own rollup graph so the renderer and its assets tree-shake away.
// The app build (vite.config.ts) is unchanged apart from sharing the chunking.
//
//   npm run build:lib   (runs both configs)
import { cpSync, mkdirSync } from "node:fs";
import { defineConfig } from "vite";
import { assetsInlineLimit, engineBuildDefine, manualChunks } from "./vite.config.ts";

export default defineConfig(async () => ({
  root: ".",
  define: await engineBuildDefine("build"),
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
        manualChunks,
      },
    },
  },
  plugins: [
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
