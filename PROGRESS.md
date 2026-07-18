# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 46 — S6 slice 1a: A-press → closemessage → guided walk → warp fade (ticks 400-519) implemented, oracle-pinned; `walk-warpout.json` committed 125/125

- **State:** `npm test` **348/348** (341→348, +7 in `tests/prebattleRoomFlow.test.ts`),
  `npm run build` green. New trace `tools/compare/traces/walk-warpout.json`
  (520 frames, captures 395-519) passes `npm run compare` **125/125, 0
  diff**. All 12 pre-existing traces re-verified at their exact prior
  counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6
  66/66, example 4/4, summary-info-onix 122/122, summary-info-magby
  132/132, confirm-decline 67/67, accept-prebattle 137/137, rent-slot1
  125/139, rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did:** RAM-probed the whole window directly (`tools/probe/ram-probe.py`,
  scratch spec/output under `/tmp/s6-worker/`, not committed) rather than
  fitting pixel diffs blind: watched `gObjectEvents[0/1]` (player/attendant
  - localId/currentCoords/movementActionId/facing), `gSprites[0/1]`
  (x/y/animNum/animCmdIdx/invisible flag), and `gSpriteCoordOffsetX/Y`
  every tick 395-520. Cross-referencing against `sAnim_Go*`'s ANIMCMD
  tables (`object_event_anims.h`) decoded exact per-tick walk-animation
  frames; cross-referencing screen positions (`sprite.xy + coordOffsetXY -
  {8,16}`) against the room's already-known camera-origin formula proved
  **the player sprite stays screen-fixed at (112,56) the entire walk** (the
  field camera exactly cancels the player's own movement) - only the room
  tiles + the independently-moving attendant actually scroll on screen, a
  finding that collapsed the whole camera-scroll gotcha the brief flagged
  into "no per-tick player-position bookkeeping needed." Also discovered a
  real one-tick **render-lag**: RAM state at tick N only becomes visible in
  the rendered frame N+1 (verified against the ground truth's own frame-403
  boundary). Baked the resulting 80-tick walk (frame 403 → 482, when motion
  freezes) as an oracle-pinned lookup table (`prebattleRoom.ts` `WALK_STEPS`,
  same style as this file's existing `WINDOW_STEPS`/`UNREVEAL_WINDOW_STEPS`
  tables) rather than a general movement formula - safest match for exact
  byte-parity given per-tile timing already deviates from the naive 16-
  frames/tile assumption in places. Pixel-sampled the warp fade separately
  (a static room pixel across frames 478-505) and fit it to the *existing*
  `BlendPalette` shape already modeled in `paletteFade.ts` - new
  `WARP_FADE_OUT` timing constant (startDelay 4), reusing `bgFadeY`/
  `objFadeY` unchanged. New phases `messageClosing` (2-tick input-
  registration lag, matching this file's existing `confirmReveal`
  precedent) → `walking` (80 ticks, `WALK_STEPS`-driven) → `warpFade` (fades
  to black and then holds solid black forever, matching the step's explicit
  "may simply hold black from 501 onward" scope cut). Extended
  `extract-prebattle-room.ts` to pull all 9 standard picture-table poses per
  NPC (was 1 each) - `prebattle-room-npcs.json`'s shape changed from a
  single `tileset` to a `frames[9]` array; updated `prebattleRoomRender.ts`
  (`drawRoomTiles`/`drawNpcFrame` now take an explicit origin/frame index)
  and `tests/prebattleRoom.test.ts` to match. Core.ts wires the A-press
  (`newKeys.has("A")` while `phase==="idle"`) directly into `messageClosing`
  - the only input this screen ever reads in this slice.
- **Next:** S6 slice 1b+: battle-room entry (frame 520+, scientists facing,
  opponent walk-in, opponent overworld speech "IT'S WAY TOO HOT HERE"),
  then the heal-icon/nature-reroll/transition-select window (ticks 842-869)
  and the transition itself - all pinned in `docs/battle-bringup-notes.md`'s
  "Slice-0 ground truth" section (not touched this step, per the step
  brief - a parallel worker owns that file). ISSUES.md still just #15.
- **Notes:** no papercuts this session. All RAM-probe scratch (specs,
  dense-capture trace JSONs used only to derive the table, PNG output under
  `/tmp/s6-worker/`) is scratch per convention, not committed - only
  `tools/compare/traces/walk-warpout.json` (the final byte-exact parity
  trace) and the engine/asset/test diffs are. `docs/battle-bringup-notes.md`
  was read but **not edited**, per the step brief.

---

## 45 — Supervisor wind-down: session end 2026-07-18 ~01:20; S5 COMPLETE [x], S6 slice 0 banked

- **State (verified this minute):** `npm test` **341/341**, `npm run build`
  green, working tree clean. All 12 parity traces verified this session at
  final counts: anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, **confirm-decline 67/67** (new),
  **accept-prebattle 137/137** (new) — plus rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95 (all three ISSUES #5 settled policy).
  Ground-truth trace `traces-groundtruth/battle1-intro.json` committed.
  ISSUES backlog: only **#15** (baked msgbox frame asset, non-blocking
  debt). ROADMAP: **S5 marked [x]**; S4 remainder deferral extended behind
  the S5→S8 critical path (recorded decision); S6 slice 0 done.
- **Session summary (supervised, ~21:20-01:20):** 7 worker steps, all
  supervisor-verified green, zero trace regressions at every step:
  (1) S5 decline path landed (confirm-decline.json first cut 13/67;
  ISSUES #11/#12/#13 filed from its attributions); (2) ISSUES #11
  species-name breathe modeled exactly, 53/67 (`tools/probe/ram-probe.py`
  banked, papercut retired); (3) ISSUES #12 partial — prior hypothesis
  RAM-disproven, ball-grid snapshot fix, 54/67; (4) ISSUES #12 rc2 +
  #13 fixed → **67/67**; (5) S5 accept path (exit fade → pre-battle room →
  message print), 123/137, ISSUES #14 filed + #15 debt filed;
  (6) ISSUES #14 fixed → **137/137** → S5 [x]; (7) S6 slice 0
  ground-truth pinning (battle1-intro.json + dossier corrections).
  Suite 297→341 Tier-1 tests; traces 10→12 parity + 1 ground truth.
- **Next:** S6 slice 1 — engine implementation against
  battle1-intro.json's pinned targets, suggested order: message A-press +
  closemessage + warp fade (extends S5 scene machinery), then the
  heal-icon window (nature-reroll/transition-select ticks 842-869), then
  the transition itself. Early in slice 1 resolve the dossier §4 loose
  ends: transition-end bound (1200-1290), transition-variant pixel
  confirmation (2 of 12 candidates), the 2 unexplained post-freeze
  `Random()` draws (ticks 1741/1745). ISSUES #15 whenever convenient.
- **Notes:** every worker ended at a green commit; no usage-limit events;
  no parallel-lane use this session (all 7 steps serial in the main tree).
  One supervisor error: the ISSUES #15 filing clobbered #14's heading
  line (worker caught + restored it, `ba6ff0d`). PAPERCUTS: battle1-intro
  ground-truth entry retired this commit (trace now committed).

---



## 44 — S6 slice 0: ground-truth bring-up pinning complete — battle1-intro.json (1886f/254 captures) committed, RNG/transition/personality checkpoints RAM-verified, dossier extended; NO ENGINE CODE

- **State:** `npm test` **341/341** (unchanged, no engine touched), `npm run
  build` green. `tools/compare/traces-groundtruth/battle1-intro.json`
  (new dir, +README) committed: 1886 frames (`accept-prebattle.json`'s
  verified 392-frame prefix + A-press@400 + 2 more player-paced A-presses
  + idle through transition/intro/both send-outs), 254 dense captures.
  `bin/oracle run` on it verified green; spot-checked anchor (1/1) and
  confirm-decline (67/67) still exact — zero regressions.
- **Did:** Two chained oracle probe passes (sparse locator, then a dense
  final pass around each located boundary) pinned every frame boundary
  the step asked for (message-close, warp-fade black window, transition
  start/first-visual, both send-out text settles, first-action-menu
  settle at tick 1750 with its 36-frame idle cycle) — see
  `docs/battle-bringup-notes.md`'s new "Slice-0 ground truth, 2026-07-18"
  section for the full sha256-cited list. `tools/probe/ram-probe.py`
  (gRngValue + gBattleTypeFlags + gEnemyParty[0..2].personality, every
  tick from 395) then pinned: the 1/VBlank cadence and its exact freeze
  tick (1044→1045, then one explicit draw at 1066, then a 675-tick true
  battle freeze 1066-1740); all 3 opponent personality rolls (28/16/95
  rejection iterations for Grovyle/Murkrow/Pidgeotto respectively,
  cross-validated 3-for-3 against this file's own expected-nature table
  via `personality % 25`); and the transition-select roll (tick 868→869,
  narrowed to 2 of 12 candidates — see below). **Two corrections to the
  existing dossier filed with full RAM evidence** (not re-probing what
  was already trusted — these surfaced from this session's own new data):
  (1) the 3 nature-rerolls + transition-select happen during the
  **heal-icon animation** (ticks 842-869), roughly 160-200 ticks *before*
  the transition's black screen (1031) — not "the same frame" as the
  transition start, as previously assumed; (2) **4** explicit `Random()`
  draws survive the per-frame freeze, not the previously-documented 2 —
  two of them (ticks 1741, 1745) are unexplained, flagged for a future
  source re-read.
- **Next:** S6 slice 1+ (actual engine implementation: battle transition
  effect, scene init, intro text, first action menu) can now build against
  this committed ground truth instead of re-scouting it. Two loose ends
  flagged in the dossier's §4: (a) the transition-visual identification
  is narrowed to `CIRCLES_MEET` or `CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ` (2
  of 12) via RNG math but not pixel-confirmed — a future session should
  either find the right RAM field for the resolved transition id or do a
  frame-by-frame source cross-check; (b) transition-end (trainer/bg fully
  assembled) is bounded to ticks 1200-1290, not resolved tighter.
  Suggested `ROADMAP.md` S6 wording (not edited here, worker convention):
  append under S6 "**Groundwork banked (2026-07-18):**
  `tools/compare/traces-groundtruth/battle1-intro.json` (1886f, 254
  captures) pins the full A-press-through-first-action-menu window with
  sha256-cited frame boundaries and RAM-verified RNG/personality/
  transition-candidate checkpoints (`docs/battle-bringup-notes.md`
  'Slice-0 ground truth'); engine slices can now implement against fixed
  targets instead of re-scouting timings."
- **Notes:** PAPERCUT retired (not fixed by me, supervisor's file):
  `PAPERCUTS.md`'s "No committed oracle trace for the battle-1 bring-up
  path" entry is superseded by this commit. No new papercuts this
  session. All scratch work (`/tmp/s6-worker/`: probe scripts, sparse/
  dense locator trace JSONs, ram-probe spec/output) is scratch per
  convention, not committed. `src/engine/`, `src/assets/`, `src/data/`,
  and `tools/extract/` were **not touched** — confirmed via `git status`
  before both commits.


---
