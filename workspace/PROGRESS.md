# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1343 — [main worker, 2026-08-18 session 4] **ISSUES #97's four named single-frame residual groups (PROGRESS 1342 open item (b)) all BANKED with decisive new evidence, none fixed — one precedent-matched bounce fix tried and empirically falsified, cleanly reverted**

- **State:** zero `src/` changes landed (`git diff -- src/` clean); one
  docs+probes commit. `npm test` **1,067 files / 10,088 passed (unchanged)
  / 223 skipped**; `npm run build` green. Full guard family reran with
  **zero decreases** everywhere, matching every baseline exactly:
  `turn5-resolve-off-a` 60/196 (the out-of-scope guard bar, untouched),
  `-b` 196/196, `-c` 195/196, `-d` 194/196, `turn5-reset-off` 256/256,
  `turn5-action-off` 32/32, `turn6-reopen-off` 46/46, `turn6-menu-off.json`
  fixture 47/47, `turn5-confirm-off-a` 128/132, `-b` 131/132,
  `turn6-rockslide-a` 255/255, `-b` 105/105, `turn7-rockslide-a` 256/256,
  `turn13-switchin` 242/242, `turn4-doubleteam-off`/`turn4-rockslide-off`
  256/256 each.
- **Did:** pixel-first diagnosis of all four residual groups PROGRESS
  1342 open item (b) named, per the standing #97 method, plus RAM probes
  where pixels alone were ambiguous. New doc (owned):
  `docs/turn5-single-frame-residuals-diagnosis.md`. **(1) `resolve-off-c`
  tick 6763**: new OAM evidence (fresh RAM probe) supersedes the prior
  session's "AA-class rounding" framing — the real healthbox sprite is a
  64px-wide hardware OBJ (`shape=1,size=3`) based at real screen `x=44`,
  while our software composites a 128px single canvas anchored at
  `origin.x=12`; at the slide's onset tick the real sprite is fully
  off-screen (max `x=-3`) while our wider canvas's own far column happens
  to peek onto screen at `x=0-2` — a geometry mismatch, not a rounding
  fringe. Next probe named (find the real HP-bar sub-sprite's own base X).
  **(2) `resolve-off-d` tick 6850**: pixel-confirmed the same
  already-accepted "PNG(T) shows RAM(T-1)" dispatch-boundary class as
  tick 6184 — architecturally inherent to the hard cutover, not
  independently chased. **(3) `resolve-off-d` tick 6996**: the inherited
  "cursor-adjacent, do not touch" label was stale — current post-fix bbox
  (`127,74-229,110`) no longer overlaps the button-grid/cursor region at
  all; likely shares a root cause with `resolve-off-a`'s own **out-of-
  scope** static-background residual (same draw path), so per this step's
  own explicit stop-and-bank instruction, banked without attempting a fix
  to protect the `resolve-off-a` 60/196 guard bar. **(4) `confirm-off-a`
  ticks 5959-5961/5968**: tried the precedent-matched fix (the sibling
  idle-wait bounce branch's own oracle-RAM-proven `+109`/`t-1`
  correction, applied to the structurally-identical confirm-wait branch)
  — **regressed** `turn5-confirm-off-a` 128/132 → 125/132 (six
  previously-matching frames broke). Reverted immediately, verified clean.
  The failure itself is decisive evidence: the frozen-phase value (used
  for 5962-5967, already matching) and the live-phase value at 5959 are
  provably identical (same `sourceTick`), ruling out a bounceTick-value
  bug entirely — the residual is a compound of at least two disjoint
  screen regions (Onix-sprite x=44-99, a separate unexplained x=127-229
  region) plus a likely-separate boundary artifact at 5968. **(5)
  `confirm-off-b` tick 6184**: independently reconfirmed as the same
  already-accepted boundary class via fresh pixel sampling, not
  re-chased. Two new committed probes:
  `tools/probe/analyze-residual-family-sample.ts` (generic reusable bbox
  pixel-diff dumper) and `tools/probe/dump-turn5-confirma-bounce-driver.py`
  (bounce driver RAM fields, windowed to confirm-off-a's own 5955-5970).
- **Next:** four concrete next probes, one per residual, named in
  `docs/turn5-single-frame-residuals-diagnosis.md` §1.3/§2.2/§3.3/§5.5.
  `resolve-off-a`'s own 6262-6376 band (side-lane territory this round)
  and #71/#73/#55 unchanged.
- **Notes:** no PAPERCUT. ISSUES #97 given a short dated status line
  recording this round (entry not restructured).

---

## 1342 — [supervisor wind-down, 2026-08-18 session 2] **#97 near-CLOSED in one instrument→fix assembly line (10 fix + 8 instrument worker rounds): `resolve-off-b` 196/196 + both turn6 windows CLOSED, every trace verified after every round, zero guard decreases all session; one supervisor overturn (ON/OFF oracle-profile proof) unlocked turn6**

- **Final gates (run TWICE — at `758107d9` after the last pre-wind-down
  engine fold, and RERUN at the final tree `cc51b13e` after the bonus
  round's engine fix below):** full npm test **1,067 files / 10,088
  passed / 223 skipped** (final rerun; 10,086 at the first pass, +2 =
  the bonus round's pin); `npm run build` green both times; soak
  vanilla 0:20 **20/20 OK** both times; soak full 0:60 **60/60 OK**
  both times. animation-main and rust-main EMPTY at orient AND
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

