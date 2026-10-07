/**
 * prep35: MOVE_SKILL_SWAP (285) display-provider check (docs/next-adapters-prep35.md s1). Every row of every window: the prototype's
 * 128-entry hardware OAM (SortSprites order), 32 hardware + software matrices, 64-slot sSpriteOrder, unfaded / faded / hardware palettes
 * (renderer banks 2/3/4/16/17/23 from the production composite; all 512 entries from the lent activation palette), bldcnt / bldy (prep33
 * rule), then (--pixels) the UNCHANGED renderer (battleScene.ts SKILL_SWAP branch) fed only with prototype inputs vs raw ROM RGB, at the
 * measured CPU phase and the flipped one. Negative controls: --neg=anim|sort|anchor|palette|blend.
 * usage: npx vite-node tools/integration/prep35SkillSwapCheck.ts <dense.json[.gz]>:<attackerSide>:<rgbDir|rgb.tar.gz> ... [--pixels] [--neg=..] [--scratch=dir] --out=<receipt.json>
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, type SceneOnSkillSwapConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { composeLivePalettes } from "../../src/engine/liveMovePaletteComposite.ts";
import { speciesName } from "./prep30Species.ts";
import { ORB_PALETTE35, SS35, battlerAttr35, skillSwapBounds35, skillSwapDisplayRows35, skillSwapPalettes35, type Side } from "./prep35SkillSwapModel.ts";

type Json = Record<string, any>;
const args = process.argv.slice(2), opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const neg = opt("neg"), pixels = args.includes("--pixels"), out = opt("out"), scratch = opt("scratch") ?? "/tmp/prep35-scratch";
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const BANKS = [2, 3, 4, 16, 17, 23], banks = (p: readonly number[]) => BANKS.map((k) => p.slice(k * 16, k * 16 + 16));
/** = prep33 skillSwapBlend33 (Task_FadeToBg C1 = 4, C2 = 156, the restore fade counted in executed frames). */
function blend35(r: number, lag: boolean): { bldcnt: number; bldy: number } {
  const fadeY = (e: number, c: number) => (e < c + 1 || e >= c + 37 ? { bldcnt: 0, bldy: 0 } : { bldcnt: 0xe8, bldy: e <= c + 1 ? 0 : e <= c + 17 ? e - c - 1 : e <= c + 20 ? 16 : 16 - (e - (c + 20)) });
  const e = (row: number) => row - (lag && row >= 176 ? 1 : 0);
  return r < 156 ? fadeY(r, 4) : fadeY(e(r - 1) + 1, 156);
}
const S0 = { dispcnt: 0xbf40, bg0cnt: 0x9800, bg1cnt: 0x9c00, bg2cnt: 0x5e00, bg3cnt: 0x5a0b, bg0hofs: 0, bg0vofs: 0, bg1hofs: 0, bg1vofs: 0, bg2hofs: 0, bg2vofs: 0,
  bg3hofs: 0, bg3vofs: 0, win0h: 240, win0v: 161, winin: 0x3f3f, winout: 0x3f3f, mosaic: 0, bldcnt: 0, bldalpha: 0, bldy: 0 };
const compress = (rows: number[]) => { const o: string[] = []; for (let i = 0; i < rows.length;) { let j = i; while (j + 1 < rows.length && rows[j + 1] === rows[j]! + 1) j += 1; o.push(i === j ? `${rows[i]}` : `${rows[i]}-${rows[j]}`); i = j + 1; } return o; };
const DEFAULT = ["tools/compare/evidence/skill-swap-player-dense-state.json.gz:player:tools/compare/evidence/skill-swap-player-raw-rgb.tar.gz",
  "tools/compare/evidence/skill-swap-opponent-dense-state.json.gz:opponent:tools/compare/evidence/skill-swap-opponent-raw-rgb.tar.gz"];
const windows = args.filter((a) => !a.startsWith("--"));
const report: Json = { schema: "prep35-skill-swap-check/v1", neg: neg ?? null, pixels, windows: [] };

for (const spec of windows.length ? windows : DEFAULT) {
  const [path, side, rgb] = spec.split(":") as [string, Side, string | undefined];
  const buf = readFileSync(path), fr: Json[] = JSON.parse((path.endsWith(".gz") ? gunzipSync(buf) : buf).toString()).frames;
  const r0 = fr[0]!, ts: Side = side === "player" ? "opponent" : "player";
  const aSp = r0.battlers[side].species as number, tSp = r0.battlers[ts].species as number, an = speciesName(aSp), tn = speciesName(tSp);
  // T observables (measured, not modelled): the gRng2 stall row (176) and the bank-2 restore row (175 / 176)
  const lag = fr.some((f, i) => i > 0 && f.animationRng === fr[i - 1]!.animationRng);
  const restoreRow = fr.findIndex((f, i) => i > 156 && same(f.fadedPalette.slice(32, 48), r0.unfadedPalette.slice(32, 48)));
  const phase = (lagBit: boolean) => {
    const firstInactiveAge = lagBit ? 195 : 194;
    const display = skillSwapDisplayRows35({ attackerSide: side, attackerSpecies: aSp, targetSpecies: tSp, activationOrder: r0.spriteOrder, firstInactiveAge,
      animOf: neg === "anim" ? (o) => (o + 1) & 3 : undefined, anchorDx: neg === "anchor" ? 1 : 0, noCarry: neg === "sort" });
    const composite = composeLivePalettes(side === "player" ? an : tn, side === "player" ? tn : an)!;
    const orbPalette = neg === "palette" ? ORB_PALETTE35.map((w, i) => (i === 3 ? w ^ 0x0421 : w)) : undefined;
    const palArgs = { attackerSide: side, rows: firstInactiveAge + 1, orbPalette, blendDx: neg === "blend" ? 1 : 0 };
    return { firstInactiveAge, display, palettes: skillSwapPalettes35({ ...palArgs, palette0: composite }),
      lentPalettes: skillSwapPalettes35({ ...palArgs, palette0: { unfaded: r0.unfadedPalette, faded: r0.fadedPalette, hardware: r0.hardwarePalette } }) };
  };
  const measured = phase(lag);
  const fields = ["hwOam", "hwOamRows1toEnd", "hwMatrices", "swMatrices", "spriteOrder", "paletteRenderedBanks", "paletteAllLent", "bldRegisters"] as const;
  const ok: Record<string, number> = Object.fromEntries(fields.map((f) => [f, 0])), bad: Record<string, number[]> = Object.fromEntries(fields.map((f) => [f, []]));
  for (const [age, row] of fr.entries()) {
    const mark = (f: (typeof fields)[number], good: boolean) => { if (good) ok[f] += 1; else bad[f]!.push(age); };
    const m = Math.min(age, measured.firstInactiveAge);
    mark("hwOam", same(measured.display.oam[m], row.hardwareOam));
    mark("hwOamRows1toEnd", age === 0 || same(measured.display.oam[m], row.hardwareOam));
    mark("hwMatrices", same(measured.display.matrices[m], row.hardwareMatrices));
    mark("swMatrices", same(measured.display.softwareMatrices[m], row.softwareMatrices));
    mark("spriteOrder", same(measured.display.orders[m], row.spriteOrder));
    const p = measured.palettes[m]!, l = measured.lentPalettes[m]!;
    mark("paletteRenderedBanks", same(banks(p.unfaded), banks(row.unfadedPalette)) && same(banks(p.faded), banks(row.fadedPalette)) && same(banks(p.hardware), banks(row.hardwarePalette)));
    mark("paletteAllLent", same(l.unfaded, row.unfadedPalette) && same(l.faded, row.fadedPalette) && same(l.hardware, row.hardwarePalette));
    const b = blend35(age, lag); mark("bldRegisters", row.registers.bldcnt === b.bldcnt && row.registers.bldy === b.bldy);
  }
  const w: Json = { window: basename(path).replace(/(-r1)?(-dense-state)?\.json(\.gz)?$/, ""), attackerSide: side, species: [an, tn], rows: fr.length,
    T: { lagRow176: lag, restoreRow }, fields: Object.fromEntries(fields.map((f) => [f, `${ok[f]}/${fr.length}`])),
    mismatchRows: Object.fromEntries(fields.filter((f) => bad[f]!.length).map((f) => [f, compress(bad[f]!).slice(0, 12)])) };

  if (pixels && rgb) {
    let rgbDir = rgb;
    if (rgb.endsWith(".tar.gz")) { rgbDir = resolve(scratch, basename(rgb, ".tar.gz")); if (!existsSync(rgbDir)) { mkdirSync(rgbDir, { recursive: true }); execFileSync("tar", ["-xzf", rgb, "-C", rgbDir]); } }
    const fieldProfile = { playerHp: r0.parties.player[0].hp, playerMaxHp: r0.parties.player[0].maxHp, opponentHp: r0.parties.opponent[0].hp, opponentMaxHp: r0.parties.opponent[0].maxHp,
      playerGender: r0.parties.player[0].gender, opponentGender: r0.parties.opponent[0].gender };
    const battler = (sp: number, s: Side, species: string) => { const attr = battlerAttr35(sp, s), x = (attr[1] & 0x1ff) + 32, y = (attr[0] & 0xff) + 32;
      return { species, geometry: { side: s, spriteCorner: { x: x - 32, y: y - 32 }, animationCenter: { x, y }, battlePositionCenter: { x: s === "player" ? 72 : 176, y: s === "player" ? 80 : 40 } } }; };
    const pixelRun = (ph: ReturnType<typeof phase>, lagBit: boolean) => {
      let rows = 0, exact = 0, total = 0; const fails: string[] = [];
      const aSprite = { slot: side === "player" ? 6 : 8, x: 0, y: 0, x2: 0, y2: 0, attr: battlerAttr35(aSp, side), subpriority: side === "player" ? 30 : 40, matrixNum: 0, matrix: [256, 0, 0, 256] as const };
      const tSprite = { slot: ts === "player" ? 6 : 8, x: 0, y: 0, x2: 0, y2: 0, attr: battlerAttr35(tSp, ts), subpriority: ts === "player" ? 30 : 40, matrixNum: 0, matrix: [256, 0, 0, 256] as const };
      for (const [age, row] of fr.entries()) {
        const m = Math.min(age, ph.firstInactiveAge), p = ph.palettes[m]!;
        const orbOam = SS35.orbPairs.map(([slot]) => ({ slot, attr: [0, 0, SS35.orbAttr2] as const, subpriority: SS35.orbSubpriority }));
        const config: SceneOnSkillSwapConfig = { move: "SKILL_SWAP", attacker: battler(aSp, side, an) as never, target: battler(tSp, ts, tn) as never, fieldProfile,
          animationInputs: { attackerBounds: skillSwapBounds35(aSp, side), targetBounds: skillSwapBounds35(tSp, ts), attackerSprite: aSprite, targetSprite: tSprite,
            taskSlots: SS35.taskSlots, orbAllocations: [...ph.display.lives].sort((l, r) => l.order - r.order).map((l) => ({ slot: l.slot, matrixNum: l.matrixNum, sourceCreationOrder: l.order })),
            orbOam, spriteOrder: ph.display.orders[m]!, softwareOam: ph.display.oam[m]!, hardwareOam: ph.display.oam[m]!,
            softwareMatrices: ph.display.softwareMatrices[m]!, hardwareMatrices: ph.display.matrices[m]!,
            palette: { unfaded: p.unfaded, faded: p.faded, hardware: p.hardware }, registers: { ...S0, ...blend35(age, lagBit) },
            background: { currentVram: null, battleVram: null, psychicVram: null },
            resources: { tag: 10251, tileSlot: 6, paletteAllocatorSlot: 7, paletteBank: SS35.orbBank, tileRange: [SS35.orbTile, 4], allocator: null },
            sharedTaskData: { fadeToPsychic: [], loopReversal: [], restoreFade: [] }, targetBlendPaletteStart: (ts === "player" ? 16 : 17) * 16 + 1, attackerBlendPaletteStart: (side === "player" ? 16 : 17) * 16 + 1,
            audio: { current: null, attackerPan: side === "player" ? -64 : 63 }, liveCounts: { visualTasks: 0, soundTasks: 0 }, animationRng: 0,
            firstInactiveAge: ph.firstInactiveAge, abilityOutcome: { playerAbilityAfterSwap: -1, opponentAbilityAfterSwap: -1 }, gameplayRng: null, gameplayState: null } };
        const stage = createSceneOnMovePresentation(config);
        const raw = readFileSync(resolve(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
        const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } } as never);
        let d = 0; for (let q = 0; q < 240 * 160; q += 1) if (app[q * 4] !== raw[q * 3] || app[q * 4 + 1] !== raw[q * 3 + 1] || app[q * 4 + 2] !== raw[q * 3 + 2]) d += 1;
        rows += 1; total += d; if (d === 0) exact += 1; else fails.push(`${age}:${d}`);
      }
      return { firstInactiveAge: ph.firstInactiveAge, rows, exact, residualPixels: total, failures: fails.slice(0, 24) };
    };
    w.pixels = { measured: pixelRun(measured, lag), ...(neg ? {} : { flipped: pixelRun(phase(!lag), !lag) }) };
  }
  report.windows.push(w);
  console.error(`${w.window} ${side}: ${JSON.stringify(w.fields)}${w.pixels ? ` px measured ${w.pixels.measured.exact}/${w.pixels.measured.rows} (${w.pixels.measured.residualPixels})${w.pixels.flipped ? ` flipped ${w.pixels.flipped.exact}/${w.pixels.flipped.rows} (${w.pixels.flipped.residualPixels})` : ""}` : ""}`);
}
if (out) writeFileSync(out, JSON.stringify(report, null, 1) + "\n");
