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
import movesData from "../../src/data/gen/moves.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Move power lookup (for the "winning" policy's fight-move bias only)
// ---------------------------------------------------------------------------

const MOVE_POWER_BY_ID = new Map<number, number>(
  (movesData as { moves: { id: number; power: number }[] }).moves.map(
    (move) => [move.id, move.power],
  ),
);

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
  constructor(verbose: boolean) {
    this.verbose = verbose;
  }
  push(frame: number, battle: number, turn: number, what: string): void {
    this.entries.push({ frame, battle, turn, what });
    if (this.entries.length > 64) this.entries.shift();
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
  /** OK sub-outcome: roundComplete | roundLost | milestone:first-action-menu */
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
   * The win streak carried INTO the current orchestrator's round
   * (`config.factoryWinStreak`, `factoryRoundChaining.ts`'s carry — +7 per
   * completed round win, 0 after a loss). Combined with `battleIndex`, this
   * is exactly the internal `config.factoryWinStreak + battleIndex` formula
   * (`factoryRoundBattleOrchestrator.ts:559`) — the deepest chained-streak
   * value this run reached before its outcome, used by the soak depth
   * report (chained-round distribution-parity plan §4 step 3), not read by
   * ordinary CLI/full/vanilla runs.
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
 * exploration verbatim (same draft/summary/postwin/swap/terminal rolls) for
 * every decision EXCEPT two: the fight-menu commits the highest-power legal
 * damaging move instead of a uniform-random slot, and a voluntary POKéMON
 * party-select (forced switches are unaffected — they're not voluntary)
 * always declines rather than "full"'s random target/cancel roll. Biased,
 * not guaranteed-win — arbitrary-but-legal play in spirit, not an AI oracle.
 */
export type SoakPolicy = "full" | "vanilla" | "winning";
/** Test-only deterministic policy for the source-proven seven-win carrier. */
type PlayerPolicy = SoakPolicy | "strong-route";

type DraftPlan = {
  picks: number[]; // slots 0..5 in rent order
  rented: number;
  peekedSummary: boolean;
};

class RandomPlayer {
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
    if (battleIndex !== this.lastBattleIndex) {
      this.lastBattleIndex = battleIndex;
      this.turnsThisBattle = 0;
      this.turn = 0;
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
        const target = !this.explores
          ? 0
          : roll < 0.60 ? 0 : roll < 0.82 ? 2 : roll < 0.88 ? 1 : roll < 0.94 ? 3 : this.rng.int(4);
        this.actionIntent = { key: this.lastCommandKey, target, futile: 0 };
        this.note(state, `action menu intent: ${["FIGHT", "BAG", "POKEMON", "RUN"][target]}`);
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
        // "winning" only: highest-power LEGAL move, ties toward the lower slot.
        const bestDamagingSlot = (): number => {
          let bestSlot = firstLegal;
          let bestPower = -1;
          for (let slot = 0; slot < 4; slot += 1) {
            if (presentation.legalMoveBySlot[slot] === null) continue;
            const power = MOVE_POWER_BY_ID.get(presentation.field.player.moveIds[slot]) ?? 0;
            if (power > bestPower) {
              bestPower = power;
              bestSlot = slot;
            }
          }
          return bestSlot;
        };
        const target = this.policy === "strong-route"
          && active?.partyIndex === 1
          && active.isFirstTurn === 2
          && presentation.legalMoveBySlot[3] !== null
          ? 3
          : this.policy === "vanilla" || this.policy === "strong-route"
            ? firstLegal
            : this.policy === "winning"
              ? bestDamagingSlot()
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

  private onVoluntaryParty(state: EngineState): ReadonlySet<GbaButton> {
    const orch = state.factoryRoundBattleOrchestrator!;
    const selector = orch.battlePartySelect!;
    if (selector.outcome !== null) return NO_BUTTONS;
    if (selector.message !== null) {
      return this.pressAdvance(state, "party message dismiss");
    }
    if (this.partyIntent === null || this.partyIntent.key !== this.lastCommandKey) {
      // Any row the UI can cursor to, including fainted rows (their SEND OUT
      // shows the no-energy message), plus cancel. "winning" always declines
      // a voluntary switch (forced switches never route through here).
      const target: 0 | 1 | 2 | "cancel" = this.policy === "winning"
        ? "cancel"
        : this.rng.float() < 0.25 ? "cancel" : ([0, 1, 2] as const)[this.rng.int(3)]!;
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
    // Continuation menu (GO ON / RECORD / REST / RETIRE) -- shared machinery
    // for both the ordinary AskReadyForOpponent menu and brain's own
    // AskReadyForHead (walk-up build step A, Brief 1): the same GO ON/
    // RECORD/REST/RETIRE random exploration already exercises brain's menu
    // too whenever continuationCursorPos is live, no separate branch needed.
    if (postwin.question === null && postwin.continuationCursorPos !== null) {
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
    // Walk-up build step A, Brief 2: brain's AskSwapBeforeHead one-liner
    // (dialoguePage 1) has no scouting pages to cycle through -- it advances
    // generically (the fallback `pressAdvance` below) then jumps straight to
    // the swap prompt (dialoguePage 4, handled next). Explicit branch only
    // for a clearer soak-log label.
    if (postwin.frontierBrain && postwin.dialoguePage === 1) {
      return this.pressAdvance(state, "postwin brain one-liner (AskSwapBeforeHead)");
    }
    // Swap offer YES/NO menu (dialogue page 4) -- shared for both routes
    // (brain's short path lands here directly from dialoguePage 1).
    if (
      postwin.dialoguePage === 4
      && postwin.swapDeclineElapsed === null
      && postwin.swapCursorPos !== null
    ) {
      const accept = this.explores && this.rng.chance(0.5);
      const targetPos = accept ? 0 : 1;
      if (postwin.swapCursorPos !== targetPos) {
        return this.press(targetPos === 0 ? "UP" : "DOWN", 8);
      }
      this.note(state, `swap offer: ${accept ? "YES" : "NO"}`);
      return this.press("A", 10);
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
  // real margin.
  maxFrames: 600_000,
  renderEvery: 8,
  verbose: false,
  policy: "full",
};

function endStateOf(state: EngineState): string | null {
  const phase = state.factoryRoundBattleOrchestrator?.round.rules.phase;
  if (phase === "roundComplete") return "roundComplete";
  if (phase === "roundLost") return "roundLost";
  return null;
}

export function runSeed(seed: number, optionsIn: Partial<RunOptions> = {}): SeedResult {
  const options: RunOptions = { ...DEFAULT_RUN_OPTIONS, ...optionsIn };
  const rng = new Rng(seed);
  const log = new ActionLog(options.verbose);
  const player = new RandomPlayer(rng, log, options.testPolicy ?? options.policy);
  let state = options.stateFactory?.() ?? createInitialState();
  let frame = 0;
  let terminalGrace = -1;
  let firstEndState: string | null = null;
  let chainingCommitted = false;
  let firstDecisionSnapshot:
    | { frames: number; battle: number; turn: number; diagnostics: RunDiagnostics }
    | null = null;
  let lastSurface = "";
  let renderCalls = 0;
  let terminalRecordMenuInputReadyReached = false;
  let terminalOutcome: RunDiagnostics["terminalOutcome"] = null;

  const observe = (): void => {
    if (state.factoryTerminal !== null) {
      terminalOutcome = state.factoryTerminal.profile.outcome;
      terminalRecordMenuInputReadyReached ||=
        factoryTerminalRecordMenuInputReady(state.factoryTerminal);
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
      const surfaceChanged = surface !== lastSurface;
      lastSurface = surface;
      if (
        options.renderEvery > 0
        && (surfaceChanged || frame % options.renderEvery === 0)
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

    const end = endStateOf(state);
    if (end !== null && firstEndState === null) firstEndState = end;
    if (state.pendingGeneratedRound !== null) chainingCommitted = true;
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
    const graceActive = options.stopAtFirstRoundDecision === true
      ? firstEndState !== null
      : (end !== null || state.lobbyFreeRoam !== null);
    if (graceActive) {
      // Round decided. Keep ticking a grace window so the terminal/lobby
      // presentations (their own crash surface) still run, then stop.
      if (terminalGrace < 0) terminalGrace = 9_000;
      terminalGrace -= 1;
      if (terminalGrace === 0 || state.lobbyFreeRoam !== null) {
        return options.stopAtFirstRoundDecision === true
          ? finish("OK", { endState: firstEndState!, ...firstDecisionSnapshot! })
          : finish("OK", { endState: end ?? "roundLost" });
      }
    }
  }
  return finish("HANG", { hangSurface: player.surface(state) });
}
