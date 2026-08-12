#!/usr/bin/env node
// Deterministic corpus for the native mask-1/mask-7 DecisionPolicy.
// Every expected success hash is produced by executing the canonical TS
// chooser and hashing every semantic field retained by the Rust typed result.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(here, "../..");
const outPath = path.join(
  workspace,
  "core-rs/crates/factory-core/src/factory_ai_scored_decision_vectors_gen.rs",
);
const { chooseFactoryAiScoredDecision } = await import(
  path.join(workspace, "src/engine/factoryAiDecisionPolicy.ts")
);
const abilityData = JSON.parse(fs.readFileSync(
  path.join(workspace, "src/data/gen/ability-item-hooks.json"),
  "utf8",
));
const abilityId = new Map(abilityData.universes.abilities.map((row) => [row.name, row.id]));

const BRANCH = new Map([
  ["tent", 0], ["frontierBrain", 1], ["challengeBelow2", 2],
  ["challengeBelow4", 3], ["challengeAtLeast4", 4],
]);
const SCRIPT = new Map([["check-bad-move", 0], ["try-to-faint", 1], ["check-viability", 2]]);
const TURN_OWNER = new Map([["decision", 0], ["battle-turn-boundary", 1], ["legacy-post-boundary", 2]]);
const MASK64 = (1n << 64n) - 1n;

class Hash64 {
  value = 0xcbf29ce484222325n;
  add(value) {
    let word = BigInt.asUintN(64, BigInt(value));
    for (let i = 0; i < 8; i += 1) {
      this.value ^= word & 0xffn;
      this.value = (this.value * 0x100000001b3n) & MASK64;
      word >>= 8n;
    }
  }
  option(value) {
    this.add(value === null || value === undefined ? 0 : 1);
    if (value !== null && value !== undefined) this.add(value);
  }
}

function addRng(hash, rng) {
  hash.add(rng.value);
  hash.add(rng.calls);
}

function cbmSite(reason) {
  if (reason.endsWith("-negates-type")) return 0;
  if (reason.endsWith("-soundproof")) return 1;
  throw new Error(`unprojected CBM draw site: ${reason}`);
}

function cvKind(kind) {
  if (kind === "target-faster-tie") return [0, 0];
  if (kind === "speed-down-roll") return [1, 0];
  const evasion = /^evasion-up-roll-(\d)$/.exec(kind);
  if (evasion) return [2, Number(evasion[1])];
  throw new Error(`unprojected CV draw kind: ${kind}`);
}

function addCommonDraw(hash, draw) {
  hash.add(draw.ordinal);
  addRng(hash, draw.before);
  addRng(hash, draw.after);
  hash.add(draw.rawRngValue);
  hash.add(draw.randomValue);
}

function fullReceiptHash(result) {
  const hash = new Hash64();
  hash.add(result.submission.requestId);
  hash.add(result.submission.side === "trainer" ? 1 : 0);
  hash.add(result.submission.decision.moveSlot);
  hash.add(result.submission.decision.targetBattler);
  addRng(hash, result.rng);

  const trace = result.trace;
  hash.add(trace.mask);
  const receipt = trace.maskSelection;
  hash.add(receipt.inputs.levelMode);
  hash.add(receipt.inputs.battleMode);
  hash.add(receipt.inputs.factoryWinStreak);
  hash.add(receipt.inputs.trainerOpponentId);
  hash.add(receipt.inputs.isFrontierBrain ? 1 : 0);
  hash.add(receipt.frontierStagesPerChallenge);
  hash.option(receipt.challengeNumber);
  hash.add(receipt.evaluations.length);
  for (const evaluation of receipt.evaluations) {
    hash.add(BRANCH.get(evaluation.id));
    hash.add(evaluation.matched ? 1 : 0);
  }
  hash.add(BRANCH.get(receipt.branch.id));
  hash.add(receipt.branch.mask);
  hash.add(trace.executedScoringScripts.length);
  for (const script of trace.executedScoringScripts) hash.add(SCRIPT.get(script));
  hash.add(TURN_OWNER.get(trace.turnStartRandomNumber.owner));
  hash.option(trace.turnStartRandomNumber.value);

  hash.add(trace.draws.length);
  for (const draw of trace.draws) {
    if (draw.kind === "setup-simulated-rng") {
      hash.add(0); hash.add(draw.moveSlot); addCommonDraw(hash, draw); hash.add(draw.simulatedRng);
    } else if (draw.kind === "best-move-tie") {
      hash.add(1); addCommonDraw(hash, draw);
    } else if (draw.kind === "turn-start-random-number") {
      hash.add(2); addCommonDraw(hash, draw);
    } else if (draw.phase === "check-bad-move") {
      hash.add(3); hash.add(draw.moveSlot); hash.add(cbmSite(draw.reason));
      addCommonDraw(hash, draw); hash.add(abilityId.get(draw.guessedAbility));
    } else if (draw.phase === "try-to-faint") {
      hash.add(4); hash.add(draw.moveSlot); addCommonDraw(hash, draw);
      hash.add(draw.succeeded ? 1 : 0);
    } else if (draw.phase === "check-viability") {
      const [variant, site] = cvKind(draw.kind);
      hash.add(5 + variant); hash.add(draw.moveSlot); hash.add(site);
      addCommonDraw(hash, draw);
      hash.add(variant === 0 ? draw.strikesFirst : (draw.succeeded ? 1 : 0));
    } else {
      throw new Error(`unprojected draw ${JSON.stringify(draw)}`);
    }
  }

  hash.add(trace.slotScores.length);
  for (const score of trace.slotScores) {
    hash.add(score.moveSlot); hash.add(score.moveId); hash.add(score.legal ? 1 : 0);
    hash.add(score.initialScore); hash.option(score.checkBadMoveDelta);
    hash.option(score.tryToFaintDelta); hash.option(score.checkViabilityDelta);
    hash.add(score.finalScore);
  }
  hash.add(trace.bestMoveSlots.length);
  for (const slot of trace.bestMoveSlots) hash.add(slot);
  hash.add(trace.tie.modulus); hash.add(trace.tie.index);
  hash.add(trace.tie.chosenDecision.moveSlot);
  hash.add(trace.tie.chosenDecision.targetBattler);
  return hash.value;
}

const stages = () => ({ atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6 });
function battler(overrides = {}) {
  return {
    types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"], attack: 100, defense: 100,
    spAttack: 100, spDefense: 100, speed: 100, level: 50,
    statStages: stages(), isFirstTurn: 2, hp: 100, maxHp: 100,
    ability: "ABILITY_NONE", ...overrides,
  };
}
function target(overrides = {}) {
  return {
    ...battler({ types: ["TYPE_NORMAL", "TYPE_NORMAL"], ability: "ABILITY_STURDY" }),
    species: 213, knownAbility: "ABILITY_STURDY", ...overrides,
  };
}
function scenario(id) {
  const base = { moves: [150, 150, 150, 150], attacker: battler(), target: target() };
  switch (id) {
    case 0: return base;
    case 1: return { ...base, moves: [85, 150, 150, 150], target: target({ species: 105, types: ["TYPE_GROUND", "TYPE_GROUND"], ability: "ABILITY_ROCK_HEAD", knownAbility: "ABILITY_ROCK_HEAD" }) };
    case 2: return { ...base, moves: [57, 157, 34, 85], target: target({ species: 105, types: ["TYPE_GROUND", "TYPE_GROUND"], hp: 5, maxHp: 135, ability: "ABILITY_ROCK_HEAD", knownAbility: "ABILITY_ROCK_HEAD" }) };
    case 3: return { ...base, moves: [98, 1, 57, 150], target: target({ hp: 5 }) };
    case 4: return { ...base, moves: [81, 150, 150, 150], attacker: battler({ speed: 5, types: ["TYPE_BUG", "TYPE_ROCK"] }), target: target({ species: 51, speed: 120, hp: 999, maxHp: 999, types: ["TYPE_GROUND", "TYPE_GROUND"], ability: "ABILITY_ARENA_TRAP", knownAbility: "ABILITY_ARENA_TRAP" }) };
    case 5: return { ...base, moves: [81, 258, 150, 150], attacker: battler({ speed: 120, types: ["TYPE_GROUND", "TYPE_GROUND"] }), target: target({ speed: 5, hp: 999, maxHp: 999, types: ["TYPE_BUG", "TYPE_ROCK"] }) };
    case 6: return { ...base, moves: [45, 258, 150, 150], attacker: battler({ speed: 120, types: ["TYPE_GROUND", "TYPE_GROUND"] }), target: target({ speed: 5, hp: 999, maxHp: 999, types: ["TYPE_BUG", "TYPE_ROCK"] }) };
    case 7: return { ...base, moves: [58, 150, 150, 150], target: target({ species: 12, hp: 999, maxHp: 999, types: ["TYPE_GRASS", "TYPE_FLYING"] }) };
    case 8: return { ...base, moves: [57, 150, 150, 150], target: target({ species: 183, types: ["TYPE_WATER", "TYPE_WATER"], ability: "ABILITY_HUGE_POWER", knownAbility: null }) };
    case 9: return { ...base, moves: [104, 150, 150, 150], attacker: battler({ hp: 50, evasionStage: 9, statStages: { ...stages(), evasion: 9 } }), target: target({ isToxicPoisoned: true, isLeechSeeded: true, isCursed: true, isInfatuated: true, hp: 999, maxHp: 999 }) };
    default: throw new Error(`unknown scenario ${id}`);
  }
}

function makeRequest(legalMask, mode = "normal") {
  const legalDecisions = [];
  for (let slot = 0; slot < 4; slot += 1) {
    if ((legalMask & (1 << slot)) !== 0) {
      legalDecisions.push({ kind: "use-move", moveSlot: slot, targetBattler: slot === 2 ? 1 : 0 });
    }
  }
  if (mode === "switch") legalDecisions.push({ kind: "switch", partyIndex: 1 });
  if (mode === "duplicate") legalDecisions.push({ kind: "use-move", moveSlot: 0, targetBattler: 1 });
  return { kind: "command", requestId: 91, side: "trainer", battler: 1, legalDecisions };
}

function makeInput({ scenarioId, legalMask, streak, seed, calls, turnMode = 0 }) {
  const value = scenario(scenarioId);
  const view = {
    schema: "factory-ai-scored-view/v1", mode: "factory-level-50-singles",
    active: { aiBattler: 1, targetBattler: 0 },
    factory: { levelMode: 0, battleMode: 0, factoryWinStreak: streak, trainerOpponentId: 222 },
    moves: value.moves, attacker: value.attacker, target: value.target,
  };
  const input = { view, request: makeRequest(legalMask), rng: { value: seed, calls } };
  if (turnMode === 1) input.turnStartRandomNumber = { owner: "decision" };
  if (turnMode === 2) input.turnStartRandomNumber = { owner: "battle-turn-boundary", value: 0x4321 };
  return input;
}

const successCases = [];
for (const streak of [14, 28]) {
  for (let legalMask = 1; legalMask < 16; legalMask += 1) {
    successCases.push({
      scenarioId: 0, legalMask, streak,
      seed: (0x1020_3040 + streak * 97 + legalMask * 0x10101) >>> 0,
      calls: legalMask * 3 + (streak === 28 ? 7 : 0),
      turnMode: legalMask % 3,
    });
  }
}
for (const [scenarioId, streak, seed, calls, legalMask] of [
  [1, 14, 1, 0, 15], [1, 14, 99, 17, 15],
  [2, 28, 1, 0, 15], [2, 28, 99, 29, 15],
  [3, 28, 1, 0, 15], [4, 28, 1, 11, 15], [4, 28, 99, 0, 15],
  [5, 28, 1, 0, 15], [6, 28, 99, 31, 15],
  [7, 28, 1, 4, 1], [7, 28, 4, 0, 1],
  [8, 14, 1, 0, 1], [8, 28, 99, 9, 1],
  [9, 28, 1, 0, 1], [9, 28, 99, 23, 1],
]) successCases.push({ scenarioId, streak, seed, calls, legalMask, turnMode: 0 });

for (const value of successCases) {
  value.expectedHash = fullReceiptHash(chooseFactoryAiScoredDecision(makeInput(value)));
}

const errorSpecs = [
  [0, "mask-zero"], [1, "forced-switch"], [2, "wrong-side"],
  [3, "wrong-battler"], [4, "switch"], [5, "duplicate"],
  [6, "move-none"], [7, "empty"], [8, "level-range"],
  [9, "battle-range"], [10, "streak-range"], [11, "trainer-range"],
];
const errorCases = errorSpecs.map(([id, label]) => {
  const input = makeInput({ scenarioId: 0, legalMask: 1, streak: 14, seed: 1, calls: 0 });
  if (id === 0) input.view.factory.factoryWinStreak = 0;
  if (id === 1) input.request.kind = "forced-switch";
  if (id === 2 || id === 3) { input.request.side = "player"; input.request.battler = 0; }
  if (id === 4) input.request = makeRequest(1, "switch");
  if (id === 5) input.request = makeRequest(1, "duplicate");
  if (id === 6) input.view.moves = [0, 150, 150, 150];
  if (id === 7) input.request = makeRequest(0);
  if (id === 8) input.view.factory.levelMode = 3;
  if (id === 9) input.view.factory.battleMode = 2;
  if (id === 10) input.view.factory.factoryWinStreak = 65536;
  if (id === 11) input.view.factory.trainerOpponentId = 65536;
  // createBattleCommandRequest rejects [] before the chooser's own explicit
  // empty-map guard. Rust's borrowed slice makes that defensive guard typed-
  // reachable, so pin the exact chooser literal (TS :940) as M5f-2a did.
  let message = id === 7 ? "Factory AI scored policy requires at least one legal move" : undefined;
  try { chooseFactoryAiScoredDecision(input); } catch (error) { if (id !== 7) message = error.message; }
  if (message === undefined) throw new Error(`error case ${label} did not throw`);
  return { id, label, message };
});

const rustString = (value) => JSON.stringify(value);
const lines = [
  "// @generated by tools/gen-factory-ai-scored-decision-vectors.mjs; do not edit.",
  "// Source: canonical chooseFactoryAiScoredDecision executed by Node.",
  "",
  "#[derive(Debug, Clone, Copy)]",
  "pub struct FactoryAiScoredDecisionCase {",
  "    pub scenario_id: u8, pub legal_mask: u8, pub streak: u32,",
  "    pub seed: u32, pub calls: u32, pub turn_mode: u8, pub expected_full_receipt_hash: u64,",
  "}",
  "",
  `pub static FACTORY_AI_SCORED_DECISION_CASES: [FactoryAiScoredDecisionCase; ${successCases.length}] = [`,
];
for (const value of successCases) {
  lines.push(`    FactoryAiScoredDecisionCase { scenario_id: ${value.scenarioId}, legal_mask: ${value.legalMask}, streak: ${value.streak}, seed: ${value.seed}, calls: ${value.calls}, turn_mode: ${value.turnMode}, expected_full_receipt_hash: 0x${value.expectedHash.toString(16).padStart(16, "0")} },`);
}
lines.push(
  "];",
  "",
  "#[derive(Debug, Clone, Copy)]",
  "pub struct FactoryAiScoredDecisionErrorCase { pub scenario_id: u8, pub expected_message: &'static str }",
  "",
  `pub static FACTORY_AI_SCORED_DECISION_ERROR_CASES: [FactoryAiScoredDecisionErrorCase; ${errorCases.length}] = [`,
);
for (const value of errorCases) {
  lines.push(`    // ${value.label}`);
  lines.push(`    FactoryAiScoredDecisionErrorCase { scenario_id: ${value.id}, expected_message: ${rustString(value.message)} },`);
}
lines.push("];", "");
fs.writeFileSync(outPath, lines.join("\n"));
const rustfmt = execFileSync("rustup", ["which", "rustfmt"], { encoding: "utf8" }).trim();
execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
console.log(`wrote ${path.relative(workspace, outPath)} (${successCases.length} success, ${errorCases.length} error cases)`);
