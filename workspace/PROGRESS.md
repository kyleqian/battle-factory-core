# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1306 — [main worker, 2026-08-17] **gold-close flicker phase gap CLOSED (gray component): 80→113/126, true `te` origin dense-probed from the oracle's own per-frame blend coefficient**

- **State:** Landed and green. `npm test` **1065 files / 10010 passed /
  223 skipped** (unmoved), `npm run build` + `npm run typecheck` green,
  `executableFrontierRatchet` barrier counts unmoved.
- **Did:** PROGRESS 1304 item (b). Per §8′'s own instruction, dense-probed
  the oracle's real per-frame gray-flicker coefficient instead of
  bisecting compare-tool counts: ran `bin/oracle lab tools/battle-lab/
  factory-brain-gold-speech-close-off.json` (already stride-1 over abs
  2495-2620), sampled a fixed black corner pixel (2,2) across every PNG,
  inverted through the shared `blendComponentToGray` formula (exact/
  unambiguous since `grayFlickerY` only emits even values) to bank the
  true `y` sequence, then cross-validated end-to-end against the real
  engine (`tools/compare/scratch/gold-close-phase-probe.ts`, committed).
  Found the true `te` origin was off by 32 ticks: `brainSpeechClosing`
  holds the phase transition (not the visual clear, which is immediate)
  for `MSGBOX_CLOSE_TICKS=4` extra ticks, and gold's own measured pause
  (26) is 2 ticks short of the shared `FLICKER_START_TE=28`. Fixed
  `renderBattleRoomState` (`src/engine/core.ts`) to re-base gold's
  `transitionElapsed` by `MSGBOX_CLOSE_TICKS + frontierTransitionFlickerStartTe(kind)`
  (a new `battleTransition.ts` export mirroring `grayFlickerY`'s own
  per-family start constant) — **gold-only**: the tier-general reduction
  (silver's pause already equals `FLICKER_START_TE`, so algebra suggested
  zero extra correction) regressed silver's one committed post-pause
  guard 28→24/28, a decisive negative proving silver's real onset doesn't
  follow the same rule; reverted to gold-only rather than fit blind.
- **Result:** `factory-brain-gold-walkup-speech-close-off.json`
  **80→113/126** (frames 0-112 exact). Residual (113-125, 13 frames) is a
  **second, distinct mechanism** — the circle-transition sprite's own
  onset is later than `CIRCLE_ANCHOR_TE=78` on the same now-verified `te`
  clock (oracle PNG diffing: real top-circle first pixel at row 0 around
  trace-relative 117, left/right circles absent through frame 125) — not
  another instance of this session's re-basing bug. Left honestly open,
  named rather than guessed.
- **Guard bars, all reverified via fresh `npm run compare -- <trace>
  --summary`:** gold-pages 177/177, silver box-2 100/100, gold-open
  254/256 (unmoved, out of scope), entrance-02 256/256, entrance-03
  254/256 (unmoved, out of scope), callscene-01 131/131, callscene-02
  199/199, B2 speech box0-held 39/39 / cry-held 74/74 / page8-held 39/39
  / close-pause 28/28, both ordinary-path reveal control windows
  (non-brain "settled" transition) 690/701 unmoved — confirms the shared
  `battleTransition.ts` machinery itself needed no change.
- **Next:** (a) the circle-transition's own second onset (gold-close
  113-125) — needs its own dense per-frame derivation, same discipline as
  this step, not a guessed offset; (b) silver's own post-pause flicker
  window — no dense fixture exists past its pause boundary
  (`factory-brain-silver-walkup-speech-close-pause-off.json` ends exactly
  at frame 27) to derive silver's correction; (c) soak remainder: vanilla
  20:60 + winning 0:10 at 2× maxFrames; (d) entrance-03 368/508
  single-tick family (side probe, read-only guard for main).
- **Notes:** Full derivation, banked coefficient table, and both reverted/
  kept formulas in `docs/noland-brain-intro-gold-ground-truth.md` §8″.
  Probe scripts: `tools/compare/scratch/gold-close-phase-probe.ts`
  (committed, engine-side 0/126-mismatch validation). No PAPERCUT.

---
## 1305 — [main worker, 2026-08-17] **Later-`\p`/`\l` accept model CLOSED: gold-pages 177/177, silver box-2 100/100 — the converged mechanism from 1304 is fixed**

- **State:** Landed and green. `npm test` **1065 files /
  10010 passed / 223 skipped** (unmoved), `npm run build` + `npm run
  typecheck` green, `executableFrontierRatchet` barrier counts unmoved.
  `src/engine/postwin.ts` (call-scene) untouched, per PROGRESS 1303's guard.
- **Did:** Closed 1304's converged open mechanism. Derived rule (from both
  windows, cited in each doc — see Notes): the window's FIRST accept-driven
  box transition (leaving box 0) keeps the existing 2-tick clear-then-print
  model; every LATER one (leaving box ≥ 1, `\l` or `\p` alike — silver's
  box 0→1 `\l` scroll counts as the 1st transition, making its box 1→2 `\p`
  the 2nd) skips the cleared tick — the accept tick itself already shows
  the first new character. Implemented as a new `BattleRoomState` field
  `speechAcceptedFast`, set only by `battleRoomAcceptedState`'s direct
  `\p`/`\l` continuation when the box being left has `speechStep >= 1`;
  explicitly false at window-open and at every real close+reopen (a
  structurally different transition — the gold-close guard, 80/126,
  unmoved, confirms that path is untouched). Also reverted
  `factory-brain-gold-walkup-speech-pages-off.json`'s PROGRESS-1302
  press-timing shift (`585/128 → 586/127`) — that was a trace-level
  compensation for the old uniformly-slow engine model, now redundant and
  double-shifting if left in place (verified empirically: the engine fix
  alone regressed gold-pages to 85/177 before the trace revert).
- **Result:** `factory-brain-gold-walkup-speech-close-off.json` **175/177 →
  177/177** (frames 593/727 closed); `factory-brain-silver-walkup-speech-
  box2-off.json` **63/100 → 100/100** (both the 31-frame print-span
  residual and all 6 period-9 cursor-bob blips closed by the one fix, no
  separate bob-phase mechanism needed). Guard matrix unmoved (fresh
  `--summary` reruns): gold-open 254/256, gold-close 80/126, entrance-02
  256/256, entrance-03 254/256, callscene-01 131/131, callscene-02
  199/199, B2 speech box0-held 39/39 / cry-held 74/74 / page8-held 39/39 /
  close-pause 28/28, askready 21/21, swapask-no 194/194, record 178/178,
  retire 174/174.
- **Next:** No open item from this mechanism. Pick up 1304's remaining
  ordered list: (b) gold-close flicker/swirl phase derivation (§8′ recipe,
  out of scope for this step); (c) soak remainder (vanilla 20:60 + winning
  0:10 at 2× maxFrames); (d) entrance-03 368/508 single-tick family.
- **Notes:** Full derivation + before/after tables in
  `docs/noland-brain-intro-gold-ground-truth.md` §9⁗ and
  `docs/silver-speech-box2-evidence.md` §7. One Tier-1 test updated
  (`tests/battleRoomBrainSpeech.test.ts`'s gold `\p` page-turn test: was
  `chars: 0` for every internal page turn, now only the first turn keeps
  that — every later turn asserts `chars: 1`, stated in the commit
  message). No PAPERCUT.

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
