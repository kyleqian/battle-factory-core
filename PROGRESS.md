# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 860 — [bounded MAIN worker, 2026-08-02] dispatcher slice 6 Turn-1 generic fold

- **State:** `04bc1092` carries the optional typed epoch/content checkpoint;
  `cbb41421` is the green field-cut checkpoint. Full `npm test` is **592 files
  / 6,144 passed / 1 skipped**; `npm run build` and `npx tsc --noEmit` pass.
- **Did:** Turn 1 now publishes the generic completed-command owner at the
  HandleInputChooseAction → DoBounceEffect reset (epoch 1308, HP 117/101,
  seeds 192/128). Production core, rendering, PP projection, and the turn-2
  link consume that content; B-close/A-reopen preserves it. The retired Turn-1
  scene field is gone while turns 2–4 retain their staged ABI.
- **Evidence:** clean-parent `04bc1092` raw-RGBA replay is **1,395/1,395**:
  required turn-1/2 windows **1,162/1,162** plus turn-9 reader **233/233**.
  `battle-command-generated-off` is **128/128** vs the Scene-OFF oracle.
  Census state/initial/copy **4→3**; test literals **202→194**; declarations
  and staged FIGHT/PP parameters remain **13**.
- **Next:** Slice 7 — fold Turn 2 epoch/content onto the same generic owner;
  leave Turns 3–4 and final positional ABI deletion for their planned slices.
- **Notes:** no trace/capture-list edits, recording import, PP/turn selector,
  animation, unsupported-branch barrier, or ON-profile work.
