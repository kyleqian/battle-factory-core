import { describe, expect, it } from "vitest";
import {
  createBattleCommandRequest,
  createBattleState,
  type BattleDecisionReducer,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import { runCheckViability } from "../src/engine/factoryAiCheckViability.ts";
import {
  createFactoryAiBattleHistory,
  submitLiveFactoryAiDecision,
  type FactoryAiLiveRules,
} from "../src/engine/factoryAiLiveDriver.ts";

/**
 * ISSUES #122 regression pin.
 *
 * `AI_CV_SemiInvulnerable`'s `SemiInvulnerable5` block runs
 * `if_user_goes`/`Cmd_if_user_doesnt_go`
 * (`battle_ai_script_commands.c:1268-1282`), whose `GetWhoStrikesFirst` spends
 * a real `Random()` on a speed tie (`battle_main.c:4745`). The port drew that
 * tie roll but returned only the later `TryEncourage` roll to its caller, so
 * the recorded trace was one draw shorter than the RNG cursor it advanced --
 * and `replayAiDraws` threw
 * `Factory AI RNG diverged before live draw <i>/<ordinal>` the moment the
 * live kernel replayed the recording in lockstep.
 *
 * The staging below is the minimal shape of the seed-681 crash: a mask-7
 * Factory decision where the AI's move set is EFFECT_SEMI_INVULNERABLE
 * (BOUNCE), the target carries no Protect history and no
 * toxic/curse/leech-seed status, weather is clear, and both battlers sit on
 * exactly the same effective speed so every `SemiInvulnerable5` visit ties.
 */

const BOUNCE = 340; // EFFECT_SEMI_INVULNERABLE
const STRENGTH = 70;
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);
const TIED_SPEED = 65;

function battler(input: Readonly<{
  side: 0 | 1;
  species: number;
  ability: number;
  moves: readonly [number, number, number, number];
  types: readonly [string, string];
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  hp: number;
  maxHP: number;
}>): BattleScriptRulesBattler {
  return {
    ...input,
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
  };
}

function semiInvulnerableTieRules(): BattleScriptRulesContext {
  const empty = battler({
    side: 0,
    species: 0,
    ability: 0,
    moves: [0, 0, 0, 0],
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    speed: 0,
    hp: 0,
    maxHP: 0,
  });
  return createBattleScriptRulesContext({
    battlers: [
      // Player MAROWAK: Ground, so BOUNCE is neutral and the switch policy's
      // super-effective ladder stays draw-free.
      battler({
        side: 0,
        species: 105,
        ability: 69,
        moves: [STRENGTH, 0, 0, 0],
        types: ["TYPE_GROUND", "TYPE_GROUND"],
        attack: 130,
        defense: 130,
        spAttack: 55,
        spDefense: 70,
        speed: TIED_SPEED,
        hp: 135,
        maxHP: 135,
      }),
      // AI ALAKAZAM carrying four BOUNCEs at exactly the player's speed.
      battler({
        side: 1,
        species: 65,
        ability: 0,
        moves: [BOUNCE, BOUNCE, BOUNCE, BOUNCE],
        types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
        attack: 55,
        defense: 65,
        spAttack: 135,
        spDefense: 105,
        speed: TIED_SPEED,
        hp: 135,
        maxHP: 135,
      }),
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
      battleTypeFlags:
        BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    moveHistory: {
      lastMoves: [0, 0, 0, 0],
      lastLandedMoves: [0, 0, 0, 0],
      lastHitBy: [0xff, 0xff, 0xff, 0xff],
    },
  });
}

const request = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: [
    { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    { kind: "use-move", moveSlot: 2, targetBattler: 0 },
    { kind: "use-move", moveSlot: 3, targetBattler: 0 },
  ],
});

function liveState(
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
): BattleState<FactoryAiLiveRules> {
  return createBattleState({
    rules: { rulesContext } as FactoryAiLiveRules,
    rngSeed,
    request,
  });
}

const terminalReducer: BattleDecisionReducer<FactoryAiLiveRules> = (context) => ({
  rules: context.rules,
  events: [],
  boundary: { kind: "terminal", outcome: "player-win" },
});

describe("AI_CV_SemiInvulnerable speed-tie draw is recorded (ISSUES #122)", () => {
  // Several seeds so the pin does not rest on one lucky LCG walk; every one
  // of them ties on speed and therefore spends the hidden tie Random().
  it.each([1, 7, 42, 919694434, 2770535030])(
    "seed %i: the live lockstep replay accepts the scored trace",
    (rngSeed) => {
      const rulesContext = semiInvulnerableTieRules();
      const result = submitLiveFactoryAiDecision(
        liveState(rulesContext, rngSeed),
        createFactoryAiBattleHistory(rulesContext),
        { factoryWinStreak: 28, trainerOpponentId: 222 },
        terminalReducer,
      );

      expect(result.phase).toBe("move");
      if (result.phase !== "move") throw new Error("expected move phase");

      // The recorded ledger must account for every RNG call the recorders
      // advanced: replayAiDraws walks it against the live kernel one draw at
      // a time and throws the moment the two disagree.
      const recorded = [...result.switchPolicy.draws, ...result.trace.draws];
      expect(result.rng.calls).toBe(recorded.length);
      expect(result.transition.state.rng).toEqual(result.rng);

      // Each of the four EFFECT_SEMI_INVULNERABLE slots spends the tie roll
      // and then the TryEncourage roll, in that order.
      const cvDraws = result.trace.draws.filter(
        (draw) => "phase" in draw && draw.phase === "check-viability",
      );
      expect(cvDraws.map((draw) => draw.kind)).toEqual([
        "target-faster-tie",
        "semi-invulnerable-roll",
        "target-faster-tie",
        "semi-invulnerable-roll",
        "target-faster-tie",
        "semi-invulnerable-roll",
        "target-faster-tie",
        "semi-invulnerable-roll",
      ]);

      // Ordinals stay contiguous from 1: a dropped record showed up as a gap.
      expect(result.trace.draws.map((draw) => draw.ordinal)).toEqual(
        result.trace.draws.map((_draw, index) => index + 1),
      );
    },
  );
});

describe("runCheckViability records SemiInvulnerable5's tie roll (ISSUES #122)", () => {
  const battler = (speed: number) => Object.freeze({
    speed,
    speedStage: 6,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
  });

  it("returns both receipts when the speed tie is spent", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: 19, // FLY -- EFFECT_SEMI_INVULNERABLE
      attacker: battler(100),
      target: { ...battler(100), lastUsedMoveId: 0 },
      drawOrdinalStart: 17,
      reasonPrefix: "semi-tie",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("expected a scored result");
    expect(result.rng.calls).toBe(2);
    expect(result.draws).toHaveLength(2);
    expect(result.draws.map((draw) => [draw.kind, draw.ordinal])).toEqual([
      ["target-faster-tie", 17],
      ["semi-invulnerable-roll", 18],
    ]);
    expect(result.draws[1]!.before).toEqual(result.draws[0]!.after);
  });

  it("returns the single encourage receipt when no speed tie occurs", () => {
    const result = runCheckViability({
      rng: { value: 1, calls: 0 },
      moveId: 19,
      attacker: battler(120),
      target: { ...battler(100), lastUsedMoveId: 0 },
      drawOrdinalStart: 17,
      reasonPrefix: "semi-no-tie",
    });
    expect(result.kind).toBe("scored");
    if (result.kind !== "scored") throw new Error("expected a scored result");
    expect(result.rng.calls).toBe(1);
    expect(result.draws.map((draw) => [draw.kind, draw.ordinal])).toEqual([
      ["semi-invulnerable-roll", 17],
    ]);
  });
});
