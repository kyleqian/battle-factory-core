import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SEEDS = [1, 2] as const;
const ROLES = ["control", "reach"] as const;
const TACKLE_PP = [35, 35, 35, 35] as const;
const SHUCKLE_SPECIES = 213;
const TACKLE_MOVE = 33;

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

async function runFixture(role: (typeof ROLES)[number], seed: number, frames: number[]): Promise<Capture[]> {
  const path = `tools/battle-lab/mechanic-factory-ai-cbm-preamble-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  fixture.trace.captureFrames = frames;
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

const ROLE_SPEC: Record<(typeof ROLES)[number], {
  species: number;
  types: readonly [string, string];
  ability: string;
  playerMove: number;
  startFrame: number;
  decisionWindow: number[];
  executionWindow: number[];
  control: boolean;
}> = {
  control: {
    species: 297, // LUDICOLO, Swift Swim / Rain Dish (two distinct abilities)
    types: ["TYPE_WATER", "TYPE_GRASS"],
    ability: "ABILITY_SWIFT_SWIM",
    playerMove: 58, // ICE BEAM
    startFrame: 610,
    decisionWindow: Array.from({ length: 256 }, (_, i) => 610 + i),
    executionWindow: Array.from({ length: 242 }, (_, i) => 830 + i),
    control: true,
  },
  reach: {
    species: 378, // BANETTE, Insomnia (single ability); Normal x0 immune -> gate A fires
    types: ["TYPE_GHOST", "TYPE_GHOST"],
    ability: "ABILITY_INSOMNIA",
    playerMove: 247, // SHADOW BALL
    startFrame: 430,
    decisionWindow: Array.from({ length: 256 }, (_, i) => 430 + i),
    executionWindow: Array.from({ length: 242 }, (_, i) => 830 + i),
    control: false,
  },
};

const rows: string[] = [];
rows.push("| role | seed | ROM decision draws | engine draws | CBM draws/slot | ROM slot | engine slot | ROM end RNG | engine end RNG | verdict |");

for (const seed of SEEDS) {
  for (const role of ROLES) {
    const spec = ROLE_SPEC[role];

    // Decision window: run twice for determinism.
    const [captures, rerun] = await Promise.all([
      runFixture(role, seed, spec.decisionWindow),
      runFixture(role, seed, spec.decisionWindow),
    ]);
    assert(
      JSON.stringify(captures) === JSON.stringify(rerun),
      `${role}/${seed}: decision-window rerun diverged`,
    );

    const switched = captures.find((c) => c.state.battlers.opponent.species === SHUCKLE_SPECIES);
    assert(switched, `${role}/${seed}: Shuckle never appeared`);
    const windowStart = switched.frame;

    const transitions: { frame: number; before: number; after: number; steps: number }[] = [];
    for (let i = 1; i < captures.length; i += 1) {
      const before = captures[i - 1]!;
      const after = captures[i]!;
      if (after.state.rngValue === before.state.rngValue) continue;
      const steps = stepsToReach(before.state.rngValue, after.state.rngValue);
      assert(steps !== null, `${role}/${seed}: un-aligned RNG jump at frame ${after.frame}`);
      transitions.push({ frame: after.frame, before: before.state.rngValue, after: after.state.rngValue, steps });
    }
    // The pre-decision [1] draw is the unmodeled gRandomTurnNumber (ISSUES #83):
    // the first 1-step transition at/after switch-in. Seed the engine after it.
    const decisionStart = transitions.find((t) => t.frame >= windowStart && t.steps === 1);
    assert(decisionStart, `${role}/${seed}: no 1-step pre-decision draw after switch-in`);
    const seedValue = decisionStart.after;

    const player = switched.state.battlers.player;
    const opponent = switched.state.battlers.opponent;
    const view: FactoryAiScoredView = Object.freeze({
      schema: "factory-ai-scored-view/v1",
      mode: "factory-level-50-singles",
      active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
      factory: Object.freeze({
        levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
      }),
      moves: [TACKLE_MOVE, TACKLE_MOVE, TACKLE_MOVE, TACKLE_MOVE],
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
        species: spec.species,
        types: spec.types,
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
        ability: spec.ability,
        knownAbility: null,
        lastUsedMoveId: spec.playerMove,
        knownMoveIds: [spec.playerMove],
      }),
    });
    const engine = chooseFactoryAiScoredDecision({
      view,
      request,
      rng: { value: seedValue, calls: 0 },
    });
    const n = engine.trace.draws.length;

    // The engine's N draws must match a contiguous block of ROM transitions.
    let blockSteps = 0;
    let blockEnd: number | null = null;
    let blockFrame: number | null = null;
    for (const t of transitions) {
      if (t.frame <= decisionStart.frame) continue;
      blockSteps += t.steps;
      blockEnd = t.after;
      blockFrame = t.frame;
      if (blockSteps >= n) break;
    }
    assert(blockEnd !== null && blockSteps === n, `${role}/${seed}: ROM decision block steps ${blockSteps} != engine ${n}`);

    const cbmDraws = engine.trace.draws.filter((d) => d.phase === "check-bad-move");
    const cbmPerSlot = new Map<number, number>();
    for (const d of cbmDraws) cbmPerSlot.set(d.moveSlot, (cbmPerSlot.get(d.moveSlot) ?? 0) + 1);
    assert(
      spec.control
        ? cbmPerSlot.size === 4 && [...cbmPerSlot.values()].every((v) => v === 2)
        : cbmDraws.length === 0,
      `${role}/${seed}: CBM preamble per-slot draw count unexpected (${[...cbmPerSlot.entries()].map(([s, v]) => `${s}:${v}`).join(",")})`,
    );
    assert(
      engine.trace.slotScores.every((s) => s.checkBadMoveDelta === (spec.control ? 0 : -10)),
      `${role}/${seed}: CBM score deltas differ from gate A prediction`,
    );

    // Execution window: find the chosen slot from the ROM's PP decrement.
    const execCaptures = await runFixture(role, seed, spec.executionWindow);
    const firstPpDelta = execCaptures.find((c) => (
      c.state.battlers.opponent.species === SHUCKLE_SPECIES
      && c.state.battlers.opponent.pp.some((pp, slot) => pp !== TACKLE_PP[slot])
    ));
    assert(firstPpDelta, `${role}/${seed}: no Shuckle move executed`);
    const ppSlot = firstPpDelta.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== TACKLE_PP[slot],
    );
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${role}/${seed}: engine did not choose a move`);
    assert(chosen.moveSlot === ppSlot, `${role}/${seed}: chosen slot differs (ROM ${ppSlot} vs engine ${chosen.moveSlot})`);
    assert(engine.rng.value === blockEnd, `${role}/${seed}: endpoint RNG differs (ROM ${blockEnd} vs engine ${engine.rng.value})`);

    const verdict = "MATCH";
    rows.push(
      `| ${role} | ${seed} | ${n} (${blockSteps}) | ${n} | `
      + `${spec.control ? "2 x4 slots" : "0 x4 slots"} | ${ppSlot} | ${chosen.moveSlot} | `
      + `${blockEnd} | ${engine.rng.value} | ${verdict} |`,
    );
    console.log(
      `PASS ${role} seed ${seed}: gRTTN@${decisionStart.frame} -> seed ${seedValue}; `
      + `engine ${n} draws (setup4 + cbm${cbmDraws.length} + tie1) -> end ${engine.rng.value}; `
      + `ROM decision block ends @${blockFrame} (${blockSteps} steps) at ${blockEnd}; `
      + `chosen slot ${ppSlot} (ROM pp ${TACKLE_PP.join(",")} -> ${firstPpDelta.state.battlers.opponent.pp.join(",")}) = engine ${chosen.moveSlot}; `
      + `scores ${engine.trace.slotScores.map((s) => s.finalScore).join(",")}; CBM deltas ${engine.trace.slotScores.map((s) => s.checkBadMoveDelta).join(",")}`,
    );
  }
}

console.log("\nROM-vs-engine comparison table:");
console.log(rows.join("\n"));
