/**
 * prep35: MOVE_FLATTER (260) OAM / matrix provider check (docs/next-adapters-prep35.md s2). Every row of every window: the prototype's
 * 128-entry hardware OAM (SortSprites order incl. the 38 equal-key confetti), 32 hardware matrices, the carried 64-slot sSpriteOrder on the
 * rows that end with a build, the reducer-fed sprite states the OAM is built from (spotlight x / y / matrix / visibility, target y2 dip,
 * confetti x / y / x2 / y2 / tile), prep32 registers + palettes (production composite), then (--pixels) the UNCHANGED renderer (battleScene.ts
 * FLATTER branch) fed only with prototype inputs vs raw ROM RGB. Negative controls: --neg=sort|burst|seed|dip.
 * usage: npx vite-node tools/integration/prep35FlatterCheck.ts <dense.json[.gz]>:<attackerSide>:<rgbDir|rgb.tar.gz> ... [--pixels] [--neg=..] [--scratch=dir] --out=<receipt.json>
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import flatterAsset from "../../src/animation/assets/flatter.json" with { type: "json" };
import { flatterAtAge } from "../../src/animation/flatter.ts";
import { createSceneOnMovePresentation, type SceneOnFlatterConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { composeLivePalettes } from "../../src/engine/liveMovePaletteComposite.ts";
import { speciesName } from "./prep30Species.ts";
import { flatterPalettes, flatterRegisters } from "./prep32FlatterModel.ts";
import { FL35, flatterBuildState, flatterOamRows35, type Side } from "./prep35FlatterModel.ts";

type Json = Record<string, any>;
const args = process.argv.slice(2), opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const neg = opt("neg"), pixels = args.includes("--pixels"), out = opt("out"), scratch = opt("scratch") ?? "/tmp/prep35-scratch";
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const words = (rgb: Json[]): number[] => rgb.map((c) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10);
const SPOTLIGHT = words((flatterAsset as Json).spotlight.palette), CONFETTI = words((flatterAsset as Json).confetti.palette);
/** The first-body BG register state S0 (liveOamMoves.ts S0_REGISTERS). */
const S0 = { dispcnt: 0xbf40, bg0cnt: 0x9800, bg1cnt: 0x9c00, bg2cnt: 0x5e00, bg3cnt: 0x5a0b, bg0hofs: 0, bg0vofs: 0, bg1hofs: 0, bg1vofs: 0, bg2hofs: 0, bg2vofs: 0,
  bg3hofs: 0, bg3vofs: 0, win0h: 240, win0v: 161, winin: 0x3f3f, winout: 0x3f3f, mosaic: 0, bldcnt: 0, bldalpha: 0, bldy: 0 };
const BANKS = [2, 3, 4, 16, 17, 16 + FL35.spotlightPaletteSlot, 16 + FL35.confettiPaletteSlot], banks = (p: readonly number[]) => BANKS.map((k) => p.slice(k * 16, k * 16 + 16));
const compress = (rows: number[]) => { const o: string[] = []; for (let i = 0; i < rows.length;) { let j = i; while (j + 1 < rows.length && rows[j + 1] === rows[j]! + 1) j += 1; o.push(i === j ? `${rows[i]}` : `${rows[i]}-${rows[j]}`); i = j + 1; } return o; };
const DEFAULT = ["tools/compare/evidence/flatter-player-dense-state.json.gz:player:tools/compare/evidence/flatter-player-raw-rgb.tar.gz",
  "tools/compare/evidence/flatter-opponent-dense-state.json.gz:opponent:tools/compare/evidence/flatter-opponent-raw-rgb.tar.gz"];
const windows = args.filter((a) => !a.startsWith("--"));
const report: Json = { schema: "prep35-flatter-check/v1", neg: neg ?? null, pixels, windows: [] };

for (const spec of windows.length ? windows : DEFAULT) {
  const [path, side, rgb] = spec.split(":") as [string, Side, string | undefined];
  const buf = readFileSync(path), fr: Json[] = JSON.parse((path.endsWith(".gz") ? gunzipSync(buf) : buf).toString()).frames;
  const r0 = fr[0]!, ts: Side = side === "player" ? "opponent" : "player";
  const aSp = r0.battlers[side].species as number, tSp = r0.battlers[ts].species as number, an = speciesName(aSp), tn = speciesName(tSp);
  const m = flatterOamRows35({ attackerSide: side, attackerSpecies: aSp, targetSpecies: tSp, activationOrder: r0.spriteOrder, activationRng: r0.animationRng,
    noCarry: neg === "sort", noBurstLatch: neg === "burst", seedXor: neg === "seed" ? 1 : 0, dipShift: neg === "dip" ? 1 : 0 });
  const composite = composeLivePalettes(side === "player" ? an : tn, side === "player" ? tn : an)!;
  const loads = [{ row: 1, bank: FL35.spotlightPaletteSlot, words: SPOTLIGHT }, { row: 4, bank: FL35.confettiPaletteSlot, words: CONFETTI }];
  const fields = ["hwOam", "hwOamRows1toEnd", "hwMatrices", "spriteOrderBuildRows", "spotlight", "targetY2", "confetti", "registersFromS0", "paletteRenderedBanks", "knownAllocator"] as const;
  const ok: Record<string, number> = Object.fromEntries(fields.map((f) => [f, 0])), bad: Record<string, number[]> = Object.fromEntries(fields.map((f) => [f, []]));
  for (const [age, row] of fr.entries()) {
    const mark = (f: (typeof fields)[number], good: boolean) => { if (good) ok[f] += 1; else bad[f]!.push(age); };
    mark("hwOam", same(m.oam[age], row.hardwareOam));
    mark("hwOamRows1toEnd", age === 0 || same(m.oam[age], row.hardwareOam));
    mark("hwMatrices", same(m.matrices[age], row.hardwareMatrices));
    // the snapshot order after the build of state `age` (rows inside the burst, 65..67, end without a build: not compared)
    const nb = age + 1 < FL35.rows && flatterBuildState(age + 1, neg === "burst") === age;
    mark("spriteOrderBuildRows", !nb || same(m.orders[age + 1], row.spriteOrder));
    const st = flatterAtAge(age, m.inputs);
    const romSpot = row.sprites.find((s: Json) => s.template?.symbol === "gFlatterSpotlightSpriteTemplate");
    mark("spotlight", same(st.spotlight ? [st.spotlight.slot, st.spotlight.x, st.spotlight.y, st.spotlight.matrix] : null,
      romSpot ? [romSpot.slot, romSpot.x, romSpot.y, row.softwareMatrices[romSpot.matrixNum]] : null));
    mark("targetY2", st.battlers.target.offset.y2 === row.battlerSprites.target.y2);
    // confetti from row 67 (rows 65 / 66 are mid-burst snapshots: the display-neutral birth split, prep32 s2.2)
    const romConf = row.sprites.filter((s: Json) => s.template?.symbol === "gFlatterConfettiSpriteTemplate").map((s: Json) => [s.slot, s.x, s.y, s.x2, s.y2, s.attr[2] & 0x3ff]).sort((x: any, y: any) => x[0] - y[0]);
    const myConf = st.confetti.map((c) => [c.slot, c.x, c.y, c.x2, c.y2, FL35.tileRanges[7]![0] + m.tileOffsets[(m.inputs.confetti as Json[]).findIndex((k) => k.slot === c.slot)]!]).sort((x: any, y: any) => x[0] - y[0]);
    mark("confetti", age < 67 || same(myConf, romConf));
    mark("registersFromS0", same(flatterRegisters(age, S0), row.registers));
    const p = flatterPalettes(age, composite, loads);
    mark("paletteRenderedBanks", same(banks(p.unfaded), banks(row.unfadedPalette)) && same(banks(p.faded), banks(row.fadedPalette)) && same(banks(p.hardware), banks(row.hardwarePalette)));
    mark("knownAllocator", age < 4 || age >= 218 || (same(row.resourceAllocators.tileRanges[FL35.spotlightTileSlot], FL35.tileRanges[6]) && same(row.resourceAllocators.tileRanges[FL35.confettiTileSlot], FL35.tileRanges[7])
      && row.paletteTags[FL35.spotlightPaletteSlot] === 10227 && row.paletteTags[FL35.confettiPaletteSlot] === 10240));
  }
  const w: Json = { window: basename(path).replace(/(-r1)?(-dense-state)?\.json(\.gz)?$/, ""), attackerSide: side, species: [an, tn], rows: fr.length,
    confettiSlots: (m.inputs.confetti as Json[]).map((c) => c.slot).join(","), fields: Object.fromEntries(fields.map((f) => [f, `${ok[f]}/${fr.length}`])),
    mismatchRows: Object.fromEntries(fields.filter((f) => bad[f]!.length).map((f) => [f, compress(bad[f]!).slice(0, 12)])) };
  if (pixels && rgb) {
    let rgbDir = rgb;
    if (rgb.endsWith(".tar.gz")) { rgbDir = resolve(scratch, basename(rgb, ".tar.gz")); if (!existsSync(rgbDir)) { mkdirSync(rgbDir, { recursive: true }); execFileSync("tar", ["-xzf", rgb, "-C", rgbDir]); } }
    const fieldProfile = { playerHp: r0.parties.player[0].hp, playerMaxHp: r0.parties.player[0].maxHp, opponentHp: r0.parties.opponent[0].hp, opponentMaxHp: r0.parties.opponent[0].maxHp,
      playerGender: r0.parties.player[0].gender, opponentGender: r0.parties.opponent[0].gender };
    // as verifyFlatterReducer.ts flatterConfigFor: the view rebuilds attackerCenter / targetCenter from geometry.animationCenter
    const geometry = (s: Side, c: Readonly<{ x: number; y: number }>) => ({ side: s, spriteCorner: { x: c.x - 32, y: c.y - 32 }, animationCenter: c, battlePositionCenter: c });
    let rows = 0, exact = 0, total = 0; const fails: string[] = [];
    for (const [age, row] of fr.entries()) {
      const { attackerSide: _a, targetSide: _t, attackerSpecies: _as, targetSpecies: _ts, attackerCenter: _ac, targetCenter: _tc, ...rest } = m.inputs;
      const pal = flatterPalettes(age, composite, loads);
      const config = { move: "FLATTER", attacker: { species: an, geometry: geometry(side, m.inputs.attackerCenter) }, target: { species: tn, geometry: geometry(ts, m.inputs.targetCenter) }, fieldProfile,
        animationInputs: { ...rest, spriteOrder: m.orders[age]!,
          buffers: { softwareOam: m.oam[age]!, hardwareOam: m.oam[age]!, softwareMatrices: m.matrices[age]!, hardwareMatrices: m.matrices[age]! },
          palette: pal, registers: flatterRegisters(age, S0) } } as unknown as SceneOnFlatterConfig;
      const stage = createSceneOnMovePresentation(config);
      const raw = readFileSync(resolve(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
      const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } } as never);
      let d = 0; for (let q = 0; q < 240 * 160; q += 1) if (app[q * 4] !== raw[q * 3] || app[q * 4 + 1] !== raw[q * 3 + 1] || app[q * 4 + 2] !== raw[q * 3 + 2]) d += 1;
      rows += 1; total += d; if (d === 0) exact += 1; else fails.push(`${age}:${d}`);
    }
    w.pixels = { rows, exact, residualPixels: total, failures: fails.slice(0, 24) };
  }
  report.windows.push(w);
  console.error(`${w.window} ${side}: ${JSON.stringify(w.fields)}${w.pixels ? ` px ${w.pixels.exact}/${w.pixels.rows} (${w.pixels.residualPixels}) ${w.pixels.failures.slice(0, 6).join(",")}` : ""}`);
}
if (out) writeFileSync(out, JSON.stringify(report, null, 1) + "\n");
