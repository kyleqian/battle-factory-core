# Direct item-manipulation opcode family — source ground truth (Rank 3)

Prep-lane evidence contract for `docs/gate6-family-worklist.md` Rank 3 (the
four moves whose entry scripts write `gBattleMons[].item` directly instead of
going through `ItemBattleEffects`: `MOVE_COVET`, `MOVE_TRICK`, `MOVE_RECYCLE`,
`MOVE_KNOCK_OFF`). This document re-derives every opcode's guard conditions
from source with exact citations, corrects/confirms the worklist's carrier
claims, and inventories what Tier-1 already proves engine-side so the
main-lane census/manifest wiring step doesn't have to rediscover it. It does
not touch the worklist, the coverage manifest, or
`level50-move-parameterization.json` — those are main-lane property; this is
the prep half of a prep→consume pair (mirrors
`docs/item-move-end-family-ground-truth.md`'s Rank-1 shape).

## 0. Headline correction to the worklist

Rank 3's "Blockers/dependencies: None found" is **incomplete**. Three of the
four moves already have real engine opcode implementations *and* committed
Battle Scene OFF oracle-evidence receipts, landed 2026-07-28 — well before
this worklist existed:

| Move | Engine opcode | Opcode unit test | Oracle (OFF) evidence |
| --- | --- | --- | --- |
| `MOVE_COVET` (`EFFECT_THIEF`) | `battleScriptHitChainOpcode.ts:3106` (`MOVE_EFFECT_STEAL_ITEM`) | `tests/battleScriptFamilyBCluster4Opcode.test.ts` | `docs/family-b-cluster4-off-evidence.md`, `tests/familyBCluster4OracleEvidence.test.ts` + `tests/fixtures/family-b-cluster4-off-evidence.json` (case `covetSuccessAndOccupiedAttacker`, `covetStickyHold`) |
| `MOVE_KNOCK_OFF` | `battleScriptHitChainOpcode.ts:3268` (`MOVE_EFFECT_KNOCK_OFF`) | `tests/battleScriptFamilyBCluster4Opcode.test.ts` | same pack, case `knockOffRemovalAndNoItem` |
| `MOVE_TRICK` | `src/engine/battleScriptTryswapitemsOpcode.ts` (`Cmd_tryswapitems`) | `tests/battleScriptTryswapitemsOpcode.test.ts` | `docs/trick-off-evidence.md`, `tests/trickOracleEvidence.test.ts` + `tests/fixtures/trick-off-evidence.json` |
| `MOVE_RECYCLE` | `src/engine/battleScriptTryrecycleitemOpcode.ts` (`Cmd_tryrecycleitem`) | `tests/battleScriptTryrecycleitemOpcode.test.ts` | **none** — only AI-scoring tests exist (`factoryAiCheckBadMove.test.ts` `AI_CBM_Recycle`, `factoryAiCheckViability.test.ts` `AI_CV_Recycle`), which score the AI's *decision* to use Recycle, not the move's own execution semantics |

None of this existing evidence uses this run's `tools/battle-lab/mechanic-*`
+ `tools/probe/verify-*` + `tools/probe/receipts/*` convention (established
tonight by the Rank-1 pack), and none of it is wired into
`docs/gate6-coverage-manifest.json`'s per-move-hook-join item axis, which
still lists all four moves `unsupported` as of this doc (verified: `python3
-c "import json; d=json.load(open('docs/gate6-coverage-manifest.json'));
print([r['status'] for r in d['sections']['perMoveHookJoins']['item'] if
r['move'] in {'MOVE_COVET','MOVE_TRICK','MOVE_RECYCLE','MOVE_KNOCK_OFF'}])"`
→ `['unsupported', 'unsupported', 'unsupported', 'unsupported']`). The real
remaining gap for the census-wiring step is therefore **not** "build oracle
evidence from scratch for four moves" — it is (a) decide whether the existing
family-b-cluster4/Trick evidence satisfies the per-move-hook-join promotion
bar as-is or needs restaging in the newer convention, and (b) build the one
genuinely missing receipt: **`MOVE_RECYCLE` has zero oracle-level evidence.**
§6 below stages exactly that gap using this session's own Rank-1 Cheri Berry
pack as the consumed-item precondition, per the brief's suggestion.

## 1. Four opcodes, four dispatch sites

All four moves are `MOVE_TARGET_SELECTED`/`MOVE_TARGET_USER` Normal-category
moves whose *own* entry script reaches a dedicated `Cmd_*` handler that reads
or writes `gBattleMons[].item`, distinct from the generic
`ItemBattleEffects` state machine `docs/item-move-end-family-ground-truth.md`
covers. Re-verified against `reference/pokeemerald/src/data/battle_moves.h`:

| Move | Effect | Entry script | Dispatch opcode |
| --- | --- | --- | --- |
| `MOVE_COVET` (`battle_moves.h:4462-4472`, power 40, accuracy 100, `secondaryEffectChance: 100`) | `EFFECT_THIEF` | `BattleScript_EffectThief` (`battle_scripts_1.s:1440-1442`) | `setmoveeffect MOVE_EFFECT_STEAL_ITEM` → shared `seteffectwithchance` in `BattleScript_EffectHit` (`:265`) → `Cmd_seteffectwithchance` (`battle_script_commands.c:2908`) → `case MOVE_EFFECT_STEAL_ITEM:` (`:2738-2794`) |
| `MOVE_TRICK` (`battle_moves.h:3526-3536`, power 0, accuracy 100) | `EFFECT_TRICK` | `BattleScript_EffectTrick` (`battle_scripts_1.s:2331-2343`) | `tryswapitems BattleScript_ButItFailed` → `Cmd_tryswapitems` (`battle_script_commands.c:9189-9270`) |
| `MOVE_RECYCLE` (`battle_moves.h:3617-3627`, power 0, accuracy 100, `target: MOVE_TARGET_USER`) | `EFFECT_RECYCLE` | `BattleScript_EffectRecycle` (`battle_scripts_1.s:2403-2412`) | `tryrecycleitem BattleScript_ButItFailed` → `Cmd_tryrecycleitem` (`battle_script_commands.c:9808-9828`) |
| `MOVE_KNOCK_OFF` (`battle_moves.h:3669-3679`, power 20, accuracy 100, `secondaryEffectChance: 100`) | `EFFECT_KNOCK_OFF` | `BattleScript_EffectKnockOff` (`battle_scripts_1.s:2475-2477`) | `setmoveeffect MOVE_EFFECT_KNOCK_OFF` → shared `seteffectwithchance` → `Cmd_seteffectwithchance` → `case MOVE_EFFECT_KNOCK_OFF:` (`:2863-2892`) |

The worklist's citations for all four sites are confirmed exact (line ranges
re-checked directly against the pinned source above; `MOVE_THIEF` is
confirmed absent from the Level-50 roster, matching the worklist's claim, by
the same `level50-move-parameterization.json` selector it cites).

## 2. `MOVE_EFFECT_STEAL_ITEM` (Covet/Thief) — full guard chain

`battle_script_commands.c:2738-2794`, in order:

1. `gBattleTypeFlags & BATTLE_TYPE_TRAINER_HILL` → no-op (`gBattlescriptCurrInstr++`). Not applicable to the Factory.
2. Attacker on `B_SIDE_OPPONENT` **and** battle type is none of `EREADER_TRAINER|FRONTIER|LINK|RECORDED_LINK|SECRET_BASE` → no-op. The Factory is `BATTLE_TYPE_FRONTIER`, so this guard's `!(...)` is always false in-Factory — it never fires here regardless of which side "steals."
3. Same battle-type exclusion **and** the attacker's own party slot already has its `gWishFutureKnock.knockedOffMons[attackerSide]` bit set → no-op. Same Frontier bypass as #2 — dead in this Factory context.
4. `gBattleMons[gBattlerTarget].item` is non-zero **and** target's ability is `ABILITY_STICKY_HOLD` → `BattleScript_NoItemSteal`, records the ability (`RecordAbilityBattle`). This check runs *before* the occupied-attacker/Enigma/Mail/itemless checks below, so Sticky Hold blocks even when the attacker itself is unavailable to steal for another reason — the two guards are independent, not mutually exclusive in priority order.
5. **The control condition this receipt uses**: `gBattleMons[gBattlerAttacker].item != ITEM_NONE` (attacker already holding something) **or** target's item is `ITEM_ENIGMA_BERRY` **or** `IS_ITEM_MAIL(target item)` **or** target's item is `ITEM_NONE` → no-op, no message (falls straight through to `BattleScript_EffectHit`'s existing damage/message flow, which already ran `datahpupdate`/`resultmessage` earlier in the shared script — Covet still deals damage, it just doesn't also steal).
6. Otherwise: steal executes. `gBattleStruct->changedItems[gBattlerAttacker] = gLastUsedItem = gBattleMons[gBattlerTarget].item` (deferred assignment — see §5), then **immediately** `gBattleMons[gBattlerTarget].item = ITEM_NONE` and a `REQUEST_HELDITEM_BATTLE` controller message syncs the *target's* party record to `ITEM_NONE` right away. A second `REQUEST_HELDITEM_BATTLE` message syncs the *attacker's* party record to the stolen item's value **also immediately** (this message carries `gLastUsedItem`, sent before the deferred `gBattleMons[gBattlerAttacker].item` assignment happens) — confirmed live in §5's receipt, where the attacker's *party* record updates several frames before its *live in-battle mirror* does. `BattleScript_ItemSteal` (`battle_scripts_1.s:3951-3955`) then plays the steal message.

## 3. `Cmd_tryswapitems` (Trick) — full guard chain

`battle_script_commands.c:9189-9270`. `BattleScript_EffectTrick` itself gates
first: `jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_ButItFailed`
(Trick fails outright against a Substitute) then `accuracycheck
BattleScript_ButItFailed, ACC_CURR_MOVE` (a real accuracy roll, unlike
Recycle — see §4) *before* `tryswapitems` is even reached. Inside the opcode:

1. Trainer Hill, or attacker-on-opponent-side outside
   `LINK|EREADER_TRAINER|FRONTIER|SECRET_BASE|RECORDED_LINK` → fail-jump. Dead in-Factory, same as Steal's #2.
2. Outside that same battle-type set, either side's `knockedOffMons` bit set → fail-jump. Dead in-Factory.
3. Both sides itemless, or either side holds `ITEM_ENIGMA_BERRY`, or either side's item `IS_ITEM_MAIL` → fail-jump.
4. Target's ability is `ABILITY_STICKY_HOLD` → `BattleScript_StickyHoldActivates`, records the ability. (Only the *target's* Sticky Hold blocks a swap — the attacker's own Sticky Hold, if any, does not protect its own item from being given away, matching Steal's asymmetric target-only check.)
5. Otherwise: swap executes. `changedItem = &gBattleStruct->changedItems[gBattlerAttacker]; oldItemAtk = gBattleMons[gBattlerAttacker].item; *changedItem = gBattleMons[gBattlerTarget].item;` (attacker's new item deferred, same `MOVEEND_CHANGED_ITEMS` mechanism as Steal) — then **immediately**: `gBattleMons[gBattlerAttacker].item = ITEM_NONE` and `gBattleMons[gBattlerTarget].item = oldItemAtk` (the target's new item is NOT deferred; it lands directly). Both sides get an immediate `REQUEST_HELDITEM_BATTLE` party-record sync. Both `choicedMove` (Choice-item lock) records are cleared for both battlers.

## 4. `Cmd_tryrecycleitem` (Recycle) — full guard chain

`battle_script_commands.c:9808-9828`. Self-targeted (`MOVE_TARGET_USER`), no
`accuracycheck` in `BattleScript_EffectRecycle` at all — Recycle can never
miss and its guard below is the *only* thing that can make it fail, so a
successful vs. blocked Recycle consumes **zero** `Random()` calls either way
(distinct from Steal/Knock-Off's shared `seteffectwithchance` roll, §5).

- Precondition: `gBattleStruct->usedHeldItems[attacker] != ITEM_NONE &&
  gBattleMons[attacker].item == ITEM_NONE`. Fails (jump to
  `BattleScript_ButItFailed`) otherwise — including the case where the
  attacker already holds an item (no double-holding), or never consumed one.
- On success: **immediate**, non-deferred assignment —
  `gLastUsedItem = *usedHeldItem; *usedHeldItem = ITEM_NONE; gBattleMons[gActiveBattler].item = gLastUsedItem;`
  — plus one `REQUEST_HELDITEM_BATTLE` party sync. `usedHeldItems[attacker]`
  is reset to `ITEM_NONE` in the same step, so Recycle only restores a given
  consumed item once (a second Recycle right after fails the precondition
  again, now for lack of a `usedHeldItems` entry rather than for holding an
  item).
- `gBattleStruct->usedHeldItems[battler]` is populated by exactly one other
  site: `Cmd_removeitem` (`battle_script_commands.c:5899-5911`, the
  `removeitem BS_SCRIPTING`/`removeitem BS_TARGET` opcode used at the tail of
  every berry-consumption battle script, e.g.
  `BattleScript_BerryCureParRet` — see
  `docs/item-move-end-family-ground-truth.md` §3). This is the exact
  connection the brief names: any consumed-berry moveend (Cheri Berry curing
  paralysis, White Herb restoring stats, etc.) leaves a `usedHeldItems` entry
  Recycle can later restore. §6 stages this directly by reusing this
  session's Rank-1 Cheri-Berry-paralysis-cure pack's carrier pair.

## 5. `MOVE_EFFECT_KNOCK_OFF` — full guard chain, and the "destroyed vs retained" question

`battle_script_commands.c:2863-2892`:

1. `gBattleMons[gEffectBattler].ability == ABILITY_STICKY_HOLD` is checked **first**, independent of whether the target even holds an item:
   - itemless **and** Sticky Hold → silent no-op (`gBattlescriptCurrInstr++`), no message — same silent outcome as the plain-itemless case below, so Sticky Hold's message only ever appears when it actually prevented something.
   - holding an item **and** Sticky Hold → `BattleScript_StickyHoldActivates`, records the ability.
2. Otherwise, if `gBattleMons[gEffectBattler].item` is non-zero: knock off executes — **immediate** `gLastUsedItem = item; gBattleMons[gEffectBattler].item = ITEM_NONE;`, plus `gWishFutureKnock.knockedOffMons[side] |= gBitTable[gBattlerPartyIndexes[gEffectBattler]]` (a per-party-slot bit, zeroed only at battle start, `battle_main.c:3077-3078`). `BattleScript_KnockedOff` (`battle_scripts_1.s`) plays the removal message. `choicedMove` is cleared for the effect battler.
3. Otherwise (itemless, no Sticky Hold) → silent no-op.

**Destroyed vs. retained (the brief's question, answered from source):** unlike
every other opcode in this family, Knock Off's item-removal branch contains
**no `BtlController_EmitSetMonData(..., REQUEST_HELDITEM_BATTLE, ...)` call at
all** — grepped exhaustively in the case body. The party record's real held
item is therefore **never overwritten** by Knock Off itself; only the live
in-battle mirror (`gBattleMons[].item`) is cleared. The removal nonetheless
persists for the rest of that battle even across switches, because
`Cmd_switchindataupdate` (`battle_script_commands.c:4621-4644`, "check
knocked off item" at `:4641`) re-applies `gBattleMons[battler].item = ITEM_NONE`
*every time that party slot's mon is sent out*, keyed off the same
persistent `knockedOffMons[side]` bit — so a knocked-off mon that switches
out and back in is still itemless in-battle, even though its underlying
party-record item was never touched. Net effect: **Knock Off's removal is
battle-scoped, not a permanent loss to the party/save data** — the item
would still be present in the party record after the battle ends (outside
Factory-battle scope to further verify here, since the Factory's rental mons
are synthesized per-battle anyway and this run has no post-battle-persistence
acceptance target). This directly refines the family-b-cluster4 evidence's
own `observedVsSourceOnly` note (`"knockedOffMons"`, `tests/familyBCluster4OracleEvidence.test.ts:106`), which flagged the flag's existence but not this specific "which record does/doesn't get overwritten" mechanism.

## 6. RNG-count consequence for control-arm design (a correction to the naive Rank-1 analogy)

`Cmd_seteffectwithchance` (`battle_script_commands.c:2908-2936`, shared by
every `MOVE_EFFECT_*` secondary effect including Steal and Knock Off) always
calls `Random() % 100 < percentChance` to decide whether to invoke
`SetMoveEffect` at all — **even when `percentChance` is 100** (both Covet and
Knock Off have `secondaryEffectChance: 100`), since `Random() % 100` ranges
0-99 and is therefore always `< 100`. The roll still consumes exactly one
`Random()` call, but its *outcome* is guaranteed, so `SetMoveEffect` always
runs; the actual steal/knock-off success or failure is then decided
*entirely deterministically* inside the `MOVE_EFFECT_STEAL_ITEM`/
`MOVE_EFFECT_KNOCK_OFF` guard chains above (occupied attacker, Sticky Hold,
Enigma Berry, Mail, itemless) — none of which consume any further `Random()`
calls.

**Consequence:** a control arm built around one of those guards (this
receipt's "attacker already holding an item") diverges from the success arm
in **zero** `Random()` calls — the two arms' RNG traces are not just
"identical up to a shared prefix" (Rank 1's shape, where the control's extra
full-paralysis roll broke the tie after the shared prefix) but **identical in
total call count for the entire turn**, since nothing downstream depends on
whether the steal happened either. This is confirmed live in §7's receipt:
both arms consume exactly 14 `Random()` calls. Recycle's guard (§4) is even
more deterministic — it has no `seteffectwithchance` roll at all, so a
successful vs. blocked Recycle differs by zero calls from the very first
instruction. Trick's guards are likewise all deterministic except for its
own `accuracycheck` (a real, always-executed roll per this run's established
100%-accuracy convention — see `docs/item-move-end-family-ground-truth.md`
§5) and the pre-emptive Substitute check (no RNG).

## 7. Representative receipt — `MOVE_COVET` steal vs. occupied-attacker control

**Carrier verification** (re-checked directly against
`docs/gate6-coverage-manifest.json#sections.corpus.level50Sets`, both
confirmed correct — no worklist correction needed here, unlike Rank 1's
Slugma/Body-Slam claim):

- Set 203 = `SPECIES_LINOONE`, moves include `MOVE_COVET`, item
  `BATTLE_FRONTIER_ITEM_WHITE_HERB` (item id 180). Single ability
  (`species-stats.json`: `["ABILITY_PICKUP", "ABILITY_NONE"]`), base speed
  100.
- Set 25 = `SPECIES_ZUBAT`, item `BATTLE_FRONTIER_ITEM_CHERI_BERRY` (item id
  133), single ability (`["ABILITY_INNER_FOCUS", "ABILITY_NONE"]`), base
  speed 55 — the same carrier this run's Rank-1 pack already used.

**Selected pair:** attacker `SPECIES_LINOONE` (id 289), `MOVE_COVET` (id 343)
in all four slots, max speed EVs; defender `SPECIES_ZUBAT` (id 41),
`MOVE_TACKLE` (id 33, inert) in all four slots, zero speed EVs. Linoone's
100-base-speed vs. Zubat's 55 decides the order outright, no tie risk.

**Two fixtures, identical except Linoone's `item` field** (the exact and
only guard variable from §2's list):

- `tools/battle-lab/mechanic-item-manipulation-covet-steal-off.json` —
  Linoone holds `item: 0` (`ITEM_NONE`) — steal succeeds.
- `tools/battle-lab/mechanic-item-manipulation-covet-control-off.json` —
  Linoone holds `item: 180` (its own real White Herb, set 203's actual
  held item) — the `gBattleMons[gBattlerAttacker].item != ITEM_NONE` guard
  blocks the steal. Using Linoone's *real* catalog item (rather than an
  arbitrary placeholder) means this control arm is itself a legal,
  realistic Factory matchup, not just a synthetic probe.

Both arms: Zubat holds `item: 133` (Cheri Berry) throughout.

**Verified via** `tools/probe/verify-item-manipulation-covet-off.py`
(fast source/fixture re-check with no oracle, plus a live Battle Scene OFF
check that runs both fixtures — each in its own subprocess, mirroring
`verify-item-move-end-paralysis-off.py`'s one-`EmeraldOracle`-core-per-process
convention — dumping each fixture's dense per-frame trace directly as that
fixture's committed receipt). Run twice independently; both receipts
reproduced **byte-identically**:

```
PASS: steal run attacker acquires Cheri Berry@332 (party-synced@191), defender
loses it@191; control run: no item transition on either side; defender HP
115->72 identical both arms; RNG calls steal=14 control=14 (equal)
```

**Observed shape, both runs:**

- Steal arm: Zubat's live item goes `133 → 0` at frame 191 (immediate, per
  §2's step 6), and Zubat's *party* item transitions at the same frame.
  Linoone's *party* item transitions `0 → 133` at frame 191 too (the
  attacker-side controller message fires immediately, same as the target's),
  but Linoone's *live* `gBattleMons` item only becomes `133` at frame 332 —
  the deferred `MOVEEND_CHANGED_ITEMS` commit (§2 step 6, §1's
  `MOVEEND_CHANGED_ITEMS` = state 7 of `Cmd_moveend`, reached after the
  move's own message sequence finishes). This is a direct, receipt-level
  confirmation of the party-record-vs-live-mirror timing split derived from
  source in §2 — the two normally update in lockstep for simpler moves, but
  Steal's deferred-attacker-assignment design splits them by design.
- Control arm: neither battler's live item nor party item ever changes;
  Linoone's Covet still lands and deals damage (occupied-attacker only blocks
  the steal, not the hit) for the exact same defender HP loss as the steal
  arm (115 → 72 both arms — Covet's damage calc has no dependency on whether
  the steal itself executes).
- Both arms: Linoone's Covet PP decrements 40 → 39; Zubat's Tackle PP
  decrements by exactly 1 total across its four slots (35 → 34 on the used
  slot) once Zubat takes its own turn. Total `Random()` calls: **14 in both
  arms** — per §6, the occupied-attacker guard is a deterministic branch,
  not a second RNG-gated event, so this family's natural control has *zero*
  RNG divergence from the success arm, unlike Rank 1's one-extra-call
  full-paralysis divergence.

## 8. Not covered by this step (open for the consume/main-lane step)

- `MOVE_KNOCK_OFF`'s Sticky Hold-blocked arm, `MOVE_TRICK`'s swap, and
  `MOVE_RECYCLE`'s consumed-berry restore — priority order for any follow-up
  receipts in this step's remaining time budget (see the run's final report
  for which, if any, landed). Knock Off and Trick already have real
  oracle-level evidence per §0's inventory; Recycle does not and is the
  genuine gap.
- Whether the existing family-b-cluster4/Trick evidence packs should be
  restaged in this run's `mechanic-item-manipulation-*` naming convention or
  reused as-is is a main-lane wiring decision, not resolved here — §0's
  inventory is the input that decision needs.
