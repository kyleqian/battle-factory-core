// prep16: run the real Overheat / Silver Wind reducers with `palettes` = the production composite (prep16PaletteComposite.ts) and the move's asset palette words, and compare the banks the renderer reads
// ([2,3,4] field, monbg BG bank, battler OBJ 16/17, asset banks 23/24) of state.palette.{hardware,faded,unfaded} with the ROM (prep16Probe.py output, direct mGBA) at every probed age < end.
//   npx vite-node tools/integration/prep16PaletteCheck.ts /tmp/p16/r1 [out.json]
import { readFileSync, writeFileSync } from "node:fs";
import { overheatAtAge, OVERHEAT_FIRST_INACTIVE_AGE, type OverheatLiveInputs } from "../../src/animation/overheat.ts";
import { silverWindAtAge, type SilverWindLiveInputs } from "../../src/animation/silverWind.ts";
import { overheatInputsFor } from "../compare/verifyOverheatReducer.ts";
import { silverWindInputsFor } from "../compare/verifySilverWindReducer.ts";
import { assetWords, composePalettes } from "./prep16PaletteComposite.ts";
import ember from "../../src/assets/gen/battle-anim-small-ember.json" with { type: "json" };
import hit from "../../src/assets/gen/battle-anim-hitsplat.json" with { type: "json" };
import swAsset from "../../src/animation/assets/silver-wind.json" with { type: "json" };
const DIR = process.argv[2] ?? "/tmp/p16/r1", OUT = process.argv[3];
const NAMES: Record<number, string> = {};
for (const m of readFileSync("reference/pokeemerald/include/constants/species.h", "utf8").matchAll(/#define SPECIES_(\w+)\s+(\d+)/g)) NAMES[Number(m[2])] = m[1]!;
const bank = (a: readonly number[] | string, b: number): string => typeof a === "string" ? a.slice(b * 64, b * 64 + 64) : a.slice(b * 16, b * 16 + 16).map((w) => w.toString(16).padStart(4, "0")).join("");
const ranges = (a: number[]): string => { const r: string[] = []; for (let i = 0; i < a.length;) { let j = i; while (a[j + 1] === a[j]! + 1) j += 1; r.push(j > i ? `${a[i]}-${a[j]}` : `${a[i]}`); i = j + 1; } return r.join(","); };
const out: Record<string, any> = {}; let totalBad = 0, totalCmp = 0;
for (const [move, id, scen] of [["overheat", 315, ["acc-player", "acc-opponent", "alt-player", "alt-opponent"]], ["silverwind", 318, ["acc-player", "acc-opponent", "alt-player", "alt-opponent"]]] as const) {
  for (const sc of scen) {
    const j = JSON.parse(readFileSync(`${DIR}/prep16-${move}-${sc}.json`, "utf8"));
    const b = j.bodies.find((x: any) => x.move === id); const side = b.attacker === 0 ? "player" : "opponent";
    const pal = composePalettes(NAMES[b.mons[0]]!, NAMES[b.mons[1]]!);
    const orient = side === "player" ? "player-back" : "opponent-front";
    let step: (age: number) => any, endAge: number, readBanks: number[];
    if (move === "overheat") {
      const base = overheatInputsFor(orient);
      const input: OverheatLiveInputs = { ...base, palettes: pal,
        resources: { smallEmber: { ...base.resources.smallEmber, palette: assetWords(ember.palette as any) }, impact: { ...base.resources.impact, palette: assetWords(hit.palette as any) } } };
      step = (age) => overheatAtAge(age, input); endAge = OVERHEAT_FIRST_INACTIVE_AGE;
      readBanks = [2, 3, 4, input.background.monbgPaletteBank, 16, 17, 16 + input.resources.smallEmber.paletteAllocatorSlot, 16 + input.resources.impact.paletteAllocatorSlot];
    } else {
      const base = silverWindInputsFor(orient);
      const input: SilverWindLiveInputs = { ...base, palettes: pal, resources: { sparkle6: { ...base.resources.sparkle6, palette: assetWords((swAsset as any).resources.sparkle6.palette) } } };
      step = (age) => silverWindAtAge(age, input); endAge = 190;
      readBanks = [2, 3, 4, input.background.monbg.paletteBank, 16, 17, base.resources.sparkle6.paletteBank];
    }
    // reducer(composite) vs reducer(accepted-corpus palettes, verified == corpus by verify*Reducer.ts) on the read banks, EVERY age < end (accepted scenarios only: the constants are those scenarios')
    let eqAcc: any = null;
    if (sc.startsWith("acc")) {
      const accStep = move === "overheat" ? (age: number) => overheatAtAge(age, overheatInputsFor(orient)) : (age: number) => silverWindAtAge(age, silverWindInputsFor(orient));
      const resid: Record<string, string[]> = {}; let n = 0, ne = 0;
      for (let age = 0; age < endAge; age += 1) {
        const a = accStep(age).palette, c = step(age).palette;
        for (const kind of ["hardware", "faded", "unfaded"] as const) for (const bk of readBanks) { n += 1; if (bank(a[kind], bk) !== bank(c[kind], bk)) { ne += 1; (resid[`${kind}:bank${bk}`] ??= []).push(String(age)); } }
      }
      eqAcc = { compared: n, differing: ne, differingBankAges: Object.fromEntries(Object.entries(resid).map(([k, v]) => [k, ranges(v.map(Number))])) };
      console.log(move, sc, "composite vs accepted-palettes reducer, all ages:", JSON.stringify(eqAcc));
    }
    const rows: Record<string, any> = {}; let bad = 0, cmp = 0;
    for (const [ageS, rom] of Object.entries<any>(b.palFull)) {
      const age = Number(ageS); if (age >= endAge) continue;
      const s = step(age).palette;
      const r: Record<string, number[]> = {};
      for (const kind of ["hardware", "faded", "unfaded"] as const) {
        const romKind = kind === "hardware" ? "hw" : kind;
        const mism = readBanks.filter((bk) => bank(s[kind], bk) !== bank(rom[romKind], bk));
        // asset banks are loaded by the reducer from age 1 (small ember / sparkle) or 4 (impact): before that they hold previous-body leftovers by design (ROM stale), not read by the renderer
        r[kind] = mism; cmp += readBanks.length; bad += mism.length;
      }
      rows[ageS] = r;
    }
    out[`${move}-${sc}`] = { compositeVsAcceptedReducer: eqAcc, species: [NAMES[b.mons[0]], NAMES[b.mons[1]]], attackerSide: side, readBanks, compared: cmp, mismatches: bad, byAge: Object.fromEntries(Object.entries(rows).filter(([, v]) => Object.values(v).some((m: any) => m.length))) };
    totalBad += bad; totalCmp += cmp;
    console.log(move, sc, out[`${move}-${sc}`].species.join("/"), side, "compared", cmp, "mismatch", bad, JSON.stringify(out[`${move}-${sc}`].byAge).slice(0, 400));
  }
}
console.log("TOTAL compared", totalCmp, "mismatch", totalBad);
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
