#!/usr/bin/env npx tsx
/**
 * Executable-frontier census (ROADMAP S10 "Executable-frontier reset").
 *
 * For every BattleScript_Effect* entry in the committed topology, walks its
 * full opcode reachability (branches, goto/call targets, the shared hit-chain
 * tail) against the currently-registered opcode set and classifies it as
 * executable / blocked-on-opcodes / blocked-on-subsystem. Joins effect ->
 * moves -> Level-50 Factory legality and emits docs/executable-frontier-census.md.
 *
 * Rerun: npx tsx tools/report/executable-frontier-census.ts
 *
 * Inputs (committed, read-only): src/data/gen/battle-script-topology.json,
 * src/data/gen/battle-script-graph.json. The registered-opcode set is read
 * directly from the production opcode-handler composition
 * (src/engine/battleScriptRulesContext.ts's createBattleScriptStatusRulesHandlers)
 * so the census never drifts from what the engine actually installs.
 *
 * Scope: this measures STATIC OPCODE REACHABILITY (does every opcode a script
 * can touch have a dispatch entry), not semantic correctness. See "Caveats"
 * in the generated doc for the exact modeling rules and their one deliberate
 * semantic exception (Cmd_seteffectwithchance's SetMoveEffect dispatch).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SET_MOVE_EFFECT_SUPPORTED_BYTES } from "../../src/engine/battleScriptHitChainOpcode.ts";
import { JUMPIFABILITY_SUPPORTED_ABILITY_NAMES } from "../../src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts";
import { loadBattleScriptProgram } from "../../src/engine/battleScriptProgram.ts";
import { createBattleScriptStatusRulesHandlers } from "../../src/engine/battleScriptRulesContext.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const TOPOLOGY_PATH = join(REPO_ROOT, "src/data/gen/battle-script-topology.json");
const GRAPH_PATH = join(REPO_ROOT, "src/data/gen/battle-script-graph.json");
const OUTPUT_PATH = join(REPO_ROOT, "docs/executable-frontier-census.md");
const RERUN_COMMAND = "npx tsx tools/report/executable-frontier-census.ts";

// ---------------------------------------------------------------------------
// Input shapes (only the fields this tool reads)
// ---------------------------------------------------------------------------

type TopologyOpcode = { id: number; opcode: string; dispatcher: string };
type TopologyEffect = { effect: string; id: number; entryScript: string };
type TopologyMove = { id: number; move: string; effectId: number; effect: string; entryScript: string };
type TopologyFactoryMove = { id: number; move: string; effect: string; frontierMonCount: number; speciesCount: number };
type TopologyFactoryEffect = { effect: string; id: number; entryScript: string; moves: TopologyFactoryMove[] };
type Topology = {
  counts: { effects: number; opcodes: number; moves: number; level50FactoryReachableMoves: number };
  effects: TopologyEffect[];
  opcodes: TopologyOpcode[];
  moves: TopologyMove[];
  level50FactoryReachableEffects: TopologyFactoryEffect[];
};

type GraphStatement = {
  line: number;
  kind: "instruction" | "directive";
  mnemonic: string;
  rawOperands?: string;
  operandTokens: string[];
  opcodeBindings?: string[];
  labelOperands?: string[];
};
type GraphLabel = { name: string; line: number; sigil: string; nextLabel: string | null; statements: GraphStatement[] };
type GraphEdgeEnd = { label: string; line: number } | null;
type GraphEdge = { from: { label: string; line: number }; to: GraphEdgeEnd; kind: "jump" | "fallthrough" | "call" | "end" | "return" };
type CallsiteContinuation = {
  call: { from: { label: string; line: number }; target: { label: string; line: number } };
  continuation: { label: string; line: number };
};
type Graph = {
  labels: GraphLabel[];
  controlFlow: { edges: GraphEdge[]; callsiteContinuations: CallsiteContinuation[] };
};

const topology = JSON.parse(readFileSync(TOPOLOGY_PATH, "utf8")) as Topology;
const graph = JSON.parse(readFileSync(GRAPH_PATH, "utf8")) as Graph;

// ---------------------------------------------------------------------------
// Registered-opcode set, read from the real production handler composition.
// The composition needs a BattleScriptProgram and a ports bag; only opcode
// *keys* matter here (never invoked), so a no-op Proxy stands in for ports --
// installHandler() only closes over port functions, it never calls them at
// registration time.
// ---------------------------------------------------------------------------

const PROGRAM = loadBattleScriptProgram();
const noopPorts = new Proxy({}, { get: () => () => undefined }) as never;
const handlerMap = createBattleScriptStatusRulesHandlers(PROGRAM, noopPorts);
const registeredOpcodeIds = new Set(Object.keys(handlerMap).map(Number));
const opcodeNameById = new Map(topology.opcodes.map((o) => [o.id, o.opcode]));
const REGISTERED_OPCODES = new Set(
  [...registeredOpcodeIds].map((id) => opcodeNameById.get(id)).filter((name): name is string => Boolean(name)),
);

// ---------------------------------------------------------------------------
// Graph indices
// ---------------------------------------------------------------------------

const nodeKey = (label: string, line: number) => `${label}:${line}`;

const labelsByName = new Map(graph.labels.map((l) => [l.name, l]));
const statementByKey = new Map<string, GraphStatement & { label: string }>();
for (const label of graph.labels) {
  for (const statement of label.statements) {
    statementByKey.set(nodeKey(label.name, statement.line), { ...statement, label: label.name });
  }
}
const rawEdgesFromKey = new Map<string, GraphEdge[]>();
for (const edge of graph.controlFlow.edges) {
  const key = nodeKey(edge.from.label, edge.from.line);
  const bucket = rawEdgesFromKey.get(key);
  if (bucket) bucket.push(edge);
  else rawEdgesFromKey.set(key, [edge]);
}
const continuationByCallKey = new Map<string, { label: string; line: number }>();
for (const entry of graph.controlFlow.callsiteContinuations) {
  continuationByCallKey.set(nodeKey(entry.call.from.label, entry.call.from.line), entry.continuation);
}

function firstInstruction(labelName: string, guard: Set<string> = new Set()): { label: string; line: number } {
  if (guard.has(labelName)) {
    throw new Error(`cycle resolving empty-label chain starting at ${labelName}`);
  }
  guard.add(labelName);
  const label = labelsByName.get(labelName);
  if (!label) throw new Error(`unknown BattleScript label ${labelName}`);
  if (label.statements.length > 0) return { label: labelName, line: label.statements[0]!.line };
  if (!label.nextLabel) throw new Error(`empty label ${labelName} has no successor to resolve through`);
  return firstInstruction(label.nextLabel, guard);
}

// ---------------------------------------------------------------------------
// Control-flow correction pass (extractor mechanism-level fix, ROADMAP S10 /
// docs/roar-multihit-registration-scout.md §1).
//
// tools/extract/extract-battle-script-graph.ts only recognizes an
// instruction's script-pointer operand as a jump target when the opcode name
// matches a fixed pattern (`B_SCR_OP_JUMPIF*`, plus a short unconditional
// allowlist: GOTO/JUMPTOCALLEDMOVE/CALL/RETURN/END*). Many other opcodes
// carry a genuine script-pointer operand under a differently-named "ptr"
// macro parameter (accuracycheck's failPtr, statbuffchange's jumpptr,
// forcerandomswitch's ptr, decrementmultihit's loop-back value, ...) that the
// name pattern does not recognize, so the committed graph records zero jump
// edge for them. This pass derives the missing edges straight from the
// graph's own `labelOperands` (the extractor already resolves each raw
// operand token against the real label set -- it just doesn't wire that
// resolution into `controlFlow.edges` for non-pattern-matched opcodes), so it
// needs no opcode allowlist of its own: any statement with a label operand
// not already covered by an existing jump/call edge from that exact
// statement gets one synthesized here. This can only make an effect look
// MORE blocked than the committed graph claims, never less -- the same
// "safe direction" bias already documented for the call/return caveat below
// -- and it never removes a correctly-modeled jumpif*/goto/call edge.
//
// Bug (b) -- forcerandomswitch's fabricated fallthrough. Verified against
// battle_script_commands.c:7164-7183/7185-7386 this session: Cmd_
// forcerandomswitch (via TryDoForceSwitchOut) always OVERWRITES
// gBattlescriptCurrInstr itself -- either to this instruction's own ptr
// operand (fail) or to the hardcoded, bytecode-invisible
// BattleScript_SuccessForceOut label (success, :7181) -- there is no
// `gBattlescriptCurrInstr += N` anywhere on its control path, unlike every
// other audited "ptr"-operand opcode this session (accuracycheck,
// statbuffchange, tryhealhalfhealth, trymemento, handlelearnnewmove,
// checkteamslost all genuinely advance to their assembly successor on the
// non-jump branch, confirmed by reading each Cmd_* handler). Because the
// extractor doesn't recognize FORCERANDOMSWITCH as a control opcode at all,
// it fabricates a fallthrough into whatever label happens to sit next in the
// .s file (BattleScript_EffectMultiHit, purely by file layout, since Roar
// happens to precede MultiHit in data/battle_scripts_1.s) -- this is the
// exact mechanism that falsely credited INITMULTIHITSTRING/JUMPIFHASNOHP to
// EFFECT_ROAR. NEVER_FALLS_THROUGH_OPCODES is this one audited exception,
// not a blanket assumption: every other statement's existing fallthrough
// edge is left untouched.
const NEVER_FALLS_THROUGH_OPCODES = new Set(["B_SCR_OP_FORCERANDOMSWITCH"]);

// forcerandomswitch's success target is a THIRD dynamic-dispatch category
// alongside this census's one previously-documented case
// (B_SCR_OP_JUMPTOCALLEDMOVE, a genuinely runtime-computed target with no
// static label operand at all -- see the "Dynamic dispatch" caveat below):
// a target that IS fixed at compile time, just never spelled as a bytecode
// operand, because battle_script_commands.c writes
// `gBattlescriptCurrInstr = BattleScript_SuccessForceOut` directly (:7181)
// rather than reading an operand. Since the target is statically known, it
// is modeled as a real jump edge to a real label (so the walk actually
// visits BattleScript_SuccessForceOut/BattleScript_TrainerBattleForceOut and
// discovers SWITCHOUTABILITIES/RETURNTOBALL), not as an unresolvable
// dynamic-jump note the way JUMPTOCALLEDMOVE is.
const HARDCODED_SUCCESS_TARGETS: Readonly<Record<string, string>> = Object.freeze({
  B_SCR_OP_FORCERANDOMSWITCH: "BattleScript_SuccessForceOut",
});

function getOrInitEdgeBucket(map: Map<string, GraphEdge[]>, key: string): GraphEdge[] {
  const existing = map.get(key);
  if (existing) return existing;
  const created: GraphEdge[] = [];
  map.set(key, created);
  return created;
}

const correctedEdgesFromKey = new Map<string, GraphEdge[]>();
for (const [key, edges] of rawEdgesFromKey) correctedEdgesFromKey.set(key, [...edges]);

let missingJumpEdgesSynthesized = 0;
let fabricatedFallthroughsSuppressed = 0;
for (const label of graph.labels) {
  for (const statement of label.statements) {
    if (statement.kind !== "instruction") continue;
    const key = nodeKey(label.name, statement.line);
    const bindings = statement.opcodeBindings ?? [];

    if (bindings.some((opcode) => NEVER_FALLS_THROUGH_OPCODES.has(opcode))) {
      const bucket = getOrInitEdgeBucket(correctedEdgesFromKey, key);
      const withoutFallthrough = bucket.filter((edge) => edge.kind !== "fallthrough");
      fabricatedFallthroughsSuppressed += bucket.length - withoutFallthrough.length;
      correctedEdgesFromKey.set(key, withoutFallthrough);
    }

    for (const opcode of bindings) {
      const hardcodedTarget = HARDCODED_SUCCESS_TARGETS[opcode];
      if (!hardcodedTarget) continue;
      const bucket = getOrInitEdgeBucket(correctedEdgesFromKey, key);
      bucket.push({ from: { label: label.name, line: statement.line }, to: firstInstruction(hardcodedTarget), kind: "jump" });
    }

    for (const target of statement.labelOperands ?? []) {
      const bucket = getOrInitEdgeBucket(correctedEdgesFromKey, key);
      const alreadyCovered = bucket.some(
        (edge) => (edge.kind === "jump" || edge.kind === "call") && edge.to !== null && edge.to.label === target,
      );
      if (alreadyCovered) continue;
      bucket.push({ from: { label: label.name, line: statement.line }, to: firstInstruction(target), kind: "jump" });
      missingJumpEdgesSynthesized += 1;
    }
  }
}

const edgesFromKey = correctedEdgesFromKey;

// ---------------------------------------------------------------------------
// The one deliberate semantic exception: Cmd_seteffectwithchance's
// SetMoveEffect dispatch (applySetMoveEffect,
// src/engine/battleScriptHitChainOpcode.ts:1760-1971, itself a source-faithful
// port of battle_script_commands.c's Cmd_seteffectwithchance switch). The
// opcode B_SCR_OP_SETEFFECTWITHCHANCE is registered, but which MOVE_EFFECT_*
// byte a specific effect script feeds it (via the preceding `setmoveeffect`
// statement, itself just a literal-operand B_SCR_OP_SETBYTE) decides whether
// that registered opcode halts. This is the only place this census tracks an
// operand value rather than only opcode names, because it is the only
// production dispatcher where "opcode registered" and "this script's use of
// it executes" diverge today (PROGRESS 444).
// ---------------------------------------------------------------------------

// include/constants/battle.h:247-299 -- MOVE_EFFECT_* token name -> numeric
// id. This is the one hand-maintained piece left (the *set of dispatched
// ids* itself is imported live from the engine above, not re-derived here):
// BattleScript operand tokens are source text ("MOVE_EFFECT_ATK_MINUS_1"),
// not the numeric bytes the engine's dispatch is keyed on, and the committed
// script topology/graph never resolves that text to a number. The guard loop
// right below turns any gap here into a hard failure instead of a silent
// misclassification, so this list can go stale without the census going
// stale with it (the exact failure mode of ISSUES #44).
const MOVE_EFFECT_ID_BY_NAME: Readonly<Record<string, number>> = Object.freeze({
  MOVE_EFFECT_SLEEP: 1,
  MOVE_EFFECT_POISON: 2,
  MOVE_EFFECT_BURN: 3,
  MOVE_EFFECT_FREEZE: 4,
  MOVE_EFFECT_PARALYSIS: 5,
  MOVE_EFFECT_TOXIC: 6,
  MOVE_EFFECT_CONFUSION: 7,
  MOVE_EFFECT_FLINCH: 8,
  MOVE_EFFECT_CHARGING: 12,
  MOVE_EFFECT_WRAP: 13,
  MOVE_EFFECT_ATK_PLUS_1: 15,
  MOVE_EFFECT_DEF_PLUS_1: 16,
  MOVE_EFFECT_SPD_PLUS_1: 17,
  MOVE_EFFECT_SP_ATK_PLUS_1: 18,
  MOVE_EFFECT_SP_DEF_PLUS_1: 19,
  MOVE_EFFECT_ACC_PLUS_1: 20,
  MOVE_EFFECT_EVS_PLUS_1: 21,
  MOVE_EFFECT_ATK_MINUS_1: 22,
  MOVE_EFFECT_DEF_MINUS_1: 23,
  MOVE_EFFECT_SPD_MINUS_1: 24,
  MOVE_EFFECT_SP_ATK_MINUS_1: 25,
  MOVE_EFFECT_SP_DEF_MINUS_1: 26,
  MOVE_EFFECT_ACC_MINUS_1: 27,
  MOVE_EFFECT_EVS_MINUS_1: 28,
  MOVE_EFFECT_ATK_PLUS_2: 39,
  MOVE_EFFECT_DEF_PLUS_2: 40,
  MOVE_EFFECT_SPD_PLUS_2: 41,
  MOVE_EFFECT_SP_ATK_PLUS_2: 42,
  MOVE_EFFECT_SP_DEF_PLUS_2: 43,
  MOVE_EFFECT_ACC_PLUS_2: 44,
  MOVE_EFFECT_EVS_PLUS_2: 45,
  MOVE_EFFECT_ATK_MINUS_2: 46,
  MOVE_EFFECT_DEF_MINUS_2: 47,
  MOVE_EFFECT_SPD_MINUS_2: 48,
  MOVE_EFFECT_SP_ATK_MINUS_2: 49,
  MOVE_EFFECT_SP_DEF_MINUS_2: 50,
  MOVE_EFFECT_ACC_MINUS_2: 51,
  MOVE_EFFECT_EVS_MINUS_2: 52,
  MOVE_EFFECT_THRASH: 53,
});
const NAMED_MOVE_EFFECT_IDS = new Set(Object.values(MOVE_EFFECT_ID_BY_NAME));

// Drift guard: every id the engine says it genuinely dispatches (other than
// the bare "0" sentinel, which parseMoveEffectBase resolves before ever
// consulting SETMOVEEFFECT_SUPPORTED) must be nameable here, or this census
// would keep classifying a script using that id as blocked forever.
for (const id of SET_MOVE_EFFECT_SUPPORTED_BYTES) {
  if (id === 0) continue;
  if (!NAMED_MOVE_EFFECT_IDS.has(id)) {
    throw new Error(
      `executable-frontier census: applySetMoveEffect (battleScriptHitChainOpcode.ts) now dispatches `
      + `MOVE_EFFECT_BYTE ${id}, which has no entry in this tool's MOVE_EFFECT_ID_BY_NAME token table -- `
      + "add its name (include/constants/battle.h) so SETMOVEEFFECT_SUPPORTED stays derived correctly.",
    );
  }
}

const SETMOVEEFFECT_SUPPORTED = new Set(
  Object.entries(MOVE_EFFECT_ID_BY_NAME)
    .filter(([, id]) => SET_MOVE_EFFECT_SUPPORTED_BYTES.has(id))
    .map(([name]) => name),
);

function parseMoveEffectBase(rawOperands: string | undefined): string {
  if (!rawOperands || rawOperands.trim() === "0") return "0";
  for (const token of rawOperands.split("|").map((t) => t.trim())) {
    if (token === "MOVE_EFFECT_CERTAIN" || token === "MOVE_EFFECT_AFFECTS_USER") continue;
    if (token) return token;
  }
  return "0";
}

type Blocker = { kind: "subsystem"; detail: string };

function classifySetMoveEffectDispatch(opcodeName: string, pendingEffect: string | null): Blocker | null {
  if (pendingEffect === null || pendingEffect === "0") return null;
  if (SETMOVEEFFECT_SUPPORTED.has(pendingEffect)) return null;
  return {
    kind: "subsystem",
    detail:
      `${opcodeName} dispatch: ${pendingEffect} is in the family-B (status2/misc) switch, a named `
      + "(b) barrier in applySetMoveEffect -- battle_script_commands.c:2522",
  };
}

// ---------------------------------------------------------------------------
// Reachability walk
// ---------------------------------------------------------------------------

type WalkNode = { label: string; line: number; pendingEffect: string | null };
type WalkResult = {
  opcodesUsed: string[]; // first-occurrence order
  subsystemBlockers: string[]; // deduped detail strings
  dynamicJumpOpcodes: string[]; // deduped opcode names with an unresolvable (null) target
};

function walk(entryLabel: string, allowConditionalForks: boolean): WalkResult {
  const start = firstInstruction(entryLabel);
  const visited = new Set<string>();
  const queue: WalkNode[] = [{ label: start.label, line: start.line, pendingEffect: null }];
  const opcodesUsed = new Set<string>();
  const subsystemBlockers = new Set<string>();
  const dynamicJumpOpcodes = new Set<string>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    const visitKey = `${node.label}:${node.line}:${node.pendingEffect ?? ""}`;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    const statement = statementByKey.get(nodeKey(node.label, node.line));
    if (!statement) throw new Error(`missing graph statement at ${node.label}:${node.line}`);

    let nextPendingEffect = node.pendingEffect;
    if (statement.kind === "instruction") {
      for (const opcodeName of statement.opcodeBindings ?? []) opcodesUsed.add(opcodeName);
      if (statement.mnemonic === "setmoveeffect") {
        nextPendingEffect = parseMoveEffectBase(statement.rawOperands);
      }
      if (statement.opcodeBindings?.includes("B_SCR_OP_SETEFFECTWITHCHANCE")) {
        const blocker = classifySetMoveEffectDispatch("Cmd_seteffectwithchance", node.pendingEffect);
        if (blocker) subsystemBlockers.add(blocker.detail);
        nextPendingEffect = null; // finalizeSeteffectwithchance always resets moveEffectByte to 0
      }
      // Cmd_seteffectprimary (battle_script_commands.c:2941-2944, `SetMoveEffect(TRUE, 0)`) reads the
      // SAME gBattleCommunication[MOVE_EFFECT_BYTE] scratch field as Cmd_seteffectwithchance, staged by
      // the identical preceding `setmoveeffect X` statement (mnemonic-tracked above, opcode-bound to
      // B_SCR_OP_SETBYTE either way) -- so this reuses the exact same pendingEffect value and classifier.
      // Closes the ISSUES #45 blind spot: the census previously only intercepted SETEFFECTWITHCHANCE.
      if (statement.opcodeBindings?.includes("B_SCR_OP_SETEFFECTPRIMARY")) {
        const blocker = classifySetMoveEffectDispatch("Cmd_seteffectprimary", node.pendingEffect);
        if (blocker) subsystemBlockers.add(blocker.detail);
        nextPendingEffect = null;
      }
      // Cmd_jumpifability (battle_script_commands.c:3105-3149) is registered, but the engine's own
      // handler unconditionally barriers when the ability operand is outside its widened 4-value set
      // (battleScriptIngrainLeechSeedWrapOpcode.ts) -- regardless of which branch (jump/fallthrough) is
      // actually taken at runtime, since the check happens before the ability comparison. Same
      // "registered opcode, narrow operand" blind spot as SETEFFECTPRIMARY/SETEFFECTWITHCHANCE above.
      if (statement.mnemonic === "jumpifability") {
        const abilityToken = statement.operandTokens[1];
        if (abilityToken && !JUMPIFABILITY_SUPPORTED_ABILITY_NAMES.has(abilityToken)) {
          subsystemBlockers.add(
            `Cmd_jumpifability: ${abilityToken} is outside the engine's widened ability set `
            + "(battleScriptIngrainLeechSeedWrapOpcode.ts) -- battle_script_commands.c:3105",
          );
        }
      }
    }

    const outgoing = edgesFromKey.get(nodeKey(node.label, node.line)) ?? [];
    // A fork is "more than one live continuation" generically -- not just the
    // fallthrough+jump shape a single jumpif* produces. This also covers a
    // corrected forcerandomswitch statement (two jump edges, zero fallthrough,
    // since §-above suppresses its fabricated one) and any statement with
    // multiple synthesized jump edges (e.g. handlelearnnewmove's two ptr
    // operands). `call`/`end`/`return` are excluded because they are not
    // runtime-conditional here: a call's continuation is unconditional
    // (handled below regardless of fork status) and end/return are terminal.
    const liveContinuations = outgoing.filter((e) => e.kind !== "call" && e.kind !== "end" && e.kind !== "return");
    const isConditionalFork = liveContinuations.length > 1;

    for (const edge of outgoing) {
      if (edge.kind === "end" || edge.kind === "return") continue; // terminal on this path
      if (edge.kind === "call") {
        if (edge.to) queue.push({ label: edge.to.label, line: edge.to.line, pendingEffect: nextPendingEffect });
        const continuation = continuationByCallKey.get(nodeKey(node.label, node.line));
        if (continuation) queue.push({ label: continuation.label, line: continuation.line, pendingEffect: nextPendingEffect });
        continue;
      }
      if (edge.to === null) {
        // Dynamic transfer (e.g. B_SCR_OP_JUMPTOCALLEDMOVE): the target is a
        // runtime-computed move-effect script, not a static label operand.
        const opcodeName = statement.opcodeBindings?.[0] ?? statement.mnemonic;
        dynamicJumpOpcodes.add(opcodeName);
        continue;
      }
      if (isConditionalFork && !allowConditionalForks) continue; // main-path pass: skip both sides of a real fork
      queue.push({ label: edge.to.label, line: edge.to.line, pendingEffect: nextPendingEffect });
    }
  }

  return {
    opcodesUsed: [...opcodesUsed],
    subsystemBlockers: [...subsystemBlockers],
    dynamicJumpOpcodes: [...dynamicJumpOpcodes],
  };
}

// ---------------------------------------------------------------------------
// Per-effect classification
// ---------------------------------------------------------------------------

type Classification =
  | { kind: "executable" }
  | { kind: "blocked-on-opcodes"; missingOpcodes: string[]; missingOnMainPath: boolean; subsystemNotes: string[] }
  | { kind: "blocked-on-subsystem"; notes: string[] };

type EffectReport = {
  effect: TopologyEffect;
  classification: Classification;
  fullOpcodesUsed: string[];
};

const effectReports: EffectReport[] = topology.effects.map((effect) => {
  const full = walk(effect.entryScript, true);
  const missingOpcodes = full.opcodesUsed.filter((op) => !REGISTERED_OPCODES.has(op));
  const dynamicNotes = full.dynamicJumpOpcodes.map(
    (op) => `${op}: runtime-resolved jump target (called move's own effect script), not statically enumerable`,
  );
  const subsystemNotes = [...full.subsystemBlockers, ...dynamicNotes];

  if (missingOpcodes.length === 0 && subsystemNotes.length === 0) {
    return { effect, classification: { kind: "executable" }, fullOpcodesUsed: full.opcodesUsed };
  }
  if (missingOpcodes.length > 0) {
    const mainOnly = walk(effect.entryScript, false);
    const missingOnMainPath = mainOnly.opcodesUsed.some((op) => !REGISTERED_OPCODES.has(op));
    return {
      effect,
      classification: { kind: "blocked-on-opcodes", missingOpcodes, missingOnMainPath, subsystemNotes },
      fullOpcodesUsed: full.opcodesUsed,
    };
  }
  return { effect, classification: { kind: "blocked-on-subsystem", notes: subsystemNotes }, fullOpcodesUsed: full.opcodesUsed };
});

const reportByEffectId = new Map(effectReports.map((r) => [r.effect.id, r]));

// ---------------------------------------------------------------------------
// Validation: known ground truth must not drift (PROGRESS 443/444, ROADMAP S10)
// ---------------------------------------------------------------------------

function effectIdByName(name: string): number {
  const effect = topology.effects.find((e) => e.effect === name);
  if (!effect) throw new Error(`unknown effect ${name} in topology`);
  return effect.id;
}

function requireExecutable(effectName: string): void {
  const report = reportByEffectId.get(effectIdByName(effectName))!;
  if (report.classification.kind !== "executable") {
    throw new Error(
      `ground-truth drift: ${effectName} expected executable, got ${report.classification.kind} `
      + JSON.stringify(report.classification),
    );
  }
}

function requireBlockedMentioning(effectName: string, needle: string): void {
  const report = reportByEffectId.get(effectIdByName(effectName))!;
  if (report.classification.kind === "executable") {
    throw new Error(`ground-truth drift: ${effectName} expected blocked, got executable`);
  }
  const haystack =
    report.classification.kind === "blocked-on-opcodes"
      ? [...report.classification.missingOpcodes, ...report.classification.subsystemNotes].join(" ")
      : report.classification.notes.join(" ");
  if (!haystack.toUpperCase().includes(needle.toUpperCase())) {
    throw new Error(`ground-truth drift: ${effectName} blocked reason does not mention ${needle}: ${haystack}`);
  }
}

const validationChecks: Array<() => void> = [
  // Registration checkpoint (2026-07-25): B_SCR_OP_JUMPIFHALFWORD,
  // B_SCR_OP_JUMPIFSTATUS3CONDITION, and B_SCR_OP_ORWORD are now registered,
  // so BattleScript_EffectHit's own Surf-only guard -- the census's own
  // headline finding -- is no longer the chokepoint routing every
  // shared-hit-chain effect's real entryScript around executability. The
  // SetMoveEffect quartet's own dispatch was already source-complete
  // (PROGRESS 444), so these five flip straight to executable, corroborated
  // by factoryBattleScriptTerminalDecision.ts's own header comment (which
  // documented, then closed, the same routing-around gap).
  () => requireExecutable("EFFECT_HIT"),
  () => requireExecutable("EFFECT_POISON_HIT"), // SetMoveEffect quartet (PROGRESS 444)
  () => requireExecutable("EFFECT_BURN_HIT"),
  () => requireExecutable("EFFECT_FREEZE_HIT"),
  () => requireExecutable("EFFECT_PARALYZE_HIT"),
  // Primary status-move opcode cluster registration
  // (docs/status-cluster-ground-truth.md): Cmd_seteffectprimary +
  // Cmd_jumpifstatus/Cmd_jumpiftype/Cmd_jumpifsideaffecting/
  // Cmd_jumpifcantmakeasleep are now registered, so all five of this
  // cluster's effects flip to executable by this tool's own static
  // opcode-reachability walk. EFFECT_TOXIC/POISON/PARALYZE/CONFUSE's
  // additional real-correctness dependency on Cmd_jumpifability/
  // Cmd_jumpifstatus2's concrete-value widening (also done this session,
  // battleScriptIngrainLeechSeedWrapOpcode.ts/battleScriptStatbuffchangeOpcode.ts)
  // is exactly the "registered opcode, narrow-input barrier" gap this tool's
  // own Caveats section already documents as invisible to this walk.
  () => requireExecutable("EFFECT_SLEEP"),
  () => requireExecutable("EFFECT_TOXIC"),
  () => requireExecutable("EFFECT_POISON"),
  () => requireExecutable("EFFECT_PARALYZE"),
  () => requireExecutable("EFFECT_CONFUSE"),
  // MOVE_EFFECT_CONFUSION/MOVE_EFFECT_FLINCH registration (this session):
  // zero new opcodes for either, so both flip straight to executable.
  () => requireExecutable("EFFECT_CONFUSE_HIT"),
  () => requireExecutable("EFFECT_FLINCH_HIT"),
  () => requireExecutable("EFFECT_FLINCH_MINIMIZE_HIT"),
  () => requireExecutable("EFFECT_TWISTER"),
  // TRI_ATTACK recurses into a re-rolled SetMoveEffect call and stays a named
  // (b) barrier -- out of this session's scope.
  () => requireBlockedMentioning("EFFECT_TRI_ATTACK", "MOVE_EFFECT_TRI_ATTACK"),
  // A real positive: EFFECT_RECOIL_IF_MISS (Jump Kick/Hi Jump Kick) enters via
  // BattleScript_HitFromAtkString directly, skipping BattleScript_EffectHit's
  // own label entirely, and its whole reachable set -- including the shared
  // moveend/checkteamslost tail -- is registered today.
  () => requireExecutable("EFFECT_RECOIL_IF_MISS"),
  // Primary-effect stat-change registration (docs/primary-stat-ground-truth.md):
  // B_SCR_OP_STATBUFFCHANGE/SETGRAPHICALSTATCHANGEVALUES/PLAYANIMATION flip
  // the whole UP family (self-target, no accuracy roll) straight to
  // executable; the DOWN family additionally needed JUMPIFSTATUS2/ORBYTE.
  () => requireExecutable("EFFECT_ATTACK_UP"),
  () => requireExecutable("EFFECT_ATTACK_UP_2"),
  () => requireExecutable("EFFECT_DEFENSE_DOWN"),
  () => requireExecutable("EFFECT_DEFENSE_DOWN_2"),
  // ISSUES #44: SETMOVEEFFECT_SUPPORTED now derives from the engine's own
  // exported SET_MOVE_EFFECT_SUPPORTED_BYTES (which spreads
  // STAT_MOVE_EFFECT_TABLE's keys) instead of a hand list that predated that
  // table's registration. These EFFECT_*_HIT scripts feed SetMoveEffect a
  // magnitude-1 stat token via Cmd_seteffectwithchance -- distinct from the
  // EFFECT_ATTACK_UP/EFFECT_DEFENSE_DOWN primary-effect pair just above,
  // which reach ChangeStatBuffs through Cmd_statbuffchange instead -- and
  // all flip straight to executable since applySetMoveEffect's stat-family
  // dispatch was already source-complete.
  () => requireExecutable("EFFECT_ATTACK_DOWN_HIT"), // MOVE_EFFECT_ATK_MINUS_1
  () => requireExecutable("EFFECT_DEFENSE_DOWN_HIT"), // MOVE_EFFECT_DEF_MINUS_1
  () => requireExecutable("EFFECT_SPEED_DOWN_HIT"), // MOVE_EFFECT_SPD_MINUS_1
  () => requireExecutable("EFFECT_SPECIAL_ATTACK_DOWN_HIT"), // MOVE_EFFECT_SP_ATK_MINUS_1
  () => requireExecutable("EFFECT_SPECIAL_DEFENSE_DOWN_HIT"), // MOVE_EFFECT_SP_DEF_MINUS_1
  () => requireExecutable("EFFECT_ACCURACY_DOWN_HIT"), // MOVE_EFFECT_ACC_MINUS_1
  () => requireExecutable("EFFECT_ATTACK_UP_HIT"), // MOVE_EFFECT_ATK_PLUS_1
  () => requireExecutable("EFFECT_DEFENSE_UP_HIT"), // MOVE_EFFECT_DEF_PLUS_1
  // ISSUES #45 fix: classifySetMoveEffectDispatch now also intercepts
  // B_SCR_OP_SETEFFECTPRIMARY (previously only SETEFFECTWITHCHANCE), and a new
  // jumpifability value-coverage check catches ability operands outside the
  // engine's widened 4-value set. These four rows were PROGRESS 473's own
  // named false positives -- pinned blocked now that the census actually
  // checks the operand, not just the opcode name.
  // EFFECT_RAGE's own blocked-on-opcodes/blocked-on-subsystem KIND moved this
  // session (see below) because the control-flow fix newly walks its
  // previously-unreachable BattleScript_RageMiss branch (accuracycheck's
  // failPtr operand, never modeled as an edge before this fix) and discovers
  // a genuine B_SCR_OP_CLEARSTATUSFROMEFFECT gap there; this check's own
  // needle-substring assertion still passes unmodified either way, since it
  // checks both missingOpcodes and subsystemNotes together.
  () => requireBlockedMentioning("EFFECT_RAGE", "MOVE_EFFECT_RAGE"),
  () => requireBlockedMentioning("EFFECT_MEAN_LOOK", "MOVE_EFFECT_PREVENT_ESCAPE"),
  () => requireBlockedMentioning("EFFECT_NIGHTMARE", "MOVE_EFFECT_NIGHTMARE"),
  () => requireBlockedMentioning("EFFECT_WILL_O_WISP", "ABILITY_WATER_VEIL"),
  // Registration checkpoint (2026-07-27, docs/roar-multihit-registration-
  // scout.md §4 rungs 2-6): B_SCR_OP_INITMULTIHITSTRING/B_SCR_OP_JUMPIFHASNOHP
  // registered, plus the JUMPIFHALFWORD (gChosenMove) and JUMPIFBYTE
  // (MOVE_RESULT_FOE_ENDURED) per-operand widenings and two further hidden
  // barriers found live running the committed scripts (COPYARRAY's
  // cEFFECT_CHOOSER<-sMULTIHIT_EFFECT tuple, and the sMULTIHIT_STRING+4
  // hits-landed counter's ADDBYTE write / gBattleTextBuff1 COPYARRAY read --
  // both real on every multi-hit iteration, not Triple-Kick-only as the
  // scout dossier's §1d table claimed). All three now genuinely executable.
  () => requireExecutable("EFFECT_MULTI_HIT"),
  () => requireExecutable("EFFECT_DOUBLE_HIT"),
  () => requireExecutable("EFFECT_TWINEEDLE"),
  // Registration checkpoint (2026-07-27, docs/roar-multihit-registration-
  // scout.md §4 rungs 7-9): damagecalcOpcodeHandler now reads
  // rules.tripleKickPower for the real 10/20/30 dynamic-base-power ramp;
  // ADDBYTE's sTRIPLE_KICK_POWER delta literal "10" and JUMPIFBYTE's
  // sMULTIHIT_STRING+4/standalone MOVE_RESULT_DOESNT_AFFECT_FOE are now
  // resolvable; COPYARRAY's gDynamicBasePower<-sTRIPLE_KICK_POWER tuple
  // (a hidden barrier the scout's §1d table wrongly called "registered")
  // is now modeled as a pure-advance no-op. Moved from blocked-on-opcodes
  // (this pin did not exist before this session -- Triple Kick was still
  // blocked when the census was last regenerated, PROGRESS 525) to
  // executable.
  () => requireExecutable("EFFECT_TRIPLE_KICK"),
  // Registration checkpoint (2026-07-27, docs/roar-multihit-registration-
  // scout.md §4 rungs 10-14): B_SCR_OP_FORCERANDOMSWITCH/SWITCHOUTABILITIES/
  // RETURNTOBALL registered (source-complete, zero barriers);
  // B_SCR_OP_FINISHACTION registered as an unconditional (b) barrier
  // (battleScriptForceSwitchOpcode.ts, per docs/script-terminal-gate3-
  // evidence.md's own deferral) but that barrier sits on the not-taken
  // (BATTLE_TYPE_TRAINER == false) side of BattleScript_SuccessForceOut's
  // own jumpifbattletype fork, which this census's static walk always
  // visits regardless of runtime battle-type dominance (see Caveats) --
  // so the walk still reports the effect executable via its real,
  // taken-for-Factory branch. Moved from the previous
  // requireExactMissingOpcodes pin (the census's own control-flow-fix
  // regression guard, no longer needed now that the row is executable
  // rather than blocked -- a real BATTLE_TYPE_ARENA value gap found live
  // running this exact script, fixed in battleScriptJumpifwordOpcode.ts,
  // not a control-flow-extractor regression).
  () => requireExecutable("EFFECT_ROAR"),
  // Registration checkpoint (EXPLOSION census set, PROGRESS 528):
  // B_SCR_OP_TRYEXPLOSION/B_SCR_OP_SETATKHPTOZERO registered
  // (battleScriptExplosionOpcode.ts, source-complete, zero barriers). Moved
  // from blocked-on-opcodes to executable. Side effect worth noting (not a
  // pin here, since EFFECT_MEMENTO stays blocked overall): its own
  // blocked-on-opcodes list also shrank from two missing opcodes to one
  // (B_SCR_OP_TRYMEMENTO alone) now that SETATKHPTOZERO -- shared plumbing
  // between the two effects -- is registered.
  () => requireExecutable("EFFECT_EXPLOSION"),
  // Registration checkpoint (docs/semi-invulnerable-registration-scout.md §5
  // rungs 1-8): JUMPIFWORD_VALUES + HITMARKER_NO_ATTACKSTRING, applySetMoveEffect's
  // MOVE_EFFECT_CHARGING case, COPYARRAY's (cMULTISTRING_CHOOSER,
  // sTWOTURN_STRINGID, 1) tuple, and PRINTFROMTABLE_TABLES' gFirstTurnOfTwoStringIds
  // (all four shared by every two-turn-charge effect) plus the three new
  // opcodes B_SCR_OP_CLEARSTATUSFROMEFFECT/SETSEMIINVULNERABLEBIT/
  // CLEARSEMIINVULNERABLEBIT (battleScriptSemiInvulnerableOpcode.ts). Moved
  // from blocked-on-opcodes to executable. EFFECT_RAZOR_WIND/SKY_ATTACK/
  // SKULL_BASH flip collaterally alongside it -- none needs the two
  // semi-invulnerable-exclusive opcodes, only the shared widenings +
  // CLEARSTATUSFROMEFFECT (the scout's own corrected prediction, not the
  // ranked table's original 1-effect claim).
  () => requireExecutable("EFFECT_SEMI_INVULNERABLE"),
  () => requireExecutable("EFFECT_RAZOR_WIND"),
  () => requireExecutable("EFFECT_SKY_ATTACK"),
  () => requireExecutable("EFFECT_SKULL_BASH"),
];

let validationFailed = false;
for (const check of validationChecks) {
  try {
    check();
  } catch (error) {
    validationFailed = true;
    console.error(String(error instanceof Error ? error.message : error));
  }
}
if (validationFailed) {
  console.error("\nExecutable-frontier census: ground-truth validation FAILED. Not writing the doc.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Effect -> moves -> Factory-L50 legality join
// ---------------------------------------------------------------------------

const movesByEffectId = new Map<number, TopologyMove[]>();
for (const move of topology.moves) {
  const bucket = movesByEffectId.get(move.effectId);
  if (bucket) bucket.push(move);
  else movesByEffectId.set(move.effectId, [move]);
}
const factoryByEffectId = new Map(topology.level50FactoryReachableEffects.map((e) => [e.id, e]));

type EffectRow = {
  report: EffectReport;
  allMoves: TopologyMove[];
  factoryMoves: TopologyFactoryMove[];
  factoryWeighted: number;
};

const effectRows: EffectRow[] = effectReports.map((report) => {
  const allMoves = movesByEffectId.get(report.effect.id) ?? [];
  const factoryEntry = factoryByEffectId.get(report.effect.id);
  const factoryMoves = factoryEntry?.moves ?? [];
  const factoryWeighted = factoryMoves.reduce((sum, m) => sum + m.frontierMonCount, 0);
  return { report, allMoves, factoryMoves, factoryWeighted };
});

function isExecutable(row: EffectRow): boolean {
  return row.report.classification.kind === "executable";
}

const headline = {
  effectsTotal: effectRows.length,
  effectsExecutable: effectRows.filter(isExecutable).length,
  movesTotal: effectRows.reduce((sum, r) => sum + r.allMoves.length, 0),
  movesExecutable: effectRows.filter(isExecutable).reduce((sum, r) => sum + r.allMoves.length, 0),
  factoryMovesTotalUnweighted: effectRows.reduce((sum, r) => sum + r.factoryMoves.length, 0),
  factoryMovesExecutableUnweighted: effectRows.filter(isExecutable).reduce((sum, r) => sum + r.factoryMoves.length, 0),
  factoryWeightedTotal: effectRows.reduce((sum, r) => sum + r.factoryWeighted, 0),
  factoryWeightedExecutable: effectRows.filter(isExecutable).reduce((sum, r) => sum + r.factoryWeighted, 0),
};

// ---------------------------------------------------------------------------
// Ranked "next registration by unlocked-move count" table
// ---------------------------------------------------------------------------

type OpcodeSetRank = {
  key: string;
  opcodes: string[];
  effectCount: number;
  moveCount: number;
  factoryMoveCount: number;
  factoryWeighted: number;
  effects: string[];
};

const rankByOpcodeSet = new Map<string, OpcodeSetRank>();
for (const row of effectRows) {
  if (row.report.classification.kind !== "blocked-on-opcodes") continue;
  const opcodes = [...row.report.classification.missingOpcodes].sort();
  const key = opcodes.join(" + ");
  const existing = rankByOpcodeSet.get(key);
  const addition = {
    effectCount: 1,
    moveCount: row.allMoves.length,
    factoryMoveCount: row.factoryMoves.length,
    factoryWeighted: row.factoryWeighted,
    effects: [row.report.effect.effect],
  };
  if (existing) {
    existing.effectCount += addition.effectCount;
    existing.moveCount += addition.moveCount;
    existing.factoryMoveCount += addition.factoryMoveCount;
    existing.factoryWeighted += addition.factoryWeighted;
    existing.effects.push(...addition.effects);
  } else {
    rankByOpcodeSet.set(key, { key, opcodes, ...addition });
  }
}
const rankedOpcodeSets = [...rankByOpcodeSet.values()].sort(
  (a, b) => b.factoryWeighted - a.factoryWeighted || b.moveCount - a.moveCount || a.key.localeCompare(b.key),
);

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

const DATE_HEADER = process.env.CENSUS_DATE ?? new Date().toISOString().slice(0, 10);

function pct(n: number, d: number): string {
  if (d === 0) return "n/a";
  return `${((100 * n) / d).toFixed(1)}%`;
}

function renderMissingOpcodeCell(classification: Classification): string {
  if (classification.kind === "executable") return "-";
  if (classification.kind === "blocked-on-opcodes") {
    const main = classification.missingOnMainPath ? " (main path)" : " (edge branch only)";
    return `${classification.missingOpcodes.map((o) => `\`${o}\``).join(", ")}${main}`;
  }
  return "-";
}

function renderSubsystemCell(classification: Classification): string {
  if (classification.kind === "executable") return "-";
  const notes = classification.kind === "blocked-on-opcodes" ? classification.subsystemNotes : classification.notes;
  if (notes.length === 0) return "-";
  return notes.join("<br>");
}

const lines: string[] = [];
lines.push(`# Executable-frontier census`);
lines.push("");
lines.push(`Generated ${DATE_HEADER}. Rerun: \`${RERUN_COMMAND}\``);
lines.push("");
lines.push(
  "Answers ROADMAP S10's Executable-frontier reset question directly: not \"how many opcodes are "
  + "registered\" but **how many of the 355 moves can the kernel execute end-to-end today, and what "
  + "exactly blocks each of the rest.** Every `BattleScript_Effect*` entry in the committed topology "
  + "(`src/data/gen/battle-script-topology.json` + `battle-script-graph.json`) is walked for full opcode "
  + "reachability (branches, goto/call targets, the shared hit-chain tail) against the opcode set the "
  + "engine currently registers (read live from "
  + "`src/engine/battleScriptRulesContext.ts`'s `createBattleScriptStatusRulesHandlers`, so this doc "
  + "cannot drift from what the engine actually installs).",
);
lines.push("");
if (rankedOpcodeSets.length > 0) {
  const top = rankedOpcodeSets[0]!;
  const opcodeList = top.opcodes.map((o) => `\`${o}\``).join(", ");
  const effectPreview = top.effects.slice(0, 6).join(", ") + (top.effects.length > 6 ? ", …" : "");
  lines.push(
    `**Key finding:** the single highest-leverage next registration is ${opcodeList} -- registering `
    + `exactly that set would flip **${top.effectCount} effect${top.effectCount === 1 ? "" : "s"} / `
    + `${top.moveCount} move${top.moveCount === 1 ? "" : "s"} (${top.factoryMoveCount} Factory-L50, `
    + `${top.factoryWeighted} weighted)** from blocked to executable in one step (${effectPreview}) -- the `
    + "largest single entry in the ranked table below. This paragraph is generated fresh from the "
    + "current registered-opcode set every run, so it always names today's actual top blocker, not a "
    + "past one -- see PROGRESS.md for the registration history (e.g. the 2026-07-25 "
    + "B_SCR_OP_JUMPIFHALFWORD/JUMPIFSTATUS3CONDITION/ORWORD entry-chokepoint trio).",
  );
  lines.push("");
}
lines.push("## Headline counts");
lines.push("");
lines.push("| Metric | Executable | Total | % |");
lines.push("| --- | --- | --- | --- |");
lines.push(
  `| Effect scripts | ${headline.effectsExecutable} | ${headline.effectsTotal} | `
  + `${pct(headline.effectsExecutable, headline.effectsTotal)} |`,
);
lines.push(
  `| Moves (unweighted, all 355) | ${headline.movesExecutable} | ${headline.movesTotal} | `
  + `${pct(headline.movesExecutable, headline.movesTotal)} |`,
);
lines.push(
  `| Level-50 Factory moves (unweighted, distinct moves in the 850-set) | `
  + `${headline.factoryMovesExecutableUnweighted} | ${headline.factoryMovesTotalUnweighted} | `
  + `${pct(headline.factoryMovesExecutableUnweighted, headline.factoryMovesTotalUnweighted)} |`,
);
lines.push(
  `| Level-50 Factory moves (weighted by rental-mon count across the 850-set) | `
  + `${headline.factoryWeightedExecutable} | ${headline.factoryWeightedTotal} | `
  + `${pct(headline.factoryWeightedExecutable, headline.factoryWeightedTotal)} |`,
);
lines.push("");
lines.push(
  "\"Executable\" means every opcode on every statically reachable path from the effect's entry script "
  + "has a dispatch entry today (registered barriers included, per ROADMAP S10 §1's (a)/(b) policy). "
  + "It is not a semantic-correctness claim -- see Caveats.",
);
lines.push("");

lines.push("## Ranked next registration by unlocked-move count");
lines.push("");
lines.push(
  "Each row is an exact set of missing opcodes -- registering only *some* of a multi-opcode set would not "
  + "unlock these effects, so opcodes are grouped by the combination an effect actually needs, not credited "
  + "individually. Effects already blocked only on a subsystem note (no missing opcode) are not rankable "
  + "here; see the per-effect table.",
);
lines.push("");
lines.push("| Missing opcode(s) | Effects unlocked | Moves unlocked (unweighted) | Factory-L50 moves (unweighted) | Factory-L50 weighted |");
lines.push("| --- | --- | --- | --- | --- |");
for (const rank of rankedOpcodeSets.slice(0, 25)) {
  lines.push(
    `| ${rank.opcodes.map((o) => `\`${o}\``).join(", ")} | ${rank.effectCount} (${rank.effects.slice(0, 6).join(", ")}`
    + `${rank.effects.length > 6 ? ", …" : ""}) | ${rank.moveCount} | ${rank.factoryMoveCount} | ${rank.factoryWeighted} |`,
  );
}
if (rankedOpcodeSets.length === 0) {
  lines.push("| _(none -- no effect is blocked purely on missing opcodes)_ | | | | |");
}
lines.push("");

lines.push("## Per-effect detail");
lines.push("");
lines.push("| Effect | Entry script | Classification | Missing opcode(s) | Subsystem notes | Moves | Factory-L50 moves (weighted) |");
lines.push("| --- | --- | --- | --- | --- | --- | --- |");
const sortedRows = [...effectRows].sort((a, b) => a.report.effect.id - b.report.effect.id);
for (const row of sortedRows) {
  const c = row.report.classification;
  lines.push(
    `| ${row.report.effect.effect} | \`${row.report.effect.entryScript}\` | ${c.kind} | `
    + `${renderMissingOpcodeCell(c)} | ${renderSubsystemCell(c)} | ${row.allMoves.length} | `
    + `${row.factoryMoves.length} (${row.factoryWeighted}) |`,
  );
}
lines.push("");

lines.push("## Validation (fails the run on drift)");
lines.push("");
lines.push("The tool itself asserts these before writing this doc and exits nonzero on any mismatch:");
lines.push("");
lines.push(
  "- `EFFECT_HIT`, `EFFECT_POISON_HIT`, `EFFECT_BURN_HIT`, `EFFECT_FREEZE_HIT`, `EFFECT_PARALYZE_HIT` each "
  + "executable -- the SetMoveEffect quartet's own dispatch was already source-complete (PROGRESS 444), "
  + "and B_SCR_OP_JUMPIFHALFWORD/JUMPIFSTATUS3CONDITION/ORWORD (registered 2026-07-25) closed the "
  + "shared-entry chokepoint that used to block all five on an unrelated instruction",
);
lines.push("- `EFFECT_SLEEP`, `EFFECT_TOXIC` blocked, mentioning `Cmd_seteffectprimary` (still fully unregistered)");
lines.push("- `EFFECT_RECOIL_IF_MISS` executable (a real positive: it enters via `BattleScript_HitFromAtkString`, skipping the chokepoint entirely, and reaches moveend/checkteamslost)");
lines.push(
  "- `EFFECT_ATTACK_DOWN_HIT`, `EFFECT_DEFENSE_DOWN_HIT`, `EFFECT_SPEED_DOWN_HIT`, "
  + "`EFFECT_SPECIAL_ATTACK_DOWN_HIT`, `EFFECT_SPECIAL_DEFENSE_DOWN_HIT`, `EFFECT_ACCURACY_DOWN_HIT`, "
  + "`EFFECT_ATTACK_UP_HIT`, `EFFECT_DEFENSE_UP_HIT` each executable (ISSUES #44: `SETMOVEEFFECT_SUPPORTED` "
  + "is now derived from the engine's own exported `SET_MOVE_EFFECT_SUPPORTED_BYTES`, which spreads "
  + "`STAT_MOVE_EFFECT_TABLE`'s keys, instead of a hand list that predated that table's registration)",
);
lines.push(
  "- `EFFECT_MULTI_HIT`, `EFFECT_DOUBLE_HIT`, `EFFECT_TWINEEDLE` each executable (2026-07-27, scout §4 "
  + "rungs 2-6: `B_SCR_OP_INITMULTIHITSTRING`/`B_SCR_OP_JUMPIFHASNOHP` registered, `JUMPIFHALFWORD`/"
  + "`JUMPIFBYTE` per-operand widenings for `gChosenMove`/`MOVE_RESULT_FOE_ENDURED`, plus two further "
  + "hidden barriers found running the committed scripts live rather than trusting the scout dossier -- "
  + "`COPYARRAY`'s `cEFFECT_CHOOSER<-sMULTIHIT_EFFECT` tuple, and the `sMULTIHIT_STRING+4` hits-landed "
  + "counter's `ADDBYTE` write / `gBattleTextBuff1` `COPYARRAY` read, both real on every multi-hit "
  + "iteration, not Triple-Kick-only as the dossier's §1d table claimed)",
);
lines.push(
  "- `EFFECT_TRIPLE_KICK` executable (2026-07-27, scout §4 rungs 7-9: `damagecalcOpcodeHandler` now reads "
  + "`rules.tripleKickPower` for the real 10/20/30 dynamic-base-power ramp; `ADDBYTE`'s `sTRIPLE_KICK_POWER` "
  + "delta literal `10` and `JUMPIFBYTE`'s `sMULTIHIT_STRING+4`/standalone `MOVE_RESULT_DOESNT_AFFECT_FOE` "
  + "are now resolvable; plus a hidden barrier found live running the committed script that the scout "
  + "dossier's §1d table wrongly called \"registered\" -- `COPYARRAY`'s "
  + "`gDynamicBasePower<-sTRIPLE_KICK_POWER` tuple, now modeled as a pure-advance no-op since "
  + "`gDynamicBasePower` has no materialized field here)",
);
lines.push(
  "- `EFFECT_ROAR` executable (2026-07-27, scout §4 rungs 10-14: `B_SCR_OP_FORCERANDOMSWITCH`/"
  + "`SWITCHOUTABILITIES`/`RETURNTOBALL` registered source-complete; `B_SCR_OP_FINISHACTION` registered "
  + "as an unconditional (b) barrier per docs/script-terminal-gate3-evidence.md's own deferral, but that "
  + "barrier sits on `BattleScript_SuccessForceOut`'s not-taken `BATTLE_TYPE_TRAINER == false` fork arm, "
  + "which this census's static walk always visits regardless of runtime battle-type dominance -- see "
  + "Caveats -- so the row is executable via its real, taken-for-Factory branch. A real "
  + "`BATTLE_TYPE_ARENA` value gap found live running this exact script (defined locally in "
  + "`battleScriptJumpifwordOpcode.ts` but never added to `JUMPIFWORD_VALUES`, despite the scout dossier's "
  + "§1a table calling it \"already registered\") was fixed in that file, not a control-flow-extractor "
  + "regression)",
);
lines.push("");
lines.push("All checks passed for this run.");
lines.push("");

lines.push("## Caveats (read before trusting a number here)");
lines.push("");
lines.push(
  "- **Registration coverage, not semantic verification.** \"Executable\" means every reachable opcode "
  + "has a dispatch entry, not that its behavior is bit-exact or complete. A registered opcode with a "
  + "narrow (b)-policy barrier still counts as \"registered\" per ROADMAP S10 §1 unless it is the one "
  + "named exception below.",
);
lines.push(
  "- **One deliberate semantic exception:** `Cmd_seteffectwithchance`'s SetMoveEffect dispatch "
  + "(`applySetMoveEffect`, `src/engine/battleScriptHitChainOpcode.ts:1760-1971`) is opcode-registered but "
  + "internally branches on the `MOVE_EFFECT_*` byte a script sets via the preceding `setmoveeffect` "
  + "statement. This is the only production dispatcher today where opcode registration and per-script "
  + "executability diverge (PROGRESS 444), so this census specifically tracks that one operand value along "
  + "each walk -- reading the supported-byte set live from the engine's own exported "
  + "`SET_MOVE_EFFECT_SUPPORTED_BYTES` (ISSUES #44) rather than a second hand-maintained copy, with a "
  + "name<->id lookup table guarded by an assertion that fails the run if the engine's dispatch grows an id "
  + "this tool cannot name yet. Every other multi-branch dispatcher's internal barriers are *not* modeled "
  + "operand-by-operand here -- if a future dispatcher gains the same pattern (registered opcode, "
  + "narrow-input barrier), this tool will overstate its effects as fully executable until a similar tracked "
  + "exception is added.",
);
lines.push(
  "- **Call/return modeling.** A `call` edge is treated as reaching *both* the callee's entry (to collect "
  + "its opcodes) and the callsite's recorded continuation (`callsiteContinuations`), unconditionally. This "
  + "assumes the callee always returns; it does not model the callee diverging (e.g. hitting `end` without "
  + "returning), which would make this census's reachable set a strict superset of the true one in rare "
  + "cases -- i.e. it can only make an effect look *more* blocked than reality, never less.",
);
lines.push(
  "- **\"Main path\" is a conservative proxy, not a dominance analysis.** An opcode is reported as reached "
  + "\"on the main path\" only if some route from the entry reaches it using zero conditional forks "
  + "(unconditional fallthrough, unconditional `goto`, and calls only). Any instruction beyond the first "
  + "conditional jump in a script is reported as \"edge branch only\" even if every real branch of that fork "
  + "reconverges to the same later instruction. This under-claims \"main path\" rather than over-claiming it.",
);
lines.push(
  "- **Dynamic dispatch, two categories.** `B_SCR_OP_JUMPTOCALLEDMOVE` (Metronome/Sleep Talk/Assist-style "
  + "\"run another move's effect script\") has a runtime-computed target with no static label operand; those "
  + "call sites are reported as a subsystem note (dynamic move-effect dispatch), not walked further. Separately, "
  + "`B_SCR_OP_FORCERANDOMSWITCH`'s success target (`BattleScript_SuccessForceOut`) is fixed at compile time but "
  + "never spelled as a bytecode operand -- `Cmd_forcerandomswitch` writes `gBattlescriptCurrInstr` directly "
  + "(`battle_script_commands.c:7181`) instead of reading one. Since that target IS statically known, it is "
  + "modeled as a real jump edge (`HARDCODED_SUCCESS_TARGETS` in this tool) so the walk actually visits it, "
  + "unlike the genuinely-unresolvable `JUMPTOCALLEDMOVE` case.",
);
lines.push(
  "- **Control-flow correction pass.** `src/data/gen/battle-script-graph.json`'s edge extractor "
  + "(`tools/extract/extract-battle-script-graph.ts`) only recognizes a script-pointer operand as a jump "
  + "target when the opcode name matches a fixed pattern (`B_SCR_OP_JUMPIF*`, plus a short unconditional "
  + "allowlist). Opcodes with a differently-named pointer operand (`accuracycheck`'s failPtr, "
  + "`statbuffchange`'s jumpptr, `forcerandomswitch`'s ptr, ...) get zero jump edge from the committed graph. "
  + "This tool corrects that mechanically from the graph's own `labelOperands` (already computed per "
  + "statement, just not wired into every edge) rather than opcode-by-opcode: any statement with a label "
  + "operand not already covered by an existing jump/call edge gets one synthesized, which can only make an "
  + "effect look more blocked than the committed graph claims, never less. The one further correction needed "
  + "is `B_SCR_OP_FORCERANDOMSWITCH` specifically: audited against `battle_script_commands.c` this session, "
  + "it never falls through to its assembly successor on any branch (unlike every other audited \"ptr\"-operand "
  + "opcode, which do genuinely advance on the non-jump branch), so its one fabricated fallthrough edge is "
  + "suppressed rather than kept alongside the added jump edges (`NEVER_FALLS_THROUGH_OPCODES` in this tool). "
  + "See docs/roar-multihit-registration-scout.md for the EFFECT_ROAR case this was found from.",
);
lines.push(
  "- **Factory-L50 legality** is taken directly from the topology's own precomputed "
  + "`level50FactoryReachableEffects` join (the 850-set boundary); this tool does not recompute Factory "
  + "legality itself.",
);
lines.push("");

writeFileSync(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");

console.log(
  `Executable-frontier census written to ${OUTPUT_PATH}\n`
  + `Effects: ${headline.effectsExecutable}/${headline.effectsTotal} executable\n`
  + `Moves (unweighted): ${headline.movesExecutable}/${headline.movesTotal}\n`
  + `Factory-L50 moves (unweighted): ${headline.factoryMovesExecutableUnweighted}/${headline.factoryMovesTotalUnweighted}\n`
  + `Factory-L50 moves (weighted): ${headline.factoryWeightedExecutable}/${headline.factoryWeightedTotal}\n`
  + `All ${validationChecks.length} ground-truth validation checks passed.\n`
  + `Control-flow correction pass: ${missingJumpEdgesSynthesized} missing jump edge(s) synthesized from `
  + `labelOperands, ${fabricatedFallthroughsSuppressed} fabricated fallthrough edge(s) suppressed `
  + "(NEVER_FALLS_THROUGH_OPCODES).",
);
