#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptCopyFoeStatsOpcode.ts.
// Expected controls, complete projected outputs, and exact role errors are
// created only by executing the canonical TypeScript opcode handler. This
// script owns bounded input construction and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-copyfoestats-vectors.mjs

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
  "battle_script_copyfoestats_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptCopyFoeStatsOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_COPYFOESTATS";
const OPCODE_ID = 0xbd;
const DISPATCHER = "Cmd_copyfoestats";
const ENTRY_LABEL = "BattleScript_EffectPsychUp";
const PSYCH_UP = 244;
const BATTLE_SLOTS = 4;
const STAT_STAGE_COUNT = rulesModule.BATTLE_SCRIPT_NUM_BATTLE_STATS;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const TARGET_DOMAIN = ATTACKER_DOMAIN;
const STAT_POSITION_DOMAIN = Object.freeze(
  Array.from({ length: STAT_STAGE_COUNT }, (_, position) => position),
);
const SIGNED_S8_MIN = -128;
const SIGNED_S8_MAX = 127;
const SIGNED_S8_VALUE_COUNT = SIGNED_S8_MAX - SIGNED_S8_MIN + 1;
const CANONICAL_INVALID_S8_PROBES = Object.freeze([-129, 128]);
const NEUTRAL_STAT_STAGE = 6;
const MIXED_STAGE_EDGE_DOMAIN = Object.freeze([-128, -127, -1, 0, 1, 6, 42, 127]);
const FULL_DOMAIN_ATTACKER = 0;
const FULL_DOMAIN_TARGET = 1;
const GENERATED_FILE_MAX_BYTES = 5_000_000;

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-copyfoestats-vectors: " + message);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), label + " must be one of 0..3, got " + value);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertStatPosition(value, label) {
  assert(STAT_POSITION_DOMAIN.includes(value), label + " must be one of 0..7, got " + value);
}

function assertSignedS8(value, label) {
  assert(
    Number.isInteger(value) && value >= SIGNED_S8_MIN && value <= SIGNED_S8_MAX,
    label + " must be a signed s8, got " + value,
  );
}

function freezeProjection(statStages, attacker, target) {
  assert(Array.isArray(statStages) && statStages.length === BATTLE_SLOTS, "statStages must have four rows");
  const rows = statStages.map((row, battler) => {
    assert(
      Array.isArray(row) && row.length === STAT_STAGE_COUNT,
      "statStages[" + battler + "] must have eight cells",
    );
    row.forEach((value, stat) => assertSignedS8(value, "statStages[" + battler + "][" + stat + "]"));
    return Object.freeze([...row]);
  });
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  return Object.freeze({
    statStages: Object.freeze(rows),
    attacker,
    target,
  });
}

function canonicalBattler(side, statStages) {
  return Object.freeze({
    side,
    ability: 0,
    hp: 100,
    maxHP: 100,
    moves: Object.freeze([PSYCH_UP, 0, 0, 0]),
    pp: Object.freeze([10, 0, 0, 0]),
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    statStages: Object.freeze([...statStages]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 0,
    attack: 50,
    defense: 50,
    spAttack: 50,
    spDefense: 50,
    level: 50,
    friendship: 0,
    partyIndex: 0,
    isFirstTurn: 0,
  });
}

function canonicalRulesFromRaw(statStages, attacker, target) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(ATTACKER_DOMAIN.map((battler) => canonicalBattler(
      battler % 2,
      statStages[battler],
    ))),
    selectorRoles: Object.freeze({
      attacker,
      target,
      effectBattler: 0,
      fainted: null,
    }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: PSYCH_UP,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });
}

function createCanonicalRules(projection) {
  return canonicalRulesFromRaw(projection.statStages, projection.attacker, projection.target);
}

function mixedRows(salt) {
  return ATTACKER_DOMAIN.map((battler) => STAT_POSITION_DOMAIN.map((stat) =>
    MIXED_STAGE_EDGE_DOMAIN[
      (salt + battler * 3 + stat) % MIXED_STAGE_EDGE_DOMAIN.length
    ]
  ));
}

function allNeutralRows() {
  return ATTACKER_DOMAIN.map(() => STAT_POSITION_DOMAIN.map(() => NEUTRAL_STAT_STAGE));
}

function makePairProjection({ attacker, target, salt }) {
  assertOptionalBattler(attacker, "initial attacker");
  assertOptionalBattler(target, "initial target");
  return freezeProjection(mixedRows(salt), attacker, target);
}

function makeFullDomainProjection(position, value) {
  assertStatPosition(position, "full-domain position");
  assertSignedS8(value, "full-domain target value");
  const rows = mixedRows(position * SIGNED_S8_VALUE_COUNT + (value - SIGNED_S8_MIN));
  rows[FULL_DOMAIN_TARGET][position] = value;
  rows[FULL_DOMAIN_ATTACKER][position] = value === SIGNED_S8_MAX ? SIGNED_S8_MIN : value + 1;
  return freezeProjection(rows, FULL_DOMAIN_ATTACKER, FULL_DOMAIN_TARGET);
}

function vectorState(rules) {
  return Object.freeze({
    statStages: Object.freeze(rules.battlers.map((battler) => Object.freeze([...battler.statStages]))),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

assert(STAT_STAGE_COUNT === 8, "BATTLE_SCRIPT_NUM_BATTLE_STATS drifted to " + STAT_STAGE_COUNT);
for (const value of [SIGNED_S8_MIN, SIGNED_S8_MAX]) {
  const rows = allNeutralRows();
  rows[0][0] = value;
  assert(
    canonicalRulesFromRaw(rows, 0, 1).battlers[0].statStages[0] === value,
    "canonical constructor did not retain signed s8 endpoint " + value,
  );
}
for (const value of CANONICAL_INVALID_S8_PROBES) {
  const rows = allNeutralRows();
  rows[0][0] = value;
  let message = null;
  try {
    canonicalRulesFromRaw(rows, 0, 1);
  } catch (error) {
    assert(error instanceof Error, "canonical signed-s8 validation threw non-Error");
    message = error.message;
  }
  assert(
    message === "battlers[0].statStages[0] must be a signed 8-bit integer, got " + value,
    "canonical signed-s8 validation drifted for " + value + ": " + String(message),
  );
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
assert(instruction.source.label === ENTRY_LABEL, "expected source label " + ENTRY_LABEL);
assert(instruction.operands.length === 1, "canonical opcode must have one unused failure pointer");
assert(instruction.operands[0]?.widthBytes === 4, "canonical failure pointer must be four bytes");
assert(
  instruction.operands[0]?.expression === "BattleScript_ButItFailed",
  "canonical failure pointer expression drifted",
);

const handlers = opcodeModule.createBattleScriptCopyFoeStatsOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical COPYFOESTATS handler was not registered");

function assertCanonicalCopyStep(priorRules, transition) {
  const attacker = priorRules.selectorRoles.attacker;
  const target = priorRules.selectorRoles.target;
  assert(attacker !== null, "successful canonical handler had no attacker");
  assert(target !== null, "successful canonical handler had no target");
  const nextRules = transition.rulesContext;
  assert(nextRules !== priorRules, "canonical handler did not replace its rules object");
  assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");
  assert(Object.isFrozen(nextRules.battlers), "canonical output battlers must be frozen");
  assert(
    nextRules.selectorRoles === priorRules.selectorRoles,
    "canonical handler replaced selector role bindings",
  );
  assert(nextRules.battlers !== priorRules.battlers, "canonical handler reused battler array");
  for (const battler of ATTACKER_DOMAIN) {
    if (battler === attacker) {
      assert(
        nextRules.battlers[battler] !== priorRules.battlers[battler],
        "canonical handler did not replace attacker battler " + battler,
      );
      assert(
        nextRules.battlers[battler].statStages !== priorRules.battlers[battler].statStages,
        "canonical handler did not replace attacker stages " + battler,
      );
      assert(
        Object.isFrozen(nextRules.battlers[battler].statStages),
        "canonical copied stage row must be frozen",
      );
      for (const stat of STAT_POSITION_DOMAIN) {
        assert(
          nextRules.battlers[battler].statStages[stat]
            === priorRules.battlers[target].statStages[stat],
          "canonical handler did not copy target stage " + target + "/" + stat,
        );
      }
    } else {
      assert(
        nextRules.battlers[battler] === priorRules.battlers[battler],
        "canonical handler replaced sibling battler " + battler,
      );
    }
  }
}

function sourceOutcome(initialProjection, applications) {
  const initialRules = createCanonicalRules(initialProjection);
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  try {
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
      assertCanonicalCopyStep(currentRules, transition);
      assert(
        sameState(vectorState(currentRules), currentSnapshot),
        "canonical handler mutated current rules",
      );
      controls.push("advance");
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "canonical handler threw non-Error " + String(error));
    assert(
      sameState(vectorState(initialRules), inputSnapshot),
      "throwing canonical handler mutated input rules",
    );
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      error: error.message,
    });
  }
}

function branchFor(initial, outcome) {
  if (outcome.error !== null) {
    return initial.attacker === null ? "missing-attacker-role" : "missing-target-role";
  }
  return outcome.controls.join("-then-");
}

const cases = [];
function addCase(label, category, initial, applications = 1, targetedStat = null) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid label " + label);
  assert(!cases.some((value) => value.label === label), "duplicate label " + label);
  assert(applications === 1 || applications === 2, label + ": applications must be one or two");
  if (targetedStat !== null) assertStatPosition(targetedStat, label + " targeted stat");
  const outcome = sourceOutcome(initial, applications);
  if (initial.attacker === null) {
    assert(
      outcome.error === "B_SCR_OP_COPYFOESTATS requires an attacker role",
      label + ": missing attacker error drifted to " + String(outcome.error),
    );
    assert(outcome.expected === null, label + ": missing attacker produced output");
    assert(outcome.controls.length === 0, label + ": missing attacker advanced");
  } else if (initial.target === null) {
    assert(
      outcome.error === "B_SCR_OP_COPYFOESTATS requires a target role",
      label + ": missing target error drifted to " + String(outcome.error),
    );
    assert(outcome.expected === null, label + ": missing target produced output");
    assert(outcome.controls.length === 0, label + ": missing target advanced");
  } else {
    assert(outcome.error === null, label + ": valid roles threw " + String(outcome.error));
    assert(outcome.expected !== null, label + ": valid roles omitted output");
    assert(
      outcome.controls.length === applications
        && outcome.controls.every((control) => control === "advance"),
      label + ": valid copy did not advance exactly " + applications + " time(s)",
    );
  }
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(initial, outcome),
    applications,
    targetedStat,
    initial: vectorState(createCanonicalRules(initial)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

function signedLabel(value) {
  return value < 0 ? "n" + (-value) : "p" + value;
}

for (const position of STAT_POSITION_DOMAIN) {
  for (let value = SIGNED_S8_MIN; value <= SIGNED_S8_MAX; value += 1) {
    addCase(
      "non_alias_s8_position_" + position + "_" + signedLabel(value),
      "non-alias-stage-position-signed-s8-full-domain",
      makeFullDomainProjection(position, value),
      1,
      position,
    );
  }
}

for (const attacker of ATTACKER_DOMAIN) {
  for (const target of TARGET_DOMAIN) {
    addCase(
      "pair_a" + attacker + "_t" + target + "_mixed_boundary_rows",
      "attacker-target-pair-mixed-boundary-matrix",
      makePairProjection({ attacker, target, salt: attacker * TARGET_DOMAIN.length + target }),
    );
  }
}

addCase(
  "missing_attacker_and_target_roles_attacker_error_first",
  "ordered-missing-role-errors",
  makePairProjection({ attacker: null, target: null, salt: 100 }),
);
addCase(
  "missing_attacker_role_precedes_target_stage_read",
  "ordered-missing-role-errors",
  makePairProjection({ attacker: null, target: 3, salt: 101 }),
);
addCase(
  "missing_target_role_after_attacker_resolution",
  "ordered-missing-role-errors",
  makePairProjection({ attacker: 2, target: null, salt: 102 }),
);

for (const attacker of ATTACKER_DOMAIN) {
  addCase(
    "siblings_preserved_a" + attacker + "_t" + ((attacker + 1) % BATTLE_SLOTS),
    "sibling-preservation",
    makePairProjection({
      attacker,
      target: (attacker + 1) % BATTLE_SLOTS,
      salt: 200 + attacker,
    }),
  );
}

addCase(
  "neutral_non_alias_rows_copy_and_advance",
  "neutral-and-alias-success",
  freezeProjection(allNeutralRows(), 0, 1),
);
addCase(
  "neutral_alias_rows_copy_and_advance",
  "neutral-and-alias-success",
  freezeProjection(allNeutralRows(), 2, 2),
);
addCase(
  "mixed_alias_row_copies_self_and_advances",
  "neutral-and-alias-success",
  makePairProjection({ attacker: 3, target: 3, salt: 300 }),
);
addCase(
  "repeated_non_alias_copy_is_value_idempotent_and_advances_each_time",
  "repeated-copy-idempotence",
  makePairProjection({ attacker: 3, target: 1, salt: 400 }),
  2,
);

const FULL_DOMAIN_CASE_COUNT = STAT_STAGE_COUNT * SIGNED_S8_VALUE_COUNT;
const FULL_CARTESIAN_CASE_COUNT = ATTACKER_DOMAIN.length * TARGET_DOMAIN.length * FULL_DOMAIN_CASE_COUNT;
assert(FULL_DOMAIN_CASE_COUNT === 2048, "full non-alias domain case count drifted to " + FULL_DOMAIN_CASE_COUNT);
assert(FULL_CARTESIAN_CASE_COUNT === 32768, "full all-pairs cartesian count drifted to " + FULL_CARTESIAN_CASE_COUNT);
assert(
  cases.length === FULL_DOMAIN_CASE_COUNT + 16 + 3 + 4 + 3 + 1,
  "case count drifted to " + cases.length,
);
assert(
  cases.filter((value) => value.category === "non-alias-stage-position-signed-s8-full-domain").length
    === FULL_DOMAIN_CASE_COUNT,
  "full-domain category count drifted",
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) {
    counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  }
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["stat-stage-cells-per-battler", STAT_STAGE_COUNT],
  ["signed-s8-values", SIGNED_S8_VALUE_COUNT],
  ["mixed-boundary-stage-values", MIXED_STAGE_EDGE_DOMAIN.length],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["target-role-values", TARGET_DOMAIN.length],
  ["complete-attacker-target-role-pairs", ATTACKER_DOMAIN.length * TARGET_DOMAIN.length],
  ["exhaustive-non-alias-role-pairs", 1],
  ["exhaustive-non-alias-stage-position-value-cases", FULL_DOMAIN_CASE_COUNT],
  ["full-16-pair-stage-position-value-cartesian-cases-intentionally-omitted", FULL_CARTESIAN_CASE_COUNT],
  ["typed-ordered-missing-role-cases", 3],
  ["application-count-values", 2],
  ["ignored-failure-pointer-fields-in-projection", 0],
  ["absolute-program-counter-fields-in-projection", 0],
  ["abi-exports-added", 0],
  ["unsupported-barriers-added", 0],
  ["generated-file-byte-limit-exclusive", GENERATED_FILE_MAX_BYTES],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  targetDomain: TARGET_DOMAIN,
  statPositionDomain: STAT_POSITION_DOMAIN,
  signedS8Min: SIGNED_S8_MIN,
  signedS8Max: SIGNED_S8_MAX,
  canonicalInvalidS8Probes: CANONICAL_INVALID_S8_PROBES,
  mixedStageEdgeDomain: MIXED_STAGE_EDGE_DOMAIN,
  fullDomainRolePair: Object.freeze([FULL_DOMAIN_ATTACKER, FULL_DOMAIN_TARGET]),
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustBattler(value) {
  return "BattleScriptCopyFoeStatsBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustRow(values) {
  return "[" + values.join(", ") + "]";
}

function rustState(value) {
  return [
    "BattleScriptCopyFoeStatsVectorState {",
    "stat_stages: [" + value.statStages.map(rustRow).join(", ") + "],",
    "attacker: " + rustOptionalBattler(value.attacker) + ",",
    "target: " + rustOptionalBattler(value.target) + ",",
    "}",
  ].join(" ");
}

function rustOptionalState(value) {
  return value === null ? "None" : "Some(" + rustState(value) + ")";
}

function rustOptionalString(value) {
  return value === null ? "None" : "Some(" + rustString(value) + ")";
}

function rustOptionalStat(value) {
  return value === null ? "None" : "Some(" + value + ")";
}

function rustControls(values) {
  return "&[" + values.map(() => "BattleScriptCopyFoeStatsControl::Advance").join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-copyfoestats-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptCopyFoeStatsOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_copyfoestats::{");
lines.push("    BattleScriptCopyFoeStatsBattler, BattleScriptCopyFoeStatsControl,");
lines.push("};");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_VECTOR_CORPUS_SHA256: &str = " + rustString(corpusHash) + ";",
);
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_ATTACKER_DOMAIN: [u8; " + ATTACKER_DOMAIN.length
    + "] = [" + ATTACKER_DOMAIN.join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_TARGET_DOMAIN: [u8; " + TARGET_DOMAIN.length
    + "] = [" + TARGET_DOMAIN.join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_STAT_POSITION_DOMAIN: [u8; " + STAT_POSITION_DOMAIN.length
    + "] = [" + STAT_POSITION_DOMAIN.join(", ") + "];",
);
lines.push("pub const BATTLE_SCRIPT_COPYFOESTATS_SIGNED_S8_MIN: i8 = " + SIGNED_S8_MIN + ";");
lines.push("pub const BATTLE_SCRIPT_COPYFOESTATS_SIGNED_S8_MAX: i8 = " + SIGNED_S8_MAX + ";");
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_SIGNED_S8_VALUE_COUNT: u16 = " + SIGNED_S8_VALUE_COUNT + ";",
);
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_CANONICAL_INVALID_S8_PROBES: [i16; "
    + CANONICAL_INVALID_S8_PROBES.length + "] = [" + CANONICAL_INVALID_S8_PROBES.join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_MIXED_STAGE_EDGE_DOMAIN: [i8; "
    + MIXED_STAGE_EDGE_DOMAIN.length + "] = [" + MIXED_STAGE_EDGE_DOMAIN.join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_FULL_DOMAIN_ROLE_PAIR: (u8, u8) = ("
    + FULL_DOMAIN_ATTACKER + ", " + FULL_DOMAIN_TARGET + ");",
);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptCopyFoeStatsVectorState {");
lines.push("    pub stat_stages: [[i8; 8]; 4],");
lines.push("    pub attacker: Option<BattleScriptCopyFoeStatsBattler>,");
lines.push("    pub target: Option<BattleScriptCopyFoeStatsBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptCopyFoeStatsVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub targeted_stat: Option<u8>,");
lines.push("    pub initial: BattleScriptCopyFoeStatsVectorState,");
lines.push("    pub expected: Option<BattleScriptCopyFoeStatsVectorState>,");
lines.push("    pub controls: &'static [BattleScriptCopyFoeStatsControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_DOMAIN_CENSUS: [(&str, u64); " + domainCensus.length + "] = [",
);
for (const [name, count] of domainCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_CATEGORY_CENSUS: [(&str, usize); " + categoryCensus.length + "] = [",
);
for (const [name, count] of categoryCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_COPYFOESTATS_BRANCH_CENSUS: [(&str, usize); " + branchCensus.length + "] = [",
);
for (const [name, count] of branchCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub static BATTLE_SCRIPT_COPYFOESTATS_CASES: [BattleScriptCopyFoeStatsVectorCase; " + cases.length + "] = [",
);
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptCopyFoeStatsVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        applications: " + value.applications + ",");
  lines.push("        targeted_stat: " + rustOptionalStat(value.targetedStat) + ",");
  lines.push("        initial: " + rustState(value.initial) + ",");
  lines.push("        expected: " + rustOptionalState(value.expected) + ",");
  lines.push("        controls: " + rustControls(value.controls) + ",");
  lines.push("        expected_error: " + rustOptionalString(value.expectedError) + ",");
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
  throw new Error("gen-battle-script-copyfoestats-vectors: could not find rustfmt");
}

const generated = fs.readFileSync(outPath);
assert(
  generated.byteLength < GENERATED_FILE_MAX_BYTES,
  "generated file is " + generated.byteLength + " bytes, not below " + GENERATED_FILE_MAX_BYTES,
);
const generatedHash = crypto.createHash("sha256").update(generated).digest("hex");
console.log("gen-battle-script-copyfoestats-vectors: wrote " + path.relative(workspaceRoot, outPath));
console.log("gen-battle-script-copyfoestats-vectors: " + cases.length + " cases");
console.log("gen-battle-script-copyfoestats-vectors: " + generated.byteLength + " generated bytes");
console.log("gen-battle-script-copyfoestats-vectors: domain census " + JSON.stringify(domainCensus));
console.log("gen-battle-script-copyfoestats-vectors: category census " + JSON.stringify(categoryCensus));
console.log("gen-battle-script-copyfoestats-vectors: branch census " + JSON.stringify(branchCensus));
console.log("gen-battle-script-copyfoestats-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-copyfoestats-vectors: generated sha256 " + generatedHash);
