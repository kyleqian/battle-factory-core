# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-09 (overnight) — S10A: host histories widened; ordinary-play live share 77.7 -> 87.2 % of commands (91.1 % of frames); 241 + 13 + 22

- **State:** local master, production src tree `dde58985` (`c99a40a0a`). Census `241+13+22+0+0=276` (Icy Wind, Blizzard, Confuse
  Ray, Faint Attack moved scoped exact -> faithful timing with counter evidence). Supervisor final gates on that code: typecheck, full suite 1,583 files / 13,039 tests, build, differential 624/624 vs `3fbe30cf7`, census seeds 0..299 92.66 % / 94.12 % (`final-supervisor-gates-20261009.json`).
  Ordinary-play census seeds 0..999 (src `f7cf9a74`, before the last two folds: Faint Attack timing, prep49 +52 / +8,685 on seeds 0..299): **87.23 % of move animations
  live by count, 91.13 % by frames** (session start 77.68 / 78.76), faithful-random history 1.54 % / 1.81 %; seeds 50000..: 88.38
  / 90.47; gameplay command sequence and battle digest identical at every fold. Preview <http://127.0.0.1:5191/> serves `96aaaebbe` (4 samples hash-equal, session export + ON->OFF restart, no errors; `playable-preview-96aaaebbe-receipt.json`).
- **Did (11 production folds, each re-proved by the supervisor from fresh probes / census reruns):** allocator NET-ZERO ids
  (prep44); order plans (prep45: BRN, TURN_TRAP by wrapped move, heals, Hydro Pump, Solar Beam by turn, ...; plans48: FRZ,
  NIGHTMARE, Knock Off item, Ice Punch, Attract, Present, Razor Wind, ...); GEOMETRY-KEYED order from the renderers' timelines
  (Giga / Mega Drain, Dream Eater); Icy Wind / Blizzard at any species geometry; retained locked-action prompt cycle + battle-start
  seeds + opponent recall (prep47); deferred lend after Random2-words units + RAIN_CONTINUES sub-stream with per-command
  faithful-random-history accounting (prep46); Dig / Return later bodies (prep48); Baton Pass / AI switch summary / double-KO reshow (prep49); D4 accounting (d4tails, fa185).
- **Did (evidence):** prep45 / prep46 / prep47 / prep48 / prep49 (landed the same session) / prep50 (status-animation allocator net-zero, banked); live audit 15 (142 chain windows: no species / history defect;
  Light Screen opponent row-59 CPU phase filed in ISSUES #152).
- **Decisions (reversible, in D3 / D4 scope):** RAIN_CONTINUES words are a non-consuming per-event read (no policy bump; the
  80-draw step shortfall is documented in docs/presentation-rng.md); a consumer whose order comes through a words marker counts as
  faithful random per command; Faint Attack renders the dominant phase per attacker side.
- **Next:** ROADMAP S10A "Next (2026-10-09 morning)" — land prep50 first (banked: status-animation allocator net-zero, +55 / +6,302), then the remaining order-host stops,
  FRZ / status2 allocator units, case-local gates (Blizzard impact age), x2-tracker rows, ISSUES #152 remainder.
- **Notes:** no DEFERRED entries. Soak gates superseded for S10A (ANIMATION_VERIFICATION scoped policy). All worker branches
  merged, worktrees removed; briefs + logs under `.integration/validation/*-20261009/`, worker transcripts `.codex-logs/workers/`.

---

## 2026-10-08 (overnight) — S10A: Substitute presentation, deferred order lend, live-share census, order plans; 245 + 13 + 18

- **State:** local master, production src tree `e3fc2240` (`65dec33c2`): 245 scoped-exact + 13 faithful-random +
  18 faithful-timing (census `245+13+18+0+0=276`; exact fell from 250 only by honest D4 reclassification of Crunch,
  Psychic, Extreme Speed, Pursuit, Hidden Power). Supervisor final gates on that code: typecheck, 1,573 files / 12,958
  tests, build 874, differential 624/624 (`final-supervisor-gates-20261008.json`). Preview <http://127.0.0.1:5191/>
  serves `a7896ad37` (4 samples hash-equal, export + restart, no errors; `playable-preview-a7896ad37-receipt.json`).
  Ordinary-play live share (new census, 1000 battles): 77.7 % of move animations by count, 78.8 % by frames
  (72.6 / 75.2 % at src `d15bc413` mid-session); gameplay command sequence identical (200 battles, 5,334 commands).
- **Did (production, 9 folds, each re-proved from fresh probes):** Substitute swaps live around 53 subbed-attacker
  cells (+ tail latch, shiny decline); 37 defender-doll cells; the fade (cursor footprint excluded); Substitute body
  order-neutral; seam-resolved deferred sprite-order lend -> Ice Ball counters 1..4; audit-13/14 fixes (idle-rest
  opponent attacker in Ice Beam / Thunderbolt / Sludge (Bomb) / Confuse Ray / Bite, fade row-0 shadow); D4 entries
  (Crunch, Psychic, Extreme Speed, Dive CLAMPERL, Pursuit later bodies, Hidden Power); Flatter / Skill Swap gates;
  NIDORAN healthbox symbol; missing sides (Double Team opp, Faint Attack opp, Rock Slide player); prep43 order plans
  (CONFUSION, PRZ survivor fix, Leech Seed drain, sandstorm, Dig / Brick Break turn-keyed).
- **Did (evidence, 9 merges):** prep38 / prep39 / prep40 / prep41 / prep43 / prep44 (50 allocator NET-ZERO bodies ready,
  +0.9 pp), species audits 13 / 14, live-share census (`tools/integration/liveShareCensus.ts`, `docs/live-share-census.md`).
- **Next:** ROADMAP S10A "Next (2026-10-08 morning)": rerun the census, then the remaining order-host stops (Giga Drain,
  hail, rain, locked turns, opponent return to ball), land prep44's allocator NET-ZERO ids, ISSUES #152 remainder,
  Substitute remainder, Ghost Curse provider / Dive attack.
- **Notes:** no DEFERRED entries. Soak gates superseded for S10A (ANIMATION_VERIFICATION scoped policy). All worker
  branches merged, worktrees removed; logs `.integration/validation/*-20261008/` (raw probe dumps pruned).

---

## 2026-10-07 (day) — S10A finish run: D4 implemented; census COMPLETE 250 + 13 + 13 + 0 = 276

- **State:** local master, production src tree `e1a47502` (`46319b2d9`): 250 scoped-exact + 13 faithful-random +
  13 faithful-timing live adapters; 0 accepted Factory bodies without a live adapter (census `250+13+13+0+0=276`).
  Final independent gates on that code: typecheck, 1,562 files / 12,816 tests, build 872, differential 624/624
  (`final-supervisor-gates-20261007-evening.json`). Preview <http://127.0.0.1:5191/> serves `2a3f8398c` (4 samples
  hash-equal, session export + ON->OFF restart passed, no errors; `playable-preview-2a3f8398c-receipt.json`).
- **Did:** D4 faithful timing (`src/engine/liveMoveTimingPolicy.ts`, disjoint accounting, checker that fails on
  undocumented residuals / missing phase labels). New adapters: timing — Mach Punch, Megahorn, Revenge, Meteor Mash
  (D3), Psywave, Extrasensory, Superpower, Nightmare, Ice Ball counter 0 (D3), Dive setup (D3), Skill Swap; exact —
  Spit Up, Shock Wave, Extreme Speed, Memento, Eruption, Substitute body; random — Flatter. #151 closed by
  reclassifying Sheer Cold / Hyper Voice to faithful timing. Presentation-only Substitute doll field state + shared
  declines. Species audits 9-12: Mach Punch / Extrasensory idle rest, Revenge / Spit Up gates, Dive setup length,
  Substitute shiny gate — all fixed (NIDORAN healthbox symbol + two over-strict gates open in #152). Evidence prep30-37. 12 integration folds + 13 evidence merges, each re-proved by the supervisor (every
  claimed window rerun twice fresh, own differential, union checks); zero reverted folds.
- **Next:** ROADMAP S10A "Next (2026-10-07 evening)": Substitute swaps / fade; deferred post-body order lend (Ice Ball
  counters 1..4, Dive attack); ISSUES #152 remainder (NIDORAN healthbox symbol, Flatter / Skill Swap gates) + new D4 lag cases (Extreme Speed, Dive
  CLAMPERL); D4 widening (Pursuit later bodies, Hidden Power, Ghost Curse).
- **Notes:** no DEFERRED entries. S10A stage box left open on purpose: every accepted body now has a live adapter,
  but many are scoped (first body / known lend / declines) and the resume list is real continuation work. Decision
  recorded: the engine/animation boundary ratchet now lets `battleCommandFieldArt.ts` import the static doll asset
  (presentation only). New ISSUES #153 (Scene OFF skips the Substitute body; kernel-owned). Soak gates superseded for
  S10A (ANIMATION_VERIFICATION scoped policy). All worker branches merged, worktrees removed; logs
  `.integration/validation/*-20261007*/`.
