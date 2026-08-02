/**
 * Typed completed-turn receipt for the next command after turn 1.
 *
 * Unlike the later three-role receipts, this boundary also owns the field HP
 * and the fresh HandleInputChooseAction/DoBounceEffect presentation epoch.
 * Its elapsed value is the runtime scene clock at the reset event; it is not
 * an oracle capture tick and must not be replaced by the later FIGHT reopen.
 */
import { rentalMoveset } from "./battleSetup.ts";
import {
  createFightCommandPresentation,
  type FightCommandPresentation,
} from "./fightCommandPresentation.ts";
import {
  createLatestCompletedCommandHandoff,
  isLatestCompletedCommandHandoffReady,
  latestCompletedCommandPresentationEpoch,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";

/** The canonical source-owned action-menu bounce table origin. */
const TURN1_IDLE_BOUNCE_EPOCH_TICK = 1748;
/** The ordinary FIGHT DMA-open shift, carried as content rather than a predecessor delay. */
const TURN1_FIGHT_SUBMENU_BOUNCE_OFFSET = -2;
/** HandleInputChooseMove stops polling the bounce drivers nine ticks after confirmation. */
const TURN1_FOLLOWING_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS = 9;
/** The source-owned frozen bounce-table phase after the following command confirms. */
const TURN1_FOLLOWING_KICKOFF_FROZEN_BOUNCE_EPOCH_TICK = 2119;
const ONIX_MAX_HP = 117;
const GROVYLE_MAX_HP = 143;

export type Turn1CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-1 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 1's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** Exact field HP after the completed first turn. */
  hp: Readonly<{ player: number; opponent: number }>;
  /**
   * The fresh source-owned bounce epoch emitted by the first execution of
   * HandleInputChooseAction after the redraw DMA completes.
   */
  presentationEpoch: Readonly<{
    owner: "HandleInputChooseAction";
    reset: "DoBounceEffect";
    /** Runtime-relative battle-scene elapsed value at the reset event. */
    elapsed: number;
    mon: Readonly<{ seed: 192; delta: 7; amplitude: 1 }>;
    healthbox: Readonly<{ seed: 128; delta: 7; amplitude: 1 }>;
  }>;
  /** The next action-menu redraw is visible and may consume input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes the completed turn-1 facts at the modeled choose-action reset.
 * Callers supply the current engine elapsed value exactly when
 * HandleInputChooseAction runs DoBounceEffect; a later A that reopens FIGHT
 * only consumes this immutable receipt.
 */
export function resolveTurn1CompletedResolutionNextCommandHandoff(
  presentationEpochElapsed: number,
): Turn1CompletedResolutionNextCommandHandoff {
  if (!Number.isInteger(presentationEpochElapsed) || presentationEpochElapsed < 0) {
    throw new Error("turn-1 presentation epoch requires a non-negative runtime elapsed value");
  }
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 1,
      bind,
      dragonBreath,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    hp: Object.freeze({ player: 117, opponent: 101 }),
    presentationEpoch: Object.freeze({
      owner: "HandleInputChooseAction" as const,
      reset: "DoBounceEffect" as const,
      elapsed: presentationEpochElapsed,
      mon: Object.freeze({ seed: 192 as const, delta: 7 as const, amplitude: 1 as const }),
      healthbox: Object.freeze({ seed: 128 as const, delta: 7 as const, amplitude: 1 as const }),
    }),
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/**
 * Semantic generic content for the command that follows turn 1.  The field
 * snapshot and the DoBounceEffect epoch are both frozen at the actual
 * controller reset; `upcoming` remains null because turns 2-4 retain their
 * dedicated command-content owners until their own migration slices.
 */
export function resolveTurn1FightCommandPresentation(
  handoff: Turn1CompletedResolutionNextCommandHandoff,
): FightCommandPresentation {
  return createFightCommandPresentation({
    field: {
      player: {
        species: "ONIX",
        displayName: "ONIX",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: handoff.hp.player, max: ONIX_MAX_HP },
        attackStage: 6,
      },
      opponent: {
        species: "GROVYLE",
        displayName: "GROVYLE",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: handoff.hp.opponent, max: GROVYLE_MAX_HP },
        attackStage: 6,
      },
    },
    bounce: {
      actionMenuRedrawTick: handoff.presentationEpoch.elapsed,
      idleBounceEpochTick: TURN1_IDLE_BOUNCE_EPOCH_TICK,
      fightSubmenuTickOffset: TURN1_FIGHT_SUBMENU_BOUNCE_OFFSET,
      kickoff: {
        freezeAfterConfirmTicks: TURN1_FOLLOWING_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS,
        preFreezeTickOffset: TURN1_FIGHT_SUBMENU_BOUNCE_OFFSET,
        frozenBounceEpochTick: TURN1_FOLLOWING_KICKOFF_FROZEN_BOUNCE_EPOCH_TICK,
      },
    },
    presentationEpoch: handoff.presentationEpoch,
    upcoming: null,
  });
}

/**
 * Publishes the turn-1 completed-command boundary through the generic owner
 * without erasing the staged positional ABI used by turns 2-4.
 */
export function resolveTurn1LatestCompletedCommandHandoff(
  presentationEpochElapsed: number,
): LatestCompletedCommandHandoff {
  const handoff = resolveTurn1CompletedResolutionNextCommandHandoff(
    presentationEpochElapsed,
  );
  return createLatestCompletedCommandHandoff({
    playerPp: handoff.playerPp,
    persistedMoveSlot: handoff.persistedMoveSlot,
    nextCommand: handoff.nextCommand,
    content: resolveTurn1FightCommandPresentation(handoff),
  });
}

/**
 * Temporary positional-ABI view for the still-legacy turn-2–4 renderers.
 * It reads only the generic receipt's semantic content; it never reaches a
 * retired BattleSceneState field or chooses an episode from PP values.
 */
export function turn1CompletedResolutionNextCommandHandoffFromLatest(
  latest: LatestCompletedCommandHandoff | null | undefined,
): Turn1CompletedResolutionNextCommandHandoff | null {
  const epoch = latestCompletedCommandPresentationEpoch(latest);
  if (!isLatestCompletedCommandHandoffReady(latest) || epoch === null) return null;
  const content = latest.content;
  // A later early-boundary owner also carries an epoch.  It is not a malformed
  // turn-1 receipt; decline it by its semantic content before checking the
  // turn-1 slot invariant so generic ownership can advance across epochs.
  if (
    content === undefined
    || content.upcoming !== null
    || content.field.player.hp.current !== 117
    || content.field.opponent.hp.current !== 101
  ) return null;
  if (latest.persistedMoveSlot !== 0) {
    throw new Error("turn-1 epoch content requires the persisted ROCK_SLIDE slot");
  }
  return Object.freeze({
    playerPp: latest.playerPp,
    persistedMoveSlot: 0 as const,
    hp: Object.freeze({
      player: content.field.player.hp.current,
      opponent: content.field.opponent.hp.current,
    }),
    presentationEpoch: epoch,
    nextCommand: latest.nextCommand,
  });
}

/** Typed gate shared by the next-command controller and renderer. */
export function isTurn1NextCommandHandoffReady(
  handoff: Turn1CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn1CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}

/**
 * The following command lifecycle is distinct from receipt publication: the
 * original turn-1 submenu predates the reset, while a later FIGHT open (and
 * any same-turn close/reopen descended from it) consumes the same epoch.
 */
export function isTurn1NextCommandLifecycleActive(
  handoff: Turn1CompletedResolutionNextCommandHandoff | null | undefined,
  openElapsed: number | null,
): handoff is Turn1CompletedResolutionNextCommandHandoff {
  return isTurn1NextCommandHandoffReady(handoff)
    && openElapsed !== null
    && openElapsed > handoff.presentationEpoch.elapsed;
}

/** Runtime-relative age of the fresh DoBounceEffect epoch. */
export function turn1PresentationEpochElapsedSinceReset(
  handoff: Turn1CompletedResolutionNextCommandHandoff,
  currentElapsed: number,
): number {
  return currentElapsed - handoff.presentationEpoch.elapsed;
}
