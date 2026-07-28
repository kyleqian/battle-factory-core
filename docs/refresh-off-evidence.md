# Refresh / `B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED` evidence

This is a SIDE-lane, source-and-Battle-Scene-OFF evidence checkpoint. It adds no production interpreter, controller, rendering, or animation code.

## Source-pinned facts

- `cureifburnedparalyzedorpoisoned` is opcode `0xCD`: one opcode byte plus one four-byte relocation pointer. `Cmd_cureifburnedparalyzedorpoisoned` advances five bytes on success and loads that pointer from `PC + 1` on failure ([`battle_script.inc`](../reference/pokeemerald/asm/macros/battle_script.inc), [`battle_script_commands.c`](../reference/pokeemerald/src/battle_script_commands.c)).
- The predicate and owner are exact: only `gBattleMons[gBattlerAttacker].status1 & (STATUS1_POISON | STATUS1_BURN | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON)` succeeds. Success assigns that whole active attacker `status1` word to zero, so a Toxic counter is cleared with Toxic; healthy, sleep, and freeze take the pointer path unchanged. The command contains no `Random()` call.
- On success it makes the attacker active, emits `BtlController_EmitSetMonData(B_COMM_TO_CONTROLLER, REQUEST_STATUS_BATTLE, 0, sizeof(status1), &status1)`, and calls `MarkBattlerForControllerExec(attacker)`. In a local single battle this sets the attacker's controller-exec bit; the player controller's `REQUEST_STATUS_BATTLE` case writes `MON_DATA_STATUS` to the selected persistent party record. This request/pending transition is source-pinned, not inferred from a public capture.
- `EFFECT_REFRESH` is exactly `attackcanceler → attackstring → ppreduce → cureifburnedparalyzedorpoisoned BattleScript_ButItFailed → attackanimation → waitanimation → STRINGID_PKMNSTATUSNORMAL → waitmessage → updatestatusicon BS_ATTACKER → MoveEnd`. Thus PP is already spent for healthy/sleep/freeze failure. `updatestatusicon` itself returns while any controller is pending, then emits the attacker's current status1/status2 and marks that controller.
- Refresh is Normal, power 0, accuracy 100, PP 20, self-targeted, priority 0, and Snatch-affected. The Level-50 Factory carrier is `FRONTIER_MON_CHANSEY_1` (set 227): Metronome / Refresh / Defense Curl / Minimize, Sitrus Berry, Relaxed, Defense + Sp. Def EV spread. Factory's two-stat spread is `510 / 2 = 255` per selected stat ([`battle_factory.c`](../reference/pokeemerald/src/battle_factory.c)).

## Battle Scene OFF observation

[`mechanic-refresh-chansey-toxic-off.json`](../tools/battle-lab/mechanic-refresh-chansey-toxic-off.json) builds all six legal party records before normal battle initialization. Its player lead is the canonical Chansey-1 carrier; the opponent is constrained to real Toxic in every slot, without injecting any battle state or AI result.

The trace first selects Refresh while healthy, then lets real Toxic land, then selects Refresh again. It captures every frame cited by the fixture. Two complete manifests are byte-identical: `12571c447d03ec9ca1a71fd55c7715862d2c226539404571f307b96522a68012`. Scenario SHA-256: `727c9744ad636eee9e405fb580f80943704934a0be242dc470471f781710ca52`.

- Frame 100: healthy Refresh is still current move 287, PP is `20 → 19`, active and persistent status are zero, and RNG remains `3034451114`. This is the honest pointer-path failure after PP reduction.
- Frame 300: real Toxic has landed: active and persistent status are both `128` (Toxic's permanent bit before its turn counter is added).
- Frame 750: before the second Refresh, active status is `384` (Toxic plus its counter), persistent status remains `128`, Chansey HP is 305, Refresh PP is 19, and RNG is `786441859`.
- Frame 775: successful Refresh has PP 18 and both active and persistent status are zero; HP is still 305 and the RNG is unchanged at `786441859`. Frame 900 holds the same values. This is externally consistent with command-local zero RNG, attacker-owned active clear, and controller-synchronized persistent party clear.

All six party checksums are valid at every capture. The public manifest cannot expose script PC, the command buffer, the exact pending bit at command execution, decoded text, sleep/freeze failure, burn/paralysis/ordinary-poison variants, Snatch redirection, or doubles targeting. Those are deliberately source-pinned rather than inferred from this singles receipt.
