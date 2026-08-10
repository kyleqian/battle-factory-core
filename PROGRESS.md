# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1077 — [supervisor, 2026-08-10 ~08:58] **Orient: latest animation work folded; union green; #55 construction clock is next**

- **State:** `animation-main` was ahead by 12 commits. The fold fast-forwarded
  `master` to `81f89ae6`, adding Drill Peck, Submission, and Spite animation
  work. The union is green: full suite **875 files / 8,392 passed / 1
  skipped**, production build clean, and both oracle services are current.
- **Did:** read the S8 authoritative reset and enforced its stop on the old
  canonical Battle-2 march. Re-oriented the playable seven-battle loop
  against the remaining generic OFF-profile boundary instead: ISSUES #55's
  source/cycle construction clock, which blocks personality-exact live next-
  opponent generation and the swap-screen ambient RNG continuation.
- **Next:** derive and land the smallest source-general deterministic clock
  that reproduces the committed anchor/LILIANA/varied receipts, then wire it
  into generic round opponent construction and extend the Battle Scene OFF
  next-opponent presentation proof. Do not add trainer, battle-number, turn,
  or absolute-tick branches.
- **Notes:** DEFERRED.md remains empty. The animation supervisor owns any
  later `animation-main` commits; re-check that branch at wind-down.

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

## 1075 — [MAIN worker, 2026-08-10] **#73 slice-2 assignment was mis-scoped: the player-sprite residual it targeted was already closed 2026-08-05; ISSUES.md's stale paragraph fixed so the next reader doesn't repeat this**

- **State:** no engine/controller/asset change — this step is a verification
  + docs correction. Confirmed live (oracle-backed, two fresh runs each):
  `loss-terminal-window-off` **1943/1943**, `win-terminal-window-off`
  **3590/3590**, `battle-command-generated-off` **128/128**, all
  byte-stable across both runs. `npm test`/`npm run build` unchanged
  (nothing to re-verify beyond the doc edit — run once at close per the
  brief's acceptance bar; see Notes for the exact counts).
- **Did:** the assigned step ("extract the oracle's REAL player object
  graphic... post-terminal LOSS Lobby window is exact through pages 0-2
  EXCEPT... the player sprite... oracle renders the bootstrapped save's
  actual player character (red-brown hat + red shirt)... committed windows
  350/350, 503/503, 128/128") described a state that predates a same-day
  fix already recorded in `ISSUES.md` #73: the **2026-08-04 "LOSS slice-2
  player-sprite residual CLOSED"** paragraph (immediately below the stale
  one the brief quoted) found the real cause was a wrong `+1px x2` OAM
  sub-pixel offset on the player object anchor, fixed it generically in
  `factoryTerminalRender.ts`, and got 0 diff using the **existing**
  extracted Brendan asset (`factory-lobby-terminal-npcs.json`) unmodified
  — explicitly retracting the "different player asset" theory. Everything
  from slice 3 (record prompt) through slice 5 (LOSS decline continuation,
  WIN GO-ON scouting/commentary/swap-offer/swap-screen) closed in the five
  sessions since, dated up to 2026-08-05 in `ISSUES.md`. Verified this is
  really true right now, not just on paper: ran `npm run compare` twice
  each on all three windows the brief named as the acceptance bar (see
  State) — all exact and far past the "350/503" checkpoint the brief cited
  as current. Per this run's protocol ("if blocked/mis-scoped, say why
  instead of improvising a different plan"), did **not** invent replacement
  work (e.g. the still-genuinely-open swap-screen ball-rocking RNG boundary
  or the walkable free-roam lobby feature, both already correctly named as
  open in `ISSUES.md` #73's tail and out of this step's charter either way).
  Deleted the stale "Residual classes (documented, honest checkpoint)"
  paragraph in `ISSUES.md` #73 (the one describing the red-brown-hat theory
  and the 350/503 checkpoint) since it sat un-pruned right next to its own
  retraction and is what produced this mis-scoped brief — replaced with a
  short pointer to the real closure paragraph plus this session's
  re-confirmation, per this run's "keep ISSUES.md pruned" mandate. Did not
  touch the record-prompt/slice-3 text the brief asked to preserve as
  "next territory," since that language was itself the stale part.
- **Next:** #73's only genuinely open remainders (both already documented,
  neither touched this step): the swap-screen ball-rocking restart's
  per-ball `Random()%5` ambient RNG boundary (tracked under #55, one frame
  past the current WIN swap-YES window's end at 10177), and the walkable
  free-roam Lobby feature (deliberately sequenced by the user behind
  play-test fixes #76-#81). Neither is slice-2/#73 core work. Suggest the
  supervisor re-derive the next MAIN-lane increment from `ISSUES.md`'s
  current tail rather than re-issuing #73 slice work.
- **Notes:** PAPERCUT — a step brief quoted a real ISSUES.md paragraph that
  was itself stale (superseded three paragraphs later, same file, same
  date-order) and the numbers cited (350/350, 503/503) as "the current
  committed baseline" were ~5x stale (actual 1943/3590 at time of
  assignment); ~20 min spent confirming the premise before writing anything,
  which is exactly the read-first discipline this docs fix is meant to save
  the next worker/supervisor. Full verification run at close: `npm test`
  and `npm run build`. Archived entry 1072 to `PROGRESS-archive.md` to keep
  the ledger at 3 live entries.
