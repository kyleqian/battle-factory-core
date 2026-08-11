/**
 * Typed predecessor receipt for the next FIGHT command after turn 11.
 *
 * The turn-11 opponent-move staging remains independent from this completed
 * boundary: this receipt publishes the canonical post-turn facts directly,
 * just as the turn-5 through turn-10 handoffs do. It must not be gated on
 * `turn11FeatherDancePresentationStaging.ts`.
 */
import { rentalMoveset } from "./battleSetup.ts";
import {
  FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  MENU_IDLE_BLANK_END_TICK,
} from "./battleMenu.ts";
import {
  createLatestCompletedCommandHandoff,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";
import {
  createFightCommandPresentation,
  type FightCommandPresentation,
} from "./fightCommandPresentation.ts";
import { resolveTurn11FeatherDanceWindowContent } from "./turn11FeatherDancePresentationStaging.ts";
import { resolveTurn8MissLines } from "./turn8BindPresentationStaging.ts";

const ONIX_MAX_HP = 117;
const PIDGEOTTO_MAX_HP = 156;
const TURN12_COMMAND_MENU_REDRAW_TICK = 13_137 + 729;
const TURN10_ONIX_AFTER_AERIAL_ACE_HP = 14;
const TURN11_PIDGEOTTO_AFTER_ROCK_SLIDE_HP = 16;
const TURN12_ONIX_AFTER_AERIAL_ACE_HP = 4;

export type Turn11CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-11 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 11's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 11's completed-command facts independently of move staging.
 * The canonical receipt contains nine ROCK_SLIDE uses (turns 1, 3, 4, 5, 6,
 * 7, 9, 10, and 11), turn 8's one BIND use, and turn 2's one
 * DRAGON_BREATH use.
 */
export function resolveTurn11CompletedResolutionNextCommandHandoff(): Turn11CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 9,
      bind - 1,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Semantic field/bounce/move content for the following AERIAL_ACE/miss command. */
export function resolveTurn11FightCommandPresentation(): FightCommandPresentation {
  const featherDance = resolveTurn11FeatherDanceWindowContent();
  return createFightCommandPresentation({
    field: {
      player: {
        species: "ONIX",
        displayName: "ONIX",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: TURN10_ONIX_AFTER_AERIAL_ACE_HP, max: ONIX_MAX_HP },
        attackStage: featherDance.statChange.to,
      },
      opponent: {
        species: "PIDGEOTTO",
        displayName: "PIDGEOTTO",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: TURN11_PIDGEOTTO_AFTER_ROCK_SLIDE_HP, max: PIDGEOTTO_MAX_HP },
        attackStage: 6,
      },
    },
    bounce: {
      actionMenuRedrawTick: TURN12_COMMAND_MENU_REDRAW_TICK,
      idleBounceEpochTick: MENU_IDLE_BLANK_END_TICK + 1,
      fightSubmenuTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
      kickoff: {
        freezeAfterConfirmTicks: FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
        preFreezeTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
        frozenBounceTick: TURN12_COMMAND_MENU_REDRAW_TICK,
      },
    },
    upcoming: {
      firstTextStartDelay: 11,
      moves: [
        {
          user: "opponent",
          target: "player",
          move: "AERIAL_ACE",
          text: { lines: ["Foe PIDGEOTTO used", "AERIAL ACE!"] },
          hpChange: {
            target: "player",
            from: TURN10_ONIX_AFTER_AERIAL_ACE_HP,
            to: TURN12_ONIX_AFTER_AERIAL_ACE_HP,
          },
          effectiveness: { text: { lines: ["It’s not very effective…"] } },
        },
        {
          user: "player",
          target: "opponent",
          move: "ROCK_SLIDE",
          text: { lines: ["ONIX used", "ROCK SLIDE!"] },
          miss: {
            target: "opponent",
            text: { lines: resolveTurn8MissLines() },
          },
        },
      ],
    },
  });
}

/** Normalizes the legacy turn-11 receipt into the generic command boundary. */
export function resolveTurn11LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    {
      ...resolveTurn11CompletedResolutionNextCommandHandoff(),
      content: resolveTurn11FightCommandPresentation(),
    },
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn11NextCommandHandoffReady(
  handoff: Turn11CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn11CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
