# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-06 — D3 approved; next run implements faithful random animations

- **State:** D3 answered with option (a). Production remains `24df8af5e`:
  218 live adapters, 58 remaining (52 Random2); no surrogate adapter credit yet.
- **Did:** recorded the user's approval, removed the open D3 launcher block,
  and aligned ROADMAP S10A, worker instructions and verification. The next
  Opus/Sonnet run may implement a separate deterministic presentation RNG,
  persist its seed in session exports and report "faithful random" separately.
- **Next:** presentation RNG + replay/export metadata + claim accounting;
  then Double Kick/Astonish as a bounded representative batch, source-verified
  with pinned words and ordinary seeded routes. Continue other exact adapters
  and outstanding fixes as the current roadmap directs. Do not re-ask D3.
- **Checks:** docs-only diff/ledger checks and resolved launch profile; no open
  deferred headings. Reuse unchanged final production receipt: typecheck,
  1,525 files / 12,317 tests, build851 (`final-supervisor-gates-20261005-day.json`).
- **Notes:** gameplay RNG/outcomes stay unchanged; controlled pinned-word
  proofs do not turn normal-play surrogate randomness into an exact claim.
  This checkpoint prepares the next run and launches no supervisor or worker.

---

## 2026-10-05 (day) — S10A wind-down: 198 -> 218 live adapters; lends across faints/switches; 8 species fixes; elevated renderer

- **State:** S10A, local master; production `24df8af5e` (218 live adapters, 58 accepted bodies
  remain: 52 Random2 + 6 others). Supervisor final gates on that code: typecheck, 1,525 files / 12,317 tests, build 851 (`final-supervisor-gates-20261005-day.json`). Preview
  <http://127.0.0.1:5191/> serves `24df8af5e` (four hashes, export, ON->OFF, no errors) (receipt in `tools/integration/fixtures/`). Opus 5.5
  supervisor; Opus/Sonnet 5.5 workers; 13 integration folds + 15 evidence merges, all re-proved.
- **Did (production):** sprite-order tracker kept and LENT across opponent KOs (entry-label relabel),
  player faints + forced switch-in and voluntary switches / cancelled menus (role relabel), Roar /
  Whirlwind forced switches; allocator re-seeded; +22 order rows (467 bodies). Adapters: Magnitude,
  Reversal, Pain Split, Rock Blast, Razor Wind, Spark (player) with gBattleMovePower on the request;
  Leech Seed, Tri Attack, Petal Dance, Destiny Bond, Air Cutter, Foresight, Sky Uppercut, Recycle,
  Spider Web; Roar, Whirlwind (Scene-ON instant forced removal); Fly, Bounce (attacker hidden across
  the turn gap); Rollout (counter on the request; Defense Curl bodies decline). Species fixes from swap audits: Leaf Blade, Dragon Rage, Aerial Ace, Rock Throw,
  Smelling Salt, Light Screen / Future Sight end shadow, Foresight (#144 closed, #145 trimmed).
  ISSUES #147: elevated opponents were drawn 8 px low without shadow in ordinary resolution frames
  in BOTH scene modes — fixed (Scene OFF 0/935 -> 919/935; 203 committed traces unchanged).
- **Did (evidence):** post-KO / player-faint / voluntary-switch audits, census regen, prep10/11,
  Random2 trackability (NOT trackable), forced-switch continuation (#146), live species audits 1+2,
  elevated post-body + Scene OFF checks, Rollout/Endeavor prep (both trackable), send-in tail model
  (338/338).
- **Next:** ROADMAP S10A "Next (2026-10-05 day)": D3 answer first; then Endeavor, Baton
  Pass, #146 send-in tail (model ready), #145/#147 remainders, order-coverage gaps.
- **Notes:** **DEFERRED D3 (OPEN):** Random2 animations (52 moves) cannot be tracked exactly in play;
  ship a surrogate presentation RNG in a separate claim bucket (recommended) or keep the fallback.
  The next `run-supervisor.sh` refuses to start until D3 is answered. Soak gates superseded for
  S10A integration work (ANIMATION_VERIFICATION scoped policy). All worker branches merged and
  worktrees removed; evidence summaries copied to `.integration/validation/`. A side worker once
  committed onto master via the shared `/workspace` path suffix and self-repaired (PAPERCUTS).

---

## 2026-10-05 (night) — S10A wind-down: 144 -> 198 live adapters, sprite order live

- **State:** S10A, local master; production `782822914` (198 live adapters, 78
  accepted bodies remain). Supervisor final gates on the final code: see the
  Notes line. Preview verified at the final checkpoint (receipt in
  `tools/integration/fixtures/`). Opus 5.5 supervisor; Sonnet 5.5 workers (Opus
  for the two sprite-order wiring steps).
- **Did (integration, 9 folds + 1 fix, each re-proved by the supervisor:
  dense twice fresh, zero residual, alt species; ordinary routes all PASS):**
  H_BUFFER S1 (7), prep5 (6), sprite-order provider wiring + Grudge, order
  consumers (8), cross-body order tracking, prep6 (7), prep7 (8), prep8
  allocator-plan-v2 moves (10), prep9 + Double Team/Feather Dance (7); CASTFORM
  normal-form Y placement fixed (ISSUES #143 trimmed to weather forms);
  production order table extended 381 -> 445 bodies (Endeavor/Fake Tears +
  60 REL-Y-confirmed rows; corpus 1,101/1,101 and strict real-route 10/10 exact);
  Intimidate battle-start order seed (12/12 exact; Intimidate-lead battles lend).
- **Did (side lane, evidence):** sprite-order module, real Factory entry probe,
  body/gap plans, gap causes, real-route validation, plan coverage (52 -> 68 ->
  81% weighted with REL-Y rows), policy gaps (Intimidate seed, Endeavor/Fake
  Tears), uncovered units (faint/switch), allocator v2 baseline, census of the
  remaining 103 moves, prep6/7/8/9, Castform diagnosis.
- **Next:** ROADMAP S10A "Next (2026-10-05)": post-knock-out lends, abs-invariant
  REL-Y rows, then the census queue.
- **Notes:** no DEFERRED entries. Soak gates are superseded for S10A
  integration work (SUPERVISOR.md: ANIMATION_VERIFICATION scoped policy); not run.
  Oracle freshness FAIL at orient was the known false positive. All worker
  branches merged and worktrees removed; evidence copied to `.integration/validation/`.
  Final gates on `782822914`: typecheck, 1,509 files / 12,178 tests, build 851
  (`final-supervisor-gates-20261005.json`).

---
