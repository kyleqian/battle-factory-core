# Absorbing abilities: source and Battle Scene OFF evidence

## 1. Source contract

`AbilityBattleEffects(ABILITYEFFECT_ABSORBING)` has exactly three switch
cases (`reference/pokeemerald/src/battle_util.c:2679-2729`):

- Volt Absorb requires an Electric move with nonzero base power; Water
  Absorb requires a Water move with nonzero base power. A non-full target
  prepares `-max(1, floor(maxHP / 4))` and redirects to
  `BattleScript_MoveHPDrain`; a full target redirects to
  `BattleScript_MonMadeMoveUseless`.
- Flash Fire requires a Fire move and a target that is not frozen. Its first
  activation sets `RESOURCE_FLAG_FLASH_FIRE` and selects
  `B_MSG_FLASH_FIRE_BOOST`; repeat activation preserves the flag and selects
  `B_MSG_FLASH_FIRE_NO_BOOST`.
- `gProtectStructs[attacker].notFirstStrike` selects the no-`ppreduce`
  script label after PP was already deducted for an earlier target. The
  first target uses the `_PPLoss` entry.
- The shared successful tail calls `RecordAbilityBattle`, so reveal occurs
  only on activation (`battle_util.c:3194-3195`).

`JumpIfMoveFailed` calls the helper only after
`TrySetDestinyBondToHappen`; a nonzero result transfers control immediately
instead of advancing the ordinary hit chain
(`reference/pokeemerald/src/battle_script_commands.c:1010-1023`). The three
redirected scripts are source data, not new engine inventions
(`reference/pokeemerald/data/battle_scripts_1.s:4078-4110`):

- HP drain updates the target health bar and battle/party HP, prints
  `STRINGID_PKMNRESTOREDHPUSING`, then sets
  `MOVE_RESULT_DOESNT_AFFECT_FOE`.
- The full-HP arm prints `STRINGID_PKMNSXMADEYUSELESS` and sets the same
  move-result flag.
- Flash Fire prints through `gFlashFireStringIds` and ends the move. Its
  persistent resource flag later multiplies Fire damage by 1.5 after
  weather and before the unconditional `+2`
  (`reference/pokeemerald/src/pokemon.c:3367-3371`).

There is no remaining unreachable sub-branch behind this call site: all
source arms above execute in the staged rules model, while mismatched types,
zero-power Volt/Water moves, frozen Flash Fire, and unrelated abilities are
ordinary source-defined quiet fallthroughs. Therefore no new `(b)` guard was
added.

## 2. Implementation and Tier-1 pins

The live call site is
`src/engine/battleScriptHitChainOpcode.ts`'s
`advancePastAccuracyCheck`. It now:

1. applies Destiny Bond state first;
2. evaluates the source gates and jumps to the exact committed script label;
3. records `lastUsedAbility` plus the AI reveal only on activation;
4. stores Flash Fire's persistent battler resource flag and message selector;
5. lets the already-shared `ppreduce`, `healthbarupdate`, `datahpupdate`,
   `orbyte`, message, and move-end handlers execute the scripts.

`Cmd_ppreduce` now writes `notFirstStrike` when it really deducts PP.
Turn cleanup clears that ProtectStruct bit, while switch/faint cleanup clears
the persistent Flash Fire resource bit. `damageCalc.ts` consumes the latter
at the source position.

Focused Tier-1 coverage in
`tests/battleScriptHitChainOpcode.test.ts` pins every ability with a matching
and non-matching type, Volt/Water's nonzero-power gate, quarter-max minimum,
full-HP arm and cap through battle plus party HP, first/later-target PP
labels, frozen and repeat Flash Fire arms, message selector, move-failed
flag, and reveal semantics. `tests/damageCalc.test.ts` pins later Flash Fire
consumption (Fire only) and its weather-before-boost-before-`+2` truncation.
The focused run was 549/549 green.

The unsupported-branch ratchet for
`src/engine/battleScriptHitChainOpcode.ts` deliberately shrank **13 → 12**:
the one shared absorption barrier was removed, not moved.

## 3. Two-seed Battle Scene OFF receipts

Fixture:
`tools/battle-lab/mechanic-absorbing-volt-absorb-off.json`. It uses
`mechanicLab` `overrides.parties` with three complete legal Pokémon per side.
The player selects Spark (209) from Onix. Faster opposing Jolteon has Volt
Absorb and all four move slots set to Take Down (36), constraining the
Factory AI to that move. Take Down recoil stages real damage before Spark;
no HP/status/stage transient is injected.

Probe:
`tools/probe/probe-absorbing-ability-off.py`, always launched through
`tools/run-mgba-probe.py` with a fresh output path. Both runs were
process-isolated and used the `battle-scene-off` bootstrap.

| Seed | Recoil staging | Absorb / failure | Exact RNG ledger |
| --- | --- | --- | --- |
| `610839776` | frame 263: Jolteon battle HP = party HP = **170/172** | frame 431: both HP copies **170→172**; frame 432 displays `Foe JOLTEON restored HP\nusing its VOLT ABSORB!`; frame 543 has `gMoveResultFlags=0x08`, `gLastUsedAbility=10` | frame 44 AI equal-slot draw `3872647298→2946366413`; frame 74 Take Down crit `→3062566076`; frame 77 Take Down damage `→2893943935`; frame 375 Spark accuracy `→4113026182`; no Spark crit/damage draw |
| `324508639` | frame 263: Jolteon battle HP = party HP = **170/172** | same frames and state: HP **170→172**, message at 432, `0x08` + ability 10 at 543 | frame 44 AI equal-slot draw `3908550445→4153048220`; frame 74 Take Down crit `→2492921567`; frame 77 Take Down damage `→3539562342`; frame 375 Spark accuracy `→3809075937`; no Spark crit/damage draw |

Committed raw transition receipts:

- `tools/probe/receipts/absorbing-volt-absorb-off-seed-610839776.json:55`
  begins the four-row attributed RNG ledger; `:564` is recoil-staged HP,
  `:954` is the synchronized heal, `:993` the message, and `:1032` the
  move-failed transition.
- `tools/probe/receipts/absorbing-volt-absorb-off-seed-324508639.json:55`
  begins the independent seed's ledger; its matching checkpoints are
  `:564`, `:954`, `:993`, and `:1032`.

The message, battle HP, plaintext party HP, move-result byte, ability byte,
chosen moves `[209,36]`, and every `sRandCount` change are sampled directly
from the stock ROM. The absorption itself adds no RNG draw: after Spark's
ordinary accuracy check, the ability redirect exits before crit and damage
calculation.

## 4. Census receipts

Both generators were rerun after the port:

- Executable frontier:
  `npx tsx tools/report/executable-frontier-census.ts` remains byte-identical,
  SHA-256
  `8b18f75413c8046530f75c8a5b331a0bf31e8b92596029356ef6025071965261`,
  at effects **214/214**, moves **355/355**, Factory-L50 unweighted
  **276/276**, weighted **2957/2957**. The static move census already
  considered these effect scripts executable; the runtime barrier ratchet,
  correctly, is what shrank.
- Ability/item parity:
  `node --experimental-strip-types
  tools/report/ability-item-parity-census.ts` changed SHA-256
  `aa207d6e68a5c6fb1bdcf5ab2b3b0a427182177951a3db0af596c64ebe94c5b3`
  → `947686a0da72392cc2aae224637b732927d9f7b0c06f01a8701557440edb319d`.
  Coverage totals remain abilities **69/69** (weighted **1096/1096**) and
  hold effects **42/42** (weighted **850/850**). Exact engine-reference
  deltas are Volt Absorb **2→4**, Water Absorb **2→3**, and Flash Fire
  **2→4**. All spellings remain canonical identifier-form `ABILITY_*`
  references; none is split or computed to evade the scanner.
