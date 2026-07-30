import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SEEDS = [2, 3] as const;
const ROLES = ["control", "reach"] as const;
const START_PP = [20, 40, 40, 40] as const;

type Battler = {
  species: number;
  hp: number;
  maxHp: number;
  pp: number[];
  stats: { attack: number; defense: number; speed: number; spAttack: number; spDefense: number };
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

function stepsToReach(start: number, target: number, maxSteps = 32): number | null {
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
  const path = `tools/battle-lab/mechanic-factory-ai-counter-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  const captureStart = role === "reach" ? 668 : 512;
  fixture.trace.captureFrames = Array.from({ length: 256 }, (_, index) => captureStart + index);
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

for (const seed of SEEDS) {
  for (const role of ROLES) {
    const [captures, rerun] = await Promise.all([run(role, seed), run(role, seed)]);
    assert(JSON.stringify(captures) === JSON.stringify(rerun), `${seed}/${role}: rerun diverged`);
    const switched = captures.find((capture) => capture.state.battlers.opponent.species === 213);
    assert(switched, `${seed}/${role}: Shuckle never appeared`);
    const firstPpDelta = captures.find((capture) => (
      capture.state.battlers.opponent.species === 213
      && capture.state.battlers.opponent.pp.some((pp, slot) => pp !== START_PP[slot])
    ));
    assert(firstPpDelta, `${seed}/${role}: no Shuckle move executed`);

    const expectedDraws = role === "reach" ? 6 : 5;
    const transitions = captures.slice(0, -1)
      .map((capture, index) => ({ before: capture, after: captures[index + 1]! }))
      .filter(({ before, after }) => (
        before.frame >= switched.frame
        && after.frame <= firstPpDelta.frame
        && before.state.rngValue !== after.state.rngValue
      ));
    const decisionIndex = transitions.findIndex(({ before, after }, index) => {
      if (stepsToReach(before.state.rngValue, after.state.rngValue) !== 1) return false;
      const setup = transitions[index + 1];
      const tail = transitions[index + 2];
      return setup !== undefined
        && tail !== undefined
        && setup.before.state.rngValue === after.state.rngValue
        && stepsToReach(setup.before.state.rngValue, setup.after.state.rngValue) === 4
        && tail.before.state.rngValue === setup.after.state.rngValue
        && stepsToReach(tail.before.state.rngValue, tail.after.state.rngValue) === expectedDraws - 4;
    });
    assert(decisionIndex >= 0, `${seed}/${role}: 1 + 4 + ${expectedDraws - 4} draw decision missing`);
    const setupTransition = transitions[decisionIndex + 1]!;
    const tailTransition = transitions[decisionIndex + 2]!;
    const player = switched.state.battlers.player;
    const opponent = switched.state.battlers.opponent;
    const playerMove = role === "reach" ? 233 : 94;
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
      }),
      moves: [68, 150, 150, 150],
      attacker: Object.freeze({
        types: ["TYPE_BUG", "TYPE_ROCK"],
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
        ability: "ABILITY_STURDY",
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
        lastUsedMoveId: playerMove,
        knownMoveIds: [playerMove],
      }),
    });
    const engine = chooseFactoryAiScoredDecision({
      view,
      request,
      rng: { value: setupTransition.before.state.rngValue, calls: 0 },
    });
    assert(engine.trace.draws.length === expectedDraws, `${seed}/${role}: draw count differs`);
    assert(engine.rng.value === tailTransition.after.state.rngValue, `${seed}/${role}: RNG differs`);
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose move`);
    const ppSlot = firstPpDelta.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== START_PP[slot],
    );
    assert(chosen.moveSlot === ppSlot, `${seed}/${role}: PP-selected slot differs`);
    assert(role === "reach" ? chosen.moveSlot === 0 : chosen.moveSlot !== 0, `${seed}/${role}: choice did not split`);
    assert(
      engine.trace.slotScores[0]!.checkViabilityDelta === (role === "reach" ? 1 : -1),
      `${seed}/${role}: Counter CV score differs`,
    );
    console.log(
      `PASS seed ${seed} ${role}: PP ${START_PP.join(",")} -> ${firstPpDelta.state.battlers.opponent.pp.join(",")}; `
      + `Counter CV ${role === "reach" ? 1 : -1}; engine ${expectedDraws} draws chose slot ${chosen.moveSlot}; `
      + `scores ${engine.trace.slotScores.map((slot) => slot.finalScore).join(",")}; `
      + `RNG ${setupTransition.before.state.rngValue} -> ${engine.rng.value}`,
    );
  }
}
