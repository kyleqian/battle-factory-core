# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 932 — [bounded MAIN worker, 2026-08-05 ~04:10] Post-terminal slice 1 landed: shared 108-tick return-to-field span, WIN 389/389→503/503, LOSS 236/236→350/350

- **State:** master + this commit. `npm test` **725 files / 6,958 passed / 1
  skipped**, `npm run build` green. Both compare windows extended and
  twice-run byte-identical: `win-terminal-window-off` **503/503**,
  `loss-terminal-window-off` **350/350**.
- **Did:** implemented `docs/post-terminal-return-to-lobby-ground-truth.md`
  §5 slice 1 (dismiss+8→dismiss+115, 108 shared ticks) as ONE
  outcome-agnostic mechanism, no WIN/LOSS branch. Reused the existing
  (previously Turn17-canonical-only) `postwin.ts` phase machine
  (`postwinPhase`, `POSTWIN_BATTLE_FADE_FIRST_AGE`/etc. — all unchanged) for
  both outcomes: `createPostwinStateFromRound` (WIN) and new
  `createBattleReturnHoldState` (LOSS/roundCompleted) both start `elapsed`
  at 1 (this route's real dismiss press is 2 ticks vs. Turn17's 1 — RAM/
  pixel-derived this session, not guessed). Added a `frozenSceneView`
  fallback to `renderPostwinState`'s battleHold/battleFade phases for
  Battle Scene OFF (`state.battleScene` is always null there); the fade
  reuses the real `BeginFastPaletteFade` BG/OBJ-alternating-update schedule
  (new `applyFastFadeToBlack`/`fastFadeUpdatesForLocalTick` exports in
  `battleScene.ts`, extracted from the existing Turn17 fade function) over a
  mask built from the OFF scene's own draw calls plus the settled
  trainer-slide sprite (new `drawBattleResolutionSceneOffFadeMask`).
  `render()` now checks `state.postwin` (while not yet phase `counterRoom`)
  ahead of `factoryTerminal` so LOSS's shared span renders before its own
  out-of-scope Lobby content; found and fixed a bug where `factoryTerminal`'s
  own tick() branch froze `postwin`'s clock forever by never advancing it.
  Tier-1 pin: `tests/factoryBattleReturnPresentation.test.ts` (4 tests —
  shared elapsed start, every doc-cited phase boundary, a full 114-tick
  lockstep WIN/LOSS phase walk, the fade BG/OBJ schedule); the elapsed-start
  and fade-schedule pins were red-verified this session (flipped
  `GENERATED_ROUTE_INITIAL_ELAPSED` 1→0 and the `objUpdates` formula,
  watched 2+1 tests fail, reverted). ISSUES #73 updated in place — its stale
  final paragraph (party-identity gap) corrected to note that fix already
  landed generically; new paragraph records this slice's close.
- **Next:** slices 2–4 of the same doc's §5 plan (all past dismiss+115,
  where WIN's PreBattleRoom and LOSS's Lobby genuinely diverge): LOSS's
  Lobby arrival + first message + held-cursor dismiss (frame 3346→3834),
  LOSS's restore/save wait + record prompt (→4938), WIN's PreBattleRoom
  arrival + heal message (→5202). Each needs its own new scratch/compare
  fixture extension per that doc's own proof plan.
- **Notes:** the elapsed-alignment constant (Factory route starts 1 tick
  later than Turn17's own convention, both real dismiss-press-length facts)
  was the load-bearing find this session — once identified, the existing
  `postwin.ts`/`battleRoomRender.ts` machinery needed almost no new pixel
  logic, just the OFF-profile frozen-scene fade path and the mask's missing
  trainer-slide sprite. `PAPERCUT:` `npm test` needs run in the foreground
  with an explicit large `timeout` (not the 120s default) or the harness
  auto-backgrounds it — confirmed again this session (~9 min actual
  duration); one attempt was accidentally interrupted mid-run by an
  unrelated `pkill` before being redone cleanly.

---
## 931 — [supervisor wind-down, 2026-08-04 ~19:55] Session close: #74 closed + WIN window 389/389 + selection-rejection slice landed & ROM-verified + post-terminal ground truth banked; final union 724 files / 6,954 green

- **State:** master `fd8910a5` + this docs commit. Final independent union:
  full `npm test` **724 files / 6,954 passed / 1 skipped**, `npm run build`
  green. Windows: WIN **389/389**, LOSS **236/236**, YOSHI **700/751** /
  MAGNETON **703/751** (baselines restored). Play-preview worktree advanced
  to `fd8910a5`, rebuilt, serving 200 on :5199. Working tree clean. **No
  open DEFERRED entries.** Worktrees: only the permanent `animation-main`
  (whose own live session has a worker at `animation-20260804-193008` —
  theirs to clean) and the intentional `play-preview`.
- **Session totals:** 3 rounds, 6 workers (3 main / 3 side), 0 lost, all
  landed. #74 CLOSED (`MATERIALIZE_Y2_TABLE` 11-of-12 tail-tick, RAM-
  confirmed, prediction-pinned exact restore). #73: WIN 65/65→389/389
  (pure data; quote hold + real dismiss), scaffold party-identity crash
  fixed generically (`hp:0`), and the REAL remaining blocker mapped —
  post-`finishBattle` presentation timing (probe doc §6). #72 fully
  settled: option-(b) advisory slice (six-cause resolver, 4 STRINGIDs,
  20 red-verified tests) + 3 of 4 causes ROM-verified byte-for-byte
  (Torment, Choice Band, no-PP; PKMNHASNOMOVESLEFT staging cost
  documented). Post-terminal return ground truth banked
  (`docs/post-terminal-return-to-lobby-ground-truth.md`): mid-streak WIN
  → PreBattleRoom (not Lobby), 108-tick shared fade/warp sequence,
  5-slice implementation plan. TWO animation folds (STEEL_WING 108/276,
  TAIL_WHIP 109/276 exact) — second fold resolved the
  `factoryAnimationInventory` pin conflict to the coverage-JSON side
  (109), after R3 caught the STEEL_WING fold's stale pin (107→108).
- **Next session (recommended order):** (1) post-terminal presentation:
  the scout's 5-slice plan — slice 1 (shared 108-tick fade/warp machinery)
  proves on BOTH windows from one implementation; slice 4's `postwin.ts`
  creation-gate investigation (`core.ts:577-604`) unlocks WIN. (2) #73
  window extensions ride on those slices. (3) #71 §1e + coordinated
  hand-fit retirements. Standing: #39, #55.
- **Notes:** animation-fold verification now needs
  `tests/animation/factoryAnimationInventory.test.ts` explicitly (stale
  coverage-summary pin is a 2-occurrence class). Never merge into the main
  tree while a suite runs there (killed my own background suite before the
  TAIL_WHIP fold). Oracle-freshness FAIL at orient was the docs-only
  false-positive class again. PAPERCUTS: line-pin census entry added;
  full-suite timeout entry bumped to Hits: 6.

---
## 930 — [bounded MAIN worker, 2026-08-04 ~19:45] ISSUES #72 oracle-verification gap closed for NOPPLEFT + ITEMALLOWSONLYYMOVE; PKMNHASNOMOVESLEFT skipped (documented)

- **State:** master + this docs commit. `npm test` green (see final gate
  below), `npm run build` green. No `src/` changes — both resolvers already
  matched the real ROM.
- **Did:** staged two `mechanicLab overrides.parties` battle-scene-off
  traces (`tools/battle-lab/mechanic-selection-reject-{choice-band,no-pp}-
  off.json`) and read the captured PNG text directly, cross-checked against
  the manifest's semantic `pp` state to confirm the staged precondition.
  **ITEMALLOWSONLYYMOVE:** CHANSEY holds Choice Band, turn 1 TACKLE
  (locks), turn 2 attempts GROWL — ROM prints "CHOICE BAND allows the / use
  of only TACKLE!" byte-for-byte matching the resolver and its existing
  Tier-1 pin. **NOPPLEFT:** CHANSEY's SUNNY DAY (5 PP, the cheapest
  depletable move short of Sketch) genuinely exhausted 5→0 PP over 5 real
  turns (`overrides.parties` can't inject PP — it's always ROM-derived from
  base PP × PP Ups), then reselected with TACKLE still legal so the menu
  stayed open — ROM prints "There's no PP left for / this move!"
  byte-for-byte matching the resolver. Both MATCH, no src fix needed.
  Receipts banked: `docs/probes/selection-rejection-oracle-verification/`
  (README + both PNGs). ISSUES #72's oracle-verified paragraph extended in
  place. **PKMNHASNOMOVESLEFT not attempted** — needs all four move slots
  at 0 PP simultaneously (4×5=20 turns via the cheap-status-move vehicle, or
  a riskier 4-turn Sketch path gated on an unverified speed-ordering
  argument); documented precisely in the probe doc's closing section for a
  future step with more headroom.
- **Next:** #72's settled record is now fully oracle-verified except
  PKMNHASNOMOVESLEFT (open, low-priority — advisory-only text, never
  reachable through this engine's own `submitBattleDecision` boundary
  today). Next candidate: verify a speed-ordering fixture (player IVs/nature
  vs. a slow opponent) once, then stage the 4-Sketch-turn NOPPLEFT-shaped
  trace for PKMNHASNOMOVESLEFT.
- **Notes:** confirmed the Torment probe from `05d7dccf` never banked its
  trace/PNGs to disk (checked `docs/probes/`, git history, and
  `tools/battle-lab/` — nothing matches its BUTTERFREE/MURKROW scenario);
  this step's own two receipts are the first banked selection-rejection
  oracle evidence on disk. `PAPERCUT:` none new this step — the flagged
  `BattleScriptPartyMemberInput.moves`-defaults-PP-to-0 papercut didn't
  apply here (that's the bench-party-member override path; `overrides.
  parties`' active-battler PP derivation used throughout this step is a
  different, already-correct code path).
