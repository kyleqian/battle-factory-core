# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 861 — [supervisor wind-down, 2026-08-02 05:15] dispatcher ladder slices 1-7 + item-7 dismiss owner + two same-session fix chains; union green

- **State:** master at the slice-7 salvage acceptance; full `npm test`
  **605 files / 6,224 passed / 1 skipped**, `npm run build` + `npx tsc
  --noEmit` green (supervisor-run, post-final-commit). DEFERRED.md empty.
  Census: handoff state fields **13→2** (turn3/turn4 remain), declarations/
  positional params still 13 (slice 10). Session: 10 workers (9 landed, 1
  cap-killed and salvaged), 2 supervisor fix/bisect chains.
- **Did:** (1) #39 item 7: `opponentFaintDismissElapsed` → typed owner
  (entries 851-852). (2) Dispatcher design dossier banked + slices 1-7:
  uniform receipts, shadow latest + PP equivalence (5,638/5,638), content
  bridges 5-8 and 9-13, slice-5 CUTOVER (generic guard chain drives 5-13),
  turn-1 and turn-2 epoch folds. Slice 7 was cap-killed mid-ledger
  (exit 124) after its three implementation commits; supervisor verified
  the salvage directly — six oracle pins exact (256/256, 237/237, 254/255
  #61-residual, 161/161, 256/256, 128/128) + full suite/tsc — and accepted.
  (3) #56 frame-444 CLOSED as fixed: side OAM probe exonerated the sprite,
  pinned the ball-open particle stall; fix landed at exact prediction
  (219px→18px, the 18 are the settled display-tail class). (4) Generated-
  route canary `battle-command-generated-off` found at 70/128, bisected to
  `b464a6e7` (rank-7), root-caused (missing `BattleScript_Pausex20` receipt
  under `HITMARKER_NO_ANIMATIONS`), fixed to 128/128 with rank-7 canonical
  windows byte-identical. (5) Slice-6 regression (optional state field +
  conditional spread → null degraded to undefined) caught by the
  supervisor's post-fold union suite, fixed in `3005e9c2`. (6) Folded
  animation-main at orient (ZIGZAG_SLOW); ledger archived to top-3; census
  script now fails loudly without rg; 7 stale scratch worktrees swept.
- **Process rules adopted (recorded, apply in future briefs):**
  `battle-command-generated-off.json` joins the standing differential-
  insurance set for any slice touching resolution/orchestrator files;
  workers rerun the FULL suite + tsc AFTER their final implementation
  commit; state fields are never optional/conditionally-spread.
- **Next:** dispatcher slices 8 (turn-3 fold), 9 (turn-4 fold + turn-5
  reader bank), 10 (final 13-param/type cut) per
  `docs/next-command-handoff-dispatcher-design.md`; then #39 species/episode
  render entry points. Turns 5-8 ON-pin OFF re-timing policy remains an
  un-adopted user question (unchanged). #55/#62 untouched.
- **Unfolded:** `animation-main` is 3 commits ahead (fast-zigzag family)
  with a LIVE animation worker at wind-down (worktree
  `animation-20260802-044900`) — fold at next orient per protocol.

---
