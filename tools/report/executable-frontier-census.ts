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
const edgesFromKey = new Map<string, GraphEdge[]>();
for (const edge of graph.controlFlow.edges) {
  const key = nodeKey(edge.from.label, edge.from.line);
  const bucket = edgesFromKey.get(key);
  if (bucket) bucket.push(edge);
  else edgesFromKey.set(key, [edge]);
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
// The one deliberate semantic exception: Cmd_seteffectwithchance's
// SetMoveEffect dispatch (applySetMoveEffect,
// src/engine/battleScriptHitChainOpcode.ts:1669-1870, itself a source-faithful
// port of battle_script_commands.c's Cmd_seteffectwithchance switch). The
// opcode B_SCR_OP_SETEFFECTWITHCHANCE is registered, but which MOVE_EFFECT_*
// byte a specific effect script feeds it (via the preceding `setmoveeffect`
// statement, itself just a literal-operand B_SCR_OP_SETBYTE) decides whether
// that registered opcode halts. This is the only place this census tracks an
// operand value rather than only opcode names, because it is the only
// production dispatcher where "opcode registered" and "this script's use of
// it executes" diverge today (PROGRESS 444).
// ---------------------------------------------------------------------------

const SETMOVEEFFECT_SUPPORTED = new Set(["MOVE_EFFECT_POISON", "MOVE_EFFECT_BURN", "MOVE_EFFECT_FREEZE", "MOVE_EFFECT_PARALYSIS"]);
const SETMOVEEFFECT_NAMED_BARRIER = new Set(["MOVE_EFFECT_SLEEP", "MOVE_EFFECT_TOXIC"]);

function parseMoveEffectBase(rawOperands: string | undefined): string {
  if (!rawOperands || rawOperands.trim() === "0") return "0";
  for (const token of rawOperands.split("|").map((t) => t.trim())) {
    if (token === "MOVE_EFFECT_CERTAIN" || token === "MOVE_EFFECT_AFFECTS_USER") continue;
    if (token) return token;
  }
  return "0";
}

type Blocker = { kind: "subsystem"; detail: string };

function classifySetMoveEffectDispatch(pendingEffect: string | null): Blocker | null {
  if (pendingEffect === null || pendingEffect === "0") return null;
  if (SETMOVEEFFECT_SUPPORTED.has(pendingEffect)) return null;
  if (SETMOVEEFFECT_NAMED_BARRIER.has(pendingEffect)) {
    return {
      kind: "subsystem",
      detail:
        `Cmd_seteffectwithchance dispatch: ${pendingEffect} is an explicit (b) barrier in applySetMoveEffect `
        + "(the real script for this status calls the still-unregistered Cmd_seteffectprimary instead; this "
        + "engine still names the byte as unreachable here) -- battle_script_commands.c:2273/2427",
    };
  }
  return {
    kind: "subsystem",
    detail:
      `Cmd_seteffectwithchance dispatch: ${pendingEffect} is in the family-B (status2/misc) switch, a named `
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
        const blocker = classifySetMoveEffectDispatch(node.pendingEffect);
        if (blocker) subsystemBlockers.add(blocker.detail);
        nextPendingEffect = null; // finalizeSeteffectwithchance always resets moveEffectByte to 0
      }
    }

    const outgoing = edgesFromKey.get(nodeKey(node.label, node.line)) ?? [];
    const isConditionalFork = outgoing.some((e) => e.kind === "fallthrough") && outgoing.some((e) => e.kind === "jump");

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
  () => requireBlockedMentioning("EFFECT_SLEEP", "SETEFFECTPRIMARY"), // PROGRESS 444: still-unregistered Cmd_seteffectprimary
  () => requireBlockedMentioning("EFFECT_TOXIC", "SETEFFECTPRIMARY"),
  // A real positive: EFFECT_RECOIL_IF_MISS (Jump Kick/Hi Jump Kick) enters via
  // BattleScript_HitFromAtkString directly, skipping BattleScript_EffectHit's
  // own label entirely, and its whole reachable set -- including the shared
  // moveend/checkteamslost tail -- is registered today.
  () => requireExecutable("EFFECT_RECOIL_IF_MISS"),
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
  + "(`applySetMoveEffect`, `src/engine/battleScriptHitChainOpcode.ts:1669-1870`) is opcode-registered but "
  + "internally branches on the `MOVE_EFFECT_*` byte a script sets via the preceding `setmoveeffect` "
  + "statement. This is the only production dispatcher today where opcode registration and per-script "
  + "executability diverge (PROGRESS 444), so this census specifically tracks that one operand value along "
  + "each walk. Every other multi-branch dispatcher's internal barriers are *not* modeled operand-by-operand "
  + "here -- if a future dispatcher gains the same pattern (registered opcode, narrow-input barrier), this "
  + "tool will overstate its effects as fully executable until a similar tracked exception is added.",
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
  "- **Dynamic dispatch.** `B_SCR_OP_JUMPTOCALLEDMOVE` (Metronome/Sleep Talk/Assist-style \"run another "
  + "move's effect script\") has a runtime-computed target with no static label operand; those three call "
  + "sites are reported as a subsystem note (dynamic move-effect dispatch), not walked further.",
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
  + `All ${validationChecks.length} ground-truth validation checks passed.`,
);
