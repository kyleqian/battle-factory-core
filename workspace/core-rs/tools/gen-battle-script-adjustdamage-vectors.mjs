#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_ADJUSTNORMALDAMAGE (0x07) /
// B_SCR_OP_ADJUSTNORMALDAMAGE2 (0x08) / B_SCR_OP_ADJUSTSETDAMAGE (0x69)
// family -- the shared `adjustNormalDamageOpcodeHandler` body and
// `adjustsetdamageOpcodeHandler` in
// src/engine/battleScriptHitChainOpcode.ts (:1999-2076, :2126-2199).
//
// Expected damage/rng/error values come only from executing the canonical
// TypeScript handlers -- reached through the real
// `createBattleScriptHitChainOpcodeHandlers` factory and real committed
// instructions from the loaded program -- plus, for the three
// missing-opcode registration cases only, custom programs with the
// relevant instructions filtered out. This generator owns bounded input
// construction and Rust literal emission; it must never reimplement
// applyRandomDamageMultiplier, resolveBattleScriptBattlerHoldEffect(Param),
// recordBattleScriptItemEffectReveal, or advanceRngValue.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-adjustdamage-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot, "core-rs", "crates", "factory-core", "src",
  "battle_script_adjustdamage_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");
const GENERATED_FILE_MAX_BYTES = 6_000_000;

const [programModule, machineModule, opcodeModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptHitChainOpcode.ts")).href),
]);
const rulesModule = await import(
  pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href
);

const NAMES = {
  adjustnormaldamage: { name: "B_SCR_OP_ADJUSTNORMALDAMAGE", id: 0x07, dispatcher: "Cmd_adjustnormaldamage" },
  adjustnormaldamage2: { name: "B_SCR_OP_ADJUSTNORMALDAMAGE2", id: 0x08, dispatcher: "Cmd_adjustnormaldamage2" },
  adjustsetdamage: { name: "B_SCR_OP_ADJUSTSETDAMAGE", id: 0x69, dispatcher: "Cmd_adjustsetdamage" },
};
const CALL_SITE_COUNTS = { adjustnormaldamage: 12, adjustnormaldamage2: 2, adjustsetdamage: 9 };
const ENTRY_LABEL = "BattleScript_EffectStockpile"; // any valid label; programCounter is overridden.

const STATUS2_SUBSTITUTE = 1 << 24;
const ITEM_FOCUS_BAND = 196; // -> HOLD_EFFECT_FOCUS_BAND (39), param 10.
const ITEM_ENIGMA_BERRY = 175;
const MOVE_TACKLE = 33; // EFFECT_HIT (not false swipe)
const MOVE_FALSE_SWIPE = 206; // EFFECT_FALSE_SWIPE

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-adjustdamage-vectors: ${message}`);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return `0x${(value & 0xff).toString(16).padStart(2, "0")}`; }
function hex16(value) { return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`; }
function hex32(value) { return `0x${(value >>> 0).toString(16).padStart(8, "0")}`; }
function rustString(value) { return JSON.stringify(value); }

function defaultBattlerSpec(index) {
  return {
    side: index % 2, ability: 0, item: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], species: 1 + index,
    attack: 60 + index * 3, defense: 60 + index * 2, spAttack: 60 + index, spDefense: 60 + index * 4,
    level: 50, hp: 100, maxHP: 100, status1: 0, status2: 0, status3: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], flashFireBoosted: 0, helpingHand: 0,
    endured: 0, focusBanded: 0,
  };
}

function canonicalBattler(spec, index) {
  return Object.freeze({
    side: spec.side, ability: spec.ability, hp: spec.hp, maxHP: spec.maxHP,
    moves: Object.freeze([278, 33, 45, 98]), pp: Object.freeze([10, 20, 15, 25]),
    status1: spec.status1, status2: spec.status2, status3: spec.status3,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0, item: spec.item, statStages: Object.freeze(spec.statStages.slice()),
    types: Object.freeze(spec.types.slice()), species: spec.species,
    attack: spec.attack, defense: spec.defense, spAttack: spec.spAttack, spDefense: spec.spDefense,
    speed: 60, level: spec.level, friendship: 70, partyIndex: index,
    flashFireBoosted: spec.flashFireBoosted, helpingHand: spec.helpingHand,
    targetNotAffected: 0, endured: spec.endured,
    specialStatus: Object.freeze({ focusBanded: spec.focusBanded }),
  });
}

function canonicalRulesRaw({
  battlerSpecs, attacker, target, battlersCount = 2,
  currentMove = MOVE_TACKLE, battleTypeFlags = 0,
  enigmaBerryHoldEffects = [0, 0, 0, 0], enigmaBerryHoldEffectParams = [0, 0, 0, 0],
  battleMoveDamage = 10, aiObservedItemEffects = [0, 0, 0, 0],
}) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(battlerSpecs.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker, target, effectBattler: target ?? attacker }),
    scriptingBattler: attacker ?? 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: 0,
    lastUsedItem: 0,
    usedHeldItems: Object.freeze([0, 0, 0, 0]),
    lastLandedMoves: Object.freeze([0, 0, 0, 0]),
    lastHitByType: Object.freeze([0, 0, 0, 0]),
    aiObservedAbilityIds: Object.freeze([0, 0, 0, 0]),
    aiObservedItemEffects: freezeArray(aiObservedItemEffects),
    party: Object.freeze({
      player: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
      opponent: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
    }),
    battleTopology: Object.freeze({
      battlersCount, battleTypeFlags,
      battlerPositions: battlersCount === 4 ? Object.freeze([0, 1, 2, 3]) : Object.freeze([0, 1, 0xff, 0xff]),
    }),
    absentBattlerFlags: 0,
    sideStatuses: Object.freeze([0, 0]),
    futureSightCounter: Object.freeze([0, 0, 0, 0]),
    futureSightMove: Object.freeze([0, 0, 0, 0]),
    futureSightAttacker: Object.freeze([0, 0, 0, 0]),
    futureSightDmg: Object.freeze([0, 0, 0, 0]),
    multistringChooser: 0xff,
    dynamicBasePower: 0,
    dynamicMoveType: 0,
    weather: 0,
    enigmaBerryHoldEffects: freezeArray(enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray(enigmaBerryHoldEffectParams),
    battleMoveDamage,
  });
}

// Same "safe placeholder, then splice" trick as the critcalc/typecalc
// generators: `createBattleScriptRulesContext` eagerly resolves
// `currentMoveEffect` from `currentMove` at construction time, which throws
// BEFORE this leaf's own `requireMoveRow` ever runs. Construction uses a
// safe placeholder move and the real (possibly invalid) currentMove is
// spliced into the frozen context afterward, never touching
// construction-time validation.
function canonicalRules(spec) {
  const wantedMove = spec.currentMove ?? MOVE_TACKLE;
  try {
    return canonicalRulesRaw(spec);
  } catch {
    const placeholder = canonicalRulesRaw({ ...spec, currentMove: MOVE_TACKLE });
    return Object.freeze({ ...placeholder, currentMove: wantedMove });
  }
}

function baseSpec(overrides = {}) {
  const battlerSpecs = [0, 1, 2, 3].map((index) => defaultBattlerSpec(index));
  return { battlerSpecs, attacker: 0, target: 1, ...overrides };
}
function withBattler(spec, index, changes) {
  const battlerSpecs = spec.battlerSpecs.map((value, i) => (i === index ? { ...value, ...changes } : value));
  return { ...spec, battlerSpecs };
}

function projectBattler(b) {
  return Object.freeze({
    item: b.item, status2: b.status2, hp: b.hp, endured: b.endured,
    focusBanded: b.specialStatus.focusBanded,
  });
}
function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map(projectBattler)),
    currentMove: rules.currentMove,
    battleMoveDamage: rules.battleMoveDamage,
    moveResultFlags: rules.moveResultFlags,
    lastUsedItem: rules.lastUsedItem,
    enigmaBerryHoldEffects: freezeArray(rules.enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray(rules.enigmaBerryHoldEffectParams),
    aiObservedItemEffects: freezeArray(rules.aiObservedItemEffects),
    aiObservedAbilityIds: freezeArray(rules.aiObservedAbilityIds),
    target: rules.selectorRoles.target,
  });
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function makeRng(value, calls) {
  const ledger = [];
  for (let i = 0; i < calls; i += 1) {
    ledger.push(Object.freeze({
      call: i + 1, reason: "seed-placeholder", before: 0, after: 0, randomValue: 0,
      provenance: Object.freeze({
        programCounter: 0, opcodeId: 0, opcodeName: "SEED", dispatcher: "SEED",
        sourceLabel: "SEED", sourceStatementLine: 0,
      }),
    }));
  }
  return Object.freeze({ value, calls, ledger: Object.freeze(ledger) });
}

const program = programModule.loadBattleScriptProgram();
const instructionsByOpcode = {};
for (const key of Object.keys(NAMES)) {
  const found = program.instructions.filter((value) => value.opcodeName === NAMES[key].name);
  assert(found.length === CALL_SITE_COUNTS[key], `${key} concrete call-site count drifted: ${found.length}`);
  for (const instruction of found) {
    assert(instruction.opcodeId === NAMES[key].id, `${key} opcode id drifted`);
    assert(instruction.dispatcher === NAMES[key].dispatcher, `${key} dispatcher drifted`);
    assert(instruction.operands.length === 0, `${key} unexpectedly carries operands`);
  }
  instructionsByOpcode[key] = found;
}

const ports = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => {},
  resolveBattlerForBattleScript: () => 0,
});
const handlers = opcodeModule.createBattleScriptHitChainOpcodeHandlers(program, ports);
const handlerByOpcode = {
  adjustnormaldamage: handlers[NAMES.adjustnormaldamage.id],
  adjustnormaldamage2: handlers[NAMES.adjustnormaldamage2.id],
  adjustsetdamage: handlers[NAMES.adjustsetdamage.id],
};
for (const key of Object.keys(handlerByOpcode)) {
  assert(typeof handlerByOpcode[key] === "function", `${key} handler did not register`);
}

function sourceOutcome(key, rulesSpec, rngInSpec, instruction) {
  const handler = handlerByOpcode[key];
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  const rngIn = makeRng(rngInSpec.value >>> 0, rngInSpec.calls ?? 0);
  try {
    const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x2244_6688);
    const state = Object.freeze({ ...scaffold, programCounter: instruction.programCounter, rng: rngIn });
    const transition = handler({ program, instruction, state });
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    assert((transition.events ?? []).length === 0, "must never emit events");
    assert(transition.control.kind === "advance", "must always advance");
    const outRules = transition.rulesContext ?? rules;
    const outRng = transition.rng ?? rngIn;
    const newDrawCount = outRng.ledger.length - rngIn.ledger.length;
    assert(newDrawCount >= 0 && newDrawCount <= 2, `ledger grew by unexpected amount ${newDrawCount}`);
    const draws = [];
    for (let i = 0; i < newDrawCount; i += 1) {
      const tail = outRng.ledger[rngIn.ledger.length + i];
      draws.push(Object.freeze({
        call: tail.call, reason: tail.reason, before: tail.before, after: tail.after, randomValue: tail.randomValue,
        provenance: Object.freeze({ ...tail.provenance }),
      }));
    }
    return Object.freeze({
      expected: projectRules(outRules),
      rngIn: { value: rngIn.value, calls: rngIn.calls },
      rngOut: { value: outRng.value, calls: outRng.calls },
      draws: freezeArray(draws),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({
      expected: null, rngIn: { value: rngIn.value, calls: rngIn.calls }, rngOut: null, draws: freezeArray([]),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) {
    if (outcome.draws.length === 0) return "no-draw";
    if (outcome.draws.length === 1) return "single-draw";
    return "two-draws";
  }
  if (outcome.error.includes("requires a target role")) return "missing-target-role";
  if (outcome.error.includes("has no source-derived gBattleMoves row")) return "unknown-move-row";
  if (outcome.error.includes("outside the source gItems corpus")) return "item-out-of-range";
  throw new Error(`unknown canonical error: ${outcome.error}`);
}

// Search a bounded seed range for one whose Random() upper-16 output lands
// on a chosen side of a modulus threshold -- never hand-computing the LCG,
// only searching over real advanceRngValue-derived outputs the canonical
// engine itself would produce.
function findSeed(divisor, wantMultiple, excludeDivisor) {
  for (let candidate = 0; candidate < 200_000; candidate += 1) {
    const after = (Math.imul(1103515245, candidate) + 24691) >>> 0;
    const randomValue = (after >>> 16) & 0xffff;
    const isMultiple = randomValue % divisor === 0;
    const excludeOk = excludeDivisor === undefined || randomValue % excludeDivisor !== 0;
    if (isMultiple === wantMultiple && excludeOk) return candidate;
  }
  throw new Error(`no seed found for divisor ${divisor} wantMultiple ${wantMultiple}`);
}
// %16==0 -> variance multiplier is 100% (no reduction).
const SEED_VARIANCE_100_PERCENT = findSeed(16, true);
// A seed whose first-draw output is NOT %16==0, to pin ordinary variance math.
const SEED_VARIANCE_ORDINARY = findSeed(16, false);

const cases = [];
function addCase(label, category, key, rulesSpec, rngInSpec = { value: 0x1000_0000, calls: 0 }, instructionIndex = 0) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const instruction = instructionsByOpcode[key][instructionIndex];
  const outcome = sourceOutcome(key, rulesSpec, rngInSpec, instruction);
  cases.push(Object.freeze({
    label, category, opcode: key, branch: branchFor(outcome),
    initial: projectRules(canonicalRules(rulesSpec)),
    instruction: Object.freeze({
      opcodeName: instruction.opcodeName, opcodeId: instruction.opcodeId,
      programCounter: instruction.programCounter, dispatcher: instruction.dispatcher,
      sourceLabel: instruction.source.label, sourceStatementLine: instruction.source.statementLine,
    }),
    ...outcome,
  }));
}

// --- Role errors --------------------------------------------------------
addCase("normaldamage_missing_target_role", "role-errors", "adjustnormaldamage", { ...baseSpec(), target: null });
addCase("normaldamage2_missing_target_role", "role-errors", "adjustnormaldamage2", { ...baseSpec(), target: null });
addCase("setdamage_missing_target_role", "role-errors", "adjustsetdamage", { ...baseSpec(), target: null });

// --- No-clamp baselines ---------------------------------------------------
addCase("normaldamage_no_clamp_baseline", "no-clamp", "adjustnormaldamage", baseSpec({ battleMoveDamage: 10 }), { value: SEED_VARIANCE_ORDINARY, calls: 0 });
addCase("normaldamage2_no_clamp_baseline", "no-clamp", "adjustnormaldamage2", baseSpec({ battleMoveDamage: 10 }), { value: SEED_VARIANCE_ORDINARY, calls: 0 });
addCase("setdamage_no_clamp_baseline", "no-clamp", "adjustsetdamage", baseSpec({ battleMoveDamage: 10 }), { value: 0, calls: 0 });

// --- Variance draw arithmetic (non-holder) --------------------------------
addCase("normaldamage_variance_100_percent_seed", "variance", "adjustnormaldamage", baseSpec({ battleMoveDamage: 100 }), { value: SEED_VARIANCE_100_PERCENT, calls: 0 });
addCase("normaldamage_variance_ordinary_seed", "variance", "adjustnormaldamage", baseSpec({ battleMoveDamage: 100 }), { value: SEED_VARIANCE_ORDINARY, calls: 0 });
addCase("normaldamage_variance_rounds_to_min_one", "variance", "adjustnormaldamage", baseSpec({ battleMoveDamage: 1 }), { value: SEED_VARIANCE_ORDINARY, calls: 0 });
addCase("normaldamage2_variance_100_percent_seed", "variance", "adjustnormaldamage2", baseSpec({ battleMoveDamage: 100 }), { value: SEED_VARIANCE_100_PERCENT, calls: 0 });
addCase("normaldamage2_variance_rounds_to_min_one", "variance", "adjustnormaldamage2", baseSpec({ battleMoveDamage: 1 }), { value: SEED_VARIANCE_ORDINARY, calls: 0 });

// --- Focus Band: success/failure rolls, boundary param --------------------
// Focus Band (item 196) resolves to holdEffect 39, param 10.
addCase(
  "normaldamage_focus_band_roll_below_param_succeeds",
  "focus-band",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 100 }), 1, { item: ITEM_FOCUS_BAND, hp: 1 }),
  (() => {
    for (let candidate = 0; candidate < 300_000; candidate += 1) {
      const firstAfter = (Math.imul(1103515245, candidate) + 24691) >>> 0;
      const secondAfter = (Math.imul(1103515245, firstAfter) + 24691) >>> 0;
      const secondRoll = (secondAfter >>> 16) & 0xffff;
      if (secondRoll % 100 < 10) return { value: candidate, calls: 0 };
    }
    throw new Error("no seed found for focus band success");
  })(),
);
addCase(
  "normaldamage_focus_band_roll_at_or_above_param_fails",
  "focus-band",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 100 }), 1, { item: ITEM_FOCUS_BAND, hp: 1 }),
  (() => {
    for (let candidate = 0; candidate < 300_000; candidate += 1) {
      const firstAfter = (Math.imul(1103515245, candidate) + 24691) >>> 0;
      const secondAfter = (Math.imul(1103515245, firstAfter) + 24691) >>> 0;
      const secondRoll = (secondAfter >>> 16) & 0xffff;
      if (secondRoll % 100 >= 10) return { value: candidate, calls: 0 };
    }
    throw new Error("no seed found for focus band failure");
  })(),
);
addCase(
  "normaldamage_focus_band_always_draws_even_non_lethal",
  "focus-band",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 1 }), 1, { item: ITEM_FOCUS_BAND, hp: 100 }),
  { value: SEED_VARIANCE_ORDINARY, calls: 0 },
);
addCase(
  "normaldamage_focus_band_always_draws_even_bit_already_set",
  "focus-band",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 1 }), 1, { item: ITEM_FOCUS_BAND, focusBanded: 1 }),
  { value: SEED_VARIANCE_ORDINARY, calls: 0 },
);
addCase(
  "setdamage_focus_band_second_draw_before_equals_no_first_draw",
  "focus-band",
  "adjustsetdamage",
  withBattler(baseSpec({ battleMoveDamage: 100 }), 1, { item: ITEM_FOCUS_BAND, hp: 1 }),
  { value: 12345, calls: 0 },
);

// --- Pre-existing focus_banded bit, non-holder ----------------------------
addCase(
  "normaldamage_pre_existing_focus_banded_no_holder_no_band_draw",
  "pre-existing-flag",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 100 }), 1, { focusBanded: 1, hp: 1 }),
  { value: SEED_VARIANCE_ORDINARY, calls: 0 },
);

// --- Enigma Berry holder path ----------------------------------------------
addCase(
  "normaldamage_enigma_berry_always_succeeds_via_override",
  "enigma-berry",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 100, enigmaBerryHoldEffects: [0, 39, 0, 0], enigmaBerryHoldEffectParams: [0, 100, 0, 0] }), 1, { item: ITEM_ENIGMA_BERRY, hp: 1 }),
  { value: 0, calls: 0 },
);
addCase(
  "setdamage_enigma_berry_zero_param_always_fails",
  "enigma-berry",
  "adjustsetdamage",
  withBattler(baseSpec({ battleMoveDamage: 100, enigmaBerryHoldEffects: [0, 39, 0, 0], enigmaBerryHoldEffectParams: [0, 0, 0, 0] }), 1, { item: ITEM_ENIGMA_BERRY, hp: 1 }),
  { value: 0, calls: 0 },
);

// --- Endured clamp / endured-and-banded priority ---------------------------
addCase(
  "normaldamage_endured_clamps",
  "endured",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 100 }), 1, { endured: 1, hp: 1 }),
  { value: SEED_VARIANCE_ORDINARY, calls: 0 },
);
addCase(
  "normaldamage_endured_and_banded_endured_wins",
  "endured",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 100 }), 1, { endured: 1, focusBanded: 1, hp: 1 }),
  { value: SEED_VARIANCE_ORDINARY, calls: 0 },
);
addCase(
  "setdamage_endured_clamps",
  "endured",
  "adjustsetdamage",
  withBattler(baseSpec({ battleMoveDamage: 100 }), 1, { endured: 1, hp: 1 }),
  { value: 0, calls: 0 },
);

// --- False swipe gating differences across the three opcodes --------------
addCase(
  "normaldamage_false_swipe_clamps",
  "false-swipe",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 100, currentMove: MOVE_FALSE_SWIPE }), 1, { hp: 1 }),
  { value: SEED_VARIANCE_ORDINARY, calls: 0 },
);
addCase(
  "normaldamage2_false_swipe_not_consulted_no_clamp",
  "false-swipe",
  "adjustnormaldamage2",
  withBattler(baseSpec({ battleMoveDamage: 100, currentMove: MOVE_FALSE_SWIPE }), 1, { hp: 1 }),
  { value: SEED_VARIANCE_ORDINARY, calls: 0 },
);
addCase(
  "normaldamage_unknown_move_errors",
  "false-swipe",
  "adjustnormaldamage",
  baseSpec({ currentMove: 60000 }),
);
addCase(
  "normaldamage2_unknown_move_does_not_error",
  "false-swipe",
  "adjustnormaldamage2",
  baseSpec({ currentMove: 60000 }),
);
addCase(
  "setdamage_false_swipe_clamps_unconditionally",
  "false-swipe",
  "adjustsetdamage",
  withBattler(baseSpec({ battleMoveDamage: 100, currentMove: MOVE_FALSE_SWIPE }), 1, { hp: 1 }),
  { value: 0, calls: 0 },
);
addCase(
  "setdamage_unknown_move_errors_unconditionally",
  "false-swipe",
  "adjustsetdamage",
  baseSpec({ currentMove: 60000 }),
);

// --- Substitute suppresses an otherwise-lethal clamp -----------------------
addCase(
  "normaldamage_substitute_suppresses_lethal_clamp",
  "substitute",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 100 }), 1, { endured: 1, status2: STATUS2_SUBSTITUTE, hp: 1 }),
  { value: SEED_VARIANCE_ORDINARY, calls: 0 },
);
addCase(
  "setdamage_substitute_suppresses_lethal_clamp",
  "substitute",
  "adjustsetdamage",
  withBattler(baseSpec({ battleMoveDamage: 100 }), 1, { endured: 1, status2: STATUS2_SUBSTITUTE, hp: 1 }),
  { value: 0, calls: 0 },
);

// --- HP boundary ------------------------------------------------------------
addCase(
  "setdamage_hp_equals_damage_clamps",
  "hp-boundary",
  "adjustsetdamage",
  withBattler(baseSpec({ battleMoveDamage: 5 }), 1, { endured: 1, hp: 5 }),
  { value: 0, calls: 0 },
);
addCase(
  "setdamage_hp_equals_damage_plus_one_does_not_clamp",
  "hp-boundary",
  "adjustsetdamage",
  withBattler(baseSpec({ battleMoveDamage: 4 }), 1, { endured: 1, hp: 5 }),
  { value: 0, calls: 0 },
);

// --- RNG bookkeeping ---------------------------------------------------------
addCase("normaldamage_nonzero_starting_calls", "rng-bookkeeping", "adjustnormaldamage", baseSpec({ battleMoveDamage: 10 }), { value: SEED_VARIANCE_ORDINARY, calls: 41 });

// --- Item out of range --------------------------------------------------------
addCase(
  "normaldamage_item_out_of_range",
  "item-errors",
  "adjustnormaldamage",
  withBattler(baseSpec({ battleMoveDamage: 10 }), 1, { item: 60000 }),
  { value: SEED_VARIANCE_ORDINARY, calls: 0 },
);

const uniqueLabels = new Set(cases.map((value) => value.label));
assert(uniqueLabels.size === cases.length, "duplicate case labels");

// === Registration ============================================================
function sourceRegistration(instructions) {
  const customProgram = Object.freeze({ ...program, instructions: freezeArray(instructions) });
  try {
    const registered = opcodeModule.createBattleScriptHitChainOpcodeHandlers(customProgram, ports);
    for (const key of Object.keys(NAMES)) {
      assert(typeof registered[NAMES[key].id] === "function", `${key} handler missing after successful registration`);
    }
    return Object.freeze({ registered: true, error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ registered: false, error: error.message });
  }
}
const dedupedInstructions = [];
{
  const seenNames = new Set();
  for (const instruction of program.instructions) {
    if (!seenNames.has(instruction.opcodeName)) {
      seenNames.add(instruction.opcodeName);
      dedupedInstructions.push(instruction);
    }
  }
}
for (const key of Object.keys(NAMES)) {
  assert(
    dedupedInstructions.some((value) => value.opcodeName === NAMES[key].name),
    `deduplicated program lost the ${key} entry`,
  );
}

const registrationCases = [];
function addRegistration(label, instructions) {
  const outcome = sourceRegistration(instructions);
  registrationCases.push(Object.freeze({
    label,
    instructions: freezeArray(instructions.map((value) => Object.freeze({
      opcodeName: value.opcodeName, opcodeId: value.opcodeId, programCounter: value.programCounter,
      dispatcher: value.dispatcher, sourceLabel: value.source.label, sourceStatementLine: value.source.statementLine,
    }))),
    expectedRegistered: outcome.registered, expectedError: outcome.error,
  }));
}
addRegistration("full_committed_program_registers_all_three", dedupedInstructions);
addRegistration(
  "adjustnormaldamage_missing_from_program",
  dedupedInstructions.filter((value) => value.opcodeName !== NAMES.adjustnormaldamage.name),
);
addRegistration(
  "adjustnormaldamage2_missing_from_program",
  dedupedInstructions.filter((value) => value.opcodeName !== NAMES.adjustnormaldamage2.name),
);
addRegistration(
  "adjustsetdamage_missing_from_program",
  dedupedInstructions.filter((value) => value.opcodeName !== NAMES.adjustsetdamage.name),
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const opcodeCensus = census(cases, (value) => value.opcode);
const registrationBranchCensus = census(registrationCases, (value) => (value.expectedError === null ? "registered" : "missing-opcode"));

const corpus = Object.freeze({ categoryCensus, branchCensus, opcodeCensus, registrationBranchCensus, cases, registrationCases });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustOptionU8(value) { return value === null || value === undefined ? "None" : `Some(${value}u8)`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustArr4u16(values) { return `[${values.map(hex16).join(", ")}]`; }
function rustArr4i32(values) { return `[${values.map((v) => `${v}i32`).join(", ")}]`; }
function rustArr4u8(values) { return `[${values.map((v) => `${v}u8`).join(", ")}]`; }
function rustBattlerState(value) {
  return `BattleScriptAdjustDamageVectorBattlerState { item: ${hex16(value.item)}, status2: ${hex32(value.status2)}, hp: ${value.hp}i32, endured: ${value.endured}u8, focus_banded: ${value.focusBanded}u8 }`;
}
function rustState(value) {
  return [
    "BattleScriptAdjustDamageVectorRules {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `current_move: ${hex16(value.currentMove)}, battle_move_damage: ${value.battleMoveDamage}i32,`,
    `move_result_flags: ${hex32(value.moveResultFlags)}, last_used_item: ${hex16(value.lastUsedItem)},`,
    `enigma_berry_hold_effects: ${rustArr4u16(value.enigmaBerryHoldEffects)}, enigma_berry_hold_effect_params: ${rustArr4i32(value.enigmaBerryHoldEffectParams)},`,
    `ai_observed_item_effects: ${rustArr4u8(value.aiObservedItemEffects)}, ai_observed_ability_ids: ${rustArr4u8(value.aiObservedAbilityIds)},`,
    `target: ${rustOptionU8(value.target)},`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustRng(value) { return `BattleScriptAdjustDamageVectorRng { value: ${hex32(value.value)}, calls: ${value.calls}u32 }`; }
function rustOptionalRng(value) { return value === null ? "None" : `Some(${rustRng(value)})`; }
function rustProvenance(value) {
  return `BattleScriptAdjustDamageVectorProvenance { program_counter: ${value.programCounter}u32, opcode_id: ${hex8(value.opcodeId)}, opcode_name: ${rustString(value.opcodeName)}, dispatcher: ${rustString(value.dispatcher)}, source_label: ${rustString(value.sourceLabel)}, source_statement_line: ${value.sourceStatementLine}u32 }`;
}
function rustDraw(value) {
  return `BattleScriptAdjustDamageVectorDraw { call: ${value.call}u32, reason: ${rustString(value.reason)}, before: ${hex32(value.before)}, after: ${hex32(value.after)}, random_value: ${hex16(value.randomValue)}, provenance: ${rustProvenance(value.provenance)} }`;
}
function rustDraws(values) { return `&[${values.map(rustDraw).join(", ")}]`; }
function rustInstruction(value) {
  return `BattleScriptAdjustDamageInstruction { opcode_name: ${rustString(value.opcodeName)}, opcode_id: ${hex8(value.opcodeId)}, program_counter: ${value.programCounter}, dispatcher: ${rustString(value.dispatcher)}, source_label: ${rustString(value.sourceLabel)}, source_statement_line: ${value.sourceStatementLine}u32 }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-adjustdamage-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_adjustdamage::BattleScriptAdjustDamageInstruction;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_ADJUSTDAMAGE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_ADJUSTDAMAGE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_ADJUSTDAMAGE_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_ADJUSTDAMAGE_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push(`pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE_CONCRETE_CALL_SITE_COUNT: usize = ${CALL_SITE_COUNTS.adjustnormaldamage};`);
lines.push(`pub const BATTLE_SCRIPT_ADJUSTNORMALDAMAGE2_CONCRETE_CALL_SITE_COUNT: usize = ${CALL_SITE_COUNTS.adjustnormaldamage2};`);
lines.push(`pub const BATTLE_SCRIPT_ADJUSTSETDAMAGE_CONCRETE_CALL_SITE_COUNT: usize = ${CALL_SITE_COUNTS.adjustsetdamage};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAdjustDamageVectorBattlerState { pub item: u16, pub status2: u32, pub hp: i32, pub endured: u8, pub focus_banded: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAdjustDamageVectorRules { pub battlers: [BattleScriptAdjustDamageVectorBattlerState; 4], pub current_move: u16, pub battle_move_damage: i32, pub move_result_flags: u32, pub last_used_item: u16, pub enigma_berry_hold_effects: [u16; 4], pub enigma_berry_hold_effect_params: [i32; 4], pub ai_observed_item_effects: [u8; 4], pub ai_observed_ability_ids: [u8; 4], pub target: Option<u8> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAdjustDamageVectorRng { pub value: u32, pub calls: u32 }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAdjustDamageVectorProvenance { pub program_counter: u32, pub opcode_id: u8, pub opcode_name: &'static str, pub dispatcher: &'static str, pub source_label: &'static str, pub source_statement_line: u32 }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAdjustDamageVectorDraw { pub call: u32, pub reason: &'static str, pub before: u32, pub after: u32, pub random_value: u16, pub provenance: BattleScriptAdjustDamageVectorProvenance }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAdjustDamageVectorCase { pub label: &'static str, pub category: &'static str, pub opcode: &'static str, pub branch: &'static str, pub initial: BattleScriptAdjustDamageVectorRules, pub instruction: BattleScriptAdjustDamageInstruction<'static>, pub rng_in: BattleScriptAdjustDamageVectorRng, pub expected: Option<BattleScriptAdjustDamageVectorRules>, pub expected_rng_out: Option<BattleScriptAdjustDamageVectorRng>, pub expected_draws: &'static [BattleScriptAdjustDamageVectorDraw], pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAdjustDamageRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptAdjustDamageInstruction<'static>], pub expected_registered: bool, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ADJUSTDAMAGE_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ADJUSTDAMAGE_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ADJUSTDAMAGE_OPCODE_CENSUS", opcodeCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_ADJUSTDAMAGE_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_ADJUSTDAMAGE_CASES: [BattleScriptAdjustDamageVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptAdjustDamageVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, opcode: ${rustString(value.opcode)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        rng_in: ${rustRng(value.rngIn)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        expected_rng_out: ${rustOptionalRng(value.rngOut)},`);
  lines.push(`        expected_draws: ${rustDraws(value.draws)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_ADJUSTDAMAGE_REGISTRATION_CASES: [BattleScriptAdjustDamageRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptAdjustDamageRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_registered: ${value.expectedRegistered}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-adjustdamage-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
