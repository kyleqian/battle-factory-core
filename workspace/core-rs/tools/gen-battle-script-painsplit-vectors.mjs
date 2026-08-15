#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptPainSplitOpcode.ts.
// Expected controls, complete narrow projections, registration outcomes, and
// exact ordered errors are created only by executing the canonical TypeScript
// handler. This script owns bounded input construction and Rust literal
// emission; it does not reimplement expected Pain Split results.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-painsplit-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_painsplit_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptPainSplitOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_PAINSPLITDMGCALC";
const OPCODE_ID = 0xa5;
const DISPATCHER = "Cmd_painsplitdmgcalc";
const ENTRY_LABEL = "BattleScript_EffectPainSplit";
const FAILURE_LABEL = "BattleScript_ButItFailed";
const SUBSTITUTE = 1 << 24;
const IGNORE_SHELL_BELL = 0xffff;
const BATTLE_SLOTS = 4;
const U8_MAX = 0xff;
const U16_MAX = 0xffff;
const I32_MIN = -0x8000_0000;
const I32_MAX = 0x7fff_ffff;
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLERS = Object.freeze([null, ...BATTLERS]);
const STATUS2_EDGE_DOMAIN = Object.freeze([
  0,
  SUBSTITUTE,
  SUBSTITUTE | 1,
  0x8000_0000,
  0xffff_ffff,
]);
const SIGNED_EDGE_DOMAIN = Object.freeze([
  I32_MIN,
  -65_535,
  -1,
  0,
  1,
  65_535,
  I32_MAX,
]);
const U16_ARITHMETIC_DOMAIN = Object.freeze([
  0, 1, 2, 3, 4, 5, 6, 7,
  0x7ffe, 0x7fff, 0x8000, 0x8001, 0xfffe, 0xffff,
]);
// The complete 5^4 selector matrix deliberately costs more than the smaller
// single-role leaves, while remaining below the neighboring Try Heal Half
// Health corpus and well below an unbounded u16 cross product.
const GENERATED_FILE_MAX_BYTES = 14_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-painsplit-vectors: ${message}`);
}

function u8(salt) {
  return ((salt * 37) ^ (salt >>> 3) ^ 0xa5) & U8_MAX;
}

function u16(salt) {
  return ((salt * 1_009) ^ (salt * 13) ^ 0xa55a) & U16_MAX;
}

function u32(salt) {
  return ((salt * 0x1020_4081) ^ (salt << 17) ^ 0x8100_1001) >>> 0;
}

function i32(salt) {
  return u32(salt) | 0;
}

function roleLabel(value) {
  return value === null ? "none" : `b${value}`;
}

function makeSpecialStatus(salt, shellBellDmg = i32(salt + 4)) {
  return Object.freeze({
    restoredBattlerSprite: u8(salt + 1) & 1,
    focusBanded: u8(salt + 2) & 1,
    shellBellDmg,
    physicalDmg: i32(salt + 5),
    specialDmg: i32(salt + 6),
  });
}

function makeBattler(index, salt, hp = u16(salt + index * 7), maxHp = u16(salt + index * 11), status2 = u32(salt + index * 13), specialStatus = makeSpecialStatus(salt + index * 17)) {
  return Object.freeze({
    side: (index + salt) & 1,
    ability: u8(salt + index * 3 + 1),
    hp,
    maxHp,
    status1: u32(salt + index * 19 + 2),
    status2,
    status3: u32(salt + index * 23 + 3),
    specialStatus,
    moves: Object.freeze([u16(salt + index * 29 + 4), u16(salt + index * 31 + 5), u16(salt + index * 37 + 6), u16(salt + index * 41 + 7)]),
    pp: Object.freeze([u8(salt + index * 43 + 8), u8(salt + index * 47 + 9), u8(salt + index * 53 + 10), u8(salt + index * 59 + 11)]),
    substituteHp: u8(salt + index * 61 + 12),
    rolloutTimer: u8(salt + index * 67 + 13) & 0x0f,
    furyCutterCounter: u8(salt + index * 71 + 14),
    truantCounter: u8(salt + index * 73 + 15) & 1,
    rechargeTimer: u8(salt + index * 79 + 16),
    flinchImmobility: u8(salt + index * 83 + 17) & 1,
    disabledMove: u16(salt + index * 89 + 18),
    usedDisabledMove: u8(salt + index * 97 + 19) & 1,
    tauntTimer: u8(salt + index * 101 + 20) & 0x0f,
    usedTauntedMove: u8(salt + index * 103 + 21) & 1,
    usedImprisonedMove: u8(salt + index * 107 + 22) & 1,
    item: u16(salt + index * 109 + 23),
    statStages: Object.freeze(Array.from({ length: 8 }, (_unused, stat) => ((salt + index + stat) % 13) - 6)),
    partyIndex: (salt + index) % 6,
    speed: u16(salt + index * 113 + 24),
  });
}

function makeSiblings(salt) {
  return Object.freeze({
    scriptingBattler: BATTLERS[salt & 3],
    battlerWithAbility: BATTLERS[(salt + 1) & 3],
    atkCancelerTracker: u8(salt + 1),
    battleOutcome: u8(salt + 2),
    currentMove: [105, 135][salt & 1],
    currentMovePosition: salt & 3,
    moveResultFlags: u8(salt + 3),
    dmgMultiplier: u8(salt + 4),
    critMultiplier: u8(salt + 5),
    moveEffectByte: u8(salt + 6),
    missType: u8(salt + 7),
    hitMarker: u32(salt + 8),
    multiHitCounter: u8(salt + 9),
    multiHitStringCounter: u8(salt + 10),
    multistringChooser: u8(salt + 11),
    dynamicBasePower: u16(salt + 12),
    hpDealt: i32(salt + 13),
    bideDmg: Object.freeze(BATTLERS.map((battler) => i32(salt + battler * 17 + 14))),
    lockedMoves: Object.freeze(BATTLERS.map((battler) => u16(salt + battler * 19 + 18))),
    sideStatuses: Object.freeze([u32(salt + 22), u32(salt + 23)]),
    weather: u32(salt + 24),
    weatherTimer: u8(salt + 25),
  });
}

function makeProjection({
  salt,
  attacker = 0,
  target = 1,
  effectBattler = 2,
  fainted = 3,
  attackerHp = 100,
  targetHp = 50,
  targetStatus2 = 0,
  targetSpecialStatus = undefined,
  painSplitHp = i32(salt + 1),
  battleMoveDamage = i32(salt + 2),
}) {
  assert(BATTLERS.includes(attacker) || attacker === null, `invalid attacker ${attacker}`);
  assert(BATTLERS.includes(target) || target === null, `invalid target ${target}`);
  const battlers = BATTLERS.map((battler) => makeBattler(battler, salt + battler * 101));
  if (attacker !== null) {
    battlers[attacker] = makeBattler(attacker, salt + attacker * 101, attackerHp, u16(salt + attacker * 107), u32(salt + attacker * 109));
  }
  if (target !== null) {
    battlers[target] = makeBattler(
      target,
      salt + target * 101,
      targetHp,
      u16(salt + target * 107),
      targetStatus2 >>> 0,
      targetSpecialStatus ?? makeSpecialStatus(salt + target * 131),
    );
  }
  return Object.freeze({
    battlers: Object.freeze(battlers),
    attacker,
    target,
    effectBattler,
    fainted,
    painSplitHp,
    battleMoveDamage,
    siblings: makeSiblings(salt),
  });
}

function canonicalBattler(value, index) {
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: value.hp,
    maxHP: value.maxHp,
    moves: value.moves,
    pp: value.pp,
    status1: value.status1,
    status2: value.status2,
    status3: value.status3,
    specialStatus: value.specialStatus,
    substituteHP: value.substituteHp,
    rolloutTimer: value.rolloutTimer,
    furyCutterCounter: value.furyCutterCounter,
    truantCounter: value.truantCounter,
    rechargeTimer: value.rechargeTimer,
    flinchImmobility: value.flinchImmobility,
    disabledMove: value.disabledMove,
    usedDisabledMove: value.usedDisabledMove,
    tauntTimer: value.tauntTimer,
    usedTauntedMove: value.usedTauntedMove,
    usedImprisonedMove: value.usedImprisonedMove,
    item: value.item,
    statStages: value.statStages,
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    attack: 100 + index,
    defense: 110 + index,
    spAttack: 120 + index,
    spDefense: 130 + index,
    speed: value.speed,
    level: 50,
    friendship: 70,
    partyIndex: value.partyIndex,
    isFirstTurn: 0,
  });
}

function canonicalRulesFromProjection(value) {
  const siblings = value.siblings;
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(value.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: value.attacker,
      target: value.target,
      effectBattler: value.effectBattler,
      fainted: value.fainted,
    }),
    scriptingBattler: siblings.scriptingBattler,
    battlerWithAbility: siblings.battlerWithAbility,
    atkCancelerTracker: siblings.atkCancelerTracker,
    battleOutcome: siblings.battleOutcome,
    currentMove: siblings.currentMove,
    currentMovePosition: siblings.currentMovePosition,
    moveResultFlags: siblings.moveResultFlags,
    dmgMultiplier: siblings.dmgMultiplier,
    critMultiplier: siblings.critMultiplier,
    moveEffectByte: siblings.moveEffectByte,
    missType: siblings.missType,
    hitMarker: siblings.hitMarker,
    multiHitCounter: siblings.multiHitCounter,
    multiHitStringCounter: siblings.multiHitStringCounter,
    multistringChooser: siblings.multistringChooser,
    painSplitHp: value.painSplitHp,
    battleMoveDamage: value.battleMoveDamage,
    dynamicBasePower: siblings.dynamicBasePower,
    hpDealt: siblings.hpDealt,
    bideDmg: siblings.bideDmg,
    lockedMoves: siblings.lockedMoves,
    sideStatuses: siblings.sideStatuses,
    weather: siblings.weather,
    weatherTimer: siblings.weatherTimer,
  });
}

function vectorSpecialStatus(value) {
  return Object.freeze({
    restoredBattlerSprite: value.restoredBattlerSprite,
    focusBanded: value.focusBanded,
    shellBellDmg: value.shellBellDmg,
    physicalDmg: value.physicalDmg,
    specialDmg: value.specialDmg,
  });
}

function vectorBattler(value) {
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: value.hp,
    maxHp: value.maxHP,
    status1: value.status1 >>> 0,
    status2: value.status2 >>> 0,
    status3: value.status3 >>> 0,
    specialStatus: vectorSpecialStatus(value.specialStatus),
    moves: Object.freeze([...value.moves]),
    pp: Object.freeze([...value.pp]),
    substituteHp: value.substituteHP,
    rolloutTimer: value.rolloutTimer,
    furyCutterCounter: value.furyCutterCounter,
    truantCounter: value.truantCounter,
    rechargeTimer: value.rechargeTimer,
    flinchImmobility: value.flinchImmobility,
    disabledMove: value.disabledMove,
    usedDisabledMove: value.usedDisabledMove,
    tauntTimer: value.tauntTimer,
    usedTauntedMove: value.usedTauntedMove,
    usedImprisonedMove: value.usedImprisonedMove,
    item: value.item,
    statStages: Object.freeze([...value.statStages]),
    partyIndex: value.partyIndex,
    speed: value.speed,
  });
}

function vectorSiblings(value) {
  return Object.freeze({
    scriptingBattler: value.scriptingBattler,
    battlerWithAbility: value.battlerWithAbility,
    atkCancelerTracker: value.atkCancelerTracker,
    battleOutcome: value.battleOutcome,
    currentMove: value.currentMove,
    currentMoveEffect: value.currentMoveEffect,
    currentMovePosition: value.currentMovePosition,
    moveResultFlags: value.moveResultFlags >>> 0,
    dmgMultiplier: value.dmgMultiplier,
    critMultiplier: value.critMultiplier,
    moveEffectByte: value.moveEffectByte,
    missType: value.missType,
    hitMarker: value.hitMarker >>> 0,
    multiHitCounter: value.multiHitCounter,
    multiHitStringCounter: value.multiHitStringCounter,
    multistringChooser: value.multistringChooser,
    dynamicBasePower: value.dynamicBasePower,
    hpDealt: value.hpDealt,
    bideDmg: Object.freeze([...value.bideDmg]),
    lockedMoves: Object.freeze([...value.lockedMoves]),
    sideStatuses: Object.freeze([...value.sideStatuses]),
    weather: value.weather >>> 0,
    weatherTimer: value.weatherTimer,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattler)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    painSplitHp: rules.painSplitHp,
    battleMoveDamage: rules.battleMoveDamage,
    siblings: vectorSiblings(rules),
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, `expected one canonical ${OPCODE_NAME}, got ${canonicalInstructions.length}`);
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "canonical opcode id drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(canonicalInstruction.operands.length === 1, "canonical operand count drifted");
assert(canonicalInstruction.operands[0].widthBytes === 4, "canonical pointer width drifted");
assert(canonicalInstruction.operands[0].expression === FAILURE_LABEL, "canonical failure label drifted");
const handlers = opcodeModule.createBattleScriptPainSplitOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical handler was not registered");

function freezeInstructionSpec(value = {}) {
  const operandExpressions = value.operandExpressions ?? [FAILURE_LABEL];
  const operandWidths = value.operandWidths ?? [4];
  assert(operandExpressions.length === operandWidths.length, "instruction operand arrays must align");
  return Object.freeze({
    opcodeName: value.opcodeName ?? OPCODE_NAME,
    programCounter: value.programCounter ?? canonicalInstruction.programCounter,
    opcodeId: value.opcodeId ?? OPCODE_ID,
    dispatcher: value.dispatcher ?? DISPATCHER,
    operandExpressions: Object.freeze([...operandExpressions]),
    operandWidths: Object.freeze([...operandWidths]),
  });
}

function sourceInstructionFromSpec(spec) {
  return Object.freeze({
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    opcodeName: spec.opcodeName,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(spec.operandExpressions.map((expression, index) => Object.freeze({
      widthBytes: spec.operandWidths[index],
      expression,
      sourceMacro: canonicalInstruction.operands[0].sourceMacro,
      sourceMacroLine: canonicalInstruction.operands[0].sourceMacroLine,
      wrapperPath: canonicalInstruction.operands[0].wrapperPath,
    }))),
    source: canonicalInstruction.source,
  });
}

function vectorInstruction(sourceInstruction) {
  const failure = sourceInstruction.operands[0];
  const target = failure && failure.widthBytes === 4
    ? programModule.resolveBattleScriptLabel(program, failure.expression)
    : undefined;
  return Object.freeze({
    opcodeName: sourceInstruction.opcodeName,
    programCounter: sourceInstruction.programCounter,
    opcodeId: sourceInstruction.opcodeId,
    dispatcher: sourceInstruction.dispatcher,
    operandWidths: Object.freeze(sourceInstruction.operands.map((operand) => operand.widthBytes)),
    operandExpressions: Object.freeze(sourceInstruction.operands.map((operand) => operand.expression)),
    resolvedFailureTarget: target ? failure.expression : null,
  });
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "fail-jump";
  throw new Error(`canonical handler returned unsupported control ${transition.control.kind}`);
}

function assertCanonicalTransition(currentRules, sourceInstruction, transition) {
  const attacker = currentRules.selectorRoles.attacker;
  const target = currentRules.selectorRoles.target;
  assert(attacker !== null && target !== null, "successful handler omitted a required role");
  assert(transition.scheduler === undefined || transition.scheduler !== null, "canonical scheduler unexpectedly absent");
  assert(transition.rng !== undefined, "canonical RNG unexpectedly absent");
  assert(transition.events.length === 0, "Pain Split emitted an event");
  const targetState = currentRules.battlers[target];
  const control = controlFromTransition(transition);
  if ((targetState.status2 & SUBSTITUTE) !== 0) {
    assert(control === "fail-jump", "target Substitute must jump");
    assert(transition.rulesContext === currentRules, "target Substitute must make no state write");
    const failure = programModule.resolveBattleScriptLabel(program, sourceInstruction.operands[0].expression);
    assert(failure && transition.control.programCounter === failure.programCounter, "Substitute jump did not resolve its own late pointer");
  } else {
    assert(control === "advance", "non-Substitute must advance");
    assert(transition.rulesContext !== currentRules, "non-Substitute must replace its rules context");
    assert(transition.rulesContext.selectorRoles === currentRules.selectorRoles, "Pain Split changed selector roles");
    assert(transition.rulesContext.battlers !== currentRules.battlers, "Pain Split did not replace target battler array");
    assert(transition.rulesContext.battlers[attacker].hp === currentRules.battlers[attacker].hp, "Pain Split changed attacker HP");
    assert(transition.rulesContext.battlers[target].specialStatus.shellBellDmg === IGNORE_SHELL_BELL, "Pain Split did not ignore target Shell Bell");
  }
  return control;
}

function sourceOutcome(initialProjection, instructionSpec, applications = 1) {
  const sourceInstruction = sourceInstructionFromSpec(instructionSpec);
  const initialRules = canonicalRulesFromProjection(initialProjection);
  const initialSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const before = vectorState(currentRules);
      const state = machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        currentRules,
        (0x5e7d_1b0d + application) >>> 0,
      );
      const transition = handler({ program, instruction: sourceInstruction, state });
      assert(sameState(vectorState(currentRules), before), "canonical handler mutated its input");
      controls.push(assertCanonicalTransition(currentRules, sourceInstruction, transition));
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), initialSnapshot), "canonical handler mutated initial input");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
      instruction: vectorInstruction(sourceInstruction),
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), initialSnapshot), "throwing handler mutated initial input");
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      error: error.message,
      instruction: vectorInstruction(sourceInstruction),
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.controls.join("-then-");
  if (outcome.error.startsWith("invalid B_SCR_OP_PAINSPLITDMGCALC shape at program counter ")) return "invalid-instruction-shape";
  if (outcome.error === "Battle Script hit-chain command requires a attacker role") return "missing-attacker-role";
  if (outcome.error === "Battle Script hit-chain command requires a target role") return "missing-target-role";
  if (outcome.error.startsWith("Cmd_painsplitdmgcalc unresolved failure target ")) return "unresolved-failure-target";
  throw new Error(`unexpected canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, instructionSpec, initialProjection, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((entry) => entry.label === label), `duplicate case ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be one or two`);
  const outcome = sourceOutcome(initialProjection, instructionSpec, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    instruction: outcome.instruction,
    initial: vectorState(canonicalRulesFromProjection(initialProjection)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

const VALID_SPEC = freezeInstructionSpec();
const UNRESOLVED_SPEC = freezeInstructionSpec({ operandExpressions: ["BattleScript_PainSplitMissing"] });

// All 5^4 selector bindings: every concrete source role, null, and every
// attacker/target/effect/fainted alias. Shape is valid and the target has no
// Substitute, so expected ordering is directly visible from canonical output.
for (const attacker of OPTIONAL_BATTLERS) {
  for (const target of OPTIONAL_BATTLERS) {
    for (const effectBattler of OPTIONAL_BATTLERS) {
      for (const fainted of OPTIONAL_BATTLERS) {
        const salt = 1_000 + cases.length;
        addCase(
          `selector_a${roleLabel(attacker)}_t${roleLabel(target)}_e${roleLabel(effectBattler)}_f${roleLabel(fainted)}`,
          "complete-selector-matrix",
          VALID_SPEC,
          makeProjection({ salt, attacker, target, effectBattler, fainted, attackerHp: 100, targetHp: 50 }),
        );
      }
    }
  }
}

// Bounded 14x14 source-u16 matrix hits both endpoints, every parity edge,
// signed-half boundaries, and all positive/negative difference directions;
// role slots rotate rather than multiplying the matrix by all aliases.
for (const [attackerIndex, attackerHp] of U16_ARITHMETIC_DOMAIN.entries()) {
  for (const [targetIndex, targetHp] of U16_ARITHMETIC_DOMAIN.entries()) {
    const attacker = (attackerIndex + targetIndex) & 3;
    const target = (attacker + 1) & 3;
    addCase(
      `u16_arithmetic_a${attackerHp}_t${targetHp}_r${attacker}`,
      "source-u16-arithmetic-endpoint-parity-sign-matrix",
      VALID_SPEC,
      makeProjection({
        salt: 10_000 + attackerIndex * U16_ARITHMETIC_DOMAIN.length + targetIndex,
        attacker,
        target,
        effectBattler: (target + 1) & 3,
        fainted: (target + 2) & 3,
        attackerHp,
        targetHp,
        painSplitHp: SIGNED_EDGE_DOMAIN[(attackerIndex + targetIndex) % SIGNED_EDGE_DOMAIN.length],
        battleMoveDamage: SIGNED_EDGE_DOMAIN[(attackerIndex * 3 + targetIndex) % SIGNED_EDGE_DOMAIN.length],
      }),
    );
  }
}

// The target's packed status2 word is tested at source-relevant edges across
// every attacker/target alias. Nonzero Substitute branches must retain every
// signed global and every SpecialStatus sibling verbatim.
for (const [statusIndex, targetStatus2] of STATUS2_EDGE_DOMAIN.entries()) {
  for (const attacker of BATTLERS) {
    for (const target of BATTLERS) {
      const signed = SIGNED_EDGE_DOMAIN[(statusIndex + attacker + target) % SIGNED_EDGE_DOMAIN.length];
      addCase(
        `substitute_status_${statusIndex}_a${attacker}_t${target}`,
        "packed-status2-substitute-edges-and-no-write-jump",
        VALID_SPEC,
        makeProjection({
          salt: 30_000 + statusIndex * 100 + attacker * 10 + target,
          attacker,
          target,
          effectBattler: target,
          fainted: attacker,
          attackerHp: 101,
          targetHp: 41,
          targetStatus2,
          targetSpecialStatus: makeSpecialStatus(31_000 + statusIndex * 100 + attacker * 10 + target, signed),
          painSplitHp: signed,
          battleMoveDamage: SIGNED_EDGE_DOMAIN[(statusIndex + attacker * 2 + target * 3) % SIGNED_EDGE_DOMAIN.length],
        }),
      );
    }
  }
}

// Each signed source edge appears in both overwritten globals and all three
// signed SpecialStatus siblings; all four actor slots are visited again.
for (const [index, signed] of SIGNED_EDGE_DOMAIN.entries()) {
  const attacker = index & 3;
  const target = (attacker + 2) & 3;
  addCase(
    `signed_siblings_${index}`,
    "signed-prior-globals-shellbell-and-specialstatus-siblings",
    VALID_SPEC,
    makeProjection({
      salt: 40_000 + index,
      attacker,
      target,
      effectBattler: attacker,
      fainted: target,
      attackerHp: 5 + index,
      targetHp: 90 - index,
      targetSpecialStatus: Object.freeze({
        restoredBattlerSprite: index & 1,
        focusBanded: (index + 1) & 1,
        shellBellDmg: signed,
        physicalDmg: SIGNED_EDGE_DOMAIN[(index + 1) % SIGNED_EDGE_DOMAIN.length],
        specialDmg: SIGNED_EDGE_DOMAIN[(index + 2) % SIGNED_EDGE_DOMAIN.length],
      }),
      painSplitHp: signed,
      battleMoveDamage: SIGNED_EDGE_DOMAIN[(index + 3) % SIGNED_EDGE_DOMAIN.length],
    }),
  );
}

// Label resolution is reached only after valid shape and both role lookups,
// and only when the target Substitute test takes the failure branch.
addCase("unresolved_after_valid_roles_and_substitute", "ordered-unresolved-failure-target", UNRESOLVED_SPEC,
  makeProjection({ salt: 50_001, attacker: 0, target: 1, attackerHp: 99, targetHp: 1, targetStatus2: SUBSTITUTE }));
addCase("unresolved_ignored_without_substitute", "ordered-unresolved-failure-target", UNRESOLVED_SPEC,
  makeProjection({ salt: 50_002, attacker: 1, target: 2, attackerHp: 1, targetHp: 99, targetStatus2: 0 }));
addCase("missing_attacker_before_unresolved", "ordered-missing-role-before-label-resolution", UNRESOLVED_SPEC,
  makeProjection({ salt: 50_003, attacker: null, target: 2, targetStatus2: SUBSTITUTE }));
addCase("missing_target_before_unresolved", "ordered-missing-role-before-label-resolution", UNRESOLVED_SPEC,
  makeProjection({ salt: 50_004, attacker: 2, target: null }));

for (const [index, spec] of [
  freezeInstructionSpec({ opcodeId: 0 }),
  freezeInstructionSpec({ dispatcher: "Cmd_not_painsplit" }),
  freezeInstructionSpec({ operandExpressions: [], operandWidths: [] }),
  freezeInstructionSpec({ operandExpressions: [FAILURE_LABEL, "extra"], operandWidths: [4, 1] }),
  freezeInstructionSpec({ operandWidths: [0] }),
  freezeInstructionSpec({ operandWidths: [1] }),
  freezeInstructionSpec({ operandWidths: [2] }),
  freezeInstructionSpec({ operandWidths: [3] }),
].entries()) {
  addCase(
    `malformed_shape_${index}`,
    "invalid-instruction-shape-before-roles",
    spec,
    makeProjection({ salt: 60_000 + index, attacker: null, target: null, effectBattler: null, fainted: null, targetStatus2: SUBSTITUTE }),
  );
}

addCase("repeat_non_substitute", "repeated-advance-is-idempotent", VALID_SPEC,
  makeProjection({ salt: 70_001, attacker: 3, target: 0, effectBattler: 3, fainted: 0, attackerHp: 101, targetHp: 33 }), 2);
addCase("repeat_substitute", "repeated-failure-jump-is-idempotent", VALID_SPEC,
  makeProjection({ salt: 70_002, attacker: 2, target: 2, effectBattler: 2, fainted: 2, attackerHp: 101, targetHp: 33, targetStatus2: SUBSTITUTE }), 2);

function registrationOutcome(specs) {
  const instructions = Object.freeze(specs.map(sourceInstructionFromSpec));
  const syntheticProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptPainSplitOpcodeHandlers(syntheticProgram);
    return Object.freeze({
      expectedBindings: Object.freeze(Object.keys(registered).map(Number).sort((left, right) => left - right)),
      expectedError: null,
    });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ expectedBindings: Object.freeze([]), expectedError: error.message });
  }
}

function registrationBranch(value) {
  if (value.expectedError === null) return "registered";
  if (value.expectedError.startsWith("B_SCR_OP_PAINSPLITDMGCALC requires exactly 1 concrete start, got ")) return "wrong-cardinality";
  if (value.expectedError.startsWith("invalid B_SCR_OP_PAINSPLITDMGCALC shape at program counter ")) return "invalid-shape";
  throw new Error(`unexpected registration error ${value.expectedError}`);
}

const registrationCases = [];
function addRegistrationCase(label, specs) {
  const result = registrationOutcome(specs);
  registrationCases.push(Object.freeze({ label, instructions: Object.freeze(specs), ...result }));
}

addRegistrationCase("zero_matching_names", [freezeInstructionSpec({ opcodeName: "B_SCR_OP_NOP" })]);
addRegistrationCase("two_matching_names_even_if_invalid", [freezeInstructionSpec({ opcodeId: 0 }), freezeInstructionSpec({ dispatcher: "wrong" })]);
addRegistrationCase("three_matching_names", [VALID_SPEC, VALID_SPEC, VALID_SPEC]);
addRegistrationCase("one_valid_with_other_name_ignored", [freezeInstructionSpec({ opcodeName: "B_SCR_OP_NOP" }), VALID_SPEC]);
addRegistrationCase("one_valid", [VALID_SPEC]);
for (const [index, spec] of [
  freezeInstructionSpec({ opcodeId: 0 }),
  freezeInstructionSpec({ dispatcher: "Cmd_not_painsplit" }),
  freezeInstructionSpec({ operandExpressions: [], operandWidths: [] }),
  freezeInstructionSpec({ operandExpressions: [FAILURE_LABEL, "extra"], operandWidths: [4, 1] }),
  freezeInstructionSpec({ operandWidths: [0] }),
  freezeInstructionSpec({ operandWidths: [1] }),
  freezeInstructionSpec({ operandWidths: [2] }),
  freezeInstructionSpec({ operandWidths: [3] }),
].entries()) addRegistrationCase(`one_invalid_shape_${index}`, [spec]);

assert(cases.length > 850 && cases.length < 1_100, `case corpus must remain bounded, got ${cases.length}`);
assert(registrationCases.length === 13, `registration count drifted to ${registrationCases.length}`);

function lineAt(file, line) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const value = lines[line - 1];
  assert(value !== undefined, `${path.basename(file)} has no line ${line}`);
  return value.trim();
}

const decompPath = path.join(workspaceRoot, "reference", "pokeemerald", "src", "battle_script_commands.c");
const macroPath = path.join(workspaceRoot, "reference", "pokeemerald", "asm", "macros", "battle_script.inc");
const scriptSourcePath = path.join(workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s");
const decompDispatchEvidence = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  dispatchLine: 496,
  handlerLine: 8049,
  substituteTestLine: 8051,
  writeShellBellLine: 8063,
});
const macroEvidence = Object.freeze({
  macroName: "painsplitdmgcalc",
  declarationLine: 873,
  opcodeLine: 874,
  pointerLine: 875,
  pointerWidthBytes: 4,
  encodedWidthBytes: 5,
});
const callSiteEvidence = Object.freeze({
  entryLabel: ENTRY_LABEL,
  entryLabelLine: 1239,
  statementLine: 1244,
  failureExpression: FAILURE_LABEL,
  instructionProgramCounter: canonicalInstruction.programCounter,
  concreteCallSites: canonicalInstructions.length,
});
assert(lineAt(decompPath, decompDispatchEvidence.dispatchLine) === "[B_SCR_OP_PAINSPLITDMGCALC]                = Cmd_painsplitdmgcalc,                        //0xA5", "decomp dispatch evidence drifted");
assert(lineAt(decompPath, decompDispatchEvidence.handlerLine) === "static void Cmd_painsplitdmgcalc(void)", "decomp handler evidence drifted");
assert(lineAt(decompPath, decompDispatchEvidence.substituteTestLine) === "if (!(gBattleMons[gBattlerTarget].status2 & STATUS2_SUBSTITUTE))", "decomp Substitute evidence drifted");
assert(lineAt(decompPath, decompDispatchEvidence.writeShellBellLine) === "gSpecialStatuses[gBattlerTarget].shellBellDmg = IGNORE_SHELL_BELL;", "decomp Shell Bell evidence drifted");
assert(lineAt(macroPath, macroEvidence.declarationLine) === ".macro painsplitdmgcalc ptr:req", "macro declaration evidence drifted");
assert(lineAt(macroPath, macroEvidence.opcodeLine) === ".byte B_SCR_OP_PAINSPLITDMGCALC", "macro opcode evidence drifted");
assert(lineAt(macroPath, macroEvidence.pointerLine) === ".4byte \\ptr", "macro pointer evidence drifted");
assert(lineAt(scriptSourcePath, callSiteEvidence.entryLabelLine) === "BattleScript_EffectPainSplit::", "call-site label evidence drifted");
assert(lineAt(scriptSourcePath, callSiteEvidence.statementLine) === "painsplitdmgcalc BattleScript_ButItFailed", "single call-site evidence drifted");

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.freeze([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["optional-selector-role-values", OPTIONAL_BATTLERS.length],
  ["complete-selector-matrix", OPTIONAL_BATTLERS.length ** 4],
  ["source-u16-arithmetic-values", U16_ARITHMETIC_DOMAIN.length],
  ["source-u16-arithmetic-pairs", U16_ARITHMETIC_DOMAIN.length ** 2],
  ["packed-status2-edge-values", STATUS2_EDGE_DOMAIN.length],
  ["signed-source-i32-edge-values", SIGNED_EDGE_DOMAIN.length],
  ["canonical-concrete-call-sites", canonicalInstructions.length],
  ["registration-cases", registrationCases.length],
]);
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, registrationBranch);
const corpus = Object.freeze({
  decompDispatchEvidence,
  macroEvidence,
  callSiteEvidence,
  u16ArithmeticDomain: U16_ARITHMETIC_DOMAIN,
  status2EdgeDomain: STATUS2_EDGE_DOMAIN,
  signedEdgeDomain: SIGNED_EDGE_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

function rustString(value) { return JSON.stringify(value); }
function rustU8(value) { return `0x${value.toString(16).padStart(2, "0")}`; }
function rustU16(value) { return `0x${value.toString(16).padStart(4, "0")}`; }
function rustU32(value) { return `0x${value.toString(16).padStart(8, "0")}`; }
function rustI32(value) { return value === I32_MIN ? "i32::MIN" : value === I32_MAX ? "i32::MAX" : String(value); }
function rustBattler(value) { return `BattleScriptPainSplitBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustSpecialStatus(value) {
  return `BattleScriptPainSplitVectorSpecialStatus { restored_battler_sprite: ${rustU8(value.restoredBattlerSprite)}, focus_banded: ${rustU8(value.focusBanded)}, shell_bell_dmg: ${rustI32(value.shellBellDmg)}, physical_dmg: ${rustI32(value.physicalDmg)}, special_dmg: ${rustI32(value.specialDmg)} }`;
}
function rustBattlerState(value) {
  return "BattleScriptPainSplitVectorBattlerState {"
    + ` side: ${rustU8(value.side)}, ability: ${rustU8(value.ability)}, hp: ${rustU16(value.hp)}, max_hp: ${rustU16(value.maxHp)},`
    + ` status1: ${rustU32(value.status1)}, status2: ${rustU32(value.status2)}, status3: ${rustU32(value.status3)}, special_status: ${rustSpecialStatus(value.specialStatus)},`
    + ` moves: [${value.moves.map(rustU16).join(", ")}], pp: [${value.pp.map(rustU8).join(", ")}], substitute_hp: ${rustU8(value.substituteHp)},`
    + ` rollout_timer: ${rustU8(value.rolloutTimer)}, fury_cutter_counter: ${rustU8(value.furyCutterCounter)}, truant_counter: ${rustU8(value.truantCounter)}, recharge_timer: ${rustU8(value.rechargeTimer)}, flinch_immobility: ${rustU8(value.flinchImmobility)},`
    + ` disabled_move: ${rustU16(value.disabledMove)}, used_disabled_move: ${rustU8(value.usedDisabledMove)}, taunt_timer: ${rustU8(value.tauntTimer)}, used_taunted_move: ${rustU8(value.usedTauntedMove)}, used_imprisoned_move: ${rustU8(value.usedImprisonedMove)},`
    + ` item: ${rustU16(value.item)}, stat_stages: [${value.statStages.map(rustI32).join(", ")}], party_index: ${rustU8(value.partyIndex)}, speed: ${rustU16(value.speed)} }`;
}
function rustSiblings(value) {
  return "BattleScriptPainSplitVectorSiblings {"
    + ` scripting_battler: ${rustBattler(value.scriptingBattler)}, battler_with_ability: ${rustBattler(value.battlerWithAbility)}, atk_canceler_tracker: ${rustU8(value.atkCancelerTracker)}, battle_outcome: ${rustU8(value.battleOutcome)},`
    + ` current_move: ${rustU16(value.currentMove)}, current_move_effect: ${rustU8(value.currentMoveEffect)}, current_move_position: ${rustU8(value.currentMovePosition)}, move_result_flags: ${rustU32(value.moveResultFlags)}, dmg_multiplier: ${rustU8(value.dmgMultiplier)}, crit_multiplier: ${rustU8(value.critMultiplier)}, move_effect_byte: ${rustU8(value.moveEffectByte)}, miss_type: ${rustU8(value.missType)}, hit_marker: ${rustU32(value.hitMarker)},`
    + ` multi_hit_counter: ${rustU8(value.multiHitCounter)}, multi_hit_string_counter: ${rustU8(value.multiHitStringCounter)}, multistring_chooser: ${rustU8(value.multistringChooser)}, dynamic_base_power: ${rustU16(value.dynamicBasePower)}, hp_dealt: ${rustI32(value.hpDealt)}, bide_dmg: [${value.bideDmg.map(rustI32).join(", ")}], locked_moves: [${value.lockedMoves.map(rustU16).join(", ")}], side_statuses: [${value.sideStatuses.map(rustU32).join(", ")}], weather: ${rustU32(value.weather)}, weather_timer: ${rustU8(value.weatherTimer)} }`;
}
function rustState(value) {
  return "BattleScriptPainSplitVectorState {"
    + ` battlers: [${value.battlers.map(rustBattlerState).join(", ")}], attacker: ${rustOptionalBattler(value.attacker)}, target: ${rustOptionalBattler(value.target)}, effect_battler: ${rustOptionalBattler(value.effectBattler)}, fainted: ${rustOptionalBattler(value.fainted)}, pain_split_hp: ${rustI32(value.painSplitHp)}, battle_move_damage: ${rustI32(value.battleMoveDamage)}, siblings: ${rustSiblings(value.siblings)} }`;
}
function rustInstruction(value) {
  return "BattleScriptPainSplitVectorInstruction {"
    + ` opcode_name: ${rustString(value.opcodeName)}, program_counter: ${rustU32(value.programCounter)}, opcode_id: ${rustU8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operand_widths: &[${value.operandWidths.map(rustU8).join(", ")}], operand_expressions: &[${value.operandExpressions.map(rustString).join(", ")}], resolved_failure_target: ${value.resolvedFailureTarget === null ? "None" : `Some(${rustString(value.resolvedFailureTarget)})`} }`;
}
function rustControls(values) {
  return `&[${values.map((value) => value === "advance" ? "BattleScriptPainSplitControl::Advance" : "BattleScriptPainSplitControl::FailJump").join(", ")}]`;
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-painsplit-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptPainSplitOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_painsplit::{BattleScriptPainSplitBattler, BattleScriptPainSplitControl};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_PAINSPLIT_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_PAINSPLIT_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push("");
for (const [name, fields] of [
  ["BattleScriptPainSplitVectorSpecialStatus", ["restored_battler_sprite: u8", "focus_banded: u8", "shell_bell_dmg: i32", "physical_dmg: i32", "special_dmg: i32"]],
  ["BattleScriptPainSplitVectorBattlerState", ["side: u8", "ability: u8", "hp: u16", "max_hp: u16", "status1: u32", "status2: u32", "status3: u32", "special_status: BattleScriptPainSplitVectorSpecialStatus", "moves: [u16; 4]", "pp: [u8; 4]", "substitute_hp: u8", "rollout_timer: u8", "fury_cutter_counter: u8", "truant_counter: u8", "recharge_timer: u8", "flinch_immobility: u8", "disabled_move: u16", "used_disabled_move: u8", "taunt_timer: u8", "used_taunted_move: u8", "used_imprisoned_move: u8", "item: u16", "stat_stages: [i8; 8]", "party_index: u8", "speed: u16"]],
  ["BattleScriptPainSplitVectorSiblings", ["scripting_battler: BattleScriptPainSplitBattler", "battler_with_ability: BattleScriptPainSplitBattler", "atk_canceler_tracker: u8", "battle_outcome: u8", "current_move: u16", "current_move_effect: u8", "current_move_position: u8", "move_result_flags: u32", "dmg_multiplier: u8", "crit_multiplier: u8", "move_effect_byte: u8", "miss_type: u8", "hit_marker: u32", "multi_hit_counter: u8", "multi_hit_string_counter: u8", "multistring_chooser: u8", "dynamic_base_power: u16", "hp_dealt: i32", "bide_dmg: [i32; 4]", "locked_moves: [u16; 4]", "side_statuses: [u32; 2]", "weather: u32", "weather_timer: u8"]],
]) {
  lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
  lines.push(`pub struct ${name} {`);
  for (const field of fields) lines.push(`    pub ${field},`);
  lines.push("}");
  lines.push("");
}
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptPainSplitVectorState {");
for (const field of ["battlers: [BattleScriptPainSplitVectorBattlerState; 4]", "attacker: Option<BattleScriptPainSplitBattler>", "target: Option<BattleScriptPainSplitBattler>", "effect_battler: Option<BattleScriptPainSplitBattler>", "fainted: Option<BattleScriptPainSplitBattler>", "pain_split_hp: i32", "battle_move_damage: i32", "siblings: BattleScriptPainSplitVectorSiblings"]) lines.push(`    pub ${field},`);
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptPainSplitVectorInstruction {");
for (const field of ["opcode_name: &'static str", "program_counter: u32", "opcode_id: u8", "dispatcher: &'static str", "operand_widths: &'static [u8]", "operand_expressions: &'static [&'static str]", "resolved_failure_target: Option<&'static str>"]) lines.push(`    pub ${field},`);
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptPainSplitVectorCase {");
for (const field of ["label: &'static str", "category: &'static str", "branch: &'static str", "applications: u8", "instruction: BattleScriptPainSplitVectorInstruction", "initial: BattleScriptPainSplitVectorState", "expected: Option<BattleScriptPainSplitVectorState>", "controls: &'static [BattleScriptPainSplitControl]", "expected_error: Option<&'static str>"]) lines.push(`    pub ${field},`);
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptPainSplitRegistrationCase {");
for (const field of ["label: &'static str", "instructions: &'static [BattleScriptPainSplitVectorInstruction]", "expected_bindings: &'static [u8]", "expected_error: Option<&'static str>"]) lines.push(`    pub ${field},`);
lines.push("}");
lines.push("");
for (const [name, fields] of [
  ["BattleScriptPainSplitDecompDispatchEvidence", ["opcode_name: &'static str", "opcode_id: u8", "dispatcher: &'static str", "dispatch_line: u32", "handler_line: u32", "substitute_test_line: u32", "write_shell_bell_line: u32"]],
  ["BattleScriptPainSplitMacroEvidence", ["macro_name: &'static str", "declaration_line: u32", "opcode_line: u32", "pointer_line: u32", "pointer_width_bytes: u8", "encoded_width_bytes: u8"]],
  ["BattleScriptPainSplitCallSiteEvidence", ["entry_label: &'static str", "entry_label_line: u32", "statement_line: u32", "failure_expression: &'static str", "instruction_program_counter: u32", "concrete_call_sites: usize"]],
]) {
  lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
  lines.push(`pub struct ${name} {`);
  for (const field of fields) lines.push(`    pub ${field},`);
  lines.push("}");
  lines.push("");
}
lines.push("pub const BATTLE_SCRIPT_PAINSPLIT_CANONICAL_DECOMP_DISPATCH_EVIDENCE: BattleScriptPainSplitDecompDispatchEvidence = BattleScriptPainSplitDecompDispatchEvidence {");
lines.push(`    opcode_name: ${rustString(decompDispatchEvidence.opcodeName)}, opcode_id: ${rustU8(decompDispatchEvidence.opcodeId)}, dispatcher: ${rustString(decompDispatchEvidence.dispatcher)}, dispatch_line: ${decompDispatchEvidence.dispatchLine}, handler_line: ${decompDispatchEvidence.handlerLine}, substitute_test_line: ${decompDispatchEvidence.substituteTestLine}, write_shell_bell_line: ${decompDispatchEvidence.writeShellBellLine},`);
lines.push("};");
lines.push("pub const BATTLE_SCRIPT_PAINSPLIT_MACRO_EVIDENCE: BattleScriptPainSplitMacroEvidence = BattleScriptPainSplitMacroEvidence {");
lines.push(`    macro_name: ${rustString(macroEvidence.macroName)}, declaration_line: ${macroEvidence.declarationLine}, opcode_line: ${macroEvidence.opcodeLine}, pointer_line: ${macroEvidence.pointerLine}, pointer_width_bytes: ${rustU8(macroEvidence.pointerWidthBytes)}, encoded_width_bytes: ${rustU8(macroEvidence.encodedWidthBytes)},`);
lines.push("};");
lines.push("pub const BATTLE_SCRIPT_PAINSPLIT_CALL_SITE_EVIDENCE: BattleScriptPainSplitCallSiteEvidence = BattleScriptPainSplitCallSiteEvidence {");
lines.push(`    entry_label: ${rustString(callSiteEvidence.entryLabel)}, entry_label_line: ${callSiteEvidence.entryLabelLine}, statement_line: ${callSiteEvidence.statementLine}, failure_expression: ${rustString(callSiteEvidence.failureExpression)}, instruction_program_counter: ${rustU32(callSiteEvidence.instructionProgramCounter)}, concrete_call_sites: ${callSiteEvidence.concreteCallSites},`);
lines.push("};");
lines.push("");
for (const [constant, values, type, render] of [
  ["BATTLE_SCRIPT_PAINSPLIT_DOMAIN_CENSUS", domainCensus, "[(&str, u64);", (value) => `(${rustString(value[0])}, ${value[1]})`],
  ["BATTLE_SCRIPT_PAINSPLIT_CATEGORY_CENSUS", categoryCensus, "[(&str, usize);", (value) => `(${rustString(value[0])}, ${value[1]})`],
  ["BATTLE_SCRIPT_PAINSPLIT_BRANCH_CENSUS", branchCensus, "[(&str, usize);", (value) => `(${rustString(value[0])}, ${value[1]})`],
  ["BATTLE_SCRIPT_PAINSPLIT_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "[(&str, usize);", (value) => `(${rustString(value[0])}, ${value[1]})`],
]) {
  lines.push(`pub const ${constant}: ${type} ${values.length}] = [`);
  for (const value of values) lines.push(`    ${render(value)},`);
  lines.push("];\n");
}
lines.push(`pub const BATTLE_SCRIPT_PAINSPLIT_U16_ARITHMETIC_DOMAIN: [u16; ${U16_ARITHMETIC_DOMAIN.length}] = [${U16_ARITHMETIC_DOMAIN.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_PAINSPLIT_STATUS2_EDGE_DOMAIN: [u32; ${STATUS2_EDGE_DOMAIN.length}] = [${STATUS2_EDGE_DOMAIN.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_PAINSPLIT_SIGNED_EDGE_DOMAIN: [i32; ${SIGNED_EDGE_DOMAIN.length}] = [${SIGNED_EDGE_DOMAIN.map(rustI32).join(", ")}];`);
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_PAINSPLIT_CASES: [BattleScriptPainSplitVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptPainSplitVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)}, applications: ${value.applications},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${value.expected === null ? "None" : `Some(${rustState(value.expected)})`},`);
  lines.push(`        controls: ${rustControls(value.controls)}, expected_error: ${value.expectedError === null ? "None" : `Some(${rustString(value.expectedError)})`},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_PAINSPLIT_REGISTRATION_CASES: [BattleScriptPainSplitRegistrationCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptPainSplitRegistrationCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map((spec) => rustInstruction(vectorInstruction(sourceInstructionFromSpec(spec)))).join(", ")}], expected_bindings: &[${value.expectedBindings.map(rustU8).join(", ")}], expected_error: ${value.expectedError === null ? "None" : `Some(${rustString(value.expectedError)})`},`);
  lines.push("    },");
}
lines.push("];");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
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
if (!formatted) throw new Error("gen-battle-script-painsplit-vectors: could not find rustfmt");
const generatedBytes = fs.readFileSync(outPath);
assert(generatedBytes.length <= GENERATED_FILE_MAX_BYTES, `generated file is too large: ${generatedBytes.length}`);
const generatedSha256 = crypto.createHash("sha256").update(generatedBytes).digest("hex");
const generatorSha256 = crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex");
console.log(`gen-battle-script-painsplit-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-painsplit-vectors: ${cases.length} complete cases`);
console.log(`gen-battle-script-painsplit-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-painsplit-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-painsplit-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-painsplit-vectors: registration branch census ${JSON.stringify(registrationBranchCensus)}`);
console.log(`gen-battle-script-painsplit-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-painsplit-vectors: generated sha256 ${generatedSha256} bytes ${generatedBytes.length}`);
console.log(`gen-battle-script-painsplit-vectors: generator sha256 ${generatorSha256} bytes ${fs.statSync(scriptPath).size}`);
