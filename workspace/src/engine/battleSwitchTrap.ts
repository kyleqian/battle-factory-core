import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_WRAPPED_MASK, BATTLE_SCRIPT_STATUS3_ROOTED } from "./battleScriptSourceConstants.ts";

const ABILITY_SHADOW_TAG = 23;
const ABILITY_LEVITATE = 26;
const ABILITY_MAGNET_PULL = 42;
const ABILITY_ARENA_TRAP = 71;
/** include/constants/battle.h: STATUS2_ESCAPE_PREVENTION. */
const STATUS2_ESCAPE_PREVENTION = 1 << 26;

/** gAbilityNames entries of the three trapping abilities. */
const TRAP_ABILITY_NAMES: Readonly<Record<number, string>> = Object.freeze({
  [ABILITY_SHADOW_TAG]: "SHADOW TAG",
  [ABILITY_MAGNET_PULL]: "MAGNET PULL",
  [ABILITY_ARENA_TRAP]: "ARENA TRAP",
});

/** PARTY_ACTION_CANT_SWITCH (wrap / Mean Look / Ingrain) or PARTY_ACTION_ABILITY_PREVENTS (the opposing battler's ability). */
export type VoluntarySwitchTrap =
  | Readonly<{ kind: "cant-switch" }>
  | Readonly<{ kind: "ability"; ability: number; abilityName: string }>;

/**
 * B_ACTION_SWITCH's trap checks (battle_main.c:4240-4267) projected to Factory singles. The first branch
 * (status2 / rooted) wins over the ability branch, exactly as in the source.
 */
export function voluntarySwitchTrap(
  rulesContext: BattleScriptRulesContext,
  battler: 0 | 1,
): VoluntarySwitchTrap | null {
  const active = rulesContext.battlers[battler]!;
  if (
    (active.status2 & (BATTLE_SCRIPT_STATUS2_WRAPPED_MASK | STATUS2_ESCAPE_PREVENTION)) !== 0
    || (active.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) !== 0
  ) {
    return Object.freeze({ kind: "cant-switch" });
  }
  const opponent = (battler === 0 ? 1 : 0) as 0 | 1;
  const holder = rulesContext.battlers[opponent]!;
  if (holder.hp === 0 || (rulesContext.absentBattlerFlags & (1 << opponent)) !== 0) return null;
  const trapped =
    holder.ability === ABILITY_SHADOW_TAG
    || (
      holder.ability === ABILITY_ARENA_TRAP
      && !active.types.includes("TYPE_FLYING")
      && active.ability !== ABILITY_LEVITATE
    )
    || (holder.ability === ABILITY_MAGNET_PULL && active.types.includes("TYPE_STEEL"));
  if (!trapped) return null;
  return Object.freeze({ kind: "ability", ability: holder.ability, abilityName: TRAP_ABILITY_NAMES[holder.ability]! });
}
