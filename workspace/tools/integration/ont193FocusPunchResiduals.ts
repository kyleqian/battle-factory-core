// ont193 (docs/ont193-scene-on-tails.md): per fpc177 card, the production - ROM glyph residual of every "is tightening" print and of the
// Focus Punch "used" print. Run in the base tree and the final tree; read-only.
//   node --experimental-strip-types --no-warnings tools/integration/ont193FocusPunchResiduals.ts
import { allResults } from "./fpc180Compare.ts";

for (const r of allResults()) {
  const pick = (ms: { glyph: number; text: string }[], pred: (t: string) => boolean) => ms.filter((m) => pred(m.text)).map((m) => m.glyph);
  const tight = (t: string) => t.includes("tightening");
  const used = (t: string) => t.includes("used") && t.includes("FOCUS PUNCH");
  const cells = (pred: (t: string) => boolean) => {
    const rom = pick(r.romMessages, pred), prod = pick(r.prodMessages, pred);
    return prod.length === 0 ? "-" : prod.map((g, i) => (rom[i] === undefined ? `${g}(no ROM)` : `${g - rom[i]!}`)).join(",");
  };
  console.log(`${r.name.replace(/\.json$/, "")} | tightening resid ${cells(tight)} | used resid ${cells(used)}`);
}
