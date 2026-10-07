// r2-gates receipt: folds the unpatched-production-renderer dense outputs (r2GatesDense.sh pass dir) into tools/integration/fixtures/r2-gates-firepunch-receipt.json.
// usage: node tools/integration/r2GatesReceipt.mjs <pass dir, e.g. /tmp/r2g/dense/f1> <tested code commit>
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
const [pass, commit] = process.argv.slice(2);
const group = (dir, out, filter = () => true) => Object.fromEntries(readdirSync(`${pass}/${dir}`).filter((n) => n.endsWith(".out") && filter(n)).sort().map((n) => {
  const runs = JSON.parse(readFileSync(`${pass}/${dir}/${n}`, "utf8"));
  return [n.replace(/\.out$/, ""), { rows: runs[0].rows, expectedDuration: runs[0].expectedDuration,
    freshRuns: runs.map((r) => ({ rows: r.rows, exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest })) }];
}));
const receipt = {
  schema: "r2-gates-firepunch-receipt/v1",
  testedCommit: commit, srcTree: execSync(`git rev-parse ${commit}:workspace/src`).toString().trim(),
  renderer: "UNPATCHED production live renderer (tools/integration/liveAdapterFramebuffer.ts: direct mGBA, 2 fresh probe processes per fixture; windows = each scenario's own source activation, never matched to live output)",
  firePunch: { fixtures: group("r2-gates", null, (n) => n.startsWith("fp-")) },
  psychUpOpponentAlternates: { fixtures: group("r2-gates", null, (n) => n.startsWith("pua-")),
    declined: { "r2g-pua-mrmime-magneton": "MR_MIME -> MAGNETON: constant 537 px/row from age 0 (field 189 + chrome 348), 0/179 exact rows twice fresh; not body dependent, unresolved, not claimed (fixture not committed)" } },
  lb21LaterBodies: { fixtures: group("later-bodies-bg-2"), note: "Overheat both sides after Tackle / Splash / Psychic / Growl+stat / Swords Dance+stat; Psych Up opponent first body + 5 later + 1 after its own Psych Up; docs/later-bodies-overheat-psychup.md" },
  existingRegression: { prep16Live: group("prep16-live"), laterBodiesBg: group("later-bodies-bg") },
  routes: JSON.parse(readFileSync("tools/integration/fixtures/r2-gates/routes.json", "utf8")),
};
writeFileSync("tools/integration/fixtures/r2-gates-firepunch-receipt.json", JSON.stringify(receipt, null, 1) + "\n");
console.log(Object.keys(receipt.firePunch.fixtures).length, Object.keys(receipt.lb21LaterBodies.fixtures).length);
