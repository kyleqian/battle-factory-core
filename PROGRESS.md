# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 82 — Bounded worker: send-out mechanism 3/5 (open-particle burst) landed with an empirical hard cutoff; `sendout.json` stays **174/256** as expected, 2 mechanisms remain

- **State:** `npm test` **457/457** (+1), `npm run build` green. Full
  19-trace sweep against the live oracle: 18 others at exact prior counts,
  `sendout.json` unchanged **174/256** — expected. Zero regressions
  (verified per-tick, not just in aggregate).
- **Did:** implemented `drawBallOpenParticles` — a source-exact
  reimplementation of `PokeBallOpenParticleAnimation`/`Sin`/`Cos`
  (`battle_anim_throw.c:1599-1657`, `trig.c:515-523`): 16 particles spawn
  one per tick (8 radial directions), each with its own 26-age lifespan
  growing from radius 0 to 48. Hand-derived the spawn/Step1/Step2 timeline
  from source and cross-validated it **analytically** against
  `docs/battle-anim-assets.md` §4's independently-harvested (different-
  trace) pixel evidence - bit-for-bit match on the first 3 ticks' offsets.
  A same-trace direct pixel re-verification was tried but proved
  inconclusive (particle and ball-open-frame palettes coincidentally share
  exact RGB values, `tools/compare/scratch/probe_particle.mjs`, throwaway).
  **Found (pixel-brute-force against `localcheck.ts`) that the naive
  full-lifespan model is only correct through logical tick 12** - that
  single tick's own isolated diff drops from 147px to 9px with particles
  on, but every tick from logical 13 on is strictly WORSE with particles
  than without (confirmed via a direct oracle-crop screenshot at tick
  1508: real particle radii are much narrower than the model predicts by
  then). Not reverse-engineered why (not RAM-probed) - logical tick 12
  happens to be exactly mechanism 4's own scale-in completion point, a
  plausible but unconfirmed `HandleBallAnimEnd` interaction - flagged as
  an open follow-up. Per this run's "no curve-fitting" rule, added
  `PARTICLE_RENDER_LAST_LOGICAL_TICK = 12` as an explicit, documented hard
  cutoff rather than extrapolating past where the model is verified.
  `localcheck.ts` pixel-diff mass across 1462-1543: **106893→105984px**
  (−909px), and with the cutoff every affected tick strictly improved or
  held (checked individually, not just summed). New Tier-1 test
  (`tests/battleScene.test.ts`) pins the first particle's appearance tick.
  `docs/battle-scene-notes.md` gained §7.14.
- **Next:** 2 mechanisms remain, per #79/#81's ordering: (1) opponent
  party-summary despawn fade (§7.4.3, needs fresh RAM/pixel timing first,
  not just a renderer) and (5) front-sprite entrance anim (needs GROVYLE's
  missing 2nd front-sprite frame extracted, a `Sin`-table wobble renderer
  reusing this session's/#81's affine-matrix and `Sin`/`Cos` math, and the
  still-open start-tick arithmetic) - most expensive, left last on
  purpose. Also worth a future RAM-probe pass: mechanism 3's own logical-
  tick-13+ divergence, flagged above, could plausibly widen 3's own
  coverage without waiting on mechanism 5.
- **Notes:** action-menu window (1560+) and the oracle/harness stayed out
  of scope, per the brief. No PAPERCUT.

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

