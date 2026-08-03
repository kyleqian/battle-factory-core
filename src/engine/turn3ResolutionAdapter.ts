/**
 * Typed completed-turn receipt for the next command after turn 3.
 *
 * The receipt is published by the source-owned
 * HandleInputChooseAction/DoBounceEffect reset. Its epoch belongs to the
 * completed turn, while the later turn-4 FIGHT open (and any B-close/A-reopen
 * descended from it) only consumes that immutable epoch.
 */
import { rentalMoveset } from "./battleSetup.ts";
import { STAT_ROSE_LINE1, STAT_ROSE_LINE2 } from "./battleMenu.ts";
import {
  createFightCommandPresentation,
  type FightCommandPresentation,
} from "./fightCommandPresentation.ts";
import {
  createLatestCompletedCommandHandoff,
  isLatestCompletedCommandHandoffReady,
  isLatestCompletedCommandLifecycleActive,
  latestCompletedCommandPresentationEpoch,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";
import { resolveTurn1RockSlideAttackLines } from "./turn1RockSlidePresentationStaging.ts";
import {
  resolveTurn4DoubleTeamKickoffLines,
  resolveTurn4DoubleTeamWindowContent,
} from "./turn4DoubleTeamPresentationStaging.ts";
import { resolveTurn4RockSlideHpEndpoints } from "./turn4RockSlidePresentationStaging.ts";

/** The source-owned action-menu bounce table origin shared by early epochs. */
const TURN3_IDLE_BOUNCE_EPOCH_TICK = 1748;
/** Turn 4's FIGHT open bounce offset - unlike turns 2/3, no extra pixel-fit adjustment applies (turn4SubmenuBounceTick composes directly off the receipt's own resettled tick, see its own doc). */
const TURN4_FIGHT_SUBMENU_BOUNCE_OFFSET = -2;
/** HandleInputChooseMove stops polling the turn-4 bounce drivers after three ticks. */
const TURN4_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS = 3;
/** The frozen plateau is the content epoch evaluated at confirm - 11, folded through the same -2 submenu offset. */
const TURN4_KICKOFF_FROZEN_PRESS_OFFSET = -13;
const ONIX_MAX_HP = 117;
const GROVYLE_MAX_HP = 143;

export type Turn3CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-3 PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 3's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** Exact field HP after the completed third turn. */
  hp: Readonly<{ player: number; opponent: number }>;
  /** Fresh source-owned bounce epoch at the first next-action controller tick. */
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
 * Publishes completed turn-3 facts at the modeled choose-action reset.
 * A later A which opens FIGHT for turn 4 must not recreate or re-anchor it.
 */
export function resolveTurn3CompletedResolutionNextCommandHandoff(
  presentationEpochElapsed: number,
): Turn3CompletedResolutionNextCommandHandoff {
  if (!Number.isInteger(presentationEpochElapsed) || presentationEpochElapsed < 0) {
    throw new Error("turn-3 presentation epoch requires a non-negative runtime elapsed value");
  }
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 2,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    hp: Object.freeze({ player: 88, opponent: 41 }),
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
 * Semantic generic content for the command that follows turn 3. The source
 * reset, field snapshot, and DOUBLE_TEAM/ROCK_SLIDE stream all belong to
 * this completed-command owner; neither a PP tuple nor a predecessor redraw
 * delay selects the turn-4 route.
 */
export function resolveTurn3FightCommandPresentation(
  handoff: Turn3CompletedResolutionNextCommandHandoff,
): FightCommandPresentation {
  const rockSlide = resolveTurn4RockSlideHpEndpoints();
  const doubleTeam = resolveTurn4DoubleTeamWindowContent();
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
      idleBounceEpochTick: TURN3_IDLE_BOUNCE_EPOCH_TICK,
      fightSubmenuTickOffset: TURN4_FIGHT_SUBMENU_BOUNCE_OFFSET,
      kickoff: {
        freezeAfterConfirmTicks: TURN4_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS,
        preFreezeTickOffset: TURN4_FIGHT_SUBMENU_BOUNCE_OFFSET,
        frozenPressTickOffset: TURN4_KICKOFF_FROZEN_PRESS_OFFSET,
      },
    },
    presentationEpoch: handoff.presentationEpoch,
    upcoming: {
      // Turn 4's own kickoff text starts printing immediately at confirm -
      // no reopened-menu delay like turn 3's ENDEAVOR-again half needed.
      firstTextStartDelay: 0,
      moves: [
        {
          user: "opponent",
          target: "opponent",
          move: "DOUBLE_TEAM",
          text: { lines: resolveTurn4DoubleTeamKickoffLines() },
          statChange: {
            target: "opponent",
            stat: doubleTeam.statChange.stat,
            from: doubleTeam.statChange.from,
            to: doubleTeam.statChange.to,
            text: { lines: [STAT_ROSE_LINE1, STAT_ROSE_LINE2] },
          },
        },
        {
          user: "player",
          target: "opponent",
          move: "ROCK_SLIDE",
          text: { lines: resolveTurn1RockSlideAttackLines() },
          hpChange: {
            target: "opponent",
            from: rockSlide.from,
            to: rockSlide.to,
          },
        },
      ],
    },
  });
}

/** Publishes turn 3 through the generic completed-command owner. */
export function resolveTurn3LatestCompletedCommandHandoff(
  presentationEpochElapsed: number,
): LatestCompletedCommandHandoff {
  const handoff = resolveTurn3CompletedResolutionNextCommandHandoff(
    presentationEpochElapsed,
  );
  return createLatestCompletedCommandHandoff({
    playerPp: handoff.playerPp,
    persistedMoveSlot: handoff.persistedMoveSlot,
    nextCommand: handoff.nextCommand,
    content: resolveTurn3FightCommandPresentation(handoff),
  });
}

/**
 * Narrows a generic owner to the semantic turn-4 command shape. The move
 * stream and field facts carry the identity; slot 0 is checked only as an
 * invariant of the completed receipt, never as a route selector.
 */
export function turn3FightCommandPresentationFromLatest(
  latest: LatestCompletedCommandHandoff | null | undefined,
): FightCommandPresentation | null {
  const epoch = latestCompletedCommandPresentationEpoch(latest);
  const content = latest?.content;
  const moves = content?.upcoming?.moves;
  const doubleTeam = moves?.[0];
  const rockSlide = moves?.[1];
  if (
    !isLatestCompletedCommandHandoffReady(latest)
    || epoch === null
    || content === undefined
    || doubleTeam?.user !== "opponent"
    || doubleTeam.target !== "opponent"
    || doubleTeam.move !== "DOUBLE_TEAM"
    || rockSlide?.user !== "player"
    || rockSlide.target !== "opponent"
    || rockSlide.move !== "ROCK_SLIDE"
    || content.field.player.hp.current !== 88
    || content.field.opponent.hp.current !== 41
  ) {
    return null;
  }
  if (latest.persistedMoveSlot !== 0) {
    throw new Error("turn-3 ROCK_SLIDE command content requires the persisted ROCK_SLIDE slot");
  }
  return content;
}

/**
 * Temporary positional-ABI view for the still-legacy turn-4 renderer. It
 * reads generic semantic content only; live BattleSceneState no longer
 * needs a separate turn-3 field once the field-cut checkpoint lands.
 */
export function turn3CompletedResolutionNextCommandHandoffFromLatest(
  latest: LatestCompletedCommandHandoff | null | undefined,
): Turn3CompletedResolutionNextCommandHandoff | null {
  const content = turn3FightCommandPresentationFromLatest(latest);
  const epoch = latestCompletedCommandPresentationEpoch(latest);
  if (content === null || epoch === null || latest === null || latest === undefined) return null;
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

/**
 * The turn-4 command lifecycle consumes the generic turn-3 receipt's own
 * epoch. This deliberately identifies the semantic DOUBLE_TEAM/ROCK_SLIDE
 * content before reading its age; no predecessor redraw delay participates.
 */
export function isTurn3LatestCompletedCommandLifecycleActive(
  latest: LatestCompletedCommandHandoff | null | undefined,
  openElapsed: number | null,
): boolean {
  return turn3FightCommandPresentationFromLatest(latest) !== null
    && isLatestCompletedCommandLifecycleActive(latest, openElapsed);
}

/** Typed gate shared by the turn-4 controller and presentation readers. */
export function isTurn3NextCommandHandoffReady(
  handoff: Turn3CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn3CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}

/**
 * The original turn-3 submenu predates this reset. Only a later turn-4
 * command lifecycle can consume its epoch, including same-turn reopens.
 */
export function isTurn3NextCommandLifecycleActive(
  handoff: Turn3CompletedResolutionNextCommandHandoff | null | undefined,
  openElapsed: number | null,
): handoff is Turn3CompletedResolutionNextCommandHandoff {
  return isTurn3NextCommandHandoffReady(handoff)
    && openElapsed !== null
    && openElapsed > handoff.presentationEpoch.elapsed;
}

/** Runtime-relative age of the fresh DoBounceEffect epoch. */
export function turn3PresentationEpochElapsedSinceReset(
  handoff: Turn3CompletedResolutionNextCommandHandoff,
  currentElapsed: number,
): number {
  return currentElapsed - handoff.presentationEpoch.elapsed;
}
