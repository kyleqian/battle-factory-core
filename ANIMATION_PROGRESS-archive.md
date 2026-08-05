# Animation coverage — archive

Older dated sections moved out of `ANIMATION_PROGRESS.md` to keep that
file lean (`AGENTS.md`'s ~3-most-recent convention). Git history has the
full record regardless; this file is a read-only reference.

## Supervisor wind-down — rung-3 dispatcher COMPLETE + Steel Wing reconciled (2026-08-04 PM session)

- **State:** the 2026-08-04 user directive is fully delivered. All three ISSUES
  #71 cross-lane ask items are exported from `src/animation/sendOutDispatcher.ts`
  / `sendOutSpriteFrame.ts` with a live-measured anchor, and the queued Steel
  Wing reconciliation landed (opponent-front **197/197** complete, player-back
  **180/197**, status stays partial). Move coverage: **107/276 exact, 1
  partial, 0 staged, 168 unsupported**. Final merged full suite **720 files /
  6,924 passed / 1 skipped**, build green, no worker worktrees or branches
  left. Six DeepSeek V4 Flash worker rounds, six verified merges, zero failed
  rounds (per-step entries below).
- **For the main program:** Slice D can brief against this contract now —
  (1) `frontSendOutFrameAtTick(species, ticksSinceStart)`: per-tick `{x2,y2}`,
  terminal-clamped, species→family internal; (2)
  `frontSendOutSpriteFrameAtTick(species, ticksSinceAnimStart)` +
  `hasTwoFramesAnimation(species)`: the two-frame ANIMCMD half; (3)
  `backSendOutFrameAtTick(species, natureName, ticksSinceStart)`. **Anchor,
  RAM-measured** (fixtures `tools/compare/fixtures/front-send-out-flight-*.json`):
  the movement anim installs on the `affineAnimEnded` tick plus
  `animationDelay[species] − 1` when the delay is nonzero (pre-decrement,
  source-verified); the two-frame program starts on the affineAnimEnded tick
  undeferred; rendered OAM `x2/y2` for reducer tick N appears at alignment
  **A = −1** (one-display-frame latch, `max(0, frame − t_move − 1)`), validated
  per-tick across three species incl. RATTATA's full 87-frame flight. The two
  `src/engine/` hand-fits (kabutoSendOut.ts, battleMenu.ts tables) remain in
  place — retiring them stays the coordinated cross-lane change per the
  program doc §6. `docs/steel-wing-residual-diagnosis.md` holds the verified
  residual map for STEEL_WING's two remaining player-side ranges.
- **Next:** (a) player-side STEEL_WING ranges 144-155 (faded-vs-unfaded gust
  palette base) and 181-185 (slide-back start/rate) — both scoped in the
  diagnosis doc; (b) prove opponent 197/197 twice fresh before any promotion;
  (c) await main-lane Slice D fold feedback.
- **Notes:** oracle-freshness FAIL at session start was the known docs-only
  false positive (single NOTES.md harness commit since 8012 start). Probe
  landmines documented in the session memory: `preCheckpointCaptureAllFrames`
  opt-in, `resolve_probe_command` relative-path venv routing, animNum-flip
  anchor marker.

## `MOVE_STEEL_WING` reconciliation landed — opponent 197/197, player 180/197 (2026-08-04)

- **State:** implemented the five confirmed fixes plus two source-derived target
  anchors. Production framebuffer identity: **player-back 168→180/197** and
  **opponent-front 140→197/197** (complete), both twice-fresh via the portable
  compare (evidence/RGB hashes reproduce; no drift). Move coverage unchanged:
  **107/276 exact, 1 partial (STEEL_WING), 0 staged, 168 unsupported** — status
  stays **partial** (player incomplete; opponent's 197 is once, not twice-fresh).
- **Did:** player 168 → **180/197**: +1 ellipse terminal tick≥15 inactive (age
  126), +10 hitsplat affine 303 + displayed-first-frame (ages 156-165), +1
  metallic grayscale gate (age 9). Opponent 140 → **197/197**: +26 gust startY
  +0 (ages 111-136), +1 enemy shadow (age 0), +1 metallic grayscale gate (age
  9), +18 gust/hitsplat **target Y_PIC_OFFSET** (ages 137-154; the source's
  `relative_to=ANIM_TARGET` / `InitAnimLinearTranslation` anchor is +8 for the
  player-back target, not the attacker's), +10 hitsplat affine 303 +
  target-y + displayed-first-frame (ages 156-165), +1 hitsplat absent at the
  creation frame (age 155 — direct pixel measurement shows the oracle's
  hitsplat is NOT rendered at creation; the diagnosis's "renders on creation
  frame" was OAM-presence misread as rendered).
- **Pins changed:** `steelWing.test.ts` — elliptical tick-15 inactive (was
  terminal (-5,1) residue), tick-14 (-9,2) as last visible, added opponent
  gust startY +0 pin; `steelWingEvidence.test.ts` — per-fixture counts 180/197
  (was generic `<197`, which the opponent's complete identity now exceeds).
- **Next:** player's two remaining ranges are the explicitly out-of-scope
  plausible ones: ages 144-155 faded-vs-unfaded GUST palette base, ages
  181-185 slide-back start/rate (derived offset 23, 2/frame decrement). Prove
  opponent 197/197 twice fresh before any promotion.
- **Notes:** the diagnosis's age-9 "metal band one callback early" was a
  misattribution (pixel-verified: the initializer's grayscale palette is what
  latched one display late; the metal band itself is invisible over the
  attacker). The opponent ages 136-155 "startY carry-through" was incomplete —
  the residual was the target's Y_PIC_OFFSET, not the gust start. No shared
  `metallicShine.ts` change (gate is STEEL_WING-local); no boundary widening.
  No PAPERcuts this session.

## STEEL_WING residual diagnosis doc landed (2026-08-04, READ-ONLY audit)

- **State:** `docs/steel-wing-residual-diagnosis.md` records the mechanism
  attribution for every divergent framebuffer range of the MOVE_STEEL_WING
  partial. Move coverage unchanged: **107/276 exact, 1 partial, 0 staged, 168
  unsupported**; STEEL_WING stays partial. No production edits, no `src/`
  commits, `ANIMATION_COVERAGE.json` untouched.
- **Did:** reran both portable orientations (fresh, own mGBA); counts reproduce
  exactly (**168/197** player-back and **140/197** opponent-front, no drift).
  Per-range probe+diff analysis attributes **12 of 14 distinct ranges**, split
  8 confirmed-by-evidence / 2 plausible / 2+1 unresolved-but-narrowed.
  Confirmed: metallic-BG1 band one callback early (player+opp age 9);
  elliptical tick-15 residue (player 126 — source wrap-frame resets to 0);
  hitsplat affine 303-vs-372 (`HitSplat_1` 0xD8 vs the app's 0xB0) + hitsplat
  first frame deferred by the `displayed` lag (both, 155-165); opponent gust
  `startY` should be `+0` not `−8` (opp 111-155); enemy shadow renders exactly
  one frame at the opponent dense-window head (opp 0). Plausible: slide-back
  start/rate (player 181-185), faded-vs-unfaded gust palette base (player
  144-155, exact render path unisolated). Ruled out: front-idle two-frame
  cadence (Wingull ANIMCMD held at rest frame all window; rung-3 modules do
  not apply), gust palette-rotation timing, alpha/monbg blend.
- **Next:** an implementation step can fix the confirmed mechanisms directly
  from the doc; the two plausible ranges list the exact probe to pin them.
- **Notes:** one recorded range boundary moved: the player entry said ages
  144-164, this audit measures **144-165** (same total, age 165 also diverges).
  No PAPERcuts (only audit tooling was reused). Committed doc+entry only; tree
  clean at commit.

## Rung-3 BACK send-out dispatcher landed (2026-08-04)

- **State:** ISSUES #71 rung-3 cross-lane ask item 3 (back variant) complete
  and green — all three cross-lane items now delivered (front per-tick, OAM
  frame side, back variant). Move coverage unchanged: **107/276 exact, 1
  partial, 0 staged, 168 unsupported**; `ANIMATION_COVERAGE.json` untouched.
  The only production edit adds exports to `sendOutDispatcher.ts`. No engine
  edits, no boundary/unsupported widening.
- **Did:** `backSendOutFrameAtTick(species, nature, ticksSinceStart)` in the
  same contract shape as the front half: resolves the species' back set +
  nature-mod selector via `selectBackSendOutAnimation` (`3 * backAnimSet +
  natureMod` lookup), routes through the exported 25-set
  `BACK_SEND_OUT_REDUCERS` map, and returns the frozen `{ x2, y2 }`
  projection. `BACK_ANIM_GROW` is the one set with two reducer entry points:
  selector `ANIM_GROW_IN_STAGES` → `backGrowInStagesFrameAtTick`, the shared
  Grow selectors (`ANIM_GROW`/`ANIM_GROW_TWICE`) → `backGrowFrameAtTick`
  (verified via `growVariant`'s speed/runs split, not blind-trying). No
  terminal-clamp table: back reducers return their own stable terminal frames
  (ShakeGlow settled-tick scan pinned, 200-window stable run).
- **Next:** supervisor's call — Steel Wing reconciliation remains queued per
  the 2026-08-04 directive.
- **Notes:** routing totality = **386 species keys × 25 natures = 9,650**
  combos, every one non-null at tick 0 and equal to its direct reducer's
  `{ x2, y2 }` projection; per-set passthrough over all **25/25** sets at
  ticks [0,1,5,17,40,90,200] exact incl. both GROW entry points. Nature names
  accepted verbatim via `BACK_ANIM_NATURE_ORDER` (length 25). Tests
  `tests/animation/backSendOutDispatcher.test.ts` (7). Focused 4 files / 22
  tests (incl. both ratchets), typecheck, smoke **7/347**, full **720 files /
  6,923 passed / 1 skipped**, build green. Committed on
  `worker/animation-20260804-142745`; tree clean at commit.

## Rung-3 FRONT send-out ANCHOR pinned live (RAM probe, all three flights) (2026-08-04)

- **State:** ISSUES #71 rung-3 item 1's "define the anchor explicitly"
  follow-up complete and green. Move coverage unchanged: **107/276 exact, 1
  partial, 0 staged, 168 unsupported**; `ANIMATION_COVERAGE.json` untouched.
  The only production edit is the `frontSendOutFrameAtTick` doc comment
  (`sendOutDispatcher.ts`); `sendOutSpriteFrame.ts` needed no change ((iv)
  confirms its anchor). No engine edits, no boundary/unsupported widening.
- **Did:** `tools/compare/frontSendOutFlightProbe.py` captures the Scene-ON
  opponent front send-out flight inside `BattleLab.prepare()`'s fast-forward
  (`preCheckpointCaptureAllFrames` set on the scenario dict, never the
  committed scenarios), reading `gBattlerSpriteIds[1]` plus both
  `Task_HandleMonAnimation` and `Task_AnimateAfterDelay` task scans. Anchor =
  first battler1 animNum 0→1 after the `SpriteCB_OpponentMonFromBall` emerge
  installs (naive flip detection is noise — the slot points at rental-screen
  sprites pre-battle). Six fixtures committed under
  `tools/compare/fixtures/front-send-out-flight-<species>-run-{a,b}.json`,
  twice fresh and byte-identical: GROVYLE `84829e36…`, PIDGEOTTO
  `32414807…`, RATTATA `8d9d36f3…`. Evidence test
  `tests/animation/sendOutDispatcherAnchorEvidence.test.ts` (11 tests)
  validates the dispatcher per tick at alignment A = −1 over every flight row
  from t_move through t_end (no skips).
- **Next:** rung-3 remaining item — the back variant
  (`species, nature, ticksSinceStart`) in the same contract shape.
- **Notes:** measured anchor table: GROVYLE (V_STRETCH, delay 0)
  t_anchor=t_move=1616, t_end=1658, gap 0; PIDGEOTTO (V_STRETCH, delay 25)
  t_anchor=1618, t_move=1642, t_end=1684, gap 24 (SpriteCallbackDummy_2 holds
  1618..1641 while the delay task counts 24→0); RATTATA (RAPID_H_HOPS, delay
  0) t_anchor=t_move=1616, t_end=1703, gap 0, settled {x2:1, y2:0}. Validated
  per-tick rows: GROVYLE 42, PIDGEOTTO 42, RATTATA 87 (incl. the clamp).
  Alignment A = −1 — the callback's OAM write latches one display frame late
  (KABUTO hand-fit precedent); at t_move the row holds the pre-flight {0,0}
  (install frame, callback not yet run) and the test asserts that boundary
  explicitly. **Brief deviation to flag:** the brief expected PIDGEOTTO gap =
  delay-0 gap + 25, but the ROM measures **24** — `Task_AnimateAfterDelay`'s
  `--sAnimDelay == 0` pre-decrement consumes the creation frame, so the Anim_*
  install is `delay − 1` frames after the affineAnimEnded handoff. The doc
  records the measured formula and the test asserts `gap = delay − 1` with
  delay read from the selector tables (not hardcoded). GROVYLE animCmdIndex
  matches the index-1 program's cumulative durations with **latch offset 0**
  (the program is visible on the anchor frame, undelayed). Focused 4 files /
  26 tests, typecheck, smoke **7/347**, full **719 files / 6,916 passed / 1
  skipped**, build green. Committed `7d4e2020` (probe+fixtures) then
  `8efef5c1` (evidence test + doc); tree clean at commit.

## Rung-3 send-out sprite-frame (OAM/anim-frame) half landed (2026-08-04)

- **State:** ISSUES #71 rung-3 item 2, the species-generic sprite ANIMCMD
  half, complete and green. Move coverage unchanged: **107/276 exact, 1
  partial, 0 staged, 168 unsupported**; `ANIMATION_COVERAGE.json` untouched.
  No engine edits; no boundary/unsupported widening.
- **Did:** extractor `tools/extract/extract-front-pic-anim-programs.ts` parses
  the index-1 `sAnim_<Name>_1` programs (front_pic_anims.h:1-4808), the
  SINGLE/DOUBLE_ANIMATION macro arrays (4825-5253), the three hand-written
  `sAnims_` arrays (Blaziken 5083, Spinda 5115, Castform 5194) and
  `gMonFrontAnimsPtrTable` (5255-5697) into
  `front-pic-anim-programs.json` — **439 species keys / 415 index-1 tables**;
  throws on any non-FRAME/END ANIMCMD form. Production module
  `sendOutSpriteFrame.ts`: `hasTwoFramesAnimation` (pokemon.c:6988 predicate,
  false for unkeyed species) and `frontSendOutSpriteFrameAtTick` (null for
  unknown species/invalid ticks, 0 for the excluded species, cumulative
  step-window walk, ANIMCMD_END last-frame hold, loud throw on frames outside
  0|1); doc comment states the tick-0 anchor verbatim (`StartSpriteAnim(sprite,
  1)` = the `affineAnimEnded` tick, never deferred by animationDelay).
- **Next:** remaining rung-3 items — the live RAM-probe anchor pin, then the
  back variant (`species, nature, ticksSinceStart`) in the same contract
  shape.
- **Notes:** cross-checks: all 6 summary-front-animation probe rows reproduced
  (ONIX `[{1,50},{1,30},{0,30}]` …; SPINDA row correctly absent) + KABUTO
  equals the 8-step engine literal (pinned, no engine import). Census: every
  `frontAnimIds.species` key has a program except the pinned `["SPINDA"]`;
  excluded species CASTFORM/DEOXYS/UNOWN recorded verbatim (predicate, not
  data, excludes). **Stop-and-report:** EGG's `_1` program carries frames 2|3
  (verbatim), so walking it throws by the invariant — EGG is not Factory-
  legal, unreachable in the engine. Extractor twice byte-identical (SHA-256
  `144239f6...`). Focused 3 files / 21 tests, typecheck, smoke **7/347**, full
  **718 files / 6,905 passed / 1 skipped**, build green. Committed
  `ce88ad7b`; tree clean at commit.

## Rung-3 FRONT send-out dispatcher landed (2026-08-04)

- **State:** ISSUES #71 rung-3 item 1, FRONT half, complete and green. Move
  coverage unchanged: **107/276 exact, 1 partial, 0 staged, 168
  unsupported**; `ANIMATION_COVERAGE.json` untouched at SHA-256
  `162b48ff87e3d38897ff53a871dbda868a46ae84ea3149a08bc8df8d74288ae7` (the
  `6e8067e5...` literal in older entries predates the Steel Wing partial
  recording). No engine edits, no boundary/unsupported widening.
- **Did:** added `src/animation/sendOutDispatcher.ts` (front half only):
  `frontSendOutFrameAtTick(species, ticksSinceStart)` resolves the species'
  `ANIM_*` front family from `selectorTables.frontAnimIds.species`, guards on
  its own dispatch table before casting, clamps the tick to
  `FRONT_SEND_OUT_TERMINAL_TICKS[family]` (copied verbatim from
  `computeTerminalOffset`'s per-case literals; RAPID_H_HOPS loop-verified last
  non-null tick **85**, `{x2:1,y2:0}`), and returns `Object.freeze({x2, y2})`
  from the same single-tick reducer each switch case calls; a below-clamp
  reducer null is passed through. Doc comment states the exact tick-0 anchor
  (`SpriteCB_OpponentMonFromBall` @ `battle_main.c:2838` + animationDelay).
  Tests `tests/animation/sendOutDispatcher.test.ts`: **386-species** terminal
  consistency vs `speciesFrontIdleRestOffset`, **62-family** mid-flight
  passthrough vs each reducer directly (families enumerated from the
  `FRONT_SEND_OUT_TERMINAL_TICKS` export), clamp (RAPID_H_HOPS via ONIX +
  4 families) incl. `ONIX@85 == {x2:1,y2:0}`, null inputs (unknown species,
  OLD_UNOWN_B, -1, 1.5), frozen return.
- **Next:** remaining rung-3 items — OAM/anim-frame side
  (`HasTwoFramesAnimation` / `sMonAnimationDelayTable`-derived frame-index
  state), the live RAM-probe anchor pin, and the back variant
  (`species, nature, ticksSinceStart`) in the same contract shape.
- **Notes:** focused dispatcher + animation boundary + frontier ratchet
  **3 files / 15 tests**; typecheck, smoke **7 files / 347 tests**, full
  **717 files / 6,893 passed / 1 skipped**, and build green. Committed as
  `96ef4acf` (+ `b627e991` interface cleanup); tree clean at commit.

## USER DIRECTIVE (2026-08-04, recorded from the user's interactive session): the §6 rung-3 send-out dispatcher is this lane's next bounded step

- **Directive:** the first bounded step of the next animation session is
  the send-out dispatcher — `docs/send-out-intro-animation-program.md` §6
  rung 3: a dispatcher in `src/animation/` keyed by species (front) and
  species+nature (back), replacing the three one-offs. Start it before any
  new selector/move-animation program. The Steel Wing reconciliation in the
  entry below is not displaced — it queues right after (supervisor's
  ordering call), but the dispatcher goes first.
- **Contract:** `docs/send-out-live-wiring-consumer-map.md` §5's cross-lane
  ask, verbatim: (1) `frontSendOutFrameAtTick(species, ticksSinceStart)`
  doing the species→family lookup internally over the 62 accepted front
  reducers, with the tick-0 **anchor** defined explicitly in its doc
  comment; (2) the OAM/anim-frame side (`HasTwoFramesAnimation`/
  `sMonAnimationDelayTable`-derived frame-index state — KABUTO's
  `kabutoFrame` is the only current example of the shape); (3) the back
  variant (`species, nature, ticksSinceStart`) in the same contract shape.
  The front functions are the piece gating the main lane. Retiring the two
  `src/engine/` hand-fits stays a coordinated cross-lane change per §6 —
  do not drive-by them from this lane.
- **Why now:** this is ISSUES #71's open cross-lane ask. Main-lane Slice D
  (live hookup of the banked intros at the generated battle-start seam) is
  gated on it and queued for the next main session; both front and back
  families are now fully banked (62/62 front, 25/25 back sets), so nothing
  else in this lane precedes it.
- **Acceptance:** program doc §7 unchanged — RAM probe of the settled
  sprite, dense oracle window twice fresh, sibling-species spot-check per
  promoted function.
- **For the main program:** the main lane was notified the same day
  (ISSUES #71 note + PROGRESS.md entry 914 addendum) — it briefs Slice D
  only after folding the landed dispatcher.

## `MOVE_STEEL_WING` source/evidence partial (2026-08-04)

- **State:** **107/276 exact, 1 partial, 0 staged, 168 unsupported**.
  Steel Wing is deliberately not promoted: complete production framebuffer
  identity is **168/197 player-back** and **140/197 opponent-front**.
- **Did:** ported the source-relative GUST/IMPACT, elliptical, palette-cycle,
  two-gust affine/linear, mirrored slide, hitsplat, monbg/alpha and cleanup
  body behind the typed Scene-ON seam. Extracted GUST from pinned source.
  Source-audited Wing Attack and Razor Wind with explicit no-credit results.
- **Next:** reconcile the remaining live compositor differences (player ages
  9, 126, 144-164 and cleanup edge; opponent initial/front-idle and contact
  ranges), then rerun both complete windows twice before changing status to
  exact. GUST/TranslateMonElliptical still lack an exact representative.
- **Notes:** legal Hardy Factory Wingull record 45 vs legal Onix, complete
  197-frame windows through first inactive cleanup. Twice-fresh byte-identical
  evidence/raw RGB: player frames **77-273** `e321040c...f52` /
  `2f44c811...b69`; opponent frames **81-277** `7af04b35...659` /
  `25c8e06b...e1`. Receipts retain script state, tasks, software/hardware OAM,
  matrices, palettes/tags, registers/blend, audio/pan, and stable battlers.
  Focused source/reducer/seam/evidence tests and both ratchets, typecheck,
  smoke **7 files / 347 tests**, final full **712 files / 6,856 passed / 1
  skipped**, build (**556 modules**), and coverage are green. No boundary or
  unsupported-branch widening.

## Back `BACK_ANIM_SHAKE_GLOW_BLUE` triple accepted (2026-08-04)

- **State:** player-back selector program complete: **25/25 sets, 75/75
  selector variants, 376/376 Factory mappings**. Generated row: **13
  mappings / 11 Factory species / 2 outside (LUGIA, KYOGRE) / 54 Factory
  records**. Move coverage remains **107/276 exact, 0 partial, 0 staged,
  169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged at SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **148/149/150** through the accepted shared
  `ShakeGlow_Blend` / `ShakeGlow_Move` lifecycle: `SHAKEGLOW_BLUE == 2`,
  even-tick `Sin(data[2], 12)` RGB_BLUE blending, fast/normal/slow **10/2,
  20/1, 80/1**, thresholds **54/54/24**, both `TryFlipX` calls no-op through
  the truthy `data[1]`/`sDontFlip` alias, and terminal coefficient-zero
  RGB_RED restoration. Real Factory representatives: SWAMPERT record **458**
  Adamant/mod-0, WAILMER **170** Docile/mod-1, STARMIE **439** Modest/mod-2;
  all 13 mappings route under all three nature mods.
- **Next:** player-back selector work is closed; await the supervisor's next
  bounded animation step. No move was promoted by this component acceptance.
- **Notes:** paired fresh, byte-identical dense Scene-ON initializer→
  WaitAnimEnd→dummy receipts retain every framebuffer hash plus player
  RAM/OAM/task and unfaded/faded/hardware OBJ palettes: Swampert **1840..1970
  / 131 / 134,294 B / `4f5ff4465b1a6ec30a1d61e9467ce47d29307a5aca14eb5a4139e56fa98b615e`**;
  Wailmer **1839..1969 / 131 / 133,489 B /
  `cf50bd129485c7973a8ed2899c47a031ab8151d04a3952b7fabf2f423563c6a1`**;
  Starmie **1839..1969 / 131 / 133,425 B /
  `34dbd9c657faaf5417ec6eb1849b84e1e41b920e17d1220448c668319e36dfe4`**.
  No Lugia/Kyogre oracle variants were invented. **Accounting correction:**
  accepted sets 1–24 sum to **365**, not the previously carried 366 (+1
  arithmetic error); corrected cumulative figures are set20 **310**, set21
  **343**, set22 **351**, set23 **364**, set24 **365**. Per-row censuses were
  already correct and are unchanged. Focused red/green/blue plus both
  ratchets: **8 files / 45 tests**; typecheck, smoke **7/347**, full **710
  files / 6,847 passed / 1 skipped**, build, and coverage are green. No
  boundary/unsupported widening or coverage-ledger mutation.

## Back `BACK_ANIM_SHAKE_GLOW_GREEN` triple accepted (2026-08-04)

- **State:** exact for the twenty-fourth bounded player-back set: **24/25 back
  sets, 72/75 selector variants, 365/376 Factory mappings**. Generated row:
  **2 mappings / 1 Factory species (ROSELIA) / 1 outside (CELEBI) / 2
  Factory records**. Move coverage remains **107/276 exact, 0 partial, 0
  staged, 169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged at
  SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **145/146/147** through the accepted shared
  `ShakeGlow_Blend` / `ShakeGlow_Move` lifecycle: `SHAKEGLOW_GREEN == 1`,
  green blend, fast/normal/slow **10/2, 20/1, 80/1**, thresholds
  **54/54/24**, and terminal RGB_RED coefficient-zero restoration.
  `data[1]` aliases `sDontFlip`, so both `TryFlipX` calls are no-ops for
  green, unlike red. Batch routing covers both mappings under all three
  nature mods and both real ROSELIA records **171/276** (Docile/mod-1).
- **Next:** await the supervisor's next bounded player-back selector step;
  blue ShakeGlow set 25 remains an independent acceptance unit.
- **Notes:** paired fresh, byte-identical Scene-ON initializer→WaitAnimEnd→
  dummy receipts retain every framebuffer hash plus player RAM/OAM/task and
  unfaded/faded/hardware OBJ palettes: real record-171 normal **1839..1969 /
  131 / 130,940 B / `38dcc94a15e253c112e84b0b844d5f41bd9ba9ef9e968c797638b458f3d21938`**;
  transparently staged record-171 Hardy fast **131,618 B /
  `6a1395b23696509bdd09a9e49bc58e80e3219b16de26cb1742d77ef552cb1b2e`**;
  Quiet slow **131,677 B /
  `76013269c7bb6c31429b41a7ef69dd0cdfd1dfb386043b3edfa391d94b9013fc`**.
  No Celebi oracle variant was invented. Focused green/red regression plus
  both ratchets: **6 files / 33 tests**; typecheck, smoke **7/347**, full
  **708 files / 6,835 passed / 1 skipped**, build (**554 modules**), and
  coverage are green. No boundary/unsupported widening, coverage-ledger
  mutation, or move promotion.

## Back `BACK_ANIM_SHAKE_GLOW_RED` triple accepted (2026-08-04)

- **State:** exact for the twenty-third bounded player-back set: **23/25 back
  sets, 69/75 selector variants, 364/376 Factory mappings**. Generated row:
  **15 mappings / 13 Factory species / 2 outside (HO_OH, GROUDON) / 42
  Factory records**. Move coverage remains **107/276 exact, 0 partial, 0
  staged, 169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged at
  SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **142/143/144**, `ShakeGlow_Blend`,
  `ShakeGlow_Move`, `SHAKEGLOW_RED`, even-callback signed `Sin(data[2],12)`
  palette blend/restore, selector parameters **10/2, 20/1, 80/1**,
  thresholds **54/54/24**, C division/mod-256 movement, data[3]/[5]
  sequencing, trailing data[2] increment, WaitAnimEnd→dummy, and task
  restoration. PONYTA record **191** Hardy/mod-0; SLUGMA **30**
  Sassy/mod-1; MAGCARGO **194** Gentle/mod-2; all 15 mappings batch-route
  under every nature mod.
- **Next:** await the supervisor's next bounded player-back selector step;
  green/blue ShakeGlow sets 24-25 remain independent acceptance units.
- **Notes:** paired byte-identical dense Scene-ON initializer→dummy receipts
  retain every framebuffer hash plus player RAM/OAM/task and unfaded/faded/
  hardware OBJ palette state: Ponyta **1838..1968 / 131 / 129,634 B /
  `5cec6564e1dccb9cda0a539647abbeb7b26e9d9138e3aa5d9e35fe365635dafa`**;
  Slugma **1838..1968 / 131 / 129,882 B /
  `cdcca3b12bd03086ee6ddd104cef245d62e6d3e645fb217adbbd42d812bcd295`**;
  Magcargo **1840..1970 / 131 / 130,055 B /
  `0fbfc262f9ccbec3e9736d26e2e768a609c2e5519a88cad84aedf310b2d5e9b4`**.
  Palette hardware is one-frame-lagged throughout; after the generic
  materialization task releases the palette at callback 24, every sine-rise,
  peak, fall, and red restore is exact. **Brief correction:** data[1] is the
  `sDontFlip` alias; writing `SHAKEGLOW_RED == 0` makes both TryFlipX calls
  active, so the ROM negates movement x2 (fast callback 55 is −4), proved in
  all receipts. Focused evidence + both ratchets: **4 files / 21 tests**;
  typecheck, smoke **7/347**, full **706 files / 6,823 passed / 1 skipped**,
  build, and coverage are green. No boundary/unsupported widening, outside-
  species oracle invention, coverage-ledger mutation, or move promotion.

## Back `BACK_ANIM_SHAKE_FLASH_YELLOW` triple accepted (2026-08-04)

- **State:** exact for the twenty-second bounded player-back set: **22/25 back
  sets, 66/75 selector variants, 351/376 Factory mappings**. Generated set
  census: **8 mappings / 8 Factory species / 0 outside / 33 Factory
  records**. Move coverage stays **107/276 exact, 0 partial, 0 staged, 169
  unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **139/140/141**, initializer pre-increment,
  `SetShakeFlashYellowPos`, all three `sShakeYellowFlashData` u8 tables and
  selector, and shared `ShakeFlashYellow`: cadence/sign flip, signed `-1`
  sentinel observed as 255, data[4]/[5]/[6] order, `OBJ_PLTT_ID`, yellow/zero
  `BlendPalette`, terminal x2/palette restoration, `WaitAnimEnd`→dummy, and
  task restoration. RAICHU record **487** Adamant/mod-0; PIKACHU **66**
  Docile/mod-1; LANTURN **381** Quiet/mod-2; all 8 mappings route under every
  real nature mod.
- **Next:** await the supervisor's next bounded player-back selector step;
  red/green/blue ShakeGlow sets 23-25 remain separate acceptance units.
- **Notes:** paired byte-identical dense Scene-ON initializer→dummy receipts
  retain every framebuffer hash plus player RAM/OAM/task and unfaded/faded/
  hardware OBJ palette state: Raichu **1838..1921 / 84 / 87,343 B /
  `1cfae5f795ab25c9b9182229f08fb448fba6120bce404de4059eaa327d98e97a`**;
  Pikachu **1839..1897 / 59 / 61,508 B /
  `583fd84fa59aed49dacfdabd291c94774ec058d49d87c3c58d010b2adc39a4cb`**;
  Lanturn **1839..1916 / 78 / 82,728 B /
  `5518bbe2a4ad1817190863e43e2ce70b2e9f3e0ae6f5153cbb78ef204d9a314c`**.
  Palette transfer is one-frame-lagged except Raichu frame 1844's observed
  same-frame restoration transfer. Focused source/census/routing/reducer/
  palette evidence plus both ratchets: **4 files / 23 tests**; typecheck,
  smoke **7/347**, full **704 files / 6,811 passed / 1 skipped**, build
  (**554 modules**), and coverage are green. No boundary/unsupported widening
  or move promotion.

## Back `BACK_ANIM_JOLT_RIGHT` triple accepted (2026-08-04)

- **State:** exact for the twenty-first bounded player-back set: **21/25 back
  sets, 63/75 selector variants, 343/376 Factory mappings**. Generated set
  census: **33 mappings / 33 Factory species / 0 outside / 74 Factory
  records**. Move coverage stays **107/276 exact, 0 partial, 0 staged, 169
  unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **136/137/138** `Anim_JoltRight_Fast` / normal /
  slow, their unguarded `HandleStartAffineAnim` initializers, and shared
  `JoltRight` phases `_0`/`_1`/`_2`/`_3`: signed x2 travel/clamp,
  accelerating return `data[7]`, strict `>` clamp, alternating signed
  `data[4]`, oscillation count, reset, `WaitAnimEnd`→dummy, and task
  restoration. Each source phase's two `TryFlipX` calls are retained; the
  player-back task's `sDontFlip=TRUE` makes them no-ops. MACHOP record **82**
  Adamant/mod-0; ELECTRIKE **64** Docile/mod-1; ELECTRODE **396** Quiet/mod-2;
  all 33 mappings route through the generated nature table.
- **Next:** await the supervisor's next bounded player-back selector step;
  do not infer move acceptance from this shared back-sprite track.
- **Notes:** fresh paired byte-identical dense Scene-ON initializer→dummy
  receipts retain every framebuffer hash and player RAM/OAM/affine/task state:
  Machop **1838..1875 / 38 / 18,361 B /
  `97166605e5f413f011a2e2851b507f094a32eced476ed50a040da850a100e01a`**;
  Electrike **1841..1873 / 33 / 16,000 B /
  `74ba2bf876194fbba6803eee2f35c7e7650604898d239173f63f36a72f821377`**;
  Electrode **1841..1863 / 23 / 11,425 B /
  `af21667986fab28c40b7bfe7d9934bc93e37615772459584b18702abd88b7141`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 20 tests**; typecheck, smoke **7/347**, full `npm test`, build, and
  coverage are green. No boundary or unsupported-branch widening and no move
  promotion.

## Back `BACK_ANIM_SHRINK_GROW_VIBRATE` triple accepted (2026-08-04)

- **State:** exact for the twentieth bounded player-back set: **20/25 back
  sets, 60/75 selector variants, 310/376 Factory mappings**. Generated set
  census: **23 mappings / 22 Factory species / 1 outside (DEOXYS) / 70
  Factory records**. Move coverage stays **107/276 exact, 0 partial, 0
  staged, 169 unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **133/134/135**, guarded initializer-first
  affine callbacks, and `ShrinkGrowVibrate`: cycle/duration **40/80,
  40/40, 80/80**, alternating even/odd amplitudes **32/8**, exact u16
  phase construction and signed `sinY / 8`, strict `data[2] > data[7]`,
  trailing increment, affine/OAM reset, `WaitAnimEnd`→dummy, task
  restoration, and player-back no-flip. SHEDINJA record **21** Naive/mod-0;
  RALTS **5** Docile/mod-1; ABRA **90** Lonely/mod-2; all 23 mappings route.
- **Next:** source-ranked unsupported player-back set **`BACK_ANIM_JOLT_RIGHT`
  (set 21): 33 mappings / 33 Factory / 0 outside / 74 Factory records**.
- **Notes:** fresh paired byte-identical dense Scene-ON initializer→dummy
  receipts retain every framebuffer hash and player RAM/OAM/affine state:
  Shedinja **1840..1923 / 84 / 40,911 B /
  `c2a45100d6439267f90292268772216844e2a2bb642c93a68dffe8570be85df4`**;
  Ralts **1837..1880 / 44 / 21,548 B /
  `a9b1f9c6c8d3ef0ee8dab0c39af346404c96e9781ebc7446152530023c42a1b9`**;
  Abra **1836..1919 / 84 / 40,902 B /
  `3cdc7412eeedcf3a52a48d355bbc8dd7754a5e1c981227ea21434ea211e0b8d6`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 21 tests**; typecheck, smoke **7/346**, full **695 files / 6,752
  passed / 1 skipped**, build (**553 modules**), and coverage are green. No
  boundary or unsupported-branch widening and no move promotion.

## Back `BACK_ANIM_DIP_RIGHT_SIDE` triple accepted (2026-08-04)

- **State:** exact for the nineteenth bounded player-back set: **19/25 back
  sets, 57/75 selector variants, 288/376 Factory mappings**. Generated set
  census: **38 mappings / 38 Factory species / 0 outside / 68 Factory
  records**. Move coverage stays **107/276 exact, 0 partial, 0 staged, 169
  unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **132/130/131**
  `ANIM_H_DIP_TWICE` / normal / fast, guarded affine initializers, and
  `SetHorizontalDip`: duration **30/60/90**, runs **2/1/1**, amplitude **8**,
  offset **-32**, exact `Sin((data[2] * 128) / data[7], 8)` u16 rotation,
  `SetPosForRotation`, `HandleSetAffineData`, strict `data[2] > data[7]`,
  twice reset-to-zero plus trailing increment, per-run x2/y2 and matrix
  reset, terminal-only `ResetSpriteAfterAnim`, `WaitAnimEnd`→dummy, affine
  OAM lifecycle, task restoration, and no `TryFlipX`. BALTOY record **75**
  Naughty/mod-0; SUNKERN record **0** Relaxed/mod-1; METAPOD record **8**
  Bashful/mod-2; routing batch-checks all 38 source siblings.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_SHRINK_GROW_VIBRATE` (set 20): 23 mappings / 22 Factory / 1
  outside (DEOXYS) / 70 Factory records**.
- **Notes:** fresh paired byte-identical dense Scene-ON initializer→dummy
  receipts retain every framebuffer hash and player RAM/OAM/affine state:
  Baltoy **1838..1902 / 65 / 31,781 B /
  `155506b388538c586cbd03823a197ce8facbec36903b88f08d3fecf32f48ce53`**;
  Sunkern **1839..1902 / 64 / 30,932 B /
  `a2efd7c9d1574df2e8be311be3db7bfb9d93083bf44304de002ca200017d8ae3`**;
  Metapod **1839..1932 / 94 / 45,591 B /
  `913b57d6118fda7e98056ccaaa78f003a061b9f0cae587a3ebcc90eab261b5bd`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 18 tests**; typecheck, smoke, full `npm test`, build, and coverage
  are green. No boundary or unsupported-branch widening and no move
  promotion.

## Back `BACK_ANIM_CONCAVE_ARC_SMALL` triple accepted (2026-08-04)

- **State:** exact for the eighteenth bounded player-back set: **18/25 back
  sets, 54/75 selector variants, 250/376 Factory mappings**. Generated set
  census: **27 mappings / 26 Factory species / 1 outside (MEW) / 36 Factory
  records**. Move coverage stays **107/276 exact, 0 partial, 0 staged, 169
  unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **129/128/127**
  `ANIM_CONCAVE_ARC_SMALL_TWICE` / normal / slow, guarded
  initializer-first callbacks, and the source `ConcaveArc` lifecycle with
  steps **8/6/4**, x/y amplitudes **4/6**, runs **2/1/1**, signed GBA `Sin`,
  strict `data[7] > 255`, C modulo-256 restart, decrement, reflected-y plus
  offset, terminal x2/y2 cleanup, `WaitAnimEnd`→dummy, non-affine OAM, and
  task restoration. WYNAUT/Jolly record **35** is twice/mod-0; PICHU/Rash
  **10** normal/mod-1; MARILL/Gentle **28** slow/mod-2; routing batch-checks
  all 27 source siblings.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_DIP_RIGHT_SIDE` (set 19): 38 mappings / 38 Factory / 0 outside
  / 68 Factory records**.
- **Notes:** fresh paired byte-identical dense Scene-ON initializer→dummy
  receipts retain every framebuffer hash and player RAM/OAM/affine state:
  Wynaut **1838..1905 / 68 / 32,878 B /
  `b7e049dc55d79371ef383dd730fc777552969bda60017993cf133cae7a1ed4a6`**;
  Pichu **1837..1882 / 46 / 22,191 B /
  `ec53936c5fd61e982bd6427b259f423a067220ee97c151a385362c1fe84e3542`**;
  Marill **1838..1904 / 67 / 32,341 B /
  `f8e2fda9c1bd1cabad9da3eb53a2d1d90bbc1cf350cb6556bbcf99cbc09c9cea`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 18 tests**; typecheck, smoke **7/346**, full **691 files / 6,729
  passed / 1 skipped**, build (**553 modules**), and coverage are green. No
  boundary or unsupported-branch widening and no move promotion.

## Back `BACK_ANIM_CONVEX_DOUBLE_ARC` triple accepted (2026-08-03)

- **State:** exact for the seventeenth bounded player-back set: **17/25 back
  sets, 51/75 selector variants, 224/376 Factory mappings**. Generated set
  census: **27 mappings / 26 Factory species / 1 outside (JIRACHI) / 43
  Factory records**. Move coverage is unchanged at **107/276 exact, 0
  partial, 0 staged, 169 unsupported**; `ANIMATION_COVERAGE.json` is
  unchanged.
- **Did:** ported source IDs **126/125/124**
  `ANIM_CONVEX_DOUBLE_ARC_TWICE` / normal / slow, their guarded
  initializer-first callbacks, and shared `ConvexDoubleArc`. The reducer
  preserves steps **8/6/4**, x amplitude **16**, current arc `data[4]=1`,
  terminal counts **3/2/2**, strict `data[7] > 256`, low/middle/high y
  regions, signed GBA `Sin`/C division, arc-parity x sign, restart,
  x2/y2 cleanup, `WaitAnimEnd`→dummy timing, and task restoration. Source
  correction: HOPPIP/LAX (record 29) is mod-1/normal and CASTFORM_1/HASTY
  (204) is mod-0/twice; valid receipts therefore use CASTFORM_1 twice,
  ZUBAT/SASSY (25) normal, and SWABLU/LONELY (93) slow.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_CONCAVE_ARC_SMALL` (set 18): 27 mappings / 26 Factory / 1
  outside (MEW) / 36 Factory records**.
- **Notes:** paired byte-identical dense Scene-ON initializer→dummy receipts
  retain every framebuffer hash plus player RAM/OAM/affine state: Castform
  twice **1840..1943 / 104 / 50,134 B /
  `435fe846a4b8243e09ca4e77e5d2f6478cab46f67cb75429118c6df8ad68fad6`**;
  Zubat normal **1837..1926 / 90 / 42,919 B /
  `75cf303c0cf744231e21f13f48b863ee021c3f70777c5f24606578958cb65fd1`**;
  Swablu slow **1838..1971 / 134 / 64,218 B /
  `f1ef314515109075460552612f482b5f0335715db3709a8f45c4cfcb761cd8f6`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 18 tests**; heap-sized typecheck is green. No boundary or
  unsupported-branch widening and no move promotion.

## Back `BACK_ANIM_CONCAVE_ARC_LARGE` triple accepted (2026-08-03)

- **State:** exact for the sixteenth bounded player-back set: **16/25 back
  sets, 48/75 selector variants, 198/376 Factory mappings**. Generated set
  census: **18 mappings / 18 Factory species / 0 outside / 33 Factory
  records**. Move coverage is unchanged at **107/276 exact, 0 partial, 0
  staged, 169 unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported source IDs **123/122/121**
  `ANIM_CONCAVE_ARC_LARGE_TWICE` / normal / slow, their guarded
  initializer-first `Anim_ConcaveArcLarge_Twice` / normal / slow callbacks,
  and shared `ConcaveArc`. The reducer preserves steps **8/6/4**, 12/12
  x/y amplitudes, runs **2/1/1**, signed GBA `Sin`, C modulo-256 restart,
  y reflection plus 12 offset, strict `data[7] > 255`, repeat decrement,
  terminal x2/y2 cleanup (with source-faithful terminal `data[6] == 1`),
  `WaitAnimEnd`→dummy timing, visible non-affine OAM, and task
  zero/preserve/restore. Legal representatives are MAGIKARP index **6**
  Hardy/mod-0, AZURILL index **1** Rash/mod-1, and TREECKO index **94**
  Lonely/mod-2; all eighteen siblings route through the selector triple.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_CONVEX_DOUBLE_ARC` (set 17): 27 mappings / 26 Factory / 1
  outside / 43 Factory records**.
- **Notes:** paired byte-identical dense Scene-ON initializer→dummy receipts
  retain every framebuffer hash plus player RAM/OAM/affine state: Magikarp
  twice **1840..1907 / 68 / 33,049 B /
  `8680c46aef9d76a7c4c231d42d7b2b56656f1108b21976a03beccbf919b1c581`**;
  Azurill normal **1839..1884 / 46 / 22,308 B /
  `8daceedff0517e495dc51daf6a1e2a6b6fa5f2564bcea4922ce88bf3bf13be35`**;
  Treecko slow **1839..1905 / 67 / 32,513 B /
  `6d1868ffe99209bbf097f56a9a1c37b38aa6e27e71e3f6f10df1ed7893b635b7`**.
  Focused source/census/routing/reducer/evidence plus both ratchets: **4
  files / 18 tests**; typecheck, smoke **7/346**, full `npm test` **687
  files / 6,711 passed / 1 skipped**, build (**553 modules**), and coverage
  are green. No boundary/unsupported-branch widening or move promotion.
  Main-program finding: Emerald's internal IDs for Azurill/Treecko are
  **350/277**, not their National Dex IDs; this affects probe staging only.

## Back `BACK_ANIM_TRIANGLE_DOWN` triple accepted (2026-08-03)

- **State:** exact for the fifteenth bounded player-back set: **15/25 back
  sets, 45/75 selector variants, 180/376 Factory mappings**. Generated census
  is **26 mappings / 26 Factory species / 0 outside / 45 Factory records**;
  move coverage is unchanged at **107/276 exact, 0 partial, 0 staged, 169
  unsupported** and `ANIMATION_COVERAGE.json` remains SHA-256
  `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
- **Did:** ported IDs **106/105/104** `ANIM_TRIANGLE_DOWN_TWICE` / normal /
  slow, `Anim_TriangleDown_Fast` / normal / slow, and the complete signed
  `{1,1,12}`, `{-2,0,12}`, `{1,-1,12}`, `{0,0,0}` reducer. It preserves
  source s16/C division, terminal/repeat (`data[6]`), active vs terminal
  `TryFlipX` timing under `sDontFlip`, visible non-affine OAM, and task
  zero/preserve/restore. Legal representatives are SNORUNT index **76**
  Brave/mod-0, TYROGUE index **15** Docile/mod-1, PIDGEY index **33**
  Lonely/mod-2; all 26 siblings route through every nature selector.
- **Next:** source-ranked unsupported player-back set
  **`BACK_ANIM_CONCAVE_ARC_LARGE` (set 16): 18 mappings / 18 Factory / 0
  outside / 33 Factory records**.
- **Notes:** paired dense Scene-ON initializer→dummy receipts (framebuffers +
  player RAM/OAM/affine state): Snorunt **1839..1878 / 40 / 19,048 B /
  `b25d3fc6025f394cd908152bb7ea5e7533148ef7b765c74fe11179518b767361`**;
  Tyrogue **1839..1859 / 21 / 10,324 B /
  `2913a35d25f8cb9006290d5aeaa48911b98dedf8ae7ce1798a3cec69857e057c`**;
  Pidgey **1838..1876 / 39 / 18,597 B /
  `0d05595383b582de9272e7032c98cd8f35fd547b8aa5f351a1711dd40ecd53b1`**.
  Focused source/census/routing/reducer/evidence + both ratchets: **4 files /
  18 tests**; typecheck, smoke **7/346**, full `npm test` **685 files /
  6,702 passed / 1 skipped**, build **553 modules**, and coverage green. No
  unsupported-branch/boundary widening and no main-program finding.

## Back `BACK_ANIM_V_SHAKE_LOW` triple accepted (2026-08-03)

**State:** exact for the fourteenth bounded player-back set: **14/25 back
sets, 42/75 selector variants, 154/376 Factory mappings**. The generated set
is exactly **15 mappings / 15 Factory / 0 outside** — POLIWRATH, GEODUDE,
RHYHORN, RHYDON, PINSIR, TAUROS, DONPHAN, LARVITAR, TYRANITAR, NOSEPASS,
MAKUHITA, HARIYAMA, NUMEL, TROPIUS, and AGGRON. Move coverage remains
**107/276 exact, 0 partial, 0 staged, 169 unsupported**; the generated
`ANIMATION_COVERAGE.json` is unchanged.

**Did:** ported the source-selected `Anim_VerticalShakeLowTwice_Fast` / normal
/ slow initializers (IDs **99/92/98**) and shared `VerticalShakeLowTwice`:
56/9, 40/6, and 24/6 step/amplitude pairs; the complete source
`sVerticalShakeData` pulse/gap/pulse/terminal rows `{6,30}`, `{-2,15}`,
`{6,30}`, `{-1,0}`; u8-derived signed GBA sine phase; C integer damping;
boundary no-increment behavior; terminal `WaitAnimEnd` then dummy/task
restoration; non-affine OAM timing; and the task's back-side `sDontFlip`
contract (no source `TryFlipX` calls). The selector remains species plus
party nature only. Factory GEODUDE index **70** Brave/mod-0, MAKUHITA index
**22** Docile/mod-1, and HARIYAMA_2 index **486** Quiet/mod-2 cover every
variant, while the routing test batch-checks all fifteen siblings.

**Evidence:** three fresh paired byte-identical Scene-ON dense receipts retain
every framebuffer hash plus player sprite RAM/OAM/affine state from selected
initializer through `SpriteCallbackDummy`: Geodude fast **1839..1919 / 81
frames, 37,607 B, `c23772a75a41eeb0c9981675bd0223f876cfd091fdf2972f8a7e42189bb82ff1`**;
Makuhita normal **1840..1920 / 81, 37,578 B,
`9575423aff3eefc9058624a03ead8f61c7bc01d87ad67bad9d4efd134c666976`**;
Hariyama slow **1840..1920 / 81, 37,582 B,
`bf349b8ecfcbf42f1f77a363c86bbc504dbd1fc55dbe12e69ff511e6285fac22`**.

**Verification / next:** focused source/census/routing/reducer/evidence plus
both animation/executable ratchets **4 files / 18 tests**, heap-sized typecheck,
smoke **7 files / 346 tests**, full `npm test` **678 files / 6,652 passed /
1 skipped**, heap-sized `npm run build` (**553 modules transformed**), and
`npm run animation:coverage` are green. Next source-ranked unsupported
player-back set is `BACK_ANIM_TRIANGLE_DOWN` (set 15). No move status,
gameplay, RNG, damage, turn, facility, or live dispatcher state changed.

## Back `BACK_ANIM_GROW_STUTTER` triple accepted (2026-08-03)

**State:** exact for the thirteenth bounded player-back set: **13/25 back
sets, 39/75 selector variants, 139/376 Factory mappings**. The generated set
is exactly **5 mappings / 3 Factory / 2 outside** — ALAKAZAM, MEWTWO, QWILFISH,
EXPLOUD, and RAYQUAZA. Move coverage remains **107/276 exact, 0 partial,
0 staged, 169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged. The
next source-ranked unsupported player-back set is
`BACK_ANIM_V_SHAKE_LOW` (set 14): 15 mappings / 15 Factory / 0 outside.

**Did:** ported source-relative `Anim_GrowStutter_Twice`/normal/slow (IDs
**119/120/101**) and shared `GrowStutter`: duration/amplitude/run triples
20/70/2, 30/60/1, and 40/40/1; initializer-first affine startup; signed GBA
Sin/C integer division; middle-window `data[7] += 51` phase; positive
back-side x/y scale formulas under `sDontFlip`; strict `data[5] > data[6]`
cycle boundary; twice-cycle reset; terminal identity + `ResetSpriteAfterAnim`;
initializer/`WaitAnimEnd`/dummy callback timing; and task zero/preserve/restore.
The complete generated census and all five species route through the party
nature selector; Factory records 316 QWILFISH/Adamant, 493 EXPLOUD/Quirky,
and 404 ALAKAZAM/Modest provide the three legal variant representatives.

**Evidence:** three fresh paired byte-identical Scene-ON dense receipts retain
every framebuffer hash plus sprite RAM/OAM/affine state from selected callback
through `SpriteCallbackDummy`: Qwilfish twice **1840..1885 / 46 frames,
21,589 B, `dd3fd7f20cddcd5f4d749a210d3f8730e8ccc18b3f7c595e74f8cda085f49bd1`**;
Exploud normal **1839..1872 / 34, 15,925 B,
`aeff45bc8e553c8d7fd21a3e0f85e5d6c82cd34f3b57c8e4d24f1ebcd2637fe3`**;
Alakazam slow **1840..1883 / 44, 20,657 B,
`c557496c8b3c0c9372468d307cd8ecea1073f9dab962061b82838916d1a81eb2`**.

**Verification / next:** focused source/census/routing/reducer/evidence
checks **4 files / 20 tests**, both animation/executable ratchets **9 tests**,
heap-sized `npx tsc --noEmit`, smoke **7 files / 346 tests**, full `npm test`
**676 files / 6,643 passed / 1 skipped**, heap-sized `npm run build` (**553
modules transformed**), and `npm run animation:coverage` are green. No move
status, gameplay, RNG, damage, turn, facility, or live dispatcher state
changed.

## MOVE_MIRROR_COAT promoted exact; sparkle-3-special-screen track complete (2026-07-29)

**Verdict:** `MOVE_MIRROR_COAT` is exact. Source, generated inventory, and
controller audit prove set **151 `FRONTIER_MON_CORSOLA`** is its lowest legal
Level-50 carrier and one animation body is reachable: a valid opposing special
hit reaches `Move_MIRROR_COAT`; the failure route selects no animation body.
Complete legal Corsola/Exeggcute Scene-ON parties stage real Confusion damage
before Mirror Coat's -5-priority counter in both orientations.

**Evidence:** the complete first-active wall frame through first-inactive
cleanup passes twice fresh per orientation. Player-back **349–423 (75/75)**
records special damage/result **26→52**, evidence/raw
`1ea5591d85dc0e4926b8e763584f405ed4ec72d43c676ad06fc551cedb44aa92` /
`c8a70485e2d13ae522c31760ee7e6ecb24bb464eb567427855448389ab1128a7`;
opponent-front **355–429 (75/75)** records **31→62**,
`3328d443c81b35a5305590705e7448d009aa0111a326b318c08b420a29939a7d` /
`0fcba1ad43f479f613f84243bca184e10f4545e7e6566558327c081444b73b5b`.

**Model / sibling:** the reducer and seam reuse only source-identical
`AnimDefensiveWall` and six `SpecialScreenSparkle` lifecycles while preserving
Mirror Coat's red wall/tag, wall-before-audio delay-10/immediate attacker pan,
no Light Screen sound task, palettes/registers, BG/OBJ ordering, legal carrier
art/geometry, and cleanup. `MOVE_LIGHT_SCREEN` independently reruns exact twice
fresh at **115/115 player-back + 119/119 opponent-front**, with unchanged
evidence/raw hashes.

**Ownership / next:** no counter/damage semantics, accuracy, RNG, controller,
turn/facility state, boundary list, unsupported barrier, or canonical allowlist
changed. Coverage is **103 exact / 0 partial / 0 staged / 173 unsupported**.
Next incomplete ranked track: `red-heart-sweet-kiss`
(`MOVE_ATTRACT` independently unsupported).

## MOVE_COTTON_SPORE promoted exact; spore-particles track complete (2026-07-29)

**Verdict:** `MOVE_COTTON_SPORE` is exact. Source and legal inventory prove
set **49 `FRONTIER_MON_MAREEP`** is its lowest Level-50 carrier (Relaxed,
HP+SpAttack, Cheri Berry). Complete Scene-ON Mareep/Onix parties pass the
full source body through first inactive cleanup twice fresh per orientation:
player-back **286–489 (204/204)** evidence/raw
`f3505c583dbfd81459fa5a6ae013a0e84d8583f0cf3e0d0ec8cb1817c120e0c3` /
`b46bd803dd59cf953c0fa0d4a979d15ab6c9060a6cc7b14571dbcb69cea38007`;
opponent-front **285–488 (204/204)**
`a719bb8dff37cdf3f82a3909b6129e694b1982fa0800152dbbd7c3ae105e5983` /
`629fb753f6e9522a6144b90c630b4d6306e3fcdd1b2558fe9af8a55617ab569c`.

**Model/evidence:** the pure reducer, typed seam, and production compositor
reuse `ANIM_TAG_SPORE`/`AnimSporeParticle` while preserving Cotton Spore's
splitbgprio, opaque particle cell/OAM, 18/10 target-panned loop audio, lack of
alpha/blendoff/SporeDoubleBattle, target-relative geometry, hardware latch,
monbg, and cleanup. `MOVE_SPORE` independently reruns **207/207** twice fresh
in both orientations and remains exact.

**Ownership / next:** no accuracy or Speed result, damage, RNG, controller,
turn/facility state, boundary list, unsupported barrier, or canonical
allowlist changed. Coverage is **102 exact / 0 partial / 0 staged / 174
unsupported**. Next incomplete ranked component track:
`sparkle-3-special-screen` (`MOVE_MIRROR_COAT` independently unsupported).

## MOVE_BRICK_BREAK promoted exact; both controller-selected bodies accepted (2026-07-29)

**Verdict:** `MOVE_BRICK_BREAK` is exact. Source/controller audit proves
`removelightscreenreflect` selects distinct normal and shattered-wall
presentation bodies. Complete legal Lombre/Onix Scene-ON parties prove both
twice fresh per orientation. `BrickBreakNormal` passes **151/151** semantic
and production frames: player-back **234–384** evidence/raw
`ad3d3e90b70fde1595dda316a773e887f17123df5ad5815086159ddb52398b5d` /
`67687eb221c4efb306fdca646b78fd181469aa22ef98e48d7006b4a9ec2c27cb`;
opponent-front **220–370**
`b1ac1081da160add8d9e92f878e3051199a909987735dc5bf06cd921bb1f8fab` /
`4a03768b6549b364296e3639833e7c5d0cd6dedcec567ee62f20e32fd94c2645`.

**Wall body / model:** `BrickBreakShatteredWall` passes **192/192** twice per
orientation: player-back **288–479** evidence/raw
`e484e602be861db10e4042c2a6de75e5f6e261e533515d48d8597637db5c4697` /
`e1b36f8036f30386af0c7cdaac9645f73bb9eb526802c3179e745871cf637363`;
opponent-front **289–480**
`f0314f159cb9b141c107cbe078382ebb4ff7379c4ce2c835aa9b921c65bbe27a` /
`8402d60c9605e852c0f099dbc617c80dc21d005097ed1985395b647564ae23bc`.
The reducer/seam/compositor preserve two lunges, three hitsplats, fist,
24+10+3 WindUpLunge, target-panned audio, BG blend, monbg/alpha, wall, four
40-step TORN_METAL shards, hardware transfer/order, and cleanup.

**Boundary:** `MOVE_CRUSH_CLAW` stays independently unsupported; no gameplay,
screen outcome, RNG, controller, facility state, boundary list, unsupported
barrier, or canonical allowlist changed. Coverage is **101 exact / 0 partial /
0 staged / 175 unsupported**.

## MOVE_WHIRLPOOL promoted exact; both source bodies accepted (2026-07-29)

**Verdict:** `MOVE_WHIRLPOOL` is exact through one pure source-relative
reducer, typed Scene-ON seam, and production compositor. The complete main
body passes **133/133** semantic and framebuffer frames twice in both
orientations: player-back evidence/raw
`2942fa0bf1a07da485bcf391ca4ecea06a41361d648adc27a1e48a3f32018125` /
`d3a4cebcb258d334414d99096b7ded4accc90be1af37da4abf01610866ae96c8`;
opponent-front
`7e57488e1a265960fec441a02b5133f0b4a6e38ddde46cd42e21b5a29b0aaba3` /
`8b42073d713d49286935abd3079c2266464f6f66c492a039903fb70740a26ffa`.

**Residual / model:** the independently staged `Status_Whirlpool` body passes
**108/108** twice per orientation: player-back
`e5d210e7908b269ba0722959c4035d4bc39c04378a323cf74698375baa615b84` /
`8a809496f28e7cb8e5eb9a37e26f721a9e9b3c14ef67bbf798825d4b527a9e71`;
opponent-front
`d6b1d9e43817259be6ad63c9b36e5f4d11112a868785925253716eb97fead93a` /
`481017b8c09ddf3bbe585e6e2845a02384e27e1b7ed38169834e3eb2ea82463c`.
The model preserves the main body's 18 vortex-orb lifecycles and 50-tick
ShakeMon, the residual body's 12 lifecycles and 30-tick ShakeMon, their
distinct affine/OAM creation latches, palettes/registers/audio, stable sprite
ordering, Wailmer/Onix art, field chrome, and cleanup.

**Ownership:** no trapping outcome, damage, RNG, turn/controller, round,
facility, boundary list, unsupported barrier, or canonical allowlist changed.
Coverage is **100 exact / 0 partial / 0 staged / 176 unsupported**.

## MOVE_LOW_KICK promoted exact; target-rotation track complete (2026-07-29)

**Verdict:** `MOVE_LOW_KICK` is exact. Source and inventory prove set **178
`FRONTIER_MON_MACHOKE_1`** is the lowest legal Level-50 carrier (before set
298 Sudowoodo_2). Complete legal Scene-ON Machoke/Onix parties pass the full
body through first inactive cleanup twice fresh per orientation: player-back
**214–246 (33/33)** evidence/raw
`f3b4b291ee90208d9f9dcf7e2ea91a355c6da0e270289e6a083cdae126782a74` /
`40639ddccc47ad2f867891ce5daa4d6a5769ff22b85352095bac14ba5cc9d9e5`;
opponent-front **214–246 (33/33)**
`7264ca8cdc9335c80e375354c674322eb857f1c2a7d0ea253fe2e73cefd14e0a` /
`4d657cf51c4c28805b20ed868890418aaf2ab03c7074ccce9757ea63bef75e20`.

**Model/evidence:** the pure source-relative reducer, narrow typed seam,
reproducible Machoke art, and production compositor port both slide callbacks,
target-relative SlidingKick/hitsplat, RotateMonSpriteToSide's ObjAffineSet
matrix plus target position/OAM transfer, Vital Throw target panning, field
chrome/text, sprite/task display latches, tag cleanup, and first inactive
cleanup. `lowKickPortable.ts` proves **33/33** reducer/component/seam/cleanup
and **33/33** shared-framebuffer equality twice per orientation.

**Sibling / next:** `MOVE_ROLLING_KICK` remains independently exact under its
own 55-frame portable verifier. Next independent component track:
`water-orb-hydro-pump-whirlpool`, with `MOVE_WHIRLPOOL` requiring its own dense
both-orientation proof despite Hydro Pump's exact shared components. Coverage
is **99 exact / 0 partial / 0 staged / 177 unsupported**.

**Ownership:** no damage, Low Kick weight calculation, RNG, turn order,
controller, round advancement, facility state, animation-boundary list,
unsupported barrier, or canonical-recording allowlist changed.

## MOVE_ROLLING_KICK promoted exact; SlidingKick representative complete (2026-07-29)

**Verdict:** `MOVE_ROLLING_KICK` is exact. Source and generated inventory prove
challenge-1 set **233 `FRONTIER_MON_HITMONLEE_1`** is the sole/lowest legal
Level-50 carrier. Complete legal Scene-ON parties pass the full 55-frame body
through first inactive cleanup twice fresh in both orientations: player-back
**81–135 (55/55)** evidence/raw
`3f35463979c0971b6432ed8695caa1130e21890d07ea4edb80b6685271932f92` /
`76c1741106018ee425f40505c56af234d7d033562dc8bd3c84386e465d9d7ef3`;
opponent-front **85–139 (55/55)**
`4fb8c542ab55e346e4f22129cfa10f028d1a43ff8be0ee6e1e1d8b4160849690` /
`237e0cd3062b05c1ffa91a1ecc2e03a60ba1f195012ad079f0980933ea12d5a1`.

**Model/evidence:** the pure reducer and production compositor port attacker
elliptical motion, slide callbacks, attacker-relative foot/hitsplat, ShakeMon,
alpha, audio, OAM latches, and cleanup. `MOVE_LOW_KICK` then received its own
independent target-relative proof. No gameplay, boundary, barrier, canonical
allowlist, or facility state changed.

## MOVE_WHIRLPOOL status body proven; move remains partial (2026-07-29)

**Verdict:** `Status_Whirlpool` is independently source-pointer-pinned and
fully evidenced, but `MOVE_WHIRLPOOL` remains **partial** because this work
adds no reducer, seam, compositor, or production framebuffer claim. Legal
three-Pokémon Wailmer/Onix Scene-ON parties land Whirlpool normally, then use
real second-turn controller input to reach residual status play: player-back
**663–770 (108/108)**, evidence/raw
`e5d210e7908b269ba0722959c4035d4bc39c04378a323cf74698375baa615b84` /
`8a809496f28e7cb8e5eb9a37e26f721a9e9b3c14ef67bbf798825d4b527a9e71`;
opponent-front **653–760 (108/108)**,
`d6b1d9e43817259be6ad63c9b36e5f4d11112a868785925253716eb97fead93a` /
`481017b8c09ddf3bbe585e6e2845a02384e27e1b7ed38169834e3eb2ea82463c`.

**Evidence:** `statusWhirlpoolProbe.py` identifies `Status_Whirlpool` by its
pointer and source bounds, confirms real prior Whirlpool + trapped status,
then captures through first inactive cleanup. Its portable verifier proves
two `WhirlpoolEffect` calls / 12 vortex lifecycles, source parameters and
affine/OAM latches, 30-tick ShakeMon, target blend, WATER_ORB/monbg/split
priority/12:8 alpha, target-panned audio, stopsound cleanup, registers, and
stable gameplay twice fresh per orientation. Coverage remains **99 exact / 1
partial / 0 staged / 176 unsupported**.

## MOVE_WHIRLPOOL promoted partial; main body evidence complete (2026-07-29)

**Verdict:** `MOVE_WHIRLPOOL` is partial. Legal Scene-ON Wailmer/Onix probes
cover the entire main `Move_WHIRLPOOL` body through first inactive cleanup
twice fresh in both orientations: player-back **78–210 (133/133)**
evidence/raw `2942fa0bf1a07da485bcf391ca4ecea06a41361d648adc27a1e48a3f32018125` /
`d3a4cebcb258d334414d99096b7ded4accc90be1af37da4abf01610866ae96c8`;
opponent-front **82–214 (133/133)**
`7e57488e1a265960fec441a02b5133f0b4a6e38ddde46cd42e21b5a29b0aaba3` /
`8b42073d713d49286935abd3079c2266464f6f66c492a039903fb70740a26ffa`.

**Evidence / boundary:** `whirlpoolPortableEvidence.ts` pins all 18 affine
vortex lifecycles, OAM/matrix and palette/register latches, target blend and
ShakeMon, WATER_ORB tags, target-pan audio, immutable gameplay, and cleanup.
No reducer, seam, compositor, or production renderer was added. The later
`Status_Whirlpool` has separate complete evidence above; neither body has
production presentation acceptance. Coverage is **99 exact / 1 partial / 0
staged / 176 unsupported**.

## MOVE_MEGA_PUNCH promoted exact; MegaPunchKick track established (2026-07-29)

**Verdict:** `MOVE_MEGA_PUNCH` is exact. Generated inventory and source audit
prove challenge-1 set **254 `FRONTIER_MON_CACTURNE_1`** is the sole/lowest
legal Level-50 carrier. Complete legal Scene-ON parties pass the entire
160-frame source body through first inactive cleanup twice fresh in both
orientations: player-back **76–235**, receipt/raw
`9a324ee534928083d1f41dea0c2366ef2b47392c7869fb7aee81a7bf5641cd2f` /
`7bab206057ef1ae1e99eb24bb9879a8052b73cfae92ccf90a51202cc851c5a36`;
opponent-front **80–239**,
`d8f787f50acb0d43013b904de76a0f22543a348e56cf36a403b715eb233b701f` /
`c05a36ec1e051de5783282bda799cbde791ee4613b4405ab3874094b33f80a55`.

**Model/evidence:** the source-relative reducer, typed seam, and production
compositor port variant-0 `gMegaPunchKickSpriteTemplate`, HANDS_AND_FEET,
IMPACT/hitsplat, target monbg/alpha, palette blends, side-specific impact
background, ShakeMon2, audio, Cacturne/Onix/chrome, display latches, and
cleanup. `megaPunchPortable.ts` proves **160/160** reducer/seam/cleanup and
production framebuffer equality twice fresh per orientation.

**Sibling:** `MOVE_MEGA_KICK` remains unsupported: its distinct variant-1 art
selection and `SE_M_MEGA_KICK2` need independent complete acceptance.

## MOVE_HYPNOSIS promoted exact; GOLD_RING repair complete (2026-07-29)

**Verdict:** `MOVE_HYPNOSIS` is exact. The Level-50 eligibility graph rejects
source set 38 Hoothoot; challenge-1 set **265 POLITOED_1** is the lowest legal
carrier. Complete legal Scene-ON parties pass the entire body through first
inactive cleanup twice fresh in both orientations: player-back **74–242
(169/169)**, evidence/raw
`6b164293b9a3ad086504808422b0f95ab07ccd84595eb87b3ca908e34189b0c4` /
`7c06a1b4825562841f65768ae6b9a97374dba4a727a0ecd59f28220deddf10a1`;
opponent-front **78–245 (168/168)**,
`8baa59de6a99008bebd74e72b4089c6146f5f98fefd03ca7805a84412b4f100b` /
`69b6f767aef05462568e2229c129b620b2ebfa6da399d072507eaa438ee453ec`.

**Repair/evidence:** the typed Scene-ON seam carries resolved POLITOED/ONIX
geometry and immutable field state. The source-relative reducer and production
compositor port the queued psychic palette rotation/BLDY, target
RGB(31,18,31) 0↔12 tint, all six 27-tick GoldRing paths with source OAM order
and display latches, Politoed/Onix idle and enemy-shadow latches, three
side-panned Supersonic triggers, windows/text, and first inactive cleanup.
`hypnosisPortable.ts` proves every dense source/component, seam,
software/hardware OAM/matrix, palette/tag/register/audio/unchanged-state,
raw-RGB, and production shared-framebuffer frame twice fresh.

**Sibling / next:** `MOVE_PSYBEAM` remains unsupported/audit-only. Its lowest
carrier is set **145 SPINDA**; eleven shorter rings, SwayMon, two-leg tint, and
`LoopSEAdjustPanning 3/4/0/15` need independent complete dense both-orientation
acceptance. Coverage is **96 exact / 0 partial / 0 staged / 180 unsupported**.
No boundary list, barrier, canonical allowlist, sleep, damage, RNG, controller,
turn, or facility state changed.

## MOVE_HYDRO_PUMP promoted exact; WATER_ORB repair complete (2026-07-29)

**Verdict:** `MOVE_HYDRO_PUMP` is exact. Complete legal three-mon Scene-ON
parties pass the full 141-frame move-owned body through first inactive cleanup
twice fresh in both set-303 MASQUERAIN orientations: player-back **213–353
(141/141)**, evidence/raw
`9c8210033328ee98ceae81e54e2d4ec36ecbc4a763deb925171f23f6ef117af7` /
`360d0d7292aa8fa6125f3de46d5170d2d1a3ca62181ada3cdf11ff1cff779706`;
opponent-front **232–372 (141/141)**,
`3330496d0d3dd1feec78443a274380e43b593250459b36ed0b6976ae2e105880` /
`ff315fb58f55bcaa8c5e728faa33635d97e41d624747d867d4f1c9487fc06cee`.

**Repair/evidence:** the source-relative reducer and typed seam cover all
**44** sine WATER_ORBs, **12** WATER_IMPACT splats, tasks, tags, registers,
audio, waits, and cleanup. The repair ports the clamped audio display latch
separately from sound-task lifetime, prior-frame battler offsets and the
opponent enemy-shadow latch, plus `sprite.c`'s stable priority/Y ordering
across reused OAM slots; splat relative priority 4 resolves in front of the
beam's relative priority 3. `hydroPumpPortable.ts` proves every dense
source/component, seam, software/hardware OAM/matrix, palette/tag/register/
audio/unchanged-state/raw-RGB/production-framebuffer frame twice fresh.

**Sibling / next:** `MOVE_WHIRLPOOL` remains unsupported/audit-only. Its
lowest carrier is set **170** `FRONTIER_MON_WAILMER_1`; its distinct **18**
affine vortex orbs, target blend/shake/audio, trap outcome, later repetition/
status-animation variants, and cleanup need independent complete dense
both-orientation acceptance. Coverage is **95 exact / 0 partial / 0 staged /
181 unsupported**. No animation boundary, unsupported barrier, canonical
recording allowlist, or gameplay ownership changed.

## MOVE_SPORE promoted exact; ANIM_TAG_SPORE track bounded (2026-07-29)

**Verdict:** `MOVE_SPORE` is exact. The lowest suitable legal Level-50
carrier is challenge-2 set **282** `FRONTIER_MON_PARASECT_2` (species **47**,
Spore **147**, Calm, HP+Defense+SpDefense, Leftovers). Complete legal
three-mon Scene-ON parties pass the whole move-owned body through first
inactive cleanup twice fresh in both orientations: player-back frames
**366–572 (207/207)**, evidence/raw
`5b275a53b8339e818fa56c158a04df729d1316fee0005ab11cc1ad1b9c446d40` /
`9730e4ea34ffdaab25796ea069be7270eb36eb9ea05d13cb32c834cb8ea9d0a7`;
opponent-front **370–576 (207/207)**,
`7d723ded7813648cb6a29b9a5aaa651b1d677d9698f35f0aff9005f0410e687b` /
`59a82fde62ce4c89b2a73f0053186df940bd51b39340339ef8fff92282f64e51`.

**Model/evidence:** extraction pins Parasect front/back and both Spore cells.
The relative reducer and typed seam port tag/mon-BG/alpha lifetimes, all nine
staggered `gSporeParticleSpriteTemplate`/`AnimSporeParticle_Step` lifecycles,
OBJ priorities and blending, looped audio, waits, blendoff, and cleanup.
`sporePortable.ts` proves every dense source/component, seam, OAM/matrix,
palette/tag/register/audio/unchanged-state/raw-RGB/production-framebuffer
frame twice fresh; presentation owns no sleep, damage, RNG, turn, controller,
or facility state.

**Sibling / next:** `MOVE_COTTON_SPORE` remains unsupported. Its independent
source audit pins shared art/callback but distinct `splitbgprio`, unblended
particles, audio, and no-alpha/no-`SporeDoubleBattle` body; give it complete
dense both-orientation acceptance before promotion. Coverage is **94 exact /
0 partial / 0 staged / 182 unsupported**; no boundary, barrier, or canonical
recording ratchet moved.

## MOVE_LIGHT_SCREEN promoted exact; SPARKLE_3 track bounded (2026-07-29)

**Verdict:** `MOVE_LIGHT_SCREEN` is exact. The lowest suitable legal
Level-50 carrier is challenge-0 set **112** `FRONTIER_MON_EXEGGCUTE`
(species **102**, Light Screen **113**, Naughty, SpAttack+HP, Persim Berry).
Complete legal three-mon Scene-ON parties pass the full move-owned body
through first inactive cleanup twice fresh in both orientations: player-back
frames **270–384 (115/115)**, evidence/raw
`7c1c3b39e53c00ee0174232a0c05a02ac7f14b6d2aa7478bc2ae372c5d2500a2` /
`b135e9fbf2c70ea860f0ee126959bbb0eaf0c4603566067dd5405c9698a74837`;
opponent-front **176–294 (119/119)**,
`51ffe743621c2745f8a59cd6786bb5d0fa9b12b844ee452d2e7ca729587e20db` /
`654a49bafe3470e81c34dfa1d127d67a78d59eb6d0b6af3c983d36008a8dbf6b`.

**Model/evidence:** reproducible extraction pins Exeggcute front/back,
GREEN_LIGHT_WALL, and SPARKLE_3. The pure relative reducer and typed seam port
`gLightScreenWallSpriteTemplate`/`AnimDefensiveWall`, all six
`gSpecialScreenSparkleSpriteTemplate`/`AnimWallSparkle` lifecycles from
`SpecialScreenSparkle`, alpha, rotating palette, delayed audio, opponent BG
transfer, OAM/VBlank latches, blendoff tail, and first inactive age 74.
`lightScreenEvidence.ts` proves every dense source/component, seam,
software+hardware OAM/matrix/palette/register/audio/immutable-state/raw-RGB/
production-framebuffer frame twice fresh; presentation owns no side
condition, damage, RNG, turn, controller, or facility state.

**Sibling:** `MOVE_MIRROR_COAT` remains unsupported. Its source batch-check
pins lowest carrier set **151** `FRONTIER_MON_CORSOLA` and the independent
RED_LIGHT_WALL/`gMirrorCoatWallSpriteTemplate`, wall-before-audio delay-10
then immediate-playse timing, real prior-special-damage counter staging/result,
and separate palette/audio/register/cleanup acceptance still required twice
fresh in both orientations. Coverage is **93 exact / 0 partial / 0 staged /
183 unsupported**; no boundary or barrier ratchet moved.

## MOVE_BLOCK promoted exact; X_SIGN track bounded (2026-07-29)

**Verdict:** `MOVE_BLOCK` is exact. The lowest suitable legal Level-50
carrier is challenge-0 set **193** `FRONTIER_MON_SUDOWOODO_1` (species
**185**, Block **335**, Hardy, SpDefense+HP, Hard Stone). Complete legal
three-mon Scene-ON parties cover the whole body through first inactive cleanup
twice fresh in both orientations: player-back **373–513 (141/141)**,
evidence/raw
`417c0585860b8396efa41bd2c3e5b2f3b1b90ac55dff7386928a3f6d727707f4` /
`3837aa0b60c7a1f8decf1cae22947e27cd16935f39b562dc430e572ef8432b6c`;
opponent-front **290–435 (146/146)**,
`e7b64ee034e9716237bf376395c329b2d859b66ec469761b4f80311fe982391c` /
`2e66e6ac4aaeaac809890797273f68b37d8f62f107446b9067721695d3eac276`.

**Model/evidence:** reproducible extraction pins Sudowoodo front/back and
X_SIGN with its source-shared HollowOrb palette. The typed reducer ports the
single `gBlockXSpriteTemplate` fall, both sine bounces, side-relative OAM
ordering, all three audio callbacks, seven flickers, wait, destruction, tag
cleanup, and first inactive frame. `blockEvidence.ts` passes every dense
source/component/typed-seam/software+hardware OAM/matrix/palette/register/
audio/state/raw-RGB/production-framebuffer frame in both orientations twice
fresh. Presentation exposes no trapped flag and owns no trap/gameplay effect,
damage, RNG, turn, controller, or facility state.

**Sibling:** `MOVE_ROCK_TOMB` remains unsupported. It independently adds
ROCKS load/free, four `gRockTombRockSpriteTemplate` falls,
`gRedXSpriteTemplate`, `AnimTask_ShakeMon`, platform shakes, audio/waits,
damage/stat/controller presentation and cleanup, and has no complete dense
both-orientation acceptance. Coverage is **92 exact / 0 partial / 0 staged /
184 unsupported**; no boundary or barrier ratchet moved.

## MOVE_WHIRLWIND promoted exact; WHIRLWIND_LINES repair complete (2026-07-29)

**Verdict:** `MOVE_WHIRLWIND` is exact. The lowest suitable legal
Level-50 carrier is challenge-0 set **153** `FRONTIER_MON_BUTTERFREE`
(species **12**, Whirlwind **18**, Quirky, SpAttack+HP, Pecha Berry).
Complete legal three-mon Scene-ON parties cover the body through first
inactive cleanup twice fresh in both orientations: player-back **222–304
(83 frames)**, evidence/raw
`173be41493206cf4b974d0bed0f799c9f6a13d727295421e4262f69f470fd5bc` /
`12653c28b7dd04790d0f2a8fed53b01f672d7da58d0a226a2957ca786aefb59c`;
opponent-front **316–398 (83 frames)**,
`ebf51bc3ffe9f65bc28e5e6e53ca72a92a01c1aaa51a844eb4c80fd5475d014f` /
`ec7f5084e7ba307ef23b567770f1271d48b3449140f9ef1bde357abc1c34d434`.

**Model/evidence:** reproducible extraction pins Butterfree front/back and
WHIRLWIND_LINES. The typed source-relative reducer ports all six
`gWhirlwindLineSpriteTemplate` lifecycles and flip cells,
`AnimTask_ShakeMon2`, `AnimTask_TranslateMonEllipticalRespectSide`,
`AnimTask_SlideOffScreen`, side-relative audio, waits, and cleanup. It owns
no forced switch, damage, RNG, turn, controller, or facility state. The
production compositor ports prior-callback OAM latches, side-relative
SortSprites order, and the established one-frame enemy-shadow latch.

**Acceptance / sibling:** `whirlwindEvidence.ts` passes **83/83** source,
component, typed-seam, software/hardware OAM/matrix, palette/tag, register,
audio, unchanged-state, raw-RGB, and production shared-framebuffer checks in
both orientations, twice fresh. `MOVE_DRILL_PECK` remains unsupported: it adds BowMon phases,
`AnimTask_DrillPeckHitSplats`, repeated IMPACT sprites, looped sound,
ShakeMon2, return slide, and damage/controller presentation, and lacks its
own dense both-orientation acceptance. Coverage is **91 exact / 0 partial /
0 staged / 185 unsupported**; no boundary or barrier ratchet moved.

## MOVE_AROMATHERAPY promoted exact; FLOWER/SPARKLE_2 track bounded (2026-07-29)

**Verdict:** `MOVE_AROMATHERAPY` is exact. The sole legal Level-50 carrier is
challenge-3 set **394** `FRONTIER_MON_VILEPLUME_1`. Complete legal Scene-ON
parties pass the body through first inactive cleanup twice fresh in both
orientations: player-back **75–474 (400/400)**, evidence/raw
`83f9f2d03fb0cd19a05394a29dfa0e5ecfe8d142ca1dc3711a0cbf6586db0728` /
`dc02bff98836fbeb9481c3ce01686d0f7e11b7ad15f529224b48278617deaf84`;
opponent-front **79–474 (396/396)**,
`323ccf6d2752af1f726823e7925fcb4b91db586f56493c878e1a532d1974c686` /
`43d736b2d9f70f771a24566e3958a845381b7f3b51a69411c64e3a088b8e359b`.

**Model:** the typed presentation seam ports all **7** small + **2** affine
big FLOWER particles, source OAM-Y/tie order, green blends/monbg,
`AnimTask_StatusClearedEffect` scrolling OBJ-window mask, both SPARKLE_2
stars, thin-ring expansion, audio, waits, hardware latches, tag cleanup, and
first inactive frame. Extraction now follows the source make rule that
concatenates `flower_1.png` as small-flower tile 4. Presentation owns no
status cure, gameplay RNG, damage, turn, controller, or facility outcome.

**Sibling/control:** `MOVE_PETAL_DANCE` remains unsupported despite shared
FLOWER art/particle callbacks; its repeated groups, shake, affine program,
waits, and cleanup need independent dense acceptance. Heal Bell, Refresh,
Wish, and Cosmic Power retain distinct bodies. Coverage is **90 exact / 0
partial / 0 staged / 186 unsupported**; no boundary or barrier ratchet moved.

## MOVE_SWEET_KISS promoted exact; RED_HEART track bounded (2026-07-29)

**Verdict:** `MOVE_SWEET_KISS` is exact. The lowest suitable Level-50
Factory carrier is challenge-0 set **123** `FRONTIER_MON_LUVDISC` (species
**325**, Sweet Kiss **186**, Relaxed, SpAttack+HP, Quick Claw). Complete legal
three-mon Scene-ON parties pass the whole body through first inactive cleanup
at **159/159** source/component, typed-seam, hardware, audio, raw-RGB, and
shared-framebuffer frames in both orientations, twice fresh. Player-back
frames **74–232** reproduce evidence/raw digests
`5117db12992b65aadfc65a448ea2260dfd5848be19fc3d6e2df733d90604af21` /
`61870ad0f56694de71f2d492c51fbe208216ef88b8550eca8a3a17fca8f73f11`;
opponent-front frames **78–236** reproduce
`db45d09de25efa0d267f53c0337017c98094b0d174e8b99babfaa7dabf496821` /
`76f32756df4d9bbdbfee5daf5d5ecf5b72bcdbacc3c4eab909c44cd7a8759876`.

**Model/boundary:** the source-relative reducer and typed seam port RED_HEART
and ANGEL load/free, `gAngelSpriteTemplate` path/affine/display timing, all
six parameterized `gRedHeartBurstSpriteTemplate` `AnimParticleBurst`
lifecycles, target-relative geometry, source sprite ordering, audio, waits,
and cleanup. Extraction regenerates Luvdisc front/back, RED_HEART, and ANGEL
assets byte-for-byte. The evidence pins unchanged HP/item state and zero
presentation-owned confusion; no damage, RNG, status, turn, controller,
facility, import-boundary, or unsupported-barrier behavior changed.

**Sibling/control:** `MOVE_ATTRACT` remains **unsupported** because its body
adds a projectile heart, rising hearts, HeartsBackground, SwayMon, blend
color cycling, and independent cleanup. The existing `MOVE_CHARM`
magenta-heart control remains exact at **93/93** body plus **4/4** teardown
frames in both orientations twice fresh. Coverage is **89 exact / 0 partial /
0 staged / 187 unsupported**.

## MOVE_SLAM promoted exact; SLAM_HIT track bounded (2026-07-29)

**Verdict:** `MOVE_SLAM` is exact. The lowest suitable Level-50 Factory
carrier is challenge-0 set **164** `FRONTIER_MON_LICKITUNG_1` (species
**108**, Slam **21**, Quirky, Attack+HP, Sitrus Berry). Complete legal
three-mon Scene-ON parties pass the whole move through first inactive cleanup
at **54/54** source/component, typed-seam, hardware, audio, raw-RGB, and
shared-framebuffer frames in both orientations, twice fresh. Player-back
frames **212–265** reproduce evidence/raw digests
`8f520d7599ce22335081f096258dba8a4dc61f880c9b5167f0d3d68a33e14182` /
`4e3abdaf0e4ab636fc415fb933a10cb47f9ed86fffcef880fd3d6479d1a4c8c2`;
opponent-front frames **211–264** reproduce
`66a2b9d72b6dd0eb160faf6336a395fd036745d1fc09433fca7aea3641697401` /
`66d4cdf1aed7f739b15a44eaccbb346268f5cc3b05112836b8717d31255f62fc`.

**Model/boundary:** the pure source-relative reducer and typed seam port
SLAM_HIT/IMPACT load and free, the four-cell side-flipped
`gSlamHitSpriteTemplate`, both attacker and target slide/return sequences,
animation-1 hitsplat, target `ShakeMonInPlace`, monbg/alpha, audio, OAM/display
latches, and cleanup. Source extraction regenerates Lickitung front/back and
SLAM_HIT assets byte-for-byte; the narrow compositor reuses exact IMPACT,
slide, shake, Onix, and field primitives. No damage, RNG, turn, controller,
facility, import-boundary, or unsupported-barrier behavior changed.

**Sibling/control:** `MOVE_SECRET_POWER` remains **unsupported** because the
Factory building environment selects the distinct `Move_STRENGTH` body; other
environments also dispatch to independent bodies. Shared SLAM_HIT proof does
not promote it. The existing BODY SLAM slide/impact/shake control remains
independent. Coverage is **88 exact / 0 partial / 0 staged / 188
unsupported**.

## HARDEN exact track entry archived (2026-07-27)

`MOVE_HARDEN` remains exact at **101/101 ×2** in both orientations, covering
MetallicShine, its invisible attacker OBJ-window copy, palette transformation,
BG1 sweep, display registers, and teardown. Full evidence and sibling verdicts
remain authoritative in `ANIMATION_COVERAGE.json`; this live entry moved here
only to retain roughly three current sections.

## SYNTHESIS exact track entry archived (2026-07-27)

`MOVE_SYNTHESIS` remains exact at **130/130 ×2** in both orientations,
covering its attacker palette cycle, both GrantingStars sprites, asset
boundary, and shared HealingEffect. Full evidence and sibling verdicts remain
authoritative in `ANIMATION_COVERAGE.json`; this live entry moved here only to
retain roughly three current sections.

## EARTHQUAKE exact track entry archived (2026-07-27)

`MOVE_EARTHQUAKE` remains exact at **197/197 ×2** in both orientations,
covering both literal HorizontalShake tasks, the two BG palette pulses, and
their display latches. Full evidence and sibling verdicts remain authoritative
in `ANIMATION_COVERAGE.json`; this live entry moved here only to retain roughly
three current sections.

## WATER GUN exact track entry archived (2026-07-26)

`MOVE_WATER_GUN` remains exact at **111/111 ×2** in both orientations,
covering its complete projectile/hitsplat/three-droplet body, target-BG2
alpha compositor, and small-bubbles / water-impact component audit. Its full
evidence paths and sibling verdicts remain authoritative in
`ANIMATION_COVERAGE.json`; the live entry moved here only to retain roughly
three current sections.

## SUPERSONIC exact track entry archived (2026-07-27)

`MOVE_SUPERSONIC` remains exact at **51/51 ×2** in both orientations,
covering all six rings, their fixed-point/affine body, `splitbgprio_foes`,
the literal attacker ShakeMon2 tuple, and persistent side-specific sprite
order. Its full evidence paths and sibling audit remain authoritative in
`ANIMATION_COVERAGE.json`; the live entry moved here only to retain roughly
three current sections.

## MILK DRINK and RECOVER healing-track entries archived (2026-07-26)

`MOVE_MILK_DRINK` remains exact at **186/186 ×2** in both orientations,
covering the milk bottle, thin ring, `HealingEffect2`, and display latches.
`MOVE_RECOVER` remains exact at **169/169 ×2** in both orientations, covering
21 absorption orbs, the odd-swing palette cycle, and `HealingEffect`. Their
full evidence paths and sibling audits remain authoritative in
`ANIMATION_COVERAGE.json` and git history; they moved here only to keep the
living ledger to roughly three current entries.

## Psychic-family opposite orientation closure (2026-07-26)

CONFUSION and PSYCHIC promoted from partial to exact and FUTURE_SIGHT stayed
exact after the opponent-front KADABRA / player-back ONIX variants closed
through the shared seam. Source dependencies were KADABRA's distinct battle
`anim_front.png`, 56×56/yOffset-5 geometry, frame program, and
`ANIM_GROW_VIBRATE`; the three complete opposite windows were 140/140,
140/140, and 114/114, reproduced twice, with their player orientations and
GROWTH/BIND controls also green. Commit `abc5474`.

## Psychic-family window-2 boundary closure (2026-07-26)

CONFUSION and PSYCHIC reached 140/140 in their player-attacker windows through
the shared `AnimTask_ShakeMon` creation latch and separate mode/matrix seam.
They remained partial only for the then-unstaged opposite KADABRA-front
orientation. FUTURE_SIGHT stayed 114/114; GROWTH and BIND controls passed in
both orientations. Commit `3b443cd`.

## Psychic-family window-1 creation-tick correction (2026-07-26)

The display formula had skipped `AnimTask_ShakeMon2`'s raw creation write.
Using the literal index-0 source state closed one frame each for CONFUSION and
PSYCHIC (138/140). A proposed window-2 splice unification was tested and
refuted because it regressed the restore edge, so no per-tick patch landed.
The later window-2 and opposite-orientation entries supersede this checkpoint.

## MOVE_PSYCHIC initially staged at 137/140 before shared boundary and orientation closure (2026-07-26)

`Move_PSYCHIC` was proven byte-for-byte the CONFUSION script shape except for
its RGB(31,23,0) attacker tint, +5 target shake, and -6/-6 target scale
literals. The first player-back KADABRA → opponent-front ONIX dense port
landed at 137/140 twice, with its three mismatches at the same relative
creation/tail ages as CONFUSION. Later live-ledger entries record the shared
boundary fix to 140/140 and the opposite-orientation acceptance.

## CONFUSION's banked OAM x-lag fixed: window 2 108/140 → 137/140; stays `partial`, 3 boundary-tick frames named as the honest remainder (2026-07-26)

**Verdict: real fix landed, closing 29 of 32 previously-failing frames. `MOVE_CONFUSION` stays `partial` (137/140, not the required complete 140/140) — the 3 remaining frames are all creation/tail-boundary ticks, the same class as the already-known window-1 frame-119 issue, named honestly rather than promoted past.**

**Instrument first (rung 12):** re-probed the full shake window on both windows via the already-committed `dump-scale-window-oam-scanline.py` (new script `tools/compare/scratch/confusion-oam-shadow-lag-probe.mjs`, committed for reproducibility) — reading the sprite struct's own `x2` field and its OAM-shadow `attr1` x bitfield at the identical instant, not a display-timing artifact. Result: `oamX(tick) == x(tick) + x2(tick-1) + centerToCornerVecX(tick)` holds for **28/29 window-2 ticks and 17/18 window-1 ticks** (the lone miss each time is the shake task's own creation tick, already absorbed by `confusion.ts`'s "+1" idiom) — a real, uniform **one-tick OAM-copy latency** present on BOTH `AnimTask_ShakeMon` and `AnimTask_ShakeMon2` alike, contradicting `sceneOnConfusionView`'s old "window 2 needs no lag" claim (which rested on a 13/30 sampled-pixel check at a single tick near the scale curve's own extremum, where a lag error is nearly invisible). The matrix (`gOamMatrices`) carries no analogous RAM-internal lag of its own (exact at zero shift, all 31 ticks) — but FUTURE_SIGHT's own attacker scale (the same `scaleMonAndRestoreAtAge`/`FUTURE_SIGHT_SCALE_PARAMS` mechanism) already documents a two-tick **display** lag, so the same was expected here too, independent of the x2 finding.

**Fix (rung 13):** `sceneOnConfusionView`'s target x2/scale now read at `state.age-2`, matching window 1's own already-coded shake lag exactly (the OAM-shadow latency + the same generic one-tick framebuffer-capture lag established everywhere else in this codebase). Dense sweep of every integer shift 0-4 (`tools/compare/scratch/confusion-cached-compare.ts`) confirmed -2 on BOTH shake and scale together is the real mechanism (either alone: unchanged at 108/140; both together: 122/140, every interior EVEN tick byte-exact). Two secondary corrections found by continuing the sweep: the `monbg` frozen copy is repanned by its own task (`Task_UpdateMonBg`), not the live sprite's shake task, so it only carries the generic one-tick capture lag (-1) — `battleScene.ts` now reads its x2 separately; and `targetTouched` (the idle-offset/window-2 handoff) moves one tick later to match the now-lagged x2 read. A third asymmetry (the active/inactive edge reaches the display one tick AHEAD of the numeric magnitude — RAM-confirmed same-tick for affineMode/objMode) closed the remaining transitional ticks. One dead end recorded in the code's own comment: forcing xScale/yScale to neutral 256 whenever the active edge reads false seemed "more correct" but made the comparator WORSE (frame176's residual grew from 33px to 881px) — kept the empirically-validated version instead.

**Coverage.** `MOVE_CONFUSION`: stays `partial`, **108/140 → 137/140** (`confusionPortable.ts`, reproduced twice, fresh oracle run both times). Remaining 3 frames: 119 (window 1's own creation-tick boundary, unchanged, still uninvestigated), 147 (window 2's own creation-tick boundary — the active-edge and magnitude reads disagree for exactly this one tick), 176 (window 2's tail boundary, reduced from 881px to 33px but not fully closed). Bounded time was spent on all three within this session's cap; none closed further without speculative per-tick special-casing beyond what the dense sweep already justified. Regression gates green, reproduced twice each, both orientations: `futureSightPortable.ts` 114/114, `growthPortable.ts` 63/63, `bindPortable.ts` 45/45 (component + framebuffer).

**New Tier-1 tests** (`tests/animation/confusion.test.ts`) pin `sceneOnConfusionView`'s corrected values against literal oracle-tick numbers, including the active/magnitude read-parity asymmetry.

**Evidence.** `npm test` 2637/2637. `npm run build` green.

**Next action for a future session:** MOVE_PSYCHIC (this family's third sibling) and the second CONFUSION orientation remain unstarted — this session's own mandate made PSYCHIC staging conditional on a full CONFUSION close, which didn't happen, so it was correctly left untouched. The 3 remaining boundary-tick frames (119, 147, 176) are all narrow, single-tick transitional cases; a future session could try modeling the active/magnitude edges as a genuine 2-tick ramp (rather than a hard step) if it wants to chase them further, but the returns are small (3 frames out of 140).

## Defect A closed: DISPCNT-OBJ-off capture names the 2nd blend target directly, formula verified exact — `MOVE_FUTURE_SIGHT` promoted to `exact` (114/114); `MOVE_CONFUSION` stays `partial`, blocked on its own already-banked OAM x-lag, not the blend (2026-07-26)

**Verdict: real fix landed. `MOVE_FUTURE_SIGHT` is now `exact`, dense window fully green (114/114, reproduced twice), both regression gates green (reproduced twice each, both orientations). `MOVE_CONFUSION`'s own blend mechanism is now correctly implemented and formula-verified, but a separate, already-banked defect (one-tick OAM x-lag on the target's own shake, rung 8) keeps its window at `partial`, 108/140 — confirmed a true no-op there via stash-and-diff, not a swallowed regression.**

**Instrument (rung 10):** `tools/probe/dump-scale-window-underlayer.py` (new) captures the oracle's own pre-OBJ composite directly — clears DISPCNT's OBJ-display bit (bit 12) on the real hardware register immediately before the single `advance()` call that renders the target tick, so the PPU composes BG layers only for that one frame; a second, unmodified pass captures the same tick normally for a byte-exact cross-check against the already-cited oracle pixel. Getting there required a genuine harness finding, not assumed: `EmeraldOracle.write_u8`/`write_u16` (built on libmgba-py's `raw_write`) silently no-op for palette RAM, OAM, and IO registers — verified directly (a WRAM scratch byte round-trips correctly; a DISPCNT round-trip does not change on read-back at all, even though the write call itself doesn't error). The working path is the "bus" write (`MemoryView._bus_write`, the same side-effect-carrying path a real CPU store instruction uses) — confirmed to actually flip the bit, and confirmed the poke survives the following `advance()` call untouched (matches `gpu_regs.c`'s own per-register waiting-list flush model: a register only gets re-copied to hardware on a frame where `SetGpuReg` was called for it, and DISPCNT is only ever set once at battle-scene setup).

**Formula check (rung 10): exact.** `tools/compare/scratch/defect-a-blend-check-instrumented.mjs` (new): `oracle_pixel == blend(tinted_texel, captured_under_pixel)` reproduced **26/26** sampled interior mismatches at FUTURE_SIGHT tick130, using the real captured 2nd-target pixel (not a reconstruction). One correction to the mandate's own 5-bit framing, found empirically then confirmed by inspection: computing `min(255,(eva*top8+evb*bottom8)>>4)` directly on the already-8-bit-expanded RGB values (both `top`/`bottom` here are valid `rgb5` expansions of a native 5-bit color already) reproduces the oracle byte exactly; re-truncating to 5-bit first (`component8>>3`) and re-expanding throws away real sub-5-bit precision the hardware's own bit-replication expansion carries, undershooting by ~4/255 on affected channels. This is exactly `blendChannel` (`battleScene.ts`), already in the codebase for turn9's hitsplat — no new formula needed, just the right target pixel. CONFUSION tick160 matched **13/30** — every case where the coordinate mapping is already correct (including every transparent-OBJ-texel passthrough case) matched byte-for-byte; the other 17/30 sit exactly where rung 8's own already-banked one-tick OAM x-lag on this move's target shake puts the sample at the wrong texel — a separate, pre-existing, out-of-scope defect, not a blend-formula failure.

**Regression-gate recon (before touching code):** `GrowthEffect`'s and `BindWrapSqueezeTarget`'s own `createvisualtask AnimTask_ScaleMonAndRestore` calls both pass `objMode=0` literally in source (`data/battle_anim_scripts.s`) — neither move ever had a blend-mode OBJ, so a fix scoped only to FUTURE_SIGHT's attacker / CONFUSION's target draw call sites cannot touch them. Confirmed after the fact too: both regression fixtures stayed exact.

**Fix (rung 11):** extended `battleScene.ts`'s FUTURE_SIGHT attacker case (and, structurally, CONFUSION's target case) to draw `monbg`'s still-live frozen copy first, then composite the tinted, scaled sprite 50/50 on top via a new `drawSpriteSheetAffineStretchTintedBlend` (tint/sample step from `drawSpriteSheetAffineStretch` + the blend-over-live-`fb` output stage and `blendChannel` formula from the existing `drawSpriteSheetAffineStretchBlendedOverFb`). One non-obvious wrinkle found and fixed along the way: the frozen copy is **not** a static original-color snapshot — it shares the OBJ's own palette RAM, so `blend_color_cycle`'s live tint ramp applies to it too (a plain untinted copy left a constant, tintCoeff-sized brightness gap against the oracle at every sampled pixel). A second wrinkle, RAM-probed at the tail of the scale window (ticks135-150): OAM `objMode`/`affineMode` flip back to normal **one** tick before the affine matrix itself reaches neutral 256 (the matrix has its own already-established two-tick display lag; objMode/affineMode's is one tick) — `sceneOnFutureSightView` gained `attackerBlendActive` (age-1 lagged, reusing the tint state's own offset) to tell "still hardware-blending" apart from "matrix not yet neutral," and for that one-tick gap the native-size OAM box clips the still-slightly-enlarged opaque sprite at its edges, so the frozen copy has to stay drawn underneath (opaque, undoubled, no blend) through that tail too.

**Coverage.** `MOVE_FUTURE_SIGHT`: `partial` → **`exact`**, 114/114 (`futureSightPortable.ts`, reproduced twice). `MOVE_CONFUSION`: stays `partial`, 108/140 (`confusionPortable.ts`, reproduced twice, byte-identical mismatched-frame list with and without this session's target-side change — verified via stash-and-diff, a real no-op not a regression). Regression gates green, reproduced twice each, both orientations: `growthPortable.ts` 63/63, `bindPortable.ts` 45/45 (component + framebuffer).

**Evidence.** `npm test` 2590/2590. `npm run build` green.

**Next action for a future session:** name and fix CONFUSION's own one-tick OAM x-lag on the target's shake offset (rung 8's finding: real OAM x is one tick stale against the sprite struct's own `x2` that same tick) — once that's closed, window 2 should fall out for free since the blend mechanism itself is already proven correct (13/30 direct matches this session, blocked only by the wrong sample coordinate). Separately: FUTURE_SIGHT's window-1/CONFUSION's frame119 boundary-tick issue (unrelated to defect A) and the second orientation / PSYCHIC sibling remain open for a future session.

## Defect A's texture-space instrument run to exhaustion: zero texel matches at any tint coefficient — real cause is a missing alpha-blend composite (OAM `objMode=1`), not a coordinate bug; both moves stay `partial`, unchanged counts (2026-07-26)

**Verdict: the mandated instrument returned a clean, exhaustive negative — no texel-space coordinate delta exists — and that negative pointed straight at the actual mechanism: the scaled OBJ is hardware alpha-blended with what's behind it, and this engine paints it fully opaque. Real, RAM-proven finding; no fix landed, since the correct 2nd blend target isn't nailed down yet, and this step's own contingency says don't guess.**

**Instrument, run as specified.** `tools/compare/scratch/defect-a-texel-search.mjs` (new): at FUTURE_SIGHT's attacker peak (oracle tick 130 — RAM tick 128's own matrix, 196, applies via the already-proven 2-tick display lag, NOT tick 130's own RAM value 204 — re-confirmed directly this session by re-dumping ticks 112-132) and CONFUSION's target peak (oracle tick 160 — this window carries NO scene lag per rung 8's own finding, so RAM tick 160's own matrix, 196, applies directly), brute-forced KADABRA's/ONIX's full 16-entry palette × every tint coefficient 0-16 (not just the one computed value, to rule out a tint-coefficient bug specifically) against 27 and 30 interior mismatched pixels respectively, including the ledger's own `(96,58)`-class candidates. Fixed the previous session's own diag-script call convention along the way (its `ox` argument is the sprite's *native, non-doubled* corner per its own header comment — the previous session's OAM-derived doubled corner (8,24) was passed in error; using the correct native corner (40,56) reproduces the ledger's own cited example exactly: tick130 pixel (96,58) app=(198,173,132) oracle=(210,86,82)).

**Result: zero matches, everywhere, at any coefficient.** Not one of the 57 sampled pixels' oracle color exists anywhere in either sprite's own tileset under any tint. This rules out the mandate's own named candidate bugs as a group (`>>8` truncation vs rounding, half-texel center offset, matrix-from-corner-vs-center, mx/my sign swap) — a coordinate bug would still sample *some* real texel, just the wrong one; here no texel anywhere matches, so the pixel isn't a texel sample at all.

**Why: found by finally reading a field rung 8's own probe already dumped.** `dump-scale-window-oam-scanline.py`'s `objMode` column (captured in rung 8, but that session's writeup only discussed `shape`/`size`/`affineMode`) flips `0`→`1` at the *exact* tick each scale task starts (RAM tick 114 for FUTURE_SIGHT's attacker; RAM tick 146 for CONFUSION's target — re-probed both this session, same mechanism, same relative timing). `objMode=1` is `ST_OAM_OBJ_BLEND`, and it's not incidental: `AnimTask_ScaleMonAndRestore`'s 5th script arg literally IS the sprite's objMode (`battle_anim_mon_movement.c:820-826`, `PrepareBattlerSpriteForRotScale(spriteId, gBattleAnimArgs[4])`), and both moves' own scripts pass `1` for that arg (already quoted in this ledger's own earlier rungs: `createvisualtask AnimTask_ScaleMonAndRestore, 5, -4, -4, 15, ANIM_ATTACKER, 1`). GBA hardware forces a semi-transparent OBJ to act as alpha-blend target 1 regardless of `BLDCNT`'s own OBJ-select bit (GBATEK). Re-ran `dump-monbg-scale-window.py` for the live blend registers at tick130: `BLDCNT=16192`/`BLDALPHA=2056` decode to mode=1 (alpha blend), target2 = every layer (BG0-3+OBJ+backdrop), `eva=8`/`evb=8` (a flat 50/50 blend) — RAM-read, not assumed. This fully explains the zero-texel-match result: the true displayed pixel is `(tinted sprite texel + whatever's underneath) / 2`, never a pure texel sample.

**Consistent with the already-reported symptom shape.** Pixels sampled at the sprite's true screen center (~72,88) aren't in the mismatch list at all (`defect-a-scanline-diag.mjs`) — "exact at center, wrong toward edges, growing with scale magnitude" (this ledger's own repeated observation) is exactly what a blend-with-something-that-tracks-the-OBJ-near-center-but-diverges-toward-the-edges would produce.

**Checked and ruled out the obvious alternative this evidence suggested (BG2-in-front-of-OBJ):** since `monbg`'s frozen BG2 tile copy stays live for the whole scale window (rung 7's own finding) and rung 7's underlay-fix was a no-op, the natural next guess was that BG2 might actually render *in front of* the scaled OBJ (hiding it under the frozen unscaled copy wherever both overlap, which would explain color-only interior mismatches with no transparency involved). Checked directly: OBJ priority reads `2` and `BG2CNT`'s own priority field also reads `2` throughout the window (`tools/probe/dump-monbg-scale-window.py` rerun ticks 126-132, plus `run-battle-lab-rgb.py`'s own `playerSprite.priority`). Real hardware's OBJ-vs-BG priority tie-break favors the OBJ at equal priority — so BG2 should *not* be winning this composite. Hypothesis checked and set aside, not assumed away.

**No fix landed — the 2nd blend target isn't identified yet.** Tried blending the engine's own tinted texel 50/50 against two candidate "bottom" layers (`tools/compare/scratch/defect-a-blend-check.mjs`, new): (a) the raw psychic-BG swirl pixel already at that screen position before the sprite draws, (b) the frozen, unscaled `monbg` BG2 copy of the same sprite (rung 7's own mechanism) sampled at its native 1:1 position. **Neither reproduces the oracle color.** (a) gets the green channel exactly right on several sampled pixels but red/blue diverge by a large, non-constant amount; (b) is transparent at most sampled positions (the unscaled 64×64 footprint doesn't cover where the doubled, scaled OBJ paints), so it can't be the sole 2nd target either. The real 2nd target is likely a fuller PPU composite (BG2's frozen copy over BG1's swirl, with per-pixel transparency fallthrough) that neither single-layer guess captures on its own — modeling that correctly needs its own instrument, not a guess, so per this step's own contingency (no consistent single-formula match → bank evidence, don't speculate) no render code was touched this session.

**Coverage: unchanged.** `MOVE_FUTURE_SIGHT` stays `partial`, 85/114 (`futureSightPortable.ts`, reproduced twice). `MOVE_CONFUSION` stays `partial`, 108/140 (`confusionPortable.ts`, reproduced twice). Regression gates checked green: `growthPortable.ts` 63/63 both orientations (×2 each), `bindPortable.ts` exact 45/45 both orientations (×2 each) — the shared affine path is undisturbed.

**Evidence.** `npm test` 2590/2590 (no test file touched this session, only new probe/scratch scripts — recorded as the actually-observed number; this branch's own count has drifted from the previously-stated 2582 across sibling merges, not from anything in this session). `npm run build` green.

**Next action for a future session:** name the real 2nd blend target before attempting a fix. Candidates to instrument directly: dump VRAM/`gPlttBufferFaded` at a scale-window tick to see exactly what's resident on BG2 across the OBJ's full *scaled* footprint (not just its native 64×64 one, since `Task_UpdateMonBg` only re-pans/re-tints the frozen copy, never rescales it); or, if the harness's probe tooling allows a register poke, capture the oracle's own pre-OBJ composite (temporarily disable the OBJ layer via `DISPCNT`) to read the true 2nd-target color directly instead of reconstructing it from asset data. Once that formula is nailed down: extend `drawSpriteSheetAffineStretch` (or a sibling) with a real alpha-blend step gated on the caller requesting blend mode, verify against both dense fixtures twice each, and only then promote. Separately, still banked and not chased: CONFUSION's target one-tick OAM x-lag (rung 8) remains unresolved.

## Defect A instrument named in the brief CONTRADICTED: the doubled scan window is RAM-byte-identical to hardware — both moves stay `partial`, unchanged counts (2026-07-26)

**Verdict: the "naive 2x bounding box overreaches hardware" hypothesis, as literally stated, is refuted by direct OAM evidence. No render fix attempted (per this step's own contingency: bank evidence and stop, don't chase a speculative fix once the mandate's hypothesis is contradicted).** Wrote `tools/probe/dump-scale-window-oam-scanline.py` (new, extends `dump-monbg-scale-window.py`'s own `sprite_record`) to dump the scaled OBJ's full OAM attr0/attr1 (shape/size/affine-mode bits, the real hardware x/y — not just the matrix, already RAM-confirmed in rung 5) plus raw whole-frame screen captures at the peak-scale ticks, against both fixtures.

**Confirmed exactly as assumed (no defect here):** at FUTURE_SIGHT's attacker peak (oracle tick 130, and its neighbors 116/144) and CONFUSION's target peak (tick 160, neighbors 146/176), OAM `shape=0` (SQUARE), `size=3` (64x64), `affineMode=3` (DOUBLE) — matches this engine's 64x64-tileset assumption exactly, ruling out a shape/size mismatch. More importantly: the real OAM `x`/`y` (`attr1&0x1FF`, `attr0&0xFF`, unwrapped) reads **(8,24)** for FUTURE_SIGHT's attacker throughout the scale window. `sprite.x(72)+x2(0)+centerToCornerVecX(-64, RAM-read directly, matches the doubled `-32*2` from `CalcCenterToCornerVec`'s own table, `reference/pokeemerald/src/sprite.c:137-157`) = 8` — and this engine's own `drawSpriteSheetAffineStretch(doubled=true)` computes its window's screen-space top-left as `ox(40)-halfW(32) = 8`. **Byte-identical.** Same match on Y (24) and on CONFUSION's ONIX target corner. This directly contradicts the brief's own framing that "our scan reaches further than hardware" — the doubled render window's real screen position and size are exactly what this engine already computes; the window itself is not the defect.

**New, load-bearing correction: the earlier `(181,3)` pixel sample (rung 7) was itself using an un-lagged matrix reading and is not representative of the residual's true shape.** Re-checked properly this session: this engine's own `sceneOnFutureSightView` reads the scale matrix at `state.age-2` (the already-proven, RAM-validated GROWTH-derived display lag) — so a screen captured at oracle tick *T* shows the RAM matrix as of tick *T-2*, RAM-confirmed directly here too (matrix at tick114 = 252 = `futureSightAttackerEffectAtAge(0)`'s prediction for what tick116's screen should show; live matrix *at* tick116 itself is 244, which is what tick118's screen shows instead). Redid the per-pixel diff (`tools/compare/scratch/defect-a-scanline-diag.mjs`, new) against the real oracle RGB captures with this lag correctly applied both directions: the residual is **not** simply "oracle transparent, engine opaque" as the single `(181,3)` sample suggested. Most sampled mismatches (e.g. FUTURE_SIGHT tick130, pixel (96,58): app `(198,173,132)`, oracle `(210,86,82)`) are opaque-vs-opaque **color** differences, including pixels **inside the original non-doubled 64×64 footprint** (`dx=56,dy=4`, both within `[0,64)`) — a region the doubled-window-overreach hypothesis cannot touch at all, since that hypothesis only predicts mismatches in the doubled-only fringe. The true residual is a texture-space sampling/coordinate defect somewhere inside the correctly-sized window, not a boundary-clamping bug.

**Checked and ruled out the obvious alternative this evidence suggested (BG2-in-front-of-OBJ):** since `monbg`'s frozen BG2 tile copy stays live for the whole scale window (rung 7's own finding) and rung 7's underlay-fix was a no-op, the natural next guess was that BG2 might actually render *in front of* the scaled OBJ (hiding it under the frozen unscaled copy wherever both overlap, which would explain color-only interior mismatches with no transparency involved). Checked directly: OBJ priority reads `2` and `BG2CNT`'s own priority field also reads `2` throughout the window (`tools/probe/dump-monbg-scale-window.py` rerun ticks 126-132, plus `run-battle-lab-rgb.py`'s own `playerSprite.priority`). Real hardware's OBJ-vs-BG priority tie-break favors the OBJ at equal priority — so BG2 should *not* be winning this composite. Hypothesis checked and set aside, not assumed away.

**One genuinely new, smaller finding, flagged but not chased (out of this step's scope):** CONFUSION's target OAM `x` at tick160 reads `112`, one tick stale relative to the sprite struct's own `x2=3` that same tick (`176+3-64=115≠112`; `176+0-64=112` matches the *previous* tick's `x2=0` exactly) — a real one-tick OAM-copy latency on the shake offset specifically, distinct from the already-modeled scale-matrix display lag. This contradicts `sceneOnConfusionView`'s own doc comment claim that window 2 "needed NO scene-level lag at all." It's a small (±3px) translation effect on the shake, not obviously the driver of defect A's much larger, magnitude-scaling interior residual — banked here for a future session rather than folded in blind.

**Coverage: unchanged.** `MOVE_FUTURE_SIGHT` stays `partial`, 85/114. `MOVE_CONFUSION` stays `partial`, 108/140. No render code touched this session.

**Evidence.** `npm test` 2582/2582 at the branch base (unchanged — probe + scratch diagnostics only, no production code; supervisor-corrected from a stale 2463 copy). `npm run build` green.

**Next action for a future session:** the window-bounds hypothesis is closed out (confirmed correct, not the defect). The real next instrument is a texture-space one: at a fixed peak tick, for several interior mismatched pixels, brute-force search KADABRA's/ONIX's own tileset (accounting for the active tint coefficient) for which `(row,col)` actually produces the oracle's observed color, and compare that against this engine's own computed `(sx,sy)` — if they differ by a consistent delta, that names the exact rounding/coordinate bug in `drawSpriteSheetAffineStretch`'s sampling math directly rather than by further pixel-guessing. Separately worth a quick look: the newly-found one-tick OAM x-lag on CONFUSION's target shake (above) — resolve whether `sceneOnConfusionView`'s "no lag" claim needs a correction, independent of defect A.

## Defect A cracked open, not closed: monbg hypothesis RAM-CONFIRMED real, but the direct fix is a no-op — both moves stay `partial`, unchanged counts (2026-07-25)

**Verdict: real, RAM-proven mechanism found; the obvious fix built from it does not close the defect — reverted, not landed.** Mandate: instrument defect A (the scale-window sprite-interior residual, cross-move-triangulated to `monbg`) before touching render code. Wrote `tools/probe/dump-monbg-scale-window.py` (new, cites `Cmd_monbg`/`MoveBattlerSpriteToBG`/`Task_InitUpdateMonBg`/`Task_UpdateMonBg`, `battle_anim.c:591-837`) and ran it against FUTURE_SIGHT's own kadabra-onix fixture, ticks 105-150: reads `gSprites[].invisible`/x2/y2/matrix, `gBattle_BG1_X/Y`/`gBattle_BG2_X/Y`, and the real `BG1CNT`/`BG2CNT`/`BG1HOFS`/`BG1VOFS`/`BG2HOFS`/`BG2VOFS`/`DISPCNT` hardware regs.

**Confirmed:** the attacker OBJ's `invisible` bit is `TRUE` ticks 105-113 (post-`monbg`, pre-scale) and flips `FALSE` at exactly tick 114 — the same tick `attackerScale.active` goes true. Source read explains it exactly: `PrepareBattlerSpriteForRotScale` (`battle_anim_mons.c:1295-1307`), called at `AnimTask_ScaleMonAndRestore`'s own start, unconditionally re-clears the OBJ's `invisible` flag. So `monbg`'s hide is undone the instant the scale task begins — **both** the OBJ (now visible, scaled via its own OAM matrix, already RAM-exact per rung 5) **and** BG2's frozen `MoveBattlerSpriteToBG` tile copy (never rescaled, only re-panned/re-tinted every tick by `Task_UpdateMonBg`) are simultaneously live for the whole scale window. This is real, hard RAM evidence, not a guess.

**The fix built from it did not work.** Tried "draw the same sprite unscaled first, then the real scaled OBJ on top" (gated on `attackerScale.active`/`targetScale.active`) in both moves' `battleScene.ts` draw cases. Reran both dense comparators twice: FUTURE_SIGHT moved only 85/114 → 86/114 (one frame, plausibly noise), and CONFUSION was **byte-identical** at 108/140 — directly verified by stashing the fix and re-rendering the same age: pixel-for-pixel identical output, including inside the mismatch region. **Reverted** (`git checkout -- src/engine/battleScene.ts`) rather than landed.

**Why it was a no-op, and defect A's real shape:** cross-checking already-exact MOVE_BIND's own convention (xDelta=+10 on X drawn as a visible squeeze, i.e. a SHRINK) against `drawSpriteSheetAffineStretch`'s `sy=((ry*my)>>8)+halfH` formula shows a matrix value **below** 256 renders the sprite **bigger** (zoom in), not smaller. FUTURE_SIGHT/CONFUSION's `xDelta=yDelta=-4` is therefore a **GROW** (KADABRA/ONIX puff up), not a shrink — the opposite of this session's initial "shrink exposes a gutter" framing, which is why an underlay fix changed nothing (a grown OBJ already covers any underlay everywhere it matters). Direct pixel sampling (`tools/compare/scratch/confusion-pixel-list.mjs`, new) confirms the real symptom is the opposite of "missing fill": e.g. oracle pixel (181,3) reads `(255,0,0)`, a psychic-BG-swirl color, while this engine's own doubled-affine scan paints an opaque ONIX-gray `(189,181,181)` there — this engine's `doubled=true` scan reaches further than the real hardware's double-size OBJ actually paints.

**Coverage: unchanged.** `MOVE_FUTURE_SIGHT` stays `partial`, 85/114. `MOVE_CONFUSION` stays `partial`, 108/140. Neither ledger's pinned counts moved (the +1 FUTURE_SIGHT frame from the reverted fix is gone too).

**Evidence.** `npm test` 2463/2463 (unchanged — no engine/production code landed this session, only the new probe + scratch diagnostics). `npm run build` green.

**Next action for a future session:** the "gutter" framing is wrong; re-derive from the GROW direction. Dump the OBJ's real OAM attr0/attr1 (shape/size bits — this session's probe didn't capture them) plus a raw per-scanline sample at a peak-scale tick (~frame 130) to find exactly where the real hardware's double-size affine window stops painting, since this engine's current "naive 2x bounding box" doubled scan is now the prime suspect for over-reaching. Both moves share this one root cause and should close together once it's found.

**PAPERCUT:** none new this session beyond the already-known first-diff-only bbox report (already fixed by `--per-frame-bbox`, prior session).

## MOVE_CONFUSION ported (group-A sibling): window 1 (attacker) lands 19/20 exact, window 2 (target) carries FUTURE_SIGHT's own defect-A residual, stays `partial` at 108/140 (2026-07-25)

**Verdict: real port, not a fit — window 1 essentially exact, window 2's residual is new evidence for FUTURE_SIGHT's still-open defect A, not a new bug.** Per the archived enumeration, CONFUSION's own script (`battle_anim_scripts.s:4716-4730`, verified directly, not assumed) composes only already-proven pieces around TWO sequential simultaneous-task windows, not one: window 1 (attacker) `AnimTask_ShakeMon2`+`blend_color_cycle`; window 2 (target) `AnimTask_ShakeMon`+`AnimTask_ScaleMonAndRestore` (same xDelta/yDelta/duration as FUTURE_SIGHT's own attacker scale, here on the TARGET - the real composition risk this port existed to check). Reused FUTURE_SIGHT's own KADABRA/ONIX fixture pairing (`FRONTIER_MON_KADABRA_1` carries both moves) - zero new sprite extraction needed.

**RAM-probed first** (`tools/battle-lab/mechanic-confusion-kadabra-onix.json`, the already-committed generic `run-battle-lab-rgb.py`, no new probe script): fade 1 is byte-identical in shape to FUTURE_SIGHT's own (same subroutine); window 1 creates at age 37 - the SAME age FUTURE_SIGHT's own attacker effect starts at; window 2 creates at age 65; fade 2 starts later (age 101, not 73 - window 2's own longer task chain runs first) but shares FUTURE_SIGHT's exact ramp/hold/ramp shape; the BG-palette rotation ring carries the SAME rung-6 pause mechanism at its own breakpoint (age 97, not 69) - directly RAM-confirmed against the raw palette row (clean 4-age cadence 21->93, then a jump to 99, not 97).

**Factored, not duplicated** (per this step's own instruction): extracted the shared `SetPsychicBackground`/`UnsetPsychicBackground` fade-ramp and rotation-pause formulas out of `futureSight.ts` into a new `src/engine/psychicBackground.ts` - a pure, behavior-preserving refactor (`futureSight.test.ts` 9/9 unchanged before touching anything else). Ported `src/engine/confusion.ts` on top of it, reusing `blendColorCycleObjYAtAge`/`scaleMonAndRestoreAtAge`/`shakeMonOffsetAtTick`/`shakeMon2OffsetAtTick` verbatim (all already-proven), Tier-1-pinned (`tests/confusion.test.ts`, 11/11, every constant checked directly against the RAM probe's own output - including the already-established `AnimTask_ShakeMon(2)` "+1, guard age<creationAge" idiom from `dragonBreath.ts`/`blazeKick.ts`/`fly.ts`, RAM-confirmed to apply here too).

**Wired** through the Scene-ON seam (`sceneOnConfusionView`, `battleScene.ts`'s CONFUSION draw case, reusing `kadabraBackSprite`/`onixFrontSprite`/`battleAnimPsychicBg` - no new assets). Per-mechanism lag bisection against the dense fixture (not a blind sweep - the ledger's own warning that one window can carry several lag conventions held true here): window 1's `AnimTask_ShakeMon2` needed its OWN scene-level lag (-2, distinct from GROWTH/FUTURE_SIGHT's own tint lag of -1), closing window 1 to 19/20 exact. Window 2's target (both `AnimTask_ShakeMon`'s x2 and `AnimTask_ScaleMonAndRestore`'s matrix) needed NO scene-level lag at all - RAM and pixels already agree at raw age, ruling lag out as window 2's problem.

**Dense comparator, rerun twice** (`tools/compare/confusionPortable.ts`, new `--per-frame-bbox` flag - this session's own fix for the PAPERCUT rung 5 named): **108/140 both times**, deterministic. Window 1 (attacker, frames 118-137, 20 frames): **19/20 exact**, only frame 119 (a single creation-tick boundary frame) mismatches. Window 2 (target, frames 146-176, 31 frames): **0/31 exact** - a whole-sprite-interior residual growing with the scale magnitude, exact at the sprite's center pixel, wrong toward the edges, surviving a full per-mechanism lag bisection. **New evidence for FUTURE_SIGHT's own open defect A, not a new bug**: FUTURE_SIGHT's attacker (has `monbg ANIM_ATK_PARTNER`) shows this residual class, BIND's target (no `monbg` at all) does not, and CONFUSION's target (has `monbg ANIM_DEF_PARTNER`) now shows it too - `monbg`'s own `MoveBattlerSpriteToBG` mechanism (moving the battler onto a BG2 tile copy instead of a plain OBJ) is now a live, named suspect. Not chased here - defect A remains FUTURE_SIGHT's own open item, out of this move's scope.

**Coverage:** `MOVE_CONFUSION` added to `ANIMATION_COVERAGE.json` as `partial`, 108/140.

**Evidence.** `npm test` 2463/2463 (2452 + 11 new `confusion.test.ts`). `npm run build` green.

**Next action for a future session:** PSYCHIC (this family's third and final sibling, not started - identical shape to CONFUSION with different color/deltas per the family map, should port cheaply once staged); the opposite orientation (KADABRA front sprite, not yet extracted); and defect A's real root cause, now with a concrete `monbg`-driven hypothesis shared between FUTURE_SIGHT and CONFUSION to chase (a VRAM/OAM tile-data dump at a scale-window peak tick, or checking whether `MoveBattlerSpriteToBG`'s BG2-copy path changes the affine-stretch sampling itself).

## MOVE_FUTURE_SIGHT rung 6: register-level probe named and fixed defect B (the second-fade rotation-cadence pause); defect A untouched, stays `partial` at 85/114 (2026-07-25)

**Verdict: real fix, landed and pinned — defect B is closed.** Rung 5 left
two named defects: B (10/39 mismatched frames, 147-164, a 17230px
whole-upper-screen bbox in a period-4 pattern during the second/restore
psychic-BG fade) and A (29/39, KADABRA's own attacker box, frames
116-144). This rung's mandate was defect B first (register-level probe),
touching A only if the same instrument explained it.

**The instrument.** Re-ran the fixture's own already-committed dense-probe
script (`tools/probe/run-battle-lab-rgb.py`, invoked directly rather than
through `futureSightPortable.ts`'s auto-deleted temp dir, so the raw
`probe.json` could be inspected) — it already records `bldcnt`/`bldalpha`/
`bldy` and the full `bgPalette2Faded` row every frame, no new probe script
needed. Diffed the raw BG palette 2 row tick-by-tick across the whole
window.

**The exact divergence.** The psychic-BG rotation ring's own transition
ages land at 21, 25, ..., 65 — exactly the existing 4-tick cadence
already coded in `futureSight.ts`, RAM-confirmed byte-for-byte. Then the
ring holds for **6 ticks instead of 4**: the next transition is age 71,
not the naively-predicted 69. After that single pause, the clean 4-tick
cadence resumes, permanently shifted +2 (71, 75, 79, 83, 87, 91, all
RAM-confirmed). The pause window (ages 67-72) exactly spans the tick
range where `REG_BLDCNT`/`REG_BLDALPHA` both read 0 — the gap between the
attacker `blend_color_cycle`/`ScaleMonAndRestore` pair's own `blendoff`
cleanup and `UnsetPsychicBackground`'s own fade setup (`REG_BLDCNT` reads
`0xe8` again starting exactly at age 73, the same tick the existing
`futureSightBgBldyAtAge` ramp already starts, unlagged). `REG_BLDY`'s own
ramp was independently re-verified RAM-exact against the existing
(unchanged) formula through the whole window (e.g. frame 150/age 73 →
bldy 0, frame 151/age 74 → bldy 1) — confirming this is a
rotation-cadence-only defect, not a darken-register one, consistent with
rung 5's own negative result (extending the BLDY lag made things worse).

**The fix.** `rotationCountAtAge` (`src/engine/futureSight.ts`) now
applies a single documented breakpoint/pause (age 69, +2 ticks) before
computing the ring position — no lag-guessing, the exact RAM-probed
transition ages. Pinned with a new Tier-1 test asserting those ages
directly (`tests/futureSight.test.ts`, 9/9).

**Dense comparator, rerun twice:** `tools/compare/futureSightPortable.ts`
→ **85/114 both times** (up from 75/114). **Per-defect accounting:**
defect B — **10/10 frames fixed** (147, 148, 151, 152, 155, 156, 159,
160, 163, 164 all 0px diff, re-verified with
`future-sight-per-frame-bbox.ts` against the fresh scratch dir). Defect A
— **completely unchanged**: same 29 frames (116-144), identical magnitude
curve. The register instrument that closed B does not explain A (A is a
smooth continuous scale-magnitude curve, not a cadence artifact), so A
was left untouched per this rung's own scope — a clean, not blind, stop.

**Coverage:** `MOVE_FUTURE_SIGHT` stays `partial` in
`ANIMATION_COVERAGE.json` — 85/114, remainder is defect A alone.

**Evidence.** `npm test` 2452/2452 (2451 + 1 new). `npm run build` green.

## MOVE_FUTURE_SIGHT rung 5: both mandated residual hypotheses disproven with hard RAM evidence; the named remainder was incomplete — it's actually two separate defects, stays `partial` (2026-07-25)

**Verdict: no fix landed — this is a negative-evidence session, not a fit.**
The step brief's own precedent (MOVE_GROWTH) said its attacker residual was
neither idle-offset nor asset-decode but a framebuffer-display-lag bug; this
session checked both of that precedent's named hypotheses against
KADABRA/FUTURE_SIGHT in mandated order and **disproved both**, then found the
named residual itself was incomplete. **No source file changed this
session** (`git diff --stat src/` is empty) — every check below ran through
disposable scratch scripts, none promoted since none produced a passing fix.

**(a) Lag-pair bisection** (`tools/compare/scratch/future-sight-lag-bisect-
cached.ts`, reusing an already-populated oracle scratch dir so each recheck
is ~1s, no re-invocation): swept `scaleLag`×`tintLag` over `[0,3]×[0,3]`
against the dense fixture. The already-committed `(2,1)` is the **unique
local optimum across the whole grid** (max 75/114 anywhere) and `tintLag`
has **zero effect** on the match count at any `scaleLag` — blend/tint isn't
the active driver of this residual, and no better lag pair exists. Hypothesis
rejected.

**(b) RAM probe** (`tools/compare/scratch/future-sight-matrix-diag.ts`) —
no new Python probe needed: the fixture's own existing probe
(`tools/probe/run-battle-lab-rgb.py`) already records `playerSprite.matrix`/
`x2`/`y2`/`paletteFaded`/`paletteUnfaded` every frame via `gOamMatrices`, so
this session read that data directly. `x2`/`y2` are pinned at 0 every tick
in the window (no idle-anim rest offset), and the OAM affine matrix is
**RAM-exact against `futureSightAttackerEffectAtAge`'s own UNLAGGED
mechanism at every probed tick (114/114)** — the same clean result GROWTH's
own IVYSAUR VRAM probe found. Idle-offset and asset/decode hypotheses both
rejected.

**Residual re-characterized.** `futureSightPortable.ts`'s own mismatch
report only computes a bbox for the *first* diff frame — a per-frame bbox
sweep (`tools/compare/scratch/future-sight-per-frame-bbox.ts`) over the full
39-frame mismatch range found the prior "confined to the attacker box"
description covers only **29/39** frames (116-144: bbox grows 696px→2013px
peak at frame130→41px, tracking the scale animation's own magnitude — a
real, still-unidentified scale-window residual, RAM-proven not idle-offset/
asset). The other **10/39** (147,148,151,152,155,156,159,160,163,164) are a
**different, much larger defect**: a 17230px bbox spanning nearly the whole
upper screen (0,0-239,111), recurring in an exact 2-on/2-off period-4
pattern matching the psychic BG palette ring's own rotation cadence,
confined to the second (`UnsetPsychicBackground`) fade window — not
attacker-sprite-related at all. Tried the obvious next candidate (extend the
already-proven BG-rotation 1-tick display lag to the `REG_BLDY` darken
read) — this made the whole window sharply **worse** (19/114, not 75/114),
ruling that mechanism out too, not blindly kept.

**Coverage:** `MOVE_FUTURE_SIGHT` stays `partial` in `ANIMATION_COVERAGE.json`
— same 75/114, now split into two named defects instead of one
(incompletely-described) residual.

**Evidence.** `npm test` 2451/2451 (unchanged — no engine code touched).
`npm run build` green.

**Next action for a future session:** RAM-probe `BLDCNT`/`BLDY` at register
granularity around the second fade (defect 2 first — 17230px dwarfs
defect 1's at-most-2013px), then return to defect 1's finer per-tick
timing/magnitude; extend to the opponent-attacker orientation (KADABRA front
sprite extraction, side-uniform per the family map) once both are closed;
re-run `futureSightPortable.ts` to confirm `exact`.

**PAPERCUT:** `futureSightPortable.ts` (and its `growthPortable.ts` sibling)
only report the bbox of the *first* mismatched frame in a dense window, not
a per-frame or window-wide bbox — this cost real time this session
(the true defect shape only surfaced via a bespoke scratch script). Worth a
follow-up: have the shared dense-comparator harness report bbox for every
mismatched frame (or at least the widest one), not just the first.

## `blend_color_cycle` group A extended: enumeration priced CONFUSION/PSYCHIC/FUTURE_SIGHT at 2 net-new components each; MOVE_FUTURE_SIGHT ported (cheapest, attacker-only), lands `partial` — BG swap/rotation exact, attacker-sprite residual named (2026-07-25)

**Verdict: real port, not a fit — but a genuine residual remains, same
class as GROWTH's own history.** Enumeration (30-min phase, MANDATORY
ORDER step 1): read the real scripts for all three group-A siblings
(`battle_anim_scripts.s:4716-4767`) against the already-ported set
(`battle-animation-components.json` + a live check of `src/engine/`).
All three tie at exactly 2 net-new substantive components beyond what's
already proven — `SetPsychicBackground`/`UnsetPsychicBackground`'s own
`AnimTask_SetPsychicBackground` (a BG-palette-2 11-entry ring rotation) plus
its `BG_PSYCHIC` asset. `blend_color_cycle` itself, `AnimTask_ShakeMon`
(proven via `MOVE_FLY`), `AnimTask_ShakeMon2` and `AnimTask_
ScaleMonAndRestore` (both proven via `MOVE_GROWTH`/`MOVE_BIND`), and the
whole `monbg`/`clearmonbg`/`fadetobg`/`restorebg`/`waitbgfadein`/
`waitbgfadeout`/`setalpha`/`blendoff`/`setarg` visual-command family are all
already-ported reuse, verified directly against each move's real
`componentIds` in the graph, not assumed. **MOVE_FUTURE_SIGHT picked as the
cheapest to port**: it's an attacker-only self-effect (`blend_color_cycle` +
`ScaleMonAndRestore` on `ANIM_ATTACKER`, the identical shape to already-exact
`MOVE_GROWTH`) with zero target-side task composition — CONFUSION/PSYCHIC
additionally wire `AnimTask_ShakeMon2`(attacker) + `AnimTask_ShakeMon`
(target) simultaneously with the blend, a real composition risk FUTURE_SIGHT
doesn't carry. Factory-legal at Level 50: `FRONTIER_MON_KADABRA_1`
(`SPECIES_KADABRA`, moves include `FUTURE_SIGHT`) vs `FRONTIER_MON_ONIX`
(already this lane's common fixture opponent).

**RAM-probed first** (`tools/probe/dump-future-sight-psychicbg.py` against a
fresh legal `mechanicLab` fixture, player KADABRA/FUTURE_SIGHT vs opponent
ONIX, oracle ticks 60-200), before any render code: `REG_BLDY`'s two
fade-cover ramps around the BG swap are asymmetric (a 4-tick hold on the
way in, a 5-tick hold on the way out — RAM-probed, not assumed symmetric);
the BG palette 2 rotate-right-by-1-every-4-ticks ring was confirmed
byte-exact against the extracted `psychic.png` palette including the
wraparound entry (entry 11's original color correctly lands in entry 1);
the attacker blend/scale pair's own creation tick is age 37 relative to the
fade's own start tick.

**Ported** as `src/engine/futureSight.ts`, Tier-1-pinned (`tests/
futureSight.test.ts`, 8/8, all values checked directly against the RAM
probe's own output). `BG_PSYCHIC` extracted (`tools/extract/
extract-psychic-bg.ts`, same `indexedPng`/tilemap pipeline as
`MOVE_EXTREME_SPEED`'s `BG_HIGHSPEED` — no compression concern, since the
committed source graphics are plain PNG/bin, not the ROM's own LZ-compiled
bytes). KADABRA's battle back sprite extracted (`extract-battle-mon-pics.ts`,
same dimensions/`yOffset` as HAUNTER's, spriteCorner reused). Wired through
the Scene-ON seam (`sceneOnFutureSightView`, `battleScene.ts`'s
`FUTURE_SIGHT` draw case): psychic-BG-vs-default-BG selection, `REG_BLDY`
darken (reusing the SHADOW_PUNCH/EXTREME_SPEED `gpuDarken` pattern), and the
attacker blend/affine path (reusing GROWTH's own `drawSpriteSheetAffineStretch`
tint/affine seam). A 1-tick display lag on the BG-palette-rotation read was
pixel-confirmed and fixed (same framebuffer-lags-RAM-write class as GROWTH/
BLAZE_KICK); GROWTH's own `(scaleLag=2, tintLag=1)` attacker pair was then
tried on this move's identical blend+scale seam and **partially transfers**
(improved the match count, did not fully resolve it — see below), confirming
the step brief's own caution that per-mechanism lag is not automatically
portable.

**Dense comparator** (`tools/compare/futureSightPortable.ts` + `tools/
compare/fixtures/future-sight-player-kadabra-opponent-onix.json`), one
orientation only (player-back KADABRA → opponent-front ONIX; the family
map's own derivation says the OBJ-row/task arithmetic is side-uniform, so
the opposite orientation is expected to need only a KADABRA front-sprite
extraction, not a new mechanism — not yet staged, so marked `partial` per
this step's own orientation rule), 114-frame window (oracle ticks 77-190,
every frame): **framebuffer 75/114**. The BG swap/rotation/fade, target
ONIX, healthboxes, and message printer are pixel-exact for their own
frames. The remaining 39/114 mismatches are confined to KADABRA's own
attacker sprite box (bbox 44,65-100,111) during the blend/scale window —
the same class of species-specific attacker residual GROWTH itself carried
for a full prior session (which turned out to be a display-lag bug, not an
asset/idle-offset issue) before being promoted to exact. Not RAM-probed
further this session (out of this rung's time budget) — named, not chased
blind, per this run's no-blind-fit policy.

**Coverage:** added `MOVE_FUTURE_SIGHT` to `ANIMATION_COVERAGE.json` as
`partial`.

**Evidence.** `npm test` 2451/2451 (2443 + 8 new `futureSight.test.ts`).
`npm run build` green.

**Next action for a future session:** RAM-probe KADABRA's own attacker-box
residual directly (VRAM/OAM dump at a clean pre-move tick and window ticks,
the `dump-growth-ivysaur-vram.py` precedent) to find whether it's a further
display-lag refinement or a genuine asset/idle-anim gap, then extend to a
second orientation (KADABRA front sprite) and re-run `futureSightPortable.ts`
to confirm `exact`. The `blend_color_cycle` family map's own group B-F
sibling clusters (target-flash, longer-flicker, whole-screen, side-selector,
degenerate-snap) remain untouched, parked in the archived family-map entry.

**Housekeeping:** moved the "blend_color_cycle family map" section (this
same family, its argv survey table stays in the archive for future group
B-F reference) to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention); MOVE_GROWTH's own two most recent entries stay
live alongside this one.

**Housekeeping (this session):** moved MOVE_GROWTH's own "promoted to
exact" entry to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention).

## MOVE_GROWTH promoted to `exact`: last named residual (IVYSAUR attacker salt-and-pepper) was a display-lag bug, not species idle offset or asset decode — both dense windows 63/63, twice each (2026-07-25)

**Verdict: real fix, RAM-probe-first as directed — both suspected classes
from the step brief were checked and disproved with hard evidence before
any code changed; the actual cause was a third class the brief didn't
name.** `tools/probe/dump-growth-ivysaur-vram.py` read IVYSAUR's own
attacker-battler OAM (`x2`/`y2`, tileNum, paletteNum) plus the full VRAM
tile bytes and OBJ palette row (faded + unfaded) at a clean pre-move tick
and window ticks, both orientations: `x2`/`y2` are 0 at every tick (no
idle-anim rest offset — also confirmed from source: `speciesIdleAnim.ts`'s
own doc notes IVYSAUR's front `ANIM_V_STRETCH`/back `ANIM_H_SLIDE` families
both explicitly zero out on completion, unlike ONIX's `RAPID_H_HOPS`, so
the "missing from `SPECIES_FRONT_ANIM_FAMILY`" theory named last session
was never going to explain a residual here), and the extracted
tileset+palette are byte-identical to live VRAM/PLTT (all 64 tiles, all 16
colors, at every probed tick) — ruling out an asset/decode bug too.

**The real cause.** `growthAnimationAtAge`'s own mechanism is RAM-exact
against the live OAM matrix with NO lag (unchanged, still true) — but the
CAPTURED FRAMEBUFFER lags the matrix write, the same class of latency
already documented for BLAZE_KICK ("OAM one frame after the reducer,
palette one more VBlank after that"), except inverted: here the affine
SCALE lags the reducer by 2 ticks and the BLEND TINT lags by only 1.
Bisected empirically (all 9 (scaleLag, tintLag) pairs up to 2, both
fixtures) using the real render pipeline, not a reimplementation — (2, 1)
is the only pair landing 63/63 in both. Fixed in `sceneOnGrowthView`
(`src/engine/sceneOnPresentation.ts`) by reading the scale and tint
components at independently lagged ages. Updated `growthPortable.ts`'s own
component check to compare the RAW (unlagged) mechanism against RAM
directly, since that check's job is verifying `growthAnimationAtAge`'s own
math, not the display-lag presentation choice.

**Dense comparator, both orientations, twice each:** component 63/63,
framebuffer 63/63 — reproduced byte-identical on a second independent run
each. **Coverage: `MOVE_GROWTH` promoted to `exact`.**

**Evidence.** `npm test` 2443/2443 (unchanged — no Tier-1 logic touched,
only the presentation seam and a comparator diagnostic). `npm run build`
green.

## `blend_color_cycle` family map: mechanism decoded, all 28 Level-50 argv surveyed, MOVE_GROWTH recommended as the zero-new-mechanism representative (enumeration only, no port) (2026-07-25)

**Verdict: this is a genuinely bounded, cheap family — smaller than its "28
moves, no exact representative" leaderboard ranking suggests.** The core
per-pixel blend math (`BlendPalette`'s 5-bit formula) is **already ported
and oracle-proven** (`src/engine/paletteFade.ts`'s `blendComponentToward`,
proven via the S4 summary-screen/send-out fades). What's genuinely missing
is (a) the `AnimTask_BlendColorCycle` task state machine and (b) wiring the
battle-anim `selector` bitmask to a battler's OBJ-palette row inside the
Scene-ON move seam — both small, well-specified pieces of work. No code
changes this step per the brief (enumeration only); `MOVE_SHADOW_PUNCH` and
`MOVE_DRAGON_RAGE` untouched (parked).

**1. Mechanism.** `blend_color_cycle`/`blend_color_cycleexclude`/
`blend_color_cyclebytag` (`asm/macros/battle_anim_script.inc:566-576`) each
expand to `createvisualtask AnimTask_BlendColorCycle[Exclude|ByTag], priority,
<selector-or-tag>, delay, num_blends, initial_blend_y, target_blend_y, color`.
All three share one shape (`battle_anim_normal.c:447-646`): a `gTasks[]`
struct (`data[0]`=selector/tag, `[1]`=delay, `[2]`=numBlends, `[3]`=
initialBlendY, `[4]`=targetBlendY, `[5]`=color, `[8]`=restoreBlend toggle)
whose loop function polls `!gPaletteFade.active` and, while `numBlends>0`,
alternates direction: `!restoreBlend` blends `initialBlendY→targetBlendY`;
`restoreBlend` blends back `targetBlendY→initialBlendY`; **when
`numBlends==1` the target is force-overridden to 0 regardless of
direction** (this is why "num_blends=2" reads in the doc comment as "flash
to color and back once" — the final leg always lands back at absolute 0,
not `initialBlendY`, unless they're both 0 already). **Two non-obvious
quirks a naive port would miss:** (i) the very *first* call
(`AnimTask_BlendColorCycle`'s setup, not the loop) hardcodes
`startBlendAmount=0`, ignoring `tInitialBlendY` entirely — so a script that
sets `initial_blend_y=3` (e.g. the old MIST_BALL-adjacent call at
`battle_anim_scripts.s:1903`) still starts its first blend from 0, not 3;
(ii) when `num_blends=1`, only ONE `BeginNormalPaletteFade` call ever
happens (the hardcoded-0-start setup call) — the loop with its
numBlends==1 override never runs a second blend, so `initial_blend_y` is
completely unused/decorative for every `num_blends=1` script (e.g.
`MOVE_SPARK`'s and `MOVE_STOCKPILE`'s calls) — it's not a no-op even when
`initial_blend_y==target_blend_y`, it's a real 0→target snap.

**Palette-selector semantics** (`UnpackSelectedBattlePalettes`,
`battle_anim_normal.c:317-327`, dispatching to `GetBattlePalettesMask`,
`battle_anim_mons.c:1402-1453`): a 7-bit selector, bit0=`F_PAL_BG` (BG
palettes 1-3, mask `0xE`), bit1=`F_PAL_ATTACKER`/bit2=`F_PAL_TARGET`/
bit3=`F_PAL_ATK_PARTNER`/bit4=`F_PAL_DEF_PARTNER` (each sets bit
`16+battlerId` of the 32-bit `selectedPalettes` mask, partner bits gated on
`IsBattlerSpriteVisible`), bit5/6 = BG anim palettes 8/9 (Contest-only in
practice). `F_PAL_ATK_SIDE`=attacker|atkPartner, `F_PAL_DEF_SIDE`=
target|defPartner, `F_PAL_BATTLERS`=all four. `blend_color_cyclebytag`
instead resolves ONE OBJ palette row via `IndexOfSpritePaletteTag`;
`blend_color_cycleexclude` builds the inverse of {attacker,target} across
`gBattlersCount` battlers, plus BG (`0xE`) when its `unk0==1`.

**Ties into the already-solved 5-bit rule exactly, no new derivation
needed.** `BeginNormalPaletteFade` (`palette.c:156-200`) stores the mask/
delay/y/targetY/color into the global `gPaletteFade` struct
(`include/palette.h:35-53`, RAM address `0x2037fd4` per
`docs/battle-scene-notes.md`'s own citation, oracle-confirmed reachable
this session via `bin/oracle symbols gPaletteFade`); `UpdateNormalPaletteFade`
(`palette.c:406-485`) is driven every frame and processes the selector's BG
half (bits 0-15, `paletteOffset` starting at 0) and OBJ half (bits 16-31,
`paletteOffset` starting at `OBJ_PLTT_OFFSET`=256) on **alternating calls**
(`objPaletteToggle`), calling `BlendPalette(paletteOffset, 16, gPaletteFade.y,
blendColor)` per selected 16-entry row — the exact same `BlendPalette`
(`util.c:264`) whose 5-bit `faded5 = c5 + (((target5-c5)*y)>>4)` formula
`src/engine/paletteFade.ts` already implements as `blendComponentToward`
(general form, already proven pixel-exact against S4 fades) — **this
family needs zero new per-pixel math**, only the task-level orchestration
above. Timing: `deltaY` defaults to 2 per y-step; a negative `delay`
(several calls in this family use `delay=-31`) instead sets
`deltaY=2+|delay|` and forces `delay=0` — i.e. a near-instant 33-unit jump
per step (used for `MOVE_SPARK`'s flicker sequence, not a gradual fade). The
BG half is gated on `delayCounter` reaching `delay` (a `delay+1`-frame hold
per step); the OBJ half never waits on `delayCounter`, so **OBJ always lags
BG's `y` by exactly one tick** — the identical `objY(t)===bgY(t-1)`
relationship `paletteFade.ts`'s own module doc already derived for the S4
fades, confirmed here to be the *general* `UpdateNormalPaletteFade`
behavior, not something S4-specific. Each battler's OBJ palette row is
`OBJ_PLTT_OFFSET + battlerId*16` directly from the two functions above
(`GetBattlePalettesMask`'s `1<<(battlerId+16)` bit and
`UpdateNormalPaletteFade`'s `paletteOffset += 16` per bit) — arithmetic, not
inferred, so no RAM probe is needed to establish it, only to confirm no
other engine quirk perturbs it for a specific move.

**2. Per-move argv survey (all 28 Level-50 moves, from the real script
text via `blocks`, not memory):**

| Move | selector | delay | numBlends | initial→target | color |
|---|---|---|---|---|---|
| GROWTH | ATTACKER | 0 | 2 | 0→8 | WHITE |
| CONFUSION | ATTACKER | 0 | 2 | 0→8 | WHITE |
| PSYCHIC | ATTACKER | 0 | 2 | 0→8 | (31,23,0) |
| FUTURE_SIGHT | ATTACKER | 0 | 2 | 0→8 | WHITE |
| FOCUS_ENERGY | ATTACKER | 2 | 2 | 0→11 | WHITE |
| ENDURE | ATTACKER | 2 | 2 | 0→11 | RED |
| CURSE | ATTACKER | 4 | 2 | 0→10 | RED |
| SAFEGUARD | ATK_SIDE | 0 | 2 | 0→10 | WHITE |
| SPITE | ATTACKER | 2 | 6 | 0→8 | WHITE |
| RECOVER | ATTACKER | 0 | 6 | 0→11 | (31,31,11) |
| SYNTHESIS | ATTACKER | 2 | 2 | 0→16 | (27,31,18) |
| REVENGE | ATTACKER | 0 | 4 | 2→8 | RED |
| STOCKPILE | ATTACKER | 8 | **1** | (unused)→12 | WHITE |
| HYPNOSIS | TARGET | 2 | 2 | 0→12 | (31,18,31) |
| PSYBEAM | TARGET | 2 | 2 | 0→12 | (31,18,31) |
| SMOG | TARGET | 2 | 2 | 0→12 | (26,0,26) |
| SLUDGE | TARGET | 1 | 2 | 0→12 | (30,0,31) |
| SLUDGE_BOMB | TARGET | 1 | 2 | 0→12 | (30,0,31) |
| NIGHT_SHADE | TARGET | 0 | 2 | 0→13 | BLACK |
| POISON_FANG | TARGET | 0 | 4 | 0→12 | (26,0,26) |
| PSYWAVE | TARGET | 1 | 4 | 0→12 | (31,18,31) |
| ATTRACT | TARGET | 4 | 4 | 0→10 | (31,25,27) |
| SWEET_SCENT | DEF_SIDE | 1 | 5 | 5→13 | (31,21,21) |
| ACID | DEF_SIDE | 2 | 2 | 0→12 | (30,0,31) |
| SOLAR_BEAM | ATTACKER | 1 | 4 | 0→11 | (31,31,11) |
| REVERSAL | BG\|BATTLERS | 3 | 2 | 0→10 | WHITE |
| BATON_PASS | BG\|BATTLERS | 1 | 2 | 0→11 | (31,22,30) |
| SPARK | BG\|ATTACKER, then TARGET (7 calls) | **-31** (×6), then -31 | **1**×6, then 2 | 5→5, 0→0, 5→5, 0→0, 7→7, 0→0, then 0→6 | (31,31,22) |

Groups (batch-check siblings once one member is proven): **(A) self-flash,
`ATTACKER`/`delay=0`/`numBlends=2`/`target=8`** — GROWTH, CONFUSION,
PSYCHIC, FUTURE_SIGHT (near-identical, color the only variable) — the
cheapest cluster. **(B) target-flash, `TARGET`/`numBlends=2`/`target≈12`**
— HYPNOSIS, PSYBEAM, SMOG, SLUDGE, SLUDGE_BOMB, NIGHT_SHADE (6 moves).
**(C) longer flicker, `numBlends=4`** — SOLAR_BEAM, PSYWAVE, ATTRACT,
REVENGE, POISON_FANG. **(D) whole-screen `BG|BATTLERS`** — REVERSAL,
BATON_PASS (drives BG + all 4 battlers' OBJ rows at once — more surface
area, do after (A)). **(E) side selectors** — SAFEGUARD (`ATK_SIDE`),
SWEET_SCENT/ACID (`DEF_SIDE`) — singles-legal (partner bit contributes
nothing without a partner sprite). **(F) `numBlends=1` degenerate snap** —
STOCKPILE, and SPARK's 6 `-31`-delay legs — exercises the "initialBlendY
unused" quirk above; do these only after (A) is proven, as a targeted
quirk check, not a first representative. Every one of the 28 also carries
`monbg`/`clearmonbg`/`fadetobg`/`restorebg`/`waitbgfadein`/`splitbgprio`-family
visual commands already proven exact (`MOVE_EXTREME_SPEED` et al.) or a
per-move task (`AnimTask_ShakeMon2`, `AnimTask_ScaleMonAndRestore`, both
already proven — see below).

**3. Representative recommendation: `MOVE_GROWTH`.** Its script
(`battle_anim_scripts.s:2020-2030`) is `call GrowthEffect` ×2 (self-buff,
no branches) into a 4-line subroutine: `blend_color_cycle` (group A
above), `playsewithpan` (audio, untracked), `createvisualtask
AnimTask_ScaleMonAndRestore, 5, -3, -3, 16, ANIM_ATTACKER, 0`. Cross-checked
against the component graph: `AnimTask_ScaleMonAndRestore` is **already
proven** — `MOVE_BIND` (exact) calls the identical task
(`battle_anim_scripts.s:7126`, ported in `src/engine/bind.ts`) — and the
extractor already resolves the `call`/`return` subroutine shape correctly
(`GrowthEffect` appears as a real block in `MOVE_GROWTH`'s `blocks`, no
decode-extension needed). The only genuinely new mechanism GROWTH needs is
`blend_color_cycle` itself — **zero other unported components**, the
single cheapest move in the whole family (every other move needs at least
one net-new task: `MOVE_NIGHT_SHADE`→`AnimTask_NightShadeClone`,
`MOVE_SPITE`→`AnimTask_SpiteTargetShadow`, both real one-off sprite/shadow
tasks, not wrapper artifacts). **Factory-legal at Level 50:**
`FRONTIER_MON_IVYSAUR_1` (`SPECIES_IVYSAUR`, moves `{PETAL_DANCE, GROWTH,
SWEET_SCENT, FURY_CUTTER}`) and `FRONTIER_MON_SUNFLORA_2` (`{GIGA_DRAIN,
GRASS_WHISTLE, GROWTH, DOUBLE_TEAM}`), both in
`src/data/gen/battle-frontier-mons.json`. Recommend IVYSAUR (a fresh
species this lane hasn't fixtured, unlike ONIX/HAUNTER) paired against an
already-common fixture opponent (ONIX) for wiring consistency with other
`mechanicLab overrides.parties` staged traces.

**Staging fixture shape:** a `mechanicLab overrides.parties` trace, IVYSAUR
(GROWTH first slot) vs a stock opposing mon, single dense window starting
at the move-selection tick through `waitforvisualfinish`/`end`; test both
attacker-side orientations only if the RAM probe (next) shows the
battler→OBJ-row arithmetic isn't already uniform in this engine (it should
be, per the direct-from-source derivation above — no evidence of an
orientation dependency was found this session, so start with one side).

**RAM signals a probe should capture** (the `gPlttBufferFaded`-read
precedent, `docs/battle-scene-notes.md` §7.5-style): per tick, (a)
`gPaletteFade` at `0x2037fd4` — `active`, `y`, `targetY`, `delayCounter`,
`objPaletteToggle`, `deltaY` (bitfield layout in `include/palette.h:35-53`;
`multipurpose1` is a leading `u32`, so the bitfields start at byte offset
4) to nail the BG/OBJ alternation parity directly instead of pixel-inverting
it; (b) `gPlttBufferFaded[256 + attackerBattlerId*16 .. +15]` (IVYSAUR's own
OBJ palette row) across the flash-and-back window, cross-checked against
the group-A argv table above (target_blend_y=8, WHITE) — a clean,
sprite-owned 16-entry row, not a shared/background sample, so no
contamination risk unlike the S4 background-swatch technique. `bin/oracle
--profile battle-scene-on symbols gPaletteFade` confirmed the address
resolves against the live oracle this session.

**4. Decode extension:** not needed. `GrowthEffect`'s `call`/`return` shape
is already correctly resolved by the extractor (verified directly above),
and the argv survey required no other extractor change — this step made
no code changes, per its own enumeration-only scope.

**Not done (explicitly out of scope this step):** no RAM probe run, no
engine code, no `ANIMATION_COVERAGE.json`/fixture changes. `MOVE_SHADOW_PUNCH`
and `MOVE_DRAGON_RAGE` untouched (parked, per this step's brief).

**Evidence.** `npm test` 2222/2222 (unchanged — no logic touched). `npm run
build` green. Enumeration cross-checked against
`src/data/gen/battle-animation-components.json`,
`src/data/gen/battle-frontier-mons.json`, and a live oracle `symbols` call;
all move/component/argv claims above are generated directly from the
committed JSON + real script/source text (scripts in `/tmp`, not
committed — this ledger carries the durable output).

## BG-swap pipeline (restorebg/waitbgfadein/waitbgfadeout): assigned premise dissolved by a real extractor bug, not a port — MOVE_EXTREME_SPEED is already the exact representative; MIST_BALL's fog needs a different, still-open mechanism (2026-07-25)

**Verdict: the step's own goal — "open the top component family with NO
exact representative" — turned out to rest on a tooling bug, not a missing
port. Fixed the bug (real, tested, committed); the family now correctly
shows an exact representative that was always there. No new engine code
lands this step; the corrected enumeration plus a precisely-scoped next
representative (`MOVE_SHADOW_PUNCH`) is the deliverable, matching the step
brief's own STOP THRESHOLD sanction ("a precise map... is itself the
deliverable").**

**The bug.** `tools/extract/extract-battle-animation-components.ts`'s
`controlCommands` set spelled the two conditional-jump opcodes
`"jumretfalse"`/`"jumrettrue"` — missing the `p` — against the real macro
names `jumpretfalse`/`jumprettrue`
(`reference/pokeemerald/asm/macros/battle_anim_script.inc:275-284`). Since
neither string ever matched, `referencedBlocks()` never followed either
branch, so any script block reachable ONLY through one of these two jumps
was silently dropped from that move's `componentIds` — undercounting, not
overcounting, so the leaderboard's "no exact representative" claims were
false positives, not false negatives. 21 real uses of these two opcodes
exist in `battle_anim_scripts.s`. Fixed the typo, re-ran the extractor
(`--out` byte-identical-reproducibility test still green) and the
downstream `extract-level50-move-parameterization.ts` (joins on this
file). **12 moves gained real, previously-hidden components** (935→971
total components, 3190→3269 dependency edges); the pinned summary counts
in `tests/factoryAnimationComponents.test.ts` were updated to match.

**The one that matters: `MOVE_EXTREME_SPEED`.** Its script
(`battle_anim_scripts.s:3392-3434`) branches on
`jumprettrue ExtremeSpeedAgainstPlayer` before reaching `ExtremeSpeedContinue:`
— the label holding `waitbgfadeout`, `createvisualtask
AnimTask_StartSlidingBg`, `waitbgfadein`, and (after the move body) the
exact `restorebg` / `waitbgfadeout` / `setarg` / `waitbgfadein` closing
sequence. All of that was invisible to the graph before this fix.
EXTREME_SPEED is already `exact` in `ANIMATION_COVERAGE.json`, and its own
coverage note already lists "the opening and restore display latches" and
"BG_HIGHSPEED_{PLAYER,OPPONENT} selection" as dense-verified — i.e. this
move's hand-fit `src/engine/extremeSpeed.ts`
(`extremeSpeedBackgroundAtAge`) already implements and pixel-proves the
whole fade-out/BG-load/fade-in/hold/restore-fade-out/restore-fade-in cycle.
The corrected graph now shows `MOVE_EXTREME_SPEED` with **zero** unproven
components among the restorebg family. Re-running
`npm run animation:coverage` confirms the effect directly: `restorebg`,
`waitbgfadein`, `waitbgfadeout`, `fadetobg`, and `setarg` no longer appear
anywhere in the "components without an exact representative" leaderboard
(replaced by an unrelated set: `blend_color_cycle` 28,
`gHorizontalLungeSpriteTemplate` 19, `AnimTask_ShakeMonInPlace` 14,
`ANIM_TAG_BLUE_STAR`/`gHealingBlueStarSpriteTemplate` 11 each,
`UnsetPsychicBackground` 11).

**Real C-source enumeration of the pipeline** (full read of
`reference/pokeemerald/src/battle_anim.c`, this step's own rung-2
requirement, done via research pass before the bug was found — still the
correct map):
- `Cmd_monbg`/`Cmd_clearmonbg` (`battle_anim.c:591-911`,
  `Task_InitUpdateMonBg`/`Task_UpdateMonBg`/`Task_ClearMonBg`) — paints a
  battler sprite onto a BG layer and tracks it per-frame. **Already fully
  proven**, unrelated to this bug (124+ exact-proved moves).
- `Cmd_blendoff` (`:1036-1041`) — zeroes `BLDCNT`/`BLDALPHA` directly, no
  task. Already proven.
- `Cmd_setarg` (`:1055-1071`) — pure script-parser write to
  `gBattleAnimArgs[argId]`, no BG/task interaction.
- `Cmd_fadetobg`/`Cmd_fadetobgfromset`/`Cmd_restorebg`/`Task_FadeToBg`
  (`:1110-1228`) — the real new subsystem. `Task_FadeToBg` is a 4-state
  machine: fade to black via `BeginHardwarePaletteFade(0xE8,0,0,16,0)`
  (state 0) → while `gPaletteFade.active`, wait → load the new BG
  (`LoadMoveBg(bgId)` or, for `restorebg`'s `bgId=-1` sentinel,
  `LoadDefaultBg()`/`DrawMainBattleBackground()` — **`restorebg` does NOT
  snapshot/restore prior state; it recomputes the map's default BG from
  scratch**, state 2) → fade back in (state 2 continued) → wait, then
  destroy the task (state 3). A single flat `sAnimBackgroundFadeState`
  global (0/1/2) is what `Cmd_waitbgfadeout`/`Cmd_waitbgfadein` poll — not
  a per-task counter.
- `Cmd_waitbgfadeout`/`Cmd_waitbgfadein` (`:1230-1254`) — the two poll
  points on that global.
- `Cmd_changebg` (`:1256-1261`) — synchronous BG swap, no fade, no task.
- `gBattleAnimBackgroundTable[]` (`src/data/battle_anim.h:1596-1625`) is a
  flat `{image,palette,tilemap}` LZ77-pointer table keyed by bg-id
  (`BG_GHOST`=2, `BG_HIGHSPEED_OPPONENT`=9, `BG_HIGHSPEED_PLAYER`=10, etc,
  `include/constants/battle_anim.h:330-338`); `Cmd_monbg`/`Cmd_clearmonbg`
  never touch it — the two pipelines are independent and composable.

Independently, this exact hardware-fade ramp shape (1 BLDY unit per tick,
fade out / hold / fade in / later restore-fade-out / restore-fade-in) is
already hand-derived and pixel-pinned **twice**, completely independently:
`extremeSpeed.ts`'s `extremeSpeedBackgroundAtAge` and `faintAttack.ts`'s own
bldy ramp. Both match the same `BeginHardwarePaletteFade` shape. This is
strong cross-evidence that a shared, parametric module (`durationTicks`
fixed at 16 per `BeginHardwarePaletteFade`'s own literal argument, per-move
start-tick probed) would generalize cleanly — **not attempted this step**
(refactoring two already-exact/partial moves' code carried needless
regression risk against this step's remaining time budget; left as a
bounded, low-risk follow-up, not a new derivation).

**This was never actually MIST_BALL's blocker.** Re-read
`Move_MIST_BALL`'s real script (`battle_anim_scripts.s`, printed directly,
not from memory) end to end: it contains no `restorebg`, `monbg`,
`fadetobg`, `clearmonbg`, `waitbgfadein`, or `waitbgfadeout` anywhere.
`AnimTask_MistBallFog` (`battle_anim_ice.c:1097-1170+`) is a **separate**
mechanism — a task that loads its OWN BG1 tile/tilemap/palette trio
(`gWeatherFogHorizontalTiles`/`gBattleAnimFogTilemap`/`gFogPalette`) and
drives `BLDCNT`/`BLDALPHA` through its own 4-phase state machine directly,
never going through `Cmd_fadetobg`/`Task_FadeToBg` at all. The step brief's
framing conflated the two because both are "background" mechanisms in the
loose sense; they share no code. MIST_BALL's real remaining blockers are
unchanged from the archived rung-3 session: `waitforvisualfinish`
sprite-lifetime tracking, `AnimComplexPaletteBlend` (whole-palette-set
blend gated on `gPaletteFade.active`), `AnimTask_MistBallFog`'s own BG1
pipeline (a genuinely new subsystem, untouched by this step), and
generalizing `AnimTask_BlendBattleAnimPal` past its one DRAGON_BREATH
instance.

**Named next representative for whoever continues this family** (now a
small, well-bounded task, not a new-subsystem port): `MOVE_SHADOW_PUNCH`.
Its script (`battle_anim_scripts.s:4308-4327`) is fully linear — no
branches, so its extracted component list was already accurate before this
fix — and Factory-legal at Level 50 via `FRONTIER_MON_HAUNTER_1`
(`SPECIES_HAUNTER`, moves `{SHADOW_PUNCH, CONFUSE_RAY, SPITE, GRUDGE}` —
its whole kit sits in this family,
`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:1256-1262`).
Post-fix, its only unproven component is `task:AnimTask_AttackerPunchWithTrace`
— every other component (`fadetobg`, `waitbgfadein`, `monbg`, `setalpha`,
`clearmonbg`, `blendoff`, `restorebg`, `create_basic_hitsplat_sprite`,
`create_fist_sprite`, `ANIM_TAG_HANDS_AND_FEET`, `ANIM_TAG_IMPACT`,
`AnimTask_ShakeMon`) is already proven by FIRE_PUNCH/ICE_PUNCH/
THUNDER_PUNCH/EXTREME_SPEED. `AnimTask_AttackerPunchWithTrace`
(`battle_anim_mons.c:2392-2496`) is a sprite-clone "afterimage/trace"
effect (not shake, not palette-flash): attacker slides ±8px out over 5
ticks then back over 5, spawning one blended-palette clone sprite per tick
that self-destructs after 8 ticks, then waits for all clones to expire.
Not ported this step — no RAM probe run, no code written; named here as
the concrete next rung (probe HAUNTER's own battler sprite + the clone
slots via a `mechanicLab overrides.parties` fixture, port the trace effect,
generalize the fade-ramp module out of `extremeSpeed.ts`/`faintAttack.ts`,
wire through the Scene-ON seam, dense window both orientations twice).

**Evidence.** `npm test` 2212/2212 (unchanged count — this step's fix is a
reattribution, not new logic; the one touched test updates a byte-count
pin to the corrected, re-verified extraction). `npm run build` green.

## SHADOW_PUNCH lands `partial` (third session): fixed a cap-kill's broken mid-rework, wired the attacker framebuffer lag, 84/111 + 0/111 across the two orientations — two named in-scope pixel families plus a materially different, unattributed opponent-orientation bug (2026-07-25)

**Verdict: parked, not landed. This was the third and final scheduled session on
this move's dense acceptance; per the step brief a documented resting state is
the required outcome, not a completed pass. The player-attacker orientation is
close (84/111 framebuffer, all component math exact); the opponent-attacker
orientation is not (0/111, plus a real component-level bug) and needs its own
fresh probe next time — do not assume anything found here transfers.**

**Start-of-session state was a broken build**, inherited from the second
cap-killed session's salvaged mid-rework (tip commit `7200300`): `battleScene.ts`'s
SHADOW_PUNCH draw case referenced `attackerView` in the clone/attacker draw
calls but never defined it — `tsc -b` failed with `Cannot find name
'attackerView'` (confirmed by running the build before touching anything).
`npm test` still reported green only because vitest's transform doesn't
type-check and no Tier-1 test exercises this render path.

**Fix.** Defined `attackerView` right after the existing unlagged `view`,
mirroring DRAGON_RAGE's own phase-aware-view precedent
(`battleScene.ts:17033-17063`): `sceneOnShadowPunchView({ ...state, age:
state.age - SHADOW_PUNCH_ATTACKER_FRAMEBUFFER_LAG })`, scoped to only the
attacker/clone draw calls per the constant's own doc comment (already
committed by the prior session with a lag value of 3). `npx tsc -b` clean
after the fix.

**Bisected the lag constant itself before trusting it further.** Since the
comparator's own component check (`view` computed at *raw*, unlagged age)
already matches oracle RAM reads at 111/111 for every dense tick, a nonzero
framebuffer lag was not obviously justified. Swept
`SHADOW_PUNCH_ATTACKER_FRAMEBUFFER_LAG` through 0/1/2/4 against the
player-attacker fixture: all four values produced a byte-identical 84/111 —
lag in this small range has **zero effect** on this fixture's remaining
mismatches (lag=20 does move the count, and only for the worse, confirming
the mechanism works but isn't the active variable here). Kept the
prior session's committed value (3) since it's harmless and its own doc
cites a direct RAM-pixel justification from a narrower comparison this
session didn't re-run; the remaining mismatches below are a different bug
class entirely.

**Ran both dense comparators** (`npx tsx tools/compare/shadowPunchPortable.ts
<fixture>`, both fixtures under `tools/compare/fixtures/shadow-punch-*.json`)
and attributed every remaining mismatch by mismatch-string/bbox before
touching code further (no blind fits attempted).

**Player-attacker orientation (`shadow-punch-player-haunter-opponent-onix.json`):
component 111/111, framebuffer 84/111.** Three disjoint mismatch families,
all named in `ANIMATION_COVERAGE.json`'s new entry with exact px counts and
bboxes:
1. Frames 126-133 (render ages 41-48): attacker/clone punch-trace region
   (bbox ~x41-131,y64-111) — a real color-level bug, not timing (see the
   lag bisection above). Likely a clone paint-order or blend-coefficient
   issue, same class as DRAGON_RAGE's own fire-plume z-order residual —
   next step should be a `gMain.oamBuffer` RAM read of the live clone stack
   (`dump-dragonrage-oam.py`'s own precedent), not another lag guess.
2. Frames 134-147 (render ages 49-62): top-of-screen region reaching
   x177-206,y12-71 — plausibly the hitsplat/fist reused
   `TURN9_HITSPLAT_MATRIX` affine-stretch schedule not matching this move's
   own anchor ages. Not root-caused this session.
3. Frames 191-195 (render ages 106-110): a large near-white region covering
   most of the screen — this is the generic post-move **result/message
   textbox** appearing, an out-of-scope reusable presentation component per
   this lane's own acceptance rule (it neither blocks nor promotes a move).
   The fixture's own `denseWindow.endFrame` (195) should be trimmed to
   exclude this tail next session rather than carried as a required
   remainder.

**Opponent-attacker orientation (`shadow-punch-opponent-haunter-player-onix.json`):
component 95/111, framebuffer 0/111 — materially worse, a different problem.**
Component mismatches are a genuine BLDY-ramp one-tick drift starting ~frame
172 (oracle's own `bldy` decrements one tick ahead of this codebase's table
— an orientation-specific timing bug with zero counterpart on the
player-attacker side, where BLDY matched exactly). Framebuffer is a total
loss: every single dense frame mismatches, dominated by a persistent
~1590px region from frame 89 in the attacker-side bbox x151-201,y14-71
whose fading-gradient signature suggests the player-attacker fixture's own
lag=3 does not transfer to this orientation. Not root-caused this session —
needs its own dedicated RAM-pixel probe rather than reused player-attacker
assumptions; a reasonable first candidate is re-checking the
`x2 -= tBattlerSpriteId` quirk's sign for the opponent-side attacker slot.

**Coverage:** added `MOVE_SHADOW_PUNCH` to `ANIMATION_COVERAGE.json` as
`partial` (19 exact / **3 partial** / 254 unsupported) — a meaningful dense
window (84/111, all component math exact) is green in one orientation, but
both a real in-scope remainder and an unattempted-clean second orientation
remain, so `exact` is not honest. `covered`/`remaining` carry the full
per-family breakdown above with px counts so the next session can resume
a probe cycle without re-deriving it.

**Evidence.** `npm test` 2222/2222 (one pinned coverage-summary count
updated to match the new partial entry). `npm run build` green.

- **State:** **19 exact / 3 partial / 254 unsupported.** (This
  step — SHADOW_PUNCH now has a `partial` entry; DRAGON_RAGE stays
  CLOSED/parked at 149/150 `partial`, not touched this step.)
- **Did:** Third and final scheduled session on `MOVE_SHADOW_PUNCH`'s dense
  acceptance. Found the build broken at session start (the second
  cap-killed session's salvaged mid-rework left `battleScene.ts` referencing
  an undefined `attackerView`) and fixed it by defining the missing
  phase-aware lagged view, mirroring DRAGON_RAGE's own precedent. Bisected
  `SHADOW_PUNCH_ATTACKER_FRAMEBUFFER_LAG` (0/1/2/4) and found it has zero
  effect on the remaining player-attacker mismatches — ruling out timing as
  the cause of that family before investigating further. Ran both dense
  comparators and attributed every remaining mismatch by mismatch-string/
  bbox: player-attacker orientation lands 111/111 component, 84/111
  framebuffer (two in-scope named families + one out-of-scope generic
  message-textbox tail); opponent-attacker orientation is materially worse
  and a different problem (95/111 component — a new BLDY one-tick drift —
  and 0/111 framebuffer), not root-caused this session. Added
  `MOVE_SHADOW_PUNCH` to `ANIMATION_COVERAGE.json` as `partial`.
- **Evidence:** `npm test` 2222/2222, `npm run build` green.
- **Next:** Player-attacker orientation needs a `gMain.oamBuffer` RAM probe
  of the live clone stack (frames 126-133, DRAGON_RAGE fire-plume
  precedent) and a look at the hitsplat/fist affine-stretch schedule
  (frames 134-147); trim the fixture's `denseWindow.endFrame` (195) to
  exclude the out-of-scope message-textbox tail (frames 191-195).
  Opponent-attacker orientation needs its own fresh RAM-pixel probe (do not
  reuse player-attacker fixes) starting from the BLDY one-tick drift and
  the `x2 -= tBattlerSpriteId` sign for the opponent-side attacker slot.
  See `ANIMATION_COVERAGE.json`'s `MOVE_SHADOW_PUNCH.remaining` for the full
  per-family px-count breakdown. MIST_BALL's own remaining blockers are
  unchanged and still open: `waitforvisualfinish` sprite-lifetime tracking,
  `AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s own BG1 pipeline (a
  genuinely new subsystem), and generalizing `AnimTask_BlendBattleAnimPal`
  past its one DRAGON_BREATH instance. The `dragon-fire-projectile`
  siblings FIRE_BLAST and FIRE_SPIN also remain open (FIRE_BLAST's own real
  surface is `SoundTask_FireBlast` + `gFireBlastCrossSpriteTemplate`/
  `gFireBlastRingSpriteTemplate` sprites). `blend_color_cycle` (28 Level-50
  moves, the current top no-representative family) is still unenumerated.
- **Housekeeping:** moved the prior "SHADOW_PUNCH RAM-probed and ported"
  dated section to `ANIMATION_PROGRESS-archive.md` (superseded by this
  session's own section) to keep ~3 live (AGENTS.md's convention);
  DRAGON_RAGE's own "rung 6/7" and the BG-swap-pipeline dissolution section
  stay live alongside this one.

## SHADOW_PUNCH: `AnimTask_AttackerPunchWithTrace` RAM-probed and ported (shadowPunch.ts), Scene-ON wiring + dense comparators NOT done this step (2026-07-25)

**Verdict: the move's one unproven component is now a Tier-1-pinned, RAM-
proven port; the render-seam wiring and dense pixel acceptance the step
brief asked for did not fit in this session's remaining budget after the
probe. No coverage entry added — per this lane's own rule, code alone
(even RAM-proven code) never promotes a move's status. Honest partial, not
a blind fit: everything shipped is either read straight from RAM or reused
verbatim from an already-exact-proven sibling.**

**Extractor decode.** `Move_SHADOW_PUNCH` (`battle_anim_scripts.s:4308-
4327`) decoded into `battle-move-anim-scripts.json` (additive; the
byte-identical-reproducibility test and `factoryAnimationComponents.test.ts`
stayed green). Confirmed the script is exactly as the prior session
scoped it: linear, every op except `createvisualtask
AnimTask_AttackerPunchWithTrace` already proven by FIRE_PUNCH/ICE_PUNCH/
THUNDER_PUNCH/EXTREME_SPEED.

**Assets.** HAUNTER front+back sprites added to `extract-battle-mon-pics.ts`
(mirrors the CHARMELEON precedent). `BG_GHOST` (tile/palette/tilemap,
`fadetobg`'s own new bg id — a single tilemap, unlike EXTREME_SPEED's
side-selected pair) extracted fresh (`extract-shadow-punch-assets.ts`).

**RAM probe (`tools/probe/dump-shadowpunch-full.py`), both attacker
orientations** (staged `FRONTIER_MON_HAUNTER_1`-vs-ONIX via `mechanicLab
overrides.parties`, `tools/battle-lab/mechanic-shadow-punch-{haunter-onix,
onix-haunter}.json`). Found the real mechanism precisely, corrected one
citation error along the way (the task is `battle_anim_mons.c:2392-2496`,
not `battle_anim_fight.c` as the prior session's scoping note said —
confirmed directly via `nm` against the pinned elf, not assumed):

- The task slides the attacker's own sprite `x2` out over 5 ticks then back
  over 4 (genuinely asymmetric — the source's own "do same number of traces
  as before" comment doesn't match its actual `tCounter` bookkeeping),
  spawning one darkened(`BlendPalette` coeff 13 toward `RGB_BLACK`) +
  translucent (`CloneBattlerSpriteWithBlend` sets `ST_OAM_OBJ_BLEND`,
  `setalpha 9,8`) afterimage clone per tick — 9 total, each self-destroying
  exactly 8 ticks after its own creation.
- A real vanilla artifact, confirmed on hardware, not a bug: task setup runs
  `gSprites[attacker].x2 -= tBattlerSpriteId` — subtracting the attacker's
  own SPRITE SLOT INDEX (6-8 in the probed fixtures) from `x2` as if it were
  a pixel offset, applied once and never undone. RAM-confirmed directly
  (both orientations) that this offset is baked into every attacker/clone
  position for the task's whole life.
- `tMoveSpeed` is +8 player-side, -8 opponent-side (`GetBattlerSide`);
  `tPriority` is 2 when the attacker's own subpriority is 20 or 40, else 3 —
  RAM-confirmed both ways (player-side battler-0 subpriority 30 → priority
  3; opponent-side battler-0 subpriority 40 → priority 2).
- Derived a closed form for the whole attacker-offset/clone schedule (no
  lookup table needed — verified against every probed tick both
  orientations, see `shadowPunch.ts`'s own module doc for the formula).
- The move's own `fadetobg`/`restorebg` `BLDY` timeline (mechanism already
  exact-proven via MOVE_EXTREME_SPEED — only this move's own timing anchors
  are new) came back clean and RAM-exact except a genuine 3-tick startup
  hold at `bldy=1` on the `restorebg` ramp only (plausibly `Task_FadeToBg`'s
  own state-2 "recompute the default BG from scratch" costing extra setup
  frames) — encoded as a literal per-tick table rather than fit, since the
  window is short and the anomaly doesn't reduce to a clean formula.
- Fist/hitsplat/target-shake anchor ages read directly off RAM; the target
  shake reuses the already-ported `shakeMon.ts` primitive verbatim
  (`AnimTask_ShakeMon, ANIM_TARGET, 3, 0, 6, 1`).

**Port.** `src/engine/shadowPunch.ts` — the attacker-offset/clone closed
form, the BLDY table, and every anchor age above. `tests/shadowPunch.test.ts`
pins the closed form against every RAM-probed tick (ages 0-16) for BOTH
orientations, plus the BLDY table and the priority rule — 6 new tests, all
green.

**NOT done this step — the named remainder.** Wiring `shadowPunch.ts`
through the Scene-ON render seam (`battleScene.ts`'s
`state.config.move === "SHADOW_PUNCH"` dispatch + a `sceneOnShadowPunchView`
projection in `sceneOnPresentation.ts`, mirroring the DRAGON_RAGE/
EXTREME_SPEED precedent — healthbox/message-text draw calls are fully
generic (`composeOpponentHealthbox`/`composePlayerHealthbox` take a plain
`name: string`, no species union to extend) and the translucent-clone draw
call already exists verbatim (`drawSpriteSheetBlendedOverFb`, QUICK_ATTACK's
own precedent) — and the dense pixel comparators (both orientations, twice
each) the step brief requires for any coverage claim. Ran out of session
budget after the RAM-probe-and-port stage; stopping here with a clean,
tested port is the honest outcome rather than rushing the wiring
uncomparatored. `blend_color_cycle`'s stretch enumeration (this step's own
"only if 1-4 land with ≥10 min spare" clause) was not reached either, since
1-4 themselves didn't land.

**Coverage:** no entry added for `MOVE_SHADOW_PUNCH` — no dense pixel
evidence exists yet, so per this lane's own rule ("shared code alone never
promotes coverage") it stays unsupported in `ANIMATION_COVERAGE.json`.

**Evidence.** `npm test` 2218/2218 (2212 + 6 new). `npm run build` green.
Both RAM probes reproducible (`/tmp/shadowpunch-{haunter-onix,onix-haunter}.
json`, not committed — scratch).

## DRAGON_RAGE rungs 1-3: render-age-1 guard fixed, fire-spit sheetFrame off-by-one root-caused from source, fire-plume window disciplined-probed but not resolved — 127/150 → 139/150, stays `partial` (2026-07-25)

**Verdict: two of the three named residuals fixed on hard evidence (one of
them overturning the prior rung's own "rounding question" hypothesis); the
third (fire-plume) got a genuine disciplined probe cycle — colors dumped,
RAM read, two candidate fixes tried and both rejected on evidence — but no
fix survived, so it stays named, not swept. `MOVE_DRAGON_RAGE` stays
`partial`, a strictly smaller remainder than last rung's.**

**Rung 1 — render-age-1 creation-guard artifact, fixed.** Pixel-dumped
frame 90 (render age 1) of the player-attacker dense window directly: the
oracle photo already shows the attacker's `AnimTask_ShakeMon` offset
applied one tick before the lag-2 model's own `renderTick < creationTick`
guard clears — a shifted-tileset color map confirmed the two images agree
everywhere except a small silhouette region matching exactly a 2px
`yOffset` shake state the app predicts as zero. `shakeMonOffsetAtRenderTick`
now special-cases `renderTick === creationTick - 1` to return the raw
`{xOffset,yOffset}` (the RAM-invisible collapsed `sequence[0]` write,
framebuffer-visible for exactly that one transient tick) instead of zero;
every other pre-creation tick is unaffected. Tier-1 pinned
(`tests/dragonRage.test.ts`).

**Rung 2 — fire-spit "rounding" residual, root-caused as a real bug, not a
rounding question.** Per the step brief's own probe-first method,
pixel-dumped the render-age-86-96 diff colors *first*: they were genuine
small-ember fire-ramp colors, but the oracle's true fire-spit silhouette
was consistently LARGER than the app's, correlated with WHICH of the 3
animation frames was active (frame 0 undercounted ~5x, frame 2
overcounted) — a shape signature, not a rounding/timing one, so the step
brief's own "further `drawSpriteSheetAffineRotate` rounding question"
hypothesis is falsified and recorded as eliminated. Source proof
(`reference/pokeemerald/src/battle_anim_dragon.c:126-131`):
`sAnim_DragonRageFire` is `ANIMCMD_FRAME(16,3),(32,3),(48,3),JUMP(0)` —
byte-identical tile offsets to `sAnim_DragonBreathFire_0` (`:47-52`), the
already-pixel-exact DRAGON_BREATH precedent, which `dragonBreath.ts`
already reads with a `+1` tile-row-block shift (RAM's own `animCmdIndex` is
an index into the 3-entry ANIMCMD array, not a tile-row-block number — tile
offsets 16/32/48 are blocks 1/2/3, block 0 belongs to a different animation,
`sAnim_OutrageOverheatFire_0`). `dragonRage.ts`'s own `sheetFrame` formula
was missing that shift, silently picking the wrong, unused-by-this-
animation tile block for frame 0. Fixed the formula and the two Tier-1
assertions that had pinned the old (wrong) `sheetFrame === animCmdIndex`
equality to the source-justified `animCmdIndex + 1`; fire-plume's own
`sheetFrame` is untouched (its own animcmd table legitimately starts at
tile 0, a separate asset). Dense sweep: every render age 86-96 frame now
matches, zero regressions.

**Rung 3 — fire-plume window (render ages 98, 105-114): disciplined-probed,
not resolved, negative results recorded.** Two sub-cases, investigated
independently:

- **Render age 98** (the exact tick both the target `AnimTask_ShakeMon` and
  fire-plume spawn 0 are created): a 1598px mismatch confined exactly to
  ONIX's own sprite box, using ONIX's own grayscale palette — NOT
  plume-palette colors (the step brief's own hypothesis for this family,
  checked directly and not confirmed). RAM-probed the target sprite's full
  state (position, x2/y2, animNum, animCmdIndex, invisible, subpriority,
  matrixNum) across the surrounding ticks: all clean and unchanged, so the
  mismatch isn't explained by any currently-modeled variable. Confirmed
  deterministic (byte-identical mismatch on a second, independent fresh
  oracle run). Not root-caused.
- **Render ages 105-114** (10 frames, 1px each): confirmed via direct pixel
  reconstruction (manually sampling each candidate spawn's own tileset at
  its RAM-read position/frame) to be a real tie-break bug between two
  overlapping same-subpriority fire-plume spawns — but not a single-knob
  fix. Reversing the paint order within each subpriority group fixes the
  105-113 overlap (spawn 0 vs spawn 1) but breaks a *different*,
  previously-clean overlap at render ages 114-118/123 (spawn 1 vs spawn 4) —
  tried, net smaller improvement, reverted, not shipped. A uniform
  fire-plume lag of 0 was also tried (ages 98-144 regress hard, 112/150,
  much worse) and rejected; lag 1 stays committed. The age-114 case further
  shows spawn 1's own rendered sheet frame sits one step behind what the
  uniform 1-tick lag model predicts at its OWN specific frame-boundary
  transition, while the same lag is exactly right for every other
  simultaneously-active spawn — a genuinely compound (z-order tie-break
  *and* a per-spawn frame-transition detail) residual, not a single
  constant to sweep. Isolating it cleanly needs a fixture where individual
  plume spawns don't spatially overlap each other, out of this rung's
  budget.

**Rung 4 — not reached.** Player orientation is 139/150, not the required
150/150, so per the step brief's own gate the opponent-attacker orientation
dense run and CHARMELEON's `ANIM_BACK_AND_LUNGE` front-anim port were not
attempted this step.

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` — `remaining` updated to
139/150 with the narrowed, single-family (fire-plume) residual.

**Evidence.** `npm test` 2209/2209 (2207 + 2 new: the rung-1 transient pin
and the rung-2 `sheetFrame` shift assertions). `npm run build` green. Both
fixes reproduced against a fresh, independent oracle capture (not just the
cached one used to iterate) — 139/150 byte-identical both times.

## Anim-script interpreter spike: SUCCESS (2026-07-24)

**Verdict: the interpreter reproduces the move.** Built a minimal interpreter
over the committed anim command stream (`src/data/gen/battle-move-anim-scripts.json`'s
now-populated `FEATHER_DANCE` entry — previously only `ROCK_SLIDE`/
`DOUBLE_TEAM`, so this spike also had to add the FEATHER_DANCE decode to
`tools/extract/extract-battle-move-anim-assets.ts` before the "committed
stream" claim was actually true) plus a direct port of `AnimFallingFeather`/
`AnimFallingFeather_Step` (`battle_anim_flying.c:572-893`, ~320 source lines
including the four largely-symmetric quadrant cases, ported 1:1 with named
booleans replacing the packed bitfield — not the "~50 lines" estimate, which
undercounted the state-machine switch). `src/engine/featherDance.ts`'s
`makeFeatherSpriteLookup` now runs this simulation instead of replaying
`turn{6,7,8}-feather-sprites-probe.json`; those probe imports are deleted from
production and now live only in `tests/featherDanceInterpreter.test.ts` as
dev-time pinning evidence. **ISSUES #40 retired** (propose deleting its entry;
supervisor folds it).

**Evidence.** All three committed dense comparators rerun at their exact
recorded counts, zero regressions: `turn6-feathers.json` **235/235**,
`turn7-feathers.json` **145/145**, `turn8-feathers.json` **162/162**
(`turn6-featherdance.json` **90/90** and `turn11-featherdance.json`
**178/178** also unchanged). `tests/featherDanceInterpreter.test.ts` checks
every field (centerX/centerY/pa/pb/pc/pd/animNum/priority) at every real RAM
tick across all three probes — **973/973 matched** in each turn (turn6/turn8
each carry a further ~12-87-row tail of a later, unrelated sprite reusing the
same OAM slot after the real feathers self-destroy; the interpreter correctly
excludes it rather than needing a hand-picked `lastRamTick` cutoff). The
simulation's own natural self-destroy tick (from the ported `y >=
destroyThreshold` physics, no external parameter) lands on **exactly**
7557/8591/9637 — the old hand-recorded cutoffs — for all three turns.

**The one genuine derivation, not a curve fit:** the script's `delay 6`
between createsprite groups produces an 8-tick RAM spawn spacing
(0,8,8,16,16,24,24,32 across the 8 feathers), not 6. This falls straight out
of the shared script VM (`reference/pokeemerald/src/battle_anim.c`'s
`RunAnimScriptCommand`/`Cmd_delay`/`WaitAnimFrameCount`): `delay N` costs
`N+2` ticks until the next opcode runs (N decrementing calls + 1 more to
detect zero, then one more tick before `RunAnimScriptCommand` resumes) — a
property of the VM, not of FEATHER_DANCE, verified here and not yet
batch-checked against a second move (that check is the generality claim a
later step would need, per the scope rules below).

Move acceptance and dense oracle evidence are unchanged: FEATHER_DANCE stays
`exact`, same coverage entry, same evidence files plus the new
interpreter/test files (`ANIMATION_COVERAGE.json`). Only the implementation
unit changed — hand-fitted timelines are now the exception requiring
justification, not the default; the interpreter itself has one representative
(FEATHER_DANCE) and is deliberately scoped to the two ops (`delay`,
`createsprite`) that move's script actually uses. Generalizing it to a second
move (proving the `delay`-cost rule and the createsprite-schedule walk
against a different script) is a later step, not this one.

## Interpreter generalization, second-move proof: MOVE_MIST_BALL — STOP AND SPLIT (2026-07-24)

**Verdict: does NOT generalize cheaply. Enumerated the command surface per the
step brief's own rule and stopped before coding, per that rule's explicit
sanction ("that is a successful outcome, not a failure").** This directly
answers the open question the FEATHER_DANCE spike left flagged: FEATHER_DANCE's
success (`delay`/`createsprite` only, no `Random()`, no sub-tasks) does NOT
carry to a script this rich. MIST_BALL is a legitimately harder script, not a
templated repeat.

**What was done.** Extended `tools/extract/extract-battle-move-anim-assets.ts`
with a full decode of `Move_MIST_BALL` (`battle_anim_scripts.s:3955-3973`) into
`battle-move-anim-scripts.json`'s new `MIST_BALL` entry (`callback: null`,
`status` field records the stop) — additive only, every other extractor output
re-verified byte-identical (`git status` after a full re-run showed only the
one JSON file touched). No interpreter/callback port lands this step.

**Command-surface enumeration** (every op read against its real C callback,
not guessed):
- `loadspritegfx ANIM_TAG_SMALL_BUBBLES` / `ANIM_TAG_WHITE_FEATHER` — already-
  supported op; the WHITE_FEATHER load is a red herring (see below).
- `delay`, `playsewithpan`, `end` — already supported / no-op for pixel output.
- `createsprite gMistBallSpriteTemplate, ANIM_TARGET, 0, 0,0,0,0, 30, 0` —
  callback chain `AnimThrowMistBall` → `TranslateAnimSpriteToTargetMonLocation`
  → `StartAnimLinearTranslation` (`battle_anim_ice.c:1090-1095`,
  `battle_anim_mons.c:1546-1568`). **New primitive**: no move to date has a
  generic linear-translation port — `firePunch.ts`'s burn-flame particles hand-
  fit ONE instance's Q8.8 delta constant instead of porting
  `StartAnimLinearTranslation`'s accumulator generically.
- `waitforvisualfinish` — **needs real semantics**. The current interpreter
  (`featherDance.ts`) treats this op as a fixed 0-tick no-op, valid only
  because FEATHER_DANCE's own instance sits after the LAST `createsprite` (a
  script-position coincidence, calibrated around via
  `TURN6_FIRST_VISIBLE_TICK`). MIST_BALL's `waitforvisualfinish` sits in the
  MIDDLE of the script and genuinely gates continuation on the mist-ball
  sprite's own 30-tick lifetime finishing — the interpreter would need actual
  sprite-lifetime tracking to generalize this op at all.
- `createvisualtask AnimTask_ShakeMon, ...` (×2) — algorithmically simple,
  deterministic toggle-and-count state machine
  (`battle_anim_mon_movement.c:87-141`), and the mechanism is already dense-
  oracle-proven via hand-fit tables in `quickAttack.ts`/`fly.ts` — lowest-cost
  item on this list, a real port (not a fresh fit) is straightforward.
- `complex_palette_blend ... selector=F_PAL_BG ...` — this is a **script
  macro** (`asm/macros/battle_anim_script.inc:294-296`), not a raw opcode; it
  expands to `createsprite gComplexPaletteBlendSpriteTemplate, ...`. Its
  callback (`AnimComplexPaletteBlend`/`_Step1`/`_Step2`,
  `battle_anim_normal.c:344-407`) blends the WHOLE selected battle-palette set
  toward a color and back via `BlendPalettes`/`UnpackSelectedBattlePalettes`,
  gated on the unrelated global `gPaletteFade.active` being false between
  steps. **New subsystem** — no ported move touches whole-palette-set blending
  or depends on an external fade-system gate.
- `createvisualtask AnimTask_MistBallFog, 5` — **new subsystem, and the exact
  "background fade pipeline" example the step brief names as a stop trigger.**
  `AnimTask_MistBallFog`/`_Step` (`battle_anim_ice.c:1097-1170+`) loads NEW BG1
  tiles (`gWeatherFogHorizontalTiles`), a NEW tilemap (`gBattleAnimFogTilemap`),
  and a NEW palette (`gFogPalette`) via `LoadBgTiles`/
  `AnimLoadCompressedBgTilemapHandleContest`/`LoadPalette` — none of which any
  extractor in this codebase has ever exercised — then drives `BLDCNT`/
  `BLDALPHA` through a 4-phase state machine (ramp in via a lookup table, hold
  ~80 ticks, ramp out, clear both BG1 and BG2). This is a full background-
  compositing pipeline, categorically different from every sprite/palette
  mechanism ported so far.
- `createvisualtask AnimTask_BlendBattleAnimPal, ...` (×2) — the task itself
  already has ONE hardcoded fitted instance (`battleScene.ts`'s DRAGON_BREATH
  red-fade). MIST_BALL needs it **generalized** into a reusable parametric
  primitive (color/range/step all vary) rather than a second hand-fit —
  moderate cost, not free reuse.

**Tally: 6 substantive new-or-generalize items** (linear translation,
`waitforvisualfinish` real semantics, `AnimTask_ShakeMon` port,
`AnimComplexPaletteBlend`, `AnimTask_MistBallFog`, `AnimTask_BlendBattleAnimPal`
generalization), two of which are genuinely new subsystems — past the step
brief's own ">~4 substantive ops or a genuinely new subsystem" stop threshold.
Per that rule this session stopped after the enumeration + extractor decode,
rather than rushing a partial port.

**The `ANIM_TAG_WHITE_FEATHER` load is a red herring, confirmed by source, not
just inferred from the component graph:** `AnimThrowMistBall` uses
`ANIM_TAG_SMALL_BUBBLES` (`gMistBallSpriteTemplate`); `AnimTask_MistBallFog`
loads its own separate BG asset trio. Nothing in `Move_MIST_BALL`'s script ever
consumes the loaded `ANIM_TAG_WHITE_FEATHER` tile data — it's loaded but dead,
so this move shares NO real sprite/asset component with FEATHER_DANCE despite
the `battle-animation-components.json` dependency-graph edge (`goal` text in
`ANIMATION_COVERAGE.json`'s `white-feather` track updated to record this).

**Remainder for whoever picks this back up** (in cost order): port
`AnimTask_ShakeMon` generically (cheapest, evidence already exists elsewhere);
port the linear-translation primitive and wire `AnimThrowMistBall`; generalize
`AnimTask_BlendBattleAnimPal` past its one DRAGON_BREATH instance; give the
interpreter real `waitforvisualfinish` semantics (sprite-lifetime tracking);
only then tackle the two new subsystems (`AnimComplexPaletteBlend`,
`AnimTask_MistBallFog`'s BG pipeline) — each is its own extraction + engine
slice, likely each deserving its own bounded step. No Level-50 staging or dense
oracle window was attempted this step (staging happens after there's something
real to render); MIST_BALL stays unsupported (no `ANIMATION_COVERAGE.json`
entry) rather than `partial`, since zero dense window is green.

## MIST_BALL remainder, rungs 1-2: ShakeMon ported, linear translation ported (2026-07-24)

**Rung 1 — `AnimTask_ShakeMon` (`battle_anim_mon_movement.c:87-141`).** Ported
1:1 as `src/engine/shakeMon.ts` (`shakeMonSequence`/`shakeMonOffsetAtTick`,
parametric `xOffset,yOffset,numTimes,frameDelay`). `quickAttack.ts`'s
`TARGET_SHAKE_AGES` hand-fit set is deleted and replaced by a call through
the port (`quickAttackTargetShakeX2`); both QUICK_ATTACK comparators re-run
at their recorded counts: `quick-attack-pidgeotto-onix.json` **219/219**,
`quick-attack-player-pidgeotto-onix.json` **214/214**.

`fly.ts`'s own `AnimTask_ShakeMon(ANIM_TARGET,6,0,8,1)` instance
(`FlyUnleash`, `battle_anim_scripts.s:6418`) was **not** ported — a genuine
divergence, not fudged. The literal port's own state machine predicts an
isolated leading nonzero tick before settling into 2-tick pairs (any
even `numTimes` with `frameDelay=1` shakes this way: creation tick alone,
then pairs); `fly.ts`'s committed `FLY_SHAKE_AGES = {24,25,28,29,32,33}` is
exactly that pattern's three pairs with the leading isolated tick omitted,
at the best-fit creation-tick alignment (one tick before
`FLY_IMPACT_FIRST_AGE`, i.e. age 21). Swapping the port in at that alignment
was tested directly against the oracle this session and **regresses**
`fly-murkrow-onix-strike.json` from the recorded **248/248** to **247/248**
(one mismatched frame at the extra age-21 tick) — the hand-fit's omission is
correct, the port's naive alignment is not. Reverted; `fly.ts` is
byte-identical to its prior commit. `FLY_SHAKE_AGES` and the divergence
itself are pinned in `tests/shakeMon.test.ts` so the gap is visible without
re-spending the oracle round-trip. Re-confirmed unchanged after revert:
`fly-murkrow-onix-strike.json` **248/248**,
`fly-player-murkrow-onix-strike.json` **244/244**.

`AnimTask_ShakeMon2` (the coverage report's 64-remaining-move leverage item)
is a **different** source task (positive/negative alternation, not on/off
toggling) — this port's helpers do not cover its surface; only the general
"parametric task-state-machine, driven tick-by-tick" shape is reusable as a
template for a future `ShakeMon2` port, not any code from this rung.

**Rung 2 — linear-translation Q8.8 accumulator**
(`InitAnimLinearTranslation`/`AnimTranslateLinear`,
`battle_anim_mons.c:1065-1139`). Ported as
`src/engine/animLinearTranslation.ts` (`linearTranslationDeltaQ8` +
`linearTranslationOffsetAfterCallbacks`), including the direction-in-low-bit
forcing and the freeze-at-`durationTicks` behavior. `firePunch.ts`'s
hardcoded `BURN_FLAME_X_DELTA_FIXED8`/`_LEFT_FIXED8` (614/615) are deleted
and replaced by a call through the port fed the same distance (48px) and
duration (20 ticks) the burn flames' real `AnimBurnFlame` ->
`AnimTravelDiagonally` call site uses. Both FIRE PUNCH portable comparators
re-run at their recorded counts: `fire-punch-onix-grovyle.json` **225/225**,
`fire-punch-grovyle-onix.json` **277/277**.

`fly.ts`'s own private `linearDeltaQ8`/`truncDiv` helpers (the strike ball's
travel) compute the identical formula — cross-checked in
`tests/animLinearTranslation.test.ts` — but were **not** consolidated into
the shared module this step: `fly.ts`'s version never caps accumulated
callbacks at `durationTicks`, and checking whether that matters needs a
fresh oracle round-trip this step's time budget didn't allow. Left as a
documented follow-up rather than risking FLY's `exact` status unverified.

**Rung 3 (stretch — wiring `AnimThrowMistBall` through the new primitive,
RAM-probe trajectory validation) was not attempted; no time remained.**

**Remainder, recomputed in cost order:** (1) resolve the `FLY`
`AnimTask_ShakeMon` alignment — the primitive itself is now proven correct
(one clean representative, QUICK_ATTACK); this is a bounded calibration
task (find the true per-call-site creation-to-display lag), not a
re-derivation; (2) wire `AnimThrowMistBall` through the now-ported
linear-translation primitive + the interpreter's `createsprite` path, RAM-
probe-validated (rung 3 above); (3) generalize `AnimTask_BlendBattleAnimPal`
past its one DRAGON_BREATH instance; (4) give the interpreter real
`waitforvisualfinish` semantics (sprite-lifetime tracking); (5) the two new
subsystems (`AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s BG
pipeline) — each its own bounded step. MIST_BALL stays unsupported.

## FLY `AnimTask_ShakeMon` calibration: RESOLVED, landed on the port (2026-07-24)

**Verdict: outcome (1) from the step brief — a per-call-site creation-
offset parameter reconciles the port with 248/248 + 244/244. `fly.ts` now
calls through `shakeMonOffsetAtTick` directly; `FLY_SHAKE_AGES` is deleted.**

**Root mechanism, pinned by RAM evidence, not a curve fit.** Wrote
`tools/probe/dump-fly-shakemon-tasks.py` (stages via the same
`battle_lab.BattleLab` mechanicLab request the committed strike fixtures
use, so the window is reached in ~1k frames) and dumped `gTasks` (all 16
slots, full struct) plus every in-use sprite's x2/y2 across FlyUnleash's
`create_basic_hitsplat_sprite`/`createvisualtask AnimTask_ShakeMon` window,
for both strike comparators (opponent- and player-attacker).

`RunAnimScriptCommand` is a `do...while (sAnimFramesToWait == 0 &&
gAnimScriptActive)` loop (`battle_anim.c`): `createsprite`,
`createvisualtask`, and `playsewithpan` never set `sAnimFramesToWait`, so
FlyUnleash's hitsplat creation, `AnimTask_ShakeMon` creation, the razor-wind
`playsewithpan`, and `waitforvisualfinish` all execute inside **one** call,
i.e. one RAM tick — confirmed directly (both probes: the hitsplat's new
sprite slot and the ShakeMon task appear in the same tick). But the
ShakeMon task's OWN first-observable RAM state is not a fresh creation: its
`data[1]` (numTimes) already reads one less than `AnimTask_ShakeMon` sets,
and the target sprite's x2 is already 0, not `xOffset`. `CreateTask`
inserts the new task into `gTasks`'s priority-ordered linked list
(`task.c`'s `InsertTask`), and `RunTasks` walks that list via `.next` from
wherever its traversal currently sits. FlyUnleash's call uses task priority
**5**; QUICK_ATTACK's uses priority **2**. Priority 5 lands the freshly
inserted task where `RunTasks`'s *own, already-in-progress* traversal for
that frame reaches it again, so it gets stepped a **second** time before
that frame ever renders — collapsing the port's tick 0 (the creation-time
synchronous self-call, x2 still holds `xOffset`) and tick 1 (the first
regular toggle, back to zero) into one displayed tick. QUICK_ATTACK's
priority 2 does not trigger this (confirmed by its own comparator: tick 0
is directly visible, no reconciliation needed). Every later FLY tick is a
normal 1:1 step (traced through self-destroy in both probes).

The task's own RAM creation tick converts to display age 22
(`FLY_IMPACT_FIRST_AGE`, matching the hitsplat's own first-visible age —
both are created in the same batch and share the codebase's uniform 1-tick
RAM-write-to-displayed-pixel lag) in **both** probes independently. Querying
`shakeMonOffsetAtTick(6, 0, 8, 1, age - FLY_SHAKE_CREATION_AGE + 1)`
(the `+1` skips the collapsed tick 0) reproduces `{24,25,28,29,32,33}` —
the previous hand-fit `FLY_SHAKE_AGES` — exactly.

**Landed:** `src/engine/fly.ts` — `FLY_SHAKE_AGES` deleted, `targetShakeX2`
now calls `shakeMonOffsetAtTick` through the documented
`FLY_SHAKE_CREATION_AGE` constant (guarded so ages before creation stay
zero, since the port's own tick 0 is nonzero and must not leak backward
through the `+1` shift). `tests/shakeMon.test.ts`'s FLY test rewritten from
"documents a divergence" to pin the real mechanism and the exact
reconciliation. New probe `tools/probe/dump-fly-shakemon-tasks.py` (dev-time
only, not shipped).

**Evidence.** `npm test` 2045/2045, `npm run build` green.
`fly-murkrow-onix-strike.json` **248/248**,
`fly-player-murkrow-onix-strike.json` **244/244** (both through the port,
zero mismatched pixels — previously 247/248 when the port was swapped in
naively without this mechanism). Charge-turn fixtures unaffected but
re-run as a sanity check: `fly-murkrow-onix-charge.json` **151/151**,
`fly-player-murkrow-onix-charge.json` **147/147**. QUICK_ATTACK re-run since
its own test in the shared file changed: `quick-attack-pidgeotto-onix.json`
**219/219**, `quick-attack-player-pidgeotto-onix.json` **214/214**.

RUNG B (MIST_BALL rung 3, wiring `AnimThrowMistBall`) was not attempted
this step — RUNG A's RAM-probe investigation and verification used the full
session; no safe margin remained to start a second bounded oracle-facing
change.

## MIST_BALL remainder rung 3: AnimThrowMistBall wired, RAM-probe-validated (2026-07-24)

**Verdict: rung 3 lands clean, first try, zero test-fix iterations — the RAM
evidence matched the ported chain exactly once the real tick semantics were
derived from the probe (not assumed).** `src/engine/mistBall.ts` ports
`AnimThrowMistBall` → `TranslateAnimSpriteToTargetMonLocation` →
`StartAnimLinearTranslation` (`battle_anim_ice.c:1090-1095`,
`battle_anim_mons.c:1546-1568`), driven by the script's own single
`createsprite gMistBallSpriteTemplate, ANIM_TARGET, 0, 0,0,0,0, 30, 0`
(`durationTicks` read directly from `battle-move-anim-scripts.json`'s
`createspriteArgvMapping`, not hand-copied) and the already-ported
`animLinearTranslation.ts` primitive.

**The anim-script interpreter is now a real shared primitive, not a
FEATHER_DANCE-only helper.** `interpretCreateSpriteSchedule` moved out of
`featherDance.ts` into a new `src/engine/animScriptInterpreter.ts`; both
`featherDance.ts` and `mistBall.ts` import the one function. This is the
"interpreter's createsprite path" the step brief names — MIST_BALL's own
schedule is the trivial one-element case (a single createsprite before its
first `delay`), so this generalization step didn't need new interpreter
logic, only extracting the existing one for reuse.

**RAM probe** (`tools/probe/dump-mist-ball-sprite.py` against a new
`tools/battle-lab/mechanic-mist-ball-latias-onix.json` `overrides.parties`
mechanicLab scenario — opponent Latias forced into MIST_BALL on all four
slots, player Onix — staged in ~1k frames). Sprite identified unambiguously
by its `template` pointer (`gSprites+0x14`) matching `gMistBallSpriteTemplate`
(`0x08595c70`, from `bin/oracle symbols`), not by OAM-slot guessing. Full
window captured: absent before creation, in-use ticks 88-119 (32 ticks),
absent after. Committed as dev-time evidence,
`src/data/gen/mist-ball-sprite-probe.json` (38 rows, ticks 85-122).

**The one genuine derivation, from `Cmd_createsprite`'s `CreateSpriteAndAnimate`
call (`sprite.c:591-611`), not assumed from a neighbor mechanism:** the
sprite's creation tick shows `TranslateAnimSpriteToTargetMonLocation`'s
effects (`data[0]=30`, `data[2]`/`data[4]` = target coords, `callback` already
reassigned to `StartAnimLinearTranslation`) already applied, with `x2=y2=0`
(no accumulation yet). This is because `CreateSpriteAndAnimate` calls the
fresh sprite's callback (`AnimThrowMistBall`) *synchronously* at creation
(inside the `createsprite` opcode itself), then that same frame's ordinary
`AnimateSprites()` sweep advances the just-reassigned callback
(`TranslateAnimSpriteToTargetMonLocation`) a *second* time before the frame
renders — two callback steps land on one RAM tick, mirroring in spirit (but
not in cause — this is `CreateSpriteAndAnimate`'s own synchronous call, not
FLY's task-list-traversal double-step) the FLY `AnimTask_ShakeMon` finding
above. `StartAnimLinearTranslation` itself first runs — and self-invokes
`AnimTranslateLinear_WithFollowup` once inline — on the *next* tick. Net
result: `callbacks = tick` (no `+1`/`-1` fixup) maps a probe-relative tick
directly onto `linearTranslationOffsetAfterCallbacks`, landing exactly on
the primitive's own documented "first displayed tick is pre-callback" case.
Verified against **every** real probed tick (32/32), not fitted: the
Tier-1 test (`tests/mistBall.test.ts`) passed on the first run with no
constant-tuning.

**Not attempted (honest scope boundary, per the step's own OUT OF SCOPE
list and stop-and-split remainder):** `mistBall.ts` is a standalone,
RAM-validated module — it is **not** wired into `battleScene.ts`'s move
dispatch, so MIST_BALL gets no `ANIMATION_COVERAGE.json` entry and stays
fully unsupported (shared code alone never promotes coverage). No dense
oracle pixel comparator exists for the ball's flight: rendering it needs
`ANIM_TAG_SMALL_BUBBLES` sprite-sheet extraction and OAM draw wiring that
no extractor in this codebase has exercised yet, a nontrivial slice on its
own, not a quick add inside this step's remaining time. `waitforvisualfinish`
sprite-lifetime semantics, `AnimComplexPaletteBlend`, `AnimTask_MistBallFog`'s
BG pipeline, and generalizing `AnimTask_BlendBattleAnimPal` past its one
DRAGON_BREATH instance are all still open — MIST_BALL needs every one of
those before it can render at all, let alone reach `partial`/`exact`.

**Evidence.** `npm test` 2125/2125 (up from 2045 — added `tests/mistBall.test.ts`,
no regressions). `npm run build` green. `featherDance.ts`'s own tests
(`tests/featherDance.test.ts`, `tests/featherDanceInterpreter.test.ts`) re-run
unchanged after the `interpretCreateSpriteSchedule` extraction (pure move,
zero behavior change) — no dense oracle comparator touches
`animScriptInterpreter.ts`'s exported surface, so none were re-run.

## `AnimTask_ShakeMon2` ported generically, DRAGON_BREATH + BLAZE_KICK re-driven (2026-07-24)

**Verdict: the port generalizes cleanly across both named representatives,
first try, zero test-fix iterations — both hand-fit shake formulas deleted,
all four comparators re-run at exactly their recorded counts.** This is the
coverage report's top task-level leverage item (64 remaining Level-50 moves
depend on `AnimTask_ShakeMon2`); this step proves the port against its two
named representatives only — no new move gets wired this step.

**Port.** `src/engine/shakeMon2.ts` (`shakeMon2Sequence`/`shakeMon2OffsetAtTick`)
is a 1:1 port of `AnimTask_ShakeMon2`/`AnimTask_ShakeMon2_Step`
(`battle_anim_mon_movement.c:155-238`) — genuinely a different source task
from `shakeMon.ts`'s `AnimTask_ShakeMon` per the prior rung's warning (no code
carried over): offsets alternate between `+offset`/`-offset` (never touching
zero mid-sequence) instead of toggling `offset`/`0`, and the final toggle
forces zero and self-destroys instead of continuing the alternation. One
implementation note: the toggle uses `0 - offset` rather than `-offset` to
avoid emitting `-0` for the `yOffset=0` both call sites pass (numerically
identical to `0` but fails strict/deep equality). Tier-1 tests
(`tests/shakeMon2.test.ts`, 6 tests) pin the alternation pattern directly
(varying `numTimes`/`frameDelay`), that mid-sequence values never land on
zero, boundary behavior before creation/after self-destroy, and both call
sites' exact reconciliation against their pre-existing hand-fit tables.

**Call-site mapping, derived from committed constants, not fitted.** Checked
each site's real source args directly against `battle_anim_scripts.s`:
- DRAGON_BREATH (`:4943`): `createvisualtask AnimTask_ShakeMon2, 2,
  ANIM_TARGET, 2, 0, 21, 1` → `shakeMon2OffsetAtTick(2, 0, 21, 1, tick)`.
- BLAZE_KICK (`:8498`): `createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET,
  3, 0, 14, 1` → `shakeMon2OffsetAtTick(3, 0, 14, 1, tick)`.

Both sites need the same "+1, guard age < creationAge" idiom `fly.ts`'s
`FLY_SHAKE_CREATION_AGE` already established for `AnimTask_ShakeMon`: the
port's own tick 0 (the creation write) is never independently displayed.
For DRAGON_BREATH the creation-age anchor is the pre-existing
`DRAGON_BREATH_SHAKE_FIRST_AGE` (13) constant itself — confirmed against the
*independently* RAM-probed old canonical-path comment in `battleScene.ts`
(`dragonBreathShakeX2`'s own doc: "by the FIRST RAM tick this task's callback
is observed, x2 ALREADY reads the FIRST FLIP's result", i.e. the exact same
collapse), not re-derived from scratch. For BLAZE_KICK the anchor is the
pre-existing `BLAZE_KICK_FIRE_SPREAD_FIRST_AGE` (35) constant: its
`AnimTask_ShakeMon2` creation coincides (zero `delay` between them, same
`RunAnimScriptCommand` pass) with `call FireSpreadEffect`'s own first tick,
so it shares that anchor exactly. Both mappings reproduce their entire
pre-existing hand-fit table exactly (verified in `tests/shakeMon2.test.ts`
before touching either call site) — this is a genuine derivation from
already-committed, already-evidenced constants, not a fresh curve fit.

Both `DRAGON_BREATH_SHAKE_FIRST_AGE`'s formerly-paired `_END_AGE` constant is
deleted: the port's own self-destroy tick now determines the end, not a
second hand-picked literal.

**`dragonBreath.ts`/`blazeKick.ts` re-driven, hand-fit constants deleted.**
`dragonBreath.ts`'s `Math.floor((age-first)/2)%2` formula and
`DRAGON_BREATH_SHAKE_END_AGE` are gone; `blazeKick.ts`'s
`Math.floor(shakeAge/2)%2 ? -3 : 3` formula and its local `shakeAge` are
gone. Both now call `shakeMon2OffsetAtTick` directly.

**Two call sites, NOT this step's scope, left untouched:** `statusAnimation.ts`
(`animTaskShakeMon2AtSourceAge`, the paralysis-shake visual component BOUNCE's
successful-paralysis variant uses) and `faintAttack.ts`
(`AnimTask_ShakeMon2(ANIM_TARGET,2,0,9,1)`) both already have their own
independent hand-fit `AnimTask_ShakeMon2` formulas. The step brief named only
`dragonBreath.ts`/`blazeKick.ts`; retiring those two through the new port is
a natural, bounded follow-up but wasn't attempted here.

**The canonical `turn2-dragonbreath.json`/`turn2-dragonbreath-projectiles.json`/
`turn13-dragonbreath-faint.json` fixtures do NOT feed through `dragonBreath.ts`
at all** — checked directly: they render through `battleScene.ts`'s own
separate, absolute-tick `drawDragonBreathScene`/`dragonBreathShakeX2`
(the frozen "retired Battle 2 march" path, independently RAM-probed via
`tools/probe/dump-dragonbreath-anim.py` when it was written), not the
portable reducer. `battleScene.ts` was not touched this step, so those three
fixtures are provably unaffected and were not re-run.

**Evidence.** `npm test` 2131/2131 (up from 2125 — added `tests/shakeMon2.test.ts`,
6 tests). `npm run build` green. All four re-driven comparators at their
exact recorded counts, zero regressions:
`dragon-breath-player-onix-opponent-murkrow.json` **85/85** component +
**85/85** framebuffer, `dragon-breath-opponent-onix-player-murkrow.json`
**85/85** + **85/85**, `blaze-kick-player-onix-opponent-murkrow.json`
**78/78** + **78/78**, `blaze-kick-opponent-onix-player-murkrow.json`
**78/78** + **78/78** (all match `ANIMATION_COVERAGE.json`'s recorded
counts exactly).

Move acceptance is unchanged: DRAGON_BREATH and BLAZE_KICK both stay `exact`,
same coverage entries, same evidence files plus the two new port/test files.
`ANIMATION_COVERAGE.json`'s move-level text is untouched (its own prose
already describes the shake generically, not as a hand-fit formula) — only
the `elemental-fire` track's implementation detail changed underneath it.

## MOVE_MUD_SLAP dense-evidence acceptance step: already complete, re-verified (2026-07-24)

**Verdict: the assigned step ("bring MOVE_MUD_SLAP to a dense-evidence
acceptance state") was already done — mis-scoped, not blocked.**
`ANIMATION_COVERAGE.json`'s `MOVE_MUD_SLAP` entry has carried `status:
"exact"` with both-orientation dense evidence since commit `c1df4a9`
("animation: prove Mud Slap in both orientations"), an ancestor of this
worktree's own branch point — the work predates this session's step brief
entirely. No source code needed changing, so no code commit was made this
step; this entry exists only to record that the assignment was checked
honestly rather than skipped or rubber-stamped.

**Verification performed, not assumed.** Read `Move_MUD_SLAP`'s script
(`reference/pokeemerald/data/battle_anim_scripts.s:5220-5241`):
`loadspritegfx ANIM_TAG_MUD_SAND`, attacker slide-to-offset/slide-to-original
choreography (shared `gSlideMonToOffsetSpriteTemplate`/
`gSlideMonToOriginalPosSpriteTemplate`, same as SAND_ATTACK), then six
`call MudSlapMud`, each spawning five `gMudSlapMudSpriteTemplate` sprites
(30 total, matching `src/engine/mudSlap.ts`'s own "30 stock
`Random2()`-resolved" doc comment) plus a `delay 2`. Read the callback
(`reference/pokeemerald/src/battle_anim_ground.c`): `gMudSlapMudSpriteTemplate`
is `.oam = &gOamData_AffineOff_ObjNormal_16x16` with `sAnim_MudSlapMud`
(frame 1) and `.callback = AnimDirtScatter` — the identical callback
SAND_ATTACK's `gSandAttackDirtSpriteTemplate` uses at 8x8, confirming
`mudSlap.ts`'s claim that it "shares `AnimDirtScatter` translation semantics
with SAND ATTACK" while modeling its own distinct 16x16/30-sprite/6-wave
geometry — not a guess, matches the actual source.

`npm test` 2147/2147, `npm run build` green (both unchanged from before this
step — no source touched). Re-ran both committed portable comparators fresh
against the live oracle rather than trusting the recorded numbers:
`mud-slap-pidgeotto-onix.json` **51/51** source OAM + **51/51** RGB,
`mud-slap-player-pidgeotto-onix.json` **51/51** + **51/51** — both match
`ANIMATION_COVERAGE.json`'s recorded counts exactly, zero regressions.
SAND_ATTACK's own module/comparators were not touched (out of scope, and
unnecessary since no shared code changed).

## MOVE_EMBER dragon-fire-projectile sibling: two sprite families ported, RAM-probed, dense-evidenced both orientations — `partial` (2026-07-24)

**Verdict: real progress, not yet `exact`.** `Move_EMBER` (`battle_anim_scripts.s:919-937`) is genuinely bounded — no monbg/splitbgprio, no new subsystem, both its sprite families (three `gEmberSpriteTemplate` projectiles via `TranslateAnimSpriteToTargetMonLocation`, three `gEmberFlareSpriteTemplate` hit flares via `AnimEmberFlare`/`AnimTravelDiagonally`, both `battle_anim_fire.c`/`battle_anim_mons.c`) collapse onto the SAME `StartAnimLinearTranslation` Q8.8 accumulator DRAGON_BREATH/FLAMETHROWER/MIST_BALL already established. `src/engine/ember.ts` derives every position/frame/subpriority field from the ported source formulas (`SetAnimSpriteInitialXOffset`'s side-signed offset, `TranslateAnimSpriteToTargetMonLocation`'s/`AnimTravelDiagonally`'s distinct coordinate-type rules, `sAnim_BasicFire`'s 5-frame cycle) — verified against fresh mgba RAM probes in both cast orientations, not fitted to them (100% match, 63/63 component frames, at every real tick in both orientations before any framebuffer work started).

**Two real bugs found via the dense pixel comparator itself, both fixed:**
- The ember/flare draw-order tie-break (equal target-relative subpriority, equal screen Y — three flares can share the same Y) was sorting ascending `spawnIndex`; the RAM-probed `sSpriteOrder` showed the EARLIER-created sprite paints last/frontmost on a Y tie — the same descending-creation-order rule `dragonBreath.ts` already established among its own eleven embers, just not carried over correctly on the first pass.
- The opponent-attacker fixture (`mechanic-ember-opponent-onix-player-murkrow.json`) initially assumed both battlers were at full HP (a fresh single-move battle). The RAM probe showed opponent ONIX's HP is actually 69/117 by the time EMBER's own dense window starts — player MURKROW's own (unforced, rental-set) move resolves first in that turn order and chips ONIX before EMBER acts. This is exactly why DRAGON_BREATH/THUNDER_PUNCH's own sibling fixtures for this same ONIX/MURKROW pair already use 69, not full HP — not a fresh-battle assumption, confirmed directly against my own probe's `opponent.hp` field per frame.

**Results.** Opponent ONIX → player MURKROW: relative ages 0-62 / oracle frames 442-504, **63/63 component AND 63/63 framebuffer**, zero exclusions — fully exact for this orientation. Player ONIX → opponent MURKROW: relative ages 0-62 / oracle frames 388-450, **63/63 component but 61/63 framebuffer** — two frames (389, 395; 3-8px each) are off, and both are exactly the FIRST displayed tick of a newly-spawned ember (ember1's own age 0, ember2's own age 0); every other tick of both embers, all three flares, and the entire opposite orientation (including its own embers' first ticks, which match exactly) are fine. Since the underlying RAM/OAM component state matches 63/63 even on the two bad frames, this reads as a framebuffer-capture-timing nuance isolated to a sprite's own creation tick (mGBA's OAM-build/VBlank-capture ordering may treat a sprite's zeroth tick differently from its continuing ticks), not a position/frame/z-order bug — not chased further this step given the size of the remainder.

**Move acceptance: `partial`, not `exact`**, per the coverage rubric's own rule ("`exact` cannot retain a known remainder"). `ANIMATION_COVERAGE.json`'s new `MOVE_EMBER` entry and the `dragon-fire-projectile` track's goal text both name the remainder explicitly.

**Evidence.** `npm test` 2153/2153 (up from 2147 — added `tests/ember.test.ts`, 6 tests, RAM-probe-pinned both orientations via `src/data/gen/ember-sprite-probe{,-opponent}.json`). `npm run build` green. Fresh live-oracle reruns of the two now-existing EMBER comparators (`tools/compare/emberPortable.ts`) at the counts above, plus both existing FLAMETHROWER (`126/126` both) and DRAGON_BREATH (`85/85` both) comparators re-run fresh after touching the shared `tools/probe/run-battle-lab-rgb.py`/`sceneOnPresentation.ts`/`battleScene.ts` — zero regressions.

## MOVE_EMBER's 2-frame remainder closed: attacker/ember OAM draw order is subpriority-parametric, not fixed — `exact` (2026-07-24)

**Verdict: the remainder was a draw-order bug, not a timing/lag bug — root-caused by RAM+pixel probe, fixed by reusing an existing function, zero curve-fitting.** The prior step's hypothesis (a per-sprite creation-tick render-lag nuance, by analogy to MIST_BALL/FLY) was investigated and falsified: `tools/probe/dump-ember-creation.py` (new, adapted from `run-battle-lab-rgb.py` + `dump-fly-shakemon-tasks.py`, dumps full `gSprites` struct — `data[]`, raw `callback` pointer — plus cropped RGB per frame) shows ember1 (slot 3) is created during oracle-tick 388's processing already carrying its post-`CreateSpriteAndAnimate`-plus-same-frame-`AnimateSprites()` "1-step" state (`x2=3,y2=-1`), exactly what `ember.ts`'s existing formula already predicted at local age 0 — the position/timing model was never wrong (component check was already 63/63). The actual defect: decoding `emberPortable.ts`'s own mismatch string correctly (`oracle!=app`, not `app!=oracle` as the step brief assumed) shows the **app was drawing fire where the real oracle still showed the attacker's own body** — the app had the ember right and was painting it *over* Onix instead of *under* Onix.

**Root mechanism, source-cited.** `Cmd_createsprite`'s subpriority for both ember families is target-relative (`GetBattlerSpriteSubpriority(target) - 2`, `battle_anim.c` around `Cmd_createsprite`), while the attacker's own battler sprite subpriority is fixed by `GetBattlerSpriteSubpriority` (`battle_anim_mons.c:2035-2061`): 30 for `B_POSITION_PLAYER_LEFT`, 40 for `B_POSITION_OPPONENT_LEFT`. `SortSprites` draws the LOWER-subpriority sprite last/on top. For this codebase's fixed ONIX/MURKROW singles pair: player-attacker Onix (30) < ember subpriority (target Murkrow 40 − 2 = 38) → **Onix occludes freshly-spawned embers still overlapping its own silhouette**; opponent-attacker Onix (40) > ember subpriority (target Murkrow 30 − 2 = 28) → **embers occlude Onix**. This exact side-parametric rule is already generalized and exported as `dragonBreathEmbersInFrontOfAttacker` (`dragonBreath.ts`) and already reused by FLAMETHROWER's own draw block (`battleScene.ts` ~14939) — DRAGON_BREATH's own module doc even states it plainly ("Onix is subpriority 30 … `SortSprites` puts Onix at the winning lower OAM index, so its opaque pixels cover compressed embers near the origin"). EMBER's draw block (`battleScene.ts` ~16872) had never been updated to use it — it always drew the attacker sprite before the embers unconditionally, which happens to be correct for the opponent-attacker orientation (why that side was already 63/63) but wrong for the player-attacker orientation, and only *visible* on each ember's first tick or two, since the small fire graphic's actual opaque pixels move clear of Onix's silhouette within 1-2 ticks even though the two sprites' bounding boxes keep overlapping much longer.

**Fix.** `battleScene.ts`'s EMBER draw block now calls `dragonBreathEmbersInFrontOfAttacker(view.attacker.geometry.side)` and conditionally draws the ember/flare loop before or after the attacker sprite, mirroring FLAMETHROWER's own call site exactly (no new function, no per-frame branch, no age/lag change — `ember.ts` itself is untouched). This is a per-orientation constant, not a per-frame special case.

**Results.** Player ONIX → opponent MURKROW: **63/63 component AND 63/63 framebuffer**, zero exclusions (both previously-bad frames 389/395 now exact). Opponent ONIX → player MURKROW: still **63/63 + 63/63** (unchanged, confirmed no regression from the conditional draw order). `MOVE_EMBER` promoted to `exact` in `ANIMATION_COVERAGE.json` — no remainder left in either orientation.

**Evidence.** `npm test` 2153/2153 (unchanged — no engine-logic module touched, so no new Tier-1 test; the fix is a draw-order line reusing an already-tested function). `npm run build` green. Both EMBER comparators re-run fresh at the counts above. Re-ran FLAMETHROWER (`126/126` both) and DRAGON_BREATH (`85/85` both) since `battleScene.ts` was touched — zero regressions. New dev-time evidence: `tools/probe/dump-ember-creation.py` (committed, same convention as `dump-fly-shakemon-tasks.py`/`dump-mist-ball-sprite.py`).


## MOVE_DRAGON_RAGE enumeration: STOP AND SPLIT (2026-07-25)

**Verdict: does NOT generalize cheaply from the existing `dragon-fire-
projectile` family. Enumerated the full command surface per the step
brief's own rule and stopped before writing any render code, per that
rule's explicit sanction ("that is a successful outcome, not a failure").**
DRAGON_RAGE is Level-50 legal (`FRONTIER_MON_CHARMELEON_2`, confirmed in
`factory-animation-inventory.json` before starting), so this is a scope
finding, not a legality block.

**What was done.** Extended `tools/extract/extract-battle-move-anim-assets.ts`
with a full decode of `Move_DRAGON_RAGE` (`battle_anim_scripts.s:5243-5273`)
into `battle-move-anim-scripts.json`'s new `DRAGON_RAGE` entry (`callback:
null`, `status` field records the stop) — additive only, `git status` after
a full re-run showed only that one extractor + its one JSON output changed.
No render/callback code lands this step.

**Command-surface enumeration** (every op read against its real C callback):
- `loadspritegfx ANIM_TAG_SMALL_EMBER` — already extracted
  (`battle-anim-small-ember.json`, DRAGON_BREATH); this move's fire-spit
  sprite uses frames 0/4 of that same sheet (that extraction's own
  `otherFramesNeedsOnly` note already flagged them as DRAGON_RAGE's).
- `loadspritegfx ANIM_TAG_FIRE_PLUME` — **NEW asset, not yet extracted
  anywhere**: `gBattleAnimSpriteGfx_FirePlume` (`fire_plume.png`, 32x160px,
  5 stacked 32x32 frames) paired with `gBattleAnimSpritePal_Fire`
  (a DIFFERENT, also-unextracted source PNG, `fire.png`, supplies only the
  palette — same tile-vs-palette split this codebase's extractor already
  handles elsewhere, just a fresh pair of source files).
- `createvisualtask AnimTask_ShakeMon, 5, ANIM_ATTACKER, 0, 2, 40, 1` —
  already-ported primitive (`shakeMon.ts`, proven via QUICK_ATTACK/FLY).
  Every prior call site shakes the TARGET; this is the first ATTACKER-side
  use, but the primitive itself is battler-agnostic — cheap render wiring,
  not a new port.
- `createsprite gSlideMonToOffsetSpriteTemplate, ANIM_TARGET, 2, 0, 15, 0, 0, 4`
  — **NEW primitive**: `SlideMonToOffset` → `InitSpriteDataForLinearTranslation`
  + `TranslateSpriteLinearByIdFixedPoint` (`battle_anim_mon_movement.c:537-576`).
  `gBattleAnimArgs[0]=0` selects the ATTACKER's own sprite (the `ANIM_TARGET`
  field only sets the dummy sprite's OAM subpriority, the same
  battler-vs-argv split MIST_BALL's own enumeration already established).
  **Confirmed NOT the same mechanism `mudSandSlide.ts` ports**: that module
  is a hand-fit lookup table for SAND_ATTACK/MUD_SLAP's own createsprite args
  (x=-10, duration 3/4), not a generic port of this accumulator — read both
  side by side: `SlideMonToOffset` writes to a REFERENCED mon sprite via
  `data[5]` with plain-division rounding, while the already-ported
  `animLinearTranslation.ts` (`InitAnimLinearTranslation`) writes to the
  sprite's OWN x2/y2 with direction-in-low-bit rounding — different layout,
  different math.
- `create_dragon_rage_fire_spit_sprite ANIM_TARGET, 2, initial_x=30,
  initial_y=15, target_x=0, target_y=10, duration=10` —
  `gDragonRageFireSpitSpriteTemplate` (`battle_anim_dragon.c:158-167`)
  shares `AnimDragonFireToTarget` → `StartDragonFireTranslation`
  (`:218-274`, comment literally says "For Dragon Breath and Dragon Rage")
  and an identically-shaped 3-frame/3-tick sheet cadence with DRAGON_BREATH's
  own ember, reusing the already-ported Q8.8 accumulator. Two genuinely new
  parts: (1) DRAGON_BREATH's own script always passes all-zero
  initial/target offsets, so `StartDragonFireTranslation`'s side-branch logic
  was never exercised — it has a real quirk, confirmed straight from source:
  the opponent-side branch uses `cmd->initialY` to offset `sprite->x` (not
  `initialX`), an asymmetry DRAGON_RAGE's nonzero args actually exercise;
  (2) its own affine anim (`AFFINEANIMCMD_FRAME(0x64,0x64,127,1)`, one step)
  uses different scale constants and shape than DRAGON_BREATH's own
  two-step ramp — DRAGON_BREATH's `MATRIX_A`/`MATRIX_B` tables are
  RAM-PROBED literals, not a closed-form derivation, so this needs its own
  fresh probe (likely simpler, given the single-step affine anim, but not
  confirmed against real RAM).
- `createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 3, 25, 1` —
  already-ported primitive, same shape as every prior target-shake site.
- `create_dragon_rage_fire_plume_sprite` ×8 (relative_to=ANIM_TARGET every
  time — the callback's ANIM_ATTACKER branch is dead code for this move, a
  red herring like MIST_BALL's unconsumed `ANIM_TAG_WHITE_FEATHER` load) —
  **NEW callback**: `AnimDragonRageFirePlume` (`battle_anim_dragon.c:246-265`)
  is a STATIC-position sprite (no translation/accumulator at all — simpler
  than every other mechanism this track uses): places itself at the target's
  `BATTLER_COORD_X/Y`, applies the already-established side-signed x-offset
  pattern (`ember.ts`'s `sideSignedOffset`) plus a plain y offset, plays a
  5-frame/5-tick-each reveal ONCE (`ANIMCMD_END`, not `JUMP`), then
  self-destroys via `RunStoredCallbackWhenAnimEnds` once `animEnded`
  latches. Per-spawn `subpriority_offset` varies (66 or 2) — a real per-spawn
  detail. Needs its own RAM probe for lifetime/render-lag; none of the
  existing ported sprite families use this "static + one-shot reveal +
  destroy-on-animEnd" shape.
- `createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_TARGET, 66, 0, 0, 4`
  — **NEW primitive** (paired with `SlideMonToOffset` above but a SEPARATE
  C function): `SlideMonToOriginalPos` (`battle_anim_mon_movement.c:478-535`)
  has its own data layout and step function — restores the attacker's
  current x2/y2 back to 0 over 4 ticks, not a fresh two-point interpolation.

**Tally: 4 substantive new items** (`ANIM_TAG_FIRE_PLUME` asset,
`SlideMonToOffset`/`SlideMonToOriginalPos` primitive pair,
`AnimDragonRageFirePlume`'s new static/one-shot/self-destroy mechanism,
`StartDragonFireTranslation`'s side-asymmetric offset quirk plus a fresh
affine probe) — at the step brief's own "~4 substantive ops" stop
threshold, though none individually rises to a "new subsystem" the way
MIST_BALL's `AnimComplexPaletteBlend`/`AnimTask_MistBallFog` did (no new
BG tiles/tilemap, no external fade-gate dependency). Combined with a real
60-minute session cap, landing all four with disciplined RAM-probe-first
evidence (per-mechanism render-lag bisection, both orientations, dense
comparators run twice for determinism) was not achievable without cutting
a corner somewhere. Per the brief's own stop-threshold rule, this session
stopped after the enumeration + additive extractor decode rather than
rushing a partial port.

**Remainder for whoever picks this back up** (in cost order): ~~(1) extract
`ANIM_TAG_FIRE_PLUME` (`fire_plume.png` tiles + `fire.png` palette) — pure
mechanical decode, same shape as every prior asset addition~~ **done, see the
"DRAGON_RAGE enumeration remainder, rungs 1-2" section below**; ~~(2) port
`SlideMonToOffset`/`SlideMonToOriginalPos` as a shared primitive (Tier-1
tests first, no move wiring needed yet — same standalone-port pattern
`shakeMon.ts`/`animLinearTranslation.ts` used)~~ **done, same section
below**; (3) RAM-probe the whole
move body in one battle-lab window (attacker shake → slide-to-offset →
fire-spit → 8 plumes → slide-to-original) to pin every cadence/render-lag
in one pass, the same technique `dump-dragonbreath-anim.py`/
`dump-ember-creation.py` already used; (4) port `AnimDragonRageFirePlume`
and wire `StartDragonFireTranslation`'s offset quirk + fresh affine table;
(5) dense comparators in both orientations, run twice for determinism.
MOVE_DRAGON_RAGE stays unsupported (no `ANIMATION_COVERAGE.json` entry) —
shared code alone never promotes coverage, and zero render code landed
this step.

**Evidence.** `npm test` 2180/2180 (unchanged — no engine module touched,
extractor-only change). `npm run build` green. `git status` after the
extractor re-run showed only `extract-battle-move-anim-assets.ts` and
`battle-move-anim-scripts.json` changed.

## DRAGON_RAGE enumeration remainder, rungs 1-2: FIRE_PLUME extracted, SlideMonToOffset/SlideMonToOriginalPos ported (2026-07-25)

**Rung 1 — `ANIM_TAG_FIRE_PLUME` asset extraction.** Mirrored the DRAGON_BREATH
small_ember block's exact layout: `fire_plume.png` (32x160, 4x20 tiles, 5
stacked 32x32 frames, `gDragonRageFirePlumeSpriteTemplate`'s tile source)
paired with `fire.png`'s own embedded palette (the `ANIM_TAG_FIRE_PLUME`
palette-table entry points at `gBattleAnimSpritePal_Fire`, a separate source
PNG — same tile-vs-palette split `extract-battle-anim-assets.ts`'s
particles.png/circle_impact.png pair already established). Writes
`src/assets/gen/battle-anim-fire-plume.json`; pinned in
`tests/moveAnimAssets.test.ts` mirroring the rocks.png per-asset pattern.
Additive only — `git status` after a full extractor re-run showed only the
new JSON output plus the extractor/test files touched.

**Rung 2 — `SlideMonToOffset`/`SlideMonToOriginalPos` primitive port.**
RAM-probed a real DRAGON_RAGE window first, per the step brief: staged a
Factory-legal CHARMELEON attacker (mirroring FRONTIER_MON_CHARMELEON_2's own
real MOVE_DRAGON_RAGE grant) vs. ONIX via a new `mechanicLab overrides.parties`
fixture (`tools/battle-lab/mechanic-dragon-rage-charmeleon-onix.json`) and a
new probe (`tools/probe/dump-dragonrage-slide.py`, committed evidence
`src/data/gen/dragonrage-slide-probe.json`) that identifies the two dummy
sprites by their own `template` pointer against
`gSlideMonToOffsetSpriteTemplate`/`gSlideMonToOriginalPosSpriteTemplate`'s
real rodata addresses (stable for the sprite's whole lifetime, unlike
`callback` which reassigns itself after the first tick).

Ported both 1:1 as `src/engine/slideMon.ts`
(`slideMonToOffsetAtTick`/`slideMonToOriginalPosAtTick`, plus
`slideMonToOffsetMirroredDeltas` for `SlideMonToOffset`'s own opponent-side
mirror and `*DestroyTick` helpers). Both share
`InitSpriteDataForLinearTranslation`'s plain-truncating-division Q8.8 setup
(confirmed distinct from `animLinearTranslation.ts`'s direction-in-low-bit
variant, per the original enumeration's own finding) but the RAM probe
surfaced **two real divergences between their step functions**, both now
encoded in the port rather than assumed: (1) `SlideMonToOriginalPos_Step`
truncates its accumulator's own contribution to `(s8)` before adding back the
base offset; `TranslateSpriteLinearByIdFixedPoint` (SlideMonToOffset's step)
does not — irrelevant at this move's own ≤15px magnitudes but part of the
real function. (2) Self-destroy timing differs by a full tick: SlideMonToOffset's
finish branch only *reassigns* `sprite->callback` to `DestroyAnimSprite`
(`SetCallbackToStoredInData6`), so the actual destroy fires the FOLLOWING
tick — RAM shows the dummy sprite alive for 5 ticks on a 4-tick duration
(168-172, tick 172 a repeated no-op), gone by 173. SlideMonToOriginalPos_Step
calls `DestroyAnimSprite` directly in its own finish branch, same tick as the
last accumulate — RAM shows exactly 4 ticks alive (235-238), gone by 239.
`tests/slideMon.test.ts` asserts the port reproduces the probed attacker `x2`
at every RAM tick across both windows (168-172 offset-out, 235-238
offset-back) plus both destroy-tick counts, all matching exactly on first
run — no curve-fitting needed once the source's two branch orders were read
correctly. The opponent-side mirror branch (`battlerSide: "opponent"`) is
unit-tested from source only — this attacker was on the player side in the
probed window, so the mirror itself is **not yet independently RAM-verified**
(named remainder, not claimed exact).

**No move wiring.** `AnimDragonRageFirePlume`, the fire-spit sprite's
asymmetric-offset branch, and `StartDragonFireTranslation`'s own fresh affine
probe are untouched — out of this step's scope per the brief.
MOVE_DRAGON_RAGE stays unsupported (no `ANIMATION_COVERAGE.json` entry).

**Evidence.** `npm test` 2190/2190 (2180 + 10 new: 3 fire-plume asset pins,
7 slideMon RAM pins). `npm run build` green.

## DRAGON_RAGE rungs 3-4: whole-move RAM probe, full engine port, interpreter generalized — still unsupported, no dense pixel evidence (2026-07-25)

**Verdict: the move body is fully ported and Tier-1-pinned against real RAM
in both attacker orientations, but zero dense oracle-pixel window was run
this step — per this codebase's own MIST_BALL precedent (a standalone,
Tier-1-pinned, not-yet-wired engine module), DRAGON_RAGE stays *unsupported*
(no `ANIMATION_COVERAGE.json` entry), not `partial`: `partial` requires "a
meaningful dense window is green," and none was attempted.**

**Rung 3 — whole-move RAM probe.** Extended rung 2's slide-only probe into
`tools/probe/dump-dragonrage-full.py`: one pass capturing `gAnimVisualTaskCount`/
`gAnimScriptActive` (ground truth for `waitforvisualfinish`'s own gating),
both `AnimTask_ShakeMon` calls (attacker then target, identified across
their self-reassignment from `AnimTask_ShakeMon` to the static, non-exported
`AnimTask_ShakeMon_Step` — resolved via `nm pokeemerald.elf`, not the map
file), the fire-spit sprite (position + its own single-step affine matrix
via `gOamMatrices`), all 8 fire-plume sprites (creation ticks, `animCmdIndex`
frame stepping, self-destroy), and both slide dummies. Staged BOTH
orientations: the existing CHARMELEON/ONIX fixture plus a new reverse
`tools/battle-lab/mechanic-dragon-rage-onix-charmeleon.json` (ONIX player,
CHARMELEON opponent) — needed to RAM-probe `StartDragonFireTranslation`'s
side-asymmetric offset branch and its own affine constants on the side
DRAGON_BREATH never exercises. Committed as
`src/data/gen/dragonrage-full-probe-{player,opponent}-attacker.json`.

**Rung 4 — port + wire the move body.** Generalized
`animScriptInterpreter.ts` with `interpretAnimSchedule`: the
`waitforvisualfinish` sprite-lifetime tracking the MIST_BALL enumeration
(2026-07-24) flagged as needed to generalize past FEATHER_DANCE's own
script-position coincidence. `Cmd_waitforvisualfinish`
(`battle_anim.c:455-465`) blocks until `gAnimVisualTaskCount == 0` — every
item active since the last wait, not just the most recent — so the
scheduler tracks each creation op's own "gone" tick (per-primitive lifetime
supplied by the caller: `shakeMonSequence(...).length - 2`,
`slideMonTo{Offset,OriginalPos}DestroyTick`, this move's own fire-spit/
fire-plume lifetimes) and resolves each `waitforvisualfinish` as
`max(activeGoneTicks) + 1` — a real, RAM-confirmed 1-tick resolution lag,
not a hand-fit. Verified exactly (all 5 of DRAGON_RAGE's own
`waitforvisualfinish` barriers, both orientations) before being trusted;
`tests/dragonRage.test.ts`'s `dragonRageSchedule` tests pin every predicted
creation tick against the rung-3 probe.

`src/engine/dragonRage.ts` drives the whole move through this scheduler
from the decoded script. Reuses `shakeMon.ts` (first ATTACKER-side
`AnimTask_ShakeMon` call site — same primitive, plus the already-established
priority-5 same-frame-double-step `+1` creation-tick adjustment
`fly.ts` documents) and `slideMon.ts` verbatim. Adds two new mechanisms:

- **Fire-spit sprite** (`StartDragonFireTranslation`): the opponent-side
  branch's `sprite->x -= cmd->initialY` asymmetry (confirmed straight from
  source, not guessed) plus a fresh, RAM-probed single-step affine matrix
  per side — player `(pa,pb,pc,pd) = (-183,-4,4,-183)`, opponent
  `(184,0,0,184)`, both distinct from DRAGON_BREATH's own matrices as
  predicted. The per-tick Q8.8 delta is a RAM-probed literal (constant
  across the sprite's life, `data[1]`/`data[2]`), not closed-form derived
  from either battler's resolved `BATTLER_COORD_X_2`/`Y_PIC_OFFSET` — those
  don't reproduce the literal via `floor(|distance|<<8/duration)` for
  reasons not fully chased down this step (same "RAM-probed literal, not a
  closed form" convention `dragonBreath.ts`'s own `MATRIX_A`/`MATRIX_B`
  tables already use for this callback family). Frame cadence reuses
  `dragonBreath.ts`'s own `((age+1)/3 % 3)` formula verbatim — RAM-confirmed
  identical shape (`sAnim_DragonRageFire` is byte-identical to
  `sAnim_DragonBreathFire_0`, exactly as the enumeration predicted).
- **Fire-plume sprites** (`AnimDragonRageFirePlume`, all 8 spawns): static
  position at the target's own `BATTLER_COORD_X`/`Y` (`targetBattlePosition`
  — solved independently from the fire-spit's own `X_2`/`Y_PIC_OFFSET`
  anchor and confirmed genuinely distinct, not a copy/paste error), offset
  by `SetAnimSpriteInitialXOffset` (side-signed, same `sideSignedOffset`
  shape `ember.ts` established) on X and a plain add on Y. RAM-probed
  26-tick lifetime per spawn, identical across all 8 independently: a
  4/5/5/5/7-tick frame-duration pattern (first frame short one tick — the
  same "creation tick already reflects one step" idiom `slideMon.ts`
  documents; last frame held 2 extra ticks after its own countdown before
  `RunStoredCallbackWhenAnimEnds`'s own deferred-destroy fires).

`tests/dragonRage.test.ts` (11 tests) pins every mechanism against BOTH
committed RAM probes at every probed tick: schedule ticks (all 6 creation
events, both orientations — exact match, validating the interpreter
generalization), attacker/target shake offsets, both slide phases, fire-spit
position/frame/matrix (both sides), and all 8 plume spawns'
position/subpriority/frame across their full 26-tick life (both sides).

**What's NOT done — the real remainder.** `dragonRage.ts` is not wired into
`sceneOnPresentation.ts`'s move-dispatch system (`SceneOnMoveConfig` union,
`createSceneOnMovePresentation`, a `sceneOnDragonRageView` function) — that
system doesn't yet know the CHARMELEON species (a new
`SceneOnPresentationBattler.species` union member + geometry constants,
which this step DID reverse-solve precisely from the RAM probe for both
roles: attacker `X_2/Y_pic` `(72,97)` player-side / `(176,49)` opponent-side;
ONIX-as-target `X_2/Y_pic` `(176,42)` opponent-side / `(72,88)` player-side,
`battlePositionCenter` `(176,40)` / `(72,80)` — see `dragonRage.ts`'s own
geometry constants and doc comments for the derivation). No portable
comparator script (`tools/compare/dragonRagePortable.ts`, mirroring
`emberPortable.ts`) or dense-window RGB probe exists yet, so no oracle-pixel
window has run at all — the acceptance bar this move still needs.
**Remainder, in cost order:** (1) add `CHARMELEON` to
`SceneOnPresentationBattler`'s species union + wire its `spriteCorner`
(not yet solved — only the two coordinate pairs above were needed for this
step's math); (2) add a `SceneOnDragonRageConfig` case + view function to
`sceneOnPresentation.ts` calling straight into `dragonRage.ts`'s exported
functions; (3) a portable comparator + RGB probe script (mirror
`emberPortable.ts`/`tools/probe/run-battle-lab-rgb.py`); (4) dense windows
at full recorded counts, both orientations, each run twice for determinism;
(5) only then promote a coverage entry (`exact` if clean, `partial` with the
remainder named otherwise).

**Evidence.** `npm test` 2201/2201 (2190 + 11 new). `npm run build` green.


## DRAGON_RAGE rung 5: wired through the Scene-ON seam, comparator built, dense run finds a multi-tier capture-lag residual — still unsupported (2026-07-25)

**Verdict: real progress on every ordered remainder item, but no green dense
window — MOVE_DRAGON_RAGE stays *unsupported*, not `partial`, per the
rubric's own "a meaningful dense window is green" bar for `partial`.**

**Rung 5.1 — presentation wiring.** Extended `tools/extract/extract-battle-mon-pics.ts`
with `CHARMELEON` (mechanical species-list addition, same shape as
SPOINK/ARCANINE/DUGTRIO — additive only, `mon-pic-coords.json` was already
complete). Added `CHARMELEON` to `SceneOnPresentationBattler`'s species
union, a `SceneOnDragonRageConfig` + `SceneOnDragonRageView` pair, and
`sceneOnDragonRageView` to `sceneOnPresentation.ts` — driven entirely by
`dragonRageSchedule(0)` plus the already-ported `shakeMonOffsetAtRenderTick`/
`slideMonToOffsetAtTick`/`slideMonToOriginalPosAtTick`/
`dragonRageFireSpitStateAtAge`/`dragonRageFirePlumeStateAtAge` (no turn-keyed
branches, no absolute-tick constants). `battleScene.ts` gained the matching
`DRAGON_RAGE` draw case: attacker/target sprites offset by the composed
shake+slide state, the fire-spit sprite drawn via the existing
`drawSpriteSheetAffineRotate` primitive (already generic enough for a fresh
matrix, no new draw code needed), and the 8 fire-plume sprites split
front/behind the target by their own per-spawn `subpriorityOffset` (2 vs 66)
— the fire-spit-vs-attacker order reuses `dragonBreathEmbersInFrontOfAttacker`
directly, since the fire-spit's own `createsprite` subpriority
(`targetSubpriority - 2`) is the identical shape EMBER's own embers use.

**Rung 5.2 — portable comparator + RGB probe.** `tools/probe/dump-dragonrage-rgb.py`
mirrors `run-battle-lab-rgb.py`'s capture-loop/CLI shape
(`<scenario> <output> <rgb-dir>`) combined with `dump-dragonrage-full.py`'s
own template-pointer sprite/task identification, so it drives exactly like
`emberPortable.ts` drives its own probe.
`tools/compare/dragonRagePortable.ts` checks both a component read (attacker/
target offset, fire-spit position/frame/matrix, fire-plume positions — self-
calibrated against ONIX's own species-specific baseline OAM residual rather
than hardcoding it, since the residual is per-orientation) and full
framebuffer pixels. Both fixtures staged with real RAM-read HP/gender
(`tools/compare/fixtures/dragon-rage-{player,opponent}-charmeleon-*.json`):
CHARMELEON 133/133, ONIX 110/110, both male in both orientations (read
directly from the probe's own `player`/`opponent`/`*Personality` fields, not
assumed).

**A real bug the first comparator run caught immediately, fixed:** the draw
block's healthbox branch had player/opponent backwards, calling ONIX's
hardcoded-117-max-HP helper (`onixPlayerHealthboxContentForState`) for what
is actually a 133-HP CHARMELEON slot in this fixture — `composePlayerHealthbox`
threw immediately (`invalid HP 133/117`), so this was caught before any
pixel comparison ran, not silently wrong. Replaced with fully generic
`composeOpponentHealthbox`/`composePlayerHealthbox` calls keyed off a new
`SceneOnDragonRageFieldProfile` (adds explicit `playerMaxHp`/`opponentMaxHp`
— no existing shared field profile carries them, since every prior move's
fixtures reused one canonical battler's own hardcoded-maxHP helper).

**Dense run: component math is exact, framebuffer capture lag is not
uniform.** At zero capture lag (comparing the view directly against the
probe's own RAM reads, no display-timing adjustment), every mechanism's
position/frame/matrix math matches the oracle's RAM state exactly — this
reconfirms rung 3-4's Tier-1 pinning, now cross-checked against a
second, independently-captured probe. The FRAMEBUFFER (photographed pixel)
comparison is where this rung stops short: probing capture-lag values 0-3
against the cached RGB dump (player-attacker fixture) shows the lag is
**not one uniform constant** the way it is for every other staged move so
far —
- Attacker `AnimTask_ShakeMon`'s own 2-tick toggle pattern needs lag=**2**
  (149/150 frames of the pure-shake window 89-238 match at lag=2, vs.
  48/150 at the codebase's normal lag=1 — checked directly, mismatch
  direction confirmed oracle-vs-app, alternates in lockstep with the
  shake's own 2-tick period, exactly the signature of a one-tick phase
  shift, not a value error).
- The fire-spit sprite's own translation wants lag=**1**: at lag=2 (tuned
  for the shake), frame 175's diff (`108-112,97-98`: oracle shows fire
  colors `255/0/0`/`255/99/16`/`255/198/33`, app shows background) is the
  fire-spit appearing one frame EARLIER in the real oracle than the
  lag=2 model predicts.
- Target `x2` drifts by an unmodeled **-1** starting exactly at the target
  shake's own creation tick (frame 186 onward in the player-attacker
  fixture) and holds through at least frame 193 — `DRAGON_RAGE_TARGET_SHAKE`'s
  own `xOffset` is 0, so the port correctly predicts a constant x2, but
  real RAM shows it stepping down by one right at that tick. Isolated via
  the comparator's own component check (self-calibrated baseline), not
  yet root-caused (candidate: some interaction between the SlideMonToOffset
  dummy sprite's own finish branch, still alive until one tick after its
  4-tick duration per `slideMonToOffsetDestroyTick`, and the target shake
  task's creation in the same window — not confirmed).

This is the same category of finding BLAZE_KICK's own module already
documents (matrix vs. palette writes reaching the framebuffer on different
ticks) — DRAGON_RAGE has five independent mechanisms sharing one move body,
and at least three distinct lag/drift behaviors among them. Properly
resolving this needs its own per-mechanism RAM-vs-photo bisection (the
"disciplined probe cycle" the step brief calls for), which this rung's
remaining time did not allow after building and running the comparator
itself. Per the step brief's own instruction, the code is left at the
codebase's normal lag=1 default (the least speculative choice, matching
every other staged move) rather than blind-fitting lag=2 to only partially
fix the picture — `battleScene.ts`'s `DRAGON_RAGE` case is real, wired,
and buildable, but its framebuffer output does not yet match the oracle.

**Not attempted:** no exhaustive per-mechanism bisection, no opponent-
attacker-orientation framebuffer run (the player-attacker fixture's own
residual already blocks a green window), no coverage entry.

**Remainder, in cost order:** (1) bisect the target x2 drift's own root
cause (likely a short, disciplined RAM probe around ticks 185-194 of the
already-staged fixture); (2) determine whether the shake/fire-spit lag
split is genuinely per-mechanism-type (as BLAZE_KICK's own precedent
suggests) or reveals a modeling bug in one of the two RAM-tick-to-display
mappings; (3) re-run the dense comparator, both orientations, twice each,
once the residuals are resolved; (4) only then promote a coverage entry.

**Evidence.** `npm test` 2201/2201 (unchanged — no new Tier-1 test this
rung; the comparator's own findings are dev-time evidence, not production
logic). `npm run build` green.


## DRAGON_RAGE rung 5 remainder: per-mechanism lag encoded, idle-bob drift root-caused, lands `partial` (2026-07-25)

**Verdict: real, dense-verified progress (44/150 → 86/150 framebuffer frames,
player-attacker orientation) and the -1 drift is genuinely root-caused by RAM
probe, not fitting — but three named residuals remain, so `MOVE_DRAGON_RAGE`
lands `partial`, not `exact`.**

**Rung 1 — per-mechanism lag, encoded as named constants
(`dragonRage.ts`'s `DRAGON_RAGE_FRAMEBUFFER_{SHAKE,SLIDE,FIRE_SPIT,
FIRE_PLUME}_AGE_LAG`, mirroring `dragonBreath.ts`'s own `_OAM_AGE_LAG`/
`_PALETTE_AGE_LAG` split), pinned by `tests/dragonRage.test.ts`.
`battleScene.ts`'s `DRAGON_RAGE` draw case now computes four separately-
lagged views instead of one shared `age - 1`, switching the attacker's own
lag mid-flight at the exact tick it switches mechanism (shake → slide).**
A first box-isolated pixel bisection pass (`tools/compare/scratch/
dragonrage-lag-bisect{,-cached}.ts`, committed) initially suggested
shake=1/slide=0, but that pass ran through `render()` while the OLD
`battleScene.ts` code still had its own hardcoded `age - 1` underneath —
silently double-applying a lag the bisection script wasn't accounting for.
The values actually committed come from a full dense framebuffer sweep run
against the real draw path with that hidden shift removed
(`tools/compare/scratch/dragonrage-dense-cached.ts`, committed, reruns
fast against one cached oracle capture): **shake=2, slide=1, fire-spit=1**
(the last also independently confirmed by direct RAM-to-pixel correlation:
the photographed fire-spit pixels at render age 87 sit at the x2=14 column,
RAM tick 175's value, one tick behind the already-Tier-1-pinned RAM
prediction). Fire-plume lag (1) is inferred by mechanism-class analogy
only — every plume spawn spatially overlaps both the target sprite and a
sibling plume for its whole 26-tick life, so no clean isolation window
exists in this fixture to confirm it independently.

**Rung 2 — the -1 drift, root-caused by RAM probe.** Extended nothing (the
already-committed `dragonrage-full-probe-player-attacker.json` per-tick
dump already had everything needed). The step brief's own candidate
(SlideMonToOffset's dummy sprite staying alive one tick past its duration,
interacting with the target shake task's same-frame creation) is
**REFUTED**: the dummy is alive ticks 168-172 (RAM-confirmed, matching
rung 2's own prior finding); the target shake task is created at tick 186 —
a 13-tick gap, no temporal overlap at all. The REAL mechanism, read
straight from `AnimTask_ShakeMon`'s own source
(`battle_anim_mon_movement.c:98-99`): `gSprites[spriteId].x2 =
gBattleAnimArgs[1]` is an **unconditional absolute set**, not an additive
offset — it directly overwrites whatever x2 the sprite already had. RAM
shows the target sprite (ONIX) carries an unrelated x2=+1 residual from
tick 82 onward (a pre-existing idle-animation artifact, NOT part of
DRAGON_RAGE's own script — this is the SAME already-open, not-yet-source-
attributed idle-bob class `battleScene.ts`'s own materialize-window doc
comment already flags as unresolved for ONIX, see `docs/battle-menu-
notes.md` §4). When `AnimTask_ShakeMon`'s creation code runs at tick 186
(`xOffset=0` for the target shake), it clobbers that residual to exactly 0
— which is what `DRAGON_RAGE_TARGET_SHAKE`'s own model already predicts,
so the model is right FROM tick 186 onward and wrong (by the pre-existing,
out-of-scope residual) for the ~97 ticks before it. Per the step brief's
own instruction, this is named as the strictly-smaller, out-of-scope
residual rather than chased further (porting a generic species idle-bob
subsystem is a new mechanism, explicitly out of this step's scope).

**Rung 3 — dense acceptance: partial, not exact.** One dense framebuffer
run, player-attacker orientation only (time did not allow the opponent
orientation or a second run of either this step): **86/150** frames match
(up from 44/150 at the single global `age - 1` default). Three named
residuals remain, none fully chased down: (1) a single isolated frame
(render age 1) where the shake lag-2 shift pushes
`shakeMonOffsetAtRenderTick`'s own creation guard into zeroing a
legitimate just-post-creation state; (2) the idle-bob residual above,
active for the ~97 ticks before the target shake's own creation; (3) a
smaller residual inside the fire-spit sprite's own active window (render
ages 86-96) that persists at every lag value tried (0, 1, 2 all score
equal or worse than 1) — likely a `drawSpriteSheetAffineRotate` rounding
question, not a timing one, not root-caused this step.

**Not attempted:** opponent-attacker orientation dense run; a second run of
either orientation for determinism; fire-plume's own independent lag
confirmation; the fire-spit residual's own root cause.

**Coverage:** `MOVE_DRAGON_RAGE` promoted to `partial` in
`ANIMATION_COVERAGE.json` (19 exact → unchanged, 1 → 2 partial) — a
meaningful dense window (86/150, more than half) is green with the
remainder named precisely, matching the `partial` rubric.

**Evidence.** `npm test` 2202/2202 (2201 + 1 new: the four lag constants
pinned in `tests/dragonRage.test.ts`). `npm run build` green.

## Idle-motion (species send-out front-anim) subsystem enumerated + ported, DRAGON_RAGE's target -1 drift closed (2026-07-25)

**Verdict: real subsystem, source-attributed and RAM-confirmed, ported
generically and wired into DRAGON_RAGE's target-sprite path only. Dense
framebuffer match improved 86/150 → 127/150 (player-attacker orientation,
verified deterministic on two independent live oracle runs). Three
pre-existing, differently-rooted residuals remain (none newly introduced);
`MOVE_DRAGON_RAGE` stays `partial`.**

**Rung 1 — enumeration + probe.** Per the step brief's own probe-first
rule, RAM-probed ONIX's own battler sprite directly by battler index
(`gBattlerSpriteIds[0]`/`[1]`, `tools/probe/dump-onix-front-idle-anim.py`,
`src/data/gen/onix-front-idle-probe.json`) across the whole
CHARMELEON-vs-ONIX fixture — sidestepping `gBattleAnimAttacker`/
`gBattleAnimTarget`, which are stale/zeroed until `DoMoveAnim` runs
(`battle_anim.c:201-206`); the prior rung's own full-move probe had
silently been reading battler 0 twice for its "target" rows before the
move's own `gAnimScriptActive` flip, not ONIX's real sprite. The clean
probe shows ONIX's sprite (`x2=1, y2=0, animNum=1`) with an active
callback resolving to `SpriteCallbackDummy` (`nm pokeemerald.elf`:
`0x08007428`) from the fixture's very first recorded tick — the
mechanicLab staging harness fast-forwards past the send-out intro before
the trace starts, so no committed window observes the animation
mid-flight, only its already-settled terminal state.

Mapped that callback back to source: `sMonFrontAnimIdsTable[SPECIES_ONIX]
= ANIM_RAPID_H_HOPS` (`pokemon.c:1501`) → `Anim_RapidHorizontalHops`
(`pokemon_animation.c:3567-3599`), triggered once at send-out
(`BattleAnimateFrontSprite`/`DoMonFrontSpriteAnimation`,
`pokemon.c:6803-6856`). It is NOT a continuous idle loop: its own
accumulator (`data[2]`) runs 0→2040 over 86 ticks through a 4-phase
piecewise formula, then permanently freezes `x2`/`y2` at the last active
tick's value and hands off to `WaitAnimEnd` → `SpriteCallbackDummy`
(`:5540-5544`) for the rest of the battle — until an unrelated mechanism
(here, `AnimTask_ShakeMon`'s own unconditional `x2 = gBattleAnimArgs[1]`
absolute set, `battle_anim_mon_movement.c:98-99`) overwrites it.
Hand-derived source arithmetic at the last active accumulator (2040)
gives `x2=1, y2=0` — matching RAM exactly, cross-checked independently of
the terminal-state probe.

**Enumeration answers:** per-species (keyed by `sMonFrontAnimIdsTable`,
opponent/front sprite only — the player's own back sprite uses a
completely separate table/function family, `sSpeciesToBackAnimSet`/
`BACK_ANIM_*`, not explored); plays once, not looped; triggered by
send-out; keeps one accumulator (`data[2]`) plus a terminal `data[6]=0`
reset. Which other committed-fixture species share this family: only
ONIX is currently rendered on the front-sprite side in a dense window;
DRAGON_RAGE's own reverse orientation would need CHARMELEON's own front
entry (`ANIM_BACK_AND_LUNGE`, a different, unexplored multi-phase
function) — named as out-of-scope below, not ported. This connects to
`docs/battle-menu-notes.md` §4's own open item (the settled action-menu's
"idle-bob" flagged unresolved for ONIX): that item is a DIFFERENT
mechanism (`DoBounceEffect`/`SpriteCB_BounceEffect`, a `y2`-only sine
bounce, already fully source+RAM-resolved by a sibling lane's
`docs/battle-menu-idle-notes.md` §1) — the two were conflated under one
"idle-bob" label in prior doc comments, but are unrelated source
functions (one writes only `y2` and loops forever; this one writes
`x2`+`y2` and freezes after 86 ticks). Named here so a future session
doesn't re-chase `DoBounceEffect` for this residual or vice versa.

**Rung 2 — port.** `src/engine/speciesIdleAnim.ts`: a species → front-anim
family table (only `ONIX`/`RAPID_H_HOPS` populated, per the stop-threshold
rule) plus a faithful `rapidHorizontalHopsOffsetAtTick` port (all 4 phases)
and a generic `computeTerminalOffset` driver that runs the port to its own
natural stopping point rather than hardcoding the `{1,0}` result — adding
a second species/family later is a table entry plus its own step function,
not an ONIX-only special case. `tests/speciesIdleAnim.test.ts` (5 tests)
pins hand-derived per-tick values across all 4 phases plus the RAM probe's
own settled state.

**Rung 3 — wired, target-sprite path only.** `sceneOnPresentation.ts`'s
new `dragonRageTargetOffset` applies the species idle offset only when
`animationAge < schedule.targetShakeTick` AND the target is on the
opponent (front-sprite) side; at/after the shake's own creation tick,
`shakeMonOffsetAtRenderTick` alone is authoritative (matching source's
absolute-set clobber). A real bug surfaced wiring this in: the
player-attacker fixture's own `target.spriteCorner.x` was `145` (144 + the
same residual baked directly into the constant — the identical hack
`docs/aerial-ace-portable-staging-probe.md` independently used for
AERIAL_ACE's own opposite-side ONIX target, and the same one
FEATHER_DANCE/QUICK_ATTACK/BOUNCE/FLY's own SHARED ONIX-opponent presets
still use). Adding the offset on top of the already-baked corner
double-counted (146, not 145) and regressed the dense run to 0/150 before
the fixture was corrected back to the generic `144` — caught immediately
by re-running the comparator, not left in. DRAGON_RAGE's own fixture is
NOT shared with any other move's config (confirmed: no other
`sceneOnPresentation.ts` preset references `CHARMELEON`), so this fix is
scoped to DRAGON_RAGE alone; FEATHER_DANCE/QUICK_ATTACK/BOUNCE/FLY's own
shared `145` presets are untouched (their own windows never cross the
residual's reset boundary, so the baked hack still happens to be correct
for them — a real, differently-scoped remainder for whoever eventually
generalizes those, not touched this step).

**Rung 4 — dense re-run.** Player-attacker orientation: **86/150 →
127/150**, reproduced identically on two independent live oracle runs
(deterministic) and A/B-verified against the pre-fix baseline replayed
over the same cached oracle capture (`git checkout` of the prior commit's
two files against the same RGB dir) — zero regressions, only new matches
added. The three remaining named residuals are pre-existing and
unrelated to this rung's own fix (confirmed present in the pre-fix
baseline too): (1) a single-frame boundary artifact at render age 1
(shake lag-2 creation-guard interaction); (2) a fire-spit rounding
residual at render ages 86-96 (not a lag question — lag 0/1/2 all score
equal or worse); (3) newly isolated (previously hidden under the broader
pre-fix mismatch range) at render ages 98 and 105-114, coinciding with
the fire-plume spawns' own creation window — candidate cause is the
fire-plume framebuffer lag, already flagged as inferred-by-analogy rather
than independently confirmed. Per the step brief's own rule, since the
player orientation isn't fully clean, the opponent-attacker orientation
was not attempted this rung (it would also need CHARMELEON's own
`ANIM_BACK_AND_LUNGE` front-anim family ported first).

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` (19 exact / 2 partial
unchanged) — `remaining` updated with the new 127/150 count and the
narrowed residual list.

**Evidence.** `npm test` 2207/2207 (2202 + 5 new). `npm run build` green.
## DRAGON_RAGE rung 6/7: fire-plume z-order fixed via `gMain.oamBuffer` RAM probe (139/150 → 149/150); age-98 ONIX-silhouette anomaly disciplined-probed, both named candidates eliminated, lands `partial` with a single-frame remainder (2026-07-25)

**Verdict: the fire-plume family's tie-break residual (render ages 105-114)
is FIXED on direct hardware evidence, not fitted — the step's own two
sanctioned instruments (RUNG 1's `gMain.oamBuffer` probe, RUNG 2's VRAM/blend
probe) were both applied exactly as specified. RUNG 1 landed a real fix.
RUNG 2's probe cycle completed cleanly but named no fix (both brief
candidates eliminated by hard evidence) — per the step's own PARK RULE,
`MOVE_DRAGON_RAGE` stays `partial`, now with a single remaining frame.**

**Rung 1 — plume-vs-plume z-order ties, FIXED.** Wrote
`tools/probe/dump-dragonrage-oam.py` (ISSUES #32 lineage: the same
`gMain.oamBuffer`-array-position instrument `dump-turn9-clone-oam.py`/
`dump-aerialace-oam.py`/`dump-quickattack-hitsplat-oam.py` already used,
matching each live fire-plume/target sprite's own OAM attrs against the
128-entry composited buffer to find its real final position — lower
position = lower hardware OAM index = drawn on top, this codebase's already-
established `AddSpritesToOamBuffer` convention). Ran it across RAM ticks
183-206 (render ages 94-117) against the committed CHARMELEON-vs-ONIX
fixture. Cross-referencing each RAM slot's `(x,y)` against
`DRAGON_RAGE_FIRE_PLUME_SPAWNS`' own declared offsets gave an exact,
unambiguous spawn-index↔slot mapping for all 7 spawns observed in this
window. The 8 spawns share only 2 distinct subpriorities
(`targetSubpriority ± 2`), so cross-group order was never the problem
(confirmed correct already); the real-hardware order WITHIN each group,
read directly off the buffer at every tick both members of a pair were
alive, resolved to one consistent, source-consistent rule with zero
exceptions: primarily sort by absolute screen Y (higher Y wins, drawn more
in front — the ordinary `SortSprites` same-priority/different-Y tie-break);
ONLY on an exact Y tie (this move's own script has two: spawns 0/4 share
y-offset 0, spawns 2/6 share y-offset 25) does the EARLIER-created spawn
win instead (spawn 0 beats spawn 4 at every tick from RAM 195-206; spawn 2
beats spawn 6 at every tick from RAM 204-206) — matching this codebase's
already-established "ascending creation order survives an exact tie"
convention elsewhere (§7.26/27, `spriteOrder.ts`'s own module doc), NOT the
previously-shipped code's raw script-order paint loop, which was ALSO wrong
for at least one non-tied pair (spawn 3's higher Y should beat spawn 4's,
but script order painted spawn 4 after spawn 3). Per the brief's own
instruction (encode per-instance params for exactly these plume pairs, not
a whole-history `sSpriteOrder` simulation), landed `orderFirePlumesForDraw`
(`dragonRage.ts`) — a plain `(y, then descending spawnIndex)` comparator,
not a persistent scheduler — replacing the naive script-order draw loop in
`battleScene.ts`'s DRAGON_RAGE case. Tier-1 pinned directly against the two
RAM-read tie orderings plus a full-group ordering check (`tests/
dragonRage.test.ts`, 3 new tests). Dense sweep: **139/150 → 149/150** (every
render age 105-114 now clean, zero regressions), reproduced byte-identical
on two independent fresh oracle runs (determinism confirmed).

**Rung 2 — age-98 ONIX-silhouette anomaly, disciplined-probed, no fix
survived.** Extended the same instrument class with a second targeted probe,
`tools/probe/dump-dragonrage-onix-vram.py`, reading ONIX's own OBJ VRAM tile
range (`tileNum=473`, 4bpp, 64 tiles/2048 bytes) and hashing it every tick
from RAM 80 through 190. Both of the step brief's own named candidates were
checked directly and BOTH eliminated:
- **(a) Runtime VRAM overwrite (`LoadBallGfx` precedent):** the VRAM hash is
  completely STABLE and unchanged across the entire target-shake-creation
  window (RAM 186 onward) — the only hash change in the whole probed range
  is one unrelated `tileNum` swap at RAM tick 80→82 (ONIX's send-out
  graphic settling in), long before this move even starts. No overwrite
  occurs anywhere near the residual's own tick. Eliminated.
- **(b) OBJ-over-OBJ blend-to-BG compositing gap (#112 precedent):** the
  existing `dump-dragonrage-oam.py` probe's `BLDCNT`/`BLDALPHA` reads are
  `0x0`/`0x0` (no color special effect enabled at all) at every tick in this
  window, and ONIX's own OAM `affineMode` is `0` (no affine transform, ruling
  out a scale/rotate resampling explanation too) throughout. Eliminated.

With both named mechanisms ruled out, re-examined the mismatch itself
directly (`tools/compare` diff, not committed — scratch): 1598px confined
exactly to ONIX's own sprite bounding box (x149-204, y12-73), every
mismatched color one of ONIX's own known palette shades swapping between
NEARBY screen positions (e.g. `(222,214,214)` at one pixel, `(189,181,181)`
— another real ONIX shade — right next to it and vice versa) — the
signature of a small spatial misregistration of the whole sprite for this
one tick, not a wrong tile or a color-math bug. The target sprite's own
already-modeled state (position, x2/y2, animNum, animCmdIndex, invisible,
subpriority, matrixNum, and now also affineMode) is RAM-confirmed clean and
matches this port's own prediction through the whole window — this is the
SAME finding the prior rung already reached, now extended to rule out the
two remaining named hypotheses too. **No fix shipped**: per this run's own
standing policy (documented no-fix beats a blind fit), this residual needs a
different investigative angle than RAM-state/VRAM/IO-register comparison —
named here, not chased further. Candidate for a future session: a fixture
with less concurrent sprite creation at this exact tick (both the target
shake task AND fire-plume spawn 0 are created simultaneously here), to
separate a genuine engine gap from a possible emulator/hardware sub-frame
ordering effect this per-tick discrete model can't represent at all.
Confirmed deterministic (byte-identical mismatch on a second independent
fresh oracle run).

**Coverage:** `MOVE_DRAGON_RAGE` stays `partial` — `remaining` updated to
149/150 (up from 139/150), a single residual (render age 98).

**Evidence.** `npm test` 2212/2212 (2209 + 3 new: `orderFirePlumesForDraw`
pinned against the RAM probe). `npm run build` green. Dense sweep reproduced
byte-identical on two independent fresh oracle runs.

## MOVE_GROWTH rung 3 completed, rung 4 done: scene-wired and dense-compared both orientations, lands `partial` (target exact, attacker residual named) (2026-07-25)

**Verdict: real progress, not a fit.** Completed rung 3 (`GrowthEffect` =
`blend_color_cycle` + `AnimTask_ScaleMonAndRestore`, both RAM-probed to
share one creation tick per call, second call starting exactly 32 ticks
after the first) as `growthAnimationAtAge` (`src/engine/growth.ts`,
`tests/growth.test.ts` 4/4). Extracted IVYSAUR's battle back/front sprites
(CHARMELEON/HAUNTER precedent, `extract-battle-mon-pics.ts`). Wired
`sceneOnGrowthView` + a `battleScene.ts` GROWTH draw case through the
existing `drawSpriteSheetAffineStretch` tint/affine path other moves
already use for palette flashes — `doubled` follows BIND's own precedent
(ANY active affine transform sets `ST_OAM_AFFINE_DOUBLE` on real hardware,
not just over-256 scales).

**Dense comparator (rung 4).** `tools/compare/growthPortable.ts` + two
fixtures, whole 63-frame window per orientation (oracle ticks 211-273,
every frame captured), against the committed `mechanic-growth-*` fixtures.
Component check (attacker affine matrix vs RAM) is **63/63 both
orientations** — the newly-ported mechanism is RAM-exact at every tick,
including age 0's already-nonzero scale. First run surfaced a **full-window
framebuffer loss (0/63)**; pixel-dumped the diff before guessing and found
it traced entirely to the TARGET (ONIX), not the new mechanism — ONIX
(opponent-side front) was missing the already-ported send-out front-sprite
idle residual (`speciesIdleAnim.ts`'s `speciesFrontIdleRestOffset`, the same
"settles at x2=+1" finding DRAGON_RAGE/SHADOW_PUNCH's own dense windows
already required) because GROWTH never runs `AnimTask_ShakeMon` on its
target to overwrite it. Wiring that residual in made the target box
pixel-exact in both orientations.

**Lands `partial`: framebuffer 3/63 both orientations**, reproduced
byte-identical (component and framebuffer counts, bbox, px counts) on two
independent runs each — deterministic. Every remaining mismatch is confined
to IVYSAUR's (the attacker's) own sprite box in both orientations
(player-back: 728px, bbox 48,67-96,111; opponent-front: 585px, bbox
156,28-196,72), a salt-and-pepper pattern on high-detail regions (the
flower bud), not a shift or color swap. Since the affine-matrix component
check is exact at these same frames, the newly-ported blend mechanism isn't
implicated — the pattern matches `speciesIdleAnim.ts`'s own already-named
gap (IVYSAUR isn't yet in `SPECIES_FRONT_ANIM_FAMILY`, and the back-sprite
send-out idle family is explicitly documented there as a separate, unported
mechanism). Not probed/ported this step (a new RAM probe, out of this
rung's time budget) — named, not chased blind, per this run's own
no-blind-fit policy.

**Coverage:** added `MOVE_GROWTH` to `ANIMATION_COVERAGE.json` as `partial`.

**Evidence.** `npm test` 2443/2443 (2439 + 4 new `growth.test.ts`). `npm run
build` green. Both comparators reproduced byte-identical on two independent
runs each.

**Next action for a future session:** RAM-probe IVYSAUR's own send-out
settle offset (both front and back sprite forms — `tools/probe/dump-onix-
front-idle-anim.py` is the direct precedent) and extend
`speciesIdleAnim.ts`'s `SPECIES_FRONT_ANIM_FAMILY`, or add an attacker-side
equivalent of `speciesFrontIdleRestOffset` for the back-sprite family, then
re-run `growthPortable.ts` to confirm `exact`.

**Housekeeping:** moved the superseded "rungs 1-2 done, rung 3 partial"
section (this same move, now complete through rung 4), the "BG-swap
pipeline" dissolution section, and the "SHADOW_PUNCH lands partial (third
session)" section to `ANIMATION_PROGRESS-archive.md` to keep ~3 live
(AGENTS.md's convention); `blend_color_cycle` family map and DRAGON_RAGE
rung 6/7 stay live alongside this one.

## Knock Off opposite orientation closed; promoted to exact (2026-07-26)

**Verdict:** `MOVE_KNOCK_OFF` promotes **partial → exact**. Its complete
move-owned Scene-ON body is source component/RAM-exact and framebuffer-exact
through the shared seam in both required orientations, each reproduced twice:
player-back PLUSLE → opponent-front ONIX is **59/59** (oracle 70-128), and
opponent-front PLUSLE → player-back ONIX is **59/59** (74-132). Census:
**24/276 exact, 3 partial**.

**Source/geometry:** the complete legal opposite mechanicLab fixture places
SHUPPET in opponent battle RAM and ONIX in player battle RAM, while the source
route's already-loaded chrome truthfully remains opponent-front PLUSLE and
player-back ONIX. HorizontalLunge, ShakeMonInPlace, SlideMonToOffset, and
SlideMonToOriginalPos required no new timing or species variant. The only new
display dependency is source-declared: `AnimKnockOffStrike` starts affine
program 1 when the target is player-side (`xScale=-256`, `rotation=+4`) and
applies literal argv[0] with `x -= -16` instead of the opponent target's
`x += -16`. PLUSLE's 40×48/yOffset-14 front source uses corner `(144,22)`;
ONIX reuses the established player-back corner `(40,48)`. All selection is by
battler side/species geometry—no oracle frame, turn, damage, RNG, or facility
branch.

**Evidence:** new legal fixture
`mechanic-knock-off-opponent-shuppet-player-onix.json`, portable fixture
`knock-off-opponent-onix-player-plusle.json`, generalized
`knockOffPortable.ts`, source-extracted PLUSLE front art, and focused Tier-1
asset/geometry/seam tests. Fresh acceptance: KNOCK_OFF **59/59 component +
framebuffer ×2 in both orientations**. BIND regression: **45/45 component +
framebuffer ×2 in both orientations**. `MOVE_SUPER_FANG` stays unsupported:
its full body additionally needs `gSuperFangSpriteTemplate`,
`AnimTask_BlendMonInAndOut`, palette blend, and independent dense evidence.
`MOVE_SECRET_POWER` stays unsupported: the Factory building branch dispatches
to `Move_STRENGTH`, while other environments dispatch to distinct bodies.
Shared reducers promote neither sibling. Implementation commit: `a6df4ee`.
## ACID promoted to exact; poison-bubble track established (2026-07-27)

**Verdict:** `MOVE_ACID` is exact through the shared Scene-ON seam in both
required orientations, each reproduced twice. Player-back EKANS is **131/131
component/task/RAM/palette and framebuffer frames** (oracle 76-206);
opponent-front EKANS is **131/131** (80-210). Census: **30/276 exact, 3
partial, 243 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage EKANS, the real
Level-50 Factory set-53 carrier, with all four choices constrained to ACID;
ONIX is constrained to TACKLE. The reducer ports all three literal
`gAcidPoisonBubbleSpriteTemplate` 40-callback arcs, attacker-side mirroring,
animation selection and average target geometry; both literal
`AnimTask_ShakeMon2(target/defender partner,2,0,10,1)` calls (only the target
has a visible singles sprite); the defender-side delay-2 two-leg
`blend_color_cycle`; and all five delayed fixed-point/looping-affine
`gAcidPoisonDropletSpriteTemplate` bodies. The Scene-ON compositor preserves
`monbg`/`clearmonbg`, faded BG+OBJ palette rows, one-frame position/affine
display latches, side-specific battler overlap, and the shared persistent
`sSpriteOrder` reducer's y sort, destruction, and low-slot reuse.

**Sibling audit (no promotions):** TOXIC retains two four-sprite
`ToxicBubbles` waves plus the separate six-sprite `PoisonBubblesEffect`;
SLUDGE needs its sludge projectile, target ShakeMon, delay-1 blend, and
PoisonBubblesEffect; SLUDGE BOMB needs ten projectiles, twelve hit particles,
its distinct ShakeMon2/blend/waitsound body, and PoisonBubblesEffect; POISON
FANG needs the fang sprite, target ShakeMon, four-leg palette cycle, and
PoisonBubblesEffect; POISON TAIL needs metallic shine, lunge, hitsplat,
ShakeMon, alpha/monbg teardown, and PoisonBubblesEffect. All remain
unsupported without independent dense move acceptance.

**Evidence/controls:** legal fixtures, reproducible extractor, dense
task/OAM/hardware-OAM/palette/RGB probe, portable comparator, and focused
Tier-1 tests are committed. Acceptance is **131/131 ×2 in both
orientations**. After the final renderer change WATER GUN remains **111/111**,
SUPERSONIC **51/51**, and BIND **45/45**, both orientations; ShakeMon2 and
the animation import boundary remain green.
## CALM MIND promoted to exact; palette-exclusion track established (2026-07-27)

`MOVE_CALM_MIND` is exact through the shared Scene-ON seam in both required
LUNATONE orientations, each reproduced twice at **101/101 component and
framebuffer frames**. The source reducer covers the complete
BlendBattleAnimPalExclude/monbg/non-attacker visibility, three shrinking thin
rings, reverse blend, and cleanup body. SKY ATTACK, DESTINY BOND, HEAL BELL,
LUSTER PURGE, and SILVER WIND retained distinct remainders and were not
promoted. See git history for the full former live-ledger entry.

## MOVE_MOONLIGHT promoted exact; GREEN_SPARKLE track bounded (2026-07-29)

**Verdict:** `MOVE_MOONLIGHT` is exact. The lowest suitable legal Level-50
carrier is challenge-0 set **167** `FRONTIER_MON_GLOOM_1` (species **44**,
Moonlight **236**, Quirky, SpAttack+HP, Persim Berry). Complete legal
three-mon Scene-ON parties pass the entire body through first inactive cleanup
at **352/352** frames **207–558** in both orientations, twice fresh.
Player-back evidence/raw digests are
`5486f398b5a29f20da4c97c6d67315973e01746b498250af3f5ea2aae116776b` /
`433d0a9869f2ef60f0b68c812dce3ef9f2d1b8944bb54beba63a39f3c82e13bf`;
opponent-front digests are
`fdf3da2cd3ea60d4be20f7d040f917cc302562da145e5a04fa9d750147e55b0d` /
`83e6ccdfd48c9380fbead22b3b80af91202c3e04540d1e26798eaea60d1a6e1e`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port MOON/GREEN_SPARKLE/BLUE_STAR tag and palette lifetimes, the
fixed moon, all **five** staggered sparkle lifecycles, alpha registers,
Moonlight's special black-to-near-white BG/battler/effect palette pipeline,
audio, the complete four-star shared `HealingEffect` tail, OAM/VBlank order,
and cleanup. Gloom and all effect art regenerate byte-for-byte from pinned
source. Immutable HP **143/153**, weather-none, and half-maximum heal metadata
cross only as verification inputs; healing outcome/timing, HP, weather
calculation, RNG, controller/turn/facility state, boundaries, and barriers are
unchanged.

**Sibling/control:** `MOVE_PRESENT` remains **unsupported**. It has a distinct
`AnimTask_IsHealingMove` dispatch and ITEM_BAG projectile, then either five
EXPLOSION damage sprites or nine GREEN_SPARKLE heal particles followed by
target `HealingEffect2`; both conditional bodies still need independent
complete legal both-orientation twice-fresh proof. `MOVE_RECOVER` was rerun
fresh as the shared BLUE_STAR/HealingEffect control and remains **169/169**
exact in both orientations. Coverage is **87 exact / 0 partial / 0 staged /
189 unsupported**.

## MOVE_PERISH_SONG promoted exact; MUSIC_NOTES_2 track bounded (2026-07-29)

**Verdict:** `MOVE_PERISH_SONG` is exact. The lowest suitable legal Level-50
carrier is challenge-2 set **289** `FRONTIER_MON_MURKROW_2` (species **198**,
Perish Song **195**, Quirky, HP+Defense+SpDefense, BrightPowder). Complete
three-mon Scene-ON parties pass the entire body through first inactive cleanup
at **259/259** frames in both orientations, twice fresh. Player-back frames
**71–329** have evidence/raw digests
`2127f8270310ceae01c00debfafdfb276ad80cfbb422b26672b27a21846b9250` /
`85d2c46b94112f9f5a30c076e58c5cf58a70e4f38fe9c3b6f008d6416e5edfc6`;
opponent-front frames **75–333** have
`0bd858e7ba1571ab2545d4d2e9d2ad0cff7562ae2c27ac7a71ae5968580d0597` /
`b68c78f41dec5baa09ae444b312822d747c53af3e81e4cd598e6aa8b42482b6d`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port all **16** `gPerishSongMusicNoteSpriteTemplate` fixed-point
paths, tile animations, affine half-turn, hold/four-bounce cleanup, the
invisible `gPerishSongMusicNote2SpriteTemplate` grayscale-palette sentinel,
MUSIC_NOTES_2 tag/palette lifetime, side-relative panse, both BG-black fades,
four battler grayscale/original transitions, OAM/VBlank order, display
register/callback state, and cleanup. Source-extracted Murkrow front/back and
MUSIC_NOTES_2 assets reproduce byte-for-byte. Immutable HP/items and both
Perish timers (**3**) cross only as verification inputs; gameplay RNG,
damage, timer advancement, controller/turn/facility state, import boundaries,
and unsupported barriers are unchanged.

**Sibling/control:** `MOVE_HEAL_BELL` remains **unsupported**. Its independent
body adds BELL, explicit MUSIC_NOTES_2 palette load/free, twelve note paths,
three ring/palette groups, healing particles, two star families, asset
unload/reload boundaries, `BlendBattleAnimPalExclude`, and distinct timing;
it has no complete legal both-orientation twice-fresh dense proof.
`MOVE_SING` remains the independently exact note/compositor control. Coverage
is **86 exact / 0 partial / 0 staged / 190 unsupported**.

## MOVE_HOWL promoted exact; NOISE_LINE track bounded (2026-07-29)

**Verdict:** `MOVE_HOWL` is exact. Lowest suitable challenge-0 Level-50
carrier set **144** `FRONTIER_MON_LOUDRED` (species **371**, Howl **336**,
Relaxed, Attack+HP, Focus Band) drives complete legal three-mon parties
against ONIX. Both Scene-ON orientations pass the full source body through
first inactive cleanup at **102/102** frames, twice fresh. Player-back frames
**209–310** have evidence/raw digests
`ac6bb4eebe0376d3441bc1e50ff4c33a4fe39f87dccb41483c440b9f167f93bb` /
`1f19b38ed924b20fb4648adc24dea85a2be05460092df83d0d7991fa7a87a269`;
opponent-front frames **209–310** have
`1d08643804a400521689181b7d71431ad59a1c5a027498d7106e992d02b6e587` /
`83ad92a022ee5484e24c8e78b49996c5692443bc76e7aef430b2ae15cedf0eac`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port NOISE_LINE load/free, all six `RoarEffect` sprites,
`AnimTask_DeepInhale` affine/y-offset/shake behavior, high-pitch cry task and
audio, script waits, OAM/matrix/display latches, allocation order, tagged
source-extracted art, and cleanup. Immutable Attack stage **7** crosses the
presentation seam only as verification input; Howl's outcome, gameplay RNG,
damage, controller/turn/facility state, boundary list, and unsupported barriers
are unchanged. `MOVE_ROAR` remains **unsupported** because its source body adds
`ScaleMonAndRestore`, `SlideOffScreen`, double-cry/wait tasks,
monbg/splitbgprio/alpha choreography, and lacks independent complete dense
both-orientation evidence. Coverage is **85 exact / 0 partial / 0 staged /
191 unsupported**.

## MOVE_REST promoted exact; LETTER_Z track bounded (2026-07-29)

**Verdict:** `MOVE_REST` is exact. Lowest suitable challenge-0 Level-50
carrier set **117** `FRONTIER_MON_TEDDIURSA` (species **216**, Rest **156**,
Relaxed, Attack+HP, Chesto Berry) drives complete legal three-mon parties
against ONIX. Both Scene-ON orientations pass the complete source body through
first inactive cleanup at **110/110** frames, twice fresh. Player-back frames
**334–443** have evidence/raw digests
`8f482a75532d55a5518581b5cebe02b69741dbe913b87dafd4637dc79d68d9c6` /
`3a9f0a794e93bbb68b485748733866ed27477d59577b7a4905642dd7655f2d63`;
opponent-front frames **338–447** have
`24fd57122beb8e307e02bd6e9d427ece5c602c2188f0b47f847ba1593ea082d3` /
`6caad649f87c5bef7bc1098629addf19981c7ce4ed9d2db4dc0f1e8d25e86a67`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port LETTER_Z load/free, attacker-panned Snore audio, all **three**
staggered `gSleepLetterZSpriteTemplate` callbacks, fixed-point ascent,
side-dependent affine programs, OAM/VBlank latches, tagged source-extracted
art, 60-frame lifetimes, waits, and cleanup. Immutable Rest sleep/status/
pending-heal state crosses the presentation seam only as verification input;
the shared Metronome control remains **127/127** exact twice fresh in both
orientations. Rest
healing, sleep state/duration, RNG, controller/turn/facility state, the
animation boundary list, and unsupported barriers are unchanged.
`MOVE_SLEEP_TALK` remains **unsupported**: it has a distinct nine-sprite
`gLetterZSpriteTemplate`/`AnimLetterZ` body plus `AnimTask_SwayMon`, without
independent complete legal both-orientation twice-fresh dense acceptance.
Coverage is **84 exact / 0 partial / 0 staged / 192 unsupported**.

## MOVE_WISH promoted exact; GOLD_STARS track bounded (2026-07-28)

**Verdict:** `MOVE_WISH` is exact. Lowest suitable challenge-0 Level-50
carrier set **173** `FRONTIER_MON_ILLUMISE_1` (species **387**, Wish **273**,
Quirky, Attack+HP, Liechi Berry) drives complete legal three-mon parties
against ONIX. Both Scene-ON orientations pass the complete source body through
first inactive cleanup at **271/271** frames, twice fresh. Player-back frames
**65–335** have evidence/raw digests
`9bd713db92f51208dba4faea9916549981545a864fd50bb7761b13ae00e7077b` /
`2f82ec073d7f7e52b5a513733b991ef792b374d72c9b40c535f1e42438b86488`;
opponent-front frames **69–339** have
`8c223ec57b228721dd6df2137b8597388b44d4749cd501d898ec4c4da9be2669` /
`f858c38f13030f4d3a173776ee2a1319835f2089b61f8b7ac6484f12a859315d`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port both black BG palette ramps, the cross-screen GOLD_STARS Wish
star, all **21** presentation-`Random2` mini-star variants/blinks, the
60-frame hold, both SPARKLE_2 GrantingStarsEffect translations, pan-adjusted
Reflect and looped Heal Bell audio tasks, OAM/display order, tagged assets,
and cleanup using byte-identical source-extracted Illumise/GOLD_STARS/
SPARKLE_2 art. The already-exact Synthesis granting-star control remains
**130/130** in both orientations. `MOVE_METEOR_MASH` remains **unsupported**:
it adds `BG_COSMIC`, three target-relative spinning stars, a spinning fist,
IMPACT, target `ShakeMon2`, background restoration, and distinct audio/timing,
without independent complete legal both-orientation twice-fresh acceptance.
Coverage is **83 exact / 0 partial / 0 staged / 193 unsupported**; Wish battle
state/healing timing and outcome, damage, gameplay RNG, controller/turn/
facility state, boundary list, and unsupported barrier are unchanged.

## MOVE_SANDSTORM promoted exact; FLYING_DIRT track bounded (2026-07-28)

**Verdict:** `MOVE_SANDSTORM` is exact. Lowest challenge-0 legal Level-50
carrier set **120** `FRONTIER_MON_PHANPY` (species **231**, Sandstorm **201**,
Naughty, Attack+HP, Lax Incense) drives complete legal three-mon parties
against ONIX. Both Scene-ON orientations pass the full source body through
first inactive cleanup at **168/168** frames, twice fresh. Player-back frames
**210–377** have evidence/raw digests
`678cbc9073564cec54c76709704009d17586b45f1301dc129d13c840b0337b1e` /
`2968b95f680be00e14cb3386487629b142eb0ac05910f1dad69da7dc885e9958`;
opponent-front frames **305–472** have
`ba90eb87f3466644cf4e3c085231265bf7138fcd0e2d286a41574e35f9af12d2` /
`151561fae96ddc3d919e3f0254b987162cd9e078e92c5e414b4e0a9689edd2e4`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port FLYING_DIRT load/free, source sandstorm BG tile/palette load,
wrapped **-6/-1** BG1 scroll, **0→7 / 101-count hold / 7→0** alpha, all
**seven** staggered fixed-point flying-sand crescents, and cleanup using
byte-identical source-extracted Phanpy/front-back/background/particle assets.
Software tasks/sprites, OAM/matrices, tags/palettes/registers, both audio
players, raw RGB, and the shared framebuffer are dense-exact. The previously
exact Needle Arm compositor control remains **108/108** twice fresh in both
orientations. `MOVE_HEAT_WAVE` remains **unsupported**: source audit proves
distinct red particle/background blends, mirrored BG, pan sweep, target
motion, and its own seven-crescent schedule; it has no independent complete
legal both-orientation twice-fresh evidence. Coverage is **82 exact / 0
partial / 0 staged / 194 unsupported**; no damage/weather outcome, RNG,
controller/turn/facility state, boundary list, or unsupported barrier changed.

## MOVE_NEEDLE_ARM promoted exact; GREEN_SPIKE track bounded (2026-07-28)

**Verdict:** `MOVE_NEEDLE_ARM` is exact. Lowest legal Level-50 carrier set
**125** `FRONTIER_MON_CACNEA` (species **344**, Needle Arm **302**, Quirky,
Attack+HP, Sitrus Berry) drives complete source-catalog parties against ONIX.
Both Scene-ON orientations pass the full source body through first inactive
cleanup at **108/108** frames **223–330**, twice fresh. Player-back
evidence/raw digests are `f6f26ca98a0aea08c1bd5c9fef4553443c93c260d829ed0609c41ef26935d10c`
/ `bbb4ea8404fbde111de1c1dfe91d45d47033b2f0522754695d4d7ed5f21db0f6`;
opponent-front digests are
`75a2df84d96ea99f2cb2b584a67a338d419c565a14c7bc726f7bf7a8aaf20470`
/ `291b07d72166df08330fd95741f84ea0d14918c57602114968143ca9bd48d1e1`.

**Model/boundary:** the pure relative reducer, typed seam, and narrow
compositor port all **20** GREEN_SPIKE lifecycles (twelve staggered inward,
eight outward), fixed-point translation/affine rotation, the source
interpreter's seven-sprite pending tick, target ShakeMon2, IMPACT hitsplat,
HANDS_AND_FEET fist, tagged loads, OAM/VBlank latches, Y/crossing painter
order, audio, and cleanup using source-extracted Cacnea/GREEN_SPIKE art.
`MOVE_SPIKE_CANNON` remains **84/84** twice-fresh in both orientations as the
nearby exact control. `MOVE_SECRET_POWER` remains **unsupported**: Factory's
building environment dispatches to Strength, not its grass-only Needle Arm
body. Coverage is **81 exact / 0 partial / 0 staged / 195 unsupported**; no
battle/controller/RNG/facility state, boundary list, or unsupported barrier
changed.

## MOVE_FOLLOW_ME promoted exact; finger-metronome track closed (2026-07-28)

**Verdict:** `MOVE_FOLLOW_ME` is exact. The lowest suitable Level-50 carrier
is set **183** `FRONTIER_MON_TOGETIC_1` (species **176**), with its pinned
Relaxed/Defense+HP/Lax Incense identity and complete source-set parties.
Both Scene-ON orientations pass the full body through first inactive cleanup
at **185/185** twice fresh. Player-back frames **69–253** have evidence/raw
digests `5aefcc2e…2cb871` / `99d4031b…3ffd96`; opponent-front frames
**73–257** have `74485aa1…be0e0` / `7518f7d5…ea1bf`.

**Model/boundary:** the relative reducer, typed seam, and narrow compositor
port the FINGER load/palette/tile lifetime, attacker top-center/clamp,
normal-affine grow, 13-frame delay, sine traversal and both subpriority
crossings, handoff to Metronome's three-wag/shrink terminal callback,
TAIL_WHIP/ATTRACT/looped TAIL_WHIP audio, OAM/matrices/registers, raw RGB,
and cleanup using source-extracted Togetic plus byte-identical shared FINGER
art. `MOVE_METRONOME` remains **127/127** twice-fresh in both orientations
with unchanged digests as the control. Coverage is **80 exact / 0 partial /
0 staged / 196 unsupported**; no battle/controller/RNG/facility state,
animation boundary list, unsupported barrier, or non-FINGER sibling changed.

## MOVE_METRONOME promoted exact; ANIM_TAG_FINGER track established (2026-07-28)

**Verdict:** `MOVE_METRONOME` is exact. The lowest suitable Level-50 carrier
is set **227** `FRONTIER_MON_CHANSEY_1` (species **113**), not the lower-tier
Cleffa set. Complete legal challenge-1 CHANSEY→ONIX Scene-ON parties pass the
source body through first inactive cleanup at **127/127** reducer/seam,
tagged tile/palette, hardware OAM/matrix/order, register/audio, raw-RGB, and
shared-framebuffer frames in both orientations twice fresh. Player frames
**245–371** have evidence/raw digests `01f259da…66e02` /
`24940bca…176af`; opponent frames **244–370** have
`cdae46f8…e6881` / `06e94878…4f8f6`.

**Model/boundary:** the pure relative reducer and typed seam port both tagged
loads, the thought bubble's forward/hold/reverse lifecycle, the finger's
grow/three-wag/shrink affine program and terminal callbacks, OAM display
transfer, METRONOME plus three TAIL_WHIP restarts, and cleanup using
source-extracted Chansey/FINGER/THOUGHT_BUBBLE assets plus shared ONIX/chrome.
TAUNT remains a fresh **125/125** nearby exact control.
`MOVE_FOLLOW_ME` stays unsupported: its distinct
`gFollowMeFingerSpriteTemplate`/`AnimFollowMeFinger` uses attacker top-center
geometry, normal affine OAM, a 13-frame delay, horizontal sine traversal with
subpriority crossings, then the terminal Metronome shrink callback, plus
distinct METRONOME/ATTRACT/looped TAIL_WHIP timing. It still needs its own
complete legal both-orientation twice-fresh acceptance. Coverage is **79
exact / 0 partial / 0 staged / 197 unsupported**; no battle/controller/RNG/
facility state, boundary list, unsupported barrier, or sibling status changed.

## MOVE_TICKLE promoted exact; RockMon/EYE_SPARKLE track complete (2026-07-28)

**Verdict:** `MOVE_TICKLE` is exact. Corrected legal Level-50 set-138
OMANYTE→ONIX Scene-ON parties pass the complete source body through first
inactive cleanup at **205/205** reducer/seam, immutable source/hardware/audio,
raw-RGB, and shared-framebuffer frames **288–492** in both orientations,
twice fresh. Player evidence/raw digests remain `509f6618…7e41c4` /
`5b6253ce…12da8c`; opponent digests remain `c4327c31…3e5447` /
`b06ea14f…9323a5`.

**Model/boundary:** the typed relative seam and narrow compositor port both
eye lifecycles, black palette ramps, DETECT, SwayMon, target
RockMonBackAndForth, the Tail Whip loop, front-idle offset, palette/OAM
latches, affine-double clipping, and cleanup using source-extracted species
138 assets plus shared ONIX/chrome. The corrected eye-coordinate test now
pins the source `GetBattlerSpriteCoord` center. Coverage is **78 exact / 0
partial / 0 staged / 198 unsupported**; no battle/controller/RNG/facility
state, boundary list, unsupported barrier, or sibling acceptance changed.

## MOVE_TICKLE corrected legal-Omanyte dense-ROM evidence checkpoint; production remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_TICKLE` remains unsupported;
coverage is unchanged. The former Omastar receipts are superseded: pinned
Emerald maps `FRONTIER_MON_OMANYTE` set **138** to `SPECIES_OMANYTE` **138**
(`SPECIES_OMASTAR` is 139). Corrected complete legal Scene-ON mechanicLab
parties against ONIX reproduce the complete source body through first inactive
cleanup at **205/205** frames **288–492** in both orientations, twice fresh.
Player-back Omanyte evidence/raw-RGB: `509f6618…7e41c4` /
`5b6253ce…12da8c`; opponent-front Omanyte: `c4327c31…3e5447` /
`b06ea14f…9323a5`.

**Evidence/source:** the audit derives the constants and carrier relationship,
and regenerated OMANYTE/EYE_SPARKLE assets name species 138. `Move_TICKLE`
loads EYE_SPARKLE, performs palette ramps, two sparkle lifecycles,
attacker-panned DETECT, `SwayMon(0,6,1280,3)`, target
`RockMonBackAndForth(6,2)`, and the 8×8 target-panned TAIL_WHIP loop. The
portable comparator twice-fresh-pins both corrected orientations, including
source offsets, topology, OAM, matrices, palettes/tags/buffers, registers,
audio, every raw RGB frame, and inactive cleanup.

**Boundary:** reusable reducer remains a checkpoint only; CHARM/COVET do not
promote Tickle. No runtime seam/compositor, battle state, boundary list, or
unsupported barrier changed.

## MOVE_LEAF_BLADE independent dense-ROM evidence checkpoint; production remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_LEAF_BLADE` remains unsupported;
it is not staged, partial, or exact, and the coverage census is unchanged.
Source-verified Level-50 Factory set **453** `FRONTIER_MON_SCEPTILE_1`
(species **279**, Leaf Blade **348**) drives complete legal Scene-ON
mechanicLab parties against ONIX in both orientations. The complete
move-owned body through first inactive cleanup is **224/224** frames
**76–299** player-back and **80–303** opponent-front, twice fresh. Evidence
/ raw-RGB digests are player `e3fea9bd…5c4095` / `6ba2d80f…e74f4ad` and
opponent `ae787ec4…9c5b86` / `b85563f6…285bed`.

**Evidence/source:** `Move_LEAF_BLADE` loads LEAF and CROSS_IMPACT, starts
`create_leaf_blade_task` (45 observed LEAF lifecycles), executes three
target-panned CUT + `ShakeMon2(2,0,8,1)` passes, then target monbg/12:8
alpha, a fourth `ShakeMon2(8,0,18,1)`, one 36-frame CROSS_IMPACT, LEER,
waits, and cleanup. The portable comparator reruns both orientations twice
through `run-mgba-probe.py`, byte-pinning every source offset,
task/template/callback state, lifecycle, software/hardware OAM, matrices,
palettes/tags/buffers, registers, SE1/SE2/pans, raw RGB, and inactive cleanup.
Known mGBA teardown SIGSEGVs are accepted only after wrapper JSON validation.

**Boundary:** CROSS_CHOP remains the exact shared CROSS_IMPACT control; it
does not promote Leaf Blade. No reducer, seam, renderer, battle/controller,
RNG/facility state, boundary list, unsupported barrier, or sibling status
changed.

## MOVE_ENDURE promoted exact; shared EndureEffect track closed (2026-07-28)

**Verdict:** `MOVE_ENDURE` is exact. Legal Level-50 set-113 EEVEE→ONIX
Scene-ON parties pass the complete source body through first inactive cleanup
at **122/122** reducer/component, typed-seam, hardware, audio, raw-RGB, and
production-framebuffer frames **64–185** player-back and **68–189**
opponent-front, twice fresh. Player evidence/raw digests are
`5ffe4994…030024` / `941937cb…f9ce3a`; opponent digests are
`3fc347ae…26c1d2` / `19b16868…972ffd`.

**Model/boundary:** the pure relative-age reducer shares Focus Energy's exact
three-wave/fifteen-sprite EndureEffect lifecycle, Dragon Rage pan, ShakeMon2,
display latches, waits, and cleanup while keeping Endure's red palette cycle
and in-window subroutine offsets explicit. Source-extracted Eevee front/back
plus shared FOCUS_ENERGY/Onix/chrome assets pass full software/hardware OAM,
matrices, palette/tag/register, both-audio-player, raw-RGB, and compositor
receipts. `MOVE_FOCUS_ENERGY` remains an exact white-palette regression
control; `MOVE_FOCUS_PUNCH` remains unsupported as its distinct
HyperVoiceEffect body. Coverage is **77 exact / 0 partial / 0 staged / 199
unsupported**; no battle state, boundary list, or unsupported barrier changed.

## MOVE_ENDURE independent dense-ROM evidence checkpoint; production remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_ENDURE` remains unsupported; it
is not staged, partial, or exact. The source-verified Level-50 Factory
carrier is set **113** `FRONTIER_MON_EEVEE` (species **133**, Docile,
Speed/HP spread, Endure **203**); complete legal Scene-ON mechanicLab parties
stage it against ONIX in both orientations. The complete move-owned source
body through first inactive cleanup is **122/122** frames **64–185**
player-back and **68–189** opponent-front, reproduced twice fresh. Evidence
/ raw-RGB digests are player `5ffe4994…030024` / `941937cb…f9ce3a` and
opponent `3fc347ae…26c1d2` / `19b16868…972ffd`.

**Evidence/source:** `Move_ENDURE` loads FOCUS_ENERGY, starts attacker-panned
Dragon Rage, calls the shared five-sprite `EndureEffect` three times (**15**
lifecycles), runs its distinct red `BlendColorCycle(2,2,0,11)`, starts
attacker `ShakeMon2(1,0,32,1)`, waits, and cleans up. The portable comparator
reruns both orientations twice through `run-mgba-probe.py`, byte-pinning every
source offset, task/template/callback instance, software/hardware OAM,
matrices, palettes/tags/buffers, registers, both audio players/pans, raw RGB,
lifecycle counts, and first inactive cleanup. Known mGBA teardown SIGSEGVs
were accepted only after the wrapper validated freshly written JSON.

**Boundary:** Focus Energy remains the exact control, but does not promote
Endure. `MOVE_FOCUS_PUNCH` remains a distinct unsupported HyperVoiceEffect
body. No reducer, asset, renderer, Scene-ON seam, application framebuffer,
battle/controller/RNG state, status, census, boundary list, or unsupported
barrier changed. Coverage remains **76 exact / 0 partial / 0 staged / 200
unsupported**.

## MOVE_FOCUS_ENERGY promoted exact; FOCUS_ENERGY/EndureEffect track established (2026-07-28)

**Verdict:** `MOVE_FOCUS_ENERGY` is exact. Legal Level-50 Factory set-44
TAILLOW→ONIX Scene-ON parties pass the complete source body through first
inactive cleanup at **122/122** reducer/component, typed-seam, hardware,
audio, raw-RGB, and shared-framebuffer frames **73–194** player-back and
**77–198** opponent-front, twice fresh. Player evidence/raw digests are
`949eb218…d80ae4` / `45e75715…7049c5`; opponent digests are
`67990c21…782cc7` / `a0e387e6…0c9ad5`.

**Model/boundary:** the pure relative-age reducer ports all three literal
EndureEffect calls (**15** sprites with source OAM reuse), white
BlendColorCycle, attacker ShakeMon2, Dragon Rage audio, asset/task/sprite
lifetimes, source subpriority and OAM/palette display latches, and cleanup.
The typed seam and source-extracted Taillow/FOCUS_ENERGY compositor match
every production frame without battle clocks, fitting, pixel exceptions, or
recording imports. `MOVE_ENDURE` remains unsupported for its independently
unaccepted red palette body; `MOVE_FOCUS_PUNCH` remains unsupported for its
distinct two-pass HyperVoiceEffect scale/ring/shake/platform/cry body.
Coverage is **76 exact / 0 partial / 0 staged / 200 unsupported**; no battle
state, boundary list, unsupported barrier, or sibling status changed.

## ANIM_TAG_FOCUS_ENERGY evidence checkpoint; siblings remain unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_FOCUS_ENERGY` remains
unsupported; no move status or `ANIMATION_COVERAGE.json` entry changed.
Legal Level-50 source set **44** `FRONTIER_MON_TAILLOW` (species **304**,
Focus Energy **116**) anchors complete Scene-ON mechanicLab parties against
ONIX in both orientations. The first move-owned script body through inactive
cleanup is **122/122** frames **73–194** player-back and **77–198**
opponent-front, twice fresh. Evidence/raw-RGB digests are player
`949eb218…d80ae4` / `45e75715…7049c5` and opponent
`67990c21…782cc7` / `a0e387e6…0c9ad5`.

**Evidence/source:** `Move_FOCUS_ENERGY` loads FOCUS_ENERGY, starts
attacker-panned Dragon Rage, calls `EndureEffect` three times (five sprites
per call; **15** observed OAM-slot starts), runs white
`BlendColorCycle(2,2,0,11)`, attacker `ShakeMon2(1,0,32,1)`, and cleans up.
The portable receipt reruns both orientations twice through
`run-mgba-probe.py`, pinning source offsets, task/template/callback topology,
software/hardware OAM, matrices, palettes/tags, registers, SE1/SE2 and raw
RGB. No renderer, reducer, seam, application framebuffer, battle state,
boundary list, or barrier changed. `MOVE_ENDURE` and `MOVE_FOCUS_PUNCH`
remain unsupported pending independent dense move acceptance.

## MOVE_CROSS_CHOP promoted exact; CROSS_IMPACT track established (2026-07-28)

**Verdict:** `MOVE_CROSS_CHOP` is exact. Legal Level-50 Factory set-283
MACHOKE→ONIX Scene-ON parties pass the complete source body through first
inactive cleanup at **88/88** reducer/component, typed-seam, hardware, audio,
raw-RGB, and shared-framebuffer frames **216–303** player-back and **217–304**
opponent-front, twice fresh. Player evidence/raw digests are
`7be7a5bb…4888bc7` / `9d38ec15…5cd3d04`; opponent digests are
`a5561990…010d23f` / `528e9ed1…76f900f`.

**Model/boundary:** the pure relative-age reducer and typed seam port both
two-stage hands, CROSS_IMPACT, complex palette blend, target ShakeMon,
monbg/alpha, audio, tasks, display lag, and cleanup; source-extracted
Machoke/HANDS/CROSS_IMPACT plus shared Onix/chrome match every production
frame without battle clocks or fitted pixels. `MOVE_LEAF_BLADE` remains
unsupported because it adds distinct LEAF, `create_leaf_blade_task`, and
ShakeMon2 dependencies. Coverage is **75 exact / 0 partial / 0 staged / 201
unsupported**; no boundary list, unsupported barrier, battle/controller, or
sibling status changed.

## MOVE_CROSS_CHOP evidence checkpoint; CROSS_IMPACT remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_CROSS_CHOP` and
`MOVE_LEAF_BLADE` remain unsupported; no move is staged, partial, or exact
and `ANIMATION_COVERAGE.json` is unchanged. Legal Level-50 Factory
`FRONTIER_MON_MACHOKE_2` (set **283**, species **67**, Adamant, Scope Lens,
Attack/HP spread, Cross Chop **238**) drives complete Scene-ON mechanicLab
parties against ONIX in both player-back and opponent-front orientations.
The source-owned body through first inactive cleanup is **88/88** frames
**216–303** player-back and **217–304** opponent-front, twice fresh. Evidence
/ raw-RGB digests are player
`7be7a5bb…4888bc7` / `9d38ec15…5cd3d04` and opponent
`a5561990…010d23f` / `528e9ed1…76f900f`.

**Evidence/source:** the audit pins `Move_CROSS_CHOP`, HANDS_AND_FEET and
CROSS_IMPACT loads, target monbg/12:8 alpha, two
`gCrossChopHandSpriteTemplate` lifecycles and their two-stage translation,
the 40-frame delay, target-panned MEGA_KICK then RAZOR_WIND, one
`gCrossImpactSpriteTemplate` 20-frame `WaitAnimForDuration`, complex
palette blend, target `ShakeMon(7,0,9,1)`, and cleanup. The portable
comparator reruns both orientations twice via `run-mgba-probe.py`, byte-pins
the dense source/task/template/callback topology, software→hardware OAM,
affine matrices, palettes/tags, registers, SE1/SE2, and each raw RGB frame.
It source-extracts only MACHOKE front/back, HANDS_AND_FEET, and CROSS_IMPACT.

**Boundary:** no renderer, reducer, presentation seam, application frame,
battle/controller/RNG state, boundary list, unsupported barrier, or sibling
status changed. `MOVE_LEAF_BLADE` shares CROSS_IMPACT but adds LEAF,
`create_leaf_blade_task`, and ShakeMon2, so requires independent dense
acceptance.

## MOVE_BUBBLE_BEAM promoted exact; complete water-bubble body closed (2026-07-28)

**Verdict:** `MOVE_BUBBLE_BEAM` is exact. Legal set-42 SURSKIT→ONIX
Scene-ON parties pass the complete source body through first inactive cleanup
at **239/239** frames **77–315** player-back and **81–319** opponent-front,
twice fresh. Evidence/raw-RGB digests are player `bbdd5e47…76e7e0` /
`ebdcf7ed…090baa` and opponent `c56465ad…e36662` /
`776ffc9f…d8a8bd`.

**Model/evidence:** the pure source-relative reducer and typed seam port both
asset lifecycles, all 18 parameterized projectiles, SwayMon, six short-bubble
lifecycles, monbg/alpha, both sound families, waits, and cleanup. The
source-extracted Surskit/BUBBLE assets, byte-proved SMALL_BUBBLES, and shared
Onix/chrome pass source component state, persistent OAM painter order,
software→hardware OAM, matrices, palettes, registers, both audio players,
raw RGB, and the production framebuffer on every frame.

**Boundary/next:** the `bubble-beam-water-bubbles` track keeps outside-Factory
`MOVE_BUBBLE` and Secret Power's pond dispatch unsupported pending independent
dense acceptance. Coverage is **74 exact / 0 partial / 0 staged / 202
unsupported**. No battle/controller state, boundary list, unsupported barrier,
or sibling status changed.

## MOVE_BUBBLE_BEAM evidence checkpoint; production remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_BUBBLE_BEAM` remains unsupported;
it is not staged, partial, or exact, and `ANIMATION_COVERAGE.json` is
unchanged. Complete legal Scene-ON mechanicLab parties use the source-verified
Factory set-42 `FRONTIER_MON_SURSKIT` (species **311**, Bubble Beam move
**61**, Relaxed/Mystic Water source identity) as the constrained carrier
against ONIX, in both player-back and opponent-front orientations. The
complete source-owned script body through first inactive cleanup is **239/239**
frames **77–315** player-back and **81–319** opponent-front, reproduced twice
fresh. Evidence/raw-RGB digests are player
`bbdd5e47…76e7e0` / `ebdcf7ed…090baa`; opponent
`c56465ad…e36662` / `776ffc9f…d8a8bd`.

**Evidence/source:** the audit pins `Move_BUBBLE_BEAM`, BUBBLE and
SMALL_BUBBLES loads, target monbg/split priority/12:8 alpha, all three
`BubblebeamCreateBubbles` calls (six distinct argv each; **18**
`gWaterBubbleProjectileSpriteTemplate` lifecycles), their BUBBLE sound family,
`AnimWaterBubbleProjectile` affine/animation/three-step callback body,
`AnimTask_SwayMon(0,3,3072,8,target)`, waits, and `WaterBubblesEffectShort`'s
six `gWaterBubbleSpriteTemplate` lifecycles plus BUBBLE3 family. The portable
comparator reruns both orientations twice through `run-mgba-probe.py` and
byte-pins script offsets, tasks/sprites, software→hardware OAM, affine
matrices, BUBBLE/SMALL_BUBBLES tagged palettes, relevant registers, SE1/SE2
pans, raw RGB, and cleanup. BUBBLE/Surskit assets regenerate from pinned
source; SMALL_BUBBLES is byte-equal to the already-proved Water Gun asset.

**Exact implementation remainder:** port the complete source-relative reducer,
typed Scene-ON seam, asset compositor, and every-frame shared framebuffer
contract—no pixel fitting or recordings—then independently accept it. Bubble
`MOVE_BUBBLE` outside Factory remains unsupported, and Secret Power's pond dispatch to
Bubble Beam remains unsupported without independent acceptance. No battle
logic, controller/RNG/turn/facility state, unsupported barrier, boundary list,
or sibling status changed.

## MOVE_MUD_SHOT promoted exact; complete BROWN_ORB body closed (2026-07-28)

**Verdict:** `MOVE_MUD_SHOT` is exact. Legal set-111 KRABBY→ONIX Scene-ON
parties pass the complete source body through first inactive cleanup at
**145/145** frames **212–356** player-back and **144/144** frames **302–445**
opponent-front, twice fresh. Evidence/raw-RGB digests are player
`cef2f455…034c6` / `a9dcc157…c0b3f` and opponent `85fe40b0…840` /
`52bd4b4b…a443`.

**Model/evidence:** the pure source-relative reducer and typed seam port
BROWN_ORB load/free; 11 calls creating exactly 22 sinus orbs;
StartSinAnimTimer; both ShakeMon tasks; target monbg/split priority/12:8
alpha; the Whirlpool pan sweep; waits and cleanup. Source-extracted KRABBY
front/back and BROWN_ORB plus shared ONIX/chrome pass software→hardware OAM,
matrices, tagged palettes, registers, both audio players/pans, raw RGB, and
the production framebuffer on every frame. No absolute tick/input delay,
move/battle number, fitting, pixel exception, canonical recording import, or
battle/controller state was added.

**Boundary/next:** the new `brown-orb-mud-shot` track keeps
`MOVE_SECRET_POWER` unsupported because Factory building dispatches Strength.
Coverage is **73 exact / 0 partial / 0 staged / 203 unsupported**. Next
bounded target: select the next supervisor-ranked component track; no sibling
earned acceptance from shared code alone.

## MOVE_REVERSAL promoted exact; complete BLUE_ORB body closed (2026-07-28)

**Verdict:** `MOVE_REVERSAL` is exact. The legally corrected challenge-2
Vigoroth→Delcatty parties pass the complete Scene-ON source body through first
inactive cleanup at **174/174** source/component, typed-seam, hardware, audio,
raw-RGB, and shared-framebuffer frames **451–624** player-back and **404–577**
opponent-front, twice fresh. Evidence/raw-RGB digests are player
`f4f3dce7…d5b3a0c` / `1a761bb0…4ccb621` and opponent
`11937052…1d82877` / `0f284e09…b7623e1`.

**Model/evidence:** the pure source-relative reducer ports BLUE_ORB,
HANDS_AND_FEET, and IMPACT loads/frees; Detect/Reversal/Vital Throw audio;
both complex-palette-blend lifecycles and BlendColorCycle; exactly six
26-frame grow/shrink ReversalOrb callbacks; delays/waits, HorizontalLunge,
fist, basic hitsplat, receipt-driven target shake, and cleanup. The typed seam
accepts only an already-resolved shake amplitude and never reads power,
damage, or battle state. Source extraction pins Vigoroth front/back and
BLUE_ORB art; tests prove literal HANDS/IMPACT byte identity before reuse.
The portable verifier proves source state, software/hardware OAM, affine
matrices, tagged palettes, registers, both audio players/pans, raw RGB, typed
seam, and application framebuffer on every frame.

**Boundary:** `MOVE_SWALLOW` remains unsupported. Its BLUE_STAR,
move-turn-dependent one/two/three five-orb waves, deform/shake, and
HealingEffect require independent dense acceptance. No battle logic, damage
calculation, RNG, controller, turn order, round/facility state, boundary list,
unsupported barrier, or sibling status changed. Coverage is **72 exact / 0
partial / 0 staged / 204 unsupported**.

## MOVE_FAKE_TEARS promoted exact; resolved stat-drop window closed (2026-07-28)

**Verdict:** `MOVE_FAKE_TEARS` is exact. Corrected legal Level-50 Factory
set-267 DELCATTY→SHUCKLE fixtures pass the complete Scene-ON
`currentMove=313` window at **322/322** controller receipts and
shared-framebuffer frames **39–360**, twice fresh in both orientations. This
includes pre-animation, the **87-frame** source body, **89-frame** stat/status
phase, result/message/post-animation, and cleanup. Evidence/raw-RGB digests
are player `3b2470bd…e1c5a9` / `4aaf80e8…de8e1` and opponent
`c9b2f3d8…5221ff` / `e7828c48…938fc`.

**Boundary:** the resolved-stat-drop receipt seam presents only the already
resolved kickoff/text printer, `B_ANIM_STATS_CHANGE`, result printer/wait, and
move-end cleanup. It does not apply the stage outcome, advance RNG/scripts, or
own controller, turn, or facility state. The portable verifier's mismatch path
now constructs its framebuffer audit before reporting it. `MOVE_HEAT_WAVE` and
`MOVE_LUSTER_PURGE` remain unsupported. Coverage is **71 exact / 0 partial /
0 staged / 205 unsupported**.

## Reversal legal dense-ROM evidence complete; presentation remains unsupported (2026-07-28)

**Verdict:** Evidence-only checkpoint. `MOVE_REVERSAL` and `MOVE_SWALLOW`
remain unsupported; neither is staged, partial, or exact. Fresh complete
challenge-2 parties use source sets player `[326,327,328]` versus opponent
`[267,268,269]`, then reverse the same records. Every set field is pinned:
Emerald internal species IDs **365/348/349** and **316/322/108**, nature,
fixed IV **9**, source EV division, held item, moves (only active Vigoroth's
four slots are constrained to its legal Reversal), ability slot, Factory
friendship 0, gender class, and non-shiny personality selection. The rejected
ID 302 is `SPECIES_NINJASK`; `SPECIES_SABLEYE` is **322** in the pinned ROM
and mechanicLab writes that internal ID directly.

**Dense receipts:** player Vigoroth→opponent Delcatty retains **211/211**
`currentMove=179` frames **414–624**, including the **174/174** source window
**451–624**; opponent Vigoroth→player Delcatty retains **215/215** frames
**363–577**, source **404–577**. Both reproduce byte-identically twice fresh.
Evidence/raw-RGB digests are player
`f4f3dce7…d5b3a0c` / `1a761bb0…4ccb621` and opponent
`11937052…1d82877` / `0f284e09…b7623e1`. Receipts include source
offsets/waits, complete raw task/sprite/template/callback topology,
software+hardware OAM, all affine matrices, tagged faded/unfaded/hardware
palettes, GPU registers, SE1+SE2, raw RGB, and first-inactive cleanup. They
prove Detect, two complex-palette-blend lifecycles plus BlendColorCycle, six
orb lifecycles/callbacks, lunge/fist/impact, and the power/damage shake.

**Boundary:** This is deliberately not staged: no reducer, assets, renderer,
typed presentation seam, or application-framebuffer contract exists.
`MOVE_SWALLOW` remains distinct and unsupported: it adds BLUE_STAR,
move-turn-dependent one/two/three five-orb waves, attacker deform/shake, and
HealingEffect. No battle/controller/RNG/turn/facility state, boundary list,
unsupported barrier, or acceptance status changed.

## MOVE_SMOKESCREEN promoted exact; complete BLACK_BALL body closed (2026-07-28)

**Verdict:** `MOVE_SMOKESCREEN` is exact. Legal Level-50 Factory set-127
KOFFING against ONIX passes the complete Scene-ON source body through first
inactive cleanup at **125/125** source/component, typed-seam, hardware, and
shared-framebuffer frames **214–338** player-back and **302–426**
opponent-front, twice fresh. Stable evidence/raw-RGB digests are player
`14911b5a…3be59` / `435cca4a…1adf35` and opponent
`01bbc709…a963d` / `9a38c4eb…23e430`.

**Model/evidence:** the pure source-relative reducer ports the 35-callback
BLACK_BALL horizontal arc, dynamically loaded/freed four-part
SmokescreenImpact, all twelve 75-callback blinking BLACK_SMOKE translations,
both panned sounds, waits, and first inactive cleanup. The typed Scene-ON seam
and shared compositor use reproducibly extracted legal Koffing/BLACK_BALL/
BLACK_SMOKE/impact art, reuse exact Onix/chrome/enemy-shadow primitives, and
match source hardware OAM transfer ordering. The corrected portable probe
requires an empty task topology and checks software/hardware OAM, matrix mode,
palettes/registers/audio, raw RGB, and application framebuffer every frame.

**Boundary:** `MOVE_OCTAZOOKA` remains unsupported. Its shared BLACK_BALL tag
owns a distinct 20-frame translation, four delayed GRAY_SMOKE
`gOctazookaSmokeSpriteTemplate` lifecycles, and different audio without
independent dense acceptance. No battle logic, RNG, controller, turn order,
round/facility state, boundary list, or unsupported barrier changed. Coverage
is **70 exact / 0 partial / 1 staged / 205 unsupported**.

## MOVE_SMOKESCREEN staged; erroneous ShakeMon2 ownership removed (2026-07-28)

**Verdict:** `MOVE_SMOKESCREEN` is staged, not exact. Legal Level-50 Factory
set-127 `FRONTIER_MON_KOFFING` against ONIX establishes the full Scene-ON
source interval through first inactive cleanup at **125/125** frames **214–338**
player-back and **302–426** opponent-front. Two fresh mGBA runs per orientation
were byte-identical, including every raw RGB frame digest. Receipts are player
`5c81fa1f…1ba9ee` / `435cca4a…1adf35`; opponent `910665d1…c78170` /
`9a38c4eb…23e430`.

**Evidence/topology:** `smokescreenProbe.py` retains source offsets/waits,
templates/callbacks/tasks, palette tags, software/hardware OAM and affine
matrices, palettes/registers, SE1/SE2 pans, raw RGB, and cleanup. The source
body is BLACK_BALL translation, dynamically loaded four-part SmokescreenImpact,
twelve BLACK_SMOKE lifecycles, visual-finish wait, and the first inactive
cleanup. It has **no task lifecycle and no target shake**: the prior audit
incorrectly sliced from `Move_SMOKESCREEN` to the much later `Move_BUBBLE`
label and found an unrelated `AnimTask_ShakeMon2`. The corrected audit ends at
the immediate `Move_CONVERSION` label, asserts no `ShakeMon2`, and the probe
requires an empty task topology plus the dynamic impact template. No reducer,
typed seam, compositor, battle/controller state, or acceptance was implemented.

**Sibling boundary:** `MOVE_OCTAZOOKA` remains unsupported. It has a distinct
20-frame BLACK_BALL translation, four delayed GRAY_SMOKE
`gOctazookaSmokeSpriteTemplate` lifecycles, and different target audio; it has
no independent dense evidence. The assigned exact gate was internally
contradictory because it required the nonexistent target `ShakeMon2`; adding
that task would necessarily fail the accepted raw frames. Exact Smokescreen
still needs a corrected brief followed by the actual source-relative
reducer/seam/assets and full shared-framebuffer equality twice fresh in both
orientations. Coverage is **69 exact / 0 partial / 2 staged / 205 unsupported**.

## MOVE_SONIC_BOOM promoted exact; complete AIR_WAVE body closed (2026-07-28)

**Verdict:** `MOVE_SONIC_BOOM` is exact. Legal Level-50 Factory set-244
`FRONTIER_MON_MAGNETON_1` against ONIX passes the complete Scene-ON source
body through first inactive cleanup at **52/52** source/component, typed-seam,
hardware, and shared-framebuffer frames **78–129** player-back and
**82–133** opponent-front, twice fresh. Byte-identical evidence/raw-RGB
digests are player `0a7fc886…1662bb` / `8692f81c…18dee` and opponent
`0c923df2…4f6a6` / `b2449044…f7f3f`. Coverage is **69 exact / 0 partial /
1 staged / 206 unsupported**.

**Model/evidence:** the source-relative reducer ports all three duration-15
`gSonicBoomSpriteTemplate` translations, side-derived affine matrices and
Razor-Wind pans, the animation-2 target IMPACT, `ShakeMon(3,0,10,1)`,
partner monbg/target split priority, 12:8 alpha, waits, and cleanup. The typed
seam and shared hardware compositor source-extract AIR_WAVE and Magneton art,
reuse exact IMPACT/ShakeMon/Onix/chrome components, and reproduce the
orientation-specific OBJ order plus the one-display elevated enemy-shadow
latch before `SpriteCB_EnemyShadow` observes `gAnimScriptActive`. The portable
verifier proves source offsets, tasks/sprites, OAM/matrices/palettes,
registers/audio, raw RGB, and application framebuffer on every frame.

**Boundary:** `MOVE_AIR_CUTTER` remains unsupported. It shares AIR_WAVE but
owns `AnimTask_AirCutterProjectile`, CUT/`gAirCutterSliceSpriteTemplate`,
both target and `ANIM_DEF_PARTNER` `ShakeMon2(2,0,8,1)` calls, and distinct
wait/audio timing without independent dense move acceptance. No battle logic,
RNG, controller, turn order, round/facility state, boundary list, or
unsupported barrier changed.

## MOVE_SONIC_BOOM complete AIR_WAVE evidence staged; Air Cutter audited (2026-07-28)

**Verdict:** `MOVE_SONIC_BOOM` is staged, not exact. Legal Level-50 Factory
set-244 `FRONTIER_MON_MAGNETON_1` (Magneton) against ONIX establishes the
complete source-owned Scene-ON window from its first sourced display through
first inactive cleanup at **52/52** frames **78–129** player-back and
**82–133** opponent-front, twice fresh and byte-identical. Full
evidence/raw-RGB digests are player `9c3e744f…15eff7` /
`c98fa1b4…a7e38a` and opponent `e66adb5a…ab7ffe3` /
`f9d02f74…cb576d`.

**Evidence/topology:** `Move_SONIC_BOOM` loads AIR_WAVE and IMPACT, opens
`ANIM_DEF_PARTNER` monbg with target split priority and 12:8 alpha, calls the
Razor-Wind-panned `gSonicBoomSpriteTemplate` body three times (each
16,0→0,0/duration 15 with 4-frame script waits), starts
`ShakeMon(target,3,0,10,1)`, then creates its animation-2 target IMPACT and
cleans monbg/blend. Dense portable receipts retain every source offset/wait,
template/callback/task instance, AIR_WAVE+IMPACT palette tags, target/partner
OAM ordering, matrices, registers, SE1/SE2+pans, raw RGB/framebuffer, and
first inactive frame in both orientations. No reducer, seam, renderer, or
battle/controller state changed.

**Boundary:** `MOVE_AIR_CUTTER` remains unsupported. It shares AIR_WAVE but
also owns `AnimTask_AirCutterProjectile`, CUT/`gAirCutterSliceSpriteTemplate`,
both target and `ANIM_DEF_PARTNER` `ShakeMon2(2,0,8,1)` calls, and distinct
wait/audio timing; it has no independent dense acceptance. Exact Sonic Boom
still requires a typed presentation seam, source-relative reducer/compositor,
and complete shared-framebuffer equality twice fresh. Coverage is **68 exact
/ 0 partial / 2 staged / 206 unsupported**.

## MOVE_FAKE_TEARS full-window ownership audited; remains staged (2026-07-28)

**Verdict:** `MOVE_FAKE_TEARS` remains staged. Corrected legal set-267
DELCATTY evidence now densely verifies every **322/322** `currentMove=313`
frame **39–360** twice fresh in both orientations, including source/component
state where active plus hardware OAM/matrices/palettes, registers, both audio
players, raw RGB, and the application framebuffer. The animation-owned source
body remains exact at **87/87** frames **76–162** player-back and **80–166**
opponent-front. Full evidence/raw digests are player
`3b2470bd…e1c5a9` / `4aaf80e…de8e1` and opponent
`c9b2f3d8…5221ff` / `e7828c48…938fc`, byte-identical across both fresh runs.

**Phase/ownership audit:** player-back partitions as pre-animation **39–75
(37)**, source **76–162 (87)**, stat/status **163–251 (89)**,
message/post-animation **252–359 (108)**, cleanup **360 (1)**.
Opponent-front partitions as **39–79 (41)**, **80–166 (87)**, **167–255
(89)**, **256–359 (104)**, and **360 (1)**. Pinned ROM source assigns only
`Move_FAKE_TEARS` to animation. `BattleScript_EffectStatDown`,
`Cmd_statbuffchange`/`ChangeStatBuffs`, `B_ANIM_STATS_CHANGE`, the stat
message/wait, and `BattleScript_MoveEnd` own the other **235** frames.
The existing standalone animation seam has no typed controller command or
resolved stat/message/cleanup input: only 19 static outer frames coincide and
**216/235** outer application framebuffers mismatch in each orientation
(player 30 pre + 80 status + 105 message/post + 1 cleanup; opponent
34 + 80 + 101 + 1). No controller behavior was synthesized.

**For the main program:** expose the already-resolved Scene-ON stat-drop
controller presentation through the shared seam—kickoff/text-printer state,
`B_ANIM_STATS_CHANGE` receipts, stat-result message/wait, and move-end cleanup—
without moving stage outcomes, RNG, script advancement, or controller
ownership into animation. Then rerun `fakeTearsPortable.ts`; exact promotion
still requires 322/322 shared-framebuffer and typed-seam equality twice fresh
in both orientations. `MOVE_HEAT_WAVE` and `MOVE_LUSTER_PURGE` remain
unsupported. Coverage stays **68 exact / 0 partial / 1 staged / 207
unsupported**.

## MOVE_SPIKE_CANNON promoted exact; complete WindUpLunge body closed (2026-07-28)

**Verdict:** `MOVE_SPIKE_CANNON` is exact. Legal Level-50 Factory set-260
`FRONTIER_MON_OMASTAR_1` versus ONIX passes its complete Scene-ON source body
through first inactive cleanup at **84/84** source, typed-seam, hardware, and
shared-framebuffer frames **86–169** player-back and **90–173**
opponent-front, twice fresh. Pinned evidence/raw RGB digests are player
`80760b25…c854654` / `c5af7071…97e61`; opponent
`7c4e2dd5…134b8a2` / `8f393625…3c2a`. Coverage is **68 exact / 0 partial /
1 staged / 207 unsupported**.

**Model/evidence:** the source-relative reducer ports side-inverting
`AnimTask_WindUpLunge`, `SlideMonToOriginalPos`, three attacker-relative
linear NEEDLE stingers, three simultaneous animation-2 invert hitsplats,
`ShakeMon2(3,0,7,1)`, target monbg/split priority/12:8 alpha, both looped
audio families, source OAM transfer ordering, and cleanup. The typed seam and
shared compositor use source-extracted Omastar art plus the source-identical
Twineedle NEEDLE, linear-stinger, invert-hitsplat, ShakeMon2, alpha, and
cleanup primitives. Dedicated complete legal mechanic-lab scenarios now
materialize the set-260 Omastar directly. The portable verifier records tasks/sprites, OAM,
matrices, palettes, registers, audio, raw RGB, and the application
framebuffer on every frame. No battle logic, RNG, turn order, controller,
facility state, boundary list, or unsupported barrier changed.

**Siblings:** `MOVE_TAKE_DOWN` remains unsupported (23+10+10 lunge, blend,
offset/shake/returns); `MOVE_BRICK_BREAK` remains unsupported (two-turn wall
branch, horizontal lunges, fist/shards/BG blend); outside-Factory
`MOVE_SNATCH` remains unsupported (bare 10+10+6 lunge). None received
independent dense acceptance.

## MOVE_ASTONISH promoted exact; full source body closed (2026-07-28)

**Verdict:** `MOVE_ASTONISH` is exact. Legal Factory set-144
`FRONTIER_MON_LOUDRED` (species 371) against ONIX passes the complete Scene-ON
source-script-plus-first-inactive window at **63/63** source, typed seam,
hardware, and shared-framebuffer frames **220–282** player-back and **219–281**
opponent-front, twice fresh. Pinned evidence/raw RGB digests are player
`20d66e8b…77568` / `ad5dcf52…3f2c90`; opponent
`48912cfb…c209` / `ba9b56fe…ce3c71`. Coverage is **67 exact / 0 partial /
1 staged / 208 unsupported**.

**Model:** the source-relative reducer ports SWEAT_BEAD load/free lifetime,
ENCORE and SKETCH pans, HorizontalLunge, the 25-frame wait, both Random2-owned
SprayWaterDroplet callbacks, ShakeMon2 task-slot writes, both 10-frame
StretchTargetUp affine legs, wait semantics, and cleanup. The typed Scene-ON
seam owns presentation-only RNG outputs and geometry. The compositor uses
source-extracted Loudred/SWEAT_BEAD art, existing Onix/chrome components,
source OAM priority, and the split affine-entry scanout latch (Shake x2 before
the following matrix/vertical-anchor transfer). No battle logic, RNG advance,
turn order, controller, facility state, boundary list, or unsupported barrier
changed.

**Siblings:** `MOVE_FAKE_OUT` remains unsupported because it adds
`AnimTask_FakeOut` and a post-body white blend. `MOVE_TRICK` remains
unsupported because it adds ITEM_BAG/SPEED_DUST assets, two bag affine
programs, StretchAttackerUp, repeated DOUBLE_TEAM sounds, and Hydro Cannon
beams. Neither received independent dense move acceptance.

## MOVE_FAKE_TEARS corrected-species source body exact; remains staged (2026-07-28)

**Verdict:** `MOVE_FAKE_TEARS` remains staged. The inherited “set-267
DELCATTY” scenarios use internal species **301 (NINCADA)**, so their earlier
321-frame evidence cannot satisfy legal DELCATTY acceptance. Corrected
mechanic-lab fixtures use Emerald species **316 (DELCATTY)**. Their complete
source-owned load/body/free/clear window is exact twice fresh at **87/87**
frames **76–162** player-back and **80–166** opponent-front through reducer,
typed seam, tasks/sprites, asset/palette/OAM/register/audio lifecycles, raw
RGB, and shared framebuffer. Second-run probe/raw digests are player
`3b2470bd…e1c5a9` / `4aaf80e…de8e1`; opponent `c9b2f3d8…5221ff` /
`e7828c48…938fc`.

**Model:** source-relative state ports zero-delay `AnimTask_BlendParticle`,
speed-1/two-rock `AnimTask_RockMonBackAndForth`, all four Tail Whip restarts,
eight typed 32-callback tear arcs/affines, SMALL_BUBBLES blend, the
load-only THOUGHT_BUBBLE/MUSIC_NOTES tags, waits, frees, and cleanup. The
shared compositor adds source-extracted DELCATTY front/back art and reuses
SHUCKLE field chrome, affine sprite composition, healthboxes, and text. Pure
tests pin the reducer, typed seam, exact affine callback states, source asset
regeneration, audio duration, and both legal picture bounds.

**Acceptance remainder:** corrected-species fresh captures contain
`currentMove=313` on **322 frames 39–360**, not the inherited/assigned
**321 frames 39–359**. The portable verifier intentionally proves only the
87 source-owned frames, leaving **235/322** controller-window frames per
orientation (pre-animation, stat-drop, message/post-animation) unaccepted.
No exception was added and coverage stays **66 exact / 0 partial / 1 staged /
209 unsupported**. A later worker must resolve the corrected-species
controller-window contract and reproduce every remaining frame twice fresh
before promotion. `MOVE_HEAT_WAVE` and `MOVE_LUSTER_PURGE` remain unsupported.

## MOVE_FAKE_TEARS staged; AnimTask_BlendParticle latch evidence complete (2026-07-28)

**Historical verdict, superseded:** `MOVE_FAKE_TEARS` was staged from
species-301 fixtures then mislabeled DELCATTY; species 301 is NINCADA, so this
is retained only as provenance and not legal set-267 acceptance. Those
Scene-ON NINCADA/SHUCKLE parties capture every `currentMove=313` frame
(**321**, 39–359) and the complete source-owned BlendParticle
creation/display latch plus first inactive cleanup (**2/2**, frames **84–85**
player-back and **88–89** opponent-front) twice fresh. Outputs are
byte-identical: player `ad60a3d3…995067d` / raw `8a434003…b7a390`; opponent
`8a7c58ab…2ff07cc` / raw `75dd472a…c33a94`. Coverage is now **66 exact / 0
partial / 1 staged / 209 unsupported**.

**Evidence/scope:** `AnimTask_BlendParticle` selects the source-extracted
SMALL_BUBBLES OBJ palette and Fake Tears supplies `(delay=0, initial=4,
target=4)`, so the creation dispatch latches then destroys the task before it
can survive a post-frame `gTasks` snapshot. The probe records script/task/
sprite/OAM/matrix/palette/register/audio/raw-RGB/framebuffer state; the first
inactive latch shares its frame with the subsequent RockMon launch, which is
explicitly a boundary—not accepted or modeled. No reducer, typed seam, app
compositor, battle logic/RNG/controller/facility state, boundary list, or
unsupported barrier changed.

**Siblings:** `MOVE_HEAT_WAVE` remains unsupported (FLYING_DIRT plus
sandstorm/background, both-target motion, pan, crescents). `MOVE_LUSTER_PURGE`
remains unsupported (psychic/white BG, circle, two particle tags, random
hitsplats/sounds, shake, restore). Neither received independent complete dense
move acceptance.

## MOVE_SURF promoted exact; create_surf_wave BG1/scanline seam closed (2026-07-28)

**Verdict:** `MOVE_SURF` is exact. Fresh complete legal Scene-ON
WARTORTLE/SHUCKLE evidence passes the complete source-owned controller and
scanline window plus first inactive cleanup at exactly **144/144** frames
**72-215** player-back and **76-219** opponent-front through reducer, typed
seam, registers/audio, raw RGB, and shared framebuffer twice fresh. Outputs
remain byte-identical: player `19cf632a…800dae` / raw
`fc0c3faa…163ed5`; opponent `66a3f92d…c97ffa` / raw
`be3db045…ea4c6`. Coverage is now **66 exact / 0 partial / 0 staged / 210
unsupported**.

**Model/renderer:** the pure relative-age reducer ports
`AnimTask_CreateSurfWave` and `AnimTask_SurfWaveScanlineEffect`: side-selected
512x256 BG1 tilemaps, side-relative scroll, 1→13 hold→0 alpha, expanding
scan regions, four-frame palette rotation, `SE_M_SURF` pan, BG clear, and
scanline teardown. The narrow shared compositor source-extracts WARTORTLE
front/back and water art, layers priority-1 BG1 over the field/battlers but
under healthboxes/BG0, and ports the palette-transfer plus side-specific
scanline-buffer display latches without absolute-tick or pixel exceptions.

**Scope/siblings:** `MOVE_MUDDY_WATER` remains unsupported: it requires its
Muddy palette and pre-command `SE_M_WHIRLPOOL` to earn independent complete
dense acceptance. `MOVE_SECRET_POWER` remains unsupported: the Factory
building environment dispatches Strength, not Surf. No battle logic, RNG,
controller, turn order, round/facility state, boundary list, or unsupported
barrier changed.

## MOVE_SURF staged; create_surf_wave evidence checkpoint complete (2026-07-28)

**Verdict:** `MOVE_SURF` is staged only. Fresh complete legal Scene-ON
WARTORTLE/SHUCKLE mechanic-lab parties capture every `currentMove=57` frame
(**370** frames 39–408 player-back, **367** frames 39–405 opponent-front) and
the complete source-owned controller/scanline window plus first inactive
cleanup (**144/144**, frames 72–215 player-back and 76–219 opponent-front).
Both outputs and concatenated raw-RGB streams are byte-identical twice fresh:
player `19cf632a…800dae` / `fc0c3faa…163ed5`; opponent
`66a3f92d…c97ffa` / `be3db045…ea4c6`. Coverage is now **65 exact / 0 partial
/ 1 staged / 210 unsupported**.

**Model/evidence:** `create_surf_wave` owns BG1 water gfx, side-selected
player/opponent tilemap, Surf/Muddy palette, `AnimTask_CreateSurfWave`, and
the `AnimTask_SurfWaveScanlineEffect` alpha-DMA task—no effect software sprite.
The committed probe captures complete task/sprite bodies, BG tilemap/scroll/
affine and raw VRAM, palettes, registers, OAM/matrices, both audio players/
pans, RGB, script identities, assets, and cleanup; source extraction
byte-pins exactly the required water tiles, two Factory tilemaps, and palettes.

**Siblings/scope/next:** `MOVE_MUDDY_WATER` remains unsupported: same command
but a Muddy palette and pre-command `SE_M_WHIRLPOOL`, requiring independent
dense acceptance. `MOVE_SECRET_POWER` remains unsupported: Factory
`BATTLE_ENVIRONMENT_BUILDING` dispatches `Move_STRENGTH`, not `Move_SURF`.
Next: port the two Surf tasks as a relative-age reducer, add a typed seam and
BG1/scanline framebuffer renderer, then prove both 144-frame windows before
considering a separate Muddy Water stage. No battle logic/RNG/controller/
facility state, boundary list, unsupported barrier, or absolute-tick,
move-number, input-delay, coordinate/RGB/pixel exception changed.

## MOVE_THUNDER_WAVE promoted exact; complete Spark-track seam closed (2026-07-28)

**Verdict:** `MOVE_THUNDER_WAVE` is exact. Fresh complete legal Scene-ON
FLAAFFY/SHUCKLE evidence passes all **120/120** source load/body/cleanup
frames **79-198** player-back and **83-202** opponent-front through the
source-relative reducer, typed seam, software tasks/sprites, registers,
hardware OAM/matrices/palettes, both audio players/pans, raw RGB, and shared
framebuffer, twice fresh. The first inactive offset-110 teardown is included;
the later `Task_DoStatusAnimation` remains excluded. Coverage is now **65
exact / 0 partial / 0 staged / 211 unsupported**.

**Renderer/evidence:** the reducer ports SPARK/SPARK_2/SPARK_H loads, field
0→6→0 fade, five staggered ElectricBolt segments and their source OAM latch,
both side-relative sound families, all three two-sprite flashing bands, task
counts, and cleanup. The narrow compositor source-extracts FLAAFFY and
SPARK/SPARK_H, reuses exact SHUCKLE and shared chrome, and consumes prior
software OAM/palette state. Fresh v3 outputs are byte-identical (player
`3d8b1bee…267ee` / raw `aaa201bb…1c5a5`; opponent `0454b5a2…1b424` /
raw `e97ad2bd…0236e`).

**Scope/siblings/next:** `MOVE_THUNDERBOLT` stays unsupported with its triple
bolt, SHOCK_3 orb, eight affine sparks, target palette body, and distinct
sounds. `MOVE_ZAP_CANNON` stays unsupported with BLACK_BALL_2, eight orbiting
sparks, ShakeMon2, ElectricityEffect, and distinct pans. Neither has complete
dense evidence; exact `MOVE_SPARK` is preserved. Next select a bounded
Level-50 representative from the coverage queue. No battle logic/RNG/
controller/facility state, boundary list, unsupported barrier, or absolute-
tick/move-number/input-delay/coordinate/RGB/pixel exception changed.

## MOVE_BODY_SLAM promoted exact; audio and framebuffer repaired (2026-07-28)

**Verdict:** `MOVE_BODY_SLAM` is exact. Fresh complete legal set-269
LICKITUNG/ONIX Scene-ON evidence passes the complete move-owned source-script
window plus first clear display at **107/107** frames **303-409** player-back
and **107/107** frames **232-338** opponent-front through reducer/component,
typed seam, software callbacks/tasks, registers, hardware battler
OAM/matrices/palette transfer, complete two-player audio, raw RGB, and the
shared framebuffer, twice fresh. The repaired v2 probe proves
`SE_M_TAKE_DOWN` on **SE2** at attacker pan (age 7) and both
`SE_M_MEGA_KICK2` loop cues on **SE1** at target pan (ages 44/54), including
player identity/status/flags in both orientations. Coverage is now **63 exact
/ 1 partial / 212 unsupported**. Independent
outputs are byte-identical (player `79e4bfaa…258c`, opponent
`02c0ee9d…8c01`).

**Renderer/model:** source extraction byte-pins LICKITUNG front/back and
reuses source-generated IMPACT. The narrow compositor ports the source pic
coordinates, target monbg, prior-software battler/effect OAM and palette
transfer, 12:8 alpha, both moving battlers, chrome, healthboxes, text, and
first clear. The pure source-relative reducer ports
`gVerticalDipSpriteTemplate(6,1,attacker)`, both offset slides, animation-0
IMPACT, target `AnimTask_ShakeMonInPlace(4,0,12,1)`, both return slides,
target monbg, 12:8 alpha registers, side-relative sounds, and cleanup.

**Siblings/scope:** the evidence used the required validated local-mGBA path.
`MOVE_RETURN` remains unsupported pending all four friendship branches;
`MOVE_FLATTER` remains unsupported pending spotlight/fades/38 confetti and
distinct sounds; outside-Factory `MOVE_WEATHER_BALL` remains unsupported
pending its weather-dispatched bodies. No battle logic, RNG/controller/
facility state, boundary list, unsupported barrier, absolute tick, input
delay, coordinate/RGB, or pixel exception changed.

## MOVE_HEADBUTT promoted exact; source OAM latch compositor closed (2026-07-28)

**Verdict:** `MOVE_HEADBUTT` is exact. Fresh complete legal set-24
ZIGZAGOON/ONIX Scene-ON evidence passes the entire move-owned animation body
plus first clear display at **48/48** frames **77-124** player-back and
**48/48** frames **81-128** opponent-front through source/reducer, typed seam,
registers, hardware battler OAM/matrices/palettes, side-relative audio, raw
RGB, and the shared framebuffer, twice fresh. Coverage is now **62 exact / 1
partial / 213 unsupported**.

**Renderer/evidence:** source extraction byte-pins ZIGZAGOON front/back and
reuses the already source-generated `ANIM_TAG_IMPACT`. The narrow compositor
ports the prior-software affine/OAM transfer, both source task-to-OAM display
latches, flashing IMPACT visibility, field chrome, healthboxes, and move text.
Independent outputs remain byte-identical (player `28e574bd…c858`, opponent
`fcc0a0e8…1281`).

**Scope/siblings:** `MOVE_HORN_ATTACK`, `MOVE_HORN_DRILL`, and
`MOVE_DRILL_PECK` remain unsupported because their horn,
drill-BG/scroll/repeated-impact, and whirlwind/hitsplat-task bodies lack
independent complete dense acceptance. No battle logic, RNG/controller/
facility state, boundary list, unsupported barrier, absolute-tick/input-delay,
coordinate/RGB, or pixel exception changed.

## MOVE_HEADBUTT complete typed/hardware checkpoint; remains partial (2026-07-28)

**Verdict:** `MOVE_HEADBUTT` is partial. Fresh complete legal set-24
ZIGZAGOON/ONIX Scene-ON evidence passes the entire move-owned animation body
plus first clear display at **48/48** frames **77-124** player-back and
**48/48** frames **81-128** opponent-front through source/reducer, typed seam,
registers, hardware battler OAM/matrices/palette transfer, side-relative
audio, and raw RGB, twice fresh. Coverage is now **61 exact / 2 partial / 213
unsupported**.

**Reusable model/evidence:** the relative-age reducer ports
`gBowMonSpriteTemplate` phases 0/1/2, side-relative translation/rotation and
`SetBattlerSpriteYOffsetFromRotation`, attacker
`AnimTask_ShakeMonInPlace(2,0,4,1)`, target `AnimTask_ShakeMon(5,0,6,1)`,
animation-1 flashing IMPACT, both sounds, and cleanup. Independent outputs are
byte-identical (player `28e574bd…c858`, opponent `fcc0a0e8…1281`).

**Exact remainder/siblings:** exact remains unclaimed until the shared
framebuffer compositor extracts ZIGZAGOON front/back and IMPACT art, ports the
battler affine/OAM display transfer plus flashing visibility and field chrome,
and proves **48/48** shared-framebuffer equality twice fresh in both
orientations. `MOVE_HORN_ATTACK`, `MOVE_HORN_DRILL`, and `MOVE_DRILL_PECK`
remain unsupported because their horn, drill-BG/scroll/repeated-impact, and
whirlwind/hitsplat-task bodies respectively lack independent dense acceptance.
No battle logic, RNG/controller/facility state, boundary list, unsupported
barrier, absolute-tick/input-delay, or coordinate/RGB/pixel exception changed.

## MOVE_COVET promoted exact; ITEM_BAG load/transfer proved (2026-07-28)

**Verdict:** `MOVE_COVET` is exact. Fresh complete legal challenge-1
set-203 LINOONE/SHUCKLE Scene-ON evidence passes the complete move-owned
load/body/cleanup window at **114/114** frames **73-186** player-back and
**77-190** opponent-front through reducer/component state, typed seam,
registers, hardware OAM/matrices/palettes, side-relative audio, raw RGB, and
the shared framebuffer, twice fresh. Coverage is now **61 exact / 1 partial /
214 unsupported**.

**Renderer/evidence:** the source reducer reuses exact Charm hearts and
RockMonBackAndForth, then ports target ShakeMon2 and the Dizzy Punch loop.
`ANIM_TAG_ITEM_BAG` is source-extracted and its load, palette tag, and
prior-software hardware transfer are pinned; the stock Covet script creates
no bag sprite. The compositor adds LINOONE front/back and the source battler
task display latch. Fresh evidence is byte-identical (player
`af4e7838…1df7`, opponent `cd62d0bd…bc17`).

**Scope/siblings:** `MOVE_PRESENT` and `MOVE_TRICK` remain unsupported because
they instantiate distinct ITEM_BAG affine/callback programs and have no
independent dense acceptance. No battle logic, RNG/controller/facility state,
boundary list, unsupported barrier, or absolute-tick/input-delay/coordinate/
RGB/pixel exception changed.

## MOVE_DIZZY_PUNCH promoted exact; source compositor closes both orientations (2026-07-28)

**Verdict:** `MOVE_DIZZY_PUNCH` is exact. Fresh complete legal set-145
SPINDA/ONIX Scene-ON evidence passes the entire move-owned body at **69/69**
frames **90-158** player-back and **69/69** frames **94-162**
opponent-front through reducer/component state, typed seam, registers,
hardware OAM/matrices/palettes, side-relative audio, raw RGB, and the shared
framebuffer, twice fresh. The following clear tail is independently pinned.
Coverage is now **60 exact / 1 partial / 215 unsupported**.

**Renderer/evidence:** the committed dedicated mGBA probe and portable
comparator cover both lunges, both ShakeMon2 tasks, both fists, both
animation-1 IMPACT sprites, all twelve ducks including priority/visibility/
translation, target monbg, 12:8 alpha, prior-software hardware transfer, and
cleanup. The source-derived compositor extracts SPINDA front/back,
ONIX/shared field art, HANDS_AND_FEET, IMPACT, DUCK, chrome, healthboxes, and
text; its front-only personality spots port `DRAW_SPINDA_SPOTS`, including
the source 1bpp bit order. Fresh evidence is byte-identical (player
`5a69e0ff…976`, opponent `c475b845…64c`).

**Source/siblings:** the source audit still proves exactly twelve literal
ducks and **zero falling feathers** in DIZZY_PUNCH. `MOVE_TEETER_DANCE`
remains unsupported with its distinct movement task, five fast music-note
paths, and sounds. `MOVE_SIGNAL_BEAM` remains unsupported with its distinct
red/green orb stream, sinus timer, shakes, pan sweep, and target palette
cycle. Neither received an independent acceptance. No battle logic,
RNG/controller/facility state, boundary list, unsupported barrier, or
move-number/input-delay/absolute-tick/coordinate/RGB/pixel exception changed.

## ANIM_TAG_DUCK / MOVE_DIZZY_PUNCH source-and-seam checkpoint; remains unsupported (2026-07-28)

**Verdict:** `MOVE_DIZZY_PUNCH` remains unsupported; coverage stays **59
exact / 1 partial / 216 unsupported**. Fresh complete legal set-145
SPINDA/ONIX Scene-ON scenarios pin the move-owned body at frames **90-158**
player-back and **94-162** opponent-front. The source-relative reducer and
typed seam now port both horizontal lunges, both target ShakeMon2 tasks,
both fist and animation-1 IMPACT instances, both literal six-duck waves,
12:8 alpha/target-monbg, side-relative sound identities, and cleanup.
`ANIM_TAG_DUCK`, SPINDA front/back art, HANDS_AND_FEET, and IMPACT regenerate
byte-for-byte.

**Evidence/boundary:** a fresh local-mGBA scout invoked through
`tools/run-mgba-probe.py` captured every `currentMove=146` frame with
software sprites/tasks, hardware OAM/matrices/palettes/registers, audio, and
raw RGB (player digest `d6779742…fa3`, opponent `429cd8b2…07f`). The
committed source audit pins exactly 12 `gDizzyPunchDuckSpriteTemplate`
instances and proves that Emerald's `Move_DIZZY_PUNCH` has **zero**
`gFallingFeatherSpriteTemplate`/`ANIM_TAG_WHITE_FEATHER` commands; those
belong to `Move_FEATHER_DANCE`, so no unsupported feather behavior was
invented.

**Exact remainder/siblings:** commit a dedicated reproducible dense probe
and portable comparator, strengthen every relative-age reducer receipt
against both orientations twice fresh, then add the narrow shared compositor
for SPINDA, fists, animation-1 IMPACT, all ducks, prior-software hardware
transfer, palettes/registers/audio/raw RGB, and **69/69** shared-framebuffer
equality plus the clear tail. `MOVE_TEETER_DANCE` remains unsupported with
its distinct movement task and five fast music-note paths/sounds.
`MOVE_SIGNAL_BEAM` remains unsupported with its distinct red/green orb
stream, sine timer, shakes, pan sweep, and target palette cycle. No engine,
battle state, RNG/controller/facility logic, coverage status, boundary list,
unsupported barrier, or absolute-tick/input-delay/pixel exception changed.

## MOVE_TAIL_GLOW promoted exact; shared framebuffer closed (2026-07-28)

**Verdict:** `MOVE_TAIL_GLOW` is exact. Fresh complete legal set-277
VOLBEAT/SHUCKLE Scene-ON evidence passes all **203/203** move-owned frames and
cleanup at frames **73-275** player-back and **77-279** opponent-front through
source/software, typed seam, registers, hardware OAM/matrices/palettes,
side-relative audio, raw RGB, and the shared framebuffer, twice fresh.
Coverage is now **59 exact / 1 partial / 216 unsupported**.

**Renderer/evidence:** source extraction now byte-pins both VOLBEAT
orientations alongside CIRCLE_OF_LIGHT. The narrow compositor ports the
source-exact BG palette banks, attacker monbg target-2 stack, prior-software
hardware transfer, affine 12:8-alpha orb, field chrome, healthboxes, text, and
cleanup. Dense framebuffer closure also corrected the palette reducer to
Emerald's fixed `deltaY=2` coefficients **0→2→4→2→0** and the source-derived
player-back corner to `48 + back yOffset(8) = 56`; the separate orb
`Y_PIC_OFFSET` remains 96. Independent receipts remain byte-identical (player
`9ed6c575…7f1`, opponent `2d5b4d2f…84a1`).

**Scope/siblings:** `MOVE_SUPERPOWER` remains unsupported with its distinct
METEOR/FLAT_ROCK/orb/rocks/fireball/BG-shake/four-sound body.
`MOVE_SHOCK_WAVE` remains unsupported with distinct ELECTRIC_ORBS/SPARK/
LIGHTNING and charging/bolt/lightning/shake/palette tasks. Neither has
independent dense acceptance. No battle logic/RNG/controller/facility state,
boundary list, unsupported barrier, or absolute-tick/input-delay/coordinate/
RGB/pixel exception changed.

## MOVE_TAIL_GLOW complete typed/hardware checkpoint; remains partial (2026-07-28)

**Verdict:** `MOVE_TAIL_GLOW` is partial. Fresh complete legal set-277
VOLBEAT/SHUCKLE Scene-ON evidence passes the entire **203/203** frame asset
load through unload envelope at frames **73-275** player-back and **77-279**
opponent-front through source/software, typed seam, registers, hardware
OAM/matrices/palette transfer, side-relative audio, and raw-RGB receipts,
twice fresh. Coverage is now **58 exact / 2 partial / 216 unsupported**.

**Reusable model/evidence:** the relative-age reducer ports BG
`simple_palette_blend` 0→4→0, attacker monbg, 12/8 alpha, the 18-frame
growth plus six pulse cycles of `gTailGlowOrbSpriteTemplate`, six
side-relative `SE_M_MORNING_SUN` restarts, and cleanup. Source extraction
byte-pins `ANIM_TAG_CIRCLE_OF_LIGHT` and the legal Factory carrier.
Independent outputs are byte-identical (player `9ed6c575…7f1`, opponent
`2d5b4d2f…84a1`).

**Exact remainder/siblings:** exact remains unclaimed because the shared
framebuffer compositor deliberately rejects TAIL GLOW; it still needs
VOLBEAT art, BG palette/monbg composition, affine-alpha circle painting,
field chrome/text, and **203/203** shared-framebuffer equality twice fresh in
both orientations. `MOVE_SUPERPOWER` stays unsupported with its distinct
METEOR/FLAT_ROCK/orb/rocks/fireball/BG-shake/four-sound body.
`MOVE_SHOCK_WAVE` stays unsupported with distinct ELECTRIC_ORBS/SPARK/
LIGHTNING and charging/bolt/lightning/shake/palette tasks. Neither has
independent dense acceptance. No battle logic/RNG/controller/facility state,
boundary list, unsupported barrier, or absolute-tick/input-delay/pixel
exception changed.

## MOVE_TWINEEDLE promoted exact; NEEDLE framebuffer closed (2026-07-28)

**Verdict:** `MOVE_TWINEEDLE` is exact. Fresh complete legal Factory-party
Scene-ON evidence passes the complete move-owned body and cleanup at **37/37**
frames **95-131** player-back and **37/37** frames **99-135** opponent-front
through software/component, typed-seam, hardware-transfer, audio, register,
raw-RGB, and shared-framebuffer checks, reproduced twice fresh. Coverage is now
**58 exact / 1 partial / 217 unsupported**.

**Reusable model/evidence:** the relative-age reducer ports two parallel
linear stingers, opponent-side inversion, two animation-3 IMPACT sprites,
`AnimTask_ShakeMon2(target,2,0,5,1)`, monbg/12:8 alpha, both looped sound
families, and cleanup. Source extraction byte-pins NEEDLE, both template
contracts, and legal set-154 BEEDRILL art. Independent evidence is
byte-identical (player `eb52b2a8…6ec1`, opponent `b7022f73…5771`).

**Renderer/siblings:** the narrow compositor ports prior-software OAM/palette
transfer, target monbg, opaque rotated needles, alpha IMPACT, chrome, and
side-specific battler/stinger subpriority. `MOVE_PIN_MISSILE` stays unsupported
because it uses three arcing missile waves, basic hitsplats, and distinct short
shakes/audio. `MOVE_SPIKE_CANNON` stays unsupported because it adds wind-up/
return tasks, three attacker-relative stingers, three simultaneous hitsplats,
and a distinct longer shake/audio body. Neither has independent dense
acceptance. No battle logic/RNG/controller/facility state, boundary list,
unsupported barrier, or absolute-tick/input-delay/pixel exception changed.

## MOVE_BITE promoted exact; SHARP_TEETH framebuffer closed (2026-07-28)

**Verdict:** `MOVE_BITE` is exact. Fresh complete legal Factory-party
Scene-ON evidence passes the complete move-owned body and cleanup at **26/26**
frames **80-105** player-back and **26/26** frames **84-109** opponent-front.
Coverage is now **57 exact / 1 partial / 218 unsupported**.

**Renderer/evidence:** source extraction byte-pins the literal SHARP_TEETH
sheet, palette, and OAM contract plus the legal set-56 MEOWTH carrier sheets;
the narrow shared compositor reuses IMPACT, ONIX, healthbox, window, and chrome
assets. The portable proof pins software state, prior-software-to-hardware
OAM/matrix/palette transfer, registers, side-relative audio, raw RGB, shared
framebuffer equality, and cleanup twice fresh in both orientations. Independent
outputs are byte-identical (player `008f491d…fa6`, opponent
`309e54ed…e52`).

**Scope/controls:** `MOVE_CRUNCH` remains unsupported because it adds BG_DARK
fade/restore and a second distinct diagonal bite/shake pass.
`MOVE_SECRET_POWER` remains unsupported because the Factory building
environment dispatches to `Move_STRENGTH`; only its cave branch reaches
`Move_BITE`. Neither has independent dense acceptance. No battle
logic/RNG/controller/facility state, boundary list, unsupported barrier, or
absolute-tick/input-delay/pixel exception changed.

## MOVE_BITE promoted partial; SHARP_TEETH typed seam checkpoint (2026-07-28)

**Verdict:** `MOVE_BITE` is partial. Fresh complete legal Factory-party
Scene-ON evidence passes the complete **26/26** sharp-teeth-through-cleanup
component window at frames **80-105** player-back and **84-109**
opponent-front. Coverage is now **56 exact / 2 partial / 218 unsupported**.

**Reusable model/evidence:** the relative-age reducer and typed presentation
seam port both `gSharpTeethSpriteTemplate` affine programs, signed 8.8
translation, animation-2 IMPACT, `AnimTask_ShakeMon(target,0,4,7,1)`, monbg,
12/8 alpha, side-relative `SE_M_BITE`, and teardown. The fresh portable probe
passes both orientations; a second independent replay is byte-identical
(player `3ad220d1…5a59`, opponent `db087980…f12`).

**Exact remainder/siblings:** exact remains unclaimed until the shared
framebuffer path draws SHARP_TEETH and proves complete hardware
OAM/matrix/palette/register transfer, audio, raw RGB, and framebuffer equality
twice fresh. `MOVE_CRUNCH` stays unsupported because it adds BG_DARK
fade/restore and a second distinct diagonal bite/shake pass. `MOVE_SECRET_POWER`
stays unsupported because the Factory building environment dispatches to
`Move_STRENGTH`; only its cave branch reaches `Move_BITE`. Neither has its own
complete dense acceptance. No battle state, RNG/controller/facility logic,
boundary list, unsupported barrier, or absolute-tick branch changed.

## MOVE_FAINT_ATTACK promoted exact; audio/VBlank workload closes delayed control (2026-07-28)

**Verdict:** `MOVE_FAINT_ATTACK` is exact. Canonical opponent-front,
portable player-back, and the +30 delayed-control complete bodies each pass
**221/221** dense shared-framebuffer frames twice fresh. Coverage is now
**64 exact / 0 partial / 212 unsupported**.

**Scheduler/evidence:** the general production workload producer advances the
bootstrap-probed audio state (`gPcmDmaCounter=6`, seven-VBlank PCM period;
`c15=8`, 15-state CGB clock). It feeds ordered VBlank register-copy and
RunTasks work through the typed presentation seam. Fresh cycle evidence shows
canonical RunTasks at VCOUNT 3, queueing `BLDALPHA 0x0d03` behind displayed
`0x0e02`; the delayed PCM-refill/audio-work phase resumes at VCOUNT 224 and
writes hardware `0x0d03` immediately. The probe records source software
tasks, audio counters/channel flags, OAM/matrices/palettes/registers, and raw
RGB. Portable evidence remains byte-identical (`a96823883d3b02dd`).

**Scope:** no move-name, animation-age, input-delay, coordinate, RGB, pixel,
battle-number, turn-number, damage, RNG/controller/facility, canonical
boundary, unsupported barrier, or shared-core-interface exception changed.

## MOVE_FAINT_ATTACK typed workload seam checkpoint; remains partial (2026-07-28)

**Verdict:** `MOVE_FAINT_ATTACK` remains the sole partial. Canonical
opponent-front and portable player-back complete bodies are still **221/221**
exact; the portable body reproduced twice fresh with the same probe digest.
The +30 delayed full app control remains **220/221**, differing only at age
150 / frame 21006. Coverage remains **56 exact / 1 partial / 219
unsupported**.

**Reusable model/evidence:** `gpuRegisterQueue.ts` now accepts an ordered,
typed CPU workload for the interval between displayed samples. Its steps
carry only source operation (`CopyBufferedValuesToGpuRegs` or `RunTasks`),
VCOUNT, and already-derived GPU writes; there is no move, animation age,
input delay, absolute frame, or pixel input. `sceneOnPresentation.ts` carries
that interval and prior register state through the shared seam. Fresh
`faintAttackRegisterQueueEvidence.ts` runs the bounded mGBA probe through
`run-mgba-probe.py` and proves both actual intervals twice: canonical VCOUNT
3 queues `0x0d03` and samples `0x0e02`, while the overrun VCOUNT 224 writes
immediately and samples `0x0d03`.

**Exact remainder:** the ordinary battle presentation path does not yet have
a general source-workload scheduler that produces these display-interval
steps. Until it does, it cannot distinguish two logically identical
animation ages without an invalid delay/tick exception. Feed the typed seam
from such a general producer, require delayed **221/221**, then repeat both
complete bodies with component/register/raw-RGB/shared-framebuffer evidence
twice fresh. No boundary list, battle logic/RNG/controller/facility state, or
unsupported barrier changed.

## MOVE_SHADOW_PUNCH promoted exact; stale palette/OAM transfer closed (2026-07-27)

**Verdict:** `MOVE_SHADOW_PUNCH` is exact for both complete move-owned
Scene-ON bodies. Player-back HAUNTER -> opponent-front ONIX is **106/106**
(frames 85-190), and opponent-front HAUNTER -> player-back ONIX is
**105/105** (frames 89-193). Source/software, typed seam, registers, hardware
OAM/matrices/palettes, live audio, raw RGB, and shared framebuffer all match,
twice fresh in both orientations. Coverage is now **56 exact / 1 partial /
219 unsupported**.

**Player repair:** fresh `gMain.oamBuffer`, hardware OAM, matrix, palette, and
raw-RGB evidence found a vanilla palette-lifecycle quirk: the task copies the
attacker only into the allocated slot's faded row, then `BlendPalette` reads
the stale unfaded HP-bar row. The seam now also ports distinct clone creation
and retirement transfer epochs, ninth-clone slot ordering, priority-3
clone/BG2-monbg order, and the move's own 9/8 impact blend and anchors.

**Opponent proof/boundary:** independent evidence corrected HAUNTER's front
anchor to y=9, placed priority-2 clones over the BG1 monbg copy, pinned the
one-callback-shorter restore-BLDY hold, and extracted the 32x8 elevated-enemy
shadow that `SpriteCB_EnemyShadow` reveals after the script clears. The
generic result/message tails begin at player age 106 and opponent age 105,
after `gAnimScriptActive` and visual tasks are clear, so the fixtures stop at
the last clean move-owned frames. No battle logic, RNG, controller/facility
state, boundary list, unsupported barrier, or absolute-tick branch changed.

## MOVE_FAINT_ATTACK register-queue checkpoint; remains partial (2026-07-27)

**Verdict:** `MOVE_FAINT_ATTACK` remains partial. Canonical opponent-front
and portable player-back complete bodies remain **221/221** exact; the
portable orientation reproduced twice fresh with identical probe digest.
The required +30 delayed-control surface reproduced **220/221** twice fresh,
with only age 150 / frame 21006 differing by 789 pixels. Coverage remains
**55 exact / 2 partial / 219 unsupported**.

**Cycle/register evidence:** a new bounded mGBA probe single-steps both
accepted prefixes across ages 148-153 and reproduced byte-identically twice.
Canonical age 150 runs `AnimTask_AttackerFadeFromInvisible_Step` at VCOUNT 3:
`SetGpuReg` changes the software buffer `0x0e02→0x0d03`, queues offset
`0x52`, and leaves hardware at `0x0e02` through the displayed frame before
`CopyBufferedValuesToGpuRegs` transfers it at VCOUNT 166. The +30 run executes
the same task write between displayed frames at VCOUNT 224, so source
`SetGpuReg` writes hardware `0x0d03` immediately and the next compositor
sample exposes it. This distinguishes CPU task order, VBlank visibility, and
frame sampling; the earlier same-task-data observation was correct but too
coarse.

**Reusable checkpoint/remainder:** `gpuRegisterQueue.ts` now ports the general
source buffer, unique waiting-list, VBlank 161-225/forced-blank immediate
write, and VBlank drain rules with focused Tier-1 coverage. It is deliberately
not wired to FAINT ATTACK: the shared seam still needs a general CPU-work/
VCOUNT scheduler to determine whether `RunTasks` lands at VCOUNT 3 or 224.
Next, model that source scheduling boundary from per-frame work and feed its
phase into the register queue; then require delayed **221/221** and rerun both
orientations twice fresh. No absolute-tick, delay-specific, or pixel exception
was added.

## MOVE_DRAGON_RAGE promoted exact; composed-OAM creation boundary closed (2026-07-27)

**Verdict:** `MOVE_DRAGON_RAGE` is exact. Complete legal CHARMELEON/ONIX
Scene-ON windows match **150/150** frames 89-238 player-attacker and
**150/150** frames 93-242 opponent-attacker through source/software, typed
seam, hardware OAM/matrices/palettes/registers, live audio, raw RGB, and the
shared framebuffer in both orientations, reproduced twice fresh. Coverage is
now **55 exact / 2 partial / 219 unsupported**.

**Residual repair/evidence:** the lone player render-age-98 mismatch was a
display-transfer ordering gap. At RAM tick 186, target `AnimTask_ShakeMon`'s
absolute creation write replaces ONIX's settled `(x2=1,y2=0)` with `(0,3)`;
the strengthened `gMain.oamBuffer` probe sees composed OAM `(x=144,y=13)`
while the synchronously stepped live fields have already collapsed to
`(0,0)`. The seam now keeps live `targetOffset` distinct from
`displayedTargetOffset`, and the draw path consumes the composed value only
at that source boundary. The portable proof also corrects its typed
sheet-block comparison, pins prior-software-to-hardware OAM/matrix/palette
transfer, `DISPCNT`/zero blend state, both sound headers and side-specific
pans, raw-RGB digests, and every shared output frame.

**Orientations/controls/siblings:** opponent-attacker geometry was staged and
proved independently; its target-side `loopsewithpan` clamps the player pan
to **-63**, distinct from the player-attacker one-shot's **-64**.
`MOVE_DRAGON_BREATH` remains **85/85**, `MOVE_FLAMETHROWER` **126/126**,
`MOVE_BLAZE_KICK` **78/78**, and `MOVE_EMBER` **63/63** in both orientations
after the repair. `MOVE_FIRE_BLAST` and `MOVE_FIRE_SPIN` remain unsupported:
their audited templates/bodies are distinct and still lack complete dense
acceptance. No battle logic, RNG, controller, outcome, facility state,
boundary list, unsupported barrier, or canonical-recording import changed.

## MOVE_REFLECT promoted exact; blue-light-wall compositor closed (2026-07-27)

**Verdict:** `MOVE_REFLECT` is exact. The complete legal MINUN/SHUCKLE
Scene-ON envelopes match **208/208** frames 39-246 player-back and **211/211**
frames 39-249 opponent-front through source/software, typed seam, hardware
OAM/palette/register transfer, live audio, raw RGB, and the shared framebuffer
in both orientations, reproduced twice fresh. Coverage is now **54 exact / 3
partial / 219 unsupported**.

**Renderer/evidence:** the narrow compositor ports GreenLightWall with the
blue rotated OBJ palette, all three SPARKLE_4 lifecycles/cells and lower-OAM
overlap order, side-relative wall geometry, 0→13→0 alpha, opponent battler
BG-copy/OBJ visibility composition, one-display effect OAM/palette transfer,
field chrome, side-specific menu/used-move/result text, audio header/pan, and
clean teardown. The strengthened probe pins hardware OAM, hardware/faded/
unfaded palettes and tags, registers, raw-RGB digests, and every shared output
frame.

**Correction/controls/siblings:** dense framebuffer work caught that the
existing partial fixtures mislabeled species 354 as SHUPPET and carried
estimated 126-HP geometry; their typed contents now correctly describe the
actual legal **MINUN 167 HP / SHUCKLE 127 HP** parties and genders (legacy
filenames retained). Exact CHARM remains **93/93 body + 4/4 clear** in both
orientations twice fresh. Independent source audit keeps `MOVE_BRICK_BREAK`
unsupported because its normal and separate gBrickBreakWall/shard branches are
distinct, and `MOVE_CRUSH_CLAW` unsupported because it loads the tag but uses
lunge/shake/four claw slashes without instantiating the wall. No battle logic,
RNG, controller, outcome, facility state, boundary list, unsupported barrier,
or canonical-recording import changed.

## MOVE_REFLECT promoted partial; complete software/typed seam (2026-07-27)

**Verdict:** `MOVE_REFLECT` is partial. Legal complete-party SHUPPET/SHUCKLE
fixtures match the complete Scene-ON `currentMove=REFLECT` envelopes
**208/208** at frames 39-246 player-back and **211/211** at frames 39-249
opponent-front through the source-relative reducer and typed presentation
seam. Coverage is **53 exact / 4 partial / 219 unsupported**.

**Proof:** wall creation is relative age zero at oracle frame 72 player-back
and 76 opponent-front. Fresh local-mGBA evidence invoked only through
`tools/run-mgba-probe.py` proves the side-relative wall geometry, all three
SPARKLE_4 lifecycles/cells, allocator slot reuse, 16 palette rotations,
0→13→0 alpha, opponent visibility, sound-task lifetime, and clean wall and
blend teardown over every frame. Focused reducer, asset, seam, and boundary
tests pass.

**Exact remainder/siblings:** the shared framebuffer path intentionally
rejects REFLECT until a narrow compositor ports the one-display hardware OAM
and palette transfer, rotated BLUE_LIGHT_WALL OBJ palette, SPARKLE_4 painter
order, opponent battler BG/visibility composition, and field chrome/text.
Thus no framebuffer frame is claimed yet; exact requires complete raw-RGB
equality in both orientations twice fresh. `MOVE_BRICK_BREAK` and
`MOVE_CRUSH_CLAW` remain unsupported because their audited bodies are
independent. No damage, RNG, controller, outcome, facility state, boundary
ratchet, or unsupported-barrier change.

## BLUE_LIGHT_WALL / MOVE_REFLECT evidence-and-assets checkpoint (2026-07-27)

**Verdict:** Coverage stays **53 exact / 3 partial / 220 unsupported**.
`MOVE_REFLECT`, `MOVE_BRICK_BREAK`, and `MOVE_CRUSH_CLAW` remain unsupported;
this is source/hardware evidence and reproducible asset extraction only, not a
renderer or framebuffer acceptance claim.

**Evidence:** complete legal Level-50 parties constrain SHUPPET to REFLECT and
SHUCKLE to TACKLE in both orientations. Fresh Scene-ON mGBA probes capture
the full `currentMove=REFLECT` envelope at frames **39-246** player-back and
**39-249** opponent-front, including raw RGB, software allocator/task state,
template geometry/order, hardware OAM/matrices, palette tags/buffers, and
blend registers. The move-owned effect body starts with the wall at **72/75**,
then the three SPARKLE_4 sprites; source identifies alpha/audio lifecycle and
the `waitforvisualfinish`/`delay 1` cleanup boundary for the next renderer.

**Assets/siblings:** `extractReflectAssets.ts` byte-pins BLUE_LIGHT_WALL as
the GreenLightWall sheet with its blue palette, and SPARKLE_4 with its distinct
Sparkle3 palette. Brick Break's `choosetwoturnanim` has independently distinct
normal and gBrickBreakWall/shard shattered-wall bodies; Crush Claw merely loads
the wall and instead runs lunge/shake/four claw slashes. Focused tests pass;
no engine, state, controller, or boundary-ratchet changes.

## MOVE_ABSORB promoted exact; drain compositor closed (2026-07-27)

**Verdict:** `MOVE_ABSORB` is exact. Legal set-131 LOMBRE versus constrained
ONIX matches the complete move-owned frames **223-417 (195/195)** through the
source/software reducer, typed seam, hardware OAM/matrices/order, tagged
palette transfers, registers/monbg, live audio, raw RGB, and shared
framebuffer in both orientations, reproduced twice fresh. Coverage is now
**53 exact / 3 partial / 220 unsupported**.

**Renderer/evidence:** the narrow compositor reuses source-extracted LOMBRE,
ONIX, ORBS, IMPACT, and BLUE_STAR assets and ports the green hardware-bank
ramp, split priority/alpha, semi-transparent hitsplat and eight absorption
arcs, one-display effect and ShakeMon latches, HealingEffect stars, field
chrome, and teardown. The strengthened probe pins stock `sSpriteOrder`
transfer, affine matrices, palette tags/buffers, task counts, BG1/blend
registers, and all three sound intervals. Framebuffer evidence corrects the
player-back ONIX art corner to `(40,48)` and pins the legal in-window profiles
as LOMBRE **152/167 HP** and ONIX **110/110 HP**.

**Controls/scope:** RECOVER remains **169/169** and SYNTHESIS **130/130**
framebuffer-exact in both orientations after the change. MEGA_DRAIN,
DREAM_EATER, and GIGA_DRAIN remain unsupported with their audited distinct
orb counts/arguments, blend strengths, impact/background/fire bodies, and
audio. Full Tier-1 is green at **3762/3762** and the production build passes.
No boundary-list, unsupported-barrier, canonical-import, battle-state, RNG,
controller, outcome, or facility-state change.

## ABSORB presentation-assets checkpoint; remains partial (2026-07-27)

**State:** Coverage remains **52 exact / 4 partial / 220 unsupported**.
`MOVE_ABSORB` retains its complete **195/195** software/typed proof in both
orientations twice fresh; no renderer or framebuffer claim was added.

**Did:** source extraction now byte-pins legal set-131 LOMBRE back/front art
and the literal ORBS, IMPACT, and BLUE_STAR sheets. The three effect sheets
are byte-identical to the exact RECOVER/DYNAMIC_PUNCH source assets; exact
shared ONIX battle-mon art remains reused. The focused asset/boundary tests,
full **3761/3761** Tier-1 suite, and production build pass.

**Next:** refresh the stale shared Scene-ON oracle, then strengthen the probe
for hardware OAM/matrices/order, hardware and tagged palette transfers,
registers, live audio, raw RGB, and shared framebuffer. Port the narrow ABSORB
compositor and prove **195/195** in both orientations twice fresh; rerun exact
RECOVER and SYNTHESIS controls. Keep MEGA_DRAIN, DREAM_EATER, and GIGA_DRAIN
unsupported.

**Notes:** freshness validation correctly stopped new staging because ports
8012/8014 predate `5d97a57`; workers do not restart shared services. No
boundary-ratchet, unsupported-barrier, engine, battle-state, RNG, controller,
or canonical-import change.

## MOVE_ABSORB promoted partial; complete source/software/typed seam (2026-07-27)

**Verdict:** `MOVE_ABSORB` is partial. The legal set-131 LOMBRE Scene-ON
fixtures pass the complete move-owned source/software/typed window
**195/195** at oracle frames 223-417 in both orientations, twice fresh,
including the clear frame. Coverage is **52 exact / 4 partial / 220
unsupported**.

**Proof:** the relative reducer and expanded live probe cover the exact green
BG palette 0/2/4/2/0 ramp and restore, monbg/split priority/alpha lifecycle,
animation-2 hitsplat, ShakeMon latch, all eight literal target-to-attacker
absorption arcs, shared HealingEffect, three sound identities/restarts/pans,
allocator slots/order, and complete teardown. Side/source coordinates are
explicit typed inputs: player LOMBRE uses 72,96; opponent LOMBRE 176,49;
ONIX impact centers are 176,42 front and 72,88 back.

**Remainder/siblings:** exact still requires source presentation assets,
hardware OAM/palette transfer, raw RGB, and the shared framebuffer; no engine
file was touched. MEGA DRAIN, DREAM EATER, and GIGA DRAIN retain their audited
blend/orb/impact/background/fire/audio differences and remain unsupported.
RECOVER and SYNTHESIS remain exact shared-HealingEffect controls.

Living status for the Battle Scene ON lane. Source scope is generated in
`factory-animation-inventory.json`; the script dependency graph is generated
in `battle-animation-components.json`. Evidence, move acceptance, and
non-exclusive component tracks live in `ANIMATION_COVERAGE.json`. Run
`npm run animation:coverage` for the working view.

> **Layout (since 2026-07-26, PROGRESS entry 480):** animation-lane modules
> live in `src/animation/` and their tests in `tests/animation/` — no longer
> mixed into `src/engine/`. `tests/animation/animationBoundaryRatchet.test.ts`
> pins the import boundary (animation→engine: `battleMenu`/`bg`/`rng` only;
> engine→animation: `battleScene.ts`+`core.ts` only; kernel/AI imports
> forbidden). Comparators stay in `tools/compare/`. Path citations in this
> file and the coverage JSON are updated; `ANIMATION_PROGRESS-archive.md`
> keeps historical `src/engine/` paths as written.

## Priority and acceptance

1. Level 50 Factory: all **276** reachable, executable moves (`MOVE_NONE`
   empty slots are excluded).
2. Open Level additions: **1** move (`OUTRAGE`), plus a geometry audit of
   **8** exclusive species across **32** sets and **37** overlapping moves.
   Overlapping moves retain Level 50 evidence unless that audit finds a real
   variant dependency.
3. The **77** remaining Emerald moves, after Factory coverage.

Moves remain the acceptance unit. Components—scripts, assets, sprites, tasks,
and visual commands—are the implementation unit. A track may overlap other
tracks; FIRE PUNCH can belong to both punch and fire work. Prove a component
with one representative, batch-check siblings, and keep separate move-level
oracle evidence. Do not build one absolute-tick timeline per move.

Move acceptance covers the move-owned animation body and its evidence-required
geometry variants. Generic hit reactions, HP/result presentation, statuses,
held-item use, and controller/menu handoffs are reusable presentation
components with independent coverage; they neither block nor promote a move
animation. A status caused by a move is not part of that move's animation.

- `staged`: a deterministic matching ON-oracle/app case exists.
- `partial`: a meaningful dense window is green, but portability or a required
  variant remains.
- `exact`: the complete dense animation window is green through the shared
  presentation seam and all source- or evidence-required variants are covered.
- No entry means unsupported.

## MOVE_SCARY_FACE promoted exact; complete hardware/pixel closure (2026-07-27)

**Verdict:** `MOVE_SCARY_FACE` is exact. Legal set-133 RHYHORN versus
constrained SHUCKLE matches the complete move-owned windows **190/190** at
79-268 player-back and 83-272 opponent-front through source/software,
typed-seam, hardware OAM/palettes/registers, live audio, raw RGB, and the
shared framebuffer, reproduced twice fresh in both orientations with no body
exclusions. Coverage is **52 exact / 3 partial / 221 unsupported**.

**Renderer/evidence:** the narrow compositor uses the extracted RHYHORN,
SHUCKLE, Scary Face BG/tilemaps, and EYE_SPARKLE assets. It ports the split
hardware palette-transfer cadence, BG1 alpha/register lifecycle, one-display
eye OAM and two-display battler-task latches, source painter order, field
chrome/healthboxes/text, all three live sound intervals, and complete teardown.
The fixture HP profiles now reflect the complete legal parties actually staged
by the ROM (RHYHORN 187, SHUCKLE 127), replacing the partial-era estimates.

**Controls/scope:** CHARM remains **93/93 + 4/4 cleanup** and SPARK
**115/115 + 2/2 cleanup** exact in both orientations twice fresh. The stock
shared-`gBattleAnimArgs` overwrite remains pinned: literal offset1/pattern0 is
executed as runtime offset3/pattern1. GLARE, THUNDER, and TRI ATTACK remain
unsupported pending their own complete evidence. Generic speed-stat
presentation remains outside the move-owned boundary. No boundary-ratchet,
unsupported-barrier, canonical-import, battle-state, RNG, or controller change.

## SCARY_FACE presentation-assets checkpoint; remains partial (2026-07-27)

**State:** Coverage remains **51 exact / 4 partial / 221 unsupported**.
`MOVE_SCARY_FACE` still has its complete **190/190** software/typed proof in
both orientations; the session wound down at the next independently green
checkpoint before any renderer claim.

**Did:** merged `master` through `d0c04f8`, then landed `d9e447c`. The new
source extractor and byte-for-byte test pin legal set-133 RHYHORN back/front
art, the Scary Face BG image and both side tilemaps, and EYE_SPARKLE; exact
SHUCKLE art remains reused. Supervisor verification passed **3754/3754**
tests with the role variable removed for the launcher-profile test, the
production build, and an independent extractor/cmp run.

**Next:** add the narrow Scary Face compositor and extend its portable proof
to hardware OAM/palette/register transfer, live audio, raw RGB, and shared
framebuffer **190/190** in both orientations twice fresh. Keep GLARE, THUNDER,
and TRI ATTACK unsupported until each has complete dense evidence.

**Notes:** no renderer, engine wiring, coverage status, boundary ratchet, or
main-program file changed in this increment. No animation deferral is open.
**For the main program:** the new launcher-profile test inherits
`POKEBENCH_ROLE=supervisor|worker` and makes raw in-session `npm test` fail
four probes with exit 3; `env -u POKEBENCH_ROLE npm test` is fully green.
The freshness checker also resolves a nested animation worktree's run root as
the harness root; the actual Scene-ON service was current against
`POKEBENCH_HARNESS_ROOT`.

## MOVE_SCARY_FACE promoted partial; complete software/typed seam (2026-07-27)

**Verdict:** `MOVE_SCARY_FACE` is partial. Legal set-133 RHYHORN versus
constrained SHUCKLE passes the complete move-owned source/software/typed seam
**190/190** in both orientations, twice fresh, with no excluded body frames
and a clean boundary before generic speed-stat presentation. Coverage is
**51 exact / 4 partial / 221 unsupported**.

**Proof:** the reducer and fresh mGBA probe cover both invisible palette
controllers; side-selected BG1 tilemap/image/palette identity and the complete
`AnimTask_ScaryFace` 0→14→0 schedule; both side-mirrored EyeSparkle sprites
and all 0/4/8/4/0 cells; all three source audio restart boundaries; target
offsets; software task/sprite state; teardown; and the typed Scene-ON seam.
A real stock-ROM quirk is now explicit: the script literal is
`ShakeTargetInPattern(20,1,FALSE,pattern0)`, but the task rereads shared
`gBattleAnimArgs` after the following palette command overwrites it, so legal
execution uses offset 3/pattern1. Both the literal and every observed runtime
offset are pinned. GLARE, THUNDER, and TRI ATTACK remain unsupported.

**Exact remainder:** hardware OAM/palette/register transfer, live audio state,
raw RGB, and shared-framebuffer equality. No renderer or engine file was
touched.

## MOVE_CHARM promoted exact; magenta-heart compositor closed (2026-07-27)

**Verdict:** `MOVE_CHARM` is exact. Complete legal Scene-ON parties retain the
real challenge-0 Level-50 set-187 MINUN carrier against slower constrained
SHUCKLE. Both orientations match **93/93** complete move-owned source,
typed-seam, software/hardware-OAM, matrix, palette, audio, raw-RGB, and shared
framebuffer frames twice fresh, with no excluded body frames.

**Renderer/boundary:** the narrow compositor reuses exact SPARK MINUN/SHUCKLE
field assets and generated MAGENTA_HEART art. It ports the source ordering and
the observed split display latch (effect OAM one frame; battler task two),
affine pivot, all three hearts, field/chrome/text, and complete task/OAM/
palette/audio teardown. Four clear frames are proved after the 93-frame body;
the later generic stat-stage task begins only afterward and remains excluded.
SPARK stays exact at **115/115 + 2/2 cleanup** in both orientations twice fresh.

**Scope/siblings:** COVET retains its target ShakeMon2/Dizzy Punch remainder;
FAKE TEARS and TICKLE retain different task arguments and distinct bodies.
None is promoted. Coverage is **51 exact / 3 partial / 222 unsupported**.

## MOVE_SPARK promoted exact; shared framebuffer closed (2026-07-27)

**Verdict:** `MOVE_SPARK` is exact. Both legal set-187 MINUN orientations
match **115/115** complete source-component, typed-seam, raw-RGB, and shared
framebuffer body frames plus **2/2** cleanup frames, reproduced twice fresh.
The narrow renderer reuses the literal source-tagged ENCORE MINUN,
SELF_DESTRUCT SHUCKLE, generated SPARK_2, and DYNAMIC PUNCH IMPACT art; it
ports source OAM ordering/matrices/flips, explicit allocator tie state, the
one-display palette/effect transfer, HorizontalLunge, animation-2 impact,
source ShakeMon display latch, field/chrome/text, and ages 115-116 teardown.

**Controls/scope:** ENCORE remains **215/215** and DYNAMIC PUNCH **75/75**
component plus framebuffer exact in both orientations. The optional full
BOUNCE paralysis-window comparator is not a usable exact control at current
branch baseline (**87/450**, failures begin before its status component);
the SPARK change leaves `statusAnimation.ts` byte-untouched and its focused
tests green. THUNDERBOLT, THUNDER_WAVE, ZAP CANNON, and THUNDER SHOCK remain
unsupported. Coverage is now **50 exact / 3 partial / 223 unsupported**.

## MOVE_SPARK promoted partial; complete source body closed (2026-07-27)

**Verdict:** `MOVE_SPARK` is partial. The legal set-187 MINUN fixtures match
the complete move-owned source windows **115/115** at 79-193 player-back and
83-197 opponent-front, twice fresh, with no excluded frames, plus the minimal
cleanup tail at ages 115-116 **2/2 twice in both orientations**. The relative
reducer and typed `sceneOnPresentation` seam cover literal creation identity,
slot, creation order, subpriority, tile/priority, affine/hidden/flip state and
matrix for all six affine sparks, eight flashing sprites, the invisible
HorizontalLunge controller, impact, and all eight ElectricityEffect sprites.
The comparator also pins the three exact BG/attacker palette ramps and resets,
the exact target 0→6→0 ramp against unfaded/faded/hardware buffers, five full
sound restart/continuity/stop intervals and pans, battler offsets, registers,
one-display hardware OAM order/matrices from reducer-derived prior state, and
asset/task/OAM teardown. The earlier tautological wait claim is removed.
Coverage is now **49/276 exact, 4 partial, 223 unsupported**.

**Remainder:** no render assets or draw case were added and `battleScene.ts`
is untouched. Source-derived MINUN/SHUCKLE/SPARK_2/IMPACT assets, live
composition through the existing renderer, and **115/115 raw-RGB/framebuffer
equality in both orientations twice fresh** remain before exact. THUNDERBOLT,
THUNDER_WAVE, ZAP_CANNON, and THUNDER_SHOCK remain unsupported.

**Repair note:** the opponent-front fixture begins the flashing group with two
extra source callbacks, one initial affine-slot advance, and persistent
same-Y slot ordering. Those are explicit fixture/runtime scheduler/allocation
inputs, not a MINUN or attacker-side rule. The cleanup probe proves age 114's
last hardware arc, age 115's zero effect OAM/tasks/offsets with palettes still
owned, and age 116's palette-tag release; later generic result audio is outside
the tail.

## MOVE_SPARK staging checkpoint; remains unsupported (2026-07-27)

**Verdict:** `MOVE_SPARK` remains unsupported. Both complete legal
Battle-Scene-ON `mechanicLab` parties stage the real challenge-0 Level-50
`FRONTIER_MON_MINUN_1` set **187** (species 354, Docile, HP/Defense EVs,
Salac Berry, source Spark/Charm/Encore/Helping Hand); the active carrier has
four legal SPARK choices and slower SHUCKLE has four TACKLE choices. The
fresh mGBA probe, run through `tools/run-mgba-probe.py`, reaches current move
209 in both orientations: player-back MINUN current-move window **39-263
(225 frames)** / visual body **79-193**, opponent-front MINUN **39-363
(325)** / visual body **83-197**. Both outcomes are status-free. These are
candidate dense windows only—there is no reducer, typed seam, source asset,
OAM/register/audio comparator, renderer, or pixel claim.

**Source boundary/inventory:** `src/battle_factory.c`'s Level-50 challenge-0
range is 110-199; `battle_frontier_mons.h` set 187 is MINUN with SPARK;
`data/battle_anim_scripts.s:1945-1989` owns three attacker color
palette-cycle legs plus their three reset commands, six
`gSparkElectricitySpriteTemplate` particles, eight flashing electricity
sprites, HorizontalLunge, target hit-splat/ShakeMon, three attacker-pan
Thunderbolt2 events, target Hyper Beam, wait gates, and the post-impact
eight-sprite `ElectricityEffect` / target-pan Thunderbolt2
(`:10137`). `src/battle_anim_electric.c:119-220,515-677` defines the affine
spark, flashing/tile-cycle, target electricity callbacks and their
side-relative X/X2/picture-offset-Y geometry. Future evidence must port all
palette, movement/shake, flashing, sound, wait, geometry, lifetime and
teardown details in both orientations; THUNDERBOLT, THUNDER_WAVE, ZAP_CANNON,
and THUNDER_SHOCK remain independently unsupported.

**Evidence:** committed scenarios, semantic mGBA probe, and no-pixel
staging comparator are `mechanic-spark-*.json`, `sparkProbe.py`,
`sparkEvidence.ts`, and `fixtures/spark-*.json`. `ANIM_TAG_SPARK_2` is now a
non-exclusive component track, but no move coverage was promoted. Existing
exact controls and renderer code were untouched.

## Current resumable state (2026-07-27)

Coverage is **49/276 exact, 3 partial, 224 unsupported**. TAUNT is exact at
**125/125 player-back + 125/125 opponent-front** complete source-component,
typed-seam, software/hardware-OAM, affine-matrix, palette/register/audio,
raw-RGB, and shared-seam framebuffer frames, reproduced twice fresh.

## TAUNT promoted exact; thought-bubble/finger display path closed (2026-07-27)

**Verdict:** `MOVE_TAUNT` is exact. Legal set-184 MURKROW fixtures remain
unchanged in both orientations against constrained SHUCKLE. Complete windows
76-200 player-back and 80-204 opponent-front match **125/125** source,
typed-seam, hardware-transfer/matrix/palette/register/audio, raw-RGB, and
framebuffer frames twice fresh.

**Renderer/evidence:** MURKROW back/front plus THOUGHT_BUBBLE/FINGER_2 art and
palettes regenerate byte-for-byte; the literal existing ANGER asset alone is
reused. The narrow battleScene case ports one-display transfer, runtime
subpriority/Y/slot painter order, field chrome/healthboxes/text, and teardown.
The comparator now pins raw-RGB digests, software slots/subpriorities, reverse
hardware-OAM order, hardware affine matrices, and palette-tag lifetime.

**Controls/scope:** RAZOR LEAF remains **139/139** and SWAGGER **161/161**
source-component plus framebuffer exact in both orientations. No absolute
ticks, screenshots, canonical imports, unsupported barriers, state changes,
or boundary widening were added.

## TAUNT source/hardware body closed; framebuffer remainder bounded (2026-07-27)

**Verdict:** `MOVE_TAUNT` is partial. Complete legal Scene-ON parties retain
the real Level-50 set-184 MURKROW carrier in both orientations against slower
constrained SHUCKLE. Complete move-owned windows 76-200 player-back and
80-204 opponent-front match **125/125** source-component plus typed-seam
frames twice fresh, including final software destruction, one-display
hardware OAM, and cleared teardown.

**Source reducer/evidence:** the relative reducer ports
`gThoughtBubbleSpriteTemplate`'s forward/45-frame hold/reverse program,
`gTauntFingerSpriteTemplate`'s side-selected point/wag/lifetime, both literal
target-relative `gAngerMarkSpriteTemplate` argv programs, wait/delay
sequencing, SE_M_METRONOME, both looped SE_M_TAIL_WHIP restarts, both
SE_M_SWAGGER2 restarts/pans, software OAM, affine matrices, hardware OAM,
OBJ palettes, zero blend registers, and teardown. Swagger code is reused
only for the literal anger template semantics; TAUNT acceptance is independent.

**Precise remainder:** raw RGB is **0/125 unattempted**. Reproducibly extract
MURKROW back/front plus THOUGHT_BUBBLE/FINGER_2 art and palettes (ANGER may
reuse its already-extracted literal asset), then add only a narrow TAUNT draw
case in `src/engine/battleScene.ts` for source OAM order, one-display transfer,
field chrome/healthboxes/text, and teardown; require 125/125 both orientations
twice. This worker did not touch `battleScene.ts`. RAZOR LEAF remains 139/139
component + framebuffer exact in both orientations as the fresh control. No
absolute ticks, screenshots, canonical imports, unsupported barriers, battle
state changes, or boundary widening were added.

## TAUNT source-evidence checkpoint; remains unsupported (2026-07-27)

**Verdict:** `MOVE_TAUNT` remains unsupported. Complete legal Scene-ON
mechanicLab parties now stage the real Level-50 set-184 MURKROW carrier
(Quirky; SpDef/Defense/HP EV spread; Lax Incense) against slower constrained
SHUCKLE in both player-back and opponent-front orientations. Schedule IDs
184-189 are valid in the source Level-50 range, all active MURKROW choices
are TAUNT, and both validated runs reach `currentMove: 269` with the complete
party builder enabled.

**Source boundary:** `Move_TAUNT` owns THOUGHT_BUBBLE (45-frame hold then
reverse), FINGER_2's side-dependent animation/lifetime, two target-relative
ANGER instances, Metronome/Tail Whip/Swagger2 sound boundaries, delays and
waits. The existing SWAGGER anger reducer can be reused only for the literal
ANGER template and target argv semantics; it cannot establish the new bubble
or finger body. No reducer, typed seam, probe/comparator, assets, renderer,
or raw-RGB claim is present; the exact dense window remains deliberately
unmeasured. RAZOR LEAF stays **139/139** in both orientations as the required
typed/renderer control.

## RAZOR LEAF promoted exact; leaf/cutter display path closed (2026-07-27)

**Verdict:** `MOVE_RAZOR_LEAF` is exact. Legal challenge-0 parties retain real
set-165 WEEPINBELL in both orientations with every active choice constrained
to RAZOR LEAF and slower SHUCKLE constrained to TACKLE. Complete oracle
windows 91-229 player-back and 95-233 opponent-front match **139/139**
component, typed-seam, hardware-transfer, and raw-RGB frames twice fresh.

**Renderer/evidence:** WEEPINBELL back/front plus LEAF/RAZOR_LEAF art and
palettes regenerate byte-for-byte. The narrow battleScene case ports the
one-display effect OAM latch, target ShakeMon2 latch, source subpriority/Y
ordering including stable exact-Y slot ties, absent-partner singles monbg
no-op, alpha 12/8 register lifetime, field chrome, and cleanup.

**Controls/scope:** DYNAMIC PUNCH remains **75/75**, EXPLOSION **212/212**,
and SELF DESTRUCT **113/113** component plus framebuffer exact in both
orientations. SECRET POWER, MAGICAL LEAF, LEAF BLADE, and TWISTER remain
unsupported. No absolute ticks, screenshots, canonical imports, unsupported
barriers, controller/state changes, or boundary widening were added.

## RAZOR LEAF source-component body closed; framebuffer remainder bounded (2026-07-27)

**Verdict:** `MOVE_RAZOR_LEAF` is partial. Corrected challenge-0 mechanicLab
parties use only legal set IDs 165-170 in the 110-199 source range. Species 70
WEEPINBELL is the real set-165 carrier in both orientations, all active choices
are RAZOR LEAF, and slower SHUCKLE is constrained to TACKLE. Complete windows
91-229 player-back and 95-233 opponent-front match **139/139** twice fresh.

**Source reducer/evidence:** all ten literal leaf callbacks, both
`gRazorLeafCutterSpriteTemplate` instances (including `target_both=TRUE`
singles behavior), target ShakeMon2 plus the immediately-aborted absent-partner
task, monbg/alpha, three sound programs, software/hardware OAM, palette and
register transfers, typed seam, and teardown are dense-equal. DYNAMIC PUNCH
remains **75/75 component + framebuffer** exact in both orientations.

**Precise remainder:** raw RGB is **0/139 unattempted**. Extract WEEPINBELL
back/front and LEAF/RAZOR_LEAF art/palettes reproducibly; wire only the
battleScene animation draw path; prove BG copy/alpha, source OAM ordering,
palette/register latches, field chrome, cleanup, and 139/139 raw RGB twice.
SECRET POWER, MAGICAL LEAF, LEAF BLADE, and TWISTER remain unsupported. No
`battleScene.ts` edit, absolute ticks, screenshots, canonical imports,
unsupported barriers, or boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **47/276 exact, 3 partial, 226 unsupported**. DYNAMIC PUNCH was
exact through the shared Scene-ON seam at **75/75 player-back + 75/75
opponent-front** component, typed-seam, hardware-transfer, and raw-RGB frames,
reproduced twice fresh.

## DYNAMIC PUNCH promoted exact; monbg impact display path closed (2026-07-27)

**Verdict:** `MOVE_DYNAMIC_PUNCH` is exact. Legal mechanicLab parties stage
HITMONCHAN from real Level-50 Factory set 339 (species 107) in both
orientations, constrain all choices to DYNAMIC PUNCH, and use slower SHUCKLE
with TACKLE. Complete oracle frames 101-175 player-back and 105-179
opponent-front match **75/75** source components, typed seam, hardware OAM/
palette checks, and raw RGB, twice from fresh snapshots.

**Renderer/evidence:** HITMONCHAN back/front plus fist/hitsplat art is
reproducibly extracted and byte-for-byte tested. The narrow battleScene case
ports the one-display target offset and effect-OAM transfer, target monbg copy
as hitsplat alpha target-2, opaque fist/explosions, source explosion ordering,
field chrome, and cleanup. Fixture HP now records the source-true pre-damage
95/95 SHUCKLE display; damage remains outside this move-owned window.

**Commands/controls:** `node --experimental-strip-types
tools/compare/dynamicPunchPortable.ts <fixture>` → 75/75 component+seam and
75/75 framebuffer for both fixtures twice; `explosionPortable.ts` → 212/212
both orientations; `selfDestructPortable.ts` → 113/113 both orientations.
No absolute ticks, screenshots, coordinate/RGB fitting, canonical imports,
unsupported barriers, or boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **46/276 exact, 4 partial, 226 unsupported**. DYNAMIC PUNCH was
partial at 75/75 source-component + typed-seam frames in both orientations,
with shared-seam raw RGB still unwired at 0/75.

## DYNAMIC PUNCH component body closed; framebuffer remainder bounded (2026-07-27)

**Verdict:** `MOVE_DYNAMIC_PUNCH` is partial. Legal mechanicLab parties stage
HITMONCHAN from real Level-50 Factory set 339 (Emerald source species constant
107) in both orientations, constrain all four choices to DYNAMIC PUNCH, and
use slower SHUCKLE with TACKLE. Dense component plus typed-seam evidence is
**75/75** at oracle 101-175 player-back and 105-179 opponent-front, twice fresh.

**Source reducer/evidence:** the independent reducer ports target monbg and
alpha 12/8, the fist duration/target picture-offset position, animation-0
hitsplat and affine identity, `ShakeMon(5,0,7,1)`, the five literal
target-relative explosion instances, `ShakeMon2(5,0,28,1)`, target-pan sound
boundaries, and teardown. Literal `gExplosionSpriteTemplate` identity reuses
the existing exact explosion reducer only where its argv/offset program agrees.
PRESENT was audited and remains unsupported: its moving bag and conditional
damage/heal branches require independent dense evidence.

**Precise remainder:** extract HITMONCHAN/fist/hitsplat art; wire only the
animation drawing path through battleScene; prove software/hardware OAM,
palette/matrix/register latches, audio, cleanup, and raw RGB at 75/75 in both
orientations twice. Until then framebuffer exact is **0/75**, not exact.
EXPLOSION remains **212/212** and SELF DESTRUCT **113/113** component plus
framebuffer exact in both orientations. No absolute ticks, screenshots,
coordinate/RGB fitting, canonical imports, unsupported barriers, or boundary
widening were added.

## Previous current state (2026-07-27)

Coverage is **46/276 exact, 3 partial, 227 unsupported**. EXPLOSION is exact
through the shared Scene-ON seam at **212/212 player-back + 212/212
opponent-front** complete-body component, typed relative-seam, and raw-RGB
framebuffer frames, reproduced twice fresh. SELF DESTRUCT remains **113/113**
and DRAGON BREATH **85/85** component + framebuffer exact in both orientations
as fresh explosion/OAM/ShakeMon2/palette regression controls.

## EXPLOSION promoted exact; legal set-495 fixture corrected (2026-07-27)

**Verdict:** `MOVE_EXPLOSION` is exact. Complete legal mechanicLab parties
stage GLALIE from real Level-50 Factory set 495 in both orientations, constrain
all active choices to EXPLOSION, and use slower SHUCKLE with TACKLE. The
strengthened comparator matches **212/212 component + typed seam + raw-RGB
framebuffer** frames at oracle 76-287 player-back and 80-291 opponent-front,
twice fresh.

**Renderer/evidence:** the prior files labeled GLALIE injected internal species
362 (DUSCLOPS); acceptance first corrected them to Emerald's source ID 347,
which also source-shifted kickoff two frames and supplied the real 155 HP and
back/front geometry. GLALIE art is reproducibly extracted; the renderer reuses
the proven explosion/SHUCKLE assets and ports all ten explosion sprites, both
visible battlers' ShakeMon2 latches, nine complex BG red/black alternations,
cleanup gap, white hold, 15→0 fade, source OAM ordering, chrome, and teardown.

**Controls/scope:** SELF DESTRUCT remains **113/113** and DRAGON BREATH
**85/85** component + framebuffer exact in both orientations on fresh runs.
PRESENT remains unsupported pending its moving bag and distinct damage/heal
branches; DYNAMIC PUNCH remains unsupported pending its monbg/alpha/fist/
hitsplat/ShakeMon prelude and target-pan explosion sequence. No absolute ticks,
screenshots, coordinate/RGB fitting, exclusions, unsupported barriers,
canonical imports, or boundary widening were added.

## SELF DESTRUCT promoted to exact; explosion sprite track established (2026-07-27)

**Verdict:** `MOVE_SELF_DESTRUCT` is exact. Complete legal mechanicLab parties
stage SUDOWOODO from real Level-50 Factory set 298 in both orientations,
constrain every active choice to SELF DESTRUCT, and use slower SHUCKLE with
TACKLE. The strengthened comparator matches the complete first move-owned body
at **113/113 player-back** (oracle 82-194) and **113/113 opponent-front**
(86-198), for both source components and the shared-seam raw-RGB framebuffer,
each reproduced twice fresh.

**Source reducer/renderer:** the existing reducer's ten explosion instances,
mirrored offsets, 4/5/5/5 cells, both visible battlers' ShakeMon2, attacker-only
red 0→9→0 palette ramps, ten sound restarts, and teardown now feed a typed
Scene-ON Self Destruct config/view. The compositor renders reproducibly
extracted SUDOWOODO, SHUCKLE, and explosion art with source palette ramps,
the one-display palette/explosion OAM latches, ShakeMon2's neutral first
hardware frame plus two-display latch, source `SortSprites` Y ordering,
audio-neutral field chrome, and complete cleanup.

**Controls/scope:** DRAGON BREATH remains **85/85 component + 85/85
framebuffer** in both orientations on fresh control runs. Damage resolution,
fainting, health-bar loss, controller, turn, RNG, and facility state remain
outside this move-owned body. EXPLOSION, PRESENT, DYNAMIC PUNCH, and all other
siblings remain unsupported. No absolute ticks, screenshots, canonical
imports, unsupported barriers, or boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **44/276 exact, 4 partial, 228 unsupported**. SELF DESTRUCT was an
honest partial checkpoint: its complete first move-owned source-component body
matches the Scene-ON oracle at **113/113 player-back + 113/113 opponent-front**
frames, reproduced twice fresh, but it is not wired through the shared renderer
and has no framebuffer acceptance.

## SELF DESTRUCT source-component body closed; explosion track remains partial (2026-07-27)

**Verdict:** `MOVE_SELF_DESTRUCT` is partial. Complete legal mechanicLab parties
stage SUDOWOODO from the real Level-50 Factory set 298 in both orientations,
constrain every active choice to SELF DESTRUCT, and use slower SHUCKLE with
TACKLE. Dense oracle evidence matches **113/113** source-component frames at
oracle 82-194 player-back and 86-198 opponent-front, twice fresh.

**Source reducer/evidence:** `selfDestructAtAge` ports both literal
`SelfDestructExplode` calls (ten `gExplosionSpriteTemplate` instances), their
mirrored offsets and 4/5/5/5 display-cell program, both visible battlers'
38-toggle `AnimTask_ShakeMon2`, the duplicate forced-attacker task's identical
write, attacker-only red 0→9→0 palette ramps, all ten attacker-pan audio
restarts, and teardown. Assets for the explosion and both set-298 SUDOWOODO
orientations are reproducibly extracted.

**Precise remainder:** no `sceneOnPresentation`/`battleScene` wiring was landed,
so shared-seam raw-RGB framebuffer acceptance is **0/113 attempted**, not exact.
Port the source OAM/display latches and draw extracted SUDOWOODO, SHUCKLE, and
explosions, then require 113/113 in both orientations plus existing exact
ShakeMon2 and palette-blend framebuffer controls. EXPLOSION, PRESENT,
DYNAMIC PUNCH, and all other siblings remain unsupported. No absolute ticks,
screenshots, canonical imports, unsupported barriers, or boundary widening
were added.

## Previous current state (2026-07-27)

Coverage is **44/276 exact, 3 partial, 229 unsupported**. SWAGGER is exact
through the shared Scene-ON seam at **161/161 player-back + 161/161
opponent-front** complete-body component and framebuffer frames, reproduced
twice fresh. HYPER FANG remains **107/107** in both orientations as the
sprite/task regression control.

## SWAGGER promoted to exact; anger-mark component track established (2026-07-27)

**Verdict:** `MOVE_SWAGGER` is exact. Complete legal mechanicLab parties stage
RATTATA from real Level-50 Factory set 34 (Docile, Attack/HP, King's Rock) in
both orientations, constrain all four active choices to SWAGGER, and constrain
ONIX to TACKLE. The strengthened comparator matches the complete first
move-animation body at **161/161 player-back** (oracle 76-236) and **161/161
opponent-front** (80-240), each reproduced twice fresh.

**Source reducer/evidence:** `swaggerAtAge` ports GrowAndShrink's 12/24/12
attacker affine program, side/species Y anchoring and two-display hardware
transfer; the breath puff's four frames, player hFlip, signed fixed-point
translation, looping attacker-pan audio and terminal callback; and both
target-relative anger marks' mirrored geometry, affine-normal matrices,
allocation/OAM transfer latches, overlap, target-pan audio, and teardown.

**Renderer/controls:** breath, anger, and both set-34 RATTATA orientations are
reproducibly extracted. The shared seam renders the full body through relative
ages with raw-RGB exact field chrome and cleanup. HYPER FANG remains
**107/107** component and framebuffer exact in both orientations on fresh
control runs. FRUSTRATION, TORMENT, TAUNT, METRONOME, FAKE TEARS, and every
other sibling remain unsupported without independent dense acceptance. No
absolute ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported
barriers, or import-boundary widening were added.

## Previous current state (2026-07-27)

Coverage was **43/276 exact, 3 partial, 230 unsupported**. HYPER FANG is exact
through the shared Scene-ON seam at **107/107 player-back + 107/107
opponent-front** complete-body component and framebuffer frames, reproduced
twice fresh. POISON FANG remains **104/104** in both orientations as the
source-identical fang regression control.

## HYPER FANG promoted to exact; contest/target-side selector track established (2026-07-27)

**Verdict:** `MOVE_HYPER_FANG` is exact. Complete legal mechanicLab parties
stage RATICATE from the real Level-50 Factory set 302 in both orientations,
constrain all four active choices to HYPER FANG, and constrain ONIX to TACKLE.
The strengthened comparator matches the complete first animation body at
**107/107 player-back** (oracle 82-188) and **107/107 opponent-front**
(86-192), each reproduced twice fresh.

**Source reducer/evidence:** battle execution honestly takes
`AnimTask_IsContest`'s false result. `AnimTask_IsTargetPlayerSide` is proven
through both results, selecting `BG_IMPACT_OPPONENT` and `BG_IMPACT_PLAYER`.
The reducer ports both hardware fade ramps and target-side tilemaps, reuses
Poison Fang's `gFangSpriteTemplate` only because the source identity is
literal, and independently pins Hyper Fang's `AnimTask_ShakeMon(0,10,10,1)`,
`SE_M_BITE`/`SE_M_LEER` target panning, restore, display latches, and teardown.

**Renderer/controls:** impact/RATICATE assets are reproducibly extracted and
the shared seam renders both target-relative backgrounds, fang, shake, field
chrome, raw RGB, and cleanup from relative animation age. POISON FANG remains
**104/104** component and framebuffer exact in both orientations. Contest
state was not fabricated. MEGA PUNCH, MEGA KICK, SOLAR BEAM, FOCUS PUNCH, and
all other selector siblings remain unsupported without independent complete
dense acceptance. No absolute ticks, screenshots, coordinate/RGB fitting,
unsupported barriers, or import-boundary widening were added.

## Previous current state (2026-07-27)

Coverage is **42/276 exact, 3 partial, 231 unsupported**. POISON TAIL is exact
through the shared Scene-ON seam at **187/187 player-back + 187/187
opponent-front** complete-body component and framebuffer frames, reproduced
twice fresh. HARDEN remains **101/101** and SLUDGE BOMB remains **160/160**
in both orientations as exact controls.

## POISON TAIL promoted to exact; permanent custom MetallicShine variant closed (2026-07-27)

**Verdict:** `MOVE_POISON_TAIL` is exact. Complete legal mechanicLab parties
stage SEVIPER from real Factory set 239 (Hardy, HP/ATK, Scope Lens), constrain
all four choices to POISON TAIL, and constrain ONIX to TACKLE in both
orientations. The strengthened comparator matches the complete first
move-animation body at **187/187 player-back** (oracle 226-412) and **187/187
opponent-front** (226-412), each reproduced twice fresh.

**Source reducer/evidence:** `poisonTailAtAge` composes the existing exact
MetallicShine, horizontal lunge, ShakeMon, impact, and PoisonBubblesEffect
machinery. Closure pinned the permanent RGB(24,6,23) attacker palette and
one-display hardware transfer, the three shine sweeps/mask/register teardown,
the mirrored lunge and target-relative player-back Y_PIC_OFFSET=88, and the
first bubble's two-display cleanup handoff before the remaining literal
122/132/140/148/156/164 spawn cadence. The shared bubble motion/OAM reducer
remains single-source rather than duplicated.

**Renderer/controls:** `sceneOnPresentation`/`battleScene` render the extracted
SEVIPER orientations, metal mask, impact, poison bubbles, field chrome, custom
palette, monbg/alpha latches, software/hardware OAM and affine transfers, all
SE1 restart boundaries, and final cleanup through the relative seam. HARDEN
is still **101/101** and SLUDGE BOMB **160/160** in both orientations. No
absolute ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported
barriers, import-boundary widening, or sibling promotions were added.

## Previous current state (2026-07-27)

Coverage is **41/276 exact, 3 partial, 232 unsupported**. SLUDGE BOMB is exact
through the shared Scene-ON seam at **160/160 player-back + 160/160
opponent-front** component and framebuffer frames, reproduced twice fresh.
SLUDGE and TOXIC remain exact controls in both orientations. POISON TAIL
remains unsupported.

## SLUDGE BOMB promoted to exact; delayed sludge-hit track closed (2026-07-27)

**Verdict:** `MOVE_SLUDGE_BOMB` is exact. Complete legal Scene-ON mechanicLab
parties use WEEPINBELL, the real Level-50 Factory set-270 carrier, in both
required orientations with all four choices constrained to SLUDGE BOMB and
ONIX constrained to TACKLE. The strengthened comparator matches the complete
first move-animation script body at **160/160 player-back** (oracle 85-244)
and **160/160 opponent-front** (89-248), each reproduced twice fresh.

**Source reducer/evidence:** all ten calls reuse SLUDGE's exact
`gSludgeProjectileSpriteTemplate` reducer at their five-display-frame cadence.
The move-specific reducer ports `AnimTask_ShakeMon2(3,0,15,1)`, the delay-1
target blend cycle, three batches containing all twelve literal
`gSludgeBombHitParticleSpriteTemplate` fixed-point bodies, `waitsound`, and
the final shared `PoisonBubblesEffect`. Dense evidence checks tasks, software
and hardware OAM, affine allocation/transfer latches, palettes, all ten
`SE_M_BUBBLE3`, three `SE_M_DIG`, and six `SE_M_TOXIC` pan/restart boundaries,
cleanup, raw RGB, and the shared-seam framebuffer.

**Renderer/assets/controls:** poison-bubble art and both set-270 WEEPINBELL
orientations are reproducibly extracted. `sceneOnPresentation`/`battleScene`
render the complete body and source hardware latches through relative ages.
SLUDGE remains **102/102** and TOXIC **219/219** in both orientations. No
absolute ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported
barriers, or import-boundary widening were added. POISON TAIL remains
unsupported; no sibling was promoted.

## Previous current state (2026-07-27)

Coverage was **40/276 exact, 3 partial, 233 unsupported**. TOXIC is exact
through the shared Scene-ON seam at strengthened **219/219 player-back +
219/219 opponent-front** component and framebuffer frames, reproduced twice
fresh. SLUDGE BOMB and POISON TAIL remain unsupported.

## TOXIC promoted to exact; ToxicBubbles joins poison track (2026-07-27)

**Verdict:** `MOVE_TOXIC` is exact. Complete legal Scene-ON mechanicLab
parties use CLAMPERL, the real Level-50 Factory set-134 carrier, in both
required orientations with all four choices constrained to TOXIC and ONIX
constrained to TACKLE. The strengthened comparator matches the complete first
move-animation script body at **219/219 player-back** (oracle 219-437) and
**219/219 opponent-front** (219-437), each reproduced twice fresh.

**Source reducer/evidence:** both literal four-sprite `ToxicBubbles` calls use
their source 17-display-frame cadence, mirrored target geometry, four-frame
20-callback animation, OAM slot reuse, `AnimSpriteOnMonPos` lifetime, and
eight `SE_M_TOXIC` target-pan restarts. After the source wait and delay, the
final six sprites reuse SLUDGE's exact `PoisonBubblesEffect` reducer unchanged,
including affine terminal clamp and its six additional sound restarts. Dense
evidence checks callbacks, software and hardware OAM, one-frame affine matrix
latches, audio, cleanup, raw RGB, and the shared-seam framebuffer.

**Renderer/assets/controls:** Toxic/poison bubble art and both CLAMPERL
orientations are reproducibly extracted. `sceneOnPresentation`/`battleScene`
render the complete body and cleanup through relative ages. SLUDGE remains
**102/102** and POISON FANG **104/104** in both orientations as exact controls.
No absolute ticks, screenshots, coordinate/RGB fitting, exclusions, new
unsupported barriers, or import-boundary widening were added. SLUDGE BOMB and
POISON TAIL remain unsupported; no sibling was promoted.

## POISON FANG promoted to exact; fang contact joins poison track (2026-07-27)

**Verdict:** `MOVE_POISON_FANG` is exact. Complete legal Scene-ON mechanicLab
parties use ZUBAT, the real Level-50 Factory set-25 carrier, in both required
orientations with all four choices constrained to POISON FANG and ONIX
constrained to TACKLE. The strengthened comparator matches the complete first
move-animation script body at **104/104 player-back** (oracle 83-186) and
**104/104 opponent-front** (87-190), each reproduced twice fresh.

**Source reducer/evidence:** the reducer ports `gFangSpriteTemplate`'s complete
four-frame animation and eight-callback affine-double shrink, target
`AnimTask_ShakeMon(3,0,10,1)` including its script-created first display
latch, the delay-0 four-leg RGB(26,0,26) target palette cycle, and all six
already-proven `PoisonBubblesEffect` spawns. Dense evidence checks sprite
templates, OAM slots and affine matrices, task argv/lifetimes, faded and
hardware palette latches, raw RGB, `SE_M_BITE`, and all six `SE_M_TOXIC`
target-pan restarts.

**Renderer/assets/controls:** fang, poison-bubble, and both ZUBAT orientations
are reproducibly extracted. `sceneOnPresentation`/`battleScene` render the
complete body and cleanup through relative ages. SLUDGE remains **102/102**
and ACID **131/131** in both orientations as exact controls. No absolute
ticks, screenshots, coordinate/RGB fitting, exclusions, new unsupported
barriers, or import-boundary widening were added. TOXIC, SLUDGE BOMB, and
POISON TAIL remain unsupported; no sibling was promoted.

## SLUDGE promoted to exact; PoisonBubblesEffect established (2026-07-27)

**Verdict:** `MOVE_SLUDGE` is exact. Complete legal Scene-ON mechanicLab
parties use GRIMER, the real Level-50 Factory set-110 carrier, in both required
orientations with all four choices constrained to SLUDGE and ONIX constrained
to TACKLE. The strengthened comparator matches the complete sprite/task body
and shared-seam raw-RGB framebuffer at **102/102 player-back** (oracle
218-319) and **102/102 opponent-front** (230-331), each reproduced twice
fresh, including faded/hardware target palette latches and all seven source
sound boundaries.

**Source reducer/evidence:** the reducer ports
`gSludgeProjectileSpriteTemplate`'s 40-callback mirrored horizontal arc,
animation/frame/OAM and looping affine program; target
`AnimTask_ShakeMon(3,0,5,1)` including the animation-script task's extra
same-frame display step; the delay-1 two-leg target blend task shape; and all
six literal `PoisonBubblesEffect` spawns with side-relative x offsets,
eight-frame displayed cadence, rising/sway callbacks, affine terminal clamp,
OAM low-slot reuse, and cleanup. The live comparator caught signed GBA sine
rounding and opponent-side offset mirroring rather than fitting either. The
closure pass additionally pinned the script-created ShakeMon initializer's
first hardware latch and `SortSprites`' side-relative projectile/attacker
overlap order.

The comparator also proves every source-derived coefficient of the complete
RGB(30,0,31) target palette cycle and the hardware palette's one-frame-behind
transfer latch in both orientations. `SE_M_BUBBLE3` attacker-pan plus every
six-frame-script/eight-display-frame `SE_M_TOXIC` restart prove their song
headers, restart flags, and side-relative pan latches.

**Renderer/evidence closure:** poison-bubble projectile/bubble art and both
GRIMER orientations are reproducibly extracted. `sceneOnPresentation` and
`battleScene` render the projectile, target shake and hardware-latched palette
cycle, all six affine bubbles in source OAM order, field/text/healthboxes, and
cleanup. SING remains **245/245 player-back + 248/248 opponent-front** and
ACID remains **131/131** in both orientations as exact controls. No absolute
ticks, screenshots, coordinate/RGB fitting, exclusions, unsupported barriers,
or import-boundary widening were added.

**Sibling audit (all unsupported):** TOXIC still needs its separate toxic
asset and two four-sprite waves; SLUDGE BOMB needs ten projectile calls,
twelve distinct hit particles, its longer ShakeMon2, palette body and
waitsound; POISON FANG needs fang art/sprites, contact shake and four-leg
delay-0 palette cycle; POISON TAIL needs metallic shine, lunge/hitsplat,
shake, alpha/monbg teardown. Shared PoisonBubblesEffect coverage does not
promote any sibling.

## SING promoted to exact; ANIM_TAG_MUSIC_NOTES track established (2026-07-27)

**Verdict:** `MOVE_SING` is exact. Complete legal Scene-ON
mechanicLab parties stage AZURILL from real Factory set 1 in both player-back
and opponent-front orientations, with all four active choices constrained to
SING and ONIX constrained to TACKLE. The strengthened portable comparator
matches the complete first move-animation script block at **245/245
player-back** (oracle 213-457; notes 220-362) and **248/248 opponent-front**
(oracle 215-462; notes 222-367), each reproduced twice fresh, for component
state, affine hardware OAM/matrices, palette latches/allocation, monbg
visibility/cleanup, raw RGB, and the shared-seam framebuffer.

**Source reducer:** all twelve `gWavyMusicNotesSpriteTemplate` spawn ages,
animation indices/vFlip, signed fixed-point paths, sine y2 values, four
cycling rainbow palette indices, repeating affine scale program, and
side-relative `panse` task boundaries are ported and Tier-1 pinned. No absolute
battle ticks, screenshots, coordinate/RGB fitting, exclusions, comparator
weakening, engine imports, or unsupported barriers were added.

**Renderer/evidence closure:** MUSIC_NOTES art, all four source rainbow
palettes, and both AZURILL orientations are reproducibly extracted. The
reducer ports reciprocal affine hardware matrices and side-dependent monbg
cleanup ages. Note composition reuses the shared persistent `sSpriteOrder`
scheduler with the same live-probed allocation seed in both orientations;
this closed the final exact-y overlaps without coordinate or RGB fitting.
`sceneOnPresentation`/`battleScene` render the full body through relative
ages and shared field/OBJ mechanisms. ENCORE and BIND remain exact controls.

**Sibling audit (all unsupported):** BELLY DRUM has six alternating purple-hand
hits, six ShakeMon tasks, six slow flying-note arcs and attacker-pan sounds;
TEETER DANCE has its movement task, five fast flying-note paths/sounds and
DUCK asset; FAKE TEARS has a distinct SMALL_BUBBLES blend,
RockMonBackAndForth, looped tail-whip audio and eight thought-bubble/music-note
tear sprites; GRASS WHISTLE fixes all twelve notes to palette index 1/no
cycling and wraps them in whole-BG green blend/restore with its own pan sweep.
None has independent complete dense evidence, so none is promoted.

## DRAGON CLAW promoted to exact; PlaySE1WithPanning track established (2026-07-27)

**Verdict:** `MOVE_DRAGON_CLAW` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. Player-back and
opponent-front ALTARIA are each **137/137 strengthened component and
framebuffer frames** (oracle 82-218 and 86-222). Census: **35/276 exact,
3 partial, 238 unsupported**.

**Source/probe:** legal challenge-0 mechanicLab contexts use complete parties
around real Level-50 Factory `FRONTIER_MON_ALTARIA_1` set 412 and constrain
stock choices without transient state. Supervisor-requested evidence now
checks the target `gSpriteCoordOffsetY`, both forward/reverse palette-task
boundaries and coefficients, faded plus hardware attacker palettes, transient
SE1 song/pan restarts, sprite callbacks/lifetimes, and allocation uniqueness
in addition to the existing FireSpin/claw/attacker reducer. That stronger pass
found and fixed the reverse task's true age-93 start and the target shake's
local-age-10 restore.

**Renderer:** `battleScene.ts` now draws the extracted ALTARIA/Onix field,
hardware-latched attacker palette, task-driven ShakeMon plus both lunge phases,
all FireSpin and claw sprites, target global-Y shake, text/healthboxes, and
cleanup. Effect composition ports `SortSprites`: equal-priority sprites order
by final OAM Y (including y2), then source creation order. No absolute battle
ticks, screenshots, exclusions, or new unsupported barriers were added.

**Sibling audit (no promotions):** SKY ATTACK retains both two-turn
charge/strike branches and sky/bird/fade/impact body; RETURN retains every
friendship-power branch and its dips/lunges/hitsplats/shakes; FLATTER retains
spotlight/hardware fades, dips, 38 confetti sprites, and attacker/target sound
events; LUSTER PURGE retains psychic/white BG transitions, circle/particle
blends, six RNG hitsplats/sounds, target shake, and restore; COSMIC POWER
retains non-attacker blends, cosmic BG slide/restore, two granting stars, and
distinct centered/attacker-pan sounds. All remain unsupported.

**Controls:** AERIAL ACE remains **232/232** player-back and **236/236**
opponent-front, KNOCK OFF **59/59** in both orientations, and BIND **45/45**
in both orientations, all framebuffer-exact.

## ENCORE promoted to exact; GBA OBJ-window compositor established (2026-07-27)

**Verdict:** `MOVE_ENCORE` is exact for the complete move-owned Scene-ON body
in both player-back and opponent-front MINUN orientations. Each is **215/215
strengthened component and framebuffer frames**, reproduced twice. Coverage is
**36/276 exact, 3 partial, 237 unsupported**.

**Source/probe:** complete legal mechanicLab parties use the real challenge-0
Level-50 carrier `FRONTIER_MON_MINUN_1` set 187 (species 354, Docile, HP/DEF
EVs, Salac Berry, SPARK/CHARM/ENCORE/HELPING HAND) and stage a real preceding
move before legally selecting ENCORE. The reducer ports Create/RemoveSpotlight,
both HardwarePaletteFade directions, spotlight affine/sweep, four clapping-hand
sprites, the immediate `SE_M_ENCORE2` PlaySE2WithPanning event at relative age
60 with target pan (+63 player attacker / -63 opponent attacker), the signed
SwayMon body, window/register lifetimes, and teardown. Independent live probes
reproduce the component result. The comparator now additionally checks every
hand's x/y/x2/y2, facing matrix and clap counter; the spotlight's software
position plus hardware OAM affine-double position, matrix number, full signed
PA/PB/PC/PD matrix and one-frame x2 display latch; and WIN0/register latches.
The strengthened comparator also checks the source SwayMon terminal x2 reset,
which distinguishes the opponent-front target's idle one-pixel x2 from the
post-animation zero latch.

**Renderer:** the reusable compositor evaluates OAM in ascending index order
per scanline, charges source-derived regular/affine-double fetch costs against
the GBA OBJ cycle budget, retains the budget-exhausting object, and arbitrates
normal and OBJ-window candidates independently before applying priority/OAM
order. The ENCORE seam supplies healthboxes, battlers, clapping hands, and the
affine-double spotlight in their probed OAM slots, then applies WIN1/OBJWIN
color-effect masks. Focused Tier-1 tests pin ordering, transparent texels,
budget exhaustion, and normal/OBJ-window arbitration. No coordinate fitting,
exclusions, comparator weakening, screenshots, or absolute-tick branches were
introduced.

**Sibling audit/controls:** SKY ATTACK uses `SE_M_SKY_UPPERCUT` at attacker
pan; SUPERPOWER uses `SE_M_EARTHQUAKE` at center; FLATTER shares
`SE_M_ENCORE2` at target pan but has a distinct flatter spotlight/confetti
body; RETURN conditionally schedules repeated `SE_M_TAIL_WHIP` attacker-pan
tasks across power branches; COSMIC POWER uses `SE_M_COSMIC_POWER` centered
and retains its cosmic BG/palette/star body. None is promoted. SHADOW BALL
remains **148/148**, HARDEN **101/101**, and BIND **45/45** in both
orientations.

## SHADOW BALL promoted to exact; LoopSEAdjustPanning track established (2026-07-27)

**Verdict:** `MOVE_SHADOW_BALL` is exact through the shared Scene-ON seam in
both required orientations, each reproduced twice. Player-back and opponent-
front SABLEYE are each **148/148 task/sprite/OAM/matrix/register/palette/raw-
RGB and framebuffer frames** (oracle 256-403 and 260-407). Census: **34/276
exact, 3 partial, 239 unsupported**.

**Source/probe:** complete legal mechanicLab parties stage SABLEYE, the real
Level-50 Factory set-268 carrier, with SHADOW BALL and TACKLE legally
constrained. The reducer ports the BG_GHOST fade/wait/restore pipeline, the
complete five-play/pan LoopSEAdjustPanning schedule, ANIM_TAG_SHADOW_BALL,
gShadowBallSpriteTemplate's continuous affine rotation, all three 16/16/8
AnimShadowBall fixed-point phases, impact boundary, target
AnimTask_ShakeMon2(4,0,8,1), side-specific launch OAM order, and cleanup.

**Sibling audit (no promotions):** ICE BEAM retains its crystal stream,
palette bodies, target shake, ice finale, and alpha/monbg lifecycle; PSYBEAM
retains psychic BG, eleven ring groups, SwayMon, and target palette cycle;
AURORA BEAM retains aurora BG, rotating palette, forty rings, two shakes, and
arg-7 gate; HYPER BEAM retains blackout, attacker/target shakes, flashing
orb palette, 25 orb groups, and target blends; PSYWAVE retains psychic BG,
sine timer, twelve rings, and target palette cycle; TRI ATTACK retains its
triangle, blackout, fire, lightning/inversion, ice, and patterned-shake
bodies. Their distinct sound argv schedules are recorded in
`ANIMATION_COVERAGE.json`; all remain unsupported without independent
complete dense move evidence.

**Evidence/controls:** legal fixtures, reproducible extractor, dense probe,
portable comparator, and focused Tier-1 tests are committed. Acceptance is
**148/148 ×2 in both orientations**. After the final renderer change CALM
MIND remains **101/101**, HARDEN **101/101**, and BIND **45/45**, each in
both orientations. The animation import boundary did not widen.

Start with one representative attacker/target. Add variants only when source
inspection or comparison identifies a dependency: attacker side, front/back
orientation, battler dimensions or anchors, palette/silhouette, transformed or
substitute state, multi-turn/multi-hit state, or another explicit script input.
Every status needs a committed ON-profile trace; `exact` cannot retain a known
remainder.
## Back `BACK_ANIM_H_STRETCH` triple accepted (2026-08-03)

**State:** exact for the twelfth bounded player-back set: **12/25 back
sets, 36/75 selector variants, 136/376 Factory mappings**. The generated set
is exactly **2 mappings / 2 Factory / 0 outside** — MUK and LILEEP. Move
coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**;
`ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did:** ported `Anim_HorizontalStretchFar_Twice`/normal/slow (IDs
**117/118/91**) and shared `HorizontalStretchFar`: mod-0 two runs at duration
20/amplitude 70, mod-1 one run at 30/60, and mod-2 one run at 40/40;
initializer-first `data[2]` guard, `HandleStartAffineAnim`, signed GBA sine
and C integer division, mid-window `data[7] += 51`/wrapped `index1`, back
`sDontFlip` positive `xScale = 256 - Sin(index2, amplitude) -
Sin(index1, (amplitude / 5) * 2)`, fixed `yScale=256`, strict
`data[5] > data[6]` cycle boundary, identity affine write, twice-run
decrement/reset, terminal `ResetSpriteAfterAnim`, `WaitAnimEnd`/dummy,
OAM/matrix latency, and task zero/preserve/restore. Muk Factory index **420**
Adamant/mod-0 is twice, Lileep index **140** Docile/mod-1 is normal (internal
species ID **388**, not National Dex 345), and Muk index **612** Quiet/mod-2
is slow; both source selector siblings are source/census/nature-routed and
Factory batch-checked. No move status was promoted and no gameplay, RNG,
damage, turn, facility, or live dispatcher state changed.

**Evidence:** three fresh paired byte-identical Scene-ON receipts are dense
from selected initializer through `SpriteCallbackDummy`, retaining every
framebuffer hash plus sprite RAM/OAM/affine state: Muk twice **1835..1880 /
46 frames, 21,967 B,
`b788249706f3ba0157706a153fa19e2c9081ffc159e46ed45e17248f17eb536b`**;
Lileep normal **1838..1871 / 34, 16,198 B,
`4775b00b4e8f036195125be92e636fc41df2554824a1acd18ac081763e78128a`**;
Muk slow **1835..1878 / 44, 21,017 B,
`102606daeaa38841f4a8aaecc0538182cc5484ed995cb6e2b85d6ed5465d6a20`**.

**Verification / next:** focused source/census/routing/reducer/evidence
checks and both animation/executable ratchets are green (**4 files / 20
tests**); heap-sized `npx tsc --noEmit`, `npm run test:smoke` (**7 files /
346 tests**), full `npm test` (**674 files / 6,632 passed / 1 skipped**),
heap-sized `npm run build`, and `npm run animation:coverage` are green. No
unsupported-branch ratchet moved.
Next source-ranked unsupported player-back set is **`BACK_ANIM_GROW_STUTTER`
(set 13): 5 mappings / 3 Factory / 2 outside — ALAKAZAM, MEWTWO, QWILFISH,
EXPLOUD, and RAYQUAZA**.

## Back `BACK_ANIM_V_STRETCH` triple accepted (2026-08-03)

**State:** exact for the eleventh bounded player-back set: **11/25 back sets,
33/75 selector variants, 134/376 Factory mappings**. The generated set is
exactly **14 mappings / 14 Factory / 0 outside** — BELLSPROUT, WEEPINBELL,
VICTREEBEL, GRIMER, TANGELA, CHINCHOU, WOOPER, WOBBUFFET, WURMPLE, BARBOACH,
GULPIN, SWALOT, SEVIPER, and CRADILY. Move coverage remains **107/276 exact,
0 partial, 0 staged, 169 unsupported**; `ANIMATION_COVERAGE.json` remains
byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did:** ported `Anim_VerticalStretchBothEnds_Twice`/normal/slow (IDs
**116/115/90**) and shared `VerticalStretchBothEnds`: mod-0 two runs at
duration 20/amplitude 70, mod-1 one run at 30/60, and mod-2 one run at
40/40; initializer-first `data[2]` guard, `HandleStartAffineAnim`, signed GBA
sine and C division, mid-window `data[7] += 51`/wrapped `index1`, back
`sDontFlip` positive x-scale, composed y-scale, strict `data[5] > data[6]`
cycle boundary, identity writes, twice-run decrement/reset, terminal
`ResetSpriteAfterAnim`, and task zero/preserve/restore. Chinchou Factory
index **116** Hardy is twice, Wurmple index **4** Quirky is normal, and
Weepinbell index **165** Quiet is slow; all fourteen siblings are
source/census/nature-routed and Factory batch-checked. No move status was
promoted and no gameplay, RNG, damage, turn, facility, or live dispatcher
state changed.

**Evidence:** three fresh paired byte-identical Scene-ON receipts are dense
from selected initializer through `SpriteCallbackDummy`, retaining every
framebuffer hash plus sprite RAM/OAM/affine state: Chinchou twice
**1840..1885 / 46 frames, 22,114 B,
`456f9cdd0391f3edb503c89c6a7c7df1a6cf8cccbe9c45cf7ff6a6dc4897ef26`**;
Wurmple normal **1839..1872 / 34, 16,304 B,
`c430eeb4c6c4aa81de301fc577f6fad1451211a0afa20a488e4c39704b803345`**;
Weepinbell slow **1842..1885 / 44, 21,162 B,
`eb5dca2cb07b4d2dc440a36c4d442fc277e0428d77236cae780dd81f4cc01306`**.

**Verification / next:** focused source/census/routing/reducer/evidence checks
and both animation/executable ratchets are green (**4 files / 20 tests**);
`npm run test:smoke` is green (**7 files / 346 tests**); heap-sized
`npx tsc --noEmit` is green; full `npm test` is green (**672 files / 6,621
passed / 1 skipped**); and heap-sized `npm run build` is green (**553 modules
transformed**). `npm run animation:coverage` remains **107/276 exact, 0
partial, 0 staged, 169 unsupported**, with `ANIMATION_COVERAGE.json`
unchanged. No unsupported-branch ratchet moved. Next source-ranked unsupported
player-back set is **`BACK_ANIM_H_STRETCH` (set 12): 2 mappings / 2 Factory /
0 outside — MUK and LILEEP**.

## Back `BACK_ANIM_V_SHAKE_H_SLIDE` triple accepted (2026-08-03)

**State:** exact for the tenth bounded player-back set: **10/25 back sets,
30/75 selector variants, 120/376 Factory mappings**. The generated set is
exactly **9 mappings / 9 Factory / 0 outside** — RATTATA, RATICATE, VENONAT,
KRABBY, LEDYBA, SPINARAK, SWINUB, NINCADA, and CACNEA. Move coverage remains
**107/276 exact, 0 partial, 0 staged, 169 unsupported**;
`ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did:** ported the direct source callbacks
`Anim_VerticalShakeHorizontalSlide_Fast`/normal/slow (IDs **103/102/89**):
64/96, 48/128, and 24/128 step/modulus pairs; signed GBA `Sin(..., 4)`;
all four C horizontal phases; strict `counter > 2048`; terminal `data[6]=0`
with retained `x2`/`y2`; both `TryFlipX` no-ops under `sDontFlip`; and the
direct callback → `WaitAnimEnd` → dummy/task restoration lifecycle. The live
selector stays species + party nature only. Factory Krabby index **111**
Hardy/mod-0 is fast, Spinarak index **27** Quirky/mod-1 is normal, and Swinub
index **31** Gentle/mod-2 is slow; all nine siblings are source/census/routing
batch-checked.

**Evidence:** six fresh, paired byte-identical Scene-ON receipts are dense
from selected callback through `SpriteCallbackDummy`, retaining every
framebuffer hash plus sprite RAM/OAM/affine state: Krabby fast
**1838..1873 / 36 frames, 17,596 B,
`e4df24020fb8442bd13c73bb21e7978396fae5986219eec8053ecdde36228eb0`**;
Spinarak normal **1840..1885 / 46, 22,128 B,
`18fddc2509ceb84f8b527dc8eeef64a448204bd85391ce4168a5b45f64b47a0c`**;
Swinub slow **1838..1926 / 89, 42,671 B,
`3f0f9e2246aeafbf3ddd2db443bd5e20976fb92aced600ab6f97590b7662327e`**.

**Verification / next:** focused source/census/routing/reducer/evidence plus
both animation/executable ratchets **4 files / 20 tests**, `npx tsc --noEmit`
with `NODE_OPTIONS=--max-old-space-size=8192`, and smoke **7 files / 346
tests** are green; final coverage is unchanged. Full `npm test` is **670 files
/ 6,610 passed / 1 skipped**; `npm run build` is green at **553 modules
transformed** with the same Node heap setting.
Next source-ranked unsupported player-back set is **`BACK_ANIM_V_STRETCH`
(set 11): 14 mappings / 14 Factory / 0 outside**. No move status was promoted
and no gameplay, RNG, damage, turn, facility, or live dispatcher state changed.

## Back `BACK_ANIM_V_SHAKE` triple accepted (2026-08-03)

**State:** exact for the ninth bounded player-back set: **9/25 back sets,
27/75 selector variants, 111/376 Factory mappings**. The generated set is
exactly **38 mappings / 38 Factory / 0 outside** — ARBOK, NIDOQUEEN,
NIDOKING, GOLBAT, DIGLETT, DUGTRIO, POLIWHIRL, MACHOKE, MACHAMP, ONIX,
KINGLER, GYARADOS, DRAGONITE, MEGANIUM, FERALIGATR, FORRETRESS, STEELIX,
GRANBULL, URSARING, HOUNDOUR, HOUNDOOM, PUPITAR, SCEPTILE, NUZLEAF,
WHISCASH, MANECTRIC, SEALEO, WALREIN, MAWILE, LOUDRED, LAIRON, ARMALDO,
BAGON, SHELGON, METAGROSS, REGIROCK, REGICE, and REGISTEEL. Move coverage
remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**;
`ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`:
this send-out-only work promotes no move status.

**Did:** ported source-relative `Anim_VerticalShakeBack_Fast`,
`Anim_VerticalShakeBack`, `Anim_VerticalShakeBack_Slow`, and shared
`VerticalShakeBack`: 70/6, 60/3, and 30/3 step/amplitude pairs; signed GBA
`Sin((counter + 192) % 256, amplitude) + amplitude`; strict `counter > 2304`
cleanup; terminal increment; no `TryFlipX`; initializer-first helper/callback
cadence; `WaitAnimEnd`/dummy; and task zero/preserve/restore. The live
selector remains species + party nature only. Factory Arbok index **217**
Adamant/mod-0 is fast, Houndour index **119** Docile/mod-1 is normal, and
Manectric index **393** Modest/mod-2 is slow — every variant has a real
Factory record.

**Evidence:** six fresh paired, byte-identical Scene-ON receipts are dense
from selected initializer through `SpriteCallbackDummy`, retaining every
framebuffer hash plus sprite RAM/OAM/affine state: Arbok fast
**1837..1872 / 36 frames, 16,882 B,
`a5cdcdf3fad46139afbf8c72e39c34ff3fd4880190a2f8f402d472fe3e3c0007`**;
Houndour normal **1840..1881 / 42, 19,559 B,
`a8a14edab2813a6a0d73af0fc7a97b3ffa711055c339917ee9ea594baa325333`**;
Manectric slow **1841..1920 / 80, 36,702 B,
`c729cdcfa1d3e3ab131da3f8abccf2122d57d8608a6fd651691d70cf38c378ad`**.

**Verification / next:** focused source/census/routing/reducer/evidence
checks **2 files / 11 tests**, both animation/executable ratchets **4 files /
20 tests**, `npx tsc --noEmit`, smoke **7 files / 346 tests**, and coverage
are green. Full `npm test` is **668 files / 6,599 passed / 1 skipped**;
`npm run build` is green at **553 modules transformed** with
`NODE_OPTIONS=--max-old-space-size=8192` after this shared host's bare
default Node heap reached its 4-GB V8 limit during `tsc -b`. Next
source-ranked unsupported player-back set is
**`BACK_ANIM_V_SHAKE_H_SLIDE` (set 10): 9 mappings / 9 Factory / 0 outside**
— RATTATA, RATICATE, VENONAT, KRABBY, LEDYBA, SPINARAK, SWINUB, NINCADA, and
CACNEA. No move status was promoted and no live dispatcher wiring or gameplay
state changed.

## Back `BACK_ANIM_H_SHAKE` triple accepted (2026-08-03)

**State:** exact for the eighth bounded player-back set: **8/25 back sets,
24/75 selector variants, 73/376 Factory mappings**. The generated set is
exactly **13 mappings / 13 Factory / 0 outside** — VENUSAUR, PARASECT,
GRAVELER, GOLEM, PINECO, PILOSWINE, ELEKID, MIGHTYENA, SILCOON, CASCOON,
CACTURNE, SLAKING, and SALAMENCE. Move coverage remains **107/276 exact, 0
partial, 0 staged, 169 unsupported**; `ANIMATION_COVERAGE.json` deliberately
remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`:
this send-out-only work promotes no move status.

**Did:** ported source-relative `Anim_HorizontalShake_Fast`,
`Anim_HorizontalShake`, `Anim_HorizontalShake_Slow`, and shared
`HorizontalShake`: 70/6, 60/3, and 30/3 step/amplitude pairs; signed GBA
`Sin`; strict `counter > 2304` terminal; the terminal increment; no
`TryFlipX`; initializer-first helper/callback cadence; `WaitAnimEnd`/dummy;
and task zero/preserve/restore. The live selector remains species + party
nature only. Factory Cacturne index **254** Hasty/mod-0 is fast, Venusaur
index **537** Bold/mod-1 is normal, and Salamence index **830** Modest/mod-2
is slow — every variant has a real Factory record.

**Evidence:** six fresh paired, byte-identical Scene-ON receipts are dense
from selected initializer through `SpriteCallbackDummy`, retaining every
framebuffer hash plus sprite RAM/OAM/affine state: Cacturne fast
**1840..1875 / 36 frames, 16,813 B,
`97c700cd90700b3dc117a3f6f33a0bec5db45dea15795ba75932f10d407bc977`**;
Venusaur normal **1840..1881 / 42, 19,483 B,
`a69f036d24077f914904032669550d6e4ca29b28e8bbd5434eeffe18da9c66cb`**;
Salamence slow **1841..1920 / 80, 36,574 B,
`c4c3004247f31b143840a754fbd7da0aa61c2a0ab12e6c148427b35e15ada5a0`**.

**Verification / next:** focused source/census/routing/reducer/evidence checks
**2 files / 11 tests**, both animation/executable ratchets **4 files / 20
tests**, `npx tsc --noEmit`, smoke **7 files / 346 tests**, and coverage are
green; full `npm test` is **666 files / 6,588 passed / 1 skipped** and
`npm run build` is green at **553 modules transformed**. Next source-ranked
unsupported player-back set is **`BACK_ANIM_V_SHAKE` (set 9)**. No move status
was promoted and no live dispatcher wiring or gameplay state changed.

## Back `BACK_ANIM_CIRCLE_COUNTERCLOCKWISE` triple accepted (2026-08-03)

**State:** exact for the seventh bounded player-back set: **7/25 back sets,
21/75 selector variants, 60/376 Factory mappings**. The generated set is
exactly **2 mappings / 2 Factory / 0 outside** — HITMONTOP and SPINDA. Move
coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**;
`ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did:** ported source-relative `Anim_CircleCounterclockwise_Long`,
`Anim_CircleCounterclockwise`, `Anim_CircleCounterclockwise_Slow`, and shared
`CircleCounterclockwise`: source AddNewAnim slot, signed GBA Sin/Cos, strict
`data[2] > rotation` termination, two source TryFlipX no-ops under
`sDontFlip`, no affine/reset, and WaitAnimEnd/dummy lifecycle. The generic
live selector remains species + party nature only; friendship is not read.
Factory Hitmontop index **236** Hardy/mod-0 is long and Spinda index **145**
Relaxed/mod-1 is normal; Modest/mod-2 is staged-only because no set-7 Factory
record has natureMod 2.

**Evidence:** six fresh paired, byte-identical Scene-ON receipts are dense
from initializer through `SpriteCallbackDummy`, retaining every framebuffer
hash plus sprite RAM/OAM/affine state: Hitmontop long **1841..1886 / 46
frames, 21,647 B, `fb28652932946f61d3084eb3ca71990380353b890bb9596b63de8e92a5470336`**;
Spinda normal **1838..1862 / 25, 12,066 B,
`efea486d7eb1e16d76660523b39a8c3cfb2bdf8daa4388ef93873b91393ac6c9`**;
staged legal Modest Spinda slow **1838..1883 / 46, 21,655 B,
`f5bafbf5cd59b653da66e9d177eedfdf7346958c62eb64eeefe60d9edbf5ebdb`**.

**Verification / next:** focused source/census/routing/reducer/evidence checks
**7 files / 43 tests**, smoke **7 files / 339 tests**, `npx tsc --noEmit`,
and coverage are green; full `npm test` is **659 files / 6,525 passed / 1
skipped** and `npm run build` is green at **552 modules transformed**. Next
source-ranked unsupported back set is **`BACK_ANIM_H_SHAKE` (set 8): 13
mappings / 13 Factory / 0 outside**. No move status was promoted.

## Back `BACK_ANIM_GROW` triple accepted (2026-08-03)

**State:** exact for the sixth bounded player-back set: **6/25 back sets,
18/75 selector variants, 58/376 Factory mappings**. The generated set is
exactly **3 mappings / 3 Factory / 0 outside** — WIGGLYTUFF, KOFFING, WEEZING.
Move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**;
`ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did:** ported source-relative `Anim_Grow_Twice`, `Anim_Grow`, shared `Grow`,
and separate `Anim_GrowInStages`: TryFlipX/order, affine start, signed GBA
Sin/Cos, source integer division, shared cycle reset, staged pauses and
thresholds, terminal double-write order, WaitAnimEnd, OAM/matrix latency, and
task restoration. The live species + party-nature selector seam remains the
only routing input; friendship is not read. Weezing index **405** Adamant
selects twice/fast; Wigglytuff index **207** Relaxed selects normal; Koffing
Modest is explicitly **staged-only** because no set-6 Factory record is mod 2.

**Evidence:** six fresh Scene-ON receipts, paired byte-identical and dense
through `SpriteCallbackDummy`: Weezing twice **1839..1906 (68 frames),
30,880 B, `5949f90fe115cb1b81dcb9a768d4af963dd7d1c05171df669de8944f0d8c3104`**;
Wigglytuff normal **1842..1908 (67, 30,026 B,
`af8df9de2bbd38d267fb3d500a93741d3343124e34f24904e91f2754ba5a1dad`)**;
staged Koffing slow **1839..1955 (117, 52,934 B,
`1dc9bdb377d9c6392e5fa90dea7579aafbe9452e367c96080a8c81a7158d06ab`)**.
Every receipt retains each framebuffer hash plus sprite RAM/OAM/affine state;
Tier-1 evidence checks reducer state on every frame and asserts staged terminal
double-write ordering.

**Verification / next:** focused source/census/routing/reducer/evidence checks
**2 files / 10 tests**, smoke, `npx tsc --noEmit`, and coverage are green;
full `npm test` is **657 files / 6,516 passed / 1 skipped** and `npm run build`
is green at **552 modules transformed**. Next source-ranked unsupported set is
**`BACK_ANIM_CIRCLE_COUNTERCLOCKWISE` (set 7): 2 mappings / 2 Factory / 0
outside — HITMONTOP, SPINDA**. No move status was promoted.

## Back `BACK_ANIM_SHRINK_GROW` triple accepted (2026-08-03)

**State:** exact for the fifth bounded player-back set: **5/25 back sets,
15/75 selector variants, 55/376 Factory mappings**. The generated set is
exactly **3 mappings / 3 Factory / 0 outside** — DITTO, GLIGAR, OCTILLERY.
All three nature callbacks are accepted through the live species +
party-nature seam: Factory record 54 Hardy/mod-0 is fast and record 361
Quirky/mod-1 is normal; Gligar Modest/mod-2 slow is staged-only because no
set in this species group has natureMod 2. Overall move coverage remains
**107/276 exact, 0 partial, 0 staged, 169 unsupported**; `ANIMATION_COVERAGE.json`
is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did:** ported source-relative `Anim_ShrinkGrow_Fast`, `Anim_ShrinkGrow`,
`Anim_ShrinkGrow_Slow`, and shared `ShrinkGrow`: initializer guard/order,
`HandleStartAffineAnim`, C integer duration/y2 rules, signed GBA Sin and
affine math, phase wrapping, OAM/matrix timing, `WaitAnimEnd`, and terminal
task restoration. Added source/census/routing/reducer/evidence Tier-1 pins
and a Scene-ON dense probe retaining every framebuffer hash plus sprite RAM,
OAM, and affine state. No friendship/species/tick production branches.

**Evidence:** six fresh receipts, paired by `cmp`, dense through
`SpriteCallbackDummy`: Ditto index 54 fast **1837..1920 / 84 frames, 38,542 B,
`03d766da9a7ddc9c1a2a7c1f258dc001497d160f2dbff22713e30ed816cd4157`**;
Octillery index 361 normal **1841..1892 / 52, 23,831 B,
`2f75ee331dd01188bb987713b6bba3ad83f0a3d91f055aa22854bf27c8299718`**;
staged Gligar Modest slow **1838..1937 / 100, 45,820 B,
`1a1f6caf910d7c5158ac1b2b5ef0b083a292bf92222f60ba12365716560a2580`**.

**Verification / next:** focused reducer/evidence/source/census checks **2
files / 11 tests**, `npx tsc --noEmit`, and coverage are green. Full
`npm test`: **655 files / 6,506 passed / 1 skipped**; `npm run build`: **green,
552 modules transformed**. Next source-ranked unsupported player-back set is
**`BACK_ANIM_GROW` (set 6), 3 Factory mappings / 0 outside — WIGGLYTUFF,
KOFFING, WEEZING**. No move status was promoted.

## Back `BACK_ANIM_H_SPRING_REPEATED` triple accepted (2026-08-03)

**State:** exact for the fourth bounded player-back set: **4/25 back sets,
12/75 selector variants, 52/376 Factory mappings**. The generated set is
exactly **2 mappings / 2 Factory / 0 outside** — LUVDISC and CARVANHA. All
three nature callbacks are accepted through the live species + party-nature
seam: Hardy/mod-0 fast is staged legal only, while Factory LUVDISC index 123
Relaxed/mod-1 is normal and Factory CARVANHA index 86 Quiet/mod-2 is slow.
Overall move coverage remains **107/276 exact, 0 partial, 0 staged, 169
unsupported**; `ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did:** ported the source-relative repeated `HorizontalRepeatedSpring`
initializer/helper lifecycle with signed GBA Sin/affine math, callback
boundaries, task zero/preserve/restore, and no friendship/species/tick
production branches. Added Tier-1 reducer/routing/source/census tests and a
Scene-ON dense probe/fixture receipt set.

**Evidence:** six fresh `tools/run-mgba-probe.py` receipts, paired by `cmp`,
dense through `SpriteCallbackDummy` with every frame's RGB hash, sprite RAM,
OAM, and affine matrix: staged Luvdisc Hardy fast **1839..1906 / 68 frames,
32,584 B, `58a82e8b83c4507b68ccf1247f4c37370560cdac866c1e58a54e455872bcab8b`**;
Factory Luvdisc index 123 Relaxed normal **1839..1906 / 68, 32,087 B,
`d2b0b2692734ca7acc903cfe2d9a7f461ad55a1c2d2df0c30daaba433a210202`**;
Factory Carvanha index 86 Quiet slow **1840..1907 / 68, 32,522 B,
`396db95ffe2208e9cb88a860d60cc0c26553770e90f0ddebb5a01435edf4eed8`**.

**Verification / next:** focused repeated reducer/evidence/source/boundary
checks **3 files / 14 tests**, `npx tsc --noEmit`, and coverage are green;
full `npm test`: **653 files / 6,495 passed / 1 skipped**; `npm run build`:
**green, 552 modules transformed**. Next source-ranked unsupported player-back
set is **`BACK_ANIM_SHRINK_GROW` (set 5), 3 Factory mappings / 0 outside —
DITTO, GLIGAR, OCTILLERY**. No move status was promoted.

## Back `BACK_ANIM_H_SPRING` triple accepted (2026-08-03)

**State:** exact for the third bounded player-back set: **3/25 back sets,
9/75 selector variants, 50/376 Factory mappings**. `BACK_ANIM_H_SPRING` is
**2 mappings / 2 Factory / 0 outside** — SURSKIT and FEEBAS. Overall move
coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**;
`ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did:** added source-faithful `HorizontalSpring` plus all three entry points
to `src/animation/backSendOutAnim.ts`: normal **data7=0/data6=8/data5=512/
data4=8**, fast **8/512/16**, slow **4/256/16**; first-invocation
`HandleStartAffineAnim`, signed-s16 Sin/write reducers, affine OAM
double→normal lifecycle, terminal `WaitAnimEnd`, and task zero/preserve/
restore semantics. `TryFlipX` remains pinned absent. `BACK_ANIM_H_SLIDE` is
the accepted predecessor; `BACK_ANIM_H_SPRING_REPEATED` (LUVDISC/CARVANHA)
remains an explicit unsupported adjacent control.

**Evidence:** six fresh Scene-ON `tools/run-mgba-probe.py` runs, paired by
`cmp`, dense from initializer through `SpriteCallbackDummy`: staged SURSKIT
Hardy/mod-0 fast (not a real rental route) **1839..1906 / 68 frames,
31,872 B, `7f97f6722c47b6454b4067e57462aaa42dc404f6e11d5d6ea5f2ff7ad9920c40`**;
real SURSKIT index **42** Relaxed/normal **1839..1906 / 68,
31,422 B, `42d5f4d5c54f9958d23560de7bc54a69f03d9e3559f26aa70325311e212669ec`**;
real FEEBAS index **7** Lonely/slow **1838..1905 / 68,
31,862 B, `0ecde341e47881a57393cbacedc5b722d3be4c42bef9e92d0d47d9155badd6ff`**.
All use complete legal three-mon parties with scaffold IDs
`[154,135,188]` / `[156,149,180]`; indices 42/7 are staged via overrides
because they are below challenge-0's legal scaffold range.

**Verification / next:** focused spring/slide/vibrate + selector/source
pins + both ratchets: **10 files / 70 tests green**; `npx tsc --noEmit` and
`npm run animation:coverage` green with unchanged digest; final `npm test`:
**651 files / 6,484 passed / 1 skipped**, and `npm run build`: **green, 552
modules transformed**. Next source-ranked
unsupported player-back set: **`BACK_ANIM_H_SPRING_REPEATED` (set 4), 2
Factory mappings / 0 outside — LUVDISC and CARVANHA**. No live dispatcher
wiring or move status was promoted; no baked pixels or absolute-tick lookup.

## Back `BACK_ANIM_H_SLIDE` triple accepted (2026-08-03)

**State:** exact for a second bounded player-back set: **2/25 back sets,
6/75 selector variants, 48/376 Factory mappings**. Set 2 is **31 mappings /
31 Factory / 0 outside-Factory** — IVYSAUR, CATERPIE, WEEDLE, ODDISH, GLOOM,
PARAS, PSYDUCK, TENTACOOL, TENTACRUEL, SLOWPOKE, FARFETCHD, DEWGONG,
EXEGGCUTE, HITMONLEE, LICKITUNG, DRATINI, BAYLEEF, ARIADOS, SUDOWOODO,
SUNFLORA, QUAGSIRE, CORSOLA, REMORAID, MANTINE, SMEARGLE, SMOOCHUM,
MILTANK, MUDKIP, LOTAD, SLAKOTH, RELICANTH. This remains reducer/evidence
coverage only; no live battle dispatcher wiring is claimed.

**Did:** added the explicit back route for `LaunchAnimationTaskForBackSprite`
set 2: nature mods select fast `ANIM_H_SLIDE_FAST` (data0 20), normal
`ANIM_H_SLIDE` (40), or slow `ANIM_H_SLIDE_SLOW` (80), each initializer calls
the shared `HorizontalSlide` immediately before installing it. The separate
back reducer pins task zero/preserve/restore, `sDontFlip` plus both source
`TryFlipX` no-ops, signed-s16 `Sin`/x2 writes, terminal x2 clear,
WaitAnimEnd, and SpriteCallbackDummy restoration; no front-family assertion
is reused. Tests pin the generated global **25/75/386/376/10** census and
adjacent H-vibrate/H-spring controls.

**Evidence:** TENTACRUEL source records span every selector: index **434**
Impish → fast, **722** Quirky → normal, **626** Modest → slow. Complete legal
three-mon-per-side Scene-ON mechanicLab overrides use legal scaffold IDs
`[154,135,188]` / `[156,149,180]` because those high source records are
outside challenge-0's source range. Two independent dense mGBA receipts per
selector are byte-identical from selected initializer through dummy: fast
**1842..1865 (24 frames), 11,273 B,
44813ac0bc52abe9cad62ea8b6c019fb04a25363044f5496563cc0e161f1ee8e**;
normal **1842..1885 (44 frames), 20,199 B,
86eb4b5b1cedf5e267797f4f9eaf6831fde1b10a63a316cc6f55cd2b3302fcac**;
slow **1842..1925 (84 frames), 38,114 B,
db6b09b14767a8a3932a228a771cdbf5511efc92ade18d1320e87f2d52a717d3**.
Distinct sibling verdict: Factory BAYLEEF index **180**, Docile → normal,
uses literal legal player base ID 180 with unique-item legal teams
`[180,154,135]` / `[156,149,188]` and complete source-move override; its
fresh pair is **1839..1882 (44 frames), 20,200 B,
241db20d259d1b3d4d2d7d122c350a20ad9c131b2fc3e1fb49487ae70c807432**.

**Next:** source-ranked unsupported player-back set `BACK_ANIM_H_SPRING`
(set 3), independently scoped and evidenced.

**Notes:** focused reducer/evidence/source/extraction/boundary and
executable-frontier ratchets, `npx tsc --noEmit`, full `npm test` (649 files,
6,473 passed / 1 skipped), and `npm run build` are green.
`ANIMATION_COVERAGE.json` remains unchanged at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
No move status was promoted; no canonical framebuffer lookup, absolute-tick
fitting, or baked interactive pixels were added.

## Back `BACK_ANIM_H_VIBRATE` triple accepted (2026-08-03)

**State:** exact for one bounded player-back set: **1/25 back sets, 3/75
selector variants, 17/376 Factory mappings** (17 total / 0 outside-Factory)
— BEEDRILL, NINETALES, GASTLY, HAUNTER, PORYGON, MISDREAVUS, PORYGON2,
NINJASK, KECLEON, SABLEYE, VIBRAVA, DUSKULL, DUSCLOPS, SHUPPET, BANETTE,
LATIAS, and LATIOS. This does not claim overall send-out completion; front
coverage remains separately complete and 24 back sets remain unsupported.
`ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`;
no move status was promoted.

**Did:** added the explicit source-faithful species+nature back seam
(`src/animation/backSendOutAnim.ts`) rather than reusing front acceptance:
`GetSpeciesBackAnimSet`'s one-based-to-zero-based route, the complete global
25/75/386/376/10 census, `LaunchAnimationTaskForBackSprite`'s `3 * set +
natureMod` selector, all three H-vibrate amplitudes (Fastest 12 / Fast 9 /
normal 6), task zero/preserve/restore state, `sDontFlip`, C-truncated signed
s16 writes, no affine/flip lifecycle, `WaitAnimEnd`, and dummy terminal are
source-pinned. Focused reducer/census/source/evidence tests also pin adjacent
H_SLIDE and DIP_RIGHT_SIDE controls, generated selector extraction, and the
animation import boundary.

**Evidence:** BEEDRILL is a legal Factory representative. Fresh complete
three-Pokémon-per-side Scene-ON mechanicLab parties select nature-mod 0 Hardy
→ `ANIM_H_VIBRATE_FASTEST`, mod 1 Bold → `ANIM_H_VIBRATE_FAST`, and mod 2
Lonely → `ANIM_H_VIBRATE`. Two independent `tools/run-mgba-probe.py` receipts
per nature are byte-identical through active-to-dummy: Fastest
**1840..1883 (44 frames), 20,737 B,
3818da227b178358ac3fa0c58fe7cddb500e0bb56d7827de11ba99208bd51bbe**;
Fast **1840..1883 (44 frames), 20,588 B,
cc2fcfe92395c4bb9db03179e898046270cbf56a3b11aa33f5068bab98faed74**;
normal **1840..1883 (44 frames), 20,367 B,
e8b967069b23d04c8f524ed9c799ac22bea67af1b865c6f9ff10ac69c5fd7012**.
Each receipt pins every callback/RAM/OAM/RGB-hash frame, including static
normal-affine OAM and the task's `[0,0,15,0,0,0,0,0]` dummy restoration.
The required distinct sibling spot-check is the Factory source record
`FRONTIER_MON_GASTLY` **set/index 92**, `NATURE_LONELY`, which selects the
normal `ANIM_H_VIBRATE` route. The oracle's challenge-0 Level-50 rental
planner rejects literal set 92 because that challenge's legal source range
starts at 110, so the receipt uses the established legal scaffold IDs
`[154,135,188]` while its complete-party override stages Gastly set 92's
species, nature, and source moves. Two fresh `tools/run-mgba-probe.py`
receipts are byte-identical and dense from the first active callback through
`SpriteCallbackDummy`: **1838..1881 (44 frames), 20,367 B, SHA-256
`d18ef99788612633f1f9fd1436234dfd5ef399beba66c78f01dd74378d180f09`**.

**Next:** source-ranked unsupported back set **`BACK_ANIM_H_SLIDE`** (set 2):
**31 mappings / 31 Factory / 0 outside**, with its three nature-selected
variants requiring independent source, reducer, and dense Scene-ON evidence.

**Notes:** focused reducer/census/source/evidence/extraction/boundary sweep
including the Gastly sibling pair is green; `npx tsc --noEmit`,
`npm run animation:coverage`, and the full `npm test` (**647 files, 6,457
passed, 1 skipped / 6,458 total**) are green. `npm run build` is green (552
modules transformed). No canonical framebuffer lookup, absolute-tick image
fitting, or interactive screenshot asset was added.

## Front `ANIM_FRONT_FLIP` family accepted (2026-08-03)

**State:** exact reducer/evidence coverage for the complete generated selector
census: **1 mapping / 1 Factory-reachable / 0 outside-Factory** — PIDGEOT.
Source ID **41** closes the final Factory-front family: Factory-front coverage
is **62/62 families** and **376/376 species mappings** (the full generated
front census is 62 families / 386 mappings). `ANIMATION_COVERAGE.json` remains
byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`;
move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**.

**Did:** source pins selector neighbors 40/41/42, direct no-delay task dispatch,
Pidgeot's `1×20, 0×10, 1×15, 0×1` front-picture program, task-preserved
data[1], signed-s16 x2/y2/data[2] storage, all six source-order `TryFlipX`
calls, raw `data[2] << 8` / u16 affine writes, double-to-normal OAM reset,
and `WaitAnimEnd` -> dummy teardown. The front seam now has an extraction/
coverage ratchet for all 62 generated families and all 376 Factory mappings;
the distinct Pidgeot back selector remains deliberately unported. Two fresh,
complete legal Scene-ON PIDGEOT mGBA receipts from `tools/run-mgba-probe.py`
are byte-identical: active-to-dummy window **1616..1667 (52 frames)**,
**23,468 B**, SHA-256
`fe5a38bcddffb556d221ace425473006cc52d3b8f89acc1b5d0c951bd8f51b1b`.

**Next:** supervisor census/implementation of **back send-out animations**.
Front-family coverage is complete, but overall send-out coverage is **not**
complete because the back-animation family is separate.

**Notes:** focused reducer/source/census/evidence, adjacent-family controls,
and animation boundary ratchets are green; `npx tsc --noEmit`,
`npm run animation:coverage`, full `npm test`, and `npm run build` are green.
No move status was promoted and no canonical-screen lookup or baked pixel
behavior was added.

## Front `ANIM_GLOW_BLUE` family accepted (2026-08-02)

**State:** exact reducer/evidence coverage for the complete generated selector
census: **1 mapping / 1 Factory-reachable / 0 outside-Factory** — MILOTIC.
Source ID is **34** (the brief's expected 33 is adjacent `ANIM_GLOW_RED`).
Factory-front coverage is **61/62 families** and **375/376 species mappings**.
`ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`;
move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**.

**Did:** source pins `pokemon_animation.h:72-75`, `pokemon.c:1710,1795,
6784-6855`, `pokemon_animation.c:653-666,911-939,1539-1555,2013-2016,
5540-5544`, `util.c:264-279`, and MILOTIC's 45-frame delayed startup plus
seven 15-frame front-picture program. The selector-specific receipt pins
task-zeroed signed-s16 data, `RGB_BLUE` `0x7c00`, palette masking, amplitude
12/speed 2, strict guard/order, restore/WaitAnimEnd/dummy teardown, stable
terminal, invalid inputs, and adjacent unused glow controls. Fresh complete
legal Scene-ON MILOTIC parties produced a byte-identical active-to-dummy pair:
window **1660..1727 (68 frames)**, **58,643 B**, SHA-256
`29a28ccc3d39e04533a74065f5a561153d59899a5654966e452e3c9e98a9cfba`.
The receipt pins callback addresses, every reducer/RAM/OAM/palette frame, and
every RGB hash; no move status was promoted.

**Next:** **`ANIM_FRONT_FLIP` (PIDGEOT)**, the last unsupported
Factory-front family.

**Notes:** focused blue + black/orange regression/source/census/evidence and
both ratchets are **40/40**; `npx tsc --noEmit` and
`npm run animation:coverage` are green. Full `npm test` is **639 files /
6,401 passed / 1 skipped** and the production build is green. Commits:
`445c38fe` (reducer/census), `438053bf` (paired Scene-ON evidence), and
`5e448621` (Milotic terminal receipt regression). No move status was
promoted; this remains reducer/evidence coverage rather than live battle-seam
wiring.

## Front `ANIM_H_PIVOT` family accepted (2026-08-02)

**State:** exact reducer/evidence coverage for the complete generated selector
census: **2 mappings / 1 Factory-reachable / 1 outside-Factory** — WINGULL
and DEOXYS. Source ID **27** is promoted, bringing Factory-front coverage to
**60/62 families** and **374/376 species mappings**.
`ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`;
move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**.

**Did:** source pins `pokemon_animation.h:67`, `pokemon.c:1690,1791`, and
`pokemon_animation.c:659,911-939,1003-1077,1713-1733,5540-5544`: direct
task-installed callback (no `AddNewAnim` or `TryFlipX`), signed-s16
C-truncated arithmetic, affine/OAM writes, identity reset, `WaitAnimEnd`,
dummy teardown, stable terminal, invalid endpoints, and adjacent controls.
Fresh complete legal Scene-ON WINGULL parties produced a byte-identical
active-to-dummy pair: window **1616..1719 (104 frames)**, **47,483 B**,
SHA-256 `b709b5f8831cf086234a1e578ddb6b32bc0732b21efc248d41c0dbd7167d8e63`.
DEOXYS is source-census-only: no source or oracle evidence requires an
outside-Factory fixture variant.

**Next:** source-ranked unsupported Factory-front family **`ANIM_GLOW_BLUE`**
(MILOTIC).

**Notes:** focused lifecycle/source/census/evidence plus both ratchets are
**21/21**; `npx tsc --noEmit`, unchanged coverage, full `npm test`
(**637 files / 6,392 passed / 1 skipped**), and production build are green.
Commits: `5177440d` (reducer), `849a68f3` (probe), `b2c5f047` (evidence),
`5840bf11` (source bounds), and `36e8e894` (adjacent regression). No move
status was promoted; this remains evidence/reducer coverage rather than live
battle-seam wiring.

## Front `ANIM_TIP_MOVE_FORWARD` family accepted (2026-08-02)

**State:** exact reducer/evidence coverage for the complete generated selector
census: **1 mapping / 1 Factory-reachable / 0 outside-Factory** — RELICANTH.
Source ID **26** is promoted, bringing Factory-front coverage to **59/62
families** and **373/376 species mappings**. `ANIMATION_COVERAGE.json` remains
byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`;
move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**.

**Did:** source pins `pokemon_animation.h:66`, `pokemon.c:1762`, and
`pokemon_animation.c:658,911-939,1680-1711,5540-5544`: direct task-installed
callback (no `AddNewAnim`), task-zeroed signed-s16 state, both source-order
`TryFlipX` calls, C-truncated tip/lunge/tip-back arithmetic, exact x2 and
affine-OAM writes across 37 active/terminal callbacks, identity reset,
`WaitAnimEnd`, stable terminal, and invalid endpoints. Fresh complete legal
Scene-ON RELICANTH parties produced a byte-identical active-to-dummy pair:
window **1618..1694 (77 frames)**, **34,589 B**, SHA-256
`0c1fffb728ed675db5e0e632c85c25802bc66ed0fec83afffdfb151523ec0d6c`.

**Next:** source-ranked unsupported Factory-front family
**`ANIM_H_PIVOT`** (ID **27**), **1 Factory mapping** — WINGULL. Remaining
after this step: H_PIVOT/WINGULL, GLOW_BLUE/MILOTIC, FRONT_FLIP/PIDGEOT.

**Notes:** focused lifecycle/source/census/evidence plus both ratchets are
**346/346**; TypeScript, unchanged coverage, three full `npm test` runs
(**634 files / 6,376 passed / 1 skipped**), and production build are green.
Commits: `8f146a3a` (reducer/census/lifecycle) and `a6805428` (paired Scene-ON
evidence). This acceptance proves reducers, receipts, and terminal rest
offsets; the live battle send-out seam still does not invoke these reducers
frame-by-frame, so this is not yet playable live wiring.

## Front `ANIM_SWING_CONVEX_FAST` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **1 mapping / 1
Factory-reachable / 0 outside-Factory** — LUNATONE. Only source ID **14** is
promoted. `ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`;
move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**,
Open-only **0/1**, and Outside Factory **0/77**. No move status is promoted.

**Did:** source pins `pokemon_animation.h:51-55`, `pokemon.c:1729`,
`pokemon_animation.c:911-939,1003-1064,2552-2582,3864-3872,5540-5544`,
`sprite.h:204-217`, and `gba/types.h:82-85`: task-zeroed signed-s16 state,
fresh `AddNewAnim` defaults, selector-14 `data=50`/`runs=2`, immediate
`SwingConvex` before callback installation, all 103 no-delay callback
invocations, both source-order `TryFlipX` paths, C-truncated trig and the
opposite-sign affine-OAM rotation from concave, inter-run identity/data2 reset
and runs decrement/tail increment, final identity/`WaitAnimEnd` teardown, and
stable/invalid endpoints. Fresh complete legal Scene-ON LUNATONE parties were
probed twice only through `tools/run-mgba-probe.py`; the active-to-dummy pair
is byte-identical: window **1617..1721 (105 frames)**, **46,864 B**, SHA-256
`fd1a912e5034ef040bd4036258a82c6bf9dcbebafb9ffe6d6f31e537f553cbf8`.

**Next:** the source-ranked unsupported generated Factory-front family is
**`ANIM_TIP_MOVE_FORWARD`** (source ID **26**): **1 mapping / 1 Factory /
0 outside** — RELICANTH.

**Notes:** focused reducer/source/census/lifecycle/evidence plus concave
regression and animation/executable-frontier ratchets are **26/26**;
`npx tsc --noEmit`, `npm run animation:coverage`, full `npm test`, and
production build are green. Commits: `3090de7b` (reducer, census, lifecycle)
and `07ffcd83` (source evidence plus paired Scene-ON fixtures).

## Front `ANIM_SWING_CONCAVE_FAST` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **1 mapping / 1
Factory-reachable / 0 outside-Factory** — IGGLYBUFF. Only source ID **12** is
promoted. `ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`;
move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**,
Open-only **0/1**, and Outside Factory **0/77**. No move status is promoted.

**Did:** source pins `pokemon_animation.h:51-54`, `pokemon.c:1580`,
`pokemon_animation.c:911-939,1003-1068,2512-2550,3836-3853,5540-5544`,
`sprite.h:205,217`, and `gba/types.h:83-85`: task-zeroed signed-s16 state,
fresh `AddNewAnim` defaults, selector-12 `data=50`/`runs=2`, immediate
`SwingConcave` before callback installation, both source-order `TryFlipX`
paths, C-truncated signed-s16 trig/affine-OAM writes, the no-delay inter-run
identity/reset, final identity/`WaitAnimEnd` teardown, stable terminal, and
invalid endpoints. Fresh complete legal Scene-ON IGGLYBUFF parties were probed
twice only through `tools/run-mgba-probe.py`; the active-to-dummy pair is
byte-identical: window
**1618..1722 (105 frames)**, **47,073 B**, SHA-256
`3ce05c26f5d10bdb51d710e4be61919d3d8bcf9c03e7d072206d9f525117f764`.

**Next:** the source-ranked unsupported generated Factory-front family is
**`ANIM_SWING_CONVEX_FAST`** (source ID **14**): **1 mapping / 1 Factory /
0 outside** — LUNATONE.

**Notes:** focused reducer/source/census/lifecycle/evidence plus both ratchets
are **23/23**; `npx tsc --noEmit`, `npm run animation:coverage`, full
`npm test` (**628 files / 6,357 passed / 1 skipped**), and production build
are green. Commits: `38f73a1b` (reducer, census, lifecycle) and `34dbaac8`
(source evidence plus paired Scene-ON fixtures).

## Front `ANIM_ROTATE_TO_SIDES_TWICE` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **1 mapping / 1
Factory-reachable / 0 outside-Factory** — SOLROCK. Only source ID **8** is
promoted. `ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`;
move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**,
Open-only **0/1**, and Outside Factory **0/77**. Selector 7/51 have no
generated mapping, all back routing is unchanged, and no move status is
promoted.

**Did:** source pins `pokemon_animation.h:47-48,91`,
`pokemon_animation.c:637-640,911-939,1037-1059,2870-2916,3817-3834,5540-5544`,
and `pokemon.c:1730`: task-zeroed signed-s16 state, fresh `AddNewAnim`
defaults, selector-8 rotation 4/runs 2, immediate shared callback, every
data7 0..252 step across both runs, first-run data2/data7 reset at 256, both
source-order `TryFlipX` paths, trig/affine OAM writes, and final identity /
`WaitAnimEnd` cleanup. Fresh complete legal Scene-ON SOLROCK parties were
probed twice only through `tools/run-mgba-probe.py`; the active-to-dummy pair
is byte-identical: window **1616..1747 (132 frames)**, **59,501 B**,
SHA-256 `06ad352e574feb2b5fae6bbe818bead7af2431bc4890d90430278797e9e35dff`.

**Next:** the source-ranked unsupported generated Factory-front family is
**`ANIM_SWING_CONCAVE_FAST`** (source ID **12**): **1 mapping / 1 Factory /
0 outside** — IGGLYBUFF.

**Notes:** focused reducer/source/census/evidence is **8/8**; both
animation/executable-frontier ratchets are **9/9**; `npx tsc --noEmit`,
`npm run animation:coverage`, full `npm test` (**624 files / 6,342 passed /
1 skipped**), and production build are green. Commits: `dd22baf6` (reducer,
census, lifecycle) and `fae28869` (source evidence plus paired Scene-ON
fixtures).

## Front `ANIM_DEEP_V_SQUISH_AND_BOUNCE` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **2 mappings / 2
Factory-reachable / 0 outside-Factory** — MUK and WOBBUFFET. Only source ID
**48** is promoted. `ANIMATION_COVERAGE.json` remains byte-identical at
SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`; move
coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**,
Open-only **0/1**, Outside Factory **0/77**. Adjacent selectors, all back
routing, logical battle state, and engine boundaries are unchanged.

**Did:** source pins `pokemon_animation.h:88,125`, `pokemon.c:1495,1608`,
and `pokemon_animation.c:680,2656-2719`: task-zeroed signed-s16 state,
initializer affine start and rotation 4, C-truncated sine arithmetic, phase
0/1 transition at data4 128, delay/runs branches, affine/OAM writes, identity
reset, `WaitAnimEnd`, and stable terminal. Tier-1 source/census/lifecycle
coverage exhausts every active callback and phase (65 reducer frames), delay/
runs/counters, signed arithmetic, affine cleanup, invalid inputs, and
adjacent unsupported controls. Fresh complete legal Scene-ON parties were
probed twice per Factory species only through `tools/run-mgba-probe.py`; each
pair is byte-identical and captures the complete active-to-dummy window:
MUK **1655..1721 (67 frames)**, **31,103 B**, SHA-256
`fa36e420297d624604ee3ef267eb801141f7c1bfb56876e80fb72eb149700812`;
WOBBUFFET **1618..1704 (87 frames)**, **39,736 B**, SHA-256
`efa85c119ebbd5c8e497e558e8f26e5394fbe04dac99b9188e9beeea6592073e`.

**Next:** this bounded selector-48 step is complete; await supervisor
selection of the next unsupported generated Factory-front family. No move
status is promoted for send-out coverage.

**Notes:** focused lifecycle/source/census/evidence is **9/9**; both
animation/executable-frontier ratchets are **9/9**; `npx tsc --noEmit`,
`npm run animation:coverage`, full `npm test` (**622 files / 6,334 passed /
1 skipped**), and production build are green. Commits: `031751d0` (reducer,
census, and lifecycle tests) and `d99f9840` (source evidence, dense probe,
and paired Scene-ON fixtures). `ANIMATION_COVERAGE.json` was not modified.

## Front `ANIM_ROTATE_UP_SLAM_DOWN` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **2 mappings / 2
Factory-reachable / 0 outside-Factory** — VENUSAUR and GOLEM. Only source ID
**47** is promoted. `ANIMATION_COVERAGE.json` remains byte-identical at
SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`; move
coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**,
Open-only **0/1**, Outside Factory **0/77**. Adjacent unsupported selectors,
back routing, damage/RNG/turn order, facility state, and engine boundaries are
unchanged.

**Did:** source pins `pokemon_animation.c:643-677,911-939,1003-1068,
1368-1391,2592-2645`, `pokemon_animation.h:87`, and
`pokemon.c:1409,1482`: signed-s16 center-to-corner/data6 arithmetic, doubled
affine start, no initializer callback invocation, `_0`/`_1`/`_2` source-order
transitions, both normal-front `TryFlipX` calls, identity/normal affine reset,
and the strict VerticalShake tail through WaitAnimEnd. Tier-1 coverage exhausts
all active callback phases (**0..72**), terminal/stable terminal behavior,
affine/OAM writes, invalid inputs, signed arithmetic, and adjacent unsupported
front/back controls. Complete legal Scene-ON parties were probed twice per
Factory species only through `tools/run-mgba-probe.py`; each pair is byte-
identical and captures a dense **76-frame** window through SpriteCallbackDummy:
VENUSAUR window **1618..1693**, **34,759 B**, SHA-256
`fab9786556bf5780c29c1e7fe79526ccb2fa0ae1be0c4271cc66c9d05140aa35`;
GOLEM window **1613..1688**, **34,748 B**, SHA-256
`b4f0ad9d2a21a447ff0bc72cbf4c1680d1599a071cf0cc52b2fddf6d8e817c36`.

**Next:** this bounded selector-47 step is complete; await supervisor
selection of the next unsupported generated Factory-front family. No move
status is promoted for send-out coverage.

**Notes:** focused lifecycle/source/census/evidence is **11/11**; both
animation/executable-frontier ratchets are **9/9**; `npx tsc --noEmit`,
`npm run animation:coverage`, and production build (**552 modules
transformed**) are green. Full `npm test` is green at **620 files / 6,325
passed / 1 skipped**. Commits: `5f9092aa` (reducer/census/lifecycle),
`e91d6a15` (source evidence, dense probe, and paired Scene-ON fixtures),
`86b7e5ed` (source-correct shake-tail counter), `30d30ba8` (typed geometry
input), and `b7340908` (ledger and unsupported-control regression).

## Front `ANIM_SWING_CONCAVE_FAST_SHORT` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **3 mappings / 2
Factory-reachable / 1 outside-Factory** — SANDSHREW, LATIAS, and KYOGRE. Only
source ID **45** is promoted. `ANIMATION_COVERAGE.json` remains byte-identical
at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`; move
coverage is still **107/276 exact, 0 partial, 0 staged, 169 unsupported**.
Adjacent fast/convex selectors, back routing, damage/RNG/turn order, facility
state, and engine interfaces are untouched.

**Did:** source pins `pokemon_animation.c:643-677,911-939,1003-1068,2512-2550`,
`pokemon_animation.h:85`, `pokemon.c:1433,1785,1788`, `sprite.h:205,217`, and
`gba/types.h:83-85`: task-zeroed signed-s16 registers, `sDontFlip=TRUE`, direct
selector dispatch, `AddNewAnim` defaults with `data=50/runs=1`, immediate
`SwingConcave` call before callback installation, both source-order `TryFlipX`
calls, C-truncated indices, signed x2/affine sine writes, identity/reset/
`WaitAnimEnd` terminal, and stable terminal. Tier-1 coverage exhausts active
callbacks **0..50** and strict terminal callback **51** (`data2=52`), with
invalid input, affine/OAM width, and adjacent-control checks. Fresh complete
legal challenge-0 Scene-ON parties were probed twice per Factory species only
through `tools/run-mgba-probe.py`; pairs are byte-identical and settle battler
1 at x2=0/y2=0/`SpriteCallbackDummy`: SANDSHREW species 27, animNum 1, cmd 4,
372 B, `955a186fdeb2b253a3617590207723a4111c81a11628bab71adc5ffcdd177d9a`;
LATIAS species 380, animNum 1, cmd 6, 373 B,
`bf88104dee8bb42023b67c237d509ab80a2aa64ecbc4761d95395fcd35eb2a38`.

**Next:** this bounded selector-45 step is complete; await supervisor
selection of the next unsupported generated Factory-front family. No move
status is promoted for send-out coverage.

**Notes:** focused reducer/source/census/evidence plus both ratchets are
**20/20**; `npx tsc --noEmit`, `npm run animation:coverage`, and production
build are green. Full `npm test` is green at **618 files / 6,314 passed / 1
skipped**. Commits: `abf4ecc9` (reducer/census/dense lifecycle) and
`db4b4435` (source evidence plus paired Scene-ON fixtures).

## Front `ANIM_GLOW_ORANGE` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **2 mappings / 2
Factory-reachable / 0 outside-Factory** — KAKUNA and PONYTA. Only source ID
**32** is promoted. `ANIMATION_COVERAGE.json` remains byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`;
move coverage is still **107/276 exact, 0 partial, 0 staged, 169
unsupported**. Adjacent glow selectors, back routing, damage/RNG/turn order,
facility state, and engine interfaces are untouched.

**Did:** source pins `pokemon_animation.c:911-939,1539-1560,2003-2006`,
`pokemon_animation.h:72`, `pokemon.c:1420,1483`, `palette.h:24`, and
`constants/rgb.h:7`: task-zeroed signed `data[2]/[6]/[7]`, direct callback
install, OBJ palette masking, orange `RGB(31,22,0)` = `0x02df`, amplitude 12,
speed 2, source-order strict guard, restore/`WaitAnimEnd`, and stable terminal.
The shared port reuses only the source `GlowColor` lifecycle; dense Tier-1
coverage exhausts active callbacks **0..64** (`data2` 0..128 by twos) and
terminal **65**, including palette/sine boundaries, invalid inputs, and the
unsupported blue control while black-glow regression remains dense. Fresh
complete legal challenge-0 Scene-ON RAM probes ran twice per species only
through `tools/run-mgba-probe.py`; raw pairs are byte-identical and settle
battler 1 at x2=0/y2=0/`SpriteCallbackDummy`: KAKUNA species 14, animNum 1,
cmd 10, 373 B, `323b9838655b0faa062cb8852a08374e341e15dc02bc8f43f9f47c5e00c26c37`;
PONYTA species 77, animNum 1, cmd 1, 372 B,
`4a5bf6f9883e9527190e3af1d0a62fb4ab41124988ee567ba78a234f0fbd97ba`.

**Next:** the generated-table rank after source ID 32 is
**`ANIM_SWING_CONCAVE_FAST_SHORT`** (source ID **45**): **3 mappings / 2
Factory / 1 outside** — Factory SANDSHREW and LATIAS; KYOGRE outside.

**Notes:** focused orange/black lifecycle + evidence, species-idle, and both
ratchets are **360/360**; `npx tsc --noEmit`, `npm run animation:coverage`,
full `npm test` (**616 files / 6,303 passed / 1 skipped**), and `npm run build`
are green. Commits: `cdd9aceb` (shared lifecycle/census/dense reducer) and
`a44d1d00` (source evidence plus paired Scene-ON fixtures). No move status is
promoted for send-out coverage.

## Front `ANIM_RISING_WOBBLE` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **3 mappings / 2
Factory-reachable / 1 outside-Factory** — SPEAROW, SKIPLOOM, and CELEBI. Only
source ID **24** is promoted; no outside-Factory oracle fixture was added for
CELEBI. Adjacent selectors, back routing, moves, battle state, facility
progression, and engine boundaries remain untouched. Move coverage remains
**107/276 exact, 0 partial, 0 staged, 169 unsupported**; Open-only **0/1** and
Outside Factory **0/77**. `ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1003-1034,
1769-1800`, `pokemon_animation.h:64`, `pokemon.c:1427,1594,1657`, and
`trig.c:514-518` pin task-zeroed signed-s16 registers, `sDontFlip=TRUE`,
data0=5 callback-before-install ordering, affine start at data2=0, signed
index and masked-u8 rotation arithmetic, negated y2, identity/reset/WaitAnimEnd
teardown, and the post-branch data2 increment. Dense Tier-1 coverage exhausts
active callbacks **0..100** and strict terminal callback **101**, plus stable
terminal, invalid inputs, all phase/index boundaries, and adjacent accepted and
unsupported controls. Fresh complete legal challenge-0 Scene-ON parties were
probed twice per Factory species only through `tools/run-mgba-probe.py`; each
raw pair is byte-identical, 373 B, and settles battler 1 at x2=0/y2=0,
animNum=1/`SpriteCallbackDummy`: SPEAROW species 21, command 15, data2 21,
SHA-256 `9e1ce2d84208d71287a87450e2df28961d717329dc7cc3d3495146674bbd61ec`;
SKIPLOOM species 188, command 7, data2 188, SHA-256
`787a4f0eab9dca690d555347d938bee8fa4eb008c464e3727af53073db0be45b`.

**Gates / next:** focused species-idle + evidence tests are **334/334** and
both animation/executable-frontier ratchets are **9/9**; `npx tsc --noEmit`,
full `npm test` (**614 files / 6,292 passed / 1 skipped**), production build
(**552 modules transformed**), and `npm run animation:coverage` are green.
The next source-ranked unsupported generated Factory-front tie, derived from
the current selector table with source-ID tie-break, is
**`ANIM_GLOW_ORANGE`** (source ID **32**; **2 mappings / 2 Factory / 0 outside**)
— KAKUNA and PONYTA. No move status is promoted for send-out coverage.

> Worker routing policy moved out of this ledger on 2026-08-02 — it now lives
> in `ANIMATION_SUPERVISOR.md` ("The loop, adjusted") and `SUPERVISOR.md`
> ("Which pair — the routing rubric"), so ledger rotation cannot lose it.

## Front `ANIM_GLOW_BLACK` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **2 mappings / 2
Factory-reachable species / 0 outside-Factory mappings** — GASTLY and SABLEYE.
Only source ID **21** is promoted; adjacent glow selectors, back routing, move
coverage, battle state, facility progression, and engine interfaces are
unchanged. Coverage remains **107/276 exact, 0 partial, 0 staged, 169
unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did / evidence:** `pokemon_animation.c:911-939,1539-1560,5540-5544`,
`pokemon_animation.h:61`, `pokemon.c:1498,1703`, `sprite.h:215-217`,
`palette.h:24`, `gba/types.h:70`, and `constants/rgb.h:15` pin the task-zeroed
signed-s16 registers, direct callback install, 4-bit OBJ palette selection,
black blend, source-order strict guard, and terminal palette restoration.
Dense Tier-1 coverage exhausts active callbacks **0..128**, including every
sine coefficient and palette write, callback **129** restore/`WaitAnimEnd`,
stable terminal, palette-slot masking, all phase boundaries, and invalid
inputs; orange and blue glow controls remain unsupported. Fresh complete legal
challenge-0 Scene-ON parties were probed twice per species only through
`tools/run-mgba-probe.py`; each raw pair is byte-identical and settles battler
1 at x2=0/y2=0/`SpriteCallbackDummy`: GASTLY **372 B**, animNum 1/cmd 2/data2
92, `64e09ca6ce19b244f3f34b0ddfcd1a4ecd84327d3e7fae3de805a85590f3f637`;
SABLEYE **373 B**, animNum 1/cmd 4/data2 322,
`951a7b12ebc5d211fe26a7112cbf7b81f5890532426fc47cba82a17a13ca80a1`.

**Next / Notes:** focused family/evidence plus both ratchets are **20/20**;
regression-inclusive focused gates are **344/344**. `npx tsc --noEmit`,
`npm run animation:coverage`, full `npm test` (**613 files / 6,282 passed / 1
skipped**), and `npm run build` (**552 modules transformed**) are green.
Commits: `6b5e7953` (reducer/census/dense lifecycle), `a3997e10`
(fixtures/source/receipt evidence), and `e0c41461` (signed-width source pins).
The next source-ranked unsupported generated Factory-front family is
**`ANIM_RISING_WOBBLE`** (source ID **24**; **3 mappings / 2 Factory / 1
outside**) — SPEAROW and SKIPLOOM in Factory, CELEBI outside. No move status is
promoted for send-out coverage.

## Front `ANIM_CIRCULAR_VIBRATE` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **2 mappings / 2
Factory-reachable species / 0 outside-Factory mappings** — RAPIDASH and ABSOL.
Only source ID **17** is promoted; move coverage, back routing, adjacent
selectors, battle state, facility progression, and presentation boundaries are
unchanged. Coverage remains **107/276 exact, 0 partial, 0 staged, 169
unsupported**; `ANIMATION_COVERAGE.json` remains SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1392-1418`,
`pokemon_animation.h:57`, `pokemon.c:1484,1757`, and `trig.c:514-523` pin the
task's zeroed data[2], direct callback install, signed s16 position/data writes,
parity-selected sign, source-order amplitude sine then y-sine/x-cosine writes,
and strict terminal reset. Dense Tier-1 coverage exhausts active callbacks
**0..56** (data2 **0..504**) plus tick **57** sentinel/reset/`WaitAnimEnd`,
stable terminal, all representative x/y samples, sign alternation, and invalid
inputs. Fresh complete legal challenge-0 Scene-ON parties were probed twice per
species through `tools/run-mgba-probe.py`; each pair is byte-identical and
settles battler 1 at x2=0/y2=0/`SpriteCallbackDummy`: RAPIDASH **372 B**,
animNum 1/cmd 2/data2 78, `85fdcb480a1a70a947a1332a6c22f3f23fbcd9c1e3ff7dbcf78bf90137e50431`;
ABSOL **373 B**, animNum 1/cmd 4/data2 359,
`bb2389a403c0071b10a79610ce82ebcfcb4bea4467e261ac8c0abc4013825279`.

**Verification / next:** supervisor reruns are **335/335** green across the
lifecycle, evidence, and executable-frontier ratchet; fresh Scene-ON probes
match both committed receipts byte-for-byte. `npx tsc --noEmit` and
`npm run animation:coverage` are green. Persistent-tree `npm test` is green at
**607 files / 6,227 passed / 1 skipped**; `npm run build` is green with **549
modules transformed**. Commits: `88412662`
(reducer/census/dense lifecycle) and `24d21c24` (fixtures/source/receipt
evidence). Next largest unsupported generated Factory-front family is pending
supervisor selection.

## Front `ANIM_BACK_AND_LUNGE` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **2 mappings / 2
Factory-reachable species / 0 outside-Factory mappings** — CHARMELEON and
GROWLITHE. Only source ID **37** is promoted; back routing, adjacent selectors,
moves, battle state, engine/presentation boundaries, and
`ANIMATION_COVERAGE.json` remain untouched. Coverage is **107/276 exact, 0
partial, 0 staged, 169 unsupported**; the coverage SHA-256 remains
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:1037-1059,2028-2140,
5540-5544`, `pokemon_animation.h:77`, and `pokemon.c:1411,1464` pin the direct
affine initializer and callback install, signed-s16 position/data arithmetic,
the `_1` u8 local, `_2` u8 rotation quotient, both normal-front `TryFlipX`
calls in every active phase, 12 wobble callbacks, three rotation-unwind writes,
return-to-origin teardown, and stable `WaitAnimEnd`. Dense Tier-1 coverage
exhausts all **33 callbacks** (ticks 0..32), including every `_0`..`_4` edge,
the terminal reset, stable wait, and invalid inputs. Fresh complete legal
challenge-0 Scene-ON parties were probed twice per species only through
`tools/run-mgba-probe.py`; each pair is byte-identical: CHARMELEON **371 B**
`0190ff42c6eb73abf7aa8dbf8db1704a8ceb8fbaa05869a6f83fd668a95491bf`, GROWLITHE
**372 B** `f88488626bb95c8c9db0dd220cc74c85154c25b5632959c8c30c7d9ce1af8030`.
Both settle battler 1 at x2=0/y2=0 with `SpriteCallbackDummy`; command/data are
CHARMELEON 2/5 and GROWLITHE 5/58.

**Verification / next:** focused family/evidence plus both ratchets are
**17/17** green; `npx tsc --noEmit` and `npm run animation:coverage` are green
with unchanged counts/hash. The regression-inclusive focused run is **337/337**
green. Commits: `b6a54bca` (reducer/census), `af96fa26` (fixtures/evidence),
and `1d9ffcc4` (updated unsupported-family control). Full `npm test` is green
at **606 files / 6,218 passed / 1 skipped**; production build is green with
**549 modules transformed**. The next largest unsupported generated
Factory-front family is the source-table tie **`ANIM_CIRCULAR_VIBRATE`**
(source ID **17**; **2 mappings / 2 Factory / 0 outside**) — RAPIDASH and ABSOL.

## Front `ANIM_ZIGZAG_FAST` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **3 mappings / 3
Factory-reachable species / 0 outside-Factory mappings** — UNOWN, GLALIE, and
DUSKULL. Only source ID **10** is promoted; the accepted slow ID-75 path remains
regression-pinned. No move coverage, presentation boundary, back-sprite, battle
state, or coverage-ledger change: Level 50 **107/276 exact, 0 partial, 0
staged, 169 unsupported**; Open-only **0/1**; Outside Factory **0/77**;
`ANIMATION_COVERAGE.json` SHA-256 remains
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1290-1341,
5540-5544`, `pokemon_animation.h:50`, and
`pokemon.c:1607,1728,1742` pin `sDontFlip=TRUE`, zeroed task registers, the
fast initializer's immediate `Zigzag` then callback replacement, shared
source-order boundary/sentinel handling, and both otherwise no-op flips. Dense
Tier-1 coverage exhausts the **54** active callbacks (ticks **0..53**), each
leg transition, tick **54** sentinel/`WaitAnimEnd` handoff, stable terminal,
and invalid input. Fresh complete legal challenge-0 Scene-ON parties were
probed twice per species only through `tools/run-mgba-probe.py`; each pair is
byte-identical and settles battler 1 at x2=0/y2=0/`SpriteCallbackDummy`: UNOWN
**373 B**, animNum 0/cmd 0/data2 201,
`4bba4625ae521e0e58665b2963e5152e0d27726fa26aa506ae760c5b1e126c95`;
GLALIE **373 B**, animNum 1/cmd 4/data2 362,
`b13802454ef9b92cf94aa210d4027f2ce67a12ae96dc7ca252c044782561f3f3`;
DUSKULL **373 B**, animNum 1/cmd 6/data2 355,
`1baa7e01f12a7a3ee1b831845281a714a34667adfedebb3ac2dada343628b20a`.

**Gates / next:** focused family/evidence plus both ratchets are **336/336**
green; `npx tsc --noEmit`, full `npm test` (**604 files / 6,210 passed / 1
skipped**), production build (**549 modules transformed**), and `npm run
animation:coverage` are green. Next largest unsupported generated Factory-front
family (source-table tie-break): **`ANIM_BACK_AND_LUNGE`** (source ID **37**;
**2 mappings / 2 Factory / 0 outside**) — CHARMELEON and GROWLITHE.

## Front `ANIM_FIGURE_8` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **3 mappings / 3
Factory-reachable species / 0 outside-Factory mappings** — RATICATE, FEAROW,
and YANMA. Only source ID **43** is promoted. Adjacent selectors, back sprites,
moves, battle state, and engine boundaries remain untouched. Move coverage
remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**; Open-only
**0/1** and Outside Factory **0/77**. `ANIMATION_COVERAGE.json` is byte-identical
at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1003-1034,
2435-2471,5540-5544`, `pokemon_animation.h:83`, `pokemon.c:1426,1428,1599`,
and `trig.c:514-518` pin the ordinary opponent-front task's zeroed registers and
`sDontFlip=TRUE`, initializer-only affine start/data6=0/data7=0/callback install,
increment-before-sines ordering, both source-order flip no-ops, signed GBA sine
writes, signed affine bit patterns, and strict phase/terminal guards. Dense Tier-1
coverage exhausts all callbacks **0..63**: data6 **64->68** writes xScale=-256,
**192->196** restores +256, and terminal **252->256** clears x2/y2, writes
identity, resets affine state, and installs stable `WaitAnimEnd` on the same
callback; stable rest and invalid ticks are pinned. Fresh complete legal
challenge-0 Scene-ON parties were probed twice per species only through
`tools/run-mgba-probe.py`; each pair is byte-identical and settles battler 1 at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`: RATICATE **373 B**, cmd 11/data2 20,
`8813e872595ede6ee0047bfee2e403d8db9384763230caf2c7a18b52634d9808`;
FEAROW **372 B**, cmd 7/data2 22,
`47b454268a9660ac8756382a8464d2f3e57f2cc618f985a8cbfefe7a505484f1`;
YANMA **374 B**, cmd 21/data2 193,
`a745006922877d4441281a3403d70cf20fdc3609fbae9f686be9e2201a1b60c4`.

**Gates / next:** focused family/evidence plus both ratchets are **334/334**
green; `npx tsc --noEmit`, full `npm test` (**603 files / 6,201 passed / 1
skipped**), production build (**549 modules transformed**), and `npm run
animation:coverage` are green. Next largest unsupported generated Factory front
family: **`ANIM_ZIGZAG_FAST`** (source ID **10**; **3 mappings / 3 Factory / 0
outside**) — UNOWN, GLALIE, DUSKULL.

## Front `ANIM_H_SLIDE` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **4 mappings / 4
Factory-reachable species / 0 outside-Factory mappings** — KRABBY, CORSOLA,
ZIGZAGOON, and WHISMUR. Only source ID **3** is promoted. The accepted slow
source-ID-70 path remains dense regression-pinned; `ANIM_H_SLIDE_FAST`, back
sprites, adjacent selectors, moves, battle state, and engine boundaries remain
untouched. Move coverage remains **107/276 exact, 0 partial, 0 staged, 169
unsupported**; Open-only **0/1** and Outside Factory **0/77**.
`ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1131-1153,
3665-3669,5540-5544`, `pokemon_animation.h:43`, `pokemon.c:1504,1628,1669,
1751`, and `trig.c:514-518` pin `Task_HandleMonAnimation`'s data2 zeroing and
`sDontFlip=TRUE`, selector-3 data0=40, immediate `HorizontalSlide` before
callback installation, both source-order no-op `TryFlipX` calls, and C-truncated
sine indices. Dense reducer coverage exhausts motion ticks **0..40**; strict
terminal tick **41** clears x2, installs `WaitAnimEnd`, and increments data2 to
42, followed by stable terminal and invalid-input checks. Fresh complete legal
challenge-0 Scene-ON parties were probed twice each only through
`tools/run-mgba-probe.py` in a fresh `mktemp` directory; pairs are byte-identical
and settle battler 1 at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`: KRABBY
**372 B**, cmd 5/data2 98, `cea94859fc353e431fc7393228cbc4b18f5532a6bcb95af10219cc5df5648b07`;
CORSOLA **373 B**, cmd 4/data2 222, `b76201a913b2036e0d7c3cc8e939431a6a0d40f03c03846f43996abb3aa52cd4`;
ZIGZAGOON **373 B**, cmd 4/data2 288, `e3261da2b51b339985c30c32f04252739a2d7ce475db406e2816fd330467b864`;
WHISMUR **373 B**, cmd 9/data2 370, `094437764c82a40da10b929ba235895427a46cbd646c5a2e77591ca6c6783889`.

**Gates / next:** focused family/evidence plus both animation ratchets are
**332/332** green; `npx tsc --noEmit`, full `npm test` (**602 files / 6,190
passed / 1 skipped**), production build (**549 modules transformed**), and
`npm run animation:coverage` are green. Next largest unsupported generated
Factory front family: **`ANIM_FIGURE_8`** (source ID 43; **3 mappings / 3
Factory / 0 outside**) — RATICATE, FEAROW, YANMA.

## Front `ANIM_TWIST` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **5 mappings / 5
Factory-reachable species / 0 outside-Factory mappings** — SHELLDER, HORSEA,
STARMIE, CLAMPERL, and ANORITH. Only source ID **18** is promoted; the
accepted source-ID-78 `ANIM_TWIST_TWICE` path remains regression-pinned. No
adjacent selector, back route, move, battle state, or engine boundary changed.
Move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**;
Open-only **0/1** and Outside Factory **0/77**. `ANIMATION_COVERAGE.json`
remains SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:1037-1059,1420-1470,
3732-3741,5540-5544`, `pokemon_animation.h:58`, and
`pokemon.c:1496,1522,1527,1754,1771` pin `AddNewAnim` defaults, normal
rotation=512/delay=0/implicit runs=1, immediate `Twist` before callback
installation, source-shared signed-s16 sine/u16 affine writes, and the strict
`> rotation` identity/reset/`WaitAnimEnd` handoff. Dense Tier-1 coverage
exhausts all **34** callbacks (motion ticks 0..32 consuming 0..512; terminal
tick 33 sees 528 and leaves data2=544) plus stable rest and invalid inputs.
Fresh complete legal challenge-0 Scene-ON parties were probed twice each only
through `tools/run-mgba-probe.py`; raw pairs are byte-identical: SHELLDER
**372 B** `f9b846b9d9418dd0a678c4d1222f7c9df42464634fee8ac0bd39a3b0e6c02b6a`,
HORSEA **373 B** `16d0d76e49bf990c01fa4957dc6ff92d99510fe56b3e2141478ce82d64c082d3`,
STARMIE **373 B** `9151d0bd0b93524e3ecf9091c2e7aebae9e9860db06cfb0398606944df1e0712`,
CLAMPERL **373 B** `8df94958eab3a2d6d67008250c5511f1b2902f1b70b106aadfe397e2fcf05f61`,
and ANORITH **373 B** `81ddad2de88ce1327715b4b3a17141f60c0d3339a8f967977b1e8f63cbefa48f`.
Each settles battler 1 at x2=0/y2=0, animNum=1, its source command index,
species data2, and `SpriteCallbackDummy`.

**Verification / next:** focused family/evidence plus both animation ratchets
are **329/329** green; `npx tsc --noEmit`, full `npm test` (**601 files /
6,177 passed / 1 skipped**), and production build (**549 modules transformed**)
are green. The next largest unsupported generated Factory front family is
**`ANIM_H_SLIDE`** (source ID **3**; **4 mappings / 4 Factory / 0 outside**) —
KRABBY, CORSOLA, ZIGZAGOON, and WHISMUR.

## Front `ANIM_TUMBLING_FRONT_FLIP_TWICE` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **1 mapping / 1
Factory-reachable species / 0 outside-Factory mappings** — MAGNEMITE. Only
source ID **84** is promoted; unused `ANIM_TUMBLING_FRONT_FLIP`, adjacent
selector 85, back sprites, moves, and engine boundaries remain untouched.
Move coverage remains **107/276 exact, 0 partial, 0 staged, 169 unsupported**;
Open-only **0/1** and Outside Factory **0/77**. `ANIMATION_COVERAGE.json`
remains SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:1037-1059,2366-2433,
3785-3793,5540-5544`, `pokemon_animation.h:124`, and `pokemon.c:1487` pin
`AddNewAnim` defaults, speed=1/runs=2, immediate initializer callback,
tick-zero affine start, signed-s16 x2/y2/data, source-ordered x-boundary then
else-if y-boundary handling, six-crossing completion, 10-callback delay,
shifted/u16 rotation semantics, reset, and stable `WaitAnimEnd`. Dense Tier-1
coverage exhausts callbacks **0..137**: first run 0..63, delay 64..73, second
run 74..137; terminal tick **137**. A complete legal Scene-ON MAGNEMITE
mechanicLab party was probed twice through `tools/run-mgba-probe.py`; the
paired raw **372-byte** receipts are byte-identical, SHA-256
`9f0354fb3d8f1ad72f6bd4a49ddc3b074c5f4151459833ad68b55e98647033cf`, and
settle battler 1 at x2=0/y2=0, animNum=1, animCmdIndex=4, data2=81, and
`SpriteCallbackDummy`.

**Verification / next:** focused family/evidence plus both animation ratchets
are **331/331** green; `npx tsc --noEmit`, full `npm test` (**599 files / 6,163
passed / 1 skipped**), and production build (**549 modules transformed**) are
green. Selector 85 has no mapping and source ID 86
(`ANIM_H_JUMPS_V_STRETCH_TWICE`) was already accepted for SHARPEDO/SPOINK, so
neither is a next action. The standing send-out priority directive still keeps
the remaining Tier-1 front ladder ahead of move-component work. Its largest
remaining generated Factory census is **`ANIM_TWIST`** (source ID **18**;
**5 mappings / 5 Factory / 0 outside**) — SHELLDER, HORSEA, STARMIE, CLAMPERL,
and ANORITH. Reuse the accepted shared `Twist` callback, but prove the distinct
normal runs=1 initializer and every species receipt independently of
`ANIM_TWIST_TWICE`.

## Front `ANIM_SPIN` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **1 mapping / 1
Factory-reachable species / 0 outside-Factory mappings** — SPHEAL. Only source
ID **83** is promoted; back routing, unused `ANIM_SPIN_LONG`, adjacent
selectors, moves, and engine boundaries remain untouched. Move coverage stays
**107/276 exact, 0 partial, 0 staged, 169 unsupported**; Open-only **0/1** and
Outside Factory **0/77**. `ANIMATION_COVERAGE.json` remains SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:1037-1059,1472-1492,
3775-3782,5540-5544`, `pokemon_animation.h:123`, and `pokemon.c:1722` pin
`AddNewAnim` defaults, delay=60/data=30, immediate `Spin` before callback
installation, tick-0 affine start, C-truncated `65536/30=2184`, signed-s16 to
unsigned-u16 rotation writes, strict terminal guard, identity/reset, and stable
`WaitAnimEnd`. All **61 active callbacks** (ticks 0..60) plus tick 61's terminal
handoff are exhaustive. A fresh complete legal challenge-0 Scene-ON SPHEAL
party was probed twice only through `tools/run-mgba-probe.py`; the paired raw
**373-byte** receipts are byte-identical, SHA-256
`47b66252cad485dec48946f8beffff1aef7760727a9794132a8f5b1488e4c8b5`, and
settle species 341 at x2=0/y2=0, animNum=1, animCmdIndex=7, and
`SpriteCallbackDummy`.

**Verification / next:** focused family/evidence plus both animation ratchets
are **327/327** green; `npx tsc --noEmit`, full `npm test` (**597 files / 6,156
passed / 1 skipped**), and production build (**549 modules transformed**) are
green. Next generated source-ranked selector: **`ANIM_TUMBLING_FRONT_FLIP_TWICE`**
(source ID **84**; **1 mapping / 1 Factory / 0 outside**) — MAGNEMITE.

## Front `ANIM_V_SLIDE_WOBBLE_SMALL` family accepted (2026-08-02)

**State:** exact for the complete generated selector census: **4 mappings / 4
Factory-reachable species / 0 outside-Factory mappings** — OMANYTE
(representative), LANTURN, JUMPLUFF, and CLAYDOL. Only source ID **81** is
promoted. The accepted normal source-ID-28 path stays regression-pinned;
adjacent selectors and back routing remain untouched. No move coverage or
`ANIMATION_COVERAGE.json` change was made; its SHA-256 remains
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,984-1028,
1061-1085,1735-1767,3761-3766,5540-5544`, `trig.c:514-518`, and
`pokemon.c:1544,1577,1595,1700` pin initialization, tick-0 affine start,
data0=10/5 normal/small amplitude, immediate callback-before-install ordering,
C-truncated indices, masked doubled wobble index, signed GBA sine and u16
rotation, strict terminal `data2 > 100`, reset, final counter increment, and
stable `WaitAnimEnd`. The shared reducer exhausts active ticks 0..100 and the
terminal tick 101. Fresh complete legal challenge-0 Scene-ON parties were
probed twice per species only through `tools/run-mgba-probe.py` in one fresh
`mktemp` directory; each pair is byte-identical: OMANYTE **373 B**
`dc4bbb0eee279c7d3a30f2062d7d6589a9e060327821da7ee4359e866656dcbd`,
LANTURN **373 B** `3b1426d8bc2186aaa5a733adbb6435c08d5da2f7364b872557f4389291053e8c`,
JUMPLUFF **373 B** `71ff480a0b9a62492f7e243ebfdda963d2f698e6bade85608b4d56e8c60b2ae5`,
and CLAYDOL **374 B** `d6b99b7e666e14b003e7d475f8506d299ae709136c76f87211eaba49b91b477d`.

**Verification / next:** focused family/evidence plus both animation ratchets
are **331/331** green; `npx tsc --noEmit`, full `npm test` (**595 files /
6,148 passed / 1 skipped**), and production build (**549 modules transformed**)
are green. `npm run animation:coverage` remains **107/276 exact, 0 partial,
0 staged, 169 unsupported; Open-only 0/1; Outside 0/77**. Next generated
source-ranked selector: **`ANIM_SPIN`** (source ID **83**; **1 mapping / 1
Factory / 0 outside**) — SPHEAL.

## Front `ANIM_CIRCLE_C_CLOCKWISE_SLOW` family accepted (2026-08-01)

**State:** exact for the complete generated selector census: **2 mappings / 2
Factory-reachable species / 0 outside-Factory mappings** — DROWZEE
(representative) and SPINARAK. Only source ID **79** is promoted; normal and
long circle selectors, adjacent selectors, and back-sprite routing remain
unsupported. No per-species/tick branch, baked frame, engine-boundary
widening, move promotion, or `ANIMATION_COVERAGE.json` change was made; the
coverage hash remains
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:1504-1536,3743-3751`,
`trig.c:514-518`, and `pokemon.c` selector mappings pin
`AddNewAnim`/`InitAnimData`, rotation=512/data=3/speed=12, immediate
`CircleCounterclockwise` before callback installation, signed GBA Sin/Cos,
both normal-front `TryFlipX` calls, strict `data2 > 512` terminal cleanup,
post-branch data2 increment, and stable `WaitAnimEnd`. All **44 callbacks**
are exhaustive: ticks 0..42 consume counters 0..504 by 12; tick 43 alone
observes 516 > 512, clears x2/y2, and increments data2 to 528. Fresh complete
legal challenge-0 Scene-ON parties were probed twice each only through
`tools/run-mgba-probe.py` in one fresh `mktemp` directory. DROWZEE paired
**372-byte** receipts are byte-identical, hash
`1735dde24d224d3d98eafe6c4f28cfc8b1c28ac67863d168ed79cd730e2e4138`; SPINARAK
paired **373-byte** receipts are byte-identical, hash
`67fae9ba7ccda325f46df3a8a87e4574cd98a3e1dd9cf32ab4e2412d27e6579d`. Both
settle battler 1 at x2=0/y2=0 with `SpriteCallbackDummy` (command indices 5
and 7 respectively).

**Verification / next:** focused species-idle/evidence plus both animation
ratchets are **328/328** green; `npx tsc --noEmit`, full `npm test` (**593
files / 6,136 passed / 1 skipped**), and production build (**549 modules
transformed**) are green. `npm run animation:coverage` reports **107/276
exact, 0 partial, 0 staged, 169 unsupported; Open-only 0/1; Outside 0/77**.
Next generated source-ranked selector: **`ANIM_V_SLIDE_WOBBLE_SMALL`** (source
ID 81; **4 mappings / 4 Factory / 0 outside**) — OMANYTE, LANTURN, JUMPLUFF,
CLAYDOL.

## Front `ANIM_TWIST_TWICE` family accepted (2026-08-01)

**State:** exact for the complete generated selector census: **1 mapping / 1
Factory-reachable species / 0 outside-Factory mappings** — STARYU. Only
source ID **78** is promoted; normal `ANIM_TWIST` (SHELLDER, HORSEA, STARMIE,
CLAMPERL, ANORITH) and adjacent source selectors remain unsupported. No
per-species/tick branch, baked frame, engine-boundary widening, or move
promotion was added. Coverage remains **107 exact / 0 partial / 0 staged / 169
unsupported**; `ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:1037-1059,1420-1470,
3732-3741,5540-5544` and `trig.c:514-518` pin `AddNewAnim`/`InitAnimData`
defaults, selector-78 rotation=1024/runs=2 overrides, immediate
`Twist`-before-callback-install ordering, signed sine → u16 affine writes,
identity/reset, and `WaitAnimEnd`. Every **141 callbacks** is exhaustive:
first-run ticks 0..64 consume 0..1024; tick 65 alone observes 1040 `>1024`,
writes identity, arms delay=10, and leaves data2=16; ticks 66..75 are the ten
delay-only callbacks; second-run ticks 76..139 consume 16..1024; tick 140
alone resets affine state and installs stable `WaitAnimEnd`. A fresh complete
legal challenge-0 Scene-ON STARYU party (Factory set ID 128) was probed twice
only through `tools/run-mgba-probe.py`; the raw 373-byte receipts are
byte-identical, end in `}` without a newline, and SHA-256
`67e14ee16e9eb44e699ee888cf405fd69e1901b2c689adf3f6932347cee5be5c`.
It settles battler 1 at x2=0/y2=0, animNum=1, animCmdIndex=4, data2=120, and
`SpriteCallbackDummy`.

**Verification / next:** focused species-idle/evidence plus both animation
ratchets are **321/321** green; `npx tsc --noEmit`, coverage/hash checks, full
`npm test` (**591 files / 6,127 passed / 1 skipped**), and production build
(**549 modules transformed**) are green. Next generated source-ranked selector:
**`ANIM_CIRCLE_C_CLOCKWISE_SLOW`** (source ID 79; **2 mappings / 2 Factory /
0 outside**) — DROWZEE and SPINARAK.

## Front `ANIM_H_SHAKE_SLOW` family accepted (2026-08-01)

**State:** exact for the complete generated census: **3 selector mappings / 3
Factory-reachable species / 0 outside-Factory mappings** — DUGTRIO
(representative), GOLDUCK, and DODUO. The accepted normal and new slow entry
points share the source-derived `HorizontalShake` reducer; normal remains
regression-pinned. No adjacent selector, barrier, per-species/tick branch,
baked frame, engine-boundary widening, or move promotion was added. Coverage
remains **107 exact / 0 partial / 0 staged / 169 unsupported** and
`ANIMATION_COVERAGE.json` remains SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Did:** `pokemon_animation.c:1343-1366,3717-3722,5540-5544` and `trig.c`
pin source-order data0=30/data7=3 initialization, call-before-callback-install
ordering, signed GBA sine, strict counter `>2304` termination, x2=0 cleanup,
and `WaitAnimEnd` / `SpriteCallbackDummy`. Every active callback is exhaustive:
ticks 0..76 cover counters 0..2280 by 30; tick 77 alone observes 2310, clears
x2, increments data2 to 2340, and installs stable `WaitAnimEnd`. Fresh complete
legal challenge-0 Scene-ON parties settle all three at x2=0/y2=0, animNum=1,
`SpriteCallbackDummy`: DUGTRIO species 51 / animCmdIndex 9, paired **372-byte**
receipts SHA-256 `1abe9c26e063a2b15db3f3f6f832f458649075a302c2da25fd714807edd9cc94`;
GOLDUCK species 55 / index 4, `4b67a65f258a3006b448e348aa6713c0376b6453a95ff35ca708041bd6ba2b14`;
DODUO species 84 / index 4, `2ef5f1430ae2ffc7666a33ea21b3b9239531b3ba603d386039b29c65f6037abb`.

**Next / Notes:** supervisor selects the next generated source-ranked family;
`ANIM_H_SHAKE_FAST` and vertical variants remain untouched. The unchanged
generic probe ran only through `tools/run-mgba-probe.py`, twice fresh per
party; all three raw pairs passed `cmp`, and focused species-idle/evidence plus
both ratchets are **321/321** green. `npx tsc --noEmit` and coverage/hash checks
are green; full `npm test` is **590 files / 6,121 passed / 1 skipped**, and the
production build is green (**549 modules transformed**).

## Front `ANIM_ZIGZAG_SLOW` family accepted (2026-08-01)

**State / verdict:** exact for the complete generated selector census: all
**3 mappings / 3 Factory-reachable species / 0 outside-Factory mappings** —
VENOMOTH (representative), KINGLER, and FLYGON. The entry point ports the
shared source `Zigzag` reducer behind its slow every-other-callback gate. No
adjacent selector, unsupported barrier, per-species/tick branch, baked frame,
or engine-boundary widening was added. Move coverage remains **107 exact / 0
partial / 0 staged / 169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1290-1341,
3702-3718,5540-5544` pins task-zeroed data0/data2/data3, all nine signed-delta
legs plus the zero sentinel, both normal-front no-op `TryFlipX` calls, leg
boundary fallthrough, and the slow wrapper's source-order gate. All **109
callbacks** are exhaustive: 54 movement callbacks on even ticks 0..106, 54
gate-only callbacks on odd ticks 1..107, and tick 108's 55th shared-reducer
invocation alone consumes the sentinel and installs stable `WaitAnimEnd` at
x2=0/y2=0. Fresh complete legal challenge-0 Scene-ON parties settle all three
at animNum=1 and `SpriteCallbackDummy`: VENOMOTH species 49 / animCmdIndex 21,
paired **373-byte** receipts SHA-256
`cfc7e2a234d3eb7e0124ec3c9198d7620ee1341b06e607a3e5f8cd15cfa506ff`;
KINGLER species 99 / index 8, **372 bytes**,
`e07a9dd6d5b3cbe81314ed08871982dd1b04d72380d6a01d794fe2c9b2e3787f`;
FLYGON species 334 / index 6, **373 bytes**,
`24dddba203497ba399c2944bbf7a636edb3ced114e5bc4d44ddc7dee826176e9`.

**Verification / next:** the unchanged generic probe ran only through
`tools/run-mgba-probe.py`, twice fresh per legal party; paired raw `cmp` and
focused species-idle/evidence plus both ratchets are **315/315** green. Next
generated source-ranked family: **`ANIM_H_SHAKE_SLOW`** (3 mappings / 3
Factory / 0 outside): DUGTRIO, GOLDUCK, DODUO.

## Front `ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW` family accepted (2026-08-01)

**State / verdict:** exact for the complete generated selector census: all
**2 mappings / 2 Factory-reachable species / 0 outside-Factory mappings** —
CLEFABLE and AZUMARILL. The accepted normal, Slow, and Small siblings and the
new SmallSlow entry point share the source-derived `BounceRotateToSides`
reducer. No adjacent selector, unsupported barrier, per-species/tick branch,
baked frame, or engine-boundary widening was added. Move coverage remains
**107 exact / 0 partial / 0 staged / 169 unsupported**;
`ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1037-1064,
1915-2001,3679-3699,5540-5544` and `trig.c:514-518` pin task-zeroed sprite
data, SmallSlow's `data6=1` write before Small, Small's `AddNewAnim` followed
by rotation 2048 and animation data 1, affine start/set/reset, both
normal-front no-op `TryFlipX` calls, signed C-truncated interpolation, GBA
sine and u16 rotation arithmetic, and stable `WaitAnimEnd`. All **167 active
callbacks** (ticks 0..166) and every seven-leg boundary are exhaustive; tick
167 alone consumes the zero-duration sentinel, restores identity offsets and
affine state, calls `ResetSpriteAfterAnim`, and installs `WaitAnimEnd`. Fresh
complete legal challenge-0 Scene-ON parties settle both species at x2=0/y2=0,
animNum=1 and `SpriteCallbackDummy`; paired unchanged-probe receipts are raw
byte-identical and end with `}` without a newline: CLEFABLE **372 bytes**,
SHA-256 `62a1979f9af10ce6a6914651bc03407de755e30162594e04527e4e832f943ea4`;
AZUMARILL **373 bytes**, `908422f7084676cdceda114470205e152976a243fa1d131533685acfbb57b0c7`.

**Verification / next:** unchanged `dump-onix-front-idle-anim.py` ran only via
`tools/run-mgba-probe.py`, twice fresh per party in one new `mktemp` directory;
paired raw `cmp`, focused species-idle plus both ratchets **310/310**, `npx tsc
--noEmit`, coverage/hash checks, and build (**547 modules transformed**) are
green. Full `npm test`: **584 files, 6,093 passed + 1 skipped**. Next generated
source-ranked family: **`ANIM_ZIGZAG_SLOW`** (3 mappings / 3 Factory / 0
outside): VENOMOTH, KINGLER, FLYGON.

## Front `ANIM_V_SLIDE_SLOW` family accepted (2026-08-01)

**State / verdict:** exact for the complete generated selector census: all
**5 mappings / 5 Factory-reachable species / 0 outside-Factory mappings** —
PIDGEY, AERODACTYL, DRAGONITE, HOOTHOOT, LEDIAN. The accepted normal
`Anim_VerticalSlide` data0=40 path and new slow data0=80 path share one
source-derived `VerticalSlide` reducer; normal remains regression-pinned. No
adjacent selector, unsupported barrier, per-species/tick branch, baked frame,
or engine-boundary widening was added. Move coverage remains **107 exact / 0
partial / 0 staged / 169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1156-1179,
3672-3677,5540-5544` and `trig.c:514-518` pin task-zeroed data2, both immediate
initializers' install-after-call overwrite semantics, both normal-front no-op
`TryFlipX` calls, C truncation before modulo, signed GBA sine, body-order data2
increment, strict `data2 > data0` termination, y2 cleanup, and stable
`WaitAnimEnd`. All **81 active callbacks** (ticks 0..80) are exhaustive; tick
81 alone observes data2=81 > 80, clears y2, increments data2 to 82, and installs
`WaitAnimEnd`. Fresh complete legal challenge-0 Scene-ON parties settle both
species at x2=0/y2=0, animNum=1/`SpriteCallbackDummy`; paired unchanged-probe
receipts are raw byte-identical and end with `}` without a newline: PIDGEY
**373 bytes**, SHA-256
`54d30286650c7bc624c48ca0edeff146008052358ef0b8350f52e7a3c884a4a6`;
LEDIAN **374 bytes**, `a195c9271c61c104d528af5cfd22bdc1917114fd14efe6b2200218238c59e564`.

**Verification / next:** unchanged `dump-onix-front-idle-anim.py` ran only via
`tools/run-mgba-probe.py`, twice fresh per party in one new `mktemp` directory;
paired raw `cmp`, focused species-idle plus both ratchets **301/301**, `npx tsc
--noEmit`, coverage/hash checks, and build (**545 modules transformed**) are
green. Full `npm test`: **583 files, 6,077 passed + 1 skipped**. Next generated
source-ranked family: **`ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW`** (2 mappings /
2 Factory / 0 outside): CLEFABLE and AZUMARILL.

## Front `ANIM_FOUR_PETAL` terminal family accepted (2026-08-01)

**State / verdict:** exact for the complete generated selector census: all
**1 mapping / 1 Factory-reachable species / 0 outside-Factory mappings** —
REGICE. No adjacent selector, unsupported barrier, per-species/tick branch,
baked frame, or engine-boundary widening was added. Move coverage remains
**107 exact / 0 partial / 0 staged / 169 unsupported**;
`ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,3601-3656,
5540-5544` and `trig.c:514-518` pin task-zeroed data2/data6/data7, tick-zero
data6=0/data7=64/data2=1 ordering, pre-guard data7+=8, both normal-front
no-op `TryFlipX` calls, every signed GBA Sin/Cos switch arm, strict phases
0..3 `>127` versus phase 4 `>63`, zero-offset default cleanup, and stable
`WaitAnimEnd`. All **64 callbacks** are exhaustive: active ticks 0..62,
phase transitions/resets at 7/23/39/55, and tick 63 alone advances phase 4
from data7 56 through 64 to terminal data6=5/data7=0. A fresh complete legal
challenge-0 Scene-ON REGICE party settles at x2=0/y2=0, animNum=1/
animCmdIndex=4 and `SpriteCallbackDummy`; paired unchanged-probe receipts are
byte-identical at **373 bytes**, end with `}` and no newline, SHA-256
`e02097374599e03808cf8f1122a6b1b802e69b1a2d2af582e755ee6b627e6cb1`.

**Verification / next:** unchanged `dump-onix-front-idle-anim.py` ran only via
`tools/run-mgba-probe.py` twice in one fresh `mktemp` directory; raw `cmp`,
focused species-idle plus both ratchets **293/293**, `npx tsc --noEmit`, and
coverage/hash checks are green. Full `npm test`: **583 files, 6,069 passed +
1 skipped**; production build: **545 modules transformed**. Next generated
source-ranked family: **`ANIM_V_SLIDE_SLOW`** (5 mappings / 5 Factory / 0
outside): PIDGEY, AERODACTYL, DRAGONITE, HOOTHOOT, LEDIAN.

## Front `ANIM_CIRCLE_INTO_BG` terminal family accepted (2026-08-01)

**State / verdict:** exact for the complete generated selector census: all
**1 mapping / 1 Factory-reachable species / 0 outside-Factory mappings** —
KINGDRA. No adjacent selector, unsupported barrier, per-species/tick branch,
baked frame, or engine-boundary widening was added. Move coverage remains
**107 exact / 0 partial / 0 staged / 169 unsupported**;
`ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,984-1064,
3537-3565,5540-5544` and `trig.c:514-518` pin task-zeroed data2/data7,
tick-0 affine start, both normal-front no-op `TryFlipX` calls, and C/GBA
signed sine and affine arithmetic. All **66 callbacks** are exhaustive: ticks
0..64 consume data7 0..512 inclusive by 8, and tick 65 alone observes strict
data7=520 `> 512`, clears x2, resets the sprite, writes identity affine state,
installs `WaitAnimEnd`, and remains stable thereafter. A fresh complete legal
challenge-0 Scene-ON party settles KINGDRA species 230 at x2=0/y2=0,
animNum=1/animCmdIndex=4 and `SpriteCallbackDummy`; paired raw receipts are
byte-identical at **373 bytes**, SHA-256
`1747d48abbe711e2b6d799caa48fe7cb95d6ad276a461713902556b3b229043b`.

**Verification / next:** unchanged `dump-onix-front-idle-anim.py` ran only via
`tools/run-mgba-probe.py` twice in one fresh `mktemp` directory; paired raw
`cmp`, focused species-idle plus both ratchets **285/285**, `npx tsc --noEmit`,
coverage/hash and diff checks are green. Full `npm test`: **583 files, 6,061
passed + 1 skipped**; production build: **545 modules transformed**. Next
generated source-ranked family: **`ANIM_FOUR_PETAL`** (1 mapping / 1 Factory /
0 outside): REGICE.

## Front `ANIM_LUNGE_GROW` terminal family accepted (2026-08-01)

**State / verdict:** exact for the complete generated selector census: all
**2 mappings / 2 Factory-reachable species / 0 outside-Factory mappings** —
DODRIO (representative) and HERACROSS (independently probed terminal sibling).
No adjacent selector, unsupported barrier, per-species/tick branch, baked
frame, or engine-boundary widening was added. Move coverage remains **107
exact / 0 partial / 0 staged / 169 unsupported**; `ANIMATION_COVERAGE.json`
is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,984-1064,
3507-3534,5540-5544` and `trig.c:514-518` pin task-zeroed data2/data7,
`InitAnimData`/`AddNewAnim` defaults, affine start/set/reset, C-truncated
indices, GBA signed sine arithmetic, x2, both affine scales, and both
normal-front no-op `TryFlipX` calls. All **66 callbacks** are exhaustive:
ticks 0..64 consume data7 0..512 inclusive by 8, tick 0 starts affine before
its ordinary motion/scale write, and tick 65 alone observes strict data7=520
`> 512`, clears x2, writes identity affine, resets the sprite, installs
`WaitAnimEnd`, and remains stable thereafter. Fresh complete legal
challenge-0 Scene-ON parties settle x2=0/y2=0, animNum=1 and callback
`0x08007428`/`SpriteCallbackDummy`: DODRIO species 85 / animCmdIndex 8,
paired **372-byte** receipts SHA-256
`16487508c32e6eb17cb5e46531161779bf8e18440e1469f9e81a0d119d5b1760`;
HERACROSS species 214 / animCmdIndex 4, paired **373-byte** receipts SHA-256
`881886efd435b939ebb35bd0a017b4602cbf06fd7c6be8d72871ed22c75fc082`.

**Verification / next:** unchanged `dump-onix-front-idle-anim.py` ran only
through `tools/run-mgba-probe.py`, twice fresh per legal party in one fresh
`mktemp` directory; paired raw `cmp`, focused species-idle plus both ratchets
**278/278**, `npx tsc --noEmit`, coverage/hash, boundary/barrier, and diff
checks are green. Full `npm test`: **582 files, 6,047 passed + 1 skipped**;
production build: **543 modules transformed**. Next generated source-ranked
family: **`ANIM_CIRCLE_INTO_BG`** (1 mapping / 1 Factory / 0 outside):
KINGDRA.

## Front `ANIM_FLICKER_INCREASING` terminal family accepted (2026-08-01)

**Verdict / counts:** exact for the complete generated selector census: all
**2 mappings / 2 Factory-reachable species / 0 outside-Factory mappings** —
HAUNTER (representative) and KECLEON (terminal sibling). No adjacent selector,
unsupported barrier, per-species branch, or absolute-tick branch was added.
Move coverage remains **107 exact / 0 partial / 0 staged / 169 unsupported**;
`ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1037-1059,
2949-2974,5540-5544` proves task-zeroed data2/data7, the adjacent unused
`InitAnimData`/`AddNewAnim` defaults, source-order data7 reset/equality and
invisibility writes, strict data2 > 10 termination, and stable `WaitAnimEnd`.
All **66 callbacks** are exhaustive: tick 0 moves data2 0->1 visible with
data7=0; each phase n=1..10 has n invisible callbacks followed by its visible
equality callback, which resets data7=0 and increments data2. Callback 66
(tick 65) is phase 10's equality edge, raises data2 10->11, forces visible,
installs `WaitAnimEnd`, and remains byte-stable thereafter. Fresh complete
legal challenge-0 Scene-ON parties settle both species at x2=0/y2=0,
animNum=1/`SpriteCallbackDummy`; paired raw receipts end at byte 125 without a
newline and are byte-identical: HAUNTER **372 bytes**, SHA-256
`398f043ed6a00f057c7ada95eb36e89f21000f886ffac5afd77df79055539c54`;
KECLEON **373 bytes**, SHA-256
`f231f0843138b3b18ff69bbbb6ee4d10df6f77f42fa553b5c603a39eb41f3e38`.

**Verification / next:** unchanged `dump-onix-front-idle-anim.py` ran only via
`tools/run-mgba-probe.py` twice per legal party in one fresh `mktemp` directory;
paired raw `cmp`, focused family plus both ratchets **259/259**, `npx tsc
--noEmit`, and diff checks are green. The single post-change full `npm test` is
green at **572 files, 5,981 passed + 1 skipped**; production build is green
(**534 modules transformed**). Next bounded generated family:
**`ANIM_GROW_IN_STAGES`** (3 mappings / 2 Factory / 1 outside): GENGAR,
QWILFISH, LUGIA.

## Front `ANIM_ROTATE_UP_TO_SIDES` terminal family accepted (2026-08-01)

**Verdict / counts:** exact for the complete generated selector census: all
**1 mapping / 1 Factory-reachable species / 0 outside-Factory mappings** —
HARIYAMA. No adjacent selector, unsupported barrier, per-species branch, or
absolute-tick branch was added. Move coverage remains **107 exact / 0 partial /
0 staged / 169 unsupported**, and `ANIMATION_COVERAGE.json` is unchanged at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,984-1064,
2918-2951,5540-5544` and `trig.c:514-518` prove task-zeroed sprite data,
`InitAnimData`/`AddNewAnim` defaults and the adjacent fast selector's distinct
ownership, affine start/set/reset helpers, GBA signed sine/u16 rotation
semantics, and stable `WaitAnimEnd`. All **32 active callbacks** pin data7
0..248 by 8: tick 0 starts affine exactly once; every active callback preserves
both normal-front no-op `TryFlipX` calls, writes
`x2=-Sin(data7,16)`, `y2=-Sin(data7%128,16)`, converts
`Sin(data7,32)` through u16 and shifts it left 8 for the affine rotation, then
advances data7 by 8. Tick 32 alone observes strict data7 > 254 at 256, clears
both offsets, writes identity affine, calls `ResetSpriteAfterAnim`, preserves
both flips, and installs stable `WaitAnimEnd`. The accepted predecessor
`ANIM_H_JUMPS_V_STRETCH_TWICE` remains regression-pinned, while adjacent
`ANIM_FLICKER_INCREASING` remains unaccepted. A fresh complete legal
challenge-0 Scene-ON party settles HARIYAMA at x2=0/y2=0, animNum=1/
`SpriteCallbackDummy`; two unchanged-probe raw receipts are byte-identical,
373 bytes each, end at byte 125 with no newline, and have SHA-256
`1a865d6dc82960110465722aa619bdc1cc5725d4716cfc7c13f363bcf16e6e49`.

**Verification / next:** focused species-idle family plus both ratchets are
**251/251**; `npx tsc --noEmit`, raw/diff checks, and the unchanged coverage
hash are green; the single post-change full `npm test` is green at **572 files,
5,973 passed + 1 skipped**; production build is green (**534 modules
transformed**). The next source-ranked generated census family is
**`ANIM_FLICKER_INCREASING`** (2 mappings / 2 Factory / 0 outside): HAUNTER and
KECLEON.

## Front `ANIM_H_JUMPS_V_STRETCH_TWICE` terminal family accepted (2026-08-01)

**Verdict / counts:** exact for the complete generated selector census: all
**2 mappings / 2 Factory-reachable species / 0 outside-Factory mappings** —
SHARPEDO and SPOINK. SHARPEDO is the representative and SPOINK the terminal
sibling. The accepted single-run horizontal-jumps/vertical-stretch reducer is
now parameterized for Single data=-1/runs=1 and Twice data=1/runs=2; no
adjacent selector or unsupported barrier was added. Move coverage remains
**107 exact / 0 partial / 0 staged / 169 unsupported** and
`ANIMATION_COVERAGE.json` is unchanged at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / lifecycle / evidence:** `pokemon_animation.c:911-939,1037-1075,
2755-2868,3805-3815,5540-5544` and `trig.c:514-518` prove task-zeroed sprite
data, `AddNewAnim` defaults, `ResetSpriteAfterAnim`, GBA sine semantics, the
shared callbacks, the Twice overrides, and stable `WaitAnimEnd`. All **157
callbacks** (ticks 0..156) pin both normal-front no-op `TryFlipX` calls,
affine/C-truncated sine and scale writes, every data2/data3/data4 update, and
strict guards: `_0->_1` at 11/94, `_1->_2` at 61/144, tick 73 decrements runs
2->1 and sets delay=10/data3=data4=0 before the shared tail carries data2 to
12, ticks 74..83 count delay to zero, and tick 156 sees `_2` counter=132,
resets offsets/affine state, increments data2 to 144, and installs
`WaitAnimEnd`. The accepted Single tick-73 terminal remains regression-pinned.
Fresh complete legal Scene-ON parties settle both species at x2=0/y2=0,
animNum=1/`SpriteCallbackDummy`; paired raw receipts are byte-identical with no
EOF newline: SHARPEDO SHA-256
`beddd02c936693a4e82573b7f4ab965aa0e128af8eb72cf78945e60777864dcf`,
SPOINK `f5c33bc034669fa7a53240a02bbb7a630f5d1d17f8405baeab87770d03e3eb7b`.

**Verification / next:** focused species-idle family plus both ratchets are
**244/244**; `npx tsc --noEmit` and diff checks are green; the single
post-change full `npm test` is green at **572 files, 5,966 passed + 1
skipped**; production build is green (**534 modules transformed**). The next
source-ranked generated census family is **`ANIM_ROTATE_UP_TO_SIDES`** (1
mapping / 1 Factory / 0 outside): HARIYAMA.

## Front `ANIM_V_JUMPS_BIG` Factory family accepted (2026-08-01)

**Verdict / counts:** exact for the complete generated selector census: all
**5 mappings / 5 Factory-reachable species / 0 outside-Factory mappings** —
PICHU, FLAAFFY, GIRAFARIG, SWAMPERT, TAILLOW. PICHU is the representative and
TAILLOW the terminal sibling. The shared source-derived `VerticalJumps` reducer
now parameterizes Big data0=4 and accepted Small data0=3; Small is
regression-pinned and `ANIM_H_JUMPS_V_STRETCH_TWICE` remains unaccepted. No
unsupported-branch barrier was added. Move coverage remains **107 exact / 0
partial / 0 staged / 169 unsupported**; `ANIMATION_COVERAGE.json` is unchanged
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source / evidence / verification:** `pokemon_animation.c:911-939,
1181-1215,5540-5544` and `trig.c:514-518` prove task-zeroed data2, the immediate
Big callback, shared signed/C-truncated arithmetic, GBA u8 sine lookup, strict
cleanup, and stable `WaitAnimEnd`. All **33 active callbacks** pin counters
0..384 by 12, phase transitions at 0/132/264/384, amplitudes 8 then 12, and the
counter-=256/u8-index boundaries; tick 33 observes counter 396 > 384, clears
x2/y2, increments data2 to 408, installs `WaitAnimEnd`, and stays stable.
Fresh complete legal challenge-0 Scene-ON parties (all set IDs 110..199) and
unchanged `dump-onix-front-idle-anim.py` runs are paired byte-identical with no
EOF newline: PICHU SHA-256
`cde69635974e4c6a55e7bad360e38a1507db9405f164851cb522ff4ddfb27d1f`,
TAILLOW `c286b13cef798ca9c35f5638852d138363ac4455ab8dc016935bb36379839190`.
Focused family plus both ratchets are **234/234**; `npx tsc --noEmit` is green;
the single post-change full `npm test` is green at **572 files, 5,956 passed +
1 skipped**; production build is green (**534 modules transformed**). Next:
**`ANIM_H_JUMPS_V_STRETCH_TWICE`** (2 mappings / 2 Factory / 0 outside):
SHARPEDO, SPOINK.

## Front `ANIM_V_JUMPS_H_JUMPS` Factory family accepted (2026-08-01)

**Verdict / counts:** rung 2y is exact for the complete generated selector
census: all **5 mappings / 5 Factory-reachable species / 0 outside-Factory
mappings** — BULBASAUR, VENONAT, PSYDUCK, COMBUSKEN, DUSTOX. BULBASAUR is
the representative and DUSTOX the terminal sibling. `ANIM_V_JUMPS_BIG`,
`ANIM_H_JUMPS_V_STRETCH_TWICE`, and every other selector remain unaccepted;
no unsupported-branch barrier was added. Move coverage stays **107 exact / 0
partial / 0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` remains
byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1217-1255,
5540-5544` and `trig.c:514-518` prove task-zeroed data2=0, the ordinary
opponent-front callback, signed sine arithmetic, cleanup, `WaitAnimEnd`, and
task restoration. All **65 active callbacks** pin counters 0..768 by 12,
including divCounter transitions at 0/132/264/384/516/648/768, case 2's
y-only local-counter rewrite, C-truncated x segments, and divCounter 6's
carried x2=1. Tick 65 observes counter 780 (>768), clears x2/y2, installs
`WaitAnimEnd`, increments data2 to 792, and stays stable thereafter. Fresh
complete legal challenge-0 Scene-ON parties (all set IDs in 110..199) settle
both species at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`; paired raw receipts
are byte-identical with no EOF newline: BULBASAUR SHA-256
`f91cf65e2d71626c37f7421be61fbc1c909147ceed981b01f0adf51da541f1d8`,
DUSTOX `e076416a1cc08913fac56b5b54b1069e93707c0da353d07ccc6b7e3a002d802f`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per corrected legal party and paired raw
`cmp`; focused family plus both ratchets **224/224**; `npx tsc --noEmit` and
diff checks green; exactly one post-change complete `npm test` is green at
**572 files, 5,946 passed + 1 skipped**; production build is green (**534
modules transformed**). The next source-ranked generated census family is
**`ANIM_V_JUMPS_BIG`** (5 mappings / 5 Factory / 0 outside): PICHU, FLAAFFY,
GIRAFARIG, SWAMPERT, TAILLOW.

## Front `ANIM_BOUNCE_ROTATE_TO_SIDES` Factory family accepted (2026-08-01)

**Verdict / counts:** rung 2x is exact for the complete normal selector census:
all **5 mappings / 5 Factory-reachable species / 0 outside-Factory mappings** —
MAROWAK, MAGIKARP, SEEDOT, MEDITITE, ILLUMISE. MAROWAK is the representative
and ILLUMISE the terminal sibling. `ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW`
and every other selector remain unaccepted; accepted Small and Slow behavior
is regression-pinned. Move coverage stays **107 exact / 0 partial / 0 staged /
169 unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1031-1077,
1915-2001,3679-3699` proves task-zeroed data6=0, `AddNewAnim` defaults, normal
rotation=4096/table 0, all seven normal-speed legs, both normal-front no-op
`TryFlipX` calls, and the distinct Small/Slow/SmallSlow initializers. All **87
active callbacks** (ticks 0..86) pin C-truncated sine/interpolation, u16 affine
rotation, tick-0 affine start, and every leg boundary. Tick 87 consumes the
sentinel, writes identity/x2=y2=0, calls `ResetSpriteAfterAnim`, installs
`WaitAnimEnd`, and remains stable at tick 88. Fresh complete legal Scene-ON
parties settle both selected species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`; paired raw receipts are byte-identical with no EOF
newline: MAROWAK SHA-256
`da3153df7028f1d0849cbd161241f034ddfc31e5ca86ee5594791b5df42f6711`,
ILLUMISE `01939c8d337ecac2ac184e8df5a4975b176178f8cb1a3748485de81690dd553c`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party and paired raw `cmp`; focused
family plus both ratchets **214/214**; `npx tsc --noEmit` and diff checks green;
exactly one complete `npm test` is green at **572 files, 5,936 passed + 1
skipped**; production build is green (**534 modules transformed**). The next
source-ranked generated census family is **`ANIM_V_JUMPS_H_JUMPS`** (5
mappings / 5 Factory / 0 outside): BULBASAUR, VENONAT, PSYDUCK, COMBUSKEN,
DUSTOX.

## Front `ANIM_SWING_CONVEX` Factory family accepted (2026-08-01)

**Verdict / counts:** rung 2w is exact for the normal lifecycle and all **4
Factory-reachable acceptance siblings**: WEEPINBELL, GOLDEEN, MANTINE,
BANETTE. The complete generated census is **6 selector mappings**; MEW and
JIRACHI are source-derived outside-Factory mappings only, with no fresh
outside-Factory acceptance claim. WEEPINBELL is the representative and BANETTE
the terminal Factory sibling. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1038-1059,
2552-2589,3855-3871` proves task-zeroed data, `InitAnimData` defaults, normal
front `sDontFlip=TRUE`, and the duration-100/single-run initializer. All **101
active callbacks** (data2=0..100) pin C-truncated indices, GBA sine x2 writes,
negative affine rotation, both no-op `TryFlipX` calls, and tick-0 affine start.
Tick 101 restores identity/x2=0, calls `ResetSpriteAfterAnim`, installs
`WaitAnimEnd`, and increments data2 to 102. The shared reducer regression-pins
the accepted concave lifecycle; `ANIM_SWING_CONVEX_FAST` (50 x 2) and unused
`ANIM_SWING_CONVEX_FAST_SHORT` (50 x 1) remain explicitly unaccepted. Fresh
complete legal Scene-ON parties settle both selected species at x2=0/y2=0,
animNum=1/`SpriteCallbackDummy`; paired raw outputs are byte-identical with no
EOF newline: WEEPINBELL SHA-256
`a7ae6c5bf088e3a523a0da3cf178eac2024e3e7a1ed02d336a4df831ee44b12e`,
BANETTE `95b70a54be18eaa93e3cb8a2a4d4a2ce19e1b261f03ff82a1628fcae87c25dfb`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party and paired raw `cmp`; focused
family plus both ratchets **204/204**; `npx tsc --noEmit` and diff checks green;
exactly one complete `npm test` is green at **572 files, 5,926 passed + 1
skipped**; production build is green (**534 modules transformed**). The next
source-ranked generated census family is **`ANIM_BOUNCE_ROTATE_TO_SIDES`**
(5 mappings / 5 Factory / 0 outside): MAROWAK, MAGIKARP, SEEDOT, MEDITITE,
ILLUMISE.

## Front `ANIM_SHRINK_GROW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2v is exact for all **6 selector mappings / 6
Factory-reachable species**, with **zero outside-Factory mappings**: WARTORTLE,
NIDORINO, KOFFING, RHYDON, SLOWKING, GLIGAR. WARTORTLE is the representative
and GLIGAR the terminal sibling; all six selectors are batch-pinned and every
prior accepted front family remains regression-pinned. Move coverage stays
**107 exact / 0 partial / 0 staged / 169 unsupported** and
`ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.
Follow-up verification repair: the dynamic selector census now crosses an
explicit read-only `Record<string, string>` boundary; assertions and production
animation code are unchanged.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1878-1912`
proves task-zeroed data, normal-front `sDontFlip=TRUE`, tick-0 affine start,
and the normal `(data6,data7)=(8,3)` initializer. All **49 active callbacks**
(data2=0..48) pin u8-masked phase advance, GBA sine x/y scales, C-truncated
positive-sine y compensation, and y2=0..4. Tick 49 restores identity/y2=0,
calls `ResetSpriteAfterAnim`, and installs `WaitAnimEnd` without incrementing
data2/data4 (49/136). Distinct `ANIM_SHRINK_GROW_FAST` `(8,5)` and
`ANIM_SHRINK_GROW_SLOW` `(4,3)` selectors remain explicitly unaccepted.
Fresh complete legal Scene-ON parties settle both selected species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`; paired raw outputs are byte-identical
with no EOF newline: WARTORTLE SHA-256
`e4c09e7b1c413acc21745c649e7bb493ea87ff51d648181ae77bf7d6f2466005`,
GLIGAR `5dbf9079a53eb71470f474107391fc9f05ad9cf6604d1d807b561729b6d820d6`.

**Commands / next:** the preceding acceptance evidence remains the unchanged
`dump-onix-front-idle-anim.py` via `tools/run-mgba-probe.py` twice per legal
party and paired raw outputs cited above. This repair independently verified
the focused family plus both ratchets at **195/195**, `npx tsc --noEmit` green,
exactly one complete `npm test` at **572 files, 5,917 passed + 1 skipped**, and
one `npm run build` green (**534 modules transformed**). The next source-ranked
generated census family is **`ANIM_SWING_CONVEX`** (6 selector mappings / 4
Factory / 2 outside): WEEPINBELL, GOLDEEN, MEW, MANTINE, BANETTE, JIRACHI.

## Front `ANIM_CIRCULAR_STRETCH_TWICE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2u is exact for all **6 selector mappings / 6
Factory-reachable species**, with **zero outside-Factory mappings**: DITTO,
MUDKIP, SWELLOW, WAILMER, MINUN, REGIROCK. DITTO is the representative and
REGIROCK the terminal sibling; every prior accepted front family remains
regression-pinned. Move coverage stays **107 exact / 0 partial / 0 staged / 169
unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1087-1109`
proves task-zeroed data, normal-front `sDontFlip=TRUE`, tick-0 affine start,
and all **41 active callbacks** (data2=0..40) with C-truncated
`(data2*512/40)%256` indices and amplitude-32 GBA sine/cosine scales in
data4/data5. Tick 41 writes identity affine, calls `ResetSpriteAfterAnim`,
installs `WaitAnimEnd`, and increments data2 to 42. Fresh complete legal
Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired raw outputs are byte-identical with no EOF
newline: DITTO SHA-256
`26cae4ff0244a36a7cb6dbea0e7cfbe94b506ec4a86bea200f5032c433dc595e`,
REGIROCK `5d2e0fb67df2033d4868db97e13f5bf473d34c9b5a498a4da42d90847cb7c7d3`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **186/186**; TypeScript no-emit and diff checks green; exactly one
full `npm test` and one `npm run build` green. The next source-ranked generated
census family is **`ANIM_SHRINK_GROW`** (6/6 Factory species, zero outside):
WARTORTLE, NIDORINO, KOFFING, RHYDON, SLOWKING, GLIGAR.

## Front `ANIM_H_SLIDE_SLOW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2t is exact for all **7 selector mappings / 7
Factory-reachable species**, with **zero outside-Factory mappings**: WEEDLE,
PARAS, GRIMER, EXEGGCUTE, MR_MIME, SUDOWOODO, NINJASK. WEEDLE is the
representative and NINJASK the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1131-1153,
3665-3669,4118-4122` proves task-zeroed data, slow initializer data0=80,
normal-front `sDontFlip=TRUE`, both `TryFlipX` no-ops, and all **81 active
callbacks** (data2=0..80) with C-truncated `(data2*384/80)%256` indices and
amplitude-6 GBA sine x2 writes. Tick 81 clears x2, installs `WaitAnimEnd`, and
increments data2 to 82. The distinct normal data0=40 and fast data0=20
initializers remain explicitly unaccepted. Fresh complete legal Scene-ON
parties settle both species at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`.
Paired raw outputs are byte-identical with no EOF newline: WEEDLE SHA-256
`ddf75e4d3e1dad7197ca10ddae1cb595c732d84c4abb5af3e60bd24906d120dd`,
NINJASK `830d8fbd9726a2c15d951a66350390d444737c5872723bb17ab7c847f39bab45`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **177/177**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5869 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_CIRCULAR_STRETCH_TWICE`** (6 Factory species).

## Front `ANIM_FLASH_YELLOW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2s is exact for all **7 selector mappings / 7
Factory-reachable species**, with **zero outside-Factory mappings**: PIKACHU,
MAGNETON, ELECTABUZZ, ZAPDOS, AMPHAROS, ELEKID, RAIKOU. PIKACHU is the
representative and RAIKOU the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:603-620,911-939,
2473-2509` plus `palette.h:20-24` proves the exact 13-row
`sYellowFlashData`, task-zeroed data, palette capture through
`OBJ_PLTT_ID(oam.paletteNum)`, and all **56 active callbacks**. The reducer
pins every duration transition, the one-callback-delayed 12 palette writes,
full-strength coefficient 16 `RGB_YELLOW` flashes, coefficient 0 restores,
and tick 56's `(u8)-1` sentinel/`WaitAnimEnd` cleanup after the final restore.
Fresh complete legal Scene-ON parties settle both species at x2=0/y2=0,
animNum=1, and `SpriteCallbackDummy`. Paired raw outputs are byte-identical
with no EOF newline: PIKACHU SHA-256
`2e83c09bdb040ef1ff8637a260f94ac6dcfe33c6f967b56b984348a848884968`,
RAIKOU `b72527919f77b4f34bb43feba56c36876de8adafc321b481f0142d09de3e109f`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **168/168**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5855 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_H_SLIDE_SLOW`** (7 Factory species).

## Front `ANIM_H_STRETCH` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2r is exact for all **7 selector mappings / 7
Factory-reachable species**, with **zero outside-Factory mappings**: EKANS,
HITMONLEE, QUAGSIRE, SNEASEL, TYROGUE, TORCHIC, ALTARIA. EKANS is the
representative and ALTARIA the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` remains byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1562-1595`
proves task-zeroed data, normal-front `sDontFlip=TRUE`, tick-0 affine start,
all **41 active callbacks** (data2=0..40), exact GBA sine and C truncation,
the data2=10..29-only data7/index1 modulation, s16 wrapping/u8 masking, signed
affine scales, and tick 41 identity/reset/`WaitAnimEnd` cleanup with data2=42.
The distinct `ANIM_H_STRETCH_FAR`, `_FAR_TWICE`, and `_FAR_SLOW` back selectors
remain unaccepted. Fresh complete legal Scene-ON parties settle both species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired raw outputs are byte-identical
with no EOF newline: EKANS SHA-256
`910a3f50de504e27097b7eb7a4b445229888540513362c16912bee88addadb44`,
ALTARIA `24dddba203497ba399c2944bbf7a636edb3ced114e5bc4d44ddc7dee826176e9`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **159/159**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5851 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_FLASH_YELLOW`** (7 Factory species).

## Front `ANIM_H_VIBRATE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2q is exact for all **7 selector mappings / 7
Factory-reachable species**, with **zero outside-Factory mappings**: BEEDRILL,
ARCANINE, SCYTHER, SCIZOR, HITMONTOP, SHIFTRY, DUSCLOPS. BEEDRILL is the
representative and DUSCLOPS the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1110-1129`
proves Task-zeroed data0/data2..data7 and the exact source-ordered normal
callback with no affine setup or `TryFlipX`. All **41 active callbacks**
(data2=0..40) are pinned for alternating +1/-1 signs, C-truncated indices,
and amplitude-6 GBA sine x2 writes. Tick 41 clears x2, installs `WaitAnimEnd`,
and increments data2 to 42. The distinct amplitude-9 `ANIM_H_VIBRATE_FAST`
and amplitude-12 `ANIM_H_VIBRATE_FASTEST` remain explicitly unaccepted. Fresh
complete legal Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired direct raw outputs are byte-identical with no
EOF newline: BEEDRILL SHA-256
`4657eaa59c66c769b56a4f1db250b3ba24ee7b1789e7a7d0c01db99fe0cd98ca`,
DUSCLOPS `b13802454ef9b92cf94aa210d4027f2ce67a12ae96dc7ca252c044782561f3f3`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **148/148**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5840 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_H_STRETCH`** (7 Factory species).

## Front `ANIM_H_JUMPS` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2p is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**: WIGGLYTUFF,
ABRA, MACHAMP, TOTODILE, NATU, SMEARGLE, SPINDA, VIGOROTH. WIGGLYTUFF is the
representative and VIGOROTH the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,2720-2753`
proves Task-zeroed data0/data2..data7, normal-front `sDontFlip=TRUE`, both
`TryFlipX` calls as no-ops, and the exact C-truncated counter/128 switch,
remainder arithmetic, and GBA sine y2 writes. All **43 active callbacks** are
pinned at counters 0..504 in steps of 12 across all four x2 legs. The next
callback observes counter=516, clears x2/y2, installs `WaitAnimEnd`, increments
data2 to 528, and performs the second no-op flip. Fresh complete legal Scene-ON
parties settle both species at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`.
Paired direct raw outputs are byte-identical with no EOF newline: WIGGLYTUFF
SHA-256 `ace0d70d460715a093f9830d074e6e3d6cea3e2741b3fb80054ea2a4ecda558f`,
VIGOROTH `9e7ad2953ca1a23d4864d476c6da558a6ac0af556404785f63cc47fa26fbaa2f`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **139/139**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5831 passed + 1 skipped** and one `npm run build`
green. The next generated-census/source-ranked front family is
**`ANIM_H_VIBRATE`** (7 Factory species).

## Front `ANIM_H_SLIDE_WOBBLE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2o is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**: BUTTERFREE,
GOLBAT, CLOYSTER, KABUTO, BALTOY, LUVDISC, CASTFORM, CHIMECHO. BUTTERFREE is
the representative and CHIMECHO the sibling; every prior accepted front family
remains regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1803-1833`
proves Task-zeroed data0/data2..data7, normal-front `sDontFlip=TRUE`, both
`TryFlipX` no-ops, tick-0 affine start, C-truncated index/var arithmetic, var's
u8 mask, every GBA sine x2 and signed-s16-to-u16 affine-rotation write, data2
increment order, and tick-101 identity/x2/reset/`WaitAnimEnd` cleanup after
**101 active callbacks (ticks 0..100)**. The shared slide-wobble reducer is
also pinned callback-for-callback against the existing source-faithful KABUTO
presentation reducer. Fresh complete legal Scene-ON parties settle both species
at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw outputs are
byte-identical with no EOF newline: BUTTERFREE SHA-256
`6e578f80ba3c04fe2048ff3ecc0ae2788dce350239907594d7bd01c30ea4961d`,
CHIMECHO `a6bda637cc6e6993afce75b7f934113a1ffd5db5d5cd44f77072114c6929a2be`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **130/130**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5822 passed + 1 skipped** and one `npm run build`
green. The next source-ranked generated census family is **`ANIM_H_JUMPS`**
(8 Factory species).

## Front `ANIM_V_SLIDE_WOBBLE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2n is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**: SEAKING,
HOPPIP, MISDREAVUS, SHEDINJA, PELIPPER, WAILORD, GOREBYSS, SHUPPET. SEAKING
is the representative and SHUPPET the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial
/ 0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,984-1028,
1735-1766,3761-3765` proves Task zeroed data defaults, normal data0=10,
tick-0 affine start, C-truncated index/var arithmetic, var's u8 mask, every GBA
sine y2 and signed-s16 to u16 affine-rotation write on the normal-front
`sDontFlip=TRUE` path, data2 increment order, and tick-101 identity/y2/reset/
`WaitAnimEnd` cleanup after **101 active callbacks (ticks 0..100)**. The
distinct Small initializer data0=5 remains explicitly unaccepted. Fresh
complete legal Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired direct raw outputs are byte-identical with no EOF
newline: SEAKING SHA-256
`06751f507c7530342cd859a0b16d8830b55a2ce2f52d82e6857ea13b25c1381b`,
SHUPPET `3f180c13952503be637c5aaa329a8121ef3eaf0d1098c664e15fe381d11502ef`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **120/120**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5812 passed + 1 skipped** and one `npm run build`
green. The next source-ranked generated census family is
**`ANIM_H_SLIDE_WOBBLE`** (8 Factory species).

## Front `ANIM_V_SHAKE_TWICE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2m is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**: BLASTOISE,
POLIWRATH, TAUROS, DONPHAN, EXPLOUD, AGGRON, CRADILY, BAGON. BLASTOISE is the
representative and BAGON the sibling; every prior accepted front family remains
regression-pinned. Move coverage stays **107 exact / 0 partial / 0 staged / 169
unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:622-628,911-939,
1638-1678,3754-3759` proves Task data0/data2..data7 zeroing, normal data0=48,
the complete u8 table, every cast/amplitude/sine/state write, and the distinct
unused Slow data0=24 initializer. The ROM's `__divsi3` at `0x082e7540` returns
zero for the terminal sentinel's source-order 0/0 before y2=0/`WaitAnimEnd`.
The expected lifecycle is independently confirmed: **78 active callbacks** in
**31/16/31** phases, with every boundary/reset pinned and sentinel cleanup at
tick 78. Fresh complete legal Scene-ON parties settle both species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw outputs are
byte-identical with no EOF newline: BLASTOISE SHA-256
`333c436ec56ad12d0d8d3586f86af7f4feb076a5234a646c194f6705ab826a87`,
BAGON `9accac67bde9270bfe8898e45ea5160783fc08dc47fcfbd0d8fea1ca995fdf16`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family plus
both ratchets **111/111**; TypeScript no-emit and diff checks green; exactly one
full `npm test` **567 files, 5803 passed + 1 skipped** and one `npm run build`
green. The next generated-census tie is 8 Factory species; source order ranks
the adjacent **`ANIM_V_SLIDE_WOBBLE`** family next.

## Front `ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2l is exact for all **8 selector mappings / 8
Factory-reachable species**, with **zero outside-Factory mappings**. JIGGLYPUFF
is the representative and GYARADOS the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial /
0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1003-1077,
1915-2001,3679-3699` proves the normal-front `sDontFlip=TRUE` path,
`AddNewAnim` defaults, Small rotation=2048/data6/data=0, the normal-speed table,
affine start, both `TryFlipX` calls, and all 87 active writes across the 8-tick
first leg plus six 12-tick legs. The generalized source-order reducer pins C
signed truncation, u16 rotation, every x2/y2/affine write and leg/reset
transition, then tick 87's identity/x2/y2/`ResetSpriteAfterAnim`/`WaitAnimEnd`
cleanup. Slow remains rotation=4096/data=1 and SmallSlow remains
rotation=2048/data=1. Fresh complete legal Scene-ON parties settle both species
at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw outputs are
byte-identical with no EOF newline: JIGGLYPUFF SHA-256
`bb3d61bffa2354eac237e0bbdf6ed46ae03a14420ce80da7477ec40d5c0a1ba2`,
GYARADOS `2642520d74a64f6b47f6cd472e2e9d5e20d75a32e6416c44e218bfd79cdcee74`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family/
boundary-ratchet tests **102/102**; TypeScript no-emit and diff checks green;
exactly one full `npm test` **567 files, 5794 passed + 1 skipped** and one
`npm run build` green. The next generated-census/source-ranked front family is
**`ANIM_V_SHAKE_TWICE`** (8 Factory species).

## Front `ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2k is exact for all **9 selector mappings / 9
Factory-reachable species**, with **zero outside-Factory mappings**. VILEPLUME
is the representative and LOUDRED the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial /
0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1003-1077,
1915-2001,3679-3699` proves the normal-front `sDontFlip=TRUE` path, full fast
and slow tables, `AddNewAnim` defaults, slow `data6/data=1`, affine start, both
`TryFlipX` calls, and all 167 active writes across the 16-tick first leg plus
six 24-tick legs. The source-order reducer pins C signed truncation, u16
rotation, x2/y2/affine writes, every leg/reset transition, and tick 167's
identity/x2/y2/`ResetSpriteAfterAnim`/`WaitAnimEnd` cleanup. Source correction:
normal `Slow -> Anim_BounceRotateToSides` uses rotation **4096**; **2048** is
exclusive to the distinct `Small`/`SmallSlow` initializer. Fresh complete legal
Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired direct raw outputs are byte-identical with no EOF
newline: VILEPLUME SHA-256
`891884d74ae18521c3e4963b01d290653f988cdbe5045e87c3860bd847cfd2f2`,
LOUDRED `f0dadc0c0711f44386e832a5f2ea862e967096fe27b56686bdc53ff210e9c3bc`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; raw `cmp`; focused family/
boundary-ratchet tests **85/85**; TypeScript no-emit and diff checks green;
exactly one full `npm test` **567 files, 5783 passed + 1 skipped** and one
`npm run build` green. The next generated-census/source-adjacent front family
is **`ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL`** (8 Factory species).

## Front `ANIM_H_JUMPS_V_STRETCH` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2j is exact for all **10 selector mappings / 10
Factory-reachable species**, with **zero outside-Factory mappings**. MANKEY is
the representative and WYNAUT the sibling; all prior front families remain
regression-pinned. Move coverage stays **107 exact / 0 partial / 0 staged / 169
unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:911-939,1031-1064,
2755-2868,3805-3815` proves the normal-front `sDontFlip=TRUE` path,
`AddNewAnim` defaults, and the single-run data=-1/runs=1 distinction from
`_Twice`'s data=1/runs=2. The source-order reducer pins affine start; `_0`
active ticks 0-10 and strict transition 11; `_1` active ticks 12-60 and
transition 61; `_2` active ticks 62-72; then tick 73's x2/y2/identity-affine/
`ResetSpriteAfterAnim`/`WaitAnimEnd` cleanup and final data2 increment to 144.
Every C-truncated jump, sine, scale, counter, phase reset, and normal-front
`TryFlipX` boundary is pinned. Fresh complete legal Scene-ON parties settle
both species at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw
outputs are byte-identical with no EOF newline: MANKEY SHA-256
`dd828c5122f1693d1a947794c315648eb3fd1edbb15b0d988667d9de8ffb5161`,
WYNAUT `0998becc3884e86138b282f1a17b153827575583adeac15283618a98b2bc9d61`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **81/81**; exactly one full `npm test` **567 files, 5773 passed +
1 skipped** and `npm run build` green. The next generated-census/source-ranked
front family is **`ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW`** (9 Factory species).

## Front `ANIM_V_JUMPS_SMALL` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2i is exact for all **10 selector mappings / 10
Factory-reachable species**, with **zero outside-Factory mappings**. CHARMANDER
is the representative and DELIBIRD the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial
/ 0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:1181-1208,3768-3773`
proves and is ported in source order: data0=3; accumulator step 12; all 33
active callbacks (0..384); C signed-division branches; counter-256 adjustment;
GBA u8 sine indices; data0*2/data0*3 amplitudes; then tick 33's strict
counter>384 x2/y2/`WaitAnimEnd` cleanup and final increment to data2=408.
Fresh complete legal Scene-ON parties settle both species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired direct raw outputs are
byte-identical with no EOF newline: CHARMANDER SHA-256
`11290c70ee4cef6463fa4878ad94c665f080c6ae2cd03fe4b41354add0227518`,
DELIBIRD `ab44bf5b7111e37d8f491e24a1f0aa0ce6a331d7220ae231f74d3c9741626661`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **71/71**; exactly one full `npm test` **567 files, 5763 passed +
1 skipped** and `npm run build` green. The next generated-census/source-ranked
front family is **`ANIM_H_JUMPS_V_STRETCH`** (10 Factory species).

## Front `ANIM_V_SLIDE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2h is exact for all **10 selector mappings / 10
Factory-reachable species**, with **zero outside-Factory mappings**. SEADRA is
the representative and MARSHTOMP the sibling; every prior accepted front
family remains regression-pinned. Move coverage stays **107 exact / 0 partial
/ 0 staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical
at SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:910-939,1038-1042,
1156-1180` proves and is ported in source order: normal-front
`sDontFlip=TRUE`; data0=40; both `TryFlipX` calls; all 41 active C-index and
negated-sine y2 writes; then tick 41's strict `data2 > data0` guard,
y2/`WaitAnimEnd` cleanup, second flip and final data2 increment. Fresh complete
legal Scene-ON parties settle both species at x2=0/y2=0/animNum=1/
`SpriteCallbackDummy`. Paired direct raw outputs are byte-identical with no
EOF newline: SEADRA SHA-256
`c70a070b61918ed2e3c0f1bbe3b1be778d63ee29865a13176f1683ab5e17963a`,
MARSHTOMP `f29ff01ed2a5fc6b732da0955e4029559063e0a2acc7db7b9fbbfaa84ca1ec68`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **63/63**; exactly one full `npm test` **567 files, 5755 passed +
1 skipped** and `npm run build` green. Among the remaining 10-species census
tie, the source-ranked next family is **`ANIM_V_JUMPS_SMALL`**.

## Front `ANIM_SWING_CONCAVE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2g is exact for all **11 selector mappings / 11
Factory-reachable species**, with **zero outside-Factory mappings**. SQUIRTLE
is the representative and SHUCKLE the sibling; all seven prior front families
remain regression-pinned. Move coverage stays **107 exact / 0 partial / 0
staged / 169 unsupported** and `ANIMATION_COVERAGE.json` is byte-identical at
SHA-256 `6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:910-939,1038-1059,
2512-2542,3836-3843` proves and is ported in source order: the normal-front
`sDontFlip=TRUE` path; `AddNewAnim`'s explicit rotation/delay/runs/speed/data
defaults; data=100; tick-0 affine start; both `TryFlipX` calls; all 101 active
C-index/x2-sine/rotation-affine writes; and tick-101's strict guard,
identity/x2/reset/`WaitAnimEnd` cleanup, and final data2 increment. Fresh
complete legal Scene-ON parties settle both species at
x2=0/y2=0/animNum=1/`SpriteCallbackDummy`. Paired raw outputs are
byte-identical with no EOF newline: SQUIRTLE SHA-256
`e09a8302d4a11998a8b719017563adafff8e43c3be61f5f5c7996cab41e3a712`,
SHUCKLE `e68670c57fea068ff9e3b6871973dc83af89e171dce3a3cbe9ba6e019f1433a0`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **55/55**; exactly one full `npm test` **567 files, 5747 passed +
1 skipped** and `npm run build` green. The generated Factory selector census
ranks **`ANIM_V_SLIDE` (10 species)** next.

## Front `ANIM_GROW_VIBRATE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2f is exact for all **18 selector mappings**, the
derived **16 Factory-reachable species**, and the two outside-Factory mappings
**MEWTWO + HO_OH**. KADABRA is the representative and REGISTEEL the sibling;
all six prior front families remain regression-pinned. Move coverage stays
**107 exact / 0 partial / 0 staged / 169 unsupported** and
`ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:1257-1286` is ported in
source order: tick 0 `HandleStartAffineAnim`, all 41 active callbacks with C
index truncation and even/odd 32/8 sine amplitudes, then strict `data2 > 40`
identity-affine/`ResetSpriteAfterAnim`/`WaitAnimEnd` cleanup and the final
data2 increment at tick 41. Fresh complete legal Scene-ON parties settle both
species at x2=0/y2=0/animNum=1/`SpriteCallbackDummy`; paired direct raw probe
outputs are byte-identical with no EOF newline: KADABRA SHA-256
`54e722be9865fa649ce1b4913ebd72c06ee23c4c092cd3c13ea7943e538d52bf`,
REGISTEEL `06dba32da33afb561f90b10e6a5551a41f3efe3735eedc522f46a65c0ca19471`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per party; raw `cmp`; focused family/boundary/
ratchet tests **48/48**; one full `npm test` **567 files, 5740 passed + 1
skipped** and `npm run build` green. The generated Factory selector census
ranks **`ANIM_SWING_CONCAVE` (11 species)** next.

## Front `ANIM_H_SHAKE` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2e is exact for all **17 selector mappings**, the
derived **16 Factory-reachable species**, and the sole outside-Factory mapping
**RAYQUAZA**. KABUTOPS is the representative and BLAZIKEN the independently
probed sibling; all five prior accepted front families remain regression-pinned.
Move coverage remains **107 exact / 0 partial / 0 staged / 169 unsupported**;
`ANIMATION_COVERAGE.json` stays byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:1343-1366` proves
`Anim_HorizontalShake` sets data0=60/data7=3, invokes `HorizontalShake`, then
installs that callback. The source-order reducer pins every active callback at
ticks **0-38** (accumulators 0-2280), the strict **2340 > 2304** guard, and tick
**39** terminal x2=0/y2=0/`WaitAnimEnd` cleanup. Complete legal Scene-ON parties
settle both species at animNum=1/`SpriteCallbackDummy`; paired direct raw probe
outputs are byte-identical with no EOF newline: KABUTOPS SHA-256
`96894be4819931417816ecffecd9eb114441a08751d046bb2e8b38d0f12cae34`,
BLAZIKEN `44025025cca8950231cae7f7d494c519b61029503834956055f57af9ef0cfc86`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` through
`tools/run-mgba-probe.py` twice per party; `cmp` both raw pairs; focused
animation tests **36/36** plus executable ratchets **6/6**; one full `npm test`
and `npm run build` green. Next exact front family: **`ANIM_GROW_VIBRATE`**.

## Front `ANIM_V_SQUISH_AND_BOUNCE_SLOW` terminal family accepted (2026-08-01)

**Verdict / counts:** rung 2d is exact for all **16 selector mappings / 16
Factory-reachable species**. LICKITUNG represents the family and MILTANK is
the independently probed sibling. The prior four accepted front families are
regression-pinned. Coverage remains **107 exact / 0 partial / 0 staged / 169
unsupported**; `ANIMATION_COVERAGE.json` is byte-identical at SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`.

**Source boundary / evidence:** `pokemon_animation.c:1834-1870,3658-3663`
proves the slow initializer reuses `VerticalSquishBounce` and changes only
`data[0]` from 16 to 32. The source-order reducer pins active ticks **0-96**
and tick **97** terminal x2=0/y2=0, identity affine, normal affine mode and
`WaitAnimEnd`; fresh settled Scene-ON receipts pin animNum=1 and
`SpriteCallbackDummy`. Paired direct probe outputs are byte-identical (no EOF
newline): LICKITUNG SHA-256
`b886194e2bdaf8a1c3f67dcd17afe727f70e3bcad8955374a1d50aff2291c360`,
MILTANK `65731784a67a75e0ecdc4e58ae8d4de8be01c1c6f27a2520b36e6e6c7ba3f3c1`.

**Commands / next:** unchanged `dump-onix-front-idle-anim.py` via
`tools/run-mgba-probe.py` twice per legal party; `cmp` both pairs; focused
animation tests **30/30**; full `npm test` **567 files, 5728 passed + 1
skipped**; `npm run build` green. Next exact front family:
**`ANIM_H_SHAKE`** (16 Factory species), then continue the source-ranked head.

## Front `ANIM_V_SHAKE` terminal family accepted (2026-07-31)

**Verdict:** rung 2c is complete for the **24 Factory-reachable species** in
this opponent-front family. The generated selector table has 25 mappings, but
`battle-frontier-mons.json` proves GROUDON is the sole outside-Factory member;
derived exports and Tier-1 tests pin both counts without mislabeling 25 as the
Factory total. The three prior accepted families remain unchanged.

**Model / evidence:** `speciesIdleAnim.ts` ports `Anim_VerticalShake` and
`VerticalShake` source-order arithmetic: data[0]=60, active accumulators
0..2280, the strict `counter > 2304` guard at 2340, and terminal y2=0 cleanup
before `WaitAnimEnd`. Complete legal Scene-ON parties settle representative
MACHOKE and sibling RHYHORN at **x2=0 / y2=0 / animNum=1 /
SpriteCallbackDummy**. Two fresh RAM-probe runs per species are byte-identical:
MACHOKE receipt SHA-256
`7b5914c4e81c08e73287c19593f791a0b44e48d213fdbd14e1308df9a946c0af`,
RHYHORN `1c7cd9974d4115327d40cb5dd602a9123c82b31211066ef33b59cf727243b313`.

**Gates / coverage:** focused animation tests are **24/24**; the full suite is
green at **567 files, 5722 passed + 1 skipped**, and the production build is
green. `ANIMATION_COVERAGE.json` remains byte-identical (SHA-256
`6e8067e5f58c0d442b6cd57ece28189a21b9cbd116c6bef9298e2b53799c5773`),
with coverage unchanged at **107 exact / 0 partial / 0 staged / 169
unsupported**. No probe, seam, boundary, barrier, gameplay, RNG, turn, damage,
facility, or move-coverage state changed.

## Front `ANIM_V_STRETCH` terminal family accepted (2026-07-31)

**Verdict:** rung 2b is complete for the generated 32-species Factory front
family. `speciesIdleAnim.ts` derives dispatch from
`send-out-anim-selector-tables.json` and ports `Anim_VerticalStretch`'s 41
active callbacks, both `sDontFlip` affine branches, C-truncated y2 arithmetic,
and tick-41 identity/y2/affine cleanup before `WaitAnimEnd`. The accepted
`ANIM_V_SQUISH_AND_BOUNCE` family and ONIX `ANIM_RAPID_H_HOPS` behavior remain
pinned without change.

**Evidence:** complete legal Scene-ON parties settle opponent-front QUILAVA
and HOUNDOUR at **x2=0 / y2=0 / animNum=1 / SpriteCallbackDummy**. Two fresh
RAM-probe runs per species are byte-identical: QUILAVA receipt SHA-256
`8a2293ce042d30d3c097a4f127f911ca8a2e3e60db426392a2c02262130add56`,
HOUNDOUR `613b110bfc757ef5fce03ca6a8098d03c80ce189aa45bafcae033b844e7b89f0`.
Tier-1 pins source arithmetic, generated dispatch/all 32 species, both paired
receipts, and both prior-family regressions. Full gates are green: **567 files,
5716 passed + 1 skipped**, plus the production build.

**Coverage / next:** `ANIMATION_COVERAGE.json` remains byte-identical and
`npm run animation:coverage` remains **107 exact / 0 partial / 0 staged / 169
unsupported**. Continue the ordered front-family terminal ladder; no move
track, probe change, gameplay, engine seam, boundary, barrier, RNG, turn,
damage, or facility state changed.

## Front `ANIM_V_SQUISH_AND_BOUNCE` terminal family accepted (2026-07-31)

**Verdict:** rung 2a is complete for the generated 50-species Factory front
family. `speciesIdleAnim.ts` now dispatches from
`send-out-anim-selector-tables.json`, not a hand-maintained species map, and
ports `VerticalSquishBounce`'s 49 active callbacks plus affine/y2 terminal
cleanup before `WaitAnimEnd`. Existing ONIX `ANIM_RAPID_H_HOPS` support is
unchanged.

**Evidence:** complete legal Scene-ON parties settle opponent-front BAYLEEF
and MAGBY at **x2=0 / y2=0 / animNum=1 / SpriteCallbackDummy**. Two fresh
RAM-probe runs per species are byte-identical: BAYLEEF receipt SHA-256
`e5bcb0354f65713fa5ef5713035209762ebf6e204a48e985b9d05ab58f38fc6a`,
MAGBY `58cb14b494d54e6e4950642d9cd57e841a0dc8529f784c24e4b3b46adc45f2ab`.
Tier-1 pins source arithmetic, generated dispatch/all 50 species, both paired
receipts, and ONIX regression. Full acceptance gates are green: **567 files,
5711 passed + 1 skipped**, plus the production build.

**Coverage / next:** `ANIMATION_COVERAGE.json` remains byte-identical and
`npm run animation:coverage` remains **107 exact / 0 partial / 0 staged / 169
unsupported**. Continue the ordered front-family terminal ladder; no move
track was fabricated and no gameplay, engine seam, boundary, barrier, RNG,
turn, damage, or facility state changed.

## PRIORITY DIRECTIVE — send-out intro animations run ahead of the move queue (2026-07-31)

**State:** User-set priority, recorded by the interactive main session at the
user's request. The per-species **send-out intro animation** family takes
priority over the remaining move acceptance queue (`MOVE_DRAGON_BREATH`,
`MOVE_BIND`) and over new component tracks. Coverage is unchanged at **107
exact / 0 partial / 0 staged / 169 unsupported**; no code, test, boundary,
barrier or gameplay change accompanies this entry.

**Why it outranks the moves:** every one of these functions freezes its
`x2`/`y2` at its last active accumulator and hands off to
`SpriteCallbackDummy` — a **permanent residual offset for the rest of the
battle**, leaking into windows that never show the send-out. Two windows have
already paid for the same missing residual by hand (DRAGON_RAGE's dense window
and `docs/aerial-ace-portable-staging-probe.md`, both the settled
opponent-front ONIX at `x2=+1`). It is a defect class under the move queue,
not a cosmetic backlog behind it.

**Did:** derived the full scope from pinned source and wrote
**`docs/send-out-intro-animation-program.md`** — mechanism, both selector
paths, the 5-rung ladder, the acceptance bar, and a re-runnable derivation
script for every figure. Headline numbers: 881 rental entries / 376 species;
front (opponent) collapses to **62** functions with a steep head (12 → 56%,
30 → 85%); back (player) is selected by species **and nature** and stays flat
at **68** reachable functions (top 8 → 34%); union closure is **194 of the
file's 234** static functions, with only ~20 shared between the two families.
Load-bearing invariant, grep-verified: **no `Anim_*` function reads species or
mon data** — species/nature enter at selection time only, so one ported
function is correct for every species that maps to it.

**Next:** rung 2 of the ladder — generalize `computeTerminalOffset` out of
`src/animation/speciesIdleAnim.ts` and bank tier-1 terminal constants for the
62 front functions, steep head first, each accepted against a RAM probe of a
settled front sprite (not pixels alone). Rung 1 (selector-table extraction) is
a prerequisite owned by another lane — see below. Rungs 4-5 stay
demand-driven; do not batch them speculatively.

**Notes:** this family has no home in `ANIMATION_COVERAGE.json` — its
acceptance unit is a move, and `componentTracks` validation
(`tools/animation/coverage.ts:150-168`) requires every representative to be a
Level 50 move sharing the track's components. The queue was deliberately left
untouched rather than faking a move representative; this entry is the
directive. Three hand-done one-offs exist today with no dispatcher: ONIX front
(`src/animation/speciesIdleAnim.ts:44`, terminal only), MAGBY back
(`src/engine/magbySendOut.ts:18`), ONIX back (`src/engine/battleMenu.ts:708`)
— the latter two sit outside animation-owned paths, so retiring them into a
dispatcher is a coordinated cross-lane change, not a drive-by.

**For the main program:** rung 1 is yours, not animation's. Five literal
source tables need extracting into `src/data/gen/` (side-lane ownership per
AGENTS.md): `sMonFrontAnimIdsTable`, `sSpeciesToBackAnimSet`,
`sBackAnimNatureModTable`, `sMonAnimationDelayTable` (nonzero for 52 of the
376 pool species), `sBackAnimationIds`. Identity-const census idiom applies.
Animation is blocked on these before rung 2 can be keyed by species.

## MOVE_ROAR promoted exact; noise-line-roar-effect complete (2026-07-30)

**Verdict:** `MOVE_ROAR` is exact. The pure source-relative reducer, narrow
typed Scene-ON seam and production compositor cover shared six-NOISE_LINE
RoarEffect sprites, attacker monbg/splitbgprio/8:8 alpha, double cry/wait,
ScaleMonAndRestore, target SlideOffScreen, waits, hardware latches, tags,
palettes, registers, audio, blend/monbg cleanup and first inactive frame. The
seam carries only resolved Houndour/Onix geometry and immutable field
presentation; all guards, accuracy, forced switching, controller, RNG, turn
and facility state remain external.

**Dense acceptance:** corrected legal set-119 Houndour parties pass every
source/reducer/seam/raw-RGB/production framebuffer frame twice fresh:
player-back **252-350 (99/99)** with evidence/raw
`cec50726…3b688aa1` / `0a90faea…21174899`; opponent-front **219-322
(104/104)** with `d7b5ddc1…e1b4da8` / `727e277d…d1a0002a`. `MOVE_HOWL`
independently remains **102/102 twice fresh in both orientations**. Coverage
is **107 exact / 0 partial / 0 staged / 169 unsupported** and the
`noise-line-roar-effect` track is complete. No gameplay, boundary, barrier,
canonical-dependency or main-doc change.

## MOVE_ROAR corrected source/probe checkpoint; remains unsupported (2026-07-30)

**State:** `MOVE_ROAR` remains unsupported; coverage is unchanged at **106
exact / 0 partial / 0 staged / 170 unsupported**. The source audit pins
challenge-0 set **119 `FRONTIER_MON_HOUNDOUR`** (species 228, Docile,
Sp. Atk/HP, Charcoal) and its distinct ScaleMonAndRestore, SlideOffScreen,
double-cry/wait, monbg/splitbgprio/8:8-alpha, six-NOISE_LINE, and cleanup
body.

**Evidence:** both complete legal Scene-ON parties are mechanically
asymmetric: player Houndour retains exact **CRUNCH/EMBER/ROAR/PROTECT** and
the controller presses DOWN to choose slot three; only opponent Houndour uses
four Roars to constrain AI. Every first-active through first-inactive frame
reproduces twice fresh: player-back **252-350 (99/99)** evidence/raw
`cec50726…3b688aa1` / `0a90faea…21174899`; opponent-front **219-322
(104/104)** `d7b5ddc1…e1b4da8` / `727e277d…d1a0002a`. The shared
parameterized recorder also reran Howl's complete receipts unchanged.

**Next:** separately port a source-relative Roar reducer, narrow typed
presentation seam, and production compositor, then prove every dense frame
in both orientations; this checkpoint supplies no production support or exact
promotion.

## MOVE_PRESENT promoted exact; green-sparkle-moonlight complete (2026-07-30)

**Verdict:** `MOVE_PRESENT` is exact for all four committed branch/orientation
bodies. The pure source-relative reducer ports the common 60-frame moving
`ITEM_BAG`, five-`EXPLOSION` damage branch, and nine-`GREEN_SPARKLE` plus
four-target-`BLUE_STAR` healing branch. The typed Scene-ON seam takes damage
or heal as immutable controller input; animation code owns no branch choice,
outcome, damage, healing, or RNG.

**Dense acceptance:** player damage **1012–1212 (201/201)**, player heal
**1946–2197 (252/252)**, opponent damage **78–278 (201/201)**, and opponent
heal **1404–1655 (252/252)** each pass source/component/seam/raw-RGB and
production framebuffer equality twice fresh. Receipt/raw prefixes remain
`a2cc09d1/0507c412`, `bbb023fe/b2fe7f30`,
`9d752ec6/8e9f36a7`, and `9a76aeeb/2e5b78ad`. The compositor reuses honest
source-derived bag, explosion, Moonlight sparkle/star, Delibird/Onix, field,
healthbox, and text assets, preserving mirrored geometry, OAM/matrix latches,
tag/palette/audio/wait cleanup and side-relative subpriority ordering.
Coverage is **106 exact / 0 partial / 0 staged / 170 unsupported**; the
`green-sparkle-moonlight` track is complete. No boundary, barrier, canonical
recording, gameplay, controller, turn, round, or facility state changed.

## MOVE_SECRET_POWER promoted exact; slam-hit-slide-shake complete (2026-07-30)

**Verdict:** `MOVE_SECRET_POWER` is exact through its sole reachable Factory
body, indoor `BATTLE_ENVIRONMENT_BUILDING` → `Move_STRENGTH`. Complete legal
challenge-0 set-117 Teddiursa/Onix parties pass the full first-active through
first-inactive cleanup interval at **222–323 (102/102)** twice fresh in both
orientations through the source reducer, typed seam, software/hardware OAM,
matrices, palette/tag/register/audio receipts, raw RGB, and production shared
framebuffer. Player-back evidence/raw hashes remain
`9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3` /
`af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903`;
opponent-front hashes remain
`8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172` /
`f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a`.

**Model / boundaries:** the compositor preserves IMPACT lifetime,
`ShakeAndSinkMon`'s distinct two-transfer position latch, four-tick return
slide, side-respecting two-loop ellipse, three animation-1 hitsplats including
source slot-reuse priority, final `ShakeMon2`, monbg/12:8 alpha, all four
sounds, legal Teddiursa/Onix art and geometry, waits, and cleanup. The later
**472–509** secondary-status animation remains controller-owned and outside
the move body. `MOVE_SLAM` independently reruns **54/54 twice fresh in both
orientations** with unchanged hashes. No battle semantics or boundary pins
changed. Coverage is **105 exact / 0 partial / 0 staged / 171 unsupported**;
the `slam-hit-slide-shake` component track is complete.

## MOVE_SECRET_POWER source/controller checkpoint; remains unsupported (2026-07-30)

**Verdict:** `MOVE_SECRET_POWER` remains unsupported. A complete source,
generated-inventory, battle-script, controller, and environment audit proves
challenge-0 set **117 `FRONTIER_MON_TEDDIURSA`** is the lowest legal Level-50
carrier, correcting the older set-162 Delcatty evidence. The Factory battle
room is indoor, so its only reachable visual dispatch is
`BATTLE_ENVIRONMENT_BUILDING` → `Move_STRENGTH`; all nine explicit terrain
branches plus the plain fallback are now pinned.

**Controller/body boundary:** a successful hit emits
`CONTROLLER_MOVEANIMATION`, both player and opponent controllers call
`DoMoveAnim(290)`, and `AnimTask_GetBattleEnvironment` selects Strength.
Accuracy misses bypass `attackanimation`; `MOVE_RESULT_NO_EFFECT` and
`HITMARKER_NO_ANIMATIONS` select the pause route; the secondary effect is
chosen only after the animation/result message. The required Strength body is
independently enumerated: IMPACT, `ShakeAndSinkMon`, return slide, elliptical
target translation, three hitsplats, `ShakeMon2`, monbg/alpha, four sounds,
and cleanup.

**Evidence / next:** `secretPowerSourceAudit.ts` and its focused Tier-1 test
pin the full dispatch/controller contract while reusing the existing
source-complete `getsecretpowereffect` semantic tests without changing battle
logic. No reducer, compositor, dense oracle fixture, or exact status was
added. `MOVE_SLAM` remains independently exact at **54/54 twice fresh in both
orientations with unchanged hashes**. Coverage remains **104 exact / 0 partial
/ 0 staged / 172 unsupported**. Next work is a separate complete Strength
reducer/compositor and twice-fresh full dense Scene-ON acceptance in both
orientations using legal set-117 Teddiursa parties.

## MOVE_ATTRACT promoted exact; red-heart-sweet-kiss track complete (2026-07-29)

**Verdict:** `MOVE_ATTRACT` is exact. Source, generated inventory,
battle-script, and controller audit pin set **113 `FRONTIER_MON_EEVEE`** as
the lowest legal Level-50 carrier and one reachable animation body after
accuracy and `tryinfatuating`. Accuracy, same-gender, genderless,
already-infatuated, and `OBLIVIOUS` failures select no animation body.

**Evidence:** complete legal female-Eevee/male-Onix Scene-ON parties pass the
complete first-active frame through first-inactive cleanup twice fresh per
orientation. Player-back **66–500 (435/435)** evidence/raw
`a5008ce72fd22417d8ec1be80158fd3a5f93b715165700b875601c476c5717c8` /
`e627d99e69936a320250ab89b946221a179d2ea3a2ed076068a2ff82e9edd9a9`;
opponent-front **70–504 (435/435)**
`234dd9d0da4f02be12a404f3ef36eaa1071bd66d2886eaa75fe3aa25ae48422e` /
`daa9c2ed067fcfa6d56a98d364c5d3e31e0ca7af30bd15ca72c2c93ddb2ef329`.

**Model / sibling:** the reducer, typed seam, and production compositor port
the projectile, six burst, and eight rising RED_HEART sprites, including the
opponent-front pre-OAM allocation; SwayMon; HeartsBackground tiles, palette,
alpha ramp and cleanup; two target blend cycles; all audio/panning;
attacker/target geometry; legal art/idle offsets; OAM/hardware transfer and
cleanup. `MOVE_SWEET_KISS` independently reruns **159/159** twice fresh in
both orientations with unchanged evidence/raw hashes.

**Ownership / next:** presentation owns no accuracy, gender/ability or
infatuation result, RNG, controller, turn/facility state, boundary list,
unsupported barrier, or canonical allowlist. Coverage is **104 exact / 0
partial / 0 staged / 172 unsupported**. Next ranked incomplete component
track: `slam-hit-slide-shake` (`MOVE_SECRET_POWER` independently unsupported).
