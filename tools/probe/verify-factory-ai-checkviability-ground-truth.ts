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

// AI_CV_Pursuit and AI_CV_HighCrit fixtures (2026-07-26 addition, doc's own
// §10 recommendation): all four opponent slots carry the SAME
// handler-triggering move, so there is no cross-slot "which move won" pick
// to read (unlike SpeedDown's Growl-control design) -- these two handlers'
// own triggering moves have real power (Pursuit 40, Slash 70), so a
// 0-power/matched-power control move would still leave AI_TryToFaint's
// "most powerful" comparison as a confound. Evidence here is instead the
// window's TOTAL Random() draw count, cross-checked against a twin fixture
// that holds the moveset/species-pair structure fixed and varies only the
// ONE precondition the handler's own dispatch reads (target type for
// Pursuit, type effectiveness for HighCrit) -- same "identical setup,
// flip one precondition" isolation discipline as SpeedDown's speed-role
// swap, applied to draw count instead of pick.
interface DrawCountScenarioSpec {
  label: string;
  path: string;
  finalFrame: number;
  expectedPpUsed: number; // total PP consumed across all 4 opponent slots (turns actually executed)
  expectedTotalSteps: Record<number, number>; // frame 0 -> finalFrame, per seed
  // HighCrit's "neutral effectiveness" fixture does NOT hold this -- see its
  // own comment at the scenario definition for the documented reason
  // (a phantom next-turn re-decision reads post-turn-1 HP, which differs
  // slightly per seed because of the real damage-roll variance).
  checkCrossSeedStable: boolean;
}

const DRAW_COUNT_SCENARIOS: DrawCountScenarioSpec[] = [
  {
    label:
      "AI_CV_Pursuit, target IS Ghost/Psychic-typed -- reachable branch (data/battle_ai_scripts.s:2018-2036): 3 turns let the opponent's own is_first_turn_for gate clear (isFirstTurn 2->1->0), then AI_CV_Pursuit2's if_random_less_than 128 fires",
    path: "tools/battle-lab/mechanic-factory-ai-cv-pursuit-ghost-reach-off.json",
    finalFrame: 1202,
    expectedPpUsed: 3,
    expectedTotalSteps: { 1: 32, 99: 32 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_Pursuit, target is NOT Ghost/Psychic-typed -- control (same opponent/move/turn count, target type is the only precondition changed): the get_target_type1/2 checks never match, so AI_CV_Pursuit2's roll never fires",
    path: "tools/battle-lab/mechanic-factory-ai-cv-pursuit-normal-control-off.json",
    finalFrame: 1062,
    expectedPpUsed: 3,
    expectedTotalSteps: { 1: 30, 99: 30 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_HighCrit, target resists Normal 0.5x (Onix, Rock/Ground) -- deterministic zero-draw branch (data/battle_ai_scripts.s:1449-1461): both explicit AI_EFFECTIVENESS_x0_25/x0_5 checks route straight to End before either if_random_less_than",
    path: "tools/battle-lab/mechanic-factory-ai-cv-highcrit-resisted-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 18, 99: 18 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_HighCrit, target is neutral to Normal (Dugtrio, pure Ground) -- reachable branch: falls through both AI_EFFECTIVENESS_x2/x4 checks (neither matches at 1x) straight into the shared if_random_less_than 128 roll",
    path: "tools/battle-lab/mechanic-factory-ai-cv-highcrit-neutral-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    // NOT cross-seed stable (23 vs 24) -- both values individually
    // reproduce deterministically (reruns match exactly) and both sit well
    // above the resisted fixture's stable 18, confirming the branch fires,
    // but the +5/+6 gap (not a clean +1 or +2) means this window also
    // embeds a phantom, HP-sensitive re-decision unrelated to HighCrit
    // itself -- see the ground-truth doc's own porter note on this finding
    // before reusing this fixture for an exact-count claim.
    expectedTotalSteps: { 1: 23, 99: 24 },
    checkCrossSeedStable: false,
  },
  {
    // AI_CV_AlwaysHit (data/battle_ai_scripts.s:1075-1089, doc §11.3): the
    // opponent (Marowak, all 4 slots MOVE_SWIFT) only ever reaches
    // AI_CV_AlwaysHit2's if_random_less_than 100 roll once the TARGET's
    // (player, Haunter) evasion stage exceeds 8 -- a real precondition, not
    // state-independent like HighCrit/Pursuit, so this fixture builds it
    // live: player all 4 slots MOVE_DOUBLE_TEAM, raising evasion stage by 1
    // per executed turn (6 at battle start). Target is Ghost-typed (Haunter)
    // so Swift's Normal-type STATUS3/type-immunity check
    // (MOVE_RESULT_DOESNT_AFFECT_FOE) holds both sides' HP exactly constant
    // every turn -- no HighCrit-style HP-band confound possible. Verified via
    // the caller-attribution probe (tools/probe/attribute-factory-ai-random-
    // callers.py, patched for a custom window) that the ENTIRE +8 delta vs
    // the control fixture below is Cmd_if_random_less_than hits (every other
    // caller -- BattleAI_SetupAIData, BattleTurnPassed,
    // ChooseMoveOrAction_Singles, Cmd_adjustnormaldamage, Cmd_critcalc,
    // Cmd_seteffectwithchance -- has an IDENTICAL count in both fixtures):
    // turn 4's real decision (evasion 9, reachable) and turn 5's phantom
    // computed-but-unexecuted decision (evasion 10, still reachable) each
    // draw 4 times, not 1 -- once per opponent candidate-move slot, since all
    // 4 are the identical MOVE_SWIFT and AI_CheckViability re-evaluates every
    // slot independently. This is a NEW finding vs 11.0/11.1/11.2's "1 draw
    // per reachable decision" assumption for Pursuit/HighCrit (never
    // attribution-probe-verified there) -- for a moveset with N identical
    // dispatch-triggering slots, a reachable branch appears to cost N draws,
    // not 1. Porter guidance: prefer the attribution probe over raw
    // total-step deltas whenever the exact mechanism matters, not just
    // presence/absence.
    label:
      "AI_CV_AlwaysHit, target (player, Haunter) evasion stage 9->10 across the window -- reachable branch (data/battle_ai_scripts.s:1075-1089): 4 executed turns of MOVE_DOUBLE_TEAM build evasion past 8, then AI_CV_AlwaysHit2's if_random_less_than 100 fires on turn 4 (real) and turn 5 (phantom, computed but unexecuted)",
    path: "tools/battle-lab/mechanic-factory-ai-cv-alwayshit-evasion-reach-off.json",
    finalFrame: 2232,
    expectedPpUsed: 4,
    expectedTotalSteps: { 1: 44, 99: 44 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_AlwaysHit, target (player, Haunter) evasion stays neutral (stage 6) throughout -- control (same opponent/species/turn count, player uses MOVE_SPLASH x4 instead of MOVE_DOUBLE_TEAM): neither AlwaysHit gate is ever true, so AI_CV_AlwaysHit2's roll never fires",
    path: "tools/battle-lab/mechanic-factory-ai-cv-alwayshit-splash-control-off.json",
    finalFrame: 1932,
    expectedPpUsed: 4,
    expectedTotalSteps: { 1: 36, 99: 36 },
    checkCrossSeedStable: true,
  },
  // AI_CV_VitalThrow (data/battle_ai_scripts.s:1536-1546, doc §11.4/§12.2/§13):
  // opponent (Anorith, ability slot 0 = Battle Armor -- blocks Cmd_critcalc's
  // Random() call entirely via short-circuit, so no stray crit can ever
  // faint it) all 4 slots MOVE_VITAL_THROW. Single executed turn (matches
  // HighCrit's own single-turn capture convention): player (Machamp, all 4
  // slots MOVE_VITAL_THROW in the reach fixture) lands one real, deterministic-
  // band hit (85-100% roll, 86-102 damage against Anorith's 120 max HP --
  // BOTH ends of the roll land at 28%/15% remaining, comfortably inside the
  // if_hp_less_than USER,40 band) that brings the opponent's own HP under the
  // 40% gate BEFORE the window's phantom next-turn (computed-but-unexecuted)
  // re-decision reads it -- no second real turn needed, so no risk of a
  // follow-up hit fainting the opponent. Reach's turn-1 decision itself (HP
  // 100%, deterministic if_hp_more_than 60 -> End) draws 0; only the phantom
  // decision reaches AI_CV_VitalThrow2's if_random_less_than 50, once per
  // identical dispatch slot (4), matching §12's "N identical slots -> N
  // draws per reachable decision" finding exactly. Attribution probe
  // (window 0 732) confirms the full +6 delta over the control fixture
  // splits as +4 Cmd_if_random_less_than (the real AI_CV_VitalThrow2 roll)
  // and +1 Cmd_adjustnormaldamage / +1 Cmd_seteffectwithchance (the flipped
  // precondition's OWN necessary real-damage roll cost -- Vital Throw
  // actually connecting vs Splash doing nothing -- not part of the handler
  // itself, but part of the twin fixtures' one intentionally-flipped
  // precondition).
  {
    label:
      "AI_CV_VitalThrow, opponent (AI_USER, Anorith) HP hit to <40% by a real turn-1 move -- reachable branch (data/battle_ai_scripts.s:1536-1546): if_hp_less_than USER,40 routes straight to AI_CV_VitalThrow2, whose if_random_less_than 50 fires once per identical MOVE_VITAL_THROW slot on the phantom next-turn re-decision",
    path: "tools/battle-lab/mechanic-factory-ai-cv-vitalthrow-lowhp-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 15, 99: 15 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_VitalThrow, opponent (AI_USER, Anorith) HP stays 100% -- control (same opponent/species/turn count, player uses MOVE_SPLASH instead of MOVE_VITAL_THROW turn 1): if_hp_more_than USER,60 routes straight to End, deterministic zero draws from the handler itself",
    path: "tools/battle-lab/mechanic-factory-ai-cv-vitalthrow-fullhp-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 9, 99: 9 },
    checkCrossSeedStable: true,
  },
  // AI_CV_AttackDown (data/battle_ai_scripts.s:1090-1123, doc §14): the first
  // CBM-blocked handler pair to get live ground truth (AI_CBM_AttackDown +
  // AI_CV_AttackDown). Both fixtures hold the target's ATK stat stage at
  // DEFAULT_STAT_STAGE (6, a fresh battle's own starting value) so
  // AI_CV_AttackDown's own :1091 gate jumps straight to AI_CV_AttackDown3
  // (the ":1097 if_random_less_than 50" site is UNREACHED in both -- neither
  // fixture stages a prior Attack-stage change) and AI_CBM_AttackDown's own
  // Score_Minus10 branches stay unreached too (ATK stage != MIN_STAT_STAGE,
  // target ability is neither Hyper Cutter/Clear Body/White Smoke) -- so the
  // ONLY thing that varies between the twin fixtures is AI_CV_AttackDown's
  // own :1104/:1106 physical-type-list gate, isolating the handler's real
  // remaining draw site (:1107). Opponent (Marowak, all 4 slots MOVE_GROWL --
  // EFFECT_ATTACK_DOWN, 0 power, CBM-table-covered but CBM's own tail is
  // 0-draws regardless of which branch it takes) faces two different player
  // targets differing ONLY in type. Both targets were deliberately picked
  // with exactly ONE assignable ability (Haunter: Levitate only; Shuckle:
  // Sturdy only) to dodge an unrelated confound found live this session:
  // Cmd_get_ability (battle_ai_script_commands.c:1350-1377), called twice
  // per candidate slot by AI_CBM_AttackDown's own body + its shared
  // CheckIfAbilityBlocksStatChange tail, draws one Random() (`Random() & 1`,
  // a 50/50 "AI doesn't know the target's real ability, guess between its
  // two possible ability slots") EVERY call when the target species has TWO
  // assignable abilities and neither is Shadow Tag/Magnet Pull/Arena Trap
  // (the three abilities Cmd_get_ability can read directly, no guess) --
  // confirmed live by an earlier draft of the control fixture (Dugtrio,
  // Sand Veil/Arena Trap) showing 12 extra Cmd_get_ability-attributed draws
  // that had nothing to do with AI_CV_AttackDown at all. Single-ability
  // targets collapse that confound to zero in both fixtures.
  {
    label:
      "AI_CV_AttackDown, target (player, Haunter) type1/type2 (Ghost/Poison) are NEITHER in AI_CV_AttackDown_PhysicalTypeList -- reachable branch (data/battle_ai_scripts.s:1090-1123): falls through the :1104/:1106 type-list gates into the :1107 if_random_less_than 50 roll",
    path: "tools/battle-lab/mechanic-factory-ai-cv-attackdown-nonphysical-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 11, 99: 11 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_AttackDown, target (player, Shuckle) type1 (Bug) IS in AI_CV_AttackDown_PhysicalTypeList -- control (same opponent/species/turn count, target type is the only precondition changed): the :1104 get_target_type1 check matches immediately, routing straight to AI_CV_AttackDown_End before the :1107 roll is ever reached",
    path: "tools/battle-lab/mechanic-factory-ai-cv-attackdown-physical-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 7, 99: 7 },
    checkCrossSeedStable: true,
  },
];

function totalPpUsed(ppBefore: number[], ppAfter: number[]): number {
  let used = 0;
  for (let i = 0; i < ppBefore.length; i++) used += ppBefore[i]! - ppAfter[i]!;
  return used;
}

async function verifyDrawCountScenario(spec: DrawCountScenarioSpec): Promise<void> {
  console.log(`\n=== ${spec.label} ===`);
  const perSeedTotals: number[] = [];
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
    const fEnd = run1.get(spec.finalFrame)!;

    const ppUsed = totalPpUsed(f0.battlers.opponent.pp, fEnd.battlers.opponent.pp);
    check(
      `seed ${seed}: exactly ${spec.expectedPpUsed} opponent turn(s) executed (PP consumed across all 4 slots)`,
      ppUsed === spec.expectedPpUsed,
      `observed ${ppUsed} PP used, ${JSON.stringify(f0.battlers.opponent.pp)} -> ${JSON.stringify(fEnd.battlers.opponent.pp)}`,
    );

    const totalSteps = stepsToReach(f0.rngValue, fEnd.rngValue, spec.expectedTotalSteps[seed]! + 20);
    check(
      `seed ${seed}: exactly ${spec.expectedTotalSteps[seed]} total Random() calls from frame 0 to frame ${spec.finalFrame}`,
      totalSteps === spec.expectedTotalSteps[seed],
      `forward-search found ${totalSteps === null ? "no match" : `step ${totalSteps}`}`,
    );
    perSeedTotals.push(totalSteps ?? -1);

    console.log(`  seed ${seed}: pp used=${ppUsed}, total steps 0->${spec.finalFrame}=${totalSteps}`);
  }

  if (spec.checkCrossSeedStable) {
    check(
      `count stability: total-step count is identical across seeds ${SEEDS.join(" and ")} (${JSON.stringify(perSeedTotals)})`,
      perSeedTotals.every((n) => n === perSeedTotals[0]),
      `per-seed totals differ: ${JSON.stringify(perSeedTotals)}`,
    );
  } else {
    console.log(`  (cross-seed stability intentionally not asserted -- see scenario comment)`);
  }
}

async function main(): Promise<void> {
  for (const spec of SCENARIOS) {
    await verifyScenario(spec);
  }
  for (const spec of DRAW_COUNT_SCENARIOS) {
    await verifyDrawCountScenario(spec);
  }

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
