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
## 488 — [BOUNDED WORKER 2026-07-26 ~22:30] turn-4 ROCK_SLIDE settle staged + wired — presentation-seam §9's last residual gap CLOSED

- **State:** tree committed and green at **231 files / 3131 tests** (+1
  file/+7 tests over entry 487), `npm run build` clean. Census unchanged
  (reran `tools/report/executable-frontier-census.ts` live: byte-identical,
  no diff — **92/214 effects, 187/355 moves, 150/276 Factory-L50, 1884/2957
  weighted, all 32 checks pass**); `executableFrontierRatchet.test.ts`'s
  per-module barrier counts unmoved (6/6 green, no new barrier — this step
  touches no unsupported-branch code). Two commits: `65f2f4d` (rung 1,
  staging module + tests) and the rung-2 wiring commit (`battleScene.ts`).
- **Did:** closed the ONE real remaining item of the presentation-seam §9
  program (entries 465/468/487's own named residual: `anchorOpponentAfterTurn4Hp`'s
  `from`-endpoint had no staged proof).
  - **Rung 1:** `src/engine/turn4RockSlidePresentationStaging.ts` (new),
    mirrors `turn1RockSlidePresentationStaging.ts` verbatim — stages a real
    Onix ROCK_SLIDE → Grovyle hit chain (41 → 1, 40 damage, non-crit,
    non-faint) through the unmodified `resolveRockSlidePresentationWindowContent`
    bridge. **The RNG seed (3051035979) is turn 4's own real recorded value**,
    not fabricated: derived from `battle1-grovyle-faint-ram-dump.json`'s own
    `rngLedger` (already committed/already imported for
    `anchorPlayerAfterTurn3Hp`/`anchorOpponentAfterTurn3Hp`) — specifically
    its four single-step entries at ticks 5316/5340/5343/5569 — independently
    corroborated by `battleScene.ts`'s own already-committed
    `drawTurn4KickoffText` doc comment, which separately cites the identical
    three ticks for accuracy/crit/damage-lock rolls. Staging it reproduces
    41 → 1 byte-identical, ending exactly at the ledger's own next recorded
    value. 7 new Tier-1 tests (event sequence, message content, hp-change
    endpoints, health-bar delta, bridge resolution, no faint-family event).
  - **Rung 2:** wired every mandatory consumer named in the brief —
    `drawTurn4RockSlideAttack`/`drawTurn4RockSlideTurnEndSettledMenu`'s
    `rockSlideOpponentHp`/`opponentHealthboxContentForHp` calls,
    `drawTurn4RockSlideWindow`'s attack text (now
    `TURN1_ROCKSLIDE_ATTACK_LINE1/2`, byte-identical content per §9.3 — it
    was still raw `ROCK_SLIDE_LINE1/2` literals), and **the residual gap
    itself**: `drawTurn5RockSlideAttack`'s own `rockSlideOpponentHp` `from`
    endpoint now reads the staged settle instead of the bare literal — not
    circular (the turn-4 module stages Grovyle's PRE-turn-4 hp and computes
    ITS OWN settle independently). Also did the OPTIONAL item:
    `drawMenuIdleBaseWithOpponentHp`'s `turn4Resolved` arm (turn2/turn3 arms
    untouched, per scope). `anchorOpponentAfterTurn3Hp`/`anchorOpponentAfterTurn4Hp`
    both kept (still read by turn 3's own window and `drawEndeavorSquish`'s
    steady-state read respectively — only the re-driven reads were retired).
  - Updated `docs/presentation-seam-scout.md` §9's own top status block with
    a second STATUS UPDATE note recording closure (matching entry 487's own
    precedent of correcting stale carried-forward summaries at the source).
- **Acceptance (all live this session, oracle `127.0.0.1:8014`):**
  `npm run compare -- turn4-rockslide.json --summary` **250/250** (recorded,
  `docs/battle-turn-notes.md`); regression sweep, **zero drops**:
  `turn5-rockslide.json` **256/256**, `turn1-rockslide.json` **256/256**,
  `turn5-faint.json` **110/110**, `turn4-doubleteam.json` **250/250**
  (confirmed pre-existing/unaffected by diffing against the rung-1 commit
  before any rung-2 edit — `docs/battle-turn-notes.md`'s own `249/249`
  mentions are stale copy-paste from an older trace revision, not a
  regression target), `turn4-menu.json` **44/44**, `turn3-rockslide.json`
  **256/256**.
- **Next:** presentation-seam §9 is now FULLY CLOSED — no more items in that
  program. Resume entry 485/487's own carried Next list: EvasionUp/
  EvasionDown/weather-trio pairs (last 6 of 22 CV handlers); §19.5's unstaged
  AccuracyDown sites 2-6; §18 5-6-draw window discrepancy (recurring for
  `SpDefUp` too, §22.3-22.4 — probe candidate, sRandCount attribution);
  ENDTURN_ITEMS2 after Yawn/Thrash; `SpDefUp`/§23 DRAW SITE recipe-only
  leftovers.
- **Notes:** no PAPERCUT. Sourcing the RNG seed from an already-committed
  asset (rather than a fresh/uncommitted probe, the pattern §9.1 flagged as
  a debt for the OTHER three turn-4/5 HP constants) is worth naming as a
  reusable technique for `anchorPlayerAfterTurn5Hp` if that one is ever
  tackled — it too may have a real ledger hiding in an already-imported
  fixture rather than needing a fresh probe.

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
