# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 965 — [bounded MAIN worker, 2026-08-06] #78 residuals 1a-1d bound: switch-out scale-up, send-in emerge, healthbox slide lag, ball-open particles — dense 95/95, command spec 128/128

- **State:** master `9a9c6563`, clean at commit. Typecheck green. Full
  `npm test` + `npm run build` NOT run (cap-killed at the docs gate);
  typecheck + `battle-command-generated-off` **128/128** +
  `mid-battle-switch-dense-a-off` **95/95** are the last verified tiers.
- **Did:** bound §10.5's four residual classes smallest-risk-first, one
  commit each: (1d `d8fd6b41`) healthbox slide keyed off elapsed 66-88 (the
  oracle renders the slide one tick later than the RAM: 110→0 over rendered
  1206-1228) — the 186-1379px healthbox band vanished, leaving only the
  particle + palette classes; (1a `07f632cb`) switch-out scale-up now uses
  the doubled 128px affine box + the `SetBattlerSpriteYOffsetFromYScale`
  feet-anchor y2 formula (var=64-2*13=38, `(var - floor(var<<8/scale))/2`),
  AND the rendered scale lags the §10.1 RAM table by **2 ticks** (the
  gOamMatrices write latches into the OAM matrix table two frames later —
  pixel-fit proved frame N renders §10.1's N-2 value; 813-988px → 46-78px,
  the mon scale-up itself byte-exact); (1c `2209e353`) emerge starts acc 58
  (not 76) + descends via the shared `MATERIALIZE_Y2_TABLE` (now exported)
  + textured OBJ-row ball-blend instead of the flat tint, rendered **1 tick
  behind** the §10.3 RAM table — 1189-1199 byte-exact (was 51-442px);
  (1b `9a9c6563`) recall (1089-1130, base (72,112)) + send-in (1187-1228,
  base (72,123)) ball-open particles via a pure scheduler
  (`midBattleSwitchParticleSchedulesAt`, age = frame-start-2-i, one-tick
  render lag) + the existing Sin/Cos + `sAnim_RegularBall` machinery —
  recall 1091-1099 and send-in 1195-1203 byte-exact.
- **Oracle:** `mid-battle-switch-dense-a-off` **95/95** (unchanged);
  `battle-command-generated-off` **128/128** (switch-route draws gated on
  `sourceDecision.kind === "switch"`, no leak into the GUST resolution).
  Remaining dense residuals (all measured): 1188 27px (emerge first-sliver),
  1200 254px, 1205-1207 25-48px (the pre-existing staged-RATTATA mon
  palette class, PROGRESS 957 side-asset) + 1203-1204 ~30px (particles tail
  + palette).
- **Next:** (1) extend the dense spec's `captureFrames` across 1091-1126 +
  1185-1227 (stage 5) — the committed spec stays 95/95; byte-exact is
  blocked only by the ~25-254px palette class; (2) the 1256-1407
  fight-menu window (out of scope for this step).
- **Notes:** three of the four classes needed a render-lag correction vs the
  doc's RAM tables (healthbox +1, particles +1, switch-out scale +2, emerge
  +1) — the probe reads the register/state the tick it's written, which
  renders one or two frames later; the §10 tables are the RAM state, not the
  rendered frame. PAPERCUT: the §10.2 particle z-order/draw-order and the
  scale-up pixel-fit each cost ~30-40 min of scratch-python forensics the
  doc's RAM-only tables couldn't answer (they had no per-frame rendered
  pixel ground truth).

## 964 — [bounded MAIN worker, 2026-08-06] ball-fade canary regression isolated + already-fixed: 0aeb2fde introduced 82/128, f0b52d7d's gate restores 128/128 — no source change needed, 962/963 corrected

- **State:** master `407635d0`, clean at commit. Typecheck green; smoke
  347/347. Full `npm test` + `npm run build` at session-end gate.
- **Did:** decisively isolated the `battle-command-generated-off` regression
  the supervisor brief attributed to 0aeb2fde — then proved the current tree
  already fixes it, so **no source edit was warranted** (supervisor's 15:10
  "matched-frame set identical before/after the gate" was itself wrong).
  Worktree receipts (app-vs-oracle, all fresh oracle replays): a75c0f3a
  (pre-0aeb2fde baseline) = **128/128**; 0aeb2fde = **82/128** with exactly
  the reported 2124px plateau bbox 42,59-100,111 (frames ~119-135, the
  non-switch GUST resolution's `fadeTick` landing in the recall window);
  27be9ea2 (0aeb2fde descendant) = 82/128, i.e. PROGRESS 962's "pre-existing
  at session-start baseline" claim only checked post-0aeb2fde commits —
  **WRONG**, corrected below. f0b52d7d (the `sourceDecision.kind === "switch"`
  gate) = **128/128**; HEAD = **128/128** and `compare:differential --base
  a75c0f3a` clean 128/128 byte-identical. Gate red-test: reverting JUST the
  gate line at HEAD reproduces the identical 82/128 (same 46 frames, 2124px),
  so the gate is the whole fix — no other leak in 0aeb2fde's touch set.
- **Oracle:** `battle-command-generated-off` **128/128**, differential vs
  a75c0f3a clean; `mid-battle-switch-dense-a-off` **95/95**;
  `fight-menu-chrome-torment-off` **52/57** (same documented 5: 736/766/977
  freeze-boundary + 1100/1200 message-pacing, ISSUES #81). Tier-1 gate pins
  (`tests/battleResolutionPresentation.test.ts` "midBattleSwitchFade gate",
  2) re-red-verified this session (both fail with the gate line stashed).
- **Next:** canary regression closed as already-fixed; per ROADMAP continue
  #80 ranks 2/5/6, RECORD/RETIRE, lobby walkable, 31 tower gfx.
- **Notes:** PAPERCUT: supervisor's 15:10 "identical before/after gate"
  evidence path was wrong (the gate demonstrably flips 82↔128 on the canary);
  the reliable recipe was worktree compare at the four lineage commits + a
  one-line gate revert at HEAD. 963's "re-verified 82/128" line is likewise
  corrected — f0b52d7d is 128/128.

## 963 — [bounded MAIN worker, 2026-08-06] #81 class-4 bounce bind landed: torment spec 11/57 → 52/57 (5 measured residuals remain)

- **State:** master `f0b52d7d`, clean at commit. Typecheck green; smoke
  347/347; `battle-command-generated-off` re-verified **128/128** (was
  misreported below as 82/128 — the 82/128 at 0aeb2fde is this commit's own
  gate's fix, see 964), `mid-battle-switch-dense-a-off`
  **95/95**. Full `npm test` + `npm run build` at session-end gate.
- **Did:** (1) `commandMenuBounceY2(age)` (`battleMenu.ts`) — the
  entry-relative `SpriteCB_BounceEffect` contract (DoBounceEffect seeds 128
  healthbox / 192 mon, `sSinIndex += 7`/frame, `y2 = Sin(index,1)+1`,
  battle_main.c:2899-2937/2967-2979), byte-equivalent to the retired
  `menuIdleBounce(MENU_DRAW_TICK + age)` (battle-1 anchor cancels), wired
  into the generated command menu + resolution confirm-handoff; the torment
  stage seeds `idleBounceElapsed = 7` (1 first-tick reveal + 6 pre-stage
  bounce frames). (2) Fixed the phantom mid-battle ball-fade: it was firing
  on the non-switch GUST resolution at 1100/1200 (fadeTick lands in the
  recall/send-in windows) — now gated on `sourceDecision.kind === "switch"`
  in `createBattleResolutionPresentationRenderView` (1100/1200 dropped
  5022/6313 → 822/648 px). Tier-1 pins:
  `tests/commandMenuBounceY2.test.ts` (two full periods for both bouncers +
  26 oracle-checked seeded ages + unseeded wrong-phase red-verify) +
  phantom-fade gate in `tests/battleResolutionPresentation.test.ts`.
- **Oracle:** `fight-menu-chrome-torment-off` **52/57**. Remaining (all
  measured, doc §8.1): 736 (857px sprite), 766 (1776px healthbox), 977
  (857px sprite — the one regression from green) are 1-frame class-4
  phase-boundary frames: the app's battle-1-calibrated idle-bounce freeze
  model (2-tick fight-opening) ≠ the oracle's own 4-frame opening +
  message + reopen-tail freeze schedule at exactly those transitions (the
  oracle's offset drifts +9/+7/+6 across windows; matching all three needs
  the shared battle-1-pinned freeze constant changed — not done, no
  per-route phases). 1100/1200 (822/648px) are a separate pre-existing
  move-resolution message-typing pacing class (the real printer holds
  "Foe MURKROW used TORMENT!" two lines while the app auto-advances at 1
  glyph/frame).
- **Next:** (1) resolve the 3 freeze-model boundary frames by measuring the
  oracle's real opening/message/reopen freeze schedule dense and re-pinning
  the shared fight-opening constant (battle-1 specs re-verify) — or accept
  as recorded; (2) the 1100/1200 message-pacing class (message-typing rate
  in the move resolution); (3) then per ROADMAP: #80 ranks 2/5/6,
  RECORD/RETIRE, lobby walkable, 31 tower gfx.
- **Notes:** the 3 boundary frames were red-verified against 26
  oracle-checked seeded ages that all pass — the constant entry-phase model
  is right; only the freeze-schedule edges differ. PAPERCUT: reconstructing
  the oracle's bounce phase required dense cross-correlation tooling that
  didn't exist in-tree (the doc's §5.1 misattribution had no per-frame
  measurements) — ~20 min of scratch-python pixel forensics.

## 962 — [bounded MAIN worker, 2026-08-06] #81 torment spec: settled frames byte-exact (11/57) via 3 staging pins; class-4 bounce root-caused to the player healthbox (doc §5.1 misattribution corrected)

- **State:** master `32fc39b4`, clean at commit. Typecheck green; smoke
  347/347. Full `npm test` + `npm run build` NOT run (cap-killed at the
  Stage-3 oracle-reconciliation gate); smoke+typecheck green is the last
  verified tier.
- **Did (stages 1-3 partial):** (1) two appTrace staging one-liners —
  `personality: 150` (male BUTTERFREE, closes the "detail-box type cell" =
  player-healthbox gender glyph) and `pp: [34,35,0,0]` (post-turn-1 TACKLE
  PP, closes the "type-name text" = PP digit). Settled frames dropped
  72px→12px exactly as the doc predicted. (2) Root-caused the 12px "HP-bar
  end cap" to **HP staging, not bar width**: the width derivation is
  byte-exact (RATTATA 105/105→48px→x99 proves it); MURKROW's real oracle HP
  is 119/135 (turn-1 TACKLE = 16, oracle state.parties), so
  `hp:119,maxHp:135` staged → bar 42px → byte-exact. Tier-1 pins
  (calcBarFilledPixels 119/135→42, full→48) + doc §1 correction. (3) Stage 3
  (bounce bind) **reconciled but not landed**: dense oracle diffs prove the
  1776px oscillation is the **player healthbox** (bbox 127-229,74-110),
  NOT MURKROW — the oracle's MURKROW sprite is static every frame; the doc's
  §5.1 "MURKROW y2" table is a misread of the healthbox region. Source: only
  `DoBounceEffect(gActiveBattler, BOUNCE_MON)` runs (player-only, singles);
  the healthbox bouncer (seed 128) is what oscillates. Recorded in doc §8.
- **Oracle:** `fight-menu-chrome-torment-off` 0/57 → **11/57** (all settled
  frames byte-exact; remainder is purely class-4 bounce). Regressions:
  `mid-battle-switch-dense-a-off` **95/95**; `battle-command-generated-off`
  **82/128** — **[CORRECTED in 964: NOT pre-existing. The 27be9ea2/fbf9721c
  worktree checks both postdate 0aeb2fde and inherit its ball-fade regression;
  the true session-start baseline a75c0f3a is 128/128, and f0b52d7d's gate
  restores 128/128.]**
- **Next:** (1) land the class-4 bind per doc §8: derive player-healthbox +
  player-sprite y2 from `idleBounceElapsed` (menu-entry-relative, seeds
  128/192, +7/frame, SpriteCB_BounceEffect contract), do NOT add opponent
  y2; then extend `fight-menu-chrome-torment-off` captureFrames green; (2)
  full `npm test` + `npm run build` gate; (3) per ROADMAP: #80 ranks 2/5/6,
  RECORD/RETIRE, lobby walkable, 31 tower gfx.
- **Notes:** PAPERCUT: the supervisor brief's stage-2 "width derivation" and
  doc §5.1 "both sprites bounce" attributions were both wrong — pixel-sampling
  the oracle before binding would have saved the ~35 min of Stage-3
  re-investigation. [CORRECTED in 964: the claimed battle-command-generated-off
  baseline red (82/128) was NOT pre-existing — it was introduced by the
  0aeb2fde ball-fade bind and already fixed by f0b52d7d's gate.]
