import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import { calculateBattleScriptBaseDamageForCurrentMove } from "../src/engine/battleScriptHitChainOpcode.ts";
import {
  createFactoryAiBattleHistory,
  createFactoryAiViewFromLiveRules,
  syncFactoryAiBattleHistory,
} from "../src/engine/factoryAiLiveDriver.ts";
import {
  estimateDamage,
  type FactoryAiTryToFaintBattler,
  type FactoryAiTryToFaintTarget,
} from "../src/engine/factoryAiTryToFaint.ts";
import { MOVES_BY_ID, TYPE_EFFECTIVENESS } from "../src/engine/factoryAiCheckBadMove.ts";
import { applyStab, applyTypeEffectiveness } from "../src/engine/damageCalc.ts";

// aiv271 (ISSUES #204 cause C, seed 39). C `AI_CalcDmg` (battle_script_commands.c:1303-1318) is the same
// `CalculateBaseDamage(&gBattleMons[attacker], &gBattleMons[defender], ...)` call as `Cmd_damagecalc`, so the AI damage
// simulations (`get_how_powerful_move_is`, `if_can_faint`) must see both battlers' species, hold effect and hold-effect
// param exactly as the real hit chain does. The expected value below is the REAL chain: the hit chain's own
// base-damage function on the same rules context, then STAB, the type table and the same `* factor / 100` step.

const ITEM_CHOICE_BAND = 186;
const ITEM_SOUL_DEW = 191;
const ITEM_DEEP_SEA_TOOTH = 192;
const ITEM_DEEP_SEA_SCALE = 193;
const ITEM_LIGHT_BALL = 202;
const ITEM_CHARCOAL = 215;
const ITEM_SILK_SCARF = 217;
const ITEM_METAL_POWDER = 223;
const ITEM_THICK_CLUB = 224;
const SPECIES_PIKACHU = 25;
const SPECIES_CUBONE = 104;
const SPECIES_MAROWAK = 105;
const SPECIES_DITTO = 132;
const SPECIES_CLAMPERL = 373;
const SPECIES_LATIOS = 408;
const MOVE_TACKLE = 33; // Normal 35, physical
const MOVE_FLAMETHROWER = 53; // Fire 95, special
const MOVE_SURF = 57; // Water 95, special
const MOVE_THUNDERBOLT = 85; // Electric 95, special
const MOVE_BRICK_BREAK = 280; // Fighting 75, physical
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);
const FACTOR = 93;

function liveBattler(side: 0 | 1, extra: Partial<BattleScriptRulesBattler> & { item?: number }): BattleScriptRulesBattler {
  return {
    side,
    species: 1,
    ability: 0,
    moves: [MOVE_TACKLE, 0, 0, 0],
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    hp: 200,
    maxHP: 200,
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

function liveRules(
  user: Partial<BattleScriptRulesBattler> & { item?: number },
  target: Partial<BattleScriptRulesBattler> & { item?: number },
  currentMove = 0,
): BattleScriptRulesContext {
  const empty = liveBattler(0, { moves: [0, 0, 0, 0] });
  const mon = (species: number) => ({ species, hp: 100, maxHP: 100, status1: 0 });
  return createBattleScriptRulesContext({
    battlers: [liveBattler(0, target), liveBattler(1, user), empty, { ...empty, side: 1 }],
    selectorRoles: { attacker: 1, target: 0 },
    scriptingBattler: 1,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove,
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
    moveHistory: { lastMoves: [0, 0, 0, 0], lastLandedMoves: [0, 0, 0, 0], lastHitBy: [0xff, 0xff, 0xff, 0xff] },
    party: {
      player: [mon(1), mon(2), mon(3), ...new Array(3).fill({})],
      opponent: [mon(1), mon(2), mon(3), ...new Array(3).fill({})],
    },
  } as never);
}

function aiEstimate(context: BattleScriptRulesContext, moveId: number): number {
  const view = createFactoryAiViewFromLiveRules({
    rulesContext: context,
    history: syncFactoryAiBattleHistory(createFactoryAiBattleHistory(context), context),
    challenge: { factoryWinStreak: 28, trainerOpponentId: 222 },
  });
  return estimateDamage(
    view.attacker as unknown as FactoryAiTryToFaintBattler,
    view.target as unknown as FactoryAiTryToFaintTarget,
    moveId,
    FACTOR,
  );
}

/** Cmd_damagecalc -> Cmd_typecalc (STAB, type table) -> the `* factor / 100` step, on the same context. */
function realDamage(context: BattleScriptRulesContext, moveId: number): number {
  const move = MOVES_BY_ID.get(moveId)!;
  const base = calculateBattleScriptBaseDamageForCurrentMove({ ...context, currentMove: moveId });
  const stab = applyStab(base, context.battlers[1].types as [string, string], move.type);
  const typed = applyTypeEffectiveness(stab, move.type, context.battlers[0].types as [string, string], TYPE_EFFECTIVENESS).damage;
  return Math.max(1, Math.trunc((typed * FACTOR) / 100));
}

type Case = Readonly<{
  name: string;
  user: Partial<BattleScriptRulesBattler> & { item?: number };
  target?: Partial<BattleScriptRulesBattler> & { item?: number };
  move: number;
  /** The same inputs with no item: the AI estimate must differ from it (the term is live, not inert). */
  changes: boolean;
}>;

const CASES: readonly Case[] = [
  { name: "Choice Band (physical x1.5)", user: { item: ITEM_CHOICE_BAND }, move: MOVE_TACKLE, changes: true },
  { name: "type-boost item Silk Scarf (Normal, param 10)", user: { item: ITEM_SILK_SCARF }, move: MOVE_TACKLE, changes: true },
  { name: "type-boost item Charcoal (Fire, special)", user: { item: ITEM_CHARCOAL }, move: MOVE_FLAMETHROWER, changes: true },
  { name: "type-boost item on the wrong type is inert", user: { item: ITEM_CHARCOAL }, move: MOVE_TACKLE, changes: false },
  { name: "Thick Club on Marowak (attack x2)", user: { item: ITEM_THICK_CLUB, species: SPECIES_MAROWAK }, move: MOVE_TACKLE, changes: true },
  { name: "Thick Club on Cubone (attack x2)", user: { item: ITEM_THICK_CLUB, species: SPECIES_CUBONE }, move: MOVE_BRICK_BREAK, changes: true },
  { name: "Thick Club on another species is inert", user: { item: ITEM_THICK_CLUB, species: 1 }, move: MOVE_TACKLE, changes: false },
  { name: "Light Ball on Pikachu (special x2)", user: { item: ITEM_LIGHT_BALL, species: SPECIES_PIKACHU }, move: MOVE_THUNDERBOLT, changes: true },
  { name: "Deep Sea Tooth on Clamperl (special x2)", user: { item: ITEM_DEEP_SEA_TOOTH, species: SPECIES_CLAMPERL }, move: MOVE_SURF, changes: true },
  { name: "Soul Dew on Latios is off in the Frontier", user: { item: ITEM_SOUL_DEW, species: SPECIES_LATIOS }, move: MOVE_SURF, changes: false },
  {
    name: "defender Metal Powder on Ditto (defense x2), item NOT in the AI's battle history",
    user: {},
    target: { item: ITEM_METAL_POWDER, species: SPECIES_DITTO },
    move: MOVE_TACKLE,
    changes: true,
  },
  {
    name: "defender Deep Sea Scale on Clamperl (spDefense x2)",
    user: {},
    target: { item: ITEM_DEEP_SEA_SCALE, species: SPECIES_CLAMPERL },
    move: MOVE_SURF,
    changes: true,
  },
  {
    name: "attacker burn halves a physical estimate (no Guts)",
    user: { status1: 1 << 4 },
    move: MOVE_TACKLE,
    changes: true,
  },
  {
    name: "attacker Blaze at 1/3 HP boosts a Fire move (needs maxHP, not just hp)",
    user: { ability: 66, hp: 66, maxHP: 200 },
    move: MOVE_FLAMETHROWER,
    changes: true,
  },
];

describe("aiv271: AI damage simulations use the real CalculateBaseDamage terms (ISSUES #204 C)", () => {
  for (const c of CASES) {
    it(`${c.name}: estimateDamage equals the real chain at the same factor`, () => {
      const context = liveRules(c.user, c.target ?? {});
      const real = realDamage(context, c.move);
      expect(aiEstimate(context, c.move)).toBe(real);
      const plain = realDamage(
        liveRules({ ...c.user, item: 0, ...(c.user.status1 !== undefined ? { status1: 0 } : {}), ...(c.user.ability !== undefined ? { ability: 0 } : {}) },
          { ...(c.target ?? {}), item: 0 }),
        c.move,
      );
      if (c.changes) expect(real).not.toBe(plain);
      else expect(real).toBe(plain);
    });
  }

  it("hand anchor: Thick Club Marowak Tackle (35, Normal-typed user: STAB) atk 100 / def 100 L50, factor 93 = 44 (plain 23)", () => {
    // club: floor(floor(200 * 35 * 22 / 100) / 50) + 2 = 32, STAB 48, 48 * 93 / 100 = 44
    // plain: floor(floor(100 * 35 * 22 / 100) / 50) + 2 = 17, STAB 25, 25 * 93 / 100 = 23
    expect(aiEstimate(liveRules({ item: ITEM_THICK_CLUB, species: SPECIES_MAROWAK }, {}), MOVE_TACKLE)).toBe(44);
    expect(aiEstimate(liveRules({ species: SPECIES_MAROWAK }, {}), MOVE_TACKLE)).toBe(23);
  });

  it("the AI ranking changes: a Choice Band Tackle out-damages an equal-power plain move", () => {
    const band = liveRules({ item: ITEM_CHOICE_BAND }, {});
    expect(aiEstimate(band, MOVE_TACKLE)).toBeGreaterThan(aiEstimate(liveRules({}, {}), MOVE_TACKLE));
  });
});
