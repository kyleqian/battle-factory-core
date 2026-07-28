# Psych Up / `B_SCR_OP_COPYFOESTATS` Battle Scene OFF evidence

Two compact `mechanicLab` traces use `overrides.parties`, with three complete
pre-battle Pokémon on each side and no transient state injection:

- `mechanic-psych-up-curse-off.json`: a 90-Speed non-Ghost Snorlax uses real
  Curse before a 42-Speed Drowzee constrained to Psych Up.
- `mechanic-psych-up-neutral-off.json`: a 115-Speed Haunter uses Ghost Curse,
  leaving all eight stages neutral while changing HP and the target's cursed
  bit; Drowzee then uses Psych Up.

The staged capture separates the actions. At frame 360 Snorlax alone has stage
array `[6,7,7,5,6,6,6,6]`; at frame 500 Drowzee has copied the exact array and
spent one PP (`[10,10,10,10]` to `[10,9,10,10]`). Both HP/status records and
the public RNG value `1621732966` are unchanged across the copy.

The neutral control proves the command is stage-only. Ghost Curse first changes
Haunter HP `120→60` and sets Drowzee `STATUS2_CURSED` (`268435456`) without
changing stages. Psych Up still spends one PP and leaves both neutral stage
arrays, HP values, and the cursed bit unchanged. Its public RNG value remains
`919694434`.

This matches `Cmd_copyfoestats`: it copies indices `0..<NUM_BATTLE_STATS`
(HP-stage placeholder, Attack, Defense, Speed, Sp. Attack, Sp. Defense,
Accuracy, Evasion), then advances five bytes unconditionally. The script's
encoded `BattleScript_ButItFailed` pointer is unused, so neutral stages do not
form a failure branch.

Both full manifests replayed byte-identically twice:

- staged: `deed191a6754c76252f1b1058a9be18f8eca210bdeb83da2fea2efbe9950f126`
- neutral: `4503f4ba569a0494412a103b94763d29d214004593c979f4444562620c230ed7`

The committed receipt is `tests/fixtures/psych-up-off-evidence.json`; the
hermetic test validates scenario hashes, legal complete-party shape, source
ownership, all eight copied slots, PP/HP/status/RNG observations, and replay
hash stability. Snatch, doubles target selection, and presentation timing are
intentionally outside this evidence checkpoint.
