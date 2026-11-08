// Lists the JSON files under src/ that are NOT in any shipped module graph (browser lib, headless, dev shell),
// with size. The Tier-1 ratchet tests/bnd253SrcJsonShipped.test.ts pins the expected result as a shrink-only list.
//   node --experimental-strip-types tools/build/srcJsonShipped.ts [--json]
import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { build, type Rollup } from "vite";
import { engineBuildDefine, manualChunks } from "../../vite.config.ts";

const root = resolve(".");

function walkJson(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkJson(path, out);
    else if (entry.name.endsWith(".json")) out.push(path);
  }
  return out;
}

async function graphJson(entry: string | { html: true }): Promise<Set<string>> {
  const seen = new Set<string>();
  const plugin = {
    name: "collect-json-ids",
    moduleParsed(info: Rollup.ModuleInfo) {
      if (info.id.endsWith(".json")) seen.add(info.id);
    },
  };
  await build({
    root,
    configFile: false,
    logLevel: "silent",
    define: await engineBuildDefine("build"),
    plugins: [plugin],
    build: {
      write: false,
      target: "es2022",
      minify: false,
      reportCompressedSize: false,
      ...(typeof entry === "string"
        ? { lib: { entry: { e: entry }, formats: ["es" as const] } }
        : { rollupOptions: { input: resolve("index.html") } }),
      rollupOptions: { ...(typeof entry === "string" ? {} : { input: resolve("index.html") }), output: { manualChunks } },
    },
  });
  return seen;
}

const shipped = new Set<string>();
for (const entry of ["src/lib.ts", "src/headless.ts", { html: true as const }]) {
  for (const id of await graphJson(entry)) shipped.add(id);
}
const rows = walkJson(join(root, "src"))
  .filter((path) => !shipped.has(path))
  .map((path) => ({ path: relative(root, path), bytes: statSync(path).size }))
  .sort((a, b) => b.bytes - a.bytes || (a.path < b.path ? -1 : 1));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows.map((row) => row.path), null, 2));
} else {
  for (const row of rows) console.log(`${row.bytes}\t${row.path}`);
  console.log(`# ${rows.length} unshipped JSON, ${rows.reduce((sum, row) => sum + row.bytes, 0)} bytes; ${shipped.size} shipped JSON`);
}
