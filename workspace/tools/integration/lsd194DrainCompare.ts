// lsd194 (docs/lsd194-print-floor-and-drain.md): lsd186Compare.ts re-pointed at the lsd194 receipts, with the residuals of the final production
// (lead command, seeded / receiver bar commands, gap, print glyph) per row. Production's `animation` command rows are now present (general-animation).
// lsd186 (docs/lsd186-leech-seed-drain-timing.md): ROM rows (lsd186RomRuns.py receipt) vs production commands (lsd186Production.ts) of the Leech Seed
// turn-end drain, both scenes, both sides, on one anchor: A = the first row after the preceding "was seeded!" print (ROM: D - 10, the print's goto row).
// Production's command after the print starts at A. First glyph = the first screen change inside the waitmessage run (ROM) = a message command's row 0 (production).
//   node --experimental-strip-types --no-warnings tools/integration/lsd186Compare.ts <fixtures dir> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { lsd186Production } from "./lsd186Production.ts";
import { LEECH_SEED_DRAIN_ANIMATION_ROWS } from "../../src/engine/battleResolutionPresentation.ts";
import { battleHealthBarAnimationFrames } from "../../src/engine/healthboxAssembly.ts";

const romOf = (name: string) => JSON.parse(readFileSync(`${process.argv[2]!}/${name}`, "utf8")) as Record<string, { D: number; atk: number; runs: [string, number, number, number, number, number[], number][] }[]>;
// seed: the kernel RNG seed whose Tackle roll equals the ROM's (10 / 11 HP); fullhp = ONIX uses Tail Whip so EXEGGCUTE is undamaged when drained.
const CASES = [
  { name: "tackled-player-seeds", side: "player", seed: 57, onixMove: 33, file: "mechanic-leech-seed-player-exeggcute-opponent-onix", rom: "rom-drain-runs.json" },
  { name: "tackled-opponent-seeds", side: "opponent", seed: 4, onixMove: 33, file: "mechanic-leech-seed-opponent-exeggcute-player-onix", rom: "rom-drain-runs.json" },
  { name: "fullhp-player-seeds", side: "player", seed: 4, onixMove: 39, file: "lsd186-leech-seed-fullhp-player-exeggcute-opponent-onix.json", rom: "rom-drain-runs.json" },
] as const;
const out: any[] = [];
const roms = { "rom-drain-runs.json": romOf("rom-drain-runs.json") };
for (const scene of ["off", "on"] as const) for (const c of CASES) {
  if (c.name.startsWith("fullhp") && false) continue;
  const drain = roms[c.rom][c.file.endsWith(".json") ? `${c.file}-${scene}-r1.json` : `${c.file}-${scene}-r1.json`]![0]!;
  const E = -10; // relative to D: A = D - 10 is the first row after the print (the print's waitmessage run ends at D - 11)
  const R = (label: string) => drain.runs.find((r) => r[0].startsWith(label));
  const runsAt = (label: string) => drain.runs.filter((r) => r[0].startsWith(label));
  const hp1 = runsAt("BattleScript_LeechSeedTurnDrain+18")[0]!, hp2 = runsAt("BattleScript_LeechSeedTurnPrintAndUpdateHp+11")[0]!;
  const wait = runsAt("BattleScript_LeechSeedTurnPrintAndUpdateHp+18")[0]!;
  const animRun = scene === "on" ? runsAt("BattleScript_LeechSeedTurnDrain+7")[0]! : runsAt("BattleScript_Pausex20+0")[0]!;
  const romRows = {
    leadRowsBeforeDrain: 0 - E, // A .. D-1: the print's goto row + 9 MoveEnd rows
    drainStart: 0 - E,
    animStart: animRun[1] - E, animLen: animRun[2],
    hp1Start: hp1[1] - E, hp1Len: hp1[2], hp1Changes: hp1[6], hp1FirstChange: hp1[5][0]! - E,
    gapRowsBetweenHp: hp2[1] - (hp1[1] + hp1[2]),
    hp2Start: hp2[1] - E, hp2Len: hp2[2], hp2Changes: hp2[6], hp2FirstChange: hp2[5][0]! - E,
    printfromtable: wait[1] - 1 - E,
    waitStart: wait[1] - E, firstGlyph: wait[5][0]! - E,
  };
  const { rows } = lsd186Production({ scene, seederSide: c.side, seed: c.seed, onixMove: c.onixMove });
  const seeded = rows.findIndex((r) => r.type === "message" && /seeded/.test(JSON.stringify(r.lines)));
  const eEnd = rows[seeded]!.start + rows[seeded]!.dur; // production row A
  const rel = (n: number) => n - eEnd;
  const drainRows = rows.slice(seeded + 1);
  const ph1 = drainRows.find((r) => r.type === "hp")!;
  const ph2 = drainRows.filter((r) => r.type === "hp")[1]!;
  const pmsg = drainRows.find((r) => r.type === "message")!;
  const bar = (r: any) => battleHealthBarAnimationFrames({ maxHp: r.battler === (c.side === "player" ? 1 : 0) ? 110 : 156, from: r.from, to: r.to });
  const prodRows = {
    leadCommands: drainRows.slice(0, drainRows.indexOf(ph1)).map((r) => `${r.type}:${r.dur}`),
    animStart: rel(drainRows.find((r) => r.type === "general-animation")!.start), animLen: drainRows.find((r) => r.type === "general-animation")!.dur,
    hp1Start: rel(ph1.start), hp1Len: ph1.dur, hp1Bar: bar(ph1), hp1FirstChange: rel(ph1.start) + 1,
    hp2Start: rel(ph2.start), hp2Len: ph2.dur, hp2Bar: bar(ph2), hp2FirstChange: rel(ph2.start) + 1,
    firstGlyph: rel(pmsg.start), messageLen: pmsg.dur,
  };
  // What each candidate production change would do to the print's first glyph (command durations: hp = max(floor, bar + 1) + tail).
  const lead = romRows.hp1Start - prodRows.hp1Start; // rows to add before the first bar (production keeps its 2 sprite-visibility rows)
  const glyph = (o: { lead: number; floor: number; tail1: number; tail2: number }) =>
    prodRows.hp1Start + o.lead + Math.max(o.floor, prodRows.hp1Bar + 1) + o.tail1 + Math.max(o.floor, prodRows.hp2Bar + 1) + o.tail2;
  const variants = Object.fromEntries(([
    ["current", { lead: 0, floor: 28, tail1: 0, tail2: 0 }],
    ["tail3-on-second-hp-only", { lead: 0, floor: 28, tail1: 0, tail2: 3 }],
    ["lead-only", { lead, floor: 28, tail1: 0, tail2: 0 }],
    ["floor-removed-plus-tail3", { lead: 0, floor: 0, tail1: 0, tail2: 3 }],
    ["lead-floor-removed-tail3-only", { lead, floor: 0, tail1: 0, tail2: 3 }],
    ["lead-floor-removed-tail8-tail3", { lead, floor: 0, tail1: 8, tail2: 3 }],
  ] as const).map(([k, v]) => [k, { glyphAt: glyph(v), deltaToRom: glyph(v) - romRows.firstGlyph, hp2Start: prodRows.hp1Start + v.lead + Math.max(v.floor, prodRows.hp1Bar + 1) + v.tail1 }]));
  out.push({ case: c.name, variants, requiredLead: lead, scene, seederSide: c.side, seed: c.seed, anchor: "A = first row after the 'was seeded' print", rom: romRows, production: prodRows, delta: {
    hp1Start: prodRows.hp1Start - romRows.hp1Start, hp1FirstChange: prodRows.hp1FirstChange - romRows.hp1FirstChange, hp1Len: prodRows.hp1Len - romRows.hp1Len,
    hp2Start: prodRows.hp2Start - romRows.hp2Start, hp2FirstChange: prodRows.hp2FirstChange - romRows.hp2FirstChange, hp2Len: prodRows.hp2Len - romRows.hp2Len,
    firstGlyph: prodRows.firstGlyph - romRows.firstGlyph } });
}
// Residual rows (production - ROM), all in rows from A. The lead command (production general-animation) covers A+2 .. the seeded bar's start; a bar command
// covers its ROM run plus the script rows up to the next run's first row (seeded: the gap; receiver: printfromtable + the waitmessage row to the first glyph).
let nonzero = 0;
for (const o of out) {
  const r = o.rom, p = o.production;
  o.residual = {
    lead: p.animLen - (r.hp1Start - 2),
    seededBarStart: p.hp1Start - r.hp1Start, seededBarCommandLen: p.hp1Len - (r.hp2Start - r.hp1Start),
    gapRows: (p.hp1Len - (p.hp1Bar + 1) - 1) - (r.hp2Start - r.hp1Start - r.hp1Len),
    receiverBarStart: p.hp2Start - r.hp2Start, receiverBarCommandLen: p.hp2Len - (r.firstGlyph - r.hp2Start),
    seededFirstChange: p.hp1FirstChange - r.hp1FirstChange, receiverFirstChange: r.hp2Changes === 0 ? null : p.hp2FirstChange - r.hp2FirstChange,
    printFirstGlyph: p.firstGlyph - r.firstGlyph,
    animationRun: o.scene === "on" ? LEECH_SEED_DRAIN_ANIMATION_ROWS - r.animLen : null,
  };
  for (const v of Object.values(o.residual)) if (v !== null && v !== 0) nonzero += 1;
  console.log(o.case, o.scene, JSON.stringify(o.residual));
}
console.log("residual rows", out.length, "nonzero fields", nonzero);
writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
