// #150 + Sheer Cold receipt: every listed dense fixture through the production live renderer, twice from fresh mGBA processes (per-run RGB
// scratch directories deleted after the receipt). Groups: audit-6 defect rows, previously exact audit-6 Signal Beam / Fire Punch rows, the
// r3-profile-live Signal Beam and r2-gates Fire Punch sets, Curse RATTATA / ONIX target rows, the MR_MIME verifier row, Sheer Cold.
//   npx vite-node tools/integration/fix150Receipt.ts OUT.json
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync, writeFileSync } from "node:fs";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

const F = "tools/integration/fixtures";
const A6 = `${F}/species-audit-6/derived`;
const list = (dir: string, re: RegExp) => readdirSync(dir).filter((n) => re.test(n)).sort().map((n) => `${dir}/${n}`);
const groups: Record<string, string[]> = {
  "audit6-defect-signal-beam-rattata": list(A6, /^rattata[A]?-signal-beam-/),
  "audit6-exact-sample-signal-beam-fire-punch": [
    ...list(A6, /^(steelix|pichu|wailord)-signal-beam-/), ...list(A6, /^(tyranitar|pichu)-fp-/)],
  "r3-profile-live-signal-beam": list(`${F}/r3-profile-live`, /^signal-beam-/),
  "r2-gates-fire-punch": list(`${F}/r2-gates`, /^fp-/),
  "curse-idle-target-lift": list(A6, /^(rattata|onix)-stats-/),
  "verifier-display-name-mr-mime": [`${A6}/mrmime-magneton-pua.json`],
  "sheer-cold-live": list(`${F}/sheer-cold-live`, /^sheer-cold-/),
};
const rows: unknown[] = [];
let allOk = true;
for (const [group, files] of Object.entries(groups)) {
  for (const path of files) {
    const runs = verifyLiveAdapterFramebuffer(path, 2);
    for (const r of runs) rmSync(r.scratch as string, { recursive: true, force: true });
    const exact = runs.every((r) => r.exactRows === r.rows && r.residualPixels === 0 && r.expectedDuration === r.rows + r.ageOffset)
      && runs[0]!.digest === runs[1]!.digest;
    allOk &&= exact;
    console.log(group, path.split("/").pop(), runs.map((r) => `${r.exactRows}/${r.rows} ${r.residualPixels}px`).join(" "), exact ? "OK" : "FAIL");
    rows.push({ group, fixture: path, rows: runs[0]!.rows, expectedDuration: runs[0]!.expectedDuration,
      runs: runs.map((r) => ({ exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest })), freshRunsIdentical: runs[0]!.digest === runs[1]!.digest, exact });
  }
}
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" }).trim();
const summary = { fixtures: rows.length, byGroup: Object.fromEntries(Object.entries(groups).map(([g, f]) => [g, f.length])), allExactTwiceFresh: allOk,
  testedCommit: git("rev-parse", "HEAD"), testedWorkspaceSrcTree: git("rev-parse", "HEAD:workspace/src"), workingTreeSrcClean: git("status", "--porcelain", "--", "src") === "" };
writeFileSync(process.argv[2]!, JSON.stringify({ schema: "fix150-live-receipt/v1", summary, rows }, null, 1) + "\n");
console.log(JSON.stringify(summary));
if (!allOk) process.exitCode = 1;
