// The GBA's own packed `MON_DATA_IVS` word (`pokemon.c:3997-4004`): five bits
// per stat in HP/ATK/DEF/SPEED/SPATK/SPDEF order. This is exactly what
// `fw_create_factory_party_member_with_ivs` takes and what the
// draft-selection packet's optional `ivs_packed` rental field carries, so
// both adapters share one pack/unpack pair rather than two spellings of the
// same shifts.

import type { BattleScriptIvs } from "../../src/engine/battleScriptRulesContext.ts";

const IV_SHIFTS = [0, 5, 10, 15, 20, 25] as const;

/** Pack a six-IV spread into one `MON_DATA_IVS` word. */
export function packMonDataIvs(ivs: BattleScriptIvs): number {
  return (
    (ivs.hp & 31)
    | ((ivs.attack & 31) << IV_SHIFTS[1])
    | ((ivs.defense & 31) << IV_SHIFTS[2])
    | ((ivs.speed & 31) << IV_SHIFTS[3])
    | ((ivs.spAttack & 31) << IV_SHIFTS[4])
    | ((ivs.spDefense & 31) << IV_SHIFTS[5])
  ) >>> 0;
}

/**
 * Unpack a `MON_DATA_IVS` word back into a six-IV spread. Bits 30-31 have no
 * stat and are ignored, exactly as `fw_create_factory_party_member_with_ivs`
 * ignores them.
 */
export function unpackMonDataIvs(packed: number): BattleScriptIvs {
  const [hp, attack, defense, speed, spAttack, spDefense] =
    IV_SHIFTS.map((shift) => (packed >>> shift) & 31);
  return Object.freeze({ hp, attack, defense, speed, spAttack, spDefense } as BattleScriptIvs);
}
