# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 98 — Bounded worker: ONIX MATERIALIZE window started — ball open-pose swap landed exact (tick 1652), materialize accumulator/`y2` derived + pixel-verified correct in isolation but NOT shippable yet — blocked by a pre-existing, un-root-caused full-frame residual from tick 1653 on (not this session's bug)

- **State:** `npm test` **510/510** (+3 Tier-1), `npm run build` green, tree
  clean. New `tools/compare/traces/menu-materialize.json` (tick 1652 only):
  **1/1** at 0 diff. Spot-check regression sweep (not the full 21 — time-
  capped): `sendout.json` **215/256**, `menu-throw.json` **70/70**,
  `menu-text.json` **18/18**, `scene-assembly.json` **256/256**, `anchor.json`
  **1/1** — all at their exact established counts, zero regressions.
- **Did:** implemented `drawPlayerBallOpen`/`playerBallOpenTopLeft`
  (`battleMenu.ts`+`battleScene.ts`) — the ball's `StartSpriteAnim(sprite,1)`
  "open" pose swap one tick after arrival (1652), clipped to screen y<112
  (pixel-confirmed terrain occlusion — only the sprite's own top 2 rows are
  ever visible at this screen position, resolving `battle-anim-assets.md`
  §5's named placement gap). Also implemented `drawPlayerMaterialize`
  (ONIX's own `BATTLER_AFFINE_EMERGE` scale-in silhouette, same shared
  `SpriteCB_ReleaseMonFromBall`/accumulator table mechanism 4 already uses):
  corner `(40,48)` (brute-force-confirmed via the settled back sprite's own
  zero-diff exact match), accumulator lookup `local+2` (one step later than
  mechanism 4's own `local+1` — a real, distinct offset for this call site,
  not copied), reusing mechanism 4's exact 12-entry `y2` table verbatim —
  all derived via oracle-pixel brute force
  (`tools/compare/scratch/menu-audit/onix_materialize_bruteforce.mjs`,
  committed) against `battle1-menu-dense.json`, cross-checked by confirming
  it reduces the full-frame diff at every tick 1653-1663 by EXACTLY the
  tint silhouette's own pixel count each tick (150px→1551px, matching
  `docs/battle-menu-notes.md`'s own independently-harvested exact-tint-pixel
  table 1:1) — strong evidence the derivation is correct even though it
  isn't in the committed trace (see below).
- **Why the window stops at 1652, not ~1690 as the brief hoped:** a
  `git stash` A/B check proved a large (~2400px at 1653, growing to
  ~7700px by 1663) full-frame pixel residual already exists on this
  session's UNMODIFIED starting code for every tick from 1653 on — i.e. it
  predates this session and isn't caused by anything landed here. Its shape
  (small, ~8-9-per-channel deltas scattered across most of the frame width
  at y≈51-52, not confined to ONIX's own `(40,48)`-`(104,112)` box) doesn't
  match the ONIX/ball/particle mechanisms this step targets, and wasn't
  root-caused this session (time-boxed). Since it alone exceeds a 0-diff
  bar for every tick past 1652, extending the committed trace past it would
  mean shipping a nonzero-diff trace — not done, per this run's own rules.
  Full derivation + exact evidence: `docs/battle-menu-notes.md` §3 item 5
  (updated this session).
- **Next:** (1) root-cause the pre-existing ~1653+ full-frame residual (NOT
  ONIX-shaped — start by bisecting which existing mechanism/table stops
  covering this far into the trace); once fixed, `drawPlayerMaterialize`
  (already landed, already verified correct in isolation) should start
  flipping full-frame-exact ticks with no further changes; (2) the
  open-particle burst (mechanism 3's player-side analogue) — fully
  unattempted this session; (3) healthbox slide-in → settle (the idle-bob
  interaction flagged in §3 item 5 makes this entangled with materialize's
  own tail, don't attempt independently); (4) full 21-trace sweep before
  the next window extension (this session only spot-checked 5). Brendan-
  vs-icon sprite-priority compositing (#96) and the #96 OAM-order general
  fix remain supervisor-scheduled, untouched.
- **Notes:** stayed out of battleScene.ts's opponent-side internals/
  battleScene.test.ts (the concurrent worktree worker's territory) — only
  additive `drawPlayerBallOpen`/`drawPlayerMaterialize` + call-site hooks in
  `drawSendOutHandoff`, plus `battleMenu.ts` pure functions and
  `docs/battle-menu-notes.md` (mine to edit). docs/battle-scene-notes.md,
  ROADMAP.md, oracle/harness untouched. PAPERCUT: this step's brief assumed
  the window would cleanly reach ~1690 given "assets ready"; a full 45-min
  session went mostly to pixel-forensics (corner/accumulator/occlusion
  brute-forcing) before finding the REAL blocker was a pre-existing,
  unrelated residual outside this step's own code — ~10-15 min lost to not
  A/B-testing against unmodified code sooner.

---

## 97 — Bounded worker: ball-spin GBA affine keyframe animation landed (§3 item 4's named blocker) — `menu-throw.json` densified to every tick 1574-1651, **70/70** 0-diff (was 33/33); ball arrival pinned exact at trace tick 1651

- **State:** `npm test` **507/507** (+6 Tier-1), `npm run build` green,
  tree clean. Full 21-trace sweep against the live oracle: all 20 others at
  their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  sendout 215/256, menu-text 18/18) — zero regressions.
  `tools/compare/traces/menu-throw.json` extended from 33 committed
  captures (1574-1614) to 70 (1574-1651, still minus #96's 8 named-excluded
  Brendan-vs-icon ticks): **70/70** at 0 diff.
- **Did:** implemented `playerThrowBallSpin` (`battleMenu.ts`) +
  `drawSpriteSheetAffineRotate` (`battleScene.ts` - this codebase's first
  TRUE-rotation affine OAM sampler; mechanism 4/5 both special-case
  `rotation=0`), covering trace tick 1615 (where the GBA affine "ball spin"
  starts, `StartSpriteAffineAnim(sprite, 4)`) through arrival. Root-caused
  via source (`SpriteCB_PlayerMonSendOut_2`, `pokeball.c:915-953`) +
  RAM ground-truth (new probe `tools/probe/specs/sendout-ball-spin.json`;
  ball sprite = `gSprites[5]`, ID'd by matching its callback pointer to
  `SpriteCB_PlayerMonSendOut_2`'s address via
  `tools/probe/dump-task-and-sprite-callbacks.py`) rather than hand-sim
  alone — the control flow was subtler than #94's blocker note implied
  (`sprite->sBattler`/`data[6]` inside the branch is the arc's own angular
  step by this point, not the original battler index, since
  `InitAnimArcTranslation` already overwrote it — full derivation in
  docs/battle-menu-notes.md §3 item 4c). The rotation itself is a clean
  closed form (`+=25` GBA angle units/tick, confirmed by hand against RAM),
  but kept as a literal per-tick matrix table (`BALL_SPIN_TABLE`) because
  this codebase's `gbaSin` (`Math.sin`-derived, not a literal
  `gSineTable` copy) is off by up to 1 Q8.8 unit at some indices — invisible
  to the existing sine-ARC mechanisms but not to a rotate SAMPLE kernel
  (confirmed by brute-force oracle diffing: sparse 1-11px edge diffs at
  exactly the affected ticks, gone once swapped to RAM-exact values). Same
  render-lag convention as mechanism 4/5 (§7.21), RAM-confirmed here rather
  than assumed. **Arrival pinned exact: trace tick 1651** (was "~1646"
  coarse) — resolves that "not tick-exact" item in docs §3. 6 new Tier-1
  tests (`tests/battleMenu.test.ts`): keyframe/matrix pinning at the first
  spin tick, the last spin tick, and arrival, plus 3 oracle-cross-checked
  rendered-pixel tests.
- **Window boundary (why 1651, not further):** tick 1652 is where
  `SpriteCB_ReleaseMonFromBall` (which takes over the RAM tick after
  arrival) starts the ball's own "open" pose swap
  (`StartSpriteAnim(sprite,1)`), and tick 1653 is where the magenta
  materialize silhouette color first appears anywhere in the frame
  (oracle-confirmed by direct pixel search) — both the already-named,
  out-of-scope materialize/ball-open mechanism (docs §3 item 5), not a new
  gap. Stopped there per the brief rather than reaching into that mechanism.
- **Next:** (1) materialize (~1653+, ball-open particles + affine-emerge +
  color-fade — assets already confirmed ready per `battle-anim-assets.md`
  §5, "just" placement/timing); (2) Brendan-vs-icon sprite-priority
  compositing (#96's named blocker, 8 ticks, wants a proper
  OAM-priority-aware compositor); (3) healthbox slide-in → settle 1693; (4)
  blank-box + menu draw + idle (1742-1810). Sendout residuals continue
  separately (§7.21's named 1493-1503 matrix-early gap, 1516/17 age
  overrun, 1470/71/79 icon edge, tick 1462).
- **Notes:** stayed out of battleScene.ts's mechanism-5 (GROVYLE stretch)
  internals and tests/battleScene.test.ts (the concurrent worker's
  territory) — only additive `drawSpriteSheetAffineRotate` + a call-site
  hook in `drawSendOutHandoff`. docs/battle-scene-notes.md, oracle/harness,
  ROADMAP.md untouched, per the brief. No PAPERCUT.
  **Supervisor merge addendum (post-#97):** worktree branch
  `wt-20260719-004700` merged (docs-only, §7.22): §7.21's 1493-1503
  matrix-early gap was root-caused and its fix VERIFIED (5 ticks'
  Grovyle region → 0px) but reverted per the step's strict >215 bar — an
  unrelated ~138px band sliding ~5px/tick across x∈[0,42], y∈[17,42]
  (opponent-healthbox slide-in region) masks those ticks from full-frame
  exactness. §7.22 records the 7 RAM table entries + compositing-order
  correction for exact re-application once the band is fixed — that
  combined step is round 5's worktree brief.

---


