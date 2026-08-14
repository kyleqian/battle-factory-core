#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptDoubleDamageIfDamagedOpcode.ts.
// Expected controls, outputs, and errors are created only by executing the
// canonical TypeScript opcode handler; this script owns bounded input
// construction and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-doubledamageifdamaged-vectors.mjs

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
  "battle_script_doubledamageifdamaged_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptDoubleDamageIfDamagedOpcode.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED";
const OPCODE_ID = 0xd6;
const DISPATCHER = "Cmd_doubledamagedealtifdamaged";
const ENTRY_LABEL = "BattleScript_EffectRevenge";
const BATTLE_SLOTS = 4;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const I32_MIN = -2_147_483_648;
const I32_MAX = 2_147_483_647;
const DAMAGE_EDGE_VALUES = Object.freeze([I32_MIN, -1, 0, 1, I32_MAX]);
const NONZERO_DAMAGE_EDGE_VALUES = Object.freeze([I32_MIN, -1, 1, I32_MAX]);
const RECEIPT_STATE_DOMAIN = Object.freeze(["zero", "match", "mismatch"]);
const MULTIPLIER_EDGE_VALUES = Object.freeze([0, 1, 2, 255]);
const QUALIFYING_MULTIPLIER = 2;

function assert(condition, message) {
  if (!condition) {
    throw new Error("gen-battle-script-doubledamageifdamaged-vectors: " + message);
  }
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), label + " must be one of 0..3, got " + value);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertI32(value, label) {
  assert(
    Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX,
    label + " must be an i32, got " + value,
  );
}

function assertU8(value, label) {
  assert(
    Number.isInteger(value) && value >= 0 && value <= 0xff,
    label + " must be a u8, got " + value,
  );
}

function freezeReceipt(receipt, label) {
  assertI32(receipt.protectPhysicalDmg, label + ".protectPhysicalDmg");
  assertBattler(receipt.protectPhysicalBattlerId, label + ".protectPhysicalBattlerId");
  assertI32(receipt.protectSpecialDmg, label + ".protectSpecialDmg");
  assertBattler(receipt.protectSpecialBattlerId, label + ".protectSpecialBattlerId");
  return Object.freeze({
    protectPhysicalDmg: receipt.protectPhysicalDmg,
    protectPhysicalBattlerId: receipt.protectPhysicalBattlerId,
    protectSpecialDmg: receipt.protectSpecialDmg,
    protectSpecialBattlerId: receipt.protectSpecialBattlerId,
  });
}

function freezeRules(receipts, attacker, target, dmgMultiplier) {
  assert(Array.isArray(receipts) && receipts.length === BATTLE_SLOTS, "receipts must have four cells");
  receipts.forEach((receipt, index) => freezeReceipt(receipt, "receipts[" + index + "]"));
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  assertU8(dmgMultiplier, "dmgMultiplier");
  return Object.freeze({
    battlers: Object.freeze(receipts.map((receipt, index) => freezeReceipt(receipt, "receipts[" + index + "]"))),
    dmgMultiplier,
    selectorRoles: Object.freeze({ attacker, target }),
  });
}

function mismatchedOwner(target, salt) {
  return (target + 1 + (salt % (BATTLE_SLOTS - 1))) % BATTLE_SLOTS;
}

function backgroundReceipt(battler, salt) {
  return {
    protectPhysicalDmg: NONZERO_DAMAGE_EDGE_VALUES[(battler + salt) % NONZERO_DAMAGE_EDGE_VALUES.length],
    protectPhysicalBattlerId: BATTLER_DOMAIN[(battler + salt * 3) % BATTLE_SLOTS],
    protectSpecialDmg: NONZERO_DAMAGE_EDGE_VALUES[(battler + salt * 5 + 1) % NONZERO_DAMAGE_EDGE_VALUES.length],
    protectSpecialBattlerId: BATTLER_DOMAIN[(battler + salt * 7 + 2) % BATTLE_SLOTS],
  };
}

function makeInitialRules({
  attacker,
  target,
  focusBattler,
  focusPhysicalDmg,
  focusPhysicalBattlerId,
  focusSpecialDmg,
  focusSpecialBattlerId,
  dmgMultiplier,
  salt,
}) {
  assertOptionalBattler(attacker, "initial attacker");
  assertOptionalBattler(target, "initial target");
  assertBattler(focusBattler, "focus battler");
  assertI32(focusPhysicalDmg, "focus physical damage");
  assertBattler(focusPhysicalBattlerId, "focus physical owner");
  assertI32(focusSpecialDmg, "focus special damage");
  assertBattler(focusSpecialBattlerId, "focus special owner");
  assertU8(dmgMultiplier, "initial multiplier");
  const receipts = BATTLER_DOMAIN.map((battler) => backgroundReceipt(battler, salt));
  receipts[focusBattler] = {
    protectPhysicalDmg: focusPhysicalDmg,
    protectPhysicalBattlerId: focusPhysicalBattlerId,
    protectSpecialDmg: focusSpecialDmg,
    protectSpecialBattlerId: focusSpecialBattlerId,
  };
  return freezeRules(receipts, attacker, target, dmgMultiplier);
}

function componentForState(state, target, salt, fieldOffset) {
  assert(RECEIPT_STATE_DOMAIN.includes(state), "unknown receipt state " + state);
  if (state === "zero") {
    return Object.freeze({
      damage: 0,
      owner: BATTLER_DOMAIN[(target + salt + fieldOffset) % BATTLE_SLOTS],
    });
  }
  const damage = NONZERO_DAMAGE_EDGE_VALUES[
    (salt + fieldOffset) % NONZERO_DAMAGE_EDGE_VALUES.length
  ];
  return Object.freeze({
    damage,
    owner: state === "match" ? target : mismatchedOwner(target, salt + fieldOffset),
  });
}

function receiptState(damage, owner, target) {
  if (damage === 0) return "zero";
  return owner === target ? "match" : "mismatch";
}

function vectorReceipt(receipt) {
  return Object.freeze({
    protectPhysicalDmg: receipt.protectPhysicalDmg,
    protectPhysicalBattlerId: receipt.protectPhysicalBattlerId,
    protectSpecialDmg: receipt.protectSpecialDmg,
    protectSpecialBattlerId: receipt.protectSpecialBattlerId,
  });
}

function vectorState(rules) {
  return Object.freeze({
    receipts: Object.freeze(rules.battlers.map(vectorReceipt)),
    dmgMultiplier: rules.dmgMultiplier,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
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
assert(QUALIFYING_MULTIPLIER === 2, "qualifying multiplier drifted to " + QUALIFYING_MULTIPLIER);

const handlers = opcodeModule.createBattleScriptDoubleDamageIfDamagedOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical DOUBLEDAMAGEDEALTIFDAMAGED handler was not registered");

function qualifies(rules) {
  const attacker = rules.selectorRoles.attacker;
  const target = rules.selectorRoles.target;
  assert(attacker !== null, "qualifies was called without an attacker");
  assert(target !== null, "qualifies was called without a target");
  const receipt = rules.battlers[attacker];
  return (
    (receipt.protectPhysicalDmg !== 0 && receipt.protectPhysicalBattlerId === target)
    || (receipt.protectSpecialDmg !== 0 && receipt.protectSpecialBattlerId === target)
  );
}

function sourceOutcome(initialRules, applications) {
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
        (0x5e7d_1b0d + application) >>> 0,
      );
      const transition = handler({ program, instruction, state });
      assert(transition.control.kind === "advance", "canonical handler did not advance");
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");

      const didQualify = qualifies(currentRules);
      const nextRules = transition.rulesContext;
      assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");
      assert(
        nextRules.selectorRoles === currentRules.selectorRoles,
        "canonical handler replaced selector roles",
      );
      assert(nextRules.battlers === currentRules.battlers, "canonical handler replaced receipt array");
      for (const battler of BATTLER_DOMAIN) {
        assert(
          nextRules.battlers[battler] === currentRules.battlers[battler],
          "canonical handler replaced receipt " + battler,
        );
      }
      if (didQualify) {
        assert(nextRules !== currentRules, "qualifying canonical handler reused rules identity");
        assert(
          nextRules.dmgMultiplier === QUALIFYING_MULTIPLIER,
          "qualifying canonical handler did not overwrite dmgMultiplier",
        );
        branches.push("qualifies-overwrite");
      } else {
        assert(nextRules === currentRules, "no-match canonical handler changed rules identity");
        assert(
          nextRules.dmgMultiplier === currentRules.dmgMultiplier,
          "no-match canonical handler changed dmgMultiplier",
        );
        branches.push("no-match-preserve");
      }
      controls.push("advance");
      currentRules = nextRules;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      branches: Object.freeze(branches),
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
      branches: Object.freeze(branches),
      error: error.message,
    });
  }
}

function branchFor(initialRules, outcome) {
  if (outcome.error !== null) {
    return initialRules.selectorRoles.attacker === null
      ? "missing-attacker-role"
      : "missing-target-role";
  }
  return outcome.branches.join("-then-") + "-advance";
}

const cases = [];
function addCase(label, category, initialRules, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid label " + label);
  assert(!cases.some((value) => value.label === label), "duplicate label " + label);
  assert(applications === 1 || applications === 2, label + ": applications must be 1 or 2");
  const outcome = sourceOutcome(initialRules, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(initialRules, outcome),
    applications,
    initial: vectorState(initialRules),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

for (const attacker of BATTLER_DOMAIN) {
  for (const target of BATTLER_DOMAIN) {
    for (const physicalState of RECEIPT_STATE_DOMAIN) {
      for (const specialState of RECEIPT_STATE_DOMAIN) {
        const salt = attacker * 97
          + target * 29
          + RECEIPT_STATE_DOMAIN.indexOf(physicalState) * 7
          + RECEIPT_STATE_DOMAIN.indexOf(specialState);
        const physical = componentForState(physicalState, target, salt, 0);
        const special = componentForState(specialState, target, salt, 1);
        addCase(
          "matrix_a" + attacker + "_t" + target + "_p" + physicalState + "_s" + specialState,
          "attacker-target-receipt-state-matrix",
          makeInitialRules({
            attacker,
            target,
            focusBattler: attacker,
            focusPhysicalDmg: physical.damage,
            focusPhysicalBattlerId: physical.owner,
            focusSpecialDmg: special.damage,
            focusSpecialBattlerId: special.owner,
            dmgMultiplier: MULTIPLIER_EDGE_VALUES[salt % MULTIPLIER_EDGE_VALUES.length],
            salt,
          }),
        );
      }
    }
  }
}

for (const attacker of BATTLER_DOMAIN) {
  for (const target of BATTLER_DOMAIN) {
    for (const field of ["physical", "special"]) {
      for (const [edgeIndex, damage] of DAMAGE_EDGE_VALUES.entries()) {
        const salt = 10_000
          + attacker * 101
          + target * 23
          + (field === "physical" ? 0 : 11)
          + edgeIndex;
        const physical = field === "physical"
          ? Object.freeze({ damage, owner: target })
          : Object.freeze({ damage: 0, owner: mismatchedOwner(target, salt) });
        const special = field === "special"
          ? Object.freeze({ damage, owner: target })
          : Object.freeze({ damage: 0, owner: mismatchedOwner(target, salt + 1) });
        addCase(
          "signed_edge_a" + attacker + "_t" + target + "_" + field + "_" + edgeIndex,
          "signed-i32-edge-matrix",
          makeInitialRules({
            attacker,
            target,
            focusBattler: attacker,
            focusPhysicalDmg: physical.damage,
            focusPhysicalBattlerId: physical.owner,
            focusSpecialDmg: special.damage,
            focusSpecialBattlerId: special.owner,
            dmgMultiplier: MULTIPLIER_EDGE_VALUES[salt % MULTIPLIER_EDGE_VALUES.length],
            salt,
          }),
        );
      }
    }
  }
}

for (const attacker of BATTLER_DOMAIN) {
  const target = (attacker + 2) % BATTLE_SLOTS;
  for (const physicalOwner of BATTLER_DOMAIN) {
    for (const specialOwner of BATTLER_DOMAIN) {
      const salt = 20_000 + attacker * 101 + physicalOwner * 17 + specialOwner;
      addCase(
        "owner_pair_a" + attacker + "_po" + physicalOwner + "_so" + specialOwner,
        "all-owner-pairs-live-receipts",
        makeInitialRules({
          attacker,
          target,
          focusBattler: attacker,
          focusPhysicalDmg: NONZERO_DAMAGE_EDGE_VALUES[
            (physicalOwner + salt) % NONZERO_DAMAGE_EDGE_VALUES.length
          ],
          focusPhysicalBattlerId: physicalOwner,
          focusSpecialDmg: NONZERO_DAMAGE_EDGE_VALUES[
            (specialOwner + salt + 1) % NONZERO_DAMAGE_EDGE_VALUES.length
          ],
          focusSpecialBattlerId: specialOwner,
          dmgMultiplier: MULTIPLIER_EDGE_VALUES[salt % MULTIPLIER_EDGE_VALUES.length],
          salt,
        }),
      );
    }
  }
}

for (const [edgeIndex, dmgMultiplier] of MULTIPLIER_EDGE_VALUES.entries()) {
  const qualifySalt = 30_000 + edgeIndex;
  addCase(
    "multiplier_edge_" + edgeIndex + "_qualifying_overwrite",
    "incoming-multiplier-overwrite-preserve",
    makeInitialRules({
      attacker: edgeIndex,
      target: (edgeIndex + 1) % BATTLE_SLOTS,
      focusBattler: edgeIndex,
      focusPhysicalDmg: NONZERO_DAMAGE_EDGE_VALUES[edgeIndex],
      focusPhysicalBattlerId: (edgeIndex + 1) % BATTLE_SLOTS,
      focusSpecialDmg: 0,
      focusSpecialBattlerId: mismatchedOwner((edgeIndex + 1) % BATTLE_SLOTS, qualifySalt),
      dmgMultiplier,
      salt: qualifySalt,
    }),
  );
  const preserveSalt = 31_000 + edgeIndex;
  const preserveTarget = (edgeIndex + 2) % BATTLE_SLOTS;
  addCase(
    "multiplier_edge_" + edgeIndex + "_no_match_preserve",
    "incoming-multiplier-overwrite-preserve",
    makeInitialRules({
      attacker: edgeIndex,
      target: preserveTarget,
      focusBattler: edgeIndex,
      focusPhysicalDmg: NONZERO_DAMAGE_EDGE_VALUES[edgeIndex],
      focusPhysicalBattlerId: mismatchedOwner(preserveTarget, preserveSalt),
      focusSpecialDmg: NONZERO_DAMAGE_EDGE_VALUES[(edgeIndex + 1) % NONZERO_DAMAGE_EDGE_VALUES.length],
      focusSpecialBattlerId: mismatchedOwner(preserveTarget, preserveSalt + 1),
      dmgMultiplier,
      salt: preserveSalt,
    }),
  );
}

addCase(
  "qualifying_receipt_overwrites_multiplier_preserves_all_four_receipts",
  "receipt-sibling-preservation",
  makeInitialRules({
    attacker: 2,
    target: 1,
    focusBattler: 2,
    focusPhysicalDmg: I32_MIN,
    focusPhysicalBattlerId: 1,
    focusSpecialDmg: I32_MAX,
    focusSpecialBattlerId: 3,
    dmgMultiplier: 255,
    salt: 40_000,
  }),
);

addCase(
  "no_matching_receipt_preserves_multiplier_and_all_four_receipts",
  "receipt-sibling-preservation",
  makeInitialRules({
    attacker: 3,
    target: 0,
    focusBattler: 3,
    focusPhysicalDmg: -1,
    focusPhysicalBattlerId: 1,
    focusSpecialDmg: I32_MAX,
    focusSpecialBattlerId: 2,
    dmgMultiplier: 2,
    salt: 40_100,
  }),
);

addCase(
  "missing_attacker_before_target_when_both_missing",
  "missing-attacker-before-target",
  makeInitialRules({
    attacker: null,
    target: null,
    focusBattler: 2,
    focusPhysicalDmg: I32_MIN,
    focusPhysicalBattlerId: 3,
    focusSpecialDmg: I32_MAX,
    focusSpecialBattlerId: 1,
    dmgMultiplier: 255,
    salt: 50_000,
  }),
);

addCase(
  "missing_attacker_before_target_when_target_present",
  "missing-attacker-before-target",
  makeInitialRules({
    attacker: null,
    target: 1,
    focusBattler: 2,
    focusPhysicalDmg: I32_MIN,
    focusPhysicalBattlerId: 1,
    focusSpecialDmg: I32_MAX,
    focusSpecialBattlerId: 1,
    dmgMultiplier: 255,
    salt: 50_100,
  }),
);

addCase(
  "missing_target_after_attacker_is_resolved",
  "missing-target-after-attacker",
  makeInitialRules({
    attacker: 2,
    target: null,
    focusBattler: 2,
    focusPhysicalDmg: I32_MIN,
    focusPhysicalBattlerId: 3,
    focusSpecialDmg: I32_MAX,
    focusSpecialBattlerId: 1,
    dmgMultiplier: 255,
    salt: 50_200,
  }),
);

addCase(
  "repeated_qualifying_receipt_rewrites_multiplier_and_advances_each_time",
  "repeated-application",
  makeInitialRules({
    attacker: 0,
    target: 3,
    focusBattler: 0,
    focusPhysicalDmg: -1,
    focusPhysicalBattlerId: 3,
    focusSpecialDmg: 0,
    focusSpecialBattlerId: 2,
    dmgMultiplier: 0,
    salt: 60_000,
  }),
  2,
);

addCase(
  "repeated_no_match_preserves_multiplier_and_advances_each_time",
  "repeated-application",
  makeInitialRules({
    attacker: 1,
    target: 2,
    focusBattler: 1,
    focusPhysicalDmg: 0,
    focusPhysicalBattlerId: 2,
    focusSpecialDmg: -1,
    focusSpecialBattlerId: 3,
    dmgMultiplier: 255,
    salt: 60_100,
  }),
  2,
);

assert(cases.length === 383, "case count drifted: " + cases.length);

for (const attacker of BATTLER_DOMAIN) {
  for (const target of BATTLER_DOMAIN) {
    for (const physicalState of RECEIPT_STATE_DOMAIN) {
      for (const specialState of RECEIPT_STATE_DOMAIN) {
        assert(
          cases.some((value) => {
            if (value.category !== "attacker-target-receipt-state-matrix") return false;
            const receipt = value.initial.receipts[attacker];
            return value.initial.attacker === attacker
              && value.initial.target === target
              && receiptState(
                receipt.protectPhysicalDmg,
                receipt.protectPhysicalBattlerId,
                target,
              ) === physicalState
              && receiptState(
                receipt.protectSpecialDmg,
                receipt.protectSpecialBattlerId,
                target,
              ) === specialState;
          }),
          "matrix omits attacker " + attacker + " target " + target
            + " physical " + physicalState + " special " + specialState,
        );
      }
    }
  }
}

for (const field of ["protectPhysicalDmg", "protectSpecialDmg"]) {
  const observed = new Set(
    cases
      .filter((value) => value.category === "signed-i32-edge-matrix")
      .map((value) => {
        const attacker = value.initial.attacker;
        assert(attacker !== null, "signed edge case omitted attacker");
        return value.initial.receipts[attacker][field];
      }),
  );
  assert(
    DAMAGE_EDGE_VALUES.every((value) => observed.has(value)),
    field + " signed edge matrix omits an edge",
  );
}

const observedMultipliers = new Set(cases.map((value) => value.initial.dmgMultiplier));
assert(
  MULTIPLIER_EDGE_VALUES.every((value) => observedMultipliers.has(value)),
  "corpus omits an incoming multiplier edge",
);
const ownerPairs = cases
  .filter((value) => value.category === "all-owner-pairs-live-receipts")
  .map((value) => {
    const attacker = value.initial.attacker;
    assert(attacker !== null, "owner pair case omitted attacker");
    const receipt = value.initial.receipts[attacker];
    return receipt.protectPhysicalBattlerId + ":" + receipt.protectSpecialBattlerId;
  });
assert(new Set(ownerPairs).size === BATTLE_SLOTS * BATTLE_SLOTS, "owner pair matrix drifted");

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
  ["attacker-role-values", BATTLER_DOMAIN.length],
  ["target-role-values", BATTLER_DOMAIN.length],
  ["optional-attacker-role-values", BATTLER_DOMAIN.length + 1],
  ["optional-target-role-values", BATTLER_DOMAIN.length + 1],
  ["receipt-owner-values", BATTLER_DOMAIN.length],
  ["protect-physical-dmg-signed-i32-values", 4_294_967_296],
  ["protect-special-dmg-signed-i32-values", 4_294_967_296],
  ["dmg-multiplier-u8-values", 256],
  ["signed-i32-edge-probes", DAMAGE_EDGE_VALUES.length],
  ["nonzero-signed-i32-edge-probes", NONZERO_DAMAGE_EDGE_VALUES.length],
  ["receipt-state-values", RECEIPT_STATE_DOMAIN.length],
  ["incoming-multiplier-edge-probes", MULTIPLIER_EDGE_VALUES.length],
  ["attacker-target-pairs", BATTLE_SLOTS * BATTLE_SLOTS],
  ["owner-pairs", BATTLE_SLOTS * BATTLE_SLOTS],
  ["application-count-values", 2],
  ["typed-missing-attacker-combinations", 2],
  ["typed-missing-target-combinations", 1],
]);
const corpus = Object.freeze({
  battlerDomain: BATTLER_DOMAIN,
  damageEdgeDomain: DAMAGE_EDGE_VALUES,
  nonzeroDamageEdgeDomain: NONZERO_DAMAGE_EDGE_VALUES,
  receiptStateDomain: RECEIPT_STATE_DOMAIN,
  multiplierEdgeDomain: MULTIPLIER_EDGE_VALUES,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustI32(value) {
  if (value === I32_MIN) return "i32::MIN";
  if (value === I32_MAX) return "i32::MAX";
  return String(value);
}

function rustU8(value) {
  return "0x" + value.toString(16).padStart(2, "0");
}

function rustBattler(value) {
  return "BattleScriptDoubledamageifdamagedBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustReceipt(value) {
  return [
    "BattleScriptDoubledamageifdamagedVectorReceipt {",
    "protect_physical_dmg: " + rustI32(value.protectPhysicalDmg) + ",",
    "protect_physical_battler_id: " + rustBattler(value.protectPhysicalBattlerId) + ",",
    "protect_special_dmg: " + rustI32(value.protectSpecialDmg) + ",",
    "protect_special_battler_id: " + rustBattler(value.protectSpecialBattlerId) + ",",
    "}",
  ].join(" ");
}

function rustState(value) {
  return [
    "BattleScriptDoubledamageifdamagedVectorState {",
    "receipts: [" + value.receipts.map(rustReceipt).join(", ") + "],",
    "dmg_multiplier: " + rustU8(value.dmgMultiplier) + ",",
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

function rustControls(values) {
  return "&[" + values.map(() => "BattleScriptDoubledamageifdamagedControl::Advance").join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-doubledamageifdamaged-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptDoubleDamageIfDamagedOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_doubledamageifdamaged::{");
lines.push("    BattleScriptDoubledamageifdamagedBattler, BattleScriptDoubledamageifdamagedControl,");
lines.push("};");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_VECTOR_CORPUS_SHA256: &str = "
    + rustString(corpusHash)
    + ";",
);
lines.push(
  "pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_BATTLER_DOMAIN: [u8; "
    + BATTLER_DOMAIN.length + "] = [" + BATTLER_DOMAIN.join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_DAMAGE_EDGE_DOMAIN: [i32; "
    + DAMAGE_EDGE_VALUES.length + "] = [" + DAMAGE_EDGE_VALUES.map(rustI32).join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_NONZERO_DAMAGE_EDGE_DOMAIN: [i32; "
    + NONZERO_DAMAGE_EDGE_VALUES.length + "] = ["
      + NONZERO_DAMAGE_EDGE_VALUES.map(rustI32).join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_RECEIPT_STATE_DOMAIN: [&str; "
    + RECEIPT_STATE_DOMAIN.length + "] = ["
      + RECEIPT_STATE_DOMAIN.map(rustString).join(", ") + "];",
);
lines.push(
  "pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_MULTIPLIER_EDGE_DOMAIN: [u8; "
    + MULTIPLIER_EDGE_VALUES.length + "] = ["
      + MULTIPLIER_EDGE_VALUES.map(rustU8).join(", ") + "];",
);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptDoubledamageifdamagedVectorReceipt {");
lines.push("    pub protect_physical_dmg: i32,");
lines.push("    pub protect_physical_battler_id: BattleScriptDoubledamageifdamagedBattler,");
lines.push("    pub protect_special_dmg: i32,");
lines.push("    pub protect_special_battler_id: BattleScriptDoubledamageifdamagedBattler,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptDoubledamageifdamagedVectorState {");
lines.push("    pub receipts: [BattleScriptDoubledamageifdamagedVectorReceipt; 4],");
lines.push("    pub dmg_multiplier: u8,");
lines.push("    pub attacker: Option<BattleScriptDoubledamageifdamagedBattler>,");
lines.push("    pub target: Option<BattleScriptDoubledamageifdamagedBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptDoubledamageifdamagedVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptDoubledamageifdamagedVectorState,");
lines.push("    pub expected: Option<BattleScriptDoubledamageifdamagedVectorState>,");
lines.push("    pub controls: &'static [BattleScriptDoubledamageifdamagedControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_DOMAIN_CENSUS: [(&str, u64); "
    + domainCensus.length + "] = [",
);
for (const [name, count] of domainCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_CATEGORY_CENSUS: [(&str, usize); "
    + categoryCensus.length + "] = [",
);
for (const [name, count] of categoryCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub const BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_BRANCH_CENSUS: [(&str, usize); "
    + branchCensus.length + "] = [",
);
for (const [name, count] of branchCensus) {
  lines.push("    (" + rustString(name) + ", " + count + "),");
}
lines.push("];");
lines.push("");
lines.push(
  "pub static BATTLE_SCRIPT_DOUBLEDAMAGEIFDAMAGED_CASES: [BattleScriptDoubledamageifdamagedVectorCase; "
    + cases.length + "] = [",
);
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptDoubledamageifdamagedVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        applications: " + value.applications + ",");
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
  throw new Error("gen-battle-script-doubledamageifdamaged-vectors: could not find rustfmt");
}

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(
  "gen-battle-script-doubledamageifdamaged-vectors: wrote "
    + path.relative(workspaceRoot, outPath),
);
console.log("gen-battle-script-doubledamageifdamaged-vectors: " + cases.length + " cases");
console.log(
  "gen-battle-script-doubledamageifdamaged-vectors: domain census "
    + JSON.stringify(domainCensus),
);
console.log(
  "gen-battle-script-doubledamageifdamaged-vectors: category census "
    + JSON.stringify(categoryCensus),
);
console.log(
  "gen-battle-script-doubledamageifdamaged-vectors: branch census "
    + JSON.stringify(branchCensus),
);
console.log("gen-battle-script-doubledamageifdamaged-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-doubledamageifdamaged-vectors: generated sha256 " + generatedHash);
