# prep27 (S10A, side lane): Baton Pass flow measured in the ROM + body reducer check; Endeavor prep

Evidence only, NEW FILES ONLY (no `src/` change). Direct mGBA (fresh process per probe, never the shared HTTP oracles), Scene ON lab scenarios.
Every relied-on probe ran **twice from fresh processes and is byte-identical** (state probes, dense body JSON, raw RGB; `sh tools/integration/prep27Run.sh` asserts it).
Conventions: **E** = last frame with `gAnimScriptActive` (the body's last active frame; the first inactive frame is E+1; same convention as `forcedSwitchRomProbe.py`,
so numbers are comparable with `docs/forced-switch-continuation.md`). **age** = frame - first active frame. **P** (production) = last frame of the `move-animation` command.
**A** (player) = the row where the party-screen confirm is accepted (`Task_ClosePartyMenuAndSetCB2` appears; production `sendOutElapsed` = 0).

## 0. Results first

### 0.1 Baton Pass (MOVE_BATON_PASS 226, 0.48%)

1. **Body (item 1): 52 active frames, constant.** `gAnimScriptActive` is 1 for ages 0..51 (E-51..E); identical in all 4 scenarios (2 species pairs x 2 sides) and for body-start shifts of
   0/1/2/3/5/7 frames (`prep27Shift.sh`: no boundary moves; one party-screen UI row moved 1 frame at shift 7). Draws: ball sprite slot 3 (ages 4..~22) + `AnimTask_BlendColorCycleLoop`;
   the **attacker battler sprite goes `invisible=1` at age 9 (E-42) and stays hidden**. The dense probe has 53 rows (age 0..52: row 52 = cleanup, `animScriptActive` 0).
2. **Body reducer (item 4): `batonPassAtAge(age, animationCenter)` reproduces the ROM with production-derivable inputs.** `prep27BatonReducerCheck.ts` feeds it only the center derived with the live adapter's own
   formula (`liveBattlerAnchors(side, createBattleCommandFieldArtView({player,opponent species ids})).picOffsetPoint`, `liveMoveAnimation.ts:401-414`; **not** a fixture/ROM constant):
   **component-exact 53/53 on all 4 pairs** (player AIPOM->ONIX centre 72,97; opponent AIPOM->ONIX 176,43; player NINJASK->GOLEM 72,96; opponent NINJASK->GOLEM 176,40): pointer/cleanup, ball software state,
   attacker matrix + invisible, task counts, BG/battler palette blend + unselected banks, resource tags, hardware palette/matrix/OAM transfers, typed `sceneOnBatonPassView` seam == reducer.
   **Framebuffer 53/53 through the existing renderer for both AIPOM->ONIX orientations**, using the derived geometry (equal to the accepted fixture's). **The alternate pairs cannot reach pixels: `battleScene.ts:32576-32582`
   throws `unsupported staged BATON_PASS pair NINJASK->GOLEM`** (recorded in the receipt) because the branch (`battleScene.ts:32569-32665`) hard-codes AIPOM/ONIX sprites, the Pokeball asset, the "AIPOM used BATON PASS!" text and the
   healthbox names. Negative controls (`--neg=center|matrix|palette`): 26/53, 52/53 (age 5), 52/53 (age 12) -> the check is sensitive. **Alternate-pair pixels: NOT measured** (needs the src generalisation, §4 recipe).
3. **Opponent (AI) attacker flow (all measured, 2 pairs + 3 replacement species):** body end E; `OpponentDoMoveAnimation -> OpponentBufferRunCommand` E+2; **attacker sprite freed AND its healthbox hidden at E+9** (instant `returntoball`; the sprite was already invisible since age 9);
   `gBattlerPartyIndexes` E+10; `gBattleMons.species` E+12; **"<trainer> sent out X!" message prints from E+14 (36 glyph frames)**; **ball sprite spawns E+51** (`SpriteCB_WaitForBattlerBallReleaseAnim`), mon sprite E+52, 15 ball particles from E+69;
   healthbox shown again at E+140 (replacement 278) -- and the tail is **replacement-species keyed** exactly as for Roar: ball E+49 / healthbox E+159 for GOLEM, ball E+51 / healthbox E+217 for SHUCKLE and SABLEYE
   (`baton-rom-replacement.json`; the ball start also moves with the name length of the message). Compared with Roar (free E+4, party index E+7, ball E+10 straight after, no message before the ball): **Baton is E+9 / E+10 / message / ball E+51**.
4. **Player attacker flow (party screen answered at E+75 RIGHT, E+100 A, E+130 A; input-dependent boundaries listed relative to A = E+131):** `PlayerDoMoveAnimation -> PlayerBufferRunCommand` E+2; **`OpenPartyMenuToChooseMon` E+4**; `CB2_InitPartyMenu` E+26 (the party menu
   init resets all sprites: **both battler sprites and both healthboxes are freed at E+27**, i.e. there is *no* E+8 free on the player side); `CB2_UpdatePartyMenu` E+47 (E+46 once); first accepted input is between E+61 and E+75 (RIGHT at E+60 was ignored, at E+75 accepted).
   After the confirm: party-menu close task A+0; `CB2_SetUpReshowBattleScreenAfterMenu` A+22; battle screen live again (`BattleMainCB2`) A+54; **the reshown battle screen shows the outgoing healthbox again (A+48..A+75) with the attacker sprite still `invisible`**;
   **instant `returntoball`: sprite destroyed + healthbox hidden A+76**; party index A+77; species A+79; **"Go! X!" text from A+81**; **ball spawn A+94**, mon A+95; particles A+141; **new healthbox visible A+159**; `BattleTurnPassed` A+344 (opponent's turn included).
5. **Production today (player; the opponent side is unreachable, the route driver cannot generate an opponent-attacker Baton Pass):** `message > move-animation(32-frame placeholder: no `case 226`) > turn-end`, **party selector opens at P+9**, then `switch-out[seg1]` is the **forced-party selector send-out sequence** (the OFF post-faint calibration `partySendOut*`,
   `src/engine/partySelect.ts:287-321`): fade-out +1, black +17, battle fade-in +56, "Go!" text +84, ball visible +99, release +145, healthbox +161, action menu +311; then `sprite-visibility > message ... > turn-end`. So the player continuation is **not** the 32-frame voluntary `switch-out` (my doc forced-switch-continuation.md §5 wording
   was imprecise: the `switch-out` command spans the whole 311-frame selector overlay).
6. **Verdict (items 2-3):** player side is already **within +2..+5 frames** of the ROM from the answer (table §2); the real gaps are the missing outgoing healthbox during the reshown battle screen (A+48..A+75, 28 frames in the ROM) and the unwired body (case 226 + renderer pair gate).
   The opponent side is **entirely unpresented** (new commands: instant removal hold 9 -> recall -> message -> send-in with species-keyed tail).

### 0.2 Endeavor
(see §5; filled in below)

## 1. ROM timelines (E-relative; sources: `fixtures/prep27/baton-rom-timeline.json`, `baton-rom-replacement.json`)

| boundary | opponent attacker (AI) | player attacker (A = E+131) |
| --- | --- | --- |
| body active | E-51..E (52 frames) | same |
| attacker sprite hidden (`invisible`) | age 9 = E-42 | age 9 = E-42 |
| `*DoMoveAnimation -> *BufferRunCommand` | E+2 | E+2 |
| party screen opens (`OpenPartyMenuToChooseMon` / `CB2_InitPartyMenu`) | none (AI picks inside the script) | E+4 / E+26 |
| attacker sprite freed | **E+9** (+ healthbox hidden same frame) | E+27 (party-menu init; both sides' sprites freed) |
| confirm accepted | n/a | E+131 (input timing chosen by the probe) |
| battle screen reshown | n/a | A+22 start, A+54 back; old healthbox visible A+48..A+75 |
| instant `returntoball` (sprite destroyed, healthbox hidden) | E+9 | A+76 |
| `gBattlerPartyIndexes` / species | E+10 / E+12 | A+77 / A+79 |
| switch-in message first glyph | E+14 ("... sent out X!") | A+81 ("Go! X!") |
| ball sprite / mon sprite | E+51 / E+52 | A+94 / A+95 |
| first of 15 ball particles | E+69 (ball+18) | A+141 (ball+47) |
| new healthbox visible | E+140 (278), 159 (GOLEM), 217 (SHUCKLE/SABLEYE) | A+159 |

Two species pairs per side give identical rows (AIPOM/ONIX vs NINJASK/GOLEM), except that the opponent tail depends on the replacement species (above).

## 2. Production vs ROM (player attacker; `fixtures/prep27/baton-prod-timeline.json`, `prep27ProdBaton.ts`, routes 71/0 AIPOM and 2/7 NINJASK, both identical offsets; two identical runs)

| boundary | ROM | production | diff (prod - ROM) |
| --- | --- | --- | --- |
| body length | 52 frames | placeholder 32 (no live body; `liveMoveAnimationDuration` null) | n/a until case 226 |
| party screen starts | E+4 ctrl / E+26 screen | P+9 (`forced-party-handoff` el 0) | not comparable (transition frames not pixel-compared) |
| confirm -> fade/close | A+0 close, A+22 reshow | A+1 fade-out start, A+17 black | n/a (different phase naming) |
| battle screen back | A+54 | A+56 (battle fade-in start) | +2 |
| outgoing healthbox drawn on the reshown screen | A+48..A+75 | **not drawn** (healthbox first at A+161) | **missing 28 frames** |
| "Go! X!" first glyph | A+81 | A+84 | +3 |
| ball first visible (spawn) | A+94 (spawn) | A+99 (visible) | +5 (spawn vs visible: +3..+4 after a one-frame OAM latch) |
| new healthbox visible | A+159 | A+161 | +2 |
| controller free / action menu | `BattleTurnPassed` includes the opponent's turn: not comparable | A+311 | n/a |

The A anchor is the same event on both sides (confirm accepted); the +2..+5 offsets are the calibration difference between the OFF post-faint flow (what `partySendOut*` was calibrated on) and this Scene ON Baton flow. **Not pixel-compared** (no framebuffer of the ROM party flow was captured); only boundaries.

## 3. Reuse vs new (against the Roar/Whirlwind forced switch-out, `battleResolutionPresentation.ts:664-674, 3229, 3537-3552`; `liveSpriteOrderHost.ts:181-195, 279`)

Reusable as is:
- the **player** continuation: forced-party-handoff + selector send-out (`partySelect.ts`), +2..+5 frames of the ROM from the confirm;
- `FORCED_SWITCH_OUT_TIMING` / `skipAnimation: true` command shape and the `switch-in` unit's ball/particle offsets (opponent ball->particles +18, mon +1: measured identical to Roar's);
- the sprite-order `forced-switch-out {side}` event is already side-keyed (`liveSpriteOrderHost.ts:279`, `payload.battler`); the ROM free for the opponent attacker is again a single slot (battler slot 8; ball slot 3 at E+51, particles E+69..).

New:
1. `case 226` in `liveMoveAnimationDuration` (`liveMoveAnimation.ts:~609`, duration 53 rows) and `config = { move: "BATON_PASS", ... }` (`liveMoveAnimation.ts:~1206`); allocator is the reducer's own (ball slot 3).
2. Renderer pair gate: generalise `battleScene.ts:32569-32665` the way the ROLE_PLAY branch does (`liveSceneOnBattlerArt`, `battleScene.ts:14871`; live names for the healthbox and the "<X> used BATON PASS!" text).
3. Forced removal is keyed on the **target** (`sceneOnMoveTarget === battler`, `battleResolutionPresentation.ts:3537-3541`; `isForcedSwitchOut` requires `target !== battler`, `liveSpriteOrderHost.ts:189-194`). Baton Pass is `target === battler` (BS_ATTACKER): needs an attacker-keyed branch with **hold 9** (not 4) for the opponent and a **message before the send-in** (E+14, ball E+51; Roar has none).
4. Opponent species-keyed tail (healthbox E+140..217, ball start tied to the message length): same table the Roar opponent sweep gave (`forced-switch/species-sweep-opponent-target.txt`) applies for the healthbox; ball start needs the name length.
5. Player: draw the outgoing healthbox + hidden attacker on the reshown battle screen (A+48..A+75), then hide at A+76 and continue into the existing `partySendOut*` sequence.
6. The attacker's `invisible` at age 9 must outlive the body (reducer `attackerInvisible age >= 9`, already the case; the renderer's `displayedAttackerInvisible` lags one row).

## 4. Integration recipe (for the integration lane; not applied)

1. `liveMoveAnimation.ts`: duration `case 226: return 53` + config case beside `:1206` (Encore pattern); allocator slots [3].
2. `battleScene.ts:32569-32665`: replace the `playerToOpponent/opponentToPlayer` AIPOM/ONIX gate with `liveField` art (ROLE_PLAY pattern), live healthbox names, text from the attacker name; keep `batonPassAtAge` untouched (verified 53/53 above).
3. `battleResolutionPresentation.ts:3229/3537-3552`: set `sceneOnMoveAttacker` for a `MOVE_ANIMATION` whose target equals its battler; `returntoball BS_ATTACKER` after it gets `{timing: 9 (opponent) / forced-party path (player), skipAnimation: true}`.
4. Opponent command order: `move-animation > skip-removal hold 9 > sprite-visibility(recall) > message("X sent out Y!", glyphs from E+14) > switch-in (ball E+51)`; species-keyed healthbox/ball tail.
5. `liveSpriteOrderHost.ts:189-194`: accept the attacker-target case; player side: the party menu init frees every battler sprite at E+27 (not modelled; keep `invalidate` for the player until measured against the order plans).
6. Tests: pin the numbers of §1 from `baton-rom-timeline.json`; render test that the opponent attacker is absent from E+9 and (player) the old healthbox is drawn A+48..A+75.

## 5. Endeavor
(written below)

## 6. Reproduction (workspace root; PY = vendor mgba venv)

```
sh tools/integration/prep27Run.sh                  # probes x2 (R1/R2 cmp'd), timelines, reducer check + 3 negatives, production timeline -> tools/integration/fixtures/prep27
REC=/tmp/rec2 SKIP_PROBES=1 sh tools/integration/prep27Run.sh   # second checker pass; cmp -r /tmp/rec2 tools/integration/fixtures/prep27
sh tools/integration/prep27Shift.sh                # body-start shift (lag phase) constancy
node --experimental-strip-types tools/integration/prep27ProdBaton.ts /tmp/p27/prod.json /tmp/p27/prod-receipt.json
```
