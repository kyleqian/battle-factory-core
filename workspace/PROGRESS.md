# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 1299 — [main worker, 2026-08-16] **gold-open window 58→254/256: two shared-clock mechanisms (compare-trace accept timing + wait-cursor onset delay), no gold-only branch**

- **State:** Landed and green. `npm test` **1,056 files / 9,984 passed /
  223 skipped** (2 pre-existing `battleRoomBrainSpeech.test.ts` assertions
  updated for the new, oracle-correct cursor delay), `npm run build` +
  `npm run typecheck` green, `executableFrontierRatchet` unmoved.
- **Did:** Classified gold-open's 58/256 diff by cross-referencing dense
  pixel diffs against a live `state.elapsed` instrumentation trace (same
  technique as B1c's render-clock finding). Found TWO stacked mechanisms,
  both shared/tier-general, neither a park-phase constant:
  (1) `factory-brain-gold-walkup-speech-open-off.json`'s own A-press timing
  was miscalibrated (pressed at local frame 10; the app's already-correct
  CLOSE WIPE model needs press+7 to reach oracle's real dismiss at local 11,
  so press should be at local 4) — fixed by editing the trace's wait-segment
  (10→4 frames), the same class of fix §8′ already used for entrance-03's
  own A-press timing. **58→234/256** alone.
  (2) The wait cursor (`brainSpeechCursorVisible`/`brainSpeechCursorYOffset`,
  `src/engine/battleRoom.ts`) never onset-delays: oracle draws it fully
  absent for the first 2 ticks of every fresh `brainSpeechIdle`, confirmed
  identically in BOTH the gold-open fixture and the silver `entrance-03`
  guard fixture (ruling out a gold-only cause). Added
  `CURSOR_APPEAR_DELAY_TICKS = 2`, tier-general. **234→254/256**, plus
  entrance-03 (guard) **244→254/256** as a bonus from the same fix. Exposed
  and fixed one more calibration bug this created: B2 guard fixture
  `speech-box0-held`'s own `preCheckpointFrameOffset` (1113) was 2 frames
  into the hold, not the true onset (1111, cross-derived from entrance-03's
  own confirmed clock) — corrected, restoring 39/39.
- **Guard bars, all reverified via fresh `npm run compare -- <trace>
  --summary`:** entrance-03 244→**254/256**, entrance-02 256/256, B2 speech
  39/39·74/74·39/39·28/28 (box0-held offset recalibrated, see above),
  callscene-01 131/131, swapask-no 194/194, both reveals 690/701 — all
  unmoved or improved, none regressed.
- **gold-pages 53→55/177** (mechanism 1/2 don't fully close it — see Notes);
  **gold-close unchanged at 80/126** (different mechanism, §8′, untouched
  this step per the brief's "do not burn the cap fishing" guidance).
- **Next:** gold-pages needs per-page onset re-derivation (its own
  `preCheckpointFrameOffset`/hold anchors for pages 2-4 are arbitrary
  mid-hold points, not onset-aligned like `entrance-03`/`speech-open` now
  are) — same technique as this step's box0-held fix, repeated per page;
  left honest rather than guessed. gold-open's residual 2/256 (frames 58,
  95) are isolated single-tick walk-cycle frame-index boundaries, same
  family as entrance-03 frame 368 (PROGRESS 1296) — not chased.
- **Notes:** Full mechanism writeup, per-region attribution, and the
  before/after table are in `docs/noland-brain-intro-gold-ground-truth.md`
  §9′. No PAPERCUT.

---

