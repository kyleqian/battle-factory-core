#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrysetmagiccoatOpcode.ts.
// Expected complete projected outputs, typed controls, and exact missing-role
// errors are created only by executing the canonical TypeScript opcode handler.
// This script owns bounded valid input construction and Rust literal emission;
// its FailJump control deliberately omits the canonical machine's absolute PC.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysetmagiccoat-vectors.mjs

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
  "battle_script_trysetmagiccoat_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrysetmagiccoatOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETMAGICCOAT";
const OPCODE_ID = 0xdf;
const DISPATCHER = "Cmd_trysetmagiccoat";
const ENTRY_LABEL = "BattleScript_EffectMagicCoat";
const FAILURE_POINTER = "BattleScript_FailedFromAtkString";
const BATTLE_SLOTS = 4;
const U8_MAX = 0xff;
const U32_MAX = 0xffff_ffff;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, ...ATTACKER_DOMAIN]);
const BATTLERS_COUNT_DOMAIN = Object.freeze([2, 4]);
const CURRENT_TURN_ACTION_NUMBER_DOMAIN = Object.freeze(
  Array.from({ length: U8_MAX + 1 }, (_, value) => value),
);
const BATTLE_TYPE_DOUBLE = rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE;
const SINGLES_FLAG_EDGE_DOMAIN = Object.freeze([
  0x0000_0000,
  0x8000_0000,
  0xffff_fffe,
  0x0100_0000,
]);
const DOUBLES_FLAG_EDGE_DOMAIN = Object.freeze([
  0x0000_0001,
  0x8000_0001,
  0xffff_ffff,
  0x0100_0001,
]);
const BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN = Object.freeze([
  ...SINGLES_FLAG_EDGE_DOMAIN,
  ...DOUBLES_FLAG_EDGE_DOMAIN,
]);
const GENERATED_FILE_MAX_BYTES = 5_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trysetmagiccoat-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertBit(value, label) {
  assert(value === 0 || value === 1, `${label} must be 0 or 1, got ${value}`);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U8_MAX, `${label} must be a u8, got ${value}`);
}

function assertU32(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= U32_MAX,
    `${label} must be a u32, got ${value}`,
  );
}

function assertBattlersCount(value, label) {
  assert(BATTLERS_COUNT_DOMAIN.includes(value), `${label} must be 2 or 4, got ${value}`);
}

function isDoubleTopology(battlersCount) {
  return battlersCount === 4;
}

function positionsForTopology(battlersCount) {
  return battlersCount === 2 ? [0, 1, 0xff, 0xff] : [0, 1, 2, 3];
}

function freezeProjection({
  bounceMoves,
  ppNotAffectedByPressure,
  battlersCount,
  battleTypeFlags,
  currentTurnActionNumber,
  attacker,
  target,
  effectBattler,
  fainted,
}) {
  assert(Array.isArray(bounceMoves) && bounceMoves.length === BATTLE_SLOTS, "bounceMoves must have four cells");
  assert(
    Array.isArray(ppNotAffectedByPressure) && ppNotAffectedByPressure.length === BATTLE_SLOTS,
    "ppNotAffectedByPressure must have four cells",
  );
  bounceMoves.forEach((value, battler) => assertBit(value, `bounceMoves[${battler}]`));
  ppNotAffectedByPressure.forEach((value, battler) => assertBit(value, `ppNotAffectedByPressure[${battler}]`));
  assertBattlersCount(battlersCount, "battlersCount");
  assertU32(battleTypeFlags, "battleTypeFlags");
  assert(
    ((battleTypeFlags & BATTLE_TYPE_DOUBLE) !== 0) === isDoubleTopology(battlersCount),
    "battleTypeFlags BATTLE_TYPE_DOUBLE must agree with battlersCount",
  );
  assertU8(currentTurnActionNumber, "currentTurnActionNumber");
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  assertOptionalBattler(effectBattler, "effectBattler role");
  assertOptionalBattler(fainted, "fainted role");
  return Object.freeze({
    bounceMoves: Object.freeze([...bounceMoves]),
    ppNotAffectedByPressure: Object.freeze([...ppNotAffectedByPressure]),
    battlersCount,
    battleTypeFlags: battleTypeFlags >>> 0,
    currentTurnActionNumber,
    attacker,
    target,
    effectBattler,
    fainted,
  });
}

function makeProjection({
  bounceMoves = [0, 0, 0, 0],
  ppNotAffectedByPressure = [0, 0, 0, 0],
  battlersCount = 2,
  battleTypeFlags = battlersCount === 4 ? BATTLE_TYPE_DOUBLE : 0,
  currentTurnActionNumber = 0,
  attacker = 0,
  target = 1,
  effectBattler = 2,
  fainted = 3,
} = {}) {
  return freezeProjection({
    bounceMoves,
    ppNotAffectedByPressure,
    battlersCount,
    battleTypeFlags,
    currentTurnActionNumber,
    attacker,
    target,
    effectBattler,
    fainted,
  });
}

function bitPattern(seed, salt) {
  return ATTACKER_DOMAIN.map((battler) => ((seed * 73 + salt * 29 + battler * 17) >>> battler) & 1);
}

function nibbleBits(value, highNibble) {
  const nibble = highNibble ? value >>> 4 : value & 0x0f;
  return ATTACKER_DOMAIN.map((battler) => (nibble >>> battler) & 1);
}

function canonicalBattler(index, bounceMove, ppNotAffectedByPressure) {
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
    bounceMove,
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
    ppNotAffectedByPressure,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(ATTACKER_DOMAIN.map((battler) => canonicalBattler(
      battler,
      projection.bounceMoves[battler],
      projection.ppNotAffectedByPressure[battler],
    ))),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.effectBattler,
      fainted: projection.fainted,
    }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: 0,
    battleTopology: Object.freeze({
      battlersCount: projection.battlersCount,
      battleTypeFlags: projection.battleTypeFlags,
      battlerPositions: Object.freeze(positionsForTopology(projection.battlersCount)),
    }),
    currentTurnActionNumber: projection.currentTurnActionNumber,
  });
}

function vectorBit(value, label) {
  assert(value === 0 || value === 1, `${label} canonical value must be 0 or 1, got ${value}`);
  return value;
}

function vectorState(rules) {
  return Object.freeze({
    bounceMoves: Object.freeze(rules.battlers.map((battler, index) => vectorBit(
      battler.bounceMove,
      `battlers[${index}].bounceMove`,
    ))),
    ppNotAffectedByPressure: Object.freeze(rules.battlers.map((battler, index) => vectorBit(
      battler.ppNotAffectedByPressure,
      `battlers[${index}].ppNotAffectedByPressure`,
    ))),
    battlersCount: rules.battleTopology.battlersCount,
    battleTypeFlags: rules.battleTopology.battleTypeFlags >>> 0,
    currentTurnActionNumber: rules.currentTurnActionNumber,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

assert(BATTLE_TYPE_DOUBLE === 0x0000_0001, `BATTLE_TYPE_DOUBLE drifted to ${BATTLE_TYPE_DOUBLE}`);
for (const flag of BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN) assertU32(flag, "battle type flag edge");
for (const count of BATTLERS_COUNT_DOMAIN) {
  const flags = count === 2 ? SINGLES_FLAG_EDGE_DOMAIN : DOUBLES_FLAG_EDGE_DOMAIN;
  assert(flags.every((value) => ((value & BATTLE_TYPE_DOUBLE) !== 0) === (count === 4)), "flag edge topology mismatch");
}
for (const endpoint of [0, U8_MAX]) {
  const rules = canonicalRulesFromProjection(makeProjection({
    battlersCount: 4,
    battleTypeFlags: U32_MAX,
    currentTurnActionNumber: endpoint,
  }));
  assert(rules.currentTurnActionNumber === endpoint, `canonical constructor lost u8 endpoint ${endpoint}`);
  assert(rules.battleTopology.battleTypeFlags === U32_MAX, "canonical constructor lost u32 max flag word");
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === 1, `expected exactly one ${OPCODE_NAME} instruction, got ${instructions.length}`);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, `expected opcode ${OPCODE_ID}, got ${instruction.opcodeId}`);
assert(instruction.dispatcher === DISPATCHER, `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`);
assert(instruction.source.label === ENTRY_LABEL, `expected source label ${ENTRY_LABEL}, got ${instruction.source.label}`);
assert(instruction.operands.length === 1, "canonical opcode must have one failure pointer");
assert(instruction.operands[0]?.widthBytes === 4, "canonical failure pointer must be four bytes");
assert(
  instruction.operands[0]?.expression === FAILURE_POINTER,
  `canonical failure pointer drifted to ${instruction.operands[0]?.expression}`,
);

const handlers = opcodeModule.createBattleScriptTrysetmagiccoatOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical TRYSETMAGICCOAT handler was not registered");

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "fail-jump";
  throw new Error(`canonical handler returned unsupported control ${transition.control.kind}`);
}

function assertCanonicalStep(priorRules, transition) {
  const attacker = priorRules.selectorRoles.attacker;
  assert(attacker !== null, "successful canonical handler had no attacker");
  const actingLast = priorRules.currentTurnActionNumber
    === priorRules.battleTopology.battlersCount - 1;
  const control = controlFromTransition(transition);
  const nextRules = transition.rulesContext;

  assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");
  assert(nextRules !== priorRules, "canonical handler must replace rules on every valid branch");
  assert(
    control === (actingLast ? "fail-jump" : "advance"),
    `canonical control did not match acting-last equality (${actingLast})`,
  );
  assert(nextRules.battleTopology === priorRules.battleTopology, "canonical handler replaced topology");
  assert(
    nextRules.currentTurnActionNumber === priorRules.currentTurnActionNumber,
    "canonical handler changed currentTurnActionNumber",
  );
  assert(nextRules.selectorRoles !== priorRules.selectorRoles, "canonical handler did not replace selector roles");
  assert(nextRules.selectorRoles.attacker === attacker, "canonical handler changed attacker role");
  assert(nextRules.selectorRoles.target === attacker, "canonical handler did not overwrite target with attacker");
  assert(
    nextRules.selectorRoles.effectBattler === priorRules.selectorRoles.effectBattler,
    "canonical handler changed effectBattler selector sibling",
  );
  assert(
    nextRules.selectorRoles.fainted === priorRules.selectorRoles.fainted,
    "canonical handler changed fainted selector sibling",
  );
  assert(nextRules.battlers !== priorRules.battlers, "canonical handler did not replace battler collection");
  for (const battler of ATTACKER_DOMAIN) {
    if (battler === attacker) {
      assert(nextRules.battlers[battler] !== priorRules.battlers[battler], `canonical handler did not replace attacker ${battler}`);
      assert(
        nextRules.battlers[battler].ppNotAffectedByPressure === 1,
        `canonical handler did not exempt attacker ${battler} PP from Pressure`,
      );
      assert(
        nextRules.battlers[battler].bounceMove === (actingLast
          ? priorRules.battlers[battler].bounceMove
          : 1),
        `canonical handler did not preserve/arm attacker ${battler} bounceMove`,
      );
    } else {
      assert(
        nextRules.battlers[battler] === priorRules.battlers[battler],
        `canonical handler replaced sibling battler ${battler}`,
      );
    }
  }
  return control;
}

function sourceOutcome(initialProjection, applications) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
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
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(
        sameState(vectorState(currentRules), currentSnapshot),
        "canonical handler mutated current rules",
      );
      controls.push(assertCanonicalStep(currentRules, transition));
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input rules");
    return Object.freeze({ expected: null, controls: Object.freeze(controls), error: error.message });
  }
}

function branchFor(initial, outcome) {
  if (outcome.error !== null) return "missing-attacker-role";
  return outcome.controls.join("-then-");
}

const cases = [];
function addCase(label, category, initial, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be one or two`);
  const outcome = sourceOutcome(initial, applications);
  if (initial.attacker === null) {
    assert(
      outcome.error === "Battle Script hit-chain command requires a attacker role",
      `${label}: missing attacker error drifted to ${String(outcome.error)}`,
    );
    assert(outcome.expected === null, `${label}: missing attacker produced output`);
    assert(outcome.controls.length === 0, `${label}: missing attacker produced a control`);
  } else {
    assert(outcome.error === null, `${label}: valid attacker threw ${String(outcome.error)}`);
    assert(outcome.expected !== null, `${label}: valid attacker omitted output`);
    assert(outcome.controls.length === applications, `${label}: application count drifted`);
  }
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(initial, outcome),
    applications,
    initial: vectorState(canonicalRulesFromProjection(initial)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

let validReachableIndex = 0;
for (const battlersCount of BATTLERS_COUNT_DOMAIN) {
  const topologyName = battlersCount === 2 ? "singles" : "doubles";
  const flagDomain = battlersCount === 2 ? SINGLES_FLAG_EDGE_DOMAIN : DOUBLES_FLAG_EDGE_DOMAIN;
  for (const attacker of ATTACKER_DOMAIN.slice(0, battlersCount)) {
    for (let currentTurnActionNumber = 0;
      currentTurnActionNumber < battlersCount;
      currentTurnActionNumber += 1) {
      addCase(
        `valid_${topologyName}_a${attacker}_action${currentTurnActionNumber}`,
        "valid-singles-doubles-attacker-action-boundary-matrix",
        makeProjection({
          bounceMoves: bitPattern(validReachableIndex, 1),
          ppNotAffectedByPressure: bitPattern(validReachableIndex, 2),
          battlersCount,
          battleTypeFlags: flagDomain[validReachableIndex % flagDomain.length],
          currentTurnActionNumber,
          attacker,
          target: OPTIONAL_BATTLER_DOMAIN[validReachableIndex % OPTIONAL_BATTLER_DOMAIN.length],
          effectBattler: OPTIONAL_BATTLER_DOMAIN[(validReachableIndex + 1) % OPTIONAL_BATTLER_DOMAIN.length],
          fainted: OPTIONAL_BATTLER_DOMAIN[(validReachableIndex + 2) % OPTIONAL_BATTLER_DOMAIN.length],
        }),
      );
      validReachableIndex += 1;
    }
  }
}

for (const [topologyIndex, battlersCount] of BATTLERS_COUNT_DOMAIN.entries()) {
  const flagDomain = battlersCount === 2 ? SINGLES_FLAG_EDGE_DOMAIN : DOUBLES_FLAG_EDGE_DOMAIN;
  for (const currentTurnActionNumber of CURRENT_TURN_ACTION_NUMBER_DOMAIN) {
    addCase(
      `action_u8_${battlersCount}_${currentTurnActionNumber}`,
      "current-turn-action-u8-full-domain-by-topology",
      makeProjection({
        bounceMoves: bitPattern(currentTurnActionNumber, topologyIndex + 3),
        ppNotAffectedByPressure: bitPattern(currentTurnActionNumber, topologyIndex + 11),
        battlersCount,
        battleTypeFlags: flagDomain[currentTurnActionNumber % flagDomain.length],
        currentTurnActionNumber,
        attacker: 0,
        target: OPTIONAL_BATTLER_DOMAIN[(currentTurnActionNumber + topologyIndex) % OPTIONAL_BATTLER_DOMAIN.length],
        effectBattler: OPTIONAL_BATTLER_DOMAIN[(currentTurnActionNumber + topologyIndex + 1) % OPTIONAL_BATTLER_DOMAIN.length],
        fainted: OPTIONAL_BATTLER_DOMAIN[(currentTurnActionNumber + topologyIndex + 2) % OPTIONAL_BATTLER_DOMAIN.length],
      }),
    );
  }
}

let selectorIndex = 0;
for (const attacker of ATTACKER_DOMAIN) {
  for (const target of OPTIONAL_BATTLER_DOMAIN) {
    for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
      for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
        addCase(
          `selector_a${attacker}_t${target ?? "none"}_e${effectBattler ?? "none"}_f${fainted ?? "none"}`,
          "complete-attacker-target-effect-fainted-selector-matrix",
          makeProjection({
            bounceMoves: bitPattern(selectorIndex, 23),
            ppNotAffectedByPressure: bitPattern(selectorIndex, 47),
            battlersCount: 4,
            battleTypeFlags: DOUBLES_FLAG_EDGE_DOMAIN[selectorIndex % DOUBLES_FLAG_EDGE_DOMAIN.length],
            currentTurnActionNumber: attacker,
            attacker,
            target,
            effectBattler,
            fainted,
          }),
        );
        selectorIndex += 1;
      }
    }
  }
}

for (let packedBits = 0; packedBits <= U8_MAX; packedBits += 1) {
  const battlersCount = (packedBits & 0x80) === 0 ? 2 : 4;
  const actingLast = (packedBits & 0x40) !== 0;
  const attacker = packedBits % battlersCount;
  const currentTurnActionNumber = actingLast
    ? battlersCount - 1
    : (packedBits % (battlersCount - 1));
  const flagDomain = battlersCount === 2 ? SINGLES_FLAG_EDGE_DOMAIN : DOUBLES_FLAG_EDGE_DOMAIN;
  addCase(
    `prior_bits_${packedBits}`,
    "complete-per-battler-bounce-and-pp-prior-bit-matrix",
    makeProjection({
      bounceMoves: nibbleBits(packedBits, false),
      ppNotAffectedByPressure: nibbleBits(packedBits, true),
      battlersCount,
      battleTypeFlags: flagDomain[packedBits % flagDomain.length],
      currentTurnActionNumber,
      attacker,
      target: OPTIONAL_BATTLER_DOMAIN[packedBits % OPTIONAL_BATTLER_DOMAIN.length],
      effectBattler: OPTIONAL_BATTLER_DOMAIN[(packedBits + 3) % OPTIONAL_BATTLER_DOMAIN.length],
      fainted: OPTIONAL_BATTLER_DOMAIN[(packedBits + 1) % OPTIONAL_BATTLER_DOMAIN.length],
    }),
  );
}

const topologyFlagEdges = Object.freeze([
  ...SINGLES_FLAG_EDGE_DOMAIN.map((battleTypeFlags) => Object.freeze({ battlersCount: 2, battleTypeFlags })),
  ...DOUBLES_FLAG_EDGE_DOMAIN.map((battleTypeFlags) => Object.freeze({ battlersCount: 4, battleTypeFlags })),
]);
for (const [edgeIndex, edge] of topologyFlagEdges.entries()) {
  const actingLast = (edgeIndex & 1) !== 0;
  addCase(
    `u32_battle_type_flags_edge_${edgeIndex}`,
    "battle-type-flags-u32-edge-preservation",
    makeProjection({
      bounceMoves: bitPattern(edgeIndex, 59),
      ppNotAffectedByPressure: bitPattern(edgeIndex, 61),
      battlersCount: edge.battlersCount,
      battleTypeFlags: edge.battleTypeFlags,
      currentTurnActionNumber: actingLast ? edge.battlersCount - 1 : 0,
      attacker: edgeIndex % edge.battlersCount,
      target: OPTIONAL_BATTLER_DOMAIN[(edgeIndex + 1) % OPTIONAL_BATTLER_DOMAIN.length],
      effectBattler: OPTIONAL_BATTLER_DOMAIN[(edgeIndex + 2) % OPTIONAL_BATTLER_DOMAIN.length],
      fainted: OPTIONAL_BATTLER_DOMAIN[(edgeIndex + 3) % OPTIONAL_BATTLER_DOMAIN.length],
    }),
  );
}

addCase(
  "missing_attacker_with_all_selector_siblings_present_errors_before_state_reads",
  "ordered-missing-attacker-role-errors",
  makeProjection({
    bounceMoves: [1, 0, 1, 0],
    ppNotAffectedByPressure: [0, 1, 0, 1],
    battlersCount: 4,
    battleTypeFlags: U32_MAX,
    currentTurnActionNumber: U8_MAX,
    attacker: null,
    target: 3,
    effectBattler: 2,
    fainted: 1,
  }),
);
addCase(
  "missing_attacker_with_null_target_and_selector_siblings_errors_exactly",
  "ordered-missing-attacker-role-errors",
  makeProjection({
    bounceMoves: [0, 1, 1, 0],
    ppNotAffectedByPressure: [1, 0, 0, 1],
    battlersCount: 2,
    battleTypeFlags: 0xffff_fffe,
    currentTurnActionNumber: 1,
    attacker: null,
    target: null,
    effectBattler: null,
    fainted: 3,
  }),
);
addCase(
  "missing_attacker_on_last_double_action_has_no_fail_control_or_mutation",
  "ordered-missing-attacker-role-errors",
  makeProjection({
    bounceMoves: [1, 1, 0, 0],
    ppNotAffectedByPressure: [0, 0, 1, 1],
    battlersCount: 4,
    battleTypeFlags: 0x8000_0001,
    currentTurnActionNumber: 3,
    attacker: null,
    target: 0,
    effectBattler: 1,
    fainted: null,
  }),
);

addCase(
  "explicit_attacker_target_alias_preserves_selector_siblings_and_arms_nonlast",
  "explicit-alias-target-overwrite",
  makeProjection({
    bounceMoves: [0, 1, 0, 1],
    ppNotAffectedByPressure: [1, 0, 1, 0],
    battlersCount: 4,
    battleTypeFlags: 0xffff_ffff,
    currentTurnActionNumber: 2,
    attacker: 2,
    target: 2,
    effectBattler: 2,
    fainted: 2,
  }),
);
addCase(
  "repeated_nonlast_application_advances_twice_arms_bounce_and_is_value_idempotent",
  "repeated-nonlast-application",
  makeProjection({
    bounceMoves: [0, 1, 0, 1],
    ppNotAffectedByPressure: [0, 1, 0, 1],
    battlersCount: 4,
    battleTypeFlags: 0x0100_0001,
    currentTurnActionNumber: 2,
    attacker: 2,
    target: null,
    effectBattler: 1,
    fainted: 3,
  }),
  2,
);
addCase(
  "repeated_acting_last_application_fail_jumps_twice_sets_pp_and_preserves_bounce",
  "repeated-acting-last-application",
  makeProjection({
    bounceMoves: [1, 0, 1, 0],
    ppNotAffectedByPressure: [0, 1, 0, 1],
    battlersCount: 2,
    battleTypeFlags: 0x8000_0000,
    currentTurnActionNumber: 1,
    attacker: 1,
    target: 0,
    effectBattler: null,
    fainted: 3,
  }),
  2,
);

const VALID_REACHABLE_CASE_COUNT = 20;
const FULL_ACTION_DOMAIN_CASE_COUNT = BATTLERS_COUNT_DOMAIN.length * CURRENT_TURN_ACTION_NUMBER_DOMAIN.length;
const SELECTOR_MATRIX_CASE_COUNT = ATTACKER_DOMAIN.length * OPTIONAL_BATTLER_DOMAIN.length ** 3;
const PRIOR_BIT_MATRIX_CASE_COUNT = U8_MAX + 1;
const FLAG_EDGE_CASE_COUNT = BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN.length;
const MISSING_ATTACKER_CASE_COUNT = 3;
const REPEATED_CASE_COUNT = 2;
assert(VALID_REACHABLE_CASE_COUNT === 20, `valid reachable case count drifted to ${VALID_REACHABLE_CASE_COUNT}`);
assert(FULL_ACTION_DOMAIN_CASE_COUNT === 512, `full action domain case count drifted to ${FULL_ACTION_DOMAIN_CASE_COUNT}`);
assert(SELECTOR_MATRIX_CASE_COUNT === 500, `selector matrix case count drifted to ${SELECTOR_MATRIX_CASE_COUNT}`);
assert(PRIOR_BIT_MATRIX_CASE_COUNT === 256, `prior bit matrix case count drifted to ${PRIOR_BIT_MATRIX_CASE_COUNT}`);
assert(FLAG_EDGE_CASE_COUNT === 8, `flag edge case count drifted to ${FLAG_EDGE_CASE_COUNT}`);
assert(
  cases.length === VALID_REACHABLE_CASE_COUNT
    + FULL_ACTION_DOMAIN_CASE_COUNT
    + SELECTOR_MATRIX_CASE_COUNT
    + PRIOR_BIT_MATRIX_CASE_COUNT
    + FLAG_EDGE_CASE_COUNT
    + MISSING_ATTACKER_CASE_COUNT
    + 1
    + REPEATED_CASE_COUNT,
  `case count drifted to ${cases.length}`,
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["selector-role-values-including-null", OPTIONAL_BATTLER_DOMAIN.length],
  ["canonical-battlers-count-values", BATTLERS_COUNT_DOMAIN.length],
  ["singles-valid-attacker-values", 2],
  ["doubles-valid-attacker-values", 4],
  ["current-turn-action-number-u8-values", U8_MAX + 1],
  ["current-turn-action-u8-full-domain-probes", FULL_ACTION_DOMAIN_CASE_COUNT],
  ["valid-reachable-topology-attacker-action-cases", VALID_REACHABLE_CASE_COUNT],
  ["complete-selector-matrix-cases", SELECTOR_MATRIX_CASE_COUNT],
  ["per-battler-bounce-pp-bit-combinations", PRIOR_BIT_MATRIX_CASE_COUNT],
  ["battle-type-flags-u32-edge-values", FLAG_EDGE_CASE_COUNT],
  ["typed-missing-attacker-role-cases", MISSING_ATTACKER_CASE_COUNT],
  ["application-count-values", 2],
  ["target-role-required-by-handler", 0],
  ["failure-pointer-fields-in-projection", 0],
  ["absolute-program-counter-fields-in-projection", 0],
  ["abi-exports-added", 0],
  ["unsupported-barriers-added", 0],
  ["generated-file-byte-limit-exclusive", GENERATED_FILE_MAX_BYTES],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  optionalBattlerDomain: OPTIONAL_BATTLER_DOMAIN,
  battlersCountDomain: BATTLERS_COUNT_DOMAIN,
  currentTurnActionNumberDomain: CURRENT_TURN_ACTION_NUMBER_DOMAIN,
  battleTypeFlagsU32EdgeDomain: BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN,
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
  return `BattleScriptTrysetmagiccoatBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustU32(value) {
  return `0x${value.toString(16).padStart(8, "0")}`;
}

function rustState(value) {
  return [
    "BattleScriptTrysetmagiccoatVectorState {",
    `bounce_moves: [${value.bounceMoves.join(", ")}],`,
    `pp_not_affected_by_pressure: [${value.ppNotAffectedByPressure.join(", ")}],`,
    `battlers_count: ${value.battlersCount},`,
    `battle_type_flags: ${rustU32(value.battleTypeFlags)},`,
    `current_turn_action_number: ${value.currentTurnActionNumber},`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `effect_battler: ${rustOptionalBattler(value.effectBattler)},`,
    `fainted: ${rustOptionalBattler(value.fainted)},`,
    "}",
  ].join(" ");
}

function rustOptionalState(value) {
  return value === null ? "None" : `Some(${rustState(value)})`;
}

function rustOptionalString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}

function rustControls(values) {
  return "&[" + values.map((value) => (
    value === "advance"
      ? "BattleScriptTrysetmagiccoatControl::Advance"
      : "BattleScriptTrysetmagiccoatControl::FailJump"
  )).join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysetmagiccoat-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrysetmagiccoatOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysetmagiccoat::{");
lines.push("    BattleScriptTrysetmagiccoatBattler, BattleScriptTrysetmagiccoatControl,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_ATTACKER_DOMAIN: [u8; ${ATTACKER_DOMAIN.length}] = [${ATTACKER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLERS_COUNT_DOMAIN: [u8; ${BATTLERS_COUNT_DOMAIN.length}] = [${BATTLERS_COUNT_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_CURRENT_TURN_ACTION_NUMBER_DOMAIN: [u8; ${CURRENT_TURN_ACTION_NUMBER_DOMAIN.length}] = [${CURRENT_TURN_ACTION_NUMBER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN: [u32; ${BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN.length}] = [${BATTLE_TYPE_FLAGS_U32_EDGE_DOMAIN.map(rustU32).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetmagiccoatVectorState {");
lines.push("    pub bounce_moves: [u8; 4],");
lines.push("    pub pp_not_affected_by_pressure: [u8; 4],");
lines.push("    pub battlers_count: u8,");
lines.push("    pub battle_type_flags: u32,");
lines.push("    pub current_turn_action_number: u8,");
lines.push("    pub attacker: Option<BattleScriptTrysetmagiccoatBattler>,");
lines.push("    pub target: Option<BattleScriptTrysetmagiccoatBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptTrysetmagiccoatBattler>,");
lines.push("    pub fainted: Option<BattleScriptTrysetmagiccoatBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetmagiccoatVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptTrysetmagiccoatVectorState,");
lines.push("    pub expected: Option<BattleScriptTrysetmagiccoatVectorState>,");
lines.push("    pub controls: &'static [BattleScriptTrysetmagiccoatControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETMAGICCOAT_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSETMAGICCOAT_CASES: [BattleScriptTrysetmagiccoatVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetmagiccoatVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        applications: ${value.applications},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        controls: ${rustControls(value.controls)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];");

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
if (!formatted) throw new Error("gen-battle-script-trysetmagiccoat-vectors: could not find rustfmt");

const generated = fs.readFileSync(outPath);
assert(
  generated.byteLength < GENERATED_FILE_MAX_BYTES,
  `generated file is ${generated.byteLength} bytes, not below ${GENERATED_FILE_MAX_BYTES}`,
);
const generatedHash = crypto.createHash("sha256").update(generated).digest("hex");
console.log(`gen-battle-script-trysetmagiccoat-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-trysetmagiccoat-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-trysetmagiccoat-vectors: ${generated.byteLength} generated bytes`);
console.log(`gen-battle-script-trysetmagiccoat-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-trysetmagiccoat-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-trysetmagiccoat-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-trysetmagiccoat-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-trysetmagiccoat-vectors: generated sha256 ${generatedHash}`);
