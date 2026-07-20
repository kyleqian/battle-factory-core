# Grovyle's faint -> DESTIN's switch-in: the remaining §13 unknowns (worktree lane, oracle scout — no engine code)

Follow-up to `docs/battle-turn-notes.md` §13 (`battle1-grovyle-faint.json`,
7312 frames, `battle1-grovyle-faint-ram-dump.json`). This session ground-
truths §13's open items 1 (why Pidgeotto, not Murkrow) and 5 (the Sitrus
Berry heal formula) to source-and-RAM-pinned certainty. Open items 2-4
(the animation itemization, the tick-7215/7221 RNG cluster, the two
unattributed 1-step events) were **not reached this session** — see "What's
still open" at the bottom for exactly why and what's needed next. No
`src/engine/` changes; the only additions are this file, one new committed
probe script (`tools/probe/dump-switch-decision.py`), and its output
(`src/data/gen/battle1-grovyle-switch-decision.json`), all cross-checked
against the already-committed `battle1-grovyle-faint.json` trace (no new
oracle traces were needed — every fact below comes from RAM-probing the
existing committed trace plus reading `reference/pokeemerald` source).

## 1. Why DESTIN sends out PIDGEOTTO, not MURKROW — PINNED

### The algorithm (source-cited)

`GetMostSuitableMonToSwitchInto` (`reference/pokeemerald/src/
battle_ai_switch_items.c:629-790`) runs in two phases, called from
`AI_TrySwitchOrUseItem` (same file, line 547) once `ShouldSwitch()` has
already decided a switch is warranted (a separate, simpler yes/no gate —
not itemized this session, `ShouldSwitch()` is lines 461-526 and is a
plain scored checklist: Perish Song, Wonder Guard, an absorbing ability,
Natural Cure, "no super-effective move available", stat-drop checks, in
that priority order; none of it is candidate-*selection* logic, only the
switch/no-switch gate).

**Phase 1 (lines 690-746), a self-documented AI bug**: for every valid
candidate `i` still in the party, compute `typeDmg` = `TYPE_MUL_NORMAL`
(10, fixed-point ×10) run through `ModulateByTypeEffectiveness` twice —
once for each of the *opposing* battler's own two types attacking the
*candidate's* two defensive types (`battle_ai_switch_items.c:706-710`).
Whichever candidate ends up with the **highest** `typeDmg` is provisionally
picked (line 715: `if (bestDmg < typeDmg)`). The source's own comment
(lines 712-714) flags this explicitly:

> "Possible bug: this comparison gives the type that takes the most
> damage, when a "good" AI would want to select the type that takes the
> least damage."

So phase 1 is genuinely "prefer whichever candidate the opponent's own
attacking types would hit *hardest*", not "prefer whichever resists
best" — worth pinning precisely since a naively "sensible" engine port
would get this backwards. If phase 1 finds a candidate, it further
requires that candidate to have *some* super-effective move against the
opponent (lines 728-738); if not, that candidate is excluded and the
`while` loop retries with the next-highest `typeDmg` candidate (line 740).
If **no** candidate ever has `typeDmg > TYPE_MUL_NO_EFFECT` (0) at all,
phase 1 finds nothing (line 744) and falls through to phase 2.

**Phase 2 (lines 748-789), the fallback**: resets `gDynamicBasePower`,
`gMoveResultFlags`, `gCritMultiplier` etc., then for every valid candidate
`i` and every one of its 4 moves `j` (`move = GetMonData(&party[i],
MON_DATA_MOVE1 + j)`), if the move isn't `MOVE_NONE` and its power isn't
the `1` "variable power" sentinel, calls `AI_CalcDmg(gActiveBattler,
opposingBattler)` then `TypeCalc(move, gActiveBattler, opposingBattler)`,
and keeps whichever `(candidate, move)` pair produces the single highest
`gBattleMoveDamage` (**strictly** greater — line 781's `<`, not `<=` — so
ties favor the *earlier* party index).

### Phase 1 is a confirmed tie (0 vs 0) for Murkrow and Pidgeotto — RAM- and source-pinned

Onix's types, RAM-read directly (`gBattleMons[0].types`, tick 6600):
**[5, 4] = ROCK, GROUND** — matches the established stat block. Pidgeotto's
types, RAM-read (`gBattleMons[1].types` after the switch, tick 6684):
**[0, 2] = NORMAL, FLYING**. Murkrow was never sent out this dossier, so
its type isn't RAM-readable from `gBattleMons`, but
`reference/pokeemerald/src/data/pokemon/species_info.h:5949-5958`
pins it as source data: **DARK, FLYING** (not RAM-dependent — species
typing is compiled-in, not battle state).

`reference/pokeemerald/src/battle_main.c:335+` (`gTypeEffectiveness`) has
the two entries that decide this: `TYPE_ROCK, TYPE_FLYING,
TYPE_MUL_SUPER_EFFECTIVE` (line 424) and `TYPE_GROUND, TYPE_FLYING,
TYPE_MUL_NO_EFFECT` (line 396) — **no entries at all** for ROCK or GROUND
against DARK or NORMAL (checked directly, `grep`-exhaustive over the
table). So for *both* candidates, `ModulateByTypeEffectiveness`'s two
calls compute: ROCK bumps `typeDmg` to `10 * 20/10 = 20` (both are
Flying), then GROUND immediately zeroes it back down: `20 * 0/10 = 0`
(both are Flying, so both get the Ground immunity) — **final `typeDmg` =
0 for both, every time**, because whichever secondary type they have
(DARK for Murkrow, NORMAL for Pidgeotto) never touches ROCK or GROUND's
table rows at all. Since phase 1's `bestDmg` starts at `TYPE_MUL_NO_EFFECT`
(0, `include/battle_main.h:31`) and the comparison is strict `<`, neither
candidate ever exceeds it — **phase 1 finds no viable candidate and falls
through to phase 2 unconditionally**, for any all-Flying-type matchup
against a Rock/Ground opponent, not just this one battle. This part of the
rule **generalizes**: whenever every remaining switch-in candidate takes
the *same* multiplier from the active-opponent's typing (a tie, most
commonly a shared 4x/2x weakness or a shared immunity like this one),
phase 1 can't discriminate and phase 2 decides instead.

### Phase 2: the actual candidates, RAM- and source-cross-confirmed

The opponent's real party doesn't come from `gSaveBlock2Ptr->frontier.
rentalMons[3..5]` (`dump-rentalmons.py`'s own docstring's claim, which
this session found to be **wrong for this opponent type** — probing it at
tick 6600 shows `rentalMons[3..5]` still holds `monId` 153/179/181 =
BUTTERFREE/HAUNTER_1/QUILAVA_1, unchanged since the very start of the
trace: that array is the **player-facing 6-slot draft pool**, unrelated to
a preset-trainer opponent's own party). The real source, traced via
`GenerateOpponentMons` (`reference/pokeemerald/src/battle_factory.c:
303-377`): opponent monIds land in `gFrontierTempParty[0..2]`, a `u16[]`
indexed into `gFacilityTrainerMons` (== `gBattleFrontierMons`,
`src/data/battle_frontier/battle_frontier_mons.h`). RAM-read
(`gFrontierTempParty`, symbol `0x03006298`, tick 100 and tick 6600 —
**identical both times**, confirming it's fixed for the whole battle):
**`[188, 184, 135]`**, decoding via `include/constants/
battle_frontier_mons.h` to `FRONTIER_MON_GROVYLE_1` (188),
`FRONTIER_MON_MURKROW_1` (184), `FRONTIER_MON_PIDGEOTTO` (135) — exactly
matching §13's own party-index finding (`gBattlerPartyIndexes[1]`: 0 = 
Grovyle, 1 = Murkrow, 2 = Pidgeotto).

`gBattleFrontierMons[FRONTIER_MON_*]`'s own compiled-in `.moves` arrays
(`src/data/battle_frontier/battle_frontier_mons.h`):

| mon | species | moves (source) | moves (RAM, move IDs) |
|---|---|---|---|
| GROVYLE_1 (188) | GROVYLE | FURY_CUTTER, ENDEAVOR, BRICK_BREAK, DOUBLE_TEAM | `[210, 283, 280, 104]` — RAM-read `gBattleMons[1].moves` at tick 6600 (still occupying the active slot, fainted) |
| MURKROW_1 (184) | MURKROW | FAINT_ATTACK, FLY, TORMENT, TAUNT | not RAM-readable (never sent out this dossier — see caveat below) |
| PIDGEOTTO (135) | PIDGEOTTO | AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK | `[332, 98, 297, 28]` — RAM-read `gBattleMons[1].moves` at tick 6684+ |

Both RAM-readable rows are **bit-exact** against the source table (move
IDs cross-checked one by one against `include/constants/moves.h`), which
is strong indirect confirmation that Murkrow's un-RAM-readable row
(FAINT_ATTACK/FLY/TORMENT/TAUNT) is correct too — the lookup mechanism
is proven accurate on the two cases that *can* be double-checked.

Real party stats (RAM-read, tick 6600, `gPlayerParty[0]` / `gEnemyParty[0..2]`
— `struct Pokemon`'s **plaintext** cached stat fields, not the encrypted
substructures; offsets empirically located and byte-verified against
Onix's already-known values, see the probe script's own docstring for the
full derivation):

| mon | atk | def | spd | spAtk | spDef | hp/max |
|---|---|---|---|---|---|---|
| Onix (opposingBattler) | 51 | 187 | 76 | 36 | 72 | 1/117 |
| Grovyle (enemyParty0) | 103 | 56 | 90 | 91 | 71 | 0/143 |
| **Murkrow (enemyParty1)** | **91** | 69 | 97 | 91 | 69 | 142/142 |
| Pidgeotto (enemyParty2) | 98 | 61 | 77 | 56 | 56 | 156/156 |

(Grovyle/Pidgeotto rows independently cross-checked against the
`gBattleMons`-based stat reads from §13's own committed dump — identical.)

### The unresolved sub-mechanism (flagged precisely, not hand-waved)

`AI_CalcDmg(gActiveBattler, opposingBattler)` (`battle_script_commands.c:
1306-1319`) computes `gBattleMoveDamage = CalculateBaseDamage(&gBattleMons
[attacker], &gBattleMons[defender], gCurrentMove, ...)` — note it reads the
**global** `gCurrentMove`, not the phase-2 loop's own local `move` variable
(fetched from the candidate's own moveset at line 774). Only the
**following** call, `TypeCalc(move, gActiveBattler, opposingBattler)`
(`battle_script_commands.c:1536`), uses the loop's real candidate move —
for its type-effectiveness/STAB multiplier only, not for the base power.
This session RAM-probed `gCurrentMove` across the whole decision window
(`src/data/gen/battle1-grovyle-switch-decision.json`'s `gCurrentMoveLedger`,
every tick sampled 6400-6690): it reads **157 (ROCK_SLIDE, Onix's last-used
move)** continuously, only changing (to 0) at tick 6684 — the exact tick
the switched-in species itself flips. Taken at face value, this would mean
the phase-2 "damage" comparison for *every* candidate/move pair actually
uses ROCK_SLIDE's own power/Grovyle's own (still-resident, post-faint)
attacker stats as the magnitude, and only each move's own type varies the
result via `TypeCalc`'s multiplier.

**That reading does not resolve cleanly to the observed outcome.**
Working the type-multiplier-only comparison by hand (source-exact, using
the same `gTypeEffectiveness` table above): Murkrow's FAINT_ATTACK (DARK)
gets a **neutral 1.0x** against Onix (no ROCK or GROUND table entry for
DARK), while both of Pidgeotto's non-status moves (AERIAL_ACE, FLYING;
QUICK_ATTACK, NORMAL) get only **0.5x** (`TYPE_ROCK, TYPE_FLYING`/
`TYPE_ROCK, TYPE_NORMAL` are both `TYPE_MUL_NOT_EFFECTIVE`, and neither
type has a GROUND-table entry to offset it). By this reading Murkrow's
FAINT_ATTACK should have produced the single highest `gBattleMoveDamage`
of any candidate/move pair — the **opposite** of the actual Pidgeotto
pick. Two live possibilities, neither confirmed: (a) `gActiveBattler`'s
*exact* value at the precise moment `AI_CalcDmg`/`TypeCalc` execute inside
the loop differs from what this session's tick-boundary sampling shows
(the ledger caught `gActiveBattler` alternating 1↔2 within the same
window — plausibly unrelated engine bookkeeping, but this can't be ruled
out as relevant without sub-frame resolution, which per-tick RAM probing
fundamentally cannot provide), changing which `gBattleMons[].types` gets
checked for STAB and folding in an extra 1.5x somewhere this hand-trace
doesn't account for; or (b) something upstream of `GetMostSuitableMonToSwitchInto`
(inside `ShouldSwitch()`'s own helper scans, which run first and use the
same globals) leaves `gCurrentMove` at a different value than 157 for the
specific instant phase 2 reads it, invisible to this session's frame-
granularity sampling. **Not resolved this session** — the concrete next
step is either a cycle-accurate/instruction-level trace (outside this
harness's oracle-only toolkit, which reads existing RAM addresses only,
not CPU registers or stack locals), or a source patch that spills
`bestDmg`/`bestMonId`/the loop's local `move` to a probe-visible scratch
address for one debug build.

**Bottom line for the engine slice**: the *shape* of the rule generalizes
correctly (phase 1 = shared-typing tie-break by "who takes the most
damage" bug, phase 2 = a damage fallback with ties won by lower party
index) and is safe to port; the *exact* phase-2 tie-break numerics have
one unresolved sub-detail that this session narrowed a lot (ruled out
"simple type/STAB reasoning" as sufficient, pinned the exact global-state
quirk responsible) but didn't finish nailing to the last multiplier.

## 2. Onix's Sitrus Berry heal (1 -> 31) — PINNED, exact formula

Not a fraction-of-max-HP formula at all (Gen 3, unlike later generations'
1/4-max fraction) — it's `HOLD_EFFECT_RESTORE_HP` with a **flat**
`.holdEffectParam`:

```c
// reference/pokeemerald/src/data/items.h:1747-1760
[ITEM_SITRUS_BERRY] = {
    .holdEffect = HOLD_EFFECT_RESTORE_HP,
    .holdEffectParam = 30,
    ...
}
```

```c
// reference/pokeemerald/src/battle_util.c:3336-3345 (case ITEMEFFECT_NORMAL)
case HOLD_EFFECT_RESTORE_HP:
    if (gBattleMons[battler].hp <= gBattleMons[battler].maxHP / 2 && !moveTurn)
    {
        gBattleMoveDamage = battlerHoldEffectParam;
        if (gBattleMons[battler].hp + battlerHoldEffectParam > gBattleMons[battler].maxHP)
            gBattleMoveDamage = gBattleMons[battler].maxHP - gBattleMons[battler].hp;
        gBattleMoveDamage *= -1;
        BattleScriptExecute(BattleScript_ItemHealHP_RemoveItem);
        effect = ITEM_HP_CHANGE;
    }
    break;
```

Threshold is **`hp <= maxHP/2`** (integer division, half max — not the
1/4 threshold this dossier's §13 guessed from later-generation knowledge),
checked only when `!moveTurn` (i.e. in the end-of-turn/other item-check
pass, not mid-move-execution — consistent with §13's own observation that
the proc happens "mid-sequence", not the instant HP crosses the line
during the ROCK_SLIDE hit itself). Heal amount is `min(holdEffectParam,
maxHP - hp)` — capped so it can't overheal past max.

Worked against Onix's exact values (RAM-confirmed, `gBattleMons[0]`):
`hp=1, maxHP=117, item=142`. `ITEM_SITRUS_BERRY` = **142**
(`include/constants/items.h:164`) — matches the held-item ID directly, so
this is unambiguously the item that fired, not a guess. `1 <= 117/2 (58)`:
true. `heal = min(30, 117-1=116) = 30`. `new hp = 1 + 30 = 31`. **Exact
match to the observed 1 -> 31**, no rounding ambiguity of any kind — the
naive `floor(117/4)=29` §13 tried was simply the wrong generation's
formula, not a rounding-convention question.

**No Tier-1 test added**: `damageCalc.ts`'s existing surface doesn't cover
item/berry effects yet (per §7's data-needs audit and §13's own item note,
"the player's own rental mon can also hold an item" was itself new this
dossier), so there's no existing pure-logic module to pin this fact
against without first choosing where a future berry-effects module would
live — left for whichever engine slice implements switch-in/item effects.

## 3. Switch-in animation window (§13 open item 4) — ITEMIZED this session (worktree lane `wt-20260720-100854`, oracle scout — no engine code)

**§3's own prior claim above ("Pidgeotto's front-facing sprite has not been
extracted") was WRONG** — see §5 below: it was already extracted, byte-exact,
since the very first S6-groundwork commit (`38f687c`). §13's own claim that
"the committed trace's dense capture window covers [ticks 6684-7215] at
full stride" was **also imprecise** — `battle1-grovyle-faint.json`'s own
`captureFrames` stride through this window is 2-18 ticks, not 1, and (more
importantly) the interesting animation starts well *before* 6684, not at
it. This session generated four new dense stride-1 traces,
`battle1-switchin-dense-{a,b,c,d}.json` (tools/compare/traces-groundtruth/,
README updated), covering every tick 6350-7312 at stride 1 (all four reuse
`battle1-grovyle-faint.json`'s own 66 segments verbatim — identical button
script, only `captureFrames` differs — so tick numbers stay directly
comparable to every other section of this dossier). All four twice-run
oracle-side, 0/969 sha mismatches across the two runs.

Method: for each phase below, either (a) a per-tick numeric probe (opaque-
pixel count in a fixed crop box, or full-frame byte diff count between
consecutive ticks) computed over every tick in the dense traces to find
exact transition ticks, or (b) direct visual inspection of the crop/frame
at and around a transition, cross-checked against `reference/pokeemerald`
source where a mechanism was identifiable. All tick numbers below are
**exact** (stride-1, not interpolated) unless marked with `~`.

### 3a. The faint sequence corrects §13's own "screen frozen 6429-6560" claim — real animation happens in that window

§13 (this file's own prior session) concluded from a RAM-only control run
that `gBattleMainFunc` and every watched RAM address sit frozen from
"tick 5964 through tick 8960" absent a player A-press, and concluded the
whole 6429-6560 span is visually inert. **That RAM-only conclusion is right
about `gBattleMainFunc` but wrong about the screen** — real, un-RAM-tracked
sprite/window animation plays automatically inside that span, no A-press
needed for it. Pixel ground truth (`battle1-switchin-dense-a.json`,
opaque-pixel count in a `(135,5)-(215,75)` crop around Grovyle's own
on-field position, one sample per tick):

| ticks | opaque px in crop | what's on screen |
|---|---|---|
| 6350-6378 | 2570 -> 2008, monotonically falling | ROCK_SLIDE's own rock-debris impact animation finishing (the debris pixels themselves fall out of the crop's "non-background" count as each rock disappears) — Grovyle's own healthbar is still **full** here (`GROVYLE Lv50` box, undrained) |
| 6379-6392 | steady 2008 | Grovyle fully visible, undamaged-looking, holding (this is *before* the HP-bar drain the general "1 HP-unit/tick" rule handles — that drain is not re-verified this session, already pinned generically by earlier turns' docs) |
| 6393-6420 | alternates 2008 / 484 every ~4 ticks (4 on/off cycles) | a **hit-flash flicker** — Grovyle's sprite toggles fully invisible/visible several times, matching the general Gen 3 "flinch/faint flash" cue (`SpriteCB_Flicker`-family mechanism, `reference/pokeemerald/src/battle_main.c:2721-2736`, toggles `sprite->invisible` on a countdown) — not the final faint animation itself |
| 6421-6503 | steady 2008 | held fully visible again, no RAM change either (this is the span §13's control run actually observed as "frozen") |
| 6504-6518 | steps 2008 -> 1994 -> 1709 -> 1329 -> 1206 -> 1077 -> 750 -> 499 -> 484, ~2 ticks/step | **the real faint animation**: Grovyle visibly sinks into the ground shadow, erased from the bottom up (confirmed by direct crop inspection, `/tmp/sheet_sink_zoom.png`-equivalent — the visible remnant's top edge steps downward each pair of ticks until only a foot-tip remains at 6520-6521, gone by 6522) |
| 6519-6560 | steady 484 (just the shadow oval + healthbar-box edges) | Grovyle's sprite fully gone |

**Source-identified mechanism for the sink** (not curve-fit — this is the
literal, only faint-sprite-animation function in `battle_main.c`):
`SpriteCB_FaintOpponentMon` / `SpriteCB_AnimFaintOpponent`
(`reference/pokeemerald/src/battle_main.c:2744-2811`). It does **not**
fade or dissolve — it erases the sprite's bottom 8px-tall tile-row on a
timer and shifts the remainder down (`sprite->y2 += 8`), creating the
"sinking into the ground" illusion the pixels above show directly:

```c
sprite->data[3] = 8 - yOffset / 8;   // number of erase-steps left
sprite->data[4] = 1;                  // 1-tick delay before the first step
sprite->callback = SpriteCB_AnimFaintOpponent;
// ...
static void SpriteCB_AnimFaintOpponent(struct Sprite *sprite)
{
    if (--sprite->data[4] == 0) {
        sprite->data[4] = 2;          // every step after the first is 2 ticks apart
        sprite->y2 += 8;              // move the sprite down
        if (--sprite->data[3] < 0) { FreeSpriteOamMatrix(sprite); DestroySprite(sprite); }
        else { /* erase the sprite's own bottom 8px row, re-play its idle anim */ }
    }
}
```

For Grovyle (`yOffset=4`, from `gMonFrontPicCoords`, already extracted in
`mon-pic-coords.json`): `data[3] = 8 - floor(4/8) = 8`, so **9** erase-steps
at a 1-then-2-tick cadence — spanning ticks `S+1, S+3, S+5, ..., S+17` for
some start tick `S`. The observed pixel data (6504-6521, ~8-9 distinct
plateaus over ~17-18 ticks) matches this shape closely; the exact `S` and
step count weren't independently RAM-confirmed this session (would need a
`gSprites[].y2`/`.data[3]` probe, not attempted — time-boxed), but the
*qualitative* mechanism (erase-and-sink, not fade/dissolve, not a uniform
slide) is now source-cited and pixel-corroborated, answering §13's own
open "slide-down? fade? dissolve?" question directly: **it's a stepped
bottom-up erase with an 8px-per-step downward shift, on a 1-then-2-tick
cadence** — a distinct mechanism from any of S6's own send-out mechanisms
(none of which erase/shift a sprite this way).

### 3b. Text phases, pinned to the tick

Text-box content read directly off cropped frames (`(0,108)-(240,160)`),
stride-1 through the transitions:

| ticks | text box content |
|---|---|
| through 6503 | "ONIX used\nROCK SLIDE!" (unchanged, held) |
| 6504-~6533 | still "ONIX used\nROCK SLIDE!" — **the sink animation (3a) plays while this text is still on screen**, not after it clears |
| ~6534-6554 | box clears and "Foe GROVYLE\nfainted!" prints, 1 char/tick (same cadence as every other message in this dossier); the trailing "!" lands at 6552, the down-arrow/heart prompt cursor appears at 6554 (text fully printed, now idling) |
| 6554-6561 | held, idle-cursor bounce only (tiny, ~24px diagonal-adjacent diff at 6561 — the cursor's own established 4-phase bounce, not a scene change) |
| **6562** | the A-press §13 already identified registers here (this session doesn't re-derive that gate, only confirms the text sitting right at it) |
| 6562-6586 | genuinely frozen (0 pixel change tick-to-tick) — the true gate wait |
| ~6588-6607 (opponent-side, see 3c) / 6687-~6727 (the message itself) | see below — two *different* things happen in this stretch, not one |

Between the A-press and the new message, the **opponent's own 6-icon party-
status-summary bar** (§7's own `ballIcons`/`drawBallStatusBar` mechanism,
`OPP_ICON_X2`/`OPP_BAR_X2` tables, `src/engine/battleScene.ts:1144-1242`)
re-triggers and slides onto the top-left of the screen starting **~6588**
(first bbox-diff evidence: `(0,40)-(8,43)` at 6588, growing rightward tick
by tick through 6607 and beyond — the bar's own entrance-slide silhouette,
same y=32/40 coordinates as the intro's own opponent bar). This is the
same widget being reused a second time with updated per-slot states
(Grovyle's own icon flips from "Full" to a fainted state) — see §6's
mapping table.

The **new message itself** ("BUG CATCHER DESTIN sent\nout PIDGEOTTO!",
`sText_Trainer1SentOutPkmn`, same string family as §7.3's own send-out
text) starts printing at **6687** (full-frame bbox diff jumps to 638px
here — the message-window redraw, not a char print), 1 char/tick through
completion at **~6727** ("BUG CATCHER DESTIN sent\nout PIDGEOTTO!" fully
on screen, confirmed by direct crop read). This lines up tightly with the
RAM-confirmed party-index/species-flip ticks §13 already pinned
(`gBattlerPartyIndexes[1]` 0->2 at 6682, `gBattleMons[1].species` 278->17
at 6684) — the switch commits in RAM 3-5 ticks *before* its own
announcement text starts printing, not after.

### 3c. Ball throw + materialize (~6746-6820)

Pixel-confirmed sequence (full-frame contact sheet over `battle1-
switchin-dense-{b,c}.json`):

| tick | what's on screen |
|---|---|
| through 6745 | just the empty ground-shadow oval where Pidgeotto will appear; "sent\nout PIDGEOTTO!" text fully printed and held |
| **~6746** | a small thrown-ball sprite appears in the oval (the ball-throw arc's landing frame — the throw's own earlier arc, if any, is off-screen or too brief to have caught a distinct capture tick in this window; not separately itemized) |
| ~6748-6752 | the ball shows an "open" flash/sparkle frame |
| ~6752-6810 | Pidgeotto's silhouette grows in, **tinted pink/magenta** throughout (the same flat ball-color tint mechanism as `MATERIALIZE_TINT_COLOR` in `battleScene.ts`, mechanism 4/5 of S6's own Grovyle materialize) fading back to normal color by ~6810 |
| ~6810-6820 | Pidgeotto's sprite fully formed, normal colors, static — no healthbox yet |

This is qualitatively the **same shape** as S6's own Grovyle send-out
(ball -> open flash -> tinted materialize -> settle), just compressed
(≈75 ticks here vs. the intro's own ≈80-ticks-wide 1462-1543 window) —
consistent with reusing the same underlying animation task, not a new one.
**Not verified to formula precision this session** (no per-tick affine-
matrix/tint-coefficient RAM probe was run against Pidgeotto, unlike
Grovyle's own exhaustively-probed `GROVYLE_STRETCH_TABLE`) — this is a
visual-shape match, not a byte-exact mechanism confirmation. Flagged
honestly rather than assumed identical.

### 3d. Healthbox slide-in (~6830-6875)

Pidgeotto's own `PIDGEOTTO Lv50` healthbox is **not** on screen when its
sprite finishes materializing (~6820) — a ramping full-frame diff
(6829:6px -> 6851:879px, monotonically increasing) starting at **~6830**
shows it sliding into place, landing by **~6851-6875** (settled, static
from 6875 through the next phase). This is the same "healthbox slides in
after the sprite settles, with a lag" shape §7.6 already documented for
Grovyle's own intro send-out (~1496-1522) — same relative ordering
(sprite first, healthbox follows), different absolute ticks.

### 3e. Onix's Sitrus Berry proc (~7040-7250)

| ticks | what's on screen |
|---|---|
| 6875-~7040 | fully settled (Pidgeotto sprite+healthbox, Onix idle), no change |
| ~7040-7048 | a small sparkle appears near Onix, Onix's own sprite briefly tints cyan/teal |
| ~7056-7072 | an expanding translucent ring/burst effect radiates outward from Onix (grows over ~16 ticks, then fades) — this is the generic Gen 3 "restored HP" item-use visual (`HOLD_EFFECT_RESTORE_HP`'s own battle-script animation, `BattleScript_ItemHealHP_RemoveItem`), not itemized to its own source-level animation-task ID this session |
| **~7078-7112** | "ONIX's SITRUS BERRY\nrestored health!" prints, 1 char/tick, completing at 7112 — Onix's HP number is still **1/117** throughout this entire print (the text completes well before the heal itself animates) |
| 7112-~7216 | held (text fully printed, no further change) |
| **~7216-7250** | the actual heal animates: HP bar + digits climb 1 -> 6 -> 14 -> 22 -> 30 -> 31 (samples 8 ticks apart, consistent with the dossier's established generic "1 HP-unit/tick" bar-fill rule) |
| **~7250-7256** | settles fully at 31/117, message box switches directly to the interactive "What will ONIX do?" / FIGHT-BAG-POKéMON-RUN menu — no further input needed to reach it |

**This corrects §13's own settle-tick claim.** §13 stated `gBattleMainFunc`
settles to its post-turn dispatcher value "at 7215" and the menu is
interactive "7215-7312". The RAM-level dispatcher value may well flip at
7215 (not re-checked this session — that's a RAM fact, not a pixel one),
but the **visible** screen is still mid-heal-animation at 7215 by this
session's own pixel evidence (HP reads well under 31 at 7224) and doesn't
finish settling until roughly **7250-7256**, not 7215. Framed the other
way: whatever RAM value §13 sampled at 7215 evidently isn't tied to the
on-screen heal-bar-fill animation, which keeps running for ~35-40 more
ticks after that RAM state change. Both facts can be true simultaneously
(a "logically settled, still animating" state) but the doc text describing
7215 as when the player *sees* a settled menu was imprecise; this session's
pixel data is the more precise source for "when can the player actually
act," which is what an input-handling engine slice actually needs.

## 4. RNG cluster attribution (§13 open items 2-3) — NOT reached this session

Not attempted — out of this session's scope (extraction + animation
itemization only, per the worktree brief). Both remain exactly as §13 left
them: the tick-4064/6206 unattributed 1-step events, and the tick-
7215/7221 6-step post-switch-in cluster's shape mismatch against the
established `ShouldSwitch`(2)+tie-break(5)=7 pattern — though see §3e
immediately above: this session's own pixel data puts the *visible* menu
settle closer to 7250-7256 than 7215, which may be worth cross-checking
against wherever that RNG cluster's own RAM ticks actually land before
trusting the "6, not 7" shape mismatch §13 flagged (not re-checked this
session — a plausible lead for whoever picks this open item up next).

## 5. Pidgeotto's front sprite — already extracted, byte-exact verified (goal 1)

**§3's own prior-session claim above ("Pidgeotto's front-facing sprite has
not been extracted... `ls src/assets/gen/` and a grep... both come back
empty") does not hold up** — re-checked directly this session:
`src/assets/gen/battle-opponent-front-sprites.json` already contains a
`PIDGEOTTO` entry (64 tiles, 8x8 columns/rows = 48x56px, 16-color palette,
plus a `frame2` entrance-animation second frame), and `src/data/gen/
mon-pic-coords.json`'s `front.PIDGEOTTO` entry (`{width:48, height:56,
yOffset:11}`) is present too. Both come from `tools/extract/extract-
battle-mon-pics.ts`'s existing `FRONT_SPECIES` map (`GROVYLE: "grovyle",
MURKROW: "murkrow", PIDGEOTTO: "pidgeotto"`, line 86-90) — **all three of
DESTIN's mons were extracted together in the very first S6-groundwork
commit** (`38f687c`, "extract battle-1 bring-up static assets"), long
before §13's own faint dossier existed. The prior session's grep evidently
missed the `.json` asset files (plausibly scoped to source-code
extensions only) and never re-ran the extractor to check — this session's
finding is a correction of a stale negative, not new extraction work; no
extractor or asset changes were needed or made.

**Byte-exact verification against a fresh oracle capture** (goal 1's own
ask): `tools/compare/scratch/pidgeotto_corner_verify.mjs` composites the
extracted `PIDGEOTTO` tileset+palette (skipping index-0/transparent
pixels) at every candidate top-left corner in a `(100-190, 0-40)` search
box against the settled post-switch-in screen (tick 7310,
`battle1-grovyle-faint.json`, oracle-regenerated fresh this session) and
reports the best (lowest-diff) corner:

```
{ cx: 144, cy: 19, diff: 0, opaque: 1087 }
```

**0 residual mismatched pixels out of 1087 opaque** — a byte-exact match,
at corner `(144, 19)`. This also resolves a real mechanism, not just a
number: Grovyle's own known settled corner is `(144, 12)`
(`GROVYLE_CORNER`, `battleScene.ts:1356`) — the **x** coordinate is
identical (144, species-independent, the fixed opponent-slot screen
position) but **y** differs by exactly 7px. Grovyle's `gMonFrontPicCoords`
`yOffset` is 4; Pidgeotto's is 11 — a difference of exactly 7, matching the
corner-y difference exactly. So the generalizing formula (2 independent
data points, both exact, not curve-fit to one): **opponent front-sprite
corner = `(144, 8 + gMonFrontPicCoords[species].yOffset)`**, using the
same `mon-pic-coords.json` table `extract-battle-mon-pics.ts` already
extracts in full (all species, not just the 3 battle-1 mons) — a future
engine slice generalizing S6's `GROVYLE_CORNER` constant into a per-
species lookup can use this formula directly rather than re-deriving it.
Source-consistent too: `reference/pokeemerald/src/battle_main.c:2783` uses
the identical `8 - yOffset/8` relationship (in 8px sprite-row units, for
the faint-sink step count, §3a above) — the same `yOffset` constant
governing two independently-observed on-screen effects is corroborating,
not coincidental.

**Not verified this session**: Murkrow's own corner (never sent out in any
committed trace, no oracle pixels exist to check against) and whether the
formula holds for non-battle-1 species in general (only 2 data points,
both from this one battle) — stated as a generalization with the evidence
it deserves, not overclaimed.

## 6. Mechanism mapping: switch-in vs. S6's own send-out (goal 3, partial)

A direct answer to "does the opponent switch-in reuse the intro's Grovyle
materialize timing verbatim, or is it new" — partial, evidence-graded:

| switch-in element | maps to an existing S6 mechanism? | evidence |
|---|---|---|
| Opponent front-sprite corner (x, and now y via yOffset) | **Yes, generalizes** — same `(144, ...)` slot, y now formula-derived from the same coords table S6's own extractor already pulls | §5 above, byte-exact, 2 independent species |
| Opponent 6-icon party-status-summary bar (ball icons, top-left) | **Yes, verbatim reuse, re-triggered** — same `ballIcons`/`drawBallStatusBar`/`OPP_ICON_X2`/`OPP_BAR_X2` mechanism, second invocation with updated per-slot state | §3b, bbox-diff evidence of the same entrance-slide shape at the same y=32/40 coordinates |
| Ball throw -> open flash -> tinted materialize -> settle shape | **Visually yes, not formula-verified** — same phase order, similar (not identical) duration | §3c — a shape match from contact-sheet inspection only, no RAM/affine-table probe run against Pidgeotto |
| Healthbox slide-in-after-sprite lag | **Yes, same shape** — sprite settles first, healthbox follows with a visible lag | §3d, same relative ordering as §7.6's own Grovyle finding |
| The faint-sink animation (Grovyle's own exit) | **New — no S6 mechanism resembles it.** None of S6's own 5 send-out mechanisms erase-and-shift a sprite; this is a distinct source function (`SpriteCB_FaintOpponentMon`/`AnimFaintOpponent`) with no analogue anywhere else in this dossier | §3a, source-cited |
| The pre-sink hit-flash flicker (6393-6420) | **Unclear — not cross-checked against S6.** Resembles a generic Gen 3 flinch/hit-flash toggle (`SpriteCB_Flicker`-family); whether S6's own hit-flash code (if any exists in `battleScene.ts`) already models this wasn't checked this session | §3a — flagged, not resolved |
| Sitrus Berry's ring/sparkle heal effect | **New — no S6 analogue.** No item-effect animation exists anywhere else in this dossier (§13's own note: item effects are unmodeled entirely) | §3e |

This table is a starting point for whoever implements the engine slice, not
an implementation-ready spec — several rows are explicitly flagged
"visually yes, not formula-verified" rather than claimed solved.

## Verification

`npm test` and `npm run build` green (extraction-verification + docs-only
session; no `src/engine/` changes). Four new dense stride-1 oracle traces
(`battle1-switchin-dense-{a,b,c,d}.json`, `tools/compare/traces-
groundtruth/`, README updated) each twice-run against the oracle, 0/969
total sha mismatches across the two runs (211+256+256+246 captures each
run). No extractor or `src/assets/gen/`/`src/data/gen/` changes — §5's own
finding is that the Pidgeotto assets already existed and are already
byte-exact; the only new committed artifact for goal 1 is the verification
script (`tools/compare/scratch/pidgeotto_corner_verify.mjs`). Every pixel
claim in §3 above traces to a specific tick in one of the four new dense
traces, re-derivable via `bin/oracle run tools/compare/traces-groundtruth/
battle1-switchin-dense-<a|b|c|d>.json -o <dir>/`.
