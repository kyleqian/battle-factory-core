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
  maxHp?: number;
  species?: number;
  status?: { kind: string };
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
  // AI_CV_DefenseDown (data/battle_ai_scripts.s:1124-1134, doc §15): the
  // second CBM-blocked handler pair to get live ground truth (AI_CBM_DefenseDown
  // + AI_CV_DefenseDown). Unlike AttackDown, this handler's own draw site
  // (:1128) is gated by the OPPONENT's (AI_USER's) own HP < 70% (Gate A),
  // not the target's stat stage -- the same shape as AI_CV_VitalThrow (§13),
  // so this pair reuses that exact Anorith (opponent, Battle Armor -- blocks
  // Cmd_critcalc's Random() call entirely, no crit-overshoot risk)/Machamp
  // (target, single ability Guts -- collapses the §14.2 get_ability confound
  // to zero) species pairing verbatim, including the already-verified
  // 86-102 damage / 15-28% remaining-HP band from Machamp's own
  // MOVE_VITAL_THROW -- comfortably under DefenseDown's much wider <70% gate,
  // no new damage-formula arithmetic needed. Opponent all 4 slots MOVE_LEER
  // (43, EFFECT_DEFENSE_DOWN, 0 power, CBM-table-covered) -- 0 power keeps
  // Machamp's own HP at 100% in both fixtures throughout, holding Gate C
  // (target HP > 70%) constant-true and out of the isolation. Single-turn
  // capture (matches VitalThrow/AttackDown's own convention): turn 1's
  // decision predates its own damage (0 draws), only the phantom turn-2
  // re-decision reaches the reachable branch. Attribution probe (window
  // 0 732) confirms the full +6 delta over the control fixture splits as +4
  // Cmd_if_random_less_than (the real AI_CV_DefenseDown :1128 roll, once per
  // identical MOVE_LEER slot) and +1 Cmd_adjustnormaldamage / +1
  // Cmd_seteffectwithchance (the flipped precondition's OWN necessary
  // real-damage cost -- Vital Throw actually connecting vs Splash doing
  // nothing -- same structural confound as VitalThrow's own twin fixtures,
  // not part of the handler itself). Cmd_get_ability does not appear in
  // either fixture's attribution table (Machamp's single ability collapses
  // that confound too), and Cmd_critcalc does not appear in EITHER fixture
  // at all here (Anorith's own outgoing move is the 0-power MOVE_LEER, no
  // crit calc ever runs for it, one confound fewer than VitalThrow's own
  // twin fixtures needed to account for).
  {
    label:
      "AI_CV_DefenseDown, opponent (AI_USER, Anorith) HP hit to <70% by a real turn-1 move -- reachable branch (data/battle_ai_scripts.s:1124-1134): if_hp_less_than USER,70 (Gate A) routes straight to the :1128 if_random_less_than 50 draw site, which fires once per identical MOVE_LEER slot on the phantom next-turn re-decision",
    path: "tools/battle-lab/mechanic-factory-ai-cv-defensedown-lowhp-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 13, 99: 13 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_DefenseDown, opponent (AI_USER, Anorith) HP stays 100% -- control (same opponent/species/turn count, player uses MOVE_SPLASH instead of MOVE_VITAL_THROW turn 1): Gate A (if_hp_less_than USER,70) is false and Gate B (target DEF stage > 3, default 6) is true, routing straight to AI_CV_DefenseDown3 before the :1128 roll is ever reached, deterministic zero draws from the handler itself",
    path: "tools/battle-lab/mechanic-factory-ai-cv-defensedown-fullhp-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 7, 99: 7 },
    checkCrossSeedStable: true,
  },
  // AI_CV_SpDefDown (data/battle_ai_scripts.s:1186-1196, doc §16): the third
  // CBM-blocked handler pair to get live ground truth (AI_CBM_SpDefDown +
  // AI_CV_SpDefDown). Byte-for-byte the same control-flow shape as
  // AI_CV_DefenseDown (STAT_DEF swapped for STAT_SPDEF) -- reuses §15's
  // entire Anorith(opponent)/Machamp(target) fixture design verbatim, only
  // the opponent's dispatch move changes (MOVE_FAKE_TEARS, 313,
  // EFFECT_SPECIAL_DEFENSE_DOWN_2, 0 power, accuracy 100 -- picked over
  // MOVE_METAL_SOUND's 85 accuracy to avoid a new miss-chance confound;
  // EFFECT_SPECIAL_DEFENSE_DOWN itself is source-commented "unused", zero
  // moves anywhere use it). Numerically identical ledger to DefenseDown's
  // (13/13 reach, 7/7 control) is expected: same gate structure, same
  // 0-power/100-accuracy dispatch move, same damage sizing. Attribution
  // probe (window 0 732) confirms the same clean +6 = +4
  // Cmd_if_random_less_than / +1 Cmd_adjustnormaldamage / +1
  // Cmd_seteffectwithchance split, zero Cmd_get_ability or Cmd_critcalc
  // contamination in either fixture.
  {
    label:
      "AI_CV_SpDefDown, opponent (AI_USER, Anorith) HP hit to <70% by a real turn-1 move -- reachable branch (data/battle_ai_scripts.s:1186-1196): if_hp_less_than USER,70 (Gate A) routes straight to the :1190 if_random_less_than 50 draw site, which fires once per identical MOVE_FAKE_TEARS slot on the phantom next-turn re-decision",
    path: "tools/battle-lab/mechanic-factory-ai-cv-spdefdown-lowhp-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 13, 99: 13 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_SpDefDown, opponent (AI_USER, Anorith) HP stays 100% -- control (same opponent/species/turn count, player uses MOVE_SPLASH instead of MOVE_VITAL_THROW turn 1): Gate A (if_hp_less_than USER,70) is false and Gate B (target SPDEF stage > 3, default 6) is true, routing straight to AI_CV_SpDefDown3 before the :1190 roll is ever reached, deterministic zero draws from the handler itself",
    path: "tools/battle-lab/mechanic-factory-ai-cv-spdefdown-fullhp-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 7, 99: 7 },
    checkCrossSeedStable: true,
  },
  // AI_CV_AttackUp (data/battle_ai_scripts.s:896-913, doc §17): the fourth
  // CBM-blocked handler pair to get live ground truth (AI_CBM_AttackUp +
  // AI_CV_AttackUp), and the first stat-UP pair -- every gate in both
  // handlers reads AI_USER's (the opponent's) OWN state (ATK stat stage,
  // HP), never AI_TARGET's, and AI_CBM_AttackUp has no get_ability call at
  // all (unlike every stat-down CBM handler staged so far), so the §14.2
  // ability-guess confound cannot occur here by construction. Per §11.0's
  // "phantom next-decision only" finding (re-confirmed live this session,
  // §17.2/§17.4): turn 1's own real decision is never observable in a
  // single-turn window, and AI_USER's own state at that unobservable moment
  // is always the fresh-battle default (ATK stage 6, HP 100%) in BOTH
  // fixtures regardless of design -- only the phantom next-turn decision
  // (reading turn 1's post-action state) can differ. Opponent (Anorith,
  // Battle Armor -- blocks Cmd_critcalc as in §15/§16) all 4 slots
  // MOVE_SWORDS_DANCE (14, EFFECT_ATTACK_UP_2, 0 power, accuracy 0 -- the
  // special "always hits, no Cmd_accuracycheck draw" value, §14.3). Target
  // (Machamp, ability irrelevant here -- neither handler ever reads
  // AI_TARGET) uses MOVE_SPLASH (reach) or MOVE_VITAL_THROW (control).
  // Because AI_CV_AttackUp's own :904 draw site is gated on the opponent's
  // OWN hp being EXACTLY 100% (if_hp_not_equal, not a <70/<40 threshold
  // band), the fixture that reaches the draw site is the UNDAMAGED one
  // (MOVE_SPLASH) and the fixture that deterministically skips it is the
  // DAMAGED one (MOVE_VITAL_THROW, which drops Anorith below the :908 Gate D
  // 40% floor) -- the opposite move-to-name assignment from §15/§16's
  // low-HP-is-reach pairs. Attribution probe (window 0 732) confirms the
  // full +2 delta (10 reach vs 8 control) splits as +4
  // Cmd_if_random_less_than (the real AI_CV_AttackUp :904 roll, once per
  // identical MOVE_SWORDS_DANCE slot, reach only) and -1 Cmd_adjustnormaldamage
  // / -1 Cmd_seteffectwithchance (MOVE_VITAL_THROW actually connecting in
  // control vs MOVE_SPLASH doing nothing in reach -- the flipped
  // precondition's own necessary real-damage cost, not part of the handler
  // itself). Cmd_get_ability appears in neither fixture's attribution table,
  // confirming this pair cannot hit that confound at all.
  {
    label:
      "AI_CV_AttackUp, opponent (AI_USER, Anorith) HP stays 100% through turn 1 -- reachable branch (data/battle_ai_scripts.s:896-913): Gate B (if_hp_not_equal USER,100) is false, falling through to the :904 if_random_less_than 128 draw site, which fires once per identical MOVE_SWORDS_DANCE slot on the phantom next-turn re-decision",
    path: "tools/battle-lab/mechanic-factory-ai-cv-attackup-fullhp-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 10, 99: 10 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_AttackUp, opponent (AI_USER, Anorith) HP hit below 40% by a real turn-1 move -- control (same opponent/species/turn count, player uses MOVE_VITAL_THROW instead of MOVE_SPLASH turn 1): Gate B (if_hp_not_equal USER,100) is true and Gate D (if_hp_less_than USER,40) is also true, routing straight to AI_CV_AttackUp_ScoreDown2 before the :904 roll is ever reached, deterministic zero draws from the handler itself",
    path: "tools/battle-lab/mechanic-factory-ai-cv-attackup-lowhp-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 8, 99: 8 },
    checkCrossSeedStable: true,
  },
  // AI_CV_DefenseUp (data/battle_ai_scripts.s:915-954, doc §18): the fifth
  // CBM-blocked handler pair to get live ground truth (AI_CBM_DefenseUp +
  // AI_CV_DefenseUp), and the largest remaining CheckViability pair (5
  // if_random_less_than sites: :917/:923/:927/:936/:938). Unlike AttackUp,
  // DefenseUp3's own Gate C is INVERTED (`if_hp_less_than USER,70,
  // DefenseUp4` -- true routes INTO the last-move branch, false falls
  // through to a :927 draw whose own failure ALSO falls into the last-move
  // branch) -- reusing AttackUp's HP=100%-is-clean assumption would have been
  // wrong here (a real prose-transfer trap this session caught live, not on
  // paper). These 3 fixtures instead isolate DefenseUp4's own novel
  // dependency -- the TARGET's (player's) last-used move power/type
  // (`get_last_used_bank_move AI_TARGET` + `get_move_power_from_result`/
  // `get_move_type_from_result`, :930-935) -- by holding the opponent
  // (Anorith, Battle Armor) HP in the deterministic [40,70)% band via the
  // PLAYER's own fixed-damage move (MOVE_SEISMIC_TOSS/MOVE_DRAGON_RAGE,
  // EFFECT_LEVEL_DAMAGE/EFFECT_DRAGON_RAGE, `dmgtolevel`/`setword
  // gBattleMoveDamage,40` -- data/battle_scripts_1.s:819-828,1195-1204 --
  // bypass the normal 85-100% damage roll AND crit calc entirely, so HP lands
  // on the exact same value both seeds, no roll-variance confound), which
  // ALSO doubles as the last-used-move fixture needs no separate turn: by
  // the time the phantom next-turn re-decision runs, MOVEEND_UPDATE_LAST_
  // MOVES (src/battle_script_commands.c:4407) has already set
  // gLastMoves[player] from turn 1's real action. MOVE_SEISMIC_TOSS
  // (Fighting, IN AI_CV_DefenseUp_PhysicalTypes) and MOVE_VITAL_THROW
  // (also Fighting) both land the "physical last move" branch; MOVE_DRAGON_
  // RAGE (Dragon, NOT in the list) hits the "non-physical" branch instead --
  // the provable flip. Opponent all 4 slots MOVE_HARDEN (106,
  // EFFECT_DEFENSE_UP, 0 power, accuracy 0 -- always hits, no
  // Cmd_accuracycheck draw, CBM- and CV-table-covered). Attribution probe
  // (window 0 732, tools/probe/attribute-factory-ai-random-callers.py)
  // confirms Cmd_if_random_less_than fires 0 times in the non-physical
  // fixture (both seeds, deterministic 8 total) vs 6 (seed 1) / 5 (seed 99)
  // in BOTH physical-last-move fixtures (Seismic Toss AND Vital Throw agree
  // on seed 1's count exactly) -- NOT the clean "4 = N slots x 1 draw"
  // pattern every prior handler showed (AttackUp/DefenseDown/SpDefDown/
  // VitalThrow), and not cross-seed stable either. A future porter should
  // single-step the flagged frame to pin the exact per-slot mechanism (this
  // session did not); the qualitative absence/presence (0 vs 5-6) is the
  // reliable, reproduced signal here, same "shape over exact count" hedge
  // this doc's own §11.0 already established for AI_CV_HighCrit's neutral
  // fixture.
  {
    label:
      "AI_CV_DefenseUp, target (player, Machamp) last-used move is MOVE_VITAL_THROW (Fighting, IN AI_CV_DefenseUp_PhysicalTypes) -- reachable branch (data/battle_ai_scripts.s:915-954): opponent (AI_USER, Anorith) HP lands at 55/120 (45.8%, inside [40,70) after Harden's own +1 Defense stage reduces the hit) so Gate C (if_hp_less_than USER,70) routes straight into AI_CV_DefenseUp4, Gate D (if_hp_less_than USER,40) is false, and the last-move check (power=70 != 0, type=Fighting IS in the physical list) falls through to the :936 if_random_less_than 60 draw site",
    path: "tools/battle-lab/mechanic-factory-ai-cv-defenseup-lowhp-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 14, 99: 13 },
    checkCrossSeedStable: false,
  },
  {
    label:
      "AI_CV_DefenseUp, target (player, Machamp) last-used move is MOVE_SEISMIC_TOSS (Fighting, IN AI_CV_DefenseUp_PhysicalTypes, EFFECT_LEVEL_DAMAGE -- fixed 50 damage, no roll variance) -- reachable branch, same code path as the Vital Throw fixture above with a different, deterministic-damage physical move: opponent HP lands at 70/120 (58.3%, inside [40,70)), same :936 draw site reached via the same Gate C/D/power/type chain",
    path: "tools/battle-lab/mechanic-factory-ai-cv-defenseup-physicallastmove-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 14, 99: 13 },
    checkCrossSeedStable: false,
  },
  {
    label:
      "AI_CV_DefenseUp, target (player, Machamp) last-used move is MOVE_DRAGON_RAGE (Dragon, NOT in AI_CV_DefenseUp_PhysicalTypes, EFFECT_DRAGON_RAGE -- fixed 40 damage) -- the flip: opponent HP lands at 80/120 (66.7%, inside [40,70), same Gate C/D routing as the two physical fixtures above), but the last-move type check (power=1 != 0, type=Dragon NOT in the physical list) falls through if_not_in_bytes straight to AI_CV_DefenseUp_ScoreDown2, skipping BOTH :936 and :938 entirely -- deterministic zero draws from the handler itself, cross-seed stable",
    path: "tools/battle-lab/mechanic-factory-ai-cv-defenseup-nonphysicallastmove-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 8, 99: 8 },
    checkCrossSeedStable: true,
  },
  // AI_CV_AccuracyDown (data/battle_ai_scripts.s:1198-1234, doc §19): the
  // sixth CBM-blocked handler pair to get live ground truth (AI_CBM_AccDown
  // + AI_CV_AccuracyDown), and the largest remaining CheckViability pair by
  // draw-site count (7 if_random_less_than sites: :1202/1206/1210/1214/
  // 1218/1222/1229). Unlike every prior pair, this handler's own dispatch
  // move (MOVE_SAND_ATTACK, EFFECT_ACCURACY_DOWN) lowers the TARGET's own
  // ACC stat stage -- if the target is also the one dealing this turn's
  // real, accuracy-checked damage (needed to bank the opponent's HP into
  // the [40,70)% band both draw sites below need), a speed-dependent
  // ordering bug appears: if the ACC-down move resolves first, the damage
  // move's own accuracy roll is checked against an already-lowered ACC
  // stage, turning a should-always-connect 100-accuracy hit into a
  // seed-dependent ~25%-chance miss (found live -- an early draft with
  // Anorith as the dispatch-move user missed outright at seed 99 while
  // connecting at seed 1). Fix: the target (Anorith, Speed 75) is faster
  // than the opponent (Machamp, Speed 55, single ability {GUTS, NONE} --
  // no Cmd_get_ability confound for AI_CBM_AccDown's own two get_ability
  // reads), so Anorith's own MOVE_SEISMIC_TOSS (EFFECT_LEVEL_DAMAGE, fixed
  // 50 damage, no roll, no crit calc) always resolves before Machamp's Sand
  // Attack can touch its ACC stage. Single executed turn (same phantom-
  // next-decision capture shape as every prior CBM-blocked pair). Because
  // Sand Attack's own effect lowers the TARGET's (Anorith's) ACC stage
  // 6->5 on the very turn it first lands, Gate I (:1226, "if_stat_level_
  // equal AI_TARGET,ACC,DEFAULT_STAT_STAGE,End") is FALSE by the time the
  // phantom next-turn decision reads it -- so the reach fixture's single
  // turn-1 build lands BOTH DRAW SITE 1 (:1202, opponent HP<70%) AND DRAW
  // SITE 7 (:1229, tail reached because Gate H is false and Gate I no
  // longer short-circuits it) without needing a second real turn.
  // Attribution probe (window 0 732) confirms the full +8 delta (17 reach
  // vs 7 control) is entirely Cmd_if_random_less_than (8 vs 0) -- the clean
  // "N=4 identical MOVE_SAND_ATTACK slots x 2 reachable sites" shape, not
  // DefenseUp's messier non-uniform count -- plus a +1 Cmd_accuracycheck
  // (Seismic Toss actually connecting in reach vs Splash's accuracy-0
  // no-op in control) and +1 Cmd_seteffectwithchance, both the flipped
  // precondition's own necessary real-damage cost, not part of the
  // handler. Cmd_get_ability appears in neither fixture's attribution
  // table, confirming both species' single-ability kits close the §14.2
  // confound. DRAW SITES 3-6 (target toxic-poisoned/leech-seeded; opponent
  // Ingrain-rooted; target cursed) all need a genuinely mixed opponent
  // moveset and a real, unforced AI pick between two different moves across
  // two turns -- still out of session budget, left as citation-backed
  // recipes (doc §19.5). DRAW SITE 2 (below) does NOT share that obstacle --
  // it is gated on the OPPONENT's (Machamp's) own ACC stat stage, which the
  // PLAYER's own actions can set directly with the opponent's moveset held
  // at 4 identical MOVE_SAND_ATTACK slots throughout.
  {
    label:
      "AI_CV_AccuracyDown, opponent (AI_USER, Machamp) HP hit to 69.7% by a real turn-1 move -- reachable branch (data/battle_ai_scripts.s:1198-1234): Gate A (if_hp_less_than USER,70) routes straight into the :1202 if_random_less_than 100 draw site (DRAW SITE 1), and because the same turn's MOVE_SAND_ATTACK already lowered the target's own ACC stage 6->5, Gate I (:1226) is false on the phantom next-turn re-decision, letting Gates H/J/K all fall through into the :1229 if_random_less_than 70 draw site too (DRAW SITE 7) -- both sites fire once per identical MOVE_SAND_ATTACK slot",
    path: "tools/battle-lab/mechanic-factory-ai-cv-accuracydown-lowhp-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 17, 99: 17 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_AccuracyDown, opponent (AI_USER, Machamp) HP stays 100% -- control (same opponent/species/turn count, target uses MOVE_SPLASH instead of MOVE_SEISMIC_TOSS turn 1): Gate A is false and Gate B (target HP>70%) is true, skipping DRAW SITE 1, and Gate H (if_hp_more_than USER,70) jumps straight to End, skipping the entire tail including DRAW SITE 7 -- deterministic zero draws from the handler itself",
    path: "tools/battle-lab/mechanic-factory-ai-cv-accuracydown-fullhp-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 7, 99: 7 },
    checkCrossSeedStable: true,
  },
  // AI_CV_AccuracyDown DRAW SITE 2 (:1206, doc §19.5's own recipe, staged
  // live this session): opponent (AI_USER, Machamp) same species/moveset as
  // above (all 4 slots MOVE_SAND_ATTACK). Target (player) is Pidgey (16,
  // single ability Keen Eye, Normal/Flying) instead of Anorith -- a NEW
  // confound found live staging this site: since BOTH battlers now carry
  // Sand Attack (the player's own copy is the real move that lowers
  // Machamp's OWN ACC stage 6->5->4 over 2 turns, the precondition Gate C
  // needs), Machamp's own forced Sand Attack reciprocally targets the
  // player every turn too -- an unprotected target's OWN ACC stage would
  // fall in step, making the player's later Sand Attack accuracy rolls
  // against Machamp probabilistic (a compounding, cross-turn version of the
  // single-turn ordering bug already found in the lowhp-reach fixture
  // above). Pidgey closes this by construction twice over: Ground-type
  // Sand Attack cannot touch a Flying-type at all (type immunity, checked
  // before any accuracy roll), and Keen Eye independently blocks any
  // accuracy-lowering effect from landing on its holder regardless
  // (src/battle_script_commands.c:4144) -- so the player's own Sand Attack
  // against Machamp stays a deterministic 100% hit both turns. 2 real
  // executed turns (calibrated mash-button reps, verified stable under
  // both a 700- and 2000-frame tail: exactly 2 PP consumed, never a real
  // 3rd) bring Machamp's own ACC stage to 4 (Gate C, :1205, now false);
  // both battlers' HP stay at 100% throughout (0-power moves both sides),
  // so Gates A/B cleanly skip DRAW SITE 1 as in every other AccuracyDown
  // fixture. The phantom 3rd-turn re-decision then reaches the :1206
  // if_random_less_than 80 roll once per identical MOVE_SAND_ATTACK slot.
  // The control fixture (target uses MOVE_SPLASH instead) is calibrated
  // separately (30 mash reps, not 40) because Splash's own lack of a
  // stat-change animation lets real turns execute faster per button-rep
  // than Sand Attack's does -- an uncalibrated shared rep count would have
  // let the control run a genuine (but harmless, since ACC never changes)
  // 3rd real turn instead of stopping at the same phantom 3rd decision the
  // reach fixture reads, breaking the two fixtures' turn-count parity.
  // Observed delta (20 reach vs 14 control, both cross-seed stable) matches
  // the analytical prediction exactly: +4 Cmd_if_random_less_than (DRAW
  // SITE 2, N=4 slots x 1 draw) + 2 Cmd_accuracycheck (the player's own 2
  // real Sand Attack hits on Machamp, absent in the control's 2 Splash
  // turns) = +6.
  {
    label:
      "AI_CV_AccuracyDown, opponent (AI_USER, Machamp) own ACC stat stage lowered to 4 by two real player (Pidgey) Sand Attack turns -- DRAW SITE 2 reachable branch (data/battle_ai_scripts.s:1198-1234): Gates A/B skip DRAW SITE 1 (both battlers held at 100% HP throughout), Gate C (if_stat_level_more_than USER,ACC,4) is false once the opponent's own ACC stage reaches 4, reaching the :1206 if_random_less_than 80 draw site on the phantom 3rd-turn re-decision, once per identical MOVE_SAND_ATTACK slot",
    path: "tools/battle-lab/mechanic-factory-ai-cv-accuracydown-accdown-reach-off.json",
    finalFrame: 1500,
    expectedPpUsed: 2,
    expectedTotalSteps: { 1: 20, 99: 20 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_AccuracyDown, opponent (AI_USER, Machamp) own ACC stat stage stays default -- control (same species/turn count, player uses MOVE_SPLASH instead of MOVE_SAND_ATTACK): Gate C (if_stat_level_more_than USER,ACC,4) stays true (default stage 6), so the :1206 draw site is never reached on the phantom 3rd-turn re-decision",
    path: "tools/battle-lab/mechanic-factory-ai-cv-accuracydown-accdown-control-off.json",
    finalFrame: 1300,
    expectedPpUsed: 2,
    expectedTotalSteps: { 1: 14, 99: 14 },
    checkCrossSeedStable: true,
  },
  // AI_CV_SpeedUp (data/battle_ai_scripts.s:956-965, doc §20): the first
  // stat-UP pair whose CV gate reads relative Speed (if_target_faster) --
  // not the opponent's own HP/stat-stage threshold like every prior
  // CBM-blocked UP pair (AttackUp/DefenseUp, doc §17/§18) -- so its twin
  // fixtures swap species roles (same trick as the doc's very first
  // SpeedDown scenario, §6) rather than banding one species' own HP. Both
  // species (Crobat, opponent role; Shuckle, target role) are deliberately
  // single-ability (Inner Focus/NONE, Sturdy/NONE) -- a first live catch
  // this session: AI_CheckBadMove's own universal prologue
  // (data/battle_ai_scripts.s:47-84, entirely separate from any
  // AI_CV_*/AI_CBM_* handler body) unconditionally calls get_ability
  // AI_TARGET once per candidate move for the Soundproof check, and an
  // early Dugtrio-target draft (two real abilities, Sand Veil/Arena Trap)
  // picked up 4 extra Cmd_get_ability-attributed draws (14 vs the expected
  // 10) purely from that universal ability-guessing roll -- nothing to do
  // with AI_CV_SpeedUp itself. Re-staged with a single-ability target and
  // the confound vanished (confirmed by attribution probe, see doc §20.4).
  {
    label:
      "AI_CV_SpeedUp, opponent (AI_USER, Shuckle) slower than target (Crobat) even after the opponent's own turn-1 Agility (+2 Speed stages) -- reachable branch (data/battle_ai_scripts.s:956-965): if_target_faster (Gate A) is true, falling through to the :962 if_random_less_than 70 draw site, which fires once per identical MOVE_AGILITY slot on the phantom next-turn re-decision",
    path: "tools/battle-lab/mechanic-factory-ai-cv-speedup-slower-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 10, 99: 10 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_SpeedUp, opponent (AI_USER, Crobat) faster than target (Shuckle) even before the opponent's own turn-1 Agility -- control (same species pair, roles swapped): if_target_faster (Gate A) is false, routing straight to score -3 then AI_CV_SpeedUp_End, deterministic zero draws from the handler itself",
    path: "tools/battle-lab/mechanic-factory-ai-cv-speedup-faster-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 6, 99: 6 },
    checkCrossSeedStable: true,
  },
  // AI_CV_SpAtkUp (data/battle_ai_scripts.s:967-983, doc §21): the fourth
  // stat-UP pair, byte-for-byte the same control-flow shape as AttackUp
  // (§17) with STAT_SPATK swapped for STAT_ATK -- EXCEPT DRAW SITE 3's own
  // threshold, if_random_less_than 70 (:980) vs AttackUp's 40 (:909), a
  // real numeric difference caught only by re-reading the assembly, not by
  // assuming the sibling's odds transfer. Reuses §17's entire Anorith
  // (opponent)/Machamp (target) fixture design verbatim, dispatch move
  // swapped for MOVE_GROWTH (74, EFFECT_SPECIAL_ATTACK_UP, 0 power,
  // accuracy 0). Numerically identical ledger to AttackUp's (10/10 reach,
  // 8/8 control) is expected and confirmed live: same gate structure, same
  // 0-power/0-accuracy self-target dispatch move, same target/opponent
  // species and damage sizing (MOVE_VITAL_THROW vs Anorith, unaffected by
  // Growth since Growth raises SPATK not DEF). Attribution probe (window 0
  // 732, reach fixture) confirms the same clean +4 Cmd_if_random_less_than,
  // zero Cmd_get_ability contamination (Machamp's single-ability kit
  // closes the confound, same as AttackUp and the §20.2 finding).
  {
    label:
      "AI_CV_SpAtkUp, opponent (AI_USER, Anorith) HP stays 100% through turn 1 -- reachable branch (data/battle_ai_scripts.s:967-983): Gate B (if_hp_not_equal USER,100) is false, falling through to the :975 if_random_less_than 128 draw site, which fires once per identical MOVE_GROWTH slot on the phantom next-turn re-decision",
    path: "tools/battle-lab/mechanic-factory-ai-cv-spatkup-fullhp-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 10, 99: 10 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_SpAtkUp, opponent (AI_USER, Anorith) HP hit below 40% by a real turn-1 move -- control (same opponent/species/turn count, player uses MOVE_VITAL_THROW instead of MOVE_SPLASH turn 1): Gate B (if_hp_not_equal USER,100) is true and Gate D (if_hp_less_than USER,40) is also true, routing straight to AI_CV_SpAtkUp_ScoreDown2 before the :975 roll is ever reached, deterministic zero draws from the handler itself",
    path: "tools/battle-lab/mechanic-factory-ai-cv-spatkup-lowhp-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 8, 99: 8 },
    checkCrossSeedStable: true,
  },
  // AI_CV_SpDefUp (data/battle_ai_scripts.s:986-1025, doc §22): reached by
  // TWO separate CBM handlers (AI_CBM_CosmicPower, :576-579, AND
  // AI_CBM_CalmMind, :590-593 -- unlike every prior CBM+CV pair in this
  // doc, which paired one CBM handler with one CV handler), plus
  // AI_CBM_SpDefUp/AI_CV_SpDefUp's own EFFECT_SPECIAL_DEFENSE_UP{,_2} route
  // (not separately fixtured here). Byte-for-byte the same control-flow
  // shape as AI_CV_DefenseUp (STAT_DEF -> STAT_SPDEF, same 5 odds
  // 100/128/200/60/60 at the same 5 positions) EXCEPT Gate F's polarity is
  // INVERTED: DefenseUp's :935 is `if_not_in_bytes ...,ScoreDown2` (non-
  // physical last move -> deterministic stop); SpDefUp's :1006 is `if_in_
  // bytes ...,ScoreDown2` (physical last move -> deterministic stop) -- the
  // exact trap PROGRESS-archive entry 477's side-merge flag named,
  // independently re-derived from the assembly here. Reuses DefenseUp's
  // entire Anorith(opponent)/Machamp(target) HP-banded last-used-move
  // fixture design (doc §18.3) verbatim, dispatch move swapped for
  // MOVE_COSMIC_POWER (322)/MOVE_CALM_MIND (347) -- both self-target,
  // 0 power, accuracy 0, so neither's own DEF+SPDEF/SPATK+SPDEF stat raise
  // affects the fixed-damage moves (MOVE_SEISMIC_TOSS, MOVE_DRAGON_RAGE)
  // used to bank the HP band and the last-move-type gate simultaneously.
  // Because Gate F's polarity is inverted vs DefenseUp, the reach/control
  // move-to-name assignment inverts too: MOVE_SEISMIC_TOSS (physical, IN
  // the list) is now the deterministic-zero-draw CONTROL (Gate F true ->
  // ScoreDown2 directly), and MOVE_DRAGON_RAGE (non-physical, NOT in the
  // list) is now the REACH fixture (Gate F false -> falls through to the
  // :1007 draw site) -- the opposite of DefenseUp's own physical=reach/
  // non-physical=control assignment (§18.3). Attribution probe (window 0
  // 732) confirms the control fixtures draw ZERO Cmd_if_random_less_than
  // (both CosmicPower and CalmMind), the reach fixtures draw 6 (seed 1),
  // and Cmd_get_ability appears in neither table (Machamp's single-ability
  // kit closes the confound, same as every stat-up pair since SpeedUp,
  // §20.2/§20.4). CosmicPower and CalmMind's ledgers are numerically
  // identical in every row, as expected since both dispatch to the same
  // AI_CV_SpDefUp body. The reach fixtures' own 14/13 (not a clean 4-per-
  // slot 10ish) total reproduces DefenseUp's own unresolved "5-6, not 4"
  // draw-count anomaly (doc §18.4) on this handler too -- flagged again,
  // not resolved, for a future porter to single-step.
  {
    label:
      "AI_CV_SpDefUp, target (player, Machamp) last-used move is MOVE_DRAGON_RAGE (Dragon, NOT in AI_CV_SpDefUp_PhysicalTypes) -- reachable branch (data/battle_ai_scripts.s:986-1025), opponent dispatch move MOVE_COSMIC_POWER: opponent (AI_USER, Anorith) HP lands at 80/120 (66.7%, inside [40,70)) so Gate C routes into AI_CV_SpDefUp4, Gate D is false, and Gate F (last move type NOT in the physical list) falls through to the :1007 if_random_less_than 60 draw site -- the INVERTED-polarity flip vs DefenseUp's own physical=reach assignment",
    path: "tools/battle-lab/mechanic-factory-ai-cv-spdefup-cosmicpower-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 14, 99: 13 },
    checkCrossSeedStable: false,
  },
  {
    label:
      "AI_CV_SpDefUp, target (player, Machamp) last-used move is MOVE_SEISMIC_TOSS (Fighting, IN AI_CV_SpDefUp_PhysicalTypes) -- control, opponent dispatch move MOVE_COSMIC_POWER: opponent HP lands at 70/120 (58.3%, inside [40,70)), Gate F (last move type IS in the physical list) routes straight to AI_CV_SpDefUp_ScoreDown2, deterministic zero draws from the handler itself -- the INVERTED-polarity flip vs DefenseUp's own physical=reach assignment",
    path: "tools/battle-lab/mechanic-factory-ai-cv-spdefup-cosmicpower-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 8, 99: 8 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_SpDefUp, target (player, Machamp) last-used move is MOVE_DRAGON_RAGE -- reachable branch, opponent dispatch move MOVE_CALM_MIND (347, EFFECT_CALM_MIND, raises SPATK+SPDEF -- neither affects Dragon Rage's fixed damage): numerically identical ledger to the MOVE_COSMIC_POWER reach fixture above, confirming both dispatch effects converge on the same AI_CV_SpDefUp body",
    path: "tools/battle-lab/mechanic-factory-ai-cv-spdefup-calmmind-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 14, 99: 13 },
    checkCrossSeedStable: false,
  },
  {
    label:
      "AI_CV_SpDefUp, target (player, Machamp) last-used move is MOVE_SEISMIC_TOSS -- control, opponent dispatch move MOVE_CALM_MIND: numerically identical ledger to the MOVE_COSMIC_POWER control fixture above, confirming both dispatch effects converge on the same AI_CV_SpDefUp body",
    path: "tools/battle-lab/mechanic-factory-ai-cv-spdefup-calmmind-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 8, 99: 8 },
    checkCrossSeedStable: true,
  },
  // AI_CV_LightScreen (data/battle_ai_scripts.s:1373-1393, doc §23) and
  // AI_CV_Reflect (:1492-1514) -- the simplest CBM+CV pair yet: each CBM
  // half is a single if_side_affecting check against the opponent's OWN
  // side status (Score_Minus8), and each CV half is Gate A (opponent's OWN
  // hp < 50 -> deterministic ScoreDown2) then Gates B/C (target's OWN type1/
  // type2 in a type list -> deterministic End) then exactly 1
  // if_random_less_than 50 draw site. Byte-for-byte identical topology
  // between LightScreen and Reflect on BOTH the CBM and CV sides -- the
  // first pair in this doc with zero sibling divergence either way -- the
  // only difference is which SIDE_STATUS_*/type-list is referenced.
  // LightScreen's 8-type SpecialTypeList and Reflect's 9-type
  // PhysicalTypeList are exact complements (all 17 Gen 3 types, no overlap),
  // so the same two target species serve both pairs with reach/control
  // simply swapping: Shuckle (213, Bug/Rock, single ability Sturdy) is
  // LightScreen's reach (neither type in the special list) and Reflect's
  // control (both types in the physical list); Vulpix (37, pure Fire,
  // single ability Flash Fire) is the opposite. Opponent (AI_USER) is
  // Anorith (390), all 4 slots the dispatch move under test
  // (MOVE_LIGHT_SCREEN 113 / MOVE_REFLECT 115, both already 0 power/0
  // accuracy/self-target by their own game data); the target's own move in
  // every fixture is MOVE_HARDEN (106, 0 power/0 accuracy/self-target) so
  // NO damage occurs on either side at all -- the opponent's HP is held at
  // its own max for the whole trace by construction, a first for this doc's
  // CBM-blocked-pair series (every prior pair needed at least a one-turn
  // real hit to pin HP state). Attribution probe (window 0 732, seed 1)
  // confirms no Cmd_accuracycheck row in any of the 4 fixtures (both moves
  // are 0-accuracy) and no Cmd_get_ability row (both targets single-
  // ability); the clean +4 delta (10 vs 6) is entirely
  // Cmd_if_random_less_than, the "N=4 slots x 1 draw" shape (matching
  // AttackDown's own DRAW SITE 2, §14.4), not the DefenseUp/SpDefUp
  // family's unresolved 5-6 anomaly (§18.4/§22.4). LightScreen's and
  // Reflect's own reach/control ledgers are numerically identical to each
  // other in every row, confirming the zero-divergence finding at the
  // instrument level too. Gate A (opponent HP < 50%) is not staged this
  // session -- would need a real-damage fixture variant, contradicting this
  // design's own zero-damage isolation.
  {
    label:
      "AI_CV_LightScreen, target (player, Shuckle, Bug/Rock) type is NOT in AI_CV_LightScreen_SpecialTypeList -- reachable branch (data/battle_ai_scripts.s:1373-1393), opponent dispatch move MOVE_LIGHT_SCREEN: opponent (AI_USER, Anorith) HP held at 120/120 (100%, Gate A false) by construction (target's MOVE_HARDEN never damages), Gates B/C both false, falls through to the :1379 if_random_less_than 50 draw site",
    path: "tools/battle-lab/mechanic-factory-ai-cv-lightscreen-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 10, 99: 10 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_LightScreen, target (player, Vulpix, pure Fire) type IS in AI_CV_LightScreen_SpecialTypeList -- control, opponent dispatch move MOVE_LIGHT_SCREEN: Gate B matches immediately on type1, deterministic zero-draw End, opponent HP held at 120/120 (100%) by construction",
    path: "tools/battle-lab/mechanic-factory-ai-cv-lightscreen-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 6, 99: 6 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_Reflect, target (player, Vulpix, pure Fire) type is NOT in AI_CV_Reflect_PhysicalTypeList -- reachable branch (data/battle_ai_scripts.s:1492-1514), opponent dispatch move MOVE_REFLECT: numerically identical ledger to the LightScreen reach fixture above, confirming both handlers are structurally twins",
    path: "tools/battle-lab/mechanic-factory-ai-cv-reflect-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 10, 99: 10 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_Reflect, target (player, Shuckle, Bug/Rock) type IS in AI_CV_Reflect_PhysicalTypeList -- control, opponent dispatch move MOVE_REFLECT: numerically identical ledger to the LightScreen control fixture above, confirming both handlers are structurally twins",
    path: "tools/battle-lab/mechanic-factory-ai-cv-reflect-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 6, 99: 6 },
    checkCrossSeedStable: true,
  },
  // AI_CV_EvasionUp (data/battle_ai_scripts.s:1037-1073, doc §24): the largest
  // remaining CV handler by draw-site count (8 if_random_less_than sites),
  // 2 of 8 live-verified across 3 fixtures. Opponent (AI_USER, under test)
  // Machamp (68, single ability Guts), all 4 slots MOVE_DOUBLE_TEAM (104,
  // EFFECT_EVASION_UP, 0 power/0 accuracy/self-target). Target (player)
  // Anorith (390, single ability Battle Armor), move varies per fixture.
  // DRAW SITE 1 (:1039) is gated by Gate A alone (opponent's OWN hp >= 90%
  // reaches; < 90% skips) -- the reach case is the UNDAMAGED default (target
  // Splash), no HP-banding needed. DRAW SITE 8 (:1069, the handler's tail)
  // needs Gate H false (opponent HP <= 70%) AND Gate I false (opponent's OWN
  // evasion stage != DEFAULT_STAT_STAGE, satisfied because Double Team's own
  // self-buff has already executed by the time the phantom next-decision
  // reads it, same "dispatch move's own prior effect" mechanism doc §19.1's
  // AccuracyDown Gate I established) AND Gates J/K false (both HP >= 40%) --
  // reached via target MOVE_SEISMIC_TOSS (69, dmgtolevel fixed 50 dmg,
  // Machamp 165->115, 69.7%). The middle fixture (target MOVE_DRAGON_RAGE,
  // 82, fixed 40 dmg, Machamp 165->125, 75.8%) sits in the (70%,90%) gap
  // between both gates' own thresholds -- Gate A false (skips site 1) AND
  // Gate H true (skips the entire tail, including site 8) -- a genuine
  // deterministic zero-draw control shared by both isolations, since no
  // single HP value can simultaneously satisfy site 1's reach (>=90%) and
  // sit inside site 8's own reach band (<=70%). Attribution probe (window
  // 0 732, seed 1) confirms both reach fixtures are the clean "N=4 slots x 1
  // draw" shape (not the DefenseUp/SpDefUp family's 5-6 anomaly, doc
  // §18.4/§22.4) -- fullhp-reach is 10 = 6 baseline + 4 Cmd_if_random_less_than
  // (site 1) with zero Cmd_accuracycheck/Cmd_seteffectwithchance (both moves
  // are 0-accuracy/no-effect); midhp-control is 8 = 6 baseline + 1
  // Cmd_accuracycheck + 1 Cmd_seteffectwithchance (Dragon Rage actually
  // connecting) + zero draws; lowhp-reach is 12 = 6 baseline + 1
  // Cmd_accuracycheck + 4 Cmd_if_random_less_than (site 8) + 1
  // Cmd_seteffectwithchance (Seismic Toss actually connecting). Cmd_get_ability
  // appears in none of the three tables (both species single-ability, and
  // AI_CBM_EvasionUp itself has no get_ability call at all -- same "Up"-family
  // shape as AttackUp/DefenseUp/SpeedUp/SpAtkUp/SpDefUp/AccUp, doc §17.1).
  {
    label:
      "AI_CV_EvasionUp, opponent (AI_USER, Machamp) HP stays 100% (target MOVE_SPLASH) -- DRAW SITE 1 reachable branch (data/battle_ai_scripts.s:1037-1073): Gate A (if_hp_less_than USER,90) is false at full HP, falling through into the :1039 if_random_less_than 100 roll once per identical MOVE_DOUBLE_TEAM slot; Gate H (opponent HP>70) is also true, so the tail/DRAW SITE 8 stays deterministically skipped in this same fixture",
    path: "tools/battle-lab/mechanic-factory-ai-cv-evasionup-fullhp-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 10, 99: 10 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_EvasionUp, opponent (AI_USER, Machamp) HP hit to 125/165 (75.8%, target MOVE_DRAGON_RAGE) -- deterministic zero-draw control for BOTH DRAW SITE 1 and DRAW SITE 8: Gate A (hp<90) is true (skips site 1) and Gate H (hp>70) is also true (skips the entire tail, including site 8) -- no single HP value can reach either site from this band",
    path: "tools/battle-lab/mechanic-factory-ai-cv-evasionup-midhp-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 8, 99: 8 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_EvasionUp, opponent (AI_USER, Machamp) HP hit to 115/165 (69.7%, target MOVE_SEISMIC_TOSS) -- DRAW SITE 8 reachable branch (data/battle_ai_scripts.s:1064-1069): Gate A (hp<90) true skips site 1; Gate H (hp<=70) false continues the tail; Gate I (opponent's own evasion stage != default) false because Double Team already raised it 6->7 by the phantom next-decision; Gates J/K (both hp>=40) false; falls through into the :1069 if_random_less_than 70 roll once per identical slot",
    path: "tools/battle-lab/mechanic-factory-ai-cv-evasionup-lowhp-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 12, 99: 12 },
    checkCrossSeedStable: true,
  },

  // AI_CV_EvasionDown (data/battle_ai_scripts.s:1235-1245, doc §24): byte-for-
  // byte the same control-flow shape as AI_CV_DefenseDown/AI_CV_SpDefDown
  // (§15/§16) -- STAT_DEF/STAT_SPDEF swapped for STAT_EVASION, re-derived
  // independently from the raw assembly (not assumed) and confirmed clean,
  // no divergence. Reuses §15's exact Anorith(AI_USER)/Machamp(AI_TARGET)
  // fixture design verbatim, only the opponent's dispatch move changes
  // (MOVE_SWEET_SCENT, 230, EFFECT_EVASION_DOWN, 0 power, 100 accuracy,
  // MOVE_TARGET_BOTH). Numerically identical ledger to DefenseDown's own
  // (13/13 reach, 7/7 control) is expected: same gate structure, same
  // 0-power/100-accuracy dispatch move, same Vital Throw damage band
  // (Anorith 120->22, 18%, comfortably under the <70% Gate A threshold).
  // Attribution probe (window 0 732, seed 1) confirms the same clean split
  // as DefenseDown: reach 13 = 6 baseline + 1 Cmd_accuracycheck (Sweet
  // Scent's own roll -- Vital Throw itself never calls Random() for
  // accuracy, EFFECT_VITAL_THROW is hardcoded always-hit,
  // src/battle_script_commands.c:1090) + 1 Cmd_adjustnormaldamage + 4
  // Cmd_if_random_less_than (the :1239 draw site, clean N=4) + 1
  // Cmd_seteffectwithchance; control 7 = 6 baseline + 1 Cmd_accuracycheck
  // (Sweet Scent again, constant across both fixtures) + zero draws (Gate A
  // false, Gate B true by default). Cmd_get_ability appears in neither
  // table (both species single-ability).
  {
    label:
      "AI_CV_EvasionDown, opponent (AI_USER, Anorith) HP hit to <70% by a real turn-1 move -- reachable branch (data/battle_ai_scripts.s:1235-1245): if_hp_less_than USER,70 (Gate A) routes straight to the :1239 if_random_less_than 50 draw site, which fires once per identical MOVE_SWEET_SCENT slot on the phantom next-turn re-decision",
    path: "tools/battle-lab/mechanic-factory-ai-cv-evasiondown-lowhp-reach-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 13, 99: 13 },
    checkCrossSeedStable: true,
  },
  {
    label:
      "AI_CV_EvasionDown, opponent (AI_USER, Anorith) HP stays 100% -- control (same opponent/species/turn count, player uses MOVE_SPLASH instead of MOVE_VITAL_THROW): Gate A (if_hp_less_than USER,70) is false and Gate B (target evasion stage > 3, default 6) is true, routing straight to AI_CV_EvasionDown3 before the :1239 roll is ever reached, deterministic zero draws from the handler itself",
    path: "tools/battle-lab/mechanic-factory-ai-cv-evasiondown-fullhp-control-off.json",
    finalFrame: 732,
    expectedPpUsed: 1,
    expectedTotalSteps: { 1: 7, 99: 7 },
    checkCrossSeedStable: true,
  },
];

// AI_CV_EvasionUp Gates C/D toxic-poison chain (data/battle_ai_scripts.s:
// 1046-1050, doc §7.3's chained-fall-through fix, commit 20f09bb) -- side-lane
// live corroboration, docs/factory-ai-checkviability-ground-truth.md §24.5.
// Two-Pokemon opponent relay (the doc's own §19.5 recipe for AccuracyDown's
// analogous toxic sites, applied here): opponent slot 0 = Magikarp (129,
// level 5), all 4 slots MOVE_TOXIC (92) -- forced (all 4 slots identical),
// so its real turn-1 use against the target is not a genuine, unforced AI
// pick between two moves, sidestepping the "mixed moveset" obstacle §24.5
// named for these sites. Target (player) Anorith (390, single ability
// Battle Armor), all 4 slots MOVE_SEISMIC_TOSS (69, EFFECT_LEVEL_DAMAGE,
// fixed 50 dmg = Anorith's level). Turn 1: Magikarp uses Toxic on Anorith
// (lands both banked seeds); Anorith Splashes (harmless). Turn 2: Anorith
// Seismic Tosses Magikarp (18 max HP @ level 5, OHKO) -- opponent auto-sends
// its second party slot, Shuckle (213, single ability Sturdy, base Speed 5,
// deliberately SLOWER than Anorith's 75 so Anorith's own Seismic Toss always
// resolves BEFORE Shuckle's own Double Team raises its evasion -- an early
// Magikarp-for-both-slots draft, base Speed 80 > Anorith's 75, showed a real
// same-turn confound here: Double Team's self-evasion-boost landing first
// made the same-turn Seismic Toss's accuracy check probabilistic instead of
// guaranteed, the same bug class §19.2/§19.5 named for AccuracyDown's own
// dispatch move; Shuckle's low Speed closes it), all 4 slots MOVE_DOUBLE_TEAM
// (104). REACH continues: turn 3, Anorith Seismic Tosses Shuckle again (95
// max HP, one 50-dmg hit -> 45/95, 47.4%, comfortably <=50%) -- the trailing
// phantom decision (this doc's own "only the phantom next-decision is
// observable" mechanism, §11.0) then reads target-toxic=true AND opponent-
// own-HP<=50%, the chain's own reach condition. CONTROL A stops right after
// turn 2 (Shuckle switches in fresh, undamaged 95/95, still >50%) -- same
// toxic prerequisite, opposite HP band, single-site branch. Per-DRAW-SITE
// attribution (tools/probe/attribute-factory-ai-cv-drawsite-callers.py,
// window 0-finalFrame, both seeds) is the load-bearing evidence, not just
// the raw total: CONTROL shows AI_CV_EvasionUp4 x4, AI_CV_EvasionUp3 x0 --
// site 3 literally never fires when own HP>50 (Gate D routes straight past
// it). REACH shows AI_CV_EvasionUp3 x4 (ALWAYS drawn, one per identical
// slot, regardless of outcome) plus AI_CV_EvasionUp4 x6 (seed 1) / x7 (seed
// 99) -- decomposing as the earlier still-100%-HP decision's own direct-
// entry site-4 contribution (4, matching CONTROL's shape) PLUS 2 (seed 1) /
// 3 (seed 99) EXTRA site-4 draws from the <=50% decision's own chain, i.e.
// 2-3 of the 4 slots' own DRAW SITE 3 roll fell through into a second roll
// at DRAW SITE 4 -- exactly the chained-fall-through model docs/factory-ai-
// draw-discrepancy-probe.md §7.1/§7.3 fixed (commit 20f09bb), landing inside
// the model's own valid [4,8] range every time, never both mutually
// exclusive single draws. The raw per-run totals below (frame 0->finalFrame,
// via the RNG forward-search) are the cheap proxy this verify script checks
// on every run; the per-site breakdown is recorded in the doc for the full
// mechanism-level story.
interface ToxicChainScenarioSpec {
  label: string;
  path: string;
  finalFrame: number;
  expectedOpponentSpecies: number;
  expectedOpponentHp: number;
  expectedOpponentMaxHp: number;
  expectedTotalSteps: Record<number, number>;
  checkCrossSeedStable: boolean;
}

const EVASIONUP_TOXICCHAIN_SCENARIOS: ToxicChainScenarioSpec[] = [
  {
    label:
      "AI_CV_EvasionUp, target (player, Anorith) toxic-poisoned AND opponent (AI_USER, Shuckle) own HP <=50% (45/95, 47.4%) -- REACH: Gate D routes to DRAW SITE 3 first (data/battle_ai_scripts.s:1048), whose own fall-through chains into DRAW SITE 4 (:1050); attribution confirms DRAW SITE 3 fires 4x (mandatory, one per identical slot) and DRAW SITE 4 fires more than the direct-entry baseline of 4 (2-3 extra, per-slot chain-dependent) -- the chained-fall-through model, not two mutually exclusive single-draw sites",
    path: "tools/battle-lab/mechanic-factory-ai-cv-evasionup-toxicchain-reach-off.json",
    finalFrame: 1920,
    expectedOpponentSpecies: 213,
    expectedOpponentHp: 45,
    expectedOpponentMaxHp: 95,
    expectedTotalSteps: { 1: 41, 99: 42 },
    checkCrossSeedStable: false,
  },
  {
    label:
      "AI_CV_EvasionUp, target (player, Anorith) toxic-poisoned AND opponent (AI_USER, Shuckle) own HP >50% (95/95, fresh switch-in) -- CONTROL A: Gate D routes straight to DRAW SITE 4 alone (data/battle_ai_scripts.s:1047), DRAW SITE 3 never reached -- single-site branch, same toxic prerequisite as REACH, opposite HP band",
    path: "tools/battle-lab/mechanic-factory-ai-cv-evasionup-toxicchain-control-off.json",
    finalFrame: 1842,
    expectedOpponentSpecies: 213,
    expectedOpponentHp: 95,
    expectedOpponentMaxHp: 95,
    expectedTotalSteps: { 1: 23, 99: 23 },
    checkCrossSeedStable: true,
  },
];

async function verifyToxicChainScenario(spec: ToxicChainScenarioSpec): Promise<void> {
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

    const fEndA = run1.get(spec.finalFrame)!;
    const fEndB = run2.get(spec.finalFrame)!;
    check(
      `seed ${seed}: frame ${spec.finalFrame} identical across reruns (determinism)`,
      JSON.stringify(fEndA) === JSON.stringify(fEndB),
      "final state differs between runs",
    );

    check(
      `seed ${seed}: target (player, Anorith) is toxic-poisoned at frame ${spec.finalFrame} (Gate C prerequisite)`,
      fEndA.battlers.player.status?.kind === "toxic",
      `observed status ${JSON.stringify(fEndA.battlers.player.status)}`,
    );

    check(
      `seed ${seed}: opponent (AI_USER) is species ${spec.expectedOpponentSpecies} (Shuckle, switched in after Magikarp fainted)`,
      fEndA.battlers.opponent.species === spec.expectedOpponentSpecies,
      `observed species ${fEndA.battlers.opponent.species}`,
    );

    check(
      `seed ${seed}: opponent (AI_USER) HP is ${spec.expectedOpponentHp}/${spec.expectedOpponentMaxHp}`,
      fEndA.battlers.opponent.hp === spec.expectedOpponentHp && fEndA.battlers.opponent.maxHp === spec.expectedOpponentMaxHp,
      `observed hp ${fEndA.battlers.opponent.hp}/${fEndA.battlers.opponent.maxHp}`,
    );

    const f0 = run1.get(0)!;
    const totalSteps = stepsToReach(f0.rngValue, fEndA.rngValue, spec.expectedTotalSteps[seed]! + 20);
    check(
      `seed ${seed}: exactly ${spec.expectedTotalSteps[seed]} total Random() calls from frame 0 to frame ${spec.finalFrame}`,
      totalSteps === spec.expectedTotalSteps[seed],
      `forward-search found ${totalSteps === null ? "no match" : `step ${totalSteps}`}`,
    );
    perSeedTotals.push(totalSteps ?? -1);

    console.log(
      `  seed ${seed}: opponent hp=${fEndA.battlers.opponent.hp}/${fEndA.battlers.opponent.maxHp}, total steps 0->${spec.finalFrame}=${totalSteps}`,
    );
  }

  if (spec.checkCrossSeedStable) {
    check(
      `count stability: total-step count is identical across seeds ${SEEDS.join(" and ")} (${JSON.stringify(perSeedTotals)})`,
      perSeedTotals.every((n) => n === perSeedTotals[0]),
      `per-seed totals differ: ${JSON.stringify(perSeedTotals)}`,
    );
  } else {
    console.log(`  (cross-seed stability intentionally not asserted -- the chain's per-slot fall-through count is RNG-dependent, see scenario comment)`);
  }
}

// AI_CV_RainDance/SunnyDay/Hail (data/battle_ai_scripts.s:2037-2059/2060-2076/
// 2261-2278, doc §25) + their AI_CBM_RainDance/SunnyDay/Hail siblings
// (:490-493/495-498/522-525): all six handlers are genuinely 0-`if_random`
// (no `if_random_less_than` anywhere in the CBM or CV body for any of the
// three), so the DRAW_COUNT_SCENARIOS technique above (compare total
// Random() call counts with all 4 opponent slots identical) has NO signal to
// read -- CBM's score change and CV's score change never touch Random() at
// all. The only live-observable channel is the AI's own final MOVE PICK, so
// these fixtures follow SCENARIOS' pick-based design instead (opponent
// moveset [TEST_WEATHER_MOVE, MOVE_GROWL x3], the same zero-baseline Growl
// control established by AI_CV_SpeedDown/AttackDown, §6/§14), extended to
// two real turns: turn 1 (player, all 4 slots the SAME real weather move,
// forced choice) establishes a PRE-EXISTING weather state live (never
// injected); turn 2 is the opponent's first decision made under that
// already-established weather, isolated by reading the opponent's PP delta
// between frame 700 (turn 1 fully settled, including its own end-of-turn
// weather-damage tick) and frame 1600 (turn 2 fully settled). Each handler
// gets two fixtures: "cbmreach" (turn 1 sets the WEATHER MOVE'S OWN matching
// weather, e.g. Rain for AI_CV_RainDance -- AI_CBM_*'s Score_Minus8 fires,
// AI_CV_*'s own weather-chain does NOT match its own type, so CV stays quiet
// -- net negative, turn 2 must never re-pick slot 0) and "cvreach" (turn 1
// sets Sandstorm -- common to all three handlers' own "+1" weather-chain
// bucket, confirmed by source: RainDance checks HAIL/SUN/SANDSTORM,
// SunnyDay checks HAIL/RAIN/SANDSTORM, Hail checks SUN/RAIN/SANDSTORM --
// AI_CBM_*'s own gate does NOT match Sandstorm, so CBM stays quiet, CV's own
// +1 fires alone -- net positive, turn 2 must always pick slot 0). Live-
// verified 6/6 fixtures x 2 seeds = 12/12 exact matches to this prediction
// (tools/battle-lab/... probes, this session).
interface WeatherPickScenarioSpec {
  label: string;
  path: string;
  // true = the handler's own reach branch is expected to WIN (AI picks slot
  // 0, the weather move, turn 2); false = expected to LOSE (AI picks one of
  // slots 1-3, Growl, turn 2; slot 0 is never touched between frame 700 and
  // frame 1600).
  expectedSlot0Wins: boolean;
  // "before"/"after" capture frames read for the PP-delta check. Default
  // 700/1600 (the original 2-turn weather-establishing design, §25.4-25.5).
  // The three RainDance-gate fixtures added by the 2026-07-27 follow-up
  // side-lane session (§25.6 items 1-3) don't need a pre-existing weather
  // state, so they use different windows: the two single-turn ability-gate
  // fixtures (Gate S/Gate R) read 0->732 (this doc's original single-turn
  // SCENARIOS shape, §6/§13); the HP-gate fixture reads 400->700 (post-
  // turn-1-settle -> post-turn-2-decision, tuned narrower than 700/1600
  // because MOVE_VITAL_THROW's own fewer message boxes make the standard
  // 700/1600 window run long enough for a 3rd real turn to execute and
  // faint the opponent, corrupting the read -- see the fixture's own doc
  // section for the empirical timing trace).
  beforeFrame?: number;
  afterFrame?: number;
  // "above40" (default): the HP-gate confound check asserts opponent HP
  // stays >=40% throughout (every original weather-trio fixture keeps HP
  // high by construction, isolating the weather-chain branch). "below40":
  // the 2026-07-27 HP-gate fixture instead *targets* the <40% branch, so the
  // check is inverted to assert HP legitimately dropped under 40% by the
  // "after" frame (confirming the gate's own precondition was really met,
  // not just assumed).
  hpBand?: "above40" | "below40";
}

const WEATHER_PICK_SCENARIOS: WeatherPickScenarioSpec[] = [
  {
    label:
      "AI_CBM_RainDance + AI_CV_RainDance, weather pre-set to Rain by a real turn-1 move -- AI_CBM_RainDance's Score_Minus8 fires (data/battle_ai_scripts.s:490-493, get_weather==AI_WEATHER_RAIN), AI_CV_RainDance's own weather-chain does NOT match (Rain isn't in its Hail/Sun/Sandstorm list, :2043-2046) -- net negative, turn 2 must never re-pick Rain Dance",
    path: "tools/battle-lab/mechanic-factory-ai-cv-raindance-cbmreach-off.json",
    expectedSlot0Wins: false,
  },
  {
    label:
      "AI_CBM_RainDance + AI_CV_RainDance, weather pre-set to Sandstorm by a real turn-1 move -- AI_CBM_RainDance's gate does not match (weather != Rain), AI_CV_RainDance's weather-chain DOES match Sandstorm (:2046, score +1) -- net positive, turn 2 must pick Rain Dance",
    path: "tools/battle-lab/mechanic-factory-ai-cv-raindance-cvreach-off.json",
    expectedSlot0Wins: true,
  },
  {
    label:
      "AI_CBM_SunnyDay + AI_CV_SunnyDay, weather pre-set to Sun by a real turn-1 move -- AI_CBM_SunnyDay's Score_Minus8 fires (:495-498, get_weather==AI_WEATHER_SUN), AI_CV_SunnyDay's own weather-chain does NOT match (Sun isn't in its Hail/Rain/Sandstorm list, :2062-2065) -- net negative, turn 2 must never re-pick Sunny Day",
    path: "tools/battle-lab/mechanic-factory-ai-cv-sunnyday-cbmreach-off.json",
    expectedSlot0Wins: false,
  },
  {
    label:
      "AI_CBM_SunnyDay + AI_CV_SunnyDay, weather pre-set to Sandstorm by a real turn-1 move -- AI_CBM_SunnyDay's gate does not match, AI_CV_SunnyDay's weather-chain DOES match Sandstorm (:2065, score +1) -- net positive, turn 2 must pick Sunny Day",
    path: "tools/battle-lab/mechanic-factory-ai-cv-sunnyday-cvreach-off.json",
    expectedSlot0Wins: true,
  },
  {
    label:
      "AI_CBM_Hail + AI_CV_Hail, weather pre-set to Hail by a real turn-1 move -- AI_CBM_Hail's Score_Minus8 fires (:522-525, get_weather==AI_WEATHER_HAIL), AI_CV_Hail's own weather-chain does NOT match (Hail isn't in its Sun/Rain/Sandstorm list, :2264-2266) -- net negative, turn 2 must never re-pick Hail",
    path: "tools/battle-lab/mechanic-factory-ai-cv-hail-cbmreach-off.json",
    expectedSlot0Wins: false,
  },
  {
    label:
      "AI_CBM_Hail + AI_CV_Hail, weather pre-set to Sandstorm by a real turn-1 move -- AI_CBM_Hail's gate does not match, AI_CV_Hail's weather-chain DOES match Sandstorm (:2266, score +1) -- net positive, turn 2 must pick Hail",
    path: "tools/battle-lab/mechanic-factory-ai-cv-hail-cvreach-off.json",
    expectedSlot0Wins: true,
  },
  // 2026-07-27 follow-up side-lane session: the 3 recipe-only AI_CV_RainDance
  // branches named in doc §25.6 items 1-3 (Gate P/S Swift Swim bypass, Gate
  // R Rain Dish tail bonus, the <40% HP-gate branch). All three are single
  // fixtures (not reach/control pairs) given the step's time budget --
  // causal attribution instead comes from comparing against this doc's own
  // well-established Growl=0/Splash=0 baselines (§6/§14/§25.4-25.5), not a
  // matched control fixture.
  {
    label:
      "AI_CV_RainDance Gate P/S: opponent (AI_USER) = Huntail (374, single ability Swift Swim, speed 72 < Anorith target's 95, so NOT user-faster) -- Gate S's own get_ability AI_USER read finds Swift Swim and bypasses the HP/weather chain entirely, +1 (data/battle_ai_scripts.s:2039-2041); weather never established this battle (stays AI_WEATHER_NONE) so AI_CBM_RainDance's own gate stays quiet (target Anorith's ability id=4, safe from the get_weather AI_WEATHER_NONE stale-read bug documented in doc §25.1: even if the bug fires, funcResult=4 can't equal any of the 0-3 AI_WEATHER_* constants) -- net +1, single turn, Rain Dance must win the real turn-1 pick over 3x Growl(0, Anorith's Bug type1 zeroes AI_CV_AttackDown's own Gate E)",
    path: "tools/battle-lab/mechanic-factory-ai-cv-raindance-gates-swiftswim-reach-off.json",
    expectedSlot0Wins: true,
    beforeFrame: 0,
    afterFrame: 732,
  },
  {
    label:
      "AI_CV_RainDance Gate R: opponent (AI_USER) = Lotad (295, abilitySlot 1 forces ABILITY_RAIN_DISH -- no single-ability Rain Dish carrier exists in Emerald's dex, Lotad/Lombre/Ludicolo all pair it with Swift Swim, but Cmd_get_ability's AI_USER read is a direct gBattleMons[].ability read that never guesses regardless of the species' own ability count, doc §25.2/§25.3, so the dual-ability confound that matters elsewhere for AI_TARGET reads does not apply here), speed 50 > Shuckle target's 25 so Gate P already skips Gate S -- weather never established (AI_WEATHER_NONE), the shared weatherSetterCvScore span falls through with 0, Gate R's own get_ability AI_USER finds Rain Dish, +1 (data/battle_ai_scripts.s:2053-2055); AI_CBM_RainDance stays quiet (target Shuckle ability Sturdy id=5, same stale-read safety margin as above) -- net +1, single turn, Rain Dance must win the real turn-1 pick over 3x Growl(0, Shuckle's Bug type1 baseline, §25.4)",
    path: "tools/battle-lab/mechanic-factory-ai-cv-raindance-gates-raindish-reach-off.json",
    expectedSlot0Wins: true,
    beforeFrame: 0,
    afterFrame: 732,
  },
  {
    label:
      "AI_CV_RainDance <40% HP gate: opponent (AI_USER) = Anorith (390, Battle Armor, speed 95 > Machamp target's 75 so Gate P skips Gate S regardless of ability) at full HP turn 1, moveset [RAIN_DANCE, SPLASH x3] (Splash instead of Growl for the 3 filler slots -- Growl would itself lower Machamp's own ATK stage if picked turn 1, breaking AI_CV_AttackDown's own Gate A precondition for turn 2's read and confounding the baseline; Splash is a genuine no-op move with no CBM/CV dispatch entry at all, so its 0 baseline holds regardless of what turn 1 does); Machamp (68, all 4 slots MOVE_VITAL_THROW, the §13.2 Anorith/Machamp damage-sizing recipe transplanted verbatim, 86-102 dmg / 15-28% HP remaining, comfortably under the 40% gate) lands turn 1's hit -- turn 2's real decision hits Gate H (own HP<40%) BEFORE weather is ever read, deterministic -1 (data/battle_ai_scripts.s:2043-2044); net negative regardless of what weather turn 1 happened to leave behind (Gate H short-circuits before get_weather is ever called) -- Rain Dance must never win turn 2's pick, Splash always does",
    path: "tools/battle-lab/mechanic-factory-ai-cv-raindance-hpgate-reach-off.json",
    expectedSlot0Wins: false,
    beforeFrame: 400,
    afterFrame: 700,
    hpBand: "below40",
  },
];

async function verifyWeatherPickScenario(spec: WeatherPickScenarioSpec): Promise<void> {
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

    const beforeFrame = spec.beforeFrame ?? 700;
    const afterFrame = spec.afterFrame ?? 1600;
    const fBefore = run1.get(beforeFrame)!;
    const fAfter = run1.get(afterFrame)!;
    const before = fBefore.battlers.opponent.pp;
    const after = fAfter.battlers.opponent.pp;

    const slot0Delta = before[0]! - after[0]!;
    const othersDelta = [1, 2, 3].map((i) => before[i]! - after[i]!);

    if (spec.expectedSlot0Wins) {
      check(
        `seed ${seed}: turn-2 pick is slot 0 (the weather move) -- PP drops by exactly 1, slots 1-3 untouched`,
        slot0Delta === 1 && othersDelta.every((d) => d === 0),
        `observed opponent PP ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
      );
    } else {
      check(
        `seed ${seed}: turn-2 pick is NEVER slot 0 -- slot 0 PP untouched, exactly one of slots 1-3 (Growl/Splash) drops by 1`,
        slot0Delta === 0 && othersDelta.filter((d) => d === 1).length === 1 && othersDelta.every((d) => d === 0 || d === 1),
        `observed opponent PP ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
      );
    }

    if (spec.hpBand === "below40") {
      // The 2026-07-27 HP-gate fixture deliberately drives the opponent
      // under 40% via a real turn-1 hit (§13.2's Anorith/Machamp Vital
      // Throw recipe, transplanted verbatim) -- confirm that precondition
      // actually held live, not just assumed from the hand-computed 86-102
      // damage range.
      check(
        `seed ${seed}: opponent HP is genuinely <40% by frame ${afterFrame} (the HP-gate fixture's own precondition)`,
        fAfter.battlers.opponent.hp < 0.4 * f0a.battlers.opponent.hp,
        `opponent HP ${f0a.battlers.opponent.hp} -> ${fAfter.battlers.opponent.hp}`,
      );
    } else {
      // Opponent HP must stay well above the handlers' own <40% gate
      // throughout (Hail's own end-of-turn chip damage is the only source
      // of HP loss in these fixtures -- Growl/weather moves never deal
      // damage) so the CV body's own if_hp_less_than gate stays false in
      // both turns, isolating the weather-chain branch this fixture
      // actually targets.
      check(
        `seed ${seed}: opponent HP stays >=40% through frame ${afterFrame} (no HP-gate confound)`,
        fAfter.battlers.opponent.hp >= 0.4 * f0a.battlers.opponent.hp,
        `opponent HP ${f0a.battlers.opponent.hp} -> ${fAfter.battlers.opponent.hp}`,
      );
    }

    console.log(`  seed ${seed}: opponent PP @${beforeFrame}=${JSON.stringify(before)} @${afterFrame}=${JSON.stringify(after)}`);
  }
}

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
  for (const spec of EVASIONUP_TOXICCHAIN_SCENARIOS) {
    await verifyToxicChainScenario(spec);
  }
  for (const spec of WEATHER_PICK_SCENARIOS) {
    await verifyWeatherPickScenario(spec);
  }

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
