# pau1: every `pause` before a message in battle_scripts_1.s vs. the engine (source reading only, 2026-11-18)

Scope: `reference/pokeemerald/data/battle_scripts_1.s` at master `9e4f9eb2e`; no `src/` / `tests/` change, no oracle, no ROM measurement. 84 `pause` instructions exist; all are `B_WAIT_TIME_SHORT` (32), `B_WAIT_TIME_LONG` (64) or the literal `8` (Arena only, out of scope). No `B_WAIT_TIME_MED` pause exists. The time cap meant engine paths were traced by reading, not by replay: "yes" = read the code and the pause is counted; "no" = read the code and it is provably skipped; "unknown" = not traced.

## How the engine models a pause (the mechanism the fix hangs on)

- The interpreter runs one instruction per frame and `Cmd_pause` blocks by retrying (`B_SCR_OP_PAUSE`, `battleScriptSourceCommands.ts:998`), so a pause of N frames shows up as N+1 in `provenance.instructionExecution` between the surrounding receipts. Nothing in the kernel drops it; the presentation layer decides whether the executions become a hold.
- Three presentation paths turn pause executions into frames, each by a narrow pattern:
  1. `sourcePauseUsedMoveHoldFrames` (`battleResolutionPresentation.ts:1333-1358`): USEDMOVE `holdFrames = next - used + 1`, only when the first presented receipt after USEDMOVE is a `message` and one of the 3 instructions before it is `B_SCR_OP_PAUSE` **with operand exactly `B_WAIT_TIME_SHORT`** (or a Pausex20 no-effect attackanimation, `NO_EFFECT_ATTACKANIMATION_HOLD_PCS`). `B_WAIT_TIME_LONG` is not accepted.
  2. `heldItemEffectOffHoldFrames` (:1409-1420): a `move-animation` row of the executions before an item print preceded by `playanimation B_ANIM_HELD_ITEM_EFFECT` (and Wish / Focus Band), Scene OFF only.
  3. `faintScriptPreCryFrames` / `FAINT_SCRIPT_LEAD_FRAMES = 66` (:360-380): FaintTarget / FaintAttacker's `pause LONG`; plus `sceneOffNoHitPauseFrames` / `SCENE_OFF_MOVE_PAUSE_FRAMES = 32` for Pausex20 (attackanimation), and `sceneOffStatusFrames` (Rest's retries).
- Everything else reaches the message builder (`type: "message"`, :4656) with `timing` from `messageTimingFromSourceProvenance` (only looks at the instruction **after** the print: `waitmessage LONG`) / `WAITMESSAGE_LONG_MESSAGE_IDS` / `MESSAGE_TIMING`. A pause **before** the print contributes nothing there.
- End-of-turn field scripts (`runScreenFieldCase`, `battleEndTurnOrchestration.ts:2051-2060`) have no USEDMOVE, so path 1 can never apply to them.

## Table

Reachability: "F" = reachable in Factory Lv50 singles; "no" = excluded (doubles-only, Arena, or the pause is not directly before a message). Engine path for the *message* = the code that builds its row.

| script label | line | pause | message | reach | engine path | presented |
|---|---|---|---|---|---|---|
| BattleScript_AlreadyAsleep | 302 | SHORT | PKMNALREADYASLEEP | F | path 1 (first receipt after USEDMOVE) | yes |
| BattleScript_WasntAffected | 308 | SHORT | PKMNWASNTAFFECTED | F | path 1 | yes |
| BattleScript_CantMakeAsleep | 314 | SHORT | gUproarAwakeStringIds | F (Uproar) | path 1 | yes |
| BattleScript_AlreadyPoisoned | 709 | **LONG** | PKMNALREADYPOISONED | F | path 1 rejects LONG; message row has no pre-hold | **no** (psn5) |
| BattleScript_EffectRest | 742 | SHORT | gRestUsedStringIds | F | `sceneOffStatusFrames` (status receipt -> print, Scene OFF); Scene ON: the status/animation commands | yes (OFF) / unknown (ON) |
| BattleScript_RestCantSleep | 750 | **LONG** | gUproarAwakeStringIds | F (Uproar) | path 1 rejects LONG | **no** (inferred) |
| BattleScript_RestIsAlreadyAsleep | 757 | SHORT | PKMNALREADYASLEEP2 | F | path 1 | yes |
| BattleScript_KOFail | 773 | **LONG** | gKOFailedStringIds | F (Fissure/Guillotine/Horn Drill/Sheer Cold) | path 1 rejects LONG | **no** (consistent with out1 / out2 finding it) |
| BattleScript_MoveMissedDoDamage | 856 | **LONG** | resultmessage (missed) | F (Jump Kick / Hi Jump Kick miss) | not traced | unknown |
| BattleScript_AlreadyConfused | 922 | SHORT | PKMNALREADYCONFUSED | F | path 1 | yes |
| BattleScript_AlreadyParalyzed | 1029 | SHORT | PKMNISALREADYPARALYZED | F | path 1 | yes |
| BattleScript_AlreadyHasSubstitute | 1106 | SHORT | PKMNHASSUBSTITUTE | F | path 1 | yes |
| BattleScript_EffectSubstitute | 1093 | SHORT | via SubstituteString | F | pause is before a `goto`; path 1 stops at GOTO | unknown |
| BattleScript_EffectMagnitude | 1689 | SHORT | MAGNITUDESTRENGTH | F | pause before the print after USEDMOVE-less anim? not traced | unknown |
| BattleScript_AlreadyAtFullHp | 2043 | SHORT | PKMNHPFULL | F | path 1 | yes |
| BattleScript_ButItFailed | 2059 | SHORT | resultmessage | F | path 1 | yes |
| BattleScript_NotAffected | 2066 | SHORT | resultmessage | F | path 1 | yes |
| BattleScript_SpitUpFail | 2105 | SHORT | FAILEDTOSPITUP | F | path 1 | yes |
| BattleScript_SwallowFail | 2127 | SHORT | gSwallowFailStringIds | F | path 1 | yes |
| BattleScript_AlreadyBurned | 2199 | SHORT | PKMNALREADYHASBURN | F | path 1 | yes |
| BattleScript_PrintAbilityMadeIneffective | 2470 | SHORT | PKMNSXMADEITINEFFECTIVE | F | path 1 | yes |
| BattleScript_EffectSnatch | 2550 | SHORT | PKMNWAITSFORTARGET | F | path 1 | yes |
| BattleScript_TeeterDance* (4 labels) | 2599-2618 | SHORT | various | F (Teeter Dance) | path 1 | yes |
| BattleScript_SafeguardProtected | 3254 | SHORT | PKMNUSEDSAFEGUARD | F | path 1 | yes |
| BattleScript_SafeguardEnds | 3260 | **SHORT** | PKMNSAFEGUARDEXPIRED | F | end-turn `runScreenFieldCase` message; no USEDMOVE | **no** (psn5) |
| BattleScript_MistProtected | 3344 | SHORT | PKMNPROTECTEDBYMIST | F | path 1 | yes |
| BattleScript_NoPPForMove | 3558 | SHORT | BUTNOPPLEFT | F (rare) | path 1 | yes |
| BattleScript_WishButFullHp | 3604 | SHORT | PKMNHPFULL | F | path 1 | yes |
| BattleScript_PrintMonIsRooted | 3619 | SHORT | PKMNANCHOREDITSELF | F | path 1 | yes |
| BattleScript_MagicCoatBounce | 3670 | SHORT | PKMNMOVEBOUNCED | F | path 1 | yes |
| BattleScript_DrizzleActivates / TraceActivates / SandstreamActivates / DroughtActivates | 3958 / 3972 / 3986 / 4051 | SHORT | switch-in ability prints | F | no USEDMOVE, so not path 1; not traced | unknown |
| BattleScript_IntimidatePrevented / TookAttack | 4045 / 4060 | SHORT | PREVENTEDFROMWORKING / PKMNSXTOOKATTACK | F | switch-in / hit path; not traced | unknown |
| BattleScript_SturdyPreventsOHKO | 4067 | SHORT | PKMNPROTECTEDBY | F | path 1 | yes |
| BattleScript_MonMadeMoveUseless, FlashFireBoost, AbilityPreventsPhasingOut, AbilityNoStatLoss, BRN/PRLZ/PSNPrevention, ObliviousPreventsAttraction, FlinchPrevention, OwnTempoPrevents, SoundproofProtected, AbilityNoSpecificStatLoss, StickyHoldActivates, NoItemSteal | 4095-4210 | SHORT | ability-prevent prints | F | path 1 where the print is the first receipt after USEDMOVE; ability pop-up / status-prevent ordering not traced | yes (probable) |
| BattleScript_FaintTarget / FaintAttacker | 2811 / 2819 | LONG | (pause before `dofaintanimation`, not a print) | F | `FAINT_SCRIPT_LEAD_FRAMES` 66 | yes |
| BattleScript_SleepTalkIsAsleep | 1325 | LONG | (goto ButItFailed, whose SHORT pause + resultmessage follows) | F | pause before a goto, and a second pause follows; path 1 sees only the SHORT | **no** (LONG half; inferred) |
| BattleScript_SpitUpFailProtect | 2113 | LONG | (before a jump to SpitUpFail's print) | F | path 1 window (3 instr, GOTO stops) | unknown |
| BattleScript_MementoTargetProtectEnd | 2245 | LONG | (before effectivenesssound) | F | not traced | unknown |
| BattleScript_PursuitDmgOnSwitchOut | 3124 | SHORT | before `attackstring` | no (Pursuit on switch; AI/auto switch only) | n/a | unknown |
| BattleScript_EffectStatUpAfterAtkCanceler / EffectStatDown | 496 / 543 | SHORT | before a `goto ..PrintString` | F | `turn78/turn4` stagings override to 1 frame; path 1 stops at GOTO | partly (stat-change command rows) |
| BattleScript_MoveMissedPause, MultiHitNoMoreHits, TripleKickNoMoreHits, EffectMirrorMove, EffectMetronome, EffectLeechSeed, EffectBeatUp, EffectNaturePower, HitAllWithUndergroundBonusMissed, FutureAttackMiss, CantLower/RaiseMultipleStats, Pausex20, PauseIntimidateActivates, MoveHPDrain, SturdyPreventsOHKO@4069, DampStopsExplosion | various | SHORT/LONG | pause before a label / non-print instruction | partly | not "directly before a print"; the label-adjacent ones are covered by path 1's 3-instruction window | n/a / unknown |
| BattleScript_Arena* | 4452-4488 | 8 / LONG | arena judgment | no (Battle Arena only) | n/a | n/a |
| (NOT a pause) BattleScript_SideStatusWoreOff | 3248 | none | PKMNSXWOREOFF | F | n/a | **n/a: there is no pause, so psn5's "Reflect / Light Screen / Mist WoreOff siblings probably also miss 32" is refuted by the source (:3248-3251)** |

## Findings

1. Every pause the engine drops is dropped for one of two structural reasons, not per-script bugs:
   - **LONG is not recognised**: `sourcePauseUsedMoveHoldFrames` tests `expression === "B_WAIT_TIME_SHORT"` only (:1357-1358). All four message-adjacent LONG pauses in the Factory scope (AlreadyPoisoned 709, RestCantSleep 750, KOFail 773, and the LONG half of SleepTalkIsAsleep -> ButItFailed 1325) hit this. MoveMissedDoDamage 856 (LONG, `resultmessage`) probably does too.
   - **No USEDMOVE anchor**: end-turn / switch-in field scripts (SafeguardEnds 3260, ability activations 3958-4051) never go through path 1, so their pause is invisible regardless of length.
2. The count of confirmed-missing message-adjacent pauses in Factory singles is small: AlreadyPoisoned (LONG 64), KOFail (LONG 64), RestCantSleep (LONG 64, Uproar only), SafeguardEnds (SHORT 32). Of these only AlreadyPoisoned and SafeguardEnds are common in the Factory (failed Toxic / Poison moves into poisoned targets; Safeguard expiry).
3. psn5's sibling guesses: already-paralyzed / burned / asleep / confused are SHORT and already covered by path 1 (so they need no change); the Reflect / Light Screen / Mist WoreOff siblings have no pause at all.

## Proposed general fix (not applied here)

1. **Path 1, LONG** (one-line, covers AlreadyPoisoned, KOFail, RestCantSleep, MoveMissedDoDamage, SleepTalk): accept `B_WAIT_TIME_LONG` as well as `B_WAIT_TIME_SHORT` in `sourcePauseUsedMoveHoldFrames`. The returned `next - used + 1` already equals the interpreter's executions, so no constant is needed (the SHORT case does not hard-code 32 either). Check each against a ROM sample first: the existing Pausex20/ButItFailed SHORT cases are ROM-measured, LONG is not. Watch the `waitmessage LONG` double count: `messageTimingFromSourceProvenance` already supplies the post-print 64, which is a different hold (after the print), so there is no overlap.
2. **Pre-print pause row without a USEDMOVE** (SafeguardEnds, ability activations): replace the USEDMOVE-only anchor with a general rule at the `type: "message"` push (:4656): if the message's `programCounter - 1` is `B_SCR_OP_PAUSE` (literal SHORT/LONG), and the previous presented receipt's `instructionExecution` is known, push a `move-animation` hold row (the same shape `heldItemEffectOffHoldFrames` pushes at :4647-4655) of `execution - previousExecution` frames minus the frames already presented, before the message. For end-turn scripts `runTickScript` must carry `instructionExecution` provenance (verify `runScreenFieldCase` events have it; if not, a constant row of 32 before `SAFEGUARD_ENDS_LABEL`'s message is the fallback).
3. Do (2) for the ability switch-in prints (Drizzle, Sand Stream, Drought, Trace, Intimidate-prevented) only after a ROM probe: they sit behind the ability pop-up animation, whose own rows may already absorb the pause.
4. Verification order: ROM sample for a LONG print (psn5 seed 3738 / 499 chains already exist), then a per-label test asserting the hold equals the source pause length, then the full suite.
