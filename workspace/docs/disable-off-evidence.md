# Disable / `B_SCR_OP_DISABLELASTUSEDATTACK` evidence

This is a side-lane source-and-oracle checkpoint for the next main registration. It adds no production interpreter or controller code.

## Source-pinned facts

- The macro is one opcode plus a four-byte pointer, so `0xA3` is five bytes. `Cmd_disablelastusedattack` advances by five on success and otherwise assigns the pointer at `+1` ([`battle_script.inc:863`](../reference/pokeemerald/asm/macros/battle_script.inc), [`battle_script_commands.c:7992`](../reference/pokeemerald/src/battle_script_commands.c)).
- It searches `gBattleMons[gBattlerTarget].moves[0..3]` for the **move id** in `gLastMoves[target]`; it saves only `disabledMove`, not a slot. With duplicate move ids, the first matching slot supplies the PP test ([`battle_script_commands.c:7996`](../reference/pokeemerald/src/battle_script_commands.c)).
- Success requires `disabledMove == MOVE_NONE`, a match, and nonzero PP in that selected slot. It fills `gBattleTextBuff1`, stores that target-owned move id, then makes exactly one local RNG draw: `(Random() & 3) + 2`, copied into both four-bit timer fields ([`battle_script_commands.c:8001`](../reference/pokeemerald/src/battle_script_commands.c), [`battle.h:70`](../reference/pokeemerald/include/battle.h)). No failure path consumes RNG or mutates this state.
- The effect runs `ppreduce` and `accuracycheck` before Disable's opcode. A duplicate can therefore spend PP and its preceding accuracy draw before jumping to `BattleScript_ButItFailed`; success reaches the direct “was disabled” string. The command does not set `MULTISTRING_CHOOSER` ([`battle_scripts_1.s:1183`](../reference/pokeemerald/data/battle_scripts_1.s), [`battle_message.c:187`](../reference/pokeemerald/src/battle_message.c)).
- There is no command-local special case for zero/invalid last moves, Struggle, or Encore. Standard move slots do not contain Struggle/Unavailable, so those values fail the lookup; an empty `MOVE_NONE` slot normally fails the PP check. Encore and Disable are separate selection limitations ([`battle_util.c:1082`](../reference/pokeemerald/src/battle_util.c)).
- If the target tries the disabled move after admission, `CANCELER_DISABLED` marks `usedDisabledMove`, cancels multi-turn state, sets the unable marker, and jumps to “is disabled” ([`battle_util.c:2122`](../reference/pokeemerald/src/battle_util.c), [`battle_scripts_1.s:3354`](../reference/pokeemerald/data/battle_scripts_1.s)).
- End-turn first removes a stale disabled id silently; otherwise it predecrements the timer and emits “disabled no more” only on zero. Full DisableStruct clears occur at battle start and battler reload/switch paths, which also reset `gLastMoves`; there is no separate direct HP-zero clear in the audited command/end-turn code ([`battle_util.c:1696`](../reference/pokeemerald/src/battle_util.c), [`battle_main.c:3043`](../reference/pokeemerald/src/battle_main.c), [`battle_main.c:3206`](../reference/pokeemerald/src/battle_main.c)).
- `Cmd_disablelastusedattack` itself has no battle-type condition. Palace differs only in the disabled-selection script route; ordinary singles use the standard selection script ([`battle_util.c:976`](../reference/pokeemerald/src/battle_util.c)).

## Oracle observation (Battle Scene OFF)

`tools/battle-lab/mechanic-disable-kadabra-chansey-off.json` uses six complete legal pre-battle party records. Its active Kadabra has actual Level-50 carrier `FRONTIER_MON_KADABRA_1`'s `[Confusion, Role Play, Future Sight, Disable]` loadout ([`battle_frontier_mons.h:1186`](../reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h)); Chansey has four Tackle slots, which forces real AI choice without injecting a decision.

Two replayed full manifests are byte-identical: `ea9f51393ba1fe6ff2d89b0ca3893afb184086fde7f1a9588d533cc4c33a1019`. Scenario SHA-256: `d28949e32478bc2fc9f06bbebbc7aa2d40f694ebb60c5a3918b168f7e5164965`.

- Frame 800: Disable (`currentMove: 50`) succeeds; Kadabra PP is `[24,10,15,19]`.
- Frame 2100: a second Disable has PP `[24,10,15,18]`, the source-defined already-disabled failure path.
- Frame 2200: Chansey is executing real Struggle (`currentMove: 165`) while all its four legal selections are Tackle.
- Frame 3000: Tackle (`currentMove: 33`) resumes and a Tackle PP slot is `34`; this is externally consistent with expiry.

The public manifest does not expose `DisableStruct.disabledMove`, either timer, `gLastMoves`, PC, decoded messages, or command-local RNG call boundaries. Accordingly, duration/ownership/clear details are source facts; no internal timer value is claimed from the oracle.
