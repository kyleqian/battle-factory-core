# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 862 — [supervisor orient, 2026-08-02 09:45] pre-session fold verified green; rg census trap cured; slice-8 + turn-5-reader lanes launched

- **State:** master at `706be469`; union verified green by the supervisor:
  full `npm test` **611 files / 6,271 passed / 1 skipped**, `npm run build`
  exit 0, oracle freshness PASS. DEFERRED.md empty. Census: handoff state
  fields 2 (turn3/turn4); declarations, FIGHT and PP params 13 each.
- **Did:** (1) Verified the pre-session morning fold: `99c85078` merged
  animation-main (fast-zigzag, back-and-lunge, circular-vibrate families) and
  the harness landed `2b783b25` (tier-routing docs) + `706be469`
  (`npm run compare:differential` shared clean-parent harness, top papercut
  retired) at 09:04-09:21, before this session — entry 861's "Unfolded"
  pointer is resolved. (2) Cured the rg-missing census trap system-side
  (`brew install ripgrep`); `tools/census-next-command-handoffs.sh` runs
  standalone again (it exited 2 on every bash invocation since the
  loud-failure guard landed). (3) Launching dispatcher slice 8 (turn-3 fold,
  MAIN lane) and the turn-5 Scene-OFF reader bank (SIDE lane, the slice-9
  prerequisite per docs/turn1-4-epoch-prep.md:240-272) in parallel —
  disjoint ownership: slice 8 touches src/engine + named tests only; the
  bank adds new tools/compare/traces files only.
- **Next:** verify both lanes; slice 9 (turn-4 fold consuming the banked
  readers), slice 10 (final 13-param/type cut), then #39 species/episode
  render entry points. Turns 5-8 ON-pin OFF re-timing policy remains
  un-adopted (unchanged).
