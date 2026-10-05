// Roar / Whirlwind live receipt: dense summaries (liveFixtureBatch.sh, two fresh runs each per batch) + continuation compare
// (forcedSwitchContinuationCompare.ts) of two independent batches -> tools/integration/fixtures/roar-live-receipt.json.
// usage: node tools/integration/roarLiveReceipt.mjs <code-commit> <src-tree> <dense1-dir> <cont1.json> <dense2-dir> <cont2.json>
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const [commit, srcTree, d1, c1, d2, c2] = process.argv.slice(2);
const dense = (dir) => Object.fromEntries(readdirSync(dir).filter(f => f.endsWith(".out")).sort().map(f => {
  const runs = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  return [f.slice(0, -4), runs.map(r => ({ rows: r.rows, exactRows: r.exactRows, residualPixels: r.residualPixels,
    expectedDuration: r.expectedDuration, digest: r.digest }))];
}));
const cont = (path) => JSON.parse(readFileSync(path, "utf8")).map(r => ({
  fixture: r.fixture.split("/").pop(), run: r.run, E: r.E, target: r.target, incoming: r.incoming, emergeK: r.emergeK,
  throughEmerge: r.throughEmerge, tail: r.tail, digest: r.digest,
}));
const receipt = {
  schema: "roar-live-receipt/v1",
  claim: "MOVE_ROAR / MOVE_WHIRLWIND live in Scene ON with an exact forced-switch removal (no recall animation; target and healthbox hidden from framebuffer E+5, send-in from E+11); the send-in tail is the open ISSUES #146 gap",
  testedCode: { commit, srcTree },
  oracle: "independent direct mGBA runs (tools/probe/run-battle-lab-rgb.py via liveAdapterFramebuffer.ts), Scene ON lab scenarios; no shared oracle service contacted",
  dense: { batch1: dense(d1), batch2: dense(d2) },
  continuation: {
    method: "body rows via liveView (dense path); k = frames after the body's last row E: forced hold E+1..E+4, recall receipt E+5..E+10, switch-in from E+11, rendered by createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView over the production forced command shapes; source = the same fresh runs' RGB (sha256-checked). Through-emerge = RAM ball+19 (opponent target, E+29) / ball+47 (player target, E+57); tail = the following 40 frames",
    batch1: cont(c1), batch2: cont(c2),
  },
};
writeFileSync("tools/integration/fixtures/roar-live-receipt.json", JSON.stringify(receipt, null, 1) + "\n");
console.log("written");
