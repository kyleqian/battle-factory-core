# Display-latch and compositor-rule reference (Scene-ON animation lane)

The ported C source specifies RAM truth: what each task and sprite callback
writes on each tick. Acceptance is displayed pixels. The mapping from RAM to
pixels has per-mechanism delays ("latches") and compositor rules that are NOT
in the source — they are measured, move by move, from dense probes and change
maps. This file is the single collection point for those measurements.

**Consult it when staging a move; extend it when you promote one.** A round
that measures a latch for a mechanism not listed here (or contradicts a row)
appends/amends the row in the same commit as its coverage entry. Every row
cites the move whose ledger entry holds the full evidence.

## Rules (hard-won, each one paid for in a burned round)

1. **The latch is per-MECHANISM (per source task, per sprite class), never
   per-category.** "Task-driven means +2" is FALSE as a blanket rule:
   `AnimTask_ShakeMon` renders RAM+1 while `AnimTask_TranslateMonEllipticalRespectSide`
   renders RAM+2 in the same move (COUNTER, 2026-08-08). `ShakeMon` and
   `ShakeMon2` are different source tasks and latch differently.
2. **Never inherit a latch from a sibling move.** A promotion round verifies
   ITS latch against ITS change map, even when the task is per-move-profiled
   from a shared port (DOUBLE_EDGE directive, 2026-08-08).
3. **When a ledger entry and a change map disagree, the change map wins.**
   Staging entries are written in DISPLAYED frames, or the column is labeled
   RAM. A staging entry that printed RAM frames under a "displayed" heading
   cost a full 45-minute worker round that wrote zero files (IRON_TAIL,
   2026-08-07).
4. **Bank change maps per orientation during staging**
   (`tools/compare/frame-changemap.py`, output under `tools/compare/evidence/`).
   Measured effect: with no map, IRON_TAIL's first round burned its whole cap;
   with maps banked, the same move closed in 55 minutes and CRUSH_CLAW's
   promotion round took 14 minutes.
5. **Default expectation where nothing is measured: visible events display ONE
   frame after the RAM write.** Task-driven axes are the usual exception (+2).
   Expect a split latch in any move that mixes them; the draw case splits per
   mechanism.

## Measured latches

| Mechanism | Latch | Measured on (ledger anchor) |
| --- | --- | --- |
| Sprite-driven `x2` / plain OAM edits / script-`createsprite` sprites | RAM+1 | five-move rule (TAKE_DOWN wind-down, 2026-08-07); COUNTER fists/hitsplats/slides |
| Palette writes (`gPlttBufferFaded`), incl. metallic-shine pulse and BlendPalette ramps | RAM+1 | STEEL_WING/IRON_TAIL shine; TORMENT anger-mark blend |
| BG-palette rotation and `REG_BLDY` darken | RAM+1 | FUTURE_SIGHT-era BG work (archive, 2026-07-26) |
| `AnimTask_BlendNonAttackerPalettes` in `MOVE_COSMIC_POWER` | Move-owned palette map: first task RAM `data[10]=2..15` at source ages 4..17 displays non-attacker OBJ coefficient 1..14 at ages 4..17, holds 15 through age 180; reverse RAM 13..0 at ages 181..194 displays 14..1, clears at 195. This is the usual palette RAM+1 latch and is not inherited from the attacker-blend siblings. | COSMIC_POWER, actual species-348 LUNATONE bilateral 241-row maps at oracle frames 294..534, twice fresh (2026-08-13 corrective postflight) |
| `fadetobg BG_COSMIC` / `AnimTask_StartSlidingBg` / `restorebg` in `MOVE_COSMIC_POWER` | Own BG schedule: `BG_COSMIC`/BG3 control becomes visible at source age 38; `REG_BLDY` is 0..16 at ages 20..36, holds 16 through 39, then returns 15..0 at 40..55; the restore fade is 0..16 at 202..218, holds through 222, then returns 15..0 at 223..238. Sliding `BG3VOFS` first displays 1 at age 40, advances every two rows to 91 at 220, and clears at 221. | COSMIC_POWER, actual species-348 LUNATONE bilateral source-relative register/raw-RGB/change maps, twice fresh (2026-08-13 corrective postflight); do not transfer this cadence to METEOR_MASH |
| `gGrantingStarsSpriteTemplate`, elevated attacker shadow, and Cosmic Power audio tasks | Plain OAM stars are source ages 129..189 and 139..199, with `x/y` RAM+1 display and terminal `y2=7` retained through cleanup. Actual LUNATONE centers are player-back `(72,93)` and opponent-front `(176,36)`; its opponent elevated shadow paints only at pointer-entry age 0. `SoundTask_PlaySE2WithPanning(SE_M_COSMIC_POWER,0)` starts at age 4; `SoundTask_PlaySE1WithPanning(SE_M_MORNING_SUN,SOUND_PAN_ATTACKER)` starts at age 129 with pan −64 player-back / +63 opponent-front. | COSMIC_POWER, actual species-348 bilateral full-state/audio/software+hardware-OAM receipts, twice fresh (2026-08-13 corrective postflight) |
| `AnimTask_ShakeMon` | RAM+1 | COUNTER (2026-08-08) — NOT +2 |
| `AnimTask_ShakeMon(target,5,0,10,0)` and `(target,4,0,70,0)` | RAM+1 independently for both invocations; hardware OAM equals the preceding software buffer | MIST_BALL, both 213-frame orientations (2026-08-10); the two schedules were checked separately against their move-owned maps |
| `AnimTask_ShakeMonInPlace(target, 3, 0, 11, 1)` | RAM+1 | HI_JUMP_KICK, both orientations, own dense change maps (2026-08-10) |
| `AnimTask_ShakeMonInPlace(target,4,0,7,1)` twice and `(target,8,0,16,1)` | RAM+2 independently for all three invocations | THRASH, both 103-frame orientations (2026-08-10); move-owned target-palette outline witnesses exclude each fist/hitsplat's complete 32x32 OAM bounds, then actual pixels select RAM+2 at 94.2-98.1% versus 60.5-70.6% for RAM+1 |
| `AnimTask_ShakeMon2` (usual longer schedules) | RAM+2 | SLASH, LICK, TAKE_DOWN (2026-08-08) |
| Ancient Power attacker `AnimTask_ShakeMon2(1,0,30,1)` and target `(3,0,6,1)` | The attacker creation/body scanout starts with +1 at age 11 and follows the common displayed sequence through terminal zero at 71. The monbg target starts −3 at ages 78..79, then holds source-derived two-row +3/−3 pairs through −3 at 86..87 before zero; this schedule must not inherit the attacker's creation sign. | ANCIENT_POWER, complete BALTOY bilateral 128-row maps and production pixels twice fresh (2026-08-13) |
| Ancient Power `gSlideMonToOffsetSpriteTemplate` / `gSlideMonToOriginalPosSpriteTemplate` | Offset scanout ages 73..76 is player `4,8,12,16` / opponent `−4,−8,−12,−16`; the held offset survives through 88. Restore scanout ages 89..95 is player `13,11,9,6,4,2,0` / opponent `−14,−12,−10,−7,−5,−3,−1`, then zero at 96. | ANCIENT_POWER, live-attacker creation/body/teardown pixels and software/hardware OAM bilaterally (2026-08-13) |
| Ancient Power rocks, platform, monbg/alpha, and IMPACT | Ten BasicRock cells use source Q8.8 deltas with the moving-up low bit and retain their terminal row through callback teardown. First rock scanout painter order is source indices `1,2,3,4,5,0`; later rows follow the measured sorted OAM order. BG3VOFS is −4 at ages 12..13, 16..17, and 20, zero otherwise. Animation-1 IMPACT scans out ages 78..87 with 12:8 live-target blending; player-back target placement adds the source 8px pic offset. Age 7 monbg hardware palette equals the current faded buffer; the other 126 comparable rows use the preceding buffer. | ANCIENT_POWER, bilateral full-state/register/palette/OAM/matrix/change maps and 128/128 production pixels twice fresh (2026-08-13) |
| Guillotine `AnimTask_ShakeMon2(target,2,0,23,1)` and `(target,4,0,8,1)` | Both live-mon schedules display RAM+1 from the initial negative-amplitude write through the terminal zero; neither inherits the usual long-schedule RAM+2 rule | GUILLOTINE, complete 165/164-frame bilateral maps (2026-08-11); both creation/body/teardown schedules are independently checked |
| MOVE_LEER eye OAM, live ScaleMonAndRestore affine matrix, and long target ShakeMon2 | ordinary eye OAM RAM+1; live affine matrix RAM+2; long target x2 RAM+2; source monbg update ages 4-55, clear ages 56-58, and BLDALPHA ages 7-55 | LEER, player-back and opponent-front 70-frame maps (2026-08-11); player/opponent eye OAM centers and pre-shake x2 baselines are measured independently — do not inherit short ShakeMon2 creation/body splits |
| `AnimTask_ShakeMon2(attacker,2,0,8,1)` | Logical task tick is wave age+1; the live-battler OAM scanout displays the positive creation write at creation+1, then the ordinary source-derived body at RAM+2. The player-back attacker precedes wave OBJs in hardware OAM while opponent-front follows them. | METAL_SOUND corrected ARON exact proof, both orientations (2026-08-11); same split creation/body transfer independently seen on LEAF_BLADE and CONFUSION |
| `gMetalSoundSpriteTemplate` wave affine/OAM | position and affine matrix both display reducer age−1, including first paint and teardown; not the generic fresh-affine dual-lag class | METAL_SOUND corrected ARON maps, both orientations (2026-08-11) |
| `AnimTask_ShakeMon2(target, 3, 0, 2, 1)` short burst | RAM+1 | PIN_MISSILE, all three bursts in both orientations (2026-08-10); this move-owned script schedule is distinct from the longer RAM+2 cases |
| Fury Swipes `AnimTask_ShakeMon2(target,3,0,5,1)` and `(target,4,0,7,1)` | The creation display holds the settled target; the next display shows the positive amplitude, then the source-derived `+,-,-` body cadence; terminal zero lands at creation+10 / creation+14 and remains through teardown. The front-target ONIX idle x2 is composed only before the first task display. | FURY_SWIPES, complete 48-frame player-back and opponent-front maps (2026-08-11); both short schedules, software/hardware OAM and production pixels were independently checked twice fresh — do not inherit the usual long-schedule RAM+2 rule |
| Meteor Mash `AnimTask_ShakeMon2(target,5,0,20,1)` | The task writes x2=−5 at source age 124, but monbg/OAM scanout still shows the idle target there. Display age 125 is +5; ages 126..161 then show source-derived two-frame `−5/+5` pairs, and the final −5 persists through teardown ages 162..163 before zero at 164. The copied target uses the inverse task displacement during the live body. This move-owned creation/body/teardown split is not the usual long-schedule RAM+2 anchor. | METEOR_MASH, bilateral 214/215-row software+hardware OAM and production target pixels (2026-08-11); target/shake compositor exact through age 164 |
| Meteor Mash IMPACT hitsplat target-2 | `create_basic_hitsplat_sprite` sets OBJ semi-transparent mode, but this script never installs a BLDCNT target-2 mask: captured BLDCNT and BLDALPHA stay zero. With no eligible second target, scanout presents the first-target hitsplat texel opaquely; applying the common 12:8 hitsplat blend is incorrect here. | METEOR_MASH, bilateral registers/OAM/raw RGB (2026-08-11); reduces ages 125..134 from a 421px/frame plateau to at most 78px |
| Meteor Mash parent/mini stars and transfer | Parents start at source ages 48/60/102 in slots 3/12/38, use pre-increment `data[5]`, remain live at local 0..29, then each terminal even callback creates its 16th mini before parent destruction: **48 minis total**. `CreateSprite` chooses the lowest free slot; a new mini below its parent misses that callback sweep, remains uninitialized for one row, then begins its local 0..60 two-phase invisible toggle. The final delayed mini survives through move age 193 and is gone at 194. Across both complete windows, whole hardware OAM, matrices, and palette equal the preceding software OAM, matrices, and `gPlttBufferFaded` respectively. Fixed-subpriority-5 minis sort ahead of target-relative parents/hand/hitsplat; within one subpriority, `SortSprites`' descending hardware OAM y means the back-to-front painter visits smaller top-y first and retains the lower source slot as the equal-y winner. | METEOR_MASH, bilateral 214/215-row source-pointer probes, exact reducer slot/init comparison, hardware-index witnesses (mini slot 13 OAM 13 versus hand OAM 21 at age 140), and complete production framebuffer (2026-08-11) |
| `AnimMissileArc_Step` Q8.8 double-advance affine sprite | live arc displays reducer age−1; its terminal destruction preserves one final matrix/OAM display from reducer age−2 | PIN_MISSILE, all three missiles in both orientations (2026-08-10); includes the initial invisible callback and affine allocation/teardown |
| `AnimTask_TranslateMonElliptical(RespectSide)` (windUpLunge) | RAM+2 | COUNTER (RAM 217 → pixels 219); TAKE_DOWN windUpLunge (RAM 221 → pixels 223, confirmed by change map + hardware OAM) |
| `AnimTask_RotateMonSpriteToSide` | RAM+2 | DOUBLE_EDGE pin round (2026-08-08), both orientations, restore-phase isolated |
| Freshly allocated OAM **affine matrix** | needs TWO displays to reach hardware; removal is a plain OAM edit at ONE (dual-lag class: paint age−2, remove age−1) | MINIMIZE clones (2026-08-07); reused by TORMENT bubbles; independently re-proved by SPITE's target clone in both orientations (pointer-age allocation blank at 43, paint at 44, stale teardown display before clear; 2026-08-10) |
| `AnimTask_SpiteTargetShadow` alternating `BLDALPHA` writes | buffered after the VBlank transfer; scanout observes the preceding queued word. Derive with the GPU-register queue/audio-workload scheduler, not a paired-age coefficient | SPITE, both orientations (2026-08-10): distinct pointer-zero audio anchors, no active-channel VBlank overrun in either 221-frame window |
| Scale/wobble affine matrix on a live sprite | RAM+2 | GROWTH-derived, FUTURE_SIGHT (matrix age−2); TORMENT wobble |
| Direct live-battler `SetSpriteRotScale` from a sprite callback, with `ResetSpriteRotScale` + invisible teardown | matrix RAM+1; invisible sprite omitted from hardware OAM at RAM+1 while its matrix transfers independently | BATON_PASS, both orientations (2026-08-09) |
| `AnimTask_NightShadeClone` direct live-battler setup followed by task-driven Step2 scale/reset | initial `SetSpriteRotScale(128)` matrix RAM+1; later Step2 `+8` shrink and reset matrix RAM+2; alpha task writes scan out one queued frame later | NIGHT_SHADE, both orientations (2026-08-10); its two phases are distinct and do not generalize BATON_PASS |
| OAM `objMode`/`affineMode` flags | RAM+1 — flips one tick before its own matrix reaches neutral | FUTURE_SIGHT rung 11 |
| Send-out intro (front) | one-display latch, alignment A = −1 (`max(0, frame − t_move − 1)`) | rung-3 FRONT dispatcher (2026-08-04) |
| Send-out intro (back) | TWO displays behind the dense index | rung-3 BACK dispatcher (2026-08-04) |
| Outgoing animation's OAM teardown (incl. enemy shadow) | lands ONE display behind the script-pointer boundary; software OAM is one frame AHEAD of hardware there | DETECT (2026-08-07, "fifth finding") — if a window's first frame catches it, re-pin the window start |
| `loadspritegfx` VRAM transfer | latches at the window's first frame | DETECT frame-68 |
| Powder `AnimMovePowderParticle_Step` position versus `gPowderParticlesAnimCmds` cell | callback/OAM position displays RAM+1 (the preceding source frame), while the animation cell selects the current source age; `loadspritegfx` is visible at the first window frame | STUN_SPORE, both 194-frame orientations (2026-08-10) |
| `AnimTask_LeafBlade` primary + child sprites | task-owned position/creation RAM+2; animation cell/hFlip/blink and ordinary trail destruction RAM+1; the task-owned primary terminal destruction retains its RAM+2 display | LEAF_BLADE, all seven arcs in both 224-frame orientations (2026-08-10); source `SortSprites` stable priority/descending-Y order is carried across reused slots |
| Leaf Blade short `AnimTask_ShakeMon2(target,2,0,8,1)` bursts | creation display is the positive amplitude at RAM+1, then the ordinary body is RAM+2 | LEAF_BLADE, all three short bursts in both orientations (2026-08-10); do not generalize beyond this invocation |
| Leaf Blade monbg `AnimTask_ShakeMon2(target,8,0,18,1)` | BG-scroll target motion RAM+1, including terminal return | LEAF_BLADE impact phase, both orientations (2026-08-10); distinct from live-OBJ ShakeMon2 schedules |
| script `create_cross_impact_sprite` during target monbg | sprite and terminal destroy-callback display RAM+1 | LEAF_BLADE independently, both orientations (2026-08-10); CROSS_CHOP remains the independent shared-asset control |
| `AnimTask_MoveHeatWaveTargets` live-battler `x2` writes | RAM+2, including the terminal return; distinct from the one-display flying-sand sprite callbacks in the same move | HEAT_WAVE, both 168-frame orientations (2026-08-10); own hardware OAM/change maps contradict the default plain-OAM expectation for this task specifically |
| `AnimTask_MistBallFog` BG1 transfer and blend | tiles first change at source age 44; tilemap and first fog pixels at 47; scroll reaches -121; the 5:12 hold and 16-sum fade use the task's displayed register state, while cleanup leaves one source-age-170 `EVB=16` register tail with no fog pixels | MIST_BALL, both 213-frame orientations (2026-08-10); hardware palettes equal the preceding faded buffer and some register transitions have no separate pixel edge |
| Confuse Ray bounce OAM + fresh affine matrix | complete hardware OAM and matrices equal the preceding software buffers on all 269 comparable rows; source bounce exists at ages 46..120, first paints at 47, last paints at 120, and clears at 121 | CONFUSE_RAY exact, both 270-frame orientations twice fresh (2026-08-12); reducer and production framebuffer are 270/270 bilaterally |
| Confuse Ray spiral OAM | source spiral exists at ages 166..224 and is destroyed at 225; the framebuffer paints source age−1 at displayed ages 167..225 and clears at 226 | CONFUSE_RAY exact, both orientations twice fresh (2026-08-12) |
| Confuse Ray `BlendColorCycleByTag` / palette transfer | complete hardware palette equals the preceding `gPlttBufferFaded` on 268/269 comparable rows; monbg setup age 4 is the sole same-row transfer. Ball pixels align to the current display-age coefficient because the palette task updates a scheduler pass ahead of the software-sprite age label. | CONFUSE_RAY exact, bilateral full-state and production framebuffer (2026-08-12) |
| Confuse Ray BG_GHOST `Task_FadeToBg` + bounce blend registers | BG whole-field framebuffer edges follow current hardware BLDY on ages 9..24, 29..44, 230, 233..247, and 252..267. Bounce first paint at 47 observes current `BLDALPHA=14:2`, but `gConfuseRayBallBounceSpriteTemplate` is OBJ_NORMAL and therefore paints opaquely; only the later spiral OBJ_BLEND consumes its 8:8 coefficient. | CONFUSE_RAY exact bilateral change maps/full-state/production rows (2026-08-12) |
| Fissure `gDirtPlumeSpriteTemplate` three four-sprite groups | Source sprites live at ages 14..37, 48..71, and 82..105; complete hardware OAM is the preceding software buffer, so the three groups scan out at ages 15..38, 49..72, and 83..106 and clear one display later. Player target centers are x 200/152, y 70; opponent target centers are x 96/48, y 110. | FISSURE staged reducer/component gate is 254/254 twice fresh bilaterally; production remains open only at close-plume/target overlap ages 50..59, 61, 64 |
| Fissure `AnimTask_HorizontalShake` platform + target schedules | Both source tasks live ages 4..199. Direct BG3 platform writes first scan out at age 6; the target's live-battler OAM first displays its task displacement at age 6 via the ordinary software→hardware one-row transfer. Both settle for displayed age 200. The later `WaitForFissureCompletion` BG3 hold overrides platform scroll at ages 154..233. | FISSURE staged reducer/component gate is 254/254 with 253/253 hardware latches twice fresh bilaterally; do not transfer to other HorizontalShake argument sets |
| Fissure complex BG/palette transfer | Hardware palette equals the preceding faded buffer on all 253 comparable rows per side. BG-only pulse writes at ages 31/34/39 and 65/68/73 scan out at 32/35/40 and 66/69/74. `BLDCNT=232` at 135..170 and 215..251; BLDY edges are current-register/framebuffer-row: fade-out 136..151, Fissure fade-in 155..169, restore fade-out 216..231, field fade-in 236..250. Side-relative BG3 scroll holds ages 154..233 and clears at 234. | FISSURE staged source/reducer/register gate is exact twice fresh bilaterally; production BG_FISSURE target-priority residual remains ages 155..230, so no exact claim |

**Not determined:** other `AnimTask_ShakeMonInPlace` schedules remain open —
DOUBLE_EDGE's best fit is RAM+1 on its player-back map but is contradicted by
one opponent-front frame, and that window is fully overlapped by rotation + BG
blend. HI_JUMP_KICK's own target invocation `(3, 0, 11, 1)` is independently
resolved at RAM+1 in both orientations, while THRASH's two `(4, 0, 7, 1)`
invocations and one `(8, 0, 16, 1)` invocation are independently RAM+2; do not
generalize either move to DOUBLE_EDGE without a fresh single-axis probe.

## Compositor rules

- **Equal-subpriority semi-transparent overlap: the LOWER OAM slot wins** the
  PPU's one-selected-OBJ blend, and the ROM's OAM allocator REUSES slots out
  of creation order — the reducer must report each sprite's OAM slot and the
  draw case must paint by it (COUNTER, 2026-08-08).
- **Guillotine's orientation-selected BG makes its CUT pincers and identity
  IMPACT hitsplat scan out as opaque palette pixels despite their ObjBlend
  templates.** Its 12:8 register lifecycle remains independently verified;
  do not transfer VICE_GRIP's field-background blend painter (GUILLOTINE,
  bilateral 165/164-frame maps, 2026-08-11).
- **Explicit absolute subpriorities flip painter order with orientation**
  (TORMENT bubbles 6..1: player-back vs opponent-front stack differently).
  Drawing one order for both sides is the trap.
- **Species idle holds are the draw case's job, not the reducer's.** ONIX's
  front idle holds `x2=1`; the reducer reads 0 and the draw supplies the hold
  (TAKE_DOWN/SLASH/LICK/COUNTER convention; DOUBLE_EDGE pins the exclusion
  explicitly). MIST_BALL independently applies the LATIAS/REGISTEEL holds in
  its compositor, outside the reducer.
- **Mist Ball fog palette index zero is opaque BG source, not transparent.**
  Blend every BG1 tile pixel, including palette index zero, against the field;
  treating zero as transparent breaks the complete fade window. MIST_BALL's
  bilateral maps prove this together with the source-age 47 first-pixel edge.
- **Mist Ball projectile painter priority changes with orientation.** The
  player-back projectile is behind LATIAS; the opponent-front projectile is
  in front. Both move-owned normalized maps are required; this is not inferred
  from the four-frame orientation shift (75..287 versus 79..291).
- **Orientation shift between the two windows varies per move** — measured +4
  (DOUBLE_EDGE, CRUSH_CLAW) and +0 (COUNTER). Read it off the two change
  maps; never assume symmetry.
- **Some RAM transitions never reach pixels** and are modelled as RAM truth
  only: `setalpha`/`blendoff`/`monbg`/`clearmonbg` register work with no
  pixel step (COUNTER, CRUNCH, CRUSH_CLAW, TAKE_DOWN), IRON_TAIL's third
  metallic-shine sweep (`ClearBattleAnimBg` already ran).
- **Mirrored Heat Wave subsprites retain source table order but use the
  parent's H-flip layout:** tile-offset 0 is at parent−16 and tile-offset 8
  at parent−48; signed Q8.8 accumulation must floor negative products.
  HEAT_WAVE proves this bilaterally; SANDSTORM's non-mirrored control is
  unchanged.

## Diagnostics

- **Dual-lag class detector** (MINIMIZE): mismatches only at spawn frames →
  paint lag too short; only at expiry frames → paint lag too long; at BOTH
  ends under any single lag → dual-lag class (paint age−2, remove age−1).
- **Latch fit:** with a change map banked, fit each mechanism's first-pixel
  frame against RAM+0/+1/+2 on an isolated window before writing the reducer.
  If no single lag explains both orientations, stop and probe a single axis —
  report "not determined" honestly (DOUBLE_EDGE ShakeMonInPlace precedent).

## Probe gotchas (bitten twice each)

- Sprite-template symbol addresses need `& ~1` (Thumb bit).
- `hFlip` lives at sprite offset `0x3f`; displayed bubble flip is
  `animHFlip(TRUE) XOR field` (TORMENT).
- Sprite `animNum`/`animCmdIndex`/`animDelayCounter` live at offsets
  `0x2a/0x2b`-family — use the corrected offsets (DETECT/IRON_TAIL probe fix,
  2026-08-07).
