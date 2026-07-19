# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 86 — Bounded worker: send-out mechanism 5's affine-sampling residual fixed - `sendout.json` **180/256 → 196/256** (+16), render ticks 1522-1559 now bit-exact

- **State:** `npm test` **460/460** (+2), `npm run build` green. Full
  19-trace sweep against the live oracle: all 18 others at their exact
  established counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, scene-assembly 256/256,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions. `sendout.json`: **180/256 → 196/256**.
- **Did:** found and fixed TWO root causes behind §7.16's flagged residual
  (both mechanism-justified against reference source + RAM probes, not
  curve-fit — full account in `docs/battle-scene-notes.md` §7.17). (1)
  `drawSpriteSheetAffineStretch`'s matrix element was inverted
  (`Math.trunc(0x10000/xScale)`, copied from mechanism 4's own convention);
  real `ObjAffineSet` with `rotation=0` (always true for this mechanism)
  computes `pa=xScale*cos(0)=xScale` directly — no division at all. Fixed to
  `mx=xScale` (mechanism 4 left untouched, out of scope, separate code).
  Validated by brute-forcing both conventions against the committed
  RAM-exact `GROVYLE_STRETCH_TABLE`: 39845px→11950px total diff across the
  40 covered ticks (`tools/compare/scratch/grovyle_formula_sweep.mjs`). The
  double-size-affine-box hypothesis (§7.16's other suspected cause) was
  tested and ruled out — makes no difference, proven both algebraically and
  empirically. (2) The front sprite's frame was never a one-time swap to
  frame 2 as both §7.11 and §7.16 assumed (pixel evidence gathered through
  the broken formula above, unreliable) — RAM-probed directly
  (`gSprites[8].animCmdIndex`, new probe `tools/probe/specs/sendout-
  grovyle-frame.json`) that GROVYLE's `anims[1]` is the species-specific
  `sAnim_Grovyle_1` (`data/pokemon_graphics/front_pic_anims.h:2930-2938`), a
  real 5-command breathing sequence (frame 0/1/0/1/0, durations 10/18/7/12/6
  RAM ticks) — GROVYLE is the OPPONENT battler, which source wires to the
  species-specific anim table, not the generic single-frame one both prior
  sessions implicitly assumed. `animCmdIndex`'s own RAM transitions land
  exactly on those durations starting RAM tick 1496. Implemented as a
  generic reducer (`frontSpriteAnimFrame`, same shape as
  `affineEmergeAccumulator`) over an extracted step table
  (`battleAnimTables.grovyleFrontAnim`, new). Both fixes combined: isolated
  crop diff across the 40 covered ticks drops to 398px (from 11950px
  formula-only), **25/40 ticks bit-exact in isolation**
  (`tools/compare/scratch/grovyle_final_check.mjs`). Two new Tier-1 tests
  pin the fix (representative tick 1525's corrected sampling + the 1517-vs-
  1525 frame-cadence boundary, both oracle-cross-checked).
- **Per-tick attribution, full window (§7.17 has the complete breakdown):**
  1462-1480 unrelated pre-mechanism-5 window (unchanged); 1481-1503 and
  1516-1519 **owned by §7.14** (the particle model's own already-flagged
  logical-tick-13+ divergence — proved directly: the real integrated
  renderer's Grovyle-crop output is bit-for-bit identical to an isolated
  reproduction using RAM-exact params, so mechanism 5's own code is
  self-consistent; the residual against oracle is dominated by
  `PARTICLE_ORIGIN`'s own pinned color overlapping Grovyle's crop box,
  exactly where late-lifespan particles would still be alive);
  **1522-1559 bit-exact.** A small (3-195px, shrinking to 0) unexplained
  residual remains in 1504-1521 (excl. 1516/1517), boundary/antialiasing-
  shaped, not reverse-engineered further (small, flagged not chased).
- **Next:** send-out slice's two other still-open, independent gaps: the
  party-summary bar's own exit slide (§7.15) and the particle model's
  logical-tick-13+ divergence (§7.14, now confirmed as the owner of real
  residual pixels above, not just a same-window coincidence) — either could
  recover more of `sendout.json`'s remaining 60/256. After that: action-menu
  window (1560+, `docs/battle-menu-notes.md`), then S6 acceptance
  end-to-end, then S7.
- **Notes:** action-menu window (1560+), ROADMAP, and the oracle/harness
  stayed out of scope, per the brief. No PAPERCUT.

---

## 85 — Supervisor wind-down: session end 2026-07-18 ~19:40; scene-assembly CLOSED 256/256, oracle now ANIMATIONS-ON (v5, user decision), send-out slice all-5-mechanisms in at 180/256 with one named renderer residual, S7 groundwork fully regenerated under the new truth

- **State (verified this minute):** `npm test` **458/458**, `npm run
  build` green, tree clean at `5cb8259`. Full 19-trace sweep re-run by
  the supervisor: anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, **scene-assembly 256/256**,
  **sendout 180/256** (sole in-progress slice), rent-slot1 125/139,
  rent-3picks 157/190, confirm-flow 79/95 (last three: ISSUES #5
  settled policy). Oracle: harness bootstrap **v5 — Battle Scene ON in
  factory.sav itself** (`../../oracle/BOOTSTRAP.md`), smoke test green.
- **Session summary (supervised, ~14:29-19:40, 15 worker steps across 2
  lanes + supervisor harness work, zero regressions at every verified
  step):** (1) **Scene-assembly slice CLOSED** per the user's standing
  keep-iterating mandate: 104→151 (trainer OBJ layer + BG3 512px width,
  #66) →255 (mGBA blends in 8-bit space, proven; evaEvb render lag,
  #68) →**256/256** (player bar's asymmetric one-tick x2 stall, #70).
  (2) **USER SCOPE DECISION: battle animations ON** — discovered the
  canonical save had Battle Scene OFF (#75, one root cause resolving 4
  standing research questions); user directed animations into scope;
  shipped as harness bootstrap v4 (zero-frame poke) then v5 (bit set in
  factory.sav itself + per-sector checksums, poke retired; ground truth
  proven byte-identical 223/223, #76/#77). Anchor + all pre-battle
  truth byte-identical; only the send-out window's truth moved
  (1462-1543). (3) **Send-out slice** (S6): text/press/idle byte-exact
  (#71), healthbox content + Grovyle settle (#73, pixel-harvest —
  ISSUES #16 records the real-assembly debt), trainer-exit RAM table +
  BG-white dither (#74), re-grounded under v5 (#78), then ALL FIVE
  transient mechanisms landed one-by-one (#79 ball, #81 affine
  materialize+tint, #82 particles, #83 party-summary despawn, #84
  front-sprite entrance stretch) — count moved 174→**180/256** once the
  set completed, exactly as the "no subset moves the count" analysis
  predicted. (4) **S7 groundwork complete AND current**: turn-1 dense
  trace + 1021-row RAM dump regenerated under animations-on (#80 —
  menu timing unchanged, RNG ledger identical: animations consume ZERO
  RNG); battle-message templates (#69), hold effects (#69), move-anim
  assets/decodes (#72), all four research questions closed (#75).
  Suite 425→458 Tier-1 tests; traces 18→19 (+regenerated groundtruth).
- **Next (in order):** (1) sendout residual → 256/256: the affine
  wobble renderer samples out-of-source-bounds at sprite edges across
  ~1504-1531 while the oracle shows real content — full account + the
  committed RAM probe tables in PROGRESS #84 and
  `docs/battle-scene-notes.md` §7.16; plus the small 1536/1537
  mismatch. No new ground-truth work needed. (2) Action-menu slice
  1560-1810 (`docs/battle-menu-notes.md` — #80 confirmed its
  groundwork is still valid under v5). (3) S6 acceptance trace
  end-to-end, then S7 (dossiers current, all data breadth-ready).
- **Notes:** no usage-limit events; both lanes idle at close; no
  unmerged branches. Two mid-session worker under-cap stalls on the
  send-out window were corrected by brief design (pixel-mass interim
  metric + explicit clock checks, #79 onward). Supervisor-authored
  harness commits: bootstrap v4, v5, template-ROADMAP revert (user
  preference: the oracle speaks for itself). Sibling run swift-koala
  inherits the v5 oracle. PAPERCUTS: none new.

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
