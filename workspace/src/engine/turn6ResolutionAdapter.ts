/**
 * Typed predecessor receipt for the next FIGHT command after turn 6.
 *
 * The turn-6 FEATHER_DANCE and ROCK_SLIDE staging modules each prove their
 * own move facts, but neither owns the completed combined turn or the
 * settled redraw/input boundary. This receipt therefore publishes the
 * canonical completed-command boundary directly, just as turn 5's handoff
 * does; it must not be gated on either staged result being present.
 */
import { rentalMoveset } from "./battleSetup.ts";
import {
  FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  MENU_IDLE_BLANK_END_TICK,
  TURN6_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN6_ROCKSLIDE_PRESS_TICK,
  TURN6_SUPER_EFFECTIVE_LINE,
} from "./battleMenu.ts";
import {
  createLatestCompletedCommandHandoff,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";
import {
  createFightCommandPresentation,
  type FightCommandPresentation,
} from "./fightCommandPresentation.ts";
import { resolveTurn6FeatherDanceWindowContent } from "./turn6FeatherDancePresentationStaging.ts";
import {
  resolveTurn7AtkFellLines,
  resolveTurn7FeatherDanceKickoffLines,
  resolveTurn7FeatherDanceWindowContent,
} from "./turn78FeatherDancePresentationStaging.ts";
import {
  resolveTurn6RockSlideWindowContent,
  resolveTurn7RockSlideAttackLines,
  resolveTurn7RockSlideWindowContent,
} from "./turn67RockSlidePresentationStaging.ts";

const ONIX_MAX_HP = 117;
const PIDGEOTTO_MAX_HP = 156;

export type Turn6CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-6 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 6's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 6's completed-command facts independently of its individual
 * move stages. The canonical receipt contains five ROCK_SLIDE uses (turns 1,
 * 3, 4, 5, and 6) and turn 2's one DRAGON_BREATH use.
 */
export function resolveTurn6CompletedResolutionNextCommandHandoff(): Turn6CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 5,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Semantic field/bounce/move content for the following Pidgeotto command. */
export function resolveTurn6FightCommandPresentation(): FightCommandPresentation {
  const precedingFeatherDance = resolveTurn6FeatherDanceWindowContent();
  const precedingRockSlide = resolveTurn6RockSlideWindowContent();
  const featherDance = resolveTurn7FeatherDanceWindowContent();
  const rockSlide = resolveTurn7RockSlideWindowContent();
  const redrawTick = TURN6_ROCKSLIDE_PRESS_TICK + TURN6_ROCKSLIDE_MENU_REDRAW_DELAY;
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
        preFreezeTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
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
          text: { lines: resolveTurn7FeatherDanceKickoffLines() },
          statChange: {
            target: "player",
            stat: featherDance.statChange.stat,
            from: featherDance.statChange.from,
            to: featherDance.statChange.to,
            text: { lines: resolveTurn7AtkFellLines() },
          },
        },
        {
          user: "player",
          target: "opponent",
          move: "ROCK_SLIDE",
          text: { lines: resolveTurn7RockSlideAttackLines() },
          hpChange: {
            target: "opponent",
            from: rockSlide.hp.from,
            to: rockSlide.hp.to,
          },
          effectiveness: { text: { lines: [TURN6_SUPER_EFFECTIVE_LINE] } },
        },
      ],
    },
  });
}

/** Normalizes the legacy turn-6 receipt into the generic command boundary. */
export function resolveTurn6LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    {
      ...resolveTurn6CompletedResolutionNextCommandHandoff(),
      content: resolveTurn6FightCommandPresentation(),
    },
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn6NextCommandHandoffReady(
  handoff: Turn6CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn6CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
