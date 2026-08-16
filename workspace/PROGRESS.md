# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 1289 — [main worker, 2026-08-16] **RECORD/RETIRE compare traces found + fixed a real brain-route bug (wrong re-ask prompt) — both close 178/178, 174/174; box-1 hold-boundary doc row pixel-corrected; call-scene 89/131 & 69/199 investigated, left unmoved**

- **State:** Landed and green. `npm test` **1045 files / 9950 passed /
  223 skipped**, `npm run build` + `npm run typecheck` green.
  Differential PASS (563/563 byte-identical, `--base 56ef0edf`).
  Committed at `6ab494fc`. **Note for the supervisor:** the wind-down
  gates in 1288 predate this step — re-run them at the next fold.
- **Did (goal 3, RECORD/RETIRE traces):** added
  `tools/compare/traces/factory-brain-silver-walkup-askready-menu-
  {record,retire}-off.json` (segments/captureFrames copied verbatim from
  the two banked read-only fixtures), replaying against the existing
  `...-askready-menu-open-off` stage. First runs surfaced a **real bug**,
  not just a timing residual: the RECORD/RETIRE re-ask (after a NO
  dismiss or a RECORD-YES-then-dismiss) unconditionally drew the
  ordinary route's short "The 2nd match is next!" prompt with its
  timing constants, even on the brain route, which has a different,
  longer `AskReadyForHead` prompt. Fixed in `postwin.ts`
  (`postwinQuestionReprintVisibleChars`/`Settled`/`MenuReady` +
  `advancePostwin`'s `reAskMenuReady` now select the right prompt/total
  per `state.frontierBrain` and re-derive settled/menu-ready delays from
  its own length, same `firstDelay+total-1[+4]` shape the ordinary
  constants were fit from — structural, not independently oracle-
  measured for this specific reprint) and `core.ts` (three `drawLines`
  call sites branch on `frontierBrain`). Both traces now close **full:
  178/178, 174/174** (was 0/178, 0/174 pre-fix).
- **Did (goal 2, doc correction):** `docs/walkup-call-scene-ground-
  truth.md`'s box-1 hold row ("850–893 Held — PNG-verified at 850"),
  flagged suspect by PROGRESS 1285 but never re-derived, was corrected
  via a fresh dense (stride-1) pixel probe of frames 815–905 (temp, not
  committed): the box is still mid-typewriter at 850 and only completes
  at 894, one frame before the already-known dismiss-A at 895. Dated
  correction note added inline; old value preserved in the note.
- **Did (goal 1, calibration — not closed):** investigated both
  fixtures' residuals with fresh dense oracle probes. Box-1's typewriter
  "drift" (callscene-01) and box-5's dismiss→menu handoff (callscene-02,
  the "biggest lever" the brief flagged) were both root-caused to
  specific oracle frames, but **two independent single-constant
  experiments regressed the fixtures badly** when tested live: shifting
  box-1's first-glyph delay by +1/+2 dropped callscene-01 from 89/131 to
  77/131 and 53/131 (a huge new 22%-diff region appeared past frame
  413); shifting box-5's dismiss edge by +1 dropped callscene-02 from
  69/199 to 44/199. Both regressions land past the point where the
  trace's own FIXED button-press timing lives — a shift that moves a
  ready-boundary across a fixed press edge triggers the documented
  input-swallow trap (a whole press cycle gets lost, not just the shifted
  span), so a naive single-constant fit makes things worse, not better.
  Both experiments were reverted; callscene-01/02 are **unmoved at
  89/131 and 69/199** (re-confirmed live this session) rather than risk
  landing a net-negative "fix." The precise oracle-frame evidence
  gathered this session (box-1: box reopens empty at 829, first glyph
  830, fully typed 894, dismiss 895 — all pixel-confirmed; box-5: app
  clears one tick before oracle at the box5→menu handoff) is recorded
  here for whoever picks this up next; it needs `core.ts`'s actual
  per-tick input-acceptance semantics understood before a safe fix,
  not just another constant guess.
- **Regression bars unmoved (all re-run live this session):**
  askready-menu **21/21**, swapask-no **194/194**, entrance-02
  **256/256**, silver reveal **690/701**, callscene-01 **89/131**,
  callscene-02 **69/199**. `executableFrontierRatchet.test.ts` barrier
  counts: unwidened. New coverage: `postwin.test.ts` (48 tests,
  unmodified, all still green — the reprint fix didn't touch any
  ordinary-route-tested behavior, confirmed by re-run).
- **Next:** call-scene calibration remains open — a future step should
  read `core.ts`'s actual button-accept tick semantics (not just
  `postwin.ts`'s state functions) before attempting another constant
  shift, given this session's two failed attempts. Otherwise the 1288
  queue's (b)/(c)/(e) items stand as before.
- **Notes:** Commits local only — pushing is Kyle's step. No PAPERCUT
  this session (tooling worked as documented throughout).

