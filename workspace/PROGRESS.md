# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1342 — [supervisor wind-down, 2026-08-18 session 2] **#97 near-CLOSED in one instrument→fix assembly line (10 fix + 8 instrument worker rounds): `resolve-off-b` 196/196 + both turn6 windows CLOSED, every trace verified after every round, zero guard decreases all session; one supervisor overturn (ON/OFF oracle-profile proof) unlocked turn6**

- **Final gates (independent, after the last engine fold `758107d9`;
  the two later folds `ca8e70d0`/`8127921e` are docs+probe-only):**
  full npm test **1,067 files / 10,086 passed / 223 skipped**; `npm run
  build` green; soak vanilla 0:20 **20/20 OK**; soak full 0:60
  **60/60 OK**. animation-main and rust-main EMPTY at orient AND
  wind-down. DEFERRED.md EMPTY. Only permanent worktrees remain; no
  unmerged branches; freshness-check FAIL at orient was false-positive
  #5 (PAPERCUTS bumped; zero `oracle/` commits since either service
  start).
- **Family scoreboard (session start → end, supervisor-verified after
  every round):** `turn5-confirm-off-a` 15→**128**/132; `-b`
  0→**131**/132; `turn5-resolve-off-a` 25→**58**/196; `-b`
  88→**196/196 CLOSED**; `-c` 149→**195**/196; `-d` 0→**194**/196;
  `turn6-reopen-off` 22→**46/46 CLOSED**; `turn6-menu-off` fixture
  23→**47/47 CLOSED**; controls (`turn5-reset-off` 256/256,
  `turn5-action-off` 32/32, turn4 pair 256/256, `turn13-switchin`
  242/242) never moved.
- **Supervisor decision (evidence-backed, recorded in
  `docs/turn6-reopen-endstate-spec.md` §6 + commit `cb7cbee3`):**
  overturned that spec's rejection of the turn6 [7318,1350] fix. Its
  guard trace `turn6-menu.json` is a legacy Battle Scene ON trace with
  byte-identical inputs to `turn6-reopen-off` (OFF); the two ORACLES'
  PNGs differ at 34/44 overlapping ticks while the app's are identical
  44/44 — one profile-blind render can never match both. Mission + lane
  contract + precedent (`turn5-menu` 42/42→9/42 under earlier OFF
  re-fits) say OFF wins; legacy-ON movement measured and recorded
  (turn6-menu 34→10/44, featherdance 82→64/90, feathers 227→209/235).
- **Root-cause classes landed:** three "spurious animation with zero
  RAM basis" deletions (ENDEAVOR squish package, PIDGEOTTO
  stretch/frame-flip, ONIX Sitrus rotation + granting stars); five
  wrong-anchor retimings (healthbox slide 6763, text-clear 6989,
  menu-redraw 6995, HP display-climb 6952, materialize coeff t-1); two
  missing per-window parameter threads (rockslide text delay 355,
  ENDEAVOR drain delay 116); one real state addition
  (`turn5FaintDismissElapsed` dismiss+freeze, the turn6 kickoff shift).
  The live-verification bar caught five would-be regressions before
  they landed (shared BG-fade table → forked; cursor fix broke `-c`
  through a shared path → reverted, re-instrumented, relanded; +1-off
  hand-derived freeze offset; census Class-B misattribution; ring/star
  hypothesis falsified by full OAM scan).
- **Open (ordered for next session):** (a) `resolve-off-a`'s remaining
  static-background/rock-sprite residual (span 6262-6376, ~134 frames —
  see the post-wind-down bonus round below for what's now closed vs.
  what's left). (b) Named single-frame residuals: `-c` 6763 (6px
  AA-class), `-d` 6850 + 6996 (cursor-adjacent), confirm-off 4-frame
  bounce + 1-frame edge. (c) #71 Rung 9 still blocked on the animation
  lane's rung-4 back dispatcher. (d) #73/#55 unchanged. No deferred
  questions; no blockers.
- **Post-wind-down bonus round [main worker, 2026-08-18 session 3,
  commit `e07e1813`]:** landed §15.3's fix
  (`docs/turn5-resolve-ab-pools-diagnosis.md`, corrected-bootstrap RAM
  proof that `REG_BG3VOFS` never leaves 0 anywhere in turn 5's
  6100-6376 window under Battle Scene Off) — `drawTurn5RockSlideAttack`
  no longer calls `rockSlideBg3Y`, hardcoded to the sibling turns'
  flat `drawStaticBgShiftedY(fb, 0, ...)` pattern instead.
  `turn5-resolve-off-a` **58/196 → 60/196** (exactly frames 6259/6260
  newly match — the shake sub-window's own first two nonzero ticks —
  verified via a before/after diff of the full mismatched-frame list,
  zero other frames changed). Every guard trace unchanged:
  `turn5-reset-off` 256/256, `turn5-action-off` 32/32,
  `turn6-reopen-off` 46/46, `turn6-menu-off.json` fixture 47/47,
  `turn5-confirm-off-a` 128/132, `-b` 131/132, `turn5-resolve-off-b`
  196/196, `-c` 195/196, `-d` 194/196, `turn6-rockslide-a` 255/255,
  `turn6-rockslide-b` 105/105, `turn7-rockslide-a` 256/256,
  `turn13-switchin` 242/242, `turn4-doubleteam-off`/
  `turn4-rockslide-off` 256/256. New Tier-1 pin
  (`tests/battleScene.test.ts`, §15.3): row 0 byte-identical across
  ticks 6258/6259/6260 post-fix (pre-fix it differed at all 240
  columns between 6258 and 6259/6260). `npm test` **10,088 passed**
  (+2); `npm run build` green. What's left in `resolve-off-a`
  (134/196, span 6262-6376) is NOT this fix's target and was NOT
  touched: a separate falling-rock-sprite residual starting at 6263
  (our app's own rock timing puts a rock at row 0 there; not
  cross-checked against real OAM this session) that grows into a much
  larger, already-known mismatch band through 6376 (peaking ~3.7% at
  6304-6354, a probable menu-idle-bounce or field-position drift
  unrelated to BG3, plus the already-documented Class-B
  sink-transition tail at 6360-6376). Next session should instrument
  that band fresh rather than assume it shares a cause with the BG3
  fix just landed.

---
## 1341 — [main worker, 2026-08-18] **ISSUES #97 remainder: `resolve-off-d`'s three §9-named fix shapes (star suppression + text-clear/menu-redraw retiming) LANDED — 159/196→194/196, exactly matching §9.5's own prediction**

- **State:** one green commit (`7448000c` fix+Tier-1 pins) plus this docs
  commit. `npm test` **1,067 files / 10,086 passed (+7, six new pin
  blocks + `pressTick` cleanup) / 223 skipped**; `npm run build`/
  `npm run typecheck` green.
- **Did:** read §9 fully (committed at `1ff264ee`, the side worker's own
  two-instrument follow-up) and landed all three of its named fix shapes
  together (they share one call chain and interact, so landing separately
  would re-derive the same evidence twice): (1) `suppressSitrusStars`,
  mirroring `suppressSitrusRotate` byte-for-byte — §9.2's own full
  64-slot `gSprites` RAM scan found zero granting-star/ring template
  matches anywhere in this trace, so `drawGrantingStars`'s two star
  sprites are spurious, same class as the already-fixed rotation; gated
  behind a new trailing param threaded `drawTurn5RockSlideAttack` →
  `drawTurn6FieldBase` → `resolve-off-d`'s own call site. (2)
  `TURN5_OFF_SITRUS_TEXT_CLEAR_TICK` 6991→6989 (§9.3, real hardware
  clears 2 ticks early). (3) `TURN5_OFF_SITRUS_MENU_REDRAW_TICK`
  6991→6995 (§9.4, RAM-pinned to a `gBattle_BG0_Y` scroll-snap gated
  behind an async DMA3 copy). **Resolved §9.4's own open question
  empirically, per this step's own explicit instruction:** before
  touching `src/`, inspected fresh oracle screenshots at 6989/6991/6994
  side by side — all three are the SAME plain-field image, no message
  box, no chrome at all — falsifying §6.3's own "left portion already
  matches at 6991" framing (that match was measured against unrelated
  on-field sprite pixels, not real prompt-text timing). Source
  cross-check confirms: `B_WIN_ACTION_PROMPT`/`B_WIN_ACTION_MENU`
  (`battle_bg.c:174-192`) are both `bg=0`, same scrolled row, gated by
  the SAME single `gBattle_BG0_Y` register — no independent second gate
  exists to split on. Landed the simplest shape consistent with the
  evidence: retime the one existing shared gate, no split blit. Both
  `TURN5_OFF_SITRUS_*` constants are scoped to this single call site
  (grep-confirmed, per their own doc comments), so moving them
  independently needed no sibling-turn sweep. Exported
  `drawTurn5RockSlideWindow` (was file-private) to pin the two retimed
  gates directly, mirroring `drawTurn5RockSlideAttack`'s own existing
  export for `suppressSitrusRotate`'s tests.
- **Result:** `turn5-resolve-off-d` 159/196 → **194/196** (+35, exactly
  matching §9.5's own predicted count). Tick 6850 (pre-existing,
  unrelated) and tick 6996 (cursor-adjacent, genuinely undiagnosed per
  §9.1's own explicit flag, deliberately not chased per this step's own
  "do not touch anything cursor-related" constraint) remain, both exactly
  as §9.5 predicted. Zero decreases across the full guard family, fresh
  this session: `turn5-reset-off` 256/256, `turn5-action-off` 32/32,
  `turn6-reopen-off` 46/46, `turn6-menu-off.json` fixture 47/47,
  `turn5-confirm-off-a` 128/132, `turn5-confirm-off-b` 131/132,
  `turn5-resolve-off-a` 58/196, `turn5-resolve-off-b` 196/196,
  `turn5-resolve-off-c` 195/196, `turn13-switchin` 242/242,
  `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each.
- **Next:** `resolve-off-d` is now down to its two flagged, deliberately
  unchased residuals (6850, 6996) — no further named instrument pending
  for it. `resolve-off-a`'s Class B (6248-6365 static-background span,
  side-lane territory) and `resolve-off-a`'s own 6398 residual,
  `resolve-off-c`'s 6763 residual, and `confirm-off-b`'s classes 3/4
  (ISSUES #97 sub-entries J/K) remain the family's own open items. #71
  Rung 9 unchanged.
- **Notes:** no PAPERCUT. The step brief's own MANDATORY "resolve
  empirically, don't guess" instruction on §9.4's split-gate question
  paid off directly: a plausible-sounding alternative (independently
  gating the message-box and button-grid regions, since §6.3's own
  wording explicitly invited that reading) would have added real
  complexity for no benefit — a direct pixel check ruled it out in
  minutes and the single-retimed-gate fix landed exactly at the
  predicted count on the first try.

---
## 1340 — [main worker, 2026-08-18] **ISSUES #97 remainder: `resolve-off-b`'s fainted-cursor dismiss+freeze LANDED per `docs/turn5-resolve-ab-pools-diagnosis.md` §11.1 — 88/196→196/196 (CLOSED); `-a` 56/196→58/196; `-c` unchanged 195/196**

- **State:** one green commit (`f4b43eec` fix+Tier-1 pins) plus this docs
  commit. `npm test` **1,067 files / 10,079 passed (+4, updated 2 stale
  pins + 2 new describe blocks) / 223 skipped**; `npm run build`/
  `npm run typecheck` green.
- **Did:** read §11 fully (committed today, ab-pools diagnosis doc) and
  landed its named fix shape exactly: a new, disjoint
  `turn5FaintDismissElapsed: number | null` field on `BattleSceneState`
  (optional, not the doc's literal non-optional shape, so the many
  pre-existing raw-state-literal test fixtures kept compiling without a
  mass edit), set once in `core.ts` on the real `newKeys.has("A")` edge
  gated by the already-staged `turn5RockSlideKoDismissEligible`, threaded
  as a trailing param down `drawFightSubmenuWindow` →
  `drawTurn5EndeavorText` → `drawTurn5RockSlideWindow`. Extracted the
  freeze-clamp arithmetic into a new pure `turn5FaintDismissCursorTick`
  helper (matching this codebase's existing small-pure-helper pattern,
  e.g. `faintSinkRowsAndY2`) rather than inlining it, for direct
  testability. **MANDATORY live-pinning caught a real off-by-one:** §11.1
  flagged its own hand-derived `-2` freeze-tick offset as unverified; a
  temporary debug print confirmed `turn5FaintDismissElapsed` lands at
  exactly RAM tick 6561 as predicted, but a fresh `npm run compare --
  turn5-resolve-off-b` with `-2` showed a CONSTANT 24px mismatch across
  the entire frozen tail (6561-6613) — the doc's own derivation was one
  tick short (`cursorState(6559,...)` = offset 1, not the real frozen
  value 2; `cursorState(6560,...)` = 2). Corrected
  `TURN5_FAINT_DISMISS_FREEZE_TICK_OFFSET` to **1**, re-verified. Two
  pre-existing tests (`"rank-3 turn-5 KO dismiss mirror retirement"`)
  had pinned the OLD, since-superseded finding that a KO-dismiss A-press
  at ticks 6561/6591 was "presentation-inert" — now literally false (the
  real mechanism this fix lands DOES change state there) — updated both
  to assert the new correct behavior instead of deleting them.
  `turn5FaintedCursorYOffset` itself left defined but unreferenced, per
  §11.1's own explicit guard.
- **Result:** `turn5-resolve-off-b` 88/196 → **196/196 (CLOSED, exact,
  as §11.1 predicted)**. `turn5-resolve-off-c` unchanged **195/196**
  (only the pre-existing 6763 residual — the hard guard that sank the
  original bare Class C attempt, reverified unaffected). `turn5-resolve-
  off-a` 56/196 → **58/196** (2 of the doc's own 3 predicted direct hits
  close — 6407, 6416; the third, 6398, is the pre-existing, already-
  accepted 1-tick `GROVYLE_HEALTHBOX_VANISH_TICK` residual, ISSUES #97-C,
  unrelated to this fix — 1 short of §11.1's own ≥59 prediction,
  attributed not chased). Zero decreases across the full guard family:
  `turn5-reset-off` 256/256, `turn5-action-off` 32/32, `turn6-reopen-off`
  46/46, `turn6-menu-off.json` fixture 47/47, `turn5-confirm-off-a`
  128/132, `turn5-confirm-off-b` 131/132, `turn5-resolve-off-d` 159/196,
  `turn13-switchin` 242/242 (the load-bearing guard for the new,
  disjoint state slot claim — unaffected, confirming turn 5's dismiss
  did not leak into turn 13's owner), `turn4-doubleteam-off`/
  `turn4-rockslide-off` 256/256 each.
- **Next:** ISSUES #97-J's Class B (the `resolve-off-a` 6248-6365
  static-background residual, §11.2, side-lane territory) is the next
  named instrument — a `DISPCNT`/`BGxCNT` RAM probe to identify which
  layer actually carries the visible sky/ground art. `resolve-off-a`'s
  own 6398 residual (pre-existing, ISSUES #97-C) and `resolve-off-c`'s
  6763 residual stay small, named, unchased. `resolve-off-d`'s
  6970-6988 ring/star and 6989-7005 menu-chrome spike (sub-entry K)
  remain untouched. #71 Rung 9 unchanged.
- **Notes:** no PAPERCUT. The step brief's MANDATORY "pin the unverified
  constant with a probe or targeted pixel read FIRST, then land"
  instruction caught a real bug before commit — landing §11.1's own `-2`
  literally as hand-derived would have shipped `resolve-off-b` at a
  worse count than the pre-fix baseline in the frozen span specifically
  (constant wrong-by-one-step mismatch across all 53 post-dismiss
  frames), silently regressing the exact window the fix targeted while
  still reporting a net "improvement" over 88/196. Re-running the FULL
  guard family (not just `-a`/`-b`) after the correction, per ISSUES
  #97-J's own standing lesson, confirmed `-c` genuinely holds this time.

---

