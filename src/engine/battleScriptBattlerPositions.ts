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
 * LoseTexts` is a value collision, NOT an attacker-role lookup:
 * `Cmd_trainerslidein` (`battle_script_commands.c:5301-5308`) passes its
 * operand byte straight to `GetBattlerAtPosition`, and `BS_ATTACKER` and
 * `B_POSITION_PLAYER_LEFT` are both 0. Resolving it through the attacker role
 * would coincidentally agree whenever the player lands the KO and silently
 * disagree when the opponent does.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptMachineState } from "./battleScriptMachine.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:35-38, plus the WIN script's BS_ATTACKER spelling of position 0. */
const SINGLE_BATTLE_POSITIONS: ReadonlyMap<string, 0 | 1> = new Map([
  ["B_POSITION_PLAYER_LEFT", 0],
  ["BS_ATTACKER", 0],
  ["B_POSITION_OPPONENT_LEFT", 1],
]);

export function resolveSingleBattlePosition(
  context: Readonly<{ state: BattleScriptMachineState<BattleScriptRulesContext> }>,
  operand: Readonly<{ expression: string }>,
): BattleScriptBattlerId | null {
  const position = SINGLE_BATTLE_POSITIONS.get(operand.expression);
  if (position === undefined) return null;
  return position < context.state.rulesContext.battleTopology.battlersCount ? position : null;
}
