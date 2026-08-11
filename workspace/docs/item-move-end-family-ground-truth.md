# `ITEMEFFECT_MOVE_END` family — source ground truth (Rank 1)

Prep-lane evidence contract for `docs/gate6-family-worklist.md` Rank 1 (the
generic post-move status-cure/stat-restore item family, 191 Level-50
item-axis rows). This document re-derives every arm's exact condition from
source, confirms the single dispatch site, and corrects the worklist's
staging sketch against the real moveend ordering. It does not touch the
worklist, the coverage manifest, or `level50-move-parameterization.json` —
those are main-lane property; this is the prep half of a prep→consume pair.

## 1. Dispatch site — exactly one caller, unconditional per completed move

`ItemBattleEffects` case `ITEMEFFECT_MOVE_END` lives at
`reference/pokeemerald/src/battle_util.c:3625-3767`
(`ITEMEFFECT_MOVE_END` = 3, `reference/pokeemerald/include/battle_util.h:44`).

Its only caller in the whole source tree is
`reference/pokeemerald/src/battle_script_commands.c:4330-4335`:

```c
case MOVEEND_ITEM_EFFECTS_ALL: // item effects for all battlers
    if (ItemBattleEffects(ITEMEFFECT_MOVE_END, 0, FALSE))
        effect = TRUE;
    else
        gBattleScripting.moveendState++;
    break;
```

Verified by exhaustive grep — `ITEMEFFECT_MOVE_END` appears in exactly three
places in `reference/pokeemerald/`: its `#define` (`battle_util.h:44`), the
`switch` arm that implements it (`battle_util.c:3625`), and this one call
site. `MOVEEND_ITEM_EFFECTS_ALL` = 11
(`reference/pokeemerald/include/constants/battle_script_commands.h:404`), one
case of `Cmd_moveend`'s 17-state machine (states 0-16,
`battle_script_commands.h:393-410`).

`Cmd_moveend` (`battle_script_commands.c:4210`) runs once per battle-script
"moveend" dispatch — reached after (almost) every move resolves, via a
`do { switch (gBattleScripting.moveendState) { ... } } while (...)` loop
(`battle_script_commands.c:4236`) that walks states 0→16 in order within that
single dispatch, advancing `moveendState` after each case (or, for cases
whose handler pushes a battle-script call like the item-cure arms, re-running
the *same* state on the next tick until the handler reports nothing left to
do — this is why `ItemBattleEffects(ITEMEFFECT_MOVE_END, ...)` can fire
multiple times per moveend, once per battler that has a pending item effect,
each showing its own message/animation before the state machine advances to
`MOVEEND_KINGSROCK_SHELLBELL` (12)). `ITEMEFFECT_MOVE_END` itself internally
loops `for (battler = 0; battler < gBattlersCount; battler++)`
(`battle_util.c:3626`) and `break`s out after finding (at most) one
battler's effect per call, which is what drives that re-entrant loop.

## 2. Timing fact (supervisor correction, verified)

Because `MOVEEND_ITEM_EFFECTS_ALL` is reached inside the *same* `Cmd_moveend`
dispatch as the move that just executed — not at the start of a later
turn — any status the acting move itself inflicted earlier in its own
battle script (e.g. `EFFECT_PARALYZE`'s status-setting script, which runs
and returns long before the move's tail `goto BattleScript_MoveEnd`) is
already present in `gBattleMons[].status1`/`.status2` by the time state 11
runs. A cure-berry the target already holds therefore cures the status
**at the moveend of the very move that inflicted it**, before either
battler's next turn.

**Consequence:** the worklist's Rank-1 staging sketch ("turn 1: stage
status via a first move; turn 2: any move's moveend triggers the cure") is
unreachable for a berry the holder already carries at the time status is
inflicted — status and a held cure-berry can never coexist across a turn
boundary. The sketch's two-turn shape does not occur; **the correct
minimal receipt is one turn**: the status-inflicting move both applies and
(if the target holds the matching berry) cures the status within its own
moveend, before the target's own action that same round. This also means
the target is never actually paralyzed for its own turn when it holds the
berry — the 25%-full-paralysis RNG branch (`Cmd_multiturneffects` /
`GetBattlerTurnOrder`'s per-action check, not part of this family) never
triggers, whereas the no-berry control *does* trigger it on the target's own
turn. This is an expected, source-grounded divergence between the two
arms' RNG traces after the shared prefix (see §5).

Re-verified independently: `grep -rn "ITEMEFFECT_MOVE_END"
reference/pokeemerald/{src,include,data}` → 3 hits total (definition, arm,
one call site); no other `Cmd_*` opcode or script command reaches
`ItemBattleEffects(ITEMEFFECT_MOVE_END, ...)`.

## 3. Per-arm conditions (`battle_util.c:3625-3767`)

All nine arms switch on `battlerHoldEffect`, computed per-battler at the top
of the loop (`:3627-3636`, with the standard Enigma Berry override at
`:3629-3633`). Each arm sets local `effect` (nonzero) only if it actually
changes state, so a berry with nothing to cure does nothing that moveend
pass.

| Arm | Lines | Condition | Battle-script target |
| --- | --- | --- | --- |
| `HOLD_EFFECT_CURE_PAR` | `3641-3649` | `status1 & STATUS1_PARALYSIS` set | `BattleScript_BerryCureParRet` |
| `HOLD_EFFECT_CURE_PSN` | `3650-3658` | `status1 & STATUS1_PSN_ANY` set (regular or toxic) | `BattleScript_BerryCurePsnRet` |
| `HOLD_EFFECT_CURE_BRN` | `3659-3667` | `status1 & STATUS1_BURN` set | `BattleScript_BerryCureBrnRet` |
| `HOLD_EFFECT_CURE_FRZ` | `3668-3676` | `status1 & STATUS1_FREEZE` set | `BattleScript_BerryCureFrzRet` |
| `HOLD_EFFECT_CURE_SLP` | `3677-3686` | `status1 & STATUS1_SLEEP` set (also clears `STATUS2_NIGHTMARE`) | `BattleScript_BerryCureSlpRet` |
| `HOLD_EFFECT_CURE_CONFUSION` | `3687-3695` | `status2 & STATUS2_CONFUSION` set | `BattleScript_BerryCureConfusionRet` |
| `HOLD_EFFECT_CURE_ATTRACT` | `3696-3706` | `status2 & STATUS2_INFATUATION` set | `BattleScript_BerryCureChosenStatusRet` |
| `HOLD_EFFECT_CURE_STATUS` | `3707-3738` | `status1 & STATUS1_ANY \|\| status2 & STATUS2_CONFUSION` (cures whichever is set, in poison→sleep→paralysis→burn→freeze→confusion priority for the message string, but zeroes `status1` and `STATUS2_CONFUSION` unconditionally) | `BattleScript_BerryCureChosenStatusRet` |
| `HOLD_EFFECT_RESTORE_STATS` | `3739-3756` | any `statStages[i] < DEFAULT_STAT_STAGE` (6) for `i` in `NUM_BATTLE_STATS`; resets every lowered stage to neutral in one pass, `return`s immediately (does not fall through to the shared item-consumed tail below) | `BattleScript_WhiteHerbRet` |

Every arm that pushes a battle script consumes the item there, not in
`battle_util.c`: `reference/pokeemerald/data/battle_scripts_1.s:4262-4351`
shows each `*Ret` script ending in `removeitem BS_SCRIPTING` (e.g.
`BattleScript_BerryCureParRet` at `:4266-4272`,
`BattleScript_WhiteHerbRet` at `:4349-4353`) — the held item is set to
`ITEM_NONE` as part of the same moveend sequence, immediately after the cure
message. The eight `status1`/`status2` arms additionally fall through to the
shared tail at `battle_util.c:3757-3765`, which emits a
`REQUEST_STATUS_BATTLE` controller command to sync the visible status icon;
`HOLD_EFFECT_RESTORE_STATS` skips that tail (it `return`s directly after
pushing `BattleScript_WhiteHerbRet`) since stat stages have no status-icon
equivalent.

## 4. Reachability in ordinary Factory Level-50 singles

The Battle Factory is singles-only, so "ordinary Level-50 singles" reduces
to "does a real Level-50 catalog set hold the matching item." Verified
against `docs/gate6-coverage-manifest.json#sections.corpus.level50Sets`
(850 sets) cross-joined with `src/data/gen/battle-frontier-held-items.json`
(the `BATTLE_FRONTIER_ITEM_*` → `holdEffect` table) — every one of the nine
arms has real carriers:

| Hold effect | Item | Carrier count (Level-50 sets) |
| --- | --- | --- |
| `HOLD_EFFECT_CURE_PAR` | Cheri Berry | 21 |
| `HOLD_EFFECT_CURE_PSN` | Pecha Berry | 7 |
| `HOLD_EFFECT_CURE_BRN` | Rawst Berry | 8 |
| `HOLD_EFFECT_CURE_FRZ` | Aspear Berry | 1 |
| `HOLD_EFFECT_CURE_SLP` | Chesto Berry | 43 |
| `HOLD_EFFECT_CURE_CONFUSION` | Persim Berry | 31 |
| `HOLD_EFFECT_CURE_ATTRACT` | Mental Herb | 4 |
| `HOLD_EFFECT_CURE_STATUS` | Lum Berry | 75 |
| `HOLD_EFFECT_RESTORE_STATS` | White Herb | 23 |

All nine arms are reachable; none is Factory-dead.

**Worklist carrier-claim correction:** the worklist's Rank-1 sketch cites
"defender `SPECIES_ZUBAT` (Level-50 set 25, held item
`BATTLE_FRONTIER_ITEM_CHERI_BERRY`)" and "attacker `SPECIES_SLUGMA`
(Level-50 set 30, `MOVE_BODY_SLAM`)". Re-verified directly against
`docs/gate6-coverage-manifest.json`:

- Set 25 is real: `{"species": "SPECIES_ZUBAT", "item":
  "BATTLE_FRONTIER_ITEM_CHERI_BERRY", "moves": ["MOVE_POISON_FANG",
  "MOVE_WHIRLWIND", "MOVE_CONFUSE_RAY", "MOVE_AERIAL_ACE"]}` — carrier claim
  confirmed. But Zubat set 25 does **not** carry a status move at all
  (Poison Fang/Aerial Ace are damaging, Whirlwind forces a switch, Confuse
  Ray inflicts confusion not paralysis), so it cannot be the *attacker*
  used to stage paralysis; the worklist doesn't claim that role for it
  (Zubat is its defender/holder), so no contradiction there — but per §2,
  Zubat cannot be staged with paralysis on "turn 1" and cured on "turn 2"
  either way, since the cure fires the same moveend as whatever move
  inflicted the status.
- Set 30 is `SPECIES_SLUGMA` but its actual moveset is **not**
  `MOVE_BODY_SLAM`-only 30%-paralysis-chance as implied — Body Slam is a
  legal member, but relying on its 30% secondary-effect chance is exactly
  the "RNG-timing hazard" the worklist itself flags. This receipt avoids
  that hazard entirely by using a **100%-accuracy, `EFFECT_PARALYZE`
  primary-status move** instead (`MOVE_THUNDER_WAVE`, accuracy 100,
  `reference/pokeemerald/src/data/battle_moves.h:1121-1126`), so paralysis
  application is deterministic without pinning a Random() roll.

This receipt therefore does **not** reuse Slugma/Body Slam as the stager
(there is no stager — see §2) and uses a different, verified attacker/target
pair chosen for a guaranteed-accuracy status move; see §5.

## 5. Representative receipt — Cheri Berry cures Thunder Wave's own paralysis

**Selected pair** (both single-ability species, per `AGENTS.md`'s "keep AI
draws stable" guidance):

- Attacker: `SPECIES_PICHU` (id 172), ability `ABILITY_STATIC` only
  (`species-stats.json`: `["ABILITY_STATIC", "ABILITY_NONE"]`), base speed
  60. Move: `MOVE_THUNDER_WAVE` (id 86, `EFFECT_PARALYZE`, accuracy 100,
  `battle_moves.h:1121-1126`) in all four slots.
- Defender: `SPECIES_ZUBAT` (id 41), ability `ABILITY_INNER_FOCUS` only
  (`species-stats.json`: `["ABILITY_INNER_FOCUS", "ABILITY_NONE"]`), base
  speed 55 — real Level-50 Cheri Berry carrier (set 25, confirmed §4).
  Move: `MOVE_TACKLE` (id 33) in all four slots — inert w.r.t. this
  family, used only so the Factory AI has one legal, non-status choice on
  Zubat's own turn.
- Held item under test: `ITEM_CHERI_BERRY` (id 133,
  `holdEffect: HOLD_EFFECT_CURE_PAR`, `battle-frontier-held-items.json`
  `itemTableId 12`).

Pichu's higher base speed (60 vs 55) makes it act first without needing an
EV-driven speed gap, but the fixtures still max Pichu's speed EVs and zero
Zubat's to remove any tie risk (`AGENTS.md`: "Strictly ordered speeds —
genuine speed ties draw hidden RNG").

**One turn is sufficient** (per §2 — no two-turn stager exists for this
family): Pichu's Thunder Wave resolves, paralyzes Zubat mid-script, then
`Cmd_moveend` reaches `MOVEEND_ITEM_EFFECTS_ALL` and Cheri Berry cures the
paralysis and is consumed — all before Zubat's own action that same round.

**Two fixtures, identical except Zubat's `item` field:**

- `tools/battle-lab/mechanic-item-move-end-paralysis-cheri-off.json` —
  Zubat holds `item: 133` (Cheri Berry).
- `tools/battle-lab/mechanic-item-move-end-paralysis-control-off.json` —
  Zubat holds `item: 0` (`ITEM_NONE`).

Verified via `tools/probe/probe-item-move-end-off.py` (dense per-frame
Battle Scene OFF capture, modeled on `tools/probe/probe-gate6-r7-r8-off.py`)
run twice per fixture — receipts are committed under
`tools/probe/receipts/item-move-end-paralysis-{cheri,control}-off.json`
and reproduce byte-identically frame-for-frame both times.

**Expected/observed shape** (exact numbers in the run's final report and
the committed receipts):

- Holder run: Zubat `status1` transitions `0` → `STATUS1_PARALYSIS` (0x40)
  → `0` within Pichu's single moveend pass; Zubat `item` transitions `133`
  → `0` in the same window (the `removeitem` in
  `BattleScript_BerryCureParRet`). Zubat's HP is unchanged throughout
  (Thunder Wave deals no damage); Pichu's Thunder Wave PP decrements by 1;
  Zubat's Tackle PP decrements by 1 once Zubat takes its (unparalyzed)
  turn.
- Control run: Zubat `status1` transitions `0` → `STATUS1_PARALYSIS` and
  **stays** `STATUS1_PARALYSIS` through the end of the round; `item` stays
  `0` throughout. HP/PP invariants otherwise match the holder run except
  Zubat's own action, which is now subject to the (Random()-consuming)
  full-paralysis check per §2 — an expected, source-grounded RNG
  divergence, not a defect. The shared RNG prefix — every `Random()` call
  up through and including Thunder Wave's accuracy roll and (in the holder
  run) the item-cure processing itself, which the source shows makes no
  additional `Random()` calls — is identical between the two runs; they
  diverge only at Zubat's own action, where the control's full-paralysis
  roll has no counterpart in the holder run. This is the "identical action
  RNG, paralysis persisting" control the brief asked for, scoped correctly
  per the source (not a same-length RNG trace claim across the whole
  round, which the mechanics themselves rule out).

## 6. Not covered by this receipt (optional / out of scope)

- `HOLD_EFFECT_RESTORE_STATS` (White Herb) — same pattern, different arm;
  optional second receipt, only staged if time allows in this step (see
  the run's final report for whether it landed).
- The other seven cure arms (Pecha/Rawst/Aspear/Chesto/Persim/Mental
  Herb/Lum) — same dispatch site and timing fact apply structurally; not
  independently re-verified by a receipt in this step. A Tier-1 batch
  test against this family (main-lane consume step) can reuse this
  document's per-arm table without re-deriving it.
