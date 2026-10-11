// Live audit 22: production's Double Team clone step counter (dt60 liveDoubleTeamAttackerStepCounter, the value case 104 reads) for every
// DOUBLE_TEAM window fixture in <fixture-dir> (attacker side / species / attackerPersonality, as the fixture path feeds liveView).
//   node --experimental-strip-types --no-warnings tools/integration/audit22StepCounter.ts <fixture-dir>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { liveDoubleTeamAttackerStepCounter } from "../../src/engine/liveMoveAnimation.ts";

const dir = process.argv[2]!;
for (const n of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const f = JSON.parse(readFileSync(join(dir, n), "utf8"));
  if (f.move !== "DOUBLE_TEAM") continue;
  const side = f.attacker.geometry.side;
  console.log(JSON.stringify({ fixture: n, side, species: f.attacker.species, personality: f.attackerPersonality,
    stepCounter: liveDoubleTeamAttackerStepCounter(side, f.attacker.species, f.attackerPersonality) }));
}
