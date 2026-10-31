// ENGINE_BUILD: a content hash of what the headless entry actually runs.
//
// `computeEngineBuild` builds the headless entry in memory (same options as
// vite.headless.config.ts) with the stamp left as a fixed placeholder and
// hashes every emitted chunk, so the value changes exactly when the rollup
// output of the gameplay + headless event/digest graph changes: engine code,
// generated data, and anything the tree-shaken graph still reaches. Docs,
// tests, tools and renderer modules that rollup drops do not move it. The same
// value is `define`d into the app, browser-lib and headless builds, so one
// tree reports one ENGINE_BUILD everywhere. It is independent of the commit
// and of the checkout path.
import { createHash } from "node:crypto";
import { build, type Rollup } from "vite";

export const ENGINE_BUILD_PLACEHOLDER = "__POKEBENCH_ENGINE_BUILD_PLACEHOLDER__";
export const ENGINE_BUILD_DEFINE = "__POKEBENCH_ENGINE_BUILD__";

export interface EngineBuildInput {
  readonly root: string;
  /** Headless entry, relative to `root`. */
  readonly entry: string;
  readonly manualChunks?: (id: string) => string | undefined;
}

export function hashChunks(chunks: ReadonlyArray<{ readonly fileName: string; readonly code: string }>): string {
  const hash = createHash("sha256");
  for (const chunk of [...chunks].sort((a, b) => (a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0))) {
    hash.update(chunk.fileName).update("\0").update(chunk.code).update("\0");
  }
  return `eb-${hash.digest("hex").slice(0, 16)}`;
}

export async function computeEngineBuild(input: EngineBuildInput): Promise<string> {
  const result = await build({
    root: input.root,
    configFile: false,
    logLevel: "silent",
    define: { [ENGINE_BUILD_DEFINE]: JSON.stringify(ENGINE_BUILD_PLACEHOLDER) },
    build: {
      write: false,
      target: "es2022",
      minify: false,
      sourcemap: false,
      reportCompressedSize: false,
      lib: { entry: { headless: input.entry }, formats: ["es"], fileName: (_format, name) => `${name}.js` },
      rollupOptions: {
        output: {
          chunkFileNames: "chunks-headless/[name]-[hash].js",
          ...(input.manualChunks ? { manualChunks: input.manualChunks } : {}),
        },
      },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
  const chunks = outputs.flatMap((output) =>
    output.output.flatMap((item) => (item.type === "chunk" ? [{ fileName: item.fileName, code: item.code }] : [])),
  );
  return hashChunks(chunks);
}
