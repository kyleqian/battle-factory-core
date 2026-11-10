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
  createFactoryAiBattleHistory,
  createFactoryAiViewFromLiveRules,
  partyHasStatusEqualToAny,
  syncFactoryAiBattleHistory,
} from "../src/engine/factoryAiLiveDriver.ts";

// ISSUES #204: the live AI view must fill the formerly-unset optional fields from live rulesContext
// exactly as the AI script commands read them (battle_ai_script_commands.c). Expected values are
// computed by hand from the fixtures below, not by calling the code under test.

const TACKLE = 33;
const DISABLE = 50;
const MIST = 54;
const ATTRACT = 213;
const HEAL_BELL = 215;
const ENCORE = 227;
const STOCKPILE = 254;
const SWALLOW = 256;
const FACADE = 263;
const SMELLING_SALT = 265;
const RECYCLE = 278;
const BRICK_BREAK = 280;
const IMPRISON = 286;
const MUD_SPORT = 300;
const WATER_SPORT = 346;

// species-stats.json genderRatio: Pikachu 127, Hitmonlee 0 (always male), Chansey 254 (always female), Magnemite 255.
const PIKACHU = 25;
const MAGNEMITE = 81;
const HITMONLEE = 106;
const CHANSEY = 113;
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);

const STATUS1_POISON = 1 << 3;
const STATUS1_BURN = 1 << 4;
const STATUS1_PARALYSIS = 1 << 6;
const STATUS1_TOXIC = 1 << 7;
const STATUS1_ANY = 0xff;
const STATUS3_IMPRISONED_OTHERS = 1 << 13;
const STATUS3_MUDSPORT = 1 << 16;
const STATUS3_WATERSPORT = 1 << 17;
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_MIST = 1 << 8;

type BattlerOverrides = Partial<BattleScriptRulesBattler> & Readonly<{
  item?: number;
  personality?: number;
  stockpileCounter?: number;
  encoredMove?: number;
}>;

function battler(side: 0 | 1, species: number, moves: readonly [number, number, number, number], extra: BattlerOverrides = {}): BattleScriptRulesBattler {
  return {
    side,
    species,
    ability: 0,
    moves,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
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
    partyIndex: 0,
    ...extra,
  } as BattleScriptRulesBattler;
}

const alive = (species: number, status1 = 0, hp = 100): BattleScriptPartyMemberInput => ({ species, hp, maxHP: 100, status1 });

function rules(input: Readonly<{
  moves?: readonly [number, number, number, number];
  user?: BattlerOverrides & { species?: number };
  target?: BattlerOverrides & { species?: number };
  player?: readonly BattleScriptPartyMemberInput[];
  sideStatuses?: readonly [number, number];
  usedHeldItems?: readonly number[];
  aiObservedItemEffects?: readonly number[];
}> = {}): BattleScriptRulesContext {
  const empty = battler(0, 0, [0, 0, 0, 0]);
  const { species: userSpecies = PIKACHU, ...userExtra } = input.user ?? {};
  const { species: targetSpecies = PIKACHU, ...targetExtra } = input.target ?? {};
  const player = input.player ?? [alive(1), alive(2), alive(3)];
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, targetSpecies, [TACKLE, 0, 0, 0], targetExtra),
      battler(1, userSpecies, input.moves ?? [TACKLE, TACKLE, TACKLE, TACKLE], userExtra),
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
      player: [...player, ...new Array(6 - player.length).fill({})],
      opponent: [alive(1), alive(2), alive(3), ...new Array(3).fill({})],
    },
    ...(input.sideStatuses === undefined ? {} : { sideStatuses: input.sideStatuses }),
    ...(input.usedHeldItems === undefined ? {} : { usedHeldItems: input.usedHeldItems }),
    ...(input.aiObservedItemEffects === undefined ? {} : { aiObservedItemEffects: input.aiObservedItemEffects }),
  } as never);
}

function view(context: BattleScriptRulesContext) {
  const history = syncFactoryAiBattleHistory(createFactoryAiBattleHistory(context), context);
  return createFactoryAiViewFromLiveRules({
    rulesContext: context,
    history,
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

function slot(context: BattleScriptRulesContext, which: "checkBadMoveDelta" | "checkViabilityDelta"): number | null {
  const choice = chooseFactoryAiScoredDecision({
    view: view(context),
    request,
    rng: { value: 0x1234, calls: 0 } as never,
  });
  return choice.trace.slotScores[0]![which];
}

const cbm = (context: BattleScriptRulesContext) => slot(context, "checkBadMoveDelta");
const cv = (context: BattleScriptRulesContext) => slot(context, "checkViabilityDelta");
const withMove = (move: number) => [move, TACKLE, TACKLE, TACKLE] as const;

describe("rank 1: gender (Cmd_get_gender, GetGenderFromSpeciesAndPersonality)", () => {
  it("fills user and target from species genderRatio and personality & 0xff", () => {
    // ratio 127: personality low byte 126 < 127 -> female; 127 -> male (ratio > low byte is female).
    const v = view(rules({
      user: { species: PIKACHU, personality: 0x1234_567e },
      target: { species: PIKACHU, personality: 0x1234_567f },
    }));
    expect(v.attacker.gender).toBe("MON_FEMALE");
    expect(v.target.gender).toBe("MON_MALE");
  });

  it("fixed-gender and genderless species ignore personality", () => {
    const v = view(rules({
      user: { species: HITMONLEE, personality: 0xff },
      target: { species: CHANSEY, personality: 0 },
    }));
    expect(v.attacker.gender).toBe("MON_MALE");
    expect(v.target.gender).toBe("MON_FEMALE");
    expect(view(rules({ user: { species: MAGNEMITE }, target: { species: MAGNEMITE } })).attacker.gender).toBe("MON_GENDERLESS");
  });

  it("AI_CBM_Attract: male user vs female target is not penalised, same-sex and genderless are -10", () => {
    const moves = withMove(ATTRACT);
    expect(cbm(rules({ moves, user: { species: HITMONLEE }, target: { species: CHANSEY } }))).toBe(0);
    expect(cbm(rules({ moves, user: { species: HITMONLEE }, target: { species: HITMONLEE } }))).toBe(-10);
    expect(cbm(rules({ moves, user: { species: MAGNEMITE }, target: { species: CHANSEY } }))).toBe(-10);
    expect(cbm(rules({ moves, user: { species: HITMONLEE }, target: { species: MAGNEMITE } }))).toBe(-10);
  });
});

describe("rank 2: anyMoveDisabled / anyMoveEncored (Cmd_if_any_move_disabled_or_encored, AI_TARGET)", () => {
  it("reads the target's disabledMove / encoredMove", () => {
    expect(view(rules()).target.anyMoveDisabled).toBeUndefined();
    expect(view(rules()).target.anyMoveEncored).toBeUndefined();
    const v = view(rules({ target: { disabledMove: TACKLE, encoredMove: 0 } }));
    expect(v.target.anyMoveDisabled).toBe(true);
    expect(v.target.anyMoveEncored).toBeUndefined();
    const w = view(rules({ target: { encoredMove: TACKLE } }));
    expect(w.target.anyMoveEncored).toBe(true);
    expect(w.target.anyMoveDisabled).toBeUndefined();
  });

  it("a disabled / encored USER does not count (the script reads AI_TARGET)", () => {
    const v = view(rules({ user: { disabledMove: TACKLE, encoredMove: TACKLE } }));
    expect(v.target.anyMoveDisabled).toBeUndefined();
    expect(v.target.anyMoveEncored).toBeUndefined();
  });

  it("AI_CBM_Disable / AI_CBM_Encore score -8 with the target's state set", () => {
    expect(cbm(rules({ moves: withMove(DISABLE) }))).toBe(0);
    expect(cbm(rules({ moves: withMove(DISABLE), target: { disabledMove: TACKLE } }))).toBe(-8);
    expect(cbm(rules({ moves: withMove(ENCORE) }))).toBe(0);
    expect(cbm(rules({ moves: withMove(ENCORE), target: { encoredMove: TACKLE } }))).toBe(-8);
  });
});

describe("rank 3: isParalyzed / isPoisoned / isBurned (Cmd_if_status AI_TARGET; the C @BUG reads the target)", () => {
  it("reads target status1 bits individually; toxic is isToxicPoisoned only", () => {
    const poisoned = view(rules({ target: { status1: STATUS1_POISON } })).target;
    expect([poisoned.isPoisoned, poisoned.isBurned, poisoned.isParalyzed]).toEqual([true, undefined, undefined]);
    const burned = view(rules({ target: { status1: STATUS1_BURN } })).target;
    expect([burned.isPoisoned, burned.isBurned, burned.isParalyzed]).toEqual([undefined, true, undefined]);
    const para = view(rules({ target: { status1: STATUS1_PARALYSIS } })).target;
    expect([para.isPoisoned, para.isBurned, para.isParalyzed]).toEqual([undefined, undefined, true]);
    const toxic = view(rules({ target: { status1: STATUS1_TOXIC } })).target;
    expect([toxic.isPoisoned, toxic.isBurned, toxic.isParalyzed, toxic.isToxicPoisoned]).toEqual([undefined, undefined, undefined, true]);
  });

  it("the AI user's own status does not fill the target fields", () => {
    const v = view(rules({ user: { status1: STATUS1_PARALYSIS | STATUS1_BURN } })).target;
    expect([v.isPoisoned, v.isBurned, v.isParalyzed]).toEqual([undefined, undefined, undefined]);
  });

  it("AI_CV_Facade +1 and AI_CV_SmellingSalt +1 on a statused target only", () => {
    for (const status of [STATUS1_POISON, STATUS1_BURN, STATUS1_PARALYSIS, STATUS1_TOXIC]) {
      expect(cv(rules({ moves: withMove(FACADE), target: { status1: status } }))! - cv(rules({ moves: withMove(FACADE) }))!).toBe(1);
    }
    expect(cv(rules({ moves: withMove(SMELLING_SALT), target: { status1: STATUS1_PARALYSIS } }))! - cv(rules({ moves: withMove(SMELLING_SALT) }))!).toBe(1);
    expect(cv(rules({ moves: withMove(SMELLING_SALT), target: { status1: STATUS1_BURN } }))! - cv(rules({ moves: withMove(SMELLING_SALT) }))!).toBe(0);
  });
});

describe("rank 4: holdEffect (Cmd_get_hold_effect)", () => {
  it("AI_USER: GetItemHoldEffect(gBattleMons[1].item) -- Leftovers 200 -> 43, Choice Band 186 -> 29, none -> 0", () => {
    expect(view(rules({ user: { item: 200 } })).attacker.holdEffect).toBe(43);
    expect(view(rules({ user: { item: 186 } })).attacker.holdEffect).toBe(29);
    expect(view(rules()).attacker.holdEffect).toBe(0);
  });

  it("AI_TARGET: reads BATTLE_HISTORY->itemEffects, never the live item", () => {
    expect(view(rules({ target: { item: 200 } })).target.holdEffect).toBe(0);
    // Source passes the recorded effect id through GetItemHoldEffect as an item id: item 44 (Berry Juice) -> 1.
    expect(view(rules({ target: { item: 200 }, aiObservedItemEffects: [44, 0, 0, 0] })).target.holdEffect).toBe(1);
  });
});

describe("rank 5: targetSideReflectUp / mistUp (Cmd_if_side_affecting)", () => {
  it("targetSideReflectUp is the target's (player's) side only", () => {
    expect(view(rules({ sideStatuses: [SIDE_STATUS_REFLECT, 0] })).target.targetSideReflectUp).toBe(true);
    expect(view(rules({ sideStatuses: [0, SIDE_STATUS_REFLECT] })).target.targetSideReflectUp).toBeUndefined();
    expect(view(rules({ sideStatuses: [0, SIDE_STATUS_REFLECT] })).attacker.reflectUp).toBe(true);
  });

  it("mistUp is the AI's own side only", () => {
    expect(view(rules({ sideStatuses: [0, SIDE_STATUS_MIST] })).attacker.mistUp).toBe(true);
    expect(view(rules({ sideStatuses: [SIDE_STATUS_MIST, 0] })).attacker.mistUp).toBeUndefined();
  });

  it("AI_CBM_Mist -8 with Mist up; AI_CV_BrickBreak +1 against a Reflect-up target", () => {
    expect(cbm(rules({ moves: withMove(MIST), sideStatuses: [0, SIDE_STATUS_MIST] }))).toBe(-8);
    expect(cbm(rules({ moves: withMove(MIST) }))).toBe(0);
    const base = cv(rules({ moves: withMove(BRICK_BREAK) }))!;
    expect(cv(rules({ moves: withMove(BRICK_BREAK), sideStatuses: [SIDE_STATUS_REFLECT, 0] }))! - base).toBe(1);
    expect(cv(rules({ moves: withMove(BRICK_BREAK), sideStatuses: [0, SIDE_STATUS_REFLECT] }))! - base).toBe(0);
  });
});

describe("rank 6: stockpileCount (Cmd_get_stockpile_count AI_USER)", () => {
  it("fills the user's stockpileCounter", () => {
    expect(view(rules({ user: { stockpileCounter: 2 } })).attacker.stockpileCount).toBe(2);
    expect(view(rules()).attacker.stockpileCount).toBe(0);
    expect(view(rules({ target: { stockpileCounter: 3 } })).attacker.stockpileCount).toBe(0);
  });

  it("AI_CBM_Stockpile -10 at 3; AI_CBM_SpitUpAndSwallow -10 at 0", () => {
    expect(cbm(rules({ moves: withMove(STOCKPILE), user: { stockpileCounter: 3 } }))).toBe(-10);
    expect(cbm(rules({ moves: withMove(STOCKPILE), user: { stockpileCounter: 2 } }))).toBe(0);
    expect(cbm(rules({ moves: withMove(SWALLOW), user: { stockpileCounter: 0 } }))).toBe(-10);
    expect(cbm(rules({ moves: withMove(SWALLOW), user: { stockpileCounter: 1 } }))).toBe(0);
  });
});

describe("rank 7: speciesAbilities (Cmd_get_ability two-ability guess)", () => {
  it("fills the target species' two ability slots", () => {
    expect(view(rules({ target: { species: CHANSEY } })).target.speciesAbilities).toEqual(["ABILITY_NATURAL_CURE", "ABILITY_SERENE_GRACE"]);
    expect(view(rules({ target: { species: PIKACHU } })).target.speciesAbilities).toEqual(["ABILITY_STATIC", "ABILITY_NONE"]);
  });
});

describe("rank 8: targetPartyStatusEqualsAny (Cmd_if_status_in_party, exact ==)", () => {
  it("only a live, non-egg slot whose whole status word equals STATUS1_ANY counts", () => {
    expect(view(rules({ player: [alive(1), alive(2, STATUS1_ANY), alive(3)] })).target.targetPartyStatusEqualsAny).toBe(true);
    // `==`, not `&`: a single status bit never matches.
    expect(view(rules({ player: [alive(1), alive(2, STATUS1_PARALYSIS), alive(3)] })).target.targetPartyStatusEqualsAny).toBeUndefined();
    // fainted / egg / empty slots are skipped.
    expect(view(rules({ player: [alive(1), alive(2, STATUS1_ANY, 0)] })).target.targetPartyStatusEqualsAny).toBeUndefined();
    const ctx = rules({ player: [alive(1), { ...alive(2, STATUS1_ANY), isEgg: true }] });
    expect(partyHasStatusEqualToAny(ctx.party.player)).toBe(false);
  });

  it("AI_CV_HealBell -5 with no status anywhere, 0 when a party slot matches", () => {
    const base = cv(rules({ moves: withMove(HEAL_BELL) }))!;
    const matched = cv(rules({ moves: withMove(HEAL_BELL), player: [alive(1), alive(2, STATUS1_ANY)] }))!;
    expect(matched - base).toBe(5);
  });
});

describe("rank 9: usedHeldItemId, imprisonedOthers, mudSportUp, waterSportUp (AI_USER)", () => {
  it("usedHeldItemId is the low byte of usedHeldItems[1]", () => {
    expect(view(rules({ usedHeldItems: [0, 200, 0, 0] })).attacker.usedHeldItemId).toBe(200);
    expect(view(rules({ usedHeldItems: [200, 0, 0, 0] })).attacker.usedHeldItemId).toBe(0);
    expect(view(rules({ usedHeldItems: [0, 0x0123, 0, 0] })).attacker.usedHeldItemId).toBe(0x23);
  });

  it("status3 bits on the AI user only", () => {
    const user = view(rules({ user: { status3: STATUS3_IMPRISONED_OTHERS | STATUS3_MUDSPORT | STATUS3_WATERSPORT } })).attacker;
    expect([user.imprisonedOthers, user.mudSportUp, user.waterSportUp]).toEqual([true, true, true]);
    const none = view(rules({ target: { status3: STATUS3_IMPRISONED_OTHERS | STATUS3_MUDSPORT | STATUS3_WATERSPORT } })).attacker;
    expect([none.imprisonedOthers, none.mudSportUp, none.waterSportUp]).toEqual([undefined, undefined, undefined]);
  });

  it("AI_CBM_Recycle / Imprison / MudSport / WaterSport gates", () => {
    expect(cbm(rules({ moves: withMove(RECYCLE) }))).toBe(-10);
    expect(cbm(rules({ moves: withMove(RECYCLE), usedHeldItems: [0, 200, 0, 0] }))).toBe(0);
    expect(cbm(rules({ moves: withMove(IMPRISON), user: { status3: STATUS3_IMPRISONED_OTHERS } }))).toBe(-10);
    expect(cbm(rules({ moves: withMove(IMPRISON) }))).toBe(0);
    expect(cbm(rules({ moves: withMove(MUD_SPORT), user: { status3: STATUS3_MUDSPORT } }))).toBe(-10);
    expect(cbm(rules({ moves: withMove(MUD_SPORT) }))).toBe(0);
    expect(cbm(rules({ moves: withMove(WATER_SPORT), user: { status3: STATUS3_WATERSPORT } }))).toBe(-10);
    expect(cbm(rules({ moves: withMove(WATER_SPORT) }))).toBe(0);
  });
});
