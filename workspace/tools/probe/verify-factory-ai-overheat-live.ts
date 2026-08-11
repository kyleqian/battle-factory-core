import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SEEDS = [1, 99] as const;
const ROLES = ["control", "reach"] as const;
const START_PP = [5, 40, 40, 40] as const;
const CAPTURE_START = 650;

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
  const path = `tools/battle-lab/mechanic-factory-ai-cv-overheat-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  fixture.trace.captureFrames = Array.from(
    { length: 256 },
    (_, index) => CAPTURE_START + index,
  );
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
    const switched = captures.find((capture) => capture.state.battlers.opponent.species === 136);
    assert(switched, `${seed}/${role}: Flareon never appeared`);
    assert(
      switched.state.battlers.player.species === (role === "reach" ? 134 : 113),
      `${seed}/${role}: player lead species does not match the scenario`,
    );
    const firstPpDelta = captures.find((capture) => (
      capture.state.battlers.opponent.species === 136
      && capture.state.battlers.opponent.pp.some((pp, slot) => pp !== START_PP[slot])
    ));
    assert(firstPpDelta, `${seed}/${role}: no Flareon move executed`);

    // The decision window is a pre draw (1 step) + setup (N steps; 4 base
    // setup-simulated-rng + per-slot get-ability/CV draws) + tie tail (1
    // step), all chained. N varies by role: reach draws the four base setup
    // draws only (4), while control's Chansey target has two possible
    // abilities, so AI_CheckBadMove's per-slot `get_ability` soundproof
    // guess consumes one draw each (8 total).
    const transitions = captures.slice(0, -1)
      .map((capture, index) => ({ before: capture, after: captures[index + 1]! }))
      .filter(({ before, after }) => (
        before.frame >= switched.frame
        && after.frame <= firstPpDelta.frame
        && before.state.rngValue !== after.state.rngValue
      ));
    type Transition = { before: Capture; after: Capture };
    const findWindow = (list: Transition[], index: number): number | null => {
      const pre = list[index];
      const setup = list[index + 1];
      const tail = list[index + 2];
      if (pre === undefined || setup === undefined || tail === undefined) return null;
      if (stepsToReach(pre.before.state.rngValue, pre.after.state.rngValue) !== 1) return null;
      const setupSteps = stepsToReach(setup.before.state.rngValue, setup.after.state.rngValue);
      if (setupSteps === null || setupSteps < 4) return null;
      if (setup.before.state.rngValue !== pre.after.state.rngValue) return null;
      if (tail.before.state.rngValue !== setup.after.state.rngValue) return null;
      if (stepsToReach(tail.before.state.rngValue, tail.after.state.rngValue) !== 1) return null;
      return setupSteps;
    };
    const windows = transitions
      .map((_, index, list) => findWindow(list, index))
      .filter((steps): steps is number => steps !== null);
    assert(windows.length === 1, `${seed}/${role}: expected one decision window, found ${windows.length}`);
    const setupSteps = windows[0]!;
    const windowIndex = transitions.findIndex((_, index, list) => findWindow(list, index) !== null);
    const preTransition = transitions[windowIndex]!;
    const setupTransition = transitions[windowIndex + 1]!;
    const tailTransition = transitions[windowIndex + 2]!;
    const player = switched.state.battlers.player;
    const opponent = switched.state.battlers.opponent;
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
      }),
      moves: [315, 150, 150, 150],
      attacker: Object.freeze({
        types: ["TYPE_FIRE", "TYPE_FIRE"],
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
        ability: "ABILITY_FLASH_FIRE",
      }),
      target: Object.freeze({
        species: player.species,
        types: role === "reach" ? ["TYPE_WATER", "TYPE_WATER"] : ["TYPE_NORMAL", "TYPE_NORMAL"],
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
        ability: role === "reach" ? "ABILITY_WATER_ABSORB" : "ABILITY_NATURAL_CURE",
        knownAbility: null,
        lastUsedMoveId: 233,
        knownMoveIds: [233],
      }),
    });
    const engine = chooseFactoryAiScoredDecision({
      view,
      request,
      rng: { value: setupTransition.before.state.rngValue, calls: 0 },
    });
    assert(engine.trace.draws.length === setupSteps + 1, `${seed}/${role}: draw count differs`);
    assert(engine.rng.value === tailTransition.after.state.rngValue, `${seed}/${role}: RNG differs`);
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose move`);
    const ppSlot = firstPpDelta.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== START_PP[slot],
    );
    assert(chosen.moveSlot === ppSlot, `${seed}/${role}: PP-selected slot differs`);
    assert(
      engine.trace.slotScores[0]!.checkViabilityDelta === (role === "reach" ? -1 : 0),
      `${seed}/${role}: Overheat CV score differs`,
    );
    assert(
      role === "reach"
        ? engine.trace.slotScores[0]!.finalScore === 99
        : engine.trace.slotScores[0]!.finalScore === 100,
      `${seed}/${role}: Overheat final score differs`,
    );
    assert(
      role === "reach"
        ? chosen.moveSlot !== 0
        : engine.trace.bestMoveSlots.length === 4,
      `${seed}/${role}: choice did not split as the gate predicts`,
    );
    console.log(
      `PASS seed ${seed} ${role}: PP ${START_PP.join(",")} -> ${firstPpDelta.state.battlers.opponent.pp.join(",")}; `
      + `target ${role === "reach" ? "Vaporeon (Water, 0.5x)" : "Chansey (Normal, 1x)"}; `
      + `Overheat CV ${role === "reach" ? -1 : 0}; setup ${setupSteps} + tie 1 = ${setupSteps + 1} draws `
      + `chose slot ${chosen.moveSlot}; scores ${engine.trace.slotScores.map((slot) => slot.finalScore).join(",")}; `
      + `RNG ${preTransition.before.state.rngValue} -> ${setupTransition.before.state.rngValue} -> ${engine.rng.value}`,
    );
  }
}
