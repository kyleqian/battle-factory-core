import { describe, expect, it } from "vitest";
import blockedFixture from "../tools/battle-lab/gate6-r10-attract-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/gate6-r10-attract-control-off.json" with { type: "json" };
import perishSongFixture from "../tools/battle-lab/gate6-r10-perish-song-off.json" with { type: "json" };
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const ATTRACT = 213;
const LICKITUNG = 108;
const GARDEVOIR = 394;
const ABILITY_OBLIVIOUS = 12;
const ABILITY_OWN_TEMPO = 20;
const MALE_PERSONALITY = 200;
const FEMALE_PERSONALITY = 0;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([ATTRACT, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([15, 0, 0, 0]),
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
    species: changes.species ?? LICKITUNG,
    personality: changes.personality ?? MALE_PERSONALITY,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function context(targetAbility: number) {
  return createBattleScriptRulesContext({
    battlers: [
      battler({
        side: 0,
        species: LICKITUNG,
        personality: MALE_PERSONALITY,
        ability: targetAbility,
      }),
      battler({
        side: 1,
        species: GARDEVOIR,
        personality: FEMALE_PERSONALITY,
        ability: 28,
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 1, target: 0, effectBattler: 1, fainted: null },
    scriptingBattler: 1,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: ATTRACT,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
            kind: "message" as const,
            messageId: operand.expression,
            substitutions: Object.freeze([]),
          })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => 1,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG"
        || operand.expression === "B_WAIT_TIME_SHORT"
        ? 1
        : null,
    resolveByteOperand: () => null,
  });
}

function acknowledgeAll(
  state: BattleScriptMachineState<ReturnType<typeof context>>,
) {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

function runAttract(targetAbility: number) {
  const external = ports();
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectAttract",
    context(targetAbility),
    1,
    external,
  );
  let result = stepBattleScriptMachine(
    program,
    execution.state,
    execution.handlers,
  );
  for (let step = 1; step < 100; step += 1) {
    if (
      result.kind !== "advanced"
      && result.kind !== "scheduler-progressed"
      && result.kind !== "blocked"
    ) {
      return result;
    }
    result = stepBattleScriptMachine(
      program,
      result.kind === "blocked" ? acknowledgeAll(result.state) : result.state,
      execution.handlers,
    );
  }
  throw new Error("Attract script exceeded step budget");
}

describe("Gate-6 R10 volatile rejection through Oblivious", () => {
  it("uses complete same-species, opposite-gender fixtures whose only target-side mechanic difference is Lickitung's legal ability slot", () => {
    for (const fixture of [blockedFixture, controlFixture]) {
      expect(fixture.profile).toBe("battle-scene-off");
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      expect(fixture.overrides.parties.player[0]).toMatchObject({
        species: LICKITUNG,
        gender: "male",
        moves: [45, 45, 45, 45],
      });
      expect(fixture.overrides.parties.opponent[0]).toMatchObject({
        species: GARDEVOIR,
        gender: "female",
        moves: [ATTRACT, ATTRACT, ATTRACT, ATTRACT],
      });
      for (const mon of [
        ...fixture.overrides.parties.player,
        ...fixture.overrides.parties.opponent,
      ]) {
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
    expect(blockedFixture.overrides.parties.player[0]?.abilitySlot).toBe(1);
    expect(controlFixture.overrides.parties.player[0]?.abilitySlot).toBe(0);
  });

  it("prints Oblivious's romance-specific rejection and leaves the compatible target uninfatuated", () => {
    const result = runAttract(ABILITY_OBLIVIOUS);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error(`expected halted, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0].status2).toBe(0);
    expect(result.state.rulesContext.battlers[1].pp[0]).toBe(14);
    expect(result.state.rng.calls).toBe(1);
    const messages = result.state.events.flatMap((event) =>
      event.kind === "message" ? [event.messageId] : []
    );
    expect(messages).toContain("STRINGID_PKMNPREVENTSROMANCEWITH");
    expect(messages).not.toContain("STRINGID_BUTITFAILED");
    expect(messages).not.toContain("STRINGID_PKMNFELLINLOVE");
  });

  it("the Own Tempo control is affected because genders are compatible, setting exactly the opponent-source infatuation bit", () => {
    const result = runAttract(ABILITY_OWN_TEMPO);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error(`expected halted, got ${result.kind}`);
    expect(result.state.rulesContext.battlers[0].status2).toBe(1 << (16 + 1));
    expect(result.state.rulesContext.battlers[1].pp[0]).toBe(14);
    expect(result.state.rng.calls).toBe(1);
    const messages = result.state.events.flatMap((event) =>
      event.kind === "message" ? [event.messageId] : []
    );
    expect(messages).toContain("STRINGID_PKMNFELLINLOVE");
    expect(messages).not.toContain("STRINGID_PKMNPREVENTSROMANCEWITH");
  });

  it("stages the source-pinned Soundproof partial-immunity case as a complete-party OFF fixture", () => {
    expect(perishSongFixture.profile).toBe("battle-scene-off");
    expect(perishSongFixture.overrides.parties.player).toHaveLength(3);
    expect(perishSongFixture.overrides.parties.opponent).toHaveLength(3);
    expect(perishSongFixture.overrides.parties.player[0]).toMatchObject({
      species: 372,
      abilitySlot: 0,
      moves: [45, 45, 45, 45],
    });
    expect(perishSongFixture.overrides.parties.opponent[0]).toMatchObject({
      species: 131,
      moves: [195, 195, 195, 195],
    });
  });
});
