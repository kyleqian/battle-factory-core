// S10 Gate 5 prep-scout probe: ground truth for the Battle Factory AI's
// per-turn move-selection decision (docs/factory-ai-ground-truth.md). Reruns
// three committed battle-lab scenarios (unambiguous top score, an engineered
// tie, and the four-identical-moves degenerate control) at two seeds each
// against the real ROM (Battle Scene OFF oracle) and asserts PASS/FAIL for
// every live claim the doc makes.
//
// Run: node --experimental-strip-types tools/probe/verify-factory-ai-ground-truth.ts
// (also runnable via `npx tsx`; no project code depends on either).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SEEDS = [1, 99] as const;

interface BattlerState {
  pp: number[];
  hp: number;
}

interface CaptureState {
  rngValue: number;
  battlers: { player: BattlerState; opponent: BattlerState };
}

interface Capture {
  frame: number;
  state: CaptureState;
}

async function runScenario(path: string, seed: number): Promise<Map<number, CaptureState>> {
  const scenario = JSON.parse(readFileSync(path, "utf8"));
  scenario.seed = seed;
  const url = `${oracleUrlForProfile("battle-scene-off")}/v1/battle-lab/run`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(scenario),
  });
  if (!response.ok) {
    throw new Error(`battle-lab run failed: HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as { captures: Capture[] };
  const captures = new Map<number, CaptureState>();
  for (const capture of payload.captures) captures.set(capture.frame, capture.state);
  return captures;
}

// ISO_RANDOMIZE1 (reference/pokeemerald/include/random.h:16):
// gRngValue = 1103515245 * gRngValue + 24691 (mod 2^32). Random() returns the
// upper 16 bits of the *new* gRngValue (src/random.c:11-15).
function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
}

function stepsToReach(start: number, target: number, maxSteps: number): number | null {
  let value = start;
  for (let i = 1; i <= maxSteps; i++) {
    value = rngStep(value);
    if (value === target) return i;
  }
  return null;
}

let failures = 0;
function check(label: string, condition: boolean, detail: string): void {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL: ${label} -- ${detail}`);
  }
}

// MOVE_POUND (src/data/battle_moves.h): EFFECT_HIT, 100 accuracy,
// secondaryEffectChance 0 -- always exactly 4 Random() calls for the
// attacker's own chain regardless of seed (accuracycheck never misses,
// critcalc/adjustnormaldamage/seteffectwithchance always draw once each).
// docs/hit-chain-ground-truth.md Scenario 1 established this 4-roll shape.
// NOTE (2026-07-25 caller-attribution probe, docs/factory-ai-ground-truth.md
// §5): totalSteps - PLAYER_CHAIN_ROLLS is NOT purely "turn-2 AI decision"
// rolls -- it also includes 2 real, decision-irrelevant Random() calls (the
// opponent's own trailing turn-1 Cmd_seteffectwithchance draw, delayed past
// frame 100 by message-print pacing, and BattleTurnPassed's unconditional
// per-turn gRandomTurnNumber = Random() draw, battle_main.c:4013). Both are
// LCG-position-only, never consumed by AI scoring for BATTLE_TYPE_FACTORY.
// The true AI-decision-only roll count is 13/13/15 (this total minus those 2).
const PLAYER_CHAIN_ROLLS = 4;

interface ScenarioSpec {
  label: string;
  path: string;
  // Opponent move-slot index (0-based) expected to win turn 1, per slot.
  expectedTurn1Slot: Record<number, number>;
  // Total Random() calls from frame 100 (opponent's own turn-1 move already
  // resolved, rngValue stable) to frame 732 (fully settled, no more input
  // given so turn 2 never executes) -- see docs/factory-ai-ground-truth.md
  // "Live ledgers" for the derivation. This equals PLAYER_CHAIN_ROLLS plus
  // turn 2's AI decision-phase roll count.
  expectedTotalSteps: number;
}

const SCENARIOS: ScenarioSpec[] = [
  {
    label: "unambiguous (Surf/RockSlide/BodySlam/Thunderbolt vs pure-Ground Marowak)",
    path: "tools/battle-lab/mechanic-factory-ai-unambiguous-off.json",
    expectedTurn1Slot: { 1: 0, 99: 0 }, // both seeds: slot 0 (Surf, 2x super effective)
    expectedTotalSteps: 19, // 4 (player chain) + 2 (non-decision, see NOTE above) + 13 (real AI decision)
  },
  {
    label: "tie (Surf in slots 0 and 2, tied top score)",
    path: "tools/battle-lab/mechanic-factory-ai-tie-off.json",
    expectedTurn1Slot: { 1: 0, 99: 0 }, // both tested seeds resolved the tie to slot 0
    expectedTotalSteps: 19, // same shape as the unambiguous scenario: 4 + 2 + 13
  },
  {
    label: "degenerate (all four slots Surf, four-way tie)",
    path: "tools/battle-lab/mechanic-factory-ai-degenerate-off.json",
    expectedTurn1Slot: { 1: 1, 99: 3 }, // different slots across seeds: real Random()-driven tie-break
    expectedTotalSteps: 21, // 4 (player chain) + 2 (non-decision) + 15 (real AI decision, all-x4-candidate path)
  },
];

function findUsedSlot(ppBefore: number[], ppAfter: number[]): number | null {
  for (let i = 0; i < ppBefore.length; i++) {
    if (ppAfter[i]! < ppBefore[i]!) return i;
  }
  return null;
}

async function verifyScenario(spec: ScenarioSpec): Promise<void> {
  console.log(`\n=== ${spec.label} ===`);
  for (const seed of SEEDS) {
    const run1 = await runScenario(spec.path, seed);
    const run2 = await runScenario(spec.path, seed);

    const f0a = run1.get(0)!;
    const f0b = run2.get(0)!;
    check(
      `seed ${seed}: frame 0 identical across reruns (determinism)`,
      JSON.stringify(f0a) === JSON.stringify(f0b),
      "initial state differs between runs",
    );

    const f0 = run1.get(0)!;
    const f100 = run1.get(100)!;
    const f300 = run1.get(300)!;
    const f732 = run1.get(732)!;

    check(
      `seed ${seed}: rngValue stable from frame 100 to frame 300 (opponent's own turn-1 move already fully resolved by frame 100, nothing else runs before the player's own move begins)`,
      f100.rngValue === f300.rngValue,
      `frame100=${f100.rngValue}, frame300=${f300.rngValue}`,
    );

    const usedSlot = findUsedSlot(f0.battlers.opponent.pp, f100.battlers.opponent.pp);
    check(
      `seed ${seed}: turn-1 pick is slot ${spec.expectedTurn1Slot[seed]} (observed via opponent PP decrement between frame 0 and frame 100)`,
      usedSlot === spec.expectedTurn1Slot[seed],
      `observed slot ${usedSlot}, PP ${JSON.stringify(f0.battlers.opponent.pp)} -> ${JSON.stringify(f100.battlers.opponent.pp)}`,
    );

    const totalSteps = stepsToReach(f100.rngValue, f732.rngValue, spec.expectedTotalSteps + 10);
    check(
      `seed ${seed}: exactly ${spec.expectedTotalSteps} total Random() calls from frame 100 to frame 732 (player's ${PLAYER_CHAIN_ROLLS}-roll Pound chain + 2 non-decision draws + turn-2's isolated AI decision, no contaminating end-turn RNG)`,
      totalSteps === spec.expectedTotalSteps,
      `forward-search found ${totalSteps === null ? "no match" : `step ${totalSteps}`}`,
    );

    // NOT purely "AI decision" -- see the NOTE by PLAYER_CHAIN_ROLLS above.
    const postChainRolls = totalSteps === null ? null : totalSteps - PLAYER_CHAIN_ROLLS;
    console.log(
      `  seed ${seed}: turn-1 slot=${usedSlot}, total steps 100->732=${totalSteps}, post-player-chain rolls (AI decision + 2 non-decision draws)=${postChainRolls}`,
    );
  }

  // Cross-seed count stability: the decision-phase roll count must not
  // depend on the seed (only the individual roll *values* should differ).
  const path = spec.path;
  const perSeedTotals: number[] = [];
  for (const seed of SEEDS) {
    const run = await runScenario(path, seed);
    const total = stepsToReach(run.get(100)!.rngValue, run.get(732)!.rngValue, spec.expectedTotalSteps + 10);
    perSeedTotals.push(total ?? -1);
  }
  check(
    `count stability: total-step count is identical across seeds ${SEEDS.join(" and ")} (${JSON.stringify(perSeedTotals)})`,
    perSeedTotals.every((n) => n === perSeedTotals[0]),
    `per-seed totals differ: ${JSON.stringify(perSeedTotals)}`,
  );
}

async function main(): Promise<void> {
  for (const spec of SCENARIOS) {
    await verifyScenario(spec);
  }

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
