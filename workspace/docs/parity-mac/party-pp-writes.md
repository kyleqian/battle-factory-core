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
- Magic Coat against Pressure: the staged battle below (fifth pass).

## Magic Coat against Pressure on the ROM (fifth pass)

Which slot pays: the Magic Coat user's own Magic Coat slot. The attack canceler calls
`PressurePPLose(attacker, target, MOVE_MAGIC_COAT)` (`battle_util.c:740-765`): it needs Pressure on the Pokemon whose
move is reflected, looks for Magic Coat among the four moves of the Pokemon that reflects, and takes one PP there, on
the field and in the party record.

- **With a real Magic Coat slot** (`stages/magic-coat-pressure.json`, lab seed 73000). The only Level 50 set with Magic
  Coat is Kecleon 220 (second challenge), and the only Pressure Pokemon of that challenge, Absol 247, has no move that
  Magic Coat reflects. So the Pressure is moved: the opponent's Venomoth (set 226) takes it from the player's Absol
  with Skill Swap, the player switches to Kecleon and uses Magic Coat every turn. Kecleon's Magic Coat PP at the
  player's decisions, the same on the ROM and in the engine, on the field and in the party record:
  15, 13 (Sleep Powder reflected: one PP for the use, which Pressure never raises, and one for the reflection), 12
  (nothing to reflect: one PP), 11, 9 (reflected), 7 (reflected), 6, 5, 4,
  3, 1 (reflected), 0 (reflected with one PP left: the use takes it, the extra loss finds 0 and takes nothing,
  `:756-757`). Five reflections; the battle matches the ROM to the end.
- **Called by Metronome** (`stages/metronome-magic-coat-pressure.json`, lab seed 76026). Metronome may call Magic Coat
  (it is not in `sMovesForbiddenToCopy`, `battle_script_commands.c:725-747`). The player's Dusclops (set 378,
  Pressure) uses Confuse Ray or Will-O-Wisp every turn against the opponent's faster Clefable (set 389). In the turn in
  which Clefable's Metronome calls Magic Coat, Dusclops's Will-O-Wisp is reflected, and **Clefable's Metronome slot
  pays one PP in all (2 -> 1), no other slot pays**, the same on the ROM and in the engine:
  - the use: Metronome has no `ppreduce` of its own; the called move's script pays from the Metronome slot. Magic
    Coat's `trysetmagiccoat` sets `ppNotAffectedByPressure` (`:9537-9550`), so its `ppreduce` takes one PP even against
    Pressure (`:1212`). In the turns in which Metronome called a move aimed at Dusclops the slot paid two (10, 8, 6, 4,
    2 in this battle).
  - the reflection: `PressurePPLose` looks for Magic Coat among Clefable's four moves (`battle_util.c:747-754`), finds
    none, and takes nothing.

## Not covered (source read, no reachable case found)

The game's Leppa Berry search reads the moves and PP of the **party record** (`battle_util.c:3355-3363`); the engine
reads the Pokemon on the field. The two differ only while the holder is Transformed or has a Mimic move (the field
copy then has other moves). No Level 50 set has Transform or Mimic. Metronome can call Transform, and its two users
(Chansey 227, Clefable 389) do not hold a Leppa Berry. The berry would have to reach one of them through two uses of
Trick by the other side (take it from Nidoking 606 or Lapras 822, then hand it over). Left as it is.
