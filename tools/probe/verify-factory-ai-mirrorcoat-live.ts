import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

// Live verifier for AI_CV_MirrorCoat (docs/factory-ai-cv-live-receipts-mirrorcoat.md).
// The AI user is the OPPONENT LEAD (Wobbuffet [Mirror Coat, Counter, Splash,
// Splash] for reach; Corsola [Mirror Coat, Splash, Splash, Splash] for
// control), so the turn-1 decision is invisible (drawn in the battle intro).
// The FIRST observable decision is turn 2, between the first and second PP
// deltas. The turn-1 decision is a setup+scoring+tie burst whose draw count is
// scenario-fixed: reach 7 (4 setup + CV roll-7 + counter-bonus-roll + tie),
// control 7 (4 setup + CV roll-6 + roll-7 + tie). Both use a single-ability
// Ground target (Donphan) so the pre-decision switch check (ShouldSwitch,
// battle_ai_switch_items.c:429) draws zero RNG and the get-ability draws are
// zero. The MOVE_COUNTER gate is the discriminator: control (no Counter in the
// set) must take the power-0 control path; a buggy port that checks 243 (Mirror
// Coat's own id) instead of 68 takes the Counter path and draws one fewer.

const SEEDS = [1, 99] as const;
const ROLES = ["control", "reach"] as const;

type Battler = {
  species: number;
  hp: number;
  maxHp: number;
  pp: number[];
  stats: { attack: number; defense: number; speed: number; spAttack: number; spDefense: number };
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

async function run(role: (typeof ROLES)[number], seed: number): Promise<Capture[]> {
  const path = `tools/battle-lab/mechanic-factory-ai-cv-mirrorcoat-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  // The turn-1 decision is drawn in the intro (invisible); the turn-2 decision
  // lies between the first PP delta (~f225) and the second (~f585-600). Capture
  // three 256-frame windows spanning both deltas and the decision burst.
  const captures: Capture[] = [];
  for (const start of [0, 256, 512]) {
    fixture.trace.captureFrames = Array.from({ length: 256 }, (_, index) => start + index);
    const response = await fetch(`${oracleUrlForProfile("battle-scene-off")}/v1/battle-lab/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fixture),
    });
    if (!response.ok) throw new Error(`battle-lab HTTP ${response.status}: ${await response.text()}`);
    captures.push(...((await response.json()) as { captures: Capture[] }).captures);
  }
  return captures.sort((a, b) => a.frame - b.frame);
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

const TYPE_BY_ID: readonly string[] = [
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_??",
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC",
  "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK",
];

for (const seed of SEEDS) {
  for (const role of ROLES) {
    const [captures, rerun] = await Promise.all([run(role, seed), run(role, seed)]);
    assert(JSON.stringify(captures) === JSON.stringify(rerun), `${seed}/${role}: rerun diverged`);
    const switched = captures.find((capture) => capture.state.battlers.opponent.species === (role === "reach" ? 202 : 222));
    assert(switched, `${seed}/${role}: Mirror Coat carrier never appeared`);

    // PP delta frames bound the turns. The first delta is turn-1 execution;
    // the decision for turn 2 lies between the first and second deltas.
    const ppDeltas = captures.slice(0, -1)
      .map((capture, index) => ({ before: capture, after: captures[index + 1]! }))
      .filter(({ before, after }) => (
        before.state.battlers.opponent.pp.join(",") !== after.state.battlers.opponent.pp.join(",")
      ))
      .map(({ after }) => after.frame);
    assert(ppDeltas.length >= 2, `${seed}/${role}: expected at least two PP deltas, got ${ppDeltas.length}`);
    const windowStart = ppDeltas[0]!;
    const windowEnd = ppDeltas[1]!;

    const transitions = captures.slice(0, -1)
      .map((capture, index) => ({ before: capture, after: captures[index + 1]! }))
      .filter(({ before, after }) => (
        before.frame >= windowStart
        && after.frame <= windowEnd
        && before.state.rngValue !== after.state.rngValue
      ));
    type Transition = { before: Capture; after: Capture };
    // Chain transitions by RNG-value continuity (a transition follows another
    // when its before.rng equals the predecessor's after.rng), not frame
    // adjacency -- the decision's draws can be spread over several frames with
    // stable RNG in between (the siblings' window recipe does the same).
    const windows: Transition[][] = [];
    for (const transition of transitions) {
      const last = windows.at(-1)?.at(-1);
      if (last !== undefined && last.after.state.rngValue === transition.before.state.rngValue) {
        windows.at(-1)?.push(transition);
      } else {
        windows.push([transition]);
      }
    }
    const withSteps = windows
      .map((window) => ({
        window,
        steps: window.reduce((sum, transition) => {
          const steps = stepsToReach(transition.before.state.rngValue, transition.after.state.rngValue);
          return steps === null ? sum : sum + steps;
        }, 0),
      }))
      .filter((entry) => entry.steps >= 4); // a decision window (setup 4 + scoring + tie)
    assert(withSteps.length >= 1, `${seed}/${role}: no decision window between first and second PP deltas`);
    const decision = withSteps[0]!;
    const startRng = decision.window[0]!.before.state.rngValue;
    const endRng = decision.window.at(-1)!.after.state.rngValue;
    const usedSlot = ppDeltas[1] === undefined ? -1 : (() => {
      const after = captures.find((capture) => capture.frame === ppDeltas[1]!);
      const before = captures.find((capture) => capture.frame === ppDeltas[1]! - 1);
      if (!after || !before) return -1;
      return after.state.battlers.opponent.pp.findIndex((pp, slot) => pp !== before.state.battlers.opponent.pp[slot]);
    })();

    const opponent = switched.state.battlers.opponent;
    const player = switched.state.battlers.player;
    const reach = role === "reach";
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
      }),
      moves: reach ? [243, 68, 150, 150] : [243, 150, 150, 150],
      attacker: Object.freeze({
        types: reach ? ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] : ["TYPE_WATER", "TYPE_ROCK"],
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
        ability: reach ? "ABILITY_SHADOW_TAG" : "ABILITY_HUSTLE",
      }),
      target: Object.freeze({
        species: 232,
        types: ["TYPE_GROUND", "TYPE_GROUND"],
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
        ability: "ABILITY_STURDY",
        knownAbility: null,
        lastUsedMoveId: 150, // the target's Splash from turn 1 (power 0 -> power-0 path)
        knownMoveIds: [150],
      }),
    });
    const engine = chooseFactoryAiScoredDecision({
      view,
      request,
      rng: { value: startRng, calls: 0 },
    });
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose a move`);
    const drawsMatch = engine.trace.draws.length === decision.steps;
    const rngMatches = engine.rng.value === endRng;
    const slotMatches = chosen.moveSlot === usedSlot;
    const ok = drawsMatch && rngMatches && slotMatches;
    console.log(
      `${ok ? "PASS" : "FAIL"} seed ${seed} ${role}: ${reach ? "Wobbuffet" : "Corsola"} [${view.moves.join(",")}] vs Donphan; `
      + `turn-2 decision RNG ${startRng} -> (${decision.steps} draws) -> ${endRng}; `
      + `ROM used slot ${usedSlot}; engine draws ${engine.trace.draws.length} ${drawsMatch ? "OK" : "MISMATCH"}, `
      + `endpoint ${engine.rng.value} ${rngMatches ? "OK" : "MISMATCH"}, `
      + `slot ${chosen.moveSlot} ${slotMatches ? "OK" : "MISMATCH"}; `
      + `CV deltas [${engine.trace.slotScores.map((slot) => slot.checkViabilityDelta).join(",")}]; `
      + `scores [${engine.trace.slotScores.map((slot) => slot.finalScore).join(",")}]`,
    );
  }
}
