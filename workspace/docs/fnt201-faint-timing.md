# fnt201: faint presentation timing vs the ROM

Question: does production present `BattleScript_FaintTarget` / `BattleScript_FaintAttacker`
(`playfaintcry; pause B_WAIT_TIME_LONG; dofaintanimation; cleareffectsonfaint; printstring`,
`data/battle_scripts_1.s:2809-2823`) with the ROM's rows, in Scene OFF and Scene ON, for the four faint routes?

Conclusion: no, in every route. Production presented no cry/pause/dispatch rows at all (-65..-73 rows before the
faint sink), the player's slide was 2-3 rows too long, and Scene ON added a 32-frame `status` after the faint.
One shared source rule fixes all 16 route x scene cases to residual 0. The `sst200` Memento gap (-65 OFF / -34 ON)
was this same defect, not a Memento-specific one.

## Method

- `tools/integration/fnt201Stage.py` writes seven mechanicLab scenarios from the sst200 template
  (`tools/integration/fixtures/fnt201/scenarios/`, seed 11): ordinary foe KO (PRIMEAPE Frustration vs a zero-EV ABRA),
  ordinary player KO (the reverse), Self-Destruct against a survivor (SHUCKLE), against ONIX, and against ABRA (both
  faint), and a 1-HP SHEDINJA fainting to Sandstorm and to Toxic (end of turn). Memento comes from the sst200 scenarios.
- `tools/integration/lsd194Probes.sh` (`bash`) runs each scenario twice in fresh direct-mGBA probes in both scenes
  (`tools/run-mgba-probe.py` + `sub183RomFrames.py`). r1 == r2 for every job (`fixtures/fnt201/rom/r1-r2-identity.txt`).
- `tools/integration/fnt201RomRows.py` extracts per-faint anchors from the per-frame trace using the map symbols
  `BattleScript_FaintTarget/Attacker` (script offsets +0 cry, +2 pause, +5 dofaintanimation, +7 cleareffectsonfaint, +9
  printstring): `execIdle`/`prevGlyph` (the previous HP drain end or print), `cry`, `anim` (first busy controller row of
  `dofaintanimation`), `animRows`, `glyph` (first screen change after printstring reaches +12). Output:
  `fixtures/fnt201/rom-rows.json`.
- `tools/integration/fnt201Compare.ts` runs production on the same scenario (`fnt201Production.ts`: real kernel +
  `projectBattleResolutionCommands`) and compares, per anchor: `toSink` = faint start + lead minus (HP drain end | previous
  print's first glyph), `toGlyph` = next message start minus sink start. A 1-HP bar has no converging source program in
  `battleHealthBar`; `lsd194Production({lenientHp})` keeps that command's minimum (the comparison does not depend on it).

## Table (rows ROM / production / residual; before = HEAD `c6f28b9fe`, after = this change)

`toSink` = anchor -> dofaintanimation busy row. `toGlyph` = sink -> "X fainted!" first glyph. Full output:
`fixtures/fnt201/production-vs-rom-before.txt` and `-after.txt`.

| Route | Scene | toSink before | toGlyph before | Residual after |
| --- | --- | --- | --- | --- |
| 1 ordinary KO, foe faints (ABRA) | OFF | 73/0/-73 | 20/20/0 | 0 / 0 |
| 1 ordinary KO, foe faints (ABRA) | ON | 73/0/-73 | 20/51/+31 | 0 / 0 |
| 2 ordinary KO, player faints (ABRA) | OFF | 73/0/-73 | 18/21/+3 | 0 / 0 |
| 2 ordinary KO, player faints (ABRA) | ON | 73/0/-73 | 18/52/+34 | 0 / 0 |
| 3 Self-Destruct, foe also faints (first faint) | OFF | 72/0/-72 | 20/20/0 | 0 / 0 |
| 3 Self-Destruct, foe also faints (first faint) | ON | 72/0/-72 | 20/51/+31 | 0 / 0 |
| 3 Self-Destruct, attacker faints (ONIX, SHUCKLE survive) | OFF | 161/90/-71 | 19/21/+2 | 0 / 0 |
| 3 Self-Destruct, attacker faints (ONIX, SHUCKLE survive) | ON | 161/90/-71 | 19/52/+33 | 0 / 0 |
| 3 Memento (PRIMEAPE faints) | OFF | 162/95/-67 | 19/21/+2 | 0 / 0 (total 181/116/-65 -> 181/181/0) |
| 3 Memento (PRIMEAPE faints) | ON | 162/95/-67 | 19/52/+33 | 0 / 0 (total 181/147/-34 -> 181/181/0) |
| 4 end of turn: Sandstorm, Shedinja | OFF | 68/0/-68 | 20/20/0 | 0 / 0 |
| 4 end of turn: Sandstorm, Shedinja | ON | 68/0/-68 | 20/51/+31 | 0 / 0 |
| 4 end of turn: Toxic, Shedinja | OFF | 68/0/-68 | 20/20/0 | 0 / 0 |
| 4 end of turn: Toxic, Shedinja | ON | 68/0/-68 | 20/51/+31 | 0 / 0 |

Constant ROM facts (all 16): `anim - cry = 66` (cry 1 + `pause` 64 + dispatch 1); `glyph - anim = animRows + 3`; foe
`animRows` 17, player ABRA 15, PRIMEAPE 16.
Self-Destruct against ABRA: the attacker's own FaintAttacker sits behind an unpressed A prompt in the ROM trace (only
the target's faint is measured); production gives it the same lead. Not claimed.

## The shared rule (production, `src/engine/battleResolutionPresentation.ts`)

1. **Lead.** The faint command's timing gains `leadFrames` = `FAINT_SCRIPT_LEAD_FRAMES` (66: `playfaintcry` 1 +
   `pause B_WAIT_TIME_LONG` 64 + the `dofaintanimation` dispatch row; `battle_scripts_1.s:2809-2823`) +
   `faintScriptPreCryFrames`. `minimumFrames` includes it; the renderer keeps the sprite and healthbox untouched for the lead, then runs the sink
   (`battleResolutionPresentationRender.ts`, `faintElapsed`).
2. **Pre-cry rows** come from the kernel's per-row `instructionExecution`, not from a per-move constant: after an HP update
   (the `hp` command carries `healthbarupdate`'s execution) `cry - healthbarupdate - 1` rows (7 for a target KO: critmessage,
   waitmessage, resultmessage, waitmessage, seteffectwithchance, tryfaintmon...; 2 for a weather/poison faint); after a print
   `cry - print - 1 - holdFrames` rows (the print's own `waitmessage B_WAIT_TIME_LONG` is already the message command's hold),
   less the one-frame MoveEnd sprite-visibility commands already emitted (Self-Destruct 5, Memento 1).
3. **Player slide.** `PlayerHandleFaintAnimation` sets `sSpeedY = 5` with `SpriteCB_FaintSlideAnim`;
   `FreeMonSpriteAfterFaintAnim` (`battle_controller_player.c:1314-1326`) frees the sprite and healthbox when
   `y + y2 > DISPLAY_HEIGHT`. `y = 80 + back-pic y_offset` (`GetBattlerSpriteFinal_Y`, `battle_anim_mons.c:269-292`;
   `gMonBackPicCoords`), so the healthbox vanishes at `floor((80 - y_offset) / 5) + 2` (ABRA 15, PRIMEAPE 16; the old
   `ceil(64 / 5) + 5 = 18` was the y_offset 0 case). The foe's tile-row sink (`8 - floor(yOffset / 8)` steps) was already exact.
4. **Scene ON faint status.** The `cleareffectsonfaint` -> `printstring` status command takes the print-minus-status
   instruction rows (1) in both scenes; Scene ON's generic 32-frame status stays for every other status write.

Only the faint routes change: no kernel event, RNG draw or outcome is touched, and nothing reads the ROM fixtures at runtime.

## Files

- Production: `src/engine/battleResolutionPresentation.ts`, `src/engine/battleResolutionPresentationRender.ts`.
- Test: `tests/fnt201FaintTiming.test.ts` (Tier 1, 18 tests).
- Tooling/evidence: `tools/integration/fnt201{Stage.py,RomRows.py,Production.ts,Compare.ts}`, the `lenientHp` option in
  `lsd194Production.ts`, `tools/integration/fixtures/fnt201/`.

## Results

Single vitest files, one at a time, `POKEBENCH_VITEST_MAX_WORKERS=1`, each under `timeout`; all pass after the change:
`fnt201FaintTiming` (18, new), `battleResolutionPresentation` (39), `sst200SecondStatRows` (27), `pfr192PlayerFaintSendInClock` (8),
`msg175UsedMessageDuration` (3), `offs152SceneOffForcedSwitch` (6), `offs152SendInTailOff` (7), `factoryRoundBattleOrchestrator` (56, 62 s),
`turn5ResolutionAdapterEquivalence`, `turn13ResolutionAdapterEquivalence`, `turn5FaintPresentationStaging`, `turn13DragonBreathPresentationStaging`,
`presentationTerminalSeamTrainerSlide`, `gate6OhkoReceipt`, `land75HiddenBattler`.

Pins that moved (all attributed to the 66-row `playfaintcry` / `pause B_WAIT_TIME_LONG` / dispatch lead):
- `battleResolutionPresentation.test.ts` "retains a genuine player forced-switch boundary...": faint timing gains `leadFrames: 66`, `minimumFrames` 20 -> 86
  (`healthboxVanishFrame` 18 unchanged: ONIX back y_offset 0).
- same file, "sinks a zero-HP battler...": the sink geometry is now sampled at lead + 6 (skipPixelRows 30 unchanged).
- `sst200SecondStatRows.test.ts`: Memento's next print ("PRIMEAPE fainted!") is now asserted, ROM 181 in both scenes (production was 116 OFF / 147 ON).

Not present in this checkout: `pfr185*`, `battleResolutionFaint*`. Not run (216 test files mention "faint"; only those with faint timing/command
pins above were run): the full suite, `npm run build`, `npm run typecheck` (supervisor instruction). Production code changed, so the
supervisor's full suite / build / typecheck is still required for this commit.

Open: 1-HP healthbars (Shedinja) still have no converging `battleHealthBar` program (`source program did not converge 1->0/1`); unrelated to the
rule above and outside the Factory rental set, left unchanged (the tool's `lenientHp` option only keeps the timeline comparable).

## rep203 re-pins (union c7d8eab9a = master a6f9cbdb1 + fnt201 420b14c21 + hpb202)

Every pin below was re-measured on the master, fnt201-only (`git archive 420b14c21`) and union trees; hpb202 contributed 0 to every one of them
(fnt201-only and union numbers are identical). Battle / turn / end state unchanged in every soak pin. No surprise pin: all movement is the faint lead.

- `randomRoundSoak.test.ts` (`tools/integration/lsd194SoakPins.ts`): seven-wins seed 21 37,467 -> 39,117 (renderCalls 2,674 -> 2,782); full seed 0
  17,125 -> 17,485, seed 1 26,817 -> 27,295; vanilla seed 0 8,895 -> 9,140, seed 1 8,920 -> 9,190 (all fnt201).
- `sc106StatsChangeCommand.test.ts` (`tools/integration/rep203FaintCount.ts`): seed 0 slot 2 Acid Armor route total 6,701 -> 6,771 (+70; 2 faint
  commands, both after the anchor, so the anchor and the +90 are unchanged); seed 6 slot 0 Intimidate anchor 2,831 -> 2,867 (+36; 1 faint before
  it; the +76 is unchanged); seed 13 slot 3 Tickle route total 9,627 -> 9,707 (+80; 2 faints after the anchor). All fnt201.
- `sa125StatusAnimationCommand.test.ts` SA3 and `off121StatusCommand.test.ts` Scene ON status: the `cleareffectsonfaint` status (event provenance
  opcodeName `B_SCR_OP_CLEAREFFECTSONFAINT`) is asserted to be 1 frame (sa125's `STRINGID_TARGETFAINTED|false` table row 32->32 -> 32->1) and must
  occur; every other status keeps 32 (or the animated delta).
- `sgl138SeGateLive.test.ts` / `fixtures/sgl138-live-receipt.json` (regenerated with `sgl138Live.ts`; diff = only the 8 `battles/<seed>-<scene>/frames`
  totals, every banner / hit / print anchor and gate row unchanged): seed 0 on 22,560 -> 22,748, off 18,164 -> 18,506; seed 9 on 15,446 -> 15,592,
  off 12,812 -> 13,078; seed 19 on 41,662 -> 41,854, off 33,080 -> 33,428; seed 808 on 20,490 -> 20,686, off 14,072 -> 14,422 (all fnt201).

Each file passes alone (`POKEBENCH_VITEST_MAX_WORKERS=2`), plus `fnt201FaintTiming` (18), `hpb202HealthBarPrograms` (14), `sst200SecondStatRows` (27),
`battleResolutionPresentation` (39), `lsd194PrintFloorAndDrain` (12). The full suite / build / typecheck / census were not run (supervisor).

## Final-code gates (supervisor, 2026-10-23, CAX31)

Tested `f96e8e805` (src tree `d8fda5802` = union `c7d8eab9a` of master `a6f9cbdb1` + fnt201 + hpb202; typecheck fix `420b14c21`; re-pins
rep203). Logs `.integration/validation/sv-20261022/{fnt201,union}/` (ignored).

- Supervisor fresh ROM probes (fnt201 ko-foe OFF, ko-player ON): rows identical to `fixtures/fnt201/rom-rows.json`, r1 == r2.
  hpb202 Shedinja KO (opponent OFF, player ON): fresh r1 == r2, `hpb202BarCompare.ts` residual 0, receipts byte-identical.
- Typecheck 0 (after narrowing the pre-cry anchor, `420b14c21`).
- Census 0..999 both scenes, master `a6f9cbdb1` vs `c7d8eab9a`, hpb202's fixed harness in both arms (`rst197CensusDelta.py`):
  digests / errors identical in 1000 / 1000 (OFF seed 881 = the known 200k frame-budget stall in both arms, cut at a different
  command); 997 complete + 3 budget per arm (the 82 former "invalid HP program" harness throws are gone). Changed commands: faint
  (ON 4,327, OFF 4,323; +62 .. +76 = 66 + pre-cry rows - the player-slide correction; one +135: an Explosion that broke a Substitute,
  pre-cry rows include the "SUBSTITUTE faded" print's wait, unmeasured) and the Scene ON `cleareffectsonfaint` status 32 -> 1 (4,327).
- Differential (3 traces, base `a6f9cbdb1`): 641 / 641.
- Full suite on `f96e8e805`: 1,690 files / 14,051 tests passed, 0 failed. Build 0.
- Soak gates on src `d8fda5802`: vanilla 0:20 20 / 20 OK (all budget); varied-RNG first-round winning carry 0 / 14 / 28 and
  winning-swap carry 0: 100 / 100 OK each (0 crash, 0 hang).
