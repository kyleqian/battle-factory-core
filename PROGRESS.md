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

---
## 487 — [BOUNDED WORKER 2026-07-26 ~22:00] assigned step already done — verified, not redone

- **State:** tree unchanged at **230 files / 3124 tests**, build green,
  census unchanged **92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted** (reran the census tool live: byte-identical, no
  diff). No code commits this session — the assigned step turned out to be
  fully complete already; only this doc/ledger correction is new.
- **Did:** was briefed to (rung 1) register `B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE`/
  `B_SCR_OP_BICBYTE`/`B_SCR_OP_ADJUSTSETDAMAGE` and (rung 2) wire seam
  window 3 (`turn5-rockslide.json`'s attack branch) per
  `docs/presentation-seam-scout.md` §9.4. Both rungs were **already landed**
  in `PROGRESS-archive.md` entries 464 (`4758e8c`, the 3 opcodes,
  EFFECT_ENDEAVOR executable) and 465 (the full §9.4 wiring: real
  `MOVE_ENDEAVOR` staging, `drawTurn5EndeavorText`, `drawTurn5RockSlideWindow`'s
  attack branch, `drawTurn5RockSlideAttack`'s `rockSlideOpponentHp` `to`
  endpoint) — both from earlier the same day, well before this ledger's
  current top-3 entries. Confirmed by reading the current source directly
  (`battleScriptSetByte.ts`'s `createBattleScriptBicbyteCommandHandlers`,
  `battleScriptHitChainOpcode.ts`'s `adjustsetdamage`/
  `setdamagetohealthdifference`, `battleScene.ts:7049-7063,7541,11885-11893`
  all matching entry 465's own description exactly, down to the named
  residual gap), then re-ran the full acceptance bar live: `npm test`
  230/230 files, `npm run build` clean, `npm run compare -- turn5-rockslide.json
  --summary` **256/256**, `turn1-rockslide.json` **256/256**, `turn5-faint.json`
  **110/110** — all match entry 465's own recorded numbers exactly, zero
  regression. Root-caused why the brief re-assigned finished work: entry
  468 correctly scoped the one still-open remainder as "seam-scout §9 items
  **1/5**" (the `anchorOpponentAfterTurn4Hp` `from`-endpoint gap, entry
  465's own named residual — needs a new turn-4 settle staging module, not
  a redo of §9.4's plan); that `1/5` qualifier was silently dropped across
  entries 484-486's carried-forward Next notes, reading as if all of §9
  were still open. Added a status note to `docs/presentation-seam-scout.md`
  §9's own top (pointing at entries 464/465 and the real remainder) so this
  doesn't recur.
- **Next:** the ONE real remaining item from the original §9 scope: a
  turn-4 RockSlide-settle staging module to give `anchorOpponentAfterTurn4Hp`
  a non-circular staged proof (currently a literal, entry 465's own named
  gap) — NOT another pass at rungs 1-2. Otherwise, entry 485's own Next list
  stands unchanged: EvasionUp/EvasionDown/weather-trio pairs (last 6 of 22
  CV handlers), §19.5's unstaged AccuracyDown sites 2-6, §18 5-6-draw window
  discrepancy, ENDTURN_ITEMS2 after Yawn/Thrash, `SpDefUp`/§23 DRAW SITE
  recipe-only leftovers.
- **Notes:** no PAPERCUT in the harness sense, but flagging the process gap
  for the supervisor: carried-forward "Next" notes that summarize a doc
  section by name (e.g. "seam-scout §9 items") lose precision fast when
  re-summarized entry over entry — prefer naming the exact remaining
  sub-item (as entry 468 originally did) over the section name alone.

---
## 486 — [SUPERVISOR SESSION START 2026-07-26 ~21:55] orient + animation fold

- **State:** folded `animation-main` into master at orient (fast-forward to
  `f422a97` — their baseline merge of master plus 2 Knock Off commits:
  `96dfd06` partial seam wiring, `f958878` player OAM transfer fix). Union
  verified green: **230 files / 3124 tests**, `npm run build` clean, both
  oracle services fresh (`check-oracle-freshness.sh` PASS). The animation
  supervisor session is LIVE concurrently (started 21:50); commits it lands
  after `f422a97` fold next orient.
- **Session plan (paired rounds):** main lane consumes the banked seam §9
  prep (register the 3 ENDEAVOR opcodes, then wire window 3
  `turn5-rockslide.json` attack branch per `docs/presentation-seam-scout.md`
  §9.4); side lane prep-scouts §24 EvasionUp/EvasionDown ground truth (the
  largest remaining CV handler, 8 draw sites). Then port §24, stage the
  weather trio (§25, incl. the CBM weather-entry verification §5 flagged),
  and continue down entry 485's Next list as rounds allow.

---
## 485 — [SUPERVISOR WIND-DOWN 2026-07-26 ~21:20] session summary

- **State:** tree committed and green at **230 files / 3123 tests**, build
  green. Census **92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted** (session start: 90/214, 185/355, 148/276,
  1830/2957), all 32 self-checks pass. Single main worktree, zero unmerged
  side branches, zero stale worktrees, clean `git status`. **No DEFERRED
  entries — nothing blocks the next `run-supervisor.sh`.** No usage/rate
  limits; all 5 workers ran to completion.
- **Session (3 rounds / 5 workers over 2 lanes + 1 supervisor fix + 1 fold):**
  - **Round 1:** Counter/Mirror Coat registered end-to-end (entry 482,
    ISSUES #46 closed, +54 weighted, supervisor-rerun live probe all 8
    scenarios PASS) ∥ side §22 ground truth (CosmicPower/CalmMind +
    `AI_CV_SpDefUp`, 4 fixtures, supervisor-rerun verify ALL PASS, Gate F
    `if_in_bytes` inversion re-verified against raw assembly).
  - **Round 2:** §22 pair ported (entry 483, ninth pair, 27 tests) ∥ side
    §23 ground truth (LightScreen/Reflect, 4 fixtures, supervisor-rerun
    ALL PASS + assembly spot-check of the twin CV bodies/type lists).
  - **Round 3:** §23 four-handler pair ported (entry 484, tenth pair,
    29 tests, 13.8 min).
  - **Supervisor fix (`c4ea1d6`):** round-3 worker flagged that entry 483's
    `spDefStage` was never wired into `factoryAiDecisionPolicy.ts`'s
    `attackerForCbm` — maxed SPDEF could not reach the CosmicPower/CalmMind
    -8 gates in real decisions. Wired + mask-1 regression test (mask 7
    can't isolate it: `AI_CV_SpDefUp` reads the same stage for its own -1).
  - **Animation fold (wind-down):** `animation-main` (7 commits: psychic
    orientation closure, Knock Off components) merged into master; union
    suite 230/3123 + build green. The animation supervisor was still
    mid-session at fold time (worker `animation-20260726-205051` live);
    commits it lands after `960b6b9` fold next session.
- **Next (in order):** EvasionUp/EvasionDown/weather-trio pairs (the last
  6 of 22 CV handlers — LightScreen/Reflect done this session); §19.5's
  unstaged AccuracyDown sites 2-6 (mixed movesets); §18 5-6-draw window
  discrepancy (now recurring for `SpDefUp` too, §22.3-22.4 — probe
  candidate, sRandCount attribution); ENDTURN_ITEMS2 after Yawn/Thrash;
  `SpDefUp`/§23 DRAW SITE recipe-only leftovers. Seam — turn-4
  `anchorOpponentAfterTurn4Hp` staging gap + seam-scout §9 items (carried
  from entry 468, untouched again — AI-pair track was prioritized).
- **Notes:** zero PAPERCUTS flagged by any worker. Established cadence
  held: paired rounds (main port ∥ side prep-scout for the next pair),
  supervisor-verified every merge with own reruns. Oracle services fresh
  all session.
