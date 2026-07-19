# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 83 — Bounded worker: send-out mechanism 1/5 (party-summary despawn) landed; `sendout.json` stays **174/256** as expected — only mechanism 5 remains

- **State:** `npm test` **458/458** (+1), `npm run build` green. Full
  19-trace sweep against the live oracle: 18 others at exact prior counts,
  `sendout.json` unchanged **174/256** — expected. Zero regressions
  (checked per-tick, not just aggregate).
- **Did:** implemented `drawOpponentSummaryExit` — source-exact `BLDALPHA`
  alpha-blend fade + per-icon staggered exit slide, decoded from
  `Task_HidePartyStatusSummary`/`_BattleStart_1`/`SpriteCB_
  StatusSummaryBalls_Exit` (`battle_interface.c:1671-1738,1878-1902`).
  Blend: `tBlend` 16→0, decrementing every OTHER tick, closed form
  `blend(elapsed)=max(0,15-floor(elapsed/2))`. Per-icon slide: `7*(5-j)`-tick
  stagger (reverse index order, opponent side), then an accelerating slide
  hand-derived from the source's own integer accumulator to closed form
  `x2(n)=3*n*(n+1)/2` — direction (rightward) pixel-confirmed via direct
  oracle-crop screenshots at ticks 1462/1480/1490. **Deliberately NOT
  implemented**: the bar's own exit slide (`SpriteCB_StatusSummaryBar_Exit`)
  — bar alpha-fades in place at its settled position only, a flagged
  sub-gap (time-boxed scope: the 6 icons were the visually larger piece).
  `localcheck.ts` pixel-diff mass across 1462-1543: **105984→100498px**
  (−5486px, the largest single-mechanism drop of the four landed this
  session-family), every affected tick strictly improved or held. New
  Tier-1 test (`tests/battleScene.test.ts`) pins the blend/absent boundary
  via the first-active icon's own opaque pixel. `docs/battle-scene-notes.md`
  gained §7.15.
- **Session total (3 mechanisms landed, one bounded worker step):**
  mechanism 4 (materialize affine-scale-in+tint, #81), mechanism 3
  (particle burst, #82), mechanism 1 (party-summary despawn, this entry) —
  `localcheck.ts` pixel-diff mass across 1462-1543: **124762→100498px**
  (−24264px, −19.4%), `sendout.json` count unchanged at 174/256 throughout
  (expected per §7.10's structural finding, re-confirmed three more times).
- **Next: only mechanism 5 remains** (front-sprite entrance anim,
  `ANIM_V_STRETCH`) — needs GROVYLE's 2nd front-sprite frame extracted (a
  genuine ROM extraction, not yet done), a `Sin`-table wobble renderer
  (can reuse the affine-matrix/`Sin`/`Cos` math already landed this
  session-family), and the still-open exact start-tick arithmetic
  (§7.11's flagged follow-up — the affine-emerge-complete tick + scheduling
  lag + 41-tick duration doesn't sum cleanly to the empirical settle tick
  1544). Once this lands, `sendout.json`'s count should finally move for
  the first time in this window's whole history — or, if it doesn't, that
  itself is a real finding worth naming precisely rather than forcing.
  Also worth a future pass: mechanism 3's own logical-tick-13+ divergence
  and mechanism 1's bar-slide gap, both flagged above, could each recover
  a bit more coverage independently of mechanism 5.
- **Notes:** action-menu window (1560+) and the oracle/harness stayed out
  of scope, per the brief. No PAPERCUT.

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

