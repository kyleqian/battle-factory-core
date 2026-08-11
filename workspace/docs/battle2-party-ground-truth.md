# Battle 2 party ground truth: personalities, genders, bench legality

ISSUES #39 rank-1 evidence gap. `tests/battle2CommandAdapterPreviewEquivalence.test.ts`
(landed last round) named two facts the repo had never pinned anywhere:

1. **Bench legality** for the Battle-2 command request: the legacy fixture
   (`battleScene.ts`'s `battle2CommandPresentationForRender`, current lines
   6822/6831-6832 -- the equivalence test's own citation of
   `battleScene.ts:6754/6763-6764` has since drifted with unrelated edits
   elsewhere in that 17k-line file) hardcodes two switch decisions
   (`{kind:"switch",partyIndex:1}`, `{kind:"switch",partyIndex:2}`), but the
   staged kernel config (`BATTLE2_TURN1_KERNEL_CONFIG` in
   `src/engine/battle2CommandAdapterPreview.ts`, matching
   `battle2-off-turn1-staged.json`'s own established staging) models no
   player bench at all, so the real kernel offers zero legal switches.
2. **ONIX's and KABUTO's real personality bytes**: the legacy fixture
   hardcodes gender `"male"`/`"male"` for both; the personality-less staged
   kernel config derives `"female"`/`"female"` for both via `getMonGender`'s
   `personality=0` default.

This document banks the ROM ground truth that resolves both gaps.

## 1. Probe method

New script: `tools/probe/dump-battle2-party-ground-truth.py`. It:

1. Boots the Battle Scene OFF bootstrap (`oracle/bootstrap/factory-battle-scene-off.json`),
   asserting `canonical_screen_sha256` matches the pinned anchor
   (`9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297` --
   byte-identical to the Scene-ON bootstrap at frame 0, confirmed live via
   `bin/oracle info`).
2. Replays `tools/compare/traces-groundtruth/battle1-winline-b-swap.json`
   **verbatim** (156 segments, 33031 frames) -- the already-committed
   canonical route ROADMAP.md records reaches "battle 2's settled first
   action menu (FISHERMAN JENSON / KABUTO)" via battle 1's WIN and the
   declined swap offer. No new route was invented per the brief: out-of-
   battle RNG advances every VBlank (`main.c:366`), so any new button
   sequence would draw a different battle-2 pairing than the one
   `BATTLE2_TURN1_KERNEL_CONFIG` already stages (its `rngSeed: 3530724670`
   matches this exact trace's recorded endpoint RNG, ROADMAP.md's
   "Battle 2 opponent send-out increment" note).
3. At the final frame (tick 33031, the settled action menu, no button
   pressed there), reads `gPlayerParty`/`gEnemyParty` (via `bin/oracle
   symbols gPlayerParty gEnemyParty gBattlerPartyIndexes`:
   `0x20244ec`/`0x2024744`/`0x202406e`) -- `struct Pokemon party[PARTY_SIZE]`,
   `PARTY_SIZE=6`, stride `sizeof(struct Pokemon)=0x64`
   (`include/pokemon.h:374`, `:376`) -- and `gBattlerPartyIndexes[0..1]`.
4. Decodes each occupied slot (species != `SPECIES_NONE`) with the same
   approach as `tools/extract/inspect-anchor.py`'s `decode_pokemon`
   (encrypted-substruct XOR-key decrypt, `GetSubstruct`'s
   `SUBSTRUCT_CASE` order table, checksum verification) -- copied, not
   imported (that script isn't import-safe: it raises at module scope
   unless invoked with exactly one CLI argument). Empty slots (species 0)
   decode to `null` without a checksum check, matching `CreateMon` never
   having touched them.

Run:

```sh
python3 tools/run-mgba-probe.py /tmp/battle2-party-ground-truth.json -- \
  tools/probe/dump-battle2-party-ground-truth.py \
  /tmp/battle2-party-ground-truth.json
```

Result: `mGBA probe wrote valid JSON before known teardown SIGSEGV` (the
documented benign teardown crash) -- the settled menu was reached
identically to the committed chain, and every occupied slot's `BoxPokemon`
checksum verified (the script raises `ValueError` on any mismatch; it did
not).

## 2. Raw probe output

```json
{
  "finalTick": 33031,
  "gBattlerPartyIndexes": { "player": 0, "opponent": 0 },
  "gPlayerParty": [
    { "species": "SPECIES_ONIX",    "personality": 1205102525, "hp": 117, "maxHp": 117 },
    { "species": "SPECIES_MAGBY",   "personality": 1534575931, "hp": 138, "maxHp": 138 },
    { "species": "SPECIES_BAYLEEF", "personality": 1550278706, "hp": 153, "maxHp": 153 },
    null, null, null
  ],
  "gEnemyParty": [
    { "species": "SPECIES_KABUTO",  "personality": 2507133325, "hp": 91,  "maxHp": 91 },
    { "species": "SPECIES_FLAAFFY", "personality": 69728841,   "hp": 163, "maxHp": 163 },
    { "species": "SPECIES_PONYTA",  "personality": 2855634950, "hp": 143, "maxHp": 143 },
    null, null, null
  ]
}
```

(`hp`/`maxHp` shortened above; full per-slot output -- IVs, EVs, moves, PP,
ability, status -- is in the script's own JSON, reproducible by re-running
it. All `status` fields read `0` (none). `gBattlerPartyIndexes` confirms
both active battlers are party slot 0, matching
`BATTLE2_TURN1_KERNEL_CONFIG`'s hardcoded `partyIndex: 0` assumption in
`factoryBattleScriptFullTurnDecision.ts`'s `activeBattler`.)

## 3. Decoded fields for the two FINDING mons

| Field | ONIX (`gPlayerParty[0]`) | KABUTO (`gEnemyParty[0]`) |
| --- | --- | --- |
| personality | `1205102525` | `2507133325` |
| species | `SPECIES_ONIX` (95) | `SPECIES_KABUTO` (140) |
| nature | `personality % 25 = 0` -> `NATURE_HARDY` | `personality % 25 = 0` -> `NATURE_HARDY` |
| genderRatio | 127 (`PERCENT_FEMALE(50)`, `species_info.h`) | 31 (`PERCENT_FEMALE(12.5)`, `species_info.h`) |
| gender (`getMonGender(genderRatio, personality)`) | **male** (`127 > (1205102525 & 0xff)=189` is false) | **male** (`31 > (2507133325 & 0xff)=141` is false) |
| ability (abilityNum 1) | `ABILITY_STURDY` (matches config `ability: 5`) | `ABILITY_BATTLE_ARMOR` (matches config `ability: 4`) |
| moves / PP | ROCK_SLIDE/BIND/DRAGON_BREATH/SANDSTORM, `[10,20,20,10]` | MEGA_DRAIN/ANCIENT_POWER/SAND_ATTACK/PROTECT, `[10,5,15,10]` |
| HP | 117/117 | 91/91 |

**Nature cross-check (the "expected set nature"):** the Battle Factory
rental generator picks each rental's personality by rejection-sampling
until `personality % 25` matches that rental set's fixed `nature` field
(ISSUES #55's "nature-rejection algorithm"; already-extracted
`src/data/gen/battle-frontier-mons.json`). ONIX's rental set is
`FRONTIER_MON_ONIX` (index 156, `nature: "NATURE_HARDY"`) and its moveset
(`ROCK_SLIDE`/`BIND`/`DRAGON_BREATH`/`SANDSTORM`) matches the probed moves
exactly. KABUTO's is `FRONTIER_MON_KABUTO` (index 139, the only Kabuto
entry in FISHERMAN JENSON's `eligibleMonSetIds`,
`src/data/gen/battle-frontier-trainers.json`), also `nature:
"NATURE_HARDY"`, moveset `MEGA_DRAIN`/`ANCIENT_POWER`/`SAND_ATTACK`/`PROTECT`
-- again an exact match. Both probed personalities land on nature index 0
(`NATURE_HARDY`) via the port's own `natureFromPersonality`
(`src/engine/opponentGen.ts`) -- **the invariant holds for both mons.**

**Independent cross-check:** ONIX's/MAGBY's/BAYLEEF's personalities here
(`1205102525`/`1534575931`/`1550278706`) exactly match the pre-existing,
independently-probed `src/data/gen/battle1-swap-rentalmons-dump.json`
(`declineBranch.ticks["33031"].rentalMons[0..2]`) -- the same trace's
save-block rental bookkeeping, read by a completely different probe
(`tools/probe/dump-rentalmons.py`) at the same tick. Personality does not
change between the rental pool and the live battle party.

## 4. Bench / legal-switch statement

`gPlayerParty` has exactly **3 occupied slots** at Battle 2's settled
action menu: ONIX (active, slot 0), MAGBY (slot 1, 138/138 HP, no status),
BAYLEEF (slot 2, 153/153 HP, no status). Slots 3-5 are empty
(`SPECIES_NONE`).

The port's own switch-legality gate
(`factoryBattleScriptFullTurnDecision.ts`'s `legalCommandDecisions`) admits
a party slot as a legal switch iff `partyIndex !== activePartyIndex &&
member.species !== 0 && !member.isEgg && member.hp !== 0`. Both bench
slots satisfy this (occupied, not an egg, nonzero HP) and neither battler
is switch-trapped by anything staged in `BATTLE2_TURN1_KERNEL_CONFIG`.

**Verdict: the real bench makes both `{kind:"switch",partyIndex:1}`
(MAGBY) and `{kind:"switch",partyIndex:2}` (BAYLEEF) legal** at this
request. The flip must source this from real `playerBenchHp`/
`playerBenchOverride` config (`[138, 153]` HP with MAGBY/BAYLEEF's real
species/moves/stats as the override), not the personality/species-less
placeholder the current staged config uses.

(`gEnemyParty` also has 3 occupied slots -- KABUTO active, FLAAFFY 163/163,
PONYTA 143/143 -- bonus evidence for a future opponent-bench slice; not
required by this FINDING and not asserted in the new test.)

## 5. FINDING verdicts

**FINDING 1 (bench legality) -- CONFIRMED, legacy fixture was RIGHT:**
`battle2CommandPresentationForRender`'s two hardcoded switch decisions
(`partyIndex: 1`, `partyIndex: 2`, `battleScene.ts:6831-6832`) are exactly
correct -- Battle 2's real
player bench is MAGBY and BAYLEEF, both alive. The staged kernel config's
current zero-switches result is not a divergence from the ROM, only a gap
in what the config models: it never populated `playerBenchHp`. The flip
must add real bench config so `legalDecisions` produces the same two
switches from kernel data instead of a `battleScene.ts` literal.

**FINDING 2 (gender) -- CONFIRMED, legacy fixture was RIGHT, staged
config's derived "female"/"female" was WRONG:** ONIX's and KABUTO's real
personality bytes (`1205102525`, `2507133325`) both derive **male** through
the port's own `getMonGender`, matching `BATTLE2_ACTION_MENU_MODEL`'s
hardcoded `"male"`/`"male"` exactly. The `"female"`/`"female"` the
personality-less staged config currently derives is an artifact of its
`personality: 0` default, not a real divergence to reconcile in the legacy
fixture's favor -- it is the *staged config* that needs the fix: it must
carry `personality: 1205102525` (player) and `personality: 2507133325`
(trainer) once `FactoryFullTurnBattlerConfig` config for the flip is wired
from this document instead of defaulting to 0.
