# S10A fury99 — Fury Cutter 210 at counter 2..5 (later bodies)

Status: PREDICTIONS (committed before any ROM probe). Results will be placed above this section.

## Predictions from source (before probes)

Source: `data/battle_anim_scripts.s` Move_FURY_CUTTER, `battle_anim_effects_2.c` AnimTask_IsFuryCutterHitRight /
AnimTask_GetFuryCutterHitCount, `battle_anim_normal.c` AnimComplexPaletteBlend(_Step1/_Step2) + UnpackSelectedBattlePalettes,
`battle_anim_mons.c` GetBattlePalettesMask, `util.c` BlendPalette.

1. **What the counter changes.** `gAnimDisableStructPtr->furyCutterCounter` (the attacker's counter after Cmd_furycuttercalc; the
   request already carries it since plans54 as `request.rolloutCounter`, moveId-gated) selects:
   - the slice direction: `counter & 1` = 1 → FuryCutterRight (arg 1, h-flipped), 0 → FuryCutterLeft. Counter 2 / 4 = left, 1 / 3 / 5 = right.
     `liveFuryCutterHardwareOamRows` already models both (`rightHit`).
   - the blend: counter 1 → FuryCutterContinue2 (none); 2 → FuryCutterMedium (`complex_palette_blend` num_blends 1);
     3 → Strong, 4+ → Strongest — **byte-identical arguments** (num_blends 3). So counter 3 ≡ 5 and 4 differs from 3 only in direction.
   - nothing else: the blend sprite is created in the same script frame as the slice (createsprite runs through
     createvisualtask / jumpreteq / goto without a wait), is invisible (no OAM entry) and is destroyed before the slice
     (~9 / ~17 frames vs the slice's 24): **the duration stays 43 rows**.
2. **The blend.** Selector F_PAL_BG | F_PAL_BATTLERS = BG palettes 1, 2, 3 + OBJ palettes 16 + attacker, 16 + target (partners absent
   in singles). **Not** BG banks 8 / 9: the monbg copy of the target (LoadPalette from the unfaded OBJ bank, before the blend) stays
   unblended, so the target shown on the BG is not darkened while the battle background and the attacker are.
   BlendPalettes(mask, 4, RGB(9, 8, 10)) from unfaded: `c + (((9|8|10 - c) * 4) >> 4)` per channel.
   Timing: created (and blended once) in CB1 of the slice's creation frame; CB2 AnimateSprites runs Step1 the same frame (timer 3 → 2).
   Toggles when the timer is 0: on → off after 3 frames; counter 3+: off 4 frames, on 4 frames, then off; Step2 restores (coeff 0).
   With the palette transferred at VBlank like the OAM, the blend shows from the first row the slice shows (row 8):
   - counter 2: blended rows **8..10**;
   - counter 3 / 4 / 5: blended rows **8..10 and 15..18**.
3. **What a counter-k body inherits from the previous Fury Cutter body.** Nothing pixel-relevant beyond what the counter-1 later body
   already reads: Step2's BlendPalettes(mask, 0, 0) restores faded = unfaded; the blend sprite's slot is freed (the order host's plans54
   keys 10210 / 20210 / 30210 carry the allocation); ShakeMon ends the target at x2 = 0; register / BG history is unread (later58).
   Production can derive all of it: the counter from `request.rolloutCounter` (power is redundant), the lend from the order host.
4. **Gate.** Counter 1..5 at a later body (counter 2+ is never a first body), both species rests {0,0} (unchanged), non-shiny.
