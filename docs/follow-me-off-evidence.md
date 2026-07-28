# Follow Me / `B_SCR_OP_SETFORCEDTARGET` evidence

This side-lane checkpoint adds source facts and a Battle Scene OFF single-battle receipt only; it changes no production behavior.

- `setforcedtarget` is opcode `0xCA`, one byte, and always advances PC by one. It writes `followmeTimer = 1` and `followmeTarget = gBattlerAttacker` in the side timer selected from the attacker. No local failure, target/HP, battle-type, or RNG condition exists.
- `EFFECT_FOLLOW_ME` runs `attackcanceler → attackstring → ppreduce → setforcedtarget → attackanimation → waitanimation → STRINGID_PKMNCENTERATTENTION → waitmessage → MoveEnd`; PP is spent before the side-timer write.
- All six source retarget readers are pinned in the fixture: ordinary selected targeting, `GetMoveTarget` selected/random, Magic Coat, Counter, and Mirror Coat. Each reader rejects a zero-HP stored target. Ordinary action selection additionally requires a selected-target move and the target on the opposing side.
- Follow Me is meaningful only with a partner/choice of target. The Level-50 Factory and mechanic-lab contract are singles, so a legal OFF run can execute it but cannot demonstrate a redirected target. Multiple same-side doubles users overwrite the one side-timer target in action order.
- `BattleTurnPassed` calls `TurnValuesCleanUp(FALSE)` only after field/battler end-turn effects and faint/Wish-Perish work; that cleanup clears both `followmeTimer`s but leaves `followmeTarget` inert. A new turn therefore cannot use a prior-turn redirect.

`mechanic-follow-me-clefairy-chansey-off.json` uses the actual Level-50 `FRONTIER_MON_CLEFAIRY` carrier (set 107) with complete three-mon parties. Its two full manifests are byte-identical: `e150f267…889ece`; scenario SHA-256 `b1015a6a…07f00f`. Captures show Follow Me (`currentMove 266`) and PP `20→19` at frame 100, then the forced Tackle (`33`) at 300 and next-turn Return (`216`) at 900. The public manifest omits `SideTimer`, target globals, script PC, and decoded messages, so the timer and retarget facts remain explicitly source-pinned.
