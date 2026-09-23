import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "../../src/engine/core.ts";
import { playableAnimationReplay } from "./playableAnimationReplay.ts";

const [build, outputDir = ".integration/preview-evidence"] = process.argv.slice(2);
if (!build) throw new Error("usage: preparePlayablePreviewEvidence.ts <exact-build-stamp> [output-dir]");
const replay = playableAnimationReplay("on");
const samples = replay.observations.filter(o => o.moveId === 325 || o.moveId === 109).map((o, index) => {
  const middle = o.samples[1]!;
  return {
    frame: o.frame + middle.age,
    sha256: middle.sha256,
    label: `move-${o.moveId}-${index}`,
    player: o.player, opponent: o.opponent, attacker: o.attacker,
  };
});
const trace = { ...replay.trace, build };
mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, "trace.json"), JSON.stringify(trace, null, 2) + "\n");
writeFileSync(resolve(outputDir, "evidence.json"), JSON.stringify({
  build, trace, samples, observations: replay.observations,
  finalSha256: createHash("sha256").update(render(replay.state)).digest("hex"),
  commandBoundaries: replay.boundaries.map(s => ({ frame: s.frame, battle: s.factoryRoundBattleOrchestrator!.battle })),
}, null, 2) + "\n");
console.log(JSON.stringify({ build, frame: trace.frame, samples: samples.length, boundaries: replay.boundaries.length }));
