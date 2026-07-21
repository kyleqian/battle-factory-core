# Turn 9 post-lunge window ground truth (S7 slice R rungs c3/c4 prep)

Bounded-worker probe session, per the supervisor's brief: ground-truth the
window right after rung (c1)'s own lunge (RAM ticks ~10930-11092) so rungs
c3/c4 land first-try. **No `src/` changes.** All facts below are re-derived
fresh this session (fresh `/Users/kyle/Developer/pokebench/vendor/mgba-venv/
bin/python` RAM probes + fresh `bin/oracle run` pixel captures over HTTP) —
`docs/turn9-notes.md`'s own prose ranges were treated as leads, not truth,
per the standing rule.

**Live anchor**: `pressTick = 10871` (`docs/battle-turn-notes.md` §38,
reused unchanged — reconfirmed by this session's own RAM reads matching
§36/§38's tables exactly at every cross-checked tick, see below). All
`n = ramTick - 10871` offsets below use this anchor.

Tools: `tools/probe/dump-endeavor-tail.py` (pre-existing, reused verbatim —
already reads exactly the two sprites this session needed: `gBattlerSpriteIds
[0]` = Onix's own real sprite, `gHealthboxSpriteIds[0]` = Onix's own
healthbox) and `tools/probe/dump-quickattack-anim.py` (pre-existing, reused
verbatim — slot 6 = Onix, slot 7 = hitsplat, per §36's corrected inventory).
Both segfault on Python interpreter teardown (exit code 139) but write their
JSON output correctly before crashing — a pre-existing harness quirk, not
a bug in this session's work; verified by checking the JSON is well-formed
and matches expectations before trusting it (see PAPERCUT below).

New committed tool: `tools/probe/verify-turn9-postlunge.ts` — reruns a
fresh oracle capture and asserts every boundary/parity claim below
programmatically (pixel-only; RAM claims are cross-cited from the two probe
runs above, not re-asserted by the TS script since RAM reads need the
mgba-venv python, not plain `node`). **71/71 checks pass** against a fresh
capture as of this session.

## 1. Episode 1 (RAM 10934-10943): hitsplat + Onix's own x2 shake — RAM-reverified, render lag pinned

### Hitsplat (slot 7)

Fresh RAM read (`dump-quickattack-anim.py`, ticks 10924-10950): `inUse`
flips **False→True at RAM 10934** (position locks to `(72,88)`, matching
§36 exactly) and **True→False at RAM 10944** (position resets to the
sentinel `(304,160)` off-screen). **RAM-live span: 10934-10943 inclusive,
exactly 10 ticks** — matches `drawEndeavorHitsplats`'s own
`ENDEAVOR_HITSPLAT_VISIBLE_TICKS = 10` convention precisely; this is the
same "10-tick hitsplat" shape, just needing its own delay/position constants
for turn 9's target (Onix, not Grovyle/Pidgeotto).

Pixel-reverified (`verify-turn9-postlunge.ts`'s own `HITSPLAT_BOX` region,
`x:56-88,y:72-104`, fresh oracle vs. the 10924 baseline): **first diff at
render 10935, last diff at render 10944, byte-identical to baseline again at
10945** — a clean **render = RAM + 1** lag (10 render ticks, one past the 10
RAM ticks), matching the hitsplat/droplet/text 1-tick lag family this
codebase already established (`docs/battle-menu-notes.md` §15f, `battleScene
.ts`'s own `ENDEAVOR_HITSPLAT_RENDER_LAG = 1`).

### Onix's own x2 shake (`AnimTask_ShakeTargetBasedOnMovePowerOrDmg`, slot 6)

Fresh RAM read confirms §36's table exactly: `x2` sequence over RAM
10934-10945 is `0,0,5,5,0,0,5,5,0,0,0,0` (nonzero only at **10936, 10937,
10940, 10941**), `y2` flat 0 throughout. Cross-checked against a SECOND,
independent probe run (`dump-endeavor-tail.py`'s own `onixX2` field) —
byte-identical values, both runs.

**Render lag, pixel-isolated** (`verify-turn9-postlunge.ts`'s `ONIX_BOX`
region MINUS the hitsplat's own overlapping footprint, since the 32x32
hitsplat sprite covers most of Onix's lower-left silhouette and would
otherwise confound the shake's own signature): the shifted silhouette
appears at render ticks **10935, 10938, 10939, 10942, 10943** and is at rest
(matches baseline) at **10936, 10937, 10940, 10941, 10944**. This is **render
= RAM + 2** (RAM 10936/10937/10940/10941 → render 10938/10939/10942/10943),
**not** the hitsplat's own +1 family — matching this codebase's existing
"shake/squish are RAM+2, NOT droplet/hitsplat/text's own separate RAM+1
family" rule verbatim (`battleScene.ts` comment above `dragonBreathShakeX2`,
citing `ENDEAVOR_SHAKE_RENDER_LAG`/`ENDEAVOR_SQUISH_TABLE`) — reused, not
re-derived, but now independently pixel-confirmed for THIS shake instance
too.

**One genuine anomaly, matching a known precedent shape**: render tick
**10935** ALSO shows the shifted silhouette, one tick before the `RAM+2`
rule alone would predict (RAM 10933 = 0, so plain `RAM+2` predicts 10935 to
be at rest). This is the same "creation-tick stall" phenomenon
`docs/battle-menu-notes.md` §15f's own doc comment already names for a
different task's setup call ("the fade-out task's own creation-tick stall...
adds a 2nd stall tick on top of the 1-tick RAM/pixel gap") — here the shake
task's OWN first invocation (which happens to coincide with the hitsplat's
own creation tick, RAM 10934) appears to apply its first offset one tick
early. **Engine implication**: the shake table's render-side entry for
table-index 0 needs an extra explicit tick (render 10935) beyond the plain
`RAM+2` formula's prediction — model it as a literal extra table row, not a
formula tweak, exactly as `ENDEAVOR_HITSPLAT_ROUNDS`/`ENDEAVOR_SQUISH_TABLE`
already do for their own boundary quirks.

### Per-tick render table (RAM ticks, `n = ramTick - 10871`)

| RAM tick | n | slot 6 x2 | hitsplat (slot 7) | render tick(s) affected |
|---|---|---|---|---|
| 10934 | 63 | 0 | created, (72,88) | 10935 (hitsplat visible; shake's own stall tick, see above) |
| 10935 | 64 | 0 | present | — |
| 10936 | 65 | **5** | present | 10938 (shake, RAM+2) |
| 10937 | 66 | **5** | present | 10939 |
| 10938 | 67 | 0 | present | — |
| 10939 | 68 | 0 | present | — |
| 10940 | 69 | **5** | present | 10942 |
| 10941 | 70 | **5** | present | 10943 |
| 10942 | 71 | 0 | present | — |
| 10943 | 72 | 0 | present (last live RAM tick) | 10944 (hitsplat last visible render, RAM+1) |
| 10944 | 73 | 0 | **destroyed** | — |

Frame **10947** is confirmed byte-identical to the pre-window baseline
(`ep1(10947).total === 0` in the verify script) — independently reconfirms
§36's own "0 diff again at 10947" claim with a fresh capture.

## 2. Episode 2 (RAM 10957-10977): the target-shake's second episode, ROOT-CAUSED

**§36's own open puzzle, resolved**: the "three widely-spaced ticks with
identical diff counts" finding was NOT evidence that "pixels don't follow
RAM every tick" in any exotic sense — it's fully explained by **two
independent, overlapping mechanisms with different gating**, both reusing
this codebase's existing `render = RAM + 1` lag family (the SAME family as
episode 1's hitsplat, `docs/battle-menu-notes.md` §15f's own healthbox-
wobble/flicker precedent — not a new lag class):

1. **The healthbox/border wobble** (`gHealthboxSpriteIds[0]`'s own `y2`,
   RAM-confirmed alternating `+1,-1,+1,-1,...` for exactly **20 ticks, RAM
   10957-10976**, then a hard stop to `0` at RAM 10977) — genuinely
   alternates every tick, pixel-confirmed via the `HEALTHBOX_BOX` region
   (`x:127-229,y:74-110`): **render 10958-10977 (20 ticks, RAM+1)**, exact
   parity match confirmed programmatically (`diff(10958) === diff(10962)`,
   both 4 RAM ticks apart = same `y2` sign; `diff(10958) !== diff(10959)`,
   adjacent ticks = opposite sign).
2. **Onix's own sprite flicker** (`gBattlerSpriteIds[0]`'s `invisible` bit,
   RAM-confirmed toggling in three 4-tick **on** blocks — RAM **10958-10961,
   10966-10969, 10974-10977** — separated by 4-tick **off** gaps, then
   staying visible for good after RAM 10977) — pixel-confirmed via the
   `ONIX_BOX` region: render blocks **10959-10962, 10967-10970, 10975-10978**
   (RAM+1), each producing a **pixel-identical** erasure (`diff(10959) ===
   diff(10967) === diff(10975)`, checked directly) — confirming this is a
   simple visibility gate (sprite drawn or not), not a position-dependent
   effect.

**Crucially: Onix's own sprite `x2`/`y2` are RAM-flat `0` for this entire
episode** (`dump-endeavor-tail.py`'s own `onixX2`/`onixY2` fields, re-checked
directly) — **the y-offset does NOT apply to Onix's own sprite at all**,
only to the healthbox/border compound. §36's own read ("Onix's own sprite
bbox... changing as expected") was pixel-true but mechanistically wrong:
that bbox's diff is 100% explained by the flicker's on/off gate, not by any
positional shake of the sprite itself. **This is the engine implication the
brief asked for**: rung (c3)/(c4) needs (a) `drawMenuHealthboxPlayer(fb, 0,
dy)` (already-generic, per `docs/battle-turn-notes.md` §36's own note) fed a
new turn-9-specific `dy` table (`+1/-1` alternating, 20 entries, RAM+1 lag),
and (b) a boolean invisible-gate around Onix's own sprite draw (reusing the
`endeavorOnixInvisible`-shaped boolean-gate pattern, NOT threading a y2
offset through it) with its OWN 3-block-of-4 timing table, staggered
relative to (a) — the two tables do **not** share one boundary or one
phase, they're independently timed and must be modeled as two separate
tables, exactly as `docs/battle-menu-notes.md` §15f found for the ENDEAVOR
precedent.

**Episode boundaries, pixel-pinned (not RAM-inferred)**: first shifted
render tick = **10958** (healthbox), last shifted render tick = **10978**
(the flicker's own last block), full settle (both regions byte-identical to
baseline) = **10979**. Confirmed via `verify-turn9-postlunge.ts`'s own
`ep2(10979).onix === 0 && ep2(10979).healthbox === 0` assertion, passing
against a fresh capture.

### Per-tick offset table (RAM ticks, `n = ramTick - 10871`)

| RAM tick | n | healthbox y2 | Onix invisible | render tick(s) affected (RAM+1) |
|---|---|---|---|---|
| 10957 | 86 | +1 | false | 10958 (healthbox only) |
| 10958 | 87 | −1 | **true** | 10959 (both) |
| 10959 | 88 | +1 | true | 10960 |
| 10960 | 89 | −1 | true | 10961 |
| 10961 | 90 | +1 | true | 10962 |
| 10962 | 91 | −1 | false | 10963 (healthbox only) |
| 10963 | 92 | +1 | false | 10964 |
| 10964 | 93 | −1 | false | 10965 |
| 10965 | 94 | +1 | false | 10966 |
| 10966 | 95 | −1 | **true** | 10967 (both) |
| 10967 | 96 | +1 | true | 10968 |
| 10968 | 97 | −1 | true | 10969 |
| 10969 | 98 | +1 | true | 10970 |
| 10970 | 99 | −1 | false | 10971 (healthbox only) |
| 10971 | 100 | +1 | false | 10972 |
| 10972 | 101 | −1 | false | 10973 |
| 10973 | 102 | +1 | false | 10974 |
| 10974 | 103 | −1 | **true** | 10975 (both) |
| 10975 | 104 | +1 | true | 10976 |
| 10976 | 105 | −1 | true | 10977 |
| 10977 | 106 | 0 (wobble already ended) | true (flicker's own last tick) | 10978 (flicker only) |

Note the asymmetry at the tail: the healthbox wobble's own last nonzero RAM
tick is 10976, but the flicker's own last `true` tick is 10977 — one RAM
tick longer. This is why episode 2's pixel-settle tick (10979) is one past
what a naive "both mechanisms share one 20-tick window" assumption would
predict (10978) — RAM/pixel-confirmed directly, not assumed.

## 3. C4 territory: partial, named gaps (time-boxed)

**HP-drain window, pixel-corroborated but not independently RAM-rederived
this session**: the `HEALTHBOX_BOX` region (which also covers the HP bar
itself) shows the bar visibly changing over render ticks **10993-10999**
(pixel diff count climbs 27→47 monotonically, settling at 47 from 10999
on) — consistent with `docs/turn9-notes.md` §5's own claim ("flat
1-HP-unit-per-tick counter 30→24 over ticks 10993-10999"), and independently
reconfirmed this session via fresh pixels, but this session did **not**
rerun `dump-battle-bars.py` to re-verify the exact sentinel ticks
(`-32768`/`0`) or the per-tick displayed HP values RAM-side — treat the
dossier's own tick numbers as pixel-corroborated, not fully re-derived.

**Message-box transition, pixel-reconfirmed exactly**: screen is
byte-identical (outside the healthbox) across render ticks **10999-11004**,
first diff at **11005** — matches `turn9-notes.md` §5's own "screen static
10999-11004... first diff at 11005" claim exactly, re-derived fresh this
session (not trusted from the doc), asserted by `verify-turn9-postlunge.ts`.
The transition's own further internals (the 4-frame box-region sha
sequence, exact text-reveal cadence) were **not** re-probed this session —
`turn9-notes.md` §5's own box-region shas remain the best source, un-
reverified here.

**NOT probed this session (honest gaps for the next worker)**:
- Exact per-tick displayed HP values / bar-pixel-width table for the drain
  (only a coarse pixel-count proxy was checked, not the authoritative
  `dump-battle-bars.py` sentinel/counter fields).
- The message-box open animation's own 4-frame box-region sha sequence
  (dossier's own §5 correction block covers this; not reverified fresh).
- The settled "not very effective" hold's own content (11018-11092) —
  zero new probing this session; `turn9-notes.md` §5 remains the only
  source, still approximate per the standing rule.
- Any periodic breathe/bounce content in the settled hold — not checked.
- The ROCK_SLIDE-kickoff transition (~11092-11113) and beyond — entirely
  out of this session's reach.

## Methodology notes / PAPERCUT

- Both RAM probes (`dump-endeavor-tail.py`, `dump-quickattack-anim.py`)
  **segfault on interpreter teardown** (`exit code 139`, a wall of `GBA ...`
  log noise on stderr) but write correct, complete JSON before crashing —
  confirmed by checking `len(rows)` and spot-checking values against two
  independent runs before trusting either. **PAPERCUT**: this cost ~2
  minutes of double-checking output validity per run out of caution; worth
  a one-line note in the probe scripts' own docstrings for the next session
  so nobody mistakes the crash for "the probe failed" and discards good
  output.
- Pixel-diff bboxes (`ONIX_BOX`, `HITSPLAT_BOX`, `HEALTHBOX_BOX`) were
  derived from `docs/battle-turn-notes.md` §36's own component-labeled bbox
  numbers plus the hitsplat's own known 32x32 sprite size
  (`src/assets/gen/battle-anim-hitsplat.json`'s `oam.size`) — the hitsplat
  box overlaps Onix's own box almost entirely, and NOT excluding it was the
  first thing that confounded the shake signature (onix-region diff looked
  like a 3-level pattern instead of a clean 2-level one until the hitsplat
  footprint was subtracted out). Branch-aware lesson for whoever probes the
  next window: always subtract a known overlay's own bbox before trusting a
  "region diff" as a proxy for a single mechanism.

## Verification

`npm test` and `npm run build` unchanged/green (no `src/` changes this
session). New: `tools/probe/verify-turn9-postlunge.ts`, run fresh against
`bin/oracle` this session — **71/71 checks pass**. No trace files changed,
no `PROGRESS.md`/`ISSUES.md` edits.

## 2026-07-21 addendum (bounded-worker probe session): C4-territory ground
truth closed — HP drain, message-box reveal cadence (a real correction),
settled hold, all RAM/pixel-pinned fresh

Per the supervisor's brief, ground-truthed exactly the three gaps §3 named
("NOT probed this session"). **No `src/` changes.** All facts below are
re-derived fresh (fresh `tools/probe/dump-battle-bars.py` RAM probe run +
fresh `bin/oracle run` pixel captures over HTTP, both this session's own
runs) — `docs/turn9-notes.md` §5's own prose ranges were, again, treated as
leads, not truth. **Branch-aware**: every pixel claim below is attributed to
the specific already-proven engine function that renders it
(`composePlayerHealthboxHpOverlay`/`calcBarFilledPixels` for the HP bar,
`drawText`+`drawTileBg(battleWindow)`+the `drawMessageTextLines` line1/line2-
split convention for the message text) — these functions are reused
unmodified from turn 2/6/7's own already-landed code, not reimplemented; this
session's own scratch tooling (`tools/compare/scratch/diag-turn9-hpdrain.ts`,
`tools/compare/scratch/diag-turn9-msgtext.ts`) calls them directly to
generate 0-mismatch candidate renders against fresh oracle pixels, the same
methodology `endeavorOnixHp`'s own turn-2 fit and every kickoff-text delay
constant in this codebase already established.

### 1. HP-drain window (RAM 10992-11000, Onix 31→24): fully RAM+pixel-pinned, same "no extra lag" family as `endeavorOnixHp`

Fresh RAM read (`dump-battle-bars.py`, re-run this session, `bar0Curr`
column): sentinel **-32768 at RAM 10992**, flat 1-HP-unit-per-tick counter
**30→24 over RAM 10993-10999**, done-sentinel **0 at RAM 11000** — byte-for-
byte the same shape `turn9-notes.md` §5 already claimed, now independently
re-confirmed via a fresh probe run rather than trusted from the doc.

**Pixel cross-check, exact (`diag-turn9-hpdrain.ts`)**: for each candidate HP
value 24-31, built the expected healthbox-region frame via
`composePlayerHealthboxHpOverlay(assets, hp, 117)` (Onix's own real
`maxHP`, `battle1-turn2-ram-dump.json`) blitted onto a real pre-drain oracle
capture (tick 10985, hp still 31), then diffed against fresh oracle captures
at every tick 10985-11006. **0 mismatches at every tick, matching RAM tick
directly (no render lag at all)**:

| render tick | RAM tick | displayed HP | bar filled px | band |
|---|---|---|---|---|
| 10985-10992 | 10985-10992 (sentinel at 10992) | 31 (unchanged) | 12 | yellow |
| 10993 | 10993 | 30 | 12 | yellow |
| 10994 | 10994 | 29 | 11 | yellow |
| 10995 | 10995 | 28 | 11 | yellow |
| 10996 | 10996 | 27 | 11 | yellow |
| 10997 | 10997 | 26 | 10 | yellow |
| 10998 | 10998 | 25 | 10 | yellow |
| 10999+ | 10999-11000 (done sentinel 11000) | 24 | **9** | **red** |

This is the **same family** `endeavorOnixHp`'s own doc already names ("the
render tick uses `t` directly, no `-1` lag... same-frame CPU-copy mechanism")
— turn 9's HP-bar redraw uses this exact convention too, independently
re-confirmed here rather than assumed by analogy. A future
`turn9OnixHp(t, pressTick, startHp, endHp)` (identical shape to
`endeavorOnixHp`) would use **`TURN9_HP_DRAIN_START_DELAY = 121`**
(`pressTick(10871)+121 = 10992`, the RAM sentinel tick itself — same
"delay anchors to the sentinel tick, first real decrement lands one tick
later" convention `ENDEAVOR_HP_DRAIN_START_DELAY`'s own doc already
establishes) with `startHp=31, endHp=24`.

`calcBarFilledPixels`/`pickHpBarBand` (unmodified, already-shipped code)
reproduce the filled-pixel/band sequence above exactly from the raw HP
values and `maxHP=117` with **zero new logic needed** — this window is a
pure parameterization of already-proven code, same as every prior turn's HP
drain. The **yellow→red crossover fires at render tick 10999** (hp=24,
9px — `pickHpBarBand`'s own `>` — not `>=` — threshold means exactly-9px is
red, not yellow, pinned by an existing test already), matching
`turn9-notes.md` §5's own "yellow/red between 10990-11002" claim, now pinned
to the exact tick.

### 2. Message-box text: a real correction — single line, not two, plus the exact reveal cadence

**`turn9-notes.md` §5's own "It's not\nvery effective.." (two-line)
transcription is wrong** — direct pixel evidence this session (scanning the
rightmost non-background pixel column in BOTH the line-1 row band
(y:121-135) and the line-2 row band (y:137-151) at every tick 11005-11035)
shows **zero ink ever appears in the line-2 band** at any tick; the entire
string prints on **one line** at `LINE1_ORIGIN`, line 2 staying blank
throughout — the **same single-line shape** `TURN6_SUPER_EFFECTIVE_LINE`
already established for "It's super effective!", **not**
`TURN6_ATKFELL_LINE1`/`LINE2`'s genuine two-line shape. A crop at tick 11040
(`/tmp/turn9-msg-11040.png`, this session) directly confirms: **"It's not
very effective.."** rendered on a single row. (The doc's own sha for this
tick, `12b7204322f9`, is unaffected by the correction — only the prose
transcription of what the sha's pixels show was wrong.)

**Text reveal, pixel-exact (`diag-turn9-msgtext.ts`)**: built candidate
frames for every visible-char count 0-24 via `drawTileBg(battleWindow)` (the
static box, unmodified existing code) + the same `drawMessageTextLines`
line1/line2-split logic already used for every prior turn's kickoff/
effectiveness text, with `LINE1 = "It’s not very effective…"` (24 chars,
curly apostrophe + the single-glyph `…` = charmap code 176, both already-
proven glyphs) and `LINE2 = ""` (never used, `chars` never exceeds 24).
Diffed each candidate against fresh oracle captures at every tick
11003-11032 (box-region only, y:112-160): **0 mismatches at every tick**,
confirming:

- **Start**: render tick **11005** (`pressTick(10871)+134`) shows char 1
  ("I"); 11003-11004 are still box-closed (1040px mismatch vs. any
  candidate, i.e. box not open yet — matches this doc's §3 "screen static
  10999-11004, first diff at 11005" claim exactly, now cross-confirmed via
  the text-candidate model too, not just a raw pixel-diff).
- **Cadence**: flat **1 char/tick**, `visibleChars(t) = min(24, t-11005+1)`
  — the identical formula shape as `turn7SuperEffectiveTextVisibleChars`.
  Three ticks (11008/11009, 11012/11013, 11017/11018) each show the SAME
  rendered content as their neighbor — **not real stalls**: each coincides
  exactly with the next revealed character being a space (glyph code 0,
  pure background fill, no ink), so both the `n` and `n+1` char-count
  candidates render pixel-identically at that tick. Confirmed non-ambiguous
  neighbors on both sides advance normally (e.g. 11007→11008→11009→11010 is
  3,4,4,6 — the space is char 5, invisible, landing at 11009), ruling out a
  genuine typewriter pause.
- **Fully revealed**: render tick **11028** (`pressTick+157`, char 24/24,
  the `…` glyph), settled sha `12b7204322f9` from here on (see §3 below).

### 3. Settled hold: boundary corrected, sha pinned, confirmed non-periodic (flat, no breathe/bounce)

**`turn9-notes.md` §5's own "11018" hold-START claim is also wrong** — tick
11018 is still **mid-typing** (`visibleChars(11018) = min(24, 11018-11005+1)
= 14`, i.e. "It's not very e" — the doc's own cited sha `09694bd0d0da` for
that tick is correct, it's just NOT the settled/held sha, only a
transient mid-reveal frame). The genuine settle begins the tick text
finishes: **render 11028**, sha **`12b7204322f9`** (matches this doc's own
other citation, "12b7204322f9-family through 11109" — that second claim was
right).

**Densely re-scanned every tick 11028-11109 (82 ticks, not sparse
sampling)**: exactly **one** distinct sha (`12b7204322f9`) the entire span —
genuinely flat/static, confirming there is **no** periodic breathe/bounce
content in this hold (unlike the action-menu idle-bounce family
`menu-idle-bounce.json`/`turn6/7/8-menu-notes` establish for the *resting*
action menu) — a message-box hold is simply frozen until the next script
step advances it, no independent animation task ticks underneath it here.

**Hold end / transition boundary**: first tick differing from the held sha
is render **11110** (`95efd4fe0a13`), matching `turn9-notes.md` §5's own
"message-box transition into 'ONIX used ROCK SLIDE!' | 11110-11113" claim
exactly — cross-confirmed fresh, box-region shas re-read this session:
`95efd4fe0a13`/`0b427db7f25f`/`bb950968bec3`/`4c8e2657b02b`, then held at
`4c8e2657b02b` from 11113 on (matches the doc's own next-cited sha for the
ROCK_SLIDE kickoff text hold, `81aaa90be45f`, is a few ticks further in,
past this session's scope).

### Rung (d) transition (item 4, NOT attempted — out of time)

The press-segment boundary into ROCK_SLIDE's own kickoff (rung (d)'s
anchor) was not probed this session — priorities 1-3 filled the full time
budget. The hold-end tick (11110, above) is the correct starting point for
whoever picks this up: the transition's own 4-frame box-open shape
(`95efd4fe0a13`/`0b427db7f25f`/`bb950968bec3`/`4c8e2657b02b`) is already
RAM/pixel-cited above and in `turn9-notes.md` §5, just not yet decomposed
into a text-reveal-cadence table the way §2 above does for the first
message — likely the same `drawMessageTextLines`+1-char/tick shape, given
every other message this dossier has ever pinned uses it, but **not
verified**, flag this as an assumption for the next worker to check, not a
given.

### Verification

`npm test` **880/880** and `npm run build` green, unchanged this session (no
`src/` changes). `tools/probe/verify-turn9-postlunge.ts` extended with 28 new
checks (10 HP-drain per-tick displayed-HP checks + 1 band-flip check, 7
message-text per-tick reveal checks + 1 single-line-correction check, 4
settled-hold sha checks) — **99/99 checks pass** against a fresh
`bin/oracle` capture (71 prior + 28 new, all green).
New scratch tooling (not required deliverables, kept for reuse):
`tools/compare/scratch/diag-turn9-hpdrain.ts`,
`tools/compare/scratch/diag-turn9-msgtext.ts`,
`tools/compare/scratch/dump-turn9-msgcrops.ts`.

**Gaps still open for the next worker** (honest, time-boxed):
- Rung (d)'s own transition/kickoff-text cadence (item 4 above) — untouched.
- The ROCK_SLIDE kickoff text hold onward (past 11113) and everything after
  — entirely out of this session's reach, unchanged from the predecessor's
  own gap list.
