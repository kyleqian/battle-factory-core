import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

// Live ROM receipt for AI_CV_Curse (`data/battle_ai_scripts.s:1870-1892`,
// EFFECT_CURSE). The handler splits on the AI user's OWN type:
//   - control (non-Ghost user): the three-DEF-band ladder. At default DEF
//     stage all three `if_stat_level_more_than` gates fall through, so all
//     three `if_random_less_than 128` sites are reached -- exactly 3 CV draws,
//     scoring +1 per roll >= 128 (+0..+3). Decision = setup 4 + curse 3 + tie
//     1 = 8 draws.
//   - reach (Ghost-type user): jumps straight to Curse4 -- zero CV draws, 0 at
//     full HP (`if_hp_more_than 80` exits). Decision = setup 4 + tie 1 = 5
//     draws.
// The pair differs only in the AI user's species/typing: Snorlax (pure
// Normal) control vs Dusclops (pure Ghost) reach, both real Level-50 Factory
// rentals, both staged with [Curse, Splash, Splash, Splash] behind the
// Magikarp-relay switch-in recipe.

const SEEDS = [1, 5, 99] as const;
const ROLES = ["control", "reach"] as const;
const START_PP = [10, 40, 40, 40] as const;
const CAPTURE_START = 700;

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
  const path = `tools/battle-lab/mechanic-factory-ai-cv-curse-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  fixture.trace.captureFrames = Array.from({ length: 256 }, (_, index) => CAPTURE_START + index);
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
    const curseSpecies = role === "reach" ? 362 : 143;
    const switched = captures.find((capture) => capture.state.battlers.opponent.species === curseSpecies);
    assert(switched, `${seed}/${role}: ${role === "reach" ? "Dusclops" : "Snorlax"} never appeared`);
    const firstPpDelta = captures.find((capture) => (
      capture.state.battlers.opponent.species === curseSpecies
      && capture.state.battlers.opponent.pp.some((pp, slot) => pp !== START_PP[slot])
    ));
    assert(firstPpDelta, `${seed}/${role}: no ${role === "reach" ? "Dusclops" : "Snorlax"} move executed`);

    const expectedDraws = role === "reach" ? 5 : 8;
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
    assert(decisionIndex >= 0, `${seed}/${role}: 1 + 4 + ${expectedDraws - 4} decision missing`);
    const setupTransition = transitions[decisionIndex + 1]!;
    const tailTransition = transitions[decisionIndex + 2]!;
    const player = switched.state.battlers.player;
    const opponent = switched.state.battlers.opponent;
    assert(
      opponent.hp === opponent.maxHp,
      `${seed}/${role}: ${role === "reach" ? "Dusclops" : "Snorlax"} not at full HP at decision`,
    );
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
      }),
      moves: [174, 150, 150, 150],
      attacker: Object.freeze({
        types: role === "reach"
          ? ["TYPE_GHOST", "TYPE_GHOST"] as const
          : ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
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
        ability: role === "reach" ? "ABILITY_PRESSURE" : "ABILITY_IMMUNITY",
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

    const curseDelta = engine.trace.slotScores[0]!.checkViabilityDelta;
    assert(curseDelta !== null && curseDelta !== undefined, `${seed}/${role}: slot 0 CV null`);
    if (role === "reach") {
      assert(curseDelta === 0, `${seed}/reach: Ghost Curse CV not 0 at full HP`);
    } else {
      assert(curseDelta >= 0 && curseDelta <= 3, `${seed}/control: non-Ghost Curse CV ${curseDelta} out of 0..3`);
    }
    const rolls = engine.trace.draws
      .filter((draw) => "kind" in draw && typeof draw.kind === "string" && draw.kind.startsWith("curse-roll"))
      .map((draw) => {
        const jumped = (draw as { jumped?: boolean }).jumped ?? false;
        return `${(draw as { randomValue: number }).randomValue % 256}${jumped ? "jump" : "+1"}`;
      });
    assert(rolls.length === (role === "reach" ? 0 : 3), `${seed}/${role}: curse roll count ${rolls.length}`);
    console.log(
      `PASS seed ${seed} ${role}: PP ${START_PP.join(",")} -> ${firstPpDelta.state.battlers.opponent.pp.join(",")}; `
      + `CV ${curseDelta}; ${rolls.length} rolls [${rolls.join(",")}]; engine ${expectedDraws} draws chose slot ${chosen.moveSlot}; `
      + `scores ${engine.trace.slotScores.map((slot) => slot.finalScore).join(",")}; `
      + `RNG ${setupTransition.before.state.rngValue} -> ${engine.rng.value}`,
    );
  }
}
