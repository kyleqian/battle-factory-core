/**
 * trp1 (docs/trp1-turn-trap-animation.md): General_TurnTrap's branch for the trapped battler's wrapped move (AnimTask_GetTrappedMoveAnimId,
 * battle_anim_throw.c:2486-2500): MOVE_FIRE_SPIN 83 -> Status_FireSpin, MOVE_WHIRLPOOL 250 -> Status_Whirlpool, MOVE_CLAMP 128 ->
 * Status_Clamp, MOVE_SAND_TOMB 328 -> Status_SandTomb, anything else (Bind, Wrap) -> Status_BindWrap.
 */
export type TurnTrapBranch = "BIND_WRAP" | "FIRE_SPIN" | "WHIRLPOOL" | "CLAMP" | "SAND_TOMB";

export function turnTrapBranchOf(wrappedMove: number): TurnTrapBranch {
  return wrappedMove === 83 ? "FIRE_SPIN" : wrappedMove === 250 ? "WHIRLPOOL" : wrappedMove === 128 ? "CLAMP"
    : wrappedMove === 328 ? "SAND_TOMB" : "BIND_WRAP";
}

/** The branch's script label (the anim-sound-timing table's general entry, tools/extract/extract-anim-sound-timing.ts). */
export const TURN_TRAP_SCRIPT_LABEL: Readonly<Record<TurnTrapBranch, string>> = Object.freeze({
  BIND_WRAP: "Status_BindWrap", FIRE_SPIN: "Status_FireSpin", WHIRLPOOL: "Status_Whirlpool", CLAMP: "Status_Clamp", SAND_TOMB: "Status_SandTomb",
});
