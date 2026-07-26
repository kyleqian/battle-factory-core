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

const program = loadBattleScriptProgram();

/** include/constants/battle.h:78 -- Factory always sets this bit. */
const BATTLE_TYPE_FACTORY = 1 << 19;
/** include/constants/species.h:391. */
const SPECIES_CASTFORM = 385;
/** include/constants/abilities.h:63/13. */
const ABILITY_FORECAST = 59;
const ABILITY_CLOUD_NINE = 13;
/** include/constants/battle.h:232-244 -- same encoding this engine's weather opcode modules already use. */
const B_WEATHER_SUN_TEMPORARY = 1 << 5;
const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
const B_WEATHER_HAIL_TEMPORARY = 1 << 7;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
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
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
  });
}

function context(
  battlers: readonly [BattleScriptRulesBattler, BattleScriptRulesBattler, BattleScriptRulesBattler, BattleScriptRulesBattler],
  scriptingBattler: 0 | 1 | 2 | 3,
  weather: number,
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler,
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
    weather,
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
  } satisfies BattleScriptRulesContextInput);
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

const trycastformdatachangePc = program.instructions.findIndex(
  (instruction) => instruction.opcodeName === "B_SCR_OP_TRYCASTFORMDATACHANGE",
);

function stepAtProgramCounter(rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_WeatherFormChanges",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: trycastformdatachangePc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("production trycastformdatachange (Cmd_trycastformdatachange) dispatch -- battle_script_commands.c:9744-9755 / CastformDataTypeChange battle_util.c:2396-2429", () => {
  it("registers B_SCR_OP_TRYCASTFORMDATACHANGE", () => {
    expect(trycastformdatachangePc).toBeGreaterThanOrEqual(0);
  });

  describe("(a) source-complete pass-through -- ordinary matchups advance, no barrier", () => {
    it("a non-Castform battler (species 0) advances regardless of active weather", () => {
      const rc = context(
        [battler({ side: 0 }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
        0,
        B_WEATHER_SUN_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("advanced");
    });

    it("Castform present but without Forecast (ability 0) advances -- battle_util.c:2399's ability check", () => {
      const rc = context(
        [
          battler({ side: 0, species: SPECIES_CASTFORM, ability: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        0,
        B_WEATHER_SUN_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("advanced");
    });

    it("a fainted Forecast Castform (hp 0) advances -- battle_util.c:2399's hp check", () => {
      const rc = context(
        [
          battler({ side: 0, species: SPECIES_CASTFORM, ability: ABILITY_FORECAST, hp: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        0,
        B_WEATHER_SUN_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("advanced");
    });

    it("a live Forecast Castform already in the correct form for the active weather advances (form recomputes to 0)", () => {
      const rc = context(
        [
          battler({ side: 0, species: SPECIES_CASTFORM, ability: ABILITY_FORECAST, types: ["TYPE_FIRE", "TYPE_FIRE"] }),
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        0,
        B_WEATHER_SUN_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("advanced");
    });

    it("Cloud Nine nullifies weather; a live Forecast Castform already Normal-typed advances -- battle_util.c:2406-2407", () => {
      const rc = context(
        [
          battler({ side: 0, species: SPECIES_CASTFORM, ability: ABILITY_FORECAST, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
          battler({ side: 1, ability: ABILITY_CLOUD_NINE }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        0,
        B_WEATHER_SUN_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("advanced");
    });
  });

  describe("(b) unsupported-branch barrier -- a live Forecast Castform's type is stale for the active weather", () => {
    it("halts under active Sun with a still-Normal-typed Castform (form -> Fire, the common real case)", () => {
      const rc = context(
        [
          battler({ side: 0, species: SPECIES_CASTFORM, ability: ABILITY_FORECAST, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        0,
        B_WEATHER_SUN_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("halts under active Rain with a still-Normal-typed Castform (form -> Water)", () => {
      const rc = context(
        [
          battler({ side: 0, species: SPECIES_CASTFORM, ability: ABILITY_FORECAST, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        0,
        B_WEATHER_RAIN_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("halts under active Hail with a still-Normal-typed Castform (form -> Ice)", () => {
      const rc = context(
        [
          battler({ side: 0, species: SPECIES_CASTFORM, ability: ABILITY_FORECAST, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        0,
        B_WEATHER_HAIL_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("halts when Cloud Nine nullifies weather and Castform is not Normal-typed (reverts to Normal)", () => {
      const rc = context(
        [
          battler({ side: 0, species: SPECIES_CASTFORM, ability: ABILITY_FORECAST, types: ["TYPE_FIRE", "TYPE_FIRE"] }),
          battler({ side: 1, ability: ABILITY_CLOUD_NINE }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        0,
        B_WEATHER_SUN_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("checks the scripting battler (gBattleScripting.battler), not a fixed role -- Castform in slot 1 while slot 0 is ordinary", () => {
      const rc = context(
        [
          battler({ side: 0 }),
          battler({ side: 1, species: SPECIES_CASTFORM, ability: ABILITY_FORECAST, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        1,
        B_WEATHER_SUN_TEMPORARY,
      );
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });
  });

  describe("staged integration: BattleScript_MoveWeatherChange's real call into BattleScript_WeatherFormChanges", () => {
    it(
      "advances through this opcode for battler 0 of an ordinary (non-Castform) matchup, then halts one "
        + "opcode later on the pre-existing, already-inventoried sBATTLER addbyte barrier "
        + "(battleScriptDamagingWeatherOpcode.ts's Cmd_addbyte only models the gBattleCommunication,1 call "
        + "site) -- proof this opcode is no longer the WeatherFormChanges loop's own gate",
      () => {
        const rc = context(
          [battler({ side: 0 }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
          0,
          B_WEATHER_SUN_TEMPORARY,
        );
        const execution = createBattleScriptStatusRulesExecution(
          program,
          "BattleScript_MoveWeatherChange",
          rc,
          1,
          externalPorts(),
        );
        const callPc = program.instructions.find(
          (instruction) =>
            instruction.opcodeName === "B_SCR_OP_CALL" && instruction.source.label === "BattleScript_MoveWeatherChange",
        );
        if (!callPc) throw new Error("no B_SCR_OP_CALL instruction found in BattleScript_MoveWeatherChange");
        const state0 = Object.freeze({ ...execution.state, programCounter: callPc.programCounter });

        // call BattleScript_WeatherFormChanges -- pushes a real return address.
        const afterCall = stepBattleScriptMachine(program, state0, execution.handlers);
        if (afterCall.kind !== "advanced") throw new Error("expected call to advance");
        expect(afterCall.state.callStack.length).toBe(1);

        // setbyte sBATTLER, 0
        const afterSetbyte = stepBattleScriptMachine(program, afterCall.state, execution.handlers);
        if (afterSetbyte.kind !== "advanced") throw new Error("expected setbyte to advance");
        expect(afterSetbyte.state.rulesContext.scriptingBattler).toBe(0);

        // trycastformdatachange, battler 0 (ordinary) -- this session's registration: a real advance.
        const afterTrycastform = stepBattleScriptMachine(program, afterSetbyte.state, execution.handlers);
        expect(afterTrycastform.kind).toBe("advanced");

        // addbyte sBATTLER, 1 -- one opcode further down the exact same loop; a different, already-pinned barrier.
        if (afterTrycastform.kind !== "advanced") throw new Error("expected trycastformdatachange to advance");
        const afterAddbyte = stepBattleScriptMachine(program, afterTrycastform.state, execution.handlers);
        expect(afterAddbyte.kind).toBe("halted");
        if (afterAddbyte.kind !== "halted") throw new Error("expected addbyte to halt");
        expect(afterAddbyte.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
      },
    );
  });
});
