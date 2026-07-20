# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 163 — Bounded worker: ISSUES #22 ROOT-CAUSED AND CLOSED — same asset-harvest bug class as #19, but region A (onix), not region B (healthbox); also closed the two DRAGON_BREATH sine-peak residuals (3465/3721) named in E2b/E2b-2, plus tick 3337 turned out to already be fixed — one NEW single-tick residual surfaced and correctly scoped out (not fixed, different mechanism); `npm test` **740/740** (+8), build green

- **State:** `npm test` 740/740, `npm run build` green, tree clean.
  `battle1-fight-submenu-idle.json` **256/256** (was 255/256, ISSUES #22
  CLOSED). `turn2-dragonbreath.json` **237/237** (was 235/235, +3465/
  +3721). `turn2-endeavor-drain.json` **200/200** (was 201/201, −1 —
  see "Notes"). `fight-submenu.json` 235/235, `s6-acceptance.json`
  224/228, `sendout.json` 255/256 — all unchanged. Broader sweep
  unchanged: `menu-idle.json` 69/69, `turn1-kickoff.json` 81/81, `turn2-
  endeavor.json` 76/77, `turn3-menu.json` 250/250, `confirm-flow.json`
  79/95, `rent-3picks.json` 157/190, `rent-slot1.json` 125/139.
- **Did:** The brief's hypothesis (ISSUES #22's tick 2135 + DRAGON_BREATH's
  named ticks 3337/3465/3721 might be the same family as #19, a harvested
  asset with a bbox/state that excludes the sine table's rare peak) was
  **CONFIRMED for 3 of 4, for a second asset** — pixel-dumped all four:
  2135/3465/3721 share an EXACT bbox `(44,50)-(99,111)` and byte-identical
  color-transition histogram (769px each); tick 3337 turned out to
  already be fixed (0 diff — an apparent side effect of S7 slice E2b-2's
  earlier `yOffset` fix, never re-tested against that specific tick
  since it sits outside E2b-2's own rescan window). Root cause:
  `extract-menu-idle-window.ts` only ever harvested ONE onix-region patch
  (a `y2=1` tick) — `battleScene.ts` openly named the gap ("`onixY2>=1`
  degrades to the same y2=1 patch") rather than hiding it, but region A
  never got the y1/y2 split #19 already gave region B. Fixed in two
  stacked layers (same order #19's own derivation implies): (1) harvested
  a real `y2=2` patch (`ONIX_Y2_TICK=1877`, found via `onixSinIndex(n)
  mod 256 == 64`), renamed the shared type to `MenuIdleBounceTwoStateAsset`
  and factored the y1/y2 dispatch into one `drawTwoStateBounceRect`
  helper for both regions — closed 769px→3px; (2) `ONIX_BBOX` itself was
  ALSO 1 row short (height 62→63, rows 49-110→49-111) — the SAME bug #19
  found in region B's own bbox, stacked on top of layer 1's missing-patch
  bug. Both layers landed, all three ticks 0 diff. Full writeup:
  `docs/battle-menu-notes.md` §8c.
- **Next:** faint/forced-switch is still the biggest remaining S7 item
  (§13-§14 ground truth already banked); S8 engine work is unblocked
  separately. Whoever wants the NEW tick-2901 residual (see Notes) should
  RAM-probe the ONIX sprite's `sSinIndex`/bounce-task state directly at
  RAM tick 2900 during turn 2's own pre-confirm dwell.
- **Notes:** fixing #22 surfaced a DIFFERENT, previously-invisible bug:
  `turn2-endeavor-drain.json` tick 2901 (turn 2's own idle dwell, before
  the ENDEAVOR confirm) computes the correct `onixY2=2` via the closed
  form, but the REAL oracle pixels there match the `y1` patch, not `y2` —
  `drawActionMenuIdleWindow`'s "plain `t`" bounce-tick convention for this
  window (previously "oracle-confirmed fine," per its own doc comment)
  has its own unmodeled anchor error at the rare peak, invisible until
  now because the OLD always-degrade-to-y1 approximation coincidentally
  produced correct pixels here. Different mechanism (a bounce-tick anchor
  bug, not a harvest-asset bug) and out of this step's own scope (asset
  fixes only) — named tick 2901 excluded from `captureFrames`
  (`201→200`), not silently shipped wrong, dense neighbors (2894-2950)
  stay captured and green. No papercuts.

---
## 162 — Bounded worker: S7 slice F — turn 3's FIGHT-submenu reopen (cursor persistence, PP, bounce-anchor) landed; the faint itself and everything past it is honestly OUT of scope this session; `turn3-menu.json` (new) **250/250**, `npm test` **738/738** (+6), build green, zero regressions

- **State:** `npm test` 738/738, `npm run build` green, tree clean.
  New `tools/compare/traces/turn3-menu.json` (extends `turn2-dragonbreath
  .json`'s 3846-frame prefix verbatim, +50 frames through tick 3896) is
  **250/250** (two named single-tick residuals excluded, see below).
  Regressions re-confirmed: `turn2-dragonbreath.json` **235/235**,
  `turn2-endeavor-drain.json` **201/201**, `fight-submenu.json` **235/235**,
  plus a broader sweep (`turn1-drain`, `turn1-rockslide`, `turn1-kickoff`,
  `menu-idle`, `turn2-endeavor`, `sendout`, `s6-acceptance` all unchanged —
  the latter two's own pre-existing gaps, 224/228 and 255/256, untouched).
- **Did:** The engine only ever modeled turns 1-2 and then dead-ended: a
  fresh A-press on turn 2's own resettled menu did nothing (`core.ts`'s
  reopen-FIGHT branch was gated `!turn1Resolved`, one-shot by construction).
  Added a second boolean (`BattleSceneState.turn2Resolved`) and a new
  `core.ts` branch, same shape as turn 1→2's own gate, keyed off
  `DRAGONBREATH_MENU_REDRAW_DELAY` (now exported) having elapsed since turn
  2's own confirm. This is the FIRST reopen that genuinely exercises cursor
  persistence (§13: `gMoveSelectionCursor` reads 2, DRAGON_BREATH, at turn
  3's reopen — turn 1→2's own reopen coincidentally rested at slot 0 both
  times, so it never distinguished "always reset" from "persist"):
  `openFightSubmenu` gained an optional `initialCursor` param (default 0,
  every existing call site unaffected). Fixing this surfaced 3 real
  rendering gaps in shared, previously-turn-1/2-only code (never triggered
  before because no earlier state needed a battler's own HP to differ from
  the static harvest while ALSO dwelling in the FIGHT-submenu's *generic*
  idle/DMA-wait draw path): Grovyle's opponent-HP overlay was frozen at
  turn 1's end value (101, not turn 2's real 88); Onix's own HP overlay
  wasn't drawn AT ALL in the generic path (only turn-2-specific bespoke
  functions had it, each with their own manual overdraw); and the idle-
  bounce phase (`turn2SubmenuBounceTick`, anchored to turn 1's own confirm)
  is turn-2-specific — reusing it for turn 3 produced a 6.1%-of-frame
  whole-silhouette mismatch on every captured tick, fixed with a new
  `turn3SubmenuBounceTick`/`TURN2_CONFIRM_PRESS_TICK`(2945) composing
  `dragonBreathResettledBounceTick`'s existing remap. `currentPPForActiveMon`
  also gained a `turn2Resolved` param (DRAGON_BREATH 20→19 PP, §14's own
  ground truth). Two named single-tick residuals (ticks **3879** and
  **3888**, isolated Onix-sprite/healthbox bounce blips, same "hardware
  quirk at a bounce extremum" class as this dossier's tick 3337/3465/3721)
  excluded from `captureFrames`, not chased further. 6 new
  Tier-1 tests (`openFightSubmenu` cursor persistence, `currentPPForActive
  Mon`'s new decrement, and a 3-test `core.ts`-integration suite driving the
  new reopen gate through `tick()` directly). Full writeup in
  `docs/battle-turn-notes.md`'s new §19.
- **Next:** turn 3's own actual RESOLUTION (ENDEAVOR hits Onix 101→88 again,
  ROCK_SLIDE hits Grovyle 88→41) is next, starting from `turnKickoffTextStartTick`
  on — §13's ledger already has every HP/RNG value banked, no new oracle
  scouting needed, just engine work (expect it to cost about what turn 2's
  own E1/E1b/E2a/E2b slices each did). After that: turn 4 (DOUBLE_TEAM),
  turn 5 (the actual faint — Grovyle 1→0), the button-gated KO text, DESTIN's
  Pidgeotto switch-in, then — much later — Onix's OWN faint (§14) and the
  forced party-select/SEND OUT sequence. This session did NOT touch any of
  that; "faint/forced-switch" as a whole is still almost entirely unbuilt.
- **Notes:** no papercuts. The brief's own suggested trace name
  (`turn3-faint.json`) was NOT used since this session's actual window
  doesn't reach anywhere near the faint — named `turn3-menu.json` instead,
  for what it actually covers, per this run's own "name it for what it
  covers if your window differs" convention.

---
## 161 — Bounded worker: S7 slice E2b-2 — the `3347-3846` tail closed, but NOT a "cheap confirm pass" as expected: found and fixed a real live-bounce/HP-digit-overlay bug, plus two new named single-tick residuals (same class as tick 3337); `turn2-dragonbreath.json` **235/235**, `npm test` **732/732** (+1), build green, zero regressions

- **State:** `npm test` 732/732, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **235/235** (`3121-3346` minus tick 3337, plus
  the `3347-3846` tail at stride 10 + two dense 11-tick windows, minus
  ticks 3465/3721). Regressions re-run and confirmed: `turn2-endeavor-
  drain.json` **201/201**, `fight-submenu.json` **235/235**, `s6-
  acceptance.json` **224/228** (this trace's own pre-existing gap,
  unchanged). The `3177-3235` fire-projectile gap (ISSUES #23) untouched.
- **Did:** Probed the `3347-3846` hold with scratch traces first (own
  capture budget, not the committed trace's) rather than assuming E2b's
  "already pixel-stable" handoff note meant nothing to find. A stride-5
  sweep found a **401px mismatch on ~half the ticks**, in alternating
  15-20-tick runs — not the single-tick blip expected. Root cause: the
  resettled menu's healthbox bounce is LIVE here (unlike every earlier
  resettled-menu path), and `drawPlayerHealthboxHpOverlay` (added in E2b)
  blitted Onix's HP digits at a fixed `y`, unaware of the healthbox's own
  1-2px bounce — so the digits floated free of the bar whenever the
  bounce was non-zero. Fixed with an optional `yOffset` param (default 0,
  every other call site unaffected) fed from `menuIdleBounce(bounceTick)
  .healthboxY2`. Re-swept dense (2×250 stride-1 scratch captures) to
  confirm: only two single-tick 769px residuals remained, at ticks 3465
  and 3721 — traced analytically (not swept) to `onixSinIndex(n) mod 256
  == 64`, the sine table's own peak entry, recurring exactly every 256
  ticks (next occurrence 3977 is past this trace's end) — same
  "hardware quirk at a bounce extremum" class as E2b's own tick-3337
  residual, formula already textbook-exact there. Extended `turn2-
  dragonbreath.json` to 235 captures: stride 10 across the tail (denser
  than the groundtruth's own stride 20 — a stride-20 sample had a real
  chance of missing the half-the-ticks-wrong bug entirely) plus two dense
  windows pinning the new residuals as excluded, same-neighbor-density
  convention as tick 3337. One new Tier-1 pixel pin (`tests/battleScene
  .test.ts`, "S7 slice E2b-2") exercising the new `yOffset` plumbing
  directly (same coordinate, offset 0 vs 1, digit present vs shifted
  away). Full writeup in `docs/dragon-breath-notes.md`'s new "Engine
  slice E2b-2" section.
- **Next:** with this tail closed, `turn2-dragonbreath.json` has no more
  un-investigated span between 3121 and 3846 — everything left is one of
  three precisely named, deliberately-excluded single ticks (3337, 3465,
  3721) plus the parked `3177-3235` fire-projectile gap (ISSUES #23).
  Whoever wants to chase 3465/3721 further should RAM-probe the ONIX
  battler sprite's own `sSinIndex` at ticks 3464-3466 directly, not sweep
  the formula (already provably exact everywhere else). Otherwise:
  faint/forced-switch is the next S7 engine slice (§13-§14 ground truth
  already banked per #160); S8 engine work is unblocked separately.
- **Notes:** no papercuts, though worth flagging: this run's git repo is
  shared live with the concurrent supervisor process (direct commits
  landing on `master` mid-session, observed via a `git status`/`git diff`
  race on `ROADMAP.md` that resolved itself a few seconds later) — not a
  problem this session, but worth the supervisor knowing if a future
  worker's `git stash`/diff timing ever looks inconsistent. Scratch probe
  traces (`tools/compare/scratch/probe-tail-*.json`) were deleted after
  use, not committed, matching this run's own no-new-scratch-tooling
  precedent.

---
