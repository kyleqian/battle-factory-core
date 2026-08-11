# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1099 — [MAIN worker, 2026-08-10] **#55 `GetSubstruct` `%24` composition is exact and bounded**

- **State:** implementation `d7820e25`; #55 remains open, accessor/stats
  totals stay `null`, and the construction clock is unwired. The Scene-OFF v2
  packets remain at `631bd214…`, `ae1282b7…`, and `3e10197a…`.
- **Did:** independently pinned the full 192-byte `__umodsi3` ELF symbol,
  GetSubstruct call/resume/three helper exits, all **24×4** routes, and the
  exact source order `[0,1,2,3,0,1,2,3]` in GetBoxMonData2/checksum. The
  narrow source-general `%24` reducer now makes each GetSubstruct complete;
  the census exposes its eight-call subtotal plus the **1,174** shared fetch
  cycles (e.g. `0xffffffff`: **6,824 / 7,998**), never an accessor total.
- **Next:** reduce only independently proven EWRAM word/halfword accesses,
  field tails, async +18, and VBlank/IRQ boundaries. Do not fit residuals,
  wire aggregate stats/the clock, or resume canonical Battle 2.
- **Notes:** all **156** OFF nested stats-accessor boundaries exceed the known
  source-only subtotal after recorded pauses, with their positive remainder
  left external. Focused **23/23**, smoke **375/375**, typecheck, full
  `npm test` **892 files / 8,478 passed / 1 skipped**, and build passed; no
  fixture/recording import, barrier, m4a, presentation, or clock change.

## 1098 — [MAIN worker, 2026-08-10] **#55 encrypted accessor instruction/fetch slice landed**

- **State:** commit `eb4ab2c8`; #55 remains open and the construction clock is
  unwired. Scene-OFF v2 receipts remain byte-identical at
  `631bd21408ba41e03c0e119dde3d83d94dda023cee93ebc3e470e6d94741cc2a`,
  `ae1282b74f74de6a85b8772adfbcd83028fad09f8aa3e3ecd518aafeab17b443`, and
  `3e10197a34f4ea7a08a23bead04ae5b6113c653304722167095612a9b0626987`.
- **Did:** reduced all **96** compiled `(personality % 24, substructType)`
  arms: 68-cycle fixed shell, **5,172** total arm instruction/refill cycles.
  Reduced shared decrypt/encrypt to **328** instruction-fetch cycles each
  (128 halfwords/12 refills) and checksum to **518** (199/20), with exact
  access counts **36/24** word reads/writes and **24** halfword reads. Each
  census row carries the **1,174**-cycle crypt/checksum/crypt instruction
  subtotal; complete `cycles` stays `null`.
- **Next:** close only the `%24` helper composition and source-general EWRAM/
  async timing boundary. Do not wire aggregate stats or the construction
  clock, fit residuals, or add canonical Battle-2 windows.
- **Notes:** receipt construction/ambient totals are **242/52/294**,
  **112/31/143**, **202/30/232**. +18 service and VBlank/IRQ pauses remain
  external. Focused **21/21**, smoke **375/375**, full `npm test` **892 files /
  8,476 passed / 1 skipped**, typecheck, and build passed; no fixture,
  recording import, barrier, or clock change.

## 1097 — [solo session, 2026-08-10] **User priority decisions recorded: #55 grind authorized; #71 stays faithful; S11 out of scope for now**

- **State:** docs-only commit; no engine, test, or fixture change. Full
  decision text lives in ROADMAP's S10 block ("User decisions 2026-08-10")
  plus dated notes on ISSUES #55/#71 and the S11 stage heading.
- **Did:** relayed the S10-close report to the user and took five decisions:
  (1) **#55 construction clock: grind it out** — user-authorized to
  completion, opinion check-in expected after a few more sessions;
  (2) **#71: no intro-animation divergence** — user was offered a
  browser-only divergence and chose faithful Scene-OFF behavior (no intros),
  so #71's remainder is internal cleanup at filler priority;
  (3) **#39 stays deferred** until the above are done; (4) **pacing polish
  is user-driven** — the user plays on their own time, recorder traces are
  the input, no pacing slices until traces exist; (5) **S11 audio out of
  scope for now** — entry kept in the roadmap, nothing schedules it;
  (6) **Noland back IN scope** (same-day follow-up) — source fact-check
  showed he is NOT an invariant (`FillFactoryBrainParty` RNG-draws his
  rentals live, excludes the player's rentalMons, `challengeNum + 2` IVs),
  so deep-sequence testing under #55 reaches him at battles 21/42; rides
  with the #55 program; Gate-2 tick not reopened
  (`docs/gate2-noland-scope-note.md` addendum).
- **Next:** main lane continues #55 per its own bounded Next lines. Fold
  `animation-main` at the next orient (it was 30 commits ahead at entry
  1096's 16:04 check). When user play traces arrive, they become the
  pacing-fix worklist.
- **Notes:** the #71 decision followed a fact-check the user requested:
  both sides DO animate in the real game, but only under Battle Scene ON;
  the OFF profile's no-intro behavior is proven faithful (ISSUES #71
  Slice-D record). Difficulty-tier question also answered from source:
  challenge scaling is deterministic (`factoryOpponentGeneration.ts:263`,
  `challengeNum = floor(streak/7)`) and independent of #55's timing model.
