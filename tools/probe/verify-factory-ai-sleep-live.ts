import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SEEDS = [1, 99] as const;
const ROLES = ["control", "reach"] as const;
const START_PP = [15, 30, 30, 30] as const;

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
  const path = `tools/battle-lab/mechanic-factory-ai-sleep-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  fixture.trace.captureFrames = Array.from({ length: 256 }, (_, index) => 650 + index);
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

    const switched = captures.find((capture) => capture.state.battlers.opponent.species === 362);
    assert(switched, `${seed}/${role}: Dusclops never switched in`);
    const firstPpDelta = captures.find((capture) => (
      capture.state.battlers.opponent.species === 362
      && capture.state.battlers.opponent.pp.some((pp, slot) => pp !== START_PP[slot])
    ));
    assert(firstPpDelta, `${seed}/${role}: no Dusclops move executed`);

    const rngTransitions = captures.slice(0, -1)
      .map((capture, index) => ({ before: capture, after: captures[index + 1]! }))
      .filter(({ before, after }) => (
        before.frame >= switched.frame
        && after.frame < firstPpDelta.frame
        && before.state.rngValue !== after.state.rngValue
      ));
    const setupTransitionIndex = rngTransitions.findIndex(({ before, after }) => (
      stepsToReach(before.state.rngValue, after.state.rngValue) === 1
    ));
    assert(setupTransitionIndex >= 0, `${seed}/${role}: one-draw pre-AI transition missing`);
    const setupTransition = rngTransitions[setupTransitionIndex]!;
    const engineTransition = rngTransitions[setupTransitionIndex + 1];
    assert(engineTransition, `${seed}/${role}: AI transition missing`);
    assert(
      stepsToReach(engineTransition.before.state.rngValue, engineTransition.after.state.rngValue) === 8,
      `${seed}/${role}: AI transition is not exactly 8 draws`,
    );
    assert(
      setupTransition.after.state.rngValue === engineTransition.before.state.rngValue,
      `${seed}/${role}: unexpected RNG call between ordinary setup and AI`,
    );

    const player = switched.state.battlers.player;
    const opponent = switched.state.battlers.opponent;
    const reach = role === "reach";
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0,
        battleMode: 0,
        factoryWinStreak: 28,
        trainerOpponentId: 222,
      }),
      moves: [47, 113, 113, 113],
      attacker: Object.freeze({
        types: ["TYPE_GHOST", "TYPE_GHOST"],
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
        lightScreenUp: true,
        ability: "ABILITY_PRESSURE",
      }),
      target: Object.freeze({
        species: player.species,
        types: ["TYPE_GHOST", "TYPE_GHOST"],
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
        ability: reach ? "ABILITY_INSOMNIA" : "ABILITY_LEVITATE",
        knownAbility: null,
        lastUsedMoveId: 233,
        knownMoveIds: [233],
      }),
    });

    const engine = chooseFactoryAiScoredDecision({
      view,
      request,
      rng: { value: engineTransition.before.state.rngValue, calls: 0 },
    });
    assert(engine.trace.draws.length === 8, `${seed}/${role}: engine receipt is not 8 draws`);
    assert(
      engine.rng.value === engineTransition.after.state.rngValue,
      `${seed}/${role}: engine RNG endpoint differs`,
    );
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose a move`);
    const ppDeltaSlot = firstPpDelta.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== START_PP[slot],
    );
    assert(chosen.moveSlot === ppDeltaSlot, `${seed}/${role}: engine choice differs from PP receipt`);
    assert(
      engine.trace.slotScores[0]!.checkBadMoveDelta === (reach ? -10 : 0),
      `${seed}/${role}: Sleep CBM delta is wrong`,
    );
    assert(
      reach ? chosen.moveSlot !== 0 : chosen.moveSlot === 0,
      `${seed}/${role}: Sleep penalty did not causally flip the chosen slot`,
    );

    console.log(
      `PASS seed ${seed} ${role}: PP ${START_PP.join(",")} -> `
      + `${firstPpDelta.state.battlers.opponent.pp.join(",")}; `
      + `CBM ${reach ? -10 : 0}; engine 8 draws chose slot ${chosen.moveSlot}; `
      + `RNG ${engineTransition.before.state.rngValue} -> ${engine.rng.value}`,
    );
  }
}
