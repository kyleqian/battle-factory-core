# AI reveal-site classification (entry 684, 2026-07-29)

Frozen record of the entry-677 remainder classification: every listed source
reveal call site, its construct, and whether it was wired (A) or is coupled
to a named future barrier/opcode registration (B). Produced by the entry-684
step; the wired arms are pinned in the focused suites named there.

| Source reveal site | Construct | Class | Result / exact class-B dependency |
| --- | --- | --- | --- |
| `battle_util.c:216` | Lightning Rod action-target redirect | B | Factory-doubles `HandleAction_UseMove` target-redirection path |
| `battle_util.c:3859` | Lightning Rod random-target redirect | B | Factory-doubles `GetMoveTarget(MOVE_TARGET_RANDOM)` path |
| `battle_util.c:3195` | switch-in Drizzle/Sand Stream/Drought; successful Forecast/Cloud Nine/Air Lock form change | A | wired at `Cmd_switchineffects`; failed/no-change arms pinned quiet |
| `battle_util.c:3195` | end-turn Rain Dish, Shed Skin, Speed Boost | A | wired; dry/full-HP, failed Shed Skin proc, capped/first-turn arms pinned quiet |
| `battle_util.c:3195` | Soundproof move block | A | wired only when a sound move is actually blocked |
| `battle_util.c:3195` | Volt Absorb, Water Absorb, Flash Fire absorption/boost | A | wired at `JumpIfMoveFailed`; matching/non-matching, damaging/full-HP, frozen/repeat-boost, reveal, PP-loss, HP/party sync, and later Flash Fire damage consumption pinned in `tests/battleScriptHitChainOpcode.test.ts` + `tests/damageCalc.test.ts`; two-seed OFF receipt: `docs/absorbing-abilities-ground-truth.md` |
| `battle_util.c:3195` | Color Change, Rough Skin, Effect Spore, Poison Point, Flame Body, Cute Charm; Static | A | wired successful arms; failed proc/no-change quiet; Static already done in entry 677 and retained |
| `battle_util.c:3195` | status-curing ability pass | B | `Cmd_moveend` `MOVEEND_IMMUNITY_ABILITIES` barrier (`battle_util.c:2876`) |
| `battle_util.c:3195` | Synchronize target / attacker | B | `Cmd_moveend` `MOVEEND_SYNCHRONIZE_TARGET` / `MOVEEND_SYNCHRONIZE_ATTACKER` barriers (`battle_util.c:2971/2987`) |
| `battle_util.c:3195` | Intimidate / Trace | A | already done and pinned in entry 677; not reimplemented |
| `battle_script_commands.c:990` | Lightning Rod took-attack reveal | B | `Cmd_attackcanceler` `lightningRodRedirected` unsupported branch; waits on doubles redirect handoff above |
| `:1382` | `Cmd_typecalc` Levitate | A | wired/pinned |
| `:1418` | `Cmd_typecalc` Wonder Guard | A | wired/pinned |
| `:1441` | miss-time Levitate | A | wired/pinned |
| `:1496` | miss-time Wonder Guard | A | wired/pinned |
| `:1679` | `Cmd_adjustnormaldamage` Focus Band successful roll | A | wired; failed roll pinned quiet |
| `:1722` | `Cmd_adjustnormaldamage2` Focus Band successful roll | A | wired; failed roll pinned quiet |
| `:2304` | poison prevention: Immunity | A | wired; non-certain secondary arm quiet |
| `:2346` | burn prevention: Water Veil | A | wired; non-certain secondary arm quiet |
| `:2401` | paralysis prevention: Limber | A | wired; non-certain secondary arm quiet |
| `:2431` | toxic prevention: Immunity | A | wired; non-certain secondary arm quiet |
| `:2553` | certain flinch prevention: Inner Focus | A | wired; ordinary secondary arm quiet |
| `:2774` | Thief/Covet item-steal prevention: Sticky Hold | A | wired/pinned |
| `:2874` | Knock Off prevention: Sticky Hold | A | wired/pinned |
| `:3118` | `Cmd_jumpifability`, `BS_ATTACKER_SIDE` | B | exact `Cmd_jumpifability` unsupported-operand barrier at `battle_script_commands.c:3105` |
| `:3133` | `Cmd_jumpifability`, `BS_NOT_ATTACKER_SIDE` | B | same unsupported-operand barrier |
| `:3148` | direct-selector `Cmd_jumpifability` success | A | wired; not-taken branch pinned quiet |
| `:4512` | `Cmd_typecalc2` Levitate | A | wired/pinned |
| `:4587` | `Cmd_typecalc2` Wonder Guard | A | wired/pinned |
| `:5880` | `Cmd_adjustsetdamage` Focus Band successful roll | A | wired; failed roll pinned quiet |
| `:6229` | `Cmd_recordlastability` | B | unregistered/unreferenced `B_SCR_OP_RECORDLASTABILITY` |
| `:6572` | `Cmd_tryexplosion` Damp prevention | A | wired; no-Damp arm quiet |
| `:6842` | sleep prevention: Insomnia/Vital Spirit | A | wired; ordinary/Uproar arms quiet |
| `:7003` | Clear Body/White Smoke stat-loss message arm | A | wired only on `STAT_CHANGE_ALLOW_PTR` activation |
| `:7018` | Keen Eye accuracy-loss message arm | A | wired only on `STAT_CHANGE_ALLOW_PTR` activation |
| `:7031` | Hyper Cutter attack-loss message arm | A | wired only on `STAT_CHANGE_ALLOW_PTR` activation |
| `:7509` | `Cmd_tryKO` Focus Band successful roll | B | existing `Cmd_tryKO` `focusBanded` unsupported branch at `battle_script_commands.c:7507` |
| `:7518` | `Cmd_tryKO` Sturdy prevention | A | wired; ordinary target quiet |
| `:7680` | Attract prevention: Oblivious | A | wired; non-Oblivious arm quiet |
| `:8394` | Heal Bell attacker Soundproof | A | wired/pinned |
| `:8410` | Heal Bell partner Soundproof | B | `Cmd_healpartystatus` `BATTLE_TYPE_DOUBLE` partner branch; waits on Factory-doubles topology |
| `:9233` | Trick prevention: Sticky Hold | A | wired; normal swap arm quiet |
