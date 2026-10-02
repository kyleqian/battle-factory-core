#!/usr/bin/env node
// Canonical TypeScript differential corpus for Cmd_jumpifstatus/Cmd_jumpifstatus2.
// Run from any cwd with:
// node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifstatus-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const outputPath = path.join(
  workspaceRoot,
  "core-rs/crates/factory-core/src/battle_script_jumpifstatus_vectors_gen.rs",
);
const [programModule, statusPrimaryModule, statbuffchangeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptStatusPrimaryOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptStatbuffchangeOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptRulesContext.ts")).href),
]);

const OPCODE1_NAME = "B_SCR_OP_JUMPIFSTATUS";
const OPCODE1_ID = 0x1c;
const OPCODE2_NAME = "B_SCR_OP_JUMPIFSTATUS2";
const OPCODE2_ID = 0x1d;

const assert = (condition, message) => {
  if (!condition) throw new Error(`jumpifstatus generator: ${message}`);
};
const frozen = (values) => Object.freeze(values.slice());
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const program = programModule.loadBattleScriptProgram();
const sites1 = frozen(program.instructions.filter((instruction) => instruction.opcodeName === OPCODE1_NAME));
const sites2 = frozen(program.instructions.filter((instruction) => instruction.opcodeName === OPCODE2_NAME));
assert(sites1.length === 21, `expected 21 jumpifstatus sites, got ${sites1.length}`);
assert(sites2.length === 37, `expected 37 jumpifstatus2 sites, got ${sites2.length}`);
assert(
  sites1.every((site) => site.opcodeId === OPCODE1_ID && site.operands.length === 3
    && site.operands[0].widthBytes === 1 && site.operands[1].widthBytes === 4 && site.operands[2].widthBytes === 4),
  "jumpifstatus operand shape drift",
);
assert(
  sites2.every((site) => site.opcodeId === OPCODE2_ID && site.operands.length === 3
    && site.operands[0].widthBytes === 1 && site.operands[1].widthBytes === 4 && site.operands[2].widthBytes === 4),
  "jumpifstatus2 operand shape drift",
);
const anySite = sites1.find((site) => site.operands[1].expression === "STATUS1_ANY");
const comboSite = sites1.find((site) => site.operands[1].expression.includes("|"));
assert(anySite, "expected a STATUS1_ANY call site");
assert(comboSite, "expected the 4-way |-combination call site");
assert(
  comboSite.operands[1].expression
    === "STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON",
  "combo site expression drift",
);
const multipleturnsSite = sites2.find((site) => site.operands[1].expression === "STATUS2_MULTIPLETURNS");
assert(multipleturnsSite, "expected a STATUS2_MULTIPLETURNS call site");

const resolveBattler = rulesModule.resolveRulesBattlerForBattleScript;
const handlers1 = statusPrimaryModule.createBattleScriptStatusPrimaryOpcodeHandlers(program, resolveBattler);
const handler1 = handlers1[OPCODE1_ID];
assert(typeof handler1 === "function", "canonical jumpifstatus handler missing");
const handlers2 = statbuffchangeModule.createBattleScriptStatbuffchangeOpcodeHandlers(program, {
  isControllerIdle: () => true,
  resolveBattlerForBattleScript: resolveBattler,
});
const handler2 = handlers2[OPCODE2_ID];
assert(typeof handler2 === "function", "canonical jumpifstatus2 handler missing");

function makeBattler(index, status1, status2, hp) {
  return Object.freeze({
    side: index % 2,
    ability: 0,
    hp,
    moves: frozen([76, 33 + index, 207, 0]),
    pp: frozen([10, 35 - index, 15, 0]),
    status1,
    status2,
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
    statStages: frozen([6, 6, 6, 6, 6, 6, 6, 6]),
    types: frozen(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 19 + index,
    attack: 50,
    defense: 51,
    spAttack: 52,
    spDefense: 53,
    level: 50,
    friendship: 70,
  });
}

function canonicalRules({ battlerSelector, roleIndex, status1s, status2s, hps }) {
  const battlers = [0, 1, 2, 3].map((index) => makeBattler(index, status1s[index], status2s[index], hps[index]));
  const attacker = battlerSelector === "BS_ATTACKER" ? roleIndex : (roleIndex === null ? 1 : (roleIndex + 1) % 4);
  const target = battlerSelector === "BS_TARGET" ? roleIndex : (roleIndex === null ? 1 : (roleIndex + 1) % 4);
  return rulesModule.createBattleScriptRulesContext({
    battlers: frozen(battlers),
    selectorRoles: { attacker, target, effectBattler: 2, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 57,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: { battlersCount: 4, battleTypeFlags: 1, battlerPositions: [0, 1, 2, 3] },
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlersStatus1: frozen(rules.battlers.map((b) => b.status1)),
    battlersStatus2: frozen(rules.battlers.map((b) => b.status2)),
    battlersHp: frozen(rules.battlers.map((b) => b.hp)),
  });
}

function activeProgram(targetResolves, targetExpression) {
  if (targetResolves) return program;
  const entries = { ...program.labelEntries };
  delete entries[targetExpression];
  return Object.freeze({ ...program, labelEntries: Object.freeze(entries) });
}

function withOperandExpression(site, statusExpression) {
  if (site.operands[1].expression === statusExpression) return site;
  return Object.freeze({
    ...site,
    operands: frozen([
      site.operands[0],
      Object.freeze({ ...site.operands[1], expression: statusExpression }),
      site.operands[2],
    ]),
  });
}

const machineModule = await import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptMachine.ts")).href);

function drive({ handler, site, rules, targetResolves, statusExpression, opcodeErrorPrefixes }) {
  const before = vectorState(rules);
  const selectedProgram = activeProgram(targetResolves, site.operands[2].expression);
  const instruction = withOperandExpression(site, statusExpression);
  try {
    const state = Object.freeze({
      ...machineModule.createBattleScriptMachine(selectedProgram, site.source.label, rules, 0x9c51_0000 >>> 0),
      programCounter: site.programCounter,
    });
    const transition = handler({ program: selectedProgram, instruction, state });
    assert(transition.rulesContext === rules, "handler replaced rules context");
    assert(transition.events.length === 0, "handler emitted event");
    assert(same(vectorState(rules), before), "handler mutated rules");
    let control;
    if (transition.control.kind === "advance") {
      control = { kind: "advance" };
    } else if (transition.control.kind === "jump") {
      control = { kind: "jump", programCounter: transition.control.programCounter };
    } else if (transition.control.kind === "block") {
      assert(transition.control.reason.kind === "source-context-unavailable", "unexpected block reason");
      control = { kind: "block", operandExpression: transition.control.reason.operandExpression };
    } else if (transition.control.kind === "halt") {
      assert(transition.control.reason.kind === "unsupported-branch", "unexpected halt reason");
      control = {
        kind: "halt",
        programCounter: transition.control.reason.programCounter,
        opcodeId: transition.control.reason.opcodeId,
        opcodeName: transition.control.reason.opcodeName,
        sourceConstruct: transition.control.reason.sourceConstruct,
        sourceLine: transition.control.reason.sourceLine,
      };
    } else {
      throw new Error(`unexpected control kind ${transition.control.kind}`);
    }
    return { control, error: null };
  } catch (error) {
    assert(error instanceof Error, `non-Error throw ${String(error)}`);
    assert(same(vectorState(rules), before), "throwing handler mutated rules");
    assert(
      opcodeErrorPrefixes.some((prefix) => error.message.startsWith(prefix)),
      `unexpected error ${error.message}`,
    );
    return { control: null, error: error.message };
  }
}

const cases = [];
function addCase({
  label,
  category,
  opcode,
  site,
  battlerSelector,
  roleIndex,
  status1s = [0, 0, 0, 0],
  status2s = [0, 0, 0, 0],
  hps = [100, 100, 100, 100],
  statusExpression,
  targetResolves = true,
}) {
  assert(/^[a-z0-9_]+$/.test(label), `bad label ${label}`);
  assert(!cases.some((entry) => entry.label === label), `duplicate label ${label}`);
  const resolvedBattlerSelector = battlerSelector ?? site.operands[0].expression;
  const resolvedStatusExpression = statusExpression ?? site.operands[1].expression;
  const rules = canonicalRules({ battlerSelector: resolvedBattlerSelector, roleIndex, status1s, status2s, hps });
  const handler = opcode === 1 ? handler1 : handler2;
  const dispatcher = opcode === 1 ? "Cmd_jumpifstatus" : "Cmd_jumpifstatus2";
  const outcome = drive({
    handler,
    site,
    rules,
    targetResolves,
    statusExpression: resolvedStatusExpression,
    opcodeErrorPrefixes: [`${dispatcher}: unresolved jump target`],
  });
  const branch = outcome.error
    ? "unresolved-label"
    : outcome.control.kind;
  cases.push(Object.freeze({
    label,
    category,
    opcode,
    branch,
    execution: Object.freeze({
      programCounter: site.programCounter,
      statusExpression: resolvedStatusExpression,
      battlerOperandExpression: site.operands[0].expression,
      battler: roleIndex,
      jumpTargetExpression: site.operands[2].expression,
      resolvedJumpProgramCounter: targetResolves
        ? programModule.resolveBattleScriptLabel(program, site.operands[2].expression)?.programCounter ?? null
        : null,
    }),
    initial: vectorState(rules),
    control: outcome.control,
    expectedError: outcome.error,
  }));
}

// --- jumpifstatus (status1) behavior cases ---
const sleepSite = sites1.find((site) => site.operands[1].expression === "STATUS1_SLEEP");
addCase({ label: "status1_sleep_jump_hit", category: "jump-hit", opcode: 1, site: sleepSite, roleIndex: 1, status1s: [0, 0x7, 0, 0] });
addCase({ label: "status1_sleep_miss_by_status", category: "miss-by-status", opcode: 1, site: sleepSite, roleIndex: 1, status1s: [0, 0, 0, 0] });
addCase({ label: "status1_sleep_miss_by_fainted", category: "miss-by-hp", opcode: 1, site: sleepSite, roleIndex: 1, status1s: [0, 0x7, 0, 0], hps: [100, 0, 100, 100] });
addCase({ label: "status1_any_jump_hit_burn", category: "status1-any", opcode: 1, site: anySite, roleIndex: 1, status1s: [0, 1 << 4, 0, 0] });
addCase({ label: "status1_any_miss_no_status", category: "status1-any", opcode: 1, site: anySite, roleIndex: 1, status1s: [0, 0, 0, 0] });
{
  const bits = [
    ["STATUS1_POISON", 1 << 3],
    ["STATUS1_BURN", 1 << 4],
    ["STATUS1_PARALYSIS", 1 << 6],
    ["STATUS1_TOXIC_POISON", 1 << 7],
  ];
  for (const [name, bit] of bits) {
    addCase({
      label: `status1_combo_hits_via_${name.toLowerCase()}`,
      category: "combo-site",
      opcode: 1,
      site: comboSite,
      roleIndex: 0,
      status1s: [bit, 0, 0, 0],
    });
  }
  addCase({
    label: "status1_combo_miss_unrelated_bit",
    category: "combo-site",
    opcode: 1,
    site: comboSite,
    roleIndex: 0,
    status1s: [1 << 5, 0, 0, 0], // STATUS1_FREEZE, not in the combo
  });
}
addCase({
  label: "status1_selector_block_unresolved_battler",
  category: "selector-block",
  opcode: 1,
  site: sleepSite,
  roleIndex: null,
  status1s: [0, 0, 0, 0],
});
addCase({
  label: "status1_unsupported_mask_expression",
  category: "unsupported-mask",
  opcode: 1,
  site: sleepSite,
  roleIndex: 1,
  statusExpression: "STATUS1_BOGUS",
});
addCase({
  label: "status1_unsupported_mask_precedes_selector_block",
  category: "precedence",
  opcode: 1,
  site: sleepSite,
  roleIndex: null,
  statusExpression: "STATUS1_BOGUS",
});
addCase({
  label: "status1_unresolved_target_on_taken_branch",
  category: "unresolved-label",
  opcode: 1,
  site: sleepSite,
  roleIndex: 1,
  status1s: [0, 0x7, 0, 0],
  targetResolves: false,
});
addCase({
  label: "status1_untaken_branch_ignores_unresolvable_target",
  category: "unresolved-label",
  opcode: 1,
  site: sleepSite,
  roleIndex: 1,
  status1s: [0, 0, 0, 0],
  targetResolves: false,
});

// --- jumpifstatus2 (status2) behavior cases ---
const substituteSite = sites2.find((site) => site.operands[1].expression === "STATUS2_SUBSTITUTE");
addCase({ label: "status2_substitute_jump_hit", category: "jump-hit", opcode: 2, site: substituteSite, roleIndex: 1, status2s: [0, 1 << 24, 0, 0] });
addCase({ label: "status2_substitute_miss_by_status", category: "miss-by-status", opcode: 2, site: substituteSite, roleIndex: 1, status2s: [0, 0, 0, 0] });
addCase({ label: "status2_substitute_miss_by_fainted", category: "miss-by-hp", opcode: 2, site: substituteSite, roleIndex: 1, status2s: [0, 1 << 24, 0, 0], hps: [100, 0, 100, 100] });
addCase({ label: "status2_multipleturns_jump_hit", category: "jump-hit", opcode: 2, site: multipleturnsSite, roleIndex: 0, status2s: [1 << 12, 0, 0, 0] });
addCase({
  label: "status2_selector_block_unresolved_battler",
  category: "selector-block",
  opcode: 2,
  site: substituteSite,
  roleIndex: null,
  status2s: [0, 0, 0, 0],
});
addCase({
  label: "status2_unsupported_mask_expression",
  category: "unsupported-mask",
  opcode: 2,
  site: substituteSite,
  roleIndex: 1,
  statusExpression: "STATUS2_BOGUS",
});
addCase({
  label: "status2_combination_not_supported",
  category: "unsupported-mask",
  opcode: 2,
  site: substituteSite,
  roleIndex: 1,
  statusExpression: "STATUS2_SUBSTITUTE | STATUS2_CONFUSION",
});
addCase({
  label: "status2_unsupported_mask_precedes_selector_block",
  category: "precedence",
  opcode: 2,
  site: substituteSite,
  roleIndex: null,
  statusExpression: "STATUS2_BOGUS",
});
addCase({
  label: "status2_unresolved_target_on_taken_branch",
  category: "unresolved-label",
  opcode: 2,
  site: substituteSite,
  roleIndex: 1,
  status2s: [0, 1 << 24, 0, 0],
  targetResolves: false,
});
addCase({
  label: "status2_untaken_branch_ignores_unresolvable_target",
  category: "unresolved-label",
  opcode: 2,
  site: substituteSite,
  roleIndex: 1,
  status2s: [0, 0, 0, 0],
  targetResolves: false,
});
for (const [name, bit] of [
  ["confusion", 0x7],
  ["focus_energy", 1 << 20],
  ["escape_prevention", 1 << 26],
  ["nightmare", 1 << 27],
]) {
  addCase({
    label: `status2_${name}_jump_hit`,
    category: "fixed-map-values",
    opcode: 2,
    site: substituteSite,
    roleIndex: 1,
    status2s: [0, bit, 0, 0],
    statusExpression: `STATUS2_${name.toUpperCase()}`,
  });
}
// --- registration cases ---
const registrationCases = [];
// Status1: required-presence convention. This uses the real committed
// program's own jumpifstatus/jumpifstatus2/jumpiftype/jumpifsideaffecting/
// jumpifcantmakeasleep concrete starts (all present), so "present" reuses
// the real program and "absent" is the only synthetic shape needed. Only the
// outcome (not the instruction list) is captured -- the Rust side's own
// `register_battle_script_jumpifstatus`/`register_battle_script_jumpifstatus2`
// operate on small synthetic instruction lists tested inline in the Rust
// module's unit tests.
{
  const result = statusPrimaryModule.createBattleScriptStatusPrimaryOpcodeHandlers(program, resolveBattler);
  assert(result[OPCODE1_ID] !== undefined, "expected jumpifstatus to be registered in the real committed program");
  registrationCases.push(Object.freeze({
    label: "status1_present_in_real_program",
    opcode: 1,
    instructions: frozen([]),
    registered: true,
    boundOpcodeId: sites1[0].opcodeId,
    error: null,
  }));
}
try {
  statusPrimaryModule.createBattleScriptStatusPrimaryOpcodeHandlers(
    Object.freeze({ ...program, instructions: frozen(program.instructions.filter((i) => i.opcodeName !== OPCODE1_NAME)) }),
    resolveBattler,
  );
  throw new Error("expected missing-jumpifstatus registration to throw");
} catch (error) {
  assert(
    error.message === "committed Battle Script program does not emit B_SCR_OP_JUMPIFSTATUS",
    `unexpected missing-registration error ${error.message}`,
  );
  registrationCases.push(Object.freeze({
    label: "status1_absent_required_error",
    opcode: 1,
    instructions: frozen([]),
    registered: false,
    boundOpcodeId: null,
    error: error.message,
  }));
}
registrationCases.push(Object.freeze({
  label: "status1_present_bound_first",
  opcode: 1,
  instructions: frozen([{ opcodeName: OPCODE1_NAME, opcodeId: sites1[0].opcodeId }]),
  registered: true,
  boundOpcodeId: sites1[0].opcodeId,
  error: null,
}));

// Status2: optional-presence convention -- use the real program (present)
// and a program with every jumpifstatus2 start filtered out (absent, no error).
const present2 = handlers2[OPCODE2_ID] !== undefined;
assert(present2, "expected jumpifstatus2 to be registered in the real committed program");
registrationCases.push(Object.freeze({
  label: "status2_present_in_real_program",
  opcode: 2,
  instructions: frozen([]),
  registered: true,
  boundOpcodeId: sites2[0].opcodeId,
  error: null,
}));
{
  const withoutStatus2 = Object.freeze({
    ...program,
    instructions: frozen(program.instructions.filter((i) => i.opcodeName !== OPCODE2_NAME)),
  });
  const result = statbuffchangeModule.createBattleScriptStatbuffchangeOpcodeHandlers(withoutStatus2, {
    isControllerIdle: () => true,
    resolveBattlerForBattleScript: resolveBattler,
  });
  assert(result[OPCODE2_ID] === undefined, "expected no binding when jumpifstatus2 is absent");
  registrationCases.push(Object.freeze({
    label: "status2_absent_optional_no_error",
    opcode: 2,
    instructions: frozen([]),
    registered: false,
    boundOpcodeId: null,
    error: null,
  }));
}

function census(values, key) {
  const result = new Map();
  for (const value of values) result.set(value[key], (result.get(value[key]) ?? 0) + 1);
  return frozen(Array.from(result.entries()));
}
const categoryCensus = census(cases, "category");
const branchCensus = census(cases, "branch");
const corpus = Object.freeze({ categoryCensus, branchCensus, cases, registrationCases });
const corpusText = JSON.stringify(corpus);
const corpusSha = crypto.createHash("sha256").update(corpusText).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorSha = crypto.createHash("sha256").update(generatorBytes).digest("hex");
const rs = JSON.stringify;
const optionU8 = (value) => (value === null || value === undefined ? "None" : `Some(${value})`);
const optionU32 = (value) => (value === null || value === undefined ? "None" : `Some(${value})`);
const optionString = (value) => (value === null || value === undefined ? "None" : `Some(${rs(value)})`);
function rulesState(value) {
  return `BattleScriptJumpifstatusRules { battlers_status1: [${value.battlersStatus1.join(", ")}], battlers_status2: [${value.battlersStatus2.join(", ")}], battlers_hp: [${value.battlersHp.join(", ")}] }`;
}
function controlExpr(control) {
  if (control === null) return "None";
  if (control.kind === "advance") return "Some(BattleScriptJumpifstatusVectorControl::Advance)";
  if (control.kind === "jump") return `Some(BattleScriptJumpifstatusVectorControl::Jump { program_counter: ${control.programCounter} })`;
  if (control.kind === "block") return `Some(BattleScriptJumpifstatusVectorControl::Block { operand_expression: ${rs(control.operandExpression)} })`;
  return `Some(BattleScriptJumpifstatusVectorControl::Halt { program_counter: ${control.programCounter}, opcode_id: ${control.opcodeId}, opcode_name: ${rs(control.opcodeName)}, source_construct: ${rs(control.sourceConstruct)}, source_line: ${control.sourceLine} })`;
}
const lines = [
  "// GENERATED by core-rs/tools/gen-battle-script-jumpifstatus-vectors.mjs; do not edit.",
  "// Source: executing canonical src/engine/battleScriptStatusPrimaryOpcode.ts (jumpifstatus)",
  "// and src/engine/battleScriptStatbuffchangeOpcode.ts (jumpifstatus2) via node.",
  "// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifstatus-vectors.mjs.",
  "use crate::battle_script_jumpifstatus::BattleScriptJumpifstatusRules;",
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS_VECTOR_CORPUS_SHA256: &str = ${rs(corpusSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS_VECTOR_GENERATOR_SHA256: &str = ${rs(generatorSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [${branchCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatusVectorExecution { pub program_counter: u32, pub status_expression: &'static str, pub battler_operand_expression: &'static str, pub battler: Option<u8>, pub jump_target_expression: &'static str, pub resolved_jump_program_counter: Option<u32> }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub enum BattleScriptJumpifstatusVectorControl { Advance, Jump { program_counter: u32 }, Block { operand_expression: &'static str }, Halt { program_counter: u32, opcode_id: u8, opcode_name: &'static str, source_construct: &'static str, source_line: u32 } }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatusVectorCase { pub label: &'static str, pub category: &'static str, pub opcode: u8, pub branch: &'static str, pub execution: BattleScriptJumpifstatusVectorExecution, pub initial: BattleScriptJumpifstatusRules, pub expected_control: Option<BattleScriptJumpifstatusVectorControl>, pub expected_error: Option<&'static str> }",
  `pub static BATTLE_SCRIPT_JUMPIFSTATUS_CASES: [BattleScriptJumpifstatusVectorCase; ${cases.length}] = [`,
];
for (const value of cases) {
  lines.push(
    `BattleScriptJumpifstatusVectorCase { label: ${rs(value.label)}, category: ${rs(value.category)}, opcode: ${value.opcode}, branch: ${rs(value.branch)}, execution: BattleScriptJumpifstatusVectorExecution { program_counter: ${value.execution.programCounter}, status_expression: ${rs(value.execution.statusExpression)}, battler_operand_expression: ${rs(value.execution.battlerOperandExpression)}, battler: ${optionU8(value.execution.battler)}, jump_target_expression: ${rs(value.execution.jumpTargetExpression)}, resolved_jump_program_counter: ${optionU32(value.execution.resolvedJumpProgramCounter)} }, initial: ${rulesState(value.initial)}, expected_control: ${controlExpr(value.control)}, expected_error: ${optionString(value.expectedError)} },`,
  );
}
lines.push(
  "];",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatusVectorRegistrationCase { pub label: &'static str, pub opcode: u8, pub registered: bool, pub bound_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }",
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS_REGISTRATION_CASES: [BattleScriptJumpifstatusVectorRegistrationCase; ${registrationCases.length}] = [`,
);
for (const value of registrationCases) {
  lines.push(
    `BattleScriptJumpifstatusVectorRegistrationCase { label: ${rs(value.label)}, opcode: ${value.opcode}, registered: ${value.registered}, bound_opcode_id: ${optionU8(value.boundOpcodeId)}, expected_error: ${optionString(value.error)} },`,
  );
}
lines.push("];", "");
const generated = `${lines.join("\n")}\n`;
fs.writeFileSync(outputPath, generated);
const rustupBin = path.join(process.env.HOME ?? "", ".rustup/toolchains/stable-aarch64-apple-darwin/bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", path.join(workspaceRoot, "core-rs"), outputPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
assert(formatted, "could not find rustfmt");
const generatedBytes = fs.readFileSync(outputPath);
const generatedSha = crypto.createHash("sha256").update(generatedBytes).digest("hex");
process.stdout.write(
  `wrote ${path.relative(workspaceRoot, outputPath)}: ${cases.length} behavior cases, ${registrationCases.length} registration cases, ${generatedBytes.length} bytes, corpus ${corpusSha}, generated ${generatedSha}\n`,
);
