import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

// Live ROM receipt for AI_CV_BrickBreak (data/battle_ai_scripts.s:2457-2464).
// The handler's single gate is target-side Reflect (if_side_affecting
// AI_TARGET, SIDE_STATUS_REFLECT) scores +1, else zero (no draws either way).
// The reach/control fixture pair stages that gate with a real move -- the
// player's own side uses Reflect (reach) or Splash (control) -- and this
// script replays turn 2's AI decision against the ROM, then compares the
// observed chosen slot + draw count + RNG endpoint with
// chooseFactoryAiScoredDecision's output on the same captured view.

const SEEDS = [2, 3] as const;
const ROLES = ["control", "reach"] as const;
const OPP_START_PP = [15, 40, 40, 40] as const;
const WINDOW_START = 256;

type Battler = {
  species: number;
  hp: number;
  maxHp: number;
  pp: number[];
  moves: number[];
  ability: number;
  types: number[];
  stats: { attack: number; defense: number; speed: number; spAttack: number; spDefense: number };
};
type Capture = {
  frame: number;
  state: {
    rngValue: number;
    sideConditions: { player: { reflectTurns: number }; opponent: { reflectTurns: number } };
    battlers: { player: Battler; opponent: Battler };
  };
};

function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
}

function stepsToReach(start: number, target: number, maxSteps = 40): number | null {
  let value = start;
  for (let steps = 1; steps <= maxSteps; steps += 1) {
    value = rngStep(value);
    if (value === target) return steps;
  }
  return null;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run(role: typeof ROLES[number], seed: number): Promise<Capture[]> {
  const path = `tools/battle-lab/mechanic-factory-ai-cv-brickbreak-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  fixture.trace.captureFrames = Array.from({ length: 256 }, (_, index) => WINDOW_START + index);
  const response = await fetch(`${oracleUrlForProfile("battle-scene-off")}/v1/battle-lab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fixture),
  });
  if (!response.ok) throw new Error(`battle-lab HTTP ${response.status}: ${await response.text()}`);
  return ((await response.json()) as { captures: Capture[] }).captures;
}

const request = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: [0, 1, 2, 3].map((moveSlot) => ({
    kind: "use-move" as const,
    moveSlot,
    targetBattler: 0,
  })),
});
const neutralStages = Object.freeze({
  atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6,
});

function viewFor(
  role: typeof ROLES[number],
  capture: Capture,
  targetSideReflectUp: boolean,
): FactoryAiScoredView {
  const player = capture.state.battlers.player;
  const opponent = capture.state.battlers.opponent;
  const targetMove = role === "reach" ? 115 : 150;
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: Object.freeze({
      levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
    }),
    moves: [280, 150, 150, 150],
    attacker: Object.freeze({
      types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
      attack: opponent.stats.attack,
      defense: opponent.stats.defense,
      spAttack: opponent.stats.spAttack,
      spDefense: opponent.stats.spDefense,
      speed: opponent.stats.speed,
      level: 50,
      statStages: neutralStages,
      isFirstTurn: 0,
      hp: opponent.hp,
      maxHp: opponent.maxHp,
      ability: "ABILITY_SYNCHRONIZE",
    }),
    target: Object.freeze({
      species: 134,
      types: ["TYPE_WATER", "TYPE_WATER"],
      attack: player.stats.attack,
      defense: player.stats.defense,
      spAttack: player.stats.spAttack,
      spDefense: player.stats.spDefense,
      speed: player.stats.speed,
      level: 50,
      statStages: neutralStages,
      isFirstTurn: 0,
      hp: player.hp,
      maxHp: player.maxHp,
      ability: "ABILITY_WATER_ABSORB",
      knownAbility: null,
      lastUsedMoveId: targetMove,
      knownMoveIds: [targetMove, targetMove, targetMove, targetMove],
      ...(targetSideReflectUp ? { targetSideReflectUp: true } : {}),
    }),
  });
}

for (const seed of SEEDS) {
  for (const role of ROLES) {
    const [captures, rerun] = await Promise.all([run(role, seed), run(role, seed)]);
    assert(JSON.stringify(captures) === JSON.stringify(rerun), `${seed}/${role}: rerun diverged`);

    // Turn 2's decision RNG footprint: the ordinary battle call (1 step), the
    // per-slot setup (4 steps), then the unconditional final tie draw (1 step)
    // -- BrickBreak's CV body itself draws nothing, so the tail is 1. Turn
    // 1's AI decision happened before the user-trace frame 0 (the lab routes
    // the pre-action checkpoint), so the FIRST `1 + 4 + 1` chain inside the
    // window is turn 2's own decision.
    const transitions = captures.slice(0, -1)
      .map((before, index) => ({ before, after: captures[index + 1]! }))
      .filter(({ before, after }) => before.state.rngValue !== after.state.rngValue);
    const decisionIndex = transitions.findIndex(({ before, after }, index) => {
      if (stepsToReach(before.state.rngValue, after.state.rngValue) !== 1) return false;
      const setup = transitions[index + 1];
      const tail = transitions[index + 2];
      return setup !== undefined
        && tail !== undefined
        && setup.before.state.rngValue === after.state.rngValue
        && stepsToReach(setup.before.state.rngValue, setup.after.state.rngValue) === 4
        && tail.before.state.rngValue === setup.after.state.rngValue
        && stepsToReach(tail.before.state.rngValue, tail.after.state.rngValue) === 1;
    });
    assert(decisionIndex >= 0, `${seed}/${role}: 1 + 4 + 1 decision missing`);
    const setupTransition = transitions[decisionIndex + 1]!;
    const tailTransition = transitions[decisionIndex + 2]!;

    // The AI's chosen move this turn -- the first opponent-PP CHANGE strictly
    // after the decision's tie draw. (The stale post-turn-1 PP state
    // [15,39,40,40] is already in effect inside the window, so a delta must
    // be detected as a change between consecutive captures, not against the
    // battle-start values.)
    let prevOppPp: readonly number[] | null = null;
    let ppDelta: Capture | undefined;
    let ppSlot = -1;
    for (const capture of captures) {
      const pp = capture.state.battlers.opponent.pp;
      if (prevOppPp !== null
        && capture.frame > tailTransition.after.frame
        && pp.some((value, slot) => value !== prevOppPp![slot])) {
        ppDelta = capture;
        ppSlot = pp.findIndex((value, slot) => value !== prevOppPp![slot]);
        break;
      }
      prevOppPp = [...pp];
    }
    assert(ppDelta, `${seed}/${role}: no turn-2 opponent PP delta`);
    assert(ppSlot >= 0, `${seed}/${role}: no PP delta slot`);
    assert(
      ppDelta.state.battlers.opponent.pp[ppSlot] === OPP_START_PP[ppSlot] - 1,
      `${seed}/${role}: turn-2 PP delta is not exactly one use`,
    );

    const targetSideReflectUp = (
      role === "reach"
      && setupTransition.before.state.sideConditions.player.reflectTurns > 0
    );
    assert(
      targetSideReflectUp === (role === "reach"),
      `${seed}/${role}: target-side Reflect state wrong (${targetSideReflectUp})`,
    );
    if (role === "control") {
      assert(
        setupTransition.before.state.sideConditions.player.reflectTurns === 0,
        `${seed}/control: control window had Reflect up`,
      );
    }

    const view = viewFor(role, setupTransition.before, targetSideReflectUp);
    const engine = chooseFactoryAiScoredDecision({
      view,
      request,
      rng: { value: setupTransition.before.state.rngValue, calls: 0 },
    });
    assert(engine.trace.draws.length === 5, `${seed}/${role}: draw count differs`);
    assert(engine.rng.value === tailTransition.after.state.rngValue, `${seed}/${role}: RNG differs`);
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose a move`);
    assert(chosen.moveSlot === ppSlot, `${seed}/${role}: PP-selected slot differs`);
    assert(
      engine.trace.slotScores[0]!.checkViabilityDelta === (role === "reach" ? 1 : 0),
      `${seed}/${role}: BrickBreak CV score differs`,
    );
    assert(
      engine.trace.slotScores[0]!.finalScore === (role === "reach" ? 101 : 100),
      `${seed}/${role}: BrickBreak final score differs`,
    );
    if (role === "reach") {
      assert(chosen.moveSlot === 0, `${seed}/reach: reach did not pick BrickBreak`);
    }

    console.log(
      `PASS seed ${seed} ${role}: refl=${setupTransition.before.state.sideConditions.player.reflectTurns}; `
      + `opp PP ${OPP_START_PP.join(",")} -> ${ppDelta.state.battlers.opponent.pp.join(",")}; `
      + `BrickBreak CV ${role === "reach" ? "+1" : "0"}; engine 5 draws chose slot ${chosen.moveSlot}; `
      + `scores ${engine.trace.slotScores.map((slot) => slot.finalScore).join(",")}; `
      + `RNG ${setupTransition.before.state.rngValue} -> ${engine.rng.value}`,
    );
  }
}
