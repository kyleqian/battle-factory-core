// BG-register history experiment (NO src change; uses the unmodified silverWind reducer through the same sceneOnPresentation path as prep16SilverWindFirstBody.ts):
// Silver Wind OPPONENT body AFTER the player's Splash (prep16-hist-silverwind-opp-after-splash, dense capture + RGB), 196 frames.  Three renders of every age vs the ROM RGB:
//  rom      = inputs derived from this capture (silverWindConfigFor)
//  rule     = background.registers / monbg.splitBg1Cnt rebuilt ONLY from the S0 constants + the history rule (Splash by the other side: win0h = win0v = 0; splitBg1Cnt = (bg1cnt & ~3) | 1)
//  firstGate= the first-body S0 registers (win0h 240, win0v 161), i.e. what the merged gate would feed if it ignored the Splash
// usage: npx vite-node tools/integration/bgHistoryLaterBodyExperiment.ts <capture out.json> <rgb dir> [out.json] [rule-delta JSON, e.g. '{"win0h":0,"win0v":0,"bg1cnt":23554}']
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { silverWindConfigFor } from "../compare/verifySilverWindReducer.ts";
type Json = Record<string, any>;
const [corpusPath, rgbDir, outPath] = process.argv.slice(2);
const rows = (JSON.parse(readFileSync(corpusPath!, "utf8")) as Json).frames as Json[];
const S0 = { dispcnt: 48960, bg0cnt: 38912, bg1cnt: 39936, bg2cnt: 24064, bg3cnt: 23051, bg0hofs: 0, bg0vofs: 0, bg1hofs: 0, bg1vofs: 0, bg2hofs: 0, bg2vofs: 0, bg3hofs: 0, bg3vofs: 0, win0h: 240, win0v: 161, winin: 16191, winout: 16191, mosaic: 0, bldcnt: 0, bldalpha: 0, bldy: 0 };
const rom = silverWindConfigFor("opponent-front", rows) as Json;
const withRegs = (regs: Json) => { const c = JSON.parse(JSON.stringify(rom)); const bg = c.animationInputs?.background; if (!bg) throw new Error("no background in config: " + Object.keys(c)); bg.registers = { ...bg.registers, ...regs }; bg.monbg.splitBg1Cnt = (regs.bg1cnt & ~3) | 1; return c; };
const ruleRegs = { ...S0, ...(JSON.parse(process.argv[5] ?? "{}") as Json) }; // default: Splash by the other side = win0h/win0v 0
if (process.argv[5] === undefined) Object.assign(ruleRegs, { win0h: 0, win0v: 0 });
const cfgs: Record<string, Json> = { rom, rule: withRegs(ruleRegs), firstGate: withRegs(S0) };
const diffRomVsRule = Object.fromEntries(Object.keys(ruleRegs).filter((k) => rom.animationInputs.background.registers[k] !== (ruleRegs as Json)[k]).map((k) => [k, [rom.animationInputs.background.registers[k], (ruleRegs as Json)[k]]]));
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const res: Json = { rows: rows.length, registerFieldsRomDiffersFromRule: diffRomVsRule, splitBg1CntRom: rom.animationInputs.background.monbg.splitBg1Cnt, splitBg1CntRule: (ruleRegs.bg1cnt & ~3) | 1 };
for (const k of Object.keys(cfgs)) res[k] = { exact: 0, residualPixels: 0, bad: [] as string[] };
for (const [age, row] of rows.entries()) {
  const raw = readFileSync(`${rgbDir}/${String(row.frame).padStart(5, "0")}.rgb`); if (sha(raw) !== row.sha256) throw new Error("rgb drift");
  for (const [name, cfg] of Object.entries(cfgs)) {
    const fb = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(cfg as never), age } });
    let n = 0; for (let p = 0; p < 240 * 160; p += 1) if (fb[p * 4] !== raw[p * 3] || fb[p * 4 + 1] !== raw[p * 3 + 1] || fb[p * 4 + 2] !== raw[p * 3 + 2]) n += 1;
    res[name].residualPixels += n; if (n === 0) res[name].exact += 1; else if (res[name].bad.length < 6) res[name].bad.push(`${age}:${n}`);
  }
}
console.log(JSON.stringify(res, null, 1));
if (outPath) writeFileSync(outPath, JSON.stringify(res, null, 1));
