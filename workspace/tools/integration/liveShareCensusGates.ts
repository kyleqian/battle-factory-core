// S10A live-share census: decline-reason classifier. Every reason comes from a PRODUCTION predicate evaluated on the
// command's own inputs, in the order the adapter evaluates it:
//   1. liveMoveAnimationDuration (liveMoveAnimation.ts): the Substitute swap / doll gates (liveSubstituteSwapApplies,
//      liveMoveSubstituteDollDeclines), then the move switch (a move id without a case = "no adapter"; a case that returns null
//      is attributed to the request dimension whose flip makes the PRODUCTION function non-null: side, turn, rollout counter,
//      power; else "unclassified").
//   2. liveMoveAnimationPresentation: the move's own `if (...) return null;` gates, read from the production source in source
//      order and evaluated disjunct by disjunct on the actual inputs (only the function's parameters and the consts it
//      defines before the switch are in scope). A gate that reads a case-local value is opaque: the walk stops there and the
//      command is "unclassified" with that gate's line, never guessed.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS, liveBattlerAnchors, liveCastformFormDeclineReason, liveMoveAnimationDuration, liveMoveHiddenTargetDeclines,
  liveMoveSubstituteDollDeclines, type LiveMoveHiddenSides,
} from "../../src/engine/liveMoveAnimation.ts";
import { liveSubstituteSwapApplies, substituteSwapBodyField } from "../../src/engine/liveSubstituteSwap.ts";
import { liveBattlerIsShiny } from "../../src/engine/liveMovePaletteComposite.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (rel: string) => readFileSync(ROOT + rel, "utf8").split("\n");
const LMA = "src/engine/liveMoveAnimation.ts", SWAP = "src/engine/liveSubstituteSwap.ts";
const lmaLines = read(LMA), swapLines = read(SWAP);
/** 1-based line of the first line containing `needle` at or after `from`. */
function lineOf(lines: readonly string[], needle: string, from = 1): number {
  for (let i = from - 1; i < lines.length; i++) if (lines[i]!.includes(needle)) return i + 1;
  throw new Error(`liveShareCensusGates: "${needle}" not found`);
}
const cite = (file: string, line: number) => `${file.replace("src/engine/", "")}:${line}`;

// ---- source index ------------------------------------------------------------------------------------------------------------
/** `nested`: the gate's `if` sits inside a branch of the case (deeper than the case body), so whether it runs is unknown. */
interface Gate { line: number; cond: string | null; nested: boolean; prelude: readonly { name: string; expr: string }[] }
function caseBlocks(fnNeedle: string): { labels: Map<number, number>; gates: Map<number, Gate[]>; start: number; end: number } {
  const fn = lineOf(lmaLines, fnNeedle);
  const start = lineOf(lmaLines, "  switch (request.moveId) {", fn);
  let end = start;
  for (let i = start; i < lmaLines.length; i++) if (lmaLines[i] === "  }") { end = i + 1; break; }
  const labels = new Map<number, number>(), gates = new Map<number, Gate[]>();
  let pending: number[] = [], body = false, block: Gate[] = [], consts: { name: string; expr: string }[] = [];
  const close = () => { for (const id of pending) gates.set(id, block); };
  for (let n = start + 1; n < end; n++) {
    const text = lmaLines[n - 1]!;
    const m = /^    ((?:case \d+:\s*)+)(.*)$/.exec(text);
    if (m) {
      if (body) { close(); pending = []; block = []; consts = []; body = false; }
      for (const id of m[1]!.match(/\d+/g)!.map(Number)) { pending.push(id); labels.set(id, n); }
      if (m[2]!.trim() === "") continue;
    }
    if (/^    default:/.test(text)) { close(); pending = []; block = []; consts = []; body = false; continue; }
    body = true;
    // Single-line case-body consts (the case's own base indent) are evaluated before its gates when they only read scope values.
    const c = /^      const (\w+) = (.*);\s*$/.exec(text);
    if (c) consts.push({ name: c[1]!, expr: c[2]! });
    if (text.includes("return null")) {
      let ifLine = n;
      while (ifLine > n - 5 && !lmaLines[ifLine - 1]!.includes("if (")) ifLine--;
      block.push({ line: n, cond: gateCondition(n), nested: !/^      (if \(|\S)/.test(lmaLines[ifLine - 1]!) || /^      [}\]]/.test(lmaLines[ifLine - 1]!),
        prelude: [...consts] });
    }
  }
  close();
  return { labels, gates, start, end };
}
/** The `if (COND) return null` condition ending on line n (joined over up to 4 earlier lines), or null (unconditional). */
function gateCondition(n: number): string | null {
  const joined = lmaLines.slice(Math.max(0, n - 5), n).join(" ");
  const at = joined.lastIndexOf("return null");
  const head = joined.slice(0, at).trimEnd();
  if (!head.endsWith(")")) return null;
  let depth = 0;
  for (let i = head.length - 1; i >= 0; i--) {
    if (head[i] === ")") depth++;
    else if (head[i] === "(" && --depth === 0) return /\bif\s*$/.test(head.slice(0, i)) ? head.slice(i + 1, head.length - 1).trim() : null;
  }
  return null;
}
const DURATION = caseBlocks("export function liveMoveAnimationDuration(");
const PRESENTATION = caseBlocks("export function liveMoveAnimationPresentation(");
const PRESENT_DURATION_GATE = lineOf(lmaLines, "if (liveMoveAnimationDuration(request, field) === null) return null;", PRESENTATION.start - 80);
// hide66: the hidden-target gate right after the duration gate (liveMoveHiddenTargetDeclines).
const PRESENT_HIDDEN_TARGET_GATE = lineOf(lmaLines, "if (liveMoveHiddenTargetDeclines(request, hiddenSides)) return null;", PRESENTATION.start - 80);
// cf78: the Castform weather-form gate right after it (liveCastformFormDeclines).
const PRESENT_CASTFORM_GATE = lineOf(lmaLines, "if (liveCastformFormDeclines(field, request)) return null;", PRESENTATION.start - 80);
const SWAP_APPLIES = lineOf(swapLines, "export function liveSubstituteSwapApplies(");
const SWAP_SELF = lineOf(swapLines, "return (request.target === request.attacker", SWAP_APPLIES);
const SWAP_BOTH = lineOf(swapLines, "battlerOf(field, request.target).substituteDoll !== true", SWAP_APPLIES);
const SWAP_CELL = lineOf(swapLines, "LIVE_SUBSTITUTE_SWAP_BODY_CELLS.get(request.moveId)", SWAP_APPLIES);
const SWAP_HIT = lineOf(swapLines, "request.multihit < 2", SWAP_APPLIES);
const DOLL_DECLINES = lineOf(lmaLines, "export function liveMoveSubstituteDollDeclines(");
const DOLL_CELL = lineOf(lmaLines, "LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS.get(request.moveId)", DOLL_DECLINES);

/** Split a condition at its top-level `||`. */
function disjuncts(cond: string): string[] {
  const out: string[] = [];
  let depth = 0, from = 0;
  for (let i = 0; i < cond.length; i++) {
    const c = cond[i]!;
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (depth === 0 && c === "|" && cond[i + 1] === "|") { out.push(cond.slice(from, i).trim()); from = i + 2; i++; }
  }
  out.push(cond.slice(from).trim());
  return out;
}
function label(d: string): string {
  if (/firstBody|afterBonemerangHit1/.test(d)) return "later-body (order lend not a first body)";
  if (/afterDigSetup/.test(d)) return "dig unleash without the setup lend";
  if (/spriteOrderInput\?\.known|spriteOrderInput\.known|^!spriteOrderInput$/.test(d)) return "sprite-order lend unknown";
  if (/liveBattlerIsShiny/.test(d)) return "shiny battler";
  if (/frontIdleRest/.test(d)) return "nonzero tracked idle rest";
  if (/staleMovePowerUnknown/.test(d)) return "stale move power unknown";
  if (/spriteAllocatorInput\?\.historyKnown/.test(d)) return "sprite allocator history unknown";
  if (/paletteInput\?\.historyKnown/.test(d)) return "palette history unknown";
  if (/geometry\.side/.test(d)) return "attacker side";
  if (/request\.friendship/.test(d)) return "friendship branch";
  if (/request\.damage/.test(d)) return "damage range";
  if (/request\.turn/.test(d)) return "turn";
  if (/field\.(player|opponent)\.status/.test(d)) return "battler has a status condition";
  return `gate: ${d.replace(/\s+/g, " ").slice(0, 60)}`;
}

export interface PresentationInputs {
  request: BattleMoveAnimationRequest; field: BattleResolutionDisplayedField; age: number;
  paletteInput?: unknown; spriteAllocatorInput?: unknown; spriteOrderInput?: unknown; presentationRngInput?: unknown; battlerX2Input?: unknown;
  /** hide66: the live view's hidden sides (liveMoveHiddenSides). */
  hiddenSides?: LiveMoveHiddenSides;
}
/** Evaluate one disjunct with only the presentation function's parameters / pre-switch consts in scope: true / false / "opaque". */
const readsBattlerObject = (d: string) => /\b(attacker|target)\.(?!geometry\.side)/.test(d.replace(/request\.(attacker|target)/g, ""));
function gateScope(x: PresentationInputs, prelude: Gate["prelude"]): Record<string, unknown> {
  const attackerSide = x.request.attacker === 0 ? "player" : "opponent", targetSide = attackerSide === "player" ? "opponent" : "player";
  const art = createBattleCommandFieldArtView(x.field);
  const scope: Record<string, unknown> = {
    request: x.request, field: x.field, age: x.age, paletteInput: x.paletteInput, spriteAllocatorInput: x.spriteAllocatorInput,
    spriteOrderInput: x.spriteOrderInput, presentationRngInput: x.presentationRngInput, battlerX2Input: x.battlerX2Input,
    liveBattlerIsShiny, liveBattlerAnchors, createBattleCommandFieldArtView, art,
    attacker: { geometry: { side: attackerSide } }, target: { geometry: { side: targetSide } },
    attackerAnchors: liveBattlerAnchors(attackerSide, art, x.battlerX2Input as never),
  };
  for (const { name, expr } of prelude) {
    if (readsBattlerObject(expr)) continue;
    try { scope[name] = new Function(...Object.keys(scope), `"use strict"; return (${expr});`)(...Object.values(scope)); } catch { /* not in scope: stays opaque */ }
  }
  return scope;
}
/** Evaluate one disjunct with only the presentation function's parameters / pre-switch consts / evaluable case consts in scope. */
function evalDisjunct(d: string, scope: Record<string, unknown>): boolean | "opaque" {
  // attacker / target are full battler objects in production; only their geometry.side is reproduced here.
  if (readsBattlerObject(d)) return "opaque";
  try {
    return Boolean(new Function(...Object.keys(scope), `"use strict"; return (${d});`)(...Object.values(scope)));
  } catch {
    return "opaque";
  }
}

export interface Decline { stage: "request" | "duration" | "presentation"; reason: string; gate: string }
const sideOf = (r: BattleMoveAnimationRequest) => (r.attacker === 0 ? "player" : "opponent");

/** Why liveMoveAnimationDuration(request, field) is null (call only when it is). */
export function classifyDurationDecline(request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField, prefix = ""): Decline {
  const swap = liveSubstituteSwapApplies(request, field);
  if (swap === true) {
    const body = classifyDurationDecline(request, substituteSwapBodyField(field, request.attacker === 0 ? 0 : 1), "swap body: ");
    return { ...body, reason: prefix + body.reason };
  }
  if (swap === false) {
    const target = (request.target === 0 ? field.player : field.opponent).substituteDoll === true;
    if (request.target === request.attacker) return { stage: "duration", reason: `${prefix}attacker doll: self-target body`, gate: cite(SWAP, SWAP_SELF) };
    if (target) return { stage: "duration", reason: `${prefix}attacker doll: both battlers shown as dolls`, gate: cite(SWAP, SWAP_BOTH) };
    if (request.multihit >= 2 && liveSubstituteSwapApplies({ ...request, multihit: 1 }, field) === true) {
      return { stage: "duration", reason: `${prefix}attacker doll: multi-hit body before its last hit`, gate: cite(SWAP, SWAP_HIT) };
    }
    return { stage: "duration", reason: `${prefix}attacker doll: swap body cell unproven (LIVE_SUBSTITUTE_SWAP_BODY_CELLS)`, gate: cite(SWAP, SWAP_CELL) };
  }
  if (liveMoveSubstituteDollDeclines(request, field)) {
    const proven = (LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS.get(request.moveId) ?? []).length > 0;
    return { stage: "duration", reason: `${prefix}defender doll: ${proven ? "other-side" : "unproven"} body cell (LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS)`,
      gate: cite(LMA, DOLL_CELL) };
  }
  const caseLine = DURATION.labels.get(request.moveId);
  if (caseLine === undefined) return { stage: "duration", reason: `${prefix}no adapter (no liveMoveAnimationDuration case)`, gate: cite(LMA, DURATION.end) };
  const at = cite(LMA, caseLine);
  // With the displayed field, or field-free (the doll gates do not run without a field).
  const live = (r: BattleMoveAnimationRequest) => {
    try { return liveMoveAnimationDuration(r, field) !== null || liveMoveAnimationDuration(r) !== null; } catch { return false; }
  };
  if (live({ ...request, attacker: request.attacker === 0 ? 1 : 0, target: request.target === 0 ? 1 : 0 })) {
    return { stage: "duration", reason: `${prefix}no ${sideOf(request)}-attacker adapter`, gate: at };
  }
  if ([0, 1, 2, 3].some((turn) => turn !== request.turn && live({ ...request, turn }))) return { stage: "duration", reason: `${prefix}unsupported turn ${request.turn}`, gate: at };
  if ([1, 2, 3, 4, 5].some((c) => c !== request.rolloutCounter && live({ ...request, rolloutCounter: c }))) {
    return { stage: "duration", reason: `${prefix}rollout counter ${String(request.rolloutCounter)}`, gate: at };
  }
  if ([20, 40, 70, 110, 150].some((p) => p !== request.power && live({ ...request, power: p }))) return { stage: "duration", reason: `${prefix}power branch ${request.power}`, gate: at };
  // ret88: Move_RETURN / Frustration branch on gAnimFriendship (AnimTask_GetReturnPowerLevel / _GetFrustrationPowerLevel).
  if ([0, 70, 150, 255].some((f) => f !== request.friendship && live({ ...request, friendship: f }))) {
    return { stage: "duration", reason: `${prefix}friendship branch ${request.friendship}`, gate: at };
  }
  return { stage: "duration", reason: `${prefix}unclassified duration null`, gate: at };
}

/** Why liveMoveAnimationPresentation returned null for inputs whose duration is non-null. */
export function classifyPresentationDecline(x: PresentationInputs): Decline {
  if (liveMoveAnimationDuration(x.request, x.field) === null) {
    return { ...classifyDurationDecline(x.request, x.field), gate: cite(LMA, PRESENT_DURATION_GATE) };
  }
  if (x.hiddenSides !== undefined && liveMoveHiddenTargetDeclines(x.request, x.hiddenSides)) {
    return { stage: "presentation", reason: "target hidden (semi-invulnerable): no D4 phase for its lag profile (hide66)",
      gate: cite(LMA, PRESENT_HIDDEN_TARGET_GATE) };
  }
  const castform = liveCastformFormDeclineReason(x.field, x.request);
  if (castform !== null) {
    return { stage: "presentation", reason: `CASTFORM shown in a weather form: ${castform} (cast83, ISSUES #143)`,
      gate: cite(LMA, PRESENT_CASTFORM_GATE) };
  }
  const gates = PRESENTATION.gates.get(x.request.moveId);
  if (!gates) return { stage: "presentation", reason: "no presentation case (switch default)", gate: cite(LMA, PRESENTATION.end) };
  for (const g of gates) {
    if (g.cond === null) return { stage: "presentation", reason: "unclassified (unconditional / opaque return null)", gate: cite(LMA, g.line) };
    if (g.nested) return { stage: "presentation", reason: "unclassified (branch-local gate)", gate: cite(LMA, g.line) };
    const scope = gateScope(x, g.prelude);
    let opaque = false;
    for (const d of disjuncts(g.cond)) {
      const v = evalDisjunct(d, scope);
      if (v === true) return { stage: "presentation", reason: label(d), gate: cite(LMA, g.line) };
      if (v === "opaque") opaque = true;
    }
    if (opaque) return { stage: "presentation", reason: "unclassified (case-local gate)", gate: cite(LMA, g.line) };
  }
  return { stage: "presentation", reason: "unclassified (no source gate fired)", gate: cite(LMA, PRESENTATION.labels.get(x.request.moveId)!) };
}
