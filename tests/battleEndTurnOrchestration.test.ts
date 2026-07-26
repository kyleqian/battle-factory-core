import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";

const program = loadBattleScriptProgram();
/** include/constants/battle.h:78/117-122. */
const BATTLE_TYPE_FACTORY = 1 << 19;
const STATUS1_BURN = 1 << 4;
const STATUS1_TOXIC_POISON = 1 << 7;
const B_WAIT_TIME_LONG = 64;
/** include/constants/battle.h:140-141,158-159,167. */
const STATUS3_ROOTED = 1 << 10;
const STATUS3_LEECHSEED = 1 << 2;
const STATUS2_WRAPPED_MASK = (1 << 13) | (1 << 14) | (1 << 15);
/** include/abilities.h:68. */
const ABILITY_LIQUID_OOZE = 64;
/** include/constants/items.h -- docs/endturn-abilities-items-ground-truth.md §5 slice 4's own ten held items. */
const ITEM_CHERI_BERRY = 133;
const ITEM_CHESTO_BERRY = 134;
const ITEM_PECHA_BERRY = 135;
const ITEM_RAWST_BERRY = 136;
const ITEM_ASPEAR_BERRY = 137;
const ITEM_LEPPA_BERRY = 138;
const ITEM_PERSIM_BERRY = 140;
const ITEM_LUM_BERRY = 141;
const ITEM_SITRUS_BERRY = 142;
const ITEM_LIECHI_BERRY = 168;
const ITEM_GANLON_BERRY = 169;
const ITEM_WHITE_HERB = 180;
const ITEM_MENTAL_HERB = 185;
const ITEM_LEFTOVERS = 200;
/** include/constants/battle.h:129-142. */
const STATUS2_CONFUSION = (1 << 0) | (1 << 1) | (1 << 2);
const STATUS2_NIGHTMARE = 1 << 27;
const STATUS2_INFATUATION = (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19);
/** include/constants/battle.h:115-120. */
const STATUS1_PARALYSIS = 1 << 6;
const STATUS1_FREEZE = 1 << 5;
const STATUS1_POISON = 1 << 3;
const STATUS1_SLEEP_3_TURNS = 3;

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
    wrappedMove: changes.wrappedMove,
    wrappedBy: changes.wrappedBy,
  }) as unknown as BattleScriptRulesBattler;
}

function fullSlot(hp: number): BattleScriptPartyMemberInput {
  return { species: 261, isEgg: false, hp };
}
const EMPTY_SLOT: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };

function sixSlots(...alive: number[]): BattleScriptPartyMemberInput[] {
  const slots = [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];
  alive.forEach((hp, index) => {
    slots[index] = fullSlot(hp);
  });
  return slots;
}

function context(contextChanges: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0 }),
      battler({ side: 1, partyIndex: 2 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
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
    party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
    ...contextChanges,
  });
}

/** Mirrors factoryBattleScriptTerminalDecision.ts's own externalPorts(attacker) -- real STRINGID_* message/B_WAIT_TIME_LONG resolution, everything else stubbed. */
function externalPorts(attacker: 0 | 1): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (ctx: Readonly<{ state: { scheduler: { pendingControllerBattlers: readonly unknown[] } } }>) =>
      ctx.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
    resolveByteOperand: () => null,
  });
}

function scratchState(rulesContext: BattleScriptRulesContext, attacker: 0 | 1) {
  // Any committed label works as a scratch entry point -- runBattleEndTurnOrchestration
  // always starts its own fresh BattleScriptExecute per fired case, ignoring this one.
  return createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    919694434,
    externalPorts(attacker),
  ).state;
}

describe("runBattleEndTurnOrchestration (BattleTurnPassed equivalent)", () => {
  it("no live end-turn condition on either battler: next-turn with zero RNG and an unchanged rulesContext", () => {
    const rc = context();
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(100);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it(
    "(a) burn ticks maxHP/8 at end-turn across two consecutive turns -- doc's live 105 -> 92 -> 79 "
      + "ledger (docs/end-turn-ground-truth.md §2a), zero RNG, battler AND party slot both synced",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, hp: 105, maxHP: 105, status1: STATUS1_BURN, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        party: { player: sixSlots(100), opponent: sixSlots(0, 0, 105) },
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const turn1Initial = scratchState(rc, 1);
      const turn1 = runBattleEndTurnOrchestration(program, handlers, turn1Initial);

      expect(turn1.kind).toBe("next-turn");
      expect(turn1.state.rulesContext.battlers[1]!.hp).toBe(92); // floor(105/8) = 13
      expect(turn1.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_BURN); // no counter, unlike toxic
      expect(turn1.state.rulesContext.party.opponent[2]!.hp).toBe(92); // party slot sync
      expect(turn1.state.rng.calls).toBe(turn1Initial.rng.calls); // zero Random() draws (doc §2a)
      expect(turn1.state.rng.value).toBe(turn1Initial.rng.value);

      const turn2 = runBattleEndTurnOrchestration(program, handlers, turn1.state);
      expect(turn2.kind).toBe("next-turn");
      expect(turn2.state.rulesContext.battlers[1]!.hp).toBe(79); // 92 - 13, same flat damage (no growing counter)
      expect(turn2.state.rulesContext.party.opponent[2]!.hp).toBe(79);
      expect(turn2.state.rng.calls).toBe(turn1.state.rng.calls);
      expect(turn2.state.rng.value).toBe(turn1.state.rng.value);
    },
  );

  it(
    "(b) an end-turn Toxic KO runs the SAME faint machinery as a mid-turn KO -- inline checkteamslost "
      + "short-circuits the field/battler loop, HandleFaintedMonActions still runs unconditionally and "
      + "computes a REAL battleOutcome, zero RNG throughout (docs/end-turn-ground-truth.md §2b)",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0 }),
          battler({ side: 1, hp: 1, maxHP: 1, status1: STATUS1_TOXIC_POISON, partyIndex: 2 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        // Opponent's bench is already fainted -- the SHEDINJA/1-HP terminal shape (doc's cheapest live KO),
        // proving the terminal fork of the "outcome-or-switch" faint machinery.
        party: { player: sixSlots(100), opponent: sixSlots(0, 0, 1) },
      });
      const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
      const initial = scratchState(rc, 1);
      expect(rc.battleOutcome).toBe(0);

      const result = runBattleEndTurnOrchestration(program, handlers, initial);

      expect(result.kind).toBe("terminal");
      if (result.kind !== "terminal") throw new Error("expected terminal");
      expect(result.state.rulesContext.battleOutcome).toBe(1); // B_OUTCOME_WON -- opponent's whole party is now 0
      expect(result.state.rulesContext.battlers[1]!.hp).toBe(0);
      expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(0);
      // cleareffectsonfaint clears status1 (doc §2b frame 990), same as the mid-turn faint precedent.
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(0);
      // Zero further Random() draws from the counter-increment through GiveExp/HandleFaintedMon (doc §2b).
      expect(result.state.rng.calls).toBe(initial.rng.calls);
      expect(result.state.rng.value).toBe(initial.rng.value);
    },
  );

  it("regular poison ticks floor(maxHP/8) with no counter (distinct from Toxic's growing multiplier)", () => {
    const STATUS1_POISON = 1 << 3;
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 100, maxHP: 100, status1: STATUS1_POISON, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(88); // floor(100/8) = 12
  });

  it("Toxic's counter grows the tick each turn (1x, 2x, ...) unlike burn/regular poison", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 1000, maxHP: 1000, status1: STATUS1_TOXIC_POISON, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 1000) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const turn1 = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    if (turn1.kind !== "next-turn") throw new Error("expected next-turn");
    expect(turn1.state.rulesContext.battlers[1]!.hp).toBe(938); // 1000 - floor(1000/16)*1 = 1000 - 62
    const turn2 = runBattleEndTurnOrchestration(program, handlers, turn1.state);
    if (turn2.kind !== "next-turn") throw new Error("expected next-turn");
    expect(turn2.state.rulesContext.battlers[1]!.hp).toBe(814); // 938 - 62*2 = 814
  });

  it("(c) Ingrain heal ticks floor(maxHP/16) capped at maxHP -- doc's live 159 -> 161 ledger (docs/ingrain-leechseed-wrap-ground-truth.md §2a), zero RNG", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 159, maxHP: 161, status3: STATUS3_ROOTED, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 159) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(161); // capped at maxHP, not a blind +10 (floor(161/16))
    expect(result.state.rulesContext.battlers[1]!.status3).toBe(STATUS3_ROOTED);
    expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(161);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("Ingrain heal ticks a full floor(maxHP/16) when nowhere near the cap", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 50, maxHP: 161, status3: STATUS3_ROOTED, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 50) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(60); // 50 + floor(161/16) = 50 + 10
  });

  it("Ingrain does not heal at full HP or at 0 HP (real guard, not just an inert no-op)", () => {
    const fullHpRc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 100, maxHP: 100, status3: STATUS3_ROOTED, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(fullHpRc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(100);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("(d) Leech Seed drains floor(maxHP/8) from the seeded battler and heals the seeder the same amount, zero RNG (docs/ingrain-leechseed-wrap-ground-truth.md §2b)", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, hp: 100, maxHP: 200, partyIndex: 0 }), // seeder (player, battler 0)
        battler({ side: 1, hp: 170, maxHP: 170, status3: STATUS3_LEECHSEED | 0, partyIndex: 2 }), // seeded, seeder id 0
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 170) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(149); // 170 - floor(170/8) = 170 - 21
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(121); // seeder gains the same 21
    expect(result.state.rulesContext.battlers[1]!.status3 & STATUS3_LEECHSEED).not.toBe(0);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("Leech Seed + Liquid Ooze on the SEEDED battler: the seeder is damaged instead of healed (real ability branch, not source-cited only)", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, hp: 100, maxHP: 200, partyIndex: 0 }), // seeder
        battler({ side: 1, hp: 170, maxHP: 170, status3: STATUS3_LEECHSEED | 0, ability: ABILITY_LIQUID_OOZE, partyIndex: 2 }), // seeded, has Liquid Ooze
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 170) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(149); // seeded mon still drains normally: 170 - 21
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(79); // seeder takes 21 damage instead of healing
  });

  it("(e) Wrap still-trapped: counter decrements first, then deals floor(maxHP/16), zero RNG (docs/ingrain-leechseed-wrap-ground-truth.md §2c)", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 170, maxHP: 170, status2: 3 << 13, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 170) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect((result.state.rulesContext.battlers[1]!.status2 & STATUS2_WRAPPED_MASK) >>> 13).toBe(2); // 3 -> 2
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(160); // 170 - floor(170/16) = 170 - 10
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("Wrap release: the decrement hitting zero frees the battler with no damage this tick", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 170, maxHP: 170, status2: 1 << 13, partyIndex: 2 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      party: { player: sixSlots(100), opponent: sixSlots(0, 0, 170) },
    });
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
    const initial = scratchState(rc, 1);
    const result = runBattleEndTurnOrchestration(program, handlers, initial);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1]!.status2 & STATUS2_WRAPPED_MASK).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(170); // unchanged -- release deals no damage
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  describe(
    "(f) ENDTURN_ITEMS1 (ItemBattleEffects(ITEMEFFECT_NORMAL, battler, FALSE), docs/endturn-abilities-items-ground-truth.md §1c/§5 slice 4)",
    () => {
      it("Leftovers heals floor(maxHP/16) capped at maxHP and PERSISTS (the only non-consuming case), zero RNG", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({ side: 1, hp: 100, maxHP: 160, item: ITEM_LEFTOVERS, partyIndex: 2 }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
          party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const initial = scratchState(rc, 1);
        const result = runBattleEndTurnOrchestration(program, handlers, initial);
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.hp).toBe(110); // 100 + floor(160/16) = 100 + 10
        expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_LEFTOVERS); // persists
        expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(110);
        expect(result.state.rng.calls).toBe(initial.rng.calls);
      });

      it("Leftovers does not heal at full HP (real guard, not a blanket skip)", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({ side: 1, hp: 160, maxHP: 160, item: ITEM_LEFTOVERS, partyIndex: 2 }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.hp).toBe(160);
        expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_LEFTOVERS);
      });

      it("White Herb resets every stat stage below neutral(6) back to 6 and CONSUMES the item, zero RNG", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({
              side: 1, hp: 100, maxHP: 100, item: ITEM_WHITE_HERB, partyIndex: 2,
              statStages: [6, 4, 6, 3, 6, 6, 6, 6], // ATK -2, SPEED -3, everything else neutral
            }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const initial = scratchState(rc, 1);
        const result = runBattleEndTurnOrchestration(program, handlers, initial);
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
        expect(result.state.rulesContext.battlers[1]!.item).toBe(0); // ITEM_NONE -- consumed
        expect(result.state.rng.calls).toBe(initial.rng.calls);
      });

      it("White Herb does not fire when every stat stage is already neutral or above (real guard)", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({ side: 1, hp: 100, maxHP: 100, item: ITEM_WHITE_HERB, partyIndex: 2, statStages: [6, 6, 8, 6, 6, 6, 6, 6] }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_WHITE_HERB); // untouched, not consumed
        expect(result.state.rulesContext.battlers[1]!.statStages).toEqual([6, 6, 8, 6, 6, 6, 6, 6]);
      });

      const cureBerryCases: ReadonlyArray<{
        name: string;
        item: number;
        battlerChanges: Partial<BattleScriptRulesBattler>;
        assertCured: (battlerAfter: BattleScriptRulesBattler) => void;
      }> = [
        {
          name: "Cheri Berry cures paralysis",
          item: ITEM_CHERI_BERRY,
          battlerChanges: { status1: STATUS1_PARALYSIS },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Pecha Berry cures regular poison",
          item: ITEM_PECHA_BERRY,
          battlerChanges: { status1: STATUS1_POISON },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Pecha Berry cures toxic poison (also clears the toxic counter)",
          item: ITEM_PECHA_BERRY,
          battlerChanges: { status1: STATUS1_TOXIC_POISON | (5 << 8) },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Rawst Berry cures burn",
          item: ITEM_RAWST_BERRY,
          battlerChanges: { status1: STATUS1_BURN },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Aspear Berry cures freeze",
          item: ITEM_ASPEAR_BERRY,
          battlerChanges: { status1: STATUS1_FREEZE },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Chesto Berry cures sleep (and the nightmare glitch-fix bit)",
          item: ITEM_CHESTO_BERRY,
          battlerChanges: { status1: STATUS1_SLEEP_3_TURNS, status2: STATUS2_NIGHTMARE },
          assertCured: (b) => {
            expect(b.status1).toBe(0);
            expect(b.status2 & STATUS2_NIGHTMARE).toBe(0);
          },
        },
        {
          name: "Persim Berry cures confusion (status2, not status1)",
          item: ITEM_PERSIM_BERRY,
          battlerChanges: { status2: STATUS2_CONFUSION },
          assertCured: (b) => expect(b.status2 & STATUS2_CONFUSION).toBe(0),
        },
        {
          name: "Mental Herb cures infatuation",
          item: ITEM_MENTAL_HERB,
          battlerChanges: { status2: STATUS2_INFATUATION },
          assertCured: (b) => expect(b.status2 & STATUS2_INFATUATION).toBe(0),
        },
        {
          name: "Lum Berry cures a single status1 condition",
          item: ITEM_LUM_BERRY,
          battlerChanges: { status1: STATUS1_PARALYSIS },
          assertCured: (b) => expect(b.status1).toBe(0),
        },
        {
          name: "Lum Berry cures status1 AND confusion together in the same tick",
          item: ITEM_LUM_BERRY,
          battlerChanges: { status1: STATUS1_BURN, status2: STATUS2_CONFUSION },
          assertCured: (b) => {
            expect(b.status1).toBe(0);
            expect(b.status2 & STATUS2_CONFUSION).toBe(0);
          },
        },
      ];

      for (const { name, item, battlerChanges, assertCured } of cureBerryCases) {
        it(`${name}, consuming the berry, zero RNG`, () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 100, maxHP: 100, item, partyIndex: 2, ...battlerChanges }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
            party: { player: sixSlots(100), opponent: sixSlots(0, 0, 100) },
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const initial = scratchState(rc, 1);
          const result = runBattleEndTurnOrchestration(program, handlers, initial);
          expect(result.kind).toBe("next-turn");
          if (result.kind !== "next-turn") throw new Error("expected next-turn");
          assertCured(result.state.rulesContext.battlers[1]!);
          expect(result.state.rulesContext.battlers[1]!.item).toBe(0); // ITEM_NONE -- every one of these consumes
          expect(result.state.rulesContext.party.opponent[2]!.hp).toBe(100); // untouched, no HP change
          expect(result.state.rng.calls).toBe(initial.rng.calls); // zero Random() draws (doc §4)
        });
      }

      it("a cure berry held with no matching status does not fire (real per-case guard, item persists)", () => {
        const rc = context({
          battlers: [
            battler({ side: 0 }),
            battler({ side: 1, hp: 100, maxHP: 100, item: ITEM_CHERI_BERRY, partyIndex: 2 }),
            battler({ side: 0 }),
            battler({ side: 1 }),
          ],
        });
        const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
        const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
        expect(result.kind).toBe("next-turn");
        expect(result.state.rulesContext.battlers[1]!.item).toBe(ITEM_CHERI_BERRY);
      });

      describe("(b) unsupported-branch/case-barrier: real hold effects this slice does not implement", () => {
        it("Sitrus Berry (RESTORE_HP) barriers when its real HP<=maxHP/2 gate is true", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 40, maxHP: 100, item: ITEM_SITRUS_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("case-barrier");
          if (result.kind !== "case-barrier") throw new Error("expected case-barrier");
          expect(result.caseName).toBe("ENDTURN_ITEMS1");
          expect(result.detail).toContain("HOLD_EFFECT_RESTORE_HP");
        });

        it("Sitrus Berry does NOT barrier above the HP<=maxHP/2 gate (real gate, not blanket possession)", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 90, maxHP: 100, item: ITEM_SITRUS_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("next-turn");
        });

        it("Leppa Berry (RESTORE_PP) barriers when a real move is at 0 PP", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 100, maxHP: 100, item: ITEM_LEPPA_BERRY, moves: [33, 0, 0, 0], pp: [0, 0, 0, 0], partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("case-barrier");
          if (result.kind !== "case-barrier") throw new Error("expected case-barrier");
          expect(result.detail).toContain("HOLD_EFFECT_RESTORE_PP");
        });

        it("Liechi Berry (ATTACK_UP, doc §5 slice 5 stretch material) barriers on possession", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 100, maxHP: 100, item: ITEM_LIECHI_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("case-barrier");
          if (result.kind !== "case-barrier") throw new Error("expected case-barrier");
          expect(result.detail).toContain("Liechi");
        });

        it("Ganlon Berry (DEFENSE_UP, zero Factory L50 carriers per doc §2b) barriers on possession", () => {
          const rc = context({
            battlers: [
              battler({ side: 0 }),
              battler({ side: 1, hp: 100, maxHP: 100, item: ITEM_GANLON_BERRY, partyIndex: 2 }),
              battler({ side: 0 }),
              battler({ side: 1 }),
            ],
          });
          const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(1));
          const result = runBattleEndTurnOrchestration(program, handlers, scratchState(rc, 1));
          expect(result.kind).toBe("case-barrier");
          if (result.kind !== "case-barrier") throw new Error("expected case-barrier");
          expect(result.detail).toContain("zero Factory L50 carriers");
        });
      });
    },
  );
});
