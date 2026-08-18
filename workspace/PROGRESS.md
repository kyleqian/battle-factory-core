# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1329 — [supervisor wind-down, 2026-08-18] **16 worker steps, two lanes: #96 CLOSED (swap family 19/19 exact), #97 mechanism RESOLVED via an 8-probe instrument chain (turn5-action-off CLOSED 32/32; five root causes landed), #71 §1e rungs 0-4 (94/121 sites) — all final gates green**

- **Final gates (tree `37b2818d`, run independently AFTER the last merge):**
  full npm **1,066 files / 10,040 passed / 223 skipped**; `npm run build`
  green; soak vanilla 0:20 **20/20 OK**; soak full 0:60 **60/60 OK**.
  Fold status: animation-main and rust-main both EMPTY at orient AND at
  wind-down. DEFERRED.md EMPTY. Only permanent worktrees remain; no
  unmerged branches; no stray probe processes.
- **#96 CLOSED and deleted:** (a) quit-pair 61/67→67/67 ×2 — the banked
  fix shape was wrong in detail; the real trigger was ball slot 0's
  `hasRested` latch during quitReturn (narrow predicate + Tier-1 pin).
  (b) enemy-picker 129/130→130/130 — OAM probe DISPROVED the banked
  "header box" reading; it was the suppressed `Random()%5` ball-roll
  frame; per-ball `cycledToEnemy` eligibility landed. Family 19/19 exact.
- **#97 (turn5/6 bounce family) — mechanism RESOLVED, windows landed:**
  `turn5-action-off` 1/32 → **32/32 CLOSED**; `turn6-reopen-off` 11/46 →
  **22/46** (remainder attributed: kickoff phase-context + class-(iii));
  `turn5-resolve-off-a` 7→25/196, `-b` 71→88/196, `confirm-off-a`
  8→15/132; control 256/256 held throughout; zero decreases all session.
  Root causes, each RAM/source-proven then landed at EXACT predicted
  counts: 3-tick reopen-press sinIndex hold; per-call-site raw
  sine-index offsets (+60/+109 — the first fit (+67/+116) inherited a +7
  probe-basis excess: the RAM probe reads sSinIndex post-increment;
  "table-peak rounding quirk" dissolved, hardware math is bit-identical);
  displayed(T)=RAM(T-1) basis DIRECTLY confirmed; turn-4 handoff pinned
  turn-3's stale PP (fixed; the 2026-08-02 doc's own risk flag);
  three independent anchor clusters (-38/-145/-228) re-derived from
  fresh RAM sweeps. Evidence docs: `turn5-bounce-recalibration-probe.md`
  (§1-§9), `turn5-family-class3-diagnosis.md` (§1-§17),
  `turn6-reopen-endstate-spec.md` (naive 7318+ extension REJECTED by a
  sibling-trace guard: fitted offsets are context-bound),
  `bounce-peak-rounding-fix-spec.md`.
- **#71 §1e ladder:** design scout re-derived the census (58→121 sites,
  `docs/sendout-1e-retirement-design.md`, 9-rung plan, ZERO
  boundary-ratchet widening); rungs 0-4 landed (94/121 sites retired,
  zero FINDINGs, differential 128/128 per rung, suite +7 tests).
- **Ops notes:** freshness-check false positive #5 at orient (kept
  services; `3e29880b` proves schema currency) — PAPERCUTS bumped. NEW
  papercut: side-worktree ROOT has no package.json, `npm run` silently
  escapes to the main checkout (~15 min lost once). Six-deep stacked
  side-worktree instrument chain worked cleanly; merged as two chain
  folds; all cleaned innermost-first.
- **Open (ordered for next session):** (a) #97 remainders, all
  diagnosed+banked: §17 item 5 HP-overlay gate (12-caller-shared,
  deliberately not rushed; fixes confirm-off-a/b frozen HP),
  resolve-off-c trailing 47 frames (status-box+dither instrument named),
  resolve-off-d residual, turn6 7318+ kickoff phase-context (needs a
  phase-history model — do NOT re-extend fitted constants).
  (b) #71 rungs 5-8 (~50 sites; HARDEN needs a pin first per the doc),
  rung 9 blocked on the animation lane's rung-4 dispatcher.
  (c) #73/#55-adjacent items unchanged. No deferred questions; no
  blockers.

## 1328 — [main worker, 2026-08-18] **ISSUES #97-B §8d/§9e sine-index offset fix landed: turn5-action-off CLOSED 32/32, turn6-reopen-off 20→22/46, zero decreases**

- **State:** one green commit (src + 2 test files) plus this docs commit.
  `npm test` **1,066 files / 10,040 passed / 223 skipped**, `npm run build`
  green.
- **Did:** followed `docs/bounce-peak-rounding-fix-spec.md` §7 exactly — a
  SIDE-worker analysis that read `trig.c`'s real `Sin()`/`DoBounceEffect`
  and found the landed `+67`/`+116` raw-sine-index offsets each carried a
  +7 excess inherited from fitting against the receipt's own
  post-increment `sSinIndex` RAM column (real hardware has no special
  peak-rounding rule; the app's per-index `bounceSin` math was already
  exactly correct). Ran the spec's receipt cross-check first (176 ok / 0
  bad, PASS), recorded the full 11-trace baseline, then applied the
  4-literal edit at the exact spec-cited lines (all 4 unchanged since the
  spec was written): `battleScene.ts` `bounceIndexOffset`/
  `idleWaitBounceIndexOffset` 116→109 (:8320/:8689), the two window-B `67`
  literals →60 (`drawTurn6ActionMenuIdleWindow`'s DMA-wait-branch call
  :11887, `drawTurn6FieldBase`'s window-B call :14869). No change to
  `bounceSin`/`menuIdleBounce` internals — confirmed live per the spec's
  own warning: a global `-7` shift inside the shared lookup breaks 25
  tests across 5 files (not attempted here, spec-rejected).
- **Result (exact predicted numbers, zero decreases across the 11-trace
  family):** `turn5-action-off` 26/32→**32/32** (window fully CLOSED — the
  former residual `{5928,5929,5930,5931,5940,5949}` was the same offset
  excess, not the periodic §8d/§9e "rounding artifact" it was previously
  attributed to), `turn6-reopen-off` 20/46→**22/46** (`{7306,7317}` now
  match; remainder is entirely `[7318,7347]`, the still-open
  `turn6KickoffBounceTick` dispatch, untouched by construction),
  `turn5-confirm-off-a` 14/132→**15/132** (bonus — `idleWaitBounceIndexOffset`
  is gated on plain `turn5Active`, reaches this trace's span too);
  `turn5-reset-off` 256/256 and the rest of the family (`confirm-off-b`,
  `resolve-off-{a,b,c,d}`, `turn4-doubleteam-off`, `turn4-rockslide-off`)
  byte-identical, zero decreases. Re-pinned one Tier-1 pixel test
  (`battleScene.test.ts`, tick 5931 at (58,49): `[189,181,181]` →
  `[247,247,255]`, oracle-verified) plus the two rung-2/3 composed-model
  tests in `fightSubmenu.test.ts` that hardcoded the old `67`/`116`
  literals and asserted a named residual set — both now assert zero
  exceptions (verified computationally against the real formula before
  editing: with the corrected offset, all displayed ticks in both
  windows' own probed spans match with no exceptions).
- **Next:** `ISSUES.md` #97 §D lists what's still open — (i)
  `turn6KickoffBounceTick`/the 7318+ dispatch (SIDE-worker continuation,
  check its current state first), (ii) the class-(iii) text/banner
  mechanism dominating `confirm-off-*`/`resolve-off-*`'s remaining
  mismatches, (iii) §17 item 5 (the 12-caller HP-overlay gate) from entry
  1327, (iv) `resolve-off-d`'s own small residual (now ruled out as
  §8d/§9e-caused).
- **Notes:** no PAPERCUT. The spec's cited line numbers (8320/8689/
  11887/14869) turned out unchanged despite the brief's drift warning —
  worth noting the brief over-hedged, not a problem.

---
## 1327 — [main worker, 2026-08-18] **ISSUES #97-B turn5-resolve anchor cluster: §17 items 1-3 landed (2 RAM sweeps + 3 scoped anchor fixes) — resolve-off-a 7→25/196, resolve-off-b 71→88/196, zero decreases**

- **State:** one green commit (`4c49776d`, src+test+probe-script fix) plus
  this docs commit. `npm test` **1,066 files / 10,040 passed (+2, two
  re-pinned tests) / 223 skipped**, `npm run build` green.
- **Did:** followed `docs/turn5-family-class3-diagnosis.md` §17's ordered
  edit list exactly. Ran the two prerequisite RAM sweeps first (extended
  `dump-turn5-resolve-grovyle-side-driver.py`): GROVYLE's own hp is a
  single-tick STEP (1 flat 6184-6284, 0 exactly at 6285 — not a live
  drain curve, resolving §17 item 2's own open question); the real
  Sitrus-heal message starts at tick 6850 and hard-cuts directly to
  `"What will ONIX do?"` at 6991, no intermediate blank state. Landed
  items 1-3 as SCOPED overrides (grepped every shared helper's other
  consumers first, per the brief): `TURN5_OFF_ROCKSLIDE_TEXT_DELAY=355`
  (rockSlideTextStartTick -> 6184, was 6222); `TURN5_OFF_ROCKSLIDE_HP_
  DRAIN_START_DELAY=455` (opponentHp steps to 0 at RAM-exact 6285, was
  6427) + `GROVYLE_FAINT_SINK_START_TICK` 6502->6360 (turn-5-exclusive,
  edited directly; `GROVYLE_HEALTHBOX_VANISH_TICK` auto-follows to 6379,
  within 1 tick of RAM-exact 6378) + `TURN5_FAINTED_TEXT_DELAY` 694->549
  (-> 6378, RAM-exact); new `TURN5_OFF_SITRUS_{HEAL_TEXT_START,TEXT_CLEAR,
  MENU_REDRAW}_TICK`=6850/6991/6991, dispatch-gate-only constants (the
  exported `TURN5_SITRUS_*` triple stays 7078/7216/7222 untouched — it's a
  load-bearing anchor for turns 9-14's own REGIME_SHIFT math, confirmed by
  grep before deciding not to touch it). Item 4
  (`SWITCHIN_SENTOUT_TEXT_START_TICK`) confirmed accurate, left alone.
  Item 5 (§10a's HP-overlay gate, 12 shared call sites) **not attempted**
  this session — time/risk, banked as the clear next step.
- **Result (zero decreases anywhere in the 9-trace family):**
  `resolve-off-a` 7/196→**25/196**, `resolve-off-b` 71/196→**88/196**
  (both genuine full-frame improvements); `resolve-off-c` 149/196
  unchanged (allowed — its own trailing 47-frame mechanism out of scope);
  `confirm-off-a` 14/132 and `confirm-off-b` 0/132 unchanged in count
  (both need item 5) but `resolve-off-d`'s own mismatch magnitude
  collapsed 18.08%→0.67% and `confirm-off-b`'s 2.57%→1.79% without yet
  crossing an exact-match frame. The three already-landed windows are
  provably unmoved: `turn5-action-off` 26/32, `turn6-reopen-off` 20/46,
  `turn5-reset-off` 256/256. Re-pinned two Tier-1 tests in
  `battleScene.test.ts` that encoded the superseded literals
  (`faintSinkRowsAndY2`'s 8-step closed-form receipt,
  `turn5RockSlideKoDismissEligible`'s cursor boundary), citing this
  session's receipt in each.
- **Next:** item 5 (the HP-overlay gate) is the named blocker for
  `confirm-off-a`/`-b` and possibly `resolve-off-d`'s small residual —
  needs a full per-caller audit of `drawActionMenuIdleContentFromLatest`'s
  12 call sites before widening the gate safely. `resolve-off-d`'s own new
  0.67% residual (bbox 44,71-195,104) is untraced — possibly the settled-
  Sitrus-phase ONIX sprite/HP-overlay (`turn5SitrusOnixHp`, a separate
  anchor this session didn't touch) or the known §8d rounding artifact.
  Full per-trace before/after table and remainders in `ISSUES.md` #97 §C.
- **Notes:** no PAPERCUT.

---
