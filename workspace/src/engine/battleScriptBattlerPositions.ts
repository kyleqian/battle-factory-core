/**
 * `GetBattlerAtPosition(u8 position)` (`battle_anim_mons.c:859-869`) for the
 * single-battle topology every Factory Level-50 route runs under.
 *
 * The source scans `gBattlerPositions` for the battler occupying `position`.
 * In singles that array is the identity map — battler 0 at
 * `B_POSITION_PLAYER_LEFT`, battler 1 at `B_POSITION_OPPONENT_LEFT` — so the
 * position IS the battler id, and only those two positions resolve.
 *
 * Extracted (terminal-seam increment (i),
 * `docs/terminal-seam-round-flow-scout.md` §3) because the post-battle WIN
 * script's `trainerslidein` made this the first opcode to need a real
 * position resolver on EVERY Factory entry point at once, rather than one:
 * `factoryBattleScriptTerminalDecision`, `factoryBattleScriptFullTurnDecision`,
 * `factoryBattleScriptDecision`, and `factoryBattleStart` all previously
 * stubbed `resolveBattlerAtPosition` to `() => null`, which turns
 * `Cmd_trainerslidein` into an unsatisfiable port and stalls the script.
 *
 * Note the `BS_ATTACKER` spelling in `BattleScript_FrontierTrainerBattleWon_
 * LoseTexts` (and the loss side's mirror, `BattleScript_LocalBattleLostPrint
 * TrainersWinText`) is a value collision, NOT an attacker-role lookup:
 * `Cmd_trainerslidein` (`battle_script_commands.c:5301-5308`) passes its
 * operand byte straight to `GetBattlerAtPosition`, and `BS_ATTACKER`
 * (`battle_script_commands.h:305`) compiles to **1**, the same byte as
 * `B_POSITION_OPPONENT_LEFT` (`battle.h:29`) -- NOT `B_POSITION_PLAYER_LEFT`
 * (`battle.h:28`, value 0). So `trainerslidein BS_ATTACKER` always resolves
 * the battler at `B_POSITION_OPPONENT_LEFT`, i.e. the **opponent** trainer,
 * regardless of which side actually attacked -- matching the oracle trace
 * (`docs/terminal-seam-loss-path-ground-truth.md`), where the opponent
 * trainer (DESTIN) visibly slides in on both the win and loss quote screens.
 * Resolving it through the attacker role instead would coincidentally agree
 * only when the player is the attacker and silently disagree otherwise.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptMachineState } from "./battleScriptMachine.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/**
 * include/constants/battle.h:28-29 for the two raw positions; BS_ATTACKER
 * (battle_script_commands.h:305 = 1) added at the SAME value as
 * B_POSITION_OPPONENT_LEFT, since `trainerslidein`/`trainerslideout` read it
 * as a raw `GetBattlerAtPosition` operand, not a selector role.
 */
const SINGLE_BATTLE_POSITIONS: ReadonlyMap<string, 0 | 1> = new Map([
  ["B_POSITION_PLAYER_LEFT", 0],
  ["B_POSITION_OPPONENT_LEFT", 1],
  ["BS_ATTACKER", 1],
]);

export function resolveSingleBattlePosition(
  context: Readonly<{ state: BattleScriptMachineState<BattleScriptRulesContext> }>,
  operand: Readonly<{ expression: string }>,
): BattleScriptBattlerId | null {
  const position = SINGLE_BATTLE_POSITIONS.get(operand.expression);
  if (position === undefined) return null;
  return position < context.state.rulesContext.battleTopology.battlersCount ? position : null;
}
