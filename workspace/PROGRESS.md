# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 1388 — [main worker, 2026-08-22] **ISSUES #118 commit 1/2 landed: the retail `sFixedIVTable[8]` overread + `CreateBoxMon`'s two random-IV draws are ported in core-rs; TS untouched and still green**

- **State:** master `5b51eac5` + this docs commit. `npm test` **10,242
  passed / 1,099 files**, build green, **zero TS edits**
  (`factoryRentalParity.test.ts` 290/290 as committed); cargo **1,027
  passed / 0 failed** (was 1,020), `fmt --check` + `clippy -- -D warnings`
  clean.
- **Did (core-rs only; no `artifacts/` rebuild — commit 2 owns that):**
  ninth (overread) `FIXED_IVS` row; `get_level50_initial_rental_fixed_iv`
  total under retail's strictly-greater clamp (arg 8 -> 110, 9+ -> 31);
  `Phase::RandomIvs = 2` / `Purpose::RandomIvsLow|High = 3|4` + the two
  ledgered draws per random-IV rental; `RentalRecord.ivs` with `fixed_iv ==
  ivs[1]` (the ATK IV, `battle_factory_screen.c:1824`); `GenerationError`
  deleted; `create_factory_corpus_party_member_with_ivs`; wasm record 23 ->
  **29 bytes** (`ivs` at 23, `ledger_count` 192, ledger 196) + the additive
  `fw_create_factory_party_member_with_ivs`. +7 tests, two hand-derived.
- **Next:** ISSUES #118 **commit 2** per that entry's explicit contract:
  `build-wasm.sh` + adapter + all TS + parity flip in ONE commit, then the
  `--start-carry 42/49` re-sweeps.
- **Notes:** `clippy --all-targets` fails at HEAD on a pre-existing `op_ref`
  in a generated vectors test — untouched. `RUST_PROGRESS.md` not edited.
