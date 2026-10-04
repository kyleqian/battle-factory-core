# ISSUES #142 scope scan (all live adapters)

Evidence only. Script: `tools/integration/issue142Scan.ts` (run: `node --experimental-strip-types tools/integration/issue142Scan.ts`, ~7 s). Data: `tools/integration/fixtures/issue142-scan.json`.

## Method
* For each id in `LIVE_MOVE_ANIMATION_IDS` (110 ids) the production `renderBattleResolutionLiveView` renders a displayed field PHANPY (player) vs GOLBAT (opponent, elevated), with the sprite-allocator input production passes when one exists. GOLBAT is the target (player attacks) and the attacker (request.attacker=1), at age 0 and age 1.
* Shadow present = count of the 200 mask pixels of `battle-enemy-shadow.json` (placed at 160,65 as `drawSourceOpponentEnemyShadow`, `battleScene.ts:5160`) that hold the shadow colour. Control: ONIX opponent target age 0 = 0 px for every id (no false positives). Source expectation: 200 at age 0, 0 at age 1.
* Opponent idle: ONIX (rest x2=1) opponent attacker, ages 0,1,2,6, compared to a scratch twin of `src/` (`.integration/issue142-zero-idle`, gitignored) where `speciesFrontIdleRestOffsetOrZero` returns 0. Identical frames = the live branch never applies the opponent-attacker rest offset. Caveat: this only detects branches where the offset matters visually for an ONIX attacker; it says nothing about whether the source applies it for that move (Sandstorm and Hyper Fang show it does for those two; the doc `altspecies-live-evidence.md` already established it).

## Summary
* row 1 shadow is absent for all 110 ids in both roles (`shadowStillAtRow1` empty): nothing draws it too late. The defect is purely a missing row-0 draw.
* Correct shadow at row 0 as target: 9 ids (2, 23, 108, 131, 154, 158, 163, 242, 306). Correct as attacker: 21 ids (those 9 + 12, 14, 49, 56, 65, 78, 79, 103, 114, 180, 211, 246 -- the existing `drawSourceOpponentEnemyShadow` call sites draw it for opponent attackers only).
- missingShadowAsTarget (101: 5, 9, 11, 12, 14, 21, 25, 27, 29, 34, 36, 38, 39, 41, 42, 43, 44, 47, 48, 49, 50, 51, 55, 56, 61, 65, 66, 67, 68, 74, 75, 78, 79, 83, 92, 93, 94, 95, 97, 101, 103, 105, 106, 109, 112, 113, 114, 115, 122, 124, 136, 147, 148, 151, 156, 162, 172, 178, 180, 182, 186, 188, 197, 201, 204, 208, 211, 213, 223, 227, 231, 232, 235, 238, 243, 246, 247, 257, 259, 264, 272, 277, 280, 281, 287, 290, 294, 302, 305, 319, 320, 321, 325, 334, 335, 336, 337, 341, 342, 343, 347)
- missingShadowAsAttacker (89: 5, 9, 11, 21, 25, 27, 29, 34, 36, 38, 39, 41, 42, 43, 44, 47, 48, 50, 51, 55, 61, 66, 67, 68, 74, 75, 83, 92, 93, 94, 95, 97, 101, 105, 106, 109, 112, 113, 115, 122, 124, 136, 147, 148, 151, 156, 162, 172, 178, 182, 186, 188, 197, 201, 204, 208, 213, 223, 227, 231, 232, 235, 238, 243, 247, 257, 259, 264, 272, 277, 280, 281, 287, 290, 294, 302, 305, 319, 320, 321, 325, 334, 335, 336, 337, 341, 342, 343, 347)
- missingOpponentIdle (82: 5, 9, 11, 12, 14, 21, 25, 27, 29, 34, 39, 42, 43, 44, 49, 50, 51, 55, 56, 61, 65, 66, 67, 68, 74, 75, 83, 97, 101, 105, 106, 108, 109, 112, 113, 114, 115, 122, 124, 136, 148, 151, 156, 162, 172, 180, 182, 186, 188, 201, 204, 208, 211, 213, 223, 227, 231, 232, 235, 238, 243, 257, 259, 264, 272, 277, 280, 281, 287, 290, 294, 302, 319, 321, 325, 334, 335, 336, 341, 342, 343, 347)
* Idle: 28 ids already apply the opponent-attacker rest offset; the list above is the rest. (Branches with the code shape but whose offset is irrelevant for the scan species are still reported as missing; recheck after the fix.)
* No render errors.

## Source draw order (reference/pokeemerald)
* Shadow OBJ: `gSpriteTemplate_EnemyShadow` (`battle_anim_smokescreen.c:149`) with `sOamData_EnemyShadow` (`:132`) **oam.priority = 3** (line 144), 32x8; created by `LoadAndCreateEnemyShadowSprites` (`battle_gfx_sfx_util.c:1186`) with **subpriority 0xC8 = 200** at battler coord + (0, 29).
* Visibility: `SpriteCB_EnemyShadow` (`battle_gfx_sfx_util.c:1203`) sets `invisible` only when `gAnimScriptActive` (line 1214) is seen, hence still displayed on the first displayed move row (one-frame lag, matches ROM evidence).
* Battlers: `oam.priority = 2` (`battle_anim_mons.c:2030`), subpriorities 20/30/40/50 (`GetBattlerSpriteSubpriority`, `:2035`; opponent 40). Most effect sprites use priority 2 or lower (more in front); a few are set to 3 (`battle_anim_mons.c:2430`, `battle_anim.c:1797`).
* Order: `BuildOamBuffer` (`sprite.c:325`) -> `BuildSpritePriorities`/`SortSprites`: OBJ priority first (lower value in front), then larger subpriority is further back. The shadow has the highest priority value (3) and the largest subpriority (200), so it is the **rearmost OBJ** in every case, including against priority-3 effect sprites. Relative to BG layers an OBJ beats a BG of equal priority, so it is above BG3 (battle background) and below only BG layers with a smaller priority number.
* **Verdict:** drawing the shadow immediately after the field background and before battler/effect sprites is source-correct in every branch, with one caveat: where a live branch paints a full-screen BG-priority-<3 overlay (move background / blend / window) at age 0 the shadow should go before that overlay, not after the battle BG only. At age 0 (the only age it matters) the standard rectangle x160-191, y65-72 can be overlapped by an effect sprite or by the battler itself (the opponent body is centred at 176,40 with elevation, so a tall body can reach y65+); all of those are priority <=2 or priority 3 with subpriority < 200 and therefore draw over the shadow. They must not be drawn first and then covered.

## Recommended fix point
Single generic insertion in `renderBattleResolutionLiveView` (`battleScene.ts`, ~54375): right before/inside `renderSceneOnMovePresentation(fb, presentation, true)` (`:54389`) is not enough (each branch redraws its own background inside it). Preferred: in `renderSceneOnMovePresentation` (`battleScene.ts:14838`; the :32942-:32972 frames seen in the chain data are inside it) after the common field background and before the dispatch to the move branches, when `age === 0` and `liveField`, call `drawSourceOpponentEnemyShadow(fb, opponent.species, opponent.geometry.battlePositionCenter)` -- but only for branches that do not draw their own background after it. Because most branches call `drawTileBg` themselves (chains show drawTileBg first), the lower-risk single point is a post-hook per branch BG: wrap/extend the shared background helper the branches use (`drawTileBg` `:4319` callers with the battle bg tileset) with an optional `rowZeroShadow` argument, or add a helper `drawLiveOpponentRowZeroShadow(fb, view, age)` and call it right after each branch's `drawTileBg`. Remove (or make idempotent) the existing age>=1 call sites so row 1 stays absent. The opponent-attacker idle needs the analogous shared `opponentIdle = attacker is opponent ? speciesFrontIdleRestOffsetOrZero(attacker.species) : 0` (see Sandstorm `:17798`), source-checked per move.

## Per-id table
Pixel columns: 200 = source-correct at row 0, 0 = missing. "row1 absent" = the row-1 shadow is absent as required.

| id | move | tgt row0 | atk row0 | row1 absent | opp-atk idle  |
|---|---|---|---|---|---|
| 2 | KARATE_CHOP | 200 | 200 | yes | yes  |
| 5 | MEGA_PUNCH | 0 | 0 | yes | no  |
| 9 | THUNDER_PUNCH | 0 | 0 | yes | no  |
| 11 | VICE_GRIP | 0 | 0 | yes | no  |
| 12 | GUILLOTINE | 0 | 200 | yes | no  |
| 14 | SWORDS_DANCE | 0 | 200 | yes | no  |
| 21 | SLAM | 0 | 0 | yes | no  |
| 23 | STOMP | 200 | 200 | yes | yes  |
| 25 | MEGA_KICK | 0 | 0 | yes | no  |
| 27 | ROLLING_KICK | 0 | 0 | yes | no  |
| 29 | HEADBUTT | 0 | 0 | yes | no  |
| 34 | BODY_SLAM | 0 | 0 | yes | no  |
| 36 | TAKE_DOWN | 0 | 0 | yes | yes  |
| 38 | DOUBLE_EDGE | 0 | 0 | yes | yes  |
| 39 | TAIL_WHIP | 0 | 0 | yes | no  |
| 41 | TWINEEDLE | 0 | 0 | yes | yes  |
| 42 | PIN_MISSILE | 0 | 0 | yes | no  |
| 43 | LEER | 0 | 0 | yes | no  |
| 44 | BITE | 0 | 0 | yes | no  |
| 47 | SING | 0 | 0 | yes | yes  |
| 48 | SUPERSONIC | 0 | 0 | yes | yes  |
| 49 | SONIC_BOOM | 0 | 200 | yes | no  |
| 50 | DISABLE | 0 | 0 | yes | no  |
| 51 | ACID | 0 | 0 | yes | no  |
| 55 | WATER_GUN | 0 | 0 | yes | no  |
| 56 | HYDRO_PUMP | 0 | 200 | yes | no  |
| 61 | BUBBLE_BEAM | 0 | 0 | yes | no  |
| 65 | DRILL_PECK | 0 | 200 | yes | no  |
| 66 | SUBMISSION | 0 | 0 | yes | no  |
| 67 | LOW_KICK | 0 | 0 | yes | no  |
| 68 | COUNTER | 0 | 0 | yes | no  |
| 74 | GROWTH | 0 | 0 | yes | no  |
| 75 | RAZOR_LEAF | 0 | 0 | yes | no  |
| 78 | STUN_SPORE | 0 | 200 | yes | yes  |
| 79 | SLEEP_POWDER | 0 | 200 | yes | yes  |
| 83 | FIRE_SPIN | 0 | 0 | yes | no  |
| 92 | TOXIC | 0 | 0 | yes | yes  |
| 93 | CONFUSION | 0 | 0 | yes | yes  |
| 94 | PSYCHIC | 0 | 0 | yes | yes  |
| 95 | HYPNOSIS | 0 | 0 | yes | yes  |
| 97 | AGILITY | 0 | 0 | yes | no  |
| 101 | NIGHT_SHADE | 0 | 0 | yes | no  |
| 103 | SCREECH | 0 | 200 | yes | yes  |
| 105 | RECOVER | 0 | 0 | yes | no  |
| 106 | HARDEN | 0 | 0 | yes | no  |
| 108 | SMOKESCREEN | 200 | 200 | yes | no  |
| 109 | CONFUSE_RAY | 0 | 0 | yes | no  |
| 112 | BARRIER | 0 | 0 | yes | no  |
| 113 | LIGHT_SCREEN | 0 | 0 | yes | no  |
| 114 | HAZE | 0 | 200 | yes | no  |
| 115 | REFLECT | 0 | 0 | yes | no  |
| 122 | LICK | 0 | 0 | yes | no  |
| 124 | SLUDGE | 0 | 0 | yes | no  |
| 131 | SPIKE_CANNON | 200 | 200 | yes | yes  |
| 136 | HI_JUMP_KICK | 0 | 0 | yes | no  |
| 147 | SPORE | 0 | 0 | yes | yes  |
| 148 | FLASH | 0 | 0 | yes | no  |
| 151 | ACID_ARMOR | 0 | 0 | yes | no  |
| 154 | FURY_SWIPES | 200 | 200 | yes | yes  |
| 156 | REST | 0 | 0 | yes | no  |
| 158 | HYPER_FANG | 200 | 200 | yes | yes  |
| 162 | SUPER_FANG | 0 | 0 | yes | no  |
| 163 | SLASH | 200 | 200 | yes | yes  |
| 172 | FLAME_WHEEL | 0 | 0 | yes | no  |
| 178 | COTTON_SPORE | 0 | 0 | yes | yes  |
| 180 | SPITE | 0 | 200 | yes | no  |
| 182 | PROTECT | 0 | 0 | yes | no  |
| 186 | SWEET_KISS | 0 | 0 | yes | no  |
| 188 | SLUDGE_BOMB | 0 | 0 | yes | no  |
| 197 | DETECT | 0 | 0 | yes | yes  |
| 201 | SANDSTORM | 0 | 0 | yes | no  |
| 204 | CHARM | 0 | 0 | yes | no  |
| 208 | MILK_DRINK | 0 | 0 | yes | no  |
| 211 | STEEL_WING | 0 | 200 | yes | no  |
| 213 | ATTRACT | 0 | 0 | yes | no  |
| 223 | DYNAMIC_PUNCH | 0 | 0 | yes | no  |
| 227 | ENCORE | 0 | 0 | yes | no  |
| 231 | IRON_TAIL | 0 | 0 | yes | no  |
| 232 | METAL_CLAW | 0 | 0 | yes | no  |
| 235 | SYNTHESIS | 0 | 0 | yes | no  |
| 238 | CROSS_CHOP | 0 | 0 | yes | no  |
| 242 | CRUNCH | 200 | 200 | yes | yes  |
| 243 | MIRROR_COAT | 0 | 0 | yes | no  |
| 246 | ANCIENT_POWER | 0 | 200 | yes | yes  |
| 247 | SHADOW_BALL | 0 | 0 | yes | yes  |
| 257 | HEAT_WAVE | 0 | 0 | yes | no  |
| 259 | TORMENT | 0 | 0 | yes | no  |
| 264 | FOCUS_PUNCH | 0 | 0 | yes | no  |
| 272 | ROLE_PLAY | 0 | 0 | yes | no  |
| 277 | MAGIC_COAT | 0 | 0 | yes | no  |
| 280 | BRICK_BREAK | 0 | 0 | yes | no  |
| 281 | YAWN | 0 | 0 | yes | no  |
| 287 | REFRESH | 0 | 0 | yes | no  |
| 290 | SECRET_POWER | 0 | 0 | yes | no  |
| 294 | TAIL_GLOW | 0 | 0 | yes | no  |
| 302 | NEEDLE_ARM | 0 | 0 | yes | no  |
| 305 | POISON_FANG | 0 | 0 | yes | yes  |
| 306 | CRUSH_CLAW | 200 | 200 | yes | yes  |
| 319 | METAL_SOUND | 0 | 0 | yes | no  |
| 320 | GRASS_WHISTLE | 0 | 0 | yes | yes  |
| 321 | TICKLE | 0 | 0 | yes | no  |
| 325 | SHADOW_PUNCH | 0 | 0 | yes | no  |
| 334 | IRON_DEFENSE | 0 | 0 | yes | no  |
| 335 | BLOCK | 0 | 0 | yes | no  |
| 336 | HOWL | 0 | 0 | yes | no  |
| 337 | DRAGON_CLAW | 0 | 0 | yes | yes  |
| 341 | MUD_SHOT | 0 | 0 | yes | no  |
| 342 | POISON_TAIL | 0 | 0 | yes | no  |
| 343 | COVET | 0 | 0 | yes | no  |
| 347 | CALM_MIND | 0 | 0 | yes | no 
 |
## Caveats
* Request/field uses default friendship/power; branches that depend on damage or turn were rendered at their default and could differ.
* Self-targeting moves were rendered with the same attacker/target orientation as other moves (target = other side); the "as target" column for PROTECT-like moves is a bystander reading.
* The per-frame renderer chain (`rendererChainAtAge0` in the JSON) is sampled from a call-stack hook every 4096th pixel write of the twin and is indicative only (usually shows the background draw); locate the move branch through the dispatch in `renderSceneOnMovePresentation`.
* Optional step 3 (fresh direct-mGBA check on an older adapter) was not run (time cap).
