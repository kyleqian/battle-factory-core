#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptJumpifconfusedandstatmaxedOpcode.ts.
// Expected controls, errors, registration observations, and complete narrow
// projections are created only by executing the canonical TypeScript leaf.
// The separately checked Rust source-metadata test owns the decomp/macro/site
// authority.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifconfusedandstatmaxed-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outputPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_jumpifconfusedandstatmaxed_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptJumpifconfusedandstatmaxedOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED";
const OPCODE_ID = 0xb4;
const DISPATCHER = "Cmd_jumpifconfusedandstatmaxed";
const BATTLE_SLOTS = 4;
const STAT_STAGE_COUNT = 8;
const TARGET_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_TARGET_DOMAIN = Object.freeze([null, 0, 1, 2, 3]);
const STATUS2_CONFUSION = 0x0000_0007;
const MAX_STAT_STAGE = 12;
const STATUS2_EDGE_DOMAIN = Object.freeze([
  0x0000_0000,
  0x0000_0001,
  0x0000_0002,
  0x0000_0004,
  STATUS2_CONFUSION,
  0x0000_0008,
  0xffff_fff8,
  0x8000_0000,
  0xffff_ffff,
  0x0100_0001,
]);
const STATUS2_EDGE_TOKENS = Object.freeze([
  "clear",
  "turn_one",
  "turn_two",
  "turn_four",
  "all_confusion_bits",
  "adjacent_extra_bit",
  "all_extra_bits",
  "high_bit",
  "max",
  "extra_and_confusion",
]);
const STAT_STAGE_EDGE_DOMAIN = Object.freeze([-128, -1, 0, 11, 12, 13, 127]);
const STAT_STAGE_EDGE_TOKENS = Object.freeze([
  "min",
  "minus_one",
  "zero",
  "one_below_max",
  "max",
  "one_above_max",
  "max_i8",
]);
const TARGET_LABEL = "BattleScript_ButItFailed";
const GENERATED_FILE_MAX_BYTES = 5_000_000;

function assert(condition, message) {
  if (!condition) {
    throw new Error("gen-battle-script-jumpifconfusedandstatmaxed-vectors: " + message);
  }
}

function assertBattler(value, label) {
  assert(TARGET_DOMAIN.includes(value), label + " must be a battler 0..3, got " + value);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xff,
    label + " must be a u8, got " + value);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff,
    label + " must be a u16, got " + value);
}

function assertI8(value, label) {
  assert(Number.isInteger(value) && value >= -128 && value <= 127,
    label + " must be a signed i8, got " + value);
}

function assertI32(value, label) {
  assert(Number.isInteger(value) && value >= -0x8000_0000 && value <= 0x7fff_ffff,
    label + " must be a signed i32, got " + value);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff,
    label + " must be a u32, got " + value);
}

function frozenArray(values) {
  return Object.freeze(values.slice());
}

function optionalRole(salt, offset) {
  const candidate = (salt + offset) % OPTIONAL_TARGET_DOMAIN.length;
  return OPTIONAL_TARGET_DOMAIN[candidate];
}

function stageValue(salt, index) {
  return STAT_STAGE_EDGE_DOMAIN[(salt + index) % STAT_STAGE_EDGE_DOMAIN.length];
}

function makeBattler(index, focusBattler, focusStatus2, focusStatIndex, focusStatStage, statOverrides, salt) {
  assertBattler(focusBattler, "focus battler");
  assertU32(focusStatus2, "focus status2");
  assert(Number.isInteger(focusStatIndex) && focusStatIndex >= 0 && focusStatIndex < STAT_STAGE_COUNT,
    "focus stat index must be within stat stage array");
  assertI8(focusStatStage, "focus stat stage");
  const statStages = TARGET_DOMAIN.concat(TARGET_DOMAIN).map((_, stat) => stageValue(salt + index, stat));
  if (index === focusBattler) {
    statStages[focusStatIndex] = focusStatStage;
    for (const [statString, stage] of Object.entries(statOverrides ?? {})) {
      const stat = Number(statString);
      assert(Number.isInteger(stat) && stat >= 0 && stat < STAT_STAGE_COUNT,
        "override stat index must be in range: " + statString);
      assertI8(stage, "override stat stage " + stat);
      statStages[stat] = stage;
    }
  }
  statStages.forEach((stage, stat) => assertI8(stage, "battler " + index + " stage " + stat));
  return Object.freeze({
    side: index % 2,
    ability: (index * 13 + salt) & 0xff,
    hp: 1 + ((salt * 97 + index * 73) % 500),
    maxHP: 500,
    moves: frozenArray([33 + index, 207, 260, 0]),
    pp: frozenArray([35 - index, 15, 15, 0]),
    status1: ((0x0100_0001 * (index + 1)) ^ salt) >>> 0,
    status2: index === focusBattler
      ? focusStatus2 >>> 0
      : STATUS2_EDGE_DOMAIN[(salt + index + 2) % STATUS2_EDGE_DOMAIN.length],
    status3: ((0x8000_0000 >>> index) | (salt & 0xff)) >>> 0,
    statStages: frozenArray(statStages),
    item: (salt * 17 + index * 29) & 0xffff,
    partyIndex: index,
  });
}

function makeProjection({
  target,
  focusBattler,
  focusStatus2,
  focusStatIndex,
  focusStatStage,
  statOverrides = Object.freeze({}),
  salt,
}) {
  assertOptionalBattler(target, "target");
  assertBattler(focusBattler, "focus battler");
  assertU32(focusStatus2, "focus status2");
  assertI8(focusStatStage, "focus stat stage");
  assert(Number.isInteger(salt) && salt >= 0, "salt must be a nonnegative integer");
  const battlers = TARGET_DOMAIN.map((index) => makeBattler(
    index,
    focusBattler,
    focusStatus2,
    focusStatIndex,
    focusStatStage,
    statOverrides,
    salt,
  ));
  return freezeProjection(Object.freeze({
    battlers: frozenArray(battlers),
    attacker: optionalRole(salt, 1),
    target,
    effectBattler: optionalRole(salt, 2),
    fainted: optionalRole(salt, 3),
    contextState: Object.freeze({
      scriptingBattler: TARGET_DOMAIN[salt % TARGET_DOMAIN.length],
      currentMove: salt % 2 === 0 ? 207 : 260,
      moveResultFlags: (0xa5 ^ salt) & 0xff,
      hitMarker: ((0x4000_0002 ^ (salt * 37)) >>> 0),
      battleMoveDamage: [-0x8000_0000, -1, 0, 1, 0x7fff_ffff][salt % 5],
      bideDmg: frozenArray(TARGET_DOMAIN.map((index) => [-0x8000_0000, -1, 0, 1, 0x7fff_ffff][(salt + index) % 5])),
      lockedMoves: frozenArray(TARGET_DOMAIN.map((index) => 1 + ((salt + index * 53) % 354))),
    }),
  }));
}

function freezeProjection(value) {
  assert(Array.isArray(value.battlers) && value.battlers.length === BATTLE_SLOTS,
    "projection must contain exactly four battlers");
  value.battlers.forEach((battler, index) => {
    assertU8(battler.side, "battlers[" + index + "].side");
    assertU8(battler.ability, "battlers[" + index + "].ability");
    assertU16(battler.hp, "battlers[" + index + "].hp");
    assertU16(battler.maxHP, "battlers[" + index + "].maxHP");
    assert(Array.isArray(battler.moves) && battler.moves.length === 4,
      "battlers[" + index + "].moves must have four cells");
    battler.moves.forEach((move, slot) => assertU16(move, "battlers[" + index + "].moves[" + slot + "]"));
    assert(Array.isArray(battler.pp) && battler.pp.length === 4,
      "battlers[" + index + "].pp must have four cells");
    battler.pp.forEach((pp, slot) => assertU8(pp, "battlers[" + index + "].pp[" + slot + "]"));
    assertU32(battler.status1, "battlers[" + index + "].status1");
    assertU32(battler.status2, "battlers[" + index + "].status2");
    assertU32(battler.status3, "battlers[" + index + "].status3");
    assert(Array.isArray(battler.statStages) && battler.statStages.length === STAT_STAGE_COUNT,
      "battlers[" + index + "].statStages must have eight cells");
    battler.statStages.forEach((stage, stat) => assertI8(stage,
      "battlers[" + index + "].statStages[" + stat + "]"));
    assertU16(battler.item, "battlers[" + index + "].item");
    assertU8(battler.partyIndex, "battlers[" + index + "].partyIndex");
  });
  assertOptionalBattler(value.attacker, "attacker");
  assertOptionalBattler(value.target, "target");
  assertOptionalBattler(value.effectBattler, "effectBattler");
  assertOptionalBattler(value.fainted, "fainted");
  assertBattler(value.contextState.scriptingBattler, "scripting battler");
  assertU16(value.contextState.currentMove, "current move");
  assertU8(value.contextState.moveResultFlags, "move result flags");
  assertU32(value.contextState.hitMarker, "hit marker");
  assertI32(value.contextState.battleMoveDamage, "battle move damage");
  assert(Array.isArray(value.contextState.bideDmg) && value.contextState.bideDmg.length === BATTLE_SLOTS,
    "bideDmg must have four cells");
  value.contextState.bideDmg.forEach((damage, index) => assertI32(damage, "bideDmg[" + index + "]"));
  assert(Array.isArray(value.contextState.lockedMoves)
    && value.contextState.lockedMoves.length === BATTLE_SLOTS,
  "lockedMoves must have four cells");
  value.contextState.lockedMoves.forEach((move, index) => assertU16(move, "lockedMoves[" + index + "]"));
  return Object.freeze({
    battlers: frozenArray(value.battlers.map((battler) => Object.freeze({
      ...battler,
      moves: frozenArray(battler.moves),
      pp: frozenArray(battler.pp),
      statStages: frozenArray(battler.statStages),
    }))),
    attacker: value.attacker,
    target: value.target,
    effectBattler: value.effectBattler,
    fainted: value.fainted,
    contextState: Object.freeze({
      ...value.contextState,
      bideDmg: frozenArray(value.contextState.bideDmg),
      lockedMoves: frozenArray(value.contextState.lockedMoves),
    }),
  });
}

function canonicalBattler(value) {
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: value.hp,
    maxHP: value.maxHP,
    moves: frozenArray(value.moves),
    pp: frozenArray(value.pp),
    status1: value.status1,
    status2: value.status2,
    status3: value.status3,
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
    item: value.item,
    statStages: frozenArray(value.statStages),
    types: frozenArray(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 0,
    personality: 0,
    attack: 50,
    defense: 50,
    spAttack: 50,
    spDefense: 50,
    level: 50,
    friendship: 0,
    partyIndex: value.partyIndex,
  });
}

function canonicalRulesFromProjection(value) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: frozenArray(value.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: value.attacker,
      target: value.target,
      effectBattler: value.effectBattler,
      fainted: value.fainted,
    }),
    scriptingBattler: value.contextState.scriptingBattler,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: value.contextState.currentMove,
    currentMovePosition: 0,
    moveResultFlags: value.contextState.moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: value.contextState.hitMarker,
    multiHitCounter: 0,
    battleMoveDamage: value.contextState.battleMoveDamage,
    bideDmg: value.contextState.bideDmg,
    lockedMoves: value.contextState.lockedMoves,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: frozenArray(rules.battlers.map((battler) => Object.freeze({
      side: battler.side,
      ability: battler.ability,
      hp: battler.hp,
      maxHP: battler.maxHP,
      moves: frozenArray(battler.moves),
      pp: frozenArray(battler.pp),
      status1: battler.status1,
      status2: battler.status2,
      status3: battler.status3,
      statStages: frozenArray(battler.statStages),
      item: battler.item,
      partyIndex: battler.partyIndex,
    }))),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    contextState: Object.freeze({
      scriptingBattler: rules.scriptingBattler,
      currentMove: rules.currentMove,
      moveResultFlags: rules.moveResultFlags,
      hitMarker: rules.hitMarker,
      battleMoveDamage: rules.battleMoveDamage,
      bideDmg: frozenArray(rules.bideDmg),
      lockedMoves: frozenArray(rules.lockedMoves),
    }),
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const concreteInstructions = Object.freeze(program.instructions.filter(
  (instruction) => instruction.opcodeName === OPCODE_NAME,
));
assert(concreteInstructions.length === 2,
  "expected exactly two canonical " + OPCODE_NAME + " starts, got " + concreteInstructions.length);
assert(concreteInstructions.every((instruction) => instruction.opcodeId === OPCODE_ID),
  "canonical opcode identity drifted");
assert(concreteInstructions.every((instruction) => instruction.dispatcher === DISPATCHER),
  "canonical dispatcher drifted");
assert(concreteInstructions[0]?.operands[0]?.expression === "STAT_ATK",
  "first canonical stat expression drifted");
assert(concreteInstructions[1]?.operands[0]?.expression === "STAT_SPATK",
  "second canonical stat expression drifted");
assert(concreteInstructions.every((instruction) => instruction.operands.length === 2),
  "canonical starts must each have two operands");
assert(concreteInstructions.every((instruction) => instruction.operands[0]?.widthBytes === 1),
  "canonical stat operand width drifted");
assert(concreteInstructions.every((instruction) => instruction.operands[1]?.widthBytes === 4),
  "canonical pointer operand width drifted");
assert(concreteInstructions.every((instruction) => instruction.operands[1]?.expression === TARGET_LABEL),
  "canonical target expression drifted");
assert(programModule.resolveBattleScriptLabel(program, TARGET_LABEL) !== undefined,
  "canonical target label no longer resolves");

const canonicalHandlers = opcodeModule.createBattleScriptJumpifconfusedandstatmaxedOpcodeHandlers(program);
const handler = canonicalHandlers[OPCODE_ID];
assert(typeof handler === "function", "canonical handler was not registered at opcode identity");

function unresolvedTargetProgram(expressions) {
  const labels = { ...program.labelEntries };
  for (const expression of expressions) delete labels[expression];
  return Object.freeze({ ...program, labelEntries: Object.freeze(labels) });
}

function instructionWithStatExpression(site, statExpression) {
  if (site.operands[0].expression === statExpression) return site;
  return Object.freeze({
    ...site,
    operands: frozenArray([
      Object.freeze({ ...site.operands[0], expression: statExpression }),
      site.operands[1],
    ]),
  });
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "jump";
  throw new Error("canonical handler returned unsupported control " + transition.control.kind);
}

function sourceOutcome(site, initialProjection, targetResolves, applications, statExpression) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
  const inputSnapshot = vectorState(initialRules);
  const activeProgram = targetResolves ? program : unresolvedTargetProgram([TARGET_LABEL]);
  const instruction = instructionWithStatExpression(site, statExpression);
  let currentRules = initialRules;
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const before = vectorState(currentRules);
      const state = Object.freeze({
        ...machineModule.createBattleScriptMachine(
          activeProgram,
          site.source.label,
          currentRules,
          (0x6b14_0000 + application) >>> 0,
        ),
        programCounter: site.programCounter,
      });
      const transition = handler({ program: activeProgram, instruction, state });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(transition.rulesContext === currentRules,
        "canonical no-write handler replaced rules context");
      assert(sameState(vectorState(currentRules), before), "canonical handler mutated current rules");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      assert(Object.isFrozen(transition.rulesContext.battlers), "canonical output battlers must be frozen");
      controls.push(controlFromTransition(transition));
      currentRules = transition.rulesContext;
    }
    assert(currentRules === initialRules, "canonical no-write leaf replaced initial rules");
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated initial rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: frozenArray(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "canonical handler threw non-Error " + String(error));
    assert(sameState(vectorState(initialRules), inputSnapshot),
      "throwing canonical handler mutated initial rules");
    return Object.freeze({
      expected: null,
      controls: frozenArray(controls),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.controls.join("-then-");
  if (outcome.error.startsWith("validated B_SCR_OP_JUMPIFCONFUSEDANDSTATMAXED became undecodable")) {
    return "undecodable-stat";
  }
  if (outcome.error === "Cmd_jumpifconfusedandstatmaxed requires a target role") {
    return "missing-target-role";
  }
  if (outcome.error.startsWith("Cmd_jumpifconfusedandstatmaxed: unresolved jump target ")) {
    return "unresolved-jump-target";
  }
  throw new Error("unknown canonical handler error " + outcome.error);
}

const cases = [];
function addCase({ label, category, siteIndex, projection, targetResolves = true, applications = 1, statExpression }) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid case label " + label);
  assert(!cases.some((entry) => entry.label === label), "duplicate case label " + label);
  assert(siteIndex === 0 || siteIndex === 1, label + " site index must be zero or one");
  assert(applications === 1 || applications === 2, label + " applications must be one or two");
  const site = concreteInstructions[siteIndex];
  const effectiveStatExpression = statExpression ?? site.operands[0].expression;
  const outcome = sourceOutcome(site, projection, targetResolves, applications, effectiveStatExpression);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    execution: Object.freeze({
      programCounter: site.programCounter,
      statExpression: effectiveStatExpression,
      jumpTargetExpression: site.operands[1].expression,
      jumpTargetResolves: targetResolves,
    }),
    initial: vectorState(canonicalRulesFromProjection(projection)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

let salt = 1;
for (const [siteIndex, site] of concreteInstructions.entries()) {
  const statIndex = site.operands[0].expression === "STAT_ATK" ? 1 : 4;
  const siteToken = siteIndex === 0 ? "swagger_atk" : "flatter_spatk";
  for (const target of TARGET_DOMAIN) {
    for (const [statusIndex, status2] of STATUS2_EDGE_DOMAIN.entries()) {
      for (const [stageIndex, stage] of STAT_STAGE_EDGE_DOMAIN.entries()) {
        addCase({
          label: "site_" + siteToken + "_target_" + target + "_status_"
            + STATUS2_EDGE_TOKENS[statusIndex] + "_stage_" + STAT_STAGE_EDGE_TOKENS[stageIndex],
          category: "site-target-confusion-stage-matrix",
          siteIndex,
          projection: makeProjection({
            target,
            focusBattler: target,
            focusStatus2: status2,
            focusStatIndex: statIndex,
            focusStatStage: stage,
            salt: salt++,
          }),
        });
      }
    }
  }
}

for (const [siteIndex, site] of concreteInstructions.entries()) {
  const statIndex = site.operands[0].expression === "STAT_ATK" ? 1 : 4;
  const otherStatIndex = statIndex === 1 ? 4 : 1;
  const siteToken = siteIndex === 0 ? "swagger_atk" : "flatter_spatk";
  for (const target of TARGET_DOMAIN) {
    addCase({
      label: "site_" + siteToken + "_target_" + target + "_selected_max_other_not_max",
      category: "concrete-stat-index-isolation",
      siteIndex,
      projection: makeProjection({
        target,
        focusBattler: target,
        focusStatus2: STATUS2_CONFUSION,
        focusStatIndex: statIndex,
        focusStatStage: MAX_STAT_STAGE,
        statOverrides: Object.freeze({ [otherStatIndex]: 11 }),
        salt: salt++,
      }),
    });
    addCase({
      label: "site_" + siteToken + "_target_" + target + "_selected_not_max_other_max",
      category: "concrete-stat-index-isolation",
      siteIndex,
      projection: makeProjection({
        target,
        focusBattler: target,
        focusStatus2: STATUS2_CONFUSION,
        focusStatIndex: statIndex,
        focusStatStage: 11,
        statOverrides: Object.freeze({ [otherStatIndex]: MAX_STAT_STAGE }),
        salt: salt++,
      }),
    });
  }
}

for (const [siteIndex, site] of concreteInstructions.entries()) {
  const statIndex = site.operands[0].expression === "STAT_ATK" ? 1 : 4;
  const siteToken = siteIndex === 0 ? "swagger_atk" : "flatter_spatk";
  addCase({
    label: "site_" + siteToken + "_not_confused_skips_unresolved_label",
    category: "false-path-skips-label-resolution",
    siteIndex,
    targetResolves: false,
    projection: makeProjection({
      target: 3,
      focusBattler: 3,
      focusStatus2: 0xffff_fff8,
      focusStatIndex: statIndex,
      focusStatStage: MAX_STAT_STAGE,
      salt: salt++,
    }),
  });
  addCase({
    label: "site_" + siteToken + "_not_maxed_skips_unresolved_label",
    category: "false-path-skips-label-resolution",
    siteIndex,
    targetResolves: false,
    projection: makeProjection({
      target: 2,
      focusBattler: 2,
      focusStatus2: 0x0000_0001,
      focusStatIndex: statIndex,
      focusStatStage: 11,
      salt: salt++,
    }),
  });
  addCase({
    label: "site_" + siteToken + "_true_path_reaches_unresolved_label",
    category: "true-path-label-resolution",
    siteIndex,
    targetResolves: false,
    projection: makeProjection({
      target: 1,
      focusBattler: 1,
      focusStatus2: 0x0000_0004,
      focusStatIndex: statIndex,
      focusStatStage: MAX_STAT_STAGE,
      salt: salt++,
    }),
  });
  addCase({
    label: "site_" + siteToken + "_missing_target_precedes_unresolved_label",
    category: "missing-target-ordering",
    siteIndex,
    targetResolves: false,
    projection: makeProjection({
      target: null,
      focusBattler: 0,
      focusStatus2: STATUS2_CONFUSION,
      focusStatIndex: statIndex,
      focusStatStage: MAX_STAT_STAGE,
      salt: salt++,
    }),
  });
  addCase({
    label: "site_" + siteToken + "_repeated_jump",
    category: "repeated-application",
    siteIndex,
    applications: 2,
    projection: makeProjection({
      target: 0,
      focusBattler: 0,
      focusStatus2: STATUS2_CONFUSION,
      focusStatIndex: statIndex,
      focusStatStage: MAX_STAT_STAGE,
      salt: salt++,
    }),
  });
  addCase({
    label: "site_" + siteToken + "_repeated_advance",
    category: "repeated-application",
    siteIndex,
    applications: 2,
    projection: makeProjection({
      target: 1,
      focusBattler: 1,
      focusStatus2: 0x0000_0008,
      focusStatIndex: statIndex,
      focusStatStage: MAX_STAT_STAGE,
      salt: salt++,
    }),
  });
}

addCase({
  label: "undecodable_stat_precedes_missing_target_and_label_resolution",
  category: "handler-validation-ordering",
  siteIndex: 0,
  statExpression: "STAT_DEF",
  targetResolves: false,
  projection: makeProjection({
    target: null,
    focusBattler: 0,
    focusStatus2: STATUS2_CONFUSION,
    focusStatIndex: 1,
    focusStatStage: MAX_STAT_STAGE,
    salt: salt++,
  }),
});

function cloneRuntimeInstruction(siteIndex, overrides = {}) {
  const base = concreteInstructions[siteIndex];
  const operandOverrides = overrides.operands ?? base.operands.map((operand) => ({
    widthBytes: operand.widthBytes,
    expression: operand.expression,
  }));
  const operands = frozenArray(operandOverrides.map((operand, operandIndex) => Object.freeze({
    ...(base.operands[operandIndex] ?? base.operands[0]),
    widthBytes: operand.widthBytes,
    expression: operand.expression,
  })));
  const instruction = Object.freeze({
    ...base,
    opcodeName: overrides.opcodeName ?? base.opcodeName,
    opcodeId: overrides.opcodeId ?? base.opcodeId,
    dispatcher: overrides.dispatcher ?? base.dispatcher,
    operands,
  });
  return Object.freeze({
    templateIndex: siteIndex,
    opcodeName: instruction.opcodeName,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher,
    operandWidths: frozenArray(operands.map((operand) => operand.widthBytes)),
    operandExpressions: frozenArray(operands.map((operand) => operand.expression)),
    jumpTargetResolves: overrides.jumpTargetResolves ?? true,
    instruction,
  });
}

function registrationOutcome(runtimeInstructions) {
  const labels = { ...program.labelEntries };
  for (const value of runtimeInstructions) {
    if (!value.jumpTargetResolves && value.operandExpressions[1] !== undefined) {
      delete labels[value.operandExpressions[1]];
    }
  }
  const syntheticProgram = Object.freeze({
    ...program,
    instructions: frozenArray(runtimeInstructions.map((value) => value.instruction)),
    labelEntries: Object.freeze(labels),
  });
  try {
    const handlers = opcodeModule.createBattleScriptJumpifconfusedandstatmaxedOpcodeHandlers(syntheticProgram);
    const bindings = Object.keys(handlers).map(Number).sort((left, right) => left - right);
    return Object.freeze({ expectedBindings: frozenArray(bindings), expectedError: null });
  } catch (error) {
    assert(error instanceof Error, "registration threw non-Error " + String(error));
    return Object.freeze({ expectedBindings: frozenArray([]), expectedError: error.message });
  }
}

function registrationBranch(outcome) {
  if (outcome.expectedError === null) return "registered";
  if (outcome.expectedError.startsWith(OPCODE_NAME + " requires both concrete starts")) {
    return "wrong-cardinality";
  }
  if (outcome.expectedError.startsWith("invalid " + OPCODE_NAME + " shape")) return "invalid-shape";
  if (outcome.expectedError.startsWith("unknown " + OPCODE_NAME + " stat ")) return "unknown-stat";
  if (outcome.expectedError.startsWith("unresolved " + OPCODE_NAME + " jump target ")) {
    return "unresolved-label";
  }
  throw new Error("unknown canonical registration error " + outcome.expectedError);
}

const registrationCases = [];
function addRegistrationCase(label, runtimeInstructions) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid registration label " + label);
  assert(!registrationCases.some((entry) => entry.label === label),
    "duplicate registration label " + label);
  const outcome = registrationOutcome(runtimeInstructions);
  registrationCases.push(Object.freeze({
    label,
    branch: registrationBranch(outcome),
    instructions: frozenArray(runtimeInstructions.map((value) => Object.freeze({
      templateIndex: value.templateIndex,
      opcodeName: value.opcodeName,
      programCounter: value.programCounter,
      opcodeId: value.opcodeId,
      dispatcher: value.dispatcher,
      operandWidths: value.operandWidths,
      operandExpressions: value.operandExpressions,
      jumpTargetResolves: value.jumpTargetResolves,
    }))),
    expectedBindings: outcome.expectedBindings,
    expectedError: outcome.expectedError,
  }));
}

addRegistrationCase("canonical_two_starts", [cloneRuntimeInstruction(0), cloneRuntimeInstruction(1)]);
addRegistrationCase("canonical_two_starts_reversed", [cloneRuntimeInstruction(1), cloneRuntimeInstruction(0)]);
addRegistrationCase("zero_matching_starts", [cloneRuntimeInstruction(0, {
  opcodeName: "B_SCR_OP_FURYCUTTERCALC",
})]);
addRegistrationCase("one_matching_start_precedes_shape", [cloneRuntimeInstruction(0, {
  operands: [],
})]);
addRegistrationCase("three_matching_starts_precede_shape", [
  cloneRuntimeInstruction(0),
  cloneRuntimeInstruction(1, { operands: [] }),
  cloneRuntimeInstruction(0),
]);
addRegistrationCase("first_start_missing_operands", [
  cloneRuntimeInstruction(0, { operands: [] }),
  cloneRuntimeInstruction(1),
]);
addRegistrationCase("first_start_one_operand", [
  cloneRuntimeInstruction(0, { operands: [{ widthBytes: 1, expression: "STAT_ATK" }] }),
  cloneRuntimeInstruction(1),
]);
addRegistrationCase("first_start_three_operands", [
  cloneRuntimeInstruction(0, { operands: [
    { widthBytes: 1, expression: "STAT_ATK" },
    { widthBytes: 4, expression: TARGET_LABEL },
    { widthBytes: 1, expression: "STAT_DEF" },
  ] }),
  cloneRuntimeInstruction(1),
]);
addRegistrationCase("first_start_bad_stat_width", [
  cloneRuntimeInstruction(0, { operands: [
    { widthBytes: 2, expression: "STAT_ATK" },
    { widthBytes: 4, expression: TARGET_LABEL },
  ] }),
  cloneRuntimeInstruction(1),
]);
addRegistrationCase("second_start_bad_pointer_width_after_valid_first", [
  cloneRuntimeInstruction(0),
  cloneRuntimeInstruction(1, { operands: [
    { widthBytes: 1, expression: "STAT_SPATK" },
    { widthBytes: 2, expression: TARGET_LABEL },
  ] }),
]);
addRegistrationCase("first_start_unknown_stat", [
  cloneRuntimeInstruction(0, { operands: [
    { widthBytes: 1, expression: "STAT_DEF" },
    { widthBytes: 4, expression: TARGET_LABEL },
  ] }),
  cloneRuntimeInstruction(1),
]);
addRegistrationCase("second_start_unknown_stat_after_valid_first", [
  cloneRuntimeInstruction(0),
  cloneRuntimeInstruction(1, { operands: [
    { widthBytes: 1, expression: "STAT_SPEED" },
    { widthBytes: 4, expression: TARGET_LABEL },
  ] }),
]);
addRegistrationCase("first_start_missing_label", [
  cloneRuntimeInstruction(0, { jumpTargetResolves: false }),
  cloneRuntimeInstruction(1),
]);
addRegistrationCase("second_start_missing_label_after_valid_first", [
  cloneRuntimeInstruction(0),
  cloneRuntimeInstruction(1, { jumpTargetResolves: false }),
]);
addRegistrationCase("foreign_dispatcher_keeps_canonical_factory_shape", [
  cloneRuntimeInstruction(0, { dispatcher: "Cmd_unrelated" }),
  cloneRuntimeInstruction(1),
]);
addRegistrationCase("first_dynamic_opcode_id_becomes_binding", [
  cloneRuntimeInstruction(0, { opcodeId: 0xa3 }),
  cloneRuntimeInstruction(1, { opcodeId: 0xfe }),
]);

function census(values, key) {
  const result = new Map();
  for (const value of values) result.set(value[key], (result.get(value[key]) ?? 0) + 1);
  return frozenArray(Array.from(result.entries()));
}

const domainCensus = frozenArray([
  ["battler-slots", BATTLE_SLOTS],
  ["target-role-values", TARGET_DOMAIN.length],
  ["optional-target-role-values", OPTIONAL_TARGET_DOMAIN.length],
  ["concrete-stat-call-sites", concreteInstructions.length],
  ["concrete-stat-expressions", 2],
  ["stat-stage-array-cells", STAT_STAGE_COUNT],
  ["confusion-mask-status2-edge-values", STATUS2_EDGE_DOMAIN.length],
  ["signed-stat-stage-edge-values", STAT_STAGE_EDGE_DOMAIN.length],
  ["all-site-target-status-stage-combinations",
    concreteInstructions.length * TARGET_DOMAIN.length * STATUS2_EDGE_DOMAIN.length * STAT_STAGE_EDGE_DOMAIN.length],
  ["application-count-values", 2],
  ["registration-shape-cases", registrationCases.length],
]);
const categoryCensus = census(cases, "category");
const branchCensus = census(cases, "branch");
const registrationBranchCensus = census(registrationCases, "branch");
const corpus = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  targetDomain: TARGET_DOMAIN,
  status2Confusion: STATUS2_CONFUSION,
  status2EdgeDomain: STATUS2_EDGE_DOMAIN,
  statStageEdgeDomain: STAT_STAGE_EDGE_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU8(value) {
  return "0x" + value.toString(16).padStart(2, "0");
}

function rustU16(value) {
  return "0x" + value.toString(16).padStart(4, "0");
}

function rustU32(value) {
  return "0x" + value.toString(16).padStart(8, "0");
}

function rustI8(value) {
  return String(value);
}

function rustI32(value) {
  if (value === -0x8000_0000) return "i32::MIN";
  if (value === 0x7fff_ffff) return "i32::MAX";
  return String(value);
}

function rustBattler(value) {
  return "BattleScriptJumpifconfusedandstatmaxedBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustBattlerState(value) {
  return [
    "BattleScriptJumpifconfusedandstatmaxedVectorBattlerState {",
    "side: " + rustU8(value.side) + ",",
    "ability: " + rustU8(value.ability) + ",",
    "hp: " + rustU16(value.hp) + ",",
    "max_hp: " + rustU16(value.maxHP) + ",",
    "moves: [" + value.moves.map(rustU16).join(", ") + "],",
    "pp: [" + value.pp.map(rustU8).join(", ") + "],",
    "status1: " + rustU32(value.status1) + ",",
    "status2: " + rustU32(value.status2) + ",",
    "status3: " + rustU32(value.status3) + ",",
    "stat_stages: [" + value.statStages.map(rustI8).join(", ") + "],",
    "item: " + rustU16(value.item) + ",",
    "party_index: " + rustU8(value.partyIndex) + ",",
    "}",
  ].join(" ");
}

function rustContextState(value) {
  return [
    "BattleScriptJumpifconfusedandstatmaxedVectorContextState {",
    "scripting_battler: " + rustBattler(value.scriptingBattler) + ",",
    "current_move: " + rustU16(value.currentMove) + ",",
    "move_result_flags: " + rustU8(value.moveResultFlags) + ",",
    "hit_marker: " + rustU32(value.hitMarker) + ",",
    "battle_move_damage: " + rustI32(value.battleMoveDamage) + ",",
    "bide_dmg: [" + value.bideDmg.map(rustI32).join(", ") + "],",
    "locked_moves: [" + value.lockedMoves.map(rustU16).join(", ") + "],",
    "}",
  ].join(" ");
}

function rustState(value) {
  return [
    "BattleScriptJumpifconfusedandstatmaxedVectorState {",
    "battlers: [" + value.battlers.map(rustBattlerState).join(", ") + "],",
    "attacker: " + rustOptionalBattler(value.attacker) + ",",
    "target: " + rustOptionalBattler(value.target) + ",",
    "effect_battler: " + rustOptionalBattler(value.effectBattler) + ",",
    "fainted: " + rustOptionalBattler(value.fainted) + ",",
    "context_state: " + rustContextState(value.contextState) + ",",
    "}",
  ].join(" ");
}

function rustOptionalState(value) {
  return value === null ? "None" : "Some(" + rustState(value) + ")";
}

function rustOptionalString(value) {
  return value === null ? "None" : "Some(" + rustString(value) + ")";
}

function rustControls(values) {
  return "&[" + values.map((value) => {
    assert(value === "advance" || value === "jump", "unexpected control " + value);
    return value === "advance"
      ? "BattleScriptJumpifconfusedandstatmaxedControl::Advance"
      : "BattleScriptJumpifconfusedandstatmaxedControl::Jump";
  }).join(", ") + "]";
}

function rustExecution(value) {
  return [
    "BattleScriptJumpifconfusedandstatmaxedVectorExecution {",
    "program_counter: " + value.programCounter + ",",
    "stat_expression: " + rustString(value.statExpression) + ",",
    "jump_target_expression: " + rustString(value.jumpTargetExpression) + ",",
    "jump_target_resolves: " + value.jumpTargetResolves + ",",
    "}",
  ].join(" ");
}

function rustRegistrationInstruction(value) {
  return [
    "BattleScriptJumpifconfusedandstatmaxedVectorRegistrationInstruction {",
    "opcode_name: " + rustString(value.opcodeName) + ",",
    "program_counter: " + value.programCounter + ",",
    "opcode_id: " + rustU8(value.opcodeId) + ",",
    "dispatcher: " + rustString(value.dispatcher) + ",",
    "operand_widths: &[" + value.operandWidths.map(rustU8).join(", ") + "],",
    "operand_expressions: &[" + value.operandExpressions.map(rustString).join(", ") + "],",
    "jump_target_resolves: " + value.jumpTargetResolves + ",",
    "}",
  ].join(" ");
}

const generatorBytes = fs.readFileSync(scriptPath);
const generatorSha256 = crypto.createHash("sha256").update(generatorBytes).digest("hex");
const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-jumpifconfusedandstatmaxed-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptJumpifconfusedandstatmaxedOpcode.ts via node.");
lines.push("// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifconfusedandstatmaxed-vectors.mjs.");
lines.push("// Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_jumpifconfusedandstatmaxed::{");
lines.push("    BattleScriptJumpifconfusedandstatmaxedBattler,");
lines.push("    BattleScriptJumpifconfusedandstatmaxedControl,");
lines.push("};");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_VECTOR_CORPUS_SHA256: &str = "
  + rustString(corpusSha256) + ";");
lines.push("pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_VECTOR_CORPUS_BYTES: usize = "
  + Buffer.byteLength(corpusText) + ";");
lines.push("pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_VECTOR_GENERATOR_SHA256: &str = "
  + rustString(generatorSha256) + ";");
lines.push("pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_VECTOR_GENERATOR_BYTES: usize = "
  + generatorBytes.length + ";");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_TARGET_DOMAIN: [u8; "
  + TARGET_DOMAIN.length + "] = [" + TARGET_DOMAIN.join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STATUS2_EDGE_DOMAIN: [u32; "
  + STATUS2_EDGE_DOMAIN.length + "] = [" + STATUS2_EDGE_DOMAIN.map(rustU32).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_STAT_STAGE_EDGE_DOMAIN: [i8; "
  + STAT_STAGE_EDGE_DOMAIN.length + "] = [" + STAT_STAGE_EDGE_DOMAIN.map(rustI8).join(", ") + "];");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifconfusedandstatmaxedVectorBattlerState {");
lines.push("    pub side: u8,");
lines.push("    pub ability: u8,");
lines.push("    pub hp: u16,");
lines.push("    pub max_hp: u16,");
lines.push("    pub moves: [u16; 4],");
lines.push("    pub pp: [u8; 4],");
lines.push("    pub status1: u32,");
lines.push("    pub status2: u32,");
lines.push("    pub status3: u32,");
lines.push("    pub stat_stages: [i8; 8],");
lines.push("    pub item: u16,");
lines.push("    pub party_index: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifconfusedandstatmaxedVectorContextState {");
lines.push("    pub scripting_battler: BattleScriptJumpifconfusedandstatmaxedBattler,");
lines.push("    pub current_move: u16,");
lines.push("    pub move_result_flags: u8,");
lines.push("    pub hit_marker: u32,");
lines.push("    pub battle_move_damage: i32,");
lines.push("    pub bide_dmg: [i32; 4],");
lines.push("    pub locked_moves: [u16; 4],");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifconfusedandstatmaxedVectorState {");
lines.push("    pub battlers: [BattleScriptJumpifconfusedandstatmaxedVectorBattlerState; 4],");
lines.push("    pub attacker: Option<BattleScriptJumpifconfusedandstatmaxedBattler>,");
lines.push("    pub target: Option<BattleScriptJumpifconfusedandstatmaxedBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptJumpifconfusedandstatmaxedBattler>,");
lines.push("    pub fainted: Option<BattleScriptJumpifconfusedandstatmaxedBattler>,");
lines.push("    pub context_state: BattleScriptJumpifconfusedandstatmaxedVectorContextState,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifconfusedandstatmaxedVectorExecution {");
lines.push("    pub program_counter: u32,");
lines.push("    pub stat_expression: &'static str,");
lines.push("    pub jump_target_expression: &'static str,");
lines.push("    pub jump_target_resolves: bool,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifconfusedandstatmaxedVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub execution: BattleScriptJumpifconfusedandstatmaxedVectorExecution,");
lines.push("    pub initial: BattleScriptJumpifconfusedandstatmaxedVectorState,");
lines.push("    pub expected: Option<BattleScriptJumpifconfusedandstatmaxedVectorState>,");
lines.push("    pub controls: &'static [BattleScriptJumpifconfusedandstatmaxedControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifconfusedandstatmaxedVectorRegistrationInstruction {");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub program_counter: u32,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub operand_widths: &'static [u8],");
lines.push("    pub operand_expressions: &'static [&'static str],");
lines.push("    pub jump_target_resolves: bool,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptJumpifconfusedandstatmaxedRegistrationCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub instructions: &'static [BattleScriptJumpifconfusedandstatmaxedVectorRegistrationInstruction],");
lines.push("    pub expected_bindings: &'static [u8],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
for (const [name, values] of [
  ["DOMAIN_CENSUS", domainCensus],
  ["CATEGORY_CENSUS", categoryCensus],
  ["BRANCH_CENSUS", branchCensus],
  ["REGISTRATION_BRANCH_CENSUS", registrationBranchCensus],
]) {
  lines.push("pub const BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_" + name + ": [(&str, usize); "
    + values.length + "] = [");
  for (const [label, count] of values) lines.push("    (" + rustString(label) + ", " + count + "),");
  lines.push("];" );
  lines.push("");
}
lines.push("pub static BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_CASES: [BattleScriptJumpifconfusedandstatmaxedVectorCase; "
  + cases.length + "] = [");
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptJumpifconfusedandstatmaxedVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        applications: " + value.applications + ",");
  lines.push("        execution: " + rustExecution(value.execution) + ",");
  lines.push("        initial: " + rustState(value.initial) + ",");
  lines.push("        expected: " + rustOptionalState(value.expected) + ",");
  lines.push("        controls: " + rustControls(value.controls) + ",");
  lines.push("        expected_error: " + rustOptionalString(value.expectedError) + ",");
  lines.push("    },");
}
lines.push("];" );
lines.push("");
lines.push("pub static BATTLE_SCRIPT_JUMPIFCONFUSEDANDSTATMAXED_REGISTRATION_CASES: [BattleScriptJumpifconfusedandstatmaxedRegistrationCase; "
  + registrationCases.length + "] = [");
for (const value of registrationCases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptJumpifconfusedandstatmaxedRegistrationCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        instructions: &[" + value.instructions.map(rustRegistrationInstruction).join(", ") + "],");
  lines.push("        expected_bindings: &[" + value.expectedBindings.map(rustU8).join(", ") + "],");
  lines.push("        expected_error: " + rustOptionalString(value.expectedError) + ",");
  lines.push("    },");
}
lines.push("];" );

fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf8");
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
    execFileSync(
      rustfmt,
      ["--edition", "2021", "--config-path", path.join(workspaceRoot, "core-rs"), outputPath],
      { stdio: "inherit" },
    );
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) {
  throw new Error("gen-battle-script-jumpifconfusedandstatmaxed-vectors: could not find rustfmt");
}
const generatedBytes = fs.readFileSync(outputPath);
assert(generatedBytes.length <= GENERATED_FILE_MAX_BYTES,
  "generated Rust vectors exceed " + GENERATED_FILE_MAX_BYTES + " bytes: " + generatedBytes.length);
const generatedSha256 = crypto.createHash("sha256").update(generatedBytes).digest("hex");
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: wrote "
  + path.relative(workspaceRoot, outputPath));
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: " + cases.length + " behavior cases");
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: "
  + registrationCases.length + " registration cases");
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: domain census "
  + JSON.stringify(domainCensus));
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: category census "
  + JSON.stringify(categoryCensus));
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: branch census "
  + JSON.stringify(branchCensus));
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: registration branch census "
  + JSON.stringify(registrationBranchCensus));
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: corpus sha256 "
  + corpusSha256 + " bytes " + Buffer.byteLength(corpusText));
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: generated sha256 "
  + generatedSha256 + " bytes " + generatedBytes.length);
console.log("gen-battle-script-jumpifconfusedandstatmaxed-vectors: generator sha256 "
  + generatorSha256 + " bytes " + generatorBytes.length);
