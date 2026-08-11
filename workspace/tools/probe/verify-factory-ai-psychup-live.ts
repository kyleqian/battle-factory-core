import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

// Live ROM receipt for AI_CV_PsychUp (`data/battle_ai_scripts.s:2086-2112`).
// The reach twin stages the player's Scizor with two real Swords Dances before
// a real Slash KOs the level-5 Magikarp relay. The control twin uses two real
// Focus Energies instead, so the same target never raises a stat stage. A
// level-50 Golduck (Psych Up learned at level 31) then enters with default
// stages and one genuine Psych Up slot; legal Scratch x3 constrains the other
// move slots without injecting an AI choice.
//
// Each capture request has two dense windows. The first contains the carrier
// switch and the scored decision; the second contains the first carrier PP
// decrement. The gap is intentional and the verifier rejects non-adjacent
// frames when reconstructing RNG transitions.

const SEEDS = [1, 2] as const;
const ROLES = ["control", "reach"] as const;
const START_PP = [10, 35, 35, 35] as const;
const PSYCH_UP = 244;
const SCRATCH = 10;
const SCIZOR = 212;
const GOLDUCK = 55;

type Battler = {
  species: number;
  hp: number;
  maxHp: number;
  pp: number[];
  stats: { attack: number; defense: number; speed: number; spAttack: number; spDefense: number };
  statStages: number[];
  moves: number[];
  types: number[];
  ability: number;
};
type Capture = {
  frame: number;
  state: {
    rngValue: number;
    battlers: { player: Battler; opponent: Battler };
  };
};

function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
}

function stepsToReach(start: number, target: number, maxSteps = 64): number | null {
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

function captureFrames(role: (typeof ROLES)[number]): number[] {
  const windows = role === "reach"
    ? [[1400, 196], [1660, 60]]
    : [[1250, 201], [1460, 55]];
  return windows.flatMap(([start, length]) => (
    Array.from({ length }, (_, index) => start + index)
  ));
}

async function run(role: (typeof ROLES)[number], seed: number): Promise<Capture[]> {
  const path = `tools/battle-lab/mechanic-factory-ai-cv-psychup-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  assert(fixture.overrides.battlers === undefined, `${seed}/${role}: legacy battlers override present`);
  assert(fixture.overrides.parties.player.length === 3, `${seed}/${role}: player party is not complete`);
  assert(fixture.overrides.parties.opponent.length === 3, `${seed}/${role}: opponent party is not complete`);
  fixture.trace.captureFrames = captureFrames(role);
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

function stageView(values: number[]) {
  return Object.freeze({
    atk: values[1]!,
    def: values[2]!,
    spAtk: values[4]!,
    spDef: values[5]!,
    speed: values[3]!,
    acc: values[6]!,
    evasion: values[7]!,
  });
}

type Transition = { before: Capture; after: Capture };

for (const seed of SEEDS) {
  for (const role of ROLES) {
    const [captures, rerun] = await Promise.all([run(role, seed), run(role, seed)]);
    assert(JSON.stringify(captures) === JSON.stringify(rerun), `${seed}/${role}: rerun diverged`);

    const switched = captures.find((capture) => capture.state.battlers.opponent.species === GOLDUCK);
    assert(switched, `${seed}/${role}: Golduck carrier never appeared`);
    const firstPpDelta = captures.find((capture) => (
      capture.state.battlers.opponent.species === GOLDUCK
      && capture.state.battlers.opponent.pp.some((pp, slot) => pp !== START_PP[slot])
    ));
    assert(firstPpDelta, `${seed}/${role}: Golduck made no scored move`);
    const ppBefore = captures.find((capture) => capture.frame === firstPpDelta.frame - 1);
    assert(ppBefore, `${seed}/${role}: missing frame before first Golduck PP delta`);
    const ppSlot = firstPpDelta.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== ppBefore.state.battlers.opponent.pp[slot],
    );
    assert(ppSlot >= 0, `${seed}/${role}: PP delta has no move slot`);

    const transitions: Transition[] = captures.slice(0, -1)
      .map((before, index) => ({ before, after: captures[index + 1]! }))
      .filter(({ before, after }) => (
        after.frame === before.frame + 1
        && before.frame >= switched.frame
        && after.frame <= firstPpDelta.frame
        && before.state.rngValue !== after.state.rngValue
      ));
    const findWindow = (list: Transition[], index: number): number | null => {
      const pre = list[index];
      const setup = list[index + 1];
      const tail = list[index + 2];
      if (pre === undefined || setup === undefined || tail === undefined) return null;
      if (stepsToReach(pre.before.state.rngValue, pre.after.state.rngValue) !== 1) return null;
      const setupSteps = stepsToReach(setup.before.state.rngValue, setup.after.state.rngValue);
      if (setupSteps !== 4) return null;
      if (setup.before.state.rngValue !== pre.after.state.rngValue) return null;
      if (tail.before.state.rngValue !== setup.after.state.rngValue) return null;
      if (stepsToReach(tail.before.state.rngValue, tail.after.state.rngValue) !== 1) return null;
      return setupSteps;
    };
    const windowIndices = transitions
      .map((_, index, list) => findWindow(list, index) === 4 ? index : -1)
      .filter((index) => index >= 0);
    assert(windowIndices.length === 1, `${seed}/${role}: expected one Psych Up decision window, found ${windowIndices.length}`);
    const windowIndex = windowIndices[0]!;
    const preTransition = transitions[windowIndex]!;
    const setupTransition = transitions[windowIndex + 1]!;
    const tailTransition = transitions[windowIndex + 2]!;
    const startRng = preTransition.before.state.rngValue;
    const endRng = tailTransition.after.state.rngValue;

    const player = switched.state.battlers.player;
    const opponent = switched.state.battlers.opponent;
    assert(player.species === SCIZOR, `${seed}/${role}: wrong player target species`);
    assert(player.statStages[1] === (role === "reach" ? 10 : 6), `${seed}/${role}: staged target ATK is wrong`);
    assert(player.statStages.slice(2).every((stage) => stage === 6), `${seed}/${role}: another target stage was raised`);
    assert(opponent.statStages.every((stage) => stage === 6), `${seed}/${role}: carrier did not enter at default stages`);
    assert(opponent.moves.join(",") === `${PSYCH_UP},${SCRATCH},${SCRATCH},${SCRATCH}`, `${seed}/${role}: carrier move slots differ`);

    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
      }),
      moves: [PSYCH_UP, SCRATCH, SCRATCH, SCRATCH],
      attacker: Object.freeze({
        types: ["TYPE_WATER", "TYPE_WATER"],
        attack: opponent.stats.attack,
        defense: opponent.stats.defense,
        spAttack: opponent.stats.spAttack,
        spDefense: opponent.stats.spDefense,
        speed: opponent.stats.speed,
        level: 50,
        statStages: neutralStages,
        isFirstTurn: 2,
        hp: opponent.hp,
        maxHp: opponent.maxHp,
        ability: "ABILITY_DAMP",
      }),
      target: Object.freeze({
        species: SCIZOR,
        types: ["TYPE_BUG", "TYPE_STEEL"],
        attack: player.stats.attack,
        defense: player.stats.defense,
        spAttack: player.stats.spAttack,
        spDefense: player.stats.spDefense,
        speed: player.stats.speed,
        level: 50,
        statStages: stageView(player.statStages),
        isFirstTurn: 0,
        hp: player.hp,
        maxHp: player.maxHp,
        ability: "ABILITY_SWARM",
        knownAbility: null,
        lastUsedMoveId: 163,
        knownMoveIds: [163],
      }),
    });
    const engine = chooseFactoryAiScoredDecision({
      view,
      request,
      // The first live transition is BattleTurnPassed's owned draw. Seed the
      // adapter before it and name that ownership explicitly, so this receipt
      // proves exactly one turn-start draw rather than hiding or duplicating it.
      rng: { value: startRng, calls: 0 },
      turnStartRandomNumber: { owner: "decision" },
    });
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose a move`);
    const drawKinds = engine.trace.draws.map((draw) => draw.kind);
    assert(engine.trace.turnStartRandomNumber.owner === "decision", `${seed}/${role}: turn-start ownership was not explicit`);
    assert(engine.trace.draws.length === 6, `${seed}/${role}: expected 6 draws including BattleTurnPassed`);
    assert(JSON.stringify(drawKinds) === JSON.stringify([
      "turn-start-random-number",
      "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
      "best-move-tie",
    ]), `${seed}/${role}: draw kinds differ: ${drawKinds.join(",")}`);
    assert(engine.rng.value === endRng, `${seed}/${role}: endpoint RNG differs`);
    assert(chosen.moveSlot === ppSlot, `${seed}/${role}: ROM PP-selected slot differs from engine`);
    const expectedCv = role === "reach" ? 1 : -2;
    // The Psych Up CV split is stable; the ordinary TryToFaint pass can still
    // lower one inert Scratch slot on seed 2, so receipt rows bank the full
    // per-slot score vector rather than assuming every tie slot is 100.
    const expectedScores = role === "reach"
      ? (seed === 2 ? [101, 100, 99, 100] : [101, 100, 100, 100])
      : (seed === 2 ? [88, 100, 99, 100] : [88, 100, 100, 100]);
    assert(JSON.stringify(engine.trace.slotScores.map((slot) => slot.checkViabilityDelta)) === JSON.stringify([expectedCv, 0, 0, 0]), `${seed}/${role}: CV vector differs`);
    assert(JSON.stringify(engine.trace.slotScores.map((slot) => slot.finalScore)) === JSON.stringify(expectedScores), `${seed}/${role}: score vector differs`);
    console.log(`PASS ${JSON.stringify({
      seed,
      role,
      switchedFrame: switched.frame,
      decisionPreFrame: preTransition.before.frame,
      setupFrame: setupTransition.before.frame,
      ppFrame: firstPpDelta.frame,
      ppSlot,
      rngStart: startRng,
      rngEnd: endRng,
      drawKinds,
      cvDeltas: engine.trace.slotScores.map((slot) => slot.checkViabilityDelta),
      scores: engine.trace.slotScores.map((slot) => slot.finalScore),
      chosenSlot: chosen.moveSlot,
    })}`);
  }
}
