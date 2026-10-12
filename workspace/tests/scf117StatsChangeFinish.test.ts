// scf117 (S10A, ISSUES #166; docs/scf117-stats-change-finish.md): General_StatsChange finished.
// Rung 1: after a presented stats-change command the following print's first glyph lands on the ROM row in BOTH scenes. ROM rows
// (rel = rows after the gAnimScriptActive rise A; the command's age 0 = rel 1) come from stat101's direct-mGBA receipts
// (tools/integration/fixtures/stat101/receipts/stat-anim.json, r1 == r2, ON == OFF): the print path's print executes on
// `script.nextRel` (77 / 91) and its glyph shows one row later (firstScreenChangeAfterE 78 on the unshadowed Harden / Growl /
// Intimidate windows); on the playstatchangeanimation path the first stat write is on `statWrites[0]` and the glyph on the write + 3
// (setstatchanger .. statbuffchange, jumpifbyte, printfromtable; firstScreenChangeAfterE 96 / 82 on Memento / Superpower).
// AllStatsUp (no jumpifbyte) shows it on the write + 2 (docs/issue69-omniboost-off-ground-truth.md: write 283, box clear 285).
// Rung 2: the source-derived x2 tracker rows (liveBattlerX2History.ts LIVE_BATTLER_X2_SOURCE_ZEROED) and their dense live receipt.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scf117AlignBattle, type Scf117AlignRow } from "../tools/integration/scf117Align.ts";
import { liveBattlerX2MoveRoleClass, LIVE_BATTLER_X2_MOVE_TABLE, LIVE_BATTLER_X2_SOURCE_ZEROED } from "../src/engine/liveBattlerX2History.ts";
import movesJson from "../src/data/gen/moves.json" with { type: "json" };
import { spriteOrderStatAnimationPlan } from "../src/engine/spriteOrderEventTransform.ts";

type Window = { arg: number; script: { nextRel: number; statWrites: [number, unknown][]; firstScreenChangeAfterE: number } };
const STAT101 = JSON.parse(readFileSync("tools/integration/fixtures/stat101/receipts/stat-anim.json", "utf8")) as
  Record<string, Record<"on" | "off", { windows: Window[] }>>;
const rom = (scenario: string, scene: "on" | "off") => STAT101[`stat101-${scenario}`]![scene].windows[0]!.script;
const label = (row: Scf117AlignRow) => (row.statsChangeLabel ?? "").split(":")[0];

// production census path (STATS_CHANGE source label, minimumFrames) -> the stat101 scenario of the same script path
const PRINT_PATHS: [string, number, string][] = [
  ["BattleScript_StatUpDoAnim", 76, "harden-ply-primeape-onix"],
  ["BattleScript_StatUpDoAnim", 90, "agility-opp-golbat-snorlax"],
  ["BattleScript_StatDownDoAnim", 76, "growl-ply-primeape-onix"],
  ["BattleScript_StatDownDoAnim", 90, "screech-opp-golbat-onix"],
  ["BattleScript_StatDown", 76, "icy-wind-ply-primeape-golbat"],
  ["BattleScript_IntimidateActivatesLoop", 76, "roar-intimidate-ply-primeape-onix"],
];
const PSCA_PATHS: [string, string][] = [
  ["BattleScript_CosmicPowerDoMoveAnim", "cosmic-power-ply-snorlax-golbat"],
  ["BattleScript_TickleDoMoveAnim", "tickle-opp-golbat-snorlax"],
  ["BattleScript_EffectMemento", "memento-ply-primeape-onix"],
];
// census battles (scf117Align.ts seeds 0..199) holding each path
const SEEDS = [0, 1, 2, 7, 10, 19, 27, 86];

describe("scf117 rung 1: the print after a stats-change command shows its first glyph on the ROM row, both scenes", () => {
  for (const scene of ["on", "off"] as const) {
    it(`Scene ${scene.toUpperCase()}: print and playstatchangeanimation paths, 0-frame residual`, () => {
      const rows = SEEDS.flatMap((seed) => scf117AlignBattle(seed, scene));
      const covered = new Set<string>();
      for (const [path, frames, scenario] of PRINT_PATHS) {
        const script = rom(scenario, scene);
        const hits = rows.filter((r) => label(r) === path && r.minimumFrames === frames && r.nextType === "message");
        expect(hits.length, `${path} ${frames}`).toBeGreaterThan(0);
        for (const r of hits) {
          expect(r.nextDelta).toBe(1);
          expect(r.firstMessage).toBe(script.nextRel + 1);
          expect(r.holdFrames).toBe(1);
        }
        covered.add(path);
      }
      expect(rom("harden-ply-primeape-onix", scene).firstScreenChangeAfterE).toBe(78);
      expect(rom("memento-ply-primeape-onix", scene).firstScreenChangeAfterE).toBe(rom("memento-ply-primeape-onix", scene).statWrites[0]![0] + 3);
      expect(rom("superpower-opp-machamp-snorlax", scene).firstScreenChangeAfterE).toBe(rom("superpower-opp-machamp-snorlax", scene).statWrites[0]![0] + 3);
      for (const [path, scenario] of PSCA_PATHS) {
        const write = rom(scenario, scene).statWrites[0]![0];
        const hits = rows.filter((r) => label(r) === path && r.nextType === "stat");
        expect(hits.length, path).toBeGreaterThan(0);
        for (const r of hits) {
          // the kernel's stat write row == the ROM's, and the glyph == write + 3
          expect(r.minimumFrames + r.nextDelta!).toBe(write);
          expect(r.firstMessage).toBe(write + 3);
        }
      }
      // AllStatsUp (Silver Wind / AncientPower class): statbuffchange -> printfromtable, glyph = write + 2 (issue69)
      const allStatsUp = rows.filter((r) => label(r) === "BattleScript_AllStatsUpAtk" && r.nextType === "stat");
      expect(allStatsUp.length).toBeGreaterThan(0);
      for (const r of allStatsUp) {
        expect(r.firstMessage).toBe(r.minimumFrames + r.nextDelta! + 2);
        expect(r.nextStart).toBe(r.minimumFrames + r.nextDelta!);
      }
      // every presented command: the first print's glyph rel == A + nextInstruction + (delta(print) - delta(STATS_CHANGE) - 1) + 1
      for (const r of rows) {
        if (r.firstMessage === null || r.firstMessageDelta === null) continue;
        expect(r.firstMessage).toBe(r.minimumFrames + 1 + r.firstMessageDelta);
      }
    }, 120000);
  }
});


describe("scf117 rung 2: source-derived x2 tracker rows (status moves ending in an absolute reset)", () => {
  it("Growl 45 / Will-O-Wisp 261 / Trick 271 zero the target; Screech 103 / Soft-Boiled 135 / Belly Drum 187 / Trick 271 the attacker", () => {
    for (const id of [45, 261, 271]) expect(liveBattlerX2MoveRoleClass(id, "target")).toBe("zeroed");
    for (const id of [103, 135, 187, 271]) expect(liveBattlerX2MoveRoleClass(id, "attacker")).toBe("zeroed");
    // every source row is an unmeasured status move (no measured row overridden, no damaging-move fallback changed)
    for (const role of ["attacker", "target"] as const) {
      for (const id of LIVE_BATTLER_X2_SOURCE_ZEROED[role]) {
        const t = LIVE_BATTLER_X2_MOVE_TABLE[role];
        expect([...t.zeroed, ...t.keep, ...t.mixed]).not.toContain(id);
        expect(movesJson.moves.find((m) => m.id === id)!.power).toBe(0);
      }
    }
    // the other roles keep their classes (Growl's attacker, Screech's measured target)
    expect(liveBattlerX2MoveRoleClass(45, "attacker")).toBe("keep");
    expect(liveBattlerX2MoveRoleClass(103, "target")).toBe("zeroed");
  });

  it("dense live bodies after a Growl: opponent ONIX (rest +1) Fury Cutter 0 px on the final tree and 70,910 px on the base", () => {
    const r = JSON.parse(readFileSync("tools/integration/fixtures/scf117/x2-live.json", "utf8")) as {
      final: Record<string, { rows: number; exactRows: number[]; residualPixels: number[] }>;
      base681da5c10: Record<string, { rows: number; exactRows: number[]; residualPixels: number[] }>;
    };
    expect(Object.keys(r.final)).toHaveLength(5);
    for (const v of Object.values(r.final)) {
      expect(v.exactRows).toEqual([v.rows, v.rows]);
      expect(v.residualPixels).toEqual([0, 0]);
    }
    expect(r.base681da5c10["scf117-fury-cutter-opp-onix-golem-growl-0"]!.residualPixels).toEqual([0, 0]);
    expect(r.base681da5c10["scf117-fury-cutter-opp-onix-golem-growl-1"]).toMatchObject({ exactRows: [19, 19], residualPixels: [70910, 70910] });
  });
});


describe("scf117 rung 3: the order host's STATS_CHANGE unit", () => {
  it("multiple +-2 (56 / 58) take class 2's plan (Memento receipt == Screech's slot rows); the other classes are unchanged", () => {
    expect(spriteOrderStatAnimationPlan(58)).toBe(spriteOrderStatAnimationPlan(47));
    expect(spriteOrderStatAnimationPlan(56)).toBe(spriteOrderStatAnimationPlan(47));
    expect(spriteOrderStatAnimationPlan(57)).toBe(spriteOrderStatAnimationPlan(22));
    expect(spriteOrderStatAnimationPlan(58)).not.toBe(spriteOrderStatAnimationPlan(22));
    for (const unplayable of [14, 29, 38, 53, 54, 59, 70]) expect(spriteOrderStatAnimationPlan(unplayable)).toBeNull();
    const slots = (scenario: string) => readFileSync(`tools/integration/fixtures/stat101/receipts/rows/stat101-${scenario}-on-0.tsv`, "utf8")
      .trim().split("\n").slice(1).map((line) => line.split("\t")).map((c) => `${c[12]}/${c[13]}`);
    expect(slots("memento-ply-primeape-onix")).toEqual(slots("screech-opp-golbat-onix"));
  });
});
