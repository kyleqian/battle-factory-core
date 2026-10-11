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
  (r1 == r2). Scene OFF controls (same routes, OFF bootstrap): no body, every forced-Struggle turn is exactly 81 frames shorter than ON
  from the body on (HP / recoil / faint / turn-end frames), r1 == r2.
- **Rung 3 — banked patch:** see §3.

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

**Route TAUNT (no RNG).** The struggler knows Splash 150 x4 (power 0, so CheckMoveLimitations' taunt bit covers every slot); the
target is faster and knows Taunt 269.
- T1: Taunt lands first (tauntTimer 2), the struggler's Splash fails; ENDTURN_TAUNT -> 1.
- T2: every move is unusable -> `BattleScript_NoMovesLeft` -> MOVE_STRUGGLE; the target's Taunt fails (timer 1); ENDTURN -> 0.
- T3: Taunt again; T4: Struggle again (every second turn for the rest of the battle).
- **Player input recipe:** each turn = `A` (FIGHT), 30 idle, `A`, 1500 idle (plans48Probe.TURN with 1500). On a Struggle turn the
  first `A` prints "<mon> has no moves left!" and the turn runs — no move menu opens; the second `A` lands inside that message.
- **Opponent:** player inputs are the same (the player's Taunt in slot 1); the AI's four Splash slots are all unusable and the same
  selection state forces Struggle (the opponent controller skips the selection string).
- Measured input timing: a Taunt turn (and the doll-hit turn) holds a message until the next `A` press, so it consumes the next input
  group: input groups 1 / 3 / 4 / 6 start turns T1 / T2 / T3 / T4 (turn-counter changes at frames 1610 / ~3590 / 6212 / ~8190).
- **Doll:** opponent struggler, the player Golbat (Taunt, Substitute) — input groups `t t s b t s t` (`s` = RIGHT then A:
  Substitute; `b` = LEFT then A: Taunt). T2: Substitute (doll up), then the opponent's Struggle hits the doll.

**Route PP (the census route).** The struggler knows only Mean Look 212 (5 PP) and is faster; the target Dusclops 362 (Pressure,
ability slot 0) knows Splash x4. Pressure costs 2 PP per use (5 -> 3 -> 1 -> 0): T1..T3 Mean Look (T2 / T3 fail, PP still spent),
Struggle from T4 on, every turn. Same TURN input for both orientations.

| Window (`stg107-` scenario #) | Struggler side | Attacker -> target | Activation frame | Rows | HP at activation (ply/opp) | HP events (age: ply/opp) | Waves / hitsplat (slot, order position, subpriority) | Rows digest |
|---|---|---|---|---|---|---|---|---|
| opp-143-303 #1 (KO target) | opponent | Snorlax -> Shedinja | 3296 | 111 | 1/267 | 204:0/267 -> 215:0/266 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 67f7999c33c0501f |
| opp-143-42-sub #1 (doll) | opponent | Snorlax -> Golbat (doll) | 3438 | 111 | 137/267 | 1210:137/257 (recoil after the held message) | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 8088dda8015ebd54 |
| opp-143-95 #1 | opponent | Snorlax -> Onix | 3292 | 111 | 142/267 | 172:122/267 -> 187:122/262 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | f26a1f228a8ad82d |
| opp-143-95 #2 | opponent | Snorlax -> Onix | 7894 | 111 | 122/262 | 173:101/262 -> 188:101/257 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 62dfce5b1f3d61b3 |
| opp-303-42 #1 (recoil faint) | opponent | Shedinja -> Golbat | 3295 | 111 | 182/1 | 186:148/1 -> 248:148/0 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | e963289d6716f8ff |
| opp-42-135 #1 | opponent | Golbat (elevated) -> Jolteon | 3294 | 111 | 172/182 | 187:137/182 -> 205:137/174 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 723660e747cc9544 |
| opp-42-135 #2 | opponent | Golbat (elevated) -> Jolteon | 7896 | 111 | 137/174 | 190:99/174 -> 209:99/165 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | b248a0ea1df63f2f |
| opp-pp-95-362 #1 | opponent | Onix -> Dusclops | 4680 | 111 | 147/142 | 162:137/142 -> 174:137/140 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 533c750a74ac5f8a |
| opp-pp-95-362 #2 | opponent | Onix -> Dusclops | 6214 | 111 | 137/140 | 162:127/140 -> 174:127/138 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | ae3eddd46d3ac784 |
| opp-pp-95-362 #3 | opponent | Onix -> Dusclops | 7748 | 111 | 127/138 | 162:117/138 -> 174:117/136 | w 3,4 @ord 7,8 sp 38; hs 3 sp 37 | 4571faf3f89504f3 |
| ply-143-303 #1 (KO target) | player | Snorlax -> Shedinja | 3299 | 111 | 267/1 | 204:267/0 -> 215:266/0 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | c57d0ff7695fcbae |
| ply-213-143 #1 | player | Shuckle -> Snorlax (big) | 3298 | 111 | 127/267 | 169:127/250 -> 183:123/250 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | f30d0b3fdcda020f |
| ply-213-143 #2 | player | Shuckle -> Snorlax (big) | 7900 | 111 | 123/250 | 170:123/232 -> 184:119/232 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | bd65bbb1a58f6575 |
| ply-303-42 #1 (recoil faint) | player | Shedinja -> Golbat | 3298 | 111 | 1/182 | 189:1/145 -> 251:0/145 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | badd61d2f7f43e19 |
| ply-95-42 #1 | player | Onix -> Golbat (elevated) | 3294 | 111 | 142/182 | 177:142/157 -> 193:136/157 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | 0f79f974732a6c36 |
| ply-95-42 #2 | player | Onix -> Golbat (elevated) | 7896 | 111 | 136/157 | 178:136/131 -> 194:130/131 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | 25a5085b81634afe |
| ply-pp-95-362 #1 | player | Onix -> Dusclops | 4679 | 111 | 142/147 | 163:142/136 -> 175:140/136 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | aef6fe7fa29da171 |
| ply-pp-95-362 #2 | player | Onix -> Dusclops | 6213 | 111 | 140/136 | 162:140/126 -> 174:138/126 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | 8db16ed28f637b0b |
| ply-pp-95-362 #3 | player | Onix -> Dusclops | 7747 | 111 | 138/126 | 171:138/107 -> 264:134/107 | w 3,4 @ord 6,7 sp 28; hs 3 sp 27 | 6cd5b2c53f34f547 |

Per-row detail (`tools/integration/fixtures/stg107/struggle-windows-on.jsonl`, `kind: struggle`): register change rows (monbg BG cnt
at 8, blend 10..86, off at 87), attacker / target x2 / y2 / invisible change rows, every new sprite's slot, tileTag, position, anim
command rows, attr0..2 rows and order position, task-list change rows, and a digest of all 114 row framebuffer hashes (activation ..
first inactive + 2). The next instruction after the body is the target's HP bar drain (the damage HP write 162..204 rows after
activation), then the recoil drain on the attacker (12..18 rows later; 62 rows later when it faints).

**Scene OFF controls** (`fixtures/stg107/timing-off.jsonl`, the same 11 routes on `factory-battle-scene-off.json`): no Struggle body
plays; damage, recoil, faint and turn-end frames are each exactly 81 frames earlier than ON on every forced-Struggle turn (e.g.
ply-95-42: damage 3471 -> 3390, recoil 3487 -> 3406, turn end 3588 -> 3507; ply-303-42 recoil faint 3549 -> 3468), and every
earlier frame is identical. Gameplay (HP, recoil, KO, faint, turn count) is identical ON / OFF.

## 3. Banked patch (rung 3)

Pending.

## 4. Reproduction (from workspace/; direct mGBA only)

```
sh tools/integration/stg107Run.sh .integration/validation/<fresh>                 # ON windows x2 + OFF timing x2: r1 == r2, same / DIFF vs fixtures
STG107_PATCH=1 sh tools/integration/stg107Run.sh .integration/validation/<fresh>  # + the banked patch through the production renderer
```
