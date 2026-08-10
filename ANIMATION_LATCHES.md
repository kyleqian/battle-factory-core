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
| `AnimTask_ShakeMon2` | RAM+2 | SLASH, LICK, TAKE_DOWN (2026-08-08) |
| `AnimTask_TranslateMonElliptical(RespectSide)` (windUpLunge) | RAM+2 | COUNTER (RAM 217 → pixels 219); TAKE_DOWN windUpLunge (RAM 221 → pixels 223, confirmed by change map + hardware OAM) |
| `AnimTask_RotateMonSpriteToSide` | RAM+2 | DOUBLE_EDGE pin round (2026-08-08), both orientations, restore-phase isolated |
| Freshly allocated OAM **affine matrix** | needs TWO displays to reach hardware; removal is a plain OAM edit at ONE (dual-lag class: paint age−2, remove age−1) | MINIMIZE clones (2026-08-07); reused by TORMENT bubbles |
| Scale/wobble affine matrix on a live sprite | RAM+2 | GROWTH-derived, FUTURE_SIGHT (matrix age−2); TORMENT wobble |
| Direct live-battler `SetSpriteRotScale` from a sprite callback, with `ResetSpriteRotScale` + invisible teardown | matrix RAM+1; invisible sprite omitted from hardware OAM at RAM+1 while its matrix transfers independently | BATON_PASS, both orientations (2026-08-09) |
| OAM `objMode`/`affineMode` flags | RAM+1 — flips one tick before its own matrix reaches neutral | FUTURE_SIGHT rung 11 |
| Send-out intro (front) | one-display latch, alignment A = −1 (`max(0, frame − t_move − 1)`) | rung-3 FRONT dispatcher (2026-08-04) |
| Send-out intro (back) | TWO displays behind the dense index | rung-3 BACK dispatcher (2026-08-04) |
| Outgoing animation's OAM teardown (incl. enemy shadow) | lands ONE display behind the script-pointer boundary; software OAM is one frame AHEAD of hardware there | DETECT (2026-08-07, "fifth finding") — if a window's first frame catches it, re-pin the window start |
| `loadspritegfx` VRAM transfer | latches at the window's first frame | DETECT frame-68 |

**Not determined:** `AnimTask_ShakeMonInPlace` — best fit RAM+1 on
DOUBLE_EDGE's player-back map, contradicted by one opponent-front frame; its
window there is fully overlapped by rotation + BG blend. First job of the
DOUBLE_EDGE promotion round: a fresh single-axis probe. Do not guess.

## Compositor rules

- **Equal-subpriority semi-transparent overlap: the LOWER OAM slot wins** the
  PPU's one-selected-OBJ blend, and the ROM's OAM allocator REUSES slots out
  of creation order — the reducer must report each sprite's OAM slot and the
  draw case must paint by it (COUNTER, 2026-08-08).
- **Explicit absolute subpriorities flip painter order with orientation**
  (TORMENT bubbles 6..1: player-back vs opponent-front stack differently).
  Drawing one order for both sides is the trap.
- **Species idle holds are the draw case's job, not the reducer's.** ONIX's
  front idle holds `x2=1`; the reducer reads 0 and the draw supplies the hold
  (TAKE_DOWN/SLASH/LICK/COUNTER convention; DOUBLE_EDGE pins the exclusion
  explicitly).
- **Orientation shift between the two windows varies per move** — measured +4
  (DOUBLE_EDGE, CRUSH_CLAW) and +0 (COUNTER). Read it off the two change
  maps; never assume symmetry.
- **Some RAM transitions never reach pixels** and are modelled as RAM truth
  only: `setalpha`/`blendoff`/`monbg`/`clearmonbg` register work with no
  pixel step (COUNTER, CRUNCH, CRUSH_CLAW, TAKE_DOWN), IRON_TAIL's third
  metallic-shine sweep (`ClearBattleAnimBg` already ran).

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
