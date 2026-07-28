import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/focus-punch-off-evidence.json" with { type: "json" };

type Stats = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  spAttack: number;
  spDefense: number;
};

type PartyMon = {
  species: number;
  level: number;
  nature: number;
  ivs: Stats;
  evs: Stats;
  moves: number[];
  ppUps: number[];
  item: number;
  abilitySlot: number;
  friendship: number;
  gender: string;
  shiny: boolean;
};

type Scenario = {
  schemaVersion: number;
  mode: string;
  profile: string;
  seed: number;
  overrides: { parties: { player: PartyMon[]; opponent: PartyMon[] }; battlers?: unknown };
  trace: { segments: Array<{ frames: number; buttons: string[] }>; captureFrames: number[] };
};

type Capture = {
  frame: number;
  sha256: string;
  rngValue: number;
  battleOutcome: number;
  currentMove: number;
  opponentLightScreenTurns?: number;
  visibleText?: string;
  player: { species: number; speed: number; hp: number; maxHp: number; pp: number[] };
  opponent: { species: number; speed: number; hp: number; maxHp: number; pp: number[] };
};

const evidence = evidenceData;
const COMPLETE_MON_KEYS = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const TRANSIENT_KEYS =
  /"(?:battleOutcome|sideConditions|statStages|status1|status2|status3|weather|weatherTurns)"/;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function advanceRng(seed: number, calls: number): number {
  let value = seed >>> 0;
  for (let i = 0; i < calls; i++)
    value = (Math.imul(value, 1103515245) + 24691) >>> 0;
  return value;
}

describe("Battle Scene OFF Focus Punch / jumpifnodamage evidence", () => {
  it("uses two complete-party mechanicLab routes with ordinary controller input", () => {
    expect(evidence.schema).toBe("focus-punch-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");

    for (const evidenceCase of evidence.cases) {
      const scenario = readScenario(evidenceCase.scenario);
      expect(sha256(evidenceCase.scenario)).toBe(evidenceCase.scenarioSha256);
      expect(scenario).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-off",
        seed: 1,
      });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(scenario.overrides.battlers).toBeUndefined();
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(evidenceCase.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
      expect(JSON.stringify(scenario)).not.toMatch(TRANSIENT_KEYS);

      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
        expect(mon.level).toBe(50);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toEqual([0, 0, 0, 0]);
        expect(Object.values(mon.evs).reduce((sum, value) => sum + value, 0))
          .toBeLessThanOrEqual(510);
        expect(mon).not.toHaveProperty("hp");
      }

      expect(scenario.overrides.parties.player[0]!.moves).toEqual([202, 73, 264, 147]);
      expect(scenario.trace.segments.some(({ buttons }) => buttons.includes("DOWN"))).toBe(true);
      expect((evidenceCase.captures as Capture[]).every(({ frame }) =>
        scenario.trace.captureFrames.includes(frame))).toBe(true);
    }

    const damaged = readScenario(evidence.cases[0]!.scenario);
    const undamaged = readScenario(evidence.cases[1]!.scenario);
    expect(damaged.overrides.parties.opponent[0]!.moves).toEqual([129, 129, 129, 129]);
    expect(undamaged.overrides.parties.opponent[0]!.moves).toEqual([113, 113, 113, 113]);
  });

  it("pins the exact five-byte instruction, attacker-owned fields, polarity, and PC behavior", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 207,
      opcodeHex: "0xcf",
      length: 5,
      operandWidths: [4],
      reads: [
        "gProtectStructs[gBattlerAttacker].physicalDmg",
        "gProtectStructs[gBattlerAttacker].specialDmg",
      ],
      pc: {
        eitherReceiptNonzero: "advance by 5 bytes",
        bothReceiptsZero: "load the pointer encoded at instruction bytes 1..4",
      },
    });
    expect(evidence.instruction.layout.map(({ offset, width }) => [offset, width]))
      .toEqual([[0, 1], [1, 4]]);
    expect(evidence.branchContract.polarity)
      .toBe("jump exactly when both attacker damage receipts are zero; fall through when either receipt is nonzero");
    expect(evidence.branchContract.receiptOwner).toContain("gBattlerAttacker");

    const macro = readFileSync("reference/pokeemerald/asm/macros/battle_script.inc", "utf8");
    expect(macro).toMatch(
      /\.macro jumpifnodamage ptr:req[\s\S]*?\.byte B_SCR_OP_JUMPIFNODAMAGE[\s\S]*?\.4byte \\ptr/,
    );
    const commands = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    expect(commands).toContain(
      "if (gProtectStructs[gBattlerAttacker].physicalDmg || gProtectStructs[gBattlerAttacker].specialDmg)",
    );
    expect(commands).toContain("gBattlescriptCurrInstr += 5;");
    expect(commands).toContain(
      "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);",
    );
  });

  it("pins Focus Punch's priority, real Frontier carrier, and the two script continuations", () => {
    expect(evidence.branchContract.move).toEqual({
      id: 264,
      power: 150,
      accuracy: 100,
      pp: 20,
      priority: -3,
    });
    expect(evidence.branchContract.frontierCarrier).toEqual({
      setId: 480,
      species: 307,
      moves: [202, 73, 264, 147],
      name: "FRONTIER_MON_BRELOOM_2",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    expect(scripts).toMatch(
      /BattleScript_EffectFocusPunch::[\s\S]*?attackcanceler[\s\S]*?jumpifnodamage BattleScript_HitFromAccCheck[\s\S]*?ppreduce[\s\S]*?printstring STRINGID_PKMNLOSTFOCUS[\s\S]*?goto BattleScript_MoveEnd/,
    );
    const moves = readFileSync("reference/pokeemerald/src/data/battle_moves.h", "utf8");
    expect(moves).toMatch(
      /\[MOVE_FOCUS_PUNCH\][\s\S]*?\.effect = EFFECT_FOCUS_PUNCH,[\s\S]*?\.power = 150,[\s\S]*?\.pp = 20,[\s\S]*?\.priority = -3/,
    );
    const frontierMons = readFileSync(
      "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "utf8",
    );
    expect(frontierMons).toMatch(
      /\[FRONTIER_MON_BRELOOM_2\][\s\S]*?MOVE_GIGA_DRAIN, MOVE_LEECH_SEED, MOVE_FOCUS_PUNCH, MOVE_SPORE/,
    );
  });

  it("proves the physical-damage fallthrough and zero-damage jump with HP, PP, action, outcome, and RNG ledgers", () => {
    const [damagedInitial, swift, lostFocusStart, lostFocusText, damagedNext] =
      evidence.cases[0]!.captures as Capture[];
    expect(swift!.opponent.speed).toBeGreaterThan(swift!.player.speed);
    expect(swift).toMatchObject({ currentMove: 129, battleOutcome: 0 });
    expect(lostFocusStart).toMatchObject({
      currentMove: 264,
      battleOutcome: 0,
      player: { hp: 111, maxHp: 135, pp: [5, 10, 19, 15] },
      opponent: { hp: 135, maxHp: 135 },
    });
    expect(lostFocusText!.visibleText).toBe("BRELOOM lost its focus and couldn't move!");
    expect(damagedNext).toMatchObject({
      currentMove: 0,
      battleOutcome: 0,
      player: { hp: 111, pp: [5, 10, 19, 15] },
      opponent: { hp: 135 },
    });
    expect([
      damagedInitial!.rngValue,
      swift!.rngValue,
      lostFocusStart!.rngValue,
      lostFocusText!.rngValue,
      damagedNext!.rngValue,
    ]).toEqual([0, 2, 3, 3, 9].map((calls) => advanceRng(919694434, calls)));

    const [zeroInitial, lightScreen, hitStart, damagedOpponent, zeroNext] =
      evidence.cases[1]!.captures as Capture[];
    expect(lightScreen!.opponent.speed).toBeGreaterThan(lightScreen!.player.speed);
    expect(lightScreen).toMatchObject({
      currentMove: 113,
      battleOutcome: 0,
      opponentLightScreenTurns: 5,
      player: { hp: 135, maxHp: 135, pp: [5, 10, 20, 15] },
      opponent: { hp: 135, pp: [30, 29, 30, 30] },
    });
    expect(hitStart).toMatchObject({
      currentMove: 264,
      player: { hp: 135, pp: [5, 10, 19, 15] },
      opponent: { hp: 135 },
    });
    expect(damagedOpponent).toMatchObject({
      currentMove: 264,
      battleOutcome: 0,
      player: { hp: 135 },
      opponent: { hp: 66, maxHp: 135 },
    });
    expect(zeroNext).toMatchObject({
      currentMove: 0,
      battleOutcome: 0,
      opponentLightScreenTurns: 4,
      player: { hp: 135, pp: [5, 10, 19, 15] },
      opponent: { hp: 66 },
    });
    expect([
      zeroInitial!.rngValue,
      lightScreen!.rngValue,
      hitStart!.rngValue,
      damagedOpponent!.rngValue,
      zeroNext!.rngValue,
    ]).toEqual([0, 0, 3, 3, 10].map((calls) => advanceRng(919694434, calls)));
  });

  it("pins source/scenario hashes, byte-identical replay manifests, framebuffer receipts, and the honest boundary", () => {
    const sourcePaths: Record<string, string> = {
      "battle_script_commands.c": "reference/pokeemerald/src/battle_script_commands.c",
      "battle_scripts_1.s": "reference/pokeemerald/data/battle_scripts_1.s",
      "battle_script.inc": "reference/pokeemerald/asm/macros/battle_script.inc",
      "battle_script_commands.h": "reference/pokeemerald/include/constants/battle_script_commands.h",
      "battle.h": "reference/pokeemerald/include/battle.h",
      "battle_main.c": "reference/pokeemerald/src/battle_main.c",
      "battle_moves.h": "reference/pokeemerald/src/data/battle_moves.h",
      "battle_frontier_mons.h":
        "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "level_up_learnsets.h":
        "reference/pokeemerald/src/data/pokemon/level_up_learnsets.h",
    };
    for (const [name, path] of Object.entries(sourcePaths))
      expect(sha256(path)).toBe(evidence.sourceSha256[name as keyof typeof evidence.sourceSha256]);

    expect(evidence.repeatability).toMatchObject({
      runsPerCase: 2,
      comparison: "byte-identical full manifest.json",
      allMatched: true,
    });
    for (const evidenceCase of evidence.cases) {
      expect(new Set(evidenceCase.runManifestSha256).size).toBe(1);
      expect(evidenceCase.runManifestSha256[0]).toMatch(/^[a-f0-9]{64}$/);
      expect((evidenceCase.captures as Capture[])
        .every(({ sha256: digest }) => /^[a-f0-9]{64}$/.test(digest))).toBe(true);
    }
    expect(Object.values(evidence.source).every((citation) =>
      citation.startsWith("reference/pokeemerald/") && /:\d/.test(citation))).toBe(true);
    expect(evidence.boundedRemainder).toMatch(
      /does not expose raw ProtectStruct receipt words.*source boundary.*Special-damage fallthrough.*not separately traced/,
    );
  });
});
