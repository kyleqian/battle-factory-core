// Build a rung-2 class-measurement fixture (docs/postko-consumer-audit.md §5.3): model check of a fresh postkoStateProbe.py run of
// a new post-KO BattleLab scenario (SCENARIOS of postkoModelCheck.ts) + a dense fixture whose window = the edge's activation + the
// move's accepted window offset and whose `precedingTurns` = the scenario's semantic history (postkoLendHistory.ts).
//   npx vite-node tools/integration/postkoLendClassFixture.ts -- <scenario-key> <probe.json> <edge-label> <template.json> <out.json> \
//     <move> <offset> <rows> [<ageOffset>]
import { readFileSync, writeFileSync } from "node:fs";
import { modelCheck } from "./postkoModelCheck.ts";
import { postkoTurnsToEdge } from "./postkoLendHistory.ts";

const [key, probePath, label, templatePath, out, move, offset, rows, ageOffset] = process.argv.slice(2).filter(arg => arg !== "--");
const check = modelCheck(key!, JSON.parse(readFileSync(probePath!, "utf8")));
const index = check.edges.findIndex(edge => edge.label === label);
const edge = check.edges[index] as { riseFrame: number; mismatches: number; known: boolean };
if (index < 0 || edge.mismatches !== 0 || !edge.known) throw new Error(`edge ${label}: ${JSON.stringify(edge)}`);
const checkPath = `tools/integration/fixtures/postko-lend/model-check-${key}.json`;
writeFileSync(checkPath, JSON.stringify(check, null, 1) + "\n");
const template = JSON.parse(readFileSync(templatePath!, "utf8"));
const start = edge.riseFrame + Number(offset);
const fixture = {
  ...template, draft: false, move, scenario: `tools/battle-lab/${key}.json`, stateFixture: undefined, modelCheck: checkPath,
  edgeRiseFrame: edge.riseFrame, windowOffsetFromActivation: Number(offset),
  denseWindow: { startFrame: start, endFrame: start + Number(rows) - 1, ...(ageOffset ? { ageOffset: Number(ageOffset) } : {}) },
  note: `rung-2 class measurement: accepted window offset ${offset} (${rows} rows) of the move's accepted fixture; first body after the send-out`,
  denseProof: undefined, precedingTurns: postkoTurnsToEdge(key!, index),
};
writeFileSync(out!, JSON.stringify(fixture, null, 1) + "\n");
console.log(JSON.stringify({ key, label, riseFrame: edge.riseFrame, window: fixture.denseWindow, edges: check.edgeCount, mismatchedEdges: check.mismatchedEdges }));
