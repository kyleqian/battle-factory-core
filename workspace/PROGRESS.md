# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 2026-10-04 (evening) — S10A wind-down: 131 -> 144 live adapters

- **State:** S10A, local master; production `1a68bb532`; 144 live adapters,
  132 accepted bodies remain. Supervisor final gates on `1a68bb532`: 1,495
  files / 11,996 tests, build 847 (`final-supervisor-gates-20261004-evening.json`).
  Wound down early at the user's request. Opus 5.5 supervisor, Sonnet 5.5 workers.
- **Did (integration, 2 folds, no move dropped):** next5 — Scary Face,
  Glare, Teeter Dance, Dizzy Punch (presentation-only party personality on
  the field battler), Soft-Boiled (displayed bystander); prep2 — Surf, Muddy
  Water, Icy Wind, Blizzard, Fake Out (`liveBattlerCoordAttrs`), Cosmic Power,
  Future Sight (turn 1), Explosion. Each independently re-proved dense twice
  fresh (2,229 and 3,620 rows/run, zero residual, incl. four alternate-species
  cases) plus ordinary routes 4/4 and 7/7 with ON/OFF parity.
- **Did (side lane, evidence only):** prep2 triage of 33 H_BASIC/H_DERIVED
  moves; static H_BUFFER triage (84); measured prep with drafted fixtures and
  routes for 13 more moves (`docs/h-buffer-s1-prep.md`,
  `docs/next-adapters-prep5.md`). Ember, Heal Bell, Perish Song, Leaf Blade,
  Dragon Rage need the sprite-order provider.
- **Next:** dispatch the H_BUFFER S1/S2 batch (Mean Look, Smelling Salt,
  Defense Curl, Ingrain, Wrap, Bind, Dragon Breath) from
  `.codex-logs/s10a-hbuffer-s1-batch-20261004-brief.txt` (fill
  __BASE__/__COUNT__/__CAP__/__STOPADD__), then the six prep5 READY moves, then
  sprite-order provider slices. ROADMAP S10A "Next (2026-10-04 late)" lists all.
- **Notes:** limits recorded per receipt: Icy Wind/Blizzard show the
  scene-off view where the reducer's retained slot table cannot verify the
  geometry (Blizzard ~90% player-attacker / ~34% opponent-attacker pairs
  live); Soft-Boiled has no rental carrier (dense only); Scary Face/Dizzy
  Punch script tails uncovered. No DEFERRED entries. All worker branches
  merged/deleted; evidence copied to `.integration/validation/`.
