// Full differential contract for the native Factory DecisionPolicy choosers.
// Run in both modes after `./core-rs/build-wasm.sh`:
//   npx vitest run tests/factoryAiDecisionPolicyParity.test.ts --no-watch --pool=forks
//   POKEBENCH_ENGINE=wasm npx vitest run tests/factoryAiDecisionPolicyParity.test.ts --no-watch --pool=forks

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  tsFactoryAiEngine,
  wasmFactoryAiEngine,
  factoryAiEngine,
  type FactoryAiEngine,
  type MaskZeroDecisionInput,
  type ScoredDecisionInput,
} from "../core-rs/adapter/factoryAiEngine.ts";
import { defaultEngineId, resolveWasmArtifactPath } from "../core-rs/adapter/rngEngine.ts";
import {
  createBattleCommandRequest,
  createBattleForcedSwitchRequest,
  type BattleCommandRequest,
} from "../src/engine/battleDecisionBoundary.ts";
import type {
  FactoryAiScoredBattlerView,
  FactoryAiScoredTargetView,
  FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";

const requestedEngine = defaultEngineId();
const wasmAvailable = existsSync(resolveWasmArtifactPath());
if (requestedEngine === "wasm" && !wasmAvailable) {
  throw new Error("POKEBENCH_ENGINE=wasm requires the factory-wasm artifact; build it with core-rs/build-wasm.sh");
}

const ts = tsFactoryAiEngine();
let wasmPromise: Promise<FactoryAiEngine> | undefined;
function wasm(): Promise<FactoryAiEngine> {
  wasmPromise ??= wasmFactoryAiEngine();
  return wasmPromise;
}

const stages = Object.freeze({ atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6 });

function battler(overrides: Partial<FactoryAiScoredBattlerView> = {}): FactoryAiScoredBattlerView {
  return Object.freeze({
    types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] as const,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    statStages: stages,
    isFirstTurn: 2,
    hp: 100,
    maxHp: 100,
    ...overrides,
  });
}

function target(overrides: Partial<FactoryAiScoredTargetView> = {}): FactoryAiScoredTargetView {
  return Object.freeze({
    ...battler({ types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
    species: 213,
    ability: "ABILITY_STURDY",
    knownAbility: "ABILITY_STURDY",
    ...overrides,
  });
}

function scoredView(
  streak: number,
  moves: readonly [number, number, number, number] = [104, 58, 81, 241],
  attacker: FactoryAiScoredBattlerView = battler(),
  foe: FactoryAiScoredTargetView = target({ types: ["TYPE_GRASS", "TYPE_FLYING"], hp: 999, maxHp: 999 }),
): FactoryAiScoredView {
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: Object.freeze({ levelMode: 0, battleMode: 0, factoryWinStreak: streak, trainerOpponentId: 222 }),
    moves,
    attacker,
    target: foe,
  });
}

function request(mask: number, requestId = 91): BattleCommandRequest {
  return createBattleCommandRequest({
    kind: "command",
    requestId,
    side: "trainer",
    battler: 1,
    legalDecisions: [0, 1, 2, 3]
      .filter((slot) => (mask & (1 << slot)) !== 0)
      .map((slot) => ({
        kind: "use-move" as const,
        moveSlot: slot as 0 | 1 | 2 | 3,
        targetBattler: slot === 3 ? 1 : 0,
      })),
  });
}

async function compareMaskZero(input: MaskZeroDecisionInput): Promise<void> {
  const native = await wasm();
  expect(native.chooseFactoryAiMaskZeroDecision(input)).toEqual(ts.chooseFactoryAiMaskZeroDecision(input));
}

async function compareScored(input: ScoredDecisionInput): Promise<ReturnType<FactoryAiEngine["chooseFactoryAiScoredDecision"]>> {
  const native = await wasm();
  const expected = ts.chooseFactoryAiScoredDecision(input);
  expect(native.chooseFactoryAiScoredDecision(input)).toEqual(expected);
  return expected;
}

function thrownMessage(run: () => unknown): string {
  try {
    run();
    return "<no error>";
  } catch (error) {
    return (error as Error).message;
  }
}

describe.skipIf(!wasmAvailable)("Factory DecisionPolicy native/WASM complete parity", () => {
  it("selects the requested uniform engine without a chooser fallback", async () => {
    expect((await factoryAiEngine()).id).toBe(requestedEngine);
  });

  it("preserves every mask-zero legal subset, authoritative target, nonzero cursor, and tie", async () => {
    for (let legalMask = 1; legalMask < 16; legalMask++) {
      await compareMaskZero({
        view: {
          schema: "factory-ai-view/v1",
          mode: "factory-level-50-singles",
          active: { aiBattler: 1, targetBattler: 0 },
          factory: { levelMode: 0, battleMode: 0, factoryWinStreak: 0, trainerOpponentId: 50 },
          moves: [85, 86, 69, 273],
        },
        request: request(legalMask, 100 + legalMask),
        rng: { value: (0x1020_3040 + legalMask * 0x10101) >>> 0, calls: 37 },
      });
    }
  });

  it("sweeps masks 1/7, every legal subset, three turn-start owners, scenarios, and 12 seeds", async () => {
    const scenarios = [
      scoredView(14, [57, 157, 34, 85], battler(), target({ species: 105, types: ["TYPE_GROUND", "TYPE_GROUND"], ability: "ABILITY_ROCK_HEAD", knownAbility: null, hp: 135, maxHp: 135 })),
      scoredView(28),
    ];
    let cases = 0;
    for (const base of scenarios) {
      for (const streak of [14, 28]) {
        const view = { ...base, factory: { ...base.factory, factoryWinStreak: streak } } as FactoryAiScoredView;
        for (let legalMask = 1; legalMask < 16; legalMask++) {
          for (const turnStartRandomNumber of [undefined, { owner: "decision" as const }, { owner: "battle-turn-boundary" as const, value: 0x4321 }]) {
            for (let seed = 1; seed <= 12; seed++) {
              await compareScored({
                view,
                request: request(legalMask),
                rng: { value: (seed * 0x9e37_79b1) >>> 0, calls: 19 },
                ...(turnStartRandomNumber === undefined ? {} : { turnStartRandomNumber }),
              });
              cases++;
            }
          }
        }
      }
    }
    expect(cases).toBe(2_160);
  });

  it("round-trips every optional field with explicit false/zero presence", async () => {
    const complete = battler({
      lastUsedMoveId: 0, isToxicPoisoned: false, hasAnyStatus: false, isConfused: false,
      isAsleep: false, isTaunted: false, isLeechSeeded: false, isInfatuated: false,
      hasYawn: false, hasPerishSong: false, isNightmared: false, isForesighted: false,
      spikesUp: false, targetFutureAttackUp: false, protectUses: 0, battleTurnCount: 0,
      isRooted: false, attackerFutureAttackUp: false, hasFocusEnergy: false,
      hasCurableStatus: false, isPoisoned: false, isBurned: false, isParalyzed: false,
      isCursed: false, isEscapePrevented: false, isTormented: false, lightScreenUp: false,
      reflectUp: false, targetSideReflectUp: false, targetPartyStatusEqualsAny: false,
      safeguardUp: false, ability: "ABILITY_NONE", holdEffect: 0, currentWeather: 0,
      usablePartyMons: 0, hasSubstitute: false, anyMoveDisabled: false, anyMoveEncored: false,
      mistUp: false, gender: "MON_GENDERLESS", imprisonedOthers: false, mudSportUp: false,
      waterSportUp: false, usedHeldItemId: 0, stockpileCount: 0,
    });
    const completeTarget = target({
      ...complete,
      // Deliberately NOT the attacker's speed: this case exists to round-trip
      // the optional-field presence table, and an exact speed tie would drag
      // FLY's AI_CV_SemiInvulnerable tie roll (ISSUES #122/#124) into it.
      speed: 73,
      species: 105,
      ability: "ABILITY_NONE",
      knownAbility: null,
      speciesAbilities: ["ABILITY_ROCK_HEAD", "ABILITY_LIGHTNING_ROD"],
      knownMoveIds: [0, 57, 85, 104],
      knownItemEffect: 0,
    });
    await compareScored({
      view: scoredView(28, [92, 104, 19, 114], complete, completeTarget),
      request: request(15),
      rng: { value: 249_678_687, calls: 43 },
      turnStartRandomNumber: { owner: "battle-turn-boundary", value: 0 },
    });
  });

  it("pins maximum, dropped-receipt, repeated-ordinal, and x4 draw families", async () => {
    let maxInput: ScoredDecisionInput | undefined;
    for (let seed = 1; seed < 4_096; seed++) {
      const candidate = {
        view: scoredView(28, [104, 150, 150, 150], battler({ hp: 45, maxHp: 100, statStages: { ...stages, evasion: 9 }, isRooted: true }), target({ hp: 100, maxHp: 100, isToxicPoisoned: true, isLeechSeeded: true, isCursed: true, isInfatuated: true })),
        request: request(1), rng: { value: seed, calls: 0 },
      } satisfies ScoredDecisionInput;
      const result = ts.chooseFactoryAiScoredDecision(candidate);
      if (result.trace.draws.filter((draw) => "phase" in draw && draw.phase === "check-viability").length === 7) {
        maxInput = candidate;
        break;
      }
    }
    expect(maxInput).toBeDefined();
    await compareScored(maxInput!);

    let repeated: ScoredDecisionInput | undefined;
    let tieCarried: ScoredDecisionInput | undefined;
    for (let seed = 1; seed < 4_096 && (!repeated || !tieCarried); seed++) {
      const hazeInput = { view: scoredView(28, [114, 150, 150, 150], battler({ statStages: { ...stages, atk: 9 } }), target({ statStages: { ...stages, atk: 9 } })), request: request(1), rng: { value: seed, calls: 0 } } satisfies ScoredDecisionInput;
      const haze = ts.chooseFactoryAiScoredDecision(hazeInput);
      const cv = haze.trace.draws.filter((draw) => "phase" in draw && draw.phase === "check-viability");
      if (new Set(cv.map((draw) => draw.ordinal)).size < cv.length) repeated = hazeInput;
      const flyInput = { view: scoredView(28, [19, 150, 150, 150], battler({ speed: 100 }), target({ speed: 100, hp: 999, maxHp: 999, lastUsedMoveId: 0 })), request: request(1), rng: { value: seed, calls: 0 } } satisfies ScoredDecisionInput;
      const fly = ts.chooseFactoryAiScoredDecision(flyInput);
      if (fly.trace.draws.some((draw) => draw.kind === "target-faster-tie")) tieCarried = flyInput;
    }
    expect(repeated).toBeDefined();
    expect(tieCarried).toBeDefined();
    await compareScored(repeated!);
    // ISSUES #122: SemiInvulnerable5's speed-tie receipt used to be dropped
    // from the trace while its RNG advance survived, and this family pinned
    // that drop. It is now a completeness pin -- every spent call has a
    // receipt. The ts/wasm half stays TS-only until the Rust mirror lands
    // (ISSUES #124); `compareScored` on this input is the divergence.
    const tie = ts.chooseFactoryAiScoredDecision(tieCarried!);
    expect(tie.rng.calls - tieCarried!.rng.calls).toBe(tie.trace.draws.length);

    const x4 = await compareScored({
      view: scoredView(28, [58, 150, 150, 150]), request: request(1), rng: { value: 99, calls: 7 },
    });
    expect(x4.trace.draws.some((draw) => draw.kind === "double-super-effective")).toBe(true);
  });

  it("matches exact typed error messages and proves both exported methods are native", async () => {
    const native = await wasm();
    expect(native.id).toBe("wasm");
    const maskBase: MaskZeroDecisionInput = {
      view: { schema: "factory-ai-view/v1", mode: "factory-level-50-singles", active: { aiBattler: 1, targetBattler: 0 }, factory: { levelMode: 0, battleMode: 0, factoryWinStreak: 0, trainerOpponentId: 50 }, moves: [85, 86, 69, 273] },
      request: request(1), rng: { value: 1, calls: 0 },
    };
    const duplicate = createBattleCommandRequest({ kind: "command", requestId: 4, side: "trainer", battler: 1, legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }, { kind: "use-move", moveSlot: 0, targetBattler: 1 }] });
    const forced = createBattleForcedSwitchRequest({ kind: "forced-switch", requestId: 5, side: "trainer", battler: 1, faintedPartyIndex: 0, legalPartyIndexes: [1] });
    const withSwitch = createBattleCommandRequest({ kind: "command", requestId: 7, side: "trainer", battler: 1, legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }, { kind: "switch", partyIndex: 2 }] });
    const player = createBattleCommandRequest({ kind: "command", requestId: 8, side: "player", battler: 0, legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 1 }] });
    const moveNone = { ...maskBase, view: { ...maskBase.view, moves: [0, 86, 69, 273] as const } };
    for (const input of [
      { ...maskBase, request: duplicate },
      { ...maskBase, request: forced },
      { ...maskBase, request: withSwitch },
      { ...maskBase, request: player },
      moveNone,
      { ...maskBase, view: { ...maskBase.view, factory: { ...maskBase.view.factory, factoryWinStreak: 14 } } },
      { ...maskBase, view: { ...maskBase.view, factory: { ...maskBase.view.factory, factoryWinStreak: 28 } } },
      { ...maskBase, view: { ...maskBase.view, factory: { ...maskBase.view.factory, trainerOpponentId: 1022 } } },
      { ...maskBase, view: { ...maskBase.view, factory: { ...maskBase.view.factory, levelMode: 1 } } },
      { ...maskBase, view: { ...maskBase.view, factory: { ...maskBase.view.factory, battleMode: 1 } } },
      { ...maskBase, view: { ...maskBase.view, factory: { ...maskBase.view.factory, levelMode: 3 as 0 } } },
      { ...maskBase, view: { ...maskBase.view, factory: { ...maskBase.view.factory, battleMode: 2 as 0 } } },
      { ...maskBase, view: { ...maskBase.view, factory: { ...maskBase.view.factory, factoryWinStreak: 65_536 } } },
      { ...maskBase, view: { ...maskBase.view, factory: { ...maskBase.view.factory, trainerOpponentId: 65_536 } } },
    ] as MaskZeroDecisionInput[]) {
      expect(thrownMessage(() => native.chooseFactoryAiMaskZeroDecision(input)))
        .toBe(thrownMessage(() => ts.chooseFactoryAiMaskZeroDecision(input)));
    }
    const scoredBase: ScoredDecisionInput = { view: scoredView(28), request: request(1), rng: { value: 1, calls: 0 } };
    for (const input of [
      { ...scoredBase, view: scoredView(0) },
      { ...scoredBase, request: forced },
      { ...scoredBase, request: withSwitch },
      { ...scoredBase, request: duplicate },
      { ...scoredBase, request: player },
      { ...scoredBase, view: scoredView(28, [0, 150, 150, 150]) },
      { ...scoredBase, view: scoredView(28, [999, 150, 150, 150]) },
      { ...scoredBase, view: { ...scoredBase.view, factory: { ...scoredBase.view.factory, levelMode: 3 as 0 } } },
      { ...scoredBase, view: { ...scoredBase.view, factory: { ...scoredBase.view.factory, battleMode: 2 as 0 } } },
      { ...scoredBase, view: { ...scoredBase.view, factory: { ...scoredBase.view.factory, factoryWinStreak: 65_536 } } },
      { ...scoredBase, view: { ...scoredBase.view, factory: { ...scoredBase.view.factory, trainerOpponentId: 65_536 } } },
    ] as ScoredDecisionInput[]) {
      expect(thrownMessage(() => native.chooseFactoryAiScoredDecision(input)))
        .toBe(thrownMessage(() => ts.chooseFactoryAiScoredDecision(input)));
    }
  });
});
