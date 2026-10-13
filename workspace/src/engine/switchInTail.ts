/**
 * snd145 (S10A, ISSUES #146 remainder; docs/send-in-tail-model.md §1, docs/snd145-send-in-tail-live.md): the species-keyed OPPONENT
 * send-in tail of the `switch-in` command (voluntary switch, forced Roar / Whirlwind switch and faint replacement all emit it; both
 * scene modes share it). The healthbox slide waits for the species front animation (`SwitchIn_ShowHealthbox`,
 * battle_controller_opponent.c:482-498) and the next printstring follows the controller end (`SwitchIn_HandleSoundAndEnd`), so both are
 * `sendInTail(species, "opponent")` (src/data/sendInTail.ts). The command's elapsed 0 is the send-in start (the model's frame 0:
 * the ball shows from elapsed 2, opens at 18), so the model's frames are the command's elapsed directly (ROM-verified on dense Scene ON
 * windows, docs/snd145-send-in-tail-live.md). The player side keeps its calibrated constants (slide 66, span 91 + 11).
 */
import { sendInTail } from "../data/sendInTail.ts";

/** Opponent send-in: the `switch-in` elapsed of the healthbox slide's first frame (x2 -110). */
export function opponentSwitchInHealthboxSlideElapsed(species: number): number {
  return sendInTail(species, "opponent").slideStart;
}

/** Opponent send-in: the `switch-in` command's whole duration (controller span + waitstate hold) = the next command's first frame. */
export function opponentSwitchInDuration(species: number): number {
  return sendInTail(species, "opponent").messageStart!;
}
