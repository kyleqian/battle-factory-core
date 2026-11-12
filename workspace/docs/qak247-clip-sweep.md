# qak247: Quick Attack / Aerial Ace opponent-attacker clip sweep (evidence only)

Worker report, 2026-11-04, branch `worker/integration-20261104-044203`, code base `04c8ea71e` (tree `f552b62ea`).
No `src/` change. Oracle: Battle Scene ON (:8012 profile; probes are independent direct-mGBA runs of the same ROM, as agi245 did).
Follow-up to `docs/agi245-scout.md` section 3 ("Quick Attack and Aerial Ace ... worth doing as a follow-up").

## Answer

**Yes. The 74-row clip is wrong in the live Scene ON path for Quick Attack and Aerial Ace opponent attackers, but the damage is small (a few to ~175 px per move, only on rows 74-82, never the Agility-sized slice).** The ROM does not clip these moves at all. Replacing the live-field clip with 160 (no clip) gives **0 px on every frame of 87 of the 88 completed runs** (the exception, opponent RATTATA Quick Attack, has a different residual that is identical at 74 and at 160; see "Not the clip"). The tall-sprite species the supervisor worried about (CROBAT, MASQUERAIN, SCYTHER) are in fact exact under 74; the exposed species are the ones whose lunge puts pixels on rows 74-82 outside the player healthbox's footprint.

## Source proof that the ROM has no clip

- `data/battle_anim_scripts.s:2731-2746` (Move_QUICK_ATTACK) and `:4350-4365` (Move_AERIAL_ACE): the only attacker-side commands are `monbg`, `setalpha 12, 8`, `AnimTask_TranslateMonEllipticalRespectSide` (sprite x2/y2 offsets, `battle_anim_mon_movement.c:410`) and `AnimTask_TraceMonBlended`. No window, mask, or clip command exists in either script.
- `AnimTask_TraceMonBlended_Step` (`src/battle_anim_utility_funcs.c:231-246`) clones the attacker as an ordinary OBJ with a blend and sets its priority to 2 (`task->data[0] ? 1 : 2`, arg0 = ANIM_ATTACKER = 0). Nothing clips it; the only thing that covers the lunging sprite's lower rows is the player healthbox OBJ (priority 0). That is the same mechanism agi245 proved for Agility.
- Our code uses an absolute screen row 74 for the live field (`battleScene.ts:49525-49528` Quick Attack, `:51164-51167` Aerial Ace: `liveField ? OPPONENT_BATTLE_TERRAIN_VISIBLE_BOTTOM : attackerCorner.y + 55`, constant `battleSceneCanonical.ts:391` = 74). 74 equals PIDGEOTTO's corner row (19) + 55, i.e. it is the Pidgeotto calibration promoted to a constant.
  The clip feeds three calls per body: `eraseSpriteFootprint` of the rest sprite, `drawSpriteSheetClippedBelow` for the moving sprite and each afterimage.

## Method

1. Stage (`mechanicLab`, seed 305419897, trainerId 50, same as the agi245 scenarios): opponent = the species at L50, IV31, nature 0, moves x4 = Quick Attack (98) or Aerial Ace (332); player = ONIX L50, IV 31 except **speed IV 0** (so the opponent acts first for Aerial Ace too), moves x4 = Splash (150). Trace: A x2, 30 idle, A x2, 700 idle. Gender follows the species ratio (genderless / female-only species staged with a legal gender and the same gender in the fixture's healthbox field). Staging sketch (`/tmp/qak247/stage.py`, scratch):
```python
#!/usr/bin/env python3
"""qak247 stager: opponent <opp-species-id> uses <move> x4 vs player ONIX (speed IV 0) Splash x4. usage: stage.py out.json oppId move"""
import json,sys
out,opp,move=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
SS={x['id']:x for x in json.load(open('<workspace>/src/data/gen/species-stats.json'))['species']}
def gen(sp):
    r=SS[sp]['genderRatio']; return "genderless" if r==255 else "female" if r==254 else "male"
def mon(sp,moves,spd=31):
    return {"species":sp,"level":50,"nature":0,"ivs":{"hp":31,"attack":31,"defense":31,"speed":spd,"spAttack":31,"spDefense":31},
     "evs":{k:0 for k in("hp","attack","defense","speed","spAttack","spDefense")},"moves":moves,"ppUps":[0]*4,"item":0,"abilitySlot":0,"friendship":0,"gender":gen(sp),"shiny":False}
d={"schemaVersion":1,"mode":"mechanicLab","profile":"battle-scene-on","level":50,"challengeNum":0,"battleNum":0,"trainerId":50,
 "playerSetIds":[191,158,188],"opponentSetIds":[156,157,185],"seed":305419897,
 "overrides":{"parties":{"player":[mon(95,[150]*4,0)]*3,"opponent":[mon(opp,[move]*4)]*3}},
 "trace":{"segments":[{"frames":2,"buttons":["A"]},{"frames":30,"buttons":[]},{"frames":2,"buttons":["A"]},{"frames":700,"buttons":[]}],"captureFrames":[0,1]}}
json.dump(d,open(out,'w'))
```
2. Probe (`/tmp/qak247/moveProbe.py`, a trimmed `tools/compare/agilityProbe.py`): BattleLab, RGB frames while `engine.currentMove` is the move; the body window is the frames where `gAnimScriptActive` and `sBattleAnimScriptPtr` lies in `Move_QUICK_ATTACK..Move_RAGE` / `Move_AERIAL_ACE..Move_IRON_DEFENSE`, through the first inactive frame. Windows: Quick Attack 33 frames, Aerial Ace 50 frames for every species (the same lengths as the `prep7-*` dense windows); the start frame varies by species (77-83 when the opponent moves first). In 12 Aerial Ace runs (AGGRON, ARMALDO, ARON, CRAWDAUNT, CUBONE, LEDYBA, PSYDUCK, REGISTEEL, TOGETIC, TROPIUS, URSARING, ZUBAT; start frame 312-317) the opponent is slower than the staged ONIX, so ONIX's Splash body runs first and Aerial Ace is the scenario's second body. The live render was still staged as a first body (no `precedingBodies`) and is exact at 160 for all of them, so the sprite rows do not depend on that.
3. Live render: `renderBattleResolutionLiveView(liveView(fixture, age))` for age 0..N-1 against the ROM RGB at frame start+age, full 240x160 compared, fixture HP from the probe's first window frame. Clip variants were produced on a **scratch copy** of `src/` + `tools/integration` under `/tmp/qak247/exp` whose only difference is `QAK_CLIP` overriding the two clip lines (unset = production 74; `160` = no clip). The worktree `src/` is untouched (`git status` clean apart from this doc and the staging JSON).
4. Control: opponent PIDGEOTTO (the 74 calibration species) is 0 px at 74 and at 160 for both moves, so the harness itself is exact.

Species selection: all 79 Factory carriers (`battle-frontier-mons.json`, 87 species x move pairs) plus LEDYBA. **LEDYBA is not a Quick Attack or Aerial Ace carrier** (its Factory set is Psybeam / Agility / Baton Pass / Light Screen); it was staged anyway as the calibration reference. 88 of 89 runs completed; the only miss is Aerial Ace TYRANITAR (probe: body not observed; not investigated, the lane has 52 other Aerial Ace runs). Note that the opponent rest-sprite bottom is row 71 for essentially every species, so every opponent can lunge past 74; the species that are exposed depend on which columns of the sprite reach rows 74-82 outside the healthbox.

## Headline results (opponent attacker vs player ONIX)

Per species x move: frames with diffs / window, total px, and whether the residual is the clip (removing the clip gives 0 px = yes).

| move | species | role | frames diff at 74 | px at 74 | rows | px at 160 | residual is the clip? |
|---|---|---|---|---|---|---|---|
| Quick Attack | PIDGEOTTO | calibration control | 0 / 33 | 0 | - | 0 | n/a (exact) |
| Quick Attack | SWELLOW | ordinary species (also carries Aerial Ace) | 1 / 33 | 6 | 74-75 | 0 | yes |
| Quick Attack | RAIKOU | tall (corner row 8), low feet | 9 / 33 | 106 | 74-76 | 0 | yes |
| Quick Attack | SCIZOR | tall (corner row 8) | 8 / 33 | 56 | 74-76 | 0 | yes |
| Quick Attack | COMBUSKEN | tall (corner row 9) | 0 / 33 | 0 | - | 0 | n/a (exact) |
| Quick Attack | ABSOL | tall (corner row 8) | 0 / 33 | 0 | - | 0 | n/a (exact) |
| Quick Attack | LEDYBA (not a carrier) | calibration reference | 1 / 33 | 1 | 74 | 0 | yes (age 9, one pixel at x=138 y=74, the same pixel agi245 saw for Agility) |
| Aerial Ace | PIDGEOTTO | calibration control | 0 / 50 | 0 | - | 0 | n/a (exact) |
| Aerial Ace | SWELLOW | ordinary species | 1 / 50 | 6 | 74-75 | 0 | yes |
| Aerial Ace | SLAKING | large | 9 / 50 | 175 | 74-79 | 0 | yes |
| Aerial Ace | TROPIUS | tall (corner row 8) | 8 / 50 | 124 | 74-76 | 0 | yes |
| Aerial Ace | MANTINE | wide | 9 / 50 | 103 | 74-81 | 0 | yes |
| Aerial Ace | METAGROSS | large | 2 / 50 | 75 (max 53 in one frame) | 74-82 | 0 | yes |
| Aerial Ace | SCEPTILE | tall (corner row 8) | 2 / 50 | 74 (max 41) | 74-82 | 0 | yes |
| Aerial Ace | SCIZOR | tall (corner row 8) | 7 / 50 | 49 | 74-76 | 0 | yes |
| Aerial Ace | CROBAT | tallest (corner row 2) | 0 / 50 | 0 | - | 0 | n/a (exact) |
| Aerial Ace | MASQUERAIN | tallest (corner row -1) | 0 / 50 | 0 | - | 0 | n/a (exact) |
| Aerial Ace | SCYTHER | tall (corner row 8) | 0 / 50 | 0 | - | 0 | n/a (exact) |
| Aerial Ace | LEDYBA (not a carrier) | calibration reference | 1 / 50 | 1 | 74 | 0 | yes (age 10, one pixel at x=138 y=74) |

Also compared on the first 14 species run (what a "corner row + 55" clip, the legacy-path formula, would give on the live field, with corner row = `spriteCenter.y - 32` from the field art): it is far worse for every species except PIDGEOTTO (where it equals 74) and LEDYBA (e.g. SWELLOW 1,775 px, SCIZOR 4,860 px, RAIKOU 8,310 px, CROBAT 3,388 px over the window), so the Agility-style corner clip must not be used for these moves.

### Aggregate over all runs

| move | runs | runs with diffs at 74 | px at 74 (clip-class only) | px at 160 |
|---|---|---|---|---|
| Quick Attack | 35 | 10 clip-class (+ RATTATA, below) | 212 | 0 (RATTATA separate: 14,739 at both) |
| Aerial Ace | 53 | 26 | 870 | 0 |

All clip-class residuals lie on **rows 74-82** and in two column zones: x about 120-139 (left of the player healthbox's left edge, read as x about 136 from a crop) and x about 220-231 (near its right edge, about 226). Pixels of the lunging sprite or its afterimages that land on those rows and columns are drawn by the ROM and are removed by our clip; everywhere else on rows 74+ the healthbox covers them in both, which is why many tall species are exact.
Frame ranges are short: Quick Attack ages 8-25, Aerial Ace ages 9-27 (the lunge's lowest / outermost ages). Largest single frames: MANTINE 58 px, METAGROSS 53 px, SLAKING 45 px, SCEPTILE 41 px, ARCANINE 28 px (full tables below).

## Not the clip: opponent RATTATA Quick Attack

RATTATA is the one run where removing the clip changes nothing: 25 / 33 frames, 14,739 px at both 74 and 160, all on rows 41-73 (bbox x 139-214), starting at age 8 (ages 0-7 exact) and settling to a constant 401-410 px for ages 21-32. The side-by-side at age 14 (`/tmp/qak247/rattata14.png`, scratch) shows the same three-copy layout at 1x; the difference is in sprite pixels of the main copy. It is a RATTATA-specific presentation difference unrelated to the clip (cause not diagnosed). It needs its own investigation; it is out of scope for this step and is not covered by the proposed fix.

## Existing fixtures under both clips (harness `liveAdapterFramebuffer.ts` on the scratch copy, two fresh probes each)

| fixture | production 74 | clip 160 |
|---|---|---|
| prep7-aerial-ace-opponent (PIDGEOTTO) | 50/50, 0 px | 50/50, 0 px |
| prep7-quick-attack-opponent (PIDGEOTTO) | 33/33, 0 px | 33/33, 0 px |
| altspecies3-aerial-ace-opponent-delibird | 50/50, 0 px | 50/50, 0 px |
| altspecies3-aerial-ace-opponent-charizard | 48/50, **14 px** | **50/50, 0 px** |
| altspecies3-aerial-ace-opponent-dragonair | 48/50, **51 px** | **50/50, 0 px** |
| prep7-aerial-ace-lab-opponent (DRAGONAIR; template fixture, not an accepted/gated one; identical 4,451 px on the unmodified worktree) | 0/50, 4,451 px | 0/50, 4,400 px (unrelated mismatch) |

The charizard/dragonair 14 / 51 px are the already-recorded limit in `ANIMATION_INTEGRATION_PROGRESS.md` ("Aerial Ace with CHARIZARD/DRAGONAIR opponent attackers leaves 14/51 px at ages 10-11 on the opponent platform clip row"); this sweep shows it is the 74 clip and is fixed by 160.

## Source-proven fix for a later step (NOT applied)

Same shape as the agi245 fix. In `src/engine/battleScene.ts`:

- line 49527 (Quick Attack, `renderSceneOnMovePresentation` branch): `? (liveField ? OPPONENT_BATTLE_TERRAIN_VISIBLE_BOTTOM : attackerCorner.y + 55)` -> `? (liveField ? 160 : attackerCorner.y + 55)`
- line 51166 (Aerial Ace): the same one-token change.

Keep `OPPONENT_BATTLE_TERRAIN_VISIBLE_BOTTOM` itself (still used at `battleSceneCanonical.ts:3572` for the Fly ball, and re-exported at `battleScene.ts:1553`); update the stale comment above each line ("The opponent platform terrain's visible bottom is an absolute screen row (74)"): the ROM has no clip, the healthbox covers the feet. The legacy (non-`liveField`) path, i.e. the accepted PIDGEOTTO/ONIX staged fixtures, is unchanged (and PIDGEOTTO is exact both ways).

Suggested acceptance for that step: (a) the five existing opponent fixtures above stay exact and altspecies3 charizard/dragonair become 50/50 (their limit note can then be retired by the supervisor); (b) add hermetic receipts for at least SWELLOW (both moves), RAIKOU and SCIZOR (Quick Attack), SLAKING and METAGROSS (Aerial Ace), the staging scenarios for which are committed under `tools/integration/fixtures/qak247/` (the receipt `romFrameSha256` list still has to be generated from a fresh probe run as agi245 did); (c) typecheck, census on both scenes, `compare:differential`, full suite and build per the handoff recipe. Expected census effect: any pair with an opponent attacker using Quick Attack or Aerial Ace moves toward the ROM, nothing else (the player-side clip is already 160). Handle RATTATA Quick Attack as a separate item.

## Full results

Opponent attacker vs ONIX; "frames diff" is out of the 33-frame (Quick Attack) / 50-frame (Aerial Ace) window; rows hit = first-last differing row at the production 74 clip; px at 160 is with the scratch no-clip variant.

### Quick Attack (98), 35 runs

| species | frames diff / window | px at 74 | max px/frame | rows hit | x zones (x//10*10) | px at 160 |
|---|---|---|---|---|---|---|
| ABSOL | 0 / 33 | 0 | 0 | - | - | 0 |
| COMBUSKEN | 0 / 33 | 0 | 0 | - | - | 0 |
| CYNDAQUIL | 0 / 33 | 0 | 0 | - | - | 0 |
| ELECTRIKE | 1 / 33 | 1 | 1 | 74-74 | 130 | 0 |
| ELEKID | 0 / 33 | 0 | 0 | - | - | 0 |
| GLIGAR | 0 / 33 | 0 | 0 | - | - | 0 |
| HITMONTOP | 0 / 33 | 0 | 0 | - | - | 0 |
| ILLUMISE | 0 / 33 | 0 | 0 | - | - | 0 |
| LEDYBA | 1 / 33 | 1 | 1 | 74-74 | 130 | 0 |
| MANECTRIC | 0 / 33 | 0 | 0 | - | - | 0 |
| PIDGEOTTO | 0 / 33 | 0 | 0 | - | - | 0 |
| PIDGEY | 0 / 33 | 0 | 0 | - | - | 0 |
| PIKACHU | 0 / 33 | 0 | 0 | - | - | 0 |
| PLUSLE | 0 / 33 | 0 | 0 | - | - | 0 |
| PONYTA | 0 / 33 | 0 | 0 | - | - | 0 |
| RAICHU | 0 / 33 | 0 | 0 | - | - | 0 |
| RAIKOU | 9 / 33 | 106 | 13 | 74-76 | 130,220 | 0 |
| RAPIDASH | 0 / 33 | 0 | 0 | - | - | 0 |
| RATICATE | 2 / 33 | 8 | 7 | 74-75 | 130 | 0 |
| RATTATA | 25 / 33 | 14739 | 1119 | 41-73 | 130,140,160 | 14739 |
| SCIZOR | 8 / 33 | 56 | 7 | 74-76 | 220 | 0 |
| SENTRET | 0 / 33 | 0 | 0 | - | - | 0 |
| SHIFTRY | 0 / 33 | 0 | 0 | - | - | 0 |
| SMEARGLE | 0 / 33 | 0 | 0 | - | - | 0 |
| SNEASEL | 0 / 33 | 0 | 0 | - | - | 0 |
| SURSKIT | 1 / 33 | 6 | 6 | 74-77 | 130 | 0 |
| SWELLOW | 1 / 33 | 6 | 6 | 74-75 | 130 | 0 |
| TAILLOW | 0 / 33 | 0 | 0 | - | - | 0 |
| TORCHIC | 0 / 33 | 0 | 0 | - | - | 0 |
| TREECKO | 1 / 33 | 2 | 2 | 74-74 | 130 | 0 |
| VAPOREON | 0 / 33 | 0 | 0 | - | - | 0 |
| VOLBEAT | 0 / 33 | 0 | 0 | - | - | 0 |
| VULPIX | 1 / 33 | 2 | 2 | 74-74 | 130 | 0 |
| WINGULL | 0 / 33 | 0 | 0 | - | - | 0 |
| ZANGOOSE | 2 / 33 | 24 | 20 | 74-76 | 120,130 | 0 |

### Aerial Ace (332), 53 runs

| species | frames diff / window | px at 74 | max px/frame | rows hit | x zones (x//10*10) | px at 160 |
|---|---|---|---|---|---|---|
| ABSOL | 0 / 50 | 0 | 0 | - | - | 0 |
| AERODACTYL | 1 / 50 | 3 | 3 | 74-74 | 130 | 0 |
| AGGRON | 8 / 50 | 23 | 3 | 74-75 | 130,220 | 0 |
| ALTARIA | 0 / 50 | 0 | 0 | - | - | 0 |
| ARCANINE | 2 / 50 | 35 | 28 | 74-79 | 120,130 | 0 |
| ARMALDO | 2 / 50 | 15 | 13 | 74-75 | 120,130 | 0 |
| ARON | 0 / 50 | 0 | 0 | - | - | 0 |
| ARTICUNO | 1 / 50 | 3 | 3 | 74-74 | 130 | 0 |
| CHARIZARD | 2 / 50 | 14 | 8 | 74-76 | 130 | 0 |
| CHARMELEON | 0 / 50 | 0 | 0 | - | - | 0 |
| CRAWDAUNT | 9 / 50 | 26 | 4 | 74-75 | 130,220 | 0 |
| CROBAT | 0 / 50 | 0 | 0 | - | - | 0 |
| CROCONAW | 1 / 50 | 6 | 6 | 74-75 | 130 | 0 |
| CUBONE | 0 / 50 | 0 | 0 | - | - | 0 |
| DELIBIRD | 0 / 50 | 0 | 0 | - | - | 0 |
| DRAGONITE | 0 / 50 | 0 | 0 | - | - | 0 |
| DUGTRIO | 2 / 50 | 20 | 19 | 74-77 | 120,130 | 0 |
| FERALIGATR | 1 / 50 | 7 | 7 | 74-74 | 130 | 0 |
| GLIGAR | 0 / 50 | 0 | 0 | - | - | 0 |
| GOLDUCK | 0 / 50 | 0 | 0 | - | - | 0 |
| JUMPLUFF | 0 / 50 | 0 | 0 | - | - | 0 |
| KANGASKHAN | 2 / 50 | 23 | 16 | 74-77 | 130 | 0 |
| LATIAS | 0 / 50 | 0 | 0 | - | - | 0 |
| LATIOS | 0 / 50 | 0 | 0 | - | - | 0 |
| LEDYBA | 1 / 50 | 1 | 1 | 74-74 | 130 | 0 |
| MANTINE | 9 / 50 | 103 | 58 | 74-81 | 120,220 | 0 |
| MASQUERAIN | 0 / 50 | 0 | 0 | - | - | 0 |
| METAGROSS | 2 / 50 | 75 | 53 | 74-82 | 120 | 0 |
| MOLTRES | 1 / 50 | 15 | 15 | 74-77 | 130 | 0 |
| NIDOQUEEN | 1 / 50 | 12 | 12 | 74-75 | 130 | 0 |
| NIDORINA | 0 / 50 | 0 | 0 | - | - | 0 |
| NOCTOWL | 0 / 50 | 0 | 0 | - | - | 0 |
| PELIPPER | 0 / 50 | 0 | 0 | - | - | 0 |
| PIDGEOT | 1 / 50 | 10 | 10 | 74-76 | 130 | 0 |
| PIDGEOTTO | 0 / 50 | 0 | 0 | - | - | 0 |
| PORYGON2 | 0 / 50 | 0 | 0 | - | - | 0 |
| PSYDUCK | 0 / 50 | 0 | 0 | - | - | 0 |
| REGISTEEL | 0 / 50 | 0 | 0 | - | - | 0 |
| SALAMENCE | 0 / 50 | 0 | 0 | - | - | 0 |
| SCEPTILE | 2 / 50 | 74 | 41 | 74-82 | 120 | 0 |
| SCIZOR | 7 / 50 | 49 | 7 | 74-76 | 220 | 0 |
| SCYTHER | 0 / 50 | 0 | 0 | - | - | 0 |
| SLAKING | 9 / 50 | 175 | 45 | 74-79 | 120,220 | 0 |
| SNEASEL | 0 / 50 | 0 | 0 | - | - | 0 |
| SWELLOW | 1 / 50 | 6 | 6 | 74-75 | 130 | 0 |
| TOGETIC | 0 / 50 | 0 | 0 | - | - | 0 |
| TREECKO | 1 / 50 | 2 | 2 | 74-74 | 130 | 0 |
| TROPIUS | 8 / 50 | 124 | 19 | 74-76 | 120,220 | 0 |
| TYPHLOSION | 1 / 50 | 14 | 14 | 74-75 | 130 | 0 |
| URSARING | 1 / 50 | 11 | 11 | 74-75 | 130 | 0 |
| YANMA | 0 / 50 | 0 | 0 | - | - | 0 |
| ZANGOOSE | 2 / 50 | 24 | 20 | 74-76 | 120,130 | 0 |
| ZUBAT | 0 / 50 | 0 | 0 | - | - | 0 |

## Reproduction notes

- Scratch tooling lives in `/tmp/qak247` (`stage.py`, `moveProbe.py`, `render.ts`, `sweep.sh`, `exp/`); it may be gone. `render.ts` is a copy of the agi245 `render.ts` with a per-band diff summary and the `QAK_CLIP` env switch; `moveProbe.py` is `agilityProbe.py` cut down to RGB + hp + window detection.
- One probe run is ~8 s, one render ~3 s; the full 88-run sweep took ~20 min of wall clock in foreground chunks.
- Committed staging scenarios (6): `tools/integration/fixtures/qak247/mechanic-{quick-attack,aerial-ace}-opponent-<species>-player-onix.json` (SWELLOW both, RAIKOU, SCIZOR for Quick Attack; SLAKING, METAGROSS for Aerial Ace). Run them with the stager's trace via `tools/run-mgba-probe.py <out.json> -- <mgba python> <probe> <scenario> <out.json> <rgb-dir> ...` using any probe that records RGB per frame while `currentMove` is the move (for example `tools/probe/run-battle-lab-rgb.py`, then take the window above).
- Not run (per the step's constraints): `npm test`, vitest, build, typecheck, census, soaks. Gates run: see the final message.

## Receipts (qak249)

Test-only follow-up to the qak248 fix (`f5ab0f107`). Two hermetic Scene-ON ROM receipts, built the agi245 way from the committed staging scenarios under `tools/integration/fixtures/qak247/`:

| fixture | window | frames | qak247 residual at the old 74 clip | now |
|---|---|---|---|---|
| `tools/compare/fixtures/aerial-ace-opponent-slaking-player-onix.json` | 79..128 | 50 | 9 / 50 frames, 175 px, rows 74-79 | 50 / 50, 0 px |
| `tools/compare/fixtures/quick-attack-opponent-raikou-player-onix.json` | 80..112 | 33 | 9 / 33 frames, 106 px, rows 74-76 | 33 / 33, 0 px |

- Probe: `tools/compare/moveBodyProbe.py` (the qak247 scratch `moveProbe.py`, ROOT resolved from the file). Run with the mGBA venv: `PYTHONPATH=/srv/pokebench/vendor/libmgba-py /srv/pokebench/vendor/mgba-venv/bin/python tools/compare/moveBodyProbe.py <scenario> <out.json> <rgb-dir> <Move_START> <Move_END> <moveId>` (the fixtures' `probeArgs` hold the last three).
- Each fixture records `romFrameSha256` per age (sha256 of the 240x160 RGB frame), and `evidenceSha256` / `secondFreshEvidenceSha256`, the sha256 of the probe output JSON from two independent fresh runs (identical for both species).
- `tests/animation/quickAttackAerialAceOpponentClip.test.ts` renders every age with `renderBattleResolutionLiveView` and requires 0 mismatched frames. The fixture's `qak247Residual74` block records the pre-fix numbers (the 74 clip would mismatch; no clip gives 0 px); no `src/` change was made and no test re-injects the old clip.
