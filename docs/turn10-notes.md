# Turn 10 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only)

Ground-truth dossier for battle 1's turn 10 (Onix vs. PIDGEOTTO, both still on
their turn-6/7/8/9 sides) **on the winning line**: extends `tools/compare/
traces-groundtruth/battle1-turn9-dense.json`'s own committed script verbatim
with `battle1-winline-b-swap.json`'s own segments[86:90] (the turn-10
FIGHT-submenu-open, move-confirm — **zero navigation presses**, cursor
already resting on ROCK_SLIDE from turn 9's own end-state — and the
1000-frame resolution-idle) — exactly the 4-segment span `docs/turn9-notes.md`
§7 predicted, tick-for-tick. **Groundwork only — no engine code, no `src/`
changes**, per this session's worktree brief. All frame ticks are this
dossier's own absolute numbering, shared with `battle1-turn6-dense.json`/
`battle1-turn7-dense.json`/`battle1-turn8-dense.json`/`battle1-turn9-dense.json`/
`battle1-winline-*.json` (verified directly below, not assumed).

**Headline, stated up front**: **both published lines reconverge a second
turn running.** Pidgeotto's AI selects **AERIAL_ACE** (RAM- and pixel-
confirmed below) and Onix's ROCK_SLIDE hits — exactly matching both
`battle-turn-notes.md` §14's own "always ROCK_SLIDE" line's turn-10 row
(`AERIAL_ACE (hit) | ROCK_SLIDE (hit) | 24→14 (−10) | 61→38 (−23)`) **and**
§15's own BIND-substituted-line table's turn-10 row (`ROCK_SLIDE (hit) |
24→14 (−10) | 61→38 (−23)`) — RAM-confirmed bit-for-bit, not just HP-
outcome-alike. All three of the brief's standing falsifiable tests come back
**negative again** this turn (§4): Pidgeotto still hasn't chosen FEATHER_DANCE
since turn 8, Onix still hasn't selected BIND since turn 8's miss, and the
"unattributed RNG step" recurs a **third** time with the exact same 14-tick
gap to the next move's accuracy roll — now joined by two more exactly-
reproduced offsets (§3) that sharpen, without fully resolving, what the step
is tied to.

Sources: `reference/pokeemerald/src/battle_message.c` (`sText_
NotVeryEffective`, `sText_SuperEffective`), `src/data/gen/{moves,
type-effectiveness}.json`, `docs/turn9-notes.md` §3 (the recurring
unattributed-RNG-step this turn's own ledger extends), `bin/oracle symbols`.
Oracle probes: `tools/probe/ram-probe.py` + `tools/probe/dump-battler-
full.py` + `tools/probe/dump-battle-bars.py` (all pre-existing, reused
unchanged) plus a new watch spec, `tools/probe/specs/turn10-rng-watch.json`
(committed, identical column set to `turn9-rng-watch.json`). New committed
trace: `tools/compare/traces-groundtruth/battle1-turn10-dense.json`.

## 1. Prefix-consistency verdict: turn9-dense.json + winline-b-swap[86:90] IS a verbatim, pixel-exact extension

Checked programmatically, not assumed, at the same three levels turns 6-9
used (the brief's own "flatten-and-compare" convention):

- **Press-event equality**: flattened both the extended 92-segment script
  (turn9-dense.json's own 88 segments + winline-b-swap.json's own
  segments[86:90]) and `battle1-winline-b-swap.json`'s own full 156
  segments to `(tick, buttons)` press-event lists (ignoring pure-idle
  segments). All 40 of the extended script's press events match
  `winline-b-swap.json`'s own first 40, index-for-index — **0 mismatches**,
  and the extended events list is an exact prefix
  (`combined_events == wl_events[:len(combined_events)]` checked directly).
- **Full per-frame equality**: flattened both scripts to a per-tick button
  state for every one of the shared 13306 ticks — **0 diffs**.
- **Pixel cross-check**: a spot-check `bin/oracle run` of
  `battle1-winline-b-swap.json` with `captureFrames` restricted to 12 of
  this dossier's own committed trace's tick numbers (12262, 12305, 12311,
  12347, 12350, 12453, 12546, 12560, 12587, 12791, 12898, 13306 — spanning
  the pre-open baseline, the confirm-press transient, both move-kickoff
  locks, both accuracy/crit/spread-roll ticks, the unattributed step, both
  HP-drain commits, and the turn-11 resettle) produced **byte-identical
  sha256 at every one** against this dossier's own committed trace's own
  capture of those same ticks.

**Verdict: the composite script reproduces the real winline chain's pixels
exactly**, confirming `turn9-notes.md` §7's own prediction: "`battle1-
winline-b-swap.json`'s own segments[86:90] (`A`/30f/`A`/1000f, no cursor-move
press since ROCK_SLIDE's cursor slot is unchanged from this turn... the
first turn in this arc's own committed scripts with no navigation press at
all)" — verified directly, not just re-asserted.

## 2. The committed trace

`tools/compare/traces-groundtruth/battle1-turn10-dense.json`: 92 segments,
13306 frames total (`turn9-dense.json`'s 88 segments + `battle1-winline-b-
swap.json`'s own segments[86:90] verbatim — the turn-10 submenu-open `A`,
30f settle, confirm `A` with **no** navigation press, and the full 1000-frame
resolution-idle). 208 `captureFrames` (under the oracle's 256-per-trace cap),
dense (stride-1) over eight windows bracketing every RAM-confirmed
transition this turn — submenu-open/cursor-already-on-ROCK_SLIDE settle
(12262-12282), the confirm-press transient into AERIAL_ACE-kickoff-text-
typing (12300-12350, covering the crit/spread rolls), the AERIAL_ACE impact/
HP-drain (Onix) window (12440-12461), the "not very effective"-message
transition + the unattributed-RNG-step + ROCK_SLIDE's own curMove/accuracy
lock (12540-12566), the ROCK_SLIDE-kickoff crit/spread-roll window
(12580-12596), the ROCK_SLIDE impact/HP-drain (Pidgeotto) window
(12780-12801), and the "super effective"-message transition + turn-end +
turn-11-menu-resettle window (12878-12906) — plus sparse representative
sampling of the uneventful holds (the AERIAL_ACE animation loop, the
settled "not very effective" text, the ROCK_SLIDE impact-animation tail, the
settled "super effective" text, and the turn-11 menu's own idle cycle out to
tick 13306), matching turns 6-9's own "boundary + representative sampling,
not exhaustive stride-1 over pure animation-hold" convention. Two extra
**uncommitted** exploratory probes (not part of the deliverable, run purely
to check whether turn9-notes §5's box-region-only shared-prefix finding
reproduces) covered ticks 12461-12480 and 12801-12825 densely; see §5's own
note on why that check came back inconclusive this turn, not a repeat
confirmation. **Twice-run byte-identical**: `bin/oracle run`, two independent
runs, manifests (208/208 captures) diffed identical, 0 sha mismatches.

## 3. RNG-consumption ledger for turn 10 (RAM-truthed, LCG-step-counted)

`gRngValue` (`0x3005d80`) sampled every tick 12200-13606 via `ram-probe.py`
(13606 = this session's own exploratory extension 300 ticks past the
committed trace's own 13306 endpoint, confirming the settle holds with zero
further `Random()` calls all the way out — see §4). Step counts are verified
LCG distances (`next = 1103515245*v + 24691 mod 2^32`), recomputed
programmatically from the raw values: entering this turn, `gRngValue` is
flat at **`2970380319`** (the exact value `turn9-notes.md` §3's own final
table row ended on — menu navigation itself again consumes zero `Random()`
calls, and this turn needed **zero** navigation presses at all, the
strongest data point yet for that rule).

| tick | steps | value after | attribution |
|---|---|---|---|
| 12347 | 1 | `2432444326` | Pidgeotto's **AERIAL_ACE crit roll** — no accuracy roll precedes it: AERIAL_ACE is `EFFECT_ALWAYS_HIT` (`accuracy: 0`, `src/data/gen/moves.json`), the first move in this dossier's own arc confirmed to skip the accuracy check entirely |
| 12350 | 1 | `1607849505` | AERIAL_ACE's **damage-spread roll**; `gBattleMoveDamage` locks to **10** this same tick (intermediate values 8→15→11→10 over ticks 12348-12350, the same multi-step decomposition turns 6/7/9 flagged) |
| 12546 | 1 | `4090534528` | **unattributed step** — occurs after Onix's own HP commit (12453) and before `gCurrentMove` updates to ROCK_SLIDE (12555); call site still not identified. **93 ticks after the HP commit and 9 ticks before the `gCurrentMove` update — both offsets exactly matching turn 9's own instance** (11001→11094 = 93; 11094→11103 = 9) bit-for-bit, a third independently-timed data point |
| 12560 | 1 | `1575299315` | Onix's **ROCK_SLIDE accuracy check** (acc=90) — **hits**; fires **exactly 14 ticks** after the unattributed step (12546→12560), matching turn 9's own 11094→11108 gap and `battle-turn-notes.md` §12's own turn-2 3121→3135 gap — the third instance of this exact offset, now with two different preceding moves (QUICK_ATTACK, AERIAL_ACE) both landing on it. Also fires **exactly 5 ticks** after `gCurrentMove`→157 at 12555, matching turns 6/7/9's own ROCK_SLIDE-specific offset |
| 12584 | 1 | `738122218` | ROCK_SLIDE's **crit roll** — fires **24 ticks** after its own accuracy roll, bit-for-bit the same offset as turns 6/7/9 |
| 12587 | 1 | `1457812757` | ROCK_SLIDE's **damage-spread roll**; `gBattleMoveDamage` locks to **23** this same tick — **3 ticks** after the crit roll, again matching turns 6/7/9's own offset exactly |
| 12881 | 1 | `2117116004` | ROCK_SLIDE's **secondary-effect roll** (30% flinch chance) — fires 294 ticks after the spread lock (matching turns 6/7/9's own ~292-300-tick gap); **moot this turn**: Pidgeotto already acted (it moved first), so a successful flinch roll has no target left to flinch — identical shape to turn 9 |
| 12891 | 1 | `4243268359` | turn-pass bookkeeping (`gRandomTurnNumber`) — same tick `gBattleMainFunc` settles back to its resting value (`134463093`) |
| 12898 | 5 | `1753916210` | opponent-AI next-move-scoring cluster, same "...5" tail shape as every prior turn |

**Total: 13 `Random()` calls this turn** across 9 distinct events — one
fewer than turn 9's 14/10, entirely accounted for by AERIAL_ACE's own
`EFFECT_ALWAYS_HIT` skipping the accuracy-check roll that QUICK_ATTACK
(turn 9's equivalent first move) required. `gRngValue` stays bit-for-bit
flat from tick 12898 through this session's own exploratory extension to
13606 (checked directly) — the turn-11 menu is a genuine RNG-free rest, not
just visually settled.

**A sharpened, not fully resolved, read on the unattributed step**: this
session initially wondered whether the recurring 14-tick offset was simply
an artifact of identical message text (`"It's not very\neffective.."` is the
exact same string turn 9 and turn 10 both produce, since both QUICK_ATTACK
and AERIAL_ACE land at the same 0.5× multiplier against Onix) driving
identical typewriter-hold timing downstream. That hypothesis does **not**
survive a check against `battle-turn-notes.md` §12's own turn-2 instance
(ENDEAVOR/DRAGON_BREATH, a different message pair entirely) landing on the
same exact 14-tick gap — so the 14-tick offset from the unattributed step to
the *following* move's own accuracy roll looks like a fixed per-move-init
cost independent of message content. The 93-tick gap from the *preceding*
move's own HP-commit to the unattributed step itself, however, has only ever
been cross-checked between turn 9 and turn 10 so far, both of which share
identical message text — so that particular sub-offset **could** still be
message-length-dependent; distinguishing the two hypotheses needs a future
turn where the first move's own effectiveness message differs from a
previously-probed one. Flagged as a refinement, not a resolution, matching
this dossier's own convention.

## 4. Turn order, battler stats, and the three standing falsifiable tests (RAM-confirmed)

`gBattlerAttacker` flips **0→1 at tick 12310** (Pidgeotto acts first, the
same 1-point Speed margin as every prior turn — AERIAL_ACE carries no
priority, `priority: 0`, `src/data/gen/moves.json`, so this is a pure
Speed-order turn, unlike turn 9's QUICK_ATTACK). `gCurrentMove` reads **332
(AERIAL_ACE)** at 12311, resets to 0 at 12554, then reads **157
(ROCK_SLIDE)** at 12555 with `gBattlerAttacker` back to 0 (Onix). Battler
snapshots (ticks 12262 pre-turn / 13306 post-turn, full struct via
`dump-battler-full.py`):

| | ONIX (battler0) | PIDGEOTTO (battler1) |
|---|---|---|
| atk/def/spd/spA/spD | unchanged from turn 9 | unchanged from turn 9 |
| moves (id) / PP before → after | ROCK_SLIDE(157) **3/10 → 2/10 (resumes decrementing, 2 uses left before PP exhaustion)**, BIND(20) 19/20 (unchanged, unused since turn 8's miss), DRAGON_BREATH(225) 19/20 (unchanged), SANDSTORM(201) 10/20 (unchanged) | AERIAL_ACE(332) 20/20 → **19/20 (1st use)**, QUICK_ATTACK(98) 29/30 (unchanged — not reused), FEATHER_DANCE(297) 12/15 (unchanged — no 5th use), SAND_ATTACK(28) 15/15 (unchanged) |
| HP before → after | 24 → **14** (−10, AERIAL_ACE) | 61 → **38** (−23, ROCK_SLIDE) |
| ATK stat stage before → after | **0 → 0 (unchanged — still pinned at turn 8's floor, third turn running)** | 6 → 6 (unchanged) |
| item | 0 (none) | 180 (`ITEM_WHITE_HERB`, unchanged — still doesn't trigger, no stat drop this turn either) |
| status2 (wrap/trap flags) | 0 (unchanged) | 0 (unchanged) |

### All three standing falsifiable tests: still NEGATIVE this turn

- **Test 1 ("won't go any lower!" on a 4th+ FEATHER_DANCE against Onix's
  floored ATK)**: Pidgeotto's AI selects **AERIAL_ACE**, not FEATHER_DANCE,
  a third turn running without it. **RAM**: `gCurrentMove` reads 332
  throughout, never 297; `atkStage0` RAM-flat at **0** the entire probed
  window 12200-13606, no write event. **PP**: FEATHER_DANCE PP is 12/15
  both before and after. **Pixel**: kickoff text reads "Foe PIDGEOTTO
  used\nAERIAL ACE!" (§5) — no stat message anywhere this turn. Still open,
  contingent on a future turn where Pidgeotto's AI actually reselects
  FEATHER_DANCE.
- **Test 2 (BIND actually hitting — wrap roll, `STATUS2_WRAPPED` write,
  end-of-turn trap damage)**: Onix's AI selects **ROCK_SLIDE**, not BIND, a
  second turn running since turn 8's miss (turn 9 also skipped it).
  `status2_0`/`status2_1` RAM-flat 0 the entire turn, confirmed directly.
  Still entirely unexercised in this dossier chain.
- **Test 3 (the unattributed-RNG-step call site)**: recurs a third time
  (§3), now with two independently-confirmed sub-offsets (14-tick to the
  next accuracy roll; 93-tick from the preceding HP commit) instead of one
  — narrows the search space (both are exact, content-independent-looking
  fixed costs, at least for the 14-tick one) but the actual `Random()` call
  site in `battle_script_commands.c` is still not grepped to ground this
  session either (time-boxed, same as turn 9).

### Damage: both hits land, matching both published ledgers exactly (24→14/−10, 61→38/−23)

`gBattleMoveDamage` locks to **10** (AERIAL_ACE, tick 12350) then **23**
(ROCK_SLIDE, tick 12587). `hp0` (Onix) drops 24→14 at tick 12453; `hp1`
(Pidgeotto) drops 61→38 at tick 12791 — both exact matches to
`battle-turn-notes.md` §14's own turn-10 row (`AERIAL_ACE (hit) | ROCK_SLIDE
(hit) | 24→14 (−10) | 61→38 (−23)`) **and** §15's own turn-10 row (`ROCK_SLIDE
(hit) | 24→14 (−10) | 61→38 (−23)`), cited in this doc's own opening
headline — the fullest reconvergence check yet, since this is the second
consecutive turn both independently-derived lines land on bit-identical
outcomes. AERIAL_ACE's own type match — `TYPE_FLYING` vs. Onix's
`TYPE_ROCK`/`TYPE_GROUND` — is **not very effective**
(`src/data/gen/type-effectiveness.json`: `TYPE_FLYING` vs. `TYPE_ROCK` =
0.5×, vs. `TYPE_GROUND` = 1× (no entry), combined 0.5×), PNG-confirmed via
`sText_NotVeryEffective` (§5) — the same 0.5× shape turn 9's QUICK_ATTACK
hit, just via a different type pairing (Normal vs. Flying, both landing on
Rock's own resistance/Ground's neutrality). ROCK_SLIDE vs. Pidgeotto's
`TYPE_FLYING` remains **super effective** (2×, the same match-up turns
6/7/9 already established), PNG-confirmed via `sText_SuperEffective`.

## 5. Pixel/window boundaries (sha256-cited, `battle1-turn10-dense.json`, twice-run identical)

All frame numbers are this dossier's absolute tick numbering. sha256 shown
truncated to 12 hex chars for table width. Every text-content label below is
**PNG-read**, not inferred from RAM or `data/gen/moves.json` alone. Every
span below was diffed at every captured tick before being called static,
per the turn-9 supervisor correction's own discipline (no span is
described as "no visible change" without an explicit per-tick sha check).

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| turn-10 settled menu persists (pre-press baseline) | 12262-12268 | `7a4b706a4eac` | same resting frame `battle1-turn9-dense.json` itself ends on; **PNG-read**: "What will ONIX do?" FIGHT/BAG/POKéMON/RUN |
| FIGHT submenu open animation (per-tick diffed, not static) | 12269-12280 | `e41b638d927b`→`0ac6118b2b33`→`e0f0aed31be8` (12269/12278/12280) | 3 distinct sub-frames inside the open animation, confirmed by direct per-tick sha diff (not assumed static) |
| FIGHT submenu settled, cursor **already on ROCK_SLIDE** (**zero navigation presses this turn** — carried over from turn 9's own end-state) | 12281-12300 | `695203024b51` (12281), `2a19ba527891` (12300) | **PNG-read** at 12282: ▶ROCK SLIDE/DRAGONBREATH/BIND/SANDSTORM, PP **3/10**, TYPE/ROCK — RAM: `cursor0`=0 flat for this dossier's entire probed window (12200-13606), the strongest cursor-persistence data point in this arc yet, since this turn needed no `LEFT`/`RIGHT` press at all to confirm it |
| move confirmed (`A` held 12304-12306), press-transient window (diffed per-tick, matching turn 9's own corrected methodology) | 12300-12315 | `2a19ba527891` (12300-12307, 8 static ticks), `1eba809feded` (12308-12315, 8 static ticks) | two distinct static plateaus, not one — confirmed by per-tick sha diff of the whole span before writing this row; `gBattlerAttacker`→1 and `gCurrentMove`→332 land at 12310-12311, inside the second plateau, not at a visible pixel change (the transition to the second plateau at 12308 is a pre-text state change, not the kickoff text itself) |
| AERIAL_ACE kickoff text typing in | 12316-12344 | (letter-by-letter, no single sha) | **PNG-read** at 12335: "Foe PIDGEOTTO used\nAERIAL ACE!" already fully typed |
| AERIAL_ACE kickoff text fully visible, animation begins | 12345 (settled) → continuous churn through ~12439 | `5d89f7e89485` (stable beat 12344-12350) **[SHA CORRECTED 2026-07-20, supervisor fold: the originally cited `f27a2b7a678a` actually belongs to tick 12320 (mid-typing window); label PNG-verified correct, citation was a tabulation slip — two fresh oracle runs byte-identical]** | **PNG-read** at 12345/12420: "Foe PIDGEOTTO used\nAERIAL ACE!" fully typed, holds through the animation; no sprite-position streak observed this move (unlike QUICK_ATTACK's dash effect in turn 9) — AERIAL_ACE's own animation is a slash/claw effect on Onix, not a mover on Pidgeotto's own sprite, a new animation shape for this arc |
| impact + HP-drain (Onix) | 12440-12452 | (drain, no single sha) | RAM (`dump-battle-bars.py`): sentinel `-32768` at 12441, flat 1-HP-unit-per-tick counter 23→14 over 12442-12451, done-sentinel `0` at 12452; `gBattleMons[0].hp` itself commits 24→14 **1 tick after** the done-sentinel (12453) — same commit-lag rule turns 6-9 established |
| message-box transition into "not very effective" | ~12461-12464+ (exact 4-tick box-region prefix not isolated this session, see note below) | n/a | **PNG-read** at 12470: "It's not very" (typing in progress), 12530: "It's not\nvery effective.." fully typed — matches `sText_NotVeryEffective` exactly |
| "It's not very effective.." text holds | 12470-12540 | `0802bec48f53` (12540, whole-frame) | **PNG-read** at 12530: "It's not\nvery effective.." |
| RAM: unattributed RNG step (§3) | 12546 | (no pixel change) | fires mid-hold, under the still-static "not very effective" text — no visual signal, consistent with every RNG roll in this dossier |
| message-box transition into "ONIX used ROCK SLIDE!" | 12562-12565 | `739aa4ce2f99`/`0b067c2ab6fb`/`c780691a9702`/`b1c3ca06760f` | 4-tick transition; RAM: `gCurrentMove`→157 lands at 12555, 7-10 ticks *before* the visible box transition starts — the RAM update and the pixel transition are not simultaneous, matching the general "RNG/state updates don't need a pixel change" rule |
| RAM: ROCK_SLIDE accuracy/crit/spread rolls (§3) | 12560-12587 | `6a8a21d232da` (12581-12587ish) | all three rolls resolve silently under the newly-settled kickoff text |
| ROCK_SLIDE kickoff text holds through the impact animation | 12588-~12780 | `6a8a21d232da` → animation frames | **PNG-read** at 12590: "ONIX used\nROCK SLIDE!" fully typed; rock-prop animation over Pidgeotto's own sprite region, same shape turn 9 established |
| HP-drain (Pidgeotto) | 12766-12789 | (drain, no single sha) | RAM (`dump-battle-bars.py`): sentinel `-32768` at 12766, flat 1-HP-unit-per-tick counter 60→38 over 12767-12789, done-sentinel `0` at 12790; `gBattleMons[1].hp` commits 61→38 **1 tick after** (12791) — same commit-lag rule |
| healthbar color check — **no new zone crossing this turn** | 12262 vs. 12898 | n/a (direct pixel-color read, PIL) | Pidgeotto's own bar stays **yellow** both before and after this turn's drain (`(255,231,57)`/`(206,173,8)`, RGB-identical to turn 9's own measured yellow, at both 61/156=39.1% and 38/156=24.4% — both above whatever the yellow/red threshold is, not bisected further, time-boxed); Onix's own bar stays **red** both before and after (`(255,90,57)` at 24/117=20.5% and 14/117=12.0%) — the healthbar-color-zone mechanism turn 9 flagged as new-to-the-arc doesn't produce any *new* transition this turn, both mons' bars were already in their respective zones entering the turn |
| message-box transition into "super effective" | 12806-12815 | (box-region-only) `5706d08864ca`→...→`c3e98a3e0f9f` | ~10-tick transition (longer than turn 9's own 4-tick box-region-only measurement at the equivalent point — see note below on why this session couldn't cleanly isolate a shared prefix) |
| "It's super effective!" text holds | 12816-12897 | `c3e98a3e0f9f` (box-region, 12816-12825 flat) | **PNG-read** at 12820/12850: "It's super\neffective!" — matches `sText_SuperEffective` exactly |
| secondary-effect/turn-end, text clears, turn-11 menu reopens | 12878 (text starts clearing) → 12891 (RAM: `gBattleMainFunc` settles to resting value, turn-pass RNG step) → 12898-12899 (settled) | `25874032e009` (12892), `e28bc5375a15` (12899, 12901, 13306) | **PNG-read** at 12899: "What will ONIX do?" — pixel-identical to `battle1-turn9-dense.json`'s own turn-10-baseline capture |
| single-tick pixel blip at turn-11 menu rest | 12900 | `63e2d272402d` | one-tick sha difference sandwiched between two identical `e28bc5375a15` frames (12899, 12901) — visually imperceptible at normal viewing, consistent with the already-documented Onix on-field idle-bob sprite animation (S7 slice M-2, `PROGRESS.md`/git history), not a new mechanism; not re-derived from source this session |
| turn-11 menu idle, stable through this trace's own final tick and this session's own +300-tick exploratory extension | 12950, 13000, 13100, 13200, 13306 (committed trace); 13606 (exploratory only, uncommitted) | `e28bc5375a15` (all) | RAM-flat 12898-13606 (re-checked directly, including the uncommitted extension) |

### Note: the turn-9 box-region-only shared-prefix finding does not cleanly reproduce this session

`turn9-notes.md` §5's correction found that the QUICK_ATTACK-kickoff→"not
very effective" and ROCK_SLIDE-kickoff→"super effective" transitions shared
an **exact 4-frame box-region-only** (y=112-160) prefix. This session ran
the equivalent check (two uncommitted exploratory probes, ticks 12461-12480
and 12801-12825, box-region sha per tick) and found **no shared prefix** at
the ticks initially guessed as the transition start, and — more importantly
— found the box-region sha changing on **almost every tick** through both
windows, not settling into the expected static "message revealed, waiting"
plateau turn 9 found. The most likely explanation, not confirmed further
this session (time-boxed): unlike turn 9's isolated 4-tick check, this
session's guessed start ticks were not bisected to the *exact* first
differing tick (turn 9's own check started from an already-known static
baseline via a full-frame diff first; this session's two extra probes
skipped that step to save time), so what's shown above may include several
ticks of an active typewriter reveal or a blinking confirm-arrow indicator
inside the box region itself, not the box's own open animation. **Not
re-chased to a clean isolation this session** — flagged as an open
methodology gap for whoever next wants this specific refinement, rather
than mis-reported as a contradiction of turn 9's own finding.

## 6. New-to-turn-10 mechanism inventory

- **AERIAL_ACE (`EFFECT_ALWAYS_HIT`)** — first move in this dossier's arc
  confirmed to skip the accuracy-check `Random()` call entirely (`accuracy:
  0` in `src/data/gen/moves.json`, RAM-confirmed: only 2 rolls this move's
  own resolution consumes, crit then spread, vs. 3 for an ordinary
  accuracy-checked damaging move). Engine-slice-relevant: any move-effect
  model needs an explicit "skip the accuracy roll" branch for
  `EFFECT_ALWAYS_HIT`, not just a 100%-accuracy special case (100%
  accuracy still consumes a `Random()` call and can theoretically still
  roll the accuracy-check code path in the source, per turn 9's own
  QUICK_ATTACK note; `accuracy: 0`/`EFFECT_ALWAYS_HIT` is the actual
  distinct bypass).
- **The 93-tick/9-tick sub-offsets around the unattributed RNG step** —
  new precision on an already-known open item (§3), not a new mechanism;
  narrows but does not close test 3.
- **No new stat-stage, status2, or item-trigger mechanism this turn** — all
  three standing falsifiable tests remain unexercised (§4); ROCK_SLIDE and
  AERIAL_ACE are both "plain damaging hit" mechanics already fully covered
  by turns 6-9's own engine-slice needs.

## 7. Turn 11+ boundaries (noted, not densely probed — out of scope this session)

- Turn 11's action-select menu is settled by tick **12899** (§5), matching
  RAM-flat 12898-13606 (re-checked directly, including this session's own
  +300-tick exploratory extension) — the natural starting point for a
  future turn-11 scout.
- `battle-turn-notes.md` §14's own "always ROCK_SLIDE" line's turn 11 is
  **FEATHER_DANCE (no dmg) / ROCK_SLIDE (hit, PP 10→0, ROCK_SLIDE's own
  last-PP use)**, `14→14 (0)` / `38→16 (−22)` — since this session's own
  turn 10 just confirmed both published lines are still bit-identical in
  `gRngValue` (§3), a future turn-11 scout should expect (but still
  RAM/pixel-verify, not assume) the identical outcome, **which would
  finally exercise falsifiable test 1** (FEATHER_DANCE against Onix's
  already-3-turns-floored ATK stage) if it holds true here too.
  `battle1-winline-b-swap.json`'s own segments[90:94] (`A`/30f/`A`/1000f,
  ticks 13306-14340) is the natural next 4-segment span — **another
  zero-navigation-press turn**, matching turn 10's own shape, since
  ROCK_SLIDE's cursor slot is still unchanged.
- ROCK_SLIDE's PP sits at **2/10** entering turn 11 (§4) — if §14's own
  predicted line holds, this would be ROCK_SLIDE's own **last** use before
  PP exhaustion forces a move switch (the mechanic `battle-turn-notes.md`
  §14 first discovered), meaning **turn 12 is the natural next
  PP-exhaustion boundary to watch for**, one turn earlier than a naive
  read of turn 9's own "3 uses left" note might suggest.
- Onix's ATK stage remains at the floor (**0**) entering turn 11, unused a
  third turn running — falsifiable test 1 stays open.
- Neither healthbar crosses a new color zone this turn (§5) — both mons
  are already resting in their turn-9-established zones (Onix red,
  Pidgeotto yellow) entering turn 11.

## Verification

`npm test` and `npm run build` green (no `src/` changes this session — the
only additions are `tools/compare/traces-groundtruth/battle1-turn10-dense.json`,
`tools/probe/specs/turn10-rng-watch.json`, and this doc, per the worktree
brief's constraint). Trace twice-run via `bin/oracle run`, manifests
(208/208 captures) byte-identical across two independent runs, 0 sha
mismatches. RAM probes (`ram-probe.py`, `dump-battler-full.py`,
`dump-battle-bars.py`) each run and their outputs cross-checked internally
(LCG step counts recomputed programmatically from raw values; healthbar
drain counters cross-checked against the authoritative `gBattleMons[].hp`
commit ticks). Cross-check against the already-committed `battle1-winline-
b-swap.json` (12 spot-checked ticks plus a full 13306-tick per-frame
button-state diff, §1) byte-identical. Healthbar color-zone RGB values were
read directly via pixel sampling (PIL), not inferred from HP numbers alone.
