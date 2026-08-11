import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SEEDS = [1, 99] as const;
const ROLES = ["control", "reach"] as const;
const START_PP = [10, 30, 30, 30] as const;

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
  const path = `tools/battle-lab/mechanic-factory-ai-confuse-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  const captureStart = seed === 1 ? 720 : 800;
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

    const switched = captures.find((capture) => capture.state.battlers.opponent.species === 94);
    assert(switched, `${seed}/${role}: Gengar never appeared in capture window`);
    const firstPpDelta = captures.find((capture) => (
      capture.state.battlers.opponent.species === 94
      && capture.state.battlers.opponent.pp.some((pp, slot) => pp !== START_PP[slot])
    ));
    assert(firstPpDelta, `${seed}/${role}: no Gengar move executed`);

    const rngTransitions = captures.slice(0, -1)
      .map((capture, index) => ({ before: capture, after: captures[index + 1]! }))
      .filter(({ before, after }) => (
        before.frame >= switched.frame
        && after.frame <= firstPpDelta.frame
        && before.state.rngValue !== after.state.rngValue
      ));
    const setupTransitionIndex = rngTransitions.findIndex(({ before, after }, index) => {
      if (stepsToReach(before.state.rngValue, after.state.rngValue) !== 1) return false;
      let engineDraws = 0;
      for (let next = index + 1; next < rngTransitions.length && engineDraws < 8; next += 1) {
        const transition = rngTransitions[next]!;
        const previous = rngTransitions[next - 1]!;
        if (transition.before.state.rngValue !== previous.after.state.rngValue) return false;
        engineDraws += stepsToReach(
          transition.before.state.rngValue,
          transition.after.state.rngValue,
        ) ?? 999;
      }
      return engineDraws === 8;
    });
    assert(setupTransitionIndex >= 0, `${seed}/${role}: 1 + 8 draw decision sequence missing`);
    const setupTransition = rngTransitions[setupTransitionIndex]!;
    const engineFirst = rngTransitions[setupTransitionIndex + 1]!;
    let engineLast = engineFirst;
    let engineDraws = 0;
    for (let next = setupTransitionIndex + 1; next < rngTransitions.length && engineDraws < 8; next += 1) {
      engineLast = rngTransitions[next]!;
      engineDraws += stepsToReach(
        engineLast.before.state.rngValue,
        engineLast.after.state.rngValue,
      ) ?? 999;
    }
    assert(engineDraws === 8, `${seed}/${role}: decision did not consume exactly 8 draws`);

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
      moves: [109, 113, 113, 113],
      attacker: Object.freeze({
        types: ["TYPE_GHOST", "TYPE_POISON"],
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
        ability: "ABILITY_LEVITATE",
      }),
      target: Object.freeze({
        species: player.species,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
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
        ability: reach ? "ABILITY_OWN_TEMPO" : "ABILITY_THICK_FAT",
        knownAbility: null,
        lastUsedMoveId: 233,
        knownMoveIds: [233],
      }),
    });

    const engine = chooseFactoryAiScoredDecision({
      view,
      request,
      rng: { value: engineFirst.before.state.rngValue, calls: 0 },
    });
    assert(engine.trace.draws.length === 8, `${seed}/${role}: engine receipt is not 8 draws`);
    assert(engine.rng.value === engineLast.after.state.rngValue, `${seed}/${role}: engine RNG endpoint differs`);
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose a move`);
    const ppDeltaSlot = firstPpDelta.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== START_PP[slot],
    );
    assert(chosen.moveSlot === ppDeltaSlot, `${seed}/${role}: engine choice differs from PP receipt`);
    assert(
      engine.trace.slotScores[0]!.checkBadMoveDelta === (reach ? -10 : 0),
      `${seed}/${role}: Confuse CBM delta is wrong`,
    );
    assert(
      engine.trace.slotScores[0]!.checkViabilityDelta === 0,
      `${seed}/${role}: full-HP Confuse CV did not stay at zero`,
    );
    assert(
      reach ? chosen.moveSlot !== 0 : chosen.moveSlot === 0,
      `${seed}/${role}: Own Tempo penalty did not causally flip the chosen slot`,
    );

    console.log(
      `PASS seed ${seed} ${role}: PP ${START_PP.join(",")} -> `
      + `${firstPpDelta.state.battlers.opponent.pp.join(",")}; `
      + `CBM ${reach ? -10 : 0}/CV 0; engine 8 draws chose slot ${chosen.moveSlot}; `
      + `scores ${engine.trace.slotScores.map((slot) => slot.finalScore).join(",")}; `
      + `RNG ${engineFirst.before.state.rngValue} -> ${engine.rng.value}`,
    );
  }
}
