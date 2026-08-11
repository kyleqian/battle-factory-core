/**
 * Semantic content retained at a completed-command boundary for the next
 * FIGHT window. This is deliberately data, not a turn or PP classifier:
 * callers describe the field, its bounce epoch, and the actual move/text
 * content that follows the command boundary.
 */
import type { BattleSceneResolutionOwner } from "./battleSceneResolutionOwner.ts";

export type FightCommandSide = "player" | "opponent";

export type FightCommandFieldBattler = Readonly<{
  species: string;
  displayName: string;
  level: number;
  gender: "male" | "female" | "genderless";
  status: "none" | "poison" | "burn" | "freeze" | "paralysis" | "sleep";
  hp: Readonly<{ current: number; max: number }>;
  /** The live ATTACK stage at the command boundary, on the Gen-III 0..12 scale. */
  attackStage: number;
}>;

export type FightCommandTextPresentation = Readonly<{
  lines: readonly string[];
}>;

export type FightCommandUpcomingPresentation = Readonly<{
  firstTextStartDelay: number;
  moves: readonly FightCommandMovePresentation[];
}>;

/**
 * A retained action is already represented by the immutable resolution
 * owner. The bridge deliberately holds that owner and its exact segment
 * array by reference: it must never reconstruct charge/strike commands from
 * a turn, PP tuple, or a copied command list.
 */
export type FightCommandRetainedResolutionPresentation = Readonly<{
  owner: BattleSceneResolutionOwner;
  segments: BattleSceneResolutionOwner["resolution"]["segments"];
}>;

export type FightCommandMovePresentation = Readonly<{
  user: FightCommandSide;
  target: FightCommandSide;
  move: string;
  text: FightCommandTextPresentation;
  statChange?: Readonly<{
    target: FightCommandSide;
    stat: string;
    from: number;
    to: number;
    text: FightCommandTextPresentation;
  }>;
  hpChange?: Readonly<{
    target: FightCommandSide;
    from: number;
    to: number;
  }>;
  effectiveness?: Readonly<{
    text: FightCommandTextPresentation;
  }>;
  miss?: Readonly<{
    target: FightCommandSide;
    text: FightCommandTextPresentation;
  }>;
  faint?: Readonly<{
    target: FightCommandSide;
    text: FightCommandTextPresentation;
  }>;
}>;

/**
 * One source-owned action-menu redraw starts a fresh idle-bounce epoch.
 * The two kickoff anchors cover the two real source shapes: a value relative
 * to the accepted command press, or the already-settled redraw edge.
 */
export type FightCommandBouncePresentation = Readonly<{
  actionMenuRedrawTick: number;
  idleBounceEpochTick: number;
  fightSubmenuTickOffset: number;
  kickoff: Readonly<{
    freezeAfterConfirmTicks: number;
    preFreezeTickOffset: number;
    frozenBounceTick?: number;
    frozenPressTickOffset?: number;
    /**
     * A fixed output phase for runtime-relative command epochs.  Unlike the
     * two source-tick anchors above, this is already the bounce-table epoch
     * consumed by the renderer and therefore needs no trace-tick conversion.
     */
    frozenBounceEpochTick?: number;
  }>;
}>;

/**
 * The early command boundary is published by the real choose-action
 * controller, not by a later FIGHT input.  It is optional content because
 * only the early receipts carry this source-owned DoBounceEffect identity.
 */
export type FightCommandPresentationEpoch = Readonly<{
  owner: "HandleInputChooseAction";
  reset: "DoBounceEffect";
  /** Runtime-relative scene elapsed at the controller's reset event. */
  elapsed: number;
  mon: Readonly<{ seed: 192; delta: 7; amplitude: 1 }>;
  healthbox: Readonly<{ seed: 128; delta: 7; amplitude: 1 }>;
}>;

export type FightCommandPresentation = Readonly<{
  field: Readonly<{
    player: FightCommandFieldBattler;
    opponent: FightCommandFieldBattler;
  }>;
  bounce: FightCommandBouncePresentation;
  /** Present only when this completed command owns a fresh bounce epoch. */
  presentationEpoch?: FightCommandPresentationEpoch;
  /**
   * The real move/text stream available to the next command renderer.
   * `null` is an explicit absence of a generic text stream; a retained
   * resolution owner can instead supply its source-owned command segments.
   */
  upcoming: FightCommandUpcomingPresentation | null;
  /** Present only when a retained reducer owner supplies the next action. */
  retainedResolution?: FightCommandRetainedResolutionPresentation;
}>;

function freezeText(input: FightCommandTextPresentation): FightCommandTextPresentation {
  return Object.freeze({ lines: Object.freeze([...input.lines]) });
}

function freezeBattler(input: FightCommandFieldBattler): FightCommandFieldBattler {
  return Object.freeze({
    species: input.species,
    displayName: input.displayName,
    level: input.level,
    gender: input.gender,
    status: input.status,
    hp: Object.freeze({ current: input.hp.current, max: input.hp.max }),
    attackStage: input.attackStage,
  });
}

function freezeMove(input: FightCommandMovePresentation): FightCommandMovePresentation {
  return Object.freeze({
    user: input.user,
    target: input.target,
    move: input.move,
    text: freezeText(input.text),
    ...(input.statChange === undefined
      ? {}
      : {
        statChange: Object.freeze({
          target: input.statChange.target,
          stat: input.statChange.stat,
          from: input.statChange.from,
          to: input.statChange.to,
          text: freezeText(input.statChange.text),
        }),
      }),
    ...(input.hpChange === undefined
      ? {}
      : {
        hpChange: Object.freeze({
          target: input.hpChange.target,
          from: input.hpChange.from,
          to: input.hpChange.to,
        }),
      }),
    ...(input.effectiveness === undefined
      ? {}
      : { effectiveness: Object.freeze({ text: freezeText(input.effectiveness.text) }) }),
    ...(input.miss === undefined
      ? {}
      : {
        miss: Object.freeze({
          target: input.miss.target,
          text: freezeText(input.miss.text),
        }),
      }),
    ...(input.faint === undefined
      ? {}
      : {
        faint: Object.freeze({
          target: input.faint.target,
          text: freezeText(input.faint.text),
        }),
      }),
  });
}

function freezePresentationEpoch(
  input: FightCommandPresentationEpoch,
): FightCommandPresentationEpoch {
  return Object.freeze({
    owner: input.owner,
    reset: input.reset,
    elapsed: input.elapsed,
    mon: Object.freeze({
      seed: input.mon.seed,
      delta: input.mon.delta,
      amplitude: input.mon.amplitude,
    }),
    healthbox: Object.freeze({
      seed: input.healthbox.seed,
      delta: input.healthbox.delta,
      amplitude: input.healthbox.amplitude,
    }),
  });
}

function freezeRetainedResolution(
  input: FightCommandRetainedResolutionPresentation,
): FightCommandRetainedResolutionPresentation {
  if (input.segments !== input.owner.resolution.segments) {
    throw new Error(
      "fightCommandPresentation: retained resolution segments must belong to their owner",
    );
  }
  return Object.freeze({
    owner: input.owner,
    // Keep this reference intact. The resolution owner is the sole source of
    // the FLY charge/strike segments; cloning would disguise a re-derivation.
    segments: input.owner.resolution.segments,
  });
}

/** Copies adapter-owned content into an immutable generic presentation view. */
export function createFightCommandPresentation(
  input: FightCommandPresentation,
): FightCommandPresentation {
  const kickoff = input.bounce.kickoff;
  const hasFixedBounceTick = kickoff.frozenBounceTick !== undefined;
  const hasPressRelativeBounceTick = kickoff.frozenPressTickOffset !== undefined;
  const hasFixedBounceEpochTick = kickoff.frozenBounceEpochTick !== undefined;
  if (
    Number(hasFixedBounceTick)
      + Number(hasPressRelativeBounceTick)
      + Number(hasFixedBounceEpochTick)
      !== 1
  ) {
    throw new Error(
      "fightCommandPresentation: kickoff needs exactly one frozen bounce anchor",
    );
  }

  return Object.freeze({
    field: Object.freeze({
      player: freezeBattler(input.field.player),
      opponent: freezeBattler(input.field.opponent),
    }),
    bounce: Object.freeze({
      actionMenuRedrawTick: input.bounce.actionMenuRedrawTick,
      idleBounceEpochTick: input.bounce.idleBounceEpochTick,
      fightSubmenuTickOffset: input.bounce.fightSubmenuTickOffset,
      kickoff: Object.freeze({
        freezeAfterConfirmTicks: kickoff.freezeAfterConfirmTicks,
        preFreezeTickOffset: kickoff.preFreezeTickOffset,
        ...(hasFixedBounceTick ? { frozenBounceTick: kickoff.frozenBounceTick } : {}),
        ...(hasPressRelativeBounceTick
          ? { frozenPressTickOffset: kickoff.frozenPressTickOffset }
          : {}),
        ...(hasFixedBounceEpochTick
          ? { frozenBounceEpochTick: kickoff.frozenBounceEpochTick }
          : {}),
      }),
    }),
    ...(input.presentationEpoch === undefined
      ? {}
      : { presentationEpoch: freezePresentationEpoch(input.presentationEpoch) }),
    ...(input.upcoming === null
      ? { upcoming: null }
      : {
        upcoming: Object.freeze({
          firstTextStartDelay: input.upcoming.firstTextStartDelay,
          moves: Object.freeze(input.upcoming.moves.map(freezeMove)),
        }),
      }),
    ...(input.retainedResolution === undefined
      ? {}
      : { retainedResolution: freezeRetainedResolution(input.retainedResolution) }),
  });
}

/**
 * Reads the retained action from semantic content and verifies that its
 * segment view still belongs to that immutable owner.  The generic 5-13
 * renderer uses this for FLY's charge/strike continuation instead of a
 * turn-keyed handoff identity.
 */
export function retainedFightCommandResolutionOwner(
  presentation: FightCommandPresentation,
): FightCommandRetainedResolutionPresentation | null {
  const retained = presentation.retainedResolution;
  if (retained === undefined) return null;
  if (retained.segments !== retained.owner.resolution.segments) {
    throw new Error(
      "fightCommandPresentation: retained resolution segments must belong to their owner",
    );
  }
  return retained;
}

/** Maps a trace tick onto the source-owned settled action-menu bounce epoch. */
export function fightCommandSettledBounceEpochTick(
  presentation: FightCommandPresentation,
  tick: number,
): number {
  return tick
    - presentation.bounce.actionMenuRedrawTick
    + presentation.bounce.idleBounceEpochTick;
}

/** Maps a FIGHT-window tick onto the same underlying source bounce epoch. */
export function fightCommandSubmenuBounceEpochTick(
  presentation: FightCommandPresentation,
  tick: number,
): number {
  return fightCommandSettledBounceEpochTick(
    presentation,
    tick + presentation.bounce.fightSubmenuTickOffset,
  );
}

/** Applies the command's actual pre-freeze/frozen bounce semantics. */
export function fightCommandKickoffBounceEpochTick(
  presentation: FightCommandPresentation,
  tick: number,
  confirmTick: number,
): number {
  const kickoff = presentation.bounce.kickoff;
  if (tick >= confirmTick + kickoff.freezeAfterConfirmTicks
    && kickoff.frozenBounceEpochTick !== undefined) {
    return kickoff.frozenBounceEpochTick;
  }
  const sourceTick = tick < confirmTick + kickoff.freezeAfterConfirmTicks
    ? tick + kickoff.preFreezeTickOffset
    : kickoff.frozenBounceTick
      ?? confirmTick + kickoff.frozenPressTickOffset!;
  return fightCommandSettledBounceEpochTick(presentation, sourceTick);
}
