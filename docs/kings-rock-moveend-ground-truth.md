# King's Rock MOVEEND hook-join ground truth

This Gate-6 family uses the Level-50 selector `FLAG_KINGS_ROCK_AFFECTED` and the attacker hold effect `HOLD_EFFECT_FLINCH`. The finite selector has 106 roster moves: 94 executable and 12 roster-only. Exactly 105 have a damaging successful arm; `MOVE_TICKLE` is retained as the explicit source exception because its table power is zero and it never performs target `datahpupdate`.

The ordered `ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL)` guards in `battle_util.c` are: nonzero `gBattleMoveDamage`; `HOLD_EFFECT_FLINCH`; no `MOVE_RESULT_NO_EFFECT`; `TARGET_TURN_DAMAGED`; `Random() % 100` (drawn before the later selectors); roll below the hold-effect parameter; `FLAG_KINGS_ROCK_AFFECTED`; live target HP; then `SetMoveEffect(FALSE, 0)` with `MOVE_EFFECT_FLINCH`. This family certificate does not claim the adjacent Shell Bell arm.

The committed complete-parties fixture stages faster Swellow using Pound with King's Rock against slower, durable Shuckle constrained to Tackle. Seed 11 produces the King's Rock draw at relative frame 244: `Random()` is 25504 and `25504 % 100 == 4 < 10`. The target `STATUS2_FLINCHED` bit is written at frame 244 and cleared at frame 250 exactly as `gBattlescriptCurrInstr` becomes `BattleScript_MoveUsedFlinched` (`0x082db29b`), whose first opcode prints `STRINGID_PKMNFLINCHED`. Shuckle's Tackle PP stays 35, proving its move never executes.

Evidence: `tools/battle-lab/mechanic-kings-rock-flinch-off.json`, `tools/probe/probe-kings-rock-flinch-off.py`, `tools/probe/receipts/kings-rock-flinch-off.json`, and `tests/kingsRockOracleEvidence.test.ts`.
