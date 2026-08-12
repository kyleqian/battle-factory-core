#!/usr/bin/env node
// Codegen for core-rs/crates/factory-core/src/factory_ai_decision_policy_vectors_gen.rs.
//
// Computes expected policy receipts by EXECUTING canonical
// chooseFactoryAiMaskZeroDecision from src/engine/factoryAiDecisionPolicy.ts
// (read-only import, node --experimental-strip-types). No success value or
// canonical-reachable error text below is hand-computed. The directed source
// test cases plus a fixed deterministic sweep cover all legal subsets, target
// variations, all winning slots, ties, nonzero call cursors and broad seeds.
//
// The one `empty_legal_list_typed_only` error is deliberately represented by
// Rust's typed slice API but cannot reach the TS policy: commandRequestAt's
// upstream JSON boundary rejects an empty list first. Its exact policy literal
// is retained so native typed callers preserve the chooser's own source guard.
//
// Usage: node core-rs/tools/gen-factory-ai-decision-policy-vectors.mjs
//        (from any cwd; reruns are byte-identical)

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // core-rs/tools
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  scriptDir,
  "..",
  "crates",
  "factory-core",
  "src",
  "factory_ai_decision_policy_vectors_gen.rs",
);

const policy = await import(path.join(workspaceRoot, "src", "engine", "factoryAiDecisionPolicy.ts"));
const boundary = await import(path.join(workspaceRoot, "src", "engine", "battleDecisionBoundary.ts"));
const { chooseFactoryAiMaskZeroDecision } = policy;
const { createBattleCommandRequest, createBattleForcedSwitchRequest } = boundary;

const BRANCH_ORDER = [
  "tent",
  "frontierBrain",
  "challengeBelow2",
  "challengeBelow4",
  "challengeAtLeast4",
];
const MAX_SLOTS = 4;
const DEFAULT_MOVES = [85, 86, 69, 273];
const DEFAULT_FACTORY = {
  levelMode: 0,
  battleMode: 0,
  factoryWinStreak: 0,
  trainerOpponentId: 50,
};

const successCases = [];
const errorCases = [];

function branchIndex(id) {
  const index = BRANCH_ORDER.indexOf(id);
  if (index < 0) throw new Error(`gen-factory-ai-decision-policy-vectors: unknown branch ${id}`);
  return index;
}

function move(slot, targetBattler) {
  return { kind: "use-move", moveSlot: slot, targetBattler };
}

function command({ requestId = 73, side = "trainer", battler = 1, legalDecisions }) {
  return createBattleCommandRequest({
    kind: "command",
    requestId,
    side,
    battler,
    legalDecisions,
  });
}

function makeView({ factory = DEFAULT_FACTORY, moves = DEFAULT_MOVES } = {}) {
  return {
    schema: "factory-ai-view/v1",
    mode: "factory-level-50-singles",
    active: { aiBattler: 1, targetBattler: 0 },
    factory: { ...factory },
    moves: [...moves],
  };
}

function requestRow(request) {
  if (request.kind === "forced-switch") {
    return {
      requestKind: 1,
      requestId: request.requestId,
      side: request.side === "trainer" ? 1 : 0,
      battler: request.battler,
      legal: [],
    };
  }
  return {
    requestKind: 0,
    requestId: request.requestId,
    side: request.side === "trainer" ? 1 : 0,
    battler: request.battler,
    legal: request.legalDecisions.map((decision) => decision.kind === "use-move"
      ? { kind: 0, moveSlot: decision.moveSlot, targetBattler: decision.targetBattler }
      : { kind: 1, moveSlot: 0, targetBattler: decision.partyIndex }),
  };
}

function paddedRows(rows, filler) {
  return Array.from({ length: MAX_SLOTS }, (_, i) => rows[i] ?? filler);
}

function pushSuccess(label, view, request, rng) {
  const result = chooseFactoryAiMaskZeroDecision({ view, request, rng });
  const receipt = result.trace.maskSelection;
  const evaluations = paddedRows(
    receipt.evaluations.map((evaluation) => ({ branch: branchIndex(evaluation.id), matched: evaluation.matched })),
    { branch: 0, matched: false },
  );
  const draws = result.trace.draws.map((draw) => ({
    kind: draw.kind === "setup-simulated-rng" ? 0 : 1,
    ordinal: draw.ordinal,
    moveSlot: draw.kind === "setup-simulated-rng" ? draw.moveSlot : 255,
    beforeValue: draw.before.value,
    beforeCalls: draw.before.calls,
    afterValue: draw.after.value,
    afterCalls: draw.after.calls,
    rawRngValue: draw.rawRngValue,
    randomValue: draw.randomValue,
    simulatedRng: draw.kind === "setup-simulated-rng" ? draw.simulatedRng : 0,
  }));
  const slots = result.trace.slotScores.map((score) => ({
    moveSlot: score.moveSlot,
    moveId: score.moveId,
    legal: score.legal,
    initialScore: score.initialScore,
    finalScore: score.finalScore,
  }));
  const row = requestRow(request);
  successCases.push({
    label,
    factory: view.factory,
    moves: view.moves,
    ...row,
    rngValue: rng.value,
    rngCalls: rng.calls,
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedMask: result.trace.mask,
    expectedBranch: branchIndex(receipt.branch.id),
    expectedIsFrontierBrain: receipt.inputs.isFrontierBrain,
    expectedHasChallengeNumber: receipt.challengeNumber !== null,
    expectedChallengeNumber: receipt.challengeNumber ?? 0,
    expectedEvaluationCount: receipt.evaluations.length,
    expectedEvaluations: evaluations,
    expectedDraws: draws,
    expectedSlots: slots,
    expectedBestSlots: paddedRows(result.trace.bestMoveSlots, 0),
    expectedBestSlotCount: result.trace.bestMoveSlots.length,
    expectedTieModulus: result.trace.tie.modulus,
    expectedTieIndex: result.trace.tie.index,
    expectedChosenSlot: result.trace.tie.chosenDecision.moveSlot,
    expectedChosenTarget: result.trace.tie.chosenDecision.targetBattler,
    expectedSubmissionRequestId: result.submission.requestId,
    expectedSubmissionSide: result.submission.side === "trainer" ? 1 : 0,
  });
}

function pushCanonicalError(label, view, request, rng) {
  let message = null;
  try {
    chooseFactoryAiMaskZeroDecision({ view, request, rng });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  if (message === null) {
    throw new Error(`gen-factory-ai-decision-policy-vectors: expected ${label} to throw`);
  }
  const row = requestRow(request);
  errorCases.push({
    label,
    factory: view.factory,
    moves: view.moves,
    ...row,
    rngValue: rng.value,
    rngCalls: rng.calls,
    expectedMessage: message,
  });
}

function pushTypedOnlyEmptyLegalError() {
  errorCases.push({
    label: "empty_legal_list_typed_only",
    factory: { ...DEFAULT_FACTORY },
    moves: [...DEFAULT_MOVES],
    requestKind: 0,
    requestId: 91,
    side: 1,
    battler: 1,
    legal: [],
    rngValue: 0,
    rngCalls: 0,
    // Exact chooser literal at factoryAiDecisionPolicy.ts:358. See header.
    expectedMessage: "Factory AI mask-0 policy requires at least one legal move",
  });
}

// === Current factoryAiDecisionPolicy.test.ts pure-chooser scenarios ========

pushSuccess(
  "ts_test_setup_four_draws_and_tie",
  makeView(),
  command({ legalDecisions: [move(1, 0), move(3, 1)] }),
  { value: 0x1234_5678, calls: 0 },
);
pushSuccess(
  "ts_test_single_best_slot_three_self_target",
  makeView(),
  command({ requestId: 74, legalDecisions: [move(3, 1)] }),
  { value: 0x1234_5678, calls: 0 },
);
// `normalizes caller input` and `does not retain mutable caller inputs` use
// the first case's same observable policy receipt; the typed Rust API has no
// JSON key ordering or mutable object retention surface to port.

// === All legal subsets / all winners / target variants =====================

for (let subset = 1; subset < 1 << MAX_SLOTS; subset += 1) {
  const legalDecisions = [];
  for (let slot = 0; slot < MAX_SLOTS; slot += 1) {
    if ((subset & (1 << slot)) !== 0) {
      legalDecisions.push(move(slot, (slot + subset) & 1));
    }
  }
  pushSuccess(
    `subset_${subset.toString(2).padStart(4, "0")}`,
    makeView(),
    command({ requestId: 100 + subset, legalDecisions }),
    { value: (0x65a5_0000 + subset * 0x1001) >>> 0, calls: subset * 3 + 1 },
  );
}

// === Fixed, broad deterministic seed/cursor sweep ==========================

let sweepState = 0x8bad_f00d;
function nextSweepWord() {
  // A fixed local LCG only chooses test inputs; policy outputs always come
  // from the canonical TS chooser above.
  sweepState = (Math.imul(sweepState, 1664525) + 1013904223) >>> 0;
  return sweepState;
}

for (let i = 0; i < 96; i += 1) {
  const subset = (nextSweepWord() % 15) + 1;
  const legalDecisions = [];
  for (let slot = 0; slot < MAX_SLOTS; slot += 1) {
    if ((subset & (1 << slot)) !== 0) {
      legalDecisions.push(move(slot, (nextSweepWord() >>> 31) & 1));
    }
  }
  pushSuccess(
    `seed_sweep_${i}`,
    makeView(),
    command({ requestId: 1000 + i, legalDecisions }),
    { value: nextSweepWord(), calls: 5 + i * 17 },
  );
}

// === Exact canonical error surface reachable through typed values ==========

const standardRequest = command({ requestId: 2000, legalDecisions: [move(1, 0)] });
const zeroRng = { value: 0, calls: 0 };

for (const [label, factory] of [
  ["open_level", { ...DEFAULT_FACTORY, levelMode: 1 }],
  ["tent", { ...DEFAULT_FACTORY, levelMode: 2 }],
  ["doubles", { ...DEFAULT_FACTORY, battleMode: 1 }],
  ["mask_one", { ...DEFAULT_FACTORY, factoryWinStreak: 14 }],
  ["mask_seven", { ...DEFAULT_FACTORY, factoryWinStreak: 28 }],
  ["frontier_brain", { ...DEFAULT_FACTORY, trainerOpponentId: 1022 }],
  ["level_mode_out_of_range", { ...DEFAULT_FACTORY, levelMode: 3 }],
  ["battle_mode_out_of_range", { ...DEFAULT_FACTORY, battleMode: 2 }],
  ["streak_out_of_range", { ...DEFAULT_FACTORY, factoryWinStreak: 65536 }],
  ["trainer_id_out_of_range", { ...DEFAULT_FACTORY, trainerOpponentId: 65536 }],
]) {
  pushCanonicalError(label, makeView({ factory }), standardRequest, zeroRng);
}

pushCanonicalError(
  "wrong_side_and_battler",
  makeView(),
  command({ requestId: 2001, side: "player", battler: 0, legalDecisions: [move(1, 1)] }),
  zeroRng,
);
pushCanonicalError(
  "forced_switch_request",
  makeView(),
  createBattleForcedSwitchRequest({
    kind: "forced-switch",
    requestId: 2002,
    side: "trainer",
    battler: 1,
    faintedPartyIndex: 0,
    legalPartyIndexes: [1],
  }),
  zeroRng,
);
pushCanonicalError(
  "switch_legal_decision",
  makeView(),
  command({ requestId: 2003, legalDecisions: [move(1, 0), { kind: "switch", partyIndex: 2 }] }),
  zeroRng,
);
for (const slot of [0, 1, 2, 3]) {
  pushCanonicalError(
    `duplicate_slot_${slot}`,
    makeView(),
    command({ requestId: 2010 + slot, legalDecisions: [move(slot, 0), move(slot, 1)] }),
    zeroRng,
  );
  const moves = [...DEFAULT_MOVES];
  moves[slot] = 0;
  pushCanonicalError(
    `move_none_slot_${slot}`,
    makeView({ moves }),
    command({ requestId: 2020 + slot, legalDecisions: [move(slot, 0)] }),
    zeroRng,
  );
}
pushTypedOnlyEmptyLegalError();

function bool(value) {
  return value ? "true" : "false";
}

function rustString(value) {
  return JSON.stringify(value);
}

function legalRows(rows) {
  const padded = paddedRows(rows, { kind: 0, moveSlot: 0, targetBattler: 0 });
  return `[${padded.map((row) => `PolicyLegalDecisionRow { kind: ${row.kind}, move_slot: ${row.moveSlot}, target_battler: ${row.targetBattler} }`).join(", ")}]`;
}

function evalRows(rows) {
  return `[${rows.map((row) => `PolicyEvaluationRow { branch: ${row.branch}, matched: ${bool(row.matched)} }`).join(", ")}]`;
}

function drawRows(rows) {
  return `[${rows.map((row) => `PolicyDrawRow { kind: ${row.kind}, ordinal: ${row.ordinal}, move_slot: ${row.moveSlot}, before_value: ${row.beforeValue}, before_calls: ${row.beforeCalls}, after_value: ${row.afterValue}, after_calls: ${row.afterCalls}, raw_rng_value: ${row.rawRngValue}, random_value: ${row.randomValue}, simulated_rng: ${row.simulatedRng} }`).join(", ")}]`;
}

function scoreRows(rows) {
  return `[${rows.map((row) => `PolicySlotScoreRow { move_slot: ${row.moveSlot}, move_id: ${row.moveId}, legal: ${bool(row.legal)}, initial_score: ${row.initialScore}, final_score: ${row.finalScore} }`).join(", ")}]`;
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-factory-ai-decision-policy-vectors.mjs.");
lines.push("// Regenerate: node core-rs/tools/gen-factory-ai-decision-policy-vectors.mjs.");
lines.push("// Source: executing canonical chooseFactoryAiMaskZeroDecision from");
lines.push("// src/engine/factoryAiDecisionPolicy.ts via node --experimental-strip-types.");
lines.push("// Deterministic fixed cases/sweep; do not hand-edit.");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PolicyLegalDecisionRow {");
lines.push("    pub kind: u8,");
lines.push("    pub move_slot: u8,");
lines.push("    pub target_battler: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PolicyEvaluationRow {");
lines.push("    pub branch: u8,");
lines.push("    pub matched: bool,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PolicyDrawRow {");
lines.push("    pub kind: u8,");
lines.push("    pub ordinal: u32,");
lines.push("    pub move_slot: u8,");
lines.push("    pub before_value: u32,");
lines.push("    pub before_calls: u32,");
lines.push("    pub after_value: u32,");
lines.push("    pub after_calls: u32,");
lines.push("    pub raw_rng_value: u32,");
lines.push("    pub random_value: u16,");
lines.push("    pub simulated_rng: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PolicySlotScoreRow {");
lines.push("    pub move_slot: u8,");
lines.push("    pub move_id: u16,");
lines.push("    pub legal: bool,");
lines.push("    pub initial_score: i32,");
lines.push("    pub final_score: i32,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct FactoryAiMaskZeroSuccessCase {");
lines.push("    pub level_mode: u8,");
lines.push("    pub battle_mode: u8,");
lines.push("    pub factory_win_streak: u32,");
lines.push("    pub trainer_opponent_id: u32,");
lines.push("    pub moves: [u16; 4],");
lines.push("    pub request_kind: u8,");
lines.push("    pub request_id: u32,");
lines.push("    pub side: u8,");
lines.push("    pub battler: u8,");
lines.push("    pub legal: [PolicyLegalDecisionRow; 4],");
lines.push("    pub legal_count: u8,");
lines.push("    pub rng_value: u32,");
lines.push("    pub rng_calls: u32,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_mask: u8,");
lines.push("    pub expected_branch: u8,");
lines.push("    pub expected_is_frontier_brain: bool,");
lines.push("    pub expected_has_challenge_number: bool,");
lines.push("    pub expected_challenge_number: u32,");
lines.push("    pub expected_evaluation_count: u8,");
lines.push("    pub expected_evaluations: [PolicyEvaluationRow; 4],");
lines.push("    pub expected_draws: [PolicyDrawRow; 5],");
lines.push("    pub expected_slots: [PolicySlotScoreRow; 4],");
lines.push("    pub expected_best_slots: [u8; 4],");
lines.push("    pub expected_best_slot_count: u8,");
lines.push("    pub expected_tie_modulus: u8,");
lines.push("    pub expected_tie_index: u8,");
lines.push("    pub expected_chosen_slot: u8,");
lines.push("    pub expected_chosen_target: u8,");
lines.push("    pub expected_submission_request_id: u32,");
lines.push("    pub expected_submission_side: u8,");
lines.push("}");
lines.push(`pub static FACTORY_AI_MASK_ZERO_SUCCESS_CASES: [FactoryAiMaskZeroSuccessCase; ${successCases.length}] = [`);
for (const c of successCases) {
  lines.push(`    // ${c.label}`);
  lines.push("    FactoryAiMaskZeroSuccessCase {");
  lines.push(`        level_mode: ${c.factory.levelMode}, battle_mode: ${c.factory.battleMode}, factory_win_streak: ${c.factory.factoryWinStreak}, trainer_opponent_id: ${c.factory.trainerOpponentId},`);
  lines.push(`        moves: [${c.moves.join(", ")}], request_kind: ${c.requestKind}, request_id: ${c.requestId}, side: ${c.side}, battler: ${c.battler},`);
  lines.push(`        legal: ${legalRows(c.legal)}, legal_count: ${c.legal.length}, rng_value: ${c.rngValue}, rng_calls: ${c.rngCalls},`);
  lines.push(`        expected_rng_value: ${c.expectedRngValue}, expected_rng_calls: ${c.expectedRngCalls}, expected_mask: ${c.expectedMask}, expected_branch: ${c.expectedBranch},`);
  lines.push(`        expected_is_frontier_brain: ${bool(c.expectedIsFrontierBrain)}, expected_has_challenge_number: ${bool(c.expectedHasChallengeNumber)}, expected_challenge_number: ${c.expectedChallengeNumber},`);
  lines.push(`        expected_evaluation_count: ${c.expectedEvaluationCount}, expected_evaluations: ${evalRows(c.expectedEvaluations)},`);
  lines.push(`        expected_draws: ${drawRows(c.expectedDraws)},`);
  lines.push(`        expected_slots: ${scoreRows(c.expectedSlots)},`);
  lines.push(`        expected_best_slots: [${c.expectedBestSlots.join(", ")}], expected_best_slot_count: ${c.expectedBestSlotCount}, expected_tie_modulus: ${c.expectedTieModulus}, expected_tie_index: ${c.expectedTieIndex},`);
  lines.push(`        expected_chosen_slot: ${c.expectedChosenSlot}, expected_chosen_target: ${c.expectedChosenTarget}, expected_submission_request_id: ${c.expectedSubmissionRequestId}, expected_submission_side: ${c.expectedSubmissionSide},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct FactoryAiMaskZeroErrorCase {");
lines.push("    pub level_mode: u8,");
lines.push("    pub battle_mode: u8,");
lines.push("    pub factory_win_streak: u32,");
lines.push("    pub trainer_opponent_id: u32,");
lines.push("    pub moves: [u16; 4],");
lines.push("    pub request_kind: u8,");
lines.push("    pub request_id: u32,");
lines.push("    pub side: u8,");
lines.push("    pub battler: u8,");
lines.push("    pub legal: [PolicyLegalDecisionRow; 4],");
lines.push("    pub legal_count: u8,");
lines.push("    pub rng_value: u32,");
lines.push("    pub rng_calls: u32,");
lines.push("    pub expected_message: &'static str,");
lines.push("}");
lines.push(`pub static FACTORY_AI_MASK_ZERO_ERROR_CASES: [FactoryAiMaskZeroErrorCase; ${errorCases.length}] = [`);
for (const c of errorCases) {
  lines.push(`    // ${c.label}`);
  lines.push("    FactoryAiMaskZeroErrorCase {");
  lines.push(`        level_mode: ${c.factory.levelMode}, battle_mode: ${c.factory.battleMode}, factory_win_streak: ${c.factory.factoryWinStreak}, trainer_opponent_id: ${c.factory.trainerOpponentId},`);
  lines.push(`        moves: [${c.moves.join(", ")}], request_kind: ${c.requestKind}, request_id: ${c.requestId}, side: ${c.side}, battler: ${c.battler},`);
  lines.push(`        legal: ${legalRows(c.legal)}, legal_count: ${c.legal.length}, rng_value: ${c.rngValue}, rng_calls: ${c.rngCalls},`);
  lines.push(`        expected_message: ${rustString(c.expectedMessage)},`);
  lines.push("    },");
}
lines.push("];");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

const rustfmtCandidates = [
  "/Users/kyle/.rustup/toolchains/stable-aarch64-apple-darwin/bin/rustfmt",
  "rustfmt",
];
let formatted = false;
for (const rustfmt of rustfmtCandidates) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) {
  throw new Error("gen-factory-ai-decision-policy-vectors: could not find rustfmt");
}

console.log(`gen-factory-ai-decision-policy-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(
  `gen-factory-ai-decision-policy-vectors: ${successCases.length} success cases, ${errorCases.length} error cases`,
);
