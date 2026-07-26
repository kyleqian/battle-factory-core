import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import { createBattleScriptDamagingWeatherOpcodeHandlers } from "../src/engine/battleScriptDamagingWeatherOpcode.ts";

const program = loadBattleScriptProgram();
const ABILITY_SAND_VEIL = 8;
const STATUS3_UNDERGROUND = 1 << 7;

function battler(changes: Partial<BattleScriptRulesBattler> & { maxHP?: number } = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  }) as unknown as BattleScriptRulesBattler;
}

function context(contextChanges: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [battler({ side: 0 }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: { battlersCount: 2, battleTypeFlags: (1 << 3) | (1 << 19), battlerPositions: [0, 1, 2, 3] },
    ...contextChanges,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => 0,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

function findPc(opcodeName: string, sourceLabel: string): number {
  const found = program.instructions.find(
    (instruction) => instruction.opcodeName === opcodeName && instruction.source.label === sourceLabel,
  );
  if (!found) throw new Error(`no matching ${opcodeName} instruction found in ${sourceLabel}`);
  return found.programCounter;
}

function stepAtProgramCounter(pc: number, rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectHit", rulesContext, 1, externalPorts());
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("production damaging-weather opcode dispatch (screens/weather registration slice 5)", () => {
  it("registers all six opcodes without throwing", () => {
    expect(() =>
      createBattleScriptDamagingWeatherOpcodeHandlers(program, {
        isControllerIdle: () => true,
        resolveBattlerForBattleScript: () => 0,
      })
    ).not.toThrow();
  });

  describe("Cmd_copyarraywithindex (BattleScript_DamagingWeatherLoop)", () => {
    const pc = findPc("B_SCR_OP_COPYARRAYWITHINDEX", "BattleScript_DamagingWeatherLoop");

    it("reassigns the attacker role to gBattlerByTurnOrder[gBattleCommunication]", () => {
      const rc = context({ battleCommunication0: 1, battlerByTurnOrder: [1, 0, 2, 3] });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.selectorRoles.attacker).toBe(0);
    });
  });

  describe("Cmd_weatherdamage (BattleScript_DamagingWeatherLoop)", () => {
    const pc = findPc("B_SCR_OP_WEATHERDAMAGE", "BattleScript_DamagingWeatherLoop");
    const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;
    const B_WEATHER_HAIL_TEMPORARY = 1 << 7;

    it("deals floor(maxHP/16) sandstorm chip damage to a non-immune type", () => {
      const rc = context({
        weather: B_WEATHER_SANDSTORM_TEMPORARY,
        battlers: [battler({ side: 0, maxHP: 105, types: ["TYPE_GRASS", "TYPE_GRASS"] }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
      });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(6); // floor(105/16)
    });

    it("Rock/Ground/Steel typing is immune to sandstorm chip damage", () => {
      const rc = context({
        weather: B_WEATHER_SANDSTORM_TEMPORARY,
        battlers: [battler({ side: 0, maxHP: 105, types: ["TYPE_ROCK", "TYPE_GROUND"] }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
      });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(0);
    });

    it("Sand Veil grants sandstorm immunity even off-type", () => {
      const rc = context({
        weather: B_WEATHER_SANDSTORM_TEMPORARY,
        battlers: [battler({ side: 0, maxHP: 105, ability: ABILITY_SAND_VEIL, types: ["TYPE_GRASS", "TYPE_GRASS"] }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
      });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(0);
    });

    it("underground battlers are immune to sandstorm chip damage", () => {
      const rc = context({
        weather: B_WEATHER_SANDSTORM_TEMPORARY,
        battlers: [battler({ side: 0, maxHP: 105, status3: STATUS3_UNDERGROUND, types: ["TYPE_GRASS", "TYPE_GRASS"] }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
      });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(0);
    });

    it("deals floor(maxHP/16) hail chip damage to a non-Ice type; Ice types are immune", () => {
      const rc = context({
        weather: B_WEATHER_HAIL_TEMPORARY,
        battlers: [battler({ side: 0, maxHP: 80, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
      });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(5); // floor(80/16)

      const rcIce = context({
        weather: B_WEATHER_HAIL_TEMPORARY,
        battlers: [battler({ side: 0, maxHP: 80, types: ["TYPE_ICE", "TYPE_NORMAL"] }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
      });
      const { result: resultIce } = stepAtProgramCounter(pc, rcIce);
      if (resultIce.kind !== "advanced") throw new Error("expected advance");
      expect(resultIce.state.rulesContext.battleMoveDamage).toBe(0);
    });

    it("Cloud Nine anywhere on the field suppresses weather damage entirely", () => {
      const rc = context({
        weather: B_WEATHER_SANDSTORM_TEMPORARY,
        battlers: [
          battler({ side: 0, maxHP: 105, types: ["TYPE_GRASS", "TYPE_GRASS"] }),
          battler({ side: 1, ability: 13 }), // ABILITY_CLOUD_NINE
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(0);
    });

    it("minimum damage is 1, never 0, for a non-immune battler with a tiny maxHP", () => {
      const rc = context({
        weather: B_WEATHER_SANDSTORM_TEMPORARY,
        battlers: [battler({ side: 0, maxHP: 10, types: ["TYPE_GRASS", "TYPE_GRASS"] }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
      });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleMoveDamage).toBe(1);
    });
  });

  describe("Cmd_addbyte -- modeled site vs. barrier", () => {
    const pc = findPc("B_SCR_OP_ADDBYTE", "BattleScript_DamagingWeatherLoopIncrement");
    const barrierPc = findPc("B_SCR_OP_ADDBYTE", "BattleScript_DoTripleKickAttack");

    it("(pass-through) increments gBattleCommunication by 1", () => {
      const rc = context({ battleCommunication0: 2 });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battleCommunication0).toBe(3);
    });

    it("(unsupported-branch) barriers on an unmodeled addbyte operand (Triple Kick's own counter)", () => {
      const { result } = stepAtProgramCounter(barrierPc, context());
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason?.kind).toBe("unsupported-branch");
    });
  });

  describe("Cmd_bicword -- modeled site vs. barrier", () => {
    const pc = findPc("B_SCR_OP_BICWORD", "BattleScript_DamagingWeatherContinuesEnd");
    const barrierPc = findPc("B_SCR_OP_BICWORD", "BattleScript_HitsAllNoUndergroundBonus");
    const BITS = (1 << 5) | (1 << 8) | (1 << 20) | (1 << 24); // IGNORE_BIDE | IGNORE_SUBSTITUTE | PASSIVE_HP_UPDATE | GRUDGE

    it("(pass-through) clears exactly the four named HITMARKER_* bits", () => {
      const rc = context({ hitMarker: BITS | (1 << 0) });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.hitMarker).toBe(1 << 0);
    });

    it("(unsupported-branch) barriers on an unmodeled bicword value (HitsAllNoUndergroundBonus's single-bit clear)", () => {
      const { result } = stepAtProgramCounter(barrierPc, context());
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason?.kind).toBe("unsupported-branch");
    });
  });

  describe("Cmd_jumpifarraynotequal (jumpifbytenotequal alias) -- modeled site vs. barrier", () => {
    const pc = findPc("B_SCR_OP_JUMPIFARRAYNOTEQUAL", "BattleScript_DamagingWeatherLoopIncrement");
    const barrierPc = findPc("B_SCR_OP_JUMPIFARRAYNOTEQUAL", "BattleScript_PerishSongLoopIncrement");

    it("(pass-through) jumps to the loop start while gBattleCommunication != gBattlersCount", () => {
      const rc = context({ battleCommunication0: 1, battleTopology: { battlersCount: 2, battleTypeFlags: (1 << 3) | (1 << 19), battlerPositions: [0, 1, 2, 3] } });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).not.toBe(pc + 1);
    });

    it("advances (falls through) once gBattleCommunication == gBattlersCount", () => {
      const rc = context({ battleCommunication0: 2, battleTopology: { battlersCount: 2, battleTypeFlags: (1 << 3) | (1 << 19), battlerPositions: [0, 1, 2, 3] } });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.programCounter).toBe(pc + 1);
    });

    it("(unsupported-branch) barriers on an unmodeled compare pair (Perish Song's own loop counter)", () => {
      const { result } = stepAtProgramCounter(barrierPc, context());
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason?.kind).toBe("unsupported-branch");
    });
  });

  describe("Cmd_playanimation_var", () => {
    const pc = findPc("B_SCR_OP_PLAYANIMATION_VAR", "BattleScript_DamagingWeatherContinues");

    it("marks the attacker's controller pending and advances", () => {
      const { result } = stepAtProgramCounter(pc, context());
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.scheduler.pendingControllerBattlers).toContain(0);
    });
  });
});
