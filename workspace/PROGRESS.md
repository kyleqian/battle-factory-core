# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1330 — [main worker, 2026-08-18] **ISSUES #71 §1e retirement Rungs 5-6 landed (30 more sites, 94/119 in-scope), corrects prior ledger's site-count arithmetic: HARDEN's zero-coverage gap pinned first, zero FINDINGs, zero regressions**

- **State:** three green commits (`606ca03d` HARDEN pin test, `efa62046`
  Rung 5, `e7f31260` Rung 6). `src/engine/battleScene.ts` only edited in
  the two rung commits; `tests/animation/harden.test.ts` new. `npm test`
  **1,067 files / 10,043 passed (+1 file/+3 tests, exactly the HARDEN
  pin) / 223 skipped** after every commit; `npm run build`/
  `npm run typecheck` green throughout.
- **Did:** followed `docs/sendout-1e-retirement-design.md` §5 Rungs 5-6
  exactly, re-grepping every move's current line number first (doc's own
  drift warning — lines had shifted from the doc's `8863ecbc` cites) and
  confirming every per-move Tier-1 test filename with `find` before
  scoping. **Rung 5 caveat honored**: HARDEN (`renderSceneOnMovePresentation`
  `:34080-34185`) had zero Tier-1 coverage — no `harden*.test.ts`, no test
  referencing `"HARDEN"`/`sceneOnHardenView`/`SceneOnHardenConfig`. Landed
  a minimal pin FIRST, in its own preceding commit, mirroring
  `ironDefense.test.ts`'s "crosses the typed seam" shape (HARDEN has no
  dedicated `<move>AtAge` file of its own — `sceneOnHardenView` wires
  `metallicShineAtAge` directly): attacker/target identity, metallic-state
  values cross-checked against the already-pinned `metallicShineAtAge` at
  4 ages, and the move-mismatch throw guard — confirmed green
  independently before touching HARDEN's own call site. **Rung 5** (16
  sites, TORMENT…MINIMIZE): 13 ONIX/YANMA-literal sites converted to
  `view.target.species`/`view.attacker.species`; 6 sites (HARDEN,
  IRON_DEFENSE, FLASH, FACADE, ACID_ARMOR, MINIMIZE — already the
  "dynamic in syntax" §1.3 category) needed only the fallback-idiom swap.
  **Rung 6** (14 sites, CALM_MIND…ANCIENT_POWER, `calmMind.test.ts`
  reconfirmed to exist per the brief): 8 ONIX-literal sites converted; 6
  sites (CALM_MIND, SHADOW_BALL, SYNTHESIS, MOONLIGHT, COSMIC_POWER,
  ANCIENT_POWER's own `opponentBattler.species`) already dynamic, fallback
  swap only. Every literal→dynamic substitution used the exact expression
  each site's enclosing throw-guard already proved equal to the literal;
  throw-guard/pair-lock blocks themselves untouched everywhere. No
  FINDINGs — no substituted expression ever disagreed with what the guard
  proved.
- **Result — corrects a site-count error in entries 1326/1329:** those
  entries logged rungs 0-4 as landing "94/121" sites; this session's
  fresh `grep -c` at the pre-session sha (`77ce70ea`) shows that was
  wrong. Ground truth (self-consistent at every commit, verified against
  the actual file, not against any prior doc/ledger claim):
  `speciesFrontIdleRestOffset(` raw-count + `speciesFrontIdleRestOffsetOrZero(`
  OrZero-count sum to a constant **123** throughout (119 in-scope + 4
  permanently-out-of-scope settle-hook literals, per the design doc's own
  §1.2 split). Pre-session: **59 raw / 64 OrZero** — i.e. rungs 0-4 had
  actually converted **64**, exactly matching the doc's own §5 table sum
  (14+14+16+20=64), not 94. After Rung 5 (+16): 43/80. After Rung 6
  (+14): 29/94. So this session converted 30 sites, bringing the running
  total to **94 of 119 in-scope sites** (matching the table sum through
  Rung 6: 64+16+14=94) — coincidentally the same number "94" the prior
  ledger misattributed to rungs 0-4 alone; the two are not the same claim
  and shouldn't be conflated. 25 in-scope sites remain (15+10 per the
  table's Rung 7/8 rows), plus the 4 permanently-out-of-scope literals.
  Every named per-move Tier-1 test file green each rung (24 files/102
  tests Rung 5 incl. the new HARDEN pin, 25 files/106 tests Rung 6);
  `npm run compare:differential -- battle-command-generated-off.json
  --base <parent> --summary` 128/128 byte-identical both rungs (insurance
  smoke check — none of these windows are reachable from that trace).
- **Next:** Rung 7 (WISH…TAKE_DOWN, 15 sites, doc-cited `~37643` onward —
  re-grep line numbers first, they will have shifted) and Rung 8 (CRUNCH…
  DOUBLE_EDGE, 10 sites) remain — 25 sites, matching the corrected count
  above. Rung 7's own doc caveat: METEOR_MASH is covered by 3
  differently-named files (`meteorMashEvidence/Reducer/Source.test.ts`),
  not `meteorMash.test.ts` — confirm with find/grep, don't assume. After
  Rung 8 lands: raw count should read **4** (only the permanently-out-of-
  scope settle-hook literals) and OrZero should read **119**; run the
  doc's own final census grep and record that exact pair here, not a
  restated "121". Rung 9 (hand-fit swap-over) stays blocked on the
  animation lane's rung-4 back dispatcher, per ISSUES #71 — not started,
  not this lane's to start.
- **Notes:** no PAPERCUT. Time-boxed to a 50-min worker cap; stopped
  after two clean rungs rather than rushing Rung 7's extra-confirmation
  requirement (3-file METEOR_MASH mapping) into a shorter remaining
  window.

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

