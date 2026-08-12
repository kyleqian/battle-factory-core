#!/usr/bin/env node
// Codegen for
// core-rs/crates/factory-core/src/factory_ai_check_viability_shell_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckViability.ts's `runCheckViability` (read-only
// import, node --experimental-strip-types — the gen-cbm-preamble-vectors.mjs
// precedent). No value in the emitted file is hand-computed. Deterministic:
// a fixed directed case list plus a small fixed-stride sweep over the move
// corpus, not Math.random/Date.now, so reruns are byte-identical.
//
// Scope: M5d-0 only (docs/rust-m5d-checkviability-batching.md §5) — the
// dispatcher SHELL (move lookup + funcResultCarry passthrough + the
// trailing table-effect barrier/fallthrough), zero effect handlers. Every
// case here uses a move whose effect is OUTSIDE the 122-entry
// `AI_CHECK_VIABILITY_TABLE_EFFECTS` set: the real, imported
// src/engine/factoryAiCheckViability.ts is 122/122 dispatch-complete
// (docs/rust-m5d-checkviability-batching.md's scout §0, verified live
// below), so a table-effect move reaching `runCheckViability` invokes that
// move's real `AI_CV_*` handler — logic this Rust step has not ported.
// There is no way to TS-generate a vector for the Rust port's own
// `NotYetPorted` barrier at this step (a still-open effect only exists on
// the Rust side); that barrier is native-hand-test-only in
// factory_ai_check_viability.rs, exactly mirroring
// gen-cbm-preamble-vectors.mjs's own documented reasoning for CBM.
//
// Usage: node core-rs/tools/gen-cv-shell-vectors.mjs   (from any cwd)

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
  "factory_ai_check_viability_shell_vectors_gen.rs",
);

const cv = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckViability.ts"));
const { runCheckViability, AI_CHECK_VIABILITY_TABLE_EFFECTS } = cv;
const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { MOVES_BY_ID } = cbm;

// Verify live (not from doc prose) that TS really is 122/122 table-complete
// -- the premise this generator relies on to justify excluding table-effect
// moves entirely (same style as gen-cbm-preamble-vectors.mjs's own premise
// check).
if (AI_CHECK_VIABILITY_TABLE_EFFECTS.size !== 122) {
  throw new Error(
    `gen-cv-shell-vectors: expected AI_CHECK_VIABILITY_TABLE_EFFECTS to have 122 entries, found ${AI_CHECK_VIABILITY_TABLE_EFFECTS.size} ` +
      "(this script's whole premise for excluding table-effect moves)",
  );
}

const NEUTRAL_BATTLER = Object.freeze({
  speed: 100,
  speedStage: 6,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"],
  isFirstTurn: 0,
  evasionStage: 6,
  accStage: 6,
  atkStage: 6,
  defStage: 6,
  spDefStage: 6,
  hp: 100,
  maxHp: 100,
});

const AI_WEATHER_VALUES = [undefined, 0, 1, 2, 3]; // undefined + the 4 AiWeatherValue ids

const scoredCases = [];

function pushCase(label, moveId, rngValue, fallback) {
  const move = MOVES_BY_ID.get(moveId);
  if (!move) throw new Error(`gen-cv-shell-vectors: unknown move ${moveId}`);
  if (AI_CHECK_VIABILITY_TABLE_EFFECTS.has(move.effect)) {
    throw new Error(`gen-cv-shell-vectors: case ${label} move ${moveId} has table effect ${move.effect}`);
  }
  const result = runCheckViability({
    rng: { value: rngValue, calls: 0 },
    moveId,
    attacker: NEUTRAL_BATTLER,
    target: NEUTRAL_BATTLER,
    staleFuncResultFallback: fallback,
    drawOrdinalStart: 1,
    reasonPrefix: "vec",
  });
  if (result.kind !== "scored") {
    throw new Error(`gen-cv-shell-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length !== 0) {
    throw new Error(`gen-cv-shell-vectors: case ${label} produced ${result.draws.length} draws, expected 0`);
  }
  scoredCases.push({
    label,
    moveId,
    rngValue,
    hasFallback: fallback !== undefined,
    fallbackValue: fallback ?? 0,
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedScoreDelta: result.scoreDelta,
    hasFuncResultAfter: result.funcResultAfter !== undefined,
    funcResultAfterValue: result.funcResultAfter ?? 0,
  });
}

// === directed cases (tests/factoryAiCheckViability.test.ts:207-217's own
// no-table-entry move list) ===

const DIRECTED_MOVES = [
  ["surf", 57], // EFFECT_HIT
  ["rock_slide", 157], // EFFECT_FLINCH_HIT
  ["body_slam", 34], // EFFECT_PARALYZE_HIT
  ["thunderbolt", 85], // EFFECT_PARALYZE_HIT
];
for (const [label, moveId] of DIRECTED_MOVES) {
  for (const fallback of AI_WEATHER_VALUES) {
    pushCase(`ts_test_213_${label}_fallback${fallback ?? "none"}`, moveId, 12345, fallback);
  }
}

// === small fixed-stride sweep over the move corpus, non-table-effect moves
// only -- exercises the shell across a broad, deterministic sample of real
// moves/effects without hand-picking each one. ===

let sweepCount = 0;
for (let moveId = 1; moveId <= 354; moveId += 11) {
  const move = MOVES_BY_ID.get(moveId);
  if (!move || AI_CHECK_VIABILITY_TABLE_EFFECTS.has(move.effect)) continue;
  const fallback = AI_WEATHER_VALUES[moveId % AI_WEATHER_VALUES.length];
  pushCase(`sweep_move${moveId}`, moveId, 1_000_000 + moveId * 37, fallback);
  sweepCount += 1;
}

// === emit Rust source ========================================================

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-cv-shell-vectors.mjs — regenerate: node core-rs/tools/gen-cv-shell-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckViability.ts's runCheckViability");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One `run_check_viability` case that reached `CheckViabilityResult::Scored`");
lines.push("/// via the dispatcher shell's own fallthrough (non-table-effect move).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CvShellScoredCase {");
lines.push("    pub move_id: u16,");
lines.push("    pub rng_value: u32,");
lines.push("    pub fallback: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_score_delta: i32,");
lines.push("    pub expected_func_result_after: Option<u8>,");
lines.push("}");
lines.push(`pub static CV_SHELL_SCORED_CASES: [CvShellScoredCase; ${scoredCases.length}] = [`);
for (const c of scoredCases) {
  const fallback = c.hasFallback ? `Some(${c.fallbackValue})` : "None";
  const funcResultAfter = c.hasFuncResultAfter ? `Some(${c.funcResultAfterValue})` : "None";
  lines.push(
    `    // ${c.label}\n    CvShellScoredCase { move_id: ${c.moveId}, rng_value: ${c.rngValue}, fallback: ${fallback}, expected_rng_value: ${c.expectedRngValue}, expected_rng_calls: ${c.expectedRngCalls}, expected_score_delta: ${c.expectedScoreDelta}, expected_func_result_after: ${funcResultAfter} },`,
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
  throw new Error("gen-cv-shell-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cv-shell-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-cv-shell-vectors: ${scoredCases.length} scored cases (${sweepCount} from the sweep)`);
