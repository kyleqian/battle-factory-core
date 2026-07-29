/**
 * BattleHistory handoffs for the source's RecordAbilityBattle and
 * RecordItemEffectBattle calls. These helpers deliberately mutate only the
 * durable AI-observation cells: activation owners remain responsible for
 * calling them at the exact successful source branch.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

export function recordBattleScriptAbilityReveal(
  rules: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
  ability: number,
): BattleScriptRulesContext {
  if (rules.aiObservedAbilityIds[battler] === ability) return rules;
  return Object.freeze({
    ...rules,
    aiObservedAbilityIds: Object.freeze(
      rules.aiObservedAbilityIds.map((value, index) =>
        index === battler ? ability : value
      ),
    ) as BattleScriptRulesContext["aiObservedAbilityIds"],
  });
}

export function recordBattleScriptItemEffectReveal(
  rules: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
  itemEffect: number,
): BattleScriptRulesContext {
  if (rules.aiObservedItemEffects[battler] === itemEffect) return rules;
  return Object.freeze({
    ...rules,
    aiObservedItemEffects: Object.freeze(
      rules.aiObservedItemEffects.map((value, index) =>
        index === battler ? itemEffect : value
      ),
    ) as BattleScriptRulesContext["aiObservedItemEffects"],
  });
}
