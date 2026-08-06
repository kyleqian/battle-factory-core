# Animation coverage

## MOVE_REFRESH closed — 209/209 both orientations twice-fresh, promoted to exact (2026-08-05 closure worker)

- **State:** REFRESH (new move) → **exact**. Move coverage: **117/276 exact,
  0 partial, 0 staged, 159 unsupported**. Both fixtures pin `framebufferMatching: 209`.
- **Did:** closed the already-implemented MOVE_REFRESH unit without re-investigating
  the 209/209 renderer. Added `refresh.test.ts` (7 Tier-1 reducer tests: BG1
  mask window/scroll/eva, delay-8 star spawns + x-only mirror, BG-vs-attacker
  five-frame blend steps, displayed BG-immediacy/OBJ-lag latch, thin-ring scale,
  visual-task counts, typed seam) and `refreshEvidence.test.ts` (2 receipt/source
  pins: windows 515-723 / 519-727, CHANSEY 287×4 vs ONIX 92×4, lifecycle
  counts). Re-ran the named exact portable controls once each: SYNTHESIS
  130/130 and MILK_DRINK 186/186 component+framebuffer clean; AROMATHERAPY
  400/400 framebuffer identity held but its probe evidence hash drifted
  (receipt-only, raw RGB unchanged) — pins left untouched, see report.
- **Measured:** player-back frames 515-723 and opponent-front frames 519-727,
  both **209/209 source-component and shared-framebuffer exact twice fresh**.
  Evidence `35ede52e…` / `8f27ac49…`, RGB `d35ee921…` / `bd2ba9fa…` reproduce
  the fixture pins exactly on every fresh portable run. Coverage JSON + ledger
  promoted REFRESH only; no component credit, no sibling promotion.
- **Verified:** supervisor independently re-ran both portables at 209/209,
  focused tests at 18/18, `npm run animation:coverage` at 117/276 exact,
  the full suite at 743/743 files (7,046 passed, 1 skipped), and the production
  build. All pre-existing tracked scratch diagnostics were preserved.
- **Next:** continue the staged zero-new-component `MOVE_GRASS_WHISTLE` unit:
  isolate `Move_GRASS_WHISTLE` by script pointer from the following sleep-status
  animation, then prove the rainbow tasks/green BG blend and build the portable.
- **Notes:** AROMATHERAPY receipt drift: new evidence `cec76eae360c…`, pinned
  `83f9f2d03fb0…`; raw RGB
  unchanged at `dc02bff98836…` — framebuffer identity required and met.
  GRASS_WHISTLE now has legal ROSELIA-171/ONIX scenarios and a partial probe in
  both orientations (458 current-move frames, 316 animation-active, 12 notes);
  it remains unsupported and must not be promoted from this combined window.

## MOVE_ROCK_THROW closed — 87/87 both orientations twice-fresh, promoted to exact (2026-08-05 worker)

- **State:** ROCK_THROW (new move) → **exact**. Move coverage: **116/276 exact,
  0 partial, 0 staged, 160 unsupported**. Both fixtures pin
  `framebufferMatching: 87` with status `exact`.
- **Did:** finished the staged Level-50 ROCK_THROW unit. The sole eligible
  carrier is FRONTIER_MON_GRAVELER_1 record 166 (GRAVELER, all four slots move
  88) vs legal ONIX; zero new source components — `Move_ROCK_THROW`
  (battle_anim_scripts.s:2098) reuses the shared
  `gFallingRockSpriteTemplate`/`AnimFallingRock`/`TranslateSpriteInEllipse`
  falling-rock body (the ROCK_SLIDE component), the `shake_mon_or_platform`
  BG3-Y shake, and `AnimTask_ShakeMon(ANIM_TARGET,0,5,20,1)`. Kept the
  committed reducer, scenarios, probe, portable, and two fixtures; corrected
  the reducer + fixture profiles + portable oracle-side derivation from dense
  RGB evidence (see Notes), then added `rockThrow.test.ts` (8 Tier-1 tests:
  rock table/stride, BG-Y sequence, spawn/lifetime geometry pinned to oracle,
  measured target-shake boundary) and `rockThrowEvidence.test.ts` (receipt
  pins). Updated `factoryAnimationInventory.test.ts` 115→116 / 161→160.
- **Measured:** player-back frames 296-382 and opponent-front frames 296-382,
  both **87/87 source-component and shared-framebuffer exact twice fresh**
  (semantic identity also 87/87 each run). Evidence `9a7fa756…` /
  `3dc82aad…`, RGB `773f4366…` / `e2592ba2…` reproduce the fixture pins
  exactly on every fresh portable run. The dense exact MOVE_ROCK_SLIDE control
  fixture `rock-slide-grovyle-onix.json` re-ran 175/175 twice fresh (probe
  `984fe6c1…`).
- **Next:** continue the zero-new-component Level-50 ladder from the ranked
  coverage report.
- **Notes:** the capped investigation's remaining mismatch was the target ONIX
  display shake/idle residual, and its staged profile values were hypotheses.
  A dense RGB scan (debug script, since removed) derived the true displayed
  target x2/y2 directly for both orientations: the framebuffer shows +5 at
  display ages 21, 24-25, 28-29, …, 56-57 — a lead frame at 21 then 2-on-2-off
  pairs, i.e. `(age-21)%4 ∈ {0,3}` over [21,57] — NOT the staged 22..55 or
  default 24..57 windows; and the opponent-front ONIX idle-bob x2=+1 drops to
  0 at display age 21, one frame behind its RAM write. The portable's
  oracle-side derivation now uses this RGB-verified latch (y2 lead at
  `targetShakeStartAge`, x2 from RAM one frame back). No boundary widening, no
  new unsupported barriers; ROCK_THROW is a sibling acceptance and shares no
  move credit.

## MOVE_WRAP closed — 38/38 both orientations twice-fresh, promoted to exact (2026-08-05 worker)

- **State:** WRAP (new move) → **exact**. Move coverage: **115/276 exact, 0
  partial, 0 staged, 161 unsupported**. Both fixtures pin
  `framebufferMatching: 38` with status `exact`.
- **Did:** full new-move acceptance on the shared BindWrap track with the
  already-exact MOVE_BIND control. `Move_WRAP` (battle_anim_scripts.s:7130)
  is `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER,6,4,2,4)` +
  `goto BindWrap` (SE_M_BIND + two `BindWrapSqueezeTarget`
  `AnimTask_ScaleMonAndRestore(10,-5,5)` calls + waitforvisualfinish + end).
  Landed the reducer (`src/animation/wrap.ts`) reusing bind.ts's shared
  `scaleMonAndRestoreAtAge`: the ellipse runs 32 steps (wavePeriod 16, two
  loops, origin at steps 0/16, final-step origin reset at 31) with the
  source's RespectSide opponent width negation before signed Q8.8 rounding,
  and the two squeezes at probe-measured starts [1,19]. Added
  `SceneOnWrapConfig/View` + `sceneOnWrapView` seam, the `battleScene.ts`
  draw case (TENTACOOL back/front over affine-stretched ONIX target with the
  ONIX front idle residual x2=1, side-correct healthboxes/text), the two
  mechanic scenarios (FRONTIER_MON_TENTACOOL record 124, all four slots
  WRAP, vs legal ONIX — the carrier/species/side audited in the generated
  mons data), `wrapProbe.py` (dense, ellipse+squeeze task lifecycles,
  battler sprite records, RGB), `wrapPortable.ts`, the two
  scene-on-portable-evidence/v1 fixtures, and `wrap.test.ts` +
  `wrapEvidence.test.ts`.
- **Measured:** player-back frames 222-259 and opponent-front frames 78-115,
  both **38/38 source-component and shared-framebuffer exact twice fresh**
  (semantic identity also 38/38 each run). Evidence `0220a498…` /
  `62037408…`, RGB `cc7ca56f…` / `39d3acfc…` reproduce the fixture pins
  exactly on every fresh portable run.
- **Next:** continue the zero-new-component Level-50 ladder from the ranked
  coverage report.
- **Notes:** WRAP is a **sibling move acceptance** — sharing the BIND
  squeeze/scale-and-restore component accepts no other move. BIND remains
  exact (45/45 both orientations) as the control. Two diagnosis corrections
  during fitting: (1) the gender symbol color/position mismatch was the
  wrong fixture gender (personality rule is `ratio > (pid&0xFF) ? female :
  male`, so pid-low 0xa0 ONIX is male, blue ♂), and (2) the player/opponent
  healthbox HP fields must key off the healthbox position, not the attacking
  side. `factoryAnimationInventory.test.ts` summary pin moved 114→115 /
  162→161 with the promotion. No boundary widening, no new unsupported
  barriers.

## Supervisor wind-down — four Level-50 moves exact; animation-main green (2026-08-05)

- **State:** coverage advanced **110→114/276 exact** with no partial or staged
  moves and **162 unsupported**. This branch is folded through master
  `edb54320` and contains no live animation worker worktrees or branches.
- **Did:** independently reviewed, dense-replayed, and merged MOVE_METAL_CLAW,
  MOVE_AGILITY, MOVE_BULK_UP, and MOVE_MUDDY_WATER. Each move is exact in both
  orientations twice fresh; the source-component/shared-framebuffer windows
  are respectively 140/140, 87/87, 104/104, and 144/144. The SURF control also
  remained 144/144 in both orientations twice after the muddy sibling port.
- **Verified:** integrated `npm test` — **737 files passed, 7020 tests passed,
  1 established skip**; integrated `npm run build` — green. Final coverage
  report: **114 exact, 0 partial, 0 staged, 162 unsupported**.
- **Next:** resume the zero-new-component Level-50 ladder from the ranked
  coverage report, one bounded move acceptance at a time.
- **Notes:** no new unsupported barriers, controller ownership, battle-state
  ownership, or animation deferrals. AGILITY's initially reported opponent
  mismatch was stale probe field-profile data plus the established
  species-relative terrain cutoff, corrected before acceptance.

## MOVE_MUDDY_WATER closed — 144/144 both orientations twice-fresh, promoted to exact (2026-08-05 afternoon session)

- **State:** MUDDY_WATER (new move) → **exact**. Move coverage: **114/276
  exact, 0 partial, 0 staged, 162 unsupported**. Both fixtures pin
  `framebufferMatching: 144` with status `exact`.
- **Did:** full new-move acceptance reusing the already-exact
  `create_surf_wave` component (the surfWave source audit already recorded
  this distinct sibling). `Move_MUDDY_WATER` (battle_anim_scripts.s:8601)
  is `panse SE_M_WHIRLPOOL attacker→target +2,0` followed by
  `create_surf_wave palette=ANIM_SURF_PAL_MUDDY_WATER` + wait + end.
  Generalized `surfWaveAtAge` to take a `palette` param — the muddy variant
  keeps the identical wave/scanline/BG1 body, swaps the water palette, plays
  the SE_M_WHIRLPOOL pan sweep from age 1 (player -64→+63, opponent +63→-63,
  ±2/age, terminal one step earlier on the opponent side; track flags drop to
  128 and the sound finishes at 122), and shows the origin scroll at age 4 on
  the player side (the pre-wave panse shifts the initial BG write one display
  later). Staged two complete legal mechanicLab parties
  (FRONTIER_MON_MARSHTOMP_2 set 295, all four slots MUDDY_WATER, vs legal
  ONIX — the only Factory MUDDY_WATER carrier, confirmed in the generated
  mons data). Added MARSHTOMP back/front art to surf-wave.json via the
  extended extractor, `muddyWaterProbe.py` (dense, SE_M_WHIRLPOOL + battler
  RAM field profile), `muddyWaterPortable.ts`, the two
  scene-on-portable-evidence fixtures, and `muddyWater.test.ts` (5 Tier-1
  tests). The Scene-ON seam and battleScene.ts draw case were generalized to
  both moves (muddy palette + MARSHTOMP/ONIX art + `MUDDY WATER!` text; the
  ONIX target keeps its established opponent-front idle x2=+1).
- **Measured:** player-back frames 80-223 and opponent-front frames 84-227,
  both **144/144 source-component and shared-framebuffer exact twice fresh**
  (semantic identity also 144/144 each run). Evidence `4e330cc3…` /
  `f99e8df2…`, RGB `c527751a…` / `1167773f…` reproduce the fixture pins
  exactly. Field profiles from fresh battler RAM: MARSHTOMP 145/145 vs ONIX
  142/142 (both orientations, full HP and stat-neutral at the first dense
  frame).
- **Next:** continue the zero-new-component Level-50 ladder.
- **Notes:** MUDDY_WATER is a **sibling move acceptance** — sharing the
  surfWave reducer/tilemap/draw accepts no other move (SECRET_POWER's
  Factory building dispatch keeps Move_STRENGTH). SURF remains exact at
  144/144 (the generalized reducer defaults to the surf palette; surf
  tests unchanged). `factoryAnimationInventory.test.ts` summary pin moved
  113→114 / 163→162 with the promotion. No boundary widening, no new
  unsupported barriers. The opponent pan sweep reaching its terminal one
  step earlier than the player is a real source consequence of the
  ±(64→63) vs ±(63→-63) ranges, not a fitting.

## MOVE_BULK_UP closed — 104/104 both orientations twice-fresh, promoted to exact (2026-08-05 midday session)

- **State:** BULK_UP (new move) → **exact**. Move coverage: **113/276 exact, 0
  partial, 0 staged, 163 unsupported**. Both fixtures pin `framebufferMatching:
  104` with status `exact`.
- **Did:** full new-move acceptance with **zero new source components**.
  `Move_BULK_UP` (battle_anim_scripts.s:4390) is exactly the already-exact
  `Move_SWAGGER` prefix — ANIM_TAG_BREATH, AnimTask_GrowAndShrink,
  playsewithpan SE_M_SWAGGER, wait, gBreathPuffSpriteTemplate, loopsewithpan
  SE_M_SWAGGER 4,2, wait, end. The reducer (`src/animation/bulkUp.ts`) reuses
  `swaggerGrowAndShrinkAtAge`, `swaggerBreathAtAge`, and a newly generalized
  `growAndShrinkY2AtAge` (battle_anim_mons.c `SetBattlerSpriteYOffsetFromYScale`)
  with the legal carrier's 64−2·7=50 picture height; the draw reuses the shared
  SWAGGER breath asset. Staged two complete legal mechanicLab parties
  (PRIMEAPE set 337 all-slot BULK_UP vs ONIX TACKLE, both orientations —
  independently confirmed the lowest BULK_UP Factory carrier from the generated
  mons data). `bulkUpProbe.py` dense 72-175 / 76-179, `bulkUpPortable.ts`,
  `extractBulkUpAssets.ts` (Primeape back/front only; breath shared), the two
  scene-on-portable-evidence/v1 fixtures, and `bulkUp.test.ts` +
  `bulkUpEvidence.test.ts`.
- **Measured:** player-back frames 72-175 and opponent-front frames 76-179,
  both **104/104 source-component and shared-framebuffer exact twice fresh**
  (semantic identity also 104/104 each run). Evidence `2fb724ec…` /
  `fa85b2f3…`, RGB `b5c127f2…` / `8f2d4c93…` reproduce the fixture pins exactly.
  Field profiles from fresh battler RAM: PRIMEAPE 158/158 vs ONIX 117/117
  (player-back) and ONIX 128/128 vs PRIMEAPE 158/158 (opponent-front), all
  full-HP and stat-neutral at the first dense frame.
- **Next:** continue the zero-new-component Level-50 ladder.
- **Notes:** BULK_UP is a **sibling move acceptance** — sharing the SWAGGER
  grow/breath reducers accepts no other move (GROWTH and friends keep their own
  bodies/evidence). `factoryAnimationInventory.test.ts` summary pin moved
  112→113 / 164→163 with the promotion. No boundary widening, no new unsupported
  barriers. Primeape opponent-front carries no idle-bob residual (x2=0), so the
  draw needs no front idle offset for the attacker; the Onix target keeps its
  established opponent-front x2=1.

## MOVE_AGILITY closed — 87/87 both orientations twice-fresh, promoted to exact (2026-08-05 morning session)

- **State:** AGILITY (new move) → **exact**. Coverage is **112/276 exact, 0
  partial, 0 staged, 164 unsupported**. Both fixtures pin 87/87 framebuffer
  identity through first inactive cleanup.
- **Did:** ported the full source body for sole Level-50 carrier
  FRONTIER_MON_LEDYBA record 40: monbg, alpha 12/8,
  TranslateMonEllipticalRespectSide(24,6,4,4), TraceMonBlended(0,4,7,10), five
  SE_M_DOUBLE_TEAM restarts, clone allocator/OAM overlap order, cleanup, and
  delay 1. Added the pure reducer, typed Scene-ON seam and draw case, two legal
  LEDYBA/ONIX scenarios, dense probe/portable fixtures, and reducer/evidence
  Tier-1 tests.
- **Measured:** player-back frames 217-303 reproduce evidence `6913b732…` /
  RGB `f8633f41…`; opponent-front frames 218-304 reproduce `9f8a7cfb…` /
  `50df74b1…`. Both are 87/87 semantic, raw-RGB, and shared-framebuffer exact
  twice fresh.
- **Next:** continue the zero-new-component Level-50 ladder.
- **Notes:** supervisor review corrected the worker's false field-artifact
  diagnosis: 85/86 pixels were stale field-profile values (probe RAM is ONIX
  128/128 and LEDYBA 102/122 after Tackle); the last pixel required the already
  established species-relative opponent terrain cutoff (`spriteCorner.y + 55`,
  y=75 for LEDYBA). No boundary widening or new unsupported barrier.

## MOVE_METAL_CLAW closed — 140/140 both orientations twice-fresh, promoted to exact (2026-08-05 morning session)

- **State:** METAL_CLAW (new move) → **exact**. Move coverage: **111/276 exact,
  0 partial, 0 staged, 165 unsupported**. Both fixtures pin
  `framebufferMatching: 140` with status `exact`.
- **Did:** full new-move acceptance reusing only established source-faithful
  components — non-permanent `metallic_shine` (accepted HARDEN body), the
  6×4 `gHorizontalLungeSpriteTemplate`, the `create_claw_slash_sprite`
  5-frame art/callback, and `shake_mon_or_platform -4,1,10,SHAKE_MON_Y`. The
  script is `loopsewithpan SE_M_HARDEN` + shine → wait → two strikes, each a
  lunge, a delay-2 SE_M_RAZOR_WIND, a mirrored claw-slash pair at the
  target's `BATTLER_COORD_X_2/Y_PIC_OFFSET` ±10, and the target shake.
  Landed the reducer (`src/animation/metalClaw.ts`): shine at ages 0..95,
  first lunge tick 98, first slashes+shake at 103, second lunge tick 112,
  second mirrored slashes+shake at 117, 21-frame slash lifetime, and the
  11-frame pairwise `gSpriteCoordOffsetY` pattern [0,4,4,0,0,4,4,0,0,4,0].
  Added the typed `SceneOnMetalClawConfig/View` + `sceneOnMetalClawView`
  seam, the `battleScene.ts` draw case (grayscale attacker + masked metal
  sweep, lunged attacker, shaken ONIX, both claw-slash groups), the two
  mechanic scenarios (FRONTIER_MON_CHARMANDER record 88, all four slots
  METAL_CLAW, vs legal ONIX), `metalClawProbe.py` (dense 227-366/229-368,
  metallic + loop-SE tasks, claw/lunge/shake sprite families, registers,
  palettes, hardware OAM, se1 audio, RGB), `metalClawPortable.ts`, the two
  scene-on-portable-evidence/v1 fixtures, and `metalClaw.test.ts` +
  `metalClawEvidence.test.ts`. No new art: CHARMANDER back/front from the
  shared battle-back/opponent-front assets, claw-slash art reused from
  dragon-claw.json.
- **Measured:** player-back frames 227-366 and opponent-front frames 229-368,
  both **140/140 twice fresh** via the portable (reducer-vs-oracle lunge /
  shake / slash semantic identity also 140/140 each run). Evidence
  `db095360…`/`21a1e2ae…`, RGB `55859416…`/`0ff639d1…` reproduce the fixture
  pins exactly. **Pipeline facts:** the claw-slash sprite spawns at the
  target's `BATTLER_COORD_Y_PIC_OFFSET`, which for a player-back target is
  the OAM centre +8 (ONIX player-back = 88, not 80 — this is why the
  ironDefense-opponent fixture's `animationCenter {72,80}` was never
  position-sensitive for that move). The two strikes' slash groups overlap
  for 7 frames (the first group's 21-frame lifetime spans the second
  strike's spawn), and the shake coordinate alternates in pairs (not
  alternating single frames as the DRAGON_CLAW shake's own probe-derived
  table does).
- **Next:** continue the zero-new-component Level-50 ladder (17 remain).
- **Notes:** the damage/HP bar resolution happens after the animation window
  (opponent stays 110/110 throughout), so the field profile carries the
  pre-drain HP as an immutable input. No boundary widening, no new
  unsupported barriers. `factoryAnimationInventory.test.ts` summary pin
  moved 110→111 / 166→165 with the promotion.

## Supervisor wind-down — three moves promoted in one session: STEEL_WING, TAIL_WHIP, IRON_DEFENSE (2026-08-04 evening session)

- **State:** move coverage went **107 exact / 1 partial → 110/276 exact, 0
  partial, 0 staged, 166 unsupported** across three verified DeepSeek rounds.
  `animation-main` is committed and green: wind-down full suite **725 files /
  6,940 passed / 1 skipped**, build green, coverage validator green, no worker
  worktrees or branches left. Session baseline was the fast-forwarded master
  fold (0bbefdda), suite 721/6,927.
- **Did:** (R1) STEEL_WING partial→exact — worker hit the 60-min cap with all
  edits complete but uncommitted; supervisor salvaged, re-verified fresh
  (197/197 both orientations, hashes reproduce), wrote the ledger entry, and
  committed. Two diagnosis corrections landed: ages 144-155 were gust-overlap
  **draw order** (palette-fade hypothesis disproved by probe), 181-185 the Q8.8
  slide-out terminal 23. (R2) TAIL_WHIP new-move exact, 77/77 both
  orientations twice-fresh; new pipeline fact: elliptical-task battler offsets
  render **two** displays behind the dense index (vs. the one-display send-out
  latch). (R3) IRON_DEFENSE new-move exact, 101/101 both orientations
  twice-fresh; `AnimComplexPaletteBlend` BG-only white pulse transcribed with
  displayed 8/9/10-frame asymmetry. Every round independently re-verified by
  supervisor fresh portable runs before merging.
- **For the main program:** three coverage promotions moved the
  `factoryAnimationInventory.test.ts` summary pin (now 110 exact / 166
  unsupported) — the fold should expect that file to move with every
  promotion. R1's salvage briefly left `animation-main` full-suite-red on
  exactly that pin (caught and repinned in R2); supervisor-side lesson
  recorded: post-promotion verification must include the inventory pin, not
  only smoke+focused.
- **Next:** continue the zero-new-component Level-50 ladder (18 moves remain
  after this session — cheapest next: METAL_CLAW carrier CHARMANDER record
  88, AGILITY carrier LEDYBA record 40; supervisor analysis joins
  ANIMATION_COVERAGE.json exact entries against
  `battle-animation-components.json`).
- **Notes:** R2's coverage promotion rewrote `ANIMATION_COVERAGE.json`
  wholesale (unicode-escape normalization; verified semantically lossless —
  exactly one entry added, all others parse-identical), so blame on that file
  resets at ff5f0bb7. Worker rounds cost ~$0.15-0.18 each at 40-60 min wall.
  Oracle-freshness FAIL at session start was again the docs-only false
  positive (single NOTES.md harness commit).

## MOVE_IRON_DEFENSE closed — 101/101 both orientations twice-fresh, promoted to exact (2026-08-04 evening)

- **State:** IRON_DEFENSE (new move) → **exact**. Move coverage: **110/276 exact,
  0 partial, 0 staged, 166 unsupported**. Both fixtures pin
  `framebufferMatching: 101` with status `exact`.
- **Did:** full new-move acceptance, **zero new source components**. The script
  is `loopsewithpan SE_SHINY` + non-permanent `metallic_shine` (the accepted
  HARDEN body, reused unchanged) + one BG-only `complex_palette_blend`
  (selector F_PAL_BG, delay 8, num_blends 2, RGB_WHITEALPHA, blend_y 14 → 0).
  Landed the reducer (`src/animation/ironDefense.ts`): `complexPaletteBlendAtAge`
  transcribes `AnimComplexPaletteBlend` (`battle_anim_normal.c:344-405`) as a
  white 14 → 0 → 14 → restore RAM pulse at creation-relative ages 0/8/17/27,
  and the whole move-owned body trails the shine by one tick
  (`IRON_DEFENSE_BLEND_START_AGE=1`, probe-derived). Cloned HARDEN's Scene-ON
  seam + draw case for the CLAMPERL→ONIX pair, drawing the white pulse on the
  battle-bg palette banks while keeping the grayscale attacker and unblended
  metal palette (F_PAL_BG never touches OBJ/bank-8). No new art: CLAMPERL
  back/front from the shared battle-back/opponent-front sprite assets. Added
  the two mechanic scenarios (FRONTIER_MON_CLAMPERL record 134, all four slots
  IRON_DEFENSE, vs legal ONIX), `ironDefenseProbe.py` (dense 215-315 window,
  metallic + Task_LoopAndPlaySE + blend sprite + BG palette + registers + RGB),
  `ironDefensePortable.ts`, the two scene-on-portable-evidence fixtures, and
  `ironDefense.test.ts` + `ironDefenseEvidence.test.ts`.
- **Measured:** player-back frames 215-315 and opponent-front frames 215-315,
  both **101/101 twice fresh** via the portable. Evidence
  `6da0086c…`/`4390cfb3…`, RGB `a2b2a60a…`/`32987f6e…` reproduce the fixture
  pins exactly. **Display model:** the blend sprite is created one engine-age
  tick after the shine's first step and its `gPlttBufferFaded` writes latch one
  display behind, so the displayed pulse runs at ages 2..9 / 10..18 / 19..28 /
  29+ (the source's 8/9/10-frame asymmetry from the delay=8 countdowns); the
  metalled bg keeps its own palette because `GetBattlePalettesMask(TRUE,…)` for
  F_PAL_BG selects only banks 1-3, never the metal bank.
- **Next:** next zero-new-component Level-50 move (20 remain per supervisor
  component analysis).
- **Notes:** the opponent-front CLAMPERL carries no idle-bob residual
  (`x2=0`), so the draw needs no front idle offset for the attacker; the ONIX
  target keeps its `speciesFrontIdleRestOffset` x2=1. The attacker's Defense
  stage is already +2 at the first dense frame (stat stage applies before the
  animation) and is treated as an immutable field input, never advanced by the
  reducer. No boundary widening, no new unsupported barriers.

## MOVE_TAIL_WHIP closed — 77/77 both orientations twice-fresh, promoted to exact (2026-08-04 evening)

- **State:** TAIL_WHIP (new move) → **exact**. Move coverage: **109/276 exact,
  0 partial, 0 staged, 167 unsupported**. Both fixtures pin
  `framebufferMatching: 77` with status `exact`.
- **Did:** full new-move acceptance, **zero new source components** (the
  entire script is `loopsewithpan SE_M_TAIL_WHIP` + one
  `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER,12,4,2,3)`).
  Landed the reducer (`src/animation/tailWhip.ts`), Scene-ON seam route
  (`SceneOnTailWhipConfig/View`), `battleScene.ts` draw case (Ponyta attacker
  at spriteCorner + displayed elliptical offset over Onix; Ponyta back/front
  from the shared gen assets — no new art), the two mechanic scenarios
  (FRONTIER_MON_PONYTA_1 record 191, all four slots TAIL_WHIP, vs legal
  ONIX), `tailWhipProbe.py`, `tailWhipPortable.ts`, two
  scene-on-portable-evidence/v1 fixtures, and `tailWhip.test.ts` +
  `tailWhipEvidence.test.ts`.
- **Measured:** player-back frames 73-149 and opponent-front frames 77-153,
  both 77/77 twice fresh via the portable — evidence
  `24e2ecd6…`/`5a1a6ae1…`, RGB `3a1363ef…`/`02197a46…` reproduce the fixture
  pins exactly. **Key mechanism:** the battler x2/y2 passes the elliptical
  task → software sprite → OAM pipeline **two displays behind** the dense
  index (the oracle's framebuffer shows software-OAM step θ=8 on dense age 3,
  not 1), so the reducer's displayed angle is `8*(age-1)` for ages 2..63;
  loop-1 wrap renders the origin at age 33, and the terminal θ=240 (age 63)
  precedes the θ=248 wrap that resets and destroys the task (no trailing
  offset frame). The probe-derived frames are the `animationBoundaryRatchet`
  and gameplay-stability pins.
- **Next:** MOVE_IRON_DEFENSE (CLAMPERL record 134) — per supervisor
  component analysis 20 Level-50 moves still need zero new components.
- **Notes:** no `extract*Assets` step (the move spawns no effect sprites — SE
  + mon translation only); enemy shadow stays invisible
  (`SpriteCB_SetInvisible`) across both windows; the Onix target's Defense
  stage is already −1 at the first dense frame (stat stage applies before the
  animation) and is treated as an immutable field input, never advanced by
  the reducer. No boundary widening, no new unsupported barriers.

## MOVE_STEEL_WING closed — 197/197 both orientations twice-fresh, promoted to exact (2026-08-04 evening)

- **State:** STEEL_WING partial → **exact**. Move coverage: **108/276 exact, 0
  partial, 0 staged, 168 unsupported**. Both fixtures now pin
  `framebufferMatching: 197` with status `exact`.
- **Did:** two player-side fixes closed the last 17 divergent frames. (1) Ages
  181-185: slide-back start now derives from the slide-out's actual Q8.8
  terminal (`(682*9)>>8 = 23` player / `−24` opponent floor-shift asymmetry)
  instead of the hardcoded 24 — the reducer renders the oracle's 20,18,16,14,12
  2/frame fall, pinned as `[23,20,…,0]` over ages 179-190 in
  `steelWing.test.ts`. (2) Ages 144-155: the two-gust **overlap draw order** —
  the player orientation draws the index-1 gust first (index-0 frontmost);
  opponent order unchanged. **Diagnosis correction:** the doc's
  "faded-vs-unfaded gust palette base" hypothesis for 144-155 is **disproved**
  — the worker's probe read `gPlttBufferFaded` slot 23 as the unfaded rotated
  gray ramp (no per-channel darkening); the residual was OAM ordering at the
  gust overlap (addendum added to `docs/steel-wing-residual-diagnosis.md`).
- **Measured:** player 180 → **197/197**, opponent **197/197** (no
  regression); twice-fresh post-change — worker runs plus the supervisor's own
  independent fresh pair (evidence `e321040c…`/`7af04b35…`, RGB
  `2f44c811…`/`25c8e06b…` reproduce the fixture pins exactly).
- **Next:** MOVE_TAIL_WHIP (sole Level-50 carrier FRONTIER_MON_PONYTA record
  191; zero new source components), then MOVE_IRON_DEFENSE (CLAMPERL 134) —
  per supervisor component analysis, 20 Level-50 moves currently need zero new
  components.
- **Notes:** the DeepSeek worker round hit its 60-min cap (exit 124) after
  completing every code/fixture/test edit and its own twice-fresh player +
  once-fresh opponent measurement, but before the ledger entry and commit.
  Supervisor salvaged the uncommitted worktree state and verified from
  scratch: both portables fresh (197/197 + hashes), focused 4 files / 20
  tests, typecheck, smoke 347/347 — then committed. No boundary widening, no
  new barriers.
