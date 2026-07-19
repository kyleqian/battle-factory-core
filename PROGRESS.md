# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 102 — Supervisor: round-7 worktree branch merged (one battleScene.ts draw-order conflict, hand-resolved + re-verified) — `sendout.json` **221 → 236/256**; 1504-1518 span closed by a one-line compositing fix

- **State (verified post-merge):** `npm test` **520/520**, `npm run build`
  green, tree clean. Post-merge re-runs: sendout **236/256**,
  scene-assembly 256/256, menu-materialize 5/5, menu-throw 70/70,
  menu-text 18/18, transition 206/206. Worktree removed, branch deleted.
- **Did:** merged `worker/wt-20260719-021108`: the whole 1504-1518
  residual was mechanism 5's LATE window still drawing AFTER the particle
  burst (the early window was already moved pre-particles by §7.22/§7.23);
  every diff pixel in the span was particle-colored inside an alive
  particle's predicted footprint — no formula/table change, one call-site
  move (§7.24). BONUS: falsifies §7.20's 1516/17 "particle survives past
  age 24" theory — that pixel is index 12 at age 22, was just masked by
  the same ordering bug. The merge conflicted with #101's player-particle
  additions in the same drawSendOutHandoff region; resolution keeps
  #101's player draw calls + the branch's Grovyle ordering (stretch
  pre-particles, settled-only post) — re-verified above.
- **Next:** main lane → drawPlayerMaterialize's silhouette-edge residual
  at 1657+ (§7.21-class, named in #101; the opponent-side fix is the
  template) then extend menu-materialize toward the healthbox-slide
  boundary; worktree lane → sendout 1485-1495 (11 ticks, last big span);
  then the #96 OAM-order fix solo, menu draw + idle, S6 acceptance.
- **Notes:** sendout remaining: 1462, 1470/71/79, 1485-1495 (15 ticks
  total). First merge conflict of the session — the two lanes finally
  met in drawSendOutHandoff's z-order; resolution was mechanical.

---

## 101 — Bounded worker: PLAYER-side ball-open particle burst landed (mechanism 3's player-side analogue, docs/battle-menu-notes.md §3 item 5) — `menu-materialize.json` **1/1 → 5/5** (ticks 1652-1656); a distinct materialize-silhouette-edge residual found starting 1657, not root-caused

- **State:** `npm test` **519/519** (+3 Tier-1), `npm run build` green,
  tree clean. Full 22-trace sweep against the live oracle: all 21 others at
  their exact established counts (accept-prebattle 137/137, anchor 1/1,
  confirm-decline 67/67, confirm-flow 79/95, draft-cursor 13/13,
  draft-menu-slot6 66/66, draft-menu 38/38, example 4/4, menu-text 18/18,
  menu-throw 70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry
  110/110, room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  sendout 221/256, summary-info-magby 132/132, summary-info-onix 122/122,
  transition 206/206, walk-warpout 125/125) — zero regressions.
  `tools/compare/traces/menu-materialize.json`: **1/1 → 5/5** (tick 1652 was
  already committed; added 1653-1656).
- **Did:** per the brief's FIRST STEP, confirmed #99's own residual
  classification still held on this session's starting code (100%
  particle-colored, 1653-1663) before writing anything. Implemented
  `drawPlayerBallOpenParticles` (`battleScene.ts`) — same age/radius/frame
  math as the opponent's own `drawBallOpenParticles`, battler-specific only
  in origin/anchor: **origin `(68,106)`**, brute-force pixel-fit against the
  single isolated particle visible at logical tick 0
  (`tools/compare/scratch/menu-audit/fit_player_particle_origin.mjs`, 13/14
  exact — the 14th is the already-established terrain occlusion), **not**
  the naive `sprite->x,y-5` center value directly (that value needs the
  tile's own `-4,-4` half-size folded in first, since `drawParticleTile`'s
  args are a top-left corner); **anchor** `PLAYER_BG_FADE_START_TICK` (1653,
  same "both fire the same RAM tick" reasoning #99 established for the BG
  fade). **Draw order reversed from the opponent's own function** (oldest
  spawn on top) — pixel-confirmed necessary via direct A/B (ascending order
  left 3-24px residuals at 1654-1656, all explained by the two-particles-
  briefly-coexisting-at-radius-0 overlap; reversing fixed all three exact).
  **A second, distinct gap found while wiring this in**: the ball's own
  "open" pose sprite (#98's `drawPlayerBallOpen`) was only modeled for its
  single tick 1652 — real particles exposed that the ball's static art is
  still genuinely on screen (through the same terrain clip) for several more
  ticks; widened `PLAYER_BALL_OPEN_END_TICK` to 1663, which alone fixed tick
  1653. 3 new Tier-1 tests (`tests/battleMenu.test.ts`) pin the origin tile,
  a later-tick particle position, and the pre-burst boundary; 2 existing
  tests updated for the widened ball-open window.
- **Why the window stops at 1656, not 1663 (the materialize window's own
  end)**: ticks 1657+ have a small (19-30px), separately-named residual that
  is **NOT** particle-colored — every mismatched pixel is one of the
  ball-open frame's own colors (`66,66,66`/`214,41,41`/`132,0,0`/
  `255,156,123`), appearing where `drawPlayerMaterialize`'s tint is drawn
  instead of the real ball/mon color underneath. This is a materialize-
  silhouette-EDGE issue — the same *class* of bug `battle-scene-notes.md`
  §7.21 root-caused for the opponent's own materialize (a render-lag
  off-by-one and/or missing accumulator/`y2` correction) — not a particle
  problem, and `drawPlayerMaterialize` is `#98`/`#99`'s own code, out of
  this step's particle-burst scope. Not root-caused this session (would
  need the same kind of RAM-probe/brute-force work §7.21 did, and time ran
  out after landing + verifying the particle burst itself). Full accounting:
  `docs/battle-menu-notes.md` §3 item 5.
- **Next:** root-cause the `drawPlayerMaterialize` accumulator/`y2`/
  render-lag combination starting at trace tick 1657 (mirror §7.21's method)
  — should extend `menu-materialize.json` past 1663 with no further
  particle-burst changes. Then: the coefficient-fade-to-true-color + idle-bob
  entanglement past the materialize window's own end, healthbox slide-in →
  settle (~1693, still untouched), blank-box + menu draw + idle
  (1742-1810). Sendout's own 1504-1518 boundary residual remains the
  concurrent worktree lane's territory (unaffected by this session — no
  overlap, verified by the trace's own max-tick bounds).
- **Notes:** stayed in `battleMenu.ts` (pure timing) + additive
  `battleScene.ts` hooks (new function + one call-site line in the existing
  `drawSendOutHandoff`, plus reordering the three already-existing
  player-materialize-window calls to fix compositing order) +
  `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`, per the brief.
  Did not touch `battleScene.ts`'s opponent-side internals,
  `tests/battleScene.test.ts`, or `docs/battle-scene-notes.md`. Archived
  PROGRESS #97 to `PROGRESS-archive.md` per the brief. No PAPERCUT.

---

## 100 — Supervisor: round-5 worktree branch merged — masking band root-caused (harvest-asset background bleed, not the slide model) + §7.22's mechanism-5 fix re-applied; `sendout.json` **215 → 221/256**

- **State (verified post-merge):** `npm test` **516/516**, `npm run build`
  green, tree clean. Post-merge re-runs: sendout **221/256**,
  scene-assembly 256/256, menu-throw 70/70, menu-materialize 1/1,
  menu-text 18/18. Worktree removed, branch deleted.
- **Did:** merged `worker/wt-20260719-013134` (base 2e42eb5, conflict-free
  with #98/#99's parallel main-lane work). PART 1: §7.22's ~138px sliding
  band was NOT a healthbox-slide-model bug — the §7.9 pixel-harvest asset's
  rectangular bounding box contains real background pixels frozen at their
  post-fade color in the sprite's scalloped-corner margin, and
  `drawSendOutHealthbox` painted the whole rectangle every tick, clobbering
  the correctly-faded background during the materialize plateau
  (renders 1496-1503). Fix: `getHealthboxContentMask()` classifies bleed
  vs content; bleed pixels skipped. +1 (render 1496). PART 2: §7.22's
  7-entry `GROVYLE_STRETCH_EARLY_TABLE` + shortened mechanism-4 window +
  compositing-order split re-applied; RAM tick 1496's raw `(0,0,0)` matrix
  entry replaced by neutral `(256,256,0)` — mechanism-justified (OAM
  matrix not yet re-latched; a literal zero matrix provably blows render
  1497 up to 2362px, which the oracle contradicts). +5 (renders
  1499-1503). Dossier: §7.23.
- **Next:** main lane is on the player-side ball-open particle burst
  (mechanism 3 analogue, present from tick 1653 per #99); worktree lane
  takes sendout's 1504-1518 boundary residual (15 ticks, biggest remaining
  named span; 1485-1495 if same family). Then: healthbox slide-in →
  settle, blank-box + menu draw + idle, the #96 OAM-order fix (solo,
  supervisor-scheduled), S6 acceptance end-to-end.
- **Notes:** sendout remaining gaps now: 1462, 1470/71/79, 1485-1495,
  1504-1518 (35 ticks). ISSUES #16 note: the new content mask composites
  ON TOP of the shipping harvest — #16's eventual assembly wiring should
  subsume both.

---

## 99 — Bounded worker: root-caused + fixed #98's pre-existing ~1653+ full-frame residual — it's the player-side twin of `SENDOUT_BG_FADE_Y` (battle-scene-notes.md §7.10/§7.20); ~99% pixel reduction, but the remaining residual is 100% the (unimplemented) ball-open particle burst, so `menu-materialize.json` still can't extend past its existing 1/1

- **State:** `npm test` **514/514** (+6 Tier-1), `npm run build` green, tree
  clean. Full 21-trace sweep (mandatory this time, not spot-checked): all
  21 at their exact established counts (accept-prebattle 137/137, anchor
  1/1, confirm-decline 67/67, confirm-flow 79/95, draft-cursor 13/13,
  draft-menu-slot6 66/66, draft-menu 38/38, example 4/4, menu-materialize
  1/1, menu-text 18/18, menu-throw 70/70, rent-3picks 157/190, rent-slot1
  125/139, room-entry 110/110, room-msgbox 142/142, room-npcs 98/98,
  scene-assembly 256/256, sendout 215/256, summary-info-magby 132/132,
  summary-info-onix 122/122, transition 206/206, walk-warpout 125/125) —
  zero regressions.
- **Did:** per the brief's FIRST STEP, A/B'd the unmodified baseline over
  1653-1690 first (`npm run compare` against a scratch trace built from
  `battle1-menu-dense.json`'s segments) and reproduced #98's exact
  characterization (2461px at 1653 growing to 18374px by 1675). Root-cause,
  decoded not fitted (`tools/compare/scratch/menu-audit/
  decode_player_bgfade.mjs`): `SpriteCB_ReleaseMonFromBall`
  (`pokeball.c:758`) calls `LaunchBallFadeMonTask(TRUE, sprite->sBattler,
  14, ballId)` for BOTH battlers — the player's own ONIX release
  re-triggers the identical `BeginNormalPaletteFade(14,0,0,16,RGB_WHITE)`
  BG-to-white dither `SENDOUT_BG_FADE_Y` already models for the opponent,
  which the engine only ever applied once. Reversed the already-validated
  `blendComponentToWhite` formula against two clean background swatches,
  cross-checked every tick 1653-1689: the decoded 37-entry y-ramp is
  byte-identical to `SENDOUT_BG_FADE_Y` (same 3-tick y=14 hold included),
  re-anchored at `PLAYER_BALL_OPEN_START_TICK+1` (1653) — the same
  "one tick after ball-open" convention the opponent's own table uses.
  `battleMenu.ts` gained `playerMaterializeBgFadeY`; `battleScene.ts`
  additively ORs it into the existing `drawTileBgFaded` call (the two
  windows never overlap). Verified: 1653-1663 full-frame diff drops ~99%
  (2461px→19px at 1653, 7846px→92px at 1662). 6 new Tier-1 tests pin both
  ramp boundaries (§7.20's lesson: ramps get truncated at both ends).
- **Why `menu-materialize.json` still can't extend**: classified every
  remaining diff pixel at ticks 1653-1663 pixel-for-pixel
  (`tools/compare/scratch/menu-audit/classify_residual.mjs`) — **100%** is
  the ball-open particle burst (mechanism 3's player-side analogue,
  colors `(255,173,0)`/`(255,255,255)`/`(66,66,66)`/`(214,41,41)`/
  `(255,156,123)`/`(132,0,0)` clustered at the ball's own position), not
  yet implemented. Pixel evidence refines the brief's own "expected around
  1662-1665" guess: the burst is present at **every** tick from 1653
  itself (same tick `AnimateBallOpenParticles` fires alongside
  `LaunchBallFadeMonTask`), so no tick in 1653-1663 reaches 0 diff and
  none can be added to the committed trace this session. Ticks 1664+
  remain separately blocked by the already-named coefficient-fade +
  idle-bob entanglement. Per the brief, the particle burst itself was
  **not attempted** (explicitly gated on "everything else done + 15 min
  left," not the case after the root-cause work). Full derivation:
  `docs/battle-menu-notes.md` §3 item 5 (updated this session).
- **Next:** implement the player-side particle burst (origin + render-lag
  offset — likely reusable machinery from the opponent's own
  `drawBallOpenParticles`/`PARTICLE_ORIGIN`/age table, same derivation
  pattern §7.14/§7.18/§7.20 used for the opponent side) — once landed,
  ticks 1653-1663 should flip to full-frame-exact with no further changes
  to the BG fade or materialize accumulator. Then: healthbox slide-in →
  settle 1693 (entangled with materialize's own tail per §3 item 5); blank
  box + menu draw + idle (1742-1810). Brendan-vs-icon sprite-priority
  compositing (#96) and the #96 OAM-order general fix remain
  supervisor-scheduled, untouched.
- **Notes:** stayed in `battleMenu.ts` (pure timing) + additive
  `battleScene.ts` hooks (one new call inside the existing
  `drawSendOutHandoff`, no reordering) + `tests/battleMenu.test.ts` +
  `docs/battle-menu-notes.md`, per the brief. Did not touch
  `battleScene.ts`'s opponent-side internals, `tests/battleScene.test.ts`,
  or `docs/battle-scene-notes.md`. No PAPERCUT — the newest PAPERCUTS.md
  entry's "A/B the baseline first" advice is exactly what let this session
  separate the real root cause from the ONIX-shaped noise immediately.

---
