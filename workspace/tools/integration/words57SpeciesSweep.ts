// words57: does the Sand-Attack / Mud-Slap carry's post-body free order depend on the battlers' species (the anchors the words carry reads
// from the CONSUMER's field)? For the first dirt body of every job, substitute one side's species (28 species) and compare the post-body
// free order with the probed species'. usage: node --experimental-strip-types --no-warnings tools/integration/words57SpeciesSweep.ts <units.json>
import { readFileSync } from "node:fs";
import { compareBody, dirtModel } from "./prep46Carry.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderWithOccupiedPrefix } from "../../src/engine/spriteOrderProvider.ts";
const d = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const species = [1, 4, 7, 18, 25, 27, 52, 67, 75, 79, 95, 101, 108, 122, 131, 143, 152, 191, 194, 200, 228, 248, 376, 214, 130, 6, 9, 3];
let diffs = 0, total = 0;
for (const [name, job] of Object.entries<any>(d.jobs)) {
  for (const u of job.units) {
    if (u.kind !== "body" || (u.mv !== 28 && u.mv !== 189)) continue;
    const act = spriteOrderWithOccupiedPrefix({ known: true, free: u.F0, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!;
    const side = job.wordsSide;
    const base = { player: job.species.player[0], opponent: job.species.opponent[0] };
    const ref = JSON.stringify(compareBody(u, dirtModel({ unit: "", identicalAB: true, attackerSide: side, species: base, units: [] } as any, u, act)).postFree);
    const out: string[] = [];
    for (const which of ["player", "opponent"] as const) for (const s of species) {
      const sp = { ...base, [which]: s };
      total++;
      const post = JSON.stringify(compareBody(u, dirtModel({ unit: "", identicalAB: true, attackerSide: side, species: sp, units: [] } as any, u, act)).postFree);
      if (post !== ref) { diffs++; out.push(`${which}=${s}`); }
    }
    console.log(name, u.mv, u.frame, side, "differs for:", out.length, out.slice(0, 10).join(" "));
    break;
  }
}
console.log("post-free differs", diffs, "/", total);
