# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 768 — [SUPERVISOR 2026-07-31 ~03:15] Round-8 regression QUARANTINED (715/715 restored); rank-2 groundwork merged; round 9: faint-half flip + discriminating probes

- **State:** union gate green **558 files / 5677 tests + 1 deliberate
  animation-lane skip**, build clean. M8's species ready-lag formula had
  regressed the ROADMAP-cited `interactive-generated-intro-off` pin
  **715/715 → 699/715** and was committed anyway — supervisor
  **quarantined** it (flat ONIX-calibrated lag restored; formula retained
  as an exported uncalled function for the #56 investigation). Cost of
  quarantine on the open evidence traces: exactly **1 frame** (YOSHI
  698/751 vs 699; MAGNETON 424/751 unchanged — its divergence is a
  newly-found species-dependent affine-emerge tint, pre-shadow). Kept
  from M8: the mechanism-derived cry-duration ceiling fix (extractor
  round→ceil, 376 species regenerated) and the real-personality staging
  that closed the gender-icon residual. #56 item 1 rewritten to the
  quarantine state; M8's out-of-brief direct ISSUES edit noted — content
  was accurate, process wasn't.
- **S8 merged:** turn-13 DRAGON_BREATH/faint-half adapter + equivalence
  (6 tests) with two brief corrections (fainting mon is PIDGEOTTO, no
  party-select UI — AI auto-replacement) and a proof the faint-sink
  geometry is the generic opponent-faint formula at Pidgeotto's
  `mon-pic-coords` yOffset, not a hand constant. Switch-in half blocked
  on `stagePlayerHitChain` terminal-state exposure + DESTIN's unprobed
  bench.
- **Round 9 dispatched:** main M9 — rank-2 faint-half flip per the
  banked checklist (turn13 pins 141/141 + 242/242 + dense-a/b, insurance
  190/190 + 715/715, honest-stop hard rule). Side S9 — two probes: lab
  ONIX-lead ready-lag (discriminates route-vs-species for the 6-tick
  anomaly) and DESTIN full-bench RAM (switch-in unblock).
- **Notes:** the quarantine decision priority: committed acceptance pins
  outrank open evidence traces; no formula ships while its 4th data
  point contradicts it without a mechanism.

---
## 767 — [BOUNDED MAIN WORKER 2026-07-31 ~03:15] #56: species-keyed ready lag applied, MAGNETON app-side proof built, ONIX regression found

- **State:** YOSHI **699/751** (up from 650/751 — real personalities +
  species-keyed ready lag both landed). MAGNETON app-side proof built:
  **424/751** (new; exact 0..423, diverges 424..750 with no recovery —
  masks a clean shadow-branch check, see below). GROVYLE
  `battle-command-generated-off` **128/128** unchanged. GROVYLE
  `interactive-generated-intro-off` **699/715, regressed from 715/715**
  (honest, characterized — not silently fixed, see Did). Battle-2 insurance
  pins unaffected: `battle2-turn1-rockslide` **191/191**,
  `battle2-action-menu-dense` **209/209**. `npx tsc --noEmit` clean; focused
  suite (`cryDurationsExtraction`, `factoryBattleStartIntro`,
  `executableFrontierRatchet`, `factoryRoundBattleOrchestrator`) **44/44**
  green. Full `npm test`/`npm run build` **not run this step** per the brief
  (side worker live concurrently).
- **Did:** (1) `GENERATED_PLAYER_READY_LAG` (flat 185) replaced with
  `generatedPlayerReadyLag(state)` keyed off the player's own active species
  (`98 + cryDurationTicks(playerLeadSpecies) + generatedPlayerVisualLag`),
  per docs/intro-cry-shadow-evidence.md Part 1. Settled the "98 vs 99"
  residual by fixing `cry-durations.json`'s extractor
  (`Math.round`→`Math.ceil`, matching the real per-VBlank "still playing"
  poll) and regenerating the 376-species file — invariant for the already-
  validated opponent dispatch-delay species, resolves DELCATTY's own +1.
  (2) Built the MAGNETON `AppStage` (`generatedBattleStartIntroMagnetonStage`,
  `tools/compare/appTrace.ts`) + compare trace
  (`factory-arbitrary-intro-magneton-off.json`), reproducing trainerId 109/
  RICARDO exactly. (3) Staged real ROM personalities (from
  `bin/oracle lab`'s own dense `state.parties`) in both the YOSHI and
  MAGNETON stages, closing the round-6 gender-icon residual. (4) Found (not
  fixed) a **new regression**: `interactive-generated-intro-off`'s real
  canonical Battle-1 lead (ONIX) needs ready-lag 185, but the 3-species
  formula predicts 179 — a clean 6-tick miss that survived several
  hypotheses (extraction bug, line-length, floor/max term). Left
  precisely characterized rather than force-fit. Full write-up:
  `docs/trainer-pic-off-window-scout.md` §D "Round 7 resolution".
- **Next:** ISSUES #56 — item 1 has a real regression (ONIX/canonical-
  route ready-lag) needing a 5th data point or a source read of
  `battlerAnimsDone`; item 3's MAGNETON shadow-branch check is blocked by
  an earlier, unrelated affine-emerge/tint divergence in
  `drawGeneratedOpponentRelease` (first at handoff+19, well before the
  shadow's own handoff+104 onset) that needs isolating against a second
  species; item 2 (frames 444/536) untouched this round — no budget left
  after the above.
- **Notes:** `tools/extract/extract-cry-durations.ts` and
  `src/data/gen/cry-durations.json` are normally side-lane files; touched
  here because task 1 required the ceil fix to reconcile the three
  triangulated species — flagged for the supervisor's awareness of the
  lane boundary, not hidden.

---
## 766 — [SUPERVISOR 2026-07-31 ~02:25] #39 rank-1 RETIRED (flip verified); player-cry mechanism confirmed on 3 species; round 8 dispatched

- **State:** union gate green **557 files / 5671 tests + 1 deliberate
  animation-lane skip** (net delta = deleted legacy fixture tests), build
  clean. M7's flip verified: legacy files gone, supervisor personally
  re-ran `battle2-turn1-rockslide` **191/191** and
  `battle2-action-menu-dense` **209/209** (worker verified 16/16, 128/128,
  715/715, ground-truth 38/179 unchanged). S7 merged: player-cry
  triangulation (GRIMER/KADABRA/DELCATTY → `readyLag = 98 + cryDuration`
  within 1 tick — round-6's 8-tick miss was a wrong anchor) + committed
  MAGNETON/RICARDO fixture with landmark map incl. pixel-confirmed
  shadow-elevation frame 1687.
- **Supervisor actions:** #39 issue text + inventory rank-1 row marked
  retired; `battle2-turn1-rockslide.json` given explicit
  `appRoute: canonical-recorded` (fixes the wrong-route crash from the
  M7 papercut); PAPERCUTS bumped (pixel-inspection helper).
- **Round 8 dispatched:** main M8 — implement species-keyed player ready
  lag (canonical route untouched; GRANBULL flat-286 flagged as a separate
  path), build the MAGNETON app-side comparison (second arbitrary-species
  proof; first shadow-path exercise), stage real personalities in the
  staged stages (gender-icon residual), then frames 444/536. Side S8 —
  #39 rank-2 (turn-13 DRAGON_BREATH→faint→switch-in) equivalence
  groundwork, new-files-only, tsc mandatory.
- **Notes:** GRANBULL flat-286 non-reconciliation is recorded in
  `docs/intro-cry-shadow-evidence.md` — treat as a flag on the canonical
  path, not a defect claim.
