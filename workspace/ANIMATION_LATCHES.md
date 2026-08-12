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
| `AnimTask_ShakeMon` | RAM+1 | COUNTER (2026-08-08) — NOT +2 |
| `AnimTask_ShakeMon(target,5,0,10,0)` and `(target,4,0,70,0)` | RAM+1 independently for both invocations; hardware OAM equals the preceding software buffer | MIST_BALL, both 213-frame orientations (2026-08-10); the two schedules were checked separately against their move-owned maps |
| `AnimTask_ShakeMonInPlace(target, 3, 0, 11, 1)` | RAM+1 | HI_JUMP_KICK, both orientations, own dense change maps (2026-08-10) |
| `AnimTask_ShakeMonInPlace(target,4,0,7,1)` twice and `(target,8,0,16,1)` | RAM+2 independently for all three invocations | THRASH, both 103-frame orientations (2026-08-10); move-owned target-palette outline witnesses exclude each fist/hitsplat's complete 32x32 OAM bounds, then actual pixels select RAM+2 at 94.2-98.1% versus 60.5-70.6% for RAM+1 |
| `AnimTask_ShakeMon2` (usual longer schedules) | RAM+2 | SLASH, LICK, TAKE_DOWN (2026-08-08) |
| Guillotine `AnimTask_ShakeMon2(target,2,0,23,1)` and `(target,4,0,8,1)` | Both live-mon schedules display RAM+1 from the initial negative-amplitude write through the terminal zero; neither inherits the usual long-schedule RAM+2 rule | GUILLOTINE, complete 165/164-frame bilateral maps (2026-08-11); both creation/body/teardown schedules are independently checked |
| MOVE_LEER eye OAM, live ScaleMonAndRestore affine matrix, and long target ShakeMon2 | ordinary eye OAM RAM+1; live affine matrix RAM+2; long target x2 RAM+2; source monbg update ages 4-55, clear ages 56-58, and BLDALPHA ages 7-55 | LEER, player-back and opponent-front 70-frame maps (2026-08-11); player/opponent eye OAM centers and pre-shake x2 baselines are measured independently — do not inherit short ShakeMon2 creation/body splits |
| `AnimTask_ShakeMon2(attacker,2,0,8,1)` | Logical task tick is wave age+1; the live-battler OAM scanout displays the positive creation write at creation+1, then the ordinary source-derived body at RAM+2. The player-back attacker precedes wave OBJs in hardware OAM while opponent-front follows them. | METAL_SOUND corrected ARON exact proof, both orientations (2026-08-11); same split creation/body transfer independently seen on LEAF_BLADE and CONFUSION |
| `gMetalSoundSpriteTemplate` wave affine/OAM | position and affine matrix both display reducer age−1, including first paint and teardown; not the generic fresh-affine dual-lag class | METAL_SOUND corrected ARON maps, both orientations (2026-08-11) |
| `AnimTask_ShakeMon2(target, 3, 0, 2, 1)` short burst | RAM+1 | PIN_MISSILE, all three bursts in both orientations (2026-08-10); this move-owned script schedule is distinct from the longer RAM+2 cases |
| Fury Swipes `AnimTask_ShakeMon2(target,3,0,5,1)` and `(target,4,0,7,1)` | The creation display holds the settled target; the next display shows the positive amplitude, then the source-derived `+,-,-` body cadence; terminal zero lands at creation+10 / creation+14 and remains through teardown. The front-target ONIX idle x2 is composed only before the first task display. | FURY_SWIPES, complete 48-frame player-back and opponent-front maps (2026-08-11); both short schedules, software/hardware OAM and production pixels were independently checked twice fresh — do not inherit the usual long-schedule RAM+2 rule |
| Meteor Mash `AnimTask_ShakeMon2(target,5,0,20,1)` | The impact source row displays the first negative write at x2=−5; the next row remains −5, then the source-derived target wave alternates in two-frame `−5/+5` pairs through the last task row, with terminal x2=0 from the following row. This move-owned schedule is not the usual long-schedule RAM+2 creation anchor. | METEOR_MASH, bilateral Scene-ON source-pointer probes (2026-08-11); exact compositor latch still open |
| `gMeteorMashStarSpriteTemplate` callback | Three stars are created at source-relative ages 48, 60, and 102; each uses its pre-increment `data[5]` for trajectory position, remains live for local ages 0..29, and destroys on the next callback. Even callback values create `gMiniTwinklingStarSpriteTemplate`, including the terminal callback before the parent star is destroyed. | METEOR_MASH, bilateral Scene-ON source-pointer probes (2026-08-11); mini-star OAM/palette painter remains open |
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
