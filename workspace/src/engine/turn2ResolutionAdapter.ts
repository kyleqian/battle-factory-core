/**
 * Typed completed-turn receipt for the next command after turn 2.
 *
 * The receipt is published by the source-owned
 * HandleInputChooseAction/DoBounceEffect reset. Its epoch belongs to the
 * completed turn, while the later turn-3 FIGHT open (and any B-close/A-reopen
 * descended from it) only consumes that immutable epoch.
 */
import { rentalMoveset } from "./battleSetup.ts";
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
import { resolveTurn2EndeavorAttackLines } from "./turn2EndeavorPresentationStaging.ts";
import { resolveTurn3RockSlideHpEndpoints } from "./turn3RockSlidePresentationStaging.ts";

/** The source-owned action-menu bounce table origin shared by early epochs. */
const TURN2_IDLE_BOUNCE_EPOCH_TICK = 1748;
/** Turn 3's FIGHT open plus its independently pinned Family-B retardation. */
const TURN3_FIGHT_SUBMENU_BOUNCE_OFFSET = -3;
/** HandleInputChooseMove stops polling the turn-3 bounce drivers after three ticks. */
const TURN3_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS = 3;
/** The frozen plateau is the content epoch evaluated at confirm + 9, including -3 above. */
const TURN3_KICKOFF_FROZEN_PRESS_OFFSET = 6;
const ONIX_MAX_HP = 117;
const GROVYLE_MAX_HP = 143;

export type Turn2CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-2 PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 2's DRAGON_BREATH command. */
  persistedMoveSlot: 2;
  /** Exact field HP after the completed second turn. */
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
 * Publishes completed turn-2 facts at the modeled choose-action reset.
 * A later A which opens FIGHT for turn 3 must not recreate or re-anchor it.
 */
export function resolveTurn2CompletedResolutionNextCommandHandoff(
  presentationEpochElapsed: number,
): Turn2CompletedResolutionNextCommandHandoff {
  if (!Number.isInteger(presentationEpochElapsed) || presentationEpochElapsed < 0) {
    throw new Error("turn-2 presentation epoch requires a non-negative runtime elapsed value");
  }
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 1,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 2 as const,
    hp: Object.freeze({ player: 101, opponent: 88 }),
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
 * Semantic generic content for the command that follows turn 2. The source
 * reset, field snapshot, and repeated ENDEAVOR/ROCK_SLIDE stream all belong
 * to this completed-command owner; neither a PP tuple nor a predecessor
 * redraw delay selects the turn-3 route.
 */
export function resolveTurn2FightCommandPresentation(
  handoff: Turn2CompletedResolutionNextCommandHandoff,
): FightCommandPresentation {
  const rockSlide = resolveTurn3RockSlideHpEndpoints();
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
      idleBounceEpochTick: TURN2_IDLE_BOUNCE_EPOCH_TICK,
      fightSubmenuTickOffset: TURN3_FIGHT_SUBMENU_BOUNCE_OFFSET,
      kickoff: {
        freezeAfterConfirmTicks: TURN3_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS,
        preFreezeTickOffset: TURN3_FIGHT_SUBMENU_BOUNCE_OFFSET,
        frozenPressTickOffset: TURN3_KICKOFF_FROZEN_PRESS_OFFSET,
      },
    },
    presentationEpoch: handoff.presentationEpoch,
    upcoming: {
      // The reopened turn-3 FIGHT path shows its first character nine ticks
      // after confirmation (the source-owned reopened-menu family).
      firstTextStartDelay: 9,
      moves: [
        {
          user: "opponent",
          target: "player",
          move: "ENDEAVOR",
          text: { lines: resolveTurn2EndeavorAttackLines() },
          // ENDEAVOR's real set-damage-to-health-difference result: at this
          // boundary Onix becomes equal to Grovyle's current HP (101 -> 88).
          hpChange: {
            target: "player",
            from: handoff.hp.player,
            to: handoff.hp.opponent,
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
          effectiveness: { text: { lines: ["It’s super effective!"] } },
        },
      ],
    },
  });
}

/** Publishes turn 2 through the generic completed-command owner. */
export function resolveTurn2LatestCompletedCommandHandoff(
  presentationEpochElapsed: number,
): LatestCompletedCommandHandoff {
  const handoff = resolveTurn2CompletedResolutionNextCommandHandoff(
    presentationEpochElapsed,
  );
  return createLatestCompletedCommandHandoff({
    playerPp: handoff.playerPp,
    persistedMoveSlot: handoff.persistedMoveSlot,
    nextCommand: handoff.nextCommand,
    content: resolveTurn2FightCommandPresentation(handoff),
  });
}

/**
 * Narrows a generic owner to the semantic turn-3 command shape. The move
 * stream and field facts carry the identity; slot 2 is checked only as an
 * invariant of the completed receipt, never as a route selector.
 */
export function turn2FightCommandPresentationFromLatest(
  latest: LatestCompletedCommandHandoff | null | undefined,
): FightCommandPresentation | null {
  const epoch = latestCompletedCommandPresentationEpoch(latest);
  const content = latest?.content;
  const moves = content?.upcoming?.moves;
  const endeavor = moves?.[0];
  const rockSlide = moves?.[1];
  if (
    !isLatestCompletedCommandHandoffReady(latest)
    || epoch === null
    || content === undefined
    || endeavor?.user !== "opponent"
    || endeavor.target !== "player"
    || endeavor.move !== "ENDEAVOR"
    || rockSlide?.user !== "player"
    || rockSlide.target !== "opponent"
    || rockSlide.move !== "ROCK_SLIDE"
    || content.field.player.hp.current !== 101
    || content.field.opponent.hp.current !== 88
  ) {
    return null;
  }
  if (latest.persistedMoveSlot !== 2) {
    throw new Error("turn-2 ENDEAVOR command content requires the persisted DRAGON_BREATH slot");
  }
  return content;
}

/**
 * Temporary positional-ABI view for the still-legacy turn-3/4 renderers.
 * It reads generic semantic content only; live BattleSceneState no longer
 * needs a separate turn-2 field once the field-cut checkpoint lands.
 */
export function turn2CompletedResolutionNextCommandHandoffFromLatest(
  latest: LatestCompletedCommandHandoff | null | undefined,
): Turn2CompletedResolutionNextCommandHandoff | null {
  const content = turn2FightCommandPresentationFromLatest(latest);
  const epoch = latestCompletedCommandPresentationEpoch(latest);
  if (content === null || epoch === null || latest === null || latest === undefined) return null;
  return Object.freeze({
    playerPp: latest.playerPp,
    persistedMoveSlot: 2 as const,
    hp: Object.freeze({
      player: content.field.player.hp.current,
      opponent: content.field.opponent.hp.current,
    }),
    presentationEpoch: epoch,
    nextCommand: latest.nextCommand,
  });
}

/**
 * The turn-3 command lifecycle consumes the generic turn-2 receipt's own
 * epoch.  This deliberately identifies the semantic ENDEAVOR/ROCK_SLIDE
 * content before reading its age; no predecessor redraw delay participates.
 */
export function isTurn2LatestCompletedCommandLifecycleActive(
  latest: LatestCompletedCommandHandoff | null | undefined,
  openElapsed: number | null,
): boolean {
  return turn2FightCommandPresentationFromLatest(latest) !== null
    && isLatestCompletedCommandLifecycleActive(latest, openElapsed);
}

/** Typed gate shared by the turn-3 controller and presentation readers. */
export function isTurn2NextCommandHandoffReady(
  handoff: Turn2CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn2CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand?.redraw === "settled"
    && handoff.nextCommand?.input === "ready";
}

/**
 * The original turn-2 submenu predates this reset. Only a later turn-3
 * command lifecycle can consume its epoch, including same-turn reopens.
 */
export function isTurn2NextCommandLifecycleActive(
  handoff: Turn2CompletedResolutionNextCommandHandoff | null | undefined,
  openElapsed: number | null,
): handoff is Turn2CompletedResolutionNextCommandHandoff {
  return isTurn2NextCommandHandoffReady(handoff)
    && openElapsed !== null
    && openElapsed > handoff.presentationEpoch.elapsed;
}

/** Runtime-relative age of the fresh DoBounceEffect epoch. */
export function turn2PresentationEpochElapsedSinceReset(
  handoff: Turn2CompletedResolutionNextCommandHandoff,
  currentElapsed: number,
): number {
  return currentElapsed - handoff.presentationEpoch.elapsed;
}
