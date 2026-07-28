# Destiny Bond / `B_SCR_OP_SETDESTINYBOND` OFF evidence

`setdestinybond` is a one-byte macro emission: opcode `0xaa`, no operands
(`asm/macros/battle_script.inc:897-899`; enum slot 170 at
`include/constants/battle_script_commands.h:176`). `Cmd_setdestinybond`
mutates only `gBattleMons[gBattlerAttacker].status2`, OR-ing
`STATUS2_DESTINY_BOND` (`1 << 25`, `0x02000000`) and then advances the script
PC by one byte (`src/battle_script_commands.c:8279-8283`). It does not touch
the target or the shared hit marker.

The bit is action-lifetime state: `HandleAction_UseMove` calls
`ClearFuryCutterDestinyBondGrudge(gBattlerAttacker)` before each ordinary move
action (`battle_util.c:314-318`), and that helper clears the same attacker's
bit (`:3815-3820`). On an opposing target faint,
`TrySetDestinyBondToHappen` transfers the condition to
`HITMARKER_DESTINYBOND` (`battle_script_commands.c:8285-8294`); the faint
route clears that marker, pushes its return, sets damage to the attacker HP,
and enters `BattleScript_DestinyBondTakesLife` (`:3020-3025`). The effect
script is `attackcanceler → attackstring → ppreduce → setdestinybond →
attackanimation → waitanimation → STRINGID_PKMNTRYINGTOTAKEFOE → MoveEnd`
(`data/battle_scripts_1.s:1334-1343`). The avenging terminal prints
`STRINGID_PKMNTOOKFOE`, passive-updates the attacker HP, tries its faint, and
returns (`:3379-3386`).

The carrier is the genuine Level-50 Factory `FRONTIER_MON_WOBBUFFET_2`, source
index 290, with Counter, Mirror Coat, Encore, Destiny Bond
(`battle_frontier_mons.h:2033-2039`). Destiny Bond is move 194, Ghost,
self-targeted, 5 PP, priority 0 (`battle_moves.h:2525-2537`).

## Battle Scene OFF oracle route

`tools/battle-lab/mechanic-destiny-bond-ko-off.json` supplies complete legal
three-mon parties through `overrides.parties`. The player selects Wobbuffet's
fourth move normally. The opponent's four slots are all the real tutor move
Explosion on slower Snorlax, so the stock Factory AI chooses normally but
cannot select another action.

At frame 160, the real ROM has reduced Destiny Bond PP `5→4` and set only
Wobbuffet's `status2` to `0x02000000`; both monsters still have full HP and
the RNG remains `919694434`. The Explosion route then reduces Snorlax to zero
at frame 340 while the bond is still live. By frame 700 both Wobbuffet and
Snorlax have reached zero HP; after the faint script at frame 780 the
Wobbuffet bit is clear. The opposing Explosion PP is `5→4`, and the final RNG
is `3421819359`.

Each final replay produced the identical full-manifest SHA-256
`12dc947d247e24af225ee9b9047f1d932cab9d68e1962cd3b7b9bbb4248e86d4`.
The scenario SHA-256 is
`8c329f284002a16bb122107f7a563857396594992c5ce78b88cef62cf44367da`.

## Honest boundary

The manifest exposes status2, HP, PP, controller state, RNG, and framebuffer
hashes, but not the transient hit-marker word, script PC, or decoded dialogue
text. The source is therefore the evidence for the precise hit-marker transfer
and strings; the oracle route proves the live bit, real PP/RNG consequences,
and actual dual faint without fabricating transient state. This is evidence
only: no opcode or effect registration is implemented here.
