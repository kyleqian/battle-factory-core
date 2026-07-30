# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 738 — [SUPERVISOR 2026-07-30 ~12:50] Gate-6 K1-K3 merged (K2 caught a real weather-accuracy kernel defect); Slice 1 supervisor-verified

- **State:** master `54124ee9`, union green **546 files / 5497 tests + 1
  deliberate animation-lane skip**, build clean. Merged side worktree
  removed; R7+R8 side worker live (stacked worktree, base `126c2cf`).
- **Did:** verified Slice 1 myself (route+ratchet tests rerun; generated
  **128/128**; spot-checked `turn13-sandattack` 190/190 and
  `battle2-off-turn1-staged` 16/16). Merged K1-K3
  (`gate6KernelInteractions.test.ts`, 542 lines): K1 end-turn
  weather-vs-item ordering, K2 accuracy×weather (fix `450cf532` —
  `battleScriptHitChainOpcode.ts` hardcoded weather inactive in accuracy
  checks: rain-Thunder bypass, sun-Thunder 50, Sand Veil were all
  missing), K3 status×volatile gate order + RNG ledger. Scout-doc
  coverage rows updated by supervisor.
- **Next:** main — Slice 2 (anchor session, Battle 1 RNG epoch
  reconciliation); side — R7+R8 receipts, then K4-K6, R4, B+444 probe.

---
## 737 — [BOUNDED MAIN WORKER 2026-07-30 ~12:38] #53 routing Slice 1 complete

- **State:** explicit route seam and draft-source adapter landed in
  `8dd8ebcf`; route-tagged regression traces landed in `9bc0b39a`. Focused
  acceptance is **4 files / 38 tests**; full gate green at **546 files /
  5482 tests + 1 deliberate animation-lane skip**, production build clean.
- **Did:** added immutable generated/canonical route ownership at the sole
  battle-room handoff; the pure adapter returns exact compact rental sources
  by one-based pick rank (including HAUNTER-first and a second order). Default
  remains canonical; generated tests inject a session factory. `Trace.appRoute`
  is stripped before both oracle paths; tagged all 25 immutable rows, the
  historical Battle 1/2 intro chain, and generated command evidence.
- **Next:** issue design Slice 2: source-/oracle-pin the anchor facility and
  RNG epochs, then replace the temporary injected generated-session factory.
- **Notes:** all **25/25** immutable rows retain their exact table counts;
  generated command remains **128/128**. No capture/segment/profile, recording
  import, barrier/ratchet pin, renderer/rules/AI/per-turn route branch,
  production-default, issue, docs-design, or Gate-6 change. PAPERCUT: none.

---
## 736 — [BOUNDED MAIN WORKER 2026-07-30 ~12:28] #53 interactive routing-flip design complete

- **State:** design-only step complete; full gate green at **545 files /
  5478 tests + 1 deliberate animation-lane skip**, production build clean.
  No source, test, trace, issue, or Gate-6 file changed.
- **Did:** authored `docs/interactive-routing-flip-design.md`: traced the live
  draft → recorded-battle railroad, exact draft/RNG inputs, and generated
  intro/command/round ownership; fixed the route rule as generated for normal
  play and canonical only by explicit compare/test injection; specified seven
  bounded implementation slices and a final HAUNTER/SHADOW PUNCH user proof.
- **Next:** issue Slice 1 verbatim: add the explicit route discriminator and
  rank-ordered draft adapter, isolate `Trace.appRoute` from the oracle, mark
  immutable traces, and deliberately leave production default canonical.
- **Notes:** preservation is explicit for all 25 immutable rows, generated
  command **128/128**, and intro **714/715** with only B+444 outstanding. No
  oracle run, recording import, barrier/ratchet-pin change, tick branch, or
  capture fitting/thinning. PAPERCUT: none.

---
## 735 — [SUPERVISOR 2026-07-30 ~12:10] Session open: animation-main folded (+7, Present/Roar exact); lanes on #53 routing-flip design + Gate-6 remainder

- **State:** master fast-forwarded to `1f31e2af` (fold of
  `animation-main`: MOVE_PRESENT and MOVE_ROAR promoted to exact;
  animation coverage 107 exact / 0 partial / 169 unsupported). Union
  verified by supervisor: **545 files / 5478 tests + 1 deliberate
  animation-lane skip**, production build clean, oracle freshness PASS
  (both profiles current vs harness HEAD `2bcab14`). DEFERRED.md empty.
- **Plan (entry 734 order):** (i) main lane — #53 interactive
  routing-flip design doc (`core.ts` battleRoom handoff → generated
  orchestrator), then flip slices; (ii) side lane — Gate-6 remainder:
  K1-K3 kernel tests, then R4/R7/R8 staged cards + K4-K6; (iii) B+444
  RAM-probe fix-vs-attribute interleaved when a lane frees. Hard stop
  19:59; wind-down entry will supersede this one.
- **Notes:** fold was a fast-forward (master had no unique commits since
  the 734 wind-down fold). Animation top entry carries no "For the main
  program:" line.

