# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 963 — [bounded MAIN worker, 2026-08-06] #81 class-4 bounce bind landed: torment spec 11/57 → 52/57 (5 measured residuals remain)

- **State:** master `f0b52d7d`, clean at commit. Typecheck green; smoke
  347/347; `battle-command-generated-off` re-verified **82/128** (exact same
  matched-frame set — no regression), `mid-battle-switch-dense-a-off`
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
  **82/128** — pre-existing red at session-start baseline too (verified at
  27be9ea2 and fbf9721c via worktrees), NOT caused by this work.
- **Next:** (1) land the class-4 bind per doc §8: derive player-healthbox +
  player-sprite y2 from `idleBounceElapsed` (menu-entry-relative, seeds
  128/192, +7/frame, SpriteCB_BounceEffect contract), do NOT add opponent
  y2; then extend `fight-menu-chrome-torment-off` captureFrames green; (2)
  full `npm test` + `npm run build` gate; (3) per ROADMAP: #80 ranks 2/5/6,
  RECORD/RETIRE, lobby walkable, 31 tower gfx.
- **Notes:** PAPERCUT: the supervisor brief's stage-2 "width derivation" and
  doc §5.1 "both sprites bounce" attributions were both wrong — pixel-sampling
  the oracle before binding would have saved the ~35 min of Stage-3
  re-investigation. battle-command-generated-off baseline red (82/128) is a
  separate pre-existing debt worth a supervisor look.

## 961 — [bounded MAIN worker, 2026-08-06] ISSUES #78 residual (1): ball-fade bind landed (field byte-exact, mon-sprite residuals measured)

- **State:** master `0aeb2fde`, clean at commit. Typecheck green; smoke
  347/347; committed spec `mid-battle-switch-dense-a-off` re-verified **95/95**
  (fade windows were never in it, so it is unchanged). Full `npm test` +
  build pending at session end.
- **Did:** ported the white ball-fade mechanism into the voluntary-switch
  resolution presentation — a monotonic `fadeTick` clock (0 = the null-handoff
  confirm phase's first render = staged trace frame 1035, bumped once per
  resolution frame) keys `midBattleSwitchFadeAt(traceFrame)` to the real
  timeline across the multi-command windows. The projection reproduces
  `BeginNormalPaletteFade` stepping (deltaY=2, BG re-blend on BG-toggle frames,
  `softwareFadeFinishing` plateau, both §8.3 stolen ticks) plus the
  `Task_FadeMon_ToBallColor` ramp, with the oracle's measured one-frame render
  lag behind the §8.3 tables (`rendered bg = y[N-2]`, pixel-verified). The
  scene renderer now blends `battleBg.palette` rows 0/1 (hardware banks 2/3 =
  the `0xe` mask rows actually drawn) toward `RGB_WHITE` and the player mon's
  palette toward `gBallOpenFadeColors[BALL_POKE]` (0x7ADF); message window +
  both healthboxes stay unfaded. Tier-1 pin
  `tests/midBattleSwitchBallFade.test.ts` (7: full recall/send-in coefficient
  sequences + §8.4 blend arithmetic).
- **Oracle (fade windows, `--capture-range`):** the field BG is now byte-exact
  across 1091-1126 (was ~16k px at the plateau 1105-1109) and across the
  send-in window's field — the residual classes left are **pre-existing
  mon-sprite rendering**, not the fade: (a) switch-out affine scale-up
  1101-1112, 172-935 px, bbox 49,74-95,111 — the app's scaled sprite is
  smaller + higher than the oracle's; (b) a recall sparkle/shadow + mon
  bottom-edge class 1091-1100 (7-59 px) and 1113-1126 (47-96 px, oracle shows
  (255,173,0) ball-open particles + whiter field at the mon's feet); (c)
  send-in emerge 1188-1200 (90-616 px, app flat-tints while oracle shows the
  ball-colored textured sprite, anchored lower); (d) 1207-1227 healthbox-slide
  / settle (211-1379 px). None were covered by the committed spec, so the
  spec was NOT extended (fade-window frames are not byte-exact until (a)-(d)
  land) — recorded as ISSUES #78's new remainder.
- **Next:** (1) fix the switch-out affine scale-up sampling + the recall
  ball-open sparkle/shadow, then extend `mid-battle-switch-dense-a-off`
  captureFrames across 1091-1126 and the §8.3 send-in window byte-exact; (2)
  then #78's fight-menu chrome pass (target arrow / type cell / type-name /
  A-press highlight / sprite bounce); (3) #80 ranks 2/5/6; (4) RECORD/RETIRE
  per `docs/postwin-record-retire-ground-truth.md` §5; (5) lobby walkable +
  REST guard; (6) 31 tower overworld gfx debt.
- **Notes:** measured the one-frame render lag empirically (the §8.3 tables
  are per-tick STATE; the oracle's rendered frame lags one tick). The
  healthbox (opponent OBJ at top-left, FRAME_ORIGIN (12,14)) is a tan/green
  sprite — earlier "field tan/green" misreads were the healthbox, not the
  field BG. PAPERCUT: the battle-bg palette is compact local indices (hardware
  banks 2/3/4), so the `0xe` mask maps to rows 0/1 only, row 2 stays.
  ## 960 — [supervisor WIND-DOWN, 2026-08-05] Session summary: 10 workers / 5 rounds — #78 seam+slice-4+spec, #81 live flow, #80 ranks 1/3/4, LILIANA sprite + WIN 903/903, two animation folds

- **State:** master at this entry's commit, clean. Final independent union
  verification: full `npm test` **748 files / 7083 passed / 1 skipped**
  (+56 tests today), `npm run build` green. `animation-main` folded TWICE:
  at orient (fast-forward — WRAP 115/276 + MUDDY_WATER) and at wind-down
  (`dfdf86eb` — ROCK_THROW + REFRESH, **116/276 exact**); the sibling
  animation supervisor was live mid-GRASS_WHISTLE at wind-down, so
  animation-main may gain commits after this fold — next session folds at
  orient per protocol. No worker worktrees/branches left (play-preview stays
  pinned at `974ef563` per user directive). DEFERRED.md: no open entries.
  Oracle-freshness FAIL at orient was again the documented docs-only false
  positive (only `_template`/NOTES harness commits since oracle start).
- **Did (10 workers: 5 main, 5 side; 1 side cap-kill, rest landed):**
  MAIN — (955) #78 dense-compare app stage + the seam blocker finding (live
  voluntary switch dropped kernel events); (956) voluntary-switch seam +
  party-menu close cadence; (957) slice 4: recall 82f hold + return-to-ball
  scale-up + a masked visibility-restore fix; (958) #81 live rejection
  message flow (+3f/1-glyph, `\p` button-gated hold, 9f byte-identical
  reopen); (959) #80 ranks 1/3/4 (HP bars, gender glyphs, real WIN_MSG
  window) — party-menu frame-905 diff **15267 → 6955 px**, rank 2 unbound
  with evidence (field front family is grayscale; needs a colored list-art
  decision). SIDE — LILIANA walk-in via `SetBattleFacilityTrainerGfxId` port
  (GIRL_3) + canonical WIN window **232 → 903/903** to fixture end 11308;
  #80 content assets (status/held-item/gender glyphs/coords, 15 pins);
  #81 Torment ground truth (152/152 twice-run fixture, `\p` hold, 10f
  reopen); ball-fade §8 (coefficient model reproduces RAM **144/144**) +
  party-summary §9 headline: the real game draws **NO player tray** on this
  route (`skipPlayer=1`) — the app's tray is overdraw. SUPERVISOR — the
  "48px residual" was pixel-sampled to be the healthbox GENDER glyphs
  (staged actives defaulted female; oracle male); `personality: 150` pinned
  in both app stages and the **`mid-battle-switch-dense-a-off` spec
  committed 84/84** (`fd069c5b`).
- **Next (ordered):** (1) close #78: drop the player-tray overdraw (§9.4)
  + apply §8 fade coefficients → extend the dense spec across 1091-1227;
  (2) #81 spec via the fight-menu chrome pass (A-press highlight, detail-box
  type cell, move-menu bounce freeze — classes listed in 958); (3) #80
  ranks 2/5/6 (rank 2 needs the colored list-art family decision); (4)
  RECORD/RETIRE binds per `docs/postwin-record-retire-ground-truth.md` §5;
  (5) lobby walkable + REST guard; (6) 31 tower overworld gfx sheets asset
  debt (`battleRoomRender.ts` fallback list).
- **Notes:** side R4 cap-killed 0-commit chasing a wrong residual
  attribution — lesson recorded: pixel-sample diffs before briefing on a
  worker's attribution. PAPERCUTS gained the battle-lab→compare wrapper
  entry (3 hand-conversions of the same fixture in one day).
- **[Post-wind-down addendum, 20:45:** one more 30-min-capped worker landed
  `032a03b2` — the §9.4 player-tray overdraw drop (surgical battler-0 gate
  in `battleResolutionPresentationRender.ts`, source-cited) — then was
  cap-killed at its own full-suite gate; supervisor salvage-verified: spec
  rerun **95/95** (1127-1138 now byte-exact), typecheck + smoke 347/347 +
  seam/presentation 37/37 green, and an independent full `npm test`
  **748 files / 7084 passed / 1 skipped** + `npm run build` green on the
  final tree. #78's remainder is now ball fade (§8 bind) + fight-menu
  chrome only.**]**
