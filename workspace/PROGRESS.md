# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-14 — hie1 (ts lane worker): the held-item effect is presented in both scenes (ISSUES #220 step 1)

- **State:** on master, committed (`f05283ed0` labs / traces, `2610c0580` engine + re-pins, docs after). ENGINE_BUILD `eb-93fedef9241b4242` -> **`eb-e1bc81a090e2b568`** (read from dist-lib; battles with Leftovers / berries / Shell Bell run longer).
  Presentation only: eventsDigest identical on census seeds 0..199, both scenes (`.integration/evidence/hie1/census`, `censusDiff.mjs`); only `commands` / sound frames moved (sound ids / pans equal).
- **Did:** `battleResolutionPresentation.ts`: Scene ON a `general-animation` HELD_ITEM_EFFECT command at the kernel event (`HELD_ITEM_EFFECT_COMMAND_FRAMES` 214 + lead 15 for a script restart
  (Leftovers, Sitrus) / 9 for a continuation of the move script (Shell Bell, cure berries); skipped behind a Substitute doll; a cure berry's preceding 32-frame `status` command is netted out, +1);
  Scene OFF the Pausex20 as a `move-animation` hold before the print (kernel executions since the previous receipt + the same leads; after a status command, the lead only). Kernel, RNG, sprite-order / allocator pins untouched.
- **Measured** (ROM minus app at the print, `hie1-{leftovers,sitrus,shellbell,cheri}-{on,off}` labs, before -> after): OFF 51 / 50 / 45 / 9 -> 0 at all four sites; ON 237 / 229 / 223 / 203 -> +8 / 0 / +1 / 0
  (Leftovers keeps +8: unmodelled per-site lead, ISSUES #220). The lead spread is per path (restart 15 / continue 9), not constant. Pre-existing, left: Leftovers / Shell Bell post-heal tail ~+18 late (ISSUES #220).
- **Re-pins:** `tests/factoryRoundBattleOrchestrator.test.ts` (Shell Bell: one hold command shifts hp 11 -> 12); `tests/randomRoundSoak.test.ts` seed 21 frames 41_068 -> 41_099 / renderCalls 2_899 -> 2_907, vanilla seeds 0 / 1 frames 9_185 -> 9_212, 9_233 -> 9_271
  (all frames only), winning-carry test seed 16 -> 47 (seed 16 now carries 7; scanned 0..80: 47 / 50 / 61 / 70 chain two wins). New `tests/hie1HeldItemEffect.test.ts` (9). `ice-punch-grovyle-onix` unchanged.
- **Gates:** typecheck 0; test:smoke 448 / 448; test:gate 362 files / 2,843 tests (+ new file); build / build:lib 0; 166 importing files green after the re-pins; soak vanilla 0:20 default scene **20 / 20 OK** (`budget`).
- **Next:** #220 step 2 (renderer: rotation / stars / ring / tint on the battler) and step 3 (SEs 152 / 228 / 102); the Leftovers ON +8 and the ItemHealHP_Ret tail are the open timing residuals.

---

## 2026-11-14 — CAX31 daily run (supervisor, Opus 5.5): wind-down: last Mac fold, rare-rule hunt 50 / 110, General_* sounds, Lobby up to the draft

- **State:** master clean, no workers; worktrees removed (evidence copied to `.integration/evidence/` first, except rrh1-3 / aud248 / lbr-d2b
  scratch, lost with their worktrees before I caught it; their committed stages / docs / traces re-run). Branch **`lbr-f-residual2`** kept
  (unmerged, see Next). No push. **No DEFERRED items.** Oracles restarted at run start (both predated the harness's battle-lab fix).
  ENGINE_BUILD `eb-8faf63dbde5168d5` -> **`eb-93fedef9241b4242`** (dist-lib of the final engine; tell the website). Evidence
  `.integration/validation/sv-20261114/` (`gates/` = fold, `final/` = wind-down).
- **Website (Mac):** after a 7-win the mount keeps running in the Lobby (no `challenge-end` / `challenge-request` for a won round; the
  attendant continues the streak). An in-game new challenge now walks through the PreBattleRoom briefing before the draft, so its deal moved
  (toward the ROM). The rental draft refuses a second Pokemon of one species. More battle sounds play (stat changes, status conditions, weather,
  Focus Punch, Leech Seed, Castform). No API change.
- **Gameplay (replay, item 0d):** `mac/parity-mac` `165548c4b` (fixes 29 to 43) folded at run start: sandTomb sha re-pinned, typecheck 0, full
  suite 14,750 / 14,750. Nightly (pinned worktree): pool 40 + 4 Brain **44 / 44**, staged battles **32 / 32**. Wind-down permanent list
  **64 / 64** (1,148 states) on the final engine. Rare-rule hunt rrh1 / rrh2 / rrh3: **50 of 110** (c) rules covered by ROM-matched stages
  (`docs/parity-mac/stages/coverage/`, 50 files), R019 / R029 / R031 / R033 class (b), **no differences**; `docs/parity-mac/STATUS.md` box sections.
- **Folded:** iss216 (#216 / #217), lbr-d1 (7-win Lobby return), lbr-d2b (won traces), lbr-e (PreBattleRoom, 3 traces 255 / 255), lbr-f
  (won record prompt 1 tick earlier), aud248 (S11 scoreboard, `docs/aud248-s11-scoreboard.md`: **acceptance not met**; stat-change SE), aud249 /
  aud250 (General_* SEs; census 0..199 gameplay fields equal both scenes), cln279 (236 step-id scripts deleted). Filed #219 (sound gaps), #220
  (held-item effect animation not presented: ~214-235 frames short per Leftovers / berry segment in Scene ON; plan `docs/hie-scout.md`).
- **Gates (final engine `da0272fb4`; `010ef7abe` after it fixes 3 ratchets, src import-path only):** full suite 14,829 passed / 3 failed -> the 3
  (animation boundary, dif256 harness, iss215 tools; from this run's merges) fixed in `010ef7abe`, those files + touched 8 / 8; typecheck 0;
  build / build:lib 0; test:gate on `010ef7abe` 362 files / 2,843 tests. Soaks: vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default **60 / 60**, winning **60 / 60**, winning-swap **60 / 60** (all `budget`); varied-RNG first-round winning carry 0 / 14 / 28
  **100 / 100** each, winning-swap carry 0 **100 / 100**. play:random 10 min / scene `--lobby-new-challenge` on the final build (`010ef7abe`): ON 33 battles / 13 swaps / 11 new challenges from the Lobby, OFF 57 / 13 / 24; **0 page / console errors / overlays**.
- **Next:** #220 (held-item effect presentation + its SEs) is the biggest sound / timing gap; then the aud242 move-body lifetimes, cries in
  animation tasks, the second `Status_*` play (+14). Lobby: merge branch `lbr-f-residual2` (`f58db4171`: the fix + lbr-f2's re-pins, lbrd `WIN_TWO_SEED` 35 -> 2 (the only
  seed of 1-7 passing the full file: fragile), lbre same-timeline exact at cursor `0x4ea349da`; lb* + randomRoundSoak 129 / 129, attendant
  trace 1349 / 1416) after typecheck, test:gate, full suite and soaks; then NPC wander (`docs/lobby-wander-scout.md`). Cries in
  animation tasks: `docs/cry-task-scout.md`. Hunt: the remaining 56 rules need new team ideas (rrh3) — one step per run at most.
  Nightly replay from the pool at run start; no Mac fold (the branch no longer moves).

---

## 2026-11-14 — cln279 (ts lane worker): cleanup 1, second sweep: 236 unreferenced step-id scripts / fixtures deleted

- **State:** on master, committed (`dfb2ca8d1`); no src change, ENGINE_BUILD unchanged. One reversible commit: 236 files, 1,182,306 bytes under `tools/integration` and `tools/compare` (fixtures / json only a deleted probe read included).
  List `docs/archive/cln279-deleted.txt`; candidates + reasons `.integration/evidence/cln279/candidates.txt` (ignored). Recover: `git checkout dfb2ca8d1^ -- workspace/<path>`.
- **Method:** `tools/cleanup/keepClosure.ts` (cln237's closure; roots = every tracked non-md file outside the two dirs, incl. src / tests / package.json / configs / test-gate.list / other tools; comments stripped, `${template}` and name-fragment matches).
  Kept by doc despite the scan (now seeds): `soundCensusDelta.py`, `soundCensusExpected.ts` (handoff + aud243a T1 recipe), `pmf240CardProof.ts` (handoff). tools/audio, replay-hunt, parity-mac, oracle and `tools/compare/evidence` untouched.
- **Gates:** typecheck 0; test:gate 362 files / 2,843 tests; full suite as 8 foreground `--shard=i/8` runs at 3 workers: 14,773 tests passed / 44 skipped files / **1 failed**: `tests/compareTraceAppRoute.test.ts`
  (`iss216-same-species-off.json` lacks `appRoute`; added by `ae5db0299`, not touched here); build 0.
- **Next:** set `appRoute` on that one trace (or allowlist it). Notes: one foreground `npm test` exceeds the 10-min cap; shards of 3-7 min each work.

---
