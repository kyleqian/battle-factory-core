/**
 * Typed predecessor receipt for the next FIGHT command after turn 8.
 *
 * The turn-8 FEATHER_DANCE and BIND staging modules each prove their own move
 * facts, but neither owns the completed combined turn or the settled
 * redraw/input boundary. This receipt therefore publishes the canonical
 * completed-command boundary directly, just as the turn-5 through turn-7
 * handoffs do; it must not be gated on either staged result being present.
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
import { resolveTurn8FeatherDanceWindowContent } from "./turn78FeatherDancePresentationStaging.ts";
import { stageTurn8BindMiss } from "./turn8BindPresentationStaging.ts";

const ONIX_MAX_HP = 117;
const PIDGEOTTO_MAX_HP = 156;
/** The real post-BIND redraw that initializes turn 9's action-menu bounce. */
const PIDGEOTTO_COMMAND_MENU_REDRAW_TICK = 9997;

export type Turn8CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-8 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 8's BIND command. */
  persistedMoveSlot: 1;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 8's completed-command facts independently of its individual
 * move stages. The canonical receipt contains six ROCK_SLIDE uses (turns 1,
 * 3, 4, 5, 6, and 7), turn 2's one DRAGON_BREATH use, and turn 8's first
 * BIND use.
 */
export function resolveTurn8CompletedResolutionNextCommandHandoff(): Turn8CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 6,
      bind - 1,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 1 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/**
 * Publishes the semantic field and bounce state that survived BIND's real
 * miss. The high-chain move/text continuation is intentionally absent here:
 * its first consumer is the turn-9 renderer, which Slice 4 owns.
 */
export function resolveTurn8FightCommandPresentation(): FightCommandPresentation {
  const featherDance = resolveTurn8FeatherDanceWindowContent();
  const bindMiss = stageTurn8BindMiss();
  return createFightCommandPresentation({
    field: {
      player: {
        species: "ONIX",
        displayName: "ONIX",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: 31, max: ONIX_MAX_HP },
        attackStage: featherDance.statChange.to,
      },
      opponent: {
        species: "PIDGEOTTO",
        displayName: "PIDGEOTTO",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: bindMiss.pidgeottoHpAfter, max: PIDGEOTTO_MAX_HP },
        attackStage: 6,
      },
    },
    bounce: {
      actionMenuRedrawTick: PIDGEOTTO_COMMAND_MENU_REDRAW_TICK,
      idleBounceEpochTick: MENU_IDLE_BLANK_END_TICK + 1,
      fightSubmenuTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
      kickoff: {
        freezeAfterConfirmTicks: FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
        preFreezeTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
        frozenBounceTick: PIDGEOTTO_COMMAND_MENU_REDRAW_TICK,
      },
    },
    upcoming: null,
  });
}

/** Normalizes the legacy turn-8 receipt into the generic command boundary. */
export function resolveTurn8LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    {
      ...resolveTurn8CompletedResolutionNextCommandHandoff(),
      content: resolveTurn8FightCommandPresentation(),
    },
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn8NextCommandHandoffReady(
  handoff: Turn8CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn8CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
