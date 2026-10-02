#!/usr/bin/env node
// Canonical TypeScript differential corpus for Cmd_jumpiftype/Cmd_jumpiftype2/Cmd_cursetarget.
// Run from any cwd with:
// node --experimental-strip-types core-rs/tools/gen-battle-script-type-curse-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const outputPath = path.join(
  workspaceRoot,
  "core-rs/crates/factory-core/src/battle_script_type_curse_vectors_gen.rs",
);
const [programModule, statusPrimaryModule, curseModule, rulesModule, machineModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptStatusPrimaryOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptCurseOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptRulesContext.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptMachine.ts")).href),
]);

const JUMPIFTYPE_NAME = "B_SCR_OP_JUMPIFTYPE";
const JUMPIFTYPE_ID = 0x22;
const JUMPIFTYPE2_NAME = "B_SCR_OP_JUMPIFTYPE2";
const JUMPIFTYPE2_ID = 0x42;
const CURSETARGET_NAME = "B_SCR_OP_CURSETARGET";
const CURSETARGET_ID = 0xaf;

const assert = (condition, message) => {
  if (!condition) throw new Error(`type-curse generator: ${message}`);
};
const frozen = (values) => Object.freeze(values.slice());
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const program = programModule.loadBattleScriptProgram();
const jumpiftypeSites = frozen(program.instructions.filter((instruction) => instruction.opcodeName === JUMPIFTYPE_NAME));
const jumpiftype2Sites = frozen(program.instructions.filter((instruction) => instruction.opcodeName === JUMPIFTYPE2_NAME));
const cursetargetSites = frozen(program.instructions.filter((instruction) => instruction.opcodeName === CURSETARGET_NAME));
assert(jumpiftypeSites.length === 5, `expected 5 jumpiftype sites, got ${jumpiftypeSites.length}`);
assert(jumpiftype2Sites.length === 1, `expected 1 jumpiftype2 site, got ${jumpiftype2Sites.length}`);
assert(cursetargetSites.length === 1, `expected 1 cursetarget site, got ${cursetargetSites.length}`);
assert(
  jumpiftypeSites.every(
    (site) => site.opcodeId === JUMPIFTYPE_ID && site.operands.length === 3
      && site.operands[0].widthBytes === 1 && site.operands[1].widthBytes === 1 && site.operands[2].widthBytes === 4,
  ),
  "jumpiftype operand shape drift",
);
const jumpiftype2Site = jumpiftype2Sites[0];
assert(
  jumpiftype2Site.opcodeId === JUMPIFTYPE2_ID && jumpiftype2Site.operands.length === 3
    && jumpiftype2Site.operands[0].widthBytes === 1 && jumpiftype2Site.operands[1].widthBytes === 1
    && jumpiftype2Site.operands[2].widthBytes === 4,
  "jumpiftype2 operand shape drift",
);
assert(jumpiftype2Site.operands[0].expression === "BS_ATTACKER", "jumpiftype2 site battler drift");
assert(jumpiftype2Site.operands[1].expression === "TYPE_GHOST", "jumpiftype2 site type drift");
const cursetargetSite = cursetargetSites[0];
assert(
  cursetargetSite.opcodeId === CURSETARGET_ID && cursetargetSite.operands.length === 1
    && cursetargetSite.operands[0].widthBytes === 4,
  "cursetarget operand shape drift",
);

const resolveBattler = rulesModule.resolveRulesBattlerForBattleScript;
const statusPrimaryHandlers = statusPrimaryModule.createBattleScriptStatusPrimaryOpcodeHandlers(program, resolveBattler);
const jumpiftypeHandler = statusPrimaryHandlers[JUMPIFTYPE_ID];
assert(typeof jumpiftypeHandler === "function", "canonical jumpiftype handler missing");
const curseHandlers = curseModule.createBattleScriptCurseOpcodeHandlers(program, resolveBattler);
const jumpiftype2Handler = curseHandlers[JUMPIFTYPE2_ID];
const cursetargetHandler = curseHandlers[CURSETARGET_ID];
assert(typeof jumpiftype2Handler === "function", "canonical jumpiftype2 handler missing");
assert(typeof cursetargetHandler === "function", "canonical cursetarget handler missing");

function makeBattler(index, types, status2, maxHp) {
  return Object.freeze({
    side: index % 2,
    ability: 0,
    hp: maxHp,
    maxHP: maxHp,
    moves: frozen([76, 33 + index, 207, 0]),
    pp: frozen([10, 35 - index, 15, 0]),
    status1: 0,
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
    types: frozen(types),
    species: 19 + index,
    attack: 50,
    defense: 51,
    spAttack: 52,
    spDefense: 53,
    level: 50,
    friendship: 70,
  });
}

function canonicalRules({ battlersTypes, battlersStatus2, battlersMaxHp, attacker, target }) {
  const battlers = [0, 1, 2, 3].map((index) => makeBattler(index, battlersTypes[index], battlersStatus2[index], battlersMaxHp[index]));
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
    battlersTypes: frozen(rules.battlers.map((b) => frozen([...b.types]))),
    battlersStatus2: frozen(rules.battlers.map((b) => b.status2)),
    battlersMaxHp: frozen(rules.battlers.map((b) => b.maxHP)),
  });
}

function activeProgram(targetResolves, targetExpression) {
  if (targetResolves) return program;
  const entries = { ...program.labelEntries };
  delete entries[targetExpression];
  return Object.freeze({ ...program, labelEntries: Object.freeze(entries) });
}

function withOperandExpression(site, index, expression) {
  if (site.operands[index].expression === expression) return site;
  const operands = site.operands.map((operand, i) => (i === index ? Object.freeze({ ...operand, expression }) : operand));
  return Object.freeze({ ...site, operands: frozen(operands) });
}

function makeState(selectedProgram, site, rules) {
  return Object.freeze({
    ...machineModule.createBattleScriptMachine(selectedProgram, site.source.label, rules, 0x9c51_0000 >>> 0),
    programCounter: site.programCounter,
  });
}

function jumpControlFromTransition(transition) {
  if (transition.control.kind === "advance") return { kind: "advance" };
  if (transition.control.kind === "jump") return { kind: "jump", programCounter: transition.control.programCounter };
  if (transition.control.kind === "block") {
    assert(transition.control.reason.kind === "source-context-unavailable", "unexpected block reason");
    return { kind: "block", operandExpression: transition.control.reason.operandExpression };
  }
  if (transition.control.kind === "halt") {
    assert(transition.control.reason.kind === "unsupported-branch", "unexpected halt reason");
    return {
      kind: "halt",
      programCounter: transition.control.reason.programCounter,
      opcodeId: transition.control.reason.opcodeId,
      opcodeName: transition.control.reason.opcodeName,
      sourceConstruct: transition.control.reason.sourceConstruct,
      sourceLine: transition.control.reason.sourceLine,
    };
  }
  throw new Error(`unexpected control kind ${transition.control.kind}`);
}

function driveJump({ handler, dispatcher, site, rules, targetResolves, typeExpression }) {
  const before = vectorState(rules);
  const selectedProgram = activeProgram(targetResolves, site.operands[2].expression);
  const instruction = withOperandExpression(site, 1, typeExpression);
  try {
    const state = makeState(selectedProgram, site, rules);
    const transition = handler({ program: selectedProgram, instruction, state });
    assert(transition.rulesContext === rules, "handler replaced rules context");
    assert(transition.events.length === 0, "handler emitted event");
    assert(same(vectorState(rules), before), "handler mutated rules");
    return { control: jumpControlFromTransition(transition), error: null };
  } catch (error) {
    assert(error instanceof Error, `non-Error throw ${String(error)}`);
    assert(same(vectorState(rules), before), "throwing handler mutated rules");
    assert(error.message.startsWith(`${dispatcher}: unresolved jump target`), `unexpected error ${error.message}`);
    return { control: null, error: error.message };
  }
}

const jumpCases = [];
function addJumpCase({
  label,
  category,
  opcode,
  site,
  battlerSelector,
  roleIndex,
  battlersTypes = [
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
  ],
  typeExpression,
  targetResolves = true,
}) {
  assert(/^[a-z0-9_]+$/.test(label), `bad label ${label}`);
  assert(!jumpCases.some((entry) => entry.label === label), `duplicate label ${label}`);
  const resolvedBattlerSelector = battlerSelector ?? site.operands[0].expression;
  const resolvedTypeExpression = typeExpression ?? site.operands[1].expression;
  const attacker = resolvedBattlerSelector === "BS_ATTACKER" ? roleIndex : (roleIndex === null ? 1 : (roleIndex + 1) % 4);
  const target = resolvedBattlerSelector === "BS_TARGET" ? roleIndex : (roleIndex === null ? 1 : (roleIndex + 1) % 4);
  const rules = canonicalRules({
    battlersTypes,
    battlersStatus2: [0, 0, 0, 0],
    battlersMaxHp: [100, 100, 100, 100],
    attacker,
    target,
  });
  const handler = opcode === 1 ? jumpiftypeHandler : jumpiftype2Handler;
  const dispatcher = opcode === 1 ? "Cmd_jumpiftype" : "Cmd_jumpiftype2";
  const outcome = driveJump({ handler, dispatcher, site, rules, targetResolves, typeExpression: resolvedTypeExpression });
  const branch = outcome.error ? "unresolved-label" : outcome.control.kind;
  jumpCases.push(Object.freeze({
    label,
    category,
    opcode,
    branch,
    execution: Object.freeze({
      programCounter: site.programCounter,
      typeExpression: resolvedTypeExpression,
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

// --- jumpiftype behavior cases: every distinct committed (selector, type, label) triple ---
for (const site of jumpiftypeSites) {
  const type = site.operands[1].expression;
  const label = `jumpiftype_${type.toLowerCase()}_pc${site.programCounter}`;
  addJumpCase({
    label: `${label}_hit_slot0`,
    category: "committed-site",
    opcode: 1,
    site,
    roleIndex: 1,
    battlersTypes: [
      ["TYPE_NORMAL", "TYPE_NORMAL"],
      [type, "TYPE_NORMAL"],
      ["TYPE_NORMAL", "TYPE_NORMAL"],
      ["TYPE_NORMAL", "TYPE_NORMAL"],
    ],
  });
  addJumpCase({
    label: `${label}_hit_slot1`,
    category: "committed-site",
    opcode: 1,
    site,
    roleIndex: 1,
    battlersTypes: [
      ["TYPE_NORMAL", "TYPE_NORMAL"],
      ["TYPE_NORMAL", type],
      ["TYPE_NORMAL", "TYPE_NORMAL"],
      ["TYPE_NORMAL", "TYPE_NORMAL"],
    ],
  });
  addJumpCase({
    label: `${label}_miss`,
    category: "committed-site",
    opcode: 1,
    site,
    roleIndex: 1,
    battlersTypes: [
      ["TYPE_NORMAL", "TYPE_NORMAL"],
      ["TYPE_WATER", "TYPE_GRASS"],
      ["TYPE_NORMAL", "TYPE_NORMAL"],
      ["TYPE_NORMAL", "TYPE_NORMAL"],
    ],
  });
}
const fireSite = jumpiftypeSites.find((s) => s.operands[1].expression === "TYPE_FIRE");
addJumpCase({
  label: "jumpiftype_unsupported_type_halt",
  category: "unsupported-type",
  opcode: 1,
  site: fireSite,
  roleIndex: 1,
  typeExpression: "TYPE_BOGUS",
});
addJumpCase({
  label: "jumpiftype_selector_block_unresolved_battler",
  category: "selector-block",
  opcode: 1,
  site: fireSite,
  roleIndex: null,
});
addJumpCase({
  label: "jumpiftype_unsupported_type_precedes_selector_block",
  category: "precedence",
  opcode: 1,
  site: fireSite,
  roleIndex: null,
  typeExpression: "TYPE_BOGUS",
});
addJumpCase({
  label: "jumpiftype_unresolved_target_on_taken_branch",
  category: "unresolved-label",
  opcode: 1,
  site: fireSite,
  roleIndex: 1,
  battlersTypes: [
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_FIRE", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
  ],
  targetResolves: false,
});
addJumpCase({
  label: "jumpiftype_untaken_branch_ignores_unresolvable_target",
  category: "unresolved-label",
  opcode: 1,
  site: fireSite,
  roleIndex: 1,
  targetResolves: false,
});

// --- jumpiftype2 behavior cases: the committed GHOST site ---
addJumpCase({
  label: "jumpiftype2_ghost_hit_slot0",
  category: "committed-site",
  opcode: 2,
  site: jumpiftype2Site,
  roleIndex: 0,
  battlersTypes: [
    ["TYPE_GHOST", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
  ],
});
addJumpCase({
  label: "jumpiftype2_ghost_hit_slot1",
  category: "committed-site",
  opcode: 2,
  site: jumpiftype2Site,
  roleIndex: 0,
  battlersTypes: [
    ["TYPE_NORMAL", "TYPE_GHOST"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
  ],
});
addJumpCase({
  label: "jumpiftype2_ghost_miss",
  category: "committed-site",
  opcode: 2,
  site: jumpiftype2Site,
  roleIndex: 0,
  battlersTypes: [
    ["TYPE_WATER", "TYPE_GRASS"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
  ],
});
addJumpCase({
  label: "jumpiftype2_selector_block_unresolved_battler",
  category: "selector-block",
  opcode: 2,
  site: jumpiftype2Site,
  roleIndex: null,
});
addJumpCase({
  label: "jumpiftype2_custom_out_of_set_expression_compares_false",
  category: "runtime-asymmetry",
  opcode: 2,
  site: jumpiftype2Site,
  roleIndex: 0,
  typeExpression: "TYPE_BOGUS",
});
addJumpCase({
  label: "jumpiftype2_unresolved_target_on_taken_branch",
  category: "unresolved-label",
  opcode: 2,
  site: jumpiftype2Site,
  roleIndex: 0,
  battlersTypes: [
    ["TYPE_GHOST", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
    ["TYPE_NORMAL", "TYPE_NORMAL"],
  ],
  targetResolves: false,
});
addJumpCase({
  label: "jumpiftype2_untaken_branch_ignores_unresolvable_target",
  category: "unresolved-label",
  opcode: 2,
  site: jumpiftype2Site,
  roleIndex: 0,
  targetResolves: false,
});

// --- cursetarget behavior cases ---
const cursetargetCases = [];
function driveCursetarget({ rules, targetResolves, roles }) {
  const before = vectorState(rules);
  const ruleWithRoles = Object.freeze({ ...rules, selectorRoles: { ...rules.selectorRoles, ...roles } });
  const selectedProgram = activeProgram(targetResolves, cursetargetSite.operands[0].expression);
  try {
    const state = makeState(selectedProgram, cursetargetSite, ruleWithRoles);
    const transition = cursetargetHandler({ program: selectedProgram, instruction: cursetargetSite, state });
    assert(transition.events.length === 0, "cursetarget handler emitted event");
    let control;
    if (transition.control.kind === "advance") {
      control = { kind: "advance" };
      assert(transition.rulesContext !== ruleWithRoles, "successful cursetarget must replace rules context");
    } else if (transition.control.kind === "jump") {
      control = { kind: "jump", programCounter: transition.control.programCounter };
      assert(transition.rulesContext === ruleWithRoles, "jump branch must not replace rules context");
    } else {
      throw new Error(`unexpected control kind ${transition.control.kind}`);
    }
    return {
      control,
      error: null,
      battleMoveDamage: transition.rulesContext?.battleMoveDamage ?? null,
      resultingStatus2: transition.rulesContext.battlers[ruleWithRoles.selectorRoles.target].status2,
    };
  } catch (error) {
    assert(error instanceof Error, `non-Error throw ${String(error)}`);
    assert(same(vectorState(ruleWithRoles), before), "throwing handler mutated rules");
    return { control: null, error: error.message, battleMoveDamage: null, resultingStatus2: null };
  }
}

function addCursetargetCase({ label, category, attacker, target, status2s = [0, 0, 0, 0], maxHps = [100, 100, 100, 100], targetResolves = true }) {
  assert(/^[a-z0-9_]+$/.test(label), `bad label ${label}`);
  assert(!cursetargetCases.some((entry) => entry.label === label), `duplicate label ${label}`);
  const rules = canonicalRules({
    battlersTypes: [
      ["TYPE_NORMAL", "TYPE_NORMAL"],
      ["TYPE_NORMAL", "TYPE_NORMAL"],
      ["TYPE_NORMAL", "TYPE_NORMAL"],
      ["TYPE_NORMAL", "TYPE_NORMAL"],
    ],
    battlersStatus2: status2s,
    battlersMaxHp: maxHps,
    attacker,
    target,
  });
  const outcome = driveCursetarget({ rules, targetResolves, roles: { attacker, target } });
  const branch = outcome.error ? (outcome.error.startsWith("Cmd_cursetarget requires a") ? "missing-role" : "unresolved-label") : outcome.control.kind;
  cursetargetCases.push(Object.freeze({
    label,
    category,
    branch,
    execution: Object.freeze({
      failTargetExpression: cursetargetSite.operands[0].expression,
      resolvedFailProgramCounter: targetResolves
        ? programModule.resolveBattleScriptLabel(program, cursetargetSite.operands[0].expression)?.programCounter ?? null
        : null,
    }),
    initial: vectorState(rules),
    attacker,
    target,
    control: outcome.control,
    expectedError: outcome.error,
    battleMoveDamage: outcome.battleMoveDamage,
    resultingStatus2: outcome.resultingStatus2,
  }));
}

addCursetargetCase({ label: "cursetarget_fresh_curse_even_maxhp", category: "fresh-curse", attacker: 0, target: 1, maxHps: [100, 100, 100, 100] });
addCursetargetCase({ label: "cursetarget_fresh_curse_odd_maxhp_floor", category: "fresh-curse", attacker: 0, target: 1, maxHps: [101, 100, 100, 100] });
addCursetargetCase({ label: "cursetarget_fresh_curse_maxhp_one_clamp", category: "fresh-curse", attacker: 0, target: 1, maxHps: [1, 100, 100, 100] });
addCursetargetCase({ label: "cursetarget_fresh_curse_maxhp_three", category: "fresh-curse", attacker: 0, target: 1, maxHps: [3, 100, 100, 100] });
addCursetargetCase({
  label: "cursetarget_already_cursed_fail_jump",
  category: "already-cursed",
  attacker: 0,
  target: 1,
  status2s: [0, 0x1000_0000, 0, 0],
});
addCursetargetCase({
  label: "cursetarget_already_cursed_unresolved_fail_label",
  category: "unresolved-label",
  attacker: 0,
  target: 1,
  status2s: [0, 0x1000_0000, 0, 0],
  targetResolves: false,
});
addCursetargetCase({ label: "cursetarget_missing_attacker_role", category: "missing-role", attacker: null, target: 1 });
addCursetargetCase({ label: "cursetarget_missing_target_role", category: "missing-role", attacker: 0, target: null });

// --- registration cases ---
const registrationCases = [];
{
  // jumpiftype: find-first REQUIRED, real committed program vs. filtered-out program.
  assert(statusPrimaryHandlers[JUMPIFTYPE_ID] !== undefined, "expected jumpiftype registered in real program");
  registrationCases.push(Object.freeze({
    label: "jumpiftype_present_in_real_program",
    opcode: "jumpiftype",
    registered: true,
    boundOpcodeId: jumpiftypeSites[0].opcodeId,
    error: null,
  }));
  try {
    statusPrimaryModule.createBattleScriptStatusPrimaryOpcodeHandlers(
      Object.freeze({ ...program, instructions: frozen(program.instructions.filter((i) => i.opcodeName !== JUMPIFTYPE_NAME)) }),
      resolveBattler,
    );
    throw new Error("expected missing-jumpiftype registration to throw");
  } catch (error) {
    assert(
      error.message === "committed Battle Script program does not emit B_SCR_OP_JUMPIFTYPE",
      `unexpected missing-registration error ${error.message}`,
    );
    registrationCases.push(Object.freeze({
      label: "jumpiftype_absent_required_error",
      opcode: "jumpiftype",
      registered: false,
      boundOpcodeId: null,
      error: error.message,
    }));
  }
}

function tryCurseRegistration(customProgram) {
  try {
    const handlers = curseModule.createBattleScriptCurseOpcodeHandlers(customProgram, resolveBattler);
    return { handlers, error: null };
  } catch (error) {
    assert(error instanceof Error, `non-Error throw ${String(error)}`);
    return { handlers: null, error: error.message };
  }
}

function programWithout(opcodeName) {
  return Object.freeze({ ...program, instructions: frozen(program.instructions.filter((i) => i.opcodeName !== opcodeName)) });
}
function programWithDuplicate(site) {
  return Object.freeze({ ...program, instructions: frozen([...program.instructions, site]) });
}
function programWithMutatedSite(site, mutate) {
  const mutated = mutate(site);
  return Object.freeze({
    ...program,
    instructions: frozen(program.instructions.map((i) => (i === site ? mutated : i))),
  });
}

{
  // jumpiftype2 success + every error leg.
  const success = tryCurseRegistration(program);
  assert(success.handlers[JUMPIFTYPE2_ID] !== undefined, "expected jumpiftype2 registered in real program");
  registrationCases.push(Object.freeze({ label: "jumpiftype2_present_success", opcode: "jumpiftype2", registered: true, boundOpcodeId: jumpiftype2Site.opcodeId, error: null }));

  const zero = tryCurseRegistration(programWithout(JUMPIFTYPE2_NAME));
  assert(zero.error === "B_SCR_OP_JUMPIFTYPE2 requires exactly 1 concrete start, got 0", `unexpected: ${zero.error}`);
  registrationCases.push(Object.freeze({ label: "jumpiftype2_wrong_count_zero", opcode: "jumpiftype2", registered: false, boundOpcodeId: null, error: zero.error }));

  const two = tryCurseRegistration(programWithDuplicate(jumpiftype2Site));
  assert(two.error === "B_SCR_OP_JUMPIFTYPE2 requires exactly 1 concrete start, got 2", `unexpected: ${two.error}`);
  registrationCases.push(Object.freeze({ label: "jumpiftype2_wrong_count_two", opcode: "jumpiftype2", registered: false, boundOpcodeId: null, error: two.error }));

  const wrongDispatcher = tryCurseRegistration(programWithMutatedSite(jumpiftype2Site, (s) => ({ ...s, dispatcher: "Cmd_bogus" })));
  assert(wrongDispatcher.error === `invalid B_SCR_OP_JUMPIFTYPE2 shape at program counter ${jumpiftype2Site.programCounter}`, `unexpected: ${wrongDispatcher.error}`);
  registrationCases.push(Object.freeze({ label: "jumpiftype2_wrong_dispatcher", opcode: "jumpiftype2", registered: false, boundOpcodeId: null, error: wrongDispatcher.error }));

  const wrongOperandCount = tryCurseRegistration(programWithMutatedSite(jumpiftype2Site, (s) => ({ ...s, operands: frozen(s.operands.slice(0, 2)) })));
  assert(wrongOperandCount.error === `invalid B_SCR_OP_JUMPIFTYPE2 shape at program counter ${jumpiftype2Site.programCounter}`, `unexpected: ${wrongOperandCount.error}`);
  registrationCases.push(Object.freeze({ label: "jumpiftype2_wrong_operand_count", opcode: "jumpiftype2", registered: false, boundOpcodeId: null, error: wrongOperandCount.error }));

  const wrongWidth = tryCurseRegistration(programWithMutatedSite(jumpiftype2Site, (s) => ({
    ...s,
    operands: frozen([s.operands[0], Object.freeze({ ...s.operands[1], widthBytes: 2 }), s.operands[2]]),
  })));
  assert(wrongWidth.error === `invalid B_SCR_OP_JUMPIFTYPE2 shape at program counter ${jumpiftype2Site.programCounter}`, `unexpected: ${wrongWidth.error}`);
  registrationCases.push(Object.freeze({ label: "jumpiftype2_wrong_width", opcode: "jumpiftype2", registered: false, boundOpcodeId: null, error: wrongWidth.error }));

  const outOfSetType = tryCurseRegistration(programWithMutatedSite(jumpiftype2Site, (s) => ({
    ...s,
    operands: frozen([s.operands[0], Object.freeze({ ...s.operands[1], expression: "TYPE_BOGUS" }), s.operands[2]]),
  })));
  assert(outOfSetType.error === `invalid B_SCR_OP_JUMPIFTYPE2 shape at program counter ${jumpiftype2Site.programCounter}`, `unexpected: ${outOfSetType.error}`);
  registrationCases.push(Object.freeze({ label: "jumpiftype2_out_of_set_type", opcode: "jumpiftype2", registered: false, boundOpcodeId: null, error: outOfSetType.error }));

  const entriesWithoutLabel = { ...program.labelEntries };
  delete entriesWithoutLabel[jumpiftype2Site.operands[2].expression];
  const unresolvableLabel = tryCurseRegistration(Object.freeze({ ...program, labelEntries: Object.freeze(entriesWithoutLabel) }));
  assert(unresolvableLabel.error === `invalid B_SCR_OP_JUMPIFTYPE2 shape at program counter ${jumpiftype2Site.programCounter}`, `unexpected: ${unresolvableLabel.error}`);
  registrationCases.push(Object.freeze({ label: "jumpiftype2_unresolvable_label_at_registration", opcode: "jumpiftype2", registered: false, boundOpcodeId: null, error: unresolvableLabel.error }));
}

{
  // cursetarget success + every error leg.
  const success = tryCurseRegistration(program);
  assert(success.handlers[CURSETARGET_ID] !== undefined, "expected cursetarget registered in real program");
  registrationCases.push(Object.freeze({ label: "cursetarget_present_success", opcode: "cursetarget", registered: true, boundOpcodeId: cursetargetSite.opcodeId, error: null }));

  const zero = tryCurseRegistration(programWithout(CURSETARGET_NAME));
  assert(zero.error === "B_SCR_OP_CURSETARGET requires exactly 1 concrete start, got 0", `unexpected: ${zero.error}`);
  registrationCases.push(Object.freeze({ label: "cursetarget_wrong_count_zero", opcode: "cursetarget", registered: false, boundOpcodeId: null, error: zero.error }));

  const two = tryCurseRegistration(programWithDuplicate(cursetargetSite));
  assert(two.error === "B_SCR_OP_CURSETARGET requires exactly 1 concrete start, got 2", `unexpected: ${two.error}`);
  registrationCases.push(Object.freeze({ label: "cursetarget_wrong_count_two", opcode: "cursetarget", registered: false, boundOpcodeId: null, error: two.error }));

  const wrongDispatcher = tryCurseRegistration(programWithMutatedSite(cursetargetSite, (s) => ({ ...s, dispatcher: "Cmd_bogus" })));
  assert(wrongDispatcher.error === `invalid B_SCR_OP_CURSETARGET shape at program counter ${cursetargetSite.programCounter}`, `unexpected: ${wrongDispatcher.error}`);
  registrationCases.push(Object.freeze({ label: "cursetarget_wrong_dispatcher", opcode: "cursetarget", registered: false, boundOpcodeId: null, error: wrongDispatcher.error }));

  const wrongOperandCount = tryCurseRegistration(programWithMutatedSite(cursetargetSite, (s) => ({ ...s, operands: frozen([...s.operands, s.operands[0]]) })));
  assert(wrongOperandCount.error === `invalid B_SCR_OP_CURSETARGET shape at program counter ${cursetargetSite.programCounter}`, `unexpected: ${wrongOperandCount.error}`);
  registrationCases.push(Object.freeze({ label: "cursetarget_wrong_operand_count", opcode: "cursetarget", registered: false, boundOpcodeId: null, error: wrongOperandCount.error }));

  const wrongWidth = tryCurseRegistration(programWithMutatedSite(cursetargetSite, (s) => ({
    ...s,
    operands: frozen([Object.freeze({ ...s.operands[0], widthBytes: 2 })]),
  })));
  assert(wrongWidth.error === `invalid B_SCR_OP_CURSETARGET shape at program counter ${cursetargetSite.programCounter}`, `unexpected: ${wrongWidth.error}`);
  registrationCases.push(Object.freeze({ label: "cursetarget_wrong_width", opcode: "cursetarget", registered: false, boundOpcodeId: null, error: wrongWidth.error }));

  const entriesWithoutLabel = { ...program.labelEntries };
  delete entriesWithoutLabel[cursetargetSite.operands[0].expression];
  const unresolvableLabel = tryCurseRegistration(Object.freeze({ ...program, labelEntries: Object.freeze(entriesWithoutLabel) }));
  assert(unresolvableLabel.error === `invalid B_SCR_OP_CURSETARGET shape at program counter ${cursetargetSite.programCounter}`, `unexpected: ${unresolvableLabel.error}`);
  registrationCases.push(Object.freeze({ label: "cursetarget_unresolvable_label_at_registration", opcode: "cursetarget", registered: false, boundOpcodeId: null, error: unresolvableLabel.error }));
}

function census(values, key) {
  const result = new Map();
  for (const value of values) result.set(value[key], (result.get(value[key]) ?? 0) + 1);
  return frozen(Array.from(result.entries()));
}
const jumpCategoryCensus = census(jumpCases, "category");
const jumpBranchCensus = census(jumpCases, "branch");
const cursetargetCategoryCensus = census(cursetargetCases, "category");
const corpus = Object.freeze({
  jumpCategoryCensus,
  jumpBranchCensus,
  cursetargetCategoryCensus,
  jumpCases,
  cursetargetCases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha = crypto.createHash("sha256").update(corpusText).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorSha = crypto.createHash("sha256").update(generatorBytes).digest("hex");
const rs = JSON.stringify;
const optionU8 = (value) => (value === null || value === undefined ? "None" : `Some(${value})`);
const optionU16 = (value) => (value === null || value === undefined ? "None" : `Some(${value})`);
const optionU32 = (value) => (value === null || value === undefined ? "None" : `Some(${value})`);
const optionString = (value) => (value === null || value === undefined ? "None" : `Some(${rs(value)})`);

function battlerEnumOption(index) {
  return index === null || index === undefined ? "None" : `Some(BattleScriptTypeCurseBattler::Battler${index})`;
}
function rulesState(value, attacker = null, target = null) {
  return `BattleScriptTypeCurseRules { battlers: [${value.battlersTypes.map((pair, i) => `BattleScriptTypeCurseBattlerState { types: [${rs(pair[0])}, ${rs(pair[1])}], status2: ${value.battlersStatus2[i]}, max_hp: ${value.battlersMaxHp[i]} }`).join(", ")}], selector_roles: BattleScriptTypeCurseRoles { attacker: ${battlerEnumOption(attacker)}, target: ${battlerEnumOption(target)} } }`;
}
function jumpControlExpr(control) {
  if (control === null) return "None";
  if (control.kind === "advance") return "Some(BattleScriptTypeCurseVectorJumpControl::Advance)";
  if (control.kind === "jump") return `Some(BattleScriptTypeCurseVectorJumpControl::Jump { program_counter: ${control.programCounter} })`;
  if (control.kind === "block") return `Some(BattleScriptTypeCurseVectorJumpControl::Block { operand_expression: ${rs(control.operandExpression)} })`;
  return `Some(BattleScriptTypeCurseVectorJumpControl::Halt { program_counter: ${control.programCounter}, opcode_id: ${control.opcodeId}, opcode_name: ${rs(control.opcodeName)}, source_construct: ${rs(control.sourceConstruct)}, source_line: ${control.sourceLine} })`;
}
function cursetargetControlExpr(control) {
  if (control === null) return "None";
  if (control.kind === "advance") return "Some(BattleScriptTypeCurseVectorCursetargetControl::Advance)";
  return `Some(BattleScriptTypeCurseVectorCursetargetControl::Jump { program_counter: ${control.programCounter} })`;
}

const lines = [
  "// GENERATED by core-rs/tools/gen-battle-script-type-curse-vectors.mjs; do not edit.",
  "// Source: executing canonical src/engine/battleScriptStatusPrimaryOpcode.ts (jumpiftype)",
  "// and src/engine/battleScriptCurseOpcode.ts (jumpiftype2/cursetarget) via node.",
  "// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-type-curse-vectors.mjs.",
  "use crate::battle_script_type_curse::{BattleScriptTypeCurseBattler, BattleScriptTypeCurseBattlerState, BattleScriptTypeCurseRoles, BattleScriptTypeCurseRules};",
  `pub const BATTLE_SCRIPT_TYPE_CURSE_VECTOR_CORPUS_SHA256: &str = ${rs(corpusSha)};`,
  `pub const BATTLE_SCRIPT_TYPE_CURSE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`,
  `pub const BATTLE_SCRIPT_TYPE_CURSE_VECTOR_GENERATOR_SHA256: &str = ${rs(generatorSha)};`,
  `pub const BATTLE_SCRIPT_TYPE_CURSE_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`,
  `pub const BATTLE_SCRIPT_TYPE_CURSE_JUMP_CATEGORY_CENSUS: [(&str, usize); ${jumpCategoryCensus.length}] = [${jumpCategoryCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_TYPE_CURSE_JUMP_BRANCH_CENSUS: [(&str, usize); ${jumpBranchCensus.length}] = [${jumpBranchCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_TYPE_CURSE_CURSETARGET_CATEGORY_CENSUS: [(&str, usize); ${cursetargetCategoryCensus.length}] = [${cursetargetCategoryCensus.map(([n, c]) => `(${rs(n)}, ${c})`).join(", ")}];`,
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptTypeCurseVectorJumpExecution { pub program_counter: u32, pub type_expression: &'static str, pub battler_operand_expression: &'static str, pub battler: Option<u8>, pub jump_target_expression: &'static str, pub resolved_jump_program_counter: Option<u32> }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub enum BattleScriptTypeCurseVectorJumpControl { Advance, Jump { program_counter: u32 }, Block { operand_expression: &'static str }, Halt { program_counter: u32, opcode_id: u8, opcode_name: &'static str, source_construct: &'static str, source_line: u32 } }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptTypeCurseVectorJumpCase { pub label: &'static str, pub category: &'static str, pub opcode: u8, pub branch: &'static str, pub execution: BattleScriptTypeCurseVectorJumpExecution, pub initial: BattleScriptTypeCurseRules<'static>, pub expected_control: Option<BattleScriptTypeCurseVectorJumpControl>, pub expected_error: Option<&'static str> }",
  `pub static BATTLE_SCRIPT_TYPE_CURSE_JUMP_CASES: [BattleScriptTypeCurseVectorJumpCase; ${jumpCases.length}] = [`,
];
for (const value of jumpCases) {
  lines.push(
    `BattleScriptTypeCurseVectorJumpCase { label: ${rs(value.label)}, category: ${rs(value.category)}, opcode: ${value.opcode}, branch: ${rs(value.branch)}, execution: BattleScriptTypeCurseVectorJumpExecution { program_counter: ${value.execution.programCounter}, type_expression: ${rs(value.execution.typeExpression)}, battler_operand_expression: ${rs(value.execution.battlerOperandExpression)}, battler: ${optionU8(value.execution.battler)}, jump_target_expression: ${rs(value.execution.jumpTargetExpression)}, resolved_jump_program_counter: ${optionU32(value.execution.resolvedJumpProgramCounter)} }, initial: ${rulesState(value.initial)}, expected_control: ${jumpControlExpr(value.control)}, expected_error: ${optionString(value.expectedError)} },`,
  );
}
lines.push(
  "];",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptTypeCurseVectorCursetargetExecution { pub fail_target_expression: &'static str, pub resolved_fail_program_counter: Option<u32> }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub enum BattleScriptTypeCurseVectorCursetargetControl { Advance, Jump { program_counter: u32 } }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptTypeCurseVectorCursetargetCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub execution: BattleScriptTypeCurseVectorCursetargetExecution, pub initial: BattleScriptTypeCurseRules<'static>, pub attacker: Option<u8>, pub target: Option<u8>, pub expected_control: Option<BattleScriptTypeCurseVectorCursetargetControl>, pub expected_error: Option<&'static str>, pub expected_battle_move_damage: Option<u16>, pub expected_resulting_status2: Option<u32> }",
  `pub static BATTLE_SCRIPT_TYPE_CURSE_CURSETARGET_CASES: [BattleScriptTypeCurseVectorCursetargetCase; ${cursetargetCases.length}] = [`,
);
for (const value of cursetargetCases) {
  lines.push(
    `BattleScriptTypeCurseVectorCursetargetCase { label: ${rs(value.label)}, category: ${rs(value.category)}, branch: ${rs(value.branch)}, execution: BattleScriptTypeCurseVectorCursetargetExecution { fail_target_expression: ${rs(value.execution.failTargetExpression)}, resolved_fail_program_counter: ${optionU32(value.execution.resolvedFailProgramCounter)} }, initial: ${rulesState(value.initial, value.attacker, value.target)}, attacker: ${optionU8(value.attacker)}, target: ${optionU8(value.target)}, expected_control: ${cursetargetControlExpr(value.control)}, expected_error: ${optionString(value.expectedError)}, expected_battle_move_damage: ${optionU16(value.battleMoveDamage)}, expected_resulting_status2: ${optionU32(value.resultingStatus2)} },`,
  );
}
lines.push(
  "];",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptTypeCurseVectorRegistrationCase { pub label: &'static str, pub opcode: &'static str, pub registered: bool, pub bound_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }",
  `pub const BATTLE_SCRIPT_TYPE_CURSE_REGISTRATION_CASES: [BattleScriptTypeCurseVectorRegistrationCase; ${registrationCases.length}] = [`,
);
for (const value of registrationCases) {
  lines.push(
    `BattleScriptTypeCurseVectorRegistrationCase { label: ${rs(value.label)}, opcode: ${rs(value.opcode)}, registered: ${value.registered}, bound_opcode_id: ${optionU8(value.boundOpcodeId)}, expected_error: ${optionString(value.error)} },`,
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
  `wrote ${path.relative(workspaceRoot, outputPath)}: ${jumpCases.length} jump cases, ${cursetargetCases.length} cursetarget cases, ${registrationCases.length} registration cases, ${generatedBytes.length} bytes, corpus ${corpusSha}, generated ${generatedSha}\n`,
);
