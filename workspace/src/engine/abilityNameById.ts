/**
 * Shared numeric ABILITY_* id -> source symbol resolver (include/constants/abilities.h, extracted
 * into ability-item-hooks.json). Consumers whose pure helpers keep a string ABI (damageCalc's
 * CalculateBaseDamage / Cmd_accuracycheck inputs, the live AI view) resolve ids here; a
 * consumer-local partial table silently drops every ability it does not list (ISSUES #202).
 */
import abilityItemHooksData from "../data/gen/ability-item-hooks.json" with { type: "json" };

type SymbolIdRow = Readonly<{ name: string; id: number }>;

export const ABILITY_NAME_BY_ID: ReadonlyMap<number, string> = new Map(
  (abilityItemHooksData as unknown as { universes: { abilities: readonly SymbolIdRow[] } })
    .universes.abilities.map((row) => [row.id, row.name]),
);

/** Symbol for a battler's numeric ability, or null for an id outside gAbilityNames. */
export function abilityNameOrNull(ability: number): string | null {
  return ABILITY_NAME_BY_ID.get(ability) ?? null;
}
