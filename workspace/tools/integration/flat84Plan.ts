// flat84 (S10A, evidence only): Flatter 260's words-order plan vs the ROM, per Flatter body of the flat84 probes (flat77Probe.py output).
// Runs INSIDE the patched git-archive copy (it imports the temp patch's liveFlatterWordsPostFree). Per body:
//  - activation free order = the ROM sSpriteOrder at activation (`at.spriteOrder`) without the known-entry occupied slots (the scenarios
//    never leave the entry occupancy: no KO / switch; asserted by the occupied prefix);
//  - words = the production presentation host pinned at the RAM gRng2Value of the activation (`at.rng2`), activated for the body's request
//    (activateLiveMovePresentationRng; LIVE_MOVE_RANDOM2_PLANS[260] = 114 words);
//  - species = the RAM gBattleMons species of the activation (`at.battlers[].species`, internal ids);
//  - plan = liveFlatterWordsPostFree(...) (the adapter's carried order at its last row, entry slots removed).
// FLAT84_PREDICT=1: print the plan only (never reads endOrder). Otherwise: plan vs the ROM free order on the first inactive frame
// (`endOrder` without the entry slots), one JSON line per body + a summary line.
//   node --experimental-strip-types --no-warnings tools/integration/flat84Plan.ts <probe-r1-dir>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveFlatterWordsPostFree } from "../../src/engine/liveMoveAnimation.ts";
import { activateLiveMovePresentationRng, liveMovePresentationRngWords } from "../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngHostAt } from "../../src/engine/presentationRngHost.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER } from "../../src/engine/spriteOrderProvider.ts";

type Json = Record<string, any>;
const dir = process.argv[2]!;
const predict = process.env.FLAT84_PREDICT === "1";
const occupied = new Set(KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
const free = (order: readonly number[]) => order.filter((s) => !occupied.has(s));
let n = 0, exact = 0;
const distinct = new Set<string>();
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const probe = JSON.parse(readFileSync(join(dir, file), "utf8")) as Json;
  let k = 0;
  for (const b of probe.bodies as Json[]) {
    if (b.label !== "Move_FLATTER") continue;
    const index = k++;
    const order = b.at.spriteOrder as number[];
    const prefixEntry = JSON.stringify(order.slice(0, occupied.size).sort((x, y) => x - y)) === JSON.stringify([...occupied].sort((x, y) => x - y));
    const attackerSide = b.attacker === 0 ? "player" as const : "opponent" as const;
    const req = battleMoveAnimationRequest(b.attacker, b.target, ["260", "0", "0", "0", "70", "0"]);
    const key = `flat84:${file}:${index}`;
    const host = createPresentationRngHostAt(createPresentationRngState(b.at.rng2 as number, "pinned"));
    const words = liveMovePresentationRngWords({ host: activateLiveMovePresentationRng(host, req, key), key });
    const bodySpecies = { player: b.at.battlers[0].species as number, opponent: b.at.battlers[1].species as number };
    const plan = liveFlatterWordsPostFree({ attackerSide }, free(order), words, bodySpecies);
    const row: Json = { scenario: file.replace(/\.json$/, ""), flatter: index, startFrame: b.startFrame, attackerSide, rng2: b.at.rng2,
      prefixEntry, activationFree: free(order).slice(0, 12), plan };
    n++;
    if (plan !== null) distinct.add(JSON.stringify(plan));
    if (!predict) {
      const rom = free(b.endOrder as number[]);
      row.same = plan !== null && JSON.stringify(plan) === JSON.stringify(rom);
      if (row.same) exact++;
      else row.rom = rom;
      delete row.plan;
      row.planHead = plan?.slice(0, 16) ?? null;
    }
    console.log(JSON.stringify(row));
  }
}
console.log(JSON.stringify(predict ? { bodies: n, distinctPlans: distinct.size } : { bodies: n, exact, distinctPlans: distinct.size }));
