# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 181 — Bounded worker: S7 slice L-3 — ball prop + open-particle burst + materialize GROWING phase LANDED; `turn5-switchin.json` (new) **167/167, 0 diff**, `npm test` **781/781** (+1), build green, zero regressions; materialize's own ramp-down/wobble phases + everything past them (healthbox/Sitrus/settled-menu) NOT reached

- **State:** `npm test` 781/781, `npm run build` green, tree clean.
  `turn5-switchin.json` (ball prop create/open/openFinal, the open-particle
  burst, Pidgeotto's materialize GROWING silhouette, tick 6588-6754)
  **167/167, 0 diff** (new). Full regression sweep at exact prior counts,
  all 0 diff: `turn5-sentout` 141/141, `turn5-faint` 110/110, `turn5-
  rockslide` 256/256, `turn5-endeavor` 254/254, `turn5-menu` 41/41, `turn4-
  rockslide` 250/250, `turn4-doubleteam` 249/249, `turn3-rockslide`
  256/256, `turn1-rockslide` 256/256, `fight-submenu` 235/235, `turn3-
  endeavor` 192/192, `turn3-menu` 254/254, `turn2-endeavor-drain` 201/201,
  `turn4-menu` 44/44, `turn2-dragonbreath` 237/237, `turn1-cloneanim`
  230/230, `menu-idle` 69/69, `turn2-endeavor` 77/77, `s6-acceptance`
  224/228, `scene-assembly` 256/256, plus `sendout.json` **255/256**
  (unchanged, pre-existing named residual).
- **Did:** per the brief's own instruction, RAM-probed ambiguities against
  the already-committed probes first, then iterated render code against the
  live oracle. Landed the ball prop (`TURN5_BALL_HANDOFF_TICK=6727`,
  reusing `drawSendOutBall` verbatim - zero new ball code), a NEW clean
  open-particle-burst formula (`drawTurn5SwitchinParticles` - reusing
  `drawBallOpenParticles` verbatim was WRONG, it bakes in an S6-specific
  one-off RAM-stall correction that doesn't apply here), and Pidgeotto's
  materialize GROWING phase (reuses `affineEmergeAccumulator`/
  `MATERIALIZE_Y2_TABLE` verbatim, including the `+1` logical-offset
  correction §7.21 already established for Grovyle). Found and fixed two
  real bugs mid-session: (1) the switch-in window's own BG-to-white dither
  table was under-resolved on a first pass (a low-dynamic-range sky swatch
  hid two real steps) - re-derived from a ground swatch, exact; missing
  this produced a >16000px/43% full-frame diff that read like a sprite bug
  until isolated. (2) Pidgeotto's own front-sprite frame-parity mapping was
  inverted from the naive even/odd guess - pixel-verified and flipped
  (474px -> 26px residual). The coefficient ramp-down phase (render
  6768-6782) still carries a real ~3% residual not root-caused this
  session (RAM-exact coefficients, something else off - see docs); the
  wobble-table phase (~6786-6828) looks clean in spot checks but wasn't
  independently verified as its own 0-diff span. Per AGENTS.md, cut the
  committed trace at the longest verified-clean boundary (6754, right
  before the ramp phase) rather than ship the residual ticks.
- **Next:** close the coefficient-ramp residual (render 6768-6782, exact
  RAM values already known - `docs/faint-switch-notes.md` §10 item 1),
  verify the wobble-table phase as its own dense span (item 2), which
  unlocks `TURN5_PIDGEOTTO_SETTLE_TICK`(6828, already pixel-confirmed) as
  a clean extension boundary. Healthbox slide-in through Sitrus/settled-menu
  (§8e/§2/§3e, fully spec'd) remain completely untouched.
- **Notes:** PAPERCUT: ~25-30 min lost to a background-fade-table
  under-resolution that read as a sprite-geometry bug (huge 43% diff)
  before isolating it to a palette-blend table built from too low a
  dynamic-range swatch - worth flagging in any future "pixel-sample a
  fade table" task: verify against a swatch whose unfaded value has enough
  headroom in EVERY channel to resolve each step distinctly, or solve
  directly from RAM palette-buffer data (as this session ultimately did for
  the ramp-down coefficient) rather than a screenshot color read.
