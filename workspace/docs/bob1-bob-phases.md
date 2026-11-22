# bob1 — healthbox / battler bob after the party menu, party-icon bob phase

Presentation only (both scenes, Battle Scene OFF oracle lane). No battle-rule, damage or RNG change.

## Rules ported

1. **Cancel resets the bounce.** `cancelBattleCommandPartySelection` returns to `action-menu` with `idleBounceElapsed: 0`.
   ROM: the party menu returns through `ReshowBattleScreenAfterMenu` (`ResetSpriteData` + `ClearSpritesHealthboxAnimData`),
   so the healthbox and battler bounce sprites are recreated and restart `DoBounceEffect` at age 0
   (`sSinIndex` 128 healthbox / 192 mon, delta 7; healthbox `y2` is 1 for index 0..127, else 0; period ~36.6 frames).
2. **The open window keeps bouncing.** During the party-open fade-out the ROM bounce keeps running (no reset until the menu
   is left). The renderer now uses `idleBounceElapsed + battleCommandBounceAgeOffset + openElapsed` as the bounce tick;
   the old fixed offsets (`PARTY_SELECT_OPEN_HEALTHBOX_Y2_START` 7 / `PARTY_SELECT_OPEN_BACK_SPRITE_Y2_START` 16) are deleted.
   Canonical party traces are unchanged by the replacement; OFF cancel 265 -> 276 / 300.
3. **Party-icon anim by HP level.** `party_menu.c UpdateHPBar -> SetPartyHPBarSprite` picks pokemon_icon `sAnim_0..4`
   (0 full, 1 green, 2 yellow, 3 red, 4 fainted; 48-px fractions: >24 green, >9 yellow, >0 red). Frame durations
   d = 6 / 8 / 14 / 22 / 29, cycle 2d+3 = 15 / 19 / 31 / 47 / 61 ticks (frame 0 shows d+1 ticks, frame 1 d+2).
   `sAnim_4` repeats frame 0, so only the selected-slot `y2` bounce steps. `monIconAnimForHp`, `monIconFrameAt(elapsed, anim)`,
   `monIconSelectedY2(elapsed, selectedSince, anim)` in `battlePartySelect.ts`.
4. **Icon creation tick** is the open fade-in start: `MON_ICON_CREATION_ELAPSED_OFFSET = -45`.
5. **No y2 hold at menu-open selection.** `SpriteCB_BouncePartyMonIcon` sets `y2 = -3` on the first anim copy, so an
   initially selected slot has no hold (`MON_ICON_MENU_OPEN_SELECTED_SINCE`). The submenu-open encoding keeps its old lead
   (`MON_ICON_SUBMENU_SELECT_LEAD = 30`).

## Measurements (`npm run compare`, frames matched)

| trace | before | after |
| --- | --- | --- |
| flw252-bob1-cancel-off | 246 / 300 | 276 / 300 |
| flw252-bob1-cancel-on | — | 258 / 300 |
| flw252-bob1-scroll-off | — | 380 / 420 (369 before the open-window change) |
| flw252-bob1-scroll-on | — | 362 / 420 |
| flw252-bob1-hp-off | 977 / 1100 | 1029 / 1100 |
| turn15-party-select(-delayed) | 200 / 200 | 200 / 200 |
| battle1-swap-enemy-pkmn-return | 115 / 115 | 115 / 115 |
| flw252-held-question-down | 142 / 142 | 142 / 142 |
| flw252-party-fade-on | 261 / 340 | 261 / 340 |
| mid-battle-switch-dense-a-off | 317 / 395 | 317 / 395 |

`compare:differential` against the previous commit: 13 of 15 party / switch traces byte-identical; the two that differ
(flw252-party-fade-on, mid-battle-switch-dense-a-off, in the open fade window) keep the same oracle match count.

Labs: `tools/battle-lab/flw252-bob1-{cancel,scroll}-{on,off}.json`, `flw252-bob1-hp-off.json` (+ traces).

## Residuals (not landed)

- The lab/stage party-open black hold is one frame longer in the ROM (28 vs 27; fade-in 88..103 vs ours 87..102), so icons
  are then 1 frame early. Pre-existing in flw252-party-fade-on; cause unproven (single-frame `ShowPartyMenu` init; likely
  lab party-content CPU lag). hp-off's remaining misses are exactly this hold.
- Stage `bounceAge` hand-fit glitches at OFF frame 31 / ON frame 38; frame 1 cursor lag.
- ON frames 41..58 opponent-sprite region (ON opponent idle anim) — unrelated to the bob.
- Yellow-level (anim 2) and fainted / forced-menu icon phase (creation tick for a forced open) are not ROM-verified;
  red (47-cycle) and the fainted `y2` cadence (30 / 31) are.
