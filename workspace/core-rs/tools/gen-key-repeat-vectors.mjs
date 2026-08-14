#!/usr/bin/env node
// Differential corpus for src/engine/keyRepeat.ts. Expected values are made
// only by executing the canonical TypeScript module; this script owns the
// bounded input matrix and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-key-repeat-vectors.mjs

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "key_repeat_vectors_gen.rs",
);
const keyRepeat = await import(pathToFileURL(path.join(
  workspaceRoot,
  "src",
  "engine",
  "keyRepeat.ts",
)).href);
const input = await import(pathToFileURL(path.join(workspaceRoot, "src", "input.ts")).href);

const BUTTON_NAMES = ["A", "B", "SELECT", "START", "RIGHT", "LEFT", "UP", "DOWN", "R", "L"];
const BUTTON_COUNT = BUTTON_NAMES.length;
const BUTTON_MASK_BITS = (1 << BUTTON_COUNT) - 1;
const START_DELAY = 40;
const CONTINUE_DELAY = 5;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-key-repeat-vectors: ${message}`);
}

assert(JSON.stringify(input.GBA_BUTTONS) === JSON.stringify(BUTTON_NAMES), "canonical GBA_BUTTONS order drifted");
assert(keyRepeat.INITIAL_KEY_REPEAT_STATE.heldKeysRaw.size === 0, "initial held set drifted");
assert(keyRepeat.INITIAL_KEY_REPEAT_STATE.keyRepeatCounter === START_DELAY, "initial repeat counter drifted");

function setFromMask(mask) {
  assert(Number.isInteger(mask) && mask >= 0 && mask <= BUTTON_MASK_BITS, `invalid mask ${mask}`);
  return new Set(BUTTON_NAMES.filter((_, index) => (mask & (1 << index)) !== 0));
}

function maskFromSet(keys, label) {
  let mask = 0;
  for (const button of keys) {
    const index = BUTTON_NAMES.indexOf(button);
    assert(index >= 0, `${label}: unexpected canonical button ${String(button)}`);
    mask |= 1 << index;
  }
  return mask;
}

function assertCounter(counter, label) {
  assert(Number.isInteger(counter) && counter >= 1 && counter <= START_DELAY, `${label}: counter must be 1..40`);
}

function canonicalRead(currentMask, previousMask, previousCounter) {
  assertCounter(previousCounter, "input");
  const previous = {
    heldKeysRaw: setFromMask(previousMask),
    keyRepeatCounter: previousCounter,
  };
  const before = { heldKeysRaw: [...previous.heldKeysRaw], keyRepeatCounter: previous.keyRepeatCounter };
  const result = keyRepeat.readKeys(setFromMask(currentMask), previous);
  assert(JSON.stringify([...previous.heldKeysRaw]) === JSON.stringify(before.heldKeysRaw), "canonical readKeys mutated prior held keys");
  assert(previous.keyRepeatCounter === before.keyRepeatCounter, "canonical readKeys mutated prior counter");
  const nextHeldMask = maskFromSet(result.next.heldKeysRaw, "next held keys");
  const nextCounter = result.next.keyRepeatCounter;
  assertCounter(nextCounter, "result");
  return Object.freeze({
    expectedNewKeys: maskFromSet(result.newKeys, "new keys"),
    expectedNewAndRepeatedKeys: maskFromSet(result.newAndRepeatedKeys, "new/repeated keys"),
    expectedNextHeldKeys: nextHeldMask,
    expectedNextCounter: nextCounter,
  });
}

const readCases = [];
const categoryCounts = new Map();
const labels = new Set();
function addRead(label, category, currentMask, previousMask, previousCounter) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!labels.has(label), `duplicate label ${label}`);
  labels.add(label);
  const expected = canonicalRead(currentMask, previousMask, previousCounter);
  readCases.push(Object.freeze({
    label,
    category,
    currentMask,
    previousMask,
    previousCounter,
    ...expected,
  }));
  categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
}

// Every representable ten-button set appears once as the current input from
// the empty source state. This is the dense JOY_NEW/per-bit matrix.
for (let currentMask = 0; currentMask <= BUTTON_MASK_BITS; currentMask += 1) {
  addRead(`all_current_${currentMask.toString(16).padStart(3, "0")}`, "all-current-combinations", currentMask, 0, START_DELAY);
}

// A held nonempty combination at each reachable counter value precisely pins
// the shared-counter boundary (decrement 40..2, fire at 1).
const COUNTER_DOMAIN_MASK = (1 << 0) | (1 << 4); // A + RIGHT
for (let previousCounter = 1; previousCounter <= START_DELAY; previousCounter += 1) {
  addRead(`unchanged_counter_${previousCounter}`, "unchanged-every-counter", COUNTER_DOMAIN_MASK, COUNTER_DOMAIN_MASK, previousCounter);
}

// Drive every singleton from the canonical initial state through first
// repeat, then two continue repeats: fires at 1, 41, 46, and 51.
for (let buttonIndex = 0; buttonIndex < BUTTON_COUNT; buttonIndex += 1) {
  const singletonMask = 1 << buttonIndex;
  let state = {
    heldMask: 0,
    counter: START_DELAY,
  };
  for (let frame = 1; frame <= 51; frame += 1) {
    const label = `singleton_${buttonIndex}_frame_${frame}`;
    addRead(label, "singleton-through-two-continue-repeats", singletonMask, state.heldMask, state.counter);
    const caseResult = readCases.at(-1);
    state = { heldMask: caseResult.expectedNextHeldKeys, counter: caseResult.expectedNextCounter };
  }
  assert(state.heldMask === singletonMask && state.counter === CONTINUE_DELAY, `singleton ${buttonIndex} timeline drifted`);
}

const A = 1 << 0;
const B = 1 << 1;
const RIGHT = 1 << 4;
const LEFT = 1 << 5;
addRead("combination_add", "combination-add-remove-change", A | RIGHT, A, 12);
addRead("combination_remove", "combination-add-remove-change", A, A | RIGHT, 12);
addRead("combination_change", "combination-add-remove-change", B | LEFT, A | RIGHT, 12);
addRead("release_from_all", "release", 0, BUTTON_MASK_BITS, 1);
addRead("empty_from_empty", "empty", 0, 0, 1);
addRead("all_buttons_new", "all-buttons", BUTTON_MASK_BITS, RIGHT, 1);

const hasButtonCases = [];
for (let buttonIndex = 0; buttonIndex < BUTTON_COUNT; buttonIndex += 1) {
  const button = BUTTON_NAMES[buttonIndex];
  for (const present of [false, true]) {
    const keysMask = present ? (1 << buttonIndex) : (BUTTON_MASK_BITS & ~(1 << buttonIndex));
    const keys = setFromMask(keysMask);
    const expected = keyRepeat.hasButton(keys, button);
    assert(expected === present, `hasButton ${button} ${present} drifted`);
    hasButtonCases.push(Object.freeze({
      label: `has_button_${buttonIndex}_${present ? "present" : "absent"}`,
      category: present ? "has-button-present" : "has-button-absent",
      keysMask,
      buttonIndex,
      expected,
    }));
  }
}

function branchNames(value) {
  const names = [];
  if (value.currentMask !== 0 && value.currentMask === value.previousMask) {
    names.push(value.previousCounter === 1 ? "shared-counter-repeat" : "shared-counter-decrement");
  } else {
    names.push("shared-counter-reset");
  }
  names.push(value.expectedNewKeys === 0 ? "joy-new-empty" : "joy-new-nonempty");
  if (
    value.currentMask !== 0
    && value.currentMask === value.previousMask
    && value.previousCounter === 1
    && value.expectedNewAndRepeatedKeys === value.currentMask
  ) names.push("joy-repeat-full-held");
  return names;
}

const branchCounts = new Map();
for (const value of readCases) {
  for (const branch of branchNames(value)) branchCounts.set(branch, (branchCounts.get(branch) ?? 0) + 1);
}

const hasCategoryCounts = new Map();
for (const value of hasButtonCases) hasCategoryCounts.set(value.category, (hasCategoryCounts.get(value.category) ?? 0) + 1);
const categoryCensus = [...categoryCounts, ...hasCategoryCounts].sort(([a], [b]) => a.localeCompare(b));
const branchCensus = [...branchCounts].sort(([a], [b]) => a.localeCompare(b));

const corpus = Object.freeze({
  initialHeldMask: maskFromSet(keyRepeat.INITIAL_KEY_REPEAT_STATE.heldKeysRaw, "initial held keys"),
  initialCounter: keyRepeat.INITIAL_KEY_REPEAT_STATE.keyRepeatCounter,
  readCases,
  hasButtonCases,
  categoryCensus,
  branchCensus,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  // All generated labels/categories are ASCII; JSON quoting is valid Rust for
  // those strings and keeps the emitter explicit about escaping.
  return JSON.stringify(value);
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-key-repeat-vectors.mjs — regenerate: node core-rs/tools/gen-key-repeat-vectors.mjs.");
lines.push("// Source: executing src/engine/keyRepeat.ts and src/input.ts (the canonical");
lines.push("// TypeScript engine) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");
lines.push(`pub const KEY_REPEAT_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const KEY_REPEAT_BUTTON_COUNT: usize = ${BUTTON_COUNT};`);
lines.push(`pub const KEY_REPEAT_BUTTON_MASK_BITS: u16 = ${BUTTON_MASK_BITS};`);
lines.push(`pub const KEY_REPEAT_START_DELAY: u8 = ${START_DELAY};`);
lines.push(`pub const KEY_REPEAT_CONTINUE_DELAY: u8 = ${CONTINUE_DELAY};`);
lines.push(`pub const KEY_REPEAT_INITIAL_HELD_MASK: u16 = ${corpus.initialHeldMask};`);
lines.push(`pub const KEY_REPEAT_INITIAL_COUNTER: u8 = ${corpus.initialCounter};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct KeyRepeatReadCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub current_mask: u16,");
lines.push("    pub previous_mask: u16,");
lines.push("    pub previous_counter: u8,");
lines.push("    pub expected_new_keys: u16,");
lines.push("    pub expected_new_and_repeated_keys: u16,");
lines.push("    pub expected_next_held_keys: u16,");
lines.push("    pub expected_next_counter: u8,");
lines.push("}");
lines.push(`pub static KEY_REPEAT_READ_CASES: [KeyRepeatReadCase; ${readCases.length}] = [`);
for (const value of readCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    KeyRepeatReadCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        current_mask: ${value.currentMask},`);
  lines.push(`        previous_mask: ${value.previousMask},`);
  lines.push(`        previous_counter: ${value.previousCounter},`);
  lines.push(`        expected_new_keys: ${value.expectedNewKeys},`);
  lines.push(`        expected_new_and_repeated_keys: ${value.expectedNewAndRepeatedKeys},`);
  lines.push(`        expected_next_held_keys: ${value.expectedNextHeldKeys},`);
  lines.push(`        expected_next_counter: ${value.expectedNextCounter},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct KeyRepeatHasButtonCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub keys_mask: u16,");
lines.push("    pub button_index: u8,");
lines.push("    pub expected: bool,");
lines.push("}");
lines.push(`pub static KEY_REPEAT_HAS_BUTTON_CASES: [KeyRepeatHasButtonCase; ${hasButtonCases.length}] = [`);
for (const value of hasButtonCases) {
  lines.push("    KeyRepeatHasButtonCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        keys_mask: ${value.keysMask},`);
  lines.push(`        button_index: ${value.buttonIndex},`);
  lines.push(`        expected: ${value.expected},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub const KEY_REPEAT_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [category, count] of categoryCensus) lines.push(`    (${rustString(category)}, ${count}),`);
lines.push("];\n");
lines.push(`pub const KEY_REPEAT_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [branch, count] of branchCensus) lines.push(`    (${rustString(branch)}, ${count}),`);
lines.push("];\n");

const output = `${lines.join("\n")}\n`;
fs.writeFileSync(outPath, output);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${readCases.length} read cases, ${hasButtonCases.length} hasButton cases)`);
console.log(`category census: ${JSON.stringify(categoryCensus)}`);
console.log(`branch census: ${JSON.stringify(branchCensus)}`);
console.log(`corpus sha256: ${corpusHash}`);
