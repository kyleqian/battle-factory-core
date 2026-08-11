# Turn 11 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only)

Ground-truth dossier for battle 1's turn 11 (Onix vs. PIDGEOTTO, both still on
their turn-6/7/8/9/10 sides) **on the winning line**: extends `tools/compare/
traces-groundtruth/battle1-turn10-dense.json`'s own committed script verbatim
with `battle1-winline-b-swap.json`'s own segments[90:94] (the turn-11
FIGHT-submenu-open, move-confirm — **zero navigation presses**, cursor
still resting on ROCK_SLIDE — and the 1000-frame resolution-idle) — exactly
the 4-segment span `docs/turn10-notes.md` §7 predicted, tick-for-tick
(13306-14340). **Groundwork only — no engine code, no `src/` changes**, per
this session's worktree brief. All frame ticks are this dossier's own
absolute numbering, shared with `battle1-turn6/7/8/9/10-dense.json`/
`battle1-winline-*.json` (verified directly below, not assumed).

**Headline, stated up front**: **falsifiable test 1 — the ATK-floor "won't
go any lower!" message — finally fires positive this turn**, four turns
after Onix's ATK stage was floored at 0 (`docs/turn8-notes.md`) and after
two turns (9, 10) where Pidgeotto's AI simply didn't reselect FEATHER_DANCE.
This turn it does: `gCurrentMove` reads 297 (FEATHERDANCE), FEATHER_DANCE's
own PP decrements 12/15→11/15 (**the move genuinely fires and consumes PP**,
RAM-confirmed), Onix's ATK stage stays RAM-flat at **0** throughout, and the
PNG reads directly: **"ONIX's ATTACK\nwon't go lower!"** — `sText_
StatsWontDecrease` (`reference/pokeemerald/src/battle_message.c:111`),
verbatim. Onix's own ROCK_SLIDE then hits Pidgeotto for the second half of
the turn, **bit-for-bit matching both published lines' turn-11 rows** a
third consecutive turn (`battle-turn-notes.md` §14: `14→14` / `38→16 (−22)`;
§15: identical HP deltas) — see §4's own note on a PP-count discrepancy
between this line and §14's. A second, unplanned finding falls out of this
turn's own structure: the "unattributed RNG step" that recurred in turns
9-10 **does not fire at all this turn** — its absence, cross-checked against
a still-present secondary-effect roll in its normal position, sharpens
falsifiable test 3 concretely (§3). Pidgeotto's own healthbar crosses
yellow→red for the first time in this sub-chain, tightening the zone
threshold estimate against turn 9's own single Onix data point (§5).

Sources: `reference/pokeemerald/src/battle_message.c` (`sText_
StatsWontDecrease`, `sText_SuperEffective`), `src/data/gen/{moves,
type-effectiveness}.json`, `docs/turn10-notes.md` §3/§7 (this turn's own
predicted span and the unattributed-step ledger this session's own null
result sharpens), `bin/oracle symbols`. Oracle probes: `tools/probe/
ram-probe.py` + `tools/probe/dump-battler-full.py` + `tools/probe/
dump-battle-bars.py` (all pre-existing, reused unchanged) plus a new watch
spec, `tools/probe/specs/turn11-rng-watch.json` (committed, identical
column set to `turn10-rng-watch.json`). New committed trace: `tools/
compare/traces-groundtruth/battle1-turn11-dense.json`.

## 1. Prefix-consistency verdict: turn10-dense.json + winline-b-swap[90:94] IS a verbatim, pixel-exact extension

Checked programmatically, at the same levels turns 6-10 used:

- **Full per-frame equality**: flattened both the extended 96-segment
  script (turn10-dense.json's own 92 segments + winline-b-swap.json's own
  segments[90:94]) and `battle1-winline-b-swap.json`'s own full 156
  segments to per-tick button state for all 14340 shared ticks —
  **0 diffs**, `combined == wl[:14340]` checked directly.
- **Press-event equality**: 42 press events in the extended script, all
  matching `winline-b-swap.json`'s own first 42, index-for-index — **0
  mismatches**.
- **Pixel cross-check**: a spot-check `bin/oracle run` of `battle1-
  winline-b-swap.json` with `captureFrames` restricted to 12 of this
  dossier's own committed tick numbers (13306, 13340, 13350, 13372, 13453,
  13528, 13555, 13740, 13758, 13782, 13897, 14340 — spanning the pre-open
  baseline, the confirm-press transient, the FEATHER_DANCE accuracy roll,
  the "won't go lower" message settle, both ROCK_SLIDE roll ticks, the
  healthbar color-crossing tick, the HP-commit tick, the "super effective"
  settle, and the turn-12 resettle) produced **byte-identical sha256 at
  every one of the 11 ticks that fall inside this dossier's own committed
  `captureFrames` set** against this dossier's own committed trace (tick
  13782 isn't in this dossier's own capture set, so wasn't cross-checkable
  — not a mismatch, simply not captured here).

**Verdict: the composite script reproduces the real winline chain's pixels
exactly**, confirming `turn10-notes.md` §7's own prediction directly, not
just re-asserted.

## 2. The committed trace

`tools/compare/traces-groundtruth/battle1-turn11-dense.json`: 96 segments,
14340 frames total (`turn10-dense.json`'s 92 segments + `battle1-winline-b-
swap.json`'s own segments[90:94] verbatim — the turn-11 submenu-open `A`,
30f settle, confirm `A` with **no** navigation press, and the full
1000-frame resolution-idle). 256 `captureFrames` (the oracle's per-trace
cap, hit exactly), dense (stride-1) over six windows bracketing every
RAM-confirmed transition this turn — submenu-open/settle (13296-13313),
the confirm-press transient into FEATHER_DANCE's kickoff-text-typing
(13334-13372, covering the accuracy roll), the "won't go lower" message's
own transition/typing/settle (13413-13453, the headline test), the
transition into ROCK_SLIDE's own kickoff (13519-13557, covering the
accuracy/crit/spread rolls), the ROCK_SLIDE impact/HP-drain/healthbar-
crossing/effectiveness-message window (13734-13772), and the turn-end/
turn-12-menu-resettle window (13859-13897) — plus sparse representative
sampling of the uneventful holds (the FEATHER_DANCE-kickoff-to-stat-message
gap, the stat-message-to-ROCK_SLIDE-kickoff gap, the ROCK_SLIDE animation
loop, the settled "super effective" text, and the turn-12 menu's own idle
cycle out to tick 14340), matching turns 6-10's own "boundary +
representative sampling, not exhaustive stride-1 over pure animation-hold"
convention. **Twice-run byte-identical**: `bin/oracle run`, two independent
runs, manifests (256/256 captures) diffed identical, 0 sha mismatches.

## 3. RNG-consumption ledger for turn 11 (RAM-truthed, LCG-step-counted)

`gRngValue` (`0x3005d80`) sampled every tick 13200-14340 via `ram-probe.py`.
Entering this turn, `gRngValue` is flat at **`1753916210`** (matches
`turn10-notes.md` §3's own final settled value) — zero `Random()` calls
consumed by this turn's own zero navigation presses, the fourth turn
running confirming that rule.

| tick | steps | value after | attribution |
|---|---|---|---|
| 13350 | 1 | `2876053693` | Pidgeotto's **FEATHER_DANCE accuracy roll** (`accuracy: 100`, `EFFECT_ATTACK_DOWN_2`, `src/data/gen/moves.json`) — a 100%-accuracy, non-`EFFECT_ALWAYS_HIT` move still rolls, matching turn 9's own QUICK_ATTACK note; **no crit/spread roll follows** — FEATHER_DANCE deals no damage, so this move consumes exactly 1 `Random()` call total, the fewest of any move resolution in this dossier's arc so far |
| 13528 | 1 | `1512799980` | Onix's **ROCK_SLIDE accuracy check** (acc=90) — **hits**; fires **5 ticks** after `gCurrentMove`→157 (13523), matching turns 6/7/9/10's own ROCK_SLIDE-specific offset exactly |
| 13552 | 1 | `3149484783` | ROCK_SLIDE's **crit roll** — fires **24 ticks** after its own accuracy roll, bit-for-bit the same offset as turns 6/7/9/10 |
| 13555 | 1 | `956793398` | ROCK_SLIDE's **damage-spread roll**; `gBattleMoveDamage` locks to **22** this same tick (intermediate values 8→24→22 over ticks 13553-13555) — **3 ticks** after the crit roll, again matching turns 6/7/9/10's own offset exactly |
| 13848 | 1 | `4255335793` | ROCK_SLIDE's **secondary-effect roll** (30% flinch chance) — fires **293 ticks** after the spread lock (13555→13848), matching turns 6/7/9/10's own ~292-300-tick gap for this event almost exactly; **moot this turn**: Pidgeotto already acted (it moved first), so a successful flinch roll has no target left to flinch — identical shape to turns 9-10. **See the note below: this is NOT the "unattributed step" turns 9-10 flagged** — that step does not occur this turn at all |
| 13858 | 1 | `605249424` | turn-pass bookkeeping (`gRandomTurnNumber`) — same tick `gBattleMainFunc` begins settling back toward its resting value |
| 13865 | 5 | `3813709783` | opponent-AI next-move-scoring cluster, same "...5" tail shape as every prior turn |

**Total: 11 `Random()` calls this turn** across 7 distinct events — 2 fewer
events and 2 fewer steps than turn 10's 13/9, entirely accounted for by
FEATHER_DANCE consuming only 1 roll (no crit/spread, since it deals no
damage) where turn 10's AERIAL_ACE consumed 2, **and by the complete
absence of the "unattributed step"** (see below) rather than any change in
ROCK_SLIDE's own resolution, which is bit-for-bit the same 3-roll shape as
every prior turn. `gRngValue` stays flat from tick 13865 through this
trace's own final tick 14340 (RAM-checked directly) — the turn-12 menu is
again a genuine RNG-free rest.

### A genuinely new data point on the unattributed step: it does NOT fire when the turn's first move deals no damage

Turns 9 and 10 both recorded a single-step "unattributed" `Random()` call
sitting strictly between the first move's own HP-commit and the second
move's own `curMove` update — in both cases the *first* move that turn
(QUICK_ATTACK, then AERIAL_ACE) was a damaging hit with its own HP-drain
event. This turn, Pidgeotto's first move (FEATHER_DANCE) deals **no**
damage — no HP-commit, no drain animation — and the RAM ledger shows
**zero** `Random()` calls anywhere in the 178-tick span between
FEATHER_DANCE's own accuracy roll (13350) and ROCK_SLIDE's own accuracy
roll (13528), checked directly against the full per-tick `gRngValue`
sample (only the two accuracy-roll ticks themselves show a change; nothing
in between). The single step that *does* appear later this turn (13848)
lines up almost exactly with the already-known **secondary-effect roll**
position (293 ticks after ROCK_SLIDE's own spread lock, vs. turns 6-10's
established ~292-300-tick gap for that specific event) — not with the
"9-ticks-before-next-curMove-update" or "14-ticks-before-next-accuracy-
roll" signature turns 9-10's own unattributed step carried (there is no
*next* move this turn for either offset to anchor to). Taken together, this
is a real, if still not source-grepped, narrowing: **the unattributed
step's call site most plausibly lives inside the resolution path of a
move that actually deals damage** (triggered off the HP-commit/drain-
completion event specifically), not a fixed per-turn or per-move-init
cost — turns 9-10 both happened to have a damaging first move, which is
why the step always looked "per-turn" until this turn's own FEATHER_DANCE
broke that pattern and made it vanish. Still not resolved to an exact
`battle_script_commands.c` call site (time-boxed, same as every prior
session) — flagged as a sharpening, not a resolution, matching this
dossier's usual convention.

## 4. Turn order, battler stats, and the three standing falsifiable tests (RAM-confirmed)

`gBattlerAttacker` flips **0→1 at tick 13344** (Pidgeotto acts first, the
same 1-point Speed margin as every prior turn — FEATHER_DANCE carries no
priority, `priority: 0`, `src/data/gen/moves.json`, so this is a pure
Speed-order turn). `gCurrentMove` reads **297 (FEATHERDANCE)** at 13345,
resets to 0 at 13522, then reads **157 (ROCK_SLIDE)** at 13523 with
`gBattlerAttacker` back to 0 (Onix) and `gBattlerTarget` at 1 (Pidgeotto,
set at 13521). Battler snapshots (ticks 13306 pre-turn / 14340 post-turn,
full struct via `dump-battler-full.py`, cross-checked with a mid-turn
snapshot at 13521):

| | ONIX (battler0) | PIDGEOTTO (battler1) |
|---|---|---|
| atk/def/spd/spA/spD | unchanged from turn 10 | unchanged from turn 10 |
| moves (id) / PP before → after | ROCK_SLIDE(157) **2/10 → 1/10 (9th use, not yet exhausted — see the PP note below)**, BIND(20) 19/20 (unchanged, unused since turn 8's miss), DRAGON_BREATH(225) 19/20 (unchanged), SANDSTORM(201) 10/20 (unchanged) | AERIAL_ACE(332) 19/20 (unchanged — not reused), QUICK_ATTACK(98) 29/30 (unchanged — not reused), FEATHER_DANCE(297) **12/15 → 11/15 (1st use since turn 7)**, SAND_ATTACK(28) 15/15 (unchanged) |
| HP before → after | 14 → **14 (unchanged — FEATHER_DANCE deals no damage)** | 38 → **16 (−22)** |
| ATK stat stage before → after | **0 → 0 (unchanged — FEATHER_DANCE's own attempt is blocked by the floor, 4th turn running at 0)** | 6 → 6 (unchanged — FEATHER_DANCE targets the opponent, not the user) |
| item | 0 (none) | 180 (`ITEM_WHITE_HERB`, unchanged — still doesn't trigger; White Herb restores *lowered* stats, and Onix's own ATK was never actually lowered this turn since it was already floored, so there is nothing for it to restore) |
| status2 (wrap/trap flags) | 0 (unchanged) | 0 (unchanged) |

### All three standing falsifiable tests: test 1 flips POSITIVE this turn; tests 2-3 remain negative

- **Test 1 ("won't go any lower!" on a FEATHER_DANCE against Onix's floored
  ATK): POSITIVE, first time this arc.** Pidgeotto's AI selects
  **FEATHER_DANCE** for the first time since turn 7 (turns 9-10 both
  reselected a damaging move instead) — the first opportunity since the
  floor was reached at turn 8 for this exact interaction to occur, and it
  does. **RAM**: `gCurrentMove` reads 297; FEATHER_DANCE's own PP
  decrements 12/15→11/15 (the move fires and is charged its PP despite
  having no effect); Onix's `atkStage0` stays RAM-flat at **0** across the
  entire probed window, no write event. **Pixel**: the message box reads
  **"ONIX's ATTACK\nwon't go lower!"** (§5), matching `sText_
  StatsWontDecrease` (`reference/pokeemerald/src/battle_message.c:111`,
  `"{B_DEF_NAME_WITH_PREFIX}'s {B_BUFF1}\nwon't go lower!"`) verbatim, not
  the ordinary "Foe PIDGEOTTO's FEATHERDANCE lowered ONIX's ATTACK!" stat-
  drop message any of turns 6-7's own FEATHER_DANCE uses produced (not
  independently re-confirmed this session what that ordinary message reads
  — turns 6-7's own dossiers didn't PNG-cite it either — but its absence
  here is the operative fact). **Pinned mechanism for the engine slice**:
  a stat-lowering move's effect script still consumes its `Random()`
  accuracy roll and its own PP even when the target's relevant stat stage
  is already at the floor (0) or ceiling (12) — the floor/ceiling check
  happens *after* the accuracy roll, inside the stat-change effect itself,
  and substitutes the "won't go lower/higher" message for the normal one
  rather than skipping the move's resolution entirely.
- **Test 2 (BIND actually hitting)**: Onix's AI selects **ROCK_SLIDE**, not
  BIND, a third turn running since turn 8's miss. `status2_0`/`status2_1`
  RAM-flat 0 the entire turn, confirmed directly. Still entirely
  unexercised in this dossier chain.
- **Test 3 (the unattributed-RNG-step call site)**: **does not recur this
  turn at all** (§3) — a genuine negative result, not a repeat positive,
  and the specific *reason* it doesn't recur (this turn's first move deals
  no damage) is itself the most concrete narrowing this test has received
  across turns 9-11. Still not grepped to an exact source call site.

### PP note: this line's own ROCK_SLIDE count diverges from `battle-turn-notes.md` §14's published table, as expected

§14's own "always ROCK_SLIDE" line used ROCK_SLIDE at turn 8 too (this
dossier's own committed line substituted BIND there instead, per
`turn8-notes.md`), so §14's own turn-11 row reads "PP 10→0" while this
session's RAM shows **2/10 → 1/10** — a 1-PP offset that has held constant
since turn 8 and is not a discrepancy, just the two lines' own diverging
histories (`turn10-notes.md` §7 already flagged turn 12, not 11, as this
line's own actual PP-exhaustion boundary; this session's own RAM directly
confirms 1/10 remains after turn 11, exactly as predicted).

### Damage: ROCK_SLIDE hits, matching both published ledgers exactly (38→16/−22); Onix untouched (14→14)

`gBattleMoveDamage` locks to **22** (ROCK_SLIDE, tick 13555). `hp1`
(Pidgeotto) drops 38→16 at tick 13758 (1-tick-lag rule holds: done-sentinel
at 13757, stat commit at 13758). `hp0` (Onix) never changes — FEATHER_DANCE
deals no damage. Both numbers are exact matches to `battle-turn-notes.md`
§14's own turn-11 row (`14→14` / `38→16 (−22)`) **and** §15's own turn-11
row (`14→14 (0)` / `38→16 (−22)`) — the third consecutive turn both
independently-derived published lines land on bit-identical HP outcomes,
extending `turn10-notes.md`'s own headline finding one more turn.
ROCK_SLIDE vs. Pidgeotto's `TYPE_FLYING` remains **super effective** (2×,
the same match-up turns 6/7/9/10 already established), PNG-confirmed via
`sText_SuperEffective` (§5).

## 5. Pixel/window boundaries (sha256-cited, `battle1-turn11-dense.json`, twice-run identical)

All frame numbers are this dossier's absolute tick numbering. sha256 shown
truncated to 12 hex chars for table width. Every text-content label below
is **PNG-read**, not inferred from RAM or `data/gen/moves.json` alone.
Every span below was diffed at every captured tick before being called
static, matching turns 9-10's own discipline.

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| turn-11 settled menu persists (pre-press baseline) | 13296-13302 | `63e2d272402d` | same single-tick idle-bob blip `turn10-notes.md` §5 itself cited at tick 12900 (identical sha) — confirms this dossier's own tick numbering lines up exactly with turn 10's; the plateau resumes to `e28bc5375a15` at 13303 |
| FIGHT submenu open animation settled, cursor **already on ROCK_SLIDE** (**zero navigation presses this turn**) | 13303-13313 | `e28bc5375a15` (13303-13311), `528d4d92a33e` (13312-13313) | **PNG-read** at 13312: ▶ROCK SLIDE/BIND/DRAGONBREATH/SANDSTORM, PP **2/10**, TYPE/ROCK — RAM: `cursor0`=0 flat for the entire probed window, same cursor-persistence finding as turns 9-10 |
| move confirmed (`A` held 13339-13340), press-transient window | 13334-13351 | `5fde8dda3e7c` (13334-13340), `528d4d92a33e` (13341-13351) | the settled-submenu sha (`528d4d92a33e`) recurs after the confirm press — the screen stays visually identical to the pre-confirm plateau for **11 more ticks** even though `gBattlerAttacker`→1 and `gCurrentMove`→297 land inside this same window (13344-13345) — RAM update and pixel transition are not simultaneous, same rule turns 9-10 established |
| FEATHER_DANCE kickoff text typing in | 13352-13388 | (letter-by-letter, no single sha) | **PNG-read** at 13372 (mid-typing) and settled by 13389: "Foe PIDGEOTTO used\nFEATHERDANCE!" |
| FEATHER_DANCE kickoff text fully visible, held | 13389-13421 | `492ccf070e80` | **PNG-read**: "Foe PIDGEOTTO used\nFEATHERDANCE!" — no animation/sprite-movement this turn (static sha across the whole 33-tick hold). **[RATIONALE CORRECTED 2026-07-20, supervisor fold]** the original "no attack-animation precedent for non-damaging moves" reasoning contradicts turns 6-8, where FEATHER_DANCE demonstrably plays its ~270-tick feather/starburst animation whenever the stat change LANDS (kickoff holds ~7358-7658 in turn 6, same shape turns 7/8). The correct mechanism: with ATK already at the floor, the blocked stat change short-circuits the battle script BEFORE its animation step — the 33-tick hold here vs ~290-tick holds in turns 6-8 is the signature. The turn-11 engine slice must key the animation on effect-success, not on move class |
| message-box transition into the ATK-floor message | 13422-13448 | (letter-by-letter, no single sha) | **PNG-read** at 13440 (mid-typing, "ONIX's ATTACK\nwon't"): the move to **"won't go lower!"**, not a stat-drop message, is visible well before the text finishes typing |
| **"ONIX's ATTACK\nwon't go lower!" fully typed, holds — the headline finding** | 13449-13529 | `82aa7ca871df` | **PNG-read** at 13453/13460/13528: "ONIX's ATTACK\nwon't go lower!" — matches `sText_StatsWontDecrease` verbatim (§4); this plateau holds **80 ticks**, through Onix's own `gBattlerTarget`/`gCurrentMove` updates (13521-13523) and ROCK_SLIDE's own accuracy roll (13528) — all silent under the still-static text, same "RNG rolls don't need a pixel change" rule as every prior turn |
| message-box transition into "ONIX used\nROCK SLIDE!" | 13530-13548 | (letter-by-letter, no single sha) | **PNG-read** at 13540 (mid-typing) |
| "ONIX used\nROCK SLIDE!" fully typed, holds through crit/spread rolls | 13549-13557 | `aa0bf4647996` | **PNG-read**: "ONIX used\nROCK SLIDE!" — RAM: crit roll (13552) and spread roll (13555, `gBattleMoveDamage`→22) both resolve silently under this already-static text |
| ROCK_SLIDE kickoff text holds through the impact animation | 13558-~13736 | `aa0bf4647996` → animation frames → `aa0bf4647996` again at 13734 | **PNG-read**: "ONIX used\nROCK SLIDE!" fully typed throughout; rock-prop animation over Pidgeotto's own sprite region, same shape turns 9-10 established — the animation loop completes and the frame returns to the exact same kickoff-text sha (`aa0bf4647996`) right as the HP-drain begins (13734), an exact-sha round-trip not seen this precisely in prior turns' tables |
| HP-drain (Pidgeotto) + **healthbar color-zone crossing — new to this sub-chain** | 13734-13757 | `aa0bf4647996` (13734-13736) → `27ca305dbfa8` (13737-13739, still yellow) → `579f9eae60b7` (13740+, **now red**) → ... → `aeb115ac712f` (13756-13761, drain done) | RAM (`dump-battle-bars.py`): sentinel `-32768` at 13734, flat 1-HP-unit-per-tick counter 37→16 over 13735-13756, done-sentinel `0` at 13757; `gBattleMons[1].hp` commits 38→16 **1 tick after** (13758), same commit-lag rule. **Direct pixel-color read (PIL)**: Pidgeotto's own healthbar is `(206,173,8)` (yellow) through bar-value 33 (tick 13739, 33/156=21.2%) and `(173,66,74)` (red) from bar-value 32 onward (tick 13740, 32/156=20.5%) — the **first healthbar zone crossing for Pidgeotto in this 6-11 sub-chain** (it stayed yellow all of turns 9-10), and the crossing point (20.5%-21.2%) lands almost exactly on `turn9-notes.md`'s own single Onix data point (crossed to red at exactly 20.5%), tightening rather than contradicting that estimate |
| message-box transition into "It's super effective!" | 13762-13786 | (letter-by-letter, no single sha) | **PNG-read** at 13767 ("It's s...", typing) |
| "It's super effective!" text holds | 13787-13857 | `6ccb690b57b3` | **PNG-read** at 13800/13850: "It's super\neffective!" — matches `sText_SuperEffective` exactly; this sha is byte-identical to the spot-check capture of `battle1-winline-b-swap.json` at tick 13782 (§1), confirming both traces render this message identically |
| secondary-effect/turn-end, text clears, turn-12 menu reopens | 13858 (text starts clearing) → 13858 (RAM: turn-pass RNG step) → 13866-13897 (settled) | `cf34cbe53962` (13859-13865), `a173d834997e`/`55822ddf41b2`/`1b57eb51635c` (transition sub-frames), `db251fad6c61` (13895-13898) | **PNG-read** at 13897: "What will ONIX do?" — same layout as `battle1-turn10-dense.json`'s own turn-11-baseline capture at tick 13306 (sha `e28bc5375a15`), but **not** byte-identical to it (13897's own sha is `db251fad6c61`, different from 13306's) — expected, not a bug: Pidgeotto's own HP/healthbar reads 16/156 here vs. 38/156 at turn 10's own equivalent tick, so the two frames genuinely differ |
| turn-12 menu idle, cycling through a slow multi-frame idle animation (not perfectly flat) | 13898-14340 | cycles among `db251fad6c61` / `1b57eb51635c` / `55822ddf41b2` at ~70-175-tick intervals | **not** a single-tick blip like tick 13296's own idle-bob — a longer, multi-plateau cycle; RAM stays flat throughout (re-checked directly, no `Random()` calls, no watched-field writes), so this is a purely cosmetic idle loop, not a new mechanism — **not itemized to an exact period or source function this session** (time-boxed), flagged as an open note rather than resolved |

## 6. New-to-turn-11 mechanism inventory

- **The ATK-floor "won't go any lower!" message (`sText_StatsWontDecrease`)
  — PINNED this turn, falsifiable test 1 resolved positive.** A
  stat-lowering move against an already-floored stat still rolls its own
  accuracy `Random()` call and still charges its own PP, but the actual
  stat mutation is silently blocked and the dedicated "won't go
  lower!" message substitutes for the ordinary stat-drop message.
  Engine-slice-relevant: the stat-stage model needs an explicit
  floor/ceiling check *inside* the stat-change effect handler (after
  accuracy, before the stage write + message selection), not a
  precondition that skips the move's resolution outright — PP still
  needs to decrement even on a fully "no-op" stat-lowering use.
- **The unattributed-RNG-step's absence when the turn's first move deals
  no damage** — a new, clarifying negative result (§3), not a positive
  mechanism; the strongest lead yet on test 3's call site (tied to a
  damaging move's own HP-commit path), still not source-grepped to an
  exact line.
- **Pidgeotto's healthbar crosses the yellow/red threshold** (§5) — not a
  new mechanism (the color-zone system itself was already flagged new in
  `turn9-notes.md`), but the first data point for *this* mon's own
  crossing, tightening the estimated threshold to 20.5%-21.2% (bracketing
  turn 9's own single 20.5% Onix data point from the *other* side).
- **No new status2/item-trigger mechanism this turn** — BIND remains
  unexercised; White Herb still has nothing to restore (§4).

## 7. Turn 12+ boundaries (noted, not densely probed — out of scope this session)

- Turn 12's action-select menu is settled by tick **13897** (§5), matching
  RAM-flat 13866-14340 (re-checked directly) — the natural starting point
  for a future turn-12 scout.
- `battle-turn-notes.md` §15's own line (the closest published match to
  this dossier's own committed b-swap line) has turn 12 as **ROCK_SLIDE
  (miss, 10th/last PP)**, `14→4 (−10)` / `16→16 (0)` — i.e. turn 12 is
  where ROCK_SLIDE's own PP finally hits 0 (1/10 → 0/10, consumed whether
  it hits or misses) **and** where the published line records a miss, not
  a hit — the first ROCK_SLIDE miss since turn 8's own BIND miss in this
  dossier's specific committed line. A future turn-12 scout should
  RAM/pixel-verify this, not assume it — this dossier's own turn-9/10/11
  reconvergence streak has held for three turns running but is not
  guaranteed to continue past a PP-exhaustion boundary, which is exactly
  the kind of turn where move-selection logic (a forced switch off
  ROCK_SLIDE once PP hits 0, per `battle-turn-notes.md` §14's own
  PP-exhaustion finding) could plausibly diverge the two lines for the
  first time.
- `battle1-winline-b-swap.json`'s own segments[94:98] (need to confirm the
  exact slice once turn 12's own script is known — this session did not
  extend that far) is the natural next span to extend for a turn-12 scout,
  following this session's own 4-segment-per-turn convention.
- Onix's ATK stage remains at the floor (**0**) entering turn 12, unused a
  fourth turn running — falsifiable test 1 is now resolved positive, so
  there is nothing further to watch for on this specific test, though a
  *second* independent occurrence (confirming it's not a one-off) would
  still be a nice-to-have.
- Pidgeotto's own healthbar is now **red** entering turn 12 (16/156=10.3%),
  matching Onix's own already-red bar (14/117=12.0%) — **both combatants'
  bars are now in the red zone simultaneously for the first time** in this
  sub-chain, worth flagging for whoever picks up the next turn (a possible
  visual/audio "danger" cue in the real game neither this nor any prior
  session in this arc has checked for).

## Verification

`npm test` and `npm run build` green (no `src/` changes this session — the
only additions are `tools/compare/traces-groundtruth/battle1-turn11-dense.json`,
`tools/probe/specs/turn11-rng-watch.json`, and this doc, per the worktree
brief's constraint). Trace twice-run via `bin/oracle run`, manifests
(256/256 captures) byte-identical across two independent runs, 0 sha
mismatches. RAM probes (`ram-probe.py`, `dump-battler-full.py`,
`dump-battle-bars.py`) each run and their outputs cross-checked internally
(LCG step counts recomputed programmatically from raw values; healthbar
drain counters cross-checked against the authoritative `gBattleMons[].hp`
commit ticks). Cross-check against the already-committed `battle1-winline-
b-swap.json` (11 spot-checked ticks plus a full 14340-tick per-frame
button-state diff, §1) byte-identical. Healthbar color-zone RGB values
were read directly via pixel sampling (PIL), not inferred from HP numbers
alone. Every sha256 cited in §5's table was independently re-read from
this session's own committed trace's own first-run manifest at exactly
the cited tick before being written into the table, per the brief's own
double-check instruction (both prior dossiers had exactly one sha-citation
slip caught in supervisor verification).

## 2026-07-21 addendum (bounded-worker probe session): both halves
ground-truthed as parameterizations of already-shipped code — ONE
genuinely new mechanism found (the ATK-floor message's own dispatch +
delay), everything else reduces to a fresh `pressTick`/constant

Per this session's own worktree brief, ground-truthed turn 11's FEATHER_
DANCE half (blocked by Onix's floored ATK) and ROCK_SLIDE half against the
real, unmodified `turn6FeatherSprites`-family (`src/engine/featherDance.ts`)
and `rockSlide*` (`src/engine/battleMenu.ts`) functions, hunting 0-RAM/
0-pixel-mismatch. **No `src/` changes.** Every fact below is re-derived
fresh this session (fresh `dump-feather-dance-sprites.py` /
`dump-rockslide-sprites.py` / `dump-rockslide-slot-order.py` /
`dump-battle-bars.py` RAM probe runs, a one-off Pidgeotto-sprite-`y2` RAM
probe via `ram-probe.py`'s generic `path` feature, plus fresh `bin/oracle
run` pixel captures over HTTP, twice-run for the committed verify script) —
`turn11-notes.md`'s own prose ranges above were treated as leads, not
truth, per the standing rule. New committed tool:
`tools/probe/verify-turn11.ts` — pixel-only (RAM facts cross-cited below,
not re-asserted in the script, same convention `verify-turn10-rockslide.ts`
established) — **52/52 checks pass** against a fresh capture, twice-run
identical.

### 1. ROCK_SLIDE half: a single synthetic `pressTick=13137` reproduces EVERY sub-mechanism bit-for-bit, matching turn 10's own methodology exactly

`rockSlideBg3Y`/`rockSlideRockState`/`rockSlideDrawOrder`/
`rockSlideMonShakeY2`/`rockSlideHealthboxWobbleY2`/`rockSlideMonBlinkInvisible`/
`rockSlideOpponentHp`/`rockSlideTextStartTick` are all pure
`(t, pressTick[, ...])` functions, already reused unchanged across turns
3/5/6/7/9/10. This session fit `pressTick=13137` against fresh RAM/pixel
data and it satisfies **every one** of the file's already-published delay
constants simultaneously:

| constant (from `battleMenu.ts`, unmodified) | formula | predicted tick | fresh RAM/pixel tick | verdict |
|---|---|---|---|---|
| `ROCK_SLIDE_TEXT_DELAY`(393) | `pressTick+393` | 13530 | 13530 (fresh oracle capture's own first tick of the "ONIX used ROCK SLIDE!" box transition — `sha(13529)≠sha(13530)`, pixel-confirmed) | **CONFIRMED**, exact |
| `ROCK_SLIDE_RAM_ANCHOR_DELAY`(428) | `pressTick+428` | 13565 | 13565 (`dump-rockslide-sprites.py`: first live rock AND first live shake sprite both appear this RAM tick) | **CONFIRMED**, exact |
| `ROCK_SLIDE_MON_SHAKE_START_DELAY`(443)/`_END_DELAY`(536) | `pressTick+443`/`+536`, render = RAM+1 | 13580/13673 | 13579/13672 raw RAM (one-off `ram-probe.py` path probe chasing `gBattlerSpriteIds[1]`→sprite→`y2`: period-4 `[5,5,0,0]` pattern, matches the formula exactly once the standard +1 render lag is applied — recomputed directly, not eyeballed) | **CONFIRMED**, exact |
| `HIT_FLASH_RAM_ANCHOR_DELAY`(562) | `pressTick+562` | 13699 | 13699 (`dump-rockslide-sprites.py`: `blinkActive`/`healthboxWobbleActive` both first flip true this RAM tick) | **CONFIRMED**, exact |
| `ROCK_SLIDE_HP_DRAIN_START_DELAY`(597) | `pressTick+597` | 13734 | 13734 (`dump-battle-bars.py`: `bar1Curr` sentinel `-32768`) | **CONFIRMED**, exact |

**`rockSlideRockState`/`rockSlideDrawOrder` RAM-verified directly, not just
via the anchor ticks**: fed `pressTick=13137` into the real, unmodified
exported functions and diffed every prediction against
`dump-rockslide-sprites.py`'s own per-tick rock `x+x2,y+y2,animNum` reads
(336 RAM ticks, 13515-13850, 980 individual rock-sighting comparisons) —
**0 mismatches**. Went one step further than a same-tick alive-set check:
matched each RAM slot to its predicted `ROCK_SLIDE_ROCK_TABLE` index via
exact center-position identity, then cross-checked the **full background-
to-foreground draw-order sequence** (not just which rocks are alive) against
`dump-rockslide-slot-order.py`'s own real `sSpriteOrder` reads at every
multi-rock RAM tick (117 ticks) — **0 mismatches** on the complete ordered
sequence. Confirms turn 11 reuses the same 20-entry `ROCK_SLIDE_ROCK_TABLE`
and the same `SortSprites`-simulation draw-order logic bit-for-bit, same as
every prior turn.

Pidgeotto's own HP drain (38→16, sentinel@13734, flat counter 37→16 over
13735-13756, done-sentinel@13757) matches `rockSlideOpponentHp(t, 13137,
38, 16)` exactly, including the same "sentinel tick itself still reads
`startHp` unchanged, first decrement effective one tick later" rule
`turn10-notes.md`'s own addendum first caught (re-verified fresh here, not
assumed). Healthbar color-zone crossing (§5's own "20.5%-21.2%" bracket)
re-confirmed via `calcBarFilledPixels`/`pickHpBarBand`: 33/156 yellow,
32/156 red — pure math, no new code needed.

### 2. FEATHER_DANCE half: kickoff text is a pure parameterization; the feather-sprite animation is confirmed to NEVER FIRE this turn (RAM-verified, not just pixel-inferred)

`turn6FeatherDanceTextStartTick`/`turn6FeatherDanceTextVisibleChars`
(`battleScene.ts`, unmodified, the same functions turns 6/7/8 already use)
reproduce turn 11's own kickoff text (`FEATHER_PRESS_TICK=13339`, the REAL
A-confirm press tick — not synthetic, since this half is the player's own
move) pixel-exact at every one of 7 sampled reveal ticks (13352-13384) plus
the settled hold (13385-13421, sha `492ccf070e80`, matching the dossier's
own citation) — **0 mismatches**.

**The genuinely new RAM confirmation this session adds**: `dump-feather-
dance-sprites.py` (the same probe turns 6/7/8 used to build their own
per-turn `turnNFeatherSprites` probe tables) scanned all 8 `gFallingFeather
SpriteTemplate` OAM slots (3/4/7/8/9/10/11/12) across the ENTIRE kickoff
window (ticks 13330-13430, spanning the press through the full 33-tick
blocked-hold) and found **0 hits** for the feather template pointer
(`0x08596388`) anywhere in that window — every one of those 8 slots is
either unallocated or hosts an unrelated sprite the whole time. This is
direct RAM confirmation (not inferred from timing/pixel-hold-length alone)
of `turn11-notes.md`'s own §5 rationale correction: **the blocked stat
change genuinely short-circuits the battle script before the animation's
own `createsprite` calls ever execute** — there is no turn-11 feather
probe table to build (unlike turns 6/7/8, which each got their own),
because the mechanism this turn is "don't call `turn6FeatherSprites` at
all," not "call it with an empty/different table."

**Parameterization verdict for this half**: the kickoff-text half of
`drawTurn6/7/8FeatherDanceKickoffText` reuses unchanged
(`turn6FeatherDanceTextStartTick`/`turn6FeatherDanceTextVisibleChars`,
same text constants); the feather-sprite draw calls
(`drawTurn6FeatherSprites`) must be **skipped entirely** this turn — an
engine slice needs an explicit "effect blocked" branch that omits the
`drawTurn6FeatherSprites` calls, not a turn-11-specific empty probe table
(there's nothing to probe: the real hardware never creates the sprites).

### 3. The ATK-floor message: the ONE piece that is NOT pure reuse — a new dispatch branch + one new delay constant

Unlike every other mechanism this turn, the "ONIX's ATTACK\nwon't go
lower!" message has no existing analog to parameterize — turns 6-8's own
`drawTurn6/7/8FeatherDanceKickoffText` dispatchers always continue straight
into the ~270-tick feather/starburst animation + stat-fall banner once the
kickoff text finishes, because their own stat changes land. Turn 11's
doesn't (floored), so the real battle script substitutes this message
instead. Fresh-pinned this session, pixel-only (no RAM correlate needed,
same as every other message-text mechanism in this codebase):

- **Transition start**: tick **13422** exactly (`sha(13421)≠sha(13422)`,
  fresh-confirmed, matches `turn11-notes.md` §5's own citation exactly) —
  83 ticks past `FEATHER_PRESS_TICK` (13339), or equivalently 37 ticks past
  the feather-kickoff-text's own settle tick (13385). Pinned as
  `ATKFLOOR_TEXT_START_DELAY = 83` (relative to the SAME real press tick
  the feather kickoff text uses — no new anchor needed, just a new offset).
- **Text**: "ONIX’s ATTACK" / "won’t go lower!" (28 chars total) — the
  apostrophe is `’` (U+2019, `charmap.json` code 180), **not** ASCII `'`;
  this session's own verify script caught the wrong glyph on its first run
  (full box-region mismatch) before correcting it, same "let the check
  catch it" discipline `verify-turn10-rockslide.ts` used for its HP-bar
  assumption.
- **Reveal mechanism**: the plain generic `min(TOTAL, t-start+1)` cap
  (same shape `rockSlideTextVisibleChars`/every other kickoff-text formula
  in this codebase already uses) — settle lands exactly at `start+TOTAL-1`
  (13449) with **no extra lag**, unlike `turn6FeatherDanceTextStartTick`'s
  own sibling functions which include a "+1 past start+TOTAL" fudge in
  their own doc comments. Fresh-verified pixel-exact at 6 sampled reveal
  ticks plus the settled hold (13449-13529, 80 ticks, sha `82aa7ca871df`,
  matching the dossier's own citation) — 0 mismatches.
- **Engine-slice implication**: this needs one new two-line message-text
  constant pair + one new delay constant, dispatched from a NEW branch in
  the FEATHER_DANCE kickoff handler (triggered when the effect is blocked),
  reusing the same generic message-draw primitive (`drawMessageTextLines`)
  every other message in this codebase already uses — no new rendering
  primitive, no new text-reveal mechanism, just new content + new timing.

### 4. Turn-end → turn-12 menu boundary: matches `turn11-notes.md` §5's own citations, re-confirmed fresh

Turn-end text-clear (13859, sha `cf34cbe53962`) and turn-12 menu settle
(13897, sha `db251fad6c61`) both match §5's own citations exactly. The
turn-12 menu's own idle-bounce (§5's own "not perfectly flat, cycles among
3 shas" finding, itself following `turn10-notes.md`'s own correction for
its equivalent resting menu) re-confirmed at a sparse sample (14000 lands
on one of the three known cycle shas; 14340, the trace's own final tick,
lands back on the settled/resting sha) — the exact period/phase table is
still not bisected further this session (time-boxed, same open note §5
already flagged).

### What the turn-11 engine slice will need (per the brief's own ask)

- `TURN11_FEATHERDANCE_PRESS_TICK = 13339` (the real A-confirm press tick)
  for the kickoff-text half — `turn6FeatherDanceTextStartTick`/
  `turn6FeatherDanceTextVisibleChars` reused unchanged.
- An explicit "effect blocked, skip the feather-sprite draw calls" branch
  — RAM-confirmed the real hardware never creates the 8 feather sprites
  this turn, so this is a control-flow omission, not a new probe table.
- One new message-text pair + one new delay constant for the ATK-floor
  message (`ATKFLOOR_TEXT_START_DELAY = 83` past the same press tick,
  "ONIX’s ATTACK"/"won’t go lower!", U+2019 apostrophe), dispatched via the
  existing generic message-draw primitive.
- `TURN11_ROCKSLIDE_PRESS_TICK = 13137` (synthetic anchor, same convention
  as `TURN6_ROCKSLIDE_PRESS_TICK`/.../`TURN10_ROCKSLIDE_PRESS_TICK`) — every
  existing `rockSlide*` function reused unchanged, per §1's own table.
- Pidgeotto's own HP endpoints for `rockSlideOpponentHp`: `startHp=38,
  endHp=16`.
- Onix's own HP stays flat (14→14, FEATHER_DANCE deals no damage) — no
  drain overlay needed for Onix's own side this turn, simpler than turn 10.

### Named gaps (honest partial, not chased further this session — time-boxed)

- The mon-shake `y2` mechanism was RAM-verified via a disposable one-off
  probe (not a committed script) — a reusable, generic "battler sprite
  field" probe (parameterized battler index + field offset) would save the
  next session from re-deriving the same `gBattlerSpriteIds`→`gSprites`
  path chase from scratch; not built this session (out of scope).
- The turn-12 menu idle-bounce's exact period/phase table is still open
  (§4) — same gap `turn10-notes.md` §4 flagged for its own equivalent
  menu, still not resolved two sessions later.
- The ATK-floor message's own box-transition sub-frames (13422-13429, the
  multi-tick reveal-in before the first sampled 9-char tick) weren't
  densely diffed frame-by-frame — the 6-point reveal-tick sample plus the
  exact boundary ticks (13421/13422/13448/13449) is enough to pin the
  formula, but a full stride-1 sweep of that span wasn't run.

### Verification

`npm test` and `npm run build` green, unchanged this session (no `src/`
changes — only `tools/probe/verify-turn11.ts` (new) and this doc were
touched). `tools/probe/verify-turn11.ts`: **52/52 checks pass**, run twice
against fresh `bin/oracle` captures, identical both times. RAM probes
(`dump-feather-dance-sprites.py`, `dump-rockslide-sprites.py`,
`dump-rockslide-slot-order.py`, `dump-battle-bars.py`, plus a one-off
`ram-probe.py`-based mon-shake-`y2` path probe) each run fresh this
session; the rock-table/draw-order cross-checks against the real
`rockSlideRockState`/`rockSlideDrawOrder` functions were done via
disposable scratch scripts (not committed — the 0-mismatch results are
reported here, matching the "RAM facts cross-cited, not re-asserted in the
committed pixel-only script" convention `verify-turn9-postlunge.ts`/
`verify-turn10-rockslide.ts` already established).

### Proposed next-brief bullets

1. Wire turn 11's engine slice per §"What the turn-11 engine slice will
   need" above — this is now a pure wiring job for the ROCK_SLIDE half and
   the kickoff-text half of FEATHER_DANCE, plus one small new branch +
   constant pair for the ATK-floor message.
2. Build a reusable generic "battler sprite field" RAM probe (parameterized
   battler index + struct-field offset) so future mon-shake/sprite-state
   chases don't need a fresh one-off `ram-probe.py` path spec each time.
3. Bisect the turn-12 (and turn-11's own, and every prior resettled menu's)
   idle-bounce period/phase table exactly, if a future engine slice needs
   the *exact* frame content of the idle rather than just its known
   resting/cycling shas — a standing gap across at least two sessions now.
4. Turn 12 itself (`battle-turn-notes.md` §15's own predicted ROCK_SLIDE
   miss, PP 1/10→0/10, the first ROCK_SLIDE miss since turn 8's own BIND
   miss) is the natural next full-turn scout, per `turn11-notes.md` §7's
   own prediction — still needs RAM/pixel verification, not assumption.
