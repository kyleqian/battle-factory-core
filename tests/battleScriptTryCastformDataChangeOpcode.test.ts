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

  // ROADMAP S10 gate-4: these five cases used to pin the (b) unsupported-branch
  // barrier (haltReason.kind === "unsupported-branch"); the barrier is now
  // retired for real -- a stale-typed Castform executes the pushed
  // BattleScript_CastformChange path, writes its two types durably, and keeps
  // the machine running. The ratchet entry drops to 0 with this step.
  describe("(b) live form change -- a stale-typed Castform now runs BattleScript_CastformChange instead of halting", () => {
    const castformChangePc = program.labelEntries["BattleScript_CastformChange"].programCounter;

    function assertFormChange(
      rc: BattleScriptRulesContext,
      expectedFormToChangeInto: number,
      expectedTypes: readonly [string, string],
    ) {
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected the machine to keep running");
      expect(result.state.haltReason).toBeNull();
      expect(result.state.rulesContext.formToChangeInto).toBe(expectedFormToChangeInto);
      const battlerId = result.state.rulesContext.scriptingBattler;
      expect(result.state.rulesContext.battlers[battlerId].types).toEqual(expectedTypes);
      // The pushed BattleScript_CastformChange path is entered: pc is its own
      // `call BattleScript_DoCastformChange` start and the continuation (the
      // post-opcode byte of trycastformdatachange) is on the call stack.
      expect(result.state.programCounter).toBe(castformChangePc);
      expect(result.state.callStack).toContain(trycastformdatachangePc + 1);
      return result.state;
    }

    it("under active Sun a still-Normal Castform changes to Fire (formToChangeInto 1, Fire/Fire types)", () => {
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
      assertFormChange(rc, 1, ["TYPE_FIRE", "TYPE_FIRE"]);
    });

    it("under active Rain a still-Normal Castform changes to Water (formToChangeInto 2, Water/Water types)", () => {
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
      assertFormChange(rc, 2, ["TYPE_WATER", "TYPE_WATER"]);
    });

    it("under active Hail a still-Normal Castform changes to Ice (formToChangeInto 3, Ice/Ice types)", () => {
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
      assertFormChange(rc, 3, ["TYPE_ICE", "TYPE_ICE"]);
    });

    it("when Cloud Nine nullifies weather, a non-Normal Castform reverts to Normal (formToChangeInto 0, Normal/Normal types)", () => {
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
      assertFormChange(rc, 0, ["TYPE_NORMAL", "TYPE_NORMAL"]);
    });

    it("checks the scripting battler (gBattleScripting.battler), not a fixed role -- Castform in slot 1 changes while slot 0 stays ordinary", () => {
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
      const state = assertFormChange(rc, 1, ["TYPE_FIRE", "TYPE_FIRE"]);
      expect(state.rulesContext.battlers[0].types).toEqual(["TYPE_NORMAL", "TYPE_NORMAL"]);
    });

    it("steps the pushed path one opcode further: BattleScript_CastformChange's call -> docastformchangeanimation emits the CASTFORM_CHANGE kernel event and marks the battler's controller pending", () => {
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
      const afterTrycastform = assertFormChange(rc, 2, ["TYPE_WATER", "TYPE_WATER"]);
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_WeatherFormChanges",
        afterTrycastform.rulesContext,
        1,
        externalPorts(),
      );
      const afterCall = stepBattleScriptMachine(program, afterTrycastform, execution.handlers);
      expect(afterCall.kind).toBe("advanced");
      if (afterCall.kind !== "advanced") throw new Error("expected the call to advance");
      const docastformchangeanimationPc = program.instructions.find(
        (instruction) => instruction.opcodeName === "B_SCR_OP_DOCASTFORMCHANGEANIMATION",
      );
      if (!docastformchangeanimationPc) throw new Error("no B_SCR_OP_DOCASTFORMCHANGEANIMATION instruction found");
      const afterAnimation = stepBattleScriptMachine(program, afterCall.state, execution.handlers);
      expect(afterAnimation.kind).toBe("advanced");
      if (afterAnimation.kind !== "advanced") throw new Error("expected docastformchangeanimation to advance");
      const event = afterAnimation.state.events.at(-1);
      expect(event).toMatchObject({
        kind: "animation",
        animationId: "CASTFORM_CHANGE",
        battler: 0,
      });
      expect(afterAnimation.state.scheduler.activeBattler).toBe(0);
      expect(afterAnimation.state.scheduler.pendingControllerBattlers).toContain(0);
      expect(afterAnimation.state.rulesContext.formToChangeInto).toBe(2);
    });
  });

  describe("staged integration: BattleScript_MoveWeatherChange's real call into BattleScript_WeatherFormChanges", () => {
    it(
      "runs the complete loop for an ordinary (non-Castform) 2-battler matchup -- both battlers' "
        + "trycastformdatachange, both addbyte increments (battleScriptDamagingWeatherOpcode.ts's Cmd_addbyte/"
        + "Cmd_jumpifarraynotequal widened this session onto the shared sBATTLER byte-lvalue universe), the "
        + "loop-back jump, and the exit compare -- then pops the real call stack `call "
        + "BattleScript_WeatherFormChanges` pushed, landing exactly at its own continuation "
        + "(`goto BattleScript_MoveEnd`)",
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
        const afterTrycastform0 = stepBattleScriptMachine(program, afterSetbyte.state, execution.handlers);
        expect(afterTrycastform0.kind).toBe("advanced");

        // addbyte sBATTLER, 1 -- now a real advance (shared-universe widening), sBATTLER 0 -> 1.
        if (afterTrycastform0.kind !== "advanced") throw new Error("expected trycastformdatachange to advance");
        const afterAddbyte0 = stepBattleScriptMachine(program, afterTrycastform0.state, execution.handlers);
        if (afterAddbyte0.kind !== "advanced") throw new Error("expected addbyte to advance");
        expect(afterAddbyte0.state.rulesContext.scriptingBattler).toBe(1);

        // jumpifbytenotequal sBATTLER(1), gBattlersCount(2) -- not equal, jumps back to the loop start.
        const afterJump0 = stepBattleScriptMachine(program, afterAddbyte0.state, execution.handlers);
        if (afterJump0.kind !== "advanced") throw new Error("expected jumpifbytenotequal to advance");
        expect(afterJump0.state.programCounter).not.toBe(afterAddbyte0.state.programCounter + 1);

        // trycastformdatachange, battler 1 (ordinary) -- second loop iteration.
        const afterTrycastform1 = stepBattleScriptMachine(program, afterJump0.state, execution.handlers);
        if (afterTrycastform1.kind !== "advanced") throw new Error("expected trycastformdatachange to advance");

        // addbyte sBATTLER, 1 -- sBATTLER 1 -> 2.
        const afterAddbyte1 = stepBattleScriptMachine(program, afterTrycastform1.state, execution.handlers);
        if (afterAddbyte1.kind !== "advanced") throw new Error("expected addbyte to advance");
        expect(afterAddbyte1.state.rulesContext.scriptingBattler).toBe(2);

        // jumpifbytenotequal sBATTLER(2), gBattlersCount(2) -- equal, falls through (loop exit).
        const afterJump1 = stepBattleScriptMachine(program, afterAddbyte1.state, execution.handlers);
        if (afterJump1.kind !== "advanced") throw new Error("expected jumpifbytenotequal to advance");
        expect(afterJump1.state.programCounter).toBe(afterAddbyte1.state.programCounter + 1);

        // return -- pops the real call stack, landing at the call site's own continuation.
        const afterReturn = stepBattleScriptMachine(program, afterJump1.state, execution.handlers);
        if (afterReturn.kind !== "advanced") throw new Error("expected return to advance");
        expect(afterReturn.state.callStack.length).toBe(0);
        expect(afterReturn.state.programCounter).toBe(callPc.programCounter + 1);
        expect(afterReturn.state.rng.calls).toBe(0);
      },
    );
  });
});
