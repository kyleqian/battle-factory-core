# Three PP changes were not written to the party record (Perish Song and Magic Coat against Pressure, Leppa Berry)

Found by the wide compare on the old pool with the old player (ROM seeds 5908 and 7879), and by reading the same kind
of write everywhere else.

## Symptom

- Seed 5908: the player's Murkrow is locked into Perish Song by Encore and uses it while the opponent's Absol
  (Pressure) is on the field. Battler PP goes 2 -> 0 on both sides. ROM party record: 0. Engine party record: 1.
- Seed 7879: the opponent's Nidoking eats its Leppa Berry when Horn Drill is at 0 PP. Battler PP 5 on both sides.
  ROM party record: 5. Engine party record: 0.

Every turn state matched in both battles; the old compare never looked at the party record.

## What it changes for the game

A switch-in rebuilds the PP from the party record. So in the engine:

- a Perish Song user that paid the extra Pressure PP got that PP back when it left the field and returned;
- a Magic Coat user that bounced a move from a Pressure Pokemon got the extra PP back the same way;
- a Pokemon whose Leppa Berry restored a move lost the restored PP again when it left and returned (the move was back
  at 0 PP).

The party menu and the summary screen read the same record, so they showed the wrong PP too. With the old test player
nobody left the field by choice, so no battle number ever changed.

## C source

Three places change PP outside `Cmd_ppreduce`, and each ends with a controller write of the party Pokemon:

| | source | write |
|---|---|---|
| Perish Song against Pressure | `PressurePPLoseOnUsingPerishSong`, `battle_util.c:799-828` (called by `Cmd_trysetperishsong`) | `:822-827` `BtlController_EmitSetMonData(REQUEST_PPMOVE1_BATTLE + perishSongPos)` |
| Magic Coat (and Snatch) against Pressure | `PressurePPLose`, `battle_util.c:740-765` | `:759-763` `REQUEST_PPMOVE1_BATTLE + moveIndex` |
| Leppa Berry | `ItemBattleEffects`, `HOLD_EFFECT_RESTORE_PP`, `battle_util.c:3347-3381` | `:3377` `i + REQUEST_PPMOVE1_BATTLE` with the restored value; the battler's PP is set in the `ITEM_PP_CHANGE` tail (`:3615-3617`) |

## Engine and fix

- `src/engine/battleScriptTrysetperishsongOpcode.ts`: the extra loss changed the battler only. It now writes the party
  record and sends the one `set-battler-pp-data` controller update, as the Imprison handler already did.
- `src/engine/battleScriptAttackCancelerOpcode.ts` (Magic Coat bounce): it changed the battler and sent the update but
  did not write the party record. (The Snatch branch next to it already did.)
- `src/engine/battleEndTurnOrchestration.ts` (`runItemsTick`, Leppa): it changed the battler only; a comment said the
  engine had no party PP record, which stopped being true.

## Every party write of the game's battle code, checked

`BtlController_EmitSetMonData` is called at 31 places in `battle_util.c` and `battle_script_commands.c`. Each was
matched to the engine's party write:

| field | game sites | engine |
|---|---|---|
| status | attack canceler (`battle_util.c:2273`), Uproar wake (`:1638`), Yawn (`:1763`), Shed Skin (`:2637`), immunity abilities (`:2949`), end-turn item cures (`:3612`), move-end item cures (`:3763`), `SetMoveEffect` (`battle_script_commands.c:2488`), Smelling Salt (`:2832`), Rest (`:6780`), Heal Bell (`:8461`), Refresh (`:9126`), Natural Cure (`:9598`) | written |
| status | faint (`:3072`), Fire-move defrost (`:4267`) | were missing: fixes 31 and 30 |
| PP | `Cmd_ppreduce` (`:1242`), Grudge (`:3039`), Spite (`:8350`), Imprison (`battle_util.c:794`), Snatch (`:762`) | written |
| PP | Perish Song (`:825`), Magic Coat (`:762`), Leppa Berry (`:3377`) | were missing: this fix |
| PP | Sketch (`battle_script_commands.c:8182`) | no Factory set has Sketch, and Metronome cannot call it |
| held item | Thief / Covet (`:2790`, `:2794`), `removeitem` (`:5911`), Trick (`:9248`, `:9252`), Recycle (`:9820`) | written |
| HP | `datahpupdate` (`:1974`), `setatkhptozero` (`:6584`) | written |

## Proof

- ROM seeds 5908 and 7879 on the fixed engine: every turn state and every wide state match (see `STATUS.md`).
- Tests (each fails without the fix): `tests/battleScriptTrysetperishsongOpcode.test.ts` "writes the Pressure PP loss
  to the party record ..."; `tests/gate6LeppaBerryReceipt.test.ts` (party PP after the restore);
  `tests/battleScriptAttackCancelerOpcode.test.ts` "delegates PressurePPLose to the Magic Coat owner's ..." (party PP).
- Magic Coat against Pressure has no ROM battle yet (source and test only); a staged battle is on the list.
