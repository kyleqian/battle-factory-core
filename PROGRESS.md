# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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
## 959 — [bounded MAIN worker, 2026-08-05] ISSUES #80 ranks 1/3/4 landed: in-battle party menu HP bars, real HP/level text, gender glyphs, real WIN_MSG window

- **State:** master `81e2db18`, clean. Typecheck green; full `npm test` **744 files / 7064 passed / 1 skipped** + `npm run build` green; smoke 347/347.
- **Did:** the live party menu now draws the real content on all three cards
  (`battlePartySelect.ts`): (1) graphical HP bars at `sPartyBoxInfoRects`
  positions (right (184,18)/(184,42), left (32,59), 48x3) filled
  `GetScaledHPFraction`-style with the `sHPBar{Green,Yellow,Red}PalIds`
  families (dark 1px over light 2px; >50% green, >20% yellow, else red);
  HP numbers moved to the real rects as `105/`+`/105` white-on-the-HP-box,
  level text split out at the level rect, name/level ink switched to the
  empty-vs-current-selection colors ((57,148,222) vs (123,214,239)); (3)
  gender glyphs from party-menu-gender-glyphs.json at the print-site
  positions (72,44)/(158,20)/(158,44, cellOffsetY 4, oracle-verified male
  (66,206,255)/female (255,156,148) fg+shadow); (4) message strip now uses
  `sDefaultPartyMsgWindowTemplate` (frame (0,128), 21x2, interior
  (8,136)-(176,152)) with the frame1 tiles + party-menu olive corner palette
  and "Choose a POKéMON." at (8,137) — replacing the misplaced
  `drawStandardWindowFrame(0,112,28,4)`.
- **Oracle frame 905 diff: 15267 → 6955 px total** (doc baseline was ONIX;
  acceptance render now stages the fixture's real 3× RATTATA). Bands (rows):
  top 1391→970, slot0 4500→3170, slot1 1998→1295, slot2 3893→2845, message
  6990→813, mid 2386→2002. Message residual = the rank-6 pokeball/CANCEL
  button sprites at x184-234 y134-153 (out of scope); card residuals = the
  rank-2 list-art gap (app still draws the 32x32 party icon).
- **Rank 2 UNBOUND (evidence):** the chrome list art for ONIX
  (`party-menu-chrome.json` listOnix, tick 20070) is COLORED with a dense
  sprite (slot-0 card region ~2818 opaque px, incl. non-ONIX pink/orange
  palette entries and an empty HP bar at that tick), while the field front
  family (`battle-opponent-front-sprites.json` ONIX) is GRAYSCALE
  (palette 222,222,222/255,255,255/247,239,239…) with 1840 opaque px; best
  silhouette overlap vs the chrome art is 1272/1840 (69%) at an off-standard
  offset — shapes and palette do not match, so rank 2 cannot be bound from
  the field asset.
- **Tier-1 pins:** `tests/inbattlePartyMenuVisualBind.test.ts` (4: HP-bar
  geometry + green/yellow thresholds, gender glyph colors/position, HP-text
  on-box + level position, WIN_MSG window geometry + olive frame).
- **Next:** rank 2 front-art (needs a per-species chrome capture pass or a
  colored list-art family, not the grayscale field asset), then ranks 5
  (status/held-item) and 6 (cursor/ball/fade) to close the menu spec.
- **Notes:** fixture mons are RATTATA; a parallel side worker owns the
  RATTATA sprite-palette asset gap (not chased here).

---

## 958 — [bounded MAIN worker, 2026-08-05] ISSUES #81 live Torment selection-rejection message phase landed; dense spec gated on pre-existing fight-menu chrome residuals

- **[Supervisor 19:20 — the "48px residual" class is CLOSED, spec committed:**
  pixel-sampling (inspect-frame clusters) showed the mid-battle-switch
  fixture's two 24px clusters are the **healthbox gender glyphs** at
  (52,21)/(174,79) — oracle actives ♂ (fg 66,206,255), app staged ♀ by
  personality default. NOT a RATTATA sprite-palette gap (956's attribution)
  and NOT a move-target arrow (this entry's y21-28 x55-59 item is the same
  gender class on the torment fixture's MURKROW). Fix: `personality: 150`
  (male, HARDY bits) pinned on `RATTATA_LV50` + `MURKROW_TORMENT_LV50` in
  `appTrace.ts`; **`mid-battle-switch-dense-a-off` spec committed 84/84**
  (1035-1090 recall + 1228-1255 settled-send-in, byte-exact; typecheck +
  smoke green). Side R4 (palette-fix brief) was cap-killed 0-commit chasing
  the wrong attribution — lesson: sample diff pixels before briefing on a
  worker's residual attribution. #78's remaining un-green spans re-listed in
  ISSUES (#78): ball fade, party-summary panel, fight-menu chrome/highlight.**]**
- **State:** master `7165ff5e`, clean. Typecheck green; full `npm test`
  **743 files / 7060 passed / 1 skipped** + `npm run build` green.
  `battle-command-generated-off` regression **128/128**; presentation/
  voluntary-switch/rejection suites green.
- **Did:** the live fight-menu now enters a rejection-message phase when the
  player confirms a slot whose `rejectionReasonBySlot` entry is non-null
  (Torment = acceptance vehicle): resolver's two lines type **1 glyph/frame
  from +3**, hold **button-gated** (`\p` PAUSE_UNTIL_PRESS, no auto-advance)
  with the wait ▼ bobbing from +66 (`CURSOR_Y_OFFSETS[age/9%4]`), and on
  **A or B** dismiss the fully-typed box freezes with the cursor held at its
  dismiss pose for **9 frames** before the move menu redraws byte-identical,
  cursor unchanged. Reuses `drawBattleMessageTextLines`/`drawCursor`/the
  battle-window tilemap — no new printer. Tier-1 pins:
  `tests/factoryTormentSelectionRejectionLive.test.ts` (7, red-verified on
  the +3 and +9 constants). App stage for
  `mechanic-selection-reject-torment-off.json` installed at the turn-2
  checkpoint (frame 734, player pre-Tormented + TACKLE last move).
- **Dense probe (scratch spec over the doc's window, 145 frames):** the
  message box + text region renders byte-exact — the frozen-box frame 977 and
  the GUST resolution 1050 both diff only **60px** (whole-frame), all inside
  three **pre-existing fight-menu chrome residual classes** (same family as
  the mid-battle-switch fixture's documented 48px, not this flow): the
  ~24px **pink-vs-cyan move-target arrow** baked in the static fight-submenu
  harvest (bbox y21-28 x55-59), the **detail-box type cell** ~28px
  (y80-87 x184-199), and the **type-name text** ~24px (y120-135 x205-215);
  plus the **unmodeled A-press highlight** state (~1776px bbox y74-110
  x127-229 at 766-769/987-1000) and the app's sprite-bounce phase vs the
  oracle's static move-menu sprites (up to ~950px at menu-idle frames). No
  full-frame byte-exact span → **no spec committed** (run's no-red-commits
  convention); ISSUES #81 trimmed to the spec-only remainder.
- **Next:** a fight-menu-chrome pass (target-arrow palette + detail-box/type
  cell + A-press highlight + move-menu bounce freeze) to close the dense
  window, then the `torment-selection-rejection-off` ground-truth spec; then
  #80 party-menu visuals.
- **Notes:** `PAPERCUT`: multi-round pixel-archaeology on the oracle's
  A-press-highlight/move-detail-box layout cost ~30 min before the
  pre-existing-chrome attribution was confirmed; the scratch spec's segments/
  captureFrames are in git history if that pass wants to re-probe.

---
