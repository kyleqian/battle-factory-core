// prep11: dump the animationInputs/animationProfile of the accepted-corpus config builders (tools/compare/verify*Reducer.ts),
// the constants the production live cases port (docs/next-adapters-prep11.md s0.2). usage: npx vite-node tools/integration/prep11InputsDump.ts <move>
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { destinyBondConfigFor } from "../compare/verifyDestinyBondReducer.ts";
import { airCutterConfigFor } from "../compare/verifyAirCutterReducer.ts";
import { petalDanceConfigFor } from "../compare/verifyPetalDanceReducer.ts";
import { skyUppercutConfigFor } from "../compare/verifySkyUppercutReducer.ts";
import { foresightConfigFor } from "../compare/foresightActualCore.ts";
import { recycleConfigFor, recycleRowsFor } from "../compare/recycleFramebuffer.ts";
const move = process.argv.at(-1)!;
const rowsOf = (m: string, o: string) => (JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/${m}-${o === "player-back" ? "player" : "opponent"}-dense-state.json.gz`)).toString()) as any).frames;
for (const o of ["player-back", "opponent-front"] as const) {
  let cfg: any;
  if (move === "destiny-bond") { const r = rowsOf(move, o); cfg = destinyBondConfigFor(o, r, r[0].spriteOrder); }
  if (move === "air-cutter") { cfg = airCutterConfigFor(o, rowsOf(move, o)); }
  if (move === "petal-dance") { const r = rowsOf(move, o); cfg = petalDanceConfigFor(o, r, r[0].spriteOrder); }
  if (move === "sky-uppercut") { const r = rowsOf(move, o); cfg = skyUppercutConfigFor(o, r, r[0].spriteOrder); }
  if (move === "foresight") cfg = foresightConfigFor(o);
  if (move === "recycle") { const r = recycleRowsFor(o); cfg = recycleConfigFor(o, r as any); }
  const { animationInputs, animationProfile, attacker, target } = cfg;
  const strip = (x: any) => x && Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === "spriteOrder" ? `[${(v as any[]).length}]` : v]));
  console.log(JSON.stringify({ o, attacker: attacker.geometry, target: target.geometry, animationInputs: strip(animationInputs), animationProfile: strip(animationProfile) }));
}
