# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 90 — Bounded worker: opponent party-summary bar's own exit slide landed (§7.15's flagged sub-gap) — `sendout.json` **199/256 → 214/256**

- **State:** `npm test` **468/468** (+1), `npm run build` green, tree
  clean. Full 19-trace sweep against the live oracle: all 18 others at
  their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206,
  scene-assembly 256/256, rent-slot1 125/139, rent-3picks 157/190,
  confirm-flow 79/95) — zero regressions. `sendout.json`: **199/256 →
  214/256** (+15).
- **Did:** priority 2 of §7.18's list. Source-decoded
  `SpriteCB_StatusSummaryBar_Exit` (`battle_interface.c:1823-1831`): a
  constant +2px/tick slide (no acceleration — 32's low 4 bits always mask
  back to 0, unlike the icons' `+=56` accumulator), plus a subsprite-table
  width swap the same tick (16→24 tiles, `EXIT_BAR_TILE_ORDER`) and the
  64px render-anchor shift that swap implies (source-derived from both
  tables' literal x offsets, independently cross-validated by an
  exhaustive oracle x2 sweep landing on the same constant). 15 of the 18
  target render ticks (1463-1480) are now bit-exact; the other 3
  (1470/1471/1479) are pixel-confirmed NOT the bar (icon-edge/materialize-
  overlap residual instead — skin-tone colors, not the bar's palette). One
  new Tier-1 test pins the slide. Full per-tick accounting, the anchor
  derivation, and a named-but-out-of-scope adjacent one-tick gap at tick
  1462 (real, mechanism-clear, doesn't by itself flip 1462 since that
  tick's diff is dominated by the unrelated trainer-exit-tail) are all in
  `docs/battle-scene-notes.md` §7.19.
- **Next:** per §7.19's updated priority order — (1) particle model still
  not full-frame-exact in 1481-1503/1516-1519 (§7.18's RAM-vs-render-lag
  lead); (2) the 1470/1471/1479 icon-edge residual, likely same family as
  1481-1492's larger spikes; (3) tick 1462's settled-bar gap (named, not
  fixed); (4) the small 1504-1521 boundary residual, still last priority.
- **Notes:** particle code, action-menu, healthboxAssembly.ts/healthbox
  docs, oracle/harness, and ROADMAP.md stayed out of scope, per the
  brief. No PAPERCUT.

---

## 89 — Supervisor: healthbox content pipeline COMPLETE (worktree round 2 merged) — 2574/2574 opaque px byte-exact, fully parameterized; ISSUES #16 trimmed to HP-variation/status/wiring

- **State:** `npm test` **467/467**, `npm run build` green, tree clean at
  `28bd853` (merge of `worker/wt-20260718-201902`; no render-path files
  touched — `battleScene.ts` untouched, 3 lane-owned files only).
  `sendout.json` 199/256 unaffected (re-verified pre-merge at #88).
- **Did:** merged worktree round 2: all three healthbox content pieces
  landed byte-exact vs the committed harvest, zero exclusion rects
  (was 859/2574 asserted after round 1). Keys: subsprite offsets are
  CENTER-based (`AddSubspritesToOamBuffer`, `sprite.c:1679-1755`) — round
  1's corner-based placement was the bug, and its z-order claim was
  BACKWARDS (bar wins over frame; dossier corrected); nickname text is a
  plain rectangular blit of window rows 5-15 into the sprite canvas
  (`TextIntoHealthboxObject` traced by hand), gender symbol colored via
  `{COLOR DYNAMIC_COLOR}` override (palette idx 11/10); level text is
  right-aligned (`xPos=5*(3-digitCount)`, "Lv" glyph 261 via the
  `CHAR_EXTRA_SYMBOL` escape). Genericity proven (MISDREAVUS/female/Lv100,
  MAGIKARP/none/Lv5 test cases). ISSUES #16 rewritten: remainder is
  partial-HP fill + status icons (currently `throw`) and the supervised
  battleScene wiring.
- **Next:** §7.15 bar exit slide (main-lane step launching as this is
  written) — attributed owner of 1463-1480; then the particle position residual
  (1481-1503/1516-1517, §7.18's render-lag-brute-force lead); then
  action-menu (1560+); then S6 acceptance end-to-end.
- **Notes:** both parallel-lane rounds this session merged conflict-free;
  worktree removed, branch deleted.

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

