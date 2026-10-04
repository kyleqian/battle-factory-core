/**
 * Build tools/integration/fixtures/altspecies3-results.json from the
 * retained evidence dirs of two fresh liveAdapterFramebuffer passes.
 * usage: altSpeciesReceipt.ts <evidence-root> (contains pass1/ and pass2/)
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import shadow from "../../src/assets/gen/battle-enemy-shadow.json" with { type: "json" };
import { analyze } from "./altSpeciesAnalyze.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const evRoot = resolve(root, process.argv[2]!);
const elevated = new Set((shadow.elevatedSpecies as string[]).map(s => s.replace("SPECIES_", "")));
const fixtures = readdirSync(join(root, "tools/integration/fixtures")).filter(f => /^altspecies3-.*\.json$/.test(f) && !f.includes("results") && !f.includes("derivation")).sort();
const summaryDir = join(root, "tools/integration/fixtures/altspecies3-evidence");
mkdirSync(summaryDir, { recursive: true });
const deriv = new Map((JSON.parse(readFileSync(join(root, "tools/integration/fixtures/altspecies3-derivation.json"), "utf8")) as { case: string }[]).map(r => [r.case, r]));
const cases = fixtures.map(file => {
  const livePath = `tools/integration/fixtures/${file}`;
  const live = JSON.parse(readFileSync(join(root, livePath), "utf8"));
  const src = JSON.parse(readFileSync(join(root, live.sourceFixture), "utf8"));
  const name = file.replace(/\.json$/, "");
  const runs = [];
  for (const pass of ["pass1", "pass2"]) for (const run of [0, 1]) {
    const dir = join(evRoot, pass, `${name}-run${run}`);
    const first = pass === "pass1" && run === 0;
    const a = analyze(livePath, dir, first ? join(evRoot, "png", name) : undefined);
    const cmp = JSON.parse(readFileSync(join(dir, "live-comparison.json"), "utf8"));
    if (first) copyFileSync(join(dir, "live-comparison.json"), join(summaryDir, `${name}.live-comparison.json`));
    const sourceDigest = createDigest(cmp.comparisons.map((r: { source: string }) => r.source));
    runs.push({ pass, run, dir: dir.replace(root + "/", ""), rows: a.rows, residualPixels: a.residualPixels, digest: a.digest, sourceDigest, residualRows: first ? a.residualRows : undefined,
      residualRowSummary: { count: a.residualRows.length, ages: a.residualRows.length > 6 ? `${a.residualRows[0]!.age}..${a.residualRows.at(-1)!.age}` : a.residualRows.map(r => r.age), rowsDigest: createDigest(a.residualRows.map(r => JSON.stringify(r))) } });
  }
  const attackerSide = src.attacker.geometry.side as string;
  const targetSide = src.target.geometry.side as string;
  const w = live.denseWindow ?? src.denseWindow ?? src.sourceWindow;
  return {
    case: name, derivation: deriv.get(name.replace("altspecies3-", "")), move: live.move ?? src.move, window: w,
    attacker: { species: src.attacker.species, side: attackerSide, elevated: attackerSide === "opponent" && elevated.has(src.attacker.species) },
    target: { species: src.target.species, side: targetSide, elevated: targetSide === "opponent" && elevated.has(src.target.species) },
    opponentSpecies: attackerSide === "opponent" ? src.attacker.species : src.target.species,
    opponentElevated: elevated.has(attackerSide === "opponent" ? src.attacker.species : src.target.species),
    scenario: src.scenario, sourceFixture: live.sourceFixture, liveFixture: livePath,
    identicalAcrossRuns: runs.every(r => r.digest === runs[0]!.digest && r.sourceDigest === runs[0]!.sourceDigest),
    runs,
  };
});
import { createHash } from "node:crypto";
function createDigest(parts: string[]) { return createHash("sha256").update(parts.join(",")).digest("hex"); }
writeFileSync(join(root, "tools/integration/fixtures/altspecies3-results.json"), JSON.stringify({
  schema: "altspecies3-results/v1", generatedAt: new Date().toISOString().slice(0, 10),
  evidenceRoot: process.argv[2], method: "liveAdapterFramebuffer.ts x2 passes x 2 fresh direct-mGBA runs per pass; residual rows attributed by altSpeciesAnalyze.ts",
  cases,
}, null, 1) + "\n");
console.log(cases.map(c => `${c.case} rows=${c.runs[0]!.rows} residual=${c.runs.map(r => r.residualPixels).join("/")} same=${c.identicalAcrossRuns}`).join("\n"));
