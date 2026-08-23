# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 1386 — [supervisor wind-down, 2026-08-22 17:10] **Post-M-B crash burn-down: 14 worker rounds, queue to zero; final engine sweeps `full` 0:480 + `winning` 0:480 + `vanilla` 0:240 all clean; two new opt-in soak instruments (`winning-swap`, `--start-carry`) opened the swap screen and challenge 5-8 tiers to soak — #119 (swapped-party forced switch) fixed same session (`d41bc58c`), #118 remainder is a TS+Rust coupled port; animation + rust lanes folded**

- **Final gates (supervisor-independent, final tree `2dc691ae` + this docs commit):** full `npm test`
  **1,099 files / 10,242 passed / 223 skipped**; `npm run build` green; rust fold: cargo 79/79 result blocks (1,020 tests, exit 0; a first pass's exit code was the pipe's, re-run properly), wasm rebuilt
  (`build-wasm.sh`, 505,163 B, sha 6c59da9e…), `POKEBENCH_ENGINE=wasm` parity 18 files **803/803**; animation
  fold `b2e453c4` (+2, Hail exact, coverage 201/276); soak gates on the final
  tree: vanilla 0:20 **20/20 OK**, full 0:60 **60/60 OK** (+ winning-swap 0:20 20/20). Session-scale sweeps
  (`docs/soak-final-tree-sweeps-2026-08-22.md`): full 0:480 **480/480**,
  winning 0:480 **480/480** (carry ≥ 28 18/480 = 3.75%), vanilla 0:240
  240/240, winning-swap 0:360 359/360 (#119), --start-carry 28/35/42 sweeps
  157/160 (3 × #118).
- **Closed this session (each red-verified pin + supervisor re-run):** #102
  (both halves: PARTY_SIZE switch-in fallback `5cc52595`; Future Sight/Perish
  Song cursor `a6deb814` — new shared fields `wishPerishSongState/BattlerId`),
  #104 (YES-branch message, trace 133/133), #106/#107/#108 (string-resolver
  class closed by census), #110, #111 (rentsCount reset on loss), #112
  (forced send-out display resume), #113 (`Cmd_getexp` writes
  `gBattlerFainted`), #115 (post-switch names), #117 (record-cursor tick).
  Filed: #109, #114 (doubles-era), #116 (`vanilla` is one trajectory — gate
  semantics are the user's call), #118 (retail `sFixedIVTable[8]` = {110,0}
  pinned from ROM; port blocked on the wasm parity coupling — needs a
  coordinated TS + Rust step, see the entry), #119 was found by the new `winning-swap` instrument (seed 130) and CLOSED the same hour (`d41bc58c`: `BattleScript_HandleFaintedMon` may ask the player twice in one script run — replacement faints to its own side's Spikes, `battle_scripts_1.s:3427-3431`; pin `tests/forcedSwitchSecondChoiceIssue119.test.ts`).
- **Findings:** the carry-28 ceiling is the challenge-5 AI tier, not an
  instrument cap (4M-frame probe; but from a carry-42 boot `winning` DOES win
  rounds — the wall is the challenge-4/5 rental-vs-opponent matchup, worth a
  look when policy strength matters again); first-round win rates are
  anchor-biased; draft-by-strength heuristic WITHHELD for good (n=180, ≥ 21
  40 vs 7; `wip/mb-step2b-draft-heuristic` @ `1f500a92` is the record).
- **Next session:** (1) #118 port as ONE coupled step
  (TS rental/opponent/brain IV readers + `CreateBoxMon` two-draw random IVs
  + Rust clamp/draws + `factory-wasm` ledger layout + `build-wasm.sh`) —
  brief it with the rust supervisor or as a rust-lane worker from this
  lane's side worktree; then re-run `--start-carry 42/49`; (2) #116 awaits
  the user; (3) the `vanilla`/`full` standing gates are unchanged in
  meaning — consider adding `winning 0:60` and `winning-swap 0:60` to the
  wind-down gate list (they are the only seed-diverse deep coverage).
- **Notes:** 14 worker rounds (9 ts + 5 side; 3 Opus diagnostics), 2
  cap-kills salvaged by the supervisor (#111 part B, #115), 1 stale-premise
  brief (#71 Slice C was already done — grep the archive for the slice name
  first), 0 regressions folded. `check-oracle-freshness.sh` FAIL judged
  client-only (PAPERCUTS hit 8). Both sibling supervisors were live all
  session; `animation-main`/`rust-main` delta at close: 0 / 0 (both folded: `b2e453c4` animation +2 Hail exact; `2945bc78` rust +6 core-rs leaves).
  DEFERRED.md: none open. **Addendum 17:40:** two more discovery sweeps on
  the final tree — `winning --start-carry 28` 60:150 **90/90 OK** (90 more
  challenge-5 boots), `winning-swap` 360:520 **160/160 OK** — no new signature.

---

