// Seeded random-play soak driver for the full generated Factory round —
// library half (no side effects on import; the CLI lives in
// tools/soak/randomRoundSoak.ts and tests/randomRoundSoak.test.ts pins the
// green milestone surface).
//
// Drives the REAL production play path — `createInitialState()` +
// `tick(state, buttons)` from src/engine/core.ts, the exact pure core that
// src/main.ts runs every browser frame — from the rental draft screen through
// battles 1..7 (postwin flows, swap screens, forced switches, terminal
// presentations) using only GBA button presses, exactly like a human player.
// At every decision surface it enumerates the choices the real UI exposes
// (action menu incl. BAG/RUN noops, every fight slot incl. Torment/Taunt/
// Disable/no-PP rejection slots, switch targets incl. fainted ones, swap
// YES/NO and swap-screen picks, message-advance presses with jittered
// timing) and picks with a seeded PRNG. Presentation is ticked frame by
// frame — no orchestrator shortcuts — because the live crashes bind to the
// presentation/orchestration seams (ISSUES #84).
//
// Finding vs. cataloging: this tool NEVER fixes engine behavior. A throw
// whose top frame is under tools/soak/ is a DRIVER bug; a throw from src/**
// is an ENGINE bug and lands in docs/soak-crash-catalog.md.

import {
  createInitialState,
  render,
  tick,
  type EngineState,
} from "../../src/engine/core.ts";
import type { GbaButton } from "../../src/input.ts";
import {
  MENU_OPTION_RENT,
  MENU_OPTION_SUMMARY,
} from "../../src/engine/factoryDraftScreen.ts";
import {
  isCursorInputReady,
  isMonPicInputReady,
} from "../../src/engine/monPic.ts";
import { factoryTerminalRecordMenuInputReady } from "../../src/engine/factoryTerminalPresentation.ts";
import { applyTypeEffectiveness, type TypeEffectivenessEntry } from "../../src/engine/damageCalc.ts";
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import speciesTypesData from "../../src/data/gen/species-types.json" with { type: "json" };
import typeEffectivenessData from "../../src/data/gen/type-effectiveness.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Move power/type lookup and type-effectiveness table (for the "winning"
// policy's fight-move bias only)
// ---------------------------------------------------------------------------

const MOVE_BY_ID = new Map<number, { power: number; type: string }>(
  (movesData as { moves: { id: number; power: number; type: string }[] }).moves.map(
    (move) => [move.id, { power: move.power, type: move.type }],
  ),
);

const TYPE_EFFECTIVENESS =
  typeEffectivenessData.typeEffectiveness as readonly TypeEffectivenessEntry[];

/** Materialized battler types default (matches battleScriptRulesContext.ts's own convention). */
const DEFAULT_TYPES: readonly [string, string] = ["TYPE_NORMAL", "TYPE_NORMAL"];

/** gSpeciesInfo[species].types -- species-types.json is indexed by (speciesId - 1). */
const SPECIES_TYPES = speciesTypesData.species as unknown as readonly Readonly<{
  types: readonly [string, string];
}>[];

function typesForSpecies(species: number): readonly [string, string] {
  return SPECIES_TYPES[species - 1]?.types ?? DEFAULT_TYPES;
}

/**
 * "winning" policy fight-move scorer: for each legal slot,
 * `score = basePower x effectivenessMultiplier(moveType vs defenderTypes) x
 * (STAB ? 1.5 : 1)`, using the engine's own `applyTypeEffectiveness` +
 * type-effectiveness table. A 0x-immune or non-damaging (power 0) slot
 * scores 0. Ties keep the lower slot (strict `>` never overwrites an equal
 * score). If every legal slot scores 0, falls back to the highest-power
 * legal slot (ties to the lower slot again), matching the policy's prior
 * behaviour.
 */
export function pickWinningFightSlot(input: {
  legalSlots: readonly boolean[];
  moveIds: readonly number[];
  attackerTypes: readonly [string, string];
  defenderTypes: readonly [string, string];
}): number {
  const { legalSlots, moveIds, attackerTypes, defenderTypes } = input;
  let fallbackSlot = 0;
  let fallbackFound = false;
  let fallbackPower = -1;
  let bestSlot = -1;
  let bestScore = 0;
  for (let slot = 0; slot < 4; slot += 1) {
    if (!legalSlots[slot]) continue;
    if (!fallbackFound) {
      fallbackSlot = slot;
      fallbackFound = true;
    }
    const move = MOVE_BY_ID.get(moveIds[slot]!);
    const power = move?.power ?? 0;
    if (power > fallbackPower) {
      fallbackPower = power;
      fallbackSlot = slot;
    }
    if (!move || power <= 0) continue;
    const { multiplierTenths } = applyTypeEffectiveness(
      power,
      move.type,
      defenderTypes,
      TYPE_EFFECTIVENESS,
    );
    if (multiplierTenths <= 0) continue;
    const stab = attackerTypes[0] === move.type || attackerTypes[1] === move.type;
    const score = power * (multiplierTenths / 10) * (stab ? 1.5 : 1);
    if (score > bestScore) {
      bestScore = score;
      bestSlot = slot;
    }
  }
  return bestSlot >= 0 ? bestSlot : fallbackSlot;
}

/**
 * True when every legal move in `moveIds` is either non-damaging (power 0)
 * or 0x-immune against `defenderTypes` -- i.e. the active cannot deal direct
 * damage at all (Milestone M-B step 2 part C2: resisted-but-nonzero moves,
 * e.g. 0.25x/0.5x, no longer count as walled -- only true immunity does).
 */
function isWalledActive(
  moveIds: readonly number[],
  legalSlots: readonly boolean[],
  defenderTypes: readonly [string, string],
): boolean {
  for (let slot = 0; slot < 4; slot += 1) {
    if (!legalSlots[slot]) continue;
    const move = MOVE_BY_ID.get(moveIds[slot]!);
    if (!move || move.power <= 0) continue;
    const { multiplierTenths } = applyTypeEffectiveness(
      move.power,
      move.type,
      defenderTypes,
      TYPE_EFFECTIVENESS,
    );
    if (multiplierTenths > 0) return false;
  }
  return true;
}

/**
 * A benched party member's best score (same power x effectiveness x STAB
 * formula as `pickWinningFightSlot`), plus whether it qualifies as a
 * super-effective (>= 2x) answer to the opponent's live types. PP-zero moves
 * are skipped when `movePp` is supplied (a real player wouldn't switch in on
 * a move it can no longer use).
 */
function bestBenchMoveScore(
  moveIds: readonly number[],
  attackerTypes: readonly [string, string],
  defenderTypes: readonly [string, string],
  movePp: readonly number[] | undefined,
): { score: number; qualifies: boolean } {
  let bestScore = 0;
  let qualifies = false;
  for (let i = 0; i < moveIds.length; i += 1) {
    if (movePp && movePp[i]! <= 0) continue;
    const move = MOVE_BY_ID.get(moveIds[i]!);
    if (!move || move.power <= 0) continue;
    const { multiplierTenths } = applyTypeEffectiveness(
      move.power,
      move.type,
      defenderTypes,
      TYPE_EFFECTIVENESS,
    );
    if (multiplierTenths <= 0) continue;
    if (multiplierTenths >= 20) qualifies = true;
    const stab = attackerTypes[0] === move.type || attackerTypes[1] === move.type;
    const score = move.power * (multiplierTenths / 10) * (stab ? 1.5 : 1);
    if (score > bestScore) bestScore = score;
  }
  return { score: bestScore, qualifies };
}

export type WinningSwitchBenchCandidate = Readonly<{
  row: 0 | 1 | 2;
  fainted: boolean;
  active: boolean;
  moveIds: readonly number[];
  movePp?: readonly number[];
  types: readonly [string, string];
  hp: number;
  maxHp: number;
}>;

/**
 * "winning" policy voluntary-switch scorer (Milestone M-B step 2 part C,
 * tightened in part C2): when the active is "walled" (every legal move is
 * either non-damaging or 0x-immune against the opponent's live types -- see
 * `isWalledActive`; a merely resisted move, e.g. 0.25x/0.5x, no longer
 * counts) AND a benched, non-fainted party member has a damaging move that
 * is super-effective (>= 2x) against that same opponent AND is at >= 50% of
 * its max HP (`Math.floor((100 * hp) / maxHp) >= 50`, matching the engine's
 * own HP-percent convention, e.g. `factoryAiCheckViability.ts`), returns the
 * best-scoring such bench row (ties keep the lower row). Returns null (no
 * switch -- behave exactly like today's FIGHT-with-scored-move path) when
 * the active isn't walled, when no bench member qualifies, when only one
 * healthy party member remains, or when this same opponent party slot was
 * already switched against once this battle
 * (`alreadySwitchedAgainstThisOpponent` -- the ping-pong guard).
 */
export function pickWinningSwitchRow(input: {
  activeMoveIds: readonly number[];
  activeLegalSlots: readonly boolean[];
  defenderTypes: readonly [string, string];
  bench: readonly WinningSwitchBenchCandidate[];
  healthyCount: number;
  alreadySwitchedAgainstThisOpponent: boolean;
}): 0 | 1 | 2 | null {
  if (input.healthyCount <= 1) return null;
  if (input.alreadySwitchedAgainstThisOpponent) return null;
  if (!isWalledActive(input.activeMoveIds, input.activeLegalSlots, input.defenderTypes)) return null;
  let bestRow: 0 | 1 | 2 | null = null;
  let bestScore = 0;
  for (const candidate of input.bench) {
    if (candidate.active || candidate.fainted) continue;
    if (Math.floor((100 * candidate.hp) / candidate.maxHp) < 50) continue;
    const { score, qualifies } = bestBenchMoveScore(
      candidate.moveIds,
      candidate.types,
      input.defenderTypes,
      candidate.movePp,
    );
    if (!qualifies) continue;
    // Ties keep the lower row regardless of `bench` iteration order.
    if (bestRow === null || score > bestScore || (score === bestScore && candidate.row < bestRow)) {
      bestScore = score;
      bestRow = candidate.row;
    }
  }
  return bestRow;
}

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private readonly next: () => number;
  constructor(seed: number) {
    // Spread nearby integer seeds apart.
    this.next = mulberry32((seed ^ 0x9e3779b9) + seed * 0x85eb_ca6b);
    for (let i = 0; i < 12; i += 1) this.next();
  }
  float(): number {
    return this.next();
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)]!;
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  /** Uniform press gap in frames: 1..max (always >= 1 idle frame). */
  gap(max: number): number {
    return 1 + this.int(max);
  }
}

// ---------------------------------------------------------------------------
// Action log
// ---------------------------------------------------------------------------

type ActionEntry = { frame: number; battle: number; turn: number; what: string };

class ActionLog {
  private readonly entries: ActionEntry[] = [];
  private readonly verbose: boolean;
  private readonly onNote?: (entry: ActionEntry) => void;
  constructor(verbose: boolean, onNote?: (entry: ActionEntry) => void) {
    this.verbose = verbose;
    this.onNote = onNote;
  }
  push(frame: number, battle: number, turn: number, what: string): void {
    this.entries.push({ frame, battle, turn, what });
    if (this.entries.length > 64) this.entries.shift();
    this.onNote?.({ frame, battle, turn, what });
    if (this.verbose) {
      console.log(`  [f=${frame} b${battle} t${turn}] ${what}`);
    }
  }
  tail(n: number): ActionEntry[] {
    return this.entries.slice(-n);
  }
}

// ---------------------------------------------------------------------------
// Per-seed result shape
// ---------------------------------------------------------------------------

export type SeedOutcome = "OK" | "CRASH" | "HANG";

export type SeedResult = {
  seed: number;
  outcome: SeedOutcome;
  /**
   * OK sub-outcome: "budget" (frame budget reached while still making
   * progress — ISSUES #104 retune), "max-rounds" (`--max-rounds` reached),
   * roundComplete | roundLost | milestone:first-action-menu. Also set on a
   * HANG that stalled with some round already decided — the decided
   * round's own outcome (roundComplete | roundLost), so the CLI/summary
   * line reads like a post-decision stall instead of looking like a
   * mid-round one.
   */
  endState?: string;
  frames: number;
  battle: number;
  turn: number;
  errorName?: string;
  errorMessage?: string;
  /** "engine" (src/**), "driver" (tools/soak/**), or "unknown" */
  errorOrigin?: string;
  /** thrown during "tick" or "render" */
  errorPhase?: string;
  stackTop?: string[];
  signature?: string;
  lastActions?: string[];
  hangSurface?: string;
  /**
   * Max over the run, sampled every tick, of the orchestrator's carried-in
   * win streak (`config.factoryWinStreak`) — null only if no orchestrator
   * ever existed. Unlike `RunDiagnostics.carriedWinStreak`, this survives a
   * later loss/re-chain: it is a running maximum, not a snapshot.
   */
  maxCarriedWinStreak: number | null;
  /**
   * Max over the run, sampled every tick, of `config.factoryWinStreak +
   * round.rules.battleIndex` — the deepest battle position ever reached,
   * matching the internal depth formula
   * (`factoryRoundBattleOrchestrator.ts:559`). Null only if no orchestrator
   * ever existed.
   */
  maxBattleDepth: number | null;
  /** Opt-in test diagnostics; absent from ordinary CLI/full/vanilla runs. */
  diagnostics?: RunDiagnostics;
};

export type RunDiagnostics = Readonly<{
  roundPhase: string | null;
  battleIndex: number | null;
  lastBattleOutcome: "win" | "loss" | null;
  opponentGenerationCount: number;
  battleRngSegmentCount: number;
  terminalOutcome: "loss" | "roundWon" | null;
  terminalRecordMenuInputReadyReached: boolean;
  terminalRecordChoice: "yes" | "no" | "cancel" | null;
  renderCalls: number;
  /**
   * The win streak carried INTO the CURRENT orchestrator's round
   * (`config.factoryWinStreak`, `factoryRoundChaining.ts`'s carry — +7 per
   * completed round win, 0 after a loss), read at whatever moment
   * diagnostics happen to be captured. This is a SNAPSHOT, not a maximum:
   * a run that chains a win (carry 7) and then loses the next round can
   * re-chain into a fresh round before diagnostics are taken, resetting
   * this back to 0 even though the run once carried 7. For the run's true
   * peak, use `SeedResult.maxCarriedWinStreak` / `maxBattleDepth` (tracked
   * every tick in `runSeed`), not this field.
   */
  carriedWinStreak: number | null;
}>;

// ---------------------------------------------------------------------------
// Crash signature normalization
// ---------------------------------------------------------------------------

function normalizeMessage(message: string): string {
  return message
    .replace(/\d+/g, "#")
    .replace(/"[^"]*"/g, '"…"')
    .slice(0, 200);
}

function stackFrames(error: Error): string[] {
  const stack = error.stack ?? "";
  return stack
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at "));
}

function shortFrame(frame: string): string {
  // "at fn (file:///…/src/engine/foo.ts:12:3)" -> "fn (src/engine/foo.ts:12)"
  const match = frame.match(/^at (?:(.*?) )?\(?(?:file:\/\/)?([^()]*?):(\d+):\d+\)?$/);
  if (!match) return frame;
  const fn = match[1] ?? "<anon>";
  let file = match[2] ?? "";
  const m2 = file.match(/(?:^|\/)((?:src|tools|tests)\/.*)$/);
  if (m2) file = m2[1]!;
  return `${fn} (${file}:${match[3]})`;
}

function topAppFrame(frames: string[]): string {
  for (const frame of frames) {
    if (frame.includes("/src/")) return shortFrame(frame);
  }
  return frames.length > 0 ? shortFrame(frames[0]!) : "<no stack>";
}

/** Group frame: file + function only (drop line numbers for stability). */
function signatureFrame(frames: string[]): string {
  const top = topAppFrame(frames);
  return top.replace(/:\d+\)$/, ")");
}

function errorOrigin(frames: string[]): string {
  for (const frame of frames) {
    if (frame.includes("/tools/soak/")) return "driver";
    if (frame.includes("/src/")) return "engine";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// The random-play brain: reads EngineState each frame, emits held buttons.
// ---------------------------------------------------------------------------

const NO_BUTTONS: ReadonlySet<GbaButton> = new Set();

/**
 * "full": arbitrary-but-legal play — every UI choice the real menus expose.
 * "vanilla": the plainest player — rent slots 0/1/2, always FIGHT with the
 * first legal move, forced switches take the offered legal pick, swap offers
 * declined, continuation always GO ON. Press timing stays seed-jittered.
 * "winning": opt-in, deep-streak crash coverage (chained-round distribution-
 * parity plan §4 step 3, addressing gap 3 — neither "full" nor "vanilla"
 * biases toward winning, so a soak's natural chained depth almost never
 * strings together consecutive round wins). Reuses "full"'s menu/target
 * exploration verbatim (same summary/postwin-continuation/terminal rolls)
 * for every decision EXCEPT five (Milestone M-B step 2, parts a/b/c):
 * (1) the fight-menu commits the legal move that scores highest on power x
 * type-effectiveness x STAB (see `pickWinningFightSlot`; falls back to
 * highest-power legal move if every legal move scores 0) instead of a
 * uniform-random slot; (2) a voluntary POKéMON party-select (forced
 * switches are unaffected — they're not voluntary) always declines UNLESS
 * part (5) below has already committed to a row this turn; (3) the postwin
 * swap offer always answers NO instead of "full"'s 50/50 roll (the roll is
 * still drawn from the shared RNG stream, matching "full"'s draw at that
 * point, just ignored) — a rental already scouted and played with is worth
 * keeping over an unscouted swap; (4) the draft screen rents the 3
 * highest-scoring offered rentals (see `pickWinningDraftPicks`) in score
 * order, in place of "full"'s random 3-of-6 shuffle; (5) at the action menu,
 * when the active is "walled" (every legal move is non-damaging or 0x-immune
 * against the opponent's live types -- a merely resisted move, e.g.
 * 0.25x/0.5x, does NOT count as walled since part C2) and a benched,
 * non-fainted party member has both a damaging move that is super-effective
 * (>= 2x) against the opponent AND is at >= 50% of its max HP, the
 * action-menu roll (still drawn, same as (3)) is overridden to POKéMON and
 * the committed bench row is sent out (see `pickWinningSwitchRow`) instead
 * of item (2)'s decline — guarded against ping-pong (never re-switches
 * against the same opponent party slot twice in a battle) and against
 * emptying the bench (never switches with only one healthy party member
 * left). Biased, not guaranteed-win — arbitrary-but-legal play in spirit (a
 * real player weighing type matchups, preferring stronger rentals over an
 * unscouted swap, and retreating a truly walled mon to a healthy teammate
 * with a super-effective answer), not an AI oracle.
 */
export type SoakPolicy = "full" | "vanilla" | "winning";
/** Test-only deterministic policy for the source-proven seven-win carrier. */
type PlayerPolicy = SoakPolicy | "strong-route";

type DraftPlan = {
  picks: number[]; // slots 0..5 in rent order
  rented: number;
  peekedSummary: boolean;
};

export class RandomPlayer {
  private cooldown = 0;
  private draft: DraftPlan;
  // Sampled intents, keyed by decision surface identity so a new decision
  // point re-samples.
  private actionIntent: { key: string; target: number; futile: number } | null = null;
  private fightIntent: { key: string; target: number; cancel: boolean; futile: number } | null = null;
  private partyIntent: { key: string; target: 0 | 1 | 2 | "cancel" } | null = null;
  private lastCommandKey = "";
  private turnsThisBattle = 0;
  private lastBattleIndex = 0;
  /** `factoryRoundBattleOrchestrator.config.id` as of the last tick, so a new round at the same `battleIndex` (e.g. battle 1 after a loss) still resets per-battle state. */
  private lastRoundId: string | null = null;
  /** "winning" only: the bench row the action-menu heuristic committed to, consumed by onVoluntaryParty. */
  private pendingSwitchRow: 0 | 1 | 2 | null = null;
  /** "winning" only: opponent partyIndexes already switched against this battle (ping-pong guard). */
  private switchedAgainstOpponentIndices = new Set<number>();
  /** "winning" only: count of voluntary switches the heuristic actually committed to (soak diagnostics). */
  public switchCount = 0;
  public battle = 1;
  public turn = 0;
  private readonly rng: Rng;
  private readonly log: ActionLog;
  private readonly policy: PlayerPolicy;

  /** "full" and "winning" share the same menu/target exploration rolls. */
  private get explores(): boolean {
    return this.policy === "full" || this.policy === "winning";
  }

  constructor(rng: Rng, log: ActionLog, policy: PlayerPolicy) {
    this.rng = rng;
    this.log = log;
    this.policy = policy;
    // Random 3 distinct rental slots, random order (vanilla: first three).
    const slots = [0, 1, 2, 3, 4, 5];
    if (this.explores) {
      for (let i = slots.length - 1; i > 0; i -= 1) {
        const j = rng.int(i + 1);
        [slots[i], slots[j]] = [slots[j]!, slots[i]!];
      }
    }
    this.draft = {
      picks: slots.slice(0, 3),
      rented: 0,
      peekedSummary: this.explores && rng.chance(0.25),
    };
  }

  private press(button: GbaButton, gapMax = 10): ReadonlySet<GbaButton> {
    this.cooldown = this.rng.gap(gapMax);
    return new Set([button]);
  }

  private note(state: EngineState, what: string): void {
    this.log.push(state.frame, this.battle, this.turn, what);
  }

  /** Decide this frame's held buttons. */
  decide(state: EngineState): ReadonlySet<GbaButton> {
    this.trackProgress(state);
    if (this.cooldown > 0) {
      this.cooldown -= 1;
      return NO_BUTTONS;
    }
    const orch = state.factoryRoundBattleOrchestrator;

    // Order mirrors tick()'s own ownership chain.
    if (orch?.battleResolutionPresentation) return this.onResolution(state);
    if (orch?.battleStartIntro) return this.onIntro(state);
    if (orch?.battleCommandPresentation) return this.onCommand(state);
    if (state.lobbyFreeRoam) return NO_BUTTONS; // terminal — runner stops us
    if (state.factoryTerminal) return this.onTerminal(state);
    if (state.postwin) return this.onPostwin(state);
    if (state.battleScene) return this.pressAdvance(state, "battleScene A");
    if (state.battleRoom) return this.pressAdvance(state, "battleRoom A");
    if (state.prebattleRoom) return this.pressAdvance(state, "prebattleRoom A");
    if (state.summaryScreen.isOpen || state.summaryScreen.transition) {
      return this.onSummary(state);
    }
    return this.onDraft(state);
  }

  /** Which surface currently owns input (for HANG reports). */
  surface(state: EngineState): string {
    const orch = state.factoryRoundBattleOrchestrator;
    if (orch?.battleResolutionPresentation) {
      return `resolution:${orch.battleResolutionPresentation.lifecycle.phase}`;
    }
    if (orch?.battleStartIntro) return "battleStartIntro";
    if (orch?.battleCommandPresentation) {
      return `command:${orch.battleCommandPresentation.lifecycle.phase}`;
    }
    if (state.lobbyFreeRoam) return "lobbyFreeRoam";
    if (state.factoryTerminal) return "factoryTerminal";
    if (state.factorySwap) return `factorySwap:${state.factorySwap.controller.phase}`;
    if (state.postwin) return `postwin:page${state.postwin.dialoguePage}`;
    if (state.battleScene) return "battleScene";
    if (state.battleRoom) return `battleRoom:${state.battleRoom.phase}`;
    if (state.prebattleRoom) return `prebattleRoom:${state.prebattleRoom.phase}`;
    if (state.summaryScreen.isOpen) return "summaryScreen";
    return "draftScreen";
  }

  private trackProgress(state: EngineState): void {
    const orch = state.factoryRoundBattleOrchestrator;
    if (!orch) return;
    const battleIndex = orch.round.rules.battleIndex;
    const roundId = orch.config.id;
    if (battleIndex !== this.lastBattleIndex || roundId !== this.lastRoundId) {
      this.lastBattleIndex = battleIndex;
      this.lastRoundId = roundId;
      this.turnsThisBattle = 0;
      this.turn = 0;
      this.switchedAgainstOpponentIndices.clear();
    }
    this.battle = battleIndex + 1;
    const presentation = orch.battleCommandPresentation;
    if (presentation) {
      const key = `${battleIndex}:${presentation.request.requestId}`;
      if (key !== this.lastCommandKey) {
        this.lastCommandKey = key;
        this.turnsThisBattle += 1;
        this.turn = this.turnsThisBattle;
      }
    }
  }

  /** True once battle 1's first live action menu is interactive. */
  reachedFirstActionMenu(state: EngineState): boolean {
    const presentation =
      state.factoryRoundBattleOrchestrator?.battleCommandPresentation;
    return presentation?.lifecycle.phase === "action-menu";
  }

  private pressAdvance(state: EngineState, label: string): ReadonlySet<GbaButton> {
    // Message-advance mash with jittered gaps; occasionally B (harmless
    // everywhere A-advance surfaces live, and it exercises B paths).
    const useB = this.explores && this.rng.chance(0.06);
    this.note(state, `${label}${useB ? " (B)" : ""}`);
    return this.press(useB ? "B" : "A", 22);
  }

  // -- draft ----------------------------------------------------------------

  private onDraft(state: EngineState): ReadonlySet<GbaButton> {
    const draft = state.draftScreen;
    const reveal = draft.confirmReveal;
    if (reveal) {
      if (reveal.phase !== "shown") return NO_BUTTONS;
      // YES/NO confirm for the 3 rentals. Mostly YES; a rare NO exercises the
      // decline/un-reveal path (drops the 3rd pick, which we then re-rent).
      if (draft.yesNoCursorPos === 0) {
        if (this.explores && this.rng.chance(0.06)) {
          this.note(state, "draft confirm: toggle to NO");
          return this.press("DOWN", 8);
        }
        this.note(state, "draft confirm: YES");
        return this.press("A", 8);
      }
      this.note(state, "draft confirm: A on NO (decline)");
      this.draft.rented = 2; // the 3rd pick is dropped; re-rent below
      this.draft.picks[2] = this.rng.int(6);
      return this.press("A", 8);
    }
    if (draft.mode === "cursor") {
      if (!isCursorInputReady(draft.monPic)) return NO_BUTTONS;
      // Find the next planned pick that is not yet rented.
      const target = this.nextDraftTarget(draft.selectedIds);
      if (target === null) return NO_BUTTONS; // waiting for confirm reveal
      if (draft.cursorPos !== target) {
        const right = (target - draft.cursorPos + 6) % 6;
        const left = (draft.cursorPos - target + 6) % 6;
        return this.press(right <= left ? "RIGHT" : "LEFT", 6);
      }
      this.note(state, `draft: open menu on slot ${target}`);
      return this.press("A", 8);
    }
    // Menu mode: steer to RENT (or peek SUMMARY once).
    if (!isMonPicInputReady(draft.monPic)) return NO_BUTTONS;
    const wantSummary = this.draft.peekedSummary === true
      && this.draft.rented === 0
      && this.rng.chance(0.5);
    const target = wantSummary ? MENU_OPTION_SUMMARY : MENU_OPTION_RENT;
    if (draft.menuCursorPos !== target) {
      return this.press(draft.menuCursorPos < target ? "DOWN" : "UP", 6);
    }
    if (wantSummary) {
      this.draft.peekedSummary = false;
      this.note(state, "draft: open SUMMARY");
      return this.press("A", 8);
    }
    this.note(state, `draft: RENT slot ${draft.cursorPos}`);
    this.draft.rented += 1;
    return this.press("A", 10);
  }

  private nextDraftTarget(selectedIds: readonly number[]): number | null {
    const selectedCount = selectedIds.filter((id) => id !== 0).length;
    if (selectedCount >= 3) return null;
    for (const pick of this.draft.picks) {
      if (selectedIds[pick] === 0) return pick;
    }
    // Plan exhausted (e.g. duplicate after a decline): pick a fresh slot.
    for (let slot = 0; slot < 6; slot += 1) {
      if (selectedIds[slot] === 0) {
        this.draft.picks.push(slot);
        return slot;
      }
    }
    return null;
  }

  private onSummary(state: EngineState): ReadonlySet<GbaButton> {
    if (state.summaryScreen.transition || state.summaryScreen.pageTransition
      || state.summaryScreen.monTransition) return NO_BUTTONS;
    // Wander a little, then leave with B.
    if (this.explores && this.rng.chance(0.3)) {
      return this.press(this.rng.pick(["UP", "DOWN", "LEFT", "RIGHT"] as const), 12);
    }
    this.note(state, "summary: exit (B)");
    return this.press("B", 12);
  }

  // -- battle start intro ---------------------------------------------------

  private onIntro(state: EngineState): ReadonlySet<GbaButton> {
    return this.pressAdvance(state, "intro A");
  }

  // -- live command presentation ---------------------------------------------

  private onCommand(state: EngineState): ReadonlySet<GbaButton> {
    const orch = state.factoryRoundBattleOrchestrator!;
    const presentation = orch.battleCommandPresentation!;
    if (orch.battlePartySelect !== null) return this.onVoluntaryParty(state);

    const phase = presentation.lifecycle.phase;
    if (phase === "rejection-message") {
      // PAUSE_UNTIL_PRESS gate; early presses are dropped, so just mash.
      return this.pressAdvance(state, "rejection dismiss");
    }
    if (phase === "action-menu") {
      if (this.actionIntent === null || this.actionIntent.key !== this.lastCommandKey) {
        // FIGHT 0.60 / POKéMON 0.22 / BAG 0.06 / RUN 0.06 / re-roll wander 0.06
        const roll = this.rng.float();
        let target = !this.explores
          ? 0
          : roll < 0.60 ? 0 : roll < 0.82 ? 2 : roll < 0.88 ? 1 : roll < 0.94 ? 3 : this.rng.int(4);
        // "winning" only (M-B step 2 part C): voluntarily switch out of a
        // walled matchup instead of the rolled action. The roll above is
        // still drawn (shared with "full") so its RNG stream is untouched;
        // only the decision it feeds is overridden, like the swap-decline
        // precedent (part B, rung 1).
        this.pendingSwitchRow = this.policy === "winning"
          ? this.computeSwitchRow(orch, presentation)
          : null;
        if (this.pendingSwitchRow !== null) target = 2;
        this.actionIntent = { key: this.lastCommandKey, target, futile: 0 };
        this.note(
          state,
          this.pendingSwitchRow !== null
            ? `action menu intent: POKEMON (winning switch: row ${this.pendingSwitchRow})`
            : `action menu intent: ${["FIGHT", "BAG", "POKEMON", "RUN"][target]}`,
        );
      }
      const intent = this.actionIntent;
      const cursor = presentation.actionCursor;
      if ((cursor & 1) !== (intent.target & 1)) {
        return this.press((intent.target & 1) !== 0 ? "RIGHT" : "LEFT", 8);
      }
      if ((cursor & 2) !== (intent.target & 2)) {
        return this.press((intent.target & 2) !== 0 ? "DOWN" : "UP", 8);
      }
      if (intent.target === 1 || intent.target === 3) {
        // BAG/RUN are real presses the UI ignores; press once, then resample.
        intent.futile += 1;
        if (intent.futile >= 2) {
          this.actionIntent = null;
          this.note(state, "action menu: BAG/RUN noop, resample");
        }
        return this.press("A", 10);
      }
      this.note(state, intent.target === 0 ? "action: FIGHT" : "action: POKEMON");
      this.actionIntent = null;
      return this.press("A", 8);
    }
    if (phase === "fight-menu") {
      const key = `${this.lastCommandKey}:fight`;
      if (this.fightIntent === null || this.fightIntent.key !== key) {
        const active = orch.battle?.rules.rulesContext.battlers[0];
        const firstLegal = Math.max(
          0,
          presentation.legalMoveBySlot.findIndex((slot) => slot !== null),
        );
        // "winning" only: type-effectiveness-aware LEGAL move (see
        // pickWinningFightSlot); falls back to highest-power/lowest-slot.
        const bestEffectivenessSlot = (): number => {
          const battlers = orch.battle?.rules.rulesContext.battlers;
          return pickWinningFightSlot({
            legalSlots: presentation.legalMoveBySlot.map((slot) => slot !== null),
            moveIds: presentation.field.player.moveIds,
            attackerTypes: battlers?.[0]?.types ?? DEFAULT_TYPES,
            defenderTypes: battlers?.[1]?.types ?? DEFAULT_TYPES,
          });
        };
        const target = this.policy === "strong-route"
          && active?.partyIndex === 1
          && active.isFirstTurn === 2
          && presentation.legalMoveBySlot[3] !== null
          ? 3
          : this.policy === "vanilla" || this.policy === "strong-route"
            ? firstLegal
            : this.policy === "winning"
              ? bestEffectivenessSlot()
              : this.rng.int(4);
        this.fightIntent = {
          key,
          target,
          cancel: this.policy === "full" && this.rng.chance(0.10),
          futile: 0,
        };
        const slotMove = presentation.field.player.moveIds[this.fightIntent.target];
        this.note(state, this.fightIntent.cancel
          ? "fight menu intent: cancel (B)"
          : `fight menu intent: slot ${this.fightIntent.target} (move ${slotMove})`);
      }
      const intent = this.fightIntent;
      if (intent.cancel) {
        this.fightIntent = null;
        return this.press("B", 8);
      }
      const cursor = presentation.fightCursor;
      if ((cursor & 1) !== (intent.target & 1)) {
        return this.press((intent.target & 1) !== 0 ? "RIGHT" : "LEFT", 8);
      }
      if ((cursor & 2) !== (intent.target & 2)) {
        return this.press((intent.target & 2) !== 0 ? "DOWN" : "UP", 8);
      }
      const legal = presentation.legalMoveBySlot[intent.target] !== null;
      const rejected = presentation.rejectionReasonBySlot[intent.target] !== null;
      if (!legal && !rejected) {
        // Dead slot (e.g. empty moveslot): the press does nothing. Try it
        // once for realism, then resample.
        intent.futile += 1;
        if (intent.futile >= 2) {
          this.fightIntent = null;
          this.note(state, `fight menu: slot ${intent.target} dead, resample`);
        }
        return this.press("A", 8);
      }
      this.note(state, `fight: confirm slot ${intent.target}${rejected ? " (will reject)" : ""}`);
      this.fightIntent = null;
      return this.press("A", 8);
    }
    // action-enter / fight-opening / fight-closing / rejection-reopen /
    // party-handoff pre-selector / submitting: presentation-owned, no input.
    return NO_BUTTONS;
  }

  /**
   * "winning" only (M-B step 2 part C): decides whether to voluntarily
   * switch out of a walled matchup, reading only what a real player sees --
   * the active's own legal moves, the opponent's live types, and the
   * bench's known species/moves/PP/HP. Marks the ping-pong guard and bumps
   * `switchCount` when it commits to a row.
   */
  private computeSwitchRow(
    orch: NonNullable<EngineState["factoryRoundBattleOrchestrator"]>,
    presentation: NonNullable<
      NonNullable<EngineState["factoryRoundBattleOrchestrator"]>["battleCommandPresentation"]
    >,
  ): 0 | 1 | 2 | null {
    const battle = orch.battle;
    if (!battle) return null;
    const battlers = battle.rules.rulesContext.battlers;
    const activePartyIndex = battlers[0]?.partyIndex;
    const opponentPartyIndex = battlers[1]?.partyIndex;
    if (activePartyIndex === undefined || opponentPartyIndex === undefined) return null;
    const defenderTypes = battlers[1]?.types ?? DEFAULT_TYPES;
    const party = battle.rules.rulesContext.party.player;
    let healthyCount = 0;
    const bench: WinningSwitchBenchCandidate[] = [];
    for (let partyIndex = 0; partyIndex < 3; partyIndex += 1) {
      const member = party[partyIndex];
      if (!member || member.hp <= 0) continue;
      healthyCount += 1;
      if (partyIndex === activePartyIndex) continue;
      bench.push({
        row: partyIndex as 0 | 1 | 2,
        fainted: false,
        active: false,
        moveIds: member.moves,
        movePp: member.pp,
        types: typesForSpecies(member.species),
        hp: member.hp,
        maxHp: member.maxHP,
      });
    }
    const row = pickWinningSwitchRow({
      activeMoveIds: presentation.field.player.moveIds,
      activeLegalSlots: presentation.legalMoveBySlot.map((slot) => slot !== null),
      defenderTypes,
      bench,
      healthyCount,
      alreadySwitchedAgainstThisOpponent: this.switchedAgainstOpponentIndices.has(opponentPartyIndex),
    });
    if (row !== null) {
      this.switchedAgainstOpponentIndices.add(opponentPartyIndex);
      this.switchCount += 1;
    }
    return row;
  }

  private onVoluntaryParty(state: EngineState): ReadonlySet<GbaButton> {
    const orch = state.factoryRoundBattleOrchestrator!;
    const selector = orch.battlePartySelect!;
    if (selector.outcome !== null) return NO_BUTTONS;
    if (selector.message !== null) {
      return this.pressAdvance(state, "party message dismiss");
    }
    if (this.partyIntent === null || this.partyIntent.key !== this.lastCommandKey) {
      // Any row the UI can cursor to, including fainted rows (their SEND OUT
      // shows the no-energy message), plus cancel. "winning" (M-B step 2
      // part C): send out the action-menu heuristic's committed row when one
      // was set (a genuine walled-matchup switch), else decline like before
      // -- forced switches never route through here. Other policies keep
      // their random roll.
      const rawTarget: 0 | 1 | 2 | "cancel" = this.policy === "winning"
        ? (this.pendingSwitchRow ?? "cancel")
        : this.rng.float() < 0.25 ? "cancel" : ([0, 1, 2] as const)[this.rng.int(3)]!;
      this.pendingSwitchRow = null;
      // "winning" only: the UI enforces legality, so if the selector somehow
      // rejects the heuristic's committed row (e.g. it's the active), fall
      // back to cancel rather than press an illegal target. "full"/"vanilla"
      // keep their prior random-roll behaviour verbatim (including rolling
      // onto a fainted/active row, whose own no-energy message the generic
      // press sequence below already handles) -- untouched by this guard.
      const target = this.policy === "winning" && rawTarget !== "cancel" && !selector.rows[rawTarget]!.legal
        ? "cancel"
        : rawTarget;
      this.partyIntent = { key: this.lastCommandKey, target };
      this.note(state, `party intent: ${target === "cancel" ? "cancel" : `row ${target}`}`);
    }
    const intent = this.partyIntent;
    if (selector.submenuOpen) {
      if (intent.target === "cancel") {
        this.partyIntent = null;
        return this.press("B", 8);
      }
      this.note(state, `party: confirm row ${selector.cursor}`);
      this.partyIntent = null;
      return this.press("A", 8);
    }
    if (selector.cursor !== intent.target) {
      // DOWN cycles 0 -> 1 -> 2 -> cancel -> 0.
      return this.press("DOWN", 6);
    }
    if (intent.target === "cancel") {
      this.partyIntent = null;
      this.note(state, "party: cancel");
      return this.press("A", 8);
    }
    return this.press("A", 8); // open SEND OUT submenu
  }

  // -- resolution presentation (message advance + forced switches) -----------

  private onResolution(state: EngineState): ReadonlySet<GbaButton> {
    const orch = state.factoryRoundBattleOrchestrator!;
    const resolution = orch.battleResolutionPresentation!;
    if (
      resolution.lifecycle.phase === "forced-party-handoff"
      && orch.battleForcedPartySelect !== null
    ) {
      return this.onForcedParty(state);
    }
    return this.pressAdvance(state, "resolution advance");
  }

  private onForcedParty(state: EngineState): ReadonlySet<GbaButton> {
    const orch = state.factoryRoundBattleOrchestrator!;
    const selector = orch.battleForcedPartySelect!;
    if (selector.sendOutElapsed !== null) return NO_BUTTONS;
    if (selector.message !== null) {
      return this.pressAdvance(state, "forced-party message dismiss");
    }
    // The forced selector's cursor model: default rests on the fainted slot
    // (A there shows the no-energy message), DOWN moves onto the legal pick.
    if (selector.cursor === "onix") {
      if (this.explores && this.rng.chance(0.3)) {
        this.note(state, "forced party: A on fainted slot");
        return this.press("A", 10);
      }
      this.note(state, "forced party: DOWN to legal slot");
      return this.press("DOWN", 8);
    }
    this.note(state, "forced party: confirm send-out");
    return this.press("A", 10);
  }

  // -- postwin / swap / terminal ---------------------------------------------

  private onPostwin(state: EngineState): ReadonlySet<GbaButton> {
    const postwin = state.postwin!;
    if (state.factorySwap) return this.onFactorySwap(state);
    if (state.battleRoom || state.prebattleRoom) {
      return this.pressAdvance(state, "postwin room advance");
    }
    // Walk-up build step A, Brief 2: brain's call-scene boxes (phone SE,
    // attendant move, 3-page boss message) advance the same generic way
    // every other postwin message box does (the fallback `pressAdvance`
    // below already covers it) -- this branch exists only so soak logs
    // name the surface explicitly instead of falling through unlabeled.
    if (
      postwin.frontierBrain
      && postwin.callScenePage !== 0
      && postwin.callSceneDismissElapsed === null
    ) {
      return this.pressAdvance(state, `postwin brain call-scene box ${postwin.callScenePage}`);
    }
    // RECORD/RETIRE YES/NO question.
    if (
      postwin.question !== null
      && postwin.questionDismissElapsed === null
      && postwin.questionYesElapsed === null
    ) {
      const wantYes = !this.explores
        ? false
        : postwin.question.kind === "retire"
          ? this.rng.chance(0.15)
          : this.rng.chance(0.5);
      const targetPos = wantYes ? 0 : 1;
      if (postwin.questionCursorPos !== targetPos) {
        return this.press(targetPos === 0 ? "UP" : "DOWN", 8);
      }
      this.note(state, `postwin ${postwin.question.kind}: ${wantYes ? "YES" : "NO"}`);
      return this.press("A", 10);
    }
    // Swap offer YES/NO menu (dialogue page 4) -- shared for both routes
    // (brain's short path lands here directly from dialoguePage 1). Checked
    // before the continuation branch below: `acceptPostwinContinuation`
    // (src/engine/postwin.ts:1558-1573) never clears `continuationCursorPos`
    // once GO ON is confirmed, only advances `dialoguePage` away from 0, so
    // without an explicit page gate the continuation branch's condition
    // would still read true here and answer this menu instead (ISSUES #99).
    if (
      postwin.dialoguePage === 4
      && postwin.swapDeclineElapsed === null
      && postwin.swapCursorPos !== null
    ) {
      // "winning" (M-B step 2 part B, rung 1): always decline -- a rental
      // it already chose (now by the draft heuristic below) and has played
      // with is worth keeping over an unscouted swap. The roll is still
      // drawn (this.explores covers both "full" and "winning") so "full"'s
      // own draw here is untouched; only the decision it feeds is overridden.
      const rolledAccept = this.explores && this.rng.chance(0.5);
      const accept = this.policy === "winning" ? false : rolledAccept;
      const targetPos = accept ? 0 : 1;
      if (postwin.swapCursorPos !== targetPos) {
        return this.press(targetPos === 0 ? "UP" : "DOWN", 8);
      }
      this.note(state, `swap offer: ${accept ? "YES" : "NO"}`);
      return this.press("A", 10);
    }
    // Walk-up build step A, Brief 2: brain's AskSwapBeforeHead one-liner
    // (dialoguePage 1) has no scouting pages to cycle through -- it advances
    // generically (the fallback `pressAdvance` below) then jumps straight to
    // the swap prompt (dialoguePage 4, handled above).
    if (postwin.frontierBrain && postwin.dialoguePage === 1) {
      return this.pressAdvance(state, "postwin brain one-liner (AskSwapBeforeHead)");
    }
    // Continuation menu (GO ON / RECORD / REST / RETIRE) -- shared machinery
    // for both the ordinary AskReadyForOpponent menu and brain's own
    // AskReadyForHead (walk-up build step A, Brief 1): the same GO ON/
    // RECORD/REST/RETIRE random exploration already exercises brain's menu
    // too whenever continuationCursorPos is live, no separate branch needed.
    // Gated on `dialoguePage === 0` -- the engine's own live-menu condition
    // (`acceptPostwinContinuation`'s guard) -- so this branch stops matching
    // once GO ON is confirmed and later pages (incl. the swap offer above)
    // take over; see the comment on that branch (ISSUES #99).
    if (
      postwin.question === null
      && postwin.dialoguePage === 0
      && postwin.continuationCursorPos !== null
    ) {
      const roll = this.rng.float();
      const target = !this.explores
        ? 0
        : roll < 0.85 ? 0 : roll < 0.92 ? 1 : roll < 0.96 ? 2 : 3;
      if (postwin.continuationCursorPos !== target) {
        return this.press(postwin.continuationCursorPos < target ? "DOWN" : "UP", 6);
      }
      this.note(
        state,
        `postwin ${postwin.frontierBrain ? "brain " : ""}continuation: `
          + `${["GO ON", "RECORD", "REST", "RETIRE"][target]}`,
      );
      return this.press("A", 12);
    }
    return this.pressAdvance(state, "postwin advance");
  }

  private onFactorySwap(state: EngineState): ReadonlySet<GbaButton> {
    // The swap controller enforces legality internally, so random legal-button
    // exploration (a real player's inputs) covers pickers, quit prompts, the
    // duplicate-species rejection, and the summary detour.
    const roll = this.rng.float();
    const button: GbaButton = roll < 0.40
      ? "A"
      : roll < 0.52
        ? "B"
        : this.rng.pick(["UP", "DOWN", "LEFT", "RIGHT"] as const);
    this.note(state, `swap screen: ${button} (${state.factorySwap!.controller.phase})`);
    return this.press(button, 14);
  }

  private onTerminal(state: EngineState): ReadonlySet<GbaButton> {
    if (this.policy === "strong-route") {
      this.note(state, "terminal: A");
      return this.press("A", 18);
    }
    const roll = this.rng.float();
    const button: GbaButton = roll < 0.6
      ? "A"
      : roll < 0.72
        ? "B"
        : roll < 0.86
          ? "UP"
          : "DOWN";
    this.note(state, `terminal: ${button}`);
    return this.press(button, 18);
  }
}

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

export type RunOptions = {
  maxFrames: number;
  renderEvery: number;
  verbose: boolean;
  policy: SoakPolicy;
  /** Test-only override; intentionally unavailable from the CLI policy flag. */
  testPolicy?: "strong-route";
  /**
   * Test-only initial-state seam. The default is exactly the production
   * draft anchor returned by createInitialState(); the CLI never supplies it.
   */
  stateFactory?: () => EngineState;
  /** Opt into read-only route diagnostics without changing ordinary results. */
  collectDiagnostics?: boolean;
  /**
   * Stop with OK ("milestone:first-action-menu") as soon as battle 1's first
   * live action menu is interactive. This is the Tier-1 pin surface: the
   * whole draft -> prebattle room -> battle room -> generated intro ->
   * first command boundary path, driven by real button presses.
   */
  stopAtFirstActionMenu?: boolean;
  /**
   * Report the FIRST round's own decided outcome (roundComplete/roundLost)
   * even if in-session chaining (factoryRoundChaining.ts) continues playing
   * a freshly generated round past it. Without this, the default grace
   * window's countdown only accumulates frames while SOME round sits
   * decided, so a policy that keeps declining the record menu (and thus
   * keeps re-chaining) can run far longer than one round before the window
   * empties. Pins that care only about a single round's own mechanics
   * (crash-free to its own terminal) want this; the crash-hunting sweep
   * across arbitrarily many chained rounds does not.
   */
  stopAtFirstRoundDecision?: boolean;
  /**
   * Frames of zero observed progress (see `DEFAULT_STALL_FRAMES`) before a
   * run reports HANG. Ignored under `stopAtFirstRoundDecision`, which keeps
   * its own bounded post-decision grace window instead (ISSUES #104 driver
   * retune, PROGRESS ~1368).
   */
  stallFrames?: number;
  /**
   * Finish OK ("max-rounds") once this many round decisions
   * (roundComplete/roundLost) have been observed, regardless of frame
   * budget — a cheap run-length control for gates and tests that only want
   * a bounded number of chained rounds. Default unlimited.
   */
  maxRounds?: number;
  /** Test-only opt-in observer for every action-log note, independent of `verbose`. */
  onNote?: (entry: { frame: number; battle: number; turn: number; what: string }) => void;
};

export const DEFAULT_RUN_OPTIONS: RunOptions = {
  // In-session round chaining (PROGRESS ~1271) lets a single seed play
  // arbitrarily many rounds back to back; 200_000 was sized for one round.
  // 300_000 was believed to comfortably cover the deepest observed
  // default-sweep seed, but ISSUES #90's triage (docs/
  // issue90-seed51-hang-triage.md) falsified that for the "full" policy:
  // seed 51 is not a hang, just a crash-free playthrough that settles at
  // frame 361,216 -- over the old budget. The #89 Baton Pass fix (which
  // used to crash before reaching this point) makes the same-class seed 37
  // run even longer, settling at frame 398,088. 600_000 covers both with
  // real margin. (Superseded per-policy by DEFAULT_MAX_FRAMES_BY_POLICY
  // below; this field is the fallback for a policy absent from that map.)
  maxFrames: 600_000,
  renderEvery: 8,
  verbose: false,
  policy: "full",
};

/**
 * Per-policy default frame budget before an unresolved seed reports HANG.
 * "full"/"vanilla" soak a single round, so 600_000 (ISSUES #90 triage)
 * still applies. "winning" chains multiple complete rounds back-to-back
 * (its continuation roll keeps re-entering GO ON), so per-seed frame cost
 * stacks across rounds and can legitimately exceed a single-round budget
 * without stalling. docs/soak-winning-sweep-2026-08-16.md (seeds 0:60) and
 * docs/soak-winning-sweep-2026-08-16-part2.md (seeds 60:120) swept 120
 * seeds at --max-frames 1_200_000 with zero truncation; the deepest
 * observed completion was seed 49 at frame 693,051. 1_000_000 keeps ~44%
 * headroom over that observed max, matching the proportional margin
 * DEFAULT_RUN_OPTIONS.maxFrames used for "full" (~51% over its 398,088 max).
 */
export const DEFAULT_MAX_FRAMES_BY_POLICY: Record<SoakPolicy, number> = {
  full: 600_000,
  vanilla: 600_000,
  winning: 1_000_000,
};

/** An explicit `maxFrames` always wins; otherwise resolve per policy. */
export function resolveMaxFrames(policy: SoakPolicy, explicit?: number): number {
  return explicit ?? DEFAULT_MAX_FRAMES_BY_POLICY[policy] ?? DEFAULT_RUN_OPTIONS.maxFrames;
}

/**
 * Frames of zero observed progress before a run reports HANG (ISSUES #104
 * driver retune). "Progress" is any change in round identity (a fresh
 * generated round committing, `factoryRoundBattleOrchestrator.config.id` or
 * `pendingGeneratedRound`), `round.rules.battleIndex`, the player's own turn
 * counter, the surface the player currently reads input from
 * (`RandomPlayer.surface`), or `endStateOf(state)`. A stall this long with
 * every one of those signals frozen is a genuine dead lock: a whole live
 * battle turn, a chained round's terminal walk, or a draft/postwin screen
 * all move several of these signals many times a second under real play, so
 * 30,000 frozen frames (~8.3 real-time minutes at 60fps) is generous
 * headroom over any legitimate single dwell, not a tight trip wire.
 */
export const DEFAULT_STALL_FRAMES = 30_000;

function endStateOf(state: EngineState): string | null {
  const phase = state.factoryRoundBattleOrchestrator?.round.rules.phase;
  if (phase === "roundComplete") return "roundComplete";
  if (phase === "roundLost") return "roundLost";
  return null;
}

export function runSeed(seed: number, optionsIn: Partial<RunOptions> = {}): SeedResult {
  const policy = optionsIn.policy ?? DEFAULT_RUN_OPTIONS.policy;
  const maxFrames = resolveMaxFrames(policy, optionsIn.maxFrames);
  const options: RunOptions = { ...DEFAULT_RUN_OPTIONS, ...optionsIn, maxFrames };
  const stallFrames = options.stallFrames ?? DEFAULT_STALL_FRAMES;
  const rng = new Rng(seed);
  const log = new ActionLog(options.verbose, options.onNote);
  const player = new RandomPlayer(rng, log, options.testPolicy ?? options.policy);
  let state = options.stateFactory?.() ?? createInitialState();
  let frame = 0;
  let firstEndState: string | null = null;
  let chainingCommitted = false;
  let firstDecisionSnapshot:
    | { frames: number; battle: number; turn: number; diagnostics: RunDiagnostics }
    | null = null;
  // `stopAtFirstRoundDecision` keeps its own small post-decision grace
  // window, independent of the general stall/budget semantics below, so the
  // FIRST round's own terminal/lobby presentation gets a bounded chance to
  // run before freezing that round's snapshot as the result. `firstEndState`
  // is sticky (set once, never cleared) for this mode, so this window never
  // needs to re-arm.
  let roundDecisionGrace = -1;
  let lastSurface = "";
  let surfaceChangedThisTick = false;
  let renderCalls = 0;
  let terminalRecordMenuInputReadyReached = false;
  let terminalOutcome: RunDiagnostics["terminalOutcome"] = null;
  let maxCarriedWinStreak: number | null = null;
  let maxBattleDepth: number | null = null;

  // ISSUES #104 driver retune: generic stall detection (see
  // DEFAULT_STALL_FRAMES) replaces the old single-purpose post-round-
  // decision grace timer for ordinary runs. With the engine half of #104
  // also fixed, a decided round now always re-chains almost immediately, so
  // the old timer's own expiry-HANG branch was already dead in practice;
  // the real failure mode it never caught was a run that stays busy
  // chaining forever and simply outlives its frame budget, which the old
  // code always reported as HANG regardless of whether it was actually
  // stuck (PROGRESS ~1367's "every seed HANGs" finding).
  let lastProgressFrame = 0;
  let roundDecisions = 0;
  let prevRoundId: string | null = null;
  let prevPendingGenerated = false;
  let prevBattleIndex: number | null = null;
  let prevPlayerTurn = player.turn;
  let prevEnd: string | null = null;

  const observe = (): void => {
    if (state.factoryTerminal !== null) {
      terminalOutcome = state.factoryTerminal.profile.outcome;
      terminalRecordMenuInputReadyReached ||=
        factoryTerminalRecordMenuInputReady(state.factoryTerminal);
    }
    const orchestrator = state.factoryRoundBattleOrchestrator;
    if (orchestrator !== null) {
      const carry = orchestrator.config.factoryWinStreak;
      if (maxCarriedWinStreak === null || carry > maxCarriedWinStreak) {
        maxCarriedWinStreak = carry;
      }
      const depth = carry + orchestrator.round.rules.battleIndex;
      if (maxBattleDepth === null || depth > maxBattleDepth) {
        maxBattleDepth = depth;
      }
    }
  };

  const diagnostics = (): RunDiagnostics => {
    const orchestrator = state.factoryRoundBattleOrchestrator;
    return Object.freeze({
      roundPhase: orchestrator?.round.rules.phase ?? null,
      battleIndex: orchestrator?.round.rules.battleIndex ?? null,
      lastBattleOutcome: orchestrator?.round.rules.lastBattle?.outcome ?? null,
      opponentGenerationCount: orchestrator?.opponentGenerations.length ?? 0,
      battleRngSegmentCount:
        orchestrator?.rngSegments.filter((segment) => segment.kind === "battle").length ?? 0,
      terminalOutcome,
      terminalRecordMenuInputReadyReached,
      terminalRecordChoice: state.factoryTerminal?.recordChoice ?? null,
      renderCalls,
      carriedWinStreak: orchestrator?.config.factoryWinStreak ?? null,
    });
  };

  observe();

  const finish = (outcome: SeedOutcome, extra: Partial<SeedResult>): SeedResult => {
    const result: SeedResult = {
      seed,
      outcome,
      frames: frame,
      battle: player.battle,
      turn: player.turn,
      maxCarriedWinStreak,
      maxBattleDepth,
      lastActions: log.tail(15).map(
        (entry) => `f=${entry.frame} b${entry.battle} t${entry.turn} ${entry.what}`,
      ),
      ...extra,
    };
    return options.collectDiagnostics === true
      ? { ...result, diagnostics: extra.diagnostics ?? diagnostics() }
      : result;
  };

  while (frame < options.maxFrames) {
    let phase = "tick";
    try {
      const buttons = player.decide(state);
      state = tick(state, buttons);
      frame += 1;
      observe();
      const surface = player.surface(state);
      surfaceChangedThisTick = surface !== lastSurface;
      lastSurface = surface;
      if (
        options.renderEvery > 0
        && (surfaceChangedThisTick || frame % options.renderEvery === 0)
      ) {
        phase = "render";
        render(state);
        renderCalls += 1;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const frames = stackFrames(err);
      const origin = errorOrigin(frames);
      const normalized = normalizeMessage(err.message);
      return finish("CRASH", {
        errorName: err.name,
        errorMessage: err.message,
        errorOrigin: origin,
        errorPhase: phase,
        stackTop: frames.slice(0, 3).map(shortFrame),
        signature: `${err.name}: ${normalized} @ ${signatureFrame(frames)}`,
      });
    }

    if (options.stopAtFirstActionMenu === true && player.reachedFirstActionMenu(state)) {
      return finish("OK", { endState: "milestone:first-action-menu" });
    }

    const orch = state.factoryRoundBattleOrchestrator;
    const roundId = orch?.config.id ?? null;
    const pendingGenerated = state.pendingGeneratedRound !== null;
    const battleIndex = orch?.round.rules.battleIndex ?? null;
    const end = endStateOf(state);
    if (end !== null && firstEndState === null) firstEndState = end;
    if (end !== null && prevEnd === null) roundDecisions += 1;
    if (pendingGenerated) chainingCommitted = true;
    if (options.stopAtFirstRoundDecision === true && firstEndState !== null && !chainingCommitted) {
      // Keep refreshing the snapshot every tick the FIRST round's own
      // terminal dialogue still runs (factoryRoundBattleOrchestrator gets
      // cleared partway through it, before pendingGeneratedRound commits —
      // see core.ts's terminal-decline handoff — so endStateOf() alone
      // can't tell "still this round's terminal" from "already chained").
      // pendingGeneratedRound flips non-null at the exact chaining commit,
      // so this freezes the snapshot at the last genuine pre-chain value.
      firstDecisionSnapshot = {
        frames: frame,
        battle: player.battle,
        turn: player.turn,
        diagnostics: diagnostics(),
      };
    }

    // Progress signals (see DEFAULT_STALL_FRAMES doc): any change resets
    // the stall clock.
    const progressed =
      roundId !== prevRoundId
      || pendingGenerated !== prevPendingGenerated
      || battleIndex !== prevBattleIndex
      || player.turn !== prevPlayerTurn
      || surfaceChangedThisTick
      || end !== prevEnd;
    if (progressed) lastProgressFrame = frame;
    prevRoundId = roundId;
    prevPendingGenerated = pendingGenerated;
    prevBattleIndex = battleIndex;
    prevPlayerTurn = player.turn;
    prevEnd = end;

    if (options.stopAtFirstRoundDecision === true) {
      // `firstEndState` is sticky, so once set this branch is taken every
      // remaining tick regardless of later chaining — see the field doc.
      if (firstEndState !== null) {
        if (roundDecisionGrace < 0) roundDecisionGrace = 9_000;
        roundDecisionGrace -= 1;
        if (state.lobbyFreeRoam !== null || roundDecisionGrace === 0) {
          return finish("OK", { endState: firstEndState, ...firstDecisionSnapshot! });
        }
      }
      continue;
    }

    if (state.lobbyFreeRoam !== null) {
      return finish("OK", { endState: end ?? "roundLost" });
    }
    if (options.maxRounds !== undefined && roundDecisions >= options.maxRounds) {
      return finish("OK", { endState: "max-rounds" });
    }
    if (frame - lastProgressFrame >= stallFrames) {
      // Genuine stall: no round identity, battle index, turn, input
      // surface, or decided-round phase has moved in `stallFrames` frames.
      return finish("HANG", { hangSurface: player.surface(state), endState: end ?? undefined });
    }
  }
  // Budget exhausted. Every earlier iteration already checked for a stall
  // (and would have returned HANG), so reaching here means the run was
  // still making genuine progress right up to the frame budget — report OK,
  // not HANG (ISSUES #104 retune: a run that keeps chaining rounds forever
  // is not "stuck", it simply outlived its budget).
  if (options.stopAtFirstRoundDecision === true || options.stopAtFirstActionMenu === true) {
    // Neither milestone was ever reached within budget — a genuine failure
    // to reach the surface this run mode exists to observe.
    return finish("HANG", { hangSurface: player.surface(state) });
  }
  return finish("OK", { endState: "budget" });
}
