# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 935 — [bounded MAIN worker, 2026-08-04] #73 LOSS slice 2 CLOSED end-to-end: player residual removed, `loss-terminal-window-off` extended and exact **839/839** through frame 3834

- **State:** master `85a69357` + this entry's commit, clean. Supervisor final
  gate: full `npm test` **727 files / 6,968 passed / 1 skipped** and
  `npm run build` green; worker smoke 347/347. Committed windows
  twice-stable: LOSS **839/839**
  (frames 2996-3834, byte-identical across two fresh runs), WIN **503/503**.
  Two red-verified Tier-1 pins (both fail with the old values stashed).
- **Did:** finished #73 LOSS slice 2 by removing the sole remaining player
  residual and extending the committed dense window through frame 3834.
  (1) **Player OAM anchor** — the generic Lobby object anchor's player-only
  `+1px x2` sub-pixel offset was erroneous: it drew the sprite at (113,56),
  reproducing the ~133px residual exactly; removed so every object event
  anchors at `tile*16 - cameraOriginPx` (player (4,8) + camera {x:-48,y:56}
  → (112,56)). The source-derived field + that player match oracle frame
  3365 with 0 differing pixels. (2) **Page-0 first-glyph age** —
  `FACTORY_LOSS_TERMINAL_PROFILE.firstPageTextAge` corrected **143 → 142**:
  the prior slice's scratch windows only covered page-1's span (3534+); a
  dense oracle re-probe of frames 3373-3375 shows the box opens at terminal
  age 141 and page-0's "T" lands at age 142, so the old 143 delayed every
  page-0 typing (3374-3403) + cursor phase (3412-3529) frame by one tick.
  The committed trace's segments were restored to the fixture's own real
  schedule through cumulative 3834 (segments 0..41, buttons unchanged — the
  committed window's tail had truncated the fixture at segment 39/3345) and
  `captureFrames` extended contiguously 2996..3834 (839 frames). No
  generated asset/extractor edit: `factory-lobby-terminal-npcs.json` already
  carried the exact north-facing Brendan frame 1 + palette (the supervisor's
  evidence; the "different player asset needed" claim is retracted).
  Tier-1 pins: player-unique pixels at source-derived positions
  (renderField, `factoryTerminalPresentation.test.ts`) + page-0 timing
  (`firstPageTextAge === 142`, visibleChars 0/1/2 at ages 141/142/143).
- **Next:** slice 2 is closed end-to-end. Slice 3 (restore/save + record
  prompt, whose 4054+ box-clear residual is already measured ~1,350px)
  rides on the corrected profile; slice 4 is WIN PreBattleRoom/heal.
- **Notes:** page-0 typing was never oracle-verified before this step (the
  scratch windows started at 3534), which is why the 143 constant survived;
  both corrections are pure terminal-presentation logic, inert in WIN
  (`exchangeNextPageVisualDelay`/roundWon profile untouched) — WIN re-ran
  503/503 after the change. Frame 3834 = the fixture's real page-1 A
  dismiss (terminal age 602), exactly slice 2's end; frame 3835+ is slice
  3. No absolute-frame/battle/fixture branch added. The bounded worker hit
  its cap during its redundant final full-suite run and produced no commit;
  the supervisor audited the diff, reran both committed oracle windows plus
  the full suite/build, and committed the intact bounded result.

---
## 934 — [bounded MAIN worker, 2026-08-04] #73 slice-2 page-transition residual resolved: `nextPageVisualDelay` 6→2 makes the whole LOSS page-1 window exact

- **State:** master `44ce0508` + this docs commit, clean. Full `npm test`
  **727 files / 6,966 passed / 1 skipped** (+2 new Tier-1), `npm run build`
  and `npm run typecheck` green, `npm run test:smoke` 347/347. Committed
  windows twice-stable: LOSS **350/350**, WIN **503/503**. New tests
  red-verified (both fail with the old value stashed).
- **Did:** #73 slice-2 residual class (3) — the 3535-3537 page-1 box
  clear/reopen — is FIXED and far more: `FACTORY_LOSS_TERMINAL_PROFILE.
  nextPageVisualDelay` is **2, not 6**. A dense 1-tick re-probe of the
  committed LOSS fixture (frames 3534-3600) showed the earlier "page-1
  typing 182-898px" + "printer pause cadence" measurements were artefacts of
  the wrong delay: the real printer types page-1 **1 glyph/tick, no pauses**
  (the "no-change" frames are exactly the two invisible spaces), and the
  "3-tick box clear/reopen" at 3535-3537 is page-1's opening "I " printing
  onto the box frame itself (the serif-I pixels are the frame's own, so the
  box reads empty 3535-3536, first visible "w" at 3537). With
  `nextPageVisualDelay=2` the generic activePage/pageTextFirstAge flip lands
  at the real release+2 edge and the existing 1-char/tick model reproduces
  **every frame 3535-4053 (page-1 typing + cursor + dismiss + page-2 typing
  + cursor) at 0 diff outside the out-of-scope player sprite**, twice-run
  byte-identical on scratch windows (3534-3660, 3590-3845; the 4054+
  record-prompt box clear is slice 3). Added the first-class source-relative
  `FactoryTerminalPageVisualPhase` (`idle`/`typing`/`held`/`cleared`,
  `factoryTerminalPageVisualPhase`) documented against text.c
  RENDER_STATE_CLEAR; render's page cursor gated on it. Two red-verified
  Tier-1 tests (timing + render-state) in
  `tests/factoryTerminalPresentation.test.ts`. ISSUES #73 updated (corrected
  the "pause cadence" attribution; closed classes 2+3; recorded the exact
  span).
- **Next:** slice 2 is now exact to frame 4053 (minus the player sprite);
  the remaining #73 slice-2 work is the out-of-scope player sprite
  extraction, then slice 3 (restore/save + record prompt, whose 4054+
  box-clear residual is already measured ~1,350px) rides on the corrected
  profile; extend `loss-terminal-window-off` past 3345 once the player
  sprite is resolved.
- **Notes:** the committed trace's capture window was NOT extended (it ends
  before the page-0 dismiss; a red committed window would misrepresent the
  state) — the exactness beyond 3345 is proven by the uncommitted scratch
  windows listed above. `nextPageVisualDelay` is LOSS-only (WIN uses
  `exchangeNextPageVisualDelay`), so the WIN route is untouched; the change
  is inert in both committed terminal windows (they end at dismiss+115,
  before any page flip).

---
## 933 — [bounded MAIN worker, 2026-08-04] #73 slice-2: Lobby arrival mapped dense, field renderer + LOSS profile recalibrated to the real route

- **State:** master `55bd3231` + this docs commit, clean. `npm run
  test:smoke` green (347/347), `npm run typecheck` clean, targeted terminal/
  roundController suites green (78 tests). Committed windows still
  twice-stable: LOSS **350/350**, WIN **503/503** (re-run after the render
  change). Full `npm test` NOT re-run this session (time-capped; see Notes).
- **Did:** #73 slice-2 work per ISSUES #73. (1) Dense 1-tick oracle probe of
  the committed LOSS fixture's 3346-3834 mapped the real Lobby arrival
  schedule (fade 114-128, box+page-0 typing 141-170, cursor 171-302, real
  A-dismiss 300, page-1 typing 306-365, cursor ~366-601, real A-dismiss 602;
  terminal age = frame − 3232). (2) `renderFactoryTerminalField` now renders
  at the layout's own `cameraOriginPx` ({x:-48,y:56}) instead of the staged
  probe's bgOriginX=16, and object-event sprites use the source 16x32
  feet-anchor (box top = tile*16 − cameraOrigin − 16, +1px player x2) —
  field tiles + fatMan/woman/scientist now pixel-exact (0 diff at frame
  3361; sprite residual 26014 → ~133 px = the player only). (3)
  `FACTORY_LOSS_TERMINAL_PROFILE` recalibrated to the real schedule
  (fieldFirstAge 114, messageFrameAge 141, firstPageTextAge 143,
  firstPageInputReadyAge 171, nextPageVisualDelay 6); the four LOSS
  state-machine pins in `factoryTerminalPresentation.test.ts` +
  `interactiveRouting.test.ts` re-based to the real release edges
  (+171/+238/+524/+288/+547/+549). The prior scout doc's "walk-cycle" is
  actually the page-0 held-cursor blink (lockall freezes all NPCs — no walk
  animation needed). Dense scratch compare over 3346-3834: fade 37-133 px,
  page-0 typing 133-175, page-1 typing 182-898, page-1 cursor 133-229.
- **Next:** #73 slice 2 residual classes: (1) the player sprite (~133 px
  everywhere) — the oracle renders the save's actual player character, not
  the source-derived Brendan walking frame 1; extract the oracle's real
  player graphic. (2) the page-1 `RenderText` printer pause cadence
  (text.c:941-961). (3) the page-1 box-open 3-tick transition (905 px at
  3535-3537). Then extend `loss-terminal-window-off` past 3345. Slice 3
  (restore/save + record prompt) rides on the recalibrated profile.
- **Notes:** honest contiguous exact checkpoint remains frame 3345
  (350/350); the committed trace's capture window was NOT extended (a red
  committed window would misrepresent the state). Residual classes above are
  the documented gap between 3345 and the slice's 3834 target. The
  `factoryTerminalRender.ts` camera/object change is inert in both committed
  terminal windows (both end at dismiss+115, never rendering the lobby).
  `npm test` full run deferred to the next session.

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
