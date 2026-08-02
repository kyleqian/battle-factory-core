# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 859 — [bounded MAIN worker, 2026-08-02] dispatcher slice 5 production cut

- **State:** `5c8eb38c` is the second green slice-5 checkpoint. `npm test` is
  **592 files / 6,142 passed / 1 skipped**; `npm run build` and `npx tsc
  --noEmit` exit 0.
- **Did:** generic semantic content and immutable reopen guards are now the
  production turn-5–13 route. Core atomically installs each successor/retained
  FLY owner; the nine legacy state fields, copies, publications, and renderer
  fallbacks are gone. Turns 1–4 and the staged 13 renderer/PP parameters/types
  remain untouched for later slices.
- **Evidence:** clean-parent app replay is **5,638/5,638** raw captures across
  all 33 slice-1 windows; generated Scene-OFF is **128/128**; changed terminal
  rungs are **255/255**, **147/147**, **255/255**, **118/118**. Census:
  state/initial/copy **13→4**, type declarations and FIGHT/PP parameters remain
  **13**, test literal assignments **289→202**.
- **Next:** Slice 6, fold the turn-1 epoch/content into the generic owner;
  preserve the remaining early-turn invariants and staged ABI.
- **Notes:** no trace/capture edits, animation, barrier, PP tuple selector, or
  completed-turn selector landed.

