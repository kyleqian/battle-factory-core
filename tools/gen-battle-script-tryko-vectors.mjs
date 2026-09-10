#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_TRYKO (0x93, Cmd_tryKO) leaf --
// `createTryKOHandler` in src/engine/battleScriptTryKOOpcode.ts (module doc
// comment :1-55).
//
// Expected damage/rng/control/error values come only from executing the
// canonical TypeScript handler -- reached through the real
// `createBattleScriptTryKOOpcodeHandlers` factory and the real committed
// tryKO instruction -- plus, for the registration/unresolved-label edges
// only, custom programs. This generator owns bounded input construction and
// Rust literal emission; it must never reimplement resolveBattleScript-
// BattlerHoldEffect(Param), recordBattleScript*Reveal, resolveBattleScript-
// Label, or advanceRngValue.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-tryko-vectors.mjs

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
  "battle_script_tryko_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");
const GENERATED_FILE_MAX_BYTES = 6_000_000;

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptTryKOOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYKO";
const OPCODE_ID = 0x93;
const DISPATCHER = "Cmd_tryKO";
const ENTRY_LABEL = "BattleScript_EffectOHKO";
const FAIL_LABEL = "BattleScript_KOFail";
const STURDY_LABEL = "BattleScript_SturdyPreventsOHKO";
const UNRESOLVED_LABEL = "BattleScript_RustTryKoUnresolved";

const ABILITY_STURDY = 5;
const ITEM_FOCUS_BAND = 196; // -> HOLD_EFFECT_FOCUS_BAND (39), param 10.
const ITEM_ENIGMA_BERRY = 175;
const STATUS3_ALWAYS_HITS = (1 << 3) | (1 << 4);
const MOVE_FISSURE = 90; // EFFECT_OHKO, accuracy 30.

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-tryko-vectors: ${message}`);
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
    endured: 0, focusBanded: 0, battlerWithSureHit: 0,
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
    battlerWithSureHit: spec.battlerWithSureHit,
  });
}

function canonicalRulesRaw({
  battlerSpecs, attacker, target, battlersCount = 2,
  currentMove = MOVE_FISSURE, battleTypeFlags = 0,
  enigmaBerryHoldEffects = [0, 0, 0, 0], enigmaBerryHoldEffectParams = [0, 0, 0, 0],
  battleMoveDamage = 0, aiObservedItemEffects = [0, 0, 0, 0], aiObservedAbilityIds = [0, 0, 0, 0],
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
    aiObservedAbilityIds: freezeArray(aiObservedAbilityIds),
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

// Same "safe placeholder, then splice" trick as the sibling rng-drawing
// generators: `createBattleScriptRulesContext` eagerly resolves
// `currentMoveEffect` from `currentMove` at construction time, which throws
// BEFORE this leaf's own `requireMoveAccuracy` ever runs. Construction uses
// a safe placeholder move and the real (possibly invalid) currentMove is
// spliced into the frozen context afterward.
function canonicalRules(spec) {
  const wantedMove = spec.currentMove ?? MOVE_FISSURE;
  try {
    return canonicalRulesRaw(spec);
  } catch {
    const placeholder = canonicalRulesRaw({ ...spec, currentMove: MOVE_FISSURE });
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
    item: b.item, ability: b.ability, level: b.level, hp: b.hp, endured: b.endured,
    focusBanded: b.specialStatus.focusBanded, status3: b.status3, battlerWithSureHit: b.battlerWithSureHit,
  });
}
function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map(projectBattler)),
    currentMove: rules.currentMove,
    battleMoveDamage: rules.battleMoveDamage,
    moveResultFlags: rules.moveResultFlags,
    lastUsedItem: rules.lastUsedItem,
    lastUsedAbility: rules.lastUsedAbility,
    multistringChooser: rules.multistringChooser,
    enigmaBerryHoldEffects: freezeArray(rules.enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray(rules.enigmaBerryHoldEffectParams),
    aiObservedItemEffects: freezeArray(rules.aiObservedItemEffects),
    aiObservedAbilityIds: freezeArray(rules.aiObservedAbilityIds),
    attacker: rules.selectorRoles.attacker,
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
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical tryKO singleton drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "canonical opcode drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(canonicalInstruction.source.label === ENTRY_LABEL, "canonical entry drifted");
assert(canonicalInstruction.programCounter === 417, "canonical program counter drifted");
assert(canonicalInstruction.operands.length === 1, "canonical operand count drifted");
assert(canonicalInstruction.operands[0]?.widthBytes === 4, "canonical pointer width drifted");
assert(canonicalInstruction.operands[0]?.expression === FAIL_LABEL, "canonical fail pointer drifted");

const resolvedFail = programModule.resolveBattleScriptLabel(program, FAIL_LABEL);
assert(resolvedFail, "fail label must resolve");
assert(resolvedFail.programCounter === 420, "canonical fail target program counter drifted");
const resolvedSturdy = programModule.resolveBattleScriptLabel(program, STURDY_LABEL);
assert(resolvedSturdy, "sturdy label must resolve");
assert(resolvedSturdy.programCounter === 2945, "canonical sturdy target program counter drifted");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_LABEL), "unresolved label unexpectedly exists");

const handlers = opcodeModule.createBattleScriptTryKOOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical tryKO handler did not register");

// A second program, identical except its labelEntries table has the Sturdy
// label excised -- `resolveBattleScriptLabel` reads `program.labelEntries`
// directly (not derived from `instructions`), so this is a faithful way to
// realize "committed program has no label BattleScript_SturdyPreventsOHKO"
// through the real handler rather than constructing the error by hand.
const { [STURDY_LABEL]: _omittedSturdyEntry, ...labelEntriesWithoutSturdy } = program.labelEntries;
const noSturdyProgram = Object.freeze({ ...program, labelEntries: Object.freeze(labelEntriesWithoutSturdy) });
assert(!programModule.resolveBattleScriptLabel(noSturdyProgram, STURDY_LABEL), "sturdy label must be absent");
assert(programModule.resolveBattleScriptLabel(noSturdyProgram, FAIL_LABEL), "fail label must still resolve");
const noSturdyHandlers = opcodeModule.createBattleScriptTryKOOpcodeHandlers(noSturdyProgram);
const noSturdyHandler = noSturdyHandlers[OPCODE_ID];
assert(typeof noSturdyHandler === "function", "no-sturdy program handler did not register");

function freezeInstructionSpec({
  operandExpression = FAIL_LABEL,
  includeOperand = true,
} = {}) {
  return Object.freeze({ operandExpression, includeOperand });
}

function instructionFromSpec(spec) {
  const operands = spec.includeOperand
    ? [Object.freeze({ ...canonicalInstruction.operands[0], expression: spec.operandExpression })]
    : [];
  return Object.freeze({ ...canonicalInstruction, operands: freezeArray(operands) });
}

function vectorInstruction(spec, useNoSturdyProgram = false) {
  const activeProgram = useNoSturdyProgram ? noSturdyProgram : program;
  const instruction = instructionFromSpec(spec);
  const operand = instruction.operands[0];
  const resolvedFailLabel = operand === undefined
    ? null
    : (programModule.resolveBattleScriptLabel(activeProgram, operand.expression) ?? null);
  const resolvedSturdyLabel = programModule.resolveBattleScriptLabel(activeProgram, STURDY_LABEL) ?? null;
  return Object.freeze({
    operandExpression: operand === undefined ? null : operand.expression,
    resolvedFailExpression: resolvedFailLabel === null ? null : operand.expression,
    resolvedFailProgramCounter: resolvedFailLabel === null ? null : resolvedFailLabel.programCounter,
    resolvedSturdyExpression: resolvedSturdyLabel === null ? null : STURDY_LABEL,
    resolvedSturdyProgramCounter: resolvedSturdyLabel === null ? null : resolvedSturdyLabel.programCounter,
  });
}

const CANONICAL_INSTRUCTION = freezeInstructionSpec();

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") {
    return Object.freeze({ kind: "jump", programCounter: transition.control.programCounter });
  }
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function sourceOutcome(rulesSpec, rngInSpec, instructionSpec, useNoSturdyProgram = false) {
  const activeProgram = useNoSturdyProgram ? noSturdyProgram : program;
  const activeHandler = useNoSturdyProgram ? noSturdyHandler : handler;
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  const rngIn = makeRng(rngInSpec.value >>> 0, rngInSpec.calls ?? 0);
  const instruction = instructionFromSpec(instructionSpec);
  try {
    const scaffold = machineModule.createBattleScriptMachine(activeProgram, ENTRY_LABEL, rules, 0x1357_9bdf);
    const state = Object.freeze({ ...scaffold, programCounter: instruction.programCounter, rng: rngIn });
    const transition = activeHandler({ program: activeProgram, instruction, state });
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    assert((transition.events ?? []).length === 0, "must never emit events");
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
      control: controlFromTransition(transition),
      rngIn: { value: rngIn.value, calls: rngIn.calls },
      rngOut: { value: outRng.value, calls: outRng.calls },
      draws: freezeArray(draws),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({
      expected: null, control: null, rngIn: { value: rngIn.value, calls: rngIn.calls }, rngOut: null,
      draws: freezeArray([]), error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) {
    const controlKind = outcome.control.kind;
    return `${controlKind}-${outcome.draws.length}-draw${outcome.draws.length === 1 ? "" : "s"}`;
  }
  if (outcome.error === "Cmd_tryKO requires a attacker role") return "missing-attacker-role";
  if (outcome.error === "Cmd_tryKO requires a target role") return "missing-target-role";
  if (outcome.error.includes("outside the source gItems corpus")) return "item-out-of-range";
  if (outcome.error.includes("committed program has no label BattleScript_SturdyPreventsOHKO")) return "unresolved-sturdy-label";
  if (outcome.error.includes("has no source-derived gBattleMoves row")) return "unknown-move-row";
  if (outcome.error.includes("unresolved jump target")) return "unresolved-fail-target";
  throw new Error(`unknown canonical error: ${outcome.error}`);
}

const cases = [];
function addCase(label, category, rulesSpec, rngInSpec = { value: 0x1000_0000, calls: 0 }, instructionSpec = CANONICAL_INSTRUCTION, useNoSturdyProgram = false) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(rulesSpec, rngInSpec, instructionSpec, useNoSturdyProgram);
  cases.push(Object.freeze({
    label, category, branch: branchFor(outcome),
    initial: projectRules(canonicalRules(rulesSpec)),
    instruction: vectorInstruction(instructionSpec, useNoSturdyProgram),
    rngIn: outcome.rngIn,
    ...outcome,
  }));
}

// Seed search helpers: never hand-compute the LCG, only search over real
// advanceRngValue-derived outputs the canonical engine itself would produce.
function advanceRngValueJs(value) {
  return (Math.imul(1103515245, value >>> 0) + 24691) >>> 0;
}
function findSeed(predicate, limit = 300_000) {
  for (let candidate = 0; candidate < limit; candidate += 1) {
    const after = advanceRngValueJs(candidate);
    const randomValue = (after >>> 16) & 0xffff;
    if (predicate(randomValue, after)) return candidate;
  }
  throw new Error("no seed found within search limit");
}
function findChainedSeed(firstPredicate, secondPredicate, limit = 300_000) {
  for (let candidate = 0; candidate < limit; candidate += 1) {
    const firstAfter = advanceRngValueJs(candidate);
    const firstRoll = (firstAfter >>> 16) & 0xffff;
    if (!firstPredicate(firstRoll)) continue;
    const secondAfter = advanceRngValueJs(firstAfter);
    const secondRoll = (secondAfter >>> 16) & 0xffff;
    if (secondPredicate(secondRoll)) return candidate;
  }
  throw new Error("no chained seed found within search limit");
}

// Fissure: accuracy 30. Equal levels -> chance = 30. roll%100+1 < 30 hits;
// roll%100+1 == 30 (or higher) misses.
const SEED_FORMULA_HIT_BOUNDARY = findSeed((roll) => (roll % 100) + 1 === 28);
const SEED_FORMULA_MISS_BOUNDARY = findSeed((roll) => (roll % 100) + 1 === 30);
const SEED_FORMULA_ORDINARY_HIT = findSeed((roll) => (roll % 100) + 1 === 1);
const SEED_FORMULA_ORDINARY_MISS = findSeed((roll) => (roll % 100) + 1 === 90);

// --- Role errors ------------------------------------------------------------
addCase("missing_attacker_role", "role-errors", { ...baseSpec(), attacker: null });
addCase("missing_target_role", "role-errors", { ...baseSpec(), target: null });

// --- Focus Band: success/failure at the param boundary (param = 10) --------
addCase(
  "focus_band_roll_below_param_succeeds",
  "focus-band",
  withBattler(baseSpec(), 1, { item: ITEM_FOCUS_BAND }),
  { value: findChainedSeed(() => true, (roll) => roll % 100 === 9), calls: 0 },
);
addCase(
  "focus_band_roll_at_param_fails",
  "focus-band",
  withBattler(baseSpec(), 1, { item: ITEM_FOCUS_BAND }),
  { value: findChainedSeed(() => true, (roll) => roll % 100 === 10), calls: 0 },
);
addCase(
  "focus_band_then_sturdy_both_effects_draw_consumed_sturdy_wins",
  "focus-band",
  withBattler(withBattler(baseSpec(), 1, { item: ITEM_FOCUS_BAND }), 1, { ability: ABILITY_STURDY }),
  { value: findChainedSeed(() => true, (roll) => roll % 100 === 5), calls: 0 },
);
addCase(
  "sturdy_without_band_no_draw",
  "sturdy",
  withBattler(baseSpec(), 1, { ability: ABILITY_STURDY }),
  { value: SEED_FORMULA_ORDINARY_HIT, calls: 0 },
);
addCase(
  "enigma_berry_focus_band_always_succeeds",
  "focus-band",
  withBattler(baseSpec({ enigmaBerryHoldEffects: [0, 39, 0, 0], enigmaBerryHoldEffectParams: [0, 100, 0, 0] }), 1, { item: ITEM_ENIGMA_BERRY }),
  { value: 0, calls: 0 },
);

// --- ownedSureHit: full conjunction skips the formula draw ------------------
addCase(
  "sure_hit_owned_no_formula_draw",
  "sure-hit",
  withBattler(baseSpec(), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 0 }),
  { value: SEED_FORMULA_ORDINARY_MISS, calls: 0 },
);
addCase(
  "sure_hit_owner_mismatch_draws",
  "sure-hit",
  withBattler(baseSpec(), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 2 }),
  { value: SEED_FORMULA_ORDINARY_HIT, calls: 0 },
);
addCase(
  "sure_hit_underlevel_draws",
  "sure-hit",
  withBattler(withBattler(baseSpec(), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 0 }), 0, { level: 10 }),
  { value: SEED_FORMULA_ORDINARY_HIT, calls: 0 },
);

// --- Formula strict-< boundary, equal levels --------------------------------
addCase("formula_hit_boundary", "formula", baseSpec(), { value: SEED_FORMULA_HIT_BOUNDARY, calls: 0 });
addCase("formula_miss_boundary", "formula", baseSpec(), { value: SEED_FORMULA_MISS_BOUNDARY, calls: 0 });

// --- Nonzero level difference feeding chance --------------------------------
addCase(
  "attacker_higher_level_raises_chance",
  "formula",
  withBattler(baseSpec(), 0, { level: 60 }),
  { value: SEED_FORMULA_MISS_BOUNDARY, calls: 0 },
);

// --- Level-clause hard override: winning roll, target out-levels attacker --
addCase(
  "level_clause_overrides_a_winning_roll",
  "formula",
  withBattler(baseSpec(), 1, { level: 90 }),
  { value: 0, calls: 0 },
);

// --- Hit trichotomy ----------------------------------------------------------
addCase(
  "trichotomy_endured_beats_focus_banded",
  "trichotomy",
  withBattler(withBattler(baseSpec(), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 0 }), 1, { endured: 1, focusBanded: 1, hp: 5 }),
  { value: 0, calls: 0 },
);
addCase(
  "trichotomy_focus_banded_only_sets_last_used_item",
  "trichotomy",
  withBattler(withBattler(baseSpec(), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 0 }), 1, { focusBanded: 1, hp: 5, item: 250 }),
  { value: 0, calls: 0 },
);
addCase(
  "trichotomy_persisted_focus_banded_no_band_item_no_draw",
  "trichotomy",
  withBattler(withBattler(baseSpec(), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 0 }), 1, { focusBanded: 1, hp: 5 }),
  { value: 0, calls: 0 },
);
addCase(
  "trichotomy_plain_ohko",
  "trichotomy",
  withBattler(baseSpec(), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 0, hp: 37 }),
  { value: 0, calls: 0 },
);

// --- Miss message chooser ----------------------------------------------------
addCase("miss_message_ko_miss", "miss-message", baseSpec(), { value: SEED_FORMULA_ORDINARY_MISS, calls: 0 });
addCase(
  "miss_message_ko_unaffected",
  "miss-message",
  withBattler(baseSpec(), 1, { level: 90 }),
  { value: 0, calls: 0 },
);
addCase(
  "miss_jumps_to_resolved_kofail_target",
  "miss-message",
  baseSpec(),
  { value: SEED_FORMULA_ORDINARY_MISS, calls: 0 },
);

// --- RNG bookkeeping ----------------------------------------------------------
addCase("nonzero_starting_calls", "rng-bookkeeping", baseSpec(), { value: SEED_FORMULA_ORDINARY_HIT, calls: 41 });

// --- Error edges --------------------------------------------------------------
addCase("unknown_move_errors", "errors", baseSpec({ currentMove: 60000 }));
addCase(
  "unknown_move_errors_on_sure_hit_path",
  "errors",
  withBattler(baseSpec({ currentMove: 60000 }), 1, { status3: STATUS3_ALWAYS_HITS, battlerWithSureHit: 0 }),
);
addCase(
  "item_out_of_range",
  "errors",
  withBattler(baseSpec(), 1, { item: 60000 }),
);
addCase(
  "unresolved_sturdy_label_custom_program",
  "errors",
  withBattler(baseSpec(), 1, { ability: ABILITY_STURDY }),
  { value: 0, calls: 0 },
  freezeInstructionSpec(),
  /* useNoSturdyProgram */ true,
);
addCase(
  "unresolved_fail_target_custom_program",
  "errors",
  baseSpec(),
  { value: SEED_FORMULA_ORDINARY_MISS, calls: 0 },
  freezeInstructionSpec({ operandExpression: UNRESOLVED_LABEL }),
);

const uniqueLabels = new Set(cases.map((value) => value.label));
assert(uniqueLabels.size === cases.length, "duplicate case labels");

// === Registration ============================================================
function sourceRegistration(includeCanonical, extra) {
  const noise = Object.freeze({ ...canonicalInstruction, opcodeName: "B_SCR_OP_RUST_NOISE", opcodeId: 0 });
  const instructions = Object.freeze([
    ...(extra ?? []),
    noise,
    ...(includeCanonical ? [canonicalInstruction] : []),
  ]);
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTryKOOpcodeHandlers(customProgram);
    const keys = Object.keys(registered);
    assert(keys.length === 1, "canonical registration emitted more than one key");
    return Object.freeze({ opcodeId: Number(keys[0]), error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ opcodeId: null, error: error.message });
  }
}

const registrationCases = [];
function addRegistration(label, outcome) {
  registrationCases.push(Object.freeze({ label, expectedOpcodeId: outcome.opcodeId, expectedError: outcome.error }));
}
addRegistration("valid_singleton", sourceRegistration(true));
addRegistration("missing_opcode", sourceRegistration(false));
addRegistration("duplicate_first_wins", sourceRegistration(true, [canonicalInstruction]));

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (value.expectedError === null ? "registered" : "missing-opcode"));

const corpus = Object.freeze({ categoryCensus, branchCensus, registrationBranchCensus, cases, registrationCases });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptionU32(value) { return value === null || value === undefined ? "None" : `Some(${value}u32)`; }
function rustArr4u16(values) { return `[${values.map(hex16).join(", ")}]`; }
function rustArr4i32(values) { return `[${values.map((v) => `${v}i32`).join(", ")}]`; }
function rustArr4u8(values) { return `[${values.map((v) => `${v}u8`).join(", ")}]`; }
function rustOptionU8(value) { return value === null || value === undefined ? "None" : `Some(${value}u8)`; }
function rustBattlerState(value) {
  return `BattleScriptTryKoVectorBattlerState { item: ${hex16(value.item)}, ability: ${hex8(value.ability)}, level: ${value.level}i32, hp: ${value.hp}i32, endured: ${value.endured}u8, focus_banded: ${value.focusBanded}u8, status3: ${hex32(value.status3)}, battler_with_sure_hit: ${hex8(value.battlerWithSureHit)} }`;
}
function rustState(value) {
  return [
    "BattleScriptTryKoVectorRules {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `current_move: ${hex16(value.currentMove)}, battle_move_damage: ${value.battleMoveDamage}i32,`,
    `move_result_flags: ${hex32(value.moveResultFlags)}, last_used_item: ${hex16(value.lastUsedItem)},`,
    `last_used_ability: ${hex8(value.lastUsedAbility)}, multistring_chooser: ${hex8(value.multistringChooser)},`,
    `enigma_berry_hold_effects: ${rustArr4u16(value.enigmaBerryHoldEffects)}, enigma_berry_hold_effect_params: ${rustArr4i32(value.enigmaBerryHoldEffectParams)},`,
    `ai_observed_item_effects: ${rustArr4u8(value.aiObservedItemEffects)}, ai_observed_ability_ids: ${rustArr4u8(value.aiObservedAbilityIds)},`,
    `attacker: ${rustOptionU8(value.attacker)}, target: ${rustOptionU8(value.target)},`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustRng(value) { return `BattleScriptTryKoVectorRng { value: ${hex32(value.value)}, calls: ${value.calls}u32 }`; }
function rustOptionalRng(value) { return value === null ? "None" : `Some(${rustRng(value)})`; }
function rustProvenance(value) {
  return `BattleScriptTryKoVectorProvenance { program_counter: ${value.programCounter}u32, opcode_id: ${hex8(value.opcodeId)}, opcode_name: ${rustString(value.opcodeName)}, dispatcher: ${rustString(value.dispatcher)}, source_label: ${rustString(value.sourceLabel)}, source_statement_line: ${value.sourceStatementLine}u32 }`;
}
function rustDraw(value) {
  return `BattleScriptTryKoVectorDraw { call: ${value.call}u32, reason: ${rustString(value.reason)}, before: ${hex32(value.before)}, after: ${hex32(value.after)}, random_value: ${hex16(value.randomValue)}, provenance: ${rustProvenance(value.provenance)} }`;
}
function rustDraws(values) { return `&[${values.map(rustDraw).join(", ")}]`; }
function rustControl(value) {
  if (value === null) return "None";
  return value.kind === "advance"
    ? "Some(BattleScriptTryKoVectorControl::Advance)"
    : `Some(BattleScriptTryKoVectorControl::Jump { program_counter: ${value.programCounter}u32 })`;
}
function rustOptionalLabel(expression, programCounter) {
  return expression === null ? "None"
    : `Some(BattleScriptTryKoResolvedLabel { expression: ${rustString(expression)}, program_counter: ${programCounter}u32 })`;
}
function rustInstruction(value) {
  const operands = value.operandExpression === null
    ? []
    : [`BattleScriptTryKoOperand { width_bytes: 4, expression: ${rustString(value.operandExpression)} }`];
  return `BattleScriptTryKoInstruction { opcode_name: ${rustString(OPCODE_NAME)}, opcode_id: ${hex8(OPCODE_ID)}, program_counter: 417, dispatcher: ${rustString(DISPATCHER)}, source_label: ${rustString(ENTRY_LABEL)}, source_statement_line: 769u32, operands: &[${operands.join(", ")}], resolved_sturdy_target: ${rustOptionalLabel(value.resolvedSturdyExpression, value.resolvedSturdyProgramCounter)}, resolved_fail_target: ${rustOptionalLabel(value.resolvedFailExpression, value.resolvedFailProgramCounter)} }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-tryko-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTryKOOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_tryko::{");
lines.push("    BattleScriptTryKoInstruction, BattleScriptTryKoOperand, BattleScriptTryKoResolvedLabel,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYKO_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYKO_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYKO_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYKO_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryKoVectorBattlerState { pub item: u16, pub ability: u8, pub level: i32, pub hp: i32, pub endured: u8, pub focus_banded: u8, pub status3: u32, pub battler_with_sure_hit: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryKoVectorRules { pub battlers: [BattleScriptTryKoVectorBattlerState; 4], pub current_move: u16, pub battle_move_damage: i32, pub move_result_flags: u32, pub last_used_item: u16, pub last_used_ability: u8, pub multistring_chooser: u8, pub enigma_berry_hold_effects: [u16; 4], pub enigma_berry_hold_effect_params: [i32; 4], pub ai_observed_item_effects: [u8; 4], pub ai_observed_ability_ids: [u8; 4], pub attacker: Option<u8>, pub target: Option<u8> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryKoVectorRng { pub value: u32, pub calls: u32 }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryKoVectorProvenance { pub program_counter: u32, pub opcode_id: u8, pub opcode_name: &'static str, pub dispatcher: &'static str, pub source_label: &'static str, pub source_statement_line: u32 }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryKoVectorDraw { pub call: u32, pub reason: &'static str, pub before: u32, pub after: u32, pub random_value: u16, pub provenance: BattleScriptTryKoVectorProvenance }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub enum BattleScriptTryKoVectorControl { Advance, Jump { program_counter: u32 } }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryKoVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptTryKoVectorRules, pub instruction: BattleScriptTryKoInstruction<'static>, pub rng_in: BattleScriptTryKoVectorRng, pub expected: Option<BattleScriptTryKoVectorRules>, pub control: Option<BattleScriptTryKoVectorControl>, pub expected_rng_out: Option<BattleScriptTryKoVectorRng>, pub expected_draws: &'static [BattleScriptTryKoVectorDraw], pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryKoRegistrationVectorCase { pub label: &'static str, pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYKO_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYKO_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYKO_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYKO_CASES: [BattleScriptTryKoVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryKoVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        rng_in: ${rustRng(value.rngIn)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        control: ${rustControl(value.control)},`);
  lines.push(`        expected_rng_out: ${rustOptionalRng(value.rngOut)},`);
  lines.push(`        expected_draws: ${rustDraws(value.draws)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYKO_REGISTRATION_CASES: [BattleScriptTryKoRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryKoRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        expected_opcode_id: ${rustOptionU8(value.expectedOpcodeId)}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), path.join(process.env.HOME ?? "", ".cargo", "bin", "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-tryko-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
