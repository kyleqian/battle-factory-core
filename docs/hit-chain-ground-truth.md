# Hit-chain ground truth (ROADMAP S10 step (ii))

Probe deliverable for the next executable-frontier registration step: the
sixteen hit-branch opcodes of `BattleScript_EffectHit` (`accuracycheck`,
`attackstring`, `ppreduce`, `critcalc`, `damagecalc`, `typecalc`,
`adjustnormaldamage`, `attackanimation`, `effectivenesssound`, `hitanimation`,
`healthbarupdate`, `datahpupdate`, `critmessage`, `resultmessage`,
`seteffectwithchance`, `tryfaintmon`) plus `orbyte` on the miss branch.

Two committed battle-lab scenarios, rerun by
`tools/probe/verify-hit-chain-ground-truth.ts` (`node --experimental-strip-types
tools/probe/verify-hit-chain-ground-truth.ts`, also runnable via `npx tsx`):

- `tools/battle-lab/mechanic-hit-chain-tackle-off.json` -- both sides' Tackle hits.
- `tools/battle-lab/mechanic-hit-chain-slam-miss-off.json` -- the player's Slam misses, the opponent's Tackle then hits.

Both scenarios reuse trainerId 110 / challengeNum 2 / battleNum 2 /
`playerSetIds` `[274,354,338]` / `opponentSetIds` `[349,339,327]` -- the same
legal Factory route already proven by the committed
`attack-spine-no-pp-off.json` -- so the actual battlers are always:

| Battler | Species | Level | Types | Atk | Def | SpAtk | SpDef | Speed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| player | 64 KADABRA | 50 | PSYCHIC/PSYCHIC | 39 | 71 | 141 | 79 | 114 |
| opponent | 82 MAGNETON | 50 | ELECTRIC/STEEL | 69 | 104 | 129 | 111 | 79 |

Item and ability are overridden to `0` (none) on both sides, so no held-item
or ability modifier is in play. Kadabra's speed (114) exceeds Magneton's (79)
with neutral IVs/EVs at level 50, so **the player always acts first** --
turn order needed no tie-break RNG.

## Staging-contract finding: `overrides.parties` not yet live

The brief's preferred contract is `mechanicLab` `overrides.parties` (three
complete legal Pokemon/side, stock ROM derives everything, entry hooks replay
for real). That was tried first and the running oracle rejected it:

```
oracle: HTTP 400: {"error": "unknown overrides: parties"}
```

`oracle/battle_lab.py` gained `overrides.parties` support at harness commit
`b30c5d8` (2026-07-24 14:10:55), confirmed present on disk. But the oracle
process bound to `127.0.0.1:8014` (confirmed via `lsof -nP -iTCP -sTCP:LISTEN`)
has been running since that same morning (process start time 8:26 AM,
`ps -ef`) -- **before** `b30c5d8` landed. A long-running Python process holds
its module code in memory from import time, so it does not see the new
override key until restarted. Per `AGENTS.md`, a worker may not restart a
shared oracle. Both scenarios here use the legacy `overrides.battlers`
contract instead, which the live process does support and which still
exercises the real ROM's accuracy/crit/damage/PP/HP path end to end for this
matchup (no entry hooks are in play either way -- Insomnia/Rock Head don't
fire on switch-in, and both abilities are overridden to none regardless).
**The supervisor should restart the battle-scene-off oracle before briefing
the registration worker on `overrides.parties`**, or that worker will hit the
same rejection.

## Scenario 1: both Tackles hit

`mechanic-hit-chain-tackle-off.json`, seed 1. MOVE_TACKLE = 33 (`EFFECT_HIT`,
power 35, accuracy 95, type NORMAL, `secondaryEffectChance` 0 --
`data/battle_moves.h:432-443`).

### RNG roll order (attributed, not just counted)

Confirmed **empirically**, not just theoretically: constructing this
scenario required dense per-frame captures (every 1-2 frames) of the running
battle to see exactly which frame each `gRngValue` transition landed on, and
cross-referencing HP/PP deltas and the `engine.currentMove`/controller-command
fields at each transition. Every transition below was a single LCG step (see
below) with no skips, so each is unambiguously one `Random()` call in the
documented source location -- not an inference from a step-count alone.

Random() (`reference/pokeemerald/src/random.c:11-16`) advances
`gRngValue = ISO_RANDOMIZE1(gRngValue)` (`include/random.h:16`:
`1103515245 * val + 24691`, mod 2^32) and returns the **new** value's upper
16 bits. `rngValue` below is the full 32-bit `gRngValue` after that step; `u16`
is the consumed roll (`rngValue >>> 16`).

| # | Attacker | Source function | File:line | u16 roll |
| - | - | - | - | -: |
| 1 | player | `Cmd_accuracycheck`'s roll | `battle_script_commands.c:1176` | 40931 |
| 2 | player | `Cmd_critcalc`'s roll | `battle_script_commands.c:1282` | 33731 |
| 3 | player | `ApplyRandomDmgMultiplier` (called from `Cmd_adjustnormaldamage`) | `battle_script_commands.c:1641-1642` | 29631 |
| 4 | player | `Cmd_seteffectwithchance`'s roll | `battle_script_commands.c:2923` | 46260 |
| 5 | opponent | `Cmd_accuracycheck`'s roll | `battle_script_commands.c:1176` | 8101 |
| 6 | opponent | `Cmd_critcalc`'s roll | `battle_script_commands.c:1282` | 17708 |
| 7 | opponent | `ApplyRandomDmgMultiplier` (called from `Cmd_adjustnormaldamage`) | `battle_script_commands.c:1641-1642` | 50024 |
| 8 | opponent | `Cmd_seteffectwithchance`'s roll | `battle_script_commands.c:2923` | 35397 |

Exactly **8** `Random()` calls for the whole turn: 4 per attacker, always in
this order, because `BattleScript_EffectHit`'s linear hit path
(`data/battle_scripts_1.s:236-266`) only ever calls `Random()` from those four
commands for a healthy, no-status, no-crit-modifier, no-held-item attacker
against a non-Substituted, non-Protected target. `Cmd_attackstring`,
`Cmd_ppreduce`, `Cmd_damagecalc`, `Cmd_typecalc`, `Cmd_attackanimation`,
`Cmd_effectivenesssound`, `Cmd_hitanimation`, `Cmd_healthbarupdate`,
`Cmd_datahpupdate`, `Cmd_critmessage`, `Cmd_resultmessage`, and
`Cmd_tryfaintmon` consume **zero** RNG for this branch (confirmed both by
reading each function and by the frame-level capture showing no `gRngValue`
transition anywhere near their execution window).

**IMPORTANT for the registration step:** the scenario's committed
`captureFrames` are only `[0, 450]` -- deliberately not tuned to land exactly
between the two attacks or exactly at the 8th roll, because the actual
per-attack RNG accounting above was derived by iterating the known LCG
formula from `rngValue` at frame 0, not by finding an exact boundary frame.
The verify script proves those 8 hand-derived values are a genuine prefix of
the real trajectory by forward-searching from the 8th value to the frame-450
value (see `stepsToReach` in the script) rather than asserting an exact
final-frame match. **After the 8th roll, +14 more `Random()` calls happen
before frame 450** -- this is the opponent Factory AI's *next-turn*
move-selection scoring/tie-break draws (the game evaluates the AI's next
decision immediately once turn-1 processing finishes, without waiting for
player input). That is unrelated to the hit chain and must not be folded into
its RNG accounting.

### Damage arithmetic (cross-checked against `src/engine/damageCalc.ts`)

| Attack | Base (`calculateBaseDamage`) | STAB | Type mult. | After type | Rand roll -> % | Final | ROM-observed |
| --- | -: | -: | -: | -: | -: | -: | -: |
| player Tackle (39 Atk) -> opponent (104 Def) | 7 | none (PSYCHIC != NORMAL) | NORMAL vs STEEL = 0.5x (`ELECTRIC` neutral) | 3 | u16=29631 -> 85% | **2** | 2 |
| opponent Tackle (69 Atk) -> player (71 Def) | 16 | none (ELECTRIC/STEEL != NORMAL) | NORMAL vs PSYCHIC/PSYCHIC = neutral | 16 | u16=50024 -> 92% | **14** | 14 |

Both match exactly -- `damageCalc.ts`'s `calculateBaseDamage` +
`applyStab` + `applyTypeEffectiveness` + `applyRandomDamageMultiplier` (all
read-only imports, no engine code touched by this probe) reproduce the ROM's
real numbers bit-for-bit for this matchup. Neither roll triggers a critical
hit (`rollIsCriticalHit` needs `u16 % 16 === 0`; neither 33731 nor 17708
qualifies).

### HP / PP deltas

| Battler | HP before | HP after | Δ | PP slot | PP before | PP after |
| --- | -: | -: | -: | -: | -: | -: |
| player (Kadabra) | 136 | 122 | -14 | 0 | 35 | 34 |
| opponent (Magneton) | 146 | 144 | -2 | 2 (AI's slot pick among 4 identical Tackles) | 35 | 34 |

Neither faints (`Cmd_tryfaintmon` takes its no-faint path both times).

## Scenario 2: player's Slam misses, opponent's Tackle then hits

`mechanic-hit-chain-slam-miss-off.json`, seed 14. MOVE_SLAM = 21
(`EFFECT_HIT`, power 80, **accuracy 75**, type NORMAL,
`secondaryEffectChance` 0 -- `data/battle_moves.h:276-287`), chosen over
Tackle for the miss probe because its lower accuracy (75% vs 95%) makes a
miss ~5x more likely per seed, so a miss seed was findable by brute-force in
a handful of tries (seed 14, out of a scan over seeds 1-30 at 25%
expected-miss-rate).

### RNG roll order

| # | Attacker | Source function | File:line | u16 roll |
| - | - | - | - | -: |
| 1 | player | `Cmd_accuracycheck`'s roll (**miss**) | `battle_script_commands.c:1176` | 47190 |
| 2 | opponent | `Cmd_accuracycheck`'s roll | `battle_script_commands.c:1176` | 56878 |
| 3 | opponent | `Cmd_critcalc`'s roll | `battle_script_commands.c:1282` | 2775 |
| 4 | opponent | `ApplyRandomDmgMultiplier` | `battle_script_commands.c:1641-1642` | 52995 |
| 5 | opponent | `Cmd_seteffectwithchance`'s roll | `battle_script_commands.c:2923` | 44103 |

Exactly **5** rolls (not 8): once `Cmd_accuracycheck` misses, the script
jumps straight to `BattleScript_PrintMoveMissed` (see below) and skips
`Cmd_critcalc`/`Cmd_damagecalc`/`Cmd_typecalc`/`Cmd_adjustnormaldamage`/
`Cmd_seteffectwithchance` entirely for the player's own attack -- only the
opponent's subsequent Tackle contributes its usual 4 rolls. As with scenario
1, +14 more `Random()` calls (next-turn AI selection) follow after roll 5
before frame 450; the verify script's forward-search confirms these 5 values
are a genuine prefix of the observed trajectory rather than asserting an
exact endpoint match.

### Roadmap-premise correction: `orbyte` is not on `BattleScript_EffectHit`'s own miss path

The ROADMAP text asks to register "one for the miss branch, `orbyte`"
alongside the sixteen hit opcodes. Tracing the actual assembly
(`data/battle_scripts_1.s:236-266`) shows this is imprecise for
`BattleScript_EffectHit` specifically:

```
BattleScript_HitFromAccCheck::
    accuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE   ; :244, jumps HERE on miss
...
BattleScript_MakeMoveMissed::                                   ; :271 -- NOT the jump target above
    orbyte gMoveResultFlags, MOVE_RESULT_MISSED
BattleScript_PrintMoveMissed::                                   ; :273 -- the ACTUAL jump target
    attackstring
    ppreduce
BattleScript_MoveMissedPause::
    pause B_WAIT_TIME_SHORT
BattleScript_MoveMissed::
    effectivenesssound
    resultmessage
    waitmessage B_WAIT_TIME_LONG
    goto BattleScript_MoveEnd
```

`Cmd_accuracycheck`'s own C body already sets
`gMoveResultFlags |= MOVE_RESULT_MISSED` before jumping
(`battle_script_commands.c:1178`), so `BattleScript_EffectHit`'s accuracy-miss
argument is `BattleScript_PrintMoveMissed` directly -- it never touches the
`BattleScript_MakeMoveMissed` label or its `orbyte` (`Cmd_orbyte`,
`battle_script_commands.c:3864`) at all. Grepping every use of
`BattleScript_MakeMoveMissed` across the committed scripts
(`data/battle_scripts_1.s:1610,2153`) shows it is reached only by
`BattleScript_EffectSwagger` and `BattleScript_EffectFlatter`'s
`jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_MakeMoveMissed`
guard -- both **status-only, non-damaging** moves, unrelated to
`BattleScript_EffectHit`.

**So this scenario proves the real EFFECT_HIT miss path** (`accuracycheck`'s
miss branch through `attackstring`/`ppreduce`/`pause`/`effectivenesssound`/
`resultmessage`/`waitmessage`/`goto BattleScript_MoveEnd`, all already-needed
opcodes) **but does not exercise `orbyte`, and no EFFECT_HIT scenario can** --
that opcode belongs to a Substitute-interaction path on two unrelated status
moves. If the registration step wants to prove `orbyte` from a real ROM
capture, it needs a Swagger- or Flatter-vs-Substitute scenario, not a
hit-chain scenario. Recommend the ROADMAP wording be corrected accordingly
when next touched by whoever owns it (not this worker -- ROADMAP.md is
supervisor-owned).

### HP / PP deltas

| Battler | HP before | HP after | Δ | PP slot | PP before | PP after |
| --- | -: | -: | -: | -: | -: | -: |
| player (Kadabra, Slam missed) | 136 | 121 | -15 | 0 | 20 (Slam's base PP) | 19 |
| opponent (Magneton, Tackle hit) | 146 | 146 | 0 | 1 | 35 | 34 |

`Cmd_ppreduce` runs unconditionally before the accuracy-driven fork in the
*script* (accuracycheck's failure jump is set inside `Cmd_accuracycheck`
itself, but `BattleScript_PrintMoveMissed` still calls `ppreduce` again on
that path -- see the assembly above) -- confirmed by the player's PP
decrementing by exactly 1 despite the miss.

### Damage arithmetic (opponent's hit only; player's own attack dealt no damage)

| Attack | Base | STAB | Type mult. | After type | Rand roll -> % | Final | ROM-observed |
| --- | -: | -: | -: | -: | -: | -: | -: |
| opponent Tackle (69 Atk) -> player (71 Def) | 16 | none | neutral | 16 | u16=52995 -> 97% | **15** | 15 |

Matches exactly, same `damageCalc.ts` path as scenario 1.

## What the registration step gets from this probe

- The exact, cited, per-command RNG order and count for both the hit branch
  (4 rolls: accuracycheck, critcalc, adjustnormaldamage, seteffectwithchance)
  and the accuracy-miss branch (1 roll, no further rolls for that attacker).
- Proof `damageCalc.ts`'s existing `calculateBaseDamage` / `applyStab` /
  `applyTypeEffectiveness` / `applyRandomDamageMultiplier` /
  `calculateAccuracy` / `rollAccuracyHits` / `getCriticalHitChanceStage` /
  `rollIsCriticalHit` already reproduce the real ROM's numbers bit-exactly
  for this matchup with **zero disagreement** -- the registration step can
  consume these functions as-is; no delta to pin.
- A precise correction that `orbyte` is not reachable from
  `BattleScript_EffectHit`'s own miss path -- register it later against a
  Swagger/Flatter-vs-Substitute scenario, not a hit-chain one.
- Two rerunnable scenarios + one PASS/FAIL verify script
  (`tools/probe/verify-hit-chain-ground-truth.ts`) pinning all of the above,
  plus a determinism check (each scenario reruns twice and both frame-0 and
  frame-450 states must match byte-for-byte).
- A flagged infrastructure gap: `overrides.parties` needs the running
  battle-scene-off oracle restarted before it will accept requests using it.
