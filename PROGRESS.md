# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 1077 — [supervisor, 2026-08-10 ~10:00] **#55 v2 cycle evidence banked; fitted construction callback refuted**

- **State:** master `3916972f` is green after two side folds: smoke **375/375**,
  construction-clock/v2 focus **19/19**, typecheck, and production build pass.
  The v2 worker's full suite was **877 files / 8,400 passed / 1 skipped**.
- **Did:** folded 12 pending animation commits first (Drill Peck, Submission,
  Spite), then landed #55's source-operation construction scheduler, clean-
  stream mode, injectable VBlank callback/cycle costs, optional mGBA master-
  cycle probe, evidence boundary, and idempotence pins. The model contains no
  trainer, battle, canonical-tick, or fixture schedule branch. Supervisor
  verification caught and fixed one narrowed callback type before merge.
- **Next:** leave personality-exact construction unwired until candidate-
  aware instruction timing plus deterministic VBlank audio/DMA workload are
  modeled. Continue the playable OFF-profile round seam at the independent
  swap-screen ball callback boundary: replace the fake unconditional restart
  after frame 10177 with source `Random()%5` state and extend the dense YES
  fixture through its existing 10214 endpoint.
- **Notes:** fresh v2 anchor/LILIANA/varied probes are twice byte-identical.
  The present cost callback is refuted: nature-check cost depends on candidate
  personality, and IRQ cost depends on live audio/DMA state. No fitted table,
  controller wiring, or deferred user question was added.

## 1076 — [supervisor, 2026-08-10 ~03:00] **Session wind-down: S10 closed, 9 workers + 1 audit, all folds green**

- **State:** master `019c27f2` is green: full suite **872 files / 8,384
  passed / 1 skipped**, production build clean. Soak gates (run at the
  engine-identical prior fold): vanilla 0:20 = **20/20 OK**, full-policy
  0:60 = **60/60 OK**. DEFERRED.md is empty — no open supervisor
  questions.
- **Did (session summary):** S10 CLOSED (entry 1074) — the entire Gate-6
  family program ran start-to-finish in this one session: family worklist →
  five receipt packs (side lane) → five wiring promotions (main lane,
  serial) → soak artifact + Noland note → read-only opus audit (3 defects)
  → same-session class fixes → gates 2/3/4/6 + stage ticked. Final
  manifest: **296/300 source-proven rows per axis, 4 documented
  dynamic-dispatch exceptions per axis**. Two animation folds landed
  Protect/Magic Coat/Role Play exact plus Drill Peck dense evidence
  (`f913d88a`, `019c27f2`); the animation supervisor session may still be
  live — any later `animation-main` commits fold next session. A final
  #73 probe round returned an honest mis-scope verdict (entry 1075): the
  targeted residual closed 2026-08-04; the stale ISSUES paragraph that
  produced the brief is now pruned.
- **Next:** the playable-round polish milestone's real remaining substance
  is #71 Slice D coordination (ON-profile per-tick send-out playback, with
  the animation lane) and session-trace-driven pacing fixes (need user
  play traces); then schedule S11 audio. ISSUES #86 (routeBranch
  self-description sweep) is optional manifest-hardening filler.
- **Notes:** new PAPERCUTS this session: same-second launcher JSONL
  collision, one-EmeraldOracle-per-process, bare-npx-vitest OOM on
  census-loading tests. ISSUES numbering: #82 was reused by a worker and
  renumbered to #86 — check new numbers against git history at verify
  time.
