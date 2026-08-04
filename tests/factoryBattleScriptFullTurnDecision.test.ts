import { describe, expect, it } from "vitest";
import {
  FACTORY_RUN_AWAY_NOOP_INVARIANT,
  createFactoryFullTurnBattleState,
  reduceFactoryFullTurnDecision,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  submitFactoryAiDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import {
  createFactoryAiBattleHistory,
  syncFactoryAiBattleHistory,
} from "../src/engine/factoryAiLiveDriver.ts";
import {
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_MINIMIZED,
} from "../src/engine/battleScriptSourceConstants.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const STRENGTH = 70; // EFFECT_HIT, TYPE_NORMAL -- the banked KO-scenario move (factoryBattleScriptTerminalDecision.test.ts).
const SPIKE_CANNON = 131; // EFFECT_MULTI_HIT, TYPE_NORMAL, 2-5 hits.
const DOUBLE_KICK = 24; // EFFECT_DOUBLE_HIT, fixed 2 hits.
const TWINEEDLE = 41; // EFFECT_TWINEEDLE, fixed 2 hits.
const EARTHQUAKE = 89; // EFFECT_EARTHQUAKE.
const EMBER = 52; // EFFECT_BURN_HIT, TYPE_FIRE, 10% MOVE_EFFECT_BURN secondary proc.
const FLAIL = 175; // EFFECT_FLAIL -- writes source gDynamicBasePower before the shared hit chain.
const FRUSTRATION = 218; // EFFECT_FRUSTRATION -- friendship 0 writes source gDynamicBasePower 102.
const DOUBLE_TEAM = 104;
const MINIMIZE = 107;
const STOMP = 23;
const SPIKES = 191;
const RAIN_DANCE = 240;
const REST = 156;
const HYPER_VOICE = 304; // Gen 3 omits FLAG_KINGS_ROCK_AFFECTED despite dealing damage.
const ITEM_CHESTO_BERRY = 134;
const ITEM_KINGS_ROCK = 187;
const ITEM_SHELL_BELL = 219;
/** The banked KO-scenario seed (factoryBattleScriptTerminalDecision.test.ts, docs/hit-chain-ground-truth.md). */
const KO_SCENARIO_RNG_SEED = 919694434;
/** Brute-force-found: Ember's 10% burn proc actually lands on turn 1 with this seed, per this move's own real hit-chain RNG order (accuracy, crit, damage, secondary-effect-chance). */
const BURN_PROC_RNG_SEED = 61;
const STATUS1_POISON = 1 << 3;
const STATUS1_BURN = 1 << 4;
const STATUS1_PARALYSIS = 1 << 6;
const ABILITY_CLOUD_NINE = 13;
const ABILITY_INTIMIDATE = 22;
const ABILITY_SHADOW_TAG = 23;
const ABILITY_LEVITATE = 26;
const ABILITY_OVERGROW = 65;
const ABILITY_SWIFT_SWIM = 33;
const ABILITY_CHLOROPHYLL = 34;
const ABILITY_MAGNET_PULL = 42;
const ABILITY_RUN_AWAY = 50;
const ABILITY_ARENA_TRAP = 71;
const ITEM_MACHO_BRACE = 181;
const ITEM_QUICK_CLAW = 183;
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);

// docs/factory-ai-ground-truth.md's own banked mask-7 fixture moveset/stat shape
// (factoryAiScoredDecision.test.ts) -- Alakazam-shaped attacker vs Marowak-shaped
// target, reused here so the SAME move-set proves out through the REAL hit chain,
// not just the AI's own damage estimate.
const MOVE_SURF = 57;
const MOVE_ROCK_SLIDE = 157;
const MOVE_BODY_SLAM = 34;
const MOVE_THUNDERBOLT = 85;
const NEUTRAL_STAGES = Object.freeze({ atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6 });

function aiTrainerConfig(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: KO_SCENARIO_RNG_SEED,
    player: {
      species: 105, moveId: STRENGTH, attack: 130, defense: 130, spAttack: 55, spDefense: 70, speed: 100, hp: 999,
      types: ["TYPE_GROUND", "TYPE_GROUND"],
    },
    trainer: {
      species: 65,
      moveId: MOVE_SURF,
      moves: [MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT],
      attack: 55, defense: 65, spAttack: 135, spDefense: 105, speed: 50, hp: 999,
      types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
    },
  };
}

/** Hand-built per `factoryAiDecisionPolicy.ts`'s own view contract -- no production "view builder" exists (direct-construction discipline), mirroring `factoryAiScoredDecision.test.ts`'s own fixture. */
function aiTrainerView(playerHp: number): FactoryAiScoredView {
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1 as const, targetBattler: 0 as const }),
    factory: Object.freeze({ levelMode: 0 as const, battleMode: 0 as const, factoryWinStreak: 28, trainerOpponentId: 222 }),
    moves: Object.freeze([MOVE_SURF, MOVE_ROCK_SLIDE, MOVE_BODY_SLAM, MOVE_THUNDERBOLT] as const),
    attacker: Object.freeze({
      types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
      attack: 55, defense: 65, spAttack: 135, spDefense: 105, speed: 140, level: 50, statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: 999, maxHp: 999,
    }),
    target: Object.freeze({
      species: 105,
      types: ["TYPE_GROUND", "TYPE_GROUND"] as const,
      attack: 130, defense: 130, spAttack: 55, spDefense: 70, speed: 65, level: 50, statStages: NEUTRAL_STAGES,
      isFirstTurn: 2,
      hp: playerHp,
      maxHp: 999,
      ability: "ABILITY_ROCK_HEAD",
      knownAbility: null,
    }),
  });
}

function config(overrides: Partial<FactoryFullTurnConfig> = {}): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: KO_SCENARIO_RNG_SEED,
    player: {
      species: 1, moveId: STRENGTH, attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 999,
    },
    trainer: {
      species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 999,
    },
    ...overrides,
  };
}

const PLAYER_ATTACKS = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const });
const TRAINER_ATTACKS = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const });

function stageSwitchHistory(
  state: ReturnType<typeof createFactoryFullTurnBattleState>,
  battler: 0 | 1,
  ability: number,
  move: number,
): ReturnType<typeof createFactoryFullTurnBattleState> {
  const rulesContext = state.rules.rulesContext;
  return Object.freeze({
    ...state,
    rules: Object.freeze({
      ...state.rules,
      rulesContext: Object.freeze({
        ...rulesContext,
        aiObservedAbilityIds: Object.freeze(
          rulesContext.aiObservedAbilityIds.map((value, index) =>
            index === battler ? ability : value
          ),
        ),
        moveHistory: Object.freeze({
          ...rulesContext.moveHistory,
          lastMoves: Object.freeze(
            rulesContext.moveHistory.lastMoves.map((value, index) =>
              index === battler ? move : value
            ),
          ),
        }),
      }),
    }),
  }) as ReturnType<typeof createFactoryFullTurnBattleState>;
}

describe("factory full-turn decision -- multi-hit controller resumption", () => {
  function runMultiHitTurn(moveId: number, rngSeed: number) {
    const initial = createFactoryFullTurnBattleState(config({
      rngSeed,
      player: {
        species: 1,
        moveId,
        attack: 50,
        defense: 200,
        spAttack: 50,
        spDefense: 200,
        speed: 100,
        hp: 999,
      },
      trainer: {
        species: 43,
        moveId: STRENGTH,
        attack: 50,
        defense: 200,
        spAttack: 50,
        spDefense: 200,
        speed: 50,
        hp: 999,
      },
    }));
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ATTACKS,
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer decision");
    const reasons: string[] = [];
    let rngValue = afterPlayer.state.rng.value;
    let rngCalls = afterPlayer.state.rng.calls;
    const reduced = reduceFactoryFullTurnDecision({
      rules: afterPlayer.state.rules,
      request: afterPlayer.nextRequest,
      decision: TRAINER_ATTACKS,
      rng: {
        draw(reason) {
          reasons.push(reason);
          rngValue = advanceRngValue(rngValue);
          rngCalls += 1;
          return rngValue >>> 16;
        },
        snapshot: () => ({ value: rngValue, calls: rngCalls }),
      },
    });
    return { reduced, reasons, rngValue, rngCalls };
  }

  it("resumes every controller yield inside Spike Cannon's hit splice and keeps the hit-count roll at draw 2", () => {
    const { reduced, reasons, rngValue, rngCalls } = runMultiHitTurn(SPIKE_CANNON, 1);
    expect(reduced.boundary.kind).toBe("decision-required");
    expect(reduced.rules.rulesContext.battlers[1].hp).toBe(984);
    expect(reduced.rules.rulesContext.battlers[0].pp[0]).toBe(15);
    expect(reasons.slice(0, 9)).toEqual([
      "accuracycheck",
      "setmultihitcounter:initial",
      "critcalc",
      "adjustnormaldamage",
      "critcalc",
      "adjustnormaldamage",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
    expect(reduced.events.filter((event) => {
      const payload = "payload" in event ? event.payload : event;
      return payload.kind === "health-bar-update" && payload.battler === 1;
    })).toHaveLength(3);
    expect(rngCalls).toBe(14);
    let expectedCursor = 1;
    for (let call = 0; call < rngCalls; call += 1) expectedCursor = advanceRngValue(expectedCursor);
    expect(rngValue).toBe(expectedCursor);
  });

  it("resumes the maximum five-hit Spike Cannon loop without treating controller waits as runaway script work", () => {
    const { reduced, reasons } = runMultiHitTurn(SPIKE_CANNON, 6);
    expect(reduced.boundary.kind).toBe("decision-required");
    expect(reduced.events.filter((event) => {
      const payload = "payload" in event ? event.payload : event;
      return payload.kind === "health-bar-update" && payload.battler === 1;
    })).toHaveLength(5);
    expect(reasons[1]).toBe("setmultihitcounter:initial");
    expect(reasons[2]).toBe("setmultihitcounter:reroll");
  });

  it.each([
    ["Double Kick", DOUBLE_KICK],
    ["Twineedle", TWINEEDLE],
  ])("%s resumes its fixed two-hit loop through the next command boundary", (_name, moveId) => {
    const { reduced, reasons, rngValue, rngCalls } = runMultiHitTurn(moveId, 1);
    expect(reduced.boundary.kind).toBe("decision-required");
    expect(reduced.events.filter((event) => {
      const payload = "payload" in event ? event.payload : event;
      return payload.kind === "health-bar-update" && payload.battler === 1;
    })).toHaveLength(2);
    expect(reasons.slice(0, 6)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
    expect(rngCalls).toBe(11);
    let expectedCursor = 1;
    for (let call = 0; call < rngCalls; call += 1) expectedCursor = advanceRngValue(expectedCursor);
    expect(rngValue).toBe(expectedCursor);
  });
});

describe("factory full-turn decision -- Earthquake singles target iteration", () => {
  it("runs Earthquake through the next command boundary", () => {
    const initial = createFactoryFullTurnBattleState(config({
      rngSeed: 1,
      player: {
        species: 1,
        moveId: EARTHQUAKE,
        attack: 50,
        defense: 200,
        spAttack: 50,
        spDefense: 200,
        speed: 100,
        hp: 999,
      },
      trainer: {
        species: 43,
        moveId: STRENGTH,
        attack: 50,
        defense: 200,
        spAttack: 50,
        spDefense: 200,
        speed: 50,
        hp: 999,
      },
    }));
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ATTACKS,
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer decision");
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: TRAINER_ATTACKS,
    });
    if (result.kind !== "decision-required") {
      throw new Error(`expected next command after Earthquake, got ${result.kind}`);
    }
    expect(result.state.rules.rulesContext.battlers[1].hp).toBeLessThan(999);
    expect(result.state.rng.calls).toBe(8);
    expect(result.events.filter(({ payload, provenance }) =>
      payload.kind === "health-bar-update"
      && payload.battler === 1
      && provenance?.sourceLabel === "BattleScript_DoHitAllWithUndergroundBonus"
    )).toHaveLength(1);
  });
});

function initialPlayerSwitchIndexes(turnConfig: FactoryFullTurnConfig): readonly number[] {
  const initial = createFactoryFullTurnBattleState(turnConfig);
  if (
    initial.boundary.kind !== "decision-required"
    || initial.boundary.request.kind !== "command"
  ) {
    throw new Error("expected initial player command request");
  }
  return initial.boundary.request.legalDecisions.flatMap((decision) =>
    decision.kind === "switch" ? [decision.partyIndex] : []
  );
}

describe("factory full-turn decision -- voluntary-switch enumeration and trapping trio", () => {
  const BENCH = Object.freeze([
    { species: 66, moves: [2, 0, 0, 0] as const },
    { species: 74, isEgg: true, moves: [33, 0, 0, 0] as const },
  ] as const);

  function trappingConfig(
    trainerAbility: number,
    player: Partial<FactoryFullTurnConfig["player"]> = {},
    extras: Partial<FactoryFullTurnConfig> = {},
  ): FactoryFullTurnConfig {
    return config({
      player: {
        species: 1, moveId: STRENGTH, attack: 100, defense: 100,
        spAttack: 100, spDefense: 100, speed: 100, hp: 999,
        ...player,
      },
      trainer: {
        species: 360, moveId: STRENGTH, ability: trainerAbility,
        attack: 100, defense: 100, spAttack: 100, spDefense: 100,
        speed: 50, hp: 999,
      },
      playerBenchHp: [100, 100],
      playerBenchOverride: BENCH,
      ...extras,
    });
  }

  function trainerSwitchIndexes(turnConfig: FactoryFullTurnConfig): readonly number[] {
    const initial = createFactoryFullTurnBattleState(turnConfig);
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ATTACKS,
    });
    if (
      afterPlayer.kind !== "decision-required"
      || afterPlayer.nextRequest.kind !== "command"
      || afterPlayer.nextRequest.side !== "trainer"
    ) {
      throw new Error("expected trainer command request");
    }
    return afterPlayer.nextRequest.legalDecisions.flatMap((decision) =>
      decision.kind === "switch" ? [decision.partyIndex] : []
    );
  }

  it("enumerates only benched, alive, non-egg members (battle_main.c:4240-4267 party-menu path)", () => {
    expect(initialPlayerSwitchIndexes(trappingConfig(0))).toEqual([1]);
    expect(initialPlayerSwitchIndexes(trappingConfig(0, {}, {
      playerBenchHp: [0, 100],
      playerBenchOverride: [
        { species: 66, moves: [2, 0, 0, 0] },
        { species: 74, isEgg: false, moves: [33, 0, 0, 0] },
      ],
    }))).toEqual([2]);
  });

  it("Shadow Tag removes every voluntary switch unconditionally while its opposing holder is live", () => {
    expect(initialPlayerSwitchIndexes(trappingConfig(ABILITY_SHADOW_TAG))).toEqual([]);
    expect(initialPlayerSwitchIndexes(trappingConfig(0))).toEqual([1]);
  });

  it("Arena Trap catches a grounded target but exempts either Flying type or Levitate (battle_main.c:4249-4252)", () => {
    expect(initialPlayerSwitchIndexes(trappingConfig(ABILITY_ARENA_TRAP))).toEqual([]);
    expect(initialPlayerSwitchIndexes(trappingConfig(
      ABILITY_ARENA_TRAP,
      { types: ["TYPE_FLYING", "TYPE_NORMAL"] },
    ))).toEqual([1]);
    expect(initialPlayerSwitchIndexes(trappingConfig(
      ABILITY_ARENA_TRAP,
      { ability: ABILITY_LEVITATE },
    ))).toEqual([1]);
  });

  it("Magnet Pull catches Steel targets only (battle_main.c:4252-4256)", () => {
    expect(initialPlayerSwitchIndexes(trappingConfig(
      ABILITY_MAGNET_PULL,
      { types: ["TYPE_STEEL", "TYPE_ROCK"] },
    ))).toEqual([]);
    expect(initialPlayerSwitchIndexes(trappingConfig(
      ABILITY_MAGNET_PULL,
      { types: ["TYPE_ROCK", "TYPE_GROUND"] },
    ))).toEqual([1]);
  });

  it("a fainted or absent holder does not trap at a command boundary", () => {
    const fainted = trappingConfig(ABILITY_SHADOW_TAG, {}, {
      trainer: {
        species: 360, moveId: STRENGTH, ability: ABILITY_SHADOW_TAG,
        attack: 100, defense: 100, spAttack: 100, spDefense: 100,
        speed: 50, hp: 0,
      },
    });
    expect(initialPlayerSwitchIndexes(fainted)).toEqual([1]);
    expect(initialPlayerSwitchIndexes(trappingConfig(
      ABILITY_SHADOW_TAG,
      {},
      { absentBattlerFlags: 1 << 1 },
    ))).toEqual([1]);
  });

  it("Run Away adds no Factory run command and does not bypass the distinct voluntary-switch trap gate", () => {
    const untrapped = createFactoryFullTurnBattleState(trappingConfig(
      0,
      { ability: ABILITY_RUN_AWAY },
    ));
    if (
      untrapped.boundary.kind !== "decision-required"
      || untrapped.boundary.request.kind !== "command"
    ) {
      throw new Error("expected initial player command request");
    }
    expect(FACTORY_RUN_AWAY_NOOP_INVARIANT).toEqual({
      abilityId: ABILITY_RUN_AWAY,
      battleTypeFlags: (1 << 3) | (1 << 19),
      legalDecisionKinds: ["use-move", "switch"],
    });
    expect([...new Set(untrapped.boundary.request.legalDecisions.map(({ kind }) => kind))].sort())
      .toEqual(["switch", "use-move"]);
    expect(initialPlayerSwitchIndexes(trappingConfig(
      ABILITY_SHADOW_TAG,
      { ability: ABILITY_RUN_AWAY },
    ))).toEqual([]);
  });

  it("publishes legal trainer bench switches after moves, but applies ShouldSwitch's Arena Trap hard gate without the player exemption", () => {
    const trainerBench = {
      trainerBenchHp: [100, 0] as const,
      trainerBenchOverride: [
        { species: 66, moves: [2, 0, 0, 0] as const },
        undefined,
      ] as const,
    };
    const untrapped = config({
      ...trainerBench,
      trainer: {
        species: 43, moveId: STRENGTH, ability: ABILITY_LEVITATE,
        attack: 50, defense: 50, spAttack: 50, spDefense: 50,
        speed: 50, hp: 999, types: ["TYPE_FLYING", "TYPE_FLYING"],
      },
    });
    expect(trainerSwitchIndexes(untrapped)).toEqual([1]);
    expect(trainerSwitchIndexes(config({
      ...trainerBench,
      player: {
        species: 1, moveId: STRENGTH, ability: ABILITY_ARENA_TRAP,
        attack: 200, defense: 50, spAttack: 50, spDefense: 50,
        speed: 100, hp: 999,
      },
      trainer: untrapped.trainer,
    }))).toEqual([]);

    const initial = createFactoryFullTurnBattleState(untrapped);
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ATTACKS,
    });
    if (
      afterPlayer.kind !== "decision-required"
      || afterPlayer.nextRequest.kind !== "command"
    ) throw new Error("expected trainer command request");
    expect(afterPlayer.nextRequest.legalDecisions).toEqual([
      TRAINER_ATTACKS,
      { kind: "switch", partyIndex: 1 },
    ]);
  });

  it("auto-confirms a trainer locked move instead of publishing its otherwise-live bench switch", () => {
    const initial = createFactoryFullTurnBattleState(config({
      trainer: {
        species: 43, moveId: STRENGTH,
        attack: 50, defense: 500, spAttack: 50, spDefense: 500,
        speed: 50, hp: 999,
        status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
        lockedMove: STRENGTH,
        chosenMovePosition: 0,
      },
      trainerBenchHp: [100, 0],
      trainerBenchOverride: [
        { species: 66, moves: [2, 0, 0, 0] },
        undefined,
      ],
    }));
    const result = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ATTACKS,
    });
    if (result.kind !== "decision-required") throw new Error("expected next command");
    expect(result.nextRequest).toMatchObject({
      kind: "command",
      side: "player",
      battler: 0,
    });
  });
});

describe("factory full-turn decision -- voluntary-switch action", () => {
  function switchTurnConfig(trainerMoveId = STRENGTH): FactoryFullTurnConfig {
    return config({
      player: {
        species: 1, moveId: STRENGTH, attack: 80, defense: 20,
        spAttack: 80, spDefense: 20, speed: 200, hp: 300,
      },
      trainer: {
        species: 43, moveId: trainerMoveId, attack: 100, defense: 100,
        spAttack: 100, spDefense: 100, speed: 1, hp: 300,
      },
      playerBenchHp: [200, 0],
      playerBenchOverride: [{
        species: 23, abilityNum: 0, moves: [35, 0, 0, 0],
        maxHP: 200, attack: 80, defense: 200, speed: 50,
        spAttack: 40, spDefense: 100,
      }, undefined],
    });
  }

  it("switches before the opposing move, fires incoming Intimidate, and makes that move damage the incoming mon", () => {
    const initial = createFactoryFullTurnBattleState(switchTurnConfig());
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command");
    if (afterPlayer.nextRequest.kind !== "command") throw new Error("expected trainer command");
    expect(afterPlayer.nextRequest.legalDecisions).toEqual([TRAINER_ATTACKS]);

    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: TRAINER_ATTACKS,
    });
    if (result.kind !== "decision-required") throw new Error("expected next player command");
    const rc = result.state.rules.rulesContext;
    expect(rc.battlers[0]).toMatchObject({
      species: 23,
      partyIndex: 1,
      ability: ABILITY_INTIMIDATE,
    });
    expect(rc.battlers[0]!.hp).toBeLessThan(200);
    expect(rc.party.player[1]!.hp).toBe(rc.battlers[0]!.hp);
    expect(rc.party.player[0]!.hp).toBe(300);
    expect(rc.battlers[1]!.statStages[1]).toBe(5);
    expect(result.events).toContainEqual(expect.objectContaining({
      payload: { kind: "switch", side: "player", fromPartyIndex: 0, toPartyIndex: 1 },
    }));
    // HandleAction_Switch/BattleScript_ActionSwitch draw zero; only the
    // trainer hit chain's four draws plus BattleTurnPassed's one boundary
    // draw remain (battle_util.c:294-311; battle_main.c:4013).
    expect(result.state.rng.calls).toBe(5);
  });

  it("player voluntary switch clears the outgoing mon's revealed ability and used moves before the next AI sync", () => {
    const initial = stageSwitchHistory(
      createFactoryFullTurnBattleState(config({
        player: {
          species: 1, moveId: STRENGTH, lastMove: STRENGTH,
          attack: 80, defense: 200, spAttack: 80, spDefense: 200,
          speed: 200, hp: 300,
        },
        trainer: {
          species: 43, moveId: STRENGTH,
          attack: 20, defense: 200, spAttack: 20, spDefense: 200,
          speed: 1, hp: 300,
        },
        playerBenchHp: [200, 0],
        playerBenchOverride: [{
          species: 95, abilityNum: 0, moves: [EARTHQUAKE, 0, 0, 0],
          maxHP: 200, attack: 100, defense: 200, speed: 50,
          spAttack: 40, spDefense: 100,
        }, undefined],
      })),
      0,
      ABILITY_OVERGROW,
      STRENGTH,
    );
    let history = syncFactoryAiBattleHistory(
      createFactoryAiBattleHistory(initial.rules.rulesContext),
      initial.rules.rulesContext,
    );
    expect(history.knownAbilities[0]).toBe("ABILITY_OVERGROW");
    expect(history.usedMoves[0]).toEqual([STRENGTH]);

    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command");
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: TRAINER_ATTACKS,
    });
    if (result.kind !== "decision-required") throw new Error("expected next player command");

    const rules = result.state.rules.rulesContext;
    expect(rules.battlers[0]).toMatchObject({ species: 95, partyIndex: 1 });
    expect(rules.aiObservedAbilityIds[0]).toBe(0);
    expect(rules.moveHistory.lastMoves[0]).toBe(0);
    history = syncFactoryAiBattleHistory(history, rules);
    expect(history.knownAbilities[0]).toBeNull();
    expect(history.usedMoves[0]).toEqual([]);
  });

  it("reaches the named Pursuit-interception unsupported-branch instead of mis-ordering an ordinary hit", () => {
    const initial = createFactoryFullTurnBattleState(switchTurnConfig(228));
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command");
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: TRAINER_ATTACKS,
    });
    expect(result.kind).toBe("machine-barrier");
    if (result.kind !== "machine-barrier") throw new Error("expected pursuit barrier");
    expect(result.barrier).toMatchObject({
      opcodeName: "B_SCR_OP_JUMPIFNOPURSUITSWITCHDMG",
      dispatcher: "Cmd_jumpifnopursuitswitchdmg",
    });
    expect(result.state.rng.calls).toBe(0);
  });

  function trainerSwitchTurnConfig(playerMoveId = STRENGTH): FactoryFullTurnConfig {
    return config({
      player: {
        species: 1, moveId: playerMoveId, attack: 100, defense: 100,
        spAttack: 100, spDefense: 100, speed: 50, hp: 300,
      },
      trainer: {
        species: 43, moveId: STRENGTH, attack: 100, defense: 100,
        spAttack: 100, spDefense: 100, speed: 50, hp: 300,
      },
      trainerBenchHp: [200, 0],
      trainerBenchOverride: [{
        species: 66, moves: [2, 0, 0, 0],
        maxHP: 200, attack: 100, defense: 200, speed: 50,
        spAttack: 100, spDefense: 100,
      }, undefined],
    });
  }

  it("runs a trainer switch before an equal-speed player move, draws no switch/tie RNG, and redirects the hit to the incoming mon", () => {
    const initial = createFactoryFullTurnBattleState(trainerSwitchTurnConfig());
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ATTACKS,
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command");
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (result.kind !== "decision-required") throw new Error("expected next player command");
    const rc = result.state.rules.rulesContext;
    expect(rc.battlers[1]).toMatchObject({
      species: 66,
      partyIndex: 1,
    });
    expect(rc.battlers[1]!.hp).toBeLessThan(200);
    expect(rc.party.opponent[1]!.hp).toBe(rc.battlers[1]!.hp);
    expect(rc.party.opponent[0]!.hp).toBe(300);
    expect(result.events).toContainEqual(expect.objectContaining({
      payload: { kind: "switch", side: "opponent", fromPartyIndex: 0, toPartyIndex: 1 },
    }));
    // The player hit chain owns four draws and BattleTurnPassed owns one.
    // The already-selected trainer switch and the bypassed speed tie own zero.
    expect(result.state.rng.calls).toBe(5);
  });

  it("trainer voluntary switch clears only the trainer battler's revealed ability and last move", () => {
    const initial = stageSwitchHistory(
      stageSwitchHistory(
        createFactoryFullTurnBattleState(trainerSwitchTurnConfig()),
        0,
        ABILITY_OVERGROW,
        EARTHQUAKE,
      ),
      1,
      ABILITY_INTIMIDATE,
      STRENGTH,
    );
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ATTACKS,
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command");
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (result.kind !== "decision-required") throw new Error("expected next player command");
    const rules = result.state.rules.rulesContext;
    expect(rules.battlers[1]).toMatchObject({ species: 66, partyIndex: 1 });
    expect(rules.aiObservedAbilityIds).toEqual([ABILITY_OVERGROW, 0, 0, 0]);
    expect(rules.moveHistory.lastMoves[1]).toBe(0);
    // The player's selected attack ran after the switch; its own durable
    // history is not part of the trainer battler's source clear.
    expect(rules.moveHistory.lastMoves[0]).toBe(STRENGTH);
  });

  it("symmetrically barriers when a player's selected Pursuit intercepts the trainer switch", () => {
    const initial = createFactoryFullTurnBattleState(trainerSwitchTurnConfig(228));
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_ATTACKS,
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command");
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "switch", partyIndex: 1 },
    });
    expect(result.kind).toBe("machine-barrier");
    if (result.kind !== "machine-barrier") throw new Error("expected pursuit barrier");
    expect(result.barrier).toMatchObject({
      opcodeName: "B_SCR_OP_JUMPIFNOPURSUITSWITCHDMG",
      dispatcher: "Cmd_jumpifnopursuitswitchdmg",
    });
    expect(result.state.rng.calls).toBe(0);
  });

  it("orders dual switches by battler and draws only the continuing-turn boundary RNG", () => {
    const initial = createFactoryFullTurnBattleState({
      ...trainerSwitchTurnConfig(),
      playerBenchHp: [200, 0],
      playerBenchOverride: [{
        species: 66, moves: [2, 0, 0, 0],
        maxHP: 200, attack: 100, defense: 200, speed: 50,
        spAttack: 100, spDefense: 100,
      }, undefined],
    });
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer command");
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (result.kind !== "decision-required") throw new Error("expected next player command");
    expect(result.events.flatMap(({ payload }) =>
      payload.kind === "switch" ? [payload.side] : []
    )).toEqual(["player", "opponent"]);
    expect(result.state.rules.rulesContext.battlers[0]!.partyIndex).toBe(1);
    expect(result.state.rules.rulesContext.battlers[1]!.partyIndex).toBe(1);
    expect(result.state.rng.calls).toBe(1);
  });
});

function speedOrderConfig({
  playerSpeed,
  trainerSpeed,
  playerAbility = 0,
  trainerAbility = 0,
  playerStatus1 = 0,
  playerItem = 0,
  weather = 0,
}: Readonly<{
  playerSpeed: number;
  trainerSpeed: number;
  playerAbility?: number;
  trainerAbility?: number;
  playerStatus1?: number;
  playerItem?: number;
  weather?: number;
}>): FactoryFullTurnConfig {
  return config({
    weather,
    player: {
      species: 283,
      moveId: STRENGTH,
      ability: playerAbility,
      item: playerItem,
      status1: playerStatus1,
      attack: 50,
      defense: 200,
      spAttack: 50,
      spDefense: 200,
      speed: playerSpeed,
      hp: 999,
    },
    trainer: {
      species: 235,
      moveId: STRENGTH,
      ability: trainerAbility,
      attack: 50,
      defense: 200,
      spAttack: 50,
      spDefense: 200,
      speed: trainerSpeed,
      hp: 999,
    },
  });
}

function runSpeedOrderTurn(turnConfig: FactoryFullTurnConfig): Readonly<{
  ppOrder: readonly number[];
  rngCalls: number;
}> {
  const initial = createFactoryFullTurnBattleState(turnConfig);
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: PLAYER_ATTACKS,
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer decision");
  const result = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: TRAINER_ATTACKS,
  });
  if (result.kind !== "decision-required") throw new Error("expected next-turn decision");
  const ppOrder = result.events.flatMap(({ payload }) =>
    payload.kind === "set-battler-pp-data" ? [payload.battler] : []
  );
  return Object.freeze({ ppOrder, rngCalls: result.state.rng.calls });
}

describe("factory full-turn decision -- GetWhoStrikesFirst production inputs", () => {
  it("threads Swift Swim and live rain so Surskit-shaped speed 76 flips a Smeargle-shaped speed 95 matchup", () => {
    const dry = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 76,
      trainerSpeed: 95,
      playerAbility: ABILITY_SWIFT_SWIM,
    }));
    const rain = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 76,
      trainerSpeed: 95,
      playerAbility: ABILITY_SWIFT_SWIM,
      weather: B_WEATHER_RAIN,
    }));
    expect(dry.ppOrder.slice(0, 2)).toEqual([1, 0]);
    expect(rain.ppOrder.slice(0, 2)).toEqual([0, 1]);
    expect([dry.rngCalls, rain.rngCalls]).toEqual([9, 9]);
  });

  it("threads Chlorophyll and live sun through the equivalent 76 -> 152 effective-speed flip", () => {
    const noSun = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 76,
      trainerSpeed: 95,
      playerAbility: ABILITY_CHLOROPHYLL,
    }));
    const sun = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 76,
      trainerSpeed: 95,
      playerAbility: ABILITY_CHLOROPHYLL,
      weather: B_WEATHER_SUN,
    }));
    expect(noSun.ppOrder.slice(0, 2)).toEqual([1, 0]);
    expect(sun.ppOrder.slice(0, 2)).toEqual([0, 1]);
    expect([noSun.rngCalls, sun.rngCalls]).toEqual([9, 9]);
  });

  it("reuses WEATHER_HAS_EFFECT: opposing Cloud Nine suppresses Swift Swim's rain doubling", () => {
    const suppressed = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 76,
      trainerSpeed: 95,
      playerAbility: ABILITY_SWIFT_SWIM,
      trainerAbility: ABILITY_CLOUD_NINE,
      weather: B_WEATHER_RAIN,
    }));
    expect(suppressed.ppOrder.slice(0, 2)).toEqual([1, 0]);
    expect(suppressed.rngCalls).toBe(9);
  });

  it("threads the real STATUS1_PARALYSIS bit and quarters speed after weather/stages", () => {
    const healthy = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 152,
      trainerSpeed: 95,
    }));
    const paralyzed = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 152,
      trainerSpeed: 95,
      playerStatus1: STATUS1_PARALYSIS,
    }));
    expect(healthy.ppOrder.slice(0, 2)).toEqual([0, 1]);
    expect(paralyzed.ppOrder.slice(0, 2)).toEqual([1, 0]);
    expect(healthy.rngCalls).toBe(9);
    // The ninth draw is the existing AtkCanceler_UnableToUseMove paralysis
    // admission roll; the tenth is BattleTurnPassed's boundary draw. A
    // mistaken turn-order tie would add another (11).
    expect(paralyzed.rngCalls).toBe(10);
  });

  it("resolves Macho Brace's real item hold effect and halves speed through the call site", () => {
    const unheld = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 152,
      trainerSpeed: 95,
    }));
    const braced = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 152,
      trainerSpeed: 95,
      playerItem: ITEM_MACHO_BRACE,
    }));
    expect(unheld.ppOrder.slice(0, 2)).toEqual([0, 1]);
    expect(braced.ppOrder.slice(0, 2)).toEqual([1, 0]);
    expect([unheld.rngCalls, braced.rngCalls]).toEqual([9, 9]);
  });

  it("reads the staged gRandomTurnNumber for Quick Claw without a turn-order redraw", () => {
    const proc = runSpeedOrderTurn({
      ...speedOrderConfig({
        playerSpeed: 45,
        trainerSpeed: 95,
        playerItem: ITEM_QUICK_CLAW,
      }),
      initialRandomTurnNumber: 13106,
    });
    const noProc = runSpeedOrderTurn({
      ...speedOrderConfig({
        playerSpeed: 45,
        trainerSpeed: 95,
        playerItem: ITEM_QUICK_CLAW,
      }),
      initialRandomTurnNumber: 13107,
    });
    expect(proc.ppOrder.slice(0, 2)).toEqual([0, 1]);
    expect(noProc.ppOrder.slice(0, 2)).toEqual([1, 0]);
    // Eight ordinary hit-chain draws plus the one unconditional boundary
    // draw in both cases: Quick Claw only reads the stored turn value.
    expect([proc.rngCalls, noProc.rngCalls]).toEqual([9, 9]);
  });

  it("preserves the existing speed-tie contract: exactly one turn-order draw, and none for a one-point non-tie", () => {
    const tie = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 95,
      trainerSpeed: 95,
    }));
    const nonTie = runSpeedOrderTurn(speedOrderConfig({
      playerSpeed: 96,
      trainerSpeed: 95,
    }));
    expect(tie.ppOrder.slice(0, 2)).toHaveLength(2);
    expect(nonTie.ppOrder.slice(0, 2)).toEqual([0, 1]);
    expect(tie.rngCalls).toBe(10);
    expect(nonTie.rngCalls).toBe(9);
  });
});

describe("factory full-turn decision -- decision -> both actions -> end-turn -> next decision boundary", () => {
  it("places BattleTurnPassed's stored draw at ROM ledger positions 5 and 19 across the overlapping two-turn shape", () => {
    // Typed directly from docs/ability-item-speed-scout.md §B5's ROM table:
    // four turn-1 move draws, boundary, five turn-2 AI draws, eight turn-2
    // move draws, boundary. The policy span is advanced explicitly because
    // this reducer is decision-source-agnostic.
    const expectedPositions = Object.freeze([
      "turn-1 accuracy", "turn-1 crit", "turn-1 damage", "turn-1 effect",
      "turn-2 boundary",
      "turn-2 AI setup 1", "turn-2 AI setup 2", "turn-2 AI setup 3",
      "turn-2 AI setup 4", "turn-2 AI move tie",
      "turn-2 player accuracy", "turn-2 player crit", "turn-2 player damage",
      "turn-2 player effect", "turn-2 trainer accuracy", "turn-2 trainer crit",
      "turn-2 trainer damage", "turn-2 trainer effect",
      "turn-3 boundary",
    ] as const);
    expect(expectedPositions[4]).toBe("turn-2 boundary");
    expect(expectedPositions[18]).toBe("turn-3 boundary");

    const initial = createFactoryFullTurnBattleState(config({
      player: {
        species: 1,
        moveId: RAIN_DANCE,
        moves: [RAIN_DANCE, STRENGTH, 0, 0],
        pp: [5, 15, 0, 0],
        attack: 50, defense: 200, spAttack: 50, spDefense: 200,
        speed: 100, hp: 999,
      },
      trainer: {
        species: 43, moveId: STRENGTH, attack: 50, defense: 200,
        spAttack: 50, spDefense: 200, speed: 50, hp: 999,
      },
    }));
    const afterPlayer1 = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    if (afterPlayer1.kind !== "decision-required") throw new Error("expected trainer decision");
    const afterTurn1 = submitFactoryFullTurnDecision(afterPlayer1.state, {
      requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
    });
    if (afterTurn1.kind !== "decision-required") throw new Error("expected turn-2 player decision");
    expect(afterTurn1.state.rng.calls).toBe(5);
    expect(afterTurn1.state.rules.rulesContext.randomTurnNumber)
      .toBe((afterTurn1.state.rng.value >>> 16) & 0xffff);

    let afterAiValue = afterTurn1.state.rng.value;
    for (let position = 6; position <= 10; position++) {
      expect(expectedPositions[position - 1]).toMatch(/^turn-2 AI/);
      afterAiValue = advanceRngValue(afterAiValue);
    }
    const afterAiState = Object.freeze({
      ...afterTurn1.state,
      rng: Object.freeze({ value: afterAiValue, calls: 10 }),
    });
    const afterPlayer2 = submitFactoryFullTurnDecision(afterAiState, {
      requestId: 3, side: "player",
      decision: { kind: "use-move", moveSlot: 1, targetBattler: 1 },
    });
    if (afterPlayer2.kind !== "decision-required") throw new Error("expected trainer decision");
    const afterTurn2 = submitFactoryFullTurnDecision(afterPlayer2.state, {
      requestId: 4, side: "trainer", decision: TRAINER_ATTACKS,
    });
    if (afterTurn2.kind !== "decision-required") throw new Error("expected turn-3 player decision");
    expect(afterTurn2.state.rng.calls).toBe(expectedPositions.length);
    expect(afterTurn2.state.rules.rulesContext.randomTurnNumber)
      .toBe((afterTurn2.state.rng.value >>> 16) & 0xffff);
  });

  it("keeps the second boundary at position 15 when turn 2 is a voluntary switch (the switch action adds no draw)", () => {
    const initial = createFactoryFullTurnBattleState(config({
      player: {
        species: 1, moveId: RAIN_DANCE, attack: 50, defense: 200,
        spAttack: 50, spDefense: 200, speed: 100, hp: 999,
      },
      trainer: {
        species: 43, moveId: STRENGTH, attack: 50, defense: 200,
        spAttack: 50, spDefense: 200, speed: 50, hp: 999,
      },
      playerBenchHp: [999, 0],
      playerBenchOverride: [{
        species: 66, moves: [2, 0, 0, 0], maxHP: 999,
        attack: 100, defense: 200, speed: 50, spAttack: 50, spDefense: 200,
      }, undefined],
    }));
    const afterPlayer1 = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    if (afterPlayer1.kind !== "decision-required") throw new Error("expected trainer decision");
    const afterTurn1 = submitFactoryFullTurnDecision(afterPlayer1.state, {
      requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
    });
    if (afterTurn1.kind !== "decision-required") throw new Error("expected turn-2 player decision");
    expect(afterTurn1.state.rng.calls).toBe(5);

    let afterAiValue = afterTurn1.state.rng.value;
    for (let position = 6; position <= 10; position++) {
      afterAiValue = advanceRngValue(afterAiValue);
    }
    const afterAiState = Object.freeze({
      ...afterTurn1.state,
      rng: Object.freeze({ value: afterAiValue, calls: 10 }),
    });
    const afterPlayer2 = submitFactoryFullTurnDecision(afterAiState, {
      requestId: 3, side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (afterPlayer2.kind !== "decision-required") throw new Error("expected trainer decision");
    const afterTurn2 = submitFactoryFullTurnDecision(afterPlayer2.state, {
      requestId: 4, side: "trainer", decision: TRAINER_ATTACKS,
    });
    if (afterTurn2.kind !== "decision-required") throw new Error("expected turn-3 player decision");
    // positions 11-14 are the trainer's accuracy/crit/damage/effect rolls;
    // position 15 is the one continuing-turn boundary draw.
    expect(afterTurn2.state.rng.calls).toBe(15);
    expect(afterTurn2.state.rules.rulesContext.randomTurnNumber)
      .toBe((afterTurn2.state.rng.value >>> 16) & 0xffff);
  });

  it("excludes and rejects a party-switch command while Mean Look's 0x04000000 trap is active", () => {
    const initial = createFactoryFullTurnBattleState(config({
      player: {
        species: 1,
        moveId: STRENGTH,
        attack: 200,
        defense: 50,
        spAttack: 50,
        spDefense: 50,
        speed: 100,
        hp: 999,
        status2: 1 << 26,
      },
      playerBenchHp: [100, 0],
    }));
    if (initial.boundary.kind !== "decision-required") throw new Error("expected command request");
    expect(initial.boundary.request.kind).toBe("command");
    if (initial.boundary.request.kind !== "command") throw new Error("expected command request");
    expect(initial.boundary.request.legalDecisions).not.toContainEqual({
      kind: "switch",
      partyIndex: 1,
    });
    expect(() => submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    })).toThrow(/not legal/);
  });

  it("makes Stomp deal greater damage after Minimize than after a same-seed +1-evasion Double Team control", () => {
    const run = (playerMove: typeof MINIMIZE | typeof DOUBLE_TEAM) => {
      const initial = createFactoryFullTurnBattleState(config({
        player: {
          species: 120, moveId: playerMove, attack: 50, defense: 200,
          pp: [20, 0, 0, 0], spAttack: 50, spDefense: 200, speed: 100, hp: 999,
        },
        trainer: {
          species: 203, moveId: STOMP, attack: 50, defense: 200,
          pp: [20, 0, 0, 0], spAttack: 50, spDefense: 200, speed: 50, hp: 999,
        },
      }));
      expect(initial.rules.rulesContext.battlers[0]!.status3).toBe(0);
      expect(initial.rules.rulesContext.battlers[1]!.status3).toBe(0);
      const afterPlayer = submitFactoryFullTurnDecision(initial, {
        requestId: 1,
        side: "player",
        decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
      });
      if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer decision");
      const result = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: 2,
        side: "trainer",
        decision: TRAINER_ATTACKS,
      });
      if (result.kind !== "decision-required") throw new Error("expected next-turn decision");
      return result.state.rules.rulesContext;
    };

    const minimized = run(MINIMIZE);
    const control = run(DOUBLE_TEAM);
    expect(minimized.battlers[0]!.pp[0]).toBe(19);
    expect(control.battlers[0]!.pp[0]).toBe(19);
    expect(minimized.battlers[0]!.statStages[7]).toBe(7);
    expect(control.battlers[0]!.statStages[7]).toBe(7);
    expect(minimized.battlers[0]!.status3 & BATTLE_SCRIPT_STATUS3_MINIMIZED)
      .toBe(BATTLE_SCRIPT_STATUS3_MINIMIZED);
    expect(control.battlers[0]!.status3 & BATTLE_SCRIPT_STATUS3_MINIMIZED).toBe(0);
    expect(minimized.battlers[1]!.pp[0]).toBe(19);
    expect(control.battlers[1]!.pp[0]).toBe(19);
    expect(minimized.battlers[0]!.hp).toBe(974);
    expect(control.battlers[0]!.hp).toBe(987);
    expect(999 - minimized.battlers[0]!.hp).toBeGreaterThan(999 - control.battlers[0]!.hp);
    expect(minimized.lockedMoves).toEqual([0, 0, 0, 0]);
    expect(control.lockedMoves).toEqual([0, 0, 0, 0]);
  });

  it("asks the player, then the trainer, before resolving anything (both sides collected before turn order)", () => {
    const initial = createFactoryFullTurnBattleState(config());
    expect(initial.boundary).toEqual({
      kind: "decision-required",
      request: {
        kind: "command", requestId: 1, side: "player", battler: 0,
        legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
      },
    });
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: PLAYER_ATTACKS,
    });
    expect(afterPlayer.kind).toBe("decision-required");
    if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");
    expect(afterPlayer.nextRequest).toEqual({
      kind: "command", requestId: 2, side: "trainer", battler: 1,
      legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }],
    });
    // Collecting the player's action alone must not execute anything yet.
    expect(afterPlayer.state.rng.calls).toBe(0);
    expect(afterPlayer.events.length).toBe(0);
  });

  it(
    "publishes every configured nonzero player slot at the initial and next-turn boundaries, "
      + "then executes a nonzero submitted slot with exact position, PP, and interpreter provenance",
    () => {
      const slotGenericConfig = config({
        player: {
          species: 1,
          moveId: STRENGTH,
          moves: [STRENGTH, 0, EMBER, FRUSTRATION],
          pp: [16, 0, 25, 20],
          friendship: 0,
          attack: 50,
          defense: 200,
          spAttack: 50,
          spDefense: 200,
          speed: 50,
          hp: 999,
        },
        trainer: {
          species: 43,
          moveId: STRENGTH,
          attack: 50,
          defense: 200,
          spAttack: 50,
          spDefense: 200,
          speed: 100,
          hp: 999,
        },
      });
      const playerLegalDecisions = [
        { kind: "use-move", moveSlot: 0, targetBattler: 1 },
        { kind: "use-move", moveSlot: 2, targetBattler: 1 },
        { kind: "use-move", moveSlot: 3, targetBattler: 1 },
      ];
      const initial = createFactoryFullTurnBattleState(slotGenericConfig);
      expect(initial.boundary).toEqual({
        kind: "decision-required",
        request: {
          kind: "command",
          requestId: 1,
          side: "player",
          battler: 0,
          legalDecisions: playerLegalDecisions,
        },
      });
      expect(() => submitFactoryFullTurnDecision(initial, {
        requestId: 1,
        side: "player",
        decision: { kind: "use-move", moveSlot: 1, targetBattler: 1 },
      })).toThrow(/not legal for current command request/);

      const afterPlayer = submitFactoryFullTurnDecision(initial, {
        requestId: 1,
        side: "player",
        decision: { kind: "use-move", moveSlot: 3, targetBattler: 1 },
      });
      if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer decision");
      expect(afterPlayer.nextRequest).toEqual({
        kind: "command",
        requestId: 2,
        side: "trainer",
        battler: 1,
        legalDecisions: [
          { kind: "use-move", moveSlot: 0, targetBattler: 0 },
        ],
      });

      const result = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: 2,
        side: "trainer",
        decision: TRAINER_ATTACKS,
      });
      if (result.kind !== "decision-required") throw new Error("expected next-turn player decision");
      expect(result.nextRequest).toEqual({
        kind: "command",
        requestId: 3,
        side: "player",
        battler: 0,
        legalDecisions: playerLegalDecisions,
      });

      const rulesContext = result.state.rules.rulesContext;
      expect(rulesContext.currentMovePosition).toBe(3);
      expect(rulesContext.battlers[0]!.pp).toEqual([16, 0, 25, 19]);
      const playerPpEvent = result.events.find(({ payload }) =>
        payload.kind === "set-battler-pp-data"
        && payload.battler === 0
      );
      expect(playerPpEvent).toEqual(expect.objectContaining({
        payload: {
          kind: "set-battler-pp-data",
          battler: 0,
          movePosition: 3,
          pp: 19,
        },
        provenance: expect.objectContaining({
          sourceLabel: "BattleScript_HitFromAtkString",
          opcodeName: "B_SCR_OP_PPREDUCE",
        }),
      }));
    },
  );

  it(
    "a full two-turn cycle: real GetWhoStrikesFirst order (player speed 100 > trainer speed 50, no tie), "
      + "each hit chain's own 4-roll ledger (accuracy/crit/damage/seteffectwithchance), runBattleEndTurnOrchestration, "
      + "then a coherent next decision boundary -- proving the LCG stream stays single and continuous across turns",
    () => {
      let state = createFactoryFullTurnBattleState(config());

      const t1p = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: PLAYER_ATTACKS });
      if (t1p.kind !== "decision-required") throw new Error("expected decision-required");
      state = t1p.state;
      const t1t = submitFactoryFullTurnDecision(state, { requestId: 2, side: "trainer", decision: TRAINER_ATTACKS });
      if (t1t.kind !== "decision-required") throw new Error("expected decision-required after turn 1");
      state = t1t.state;

      // Player moves first (faster): 200 Atk -> 50 Def Strength lands for 204, dealing exactly that (999 -> 795).
      // Trainer then hits back: 50 Atk -> 50 Def Strength for 49 (999 -> 950). 4 rolls per hit chain, 8 total.
      const rc1 = (t1t.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect((rc1.battlers as Array<{ hp: number }>)[0]!.hp).toBe(950);
      expect((rc1.battlers as Array<{ hp: number }>)[1]!.hp).toBe(795);
      expect(rc1.battleOutcome).toBe(0);
      expect(t1t.state.rng.calls).toBe(9);
      expect(t1t.nextRequest).toEqual({
        kind: "command", requestId: 3, side: "player", battler: 0,
        legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
      });

      const t2p = submitFactoryFullTurnDecision(state, { requestId: 3, side: "player", decision: PLAYER_ATTACKS });
      if (t2p.kind !== "decision-required") throw new Error("expected decision-required");
      state = t2p.state;
      const t2t = submitFactoryFullTurnDecision(state, { requestId: 4, side: "trainer", decision: TRAINER_ATTACKS });
      if (t2t.kind !== "decision-required") throw new Error("expected decision-required after turn 2");

      // Turn 2 repeats the SAME mechanism from the ROM-faithful stream after
      // BattleTurnPassed's intervening draw (re-derived by direct replay).
      const rc2 = (t2t.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect((rc2.battlers as Array<{ hp: number }>)[0]!.hp).toBe(898);
      expect((rc2.battlers as Array<{ hp: number }>)[1]!.hp).toBe(591);
      expect(rc2.battleOutcome).toBe(0);
      expect(t2t.state.rng.calls).toBe(18); // cumulative across both turns, including one BattleTurnPassed draw per boundary.
      expect(t2t.nextRequest).toEqual({
        kind: "command", requestId: 5, side: "player", battler: 0,
        legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
      });
    },
  );

  it(
    "burn ticks between turns: applied via a REAL Ember MOVE_EFFECT_BURN proc on turn 1, "
      + "then floor(maxHP/8) at both end-turns (flat, no growing counter -- unlike Toxic)",
    () => {
      const burnConfig = config({
        rngSeed: BURN_PROC_RNG_SEED,
        player: {
          species: 1, moveId: EMBER, attack: 50, defense: 50, spAttack: 60, spDefense: 50, speed: 100, hp: 999,
        },
        trainer: {
          species: 43, moveId: STRENGTH, attack: 40, defense: 200, spAttack: 50, spDefense: 200, speed: 50, hp: 999,
        },
      });
      let state = createFactoryFullTurnBattleState(burnConfig);

      const t1p = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: PLAYER_ATTACKS });
      if (t1p.kind !== "decision-required") throw new Error("expected decision-required");
      state = t1p.state;
      const t1t = submitFactoryFullTurnDecision(state, { requestId: 2, side: "trainer", decision: TRAINER_ATTACKS });
      if (t1t.kind !== "decision-required") throw new Error("expected decision-required after turn 1");
      state = t1t.state;

      const rc1 = (t1t.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect((rc1.battlers as Array<{ status1: number }>)[1]!.status1 & STATUS1_BURN).toBe(STATUS1_BURN);
      expect((rc1.battlers as Array<{ hp: number }>)[1]!.hp).toBe(869); // Ember's own chip damage + tick 1's floor(999/8)=124.
      expect((rc1.battlers as Array<{ hp: number }>)[0]!.hp).toBe(978);
      // The LAST damage precompute this turn is the end-turn tick's own (runs strictly after both actions) --
      // floor(999/8) = 124, decoupled from Ember's own hit-chain damage roll.
      expect(rc1.battleMoveDamage).toBe(124);
      expect(rc1.hpDealt).toBe(124);
      expect((rc1.party as { opponent: ReadonlyArray<{ hp: number; status1: number }> }).opponent[0]).toMatchObject({
        hp: 869,
        status1: STATUS1_BURN,
      });

      const t2p = submitFactoryFullTurnDecision(state, { requestId: 3, side: "player", decision: PLAYER_ATTACKS });
      if (t2p.kind !== "decision-required") throw new Error("expected decision-required");
      state = t2p.state;
      const t2t = submitFactoryFullTurnDecision(state, { requestId: 4, side: "trainer", decision: TRAINER_ATTACKS });
      if (t2t.kind !== "decision-required") throw new Error("expected decision-required after turn 2");

      const rc2 = (t2t.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect((rc2.battlers as Array<{ status1: number }>)[1]!.status1 & STATUS1_BURN).toBe(STATUS1_BURN);
      expect((rc2.battlers as Array<{ hp: number }>)[1]!.hp).toBe(739); // 869 -> 739, same total drop as turn 1: recurrence.
      // Turn 2's own tick is the SAME flat floor(999/8) = 124 -- no growth (Toxic's own counter is the only status that grows, docs/end-turn-ground-truth.md §2b).
      expect(rc2.battleMoveDamage).toBe(124);
    },
  );

  it(
    "clears one action's dynamic power before the next mover: low-HP Flail and friendship-powered Frustration cannot strengthen "
      + "the trainer's ordinary Strength (HandleAction_ActionFinished, battle_util.c:678)",
    () => {
      const sharedPlayer = {
        species: 1,
        attack: 50,
        defense: 200,
        spAttack: 50,
        spDefense: 200,
        speed: 100,
        hp: 100,
        maxHp: 10_000,
      };
      const sharedTrainer = {
        species: 43,
        moveId: STRENGTH,
        attack: 50,
        defense: 200,
        spAttack: 50,
        spDefense: 200,
        speed: 50,
        hp: 999,
      };

      const runTurn = (playerMoveId: number) => {
        const initial = createFactoryFullTurnBattleState(config({
          player: { ...sharedPlayer, moveId: playerMoveId },
          trainer: sharedTrainer,
        }));
        const afterPlayer = submitFactoryFullTurnDecision(initial, {
          requestId: 1,
          side: "player",
          decision: PLAYER_ATTACKS,
        });
        if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer decision");
        const result = submitFactoryFullTurnDecision(afterPlayer.state, {
          requestId: 2,
          side: "trainer",
          decision: TRAINER_ATTACKS,
        });
        if (result.kind !== "decision-required") throw new Error("expected next-turn decision");
        return (result.state.rules as {
          rulesContext: {
            dynamicBasePower: number;
            battlers: ReadonlyArray<{ hp: number }>;
          };
        }).rulesContext;
      };

      const afterFlail = runTurn(FLAIL);
      const afterFrustration = runTurn(FRUSTRATION);
      const ordinaryControl = runTurn(STRENGTH);
      expect(afterFlail.battlers[0]!.hp).toBe(ordinaryControl.battlers[0]!.hp);
      expect(afterFrustration.battlers[0]!.hp).toBe(ordinaryControl.battlers[0]!.hp);
      expect(afterFlail.dynamicBasePower).toBe(0);
      expect(afterFrustration.dynamicBasePower).toBe(0);
      expect(ordinaryControl.dynamicBasePower).toBe(0);
    },
  );

  it(
    "mid-turn KO on the first action: the second action is skipped per source "
      + "(RunTurnActionsFunctions, battle_main.c:4937-4943 forces B_ACTION_FINISHED once gBattleOutcome != 0; "
      + "the same rule the singles forced-switch fork's own cancelallactions enforces for the non-terminal case), "
      + "the faint fork runs, and the terminal boundary is reported directly -- runBattleEndTurnOrchestration never runs "
      + "(source's own sEndTurnFuncsTable only reaches BattleTurnPassed when gBattleOutcome stays 0)",
    () => {
      const koConfig = config({
        player: {
          species: 1, moveId: STRENGTH, attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 100,
        },
        trainer: {
          species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 90,
        },
      });
      const initial = createFactoryFullTurnBattleState(koConfig);
      const afterPlayer = submitFactoryFullTurnDecision(initial, {
        requestId: 1, side: "player", decision: PLAYER_ATTACKS,
      });
      if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");

      const result = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
      });
      expect(result.kind).toBe("terminal");
      if (result.kind !== "terminal") throw new Error("expected terminal");
      expect(result.outcome).toBe("player-win");
      expect(result.state.boundary).toEqual({ kind: "terminal", outcome: "player-win" });

      // Exactly the killing blow's own 4-roll ledger (accuracy, crit, adjustnormaldamage, seteffectwithchance) --
      // the trainer's own chosen Strength never runs, so it draws zero further RNG.
      expect(result.state.rng.calls).toBe(4);

      const rulesContext = (result.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect(rulesContext.battleOutcome).toBe(1); // B_OUTCOME_WON, computed by checkteamslost, not injected.
      expect((rulesContext.battlers as Array<{ hp: number }>)[1]!.hp).toBe(0);
      // The trainer's own move never dispatched: its PP is still full (16), unlike the player's (15, one use).
      expect((rulesContext.battlers as Array<{ pp: readonly number[] }>)[0]!.pp[0]).toBe(15);
      expect((rulesContext.battlers as Array<{ pp: readonly number[] }>)[1]!.pp[0]).toBe(16);
    },
  );

  it("throws if submitted again once terminal (matches submitBattleDecision's own hard-stop contract)", () => {
    const koConfig = config({
      player: {
        species: 1, moveId: STRENGTH, attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 100,
      },
      trainer: {
        species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 90,
      },
    });
    const initial = createFactoryFullTurnBattleState(koConfig);
    const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: PLAYER_ATTACKS });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");
    const result = submitFactoryFullTurnDecision(afterPlayer.state, { requestId: 2, side: "trainer", decision: TRAINER_ATTACKS });
    if (result.kind !== "terminal") throw new Error("expected terminal");
    expect(() => submitFactoryFullTurnDecision(result.state, { requestId: 2, side: "trainer", decision: TRAINER_ATTACKS })).toThrow();
  });

  it(
    "staged kill-shot LOSS through submitBattleDecision: the trainer's own STRENGTH kills the player's "
      + "last mon (roles mirrored exactly from the WIN mid-turn-KO fixture above, same STRENGTH/200atk/50def "
      + "numbers -- same 204-damage roll, just the opposite side dealing it) -- terminal-seam increment (i) "
      + "LOSS half now runs BattleScript_LocalBattleLost as a real second VM pass through the SAME "
      + "submitFactoryFullTurnDecision entry point the WIN pin above uses, "
      + "docs/terminal-seam-loss-path-ground-truth.md",
    () => {
      const lossConfig = config({
        player: {
          species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 90,
        },
        trainer: {
          species: 1, moveId: STRENGTH, attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 999,
        },
      });
      const initial = createFactoryFullTurnBattleState(lossConfig);
      const afterPlayer = submitFactoryFullTurnDecision(initial, {
        requestId: 1, side: "player", decision: PLAYER_ATTACKS,
      });
      if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");

      const result = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
      });
      expect(result.kind).toBe("terminal");
      if (result.kind !== "terminal") throw new Error("expected terminal");
      expect(result.outcome).toBe("trainer-win");
      expect(result.state.boundary).toEqual({ kind: "terminal", outcome: "trainer-win" });

      // The trainer (speed 100) moves first and KOs the player outright, so
      // the player's own queued Strength never dispatches -- same
      // "mid-turn KO skips the second action" rule the WIN pin's own comment
      // cites (RunTurnActionsFunctions, battle_main.c:4937-4943).
      expect(result.state.rng.calls).toBe(4);

      const rulesContext = (result.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
      expect(rulesContext.battleOutcome).toBe(2); // B_OUTCOME_LOST, computed by checkteamslost, not injected.
      expect((rulesContext.battlers as Array<{ hp: number }>)[0]!.hp).toBe(0);
      expect((rulesContext.battlers as Array<{ pp: readonly number[] }>)[0]!.pp[0]).toBe(16); // player's own move never dispatched
      expect((rulesContext.battlers as Array<{ pp: readonly number[] }>)[1]!.pp[0]).toBe(15);

      // The new boundary's event sequence: VARIOUS_RETURN_OPPONENT_MON1
      // recalling the (still-alive, hp 999) trainer's own battler 1, then the
      // trainer sliding in, then the resolved win-text id -- source-exact
      // order, zero renderer/presentation consumption asserted here. Filtered
      // to `invisible: true` specifically: the ordinary fainted-mon handling
      // ahead of this (HandleFaintedMon's own ClearSpritesVisibility-style
      // makevisible resets) emits two unrelated `invisible: false` events for
      // both battlers first -- ordinary events this pin isn't about.
      const compactSequence = result.events
        .filter((event) =>
          (event.payload.kind === "set-battler-sprite-visibility" && event.payload.invisible)
          || event.payload.kind === "trainer-slide-in"
          || (event.payload.kind === "message" && event.payload.messageId === "STRINGID_TRAINER1WINTEXT"))
        .map((event) => {
          if (event.payload.kind === "set-battler-sprite-visibility") {
            return `recall:${event.payload.battler}`;
          }
          if (event.payload.kind === "trainer-slide-in") {
            return `slide-in:${event.payload.battler}`;
          }
          return `message:${(event.payload as Readonly<{ messageId: string }>).messageId}`;
        });
      expect(compactSequence).toEqual(["recall:1", "slide-in:1", "message:STRINGID_TRAINER1WINTEXT"]);
    },
  );
});

describe(
  "factory full-turn decision -- real Factory AI (mask 7) trainer decisions via submitFactoryAiDecision "
    + "(item 1: the kernel stays decision-source-agnostic -- the SAME reduceFactoryFullTurnDecision reducer, "
    + "just entered through the policy's own RNG-synchronizing composition instead of a test-supplied submission)",
  () => {
    const PLAYER_ATTACKS_TRAINER = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const });

    it(
      "two real turns: each turn the trainer's move is chosen by the live mask-7 policy from a real 4-move "
        + "set (Surf/RockSlide/BodySlam/Thunderbolt) -- Surf wins unambiguously both times (it strictly "
        + "out-damages the other three against this Ground-type target, no tie to break) -- with the complete "
        + "per-turn draw ledger (policy draws + both hit chains) pinned as ONE continuous LCG stream",
      () => {
        let state = createFactoryFullTurnBattleState(aiTrainerConfig());

        // Turn 1, action 1: the player's own real hit chain (test-supplied, as before -- only the TRAINER side changes).
        const t1p = submitFactoryFullTurnDecision(state, {
          requestId: 1, side: "player", decision: PLAYER_ATTACKS_TRAINER,
        });
        if (t1p.kind !== "decision-required") throw new Error("expected decision-required");
        expect(t1p.nextRequest.side).toBe("trainer");
        state = t1p.state;

        // Turn 1, action 2: the trainer's decision comes from the REAL policy, not a test-supplied submission.
        const t1PlayerHp = (t1p.state.rules as { rulesContext: { battlers: ReadonlyArray<{ hp: number }> } })
          .rulesContext.battlers[0]!.hp;
        expect(t1PlayerHp).toBe(999); // the player's own move never damages itself
        const t1Ai = submitFactoryAiDecision(state, aiTrainerView(t1PlayerHp), reduceFactoryFullTurnDecision);
        expect(t1Ai.trace.mask).toBe(7);
        expect(t1Ai.trace.executedScoringScripts).toEqual(["check-bad-move", "try-to-faint", "check-viability"]);
        // setup(4) + CBM get_ability (2 per non-immune slot x 3 = 6) + tie(1) -- zero from
        // TryToFaint/CheckViability (Surf's own damage estimate dwarfs the other three at 999 HP,
        // so every slot resolves via the cannot-faint/most-powerful compare, no extra Random() calls).
        expect(t1Ai.trace.draws).toHaveLength(11);
        expect(t1Ai.trace.slotScores.map((s) => s.finalScore)).toEqual([100, 99, 99, 89]);
        expect(t1Ai.trace.bestMoveSlots).toEqual([0]); // Surf, the ONLY best slot -- no tie to break
        expect(t1Ai.submission.decision).toEqual({ kind: "use-move", moveSlot: 0, targetBattler: 0 });

        const t1 = t1Ai.transition;
        expect(t1.kind).toBe("decision-required");
        if (t1.kind !== "decision-required") throw new Error("expected decision-required after turn 1");
        expect(t1.nextRequest.side).toBe("player");
        // The whole-battle cumulative cursor: 11 policy draws + 4 (player's Strength hit chain)
        // + 4 (trainer's real Surf hit chain, chosen by the policy) + 1
        // BattleTurnPassed boundary draw = 20.
        expect(t1.state.rng.calls).toBe(20);
        const rc1 = (t1.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
        expect(rc1.battleOutcome).toBe(0);
        const rc1Battlers = rc1.battlers as ReadonlyArray<{ hp: number }>;
        // Pinned by direct replay (KO_SCENARIO_RNG_SEED's own real LCG stream), not hand-derived --
        // player's Strength (Atk130 -> Def65, no STAB) then the AI's own real chosen Surf
        // (SpAtk135 -> SpDef70, 2x super effective vs Ground/Ground, no STAB).
        expect(rc1Battlers[1]!.hp).toBe(936); // trainer: 999 -> 936 (Strength)
        expect(rc1Battlers[0]!.hp).toBe(835); // player: 999 -> 835 (Surf, the policy's real chosen move)

        // Turn 2: the SAME mechanism repeats from wherever the one continuous LCG stream left off.
        const t2p = submitFactoryFullTurnDecision(t1.state, {
          requestId: t1.nextRequest.requestId, side: "player", decision: PLAYER_ATTACKS_TRAINER,
        });
        if (t2p.kind !== "decision-required") throw new Error("expected decision-required");
        expect(t2p.nextRequest.side).toBe("trainer");

        const t2PlayerHp = (t2p.state.rules as { rulesContext: { battlers: ReadonlyArray<{ hp: number }> } })
          .rulesContext.battlers[0]!.hp;
        expect(t2PlayerHp).toBe(835);
        const t2Ai = submitFactoryAiDecision(t2p.state, aiTrainerView(t2PlayerHp), reduceFactoryFullTurnDecision);
        expect(t2Ai.trace.mask).toBe(7);
        expect(t2Ai.trace.draws).toHaveLength(11);
        expect(t2Ai.trace.slotScores.map((s) => s.finalScore)).toEqual([100, 99, 99, 89]);
        expect(t2Ai.trace.bestMoveSlots).toEqual([0]); // Surf wins again, still unambiguous
        expect(t2Ai.submission.decision).toEqual({ kind: "use-move", moveSlot: 0, targetBattler: 0 });

        const t2 = t2Ai.transition;
        expect(t2.kind).toBe("decision-required");
        if (t2.kind !== "decision-required") throw new Error("expected decision-required after turn 2");
        // Cumulative across BOTH turns -- one continuous stream, not reset per turn:
        // 20 (turn 1) + 11 (turn 2 policy) + 4 (turn 2 player hit chain)
        // + 4 (turn 2 trainer hit chain) + 1 boundary draw = 40.
        expect(t2.state.rng.calls).toBe(40);
        const rc2 = (t2.state.rules as { rulesContext: Record<string, unknown> }).rulesContext;
        expect(rc2.battleOutcome).toBe(0);
        const rc2Battlers = rc2.battlers as ReadonlyArray<{ hp: number }>;
        expect(rc2Battlers[1]!.hp).toBe(869); // trainer: 936 -> 869 (ROM-positioned turn-2 Strength variance)
        expect(rc2Battlers[0]!.hp).toBe(681); // player: 835 -> 681 (ROM-positioned turn-2 Surf variance)
      },
    );
  },
);

describe("factory full-turn public Spikes persistence and switch-in receipt", () => {
  it("sets one layer on turn 1, persists it, then a public forced switch brings grounded Rhyhorn in at 155 -> 136 and clears only the damaged guard", () => {
    const RHYHORN = 111;
    const initial = createFactoryFullTurnBattleState(config({
      player: {
        species: 43, moveId: DOUBLE_TEAM, pp: [15, 0, 0, 0],
        attack: 50, defense: 50, spAttack: 50, spDefense: 50,
        speed: 50, hp: 90, maxHp: 155,
      },
      trainer: {
        species: 91, moveId: SPIKES, moves: [SPIKES, STRENGTH, 0, 0],
        pp: [20, 15, 0, 0], attack: 200, defense: 50,
        spAttack: 50, spDefense: 50, speed: 100, hp: 100,
        types: ["TYPE_WATER", "TYPE_ICE"],
      },
      playerBenchHp: [155, 0],
      playerBenchOverride: [{
        species: RHYHORN,
        moves: [STRENGTH, 0, 0, 0],
      }, undefined],
    }));
    expect(initial.rules.rulesContext.sideStatuses).toEqual([0, 0]);
    expect(initial.rules.rulesContext.sideTimers.map(({ spikesAmount }) => spikesAmount)).toEqual([0, 0]);

    const turn1Player = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    if (turn1Player.kind !== "decision-required") throw new Error("expected trainer turn-1 decision");
    const turn1 = submitFactoryFullTurnDecision(turn1Player.state, {
      requestId: 2, side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    if (turn1.kind !== "decision-required") throw new Error("expected turn-2 player decision");
    expect(turn1.state.rules.rulesContext.sideStatuses[0]).toBe(1 << 4);
    expect(turn1.state.rules.rulesContext.sideTimers[0].spikesAmount).toBe(1);

    const turn2Player = submitFactoryFullTurnDecision(turn1.state, {
      requestId: 3, side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    if (turn2Player.kind !== "decision-required") throw new Error("expected trainer turn-2 decision");
    const knockedOut = submitFactoryFullTurnDecision(turn2Player.state, {
      requestId: 4, side: "trainer",
      decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    });
    if (knockedOut.kind !== "decision-required") throw new Error("expected public forced-switch decision");
    expect(knockedOut.nextRequest).toMatchObject({
      kind: "forced-switch", side: "player", battler: 0, legalPartyIndexes: [1],
    });
    expect(knockedOut.state.rules.rulesContext.sideStatuses[0]).toBe(1 << 4);
    expect(knockedOut.state.rules.rulesContext.sideTimers[0].spikesAmount).toBe(1);

    const switched = submitFactoryFullTurnDecision(knockedOut.state, {
      requestId: knockedOut.nextRequest.requestId,
      side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (switched.kind !== "decision-required") throw new Error("expected post-switch command decision");
    const rc = switched.state.rules.rulesContext;
    expect(rc.battlers[0]).toMatchObject({
      species: RHYHORN, partyIndex: 1, maxHP: 155, hp: 136,
      types: ["TYPE_GROUND", "TYPE_ROCK"],
    });
    expect(rc.party.player[1].hp).toBe(136);
    expect(rc.sideStatuses[0]).toBe(1 << 4);
    expect(rc.sideTimers[0].spikesAmount).toBe(1);
    expect(rc.sideStatuses[0] & (1 << 9)).toBe(0);
  });
});

describe(
  "factory full-turn decision -- non-terminal forced-switch variant (item 2, entry 450's own proof-3 "
    + "remainder): the trainer's active mon faints on the FIRST action with a healthy bench -- "
    + "BattleScript_HandleFaintedMon's AI branch (docs/forced-switch-ground-truth.md, entry 447's real "
    + "matchup-scorer machinery) picks the replacement, the second action is cancelled (cancelallactions, "
    + "NOT terminal), runBattleEndTurnOrchestration still runs, and the next boundary targets the "
    + "switched-in mon",
  () => {
    /** docs/forced-switch-ground-truth.md's own proven switch-in candidate (factoryBattleScriptTerminalDecision.test.ts). */
    const MACHOP = 66;
    const KARATE_CHOP = 2;

    function forcedSwitchConfig(): FactoryFullTurnConfig {
      return config({
        player: {
          species: 1, moveId: STRENGTH, attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 100,
        },
        trainer: {
          species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 90,
        },
        trainerBenchHp: [145, 0],
        trainerBenchOverride: [{ species: MACHOP, moves: [KARATE_CHOP, 0, 0, 0] }, undefined],
      });
    }

    it(
      "the killing blow is the SAME banked one-shot (mid-turn-KO test's own player/trainer numbers) -- only "
        + "the trainer's healthy bench changes the outcome from terminal to a genuine resume",
      () => {
        const initial = createFactoryFullTurnBattleState(forcedSwitchConfig());
        const afterPlayer = submitFactoryFullTurnDecision(initial, {
          requestId: 1, side: "player", decision: PLAYER_ATTACKS,
        });
        if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");

        const result = submitFactoryFullTurnDecision(afterPlayer.state, {
          requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
        });
        expect(result.kind).toBe("decision-required"); // NOT terminal -- the battle genuinely resumes
        if (result.kind !== "decision-required") throw new Error("expected decision-required");
        expect(result.nextRequest).toEqual({
          kind: "command", requestId: 3, side: "player", battler: 0,
          legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
        });

        const rulesContext = (result.state.rules as {
          rulesContext: {
            battleOutcome: number;
            battlers: ReadonlyArray<{
              species: number; hp: number; partyIndex: number;
              pp: readonly number[]; statStages: readonly number[];
              status1: number; status2: number; status3: number;
            }>;
          };
        }).rulesContext;
        expect(rulesContext.battleOutcome).toBe(0); // genuinely undecided, computed not injected

        // The boundary's next request targets battler 1 (the trainer slot) -- now rebuilt as MACHOP,
        // the real switch-in the AI matchup scorer picked (the only living bench slot with a real move).
        const switchedIn = rulesContext.battlers[1]!;
        expect(switchedIn.species).toBe(MACHOP);
        expect(switchedIn.hp).toBe(145);
        expect(switchedIn.partyIndex).toBe(1); // raw party index 1 -- this reducer's own active-at-0 convention
        expect(switchedIn.status1).toBe(0);
        expect(switchedIn.status2).toBe(0);
        expect(switchedIn.status3).toBe(0);
        expect(switchedIn.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]); // SwitchInClearSetData's neutral reset

        // PP proof the second action never dispatched: the player's own move (action 1, the killing
        // blow) shows its one real use; nothing downstream of the fainted mon's own second action ever
        // ran (there is no second Strength cast to decrement any PP for -- the original trainer mon is
        // gone, replaced before mover2 would have acted).
        expect(rulesContext.battlers[0]!.pp[0]).toBe(15);

        // Zero extra RNG beyond the banked ledgers: exactly the killing blow's own 4-roll hit chain
        // (accuracy, crit, adjustnormaldamage, seteffectwithchance) -- the entire forced-switch dance
        // draws zero Random() (docs/forced-switch-ground-truth.md §2b), the cancelled second action
        // draws none (it never dispatches), and this scenario's quiet end-turn adds only
        // BattleTurnPassed's unconditional boundary draw. If the second action HAD dispatched,
        // this would be 9, not 5.
        expect(result.state.rng.calls).toBe(5);
      },
    );
  },
);

describe(
  "factory full-turn decision -- non-terminal PLAYER-side forced-switch variant (item 3, entry 459's own "
    + "named remainder): the player's active mon faints on the FIRST action with a healthy bench -- "
    + "BattleScript_HandleFaintedMon's PLAYER branch (openpartyscreen's `side !== SIDE_OPPONENT` fork, "
    + "battleScriptOpenPartyScreenOpcode.ts) halts on a real player-choice-required reason instead of the "
    + "AI's automatic pick, surfaced here as a genuine \"forced-switch\" decision-required boundary (not a "
    + "throw); submitting the legal switch resumes the SAME halted script and then runs straight into "
    + "runBattleEndTurnOrchestration, exactly where item 2's own faint1-resumed path leads",
  () => {
    /** Same proven switch-in candidate as item 2's own bench (factoryBattleScriptTerminalDecision.test.ts). */
    const MACHOP = 66;
    const KARATE_CHOP = 2;

    /**
     * A pure side-relabeling of item 2's own `forcedSwitchConfig` -- same
     * STRENGTH/200atk/50def/90hp one-shot numbers, same speed gap (100 vs 50),
     * just with the trainer as the fast attacker and the player as the target
     * with a healthy bench this time, so the SAME banked KO_SCENARIO_RNG_SEED
     * hit chain (4 rolls, no more) kills the PLAYER'S active mon instead.
     */
    function playerForcedSwitchConfig(): FactoryFullTurnConfig {
      return config({
        player: {
          species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 90,
        },
        trainer: {
          species: 1, moveId: STRENGTH, ability: ABILITY_SHADOW_TAG,
          attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 100,
        },
        playerBenchHp: [145, 0],
        playerBenchOverride: [{ species: MACHOP, moves: [KARATE_CHOP, 0, 0, 0] }, undefined],
      });
    }

    it(
      "the killing blow is the SAME banked one-shot, roles reversed: the trainer moves first (speed 100 > "
        + "50) and KOs the player -- the reducer surfaces a forced-switch request naming exactly the "
        + "player's one living bench slot, not a throw",
      () => {
        const initial = createFactoryFullTurnBattleState(playerForcedSwitchConfig());
        const afterPlayer = submitFactoryFullTurnDecision(initial, {
          requestId: 1, side: "player", decision: PLAYER_ATTACKS,
        });
        if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");

        const result = submitFactoryFullTurnDecision(afterPlayer.state, {
          requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
        });
        expect(result.kind).toBe("decision-required"); // NOT a throw, NOT terminal
        if (result.kind !== "decision-required") throw new Error("expected decision-required");
        expect(result.nextRequest).toEqual({
          kind: "forced-switch",
          requestId: 3,
          side: "player",
          battler: 0,
          faintedPartyIndex: 0,
          // Shadow Tag gates only voluntary B_ACTION_SWITCH selection
          // (battle_main.c:4240-4267), never forced faint replacement.
          legalPartyIndexes: [1], // MACHOP only -- bench slot 2 is empty (species 0)
        });
        expect(result.state.boundary).toEqual({ kind: "decision-required", request: result.nextRequest });

        // Exactly the killing blow's own 4-roll hit chain -- the halt itself is not a controller round
        // trip (docs/forced-switch-ground-truth.md §3d), and the player's own move (mover2) never
        // dispatched (cancelallactions semantics, same rule item 2 already pins).
        expect(result.state.rng.calls).toBe(4);
      },
    );

    it(
      "submitting the legal MACHOP slot rebuilds the player's active battler from the bench record "
        + "(species/hp/partyIndex/neutral stat stages/clean status) and resumes straight into "
        + "runBattleEndTurnOrchestration -> a genuine next command boundary, zero further Random() calls",
      () => {
        const initial = stageSwitchHistory(
          createFactoryFullTurnBattleState(playerForcedSwitchConfig()),
          0,
          ABILITY_OVERGROW,
          STRENGTH,
        );
        let history = syncFactoryAiBattleHistory(
          createFactoryAiBattleHistory(initial.rules.rulesContext),
          initial.rules.rulesContext,
        );
        expect(history.knownAbilities[0]).toBe("ABILITY_OVERGROW");
        expect(history.usedMoves[0]).toEqual([STRENGTH]);
        const afterPlayer = submitFactoryFullTurnDecision(initial, {
          requestId: 1, side: "player", decision: PLAYER_ATTACKS,
        });
        if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");
        const paused = submitFactoryFullTurnDecision(afterPlayer.state, {
          requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
        });
        if (paused.kind !== "decision-required") throw new Error("expected decision-required");

        const result = submitFactoryFullTurnDecision(paused.state, {
          requestId: 3, side: "player", decision: { kind: "switch", partyIndex: 1 },
        });
        expect(result.kind).toBe("decision-required");
        if (result.kind !== "decision-required") throw new Error("expected decision-required");
        // cancelallactions already skipped the player's own (now-moot) second action, so
        // runBattleEndTurnOrchestration runs immediately and the NEXT boundary is a fresh full-turn
        // command request for the player (this reducer's own two-action-cycle shape, exactly item 2's
        // own faint1-resumed path).
        expect(result.nextRequest).toEqual({
          kind: "command", requestId: 4, side: "player", battler: 0,
          legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }],
        });

        const rulesContext = (result.state.rules as {
          rulesContext: {
            battleOutcome: number;
            battlers: ReadonlyArray<{
              species: number; hp: number; partyIndex: number;
              pp: readonly number[];
              statStages: readonly number[];
              status1: number; status2: number; status3: number;
            }>;
          };
        }).rulesContext;
        expect(rulesContext.battleOutcome).toBe(0); // genuinely undecided, computed not injected

        // The boundary's next request targets battler 0 (the player slot) -- now rebuilt as MACHOP,
        // the only legal switch-in the player's own submission named.
        const switchedIn = rulesContext.battlers[0]!;
        expect(switchedIn.species).toBe(MACHOP);
        expect(switchedIn.hp).toBe(145);
        expect(switchedIn.partyIndex).toBe(1); // raw party index 1 -- this reducer's own active-at-0 convention
        expect(switchedIn.status1).toBe(0);
        expect(switchedIn.status2).toBe(0);
        expect(switchedIn.status3).toBe(0);
        expect(switchedIn.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]); // SwitchInClearSetData's neutral reset

        const liveRulesContext = result.state.rules.rulesContext;
        expect(liveRulesContext.aiObservedAbilityIds[0]).toBe(0);
        expect(liveRulesContext.moveHistory.lastMoves[0]).toBe(0);
        history = syncFactoryAiBattleHistory(history, liveRulesContext);
        expect(history.knownAbilities[0]).toBeNull();
        expect(history.usedMoves[0]).toEqual([]);

        // PP proof the killing blow (mover1, the trainer) actually dispatched, but the player's own
        // second action never did: the trainer's Strength shows its one real use.
        expect(rulesContext.battlers[1]!.pp[0]).toBe(15);

        // Zero Random() draws across all three submissions: exactly the killing blow's own 4-roll hit
        // chain (accuracy, crit, adjustnormaldamage, seteffectwithchance) -- the forced-switch dance
        // draws zero (same as item 2's trainer-side proof), the cancelled second action draws none (it
        // never dispatches), and the resumed quiet end-turn adds BattleTurnPassed's one boundary draw.
        expect(result.state.rng.calls).toBe(5);
      },
    );

    it("rejects a forced-switch submission naming the fainted/already-active slot (index 0)", () => {
      const initial = createFactoryFullTurnBattleState(playerForcedSwitchConfig());
      const afterPlayer = submitFactoryFullTurnDecision(initial, {
        requestId: 1, side: "player", decision: PLAYER_ATTACKS,
      });
      if (afterPlayer.kind !== "decision-required") throw new Error("expected decision-required");
      const paused = submitFactoryFullTurnDecision(afterPlayer.state, {
        requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
      });
      if (paused.kind !== "decision-required") throw new Error("expected decision-required");

      expect(() =>
        submitFactoryFullTurnDecision(paused.state, {
          requestId: 3, side: "player", decision: { kind: "switch", partyIndex: 0 },
        })
      ).toThrow();
    });
  },
);

describe("factory full-turn decision -- end-turn faint replacement resumes after the completed effect loops", () => {
  const MACHOP = 66;
  const KARATE_CHOP = 2;

  function quietStatusConfig(
    player: Partial<FactoryFullTurnConfig["player"]>,
    trainer: Partial<FactoryFullTurnConfig["trainer"]>,
    extras: Partial<FactoryFullTurnConfig> = {},
  ): FactoryFullTurnConfig {
    return config({
      rngSeed: 1,
      player: {
        species: 1, moveId: STRENGTH,
        attack: 10, defense: 255, spAttack: 10, spDefense: 255,
        speed: 100, hp: 200, maxHp: 200,
        ...player,
      },
      trainer: {
        species: 43, moveId: STRENGTH,
        attack: 10, defense: 255, spAttack: 10, spDefense: 255,
        speed: 50, hp: 200, maxHp: 200,
        ...trainer,
      },
      ...extras,
    });
  }

  function runTurn(configValue: FactoryFullTurnConfig) {
    const initial = createFactoryFullTurnBattleState(configValue);
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: PLAYER_ATTACKS,
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer decision");
    return submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
    });
  }

  it(
    "player poison KO -> forced choice -> replacement -> remaining tail reaches the next command; "
      + "the trainer's already-completed burn tick fires exactly once and RNG stays 8 hit-chain draws + 1 boundary draw",
    () => {
      const paused = runTurn(quietStatusConfig(
        { hp: 22, maxHp: 160, status1: STATUS1_POISON },
        { hp: 100, maxHp: 160, status1: STATUS1_BURN },
        {
          playerBenchHp: [145, 0],
          playerBenchOverride: [{
            species: MACHOP,
            moves: [KARATE_CHOP, 0, 0, 0],
          }, undefined],
        },
      ));
      expect(paused.kind).toBe("decision-required");
      if (paused.kind !== "decision-required") throw new Error("expected forced switch");
      expect(paused.nextRequest).toMatchObject({
        kind: "forced-switch",
        requestId: 3,
        side: "player",
        battler: 0,
        faintedPartyIndex: 0,
        legalPartyIndexes: [1],
      });
      expect(paused.state.rules.rulesContext.battlers[0].hp).toBe(0);
      const trainerHpAfterOneBurnTick = paused.state.rules.rulesContext.battlers[1].hp;
      expect(trainerHpAfterOneBurnTick).toBeLessThan(100);
      expect(paused.state.rng.calls).toBe(8);

      const resumed = submitFactoryFullTurnDecision(paused.state, {
        requestId: 3,
        side: "player",
        decision: { kind: "switch", partyIndex: 1 },
      });
      expect(resumed.kind).toBe("decision-required");
      if (resumed.kind !== "decision-required") throw new Error("expected next command");
      expect(resumed.nextRequest).toMatchObject({
        kind: "command", requestId: 4, side: "player", battler: 0,
      });
      expect(resumed.state.rules.rulesContext.battlers[0]).toMatchObject({
        species: MACHOP, partyIndex: 1, hp: 145, status1: 0,
      });
      expect(resumed.state.rules.rulesContext.battlers[1].hp).toBe(trainerHpAfterOneBurnTick);
      expect(resumed.state.rng.calls).toBe(9);
    },
  );

  it("trainer poison KO selects its healthy replacement and reaches the next player command", () => {
    const result = runTurn(quietStatusConfig(
      { hp: 100, maxHp: 160, status1: STATUS1_BURN },
      { hp: 22, maxHp: 160, status1: STATUS1_POISON },
      {
        trainerBenchHp: [145, 0],
        trainerBenchOverride: [{
          species: MACHOP,
          moves: [KARATE_CHOP, 0, 0, 0],
        }, undefined],
      },
    ));
    expect(result.kind).toBe("decision-required");
    if (result.kind !== "decision-required") throw new Error("expected next command");
    expect(result.nextRequest).toMatchObject({
      kind: "command", requestId: 3, side: "player", battler: 0,
    });
    expect(result.state.rules.rulesContext.battlers[1]).toMatchObject({
      species: MACHOP, partyIndex: 1, hp: 145, status1: 0,
    });
    expect(result.state.rng.calls).toBe(9);
  });

  it("trainer poison KO with no surviving party member reports the real player-win outcome", () => {
    const result = runTurn(quietStatusConfig(
      {},
      { hp: 22, maxHp: 160, status1: STATUS1_POISON },
    ));
    expect(result.kind).toBe("terminal");
    if (result.kind !== "terminal") throw new Error("expected terminal");
    expect(result.outcome).toBe("player-win");
    expect(result.state.rules.rulesContext.battleOutcome).toBe(1);
    expect(result.state.rules.rulesContext.battlers[1].hp).toBe(0);
    expect(result.state.rng.calls).toBe(8);
  });
});

describe("factory full-turn decision -- live move-end item transfers", () => {
  function completeTurn(
    configValue: FactoryFullTurnConfig,
    playerDecision: Parameters<typeof submitFactoryFullTurnDecision>[1]["decision"] = PLAYER_ATTACKS,
  ) {
    const initial = createFactoryFullTurnBattleState(configValue);
    const player = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player", decision: playerDecision,
    });
    if (player.kind !== "decision-required") throw new Error("expected trainer decision");
    return submitFactoryFullTurnDecision(player.state, {
      requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
    });
  }

  it(
    "King's Rock qualifying hit owns ledger call 5, flinches below 10%, and the existing "
      + "admission arm makes the slower target skip its action",
    () => {
      const rngSeed = 1;
      const result = completeTurn(config({
        rngSeed,
        player: {
          species: 1, moveId: STRENGTH, item: ITEM_KINGS_ROCK,
          attack: 100, defense: 255, spAttack: 10, spDefense: 255,
          speed: 100, hp: 100, maxHp: 200,
        },
        trainer: {
          species: 43, moveId: STRENGTH,
          attack: 10, defense: 255, spAttack: 10, spDefense: 255,
          speed: 50, hp: 200, maxHp: 200,
        },
      }));
      expect(result.kind).toBe("decision-required");
      if (result.kind !== "decision-required") throw new Error("expected next command");
      let cursor = rngSeed;
      const randomValues: number[] = [];
      for (let call = 1; call <= 6; call += 1) {
        cursor = advanceRngValue(cursor);
        randomValues.push((cursor >>> 16) & 0xffff);
      }
      // Calls 1-4 are Strength's hit chain; King's Rock is call 5 and the
      // continuing-turn boundary is call 6 because the second action skips.
      expect(randomValues[4]! % 100).toBe(3);
      expect(result.state.rng).toEqual({ value: cursor, calls: 6 });
      expect(result.state.rules.rulesContext.battlers[0].hp).toBe(100);
      expect(result.events.some((event) => {
        const payload = "payload" in event ? event.payload : event;
        return payload.kind === "message"
          && payload.messageId === "STRINGID_PKMNFLINCHED";
      })).toBe(true);
    },
  );

  it(
    "King's Rock over-threshold result consumes only ledger call 5, does not flinch, "
      + "and lets the slower action run",
    () => {
      const rngSeed = 0;
      const withRock = completeTurn(config({
        rngSeed,
        player: {
          species: 1, moveId: STRENGTH, item: ITEM_KINGS_ROCK,
          attack: 100, defense: 255, spAttack: 10, spDefense: 255,
          speed: 100, hp: 100, maxHp: 200,
        },
        trainer: {
          species: 43, moveId: STRENGTH,
          attack: 10, defense: 255, spAttack: 10, spDefense: 255,
          speed: 50, hp: 200, maxHp: 200,
        },
      }));
      const control = completeTurn(config({
        rngSeed,
        player: {
          species: 1, moveId: STRENGTH,
          attack: 100, defense: 255, spAttack: 10, spDefense: 255,
          speed: 100, hp: 100, maxHp: 200,
        },
        trainer: {
          species: 43, moveId: STRENGTH,
          attack: 10, defense: 255, spAttack: 10, spDefense: 255,
          speed: 50, hp: 200, maxHp: 200,
        },
      }));
      expect(withRock.kind).toBe("decision-required");
      expect(control.kind).toBe("decision-required");
      if (withRock.kind !== "decision-required" || control.kind !== "decision-required") {
        throw new Error("expected next commands");
      }
      let fifthCursor = rngSeed;
      for (let call = 1; call <= 5; call += 1) fifthCursor = advanceRngValue(fifthCursor);
      expect(((fifthCursor >>> 16) & 0xffff) % 100).toBe(18);
      expect(withRock.state.rng.calls).toBe(control.state.rng.calls + 1);
      expect(withRock.state.rng.calls).toBe(10);
      expect(withRock.state.rules.rulesContext.battlers[0].hp).toBeLessThan(100);
      expect(withRock.events.some((event) => {
        const payload = "payload" in event ? event.payload : event;
        return payload.kind === "message"
          && payload.messageId === "STRINGID_PKMNFLINCHED";
      })).toBe(false);
    },
  );

  it(
    "non-damaging Double Team consumes zero King's Rock draws; damaging Gen-3-excluded "
      + "Hyper Voice consumes the source-ordered draw but cannot flinch",
    () => {
      const shared = {
        rngSeed: 1,
        player: {
          species: 1,
          attack: 100, defense: 255, spAttack: 100, spDefense: 255,
          speed: 100, hp: 100, maxHp: 200,
        },
        trainer: {
          species: 43, moveId: STRENGTH,
          attack: 10, defense: 255, spAttack: 10, spDefense: 255,
          speed: 50, hp: 200, maxHp: 200,
        },
      };
      const doubleTeamRock = completeTurn(config({
        ...shared,
        player: { ...shared.player, moveId: DOUBLE_TEAM, item: ITEM_KINGS_ROCK },
      }), { kind: "use-move", moveSlot: 0, targetBattler: 0 });
      const doubleTeamControl = completeTurn(config({
        ...shared,
        player: { ...shared.player, moveId: DOUBLE_TEAM },
      }), { kind: "use-move", moveSlot: 0, targetBattler: 0 });
      const hyperVoiceRock = completeTurn(config({
        ...shared,
        player: { ...shared.player, moveId: HYPER_VOICE, item: ITEM_KINGS_ROCK },
      }));
      const hyperVoiceControl = completeTurn(config({
        ...shared,
        player: { ...shared.player, moveId: HYPER_VOICE },
      }));
      for (const result of [doubleTeamRock, doubleTeamControl, hyperVoiceRock, hyperVoiceControl]) {
        expect(result.kind).toBe("decision-required");
      }
      if (
        doubleTeamRock.kind !== "decision-required"
        || doubleTeamControl.kind !== "decision-required"
        || hyperVoiceRock.kind !== "decision-required"
        || hyperVoiceControl.kind !== "decision-required"
      ) {
        throw new Error("expected next commands");
      }
      expect(doubleTeamRock.state.rng).toEqual(doubleTeamControl.state.rng);
      expect(hyperVoiceRock.state.rng.calls).toBe(hyperVoiceControl.state.rng.calls + 1);
      expect(hyperVoiceRock.events.some((event) => {
        const payload = "payload" in event ? event.payload : event;
        return payload.kind === "message"
          && payload.messageId === "STRINGID_PKMNFLINCHED";
      })).toBe(false);
    },
  );

  it(
    "state-12 action order is King's Rock first, then the slower battler's Shell Bell heal",
    () => {
      const result = completeTurn(config({
        rngSeed: 0, // King's Rock call 5 is 18%, so the Shell Bell holder acts.
        player: {
          species: 1, moveId: STRENGTH, item: ITEM_KINGS_ROCK,
          attack: 100, defense: 255, spAttack: 10, spDefense: 255,
          speed: 100, hp: 200, maxHp: 200,
        },
        trainer: {
          species: 43, moveId: STRENGTH, item: ITEM_SHELL_BELL,
          attack: 10, defense: 255, spAttack: 10, spDefense: 255,
          speed: 50, hp: 100, maxHp: 200,
        },
      }));
      expect(result.kind).toBe("decision-required");
      if (result.kind !== "decision-required") throw new Error("expected next command");
      expect(result.state.rng.calls).toBe(10);
      expect(result.state.rules.rulesContext.battlers[1].hp).toBeGreaterThan(100 - 30);
      const messages = result.events.flatMap((event) => {
        const payload = "payload" in event ? event.payload : event;
        return payload.kind === "message" ? [payload.messageId] : [];
      });
      expect(messages.filter((message) => message === "STRINGID_PKMNSITEMRESTOREDHPALITTLE"))
        .toEqual(["STRINGID_PKMNSITEMRESTOREDHPALITTLE"]);
      expect(messages).not.toContain("STRINGID_PKMNFLINCHED");
    },
  );

  it(
    "MOVEEND_ITEM_EFFECTS_ALL consumes Chesto Berry after Rest, clears Sleep/Nightmare through "
      + "BattleScript_BerryCureSlpRet, and reaches the next command",
    () => {
      const result = completeTurn(config({
        rngSeed: 1,
        player: {
          species: 1, moveId: REST, item: ITEM_CHESTO_BERRY,
          attack: 10, defense: 255, spAttack: 10, spDefense: 255,
          speed: 100, hp: 100, maxHp: 200,
        },
        trainer: {
          species: 43, moveId: STRENGTH,
          attack: 10, defense: 255, spAttack: 10, spDefense: 255,
          speed: 50, hp: 200, maxHp: 200,
        },
      }), { kind: "use-move", moveSlot: 0, targetBattler: 0 });
      expect(result.kind).toBe("decision-required");
      if (result.kind !== "decision-required") throw new Error("expected next command");
      expect(result.state.rules.rulesContext.battlers[0]).toMatchObject({
        item: 0,
        status1: 0,
        status2: 0,
      });
      expect(result.events.some((event) => {
        const payload = "payload" in event ? event.payload : event;
        return payload.kind === "message"
          && payload.messageId === "STRINGID_PKMNSITEMWOKEIT";
      })).toBe(true);
    },
  );

  it(
    "MOVEEND_KINGSROCK_SHELLBELL heals floor(first non-passive target damage / 8), "
      + "clears the one-action receipt, preserves the item, and draws no RNG",
    () => {
      const shared = {
        rngSeed: 1,
        player: {
          species: 1, moveId: STRENGTH,
          attack: 100, defense: 255, spAttack: 10, spDefense: 255,
          speed: 100, hp: 100, maxHp: 200,
        },
        trainer: {
          species: 43, moveId: STRENGTH,
          attack: 10, defense: 255, spAttack: 10, spDefense: 255,
          speed: 50, hp: 200, maxHp: 200,
        },
      } satisfies Partial<FactoryFullTurnConfig>;
      const shell = completeTurn(config({
        ...shared,
        player: { ...shared.player, item: ITEM_SHELL_BELL },
      }));
      const control = completeTurn(config({
        ...shared,
        player: { ...shared.player, item: 0 },
      }));
      expect(shell.kind).toBe("decision-required");
      expect(control.kind).toBe("decision-required");
      if (shell.kind !== "decision-required" || control.kind !== "decision-required") {
        throw new Error("expected next commands");
      }
      const dealt = 200 - shell.state.rules.rulesContext.battlers[1].hp;
      expect(shell.state.rules.rulesContext.battlers[0].hp
        - control.state.rules.rulesContext.battlers[0].hp).toBe(Math.max(1, Math.floor(dealt / 8)));
      expect(shell.state.rules.rulesContext.battlers[0].item).toBe(ITEM_SHELL_BELL);
      expect(shell.state.rng).toEqual(control.state.rng);
      expect(shell.events.some((event) => {
        const payload = "payload" in event ? event.payload : event;
        return payload.kind === "message"
          && payload.messageId === "STRINGID_PKMNSITEMRESTOREDHPALITTLE";
      })).toBe(true);
    },
  );
});
