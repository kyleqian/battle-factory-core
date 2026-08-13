#!/usr/bin/env node
// Differential corpus for the live-view -> native DecisionPolicy bridge.
// Expected hashes are produced by executing the canonical TS live constructor
// and chooser together.  Rust tests reconstruct the live view, invoke the
// bridge, and hash the complete retained chooser receipt.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-factory-ai-live-decision-bridge-vectors.mjs

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(scriptDir, "../..");
const outPath = path.join(
  workspace,
  "core-rs/crates/factory-core/src/factory_ai_live_decision_bridge_vectors_gen.rs",
);
const { createFactoryAiViewFromLiveRules } = await import(
  path.join(workspace, "src/engine/factoryAiLiveDriver.ts"),
);
const {
  chooseFactoryAiMaskZeroDecision,
  chooseFactoryAiScoredDecision,
} = await import(path.join(workspace, "src/engine/factoryAiDecisionPolicy.ts"));

const TYPE_IDS = new Map([
  ["TYPE_NORMAL", 0], ["TYPE_FIGHTING", 1], ["TYPE_FLYING", 2], ["TYPE_POISON", 3],
  ["TYPE_GROUND", 4], ["TYPE_ROCK", 5], ["TYPE_BUG", 6], ["TYPE_GHOST", 7],
  ["TYPE_STEEL", 8], ["TYPE_MYSTERY", 9], ["TYPE_FIRE", 10], ["TYPE_WATER", 11],
  ["TYPE_GRASS", 12], ["TYPE_ELECTRIC", 13], ["TYPE_PSYCHIC", 14], ["TYPE_ICE", 15],
  ["TYPE_DRAGON", 16], ["TYPE_DARK", 17],
]);
const abilityData = JSON.parse(fs.readFileSync(
  path.join(workspace, "src/data/gen/ability-item-hooks.json"),
  "utf8",
));
const ABILITY_IDS = new Map(abilityData.universes.abilities.map((row) => [row.name, row.id]));

const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SANDSTORM = (1 << 3) | (1 << 4);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const B_WEATHER_HAIL = 1 << 7;
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SPIKES = 1 << 4;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const SIDE_STATUS_FUTUREATTACK = 1 << 6;
const STATUS1_SLEEP = 0x0000_0007;
const STATUS1_TOXIC_POISON = 1 << 7;
const STATUS1_REFRESH_CURE_MASK = (1 << 3) | (1 << 4) | (1 << 6) | (1 << 7);
const STATUS2_CONFUSION = 0x0000_0007;
const STATUS2_INFATUATION = 0x000f_0000;
const STATUS2_FOCUS_ENERGY = 1 << 20;
const STATUS2_SUBSTITUTE = 1 << 24;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const STATUS2_NIGHTMARE = 1 << 27;
const STATUS2_CURSED = 1 << 28;
const STATUS2_FORESIGHT = 1 << 29;
const STATUS2_TORMENT = 0x8000_0000;
const STATUS3_LEECHSEED = 1 << 2;
const STATUS3_PERISH_SONG = 1 << 5;
const STATUS3_ROOTED = 1 << 10;
const STATUS3_YAWN = (1 << 11) | (1 << 12);

class Hash64 {
  value = 0xcbf29ce484222325n;
  add(value) {
    let word = BigInt.asUintN(64, BigInt(value));
    for (let i = 0; i < 8; i += 1) {
      this.value ^= word & 0xffn;
      this.value = (this.value * 0x100000001b3n) & ((1n << 64n) - 1n);
      word >>= 8n;
    }
  }
  option(value) {
    this.add(value === null || value === undefined ? 0 : 1);
    if (value !== null && value !== undefined) this.add(value);
  }
}

function addRng(hash, rng) { hash.add(rng.value); hash.add(rng.calls); }
function addCommonDraw(hash, draw) {
  hash.add(draw.ordinal); addRng(hash, draw.before); addRng(hash, draw.after);
  hash.add(draw.rawRngValue); hash.add(draw.randomValue);
}
function branchId(id) {
  return new Map([
    ["tent", 0], ["frontierBrain", 1], ["challengeBelow2", 2],
    ["challengeBelow4", 3], ["challengeAtLeast4", 4],
  ]).get(id);
}
function addReceipt(hash, receipt) {
  hash.add(receipt.inputs.levelMode); hash.add(receipt.inputs.battleMode);
  hash.add(receipt.inputs.factoryWinStreak); hash.add(receipt.inputs.trainerOpponentId);
  hash.add(receipt.isFrontierBrain ? 1 : 0); hash.add(receipt.frontierStagesPerChallenge);
  hash.option(receipt.challengeNumber); hash.add(receipt.evaluations.length);
  for (const evaluation of receipt.evaluations) {
    hash.add(branchId(evaluation.id)); hash.add(evaluation.matched ? 1 : 0);
  }
  hash.add(branchId(receipt.branch.id)); hash.add(receipt.branch.mask);
}
function cbmSite(reason) {
  if (reason.endsWith("-negates-type")) return 0;
  if (reason.endsWith("-soundproof")) return 1;
  throw new Error(`bridge corpus: unprojected CBM draw ${reason}`);
}
function cvSite(kind) {
  if (kind === "target-faster-tie") return [0, 0];
  if (kind === "speed-down-roll") return [1, 0];
  if (kind === "sleep-roll") return [3, 0];
  const evasion = /^evasion-up-roll-(\d)$/.exec(kind);
  if (evasion) return [2, Number(evasion[1])];
  throw new Error(`bridge corpus: unprojected CV draw ${kind}`);
}
function scoredHash(result) {
  const hash = new Hash64();
  hash.add(result.submission.requestId); hash.add(result.submission.side === "trainer" ? 1 : 0);
  hash.add(result.submission.decision.moveSlot); hash.add(result.submission.decision.targetBattler);
  addRng(hash, result.rng);
  const trace = result.trace;
  hash.add(trace.mask); addReceipt(hash, trace.maskSelection);
  const scripts = new Map([["check-bad-move", 0], ["try-to-faint", 1], ["check-viability", 2]]);
  hash.add(trace.executedScoringScripts.length);
  for (const script of trace.executedScoringScripts) hash.add(scripts.get(script));
  const owners = new Map([["decision", 0], ["battle-turn-boundary", 1], ["legacy-post-boundary", 2]]);
  hash.add(owners.get(trace.turnStartRandomNumber.owner)); hash.option(trace.turnStartRandomNumber.value);
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
      addCommonDraw(hash, draw); hash.add(ABILITY_IDS.get(draw.guessedAbility));
    } else if (draw.phase === "try-to-faint") {
      hash.add(4); hash.add(draw.moveSlot); addCommonDraw(hash, draw); hash.add(draw.succeeded ? 1 : 0);
    } else if (draw.phase === "check-viability") {
      const [variant, site] = cvSite(draw.kind);
      hash.add(5 + variant); hash.add(draw.moveSlot); hash.add(site);
      addCommonDraw(hash, draw);
      hash.add(variant === 0 ? draw.strikesFirst : (draw.succeeded ? 1 : 0));
    } else throw new Error(`bridge corpus: unprojected draw ${JSON.stringify(draw)}`);
  }
  hash.add(trace.slotScores.length);
  for (const score of trace.slotScores) {
    hash.add(score.moveSlot); hash.add(score.moveId); hash.add(score.legal ? 1 : 0);
    hash.add(score.initialScore); hash.option(score.checkBadMoveDelta);
    hash.option(score.tryToFaintDelta); hash.option(score.checkViabilityDelta);
    hash.add(score.finalScore);
  }
  hash.add(trace.bestMoveSlots.length); for (const slot of trace.bestMoveSlots) hash.add(slot);
  hash.add(trace.tie.modulus); hash.add(trace.tie.index);
  hash.add(trace.tie.chosenDecision.moveSlot); hash.add(trace.tie.chosenDecision.targetBattler);
  return hash.value;
}
function maskZeroHash(result) {
  const hash = new Hash64();
  hash.add(result.submission.requestId); hash.add(result.submission.side === "trainer" ? 1 : 0);
  hash.add(result.submission.decision.moveSlot); hash.add(result.submission.decision.targetBattler);
  addRng(hash, result.rng); hash.add(result.trace.mask); addReceipt(hash, result.trace.maskSelection);
  hash.add(0); hash.add(result.trace.draws.length);
  for (const draw of result.trace.draws) {
    if (draw.kind === "setup-simulated-rng") {
      hash.add(0); hash.add(draw.moveSlot); addCommonDraw(hash, draw); hash.add(draw.simulatedRng);
    } else if (draw.kind === "best-move-tie") { hash.add(1); addCommonDraw(hash, draw); }
    else throw new Error(`bridge corpus: unexpected mask-zero draw ${draw.kind}`);
  }
  hash.add(result.trace.slotScores.length);
  for (const score of result.trace.slotScores) {
    hash.add(score.moveSlot); hash.add(score.moveId); hash.add(score.legal ? 1 : 0);
    hash.add(score.initialScore); hash.add(score.finalScore);
  }
  hash.add(result.trace.bestMoveSlots.length);
  for (const slot of result.trace.bestMoveSlots) hash.add(slot);
  hash.add(result.trace.tie.modulus); hash.add(result.trace.tie.index);
  hash.add(result.trace.tie.chosenDecision.moveSlot); hash.add(result.trace.tie.chosenDecision.targetBattler);
  return hash.value;
}

const DEFAULT_STAGES = [0, 6, 6, 6, 6, 6, 6, 6];
function battler(overrides = {}) {
  const base = {
    types: ["TYPE_NORMAL", "TYPE_NORMAL"], attack: 100, defense: 100,
    spAttack: 100, spDefense: 100, speed: 100, level: 50,
    statStages: [...DEFAULT_STAGES], isFirstTurn: 2, hp: 100, maxHP: 100,
    ability: 0, status1: 0, status2: 0, status3: 0, protectUses: 0, tauntTimer: 0,
    species: 213, moves: [150, 150, 150, 150],
  };
  return { ...base, ...overrides, types: [...(overrides.types ?? base.types)],
    statStages: [...(overrides.statStages ?? base.statStages)], moves: [...(overrides.moves ?? base.moves)] };
}
function history(overrides = {}) {
  const base = { usedMoves: [[], [], [], []], knownAbilities: [null, null, null, null],
    knownItemEffects: [0, 0, 0, 0], partyIndexes: [0, 1, 2, 3] };
  const value = { ...base, ...overrides };
  return { usedMoves: value.usedMoves.map((row) => [...row]), knownAbilities: [...value.knownAbilities],
    knownItemEffects: [...value.knownItemEffects], partyIndexes: [...value.partyIndexes] };
}
function decisions(mask) {
  return [0, 1, 2, 3].filter((slot) => (mask & (1 << slot)) !== 0)
    .map((moveSlot) => ({ kind: "use-move", moveSlot, targetBattler: moveSlot === 2 ? 1 : 0 }));
}
function request(mask) {
  return { kind: "command", requestId: 91, side: "trainer", battler: 1, legalDecisions: decisions(mask) };
}
function sourceCase(spec) {
  const target = battler(spec.target);
  const attacker = battler(spec.attacker);
  return {
    ...spec,
    weather: spec.weather ?? 0,
    sideStatuses: [...(spec.sideStatuses ?? [0, 0])],
    lastMoves: [...(spec.lastMoves ?? [0, 0, 0, 0])],
    battlers: [target, attacker, battler(), battler()],
    history: history(spec.history),
    streak: spec.streak,
    trainerOpponentId: spec.trainerOpponentId ?? 222,
    battleTurnCountPresent: spec.battleTurnCountPresent ?? false,
    battleTurnCount: spec.battleTurnCount ?? 0,
    legalMask: spec.legalMask ?? 15,
    seed: spec.seed ?? 1,
    calls: spec.calls ?? 0,
    turnMode: spec.turnMode ?? 0,
  };
}

const cases = [
  sourceCase({ label: "mask_zero_baseline", category: "mask-0", chooser: 0, streak: 0,
    attacker: { moves: [33, 0, 0, 0] }, legalMask: 1, seed: 0x12345678 }),
  sourceCase({ label: "mask_zero_sparse_history", category: "mask-0-history", chooser: 0, streak: 6,
    attacker: { moves: [57, 157, 34, 85], types: ["TYPE_WATER", "TYPE_ICE"] },
    target: { types: ["TYPE_GROUND", "TYPE_ROCK"], ability: 69 },
    history: { usedMoves: [[105, 0], [57], [], []], knownAbilities: ["ABILITY_ROCK_HEAD", null, null, null], knownItemEffects: [44, 0, 0, 0] },
    legalMask: 5, seed: 0x0badcafe, calls: 9 }),
  sourceCase({ label: "mask_one_type_ability_edges", category: "mask-1-type-ability", chooser: 1, streak: 14,
    attacker: { moves: [85, 150, 150, 150], types: ["TYPE_FIRE", "TYPE_FLYING"], ability: 70 },
    target: { species: 105, types: ["TYPE_GROUND", "TYPE_GROUND"], ability: 69 },
    history: { knownAbilities: ["ABILITY_ROCK_HEAD", null, null, null], usedMoves: [[182], [], [], []] },
    legalMask: 1, seed: 1, calls: 7 }),
  sourceCase({ label: "mask_one_status_weather_screens", category: "mask-1-status-weather", chooser: 1, streak: 20,
    weather: B_WEATHER_RAIN | B_WEATHER_SUN | B_WEATHER_HAIL,
    sideStatuses: [SIDE_STATUS_SAFEGUARD | SIDE_STATUS_SPIKES, SIDE_STATUS_LIGHTSCREEN | SIDE_STATUS_REFLECT],
    attacker: { moves: [92, 150, 150, 150], status1: STATUS1_REFRESH_CURE_MASK, status2: STATUS2_FOCUS_ENERGY | STATUS2_SUBSTITUTE, status3: STATUS3_ROOTED, protectUses: 3 },
    target: { species: 213, types: ["TYPE_NORMAL", "TYPE_NORMAL"], ability: 5, status1: STATUS1_TOXIC_POISON, status2: STATUS2_CONFUSION | STATUS2_ESCAPE_PREVENTION | STATUS2_TORMENT, status3: STATUS3_LEECHSEED | STATUS3_PERISH_SONG, tauntTimer: 2 },
    legalMask: 1, seed: 0x10203040, calls: 3 }),
  sourceCase({ label: "mask_seven_sleep_history_short", category: "mask-7-history", chooser: 1, streak: 28,
    weather: B_WEATHER_SUN, attacker: { moves: [47, 57, 157, 34], ability: 70 },
    target: { ability: 5, status1: STATUS1_SLEEP, status2: STATUS2_NIGHTMARE | STATUS2_FORESIGHT | STATUS2_CURSED, status3: STATUS3_YAWN },
    history: { usedMoves: [[138], [], [], []], knownAbilities: [null, null, null, null] },
    legalMask: 15, seed: 1, calls: 0, turnMode: 2, battleTurnCountPresent: true, battleTurnCount: 3 }),
  sourceCase({ label: "mask_seven_sleep_history_four", category: "mask-7-history", chooser: 1, streak: 28,
    weather: B_WEATHER_HAIL, attacker: { moves: [47, 57, 157, 34], statStages: [99, 0, 1, 2, 3, 4, 5, 12], hp: 37, maxHP: 155 },
    target: { types: ["TYPE_WATER", "TYPE_PSYCHIC"], ability: 37, status2: STATUS2_INFATUATION, status3: STATUS3_LEECHSEED },
    history: { usedMoves: [[150, 150, 150, 138], [], [], []], knownAbilities: ["ABILITY_HUGE_POWER", null, null, null] },
    legalMask: 9, seed: 0xabcdef01, calls: 4, turnMode: 1, battleTurnCountPresent: true, battleTurnCount: 19 }),
  sourceCase({ label: "mask_seven_sleep_history_extended", category: "mask-7-history", chooser: 1, streak: 28,
    weather: B_WEATHER_HAIL, attacker: { moves: [47, 57, 157, 34], statStages: [99, 0, 1, 2, 3, 4, 5, 12], hp: 37, maxHP: 155 },
    target: { types: ["TYPE_WATER", "TYPE_PSYCHIC"], ability: 37, status2: STATUS2_INFATUATION, status3: STATUS3_LEECHSEED },
    history: { usedMoves: [[150, 150, 150, 150, 138], [], [], []], knownAbilities: ["ABILITY_HUGE_POWER", null, null, null] },
    legalMask: 9, seed: 0xabcdef01, calls: 4, turnMode: 1, battleTurnCountPresent: true, battleTurnCount: 19 }),
  sourceCase({ label: "mask_seven_protect_optional_flags", category: "mask-7-optional", chooser: 1, streak: 28,
    sideStatuses: [SIDE_STATUS_REFLECT | SIDE_STATUS_FUTUREATTACK, SIDE_STATUS_LIGHTSCREEN | SIDE_STATUS_SAFEGUARD | SIDE_STATUS_FUTUREATTACK],
    attacker: { moves: [182, 57, 157, 34], status2: STATUS2_INFATUATION | STATUS2_FOCUS_ENERGY | STATUS2_SUBSTITUTE, status3: STATUS3_LEECHSEED | STATUS3_YAWN | STATUS3_ROOTED, protectUses: 2 },
    target: { status1: STATUS1_TOXIC_POISON, status2: STATUS2_CURSED | STATUS2_TORMENT, status3: STATUS3_LEECHSEED | STATUS3_PERISH_SONG, tauntTimer: 4 },
    legalMask: 1, seed: 0x31415926, calls: 12, turnMode: 0 }),
  sourceCase({ label: "mask_seven_stage_type_edges", category: "mask-7-stages", chooser: 1, streak: 28,
    attacker: { moves: [104, 150, 150, 150], types: ["TYPE_GROUND", "TYPE_ROCK"], statStages: [0, 0, 12, 0, 12, 0, 12, 9], hp: 50, maxHP: 100 },
    target: { species: 12, types: ["TYPE_GRASS", "TYPE_FLYING"], statStages: [0, 12, 0, 12, 0, 12, 0, 0], hp: 999, maxHP: 999, ability: 71 },
    legalMask: 1, seed: 99, calls: 23 }),
  sourceCase({ label: "mask_seven_boundary_turn_owner", category: "mask-7-turn-ownership", chooser: 1, streak: 28,
    attacker: { moves: [57, 157, 34, 85] }, target: { ability: 37, types: ["TYPE_WATER", "TYPE_WATER"] },
    legalMask: 15, seed: 0x76543210, calls: 41, turnMode: 2, battleTurnCountPresent: true, battleTurnCount: 0 }),
  sourceCase({ label: "mask_seven_decision_turn_owner", category: "mask-7-turn-ownership", chooser: 1, streak: 28,
    attacker: { moves: [57, 157, 34, 85] }, target: { ability: 37, types: ["TYPE_WATER", "TYPE_WATER"] },
    legalMask: 15, seed: 0x76543210, calls: 41, turnMode: 1, battleTurnCountPresent: false }),
];

const EXPECTED_CATEGORY_COUNTS = new Map([
  ["mask-0", 1], ["mask-0-history", 1], ["mask-1-type-ability", 1],
  ["mask-1-status-weather", 1], ["mask-7-history", 3], ["mask-7-optional", 1],
  ["mask-7-stages", 1], ["mask-7-turn-ownership", 2],
]);
const counts = new Map();
for (const value of cases) counts.set(value.category, (counts.get(value.category) ?? 0) + 1);
for (const [category, count] of EXPECTED_CATEGORY_COUNTS) {
  if (counts.get(category) !== count) throw new Error(`bridge corpus: ${category} census changed`);
}

function canonical(value) {
  const challenge = { factoryWinStreak: value.streak, trainerOpponentId: value.trainerOpponentId };
  if (value.battleTurnCountPresent) challenge.battleTurnCount = value.battleTurnCount;
  const view = createFactoryAiViewFromLiveRules({
    rulesContext: { battlers: value.battlers, weather: value.weather, sideStatuses: value.sideStatuses,
      moveHistory: { lastMoves: value.lastMoves } },
    history: value.history,
    challenge,
  });
  const chooserView = value.chooser === 0
    ? { schema: "factory-ai-view/v1", mode: "factory-level-50-singles", active: view.active, factory: view.factory, moves: view.moves }
    : view;
  const input = { view: chooserView, request: request(value.legalMask), rng: { value: value.seed, calls: value.calls } };
  if (value.turnMode === 1) input.turnStartRandomNumber = { owner: "decision" };
  if (value.turnMode === 2) input.turnStartRandomNumber = { owner: "battle-turn-boundary", value: 0x4321 };
  const result = value.chooser === 0
    ? chooseFactoryAiMaskZeroDecision(input)
    : chooseFactoryAiScoredDecision(input);
  return value.chooser === 0 ? maskZeroHash(result) : scoredHash(result);
}

for (const value of cases) value.expected_hash = canonical(value);

function rs(value) { return JSON.stringify(value); }
function rn(value) {
  if (Number.isNaN(value)) return "f64::NAN";
  if (value === Infinity) return "f64::INFINITY";
  if (value === -Infinity) return "f64::NEG_INFINITY";
  if (Object.is(value, -0)) return "-0.0";
  return Number.isInteger(value) ? `${value}.0` : String(value);
}
function nums(values) { return values.map(rn).join(", "); }
function battlerRs(value) { return `FactoryAiLiveDecisionBattlerVector {
    types: [${value.types.map(rs).join(", ")}], attack: ${rn(value.attack)}, defense: ${rn(value.defense)},
    sp_attack: ${rn(value.spAttack)}, sp_defense: ${rn(value.spDefense)}, speed: ${rn(value.speed)}, level: ${rn(value.level)},
    stat_stages: [${nums(value.statStages)}], is_first_turn: ${rn(value.isFirstTurn)}, hp: ${rn(value.hp)}, max_hp: ${rn(value.maxHP)},
    ability: ${rn(value.ability)}, status1: ${rn(value.status1)}, status2: ${rn(value.status2)}, status3: ${rn(value.status3)},
    protect_uses: ${rn(value.protectUses)}, taunt_timer: ${rn(value.tauntTimer)}, species: ${rn(value.species)}, moves: [${nums(value.moves)}],
}`; }
function historyRs(value) { return `FactoryAiLiveDecisionHistoryVector {
    used_moves: [${value.usedMoves.map((row) => `&[${nums(row)}]`).join(", ")}],
    known_abilities: [${value.knownAbilities.map((row) => row === null ? "None" : `Some(${rs(row)})`).join(", ")}],
    known_item_effects: [${nums(value.knownItemEffects)}], party_indexes: [${nums(value.partyIndexes)}],
}`; }
const lines = [
  "// GENERATED by core-rs/tools/gen-factory-ai-live-decision-bridge-vectors.mjs.",
  "// Expected hashes come from canonical TypeScript live-view construction + chooser execution.",
  "// Regenerate with node --experimental-strip-types core-rs/tools/gen-factory-ai-live-decision-bridge-vectors.mjs.",
  "// Deterministic fixed corpus; do not hand-edit.", "",
  "#[derive(Debug, Clone, Copy)]", "pub struct FactoryAiLiveDecisionBattlerVector {",
  "    pub types: [&'static str; 2], pub attack: f64, pub defense: f64, pub sp_attack: f64, pub sp_defense: f64,",
  "    pub speed: f64, pub level: f64, pub stat_stages: [f64; 8], pub is_first_turn: f64, pub hp: f64, pub max_hp: f64,",
  "    pub ability: f64, pub status1: f64, pub status2: f64, pub status3: f64, pub protect_uses: f64, pub taunt_timer: f64,",
  "    pub species: f64, pub moves: [f64; 4],", "}", "",
  "#[derive(Debug, Clone, Copy)]", "pub struct FactoryAiLiveDecisionHistoryVector {",
  "    pub used_moves: [&'static [f64]; 4], pub known_abilities: [Option<&'static str>; 4],",
  "    pub known_item_effects: [f64; 4], pub party_indexes: [f64; 4],", "}", "",
  "#[derive(Debug, Clone, Copy)]", "pub struct FactoryAiLiveDecisionCase {",
  "    pub label: &'static str, pub category: &'static str, pub chooser: u8, pub weather: f64,",
  "    pub side_statuses: [f64; 2], pub last_moves: [f64; 4], pub battlers: [FactoryAiLiveDecisionBattlerVector; 4],",
  "    pub history: FactoryAiLiveDecisionHistoryVector, pub streak: f64, pub trainer_opponent_id: f64,",
  "    pub battle_turn_count_present: bool, pub battle_turn_count: f64, pub legal_mask: u8, pub seed: u32, pub calls: u32,",
  "    pub turn_mode: u8, pub expected_hash: u64,", "}", "",
  `pub const FACTORY_AI_LIVE_DECISION_BRIDGE_CATEGORY_COUNTS: [(&str, usize); ${EXPECTED_CATEGORY_COUNTS.size}] = [`,
  ...[...EXPECTED_CATEGORY_COUNTS].map(([category, count]) => `    (${rs(category)}, ${count}),`), "];",
  "",
  `pub static FACTORY_AI_LIVE_DECISION_BRIDGE_CASES: [FactoryAiLiveDecisionCase; ${cases.length}] = [`,
];
for (const value of cases) {
  lines.push(`    FactoryAiLiveDecisionCase {
        label: ${rs(value.label)}, category: ${rs(value.category)}, chooser: ${value.chooser}, weather: ${rn(value.weather)},
        side_statuses: [${nums(value.sideStatuses)}], last_moves: [${nums(value.lastMoves)}],
        battlers: [${value.battlers.map(battlerRs).join(",")}], history: ${historyRs(value.history)},
        streak: ${rn(value.streak)}, trainer_opponent_id: ${rn(value.trainerOpponentId)},
        battle_turn_count_present: ${value.battleTurnCountPresent}, battle_turn_count: ${rn(value.battleTurnCount)},
        legal_mask: ${value.legalMask}, seed: ${value.seed}, calls: ${value.calls}, turn_mode: ${value.turnMode},
        expected_hash: 0x${value.expected_hash.toString(16).padStart(16, "0")},
    },`);
}
lines.push("];", "");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
const rustfmt = execFileSync("rustup", ["which", "rustfmt"], { encoding: "utf8" }).trim();
execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
const digest = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-factory-ai-live-decision-bridge-vectors: wrote ${path.relative(workspace, outPath)}`);
console.log(`gen-factory-ai-live-decision-bridge-vectors: ${cases.length} cases; ${[...EXPECTED_CATEGORY_COUNTS].map(([k, v]) => `${k}=${v}`).join(", ")}`);
console.log(`gen-factory-ai-live-decision-bridge-vectors: sha256 ${digest}`);
