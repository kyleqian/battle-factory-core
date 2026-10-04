# Reversal target shake — ROM evidence (S10A, side lane)

Question: does the accepted reducer (`src/animation/reversal.ts:122-127`, `targetShakeX2`,
alternating `A` / `0`) match the ROM for A > 1? **No — it is exact only for A = 1.**

## Source reading (`reference/pokeemerald`)

- Script: `data/battle_anim_scripts.s:1270` — `createvisualtask AnimTask_ShakeTargetBasedOnMovePowerOrDmg, 5, FALSE, 1, 8, 1, 0`
  → `gBattleAnimArgs[0]=0 (FALSE)`, `[1]=1` (delay), `[2]=8` (toggle count), `[3]=1` (x on), `[4]=0` (y off).
- `src/battle_anim_mon_movement.c:971-1008` (init): `args[0]==0` → `A = gAnimMovePower / 12` (**power, not
  damage**; `gAnimMoveDmg / 12` is the `else` branch, lines 985-995); clamp `1 <= A <= 16`;
  `data[14] = A/2` (floor), `data[13] = A/2 + (A & 1)` (ceil); target = `GetAnimBattlerSpriteId(ANIM_TARGET)`;
  base x2/y2 sampled.
- Step (`:1010-1048`): `++data[0] > data[1]` → toggles every 2 ticks (delay 1); `data[12] ^= 1`;
  odd → `x2 = base + ceil(A/2)`, even → `x2 = base - floor(A/2)`; y untouched (args[4]=0).
  When `--data[2]` reaches 0 (8th toggle) x2/y2 are zeroed and the task is destroyed, so only toggles 1..7
  are visible (14 frames: `+c,+c,-f,-f,+c,+c,-f,-f,+c,+c,-f,-f,+c,+c`).
- Power source: `gAnimMovePower` is the `movePower` argument of `BtlController_EmitMoveAnimation`
  (`battle_controllers.c:1106-1113`) fed with `gBattleMovePower` (`battle_script_commands.c:1787`), i.e. the
  value after `CalculateBaseDamage` (`pokemon.c:3118-3122`: `powerOverride` = `gDynamicBasePower`). Reversal's
  table power is 1, but the dynamic power is used. The controllers latch it at
  `battle_controller_player.c:2475-2476` (and the opponent/partner/recorded copies).
  Fighting type is not touched by the later halve/boost lines (`pokemon.c:3214-3226`).
- Flail/Reversal power: `Cmd_remaininghptopower`, `battle_script_commands.c:8304-8316`, table `:749-757`;
  `hpFraction = GetScaledHPFraction(hp, maxHP, 48)`: `<=1→200, <=4→150, <=9→100, <=16→80, <=32→40, else 20`.

## ROM evidence

Probe `tools/integration/reversalShakeProbe.py` (Scene ON, direct mGBA; Scene OFF skips move animations so it
cannot be used here), driver `tools/integration/reversalShakeEvidence.py`. Staging derives from
`tools/battle-lab/mechanic-reversal-hp-bands-off.json`: legal mechanicLab parties (3 complete Pokémon/side, the
Reversal user is a Yanma set with Reversal; the other lead is a Chansey with Super Fang; `REVERSAL_TARGET_SPECIES=113`
overrides Raticate for bulk). Super Fang halves the Reversal user's real HP every turn (no HP injection); the six
Reversal uses land at HP 140/140, 70, 35, 18, 9, 5 → all six tiers. Orientation `opponent` mirrors the roles
(opponent lead Reversal x4 identical slots). Two fresh runs per orientation: raw files byte-identical
(`freshRunsIdentical: true`).

Evidence: `tools/integration/fixtures/reversal-shake-evidence.json` (ROM/probe/raw sha pins),
raw `tools/integration/fixtures/reversal-shake-raw/{player,opponent}-run{1,2}.json` (per body: gAnimMovePower/Dmg,
activation, first inactive, per-frame target x2/y2 for activation-1 .. cleanup+2).
Frame offsets are relative to script activation (= reducer age; first inactive = age 173; x2 nonzero ages 155-168).

| power | A=power/12 | gAnimMoveDmg (player/opp) | observed x2 ages 155-168 | source formula | accepted reducer |
| --- | --- | --- | --- | --- | --- |
| 20 | 1 | 17 / 19 | `1,1,0,0,…` | yes | yes |
| 40 | 3 | 36 / 32 | `2,2,-1,-1,…` | yes | **no** |
| 80 | 6 | 62 / 74 | `3,3,-3,-3,…` | yes | **no** |
| 100 | 8 | 86 / 92 | `4,4,-4,-4,…` | yes | **no** |
| 150 | 12 | 132 / 138 | `6,6,-6,-6,…` | yes | **no** |
| 200 | 16 | 161 / 176 | `8,8,-8,-8,…` | yes | **no** |

Both sides and both fresh runs agree (24 bodies: 24/24 match the source formula, 4/24 — power 20 — match the
reducer). y2 is always 0. Damage-based A would be 1,3,5,7,11,13 for the player side (differs from power-based
3→6 etc.), so the observations also prove the power field (dmg is not used). Activation-to-cleanup length 173
is unchanged at every tier.

## Required reducer change (not applied here — new-files-only worker)

`src/animation/reversal.ts` `targetShakeX2`:

```ts
const toggle = Math.floor((age - 155) / 2);
return toggle % 2 === 0
  ? Math.ceil(receipt.amplitude / 2)
  : -Math.floor(receipt.amplitude / 2);
```

Keep the receipt shape `{ kind: "resolved-power-shake", amplitude }` (A, already clamped); window 155..168
unchanged. Update the doc comment ("already clamped" stays true; x2 is `+ceil(A/2)` / `-floor(A/2)`).
Add a test for A = 3, 6, 8, 12, 16 using the sequences above.

Still valid: `tools/compare/fixtures/reversal-player-{vigoroth-opponent-delcatty,delcatty-opponent-vigoroth}.json`
(amplitude 1, HP 104/144 → power 20 → +1/0 = identical under both formulas), `tests/animation/reversal.test.ts`
(amplitude 1), `reversalEvidence.test.ts`, `blueOrbReversalEvidenceTrack.test.ts` (pins `amplitude: 1` and the
receipt shape). No accepted evidence covers A > 1, so no existing fixture changes.

## Live config mapping

`resolvedShake.amplitude = clamp(Math.floor(request.power / 12), 1, 16)` where `request.power` must be the
`gBattleMovePower` the move animation request carries — for Reversal the **dynamic** HP-derived power
(20/40/80/100/150/200 from the attacker's HP fraction scaled to 48), not the table power 1. Never use
`request.damage` (arg0 is FALSE). If the request does not carry the dynamic power, derive it from the attacker's
current/max HP with the table above (`GetScaledHPFraction`, `battle_interface.c:2517-2525`: `floor(hp*48/maxHP)`, or 1 when that is 0 and hp > 0).
