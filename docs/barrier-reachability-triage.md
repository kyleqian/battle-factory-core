# Barrier reachability triage — every `unsupportedBranch` call site in `src/engine/`

Author: side-lane worker 2026-08-07. Read-only step: this document classifies all
50 `unsupported-branch` barrier call sites in `src/engine/` by whether a legal
Level-50 **singles** battle can actually hit them, under the ROADMAP S10
2026-08-05 widened scope (all legal Gen-3 species/moves/abilities/items in
singles; doubles / Battle Arena / link / multi / Frontier-Brain battle contexts
remain out of scope). No production code was changed.

## Reconciliation with `PINNED_BARRIER_COUNTS`

Method: `grep -rn "unsupportedBranch(" src/engine/*.ts` for helper-call sites,
plus the `{ kind: "unsupported-branch", ... }` result-literal constructions in
the two `factoryAi*` modules that never call a helper
(`barrierCallSitesIn` in `tests/executableFrontierRatchet.test.ts` counts those
too). Total found: **50** — 48 helper-call sites + 2 literal constructions.
This reconciles exactly with the sum of `PINNED_BARRIER_COUNTS` (see the
per-module table below). The pinned count for
`battleScriptHitChainOpcode.ts` is 11; at the time of writing the two
just-edited files it was 11, matching.

| Module | Pin | Found | Classified (A/B/C/D) |
| --- | --- | --- | --- |
| battleScriptHitChainOpcode.ts | 11 | 11 | 1B, 1A, 9D |
| battleScriptAttackCancelerOpcode.ts | 2 | 2 | 2A |
| battleScriptCheckteamslostOpcode.ts | 3 | 3 | 3C |
| battleScriptDamagingWeatherOpcode.ts | 4 | 4 | 4D |
| battleScriptForceSwitchOpcode.ts | 1 | 1 | 1C |
| battleScriptGetexpOpcode.ts | 2 | 2 | 1A, 1C |
| battleScriptIngrainLeechSeedWrapOpcode.ts | 3 | 3 | 1A, 2D |
| battleScriptJumpifbyteOpcode.ts | 1 | 1 | 1C |
| battleScriptJumpifcantswitchOpcode.ts | 1 | 1 | 1C |
| battleScriptJumpifhalfwordOpcode.ts | 1 | 1 | 1C |
| battleScriptJumpifwordOpcode.ts | 1 | 1 | 1C |
| battleScriptMoveEndOpcode.ts | 1 | 1 | 1C |
| battleScriptOpenPartyScreenOpcode.ts | 1 | 1 | 1C |
| battleScriptProtectlikeOpcode.ts | 1 | 1 | 1A |
| battleScriptRemoveitemOpcode.ts | 1 | 1 | 1D |
| battleScriptSemiInvulnerableOpcode.ts | 1 | 1 | 1D |
| battleScriptStatbuffchangeOpcode.ts | 3 | 3 | 1A, 2D |
| battleScriptStatusPrimaryOpcode.ts | 3 | 3 | 3D |
| battleScriptSwitchinOpcode.ts | 4 | 4 | 1A, 3C |
| battleScriptTargetIterationOpcode.ts | 1 | 1 | 1C |
| battleScriptTryKOOpcode.ts | 1 | 1 | 1A |
| battleScriptTryCastformDataChangeOpcode.ts | 0 | 0 | — |
| factoryBattleScriptFullTurnDecision.ts | 1 | 1 | 1A |
| factoryAiCheckBadMove.ts | 1 | 1 | 1A |
| factoryAiCheckViability.ts | 1 | 1 | 1A |
| **Total** | **50** | **50** | 12A, 1B, 15C, 22D |

BUCKETS: **(A)** reachable in a legal Level-50 singles battle today (highest
priority). **(B)** reachable only under the widened 2026-08-05 scope (needs a
legal Gen-3 species/move/ability/item no Factory rental set carries).
**(C)** provably unreachable in Factory singles — doubles/link/arena/multi
contexts, or a source branch no committed Factory script path can reach, with
citation. **(D)** malformed/future-input guard — no committed script carries the
offending operand shape.

Several `(C)`/`(D)` verdicts contradict a stale pin *narrative* (the pin
comments describe an earlier registration state). Each is re-verified against
the **current** source of the module; the count is unchanged either way, which is
why the pins still hold.

---

## Bucket (A) — reachable in a legal Level-50 singles battle

### A1. `factoryAiCheckBadMove.ts:1321` — AI `AI_CheckBadMove_CheckEffect` if_effect table dispatch
- **Reason string / citation:** `"AI_CheckBadMove_CheckEffect: source-complete if_effect table lookup"`; `data/battle_ai_scripts.s` (the `if_effect` dispatch in `AI_CheckBadMove`).
- **What really requires it:** every effect listed in the engine's
  `AI_CHECK_BAD_MOVE_TABLE_EFFECTS` (~90 effects, `factoryAiCheckBadMove.ts:212-241`)
  that has no ported handler is scored as `unsupported-branch`. The opponent AI
  runs `AI_CheckBadMove` for every candidate move of its active mon on every
  turn, so **any opponent move whose effect is table-listed but unported fires
  this barrier**. Only ROAR/SLEEP/PARALYZE/CONFUSE are ported; the vast majority
  of Factory moves (e.g. EFFECT_ATTACK_UP = Swords Dance, EFFECT_RESTORE_HP, ...)
  are table-listed and unported. `factoryAiDecisionPolicy.ts` treats an
  unsupported-branch result as a failed candidate, so this silently degrades the
  opponent AI on essentially every turn.
- **Port size / what it pulls in:** per-effect AI handler bodies from
  `data/battle_ai_scripts.s` (each a handful of `if_*`/`Score_*` instructions,
  already partially ported for the ROAR/SLEEP/PARALYZE/CONFUSE family). No new
  opcode registration needed. Largest single item of the whole set.
- **Concrete Tier-1 test:** assert that an opponent candidate with, say,
  `EFFECT_ATTACK_UP` yields a non-halt `scored` receipt instead of
  `unsupported-branch` (extension of `tests/factoryAiCheckBadMove.test.ts`).
- **Breadth unblocked:** the whole AI move-scoring surface — every opponent
  move in every Factory battle. Using the census's weighted Factory-L50 move
  counts this touches the large majority of the 2957 weighted moves.

### A2. `factoryAiCheckViability.ts:3542` — AI `AI_CheckViability` if_effect table dispatch
- Same shape as A1 for the *second* AI scorer (`AI_CHECK_VIABILITY_TABLE_EFFECTS`,
  `factoryAiCheckViability.ts:180-…`). Only Swagger/Counter are ported; the rest
  of the table fires the barrier whenever the AI viability-scores a move.
- **Breadth unblocked:** identical reasoning to A1 — every turn's AI scoring.

### A3. `battleScriptTryKOOpcode.ts:108` — `Cmd_tryKO`'s HOLD_EFFECT_FOCUS_BAND roll
- **Reason / citation:** `"Cmd_tryKO's HOLD_EFFECT_FOCUS_BAND roll needs gSpecialStatuses[target].focusBanded"`; `battle_script_commands.c:6841-6855`.
- **Reachability:** Focus Band is a **Frontier held item** — the ability/item
  census lists `HOLD_EFFECT_FOCUS_BAND | 78 | 80 | FOCUS_BAND` (78 L50
  carriers). A target holding Focus Band hit by an OHKO move
  (Fissure/Sheer Cold/Horn Drill/Guillotine, all four Factory-L50: census
  EFFECT_OHKO 4(28)) takes the roll branch. **Ordinary Factory play.**
- **Port size:** the `focusBanded` machinery **already exists** —
  `battleScriptHitChainOpcode.ts:1974-2012` and `:2088-2125` model the exact
  same roll for `Cmd_adjustnormaldamage`/`Cmd_adjustsetdamage`. This site is the
  same call on a sibling opcode. Small.
- **Tier-1 test:** opponent holds Focus Band, Fissure connects → survive with
  1 HP and the expected message, not a halt (extends
  `tests/battleScriptTryKOOpcode.test.ts`).
- **Breadth unblocked:** 78 L50 sets carry Focus Band; the four OHKO moves
  (28 weighted) currently halt whenever they hit a Focus Band user.

### A4. `battleScriptAttackCancelerOpcode.ts:274` — Lightning Rod redirection

> **REFUTED by the supervisor 2026-08-08 — this is bucket (C), not (A). Do not
> implement it.** The (A) call below is wrong: it reasons from carrier count
> alone and never opens the redirect's own guard. The source
> (`battle_util.c:3854-3861`) requires BOTH
> `AbilityBattleEffects(ABILITYEFFECT_COUNT_OTHER_SIDE, …, ABILITY_LIGHTNING_ROD, …)`
> to find a holder on the side opposite the attacker AND
> `gBattleMons[targetBattler].ability != ABILITY_LIGHTNING_ROD`. In singles the
> opposite side contains exactly one battler — the target itself — so the two
> conditions are mutually exclusive: if the target holds Lightning Rod the
> second fails, and if it does not the first counts zero. The redirect then
> does `targetBattler ^= BIT_FLANK` (`BIT_FLANK == 2`,
> `include/constants/battle.h:56`), selecting battler 2 or 3, which do not
> exist when `gBattlersCount == 2`. `ABILITYEFFECT_COUNT_OTHER_SIDE` itself
> loops `i < gBattlersCount` (`battle_util.c:3160-3165`).
> The pre-existing ratchet comment in `battleScriptAttackCancelerOpcode.ts`
> ("Lightning Rod remains the adjacent barrier … unreachable in singles") was
> correct and this triage entry contradicted it without checking. Doubles is
> out of scope, so this barrier is a legitimate permanent guard.
>
> **Lesson for whoever reads this file next:** carrier count proves a species
> can appear, never that a branch can fire. Every (A) claim needs the branch's
> own guard opened and read. The other (A) entries have not been re-audited to
> this standard.

- **Reason / citation:** `"Lightning Rod redirection: gSpecialStatuses[].lightningRodRedirected is set (RecordAbilityBattle and BattleScript_TookAttack handoff are unimplemented)"`; `battle_script_commands.c:984-987`, redirect set in `battle_util.c:3855-3860`.
- **Reachability:** Lightning Rod is a **Factory ability** (census
  `ABILITY_LIGHTNING_ROD | 15 (0) | 15` — 15 L50 sets carry it via dual-ability
  species). Any Electric move aimed at a Lightning Rod holder redirects, sets
  `lightningRodRedirected`, and the resumed script hits this branch.
- **Port size:** `Cmd_recordabilitybattle` + the `BattleScript_TookAttack`
  handoff and the redirect state write (battle_util.c:3855-3860) — moderate;
  pulls in one or two controller events and the redirect target selection.
- **Tier-1 test:** Electric move vs a Lightning Rod holder → the move is
  redirected, attacker role swaps, no halt.
- **Breadth unblocked:** 15 L50 sets; plus the redirect is the same mechanic
  `battleScriptMoveEndOpcode`'s own Lightning Rod work already half-covers.

### A5. `battleScriptSwitchinOpcode.ts:750` — `Cmd_various` unmodeled cases (VARIOUS_GET_BATTLER_FAINTED first)
- **Reason / citation:** `"Cmd_various case ${idOperand.expression} is not modeled"`; `battle_script_commands.c:6326`.
- **Reachability:** the unmodeled-id set includes **VARIOUS_GET_BATTLER_FAINTED**,
  called unconditionally by `BattleScript_PursuitDmgOnSwitchOut`
  (`data/battle_scripts_1.s:3144`) — the Pursuit-damage-on-switch-out script.
  Pursuit is a **Factory move** (census EFFECT_PURSUIT 1(6)). Any Pursuit hit on
  a switching-out mon executes this `various` call and fires the barrier.
  Also fires for VARIOUS_IS_RUNNING_IMPOSSIBLE / VARIOUS_SET_TELEPORT_OUTCOME
  (Teleport — bucket B) and — only outside Factory — VARIOUS_RESET_INTIMIDATE_TRACE_BITS
  (`battle_scripts_1.s:2866`, short-circuited for Factory by the
  `jumpifbattletype BATTLE_TYPE_FRONTIER` at `:2851`; bucket C for that id).
- **Port size:** the VARIOUS_GET_BATTLER_FAINTED case is a small source-complete
  port (`battle_script_commands.c:6344-6348`); the same handler block would then
  cover Teleport's two ids (B). Small.
- **Tier-1 test:** opponent Pursuits a switching player mon and the hit lands →
  `getbattlerfainted` resolves instead of halting.
- **Breadth unblocked:** Pursuit (6 weighted Factory carriers) switch-out hits,
  plus Teleport (widened scope).

### A6. `factoryBattleScriptFullTurnDecision.ts:1507` — voluntary switch under Pursuit interception
- **Reason / citation:** `"voluntary … switch while the opponent's selected move is MOVE_PURSUIT (pre-switch interception/double-power path)"`; `battle_script_commands.c:3200-3257` (Pursuit interception on the action-switch path).
- **Reachability:** the voluntary-switch path executes in Factory; when the
  opponent's selected move is Pursuit (a Factory move, 6 carriers) the
  interception arm fires.
- **Port size:** the pre-switch double-power hit + switch-in continuation
  (`BattleScript_PursuitDmgOnSwitchOut` interplay) — moderate; related to A5.
- **Tier-1 test:** player switches while opponent selected Pursuit → the
  double-power hit applies to the switching mon before it leaves, no halt.
- **Breadth unblocked:** Pursuit (6 weighted carriers) + correct switch-out
  damage; also closes the same gap A5's `getbattlerfainted` sits behind.

### A7. `battleScriptGetexpOpcode.ts:148` — `Cmd_getexp` selector `BS_FAINTED`
- **Reason / citation:** `"Cmd_getexp's GetBattlerForBattleScript selector … is not BS_TARGET/BS_ATTACKER"`; `battle_script_commands.c:3264`.
- **Reachability:** `BattleScript_SpikesOnFaintedBattlerFainted`
  (`data/battle_scripts_1.s:3429`) calls `getexp BS_FAINTED` — the Spikes
  damage-on-switch-in path when the replacing mon actually faints to the Spikes.
  Spikes is a **Factory move** (census EFFECT_SPIKES 1(3)); a low-HP switch-in
  onto Spikes fainting is an ordinary Factory event. The hit-chain siblings
  (`resolveHitChainBattlerOperand`, `battleScriptHitChainOpcode.ts:710-723`)
  already resolve BS_FAINTED via `selectorRoles.fainted`; getexp's resolver
  (`battleScriptGetexpOpcode.ts:95-103`) does not — a genuine one-line gap.
- **Port size:** add the BS_FAINTED case to `resolveGetexpBattlerOperand` (and
  confirm the fainted role is populated on this path). Tiny.
- **Tier-1 test:** Spikes faints the switching-in replacement → the fainted
  flow runs `getexp BS_FAINTED` without halting.
- **Breadth unblocked:** Spikes (3 weighted carriers) faint-on-switch-in; also
  the general fainted-mon edge that all three Spikes/faint scripts share.

### A8. `battleScriptStatbuffchangeOpcode.ts:267` — `Cmd_playanimation` unrecognized animType (B_ANIM_FOCUS_PUNCH_SETUP)
- **Reason / citation:** `"Cmd_playanimation's animType ${…} is not registered"`; `battle_script_commands.c:4011`.
- **Reachability:** of the 41 `playanimation` call sites, only
  **B_ANIM_FOCUS_PUNCH_SETUP** (`BattleScript_FocusPunchSetUp`,
  `data/battle_scripts_1.s:3712`) and B_ANIM_SMOKEBALL_ESCAPE (wild-battle
  escape, bucket C) are unregistered. Focus Punch is a **Factory move** (census
  EFFECT_FOCUS_PUNCH 1(11)); its charge-up script executes `playanimation` with
  the unregistered animType and halts.
- **Port size:** register the animType entry (a `B_ANIM_FOCUS_PUNCH_SETUP` row in
  `PLAYANIMATION_ANIM_TYPES`, NULL-arg shape) + whatever controller animation
  event it maps to. Small.
- **Tier-1 test:** Focus Punch charges → the setup animation emits, no halt.
- **Breadth unblocked:** Focus Punch (11 weighted carriers) and, per the
  register set, all other animTypes already resolve.

### A9. `battleScriptHitChainOpcode.ts:4086` — `Cmd_printfromtable` unrecognized table pointer
- **Reason / citation:** `"Cmd_printfromtable's table pointer ${…} is outside the registered … string tables"`; `battle_script_commands.c:2184`.
- **Reachability:** the barrier fires for any table outside
  `PRINTFROMTABLE_TABLES` (~38 registered). Of the 45 tables the committed
  program uses, five are unregistered and two of them sit on ordinary Factory
  paths:
  - **gInobedientStringIds** — `BattleScript_MoveUsedLoafingAroundMsg`
    (`data/battle_scripts_1.s:4239`). Reached from the **Truant** canceler phase
    (`battle_util.c:2092`): a Truant Slaking (census ABILITY_TRUANT 5(5) L50
    carriers — a Factory rental!) on its loafing turn runs this exact script.
  - **gGotDefrostedStringIds** — `BattleScript_MoveUsedUnfroze`
    (`battle_script_commands.c:2257` via `BattleScript_MoveUsedUnfroze`): a
    frozen mon thawing on a fire move is ordinary play.
  - gWeatherStartsStringIds (Sand Stream/Drought/Drizzle switch-in — bucket B),
    gNoEscapeStringIds (wild-battle run — bucket C), gBattlePalaceFlavorTextTable
    (Battle Palace — bucket C).
- **Port size:** the two tables are message-string arrays in
  `battle_message.c`; add them (and the Truant/defrost message index paths) to
  `PRINTFROMTABLE_TABLES`. Small — this is the same Truant handoff A9's sibling
  already drives.
- **Tier-1 test:** a Truant Slaking's loafing turn prints the loafing message
  instead of halting.
- **Breadth unblocked:** Truant (5 carriers), fire-move thaw messages, plus (B)
  the weather-ability messages. **This is the reachable-gap poster child of the
  audit: a "narrow" guard that an ordinary Factory rental triggers on its first
  Truant turn.**

### A10. `battleScriptProtectlikeOpcode.ts:98` — `sProtectSuccessRates[protectUses]` OOB read
- **Reason / citation:** `"sProtectSuccessRates[protectUses] OOB read: protectUses is N after 4 consecutive successful Protect-like uses"`; `battle_script_commands.c:719` (the 4-entry const table `{USHRT_MAX, /2, /4, /8}`) and `:6514` (the `sProtectSuccessRates[protectUses]` read after `protectUses` has been incremented at `:6526`).
- **Reachability:** Protect/Detect/Endure are all Factory moves (census
  EFFECT_PROTECT 2(37), EFFECT_ENDURE 1(24)). The 5th consecutive
  Protect-family use (whether or not the previous ones succeeded) drives
  `protectUses` past the table and hits this branch. Rare in practice but
  legal and ordinary-play reachable. Already reachability-tested
  (`tests/battleScriptProtectlikeOpcode.test.ts`).
- **Port size:** needs the source-exact behavior of the ROM byte following the
  table (the engine must decide the constant); small.
- **Tier-1 test:** already exists; extend to assert the chosen OOB fallback
  value is stable.
- **Breadth unblocked:** the 5th+ consecutive Protect-family use for all 61
  weighted carriers of Protect/Endure.

### A11. `battleScriptIngrainLeechSeedWrapOpcode.ts:472` — `Cmd_manipulatedamage` DMG_RECOIL_FROM_MISS (Struggle recoil)
- **Reason / citation:** `"Cmd_manipulatedamage's mode … is not the registered DMG_CHANGE_SIGN case"`; `battle_script_commands.c:6740-6759`.
- **Reachability:** `BattleScript_MoveMissedDoDamage` (`battle_scripts_1.s:865`)
  uses `manipulatedamage DMG_RECOIL_FROM_MISS` — the **Struggle** recoil
  branch. Struggle is reachable in **any** battle where a mon has no usable PP
  (fully universal, not content-gated). The DMG_DOUBLED arm is Beat Up
  (bucket B).
- **Port size:** the recoil-from-miss arithmetic arm; small.
- **Tier-1 test:** run a mon's PP to zero, use Struggle → recoil damage applies,
  no halt.
- **Breadth unblocked:** Struggle recoil (every battle), plus (B) Beat Up
  (widened scope).

### A12. `battleScriptAttackCancelerOpcode.ts:338` — battle-outcome → B_ACTION_FINISHED handoff
- **Reason / citation:** `"gBattleOutcome != 0 -> gCurrentActionFuncId = B_ACTION_FINISHED (consumed by the round controller, out of this step's scope)"`; `battle_script_commands.c:…` (the attack-canceler's outcome preflight).
- **Reachability:** fires whenever the attack-canceler is entered with
  `gBattleOutcome != 0`, i.e. at battle end (a side fully wiped). Ordinary
  battle end is common — **but** the round controller may consume battle end
  before the script machine re-enters a canceler, in which case this is latent
  rather than fired today. **Honest uncertainty:** I did not prove which; treat
  as (A)-reachable pending a battle-end fixture.
- **Port size:** the typed action-scheduler receipt the round controller needs
  (same machinery `Cmd_finishaction` defers on, see C1). Larger than the rest.
- **Tier-1 test:** a battle where the opponent's last mon faints reaches a
  clean terminal decision, no unsupported-branch halt.
- **Breadth unblocked:** every battle's end.

---

## Bucket (B) — reachable only under the widened 2026-08-05 scope

### B1. `battleScriptHitChainOpcode.ts:1169` — Enigma Berry evasion-up (`Cmd_accuracycheck`)
- **Reason / citation:** `"the target's Enigma Berry evasion-up holdEffectParam is not modeled (gEnigmaBerries is absent)"`; `battle_script_commands.c:1163`.
- **Construct to port:** `gEnigmaBerries` table + the
  `holdEffect == HOLD_EFFECT_EVASION_UP` param application
  (`battle_script_commands.c:1160-1173`). Enigma Berry is a legal Gen-3 item
  with a bespoke per-battler storage the engine lacks; no Factory set carries it
  (Frontier evasion-up items are Bright Powder/Lax Incense, whose plain
  `GetItemHoldEffectParam` path is modeled). Needs the `gEnigmaBerries`
  memory block and its read/write sites.
- **Tier-1 test:** a target holding Enigma Berry vs an accuracy roll applies the
  evasion-up factor, no halt.
- **Breadth unblocked:** Enigma Berry users (0 Factory carriers — the item,
  not the HOLD_EFFECT which has 120 carriers). Low.

### B2. Sub-cases folded into A9 / A5 / A11 (same single barrier call site)
- **`printfromtable` gWeatherStartsStringIds** (A9's barrier):
  `BattleScript_OverworldWeatherStarts` is reached by the Sand Stream / Drought /
  Drizzle switch-in weather callback (`battle_util.c:2529`). Those three
  abilities are **zero-carrier** in Factory (census) but legal Gen-3 abilities.
- **`manipulatedamage` DMG_DOUBLED** (A11's barrier): `BattleScript_BeatUpLoop`
  (`battle_scripts_1.s:1953`). Beat Up is legal, 0 Factory carriers.
- **`various` VARIOUS_IS_RUNNING_IMPOSSIBLE + VARIOUS_SET_TELEPORT_OUTCOME**
  (A5's barrier): `BattleScript_EffectTeleport` (`battle_scripts_1.s:1930,1937`).
  Teleport is legal, 0 Factory carriers (census EFFECT_TELEPORT 0).

---

## Bucket (C) — provably unreachable in Factory singles (legitimate permanent guards)

Each cites the exact source line that makes it impossible for the committed
Factory-only script path.

- **C. `battleScriptCheckteamslostOpcode.ts:93`** — `BATTLE_TYPE_INGAME_PARTNER`
  Steven-partner MULTI_PARTY_SIZE HP count. Partner battles are doubles-context;
  `battle_script_commands.c:3543` is gated on the INGAME_PARTNER battle-type bit
  Factory never sets (`battle.h` FRONTIER bits are mutually exclusive with it).
- **C. `battleScriptCheckteamslostOpcode.ts:101`** — `BATTLE_TYPE_ARENA` per-mon
  HP exclusion (`battle_script_commands.c:3557/3571`). Arena is a sibling
  Frontier facility; Factory (`BATTLE_TYPE_FACTORY`) never sets ARENA.
- **C. `battleScriptCheckteamslostOpcode.ts:117`** — link-battle
  empty-battler-spot counting (`battle_script_commands.c:3582`), gated on
  `BATTLE_TYPE_LINK | BATTLE_TYPE_RECORDED_LINK`. Factory singles is never a
  link battle.
- **C. `battleScriptSwitchinOpcode.ts:287`** — `Cmd_switchhandleorder` case 0
  (multi-battler collection). The only case-0 call sites are
  `LinkHandleFaintedMonMultipleStart` (`battle_scripts_1.s:2902,2904`) — link
  battles.
- **C. `battleScriptSwitchinOpcode.ts:412`** — `SwitchInClearSetData`'s
  STATUS2_WRAPPED cross-battler clear, guarded by `battlersCount !== 2`
  (`battle_script_commands.c:3199`). Singles always has 2 battlers.
- **C. `battleScriptSwitchinOpcode.ts:646`** — `Cmd_switchinanim`'s
  `BATTLE_TYPE_ARENA` point-init (`battle_script_commands.c:4696`). Factory
  never sets ARENA.
- **C. `battleScriptGetexpOpcode.ts:166`** — general EXP/level-up/evolution
  machinery (states 2-5). `shortCircuits` is true for any Frontier battle
  (`battle_script_commands.c:…`, GETEXP state-0 short-circuit mask includes
  `BATTLE_TYPE_FRONTIER`), and Factory is always Frontier. Needs a non-Frontier,
  non-link, non-Safari, non-Trainer-Hill, non-EReader battle — a battle context,
  not a species/move/ability/item breadth, so out of scope.
- **C. `battleScriptMoveEndOpcode.ts:982`** — MOVEEND_NEXT_TARGET doubles replay
  (`battle_script_commands.c:…`, `MoveValuesCleanUp` + `BattleScript_FlushMessageBox`
  transfer under a doubles multi-target loop). Singles has one target.
- **C. `battleScriptOpenPartyScreenOpcode.ts:149`** — `Cmd_openpartyscreen`'s
  doubles/multi branches (BATTLE_TYPE_MULTI link-standby fan-out, and
  `GetMostSuitableMonToSwitchInto`'s `BATTLE_TYPE_DOUBLE` flank pick). Singles
  never reaches either.
- **C. `battleScriptTargetIterationOpcode.ts:114`** — `Cmd_jumpifnexttargetvalid`'s
  `BATTLE_TYPE_DOUBLE` next-target scan. Doubles only.
- **C. `battleScriptForceSwitchOpcode.ts:262`** — `Cmd_finishaction` sits on
  `BattleScript_SuccessForceOut`'s **not-taken** non-trainer fork arm
  (`battle_scripts_1.s:3331-3332`, the `jumpifbattletype BATTLE_TYPE_TRAINER`
  always taken for Factory); the counterfactual arm additionally barriers first
  on `setoutcomeonteleport` (already-registered VARIOUS). Doubly unreachable.
- **C. `battleScriptJumpifcantswitchOpcode.ts:167`** — the in-game-partner/MULTI/
  two-opponents/doubles scan family (`battle_script_commands.c:4714-4848`),
  gated on `battlersCount !== 2` or MULTI/TWO_OPPONENTS/INGAME_PARTNER bits.
- **C. `battleScriptJumpifbyteOpcode.ts:141`** — the only unmodeled operand
  shapes are: `sBATTLE_STYLE`/`OPTIONS_BATTLE_STYLE_SET` and `PARTY_SIZE`
  (`BattleScript_FaintedMonTryChoose`, `battle_scripts_1.s:2852,2863` — reached
  only *after* the `jumpifbattletype BATTLE_TYPE_FRONTIER` short-circuit at
  `:2851`, so never in Factory); `BATTLE_RUN_FORBIDDEN`/`BATTLE_RUN_FAILURE`
  (wild-battle run flow, `:1931-1932`); `B_OUTCOME_DREW` (`BattleScript_CheckDomeDrew`,
  `:2959` — Dome context); `ARENA_RESULT_*` (Arena judgment, `:4499-4500`).
  All other 65 call sites resolve (verified by enumerating every
  `B_SCR_OP_JUMPIFBYTE` site's pointer+value against the current resolver).
  **Residual uncertainty, stated honestly:** I exhaustively checked pointers and
  the value set; the four unmodeled operand classes above are the only ones.
- **C. `battleScriptJumpifhalfwordOpcode.ts:165`** — the only unmodeled operand
  is `gTrainerBattleOpponent_A == TRAINER_SECRET_BASE`
  (`BattleScript_LocalBattleLost`, `battle_scripts_1.s:2950`). It is reached
  only after the `jumpifbattletype BATTLE_TYPE_FRONTIER` short-circuit at
  `:2947`, so never in Factory. Every other call site (gCurrentMove,
  gChosenMove×3, gBattleWeather) resolves in the current
  `readJumpifhalfwordMemHword` (`:91-101`) — the pin's "only gCurrentMove is
  modeled" narrative is outdated.
- **C. `battleScriptJumpifwordOpcode.ts:227`** — the only unmodeled values are
  `BATTLE_TYPE_TRAINER_HILL` / `BATTLE_TYPE_EREADER_TRAINER`
  (`BattleScript_LocalBattleLost`, `:2948-2949`, after the `:2947` FRONTIER
  short-circuit), `BATTLE_TYPE_RECORDED` (`BattleScript_FrontierLinkBattleLost`,
  `:2993`, link), and `BATTLE_TYPE_BATTLE_TOWER`
  (`BattleScript_LinkBattleWonOrLost` → `TowerLinkBattleWon`, `:3000-3029`,
  link). None reachable in Factory singles.
- **C. `battleScriptSwitchinOpcode.ts:750` sub-case** — VARIOUS_RESET_INTIMIDATE_TRACE_BITS
  (`battle_scripts_1.s:2866`) is reached only after the `:2851` FRONTIER
  short-circuit (non-Factory trainer battles with an opponent switch prompt);
  VARIOUS_WAIT_CRY/VOLUME_UP/VOLUME_DOWN/EMIT_YESNOBOX and all ARENA_* ids are
  Battle Arena scripts (`battle_scripts_1.s:4449-4549`); VARIOUS_UPDATE_CHOICE_MOVE_ON_LVL_UP
  is a level-up script (`:3187`); VARIOUS_PLAY_TRAINER_DEFEATED_MUSIC is the
  Battle-Tower link win (`:3010`). (The same single barrier also fires for the
  (A) VARIOUS_GET_BATTLER_FAINTED and (B) Teleport ids — see A5/B2.)
- **C. `battleScriptStatusPrimaryOpcode` / `Statbuffchange` Arena/Palace reachability**
  — not barrier sites; listed for completeness only.

---

## Bucket (D) — malformed-input / future-input guards (legitimate; each verified no committed script carries the offending operand)

Verified by enumerating every committed call site of the opcode and confirming
the engine's current resolver accepts each operand:

- **D. `battleScriptHitChainOpcode.ts:1088`** — `Cmd_accuracycheck` non-ACC_CURR_MOVE
  argument. All 66 call sites use `ACC_CURR_MOVE`, `NO_ACC_CALC`,
  `NO_ACC_CALC_CHECK_LOCK_ON`, or the explicit `MOVE_FUTURE_SIGHT`/`MOVE_DOOM_DESIRE`
  literals, all modeled. (The Enigma Berry sub-branch of the same opcode is B1.)
- **D. `battleScriptHitChainOpcode.ts:2294`** — `Cmd_hitanimation` selector; all
  14 call sites are BS_TARGET/BS_ATTACKER.
- **D. `battleScriptHitChainOpcode.ts:2339`** — `Cmd_healthbarupdate` selector;
  all 41 call sites (BS_TARGET/BS_ATTACKER/BS_FAINTED) resolve.
- **D. `battleScriptHitChainOpcode.ts:2415`** — `Cmd_datahpupdate` selector;
  all 41 call sites resolve (BS_FAINTED handled at `:717-721`).
- **D. `battleScriptHitChainOpcode.ts:3267`** — SetMoveEffect family-B
  (status2/misc) effectByte. All 22 committed `setmoveeffect` values are in
  `SET_MOVE_EFFECT_SUPPORTED_BYTES` (verified by enumeration).
- **D. `battleScriptHitChainOpcode.ts:4077`** — `Cmd_printfromtable` bad operand
  shape. All 73 call sites are the canonical single 4-byte pointer form.
- **D. `battleScriptHitChainOpcode.ts:4097`** — `Cmd_printfromtable`
  MULTISTRING_CHOOSER out-of-range. The registered tables' indices are set by
  the scripts they were registered against; no reachable script drives an
  out-of-range index (the Truant loafing index lands on the *pointer* barrier,
  A9, not this one). **Note:** this guard is the one to double-check first if a
  new script reuses a registered table with a different MULTISTRING_CHOOSER
  value.
- **D. `battleScriptHitChainOpcode.ts:4130`** — `Cmd_updatestatusicon` bad
  operand shape; all 18 call sites are single-byte battler operands
  (BS_ATTACKER_WITH_PARTNER included).
- **D. `battleScriptHitChainOpcode.ts:4482`** — `Cmd_cleareffectsonfaint`
  selector; the non-BS_TARGET/BS_ATTACKER sites are BS_OPPONENT1/BS_PLAYER1 in
  Arena judgment scripts only (`battle_scripts_1.s:4511-4543`); all Factory
  sites resolve.
- **D. `battleScriptDamagingWeatherOpcode.ts:258`** — `Cmd_addbyte`'s
  `sMULTIHIT_STRING + 4` non-literal delta; every committed multi-hit site uses
  the literal, modeled.
- **D. `battleScriptDamagingWeatherOpcode.ts:276`** — `Cmd_addbyte` shared-universe
  fallback; all 9 call sites resolve in the byte universe.
- **D. `battleScriptDamagingWeatherOpcode.ts:327`** — `Cmd_bicword` unknown
  operand pair; all 3 call sites are registered pairs.
- **D. `battleScriptDamagingWeatherOpcode.ts:381`** — `Cmd_jumpifarraynotequal`
  unknown pointer/comparand; all 7 call sites resolve.
- **D. `battleScriptRemoveitemOpcode.ts:45`** — `Cmd_removeitem` selector
  unavailable; all 13 call sites (BS_ATTACKER/BS_SCRIPTING) resolve.
- **D. `battleScriptSemiInvulnerableOpcode.ts:69`** — `Cmd_clearstatusfromeffect`
  selector unavailable; all 5 call sites use BS_ATTACKER.
- **D. `battleScriptStatbuffchangeOpcode.ts:275`** — `Cmd_playanimation` argument
  mismatch; every call site passes the arg its animType declares.
- **D. `battleScriptStatbuffchangeOpcode.ts:362`** — `Cmd_jumpifstatus2` value
  outside the registered set; all 37 call-site masks (SUBSTITUTE, CONFUSION,
  MULTIPLETURNS, FOCUS_ENERGY, ESCAPE_PREVENTION, NIGHTMARE) are registered in
  the current `JUMPIFSTATUS2_VALUES` (`:348-355`) — the pin's "only SUBSTITUTE
  is registered" narrative is outdated.
- **D. `battleScriptStatusPrimaryOpcode.ts:112`** — `Cmd_jumpifstatus` value
  outside the registered set; all 21 call sites' status1 values resolve.
- **D. `battleScriptStatusPrimaryOpcode.ts:139`** — `Cmd_jumpiftype` unknown
  TYPE_*; all 5 call sites (FIRE/POISON/STEEL) resolve.
- **D. `battleScriptStatusPrimaryOpcode.ts:172`** — `Cmd_jumpifsideaffecting`
  value outside the registered set; all 10 call sites use SIDE_STATUS_SAFEGUARD.
- **D. `battleScriptIngrainLeechSeedWrapOpcode.ts:324`** — `Cmd_copyarray`
  unknown tuple; **all 16 committed call-site tuples** are now modeled
  (gBattleMoveDamage↔gHpDealt, cEFFECT_CHOOSER←sMULTIHIT_EFFECT,
  cMULTISTRING_CHOOSER←sTWOTURN_STRINGID, gDynamicBasePower←sTRIPLE_KICK_POWER,
  gBattleTextBuff1←sMULTIHIT_STRING×6, gBattlerTarget←gBattlerAttacker,
  gBattlerTarget←sBATTLER, gEffectBattler←gBattlerTarget, sBATTLER←sBATTLER_WITH_ABILITY,
  gBattleMoveDamage←sBIDE_DMG/←sPAINSPLIT_HP).
- **D. `battleScriptIngrainLeechSeedWrapOpcode.ts:429`** — `Cmd_jumpifability`
  unknown tuple; all 18 call-site abilities (Liquid Ooze, Rock Head, Soundproof,
  Clear Body, Hyper Cutter, Immunity, Insomnia, Limber, Own Tempo, Suction Cups,
  Vital Spirit, Water Veil, White Smoke) are in `JUMPIFABILITY_VALUES`
  (`:380-394`); the unmodeled BS_ATTACKER_SIDE/BS_NOT_ATTACKER_SIDE selector
  branches are used by no call site.

---

## Ranked dispatch queue

> **STATUS after the 2026-08-08 session (supervisor).** Eight of the twelve (A)
> items are DONE and merged; one was refuted. Remaining work, in order:
>
> | Item | State |
> | --- | --- |
> | 1. AI `AI_CheckBadMove` if_effect handlers | **IN PROGRESS** — **44 of 66 effects ported** (batches 1-4, one commit per effect). **18 remain, blocked on MISSING STATE not transcription**: DISABLE/ENCORE need any-move-disabled + encored flags, STOCKPILE/SWALLOW/SPIT_UP a stockpile count, ATTRACT gender, PSYCH_UP Haze-style stat-stage copying. Wire the state first. |
> | 2. `Cmd_tryKO` Focus Band | **DONE** |
> | 3. Lightning Rod redirection | **REFUTED — (C), unreachable in singles.** Do not take it. |
> | 4. `VARIOUS_GET_BATTLER_FAINTED` | **DONE** |
> | 5. Pursuit pre-switch interception | **DONE** — Pursuit now works end to end. |
> | 6. `Cmd_getexp` BS_FAINTED | **DONE** |
> | 7. `B_ANIM_FOCUS_PUNCH_SETUP` | **DONE** — and it required porting `Cmd_playanimation`'s full five-way dispatch, because Scene-OFF sets `HITMARKER_NO_ANIMATIONS` for the whole battle, making branches 2 and 4 the normal path rather than edge cases. |
> | 8. `printfromtable` message tables | **DONE** — Truant Slaking's loafing turn and fire-move thaw. |
> | 9. `sProtectSuccessRates[4]` OOB | **DONE** — measured from the ROM: the adjacent `u16` is `MOVE_METRONOME` (118), so a 5th consecutive Protect succeeds ~0.18% of the time. Evidence: `docs/protectlike-oob-adjacent-byte.md`. |
> | 10. `DMG_RECOIL_FROM_MISS` / `DMG_DOUBLED` | **DONE** — Struggle recoil (universal) and Beat Up. |
> | 11. battle-outcome → `B_ACTION_FINISHED` handoff | **OPEN.** Note this entry's own honest caveat: reachability was never proven. Prove it with a battle-end fixture BEFORE porting. |
> | 12. Enigma Berry (bucket B) | **OPEN**, lowest priority. |
> | A2. `AI_CheckViability` if_effect table | **OPEN** — the sibling of item 1, not yet started. |
>
> **Read the refutation box under A4 before trusting any remaining (A) claim.**
> Three of the entries checked this session had defects: Lightning Rod was
> wrong outright, and two others (`getexp` BS_FAINTED, the Pursuit `various`
> case) were right but for reasons the entry stated imprecisely. Carrier count
> proves a species can appear, never that a branch can fire — open the guard.

Ordered by unblocked breadth per unit of port size. A future worker can take
line 1 and start.

**(A) sites first:**

1. `factoryAiCheckBadMove.ts` + `factoryAiCheckViability.ts` — port the next
   `if_effect` AI handler bodies (start with the highest-weighted Factory
   effects already table-listed, e.g. EFFECT_ATTACK_UP/Swords Dance); every
   turn's AI scoring stops halting on these. Next step: add the first batch of
   per-effect handlers to `AI_CheckBadMove_CheckEffect` and `AI_CheckViability`,
   pinning each with a scored-receipt test.
2. `battleScriptTryKOOpcode.ts` — wire `Cmd_tryKO`'s Focus Band roll through the
   already-modeled `focusBanded` machinery in `battleScriptHitChainOpcode.ts:1974-2012`.
   Next step: one case reusing the sibling opcodes' roll; test: Focus Band
   survives Fissure.
3. ~~`battleScriptAttackCancelerOpcode.ts:274` — Lightning Rod redirection~~
   **REFUTED 2026-08-08 (supervisor) — reclassified (C), unreachable in
   singles. Do not take this item.** See the refutation box under A4 above.
4. `battleScriptSwitchinOpcode.ts:750` — add the VARIOUS_GET_BATTLER_FAINTED
   case (`battle_script_commands.c:6344-6348`). Next step: Pursuit switch-out
   fixture asserting `getbattlerfainted` resolves. (Also unblocks Teleport's two
   ids, B2.)
5. `factoryBattleScriptFullTurnDecision.ts:1507` — implement the Pursuit
   pre-switch interception. Next step: voluntary-switch-under-Pursuit fixture.
   (Companion to #4.)
6. `battleScriptGetexpOpcode.ts:148` — add the `BS_FAINTED` case to
   `resolveGetexpBattlerOperand` (mirror the hit-chain resolver). Next step:
   Spikes-faints-replacement fixture.
7. `battleScriptStatbuffchangeOpcode.ts:267` — register
   `B_ANIM_FOCUS_PUNCH_SETUP`. Next step: Focus Punch charge-up fixture.
8. `battleScriptHitChainOpcode.ts:4086` — add `gInobedientStringIds` and
   `gGotDefrostedStringIds` to `PRINTFROMTABLE_TABLES` (+ message indices).
   Next step: Truant Slaking loafing-turn fixture.
9. `battleScriptProtectlikeOpcode.ts:98` — decide the source-exact OOB fallback
   for `sProtectSuccessRates[4]`. Next step: 5th-consecutive-Protect fixture.
10. `battleScriptIngrainLeechSeedWrapOpcode.ts:472` — implement
    `DMG_RECOIL_FROM_MISS`. Next step: Struggle-recoil fixture.
11. `battleScriptAttackCancelerOpcode.ts:338` — battle-outcome → typed
    action-scheduler receipt (shared with `Cmd_finishaction`, C1). Next step:
    a battle-end fixture proving the round controller consumes it first.
12. `battleScriptHitChainOpcode.ts:1169` — Enigma Berry `gEnigmaBerries`
    support (the only pure-(B) site; folded in after the (A) queue).

**(B) sites (same barrier call sites, sub-cases):** the gWeatherStartsStringIds,
Beat Up, and Teleport sub-cases are unblocked by lines 8, 10, and 4 above
respectively; only Enigma Berry (line 12) is a standalone item.
