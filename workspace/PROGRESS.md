# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1380 — [supervisor fold, 2026-08-22 14:35] **#115 FIXED + folded (`ade427f7`, salvaged: post-switch-in messages name the slot's CURRENT occupant); #110 + richer switch-in throws (1379); draft heuristic WITHHELD for good at n=180 (≥21: 40 vs 7); session depth number on the fixed tree: `winning` 0:180 → 180/180 OK, carry ≥ 28 in 4/180**

- **State:** master = 1379 + merge of `worker/side-20260822-130450` (#115;
  its cap-killed worker had run the full suite at 10,212 before the kill;
  supervisor verified pins 99/99 + smoke 444 in the worktree) + the n=180
  measurement doc (`docs/soak-draft-heuristic-n180-2026-08-22.md`, cherry-
  picked from `wip/mb-step2b-draft-heuristic` @ `1f500a92`, baseline arm +
  verdict appended). Merged-tree full suite: at wind-down.
- **Decisions:** draft-by-strength heuristic stays WITHHELD (closed
  experiment; the wip branch is the record) — it wins round 2 more often
  (178 vs 163 at carry ≥ 14) but collapses at challenge 3+ (7 vs 40 at
  ≥ 21, 0 vs 4 at ≥ 28). ROADMAP soak-policy block gained the #116 gate-
  coverage note (vanilla is one trajectory); the gate itself unchanged.
- **Next:** main = #71 Slice C (loud guards on the two back send-out
  hand-fits); side = #117 (record-cursor frame) in flight; then wind-down
  gates from ~18:15 (full suite, build, vanilla 0:20, full 0:60, plus a
  `full` 0:240 + `winning` 0:240 on the final tree).

---

## 1379 — [main worker, 2026-08-22] **ISSUES #110 fixed (Cmd_openpartyscreen always scores via the AI selector, no legal-count shortcut); PAPERCUTS "switchhandleorder/getswitchedmondata throws" closed (richer diagnostics)**

- **State:** master `890a8593` + this docs commit. `npm test` **1,093
  files / 10,219 passed / 223 skipped**, `npm run build` green, smoke
  444/444, `executableFrontierRatchet.test.ts` unchanged.
- **Did:** removed the `legalBenchIndexes.length === 1` shortcut (source:
  `battle_script_commands.c:5113-5148` + `battle_controller_opponent.c:
  1621-1675`, both unconditional); new pin: an egg now correctly outscores
  the shortcut's non-egg answer (verified red with the shortcut restored).
  Soaks: `full` 100:140 **40/40 OK**, `winning` 130:150 **20/20 OK**.
  Enriched both switchin-opcode "undecided monToSwitchIntoId" throws with
  the decided array/party HP/script label+pc; two new pins; PAPERCUTS entry deleted.
- **Next:** fold #115; draft heuristic n ≥ 180; final `winning` 0:240 depth.
- **Notes:** no new papercuts this session.

---

## 1378 — [supervisor fold, 2026-08-22 13:55] **#112 + #113 FIXED + folded (`3c6e192a` `Cmd_getexp` republishes `gBattlerFainted`; `6f810a51` forced send-out resumes at the SELECTED switch-in — 12 display commands were being dropped); #104 CLOSED (1377, YES-path trace 133/133 re-run by the supervisor); #116 filed: `vanilla` is seed-invariant**

- **State:** master `4837a062`+docs. Merged-tree checks: #104 compare
  **133/133**, pins 15/15, smoke 444 (union full suite at `05311bbf`:
  **1,091 files / 10,208 passed / 223 skipped**, build green; the #104 and
  #112/#113 workers each ran full suites at their commits — 10,208 / 10,211).
  `full` seeds 108 + 192 now OK; `full` 100:120 20/20; vanilla 0:20 20/20.
- **Findings recorded:** #116 — every `vanilla` seed replays ONE trajectory
  (240/240 identical end states; the policy draws no RNG and the engine RNG
  advances only on draws), so the standing "vanilla 0:20" gate is a
  single-trajectory smoke ×20 — user-facing gate semantics, recorded with
  options, not changed. #117 (1-frame record-cursor timing, from the #104
  trace). #115 (post-forced-switch messages name the PRE-switch mon — side
  worker on it now, base `6f810a51`). PAPERCUTS +2 (#104 worker).
- **Next:** fold #115; main = #110 cleanup + richer switch-in throws
  (PAPERCUTS); side after #115 = draft heuristic n ≥ 180 measurement; final
  `winning` 0:240 depth number on the fully-fixed tree + wind-down gates
  from ~18:15.

---
