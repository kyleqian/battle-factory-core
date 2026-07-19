# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 84 — Bounded worker: send-out mechanism 5/5 (front-sprite entrance stretch) landed — ALL FIVE mechanisms in — `sendout.json` moves for the first time ever: **174/256 → 180/256**

- **State:** `npm test` **458/458**, `npm run build` green. Full 19-trace
  sweep against the live oracle: all 18 others at their exact established
  counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, scene-assembly 256/256,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions. `sendout.json`: **174/256 → 180/256**, the first score
  movement in this window's whole multi-session history.
- **Did:** extracted GROVYLE's missing 2nd front-sprite frame
  (`anim_front.png`'s bottom half, `extract-battle-mon-pics.ts` — top half
  self-verified pixel-identical to `front.png` first). Implemented
  `drawGrovyleStretch`/`drawSpriteSheetAffineStretch` (`ANIM_V_STRETCH`,
  `pokemon_animation.c:1597-1635`) — RAM-probed `gSprites[8]`'s
  `data[4]`/`data[5]`/`y2` directly (`tools/probe/specs/sendout-grovyle-
  stretch.json`, committed) rather than reimplementing `Sin()` math, per
  this run's "RAM/groundtruth over source formulas" rule.
  `GROVYLE_STRETCH_TABLE` is a literal 36-entry RAM-probed table (RAM ticks
  1503-1538); the render lag (+1, this window's established family) was
  independently re-confirmed for this mechanism by brute-forcing lag
  candidates 0-7 against the oracle's own captures. Also RAM-probed the
  concurrent ball-tint fade-to-normal (`Task_FadeMon_ToNormal_Step`,
  `gTasks[3]`'s `tCoeff`, `tools/probe/specs/sendout-grovyle-taskfade.json`,
  committed): a 15-tick linear ramp 16→1, residual coeff=1 rounds away to
  nothing for GROVYLE's palette (confirmed directly). Found via direct
  pixel evidence (not source-assumed) that the front sprite uses frame 2
  throughout the whole entrance anim, reverting to frame 1 exactly at the
  already-landed `GROVYLE_MATERIALIZE_TICK` (1544). `localcheck.ts`
  pixel-diff mass across 1462-1543: **100498→89444px** (−11054px). The 6
  newly-matching frames are render ticks 1538-1543 (the tail, near-neutral
  `y2`, sidestepping the residual bug below).
- **Known residuals, precisely bounded (not curve-fit away):** (1) 2 of the
  40 covered render ticks (1536/1537) mismatch even with RAM-exact
  affine params — neighbors on both sides match exactly, so not a lag/table
  error, unexplained. (2) A larger, more consequential residual across most
  of the active wobble window (render ~1504-1531): the affine-sampling
  formula produces out-of-bounds source rows (`sy<0`) for edge pixels once
  `y2` shifts the visible window, but the oracle shows real opaque content
  there (`tools/compare/scratch/debug_integration2.mjs`) — suspected but
  NOT confirmed cause: an off-by-one in the `half`/center convention when
  combined with nonzero `y2`, or `ObjAffineSet`'s real BIOS-division
  rounding differing from `Math.trunc(0x10000/scale)` at these magnitudes.
  This is why most of 1462-1537 still mismatches despite the aggregate
  pixel-mass improvement — full detail in docs/battle-scene-notes.md §7.16.
- **Next:** fix the affine-sampling edge-of-bounds bug above (the committed
  RAM probe data is sufficient to keep iterating on the renderer alone, no
  new probing needed) — likely worth several more matching ticks once
  resolved. Independently, two other flagged-but-unrelated gaps remain
  open: the party-summary bar's own exit slide (§7.15) and the particle
  model's logical-tick-13+ divergence (§7.14) — neither investigated this
  session (mechanism 5 was the full scope).
- **Notes:** action-menu window (1560+), ROADMAP, and the oracle/harness
  stayed out of scope, per the brief. No PAPERCUT.

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
