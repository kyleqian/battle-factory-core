// prep11: assembles tools/integration/fixtures/prep11-live-adapter-receipt.json from a liveFixtureBatch.sh summary.json
// (two fresh direct-mGBA runs per fixture through verifyLiveAdapterFramebuffer on the final code).
// usage (workspace root): node tools/integration/prep11Receipt.mjs <summary.json> <codeCommit> <codeTree>
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const [summaryPath, commit, tree] = process.argv.slice(2);
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const FX = "tools/integration/fixtures";
const fixtures = [];
for (const f of readdirSync(`${FX}/prep11-live`).sort()) {
  const d = JSON.parse(readFileSync(`${FX}/prep11-live/${f}`, "utf8")), s = summary[f.replace(/\.json$/, "")];
  fixtures.push({ fixture: `${FX}/prep11-live/${f}`, move: d.move, attacker: `${d.attacker.species}/${d.attacker.geometry.side}`, target: `${d.target.species}/${d.target.geometry.side}`,
    alternate: /-alt-/.test(f), window: d.denseWindow, ...(d.precedingBodies ? { precedingBodies: d.precedingBodies } : {}), rows: s?.rows, exactRows: s?.exactRows, residualPixels: s?.residual });
}
const leaf = [];
for (const [name, path] of [["prep11-leaf-blade-player-sceptile-opponent-golem", `${FX}/prep11`], ["prep11-leaf-blade-player-ninetales-opponent-golem", `${FX}/prep11`],
  ["prep11-leaf-blade-player-sceptile-opponent-steelix", `${FX}/prep11`], ["prep11-leaf-blade-player-ninetales-opponent-onix", `${FX}/prep11`],
  ["order-consumer-leaf-blade-player", FX], ["order-consumer-leaf-blade-opponent", FX], ["prep5-leaf-blade-player", FX], ["prep5-leaf-blade-opponent", FX]]) {
  const s = summary[name]; leaf.push({ fixture: `${path}/${name}.json`, rows: s?.rows, exactRows: s?.exactRows, residualPixels: s?.residual });
}
const routes = [
  ["MOVE_LEECH_SEED", 73, "16/28 VENUSAUR slot 0 (first body, order known)"], ["MOVE_TRI_ATTACK", 161, "0/21 DUGTRIO slot 1 (first body, order known)"],
  ["MOVE_PETAL_DANCE", 80, "49/7 GLOOM slot 0 (first body, order known; 2 complete bodies)"], ["MOVE_DESTINY_BOND", 194, "18/42 GENGAR slot 3 (first body, order known)"],
  ["MOVE_AIR_CUTTER", 314, "57/7 GOLBAT slot 0 (first body, order known)"], ["MOVE_FORESIGHT", 193, "100/14 HITMONLEE slot 2 (first body, order known)"],
  ["MOVE_SKY_UPPERCUT", 327, "48/7 HITMONCHAN slot 1 (first body, order known)"],
  ["MOVE_SPIDER_WEB", 169, "567/0 ARIADOS slot 1 (first body, order known; prep11-routes.json 118/0 never requested it: tools/integration/prep11RouteSearch.ts)"],
  ["MOVE_RECYCLE", 278, "378/0 PORYGON moves [0, 2]: turn 2 after the consumed item (not first body; Recycle is order-independent). One-turn 78/0 never requests it (no used item)"]];
const receipt = {
  schema: "prep11-live-adapter-receipt/v1", doc: "docs/next-adapters-prep11.md", codeCommit: commit, codeTree: tree,
  method: "tools/integration/liveFixtureBatch.sh: 4 parallel, 2 fresh direct-mGBA runs per fixture through verifyLiveAdapterFramebuffer (production live renderer); window = activation + accepted offset 0",
  issue144: { fix: "leafBladeDisplayedTargetX2AtAge(age, side, targetIdleX2) <- liveBattlerAnchors(...).frontIdleRest.x2 (liveMoveAnimation.ts case 348); staged default stays ONIX (1)", fixtures: leaf,
    postKo: "tools/integration/fixtures/postko-lend/postko-leaf-blade-fixed-receipt.json: 224/224 twice, 0 px through postkoLendDense.ts; POSTKO_LEND_EXCLUDED_MOVE_IDS now empty" },
  adapters: routes.map(([move, id, route]) => ({ move, id, route })),
  fixtures,
  limits: [
    "MOVE_SKY_UPPERCUT COMBUSKEN alternate: 173/189 rows exact, residual ages 170-188 (full-screen fade restore one frame off): the COMBUSKEN script ends 1 frame later (prep11 open point 1), species-dependent and NOT modelled",
    "MOVE_SPIDER_WEB ARIADOS alternate: 193/207 rows, 14 px = one animated pixel of the ARIADOS back sprite (x92 y97, every third age 40-79, thread-independent); the base SPINARAK orientations are exact",
    "MOVE_LEECH_SEED: main body only; the end-turn drain (move 0, 207 rows) stays scene-off",
    "A live adapter is not whole-playable arbitrary-history exactness."],
};
writeFileSync(`${FX}/prep11-live-adapter-receipt.json`, JSON.stringify(receipt, null, 1) + "\n");
console.log(fixtures.map(f => `${f.fixture.split("/").pop()} ${f.rows} ${JSON.stringify(f.exactRows)} ${JSON.stringify(f.residualPixels)}`).join("\n"));
