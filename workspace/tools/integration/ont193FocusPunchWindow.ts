// ont193 (docs/ont193-scene-on-tails.md, acceptance 3 fpo187 window): per fpo187 ON card and pre-pass, the ROM state-probe rows E (the last
// frame of the msgDisplay run before the focus-punch animation launches) -> launch L (first animActive row at General_FocusPunchSetUp) ->
// tightening glyph, against the production tightening glyph (fpc180Compare.ts). Read-only; run in the base and the final tree.
//   node --experimental-strip-types --no-warnings tools/integration/ont193FocusPunchWindow.ts
import { readFileSync } from "node:fs";
import { allResults } from "./fpc180Compare.ts";

const cards = ["a-switch-on", "b1-two-users-on", "b2-hit-scratch-on"]; // the committed fpo187 state probes
const results = Object.fromEntries(allResults().map((r) => [r.name.replace(/\.json$/, ""), r]));
console.log("card | pre-pass | ROM E | ROM L | E->L | ROM glyph | ROM E->glyph | prod glyph | prod - ROM");
for (const c of cards) {
  const rows = JSON.parse(readFileSync(`tools/integration/fixtures/fpo187/${c}.json`, "utf8")).rows as any[];
  const res = results[`fpc177-${c}`]!;
  const rom = res.romMessages.filter((m: any) => m.text.includes("tightening")).map((m: any) => m.glyph);
  const prod = res.prodMessages.filter((m: any) => m.text.includes("tightening")).map((m: any) => m.glyph);
  const launches = rows.filter((r, i) => r.animActive === 1 && r.animScript === "General_FocusPunchSetUp+0x3" && (i === 0 || rows[i - 1].animActive === 0));
  launches.forEach((l, k) => {
    let e = -1;
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].frame < l.frame && rows[i].msgDisplay === 1) { e = rows[i].frame; break; }
    console.log(`${c} | ${k + 1} | ${e} | ${l.frame} | ${l.frame - e} | ${rom[k]} | ${rom[k] - e} | ${prod[k]} | ${prod[k] - rom[k]}`);
  });
}
