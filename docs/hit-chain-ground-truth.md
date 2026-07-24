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

Two more, rerun by `tools/probe/verify-hit-chain-edges.ts`
(`node --experimental-strip-types tools/probe/verify-hit-chain-edges.ts`), add
the KO/faint (`tryfaintmon`) and critical-hit (`critcalc`'s `gCritMultiplier`)
cases neither of the above two exercises -- see "Edge cases" below:

- `tools/battle-lab/mechanic-hit-chain-ko-off.json` -- URSARING one-shots three SUNKERN in a row, ending in a terminal WIN.
- `tools/battle-lab/mechanic-hit-chain-crit-off.json` -- KADABRA's Tackle crits on MAGNETON (seed 5).

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

## Edge cases: KO/faint and critical hit (S10 step (ii), round 2)

Two more committed battle-lab scenarios, rerun by
`tools/probe/verify-hit-chain-edges.ts` (`node --experimental-strip-types
tools/probe/verify-hit-chain-edges.ts`), close the two holes flagged above:
no crit case, no faint case. Both use the same `Cmd_critcalc`/`Cmd_damagecalc`
math as the two scenarios above; the only new mechanics they exercise are
`Cmd_tryfaintmon`'s two branches (next-mon vs. terminal win) and
`Cmd_critcalc`'s `gCritMultiplier`.

### Staging-contract update: `overrides.parties` is now live

Per the brief, this round re-probed the contract with one cheap request
before building anything, since the previous round's probe (above) found the
running oracle process pre-dated `overrides.parties` support. It now works:

```
$ curl -sS -X POST http://127.0.0.1:8014/v1/battle-lab/run -d '{... overrides.parties ...}'
{"schemaVersion": 1, "totalFrames": 2, "captures": [...]}   # 200 OK
```

The oracle was restarted since the last round. The KO scenario below uses
`overrides.parties` (it needs three real, distinct legal Pokémon per side so
a genuine multi-KO chain can happen — `overrides.battlers` only touches the
active loadout). The crit scenario reuses the existing `overrides.battlers`
KADABRA/MAGNETON route from Scenario 1 above (no need to change a contract
that already works for a single-turn probe) and just hunts a seed.

### KO scenario: three one-shots in a row, ending in a terminal WIN

`mechanic-hit-chain-ko-off.json`, seed 1, `overrides.parties`. Player fields
URSARING (species 217) as its sole relevant battler — Adamant nature, 31 IVs,
252 Atk / 4 HP EVs, ability slot 0 (Guts; species has no second ability slot
— `abilitySlot: 1` was tried first and the oracle rejected it with `"is not
available for species 217"`, confirming the catalog only exposes a real
second ability when one exists, not `ABILITY_NONE`-labeled `abilities[1]`
entries), move `MOVE_STRENGTH` (id 70, `EFFECT_HIT`, power 80, accuracy
**100** — chosen specifically so the killing hit's own accuracy roll can
never miss and pollute the KO proof) in all four slots, item none. The
opponent fields **three identical SUNKERN** (species 191 — one of the lowest
HP/Defense/Speed base-stat combinations in `src/data/gen/species-stats.json`,
30/30/30 respectively) at the legal HP floor (`ivs.hp: 0, evs.hp: 0`,
everything else left at the 31-IV/0-EV default), move `MOVE_TACKLE` in all
four slots. Two filler BULBASAUR round out the player's bench
(species/moveset irrelevant — they're never sent out).

Derived stats (from the real ROM's own capture, not hand-computed — this
run's SUNKERN defense IV was left at the 31 default, not zeroed, since only
`hp` was floored per the brief's "you may set HP EVs/IVs to legal minimums"
allowance):

| Battler | Species | Atk | Def | Speed | Types | Max HP |
| --- | --- | -: | -: | -: | --- | -: |
| player | 217 URSARING | 200 | — | 75 | NORMAL/NORMAL | 166 |
| opponent (x3) | 191 SUNKERN | 50 | 50 | 50 | GRASS/GRASS | 90 |

Ursaring's speed (75) exceeds Sunkern's (50), so **the player always acts
first** and a one-shot kill means the defender's own action for that turn
never happens (its queued move is cancelled once it faints) — same
speed-order convention as Scenario 1/2 above, just re-derived for this
matchup.

**Staging this took real trial and error, documented here because the next
worker will hit the same wall:** a naive fixed-frame trace (open-menu A,
wait, select-move A, wait N frames, repeat for 3 turns) does not work,
because the post-faint "next Pokémon" switch-in sequence
(`BattleScript_FaintedMonSendOutNew`, `data/battle_scripts_1.s:2860-2880` —
faint cry, faint animation, `cleareffectsonfaint`, switch-in animation, then
an automatic AI move-selection scoring pass for the newly active battler)
takes an empirically-observed ~1900-2500 frames from the killing blow to the
Fight menu being interactive again, and a same-sized or smaller fixed wait
before the next `A` press just gets **silently dropped** (button input
during the forced animation/menu-closed window has no effect — it is not
buffered for later). The working technique: press `A` normally for turn 1
only (the battle starts already at the Fight menu, no busy window), then
switch to **continuous low-duty-cycle `A` spam** — a 2-frame `A` pulse every
20 frames, sustained for the rest of the trace — for everything after. Since
menu-closed-window presses are simply dropped, spamming is safe (it cannot
double-fire a menu selection) and self-times both remaining turns without
needing to know the exact switch-in duration in advance. The committed
scenario's trace is header (`A`, wait 30, `A`) + 85 repeats of (`A` pulse,
18-frame wait) = 1734 frames total.

#### Turn 1's killing hit (clean frame-0 baseline)

Derived exactly like Scenario 1/2 above — 4 `Random()` calls, same fixed
order, **even though the hit KOs the target**: `seteffectwithchance`
(`data/battle_scripts_1.s:265`) runs before `tryfaintmon` (`:266`) on the
same linear path, so a KO does not skip or reorder any of the four rolls.

| # | Source function | u16 roll |
| - | - | -: |
| 1 | `Cmd_accuracycheck` | 56317 |
| 2 | `Cmd_critcalc` | 15002 |
| 3 | `ApplyRandomDmgMultiplier` | 52212 |
| 4 | `Cmd_seteffectwithchance` | 24745 |

Forward-stepping the LCG 4 times from the frame-0 `rngValue` (919694434)
lands **exactly** on the frame-260 (post-KO) `rngValue` (1621732966) — not
just within a search budget, an exact 4-step match, because there is no
opponent action this turn to add further rolls. Intermediate frames 50 and
90 independently confirm rolls 1 and 3 mid-chain (`rngValue` 3690816045 and
3421819359 respectively), so this isn't just an endpoint coincidence.

Damage: `critRoll % 16 = 15002 % 16 = 10` → no crit.
`calculateBaseDamage` → base 142 → `applyStab` (Ursaring is NORMAL, Strength
is NORMAL: STAB) → 213 → `applyTypeEffectiveness` (NORMAL vs. GRASS/GRASS:
neutral, 10/10) → 213 → `applyRandomDamageMultiplier` (u16=52212 → 96%) →
**204 final**, against Sunkern's 90 max HP. `damageCalc.ts` needs no crit
handling to overkill here — the point of this scenario is the **faint path**,
not a marginal 1-HP-left roll, so the damage margin is intentionally huge
(204 vs. 90) to make the KO itself, not the damage arithmetic, the thing
under test. `tryfaintmon`'s condition is simply "target HP already clamped
to 0 by `Cmd_datahpupdate`", confirmed directly: SUNKERN #1's captured HP is
exactly `0`, never negative.

PP[0] (Strength): 15 → 14, decremented by exactly 1 on the killing hit, same
as every other hit in this document.

#### Turns 2 and 3: the faint/next-mon/terminal-win boundary

| Event | Frame | `battleOutcome` | opponent `partyIndex` | opponent HP |
| --- | -: | -: | -: | -: |
| Battle start | 0 | 0 | 0 (SUNKERN #1) | 90/90 |
| Turn 1 kill | 260 | **0** | 0 | **0**/90 |
| Next mon sent out | 510 | 0 | 1 (SUNKERN #2) | 90/90 |
| Turn 2 kill | 860 | **0** | 1 | **0**/90 |
| Next mon sent out | 1110 | 0 | 2 (SUNKERN #3, **last**) | 90/90 |
| Turn 3 kill | 1650 | **1 (WON)** | 2 | **0**/90 |

This is the headline finding the brief asked for: **fainting a
non-last party member takes the next-mon path** (`gBattleOutcome` stays `0`,
`BattleScript_HandleFaintedMon`'s `checkteamslost` sees the team still has a
living member, falls through to `BattleScript_FaintedMonTryChoose` →
`FaintedMonSendOutNew`, and the ROM auto-sends the next bench Pokémon — no
player Yes/No prompt, because `BATTLE_TYPE_FRONTIER` short-circuits that
dialog per `data/battle_scripts_1.s`'s own jump table) — **but fainting the
LAST party member takes the terminal path**: `checkteamslost` at the very
top of `BattleScript_HandleFaintedMon` sets `gBattleOutcome` immediately and
jumps straight to `BattleScript_FaintedMonEnd`, **skipping the entire
switch-in dance** (no faint-cry-to-new-Pokémon animation, no second AI
move-selection pass). This scenario was deliberately built with SUNKERN #3
as the opponent's **last** party slot specifically to exercise this second
branch, per the brief's preference for a terminal outcome.

One more empirical (not hand-derived) finding worth flagging for whoever
attributes turns 2/3's individual rolls: the total `Random()` cost of "next
mon sent out + AI re-scores its move + the next killing hit's own 4 rolls"
is **exactly 10** `Random()` calls both times (`turn1Ko rngValue ->
turn2Ko rngValue` is a 10-step LCG walk; `turn2Ko rngValue -> terminal
rngValue` is also exactly 10) — consistent and reproducible, but this probe
did **not** attribute which of those 10 belong to the switch-in machinery
vs. the AI's move-selection scoring vs. the next hit's own accuracycheck/
critcalc/adjustnormaldamage/seteffectwithchance, because Battle Scene OFF
collapses that entire sequence into a handful of video frames (dense
per-frame captures at 2-frame resolution still show it as a single
before/after jump, unlike Scenario 1/2's turn-1 hit chain which was
individually resolvable frame-by-frame). If the registration step needs a
per-opcode breakdown of that 10-roll block specifically, it needs finer
instrumentation than semantic battle-lab captures currently provide (e.g. a
RAM-watch probe stepping one CPU instruction/opcode at a time), not just
denser `captureFrames`.

### Crit scenario: `Cmd_critcalc` rolls a critical hit

`mechanic-hit-chain-crit-off.json` — identical route/matchup/move to
Scenario 1 (KADABRA Tackle vs. MAGNETON Tackle, `overrides.battlers`), only
`seed` changed to **5** (found by an offline scan: fetch each candidate
seed's frame-0 `rngValue` with a 1-frame capture, hand-derive the player's
4-roll chain via the same LCG used throughout this doc, and check
`critRoll % 16 === 0` without needing a full battle run per candidate — seeds
1-59 were scanned; 5, 13, 51, and 53 all crit, seed 5 was used since it's the
smallest and needed no further tie-breaking).

Crit chance denominator: `sCriticalHitChance` (`battle_script_commands.c:606`)
is `{16, 8, 4, 3, 2}`, indexed by `critChance` stage (0 = no boosts, the case
here — neither battler has Focus Energy, a high-crit move, Scope Lens, or a
species-locked crit item). `Cmd_critcalc`'s roll is `!(Random() %
sCriticalHitChance[critChance])`, i.e. stage 0 is a flat **1-in-16** chance —
`damageCalc.ts`'s exported `CRITICAL_HIT_CHANCE_ONE_IN[0]` constant already
encodes this and needed no change.

| # | Attacker | Source function | u16 roll |
| - | - | - | -: |
| 1 | player | `Cmd_accuracycheck` | 16652 |
| 2 | player | `Cmd_critcalc` (**3760 % 16 = 0 → CRIT**) | 3760 |
| 3 | player | `ApplyRandomDmgMultiplier` | 40906 |
| 4 | player | `Cmd_seteffectwithchance` | 55148 |
| 5 | opponent | `Cmd_accuracycheck` | 49594 |
| 6 | opponent | `Cmd_critcalc` (29103 % 16 = 15, no crit) | 29103 |
| 7 | opponent | `ApplyRandomDmgMultiplier` | 40183 |
| 8 | opponent | `Cmd_seteffectwithchance` | 45862 |

Same 8-roll-then-+14-AI-scoring shape as Scenario 1, confirmed via the same
`stepsToReach` forward search.

**This scenario surfaces a real gap in `damageCalc.ts`, not a bug in it —
the exported functions simply don't have a crit-doubling step yet.**
`Cmd_damagecalc` (`battle_script_commands.c:1290`) is:

```c
gBattleMoveDamage = CalculateBaseDamage(...);
gBattleMoveDamage = gBattleMoveDamage * gCritMultiplier * gBattleScripting.dmgMultiplier;
```

`gCritMultiplier` is set to `2` by `Cmd_critcalc` on a crit, `1` otherwise —
and this multiplication happens **before** `Cmd_typecalc`'s STAB/type-effectiveness
step, not folded into `CalculateBaseDamage` itself.  `damageCalc.ts`'s
`isCriticalHit` parameter only feeds `critAdjustedAttackStat`/
`critAdjustedDefenseStat` (whether a stat-stage change is ignored) — there is
no exported `x2` step anywhere in the chain. Confirmed against the real ROM:

| | `calculateBaseDamage` | x2 (if crit) | `applyStab` | `applyTypeEffectiveness` (0.5x, NORMAL vs. STEEL) | `applyRandomDamageMultiplier` | ROM-observed |
| --- | -: | -: | -: | -: | -: | -: |
| player Tackle (**CRIT**) | 7 | 14 | 14 (no STAB, PSYCHIC != NORMAL) | 7 | u16=40906 → 90% → **6** | 6 |
| opponent Tackle (no crit, control) | 7 | — | 7 | 3 | u16=40183 → 97% → **2** | 2 |

Applying the x2 step **between** `calculateBaseDamage` and `applyStab`
(matching `Cmd_damagecalc`'s real position, before `Cmd_typecalc`) reproduces
the ROM's crit damage (6) exactly; the verify script's `computeDamage` helper
does this manually since `damageCalc.ts` itself doesn't yet. **The
registration step needs to add this multiplication explicitly** when it
wires up `Cmd_damagecalc`/`Cmd_critcalc` — it is not something the existing
`damageCalc.ts` exports already handle, unlike every other function this
probe and its sibling exercise (accuracy, STAB, type effectiveness, the
85-100% roll), which all reproduced the ROM bit-exactly with zero delta.

PP: player PP[0] 35 → 34, opponent PP (slot 3, the AI's pick among four
identical Tackles) 35 → 34 — both decrement by exactly 1, same convention as
the other three scenarios.

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
