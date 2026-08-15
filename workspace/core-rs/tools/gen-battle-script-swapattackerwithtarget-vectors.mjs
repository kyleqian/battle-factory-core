#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSnatchOpcode.ts.
// Expected controls, outputs, branches, and errors are created only by
// executing the canonical TypeScript B_SCR_OP_SWAPATTACKERWITHTARGET handler.
// This script owns bounded input construction and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-swapattackerwithtarget-vectors.mjs

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
  "battle_script_swapattackerwithtarget_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSnatchOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_SWAPATTACKERWITHTARGET";
const OPCODE_ID = 0x5f;
const DISPATCHER = "Cmd_swapattackerwithtarget";
const ENTRY_LABEL = "BattleScript_PursuitSwitchDmgLoop";
const CALL_SITE_LABELS = Object.freeze([
  "BattleScript_PursuitSwitchDmgLoop",
  "BattleScript_PursuitSwitchDmgLoop",
  "BattleScript_SnatchedMove",
]);
const BATTLE_SLOTS = 4;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, ...BATTLER_DOMAIN]);
const U32_MAX = 0xffff_ffff;
const SWAP_ATTACKER_TARGET_MASK = rulesModule.BATTLE_SCRIPT_HITMARKER_SWAP_ATTACKER_TARGET;
const HIT_MARKER_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  0x0000_07ff,
  0x0000_0800,
  0x0000_0fff,
  0x0000_1000,
  0x0000_1001,
  0x0000_1fff,
  0xffff_efff,
  0x8000_1000,
  U32_MAX,
]);
const GENERATED_FILE_MAX_BYTES = 5_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-swapattackerwithtarget-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U32_MAX, `${label} must be a u32, got ${value}`);
}

function freezeProjection({ attacker, target, effectBattler, fainted, scriptingBattler, hitMarker }) {
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  assertOptionalBattler(effectBattler, "effectBattler role");
  assertOptionalBattler(fainted, "fainted role");
  assertBattler(scriptingBattler, "scriptingBattler");
  assertU32(hitMarker, "hitMarker");
  return Object.freeze({ attacker, target, effectBattler, fainted, scriptingBattler, hitMarker: hitMarker >>> 0 });
}

function makeProjection({
  attacker = 0,
  target = 1,
  effectBattler = 2,
  fainted = 3,
  scriptingBattler = 0,
  hitMarker = 0,
} = {}) {
  return freezeProjection({ attacker, target, effectBattler, fainted, scriptingBattler, hitMarker });
}

// The opcode reads no battler record, but the canonical context constructor
// requires four complete canonical battler records. These fixed records keep
// the differential surface constrained to the selector and hit-marker fields
// this leaf owns or preserves.
function canonicalBattler(index) {
  return Object.freeze({
    side: index & 1,
    ability: 0,
    hp: 100,
    maxHP: 100,
    moves: Object.freeze([0, 0, 0, 0]),
    pp: Object.freeze([0, 0, 0, 0]),
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
    stealMove: 0,
    item: 0,
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 1,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: 0,
    isFirstTurn: 0,
    ppNotAffectedByPressure: 0,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(BATTLER_DOMAIN.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.effectBattler,
      fainted: projection.fainted,
    }),
    scriptingBattler: projection.scriptingBattler,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: projection.hitMarker,
    multiHitCounter: 0,
    lastUsedAbility: 0,
    battleTopology: Object.freeze({
      battlersCount: 4,
      battleTypeFlags: rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
      battlerPositions: Object.freeze([0, 1, 2, 3]),
    }),
    currentTurnActionNumber: 0,
  });
}

function vectorState(rules) {
  return Object.freeze({
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    scriptingBattler: rules.scriptingBattler,
    hitMarker: rules.hitMarker >>> 0,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

assert(
  rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE === 0x0000_0001,
  "BATTLE_TYPE_DOUBLE drifted from source value 1",
);
assert(SWAP_ATTACKER_TARGET_MASK === 0x0000_1000, `swap hit-marker mask drifted to ${SWAP_ATTACKER_TARGET_MASK}`);

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === CALL_SITE_LABELS.length, `expected ${CALL_SITE_LABELS.length} ${OPCODE_NAME} instructions, got ${instructions.length}`);
assert(
  JSON.stringify(instructions.map((instruction) => instruction.source.label)) === JSON.stringify(CALL_SITE_LABELS),
  `unexpected ${OPCODE_NAME} call-site labels ${JSON.stringify(instructions.map((instruction) => instruction.source.label))}`,
);
for (const instruction of instructions) {
  assert(instruction.opcodeId === OPCODE_ID, `expected opcode ${OPCODE_ID}, got ${instruction.opcodeId}`);
  assert(instruction.dispatcher === DISPATCHER, `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`);
  assert(instruction.operands.length === 0, "canonical opcode must have no operands");
}

const handlers = opcodeModule.createBattleScriptSnatchOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical SWAPATTACKERWITHTARGET handler was not registered");
const instruction = instructions[0];

function classifyAndAssertStep(priorRules, transition) {
  const attacker = priorRules.selectorRoles.attacker;
  assert(attacker !== null, "successful canonical handler had no attacker");
  const target = priorRules.selectorRoles.target;
  assert(target !== null, "successful canonical handler had no target");
  const nextRules = transition.rulesContext;

  assert(transition.control.kind === "advance", "canonical handler did not advance");
  assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");
  assert(nextRules !== priorRules, "canonical handler must replace rules on every valid call");
  assert(nextRules.battlers === priorRules.battlers, "canonical handler unexpectedly replaced battlers");
  assert(nextRules.selectorRoles !== priorRules.selectorRoles, "canonical handler must replace selector roles");
  assert(nextRules.selectorRoles.attacker === target, "canonical attacker was not original target");
  assert(nextRules.selectorRoles.target === attacker, "canonical target was not original attacker");
  assert(nextRules.selectorRoles.effectBattler === priorRules.selectorRoles.effectBattler, "canonical handler changed effectBattler sibling");
  assert(nextRules.selectorRoles.fainted === priorRules.selectorRoles.fainted, "canonical handler changed fainted sibling");
  assert(nextRules.scriptingBattler === priorRules.scriptingBattler, "canonical handler changed scriptingBattler sibling");
  assert(
    nextRules.hitMarker === ((priorRules.hitMarker ^ SWAP_ATTACKER_TARGET_MASK) >>> 0),
    "canonical handler did not XOR only the swap hit-marker bit",
  );
  assert(
    ((nextRules.hitMarker & ~SWAP_ATTACKER_TARGET_MASK) >>> 0)
      === ((priorRules.hitMarker & ~SWAP_ATTACKER_TARGET_MASK) >>> 0),
    "canonical handler changed unrelated hit-marker bits",
  );
  return "swap-attacker-target";
}

function sourceOutcome(initialProjection, applications) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  const branches = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const currentSnapshot = vectorState(currentRules);
      const state = machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        currentRules,
        (0x5a17_c4ed + application) >>> 0,
      );
      const transition = handler({ program, instruction, state });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
      branches.push(classifyAndAssertStep(currentRules, transition));
      controls.push("advance");
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      branches: Object.freeze(branches),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input rules");
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      branches: Object.freeze(branches),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) {
    return outcome.branches.map((branch) => `${branch}-advance`).join("-then-");
  }
  if (outcome.error === "Battle Script hit-chain command requires a attacker role") {
    return "missing-attacker-role";
  }
  if (outcome.error === "Battle Script hit-chain command requires a target role") {
    return "missing-target-role";
  }
  throw new Error(`unexpected canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, initialProjection, applications = 2) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be 1 or 2`);
  const initial = vectorState(canonicalRulesFromProjection(initialProjection));
  const outcome = sourceOutcome(initialProjection, applications);
  if (outcome.error === null) {
    assert(outcome.expected !== null, `${label}: successful vector omitted expected state`);
    assert(outcome.controls.length === applications, `${label}: successful vector stopped early`);
    assert(outcome.branches.length === applications, `${label}: successful vector omitted a branch`);
    if (applications === 2) {
      assert(sameState(outcome.expected, initial), `${label}: two canonical applications did not restore state`);
    }
  } else {
    assert(outcome.expected === null, `${label}: error vector unexpectedly returned state`);
    assert(outcome.controls.length === 0, `${label}: error vector emitted a control`);
    assert(outcome.branches.length === 0, `${label}: error vector took a success branch`);
  }
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    initial,
    expected: outcome.expected,
    controls: outcome.controls,
    branches: outcome.branches,
    expectedError: outcome.error,
  }));
}

// Every attacker/target pair crosses every optional effect/fainted sibling
// combination. The preserved scripting-battler and packed hit-marker values
// rotate orthogonally, keeping the generated corpus compact.
let matrixSerial = 0;
for (const attacker of BATTLER_DOMAIN) {
  for (const target of BATTLER_DOMAIN) {
    for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
      for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
        addCase(
          `matrix_a${attacker}_t${target}_e${effectBattler ?? "n"}_f${fainted ?? "n"}`,
          "complete-attacker-target-effect-fainted-matrix",
          makeProjection({
            attacker,
            target,
            effectBattler,
            fainted,
            scriptingBattler: BATTLER_DOMAIN[matrixSerial % BATTLE_SLOTS],
            hitMarker: HIT_MARKER_EDGE_VALUES[matrixSerial % HIT_MARKER_EDGE_VALUES.length],
          }),
        );
        matrixSerial += 1;
      }
    }
  }
}

// Every pair receives every packed-u32 edge, including both bit-12 states,
// zero, and u32::MAX. Optional siblings rotate independently of that matrix.
let edgeSerial = 0;
for (const attacker of BATTLER_DOMAIN) {
  for (const target of BATTLER_DOMAIN) {
    for (const hitMarker of HIT_MARKER_EDGE_VALUES) {
      addCase(
        `edge_a${attacker}_t${target}_m${edgeSerial}`,
        "u32-hit-marker-edge-pair-matrix",
        makeProjection({
          attacker,
          target,
          effectBattler: OPTIONAL_BATTLER_DOMAIN[edgeSerial % OPTIONAL_BATTLER_DOMAIN.length],
          fainted: OPTIONAL_BATTLER_DOMAIN[(edgeSerial * 3 + 1) % OPTIONAL_BATTLER_DOMAIN.length],
          scriptingBattler: BATTLER_DOMAIN[(edgeSerial * 3 + 2) % BATTLE_SLOTS],
          hitMarker,
        }),
      );
      edgeSerial += 1;
    }
  }
}

for (const battler of BATTLER_DOMAIN) {
  const other = (battler + 1) % BATTLE_SLOTS;
  addCase(
    `alias_all_selector_roles_and_scripting_b${battler}`,
    "explicit-selector-alias-permutations",
    makeProjection({
      attacker: battler,
      target: battler,
      effectBattler: battler,
      fainted: battler,
      scriptingBattler: battler,
      hitMarker: HIT_MARKER_EDGE_VALUES[battler],
    }),
  );
  addCase(
    `alias_target_effect_fainted_b${battler}`,
    "explicit-selector-alias-permutations",
    makeProjection({
      attacker: battler,
      target: other,
      effectBattler: other,
      fainted: other,
      scriptingBattler: other,
      hitMarker: HIT_MARKER_EDGE_VALUES[battler + 4],
    }),
  );
  addCase(
    `alias_attacker_effect_fainted_b${battler}`,
    "explicit-selector-alias-permutations",
    makeProjection({
      attacker: battler,
      target: other,
      effectBattler: battler,
      fainted: battler,
      scriptingBattler: battler,
      hitMarker: HIT_MARKER_EDGE_VALUES[battler + 6],
    }),
  );
  addCase(
    `alias_siblings_crossed_b${battler}`,
    "explicit-selector-alias-permutations",
    makeProjection({
      attacker: battler,
      target: battler,
      effectBattler: other,
      fainted: battler,
      scriptingBattler: other,
      hitMarker: HIT_MARKER_EDGE_VALUES[(battler + 8) % HIT_MARKER_EDGE_VALUES.length],
    }),
  );
}

addCase(
  "missing_attacker_precedes_missing_target",
  "ordered-missing-selector-role-errors",
  makeProjection({ attacker: null, target: null, effectBattler: 2, fainted: 3, scriptingBattler: 1, hitMarker: U32_MAX }),
  1,
);
addCase(
  "missing_attacker_precedes_present_target",
  "ordered-missing-selector-role-errors",
  makeProjection({ attacker: null, target: 3, effectBattler: null, fainted: 2, scriptingBattler: 0, hitMarker: 0x0000_1000 }),
  1,
);
addCase(
  "missing_target_after_attacker_resolution",
  "ordered-missing-selector-role-errors",
  makeProjection({ attacker: 2, target: null, effectBattler: 1, fainted: null, scriptingBattler: 3, hitMarker: 0xffff_efff }),
  1,
);

const MATRIX_CASE_COUNT = BATTLER_DOMAIN.length ** 2 * OPTIONAL_BATTLER_DOMAIN.length ** 2;
const EDGE_PAIR_CASE_COUNT = BATTLER_DOMAIN.length ** 2 * HIT_MARKER_EDGE_VALUES.length;
const ALIAS_CASE_COUNT = BATTLER_DOMAIN.length * 4;
const MISSING_ROLE_CASE_COUNT = 3;
assert(MATRIX_CASE_COUNT === 400, `matrix case count drifted to ${MATRIX_CASE_COUNT}`);
assert(EDGE_PAIR_CASE_COUNT === 160, `edge-pair case count drifted to ${EDGE_PAIR_CASE_COUNT}`);
assert(ALIAS_CASE_COUNT === 16, `alias case count drifted to ${ALIAS_CASE_COUNT}`);
assert(
  cases.length === MATRIX_CASE_COUNT + EDGE_PAIR_CASE_COUNT + ALIAS_CASE_COUNT + MISSING_ROLE_CASE_COUNT,
  `case count drifted to ${cases.length}`,
);
for (const attacker of BATTLER_DOMAIN) {
  for (const target of BATTLER_DOMAIN) {
    for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
      for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
        assert(cases.some((value) =>
          value.category === "complete-attacker-target-effect-fainted-matrix"
          && value.initial.attacker === attacker
          && value.initial.target === target
          && value.initial.effectBattler === effectBattler
          && value.initial.fainted === fainted),
        `matrix omits a${attacker} t${target} e${effectBattler} f${fainted}`);
      }
    }
    for (const hitMarker of HIT_MARKER_EDGE_VALUES) {
      assert(cases.some((value) =>
        value.category === "u32-hit-marker-edge-pair-matrix"
        && value.initial.attacker === attacker
        && value.initial.target === target
        && value.initial.hitMarker === hitMarker),
      `edge matrix omits a${attacker} t${target} m${hitMarker}`);
    }
  }
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", BATTLER_DOMAIN.length],
  ["target-role-values", BATTLER_DOMAIN.length],
  ["optional-attacker-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["optional-target-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["optional-effect-battler-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["optional-fainted-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["scripting-battler-values", BATTLER_DOMAIN.length],
  ["hit-marker-u32-values", U32_MAX + 1],
  ["hit-marker-swap-attacker-target-mask", SWAP_ATTACKER_TARGET_MASK],
  ["hit-marker-edge-values", HIT_MARKER_EDGE_VALUES.length],
  ["complete-attacker-target-pairs", BATTLER_DOMAIN.length ** 2],
  ["complete-attacker-target-effect-fainted-matrix-cases", MATRIX_CASE_COUNT],
  ["u32-hit-marker-edge-pair-matrix-cases", EDGE_PAIR_CASE_COUNT],
  ["explicit-selector-alias-cases", ALIAS_CASE_COUNT],
  ["ordered-missing-role-cases", MISSING_ROLE_CASE_COUNT],
  ["involution-application-count", 2],
  ["selector-roles-written-by-handler", 2],
  ["preserved-narrow-selector-siblings", 3],
  ["preserved-hit-marker-bit-count", 31],
  ["concrete-call-sites", CALL_SITE_LABELS.length],
  ["opcode-byte", OPCODE_ID],
  ["opcode-operands", 0],
  ["abi-exports-added", 0],
  ["unsupported-barriers-added", 0],
  ["generated-file-byte-limit-exclusive", GENERATED_FILE_MAX_BYTES],
]);
const corpus = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  callSiteLabels: CALL_SITE_LABELS,
  battlerDomain: BATTLER_DOMAIN,
  optionalBattlerDomain: OPTIONAL_BATTLER_DOMAIN,
  hitMarkerEdgeValues: HIT_MARKER_EDGE_VALUES,
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
  return `BattleScriptSwapattackerwithtargetBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustU32(value) {
  const hex = value.toString(16).padStart(8, "0");
  return `0x${hex.slice(0, 4)}_${hex.slice(4)}`;
}

function rustState(value) {
  return [
    "BattleScriptSwapattackerwithtargetVectorState {",
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `effect_battler: ${rustOptionalBattler(value.effectBattler)},`,
    `fainted: ${rustOptionalBattler(value.fainted)},`,
    `scripting_battler: ${rustBattler(value.scriptingBattler)},`,
    `hit_marker: ${rustU32(value.hitMarker)},`,
    "}",
  ].join(" ");
}

function rustOptionalState(value) {
  return value === null ? "None" : `Some(${rustState(value)})`;
}

function rustOptionalString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}

function rustStringSlice(values) {
  return "&[" + values.map(rustString).join(", ") + "]";
}

function rustControls(values) {
  return "&[" + values.map(() => "BattleScriptSwapattackerwithtargetControl::Advance").join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-swapattackerwithtarget-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSnatchOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_swapattackerwithtarget::{");
lines.push("    BattleScriptSwapattackerwithtargetBattler, BattleScriptSwapattackerwithtargetControl,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push("pub const BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_OPTIONAL_SELECTOR_DOMAIN: [i8; 5] = [-1, 0, 1, 2, 3];");
lines.push(`pub const BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_HIT_MARKER_EDGE_DOMAIN: [u32; ${HIT_MARKER_EDGE_VALUES.length}] = [${HIT_MARKER_EDGE_VALUES.map(rustU32).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSwapattackerwithtargetVectorState {");
lines.push("    pub attacker: Option<BattleScriptSwapattackerwithtargetBattler>,");
lines.push("    pub target: Option<BattleScriptSwapattackerwithtargetBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptSwapattackerwithtargetBattler>,");
lines.push("    pub fainted: Option<BattleScriptSwapattackerwithtargetBattler>,");
lines.push("    pub scripting_battler: BattleScriptSwapattackerwithtargetBattler,");
lines.push("    pub hit_marker: u32,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSwapattackerwithtargetVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSwapattackerwithtargetVectorState,");
lines.push("    pub expected: Option<BattleScriptSwapattackerwithtargetVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSwapattackerwithtargetControl],");
lines.push("    pub branches: &'static [&'static str],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];\n");
lines.push(`pub const BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];\n");
lines.push(`pub const BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_SWAPATTACKERWITHTARGET_CASES: [BattleScriptSwapattackerwithtargetVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSwapattackerwithtargetVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        applications: ${value.applications},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        controls: ${rustControls(value.controls)},`);
  lines.push(`        branches: ${rustStringSlice(value.branches)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
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
if (!formatted) throw new Error("gen-battle-script-swapattackerwithtarget-vectors: could not find rustfmt");

const generated = fs.readFileSync(outPath);
assert(
  generated.byteLength < GENERATED_FILE_MAX_BYTES,
  `generated file is ${generated.byteLength} bytes, not below ${GENERATED_FILE_MAX_BYTES}`,
);
const generatedHash = crypto.createHash("sha256").update(generated).digest("hex");
console.log(`gen-battle-script-swapattackerwithtarget-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-swapattackerwithtarget-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-swapattackerwithtarget-vectors: ${generated.byteLength} generated bytes`);
console.log(`gen-battle-script-swapattackerwithtarget-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-swapattackerwithtarget-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-swapattackerwithtarget-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-swapattackerwithtarget-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-swapattackerwithtarget-vectors: generated sha256 ${generatedHash}`);
