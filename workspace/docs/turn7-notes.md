# Turn 7 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only)

Ground-truth dossier for battle 1's turn 7 (Onix vs. PIDGEOTTO, both still on
their turn-6 sides), on the exact line the engine chain will replay: extends
`tools/compare/traces-groundtruth/battle1-turn6-dense.json`'s own committed
script verbatim with `battle1-winline-b-swap.json`'s own segments[70:74] (the
turn-7 FIGHT-submenu-open, move-confirm, and 1000-frame resolution-idle),
cross-verified against `docs/battle-turn-notes.md` §14 (turns 6-14's own
first pass) and §15/§16 (the winning line, which shares the identical
turns-1-7 prefix — divergence starts turn 8's move choice). **Groundwork
only — no engine code, no `src/` changes**, per this session's worktree
brief. All frame ticks are this dossier's own absolute numbering, shared
with `battle1-turn6-dense.json`/`battle1-winline-*.json` (verified directly
below, not assumed).

Sources: `reference/pokeemerald/src/pokemon.c`, `src/data/gen/{moves,
type-effectiveness}.json`, `bin/oracle symbols`. Oracle probes:
`tools/probe/ram-probe.py` + `tools/probe/dump-battler-full.py` (both
pre-existing, reused unchanged). New committed trace:
`tools/compare/traces-groundtruth/battle1-turn7-dense.json`.

## 1. Prefix-consistency verdict: turn6-dense.json + winline-b-swap[70:74] IS a verbatim, pixel-exact extension

Checked programmatically (button-press-event equality, not assumed): every
one of `battle1-turn6-dense.json`'s 30 non-idle button-press events (ticks
+ button sets) is a verbatim prefix of `battle1-winline-b-swap.json`'s own
73 press events, index-for-index. The next press after turn6-dense.json's
last one (tick 7344, `A`) is `battle1-winline-b-swap.json`'s own index-30
event at **tick 8346** (`A`) — exactly the tick turn6-notes.md §7 predicted
as "the natural starting point for a future turn-7 scout." `winline-b-
swap.json`'s segments[70:74] (`A`(2f) / 30f settle / `A`(2f) / 1000f idle,
1034 frames total) appended verbatim to turn6-dense.json's own 72 segments
(8346 frames) gives **76 segments, 9380 frames** — this dossier's own
committed trace.

**Pixel cross-check** (not required by the brief but cheap and decisive): a
spot-check `bin/oracle run` of `battle1-winline-b-swap.json` with
`captureFrames` restricted to 9 of my own trace's tick numbers (8351, 8391,
8425, 8598, 8719, 8797, 8824, 9036, 9143) produced **byte-identical sha256
at every one** against my own committed trace's own capture of those same
ticks — the composite script reproduces the real winline chain's pixels
exactly, not just its button list. **Verdict: no divergence, exactly one
"turn 7" ground truth to give** (§14's line, §15's line, and §16's line are
still identical through this turn — divergence starts turn 8's move choice,
per turn6-notes §7).

## 2. The committed trace

`tools/compare/traces-groundtruth/battle1-turn7-dense.json`: 76 segments,
9380 frames total (turn6-dense.json's 72 segments + `battle1-winline-b-
swap.json`'s own segments[70:74] verbatim — the turn-7 submenu-open `A`,
30f settle, confirm `A`, and the full 1000-frame resolution-idle). 256
`captureFrames` (the oracle's per-trace cap, hit exactly), dense (stride-1)
over nine windows bracketing every RAM-confirmed transition this turn
(submenu-open + cursor persistence, move confirm, FEATHER_DANCE kickoff,
the mid-kickoff stat change, the ATK-fall message transition+text, the
ROCK_SLIDE kickoff+accuracy+crit+damage-lock, the impact/HP-drain window,
the newly-pixel-confirmed "It's super effective!" message, and the
secondary-effect/turn-end/next-menu-reopen) — see §5 for the exact windows
and what each shows. The prior settle window (ticks up through 8346) is
already covered by `battle1-turn6-dense.json` and was not re-captured here.
**Twice-run byte-identical**: `bin/oracle run`, two independent runs,
manifests (256/256 captures) diffed identical, 0 sha mismatches.

## 3. RNG-consumption ledger for turn 7 (RAM-truthed, LCG-step-counted)

`gRngValue` (`0x3005d80`) sampled every tick 8280-9380 via `ram-probe.py`
(reproduced once, cross-checked structurally against turn6's own §3 shape —
same step pattern). Step counts are verified LCG distances
(`next = 1103515245*v + 24691 mod 2^32`), not tick-diff guesses:

| tick | steps | value after | attribution |
|---|---|---|---|
| 8390 | 1 | `1495764607` | Pidgeotto's **FEATHER_DANCE roll** (`Cmd_accuracycheck`, acc=100 — still consumes a `Random()` call, same rule §3 turn 6 pinned) |
| 8797 | 1 | `2021441158` | Onix's ROCK_SLIDE **accuracy** check (acc=90) |
| 8821 | 1 | `2966311809` | Onix's **crit** roll |
| 8824 | 1 | `2081504352` | Onix's **damage-spread** roll; `gBattleMoveDamage` locks to **31** this same tick (intermediate values 0→11→32→31 over ticks 8822-8824 — the same 3-step STAB/type-multiplier decomposition turn6 §3 flagged, not chased further here either) |
| 9126 | 1 | `637293907` | Onix's **secondary-effect** roll (ROCK_SLIDE's 30% flinch chance) — fires after the HP-drain window, same rule §3 (turns 1, 6) pinned |
| 9136 | 1 | `530710218` | turn-pass bookkeeping (`gRandomTurnNumber`) |
| 9143 | 5 | `1385093289` | opponent-AI next-move-scoring cluster, same "...5" tail shape as §3/§7/turn6's own §3 |

**Total: 11 `Random()` calls this turn** — bit-for-bit the same shape and
count as turn 6's own ledger (1 FEATHER_DANCE + 4 ROCK_SLIDE-family + 1
turn-pass + 5 AI cluster), just at shifted absolute ticks. No `ShouldSwitch()`
2-step pair this turn either.

## 4. Turn order and battler stats (RAM-confirmed, `dump-battler-full.py`)

`gBattlerAttacker` flips **0→1 at tick 8384** (Pidgeotto acts first, same
1-point Speed margin as turn 6 — both battlers' stats are unchanged from
turn 6, no reason for the order to differ): `gCurrentMove` reads **297
(FEATHER_DANCE)** at 8385, then resets to 0 at 8791 and reads **157
(ROCK_SLIDE)** at 8792 with `gBattlerAttacker` back to 0 (Onix). Battler
snapshots (ticks 8280 pre-turn / 9150 post-turn, full struct incl. item —
**new field this session**: Pidgeotto's `item` reads **180 (`ITEM_WHITE_
HERB`)**, matching §7's own data-needs audit finding, not a new item, just
the first time this dossier's own snapshot table cites it directly):

| | ONIX (battler0) | PIDGEOTTO (battler1) |
|---|---|---|
| atk/def/spd/spA/spD | 51/187/76/36/72 (unchanged from turn 6) | 98/61/77/56/56 (unchanged) |
| PP (ROCK_SLIDE / FEATHER_DANCE) | 5 → **4** (6th of 10 uses) | 14 → **13** (2nd of 15 uses) |
| HP before → after | 31 → 31 (unchanged) | 113 → **82** (−31) |
| ATK stat stage before → after | **4 → 2** (another −2, cumulative from turns 6+7) | 6 → 6 (unchanged — WHITE_HERB restores the *holder's own* lowered stats; Onix's ATK is what's lowered here, not Pidgeotto's, so it correctly does not trigger, matching §7's own `HOLD_EFFECT_RESTORE_STATS` semantics) |

**PP pin for the turn-8 divergence** (per this session's brief): after this
turn, ROCK_SLIDE sits at **4/10 PP**, FEATHER_DANCE at **13/15 PP**. Per
turn6-notes §7 / §15 HEADLINE 2, the winline substitutes **BIND** (not
ROCK_SLIDE) at turn 8 — so ROCK_SLIDE's PP stays frozen at 4/10 through
turn 8 on that line, only resuming its decrement from turn 9 onward. Any
engine harness replaying the winline needs to *not* touch ROCK_SLIDE's PP
at turn 8.

### Damage: matches the published ledger (113→82, −31) exactly

`gBattleMoveDamage` locks to **31** at tick 8824. `pidgeottoHp` drops
113→82 (−31) at tick 9036, an exact match, and matches §14's/§16's own
published table for turn 7 (113→82) exactly — no new discrepancy. Not
independently re-derived against `CalculateBaseDamage` this session (same
open item turn6-notes §4 flagged — Onix's ATK stage is now −4 rather than
−2, which would need `gStatStageRatios[2]`, not `[4]`, and that array's
other entries still aren't in this dossier's own RAM watch; not a
contradiction, a formula-reconstruction gap inherited from turn 6, not
re-chased here).

## 5. Pixel/window boundaries (sha256-cited, `battle1-turn7-dense.json`, twice-run identical)

All frame numbers are this dossier's absolute tick numbering. sha256 shown
truncated to 12 hex chars for table width.

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| turn-6 settled menu persists (pre-press baseline) | 8344-8351 | `492e3816c1f0` | same sha as turn6-notes §5's own tick-8122 settled-menu row — direct pixel confirmation this is the identical resting frame, RAM `bg0y` flips 160→320 at 8351 but pixel hasn't caught up yet (1-tick render lag, in contrast with turn6's own "no render lag this time" note at the analogous tick) |
| FIGHT submenu settled, **cursor persistence confirmed** | ~8354 | `80a0e987df06` | pixel-confirmed via direct PNG read: ROCK SLIDE/DRAGONBREATH/BIND/SANDSTORM, PP **5/10**, cursor (`▶`) already on ROCK_SLIDE with **zero navigation button presses** since turn 6 — the same rule §19 (Engine slice F) proved generically, now exercised for real at this exact turn boundary |
| move confirmed (`A` held 8378-8380) | 8378 | `383f3c6a1ec1` | transient press-frame; 8382 (`a437e84ffb72`) reverts to the submenu-open pixels before the kickoff sequence begins, same pattern turn6 §5 noted |
| FEATHER_DANCE kickoff text visible | ~8391-8396 | `6da2440e1e90` (settled by 8396) | "Foe PIDGEOTTO used FEATHERDANCE!" — pixel-confirmed via direct PNG read |

### CORRECTION to turn6-notes.md §5: the "ATK-fall message window" was mislabeled — it is still the kickoff window, plus a full attack animation

Re-verified directly against the **committed** `battle1-turn6-dense.json`
(not re-derived, actually re-run) while building this turn's own analogous
window, because turn 7's own pixels didn't match what turn6-notes §5
implied the sequence should look like at the analogous offset. Direct PNG
reads at turn 6's own ticks 7385, 7450, and 7558 (the exact ticks turn6-
notes §5 cited as "ATK-fall message window starts" / mid-window) **all
still show "Foe PIDGEOTTO used FEATHERDANCE!"** — the kickoff text — with a
feather/starburst **attack animation** playing over Pidgeotto's own sprite
region (visible from ~7450 onward). The actual "ONIX's ATTACK harshly
fell!" text does not appear until **tick 7685** (pixel-confirmed), a full
297 ticks after the RAM stat-stage write at 7391 — not the ~6-tick gap
turn6-notes §5 implied. **The RAM write and the flavor text are not
temporally linked**: `Cmd_statbuffchange`-equivalent commits the stat
change as soon as its own battle-script step executes, well before the
script reaches the later step that prints the "fell" text — the two are
sequential script commands separated by the whole kickoff-animation
duration, not a single message-plus-effect unit. Turn 7 shows the
identical shape as this correction, RAM-and-pixel-confirmed fresh (not
inherited): the kickoff text + animation holds tick **~8396-8685** (289
ticks) — RAM's own `atkStage0` write lands at **8425**, 260 ticks before
the "fell" text itself appears at **8718** — then "ONIX's ATTACK harshly
fell!" holds 8718-~8798 before ROCK_SLIDE's own kickoff text takes over.
**Not a new turn-7 finding — a retroactive correction to turn6-notes §5's
own row labels**, confirmed by directly re-running the already-committed
turn-6 trace, not by assumption. Left for the supervisor to fold into
turn6-notes.md if desired; this session's own deliverable is scoped to a
new file only.

| message-box transition into "ATTACK harshly fell" | 8686-8717 | (see below) | "ONIX's ATTACK harshly fell!" settles at `bcf1f4152822` by tick 8718 |
| "ONIX's ATTACK harshly fell!" text holds | 8718-~8798 | `bcf1f4152822` | RAM: `gCurrentMove` resets to 0 at 8791, `gBattlerAttacker` flips to 0 (Onix) and `gCurrentMove`→157 (ROCK_SLIDE) at 8792, all under this still-static text |
| message-box transition into ROCK_SLIDE kickoff | 8799-8817 | (see below) | "ONIX used ROCK SLIDE!" settles at `e8811187b452` by tick 8818 |
| ROCK_SLIDE kickoff text holds through accuracy/crit/damage rolls | 8818-8967 | `e8811187b452` | RAM: PP dec (8820), crit roll (8821), damage-spread lock **31** (8824) — all resolve silently under this one static text frame, same "RNG doesn't require a pixel change" pattern turn6 established |
| impact animation (rock props on Pidgeotto) | 8968-9001 | 6 distinct frames over 34 ticks | RAM-bracketed by `gBattlerControllerFuncs[1]` phase 8968-9001 |
| HP-bar drain window | 9003-9035 | 10 distinct frames over 33 ticks | settles at `f78bcdc6f037` by tick 9035; `pidgeottoHp` itself commits 113→82 at tick **9036**, 1 tick *after* the pixel-visible drain finishes — the same "RAM commits right after the pixel settle" order turn6 §5 found for its own drain window |
| "It's super effective!" message — **newly pixel-itemized, not cited in turn6-notes §5** | ~9040-9059 (transition) → settled 9060 | `92c9f9307078` | pixel-confirmed via direct PNG read at ticks 9080/9100/9120 (all identical, static through 9122) — ROCK-vs-FLYING's 2× multiplier, already known from `type-effectiveness.json` and turn6's own damage value, simply wasn't dense-captured at this specific sub-window in turn6's own trace (turn6-notes §5 has an uncaptured 96-tick gap, 8019-8115, at the exact analogous position — almost certainly the same message, just not itemized there) |
| secondary-effect/turn-end, text clears, turn-8 menu reopens | 9122 (unchanged) → 9137 (clearing) → 9143 (settled, bg0y flip 0→160 same tick as RAM's own flip) | `92c9f9307078` → `d3270f177537` → `15a8ef75dfb2` | a 1-tick flicker at 9145 (`68d0341ce1b6`) between two otherwise-identical frames (9144, 9146), same pattern as turn6's own tick-8123 flicker, then stable; pixel-confirmed "What will ONIX do?" (Onix 31/117, Pidgeotto's healthbar drained) via direct PNG read at 9146 |

**The 8686-8717 / 8799-8817 pair, re-examined**: turn6-notes §5 claimed its
own analogous pair (7659-7684 / 7765-7784) was "byte-for-byte identical,
not just similar" for the full 26-frame sequence. **Re-verified directly
against the committed turn-6 trace and found to be false**: only the first
**4 frames** match byte-for-byte (turn 6: ticks 7659-7662 ≡ 7765-7768; turn
7: ticks 8693-8696 ≡ 8799-8802), then both pairs diverge for the remainder.
This is actually a cleaner, better-explained finding than turn6-notes'
original claim: the shared 4-frame prefix is the generic message-box-open
slide (fixed border artwork, content-independent — turn6-notes' own
intuition was right about the *mechanism*), but it diverges immediately
once each box starts rendering its own destination text, which differs
between the two occurrences (both this turn and in turn 6, one box opens
into a stat-fall message, the other into a move-kickoff message) — so a
*partial* shared prefix is exactly what the "one generic open routine,
content-independent only briefly" theory predicts, and a full 26-frame
match is not. **Correction to turn6-notes §5's own characterization, not
just a turn-7 finding.**

## 6. New-to-turn-7 mechanism inventory: none — turn 7 repeats turn 6's exact move pair

Per §14/§16's own published ledger and this session's own RAM confirmation,
turn 7 is **FEATHER_DANCE (Pidgeotto, no dmg) / ROCK_SLIDE (Onix, hit)** —
the identical move pair as turn 6, same effect codes
(`EFFECT_ATTACK_DOWN_2`), same RNG-consumption shape (§3), same turn order
(§4). **No new move, animation, or effect is exercised this turn that
turn6-notes §6 didn't already sketch.** The two genuinely new items this
session surfaces are process findings, not new mechanisms: the message-
sequencing correction (§5) and the PP/stat-stage pins for turn 8's move-
choice divergence (§4). Consistent with this dossier's own "characterize,
don't manufacture findings" convention — stated plainly per the brief's own
instruction to report accurately rather than pad.

One item worth flagging for whoever implements the "resolve a status move"
engine slice (extending turn6-notes §6's own sketch): the kickoff-text
window is not a fixed short duration — it holds for as long as the
move's own attack animation takes to play (289 ticks this turn, i.e. a
state machine needs a "wait for animation task completion" gate here, not
a fixed timer), and the RAM stat-stage write happens on a **different,
earlier** script step than the "fell" text — an engine implementation
needs to model these as two independently-timed events (a battle-script
`statbuffchange`-equivalent that mutates state immediately, and a much
later `printstring`-equivalent gated on animation completion), not a single
"stat message" state.

## 7. Turn 8+ boundaries (noted, not densely probed — out of scope this session)

- Turn 8's action-select menu is settled by tick **9146** (§5), matching
  RAM-flat 9143-9380 (re-checked directly, not inferred) — the natural
  starting point for a future turn-8 scout.
- Per §15 HEADLINE 2 / turn6-notes §7, turn 8 is where the winline
  substitutes **BIND** (slot 1, one `RIGHT` press from ROCK_SLIDE's slot 0)
  for ROCK_SLIDE — the first tick this dossier's own "always ROCK_SLIDE"
  and the winline's move choices actually differ. §4's PP pin above is the
  concrete state a turn-8 scout needs to carry forward correctly.
- ROCK_SLIDE's PP will hit 0 at the end of §14's own "always ROCK_SLIDE"
  line's turn 11 (that line never substitutes BIND, so it uses one PP per
  turn 6-11 straight); on the **winline** (BIND at turn 8), ROCK_SLIDE's
  PP exhaustion is deferred by exactly one turn's worth of non-use. Either
  way, PP tracking remains a hard requirement per turn6-notes §7/§14.

## Verification

`npm test` and `npm run build` green (no `src/` changes this session — the
only additions are `tools/compare/traces-groundtruth/battle1-turn7-dense.json`
and this doc, per the worktree brief's constraint). Trace twice-run via
`bin/oracle run`, manifests (256/256 captures, every sha256) byte-identical
across two independent runs. RAM probe (`ram-probe.py`) re-run and diffed
against its own structural expectations (LCG step counts recomputed from
raw values, not trusted from a single pass); `dump-battler-full.py` re-run
independently, same values both times. Cross-check against the already-
committed `battle1-winline-b-swap.json` (9 spot-checked ticks, §1) also
byte-identical. The §5 correction block was verified by directly re-running
the **already-committed** `battle1-turn6-dense.json` (not a fresh guess),
twice, both times reproducing the same "kickoff text persists, ATK-fall
text starts at 7685" result.
