# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1032 — [supervisor ORIENT, 2026-08-08] **Folded union green; user playthrough crash is first priority**

- **State:** master is clean at `a45826c8`; Gate 6 remains **OPEN** at
  **21/24** OFF-profile receipts. New ISSUES #84 records five generated-round
  presentation/controller failures, including a fatal resolution-handoff
  invariant during BUTTERFREE versus MURKROW.
- **Did:** read the S8 authoritative reset and S10 executable-frontier policy;
  confirmed `master..animation-main` is empty, so no animation fold was needed.
  Oracle freshness and OFF-profile info pass. The independent folded baseline
  passes **811 files / 8,137 tests / 1 skipped** and production build.
- **Next:** diagnose and repair #84's fatal handoff with a staged generic-round
  reproduction and a red Tier-1 pin. Then address the wrong send-out side,
  TAUNT/TORMENT/TOXIC pacing, and WHIRLWIND replacement seam. Resume R3, R9,
  and R2 receipts after the user-visible blockers.
- **Notes:** do not resume the retired canonical Battle-2 march. Use the generic
  seven-battle controller and Battle Scene OFF presentation seam.

## 1031 — [supervisor WIND-DOWN, 2026-08-08] **Gate-6 receipts advanced to 21/24; union green**

- **State:** the final animation fold is on master at `3cf40fe2`; Gate 6 remains **OPEN** with
  **21/24** Battle Scene OFF receipts, **3** explicit gaps, and **R3** next.
  The widened executable triage remains **0 A / 0 B / 22 C / 24 D**.
- **Did:** accepted two-seed deterministic R12b White Herb, R11 Baton Pass,
  R6 Natural Cure, and R15 three-layer Spikes receipts. R15 proves real
  Flying/Levitate immunity plus grounded Rhydon `187→141 = floor(187/4)` in
  source HP-update/message order. Repaired generic `Cmd_removeitem` party-slot
  persistence for both sides while preserving Recycle/Knock Off ownership.
- **Next:** receipt R3's legal Cloud Nine removal/reactivation sequence, then
  R9 and R2; keep the seven-battle controller/presentation seam generic and do
  not resume the retired canonical Battle-2 march.
- **Notes:** the pre-fold master union is green at **807 files / 8,119 passed /
  1 skipped**; the folded Thunder/Glare branch was independently green and the
  post-fold production build plus OFF-profile oracle info pass. The first run
  hit six Vitest collection timeouts under concurrent full-suite memory
  pressure (801 files / 6,984 tests passed); all six reran **1,135/1,135**
  before the clean full rerun. At orientation `master..animation-main` was
  empty; after its separate supervisor exited cleanly, `0dffb48b` was folded.
  A post-fold full rerun was stopped at wind-down when a new independent
  supervisor began a competing full suite; no assertion failure was observed.

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
