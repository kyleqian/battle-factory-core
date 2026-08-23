# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 1385 — [main worker, 2026-08-22] **ISSUES #118 half-landed: `sFixedIVTable`'s retail one-past-the-end row is now pinned ROM data (`{110, 0}`); the engine port itself is blocked on a core-rs/factory-wasm lockstep change and is NOT in**

- **State:** master `9aaf1997` + this docs commit. `npm test` 1093/1140
  files, 10232/10458 passed (3 animation source-staging fixtures re-pinned
  to the new policy-JSON sha256), build green, smoke 444/444, frontier
  ratchet unchanged (no pin moved).
- **Did:** `nm pokeemerald.elf` -> `08612184 r sFixedIVTable`,
  `08612194 r sInitialRentalMonRanges`; ROM bytes at 0x612184 are the known
  16-byte table followed by `6e 00` = little-endian FRONTIER_MON_GRIMER.
  `GetFactoryMonFixedIV`'s non-BUGFIX bound check is STRICTLY `>`, so IV
  argument 8 reads that pair: row 8 = `{regular: 110, lastBattle: 0}`. The
  extractor now emits it as a ninth `fixedIvs` row flagged `retailOverread`;
  `tests/factoryFixedIvTableRomBytes.test.ts` (new, 4 pins) reads the 18 ROM
  bytes back. The three engine readers are bounded to the 8 *declared* rows,
  so the commit is behaviour-neutral.
- **Next:** land the port — the rewritten **ISSUES #118** now carries the
  full resolved semantics (clamp, three reachable call sites, CreateBoxMon's
  two-`Random()` split, `RentalMon.ivs` == ATK IV) plus the exact
  core-rs/factory-wasm surface that must move with it. The TS-only version
  was written and reverted this session: it turns 64 of
  `factoryRentalParity.test.ts`'s 288 configs red, because both engines
  currently agree *by throwing* at IV argument 8.
- **Notes:** step 3's `--start-carry` sweeps were NOT run (cap). No
  `unsupported-branch` pin moved. `PAPERCUT:` none.

## 1384 — [main worker, 2026-08-22] **new opt-in `--start-carry` soak option boots the first chained round at a carried win streak — 0:160 across 3 sweeps, ISSUES #118 filed (challengeNum 8 draft-generation throw, real 2-round-win-from-42 state)**

- **State:** master `f04c6227` + this docs commit. `npm test` 1095/1139
  files, 10231/10454 passed, build green, smoke 444/444, ratchet unchanged
  (no `src/` touch — the carry is injected entirely from already-public
  `src/engine` exports via the existing `stateFactory` seam).
- **Did:** `createStartCarryState(N)` (`tools/soak/randomRoundSoakDriver.ts`)
  drives `generateFactoryChallengeDraft` from the anchor RNG cursor with a
  synthetic carry `{factoryWinStreak: N, rentsCount: 0, battlePoints: 0,
  factorySymbolsCount: <21⇒1, 42⇒2>, playerTrainerId: anchor}` — the same
  chaining entry a real round-win handoff uses. `--start-carry 0`/omitted ==
  `createInitialState()` verbatim (stashed before/after `winning` 0:10 byte-
  identical). 4 new pins (carry 28 boot ⇒ challengeNum 4; carry 42 boot ⇒
  its OWN 7th battle is NOT the brain — gold was already earned crossing 41
  inside the round that carries 35→42, confirmed via
  `getFactoryFrontierBrainStatus`; invalid values rejected; carry 0
  identity). Sweeps (8×20-seed chunks, parallel `&`+`wait`, 16 cores):
  (a) `winning --start-carry 28` 0:60 **60/60 OK**, every seed caps at
  carry 28 (matches the goal's premise at n=60); (b) `winning --start-carry
  42` 0:60 **57/60 OK, 3 CRASH** (seeds 2/32/49, all the same signature —
  `generateInitialFactoryRentals`'s `challengeNum > 7` guard, reached when
  two round-wins from a 42 boot hit carry 56); (c) `winning-swap
  --start-carry 35` 0:40 **40/40 OK**. Filed **ISSUES #118** (needs the
  retail non-BUGFIX out-of-range table behavior, not just a raised guard).
  `docs/soak-start-carry-2026-08-22.md` has every log + repro.
- **Next:** #118 unfixed (main-lane engine change, out of this step's
  scope) — pick up with the `battle_tower.c` non-BUGFIX `#else` lookup.
  `--start-carry 7/14/21` (the mid tiers) unswept.
- **Notes:** no new papercuts.

---
