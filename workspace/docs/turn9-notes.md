# Turn 9 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only)

Ground-truth dossier for battle 1's turn 9 (Onix vs. PIDGEOTTO, both still on
their turn-6/7/8 sides) **on the winning line**: extends `tools/compare/
traces-groundtruth/battle1-turn8-dense.json`'s own committed script verbatim
with `battle1-winline-b-swap.json`'s own segments[80:86] (the turn-9
FIGHT-submenu-open, one `LEFT` press back onto ROCK_SLIDE, move-confirm, and
1400-frame resolution-idle) — cross-verified against `docs/turn8-notes.md`
§7 (which predicted this exact segment span, tick-for-tick) and `docs/
battle-turn-notes.md` §15 HEADLINE 2's own published table ("turn 9 |
10826-12272 | ROCK_SLIDE (hit) | 31→24 (−7) | 82→61 (−21)"). **Groundwork
only — no engine code, no `src/` changes**, per this session's worktree
brief. All frame ticks are this dossier's own absolute numbering, shared
with `battle1-turn6-dense.json`/`battle1-turn7-dense.json`/`battle1-turn8-
dense.json`/`battle1-winline-*.json` (verified directly below, not assumed).

**Headline surprise, stated up front**: the brief's pinned falsifiable test
("does a 4th FEATHER_DANCE trigger the 'won't go any lower!' message?") gets
a **negative result** — on this exact winning line, Pidgeotto's AI does
**not** reuse FEATHER_DANCE at turn 9. It switches to **QUICK_ATTACK**
instead (RAM- and pixel-confirmed below), exactly matching `battle-turn-
notes.md` §14's own independent "always ROCK_SLIDE" line's turn-9 entry
("QUICK_ATTACK (hit) | ROCK_SLIDE (hit) | 31→24 (−7) | 82→61 (−21)") —
**both published lines converge on an identical turn-9 outcome**, a genuine
finding in its own right (§3 explains the RNG mechanism that makes this
possible). Onix's ATK stage stays pinned at its turn-8 floor (0) all turn,
untested, and the "won't go any lower!" message remains open for a future
FEATHER_DANCE use.

Sources: `reference/pokeemerald/src/battle_message.c` (`sText_
NotVeryEffective`, `sText_SuperEffective`), `src/data/gen/{moves,
type-effectiveness}.json`, `docs/battle-turn-notes.md` §12 (the turn-2
"unattributed RNG step" this turn's own ledger cross-references), `bin/
oracle symbols`. Oracle probes: `tools/probe/ram-probe.py` +
`tools/probe/dump-battler-full.py` + `tools/probe/dump-battle-bars.py` (all
pre-existing, reused unchanged) plus a new watch spec, `tools/probe/specs/
turn9-rng-watch.json` (committed, mirrors `battle1-turn1-watch.json`'s own
column set plus `atkStage0`/`atkStage1`/`status2_0`/`status2_1`/`cursor0`
for this session's specific falsifiable-test and cursor-persistence needs).
New committed trace: `tools/compare/traces-groundtruth/battle1-turn9-
dense.json`.

## 1. Prefix-consistency verdict: turn8-dense.json + winline-b-swap[80:86] IS a verbatim, pixel-exact extension

Checked programmatically, not assumed, at the same two levels turns 6-8
used (the brief's own "flatten-and-compare" convention):

- **Press-event equality**: flattened both the extended 88-segment script
  (turn8-dense.json's own 82 segments + winline-b-swap.json's own
  segments[80:86]) and `battle1-winline-b-swap.json`'s own full 156
  segments to `(tick, buttons)` press-event lists (ignoring pure-idle
  segments). Every one of the extended script's 38 press events matches
  `winline-b-swap.json`'s own first 38, index-for-index — **0 mismatches**,
  and the extended events list is an exact prefix
  (`combined_events == wl_events[:len(combined_events)]` checked directly).
- **Full per-frame equality**: flattened both scripts to a per-tick button
  state for every one of the shared 12272 ticks (not just press events) —
  **0 diffs** across the entire window.
- **Pixel cross-check** (not required by the brief but cheap and decisive,
  same method turns 6-8 used): a spot-check `bin/oracle run` of
  `battle1-winline-b-swap.json` with `captureFrames` restricted to 12 of
  this dossier's own committed trace's tick numbers (10826, 10859, 10877,
  11001, 11018, 11103, 11135, 11337, 11360, 11400, 11444, 11450 — spanning
  the submenu reopen, both cursor positions, both kickoff texts, both
  accuracy/damage-lock ticks, both HP-drain commits, the effectiveness
  messages, and the turn-10 resettle) produced **byte-identical sha256 at
  every one** against this dossier's own committed trace's own capture of
  those same ticks.

**Verdict: the composite script reproduces the real winline chain's pixels
exactly.** This confirms `turn8-notes.md` §7's own prediction precisely:
"turn 9 reverts to ROCK_SLIDE (one `LEFT` press back from BIND's slot 1) —
`winline-b-swap.json`'s own segments[80:86]... is the natural next
6-segment span, mirroring this turn's own script shape exactly" — verified
directly against the actual committed file, not just re-asserted.

## 2. The committed trace

`tools/compare/traces-groundtruth/battle1-turn9-dense.json`: 88 segments,
12272 frames total (`turn8-dense.json`'s 82 segments + `battle1-winline-b-
swap.json`'s own segments[80:86] verbatim — the turn-9 submenu-open `A`,
30f settle, `LEFT` back onto ROCK_SLIDE, 10f settle, confirm `A`, and the
full 1400-frame resolution-idle). 256 `captureFrames` (the oracle's
per-trace cap, hit exactly, same as turn7-dense.json), dense (stride-1)
over eight windows bracketing every RAM-confirmed transition this turn —
submenu-open/cursor-on-BIND-persistence (10826-10836), the `LEFT`-press
cursor flip to ROCK_SLIDE (10857-10864), confirm+QUICK_ATTACK-kickoff-
text-typing (10869-10930), the QUICK_ATTACK impact/HP-drain/"not very
effective" message transition (10986-11020), the unattributed-RNG-step +
ROCK_SLIDE-kickoff transition + accuracy/crit/spread rolls (11092-11140),
the ROCK_SLIDE impact-animation tail (11265-11280), the ROCK_SLIDE
HP-drain/"super effective" message transition (11310-11342), and the
turn-end/turn-10-menu-resettle window (11431-11454) — plus sparse
representative sampling of the three long uneventful holds (the
QUICK_ATTACK animation loop, the settled "not very effective" text, the
mid-animation ROCK_SLIDE rock-prop hold, the settled "super effective"
text, and the turn-10 menu's own idle cycle out to tick 12272), matching
turn6/7/8's own "boundary + representative sampling, not exhaustive
stride-1 over pure animation-hold" convention. **Twice-run byte-identical**:
`bin/oracle run`, two independent runs, manifests (256/256 captures)
diffed identical, 0 sha mismatches.

## 3. RNG-consumption ledger for turn 9 (RAM-truthed, LCG-step-counted)

`gRngValue` (`0x3005d80`) sampled every tick 10800-12272 via `ram-probe.py`.
Step counts are verified LCG distances (`next = 1103515245*v + 24691 mod
2^32`), recomputed programmatically from the raw values (not tick-diff
guesses): entering this turn, `gRngValue` is flat at **`736484049`** (the
exact value turn8-notes.md §3's own final table row ended on — confirming
menu navigation itself, same as every prior turn, consumes zero `Random()`
calls, the same rule §11's own FIGHT-submenu ground truth established).

| tick | steps | value after | attribution |
|---|---|---|---|
| 10880 | 1 | `137378160` | Pidgeotto's **QUICK_ATTACK accuracy check** (`Cmd_accuracycheck`, acc=100 — still consumes a `Random()` call, same rule every prior turn pinned) — **hits** |
| 10915 | 1 | `178844963` | QUICK_ATTACK's **crit roll** |
| 10918 | 1 | `2159241818` | QUICK_ATTACK's **damage-spread roll**; `gBattleMoveDamage` locks to **7** this same tick (intermediate values 2→11→8→7 over ticks 10916-10918, the same multi-step STAB/type-multiplier decomposition turns 6/7 flagged) |
| 11094 | 1 | `2456294597` | **unattributed step** — occurs after Onix's own HP-drain finishes (11000) and before `gCurrentMove` updates to ROCK_SLIDE (11103); call site not identified this session either. **Cross-referenced, not new**: `battle-turn-notes.md` §12 flagged the identical shape at turn 2's own tick 3121 ("occurs after Onix's hp updates, before Grovyle's `gLastMoves[]` bookkeeping write; call site not identified"), and the gap from that unattributed step to the *next* move's own accuracy roll is **exactly 14 ticks in both cases** (3121→3135 in turn 2; 11094→11108 here) — a second, independently-timed data point for the same still-unresolved mechanism, now pinned as recurring specifically in turns where **both** combatants use a damaging move (turn 2: ENDEAVOR+DRAGON_BREATH; turn 9: QUICK_ATTACK+ROCK_SLIDE) and absent in turns where one side uses a non-damaging status move (turns 6-8, all FEATHER_DANCE-paired) |
| 11108 | 1 | `570637908` | Onix's **ROCK_SLIDE accuracy check** (acc=90) — **hits**; fires 5 ticks after `gCurrentMove`→157 at 11103, the same offset turns 6/7 both established for ROCK_SLIDE specifically |
| 11132 | 1 | `22512183` | ROCK_SLIDE's **crit roll** — fires 24 ticks after its own accuracy roll, bit-for-bit the same offset as turns 6 (7763→7787) and 7 (8797→8821) |
| 11135 | 1 | `3917059038` | ROCK_SLIDE's **damage-spread roll**; `gBattleMoveDamage` locks to **21** this same tick — 3 ticks after the crit roll, again matching turns 6/7's own offset exactly |
| 11427 | 1 | `797309433` | ROCK_SLIDE's **secondary-effect roll** (30% flinch chance) — fires 292 ticks after the spread lock, matching turns 6/7's own ~300-tick gap; **moot this turn**: Pidgeotto already acted (it moved first), so even a successful flinch roll has no target left to flinch |
| 11437 | 1 | `2647371128` | turn-pass bookkeeping (`gRandomTurnNumber`) — same tick `gBattleMainFunc` settles back to its resting value (`134463093`) |
| 11444 | 5 | `2970380319` | opponent-AI next-move-scoring cluster, same "...5" tail shape as every prior turn |

**Total: 14 `Random()` calls this turn** across 10 distinct events — more
than turns 6/7's 11 apiece, because this is **the first turn in the 6-9
arc where both combatants use a damaging move** (turns 6-8 always paired
one damaging move with FEATHER_DANCE or a miss, which skip the crit/spread
rolls entirely for the non-damaging or missed side). No `ShouldSwitch()`
2-step pair this turn either.

**Why both published lines land on an identical turn-9 outcome**: turn 8's
BIND (this line) and turn 8's ROCK_SLIDE (`battle-turn-notes.md` §14's
"always ROCK_SLIDE" line) **both missed** at turn 8 (turn8-notes.md §3),
and a miss short-circuits to the same reduced roll count (1 accuracy roll,
no crit/spread/secondary) regardless of which move is chosen — so both
lines exit turn 8 with the exact same `gRngValue`, `736484049`, confirmed
directly above. Turn 9 then plays out identically move-for-move on both
lines purely as a consequence of that RNG realignment, not a coincidence
of AI logic — a concrete, RAM-verified instance of the general rule §15
HEADLINE 2 established ("a different move... reshuffles the whole
downstream RNG stream"), here showing the reshuffle can also **cancel
out** when both alternatives consume equal RNG.

## 4. Turn order, battler stats, and the pinned falsifiable test (RAM-confirmed)

`gBattlerAttacker` flips **0→1 at tick 10876** (Pidgeotto acts first,
same 1-point Speed margin as every prior turn — **and** QUICK_ATTACK's own
`priority: 1`, confirmed in `src/data/gen/moves.json`, would have forced
this order even without the Speed edge; the first time this dossier's
6-9 arc has RAM-exercised a priority move, sharpening `battle-turn-
notes.md` §14's own prose rule with a direct measurement): `gCurrentMove`
reads **98 (QUICK_ATTACK)** at 10877, resets to 0 at 11102, then reads
**157 (ROCK_SLIDE)** at 11103 with `gBattlerAttacker` back to 0 (Onix).
Battler snapshots (ticks 10800 pre-turn / 12272 post-turn, full struct via
`dump-battler-full.py`):

| | ONIX (battler0) | PIDGEOTTO (battler1) |
|---|---|---|
| atk/def/spd/spA/spD | 51/187/76/36/72 (unchanged) | 98/61/77/56/56 (unchanged) |
| moves (id) / PP before → after | ROCK_SLIDE(157) **4/10 → 3/10 (resumes decrementing, exactly as turn8-notes.md §7 predicted)**, BIND(20) 19/20 (unchanged, unused this turn), DRAGON_BREATH(225) 19/20 (unchanged), SANDSTORM(201) 10/20 (unchanged) | AERIAL_ACE(332) 20/20, **QUICK_ATTACK(98) 30/30 → 29/30 (1st use)**, FEATHER_DANCE(297) 12/15 (unchanged — no 4th use this turn), SAND_ATTACK(28) 15/15 (unchanged) |
| HP before → after | 31 → **24** (−7, QUICK_ATTACK) | 82 → **61** (−21, ROCK_SLIDE) |
| ATK stat stage before → after | **0 → 0 (unchanged — pinned at turn 8's floor all turn)** | 6 → 6 (unchanged) |
| item | 0 (none) | 180 (`ITEM_WHITE_HERB`, unchanged — still doesn't trigger, no stat drop occurred this turn to restore) |

### The pinned falsifiable test: **NEGATIVE** — no 4th FEATHER_DANCE this turn, "won't go any lower!" not exercised

turn8-notes.md §7 flagged this turn as "the natural, concrete next test":
would a 4th FEATHER_DANCE against Onix's already-floored ATK stage (0)
trigger `B_MSG_STAT_WONT_DECREASE` instead of the ordinary "fell" message?
**Directly RAM- and pixel-checked, and the premise doesn't hold on this
line**: Pidgeotto's AI selects **QUICK_ATTACK**, not FEATHER_DANCE, at
turn 9 — confirmed three independent ways:

- **RAM**: `gCurrentMove` reads 98 (QUICK_ATTACK), never 297, for the
  entirety of Pidgeotto's turn; `atkStage0` (`gBattleMons+0x19`) is
  RAM-flat at **0** for the whole probed window 10800-12272 — no write
  event at all, let alone a floor-clamped one.
- **PP**: Pidgeotto's FEATHER_DANCE PP is **12/15 both before and after**
  this turn (`dump-battler-full.py`) — if it had been selected (used or
  not), PP would decrement regardless of message outcome, the same rule
  `battle-turn-notes.md` §14 pinned ("PP must be tracked... decremented on
  every use, hit or miss").
- **Pixel**: the kickoff text reads, PNG-confirmed at tick 10930, **"Foe
  PIDGEOTTO used\nQUICK ATTACK!"** — no ATK-related stat message appears
  anywhere in this turn's own text sequence (verified against every
  captured frame in the 10986-11020 dense window, where a stat-fall
  message would have to appear if FEATHER_DANCE had fired).

**This is exactly the negative result the brief anticipated as a valid
outcome** ("a negative... is a result too"). The trigger condition itself
remains correctly pinned from turn8-notes.md §4's own source trace
(`ChangeStatBuffs`, `battle_script_commands.c:7040`: `B_MSG_STAT_WONT_
DECREASE` fires only when `statStages[statId] == MIN_STAT_STAGE` *before*
the current application, i.e. only on a stat already at the floor walking
in) — just still unexercised. Onix's ATK stage remains at the floor (0)
entering turn 10, so the test remains open and valid for whichever future
session next observes Pidgeotto choose FEATHER_DANCE (turns 6-8 all used
it, turn 9 didn't — not a predictable pattern from 4 data points).

### Damage: both hits land, matching the published ledger exactly (31→24/−7, 82→61/−21)

`gBattleMoveDamage` locks to **7** (QUICK_ATTACK, tick 10918) then **21**
(ROCK_SLIDE, tick 11135). `hp0` (Onix) drops 31→24 at tick 11001; `hp1`
(Pidgeotto) drops 82→61 at tick 11337 — both exact matches to `battle-turn-
notes.md` §15 HEADLINE 2's own published table for turn 9 (`31→24 (−7)`,
`82→61 (−21)`) and to §14's independent "always ROCK_SLIDE" line's turn-9
row, cited in this doc's own opening headline. QUICK_ATTACK's own type
match — `TYPE_NORMAL` vs. Onix's `TYPE_ROCK`/`TYPE_GROUND` — is **not very
effective** (`src/data/gen/type-effectiveness.json`: `TYPE_NORMAL` vs.
`TYPE_ROCK` = 0.5×, vs. `TYPE_GROUND` = 1× (no entry), combined 0.5×),
PNG-confirmed via `sText_NotVeryEffective` (§5). ROCK_SLIDE vs. Pidgeotto's
`TYPE_FLYING` remains **super effective** (2×, the same match-up turns 6/7
already established), PNG-confirmed via `sText_SuperEffective`.

## 5. Pixel/window boundaries (sha256-cited, `battle1-turn9-dense.json`, twice-run identical)

All frame numbers are this dossier's absolute tick numbering. sha256 shown
truncated to 12 hex chars for table width. Every text-content label below
is **PNG-read**, not inferred from RAM or `data/gen/moves.json` alone.

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| turn-9 settled menu persists (pre-press baseline) | 10818-10826 | `838c18eab548`/`c7be1bdbcb89` | same resting frame `battle1-turn8-dense.json` itself ends on; **PNG-read**: "What will ONIX do?" FIGHT/BAG/POKéMON/RUN |
| FIGHT submenu settled, cursor **still on BIND** (**cursor persistence, pre-`LEFT`-press** — carried over from turn 8's own pick, per the brief's explicit ask) | 10826-10836 | `bda161ec91f5` (10834) | **PNG-read** at 10834: ROCK SLIDE/DRAGONBREATH/BIND▶/SANDSTORM, PP **19/20**, TYPE/NORMAL — RAM: `gMoveSelectionCursor[0]`=1 already at tick 10820, *before* the submenu even reopens, confirming the cursor position is carried in RAM across the closed action-menu, not just re-derived on open |
| FIGHT submenu settled, cursor on ROCK_SLIDE (**post-`LEFT`-press**) | 10859-10864 | `4eb7db7c26ca` (10862) | **PNG-read** at 10862: ▶ROCK SLIDE/DRAGONBREATH/BIND/SANDSTORM, PP **4/10**, TYPE/ROCK — RAM: `cursor0` flips 1→0 at tick 10859, exactly inside the `LEFT` press's own 2-frame window (10858-10860) |
| move confirmed (`A` held 10870-10872) | 10869-10877 | `bea3024eb2f3` (10869-10873), `c4c273d6f290` (10874-10879) | **[ROW CORRECTED 2026-07-20, supervisor verification]** the original "no visible change during the press" claim was wrong: 10869-10873 carries a distinct frame — a ~1579px transient confined to the player (Onix) healthbox region (bbox x:127-229, y:74-110, supervisor pixel-diff of the regenerated captures; two fresh oracle runs byte-identical, so this is deterministic content, not noise). Consistent with the healthbox-bounce family the engine already models (same sine-plateau behavior that holds 10860-10868 at one constant sha). RAM's `gBattlerAttacker`→1 and `gCurrentMove`→98 land at 10876-10877 as originally noted |
| QUICK_ATTACK kickoff text typing in | 10878-10929 | (letter-by-letter, no single sha) | **PNG-read** at 10886 ("Foe P"), 10898 ("Foe PIDGEOTTO use"), ordinary typewriter reveal |
| QUICK_ATTACK kickoff text fully visible, animation begins | 10930 (settled) → continuous churn through ~10985 | `6de9da748618` | **PNG-read** at 10930: "Foe PIDGEOTTO used\nQUICK ATTACK!" fully typed; **PNG-read** at 10950/10970: Pidgeotto's own sprite streaks/blurs (a fast dash effect consistent with QUICK_ATTACK's own flavor), briefly leaving its usual position — a new animation shape not seen in this arc before (turns 6-8's kickoff animations were all stat-down/miss, no sprite-position movement) |
| impact + HP-drain (Onix) | 10986-11001 | (drain, no single sha) | RAM (`dump-battle-bars.py`): sentinel `-32768` at 10992, then a flat 1-HP-unit-per-tick counter 30→24 over ticks 10993-10999, done-sentinel `0` at 11000; `gBattleMons[0].hp` itself commits 31→24 **1 tick after** the done-sentinel (11001) — the same "RAM commits 1 tick after the bar's own done sentinel" rule prior turns established |
| message-box transition into "not very effective" | 11005-11008 | first 4 (box-region-only, see correction below) `5ff3490e3cf1`/`c32a47b77c5b`/`7a5e543f9c55`/`693540b39db5` | 4-tick transition (screen static 10999-11004 at `68e1a9e77abc`, first diff at 11005); **PNG-read** at 11006 ("It"), 11014 ("It's not v") |
| "It's not very effective.." text holds | ~~11018-11092~~ **CORRECTED 2026-07-21 (probe, `docs/turn9-shake-notes.md` §C4; supervisor PNG-reverified at 11040): text is ONE line ("It's not very effective..."), not two, and 11018 is still mid-typing (14/24 chars) — reveal is 1 char/tick from 11005, fully typed at 11028; the genuine settled hold is 11028-11109 (`12b7204322f9`), dense-rescanned flat (no periodic content)** | `09694bd0d0da` (11018, mid-typing), `12b7204322f9` (11028-11109) | original two-line PNG-read claim was wrong; matches `sText_NotVeryEffective` (`battle_message.c:316`) content-wise; **first sub-1× damage message pixel-confirmed in this arc** (turns 6/7's ROCK_SLIDE hits were 2× super-effective; turn 8's BIND missed) |
| RAM: unattributed RNG step (§3) | 11094 | (no pixel change) | fires mid-hold, under the still-static "not very effective" text — no visual signal, consistent with every RNG roll in this dossier |
| message-box transition into "ONIX used ROCK SLIDE!" | 11110-11113 | (box-region-only) `95efd4fe0a13`/`0b427db7f25f`/`bb950968bec3`/`4c8e2657b02b` | 4-tick transition; **PNG-read** at 11122 ("ONIX used\nROCK"), fully typed "ONIX used\nROCK SLIDE!" by 11130 |
| RAM: ROCK_SLIDE accuracy/crit/spread rolls (§3) | 11108-11135 | `81aaa90be45f` (11130-11135) | all three rolls resolve silently under the newly-settled kickoff text — same "RNG doesn't need a pixel change" rule every prior turn established |
| ROCK_SLIDE kickoff text holds through the impact animation | 11136-~11280 | `81aaa90be45f` → animation frames | **PNG-read**: rock-prop animation over Pidgeotto's own sprite region first visible between 11150-11154, still present at 11250, gone by 11274 — a ~120-tick animation window, longer than turns 6/7's own ~21-34-tick RAM-bracketed impact phase (attributed to this move now landing on a still-airborne, undamaged-this-turn target rather than a difference in the animation itself; not chased further) |
| HP-drain (Pidgeotto) | 11310-11336 | (drain, no single sha) | RAM (`dump-battle-bars.py`): sentinel `-32768` at 11314, flat 1-HP-unit-per-tick counter 81→61 over 11315-11335, done-sentinel `0` at 11336; `gBattleMons[1].hp` commits 82→61 **1 tick after** (11337) — same commit-lag rule |
| **healthbar color transitions — new to this arc** | 11330-11338 | n/a (direct pixel-color read, not sha) | Pidgeotto's own healthbar measured directly (PIL pixel sampling, not eyeballed): green (`(90,214,132)`) at HP 82/156 (52.6%, tick 10818) → **yellow** (`(255,231,57)`/`(206,173,8)`) by tick 11330, settling at bar-width 18px (was 25px green) by 11338 — the drain crosses the game's green/yellow color threshold (50%) for the first time in this arc. Onix's own bar (already yellow at 31/117=26.5% before this turn) crosses yellow→**red** (`(255,90,57)`/`(173,66,74)`) between ticks 10990-11002, dropping to 24/117=20.5% — the first red-zone healthbar **pixel-sampled with exact RGB values in this arc's own dossier chain (turns 6-9)**; earlier `battle-turn-notes.md` sections (e.g. §14's own Onix-at-4/117 state) almost certainly reached this zone too but were never pixel-verified this precisely, so this is not claimed as the first ever, only the first this specific 6-9 sub-chain has directly measured |
| message-box transition into "super effective" | 11341-11344 | (box-region-only) `7c891b2a64ee`/`ec5a8956514d`/`39bc2b358f81`/`d5e6a22dcbb1` | 4-tick transition; **PNG-read** at 11342 ("It"), fully typed "It's super\neffective!" by ~11360 |
| "It's super effective!" text holds | 11360-11430 | `5a08ee5fbbce` (11360), `4ac2608f8bab` (11400) | **PNG-read** at 11400: "It's super\neffective!" — matches `sText_SuperEffective` (`battle_message.c:317`) exactly |
| secondary-effect/turn-end, text clears, turn-10 menu reopens | 11431-11443 (clearing) → 11444 (RAM: `bg0y` flip 0→160, AI-cluster RNG same tick) → 11450 (settled) | `f97541a1f42d` | **PNG-read** at 11450: "What will ONIX do?" — pixel-identical to `battle1-turn8-dense.json`'s own turn-9-baseline capture, confirming this dossier's tick numbering and rendering stay consistent across the whole chain |
| turn-10 menu idle, stable through this trace's own final tick | 11700, 12000, 12272 | `f97541a1f42d` (all three) | RAM-flat 11450-12272 (re-checked directly) — same base-menu idle-cycle README already documents (turn8-notes.md §5's "minor new observation"), just not itemized at every phase this session (out of scope, boundary-only per the brief) |

### Correction/refinement to turn7/8-notes.md's "4-frame shared prefix" theory: it holds, but only within matched transition categories, and only when compared box-region-only

turn7-notes §5 and turn8-notes §5 both found a **whole-frame** sha256 match
across the first 4 frames of every message-box-open transition within a
turn. **This turn's own transitions do not whole-frame-match each other**
(checked directly, values differ across all pairs) — but this is a
methodology artifact, not a contradiction: turns 6-8 each had a **static
HP backdrop all turn** (no damage landed, or damage landed only once with
no second hit later in the same turn), so a whole-frame hash was a valid
proxy for "is the box-open animation itself identical." Turn 9 has **two**
separate HP-changing hits, so the healthbar backdrop genuinely differs
between transitions, confounding a whole-frame comparison. Re-checked with
the comparison **restricted to the message-box region only** (y=112-160,
excluding the healthbar/sprite area above it): the QUICK_ATTACK-kickoff→
"not very effective" transition (11005-11008) and the ROCK_SLIDE-kickoff→
"super effective" transition (11341-11344) — **the same relative script
position in each move's own resolution** — share an **exact 4-frame
box-region prefix**, byte-for-byte (`5ff3490e3cf1`/`c32a47b77c5b`/
`7a5e543f9c55`/`693540b39db5` both times, verified programmatically). The
other two transitions this turn (into the initial QUICK_ATTACK kickoff, and
from "not very effective" into the ROCK_SLIDE kickoff) each have their
**own**, mutually-distinct 4-frame box-region prefixes — i.e. the generic
open routine turns 7/8 found is real and reconfirmed, but it is specific to
**which kind of message is opening** (a same-move effectiveness/fall
message vs. a new-move kickoff vs. the very first kickoff after the
action-select menu closes), not universal across every box-open in a turn
as turn8-notes' own three-way match (coincidentally, all three of *that*
turn's transitions happened to be the same category pairing) suggested.
Not chased to the exact source routine(s) responsible — flagged as a
refinement, not a full resolution, matching this dossier's own convention.

## 6. New-to-turn-9 mechanism inventory

- **QUICK_ATTACK (`EFFECT_QUICK_ATTACK`, priority +1)** — first move in
  this 6-9 arc with nonzero priority, RAM-confirmed to force turn order
  independent of Speed (though moot here, since Pidgeotto's plain Speed
  already wins by 1 point). `power: 40, accuracy: 100, secondaryEffectChance:
  0` (`src/data/gen/moves.json`) — a plain damaging hit, no special engine
  slice needed beyond a priority-tier turn-order model, which `battle-turn-
  notes.md` §14 already flagged as a requirement from its own turn-14
  observation; this session adds the first direct RAM/pixel trace of the
  move actually being selected and resolving.
- **The "not very effective" message/0.5× multiplier** — the first sub-1×
  damage roll pixel-confirmed in this arc (§4/§5); needs no new mechanism
  beyond the existing type-effectiveness table already extracted
  (`src/data/gen/type-effectiveness.json`), but is the first time this
  arc's own dossier has pixel-verified the *reduced*-effectiveness message
  variant specifically (turns 6/7 only ever exercised the super-effective
  variant).
- **Healthbar color-zone transitions (green→yellow, yellow→red)** — new to
  this arc's own pixel record (§5). Sketch for whoever implements the
  health-bar UI: the bar's fill color is a function of the **current HP
  fraction** at render time, not a fixed per-Pokémon color — this turn
  shows Pidgeotto's own bar crossing the (apparent) 50%-ish green/yellow
  threshold and Onix's crossing a lower yellow/red threshold, both mid-drain
  (the color updates progressively as the 1-HP-unit-per-tick counter ticks
  down, not just at rest) — not exhaustively bisected to the exact
  percentage thresholds this session (time-boxed; `(255,231,57)`/
  `(206,173,8)` for yellow and `(255,90,57)`/`(173,66,74)` for red, sampled
  directly via PIL pixel reads, are the concrete RGB values a future
  session can grep the VRAM/palette data for if exact thresholds matter).
- **The "unattributed RNG step" recurs, now cross-turn-correlated (§3)** —
  not new in the sense of being unprecedented (§12 already flagged one
  instance), but new in that this session establishes it as a **pattern**
  tied to "both combatants use a damaging move this turn," with a matching
  14-tick offset to the following move's own accuracy roll in both
  observed instances. Still not traced to a specific call site — the
  `battle_script_commands.c` `Random()` call sites grepped this session
  (`ApplyRandomDmgMultiplier`, `Cmd_setmoveeffect`, ability/item-chance
  checks) don't obviously fit a "fires unconditionally between any two
  back-to-back damaging moves" shape; flagged as an open item, not
  resolved.
- **BIND's own trap effect remains entirely unexercised** — Onix didn't
  select BIND this turn (reverted to ROCK_SLIDE per the winning line), so
  `battle_util.c`'s `ENDTURN_WRAP` mechanism sketched in turn8-notes.md §6
  is still un-RAM-tested; `status2_0`/`status2_1` stayed RAM-flat 0 the
  entire turn, confirmed directly (not just assumed from BIND being unused).

## 7. Turn 10+ boundaries (noted, not densely probed — out of scope this session)

- Turn 10's action-select menu is settled by tick **11450** (§5), matching
  RAM-flat 11444-12272 (re-checked directly) — the natural starting point
  for a future turn-10 scout.
- `battle-turn-notes.md` §14's own "always ROCK_SLIDE" line's turn 10 is
  **AERIAL_ACE (hit) / ROCK_SLIDE (hit)**, `24→14 (−10)` / `61→38 (−23)` —
  since this session's own turn 9 just confirmed the winning line and
  §14's line have now fully reconverged in `gRngValue` (§3), a future
  turn-10 scout should expect (but still RAM/pixel-verify, not assume) the
  identical outcome. `battle1-winline-b-swap.json`'s own segments[86:90]
  (`A`/30f/`A`/1000f, no cursor-move press since ROCK_SLIDE's cursor slot
  is unchanged from this turn, ticks 12272-13306) is the natural next
  4-segment span — the first turn in this arc's own committed scripts with
  **no navigation press at all**, worth noting since it changes the dense-
  window shape a future session should expect (no cursor-persistence pixel
  boundary to capture, since the cursor never leaves ROCK_SLIDE this time).
- ROCK_SLIDE's PP sits at **3/10** entering turn 10 (§4), 3 uses left
  before its own PP-exhaustion mechanic (`battle-turn-notes.md` §14) forces
  another move switch.
- Onix's ATK stage remains at the floor (**0**) entering turn 10 — the
  falsifiable "won't go any lower!" test (§4) is still open, contingent on
  Pidgeotto's AI choosing FEATHER_DANCE again at some future turn (not
  guaranteed; it didn't this turn).
- Onix's own healthbar is now in the **red zone** (24/117, §5) — worth
  flagging for whoever next probes this arc, since Gen 3's low-HP state
  typically also triggers an audio cue and/or blink animation not itemized
  pixel-by-pixel this session (time-boxed; no blink observed in the sparse
  turn-10-idle samples taken, but those were not dense enough to rule one
  out definitively).

## Verification

`npm test` and `npm run build` green (no `src/` changes this session — the
only additions are `tools/compare/traces-groundtruth/battle1-turn9-dense.json`,
`tools/probe/specs/turn9-rng-watch.json`, and this doc, per the worktree
brief's constraint). Trace twice-run via `bin/oracle run`, manifests
(256/256 captures) byte-identical across two independent runs, 0 sha
mismatches. RAM probes (`ram-probe.py`, `dump-battler-full.py`,
`dump-battle-bars.py`) each run and their outputs cross-checked internally
(LCG step counts recomputed programmatically from raw values, not trusted
from a single pass; healthbar drain counters cross-checked against the
authoritative `gBattleMons[].hp` commit ticks). Cross-check against the
already-committed `battle1-winline-b-swap.json` (12 spot-checked ticks
plus a full 12272-tick per-frame button-state diff, §1) byte-identical.
The box-region message-transition comparison (§5 correction block) was
verified programmatically (sha256 string equality over a cropped region,
not eyeballed); healthbar color-zone RGB values were read directly via
pixel sampling (PIL), not inferred from HP numbers alone.
