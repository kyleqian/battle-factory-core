# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1344 — [main worker, 2026-08-18 session 5] **ISSUES #97: `drawTurn5RockSlideAttack`'s three §17/§5-named mechanisms LANDED — `resolve-off-a` 60/196 -> 175/196 (three commits, all green)**

- **State:** three green commits (`9ec92966` phantom rock-prop drop,
  `1e8096fc` sink+healthbox-vanish 2-tick fix, plus this docs commit).
  `npm test` **1,067 files / 10,093 passed (+5 new pin blocks) / 223
  skipped**; `npm run build`/`npm run typecheck` green.
- **Did (step 1, §17.4):** dropped `drawTurn5RockSlideAttack`'s
  falling-rock draw loop entirely (unconditional, no scene-ON call site
  to preserve) — real hardware's OAM has zero rock-shaped (32x32)
  entries anywhere across turn 5's 6258-6354 window (§17.1's full
  census); matches `drawTurn9RockSlideAttack`'s own already-landed
  precedent exactly. `resolve-off-a` 60/196 -> 158/196 (98 frames, zero
  regressions).
  **Did (step 2, §19):** a dense oracle pixel sweep (GROVYLE's own
  column x=165) found the sink formula (`faintSinkRowsAndY2`, called
  unshifted from this function) runs a uniform 2 render ticks BEHIND
  real hardware — scoped `+2` shift at the call site only (shared
  function/its Tier-1 pins/turn 13's own separate call site untouched).
  Closing the sink exposed a sibling 2-tick lag in the adjacent
  healthbox-vanish gate (`GROVYLE_HEALTHBOX_VANISH_TICK`, its own single
  reader) — fixed the same way, scoped `-2`. `resolve-off-a` 158/196 ->
  175/196 (17 frames, zero regressions).
- **Result:** `turn5-resolve-off-a` **60/196 -> 175/196** (below the
  brief's own directional 170-180 estimate at the low end but landed in
  range). Full guard family reran after EACH step with **zero
  decreases**: `-b` 196/196, `-c` 195/196 (6763 unchanged, other lane's
  track), `-d` 194/196 (**6850 and 6996 both unchanged** — neither
  banked hypothesis panned out, this fix's mechanism isn't shared),
  `turn5-reset-off` 256/256, `turn5-action-off` 32/32, `turn6-reopen-off`
  46/46, `turn6-menu-off.json` 47/47, `turn5-confirm-off-a` 128/132
  (5959-5961/5968 unchanged), `-b` 131/132 (6184 unchanged),
  `turn6-rockslide-a`/`-b` 255/255, 105/105, `turn7-rockslide-a`
  256/256, `turn13-switchin` 242/242 (confirms neither scoped shift
  leaks into turn 13's own reuse), `turn4-doubleteam-off`/
  `turn4-rockslide-off` 256/256 each.
- **Next:** `resolve-off-a`'s remaining 21/196 (6283/6284 + 6379-6398) is
  a **different function's** own "Foe GROVYLE fainted!" text-reveal
  timing (`drawTurn5RockSlideWindow`, not `drawTurn5RockSlideAttack`) —
  banked as `docs/turn5-resolve-ab-pools-diagnosis.md` §19.1 with a named
  next probe (dense visible-char-count sweep, §4a's own solve method),
  not chased this session per the step brief's time-boxing. `-c` 6763
  and `-d` 6850/6996 remain other lanes' own tracked residuals.
- **Notes:** no PAPERCUT. Both fixes red-verified against pre-fix code
  via `git stash` before finalizing, per the family's own convention.

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

