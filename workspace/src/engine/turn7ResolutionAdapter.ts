/**
 * Typed predecessor receipt for the next FIGHT command after turn 7.
 *
 * The turn-7 FEATHER_DANCE and ROCK_SLIDE staging modules each prove their
 * own move facts, but neither owns the completed combined turn or the
 * settled redraw/input boundary. This receipt therefore publishes the
 * canonical completed-command boundary directly, just as the turn-5 and
 * turn-6 handoffs do; it must not be gated on either staged result being
 * present.
 */
import { rentalMoveset } from "./battleSetup.ts";
import {
  FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  MENU_IDLE_BLANK_END_TICK,
  TURN7_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN7_ROCKSLIDE_PRESS_TICK,
} from "./battleMenu.ts";
import {
  createLatestCompletedCommandHandoff,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";
import {
  createFightCommandPresentation,
  type FightCommandPresentation,
} from "./fightCommandPresentation.ts";
import {
  resolveTurn7FeatherDanceWindowContent,
  resolveTurn8AtkFellLines,
  resolveTurn8FeatherDanceKickoffLines,
  resolveTurn8FeatherDanceWindowContent,
} from "./turn78FeatherDancePresentationStaging.ts";
import {
  resolveTurn7RockSlideWindowContent,
} from "./turn67RockSlidePresentationStaging.ts";
import {
  resolveTurn8BindKickoffLines,
  resolveTurn8MissLines,
} from "./turn8BindPresentationStaging.ts";

const ONIX_MAX_HP = 117;
const PIDGEOTTO_MAX_HP = 156;

export type Turn7CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-7 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 7's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 7's completed-command facts independently of its individual
 * move stages. The canonical receipt contains six ROCK_SLIDE uses (turns 1,
 * 3, 4, 5, 6, and 7) and turn 2's one DRAGON_BREATH use.
 */
export function resolveTurn7CompletedResolutionNextCommandHandoff(): Turn7CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 6,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Semantic field/bounce/move content for the following Pidgeotto command. */
export function resolveTurn7FightCommandPresentation(): FightCommandPresentation {
  const precedingFeatherDance = resolveTurn7FeatherDanceWindowContent();
  const precedingRockSlide = resolveTurn7RockSlideWindowContent();
  const featherDance = resolveTurn8FeatherDanceWindowContent();
  const redrawTick = TURN7_ROCKSLIDE_PRESS_TICK + TURN7_ROCKSLIDE_MENU_REDRAW_DELAY;
  return createFightCommandPresentation({
    field: {
      player: {
        species: "ONIX",
        displayName: "ONIX",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: 31, max: ONIX_MAX_HP },
        attackStage: precedingFeatherDance.statChange.to,
      },
      opponent: {
        species: "PIDGEOTTO",
        displayName: "PIDGEOTTO",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: precedingRockSlide.hp.to, max: PIDGEOTTO_MAX_HP },
        attackStage: 6,
      },
    },
    bounce: {
      actionMenuRedrawTick: redrawTick,
      idleBounceEpochTick: MENU_IDLE_BLANK_END_TICK + 1,
      fightSubmenuTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
      kickoff: {
        freezeAfterConfirmTicks: FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
        preFreezeTickOffset: 0,
        frozenBounceTick: redrawTick,
      },
    },
    upcoming: {
      firstTextStartDelay: 13,
      moves: [
        {
          user: "opponent",
          target: "player",
          move: "FEATHER_DANCE",
          text: { lines: resolveTurn8FeatherDanceKickoffLines() },
          statChange: {
            target: "player",
            stat: featherDance.statChange.stat,
            from: featherDance.statChange.from,
            to: featherDance.statChange.to,
            text: { lines: resolveTurn8AtkFellLines() },
          },
        },
        {
          user: "player",
          target: "opponent",
          move: "BIND",
          text: { lines: resolveTurn8BindKickoffLines() },
          miss: {
            target: "opponent",
            text: { lines: resolveTurn8MissLines() },
          },
        },
      ],
    },
  });
}

/** Normalizes the legacy turn-7 receipt into the generic command boundary. */
export function resolveTurn7LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    {
      ...resolveTurn7CompletedResolutionNextCommandHandoff(),
      content: resolveTurn7FightCommandPresentation(),
    },
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn7NextCommandHandoffReady(
  handoff: Turn7CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn7CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
