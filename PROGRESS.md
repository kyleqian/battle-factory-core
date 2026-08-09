# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1049 — [MAIN worker, 2026-08-09] **#85 `factorySwap:complete` stall closed generically**

- **State:** master green (827 files / 8,216 passed / 1 skipped). Vanilla
  soak 0:20 is **20/20 OK**; no HANG. The accepted-exit compare is **43/43**
  byte-exact frames.
- **Did:** reproduced seeds 6 and 55 through the real
  `createInitialState`/`tick`/button path. Both reached a completed kept-party
  swap with the source field handoff set while the generated round still
  awaited a swap offer; the driver was not at fault. `factorySwapRoundDecision`
  now exposes a typed decline only at that completed handoff, so the existing
  generic round bridge heals/preserves the party, advances the round, and
  publishes Battle 2 without changing accepted mutation or presentation
  timing. Added red Tier-1 coverage for accepted and kept-party ownership
  expiry. Declared the existing compare trace's canonical route; no fixed
  window, seed, battle, turn, species, or fatal-invariant weakening.
- **Next:** ISSUES #86's downstream generated battle string/switch-transition
  signatures; continue the ROADMAP S10 family-level Gate-6 sequence.
- **Notes:** seed 6: `CRASH b2 t13 f26280`, unsupported
  `{B_EFF_NAME_WITH_PREFIX}` in `STRINGID_PKMNFELLASLEEP`; seed 55: `OK b3
  t13 f50980 roundLost`. Smoke 375/375; focused swap/route tests 70 + 2;
  full suite and build green. Commits `72e3fed6`, `ee408ab6`; #85 deleted
  from `ISSUES.md`.

## 1047 — [interactive user session, 2026-08-09] **User decisions: #85 first; Gate-6 evidence goes family-level**

- **State:** master green (827 files / 8,213 tests, ~47 s full suite).
  Decisions recorded in the ROADMAP S10 block.
- **Did:** the user ruled the 561-gap hook census closes at FAMILY
  granularity (one receipt per effect/hook family + Tier-1 sibling batch
  checks; per-gap receipts only on divergence), receipt hygiene is advisory
  (worker TIME, not repo weight, is the constraint), and the sequencing is
  #85 -> family-level Gate 6 -> close-out -> playable-round milestone ->
  then schedule S11.
- **Next:** ISSUES #85 — displayed-HP ledger drift (`npm run soak -- --seed
  0`), handoff invariant (`--seed 6`), factorySwap stall (`--seed 55`).
  Then re-soak and burn the battles-2-7/postwin wave.
- **Notes:** vanilla soak 0:20 must stay 20/20 at every wind-down (ROADMAP
  gate). Report full-policy completions/60 as the session headline number.

## 1046 — [interactive user session, 2026-08-09] **Random-play soak harness folded; five display-seam crashes fixed; suite ~50 s**

- **State:** master merges `wip/meta-audit-20260808` + `wip/perf-audit-20260808`
  (rehearsed union green: 827 files / 8,213 tests in 47.7 s, typecheck and
  production build pass). New **ISSUES #85** is the top play-test priority.
- **Did:** built **`npm run soak`** — seeded random LEGAL play through the real
  production path (createInitialState + tick + button edges), full rounds.
  First sweep: 495/500 seeds crashed inside battle 1; the plainest vanilla
  policy died 100/100 at turn 6. Fixed five signature classes same-session
  (item-heal message resolver, Taunt/Disable rejection strings, clamped-stat
  banner skip, switch-in display from the party record, forced send-out
  same-tick lifecycle). **Vanilla is now 20/20 clean on master.** Live play
  sessions record replayable traces: crash overlay + `__POKEBENCH_SESSION__()`
  export, headless replay via `tools/replay-session-trace.ts`; builds show a
  commit stamp under the canvas. The suite runs `isolate:false` (2026-08-08
  timing audit: 97.5% of suite time was module import; the one vi.mock file is
  now cache-safe).
- **Next:** ISSUES #85 — displayed-HP ledger drift + handoff mismatch (39+18
  of 60 full-policy seeds; same family as closed #84 item 5, now firing turns
  8–28) and the `factorySwap:complete` stall (seed 55 WON battle 1 and hung at
  the swap surface). Closing those unlocks machine play of swap, battles 2-7,
  and postwin. Run the ROADMAP soak gate at every wind-down.
- **Notes:** receipt-evidence slimming policy + soak gate recorded in ROADMAP
  (S10 block, user-directed 2026-08-09). Crash catalog:
  `docs/soak-crash-catalog.md`. Play-preview re-pinned to this fold.

---
