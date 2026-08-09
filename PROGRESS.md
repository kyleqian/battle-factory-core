# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1028 — [bounded MAIN worker, 2026-08-08] **S10 Gate-6 deterministic coverage manifest assembled**

- **State:** the first authoritative, reproducible Gate-6 manifest is committed
  in `bbb1774b`; Gate 6 remains **OPEN**. It joins **214/214 effects** and
  **355/355 moves** static-executable (L50: **276/300 executable**, 24
  roster-only), **55 state families / 50 Tier-1-covered**, **78 abilities** and
  **67 held effects**, **300 ordinary trainers / 850 L50 sets** (882 full
  catalog), **28 interaction rows** (6 kernel-proven, 9 oracle-receipted, 13
  gaps), and **24 parameterized scenarios** (17 receipt-documented, 7 gaps
  across 16 family cards).
- **Did:** added `tools/report/gate6-coverage-manifest.ts`, generated the JSON
  and Markdown evidence views, and added a Tier-1 byte-idempotence/count/path
  ratchet. Widened-scope legal zero-Factory-carrier rows remain explicit: 4
  abilities and 24 held effects. Static/token references are not promoted to
  semantic or oracle acceptance. Merged the side audit as `a7aad52b`: the live
  source inventory is **46 = 0 A / 2 B / 21 C / 23 D**.
- **Next:** retire the two widened-scope B families (`Cmd_various` Teleport,
  then `Cmd_printfromtable` table pointers), then close the ranked **R12b**
  parameterized-oracle receipt gap; do not claim Gate 6 closed.
- **Notes:** focused manifest/census checks **17/17**, smoke **375/375**, full
  suite **807 files / 8,073 passed / 1 skipped**, typecheck, and build green.

## 1027 — [bounded MAIN worker, 2026-08-08] **S10 B1 Enigma Berry accuracy barrier retired**

- **State:** the B1 implementation is committed in `2560e40a` + `d92248bb`;
  the former hit-chain barrier call site is gone and its pin is **11→10**.
- **Did:** added immutable/defaulted/validated/serialized
  `enigmaBerryHoldEffectParams` ownership beside the existing Enigma effect
  bytes; resolvers now follow the source Enigma-vs-`gItems` branch; the live
  accuracy path passes both effect and parameter to the existing calculator.
  Red-first tests pin context shape, malformed arrays, normal Focus Band
  parameter behavior, Enigma ownership, and exact-RNG hit/miss outcomes.
- **Next:** superseded by entry 1028's audited two-family B queue.
- **Notes:** focused Tier-1/ratchet **379/379**, smoke **375/375**, typecheck,
  build, and the later union full suite are green. No oracle claim (the custom
  Enigma storage is not injectable by mechanicLab); no canonical Battle-2 work.

## 1026 — [supervisor, 2026-08-08] **A3 Focus Band OHKO continuation proved end to end**

- **State:** master is clean through `50a89bf7`. The inherited runtime fix
  `c808ddfe` already retired `battleScriptTryKOOpcode.ts`'s barrier **1→0**;
  this step closed its missing full-script acceptance proof.
- **Did:** successful and failed Focus Band rolls now run the complete OHKO
  script in Tier 1. The success path leaves 1 HP, prints
  `STRINGID_PKMNHUNGONWITHX`, and returns; failure prints
  `STRINGID_ONEHITKO`. Both exact RNG ledgers are pinned.
- **Next:** retire A5 (`Cmd_various` / Pursuit) or the smaller independent A7
  (`Cmd_getexp BS_FAINTED`), then continue the reachable-barrier worklist.
- **Notes:** worker full suite **806 files / 8,067 passed / 1 skipped**,
  typecheck, and build passed. Supervisor reran focused **28/28** and smoke
  **375/375**. Both oracle services were restarted and pass freshness. The
  animation fold check was empty (`master..animation-main` = 0). No deferred
  decision and no canonical Battle-2 window.
