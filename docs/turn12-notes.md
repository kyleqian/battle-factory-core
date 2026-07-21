# Turn 12 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only) — SCOPE CORRECTION: turn 12 is a ROCK_SLIDE miss, not Pidgeotto's faint

**Headline, stated up front because it corrects the brief's own premise**:
this session's brief predicted turn 12 as "Pidgeotto's FAINT + MURKROW's
switch-in", reasoning that a ROCK_SLIDE hit at the ATK floor (~21-23 damage)
would finish Pidgeotto's 16 HP. **RAM says otherwise, directly**: entering
turn 12 ROCK_SLIDE is already at **1/10 PP** (not the brief's assumed 2/10 —
`docs/turn11-notes.md` §4's own table already recorded 2/10→1/10 *during*
turn 11, a fact this session re-confirms, not contradicts), and this turn
Pidgeotto's own **AERIAL_ACE acts first** (hits Onix 14→**4**, −10) while
Onix's **ROCK_SLIDE misses** (Pidgeotto stays **16→16**, unchanged) —
**bit-exact to `battle-turn-notes.md` §15's own published line's turn-12
row** (`14→4 (−10)` / `16→16 (0)`), extending this dossier chain's own
"reconvergence" streak (turns 9/10/11) a fourth turn, now through a
PP-exhaustion boundary rather than in spite of one, exactly as
`turn11-notes.md` §7 itself already flagged as the live risk ("a forced
switch off ROCK_SLIDE once PP hits 0... exactly the kind of turn where
move-selection logic could plausibly diverge the two lines"). It doesn't
diverge here — the miss/no-faint outcome matches the *other* published
line too, it's simply not the outcome the brief's own working assumption
predicted. **Nobody faints this turn; Murkrow does not switch in this
turn.** A light (RAM-only, not densely probed — explicitly out of this
session's own scope) look one and two turns further confirms Pidgeotto's
actual faint happens at **turn 13** (Onix's DRAGON_BREATH, not ROCK_SLIDE,
which is now PP-exhausted) and Murkrow's switch-in follows immediately
after — see §6. **The REUSE MAP the brief asked for as this dossier's
centerpiece cannot be built from turn 12's own ground truth, because turn
12 doesn't exercise the faint/switch-in machinery at all**; §7 explains
exactly why and hands off what a turn-13 scout needs to pick this up
directly.

Everything else this session was asked to do — dense per-frame ground
truth, an RNG ledger, a sha-cited boundary table, turn-order/battler-state
confirmation, PP tracking — **was done in full for turn 12 as it actually
plays out**, to the same standard as turns 9-11. Sources:
`reference/pokeemerald/src/battle_message.c` (`sText_NotVeryEffective`,
`sText_MoveMissed` family), `docs/turn11-notes.md` (this dossier's own
direct predecessor and the source of the stale-PP mismatch), `docs/
battle-turn-notes.md` §14/§15 (the two independently-derived published
lines this session's own line reconverges with again), `docs/
faint-switch-notes.md` (the turn-5 faint/switch-in machinery this
dossier's own reuse-map section explicitly defers against, for whoever
scouts turn 13). Oracle probes: `tools/probe/ram-probe.py` +
`tools/probe/dump-battler-full.py` (both pre-existing, reused unchanged)
plus a new watch spec, `tools/probe/specs/turn12-rng-watch.json` (committed,
identical column set to `turn10-/turn11-rng-watch.json`). New committed
trace: `tools/compare/traces-groundtruth/battle1-turn12-dense.json`.

## 1. Prefix-consistency verdict: turn11-dense.json + winline-b-swap[94:98] IS a verbatim, pixel-exact extension

- **Full per-frame equality**: flattened the extended 100-segment script
  (`turn11-dense.json`'s own 96 segments + `battle1-winline-b-swap.json`'s
  own segments[94:98]) and `battle1-winline-b-swap.json`'s own full 156
  segments to per-tick button state for all 15374 shared ticks — **0
  diffs**, `combined == wl[:15374]` checked directly (the same 4-segment
  slice `turn11-notes.md` §7 itself named as "the natural next span to
  extend", confirmed to be exactly this).
- **Pixel cross-check**: a spot-check `bin/oracle run` of
  `battle1-winline-b-swap.json` with `captureFrames` restricted to 8 of
  this dossier's own committed tick numbers (14338, 14384, 14454, 14521,
  14630, 14710, 14790, 15374) produced **byte-identical sha256 at every one
  of the 6 ticks that fall inside this dossier's own committed
  `captureFrames` set** (14454 and 15374 aren't in this dossier's own
  capture set, so weren't cross-checkable here — not a mismatch, simply
  not captured).
- Tick 14338-14344's own sha (`db251fad6c61`) is **byte-identical** to
  `turn11-notes.md` §5's own cited sha for tick 13897 ("What will ONIX
  do?", turn-12 baseline) — direct confirmation that this dossier's own
  absolute tick numbering lines up exactly with `turn11-notes.md`'s own,
  the same cross-check turns 10-11 each performed against their own
  predecessor.

**Verdict: the composite script reproduces the real winline chain's pixels
exactly**, matching every prior turn's own discipline.

## 2. The committed trace

`tools/compare/traces-groundtruth/battle1-turn12-dense.json`: 100 segments,
15374 frames total (`turn11-dense.json`'s 96 segments + `battle1-winline-
b-swap.json`'s own segments[94:98] verbatim — the turn-12 submenu-open `A`,
30f settle, confirm `A` with **no** navigation press, and the full
1000-frame resolution-idle — the same zero-nav shape turn 11 also used,
cursor still resting on ROCK_SLIDE). 252 `captureFrames` (under the
oracle's 256 cap), dense (stride-1) over seven windows bracketing every
RAM-confirmed transition this turn (submenu-open/settle, the confirm-press
transient into AERIAL_ACE's own kickoff-text-typing, the hit-flash-to-HP-
drain window, the unattributed-step/ROCK_SLIDE-curMove/accuracy-miss-roll
cluster, the ROCK_SLIDE kickoff-text typing, the transition into "ONIX's
attack missed!", and the turn-end/turn-13-menu-resettle window), plus
sparse representative sampling of the uneventful holds (the AERIAL_ACE-
kickoff-to-hit-flash gap, the post-drain "not very effective" hold, the
ROCK_SLIDE-kickoff-to-miss-message gap, the miss-message hold, and the
turn-13 menu's own idle cycle out to tick 15374), matching turns 6-11's
own "boundary + representative sampling" convention. **Twice-run
byte-identical**: `bin/oracle run`, two independent runs, manifests
(252/252 captures) diffed identical, 0 sha mismatches.

## 3. RNG-consumption ledger for turn 12 (RAM-truthed, LCG-step-counted)

`gRngValue` (`0x3005d80`) sampled every tick 14290-15374 via `ram-probe.py`
(`tools/probe/specs/turn12-rng-watch.json`). Entering this turn,
`gRngValue` is flat at **`3813709783`** (matches `turn11-notes.md` §3's own
final settled value exactly) — zero `Random()` calls consumed by this
turn's own zero navigation presses, the fifth turn running confirming that
rule.

| tick | steps | value after | attribution |
|---|---|---|---|
| 14415 | 1 | `1591642366` | Pidgeotto's **AERIAL_ACE crit roll** — **no accuracy roll consumed** (`EFFECT_ALWAYS_HIT`, matching `turn10-notes.md`'s own "AERIAL_ACE always-hit" finding directly) |
| 14418 | 1 | `2767329433` | AERIAL_ACE's **damage-spread roll**; `gBattleMoveDamage` locks to **10** this same tick (intermediate values 8→15→11→10 over ticks 14416-14418) — 3 ticks after the crit roll, the same offset turns 6-11's own ROCK_SLIDE crit→spread gap already established, now confirmed on a different move too |
| 14614 | 1 | `3723065240` | **the "unattributed step" recurs** — absent last turn (§3 of `turn11-notes.md`, when the first move dealt no damage), it's back this turn, at **exactly** the offsets turns 9-10 established: **93 ticks after the first move's own HP-commit** (14521→14614, bit-exact to turn 9/10's own 93-tick gap) **and exactly 9 ticks before `gCurrentMove` updates to ROCK_SLIDE** (14614→14623, bit-exact to turn 9/10's own 9-tick gap). A strong positive re-confirmation of `turn11-notes.md`'s own hypothesis: the step's call site tracks a *damaging* first move's own HP-commit path, not a fixed per-turn cost — now confirmed on a 4th independent turn (2, 9, 10, 12) with the exact same double offset, and absent on the one turn (11) whose first move dealt no damage |
| 14628 | 1 | `3060309035` | Onix's **ROCK_SLIDE accuracy check** (acc=90) — **MISSES**, the first ROCK_SLIDE miss in this dossier's own committed line (turn 8's own miss was BIND, a different move); fires **5 ticks** after `gCurrentMove`→157 (14623), matching turns 6/7/9/10/11's own ROCK_SLIDE-specific offset exactly. **No crit/spread/secondary roll follows** — a miss consumes exactly 1 `Random()` call, the same rule this dossier already established |
| 14780 | 5 | `1046608066` | opponent-AI next-move-scoring cluster, same "...5" tail shape as every prior turn |

**Total: 9 `Random()` calls this turn** across 5 distinct events — 2 fewer
events and 2 fewer steps than turn 11's 11/7, entirely accounted for by (a)
AERIAL_ACE consuming no accuracy roll (always-hit) where FEATHER_DANCE did,
and (b) ROCK_SLIDE's own miss skipping the crit/spread/secondary rolls
entirely, where a hit consumes 3 more. A small, moot `gBattleMoveDamage`
scratch write (`0`→`2`) follows at tick 14785, alongside the AI-scoring
cluster — not attributed to an actual move resolution, matching this
dossier's established "leftover AI-scan scratch value" pattern.
`gRngValue` stays flat from tick 14787 through this trace's own final tick
15374 (RAM-checked directly) — the turn-13 menu is again a genuine
RNG-free rest.

## 4. Turn order, battler stats, PP exhaustion, and the standing falsifiable tests (RAM-confirmed)

`gBattlerAttacker` flips **0→1 at tick 14378** (Pidgeotto acts first again,
the same 1-point Speed margin as every prior turn). `gCurrentMove` reads
**332 (AERIAL_ACE)** at 14379, resets to 0 at 14622, then reads **157
(ROCK_SLIDE)** at 14623 with `gBattlerAttacker` back to 0 (Onix).
Battler snapshots (`dump-battler-full.py`, ticks 14300/15374 — i.e.
immediately before the press and immediately after the trace's own final
tick):

| | ONIX (battler0) | PIDGEOTTO (battler1) |
|---|---|---|
| atk/def/spd/spA/spD | unchanged from turn 11 (51/187/76/36/72) | unchanged from turn 11 (98/61/77/56/56) |
| moves (id) / PP before → after | ROCK_SLIDE(157) **1/10 → 0/10 (10th and final use — PP EXHAUSTED this turn, whether it hits or misses)**, BIND(20) 19/20 (unchanged), DRAGON_BREATH(225) 19/20 (unchanged), SANDSTORM(201) 10/20 (unchanged) | AERIAL_ACE(332) **19/20 → 18/20 (reused)**, QUICK_ATTACK(98) 29/30 (unchanged), FEATHER_DANCE(297) 11/15 (unchanged — not reselected), SAND_ATTACK(28) 15/15 (unchanged) |
| HP before → after | 14 → **4 (−10)** | 16 → **16 (unchanged — ROCK_SLIDE missed)** |
| ATK stat stage before → after | **0 → 0 (unchanged — AERIAL_ACE doesn't touch stats; floor persists a 5th consecutive turn, 8-12)** | 6 → 6 (unchanged) |
| item | 0 (none) | 180 (`ITEM_WHITE_HERB`, unchanged — still nothing to restore) |
| status1/status2 | 0/0 (unchanged) | 0/0 (unchanged) |

**PP note, correcting the brief's own stale premise directly**: the
brief's entering-turn-12 state said "ROCK_SLIDE 2/10" — RAM shows **1/10**
entering this turn (`turn11-notes.md` §4's own table already recorded this
exact value as turn 11's own *exit* PP; this session's own RAM re-confirms
it, not a new finding, just a correction of the brief's own arithmetic).
This turn is therefore the PP-exhaustion boundary `turn11-notes.md` §7
itself predicted ("turn 12, not 11... where PP finally hits 0"), landing
exactly on schedule — the miss simply means this specific boundary
resolves via a whiff rather than a last successful hit.

### The three standing falsifiable tests: unchanged this turn (1 and 2 unexercised, 3 positively re-confirmed)

- **Test 1** (ATK-floor "won't go any lower!"): **not exercised this
  turn** — Pidgeotto's AI reselects AERIAL_ACE, not FEATHER_DANCE. Already
  resolved positive (`turn11-notes.md`); the floor persists RAM-flat at 0,
  unused a 5th consecutive turn.
- **Test 2** (BIND actually hitting): **still entirely unexercised** — even
  with ROCK_SLIDE now PP-exhausted, Onix's AI reselects... see §6 below (a
  light, out-of-scope peek shows turn 13 picks DRAGON_BREATH, not BIND).
- **Test 3** (the unattributed-RNG-step call site): **positively
  re-confirmed a 4th time**, bit-exact offsets (§3) — the strongest
  evidence yet that this step's call site sits inside a damaging move's
  own HP-commit/drain-completion path, still not grepped to an exact
  `battle_script_commands.c` line (time-boxed, same as every prior
  session).

### Damage and effectiveness, PNG-confirmed directly (not assumed from the type chart)

AERIAL_ACE (FLYING) vs. Onix's ROCK/GROUND typing PNG-reads **"It's not
very\neffective.."** (`sText_NotVeryEffective`) — worth stating precisely
because it's easy to get backwards from memory: Flying is 0.5× vs. Rock
and has **no** dedicated Flying-vs-Ground chart entry (there is no
"Flying is super effective against Ground" rule in this generation's
chart, despite that being a common conflation with the *reverse*
Ground-move-vs-Flying-immunity rule), so the combined multiplier is
0.5×1×=0.5×, not neutral or super-effective — confirmed by direct PNG read
(tick 14600) rather than hand-computed and trusted blind, per this
dossier's own standing discipline. `gBattleMoveDamage` locks to **10**
(§3); `hp0` (Onix) drops 14→4 at tick 14521 (1-tick-lag rule holds:
bar-done sentinel one tick earlier). ROCK_SLIDE's own miss means
Pidgeotto's HP never moves (`hp1` RAM-flat 16 the entire window) and no
type-effectiveness message prints for it at all — PNG-confirmed, the
screen goes straight from the kickoff text to "ONIX's\nattack missed!"
(§5).

## 5. Pixel/window boundaries (sha256-cited, `battle1-turn12-dense.json`, twice-run identical)

All frame numbers are this dossier's absolute tick numbering (shared with
`battle1-turn6/7/8/9/10/11-dense.json`/`battle1-winline-*.json`). sha256
shown truncated to 12 hex chars for table width. Every text-content label
below is **PNG-read**, not inferred from RAM alone.

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| pre-press baseline | 14338-14344 | `db251fad6c61` | byte-identical to `turn11-notes.md` §5's own cited sha at tick 13897 — confirms tick-numbering continuity directly (§1) |
| transition sub-frame | 14345 | `a173d834997e` | matches the same sub-frame sha `turn11-notes.md` §5 cites for its own analogous transition |
| FIGHT submenu open, settled, cursor **already on ROCK_SLIDE** (**zero navigation presses**) | 14346-14350 | `713aa10cfa28` | cursor-persistence rule holds a 5th turn running; PP reads **1/10** (PNG- and RAM-cross-matched) |
| pre-confirm plateau | 14373-14375 | `b8fb185838c1` | held ~23 ticks before the confirm press |
| confirm-press transient (settled-submenu sha recurs) | 14376-14383 | `713aa10cfa28` | `gBattlerAttacker`→1 (14378) and `gCurrentMove`→332 (14379) both land inside this still-static window — same "RAM update precedes the pixel transition" rule turns 9-11 established |
| AERIAL_ACE kickoff text typing in | 14384-14411 | (letter-by-letter) | **PNG-read** at 14384/14400/14410 (mid-typing), settled by 14412: "Foe PIDGEOTTO used\nAERIAL ACE!" |
| AERIAL_ACE kickoff text held, through a hit-flash flicker and into the HP-drain onset | 14412-14509 | `ca8bf06021b4` recurs 4 times (14412-14422, 14462-14472, 14498-14499, 14504-14509), interleaved with distinct hit-flash frames at 14432/14442/14452 (Onix's own sprite recolored orange/inverted — **PNG-confirmed**, a hit-flash flicker analogous to `faint-switch-notes.md` §3a's own `SpriteCB_Flicker`-family mechanism, here on a different battler) and a short flicker pair at 14482/14492 | text stays fully typed and static throughout — the whole hit animation plays under a held message, same rule every prior turn's animations already followed |
| HP-drain (Onix), per-tick bar animation | 14510-14524 | (per-tick, 14 distinct shas) → settles `5b1e7929cda0` (14519-14524) | **PNG-read**: 13/117 (14510) draining down to **4/117** (14520+, zoomed-crop-confirmed); RAM `hp0` commits 14→4 at 14521, the usual 1-tick lag past the bar-done sentinel |
| transition into "It's not very effective.." | 14525-14551 | (mostly letter-by-letter, with a short pre-typing wobble 14525-14544) | **PNG-read** at 14540 (mid-typing, "It's not very ef") |
| "It's not very effective.." held | 14552-14629 | `376db54b61d2` | **PNG-read** at 14600: "It's not very\neffective.." — matches `sText_NotVeryEffective` (§4's own note on why); holds 78 ticks through the unattributed RNG step (14614) and `gCurrentMove`'s own reset/update to ROCK_SLIDE (14622-14623), all silent under the still-static text |
| transition into "ONIX used\nROCK SLIDE!" | 14630-14648 | (letter-by-letter) | **PNG-read** at 14640 (mid-typing); the accuracy-miss roll (14628) resolves 2 ticks *before* this transition even starts, still under the previous message |
| "ONIX used\nROCK SLIDE!" held (the miss — no further rolls) | 14649-14685 | `760b178a4259` | **PNG-read**; RAM confirms exactly 1 `Random()` call for this move, no crit/spread/secondary follow-up |
| transition into "ONIX's\nattack missed!" | 14686-14704 | (letter-by-letter) | **PNG-read** at 14700 (mid-typing) |
| **"ONIX's\nattack missed!" held — this turn's headline text** | 14705-14780 | `1aabdcb03ee5` | **PNG-read**, exact — the first ROCK_SLIDE miss in this dossier's own committed line (turn 8's miss was BIND, a different move/message) |
| turn-13 resettle transition | 14781-14789 | `0e26952eb6a2` / `882e3c818195` / `5646ba2c6ca9` (sub-frames) | RAM: `gBattleMainFunc` dispatcher resets 14778-14780, the 5-step opponent-AI-scoring cluster fires at 14780 (§3), a moot `gBattleMoveDamage` scratch write follows at 14785 |
| turn-13 menu settled ("What will ONIX do?", Onix now **4/117**) | 14790-14798 | `882e3c818195` | **PNG-read** (zoomed crop): "ONIX ♂ Lv50 ... 4/117" |
| turn-13 menu idle, cycling (not perfectly flat) | 14799-15374 | cycles among `882e3c818195`/`bd3cee3f4041`/`5646ba2c6ca9`/`f3d4f434717a` at coarser-than-stride-1 sampled intervals in this dossier's own capture set | same "longer multi-plateau idle loop, not a single-tick blip" shape `turn11-notes.md` §5 already flagged for its own turn-12 idle tail; RAM stays flat throughout (re-checked directly), a purely cosmetic idle loop |

## 6. Turn 13-14 boundary notes (light RAM-only scan, NOT densely probed — explicitly out of this session's own scope, provided so the next lane can be correctly retargeted)

A light RAM scan (same `ram-probe.py` watch spec, extended through
`battle1-winline-b-swap.json`'s own segments[98:114], i.e. two more turn
blocks — **no dense pixel capture, no committed trace for this span**)
locates the actual faint/switch-in event precisely:

- **Turn 13**: Pidgeotto's AI selects **SAND_ATTACK** (curMove 28, a single
  `Random()` step at tick-offset+5 from kickoff, no damage). Onix's own
  submenu opens with **one DOWN press** in the winline script and RAM's
  own `gMoveSelectionCursor` reads **2** afterward (not 1) — an oddity not
  chased this session (whether this is a double-decrement-per-press
  quirk or something else is an open question, flagged rather than
  guessed at). Onix's own move resolves to **DRAGON_BREATH** (curMove
  225, Onix's own slot 2) — accuracy + crit rolls both succeed, damage
  locks to **17**, and `hp1` (Pidgeotto) drops **16→0 at RAM tick
  15887 — Pidgeotto FAINTS**, not from ROCK_SLIDE (already PP-exhausted
  and not reselected) but from DRAGON_BREATH.
- **The button-gated KO hold recurs, script-confirmed**: `battle1-winline-
  b-swap.json`'s own segments[104] is a lone `A` press sitting mid-turn-13's
  own resolution window (between two long idle segments) — the same
  `battle-turn-notes.md` §24 shape (an A-press required mid-faint before
  the switch-in sequence can proceed) recurring for this second faint,
  script-confirmed (not yet pixel-confirmed) to sit at the expected
  position.
- **Murkrow switches in**: `hp1` jumps **0→142** at RAM tick 16944
  (coincident with `gCurrentMove` resetting), matching Murkrow's own
  known max HP exactly. A `dump-battler-full.py` snapshot at RAM tick
  17000 (**light lookahead only**, not part of this session's own
  committed scope) reads: **species 198 (MURKROW)**, atk 91/def 69/spd
  97/spAtk 91/spDef 69, types **[17,2] = DARK, FLYING**, moves **[185, 19,
  259, 269] = FAINT_ATTACK, FLY, TORMENT, TAUNT** (PP 20/15/15/20, all
  full/unused), ability **15 = INSOMNIA**, item **221 = LAX_INCENSE**
  (source-checked directly against `reference/pokeemerald/include/
  constants/{abilities,items}.h` — **not** `BRIGHT_POWDER`, correcting
  this dossier chain's own earlier citation at `battle-turn-notes.md`
  line 262, which named the wrong item for this specific rental slot),
  hp 142/142. This is an **independent third RAM confirmation** of the
  moveset `docs/faint-switch-notes.md` §1 first source-derived and
  `battle-turn-notes.md` §15 first RAM-truthed in a *different* line —
  now confirmed a third time, in *this* dossier's own committed b-swap
  line specifically.
- **Turn 14 opens with Murkrow using FLY** (curMove 19 — **correcting an
  in-session mis-scan**: 19 is `MOVE_FLY`, not `MOVE_BIND` [20] — this
  session's own first-pass ledger briefly mislabeled it before cross-
  checking `constants/moves.h` directly) — Murkrow's own `status2` flag
  sets `4096` at tick 17820, almost certainly FLY's semi-invulnerable
  charge-turn flag, not a wrap/trap flag. Onix's own DRAGON_BREATH follows
  (curMove 225) with **no RAM-visible roll or HP change** in the sampled
  window before this light scan stopped — whether it missed, whether FLY's
  own invulnerability blocked it entirely, or whether the sampling simply
  missed a roll, is **not resolved** and not chased (well out of scope).

**None of §6 is pixel-verified, sha-cited, or twice-run** — it exists only
to correctly redirect whoever scouts the actual faint/switch-in window
next: **the natural target is `battle1-winline-b-swap.json`'s own
segments[98:106]** (the turn-13 NAV-then-resolve block plus its own
button-gated KO-dismiss press at segment 104), not segments[94:98] (which
this session's own dense work fully covers, per §1-§5 above).

## 7. Why the REUSE MAP can't be built from turn 12, and what a turn-13 scout needs

The brief's own centerpiece ask — "for each mechanism [faint sink,
ball/particles/materialize, healthbox slide-in, held-item proc], state
whether it's turn-5 machinery verbatim, structurally different, or new" —
requires the faint/switch-in sequence to actually run. **It doesn't run
this turn** (§4-§5): turn 12 is a plain miss/counter-hit turn with no
faint, no switch, no new sprite/animation mechanism of any kind — every
pixel event this turn (kickoff text, hit-flash, HP-drain, effectiveness
message, miss message, menu resettle) is already-documented machinery
turns 6-11 established, reused unchanged. There is nothing here to map
against `docs/faint-switch-notes.md`'s own turn-5 catalog.

**For whoever scouts turn 13 (where the real event is, per §6)**: expect
the reuse map's shape to mirror turn 5's own almost exactly, since nothing
about *this* battle's own mechanics suggests a structurally different
animation is coming — `faint-switch-notes.md`'s own "Bottom line for the
engine slice" table (faint sink, materialize stretch, particle burst,
ball prop, materialize tint, healthbox slide-in) should all be **(i)
verbatim reuse with new parameters**: Pidgeotto's own `gMonFrontPicCoords`
`yOffset` (already extracted, `mon-pic-coords.json`) feeding the faint-sink
closed form in place of Grovyle's, Murkrow's own corner via the
`(144, 8+yOffset)` formula §5 of `faint-switch-notes.md` already
generalizes, Murkrow's own healthbox contents (species/level/gender),
and new handoff ticks throughout (this session's own light scan gives a
starting anchor: faint commit 15887, switch-in species-flip 16944 — not
pixel-verified, treat as a rough starting point only). **Key unknowns for
that session to resolve, not guessed at here**:
- **Murkrow's held item, LAX_INCENSE (§6), has no on-switch-in proc** —
  unlike Sitrus Berry's HP-threshold heal, `HOLD_EFFECT` for evasion-boost
  items doesn't fire on entry, so the turn-13/14 scout should expect **no**
  held-item animation analogous to §12-15 of `faint-switch-notes.md`'s own
  Sitrus proc chain, at least not on the switch-in itself.
- **Whether this is a "second switch-in" with any first-switch-only steps
  skipped** — `faint-switch-notes.md` never tested this (Grovyle→Pidgeotto
  was DESTIN's *first* switch of that dossier's own arc); Pidgeotto→Murkrow
  is DESTIN's *second*. Worth checking explicitly rather than assuming
  identical.
- **DESTIN's own send-out text variant** — not PNG-read this session
  (§6 is RAM-only); "BUG CATCHER DESTIN sent\nout MURKROW!" is the expected
  string family but wasn't confirmed against the PNG.
- **Onix's own state entering the window** (HP 4/117, deep red, ATK still
  floored at 0) is different from turn 5's own entering state (Onix full
  HP) — worth checking whether anything (a low-HP cue, a different idle
  animation) changes as a function of Onix's own critical HP during this
  specific switch-in, since no prior dossier in this arc has had the
  *player's* own mon this low during an opponent switch-in before.

## Verification

`npm test` and `npm run build` green (no `src/` changes this session — the
only additions are `tools/compare/traces-groundtruth/battle1-turn12-dense.json`,
`tools/probe/specs/turn12-rng-watch.json`, and this doc, per the worktree
brief's constraint). Trace twice-run via `bin/oracle run`, manifests
(252/252 captures) byte-identical across two independent runs, 0 sha
mismatches. RAM probes (`ram-probe.py`, `dump-battler-full.py`) each run
and cross-checked internally (LCG step counts recomputed programmatically
from raw values via the standard `v*1103515245+24691 mod 2^32` step
function; PP/HP deltas cross-checked against `dump-battler-full.py`
snapshots at the window's own start/end ticks). Cross-check against the
already-committed `battle1-winline-b-swap.json` (6 spot-checked ticks plus
a full 15374-tick per-frame button-state diff, §1) byte-identical. Every
sha256 cited in §5's table was independently re-read from this session's
own committed trace's own first-run manifest at exactly the cited tick
before being written into the table, per the brief's own double-check
instruction. Every PNG text claim in §4-§5 was read directly from a
rendered frame (several via a zoomed PIL crop for small HP-digit text),
not inferred from RAM or `src/data/gen/moves.json` alone. §6 is explicitly
flagged as light/unverified lookahead, not held to the same bar.
