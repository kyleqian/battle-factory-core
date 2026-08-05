# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 933 — [bounded MAIN worker, 2026-08-04] #73 slice-2 exact-foundation: Lobby arrival mapped dense, field renderer moved to the real warp camera

- **State:** master `b1c8ad28` + this docs commit, clean. `npm run
  test:smoke` green (347/347). Committed windows still twice-stable: LOSS
  **350/350**, WIN **503/503** (re-run both after the render change). Full
  `npm test` NOT re-run before this commit (see Notes); `npm run build`
  green at the prior commit.
- **Did:** bounded slice-2 groundwork per ISSUES #73. Dense 1-tick oracle
  probe of the committed LOSS fixture's frames 3346-3834 mapped the real
  Lobby arrival schedule (fade-in 114-128, box+page-0 typing 141-170,
  cursor 171-302, A-dismiss 300, page-1 typing 306-365, cursor ~366-601,
  A-dismiss 602; terminal age = frame − 3232) and corrected the shared
  lobby renderer to the real warp camera: `renderFactoryTerminalField` now
  defaults to `cameraOriginPx` ({x:-48,y:56}) instead of the staged probe's
  hardcoded bgOriginX=16, and object-event sprites anchor through the same
  camera with the source `centerToCornerVec` feet-anchor (+1px player x2).
  Verified against the oracle at frame 3361: field tiles 0 diff outside the
  sprite silhouettes; sprite residual dropped 26014 → 1095 px (three blobs,
  pose/anchor pixels still to fit). The prior scout doc's "walk-cycle" is
  actually the page-0 held-cursor blink (lockall freezes all NPCs — no walk
  animation needed). Both committed terminal windows end exactly at
  dismiss+115, so the camera change is inert there (350/350 + 503/503
  re-verified).
- **Next:** #73 slice 2 continuation — recalibrate
  `FACTORY_LOSS_TERMINAL_PROFILE` to the banked real ages (field 114 / box
  141 / page-0 text 143 / input-ready 171 / page-1 text at release+6 /
  dismisses 300+602), re-basing `tests/factoryTerminalPresentation.test.ts`
  + `tests/interactiveRouting.test.ts` to the real route's release edges,
  and fit the three sprite silhouettes' remaining ~1095 px (pose frames +
  exact anchors) before extending `loss-terminal-window-off` past 3345.
  Then slice 3 (restore/save + record prompt) rides on the recalibrated
  profile.
- **Notes:** honest checkpoint is still frame 3345 (350/350) — no frame
  past it is byte-exact yet, and the trace's capture window was NOT extended
  (a red committed window would misrepresent the state). Residual classes
  past 3345: (1) staged-vs-real message timing, (2) three sprite silhouettes
  (player/woman/fatMan pose + anchor), (3) the ~1-2-tick printer pause
  cadence in page-1 typing. `npm test` full run was not re-run this session
  (time-capped); the render change touches no test-pinned output (the
  lobby-field data tests pin the layout JSON, unchanged).

---
## 932 — [supervisor, 2026-08-04 ~21:16] Shared post-battle return exact on WIN+LOSS; animation and beyond-boundary evidence folded

- **State:** master `ddbafa41` + this docs commit, clean. Independent folded
  union: full `npm test` **727 files / 6,964 passed / 1 skipped** and
  `npm run build` green. OFF windows are twice-stable: WIN **503/503**,
  LOSS **350/350**. No open DEFERRED entries.
- **Did:** accepted main commit `45f58e36`: one outcome-neutral 108-tick
  `postwin` return-to-field mechanism now drives both outcomes through
  dismiss+115, including the frozen Scene-OFF framebuffer fade, trainer OBJ
  mask, and the loss-path clock-advance fix; 4 red-verified Tier-1 pins.
  Folded `animation-main` at `5df68a9f`: IRON_DEFENSE is exact, coverage
  **110/276 exact / 0 partial / 166 unsupported**. Verified and merged side
  evidence `1d87393b`: WIN's heal/fanfare reaches the held GO ON menu at
  5739; LOSS record-NO reaches a second held farewell then genuine free-roam
  at 5093 (movement proven at 5174). Side worktree/branch cleaned.
- **Next:** #73 slice 2 only: extend LOSS contiguously through frame 3834 and
  implement the Lobby arrival, scripted movement, first return-rentals
  message, held cursor, and real dismiss edge. Then slice 3 continues through
  restore/save + record prompt; slice 4 is WIN PreBattleRoom/heal message.
- **Notes:** `check-oracle-freshness.sh` reported the known timestamp-only
  false positive: harness HEAD `5251112` changes only `NOTES.md`; live OFF
  service advertises bootstrap v5 and the required `overrides.parties`
  battle-lab contract. PAPERCUTS full-suite timeout hit bumped to 7.

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
