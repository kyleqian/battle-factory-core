# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 1377 — [main worker, 2026-08-22] **ISSUES #104 CLOSED: YES branch now shows EventScript_SaveBattle's own "battle was recorded" message before the shared farewell**

- **State:** `src/engine/factoryTerminalPresentation.ts` +
  `src/engine/factoryTerminalRender.ts` (fix, `f04519bd`/`e72292fe`),
  `tests/factoryTerminalRecordIssue104.test.ts` (YES sub-test rewritten, red
  paste in the commit body), new trace
  `tools/compare/traces/loss-terminal-record-yes-off.json` +
  `tools/battle-lab/scratch-loss-record-yes-probe.json` (`fa7d5215`), new
  doc `docs/factory-terminal-record-yes-ground-truth.md`. `npm test`
  **10,208 passed / 223 skipped**, `npm run build` green, smoke 444/444,
  `executableFrontierRatchet.test.ts` unchanged.
- **Did:** oracle-derived the YES trace from the existing NO-path probe
  (one appended UP + the same confirm A + two new dismiss A's; run via
  `bin/oracle lab`, not `bin/oracle run`). `declineFarewellReleaseAge` still
  arms on confirm for all three answers; for YES it doubles as the new
  message's own edge (`recordSavedTextClearDelay=21`/`TextFirstDelay=22`/
  `InputDelay=70`, oracle-measured — `frontier_savebattle`'s own latency)
  until that message's own dismiss re-arms it, at which point the existing
  farewell mechanics drive unmodified. `npm run compare --summary`:
  **133/133** over the dense window. NO/B-cancel pins untouched.
- **Next:** #110 cleanup as a small main step; draft heuristic n ≥ 180 if a
  slot frees; `full`/`vanilla` soak re-sweeps still outstanding (carried).
- **Notes:** PAPERCUT: the record-menu cursor-move (`UP`) renders 1 tick
  earlier in the app than the oracle (`drawRecordPrompt`, pre-existing,
  out of scope) — worth a future look, ~5 min lost isolating it from #104.

---
