# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1304 — [supervisor fold, 2026-08-17] **Rounds 1-2: gold-pages 175/177 + callscene-02 CLOSED 199/199 + soak 120:180 clean + silver box-2 fixture banked — later-`\p` one-tick model is now a two-window converged mechanism**

- **State:** master `16cc1a14`, tree clean. Union after both folds: smoke
  375/375, callscene-02 **199/199**, callscene-01 131/131, swapask-no
  194/194, gold-pages 175/177, silver box-2 63/100 (expected, open
  mechanism below) — all supervisor-rerun live. Both workers ran full
  `npm test` (1065 files / 10010 passed / 223 skipped) + build +
  typecheck green on their own commits.
- **Folds this session:** side `16aaa7fa` (soak part 5: full+winning
  120:180 both 60/60 OK, zero signatures; vanilla 20:60 + longer-chain
  probe not attempted, ready-to-run commands in
  `docs/soak-sweep-2026-08-17-part5.md`) and side `5243b45a` (dense
  silver box-2 fixture 63/100 + stage/registration; cursor Fix B
  confirmed tier-general — all 54 non-blip hold frames byte-exact).
  animation-main/rust-main: nothing to fold at orient (both empty).
- **Converged open mechanism (next main step):** the shared brainSpeech
  2-tick clear-then-print `\p` accept model is one tick slow for LATER
  transitions in an open window — gold-pages 593/727 (§9‴, proven
  unreachable by trace edits) + silver box-2 group A/B
  (`docs/silver-speech-box2-evidence.md`, space-character proof; refines
  the rule: silver's box1→2 edge is the 3rd transition counting the \l
  scroll). callscene-02's page turn was cross-checked and is NOT this
  class (distinct path, entry 1303) — the model fix must not touch
  call-scene code.
- **Ops:** freshness-check false positive #4 at orient (8014 FAIL but
  every commit since service start is workspace-only — service kept, no
  restart). DEFERRED.md still empty.
- **Next (ordered):** (a) the later-`\p` model fix (acceptance:
  gold-pages 177/177 AND silver box-2 100/100, full guard matrix
  unmoved); (b) gold-close flicker phase derivation (§8′ recipe:
  stride-1 dense probe of oracle 2557–2620 vs `grayFlickerY` per-tick
  blend coefficient — blind offset bisection already failed twice, do
  not repeat); (c) soak remainder: vanilla 20:60 + winning 0:10 at 2×
  maxFrames; (d) entrance-03 368/508 single-tick family.

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

