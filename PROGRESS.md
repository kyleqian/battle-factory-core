# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 868 — [interactive user session, 2026-08-02 evening] D1 adopted → DEFERRED clear; papercut fixes landed; play-preview retired

- **State:** master = this entry's commit on top of `f6452d7a`; no engine or
  test code touched (tooling/docs only), `npm run test:smoke` green (7
  files / 339 passed, ~23 s). **DEFERRED.md has NO open entries — the next
  `run-supervisor.sh` session is unblocked.**
- **Did (all user-directed):**
  1. **D1 RESOLVED:** user adopted the communication contract verbatim; text
     moved into `SUPERVISOR.md` § "Communicating with the user", D1 entry
     deleted.
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

---
## 866 — [bounded MAIN worker, 2026-08-02] slice-9 fold retry: one root cause fixed, one found+scoped, NOT landed

- **State:** master unchanged at `1c61cfac` (the bridge, still green). The
  retry's fix lives on `salvage/slice9-fold-20260802` at `a6d88eaa`
  (NOT merged — differential still red on 2 of 14 windows). Full `npm
  test` on that branch: **613 files / 6,277 passed / 1 skipped**, tsc
  clean.
- **Did:** diagnosed the brief's reported regression with `inspect-frame`
  (parent vs fold PNG diff at frame 5927) instead of guessing: found
  `drawActionMenuIdleContent`'s player-HP fallback (and two matching
  if/else-if overlay chains in `drawFightSubmenuWindow`) only ever
  consulted turn3/turn2 compat handoffs, never turn4 — the same
  eviction-class bug slice 8 already hit one turn earlier
  (`turn3SettledWindowActive`'s doc), just for player HP instead of the
  render-branch selector. Once turn 4's own reset evicts turn 3's shape
  from the shared `latestCompletedCommandHandoff` slot, the fallback fell
  through to `anchorPlayerAfterTurnHp` (117, full) instead of Onix's real
  88 — rendering "117/117" instead of "88/117" in the FIGHT-submenu HP
  text. Fixed all four spots (mirroring the existing "prefer freshest
  ready receipt" idiom). Fully committed with root-cause writeup on the
  salvage branch (commit message has the long version).
- **Found but NOT fixed (scoped, not guessed at):** a second, structurally
  different bug survives in `drawFightSubmenuChromeFromCurrentOwner`'s
  PP/chrome dispatch. In the parent, `latestCompletedCommandHandoff` never
  advances past turn 3's content until turn 5's own confirm (turn 4 only
  ever wrote a separate positional field there) — so the FIGHT submenu
  keeps showing turn 3's stale ROCK_SLIDE PP (8/10) all through turn 5's
  reopen-hold window. This fold's `latestCompletedCommandHandoff`
  *correctly* advances at turn 4's own reset (5351) instead — required
  for opponent-HP/`turn4SettledWindowActive` correctness elsewhere,
  already verified byte-identical for turn5-reset-off/turn4-doubleteam-
  off/turn4-rockslide-off — so chrome now shows turn 4's fresh PP (7/10)
  one turn early relative to parent. Unlike slice 8's analogous turn3→4 PP
  deviation (supervisor-verified oracle-correct and deliberately
  accepted), my brief pre-settled oracle direction as out of scope for
  turns 5-8 ("byte-identity to the clean parent, nothing else"), so I did
  not rush a fix: reconciling "PP must look fresh via one channel
  (opponent HP, `turn4SettledWindowActive`) but stale via another (FIGHT
  chrome) off the SAME shared slot" needs a real design decision (a second
  suppressed view of latest, or a distinct trigger tied to turn 5's own
  confirm), not a guess under a expiring clock.
- **Acceptance numbers (`compare:differential --base 105c72d5 --summary`,
  all 14 windows):** turn3-endeavor-off 255/255, turn3-rockslide-off
  161/161, turn4-doubleteam-off 256/256, turn4-rockslide-off 256/256,
  turn5-reset-off 256/256, **turn5-action-off 6/32** (was 1/32 pre-fix),
  **turn5-confirm-off-a 121/132** (unchanged — confirmed same root cause,
  untouched by this commit), turn5-confirm-off-b 132/132, all four
  turn5-resolve-off-{a,b,c,d} 196/196, turn6-reopen-off 46/46,
  battle-command-generated-off 128/128. 12 of 14 clean; the remaining 2
  share the one open PP-chrome root cause above.
- **Next:** a MAIN worker should resume `salvage/slice9-fold-20260802`
  (`a6d88eaa`) and design the PP-chrome fix (see "Found but NOT fixed"
  above) rather than re-diagnosing from scratch — the eviction-class HP
  bug is already closed. Re-run the full 14-window differential + full
  suite + build once that lands, then merge and delete the salvage branch
  per the standing instruction.
- **Notes:** touched only `src/engine/battleScene.ts` (the four HP-overlay
  spots) on the salvage branch; no trace/capture edits, no new state
  fields, no PP/turn selector. `DEFERRED.md` has an unrelated, pre-
  existing uncommitted change (a D1 user-communication-contract note, not
  mine, out of this step's file scope) sitting in the working tree on both
  branches — left untouched. PAPERCUT: `npm test` took ~7 minutes this
  session (422s wall clock) and auto-backgrounded past the tool's 120s
  timeout, needing an explicit blocking `TaskOutput` wait to avoid a
  premature self-abort — worth a shorter smoke-subset option for mid-
  session sanity checks.
