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
}

export function battleMoveAnimationRequest(
  attacker: 0 | 1, target: number | undefined, args: readonly string[],
): BattleMoveAnimationRequest {
  if (args.length !== 6 || args.some((value) => !/^-?\d+$/.test(value))) {
    throw new Error("MOVE_ANIMATION requires six integer controller arguments");
  }
  const [moveId, turn, power, damage, friendship, multihit] = args.map(Number);
  if (target !== undefined && target !== 0 && target !== 1) {
    throw new Error("MOVE_ANIMATION requires a singles target");
  }
  return Object.freeze({
    moveId: moveId!, attacker, target: target ?? (attacker === 0 ? 1 : 0),
    turn: turn!, power: power!, damage: damage!, friendship: friendship!, multihit: multihit!,
  });
}
