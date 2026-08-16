# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1293 — [main worker, 2026-08-16] **Both named call-scene residuals closed/advanced — attendant walk lead-leg pose fixed exact (callscene-01 119→131/131), boss-message page-turn render bug found + fixed (callscene-02 120→171/199)**

- **State:** Landed and green in two commits. `npm test` **1,056 files /
  9,978 passed / 223 skipped**, `npm run build` + `npm run typecheck`
  green.
- **Did (Goal 1, walk lead-leg pose — CLOSED exact):** `callSceneWalkFrame`
  assumed the walk-away (hFlip false) and walk-back (hFlip true) legs
  shared `sAnim_GoWest`/`GoEast`'s literal `ANIMCMD_FRAME(7,...)`-then-8
  order. Rendering both candidate leg-index orders against oracle pixel
  data (callscene-01 frames 447/429) showed the two legs actually diverge:
  walk-away is pixel-exact with 8-then-7, walk-back stays pixel-exact with
  the literal 7-then-8. Made the lead leg a per-direction parameter.
  callscene-01 dense compare **119/131 → 131/131** (was 89/131 pre-1292).
  Commit `7214005d`.
- **Did (Goal 2, page-turn press re-derivation — ADVANCED, not exact):**
  found the callscene-02 residual was not purely a fixture press-frame
  issue as 1292 concluded — a second, independent render bug:
  `CALL_SCENE_TEXT_FIRST_DELAYS[3]`/`[4]` (boxes 4/5's own first-glyph
  delay) used the generic 4-tick `POSTWIN_DIALOGUE_TEXT_FIRST_DELAY`
  instead of the same-window `\p` swap's real accept+1 rule (1292's own
  point 4), leaving the app blank 3 extra ticks after every page turn and
  skewing that whole page's typewriter schedule. Fixed by giving boxes
  3→4/4→5 their own 1-tick deferred bump (`CALL_SCENE_PAGE_TRANSITION_
  DELAY[2]`/`[3]`, reusing boxes 1/2's existing `callScenePendingElapsed`
  machinery) + firstDelay 0, oracle-confirmed via byte-identical capture
  hashes across local 805–813 (box 4 held) then a change at 814 (new
  content). Combined with re-deriving the box-3→4 press's own idle segment
  (`idle133`→`idle131`, -2 ticks, matching the canned route's oracle
  accept 1170) this closes the **entire** page-1→2 turn cluster to 0 diff.
  The page-2→3 turn (box 4→5) was tried the same way (segment -2) but only
  partially closed (improved, not exact) and over-shifting past it
  regressed further downstream; the box-5 dismiss press (page 3's own
  dismiss, a different accept path — `callSceneDismissElapsed`, not
  `acceptPostwinCallScenePage`) was tried and reverted after it cascaded
  into large new mismatches through the rest of the trace, so it was left
  at its original position. callscene-02 dense compare **120/199 →
  171/199** (net +51, no regression anywhere re-checked). Two residual
  clusters remain, bounded in the ground-truth doc: page-2→3 turn (local
  814, 816–866, shrunk but not zero) and box-5 dismiss/menu-handoff (local
  948–966, unchanged, pre-existing per 1289/1292). Commit pending (this
  entry's docs commit lands with the code).
- **Bars (all re-run live this session, unmoved):** askready-menu
  **21/21**, swapask-no **194/194**, entrance-02 **256/256**, record
  **178/178**, retire **174/174**, silver reveal (`...noland-reveal-off`)
  **690/701**, entrance-03 **162/256**, gold speech **58/256 · 20/177 ·
  58/126**. `executableFrontierRatchet` barrier counts unwidened; no new
  barrier.
- **Next:** page-2→3 turn + box-5 dismiss residuals are the honest
  remainder for a future step (both bounded above with exact frame
  ranges); box-5's own accept path likely needs its own separate
  derivation rather than reusing the -2 that worked for the other two
  presses. Otherwise the 1291 queue's (c)/(b) items stand.
- **Notes:** Commits local only. No PAPERCUT (tooling worked as
  documented; the `--capture-range` flag plus rendering isolated candidate
  frame-index variants directly was the key diagnostic move both times).

---

## 1292 — [main worker, 2026-08-16] **Call-scene calibration closed by modelling `text.c`'s per-box accept/arrow semantics — callscene-01 89→119/131, callscene-02 69→120/199, every bar unmoved**

- **State:** Landed and green. `npm test` **1,056 files / 9,978 passed /
  223 skipped**, `npm run build` + `npm run typecheck` green. Committed at
  `56b18bac` (code) + this docs commit.
- **Did (the mechanism, per the step's prerequisite):** `core.tick` advances
  the postwin state *first* and gates input on the advanced state, so a
  ready boundary that crosses a fixture's fixed 2-frame press edge swallows
  a whole press cycle — 1289's two failures. The real residuals were three
  `reference/pokeemerald/src/text.c` behaviours, not one offset: (a) 1
  glyph/frame with `CHAR_NEWLINE` free (`RENDER_REPEAT`) — box 1 types 65
  chars in 65 frames; (b) `$`/EOS accepts at last-glyph **+1** (via
  `waitmessage`→`waitbuttonpress`; MEASURED 894→895) while `\p`/
  `CHAR_PROMPT_CLEAR` burns a frame and accepts at **+2** inside
  `RENDER_STATE_CLEAR`, which *also* draws the bobbing down arrow
  (`DrawDownArrow`, 9-frame `sDownArrowYCoords` 0,1,2,1 — the app drew no
  arrow at all); (c) each reopened box's first glyph is its own measured
  frame-reopen lag **+1**, and box 1 carries the brain branch's extra
  `playse SE_POKENAV_CALL; waitse` tick (its box clear too: oracle 828 vs
  829). Fix keeps **every box's absolute accept tick unmoved** (box 1's
  first glyph moved +1 and the `$` accept rule moved −1, cancelling), so no
  press is swallowed. `\p`-vs-`$` is derived structurally from the walkup
  JSON's own per-event `pages` split, not hardcoded. Full write-up appended
  to `docs/walkup-call-scene-ground-truth.md`.
- **Bars (all re-run live this session):** askready-menu **21/21**,
  swapask-no **194/194**, entrance-02 **256/256**, record **178/178**,
  retire **174/174**, silver reveal **690/701**, entrance-03 **162/256**,
  gold speech **58/256 · 20/177 · 58/126** (all unmoved).
  `executableFrontierRatchet` barrier counts unwidened; no new barrier.
- **Next:** two residuals remain, both named in the doc. (1) callscene-01's
  12 remaining diffs are the attendant walk's lead-leg pose only (walkTick
  0–7 and 16–23, i.e. `callSceneWalkFrame`'s 7/8 frames; the stand frame 2
  matches) — an anim-table question, not timing. (2) callscene-02's page-2/3
  residual is a **fixture** gap: the harness's canned route accepts each
  boss-message page turn 2 frames before the compare trace presses (oracle
  accept 1170/1303, fixture 1172/1305), so its press frames need re-deriving
  against the canned route. Otherwise the 1288 queue stands.
- **Notes:** Commits local only. No PAPERCUT (tooling worked as documented).

---

## 1291 — [supervisor orient, 2026-08-16] **Fold: animation-main → master (ff `f44eabff`) — Heal Bell + Fire Blast exact, coverage 194/276; union gates green**

- **State:** master fast-forwarded to animation-main's head `f44eabff`
  (29 lane commits: Heal Bell 192→193 and Fire Blast 193→194/276
  Level-50 exact, unsupported 84→82; the animation supervisor had
  already merged master in at its own 11:24 session start, so the fold
  is a clean ff — that lane is LIVE again this afternoon, expect more
  unfolded commits at wind-down). Union gates: full npm **1,056 files /
  9,978 passed / 223 skipped**; build green. rust-main: nothing to
  fold. DEFERRED.md empty. Oracle freshness FAIL re-disproved (live
  8014 serves `factoryBrainWalkup` — the 3e29880b schema; PAPERCUTS
  freshness entry bumped to hit 3; services NOT restarted, 8012 carries
  the live animation lane).
- **Next:** the 1288 queue minus (d): dispatching **(a) call-scene
  accept-semantics calibration** (main lane) and **(e) winning-policy
  soak sweep** (side lane) in parallel; then (c) B1c latch probe and
  (b) gold speech dense closure.

---

## 1290 — [supervisor final, 2026-08-16] **Late round M9 verified + final gates re-run green — session closed**

- **State:** M9 (13th worker) closed the RECORD/RETIRE app-side compare
  traces **178/178 + 174/174**, fixing a real brain-route bug on the way
  (the re-ask after RECORD/RETIRE-NO showed the ordinary "2nd match"
  prompt instead of AskReadyForHead). Call-scene calibration left
  UNMOVED deliberately (89/131 + 69/199): constant shifts regressed the
  windows by pushing ready boundaries across the traces' fixed press
  frames — 1289 records the pixel measurements; the fix needs core.ts's
  per-tick accept semantics, not more constant guesses. Ground-truth
  doc box-1 hold row corrected (typewriter completes at 894, not 850).
- **Final gates (tree `ccd92136`, re-run AFTER M9 — supersede 1288's):**
  full npm **1,045 files / 9,950 passed / 223 skipped**; build green;
  soak vanilla **20/20 OK**; soak full 0:60 **60/60 OK**. Differential
  PASS 563/563 (base `56ef0edf`); regression bars re-verified
  (askready-menu 21/21, swapask-no 194/194, entrance-02 256/256,
  silver reveal 690/701).
- **Next:** unchanged from 1288's ordered list, minus (d) which M9
  closed; call-scene item (a) now carries 1289's measurements and an
  accept-semantics prerequisite. **Fold at next orient:**
  animation-main unfolded (Heal Bell + Fire Blast rounds; its
  supervisor session was live through this wind-down). rust-main:
  nothing unfolded. DEFERRED.md EMPTY.

