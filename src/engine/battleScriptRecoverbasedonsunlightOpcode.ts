/**
 * `B_SCR_OP_RECOVERBASEDONSUNLIGHT` / `Cmd_recoverbasedonsunlight`
 * (`battle_script_commands.c`):
 *
 * ```c
 * static void Cmd_recoverbasedonsunlight(void)
 * {
 *     gBattlerTarget = gBattlerAttacker;
 *     if (gBattleMons[gBattlerAttacker].hp != gBattleMons[gBattlerAttacker].maxHP)
 *     {
 *         if (gBattleWeather == 0 || !WEATHER_HAS_EFFECT)
 *             gBattleMoveDamage = gBattleMons[gBattlerAttacker].maxHP / 2;
 *         else if (gBattleWeather & B_WEATHER_SUN)
 *             gBattleMoveDamage = 20 * gBattleMons[gBattlerAttacker].maxHP / 30;
 *         else // not sunny weather
 *             gBattleMoveDamage = gBattleMons[gBattlerAttacker].maxHP / 4;
 *         if (gBattleMoveDamage == 0)
 *             gBattleMoveDamage = 1;
 *         gBattleMoveDamage *= -1;
 *         gBattlescriptCurrInstr += 5;
 *     }
 *     else
 *     {
 *         gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);
 *     }
 * }
 * ```
 *
 * No battler operand at all -- source unconditionally repoints
 * `gBattlerTarget = gBattlerAttacker` before the branch. On the full-HP
 * branch, `gBattleMoveDamage` is left untouched (unlike
 * `Cmd_tryhealhalfhealth`'s own unconditional write) and the machine jumps to
 * the single ptr operand (`BattleScript_AlreadyAtFullHp`); otherwise it
 * computes a weather-scaled heal fraction and advances past the operand.
 * `20 * maxHP / 30` is kept as the source's own literal ratio (not
 * simplified to 2/3) to match its exact truncation order. `WEATHER_HAS_
 * EFFECT` reuses `abilityPresentOnField`
 * (`battleScriptJumpifabilitypresentOpcode.ts`) -- the identical
 * `AbilityBattleEffects(ABILITYEFFECT_CHECK_ON_FIELD, ...)` scan
 * `Cmd_jumpifabilitypresent` itself dispatches (`include/battle_util.h:47`).
 *
 * All three effects that resolve to this opcode
 * (`EFFECT_MORNING_SUN`/`EFFECT_SYNTHESIS`/`EFFECT_MOONLIGHT`) share one
 * identical script -- `BattleScript_EffectMorningSun`, `EffectSynthesis`, and
 * `EffectMoonlight` are literally the same label
 * (`data/battle_scripts_1.s:1731-1738`) -- so this single registration flips
 * all three. Zero `Random(` calls, zero barriers.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import { abilityPresentOnField } from "./battleScriptJumpifabilitypresentOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/abilities.h:17,81. */
const ABILITY_CLOUD_NINE = 13;
const ABILITY_AIR_LOCK = 77;
/** include/constants/battle.h:239-241 -- (1<<5)|(1<<6). */
const B_WEATHER_SUN = (1 << 5) | (1 << 6);

function weatherHasEffect(rulesContext: BattleScriptRulesContext): boolean {
  return !abilityPresentOnField(rulesContext, ABILITY_CLOUD_NINE)
    && !abilityPresentOnField(rulesContext, ABILITY_AIR_LOCK);
}

function createRecoverbasedonsunlightHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = requireBattlerRole(rulesContext, "attacker");
    const selectorRoles = Object.freeze({ ...rulesContext.selectorRoles, target: attacker });
    const attackerState = rulesContext.battlers[attacker];

    if (attackerState.hp === attackerState.maxHP) {
      const [failOperand] = context.instruction.operands;
      const target = resolveBattleScriptLabel(context.program, failOperand!.expression);
      if (!target) {
        throw new Error(`Cmd_recoverbasedonsunlight: unresolved jump target ${failOperand!.expression}`);
      }
      const nextRulesContext = Object.freeze({ ...rulesContext, selectorRoles });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: target.programCounter }),
        { rulesContext: nextRulesContext },
      );
    }

    let heal: number;
    if (rulesContext.weather === 0 || !weatherHasEffect(rulesContext)) {
      heal = Math.floor(attackerState.maxHP / 2);
    } else if ((rulesContext.weather & B_WEATHER_SUN) !== 0) {
      heal = Math.floor((20 * attackerState.maxHP) / 30);
    } else {
      heal = Math.floor(attackerState.maxHP / 4);
    }
    if (heal === 0) heal = 1;

    const nextRulesContext = Object.freeze({ ...rulesContext, selectorRoles, battleMoveDamage: -heal });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRulesContext },
    );
  };
}

export function createBattleScriptRecoverbasedonsunlightOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_RECOVERBASEDONSUNLIGHT",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_RECOVERBASEDONSUNLIGHT");
  }
  return Object.freeze({ [instruction.opcodeId]: createRecoverbasedonsunlightHandler() });
}
