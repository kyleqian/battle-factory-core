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

## pau2: items 1, 2 and 4 landed (2026-11-18)

Presentation timing only: logical outcomes, RNG and kernel event order are unchanged (the census eventsDigest check below). Both scenes share the rules.

**Change (`src/engine/battleResolutionPresentation.ts`)**

1. `sourcePauseUsedMoveHoldFrames` accepts `B_WAIT_TIME_LONG` as well as `B_WAIT_TIME_SHORT`. It still returns `next - used + 1` (no constant). Labels it reaches in Factory Lv50 (first presented receipt after USEDMOVE is a message, the `pause` is within 3 straight-line instructions of it, no GOTO / END / RETURN between):
   - `BattleScript_KOFail` (773): Fissure / Guillotine / Horn Drill / Sheer Cold into an unaffected target. **ROM-proved** (below).
   - `BattleScript_AlreadyPoisoned` (709): failed Toxic / Poison Powder. Pause length is the psn4 ROM measurement (docs/aud249 "psn4": 64 + print); the seed 3738 engine replay + scoreboard moves toward the ROM (below). No pixel lab: the pau2-toxic lab's ROM turn 1 diverged from the app's (the ROM's Toxic hit, the app's missed), so it was dropped rather than seed-hunted.
   - `BattleScript_RestCantSleep` (750, Uproar only) and `BattleScript_MoveMissedDoDamage` (856, `resultmessage`): reached by the same rule, **not ROM-measured**.
   - Not reached: SleepTalkIsAsleep (1325, stopped by a GOTO), SpitUpFailProtect (2113, stopped by `stockpiletobasedamage`); the other LONG pauses (EffectMirrorMove, Memento, Faint*, SturdyPreventsOHKO, DampStopsExplosion, Arena) are not message-adjacent or are handled elsewhere.
2. `anchorlessPrePrintPauseFrames` + `ANCHORLESS_PRE_PRINT_PAUSE_LABELS`: for a message whose `programCounter - 1` is a literal `B_SCR_OP_PAUSE` and whose label is in the allowlist, a `move-animation` stub row of the source pause (SHORT = 32, LONG = 64) is pushed before the message (the `heldItemEffectOffHoldFrames` shape; `actionTransition: true` in Scene ON so live hosts / hides stay untouched). The allowlist is **`BattleScript_SafeguardEnds` only**: the ability switch-in prints (item 3) sit behind the ability pop-up and were not ROM-probed, and anchored scripts already get their pause from item 1, so a general rule would double-count.

**Numbers (`npm run compare -- <trace> --summary`, `out2-horndrill-{off,on}`, 620 frames, new traces in `tools/compare/traces/`)**

| window | before | after |
|---|---|---|
| KOFail OFF, matched frames | 415 / 620 | 558 / 620 |
| KOFail ON, matched frames | 410 / 620 | 568 / 620 |
| KOFail USEDMOVE hold (both scenes) | 7 | 71 (pause 64 + 7), print at 375 = ROM 374 + 1, menu 1 frame early |

Seed 3738 poison-tick SE 148 (engine replay + `soundScoreboard.py`, 6 samples each; engine-only, not a pixel compare): res60 -124 -> -20, res61 -82 -> -10 (psn5 estimated 28 / 18 residual). The Scene ON Safeguard stub's pixels are not verified against the ROM.

**Tests**: `tests/pau2ScriptPauses.test.ts` (KOFail hold = 71 in both scenes, AlreadyPoisoned hold >= 64 (engine-only stage `pau2-toxic-*`), the SafeguardEnds row = 32 and only after the pause). Without the LONG acceptance the KOFail / AlreadyPoisoned tests fail (hold 0). `tests/randomRoundSoak.test.ts` re-pinned: seed 0 "full" 37811 / turn 20 -> 39649 / turn 24 (same battle 2 / depth 1 / roundLost), the Baton Pass halt pin moved seed 3 -> 28 (re-scan hits 28, 32, 43, 44, 55, 64, 71, 78).

**Open remainder**: ability switch-in prints (item 3), RestCantSleep / MoveMissedDoDamage ROM samples, the AlreadyPoisoned pixel lab, the Safeguard ON look, the ~10 / ~20 frame residuals of res60 / res61, KOFail's 1-frame early menu.

## pau3: ROM windows for MoveMissedDoDamage, RestCantSleep, SafeguardEnds (2026-11-18)

Presentation timing only: logical outcomes, RNG and kernel event order are unchanged (census 0..99, both scenes, eventsDigest identical vs `37823d7ba`; only the 8 Safeguard-expiry rows changed). Both scenes share the rule.

**Labs** (`tools/battle-lab/pau3-{hjk,rest,safeguard}-{on,off}.json`, traces `tools/compare/traces/pau3-*.json`, app stages `pau3-*` in `tools/compare/appTrace.ts`). Hi Jump Kick uses an opposing Protect (priority +3) for a deterministic miss. The ROM rng read after a short idle probe, advanced 9 LCG steps (`x * 1103515245 + 24691 mod 2^32`), is the app stage `rngSeed`; it aligns the damage rolls so HP text matches. Message starts were located by decoding PNGs for text-box clears.

| script | ROM | app | verdict |
|---|---|---|---|
| MoveMissedDoDamage (HJK miss), OFF | message starts 30 / 93 / 197 / 289; used -> result 92 | identical; 92 | already right (LONG pause, pau2 rule) |
| MoveMissedDoDamage, ON | 30 / 185 / 289 / 381 | identical | already right |
| RestCantSleep (Uproar), OFF and ON | used -> "UPROAR kept" 86 | 86 | already right |
| SafeguardEnds | print 10 frames later than the 32-frame pause (both scenes) | 32 | fixed: 42 |

**Change**: `ANCHORLESS_PRE_PRINT_LEAD_FRAMES` (`{ BattleScript_SafeguardEnds: 10 }`) is added to the pause in `anchorlessPrePrintPauseFrames` (SHORT 32 -> 42 for that label only). The ROM-measured lead is the end-turn script start before its pause; it is label-keyed, extending the pau2 allowlist, not a per-trace constant. `sourcePauseUsedMoveHoldFrames` is unchanged.

**Tests**: `tests/pau3ScriptPauses.test.ts` (7): HJK used hold 67 and result +92 frames, Rest used hold 69 and +86, in both scenes; `anchorlessPrePrintPauseFrames` 42 for SafeguardEnds / null elsewhere; the expiry row `minimumFrames` 42 and the expiry print 121 frames after "But it failed" (OFF and ON). The Safeguard tests fail without the lead. `tests/pau2ScriptPauses.test.ts` expectation 32 -> 42.

**Acceptance**: out2-horndrill OFF 558 / ON 568 of 620 unchanged; typecheck 0, build 0, test:gate green; lbrd, randomRoundSoak (no re-pin), pau2, pau3 and 35 name-matched files green; `npm run soak -- --policy vanilla --seeds 0:20` 20 / 20 OK (4 ranges of 5).

**Not done: item 3 (Intimidate / Trace switch-in prints)**. Staged battles bypass `initializeFreshFactoryBattle`, so no battle-lab stage reaches the switch-in ability script; it needs a real-route or factoryLegal battle-start stage whose leads carry the ability. Unprobed.

**Open remainder**: ability switch-in prints (item 3); the +3 frame residual at the HJK crash print; the 4-frame-early tail after the Safeguard expiry print; the Rest ON +10 / +19 constant offsets (non-pause, PP text 20 vs ROM 10 in the lab); the failed-Toxic pixel lab; the res60 / res61 residuals; KOFail's 1-frame early menu.

## pau4m: switch-in ability prints (Intimidate / Trace), ROM vs ours (2026-11-19, measurement only, nothing landed)

pau3 item 3 was blocked because staged battles bypass `initializeFreshFactoryBattle`. It is reachable: a `factoryLegal` battle-lab runs the real battle-start intro (entry scripts included) inside its pre-checkpoint route, and the app side reaches the same seam with `beginFactoryRoundBattleStartIntro` (the `factory-arbitrary-intro-*` stage pattern).

**Tooling (kept)**: `tools/integration/sta6mIntroProbe.py` records absolute-frame `main` / script pointer / exec / anim per frame through `lab.prepare` plus the real party records (`lab._party`). Labs `tools/battle-lab/sta6m-{trace,intimp,both}-{off,on}.json` (factoryLegal, challengeNum 2, battleNum 0, `preCheckpointCaptureAllFrames`): `trace` = player Porygon (Trace) vs Magneton lead (set 273 vs [349,353,292], seed 70); `intimp` = player Mightyena (Intimidate) vs the same opponent; `both` = Mightyena (Intimidate) vs Porygon (Trace), trainer 133, seed 9. App stages `sta6m-intro-{trace,intimp,both}-{off,on}` (`tools/compare/appTrace.ts`, real ROM personalities for the player party) and traces `tools/compare/traces/sta6m-intro-*.json` (`preCheckpointFrameOffset` 1178: app frame f = ROM absolute frame f + 1178; 362 idle, A, 637 idle). An opponent-side Intimidate lab was tried and dropped (see Caveats).

### ROM (absolute frames; identical script rows in both scenes, ON is shifted +31 by its send-out animations)
| script | OFF | ON | note |
|---|---|---|---|
| `TraceActivates` (trace lab) | start 1862, `pause SHORT` -> 1894 (32), print exec 1895-1932 (37 frames), `waitmessage LONG` -> 1996 | 1893 / 1925 / 1926-1963 / 2027 | start -> command box 142 frames |
| `IntimidateActivatesEnd3` (intimp lab) | start 1862, 3 rows, `PauseIntimidateActivates` 32 (1863 -> 1895), 11 rows, stat-change anim (exec 2, anim 1) 1906 -> 1981 (75), print exec 1983-2033 (50), wait -> 2097, loop end 2101 | 1893 / anim 1937 / print 2014 / end 2132 | same offsets from start (+44 anim, +121 print, +239 end); start -> command box 247 |
| both lab (Intimidate then Trace, battler order) | Intimidate 1848 -> 2086, Trace 2088 -> 2227 (pause 32, print 2121-2163 = 42 frames, wait 64) | identical rows | start -> command box about 386 |

The text box keeps "Go! X!" unchanged through the 32-frame pause and the stat animation (box-change detection: ROM first change 806 = print start in the intimp OFF lab). The Trace print length depends on the text (37 vs 42 frames); `waitmessage LONG` is a constant 64.

### Ours at HEAD
The app computes the entry events (`src/engine/factoryBattleStart.ts` ~478-534 runs `BattleScript_IntimidateActivatesEnd3` / `BattleScript_TraceActivates`) but never presents them. `battleResolutionPresentation` is null at the first command, the intro goes straight from player release to command-ready, and no frame shows "PORYGON TRACED Foe ...". Command box: app frame 685 (OFF) / 715 (ON) in the trace and intimp labs, 672 in the both lab; the ROM has it at 827 / 858 (trace), 932 / 963 (intimp), about 1058 (both; the 1000-frame capture ends before it). Missing time: Trace +142 (OFF) / +143 (ON), Intimidate +247 / +248, Intimidate + Trace about +386. Exact-RGB matches: trace OFF 354 / 829, intimp OFF 334 / 949, both OFF 261 / 1001, trace ON 278 / 949, intimp ON 234 / 949, both ON 241 / 1001; all the loss is after app frame 684.

The existing `ANCHORLESS_PRE_PRINT_PAUSE_LABELS` mechanism cannot land this: it only adjusts a print inside a `battleResolutionPresentation` segment, and these scripts have no segment at all.

### Proposed landing (not done)
A battle-start entry-script phase between player-release and command-ready in `factoryBattleStartIntro.ts` / `factoryRoundBattleOrchestrator.ts` (`startCurrentBattle`, which already has `initialized.events`), one block per entry event, in the existing order (Intimidate by battler, then Trace), each starting at the current command-ready frame (ROM 1862 = app 684):
- Intimidate block (239 frames to the loop end, then +8 to the command box): 3 rows, 32-frame pause, 11 rows, 75-frame stat-change animation (Scene OFF too: the stat animation plays in both scenes), the "X's INTIMIDATE cuts Foe Y's attack!" print through the existing text timing, 64-frame wait, 4 closing rows. Message box stays on "Go! X!" until the print.
- Trace block: 32-frame pause, the print (37-42 frames by text), 64-frame wait; box shows "Go! X!" through the pause.
- Scene ON shifts the whole intro by +31 already; blocks are scene-independent.
- Likely also needed: the Intimidate stat animation is a `B_ANIM_STATS_CHANGE`, which the Scene ON live-body path (`liveBattlerX2Host`, `liveSpriteOrderHost`) already seeds from the battle-start events.

Unmeasured: Sand Stream (Tyranitar sets 860-869 are outside challenge 2's rank-0 range, so a factoryLegal lab cannot reach them), Drizzle / Drought (no such mons in the Factory data), `IntimidatePrevented` (needs a Clear Body / Hyper Cutter foe), opponent-side Intimidate / Trace (see below).

### Caveats
- The app's generated opponent record differs from the ROM's in personality / ability slot for the same set IDs (seed 70: Magneton 247632950 slot 0 vs ROM 1380988875 slot 1; seed 55: Arbok 345751778 slot 0 = Intimidate vs ROM 358929853 slot 1 = Shed Skin). The set IDs match, the personality draw cursors do not (aud243b recovers the ROM cursors by LCG inversion). So an opponent-side Intimidate lab does not trigger in the ROM, and the Trace text in our events would name Magnet Pull where the ROM says Sturdy. The timing blocks above do not depend on it.
- In the both lab the ON and OFF oracle intros are frame-identical (Go! box at 502 in both) while the trace / intimp labs differ by 31; unexplained, the ROM script rows are the same either way.
- Part A and B were measurement only; `src/` and `tests/` are untouched.

## pau4

Landed: the battle-start entry scripts (Intimidate / Trace, `BattleScript_IntimidateActivatesEnd3` / `BattleScript_TraceActivates`) are presented between the player release and the first action menu, in both scenes. Presentation only: kernel events, RNG and the census `eventsDigest` are unchanged (census seeds 0..99, both scenes, base ab978bbcf vs final: 100 / 100 identical battles, 31,507 ON / 30,730 OFF commands identical; T1 sound extra / missing / known-offset 0 / 0 / 0 in both arms).

### Design
- `initializeFreshFactoryBattle` returns `entryScripts` (label, kernel `rows`, events) per script, enriched presentation-side (scripting / target battler, ability and traced-mon substitutions).
- `src/engine/factoryBattleStartEntry.ts` builds a synthetic resolution: the "Go! X!" box, then each script's ordinary `projectBattleResolutionCommands` (no turn-end), and a schedule timed from the kernel rows: a command's lead is its event's `instructionExecution`, a stat row runs to its STATS_CHANGE animation's exec (Intimidate: exec 41 -> 44), the last print is extended by the script's closing rows (`rows - lastMsgExec - 1 - hold`: Trace 0, Intimidate 4) plus `ENTRY_SCRIPT_END_HELD_ROWS` = 3, and `ENTRY_SCRIPT_END_BLANK_ROWS` = 6 (the next-command handoff's blank box) precede the menu. Scripts after the first start `ENTRY_SCRIPT_GAP_ROWS` = 2 rows later. No per-trace constants.
- The phase lives in `battleStartIntro.entry` (the settled command waits inside it); `core.ts` draws it through `renderBattleResolutionPresentation` (the live view in Scene ON, the static view in Scene OFF), so the stat animation takes the existing path.
- Tier-1: `tests/pau4EntryScripts.test.ts` (fails without the change).

### Matched frames (exact RGB, `npm run compare -- sta6m-intro-* --summary`)
| trace | before | after |
|---|---|---|
| trace OFF | 354 / 829 | 417 / 829 (497 with the ROM's Sturdy text) |
| intimp OFF | 334 / 949 | 593 / 949 |
| both OFF | 261 / 1001 | 444 / 1001 |
| trace ON | 278 / 949 | 307 / 949 |
| intimp ON | 234 / 949 | 395 / 1001 |
| both ON | 241 / 1001 | 424 / 1001 |

Residual: (1) the opponent personality caveat above: the app's Magneton traces Magnet Pull where the ROM prints Sturdy, so the trace text frames differ (about 74 frames in trace OFF, the print is 5 frames different in length); (2) intimp OFF frames 684-932 match exactly, the leftovers are 933-934 / 943 on the opponent sprite right after the menu appears (idle x2 phase); (3) Scene ON: the intro region before 684 differs in ON already (baseline, 28-681), the stat animation plays but its opponent-tint sub-phase is offset (766-822, about 700 px per frame, the live palette / x2 host inputs are not seeded at battle start), and 683-696 are the player sprite settling; (4) the intimp ON summary line now reads 1001 frames where the baseline was recorded as 949; not investigated (the matched count is what is compared).

### Part B (not done): mid-battle switch-in / faint replacement
The same prints are missing after a faint replacement or a voluntary switch (the switch-in script's events reach the resolution as the existing `switch-in` commands, which present no entry-ability rows). Needed: one ROM lab (an Intimidate send-in after a faint, `overrides.parties`) to measure the rows from the send-in's end to the next menu, then the same row-timed projection appended to the `switch-in` command. Out of scope here: #222 switch / send-in animation timing.
