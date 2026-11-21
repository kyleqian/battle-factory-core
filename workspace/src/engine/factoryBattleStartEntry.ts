/**
 * pau4: the battle-start entry scripts' (Intimidate / Trace, and wbh1's White Herb) presentation, between the player release and the
 * first command prompt.
 *
 * The kernel runs each entry script as its own machine (one instruction row per frame, a `pause` retrying), so an event's
 * `instructionExecution` is its frame offset from the script start and `rows` the script's whole length. Each script's
 * commands are the ordinary resolution projection of its events (print, stat row, STATS_CHANGE animation, held-item animation); the
 * frames before the first event and after the last print's wait are the script's own rows. The "Go! X!" box stays up through all of it.
 * Presentation only: the kernel events, RNG and digests are untouched.
 */

import {
  ENTRY_SCRIPT_END_HELD_ROWS,
  HELD_ITEM_EFFECT_COMMAND_FRAMES,
  HELD_ITEM_EFFECT_ENTRY_LEAD_FRAMES,
  projectBattleResolutionCommands,
} from "./battleResolutionPresentation.ts";
import type {
  BattleResolutionPresentationCommand,
  BattleResolutionPresentationState,
} from "./battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "./battleResolutionPresentationRender.ts";
import type { BattleCommandPresentationState } from "./battleCommandPresentation.ts";
import type { BattleState } from "./battleDecisionBoundary.ts";
import type { FactoryBattleStartEntryScript } from "./factoryBattleStart.ts";
import type { FactoryFullTurnDecisionRules } from "./factoryBattleScriptFullTurnDecision.ts";

export { ENTRY_SCRIPT_END_HELD_ROWS };
/** Blank-box rows between the last script's wait and the action prompt (BattleTurnPassed's HandleTurnActionSelectionState rows). */
export const ENTRY_SCRIPT_END_BLANK_ROWS = 6;
const GO_PRINTED_ELAPSED = 1000;

export type FactoryBattleStartEntryState = Readonly<{
  /** Frames since the intro's command-ready callback. */
  elapsed: number;
  /** `commands[commandIndex]` is presented for `length` frames, the last one also covering the script rows around it. */
  schedule: readonly Readonly<{ commandIndex: number; length: number }>[];
  total: number;
  /** The synthetic "Go! X!" + script commands resolution the frames are drawn from. */
  base: BattleResolutionPresentationState;
  /** The fresh action menu, settled when the phase ends. */
  command: BattleCommandPresentationState;
}>;

export function createFactoryBattleStartEntry(
  scripts: readonly FactoryBattleStartEntryScript[],
  goLines: readonly string[],
  battle: BattleState<FactoryFullTurnDecisionRules>,
  command: BattleCommandPresentationState,
): FactoryBattleStartEntryState | null {
  if (scripts.length === 0 || scripts.every((script) => script.events.length === 0)) return null;
  const request = battle.boundary.kind === "decision-required" && battle.boundary.request.kind === "command"
    ? battle.boundary.request
    : null;
  if (request === null) return null;
  const rules = battle.rules;
  const field = command.field;
  const go: BattleResolutionPresentationCommand = Object.freeze({
    type: "message" as const,
    eventSequence: -1,
    lines: Object.freeze([...goLines]),
    advance: "automatic" as const,
    noCursor: false,
    timing: Object.freeze({ minimumFrames: 0, holdFrames: 0 }),
  });
  const commands: BattleResolutionPresentationCommand[] = [go];
  const schedule: { commandIndex: number; length: number }[] = [];
  scripts.forEach((script) => {
    if (script.events.length === 0) return;
    const first = script.events[0]!;
    const projected = projectBattleResolutionCommands(script.events, rules.rulesContext, rules.rulesContext, field, null)
      .filter((candidate) => candidate.type !== "turn-end")
      // wbh1: a hold the projection puts before the script's first print (Scene OFF's BattleScript_Pausex20 for B_ANIM_HELD_ITEM_EFFECT,
      // heldItemEffectOffHoldFrames) counts the script's leading rows, which `lead` below already presents.
      .filter((candidate) => !(candidate.type === "move-animation" && candidate.eventSequence === first.sequence))
      // wbh1: the held-item command runs from its `playanimation` row to the print (HELD_ITEM_EFFECT_ENTRY_LEAD_FRAMES), not from a
      // previous command's end as in a turn.
      .map((candidate) => candidate.type === "general-animation" && candidate.animation === "HELD_ITEM_EFFECT"
        ? Object.freeze({
          ...candidate,
          timing: Object.freeze({ ...candidate.timing, minimumFrames: HELD_ITEM_EFFECT_COMMAND_FRAMES + HELD_ITEM_EFFECT_ENTRY_LEAD_FRAMES }),
        })
        : candidate);
    const lead = first.provenance?.instructionExecution ?? 0;
    // The previous command (the Go! box, or the previous script's last print) is held through this script's leading rows. A later
    // script is set up on the frame after the previous one's last presented frame and runs its row N N frames after that (wbh1: ROM
    // rows of sta6m-both-off, Intimidate's pop at 2087, TraceActivates set up at 2088, its print at 2088 + 33 = 2121).
    extend(schedule, commands.length - 1, lead);
    const last = [...script.events].reverse().find((event) => event.payload.kind === "message");
    const printed = [...projected].reverse().find((candidate) => candidate.type === "message");
    const closing = last === undefined || printed === undefined || printed.type !== "message"
      ? 0
      : Math.max(0, script.rows - (last.provenance?.instructionExecution ?? 0) - 1 - printed.timing.holdFrames)
        + ENTRY_SCRIPT_END_HELD_ROWS + script.popRows;
    projected.forEach((candidate, at) => {
      commands.push(candidate);
      let length = battleResolutionCommandDuration(candidate, field);
      const following = projected[at + 1];
      if (candidate.type === "stat" && following?.type === "stats-change") {
        const from = script.events.find((event) => event.sequence === candidate.eventSequence)?.provenance?.instructionExecution;
        const to = script.events.find((event) => event.sequence === following.eventSequence)?.provenance?.instructionExecution;
        if (from !== undefined && to !== undefined) length = Math.max(length, to - from);
      }
      schedule.push({ commandIndex: commands.length - 1, length });
    });
    extend(schedule, commands.length - 1, closing);
  });
  // The script's end3 returns to the turn loop: the box clears (the next-command handoff's blank box) until the action prompt.
  schedule.push({ commandIndex: commands.length, length: ENTRY_SCRIPT_END_BLANK_ROWS });
  const total = schedule.reduce((sum, item) => sum + item.length, 0);
  const base = Object.freeze({
    resolutionId: Object.freeze({ requestId: request.requestId, side: "player" as const, battler: 0 as const }),
    sourceDecision: Object.freeze({ kind: "use-move" as const, moveSlot: 0 }) as never,
    segments: Object.freeze([Object.freeze({
      field,
      beforeRules: rules,
      afterRules: rules,
      events: Object.freeze(scripts.flatMap((script) => script.events)),
      commands: Object.freeze(commands),
    })]),
    segmentIndex: 0,
    commandIndex: 0,
    lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
    fadeTick: 0,
    confirmHandoff: null,
    field,
    pendingBoundary: battle.boundary,
    pendingBattle: battle,
    forcedRequest: null,
    opponentTrainer: null,
  }) as BattleResolutionPresentationState;
  return Object.freeze({ elapsed: 0, schedule: Object.freeze(schedule), total, base, command });
}

function extend(
  schedule: { commandIndex: number; length: number }[],
  commandIndex: number,
  frames: number,
): void {
  if (frames === 0) return;
  let at = schedule.length - 1;
  while (at >= 0 && schedule[at]!.commandIndex !== commandIndex) at -= 1;
  if (at >= 0) {
    schedule[at] = { commandIndex, length: schedule[at]!.length + frames };
  } else {
    schedule.push({ commandIndex, length: frames });
  }
}

export function advanceFactoryBattleStartEntry(entry: FactoryBattleStartEntryState): FactoryBattleStartEntryState {
  return Object.freeze({ ...entry, elapsed: entry.elapsed + 1 });
}

export function factoryBattleStartEntryComplete(entry: FactoryBattleStartEntryState): boolean {
  return entry.elapsed >= entry.total;
}

/** The synthetic resolution as it stands at the entry phase's current frame. */
export function factoryBattleStartEntryFrame(entry: FactoryBattleStartEntryState): BattleResolutionPresentationState {
  let remaining = Math.min(entry.elapsed, entry.total - 1);
  for (const item of entry.schedule) {
    if (remaining < item.length) {
      if (item.commandIndex >= entry.base.segments[0]!.commands.length) {
        return Object.freeze({
          ...entry.base,
          commandIndex: item.commandIndex,
          lifecycle: Object.freeze({ phase: "next-command-handoff" as const, phaseElapsed: remaining }),
        });
      }
      return Object.freeze({
        ...entry.base,
        commandIndex: item.commandIndex,
        // The Go! box is already fully printed when the phase starts.
        lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: item.commandIndex === 0 ? remaining + GO_PRINTED_ELAPSED : remaining }),
      });
    }
    remaining -= item.length;
  }
  return entry.base;
}
