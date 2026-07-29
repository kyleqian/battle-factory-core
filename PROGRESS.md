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

## 658 — [INTERACTIVE SESSION 2026-07-28 ~20:25] Ability/item parity setup landed: census generator + worklist live; scope decisions recorded (AI in scope, audio = S11)

- **State:** master `275c415c`+docs, union green at **449 files / 4819
  tests**, production build, `git diff --check`. New standing artifacts:
  `npm run census:ability-item` →
  `docs/ability-item-parity-census.md` (ranked worklists, 15 validations,
  byte-idempotent); `npm run extract:ability-item-hooks` →
  `src/data/gen/ability-item-hooks.json` (literal AbilityBattleEffects/
  ItemBattleEffects segmentation + inline sites, exact-set pinned).
  **Headline: abilities 43/70 engine-referenced (weighted 729/1103 L50
  carriers), hold effects 22/42 (weighted 713/850).**
- **Did:** built the move-census pattern for the last two enumerable
  families. Ground truth: 20 ability caseID segments (+3 alias
  pseudo-modes), 5 item segments, 187+54 inline sites across 6 rules + 2
  AI files. Census: source hooks × L50 carriers (deterministic
  single-ability split for fixture selection) × live engine surface
  (identifier-only scan — the engine's universe-spelling ABILITY_SYMBOLS
  name table made naive counting vacuous at 70/70; string literals
  excluded, jumpifability live-set exports unioned, alias spellings
  dealiased, unknown spellings hard-error). Tier-1: 6 new tests incl. two
  regeneration ratchets — **the census doc is pinned to the tree; regen it
  in the same commit as any engine change that moves it.** ROADMAP: S11
  audio stage created (separate milestone, user-directed); 2026-07-28
  scope block added under S10.
- **Next:** supervisor sessions consume the worklists exactly like move
  census rows: top unreferenced abilities Chlorophyll 38 / Thick Fat 36 /
  Guts 36 / Swift Swim 34 (damage/speed-calc modifier class), contact
  ON_DAMAGE family (Static 27 …), pinch boosts; top unreferenced hold
  effects Quick Claw 75, type-power family (~40 sets), Choice Band is
  referenced-partial. Scout-ahead prep packs + serial implementation rows
  at exact predicted deltas is the proven cadence. Switch/item/trainer AI
  is IN scope for a later milestone (user decision); doubles/Open/Noland
  stay out; audio is S11.
- **Notes:** "engine-referenced" = named surface, not semantic
  completeness — rows close via fixtures + oracle evidence like move rows
  (see the doc's Caveats). Animation program live to ~21:06 tonight;
  its fold at next orient is expected.

---
## 657 — [INTERACTIVE SESSION 2026-07-28 ~19:55] Pre-next-run cleanup: animation fold, 07-26 oracle-tooling branch landed, papercuts pruned; USER DIRECTIVE: held-item + ability parity is the next objective

- **State:** master `b791ea88`, union green at **448 files / 4813 tests**,
  production build, `git diff --check`, both oracle profiles answering. The
  animation supervisor session is live until ~21:06 (LEAF_BLADE evidence
  worker in flight); expect another animation-main fold at next orient.
- **Did:** (1) folded `animation-main` (ff) — MOVE_ENDURE promoted exact,
  Level-50 animation coverage **77/276 exact**. (2) Found and landed the
  orphaned 4-commit `codex/oracle-tooling-papercuts` branch (sat unmerged
  since 2026-07-26 22:04): `bin/oracle --quiet`, mGBA-venv auto-routing in
  `run-mgba-probe.py`, resumable `npm run compare:batch`, per-frame diff
  `bbox=` in `npm run compare`, `docs/oracle-frame-semantics.md`. One
  mechanical conflict in `appTrace.ts` (kept master's full-turn staging,
  took the branch's `traceAdvances` loop); `--quiet` live-smoked. (3)
  Deleted 5 retired PAPERCUTS entries (~14 recorded hits), trimmed the
  per-frame-bbox entry to its portable-comparator remainder. (4) Pruned the
  fully-merged `codex/hybrid-cloud-supervisor` + landed `oracle-tooling`
  worktrees/branches.
- **Next (user directive this session):** with the move census closed at
  100%, drive **held-item and ability parity** — entry 655's Next #1
  (ability/item census generator: turn the named-barrier set + source hook
  tables into a ranked worklist like the move census) is now the confirmed
  next objective. ISSUES #39 window-by-window retirement continues as the
  secondary lane. Remaining enumerable families after items+abilities:
  none new — statuses/volatiles/weather ride the closed effect census;
  species/natures/trainers/sets closed at Gate 1; switch/item AI,
  doubles, Open level, Noland stay out of scope by mission.
- **Notes:** open ISSUES: #39 (active retirement path), #38/#18/#5 (all
  parked/settled by user policy — no action). DEFERRED.md empty. Remaining
  papercut worth a future harness window: Scene-ON battle-lab HTTP route
  404 (3 hits, shared-oracle change, needs coordination). Did not touch
  the animation lane's worktrees.

---
## 656 — [BOUNDED MAIN WORKER 2026-07-28 ~19:16] Turn 13 SAND_ATTACK presentation window re-driven from kernel events

- **State:** implementation commit `e50bf210`; tree green at **441 files /
  4791 tests**, production build, OFF oracle info, and `git diff --check`.
  Census regenerated byte-identically at **214/214 effects, 355/355 moves,
  276/276 distinct, 2957/2957 weighted**, all **72** validations.
- **Did:** followed `docs/presentation-seam-scout.md` §15's staged proof and
  wired `drawTurn13SandAttackWindow`'s captured kickoff plus accuracy-fall
  text to the real SAND_ATTACK event stream through the existing generic
  stat-down bridge. Deleted all four raw turn-13 text literals and their
  literal-only scene tests; added a bridge pin proving opponent-target
  `stat-stage-change {stat:"accuracy",from:6,to:5}` is preserved. The
  historical Battle-Scene-ON comparator remains exact: SAND_ATTACK
  **190/190**; adjacent sweep menu/switch-in/DRAGON_BREATH **57/57 +
  242/242 + 141/141**, turn 12 **46/46 + 131/131**, turn 11 **56/56 +
  178/178**, turn 10 **93/93**, turn 6 **90/90 + 127/127**, and turn 2
  **77/77**. Standing checkpoints remain turn 1 **256/256** and turn 5
  faint **110/110**.
- **Next:** supervisor select the next bounded ISSUES #39 window. The turn
  13 DRAGON_BREATH half remains explicitly unwired and out of this step;
  keep retiring exact windows from semantic events without extending the
  canonical turn march.
- **Notes:** no bridge widening, kernel mechanic, animation, banner timing,
  dirt motion, DRAGON_BREATH, round/facility state, barrier ratchet, new
  turn branch, or absolute-tick constant. `turn13-sandattack.json` retains
  no `oracleProfile`, so its load-bearing standard comparator correctly
  used the historical Battle-Scene-ON profile.

---

---
