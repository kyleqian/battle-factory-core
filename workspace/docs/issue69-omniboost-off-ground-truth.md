# ISSUES.md #69 — Scene-OFF omniboost (SILVER WIND all-stats-up) cadence ground truth + RNG bias check

Side-lane, evidence-only scout. No `src/**` edits. Builds on
`docs/silverwind-allstatsup-crash-scout.md` (#65, already fixed — the
`STRINGID_ATTACKERSSTATROSE` presentation crash no longer reproduces,
confirmed by `tests/silverWindAllStatsUpRepro.test.ts`) and reuses/extends
its `overrides.parties` seed-8 proc scenario.

## TL;DR

- **Cadence gap confirmed, generic, quantified.** The real ROM (Scene OFF)
  shows each of the 5 stat-up banners for **~92 frames** (flash + text-print
  + a **64-frame** post-print hold — literally `waitmessage B_WAIT_TIME_LONG`
  from `BattleScript_AllStatsUp`, `reference/pokeemerald/data/battle_scripts_1.s:3459-3483`).
  The app currently budgets **~74.6 frames/banner** (a flat 50-frame `stat`
  command + a ~24-25-frame `message` command, with **no post-print hold
  modeled at all**). The app finishes the whole 5-banner window in **373
  frames** vs the ROM's **~473 frames** — about **21% faster**, i.e. exactly
  the "fast-forwarded" feel reported. This is **not** Silver-Wind-specific:
  the missing hold is in the shared `stat`/`message` duration model, so it
  under-times every stat-change move (already flagged, unresolved, in
  `docs/stat-change-confusion-ground-truth.md:461-482`).
- **"One gray flash then text": there are 5 flashes, not 1**, and none of
  them is a sprite/palette effect — Scene OFF skips `playstatchangeanimation`
  (per the profile's own contract: "Move/effect... animations are
  skipped"). What flashes is the **message box being cleared to blank for
  one frame** before each new stat's text draws in, once per stat (5 times
  total), not a single shared animation for the group.
- **RNG accounting is correct, no stream offset.** Draw-count attribution
  (4 rolls/attacker: accuracy, crit, damage-adjust, effect-chance) matches
  byte-for-byte between the app and the real ROM, confirmed two ways: (1)
  forward-stepping the ROM's own LCG from its real turn-start `rngValue`
  lands exactly on every one of the ROM's own later-frame captured
  `rngValue`s, and (2) transplanting each of 25 real ROM turn-start
  `rngValue`s into the app's kernel with the same real stats reproduces the
  **exact same proc/no-proc decision the ROM made, 25/25**. Zero RNG draws
  occur during the whole 5-banner presentation window on either side (a
  single `Cmd_seteffectwithchance` roll gates all five stat writes) —
  matches source and matches `docs/silverwind-allstatsup-crash-scout.md`'s
  earlier single-seed finding, now reconfirmed with a fresh fixture and a
  25-seed sweep.
- **Elevated proc rate flagged, not resolved.** The 25-seed sweep (`seed`
  1..25, only that field varied) shows **7/25 (28%) proc**, vs the source's
  10% `secondaryEffectChance` (binomial P(X≥7 | n=25, p=0.10) ≈ 0.0095).
  Because the app and oracle agree on every one of the 25 outcomes, this is
  **not an app-vs-oracle discrepancy** — it's a property of this specific
  small integer-seed sweep (or sampling noise at n=25), not evidence the
  live RNG stream itself is biased. Flagged honestly per the brief's
  "double-proc" concern; not chased further inside this time-box (see
  §5 for the reasoning and what a real bias test would need).

## 1. Scenario & reproduction recipe

Reused base (challenge 2, battle 2, trainerId 110) from
`docs/hit-chain-ground-truth.md` / `docs/silverwind-allstatsup-crash-scout.md`
§4, `overrides.parties`: player BUTTERFREE (SILVER_WIND/PSYBEAM/TOXIC/
WHIRLWIND) vs. three opponent slots all locked to RATTATA/TACKLE (all-four-
slots-same-move Factory-AI constraint, `tools/battle-lab/README.md`).
BUTTERFREE (speed 90) outpaces this RATTATA (speed 77, IVs pinned to 0
speed), so **the player moves first** in this fixture — the opposite turn
order from the #65 doc's separate synthetic engine-only repro (trainer
faster there), which matters for the bias-check transplant in §5.

Committed fixture: `tools/compare/fixtures/issue69-omniboost-dense-seed8.json`
(`mechanicLab`, profile `battle-scene-off`, `seed: 8` — the same proc seed
`docs/silverwind-allstatsup-crash-scout.md` found — dense `captureFrames`
covering the whole omniboost window).

```sh
bin/oracle lab tools/compare/fixtures/issue69-omniboost-dense-seed8.json -o /tmp/issue69-dense
```

## 2. Oracle window (real ROM, Scene OFF, seed 8 — proc)

Dense per-frame captures (every frame in the windows of interest) pin the
exact onset of each of the five stat-stage RAM writes and the visible
message-box transition that follows it. `statStages` index layout is the
source's own `[HP(unused), ATK, DEF, SPEED, SPATK, SPDEF, ACC, EVASION]`.

| banner | RAM write frame | box-clear ("flash") frame | text fully printed by | hold ends (next RAM write) | cycle length (flash-to-flash) |
| --- | ---: | ---: | ---: | ---: | ---: |
| ATK 6→7 | 283 | 285 | ~313 | 375 | — |
| DEF 6→7 | 375 | 377 | ~405 | 468 | 92 |
| SPEED 6→7 | 468 | 470 | ~498 | 559 | 93 |
| SPATK 6→7 | 559 | 561 | ~589 | 652 | 91 |
| SPDEF 6→7 | 652 | 654 | ~682 | 757 | 93 |
| *(transition to RATTATA's TACKLE)* | — | 758 | — | — | 104 |

Per-banner shape (e.g. ATK, frames 283-376, `/tmp/issue69-dense2/frame-00283.png`
through `frame-00376.png`, pixel-diffed frame-by-frame against the previous
frame):

- **283-284**: `statStages[1]` (ATK) already written to 7 in RAM; screen
  still shows the *previous* message ("BUTTERFREE used SILVER WIND!") —
  zero pixel diff, i.e. the write is silent/invisible for 2 frames.
- **285**: message box clears to blank — one big pixel diff (~920px, ~9%
  of the 208×48 box), the only "flash"-like moment in the whole cycle.
  Screenshot: empty teal box, `RATTATA`/`BUTTERFREE` health UI unchanged.
- **286-296 (~11 frames)**, then continuing to **~313**: "BUTTERFREE's
  ATTACK" / "rose!" draws in glyph-by-glyph (28-46px diffs per frame,
  matching a per-character text printer, not a scroll/wipe effect).
- **314-376 (~63 frames)**: **zero** pixel diff — the completed banner just
  sits there. This is `waitmessage B_WAIT_TIME_LONG` (64,
  `reference/pokeemerald/include/constants/battle.h:324`), confirmed
  source-side in §4.

The same shape repeats identically for DEF/SPEED/SPATK/SPDEF (only the stat
name/line-length differs by 1-2 characters, which is why DEF/SPATK/SPDEF's
cycles run ~1 frame longer than ATK/SPEED's — text-print time scales with
the printed string).

**Total 5-banner window**: first box-clear (285) to the last banner's
held-static end (757, one frame before the transition-out flash at 758)
= **473 frames** (~7.9s at 59.7Hz). Cadence is tight and consistent: four
measured banner-to-banner gaps are 92/93/91/93 frames (mean 92.25, stdev
~0.83) — not "fast," and each banner is visually and temporally distinct
(5 separate box-clear-and-refill cycles), not one shared effect.

RNG stays **pinned** at `3664104713` from frame 210 (right after
`Cmd_seteffectwithchance`'s roll) through frame 757 — **zero** further RNG
draws for the entire 473-frame presentation window; see §4/§5.

## 3. App window (production presentation pipeline, same shape)

`tools/compare/issue69OmniboostAppWindow.ts` drives the exact same
production entry points as `tests/silverWindAllStatsUpRepro.test.ts`
(`createFactoryFullTurnBattleState` → `submitFactoryFullTurnDecision` ×2 →
`createBattleResolutionPresentation`), then sums the **production**
`battleResolutionCommandDuration` (`src/engine/battleResolutionPresentationRender.ts:237-276`)
over every command in the one resulting segment (confirmed: this whole turn
is one presentation segment, `battleResolutionPresentation.ts:1140`, so
there is no inter-banner handoff gap — `BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES`
only applies at segment boundaries).

```sh
node --experimental-strip-types tools/compare/issue69OmniboostAppWindow.ts
```

```
  [11] stat        50f  battler=0 stat=attack 6->7
  [12] message     24f  ["BUTTERFREE’s ATTACK","rose!"]
  [13] stat        50f  battler=0 stat=defense 6->7
  [14] message     25f  ["BUTTERFREE’s DEFENSE","rose!"]
  [15] stat        50f  battler=0 stat=speed 6->7
  [16] message     24f  ["BUTTERFREE’s SPEED","rose!"]
  [17] stat        50f  battler=0 stat=special-attack 6->7
  [18] message     25f  ["BUTTERFREE’s SP. ATK","rose!"]
  [19] stat        50f  battler=0 stat=special-defense 6->7
  [20] message     25f  ["BUTTERFREE’s SP. DEF","rose!"]

omniboost window: 373 frames across 10 commands
stat-banner count: 5, average frames/banner: 74.6
```

Every banner gets the **same uniform** 50 (`stat`, `BATTLE_RESOLUTION_STAT_CHANGE_FRAMES`,
`battleResolutionPresentationRender.ts:46`) + 24-or-25 (`message`,
`max(MESSAGE_TIMING.minimumFrames=24, battleStringPrintableLength(lines))`,
`battleResolutionPresentation.ts:303` / `battleResolutionPresentationRender.ts:242-246`)
— confirmed structurally uniform across all 5 stats (no shortening/batching
for the multi-stat move specifically; a single-stat move gets the identical
50+24-ish pairing per the existing Tier-1 pin at
`tests/battleResolutionPresentation.test.ts:1003-1020`). The gap to the ROM
is therefore **not** "5 stats crammed into a smaller total" — it's that
**every** banner, single-stat or multi-stat, is missing the ROM's
64-frame post-print hold.

## 4. Side-by-side

| | oracle (real ROM, Scene OFF) | app (production presentation) | delta |
| --- | ---: | ---: | ---: |
| visible effect flashes | 5 (one message-box clear per stat) | 5 (one `stat`+`message` pair per stat, structurally) | matches in count |
| frames/banner | ~92 (mean of 4 measured gaps: 92.25) | 74.6 (50 + 24.6 avg) | **-17.6 frames/banner (-19%)** |
| whole-window frames | 473 (285→757) | 373 | **-100 frames (-21%)** |
| whole-window seconds (59.7 Hz) | ~7.92s | ~6.25s | **-1.67s** |
| RNG draws during window | 0 | 0 | matches |

The app is not merely "a bit faster" — it is proportionally faster by
almost exactly the ratio you'd expect from dropping a 64-frame
post-print hold out of a ~92-frame cycle (64/92 ≈ 70% of the per-banner
budget is the hold; the app keeps the ~28-frame print/RAM-write portion
close to right — 24-25 vs the ROM's measured ~28-30 print+lag frames — and
drops essentially all of the hold).

## 5. RNG bias check

### 5a. Draw-count attribution

Source contract (already established by `docs/hit-chain-ground-truth.md`):
4 `Random()` calls per attacker per turn — accuracy check, crit calc,
damage-variance, `seteffectwithchance` — 8 total for a two-attacker turn,
roll always consumed regardless of outcome (e.g. 100%-accuracy Silver Wind
still burns an accuracy roll). Reconfirmed here two independent ways for
**this** fixture (player-first turn order, not previously exercised by
#65's trainer-first synthetic repro):

1. **Forward-stepping the ROM's own LCG** (`next = (1103515245*v + 24691) mod 2^32`,
   `u16 = next >> 16`) from the oracle's real frame-0 `rngValue`
   (`4156937941`, seed 8) lands **exactly** on every later real capture:
   step 4 (`u16=55909, %100=9<10` → proc) = `3664104713`, matching the
   value pinned frame 210-757; step 5 (`u16%100` = RATTATA's accuracy) =
   `3754388296`, matching the value captured at frame 760 right after the
   transition. No extra/missing draws anywhere in the 8-step sequence.
2. The app's own kernel (§5b below) reproduces the identical proc decision
   for all 25 transplanted real `rngValue`s, which is only possible if its
   roll order/count for a **player-first** turn also matches exactly (the
   opposite attacker order from #65's own validation).

### 5b. 25-seed sweep + transplant match (stronger than a rate comparison)

The oracle's `mechanicLab.seed` field is **not** the same reference frame
as the app's `rngSeed` (already flagged in
`docs/silverwind-allstatsup-crash-scout.md` §4): `seed` is written far
upstream of the captured battle (before/at Factory construction), so by the
time of the frame-0 checkpoint many un-attributed LCG steps separate the
two — matching integer values on both sides (`seed: N` vs `rngSeed: N`)
would compare unrelated RNG states, not a real "same input" test. Instead
this scout **transplants the oracle's own real frame-0 `rngValue`**
(captured directly, not guessed) into the app's `rngSeed`, using the same
real BUTTERFREE/RATTATA stats this fixture derives — same actual starting
RNG state, same real stats, same move pairing, on both sides.

```sh
node --experimental-strip-types tools/compare/issue69OmniboostSeedSweep.ts
```

25 oracle captures (`seed` 1..25, `tools/compare/fixtures/issue69-omniboost-dense-seed8.json`
with only `seed` varied, `captureFrames: [0, 800]`):

| seed | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
| --- | - | - | - | - | - | - | - | - | - | -- | -- | -- | -- |
| proc | N | N | N | N | N | N | N | **Y** | N | N | N | **Y** | **Y** |

| seed | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 |
| --- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- |
| proc | **Y** | N | N | N | N | **Y** | N | **Y** | **Y** | N | N | N |

**Result: 25/25 seeds matched** between the oracle's real observed
proc/no-proc and the app's own decision from the transplanted real
`rngValue` — zero mismatches, zero reproducers. RNG accounting for Silver
Wind's secondary effect is faithful for both turn orders now checked
(trainer-first in #65, player-first here).

**Proc rate flagged, not a discrepancy**: 7/25 = 28% vs. the source's 10%
(`binom.sf(6, 25, 0.10) ≈ 0.0095`, i.e. this count would be rare under true
i.i.d. 10% sampling). But since the app and oracle **agree on every single
outcome**, this can't be an app-side bug — whatever produced 7 procs is a
property of the real ROM's response to sequential integer seeds 1-25
specifically (or plain small-*n* variance; `n=25` binomial std dev is 1.5
procs, so 7 is a real outlier but not impossible). A rigorous population-
level bias test would need `rngValue`s drawn from real gameplay progression
(chained `Random()` calls across many real turns/menus), not a sweep of
small sequential integers fed through the harness's `seed` field — out of
scope for this time-boxed step; flagged for whoever picks up the
"double-proc" thread next, per the brief's request to "check, don't
assume."

## 6. Fix prescription (bounded; not applied — evidence-only step)

**Owning functions**: `battleResolutionCommandDuration`'s `"stat"` and
`"message"` cases (`src/engine/battleResolutionPresentationRender.ts:242-267`),
fed by `STAT_TIMING`/`MESSAGE_TIMING` (`src/engine/battleResolutionPresentation.ts:303,317`).

**What's missing**: a per-stat **post-print hold**, source-value 64 frames
(`B_WAIT_TIME_LONG`, `reference/pokeemerald/include/constants/battle.h:324`),
applied *after* the stat's message finishes printing and *before* advancing
to the next command. Today the `message` command's duration is exactly its
print time (`max(24, printableLength)`) with nothing added for the hold,
and the `stat` command's 50-frame budget
(`BATTLE_RESOLUTION_STAT_CHANGE_FRAMES`) is an uncited placeholder (its own
comment: "Source Scene-OFF stat controller lifetime for one ordinary stage
change" — no oracle frame citation) that happens to land in roughly the
right ballpark for total-window "good enough" but is not actually modeling
the hold.

**Target**: ~92 frames per stat banner (measured: 91-93 across 4 gaps, this
fixture), not 74-75. The cleanest split given the ROM's own script
ordering (`printfromtable` then `waitmessage`) is likely to move the hold
onto the `message` command's duration (`message` = print time + 64) rather
than inflating `stat`, since the hold is genuinely a message-display
property in source, not a stat-write property — but that's an implementation
choice for whoever takes the fix, not decided here.

**Scope**: generic to every `MOVE_EFFECT_AFFECTS_USER`/`printfromtable`+
`waitmessage B_WAIT_TIME_LONG` stat-change script, not Silver-Wind-specific
— matches the pre-existing unresolved flag in
`docs/stat-change-confusion-ground-truth.md:461-482` ("visibly costs more
real-time frames... not chased down further to stay inside the time-box").
A fix here should also close that doc's flag; validate against at least one
**single**-stat-change oracle capture (e.g. Growl/Scary Face) before
landing, since this scout only densely measured the 5-stat case — the
64-frame `waitmessage` is scripted identically for single-stat moves, but
that hasn't been independently re-confirmed by dense per-frame capture in
this session.

## 7. New files (this step)

- `tools/compare/fixtures/issue69-omniboost-dense-seed8.json` — dense
  `mechanicLab` scenario (§1/§2).
- `tools/compare/issue69OmniboostAppWindow.ts` — app-side duration
  breakdown (§3).
- `tools/compare/issue69OmniboostSeedSweep.ts` — RNG transplant bias check
  (§5b).
- This doc.

No `src/**` files touched; no production behavior changed.
