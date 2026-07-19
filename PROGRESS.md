# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 81 — Bounded worker: send-out mechanism 4/5 (materialize affine-scale-in + ball-color tint) landed, pixel-validated; `sendout.json` stays **174/256** as expected, 3 mechanisms remain

- **State:** `npm test` **456/456** (+1), `npm run build` green. Full
  19-trace sweep against the live oracle: 18 others at exact prior counts,
  `sendout.json` unchanged **174/256** — expected (§7.10/§7.12's
  re-confirmed "no tick has only one mechanism left broken" finding). Zero
  regressions.
- **Did:** implemented this engine's **first affine-OAM scale renderer**
  (`drawSpriteSheetAffineTinted`/`drawGrovyleMaterialize`,
  `battleScene.ts`) — nearest-neighbor, GBA-hardware-accurate
  (`texCoord = ((rel*matrixParam)>>8)+half`, `matrixParam = 0x10000 /
  accumulator`), driven directly by the already-extracted
  `battle-anim-tables.json` (`affineEmerge` accumulator table via a generic
  step reducer, not hardcoded constants) plus the flat
  `ballOpenFadeColor.rgb8` tint. Window boundaries pixel-brute-force-
  confirmed against this trace's own ground truth: tint first visible at
  handoffTick+19 (1481, 1-tick render lag off the ball-open tick, same lag
  family as everything else in this window), scale-in growth exactly 12
  ticks (1481-1492, bbox widths 15/23/31/41/49/57/62px — an EXACT
  cross-trace match to `docs/battle-anim-assets.md` §4's independently-
  harvested table), then a **hard cutoff at handoffTick+42 (1504)** where
  the tint vanishes outright rather than fading gradually — source-read
  (`battle_anim_throw.c:2037-2102`) but not fully reverse-engineered why
  it's a hard step (flagged as an open follow-up, not guessed at — see
  docs §7.13). `localcheck.ts` pixel-diff mass across 1462-1543:
  **124762→106893px** (−17869px); not every tick strictly improved (ticks
  1481-1487 show a small, real increase, +41 to +101px each — nearest-
  neighbor quantization noise at extreme downscale, honestly flagged in
  §7.13 rather than hidden) but zero full-frame matches regressed. New
  Tier-1 test (`tests/battleScene.test.ts`) pins the tint's absent→present
  and present→absent hard boundaries via the sprite's own always-opaque
  center pixel. `docs/battle-scene-notes.md` gained §7.13.
- **Next (per #79's ordering, now 2 of 5 done):** mechanism 3 (open-particle
  burst) next — assets/frame-table already extracted
  (`battle-anim-particles.json`), needs a radial spawn +
  `Sin`/`Cos`-motion renderer (source formula cited, not RAM-probed yet).
  Then mechanism 1 (opponent party-summary despawn fade, §7.4.3 — needs
  fresh RAM/pixel timing first, not just a renderer) and mechanism 5
  (front-sprite entrance anim — needs GROVYLE's missing 2nd front-sprite
  frame extracted, a `Sin`-table wobble renderer that can reuse this
  session's affine-matrix math, and the still-open start-tick arithmetic;
  most expensive, left last on purpose).
- **Notes:** action-menu window (1560+) and the oracle/harness stayed out
  of scope, per the brief. No PAPERCUT.

---

## 80 — S7 v5 ground truth regenerated (parallel worktree lane, merged): turn-1 trace/dump rebuilt under animations-on — menu timing UNCHANGED, RNG ledger IDENTICAL (12 calls, same LCG values), both old register mysteries answered

- **State:** merge of `worker/wt-20260718-174536` (base `1050ba1`):
  `npm test` **455/455**, `npm run build` green.
- **Did (worktree lane, supervisor-verified incl. an independent replay
  of the new trace — 242 captures, menu sha `d223d98a2da9`@1884 exactly
  as claimed):** (1) first-action-menu timing byte-identical to v3
  (drift concern falsified — the intro's fixed waits absorb the entrance
  anims), so battle-menu groundwork is NOT stale. (2) battle1-turn1.json
  rebuilt: same buttons, 2620→2900 frames, 242 dense captures over both
  anim windows, twice-run deterministic. (3) RAM dump rebuilt (1021
  rows, 4 probe scripts re-run twice byte-identical): RNG ledger still
  EXACTLY 12 calls with identical LCG values at later ticks —
  **animations consume zero RNG**; damage 42, 1HP/tick drain, stat
  stages, turn order all reproduce. (4) Dossier corrections:
  battle-turn-notes §9 old→new tick map (+128 through DOUBLE_TEAM, +235
  by turn-end); battle-move-anim-notes §8 real timelines — DOUBLE_TEAM
  clone blend is flat eva=12/evb=8 for 130 ticks (resolves the old
  130-vs-66 mismatch), ROCK_SLIDE's BG3_Y shake fires (0/-7, ~10
  ticks). (5) HITMARKER_NO_ANIMATIONS + optionsBattleSceneOff both 0
  all trace. Flagged open: rock-spawn cadence within 2337-2516.
- **Next:** send-out mechanisms 1/3/4/5 (main lane, #79's list), then
  the action-menu slice — its groundwork is confirmed still valid.
- **Notes:** worktree removed, branch deleted. No PAPERCUT.

---

## 79 — Bounded worker: send-out mechanism 2/5 (ball sprite) landed, pixel-validated; `sendout.json` stays **174/256** as expected (per #74/#78's "no subset moves the count" finding), 4 mechanisms remain

- **State:** `npm test` **455/455** (+1), `npm run build` green. Full
  19-trace sweep: 18 others at exact prior counts, `sendout.json`
  unchanged **174/256** — expected, not a miss (see below). Zero
  regressions.
- **Did:** implemented and pixel-validated the **ball sprite** (mechanism 2
  of the 5 named in #78/§7.11) — `StartSendOutAnim`/
  `SpriteCB_ReleaseMonFromBall` (`pokeball.c:389-395,750-824`), using the
  already-extracted `summary-ball.json` (closed frame) and
  `battle-anim-ball-open.json` (open frame) — both landed in an earlier
  commit (`c4a7a85`, a parallel worktree lane) but were unused by any
  engine code until now; checking `src/assets/gen/` first (per the brief)
  found both assets already done, so no new extraction was needed for
  this mechanism. Position/timing pixel-brute-force-confirmed against this
  run's own regenerated ground truth (not assumed from the different trace
  `docs/battle-anim-assets.md` used): corner (168,56), closed frame
  ZERO-diff exact every tick 1464-1479 (16 ticks), open frame ZERO-diff
  exact at 1480 only (degrading after as still-unrendered particles/mon
  occlude it) — confirms `sBallAnimSeq1`'s 5-tick-open+5-tick-blank
  exactly. `localcheck.ts` pixel-diff mass across 1462-1543:
  **127107→124762px** (−2345px, zero tick regressed). New Tier-1 test
  (`tests/battleScene.test.ts`) pins both boundary ticks via a pixel
  opaque in the closed frame's tile but transparent at the same offset in
  the open frame's tile. `docs/battle-scene-notes.md` §7.11 gained the
  ball's own sub-section (mechanism-2 status); `battleScene.ts` gained a
  doc'd `drawSendOutBall` + supporting constants.
- **Why the count didn't move (expected, re-confirmed not re-tested):**
  #74 and #78 both already established structurally that no tick in this
  window has only one mechanism left broken — every tick 1462-1543 needs
  **all five** of: (1) opponent party-summary despawn fade, (2) ball
  sprite [DONE this session], (3) open-particle burst, (4) mon
  affine-scale-in + ball-color tint, (5) front-sprite entrance anim
  (`ANIM_V_STRETCH`) + its missing 2nd frame. This session's own
  before/after sweep (above) reconfirms it: real, measured pixel-mass
  reduction, zero full-frame flips — same pattern as #74's two mechanisms.
- **Next (in decreasing tractability, given time remaining in a session):**
  mechanisms 3 and 4 have their assets/tables **already extracted**
  (`battle-anim-particles.json` incl. `regularBallAnim`'s frame table and
  the spawn/motion formulas cited in `docs/battle-anim-assets.md` §1;
  `battle-anim-tables.json`'s `ballOpenFadeColor`/`affineEmerge` step
  table) — no extraction blocks them, only new renderer code (a radial
  particle spawner for 3; nearest-neighbor affine-scale sprite blending
  for 4, which is this engine's first affine-OAM precedent and will also
  serve mechanism 5's stretch). Mechanism 1 (party-summary despawn) needs
  fresh RAM/pixel timing work first (not even source-timed precisely yet,
  per §7.4.3). Mechanism 5 needs a genuine ROM extraction (GROVYLE's 2nd
  front-sprite frame, `HasTwoFramesAnimation`) plus the `Anim_
  VerticalStretch` Sin-table renderer and its still-open start-tick
  arithmetic — the most expensive of the five. A future step should
  probably tackle 4 next (unlocks 4 and de-risks 5's renderer together),
  then 3, then 1, then 5.
- **Notes:** action-menu window (1560+) and the turn-notes/move-anim docs
  stayed untouched (this step's explicit out-of-scope, per the brief's
  hands-off note for the parallel worktree worker on that lane).

---

