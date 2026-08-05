# Animation coverage

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
