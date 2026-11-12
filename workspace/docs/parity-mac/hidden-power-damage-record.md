# Hidden Power was recorded by its hidden type for Counter / Mirror Coat (audit lead B8) — fixed

Mac parity lane, 2026-11-12. No replay seed shows this (one Factory set has Hidden Power: Unown, set 126). Proof is a
Mechanic Lab scenario on the real ROM (below) plus the source.

## Symptom

A Hidden Power of a "special" type (Fire, Water, Grass, Electric, Psychic, Ice, Dragon, Dark) was filed as special damage:
Mirror Coat could answer it and Counter could not. In the real game it is the reverse for every Hidden Power type.
Factory mons have equal IVs, so the pool's Unown always has Hidden Power Fighting (even IVs) or Dark (odd IVs).

## Cause

- C: `Cmd_datahpupdate` picks the type for the Counter / Mirror Coat record itself (`battle_script_commands.c:1855-1860`):
  a dynamic type that carries `F_DYNAMIC_TYPE_IGNORE_PHYSICALITY` is ignored and the move's table type is used.
  `Cmd_hiddenpowercalc` sets that flag (`:8912`), and Hidden Power's table type is Normal, so it is always a physical hit
  for this record. (Weather Ball's dynamic type has no such flag and does count.)
- Engine: `src/engine/battleScriptHitChainOpcode.ts` (datahpupdate, damage branch) used `GET_MOVE_TYPE`, which masks the
  flag away and returns the hidden type.

## Fix

The damage record reads the table type when the dynamic type has `F_DYNAMIC_TYPE_IGNORE_PHYSICALITY` (bit 6). Nothing else
changes: damage, STAB and effectiveness still use the hidden type.

## Test

`tests/battleScriptRankedBatch1Opcode.test.ts`, "Hidden Power of a special type is recorded as a PHYSICAL hit": all-odd IVs
(Hidden Power Dark). Fixed: `physicalDmg` = damage dealt, `specialDmg` 0. Unfixed: the reverse.

## ROM proof (Mechanic Lab, Scene OFF)

Request: `mode: "mechanicLab"`, `challengeNum 0`, `trainerId 50`, base sets `[156,149,180]` / `[184,188,135]`, seed 305419897,
`overrides.parties`: player lead Unown (species 201, moves `[237,237,237,237]`, default IVs 31 = Hidden Power Dark),
opponent lead Wobbuffet (202) with four copies of one move. Trace: A, 30 frames, A.

| opponent's move | ROM result |
|---|---|
| Counter (68) x4 | Hidden Power: Wobbuffet 265 -> 199 (66). Counter: Unown 123 -> 0 (2 x 66). **Counter works.** |
| Mirror Coat (243) x4 | Hidden Power: Wobbuffet 265 -> 199. Mirror Coat: Unown stays at 123. **Mirror Coat fails.** |
