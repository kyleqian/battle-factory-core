# prep37 — MOVE_SUBSTITUTE (164): body inputs + persistent doll field state (X-SUBST)

Side-lane evidence/design only (new files; no src change). Direct mGBA runs, every relied-on probe twice from fresh
processes and `cmp`-identical (`tools/integration/fixtures/prep37/probes.json`, 5 scenarios). Reproduce with
`OUT=<fresh dir> REC=<dir> sh tools/integration/prep37Run.sh` (receipts byte-identical across two checker passes).

## 1. The body (87 rows) — RESULT: production-derivable; 0 px with derived inputs; the renderer needs one generic-art swap

Inputs the accepted reducer / renderer read (`src/animation/substitute.ts`, `src/engine/battleScene.ts:18552-18673`):

| input | reader | production source today | status |
| --- | --- | --- | --- |
| age (script row 0 = first `Move_SUBSTITUTE` row) | reducer; renderer reads age-2 (affine + doll latch) | live seam age | derivable |
| attacker side | reducer (`defaultY` 97/56 in the doll fall, sound pan) | request.attacker | derivable |
| attacker / target species art | renderer (GOLEM / ONIX hard-coded, `throw` otherwise :18574) | `liveSceneOnBattlerArt` (battleScene.ts:14877) | **renderer change** |
| attacker / target spriteCorner | renderer | `battleCommandFieldSpriteOrigin` (battleCommandFieldArt.ts:111) + opponent species front idle rest | derivable |
| doll sheets + palette | renderer (`substitute.json` back for player, front for opponent) | asset already in production | derivable (source asset) |
| doll corner row 65 / 24 | renderer constant | source `GetSubstituteSpriteDefault_Y` (battle_anim_mons.c:332) = BATTLER_COORD_Y + 17 / + 16, minus 32 — species independent | source-derived |
| doll x | attacker spriteCorner.x + x2 | sBattlerCoords x (40 / 144 corner) | derivable |
| HUD (names, HP, gender) / message | renderer full-field path only | gameplay field (live host draws the HUD when `liveField`) | derivable |

No palette bank, OAM order, matrix slot or RNG input is read: the doll uses the battler's own palette bank and its own
OAM entry (source `BattleLoadSubstituteOrMonSpriteGfx`), so nothing needs lending.

Check `body-unchanged.json` (production `render(engine)`, inputs derived as above, no src change):
- accepted pair GOLEM->ONIX, both orientations: **87/87 rows 0 px**, component (RAM x2/y2/invisible vs reducer) 87/87,
  ROM frames 291..377 / 311..397 = the accepted fixture windows.
- fresh alternate pair PERSIAN<->SLOWBRO (both orientations, Scene ON; plus the player orientation under Scene OFF):
  the unchanged renderer **throws** `unsupported staged SUBSTITUTE pair PERSIAN->SLOWBRO`.

Check `body-patched.json` (`prep37RendererPatch.ts`: a copy of battleScene.ts with only the species gate -> side gate,
GOLEM/ONIX sheets -> `liveSceneOnBattlerArt`, names -> displayed species): **all 5 windows 87/87 rows 0 px** (accepted
pair both orientations unchanged; PERSIAN->SLOWBRO player + opponent Scene ON; player Scene OFF).
Negative controls (`body-neg-*.json`) fail as required: age+1 (47 / 51 rows 0 px), doll corner row +1 (34 / 38),
opponent idle rest 0 (GOLEM->ONIX player 0/87 — ONIX rests at x2 = +1; the PERSIAN/SLOWBRO pair rests at 0 so it does
not exercise this input).

Scene OFF: the body plays identically under Battle Scene OFF (same rows 73..159, 0 px) — source `Cmd_attackanimation`
(battle_script_commands.c:1748) exempts MOVE_SUBSTITUTE and MOVE_TRANSFORM from HITMARKER_NO_ANIMATIONS.
