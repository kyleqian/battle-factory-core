import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

// Live ROM receipt for AI_CV_DragonDance (`data/battle_ai_scripts.s:2603-2614`,
// EFFECT_DRAGON_DANCE). The handler discriminates on `if_target_faster`:
//   - control (target NOT faster): the `if_hp_more_than AI_USER, 50` exit fires
//     at full HP -- zero of the handler's own draws, CV 0, decision = setup 4 +
//     tie 1 = 5 draws.
//   - reach (target STRICTLY faster): jumps to AI_CV_DragonDance2's single
//     `if_random_less_than 128` roll (+1 on a roll >= 128, 0 on a roll < 128) --
//     decision = setup 4 + roll 1 + tie 1 = 6 draws.
// The pair differs ONLY in the player-lead species' Speed: the same Gyarados
// AI user (real Level-50 Factory rental FRONTIER_MON_GYARADOS_1, Intimidate,
// speed 101/170@170) either outspeeds Shuckle (control, speed 25) or is
// outsped by Crobat (reach, speed 150). Both targets are single-ability
// species, so AI_CheckBadMove's per-slot soundproof ability guess never draws.
// The AI user sits at full HP the whole window (the relay's Vital Throw lands
// only after the decision).

const SEEDS = [1, 99] as const;
const ROLES = ["control", "reach"] as const;
const START_PP = [20, 40, 40, 40] as const;
const CAPTURE_START = 800;
const GYARADOS = 130;

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
  const path = `tools/battle-lab/mechanic-factory-ai-cv-dragondance-${role}-off.json`;
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
    const switched = captures.find((capture) => capture.state.battlers.opponent.species === GYARADOS);
    assert(switched, `${seed}/${role}: Gyarados never appeared`);
    const firstPpDelta = captures.find((capture) => (
      capture.state.battlers.opponent.species === GYARADOS
      && capture.state.battlers.opponent.pp.some((pp, slot) => pp !== START_PP[slot])
    ));
    assert(firstPpDelta, `${seed}/${role}: no Gyarados move executed`);

    const expectedTail = role === "reach" ? 2 : 1;
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
      if (stepsToReach(tail.before.state.rngValue, tail.after.state.rngValue) !== expectedTail) return null;
      return setupSteps;
    };
    const windows = transitions
      .map((_, index, list) => findWindow(list, index))
      .filter((steps): steps is number => steps !== null);
    assert(windows.length === 1, `${seed}/${role}: expected one decision window, found ${windows.length}`);
    const setupSteps = windows[0]!;
    assert(setupSteps === 4, `${seed}/${role}: setup is ${setupSteps} steps, not 4`);
    const windowIndex = transitions.findIndex((_, index, list) => findWindow(list, index) !== null);
    const preTransition = transitions[windowIndex]!;
    const setupTransition = transitions[windowIndex + 1]!;
    const tailTransition = transitions[windowIndex + 2]!;
    const player = switched.state.battlers.player;
    const opponent = switched.state.battlers.opponent;
    assert(
      opponent.hp === opponent.maxHp,
      `${seed}/${role}: Gyarados not at full HP at decision`,
    );
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
      }),
      moves: [349, 150, 150, 150],
      attacker: Object.freeze({
        types: ["TYPE_WATER", "TYPE_FLYING"],
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
        ability: "ABILITY_INTIMIDATE",
      }),
      target: Object.freeze({
        species: player.species,
        types: role === "reach" ? ["TYPE_POISON", "TYPE_FLYING"] : ["TYPE_BUG", "TYPE_ROCK"],
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
        ability: role === "reach" ? "ABILITY_INNER_FOCUS" : "ABILITY_STURDY",
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
    const totalDraws = setupSteps + expectedTail;
    assert(engine.trace.draws.length === totalDraws, `${seed}/${role}: draw count differs`);
    assert(engine.rng.value === tailTransition.after.state.rngValue, `${seed}/${role}: RNG differs`);
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose move`);
    const ppSlot = firstPpDelta.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== START_PP[slot],
    );
    assert(chosen.moveSlot === ppSlot, `${seed}/${role}: PP-selected slot differs`);

    const ddDelta = engine.trace.slotScores[0]!.checkViabilityDelta;
    assert(ddDelta !== null && ddDelta !== undefined, `${seed}/${role}: slot 0 CV null`);
    if (role === "control") {
      assert(ddDelta === 0, `${seed}/control: full-HP DragonDance CV not 0`);
    } else {
      assert(ddDelta === 0 || ddDelta === 1, `${seed}/reach: DragonDance CV ${ddDelta} out of 0..1`);
    }
    const rollDraws = engine.trace.draws
      .filter((draw) => "kind" in draw && typeof draw.kind === "string" && draw.kind.startsWith("dragon-dance-roll"));
    const rollKinds = engine.trace.draws
      .filter((draw) => "kind" in draw)
      .map((draw) => (draw as { kind: string }).kind)
      .filter((kind) => kind.startsWith("dragon-dance-roll"));
    if (role === "control") {
      assert(rollKinds.length === 0, `${seed}/control: unexpected DragonDance roll`);
    } else {
      assert(rollKinds.length === 1, `${seed}/reach: expected exactly one DragonDance roll`);
      assert(rollKinds[0] === "dragon-dance-roll-2", `${seed}/reach: wrong roll site reached`);
      const rollDraw = rollDraws[0] as { randomValue: number; succeeded: boolean };
      const expectedDelta = rollDraw.succeeded ? 1 : 0;
      assert(ddDelta === expectedDelta, `${seed}/reach: CV ${ddDelta} != roll ${rollDraw.succeeded}`);
    }
    console.log(
      `PASS seed ${seed} ${role}: PP ${START_PP.join(",")} -> ${firstPpDelta.state.battlers.opponent.pp.join(",")}; `
      + `DragonDance CV ${ddDelta}; ${role === "reach" ? "1 roll" : "0 rolls"}; setup ${setupSteps} + tail ${expectedTail} = ${totalDraws} draws `
      + `chose slot ${chosen.moveSlot}; scores ${engine.trace.slotScores.map((slot) => slot.finalScore).join(",")}; `
      + `RNG ${preTransition.before.state.rngValue} -> ${setupTransition.before.state.rngValue} -> ${engine.rng.value}`,
    );
  }
}
