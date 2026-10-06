// prep14: overheatAnimationRngDrawsAtAge (the reducer's cumulative gRng2 advance count (ages where it does not increment = lag ages)) vs the ROM lag ages (0-step frames) of the Overheat probes in plans.json.   npx vite-node tools/integration/prep14OverheatRngLag.ts
import { readFileSync } from "node:fs";
import { overheatAnimationRngDrawsAtAge } from "../../src/animation/overheat.ts";
const plans = JSON.parse(readFileSync("tools/integration/fixtures/prep14/plans.json", "utf8"));
for (const side of ["player", "opponent", "alternate"] as const) {
  const e = plans.moves.overheat[side]; const rows = side === "alternate" ? 230 : e.acceptedWindow.rows;
  const lag: number[] = []; for (let age = 1; age < rows; age += 1) if (overheatAnimationRngDrawsAtAge(age) === overheatAnimationRngDrawsAtAge(age - 1)) lag.push(age);
  console.log(side, "reducer lag ages", JSON.stringify(lag), "ROM lag ages (within window)", JSON.stringify(e.lagAges.filter((a: number) => a < rows)), JSON.stringify(lag) === JSON.stringify(e.lagAges.filter((a: number) => a < rows)));
}
