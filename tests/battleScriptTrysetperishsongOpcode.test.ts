import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import frontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };

const program = loadBattleScriptProgram();
const MOVE_PERISH_SONG = 195;
const STATUS3_PERISH_SONG = 1 << 5;
const ABILITY_SOUNDPROOF = 43;
const ABILITY_PRESSURE = 46;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return {
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? [MOVE_PERISH_SONG, 0, 0, 0],
    pp: changes.pp ?? [5, 0, 0, 0],
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
    partyIndex: changes.partyIndex ?? 0,
    perishSongTimer: changes.perishSongTimer,
    perishSongTimerStartValue: changes.perishSongTimerStartValue,
  };
}

function context(
  player: Partial<BattleScriptRulesBattler> = {},
  opponent: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, ...player }),
      battler({ side: 1, ...opponent }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_PERISH_SONG,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: 1 << 19,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return {
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? { kind: "message", messageId: operand.expression, substitutions: [] }
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => 0,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
    resolveByteOperand: () => null,
  };
}

function stepOpcode(rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectPerishSong",
    rulesContext,
    0x1234,
    ports(),
  );
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_TRYSETPERISHSONG",
  )!;
  return {
    initial: execution.state,
    result: stepBattleScriptMachine(
      program,
      { ...execution.state, programCounter: instruction.programCounter },
      execution.handlers,
    ),
  };
}

function runToTerminal(rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectPerishSong",
    rulesContext,
    0x1234,
    ports(),
  );
  let state = execution.state;
  for (let steps = 0; steps < 500; steps += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "blocked") {
      state = result.state;
      for (const battlerId of result.state.scheduler.pendingControllerBattlers) {
        state = acknowledgeBattleScriptMachineController(state, battlerId);
      }
      continue;
    }
    if (result.kind !== "advanced" && result.kind !== "scheduler-progressed") return result;
    state = result.state;
  }
  throw new Error("Perish Song script did not reach its terminal");
}

describe("B_SCR_OP_TRYSETPERISHSONG", () => {
  it("has a real single-ability Soundproof Factory rental carrier", () => {
    expect(frontierMons.entries.some(({ species }) => species === "SPECIES_WHISMUR")).toBe(true);
    expect(speciesStats.species.find(({ name }) => name === "SPECIES_WHISMUR")?.abilities)
      .toEqual(["ABILITY_SOUNDPROOF", "ABILITY_NONE"]);
  });

  it("materializes frozen validated four-bit timer cells", () => {
    const rules = context({ perishSongTimer: 15, perishSongTimerStartValue: 3 });
    expect(rules.battlers[0]).toMatchObject({ perishSongTimer: 15, perishSongTimerStartValue: 3 });
    expect(Object.isFrozen(rules.battlers[0])).toBe(true);
    expect(() => context({ perishSongTimer: 16 })).toThrow(/perishSongTimer/);
  });

  it("iterates all battlers: sets ordinary holders, skips Soundproof, and does not fail partial immunity", () => {
    const { initial, result } = stepOpcode(context({}, { ability: ABILITY_SOUNDPROOF }));
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(initial.programCounter + 4);
    expect(result.state.rulesContext.battlers[0]).toMatchObject({
      status3: STATUS3_PERISH_SONG,
      perishSongTimer: 3,
      perishSongTimerStartValue: 3,
    });
    expect(result.state.rulesContext.battlers[1]).toMatchObject({
      status3: 0,
      perishSongTimer: 0,
      perishSongTimerStartValue: 0,
    });
    expect(result.state.rng.calls).toBe(initial.rng.calls);
    expect(result.state.events).toEqual(initial.events);
  });

  it("takes the failure pointer only when every battler is already affected/immune, while Pressure bookkeeping still runs", () => {
    const { initial, result } = stepOpcode(context(
      { status3: STATUS3_PERISH_SONG, perishSongTimer: 2 },
      { ability: ABILITY_PRESSURE, status3: STATUS3_PERISH_SONG, perishSongTimer: 2 },
    ));
    if (result.kind !== "advanced") throw new Error("expected jump");
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_ButItFailed")!.programCounter,
    );
    expect(result.state.rulesContext.battlers[0].pp[0]).toBe(4);
    expect(result.state.rulesContext.battlers.slice(0, 2).map((b) => b.perishSongTimer)).toEqual([2, 2]);
    expect(result.state.rng.calls).toBe(initial.rng.calls);

    const publicFailure = runToTerminal(context(
      { status3: STATUS3_PERISH_SONG, perishSongTimer: 2 },
      { status3: STATUS3_PERISH_SONG, perishSongTimer: 2 },
    ));
    expect(publicFailure.kind).toBe("halted");
    expect(publicFailure.state.haltReason).toMatchObject({ kind: "terminal" });
    expect(publicFailure.state.rulesContext.battlers[0].pp[0]).toBe(4);
    expect(publicFailure.state.rulesContext.battlers.slice(0, 2).map((b) => b.perishSongTimer))
      .toEqual([2, 2]);
  });

  it("runs the full committed effect script through its BS_SCRIPTING Soundproof loop, with canonical replay and zero RNG", () => {
    const source = context({}, { ability: ABILITY_SOUNDPROOF });
    const first = runToTerminal(source);
    const replay = runToTerminal(source);
    expect(first.kind).toBe("halted");
    expect(replay.kind).toBe("halted");
    expect(first.state.haltReason).toMatchObject({ kind: "terminal" });
    expect(replay.state.haltReason).toMatchObject({ kind: "terminal" });
    expect(first.state.rulesContext.battlers[0].pp[0]).toBe(4);
    expect(first.state.rulesContext.battlers[0].perishSongTimer).toBe(3);
    expect(first.state.rulesContext.battlers[1].perishSongTimer).toBe(0);
    expect(first.state.rulesContext.lastUsedAbility).toBe(ABILITY_SOUNDPROOF);
    expect(first.state.rng.calls).toBe(0);
    expect(replay.state.rulesContext).toEqual(first.state.rulesContext);
    expect(replay.state.rng).toEqual(first.state.rng);
  });
});
