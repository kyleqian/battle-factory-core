// Headless-only build of `@pokebench/factory/headless` (replayChallenge).
// Built separately from the browser entry so rollup tree-shakes the renderer
// and the pixel assets out of its graph instead of sharing one chunk with
// src/lib.ts. Output: dist-lib/headless.js (+ dist-lib/chunks-headless/*).
import { defineConfig } from "vite";
import { engineBuildDefine, manualChunks } from "./vite.config.ts";

export default defineConfig(async () => ({
  root: ".",
  define: await engineBuildDefine("build"),
  build: {
    outDir: "dist-lib",
    emptyOutDir: false,
    target: "es2022",
    minify: false,
    sourcemap: false,
    lib: {
      entry: { headless: "src/headless.ts" },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      output: {
        chunkFileNames: "chunks-headless/[name]-[hash].js",
        manualChunks,
      },
    },
  },
}));
