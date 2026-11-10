import { describe, expect, it } from "vitest";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import { chooseFactoryAiScoredDecision } from "../src/engine/factoryAiDecisionPolicy.ts";
import {
  countUsablePartyMons,
  createFactoryAiBattleHistory,
  createFactoryAiViewFromLiveRules,
} from "../src/engine/factoryAiLiveDriver.ts";

// ISSUES #203: the live AI view must fill usablePartyMons per side exactly as
// Cmd_count_usable_party_mons (battle_ai_script_commands.c:1292-1334) counts it.

const TACKLE = 33;
const ROAR = 46;
const EXPLOSION = 153;
const BATON_PASS = 226;
const MEMENTO = 262;
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);

function battler(side: 0 | 1, species: number, moves: readonly [number, number, number, number], partyIndex = 0): BattleScriptRulesBattler {
  return {
    side,
    species,
    ability: 0,
    moves,
    types: ["TYPE_GROUND", "TYPE_GROUND"],
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    hp: 135,
    maxHP: 135,
    pp: [10, 10, 10, 10],
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    partyIndex,
  };
}

const alive = (species: number, hp = 100): BattleScriptPartyMemberInput => ({ species, hp, maxHP: 100 });

function rules(input: Readonly<{
  moves: readonly [number, number, number, number];
  player: readonly BattleScriptPartyMemberInput[];
  opponent: readonly BattleScriptPartyMemberInput[];
  playerIndex?: number;
  opponentIndex?: number;
}>): BattleScriptRulesContext {
  const empty = battler(0, 0, [0, 0, 0, 0]);
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, 105, [TACKLE, 0, 0, 0], input.playerIndex ?? 0),
      battler(1, 105, input.moves, input.opponentIndex ?? 0),
      empty,
      { ...empty, side: 1 },
    ],
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
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    moveHistory: {
      lastMoves: [0, 0, 0, 0],
      lastLandedMoves: [0, 0, 0, 0],
      lastHitBy: [0xff, 0xff, 0xff, 0xff],
    },
    party: {
      player: [...input.player, ...new Array(6 - input.player.length).fill({})],
      opponent: [...input.opponent, ...new Array(6 - input.opponent.length).fill({})],
    },
  });
}

function view(context: BattleScriptRulesContext) {
  return createFactoryAiViewFromLiveRules({
    rulesContext: context,
    history: createFactoryAiBattleHistory(context),
    challenge: { factoryWinStreak: 28, trainerOpponentId: 222 },
  });
}

const request = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: ([0, 1, 2, 3] as const).map((moveSlot) => ({
    kind: "use-move" as const,
    moveSlot,
    targetBattler: 0 as const,
  })),
});

function cbmDelta(context: BattleScriptRulesContext, moveSlot: 0 | 1 | 2 | 3 = 0): number | null {
  const choice = chooseFactoryAiScoredDecision({
    view: view(context),
    request,
    rng: { value: 0x1234, calls: 0 } as never,
  });
  return choice.trace.slotScores[moveSlot]!.checkBadMoveDelta;
}

const trio = [alive(1), alive(2), alive(3)];

describe("countUsablePartyMons (Cmd_count_usable_party_mons)", () => {
  const mk = (members: readonly BattleScriptPartyMemberInput[]) =>
    rules({ moves: [TACKLE, TACKLE, TACKLE, TACKLE], player: members, opponent: members }).party.player;

  it("skips the active slot, fainted, empty and egg members", () => {
    expect(countUsablePartyMons(mk([alive(1), alive(2), alive(3)]), 0)).toBe(2);
    expect(countUsablePartyMons(mk([alive(1), alive(2), alive(3)]), 2)).toBe(2);
    expect(countUsablePartyMons(mk([alive(1), alive(2, 0), alive(3)]), 0)).toBe(1);
    expect(countUsablePartyMons(mk([alive(1), {}, {}]), 0)).toBe(0);
    expect(countUsablePartyMons(mk([alive(1), { ...alive(2), isEgg: true }, alive(3)]), 0)).toBe(1);
    expect(countUsablePartyMons(mk([alive(1), alive(2), alive(3)]), 4)).toBe(3);
  });
});

describe("live AI view fills usablePartyMons per side", () => {
  it("AI side counts party.opponent, target side party.player, each excluding its own active index", () => {
    const context = rules({
      moves: [TACKLE, TACKLE, TACKLE, TACKLE],
      player: [alive(1), alive(2), alive(3, 0)],
      opponent: [alive(1), alive(2), alive(3)],
      playerIndex: 1,
      opponentIndex: 2,
    });
    const v = view(context);
    expect(v.attacker.usablePartyMons).toBe(2);
    expect(v.target.usablePartyMons).toBe(1);
  });
});

describe("CHECK_BAD_MOVE gates now see the live counts", () => {
  it("Baton Pass: -10 only with no usable bench mon", () => {
    const moves = [BATON_PASS, TACKLE, TACKLE, TACKLE] as const;
    expect(cbmDelta(rules({ moves, player: trio, opponent: trio }))).toBe(0);
    expect(cbmDelta(rules({ moves, player: trio, opponent: [alive(1), alive(2, 0), {}] }))).toBe(-10);
    expect(cbmDelta(rules({ moves, player: trio, opponent: [alive(1)] }))).toBe(-10);
  });

  it("Memento falls through into the same AI_USER gate", () => {
    const moves = [MEMENTO, TACKLE, TACKLE, TACKLE] as const;
    expect(cbmDelta(rules({ moves, player: trio, opponent: trio }))).toBe(0);
    expect(cbmDelta(rules({ moves, player: trio, opponent: [alive(1)] }))).toBe(-10);
  });

  it("Explosion: 0 with an AI bench, -10 / -1 with none depending on the target bench", () => {
    const moves = [EXPLOSION, TACKLE, TACKLE, TACKLE] as const;
    expect(cbmDelta(rules({ moves, player: trio, opponent: trio }))).toBe(0);
    expect(cbmDelta(rules({ moves, player: trio, opponent: [alive(1)] }))).toBe(-10);
    expect(cbmDelta(rules({ moves, player: [alive(1)], opponent: [alive(1)] }))).toBe(-1);
  });

  it("Roar reads the target side: -10 only when the player has no usable bench mon", () => {
    const moves = [ROAR, TACKLE, TACKLE, TACKLE] as const;
    expect(cbmDelta(rules({ moves, player: [alive(1), alive(2), alive(3, 0)], opponent: [alive(1)] }))).not.toBe(-10);
    expect(cbmDelta(rules({ moves, player: [alive(1), alive(2, 0), alive(3, 0)], opponent: trio }))).toBe(-10);
  });
});
