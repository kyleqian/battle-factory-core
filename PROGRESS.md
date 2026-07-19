# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 91 — Supervisor wind-down: session end 2026-07-18 ~21:30 — `sendout.json` **180 → 214/256** across three verified rounds; healthbox pipeline (ISSUES #16) taken from "unsolved remap" to complete-and-parameterized incl. partial-HP/status

- **State (verified this minute):** `npm test` **476/476**, `npm run
  build` green, tree clean at `c78bbcf` (merge of
  `worker/wt-20260718-205048`, the last of 3 conflict-free worktree
  merges). Post-merge re-runs by the supervisor: sendout **214/256**,
  scene-assembly 256/256, transition 206/206, anchor 1/1 (the merge's
  `battle-healthbox.json` change is additive; no other trace's inputs
  touched — workers ran full 19-trace sweeps at #86/#88/#90, zero
  regressions every time). No unmerged branches, no live worktrees.
- **Session summary (supervised, ~19:31-21:30, 6 worker steps = 3 rounds
  × 2 lanes, every step verified green, zero regressions):** Main lane —
  send-out window 180→196 (#86: affine formula was inverted, `pa=xScale`
  directly; GROVYLE front sprite runs `sAnim_Grovyle_1` breathing, not a
  frame swap) →199 (#88: whole particle subsystem freezes one real tick,
  RAM 1494≡1493) →**214/256** (#90: bar exit slide +2px/tick + 16→24-tile
  subsprite swap; 15/18 target ticks bit-exact). Worktree lane — ISSUES
  #16 healthbox: "tile remap" DISSOLVED (#87: no remap; mismatch was
  un-composited content), full content pipeline byte-exact 2574/2574 and
  parameterized (#89: center-based subsprites, text-blit model, bar-wins
  z-order), partial-HP + status icons landed hermetically (#91: strict-`>`
  band thresholds, new `hpbar_anim.png`/`status2.png` extractions; oracle
  validation deferred to S7's first drain trace). Suite 458→476 Tier-1
  tests.
- **Next (in order, per `docs/battle-scene-notes.md` §7.19):** (1)
  particle position residual, 1481-1503/1516-1519 — §7.18's lead:
  brute-force render-lag constants directly against oracle captures
  rather than RAM-tick arithmetic; (2) icon-edge/materialize residual
  1470/1471/1479 (likely same family); (3) tick 1462's named settled-bar
  one-tick gap + trainer-exit tail; (4) small 1504-1521 boundary
  residual; then action-menu window 1560-1810 (`docs/battle-menu-notes.md`,
  groundwork complete), S6 acceptance end-to-end, then S7 (healthbox
  wiring + drain-trace validation fold in there).
- **Notes:** no usage-limit events; both lanes idle at close; all three
  worktree merges conflict-free (doc-ownership discipline held). 30-min
  single-mechanism caps landed reliably (#90 in 21 min, worktree round 3
  in 14 min). PAPERCUTS: none new reported across all six workers.

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

