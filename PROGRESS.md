# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 184 — Bounded worker: PROGRESS #183's two extremum ticks CLOSED — both verified corrective rules applied, both restored 0-diff; `turn4-doubleteam.json` **250/250**, `turn5-menu.json` **42/42**, `npm test` **787/787** (+2), build green, zero regressions across turns 1-5

- **State:** `npm test` 787/787, `npm run build` green, tree clean (2
  commits, `73bce5b` fix 4934 + `a05e9d0` fix 5927). Turns 1-5 now carry
  **zero excluded residual ticks**.
- **Did:** applied both rules verbatim from `docs/turn3-residual-probe-
  notes.md` "The extremum class, probed", each verified first via its own
  `tools/probe/verify-turn{4,5}-*.py` (reran clean before touching code, per
  the brief). (4934) `battleScene.ts`'s `drawFightSubmenuWindow` `textStart`
  gate now additionally excludes `turn3Resolved && !turn4Resolved` from the
  ENDEAVOR-family test, so turn 4's own DOUBLE_TEAM kickoff gets the right
  delay family. (5927) `drawActionMenuIdleWindow` gained an optional
  `turn5ReopenPressTick` param (threaded from `sm.openElapsed` at the one
  DMA-wait call site) that holds the unshifted
  `turn4RockSlideResettledBounceTick` formula for exactly `t === pressTick`,
  switching to the shifted `turn5SubmenuBounceTick` from `pressTick+1` on -
  single-tick-scoped, matches the doc's "delay the switch by one tick"
  framing exactly. Both traces restored to their captureFrames (249→250,
  41→42), both 0 diff. Regression sweep (turn4-rockslide 250/250, turn5-
  endeavor 254/254, turn5-sentout 141/141, turn3-menu 254/254, turn2-
  dragonbreath 237/237, fight-submenu-reopen 90/90, turn1-cloneanim
  230/230) all unchanged, 0 diff. +2 Tier-1 pins (`tests/battleScene.test.ts`:
  the kickoff-text gate at 4933/4934/4935, the Onix bounce phase at
  5926/5927/5928). Docs: both ticks marked RESOLVED in `turn3-residual-
  probe-notes.md`, one-line corrections at `battle-turn-notes.md` §22/§23's
  old exclusion notes; archived #181 to `PROGRESS-archive.md` to keep the
  ledger to 3 entries.
- **Next:** resume the roadmap where #181/#182 left off - materialize's own
  ramp-down/wobble phases (`docs/faint-switch-notes.md` §10) + everything
  past them (healthbox slide-in, Sitrus, settled-menu). No other residuals
  remain open in the turn 1-5 window.
- **Notes:** caught one arithmetic slip mid-session: the reopen's own
  `sm.openElapsed` encodes `pressTick - TICK0` (not `+1` as a first read of
  `core.ts`'s call-site comment suggested) - verified against
  `fightSubmenu.test.ts`'s own pinned `openElapsed` value before trusting
  the offset, caught by the first compare run (41/42, not 42/42) rather than
  shipped wrong.

---
## 183 — Worktree probe (supervisor-folded): BOTH remaining "redraw extremum" ticks ROOT-CAUSED as real engine bugs (label retired) — 4934 = kickoff-text delay-family mis-selected by the monotonic `turn2Resolved` gate during turn 4's DOUBLE_TEAM window; 5927 = the -2 bounce phase shift applied in the SAME render tick the reopen press registers (hardware switches one tick later); merged `7d93103`, suite 785/785 on the merged tree

- **State:** merged into master, `npm test` 785/785 + build green
  post-merge. New: 6 probe specs + twice-run outputs, 3 verification
  scripts (supervisor re-ran `verify-turn4-kickoff-textgate-rule.py` and
  `verify-turn5-reopen-switch-rule.py` in the worktree — both VERDICT
  sections pass), `docs/turn3-residual-probe-notes.md` "The extremum
  class, probed". No engine changes (by design).
- **Did:** (4934) the RAM `OpponentHandlePrintString` tick is
  move-family-specific (+9 DOUBLE_TEAM, +8 ENDEAVOR), render lag uniform
  +1; the engine's `textStart` gate keys off monotonic `turn2Resolved`
  so turn 4 wrongly gets ENDEAVOR-family delay. Corrective rule (add
  `&& !(turn3Resolved && !turn4Resolved)`) verified across all 5 turns,
  zero collateral. (5927) `core.ts` applies `turn5SubmenuBounceTick`'s
  shift in the press-registering tick itself; the real bouncer is smooth
  through it — the rule is a ONE-TICK-LATE formula switch, single-tick-
  scoped, cannot touch 5928+ (all already exact). A non-causal 2-tick
  sSinIndex stall one tick later was found and honestly ruled out.
- **Next:** a small cleanup slice applies both rules + restores 4934/
  5927 to their traces' captureFrames (turns 1-5 would then have ZERO
  excluded residual ticks).
- **Notes:** no new papercuts.

---
## 182 — Bounded worker: ISSUES #25 FIXED — FIGHT-submenu B-close/reopen strand (user-reported) — new dispatch branch reopens after a settled B-close with cursor persisted, at every turn epoch, no epoch flag advanced; `fight-submenu-reopen.json` (new) **90/90, 0 diff**, `npm test` **785/785** (+4), build green, zero regressions

- **State:** `npm test` 785/785, `npm run build` green, tree clean.
  `tools/compare/traces/fight-submenu-reopen.json` (`fight-submenu.json`'s
  script verbatim + `A`(2f) + 60 idle, dense stride-1 captures 2040-2129 -
  B-close, settle, A, reopen transient, reopened submenu's own idle start)
  **90/90, 0 diff** (new). Regression sweep at exact prior counts, all
  unchanged: `fight-submenu.json` 235/235, `turn3-menu.json` 254/254,
  `turn4-menu.json` 44/44, `turn5-menu.json` 41/41, `turn5-sentout.json`
  141/141, `turn5-switchin.json` 167/167, `turn1-rockslide.json` 256/256.
- **Did:** ISSUES #25 (user-reported, supervisor already root-caused the
  mechanism + banked oracle ground truth - implemented faithfully, no
  re-derivation). `core.ts` gained one new dispatch branch: once the close
  redraw settles (`closeElapsed !== null && sceneT >= closeElapsed +
  FIGHT_SUBMENU_CLOSE_DELAY`), a fresh A calls `openFightSubmenu` directly
  (same "old state -> fresh open in one step" shape the existing turn-epoch
  reopen branches already use), threading `fightSubmenu.cursor` through
  instead of a literal - no new "reset" state needed, generalizes to
  unlimited close/reopen cycles at any epoch for free. Oracle-probed (not
  assumed) two new timing facts: this reopen's own redraw is ONE TICK
  LONGER than a fresh open (pressTick+6, not +5 - modeled via `elapsed+2`
  at this one call site) and its bounce overlay is NOT reset, just keeps
  accumulating the already-documented "+2 ticks of drift per DMA-wait
  hard-cut" (new `FIGHT_SUBMENU_REOPEN_BOUNCE_SHIFT=6`, gated by a new
  `FightSubmenuState.reopenedFromClose` flag so the render can tell this
  apart from turn 1's own first open). 4 new Tier-1 pins: the too-early
  gate, full reopen with cursor persistence + all 4 `turnNResolved` flags
  unchanged, a 2-cycle close→reopen→nav→close→reopen, and the same
  mechanism at a SECOND turn epoch (turn 3's own already-reopened submenu).
  Docs: `docs/battle-menu-notes.md` new §ISSUES-25 (mechanism + full timing
  evidence + the residual below); ISSUES #25 deleted.
- **Next:** a recurring small residual (2-6% of frame, Onix/healthbox
  bounce-sprite edge pixels only, ~every 9 ticks) starts a few ticks into
  the reopened submenu's own idle dwell, past this session's committed
  clean window - same still-unattributed "sine quantization edge" family
  `FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT`'s own doc already flags as open for
  the plain resumed-menu window (its own tick 2073), not chased further
  here (see §ISSUES-25's own "Scope note"). Otherwise resume the roadmap
  where #181 left off (materialize ramp-down/wobble phases, §10 of
  faint-switch-notes.md).
- **Notes:** the render-path subtlety that made this non-trivial: naively
  resetting `fightSubmenu` to a "never opened" shape on close-settle would
  have swapped the resumed-menu's own proven-correct render formula for an
  entirely different (epoch-remap) one and likely broken `fight-submenu
  .json`'s own 235/235 - avoided by keeping `openElapsed`/`closeElapsed`
  meaning exactly what they always did and only adding a NEW branch/flag,
  never an intermediate reset state.
