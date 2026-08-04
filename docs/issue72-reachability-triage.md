# ISSUES #72 reachability triage: the 107 UNRESOLVED printstring STRINGIDs

Answers ISSUES #72's own "real triage requires... per-id reachability work" deferral, following #70's method (`docs/issue70-stringid-reachability.md`): trace each UNRESOLVED id's emitting script label(s) to their trigger (move effect / ability hook / item hook / status interaction / battle-flow event), identify static gates (battle-type/facility conditionals, engine barriers, opcode paths never taken), and check Factory L50 singles carrier evidence (`battle-script-topology.json`'s `level50FactoryReachableEffects`, `battle-frontier-mons.json`'s 850-index L50 rental boundary, `species-stats.json`'s ability join). **This is a triage step, not a fixing step** — no `messageLines`/engine changes were made.

Re-ran `node --experimental-strip-types tools/report/printstring-literal-census.ts` first: output byte-identical to the committed `docs/printstring-literal-census.md` (107 UNRESOLVED, no diff) — the source id set is unchanged.

## Partition counts

| REACHABLE | DEAD | MANUAL | Total |
| --- | --- | --- | --- |
| 66 | 41 | 0 | 107 |

(Sums to the census's 107 UNRESOLVED ids exactly.)

## The 7 highest-suspicion ids (ISSUES #72's own next-pick list)

| STRINGID | Verdict | One-line why |
| --- | --- | --- |
| `STRINGID_PKMNALREADYASLEEP` | REACHABLE | EFFECT_SLEEP jumpifstatus, 39/850 weighted carriers (Sing/Sleep Powder/Hypnosis/Lovely Kiss/Spore/Grass Whistle). |
| `STRINGID_PKMNALREADYCONFUSED` | REACHABLE | EFFECT_CONFUSE jumpifstatus2, 48/850 weighted (+ Teeter Dance's own copy, 2/850). |
| `STRINGID_PKMNALREADYHASBURN` | REACHABLE | EFFECT_WILL_O_WISP jumpifstatus, 10/850 weighted (Will-O-Wisp). |
| `STRINGID_PKMNALREADYPOISONED` | REACHABLE | EFFECT_TOXIC jumpifstatus, 26/850 weighted (Toxic). |
| `STRINGID_PKMNISALREADYPARALYZED` | REACHABLE | EFFECT_PARALYZE jumpifstatus, 64/850 weighted (Thunder Wave/Stun Spore/Glare) — the single largest carrier pool in the whole census. |
| `STRINGID_PKMNCANTUSEMOVETORMENT` | DEAD today (engine gap, not a game-design dead-end) | This engine's attack-canceler phase enum has no CANCELER_TORMENTED phase at all (goes DISABLED→TAUNTED directly); Torment itself is inflictable with a real 4/850 carrier, so the same fix idiom as the Taunt/Imprison pair would unlock it immediately. |
| `STRINGID_PKMNCANTUSEMOVESEALED` | **DEAD** (settled 2026-08-03, see appendix) | Engine wiring is real, but the sole Imprison carrier (FRONTIER_MON_RALTS, raw catalog index 5) sits below `FRONTIER_MON_GRIMER` = 110, the universal floor of every Factory L50 challenge-tier draft range (`sInitialRentalMonRanges`, `battle_factory.c:169-186`) — it is never drafted as opponent, initial rental, or Brain-party filler at any win streak. `battle-script-topology.json` was right; the raw-catalog "index ≤ 849" check was an incomplete test (missing the lower bound). |

## Full 107-id triage

| STRINGID | Emitting script label(s) | Trigger attribution | Carrier / gate evidence | Verdict |
| --- | --- | --- | --- | --- |
| `STRINGID_DEFEATEDOPPONENTBYREFEREE` | `BattleScript_ArenaDoJudgment` | Battle Arena judge sequence only. | Zero callers into the label anywhere in the 619-block program (no `call`/`goto`/`jumpif*` targets it) and zero `src/*.ts` references outside `gen/`; Factory's `battleTypeFlags` is always `TRAINER\|FACTORY` only (`factoryBattleScriptFullTurnDecision.ts:255`, `factoryBattleScriptTerminalDecision.ts:363`) — `BATTLE_TYPE_ARENA` is a distinct, mutually-exclusive Frontier facility bit. | **DEAD** — Battle Arena facility gate. |
| `STRINGID_DIDNOTLEARNMOVE` | `BattleScript_AskToLearnMove` | Only reachable inside `Cmd_getexp`'s EXP/level-up/evolution machinery (states 1-5). | `battleScriptGetexpOpcode.ts:159-178`'s state-0 `shortCircuits` test includes `GETEXP_STATE0_SHORT_CIRCUIT_MASK` (`:63-77`, contains `BATTLE_TYPE_FRONTIER`⊇`BATTLE_TYPE_FACTORY`) — always true for Factory, so every `getexp` call jumps straight to state 6 (DONE), permanently skipping states 1-5. | **DEAD** — no-EXP Factory rentals gate. |
| `STRINGID_ENEMYABOUTTOSWITCHPKMN` | `BattleScript_FaintedMonTryChoose` | The AI's Yes/No prompt when about to switch in response to your fainted mon, in an *ordinary* (non-Frontier) trainer battle (`:2843-2855`) — not wild-only as initially suspected. | Doubly dead: (a) this engine halts as an unregistered non-terminal barrier on the entry `jumpifbattletype BATTLE_TYPE_TRAINER, BattleScript_FaintedMonTryChoose` itself (`battleScriptFaintedActionsOrchestration.ts:118-137`); (b) even past that, source's own `jumpifbattletype BATTLE_TYPE_FRONTIER, BattleScript_FaintedMonSendOutNew` (`:2849`) is always taken for Factory, permanently skipping the printstring. | **DEAD** — Frontier battle-type gate (doubly, plus an engine barrier). |
| `STRINGID_FORFEITEDMATCH` | `BattleScript_PrintPlayerForfeited`, `BattleScript_PrintPlayerForfeitedLinkBattle` | Would need a player RUN command in a Frontier trainer battle intercepted as a forfeit (`battle_main.c:5058-5062`). | This engine's `BattleCommandDecision = BattleMoveDecision \| BattleSwitchDecision` only (`battleDecisionBoundary.ts:41`) — no run/forfeit decision kind exists at all, an intentionally scoped-out surface (`factoryBattleScriptFullTurnDecision.ts:239-257`'s `FACTORY_RUN_AWAY_NOOP_INVARIANT`); zero JSON callers or engine references to either label. | **DEAD** — no forfeit/run action modeled in this engine's decision surface at all. |
| `STRINGID_FORXCOMMAYZ` | `BattleScript_BerryConfuseHealEnd2` | End-of-turn confuse-on-heal berry (Figy/Wiki/Mago/Aguav/Iapapa) print, printed right after `STRINGID_PKMNSITEMRESTOREDHEALTH` before `setmoveeffect MOVE_EFFECT_CONFUSION\|MOVE_EFFECT_AFFECTS_USER` (`battle-script-program.json:4397-4407`). | Label has **zero** references anywhere in `src/engine` or `tests` (only the *different*, already-implemented `BattleScript_BerryCureConfusionEnd2`/`HOLD_EFFECT_CURE_CONFUSION` exists, `battleEndTurnOrchestration.ts:119,158,1275-1281`) — the flavor-dislike-confuses-on-heal mechanic itself has no `FlavorRelation`/dislike function anywhere in the engine. Also **0/850**: no Factory rental (L50 or the raw 882 catalog) carries any of Figy/Wiki/Mago/Aguav/Iapapa Berry. | **DEAD** — engine gap (mechanic unmodeled) *and* zero carrier, either alone would be sufficient. |
| `STRINGID_LOSTTOOPPONENTBYREFEREE` | `BattleScript_ArenaJudgmentPlayerLoses` | Reached only by a `jumpifbyte` inside `ArenaDoJudgment` itself (program line 4499). | Same gate — the sole entry point is itself unreachable. | **DEAD** — Battle Arena facility gate. |
| `STRINGID_MAGNITUDESTRENGTH` | `BattleScript_EffectMagnitude` | Move-effect entry script itself (dispatched via the move-effect table on move selection, not a script-internal jump). | EFFECT_MAGNITUDE: **2/850** weighted Factory-L50 carriers (Magnitude). | **REACHABLE** — Magnitude rental(s) using the move print their magnitude roll every use. |
| `STRINGID_NATUREPOWERTURNEDINTO` | `BattleScript_EffectNaturePower` | Move-effect entry script (Nature Power's own conversion print). | EFFECT_NATURE_POWER: **0/850** weighted — no Factory L50 rental carries Nature Power. | **DEAD** — no carrier. |
| `STRINGID_PKMNALREADYASLEEP` | `BattleScript_AlreadyAsleep` | `BattleScript_EffectSleep:289` `jumpifstatus BS_TARGET, STATUS1_SLEEP, BattleScript_AlreadyAsleep` — attacker uses a sleep move on a target that already has `STATUS1_SLEEP`. | EFFECT_SLEEP: **39/850** weighted (Sing 8, Sleep Powder 9, Hypnosis 9, Lovely Kiss 4, Spore 4, Grass Whistle 5). Ordinary AI behavior (repeat-move on an already-slept target) or player re-use. | **REACHABLE.** |
| `STRINGID_PKMNALREADYCONFUSED` | `BattleScript_AlreadyConfused`, `BattleScript_TeeterDanceAlreadyConfused` | `BattleScript_EffectConfuse:909` `jumpifstatus2 BS_TARGET, STATUS2_CONFUSION, BattleScript_AlreadyConfused` (after an Own Tempo check); Teeter Dance's own per-target loop copy of the same check (`BattleScript_EffectTeeterDance`, confirmed `executable` with a real generic addbyte/jumpifbyte loop mechanism, `docs/executable-frontier-census.md:229`). | EFFECT_CONFUSE: **48/850** weighted (Supersonic 3, Confuse Ray 43, Sweet Kiss 2); EFFECT_TEETER_DANCE: **2/850** weighted, additive. | **REACHABLE** via either path. |
| `STRINGID_PKMNALREADYHASBURN` | `BattleScript_AlreadyBurned` | `BattleScript_EffectWillOWisp:2179` `jumpifstatus BS_TARGET, STATUS1_BURN, BattleScript_AlreadyBurned`. | EFFECT_WILL_O_WISP: **10/850** weighted (Will-O-Wisp). | **REACHABLE.** |
| `STRINGID_PKMNALREADYPOISONED` | `BattleScript_AlreadyPoisoned` | `BattleScript_EffectToxic:692-693` `jumpifstatus BS_TARGET, STATUS1_POISON\|STATUS1_TOXIC_POISON, BattleScript_AlreadyPoisoned`. | EFFECT_TOXIC: **26/850** weighted (Toxic); EFFECT_POISON is 0/850 and not needed. | **REACHABLE.** |
| `STRINGID_PKMNANCHOREDITSELF` | `BattleScript_PrintMonIsRooted` | `BattleScript_EffectRoar` stmt4 `jumpifstatus3 BS_TARGET, STATUS3_ROOTED, BattleScript_PrintMonIsRooted` — a Roar/Whirlwind-family force-switch move used against a target that used Ingrain (`STATUS3_ROOTED` set by `battleScriptIngrainLeechSeedWrapOpcode.ts:65-73`, opcode wired at `battleScriptRulesContext.ts:2924`). | EFFECT_ROAR **40/850** weighted (Roar 36, Whirlwind 4); EFFECT_INGRAIN **5/850** weighted — both real, independent carriers. | **REACHABLE.** |
| `STRINGID_PKMNANCHORSITSELFWITH` | `BattleScript_AbilityPreventsPhasingOut` | Same `EffectRoar` block, stmt3 `jumpifability BS_TARGET, ABILITY_SUCTION_CUPS, ...` (`ABILITY_SUCTION_CUPS` registered in `JUMPIFABILITY_VALUES`, `battleScriptIngrainLeechSeedWrapOpcode.ts:362,387`). | EFFECT_ROAR **40/850** weighted; Suction Cups **7/882** (3 species: Lileep/Octillery/Cradily). | **REACHABLE.** |
| `STRINGID_PKMNATTACK` | `BattleScript_BeatUpLoop` | Beat Up's own multi-hit loop print (EFFECT_BEAT_UP). | `MOVE_BEAT_UP`: **0/882** raw carriers (independently confirmed by direct scan of `battle-frontier-mons.json`) — EFFECT_BEAT_UP is absent from `level50FactoryReachableEffects`. | **DEAD** — no carrier. |
| `STRINGID_PKMNCANTUSEMOVESEALED` | `BattleScript_MoveUsedIsImprisoned`, `BattleScript_SelectingImprisonedMoveInPalace` | Attack-canceler `handoff` to `BattleScript_MoveUsedIsImprisoned` is real and wired (`battleScriptActionAdmission.ts:2588`, same idiom as the Taunt/#72 fix). `SelectingImprisonedMoveInPalace` is Battle Palace's move-auto-selection UI only. | **Settled 2026-08-03 (see appendix) — the raw-catalog vs. topology-JSON contradiction was an incomplete carrier test, not a generator bug.** `battle-frontier-mons.json` index 5 (`FRONTIER_MON_RALTS`) really does carry `MOVE_IMPRISON`, and index 5 is indeed ≤ `FRONTIER_MONS_HIGH_TIER` (849) — but source's real per-challenge draft table (`sInitialRentalMonRanges`, `battle_factory.c:169-186`, mirrored exactly in `factory-round-policy.json`'s `rentalSelection.ranges.level50`) never draws below `FRONTIER_MON_GRIMER` = 110 (`battle_frontier_mons.h:114`) at ANY win-streak/challenge number, for the opponent draft (`GenerateOpponentMons`), the initial rental draft (`GenerateInitialRentalMons`), or the Frontier Brain party (`FillFactoryBrainParty`) alike (`GetFactoryMonId`, `battle_factory.c:829-862`, all 3 call sites). RALTS (index 5) is below that floor and is never drafted into a real Factory L50 run. `battle-script-topology.json`'s `level50FactoryReachableEffects` (built from `factory-animation-inventory.json`'s `tiers.level50.moves`, itself built from `factory-round-policy.json`'s `rentalSelection.ranges` — **not** `factory-ai-policy.json`, the prior row's citation was wrong) correctly excludes `EFFECT_IMPRISON`. The `SelectingImprisonedMoveInPalace` sibling is DEAD (Battle Palace facility gate, not modeled/in scope). | **DEAD** — both labels; non-Palace path settled by source range-table proof (no battle-lab trace needed). |
| `STRINGID_PKMNCANTUSEMOVETORMENT` | `BattleScript_MoveUsedIsTormented`, `BattleScript_SelectingTormentedMoveInPalace` | Real Gen3 `AtkCanceler_UnableToUseMove` has a Torment recheck between the Disabled and Taunted phases that would `handoff` to this label. | This engine's `BATTLE_SCRIPT_ATTACK_CANCELER_PHASES` (`battleScriptSourceConstants.ts:69-85`) goes `CANCELER_DISABLED: 6` → `CANCELER_TAUNTED: 7` directly — **there is no `CANCELER_TORMENTED` phase at all**, and `BattleScript_MoveUsedIsTormented` has **zero** references anywhere in `src/` outside `src/data/gen/`. Torment itself *is* inflictable (`settorment`/`Cmd_settorment` fully wired, `battleScriptSettormentOpcode.ts`) with a real carrier (EFFECT_TORMENT: **4/850** weighted), so the status can be set but the mid-turn re-use block+print that would follow it is simply never executed by this engine. `SelectingTormentedMoveInPalace` is the Palace-only sibling. | **DEAD today** — engine gap, not a game-design or battle-type gate: same fix idiom as the Taunt/Imprison pair (add a `CANCELER_TORMENTED` phase + handoff) would make it REACHABLE immediately given the 4/850 carrier. `SelectingTormentedMoveInPalace` alone: **DEAD** (Palace facility gate). |
| `STRINGID_PKMNCHANGEDTYPE` | `BattleScript_EffectCamouflage`, `BattleScript_EffectConversion`, `BattleScript_EffectConversion2` | Move-effect entry scripts for Camouflage/Conversion/Conversion2. | All three effects are **0/850** weighted — no Factory L50 rental carries any of the 3 moves. | **DEAD** — no carrier for any of the 3 triggering moves. |
| `STRINGID_PKMNCHANGEDTYPEWITH` | `BattleScript_ColorChangeActivates` | Color Change ability branch, `battleScriptMoveEndOpcode.ts:482-503` — any damaging hit (no contact requirement) whose type doesn't already match the holder. | Color Change **2/882**, Kecleon only; attacking-side carrier pool (any damaging move) is unrestricted. | **REACHABLE.** |
| `STRINGID_PKMNCOPIEDFOE` | `BattleScript_EffectRolePlay` | Move-effect entry script (Role Play copies target's ability). | EFFECT_ROLE_PLAY: **1/850** weighted (Role Play). | **REACHABLE** (thin but real). |
| `STRINGID_PKMNCOPIEDSTATCHANGES` | `BattleScript_EffectPsychUp` | Move-effect entry script (Psych Up copies target's stat stages). | EFFECT_PSYCH_UP: **14/850** weighted (Psych Up). | **REACHABLE.** |
| `STRINGID_PKMNCUTSATTACKWITH` | `BattleScript_IntimidateActivatesLoop` | Switch-in Intimidate: `battleScriptSwitchinOpcode.ts:930` sets the script pointer to `BattleScript_IntimidateActivatesEnd3`, falling through into `IntimidateActivatesLoop`, which prints this on a successful Attack drop. | Intimidate **38/882** (14 species). | **REACHABLE**, common (fires on switch-in). |
| `STRINGID_PKMNDREAMEATEN` | `BattleScript_DreamEaterWorked` | Dream Eater landing on a sleeping target (`BattleScript_EffectDreamEater` entry, `jumpifstatus STATUS1_SLEEP` gate). | EFFECT_DREAM_EATER: **6/850** weighted (Dream Eater). | **REACHABLE.** |
| `STRINGID_PKMNFELLINLOVE` | `BattleScript_EffectAttract` | Move-effect entry script (Attract). | EFFECT_ATTRACT: **45/850** weighted (Attract). | **REACHABLE.** |
| `STRINGID_PKMNFELLINTONIGHTMARE` | `BattleScript_NightmareWorked` | `BattleScript_EffectNightmare:1463-1465`: requires target `STATUS2_SUBSTITUTE` clear, not already `STATUS2_NIGHTMARE`, **and** already `STATUS1_SLEEP`. | EFFECT_NIGHTMARE: **2/850** weighted (Nightmare). Compound trigger: needs the target already asleep from a separate source first (an earlier turn's Sing/Hypnosis/Spore/etc. from a teammate or the same battler in a prior encounter), then a Nightmare-carrier attacks it — a normal cross-turn/cross-mon combo over a 7-battle Factory set. | **REACHABLE** (compound but concrete carrier chain). |
| `STRINGID_PKMNFLEDUSING` | `BattleScript_RanAwayUsingMonAbility` | Would require a wild-battle flee via Run Away. | Zero references to the label anywhere in `src/`; `factoryBattleScriptFullTurnDecision.ts:235-257`'s `FACTORY_RUN_AWAY_NOOP_INVARIANT` documents that a Factory RUN command is intercepted as a forfeit (`battle_main.c:5058-5062`) before Run Away/`fleeType` is ever consulted — same architectural gate as `STRINGID_FORFEITEDMATCH`'s "no run/forfeit decision kind exists" finding. | **DEAD** — Factory trainer battles never reach the flee branch at all. |
| `STRINGID_PKMNFORGOTMOVE` | `BattleScript_ForgotAndLearnedNewMove` | Same `getexp` level-up machinery. | Same `GETEXP_STATE0_SHORT_CIRCUIT_MASK` gate. | **DEAD** — no-EXP Factory rentals gate. |
| `STRINGID_PKMNFREEDFROM` | `BattleScript_WrapEnds` | Attacker's own multi-turn Bind/Wrap/Fire Spin/Whirlpool/Sand Tomb duration expiring; wired at end-of-turn (`WRAP_ENDS_LABEL`, `battleEndTurnOrchestration.ts:92`). | EFFECT_TRAP: **14/850** weighted (Bind 2, Wrap 4, Fire Spin 4, Whirlpool 3, Sand Tomb 1) — same family #70 already proved reachable for the sibling "squeezed by"/"wrapped by" ids. | **REACHABLE.** |
| `STRINGID_PKMNGOTENCORE` | `BattleScript_EffectEncore` | Move-effect entry script (Encore). | EFFECT_ENCORE: **4/850** weighted (Encore). | **REACHABLE.** |
| `STRINGID_PKMNGOTFREE` | `BattleScript_WrapFree` | Target breaking a Bind/Wrap-family trap early (RNG) or via Rapid Spin (`resolveBattleScriptLabel(..., "BattleScript_WrapFree")`, `battleScriptIngrainLeechSeedWrapOpcode.ts:510-511`). | Same EFFECT_TRAP **14/850** weighted pool. | **REACHABLE.** |
| `STRINGID_PKMNGREWTOLV` | `BattleScript_LevelUp` | Same `getexp` level-up machinery; sole `gBattlescriptCurrInstr = BattleScript_LevelUp` write is real-source `battle_script_commands.c:3461`. | Same `GETEXP_STATE0_SHORT_CIRCUIT_MASK` gate. | **DEAD** — no-EXP Factory rentals gate. |
| `STRINGID_PKMNHEALEDPARALYSIS` | `BattleScript_TargetPRLZHeal` | `MOVE_EFFECT_REMOVE_PARALYSIS` handler, `battleScriptHitChainOpcode.ts:3158-3172` — the only move setting this effect is Smelling Salt (EFFECT_SMELLINGSALT, real-source `battle_scripts_1.s:2267-2270`). | EFFECT_SMELLINGSALT: **1/850** weighted. | **REACHABLE** (thin but real). |
| `STRINGID_PKMNHUNGONWITHX` | `BattleScript_FocusBandActivates` | Focus Band survival roll inside `adjustnormaldamage` (`battleScriptHitChainOpcode.ts:1978-2012`), reached via `Cmd_resultmessage`'s `MOVE_RESULT_FOE_HUNG_ON` case (`:2617-2649`) whenever a lethal hit lands on a Focus-Band holder and the roll succeeds. | Focus Band item: **80/882** entries (68 species). | **REACHABLE**, common. |
| `STRINGID_PKMNHURTSWITH` | `BattleScript_RoughSkinActivates` | Rough Skin on-contact branch, `battleScriptMoveEndOpcode.ts:507-521`. | Rough Skin **3/882** (2 species: Carvanha/Sharpedo); attacker-side contact-move carrier pool is broad. | **REACHABLE.** |
| `STRINGID_PKMNIDENTIFIED` | `BattleScript_EffectForesight` | Move-effect entry script (Foresight). | EFFECT_FORESIGHT: **3/850** weighted (Foresight). | **REACHABLE.** |
| `STRINGID_PKMNISALREADYPARALYZED` | `BattleScript_AlreadyParalyzed` | `BattleScript_EffectParalyze:1015` `jumpifstatus BS_TARGET, STATUS1_PARALYSIS, BattleScript_AlreadyParalyzed`. | EFFECT_PARALYZE: **64/850** weighted (Stun Spore 7, Thunder Wave 53, Glare 4) — the single largest carrier pool in this whole census. | **REACHABLE**, high incidence. |
| `STRINGID_PKMNKNOCKEDOFF` | `BattleScript_KnockedOff` | `MOVE_EFFECT_KNOCK_OFF` handler, `battleScriptHitChainOpcode.ts:3198-3239` (target holds an item, not Sticky Hold). | EFFECT_KNOCK_OFF: **7/850** weighted. | **REACHABLE.** |
| `STRINGID_PKMNLAIDCURSE` | `BattleScript_DoGhostCurse` | `BattleScript_EffectCurse:1483` `jumpiftype2 BS_ATTACKER, TYPE_GHOST, BattleScript_GhostCurse` — only a Ghost-typed Curse-user takes this branch (non-Ghost users get the ordinary self-stat-buff Curse instead, a different message). | EFFECT_CURSE: 18/850 weighted total Curse carriers, of which exactly **1 is Ghost-typed within the 0-849 L50 boundary: `SPECIES_DUSCLOPS`** (verified by joining `battle-frontier-mons.json` index≤849 against `species-types.json`). | **REACHABLE** via Dusclops. |
| `STRINGID_PKMNLEARNEDMOVE` | `BattleScript_LearnedNewMove` | Same `getexp` level-up machinery. | Same `GETEXP_STATE0_SHORT_CIRCUIT_MASK` gate. | **DEAD** — no-EXP Factory rentals gate. |
| `STRINGID_PKMNLEARNEDMOVE2` | `BattleScript_EffectMimic` | Move-effect entry script (Mimic). | EFFECT_MIMIC: **0/850** weighted — no Factory L50 rental carries Mimic. | **DEAD** — no carrier. |
| `STRINGID_PKMNLOSTPPGRUDGE` | `BattleScript_GrudgeTakesPP` | `tryfaintmon`'s Grudge branch, `battleScriptHitChainOpcode.ts:4377-4378` — gated on `STATUS3_GRUDGE` (set by Grudge, `battleScriptTrysetgrudgeOpcode.ts`) plus the attacker fainting from that hit. | EFFECT_GRUDGE: **2/850** weighted. | **REACHABLE** (rare, compound condition). |
| `STRINGID_PKMNMADEITRAIN` | `BattleScript_DrizzleActivates` | Switch-in Drizzle branch, `battleScriptSwitchinOpcode.ts:900-908`, fully wired. | Drizzle: **0/882** — no Factory rental carries Drizzle (Kyogre-exclusive, not a legal rental). | **DEAD** — zero carriers; wiring itself is real. |
| `STRINGID_PKMNMOVEBOUNCED` | `BattleScript_MagicCoatBounce` | Magic Coat attack-canceler handoff, `battleScriptMagicCoat.ts:520-548` (real `gProtectStructs.bounceMove` push-cursor mechanism). | EFFECT_MAGIC_COAT: **3/850** weighted. | **REACHABLE** (rare). |
| `STRINGID_PKMNMOVEISDISABLED` | `BattleScript_MoveUsedIsDisabled`, `BattleScript_SelectingDisabledMoveInPalace` | Attack-canceler `handoff` to `BattleScript_MoveUsedIsDisabled` is real and wired (`battleScriptActionAdmission.ts:2192`, same Taunt/Imprison idiom). `SelectingDisabledMoveInPalace` is the Palace-only sibling. | EFFECT_DISABLE: **5/850** weighted (Disable) sets `disabledMove`; reselecting that exact move next turn hits the canceler. | **REACHABLE** for the non-Palace label. `SelectingDisabledMoveInPalace` alone: **DEAD** (Palace facility gate). |
| `STRINGID_PKMNMOVEWASDISABLED` | `BattleScript_EffectDisable` | Move-effect entry script (Disable landing). | EFFECT_DISABLE: **5/850** weighted (Disable). | **REACHABLE.** |
| `STRINGID_PKMNPERISHCOUNTFELL` | `BattleScript_PerishSongCountGoesDown`, `BattleScript_PerishSongTakesLife` | End-of-turn Perish Song countdown tick, `battleEndTurnOrchestration.ts:2037-2084`; `STATUS3_PERISH_SONG` set by `battleScriptTrysetperishsongOpcode.ts:55-63`. | EFFECT_PERISH_SONG: **4/850** weighted. | **REACHABLE** (rare). |
| `STRINGID_PKMNPREVENTSCONFUSIONWITH` | `BattleScript_OwnTempoPrevents`, `BattleScript_TeeterDanceOwnTempoPrevents` | `jumpifability ABILITY_OWN_TEMPO` inside `EffectConfuse`/Swagger's/Flatter's confuse branch (first label) and `TeeterDanceLoop` (second label); `ABILITY_OWN_TEMPO` registered in `JUMPIFABILITY_VALUES`. | Own Tempo **16/882**; EFFECT_CONFUSE+SWAGGER+FLATTER combined **73/850** weighted; EFFECT_TEETER_DANCE **2/850** weighted. | **REACHABLE**, both labels. |
| `STRINGID_PKMNPREVENTSROMANCEWITH` | `BattleScript_ObliviousPreventsAttraction` | `Cmd_tryinfatuating`'s Oblivious branch, `battleScriptTryinfatuatingOpcode.ts:89-99`. | EFFECT_ATTRACT **45/850** weighted; Oblivious **33/882**. | **REACHABLE.** |
| `STRINGID_PKMNPREVENTSSTATLOSSWITH` | `BattleScript_AbilityNoStatLoss` | `changestatbuffs`'s Clear Body/White Smoke branch, `battleScriptStatBuffs.ts:265-271` — any non-certain multi/single-stat decrease attempt. | Clear Body **34/882** + White Smoke **2/882**; combined weighted carriers across all stat-lowering effects exceed 150/850. | **REACHABLE**, common. |
| `STRINGID_PKMNPREVENTSUSAGE` | `BattleScript_DampStopsExplosion` | `Cmd_tryexplosion`'s Damp scan, `battleScriptExplosionOpcode.ts:117-151`. | Damp **16/882**; EFFECT_EXPLOSION **25/850** weighted (Selfdestruct/Explosion). | **REACHABLE.** |
| `STRINGID_PKMNPROTECTEDBY` | `BattleScript_SturdyPreventsOHKO` | `Cmd_tryKO`'s Sturdy branch, `battleScriptTryKOOpcode.ts:117-134` (checked ahead of an unrelated Focus-Band OHKO barrier that only applies when the OHKO *target itself* holds Focus Band). | Sturdy **42/882**; EFFECT_OHKO **28/850** weighted. | **REACHABLE.** |
| `STRINGID_PKMNRAGEBUILDING` | `BattleScript_RageIsBuilding` | `executeRage` move-end handler, `battleScriptMoveEndOpcode.ts:340-374`, gated purely on target's `STATUS2_RAGE`, which has exactly one setter — inside the Rage move-effect handler itself. | `MOVE_RAGE`: **0/882** raw carriers (independently confirmed); EFFECT_RAGE absent from `level50FactoryReachableEffects`. | **DEAD** — no move can ever set `STATUS2_RAGE`. |
| `STRINGID_PKMNRAISEDSPEED` | `BattleScript_SpeedBoostActivates` | End-of-turn Speed Boost tick, `battleEndTurnOrchestration.ts:1154-1164`. | Speed Boost **3/882** (Yanma/Ninjask). | **REACHABLE** (rare). |
| `STRINGID_PKMNREADYTOHELP` | `BattleScript_EffectHelpingHand` | `Cmd_trysethelpinghand`'s `succeeds` guard requires `rules.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE` (`battleScriptTrysethelpinghandOpcode.ts:64-72`). | Factory L50 singles never sets the doubles battle-type flag, so `succeeds` is always `false` and the script always takes `BattleScript_ButItFailed` instead — `STRINGID_PKMNREADYTOHELP` can never print regardless of carrier (EFFECT_HELPING_HAND has 5/850 weighted, but that's moot). | **DEAD** — doubles-only battle-type gate, statically excluded from Factory L50 singles. |
| `STRINGID_PKMNREDUCEDPP` | `BattleScript_EffectSpite` | Move-effect entry script (Spite). | EFFECT_SPITE: **2/850** weighted (Spite). | **REACHABLE.** |
| `STRINGID_PKMNREGAINEDHEALTH` | `BattleScript_EffectRestoreHp`, `BattleScript_PresentHealTarget`, `BattleScript_WishComesTrue` | Self-heal move landing (Recover-family) directly; `PresentHealTarget` shared by Rest/Moonlight/Swallow's heal branch; `WishComesTrue` is Wish's delayed heal, wired at end-of-turn (`WISH_COMES_TRUE_LABEL`, `battleEndTurnOrchestration.ts:104`). | EFFECT_RESTORE_HP: **22/850** (Recover); EFFECT_REST **49/850**, EFFECT_MOONLIGHT **3/850**, EFFECT_SWALLOW **2/850**; EFFECT_WISH **8/850**. | **REACHABLE**, several independent carriers. |
| `STRINGID_PKMNRESTOREDHPUSING` | `BattleScript_MoveHPDrain` | Volt Absorb/Water Absorb branch, `battleScriptHitChainOpcode.ts:873-905` (template literal at `:899`), fires when a matching-type hit lands on a target below full HP. | Volt Absorb **9/882** (3 species) + Water Absorb **25/882** (9 species); Electric/Water move attacker pool is broad. | **REACHABLE.** |
| `STRINGID_PKMNSAFEGUARDEXPIRED` | `BattleScript_SafeguardEnds` | End-of-turn Safeguard duration expiry, `battleEndTurnOrchestration.ts:1854-1861` (same side-status-timer mechanism as Reflect/Light Screen). | EFFECT_SAFEGUARD: **7/850** weighted. | **REACHABLE** (rare). |
| `STRINGID_PKMNSHROUDEDITSELF` | `BattleScript_EffectMagicCoat` | Move-effect entry script (Magic Coat). | EFFECT_MAGIC_COAT: **3/850** weighted (Magic Coat). | **REACHABLE.** |
| `STRINGID_PKMNSITEMRESTOREDPP` | `BattleScript_BerryPPHealEnd2` | End-of-turn `HOLD_EFFECT_RESTORE_PP` tick, `battleEndTurnOrchestration.ts:1331-1348`, requires a zero-PP move slot. | Leppa Berry: **2/882** (Lapras/Nidoking). | **REACHABLE** (very rare). |
| `STRINGID_PKMNSKETCHEDMOVE` | `BattleScript_EffectSketch` | Move-effect entry script (Sketch). | EFFECT_SKETCH: **0/850** weighted — no Factory L50 rental carries Sketch. | **DEAD** — no carrier. |
| `STRINGID_PKMNSNATCHEDMOVE` | `BattleScript_SnatchedMove` | Snatch handoff wired at `battleScriptAttackCancelerOpcode.ts:260`, requires the target to have used Snatch this turn (EFFECT_SNATCH). | `MOVE_SNATCH`: **0/882** raw carriers (independently confirmed); EFFECT_SNATCH absent from `level50FactoryReachableEffects`. | **DEAD** — wiring is real, no carrier. |
| `STRINGID_PKMNSTOLEITEM` | `BattleScript_ItemSteal` | `MOVE_EFFECT_STEAL_ITEM` handler, `battleScriptHitChainOpcode.ts:3078-3113` (Thief/Covet; target must hold an item). | EFFECT_THIEF: **1/850** weighted (only Covet carries it at L50). | **REACHABLE** (very rare). |
| `STRINGID_PKMNSUBSTITUTEFADED` | `BattleScript_SubstituteFade` | Would fire whenever incoming damage ≥ the target's remaining Substitute HP. | `Cmd_datahpupdate`'s substitute-faints branch is an explicit registered `unsupportedBranch` barrier (`battleScriptHitChainOpcode.ts:2444-2450`, "the fade cutscene...is not modeled") sitting directly in front of this print's own precondition — EFFECT_SUBSTITUTE itself has a real carrier (**10/850** weighted) but can never reach this specific print. | **DEAD** — registered engine barrier, not a carrier gap. |
| `STRINGID_PKMNSXBLOCKSY` | `BattleScript_EffectHealBell`, `BattleScript_SoundproofProtected` | `EffectHealBell` prints when the Heal Bell caster itself has Soundproof (`B_MSG_BELL_SOUNDPROOF_ATTACKER`, singles-safe, `battleScriptHealpartystatusOpcode.ts:132-143`); `SoundproofProtected` fires for any sound move used against a Soundproof target (`battleScriptAttackCancelerOpcode.ts:394-400`). | EFFECT_HEAL_BELL **4/850** weighted, Soundproof **15/882**; `SoundproofProtected`'s carrier pool is every sound move in the corpus (broader). | **REACHABLE**, both labels. |
| `STRINGID_PKMNSXBLOCKSY2` | `BattleScript_CheckHealBellMon2Unaffected`, `BattleScript_PerishSongNotAffected` | `CheckHealBellMon2Unaffected`'s `B_MSG_BELL_SOUNDPROOF_PARTNER` bit only sets `if (partnerPresent)`, which requires `BATTLE_TYPE_DOUBLE` (`battleScriptHealpartystatusOpcode.ts:116-155`); `PerishSongNotAffected` fires via `jumpifability ABILITY_SOUNDPROOF` inside `PerishSongLoop` checking either singles battler. | `CheckHealBellMon2Unaffected`: doubles-only, structurally excluded from L50 singles. `PerishSongNotAffected`: EFFECT_PERISH_SONG **4/850** weighted + Soundproof **15/882**. | **REACHABLE overall**, via `PerishSongNotAffected` only. `CheckHealBellMon2Unaffected` alone: **DEAD** (doubles-only gate). |
| `STRINGID_PKMNSXCUREDITSYPROBLEM` | `BattleScript_AbilityCuredStatus` | `MOVEEND_IMMUNITY_ABILITIES` move-end quiet-pass scan (`battleScriptMoveEndOpcode.ts:650-709`, `resolveBattleScriptLabel(..., "BattleScript_AbilityCuredStatus")` at :687), which auto-cures any battler whose active ability is incompatible with its current status. `immunityAbilityCure()` (:133-181) covers Immunity(poison)/Own Tempo(confusion)/Limber(paralysis)/Insomnia+Vital Spirit(sleep)/Water Veil(burn)/Magma Armor(freeze)/Oblivious(infatuation). **Note this reverses ISSUES #70's own #47 finding** (`PKMNSXCUREDITSYPROBLEM` was "reference-only, dead wiring" there) — that finding is now stale; this mechanic has since been implemented. | Combined species-level ability-holder count (upper bound, same caveat as #70's own "N/882" figures): Immunity 10, Own Tempo 16, Limber 5, Insomnia 15, Vital Spirit 6, Water Veil 9, Magma Armor 5, Oblivious 33 ≈ **99/882** entries hold a qualifying ability. | **REACHABLE** — real, wired, non-trivial combined carrier pool. |
| `STRINGID_PKMNSXCUREDYPROBLEM` | `BattleScript_ShedSkinActivates` | End-of-turn Shed Skin tick, `battleEndTurnOrchestration.ts:1167-1168`. | Shed Skin **14/882** (10 species). | **REACHABLE.** |
| `STRINGID_PKMNSXINFATUATEDY` | `BattleScript_CuteCharmActivates` | Cute Charm on-contact branch, `battleScriptMoveEndOpcode.ts:562-586` (1/3 RNG proc, opposite-gender gate, not already infatuated/Oblivious). | Cute Charm **13/882** (8 species). | **REACHABLE.** |
| `STRINGID_PKMNSXINTENSIFIEDSUN` | `BattleScript_DroughtActivates` | Switch-in Drought branch, `battleScriptSwitchinOpcode.ts:920-927`, fully wired. | Drought: **0/882** — no Factory rental carries Drought (Groudon-exclusive). | **DEAD** — zero carriers; wiring itself is real. |
| `STRINGID_PKMNSXMADEITINEFFECTIVE` | `BattleScript_PrintAbilityMadeIneffective` | **Not** Teleport-exclusive despite the earlier call-graph trace: the block is reached by unlabeled fallthrough from the adjacent `BattleScript_PrintBankAbilityMadeIneffective` block (no terminator between them in the source assembly, same shape already confirmed for `IntimidateActivatesLoop`'s fallthrough), which `EffectYawn` reaches via `jumpifability ABILITY_VITAL_SPIRIT`/`ABILITY_INSOMNIA` (real-source `battle_scripts_1.s:2455-2456`). The `EffectTeleport` jump is a second, independent (but carrier-dead) path. | EFFECT_YAWN **10/850** weighted; Insomnia **15/882** + Vital Spirit **6/882**. (EFFECT_TELEPORT alone is 0/850 and would be DEAD.) | **REACHABLE** — via Yawn used against an Insomnia/Vital Spirit holder, not via Teleport. |
| `STRINGID_PKMNSXMADEYUSELESS` | `BattleScript_MonMadeMoveUseless` | Volt Absorb/Water Absorb branch **at full HP** (`battleScriptHitChainOpcode.ts:883-899`, template literal at `:898`). | Same Volt Absorb **9/882** / Water Absorb **25/882** carriers as `PKMNRESTOREDHPUSING`. | **REACHABLE.** |
| `STRINGID_PKMNSXPREVENTSFLINCHING` | `BattleScript_FlinchPrevention` | Only the "certain" flinch case reaches this print: `applyFlinchMoveEffect`'s Inner Focus branch, `battleScriptHitChainOpcode.ts:3590-3608`, gated on `MOVE_EFFECT_CERTAIN` — real source shows only Fake Out sets `MOVE_EFFECT_FLINCH\|MOVE_EFFECT_CERTAIN` (`battle_scripts_1.s:2051`); Shield Dust's flinch block is a separate, silent path with no print. | EFFECT_FAKE_OUT **15/850** weighted; Inner Focus **34/882**. | **REACHABLE** — via Inner Focus + Fake Out only. |
| `STRINGID_PKMNSXPREVENTSYLOSS` | `BattleScript_AbilityNoSpecificStatLoss` | Same function, Keen Eye(accuracy)/Hyper Cutter(attack) single-stat branch, `battleScriptStatBuffs.ts:272-277`. | Keen Eye **29/882** + EFFECT_ACCURACY_DOWN **25/850** weighted; Hyper Cutter **12/882** + EFFECT_ATTACK_DOWN_2 **8/850** weighted. | **REACHABLE.** |
| `STRINGID_PKMNSXRESTOREDHPALITTLE2` | `BattleScript_RainDishActivates` | End-of-turn Rain Dish tick, `battleEndTurnOrchestration.ts:1140-1151`, requires active rain. | Rain Dish **6/882** (3 species); rain-setting moves (e.g. Rain Dance) are common carriers even though Drizzle itself is 0. | **REACHABLE.** |
| `STRINGID_PKMNSXTOOKATTACK` | `BattleScript_TookAttack` | Lightning Rod/Storm Drain redirect-and-announce; the `lightningRodRedirected` check (`battleScriptAttackCancelerOpcode.ts:273-280`) is only ever set inside `resolveDynamicMoveTarget`'s random-target flank-flip, which requires a *different* valid opposing battler to redirect from. | Doubly dead: (a) mathematically impossible with `battlersCount=2` in singles — the sole opponent is already the only possible target, so there's nothing to redirect from; (b) even if reached, the handoff itself is an explicit registered `unsupportedBranch` ("RecordAbilityBattle and BattleScript_TookAttack handoff are unimplemented", `battleScriptAttackCancelerOpcode.ts:277`). | **DEAD** — both a singles-structural gate and an unimplemented-handoff barrier. |
| `STRINGID_PKMNSXWHIPPEDUPSANDSTORM` | `BattleScript_SandstreamActivates` | Switch-in Sand Stream branch, `battleScriptSwitchinOpcode.ts:910-917`. | Sand Stream: **10/882**, Tyranitar only. | **REACHABLE.** |
| `STRINGID_PKMNSXWOREOFF` | `BattleScript_SideStatusWoreOff` | Reflect/Light Screen/Safeguard side-status duration expiring; wired at end-of-turn (`SIDE_STATUS_WORE_OFF_LABEL`, `battleEndTurnOrchestration.ts:269`). | Combined side-status carriers (from #70's own table): Reflect 16/850 + Light Screen 23/850 + Safeguard 7/850 = **46/850** weighted. | **REACHABLE**, common (any of these expiring naturally after their duration). |
| `STRINGID_PKMNTOOKAIM` | `BattleScript_EffectLockOn` | Move-effect entry script for EFFECT_LOCK_ON (Lock-On/Mind Reader). | `MOVE_LOCK_ON` and `MOVE_MIND_READER`: **0/882** raw carriers each (independently confirmed). | **DEAD** — no carrier for either triggering move. |
| `STRINGID_PKMNTOOKATTACK` | `BattleScript_MonTookFutureAttack` | Future Sight/Doom Desire's delayed hit landing 2 turns later; wired at end-of-turn (`MON_TOOK_FUTURE_ATTACK_LABEL`, `battleEndTurnOrchestration.ts:106`). | EFFECT_FUTURE_SIGHT: **5/850** weighted (Future Sight). Doom Desire is Jirachi-exclusive, 0/850 (per #70), not needed. | **REACHABLE** via Future Sight alone. |
| `STRINGID_PKMNTOOKFOE` | `BattleScript_DestinyBondTakesLife` | `tryfaintmon`'s Destiny Bond branch, `battleScriptHitChainOpcode.ts:4289-4313`, gated on `HITMARKER_DESTINYBOND`. | EFFECT_DESTINY_BOND: **10/850** weighted. | **REACHABLE.** |
| `STRINGID_PKMNTRACED` | `BattleScript_TraceActivates` | Battle-start Trace entry-hook loop, `factoryBattleStart.ts:483-506` (real; requires the opponent's active ability to be nonzero and alive). | Trace **16/882** (5 species: Ralts/Kirlia/Gardevoir/Porygon/Porygon2). | **REACHABLE.** |
| `STRINGID_PKMNUSEDSAFEGUARD` | `BattleScript_SafeguardProtected`, `BattleScript_TeeterDanceSafeguardProtected` | `jumpifsideaffecting SIDE_STATUS_SAFEGUARD` wired into 9 status-move scripts (Sleep/Toxic/Confuse/Poison/Paralyze/Swagger/Flatter/Will-O-Wisp/Yawn) for the first label, and into `TeeterDanceLoop` for the second; opcode confirmed wired (`battleScriptRulesContext.ts:44,268`). | EFFECT_SAFEGUARD **7/850** weighted sets the flag; EFFECT_TEETER_DANCE **2/850** weighted for the Teeter Dance variant. | **REACHABLE**, both labels (rare). |
| `STRINGID_PKMNWASDEFROSTED` | `BattleScript_DefrostedViaFireMove` | `executeDefrost`, `battleScriptMoveEndControllers.ts:133-168` — any special Fire-type hit landing on a frozen target. | EFFECT_FREEZE_HIT **109/850** weighted — freeze application is common (Ice Beam/Blizzard/etc.), so thaw-on-Fire-hit is a routine follow-up interaction. | **REACHABLE**, common. |
| `STRINGID_PKMNWASDRAGGEDOUT` | `BattleScript_TrainerBattleForceOut` | `TrainerBattleForceOut`'s unconditional printstring (`:3339`), reached from `SuccessForceOut`'s `jumpifbattletype BATTLE_TYPE_TRAINER` (`:3330`, always taken — Factory is always a trainer battle) after Roar/Whirlwind's `forcerandomswitch` succeeds. | `Cmd_forcerandomswitch` is registered source-complete for exactly the trainer-battle branch (`battleScriptForceSwitchOpcode.ts:1-46`); EFFECT_ROAR confirmed executable (`docs/executable-frontier-census.md:58`); Whirlwind 4 + Roar 36 = **40/850** weighted Factory-L50 carriers. | **REACHABLE.** |
| `STRINGID_PKMNWASMADEDROWSY` | `BattleScript_EffectYawn` | Move-effect entry script (Yawn). | EFFECT_YAWN: **10/850** weighted (Yawn). | **REACHABLE.** |
| `STRINGID_PKMNWASNTAFFECTED` | `BattleScript_WasntAffected` | Dream Eater used against a target that is *not* asleep (`BattleScript_EffectDreamEater`'s own `jumpifstatus`-negative branch). | Same EFFECT_DREAM_EATER **6/850** weighted carrier pool as `STRINGID_PKMNDREAMEATEN`. | **REACHABLE.** |
| `STRINGID_PKMNWISHCAMETRUE` | `BattleScript_WishButFullHp`, `BattleScript_WishComesTrue` | Wish's delayed heal resolving one turn after cast; wired at end-of-turn (`WISH_COMES_TRUE_LABEL`, `battleEndTurnOrchestration.ts:104`). | EFFECT_WISH: **8/850** weighted (Wish). | **REACHABLE.** |
| `STRINGID_PLAYERDEFEATEDTRAINER1` | `BattleScript_FrontierTrainerBattleWon`, `BattleScript_LocalTrainerBattleWon` | Unconditional first line of `FrontierTrainerBattleWon` (real source `battle_scripts_1.s:3027-3030`), which source always enters on a Factory win (Frontier branch always wins over the Local branch, `battle_main.c:4972-4986`). | Settled 2026-08-03 (see appendix). This engine's `finalizeOrchestration` (`factoryBattleScriptTerminalDecision.ts:612-621`) returns a coarse `{kind:"terminal",outcome:"player-win"}` the instant `battleOutcome` is decided, and `factoryRoundBattleOrchestrator.ts`'s `finishBattle` hands that outcome straight to `resolveRoundBattle` (the round/lobby controller) — **nothing anywhere resumes the interpreter at this label** (zero refs in `src/` outside `gen/`); real firing is independently corroborated by `battleScene.ts:17389-17390`'s oracle-pinned "Player defeated"+trainer literal. | **DEAD today** — accidental, currently-unclaimed gap, not an S8 seam (S8 scoped only the post-battle *lobby* UI, ROADMAP.md:511-514). Flips REACHABLE once a battle-scene post-battle-text continuation resumes the interpreter at this label from the terminal boundary; natural home is S10 (open, "complete Level-50 singles engine") though no roadmap line names it yet. |
| `STRINGID_PLAYERGOTMONEY` | `BattleScript_LocalBattleWonReward` | Reached only via `BattleScript_LocalTrainerBattleWon` (`battle_scripts_1.s:2921-2923,2930,2936-2938`). | `LocalTrainerBattleWon` is entered only by source's non-Frontier `else if` arm (`battle_main.c:4983-4986`); Factory always sets `BATTLE_TYPE_FRONTIER` so the earlier Frontier arm always wins, and `FrontierTrainerBattleWon`'s own flow never gotos `LocalBattleWonReward` — Frontier facilities structurally never pay this cash reward. | **DEAD** — non-Frontier-only reward path. |
| `STRINGID_PLAYERPICKEDUPMONEY` | `BattleScript_PrintPayDayMoneyString` | Pay Day move landing (EFFECT_PAY_DAY). | `MOVE_PAY_DAY` has 0 matches across `battle-frontier-mons.json`'s 882 rental entries, and `EFFECT_PAY_DAY` is absent from `battle-script-topology.json`'s 166-entry `level50FactoryReachableEffects` — no Factory-L50-legal carrier exists at all. | **DEAD** — no carrier. |
| `STRINGID_PLAYERWHITEOUT` | `BattleScript_LocalBattleLostPrintWhiteOut` | Reached only via `LocalBattleLost`'s fallthrough when none of DOME/FRONTIER/TRAINER_HILL/EREADER_TRAINER/SECRET_BASE match (`:2945-2950`). | `:2947`'s `jumpifbattletype BATTLE_TYPE_FRONTIER, BattleScript_LocalBattleLostPrintTrainersWinText` is always taken for Factory, permanently skipping WhiteOut; real source has no separate Frontier-loss whiteout script. | **DEAD** — Frontier-vs-local battle-type gate. |
| `STRINGID_PLAYERWHITEOUT2` | `BattleScript_LocalBattleLostPrintWhiteOut` | Same label, second string. | Same gate as `STRINGID_PLAYERWHITEOUT`. | **DEAD** — same gate. |
| `STRINGID_PREVENTEDFROMWORKING` | `BattleScript_IntimidatePrevented` | `IntimidateActivatesLoop`'s own `jumpifability ABILITY_CLEAR_BODY/HYPER_CUTTER/WHITE_SMOKE, ..., BattleScript_IntimidatePrevented` — a real reference that lives only in the script-data JSON, not TS source, which is why the initial TS-only grep found nothing (the same fallthrough/data-only blind spot documented for `PKMNSXMADEITINEFFECTIVE`). | Clear Body **34/882** + Hyper Cutter **12/882** + White Smoke **2/882**; Intimidate **38/882** supplies the trigger. | **REACHABLE** — the earlier "zero references" read was a false negative from a TS-source-only grep. |
| `STRINGID_STATSWONTDECREASE2` | `BattleScript_CantLowerMultipleStats` | `BattleScript_EffectTickle:2656-2657`: reached only when target's Attack stage is already at minimum **and** Defense stage is already at minimum (both `MIN_STAT_STAGE`). | EFFECT_TICKLE: **3/850** weighted (Tickle). Compound but reachable condition after repeated stat-lowering across a battle/multiple turns. | **REACHABLE** (compound condition, concrete carrier). |
| `STRINGID_STOPLEARNINGMOVE` | `BattleScript_AskToLearnMove` | Same `getexp` level-up machinery. | Same `GETEXP_STATE0_SHORT_CIRCUIT_MASK` gate. | **DEAD** — no-EXP Factory rentals gate. |
| `STRINGID_TARGETCANTESCAPENOW` | `BattleScript_EffectMeanLook` | Move-effect entry script (Mean Look/Spider Web/Block family — all share this script per the census's own label mapping). | EFFECT_MEAN_LOOK: **6/850** weighted (Spider Web 1, Mean Look 3, Block 2). | **REACHABLE.** |
| `STRINGID_TIEDOPPONENTBYREFEREE` | `BattleScript_ArenaJudgmentDraw` | Reached only by a `jumpifbyte` inside `ArenaDoJudgment` (program line 4500). | Same gate. | **DEAD** — Battle Arena facility gate. |
| `STRINGID_TRAINER1LOSETEXT` | `BattleScript_FrontierTrainerBattleWon_LoseTexts`, `BattleScript_LocalBattleWonLoseTexts`, `BattleScript_TowerLinkBattleWon` | `FrontierTrainerBattleWon_LoseTexts`'s unconditional printstring (`:3034-3037`), always reached right after `PLAYERDEFEATEDTRAINER1` on a real Factory win. Text is per-trainer: `{B_TRAINER1_LOSE_TEXT}` resolves via `CopyFrontierTrainerText(FRONTIER_PLAYER_WON_TEXT, gTrainerBattleOpponent_A)` (`battle_message.c:2600-2614`) — the defeated Factory trainer's own generated "I lost" quote. | Settled 2026-08-03 (see appendix). Same engine terminal-boundary gate as `PLAYERDEFEATEDTRAINER1` — zero live path today despite a certain real-game trigger. `LocalBattleWonLoseTexts`/`TowerLinkBattleWon` siblings are non-Frontier/link-only, independently dead. | **DEAD today** — same accidental gap and same S10 flip condition as `PLAYERDEFEATEDTRAINER1`. |
| `STRINGID_TRAINER1WINTEXT` | `BattleScript_FrontierLinkBattleLost`, `BattleScript_LocalBattleLostPrintTrainersWinText` | `LocalBattleLostPrintTrainersWinText`'s unconditional printstring (`:2960-2968`), reached via `LocalBattleLost`'s `jumpifbattletype BATTLE_TYPE_FRONTIER` branch (`:2947`, always taken for Factory) — genuinely the real Factory-loss path despite the "Local" name; source sets this label via `HandleEndTurn_BattleLost` (`battle_main.c:5046-5049`). Text is per-trainer: `{B_TRAINER1_WIN_TEXT}` resolves via `CopyFrontierTrainerText(FRONTIER_PLAYER_LOST_TEXT, gTrainerBattleOpponent_A)` (`battle_message.c:2616-2621`) — the winning Factory trainer's own generated "I won" quote. | Settled 2026-08-03 (see appendix). Same engine terminal-boundary gate (interpreter never resumed after `battleOutcome`→LOST). `FrontierLinkBattleLost` is link-only, independently dead (out of scope). | **DEAD today** — same accidental gap and same S10 flip condition as `PLAYERDEFEATEDTRAINER1`. |
| `STRINGID_TRAINER2LOSETEXT` | `BattleScript_FrontierTrainerBattleWon_LoseTexts`, `BattleScript_LocalBattleWonLoseTexts`, `BattleScript_TowerLinkBattleWon` | Would need `FrontierTrainerBattleWon_LoseTexts`'s `jumpifnotbattletype BATTLE_TYPE_TWO_OPPONENTS, BattleScript_TryPickUpItems` (`:3038`) to not jump. | Factory is always single-trainer format and never sets `BATTLE_TYPE_TWO_OPPONENTS`, so this jump is always taken, permanently skipping the id's own printstring; `LocalBattleWonLoseTexts`'s identical gate is moot since that label is itself unreachable (see `PLAYERGOTMONEY`); `TowerLinkBattleWon` is Tower+link only. | **DEAD** — two-opponents (Multi Battle) gate, Factory is always single-trainer. |
| `STRINGID_TRAINER2WINTEXT` | `BattleScript_FrontierLinkBattleLost`, `BattleScript_LocalBattleLostDoTrainer2WinText` | `LocalBattleLostDoTrainer2WinText` requires `BATTLE_TYPE_TWO_OPPONENTS` (`:2970-2971`). | Factory's single-trainer format never sets `TWO_OPPONENTS`; `FrontierLinkBattleLost` requires link (out of scope). | **DEAD** — two-opponents gate + link-only sibling. |
| `STRINGID_TRYTOLEARNMOVE1` | `BattleScript_AskToLearnMove` | Same `getexp` level-up machinery. | Same `GETEXP_STATE0_SHORT_CIRCUIT_MASK` gate. | **DEAD** — no-EXP Factory rentals gate. |
| `STRINGID_TRYTOLEARNMOVE2` | `BattleScript_AskToLearnMove` | Same `getexp` level-up machinery. | Same `GETEXP_STATE0_SHORT_CIRCUIT_MASK` gate. | **DEAD** — no-EXP Factory rentals gate. |
| `STRINGID_TRYTOLEARNMOVE3` | `BattleScript_AskToLearnMove` | Same `getexp` level-up machinery. | Same `GETEXP_STATE0_SHORT_CIRCUIT_MASK` gate. | **DEAD** — no-EXP Factory rentals gate. |
| `STRINGID_TWOENEMIESDEFEATED` | `BattleScript_FrontierTrainerBattleWon_TwoDefeated`, `BattleScript_LocalTwoTrainersDefeated` | `FrontierTrainerBattleWon_TwoDefeated`'s `jumpifbattletype BATTLE_TYPE_TWO_OPPONENTS` gate (`:3029`). | Never taken for Factory's single-trainer format; `LocalTwoTrainersDefeated` additionally requires the already-dead `LocalTrainerBattleWon` path. | **DEAD** — two-opponents (Multi Battle) gate. |
| `STRINGID_WILDPKMNFLED` | `BattleScript_WildMonFled` | Wild-battle-only "the wild Pokémon fled" print (matches the census's own generic-fallback note that wild-only ids are out of scope). | Factory Frontier rounds are exclusively trainer battles against the Battle Factory AI's trainers — there is no wild-encounter code path in this run's scope at all. | **DEAD** — wild-battle-only gate, structurally absent from the Factory facility. |

## 2026-08-03 MANUAL settlement (side lane)

Settles the 4 ids the initial triage pass left `MANUAL`. Investigation only —
no `messageLines`/engine changes were made, per this step's brief. Updated
partition: **66 REACHABLE / 41 DEAD / 0 MANUAL** (was 66/37/4).

### Case 1 — `STRINGID_PKMNCANTUSEMOVESEALED`: DEAD, root cause was an incomplete carrier test, not a generator bug

**The naive per-id check.** The original triage row validated Imprison's sole
Factory carrier (`FRONTIER_MON_RALTS`, raw catalog index 5 in
`battle-frontier-mons.json`) against only the upper bound of L50 legality,
`FRONTIER_MONS_HIGH_TIER = 849` (`battle_frontier_mons.h:862`) — index 5 is
comfortably below 849, so the row called this "well inside the 0-849 L50
boundary" and treated `battle-script-topology.json`'s silence on
`EFFECT_IMPRISON` as a contradiction needing a battle-lab trace to resolve.

**The real gate has a lower bound too, and it's not 0.** Source draws every
Factory L50 mon — opponent (`GenerateOpponentMons`, `battle_factory.c:334`),
the player's initial rental offer (`GenerateInitialRentalMons`, `:558`/`:560`),
and the Frontier Brain's own party (`FillFactoryBrainParty`, `:779`) — through
one shared helper, `GetFactoryMonId(lvlMode, challengeNum, useBetterRange)`
(`:829-862`), which indexes into `sInitialRentalMonRanges` (`:169-186`). For
`FRONTIER_LVL_50` this table has 8 rows, one per challenge-progress tier
(`challengeNum = winStreak / FRONTIER_STAGES_PER_CHALLENGE`, `:826`):

```
{FRONTIER_MON_GRIMER,     FRONTIER_MON_FURRET_1},   // 110 - 199  (challengeNum 0)
{FRONTIER_MON_DELCATTY_1, FRONTIER_MON_CLOYSTER_1}, // 162 - 266  (challengeNum 1)
{FRONTIER_MON_DELCATTY_2, FRONTIER_MON_CLOYSTER_2}, // 267 - 371  (challengeNum 2)
{FRONTIER_MON_DUGTRIO_1,  FRONTIER_MON_SLAKING_1},  // 372 - 467  (challengeNum 3)
{FRONTIER_MON_DUGTRIO_2,  FRONTIER_MON_SLAKING_2},  // 468 - 563  (challengeNum 4)
{FRONTIER_MON_DUGTRIO_3,  FRONTIER_MON_SLAKING_3},  // 564 - 659  (challengeNum 5)
{FRONTIER_MON_DUGTRIO_4,  FRONTIER_MON_SLAKING_4},  // 660 - 755  (challengeNum 6)
{FRONTIER_MON_DUGTRIO_1,  FRONTIER_MONS_HIGH_TIER}, // 372 - 849  (challengeNum ≥7)
```

`FRONTIER_MON_GRIMER = 110` (`battle_frontier_mons.h:114`) is the lowest start
value in the entire table — **every** L50 challenge tier, from the very first
challenge set of a save (`challengeNum 0`, range 110-199) through the
asymptotic late-game tier (`challengeNum ≥7`, range 372-849), excludes raw
indices below 110. `FRONTIER_MON_RALTS = 5` (`battle_frontier_mons.h:9`) is
below that floor at every challenge number — RALTS is never drafted into a
real Factory L50 singles run, full stop. "index ≤ 849" is necessary but not
sufficient for L50 legality; the real predicate is "110 ≤ index ≤ 849" (with
the upper end also table-driven, not fixed, though it happens to top out at
849 for every L50 row).

**Which artifact was right.** `battle-frontier-mons.json` is a faithful raw
port of `gBattleFrontierMons[]` (882 rows, index 0-881) and is not wrong about
its own contents — RALTS really is row 5 and really does carry
`MOVE_IMPRISON`. It simply isn't tier-aware; it was never meant to answer
"is this legal at L50" by itself. `battle-script-topology.json`'s
`level50FactoryReachableEffects` is built from
`factory-animation-inventory.json`'s `tiers.level50` (`monIndices: {first:
110, last: 849, count: 740}`, `tools/extract/extract-factory-animation-
inventory.ts:122,173`), which is itself built from `factory-round-policy.json`'s
`rentalSelection.ranges.level50` — a direct extraction of
`sInitialRentalMonRanges` above (**not** `factory-ai-policy.json`, as the
original triage row cited; that file exists but has no `rentalSelection` key
at all — a stale citation, corrected here). `factory-round-policy.json`'s 8
L50 rows reproduce the source table exactly (`start` values 110, 162, 267,
372, 468, 564, 660, 372; `end` values 199, 266, 371, 467, 563, 659, 755, 849).
So the topology artifact was correct throughout; the earlier per-id analysis
compared the wrong pair of bounds. **No generator bug — nothing needs
filing.** The methodological lesson (checking only "≤ 849" without also
checking "≥ 110") is the actual root cause, and is worth flagging for anyone
auditing carrier evidence by hand against the raw catalog instead of through
`level50FactoryReachableEffects`/`factory-animation-inventory.json`.

**Spot-check: does the corrected method reproduce batch 1's already-landed
carriers?** Pulling the same 6 effect families straight from
`battle-script-topology.json`'s `level50FactoryReachableEffects` reproduces
every landed figure exactly:

| Effect | topology JSON weighted count | Doc's cited evidence (batch 1 landed ids) |
| --- | --- | --- |
| `EFFECT_SLEEP` | 39 (Sing 8, Sleep Powder 9, Hypnosis 9, Lovely Kiss 4, Spore 4, Grass Whistle 5) | `STRINGID_PKMNALREADYASLEEP`: "39/850 weighted" ✓ |
| `EFFECT_CONFUSE` | 48 (Supersonic 3, Confuse Ray 43, Sweet Kiss 2) | `STRINGID_PKMNALREADYCONFUSED`: "48/850 weighted" ✓ |
| `EFFECT_WILL_O_WISP` | 10 | `STRINGID_PKMNALREADYHASBURN`: "10/850 weighted" ✓ |
| `EFFECT_TOXIC` | 26 | `STRINGID_PKMNALREADYPOISONED`: "26/850 weighted" ✓ |
| `EFFECT_PARALYZE` | 64 (Stun Spore 7, Thunder Wave 53, Glare 4) | `STRINGID_PKMNISALREADYPARALYZED`: "64/850 weighted" ✓ |
| `EFFECT_ATTRACT` | 45 | `STRINGID_PKMNFELLINLOVE`: "45/850 weighted" ✓ |

All 6 reproduce exactly (6/6, more than the requested 2-3). As an extra
caution check (not a full re-audit — out of this step's scope), the one other
row in the doc that explicitly cites a raw catalog index against the naive
"0-849" phrasing — `STRINGID_PKMNLAIDCURSE`'s Dusclops carrier — was
independently re-derived from `battle-frontier-mons.json`: `SPECIES_DUSCLOPS`
+ `MOVE_CURSE` is `FRONTIER_MON_DUSCLOPS_4`, raw index **666**, comfortably
above the real 110 floor either way, so that REACHABLE verdict is unaffected.
RALTS (index 5) is the only currently-cited carrier found sitting in the
0-109 dead zone; no other landed verdict in this doc was checked exhaustively
against the floor, so a future audit pass should prefer
`level50FactoryReachableEffects`/`factory-animation-inventory.json` over
hand-checking raw indices against 849 alone.

### Cases 2-4 — the terminal-boundary trio: DEAD today, accidental unclaimed gap (not an S8 seam)

**(a) Real ROM script path, traced statically through `battle_main.c` +
`data/battle_scripts_1.s`** (no mechanicLab battle-to-completion scenario was
available/needed — the C-level dispatch is unconditional on `gBattleOutcome`
and unambiguous from source alone):

- **Ordinary Factory win:** `Cmd_checkteamslost` sets `gBattleOutcome |=
  B_OUTCOME_WON` (`battle_script_commands.c:3534-3577`) inside
  `BattleScript_HandleFaintedMon`; script execution then returns to the C
  battle-main loop, which dispatches `HandleEndTurn_BattleWon`
  (`battle_main.c:4960-5016`, table at `:557`). For a non-link Factory battle
  (`BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER`), it sets
  `gBattlescriptCurrInstr = BattleScript_FrontierTrainerBattleWon`
  (`:4972-4981`) and re-enters the interpreter. At that label
  (`battle_scripts_1.s:3027-3030`): not-two-opponents falls through to
  `printstring STRINGID_PLAYERDEFEATEDTRAINER1` ("Player defeated\n{B_TRAINER1_CLASS}
  {B_TRAINER1_NAME}!", trainer class/name resolved from
  `gTrainerBattleOpponent_A`), then unconditionally `goto
  BattleScript_FrontierTrainerBattleWon_LoseTexts` (`:3034-3037`): `trainerslidein`,
  `waitstate`, `printstring STRINGID_TRAINER1LOSETEXT` (`{B_TRAINER1_LOSE_TEXT}`,
  resolved via `CopyFrontierTrainerText(FRONTIER_PLAYER_WON_TEXT,
  gTrainerBattleOpponent_A)`, `battle_message.c:2600-2614` — the defeated
  trainer's own generated "I lost" flavor quote). Both fire, back to back, on
  **every** ordinary Factory win, no gate in between.
- **Ordinary Factory loss:** `HandleEndTurn_BattleLost`
  (`battle_main.c:5018-5052`) sets `gBattlescriptCurrInstr =
  BattleScript_LocalBattleLost` for a non-link loss (`:5046-5049`). At that
  label (`battle_scripts_1.s:2945-2950`), `jumpifbattletype
  BATTLE_TYPE_FRONTIER` (`:2947`) is always taken for Factory, landing on
  `BattleScript_LocalBattleLostPrintTrainersWinText` (`:2960-2968`):
  `jumpifnotbattletype BATTLE_TYPE_TRAINER` does not jump (Factory is always a
  trainer battle), so it falls through `returnopponentmon1toball` /
  `returnopponentmon2toball` / `trainerslidein` to `printstring
  STRINGID_TRAINER1WINTEXT` (`{B_TRAINER1_WIN_TEXT}`, resolved via
  `CopyFrontierTrainerText(FRONTIER_PLAYER_LOST_TEXT, gTrainerBattleOpponent_A)`,
  `battle_message.c:2616-2621` — the winning trainer's own generated "I won"
  quote). This fires on **every** ordinary Factory loss (the following
  two-opponents-only `STRINGID_TRAINER2WINTEXT` branch is correctly DEAD, per
  the existing table row).

So the real firing order is: WIN → `PLAYERDEFEATEDTRAINER1` then
`TRAINER1LOSETEXT` (same tick); LOSS → `TRAINER1WINTEXT` alone. All three are
certain, unconditional, every-battle triggers in the real game — the highest
possible incidence of any id in this census.

**(b) What stops in this engine, and whether it's deliberate.** Two separate
things are true at once, which is why "deliberate S8 seam" and "accidental
gap" are both half-right:

- The **kernel stopping at a coarse terminal boundary is deliberate**, by
  design, and predates S8: the 2026-07-24 Gate-3 architecture decision
  (ROADMAP.md, "Testability architecture decision") defines the
  `BattleDecisionBoundary` contract as "submitting one currently requested
  player or trainer decision returns the next state, ordered semantic events,
  and either the next decision request **or a terminal outcome**." This
  engine's `finalizeOrchestration` (`factoryBattleScriptTerminalDecision.ts:612-621`)
  implements exactly that contract: the instant `battleOutcome` resolves, it
  returns `{kind:"terminal", outcome}` and does not keep interpreting. That
  stop is intentional kernel-layer scoping, not a bug.
- But **nothing downstream ever resumes the interpreter at these labels for
  their own sake**, and that part is unclaimed. `factoryRoundBattleOrchestrator.ts`'s
  `finishBattle` (`:750-788`) takes the terminal boundary and calls
  `resolveRoundBattle` directly — the ROUND controller's post-battle screens
  (swap offer, BP award, congratulations, loss-ending lobby) — with no
  intervening step anywhere that renders the battle-scene "trainer slides in,
  delivers a line" sequence the real ROM always shows first. Grep confirms
  zero references to any of `BattleScript_FrontierTrainerBattleWon`,
  `BattleScript_LocalBattleLost`, or their 3 printstring ids anywhere in
  `src/**` outside `src/data/gen/`. S8 (`ROADMAP.md:511-514`, marked `[x]`
  complete) is explicit about its own scope: "Victory flow, the swap offer +
  factory swap screen, chaining into battles 2-7, round completion and loss
  endings" — every S8 completion-gate item concretely named in the roadmap
  (swap-YES screen, seventh-win `MSGBOX_GETPOINTS` fanfare, the loss-ending
  circular-lobby map/NPC renderer, the record-question menu) is *lobby-level*
  UI reached only *after* the battle scene itself would have faded out — a
  strictly later screen than the one these 3 ids belong to. S8 never claims
  the in-battle-scene end-of-battle text as part of its own remainder, so
  calling this an "S8 seam" would be inaccurate.
- No other roadmap item names this gap either (searched for "terminal
  boundary", the two `BattleScript_*` label names, "post-battle", "victory
  text" — the only two "terminal boundary" hits are the Gate-3 decision itself
  and an unrelated Tier-1 headless-runner note). S10 (`ROADMAP.md:910`, open,
  "complete Level-50 singles engine") is the only stage whose mandate would
  naturally absorb it, but it isn't itemized under Gate 5 or Gate 6 today.

**(c) Verdict.** All three: **DEAD today** — a real, accidental, currently
unclaimed gap (not a deliberately parked S8 remainder). Flips to REACHABLE
the moment a battle-scene post-battle-text continuation is built that resumes
script execution from the terminal boundary through
`BattleScript_FrontierTrainerBattleWon` (win) / `BattleScript_LocalBattleLost`
(loss) far enough to execute their `printstring` opcodes — that continuation
has no named roadmap line yet and should get one under S10 rather than being
folded into S8, which is already closed and scoped to the lobby screens that
come after.
