// Generates tools/test/test-gate.list, the file list behind `npm run test:gate`.
// Deterministic: same durations TSV + same tests/ and src/ trees => same list.
//   node --experimental-strip-types tools/test/generateTestGate.ts [--check] [--budget-ms N]
// Rule and measurements: docs/cln240-test-gate.md.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const ROOT = process.cwd();
const DURATIONS = "tools/test/gate-durations.tsv";
const LIST = "tools/test/test-gate.list";
const PER_FILE_CAP_MS = 15_000; // no single file may cost more than this in the gate
const NAMED_CAP_MS = 25_000; // ratchets named explicitly may cost more (audioHeadlessBoundary is 19 s)
const DEFAULT_BUDGET_MS = 190_000; // summed per-file test time; wall is roughly half of it on 2 workers plus collect

const args = process.argv.slice(2);
const check = args.includes("--check");
const budgetArg = args.indexOf("--budget-ms");
const budgetMs = budgetArg >= 0 ? Number(args[budgetArg + 1]) : DEFAULT_BUDGET_MS;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir)).sort()) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

const srcFiles = walk("src").filter((f) => f.endsWith(".ts"));
const srcSet = new Set(srcFiles);
const lineCount = new Map(srcFiles.map((f) => [f, readFileSync(join(ROOT, f), "utf8").split("\n").length]));

function resolveImport(from: string, spec: string): string | undefined {
  if (!spec.startsWith(".")) return undefined;
  const target = normalize(join(dirname(from), spec)).split("\\").join("/");
  for (const candidate of [target, `${target}.ts`, `${target}/index.ts`]) {
    if (existsSync(join(ROOT, candidate)) && statSync(join(ROOT, candidate)).isFile()) return candidate;
  }
  return undefined;
}

const IMPORT_RE = /(?:from\s+|import\s*\(\s*|import\s+|require\s*\(\s*)["'](\.[^"']+)["']/g;

// src modules a test file imports directly, following non-test helper files under tests/ (not src/).
function srcImports(testFile: string): Set<string> {
  const found = new Set<string>();
  const seen = new Set<string>();
  const visit = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = readFileSync(join(ROOT, file), "utf8");
    for (const match of text.matchAll(IMPORT_RE)) {
      const resolved = resolveImport(file, match[1]);
      if (!resolved) continue;
      if (srcSet.has(resolved)) found.add(resolved);
      else if (resolved.startsWith("tests/") && !resolved.endsWith(".test.ts")) visit(resolved);
    }
  };
  visit(testFile);
  return found;
}

const durations = new Map<string, { tests: number; ms: number }>();
for (const line of readFileSync(join(ROOT, DURATIONS), "utf8").split("\n")) {
  if (!line) continue;
  const [file, tests, ms] = line.split("\t");
  durations.set(file, { tests: Number(tests), ms: Number(ms) });
}

// Failed or slow-flaky files in the reference run are never selected.
const EXCLUDED = new Set(["tests/sc106StatsChangeCommand.test.ts", "tests/sgl138SeGateLive.test.ts"]);

const smoke = (JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts["test:smoke"] as string)
  .split(/\s+/)
  .filter((token) => /^tests\/.+\.test\.ts$/.test(token));

const candidates = walk("tests")
  .filter((f) => f.endsWith(".test.ts") && durations.has(f) && !EXCLUDED.has(f))
  .map((f) => ({ file: f, ms: durations.get(f)!.ms, tests: durations.get(f)!.tests, imports: srcImports(f) }));
const byFile = new Map(candidates.map((c) => [c.file, c]));

// Coverage targets: every src/ directory, every top-level src module, every large module.
const targets: { name: string; modules: string[] }[] = [];
const dirs = new Set(srcFiles.map((f) => dirname(f)));
for (const dir of [...dirs].sort()) targets.push({ name: `dir ${dir}`, modules: srcFiles.filter((f) => dirname(f) === dir) });
for (const f of srcFiles.filter((f) => dirname(f) === "src").sort()) targets.push({ name: `module ${f}`, modules: [f] });
for (const f of srcFiles.filter((f) => (lineCount.get(f) ?? 0) >= 1500).sort()) targets.push({ name: `large ${f}`, modules: [f] });
// Sampled families and ratchets that the import rule alone does not name.
const NAMED: { name: string; pick: (c: (typeof candidates)[number]) => boolean }[] = [
  { name: "headless build hash", pick: (c) => c.file === "tests/engineBuildHash.test.ts" },
  { name: "audio headless boundary", pick: (c) => c.file === "tests/audioHeadlessBoundary.test.ts" },
  { name: "lib types parity", pick: (c) => c.file === "tests/libTypesParity.test.ts" },
  { name: "frontier ratchet", pick: (c) => c.file === "tests/executableFrontierRatchet.test.ts" },
  { name: "gate6 coverage manifest", pick: (c) => c.file === "tests/gate6CoverageManifest.test.ts" },
  { name: "lib API", pick: (c) => c.imports.has("src/lib.ts") },
  { name: "audio emitters", pick: (c) => [...c.imports].some((m) => m.startsWith("src/audio/") && /emit|sink|plumb/i.test(m + c.file)) },
  { name: "live animation adapters", pick: (c) => c.imports.has("src/engine/liveMoveAnimation.ts") },
  { name: "round/draft/swap controllers", pick: (c) => /roundController|draftController|swapController/i.test(c.file) },
];

const selected = new Map<string, string>(); // file -> reason
const add = (file: string, reason: string): void => {
  if (!selected.has(file)) selected.set(file, reason);
};
const cost = (c: { ms: number }): number => c.ms + 50;
const cheapestFirst = (a: (typeof candidates)[number], b: (typeof candidates)[number]) =>
  cost(a) - cost(b) || (a.file < b.file ? -1 : 1);

for (const file of smoke) add(file, "test:smoke");
add("tests/testGateSelection.test.ts", "gate self-check");

const uncovered: string[] = [];
for (const named of NAMED) {
  const pool = candidates.filter((c) => named.pick(c) && c.ms <= NAMED_CAP_MS).sort(cheapestFirst);
  if (pool.length === 0) uncovered.push(named.name);
  // Sample up to 3 cheapest, so one flaky file never carries a whole family.
  else for (const c of pool.slice(0, 3)) add(c.file, `named: ${named.name}`);
}
for (const target of targets) {
  const modules = new Set(target.modules);
  const already = [...selected.keys()].some((f) => [...(byFile.get(f)?.imports ?? [])].some((m) => modules.has(m)));
  if (already) continue;
  const pool = candidates.filter((c) => c.ms <= PER_FILE_CAP_MS && [...c.imports].some((m) => modules.has(m))).sort(cheapestFirst);
  if (pool.length === 0) uncovered.push(target.name);
  else add(pool[0].file, `area: ${target.name}`);
}

// Breadth fill: greedy by newly covered src modules per ms until the budget is spent.
const covered = new Set<string>();
for (const f of selected.keys()) for (const m of byFile.get(f)?.imports ?? []) covered.add(m);
const spent = (): number => [...selected.keys()].reduce((sum, f) => sum + cost(byFile.get(f) ?? { ms: 0 }), 0);
for (;;) {
  let best: { c: (typeof candidates)[number]; score: number } | undefined;
  for (const c of candidates) {
    if (selected.has(c.file) || c.ms > PER_FILE_CAP_MS) continue;
    const fresh = [...c.imports].filter((m) => !covered.has(m)).length;
    if (fresh === 0) continue;
    const score = fresh / cost(c);
    if (!best || score > best.score || (score === best.score && c.file < best.c.file)) best = { c, score };
  }
  if (!best || spent() + cost(best.c) > budgetMs) break;
  add(best.c.file, "breadth fill");
  for (const m of best.c.imports) covered.add(m);
}

const files = [...selected.keys()].sort();
const output = `${files.join("\n")}\n`;
const modulesCovered = srcFiles.filter((m) => covered.has(m)).length;
const summary =
  `test:gate selection: ${files.length} files, est. test time ${(spent() / 1000).toFixed(0)} s, ` +
  `${modulesCovered}/${srcFiles.length} src modules imported directly, uncovered targets: ${uncovered.length ? uncovered.join("; ") : "none"}`;

if (check) {
  const current = existsSync(join(ROOT, LIST)) ? readFileSync(join(ROOT, LIST), "utf8") : "";
  if (current !== output) {
    console.error(`${LIST} is stale; run: node --experimental-strip-types tools/test/generateTestGate.ts`);
    process.exit(1);
  }
  console.log(summary);
} else {
  writeFileSync(join(ROOT, LIST), output);
  writeFileSync(
    join(ROOT, "tools/test/test-gate.reasons.tsv"),
    `${files.map((f) => `${f}\t${selected.get(f)}\t${byFile.get(f)?.ms ?? 0}`).join("\n")}\n`,
  );
  console.log(summary);
}
