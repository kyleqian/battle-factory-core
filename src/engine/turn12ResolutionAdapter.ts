/**
 * Typed predecessor receipt for the next FIGHT command after turn 12.
 *
 * The turn-12 ROCK_SLIDE-miss staging remains independent from this completed
 * boundary: this receipt publishes the canonical post-turn facts directly,
 * just as the turn-5 through turn-11 handoffs do. It must not reuse the
 * post-DRAGON_BREATH turn-13 handoff, which belongs one command later.
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
import {
  resolveTurn13DragonBreathFaintLines,
  resolveTurn13DragonBreathKickoffLines,
  resolveTurn13DragonBreathWindowContent,
} from "./turn13DragonBreathPresentationStaging.ts";
import {
  resolveTurn13AccFellLines,
  resolveTurn13SandAttackKickoffLines,
  resolveTurn13SandAttackWindowContent,
} from "./turn13SandAttackPresentationStaging.ts";

const ONIX_MAX_HP = 117;
const PIDGEOTTO_MAX_HP = 156;
const TURN13_COMMAND_MENU_REDRAW_TICK = 14_237 + 551;
const TURN12_ONIX_AFTER_AERIAL_ACE_HP = 4;
const TURN11_PIDGEOTTO_AFTER_ROCK_SLIDE_HP = 16;

export type Turn12CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-12 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 12's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 12's completed-command facts independently of move staging.
 * The canonical receipt contains ten ROCK_SLIDE uses (turns 1, 3, 4, 5, 6,
 * 7, 9, 10, 11, and 12); turn 12's miss still consumes PP. It also contains
 * turn 8's one BIND use and turn 2's one DRAGON_BREATH use.
 */
export function resolveTurn12CompletedResolutionNextCommandHandoff(): Turn12CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 10,
      bind - 1,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Semantic field/bounce/move content for the final Pidgeotto command. */
export function resolveTurn12FightCommandPresentation(): FightCommandPresentation {
  const sandAttack = resolveTurn13SandAttackWindowContent();
  const dragonBreath = resolveTurn13DragonBreathWindowContent();
  return createFightCommandPresentation({
    field: {
      player: {
        species: "ONIX",
        displayName: "ONIX",
        level: 50,
        gender: "male",
        status: "none",
        hp: { current: TURN12_ONIX_AFTER_AERIAL_ACE_HP, max: ONIX_MAX_HP },
        attackStage: 0,
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
      actionMenuRedrawTick: TURN13_COMMAND_MENU_REDRAW_TICK,
      idleBounceEpochTick: MENU_IDLE_BLANK_END_TICK + 1,
      fightSubmenuTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
      kickoff: {
        freezeAfterConfirmTicks: FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY,
        preFreezeTickOffset: -FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
        frozenBounceTick: TURN13_COMMAND_MENU_REDRAW_TICK,
      },
    },
    upcoming: {
      firstTextStartDelay: 13,
      moves: [
        {
          user: "opponent",
          target: "player",
          move: "SAND_ATTACK",
          text: { lines: resolveTurn13SandAttackKickoffLines() },
          statChange: {
            target: "player",
            stat: sandAttack.statChange.stat,
            from: sandAttack.statChange.from,
            to: sandAttack.statChange.to,
            text: { lines: resolveTurn13AccFellLines() },
          },
        },
        {
          user: "player",
          target: "opponent",
          move: "DRAGON_BREATH",
          text: { lines: resolveTurn13DragonBreathKickoffLines() },
          hpChange: {
            target: "opponent",
            from: dragonBreath.damage.hp.from,
            to: dragonBreath.damage.hp.to,
          },
          faint: {
            target: "opponent",
            text: { lines: resolveTurn13DragonBreathFaintLines() },
          },
        },
      ],
    },
  });
}

/** Normalizes the legacy turn-12 receipt into the generic command boundary. */
export function resolveTurn12LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    {
      ...resolveTurn12CompletedResolutionNextCommandHandoff(),
      content: resolveTurn12FightCommandPresentation(),
    },
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and dispatcher. */
export function isTurn12NextCommandHandoffReady(
  handoff: Turn12CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn12CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
