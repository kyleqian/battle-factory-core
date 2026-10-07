// S10A baton-endeavor receipt: every dense fixture of tools/integration/fixtures/baton-endeavor-live through the production live renderer,
// twice from fresh mGBA processes (per-run RGB scratch directories deleted after the receipt), plus the ordinary-route summary
// (tools/integration/batonEndeavorRoutes.ts output, passed as the second argument).
//   node --experimental-strip-types --no-warnings tools/integration/batonEndeavorRoutes.ts > /tmp/be-routes.json
//   (same for the Endeavor routes: the JSON route list as its argument) > /tmp/be-en-routes.json
//   npx vite-node tools/integration/batonEndeavorReceipt.ts OUT.json /tmp/be-routes.json /tmp/be-en-routes.json
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { verifyLiveAdapterFramebuffer } from "./liveAdapterFramebuffer.ts";

const DIR = "tools/integration/fixtures/baton-endeavor-live";
const groups: Record<string, string[]> = {
  "baton-pass-live": readdirSync(DIR).filter((n) => /^baton-.*\.json$/.test(n)).sort().map((n) => `${DIR}/${n}`),
  "endeavor-live": readdirSync(DIR).filter((n) => /^endeavor-.*\.json$/.test(n)).sort().map((n) => `${DIR}/${n}`),
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
const routes = process.argv.slice(3).flatMap((p) => (JSON.parse(readFileSync(p, "utf8")) as any[]).map((r) => ({
  route: r.route, move: r.move, stalled: r.stalled, followingPrompt: r.followingPrompt, bodies: r.bodies, allBodies: r.allBodies,
  bodyInputs: r.bodyInputs, w3Messages: r.w3Messages, postBodyChangePoints: r.move === 226 ? r.postBodyChangePoints : undefined,
  sceneOnOffParity: r.sceneOnOffParity })));
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" }).trim();
const summary = { fixtures: rows.length, byGroup: Object.fromEntries(Object.entries(groups).map(([g, f]) => [g, f.length])), allExactTwiceFresh: allOk,
  routes: routes.length, routesAllPromptAndParity: routes.every((r) => r.followingPrompt === "action-menu" && Object.values(r.sceneOnOffParity).every(Boolean)),
  testedCommit: git("rev-parse", "HEAD"), testedWorkspaceSrcTree: git("rev-parse", "HEAD:workspace/src"), workingTreeSrcClean: git("status", "--porcelain", "--", "src") === "" };
writeFileSync(process.argv[2]!, JSON.stringify({ schema: "baton-endeavor-live-receipt/v1", summary, rows, routes }, null, 1) + "\n");
console.log(JSON.stringify(summary));
if (!allOk) process.exitCode = 1;
