# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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
  external. Focused **21/21**, smoke **375/375**, typecheck, full `npm test`,
  and build passed; no fixture, recording import, barrier, or clock change.

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

## 1096 — [MAIN worker, 2026-08-10] **#55 shared encrypted accessor dependency bounded**

- **State:** evidence `d53eb54b`, independent audit hardening `2594377b`, and
  supervisor handoff `e8bf2f6b`; final union focused stats **19/19**, smoke
  **375/375**, typecheck, full `npm test` **881 files / 8,438 passed / 1
  skipped**, and production build are green. #55 remains open, accessor totals
  are `null`, and the clock is unwired.
- **Did:** bounded all **180** encrypted reads (**156** direct + **24** nested):
  species/EXP/EV/IV **24/12/72/72**. Tests enumerate all **24** personality
  permutations, checksum/bad-egg routes, exact field tails, fetch classes, and
  common **8 GetSubstruct + 12 decrypt + 24 checksum + 12 encrypt** loops.
- **Next:** reduce only independently source-proven modulo-arm and shared-loop
  instruction/fetch segments; do not claim a complete accessor/stats total or
  wire the construction clock until the remaining memory/service model closes.
- **Notes:** twice-fresh OFF packets remain byte-identical at `92d3feb4…` /
  `136efa4a…` / `ea323d9e…`; no fixture mutation, decrypted bytes/pointers,
  duration/identity/residual fit, production recording import, barrier change,
  canonical Battle-2, animation, aggregate stats, or clock wiring. Independent
  source/ELF audit passed and its 96-case slot/offset gap is pinned by
  `2594377b`. The orient animation fold is recorded in archived entry 1077;
  at 16:04 `animation-main` was 30 commits ahead with its separate supervisor
  still active, so that later tail is intentionally left for the next orient.
  `DEFERRED.md` has no open entries.
