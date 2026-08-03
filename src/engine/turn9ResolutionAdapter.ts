/**
 * Typed predecessor receipt for the next FIGHT command after turn 9.
 *
 * The turn-9 move staging remains independent from this completed boundary:
 * this receipt publishes the canonical post-turn facts directly, just as the
 * turn-5 through turn-8 handoffs do. It must not be gated on a turn-9 move
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
  type FightCommandUpcomingPresentation,
} from "./fightCommandPresentation.ts";
import { resolveTurn6RockSlideAttackLines } from "./turn67RockSlidePresentationStaging.ts";

const ONIX_MAX_HP = 117;
const PIDGEOTTO_MAX_HP = 156;
/** Turn 9's BIND-miss successor redraw, which begins the turn-10 bounce epoch. */
const TURN10_COMMAND_MENU_REDRAW_TICK = 10_871 + 465;
const TURN9_ONIX_BEFORE_QUICK_ATTACK_HP = 31;
const TURN9_ONIX_AFTER_QUICK_ATTACK_HP = 24;
const TURN9_PIDGEOTTO_AFTER_ROCK_SLIDE_HP = 61;
const TURN10_ONIX_AFTER_AERIAL_ACE_HP = 14;
const TURN10_PIDGEOTTO_AFTER_ROCK_SLIDE_HP = 38;

/**
 * Turn 9's own QUICK_ATTACK HP-drain endpoints (31 -> 24), the owning
 * adapter for `battleScene.ts`'s `turn9Hp` closed-form call site (species-
 * dossier slice 3, `docs/species-render-entry-point-retirement-design.md`
 * §4 row 3), the way `TURN13_DRAGONBREATH_HP.{from,to}` already lives on
 * `turn13ResolutionAdapter.ts`.
 */
export const TURN9_QUICKATTACK_HP: Readonly<{ from: number; to: number }> = Object.freeze({
  from: TURN9_ONIX_BEFORE_QUICK_ATTACK_HP,
  to: TURN9_ONIX_AFTER_QUICK_ATTACK_HP,
});

/** Semantic move/text stream for turn 9 itself, attached to turn 8's receipt. */
export function resolveTurn9FightCommandUpcoming(): FightCommandUpcomingPresentation {
  return {
    firstTextStartDelay: 11,
    moves: [
      {
        user: "opponent",
        target: "player",
        move: "QUICK_ATTACK",
        text: { lines: ["Foe PIDGEOTTO used", "QUICK ATTACK!"] },
        hpChange: {
          target: "player",
          from: TURN9_ONIX_BEFORE_QUICK_ATTACK_HP,
          to: TURN9_ONIX_AFTER_QUICK_ATTACK_HP,
        },
        effectiveness: { text: { lines: ["It’s not very effective…"] } },
      },
      {
        user: "player",
        target: "opponent",
        move: "ROCK_SLIDE",
        text: { lines: resolveTurn6RockSlideAttackLines() },
        hpChange: {
          target: "opponent",
          from: 82,
          to: TURN9_PIDGEOTTO_AFTER_ROCK_SLIDE_HP,
        },
        effectiveness: { text: { lines: [TURN6_SUPER_EFFECTIVE_LINE] } },
      },
    ],
  };
}

export type Turn9CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-9 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 9's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 9's completed-command facts independently of move staging.
 * The canonical receipt contains seven ROCK_SLIDE uses (turns 1, 3, 4, 5,
 * 6, 7, and 9), turn 8's one BIND use, and turn 2's one DRAGON_BREATH use.
 */
export function resolveTurn9CompletedResolutionNextCommandHandoff(): Turn9CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 7,
      bind - 1,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/**
 * Semantic field, bounce, and next-action view after turn 9. The values
 * describe the following command directly; no PP value or turn identity
 * participates in selecting it.
 */
export function resolveTurn9FightCommandPresentation(): FightCommandPresentation {
  return createFightCommandPresentation({
    field: {
      player: {
        species: "ONIX",
        displayName: "ONIX",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: TURN9_ONIX_AFTER_QUICK_ATTACK_HP, max: ONIX_MAX_HP },
        attackStage: 0,
      },
      opponent: {
        species: "PIDGEOTTO",
        displayName: "PIDGEOTTO",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: TURN9_PIDGEOTTO_AFTER_ROCK_SLIDE_HP, max: PIDGEOTTO_MAX_HP },
        attackStage: 6,
      },
    },
    bounce: {
      actionMenuRedrawTick: TURN10_COMMAND_MENU_REDRAW_TICK,
      idleBounceEpochTick: MENU_IDLE_BLANK_END_TICK + 1,
      fightSubmenuTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
      kickoff: {
        freezeAfterConfirmTicks: FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
        preFreezeTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
        frozenBounceTick: TURN10_COMMAND_MENU_REDRAW_TICK,
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
            from: TURN9_ONIX_AFTER_QUICK_ATTACK_HP,
            to: TURN10_ONIX_AFTER_AERIAL_ACE_HP,
          },
          effectiveness: { text: { lines: ["It’s not very effective…"] } },
        },
        {
          user: "player",
          target: "opponent",
          move: "ROCK_SLIDE",
          text: { lines: resolveTurn6RockSlideAttackLines() },
          hpChange: {
            target: "opponent",
            from: TURN9_PIDGEOTTO_AFTER_ROCK_SLIDE_HP,
            to: TURN10_PIDGEOTTO_AFTER_ROCK_SLIDE_HP,
          },
          effectiveness: { text: { lines: [TURN6_SUPER_EFFECTIVE_LINE] } },
        },
      ],
    },
  });
}

/** Normalizes the legacy turn-9 receipt into the generic command boundary. */
export function resolveTurn9LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    {
      ...resolveTurn9CompletedResolutionNextCommandHandoff(),
      content: resolveTurn9FightCommandPresentation(),
    },
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn9NextCommandHandoffReady(
  handoff: Turn9CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn9CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
