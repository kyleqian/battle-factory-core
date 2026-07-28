# Baton Pass / `B_SCR_OP_JUMPIFCANTSWITCH` OFF evidence

## Source contract

`jumpifcantswitch` emits six bytes: opcode `0x4f`, one battler-selector byte,
and one four-byte little-endian branch pointer
(`asm/macros/battle_script.inc:470-474`). `Cmd_jumpifcantswitch`
(`src/battle_script_commands.c:4700-4850`) masks bit 7 before resolving the
battler. A cannot-switch result loads the pointer at bytes 2–5; a switchable
result advances the PC by six.

Without bit 7, wrapped, escape-prevention, or rooted branches immediately.
Otherwise the command scans the selected battler's side for a living,
non-empty, non-egg party member not already active. In-game-partner and multi
battles scan the selected trainer's three-slot half; two-opponent battles scan
the opponent battler's half; the ordinary path scans all six side slots and
excludes both active side battlers (the same battler twice in singles).

`BattleScript_EffectBatonPass` (`data/battle_scripts_1.s:1694-1714`) first
fails in Arena, then calls:

```text
jumpifcantswitch SWITCH_IGNORE_ESCAPE_PREVENTION | BS_ATTACKER, BattleScript_ButItFailed
```

Its operand is therefore `0x81`: bit 7 bypasses the three volatile gates and
selector `1` resolves the attacker. Party availability still controls the
branch. The remaining script opens `PARTY_ACTION_SEND_OUT`, runs the switch
out/in chain, and reaches `BattleScript_MoveEnd`.

## OFF-oracle route

`tools/battle-lab/mechanic-baton-pass-success-off.json` uses six complete
`overrides.parties` records and ordinary controller input. The player lead is
Ledyba with the real Frontier set's Psybeam / Agility / Baton Pass / Light
Screen moves. A faster Magikarp is constrained to Mean Look, safely creating
`STATUS2_ESCAPE_PREVENTION` through a real move before Baton Pass runs.

The semantic checkpoints show:

- frame 0: Ledyba is party slot 0; Baton Pass has 40 PP; RNG is `1621732966`;
- frame 200: Mean Look has set `status2=67108864` (`1<<26`);
- frame 416: Baton Pass has spent PP `40→39` and the party screen is open,
  while the trap and RNG are unchanged;
- frame 650: Bulbasaur (party slot 1) is active, the trapped bit was passed,
  all three party records remain healthy/checksummed, and RNG is still
  `1621732966`;
- frame 750: the next input request is ready; only the next trainer decision's
  six setup/tie draws advanced RNG to `2210656548`.

Two final replays produced byte-identical full manifests:
`f9d042cc04725e38e0dd491e9abb920067ff6f7677419ed31d899765cdcbea93`.
The scenario SHA is
`d2aa5b52f843d0eb235bec656255af0bd00ce37ea4b8eeee16ca4107b342bb52`.

## Bounded remainder

No failure trace is fabricated. `overrides.parties` requires three complete,
healthy pre-battle Pokémon per side and forbids transient faint-state
injection, so the no-eligible-bench branch would require a longer sequence of
real KOs. Arena is outside this Factory `mechanicLab` contract. The committed
source receipt pins both failure routes, while the short trace directly proves
the safely stageable volatile-bypass boundary and successful singles switch.

