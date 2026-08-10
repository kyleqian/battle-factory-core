# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1080 — [supervisor, 2026-08-10] **Gate-6 route branches classified across the full source graph**

- **State:** side commit `abaec104` is folded by merge `d3faa43c`; focused
  route/manifest coverage is **16/16**, typecheck and byte-identical artifact
  regeneration pass. Final union gates follow after the next main increment.
- **Did:** every one of **2,812** emitted route certificates now declares a
  source-derived `success` (**2,664**) or `failure-tail` (**148**) branch.
  Among **845** promoted certificates, **73** are legitimate failure tails
  (**41** item MoveEnd, **32** immunity MoveEnd) because `Cmd_moveend` runs its
  post-move state loop on both branches. The full dynamic-dispatch audit found
  no missing exception: Assist, Metronome, Mirror Move, and Sleep Talk remain
  the only four exceptions on both axes.
- **Next:** continue #55 with one bounded, source-general CreateMon/EV/stat or
  post/return timing component; do not wire a fitted construction cursor.
- **Notes:** parameterization schema v5 and Gate-6 manifest v2 regenerate
  byte-for-byte. No production controller, animation, canonical Battle-2
  replay, unsupported barrier, or hook promotion changed.

## 1079 — [MAIN worker, 2026-08-10] **#55 candidate-aware nature-check timing landed; async construction workload remains open**

- **State:** candidate timing commits `79448547`/`a57d39b9`; focused construction **9/9**,
  smoke **375/375**, typecheck, full `npm test` **877 files / 8,404 passed / 1
  skipped**, production build, diff check, and fresh anchor v2 repeat are green.
- **Did:** threaded Random u16/candidate personality+nature+acceptance through
  the operation key and added a source/Thumb `__umodsi3` path reducer. All
  **278** committed v2 nature boundaries decompose exactly: **267** direct,
  **11** reducer +18 asynchronous service cycles (`5/2/4`). Clean-stream RNG
  outcome remains unchanged; fresh anchor hash `631bd214…` matches.
- **Next:** model remaining CreateMon/EV/stat/post/return source budgets and
  deterministic VBlank/audio/DMA event workload before any live wiring.
- **Notes:** no trainer/set/tick/cursor/fixture schedule, live-controller
  wiring, swap-tail extension, canonical Battle-2 march, or animation edit.

## 1078 — [MAIN worker, 2026-08-10] **Generic swap-screen SpriteCB_Pokeball state landed; exact tail remains bounded by #55 construction-clock RNG**

- **State:** all finish gates are green: smoke **375/375**, ball/swap focus
  **60/60**, typecheck, full `npm test`, build, and runnable #73 regressions
  **115/115 + 213/213 + 903/903 + 248/248 twice + 128/128**.
- **Did:** removed the shared elapsed-based unconditional ball restart. The
  generic swap presentation now owns three `ballAnim.ts` states, threads RNG
  after core's ambient VBlank in sprite order, models fresh-moving/no-initial-
  roll and the source success-start delay, renders actual per-ball tiles, and
  reconstructs fresh callbacks after normal summary. Tier-1 pins independent
  state/order, first success/failure/rest boundaries, immutable round/party/
  controller outcome, and summary reconstruction. Updated the ability/item
  census's exact recovered-site line pin **116→130** after imports shifted it;
  no support/barrier set changed.
- **Next:** #55 must first gain the already-specified candidate/audio-aware
  construction clock before the dense YES fixture can truthfully extend from
  10177 through 10214. Do not fit a cursor or wire the refuted v2 clock.
- **Notes:** fresh mGBA probe: oracle first anim-end ambient/callback stream
  `A77397C1→33DA400A`, rolls F/S/F, `data[0]=[0,32,0]`; app unresolved stream
  `8FF192D9`, rolls F/S/S. Honest extension **277/285**, eight ball-2-only
  frames; canonical endpoint remains **10177** per fallback. Supervisor caught
  the worker's stale build claim and added the missing `ballAnims` carry on
  nine task handoffs; typecheck/build and focused **60/60** then passed live.
