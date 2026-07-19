# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

