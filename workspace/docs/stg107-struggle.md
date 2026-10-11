# stg107 (S10A side lane, 2026-10-11): Struggle 165 — ROM ground truth, real forced-Struggle routes, banked live adapter

Scope: `docs/struggle-integration-scope.md` (the user's 2026-10-11 decision). Evidence + banked patch, new files only; base master
`52c181d54` (production src `14d1be159`). Direct mGBA only (never the shared HTTP oracles), lab seed pinned 305420349.

## Results

- **Rung 1 — source + routes: done.** Move_STRUGGLE reuses AnimTask_ShakeMonInPlace (ported), the basic hitsplat (ported, live in
  Thunder Punch / Pursuit / Return), monbg / setalpha 12, 8 / clearmonbg / blendoff (live in many bodies). New: the
  ANIM_TAG_MOVEMENT_WAVES asset (not extracted; `tools/extract/stg107-extract-movement-waves.ts` writes it) and the
  AnimMovementWaves sprite program. No Random / Random2 (no D3). No CPU-phase variation in any window (no D4 evidence needed).
  Real routes (§2) force Struggle for the player through the ROM's FIGHT → "has no moves left!" flow, and for the opponent AI, by
  **Taunt** (deterministic, no RNG) and by **PP exhaustion** (a 5-PP move against Pressure).
- **Rung 2 — ROM dense windows: done.** 19 Struggle windows on 11 routes, both orientations, 7 species pairs (elevated Golbat and
  big-picture Snorlax as attacker and as target), first + repeated Struggles in one battle (2 or 3 per battle), Struggle into a
  Substitute doll, the attacker fainting from its own recoil (Shedinja), Struggle KO-ing the target (Shedinja). **Every window is 111
  rows** (activation .. first inactive frame), the same event ages everywhere; two fresh batches give byte-identical receipts
  (r1 == r2). Scene OFF controls (same routes, OFF bootstrap): no body, identical gameplay; on the Taunt routes every Struggle body's
  turn is exactly 81 frames shorter OFF from the body on (HP / recoil / faint / turn-end frames), r1 == r2 (§2).
- **Rung 3 — banked patch: done.** `tools/integration/fixtures/stg107/stg107-struggle.diff` (applied only to a git-archive copy of
  `52c181d54`) makes Struggle a live body through the normal seam. Through the PRODUCTION live renderer (`stg107Patched.sh`:
  audit20Probes → audit20Fixtures → audit20Check in the patched copy, two fresh probes each): **15 / 15 live Struggle windows are
  0 px on all 112 rows, chain and entry lends, r1 == r2**, both orientations, every pair above (elevated Golbat attacker and target,
  big-picture Snorlax, KO target, recoil faint, first and repeated bodies, both routes). 4 windows fail closed with named gates (§3.3).
  Patched-copy typecheck passes; touched tests 194 / 195 (the one failure is the expected #142 shadow-table pin, §3.4).
  Census 0..999 on the patched copy: **+884 Struggle commands live, 0 other status changes**, keys and
  battleDigestExcludingFrames identical (§3.5).

## 1. Source (reference/pokeemerald)

`data/battle_anim_scripts.s:3045-3062` Move_STRUGGLE. Ages are rows after the activation (gAnimScriptActive rising edge = age 0),
measured identically on all 19 windows (§2).

| Command | Component | Production today | What the land step adds |
|---|---|---|---|
| `loadspritegfx ANIM_TAG_IMPACT` | hitsplat tiles / palette | `src/assets/gen/battle-anim-hitsplat.json`; known-entry allocation tile 305 / palette slot 7 (Return, Pursuit) | nothing (the IMPACT load follows the waves here: its tile base / palette slot differ — see §3) |
| `loadspritegfx ANIM_TAG_MOVEMENT_WAVES` | `gBattleAnimSpriteGfx_MovementWaves` (`graphics/battle_anims/sprites/movement_waves.png`, 32x96 4bpp = 3 frames of 32x32, 0x600 bytes) + its `.gbapal` | **not extracted** (no production file mentions it) | NEW asset `src/assets/gen/battle-anim-movement-waves.json` from `tools/extract/stg107-extract-movement-waves.ts` |
| `monbg ANIM_TARGET` | MoveBattlerSpriteToBG + Task_UpdateMonBg | live (Thunder Punch 9, Pursuit 228, Return 216 = ANIM_DEF_PARTNER, same in singles) | reuse: target hidden from age 7, BG cnt write age 8 |
| `setalpha 12, 8` | BLDCNT 0x3F40 / BLDALPHA 0x080C | live (same bodies) | reuse: rows 10..86 |
| `createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_ATTACKER, 3, 0, 12, 4` | `src/animation/shakeMonInPlace.ts shakeMonInPlaceSequence` | ported; proven users (doubleEdge, takeDown, superFang, hiJumpKick, slam, skyUppercut, thrash) all run frameDelay 1 | first **frameDelay 4** user: attacker x2 -3 at 10, then ±3 every 5 rows from 14, 0 at 64 = `sequence[age - 10 + 1]` (the creating frame runs the task twice: its synchronous first step and RunTasks) |
| `createsprite gMovementWavesSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 2` / `…, 0, 1, 2` | `battle_anim_effects_2.c:1158` template (32x32 ObjNormal, affine off), `AnimMovementWaves` :3624 / `_Step` :3655, anims `gMovementWavesAnimCmds1` (frames 0, 16, 32, 16 x 8 ticks) / `Cmds2` (16, 32, 16, 0 hFlip) | NEW sprite program | 2 sprites created at age 10 (slots 3 / 4, lowest free), x = attacker X_2 + 32 / - 32, y = attacker Y_PIC_OFFSET, subpriority = attacker subpriority - 2 (player 28, opponent 38); anim command index rows 10 / 17 / 25 / 33, restart 42 / 50 / 58 / 66 (data[0] = 2 cycles), last visible row 74, destroyed at 75 |
| `loopsewithpan SE_M_HEADBUTT, …, 12, 4` | Task_LoopAndPlaySE (sound only) | — | no visual |
| `waitforvisualfinish` | — | — | ends at 75 |
| `create_basic_hitsplat_sprite ANIM_ATTACKER, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=2` | gBasicHitSplatSpriteTemplate / AnimHitSplatBasic (no Random; the random-position hitsplat is a different template) | ported (Return / Pursuit / Thunder Punch) | created at age 76 in slot 3 (the freed wave slot), at the target X_2 / Y_PIC_OFFSET, subpriority = attacker subpriority - 3 (27 / 37), affine anim 2, last row 85 |
| `createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 3, 0, 6, 1` | same port | ported | target x2 -3 at 76, +3 at 77, then ±3 every 2 rows, 0 at 85 = `sequence[age - 76 + 1]`; the target is on the BG (monbg) so the shake drives the BG scroll |
| `waitforvisualfinish; clearmonbg ANIM_TARGET; blendoff; end` | Task_ClearMonBg | live | blend off and target back on OBJ at 87; first inactive row 111 |

- **D3:** no `Random` / `Random2` in Move_STRUGGLE, AnimMovementWaves, AnimHitSplatBasic or AnimTask_ShakeMonInPlace.
- **D4:** none observed — all 19 windows (two orientations, 7 pairs, first / later bodies, doll / KO / recoil-faint) have the same
  length and the same event ages, twice fresh.
- Gameplay: `MOVE_STRUGGLE` (`src/data/battle_moves.h:2148`) is EFFECT_RECOIL, 50 power, accuracy 100; Cmd_typecalc skips type
  effectiveness for Struggle (it hits Ghosts and Shedinja through Wonder Guard); recoil = 1/4 of the damage, ignoring Rock Head
  (BattleScript_MoveEffectRecoil's `jumpifmove MOVE_STRUGGLE`). The TS engine pin is
  `tests/factoryBattleScriptNoPpStruggleFullTurn.test.ts` (unchanged here).

## 2. Real forced-Struggle routes and ROM windows

`tools/integration/stg107Stage.py` builds every scenario from `tools/battle-lab/mechanic-taunt-player-murkrow-opponent-shuckle.json`
(the lab envelope only) with `overrides.parties` = three complete legal members per side (no transient state). Fast member: Jolly,
speed IV 31 / EV 252, HP EV 252. Slow member: Brave, speed IV 0 / EV 0. Bench: Chansey 113, Onix 95 (Tackle). Lab species are
INTERNAL ids (Shedinja 303, Dusclops 362).

**Route TAUNT (no RNG).** The struggler knows Harden 106 x4 (power 0, so CheckMoveLimitations' taunt bit covers every slot; Harden,
not Splash, so every body of the battle has a live adapter for the render check); the target is faster and knows Taunt 269.
- T1: Taunt lands first (tauntTimer 2), the struggler's Harden fails; ENDTURN_TAUNT -> 1.
- T2: every move is unusable -> `BattleScript_NoMovesLeft` -> MOVE_STRUGGLE; the target's Taunt fails (timer 1); ENDTURN -> 0.
- T3: Taunt again; T4: Struggle again (every second turn for the rest of the battle).
- **Player input recipe:** each turn = `A` (FIGHT), 30 idle, `A`, 1500 idle (plans48Probe.TURN with 1500). On a Struggle turn the
  first `A` prints "<mon> has no moves left!" and the turn runs — no move menu opens; the second `A` lands inside that message.
- **Opponent:** player inputs are the same (the player's Taunt in slot 1); the AI's four Harden slots are all unusable and the same
  selection state forces Struggle (the opponent controller skips the selection string).
- Measured input timing: a Taunt turn (and the doll-hit turn) holds a message until the next `A` press, so it consumes the next input
  group: input groups 1 / 3 / 4 / 6 start turns T1 / T2 / T3 / T4 (turn-counter changes at frames 1610 / ~3590 / 6212 / ~8190).
- **Doll:** opponent struggler, the player Golbat (Taunt, Substitute) — input groups `t t s b t s t` (`s` = RIGHT then A:
  Substitute; `b` = LEFT then A: Taunt). T2: Substitute (doll up), then the opponent's Struggle hits the doll.

**Route PP (the census route).** The struggler knows only Mean Look 212 (5 PP) and is faster; the target Dusclops 362 (Pressure,
ability slot 0) knows Harden x4 (it raises Defense each turn, so later Struggles deal less). Pressure costs 2 PP per use (5 -> 3 -> 1 -> 0): T1..T3 Mean Look (T2 / T3 fail, PP still spent),
Struggle from T4 on, every turn. Same TURN input for both orientations.

| Window (`stg107-` scenario #) | Struggler side | Attacker -> target | Activation frame | Rows | HP at activation (ply/opp) | HP events (age: ply/opp) | Waves / hitsplat (slot, order position, subpriority) | Rows digest |
|---|---|---|---|---|---|---|---|---|
| opp-143-303 #1 (KO target) | opponent | Snorlax -> Shedinja | 3296 | 111 | 1/267 | 204:0/267 -> 215:0/266 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 67f7999c33c0501f |
| opp-143-42-sub #1 (doll) | opponent | Snorlax -> Golbat (doll) | 3438 | 111 | 137/267 | 1210:137/257 (recoil after the held message) | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 8088dda8015ebd54 |
| opp-143-95 #1 | opponent | Snorlax -> Onix | 3292 | 111 | 142/267 | 172:122/267 -> 187:122/262 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | f26a1f228a8ad82d |
| opp-143-95 #2 | opponent | Snorlax -> Onix | 7894 | 111 | 122/262 | 173:101/262 -> 188:101/257 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 62dfce5b1f3d61b3 |
| opp-303-42 #1 (recoil faint) | opponent | Shedinja -> Golbat | 3295 | 111 | 182/1 | 186:148/1 -> 248:148/0 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | e963289d6716f8ff |
| opp-42-135 #1 | opponent | Golbat -> Jolteon | 3294 | 111 | 172/182 | 187:137/182 -> 205:137/174 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 723660e747cc9544 |
| opp-42-135 #2 | opponent | Golbat -> Jolteon | 7896 | 111 | 137/174 | 190:99/174 -> 209:99/165 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | b248a0ea1df63f2f |
| opp-pp-95-362 #1 | opponent | Onix -> Dusclops | 4680 | 111 | 147/142 | 156:143/142 -> 167:143/141 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 533c750a74ac5f8a |
| opp-pp-95-362 #2 | opponent | Onix -> Dusclops | 6214 | 111 | 143/141 | 156:139/141 -> 167:139/140 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 3970a589585f49d6 |
| opp-pp-95-362 #3 | opponent | Onix -> Dusclops | 7748 | 111 | 139/140 | 155:136/140 -> 166:136/139 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | a6f6589b8619a501 |
| ply-143-303 #1 (KO target) | player | Snorlax -> Shedinja | 3299 | 111 | 267/1 | 204:267/0 -> 215:266/0 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | c57d0ff7695fcbae |
| ply-213-143 #1 | player | Shuckle -> Snorlax (big) | 3298 | 111 | 127/267 | 169:127/250 -> 183:123/250 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | f30d0b3fdcda020f |
| ply-213-143 #2 | player | Shuckle -> Snorlax (big) | 7900 | 111 | 123/250 | 170:123/232 -> 184:119/232 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | bd65bbb1a58f6575 |
| ply-303-42 #1 (recoil faint) | player | Shedinja -> Golbat | 3298 | 111 | 1/182 | 189:1/145 -> 251:0/145 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | badd61d2f7f43e19 |
| ply-95-42 #1 | player | Onix -> Golbat (elevated) | 3294 | 111 | 142/182 | 177:142/157 -> 193:136/157 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | 0f79f974732a6c36 |
| ply-95-42 #2 | player | Onix -> Golbat (elevated) | 7896 | 111 | 136/157 | 178:136/131 -> 194:130/131 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | 25a5085b81634afe |
| ply-pp-95-362 #1 | player | Onix -> Dusclops | 4679 | 111 | 142/147 | 157:142/142 -> 168:141/142 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | aef6fe7fa29da171 |
| ply-pp-95-362 #2 | player | Onix -> Dusclops | 6213 | 111 | 141/142 | 156:141/138 -> 167:140/138 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | a239028e67caa7b6 |
| ply-pp-95-362 #3 | player | Onix -> Dusclops | 7747 | 111 | 140/138 | 171:140/119 -> 264:136/119 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | dc5ca9d63b0361a6 |

Per-row detail (`tools/integration/fixtures/stg107/struggle-windows-on.jsonl`, `kind: struggle`): register change rows (monbg BG cnt
at 8, blend 10..86, off at 87), attacker / target x2 / y2 / invisible change rows, every new sprite's slot, tileTag, position, anim
command rows, attr0..2 rows and order position, task-list change rows, and a digest of all 114 row framebuffer hashes (activation ..
first inactive + 2). The next instruction after the body is the target's HP bar drain (the damage HP write 162..204 rows after
activation), then the recoil drain on the attacker (12..18 rows later; 62 rows later when it faints).

**Scene OFF controls** (`fixtures/stg107/timing-off.jsonl`, the same 11 routes on `factory-battle-scene-off.json`): no Struggle body
plays, and HP, recoil, KO, faint and turn count are identical ON / OFF. Frame offsets (OFF minus ON, paired events):
- the 9 Taunt routes: 0 before the first Struggle body, then exactly -81 for its damage, recoil, faint and turn end (e.g. ply-95-42:
  damage 3471 -> 3390, recoil 3487 -> 3406, turn end 3588 -> 3507; ply-303-42 recoil faint 3549 -> 3468). The Taunt turn's held
  message absorbs its own body, so the offset stays -81 after a repeated Struggle;
- the doll turn: -71 (its recoil follows the held "took damage" message);
- the PP routes: -71 / -81 / -152 / -211, because the ON-only Mean Look / Harden bodies also add frames.

Gameplay (HP, recoil, KO, faint, turn count) is identical ON / OFF.

## 3. Banked patch (rung 3)

### 3.1 What the patch adds (new or changed production files; nothing else)

| File | Change |
|---|---|
| `src/assets/gen/battle-anim-movement-waves.json` (NEW) | `tools/extract/stg107-extract-movement-waves.ts` output (3 frames x 16 tiles, palette, anim tables) |
| `src/animation/struggle.ts` (NEW) | the source program: ages (monbg 7, setalpha 10, waves 10, waves destroyed 75, splat 76 for 10 rows, clearmonbg 87, first inactive 111 → 112 rows), `struggleAttackerOamX2` / `struggleTargetX2` on `shakeMonInPlaceSequence(3, 0, 12, 4)` / `(3, 0, 6, 1)`, `struggleWaveFrame` + `STRUGGLE_WAVE_ANIMS` (gMovementWavesAnimTable), `struggleDisplayPlan` (decodes the hardware OAM with `decodeGbaHardwareOam`; Return's monbg display rules) |
| `src/engine/liveOamMoves.ts` | `liveStruggleInputs`: per-row sprite state → `buildLiveHardwareOam` / `carryLiveSpriteOrder` over the lent order (Return's assembler pattern), palette (IMPACT bank 23 from row 2, MOVEMENT_WAVES bank 24 from row 3, monbg copy from row 7), registers (S0 + monbg cnt / scroll + setalpha) |
| `src/animation/sceneOnPresentation.ts` | `SceneOnStruggleConfig` (union member), `sceneOnStruggleDisplayPlan` |
| `src/engine/battleScene.ts` | the `STRUGGLE` branch: Return's monbg / battler / blended-hitsplat composition + the two 32x32 ObjNormal waves (`drawSpriteSheetFlipped`, hFlip from attr1) |
| `src/engine/core.ts` | app dispatch of `STRUGGLE` |
| `src/engine/liveMoveAnimation.ts` | duration case 165 = 112; presentation case 165 (Return's gates: known lend, a later body only with zero idle rests, non-shiny); `LIVE_MOVE_OPPONENT_SHADOW_ROW` += 165 (row 0: the window starts at activation) |

Two source facts the first render exposed (both now in `struggle.ts`, neither fitted):
- **The OAM is built after AnimateSprites but before RunTasks.** A task's x2 write therefore reaches the OAM one row later than a
  sprite callback's, except the creating script command's synchronous first step (`sequence[state - created]` for the attacker OBJ).
  Before the fix, rows 15, 20, …, 65 differed (1,238..1,663 px each). The target's shake drives the BG scroll through Task_UpdateMonBg
  in the same RunTasks pass, so it keeps Return's `x2[age - 1]` scroll rule.
- **The elevated-target ground shadow on row 0** is drawn by the #142 table, not by the branch (200 px at age 0 before 165 joined it).

No order-host / allocator plan entry is needed for the body itself: every probed activation (after Taunt, Mean Look, Harden,
Substitute and earlier Struggles) has the known-entry allocator state, and the body lends like Return. Struggle has **no plan entry**
in `spriteOrderProductionPlans.ts` yet, so the host's state after a Struggle body is unchanged from today. Bodies after a Struggle lend
exactly as they do at base (the census below shows no other status change). A plan entry (the end order after a Struggle body) is a
separate step that would lift later bodies.

### 3.2 Windows through the production renderer (`fixtures/stg107/patched-windows-summary.txt`)

| Window | Attacker -> target | Result |
|---|---|---|
| ply-95-42 #1 / #2 | Onix -> elevated Golbat | live, 112 / 112 rows 0 px (chain + entry), r1 == r2 |
| ply-213-143 #1 / #2 | Shuckle -> Snorlax (big) | live 0 px |
| ply-143-303 #1 | Snorlax KOs Shedinja | live 0 px |
| ply-303-42 #1 | Shedinja (recoil faint) -> Golbat | live 0 px |
| ply-pp-95-362 #1 / #2 / #3 | Onix -> Dusclops (PP route, later bodies) | live 0 px |
| opp-42-135 #1 / #2 | elevated Golbat -> Jolteon | live 0 px |
| opp-143-95 #1 / #2 | Snorlax (big) -> Onix | live 0 px |
| opp-143-303 #1 | opponent | Snorlax -> Shedinja | 3296 | 111 | 1/267 | 204:0/267 -> 215:0/266 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 67f7999c33c0501f |
| opp-303-42 #1 | opponent | Shedinja -> Golbat | 3295 | 111 | 182/1 | 186:148/1 -> 248:148/0 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | e963289d6716f8ff |
| opp-143-42-sub #1 | opponent | Snorlax -> Golbat | 3438 | 111 | 137/267 | 1210:137/257 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 8088dda8015ebd54 |
| opp-pp-95-362 #1 / #2 / #3 | opponent Onix -> Dusclops, later bodies | **decline** (case-local: later body with a non-zero species rest, ONIX x2 1); the ENTRY lend renders all three 0 px |

### 3.3 Remaining variants (honest list)

- **Doll cell (opponent Struggle into the player's doll):** ROM window banked (opp-143-42-sub #1, 111 rows). An experiment adding
  `[165, ["opponent"]]` to `LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS` gave 139,425 px from row 0 (box 44..96 x 72..111). Mechanism: the
  Struggle branch reads the species sheet maps, not the doll-aware `liveSceneOnBattlerArt`, so it draws GOLBAT where the ROM shows
  the doll. To lift it: draw the battlers through `liveSceneOnBattlerArt` (as the proven doll branches do), then re-run this window.
  The player-orientation doll (the AI's Substitute) has no deterministic route here (the AI cannot be held between Taunt and
  Substitute); a PP-route opponent with Substitute x4 is the next staging.
- **Later bodies with a non-zero idle rest** (an opponent ONIX attacker after other bodies): fail closed by Return's rule; the entry
  lend renders them 0 px. Lifting it needs the x2-history proof Return also lacks.
- Shiny battlers decline (no shiny evidence).
- Not observed in 19 windows: any CPU-phase (D4) variation. Not reachable: Random (D3) — none in the body.

### 3.4 Gates run on the patched copy (`.integration/validation/stg107-pt/copy` = 52c181d54 + the diff)

- `npm run typecheck`: pass.
- `npx vitest run` on tests/liveShadowRows, animation/animationBoundaryRatchet, animation/factoryAnimationInventory,
  factoryBattleScriptNoPpStruggleFullTurn, liveSpriteOrderHost, murkrowTormentSubjectedPresentationRepro, animation/liveReturnAdapter,
  substituteDollAdapterDecline, substituteDollDefenderLive: **194 / 195 pass**. The failure is the expected pin
  `tests/liveShadowRows.test.ts` "pins the constant against the supervisor table in both directions": 165 is in
  `LIVE_MOVE_OPPONENT_SHADOW_ROW` but not yet in the issue-142 shadow-row fixture table. The land step adds a Struggle row
  (`{ id: 165, shadowRow: 0, inWindow: true }`, evidence: the elevated-target windows here).

### 3.5 Census 0..999 on the patched copy

Census 0..999, 10 `--index-from` shards per arm, merged with hist73Merge.py. Base = `ret88Census.sh shards <dir> 52c181d54`; patched =
`stg107Census.sh <dir> <patched copy>`. Receipt: `fixtures/stg107/census-summary.json` (`stg107CensusSummary.py`) plus
land82CensusCheck.py.

| Arm | Commands | Live (count) | Live frames | Struggle commands | Struggle live | Struggle live frames |
|---|---|---|---|---|---|---|
| base 52c181d54 (== the S10A night report) | 27,515 | 26,245 (95.38 %) | 3,932,860 of 3,983,929 (98.72 %) | 1,089 | 0 | 0 of 34,817 |
| patched copy | 27,459 | 27,129 (98.80 %) | 4,031,868 of 4,061,368 (99.27 %) | 1,033 | **884** | 99,008 of 112,256 |

- **0 non-Struggle status changes** on the aligned command prefixes. land82CensusCheck: command keys identical outside the
  stalled tails, `battleDigestExcludingFrames` identical, played / terminal / stalled 1000 / 997 / 3 in both arms, live -> non-live 0.
- **The 56 fewer commands** are the budget-cut tails of the three battles that stall in both arms (seeds 434, 796, 881; Struggle-only
  stalemates). A live Struggle body is 112 rows instead of the fallback's ~32, so the 200,000-frame battle budget ends those battles
  17 / 14 / 25 Struggle commands earlier. Gameplay is unchanged; the comparison tool's equal-length assert cannot run on such pairs
  (`prep43CensusDelta.py` fails), so use land82CensusCheck.py / stg107CensusSummary.py.
- **Struggle declines (149), each with a named gate:**
  - `sprite-order lend unknown` 106: the order host has no known lend at those activations, e.g. after a Struggle body, which has no
    plan entry. The lift candidate is the land step's optional plan entry (§3.6 item 5).
  - `attacker doll: swap body cell unproven` 24: Struggle by a Substitute-doll attacker (LIVE_SUBSTITUTE_SWAP_BODY_CELLS).
  - `defender doll: unproven body cell` 19 (§3.3).
- Headline coverage including Struggle (ordinary play, as the scope requires) rises from 95.38 % / 98.72 % to 98.80 % / 99.27 %.
  The patched arm has fewer commands because of the stall tails above.

### 3.6 What the land step must do

1. Apply `stg107-struggle.diff` (production files above; regenerate the asset with the extractor and compare it byte for byte).
2. **Tests to add:** a `tests/stg107Struggle.test.ts` pinning the program against the ROM rows
   (`fixtures/stg107/struggle-windows-on.jsonl`: attacker / target x2 change rows, wave frame rows, splat 76..85, clearmonbg 87, 112
   rows), the gates (doll declines, later-body rest gate, shiny), and a revert experiment. Also a real-route test: forced Struggle
   through the kernel (the `factoryBattleScriptNoPpStruggleFullTurn` route) is now live with Scene ON/OFF gameplay identical.
3. **Pins to move:** `tests/liveShadowRows.test.ts` (+ its shadow-row fixture, row 0 for 165); `tests/liveStatusImplementedCount.test.ts`
   once 165 joins `LIVE_MOVE_ANIMATION_IDS` (scoped exact: no D3 / D4).
4. **Accounting extension** (do not fold Struggle into the historical 276): `docs/animation-integration-live-status.json`: an
   `additionalRequiredBodies` record for MOVE_STRUGGLE (required → accepted → live, with this doc as evidence); `implementedAdapters`
   / `implementedCount` + 1; drop the `pending` line and `unadaptedNotes.MOVE_STRUGGLE`; keep `currentAcceptedFactoryMoves: 276`.
   `tests/animation/factoryAnimationInventory.test.ts` (+ `ANIMATION_COVERAGE.json`): track 165 as the one required body outside
   the catalogue so global checks accept it without a rental-list entry, and report required / accepted / live separately.
   `docs/live-share-census.md`: report the Struggle bucket in the headline (it is ordinary play).
5. Optional: an order-host plan entry for the end order after a Struggle body (lends after a Struggle), and the doll / rest variants.

## 4. Reproduction (from workspace/; direct mGBA only)

```
sh tools/integration/stg107Run.sh .integration/validation/<fresh>                 # ON windows x2 + OFF timing x2: r1 == r2, same / DIFF vs fixtures
STG107_PATCH=1 sh tools/integration/stg107Run.sh .integration/validation/<fresh>  # + the banked patch through the production renderer (~3 min)
sh tools/integration/ret88Census.sh shards .integration/validation/<base> 52c181d54                    # census, base arm (~5 min)
sh tools/integration/stg107Census.sh .integration/validation/<patched> .integration/validation/<fresh>/patched/copy
sh tools/integration/ret88Census.sh compare .integration/validation/<base> .integration/validation/<patched> .integration/validation/<cmp>
```
The Splash -> Harden change: Splash has no live adapter, and audit20Check aborts a whole scenario when any body lacks one, so the
routes use Harden (power 0, so Taunt still blocks it; it has a live adapter).
