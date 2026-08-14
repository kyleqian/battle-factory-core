#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptGender.ts. Expected outputs
// are created only by executing the canonical TypeScript resolver; this script
// owns bounded input construction and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-gender-vectors.mjs

import { execFileSync } from "node:child_process";
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
  "battle_script_gender_vectors_gen.rs",
);
const resolver = await import(pathToFileURL(path.join(
  workspaceRoot,
  "src",
  "engine",
  "battleScriptGender.ts",
)).href);
const speciesStats = JSON.parse(fs.readFileSync(
  path.join(workspaceRoot, "src", "data", "gen", "species-stats.json"),
  "utf8",
)).species;

const U16_MAX = 0xffff;
const U32_MAX = 0xffff_ffff;
const LOW_BYTE_HIGH_WORD = 0xffff_ff00;
const GENDERS = new Set(["male", "female", "genderless"]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-gender-vectors: " + message);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U16_MAX, label + " must be a u16, got " + value);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xff, label + " must be a u8, got " + value);
}

function hex32(value) {
  return "0x" + value.toString(16).padStart(8, "0");
}

function sourceOutcome(species, personality) {
  try {
    const gender = resolver.resolveBattleScriptMonGender(species, personality);
    assert(GENDERS.has(gender), "canonical resolver returned unsupported gender " + JSON.stringify(gender));
    return Object.freeze({ gender, error: null });
  } catch (error) {
    assert(error instanceof Error, "canonical resolver threw a non-Error " + String(error));
    return Object.freeze({ gender: null, error: error.message });
  }
}

function personalitiesForRatio(ratio) {
  // Every canonical species exercises both u32 endpoints. Mixed-ratio rows
  // additionally exercise the exact low-byte decision boundary, at both low
  // and high u32 words. Fixed-ratio rows use low-byte extremes instead.
  const values = new Set([0, U32_MAX]);
  if (ratio > 0 && ratio < 0xfe) {
    values.add(ratio - 1);
    values.add(ratio);
    values.add(LOW_BYTE_HIGH_WORD + ratio - 1);
    values.add(LOW_BYTE_HIGH_WORD + ratio);
  } else {
    values.add(0xff);
    values.add(LOW_BYTE_HIGH_WORD);
  }
  return [...values].sort((left, right) => left - right);
}

function categoryForRatio(ratio) {
  if (ratio === 0) return "always-male";
  if (ratio === 0xfe) return "always-female";
  if (ratio === 0xff) return "genderless";
  return "mixed-low-byte-boundary";
}

function branchFor(ratio, outcome) {
  if (outcome.error !== null) return "species-lookup-error";
  if (ratio === 0) return "fixed-male";
  if (ratio === 0xfe) return "fixed-female";
  if (ratio === 0xff) return "fixed-genderless";
  return "threshold-" + outcome.gender;
}

assert(Array.isArray(speciesStats) && speciesStats.length === 411, "expected 411 canonical species rows");
const seenIds = new Set();
const cases = [];
for (const row of speciesStats) {
  assertU16(row?.id, "species id");
  assertU8(row?.genderRatio, "species " + row.id + " genderRatio");
  assert(!seenIds.has(row.id), "duplicate species id " + row.id);
  seenIds.add(row.id);
  for (const personality of personalitiesForRatio(row.genderRatio)) {
    const outcome = sourceOutcome(row.id, personality);
    assert(outcome.error === null, "canonical species " + row.id + " unexpectedly failed: " + outcome.error);
    cases.push(Object.freeze({
      label: "species_" + row.id + "_personality_" + hex32(personality),
      category: categoryForRatio(row.genderRatio),
      branch: branchFor(row.genderRatio, outcome),
      species: row.id,
      genderRatio: row.genderRatio,
      personality,
      ...outcome,
    }));
  }
}

for (const species of [0, 412, U16_MAX]) {
  for (const personality of [0, U32_MAX]) {
    const outcome = sourceOutcome(species, personality);
    assert(outcome.gender === null, "missing species " + species + " unexpectedly resolved to " + outcome.gender);
    assert(
      outcome.error === "no genderRatio data for species id " + species,
      "missing species " + species + " error drifted: " + JSON.stringify(outcome.error),
    );
    cases.push(Object.freeze({
      label: "missing_species_" + species + "_personality_" + hex32(personality),
      category: "missing-species",
      branch: branchFor(null, outcome),
      species,
      genderRatio: null,
      personality,
      ...outcome,
    }));
  }
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const speciesDomain = [...seenIds].sort((left, right) => left - right);
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["canonical-species", speciesDomain.length],
  ["missing-species-ids", 3],
  ["personality-u32-edges-per-canonical-species", 2],
]);
const corpus = Object.freeze({
  speciesDomain,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustOptionalU8(value) {
  return value === null ? "None" : "Some(" + value + ")";
}

function rustOptionalString(value) {
  return value === null ? "None" : "Some(" + rustString(value) + ")";
}

function rustGender(value) {
  if (value === null) return "None";
  const variant = value[0].toUpperCase() + value.slice(1);
  return "Some(MonGender::" + variant + ")";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-gender-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptGender.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::gender::MonGender;");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_GENDER_VECTOR_CORPUS_SHA256: &str = " + rustString(corpusHash) + ";");
lines.push("pub const BATTLE_SCRIPT_GENDER_SPECIES_DOMAIN: [u16; " + speciesDomain.length + "] = [" + speciesDomain.join(", ") + "];");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptGenderVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub species: u16,");
lines.push("    pub gender_ratio: Option<u8>,");
lines.push("    pub personality: u32,");
lines.push("    pub expected_gender: Option<MonGender>,");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_GENDER_DOMAIN_CENSUS: [(&str, usize); " + domainCensus.length + "] = [");
for (const [name, count] of domainCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_GENDER_CATEGORY_CENSUS: [(&str, usize); " + categoryCensus.length + "] = [");
for (const [name, count] of categoryCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_GENDER_BRANCH_CENSUS: [(&str, usize); " + branchCensus.length + "] = [");
for (const [name, count] of branchCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub static BATTLE_SCRIPT_GENDER_CASES: [BattleScriptGenderVectorCase; " + cases.length + "] = [");
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptGenderVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        species: " + value.species + ",");
  lines.push("        gender_ratio: " + rustOptionalU8(value.genderRatio) + ",");
  lines.push("        personality: " + value.personality + ",");
  lines.push("        expected_gender: " + rustGender(value.gender) + ",");
  lines.push("        expected_error: " + rustOptionalString(value.error) + ",");
  lines.push("    },");
}
lines.push("];");

fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
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
if (!formatted) {
  throw new Error("gen-battle-script-gender-vectors: could not find rustfmt");
}

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log("gen-battle-script-gender-vectors: wrote " + path.relative(workspaceRoot, outPath));
console.log("gen-battle-script-gender-vectors: " + cases.length + " cases");
console.log("gen-battle-script-gender-vectors: domain census " + JSON.stringify(domainCensus));
console.log("gen-battle-script-gender-vectors: category census " + JSON.stringify(categoryCensus));
console.log("gen-battle-script-gender-vectors: branch census " + JSON.stringify(branchCensus));
console.log("gen-battle-script-gender-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-gender-vectors: generated sha256 " + generatedHash);
