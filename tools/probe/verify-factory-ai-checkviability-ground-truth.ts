// S10 Gate 5 prep-scout probe: ground truth for AI_CheckViability handler
// AI_CV_SpeedDown (docs/factory-ai-checkviability-ground-truth.md). Reruns
// the two committed battle-lab scenarios (opponent faster than target --
// the handler's deterministic zero-draw -3 branch -- and opponent slower
// than target -- the handler's if_random_less_than 70 branch) at two seeds
// each against the real ROM (Battle Scene OFF oracle) and asserts PASS/FAIL
// for every live claim the doc makes. Same shape as
// tools/probe/verify-factory-ai-ground-truth.ts.
//
// Run: node --experimental-strip-types tools/probe/verify-factory-ai-checkviability-ground-truth.ts

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

// Opponent moveset in both fixtures: slot 0 = MOVE_STRING_SHOT (81,
// EFFECT_SPEED_DOWN -- dispatches to AI_CV_SpeedDown), slots 1-3 = MOVE_GROWL
// (45, EFFECT_ATTACK_DOWN) x3 as an equal-power (0), equal-baseline control:
// against a physical-type target (Bug/Rock Shuckle or pure-Ground Dugtrio --
// whichever side is playing target this fixture), AI_CV_AttackDown's own
// type-list check (data/battle_ai_scripts.s:1090-1123) deterministically
// zeroes out, so Growl's only nonzero contributor in this matchup is
// AI_TryToFaint's "not most powerful" -1 -- which ties across all four
// 0-power slots (String Shot included) since NONE of them out-powers any
// other, per `get_how_powerful_move_is`'s per-slot "most powerful" compare
// (docs/factory-ai-checkviability-ground-truth.md §3).
interface ScenarioSpec {
  label: string;
  path: string;
  // Opponent move-slot index (0-based) expected to win turn 1, per seed.
  // null means "never String Shot (slot 0)" -- Growl's 3 slots tie among
  // themselves and the actual winning slot among {1,2,3} is a real
  // Random()-driven tie-break, not asserted here.
  expectedNeverSlot0: boolean;
  expectedSlot0Seeds: readonly number[]; // seeds where slot 0 (String Shot) IS expected to win
  expectedTotalSteps: Record<number, number>; // frame 100->732, per seed
}

const SCENARIOS: ScenarioSpec[] = [
  {
    label:
      "AI_CV_SpeedDown, opponent (AI_USER) faster than target -- deterministic score -3, zero draws (data/battle_ai_scripts.s:1142-1152, if_target_faster false branch)",
    path: "tools/battle-lab/mechanic-factory-ai-cv-speeddown-opponent-faster-off.json",
    expectedNeverSlot0: true,
    expectedSlot0Seeds: [],
    expectedTotalSteps: { 1: 10, 99: 10 },
  },
  {
    label:
      "AI_CV_SpeedDown, opponent (AI_USER) slower than target -- if_random_less_than 70 branch (data/battle_ai_scripts.s:1148-1151), String Shot wins both banked seeds",
    path: "tools/battle-lab/mechanic-factory-ai-cv-speeddown-opponent-slower-off.json",
    expectedNeverSlot0: false,
    expectedSlot0Seeds: [1, 99],
    expectedTotalSteps: { 1: 20, 99: 20 },
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
    const f732 = run1.get(732)!;

    // Read the used slot from frame 0 -> 732 (fully settled), not frame 0 ->
    // 100: unlike the three mask-7 base scenarios (opponent always faster),
    // these two fixtures deliberately swap which side is faster (that IS
    // AI_CV_SpeedDown's own gating condition), so the opponent's move
    // resolves *after* frame 100 whenever the opponent is the slower side
    // (fixture "opponent-slower") -- its own PP decrement is delayed past
    // frame 100 by the first-moving player's own message-print pacing. Only
    // turn 1 ever executes in this trace (no further input is given after
    // the initial two turn-1 button presses, so turn 2 is decided but never
    // executed -- same finding docs/factory-ai-ground-truth.md §2.1
    // established), so frame 0 -> 732's PP delta is unambiguously turn 1's
    // pick regardless of move order.
    const usedSlot = findUsedSlot(f0.battlers.opponent.pp, f732.battlers.opponent.pp);
    const shouldBeSlot0 = spec.expectedSlot0Seeds.includes(seed);
    if (shouldBeSlot0) {
      check(
        `seed ${seed}: turn-1 pick is slot 0 (String Shot) -- the handler's +2 branch fired`,
        usedSlot === 0,
        `observed slot ${usedSlot}, PP ${JSON.stringify(f0.battlers.opponent.pp)} -> ${JSON.stringify(f732.battlers.opponent.pp)}`,
      );
    } else {
      check(
        `seed ${seed}: turn-1 pick is NEVER slot 0 (String Shot excluded by the deterministic -3)`,
        usedSlot !== null && usedSlot !== 0,
        `observed slot ${usedSlot}, PP ${JSON.stringify(f0.battlers.opponent.pp)} -> ${JSON.stringify(f732.battlers.opponent.pp)}`,
      );
    }

    const totalSteps = stepsToReach(f100.rngValue, f732.rngValue, spec.expectedTotalSteps[seed]! + 20);
    check(
      `seed ${seed}: exactly ${spec.expectedTotalSteps[seed]} total Random() calls from frame 100 to frame 732`,
      totalSteps === spec.expectedTotalSteps[seed],
      `forward-search found ${totalSteps === null ? "no match" : `step ${totalSteps}`}`,
    );

    console.log(`  seed ${seed}: turn-1 slot=${usedSlot}, total steps 100->732=${totalSteps}`);
  }

  // Cross-seed count stability: the total-step count must not depend on the
  // seed (only the individual roll *values* should differ) -- same
  // methodology as verify-factory-ai-ground-truth.ts.
  const perSeedTotals: number[] = [];
  for (const seed of SEEDS) {
    const run = await runScenario(spec.path, seed);
    const total = stepsToReach(run.get(100)!.rngValue, run.get(732)!.rngValue, spec.expectedTotalSteps[seed]! + 20);
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
