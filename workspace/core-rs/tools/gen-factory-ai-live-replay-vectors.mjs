#!/usr/bin/env node
// Differential corpus for the private Factory-AI live-driver replay loop.
//
// Expected final cursors and error messages come from temporarily exposing
// (without editing) `replayAiDraws` in the canonical TypeScript module, then
// invoking that exact function against a source-shaped BattleDecisionRng.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-factory-ai-live-replay-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const canonicalDriverPath = path.join(
  workspaceRoot,
  "src",
  "engine",
  "factoryAiLiveDriver.ts",
);
const outPath = path.join(
  scriptDir,
  "..",
  "crates",
  "factory-core",
  "src",
  "factory_ai_live_replay_vectors_gen.rs",
);

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-factory-ai-live-replay-vectors: ${message}`);
}

/**
 * Reads the canonical module, changes only the private helper's declaration
 * in a freshly allocated scratch copy, and imports that copy.  Rewriting
 * relative imports to absolute file URLs lets the copy live outside `src/`;
 * the canonical file is never changed.  The scratch directory is deliberately
 * fresh for each generation run and left to the OS temp policy rather than
 * reusing or recursively removing a directory.
 */
async function loadCanonicalPrivateReplay() {
  const source = fs.readFileSync(canonicalDriverPath, "utf8");
  const needle = "function replayAiDraws<RulesState extends FactoryAiLiveRules>(";
  const occurrences = source.split(needle).length - 1;
  assert(
    occurrences === 1,
    `expected exactly one private replayAiDraws declaration, found ${occurrences}`,
  );
  const canonicalUrl = pathToFileURL(canonicalDriverPath);
  const exposed = source
    .replace(needle, `export ${needle}`)
    .replace(/from "(\.[^"]+)"/g, (_whole, specifier) =>
      `from ${JSON.stringify(new URL(specifier, canonicalUrl).href)}`);
  const scratchDir = execFileSync(
    "mktemp",
    ["-d", path.join(os.tmpdir(), "factory-ai-live-replay-vectors-XXXXXX")],
    { encoding: "utf8" },
  ).trim();
  assert(scratchDir.length > 0, "mktemp -d did not return a scratch directory");
  const exposedPath = path.join(scratchDir, "factoryAiLiveDriver.exposed.ts");
  fs.writeFileSync(exposedPath, exposed, "utf8");
  const module = await import(pathToFileURL(exposedPath).href);
  assert(
    typeof module.replayAiDraws === "function",
    "temporary canonical module did not expose replayAiDraws",
  );
  return module.replayAiDraws;
}

const canonicalRng = await import(
  pathToFileURL(path.join(workspaceRoot, "src", "engine", "rng.ts")).href,
);
const canonicalBoundary = await import(
  pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleDecisionBoundary.ts",
  )).href,
);
const replayAiDraws = await loadCanonicalPrivateReplay();

function state(value, calls) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff,
    `RNG value must be a u32, got ${value}`,
  );
  assert(
    Number.isSafeInteger(calls) && calls >= 0 && calls <= MAX_SAFE_INTEGER,
    `RNG calls must be a safe non-negative integer, got ${calls}`,
  );
  return Object.freeze({ value, calls });
}

function cloneState(value) {
  return state(value.value, value.calls);
}

function cloneDraws(draws) {
  return draws.map((draw) => ({
    ordinal: draw.ordinal,
    reason: draw.reason,
    before: cloneState(draw.before),
    after: cloneState(draw.after),
    randomValue: draw.randomValue,
  }));
}

/** Builds source-shaped recorded receipts through canonical rng.ts. */
function recordedChain(initial, entries) {
  let cursor = cloneState(initial);
  return entries.map(({ ordinal, reason }) => {
    assert(
      Number.isInteger(ordinal) && ordinal >= 0 && ordinal <= 0xffff_ffff,
      `ordinal must be a u32 source-produced array index, got ${ordinal}`,
    );
    assert(typeof reason === "string" && reason.length > 0, "draw reason must be non-empty");
    const before = cursor;
    const value = canonicalRng.advanceRngValue(before.value);
    // A policy can predict this value at MAX_SAFE_INTEGER, but the canonical
    // boundary draw itself rejects it before mutation; the overflow vector
    // below deliberately exercises that distinction.
    cursor = Object.freeze({ value, calls: before.calls + 1 });
    return Object.freeze({
      ordinal,
      reason,
      before,
      after: cursor,
      randomValue: (value >>> 16) & 0xffff,
    });
  });
}

/**
 * Executes the canonical private helper inside the actual canonical
 * `submitBattleDecision` boundary.  The wrapper reducer is intentionally
 * inert: this corpus is only the helper's replay prefix and its final cursor.
 * This makes every expected final state and error—including the boundary's
 * call-counter overflow—come from executed canonical TypeScript rather than
 * an imitation context in this generator.
 */
function runCanonicalReplay(initial, draws) {
  try {
    const decision = Object.freeze({
      kind: "use-move",
      moveSlot: 0,
      targetBattler: 0,
    });
    const request = canonicalBoundary.createBattleCommandRequest(Object.freeze({
      kind: "command",
      requestId: 0,
      side: "trainer",
      battler: 1,
      legalDecisions: Object.freeze([decision]),
    }));
    const state = canonicalBoundary.createBattleState(Object.freeze({
      rules: Object.freeze({}),
      rngSeed: initial.value,
      rngCalls: initial.calls,
      request,
    }));
    const reducer = replayAiDraws(draws, (context) => Object.freeze({
      rules: context.rules,
      events: Object.freeze([]),
      boundary: Object.freeze({ kind: "terminal", outcome: "trainer-win" }),
    }));
    const transition = canonicalBoundary.submitBattleDecision(
      state,
      Object.freeze({ requestId: 0, side: "trainer", decision }),
      reducer,
    );
    return Object.freeze({ kind: "final", rng: cloneState(transition.state.rng) });
  } catch (error) {
    return Object.freeze({
      kind: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

const cases = [];
const labels = new Set();
function addCase({ label, category, initial, draws }) {
  assert(/^[a-z0-9_]+$/.test(label) && !labels.has(label), `invalid or duplicate label ${label}`);
  assert(typeof category === "string" && category.length > 0, `invalid category for ${label}`);
  assert(Array.isArray(draws), `draws for ${label} must be an array`);
  labels.add(label);
  const normalizedDraws = cloneDraws(draws);
  const expected = runCanonicalReplay(initial, normalizedDraws);
  cases.push(Object.freeze({
    label,
    category,
    initial: cloneState(initial),
    draws: normalizedDraws,
    expected,
  }));
}

addCase({
  label: "empty_receipts",
  category: "empty",
  initial: state(0x0bad_c0de, 0),
  draws: [],
});

addCase({
  label: "one_switch_style_draw",
  category: "single-draw",
  initial: state(0x1234_5678, 0),
  draws: recordedChain(state(0x1234_5678, 0), [
    { ordinal: 0, reason: "wonder-guard-party-1-move-3" },
  ]),
});

addCase({
  label: "mixed_switch_and_move_style_reasons",
  category: "mixed-reasons",
  initial: state(0x1357_9bdf, 4),
  draws: recordedChain(state(0x1357_9bdf, 4), [
    { ordinal: 0, reason: "absorber-party-1" },
    { ordinal: 1, reason: "slot-2-check-bad-move-negates-type" },
    { ordinal: 2, reason: "best-move-tie-selection" },
  ]),
});

addCase({
  label: "multi_draw_chain",
  category: "multi-draw-chain",
  initial: state(0x2468_ace0, 0),
  draws: recordedChain(state(0x2468_ace0, 0), [
    { ordinal: 0, reason: "setup-simulated-rng-slot-0" },
    { ordinal: 1, reason: "setup-simulated-rng-slot-1" },
    { ordinal: 2, reason: "setup-simulated-rng-slot-2" },
    { ordinal: 3, reason: "setup-simulated-rng-slot-3" },
    { ordinal: 4, reason: "best-move-tie-selection" },
  ]),
});

addCase({
  label: "nonzero_starting_calls",
  category: "nonzero-calls",
  initial: state(0xfeed_face, 73),
  draws: recordedChain(state(0xfeed_face, 73), [
    { ordinal: 12, reason: "slot-0-check-viability-toxic-roll-1" },
    { ordinal: 13, reason: "slot-0-check-viability-toxic-roll-2" },
  ]),
});

addCase({
  label: "calls_past_u32_remain_exact",
  category: "nonzero-calls",
  initial: state(0x1020_3040, 0xffff_ffff),
  draws: recordedChain(state(0x1020_3040, 0xffff_ffff), [
    { ordinal: 7, reason: "wide-call-counter-probe" },
  ]),
});

addCase({
  label: "u32_raw_rng_wrap",
  category: "u32-wrap",
  initial: state(0xffff_ffff, 11),
  draws: recordedChain(state(0xffff_ffff, 11), [
    { ordinal: 0, reason: "wrap-boundary-probe" },
  ]),
});

{
  const initial = state(0x3141_5926, 3);
  const draws = cloneDraws(recordedChain(initial, [
    { ordinal: 4, reason: "before-value-first" },
    { ordinal: 5, reason: "before-value-middle" },
    { ordinal: 6, reason: "before-value-late" },
    { ordinal: 7, reason: "before-value-last" },
  ]));
  draws[0].before = state((draws[0].before.value ^ 0x100) >>> 0, draws[0].before.calls);
  addCase({ label: "before_value_mismatch_first", category: "before-checkpoint", initial, draws });
}
{
  const initial = state(0x3141_5926, 3);
  const draws = cloneDraws(recordedChain(initial, [
    { ordinal: 4, reason: "before-calls-first" },
    { ordinal: 5, reason: "before-calls-middle" },
    { ordinal: 6, reason: "before-calls-late" },
    { ordinal: 7, reason: "before-calls-last" },
  ]));
  draws[1].before = state(draws[1].before.value, draws[1].before.calls + 1);
  addCase({ label: "before_calls_mismatch_middle", category: "before-checkpoint", initial, draws });
}
{
  const initial = state(0x3141_5926, 3);
  const draws = cloneDraws(recordedChain(initial, [
    { ordinal: 4, reason: "before-value-first" },
    { ordinal: 5, reason: "before-value-middle" },
    { ordinal: 6, reason: "before-value-late" },
    { ordinal: 7, reason: "before-value-last" },
  ]));
  draws[2].before = state((draws[2].before.value ^ 1) >>> 0, draws[2].before.calls);
  addCase({ label: "before_value_mismatch_late", category: "before-checkpoint", initial, draws });
}
{
  const initial = state(0x3141_5926, 3);
  const draws = cloneDraws(recordedChain(initial, [
    { ordinal: 4, reason: "before-calls-first" },
    { ordinal: 5, reason: "before-calls-middle" },
    { ordinal: 6, reason: "before-calls-late" },
    { ordinal: 7, reason: "before-calls-last" },
  ]));
  draws[3].before = state(draws[3].before.value, draws[3].before.calls + 1);
  addCase({ label: "before_calls_mismatch_last", category: "before-checkpoint", initial, draws });
}

{
  const initial = state(0x0f0f_f0f0, 5);
  const draws = cloneDraws(recordedChain(initial, [
    { ordinal: 2, reason: "random-value-mismatch" },
  ]));
  draws[0].randomValue = (draws[0].randomValue + 1) & 0xffff;
  addCase({ label: "random_value_mismatch", category: "random-value", initial, draws });
}

{
  const initial = state(0x0f0f_f0f0, 5);
  const draws = cloneDraws(recordedChain(initial, [
    { ordinal: 8, reason: "after-value-first" },
    { ordinal: 9, reason: "after-value-second" },
  ]));
  draws[1].after = state((draws[1].after.value ^ 0x1000) >>> 0, draws[1].after.calls);
  addCase({ label: "after_value_mismatch", category: "after-checkpoint", initial, draws });
}
{
  const initial = state(0x0f0f_f0f0, 5);
  const draws = cloneDraws(recordedChain(initial, [
    { ordinal: 8, reason: "after-calls-first" },
    { ordinal: 9, reason: "after-calls-second" },
    { ordinal: 10, reason: "after-calls-third" },
  ]));
  draws[2].after = state(draws[2].after.value, draws[2].after.calls + 1);
  addCase({ label: "after_calls_mismatch", category: "after-checkpoint", initial, draws });
}

addCase({
  label: "nonmonotonic_ordinals_follow_array_order",
  category: "ordering-ordinal",
  initial: state(0x5555_aaaa, 1),
  draws: recordedChain(state(0x5555_aaaa, 1), [
    { ordinal: 99, reason: "ordinal-diagnostic-first" },
    { ordinal: 3, reason: "ordinal-diagnostic-second" },
    { ordinal: 99, reason: "ordinal-diagnostic-third" },
  ]),
});
{
  const initial = state(0x5555_aaaa, 1);
  const chain = recordedChain(initial, [
    { ordinal: 7, reason: "ordered-first" },
    { ordinal: 2, reason: "ordered-second" },
  ]);
  addCase({
    label: "out_of_order_records_diverge_at_array_index",
    category: "ordering-ordinal",
    initial,
    draws: [chain[1], chain[0]],
  });
}

addCase({
  label: "call_counter_overflow_from_boundary",
  category: "call-counter-overflow",
  initial: state(0x1234_5678, MAX_SAFE_INTEGER),
  // The boundary throws before `replayAiDraws` can inspect an after snapshot,
  // so this unreachable-after receipt stays within the validated state domain.
  draws: [Object.freeze({
    ordinal: 41,
    reason: "overflow-boundary-probe",
    before: state(0x1234_5678, MAX_SAFE_INTEGER),
    after: state(0x1234_5678, MAX_SAFE_INTEGER),
    randomValue: 0,
  })],
});

assert(cases.length === 17, `expected 17 cases, got ${cases.length}`);
const expectedCategoryCounts = new Map();
for (const vector of cases) {
  expectedCategoryCounts.set(
    vector.category,
    (expectedCategoryCounts.get(vector.category) ?? 0) + 1,
  );
}

function rustString(value) {
  assert(/^[\x20-\x7e]*$/.test(value), `non-ASCII Rust string needs an explicit encoder: ${JSON.stringify(value)}`);
  return JSON.stringify(value);
}

function rustU32(value) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff, `not a u32: ${value}`);
  return `${value}`;
}

function rustU64(value) {
  assert(Number.isSafeInteger(value) && value >= 0, `not an exact u64-safe source number: ${value}`);
  return `${value}`;
}

function rustU16(value) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff, `not a u16: ${value}`);
  return `${value}`;
}

function rustState(value) {
  return `FactoryAiLiveReplayBattleRngState { value: ${rustU32(value.value)}, calls: ${rustU64(value.calls)} }`;
}

function rustDraw(draw) {
  return `FactoryAiLiveReplayVectorDraw {
            ordinal: ${rustU32(draw.ordinal)},
            reason: ${rustString(draw.reason)},
            before: ${rustState(draw.before)},
            after: ${rustState(draw.after)},
            random_value: ${rustU16(draw.randomValue)},
        }`;
}

function rustExpected(expected) {
  if (expected.kind === "final") {
    return `FactoryAiLiveReplayExpected::Final(${rustState(expected.rng)})`;
  }
  assert(expected.kind === "error", `unknown expected kind ${expected.kind}`);
  return `FactoryAiLiveReplayExpected::Error(${rustString(expected.message)})`;
}

const categoryLines = [...expectedCategoryCounts]
  .map(([category, count]) => `    (${rustString(category)}, ${count}),`)
  .join("\n");
const caseLines = cases.map((vector) => `    FactoryAiLiveReplayVectorCase {
        label: ${rustString(vector.label)},
        category: ${rustString(vector.category)},
        initial_rng: ${rustState(vector.initial)},
        draws: &[
${vector.draws.map((draw) => `            ${rustDraw(draw)},`).join("\n")}
        ],
        expected: ${rustExpected(vector.expected)},
    },`).join("\n");

const rust = `// GENERATED by core-rs/tools/gen-factory-ai-live-replay-vectors.mjs.
// Expected values/errors come only from executing the temporarily exposed
// private replayAiDraws in src/engine/factoryAiLiveDriver.ts.
// Regenerate: node --experimental-strip-types core-rs/tools/gen-factory-ai-live-replay-vectors.mjs
// Deterministic fixed corpus; do not hand-edit.

use crate::factory_ai_live_replay::FactoryAiLiveReplayBattleRngState;

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLiveReplayVectorDraw {
    pub ordinal: u32,
    pub reason: &'static str,
    pub before: FactoryAiLiveReplayBattleRngState,
    pub after: FactoryAiLiveReplayBattleRngState,
    pub random_value: u16,
}

#[derive(Debug, Clone, Copy)]
pub enum FactoryAiLiveReplayExpected {
    Final(FactoryAiLiveReplayBattleRngState),
    Error(&'static str),
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLiveReplayVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub initial_rng: FactoryAiLiveReplayBattleRngState,
    pub draws: &'static [FactoryAiLiveReplayVectorDraw],
    pub expected: FactoryAiLiveReplayExpected,
}

pub const FACTORY_AI_LIVE_REPLAY_VECTOR_CATEGORY_COUNTS: [(&str, usize); ${expectedCategoryCounts.size}] = [
${categoryLines}
];

pub static FACTORY_AI_LIVE_REPLAY_CASES: [FactoryAiLiveReplayVectorCase; ${cases.length}] = [
${caseLines}
];
`;

fs.writeFileSync(outPath, rust, "utf8");
const rustupBin = path.join(
  process.env.HOME ?? "",
  ".rustup",
  "toolchains",
  "stable-aarch64-apple-darwin",
  "bin",
);
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-factory-ai-live-replay-vectors: could not find rustfmt");
const digest = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-factory-ai-live-replay-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-factory-ai-live-replay-vectors: ${cases.length} cases; ${[...expectedCategoryCounts].map(([category, count]) => `${category}=${count}`).join(", ")}`);
console.log(`gen-factory-ai-live-replay-vectors: sha256 ${digest}`);
