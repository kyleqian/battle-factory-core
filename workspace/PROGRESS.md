# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 1300 — [main worker, 2026-08-16] **gold-pages window 55→85/177: page-1 onset re-derivation + single-line cursor placement fix, two tier-general defects**

- **State:** Landed and green. `npm test` **1,056 files / 9,984 passed /
  223 skipped**, `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` unmoved.
- **Did:** Two defects, both measured against oracle frames, neither a
  fitted constant or gold-only branch:
  (1) The pages fixture's park stage
  (`generatedRoundBattle7NolandGoldSpeechBoxHeldStage`, gold speechStep 0)
  hardcoded `elapsed: 0`, but the trace's `preCheckpointFrameOffset` (1535)
  is 418 ticks into page 1's hold, not its onset. Derived the true onset
  (abs frame 1117) by instrumenting the already-verified `speech-open`
  trace's own tick-by-tick `battleRoom.phase`/`elapsed`, same technique
  §9′ used for `speech-box0-held`. Added an `elapsed` param to the shared
  stage helper (default 0, every other caller unaffected) and passed 418
  from the `box0-held` wrapper only.
  (2) `drawBrainSpeechCursor` (`battleRoomRender.ts`) always anchored to
  line 2's origin, even when line 2 is empty — broke gold page 2
  (`["…Oh?", ""]`, the first dense fixture with a cursor-visible
  single-line box; every earlier guard fixture fills both lines). Fixed to
  anchor on whichever line actually holds the last printed glyph.
- **Result: gold-pages 55→85/177**, pages 1 and 2 (local frames 0–593)
  now byte-identical. Residual (92/177) is the page 2→3 and 3→4
  **typewriter edges** (local ~594–653/728–776, oracle's typewriter runs a
  tick or so ahead of the app's there) plus two isolated single-tick frames
  in page 3's hold (716, 725, same "frame-index boundary" family as
  gold-open 58/95) — a different mechanism (press/wipe-timing, same class
  as gold-open's own mechanism 1) not re-derived this step.
- **Guard bars, all reverified via fresh `npm run compare -- <trace>
  --summary`:** gold-open 254/256, entrance-03 254/256, gold-close
  80/126 (unchanged, different mechanism), B2 speech
  39/39·74/74·39/39·28/28, callscene-01 131/131, entrance-02 256/256 — all
  unmoved.
- **Next:** gold-pages edge typewriter-timing re-derivation (2→3, 3→4)
  needs its own oracle-frame cross-reference, same class as gold-open's
  mechanism 1 (trace/press recalibration, not an engine defect) — left
  honest per the brief.
- **Notes:** Full mechanism writeup and before/after table in
  `docs/noland-brain-intro-gold-ground-truth.md` §9″. No PAPERCUT.

