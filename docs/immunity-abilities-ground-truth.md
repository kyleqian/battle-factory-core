# Status-curing immunity abilities: source and Battle Scene OFF evidence

## 1. Source contract

`Cmd_moveend` state 4 calls
`AbilityBattleEffects(ABILITYEFFECT_IMMUNITY, 0, 0, 0, 0)`
(`reference/pokeemerald/src/battle_script_commands.c:4285-4290`). The helper
scans every live battler from index 0 and has these eight ability/status
members (`reference/pokeemerald/src/battle_util.c:2873-2951`):

| Ability | Trigger | Source mutation | `gBattleTextBuff1` selection |
| --- | --- | --- | --- |
| Immunity | poison, toxic poison, or toxic-counter bits | `status1 = 0` | poison |
| Own Tempo | confusion bits | clear confusion only | confusion |
| Limber | paralysis | `status1 = 0` | paralysis |
| Insomnia | sleep | clear Nightmare, then `status1 = 0` | sleep |
| Vital Spirit | sleep | clear Nightmare, then `status1 = 0` | sleep |
| Water Veil | burn | `status1 = 0` | burn |
| Magma Armor | freeze | `status1 = 0` | ice |
| Oblivious | infatuation bits | clear infatuation only | love |

The primary-status cases really assign the complete `status1` word to zero;
they do not mask only the matching bit. Every successful arm selects one of
the seven `gStatusConditionString_*Jpn` sentinel strings. During message
expansion, `gStatusConditionStringsTable` maps that sentinel to the English
word above (`battle_main.c:569-588`, `battle_message.c:1304-1310`).

After mutation, source sets `gBattleScripting.battler`, emits
`BtlController_EmitSetMonData(REQUEST_STATUS_BATTLE, ..., 4, &status1)`,
marks that battler's controller, and transfers to
`BattleScript_AbilityCuredStatus`. That script uses the one fixed message ID
`STRINGID_PKMNSXCUREDITSYPROBLEM`, waits, updates the scripting battler's
status icon, and returns (`data/battle_scripts_1.s:4215-4219`). Thus the
per-status selection is the `B_BUFF1` status sentinel, not seven different
`STRINGID_*` values.

The successful helper arm returns directly at `battle_util.c:2949`; it does
not reach the common `RecordAbilityBattle` tail at lines 3194-3195. The
ability is visibly revealed by
`{B_SCR_ACTIVE_NAME_WITH_PREFIX}'s {B_SCR_ACTIVE_ABILITY}` in the message,
but this specific cure does not write BattleHistory. The call's ordinary
pre-dispatch assignment still sets `gLastUsedAbility` from literal battler
0. Safari battles skip the complete helper body.

State 4 has unusual loop ownership: `Cmd_moveend` increments
`moveendState` only when a complete helper scan returns zero. After one cure,
the callback `return` re-enters state 4, scans again from battler 0, and can
cure a second battler before a final quiet scan advances to state 5.

## 2. Level-50 singles reachability

The branch is reachable even though the corresponding prevention opcodes
block a status while the immunity ability is already active. Active ability
bytes can change after status infliction:

1. a non-immune battler acquires status from a real move;
2. Skill Swap exchanges its active ability with a matching immunity holder;
3. Skill Swap's own `goto BattleScript_MoveEnd` reaches state 4 with both the
   old status and the newly acquired immunity ability present.

This composition exists in the Level-50 Factory corpus. Set 235
`FRONTIER_MON_GIRAFARIG_1` carries Skill Swap; set 244
`FRONTIER_MON_MAGNETON_1` carries Thunder Wave; and set 233
`FRONTIER_MON_HITMONLEE_1` supplies Limber. All three indices are inside the
Level-50 range 110-849. A statused Girafarig can retain paralysis across the
first opponent's replacement, then use Skill Swap on Hitmonlee. No doubles,
Open-level set, injected transient status, or non-source mechanism is
required.

The focused mechanicLab receipt compacts that multi-opponent setup into one
turn: faster Hitmonlee has four Thunder Wave slots to constrain the Factory
AI, while Girafarig selects its real set-235 Skill Swap. Thunder Wave writes
paralysis through the stock status script before Girafarig acts; Skill Swap
then gives Girafarig Limber, making the cure pass live on the same move end.
The lab injects no HP/status/stage transient.

## 3. Implementation and Tier-1 pins

`src/engine/battleScriptMoveEndOpcode.ts` now performs the source scan at the
real state-4 call site. A cure:

- clears the exact source-owned battle status fields;
- synchronizes the controller's four-byte status1 write into the matching
  persistent party slot and emits `set-battler-status-data`;
- selects the English counterpart of the source status sentinel in the
  typed `battleTextBuff1Status`;
- sets `scriptingBattler`, marks its controller pending, and calls
  `BattleScript_AbilityCuredStatus` without incrementing state 4;
- lets the committed print/wait/status-icon/return script execute, then
  rescans state 4 exactly as source does.

The full-turn message boundary supplies the selected status word as
`B_BUFF1`. AI ability history deliberately stays unchanged because source's
successful early return bypasses `RecordAbilityBattle`.

`tests/battleScriptMoveEndOpcode.test.ts` pins all eight ability/status
members (Insomnia and Vital Spirit separately), complete-status1 clearing,
selective status2 clearing, Nightmare handling, battle/party synchronization,
controller and status-icon events, message ID plus each status substitution,
message-only reveal semantics, a two-battler rescan, non-matching status,
no-status quiet pass, and Safari quiet pass. The focused engine/ratchet run
was 118/118 green.

The unsupported-branch ratchet for
`src/engine/battleScriptMoveEndOpcode.ts` deliberately shrank **5 → 4**.
The remaining named barriers are states 0, 2, 5, and 11; the adjacent
Synchronize states were not changed.

## 4. Two-seed Battle Scene OFF receipts

Fixture:
`tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json`.
Probe: `tools/probe/probe-immunity-limber-off.py`, launched only through
`tools/run-mgba-probe.py` with fresh output paths.

| Seed | Status staging | Ability change and cure | Exact RNG ledger |
| --- | --- | --- | --- |
| `610839776` | frame 183: Girafarig active + party status1 are both `64` (paralysis), active ability `39` (Inner Focus) | frame 345: active abilities become player `7` (Limber) / opponent `39` while status remains `64`; frame 494: both active + party status become `0`; frame 495: `GIRAFARIG's LIMBER / cured its paralysis problem!` | frame 145 AI equal-slot draw `3872647298→2946366413`; frame 315 paralysis mobility draw `→3062566076`; no Skill Swap/cure draw |
| `324508639` | same frame and state | same frame and state, including the exact message | frame 145 AI draw `3908550445→4153048220`; frame 315 mobility draw `→2492921567`; no Skill Swap/cure draw |

Both receipts also pin that active abilities exchange while persistent party
abilities remain Girafarig `39` / Hitmonlee `7`, and Skill Swap PP changes
`10→9`. Raw process-isolated receipts:

- `tools/probe/receipts/immunity-limber-off-seed-610839776.json`
  (SHA-256 `0a1003ce04064f0df5a35b39b3ceb7384b69955067e58439b741dd89c47850da`)
- `tools/probe/receipts/immunity-limber-off-seed-324508639.json`
  (SHA-256 `0f713deedf75b4ad1681b0b918cad7e2e6429f16b9030e32f77106604731952a`)

## 5. Census receipts

Both generators were rerun after the port:

- Executable frontier remains byte-identical at SHA-256
  `8b18f75413c8046530f75c8a5b331a0bf31e8b92596029356ef6025071965261`:
  effects **214/214**, moves **355/355**, Factory-L50 unweighted
  **276/276**, weighted **2957/2957**.
- Ability/item parity changed SHA-256
  `947686a0da72392cc2aae224637b732927d9f7b0c06f01a8701557440edb319d`
  → `3614ca0af148a3bdd260fb8a214e8d221fde36f890f0204b57a2fea2c8e66bcd`.
  Totals remain abilities **69/69** (weighted **1096/1096**) and hold
  effects **42/42** (weighted **850/850**). Exact engine-reference deltas
  are Immunity **12→14**, Own Tempo **5→7**, Limber **6→8**, Insomnia
  **11→13**, Vital Spirit **11→13**, Water Veil **7→9**, Magma Armor
  **2→4**, and Oblivious **5→6**. Every new spelling is a canonical
  identifier-form `ABILITY_*` reference; none is split or computed.
