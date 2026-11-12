# btl188 — where the Scene ON −3 .. −6 anchor-start errors come from (ISSUES #167 (a') remainder), evidence only

No file under `src/` and no existing test changed. Tool: `tools/integration/btl188Rows.ts` (read-only; output committed as
`tools/integration/fixtures/btl188/rows.txt`). Inputs are only committed receipts (`fixtures/off108/receipts/rom-r1.json`, ON runs) and
production's own commands / kernel events (`trn176Predict.ts`'s `trn176Production`); no fresh mGBA probe was needed. Base `91de4951d`.

## Result

**The missing rows are script instructions that run after `waitanimation` releases and before the next presented receipt. Production's
Scene ON live body ends on the ROM's last `waitanimation` row, and the next command starts there instead of
`Δ(N) − Δ(attack) + 1` rows later.** It is not the body's length, not a rows-between-print-and-body gap, and not the stat-change animation.
Scene OFF already prices exactly these rows (they are inside `sceneOffNoHitPauseFrames`); Scene ON replaced the OFF pause by the live body
(`pre 3 + idle lead + live + post 2`), which stops at the release row and carries no tail.

The production rule this implies, per Scene ON live no-hit body (stat / protect / status class; `move-animation` with `animation`):

    tailRows = Δ(N) − Δ(attack) + 1  +  (ROM release row − body end)
    Δ(N)     = instructionExecution of the next receipt the script emits after waitanimation (STATS_CHANGE `animation`, or a print)
    Δ(attack)= instructionExecution of the MOVE_ANIMATION receipt
    (ROM release row − body end) = 0 for the three bodies with post rows (Bulk Up, Protect, Detect); +2 for Sand-Attack (below)

`Δ(N) − Δ(attack) + 1` is the same expression `sceneOffNoHitPauseFrames` uses (`P = Δ(N) − Δ(attack) + lead`, lead 1 for a print and for
STATS_CHANGE; `src/engine/battleResolutionPresentation.ts:880-905` comment, function at :1012). Applying it to the five rows gives the observed
ON-specific shortfall exactly (table 3). Nothing here is applied: this is the measurement.

## 1. Coordinates

`c` = ROM row after the used print's last glyph row G (`off108Rom.py`: G = release row − 2; `runs[i][1]` is already in c). A production
frame `f` counted from the used print's first glyph is `c = f − (G − firstGlyph)` (Bulk Up / Protect: 20, Sand-Attack 24, Double Team 24).
The glyph / stats-change conventions are the OFF-exact ones (a print's first glyph is `printfromtable` row + 2; production's `stats-change`
command starts one row after the ROM stat-animation wait run starts: Scene OFF Bulk Up stats-change at c41 against the wait run at c40, glyph
c121 exact). "start Δ" below is `trn176Predict.ts --scene=on|off`'s `anchorStartDelta` (production message start − ROM first glyph).

## 2. Row tables

### Bulk Up (ply Primeape vs Onix; kernel attackanimation exec 5, STATS_CHANGE 8, prints 10 / 12 → 78 / 80)

| c | ROM row (script label, `data/battle_scripts_1.s:2716-2739`) | production (ON) | Δ |
|---|---|---|---|
| 1 | `ppreduce` (the attackstring controller wait releases here) | body starts (113 = pre 3 + idle lead 4 + live 104 + post 2) | 0 |
| 2 | `jumpifstat` (`EffectBulkUp+3`) | body | |
| 3 | `attackanimation` (`BulkUpDoMoveAnim+0`) | body | |
| 4..114 | `waitanimation` blocked on the controller, 111 rows (= idle lead 4 + live 104 + 3); c114 is the release row (`Cmd_waitanimation`, `battle_script_commands.c:1801`, executes when `gBattleControllerExecFlags == 0`) | body c1..c113; **the next command starts on c114** | body 1 short of c115 |
| 115 | `setbyte sSTAT_ANIM_PLAYED` (`+2`) | none | **missing** |
| 116 | `playstatchangeanimation` (`+8`, `Cmd_playstatchangeanimation` :4111) | none | **missing** |
| 117..193 | stat animation wait (`+12`), 77 rows; first blocked row c117, last row executes `setstatchanger` | `stats-change` c114..c191 (78 = 76 + hold 2); expected start c118 | **−4** |
| 194..196 | `statbuffchange`, `jumpifbyte`, `printfromtable` (`+18/+24/+35`) | `stat` c192-c193 (2) | (inside the −4) |
| 197..283 | `waitmessage` wait (`+40`), glyph c198 | ATTACK message c194..c281 | **−4** |
| 284..287 | `setstatchanger`, `statbuffchange`, `jumpifbyte`, `printfromtable` (`TryDef+0..+23`) | `stat` c282-c283 (2) | −1 more (the OFF-shared print-to-print row, see below) |
| 288..375 | `waitmessage` wait, 88 rows, glyph c289 | DEFENSE message c284..c371 (88) | **−5** (= tool "start Δ −5") |

Of the −5: **−4 is ON-specific** and is exactly the four rows c114..c117 above (release row c114, `setbyte` c115, `playstatchangeanimation`
c116, first blocked stat-animation row c117) that production's next command should start after. The other −1 is not ON: Scene OFF has it too
(OFF start Δ −1, anchor-end Δ 0): ATTACK message 88 + `stat` 2 = 90 against the ROM's glyph-to-glyph 91 (ATTACK's print wait is 87 rows, DEFENSE's 88),
absorbed by the OFF/ON print convention that the trn181 transition pause already uses (anchor-end Δ = start Δ + 1).

### Protect (ply Primeape vs Onix; attackanimation exec 5, print 7)

| c | ROM row (`battle_scripts_1.s:1532-1542`) | production (ON) | Δ |
|---|---|---|---|
| 1 | `ppreduce` | body starts (128 = pre 3 + live 123 + post 2) | 0 |
| 2 | `setprotectlike` (`EffectProtect+3`) | body | |
| 3 | `attackanimation` (`+4`) | body | |
| 4..129 | `waitanimation` wait (`+5`), 126 rows (= live 123 + 3); c129 is the release row | body c1..c128; **"protected itself!" starts on c129** | |
| 130 | `printfromtable` (`+6`, `Cmd_printfromtable` :2180) | none | **missing** |
| 131..220 | `waitmessage` wait (`+11`), 90 rows, first blocked row c131 | none | **missing** |
| 132 | the print's first glyph | message c129..c217 (89) | **−3** (= tool "start Δ −3", OFF start Δ 0) |

Detect is the same shape (wait 113 = live 110 + 3, body 115, glyph c119, message at c116): −3. Release − body end = 0 in all three.

## 3. The five rows

`tailRows = Δ(N) − Δ(attack) + 1 + (release − body end)`; `ON-specific shortfall` = ON start Δ − OFF start Δ (`trn176Predict.ts`).

| row | Δ(N) − Δ(attack) | release − body end | tailRows | ON start Δ | OFF start Δ | ON-specific | ON anchor-end Δ (trn181 residual) | after tail |
|---|---|---|---|---|---|---|---|---|
| Bulk Up | 3 (STATS_CHANGE 8 − 5) | 0 | **4** | −5 | −1 | −4 | −4 | 0 |
| Protect | 2 (print 7 − 5) | 0 | **3** | −3 | 0 | −3 | −3 | 0 |
| Detect | 2 | 0 | **3** | −3 | 0 | −3 | −3 | 0 |
| Sand-Attack | 3 (STATS_CHANGE 13 − 10) | **2** | **6** | −6 | 0 | −6 | −6 | 0 |
| Double Team | window (below) | n/a | **5** | −5 | 0 | −5 | −5 | 0 |
| Rest | not decomposed (below) | | | −22 | −1 | −21 | −3 | ? |

`btl188Rows.ts` prints, per row, the ROM milestones, production's body / next-command rows, the kernel executions and
`formula = (n−a)+1+(release−bodyEnd)` against the measured `short`: 4/4, 3/3, 3/3, 6/6 (Double Team is outside the formula).

**Sand-Attack's extra 2.** Move 28 is not in `LIVE_MOVE_POST_ROW_SIDES` (`battleResolutionPresentationRender.ts:1144`), so its body is
pre 3 + live 58 + post 0 = 61 against the ROM's `waitanimation` run of 62 (live + 4, not live + 3). Its body also starts one row before
the ROM `attackanimation` (c3 against c4) because the 2-frame `stat` command (the `statbuffchange` receipt) precedes it. The result is that the body ends
on c63 while the release row is c66. Whether those two rows belong as post rows (the rows repeat the last body row) or as part of the tail is not decided
here; the tail formula needs the measured gap for any move outside the post list, so a general rule has to take `release − body end` from the adapter's
trail data (idle94/idle98 tables), not assume 0.

**Double Team** has no `stats-change` command (the live window owns the banner, `STATS_CHANGE_OWNING_LIVE_MOVE_IDS` :3986, sc106 §2). Production: `stat` c1-c2, window
c3..c241 (239), message at c242. ROM: attackanimation c4, wait c5..c166, `setbyte` c167, `playanimation` c168, stat wait c169..c245, `waitmessage`
c246, glyph c247. A stats-change would start at c170 = release c166 + 3 + 1 (the same formula) and the stat run is 77 rows, glyph c247 exactly. So the window
is 5 rows short at its tail. That is the DT window-tail gap sc106 §2 recorded as 8 rows (9 to the visible box); it is now 5 and sits at the same place.

**Rest.** Not a stat/protect body. Its anchor is the HP bar of the previous action's Tackle, and its "−22 start / −3 end" is a property of the
tool's synthetic route, not a measured error: (1) the synthetic Tackle (Onix → Snorlax in `trn176Production`'s field) has no live duration
(`liveMoveAnimationDuration` returns null for every body class), so its `move-animation` is the 32-row bounded fallback instead of the ROM's 45-row wait
run (the production hit-animation starts c33, the ROM `hitanimation` row is c53); (2) the HP bar is the synthetic 28 rows against the ROM's 10 (trn176
doc). The two roughly cancel (−21 + 18 → the −3). A real-stat Rest needs the real battle-lab route and its dense window (as trn181 did for Scratch); this
doc does not claim a value for it.

## 4. Source mechanism (file:line)

ROM (`/srv/pokebench/vendor/pokeemerald`):
- `src/battle_main.c:5266` `RunBattleScriptCommands`: one script command per row, only when `gBattleControllerExecFlags == 0`. Every script
  instruction that does not wait costs one row.
- `src/battle_script_commands.c:1743` `Cmd_attackanimation` (emits the controller request, advances), `:1801` `Cmd_waitanimation` (advances on the first row with
  no controller busy: the release row, the last row of the blocked run), `:4111` `Cmd_playstatchangeanimation` (emits the stat animation and advances), `:2180` `Cmd_printfromtable`.
- `data/battle_scripts_1.s:2716-2739` (`BattleScript_EffectBulkUp` .. `BulkUpDoMoveAnim` .. `BulkUpTryDef`): `waitanimation`, `setbyte`,
  `playstatchangeanimation`, then the blocked stat animation. `:1532-1542` (`BattleScript_EffectProtect`): `waitanimation`, `printfromtable`, `waitmessage`.

Production:
- `src/engine/battleResolutionPresentationRender.ts:1137-1138` `LIVE_MOVE_PRE_ROWS 3` / `LIVE_MOVE_POST_ROWS 2`, `:1162` `liveMoveUniversalRows`, `:1208-1215`
  (`battleResolutionCommandDuration`, `move-animation`: `seGate + scriptLead + pre + idleLead + live + post`). idle98 calibrated these so a hit body's next
  command (hit-animation) starts right; the body ends on the `waitanimation` release row. A no-hit body has more script rows after the release row, which have no
  production counterpart.
- `src/engine/battleResolutionPresentation.ts:4273-4290`: the ON `MOVE_ANIMATION` command. Its timing carries `moveAnimationScriptLeadTiming` (:1317, sub183:
  the script rows *before* `attackanimation`); there is no counterpart for the rows *after* the release. That is the place the tail would be modelled (a
  `scriptTailFrames` beside `scriptLeadFrames`, presented as more post rows, or a marked draw-nothing pause as trn181's `actionTransition`).
- Scene OFF prices the same rows in `sceneOffNoHitPauseFrames` (:1012, comment :880-905): `P = Δ(N) − Δ(attack) + lead`.
- `statsChangeNextReceiptHoldFrames` (:4023, scf117) is unaffected: it is correct *relative to the stats-change command's start*. The −4 is entirely before that
  start (it shifts the command; the command's internal 78 + 2 is ROM-exact, c118 + 78 + 2 = c198).

## 5. Not covered

- The rule is derived from five ROM bodies (Bulk Up, Protect, Detect, Sand-Attack, Double Team); it predicts them exactly and it predicts nothing about
  bodies not in the receipts (Agility, Curse, Swords Dance, Rest, two-turn charges, the miss path). Every other no-hit live body probably carries its
  own `release − body end` (post rows listed or not).
- Pixel content of the tail rows is not measured. By the idle98 post-row finding (the screen stays equal to the first inactive row until the next change) holding the last body
  row is expected, but no dense ON window was taken here.
- Rest (above), the Toxic upstream −19 (status-animation) and the print-length residuals (Snore +10, Dig +4, Dynamic Punch +1) are outside this finding.

## Reproduce

```sh
node --experimental-strip-types --no-warnings tools/integration/btl188Rows.ts            # == tools/integration/fixtures/btl188/rows.txt
node --experimental-strip-types --no-warnings tools/integration/trn176Predict.ts --scene=on   # start Δ / anchor-end Δ columns
node --experimental-strip-types --no-warnings tools/integration/trn176Predict.ts --scene=off  # the OFF start Δ column
```
