# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 88 — Bounded worker: send-out particle model's logical-tick-13+ divergence root-caused via direct RAM probe (a real one-tick engine stall) — `sendout.json` **196/256 → 199/256**

- **State:** `npm test` **466/466** (+2), `npm run build` green, tree
  clean at `74f16a8`. Full 19-trace sweep against the live oracle: all
  18 others at their exact established counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  summary-info-onix 122/122, summary-info-magby 132/132, confirm-decline
  67/67, accept-prebattle 137/137, walk-warpout 125/125, room-entry
  110/110, room-npcs 98/98, room-msgbox 142/142, transition 206/206,
  scene-assembly 256/256, rent-slot1 125/139, rent-3picks 157/190,
  confirm-flow 79/95) — zero regressions. `sendout.json`: **196/256 →
  199/256**.
- **Did:** priority 1 of the step brief (§7.14 particle-model
  divergence). RAM-probed the particle sprites' own `gSprites` slots
  directly (`dump-task-and-sprite-callbacks.py` cross-referenced against
  `PokeBallOpenParticleAnimation_Step1`/`_Step2`'s ELF addresses to find
  the slots without guessing, then `ram-probe.py` watched `x2`/`y2`/
  `animCmdIndex` across the whole window). Found the real mechanism: the
  WHOLE particle subsystem (spawner task + all live particles) freezes
  for exactly one real game tick (RAM tick 1494 duplicates 1493
  verbatim) — this single stall is the root cause of the prior session's
  empirical "logical tick 13+ is strictly worse" cutoff. Layered two
  `logicalT`-relative age corrections onto the EXISTING, already
  pixel-validated age formulas (kept unchanged after a from-RAM
  rederivation measurably regressed the already-good ages-0-12 region
  when checked live — a genuine open finding: RAM register state isn't
  proof of on-screen compositing timing for this mechanism, see
  `PARTICLE_STALL_LOGICAL_TICK`'s doc comment). Also tightened
  `PARTICLE_MAX_AGE` 25→24 after the fix initially regressed the
  previously-bit-exact render tick 1522 (a particle's final RAM write
  lands the same tick it self-destructs, never actually composited) —
  caught by the full sweep before landing, not shipped broken. Full
  per-tick attribution for every remaining diff frame in
  `docs/battle-scene-notes.md` §7.18. Two new Tier-1 tests pin the
  stall correction and the death-boundary fix.
- **Next:** per §7.18's own updated priority order — (1) particle model
  still not full-frame-exact in 1481-1503/1516-1519 despite the
  root-cause fix (try brute-forcing lag constants directly against the
  oracle the way §7.16 did, rather than RAM-tick arithmetic); (2) §7.15's
  bar exit slide (`SpriteCB_StatusSummaryBar_Exit`), not attempted this
  session, likely owner of some/all of 1463-1480's residual; (3) the
  small 1504-1521 boundary residual, unchanged, still last priority.
- **Notes:** action-menu window, `healthboxAssembly.ts`/healthbox-
  assembly-notes.md (parallel worktree lane), oracle/harness, and
  ROADMAP.md stayed out of scope, per the brief. No PAPERCUT.

---

## 87 — Supervisor: worktree lane merged — ISSUES #16's healthbox "tile remap" DISSOLVED (no remap exists; the old mismatch was un-composited content), real frame compositor + reusable VRAM probe landed alongside the shipping harvest

- **State:** `npm test` **464/464** (+4), `npm run build` green, tree
  clean at `30b2c26` (merge of `worker/wt-20260718-193456`, run in
  parallel with #86's main-lane step). `sendout.json` 196/256 and the
  full-suite counts re-verified by the supervisor post-merge — this merge
  touches no render path (`battleScene.ts` untouched, 4 new files only).
- **Did:** RAM/VRAM/OAM ground truth at trace tick 1555
  (`tools/probe/dump-healthbox-vram.py`, new reusable probe) proved the
  extracted frame sheet's raster tile order IS the on-screen order:
  healthboxLeft/Right are two adjoining 64×32 OAM blocks (zero gap), no
  tile shuffle anywhere — the old 728/2574-opaque-px brute-force mismatch
  was 100% the three un-composited dynamic content pieces (name/gender
  text, level text, HP-bar fill). Landed `src/engine/healthboxAssembly.ts`
  (`composeOpponentHealthbox`), frame byte-exact vs the committed harvest
  (859/2574 opaque px asserted, rest excluded-not-mismatched), pinned by
  `tests/healthboxAssembly.test.ts`. NOT wired into `battleScene.ts` —
  the harvest stays the shipping path this round. Dossier:
  `docs/healthbox-assembly-notes.md`. ISSUES #16 rewritten to its open
  remainder: 2 text pieces (FONT_SMALL render drew nothing at the derived
  footprint — unresolved), HP-bar 3-entry `SubspriteTable` placement,
  and the final battleScene wiring.
- **Next:** unchanged from #86 — §7.14 particle divergence (confirmed
  owner of 1481-1503 + 1516-1519) and §7.15 bar exit slide, toward
  `sendout.json` 256/256; then action-menu (1560+); #16's remainder is
  the standing worktree-lane candidate (S7 prep).
- **Notes:** worktree verified in-lane pre-merge (462/462 there); branch
  deleted post-merge. Both lanes' round-1 steps green, zero regressions.

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

