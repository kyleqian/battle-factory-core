# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 1383 — [main worker, 2026-08-22] **new opt-in `winning-swap` soak policy exercises the Factory swap screen at real carried-streak depth for the first time — 0:120 sweep clean, 0 CRASH/HANG**

- **State:** master `7f89b708` + this docs commit. `npm test` 1095/10227
  passed, build green, smoke 444/444, ratchet unchanged (no `src/` touch).
- **Did:** `winning-swap`: identical to `winning` except it accepts every
  swap offer then scores rentals/opponent mons and swaps the worst rental
  for the best outscoring opponent mon. `winning` 0:10 byte-identical
  before/after; 5 new pins. Sweep (6×20 chunks, not 4×30 — 30-seed chunks
  exceed this tool's 600s/call cap): **120/120 OK, 0 CRASH, 0 HANG**, carry
  ≥ 28 in 5/120 — `docs/soak-winning-swap-0-120-2026-08-22.md`. Fixed 2
  stale doc comments claiming the withheld `pickWinningDraftPicks` (1380)
  was merged.
- **Next:** no crashes found, no ISSUES entries needed.
- **Notes:** no new papercuts.

---

