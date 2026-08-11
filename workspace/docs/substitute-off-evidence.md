# Substitute / `B_SCR_OP_SETSUBSTITUTE` OFF evidence

`setsubstitute` is a one-byte macro emission: opcode `0x9c` (156), no operands.
`Cmd_setsubstitute` always advances the script PC by one byte.

The handler is attacker-owned. It computes `floor(maxHP / 4)` (defensively
using one if zero). At `HP <= quarter`, it sets move damage to zero and selects
`B_MSG_SUBSTITUTE_FAILED`. Otherwise it makes that quarter move damage, sets
the attacker's `STATUS2_SUBSTITUTE` (`1 << 24`), clears that attacker's
`STATUS2_WRAPPED`, writes the attacker's hidden `substituteHP`, selects
`B_MSG_SET_SUBSTITUTE`, and sets `HITMARKER_IGNORE_SUBSTITUTE`. The effect
script then applies the attacker HP change through `datahpupdate BS_ATTACKER`.

`BattleScript_EffectSubstitute` begins `attackcanceler`, `ppreduce`,
`attackstring`, and `waitstate`. An existing attacker substitute branches
before `setsubstitute` to `STRINGID_PKMNHASSUBSTITUTE`; a handler low-HP
failure uses `STRINGID_TOOWEAKFORSUBSTITUTE`; success uses
`STRINGID_PKMNMADESUBSTITUTE`. `MOVEEND_SUBSTITUTE` only clears a battler's
bit when that battler's hidden `substituteHP` is zero. Therefore PP costs are
per action while Substitute persists across actions.

The genuine Level-50 Factory carrier is `FRONTIER_MON_GOLEM_2` (set 498):
Golem with Focus Punch, Substitute, Double Team, Rest. Substitute is move 164
/ effect 79, self-targeted, 10 PP, priority 0.

## Battle Scene OFF oracle route

`tools/battle-lab/mechanic-substitute-repeat-off.json` supplies complete legal
three-mon parties using `overrides.parties`; no transient state is injected.
The player selects Golem's second move twice. The opponent's four Harden slots
constrain the real Factory AI without disturbing the Substitute.

The first action spends PP `10→9`, sets only Golem's exposed `status2` to
`0x01000000`, and changes HP `155→117`: `floor(155/4) = 38`. The next real
action spends PP `9→8` but leaves HP and the bit intact; frame 900 reads
“GOLEM already has a SUBSTITUTE!”. Frame 1200 is still live.

Both final replays have manifest SHA-256
`19e525d9cf58eff251211f762925e07d28bde3d6585e0dd05255b872ec2f7c7d`.
Scenario SHA-256:
`70ea17e15cd6b4b69ed31aee61dac13054c1413a04985d2f9192dc869d6dad73`.

## Honest boundary

The manifest does not expose `substituteHP`, move damage, message chooser,
hit-marker, script PC, or decoded text. Source pins those branches/routes; the
ROM proves exposed HP/PP/status/RNG and the message framebuffer. This does not
stage the handler's low-HP branch and does not implement/register the opcode.

## Breaking a Substitute: `Cmd_datahpupdate`'s fade path

`Cmd_datahpupdate`'s target-has-active-Substitute branch
(`battle_script_commands.c:1868-1891`) now runs source-completely. The old
`remaining < damage` branch barriered (`unsupported-branch`, sourceLine 1889)
instead of doing the overkill bookkeeping, and the `remaining >= damage`
branch always advanced -- so a hit whose damage EXACTLY equaled the remaining
Substitute HP left it at 0 and never faded (source checks `substituteHP == 0`
after BOTH branches, `:1884`). Now:

- `remaining >= damage`: `substituteHP -= damage`, `gHpDealt = damage`,
  `shellBellDmg = damage` on first hit.
- `remaining < damage`: `substituteHP = 0`, `gHpDealt = shellBellDmg =
  remaining` (clamped, NOT the raw damage), per `:1875-1882`.
- Both zero-HP outcomes push `BattleScript_SubstituteFade` as the machine's
  `call` (same shape `battleScriptTryCastformDataChangeOpcode.ts` uses for
  `BattleScriptPushCursorAndCallback`): the pushed cursor is the byte after
  `datahpupdate`'s own operand, so the fade script's `return` pops back to the
  next instruction. `Cmd_playanimation`'s `B_ANIM_SUBSTITUTE_FADE` sits in
  source's unconditional first branch (`battle_script_commands.c:4013`), so it
  now emits the `SUBSTITUTE_FADE` controller animation, then
  `STRINGID_PKMNSUBSTITUTEFADED` prints, then `return` resumes the hit chain.

The Substitute-using Golem carrier is reachable in ordinary Factory play, so a
broken Substitute no longer halts the battle-script machine. Both defects are
Tier-1 pinned in `tests/battleScriptHitChainOpcode.test.ts` ("substitute
damage relationships"), red-verified independently, and the ratchet count for
`battleScriptHitChainOpcode.ts` drops 12 → 11.
