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

## 7. Formula verification (worktree lane `wt-20260720-115316`, oracle/RAM scouting only — no engine code)

Direct follow-up to §6's mapping table, which graded three elements
"visually yes, not formula-verified" or "new, no S6 analogue." This session
RAM-pins all three to the precision an engine slice needs (exact ticks,
literal per-tick tables, source citations), using two new committed
`ram-probe.py` specs (`tools/probe/specs/switchin-b1-sprite.json`,
path-based, tracks `gBattlerSpriteIds[1]`'s sprite dynamically through the
sprite-destroy/recreate boundary; `tools/probe/specs/switchin-allslot-scan.json`,
a brute-force `inUse`/`x`/`y` scan over all 65 `gSprites[]` slots, since the
ball-prop and item-effect sprites aren't tracked by any battler-indexed
global). Both run against the already-committed `battle1-grovyle-faint.json`
button script (same 66 segments as the dense traces) via
`/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
tools/probe/ram-probe.py <spec> <out.json>`, twice-run each, **byte-identical
across both runs** (deterministic, no rerun diffs). Outputs committed at
`src/data/gen/battle1-switchin-b1-sprite-probe.json` (853 ticks, 6460-7312)
and `src/data/gen/battle1-switchin-allslot-probe.json` (all-slot scan
6700-7312, trimmed to the 24 slots that ever toggle `inUse` — the other 41
sit at the dead-sprite default `x=304,y=160,flags=0` the entire window).

### 7a. Faint sink — PINNED, exact tick, exact closed form (goal 1)

RAM-confirms §3a's source-cited mechanism to the tick. `gSprites[8]`
(`gBattlerSpriteIds[1]`'s slot throughout the sink) per-tick, straight off
`switchin-b1-sprite.json`'s probe:

| tick | callback | y2 | data[3] | data[4] |
|---|---|---|---|---|
| 6501 | `0x08007429` (idle) | 0 | 0 | 256 |
| **6502** | `0x08039a49` | 0 | 8 | 1 |
| 6503 | `0x08039a49` | 8 | 7 | 2 |
| 6505 | `0x08039a49` | 16 | 6 | 2 |
| 6507 | `0x08039a49` | 24 | 5 | 2 |
| 6509 | `0x08039a49` | 32 | 4 | 2 |
| 6511 | `0x08039a49` | 40 | 3 | 2 |
| 6513 | `0x08039a49` | 48 | 2 | 2 |
| 6515 | `0x08039a49` | 56 | 1 | 2 |
| 6517 | `0x08039a49` | 64 | 0 | 2 |
| **6519** | `0x08007429` (idle again) | 0 | 0 | 0 |
| 6520-6560 | `0x08007429` steady | 0 | 0 | 0 |

`0x08039a49` is never independently symbol-resolvable (`SpriteCB_AnimFaintOpponent`
is `static`, `bin/oracle symbols` returns `null` for it) but its identity
isn't in doubt: `SpriteCB_FaintOpponentMon` itself (`0x08039934`, confirmed
via `bin/oracle symbols`) sets `data[3]=8-yOffset/8`, `data[4]=1`, and
`callback = SpriteCB_AnimFaintOpponent` as its last act (`battle_main.c:2783-2785`)
— exactly the state this probe observes the FIRST tick the callback isn't
the idle dummy, with `data[3]=8` matching Grovyle's `yOffset=4` from
`mon-pic-coords.json` (`8 - 4/8 = 8`, integer division) bit-exact. So tick
**6502** is `S`, the sink-start tick (`SpriteCB_FaintOpponentMon`'s own
one-tick cameo — the tick before, still idle; is never separately
observable as a *third* callback value because the handoff to
`AnimFaintOpponent` happens inside the same C call before the next frame's
sprite draw).

The 8 explicit steps land at **6503, 6505, 6507, ..., 6517** — exactly the
"first step 1 tick after `S`, every step after that 2 ticks apart" cadence
`SpriteCB_AnimFaintOpponent`'s source states verbatim
(`data[4]=1` then reset to `2`). `y2` climbs `8, 16, 24, ..., 64` (8×step).
At tick **6519** (the 9th decrement, `data[3]: 0 -> -1`), `FreeSpriteOamMatrix`
+ `DestroySprite` fire in the same tick — the probe reads the slot's fields
already cleared to their post-destroy defaults (idle callback, `y2=0`,
`data[3]=data[4]=0`, `flags=0` i.e. `inUse` cleared too), steady through
6560. This matches §3a's own pixel finding **exactly, tick for tick**: "484
opaque px steady... 6519-6560" — RAM-destroy and pixel-invisible land on
the identical tick, no residual lag for the *end* of the sink (the
in-between steps still carry this dossier's usual ~1-tick render lag, per
§3a's own pixel plateaus falling at 6504/6506/.../6518, one tick after each
RAM step).

**Closed form for the engine** (species-general, not curve-fit — every
constant below is source-cited): let `Y` = the switching-out species'
`gMonFrontPicCoords[species].yOffset` (already extracted,
`mon-pic-coords.json`), and let `n = 8 - floor(Y/8)` (Grovyle: `n=8`). Let
`S` = the tick `SpriteCB_FaintOpponentMon` assigns its callback (RAM-pinned
at 6502 for this trace — the general rule for *finding* `S` in a fresh
trace isn't itemized this session, just this one instance). Then:
- Sprite invisible-and-y2=0 for `tick < S`.
- For step `k = 1..n`: at tick `S + 2k - 1`, `y2 = 8k` and the sprite's
  bottom `(n-k+1)`th 8px tile-row is erased (`StartSpriteAnim` restarts the
  idle anim on the remaining rows each step — cosmetic, not needed for a
  from-scratch renderer that just draws less of the sheet each step).
- At tick `S + 2n + 1` (**6502 + 17 = 6519**, exact), the sprite is
  destroyed — draw nothing from this tick on.

This is a genuinely new mechanism (confirmed again this session — no S6
send-out mechanism erases-and-shifts a sprite), fully pinned: **no
remaining unknowns for whoever implements it**, modulo the general rule for
locating `S` in a fresh (non-this-trace) battle, which is a "find where the
opponent's HP hits 0 and add the usual post-KO text/menu latency," not a
new research question.

### 7b. Ball throw + materialize — mon-sprite geometry VERIFIED-SAME (shifted); ball prop + tint NOT located (goal 2, partial)

**Mon-sprite side (Pidgeotto's own sprite, slot 5 this trace)**, full
callback/field trace, `switchin-b1-sprite.json`:

| tick | callback | notes |
|---|---|---|
| 6726 | `0x08007429` (idle) | sprite created, `flags=5` (inUse+**invisible**), `x=176,y=51`, still (176,51) throughout — this is the sprite's own logical center, not `GROVYLE_CORNER`-style blit corner |
| 6744 | `0x08039b59` | = `SpriteCB_OpponentMonFromBall` (`0x08039b58`, confirmed via `bin/oracle symbols`) `+1` (thumb bit) — assigned per `pokeball.c:818` the instant the ball anim ends |
| 6745 | (same) | `flags` drops to `1` (invisible cleared — sprite now **visible**); `y2` begins a short descent: `14,13,12,11,10,9,8,7,5,4,3,2,0` over ticks 6745-6757 (a landing "settle" bounce, literal table, not curve-fit — no S6 analogue documented this session, flagged as switch-in-specific or simply not previously checked for Grovyle's own intro) |
| 6760 | `0x080398b9` | `animNum` flips 0->1 (`StartSpriteAnim(sprite,1)`, the two-frame front-anim family, §5's mechanism-5 precedent); `animCmdIndex` advances 0(6760)->1(6765)->2(6775) — **starts before the stretch matrix engages**, unlike Grovyle's own documented ordering (§7.17: front-anim starts only once affine-emerge finishes) — flagged as a possible sequencing difference, not cross-checked against Grovyle's own RAM this session |
| 6784 | `0x08180211` | the stretch driver (functionally identified by its numeric output below, not independently symbol-resolved — it's `static`) |
| 6785-6790 | (same) | `(data4,data5,y2)` = `(256,256,0),(257,254,0),(258,251,0),(259,248,-1),(260,245,-1),(262,241,-1)` — **byte-exact** to `GROVYLE_STRETCH_EARLY_TABLE[0..6]` (`battleScene.ts:2298-2306`); tick 6784 itself reads raw `(0,0,0)`, reproducing the same "matrix not yet latched this tick" artifact `GROVYLE_STRETCH_EARLY_TABLE[0]`'s own doc comment already names for Grovyle's tick 1496 |
| 6791-6825 | (same) | `(data4,data5,y2)` **byte-exact** to `GROVYLE_STRETCH_TABLE[0..34]` (`battleScene.ts:2233-2247`) verbatim, tick `6791+i` = table index `i`, **all 35 entries checked, zero deviation** |
| 6826 | `0x08184d89` | settle/handoff (unresolved symbol) |
| 6827+ | `0x08007429` (idle) | fully settled — matches §3c's own "~6810-6820 static" pixel finding within this dossier's usual slop |

**Verdict: verified-same, shifted.** The front-sprite stretch-in
(mechanism 5) is **byte-identical** to `GROVYLE_STRETCH_TABLE` +
`GROVYLE_STRETCH_EARLY_TABLE` — 41/41 checked tick-values exact, just
re-anchored from RAM tick 1503 (Grovyle) to RAM tick 6791 (Pidgeotto, this
trace). **No new table needed** — the engine slice can reuse the existing
`GROVYLE_STRETCH_TABLE`/`GROVYLE_STRETCH_EARLY_TABLE` constants verbatim
for any species' switch-in materialize, anchored at whatever tick its own
ball-open event lands on (the species-agnostic mechanism this session's
evidence implies: `Anim_VerticalStretch`'s math has no species-dependent
term, so of course the numbers replay identically).

**Open-particle burst** (`switchin-allslot-scan.json`, all-slot scan):
13 distinct sprite slots (**9-21**) created in a staggered **1-per-tick**
sequence at ticks **6746, 6747, ..., 6759**, all anchored at creation
position `(176, 59)`. Each lives **exactly 26 ticks** then is destroyed
(slot 9: 6746→6772; slot 10: 6747→6773; ...; slot 21: 6759→6785 — all
26-tick lifetimes, **zero variance** across all 13). This matches the shape
of S6's own already-implemented mechanism 3 ("open-particle burst",
§7.14/§7.27) closely — same particle count family, same staggered-creation
idea. **Not fully verified**: this scan only captured the struct's base
`x`/`y` fields (frozen at spawn value in this sample), not `x2`/`y2` — the
actual per-tick radial motion (which S6's own particle renderer drives via
`x2`/`y2`, per `battleScene.ts`'s Y-sort/particle-position code) wasn't
captured this session, so whether the radial *motion formula* is
numerically identical (not just the creation cadence/lifetime) is unverified
— concrete next step named, not glossed over.

**The literal thrown-ball sprite: NOT conclusively located this session.**
Slot 4 was investigated as the leading candidate (created at tick 6726 —
the same tick as the mon sprite — at logical position `(248,168)`,
off-screen since `y=168` exceeds the 160px screen height) but stays
`invisible` (`flags=5`) for its **entire** 6726-6761 lifetime with `x`/`y`
never changing once — inconsistent with a thrown ball that should become
visible and arc onto the field. Most likely it's some other bookkeeping
sprite, not the ball. Locating the real ball sprite would need the same
brute-force pixel/RAM cross-reference §7.12 used for the intro
(`find_ball.mjs`-style), re-run against this window — not attempted this
session (time-boxed out).

**Tint: NOT RAM-confirmed.** No palette-buffer probe was run — `paletteNum`
lives in a 4-bit sub-byte field (`OamData.paletteNum`, sprite offset
`0x04` bits 12-15) that `ram-probe.py`'s current path vocabulary (`add`,
`addSymbol`, `derefU32`, `derefU8Scaled`) can't shift-and-mask directly;
would need either a tool extension or a two-pass probe (read `paletteNum`
once, assume static, then probe `gPlttBufferFaded`'s corresponding 32-byte
bank by absolute address). Flagged as a precise, scoped gap, not glossed
over. One data point worth a second look before assuming verbatim reuse:
§3c's own pixel read puts the visible tint window at **~6752-6810** (~58
ticks), notably longer than Grovyle's own RAM-pinned 15-tick
`Task_FadeMon_ToNormal_Step` coefficient ramp (handoff+42 through +56,
§7.17) — could be imprecise pixel-eyeballing (`~` marked) or a genuine
difference; not resolved either way this session.

### 7c. Sitrus sparkle/ring — sprite count + exact source citation PINNED, gfx confirmed unextracted (goal 3)

Source first, then RAM cross-check. `HOLD_EFFECT_RESTORE_HP`'s battle
script, `BattleScript_ItemHealHP_RemoveItem` (`battle_scripts_1.s:4356-4364`,
already cited in §2 above for the heal-amount formula), opens with
`playanimation BS_ATTACKER, B_ANIM_HELD_ITEM_EFFECT` (`B_ANIM_HELD_ITEM_EFFECT`
= 7, `constants/battle_anim.h:364`), which dispatches
(`battle_anim_scripts.s`'s `gBattleAnimTable`, line 397) to
`General_HeldItemEffect` (`battle_anim_scripts.s:10440-10455`):

```
General_HeldItemEffect:
	loadspritegfx ANIM_TAG_THIN_RING
	loadspritegfx ANIM_TAG_SPARKLE_2
	delay 0
	...
	createvisualtask AnimTask_RotateMonToSideAndRestore, 2, 16, 128, ANIM_ATTACKER, 2   (x3)
	...
	call GrantingStarsEffect
```

**Exactly two gfx tags load** (`ANIM_TAG_THIN_RING`, `ANIM_TAG_SPARKLE_2`) —
and the all-slot RAM scan independently finds **exactly two** sprites
active during the window, no more, no fewer: slot 3 (created tick 6968 at
`(57,88)`, destroyed 7030; re-created tick 7040 at `(72,88)`, destroyed
7067) and slot 4 (created tick 6978 at `(84,83)`, moves to `(72,88)` at
tick **7040** — coincident with slot 3's second appearance, both now
co-located — destroyed 7072). Two source-cited gfx loads, two RAM-observed
sprites: independent cross-confirmation, not a guess. The positions
(x in 57-84, y in 83-88) sit near Onix's own on-field sprite, consistent
with §3e's "sparkle appears near Onix" / "ring radiates outward" pixel
read; the tick-7040 co-location jump lines up with §3e's own "~7040-7048"
window almost exactly. One correction to §3e's own pixel-only read: the
"Onix's own sprite briefly tints cyan" observation is more likely the
three `AnimTask_RotateMonToSideAndRestore` calls (Onix rocking side-to-side,
a rotation, not a palette tint) — not independently confirmed via a
rotation-specific RAM read this session, but the source only ever shows a
rotate task here, no palette-blend task, for this animation.

**Extraction status: genuinely unextracted, confirmed by direct check**
(not assumed) — `grep -rli "sitrus|sparkle|itemheal|healring"
src/assets/gen/ src/data/gen/` returns only unrelated hits (item-name/
hold-effect data *tables*, not gfx). `ANIM_TAG_THIN_RING`/`ANIM_TAG_SPARKLE_2`
tile+palette data would need a new extractor pass against the ROM's
battle-anim graphics bank (same family as `tools/extract/`'s existing
`battle-anim-particles.json`/`battle-anim-ball-open.json` pulls) — not
attempted, per this session's explicit scope (extraction itself out of
bounds at this cap).

### 7d. Healthbox slide-in — NOT REACHED this session (goal 4, stretch)

Out of time at this session's cap after 7a-7c. Completely unstarted — no
probe run, no pixel ramp measured. §3d's own coarse pixel note (six-px to
879-px growing diff, ~6829-6875) is the only evidence that exists; a future
session doing this would want the same `extract-sendout-healthbox-content.ts`-
style brute-force x-offset search §7.6 already used for Grovyle's own
healthbox, pointed at this window instead.

### Bottom line for the engine slice

| element | verdict |
|---|---|
| Faint sink | **Fully pinned** — exact tick, exact closed form, no remaining unknowns for this species |
| Materialize stretch geometry (mon sprite) | **Verified-same, shifted** — reuse `GROVYLE_STRETCH_TABLE`/`GROVYLE_STRETCH_EARLY_TABLE` verbatim, re-anchor to the new ball-open tick |
| Open-particle burst | **Shape-verified** (count/cadence/lifetime), motion formula (`x2`/`y2`) unverified |
| Thrown ball sprite | **Not located** — needs a `find_ball.mjs`-style pixel/RAM cross-reference pass |
| Materialize tint | **Not RAM-verified** — needs a palette-buffer probe (tool extension or two-pass) |
| Sitrus sparkle/ring | **Sprite count + exact source mechanism pinned**; gfx extraction still needed (confirmed absent, not assumed) |
| Healthbox slide-in | **Not reached** |

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

§7's own two new `ram-probe.py` specs (`tools/probe/specs/switchin-b1-sprite.json`,
`tools/probe/specs/switchin-allslot-scan.json`) were each run twice this
session, byte-identical output both times (`diff` clean) — committed at
`src/data/gen/battle1-switchin-b1-sprite-probe.json` and
`src/data/gen/battle1-switchin-allslot-probe.json`. No `src/engine/`
changes this section either; `npm test`/`npm run build` still green (see
below — same run, not re-verified separately per section).

## 8. Closing the five §7 gaps (worktree lane `wt-20260720-123728`, extraction + RAM/oracle probing — no engine code)

Direct follow-up to §7's own "Bottom line for the engine slice" table, in the
priority order the brief specified. Three new committed `ram-probe.py` specs
(`tools/probe/specs/switchin-ball-particle-detail.json`,
`switchin-pidgeotto-tint.json`, `switchin-healthbox.json`, plus a small
`switchin-pidgeotto-palettenum.json` lookup), each run twice, byte-identical
both times — outputs at `src/data/gen/battle1-switchin-ball-particle-detail-probe.json`,
`-materialize-tint-probe.json`, `-healthbox-probe.json`,
`-pidgeotto-palettenum-probe.json`. One new extractor,
`tools/extract/extract-battle-anim-item-heal.ts`, output
`src/assets/gen/battle-anim-item-heal.json`.

### 8a. Sitrus ring + sparkle gfx — sparkle CLOSED (byte-exact); ring extracted, NOT pixel-verified (goal 1)

Source (`General_HeldItemEffect`, `reference/pokeemerald/data/battle_anim_scripts.s:10440-10460`,
already cited in §7c) names two `loadspritegfx` tags plus one `createsprite`
each for the star burst and the ring:

- **`ANIM_TAG_SPARKLE_2`** ("granting stars"): tiles
  `gBattleAnimSpriteGfx_Sparkle1` (`graphics/battle_anims/sprites/sparkle_1.png`,
  32x256px = 4 cols x 32 rows of 8x8 tiles, `src/graphics.c:179`), palette
  `gBattleAnimSpritePal_Sparkle2` (a standalone JASC-PAL file, `sparkle_2.pal`,
  `src/graphics.c:182` — **not** PNG-embedded, unlike most other battle-anim
  sprite gfx already extracted in this repo). Template
  `gGrantingStarsSpriteTemplate` (`src/battle_anim_effects_2.c:1400-1410`):
  OAM `&gOamData_AffineOff_ObjNormal_32x32`, anim `gGrantingStarsAnimCmds`
  (`:733-741`, 8 frames at tile offsets `0,16,32,...,112`, 7 ticks each, then
  loops). `GrantingStarsEffect` (`data/battle_anim_scripts.s:10040-10045`)
  spawns two of these sprites 8 ticks apart, at attacker-relative offsets
  `(-15,0)` and `(12,-5)`.
- **`ANIM_TAG_THIN_RING`** (the expanding ring): a single source PNG
  (`thin_ring.png`, 64x64px = 8x8 tiles) supplies **both** tiles and palette
  (`src/graphics.c:691-692` — two separate `INCGFX_U32` calls targeting the
  same file, one `.4bpp.lz` one `.gbapal.lz`). `General_HeldItemEffect`'s own
  `createsprite` uses `gThinRingExpandingSpriteTemplate`
  (`src/battle_anim_effects_2.c:742-751`: OAM
  `&gOamData_AffineDouble_ObjNormal_64x64`, affine anims
  `gThinRingExpandingAffineAnimTable` — **two** entries,
  `gThinRingExpandingAffineAnimCmds1` (`0x10,0x10,dur=0` then `0x10,0x10,dur=30`,
  i.e. a static, non-growing tiny render) and `...Cmds2` (`0x10,0x10,dur=0`
  then `0x20,0x20,dur=15`, i.e. genuinely expanding over 15 ticks). Both
  extracted; **which index the template's own createsprite call actually
  selects was not traced to source this session** (`AnimSpriteOnMonPos`'s own
  affine-anim-index selection wasn't followed that deep) — but §3e's own pixel
  read ("expanding... over ~16 ticks") matches `cmds2`'s 15-tick growth
  duration far better than `cmds1`'s no-op, so `cmds2` is the likely candidate,
  flagged as evidence-based, not source-confirmed.

Both extracted into `src/assets/gen/battle-anim-item-heal.json`
(`{ sparkle: {...}, ring: {...} }`, extractor
`tools/extract/extract-battle-anim-item-heal.ts`).

**Verification — sparkle: byte-exact.** Brute-force corner+frame search
(`tools/compare/scratch/sitrus_sparkle_verify.mjs`) over every tick
6968-7072 of a fresh oracle regen of `battle1-switchin-dense-c.json` and
every one of the 8 `grantingStarsAnim` frames, searching corners in a
20-110 x 60-100 box: best match **`{tick: 6990, corner: (41,74), frame:
tile 48 (the 4th of 8 anim frames), diff: 0, opaque: 115}`** — 0 residual
mismatched pixels out of 115 opaque, a true byte-exact hit, at the position
and timing §7c's own RAM scan already placed one of the two "sparkle" slots
(slot 4, created tick 6978 near `(84,83)`, and slot 3's second life near
`(57,88)` — `(41,74)` is in the same neighborhood, consistent with the two
`GrantingStarsEffect` spawns' `(-15,0)`/`(12,-5)` attacker-relative offset
pair landing near each other).

**Verification — ring: NOT byte-exact-verified this session.** The ring's
`ST_OAM_AFFINE_DOUBLE` scaling (accumulator 16-32 throughout either table,
far from the neutral 256 the mon-materialize table reaches — meaning the
64x64 source renders at roughly 1/16-1/8 scale, a genuinely tiny on-screen
footprint) makes a placement+scale brute-force search meaningfully more
expensive than the sparkle's fixed-size case; not attempted at this
session's time budget. A coarse palette-presence scan (counting exact
ring-palette RGB matches in the Onix-neighborhood crop across ticks
7040-7066) found several hundred matching pixels throughout the window, but
the ring's own palette shares common colors (white, black) with everything
else on screen, so this is **not** a clean signal and is **not** reported as
a verification — the honest state is "extracted, source-cited, gfx tag +
sprite count already independently cross-confirmed by §7c's RAM scan, pixel
byte-exactness not established." Concrete next step: a scaled-affine
placement search (candidate corner x candidate accumulator value) analogous
to `pidgeotto_corner_verify.mjs` but with a scale parameter, restricted to
the tick range once `cmds1` vs `cmds2` is resolved (narrows the scale search
space a lot).

### 8b. Thrown-ball prop sprite — CLOSED, with a correction to the brief's own framing (goal 2)

A new probe (`switchin-ball-particle-detail.json`, tracking
`callback`/`x`/`y`/`x2`/`y2`/`animNum`/`animCmdIndex`/`data[0]`/`data[1]`/
`flags` for slots 3, 7, 8, 9-21 across ticks 6700-7312 — the slots §7b's
coarser x/y-only scan flagged as candidates or left unexplained) identifies
**slot 7** as the ball prop, definitively:

| tick | event |
|---|---|
| **6727** | sprite created, `flags=1` (inUse, **visible**), `x=176,y=64` (screen corner `(168,56)` under the already-established `corner=(x-8,y-8)` convention — **the identical resting screen slot** `battle-anim-assets.md §4` found for the intro send-out's own ball) |
| 6727-6742 | callback `0x08076399` held, `data[0]` counts `0,1,2,...,15` (16 ticks) — the same generic "16-tick delay" shape already documented for `SpriteCB_OpponentMonSendOut` |
| 6743 | callback `0x08075d15` (one-tick handoff state) |
| **6744** | callback `0x08075fd5` (== `SpriteCB_ReleaseMonFromBall`'s real-battle switch-in equivalent), `animNum` flips 0->1 (`StartSpriteAnim(sprite,1)`, `sBallAnimSeq1`) — **the same tick** the particle burst's own first two spawns begin (§8d below) and the materialize tint engages (§8c below), confirming all three fire off one shared callback exactly as `pokeball.c:750-824`'s source states |
| 6744-6748 | `animCmdIndex=0` (frame "open", tiles 4-7) held **5 ticks** — source-exact (`ANIMCMD_FRAME(4,5)`) |
| 6749-6754 | `animCmdIndex=1` (frame "openFinal"/blank, tiles 8-11) held **~5-6 ticks** — source-exact (`ANIMCMD_FRAME(8,5)`), same one-tick render-lag slop this dossier's other timings already carry |
| 6755-6756 | `flags` flips `1->5` (invisible) |
| **6757** | slot reused for the burst's 14th particle spawn (§8d) — the ball's own sprite is gone by here |

**Corrects the brief's own framing**: there is **no throw arc** anywhere in
the observable RAM/pixel record — `x`/`y` are **constant** `(176,64)` for
the entire 6727-6756 lifetime (zero motion), and the sprite doesn't exist at
all before 6727, so the brief's "~6684-6720" throw-arc window is empty (the
switch's own text is still printing through 6727, per §3b). §3c's own pixel
read ("~6746 a small thrown-ball sprite appears in the oval") undercounted
the sprite's actual lifetime by 19 ticks: a targeted pixel crop of the
resting corner across ticks 6720-6750 (`/tmp` scratch, not committed — a
one-off crop-color dump) shows the ball's own "open"-frame dark-gray tone
(`(66,66,66)`, `battle-anim-ball-open.json`'s own palette) first appearing
at **6745** (one tick after `animNum` flips, the usual render lag) — the
*closed*-frame ball (6727-6743) apparently doesn't produce a big enough
color delta against the pre-existing shadow-oval backdrop for a coarse
"top colors in a 32x32 crop" scan to flag, not that it's actually invisible
(RAM says `flags=1`, visible, the whole time). **No new gfx extraction
needed** — this reuses `battle-anim-ball-open.json`/`summary-ball.json`
verbatim, the third confirmed reuse of the shared
`SpriteCB_ReleaseMonFromBall` ball-open asset family (opponent send-out,
player send-out, now an AI mid-battle switch-in) with zero new tile/palette
bytes.

### 8c. Materialize palette tint — CLOSED, exact same mechanism as S6 (goal 3)

Pidgeotto's mon sprite (slot 5) OAM's `paletteNum` (the sub-byte field the
known ram-probe.py gap can't shift-and-mask directly — read the containing
u16 at sprite-offset `0x04` and decoded bits 12-15 in the analysis script,
per the papercut's own documented workaround): **paletteNum = 1** (RAM-read,
ticks 6726-6735, steady). Two-pass probe:
`gPlttBufferFaded`/`gPlttBufferUnfaded` at absolute bank `16+1=17`
(`gPlttBufferFaded + 17*32 + colorIndex*2`, 32 bytes/bank = 16 colors x 2
bytes, standard BG(0-15)/OBJ(16-31) split), colors 1-4, across ticks
6740-6835.

**Result: bit-for-bit the same tint as S6's own Grovyle materialize** —
`gPlttBufferFaded`'s color 1 reads exactly `(31,22,30)` (5-bit channels) from
tick 6744 (the ball-open tick, §8b) through 6767, **exactly**
`MATERIALIZE_TINT_COLOR`'s own GBA5 source value (`RGB(31,22,30)`,
`gBallOpenFadeColors[BALL_POKE]`, already extracted in
`battle-anim-tables.json`/coded as `MATERIALIZE_TINT_COLOR` in
`battleScene.ts:1914`) while `gPlttBufferUnfaded` holds the true color
`(31,31,31)` unchanged throughout — direct RAM confirmation this is the
identical `BlendPalette` target, not a new color. The coefficient (solved
per-tick via `blendComponentToward`'s own formula,
`b5 = c5 + ((t5-c5)*coeff)>>4`, same formula already reverse-engineered
elsewhere in `battleScene.ts` for the dragon-breath/endeavor tints) holds at
**16** (fully blended) for ticks 6744-6767 (24 ticks), then ramps linearly
down to **0** (true color restored) over ticks 6768-6782 — **exactly 15
ticks**, the identical duration already RAM-pinned for Grovyle's own
`Task_FadeMon_ToNormal_Step` (§7.17, "handoff+42 through +56", also 15
ticks) — settled flat at true color `(31,31,31)` from 6782 through 6835 (well
past the pixel-estimated ~6810-6820 materialize-settle window).

**No new tint transform needed for the engine** — reuse
`MATERIALIZE_TINT_COLOR` and the existing coefficient-ramp code verbatim,
anchored as: coefficient 16 held for `ballOpenTick` through `ballOpenTick+23`,
then ramps 16->0 over the following 15 ticks (`ballOpenTick+24` through
`+38`). This also resolves §7b's own flagged discrepancy ("~58-tick visible
tint window, notably longer than Grovyle's 15-tick ramp") as **imprecise
pixel-eyeballing, not a real difference** — the RAM-exact ramp is the same
15 ticks; the small, fully-tinted, low-opacity silhouette during the early
stretch-table ticks (§7b) visually reads as "still tinted" for longer than
the ramp itself actually runs.

### 8d. Open-particle burst motion formula — CLOSED, exact same formula as S6, corrects the burst's own count (goal 4)

The detail probe's `x2`/`y2` fields (converted from raw `u16` to signed) were
checked against the exact already-implemented closed form
(`battleScene.ts`'s own `gbaSin`/`gbaCos`, `angle = (i%8)*32`,
`radius = age===0 ? 0 : 2*(age-1)`, `dx=gbaSin(angle,radius)`,
`dy=gbaCos(angle,radius)`) for all 16 particles (see below), across every
tick each was alive: **400/400 checks match exactly**, once the same 1-tick
RAM-vs-logical-tick lag this dossier's other mechanisms already carry is
applied (`age = tick - spawnTick - 1`) — 0 mismatches. **The formula is
bit-for-bit identical to the send-out burst already coded in
`drawBallOpenParticles`/`sortAliveParticlesByScreenY`** — no new motion
formula needed, only a new spawn anchor.

**This also corrects §7b's own particle count.** §7b's coarser scan (x/y
only, slots 9-21) found "13 distinct sprite slots," undercounting by 3: the
full spawn sequence is **16 particles** (matching
`PokeBallOpenParticleAnimation`'s own source-cited "one particle per tick
for 16 ticks" exactly, and this repo's own already-defined
`PARTICLE_SPAWN_COUNT`/`PARTICLE_LATE_SPAWN_START_INDEX=14` constants), spawn
index `i=0..15` at tick `6744+i`, occupying slots in creation order `3, 8, 9,
10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 7 (reused from the just-destroyed
ball, §8b), 20, 21` — the two "missing" early spawns (`i=0` at tick 6744,
`i=1` at tick 6745) landed in slots 3 and 8, which were free at that exact
moment and so weren't part of §7b's `9-21`-only slot range, and the 14th
spawn (`i=13`, tick 6757) reused the ball's own just-freed slot 7 rather than
taking a fresh one — exactly the same "slot reuse" behavior `i=14`'s own
already-coded `PARTICLE_LATE_SPAWN_START_INDEX=14` constant anticipates
generically (this trace's reuse just happens one index earlier, at a
freed ball slot instead of a freed particle slot). **Closed-form summary for
the engine**: same formula, same 16-particle spawn count, anchored at
`ballOpenTick` (6744) instead of the send-out's own anchor — no table dump
needed, the formula generalizes cleanly and is now cross-verified on a
second, independent instance.

### 8e. Healthbox slide-in ramps — CLOSED, both directions (goal 5)

Probed `gHealthboxSpriteIds[1]` (opponent battler)'s sprite dynamically
(same multi-hop `path` pattern as `switchin-b1-sprite.json`) across ticks
6480-6900. **The healthbox sprite slot itself never changes** (stays
`gHealthboxSpriteIds[1]`'s slot 1 throughout — the same physical sprite
object is reused for both Grovyle's and Pidgeotto's healthbox content, not
destroyed and recreated) and its `(x,y)` base position never changes
(`(44,30)`, matching the singles-opponent healthbox's fixed screen anchor)
— **all** of the "old box out"/"new box in" motion happens on `x2` alone:

- **Old (Grovyle) box out**: `flags` flips `1->5` (visible->invisible) at
  **tick 6520** — exactly one tick after §7a's own RAM-pinned faint-sink
  destroy tick (6519). **There is no slide-out** — the healthbox simply goes
  invisible in lockstep with the fainted sprite's own destruction and stays
  invisible (RAM-confirmed steady `flags=5`, `x2=0`) for the entire
  6520-6827 switch-in window that follows.
- **New (Pidgeotto) box in**: at **tick 6828**, `callback` flips to a slide
  task (`0x080769cd`) and `flags` flips back to `1` (visible) with `x2`
  jumping straight to **-110** (`u16` `65426` decoded as `s16`); `x2` then
  climbs **+5/tick** for 22 explicit steps (`-110, -105, -100, ..., -5` at
  ticks 6828-6849) before settling to `x2=0` with the callback reverting to
  idle at **tick 6850** — a clean **23-step linear slide**, bit-for-bit the
  same shape (step count, step size) `battleScene.ts`'s own `§7.6`
  `StartHealthboxSlideIn` finding already documented for Grovyle's own
  intro send-out (line ~1408, "23-step linear slide"). **No new ramp table
  needed** — reuse the existing slide-in mechanism verbatim, anchored at
  `pidgeottoSpriteSettleTick + N` (empirically 6828, i.e. roughly the tick
  the mon's own materialize finishes per §3d/§7b) rather than re-deriving a
  new step table.

### Bottom line for the engine slice (supersedes §7's own table)

| element | verdict |
|---|---|
| Faint sink | **Fully pinned** (§7a, unchanged) |
| Materialize stretch geometry (mon sprite) | **Verified-same, shifted** (§7b, unchanged) |
| Open-particle burst | **Fully pinned** — same formula as send-out, 16 particles (not 13), anchored at ball-open tick 6744 (§8d) |
| Thrown ball sprite | **Fully pinned** — slot 7, static at `(176,64)`/corner `(168,56)`, no throw arc exists in this window, same gfx/timing family as the send-out ball (§8b) |
| Materialize tint | **Fully pinned** — identical `MATERIALIZE_TINT_COLOR`/coefficient-ramp mechanism, coeff 16 held 24 ticks then ramps to 0 over 15 ticks from the ball-open tick (§8c) |
| Sitrus sparkle/ring | **Sparkle: fully pinned, byte-exact** (0/115px). **Ring: extracted + source-cited, not pixel-verified** — affine-scale placement search not attempted this session (§8a) |
| Healthbox slide-in | **Fully pinned, both directions** — old box goes invisible in lockstep with the faint-sink destroy tick (no slide-out exists), new box reuses the same 23-step slide-in already known from send-out (§8e) |

Four of five gaps are now fully closed with exact ticks/formulas ready to
implement against; the fifth (Sitrus ring) has its gfx extracted and
source-cited but still needs a scaled-affine pixel placement pass before
being called byte-exact.

## Verification (§8)

`npm test` and `npm run build` green (one new extractor + gen asset, four
new probe specs + their twice-run, byte-identical outputs, docs only — no
`src/engine/` changes). New committed artifacts: `tools/extract/
extract-battle-anim-item-heal.ts`, `src/assets/gen/battle-anim-item-heal.json`,
`tools/probe/specs/switchin-ball-particle-detail.json`,
`switchin-pidgeotto-palettenum.json`, `switchin-pidgeotto-tint.json`,
`switchin-healthbox.json`, their outputs at `src/data/gen/
battle1-switchin-{ball-particle-detail,materialize-tint,healthbox,
pidgeotto-palettenum}-probe.json`, and one verification script
(`tools/compare/scratch/sitrus_sparkle_verify.mjs`).

## 9. S7 slice L attempt (bounded worker, this session) — NOT LANDED; a real, previously-unknown blocker found and precisely located, plus one small pixel correction

This session attempted the engine slice §8's own "Bottom line" table was
written for (tick 6588 → a settled menu vs. PIDGEOTTO). It did **not** land
— ran out of the 60-minute cap mid-verification — and the speculative
`src/engine/battleScene.ts` draft was **reverted** (uncommitted, never
shipped) rather than landing a non-0-diff trace. What follows is real,
oracle-verified information worth keeping so the next session doesn't
re-spend the same budget re-deriving it.

**Confirmed byte-exact, ready to implement directly:**
- "BUG CATCHER DESTIN sent\nout PIDGEOTTO!" (`SWITCHIN_SENTOUT_LINE1/2`,
  38 chars total) prints 1 char/tick starting render tick **6687** through
  completion at **6724** — implemented directly against the oracle
  (`npm run compare` against a scratch trace, ticks 6580-6815) and matched
  **every single tick** 6687-6726 with zero pixel diff. This piece is safe
  to re-add verbatim.
- The party-icon-bar re-trigger (§3b) starts at render tick **6588** exactly
  (`ballStatusBarPositions`' own `rt=t-1` convention: createTick=6587) and
  its SETTLED state (bar + 6 icons, no further change) is byte-exact from
  render tick **6608** through at least **6726** when reusing `OPP_BAR_X2`
  re-anchored at createTick 6587 for the bar, and a plain per-icon x-offset
  for the icons (no slide transient modeled at all, jumps straight to
  settled) — 0 diff at every one of those settled ticks.
- **Correction to §3b's own pixel-only read**: the icon that flips (GROVYLE's
  own former slot) lands on index **5** (not verified positionally by §3b),
  and its post-flip tile is **`"Statused"`**, not `"Fainted"` —
  byte-exact pixel match (0/37 opaque px) against
  `src/assets/gen/battle-interface-ball-display.json`'s own 4 states at the
  settled render tick 6650 (script: ad hoc, not committed — a corner+state
  brute-force identical in spirit to `pidgeotto_corner_verify.mjs`). Either
  that asset's own `states` array is mislabeled relative to its real in-game
  role, or "fainted" is genuinely rendered via the same tile the extractor
  named "Statused" — not resolved which, out of this session's scope to fix
  the extractor.

**NOT byte-exact, real open problems:**
1. **The icon SLIDE transient (render 6591-6606) has a small but real
   residual** (~100-290 mismatched px/tick, every one of the 6 icon
   columns) when modeled as "all 6 icons share the same 9-value ease-out
   tail with zero lead-in, uniformly" (the hypothesis this session tried,
   picked because the total 20-tick retrigger window length matches
   `OPP_BAR_X2`'s own 20 entries exactly). The real per-icon behavior likely
   still staggers somewhat (the S6 intro's own first entrance staggers each
   icon by `i*7+10` ticks, per `battle_interface.c`'s own
   `SpriteCB_StatusSummaryBalls_Enter` source, referenced in this file's own
   §4 module doc) — a proportionally-compressed stagger was hypothesized but
   never oracle-tested (ran out of time). **Next step**: RAM-probe
   `gSprites[]`'s `x2` for the 6 icon sprites directly across render ticks
   6587-6608 (same `path`-based technique as `switchin-b1-sprite.json`) —
   much faster than another brute-force pixel search.
2. **A second, unexplained icon-bar-region change at render tick 6727** —
   exactly the tick the ball prop spawns (§8b). The SAME bbox
   `(0,32)-(103,43)` that the retrigger itself uses changes AGAIN, in a
   16-tick alternating-magnitude pattern (diff counts 1091/1087 alternating,
   render ticks 6727-6742), then holds a NEW steady state from 6743 on that
   is **different** from the tick-6608 settle (confirmed: a fresh oracle
   diff of render tick 6726 vs 6587, the pre-retrigger background, is
   ALSO nonzero — so it's not simply "the bar hides again" either). This is
   a genuinely new, previously-undocumented sub-mechanism, not itemized
   anywhere in §3/§7/§8 — flagged precisely rather than guessed at. It
   directly blocks clean verification of the ball/materialize window (any
   compare run spanning both regions conflates the two), so it should be
   RAM-probed FIRST by whoever picks this back up (candidate:
   `SpriteCB_StatusSummaryBalls_Enter`/`_Exit`, or `HandleBallAnimEnd`
   itself touching the summary-bar sprites as a side effect of the new
   battler's status becoming known — unconfirmed, a lead not a finding).
3. **The front-sprite materialize/stretch table anchor is genuinely
   different from the ball/tint/particle anchor** — re-derived this session
   from the EXPLICIT RAM ticks §7b/§8b/§8c/§8d each independently pin (ball-
   open/tint/particle share RAM tick 6744; `GROVYLE_STRETCH_TABLE`'s own
   re-anchor is RAM tick 6791), giving two different `handoffTick`-shaped
   constants (6726 for ball/particles, 6750 for materialize/stretch/early-
   stretch, using the S6 intro's own internal offsets
   `MATERIALIZE_START_OFFSET=19`/`GROVYLE_FRONT_ANIM_START_OFFSET=35`/
   `MATERIALIZE_END_OFFSET=42` unchanged). This is *derived*, not
   independently oracle-verified — blocked by finding 2 above before a clean
   compare run could isolate it. Worth checking first before further hand-
   derivation.

**Bottom line for whoever picks this up next**: the text mechanism is done
and safe to land as-is; the icon-bar retrigger is ~95% done (only the short
slide transient needs a RAM probe, not more guessing); the real new
unknown is finding 2 (the tick-6727 icon-bar interaction) — solve that
first, since it's small in scope (a single sprite-region RAM probe) but
gates a clean read on everything from the ball prop onward.

### Resolution (S7 slice L retry, bounded worker, next session) — all three open items closed, LANDED

RAM-probed both remaining unknowns directly (`tools/probe/specs/switchin-
iconbar-slidein.json`, RAM ticks 6580-6614; `switchin-iconbar-transient.json`,
RAM ticks 6710-6754 — `gSprites[]` x/y/x2/y2/flags/animNum/animCmdIndex/
callback/raw-OAM-word for the bar's own reused slot 3 and the 6 icons'
fresh slots 54-59) BEFORE writing any render code, closing all three open
items above:

1. **The icon slide transient**: NOT a per-icon staggered tail after all —
   all 7 sprites (bar + 6 icons) share the IDENTICAL `x2` sequence every
   tick, bit-for-bit `OPP_BAR_X2` itself (`-95..0` over RAM ticks
   6587-6606), zero stagger. The "9-value ease-out tail" hypothesis this
   session's prior attempt tried was the wrong shape; the real mechanism is
   simpler (uniform, full 20-step curve) than guessed.
2. **The tick-6727 transient**: RESOLVED. At RAM tick 6725, all 7 sprites'
   raw OAM first word jumps by `0x400` simultaneously — `OamData.objMode`
   flipping `NORMAL`->`BLEND` for all 7 in one shared tick, `x`/`y`/`x2`/
   `y2` otherwise unchanged. At RAM tick 6742, all 7 are destroyed
   simultaneously. This is `Task_HidePartyStatusSummary`'s own alpha-blend-
   then-destroy shape (already modeled here for the PLAYER bar's own S6-
   intro exit, `playerSummaryFadeEva`) applied to the OPPONENT bar, with a
   flat 1-unit/tick ramp (not the player exit's "every OTHER tick") over
   the 16-render-tick window 6727-6742 — matching this section's own
   "alternating 1091/1087px" pixel finding exactly (that's the alpha-blend
   ramp's own per-tick rounding noise, not a new mechanism). The freed
   slot 3 is reused by the open-particle burst's own first spawn at RAM
   6744 (§8d, already known, unrelated).
3. **The front-sprite materialize/stretch anchor**: still unattempted this
   session (out of the landed scope — the ball prop itself wasn't
   implemented) — §9's own two-anchor derivation stands, untested by this
   session's own findings either way.

Landed as `turn5-sentout.json` (extends `turn5-faint.json`'s own script
verbatim, tick 6588-6728, dense stride-1) — **141/141, 0 diff**, covering
the icon bar's entire lifecycle (create/slide/settle/text/fade/destroy) in
one commit, plus 4 new Tier-1 pins. Full details: `docs/battle-turn-
notes.md` §25. Stops at 6728 (one tick before the unimplemented ball
prop's own first pixel, confirmed by isolating the mismatched region to
the ball's own resting corner, not the icon bar's bbox) — the ball prop
through Sitrus/settled-menu remains open for a future session.

## 10. S7 slice L-3 (bounded worker): ball + particle burst + materialize growth LANDED, ball-to-settle window partially closed — `turn5-switchin.json` 167/167, 0 diff, stops at 6754 (mid-materialize, NOT the full ball-to-settle window)

Picked up exactly where §9's own Resolution left off (the ball prop
through Sitrus/settled-menu). RAM-probed the remaining unknowns directly
against the already-committed probes (`battle1-switchin-ball-particle-
detail-probe.json`, `-materialize-tint-probe.json`, `-b1-sprite-probe.json`)
plus fresh oracle pixel scans (`/tmp/oracle-switchin-{a,b}` regenerated from
the committed `battle1-switchin-dense-{a,b}.json`), then iterated render
code against the live oracle via `npm run compare`. Landed BALL (fully) and
the front-sprite's own GROWING flat-tint silhouette phase (fully) — 26
ticks (6729-6754) newly 0-diff. Did NOT land the remainder of the
materialize window (coefficient ramp-down + wobble-table phases, roughly
6755-6828) or anything past it (healthbox slide-in, Sitrus, settled menu) —
real residuals remain there, itemized below so the next session doesn't
re-spend the budget re-finding them.

### What's landed, byte-exact

- **`TURN5_BALL_HANDOFF_TICK = 6727`** (RAM ball-creation tick, `battle1-
  switchin-ball-particle-detail-probe.json` slot 7) - reusing `drawSendOutBall`
  VERBATIM with this anchor reproduces the ball's entire closed/open/
  openFinal lifecycle bit-exact (pixel-verified: first visible closed-ball
  pixel at render **6729** = `handoffTick+BALL_CLOSED_START_OFFSET(2)` exactly,
  open frame at **6745** = `handoffTick+18` exactly - the SAME S6 offset
  constants generalize with zero changes, only a new anchor).
- **The open-particle burst's CLEAN closed form** - reusing `drawBallOpenParticles`
  VERBATIM was WRONG: that function bakes in `PARTICLE_STALL_LOGICAL_TICK`/
  `PARTICLE_LATE_SPAWN_START_INDEX` age corrections ISSUES #17 added for a
  one-off S6-specific single-RAM-tick emulation freeze that has no reason to
  recur here - pixel-verified this session (regressed ticks from logical
  tick 13 on). §8d's own CLEAN formula (`age = tick - spawnTick - 1`, no
  adjustment) is what actually matches - implemented as a new
  `drawTurn5SwitchinParticles`, otherwise identical constants/formula
  (`gbaSin`/`gbaCos`, `PARTICLE_ORIGIN`, `PARTICLE_MAX_AGE`,
  `sortAliveParticlesByScreenY`).
- **The materialize GROWING phase** (render 6746-6767, `drawTurn5PidgeottoMaterialize`
  phase 1): reuses `affineEmergeAccumulator`/`MATERIALIZE_Y2_TABLE`/
  `MATERIALIZE_TINT_COLOR` verbatim (same universal `BATTLER_AFFINE_EMERGE`
  curve, species-independent) at Pidgeotto's own corner `(144,19)` - INCLUDING
  the accumulator's own `+1` logical-offset correction §7.21 already
  established for Grovyle (`affineEmergeAccumulator(local + 1)`, NOT
  `(local)` - missing this on the first attempt this session produced an
  oversized/wrong-shaped silhouette for the first ~12 ticks, byte-exact once
  added).
- **The switch-in window's own BG-to-white dither** (`TURN5_BG_FADE_Y`,
  `turn5BgFadeY`, wired into `drawStaticBgShiftedY`'s new optional `fadeY`
  param): a clean 0->16->0 ramp over render ticks 6746-6781 (2-per-2-tick,
  zero missing steps - see the correction note below), same
  `BeginNormalPaletteFade`/`blendComponentToWhite` mechanism `SENDOUT_BG_
  FADE_Y` already established for S6. **Real correction found and fixed
  this session**: a first-pass decode against the SKY swatch `(60,1)`
  (unfaded `(222,231,231)`, the same swatch S6's own table cites) produced
  an under-resolved table with two steps silently missing (that swatch's
  own y=0 and y=2 8-bit outputs happen to coincide) - re-derived from a
  higher-dynamic-range GROUND swatch `(150,60)` (unfaded `(189,189,156)`)
  instead, which resolves every step cleanly against `blendComponentToWhite`'s
  own closed form, no missing values. This was the SINGLE largest
  contributor to this session's own early false starts (a >16000px/43%
  full-frame diff before the fix, since the missing background fade was
  misread as a sprite-shape bug at first).
- **Front-sprite frame parity, corrected**: Pidgeotto's own `animCmdIndex`
  transition ticks (RAM 6760/6765/6775/6785/6820, render = RAM+1) are
  RAM-exact (`battle1-switchin-b1-sprite-probe.json`), but the naive
  even-index-parity-to-frame0 mapping is INVERTED from the real one -
  pixel-verified (474px residual at render 6761 dropped to 26px once
  flipped). `turn5PidgeottoFrame` codes the corrected mapping.
- **The materialize ramp phase's own render-lag is DIFFERENT from every
  other RAM-tracked mechanism in this window**: the palette-coefficient
  ramp (`TURN5_MATERIALIZE_RAMP_COEFF`, literal RAM-solved sequence,
  `battle1-switchin-materialize-tint-probe.json`) becomes visible on-screen
  at the SAME render tick as its own RAM tick (RAM 6768's coefficient=13 is
  visible at render **6768**, not 6769) - NOT the "+1" lag this entire
  dossier's every other mechanism (OAM x/y2, BG scroll, sprite callbacks)
  carries. Using the expected "+1" first (ramp starting render 6769) put a
  full extra flat-tint tick where the oracle already shows the first
  partially-blended color, producing a solid-color full-silhouette mismatch
  at exactly render 6768 (a >1300px residual) - flagged as a genuinely
  different lag class for whoever next probes a palette-fade timing in this
  file, not assumed to generalize back to `SENDOUT_BG_FADE_Y`'s own (already
  pixel-verified, unrevisited) constants.

### What's NOT landed - the honest remainder

1. **The coefficient ramp-down phase itself (render 6768-6782) still
   carries a ~3% residual** (~1100-1350px/frame) even after the lag fix
   above - the coefficient VALUES themselves are RAM-exact (solved directly
   from `gPlttBufferFaded` vs `gPlttBufferUnfaded`, not guessed), and the
   frame-parity fix and lag fix both measurably helped, but something more
   is still off in this narrow window - not root-caused this session
   (ran out of time mid-diagnosis). Candidate next step: RAM-probe
   `oam.affineMode`/the matrix registers directly across this exact
   sub-window (RAM 6767-6783) rather than continuing to infer geometry from
   `affineEmergeAccumulator`'s own extrapolated saturation.
2. **The wobble-table phase (render ~6786-6828, `TURN5_STRETCH_TABLE`) is
   ALREADY near-clean** (residuals of 0-14px/frame, likely rounding/
   anti-aliasing noise, not a real shape bug) but wasn't independently
   pixel-verified as its own isolated 0-diff span this session (only
   observed as part of the fuller ball-to-settle scratch sweep) - a fast
   remaining task, not a research gap.
3. **`TURN5_PIDGEOTTO_SETTLE_TICK = 6828` is pixel-confirmed** (exact 0-diff
   match at render 6828 in every scratch sweep run this session) - safe to
   reuse directly.
4. Healthbox slide-in, Sitrus proc, and the settled menu vs. PIDGEOTTO are
   UNTOUCHED this session (ran out of cap after the materialize-window
   debugging above) - §8e/§2/§3e's own formulas/tables are still the
   right starting point, unchanged by anything in this section.

### Bottom line for whoever picks this up next

Don't re-derive the ball/particle/growth-phase mechanisms above - they're
byte-exact and committed (`turn5-switchin.json`, 6588-6754). The real next
task is narrow: close the ~3% residual in the coefficient ramp-down
sub-window (6768-6782, item 1 above), then verify the wobble-table phase
its own dense 0-diff span (item 2), which should unlock `TURN5_PIDGEOTTO_
SETTLE_TICK`(6828) as a clean extension boundary - at that point the
healthbox slide-in through Sitrus/settled-menu (§8e/§2/§3e, all still
fully spec'd, untouched by this session) is the only remaining unexplored
territory in the whole faint/forced-switch sequence.
