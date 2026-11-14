# aud249: sound effects of the General_* / Status_* battle animations

Scope: the SEs of `gBattleAnims_StatusConditions` / `gBattleAnims_General` animations that the live presentation already runs (Battle Scene ON). Sound-only:
no gameplay state, RNG, damage, turn order or presentation length changes. Move-body lifetimes (aud242 family), cries, BGM are out of scope.

## Part 1: mapping of the top ROM-only rows (aud248 baseline, 5 aligned seeds 2 / 165 / 499 / 830 / 1028, Scene ON)

| SE id | ROM-only rows | source | status after aud249 |
|---|---|---|---|
| 148 | 114 | `Status_Poison` (`loopsewithpan` 148, wait 13, x6) + Poison / Toxic move bodies | 114 -> 24 (the 24 are move-body rows, aud242 family) |
| 176 | 96 | `Status_Confusion` (`loopsewithpan` 176, wait 13, x6) | 96 -> 0 |
| 196 | 52 | not a presented General_* command (move body; `General_DoomDesireHit` also plays it but the live route does not present it) | unchanged (out of scope) |
| 137 | 44 | ice-crystal move-body rows (aud242g ROM-only list); `Status_Freeze` (137 + 242) has no window in these seeds | unchanged |
| 152 | 24 | `General_HeldItemEffect` (Leftovers / berry / item effect) | unchanged: no presented command (gap A) |
| 127 | 12 | `General_Rain` (weather continues) | 12 -> 0 |
| 102 | 11 | `General_HeldItemEffect` family (item effect) | unchanged (gap A) |
| 123, 133, 186, 130, 194 | 9 / 6 / 6 / 5 / 4 | move bodies / other controller paths | unchanged (aud242 family) |
| 119 | 9 | `Status_Paralysis` | 9 -> 0 |
| 228 | 8 | `General_HeldItemEffect` family | unchanged (gap A) |
| 197 | 8 | `Status_Sleep` | 8 -> 0 |
| 144 | 6 | `Status_Burn` | 6 -> 0 |
| 179 | 2 | not in a General_* table (Leech Seed move path) | unchanged |

Also decoded (table only): `Status_Infatuation` 212 x3, `Status_Curse` / `Status_Nightmare` 121, `Status_Freeze` 137 + 242, weather `General_Sun` 202, `General_Sandstorm` 219, `General_Hail` 242 x10,
`General_CastformChange` 203 / 204, `General_FocusPunchSetUp` 171, `General_LeechSeedDrain` 180 + 142, `General_HeldItemEffect` 152. No ROM window among the 5 seeds or the committed fixtures
covers infatuation / curse / nightmare / sun / sandstorm / hail, so those are emitted from the table and only the pan rule is unit-tested.

## Part 2: what is emitted

`tools/extract/extract-anim-sound-timing.ts` walks the two General tables the same way as the move table (battle_anim.c VM clock) into the `general` array of
`src/data/gen/anim-sound-timing.json` (one variant per animated-battler side; `General_CastformChange` resolves with `TRUE` / `FALSE` and `AnimTask_IsMonInvisible` = 0).
`emitGeneralAnimSounds` (`src/engine/moveAnimSounds.ts`, called from `src/engine/tickSounds.ts`) emits:

- `status-animation` commands (PSN / CONFUSION / BRN / INFATUATION / SLP / PRZ / FRZ / CURSED / NIGHTMARE): clock = command age minus the IsBattleSEPlaying gate
  (`seGateFrames`) minus `STATUS_ANIMATION_SCRIPT_AGE` (7); `statusAnimActive` forces every pan to the animated battler's side (BattleAnimAdjustPanning).
- weather-continues `general-animation` commands (rain / sun / sandstorm / hail): move-body clock (the same 1 + 7 as a move body).
- Launch loops (`loopsewithpan`) of these animations play every gap at wait + 1 (14 for confusion / poison, as in every ROM window), unlike a move body whose first gap is wait.

Scene OFF presents none of these commands (the kernel skips them under HITMARKER_NO_ANIMATIONS), so OFF is unchanged; the OFF T2 rescore is identical to the baseline.

## Evidence

- T2 (Scene ON, 5 aligned seeds, ROM files reused, engine replay + compare rerun): move-animation SE exact / offset / missing / extra `92 / 512 / 429 / 0` -> `98 / 727 / 208 / 0`; no new extra rows.
  Stat-change, cry, controller, bgm rows identical. Scene OFF identical in every family. Per SE id: see the table above (matched rows exist now, offsets are segment-relative and carry accumulated
  presentation drift: medians 148 -10, 176 -4, 197 +3, 144 -10, 119 -10, 127 -16).
- Neutrality (`lsd194Census.sh`, seeds 0..199, both scenes, base `1a657e483` vs `b17c52318`): OFF 200 / 200 seeds identical; ON 200 seeds, 0 errors, only `sound` / `soundDigest` differ (169 seeds), every non-sound
  field (`eventsDigest`, `commands`, `soundAnim`) equal.
- Tier 1: `tests/aud249GeneralAnimSounds.test.ts` (table decode, loop spacing, pan rule, flatter / swagger ROM windows: both confusion plays, ids / pans / 14-frame spacing equal);
  `tests/aud242gMoveAnimSounds.test.ts` dreameater turn 1 now includes the frame-exact Status_Sleep SE197 (delta 0; the former "SE197 not emitted" gap is closed).

## Residuals and gaps

- A. `General_HeldItemEffect` (SE 152 / 228 / 102, 43 ROM-only rows) needs a presented command for the held-item effect; the live route has none (not an SE problem).
- B. `STATUS_ANIMATION_SCRIPT_AGE` = 7 is calibrated on the single frame-exact window (dreameater turn 1, SE197 delta 0). The flatter / swagger windows then show +7 / +8 on the first confusion play
  (their stat-change SE, whose clock is exact, is +5 / +6 there: the move body before is not ROM-exact), so 2 frames of the first-play residual are unexplained.
- C. In all three windows the second play of the same animation is a further ~14 frames late (flatter 21, swagger 22, dreameater 15 vs the first play): a second-play lead, probably the status SE gate
  or the end-turn presentation of the following turn; not diagnosed.
- D. Not emitted although decoded: `FOCUS_PUNCH_SETUP`, `LEECH_SEED_DRAIN`, `CASTFORM_CHANGE` (presented commands exist; their age anchors are not calibrated against a ROM window), `General_TurnTrap` and `General_SnatchMove`
  (extractor leaves an unresolved branch), Substitute fade / appear (no SE).
- E. Poison 148 / 137 rows still ROM-only (24 / 44) are move-body rows, not Status_* (aud242 family).
