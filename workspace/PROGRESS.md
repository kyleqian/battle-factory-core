# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1258 — [supervisor, 2026-08-14] **Round 1 folded: §5.2 rungs 1-3 (main) + CGB4 family gated (side salvage)**

- **State:** supervisor session, deadline 17:54. Baseline re-verified at
  orient (build green; full suite 1056 files / 9934 passed / 1 skipped,
  1147 s — CGB4-dominated). Both round-1 steps are on master (merge
  `dc57b7c3`).
- **Did:** (1) Verified the MAIN worker's 1257 result — reran
  `tools/probe/verify-factory-brain-lab.ts` live myself: **82/82**. (2)
  SIDE lane: CGB4 gating came back complete but uncommitted (worker
  self-suspended awaiting a background run — the known ScheduleWakeup
  class). Salvaged per the commit-tail recipe: verified in the worktree
  (gated default: family skips at collection, digest pin 45/45; flag-on
  `npm run test:cgb4` **44 files / 222 tests green**; typecheck + build
  green; full default suite green after restoring the gitignored
  `artifacts/wasm/factory_wasm.wasm` `7e23d1bf` — the 6-file/19-test
  failure class in a fresh worktree is that missing artifact, not the
  change), committed `a2fe03c9` with provenance, merged, union smoke
  375/375 + gate/digest spot-check green, worktree cleaned.
- **Next:** round 2 (dispatched): MAIN — Brain presentation seam
  (`getFactoryTrainerPresentation` 1022 entry from `gTrainers
  [TRAINER_NOLAND]` per design §2.3, proof-stage battleIndex-6 widening,
  Tier-1 pins, stretch: 1257's rung-4 remainder); SIDE — new-files-only
  scout banking the Brain intro window ground truth (dense captures, tick
  table, verify script) off the silver fixture.
- **Notes:** `check-oracle-freshness.sh` FAILs both ports; :8014 is a
  false positive (started from the edited tree 48 s before commit
  `33354440`; it advertises `factoryBrain` — verified) and :8012 is the
  animation lane's to restart by design. Animation and rust supervisors
  are live this session (their lane branches are ahead of master); folds
  happen at wind-down. Default `npm test` no longer runs the 44-file CGB4
  family — set `POKEBENCH_CGB4_EVIDENCE=1` (or `npm run test:cgb4`) for
  the full grind evidence.

## 1257 — [MAIN worker, 2026-08-14] **factoryBrain §5.2 workspace consumers: rungs 1-3 landed green; rung 4 precisely blocked**

- **State:** design §5.2's workspace-consumer worklist is landed through
  rung 3 (docs, fixtures, live integration proof). Rung 4 (compare-harness
  staging) is genuinely blocked by a real dependency gap, not a time-budget
  skip — proven live, not assumed; see Notes.
- **Did:** **Rung 1** — `tools/battle-lab/README.md` now documents
  `factoryBrain` accurately (challengeNum `{2,5}`, no
  `trainerId`/`battleNum`/`opponentSetIds`, echoed `fixedIv`/`opponentParty`,
  `overrides.parties` permitted / `overrides.battlers` rejected), replacing
  the stale "stages regular trainers rather than Noland" line. **Rung 2** —
  checked in `tools/battle-lab/factory-brain-{silver,gold}-turn1-off.json`
  (turn-1 windows); both run green live: `bin/oracle lab
  tools/battle-lab/factory-brain-silver-turn1-off.json -o /tmp/factory-brain-silver`
  → `fixedIv 15`, 3-mon `opponentParty`, no `trainerId`/`rangeIndex`,
  captures `[0, 734]`; gold same shape with `fixedIv 31`. **Rung 3** —
  `tools/probe/verify-factory-brain-lab.ts` (sibling of
  `verify-noland-brain-receipts.ts`): stages the rung-2 fixtures through the
  live `:8014` endpoint and cross-checks the echoed `opponentParty`
  structurally against `getLevel50FactoryBrainFixedIv`/
  `getLevel50FactoryRentalRange` + the frontier-mons catalog (fixedIv, IV
  uniformity, species/item pool membership — the RNG cursor itself isn't lab-
  observable, so this proves pool/fixed-IV wiring, not byte-exact draws),
  plus a round-trip proof (a synthetic `generateFactoryBrainOpponent` party
  staged verbatim via `factoryBrain` + `overrides.parties`, echoed back
  byte-for-byte) proving design §3.4's composition claim empirically. Live
  result: **82/82 checks passed** (14 silver structural + 14 gold structural
  + 27 silver round-trip + 27 gold round-trip). All three rungs committed
  separately; `npm run typecheck` and `test:smoke` green between each.
- **Next:** rung 4's real blocker (see Notes) is the actual next work: give
  `getFactoryTrainerPresentation`/`factoryTrainerPresentationForOpponent`
  (`src/engine/factoryTrainerPresentation.ts`) a `TRAINER_FRONTIER_BRAIN`
  (1022) entry — sourced from `gTrainers[TRAINER_NOLAND]`'s pic/class/name
  per design §2.3, which is exactly the "Brain presentation seam" the
  program has been deferring — so `beginFactoryRoundBattleStartIntro` can
  construct a battle-start command for the Brain at all. Only once that
  exists can `tools/compare/appTrace.ts` gain a Brain-reveal `APP_STAGES`
  entry (extend `generatedRoundRevealProofStage`'s `targetBattleIndex` union
  to admit `6` — verified mechanically sufficient, see Notes) and a paired
  oracle-side `factoryBrain` + `preCheckpointCaptureAllFrames` scenario, then
  the actual reveal-cutscene frame alignment (this session did not attempt
  to reverse-engineer that offset — see Notes) can be probed for real.
- **Notes:** **rung 4 finding, proven not assumed:** `runOracleBattleLab`
  (`tools/compare/oracleClient.ts:123-162`) spreads `...scenario` verbatim
  into `/v1/battle-lab/run` with no mode-specific branching, so the oracle
  half of rung 4 already works for `factoryBrain` as the brief predicted —
  confirmed by code reading, not just assumption. The app half is
  structurally blocked, confirmed by direct reproduction: driving
  `generatedRoundRevealProofStage`'s real `advanceProofWin` loop (a proven,
  non-seed-gated dev-acceleration shortcut — it force-resolves each
  round-loop battle as a win via the public `resolveRoundBattle` API rather
  than simulating real battle content, so reaching battleIndex 6 needs no
  new proof that seed 70 "really" wins six straight) to battleIndex 6 and
  calling `beginFactoryRoundBattleStartIntro` throws `Error: missing Battle
  Frontier trainer 1022` from `getFactoryTrainerPresentation`
  (`src/engine/factoryTrainerPresentation.ts:78`): `TRAINERS` is generated
  from `battle-frontier-trainers.json`, the same 300-row (ids 0-299)
  `gFacilityTrainers` catalog design §1 documents Noland as structurally
  outside of. This is a **hard dependency**, not a cosmetic pixel gap —
  `factoryBattleStartPresentationForState` calls it unconditionally for
  every `battleStart` command, so no comparable app frame is reachable
  through the real orchestrator route at all, before any rendering happens.
  Implementing that lookup entry is itself the presentation seam the step
  brief places out of scope ("The Brain presentation seam implementation
  itself... this step only opens its ground-truth pipeline"), so this
  worker did not add a stub entry to force rung 4 through — the type-widening
  edit to `generatedRoundRevealProofStage` was written, mechanically
  verified sufficient to reach `battleIndex 6`'s Brain schedule (confirmed
  via a throwaway script before the presentation throw), then reverted
  rather than committing unreachable/unexercisable code. No fixture, no
  `APP_STAGES` entry, and no compare trace were authored for rung 4 as a
  result — landing something that can't run to completion would not be an
  honest mismatch inventory. Rungs 1-3 are the fully successful subset this
  step lands. Finish gate: full `npm test` **1,056 files / 9,934 passed / 1
  skipped** (~24 min wall under the same concurrent-worktree-lane pressure
  1254 flagged — not a regression); `npm run build` green (668 modules).
  Nothing outside `workspace/` touched; no oracle service restarted; no
  `unsupported-branch` barrier moved.

## 1256 — [solo session, 2026-08-14] **factoryBrain lab mode LIVE on :8014; CGB4 test tail measured at 430 s**

- **State:** the 1255 USER handoff (a) is done: the oracle harness accepts
  `mode: "factoryBrain"` (design §5.1 items 1-7 complete, commit
  `33354440`), so Brain presentation ground truth is now reachable through
  the lab. The refreshed battle-scene-off service on **:8014** advertises
  the mode; **:8012 still runs pre-change code** by design (the animation
  lane restarts it at its own orient, per its standard freshness flow).
- **Did:** harness-side `factoryBrain` — structural identity (always
  `TRAINER_FRONTIER_BRAIN`/final battle; no `trainerId`/`battleNum`/
  `opponentSetIds` fields), `challengeNum` restricted to `{2, 5}`,
  `overrides.parties` permitted / `overrides.battlers` rejected,
  `fixedIv` (15/31) + `opponentParty` (RAM read-back) echoed, Brain intro
  ack budget 32 (live-measured need 16 vs the ordinary 12). Contract tests
  **54/54**; new `oracle/battle-lab-brain-smoke-test.py` **32/32** live
  (silver + gold end-to-end: three ROM-generated mons at the Brain fixed
  IVs, no duplicate species/items, captured RAM party equal to the echo,
  all standing rejections intact); existing ordinary-mode smoke green on
  the new code. MEASURED, quiet host: the **44-file recursive CGB4
  evidence family alone runs 430 s wall / 5,643 s CPU** — it dominates the
  ~6-minute full suite (the older isolate:false fix stands; this family
  landed on top of it and grew quadratically with grind versions).
- **Next:** main lane: (a) workspace §5.2 consumers — update
  `tools/battle-lab/README.md`, teach `tools/compare/appTrace.ts` the
  `factoryBrain` trace shape, check in silver/gold lab fixtures, then
  drive Brain presentation ground truth through the new mode; (b) test-time
  papercut: with #55 parked, gate the 44 `factoryM4aNoteBodyCgb4V*` files
  behind an opt-in env flag keeping a light terminal digest pin in the
  default suite — expected to return ~7 minutes per full run; (c) rust
  supervisor: record that M7c waits on the TS live-generation port, not
  #55.
- **Notes:** oracle freshness gates now see a REAL `oracle/` change —
  restart-before-staging is genuinely required (only :8012 remains on the
  old code). No `workspace/src/**`, test, or lane-file change; the two
  worker lanes were idle throughout.

