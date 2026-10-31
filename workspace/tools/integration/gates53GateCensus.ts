// S10A gates53: WHICH condition inside a move case made liveMoveAnimationPresentation return null. The live-share census
// (liveShareCensus.ts / liveShareCensusGates.ts) stops at gates that read case-local values ("unclassified (case-local gate)").
// This instrument re-evaluates the PRODUCTION case itself on the actual inputs: it builds an instrumented copy of
// src/engine/liveMoveAnimation.ts in which every `if (COND) return null` inside liveMoveAnimationPresentation becomes
// `if (__g53.gate(LINE, [() => d1, () => d2, ...])) return null` (d1.. = COND's top-level `||` disjuncts, evaluated in order with
// the same short-circuit) and every other `return null` records its line. All imports of the copy resolve to the production
// modules (same file URLs, so the same module instances). Nothing is guessed: per call the copy's null-ness must equal the
// production function's (mismatches are counted and must be 0), and the LAST recorded hit of a null call is the gate that fired.
//   node --experimental-strip-types --no-warnings tools/integration/gates53GateCensus.ts --seeds=0..299 [--out=report.json]
//     [--scratch=<dir>] [--commands=<file.jsonl>]
// Battles / input policy / presentation seam: exactly liveShareCensus.ts (battle i: seed = from + i, streak = (i * 11) % 49).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { liveBattlerAnchors, liveMoveAnimationPresentation, liveWordsUnitPostFree } from "../../src/engine/liveMoveAnimation.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, resolveSpriteOrderDeferredLend, spriteOrderTrackerLend, type SpriteOrderDeferredLend,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { isWordsOrderDeferredUnit } from "../../src/engine/wordsOrderUnits.ts";
import { liveMovePresentationRngWords } from "../../src/engine/liveMovePresentationRng.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveSubstituteSwapView } from "../../src/engine/liveSubstituteSwap.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import movesJson from "../../src/data/gen/moves.json" with { type: "json" };
import { classifyPresentationDecline } from "./liveShareCensusGates.ts";

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
const FRAME_BUDGET = 200000;
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const LMA = "src/engine/liveMoveAnimation.ts";

// ---- instrumented copy -------------------------------------------------------------------------------------------------------
interface GateInfo { line: number; cond: string | null; disjuncts: string[] }
const gateInfo = new Map<number, GateInfo>();
/** Index of the bracket matching the opener at `open` (string / template / comment aware). */
function matchClose(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i]!;
    if (c === "\"" || c === "'" || c === "`") {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === "\\") i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (c === "/" && text[i + 1] === "*") { i = text.indexOf("*/", i + 2) + 1; continue; }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") { if (--depth === 0) return i; }
  }
  throw new Error("gates53: unbalanced bracket");
}
function topLevelDisjuncts(cond: string): string[] {
  const out: string[] = [];
  let depth = 0, from = 0;
  for (let i = 0; i < cond.length; i++) {
    const c = cond[i]!;
    if (c === "\"" || c === "'" || c === "`") { for (i++; i < cond.length && cond[i] !== c; i++) if (cond[i] === "\\") i++; continue; }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (depth === 0 && c === "?" && cond[i + 1] !== "?" && cond[i + 1] !== ".") return [cond.trim()]; // top-level ternary: keep whole
    else if (depth === 0 && c === "|" && cond[i + 1] === "|") { out.push(cond.slice(from, i).trim()); from = i + 2; i++; }
  }
  out.push(cond.slice(from).trim());
  return out;
}
const lineAt = (text: string, offset: number) => text.slice(0, offset).split("\n").length;
function buildInstrumentedCopy(scratch: string): string {
  const src = readFileSync(ROOT + LMA, "utf8");
  const fnStart = src.indexOf("export function liveMoveAnimationPresentation(");
  const bodyOpen = src.indexOf("{", src.indexOf(")", src.indexOf("): SceneOnMovePresentationState | null", fnStart)));
  const fnEnd = matchClose(src, bodyOpen);
  type Edit = { from: number; to: number; text: string };
  const edits: Edit[] = [];
  const covered = new Set<number>();
  // `if (COND) return null`
  for (let i = src.indexOf("if (", bodyOpen); i !== -1 && i < fnEnd; i = src.indexOf("if (", i + 1)) {
    if (/[\w$.]/.test(src[i - 1]!)) continue;
    const open = i + 3, close = matchClose(src, open);
    const after = /^\s*return null;/.exec(src.slice(close + 1));
    if (!after) continue;
    const retAt = close + 1 + after[0].indexOf("return null");
    const line = lineAt(src, retAt), cond = src.slice(open + 1, close);
    const ds = topLevelDisjuncts(cond);
    gateInfo.set(line, { line, cond: cond.replace(/\s+/g, " ").trim(), disjuncts: ds.map((d) => d.replace(/\s+/g, " ")) });
    edits.push({ from: i, to: close + 1, text: `if (globalThis.__g53.gate(${line}, [${ds.map((d) => `() => (${d})`).join(", ")}]))` });
    covered.add(retAt);
  }
  // every other `return null`
  for (let i = src.indexOf("return null", bodyOpen); i !== -1 && i < fnEnd; i = src.indexOf("return null", i + 1)) {
    if (covered.has(i)) continue;
    const line = lineAt(src, i);
    gateInfo.set(line, { line, cond: null, disjuncts: [] });
    edits.push({ from: i, to: i + "return null".length, text: `return globalThis.__g53.ret(${line})` });
  }
  edits.sort((a, b) => b.from - a.from);
  let out = src;
  for (const e of edits) out = out.slice(0, e.from) + e.text + out.slice(e.to);
  const engineDir = pathToFileURL(ROOT + "src/engine/").href;
  out = out.replace(/(from|import)\s+"(\.\.?\/[^"]+)"/g, (_m, kw: string, spec: string) => `${kw} "${new URL(spec, engineDir).href}"`);
  mkdirSync(scratch, { recursive: true });
  const file = `${scratch}/liveMoveAnimation.gates53.ts`;
  writeFileSync(file, out);
  return file;
}

type Hit = { line: number; disjunct: number | null };
const g53 = {
  hits: [] as Hit[],
  gate(line: number, ds: (() => unknown)[]): boolean {
    for (let k = 0; k < ds.length; k++) if (ds[k]!()) { this.hits.push({ line, disjunct: k }); return true; }
    return false;
  },
  ret(line: number): null { this.hits.push({ line, disjunct: null }); return null; },
};
(globalThis as unknown as { __g53: typeof g53 }).__g53 = g53;
const scratch = arg("scratch", `${ROOT}.integration/gates53-census`)!;
const instrumented = await import(pathToFileURL(buildInstrumentedCopy(scratch)).href) as { liveMoveAnimationPresentation: typeof liveMoveAnimationPresentation };

// ---- words-deferred lend: which production step of resolveWordsOrderLend returned null ------------------------------------------
// The production resolution (liveMoveAnimation.ts resolveWordsOrderLend -> spriteOrderEventTransform.ts resolveSpriteOrderDeferredLend)
// re-run step by step with the production pieces: the replay-unit allow-list is read from the production source (DEFERRED_REPLAY_UNITS).
const SOET = readFileSync(ROOT + "src/engine/spriteOrderEventTransform.ts", "utf8");
const REPLAY_UNITS = new Set((/const DEFERRED_REPLAY_UNITS[^=]*= new Set\(\[([^\]]*)\]/s.exec(SOET)![1]!).match(/"([^"]+)"/g)!.map((q) => q.slice(1, -1)));
function deferredSubReason(deferred: SpriteOrderDeferredLend, host: Parameters<typeof liveMovePresentationRngWords>[0] extends infer I ? I extends { host: infer H } ? H : never : never,
  field: Parameters<typeof createBattleCommandFieldArtView>[0]): string {
  const art = createBattleCommandFieldArtView(field);
  const anchors = { player: liveBattlerAnchors("player", art).picOffsetPoint, opponent: liveBattlerAnchors("opponent", art).picOffsetPoint };
  const walk = (d: SpriteOrderDeferredLend, depth: number): string | null => {
    const foreign = d.units.filter((u) => !REPLAY_UNITS.has(u.kind)).map((u) => u.kind);
    if (foreign.length > 0) return `depth ${depth} ${d.generalAnimation ?? d.moveId}: non-replay unit after the words body (first: ${foreign[0]}) (units ${[...new Set(foreign)].join(",")})`;
    if ("deferred" in d.activation) { const inner = walk(d.activation.deferred, depth + 1); if (inner !== null) return inner; }
    const activationFree = "deferred" in d.activation ? resolveSpriteOrderDeferredLend(d.activation.deferred, carry) : d.activation.free;
    if (activationFree === null) return `depth ${depth}: activation free unresolved`;
    if (!isWordsOrderDeferredUnit(d)) {
      // Ice Ball's own deferred body (liveMoveAnimation.ts case 301 carries it with its own case-local carry): name its inputs.
      const words = liveMovePresentationRngWords({ host, key: d.key } as never);
      return `depth ${depth} ${d.moveId}/${d.attackerSide}: own (non-words) deferred body, case carry ${words === null ? "has no recorded words for the earlier body" : "null with words recorded (counter / prefix / postBodyFree)"}`;
    }
    const words = liveMovePresentationRngWords({ host, key: d.key } as never);
    if (words === null) return `depth ${depth} ${d.generalAnimation ?? d.moveId}/${d.attackerSide}: no recorded presentation words for the unit key`;
    const post = liveWordsUnitPostFree(d, activationFree, words, anchors);
    if (post === null) return `depth ${depth} ${d.generalAnimation ?? d.moveId}/${d.attackerSide}: liveWordsUnitPostFree null (activation free ${activationFree.length} slots)`;
    if (resolveSpriteOrderDeferredLend(d, carry) === null) return `depth ${depth} ${d.generalAnimation ?? d.moveId}/${d.attackerSide}: post-unit replay lend null (units ${d.units.map((u) => u.kind).join(",")})`;
    return null;
  };
  const carry = (unit: SpriteOrderDeferredLend, activationFree: readonly number[]) => {
    if (!isWordsOrderDeferredUnit(unit)) return null;
    return liveWordsUnitPostFree(unit, activationFree, liveMovePresentationRngWords({ host, key: unit.key } as never), anchors);
  };
  return walk(deferred, 0) ?? "resolves (not the cause)";
}

/**
 * UNPROVEN PREDICTOR (host-lane lever size, never a production input): resolveSpriteOrderDeferredLend with the replay allow-list removed
 * (every recorded unit replayed with the production plans; an unplanned unit still invalidates the tracker -> null). Returns the lend the
 * consumer would see, or null.
 */
function resolveWithoutAllowList(d: SpriteOrderDeferredLend, host: unknown, field: Parameters<typeof createBattleCommandFieldArtView>[0]): readonly number[] | null {
  const art = createBattleCommandFieldArtView(field);
  const anchors = { player: liveBattlerAnchors("player", art).picOffsetPoint, opponent: liveBattlerAnchors("opponent", art).picOffsetPoint };
  const walk = (x: SpriteOrderDeferredLend): readonly number[] | null => {
    const activationFree = "deferred" in x.activation ? walk(x.activation.deferred) : x.activation.free;
    if (activationFree === null || !isWordsOrderDeferredUnit(x)) return null;
    const post = liveWordsUnitPostFree(x, activationFree, liveMovePresentationRngWords({ host, key: x.key } as never), anchors);
    if (post === null) return null;
    let tracker = createSpriteOrderTracker({ known: true, free: post, pendingDestroyed: [] });
    for (const unit of x.units) tracker = applySpriteOrderPresentationEvent(tracker, unit);
    return spriteOrderTrackerLend(tracker);
  };
  return walk(d);
}

// ---- census driver (liveShareCensus.ts's battle loop) -------------------------------------------------------------------------
const nameOf = new Map((movesJson as unknown as { moves: { id: number; name: string }[] }).moves.map((m) => [m.id, m.name]));
interface CommandRecord {
  battle: number; seed: number; streak: number; command: string; moveId: number; move: string; side: "player" | "opponent";
  attacker: string; target: string; frames: number; fallbackFrames: number; censusReason: string | null; censusGate: string | null;
  firstFallbackAge: number | null; exact: string | null; exactHits: Record<string, number>; deferredSubReason?: string;
  /** UNPROVEN predictor (resolveWithoutAllowList), words-deferred declines only. */
  predictorWithoutAllowList?: string;
}
const commands: CommandRecord[] = [];
const fidelity = { calls: 0, nullMismatches: 0, mismatchExamples: [] as string[] };
const keyOf = (h: Hit | undefined) => (h === undefined ? "no hit recorded" : `${h.line}#${h.disjunct ?? "ret"}`);

function playBattle(battle: number, seed: number, streak: number): void {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: "on",
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false, commandKey = "", current: CommandRecord | null = null;
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
    if (command?.type !== "move-animation") return;
    const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    const view = createBattleResolutionPresentationRenderView(r, rng.host);
    if (key !== commandKey) {
      commandKey = key;
      const side = (command.animation?.attacker ?? 0) === 0 ? "player" : "opponent";
      const moveId = command.animation?.moveId ?? -1;
      current = { battle, seed, streak, command: key, moveId, move: nameOf.get(moveId) ?? `#${moveId}`, side,
        attacker: side === "player" ? view.field.player.name : view.field.opponent.name,
        target: side === "player" ? view.field.opponent.name : view.field.player.name,
        frames: 0, fallbackFrames: 0, censusReason: null, censusGate: null, firstFallbackAge: null, exact: null, exactHits: {} };
      commands.push(current);
    }
    const rec = current!;
    rec.frames++;
    if (view.effect?.type !== "move") { rec.fallbackFrames++; return; }
    const swap = liveSubstituteSwapView(view);
    if (swap?.kind === "swap") return;
    const v = swap ? swap.view : view, e = v.effect;
    if (e?.type !== "move") { rec.fallbackFrames++; return; }
    const args = [e.request, v.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng, e.battlerX2Input] as const;
    const production = liveMoveAnimationPresentation(...args);
    g53.hits = [];
    const copy = instrumented.liveMoveAnimationPresentation(...args);
    fidelity.calls++;
    if ((production === null) !== (copy === null)) {
      fidelity.nullMismatches++;
      if (fidelity.mismatchExamples.length < 10) fidelity.mismatchExamples.push(`${rec.move}/${rec.side} battle ${battle} ${key} age ${e.age}`);
    }
    if (production !== null) return;
    rec.fallbackFrames++;
    // The pre-switch words-deferred resolution (prep46) can replace the lend with undefined: name it, it is not the raw input.
    const raw = (e.spriteOrderInput as { deferred?: SpriteOrderDeferredLend } | undefined)?.deferred;
    const deferred = raw === undefined ? "" : isWordsOrderDeferredUnit(raw) ? " [words-deferred lend]" : ` [own deferred lend ${raw.moveId}]`;
    const k = keyOf(g53.hits.at(-1)) + deferred;
    if (raw !== undefined && rec.deferredSubReason === undefined) {
      rec.deferredSubReason = deferredSubReason(raw, e.presentationRng?.host ?? null, v.field);
      if (isWordsOrderDeferredUnit(raw)) {
        const lend = resolveWithoutAllowList(raw, e.presentationRng?.host ?? null, v.field);
        rec.predictorWithoutAllowList = lend === null ? "lend still null"
          : liveMoveAnimationPresentation(e.request, v.field, e.age, e.paletteInput, e.spriteAllocatorInput, Object.freeze({ known: true as const, free: lend }) as never,
            e.presentationRng, e.battlerX2Input) === null ? "lend resolves, consumer still declines" : "lend resolves, consumer draws";
      }
    }
    rec.exactHits[k] = (rec.exactHits[k] ?? 0) + 1;
    if (rec.censusReason === null) {
      const d = classifyPresentationDecline({ request: e.request, field: v.field, age: e.age, paletteInput: e.paletteInput,
        spriteAllocatorInput: e.spriteAllocatorInput, spriteOrderInput: e.spriteOrderInput, presentationRngInput: e.presentationRng,
        battlerX2Input: e.battlerX2Input });
      rec.censusReason = `${d.stage}: ${d.reason}`; rec.censusGate = d.gate; rec.firstFallbackAge = e.age; rec.exact = k;
    }
  };
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    observe();
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); if (!ended) step([button]); if (!ended) step(); };
  const forcedSelector = () => {
    const selector = state.battleForcedPartySelect;
    return selector && selector.sendOutElapsed === null && selector.elapsed >= PARTY_LIST_INPUT_ELAPSED ? selector : null;
  };
  const until = (predicate: () => boolean) => {
    while (!ended && !predicate()) {
      const selector = forcedSelector();
      if (selector) {
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  try {
    until(() => phase() === "action-menu");
    while (!ended) {
      pulse("A");
      until(() => phase() === "fight-menu");
      if (ended) break;
      const menu = state.battleCommandPresentation!;
      const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
      const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
      slotUses[slot]!++;
      for (let i = 0; i < 4; i++) {
        const cursor = state.battleCommandPresentation!.fightCursor;
        if (cursor === slot) break;
        pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
      }
      pulse("A");
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
    }
  } catch (e) {
    if (!String(e).includes("frame budget")) throw e;
  }
}

const started = Date.now();
for (let i = 0, seed = fromSeed; seed <= toSeed; i++, seed++) {
  playBattle(i, seed, (i * 11) % 49);
  if (i % 25 === 24) process.stderr.write(`battle ${i + 1} seed ${seed}: ${commands.length} commands, ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
}

// ---- report ------------------------------------------------------------------------------------------------------------------
const CASE_LOCAL = "presentation: unclassified (case-local gate)";
const describe = (k: string) => {
  const [lineText, rest] = k.split("#"), d = rest?.split(" ")[0];
  const g = gateInfo.get(Number(lineText));
  if (!g) return { line: null, condition: k, disjunct: null };
  const noteMatch = /\[(words-deferred lend|own deferred lend \d+)\]/.exec(k)?.[0];
  const note = noteMatch ? ` ${noteMatch}` : "";
  return { line: Number(lineText), condition: g.cond ?? "(unconditional return null)", disjunct: (d === "ret" ? "(return null)" : g.disjuncts[Number(d)] ?? "?") + note };
};
type Row = { move: string; moveId: number; side: string; exact: string; line: number | null; condition: string; disjunct: string | null; deferredSubReason: string | null;
  censusGate: string | null; count: number; fallbackFrames: number; examples: string[] };
function rank(filter: (c: CommandRecord) => boolean): Row[] {
  const m = new Map<string, Row>();
  for (const c of commands) {
    if (c.fallbackFrames === 0 || !filter(c)) continue;
    const exact = c.exact ?? "no presentation decline";
    const sub = c.deferredSubReason ?? null;
    const k = `${c.move}|${c.side}|${exact}|${sub}`;
    const r = m.get(k) ?? { move: c.move, moveId: c.moveId, side: c.side, exact, ...describe(exact), deferredSubReason: sub, censusGate: c.censusGate, count: 0, fallbackFrames: 0, examples: [] };
    r.count++; r.fallbackFrames += c.fallbackFrames;
    if (r.examples.length < 6) r.examples.push(`seed ${c.seed} streak ${c.streak} ${c.command} ${c.attacker}->${c.target} age0 ${c.firstFallbackAge} frames ${c.fallbackFrames}`);
    m.set(k, r);
  }
  return [...m.values()].sort((a, b) => b.fallbackFrames - a.fallbackFrames || b.count - a.count || a.move.localeCompare(b.move) || a.side.localeCompare(b.side));
}
const caseLocal = rank((c) => c.censusReason === CASE_LOCAL);
const genericSub = (s: string | null) => s?.replace(/^depth \d+ /, "").replace(/\(activation free \d+ slots\)/, "").replace(/\(units [^)]*\)/, "") ?? null;
const byCondition = new Map<string, { exact: string; line: number | null; disjunct: string | null; deferredSubReason: string | null; count: number; fallbackFrames: number; moves: Set<string> }>();
for (const r of caseLocal) {
  const sub = r.disjunct?.includes("deferred lend") ? genericSub(r.deferredSubReason) : null;
  // A consumer's `!spriteOrderInput?.known` after the pre-switch words resolution (resolveWordsOrderLend) returned null is one condition
  // whatever the case's line: grouped as such (line null, the per-move lines are in rankingByExactCondition).
  const words = r.disjunct?.includes("[words-deferred lend]") === true && /^!spriteOrderInput\?\.known /.test(r.disjunct);
  const k = `${words ? "words-deferred" : r.line}|${words ? "words" : r.disjunct}|${sub}`;
  const b = byCondition.get(k) ?? { exact: words ? "pre-switch resolveWordsOrderLend null -> consumer !spriteOrderInput?.known" : r.exact,
    line: words ? null : r.line, disjunct: words ? "!spriteOrderInput?.known [words-deferred lend unresolved]" : r.disjunct,
    deferredSubReason: sub, count: 0, fallbackFrames: 0, moves: new Set<string>() };
  b.count += r.count; b.fallbackFrames += r.fallbackFrames; b.moves.add(`${r.move}/${r.side}`);
  byCondition.set(k, b);
}
const multiGate = commands.filter((c) => Object.keys(c.exactHits).length > 1).length;
const report = {
  schema: "gates53-gate-census/v1",
  config: { seeds: `${fromSeed}..${toSeed}`, streaks: "(i * 11) % 49", battleScene: "on", source: LMA,
    sourceSha256: createHash("sha256").update(readFileSync(ROOT + LMA)).digest("hex"), instrumentedGates: gateInfo.size },
  fidelity,
  commands: commands.length,
  caseLocal: { commands: caseLocal.reduce((a, r) => a + r.count, 0), fallbackFrames: caseLocal.reduce((a, r) => a + r.fallbackFrames, 0) },
  commandsWithMoreThanOneExactGateAcrossFrames: multiGate,
  rankingByExactCondition: caseLocal,
  rankingByConditionLine: [...byCondition.values()].sort((a, b) => b.fallbackFrames - a.fallbackFrames)
    .map((b) => ({ ...b, moves: [...b.moves].sort() })),
  allPresentationDeclinesByExactCondition: rank((c) => c.censusReason !== null).slice(0, 80),
  unprovenPredictorWithoutDeferredReplayAllowList: (() => {
    const m = new Map<string, { outcome: string; count: number; fallbackFrames: number }>();
    for (const c of commands) if (c.censusReason === CASE_LOCAL && c.predictorWithoutAllowList !== undefined) {
      const b = m.get(c.predictorWithoutAllowList) ?? { outcome: c.predictorWithoutAllowList, count: 0, fallbackFrames: 0 };
      b.count++; b.fallbackFrames += c.fallbackFrames; m.set(b.outcome, b);
    }
    return [...m.values()].sort((a, b) => b.fallbackFrames - a.fallbackFrames);
  })(),
};
const text = JSON.stringify(report, null, 1) + "\n";
const out = arg("out");
if (out) writeFileSync(out, text); else process.stdout.write(text);
const commandsOut = arg("commands");
if (commandsOut) writeFileSync(commandsOut, commands.filter((c) => c.fallbackFrames > 0).map((c) => JSON.stringify(c)).join("\n") + "\n");
process.stderr.write(`done: ${commands.length} commands, case-local ${report.caseLocal.commands} / ${report.caseLocal.fallbackFrames} frames, `
  + `fidelity ${fidelity.calls} calls / ${fidelity.nullMismatches} mismatches, ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
