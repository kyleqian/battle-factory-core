import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SEEDS = [1, 99] as const;
const ROLES = ["control", "reach"] as const;
const START_PP = [10, 40, 40, 40] as const;
const CAPTURE_START = 600;

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
  const path = `tools/battle-lab/mechanic-factory-ai-cv-chargeup-${role}-off.json`;
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
    const switched = captures.find((capture) => capture.state.battlers.opponent.species === 3);
    assert(switched, `${seed}/${role}: Venusaur never appeared`);
    const firstPpDelta = captures.find((capture) => (
      capture.state.battlers.opponent.species === 3
      && capture.state.battlers.opponent.pp.some((pp, slot) => pp !== START_PP[slot])
    ));
    assert(firstPpDelta, `${seed}/${role}: no Venusaur move executed`);

    const expectedDraws = 5;
    const transitions = captures.slice(0, -1)
      .map((capture, index) => ({ before: capture, after: captures[index + 1]! }))
      .filter(({ before, after }) => (
        before.frame >= switched.frame
        && after.frame <= firstPpDelta.frame
        && before.state.rngValue !== after.state.rngValue
      ));
    const setupIndex = transitions.findIndex(({ before, after }, index) => {
      if (stepsToReach(before.state.rngValue, after.state.rngValue) !== 4) return false;
      const tail = transitions[index + 1];
      return tail !== undefined
        && tail.before.state.rngValue === after.state.rngValue
        && stepsToReach(tail.before.state.rngValue, tail.after.state.rngValue) === 1;
    });
    assert(setupIndex >= 0, `${seed}/${role}: 4 + 1 draw decision missing`);
    assert(
      transitions.filter(({ before, after }, index) => {
        if (stepsToReach(before.state.rngValue, after.state.rngValue) !== 4) return false;
        const tail = transitions[index + 1];
        return tail !== undefined
          && tail.before.state.rngValue === after.state.rngValue
          && stepsToReach(tail.before.state.rngValue, tail.after.state.rngValue) === 1;
      }).length === 1,
      `${seed}/${role}: ambiguous setup/tail pair`,
    );
    const setupTransition = transitions[setupIndex]!;
    const tailTransition = transitions[setupIndex + 1]!;
    const player = switched.state.battlers.player;
    const opponent = switched.state.battlers.opponent;
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
      }),
      moves: [76, 150, 150, 150],
      attacker: Object.freeze({
        types: ["TYPE_GRASS", "TYPE_POISON"],
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
        ability: "ABILITY_OVERGROW",
      }),
      target: Object.freeze({
        species: player.species,
        types: role === "reach" ? ["TYPE_FIRE", "TYPE_FIRE"] : ["TYPE_WATER", "TYPE_WATER"],
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
        ability: role === "reach" ? "ABILITY_FLASH_FIRE" : "ABILITY_WATER_ABSORB",
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
    assert(engine.trace.draws.length === expectedDraws, `${seed}/${role}: draw count differs`);
    assert(engine.rng.value === tailTransition.after.state.rngValue, `${seed}/${role}: RNG differs`);
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose move`);
    const ppSlot = firstPpDelta.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== START_PP[slot],
    );
    assert(chosen.moveSlot === ppSlot, `${seed}/${role}: PP-selected slot differs`);
    assert(
      engine.trace.slotScores[0]!.checkViabilityDelta === (role === "reach" ? -2 : 0),
      `${seed}/${role}: Solar Beam CV score differs`,
    );
    assert(
      role === "reach"
        ? engine.trace.slotScores[0]!.finalScore === 98
        : engine.trace.slotScores[0]!.finalScore === 100,
      `${seed}/${role}: Solar Beam final score differs`,
    );
    assert(
      role === "reach"
        ? chosen.moveSlot !== 0
        : engine.trace.bestMoveSlots.length === 4,
      `${seed}/${role}: choice did not split as the gate predicts`,
    );
    console.log(
      `PASS seed ${seed} ${role}: PP ${START_PP.join(",")} -> ${firstPpDelta.state.battlers.opponent.pp.join(",")}; `
      + `Solar Beam CV ${role === "reach" ? -2 : 0}; engine ${expectedDraws} draws chose slot ${chosen.moveSlot}; `
      + `scores ${engine.trace.slotScores.map((slot) => slot.finalScore).join(",")}; `
      + `RNG ${setupTransition.before.state.rngValue} -> ${engine.rng.value}`,
    );
  }
}
