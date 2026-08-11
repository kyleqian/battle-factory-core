# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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
  scope for now** — entry kept in the roadmap, nothing schedules it.
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

## 1095 — [MAIN worker, 2026-08-10] **#55 direct level route bounded; complete callee not reducible yet**

- **State:** evidence `b8bb8306` plus docs `0a1ebd4d`; focused stats **17/17**,
  smoke **375/375**, typecheck, full `npm test` **881 files / 8,436 passed /
  1 skipped**, and production build are green. #55 remains open and the
  construction clock remains unwired.
- **Did:** audited all **12/12** `GetLevelFromMonExp` calls. Twice-fresh OFF
  packets pin personality/species/growth/EXP and exact post-accessor timing:
  **43 + 21 + 2,200 + 18 = 2,282** source cycles; **8 exact + 3×(+18
  service) + 1×(+308 VCount/audio IRQ)**.
- **Next:** continue #55 only with the source-general encrypted `GetBoxMonData2`
  body needed by the 156 direct reads and both level accessors; do not wire
  aggregate stats or the construction clock.
- **Notes:** complete level calls total **246,922** pause-subtracted cycles;
  their two encrypted accessors contribute **219,176** observed cycles and
  remain unreduced. No fitted duration, keyed/identity branch, residual
  absorption, canonical Battle-2, animation, fixture production import, or
  barrier change.

## 1094 — [MAIN worker, 2026-08-10] **#55 direct `GetMonData2` party reads reduced**

- **State:** implementation `9a90f094`, shell correction `bf107b02`, and
  evidence/docs `3b95eb30`; focused
  stats **16/16**, smoke **375/375**, typecheck, full `npm test` **881 files /
  8,435 passed / 1 skipped**, and production build are green. #55 remains open
  and the construction clock remains unwired.
- **Did:** censused all **180** stats reads by field/compiled route: **24**
  direct HP/max-HP reads and **156** encrypted EV/IV/species reads. The direct
  source-general jump-table arms reduce exactly at **80** cycles each:
  anchor/LILIANA/varied **960/480/480 = 1,920**, zero residual.
- **Next:** continue #55 only with a bounded source-derived encrypted
  `GetBoxMonData2` body or level/growth component; do not wire the aggregate
  stats operation or construction clock.
- **Notes:** encrypted/default and Deoxys routes retain only exact compiled
  entry/return shells with `cycles: null`; the correction includes the opening
  `push` represented by mGBA's pipelined entry PC. All three Scene-OFF packets
  match committed hashes. Completed direct-call coverage is **312/480** and
  **100,214/1,768,691 = 5.666%** of source callee cycles. No duration/identity
  fit, fixture mutation, canonical Battle-2, animation, or barrier change.
