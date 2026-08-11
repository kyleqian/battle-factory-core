# Heal Bell / Aromatherapy / `B_SCR_OP_HEALPARTYSTATUS` evidence

This SIDE-lane checkpoint adds no interpreter, controller, renderer, or animation code. It pins the generic command against the Battle Scene OFF oracle and the pinned pret source.

## Source contract

`healpartystatus` is the one-byte opcode `0xAE` ([macro](../reference/pokeemerald/asm/macros/battle_script.inc#L914-L916), [registration](../reference/pokeemerald/src/battle_script_commands.c#L505), [handler](../reference/pokeemerald/src/battle_script_commands.c#L8370-L8449)). It has no operands, unconditionally advances one byte, and makes no `Random()` call.

Both Heal Bell (215) and Aromatherapy (312) use `EFFECT_HEAL_BELL` ([move records](../reference/pokeemerald/src/data/battle_moves.h#L2798-L2809), [Aromatherapy](../reference/pokeemerald/src/data/battle_moves.h#L4059-L4070)). Their shared script is `attackcanceler → attackstring → ppreduce → healpartystatus → waitstate → animation → printfromtable`; it has no failed-result route, so a healthy use still spends PP and prints the party-heal message ([script](../reference/pokeemerald/data/battle_scripts_1.s#L1361-L1382)).

The command deliberately differs by move. Heal Bell excludes Soundproof: it preserves a Soundproof attacker/present doubles partner's live status and Nightmare bit, records the ability, sets a Soundproof message-selector bit, and omits every Soundproof party record from `toHeal`. Aromatherapy assigns all six `toHeal` bits and therefore includes Soundproof records. Both emit one zero-status `REQUEST_STATUS_BATTLE` request using the resulting bitmask and mark the attacker controller. Player-controller mask handling calls `SetPlayerMonData` once for each selected party bit, where that request writes `MON_DATA_STATUS` ([controller](../reference/pokeemerald/src/battle_controller_player.c#L1927-L1946), [status case](../reference/pokeemerald/src/battle_controller_player.c#L2102-L2104)). `gPartyStatusHealStringIds` maps the Bell selectors to “Bell chimed” and Aromatherapy to “A soothing aroma” ([messages](../reference/pokeemerald/src/battle_message.c#L1132-L1139)).

## Battle Scene OFF receipt

[`mechanic-heal-party-status-chimecho-toxic-off.json`](../tools/battle-lab/mechanic-heal-party-status-chimecho-toxic-off.json) creates six full legal party records before normal battle initialization. Chimecho uses stock Heal Bell; the opponent is constrained only to stock Toxic. It first uses Heal Bell while healthy, allows real Toxic to land, then uses Heal Bell again. Every cited frame is captured on a 25-frame grid.

Scenario SHA-256: `df0a9663062632d881f9f2b7f45ecdd9d50635813d5f03fd55799280b7cbcb7f`. Two fresh full manifests are byte-identical: `8b4d24143b31fa9a9b840bbde5fd98a0265c81ee80aa9d241d2e85a7396cc6c8`.

- Frame 100: healthy Heal Bell has already spent PP `5 → 4`; active and all three persistent player status words remain zero, and RNG is unchanged from frame 0. This is ordinary command execution, not a failure branch.
- Frame 400: real Toxic has synchronized active and lead-party status to `128`; both untouched bench records remain zero.
- Frame 850: before the second Bell, active status is `384` (Toxic plus counter), persistent lead status is `128`, PP is 4, and RNG is `1850371763`.
- Frame 900: PP is 3, active and all three persistent party status words are zero, and the public controller-exec field is still 1. Frame 950 retains the zero state with the controller field settled to 0 and unchanged RNG. This is the observable consequence of the source-defined controller synchronization.

The fixture and hermetic test retain the normalized frame hashes and source hashes. The receipt does not claim a decoded message, direct command buffer/mask, poisoned bench, Soundproof carrier, or doubles partner observation. Those are source facts only; no unobserved branch is presented as an oracle result.
