# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 1389 — [main worker, 2026-08-22] **ISSUES #118 commit 2/2 landed: the `sFixedIVTable[8]` overread is now ported end to end — TS + adapter + rebuilt wasm in lockstep; the challenge-8 crash repro goes clean**

- **State:** master `0cb8aa26` + this docs commit. `npm test` **1,099 files
  / 10,359 passed / 223 skipped** (was 10,242), `npm run build` green,
  `POKEBENCH_ENGINE=wasm` parity **6 files / 559 passed, none skipped**
  (factoryRentalParity 387, factoryPartyMember 89, draftSelection 4, swap 3,
  trainerSchedule 3, rngEngine 73), cargo **79 blocks / 1,027 passed / 0
  failed** (no Rust edits this session). Rebuilt wasm **511,425 B, sha256
  `08723925…`** — gitignored, so every checkout must run
  `core-rs/build-wasm.sh`; without it `npm test` just skips the wasm suites
  via their `skipIf(!wasmAvailable)`.
- **Did:** adapter record stride 23 -> 29 with `ivs` at +23, phase-2 /
  purpose-3-4 ledger decode, `fw_create_factory_party_member_with_ivs`
  routing; `FactoryCorpusPartyInstance.ivs?` with the `fixedIv ===
  ivs.attack` rule enforced; the `challengeNum > 7` throw removed and
  retail's own clamp (argument 8 -> 110, **9+ -> row 7**, decision D-b)
  landed in the rental, Brain and opponent readers; the two ledgered
  `CreateBoxMon` IV draws in all three generators. Parity Part A lost its
  error branch and gained streak 56 (288 -> 384 configs); Part B flipped
  from both-throw to full-result parity plus the Rust-side cross-check
  receipt; hand-derived six-IV pins added in three suites.
- **Next:** the supervisor's `--start-carry 42`/`49` 0:60 re-sweeps, then
  the four-gate wind-down set.
- **Notes:** repro `--policy winning --start-carry 42 --seed 2` now prints
  `OK ... carry<=56 depth<=57`, and `--start-carry 49 --seeds 0:20` is
  **20/20 OK, 0 CRASH** (deepest carry 56, i.e. challengeNum 8 generated
  for real). #118 is trimmed to ONE bounded remainder —
  the wasm draft-selection wire format drops a rental's `ivs` (test-only
  boundary today; production uses the TS `selectedRentalParty`).
