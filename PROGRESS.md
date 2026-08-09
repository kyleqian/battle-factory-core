# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1027 — [bounded MAIN worker, 2026-08-08] **S10 B1 Enigma Berry accuracy barrier retired**

- **State:** the B1 implementation is green through the focused Tier-1 set and
  executable-frontier ratchet (**379/379 tests**); the former hit-chain barrier
  call site is gone and its pin is **11→10**.
- **Did:** added immutable/defaulted/validated/serialized
  `enigmaBerryHoldEffectParams` ownership beside the existing Enigma effect
  bytes; resolvers now follow the source Enigma-vs-`gItems` branch; the live
  accuracy path passes both effect and parameter to the existing calculator.
  Red-first tests pin context shape, malformed arrays, normal Focus Band
  parameter behavior, Enigma ownership, and exact-RNG hit/miss outcomes.
- **Next:** run smoke, typecheck, build, and the full `npm test`; then commit
  the final green checkpoint and leave this entry current.
- **Notes:** no oracle claim (the custom Enigma storage is not injectable by
  mechanicLab); no ROADMAP/ISSUES or canonical Battle-2 work.

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

## 1025 — [user DECISION, 2026-08-08] **S10 closure is the headline: barrier burn-down, then Gate-6 manifest; #39 and animation demoted to filler**

- **State:** master clean through `12be3c44`; docs-only entry, no code change.
- **Did:** the user reviewed the week since Gate 5 closed and re-pointed the
  queue at finishing S10. The recorded ordering decision is in ROADMAP.md
  (S10 section, 2026-08-08).
- **Next:** (1) burn down the ten remaining bucket-A barriers in
  `docs/barrier-reachability-triage.md` (A3–A12; A1/A2 retired 2026-08-08);
  (2) resolve the single bucket-B widened-scope item and confirm the C/D
  citations as the prove-unreachable record; (3) assemble the Gate-6
  close-out artifacts (coverage manifest, one parameterized-oracle trace per
  effect family, interaction tests, seeded end-to-end rounds) with Gate-4
  semantic verification on the same worklist, plus Gate 2's Noland scope
  note.
- **Notes:** this OVERRIDES entry 1024's named next owner — the
  `turn10OnixDarkPalette` Family-F slice is deferred, not canceled, and the
  ISSUES #39 audit stays valid for whenever a filler slot opens. The
  animation lane keeps its separate supervisor but is likewise filler
  relative to S10 closure.
