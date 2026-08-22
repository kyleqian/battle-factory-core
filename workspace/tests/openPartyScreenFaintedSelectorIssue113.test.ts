/**
 * ISSUES #113 -- `Cmd_openpartyscreen: unresolved battler selector BS_FAINTED`.
 *
 * `Cmd_getexp` (`battle_script_commands.c:3264`) opens with a real global
 * write, not just a read:
 *
 *     gBattlerFainted = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);
 *
 * It runs before the `gBattleScripting.getexpState` switch, so EVERY `getexp`
 * call site republishes `gBattlerFainted` from its own selector operand. That
 * write is the only thing that makes `BattleScript_SpikesOnAttackerFainted`
 * (`data/battle_scripts_1.s:3396-3401`) legal:
 *
 *     setbyte sGIVEEXP_STATE, 0
 *     getexp BS_ATTACKER          @ gBattlerFainted = gBattlerAttacker
 *     moveendall
 *     goto BattleScript_HandleFaintedMon
 *
 * ... because `BattleScript_HandleFaintedMon` falls into
 * `BattleScript_FaintedMonTryChoose`'s `openpartyscreen BS_FAINTED`
 * (`:2843-2844`), and `GetBattlerForBattleScript`'s `case BS_FAINTED`
 * (`battle_util.c:713-715`) reads exactly that global. This engine's
 * `selectorRoles.fainted` role was previously written ONLY by the
 * fainted-actions orchestration (`battle_util.c:1915`'s
 * `gBattlerFainted = gBattlerTarget = faintedActionsBattlerId`), so a mon
 * that faints to Spikes DURING an ordinary voluntary-switch action reached
 * `openpartyscreen BS_FAINTED` with the role still null and threw.
 *
 * Live repro (fixed by this pin): `node --experimental-strip-types
 * tools/soak/randomRoundSoak.ts --policy full --seed 192 --render-every 0`,
 * battle 1 turn 23 -- the player switches, the incoming mon faints to its own
 * side's Spikes, and `runVoluntarySwitchAction` walks
 * SpikesOnAttacker -> SpikesOnAttackerFainted -> HandleFaintedMon ->
 * FaintedMonTryChoose.
 */
import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  runStagedVoluntarySwitch,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
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

const STRENGTH = 70;
const TACKLE = 33;
/** include/constants/battle.h:78 -- Factory always sets this bit. */
const BATTLE_TYPE_FACTORY = 1 << 19;
/** include/constants/battle.h -- SIDE_STATUS_SPIKES / its transient damaged guard. */
const SIDE_STATUS_SPIKES = 1 << 4;
/** The banked KO-scenario seed shared by the full-turn fixtures. */
const KO_SCENARIO_RNG_SEED = 919694434;

// --------------------------------------------------------------------------
// Slice 1 -- the opcode-level global write (`battle_script_commands.c:3264`).
// --------------------------------------------------------------------------

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 5,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
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
    item: changes.item ?? 7,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
  });
}

function opcodeContext(
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0 }),
      battler({ side: 1 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    // The three roles are pairwise distinct so a resolver that quietly reads
    // the wrong one cannot pass.
    selectorRoles: { attacker: 0, target: 1, effectBattler: 2, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: TACKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
    ...contextChanges,
  });
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

function findGetexpPc(label: string): number {
  const found = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_GETEXP" && instruction.source.label === label,
  );
  if (!found) throw new Error(`no B_SCR_OP_GETEXP instruction found under label ${label}`);
  return found.programCounter;
}

function stepGetexpAt(pc: number, rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_GiveExp",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return stepBattleScriptMachine(program, patched, execution.handlers);
}

describe("ISSUES #113 -- Cmd_getexp republishes gBattlerFainted from its own selector", () => {
  it.each<readonly [string, string, number]>([
    ["BattleScript_SpikesOnAttackerFainted (getexp BS_ATTACKER)", "BattleScript_SpikesOnAttackerFainted", 0],
    ["BattleScript_GiveExp (getexp BS_TARGET)", "BattleScript_GiveExp", 1],
    ["BattleScript_SpikesOnTargetFainted (getexp BS_TARGET)", "BattleScript_SpikesOnTargetFainted", 1],
  ])("%s: state 0 writes gBattlerFainted before dispatching", (_name, label, expectedBattler) => {
    const result = stepGetexpAt(findGetexpPc(label), opcodeContext({ giveExpState: 0 }));
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.selectorRoles.fainted).toBe(expectedBattler);
    // The rest of state 0 is unchanged: Frontier short-circuit, same pc.
    expect(result.state.rulesContext.giveExpState).toBe(6);
    // The other selector roles are untouched -- this is a distinct global.
    expect(result.state.rulesContext.selectorRoles.attacker).toBe(0);
    expect(result.state.rulesContext.selectorRoles.target).toBe(1);
  });

  it("state 6 republishes it too (source writes the global on every dispatch, not just state 0)", () => {
    const pc = findGetexpPc("BattleScript_SpikesOnAttackerFainted");
    const result = stepGetexpAt(pc, opcodeContext({ giveExpState: 6 }));
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.programCounter).toBe(pc + 1);
    expect(result.state.rulesContext.selectorRoles.fainted).toBe(0);
    // ... and still zeroes the resolved battler's item/ability, not another's.
    expect(result.state.rulesContext.battlers[0]!.item).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.item).toBe(7);
  });

  it("`getexp BS_FAINTED` keeps resolving through the fainted role itself (idempotent republish)", () => {
    const pc = findGetexpPc("BattleScript_SpikesOnFaintedBattlerFainted");
    const result = stepGetexpAt(pc, opcodeContext({
      giveExpState: 0,
      selectorRoles: { attacker: 0, target: 1, effectBattler: 2, fainted: 1 },
    }));
    if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
    expect(result.state.rulesContext.selectorRoles.fainted).toBe(1);
  });
});

// --------------------------------------------------------------------------
// Slice 2 -- the live seam: a voluntary switch whose incoming mon faints to
// its own side's Spikes reaches `openpartyscreen BS_FAINTED`.
// --------------------------------------------------------------------------

/**
 * `switchTurnConfig`'s shape (factoryBattleScriptFullTurnDecision.test.ts),
 * narrowed so the incoming bench mon dies to one Spikes layer:
 * `Cmd_switchineffects` deals `maxHP / ((5 - spikesAmount) * 2)` = 200/8 = 25
 * (`battle_script_commands.c:5241-5245`), and slot 1 enters on 20 HP.
 */
function spikesSwitchConfig(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: KO_SCENARIO_RNG_SEED,
    player: {
      species: 1, moveId: STRENGTH, attack: 80, defense: 200,
      spAttack: 80, spDefense: 200, speed: 200, hp: 300,
    },
    trainer: {
      species: 43, moveId: STRENGTH, attack: 50, defense: 200,
      spAttack: 50, spDefense: 200, speed: 1, hp: 300,
    },
    playerBenchHp: [20, 150],
    playerBenchOverride: [
      {
        species: 23, abilityNum: 0, moves: [TACKLE, 0, 0, 0],
        maxHP: 200, attack: 80, defense: 200, speed: 50,
        spAttack: 40, spDefense: 100,
      },
      {
        species: 27, abilityNum: 0, moves: [TACKLE, 0, 0, 0],
        maxHP: 150, attack: 80, defense: 200, speed: 50,
        spAttack: 40, spDefense: 100,
      },
    ],
  };
}

/** One layer of Spikes on the PLAYER's own side (side 0). */
function withPlayerSpikes(base: BattleScriptRulesContext): BattleScriptRulesContext {
  return Object.freeze({
    ...base,
    sideStatuses: Object.freeze([
      (base.sideStatuses[0] | SIDE_STATUS_SPIKES) >>> 0,
      base.sideStatuses[1],
    ]) as unknown as BattleScriptRulesContext["sideStatuses"],
    sideTimers: Object.freeze([
      Object.freeze({ ...base.sideTimers[0], spikesAmount: 1 }),
      base.sideTimers[1],
    ]) as unknown as BattleScriptRulesContext["sideTimers"],
  });
}

describe("ISSUES #113 -- a voluntary switch-in that faints to Spikes opens the party screen", () => {
  it("reaches openpartyscreen BS_FAINTED and halts on the player's real choice instead of throwing", () => {
    const base = createFactoryFullTurnBattleState(spikesSwitchConfig()).rules.rulesContext;
    const { completed } = runStagedVoluntarySwitch(
      withPlayerSpikes(base), 0, 1, STRENGTH, 0, 1,
    );
    const rc = completed.rulesContext;
    // The incoming mon (party slot 1) took the Spikes hit and fainted.
    expect(rc.party.player[1]!.hp).toBe(0);
    expect(rc.battlers[0]!.hp).toBe(0);
    // Cmd_getexp published gBattlerFainted = gBattlerAttacker = the switcher.
    expect(rc.selectorRoles.fainted).toBe(0);
    // BattleScript_FaintedMonTryChoose's own openpartyscreen halted for a real
    // player pick over the still-alive slots (slot 0 switched out, slot 2 benched).
    expect(program.instructions[completed.programCounter]!.source.label)
      .toBe("BattleScript_FaintedMonTryChoose");
    expect(completed.haltReason).toMatchObject({
      kind: "player-choice-required",
      battler: 0,
      faintedPartyIndex: 1,
      legalPartyIndexes: [0, 2],
    });
  });

  it("full-turn reducer surfaces it as a forced-switch request and resumes into the trainer's move", () => {
    const initial = createFactoryFullTurnBattleState(spikesSwitchConfig());
    const staged = Object.freeze({
      ...initial,
      rules: Object.freeze({
        ...initial.rules,
        rulesContext: withPlayerSpikes(initial.rules.rulesContext),
      }),
    }) as typeof initial;

    const afterPlayer = submitFactoryFullTurnDecision(staged, {
      requestId: 1,
      side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command request");
    const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    if (afterTrainer.kind !== "decision-required") throw new Error("expected forced-switch request");
    expect(afterTrainer.nextRequest).toMatchObject({
      kind: "forced-switch",
      side: "player",
      battler: 0,
      faintedPartyIndex: 1,
      legalPartyIndexes: [0, 2],
    });
    expect(afterTrainer.state.rules.phase).toBe("forced-switch-pending");

    const resumed = submitFactoryFullTurnDecision(afterTrainer.state, {
      requestId: afterTrainer.nextRequest.requestId,
      side: "player",
      decision: { kind: "switch", partyIndex: 2 },
    });
    if (resumed.kind !== "decision-required") throw new Error("expected the turn to continue");
    const rc = resumed.state.rules.rulesContext;
    // The replacement is out and the trainer's banked move landed on it.
    expect(rc.battlers[0]).toMatchObject({ species: 27, partyIndex: 2 });
    expect(rc.battlers[0]!.hp).toBeLessThan(150);
    expect(rc.party.player[1]!.hp).toBe(0);
  });
});
