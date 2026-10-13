// offs152 R5 (docs/offs152-scene-off-send-in-tail.md): the sMonAnimFunctions callback length A of the front animation ids that no
// swept Factory species dominated (absent from fixtures/send-in-tail/anim-duration.json), derived from the ported source reducers:
// A = FRONT_SEND_OUT_TERMINAL_TICKS[family] + 1 (the reducer's last callback tick + the WaitAnimEnd hand-off). The rule reproduces 44 / 46
// fitted ids (H_JUMPS / RAPID_H_HOPS: + 2) and the 4 genderless species that need it (MAGNEMITE, STARYU, LUNATONE, SOLROCK).
//   node --experimental-strip-types --no-warnings tools/integration/offs152AnimTerminal.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { FRONT_SEND_OUT_TERMINAL_TICKS } from "../../src/animation/sendOutDispatcher.ts";

const fitted = JSON.parse(readFileSync("tools/integration/fixtures/send-in-tail/anim-duration.json", "utf8")) as Record<string, number>;
const tables = JSON.parse(readFileSync("tools/integration/fixtures/send-in-tail/front-anim-tables.json", "utf8")) as Record<string, [string, number]>;
const ids = JSON.parse(readFileSync("tools/integration/fixtures/forced-switch/factory-species-ids.json", "utf8")) as number[];
const terminal = FRONT_SEND_OUT_TERMINAL_TICKS as Record<string, number>;
const out: Record<string, number> = {};
for (const animId of [...new Set(ids.map((sp) => tables[String(sp)]![0]))].sort()) {
  if (fitted[animId] !== undefined) continue;
  const ticks = terminal[animId.replace(/^ANIM_/, "")];
  if (ticks !== undefined) out[animId] = ticks + 1;
}
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1) + "\n");
console.log(out);
