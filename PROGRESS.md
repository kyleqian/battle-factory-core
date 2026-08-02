# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 864 — [supervisor, 2026-08-02 11:55] slice 8 landed via salvage→retry; #65 scouted, fix launching; slice-6 PP leak bisected; species dossier banked

- **State:** master at `d13944bf`; full `npm test` **611 files / 6,273
  passed / 1 skipped**, build + tsc green (supervisor-run). Census: state
  fields 1 (turn4); declarations/FIGHT/PP params 13. Slice-8 differential
  vs `706be469`: every window byte-identical EXCEPT turn4-doubleteam-off
  **219/256** — deviation deliberately accepted: the 37 frames (4898-4934,
  6px, submenu PP region) are a pre-existing oracle divergence the fold
  FIXES (master **256/256** vs oracle; parent **219/256** — both replayed
  directly by the supervisor).
- **Did:** (1) Slice-8 attempt 1 cap-killed differential-red
  (turn3-rockslide 112/161); preserved on a salvage branch, master reset to
  the green bridge `947d624c`, retry rebriefed with the exact failure map —
  landed `fed91e87`. Root cause was eviction-class, not bounce-composition:
  a reader narrowed to turn-2's receipt shape broke when turn 3 evicts the
  shared latest slot (fix: `turn3SettledWindowActive` gate). (2) Bisected
  the PP divergence: green at slice-6 bridge `04bc1092`, red at slice-6
  fold `cbb41421` — slice 6's differential list (turn-1/2 windows only)
  could not see a turn-4 reader break. **Process rule: fold-slice
  differential lists must include downstream-turn windows** (slice-9 brief
  widened with the turn-3 pair). (3) Same-day user crash filed as **#65**
  (SILVER WIND 10% proc → uncaught throw): side scout root-caused it to the
  missing ATTACKER-variant stat-banner branch in
  `battleResolutionPresentation.ts` `messageLines` (kernel exonerated,
  oracle pins at seed 8, it.fails repro committed) — scout doc merged;
  fix worker launching next on main. (4) #39 species render entry-point
  retirement dossier banked (census 4→45, 7-slice plan,
  `docs/species-render-entry-point-retirement-design.md`). (5) Turn-5
  Scene-OFF reader bank merged (9 traces, 1,382 dense captures; windows
  2-5 honestly non-oracle-exact per the un-adopted turns-5-8 OFF policy —
  differential-only readers for slice 9). (6) Two claude-worker
  self-aborts (backgrounded verification + notification wait) salvaged by
  the supervisor; PAPERCUTS entry added; all queued briefs carry a
  foreground-execution clause. (7) `.worktrees/play-preview` is an
  INTENTIONAL user-facing worktree (frozen play build on :5199), not a
  stale scratch worktree — do not sweep while the preview is in use.
- **Next:** verify #65 fix → slice 9 (turn-4 fold, widened windows) →
  slice 10 if time permits; species-dossier slices follow the ladder.
  Wind-down before the 15:23 hard deadline.

---
## 863 — [bounded MAIN worker, 2026-08-02] dispatcher slice 8 Turn-3 generic fold (retry, landed)

- **State:** `fed91e87` is the green fold commit. Full `npm test` **611 files
  / 6,273 passed / 1 skipped**, `npm run build` and `npx tsc --noEmit` exit 0.
  Salvage branch `salvage/slice8-fold-20260802` deleted (folded in cleanly).
- **Diagnosis (required by the brief):** cherry-picked the salvage commit
  as a starting point, then bisected its regression with `inspect-frame`
  against clean `947d624c`. Root cause: once turn 3 publishes into the
  shared `latestCompletedCommandHandoff` slot, the pre-existing
  `turn3CommandHandoff` render flag (`drawFightSubmenuWindow`'s "turn 2's
  receipt, still active during turn 3") loses its own lookup — it narrowed
  `latest` to turn 2's shape, which stops resolving the instant turn 3
  overwrites that slot with its own shape. The dispatcher then fell through
  turn 3's WHOLE settled-menu window (turn3-rockslide-off frames 4212+) to
  the turn-1 ROCK_SLIDE fallback (Onix rendered at stale full HP) — this was
  the 49-frame regression, not a timing/bounce-composition bug as first
  suspected. Fix: added `turn3SettledWindowActive`, an explicit "turn 3's
  own post-reset window, before turn 4 supersedes it" gate independent of
  the now-evicted turn-2 shape; threaded `null`-tolerant
  `turn2NextCommandHandoff` params (with throwing guards) down the one call
  chain that still needs it, pre-reset only.
- **Evidence:** oracle-verified directly (ground truth, not just the
  differential): `turn3-rockslide-off` **161/161**, `turn4-doubleteam-off`
  **256/256**, `turn4-rockslide-off` **256/256**,
  `battle-command-generated-off` **128/128** (`turn3-endeavor-off` **254/255**,
  the known parked #61 residual, unrelated). `compare:differential --base
  706be469`: turn3-endeavor-off 255/255, turn3-rockslide-off 161/161,
  turn4-rockslide-off 256/256, battle-command-generated-off 128/128 all
  clean; turn4-doubleteam-off is **219/256 (37 differ)** — proven (via a
  706be469 worktree replayed against the oracle directly) to be a
  **pre-existing PP-display bug already in 706be469** (ROCK_SLIDE showed
  9/10 PP instead of the oracle's correct 8/10 once turn 4's own FIGHT
  submenu opens), not a slice-8 regression; this fold fixes it as a side
  effect of deriving PP from the generic receipt chain. Census: handoff
  state fields **2→1** (turn4 remains), initial-state/advance-copy **2→1**;
  declarations and FIGHT/PP parameters stay **13**.
- **Did:** two `tests/fightSubmenu.test.ts` assertions and one
  `tests/battleScene.test.ts` fixture (`TURN4_FIGHT_SUBMENU_STATE
  .openElapsed`, a stale `0` placeholder that stopped being a "don't care"
  once turn 3 started publishing into the shared slot) updated for the new
  fold; `TURN2_LATEST_HANDOFF` → `TURN3_LATEST_HANDOFF` where the generic
  receipt is now turn 3's own.
- **Next:** slice 9 (turn-4 fold consuming the already-banked turn-5 OFF
  reader set), slice 10 (final 13-param/type cut), then #39 species/episode
  render entry points.
- **Notes:** no trace/capture-list edits, recording import, PP/turn
  selector, animation, or unsupported-branch barrier work. Landed well
  within the 60-minute cap (diagnosis conclusive by ~25 min, matching the
  brief's checkpoint).

---
