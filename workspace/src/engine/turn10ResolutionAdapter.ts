/**
 * Typed predecessor receipt for the next FIGHT command after turn 10.
 *
 * The turn-10 move staging remains independent from this completed boundary:
 * this receipt publishes the canonical post-turn facts directly, just as the
 * turn-5 through turn-9 handoffs do. It must not be gated on a turn-10 move
 * staging module.
 */
import { rentalMoveset } from "./battleSetup.ts";
import {
  FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  MENU_IDLE_BLANK_END_TICK,
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
import {
  resolveTurn11AtkFloorLines,
  resolveTurn11FeatherDanceKickoffLines,
  resolveTurn11FeatherDanceWindowContent,
} from "./turn11FeatherDancePresentationStaging.ts";
import { resolveTurn6RockSlideAttackLines } from "./turn67RockSlidePresentationStaging.ts";

const ONIX_MAX_HP = 117;
const PIDGEOTTO_MAX_HP = 156;
const TURN11_COMMAND_MENU_REDRAW_TICK = 12_169 + 730;
const TURN10_ONIX_BEFORE_AERIAL_ACE_HP = 24;
const TURN10_ONIX_AFTER_AERIAL_ACE_HP = 14;
const TURN10_PIDGEOTTO_AFTER_ROCK_SLIDE_HP = 38;
const TURN11_PIDGEOTTO_AFTER_ROCK_SLIDE_HP = 16;

/**
 * Turn 10's own (first) AERIAL_ACE HP-drain endpoints (24 -> 14), the
 * owning adapter for `battleScene.ts`'s `turn10AerialAceHp` closed-form
 * call site at the turn-10 window (species-dossier slice 3,
 * `docs/species-render-entry-point-retirement-design.md` §4 row 3), the
 * way `TURN13_DRAGONBREATH_HP.{from,to}` already lives on
 * `turn13ResolutionAdapter.ts`.
 */
export const TURN10_AERIALACE_HP: Readonly<{ from: number; to: number }> = Object.freeze({
  from: TURN10_ONIX_BEFORE_AERIAL_ACE_HP,
  to: TURN10_ONIX_AFTER_AERIAL_ACE_HP,
});

export type Turn10CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-10 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 10's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 10's completed-command facts independently of move staging.
 * The canonical receipt contains eight ROCK_SLIDE uses (turns 1, 3, 4, 5,
 * 6, 7, 9, and 10), turn 8's one BIND use, and turn 2's one DRAGON_BREATH use.
 */
export function resolveTurn10CompletedResolutionNextCommandHandoff(): Turn10CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 8,
      bind - 1,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Semantic field/bounce/move content for the following floored-ATK command. */
export function resolveTurn10FightCommandPresentation(): FightCommandPresentation {
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
        attackStage: featherDance.statChange.from,
      },
      opponent: {
        species: "PIDGEOTTO",
        displayName: "PIDGEOTTO",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: TURN10_PIDGEOTTO_AFTER_ROCK_SLIDE_HP, max: PIDGEOTTO_MAX_HP },
        attackStage: 6,
      },
    },
    bounce: {
      actionMenuRedrawTick: TURN11_COMMAND_MENU_REDRAW_TICK,
      idleBounceEpochTick: MENU_IDLE_BLANK_END_TICK + 1,
      fightSubmenuTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
      kickoff: {
        freezeAfterConfirmTicks: FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
        preFreezeTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
        frozenBounceTick: TURN11_COMMAND_MENU_REDRAW_TICK,
      },
    },
    upcoming: {
      firstTextStartDelay: 13,
      moves: [
        {
          user: "opponent",
          target: "player",
          move: "FEATHER_DANCE",
          text: { lines: resolveTurn11FeatherDanceKickoffLines() },
          statChange: {
            target: "player",
            stat: featherDance.statChange.stat,
            from: featherDance.statChange.from,
            to: featherDance.statChange.to,
            text: { lines: resolveTurn11AtkFloorLines() },
          },
        },
        {
          user: "player",
          target: "opponent",
          move: "ROCK_SLIDE",
          text: { lines: resolveTurn6RockSlideAttackLines() },
          hpChange: {
            target: "opponent",
            from: TURN10_PIDGEOTTO_AFTER_ROCK_SLIDE_HP,
            to: TURN11_PIDGEOTTO_AFTER_ROCK_SLIDE_HP,
          },
          effectiveness: { text: { lines: [TURN6_SUPER_EFFECTIVE_LINE] } },
        },
      ],
    },
  });
}

/** Normalizes the legacy turn-10 receipt into the generic command boundary. */
export function resolveTurn10LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    {
      ...resolveTurn10CompletedResolutionNextCommandHandoff(),
      content: resolveTurn10FightCommandPresentation(),
    },
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn10NextCommandHandoffReady(
  handoff: Turn10CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn10CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
