# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1392 — [supervisor wind-down, 2026-08-23 ~02:15] **#118 CLOSED end to end (Rust `5b51eac5` → lockstep TS+wasm `0cb8aa26` → wire format `47a8db42`), #120 found by audit + fixed, #121 probed not-a-divergence, `oracle-strength` soak policy built and measured NEGATIVE; every gate green on the final tree; animation folded twice**

- **Final gates (supervisor-independent):** on `a5b06cfb` (engine-final):
  vanilla 0:20 **20/20**, full 0:60 **60/60**, winning 0:60 **60/60**,
  winning-swap 0:60 **60/60** (0 CRASH / 0 HANG each; the same four gates
  also ran 20/60/60/60 on `0cabb82b` before the soak-policy commits); full
  `npm test` **1,103 files / 10,381 passed / 223 skipped** + build green on
  `a5b06cfb`; after the second animation fold (`77f4db64`, Teeter Dance,
  Scene-ON renderer branch only) union **1,105 / 10,392 / 223** + build
  green, re-run vanilla 0:20 + winning 0:60 on that tree: vanilla **20/20**, winning **60/60**.
  Insurance: full 60:240 **180/180**, winning 60:240 **180/180** (so 0:240 =
  240/240 each on the engine-final tree). cargo **1,029/0**, wasm parity
  **484/484** none skipped; rebuilt wasm `f55b03fc…` (gitignored).
- **Did (9 worker rounds: 4 ts opus, 5 side — 2 read-only audits, 2 scouts,
  2 fixes, 1 probe; 0 failed steps, 0 cap-kills):** #118 via the user's
  two-commit ladder + one remainder (1388/1389/1390); post-land re-sweeps
  `--start-carry 42` 60/60, `49` 0:180 **180/180**, `winning-swap 49` 60/60
  (`docs/soak-start-carry-2026-08-22.md` §post-#118; deepest carry 56 =
  challengeNum 8 drafts real; former crash seeds 2/32/49 clean). Audit of
  the 1386 burn-down fixes → **#120** CONFIRMED (rentsCount paid once per
  completed challenge vs retail's per-swap-then-win; the existing test pinned
  the bug as correct) → fixed `664de9ee`/`64ad9f4e` with 5 pins; #121 filed →
  probed UNREACHABLE (`docs/issue121-ai-mon-to-switch-into-probe.md`), trimmed
  to a dormant coupled-pair note; audit of #118's TS-only halves → CLEAN +
  `healFactoryKernelParty` six-IV guard `0cabb82b`. Scout
  `docs/soak-policy-strength-scout-2026-08-23.md`: the wall is challengeNum 4
  ALONE (winning@35 wins 5/30, @28 0/30, 22/30 lost at b1); lever 2
  (`--policy oracle-strength`, the engine's own scorer for the player) built
  + measured **0/30** at carry 28 with 0 fallbacks (1391) → move choice is
  NOT the lever; party quality at draft is. PAPERCUTS: +4 entries, 1 bump.
- **Decisions recorded:** six real IVs everywhere `ivs` exists with
  `fixedIv === ivs.attack` (retail's scalar rebuild `SetPlayerAndOpponentParties`
  is resume-only — `battle_factory.inc:59`, PreBattleRoom `:202`). Correction
  to #118's text: the Brain's argument-8 call site is retail-correct but
  UNREACHABLE in play (Brain-eligible banked streaks 20/41/62/… ⇒ challengeNum
  2/5/8, never 6); the sweeps only ever exercised the rental path. Correction
  to the scout: `rentsCount` counts swap-then-wins, so `--start-carry`'s
  `rentsCount: 0` is faithful for `winning` (a `--start-rents` flag would be
  the honest shape for swap-accepting policies, not a formula).
- **Next:** (1) the only open ch-4 lever is a NEW coverage-first draft
  heuristic (the withheld bulk+STAB one lost; the scorer-for-player one lost)
  — measure-first via `--policy … --start-carry 28 --seeds 0:30` rounds won;
  (2) optional instruments from the scout §4 (per-seed round ledger, loss
  shape, rentsCount/rank) — ~40 lines in the driver; (3) the 0:120
  `oracle-strength` confirmation sweep was not run (no longer load-bearing).
  Open ISSUES: #121 (dormant note), #109/#114 (doubles-era), #71/#73/#39/#55
  (parked/filler). DEFERRED.md: none open.
- **Notes:** `check-oracle-freshness.sh` FAIL at orient = known timestamp
  false positive (no harness commit touched `oracle/`), both services kept.
  Two lessons filed in PAPERCUTS: a supervisor ISSUES commit mid-worker was
  clobbered by the worker's stale-snapshot rewrite (caught + restored by the
  worker `6daf244d`); the #120 side worker edited the main tree by absolute
  path (hit 5 — my side brief lacked the standing clause). `animation-main`
  delta at close: folded `3a8b58d7` (Spikes) + `77f4db64` (Teeter Dance);
  its supervisor was live all session. `rust-main` delta 0.

---

## 1391 — [main worker, 2026-08-23] **Scout lever 2 built and measured: `--policy oracle-strength` (the engine's own Factory AI scorer driving the PLAYER) wins 0/30 rounds at carry 28 — a clean NEGATIVE result that retires in-battle move choice as the challenge-4 lever**

- **State:** master `180a7e20` + this docs commit. `npm test` **1,103 files
  / 10,381 passed / 223 skipped** (this step adds 1 file / 4 tests; the rest
  of the delta over 1390's 1,099 / 10,360 came in with the side-lane merges
  under this tree), `npm run build` green, typecheck green. New opt-in soak policy only — `winning` /
  `winning-swap` / `full` / `vanilla` untouched (their pins all still pass);
  zero `src/engine` edits.
- **Did:** `--policy oracle-strength` = `winning` in every respect except the
  fight slot, which `chooseFactoryAiScoredDecision` picks for the player
  under mask 7. `buildOracleStrengthPlayerView` mirrors
  `createFactoryAiViewFromLiveRules` with the sides swapped + full knowledge
  of the opponent's moves/ability/item (instrument, not fairness); scorer runs
  on a cursor from the soak's own seeded RNG, so the battle RNG is untouched;
  no-legal-slot / non-move / barrier falls back to `pickWinningFightSlot` and
  counts (`SeedResult.oracleStrengthFallbacks`). 4 Tier-1 pins in
  `tests/randomRoundSoakOracleStrength.test.ts`.
- **Next:** the four-gate wind-down set, or the next supervisor step. Do NOT
  re-run levers 3/5 (retired by this measurement — see the scout doc's
  "Result"); the only lever left at ch4 is a NEW coverage-first draft
  heuristic.
- **Notes:** anchor smoke `0:20` **20/20 OK, 0 CRASH, 0 HANG** (carry>=7
  20/20, >=28 1/20). THE MEASUREMENT `--start-carry 28 --seeds 0:30`
  (3 parallel chunks): **30/30 OK, rounds won 0/30** vs the scout's
  predicted >=15/30 and the `winning` baseline's 0/30; loss table b1 **22**,
  b2 6, b3 1, b5 1 — statistically identical to `winning`@28. **Fallbacks
  summed to 0**, so the scorer really answered every decision. 0:120
  confirmation sweep NOT run (out of session time).

---

## 1390 — [main worker, 2026-08-22] **ISSUES #118 CLOSED: the wasm draft-selection wire format now carries a rental's six-IV spread, so an `ivs`-bearing instance round-trips intact**

- **State:** master `47a8db42` + this docs commit. `npm test` **1,099 files
  / 10,360 passed / 223 skipped** (was 10,359), `npm run build` green,
  cargo **79 blocks / 1,029 passed / 0 failed** (was 1,027), `fmt --check` +
  `clippy -- -D warnings` clean, typecheck green. `POKEBENCH_ENGINE=wasm`
  parity **4 files / 484 passed, none skipped** (rental 387, partyMember 89,
  draftSelection 5, swap 3); `npm run test:smoke` 444. Rebuilt wasm
  **511,638 B, sha256 `f55b03fc…`** (gitignored — every checkout still has
  to run `core-rs/build-wasm.sh`).
- **Did:** `selected-rental-party`'s rental record gained ONE additive
  trailing optional, `ivs_presence:u8,[ivs_packed:u32]` — the GBA's own
  `MON_DATA_IVS` word (`pokemon.c:3997-4004`), the same argument
  `fw_create_factory_party_member_with_ivs` takes — in one lockstep commit:
  `FactoryDraftRentalSource.ivs_packed` + decode/encode + the export's
  byte-layout doc comment, adapter `writeRental`/`readRental` with
  `packMonDataIvs` lifted into a shared `adapter/monDataIvs.ts` (plus a new
  `unpackMonDataIvs`), and the `build-wasm.sh` rebuild. factory-core needed
  nothing: `selected_rental_party` is generic over `T: Clone` and reads no
  field (verified). NOT a version bump — additive trailing field, and an old
  decoder can only under-read into the existing status-2 malformed message.
- **Next:** the four-gate wind-down set (`full`/`winning`/`winning-swap`/
  `vanilla`), or the next supervisor step; #120/#121 remain open for their
  lanes.
- **Notes:** absent stays absent on both sides, so every existing `toEqual`
  pin is byte-identical (both parity suites run unchanged first). New pins:
  2 factory-wasm boundary tests, a hand-spelled little-endian byte-for-byte
  record check, 4 parity cases (180 -> 184) and a 57th malformed packet; a
  PRESENT uniform spread is pinned distinct from an absent one.

---

---

