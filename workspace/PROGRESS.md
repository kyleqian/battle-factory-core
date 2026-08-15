# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1275 — [supervisor, 2026-08-14 night] **#89 FIXED + #90 FIXED: full-policy soak 0:60 = 60/60 OK (first time); walk-up program started (gold discrepancy resolved, script data extracted)**

- **State:** Queue items (a) #89 and (b) #90 are CLOSED (both deleted
  from ISSUES.md this commit). Full soak `--seeds 0:60` is **60/60 OK**
  — zero crashes, zero hangs, the first fully-green full-policy soak
  since chaining landed. Vanilla 0:20 stays 20/20. Union gates at the
  orient folds and after every step: full npm 1,028 files / 9,856
  passed / 223 skipped; build 676 modules; cargo green; wasm 509,811 B
  `5ed2c97a…`; forced-WASM 18 files / 803 tests.
- **Did:** (1) Orient folds: animation-main (Mega Drain 185→186 exact +
  Giga Drain checkpoint) and rust-main (remaininghptopower leaf) merged;
  union gates re-run green. (2) **#90**: side triage proved the seed-51
  "HANG" is a soak BUDGET shortfall, not a stall — completes OK at
  361,216 frames (`docs/issue90-seed51-hang-triage.md`; supervisor
  re-verified independently). Fix: `DEFAULT_RUN_OPTIONS.maxFrames`
  300k→600k (post-#89 seed 37 needs 398,088). (3) **#89**: mid-action
  player `openpartyscreen` (Baton Pass) now halts as a resumable
  player-choice (`resumeAt run-action1/2` + `pendingSecondAction`, no
  RNG re-consumption), orchestrator hands off to the forced party
  selector, partySelect gets source-true live-slot refusal
  ("is already in battle!", party_menu.c:5811-5823). All 9 crashing
  seeds now complete. NOTE: both #89 workers hit their caps
  pre-commit/pre-docs; supervisor salvaged, verified (typecheck, smoke,
  full suite — zero existing pins moved — vanilla soak, 9 seeds), and
  committed `61b0a3c1` + finished docs. The original #86 sandstorm
  fixture is unreachable post-fix (RNG trajectory diverges); a ~3,700-
  trial search found no fresh terminal-boundary repro — documented
  inline in the pin, 3 sibling #86 pins still cover non-terminal.
  (4) **Walk-up program (user pick: FAITHFUL) started**: §1.6 gold
  discrepancy RESOLVED — lab artifact (factoryBrain staging writes no
  symbol flags → GetFrontierBrainStatus misses GOLD → ordinary-opponent
  branch; RAM-probed); faithful gold entrance = "Get a move on!" per
  decomp; gold ≈ 13 first/9 repeat boxes (memo updated). Script ground
  truth extracted to `src/data/gen/factory-brain-walkup-script.json`
  (extractor byte-identical `916c9c01…`, 10-test Tier-1 pin).
- **Next:** (a) #87(c) silver-tail calibration (brief ready); (b)
  walk-up build steps in main (PreBattleRoom general pre-battle menu
  first; silver dense evidence leg in flight side-lane at write time);
  (c) chained-round distribution-parity breadth.
- **Notes:** Gold-brain overworld staging via the lab is KNOWN-BROKEN
  (symbol-flag gap) — walk-up gold acceptance must lean on source +
  the committed RAM probe, not lab traces. Commits local only —
  pushing is Kyle's step.

## 1274 — [planning session, 2026-08-14 eve] **Both waiting user decisions made: walk-up = FAITHFUL (supersedes the TRIM recommendation), #87 = option (c) calibrate-crossing-windows-only; next-run order set**

- **State:** Docs/ledger only. Both of 1273's blockers-on-the-user are
  resolved and recorded (ROADMAP 2026-08-14-eve decision block, ISSUES
  #87 decision line, `docs/noland-walkup-dialogue-scoping.md` §4).
- **Did:** Presented 1273's two waiting decisions with the memos'
  options and costs; the user picked: (1) **FAITHFUL walk-up** — full
  attendant call-scene + PreBattleRoom ready/swap/retire menu + Noland
  placement/entrance + both speeches, accepting that the menu/call-scene
  is a general pre-battle feature shared by ordinary matches (~4-6
  worker steps; the memo's §1.6 gold-discrepancy probe comes first;
  heard-speech flags in-session only — the no-save scope stands).
  (2) **#87 option (c)** — committed windows ending before their ready
  transition stay exactly as-is; calibrate only crossing windows
  (today: the silver Brain-reveal tail), constants labeled
  measured-not-derived and probe-validated.
- **Next (order for the next runs, stability first):** (a) #89 Baton
  Pass `openpartyscreen` fix; (b) #90 seed-51 hang triage; (c) #87(c)
  silver-tail calibration (small); (d) the FAITHFUL walk-up program;
  (e) chained-round distribution-parity breadth.
- **Notes:** Top-layer session; workspace edits limited to
  ROADMAP/ISSUES/PROGRESS + the scoping memo's decision section.
  Commits local only — pushing is Kyle's step.

## 1273 — [supervisor, 2026-08-14 eve] **Wind-down: entire 1267 queue closed + continuous play LIVE (battle 21 reachable by natural play); #88 root-caused same-session; all gates green, full-soak baseline re-based post-chaining**

- **State:** 8 worker steps across 2 lanes, zero unresolved failures.
  Queue (i)/(ii)/(iii) all COMPLETE (ROADMAP annotations updated);
  continuous-play wiring live. DEFERRED.md remains EMPTY. Two user
  decisions are ready and waiting (not blockers): walk-up dialogue
  FAITHFUL/TRIM/SKIP (`docs/noland-walkup-dialogue-scoping.md`,
  recommendation TRIM) and #87's fix shape (three options in ISSUES).
- **Did (headlines):** (1) Queue (i): `applyFactoryBrainRoundOutcome`
  (ROM-table cross-checked: silver 14/gold 15/+10 bonus/symbol grant) +
  orchestrator `roundOutcome` outputs + brain congrats text; live
  verification: BP **0→14** + silver symbol flag RAM-pinned
  (`docs/brain-terminal-live-verification.md`), both congrats
  scroll-gate ages live-bisected (98, release+32; supervisor applied
  the off-by-1/off-by-3 src correction). (2) Queue (ii): #87 rounds
  15-17 — residual = two independent additive legs; ack leg is
  `AI_TrySwitchOrUseItem` (not move-scoring); Quick-Claw and
  opponent-identity predicates both FALSIFIED; evidence program
  complete, fix-shape decision recorded in #87. (3) Queue (iii):
  walk-up scoping memo (3 maps, ~17/~8 boxes end-to-end). (4)
  Continuous play: `factoryRoundChaining.ts` + terminal→next-draft
  path (decision: re-enter fresh generated draft after the record
  menu, no new lobby surfaces); exposed pre-existing #88 → fixed at
  root cause (`FaintClearSetData` zeroes status2 on faint;
  battle_main.c:3272), vanilla soak 14/20→**20/20**; #89 filed
  (Baton Pass `openpartyscreen`), #90 filed (seed-51 presenting HANG).
  (5) Lane folds at orient AND wind-down (animation: Flail 184 +
  Luster Purge 185 promotions, Mega Drain evidence; rust: 6 script
  leaves) — both lanes at zero unfolded commits at close.
- **Gates (final union, re-run after a last rust-main tail fold —
  settorment + snatch leaves, core-rs only):** full npm **1,024 files /
  9,833 passed / 224 skipped**; build green; cargo native green (62
  ok-suites); wasm rebuilt **496,864 B** `8b489813…`; forced-WASM
  **18 files / 803 tests**; soak vanilla **20/20 OK** (run before the
  core-rs-only tail, which soaks do not exercise); soak full 0:60
  **50/60** — all
  9 crashes are the single #89 class (seeds 1,19,21,25,27,37,40,41,57,
  mostly round-1 surface: full-policy play selects Baton Pass), 1 HANG
  is #90. NOTE: the prior 60/60 full-soak baseline predates chaining
  AND this session's driver changes — input streams shifted; vanilla
  20/20 is the standing regression bar, and #89/#90 are the honest
  full-policy remainder, not regressions of previously-green behavior.
- **Next:** (a) #89 — player-side mid-turn Baton Pass switch-in
  through `beginCommandResolution` (the opcode exists; the wiring
  gap is diagnosed in the entry); (b) #90 triage (seed 51); (c) the
  two waiting user decisions above; (d) distribution-parity breadth
  for chained rounds once #89 lands.
- **Notes:** oracle freshness FAILs on :8014/:8012 were the known
  timestamp false positive (verified against commit contents + live
  `bin/oracle info`). Wasm-artifact papercut hit 3× more this session
  (now 5; every fresh side worktree). Commits local only — pushing is
  Kyle's step.
