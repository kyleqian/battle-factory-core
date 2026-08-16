#!/usr/bin/env node
// Execute canonical TypeScript to generate the bounded differential corpus and
// normalized full-u16 arithmetic proof for Cmd_recoverbasedonsunlight.

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const outPath = path.join(workspaceRoot, "core-rs/crates/factory-core/src/battle_script_recoverbasedonsunlight_vectors_gen.rs");
const engine = path.join(workspaceRoot, "src/engine");
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(engine, "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(engine, "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(engine, "battleScriptRecoverbasedonsunlightOpcode.ts")).href),
  import(pathToFileURL(path.join(engine, "battleScriptRulesContext.ts")).href),
]);

const NAME = "B_SCR_OP_RECOVERBASEDONSUNLIGHT";
const DISPATCHER = "Cmd_recoverbasedonsunlight";
const FULL = "BattleScript_AlreadyAtFullHp";
const EFFECT_LABELS = ["BattleScript_EffectMorningSun", "BattleScript_EffectSynthesis", "BattleScript_EffectMoonlight"];
const ABILITIES = [13, 77];
const WEATHER = [0, 1, 0x20, 0x40, 0x60, 0x80, 0x21, 0xffff_ffff, 0x8000_0000];
const MAX_EDGES = [0, 1, 2, 3, 4, 29, 30, 31, 99, 100, 101, 255, 256, 257, 32767, 32768, 65534, 65535];
const DAMAGES = [-2147483648, -32768, -1, 0, 1, 32767, 2147483647];
const ROLES = [null, 0, 1, 2, 3];
const assert = (condition, message) => { if (!condition) throw new Error(`recoverbasedonsunlight generator: ${message}`); };
const program = programModule.loadBattleScriptProgram();
const found = program.instructions.filter((x) => x.opcodeName === NAME);
assert(found.length === 1, `expected one instruction, got ${found.length}`);
const canonical = found[0];
assert(canonical.opcodeId === 0xc0 && canonical.dispatcher === DISPATCHER, "dispatch identity drifted");
assert(canonical.operands.length === 1 && canonical.operands[0].widthBytes === 4 && canonical.operands[0].expression === FULL, "pointer macro drifted");
assert(canonical.source.statementLine === 1737 && canonical.source.invocationMacroLine === 994 && canonical.operands[0].sourceMacroLine === 996, "source site drifted");
const aliasPcs = EFFECT_LABELS.map((label) => programModule.resolveBattleScriptLabel(program, label)?.programCounter);
assert(aliasPcs.every((pc) => pc === 1184), "effect aliases drifted");
const failPc = programModule.resolveBattleScriptLabel(program, FULL)?.programCounter;
assert(failPc === 1424, "full-HP label drifted");
const handler = opcodeModule.createBattleScriptRecoverbasedonsunlightOpcodeHandlers(program)[0xc0];
assert(typeof handler === "function", "handler did not register");

function battler(index, ability, hp, maxHp, salt) {
  return Object.freeze({
    side: index & 1, ability, hp, maxHP: maxHp, item: (salt + index) & 0xffff,
    moves: Object.freeze([1 + index, 10 + index, 20 + index, 30 + index]),
    pp: Object.freeze([1, 2, 3, 4]), status1: (salt * 17 + index) >>> 0,
    status2: (salt * 19 + index) >>> 0, status3: (salt * 23 + index) >>> 0,
    substituteHP: salt & 0xff, rolloutTimer: salt & 0xf, furyCutterCounter: salt & 0xff,
    truantCounter: salt & 1, rechargeTimer: salt & 0xff, flinchImmobility: salt & 1,
    disabledMove: salt & 0xffff, usedDisabledMove: salt & 1, tauntTimer: salt & 0xf,
    usedTauntedMove: salt & 1, usedImprisonedMove: salt & 1,
    statStages: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]), types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1, attack: 100 + index, defense: 110 + index, spAttack: 120 + index,
    spDefense: 130 + index, speed: 140 + index, level: 50, friendship: 70,
    partyIndex: index, isFirstTurn: 0,
  });
}

function makeInput({ attacker = 0, target = 1, effect = 2, fainted = 3, hp = 40, maxHp = 101,
  weather = 0, prior = -1, battlersCount = 2, absent = 0, abilities = [1, 2, 3, 4], hpOverrides = {}, salt = 1 }) {
  const focus = attacker ?? 0;
  const battlers = [0, 1, 2, 3].map((index) => battler(index, abilities[index], hpOverrides[index] ?? (index === focus ? hp : 50 + index), index === focus ? maxHp : 100 + index, salt));
  const rules = rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(battlers),
    selectorRoles: Object.freeze({ attacker, target, effectBattler: effect, fainted }),
    scriptingBattler: 0, battlerWithAbility: 0, atkCancelerTracker: 0, battleOutcome: 0,
    battleMoveDamage: prior, weather, absentBattlerFlags: absent,
    currentMove: 105, currentMovePosition: 0, moveResultFlags: salt & 0xff,
    dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
    multiHitCounter: 0, multiHitStringCounter: 0, multistringChooser: 0,
    hitMarker: (salt * 31) >>> 0,
    sideStatuses: Object.freeze([(salt * 37) >>> 0, (salt * 41) >>> 0]), weatherTimer: salt & 0xff,
    battleTopology: Object.freeze({ battlersCount, battleTypeFlags: battlersCount === 4 ? 1 : 0,
      battlerPositions: Object.freeze(battlersCount === 4 ? [0, 1, 2, 3] : [0, 1, 0xff, 0xff]) }),
  });
  return rules;
}

function synthetic(expression = FULL, resolved = true, overrides = {}) {
  const operand = Object.freeze({ ...canonical.operands[0], widthBytes: overrides.width ?? 4, expression });
  return Object.freeze({ ...canonical, opcodeName: overrides.name ?? NAME, opcodeId: overrides.id ?? 0xc0,
    dispatcher: overrides.dispatcher ?? DISPATCHER, operands: Object.freeze(overrides.empty ? [] : [operand]),
    _resolved: resolved });
}

function project(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map((b) => Object.freeze({ ability: b.ability, hp: b.hp, maxHp: b.maxHP,
      status1: b.status1 >>> 0, status2: b.status2 >>> 0, status3: b.status3 >>> 0, item: b.item,
      moves: Object.freeze([...b.moves]) }))),
    attacker: rules.selectorRoles.attacker, target: rules.selectorRoles.target,
    effect: rules.selectorRoles.effectBattler, fainted: rules.selectorRoles.fainted,
    battlersCount: rules.battleTopology.battlersCount, absent: rules.absentBattlerFlags,
    weather: rules.weather >>> 0, weatherTimer: rules.weatherTimer, currentMove: rules.currentMove,
    moveResultFlags: rules.moveResultFlags >>> 0, hitMarker: rules.hitMarker >>> 0,
    sideStatuses: Object.freeze([...rules.sideStatuses]), damage: rules.battleMoveDamage,
  });
}

function execute(input, instruction = synthetic(), applications = 1) {
  const before = JSON.stringify(project(input));
  let current = input;
  const controls = [];
  try {
    for (let i = 0; i < applications; i += 1) {
      const state = machineModule.createBattleScriptMachine(program, EFFECT_LABELS[0], current, 0x12345678 + i);
      const transition = handler({ program, instruction, state });
      assert(transition.rng === state.rng && transition.scheduler === state.scheduler && transition.events.length === 0, "handler changed transport");
      controls.push(transition.control.kind === "jump" ? "jump" : "advance");
      current = transition.rulesContext;
    }
    assert(JSON.stringify(project(input)) === before, "handler mutated input");
    return { expected: project(current), controls, error: null };
  } catch (error) {
    assert(error instanceof Error, "non-Error throw");
    assert(JSON.stringify(project(input)) === before, "throwing handler mutated input");
    return { expected: null, controls, error: error.message };
  }
}

const cases = [];
function add(label, category, input, instruction = synthetic(), applications = 1) {
  const outcome = execute(input, instruction, applications);
  cases.push({ label, category, applications, initial: project(input), instruction: {
    name: instruction.opcodeName, id: instruction.opcodeId, dispatcher: instruction.dispatcher,
    widths: instruction.operands.map((x) => x.widthBytes), expressions: instruction.operands.map((x) => x.expression),
    resolved: instruction._resolved,
  }, ...outcome });
}

let salt = 100;
for (const attacker of [0, 1, 2, 3]) for (const target of ROLES) for (const effect of ROLES) for (const fainted of ROLES) {
  add(`selectors_a${attacker}_t${target ?? "n"}_e${effect ?? "n"}_f${fainted ?? "n"}`, "selector-alias-matrix",
    makeInput({ attacker, target, effect, fainted, salt: salt++ }));
}
for (const weather of WEATHER) add(`weather_${weather.toString(16)}`, "weather-u32-masks", makeInput({ weather, salt: salt++ }));
for (const ability of ABILITIES) for (const placement of [0, 1, 2, 3]) for (const battlersCount of [2, 4]) for (const alive of [false, true]) for (const absent of [0, 1 << placement]) {
  const abilities = [1, 2, 3, 4]; abilities[placement] = ability;
  const input = makeInput({ weather: 0x20, battlersCount, absent, abilities,
    hpOverrides: alive ? {} : { [placement]: 0 }, salt: salt++ });
  add(`ability_${ability}_p${placement}_c${battlersCount}_h${alive ? 1 : 0}_x${absent}`, "ability-placement-presence-absence", input);
}
for (const attacker of [0, 1, 2, 3]) for (const maxHp of MAX_EDGES) for (const [boundary, hp] of [["full", maxHp], ["lower", maxHp ? maxHp - 1 : 1], ["higher", maxHp < 65535 ? maxHp + 1 : 65534]]) {
  add(`hp_${boundary}_a${attacker}_m${maxHp}`, "hp-equality-boundaries", makeInput({ attacker, hp, maxHp, prior: DAMAGES[(attacker + maxHp) % DAMAGES.length], salt: salt++ }));
}
for (const prior of DAMAGES) {
  add(`prior_full_${prior < 0 ? "n" : "p"}${Math.abs(prior)}`, "prior-signed-damage", makeInput({ hp: 100, maxHp: 100, prior, salt: salt++ }));
  add(`prior_nonfull_${prior < 0 ? "n" : "p"}${Math.abs(prior)}`, "prior-signed-damage", makeInput({ hp: 99, maxHp: 100, prior, salt: salt++ }));
}
add("missing_attacker", "error-order", makeInput({ attacker: null, hp: 100, maxHp: 100 }), synthetic("BattleScript_RustUnresolved", false));
add("unresolved_full", "late-label-resolution", makeInput({ hp: 100, maxHp: 100, prior: 77 }), synthetic("BattleScript_RustUnresolved", false));
add("unresolved_nonfull", "late-label-resolution", makeInput({ hp: 99, maxHp: 100, prior: 77 }), synthetic("BattleScript_RustUnresolved", false));
add("repeat_advance", "repetitions", makeInput({ hp: 1, maxHp: 3 }), synthetic(), 2);
add("repeat_jump", "repetitions", makeInput({ hp: 3, maxHp: 3, prior: -99 }), synthetic(), 2);

function proof(hp, maxHp, weather, abilities, prior) {
  const outcome = execute(makeInput({ hp, maxHp, weather, abilities, prior, salt: 999 }));
  assert(outcome.error === null && outcome.expected !== null, `proof failed ${hp}/${maxHp}/${weather}`);
  return { control: outcome.controls[0], damage: outcome.expected.damage, target: outcome.expected.target };
}
const regimes = [
  ["neutral", 0, [1, 2, 3, 4]], ["sun", 0x20, [1, 2, 3, 4]],
  ["other", 1, [1, 2, 3, 4]], ["suppressed", 0x20, [13, 2, 3, 4]],
];
const proofIntervals = [];
const rawProof = [];
for (const [regime, weather, abilities] of regimes) {
  let current = null;
  for (let maxHp = 0; maxHp <= 65535; maxHp += 1) {
    const full = proof(maxHp, maxHp, weather, abilities, 123456789);
    const lower = maxHp === 0 ? null : proof(maxHp - 1, maxHp, weather, abilities, -2147483648);
    const higher = maxHp === 65535 ? null : proof(maxHp + 1, maxHp, weather, abilities, 2147483647);
    assert(full.control === "jump" && full.damage === 123456789 && full.target === 0, `full boundary drifted ${regime}/${maxHp}`);
    if (lower) assert(lower.control === "advance" && lower.target === 0, `lower boundary drifted ${regime}/${maxHp}`);
    if (higher) assert(higher.control === "advance" && higher.target === 0, `higher boundary drifted ${regime}/${maxHp}`);
    const damage = (lower ?? higher).damage;
    if (lower && higher) assert(lower.damage === higher.damage, `nonfull arithmetic split ${regime}/${maxHp}`);
    rawProof.push([regime, maxHp, full.damage, lower?.damage ?? null, higher?.damage ?? null]);
    if (current && current.end + 1 === maxHp && current.damage === damage) current.end = maxHp;
    else { current = { regime, start: maxHp, end: maxHp, damage }; proofIntervals.push(current); }
  }
}
const rawProofText = JSON.stringify(rawProof);

function registration(specs) {
  const instructions = specs.map((spec) => synthetic(FULL, true, spec));
  try {
    const handlers = opcodeModule.createBattleScriptRecoverbasedonsunlightOpcodeHandlers(Object.freeze({ ...program, instructions }));
    return { bindings: Object.keys(handlers).map(Number), error: null };
  } catch (error) { return { bindings: [], error: error.message }; }
}
const registrationCases = [
  { label: "canonical", specs: [{}] },
  { label: "missing", specs: [{ name: "B_SCR_OP_NOP" }] },
  { label: "duplicates_first_wins", specs: [{ id: 7 }, { id: 9 }] },
  { label: "malformed_selected_empty", specs: [{ id: 11, dispatcher: "wrong", empty: true }] },
  { label: "malformed_selected_pointer", specs: [{ id: 12, width: 9 }] },
].map((x) => ({ label: x.label, ...registration(x.specs) }));

const census = (values, key) => Object.entries(values.reduce((a, x) => { a[x[key]] = (a[x[key]] ?? 0) + 1; return a; }, {})).sort();
const metadata = { opcode: canonical.opcodeId, dispatcher: canonical.dispatcher, instructionPc: canonical.programCounter,
  statementLine: canonical.source.statementLine, invocationMacroLine: canonical.source.invocationMacroLine,
  pointerMacroLine: canonical.operands[0].sourceMacroLine, pointerWidth: canonical.operands[0].widthBytes,
  encodedWidth: 5, effectAliasPcs: aliasPcs, failPc };
const corpus = { metadata, domainCensus: [["u16-max-hp", 65536], ["arithmetic-regimes", 4],
  ["full-lower-higher-handler-applications", 786424],
  ["selector-alias-matrix", 500], ["weather-mask-values", WEATHER.length], ["ability-placement-cases", 64],
  ["registration-cases", registrationCases.length]], categoryCensus: census(cases, "category"), cases, registrationCases,
  proofIntervals, rawProofSha256: crypto.createHash("sha256").update(rawProofText).digest("hex"), rawProofBytes: Buffer.byteLength(rawProofText) };
const corpusText = JSON.stringify(corpus);
const s = JSON.stringify;
const opt = (x) => x === null ? "None" : `Some(BattleScriptRecoverbasedonsunlightBattler::Battler${x})`;
const state = (x) => `BattleScriptRecoverbasedonsunlightVectorState { battlers: [${x.battlers.map((b) => `BattleScriptRecoverbasedonsunlightVectorBattler { ability: ${b.ability}, hp: ${b.hp}, max_hp: ${b.maxHp}, status1: ${b.status1}, status2: ${b.status2}, status3: ${b.status3}, item: ${b.item}, moves: [${b.moves.join(",")}] }`).join(",")}], attacker: ${opt(x.attacker)}, target: ${opt(x.target)}, effect_battler: ${opt(x.effect)}, fainted: ${opt(x.fainted)}, battlers_count: ${x.battlersCount}, absent_battler_flags: ${x.absent}, weather: ${x.weather}, weather_timer: ${x.weatherTimer}, current_move: ${x.currentMove}, move_result_flags: ${x.moveResultFlags}, hit_marker: ${x.hitMarker}, side_statuses: [${x.sideStatuses.join(",")}], battle_move_damage: ${x.damage === -2147483648 ? "i32::MIN" : x.damage === 2147483647 ? "i32::MAX" : x.damage} }`;
const lines = [
  "// GENERATED by gen-battle-script-recoverbasedonsunlight-vectors.mjs; do not edit.",
  "use crate::battle_script_recoverbasedonsunlight::{BattleScriptRecoverbasedonsunlightBattler, BattleScriptRecoverbasedonsunlightControl};",
  `pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_VECTOR_CORPUS_SHA256: &str = ${s(crypto.createHash("sha256").update(corpusText).digest("hex"))};`,
  `pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`,
  `pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_RAW_PROOF_SHA256: &str = ${s(corpus.rawProofSha256)};`,
  `pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_RAW_PROOF_BYTES: usize = ${corpus.rawProofBytes};`,
  `pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_METADATA: (u8,&str,u32,u32,u32,u32,u8,u8,[u32;3],u32) = (${metadata.opcode},${s(metadata.dispatcher)},${metadata.instructionPc},${metadata.statementLine},${metadata.invocationMacroLine},${metadata.pointerMacroLine},${metadata.pointerWidth},${metadata.encodedWidth},[${metadata.effectAliasPcs.join(",")}],${metadata.failPc});`,
  "#[derive(Debug,Clone,Copy,PartialEq,Eq)] pub struct BattleScriptRecoverbasedonsunlightVectorBattler { pub ability:u8,pub hp:u16,pub max_hp:u16,pub status1:u32,pub status2:u32,pub status3:u32,pub item:u16,pub moves:[u16;4] }",
  "#[derive(Debug,Clone,Copy,PartialEq,Eq)] pub struct BattleScriptRecoverbasedonsunlightVectorState { pub battlers:[BattleScriptRecoverbasedonsunlightVectorBattler;4],pub attacker:Option<BattleScriptRecoverbasedonsunlightBattler>,pub target:Option<BattleScriptRecoverbasedonsunlightBattler>,pub effect_battler:Option<BattleScriptRecoverbasedonsunlightBattler>,pub fainted:Option<BattleScriptRecoverbasedonsunlightBattler>,pub battlers_count:u8,pub absent_battler_flags:u8,pub weather:u32,pub weather_timer:u8,pub current_move:u16,pub move_result_flags:u32,pub hit_marker:u32,pub side_statuses:[u32;2],pub battle_move_damage:i32 }",
  "#[derive(Debug,Clone,Copy,PartialEq,Eq)] pub struct BattleScriptRecoverbasedonsunlightVectorCase { pub label:&'static str,pub category:&'static str,pub applications:u8,pub operand_widths:&'static [u8],pub operand_expressions:&'static [&'static str],pub resolved:bool,pub initial:BattleScriptRecoverbasedonsunlightVectorState,pub expected:Option<BattleScriptRecoverbasedonsunlightVectorState>,pub controls:&'static [BattleScriptRecoverbasedonsunlightControl],pub expected_error:Option<&'static str> }",
  `pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_DOMAIN_CENSUS:[(&str,u64);${corpus.domainCensus.length}]=[${corpus.domainCensus.map(([k,v])=>`(${s(k)},${v})`).join(",")}];`,
  `pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_CATEGORY_CENSUS:[(&str,usize);${corpus.categoryCensus.length}]=[${corpus.categoryCensus.map(([k,v])=>`(${s(k)},${v})`).join(",")}];`,
  `pub static BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_PROOFS:[(&str,u16,u16,i32);${proofIntervals.length}]=[${proofIntervals.map((x)=>`(${s(x.regime)},${x.start},${x.end},${x.damage})`).join(",")}];`,
  `pub static BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_CASES:[BattleScriptRecoverbasedonsunlightVectorCase;${cases.length}]=[`,
];
for (const x of cases) lines.push(`BattleScriptRecoverbasedonsunlightVectorCase { label:${s(x.label)},category:${s(x.category)},applications:${x.applications},operand_widths:&[${x.instruction.widths.join(",")}],operand_expressions:&[${x.instruction.expressions.map(s).join(",")}],resolved:${x.instruction.resolved},initial:${state(x.initial)},expected:${x.expected ? `Some(${state(x.expected)})` : "None"},controls:&[${x.controls.map((c)=>c === "jump" ? "BattleScriptRecoverbasedonsunlightControl::FailJump" : "BattleScriptRecoverbasedonsunlightControl::Advance").join(",")}],expected_error:${x.error ? `Some(${s(x.error)})` : "None"} },`);
lines.push("];", `pub const BATTLE_SCRIPT_RECOVERBASEDONSUNLIGHT_REGISTRATION_CASES:[(&str,&[u8],Option<&str>);${registrationCases.length}]=[${registrationCases.map((x)=>`(${s(x.label)},&[${x.bindings.join(",")}],${x.error ? `Some(${s(x.error)})` : "None"})`).join(",")}];`);
fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
execFileSync("/Users/kyle/.rustup/toolchains/stable-aarch64-apple-darwin/bin/rustfmt", ["--edition", "2021", outPath]);
const generated = fs.readFileSync(outPath);
console.log(`cases=${cases.length} intervals=${proofIntervals.length} corpus=${corpus.VECTOR_CORPUS_SHA256 ?? crypto.createHash("sha256").update(corpusText).digest("hex")} bytes=${Buffer.byteLength(corpusText)}`);
console.log(`rawProof=${corpus.rawProofSha256} bytes=${corpus.rawProofBytes}`);
console.log(`generated=${crypto.createHash("sha256").update(generated).digest("hex")} bytes=${generated.length}`);
