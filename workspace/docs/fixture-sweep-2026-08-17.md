# Fixture sweep — 2026-08-17 (SIDE lane insurance pass)

**Provenance:** this worktree is pinned to `33fcda01` (Docs: brainSpeech
real-close edge fix write-up, PROGRESS ledger update) — the tip of the six
engine steps landed today (brainSpeech accept model + real-close edge,
call-scene page/dismiss gates, boundary-family render fixes, gold transition
te re-basing). A main-lane sibling is landing transition-overlay changes on
`master` concurrently; **every number below describes the `33fcda01` tree
only**, not whatever `master` looks like by the time this is read. No source,
tooling, trace, or doc file was edited to produce this report — it is a
read-only evidence sweep (NO-CODE-CHANGE step). Oracle: Battle Scene OFF at
`http://127.0.0.1:8014`.

## Headline verdict

**NOT all-EXACT.** Two real, reproducible deviation clusters on `33fcda01`,
both confirmed by an immediate individual re-run (not sweep flukes):

1. **`battle1-swap-*` family (17 of 18 traces) collapse to ~0/N** — whole-frame
   mismatch (87-99.7% diff, `bbox=0,0-239,159`) from the very first captured
   frame. Root cause (diagnosed, not fixed): these 17 trace files never
   acquired an explicit `"appRoute": "canonical-recorded"` field (confirmed
   via `git log --follow -p`, the field is absent from every revision of
   `battle1-swap-player-picker.json`'s history). They now silently replay on
   the app's default `"generated-orchestrator"` route instead of the
   recorded Battle-1 swap scenario the trace was captured against — the same
   "appRoute papercut" class documented repeatedly in `PROGRESS-archive.md`
   (e.g. entries around `turn5-*.json`, `turn17-rung1..6a/b.json`,
   `battle1-turn13-dense-a/b.json`), just never applied to this trace set.
   `battle1-swap-enemy-accept-exit.json` is the one file in the family that
   already has the field, and it is the one family member still EXACT.
   **This looks pre-existing (the field was never added, not removed) rather
   than a fresh regression from today's six steps** — but every one of these
   traces is documented elsewhere as fully passing (`docs/s8-swap-yes-acceptance-audit.md`,
   `docs/rung14-presentation-seam-scout.md`), so the sweep numbers below are
   real deviations from those citations regardless of cause.

2. **`turn5-*-off`/`turn6-reopen-off` family collapse well below their
   documented full bars**, with small, localized per-frame diffs (2-10%,
   `bbox` around the message/menu-window region, e.g. `44,49-229,133` or
   `127,74-229,110`) — **not** the appRoute-missing signature (these traces
   already carry `"appRoute": "canonical-recorded"`, confirmed) and **not**
   the small, single-digit "idle-bounce-phase" residual class documented for
   `turn9-quickattack-off`/`turn11-featherdance-off`/`turn12-aerialace-off`.
   This is a genuine, unexplained rendering regression against
   `docs/turn4-fold-pp-freshness-design.md`'s pinned 100%-bars — exactly the
   kind of cross-step regression this sweep exists to catch. **Not
   fixed, not further root-caused, per the task's no-code-change /
   no-debugging constraint.**

3. **`loss-terminal-decline-continuation-off` 50/155 vs. a `155/155` bar cited
   repeatedly since 2026-08-05** (`ISSUES.md:824`, `PROGRESS-archive.md`
   multiple entries). Whole-frame mismatch (95.87% diff) starting exactly at
   the documented decline-edge frame 4989 — same total-collapse signature as
   cluster 1, but this trace already ships without any of the `appRoute`
   file diffs I could find in a quick check, so it may share cluster 1's
   root cause or may be independent; not diagnosed further.

All other traces are EXACT or sit precisely at a previously-documented
partial bar (idle-bounce-phase, Yoshi/Magneton intro drift, gold-close
113/126, silver flicker 32/100, Noland reveal 690/701, ISSUES #61's
turn3-endeavor residual). Soaks are clean: **vanilla 20/20 OK**, **full
30/30 OK** (0:30 of the requested 0:60 — see Task 2 below for why).

## Task 1 — full fixture sweep

`ls tools/compare/traces/*.json` → **201 files**. Split by profile
(`grep -o '"oracleProfile"'` / battle-lab `"profile"` field):

- **95** declare `"oracleProfile": "battle-scene-off"` → run serially below.
- **105** declare no `oracleProfile` and no battle-lab `profile` field at all
  → legacy ON-profile traces, **SKIPPED** (would silently run against the
  wrong canonical snapshot under the OFF oracle).
- **1** (`turn2-dragonbreath-projectiles.json`) explicitly declares
  `"oracleProfile": "battle-scene-on"` → **SKIPPED**, explicit ON trace.

`95 + 105 + 1 = 201`. ✓

### Skip list (105 legacy ON-profile, no `oracleProfile`/`profile` field)

<details><summary>expand</summary>

accept-prebattle, anchor, battle1-postwin-decline, battle1-postwin-heal,
battle1-postwin-next-prompt, battle1-postwin-scout-a, battle1-postwin-scout-b,
battle2-action-menu-dense, battle2-intro-dense, battle2-jenson-sendout-text,
battle2-kabuto-sendout-dense, battle2-player-sendout-dense, battle2-room-a,
battle2-room-b, battle2-transition, battle2-turn1-rockslide, confirm-decline,
confirm-flow, draft-cursor, draft-menu-slot6, draft-menu, example,
fight-submenu-reopen, fight-submenu, menu-idle, menu-materialize, menu-text,
menu-throw, rent-3picks, rent-slot1, room-entry, room-msgbox, room-npcs,
s6-acceptance, scene-assembly, sendout, summary-info-magby, summary-info-onix,
transition, turn12-menu, turn13-dragonbreath-faint, turn13-menu,
turn13-sandattack, turn13-switchin, turn14-fly-miss, turn15-fly-strike,
turn15-party-select-delayed, turn15-party-select,
turn15-sendout-rung{2,3,4a,5,6}[-delayed], turn16-rung{1[-delayed],2a,2b,3,4,5},
turn17-rung{1,2,3,4,5,6a,6b,7a,7b,8a,8b}, turn5-endeavor, turn5-faint,
turn5-healthbox, turn5-menu, turn5-rockslide, turn5-sentout,
turn5-sitrus-{a,b,c,d}, turn5-switchin, turn6-featherdance, turn6-feathers,
turn6-menu, turn6-rockslide-{a,b}, turn6-statfall, turn7-feathers, turn7-menu,
turn7-rockslide-{a,b,c,d}, turn8-bind-{a,b}, turn8-feathers, turn8-menu,
turn9-menu, walk-warpout (105 total; `.json` suffix omitted for brevity).

`example.json` was additionally used for a 1-off timing precheck early in
this session (`4/4 matched` against the OFF oracle) — a stray read-only call,
excluded from the table below since it belongs in the skip list per the
profile rule.

</details>

### Result table (95 battle-scene-off traces, run serially)

| Trace | Count | Documented bar | Classification |
| --- | --- | --- | --- |
| battle-command-generated-off.json | 128/128 | — | EXACT |
| battle1-swap-enemy-accept-b-return.json | 0/69 | 69/69 (s8 audit) | **DEVIATION** — first mismatch frame 29601 (whole-frame, 88-99.7%) |
| battle1-swap-enemy-accept-exit.json | 43/43 | 43/43 (s8 audit) | EXACT — only family member with explicit `appRoute` |
| battle1-swap-enemy-accept-no-return.json | 0/69 | 69/69 (s8 audit) | **DEVIATION** |
| battle1-swap-enemy-accept-prompt.json | 0/66 | 66/66 (s8 audit) | **DEVIATION** |
| battle1-swap-enemy-cancel-quit-yes.json | 0/65 | full (rung14) | **DEVIATION** |
| battle1-swap-enemy-picker.json | 0/130 | 130/130 (s8 audit) | **DEVIATION** — first mismatch frame 29810 |
| battle1-swap-enemy-pkmn-return.json | 0/115 | 115/115 (s8 audit) | **DEVIATION** |
| battle1-swap-enemy-quit-b-no-return.json | 0/113 | full (rung14) | **DEVIATION** |
| battle1-swap-enemy-quit-b-return.json | 0/113 | full (rung14) | **DEVIATION** |
| battle1-swap-enemy-quit-b-yes.json | 2/65 | full (rung14) | **DEVIATION** — first mismatch frame 29936 |
| battle1-swap-player-cancel-quit-yes.json | 0/68 | 68/68 (s8 audit, "CANCEL+YES") | **DEVIATION** |
| battle1-swap-player-options-b-close.json | 0/59 | 59/59 (s8 audit) | **DEVIATION** |
| battle1-swap-player-options-popup.json | 0/44 | 44/44 (s8 audit) | **DEVIATION** |
| battle1-swap-player-options.json | 0/58 | 58/58 (s8 audit) | **DEVIATION** |
| battle1-swap-player-picker.json | 0/101 | 101/101 (s8 audit) | **DEVIATION** — first mismatch frame 29601 |
| battle1-swap-player-quit-b-return.json | 0/67 | 67/67 (s8 audit) | **DEVIATION** |
| battle1-swap-player-quit-no-return.json | 0/67 | 67/67 (s8 audit) | **DEVIATION** |
| battle1-swap-player-quit-yes.json | 0/31 | 31/31 (s8 audit) | **DEVIATION** — first mismatch frame 29730 |
| battle1-swap-player-summary-return.json | 0/147 | 147/147 (s8 audit) | **DEVIATION** |
| battle2-off-turn1-staged.json | 16/16 | — | EXACT |
| factory-arbitrary-intro-magneton-off.json | 703/751 | 703/751 (ISSUES.md:3200) | AT-DOCUMENTED-BAR |
| factory-arbitrary-intro-yoshi-off.json | 700/751 | 700/751 (ISSUES.md:3201) | AT-DOCUMENTED-BAR |
| factory-brain-gold-walkup-speech-close-edge-off.json | 54/54 | — | EXACT |
| factory-brain-gold-walkup-speech-close-off.json | 113/126 | 113/126 (brief-cited) | AT-DOCUMENTED-BAR |
| factory-brain-gold-walkup-speech-open-off.json | 256/256 | — | EXACT |
| factory-brain-gold-walkup-speech-pages-off.json | 177/177 | — | EXACT |
| factory-brain-silver-walkup-askready-menu-off.json | 21/21 | — | EXACT |
| factory-brain-silver-walkup-askready-menu-record-off.json | 178/178 | — | EXACT |
| factory-brain-silver-walkup-askready-menu-retire-off.json | 174/174 | — | EXACT |
| factory-brain-silver-walkup-callscene-01-off.json | 131/131 | — | EXACT |
| factory-brain-silver-walkup-callscene-02-off.json | 199/199 | — | EXACT |
| factory-brain-silver-walkup-entrance-02-off.json | 256/256 | — | EXACT |
| factory-brain-silver-walkup-entrance-03-off.json | 256/256 | — | EXACT |
| factory-brain-silver-walkup-speech-box0-held-off.json | 39/39 | — | EXACT |
| factory-brain-silver-walkup-speech-box2-off.json | 100/100 | — | EXACT |
| factory-brain-silver-walkup-speech-close-pause-off.json | 28/28 | — | EXACT |
| factory-brain-silver-walkup-speech-cry-edge-off.json | 75/75 | — | EXACT |
| factory-brain-silver-walkup-speech-cry-held-off.json | 74/74 | — | EXACT |
| factory-brain-silver-walkup-speech-flicker-off.json | 32/100 | 32/100 (docs/silver-flicker-evidence.md) | AT-DOCUMENTED-BAR |
| factory-brain-silver-walkup-speech-page8-held-off.json | 39/39 | — | EXACT |
| factory-brain-silver-walkup-swapask-no-off.json | 194/194 | — | EXACT |
| factory-round-battle6-lukas-reveal-off.json | 154/154 | — | EXACT |
| factory-round-battle6-lukas-status-summary-message-off.json | 65/65 | — | EXACT |
| factory-round-battle7-noland-gold-reveal-off.json | 690/701 | 690/701 (docs/noland-brain-intro-gold-ground-truth.md) | AT-DOCUMENTED-BAR |
| factory-round-battle7-noland-reveal-off.json | 690/701 | 690/701 (ISSUES.md:89) | AT-DOCUMENTED-BAR |
| interactive-generated-command-entry-off.json | 7/7 | — | EXACT |
| interactive-generated-intro-off.json | 715/715 | — | EXACT |
| interactive-haunter-shadow-punch-off.json | 6/6 | — | EXACT |
| loss-terminal-decline-continuation-off.json | 50/155 | 155/155 (ISSUES.md:824, PROGRESS-archive.md ×7) | **DEVIATION** — first mismatch frame 4989 (95.87%, whole-frame) |
| loss-terminal-window-off.json | 1943/1943 | — | EXACT |
| oracle-off-anchor.json | 1/1 | — | EXACT |
| summary-battle-move-select.json | 93/93 | — | EXACT |
| summary-battle-moves-mon-down-up.json | 80/80 | — | EXACT |
| summary-battle-to-contest-moves.json | 16/16 | — | EXACT |
| summary-contest-move-select.json | 93/93 | — | EXACT |
| summary-contest-moves-mon-down-up.json | 80/80 | — | EXACT |
| summary-info-magby-front-animation.json | 201/201 | — | EXACT |
| summary-info-mon-down-up.json | 87/87 | — | EXACT |
| summary-info-mon-down.json | 54/54 | — | EXACT |
| summary-info-to-skills.json | 25/25 | — | EXACT |
| summary-page-transition-install.json | 3/3 | — | EXACT |
| summary-skills-to-battle-moves.json | 36/36 | — | EXACT |
| summary-skills-to-info.json | 56/56 | — | EXACT |
| turn1-cloneanim-off.json | 230/230 | — | EXACT |
| turn1-drain-off.json | 102/102 | — | EXACT |
| turn1-kickoff-off.json | 81/81 | — | EXACT |
| turn1-rockslide-off.json | 256/256 | — | EXACT |
| turn10-aerialace-off.json | 206/206 | — | EXACT |
| turn10-menu-off.json | 83/83 | — | EXACT |
| turn10-rockslide-off-b.json | 131/131 | — | EXACT |
| turn10-rockslide-off.json | 255/255 | — | EXACT |
| turn11-featherdance-off.json | 189/191 | 189/191 (PROGRESS-archive.md M11, idle-bounce-phase) | AT-DOCUMENTED-BAR |
| turn11-rockslide-off.json | 256/256 | — | EXACT |
| turn12-aerialace-off.json | 246/247 | 246/247 (PROGRESS-archive.md M11, idle-bounce-phase) | AT-DOCUMENTED-BAR |
| turn12-rockslide-miss-off.json | 256/256 | — | EXACT |
| turn2-dragonbreath-off.json | 237/237 | — | EXACT |
| turn2-endeavor-off.json | 256/256 | — | EXACT |
| turn3-endeavor-off.json | 254/255 | 254/255 (ISSUES #61) | AT-DOCUMENTED-BAR |
| turn3-rockslide-off.json | 161/161 | — | EXACT |
| turn4-doubleteam-off.json | 256/256 | — | EXACT |
| turn4-rockslide-off.json | 256/256 | — | EXACT |
| turn5-action-off.json | 1/32 | 32/32 (docs/turn4-fold-pp-freshness-design.md) | **DEVIATION** — first mismatch frame 5927 (reran fresh: 1/32 again) |
| turn5-confirm-off-a.json | 8/132 | 132/132 (docs/turn4-fold-pp-freshness-design.md) | **DEVIATION** — first mismatch frame 5958 |
| turn5-confirm-off-b.json | 0/132 | 132/132 (docs/turn4-fold-pp-freshness-design.md) | **DEVIATION** — first mismatch frame 6090 |
| turn5-reset-off.json | 256/256 | — | EXACT (family control: unaffected) |
| turn5-resolve-off-a.json | 7/196 | 196/196 (docs/turn4-fold-pp-freshness-design.md) | **DEVIATION** — first mismatch frame 6222 |
| turn5-resolve-off-b.json | 71/196 | 196/196 (docs/turn4-fold-pp-freshness-design.md) | **DEVIATION** — first mismatch frame 6418 |
| turn5-resolve-off-c.json | 149/196 | 196/196 (docs/turn4-fold-pp-freshness-design.md) | **DEVIATION** — first mismatch frame 6763 |
| turn5-resolve-off-d.json | 0/196 | 196/196 (docs/turn4-fold-pp-freshness-design.md) | **DEVIATION** — first mismatch frame 6810 |
| turn6-reopen-off.json | 11/46 | 46/46 (docs/turn4-fold-pp-freshness-design.md) | **DEVIATION** — first mismatch frame 7305 (reran fresh: 11/46 again) |
| turn9-quickattack-b-off.json | 231/231 | 231/231 | EXACT |
| turn9-quickattack-off.json | 177/233 | 177/233 (PROGRESS-archive.md:13444, idle-bounce-phase, docs/idle-bounce-phase-attribution.md) | AT-DOCUMENTED-BAR |
| turn9-rockslide-off.json | 256/256 | — | EXACT |
| win-terminal-window-off.json | 3590/3590 | — | EXACT |

**Tally:** 95 run · 68 EXACT · 10 AT-DOCUMENTED-BAR · **17 DEVIATION**
(battle1-swap ×16 + loss-terminal-decline-continuation-off) that are part of
cluster 1/3, **+ 9 DEVIATION** in the turn5/turn6 cluster (2) = **26
DEVIATION rows total**. No trace errored (missing stage, etc.) — every one of
the 95 produced a clean numeric result.

## Task 2 — soak canary

Both commands run serially in the foreground from this tree, no code
changes.

- `npm run soak -- --policy vanilla --seeds 0:20` → **20/20 OK**, 216.0s
  wall. No CRASH, no HANG.
- `npm run soak -- --policy full --seeds 0:30` → **30/30 OK**, 429.5s wall
  (~7.2 min). No CRASH, no HANG.
- `npm run soak -- --policy full --seeds 30:60` → **not run.** Task 1's
  deviation investigation (verifying the two clusters above were real and
  reproducible, not sweep artifacts) ran past the ~20 min checkpoint before
  soak started; by the time the first full-policy chunk finished, the
  session was past the ~38 min mark specified in the brief's time-box, which
  explicitly calls for recording a partial 0:30 run and moving on rather
  than risking the mandatory finish-line `npm test`/`npm run build` not
  completing. Per the brief: "if task 2's full 0:60 cannot finish by ~38
  min, run 0:30 and record exactly what ran" — this is that outcome, exactly
  as anticipated by the brief.

**Soak verdict:** 50/50 seeds run (20 vanilla + 30 full) all OK, zero
crashes or hangs on the seeds actually exercised. Seeds 30-59 of the full
policy are unexercised by this sweep.

## Finish-line verification

- `npm run test:smoke` → **375/375 passed** (8 files), 24.93s.
- `npm test` (full suite) → **1065 files passed, 44 skipped (1109 total)**;
  **10011 tests passed, 223 skipped (10234 total)**, 110.00s.
- `npm run build` → green, `tsc -b && vite build` clean, 691 modules,
  built in 6.52s (pre-existing >500kB single-chunk warning, unrelated to
  this sweep, not investigated).

All three finish-line checks are green on `33fcda01` **despite** the 26
DEVIATION rows above — those are `tools/compare/` (Tier 2, not part of
`npm test`) fixtures the standing Tier-1 suite does not cover. Nothing in
this sweep touched a file; the tree is byte-identical to `33fcda01`.

## #96 fix verification (2026-08-17)

Applied ISSUES #96's mechanical fix: added the missing explicit
`"appRoute": "canonical-recorded"` field (same position/style as
`battle1-swap-enemy-accept-exit.json`, the one family member that already
had it) to all 17 `battle1-swap-*` traces flagged DEVIATION in the table
above. `battle1-swap-enemy-accept-exit.json` itself was not touched (already
had the field, already 43/43 EXACT). Each of the 17 edited traces was rerun
individually and serially against the Battle Scene OFF oracle
(`npm run compare -- <trace> --summary`).

| Trace | Post-fix count | Documented bar | Classification |
| --- | --- | --- | --- |
| battle1-swap-enemy-accept-b-return.json | 69/69 | 69/69 (s8 audit) | RESTORED |
| battle1-swap-enemy-accept-no-return.json | 69/69 | 69/69 (s8 audit) | RESTORED |
| battle1-swap-enemy-accept-prompt.json | 66/66 | 66/66 (s8 audit) | RESTORED |
| battle1-swap-enemy-cancel-quit-yes.json | 65/65 | full (rung14) | RESTORED |
| battle1-swap-enemy-picker.json | 129/130 | 130/130 (s8 audit) | **STILL-DEVIANT** — first mismatch frame 29838 (5px, 0.01%, bbox=239,62-239,66) |
| battle1-swap-enemy-pkmn-return.json | 115/115 | 115/115 (s8 audit) | RESTORED |
| battle1-swap-enemy-quit-b-no-return.json | 113/113 | full (rung14) | RESTORED |
| battle1-swap-enemy-quit-b-return.json | 113/113 | full (rung14) | RESTORED |
| battle1-swap-enemy-quit-b-yes.json | 65/65 | full (rung14) | RESTORED |
| battle1-swap-player-cancel-quit-yes.json | 68/68 | 68/68 (s8 audit, "CANCEL+YES") | RESTORED |
| battle1-swap-player-options-b-close.json | 59/59 | 59/59 (s8 audit) | RESTORED |
| battle1-swap-player-options-popup.json | 44/44 | 44/44 (s8 audit) | RESTORED |
| battle1-swap-player-options.json | 58/58 | 58/58 (s8 audit) | RESTORED |
| battle1-swap-player-picker.json | 101/101 | 101/101 (s8 audit) | RESTORED |
| battle1-swap-player-quit-b-return.json | 61/67 | 67/67 (s8 audit) | **STILL-DEVIANT** — first mismatch frame 29774 (176px, 0.46%, bbox=61,54-81,73) |
| battle1-swap-player-quit-no-return.json | 61/67 | 67/67 (s8 audit) | **STILL-DEVIANT** — first mismatch frame 29774 (176px, 0.46%, bbox=61,54-81,73, identical signature to `player-quit-b-return`) |
| battle1-swap-player-quit-yes.json | 31/31 | 31/31 (s8 audit) | RESTORED |
| battle1-swap-player-summary-return.json | 147/147 | 147/147 (s8 audit) | RESTORED |

**Tally: 14 RESTORED / 3 STILL-DEVIANT.** The still-deviant three are all
massively improved from the pre-fix ~0/N whole-frame-mismatch collapse (the
field fix clearly landed and is doing its job for all 17) but stop short of
their documented full bar with small, localized per-frame diffs — a
different, narrower mechanism than the appRoute papercut this entry fixes.
Per #96's own fix-shape note ("Any member that does NOT restore after the
field fix is a separate real drift and must be recorded individually — do
not lump it back into this entry"), these three are left as-is here, not
debugged further. `player-quit-b-return` and `player-quit-no-return` share
an identical first-mismatch signature (same frame, same bbox, same pixel
count) suggesting one shared root cause across both; `enemy-picker`'s is a
much smaller, distinct 5px sprite-edge delta.

Finish-line: `npm run test:smoke` green (trace JSONs are not part of the
Tier-1 suite; only the doc + trace edits were made in this step, per the
step brief's guidance that smoke suffices when nothing beyond trace JSONs
and this one doc is touched).
