/**
 * Semantic content retained at a completed-command boundary for the next
 * FIGHT window. This is deliberately data, not a turn or PP classifier:
 * callers describe the field, its bounce epoch, and the actual move/text
 * content that follows the command boundary.
 */

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
  }>;
}>;

export type FightCommandPresentation = Readonly<{
  field: Readonly<{
    player: FightCommandFieldBattler;
    opponent: FightCommandFieldBattler;
  }>;
  bounce: FightCommandBouncePresentation;
  /**
   * The real move/text stream available to the next command renderer.
   * `null` is an explicit incomplete bridge boundary, never a fallback to a
   * turn or PP selector; Slice 4 supplies the high-chain continuation.
   */
  upcoming: Readonly<{
    firstTextStartDelay: number;
    moves: readonly FightCommandMovePresentation[];
  }> | null;
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
  });
}

/** Copies adapter-owned content into an immutable generic presentation view. */
export function createFightCommandPresentation(
  input: FightCommandPresentation,
): FightCommandPresentation {
  const kickoff = input.bounce.kickoff;
  const hasFixedBounceTick = kickoff.frozenBounceTick !== undefined;
  const hasPressRelativeBounceTick = kickoff.frozenPressTickOffset !== undefined;
  if (hasFixedBounceTick === hasPressRelativeBounceTick) {
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
      }),
    }),
    ...(input.upcoming === null
      ? { upcoming: null }
      : {
        upcoming: Object.freeze({
          firstTextStartDelay: input.upcoming.firstTextStartDelay,
          moves: Object.freeze(input.upcoming.moves.map(freezeMove)),
        }),
      }),
  });
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
  const sourceTick = tick < confirmTick + kickoff.freezeAfterConfirmTicks
    ? tick + kickoff.preFreezeTickOffset
    : kickoff.frozenBounceTick
      ?? confirmTick + kickoff.frozenPressTickOffset!;
  return fightCommandSettledBounceEpochTick(presentation, sourceTick);
}
