# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 869 — [supervisor session, 2026-08-02 evening] animation-main folded (fast-forward); slice-9 + #66 two-lane round dispatched

- **State:** master `e3d7a0bc` = fast-forward fold of `animation-main`
  (animation supervisor live in its worktree; fold SHA pinned at orient).
  Union verified by supervisor: full `npm test` **626 files / 6,348
  passed / 1 skipped**, `npm run build` green. Oracle freshness PASS (both
  services current). DEFERRED.md remains clear.
- **Fold contents:** 7 accepted front-animation families since the last fold
  (glow black, rising wobble, orange glow, fast-short concave, rotate-up
  slam-down, deep V squish bounce, rotate-to-sides twice) — all inside
  `src/animation/` + `tests/animation/` + fixtures; no main-lane files.
  `ANIMATION_PROGRESS.md` top entry carried no "For the main program:" line.
- **Did:** (dispatch record; outcomes land in the next entry)
  1. MAIN lane: slice-9 fold completion from `a6d88eaa` per
     `docs/turn4-fold-pp-freshness-design.md` — implement-only brief with
     the §5 14-window acceptance table and §6 risk probes verbatim.
  2. SIDE lane: ISSUES #66(a) capped-stat banner fix (mirror `c7461398`)
     + (b) discriminating oracle probe (fix only on confirmation) —
     file-disjoint from the slice-9 touch list (verified: #65's fix touched
     only `battleResolutionPresentation.ts`).
- **Next:** verify both lanes; then slice 10 (final 13-param/type cut);
  then species-dossier slices per
  `docs/species-render-entry-point-retirement-design.md`.

---
## 868 — [interactive user session, 2026-08-02 evening] D1 adopted → DEFERRED clear; papercut fixes landed; play-preview retired

- **State:** master = this entry's commit on top of `f6452d7a`; no engine or
  test code touched (tooling/docs only), `npm run test:smoke` green (7
  files / 339 passed, ~23 s). **DEFERRED.md has NO open entries — the next
  `run-supervisor.sh` session is unblocked.**
- **Did (all user-directed):**
  1. **D1 RESOLVED:** communication contract moved into `SUPERVISOR.md`
     § "Communicating with the user", D1 entry deleted. Amended same
     evening at user request: cut to a short plain-English rule (no
     mandated status format, no per-item numeric requirement).
  2. **Worker self-abort papercut:** EXECUTION DISCIPLINE clause folded into
     `tools/run-subagent.sh`'s standing preamble (both prompt branches, all
     providers) — briefs no longer restate it. PAPERCUTS entry updated;
     delete it after a few clean worker rounds.
  3. **New `npm run test:smoke`** (~25 s: frontier ratchet, ability/item
     census, decision boundary, kernel full-turn, roundController,
     roundScenarioMatrix, battleScene) for mid-step sanity checks;
     documented in AGENTS.md Tests. Never substitutes for the full suite at
     a finish requirement.
  4. **Scene-ON battle-lab papercut entry DELETED** — verified fixed live:
     POST `/v1/battle-lab/run` on :8012 answers 400 mode-validation,
     identical to :8014 (the running service now carries the route).
  5. **Play-preview retired:** nothing was listening on :5199 (server
     already down); `.worktrees/play-preview` removed (detached at
     `105c72d5`, an ancestor of master; only untracked node_modules).
     Rebuild a fresh preview after the next user-visible fix lands.
- **Next (unchanged from 867):** (1) slice-9 fold completion from `a6d88eaa`
  per the banked design `docs/turn4-fold-pp-freshness-design.md`; (2) slice
  10; (3) #66(a) capped-stat banner fix (+(b) after an oracle probe); (4)
  species-dossier slices.
- **Notes:** `animation-main` still ~8 commits ahead with its own ledger —
  fold at next orient (unchanged from 867's note).

---
## 867 — [supervisor wind-down, 2026-08-02 14:30] slice 8 + #65 landed; slice-9 fold honestly open with both root causes banked; D1 comms contract awaits user

- **State:** master `4807676f` = green slice-9 BRIDGE + all docs; full
  `npm test` + `npm run build` supervisor-verified green at wind-down
  (613 files / 6,277 passed / 1 skipped). Census: state fields 1 (turn4);
  declarations/FIGHT/PP params 13. **DEFERRED.md has ONE OPEN entry (D1,
  user-communication contract) — user must edit/delete it to unblock the
  next supervised session (their explicit request).**
- **Session outcomes:** slice 8 turn-3 fold LANDED (`fed91e87`,
  salvage→retry; oracle-over-differential acceptance: its 37-frame
  turn4-doubleteam deviation FIXES a PP bug leaked by slice-6
  `cbb41421`, bisect-proven). #65 SILVER WIND crash: user-reported,
  scouted, FIXED (`c7461398`), verified, entry removed — same day.
  Turn-5 reader bank merged (9 traces, 1,382 captures). Species dossier
  banked (census 4→45, 7 slices) + erratum. Day-audit: 2 real findings
  → **#66** (capped-stat banner crash (a) reachable, magnitude edge (b)
  unconfirmed); finding 3 = turn4CommandHandoff's 4 unguarded call sites
  (battleScene.ts:7859/7887/7952/7997 pre-fold numbering) — the slice-9
  fold MUST guard these. Two claude-worker self-aborts salvaged →
  PAPERCUTS entry + foreground clause in briefs.
- **Slice-9 fold state (NOT landed, fully mapped):** bridge `1c61cfac` on
  master is green/differential-clean. Branch
  `salvage/slice9-fold-20260802` (`a6d88eaa`, suite-green) carries the
  fold + fix #1 (eviction-class HP fallback — drawActionMenuIdleContent +
  two drawFightSubmenuWindow chains checked only turn3/turn2 shapes →
  full-HP 117 default; fixed all four sites). OPEN root cause #2: FIGHT
  submenu PP/chrome shows turn-4's fresh PP one turn early vs parent
  legacy timing (windows: turn5-action-off 6/32, turn5-confirm-off-a
  121/132 vs base `105c72d5`) — two freshness requirements multiplexed on
  the shared latest slot; needs a small design, not a patch. Resume
  recipe in entry 866 + the salvage commit message.
- **Next session (ordered):** (1) slice-9 fold completion from
  `a6d88eaa` per the BANKED design `docs/turn4-fold-pp-freshness-design.md`
  (`238280bf`, supervisor-verified: pin playerPp/persistedMoveSlot at the
  turn-4 install to prior-handoff values — one param + one core.ts call
  site; all four audited call sites resolved with evidence); full
  14-window differential vs `105c72d5`; (2) slice 10 (final
  13-param/type cut); (3) #66(a) capped-stat banner fix (+(b) after an
  oracle probe); (4) species-dossier slices. Turns 5-8 OFF re-timing
  policy remains un-adopted (unchanged).
- **Unfolded:** `animation-main` ~8 commits ahead with a LIVE animation
  supervisor + worker at wind-down — deliberately NOT folded (moving
  branch); fold at next orient. `.worktrees/play-preview` (serving the
  user's frozen build at :5199, currently `105c72d5`) is INTENTIONAL —
  do not sweep while in use; rebuild after user-visible fixes land.

