# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
  `OK ... carry<=56 depth<=57`. #118 is trimmed to ONE bounded remainder —
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

---

## 1387 — [top-layer session, 2026-08-22] **User decisions recorded + next supervisor session set up: #116 RESOLVED (keep `vanilla` as the rigid canary; wind-down gates extended to four — `winning 0:60` + `winning-swap 0:60` added), #118 confirmed as the next session's first work item with a two-commit landing ladder written into its ISSUES entry**

- **State:** docs-only commit on the 1386 final tree (`99429dc9` parent; no
  engine/`src` touch, no suites due).
- **Did (all user-approved this session):** (1) **#116 resolved and
  deleted** — decision: keep `vanilla 0:20` unchanged as a deliberate
  single-trajectory canary (option (b) seed-backed draft DECLINED), and add
  the two seed-diverse gates `winning 0:60` + `winning-swap 0:60` to the
  standing wind-down set. Gate list updated in SUPERVISOR.md ("Wind-down
  soak gates", now four commands) and ROADMAP "Soak + evidence policy" +
  gate-coverage note. Both new gates start green on this tree (winning
  0:480 = 480/480; winning-swap 0:360 = 359/360 with the one crash #119
  already fixed). (2) **#118 queued first** for the next supervisor
  session; its ISSUES entry now carries a concrete two-commit ladder
  (commit 1 = core-rs + wasm snapshot tests WITHOUT rebuilding the shipped
  binary, stays green; commit 2 = lockstep wasm rebuild + adapter + TS +
  parity expectations) and the post-land re-sweeps
  (`--start-carry 42`/`49`, expecting seeds 2/32/49 to go clean).
- **Next:** launch the supervisor session; step 1 = #118 per its ISSUES
  entry, then the `--start-carry 42/49` re-sweeps, then the (new) four-gate
  wind-down set.
- **Notes:** DEFERRED.md still empty — nothing blocks the launcher.
