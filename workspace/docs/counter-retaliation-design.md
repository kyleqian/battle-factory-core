# Counter / Mirror Coat retaliation-bookkeeping design scout

Side-lane design scout for the two data-model gaps
`docs/fixed-damage-cluster-ground-truth.md` §3 proved block
`COUNTERDAMAGECALCULATOR`/`MIRRORCOATDAMAGECALCULATOR`: (1) no engine home for
`gProtectStructs[].physicalBattlerId`/`.specialBattlerId`, and (2) the
per-turn `TurnValuesCleanUp(FALSE)` `ProtectStruct`-wide clear is unmodeled.
This doc pins both precisely from source, finds a third, sharper problem the
prep-scout didn't surface (§1.2), proposes the engine shape, maps every
consumer that changes, and ships an ordered registration checklist. **No
production module is touched** -- `battleScriptRulesContext.ts`,
`battleScriptHitChainOpcode.ts`, and `battleEndTurnOrchestration.ts` are
unchanged; §4's checklist is the follow-up main-lane step. Follows the
`docs/end3-design.md` precedent.

## 1. Source semantics, pinned exactly

### 1.1 The write side: `Cmd_datahpupdate` writes TWO parallel copies, into two different C structs

```c
// battle_script_commands.c:1938-1969
if (IS_TYPE_PHYSICAL(moveType) && !(gHitMarker & HITMARKER_PASSIVE_HP_UPDATE) && gCurrentMove != MOVE_PAIN_SPLIT)
{
    // Record physical damage/attacker for Counter
    gProtectStructs[gActiveBattler].physicalDmg = gHpDealt;
    gSpecialStatuses[gActiveBattler].physicalDmg = gHpDealt;
    if (gBattlescriptCurrInstr[1] == BS_TARGET)
    {
        gProtectStructs[gActiveBattler].physicalBattlerId = gBattlerAttacker;
        gSpecialStatuses[gActiveBattler].physicalBattlerId = gBattlerAttacker;
    }
    else { /* symmetric gBattlerTarget assignment to both structs */ }
}
else if (!IS_TYPE_PHYSICAL(moveType) && !(gHitMarker & HITMARKER_PASSIVE_HP_UPDATE))
{
    // Record special damage/attacker for Mirror Coat -- same shape, gProtectStructs+gSpecialStatuses .specialDmg/.specialBattlerId
}
```

Every hit writes the **same value, same battlerId-selection logic**, into
**both** `gProtectStructs[battler]` (`struct ProtectStruct`,
`include/battle.h:104-130`, 21 fields: 19 packed bitfields incl.
`physicalBattlerId`/`specialBattlerId` as `u8`, plus `physicalDmg`/
`specialDmg` as `u32`) and `gSpecialStatuses[battler]` (`struct
SpecialStatus`, `include/battle.h:132-147`, a **different, smaller** struct
that happens to also carry fields named `physicalDmg`/`specialDmg`/
`physicalBattlerId`/`specialBattlerId`). Two distinct C structs, same field
names, written together, by design (source's own comment at line 1935-1937:
*"While physicalDmg/specialDmg below are only distinguished between for
Counter/Mirror Coat, they are used in combination as general damage trackers
for other purposes"*).

This engine's write-through
(`createDatahpupdateOpcodeHandler`, `battleScriptHitChainOpcode.ts:1747-1887`)
models **only the `gSpecialStatuses` copy**:
```ts
// battleScriptHitChainOpcode.ts:1849-1854
battlerChanges = {
  ...battlerChanges,
  specialStatus: physical
    ? Object.freeze({ ...battlerState.specialStatus, physicalDmg: dealt })
    : Object.freeze({ ...battlerState.specialStatus, specialDmg: dealt }),
};
```
Its own doc comment (`:1735-1741`) already says so: *"gProtectStructs'
parallel copy and physicalBattlerId/specialBattlerId ... have no reader
anywhere in this engine's currently modeled scope and are not tracked."*
**Answer to this step's WORK item 1: not write-dead in general** -- the
`gSpecialStatuses` copy is correctly written and correctly read by two real,
already-landed consumers (§1.2) -- **but write-dead specifically for
Counter/Mirror Coat**, which read `gProtectStructs`, a struct with zero
engine fields today.

### 1.2 The sharper problem: the two structs cannot be merged -- divergent per-turn clear cadence

This is the one level deeper than the prep-scout's §3a framing
("the registered handler only reproduces the damage-amount half", implying
`gProtectStructs`'s copy is a strict superset/extension of what's already
modeled). It is not. The two structs are cleared by **two different
functions, at two different granularities**:

- `gSpecialStatuses` is cleared by `SpecialStatusesClear()`
  (`battle_main.c:4894-4904`, a full per-battler byte memset), called from
  **`HandleAction_ActionFinished`** (`battle_util.c:658-663`) -- i.e. **after
  every single action in the turn finishes**, not once per turn. Also called
  at battle-init (`BattleStartClearSetData`, `:3041`) and pre-turn-1
  (`TryDoEventsBeforeFirstTurn`, `:3902`).
- `gProtectStructs` is cleared by `TurnValuesCleanUp(FALSE)`
  (`battle_main.c:4857-4874`, full per-battler byte memset), called **once
  per true turn boundary**, at the *tail* of `BattleTurnPassed`
  (`:3974`) -- plus the same battle-init/pre-turn-1 sites (`:3040`, `:3901`).
  **Never per-action.**

Concretely, this cluster's own live fixture proves the divergence: prep-scout
§5c (Electrode `Pound` action 1 -> Shuckle `Counter` action 2, same turn).
`Pound`'s `datahpupdate` writes `gSpecialStatuses[Shuckle].physicalDmg = 2`
**and** `gProtectStructs[Shuckle].physicalDmg = 2`. The instant action 1
finishes, `HandleAction_ActionFinished` calls `SpecialStatusesClear()` and
**wipes `gSpecialStatuses[Shuckle]` back to zero** -- before action 2
(`Counter`) even begins. `gProtectStructs[Shuckle].physicalDmg` survives,
untouched, because nothing clears it between actions. If
`Cmd_counterdamagecalculator` read `gSpecialStatuses` instead of
`gProtectStructs`, Counter would read 0 and fail on **every** turn, not just
the ones where nothing hit it -- source's actual choice of struct is
load-bearing, not incidental.

**Conclusion:** this engine's `specialStatus.physicalDmg`/`.specialDmg`
fields are real, correctly-scoped, source-faithful models of
`gSpecialStatuses` -- confirmed by their two real consumers, both
already-landed and untouched by this design:
- **Rage** (`MOVEEND_RAGE`, `executeRage`, `battleScriptMoveEndOpcode.ts:202-224`):
  gates on `targetState.specialStatus.physicalDmg !== 0 ||
  ...specialDmg !== 0` (line 215) -- a same-action, this-hit-just-landed
  check, exactly `gSpecialStatuses`'s per-action lifetime.
- **Defrost** (`MOVEEND_DEFROST`, `executeDefrost`,
  `battleScriptMoveEndControllers.ts:133-150`): gates on
  `targetState.specialStatus.specialDmg !== 0` (line 144) -- same shape.

Both read at `Cmd_moveend`, immediately after the hit that produced the
value, within the *same* action -- before any other action's
`SpecialStatusesClear()` could have run. **They must not be touched.** A
naive fix that bolted `physicalBattlerId`/`specialBattlerId` onto the
*existing* `specialStatus` object would still be wrong even with the extra
fields present, because that object's clear cadence (whenever this engine
eventually models `SpecialStatusesClear`, per-action) is not the cadence
Counter needs (per-turn). The fields need a structurally separate home
(§2.3), not an extension of `specialStatus`.

### 1.3 `TurnValuesCleanUp`, exact body, exact call sites

```c
// battle_main.c:4857-4888
static void TurnValuesCleanUp(bool8 var0)
{
    for (gActiveBattler = 0; gActiveBattler < gBattlersCount; gActiveBattler++)
    {
        if (var0)
        {
            gProtectStructs[gActiveBattler].protected = 0;
            gProtectStructs[gActiveBattler].endured = 0;
        }
        else
        {
            dataPtr = (u8 *)(&gProtectStructs[gActiveBattler]);
            for (i = 0; i < sizeof(struct ProtectStruct); i++)
                dataPtr[i] = 0;                       // full 21-field memset

            if (gDisableStructs[gActiveBattler].isFirstTurn)
                gDisableStructs[gActiveBattler].isFirstTurn--;
            if (gDisableStructs[gActiveBattler].rechargeTimer) { /* decrement, clear STATUS2_RECHARGE at 0 */ }
        }
        if (gDisableStructs[gActiveBattler].substituteHP == 0)
            gBattleMons[gActiveBattler].status2 &= ~STATUS2_SUBSTITUTE;   // unconditional, both branches
    }
}
```

`var0 == TRUE` clears **only** `protected`/`endured` (2 of 21 fields).
`var0 == FALSE` is a full unconditional byte-memset of the **entire**
`ProtectStruct` -- all 19 bitfields (`protected, endured, noValidMoves,
helpingHand, bounceMove, stealMove, flag0Unknown, prlzImmobility,
confusionSelfDmg, targetNotAffected, chargingTurn, fleeType(2b),
usedImprisonedMove, loveImmobility, usedDisabledMove, usedTauntedMove,
flag2Unknown, flinchImmobility, notFirstStrike, palaceUnableToUseMove`) plus
`physicalDmg`, `specialDmg`, `physicalBattlerId`, `specialBattlerId` -- with
`isFirstTurn`/`rechargeTimer` decrements as `var0`-gated *side effects on a
different struct* (`DisableStruct`), and the substitute-status2 sync as an
unconditional side effect on `gBattleMons` regardless of `var0`.

Four call sites, `grep -n TurnValuesCleanUp battle_main.c`:

| Line | Function | `var0` | Position |
| --- | --- | --- | --- |
| 3040 | `BattleStartClearSetData` | `FALSE` | battle init |
| 3901 | `TryDoEventsBeforeFirstTurn` | `FALSE` | pre-turn-1, just before first `HandleTurnActionSelectionState` |
| 3960 | `BattleTurnPassed` (top) | `TRUE` | before `DoFieldEndTurnEffects`/`DoBattlerEndTurnEffects` |
| 3974 | `BattleTurnPassed` (tail) | `FALSE` | **after** `HandleFaintedMonActions`+`HandleWishPerishSongOnTurnEnd`, immediately before returning to `HandleTurnActionSelectionState` for the next turn |

**Positional finding:** the full `FALSE` clear runs at the very *end* of
end-turn resolution -- after weather/screens (`DoFieldEndTurnEffects`),
abilities/items/status ticks (`DoBattlerEndTurnEffects`), fainting
(`HandleFaintedMonActions`), and wish/perish-song. So `gProtectStructs`
state (including Counter/Mirror Coat's `physicalDmg`/`physicalBattlerId`)
is visible to **all** of that turn's end-of-turn processing, not just the
moves that set it -- relevant for any future rung modeling an end-turn
effect keyed off e.g. `endured`.

### 1.4 `Cmd_counterdamagecalculator`/`Cmd_mirrorcoatdamagecalculator`, one level deeper

```c
// battle_script_commands.c:7943-7966
static void Cmd_counterdamagecalculator(void)
{
    u8 sideAttacker = GetBattlerSide(gBattlerAttacker);
    u8 sideTarget = GetBattlerSide(gProtectStructs[gBattlerAttacker].physicalBattlerId);  // computed unconditionally

    if (gProtectStructs[gBattlerAttacker].physicalDmg           // gate (a): a hit was recorded this turn
        && sideAttacker != sideTarget                            // gate (b): recorded hit came from the opposing side
        && gBattleMons[gProtectStructs[gBattlerAttacker].physicalBattlerId].hp)  // gate (c): that battler is still alive
    {
        gBattleMoveDamage = gProtectStructs[gBattlerAttacker].physicalDmg * 2;
        if (gSideTimers[sideTarget].followmeTimer && gBattleMons[gSideTimers[sideTarget].followmeTarget].hp)
            gBattlerTarget = gSideTimers[sideTarget].followmeTarget;
        else
            gBattlerTarget = gProtectStructs[gBattlerAttacker].physicalBattlerId;
        gBattlescriptCurrInstr += 5;
    }
    else
    {
        gSpecialStatuses[gBattlerAttacker].ppNotAffectedByPressure = 1;
        gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);
    }
}
```

`sideTarget` is computed via `GetBattlerSide(physicalBattlerId)`
**unconditionally**, even in the zeroed post-clear state
(`physicalDmg == 0`, `physicalBattlerId == 0` -> battler 0's side) -- but the
`&&` chain short-circuits on `physicalDmg` truthiness first, so this dead
read never gates the branch; no side effect either way (`GetBattlerSide` is
pure). Three real success gates, all must hold:
(a) `physicalDmg != 0` -- something hit this battler physically since the
last clear; (b) `sideAttacker != sideTarget` -- the recorded hit came from
an opposing-side battler (structurally always true in singles once (a)
holds, since the only other battler present is the opponent -- matters for
doubles ally-fire); (c) `gBattleMons[physicalBattlerId].hp != 0` -- the
battler being retaliated against hasn't since fainted from something else
this turn (e.g. end-of-turn poison, or a second move) -- **not** captured by
the prep-scout's summary table, a genuine third gate.

**Failure branch** writes a real, already-modeled field:
`gSpecialStatuses[attacker].ppNotAffectedByPressure = 1`
(`ppNotAffectedByPressure` exists today at
`battleScriptRulesContext.ts:190`, part of `BattleScriptMoveEndBattlerMetadata`)
-- small but must be included in registration, not dropped as
"just a jump". Jump target: `T1_READ_PTR(gBattlescriptCurrInstr + 1)`, i.e.
`BattleScript_FailedFromAtkString` per the script topology (prep-scout §4).

`Cmd_mirrorcoatdamagecalculator` (`:7969-7990`) is confirmed
byte-for-byte identical with every `physical*` swapped for `special*` (the
source comment at `:7968` says exactly this).

## 2. Engine-side mapping

### 2.1 Current modeling state of every `ProtectStruct` field -- full table

| Field | Engine home today | Cleared per-turn today? |
| --- | --- | --- |
| `protected` | `BattleScriptMoveEndBattlerMetadata.protected` (`rulesContext.ts:188`) | no |
| `endured` | `BattleScriptRulesBattlerBase.endured?` (`:156`) | no |
| `chargingTurn`, `targetNotAffected`, `flag2Unknown` | `BattleScriptMoveEndBattlerMetadata` (`:182-187`) | no |
| `prlzImmobility`, `confusionSelfDmg`, `loveImmobility`, `bounceMove`, `stealMove`, `helpingHand` | `BattleScriptRulesBattlerBase` (optional, `:143-158`) | no |
| `usedDisabledMove`, `usedTauntedMove`, `usedImprisonedMove` | `BattleScriptRulesBattlerBase` (`:139-142`) | no |
| `flinchImmobility` | `BattleScriptRulesBattlerBase` (`:137`) | **mis-cleared** -- see §2.2 |
| `physicalDmg`, `specialDmg` | not modeled as `ProtectStruct` fields (only the *different-struct* `gSpecialStatuses` copy exists, §1.2) | n/a |
| `physicalBattlerId`, `specialBattlerId` | **not modeled anywhere** | n/a |
| `noValidMoves`, `flag0Unknown`, `fleeType`, `notFirstStrike`, `palaceUnableToUseMove` | not modeled (no known engine consumer yet) | n/a |

### 2.2 A found, currently-harmless inaccuracy in this engine's own header comment

`runBattleEndTurnOrchestration`'s doc comment claims:
> `TurnValuesCleanUp(TRUE)`'s only effect this engine can represent is
> clearing each battler's `flinchImmobility` (`STATUS2_FLINCHED`)

(`battleEndTurnOrchestration.ts:1309-1310`, backed by the code at
`:1323-1328` that zeroes `flinchImmobility` for every battler at the top of
the pass.) **This is wrong on two independent counts, verified against
source:**

1. `TurnValuesCleanUp(TRUE)` (§1.3) clears **only** `protected`/`endured`.
   It never touches `flinchImmobility`.
2. `ProtectStruct::flinchImmobility` and `gBattleMons[].status2`'s
   `STATUS2_FLINCHED` bit are **two different C fields**, cleared by **two
   different functions**: `STATUS2_FLINCHED` is cleared in
   `HandleEndTurn_ContinueBattle` (`battle_main.c:3943`) and
   `TryDoEventsBeforeFirstTurn` (`:3912`) -- not inside `TurnValuesCleanUp`
   at all. `ProtectStruct::flinchImmobility` is set at `battle_util.c:2114`
   and cleared **only** at battler switch-in (`battle_main.c:3309`) or via
   the full `ProtectStruct` memset (`TurnValuesCleanUp(FALSE)`) -- **never**
   by the `TRUE` branch.

**Practical impact today: none, verified.** `flinchImmobility`'s only
modeled reader is `wasBattleScriptBattlerUnableToUseMove`
(`battleScriptRulesContext.ts:880-894`, the exact `WasUnableToUseMove` port),
consumed by `executeAttackerVisible`
(`battleScriptMoveEndControllers.ts:200-220`, `MOVEEND_ATTACKER_VISIBLE`,
**source state 9** -- not state 13 as this step's brief said, see §5) which
runs mid-turn, before end-turn orchestration. Inside
`runDoBattlerEndTurnEffects` (the only place that could read a
prematurely-cleared value in the *same* pass), `ENDTURN_UPROAR` is a
permanent no-op (`battleEndTurnOrchestration.ts:975`) and `ENDTURN_THRASH`
is an explicit case-barrier on `STATUS2_LOCK_CONFUSE`
(`:978-979`) -- `wasBattleScriptBattlerUnableToUseMove` is never invoked
there today. So this mislabeled early clear currently produces zero
observable divergence, but is worth correcting in the same follow-up that
lands the real clears (§4 step 3), not left as a wrong comment.

### 2.3 Chosen shape: field placement

Four new fields on `BattleScriptMoveEndBattlerMetadata`
(`battleScriptRulesContext.ts:175-264`), sibling to the already-landed
`protected`/`chargingTurn`/`targetNotAffected`/`flag2Unknown`:

```ts
/** ProtectStruct::physicalDmg -- Counter's own retaliation-amount input (distinct from SpecialStatus::physicalDmg, specialStatus.physicalDmg above; see docs/counter-retaliation-design.md §1.2 for why these cannot share a field). */
protectPhysicalDmg: number;
protectPhysicalBattlerId: BattleScriptBattlerId;
/** ProtectStruct::specialDmg -- Mirror Coat's equivalent. */
protectSpecialDmg: number;
protectSpecialBattlerId: BattleScriptBattlerId;
```

Rationale:
- Matches the **already-landed convention**: every other modeled
  `ProtectStruct` field is a flat scalar on the battler object, not nested
  under a struct-shaped sub-object -- `specialStatus` is nested because it
  models a genuinely different C struct (`gSpecialStatuses`), and that
  precedent argues *for* keeping `ProtectStruct`'s copy flat and separate,
  not nesting it under `specialStatus` too.
- The `protect`-prefix is deliberate, not decorative: reusing the bare name
  `physicalDmg` on the same battler object for two fields with two different
  clear cadences (§1.2) would be a landmine for the next reader (and for
  `withBattler`-style spread updates that don't know which one they mean).
- Belongs on `BattleScriptMoveEndBattlerMetadata` (constructed, not
  `BattlerBase`) since -- like `protected`/`chargingTurn` -- every legacy
  fixture indifferent to Counter/Mirror Coat can omit it and default to 0,
  matching source's zero-initialized struct. `BattleScriptRulesBattler`
  (the optional construction-input mirror, `:270-303`) gets the same four
  fields as `?:` optional; `createBattleScriptRulesContext`'s battler loop
  (`:1594-1687`, the exact pattern already used for `flinchImmobility`/
  `usedDisabledMove`/etc.) gets four new `requireUnsigned(... ?? 0, ...)`
  entries alongside the existing ones.

### 2.4 Chosen shape: clear placement

`mapFaintedActionsResult`'s `"no-fainted-battlers"` branch
(`battleEndTurnOrchestration.ts:1287-1301`, specifically line 1288) is the
correct seam:

```ts
function mapFaintedActionsResult(result: BattleScriptFaintedActionsResult): BattleEndTurnResult {
  if (result.kind === "no-fainted-battlers") return Object.freeze({ kind: "next-turn", state: result.state });
  ...
```

Both of `runBattleEndTurnOrchestration`'s return points funnel through this
one function -- line 1350 (mid-loop early-exit once `battleOutcome` is
decided) and line 1366 (end-of-function, the normal path) -- and it is the
exact point mirroring source's post-`HandleFaintedMonActions`+
`HandleWishPerishSongOnTurnEnd` position (`battle_main.c:3968-3974`). Since
this engine's own `HandleWishPerishSongOnTurnEnd` equivalent is *already* an
explicit documented no-op deferral (`battleEndTurnOrchestration.ts:1367`),
"no fainted battlers left to resolve" is functionally identical to "ready
for `TurnValuesCleanUp(FALSE)`".

Concretely: before wrapping in `{ kind: "next-turn", state: result.state }`,
apply a full per-battler reset of every field in §2.1's table (all 19
bitfields this engine has any home for, plus the 4 new §2.3 fields) to their
zero value, for all `battlersCount` battlers -- matching the C memset's
uniform, unconditional, no-per-field-special-case shape. `noValidMoves`,
`flag0Unknown`, `fleeType`, `notFirstStrike`, `palaceUnableToUseMove` have no
engine field yet, so there's nothing to reset for them (not a gap this
change needs to close). The `DisableStruct` `isFirstTurn`/`rechargeTimer`
decrements and the unconditional substitute-status2 sync are `var0`-adjacent
source side effects on a *different* struct/field -- out of this doc's scope
(see Out of scope); note them so the follow-up step doesn't silently drop
them if/when that struct gets modeled.

## 3. Consumer-change map

| Consumer | File:lines | Change needed |
| --- | --- | --- |
| Rules-context types | `battleScriptRulesContext.ts:175-303` | Add the 4 fields (§2.3) to `BattleScriptMoveEndBattlerMetadata` and `BattleScriptRulesBattler`. |
| Battler materialization | `battleScriptRulesContext.ts:1594-1687` | Add 4 `requireUnsigned(battler.protectPhysicalDmg ?? 0, ...)`-shaped entries, same pattern as the existing 15. |
| `datahpupdate` write-through | `battleScriptHitChainOpcode.ts:1747-1887`, doc comment `:1725-1746` | Physical branch (`:1849-1854`) also sets `protectPhysicalDmg: dealt, protectPhysicalBattlerId: <BS_TARGET/BS_ATTACKER selection, already computed as `isTargetOperand` at `:1769`>`; special branch sets the `Special` pair. Update the doc comment's now-false claim that `gProtectStructs`' copy "has no reader anywhere in this engine's currently modeled scope". |
| Battle-init/terminal construction | `factoryBattleScriptDecision.ts:221`ish, `factoryBattleScriptFullTurnDecision.ts:221`, `factoryBattleScriptTerminalDecision.ts:166` | Each currently zero-constructs `specialStatus: {restoredBattlerSprite: 0, physicalDmg: 0, specialDmg: 0}` -- add the 4 new fields to the same explicit zero-construction (sibling fields, not nested). |
| Turn-boundary clear | `battleEndTurnOrchestration.ts:1287-1301` (`mapFaintedActionsResult`) | Add the full-`ProtectStruct`-table reset (§2.4) before returning `"next-turn"`. |
| Mislabeled early clear | `battleEndTurnOrchestration.ts:1303-1328` | Correct or fold per §2.2/§4 step 3 in the same change. |
| New opcode handlers | *(new, `battleScriptHitChainOpcode.ts` or a sibling file)* | Register `B_SCR_OP_COUNTERDAMAGECALCULATOR`/`B_SCR_OP_MIRRORCOATDAMAGECALCULATOR` per §1.4's exact 3-gate branch, reading the new fields. |
| Rage / Defrost | `battleScriptMoveEndOpcode.ts:202-224`, `battleScriptMoveEndControllers.ts:133-150` | **No change.** Different struct (§1.2), untouched by this design. |
| END3 / end-turn abilities design | `docs/end3-design.md` | **No overlap.** Orthogonal mechanism, no field or seam shared with this doc. |

## 4. Registration checklist (follow-up main-lane step)

Ledger to verify against: prep-scout §5c/§5d
(`mechanic-fixed-damage-counter-{hit,fail}.json`, already live-verified) plus
new Mirror Coat fixtures (not yet live-fixtured, prep-scout §1d).

1. Add the 4 fields (§2.3) to the rules-context types + materialization loop
   + the 3 battle-init/terminal construction sites (§3 rows 1-2, 4).
2. Wire `createDatahpupdateOpcodeHandler`'s physical/special branches to also
   write the 2 new fields each (§3 row 3); update its stale doc comment.
3. Add the full-`ProtectStruct`-table clear at `mapFaintedActionsResult`'s
   `"no-fainted-battlers"` branch (§2.4); in the same change, resolve
   §2.2's mislabeled top-of-function `flinchImmobility` clear -- either
   delete it (redundant once the bottom clear is correct, since the bottom
   clear also re-zeroes `flinchImmobility` for real) or correct it to real
   `protected`/`endured=0` `TRUE`-clear semantics if a future rung needs the
   `TRUE`/`FALSE` split's mid-pass timing distinction (this doc found none
   yet needs it -- Uproar/Thrash's `WasUnableToUseMove` reads are still
   no-ops/barriers, §2.2).
4. Register `B_SCR_OP_COUNTERDAMAGECALCULATOR`/`B_SCR_OP_MIRRORCOATDAMAGECALCULATOR`
   per §1.4's exact 3-gate success branch (`physicalDmg != 0` &&
   `sideAttacker != sideTarget` && target alive) + the
   `ppNotAffectedByPressure=1`-and-jump failure branch; the follow-me
   redirect branch stays an explicit no-op (structurally unreachable in L50
   singles, prep-scout §6).
5. Register `B_SCR_OP_TYPECALC2` (already scoped (a)-portable,
   prep-scout §2) -- both `EffectCounter`/`EffectMirrorCoat` scripts need it
   (prep-scout §4's topology).
6. Compile `BattleScript_EffectCounter`/`BattleScript_EffectMirrorCoat` into
   the committed script program if not already present -- re-grep fresh,
   don't assume.
7. Re-run `tools/probe/verify-fixed-damage-cluster-ground-truth.ts`'s
   counter-hit/counter-fail fixtures through the new engine path; add Mirror
   Coat fixtures before claiming Mirror Coat done (not yet live-fixtured).
8. Run `npm test`. Per §5's risk finding, treat any newly-failing test that
   asserted cross-turn persistence of a `ProtectStruct` bit as a signal the
   test pinned the pre-existing stale-persists gap -- fix the test's
   expectation, don't revert the clear.

## 5. Risk to landed mechanics

**The main risk is a latent bug this design's clear fixes, not one it
introduces.** Every `ProtectStruct` bit this engine models today except
`flinchImmobility` (§2.1) has **no per-turn clear at all** -- once set on
turn N it reads truthy on turn N+1, N+2, ... forever, unless that same
field's own admission logic happens to overwrite it. Verified against
`battleScriptActionAdmission.ts`'s `CANCELER_DISABLED` branch
(`:2193-2216`): `after: isDisabled ? 1 : sourceBattler.usedDisabledMove` --
faithfully reproducing source's own `Cmd_attackcanceler` shape (only forced
to 1 when disabled; never forced to 0 -- source relies entirely on
`TurnValuesCleanUp(FALSE)` for the reset). The same shape recurs for
`usedTauntedMove`, `usedImprisonedMove`, `confusionSelfDmg`,
`prlzImmobility`, `loveImmobility` in the same file. **Without this design's
clear, a Disabled-move attempt on turn N leaves `usedDisabledMove=1`
permanently, and turn N+1's `WasUnableToUseMove` check
(`MOVEEND_ATTACKER_VISIBLE`, source state 9 -- correcting this step's brief,
which cited "state 13"/`MOVEEND_SUBSTITUTE`, a different case that reads
`disable[i].substituteHP` and never calls `WasUnableToUseMove` at all, per
`docs/battle-script-move-end-state-ownership.md`'s own row for state 9 vs
13) would incorrectly report the attacker as unable to act on a turn where
it actually moved legally.**

A targeted grep of `tests/battleEndTurnOrchestration.test.ts` (the file most
directly touched by §2.4's change) found no assertion of cross-turn
`ProtectStruct`-bit persistence. This is **not exhaustive** -- roughly 45
test files reference these field names across the suite (attack-canceler
variants, admission, move-end state/ownership/topology, Magic Coat, etc.);
only this one file was read line-by-line for this doc, given the session's
time budget. §4 step 8 makes re-running `npm test` after the real change the
authoritative check, not this doc's grep.

No risk found to Rage/Defrost (§1.2/§3, different struct, untouched) or to
the END3/end-turn-abilities design (`docs/end3-design.md`, orthogonal
mechanism, no shared field or seam).

## Corrections to `docs/fixed-damage-cluster-ground-truth.md` and this step's own brief

- Prep-scout §3a's framing ("the registered handler only reproduces the
  damage-amount half") undersells the gap. What's modeled
  (`specialStatus.physicalDmg`/`.specialDmg`) is not a subset of what
  Counter needs -- it is a **different struct** with a materially shorter
  clear cadence (§1.2), correctly serving its own real consumers (Rage,
  Defrost). The fix is a structurally separate field, not an extension of
  the existing one.
- This step's brief cites "the nine-bit `WasUnableToUseMove` predicate from
  moveend state 13" -- `WasUnableToUseMove`'s sole consumer in source is
  `MOVEEND_ATTACKER_VISIBLE`, **state 9**
  (`battle_script_commands.c:4353-4367`; confirmed against this engine's own
  `docs/battle-script-move-end-state-ownership.md` row for state 9). State
  13 is `MOVEEND_SUBSTITUTE` (`:4381-4388`), which reads
  `disable[i].substituteHP` and never calls `WasUnableToUseMove`. Corrected
  throughout §2.2/§5.
- This engine's own header comment at `battleEndTurnOrchestration.ts:1309-1310`
  mischaracterizes `TurnValuesCleanUp(TRUE)`'s real effect and conflates
  `ProtectStruct::flinchImmobility` with `gBattleMons[].status2`'s
  `STATUS2_FLINCHED` bit -- two distinct C fields, cleared by two entirely
  different functions (§2.2). Currently harmless (verified, §2.2); flagged
  for correction in §4 step 3, not fixed here (a comment-only edit is still
  a `src/` touch, out of scope for this step per its own brief).

## Out of scope (per this step's brief)

No edits to `battleScriptRulesContext.ts`, `battleScriptHitChainOpcode.ts`,
or `battleEndTurnOrchestration.ts`; no `B_SCR_OP_COUNTERDAMAGECALCULATOR`/
`B_SCR_OP_MIRRORCOATDAMAGECALCULATOR`/`B_SCR_OP_TYPECALC2` registration; no
`DisableStruct` `isFirstTurn`/`rechargeTimer` modeling (noted in §2.4 as a
side effect the follow-up must not silently drop, not implemented here); no
`PROGRESS.md`/`ISSUES.md`/factory-AI/ENDTURN/status-cluster docs; no other
census rows.

## PAPERCUT

None this session -- all findings came from static source/engine reads, no
oracle or build tooling involved.
