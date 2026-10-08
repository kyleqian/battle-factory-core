# prep37 — MOVE_SUBSTITUTE (164): body inputs + persistent doll field state (X-SUBST)

Side-lane evidence/design only (new files; no src change). Direct mGBA runs, every relied-on probe twice from fresh
processes and `cmp`-identical (`tools/integration/fixtures/prep37/probes.json`, 5 scenarios). Reproduce with
`OUT=<fresh dir> REC=<dir> sh tools/integration/prep37Run.sh` (receipts byte-identical across two checker passes).

## Results first

1. **Body (87 rows): READY behind a one-line-class renderer change.** Every input the accepted reducer/renderer reads is
   production-derivable today (field species -> art, `battleCommandFieldSpriteOrigin` + opponent idle rest -> corners,
   `substitute.json` doll sheets/palette, source doll row 65 / 24). With those derived inputs the UNCHANGED production
   renderer is 87/87 rows 0 px on the accepted GOLEM<->ONIX pair (both orientations); it throws for any other pair. A copy
   with the GOLEM/ONIX art + names swapped for `liveSceneOnBattlerArt` / displayed species (`prep37RendererPatch.ts`) is
   87/87 rows 0 px on all 5 windows (accepted pair x2, fresh PERSIAN<->SLOWBRO x2 Scene ON, + Scene OFF). Negative
   controls fail (`body-neg-*.json`).
2. **Persistent state (measured, 3 staged battles, 8.5k rows each):** after the body the subbed battler's OBJ shows the
   source doll on every idle row — VRAM tile block == gSubstituteDoll{Back,Front}Gfx, hardware palette bank ==
   gSubstituteDollPal, sprite x = 72 / 176, y = 97 / 56 (GetSubstituteSpriteDefault_Y), x2 = 0 — and every opaque doll
   pixel at the derived corner (40,65) / (144,24) matches the ROM frame: **1993/1993 (player, ON), 4399/4399 (opponent, ON,
   two subs), 2207/2207 (player, OFF)** visible idle rows. Same bounce (player y2 0/1/2 during action selection) and hit
   blink (4 x 4 invisible rows) as the mon; opponent shadow hidden on all 4479 doll rows. Status windows: SUBSTITUTE_TO_MON
   42 rows (player) / 40 (opponent), doll -> mon at row 23 / 22; MON_TO_SUBSTITUTE 42 / 40, mon -> doll at row 23 / 22;
   SUBSTITUTE_FADE 103 / 101 rows (doll tiles zeroed at row 53, mon back at 84 / 83; behindSubstitute cleared at row 52).
   **Scene OFF:** the body and the fade play exactly as in Scene ON (window digests identical), the swaps never run (no move
   animations), the doll stays up through the subbed battler's own (unanimated) moves.
3. **Plan:** a presentation-owned "shown as doll" flag on the displayed field battler, consumed only by
   `createBattleCommandFieldArtView` (pic + origin; species coords untouched); set at body row 87, toggled by the swaps,
   cleared at fade row 84 / switch-in (not Baton Pass) / faint. All 246 live adapters draw the defender from species art
   and must decline while the DEFENDER is a doll (scan: 161 also animate the defender sprite/palette; 85 do not — unproven
   candidates for a later doll-art swap). The two swaps are source-simple (one x2 task + a gfx swap; no RNG/BG/palette) and
   can be live; the fade needs monbg + alpha + palette blend. Static-fallback costs are in section 3.

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

## 2. Persistent field state after the body (measured)

Scenarios (`tools/battle-lab/prep37-*.json`, all-new species pair, Factory legal route, mechanicLab parties): PERSIAN
(fast, 252 HP EV; [Substitute, Tackle x3]) vs SLOWBRO (speed IV 0; Tackle x4). `on-player`: player PERSIAN subs on turn 1,
uses Tackle on turns 2..6 (menu RIGHT once), SLOWBRO tackles the doll; the doll breaks on hit 3 (turn 3). `on-opponent`:
mirrored, the Factory AI picks Substitute on turn 1 and again after the break (second body at row 5765 — identical). `off-player`
= `on-player` under the Scene OFF bootstrap. Messages in these battles wait for a button, so each turn is preceded by four
B presses (harmless at the action menu). Every frame recorded (`prep37Probe.py`; anim script label, tasks, both battler
sprites, VRAM tile digest, OBJ palette bank, behindSubstitute / flag_x8 / special / table flags, shadow, substituteHP).

Check `field.json` (`prep37Field.py`), idle rows (no anim script) with behindSubstitute set:

| run | idle doll rows | gfx == doll | pos | palette | opponent shadow hidden | visible rows, doll px exact |
| --- | --- | --- | --- | --- | --- | --- |
| on-player | 2033 | 2032 | 2032 | 2032 | n/a | 1993 / 1993 |
| on-opponent | 4479 | 4477 | 4477 | 4477 | 4479 | 4399 / 4399 |
| off-player | 2240 | 2240 | 2240 | 2240 | n/a | 2207 / 2207 |

The 1 / 2 non-doll rows are the single idle row between SUBSTITUTE_TO_MON and the move body (e.g. row 1566): the bit is
set but the mon is shown — **the presentation flag must be "doll shown", not the ROM's behindSubstitute bit**. Pixel rule:
the displayed state is the previous row's RAM sprite (OAM latch), and the two rows after an animation window are that
window's display tail (task x2 reaches OAM two rows late — the accepted renderer's age-2 latch). Player y2 histogram on
doll rows: 0 x1773, 1 x258, 2 x2 (the action-selection bounce acts on the doll); hit blink: 4 runs of 4 invisible rows
after each hit on the doll.

Windows around the subbed battler (rows include the script's first inactive row; `graphicsByAge` from VRAM):

| window | player rows | opponent rows | graphics | x2 range | notes |
| --- | --- | --- | --- | --- | --- |
| body (Move_SUBSTITUTE) | 86 + 1 | 86 + 1 | mon -> doll at row 12 | 0..200 | behindSubstitute set at row 87 |
| other-move (Tackle on the doll) | 41 | 41 | doll | 0..3 | `monbg ANIM_TARGET` copies the DOLL to BG (22 invisible rows) |
| Special_SubstituteToMon | 42 | 40 | doll -> mon at 23 / 22 | -105..0 / 0..100 | before every own move (Scene ON only) |
| own move (Tackle) | 41 | 41 | mon | | mon y (87 / 47), not the doll y |
| Special_MonToSubstitute | 42 | 40 | mon -> doll at 23 / 22 | -105..0 / 0..100 | after the own move (source: only if multihit < 2) |
| General_SubstituteFade | 103 | 101 | doll -> zero tiles (53) -> mon (84 / 83) | -105..0 / 0..100 | Scene ON and OFF identical; bit cleared at row 52 |

Source cross-check (not measured here): switch-in clears the bit unless Baton Pass passes the substitute
(`ClearTemporarySpeciesSpriteData`, battle_gfx_sfx_util.c:1279; the switched-in mon then gets MON_TO_SUBSTITUTE,
battle_controller_player.c:1080); switch-out and faint first run SUBSTITUTE_TO_MON (battle_controller_player.c:2249, 2412);
while the bit is set every general table animation except FADE / weather-continues / Snatch is skipped
(`TryHandleLaunchBattleTableAnimation`, battle_gfx_sfx_util.c:465-480 — e.g. stat-change animations on the subbed battler).

Which live adapters draw the WRONG graphics (`adapters.json`, `prep37Adapters.ts`): every live renderer composes both
battlers from species art (`liveMoveAnimationPresentation`, liveMoveAnimation.ts:1049-1075 -> `liveSceneOnBattlerArt`,
battleScene.ts:14877), so **all 246 live adapters draw the mon where the ROM shows the doll whenever the DEFENDER is behind
a substitute** (measured instance: Tackle's `monbg ANIM_TARGET` moves the doll, not the mon). 161 additionally animate the
defender's sprite/palette by a source scan (monbg/clearmonbg target, target sprite tasks, defender palette selectors); 85
show no such op in the scan (an approximation — e.g. Bind/Wrap affine the target through a sprite callback — so they are
only candidates). When the ATTACKER is subbed (Scene ON) the body itself runs on the mon art (SUBSTITUTE_TO_MON first), so
the adapters' own bodies are not wrong; the 42/40-row swaps around them are what is missing.

## 3. Minimal production plan (file:line)

(a) "shown as doll" field flag — presentation-owned, never read by gameplay:
1. `src/engine/battleCommandPresentation.ts:71` `BattleCommandFieldBattler`: add `substituteDoll?: true`.
2. `src/engine/battleCommandFieldArt.ts:61-100` `fieldArtBattler`: when the flag is set return `pic` = `substitute.json`
   back (player) / front (opponent) sheet + palette and `origin` = (40, 65) / (144, 24) (source-derived:
   GetSubstituteSpriteDefault_Y - 32, battle_anim_mons.c:332); keep the species `coords`. `battleCommandFieldSpriteOrigin`
   (:115) must not subtract the species elevation for the doll, and the opponent shadow is hidden (measured on 4479 rows;
   elevated species not staged here).
3. Setter/clearer in the presentation queue (the side that consumes `BattleMoveAnimationRequest` and the `SUBSTITUTE_FADE`
   animation event emitted at `battleScriptStatbuffchangeOpcode.ts:255`): set after body row 86 of a move-164 request
   (Scene ON and OFF — the body plays in both); clear at fade row 84 / 83 (show zero tiles rows 53..83 or fall back);
   clear on switch-in except a Baton Pass carry, and on faint. Scene ON only: clear at SUBSTITUTE_TO_MON row 23 / 22 and
   set again at MON_TO_SUBSTITUTE row 23 / 22 around the subbed battler's own animated moves.
4. Body: apply the `prep37RendererPatch.ts` change to battleScene.ts:18552-18673 (or route 164 through `liveField` like
   FAKE_OUT) and add 164 to `LIVE_MOVE_ANIMATION_IDS` (liveMoveAnimation.ts:175) with duration 87. Inputs are the live
   seam's existing ones; nothing is lent.

(b) Declines: in `liveMoveAnimationDuration` / `liveMoveAnimationPresentation` (liveMoveAnimation.ts:628 / :1039) return
null when the DEFENDER is flagged (all 246 adapters). When the ATTACKER is flagged, the adapter body is exact on mon art
but must wait for SUBSTITUTE_TO_MON; decline it too until the swap presenter exists (or include the 42/40 swap rows).

(c) Status animations (cost = pixels in the subbed battler's band, rows < 112, of the cheaper static hold — pre- or
post-window frame — over the window + its 2-row tail; `fallback.json`):

| window | live? | fallback cost player | fallback cost opponent |
| --- | --- | --- | --- |
| SUBSTITUTE_TO_MON | yes: one task (x2 += acc 0x500 >> 8 per row, side direction; gfx load when x + x2 + 32 > 304 unsigned) + the doll<->mon sheet; no RNG/BG/palette | 56,684 px / 44 rows | 45,706 px / 42 rows |
| MON_TO_SUBSTITUTE | yes, same task (arg FALSE) | 60,466 px / 44 rows | 48,812 px / 42 rows |
| SUBSTITUTE_FADE | later: monbg + BLDALPHA 16->0 every 2 rows + white palette blend + zero fill + the swap slide | 85,111 px / 105 rows | 73,994 px / 103 rows |
| body (for reference) | yes (section 1, 0 px) | 61,873 px / 88 rows | 58,707 px / 88 rows |

Source-derived: doll y, palette bank/graphics, swap and fade programs, Scene OFF exemptions (battle_script_commands.c:1748,
:4013), bit lifetime. Measured: every row count, the swap/fade graphics ages, the x2 ranges, the doll pixels, bounce and
blink, ON/OFF window identity, the fallback costs.

Not reached: an elevated subbed opponent (shadow + elevation-free doll origin as pixels), a switch-out / Baton Pass / faint
while subbed (source only above), multi-hit (`multihit < 2`) and two-turn moves by a subbed attacker, and whether
production's Scene OFF path currently presents the 87-row body and the 103-row fade at all.

## Reproduce

```sh
OUT=$(mktemp -d) REC=$(mktemp -d) sh tools/integration/prep37Run.sh          # probes twice fresh (cmp) + every checker
OUT=<same OUT> REC=$(mktemp -d) SKIP_PROBES=1 sh tools/integration/prep37Run.sh # second checker pass; cmp REC dirs
```
