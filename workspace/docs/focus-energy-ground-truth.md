# Focus Energy ground truth — `B_SCR_OP_SETFOCUSENERGY`

Bounded source and Battle-Scene-OFF evidence for the later shared-script
registration. This is evidence only: it intentionally adds no production
handler, controller path, or presentation behavior.

## Source contract

`B_SCR_OP_SETFOCUSENERGY` is opcode **`0x9a`** in the dispatch table
(`reference/pokeemerald/src/battle_script_commands.c:485`). It has no
operands, so its width is **one byte**. `Cmd_setfocusenergy` (`:7749-7762`)
reads **only `gBattlerAttacker`**, and always advances
`gBattlescriptCurrInstr++`; neither branch changes the PC to a failure
pointer. Its branch contract is:

| precondition on attacker `status2` | writes | selector | PC |
| --- | --- | --- | --- |
| `STATUS2_FOCUS_ENERGY` clear | OR `0x00100000` | `B_MSG_GETTING_PUMPED` | `pc + 1` |
| bit already set | OR `MOVE_RESULT_FAILED` | `B_MSG_FOCUS_ENERGY_FAILED` | `pc + 1` |

`STATUS2_FOCUS_ENERGY` is `(1 << 20)` (`include/constants/battle.h:144`).
The handler has **zero direct RNG draws and zero direct controller emits**:
it changes the attacker-owned volatile word and `MULTISTRING_CHOOSER` only.
The selector table maps success to `STRINGID_PKMNGETTINGPUMPED` and defensive
handler failure to `STRINGID_BUTITFAILED` (`battle_message.c:1054-1058`).

The ordinary move script makes the real duplicate path sharper than that
defensive handler branch. `BattleScript_EffectFocusEnergy`
(`data/battle_scripts_1.s:885-896`) executes `attackcanceler`, `attackstring`,
and `ppreduce`, then `jumpifstatus2 BS_ATTACKER, STATUS2_FOCUS_ENERGY,
BattleScript_ButItFailed`. Thus a normal repeat **does not call this opcode**:
it lands at `BattleScript_ButItFailed` (`:2056-2063`), which pauses, ORs
`MOVE_RESULT_FAILED`, result-messages `But it failed!`, and leaves the bit
unchanged. This is the public failure pointer and explains the real repeat's
PP loss. The defensive opcode failure branch remains source-only evidence
unless another script dispatches it with the bit set.

## Critical-hit consumer

`Cmd_critcalc` (`battle_script_commands.c:1252-1286`) gives the attacker
**+2 stages** when the bit is set, then caps the combined stage at four. The
table is `[16, 8, 4, 3, 2]` (`:606`), i.e. stages 0–4 are 1-in-16, 1-in-8,
1-in-4, 1-in-3, and 1-in-2. The consumer sums these before the cap:

| contributor | stages | Factory-relevant restriction |
| --- | ---: | --- |
| Focus Energy bit | +2 | attacker only |
| high-critical effect, Sky Attack, Blaze Kick, Poison Tail | +1 | current move effect |
| Scope Lens | +1 | attacker item |
| Lucky Punch | +2 | attacker must be Chansey |
| Stick | +2 | attacker must be Farfetch'd |

Battle Armor/Shell Armor on the target, `STATUS3_CANT_SCORE_A_CRIT` on the
attacker, and the tutorial flags prevent the final `Random()` call entirely;
otherwise `Cmd_critcalc` consumes exactly one draw. Focus Energy itself does
not draw RNG. `tests/focusEnergyEvidence.test.ts` pins the table, additions,
and cap through the existing source-derived `damageCalc.ts` consumer.

## Lifetime

The bit survives ordinary turns and the second public attempt (below). On a
normal switch `SwitchInClearSetData` clears `status2` wholesale
(`battle_main.c:3189-3192`); on Baton Pass it instead masks status2 with a
set that explicitly retains `STATUS2_FOCUS_ENERGY` (`:3173-3176`). It is
therefore per-active-Pokémon volatile state, not side state, stat stage, or a
permanent party flag.

## Battle Scene OFF receipt

Reproduce with:

```sh
bin/oracle lab tools/battle-lab/mechanic-focus-energy-success-repeat-off.json -o "$(mktemp -d /tmp/focus-energy-off.XXXXXX)"
```

Fixture SHA-256: `e5dc33dc6ca9b62982ff7d2cac0f4d93dad1cff1025789979efddc47a09b5b87`.
The matching 2026-07-28 OFF manifest SHA-256 is
`e96bcff2b5772a67db2dff838b85ff4e8429d3fc4eb90f19bc2b85d212d489c1`
(247 requested captures, 1108 frames). It uses complete three-member,
checksum-valid parties; player MACHOKE has `[FOCUS ENERGY, TACKLE, TACKLE,
TACKLE]`, opponent CHANSEY has four Splash slots, so the AI remains real but
cannot damage the player.

Every capture listed in the fixture is part of the receipt: dense 3-frame
sampling spans both player action/message windows (`60..339`, `740..980`),
the second selection (`540..620`), and both settles (`1000..1107`). The
following exact manifest frames are the compact semantic index (frame hashes
are raw-RGB framebuffer SHA-256):

| frame | framebuffer SHA-256 | player PP0 / status2 / HP | opponent PP | RNG | observation |
| ---: | --- | --- | --- | ---: | --- |
| 0 | `48e113ed…eaa3e45` | 30 / 0 / 145 | 40/40/40/40 | 3690816045 | pre-action |
| 60 | `3ea36dd5…bf96b4a` | 30 / 0 / 145 | 40/40/40/40 | 983229340 | selected move 116 |
| 99 | `5e769603…ae8a092` | 29 / 1048576 / 145 | 40/40/40/40 | 983229340 | success: Getting pumped |
| 300 | `c282f950…deddae0` | 29 / 1048576 / 145 | 40/39/40/40 | 983229340 | opponent real Splash turn |
| 540 | `cc859f6d…4560c18` | 29 / 1048576 / 145 | 40/39/40/40 | 2682491093 | next choice available |
| 585 | `24f655a3…37d1032` | 29 / 1048576 / 145 | 40/39/40/40 | 2682491093 | repeat selection UI |
| 1000 | `6b6576fa…2dcf7ed` | 28 / 1048576 / 145 | 40/39/40/39 | 2184965245 | repeat failed; bit/HP unchanged |
| 1105 | `6b6576fa…2dcf7ed` | 28 / 1048576 / 145 | 40/39/40/39 | 2184965245 | settled result |

The RNG changes between turns belong to normal turn/AI scheduling, not this
opcode: the success-side opcode window holds `983229340` through frames
60→198; the repeat's public path bypasses the opcode. No controlled critical
hit is claimed from this receipt. The causal +2-stage and cap facts above are
source-pinned, deliberately separate from public visual/semantic proof.
