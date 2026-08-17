# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1303 — [main worker, 2026-08-17] **callscene-02 fully closed 171→199/199: two distinct mechanisms, cross-checked against (and ruled out as) gold-pages' shared-model class**

- **State:** Landed and green. `npm test` **1065 files / 10010 passed /
  223 skipped** (unmoved), `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` barrier counts unmoved.
- **Did:** Closed both clusters PROGRESS 1301 left open for callscene-02
  (`docs/walkup-call-scene-ground-truth.md`'s "120/199 → 171/199"
  section): the page 2→3 turn (box 4→5, local 814/816-866) and the box-5
  dismiss/menu-handoff cluster (local 948-966). Checked first, per the
  step brief, whether cluster 1 is the same engine-model class §9‴ found
  for gold-pages (a window's first `\p` needs 2 ticks, later `\p`'s need
  1) — direct oracle PNG diffing proved it is **not**: callscene's box
  3→4 (first `\p`) has no visible clear frame while box 4→5 (later `\p`)
  does, the mirror image of gold-pages' shape, in a structurally
  different code path (`postwin.ts`'s call-scene machinery, not
  `battleRoom.ts`'s shared speech accept model). Fixed each cluster at
  its own classified layer: (1) box 4→5's press-frame re-derivation
  (`-2`, oracle-confirmed accept tick, compensated one segment sooner
  than the trailing segment to avoid disturbing the box-5 press) plus a
  new structural helper `callSceneIsLaterPromptArrival` giving box 5 its
  own measured one-tick-slower first-glyph delay; (2) `callSceneBoxHidden`
  never covered box 5's post-dismiss `closemessage` gap at all (a real
  rendering-gate bug, not an offset) — extended it to hide the box for
  the oracle-measured gap, reusing box 2's own reopen lag, with a
  one-tick carve-out (`src/engine/core.ts`) so the old page's content
  still renders through its own accept tick.
- **Result: callscene-02 171/199 → 199/199, fully closed.** Fourth
  walk-up window at full dense closure (alongside callscene-01,
  entrance-02, askready/swapask-no/record/retire).
- **Guard bars, all reverified via fresh `npm run compare -- <trace>
  --summary`:** gold-pages 175/177 (unmoved — frames 593/727 untouched,
  confirming the shared model was correctly left alone), callscene-01
  131/131, gold-open 254/256, entrance-02 256/256, entrance-03 254/256,
  askready 21/21, swapask-no 194/194, record 178/178, retire 174/174 —
  all unmoved.
- **Next:** No open callscene-02 residual. Pick up gold-pages' own
  593/727 residual (needs a real, tier-general reason why a window's
  FIRST `\p` differs from LATER ones — not a page-index branch, per
  §9‴), gold-close flicker/swirl (§8′), or entrance-03 frames 368/405.
- **Notes:** Full mechanism writeup and before/after table in
  `docs/walkup-call-scene-ground-truth.md`'s new "callscene-02 closed
  171/199 → 199/199" section. No PAPERCUT.

---

## 1302 — [main worker, 2026-08-17] **gold-pages typewriter edges closed 85→175/177: trace recalibration, plus a newly-proven (not chased) engine residual**

- **State:** Landed and green. `npm test` **1065 files / 10010 passed /
  223 skipped**, `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` unmoved. Only
  `tools/compare/traces/factory-brain-gold-walkup-speech-pages-off.json`
  changed — no `src/` edit this step.
- **Did:** Closed PROGRESS 1301's top "Next" item — the page 2→3/3→4
  typewriter-edge residual. Direct pixel diff of the compare tool's own
  saved `app-*.png`/`oracle-*.png` pairs (not just sha/bbox) proved the
  app trails oracle by a constant, non-compounding **one tick** through
  both edges' entire print span (self-healing by hold time, which is why
  the holds already matched). Read `tools/compare/oracleClient.ts`'s
  `runOracleBattleLab` to confirm — not assume — that post-checkpoint
  oracle frames are a **fixed recording** (the battle-lab scenario's own
  `preCheckpointCaptureFrames`), wholly independent of this trace's own
  `segments`; only the app's timing depends on press placement. That
  proves the class: mechanism (a), a trace-side press/wait
  miscalibration, same as §9′'s gold-open mechanism 1 — not an engine
  defect. Fix: the trace's middle wait segment (before the page 2→3
  press) was one tick too long, `586→585`; the same tick was added back
  onto the trailing wait (`127→128`, page 4's hold is a static
  non-cycling sha, inert to pad) to keep `captureWindow.end: 855` and the
  rest of the trace's local↔abs frame mapping unperturbed. The page 3→4
  edge needed no separate edit — the single upstream shift, tested alone
  first, already fixed both (oracle's fixed-recording independence from
  wall-clock makes this a whole-tail shift, not two separate bugs).
- **Result: gold-pages 85→175/177** — hits the brief's numeric target
  exactly, and as a bonus the previously out-of-scope 716/725
  "frame-index boundary" pair is now also exact (they were downstream
  artifacts of this same offset). The new residual is **593 and 727
  instead of the anticipated 716/725** — a different, newly-surfaced,
  algebraically-proven-unavoidable-by-trace-edit pair: the app's shared,
  already-oracle-confirmed-correct-for-page-1→2 2-tick
  `brainSpeechIdle`→`brainSpeech` accept model (clear-tick, then
  first-char-tick, `battleRoomAcceptedState`/`msgboxVisual` in
  `src/engine/battleRoom.ts`) is genuinely one tick too slow for later
  `\p` transitions within the same open window, which oracle shows
  jumping straight to the first character with no visible clear tick.
  Proven via direct pixel check + an algebraic proof (no single press
  tick can satisfy both the pre-edge and post-edge frame under the
  current uniform model) — not guessed. Closing it needs a real,
  tier-general reason why the *first* `\p` in a first-encounter speech
  differs from later ones (byte-identical `\p` markers in source), not a
  `speechStep`-indexed branch (forbidden by the brief's own
  no-per-page-special-case rule) — left honest rather than fitted.
- **Guard bars, all reverified via fresh `npm run compare -- <trace>
  --summary`:** gold-open 254/256, entrance-03 254/256, gold-close
  80/126, callscene-01 131/131, entrance-02 256/256, B2 speech
  39/39·74/74·39/39·28/28 — all unmoved.
- **Next:** re-derive why the first-encounter speech's first `\p` needs a
  2-tick clear-then-print gap while later `\p`'s in the same window need
  only 1 (frames 593/727) — needs a principled, tier-general
  characterization, not a page-index branch. Otherwise pick up 1301's
  remaining list: callscene-02 (171/199), gold-close flicker/swirl
  (§8′), entrance-03 frames 368/508.
- **Notes:** Full mechanism writeup, the algebraic proof, and the
  before/after table are in `docs/noland-brain-intro-gold-ground-truth.md`
  §9‴. No PAPERCUT.

---

## 1301 — [supervisor wind-down, 2026-08-16] **Nine worker steps + one salvage, two lanes: every open walk-up window advanced (two to exact/near-exact), two latent engine crashes found+fixed, soak coverage 0:120 green — all final gates green**

- **Final gates (tree `f63ff8d3`, the animation Soft Boiled fold —
  run AFTER every merge):** full npm **1,065 files / 10,010 passed /
  223 skipped**; build green; soak vanilla 0:20 **20/20 OK**; soak
  full 0:60 **60/60 OK** (30+30 chunks). Fold status: animation-main
  folded TWICE this session (morning: Heal Bell + Fire Blast,
  coverage 194/276; evening: Soft Boiled round + its supervisor
  wind-down — `master..animation-main` now EMPTY). rust-main: nothing
  all session. DEFERRED.md EMPTY — no deferred questions.
- **Window scoreboard (session start → end, all supervisor-verified
  live):** callscene-01 89/131 → **131/131 EXACT**; callscene-02
  69/199 → **171/199**; entrance-03 162/256 → **254/256**; gold-open
  58/256 → **254/256**; gold-pages 20/177 → **85/177**; gold-close
  58/126 → **80/126**. Every previously-exact window re-verified
  unmoved (askready 21/21, swapask-no 194/194, record 178/178, retire
  174/174, entrance-02 256/256, B2 speech ×4, both reveals 690/701).
  Mechanisms, not constants: text.c per-box accept/arrow semantics,
  `\p` accept+1, walk lead-leg per-direction anim order, brainMoving
  render clock −1, per-phase msgbox visibility, shared
  circle-transition overlay in brainSpeechSettled, tier-general
  2-tick cursor onset, per-page onset re-derivation.
- **Engine bugs (soak-driven pipeline, all found AND fixed this
  session):** **#93** Shell-Bell/forced-switch presentation desync
  (source-proven vs `battle_main.c`/`battle_util.c`); **#94** double
  forced-switch in one receipt dropped its pending request; **#95**
  hit-animation scan crossed script-execution boundaries on no-hit
  moves (Hail). #94/#95 are latent pre-#93 defects the #93 timing
  shift routed trajectories onto (opus worker's provenance analysis
  corrected the supervisor's initial "#93-caused" read; ISSUES text was
  updated accordingly before closure). All three have direct-
  construction Tier-1 pins proven failing pre-fix. **#92** (winning-
  policy 600k frame budget) assigned + closed same-session via
  `DEFAULT_MAX_FRAMES_BY_POLICY`. ISSUES.md: net zero new open
  entries. Soak coverage: winning 0:120 + full 0:120 + vanilla 0:20
  all green post-fix (parts 1-4 docs).
- **Ops notes:** gold speech worker cap-killed at final gates —
  salvaged after independent verification (commit `138b779d`), ~20 min
  recovery per the standing recipe. Side-worktree absolute-path
  Edit/Write trap recurred with the mechanism identified — new
  PAPERCUTS entry (2 hits). Freshness-check false positive hit 3.
- **Next (ordered):** (a) gold-pages page-2→3/3→4 typewriter-edge
  timing (§9″ recipe documented, same class as gold-open mechanism 1);
  (b) callscene-02 second page-turn + box-5 dismiss (171/199 →
  ground-truth doc has the bounded evidence); (c) gold-close
  flicker/swirl residual (§8′); (d) entrance-03 frames 368/508 class;
  (e) next soak-crash-class sweep (wider seed ranges / longer
  chains). No blockers; any of these is a clean single-worker brief.

---
