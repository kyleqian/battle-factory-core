import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/baton-pass-off-evidence.json" with { type: "json" };

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
  currentMove: number;
  player: {
    species: number;
    partyIndex: number;
    hp: number;
    maxHp: number;
    pp: number[];
    status1: number;
    status2: number;
    status3: number;
    statStages: number[];
  };
  opponent: { species: number; partyIndex: number; hp: number; maxHp: number; pp: number[] };
};

const evidence = evidenceData;
const COMPLETE_MON_KEYS = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const TRANSIENT_KEYS = /"(?:battleOutcome|sideConditions|statStages|status1|status2|status3|weather|weatherTurns)"/;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readScenario(): Scenario {
  return JSON.parse(readFileSync(evidence.scenario.path, "utf8")) as Scenario;
}

function advanceRng(seed: number, calls: number): number {
  let value = seed >>> 0;
  for (let i = 0; i < calls; i++)
    value = (Math.imul(value, 1103515245) + 24691) >>> 0;
  return value;
}

describe("Battle Scene OFF Baton Pass / jumpifcantswitch evidence", () => {
  it("uses one complete-party mechanicLab trace with ordinary controller input", () => {
    expect(evidence.schema).toBe("baton-pass-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    const scenario = readScenario();
    expect(sha256(evidence.scenario.path)).toBe(evidence.scenario.sha256);
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
    expect(evidence.scenario.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(JSON.stringify(scenario)).not.toMatch(TRANSIENT_KEYS);

    for (const mon of [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ]) {
      expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
      expect(mon.level).toBe(50);
      expect(mon.moves).toHaveLength(4);
      expect(mon.ppUps).toEqual([0, 0, 0, 0]);
      expect(Object.values(mon.evs).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(510);
      expect(mon).not.toHaveProperty("hp");
    }
    expect(scenario.overrides.parties.player[0]!.moves).toEqual([60, 97, 226, 113]);
    expect(scenario.overrides.parties.opponent[0]!.moves).toEqual([212, 212, 212, 212]);
    expect(scenario.trace.captureFrames).toEqual(
      (evidence.scenario.captures as Capture[]).map(({ frame }) => frame),
    );
    expect(scenario.trace.segments.some(({ buttons }) => buttons.includes("RIGHT"))).toBe(true);
  });

  it("pins the exact six-byte operand layout, branch polarity, topology, and PC behavior", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 79,
      opcodeHex: "0x4f",
      length: 6,
      operandWidths: [1, 4],
      ignoreEscapePreventionMask: 128,
      batonPassBattlerOperand: 129,
      batonPassSelectorAfterMask: 1,
      pc: {
        cannotSwitch: "load the pointer encoded at instruction bytes 2..5",
        canSwitch: "advance by 6 bytes",
      },
    });
    expect(evidence.instruction.layout.map(({ offset, width }) => [offset, width])).toEqual([
      [0, 1], [1, 1], [2, 4],
    ]);
    expect(evidence.branchContract.polarity).toContain("cannot switch");
    expect(evidence.branchContract.volatileGate).toMatch(
      /STATUS2_WRAPPED.*STATUS2_ESCAPE_PREVENTION.*STATUS3_ROOTED/,
    );
    expect(evidence.branchContract.eligibleMon).toMatch(/not SPECIES_NONE.*not an egg.*HP is nonzero/);
    expect(evidence.branchContract.topology.map(({ mode }) => mode)).toEqual([
      "in-game partner", "multi", "two opponents on opponent side", "ordinary singles/doubles",
    ]);

    const macro = readFileSync("reference/pokeemerald/asm/macros/battle_script.inc", "utf8");
    expect(macro).toMatch(
      /\.macro jumpifcantswitch[\s\S]*?\.byte B_SCR_OP_JUMPIFCANTSWITCH[\s\S]*?\.byte \\battler[\s\S]*?\.4byte \\ptr/,
    );
    const commands = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    expect(commands).toContain(
      "gActiveBattler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1] & ~SWITCH_IGNORE_ESCAPE_PREVENTION);",
    );
    expect(commands).toContain(
      "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2);",
    );
    expect(commands).toContain("gBattlescriptCurrInstr += 6;");
    expect(commands).toMatch(
      /if \(GetMonData\(&party\[i\], MON_DATA_HP\) != 0[\s\S]*?MON_DATA_SPECIES\) != SPECIES_NONE[\s\S]*?MON_DATA_IS_EGG[\s\S]*?i != gBattlerPartyIndexes\[battlerIn1\][\s\S]*?i != gBattlerPartyIndexes\[battlerIn2\]/,
    );
  });

  it("pins Baton Pass's Arena failure and bit-7 volatile-bypass route", () => {
    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    expect(scripts).toMatch(
      /BattleScript_EffectBatonPass::[\s\S]*?jumpifbattletype BATTLE_TYPE_ARENA, BattleScript_ButItFailed[\s\S]*?jumpifcantswitch SWITCH_IGNORE_ESCAPE_PREVENTION \| BS_ATTACKER, BattleScript_ButItFailed[\s\S]*?openpartyscreen BS_ATTACKER, BattleScript_ButItFailed[\s\S]*?switchineffects BS_ATTACKER/,
    );
    const moves = readFileSync("reference/pokeemerald/src/data/battle_moves.h", "utf8");
    expect(moves).toMatch(
      /\[MOVE_BATON_PASS\][\s\S]*?\.effect = EFFECT_BATON_PASS,[\s\S]*?\.pp = 40,[\s\S]*?\.target = MOVE_TARGET_USER/,
    );
    const frontierMons = readFileSync(
      "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "utf8",
    );
    expect(frontierMons).toMatch(
      /\[FRONTIER_MON_LEDYBA\][\s\S]*?MOVE_PSYBEAM, MOVE_AGILITY, MOVE_BATON_PASS, MOVE_LIGHT_SCREEN/,
    );
    expect(evidence.branchContract.batonPass).toMatch(/0x80\|BS_ATTACKER/);
  });

  it("proves Mean Look cannot stop the real switch and pins PP, party, volatile, and RNG facts", () => {
    const [initial, trapped, partyScreen, switched, nextRequest] =
      evidence.scenario.captures as Capture[];
    expect(initial!.player).toMatchObject({ species: 165, partyIndex: 0, pp: [20, 30, 40, 30] });
    expect(trapped!.currentMove).toBe(212);
    expect(trapped!.player.status2).toBe(STATUS2_ESCAPE_PREVENTION);
    expect(trapped!.opponent.pp).toEqual([5, 4, 5, 5]);
    expect(partyScreen!.currentMove).toBe(226);
    expect(partyScreen!.player.pp).toEqual([20, 30, 39, 30]);
    expect(partyScreen!.player.status2).toBe(STATUS2_ESCAPE_PREVENTION);

    expect(switched!.player).toMatchObject({
      species: 1,
      partyIndex: 1,
      hp: 120,
      maxHp: 120,
      status2: STATUS2_ESCAPE_PREVENTION,
    });
    expect(evidence.scenario.playerPartyFinal).toEqual([
      { species: 165, hp: 115, maxHp: 115, pp: [20,30,39,30], status1: 0, checksumValid: true },
      { species: 1, hp: 120, maxHp: 120, pp: [35,35,35,35], status1: 0, checksumValid: true },
      { species: 4, hp: 114, maxHp: 114, pp: [35,35,35,35], status1: 0, checksumValid: true },
    ]);
    expect([initial!.rngValue, trapped!.rngValue, partyScreen!.rngValue, switched!.rngValue])
      .toEqual(Array(4).fill(1621732966));
    expect(nextRequest!.rngValue).toBe(advanceRng(switched!.rngValue, 6));
    expect(nextRequest!.player).toEqual(switched!.player);
  });

  it("pins source hashes, repeatable manifests, trace hashes, and the honest failure remainder", () => {
    const sourcePaths: Record<string, string> = {
      "battle_script_commands.c": "reference/pokeemerald/src/battle_script_commands.c",
      "battle_scripts_1.s": "reference/pokeemerald/data/battle_scripts_1.s",
      "battle_script.inc": "reference/pokeemerald/asm/macros/battle_script.inc",
      "battle_script_commands.h": "reference/pokeemerald/include/constants/battle_script_commands.h",
      "battle_moves.h": "reference/pokeemerald/src/data/battle_moves.h",
    };
    for (const [name, path] of Object.entries(sourcePaths))
      expect(sha256(path)).toBe(evidence.sourceSha256[name as keyof typeof evidence.sourceSha256]);

    expect(evidence.repeatability.runs).toBe(2);
    expect(new Set(evidence.repeatability.manifestSha256).size).toBe(1);
    expect(evidence.repeatability.manifestSha256[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.scenario.captures.every(({ sha256: digest }) => /^[a-f0-9]{64}$/.test(digest)))
      .toBe(true);
    expect(Object.values(evidence.source).every((citation) =>
      citation.startsWith("reference/pokeemerald/") && /:\d/.test(citation))).toBe(true);
    expect(evidence.boundedRemainder).toMatch(
      /three complete healthy pre-battle Pokemon.*forbids transient faint-state injection.*Arena is outside/,
    );
  });
});
