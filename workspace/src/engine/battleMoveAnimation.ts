/** Immutable controller receipt. No renderer may advance battle rules or RNG. */
export interface BattleMoveAnimationRequest {
  readonly moveId: number;
  readonly attacker: 0 | 1;
  readonly target: 0 | 1;
  readonly turn: number;
  readonly power: number;
  readonly damage: number;
  readonly friendship: number;
  readonly multihit: number;
  /** Presentation-only Rollout counter (1..5), present only for MOVE_ROLLOUT (205). */
  readonly rolloutCounter?: number;
  /** Presentation-only: the body runs from Task_ClearBitWhenBattleTableAnimDone (a general animation that jumps into a move body), not the controller. */
  readonly taskHostedScript?: true;
  /**
   * Presentation-only (trp1, docs/trp1-turn-trap-animation.md): the body is General_TurnTrap's branch for this trapping move (Status_FireSpin /
   * Status_Whirlpool / Status_SandTomb), launched from the general table with the trapped battler as the script's target; `attacker` is the
   * other battler, drawn as it stands.
   */
  readonly turnTrapBody?: true;
  /**
   * Presentation-only (rnc1, docs/rnc1-rain-continues.md): with moveId 240, the body is General_Rain (B_ANIM_RAIN_CONTINUES), not
   * Move_RAIN_DANCE: its own blend and drops (rainDance.ts generalRainAtAge) from the general animation's recorded presentation words.
   */
  readonly generalRain?: true;
}

export function battleMoveAnimationRequest(
  attacker: 0 | 1, target: number | undefined, args: readonly string[],
): BattleMoveAnimationRequest {
  if ((args.length !== 6 && args.length !== 7) || args.some((value) => !/^-?\d+$/.test(value))) {
    throw new Error("MOVE_ANIMATION requires six integer controller arguments (seven for ROLLOUT)");
  }
  const values = args.map(Number);
  if (values.some(value => !Number.isSafeInteger(value))) {
    throw new Error("MOVE_ANIMATION arguments must be safe integers");
  }
  const [moveId, turn, power, damage, friendship, multihit, rolloutCounter] = values;
  if (target !== 0 && target !== 1) {
    throw new Error("MOVE_ANIMATION requires a singles target");
  }
  return Object.freeze({
    moveId: moveId!, attacker, target,
    turn: turn!, power: power!, damage: damage!, friendship: friendship!, multihit: multihit!,
    ...(rolloutCounter === undefined ? {} : { rolloutCounter }),
  });
}
