# Synchronize move-end states: source and Battle Scene OFF evidence

## 1. Source contract

Successful `SetMoveEffect` status writes bank
`gBattleCommunication[MOVE_EFFECT_BYTE]` in
`gBattleStruct->synchronizeMoveEffect` and set
`HITMARKER_SYNCHRONIZE_EFFECT` only for poison, toxic, paralysis, and burn
(`reference/pokeemerald/src/battle_script_commands.c:2501-2511`). Sleep,
freeze, and every non-primary status are not Synchronize inputs.

`Cmd_moveend` consumes that handoff in numeric state order
(`battle_script_commands.c:4275-4298`):

1. `MOVEEND_SYNCHRONIZE_TARGET` calls
   `ABILITYEFFECT_SYNCHRONIZE` for `gBattlerTarget`.
2. After the on-damage and status-immunity states,
   `MOVEEND_SYNCHRONIZE_ATTACKER` calls
   `ABILITYEFFECT_ATK_SYNCHRONIZE` for `gBattlerAttacker`.

Both successful helper modes require the selected holder's
`ABILITY_SYNCHRONIZE` and the handoff marker
(`battle_util.c:2971-3003`). They clear that marker, strip
`MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN` from the banked effect, and
convert toxic to ordinary poison. The target-holder mode adds
`MOVE_EFFECT_AFFECTS_USER`, so `SetMoveEffect` applies the reflection to the
attacker; the attacker-holder mode leaves the selector bit clear, so it
applies to the target. Each mode sets `gBattleScripting.battler` to its
ability holder, sets `HITMARKER_STATUS_ABILITY_EFFECT`, and calls
`BattleScript_SynchronizeActivates`.

That callback is exactly `waitstate; seteffectprimary; return`
(`data/battle_scripts_1.s:4204-4207`). The ordinary primary-status path
therefore owns battle status, persistent party status, the controller write,
status animation/icon, and the selected `gGot*StringIds` message. Because the
ability marker is set, it selects `B_MSG_STATUSED_BY_ABILITY`, producing e.g.
`RALTS's SYNCHRONIZE paralyzed Foe MAGNETON!`; `gLastUsedAbility` supplies
the ability substitution. A successful helper reaches the common
`RecordAbilityBattle` tail at `battle_util.c:3194-3195`, so both move-end
sites reveal the holder to BattleHistory.

The reflected primary status write can bank the effect and set the
Synchronize marker again. Consequently, target-side processing is observably
first: if both battlers hold Synchronize, state 2 reflects to the attacker,
the reflected write re-arms the marker, and state 5 activates the attacker
holder. Its second status write is quiet when the target is already statused,
but the second ability activation/reveal still occurred. If the later
attacker does not have Synchronize, source leaves the re-armed marker set.
Safari battles skip both complete helper bodies, including their ordinary
`gLastUsedAbility` assignment.

## 2. Level-50 singles reachability

The branch is directly Factory-reachable. Set **5**,
`FRONTIER_MON_RALTS`, carries Ralts, whose ability slot 0 is
`ABILITY_SYNCHRONIZE`; it is inside the Level-50 set range 0-849. Set
**244**, `FRONTIER_MON_MAGNETON_1`, carries Thunder Wave. No ability swap,
injected status, doubles topology, or Open-level-only record is required.

The committed mechanicLab fixture
`tools/battle-lab/mechanic-synchronize-thunder-wave-off.json` constructs
three complete legal Pokémon per side before `CB2_InitBattle`. Its active
Ralts has Synchronize; faster Magneton has all four slots set to Thunder
Wave, constraining the real Factory AI without injecting its decision.
Thunder Wave is the real staged status move.

## 3. Implementation and Tier-1 pins

`src/engine/battleScriptRulesContext.ts` now carries the source-shaped
`synchronizeMoveEffect` byte. The successful primary-status write in
`src/engine/battleScriptHitChainOpcode.ts` banks exactly the four source
effects and sets the marker; non-synchronizable statuses preserve the bank
and do not set the marker.

`src/engine/battleScriptMoveEndOpcode.ts` implements both states at their
numeric call sites. It preserves the target-then-attacker ordering, source
selector bits and toxic downgrade, scripting holder, last-used ability,
ability-history reveal, committed callback transfer, and the existing
primary-status controller/party synchronization path. All source branches at
these two sites are executable, so no replacement `(b)` guard remains.

Focused Tier-1 coverage pins poison, burn, paralysis, toxic→ordinary poison,
sleep/freeze quiet banking, no-Synchronize and no-marker quiet passes, Safari
quiet passes, battle + party status synchronization, controller event,
ability-message selector, reveal state, both one-way orderings, and the
two-Synchronize re-arm/quiet-second-write case. The focused engine/context/
ratchet run was **398/398** green.

The unsupported-branch ratchet for
`src/engine/battleScriptMoveEndOpcode.ts` deliberately shrank **4 → 2**.
The two remaining barriers belong to unrelated move-end states 0 and 11.

## 4. Two-seed Battle Scene OFF receipts

Probe: `tools/probe/probe-synchronize-off.py`, launched only through
`tools/run-mgba-probe.py` with a fresh scratch output path. The trace stops
on the reflected-status message, before Ralts's selected move can execute.

| Seed | Status and message checkpoints | Exact RNG ledger |
| --- | --- | --- |
| `610839776` | frame 118: Ralts battle + party status `0→64`; frame 241: Magneton battle + party status `0→64`; frame 243: `RALTS's SYNCHRONIZE / paralyzed Foe MAGNETON!` | frame 80 Factory AI equal-slot draw `3872647298→2946366413`; no Thunder Wave or Synchronize draw |
| `324508639` | identical frames, state, controller synchronization, ability 28, and message | frame 80 Factory AI equal-slot draw `3908550445→4153048220`; no Thunder Wave or Synchronize draw |

Committed compact raw receipts:

- `tools/probe/receipts/synchronize-off-seed-610839776.json` — SHA-256
  `ea35791b94d187e8e7f454d149c69a4451e0b25488e62ac9fdcef767e8e5fb34`
- `tools/probe/receipts/synchronize-off-seed-324508639.json` — SHA-256
  `fa627af69ae43f41eb7d876ee6482679eded52fb7e6d8d8e013eb1f189be19e0`

## 5. Census receipts

Both generators were rerun after the port:

- Executable frontier remains byte-identical at SHA-256
  `8b18f75413c8046530f75c8a5b331a0bf31e8b92596029356ef6025071965261`:
  effects **214/214**, moves **355/355**, Factory-L50 unweighted
  **276/276**, weighted **2957/2957**. Regeneration changed only its embedded
  UTC date and trailing generator whitespace; both date-only/whitespace-only
  churn were restored.
- Ability/item parity changed SHA-256
  `3614ca0af148a3bdd260fb8a214e8d221fde36f890f0204b57a2fea2c8e66bcd`
  → `691995babae0fa8f50eaa9917f18f5bff2370157e33120d19618ac0c77d2133e`.
  Totals remain abilities **69/69** (weighted **1096/1096**) and hold
  effects **42/42** (weighted **850/850**). The exact engine-reference delta
  is Synchronize **2→3**. The implementation uses the canonical identity
  spelling `ABILITY_SYNCHRONIZE`; no spelling is split or computed.

The parity generator's exact-set line pin moved
`battleScriptHitChainOpcode.ts`'s unchanged quoted
`HOLD_EFFECT_EVASION_UP` recovery site from **1176→1178** because the new
Synchronize marker declaration added two preceding lines. That ratchet move
is line-drift only and deliberately recorded in
`tools/report/ability-item-parity-census.ts`.
