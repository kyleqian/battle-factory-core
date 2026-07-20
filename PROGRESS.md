# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 186 — Bounded worker (S7 slice L-4): materialize ramp-down + wobble phase CLOSED, `turn5-switchin.json` extended **167→241** (6588-6828, full ball-to-settle window), **0 diff, ZERO exclusions** — two independent bugs root-caused (a corrupted coefficient table + a healthbox Z-order miss)

- **State:** `npm test` **790/790** (+3), `npm run build` green, tree clean
  at `9faddea`. No worktrees. `turn5-switchin.json` now covers the FULL
  ball-to-settle window, 0 diff, no excluded ticks.
- **Did:** assigned to close the ramp-down residual (~1100-1350px/frame,
  render 6768-6782) and verify the wobble phase. RAM-probed `oam.affineMode`/
  `gOamMatrices` directly (new `tools/probe/dump-switchin-materialize-
  affine.py`) across the ramp window — matrix pinned at pure identity,
  `affineMode=NORMAL` throughout, ruling out geometry entirely. Root cause
  was the palette coefficient itself: the PRIOR session's own
  `TURN5_MATERIALIZE_RAMP_COEFF` table and its "same render tick" lag
  finding were BOTH corrupted — decoded from a degenerate `gPlttBufferFaded`
  offset (`+0x222..0x228`) where `BlendPalette`'s integer truncation
  collapses several coefficients onto identical output. Reprobed at
  `+0x230` (a non-degenerate color, cross-checked against 3 independent
  oracle pixels) and found the REAL sequence: flat coefficient 16 through
  render 6767, then a perfectly linear 15->0 countdown from render 6768,
  with the ORDINARY +1 RAM-to-render lag (not same-tick as previously
  believed). Unified growing+ramp into one draw call via new
  `drawSpriteSheetAffineTintedBlend` (identical to the old flat-tint call
  at coeff=16, no seam). Wobble phase needed `doubled=true`
  (`ST_OAM_AFFINE_DOUBLE`, RAM-confirmed) threaded into
  `drawSpriteSheetAffineStretch` — verified as its own isolated 0-diff
  span. A SEPARATE bug surfaced once the window widened past 6754: the
  opponent's own particle burst painted over the player's healthbox UI —
  real hardware sets ALL healthbox pieces to OAM priority 0 during battle
  animations (`LaunchBattleAnimation`/`UpdateOamPriorityInAllHealthboxes(0)`,
  `battle_anim.c`), unconditionally on top; moved `drawMenuHealthboxPlayer`/
  `drawPlayerHealthboxHpOverlay` to draw after `drawTurn5SwitchinSprite` in
  `drawTurn5RockSlideWindow`. +3 Tier-1 pins (`turn5MaterializeCoeff`).
  Regression-swept clean at unchanged counts: `turn5-sentout` 141/141,
  `turn5-rockslide` 256/256, `turn4-doubleteam` 250/250, `turn5-menu`
  42/42, `fight-submenu-reopen` 90/90, `turn3-menu` 254/254,
  `turn4-rockslide` 250/250, `turn5-endeavor` 254/254. Docs:
  `faint-switch-notes.md` §10 rewritten (both prior "not landed" items
  closed, the Z-order finding added, status CLOSED); archived #183 to
  `PROGRESS-archive.md` to keep the ledger to 3 entries.
- **Next:** the faint/forced-switch sequence's last unexplored territory
  is past `TURN5_PIDGEOTTO_SETTLE_TICK`(6828) — healthbox slide-in, Sitrus
  proc, settled menu vs PIDGEOTTO (§8e/§2/§3e, fully spec'd, untouched).
  Then turn 6+ toward battle 1's WIN.
- **Notes:** no new papercuts. One self-corrected false start: an
  intermediate "constant coefficient 15" hypothesis for the flat span
  looked plausible from a degenerate RAM decode but was caught by a direct
  oracle pixel cross-check before it was ever committed.

---
## 185 — Supervisor wind-down: session end 2026-07-20 ~16:00 — **15 worker steps verified and folded** (9 main-lane + 6 worktree, 41 commits); suite **744 → 787/787**; headlines: **turns 3, 4, and 5 of battle 1 are COMPLETE and pixel-exact through Grovyle's faint** (11 new committed traces), **every excluded residual tick in turns 1-5 is now RESTORED and GREEN** (four separate root-caused engine bugs, zero "hardware quirk" labels left standing), and the **user-reported FIGHT B-close/reopen strand (ISSUES #25) was root-caused, oracle-verified, and fixed same-day**

- **State (verified this minute):** `npm test` **787/787**, `npm run
  build` green, tree clean at `a05e9d0`+docs, no worktrees, no unmerged
  branches. Full sweep spot-rechecked by supervisor this hour:
  `turn4-doubleteam` 250/250, `turn5-menu` 42/42, `fight-submenu-reopen`
  90/90, `fight-submenu` 235/235, `turn3-menu` 254/254, `turn5-switchin`
  167/167, `turn5-sentout` 141/141 — all 0 diff; `sendout` 255/256 and
  `s6-acceptance` 224/228 unchanged (#5/#18 policy-settled).
- **Session narrative (~09:30-16:00, 8 rounds, two lanes):** turn 3
  (slices G/H), turn 4 (I, I-2 after a characterized-not-committed first
  attempt), turn 5 through the KO (J, K) all landed by the
  "parameterize, don't rebuild" pattern — every slice RAM-probed anchors
  before render code. The switch-in tail landed in three rungs (L
  no-land with findings banked → L-2 resolved the 6727 icon-bar
  transient → L-3 landed ball/particles/materialize-growth); its
  remainder (materialize ramp-down residual ~6768-6782, healthbox
  slide-in, Sitrus, settled menu) is precisely bounded in
  faint-switch-notes §10 / battle-turn-notes §26. Worktree lane ran 6
  scouts/probes: faint/switch-in AI rule + Sitrus formula, switch-in
  itemization + Pidgeotto verification, shake/bounce residual probes
  (Families A/B), slice-L gap closure (4/5), and the extremum probe —
  each folded with supervisor re-verification of a central claim.
- **The residual-elimination thread (session's best result):** four
  independent excluded-tick families were root-caused as REAL,
  small engine bugs and fixed with all ticks restored: stale
  `gBattleMovePower` shake amplitude (general rule + a turn-5
  prediction pinned BEFORE its window rendered — confirmed live);
  turn-3 bounce composition uniformly +1 tick (visible only at sine
  plateau crossings); the turn-4 kickoff-text delay-family gate; the
  turn-5 reopen's same-tick phase switch. Turns 1-5 traces now capture
  every tick of their windows except ISSUES #23's parked projectile span.
- **User interaction:** mid-session bug report (FIGHT → B → A dead) —
  supervisor root-caused the state-machine strand + banked oracle ground
  truth (reopen + cursor persistence) within the hour; fix landed as
  ISSUES #25 (filed → fixed → deleted same day), `fight-submenu-reopen
  .json` 90/90.
- **Next:** (1) finish the switch-in tail from §10's bounded remainder
  (ramp-down residual first — RAM palette-buffer approach per the
  PAPERCUTS note); (2) then turn 6+ toward battle 1's WIN (§14-§16
  ground truth banked); (3) ISSUES #23 stays parked; (4) the §ISSUES-25
  "sine quantization edge" family in the reopened submenu's later dwell
  is the one new named-open residual (same family as the pre-existing
  resumed-menu tick 2073 note).
- **Notes:** no usage-limit events; one launcher failure (inline brief
  with `!(` — zsh parse, papercut recorded, relaunched via brief file);
  4 new PAPERCUTS entries total this session. Worker discipline was
  strong: two honest no-lands (slice L attempt 1, slice I attempt 1)
  both banked findings instead of shipping red, and both windows landed
  on the sharpened retry.

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

