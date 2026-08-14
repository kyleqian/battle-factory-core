#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptNormalisebuffsOpcode.ts.
// Expected controls and outputs are created only by executing the canonical
// TypeScript opcode handler; this script owns bounded input construction and
// Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-normalisebuffs-vectors.mjs

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
  "battle_script_normalisebuffs_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptNormalisebuffsOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_NORMALISEBUFFS";
const OPCODE_ID = 0x8a;
const DISPATCHER = "Cmd_normalisebuffs";
const ENTRY_LABEL = "BattleScript_EffectHaze";
const BATTLE_ROWS = 4;
const STAT_STAGE_COUNT = rulesModule.BATTLE_SCRIPT_NUM_BATTLE_STATS;
const DEFAULT_STAT_STAGE = 6;
const ROW_DOMAIN = Object.freeze([0, 1, 2, 3]);
const STAT_DOMAIN = Object.freeze(Array.from({ length: STAT_STAGE_COUNT }, (_, index) => index));
const SIGNED_S8_EDGE_VALUES = Object.freeze([-128, -1, 0, 5, 6, 7, 127]);
const NON_NEUTRAL_TARGET_VALUES = Object.freeze([-128, -1, 0, 5, 7, 127]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-normalisebuffs-vectors: " + message);
}

function assertRow(value, label) {
  assert(ROW_DOMAIN.includes(value), label + " must be one of 0..3, got " + value);
}

function assertStat(value, label) {
  assert(STAT_DOMAIN.includes(value), label + " must be one of 0..7, got " + value);
}

function assertSignedS8(value, label) {
  assert(
    Number.isInteger(value) && value >= -128 && value <= 127,
    label + " must be a signed s8, got " + value,
  );
}

function freezeRules(statStages) {
  assert(Array.isArray(statStages) && statStages.length === BATTLE_ROWS, "statStages must have four rows");
  const battlers = statStages.map((row, battler) => {
    assert(Array.isArray(row) && row.length === STAT_STAGE_COUNT, "row " + battler + " must have eight cells");
    row.forEach((stage, stat) => assertSignedS8(stage, "statStages[" + battler + "][" + stat + "]"));
    return Object.freeze({ statStages: Object.freeze([...row]) });
  });
  return Object.freeze({ battlers: Object.freeze(battlers) });
}

function mixedRows(salt) {
  return ROW_DOMAIN.map((battler) => STAT_DOMAIN.map((stat) =>
    SIGNED_S8_EDGE_VALUES[(salt + battler * 2 + stat * 3) % SIGNED_S8_EDGE_VALUES.length]
  ));
}

function positionRules(battler, stat, salt) {
  assertRow(battler, "target battler");
  assertStat(stat, "target stat");
  const rows = mixedRows(salt);
  rows[battler][stat] = NON_NEUTRAL_TARGET_VALUES[
    (battler * STAT_STAGE_COUNT + stat) % NON_NEUTRAL_TARGET_VALUES.length
  ];
  return freezeRules(rows);
}

function allNeutralRules() {
  return freezeRules(ROW_DOMAIN.map(() => STAT_DOMAIN.map(() => DEFAULT_STAT_STAGE)));
}

function vectorState(rules) {
  return Object.freeze({
    statStages: Object.freeze(rules.battlers.map((battler) => Object.freeze([...battler.statStages]))),
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(
  instructions.length === 1,
  "expected exactly one " + OPCODE_NAME + " instruction, got " + instructions.length,
);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, "expected opcode " + OPCODE_ID + ", got " + instruction.opcodeId);
assert(
  instruction.dispatcher === DISPATCHER,
  "expected dispatcher " + DISPATCHER + ", got " + instruction.dispatcher,
);
assert(instruction.operands.length === 0, "canonical opcode must have no operands");
assert(STAT_STAGE_COUNT === 8, "BATTLE_SCRIPT_NUM_BATTLE_STATS drifted to " + STAT_STAGE_COUNT);
assert(DEFAULT_STAT_STAGE === 6, "DEFAULT_STAT_STAGE drifted to " + DEFAULT_STAT_STAGE);

const handlers = opcodeModule.createBattleScriptNormalisebuffsOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical NORMALISEBUFFS handler was not registered");

function sourceOutcome(initialRules, applications) {
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  for (let application = 0; application < applications; application += 1) {
    const currentSnapshot = vectorState(currentRules);
    const state = machineModule.createBattleScriptMachine(
      program,
      ENTRY_LABEL,
      currentRules,
      (0x5e7d_1b0d + application) >>> 0,
    );
    const transition = handler({ program, instruction, state });
    assert(transition.control.kind === "advance", "canonical handler did not advance");
    assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
    assert(transition.rng === state.rng, "canonical handler consumed RNG");
    assert(transition.events.length === 0, "canonical handler emitted events");
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(Object.isFrozen(transition.rulesContext.battlers), "canonical output battlers must be frozen");
    assert(
      transition.rulesContext.battlers.length === BATTLE_ROWS,
      "canonical output lost a battler row",
    );
    const neutralStages = transition.rulesContext.battlers[0].statStages;
    assert(Object.isFrozen(neutralStages), "canonical neutral row must be frozen");
    for (const battler of ROW_DOMAIN) {
      const nextBattler = transition.rulesContext.battlers[battler];
      assert(nextBattler !== currentRules.battlers[battler], "canonical handler reused battler " + battler);
      assert(nextBattler.statStages === neutralStages, "canonical handler did not share its neutral row");
      assert(nextBattler.statStages.length === STAT_STAGE_COUNT, "canonical output row dimension drifted");
      for (const stat of STAT_DOMAIN) {
        assert(
          nextBattler.statStages[stat] === DEFAULT_STAT_STAGE,
          "canonical output stat " + battler + "/" + stat + " was not neutral",
        );
      }
    }
    assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
    controls.push(transition.control.kind);
    currentRules = transition.rulesContext;
  }
  assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
  return Object.freeze({
    expected: vectorState(currentRules),
    controls: Object.freeze(controls),
  });
}

function branchFor(outcome) {
  return outcome.controls.join("-then-");
}

const cases = [];
function addCase(label, category, initialRules, applications = 1, targetedCell = null) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid label " + label);
  assert(!cases.some((value) => value.label === label), "duplicate label " + label);
  assert(applications === 1 || applications === 2, label + ": applications must be 1 or 2");
  if (targetedCell !== null) {
    assertRow(targetedCell[0], label + " targeted row");
    assertStat(targetedCell[1], label + " targeted stat");
  }
  const outcome = sourceOutcome(initialRules, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    targetedCell: targetedCell === null ? null : Object.freeze([...targetedCell]),
    initial: vectorState(initialRules),
    expected: outcome.expected,
    controls: outcome.controls,
  }));
}

const signedLabel = new Map([
  [-128, "neg128"],
  [-1, "neg1"],
  [0, "zero"],
  [5, "five"],
  [6, "six"],
  [7, "seven"],
  [127, "pos127"],
]);

for (const battler of ROW_DOMAIN) {
  for (const stat of STAT_DOMAIN) {
    const target = NON_NEUTRAL_TARGET_VALUES[
      (battler * STAT_STAGE_COUNT + stat) % NON_NEUTRAL_TARGET_VALUES.length
    ];
    addCase(
      "cell_b" + battler + "_s" + stat + "_" + signedLabel.get(target),
      "all-battler-stat-position-matrix",
      positionRules(battler, stat, battler * STAT_STAGE_COUNT + stat),
      1,
      [battler, stat],
    );
  }
}

addCase(
  "mixed_signed_rows_all_edges_normalise_together",
  "mixed-signed-rows",
  freezeRules([
    [-128, -1, 0, 5, 6, 7, 127, -128],
    [127, 7, 6, 5, 0, -1, -128, 127],
    [0, 5, 7, -128, 127, -1, 6, 0],
    [6, 127, -1, 7, 5, 0, -128, 6],
  ]),
);

addCase(
  "all_neutral_rows_are_idempotent_and_advance",
  "all-neutral-idempotence",
  allNeutralRules(),
);

addCase(
  "repeated_application_is_value_idempotent_and_advances_each_time",
  "repeated-application",
  freezeRules(mixedRows(5)),
  2,
);

assert(cases.length === 35, "case count drifted: " + cases.length);
const matrix = cases.filter((value) => value.category === "all-battler-stat-position-matrix");
assert(matrix.length === BATTLE_ROWS * STAT_STAGE_COUNT, "position matrix dimension drifted");
for (const battler of ROW_DOMAIN) {
  for (const stat of STAT_DOMAIN) {
    assert(
      matrix.some((value) => value.targetedCell?.[0] === battler && value.targetedCell?.[1] === stat),
      "matrix omits battler/stat cell " + battler + "/" + stat,
    );
  }
}
assert(
  new Set(matrix.map((value) => value.initial.statStages[value.targetedCell[0]][value.targetedCell[1]])).size
    === NON_NEUTRAL_TARGET_VALUES.length,
  "matrix must cover every non-neutral target value",
);
assert(
  new Set(cases.flatMap((value) => value.initial.statStages.flat())).size === SIGNED_S8_EDGE_VALUES.length,
  "corpus must cover every signed s8 edge value",
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-rows", BATTLE_ROWS],
  ["stat-stage-slots-per-row", STAT_STAGE_COUNT],
  ["total-battler-stat-cells", BATTLE_ROWS * STAT_STAGE_COUNT],
  ["signed-s8-values", 256],
  ["signed-s8-edge-values", SIGNED_S8_EDGE_VALUES.length],
  ["non-neutral-target-values", NON_NEUTRAL_TARGET_VALUES.length],
  ["default-stat-stage-write-value", 1],
  ["application-count-values", 2],
]);
const corpus = Object.freeze({
  rowDomain: ROW_DOMAIN,
  statDomain: STAT_DOMAIN,
  signedS8EdgeDomain: SIGNED_S8_EDGE_VALUES,
  nonNeutralTargetDomain: NON_NEUTRAL_TARGET_VALUES,
  defaultStatStage: DEFAULT_STAT_STAGE,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustI8(value) {
  assertSignedS8(value, "Rust i8 literal");
  return String(value);
}

function rustRows(value) {
  return "[" + value.statStages.map((row) => "[" + row.map(rustI8).join(", ") + "]").join(", ") + "]";
}

function rustOptionalCell(value) {
  return value === null ? "None" : "Some((" + value[0] + ", " + value[1] + "))";
}

function rustControls(values) {
  return "&[" + values.map(() => "BattleScriptNormalisebuffsControl::Advance").join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-normalisebuffs-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptNormalisebuffsOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_normalisebuffs::BattleScriptNormalisebuffsControl;");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_NORMALISEBUFFS_VECTOR_CORPUS_SHA256: &str = " + rustString(corpusHash) + ";",
);
lines.push(
  "pub const BATTLE_SCRIPT_NORMALISEBUFFS_ROW_DOMAIN: [u8; " + ROW_DOMAIN.length + "] = ["
    + ROW_DOMAIN.join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_NORMALISEBUFFS_STAT_DOMAIN: [u8; " + STAT_DOMAIN.length + "] = ["
    + STAT_DOMAIN.join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_NORMALISEBUFFS_SIGNED_S8_EDGE_DOMAIN: [i8; "
    + SIGNED_S8_EDGE_VALUES.length + "] = [" + SIGNED_S8_EDGE_VALUES.map(rustI8).join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_NORMALISEBUFFS_NON_NEUTRAL_TARGET_DOMAIN: [i8; "
    + NON_NEUTRAL_TARGET_VALUES.length + "] = [" + NON_NEUTRAL_TARGET_VALUES.map(rustI8).join(", ") + "];",
);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptNormalisebuffsVectorState {");
lines.push("    pub stat_stages: [[i8; 8]; 4],");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptNormalisebuffsVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub targeted_cell: Option<(u8, u8)>,");
lines.push("    pub initial: BattleScriptNormalisebuffsVectorState,");
lines.push("    pub expected: BattleScriptNormalisebuffsVectorState,");
lines.push("    pub controls: &'static [BattleScriptNormalisebuffsControl],");
lines.push("}");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_NORMALISEBUFFS_DOMAIN_CENSUS: [(&str, u64); " + domainCensus.length + "] = [",
);
for (const [name, count] of domainCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_NORMALISEBUFFS_CATEGORY_CENSUS: [(&str, usize); " + categoryCensus.length + "] = [",
);
for (const [name, count] of categoryCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_NORMALISEBUFFS_BRANCH_CENSUS: [(&str, usize); " + branchCensus.length + "] = [",
);
for (const [name, count] of branchCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];" );
lines.push("");
lines.push(
  "pub static BATTLE_SCRIPT_NORMALISEBUFFS_CASES: [BattleScriptNormalisebuffsVectorCase; " + cases.length + "] = [",
);
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptNormalisebuffsVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        applications: " + value.applications + ",");
  lines.push("        targeted_cell: " + rustOptionalCell(value.targetedCell) + ",");
  lines.push("        initial: BattleScriptNormalisebuffsVectorState { stat_stages: " + rustRows(value.initial) + " },");
  lines.push("        expected: BattleScriptNormalisebuffsVectorState { stat_stages: " + rustRows(value.expected) + " },");
  lines.push("        controls: " + rustControls(value.controls) + ",");
  lines.push("    },");
}
lines.push("];" );

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
  throw new Error("gen-battle-script-normalisebuffs-vectors: could not find rustfmt");
}

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(
  "gen-battle-script-normalisebuffs-vectors: wrote " + path.relative(workspaceRoot, outPath),
);
console.log("gen-battle-script-normalisebuffs-vectors: " + cases.length + " cases");
console.log(
  "gen-battle-script-normalisebuffs-vectors: domain census " + JSON.stringify(domainCensus),
);
console.log(
  "gen-battle-script-normalisebuffs-vectors: category census " + JSON.stringify(categoryCensus),
);
console.log(
  "gen-battle-script-normalisebuffs-vectors: branch census " + JSON.stringify(branchCensus),
);
console.log("gen-battle-script-normalisebuffs-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-normalisebuffs-vectors: generated sha256 " + generatedHash);
