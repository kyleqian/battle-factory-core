# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1030 — [bounded MAIN worker, 2026-08-08] **R12b persistent item write-through repaired**

- **State:** generic `Cmd_removeitem` persistence repair is committed in
  `4e252485`; Gate 6 remains **OPEN**.
- **Did:** reproduced R12b red (`battle item 0`, player party item `180`), then
  ported the source controller write-through by battler side + `partyIndex`.
  Tier 1 pins the R12b White Herb result, both active-party owners, untouched
  bench identities, and a non-White-Herb removal. Recycle/Knock Off ownership
  and `usedHeldItems` behavior remain intact; no shared interface widened.
- **Next:** hand the green checkpoint to the supervisor. No oracle or
  canonical Battle-2 work.
- **Notes:** focused item/move-end/controller suites are **244/244**;
  executable ratchet **6/6** and smoke **375/375**. Typecheck and production
  build are green; final full `npm test` returned exit code **0**. No
  unsupported-barrier pin changed.

## 1029 — [bounded MAIN worker, 2026-08-08] **S10 printfromtable source inventory complete**

- **State:** the widened `Cmd_printfromtable` family is source-complete for
  the committed program in `4e31a1cf` + `e1d041eb`; triage is now **0 A / 0 B
  / 22 C / 24 D**.
- **Did:** registered exact source rows for `gWeatherStartsStringIds` (16),
  `gNoEscapeStringIds` (5), and `gBattlePalaceFlavorTextTable` (4); Tier 1
  pins every row, the weather continuation, and all **43/43** current pointer
  symbols. The generic pointer guard remains a future-input D guard at the
  existing module pin of 10. Census regenerated; no Gate-6 closure claim.
- **Next:** hand the green commits to the supervisor for the S10 union. No
  oracle or canonical Battle-2 work.
- **Notes:** focused hit-chain + executable-ratchet checks are **379/379**;
  smoke is **375/375**. The source insertion also refreshed the moved ability
  census pin (`1184→1229`) and its regeneration ratchet is green.
  Typecheck and production build are green; final full `npm test` returned
  exit code **0**.

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
