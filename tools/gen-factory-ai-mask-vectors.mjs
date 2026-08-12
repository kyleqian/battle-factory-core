#!/usr/bin/env node
// Codegen for core-rs/crates/factory-core/src/factory_ai_mask_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiMaskSelection.ts (read-only import, node
// --experimental-strip-types — the gen-turn-vectors.mjs precedent). No value
// in the emitted file is hand-computed. Deterministic: a fixed directed
// case list plus a fixed nested-loop sweep, no Math.random/Date.now, so
// reruns are byte-identical.
//
// Success cases record enough of the receipt (mask, branch, challenge
// number, evaluation count, is-frontier-brain) to pin selection + branch
// short-circuit order without hand-transcribing the full evaluations array.
// Error cases record only which field the Rust `FactoryAiMaskError` variant
// should name — TS's exact RangeError message text is not compared (error
// PRESENCE and site, not text — the M3b error-parity precedent). Only
// error-triggering values representable by the Rust port's u8/u32 input
// types are included (see factory_ai_mask.rs's "Error surface" doc comment
// for why TS's negative/non-integer/NaN/Infinity cases are out of scope).
//
// Usage: node core-rs/tools/gen-factory-ai-mask-vectors.mjs   (from any cwd)

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // core-rs/tools
const workspaceRoot = path.resolve(scriptDir, "..", ".."); // two dirs up
const outPath = path.join(
  scriptDir,
  "..",
  "crates",
  "factory-core",
  "src",
  "factory_ai_mask_vectors_gen.rs",
);

const mod = await import(path.join(workspaceRoot, "src", "engine", "factoryAiMaskSelection.ts"));
const { selectFactoryAiMask, FACTORY_LEVEL_MODE_TENT, TRAINER_FRONTIER_BRAIN } = mod;

const BRANCH_ORDER = ["tent", "frontierBrain", "challengeBelow2", "challengeBelow4", "challengeAtLeast4"];
function branchIndex(id) {
  const index = BRANCH_ORDER.indexOf(id);
  if (index === -1) throw new Error(`gen-factory-ai-mask-vectors: unknown branch id ${id}`);
  return index;
}

const successCases = [];
const errorCases = [];

function pushSuccess(levelMode, battleMode, factoryWinStreak, trainerOpponentId, label) {
  const result = selectFactoryAiMask({ levelMode, battleMode, factoryWinStreak, trainerOpponentId });
  successCases.push({
    levelMode,
    battleMode,
    factoryWinStreak,
    trainerOpponentId,
    label,
    mask: result.mask,
    isFrontierBrain: result.receipt.inputs.isFrontierBrain,
    hasChallengeNumber: result.receipt.challengeNumber !== null,
    challengeNumber: result.receipt.challengeNumber ?? 0,
    evaluationCount: result.receipt.evaluations.length,
    branch: branchIndex(result.receipt.branch.id),
  });
}

function pushError(levelMode, battleMode, factoryWinStreak, trainerOpponentId, expectedField, label) {
  let threw = false;
  try {
    selectFactoryAiMask({ levelMode, battleMode, factoryWinStreak, trainerOpponentId });
  } catch (e) {
    threw = e instanceof RangeError;
  }
  if (!threw) {
    throw new Error(`gen-factory-ai-mask-vectors: expected a RangeError for case ${label}, got none`);
  }
  errorCases.push({ levelMode, battleMode, factoryWinStreak, trainerOpponentId, expectedField, label });
}

// === directed cases carried over from tests/factoryAiMaskSelection.test.ts (READ-ONLY) ===

const ORDINARY_TRAINER = 299;

// :26-42 Tent precedence, no indexed challenge.
pushSuccess(FACTORY_LEVEL_MODE_TENT, 0, 0xffff, TRAINER_FRONTIER_BRAIN, "ts_test_26_tent_precedence");
// :44-54 Frontier Brain precedence over every ordinary challenge band.
for (const streak of [0, 7, 14, 21, 28, 0xffff]) {
  pushSuccess(0, 0, streak, TRAINER_FRONTIER_BRAIN, `ts_test_44_frontier_brain_streak_${streak}`);
}
// :56-78 streak -> challenge -> mask boundary table.
for (const streak of [0, 6, 7, 13, 14, 20, 21, 27, 28, 0xffff]) {
  pushSuccess(0, 0, streak, ORDINARY_TRAINER, `ts_test_56_boundary_streak_${streak}`);
}
// :100-107 same bands across level modes 50/Open.
for (const levelMode of [0, 1]) {
  for (const streak of [0, 14, 28]) {
    pushSuccess(levelMode, 0, streak, ORDINARY_TRAINER, `ts_test_100_levelmode_${levelMode}_streak_${streak}`);
  }
}
// :109-116 battle-mode index does not affect selection.
for (const battleMode of [0, 1]) {
  pushSuccess(0, battleMode, 14, ORDINARY_TRAINER, `ts_test_109_battlemode_${battleMode}`);
}

// === full input-space product sweep (small — see the M5a step brief) ===
// levelMode x battleMode x boundary trainerIds (incl. TRAINER_FRONTIER_BRAIN)
// x winStreak boundaries per the policy branches (streak/7 = challengeNum;
// branches change at challengeNum 2 and 4, i.e. streak 14 and 28).

const LEVEL_MODES = [0, 1, 2];
const BATTLE_MODES = [0, 1];
const TRAINER_IDS = [0, 1, ORDINARY_TRAINER, 1021, TRAINER_FRONTIER_BRAIN, 1023, 0xffff];
const WIN_STREAKS = [0, 1, 6, 7, 13, 14, 20, 21, 27, 28, 35, 0xffff];

for (const levelMode of LEVEL_MODES) {
  for (const battleMode of BATTLE_MODES) {
    for (const trainerOpponentId of TRAINER_IDS) {
      for (const factoryWinStreak of WIN_STREAKS) {
        pushSuccess(
          levelMode,
          battleMode,
          factoryWinStreak,
          trainerOpponentId,
          `sweep_lvl${levelMode}_bm${battleMode}_trainer${trainerOpponentId}_streak${factoryWinStreak}`,
        );
      }
    }
  }
}

// === directed error cases (tests/factoryAiMaskSelection.test.ts:118-126) ===
// field indices match FactoryAiMaskError's declaration order in
// factory_ai_mask.rs: 0 levelMode, 1 battleMode, 2 factoryWinStreak,
// 3 trainerOpponentId.

pushError(3, 0, 0, ORDINARY_TRAINER, 0, "level_mode_just_above_max");
pushError(255, 0, 0, ORDINARY_TRAINER, 0, "level_mode_far_above_max");
pushError(0, 2, 0, ORDINARY_TRAINER, 1, "battle_mode_just_above_max");
pushError(0, 255, 0, ORDINARY_TRAINER, 1, "battle_mode_far_above_max");
pushError(0, 0, 0x1_0000, ORDINARY_TRAINER, 2, "factory_win_streak_just_above_max");
pushError(0, 0, 0xffff_ffff, ORDINARY_TRAINER, 2, "factory_win_streak_far_above_max");
pushError(0, 0, 0, 0x1_0000, 3, "trainer_opponent_id_just_above_max");
pushError(0, 0, 0, 0xffff_ffff, 3, "trainer_opponent_id_far_above_max");

// === emit Rust source ===

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-factory-ai-mask-vectors.mjs — regenerate: node core-rs/tools/gen-factory-ai-mask-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiMaskSelection.ts (the TS engine is the");
lines.push("// spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One `select_factory_ai_mask` success case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct FactoryAiMaskSuccessCase {");
lines.push("    pub level_mode: u8,");
lines.push("    pub battle_mode: u8,");
lines.push("    pub factory_win_streak: u32,");
lines.push("    pub trainer_opponent_id: u32,");
lines.push("    pub expected_mask: u8,");
lines.push("    pub expected_is_frontier_brain: bool,");
lines.push("    pub expected_has_challenge_number: bool,");
lines.push("    pub expected_challenge_number: u32,");
lines.push("    pub expected_evaluation_count: u8,");
lines.push("    pub expected_branch: u8,");
lines.push("}");
lines.push(`pub static FACTORY_AI_MASK_SUCCESS_CASES: [FactoryAiMaskSuccessCase; ${successCases.length}] = [`);
for (const c of successCases) {
  lines.push(
    `    // ${c.label}\n    FactoryAiMaskSuccessCase { level_mode: ${c.levelMode}, battle_mode: ${c.battleMode}, factory_win_streak: ${c.factoryWinStreak}, trainer_opponent_id: ${c.trainerOpponentId}, expected_mask: ${c.mask}, expected_is_frontier_brain: ${c.isFrontierBrain}, expected_has_challenge_number: ${c.hasChallengeNumber}, expected_challenge_number: ${c.challengeNumber}, expected_evaluation_count: ${c.evaluationCount}, expected_branch: ${c.branch} },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `select_factory_ai_mask` error case: `expected_field` is");
lines.push("/// `FactoryAiMaskError`'s declaration-order index (0 levelMode, 1");
lines.push("/// battleMode, 2 factoryWinStreak, 3 trainerOpponentId) — error PRESENCE");
lines.push("/// and site are pinned, not TS's exact RangeError message text.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct FactoryAiMaskErrorCase {");
lines.push("    pub level_mode: u8,");
lines.push("    pub battle_mode: u8,");
lines.push("    pub factory_win_streak: u32,");
lines.push("    pub trainer_opponent_id: u32,");
lines.push("    pub expected_field: u8,");
lines.push("}");
lines.push(`pub static FACTORY_AI_MASK_ERROR_CASES: [FactoryAiMaskErrorCase; ${errorCases.length}] = [`);
for (const c of errorCases) {
  lines.push(
    `    // ${c.label}\n    FactoryAiMaskErrorCase { level_mode: ${c.levelMode}, battle_mode: ${c.battleMode}, factory_win_streak: ${c.factoryWinStreak}, trainer_opponent_id: ${c.trainerOpponentId}, expected_field: ${c.expectedField} },`,
  );
}
lines.push("];");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
const rustfmtCandidates = [path.join(rustupBin, "rustfmt"), "rustfmt"];
let formatted = false;
for (const rustfmt of rustfmtCandidates) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}
if (!formatted) {
  throw new Error("gen-factory-ai-mask-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-factory-ai-mask-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(
  `gen-factory-ai-mask-vectors: ${successCases.length} success cases, ${errorCases.length} error cases`,
);
