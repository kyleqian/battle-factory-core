# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 865 — [bounded MAIN worker, 2026-08-02] #65 fixed — ATTACKER-variant stat-banner branch added

- **State:** `c7461398` is the green fix commit (parent `fcf05dd9`). Full
  `npm test` **613 files / 6,275 passed / 1 skipped**, `npm run build` and
  `npx tsc --noEmit` both exit 0.
- **Did:** Per `docs/silverwind-allstatsup-crash-scout.md` §5, added the
  missing `STRINGID_ATTACKERSSTATROSE`/`STRINGID_ATTACKERSSTATFELL` branch
  to `battleResolutionPresentation.ts`'s `messageLines`, mirroring the
  existing `DEFENDERSSTATROSE`/`FELL` branch (`B_ATK_NAME_WITH_PREFIX` from
  `lastStatChange.battler` instead of `B_DEF_NAME_WITH_PREFIX`, same
  `B_BUFF1`/`B_BUFF2` logic; both ROSE and FELL in one branch-add, gen'd
  table already single-sourced at `battleScriptHitChainOpcode.ts:412-425`).
  Flipped `tests/silverWindAllStatsUpRepro.test.ts` from `it.fails` to `it`,
  widened to assert all five ordered ATK/DEF/SPEED/SPATK/SPDEF banners
  (6→7, exact resolved text). Added
  `tests/battleResolutionAttackerStatFellInsurance.test.ts` (Tier-1
  insurance, scout §5 step 4): Superpower's real, deterministic
  (`MOVE_EFFECT_CERTAIN`, accuracy 100, no RNG-gated proc)
  `BattleScript_AtkDefDown` self-drop through the same production
  kernel+presentation path, asserting both `STRINGID_ATTACKERSSTATFELL`
  banners.
- **Evidence:** Oracle pin (scout §4, `mechanicLab` seed 8) replayed
  directly — matches the scout's table byte-for-byte: `rngValue` pinned at
  3664104713 frames 240-734, opponent HP 105→60, final player
  `statStages [6,7,7,7,7,7,6,6]`. `compare:differential --base fcf05dd9`
  (turn5-rockslide/turn5-faint/turn13-dragonbreath-faint/battle-command-
  generated-off): **635/635 byte-identical** (256, 110, 141, 128). Stat-
  change insurance: `turn4-doubleteam-off` **256/256** (unchanged).
  `turn11-featherdance-off` and `turn13-menu.json` are **189/191** and
  **56/57** — NOT the brief's expected 191/191/57/57 — but a same-parent
  worktree diff at `fcf05dd9` (pre-fix) reproduces the *identical* frames
  and diff stats (13340/13341 resp. 15374, same bbox/ssim), proving this
  divergence pre-dates the fix and the DEFENDER-variant path did not move;
  the brief's counts were stale. Reporting honestly per the step's own
  discrepancy clause rather than tuning anything.
- **Next:** file the stale 191/191→189/191 and 57/57→56/57 insurance counts
  as a small doc/ledger correction (not a regression) so the next worker
  doesn't re-flag it; resume slice 9 (turn-4 fold).
- **Notes:** touched only `src/engine/battleResolutionPresentation.ts` plus
  the two named test files, per scope. No trace/capture edits, no
  dispatcher-ladder files touched.
