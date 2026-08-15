# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1277 — [main worker, 2026-08-15] **Walk-up build step B1 LANDED: Frontier-Brain BattleRoom entrance (Noland visible-from-start, "Get a move on!", simultaneous walk-in, scientist turn) — machine + Tier-1 + differential proof green; oracle dense compare NOT run this session (honest residual, see Next)**

- **State:** B1 (entrance settled, speech not started — B2's job) is
  implemented as an additive branch of the existing BattleRoom entrance
  machine, keyed off `BattleOpponent.frontierBrain` (never a battle-
  number/trace check). Full `npm test` (1029 files / 9870 passed / 223
  skipped) + `npm run build` + `npm run typecheck` green. Ordinary path
  proven byte-stable via differential compare (below); oracle dense
  compare against the committed silver-walkup fixtures is the one
  acceptance item **not completed this session** — flagged honestly
  under Next/Notes rather than fabricated.
- **Did:** (1) Extracted Noland's overworld walk sprite (`OBJ_EVENT_GFX_
  NOLAND`, `frontier_brains/noland.png` + `npc_3.pal`) into
  `battle-room-npcs.json` (additive key, existing battleRoom/
  battleRoomOpponentSheets tests untouched). (2) Built the brain-branch
  state machine in `battleRoom.ts`: new phases `brainEntering ->
  brainMsgboxIdle -> brainMsgboxClosing -> brainMoving -> brainSettled`
  alongside (not replacing) the ordinary `entering/msgboxIdle/
  msgboxClosing/settled` sequence. Box text sourced directly from
  `factory-brain-walkup-script.json` (`BRAIN_MSGBOX_LINE1/2`). Noland's
  own walk (`nolandStep`) reuses `entryStep`'s camera-pan clock and
  frame column directly (same `waitmovement 0`, same `sAnimTable_
  Standard` per source) rather than a second independent counter;
  scientists reuse `scientistTurnFrame` verbatim (literally the same
  `ScientistsFaceBattle` call both paths make). `battleRoomStateForOpponent`
  is the single branch-selection seam. (3) Renderer:
  `renderBattleRoomBrainEntranceScene` in `battleRoomRender.ts`, wired
  into `core.ts` at the one real construction site (the postwin ->
  prebattleRoom warpFade -> battleRoom chained-round handoff) plus its
  advancement/render dispatch — all changes gated on
  `frontierBrainWalkup`/`frontierBrain` so the ordinary path's code path
  is provably untouched. (4) Tier-1: new
  `tests/battleRoomBrainEntrance.test.ts` (11 tests) pins text verbatim,
  Noland's/decoy's/scientists' movement step counts and positions
  against the JSON (and scientist positions cross-checked against
  `battle-room-layout.json`), branch selection (brain vs. ordinary vs.
  no-opponent), and the full phase settle sequence ending at the named
  `brainSettled` seam. (5) `npm run compare:differential` on 3 committed
  ordinary traces crossing the BattleRoom entrance (`room-entry.json`,
  `battle2-room-a.json`, `s6-acceptance.json`) vs. parent commit
  `2d2c2c81`: **PASS, 563/563 captures byte-identical** — the ordinary
  path did not move a pixel.
- **Not done — honest residual (acceptance item 2, oracle dense
  compare):** the existing staging tool
  (`tools/compare/factoryRoundIntroGeneralizationStage.ts`) jumps
  straight to `beginFactoryRoundBattleStartIntro`, bypassing
  `BattleRoom` entirely — there is currently no app-side harness that
  stages a live battle 21 through the room-entrance render path at all,
  brain or ordinary. Building one (mirror the existing stage function up
  through `advanceProofWin`x6, then set `battleRoom =
  battleRoomStateForOpponent(...)` instead of calling
  `beginFactoryRoundBattleStartIntro`, then tick/capture/diff against
  fresh `bin/oracle lab` PNGs for fixtures 02/03) did not fit this
  session's remaining time after landing the machine + Tier-1 + the
  differential proof. Three constants are therefore derived, not
  dense-compare-calibrated, and flagged as such in `battleRoom.ts`'s own
  doc comments: `BRAIN_MSGBOX_APPEAR_ELAPSED` (0, box visible from the
  very first room frame), `NOLAND_INITIAL_SCREEN_Y`/`nolandStep`'s
  lockstep-with-camera-pan model (algebraically self-consistent with
  already-pinned constants, not RAM-probed this route), and
  `BRAIN_MOVEMENT_SETTLE_ELAPSED` (108, reusing `scientistTurnFrame`'s
  own threshold). `docs/noland-silver-walkup-presentation-map.md` §2 row
  6 also flags this window's camera motion as visually complex ("zooms/
  pans") in a way the straight-line pan model here may not fully
  capture — the likely source of any residual a future dense compare
  finds.
- **Next:** B2 (silver/gold speech, consumes the `brainSettled` seam);
  the oracle dense-compare harness above (small, scoped); chained-round
  distribution-parity breadth.
- **Notes:** Commits local only — pushing is Kyle's step.

## 1276 — [main worker, 2026-08-15] **#87(c) EXECUTED: silver Brain-reveal ready-lag window calibrated (648/701 → 690/701); gold + pre-ready windows untouched; ISSUES #87 trimmed to durable mechanism record + standing rule**

- **State:** #87's queued next-step is done for the one window that
  currently crosses the ready transition. ISSUES #87 trimmed (not
  deleted — the mechanism isn't source-predictable and a future
  crossing window will need the same recipe; kept as a settled-record
  entry with the standing rule). Full `npm test` (1028 files / 9857
  passed / 223 skipped) + `npm run build` + `npm run typecheck` green.
- **Did:** (1) Measured the silver Noland reveal fixture
  (`factory-round-battle7-noland-reveal-off`, TANGELA/DELCATTY) with
  the RAM-handshake instrument: formula-relative residual +6; leg-split
  raw span 4 (switch-in-loop) + 3 (AI-ack) = 7, matching PUPITAR's own
  +7 split (both probes extended with this fixture as a new scenario,
  not forked). (2) Threaded a new route-level `isSilverBrainReveal`
  fact (`frontierBrain.status === "silver"`) through
  `FactoryBattleStartIntroState`, mirroring `isCanonicalAnchorIntro`'s
  existing pattern — no battle-number/trace-name branch.
  `generatedPlayerReadyLag` adds a `MEASURED_SILVER_BRAIN_REVEAL_READY_
  LAG_OFFSET` (9, resolved against this window's own dense compare —
  the two RAM probes bound the neighborhood but not the exact tick,
  same "value the pin needs" convention `GENERATED_PLAYER_READY_LAG`
  already uses) only on that route. (3) Silver dense compare
  **648/701 → 690/701**; gold Noland dense compare unchanged at
  **700/701** (different `frontierBrain.status`, offset never fires);
  `npm run compare:differential` on Yoshi/Lukas/Magneton (pre-ready
  windows) vs. parent commit: **PASS, 1656/1656 byte-identical**. (4)
  Fixed `tools/compare/app-differential.ts`, which still assumed
  `workspace/` was the git repo root (broke on every commit since the
  2026-08-11 layout migration — needed to run (3)); now resolves paths
  relative to `process.cwd()`'s position under the repo root. (5)
  Pinned with a new Tier-1 test
  (`tests/factoryRoundIntroGeneralization.test.ts`) asserting the flag
  is keyed off `frontierBrain.status` correctly (silver true, gold
  false) and the ready tick shifts by exactly the offset only on that
  route.
- **Remaining silver residual (11/701, out of #87's scope):** frames
  420/503 are present identically with the offset at 0 (pre-existing,
  unrelated to readiness); frames 647-655 are a render seam right at
  the not-ready/ready boundary whose width didn't change across every
  offset value tried (5-10) — an honest cap from a separate,
  unidentified issue, not a #87 residual.
- **Next:** walk-up build steps in main (PreBattleRoom general
  pre-battle menu first); chained-round distribution-parity breadth.
- **Notes:** PAPERCUT — `app-differential.ts`'s repo-root assumption,
  ~15 min lost bisecting before finding the fix (item 4 above; fixed in
  this session, not just worked around). Commits local only — pushing
  is Kyle's step.

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


