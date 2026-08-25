# PREMISE-THROW audit of the battle kernel — 2026-08-25

Read-only static census of `throw new Error` sites in `src/engine` whose
message encodes a **PREMISE** ("this state is impossible") rather than an
oracle-proved barrier or a parse-time contract.

**Motivation.** ISSUES #126 (fixed 2026-08-24, PROGRESS.md entry 1397 item 6)
was exactly this shape: `throw new Error("gBideTarget must be the opposing
slot")` asserted a state the C source rules out *elsewhere* —
`DoBattlerEndTurnEffects` raises `HITMARKER_GRUDGE | HITMARKER_IGNORE_BIDE` at
every entry (`reference/pokeemerald/src/battle_util.c:1468`), so Bide never
stores end-turn damage. The port lacked that marker, stored Wrap damage under a
stale target, and the premise fired as a CRASH at 1/600 varied-RNG chains. A
random soak found it; this census looks for its siblings statically.

**A premise is only PROVED when both halves hold:** (a) the C source genuinely
rules the state out, and (b) the port sets/reads the same guard — flag,
hit-marker, status bit, ordering — at the same point the source does. A port
that lacks the upstream marker is UNPROVEN even when the C comment says
"cannot happen".

Every C line cited below was read from `reference/pokeemerald/`.
No source file, test, or ledger was changed by this audit; nothing was fixed.

> **Second pass, 2026-08-25.** Rows marked *(2nd pass)* and the four
> *reclassified* rows were derived in a follow-up read. It closed §3.6's
> UNCLASSIFIED list, resolved Drafts D and E (both PROVED), and **refuted
> Draft B** — the first pass's reading of the orchestration result unions was
> wrong. It also found one new UNPROVEN row with a constructed scenario
> (`factoryBattleScriptFullTurnDecision.ts:2564`, §4 item 2 / Draft F). The
> evidence bar is unchanged: every C citation names its enclosing function
> and the condition guarding the line.

---

## 1. Scope + method

Commands, in order, with the count after each stage:

| # | Stage | Command / filter | Count |
| --- | --- | --- | --- |
| 1 | All throw sites | `rg -n "throw new Error" src/engine` | **1,554** sites across **194** files |
| 2 | Premise-worded | message matches `must` / `expected` / `unexpected` / `impossible` / `cannot` / `should never` / `invariant` / `unreachable` / `never happen` / `should not` (messages reassembled across continuation lines, since ~40% of throws wrap) | **235** |
| 3 | Minus exclusions (§2) | drop validator-function sites, presentation/staging modules, and construction/generation/parse-boundary modules | **48** live-kernel premise sites |
| 4 | Classified (§3) | read the TS site *and* the C it claims to port | **50** (24 first pass + 26 second pass) |
| 5 | Remainder | UNCLASSIFIED | **0** in the files §3.6 named; see §3.7's caveat |

The stage-2 regex is the one named in the step brief. It has a **known blind
spot**: premises phrased without those words are missed. One was found by hand
while reading a neighbouring site — `battleScriptActionAdmission.ts:3547`
("STATUS2_BIDE counter 3 **is not reachable** from `Cmd_setbide`…"), which is a
textbook premise in the Bide region itself. It is classified below as a bonus
row. A follow-up census should add `not reachable` / `dead` / `provably` /
`only ... can` to the filter; the 1,319 non-premise-worded throws were not
re-read here.

---

## 2. Exclusions

### 2a. The sanctioned (b)-barrier class is *not* a throw

`unsupported-branch` halts — the sanctioned barrier class per ROADMAP S10
"Executable-frontier reset" §1 — are **43** occurrences in `src/engine`, and
**zero** of them are `throw new Error`. They are returned as result literals
(`kind: "unsupported-branch"`, e.g. `battleScriptSwitchinOpcode.ts:184`,
`battleScriptMoveEndOpcode.ts:1026`, `battleScriptJumpifbyteOpcode.ts:106`) and
are counted per module by `tests/executableFrontierRatchet.test.ts:482`. They
are therefore disjoint from this audit's population and are excluded by
construction, not by judgement. `battleScriptFaintedActionsOrchestration.ts:317`
documents the design intent explicitly: an opcode's own (b) barrier "is the
same kind of real machine boundary as an unregistered opcode — surface it the
same way, not a crash."

### 2b. Excluded by count and file group

| Class | Sites | Files (representative) |
| --- | --- | --- |
| **A — validator functions.** Throw sits inside a function named `assert*`/`validate*`/`require*`/`expect*`/`ensure*`/`check*`/`parse*`/`is*`/`coerce*`/`freeze*`. These are the port's u8/u16/u32/frozen-shape contract on data crossing a boundary, not claims about battle state. | **64** | `factoryConstructionClock.ts` (21), `battleScriptRulesContext.ts` (5), `battleScriptMachine.ts` (5), `battleScriptActionAdmission.ts` (4), `battleScenario.ts` (4), `battleScriptAttackCanceler.ts` (3), `factoryBattleScriptDecision.ts` (3), + 15 files with ≤2 each |
| **B — presentation / staging / compare-only.** Scene rendering, per-turn staging adapters, healthbox/string assembly, the retired Battle-2 command adapter. Scene mode may change presentation timing, never logical outcomes (AGENTS.md worker-lane contract), so these cannot be a kernel crash source. | **28** | `turn*PresentationStaging.ts`, `turn*ResolutionAdapter.ts`, `battleScene.ts`, `battleSceneCanonical.ts`, `sceneOffPresentation.ts`, `battleResolutionPresentation*.ts`, `healthboxAssembly.ts`, `battleStringResolver.ts`, `partySelect.ts`, `fightCommandPresentation.ts`, `battle2CommandAdapter.ts`, `factoryTrainerPresentation.ts`, `factoryDraftScreen.ts` |
| **C — parse-time data validation and construction clocks.** Deserialization/validation entry points (`createBattleScriptRulesContext`, `createBattleScriptSchedulerState`, the JSON decision boundary) and the dev-time construction/generation clocks. Their inputs come from the port's own constructors or from persisted JSON, never from a mid-battle transition. | **95** | `factoryConstructionClock.ts` (28 beyond class A), `battleScriptRulesContext.ts` (21), `battleScriptMachine.ts` (16), `battleDecisionBoundary.ts` (9), `battleScenario.ts` (5), `factoryOpponentGeneration.ts` (4), `factoryBrainOpponentGeneration.ts`, `factoryRentalGeneration.ts`, `factoryCorpusParty.ts`, `factoryTrainerSchedule.ts`, `battleGameStatMeta.ts`, `factoryBattleStart*.ts`, `frontierBrainStatus.ts`, `factoryBrainRoundOutcome.ts` |

Total excluded: **187**. Live-kernel premise sites remaining: **48**.

> Note on class C: `battleScriptRulesContext.ts:2519-2531` (`bideDmg`/
> `bideTarget` must be four battler ids) is in this class because it runs at
> context construction, but it is worth a supervisor's eye — it is the same
> field pair #126 crashed on, and it is the port's *only* declared contract on
> those cells. It cannot fire mid-turn.

---

## 3. The table — 50 classified live-kernel premise sites

Verdict key: **PROVED** = source rules it out AND the port carries the same
guard at the same point. **TS-CONTRACT** = guards TypeScript-internal shape
only. **UNPROVEN** = no source line rules it out, or the port is missing the
upstream guard the source relies on (the #126 shape).

### 3.1 Attack-canceler / locked-move region — `src/engine/battleScriptActionAdmission.ts`

| file:line | message (trimmed) | verdict | evidence |
| --- | --- | --- | --- |
| `battleScriptActionAdmission.ts:2894` | `confusion counter must use the source-reachable encoding 0..5` | **PROVED** | Only two writes to the 3-bit `STATUS2_CONFUSION` field exist in C. The set at `battle_script_commands.c:2541` (`\|= STATUS2_CONFUSION_TURN(((Random()) % 4) + 2)`, 2–5) is guarded at `:2534-2535` by `ability == ABILITY_OWN_TEMPO \|\| status2 & STATUS2_CONFUSION`, so the OR always lands on a zero field and can never carry to 6/7. The only other write is the guarded `-= STATUS2_CONFUSION_TURN(1)` at `battle_util.c:2159-2161`. **Port half:** confusion is set only through `applyConfusionMoveEffect` → `applyConfusionStatus2Mutation` (`battleScriptHitChainOpcode.ts:3598-3610`), which returns `confused: false` on the already-confused/Own-Tempo path, i.e. the same pre-OR guard; the decrement mirrors `:2159`. |
| `battleScriptActionAdmission.ts:2973` | `confusionDamage level, attack, and defense must be nonzero` | **TS-CONTRACT** | Guards a staging-only optional cell (`sourceBattler.confusionDamage ?? confusionDamageFromLiveBattler(...)`, `:2969-2971`). On the live path the three values are derived from the battler's own level and stats, which are ≥ 1 for every Level-50 rental; only a hand-staged rules context can supply zeros. No game state reaches it. |
| `battleScriptActionAdmission.ts:3302` | `STATUS2_INFATUATION must encode exactly one source battler bit when nonzero` | **PROVED (by scope)** | `STATUS2_INFATUATION` is a 4-bit field, one bit per battler. Both setters name a single battler: Attract at `battle_script_commands.c:7693` (`\|= STATUS2_INFATUATED_WITH(gBattlerAttacker)`, guarded at `:7685` on the target already being infatuated) and Cute Charm at `battle_util.c:2865` (guarded at `:2861` by `!(status2 & STATUS2_INFATUATION)`). In singles there are exactly two battlers (`battle_controllers.c:161-177`, `InitSinglePlayerBtlControllers`, non-`BATTLE_TYPE_DOUBLE` branch → `gBattlersCount = 2`), so a battler's only possible infatuation source is its single opponent — one bit. Multi-bit accumulation needs two simultaneous opposing attackers, i.e. doubles. **Port half:** the port reads the same `>>> 16 & 0xf` encoding and sets it only from the opposing battler. |
| `battleScriptActionAdmission.ts:3512` | `CANCELER_BIDE Level-50 singles attacker must be battler 0 or 1` | **PROVED (by scope)** | Same scope gate: `battle_controllers.c:177` sets `gBattlersCount = 2` for every non-double battle, so battlers 2/3 are never instantiated and `gBattlerAttacker` (assigned from `gBattlerByTurnOrder`, `battle_util.c:1471`) cannot exceed 1. |
| `battleScriptActionAdmission.ts:3517` | `CANCELER_BIDE does not accept absent battlers: the GetMoveTarget fallback is source-unreachable at a continuing Level-50 singles action boundary` | **PROVED (by scope)** — *supervisor correction 2026-08-25; the worker's UNPROVEN verdict is withdrawn* | The redirect at `battle_util.c:2235-2237` is real, but the worker's premise that `gAbsentBattlerFlags` "is raised on faint" is a citation-context slip: every `gAbsentBattlerFlags \|= gBitTable[...]` site it cites (`battle_script_commands.c:4886/4915/4937/4958/4980/5043/5059/5109`) sits inside `Cmd_openpartyscreen` (`:4865-5150`) and fires only when `HasNoMonsToSwitch(...)` is true — a slot with **no replacement**, the doubles one-mon-left case. A faint by itself never sets the bit (`Cmd_tryfaintmon`, `:2965`, raises `HITMARKER_FAINTED` only). In a continuing Level-50 singles battle a fainted slot always has a replacement (otherwise `checkteamslost` has already ended the battle), so `gAbsentBattlerFlags` is 0 at every continuing action boundary — exactly the port's stated invariant. **Port half:** the port never raises `absentBattlerFlags` on faint either (`factoryBattleStart.ts:425` starts it at 0; the only write is the switch-in clear at `battleScriptSwitchinOpcode.ts:705`), matching the source. §4 item 3 and §5 Draft C below are withdrawn accordingly. |
| `battleScriptActionAdmission.ts:3547` *(bonus row; missed by the stage-2 regex)* | `STATUS2_BIDE counter 3 is not reachable from Cmd_setbide in the Level-50 singles locked-action flow` | **PROVED** | `Cmd_setbide` (`battle_script_commands.c:7122-7129`) ORs `STATUS2_BIDE_TURN(2)` into a 2-bit field; the only other write is the `-= STATUS2_BIDE_TURN(1)` at `battle_util.c:2225`. Reaching 3 needs a second `Cmd_setbide` while the field is 1, which the canceler forecloses: once `STATUS2_BIDE` is set, `battle_util.c:2225-2245` diverts the biding battler to `BattleScript_BideStoringEnergy` / `BideAttack` / `BideNoEnergyToAttack` inside `AtkCanceler`, before the move's own script (and so before `Cmd_setbide`) can run again. **Port half:** the port sets Bide only through `battleScriptSetbideOpcode.ts` and reaches it through the same canceler phase. |
| `battleScriptActionAdmission.ts:3553` | `gBideDmg[N] must be nonnegative in reachable Level-50 singles state` | **PROVED** | `Cmd_datahpupdate` splits on sign first: `battle_script_commands.c:1897-1903` handles `gBattleMoveDamage < 0` as HP gain and touches neither `gBideDmg` nor `gBideTarget`; the accumulation `gBideDmg[gActiveBattler] += gBattleMoveDamage` at `:1912` is reachable only from the `else` at `:1904`, i.e. with non-negative damage. `Cmd_setbide` zeroes the cell at `:7125`. **Port half — both halves confirmed:** `battleScriptHitChainOpcode.ts:2521` (`if (damage < 0)`) early-returns on the heal branch *before* the bide accumulation at `:2551-2564`, exactly mirroring the C split, and `battleScriptSetbideOpcode.ts:44-46` zeroes the attacker's cell. The post-#126 `HITMARKER_IGNORE_BIDE` strip is at `battleScriptHitChainOpcode.ts:2552-2554`. |
| `battleScriptActionAdmission.ts:3780` | `CANCELER_THAW Level-50 singles attacker must be battler 0 or 1` | **PROVED (by scope)** | Same gate as `:3512` (`battle_controllers.c:177`). |
| `battleScriptActionAdmission.ts:2365` *(2nd pass)* | `imprisoned-move attacker must be a battler id 0..3` | **TS-CONTRACT** | Domain check at `scanBattleScriptImprisonedMoves`'s entry on a parameter already typed `BattleScriptBattlerId`. The C counterpart `GetImprisonedMovesCount` (`battle_util.c:1142-1163`) takes `u8 battler` and applies **no** guard at all — it calls `GetBattlerSide(battler)` unconditionally at `:1146`. The port's check is therefore port-internal, over a value no game state can widen. |
| `battleScriptActionAdmission.ts:2368` *(2nd pass)* | `imprisoned-move move must be a u16` | **TS-CONTRACT** | Same entry block; mirrors the C parameter type `u16 move` (`battle_util.c:1142`). No C guard exists to port; the value comes from `rulesContext.currentMove`, itself `requireUnsigned(..., 0xffff)` at context construction (`battleScriptRulesContext.ts`, class C). |
| `battleScriptActionAdmission.ts:2379` *(2nd pass)* | `imprisoned-move attacker side must be 0 or 1` | **TS-CONTRACT** | Reads `rulesContext.battlers[attacker].side`. In C the side is `GetBattlerSide(battler)` = `gBattlerPositions[battler] & BIT_SIDE` (`battle_util.c:1146`), a one-bit expression that cannot be anything else; there is no C state to rule out. The port's cell is fixed by `createBattleScriptRulesContext` and never written mid-turn. |
| `battleScriptActionAdmission.ts:2385` *(2nd pass)* | `imprisoned-move battler <i> side must be 0 or 1` | **TS-CONTRACT** | Same cell, per-battler, inside the scan loop that ports `battle_util.c:1148`'s `battlerSide != GetBattlerSide(i)` test. Same reasoning. |
| `battleScriptActionAdmission.ts:2388` *(2nd pass)* | `imprisoned-move battler <i> must have exactly four move slots` | **TS-CONTRACT** | Ports the fixed `MAX_MON_MOVES` loop bound at `battle_util.c:1152` (`for (j = 0; j < MAX_MON_MOVES; j++)`), which is a compile-time constant in C — not a checked condition. The port's `battlers[i].moves` is a frozen four-element tuple built at context construction. |
| `battleScriptActionAdmission.ts:2400` *(2nd pass)* | `imprisoned-move battler <i> move slot <j> must be a u16` | **TS-CONTRACT** | Element-wise domain check on the same frozen tuple; C reads `gBattleMons[i].moves[j]` (`battle_util.c:1154`) with no validation. |

> **Second-pass census correction.** The first pass's §3.6 tally listed **5** unclassified sites in this file ("the imprisoned-move scan cluster, `:2365`–`:2400`"). Re-running the stage-2 filter with reassembled messages yields **6** premise-worded sites in that cluster (the six above); a seventh sibling at `:2375` ("imprisoned-move scan requires exactly four indexed battlers") is the same TS-CONTRACT shape but is missed by the stage-2 word list, which has no `requires`. It is recorded here for completeness and is not counted in §3.7.

### 3.2 Switch / faint orchestration

| file:line | message (trimmed) | verdict | evidence |
| --- | --- | --- | --- |
| `battleScriptSwitchinOpcode.ts:347` | `Cmd_switchhandleorder: battler N has no decided monToSwitchIntoId -- openpartyscreen must run first` | **UNPROVEN** | **The source has no such precondition.** `Cmd_switchhandleorder` cases 2 and 3 *write* the cell rather than requiring it: `battle_script_commands.c:5183-5191` does `gBattleCommunication[0] = gBattleBufferB[gActiveBattler][1]; *(gBattleStruct->monToSwitchIntoId + gActiveBattler) = gBattleBufferB[gActiveBattler][1];` — the value comes from the controller buffer at the moment the opcode runs, so a `PARTY_SIZE` sentinel there is simply not a state the C can be in. The port instead stores the decision directly in `monToSwitchIntoId` and asserts it was decided upstream, which makes the throw a *port-internal* contract with no source backing. The #126 tell is already on record: ISSUES #121 documents that the engine omits **both** the `Cmd_openpartyscreen` clear `*(gBattleStruct->monToSwitchIntoId + gActiveBattler) = PARTY_SIZE` (`battle_script_commands.c:5117`) **and** `GetMostSuitableMonToSwitchInto`'s early return on a pre-decided id (`battle_ai_switch_items.c:646-647`). The cell's lifecycle in the port therefore already diverges from the source's at both ends of this premise. |
| `battleScriptSwitchinOpcode.ts:387` | `Cmd_getswitchedmondata: battler N has no decided monToSwitchIntoId -- openpartyscreen must run first` | **UNPROVEN** | Same defect, one opcode later. `Cmd_getswitchedmondata` (`battle_script_commands.c:4606-4619`) reads `gBattlerPartyIndexes[gActiveBattler] = *(gBattleStruct->monToSwitchIntoId + gActiveBattler)` unconditionally — no sentinel check, no failure mode. Whatever is in the cell is committed. The port adds a premise the C does not have. |
| `battleScriptFaintedActionsOrchestration.ts:322` | `fainted-actions orchestration hit an unexpected <kind> step inside <label>` | **TS-CONTRACT** — *reclassified 2nd pass; the first pass's reading of the result union was wrong* | The throw's guard is `if (stepped.kind !== "advanced")` (`:321`), reached only after the three other variants are handled above it: `blocked` at `:286-297` (auto-acknowledged, then `continue`), `scheduler-progressed` at `:300-303`, and `halted` at `:304-320` — whose own tail at `:317-319` returns `kind: "barrier"` for a registered opcode's (b) halt. `stepBattleScriptMachine`'s return type is a closed four-variant union — `advanced` / `scheduler-progressed` / `blocked` / `halted` (`battleScriptMachine.ts:248-251`) — so the residual arm is a `never` exhaustiveness guard with no inhabitants. The first pass claimed the controller-busy `blocked` transition (`battleScriptMachine.ts:890`) reaches it; `blocked` is in fact consumed at `:286`, twenty-five lines earlier. Neither a barrier nor a `blocked` step can crash here. |

### 3.3 Damage / status / stat-stage handling

| file:line | message (trimmed) | verdict | evidence |
| --- | --- | --- | --- |
| `battleScriptStatbuffchangeOpcode.ts:121` | `Cmd_statbuffchange: changeStatBuffs returned blocked-silent, but every concrete statbuffchange call site sets STAT_CHANGE_ALLOW_PTR -- unreachable in the real topology` | **PROVED** | All **31** `statbuffchange` invocations in `data/battle_scripts_1.s` carry `STAT_CHANGE_ALLOW_PTR` (verified by `rg -n "statbuffchange" data/*.s \| rg -v STAT_CHANGE_ALLOW_PTR` returning nothing); `include/constants/battle_script_commands.h:371` states the same ("Set in every use of statbuffchange"). The C tests exact equality `flags == STAT_CHANGE_ALLOW_PTR` (`battle_script_commands.c:6965`, `:6991`, `:7012`, `:7025`) *after* stripping the three co-flags at `:6943-6957` (`MOVE_EFFECT_AFFECTS_USER`, `MOVE_EFFECT_CERTAIN`, `STAT_CHANGE_NOT_PROTECT_AFFECTED`), so composite call sites still reduce to exactly the ALLOW_PTR bit. **Port half:** `battleScriptStatBuffs.ts:186-193` strips the identical three bits in the identical order and computes `allowPtr = flags === STAT_CHANGE_ALLOW_PTR`. The blocked-silent producer at `battleScriptStatBuffs.ts:302` fires only under `!allowPtr`, and its other caller (`battleScriptHitChainOpcode.ts:3964`, the Intimidate/ability route with `jumpProgramCounter: null`) handles it as an ordinary advance instead of throwing. |
| `battleScriptHitChainOpcode.ts:3475` | `applySetMoveEffect: unreachable MOVE_EFFECT_BYTE <n>` | **PROVED** — *reclassified 2nd pass; Draft D's open question resolved* | The `default:` arm of a switch whose cases are the six primary statuses, entered whenever `effectByte <= PRIMARY_STATUS_MOVE_EFFECT` (`include/constants/battle.h:253`, `= MOVE_EFFECT_TOXIC = 6`), so only `effectByte === 0` (`MOVE_EFFECT_NONE`) has no case. In C byte 0 is a **tolerated no-op**, not an error: `SetMoveEffect` switches on `sStatusFlagsForMoveEffects[...]` (`battle_script_commands.c:2268-2271`) whose entry for 0 is 0 and matches no `case`. So the C rules nothing out and the premise rests entirely on the port's callers — **and all five of them provably filter byte 0.** (1) `:2979` Tri Attack recursion passes `(randomValue % 3) + MOVE_EFFECT_BURN` ∈ {3,4,5}. (2) `:4051`, the secondary-effect roll in `createSeteffectwithchanceOpcodeHandler`, is guarded by `rolledSuccess && rulesContext.moveEffectByte !== 0 && !noEffect`, mirroring `Cmd_seteffectwithchance`'s own `&& gBattleCommunication[MOVE_EFFECT_BYTE]` (`battle_script_commands.c:2924-2926`). (3) `:4024`, the same handler's `certain` branch, computes `moveEffectByte & ~MOVE_EFFECT_CERTAIN` and so would pass 0 only for a bare `MOVE_EFFECT_CERTAIN` (0x80) byte; every one of the eight `MOVE_EFFECT_CERTAIN` uses in `data/battle_scripts_1.s` (`:898`, `:1114`, `:1717`, `:2051`, `:2270`, `:2389`, `:2568`, `:2649`) ORs it with a nonzero effect, so the committed program cannot produce that byte. (4) `:4073` `Cmd_seteffectprimary` passes `moveEffectByte` raw, but every `seteffectprimary` in `data/battle_scripts_1.s` (`:297`, `:702`, `:803`, `:915`, `:1002`, `:1022`, `:1126`, `:1454`, `:1471`, `:1628`, `:1916`, `:2171`, `:2188`, `:2588`, `:4248`, `:4406`) is preceded by a nonzero `setmoveeffect` in the same script; the sole exception is `BattleScript_SynchronizeActivates` (`:4205-4207`), entered only from `AbilityBattleEffects` cases `ABILITYEFFECT_SYNCHRONIZE` / `ATK_SYNCHRONIZE` (`battle_util.c:2971-3000`) under the guard `gLastUsedAbility == ABILITY_SYNCHRONIZE && (gHitMarker & HITMARKER_SYNCHRONIZE_EFFECT)`, whose byte is `gBattleStruct->synchronizeMoveEffect` — written only at `battle_script_commands.c:2508-2509` inside `SetMoveEffect`'s status tail, guarded at `:2503-2506` by the four-way `POISON/TOXIC/PARALYSIS/BURN` test that also raises the marker at `:2510`, hence never 0 (and the `&= ~(AFFECTS_USER \| CERTAIN)` at `:2975` cannot clear those low values). (5) `:4097` `Cmd_seteffectsecondary`: the only `seteffectsecondary` is `BattleScript_ApplySecondaryEffect` (`data/battle_scripts_1.s:4199-4202`), entered only from the four contact-ability branches at `battle_util.c:2801` / `:2816` / `:2831` / `:2846`, each assigning a nonzero byte — Effect Spore's `do { gBattleCommunication[MOVE_EFFECT_BYTE] = Random() & 3; } while (== 0)` (`:2790-2794`) excludes 0 explicitly. **Port half — both mirrors confirmed:** `battleScriptMoveEndOpcode.ts:604-607` writes `MOVE_EFFECT_AFFECTS_USER \| moveEffect` for the contact abilities with the same do-while at `:592-596`, and `battleScriptHitChainOpcode.ts:3493-3504` raises `HITMARKER_SYNCHRONIZE_EFFECT` and sets `synchronizeMoveEffect` only on the identical four-way `synchronizable` test, which `battleScriptMoveEndOpcode.ts:312-330` then requires before jumping to `BattleScript_SynchronizeActivates`. Byte 0 therefore cannot reach the switch. |
| `battleScriptMoveEndOpcode.ts:271` | `Cmd_moveend: statStages width invariant violated` | **TS-CONTRACT** | `replaceStatStage` (`:264-275`) spreads a fixed-width tuple into `mutable`, assigns one index, then checks `mutable.length`. Array spread cannot change length and the index is a typed stat id. No game state is involved. |
| `battleScriptMultiTurnCancellation.ts:52` | `CancelMultiTurnMoves battler must be a battler id 0..3` | **TS-CONTRACT** | Domain check on a `BattleScriptBattlerId`-typed parameter at a pure helper's entry; the type already excludes out-of-range values and no caller widens it. |

### 3.4 Round-controller / decision seams

| file:line | message (trimmed) | verdict | evidence |
| --- | --- | --- | --- |
| `factoryBattleScriptFullTurnDecision.ts:2512` | `factory full-turn decision forced-switch resume cannot resolve the acting battler at the current turn position` | **PROVED (by construction)** — *reclassified 2nd pass; Draft E resolved* | The throw is reached only when `resumeAt === "run-end-turn"` **and** (`actingBattler === undefined` **or** `actingBattler >= battleTopology.battlersCount`), where `actingBattler = rulesContext.battlerByTurnOrder[rulesContext.currentTurnActionNumber]` (`:2502-2503`). Neither disjunct has an inhabitant. `battlerByTurnOrder` is a frozen **four**-element tuple, typed `readonly [number, number, number, number]` (`battleScriptRulesContext.ts:883`) and built with four `requireUnsigned(..., 3, ...)` slots defaulting to `0,1,2,3` (`:2815-2819`), so indices 0..3 are always defined; the index can only escape that range if `currentTurnActionNumber >= 4`. Its sole writer on this path is `withTurnOrderPositions` (`factoryBattleScriptFullTurnDecision.ts:1930-1953`), called with the literal `0` at `:3007` (turn start, movers `mover1`/`mover2`) and the literal `1` at `:2771-2775` (between the two actions), writing `battlerByTurnOrder = [mover1, mover2, 2, 3]`; slots 2/3 are inert padding that `currentTurnActionNumber` never indexes here, and `mover1`/`mover2` are `BattleScriptBattlerId` values from this reducer's own two-mover singles shape, i.e. 0 and 1, both `< battlersCount === 2`. The only `resumeAt: "run-end-turn"` producer (`:2730`, inside `continueFullTurnAfterAction`) snapshots `faint.state.rulesContext` **before** `handleBattleActionFinished`'s `currentTurnActionNumber + 1` (`battleActionFinished.ts:140`) can run — that bump happens at `:2669-2677`, after the resume. **Source half:** the C carries the matching invariant. `gBattlerByTurnOrder[MAX_BATTLERS_COUNT]` (`battle_main.c:161`) is filled per battler by `SetActionsAndBattlersTurnOrder` (`:4766`, `:4800`, `:4807`, `:4822`, `:4831`) and `gCurrentTurnActionNumber` is zeroed at `:4926` and dispatched from `gActionsByTurnOrder[gCurrentTurnActionNumber]` at `:4927`, with `RunTurnActionsFunctions` handing off to the end-turn table the moment `gCurrentTurnActionNumber >= gBattlersCount` (`:4945`) — so the source never indexes the array past the live battler count either. Note this is a port-internal derivation corroborated by the C, not a C guard the port copies: the source has no equivalent failure mode at all (`Cmd_openpartyscreen` takes the battler as an opcode operand, `battle_script_commands.c:5108-5124`). |
| `factoryBattleScriptFullTurnDecision.ts:2624` | `factory full-turn decision forced-switch resume produced an unexpected <kind> result` | **TS-CONTRACT** — *reclassified 2nd pass; the first pass mis-read this arm's guard* | The message interpolates `orchestration.kind`, but the arm is **not** a catch-all: its guard is `if (orchestration.kind === "no-fainted-battlers")` (`:2623`). It rejects exactly one named variant of `BattleScriptFaintedActionsResult`, and that variant is constructed at exactly one place — `battleScriptFaintedActionsOrchestration.ts:354`, inside the **fresh** entry `runBattleScriptFaintedActionsOrchestration`. The resume entry this seam calls, `resumeBattleScriptFaintedActionsAfterPlayerChoice` (`:592-650`), never constructs it: it requires a `player-choice-required` halt (`:598-603`), rewrites `monToSwitchIntoId`, and returns only what `runScriptToOwnEnd` yields — `player-choice` (republished as a second forced-switch boundary at `factoryBattleScriptFullTurnDecision.ts:2588-2621`, ISSUES #119), `non-terminal-barrier` (`:643`), `terminal`, or `resumed`. Barriers are therefore **not** rejected here; they flow to the terminal/finalize tail. |
| `factoryBattleScriptTerminalDecision.ts:722` | `factory terminal decision forced-switch resume produced an unexpected <kind> result` | **TS-CONTRACT** — *reclassified 2nd pass* | Identical shape to `:2624`: the guard is `if (orchestration.kind === "no-fainted-battlers")` (`:721`), over the same `resumeBattleScriptFaintedActionsAfterPlayerChoice` call (`:682-687`) that cannot produce that variant, and the same ISSUES #119 second-player-choice republication sits above it at `:688-719`. |
| `factoryBattleScriptDecision.ts:474` | `awaiting-command phase must not already own a selected move` | **TS-CONTRACT** | Phase invariant on the decision-boundary state machine, checked at `rulesAt` when rebuilding a context; the phase tag and the selected-move cell are both port-owned and set together. |
| `factoryAiDecisionPolicy.ts:988` | `Factory AI turn-start random-number owner must be decision or battle-turn-boundary` | **TS-CONTRACT** | Exhaustiveness `else` over a two-variant discriminated union whose tag is validated by `exactKeys` on the two branches above (`:966`, `:976`). No game state can produce a third tag. |
| `battleScriptCallbackStack.ts:223` | `activateAbilityScript: end3 underflow immediately after its own matching push -- unreachable, indicates a bug in this prototype` | **TS-CONTRACT** | `pushCursorAndCallback` at `:219` and `popEnd3` at `:221` operate on the same local `stack` value with no intervening mutation. The premise is about this function's four lines, not about battle state. |
| `battleScriptTryhealhalfhealthOpcode.ts:51` | `Cmd_tryhealhalfhealth: unexpected battler operand <x> -- the committed program's only …` | **TS-CONTRACT** | Guards the operand of the *committed* battle-script program, a module-load constant; the same file asserts the instruction count at construction. Not reachable from a game state. |
| `battleScriptMagicCoat.ts:471` | `Battle Script Magic Coat join cannot push a full BattleScriptsStack` | **UNPROVEN** | The C `BattleScriptPush` has no overflow error path — `gBattleResources->battleScriptsStack` overrun is silent in the source, so there is no C line that rules the state out and none that makes it an error. Depth reachability under Magic Coat + nested effect scripts was not computed; scenario not constructed in time. |

| `factoryBattleScriptFullTurnDecision.ts:2564` *(2nd pass)* | `factory full-turn decision move-action resume unexpectedly halted on a second player-choice-required opcode` | **UNPROVEN** | The ISSUES #89 mid-action resume path (`resumeAt` `"run-action1"`/`"run-action2"`): the port rewrites `monToSwitchIntoId`, resumes the halted **move** script with `runScriptToOwnEnd` (`:2559`), and throws if that run halts on a second `player-choice-required` opcode (`:2562-2566`). The sibling *fainted-dance* path already knows this is a real state — `:2588-2621` republishes it as an ordinary second forced-switch boundary, citing ISSUES #119. **The source reaches the same re-entry from a move script.** `Cmd_switchineffects` (`battle_script_commands.c:5219`) applies Spikes to the switched-in battler under the guard at `:5228-5231` (`!(gSideStatuses[side] & SIDE_STATUS_SPIKES_DAMAGED) && (gSideStatuses[side] & SIDE_STATUS_SPIKES) && !IS_BATTLER_OF_TYPE(..., TYPE_FLYING) && ability != ABILITY_LEVITATE`) and then dispatches **by the opcode's own operand** at `:5248-5253`: `BS_TARGET` → `BattleScript_SpikesOnTarget`, `BS_ATTACKER` → `BattleScript_SpikesOnAttacker`, else → `BattleScript_SpikesOnFaintedBattler`. `BattleScript_EffectBatonPass` ends in `switchineffects BS_ATTACKER` (`data/battle_scripts_1.s:1713`) after its own `openpartyscreen BS_ATTACKER` at `:1702`, so a Baton-Passed replacement that faints to Spikes takes `tryfaintmon_spikes BS_ATTACKER, BattleScript_SpikesOnAttackerFainted`, and that script's tail is `goto BattleScript_HandleFaintedMon` (`:3396-3400`) — whose `openpartyscreen BS_FAINTED` halts player-choice-required **inside the same script run**, exactly #119's shape one script over. **Port half:** the port models this branch — `battleScriptSwitchinOpcode.ts:1143-1160` reproduces the same `SIDE_STATUS_SPIKES_DAMAGED` guard and picks `"BattleScript_SpikesOnAttacker"` vs `"BattleScript_SpikesOnFaintedBattler"` at `:1155-1156`. Scenario in §4. |
| `factoryBattleScriptFullTurnDecision.ts:593` *(2nd pass)* | `staged parties must contain exactly PARTY_SIZE slots` | **TS-CONTRACT** | Runs inside `createInitialRules` on two array literals the same function just built (`:576-591`), before `createBattleScriptRulesContext`. Construction-time shape check, not a mid-turn state. |
| `factoryBattleScriptFullTurnDecision.ts:760` *(2nd pass)* | `pendingScript.pendingSecondAction must be a valid resolved action` | **TS-CONTRACT** | `pendingSecondActionAt(value: unknown)` re-validates the port's own persisted JSON rules payload field-by-field (`:752-760`: `mover`, `switchPartyIndex`, `moveId`, `moveSlot`, `target`, `forcedStruggle`). Same class as §2b's class C, surviving the file-group filter only because the module also holds live-kernel code. |
| `factoryBattleScriptFullTurnDecision.ts:797` *(2nd pass)* | `pendingScript must be a valid halted-script bundle` | **TS-CONTRACT** | Same: `pendingScriptAt(value: unknown)` checks `programCounter`/`callStack`/`resumeAt` on the deserialized durable bundle (`:783-797`). |
| `factoryBattleScriptTerminalDecision.ts:342` *(2nd pass)* | `staged opponent party must contain exactly PARTY_SIZE slots` | **TS-CONTRACT** | Construction-time, mirroring `factoryBattleScriptFullTurnDecision.ts:593`. |
| `factoryBattleScriptTerminalDecision.ts:427` *(2nd pass)* | `pendingScript must be a valid halted-script bundle` | **TS-CONTRACT** | Same parse-boundary validator as `factoryBattleScriptFullTurnDecision.ts:797`, minus the `resumeAt` arm. |
| `factoryBattleScriptDecision.ts:168` *(2nd pass)* | `<label> must identify a complete Level-50 Factory set` | **TS-CONTRACT** | `frontierSet(...)` checks a generated-data lookup (`row.index !== setId \|\| row.moves.length !== 4`) at the JSON decision boundary. Generated-data contract, not battle state. |
| `factoryBattleScriptDecision.ts:195` *(2nd pass)* | `commandSide must be player or trainer` | **TS-CONTRACT** | `commandSideAt(value: unknown)` — two-value domain check on a deserialized tag. |
| `factoryAiDecisionPolicy.ts:126` *(2nd pass)* | `<label> must <expectation>` | **TS-CONTRACT** | The module's own `fail(label, expectation): never` helper — the message template for every validator in the file. It is the same class-A shape §2b excluded elsewhere; it survived the filter only because the helper is named `fail`, not `assert*`/`require*`. |
| `factoryAiDecisionPolicy.ts:155` *(2nd pass)* | `<label> must have exactly keys <...>` | **TS-CONTRACT** | `exactKeys(...)` — frozen-shape check on a deserialized record; same class-A shape, same naming reason. |

### 3.5 Opcode-module, legacy-model, and round-controller singletons (second pass)

| file:line | message (trimmed) | verdict | evidence |
| --- | --- | --- | --- |
| `core.ts:1364` | `generated postwin NO must publish swapResolved` | **TS-CONTRACT** | Inside `tick`, guarded by `pending?.type === "swapOffer"` (`:1354`). The two calls between the guard and the check are straight-line: `chooseFactoryRoundSwap` (`factoryRoundBattleOrchestrator.ts:1156-1165`) delegates to `chooseRoundSwap` (`roundController.ts:530-611`), whose decline path takes no `fail()` branch and ends in `issueCommand(..., { type: "swapResolved", ... })` at `:596-610`; `issueCommand` (`:112-127`) unconditionally sets `presentation = { command: fullCommand, completed: false }`. So `resolved?.type` is `"swapResolved"` or the call has already thrown a `RoundTransitionError` (`:108-110`) — the premise's own state is unreachable. Port-internal orchestration over the port's own reducer; no game state and no C counterpart (the real seam is the Lobby's swap script, `BattleFrontier_BattleFactoryBattleRoom/scripts.inc`). |
| `battleTurn.ts:130` | `<actor> cannot use <move> with PP <pp>` | **TS-CONTRACT** | `resolveBattleTurn` is the **legacy fixture-driven staged-turn model**, not the kernel: `scenario.actions` and `scenario.initial.<side>.moves` are both authored in the `BattleTurnScenario` literal, and the function's only production consumer is `stagedBattleTurn.ts:173`, which feeds it `state.scenario` — a staged fixture (`:55-62`, `:88`, guarded by its own `if (!state.scenario)` at `:167`). No kernel transition writes that PP map. This is really §2b's class **B** (staging), surviving the file-group filter only because the filename does not match the `turn*PresentationStaging.ts` pattern. |
| `battleTurn.ts:174` | `turnEndRngGroups[<g>] must be a non-negative integer` | **TS-CONTRACT** | Same function, same fixture-owned input: `turnEndRngGroups` is the scenario's own "source BattleTurnPassed/AI setup draw clusters, kept explicit" field (`battleTurn.ts:41-42`). |
| `battleScriptTrywishOpcode.ts:122` | `committed Battle Script program must emit two B_SCR_OP_TRYWISH instructions, found <n>` | **TS-CONTRACT** | Runs inside `createBattleScriptTrywishOpcodeHandlers`, i.e. at handler construction against the **committed program constant**, before any battle exists. Shape assertion on a module-load artefact — the same class as the already-classified `battleScriptTryhealhalfhealthOpcode.ts:51`. |
| `battleScriptTrywishOpcode.ts:126` | `committed B_SCR_OP_TRYWISH instructions must share source opcode 0xd4` | **TS-CONTRACT** | Same construction-time block, one line later. |
| `battleScriptSetsubstituteOpcode.ts:81` | `committed Battle Script program must emit one B_SCR_OP_SETSUBSTITUTE, found <n>` | **TS-CONTRACT** | Same family, in `createBattleScriptSetsubstituteOpcodeHandlers`. |
| `battleScriptTrysetfutureattackOpcode.ts:175` | `expected one B_SCR_OP_TRYSETFUTUREATTACK, got <n>` | **TS-CONTRACT** | Same family, in `createBattleScriptTrysetfutureattackOpcodeHandlers`. |
| `battleScriptSetdestinybondOpcode.ts:50` | `committed Battle Script program must emit one B_SCR_OP_SETDESTINYBOND, found <n>` | **TS-CONTRACT** | Same family, in `createBattleScriptSetdestinybondOpcodeHandlers`. |
| `battleScriptDisablelastusedattackOpcode.ts:98` | `expected one B_SCR_OP_DISABLELASTUSEDATTACK, got <n>` | **TS-CONTRACT** | Same family, in `createBattleScriptDisablelastusedattackOpcodeHandlers`. |
| `battleScriptFriendshipToDamageOpcode.ts:38` | `attacker friendship must be a source u8, got <n>` | **TS-CONTRACT** | Domain check at `friendshipToDynamicBasePower`'s entry. The C (`Cmd_happinesstodamage`, `battle_script_commands.c`) reads `gBattleMons[gBattlerAttacker].friendship` — a `u8` field, unguarded. The port's cell is `requireUnsigned(..., 0xff)` at rules-context construction; nothing mid-turn can widen it. |
| `battleScriptWeightDamageOpcode.ts:32` | `Pokédex weight must be a nonnegative integer hectogram value, got <n>` | **TS-CONTRACT** | Domain check at `lowKickPowerForWeight`'s entry on a generated `gSpeciesInfo` weight. Generated-data contract; the C indexes the same table unguarded. |

### 3.6 UNCLASSIFIED — none remaining in the files the first pass listed

The first pass's §3.5 named 14 files holding 24 unclassified sites. Re-running
the stage-2 filter over those 14 files with reassembled messages, minus §2's
class-A/B/C exclusions, yields **26** — the per-file tallies for
`battleScriptActionAdmission.ts` (6, not 5 — see §3.1's census-correction note)
and `factoryBattleScriptFullTurnDecision.ts` (4, not 3: `:593`, `:760`, `:797`,
`:2564`) were each one low. All 26 are classified above; the count moved up, not
down.

| File | Sites | Now classified in |
| --- | --- | --- |
| `battleScriptActionAdmission.ts` | 6 (`:2365`, `:2368`, `:2379`, `:2385`, `:2388`, `:2400`) | §3.1 |
| `factoryBattleScriptFullTurnDecision.ts` | 4 (`:593`, `:760`, `:797`, `:2564`) | §3.4 |
| `factoryAiDecisionPolicy.ts` | 2 (`:126`, `:155`) | §3.4 |
| `factoryBattleScriptTerminalDecision.ts` | 2 (`:342`, `:427`) | §3.4 |
| `factoryBattleScriptDecision.ts` | 2 (`:168`, `:195`) | §3.4 |
| `battleTurn.ts` | 2 (`:130`, `:174`) | §3.5 |
| `battleScriptTrywishOpcode.ts` | 2 (`:122`, `:126`) | §3.5 |
| `battleScriptSetsubstituteOpcode.ts` | 1 (`:81`) | §3.5 |
| `battleScriptTrysetfutureattackOpcode.ts` | 1 (`:175`) | §3.5 |
| `battleScriptSetdestinybondOpcode.ts` | 1 (`:50`) | §3.5 |
| `battleScriptDisablelastusedattackOpcode.ts` | 1 (`:98`) | §3.5 |
| `battleScriptFriendshipToDamageOpcode.ts` | 1 (`:38`) | §3.5 |
| `battleScriptWeightDamageOpcode.ts` | 1 (`:32`) | §3.5 |
| `core.ts` | 1 (`:1364`) | §3.5 |

**UNCLASSIFIED = 0** for these files. The honest caveat is in §3.7 and §6: this
pass re-censused only the 14 files §3.5 named, so files outside that list were
not re-derived, and the §1 stage-3 figure of 48 is superseded as an
approximation (the first pass's own arithmetic — 23 in-population rows
classified plus a 24-row remainder — already summed to 47 against it).

### 3.7 Counts

| Verdict | Count | Δ from the first pass |
| --- | --- | --- |
| **PROVED** (incl. PROVED-by-scope / by-construction, incl. the bonus `:3547` row) | **10** | +2 (`battleScriptHitChainOpcode.ts:3475`, `factoryBattleScriptFullTurnDecision.ts:2512`) |
| **TS-CONTRACT** | **36** | +28 (25 second-pass rows + `:2624`, `:722`, `battleScriptFaintedActionsOrchestration.ts:322` reclassified) |
| **UNPROVEN** | **4** | −4 (5 reclassified out, `factoryBattleScriptFullTurnDecision.ts:2564` classified in) |
| **UNCLASSIFIED** | **0** | −24 |
| Total rows in §3 | **50** | +26 |

The four UNPROVEN rows are `battleScriptSwitchinOpcode.ts:347`, `:387`,
`factoryBattleScriptFullTurnDecision.ts:2564`, and `battleScriptMagicCoat.ts:471`.

*Supervisor note (2026-08-25):* the `HandleAction_ActionFinished` reset
`*(gBattleStruct->monToSwitchIntoId + battler) = PARTY_SIZE` after **every**
action and the turn-start loop at `battle_main.c:4008-4009` are additional
source lifecycle events for §4 item 1's cell; they belong with ISSUES #121's
two already-recorded omissions.

---

## 4. Ranked UNPROVEN list — most reachable first

*Re-ranked on the second pass. Four rows survive; five of the first pass's
eight were reclassified (`:3475` and `:2512` to PROVED; `:2624`, `:722` and
`battleScriptFaintedActionsOrchestration.ts:322` to TS-CONTRACT), the
withdrawn `:3517` item stays withdrawn below for the record, and one new row
enters at #2.*

**1. `battleScriptSwitchinOpcode.ts:347` + `:387` — undecided `monToSwitchIntoId` at `Cmd_switchhandleorder` / `Cmd_getswitchedmondata`.**
*Why reachable:* the premise has no source counterpart at all — the C writes the
cell from `gBattleBufferB` at the moment the opcode runs
(`battle_script_commands.c:5183-5191`) and reads it unconditionally at
`:4606-4619`. In the port the cell is a persistent decision slot whose two
source lifecycle events are both missing (ISSUES #121: no `:5117` clear, no
`:646-647` early return), so its value is governed entirely by port-internal
ordering. Every faint in every battle runs this pair; only the port's own
sequencing keeps the sentinel out.
*Cheapest instrument:* soak, not staging — `winning` / `winning-swap` with
`--vary-rng --first-round` over carries 0/14/28 already drives thousands of
faint→replace cycles per sweep; add Roar/Whirlwind and Baton Pass carriers to
the party mix so forced-switch paths that bypass `openpartyscreen` are exercised
(`battleScriptForceSwitchOpcode.ts` writes the same cell). #126 was found by
exactly this instrument at 1/600 chains.
*Likely fix layer:* **the missing upstream guard**, not the throw. Port the
`:5117` clear and the `:646-647` early return (already scoped as #121), then
re-derive whether the sentinel state is a real machine state — if it is, the
opcode should assign from the decision like the C does, not assert.

**2. `factoryBattleScriptFullTurnDecision.ts:2564` — a second forced switch inside a mid-action resume (ISSUES #119's shape on the #89 path).** *(new, second pass)*
*Why reachable:* the sibling path already concedes the state is real. When the
**fainted dance** resumes and halts a second time on `openpartyscreen`, the same
function republishes it as an ordinary forced-switch boundary and cites ISSUES
#119 for why (`:2588-2621`). The **mid-action** resume — ISSUES #89's
`resumeAt` `"run-action1"`/`"run-action2"`, where the halted script is a move
script such as `BattleScript_EffectBatonPass` — throws instead (`:2562-2566`).
The source reaches the same re-entry from a move script:
`Cmd_switchineffects` (`battle_script_commands.c:5219`) applies Spikes under the
guard at `:5228-5231` and dispatches by its own operand at `:5248-5253`, so
Baton Pass's `switchineffects BS_ATTACKER`
(`data/battle_scripts_1.s:1713`) selects `BattleScript_SpikesOnAttacker`, whose
`tryfaintmon_spikes BS_ATTACKER, BattleScript_SpikesOnAttackerFainted` tail
(`:3390-3400`) ends in `goto BattleScript_HandleFaintedMon` — and that script's
`openpartyscreen BS_FAINTED` halts player-choice-required **inside the same
`runScriptToOwnEnd`** the port just started at `:2559`. The port models the
whole branch (`battleScriptSwitchinOpcode.ts:1143-1160`).
*Concrete Level-50 singles scenario:* the opponent has Spikes down on the
player's side from an earlier turn (one layer is enough: `spikesDmg = (5 -
layers) * 2` → `maxHP / 8`). The player's active mon uses Baton Pass; the human
picks a benched rental already chipped below `maxHP / 8` (residual damage from
an earlier switch or a previous Spikes hit). On resume the replacement takes
Spikes damage, faints on entry, and the same script re-enters
`openpartyscreen`. Not Flying-type and not Levitate, per the `:5230-5231`
guard.
*Cheapest instrument:* soak with a directed pool — `winning-coverage
--vary-rng` biased to rentals carrying SPIKES and BATON_PASS, since both must
appear in one battle. A directed alternative: a `mechanicLab`
`overrides.parties` recipe — opponent knows SPIKES only, player's lead knows
BATON_PASS only, player's bench slot staged low by taking real damage first —
then read whether the ROM asks for a second switch inside the same script.
*Likely fix layer:* **the throw** — republish the pending bundle exactly as
`:2588-2621` already does for the dance path, keeping this pause's own
`resumeAt` and banked second action.

**3. `battleScriptMagicCoat.ts:471` — Magic Coat join onto a full script stack.**
*Why reachable:* no C error path exists to inherit; `BattleScriptPush` overruns
silently in the source, so the port's premise is stricter than the game.
*Scenario:* **not constructed.** Requires computing the port's maximum
nested-script depth under Magic Coat plus ability/item callbacks against the
source stack size. Unchanged from the first pass.
*Cheapest instrument:* static depth analysis of `pushCursorAndCallback` callers;
a soak is unlikely to reach it by chance.
*Likely fix layer:* undetermined until depth is known.

**4. ~~`battleScriptActionAdmission.ts:3517` — `CANCELER_BIDE` with any absent battler.~~ WITHDRAWN (supervisor verification 2026-08-25 — see the corrected §3.1 row: the cited raise sites are `Cmd_openpartyscreen`'s no-replacement branches, unreachable in a continuing singles battle; the port's invariant holds).**
*Why reachable (original, refuted):* the source spends two lines handling this exact state
(`battle_util.c:2237-2238`) — you do not write a redirect for a state that
cannot occur. `gAbsentBattlerFlags` is nonzero for the whole window between a
faint (`battle_script_commands.c:4886`…`:5109`) and the replacement's switch-in
(`:4689`). Note the port's condition is broader than the source's: it throws on
`absentBattlerFlags !== 0` (any battler) where the C tests only the Bide
target's bit.

**Resolved on the second pass, no longer ranked:**

- `battleScriptHitChainOpcode.ts:3475` (`MOVE_EFFECT_NONE`) → **PROVED**. All
  five port call sites filter byte 0; the two script-entered ones
  (`BattleScript_SynchronizeActivates`, `BattleScript_ApplySecondaryEffect`) get
  their byte from C paths that cannot write 0. Full citation chain in §3.3.
- `factoryBattleScriptFullTurnDecision.ts:2512` (forced-switch resume battler)
  → **PROVED (by construction)**. `battlerByTurnOrder` is a frozen four-tuple and
  `currentTurnActionNumber` is written only as the literals 0 and 1 on this path.
  Full derivation in §3.4.
- `factoryBattleScriptFullTurnDecision.ts:2624`,
  `factoryBattleScriptTerminalDecision.ts:722`,
  `battleScriptFaintedActionsOrchestration.ts:322` → **TS-CONTRACT**. The first
  pass's "sanctioned barriers become crashes" reading was wrong: the two Factory
  seams reject only `orchestration.kind === "no-fainted-battlers"`, a variant the
  resume entry never constructs, and `:322` is a `never` guard over a closed
  four-variant step union whose other three variants are all handled above it.
  See §3.2/§3.4 and the corrected Draft B.

---

## 5. Ready-to-file ISSUES drafts

Not appended to `ISSUES.md` — the supervisor files these. House style: symptom /
confirmed / leads, with exact `file:line` on both the engine and the source.
After the second pass **two remain fileable: Draft A and Draft F.** Drafts B, D
and E are withdrawn (their rows were proved or reclassified TS-CONTRACT) and
Draft C stays withdrawn from the supervisor's correction; all four are kept
below for the record.

### Draft A — `battleScriptSwitchinOpcode.ts:347`/`:387` assert a `monToSwitchIntoId` precondition the source does not have

**Symptom.** `Cmd_switchhandleorder` and `Cmd_getswitchedmondata` each
`throw new Error("… has no decided monToSwitchIntoId -- openpartyscreen must run
first")` when `rules.monToSwitchIntoId[battler] === BATTLE_SCRIPT_PARTY_SIZE`
(`src/engine/battleScriptSwitchinOpcode.ts:346-352` and `:385-391`). This is a
premise, not a barrier: reaching it is a CRASH, on the switch path every faint
in every battle traverses.

**Confirmed from the reference.** The C has no such precondition on either
opcode. `Cmd_switchhandleorder` cases 2/3 *write* the cell from the controller
buffer at the moment the opcode runs —
`battle_script_commands.c:5183-5191` (`gBattleCommunication[0] =
gBattleBufferB[gActiveBattler][1]; *(gBattleStruct->monToSwitchIntoId +
gActiveBattler) = gBattleBufferB[gActiveBattler][1];`) — so a `PARTY_SIZE`
sentinel cannot be observed there. `Cmd_getswitchedmondata`
(`battle_script_commands.c:4606-4619`) reads the cell unconditionally into
`gBattlerPartyIndexes` with no sentinel test and no failure mode. The port's
premise is therefore port-internal, and its two governing source events are
both already known missing: the `Cmd_openpartyscreen` clear
`*(gBattleStruct->monToSwitchIntoId + gActiveBattler) = PARTY_SIZE`
(`battle_script_commands.c:5117`) and `GetMostSuitableMonToSwitchInto`'s early
return on a pre-decided id (`battle_ai_switch_items.c:646-647`) — see #121.

**Leads.** Same shape as #126: a premise resting on an upstream marker the port
does not maintain. Fix order: land #121's two missing lines first, then decide
whether the sentinel is a real machine state; if it is, `switchhandleorder`
should assign from the decision the way `:5183-5191` does rather than assert.
Repro instrument: `winning`/`winning-swap` `--vary-rng --first-round` soak with
Roar/Whirlwind and Baton Pass carriers in the pool, so forced-switch paths that
never run `openpartyscreen` (`src/engine/battleScriptForceSwitchOpcode.ts`) are
exercised against the same cell.

### Draft B — ~~Orchestration seams crash on `unsupported-branch` barriers instead of propagating them~~ WITHDRAWN 2026-08-25 (second pass: the first pass mis-read the result unions — not filed)

**Correction.** The draft claimed three seams
(`factoryBattleScriptFullTurnDecision.ts:2624`,
`factoryBattleScriptTerminalDecision.ts:722`,
`battleScriptFaintedActionsOrchestration.ts:322`) turn a sanctioned (b) barrier
into a crash. Re-derived from the code, none of them does.

- `:2624` and `:722` are **not** catch-alls over the orchestration result union.
  Their guards are `if (orchestration.kind === "no-fainted-battlers")`
  (`src/engine/factoryBattleScriptFullTurnDecision.ts:2623` and
  `src/engine/factoryBattleScriptTerminalDecision.ts:721`) — one named variant.
  That variant is constructed at exactly one place,
  `src/engine/battleScriptFaintedActionsOrchestration.ts:354`, inside the
  **fresh** entry `runBattleScriptFaintedActionsOrchestration`. Both seams call
  the **resume** entry `resumeBattleScriptFaintedActionsAfterPlayerChoice`
  (`:592-650`), which returns only what `runScriptToOwnEnd` yields —
  `player-choice`, `non-terminal-barrier` (`:643`), `terminal`, `resumed` — and
  never constructs `no-fainted-battlers`. A `non-terminal-barrier` inside a
  forced-switch resume propagates to the terminal/finalize tail; it does not
  reach either throw.
- `:322`'s guard is `if (stepped.kind !== "advanced")` (`:321`), placed *after*
  explicit handling of `blocked` (`:286-297`, auto-acknowledged then `continue`),
  `scheduler-progressed` (`:300-303`) and `halted` (`:304-320`, whose tail at
  `:317-319` returns `kind: "barrier"` for a registered opcode's own (b) halt).
  `stepBattleScriptMachine`'s return type is a closed four-variant union
  (`src/engine/battleScriptMachine.ts:248-251`), so the arm is a `never`
  exhaustiveness guard. The draft's specific claim that the controller-busy
  `blocked` transition (`battleScriptMachine.ts:890`) reaches it is wrong —
  `blocked` is consumed twenty-five lines earlier.

All three rows are reclassified **TS-CONTRACT** in §3. Nothing to file; the
sanctioned-barrier propagation the draft asked for is already what the code
does.

### Draft C — ~~`CANCELER_BIDE` throws on absent battlers where the source redirects (#126 sibling)~~ WITHDRAWN 2026-08-25 (supervisor verification: not filed — see the corrected §3.1 row; `gAbsentBattlerFlags` is only ever raised by `Cmd_openpartyscreen` when no replacement exists)

**Symptom (original, refuted).** `src/engine/battleScriptActionAdmission.ts:3515-3519` throws
"CANCELER_BIDE does not accept absent battlers: the GetMoveTarget fallback is
source-unreachable at a continuing Level-50 singles action boundary" whenever
`rulesContext.absentBattlerFlags !== 0` at the Bide phase.

**Confirmed from the reference.** The source does not treat this as
unreachable — it handles it inline, two lines after the `gBideTarget` read that
#126 crashed on: `reference/pokeemerald/src/battle_util.c:2237-2238`,
`if (gAbsentBattlerFlags & gBitTable[gBattlerTarget]) gBattlerTarget =
GetMoveTarget(MOVE_BIDE, MOVE_TARGET_SELECTED + 1);`. `gAbsentBattlerFlags` is
raised on faint at `battle_script_commands.c:4886`, `:4915`, `:4937`, `:4958`,
`:4980`, `:5043`, `:5059`, `:5109` and cleared only at switch-in (`:4689`,
`battle_util.c:1909`), so it is nonzero across the whole faint→replacement
window. The port's guard is also broader than the source's: it rejects *any*
absent battler, where the C tests only the Bide target's bit.

**Leads.** Fix layer is the throw — port `:2237-2238`'s redirect verbatim, the
same way #126's fix ported the `:2236` target read verbatim. Repro (cheapest
first): `mechanicLab` `overrides.parties` against the stock ROM with three legal
Level-50 mons per side — player mon knows BIDE only, all opponent slots know
WRAP only so the Factory AI has one legal choice — and let Wrap's residual
damage KO the opponent on the turn Bide's 2-turn counter expires, then read the
ROM's `gBattlerTarget` at release. Fallback: the `winning --vary-rng` full-chain
soak that found #126.

### Draft D — ~~`applySetMoveEffect` crashes on `MOVE_EFFECT_NONE`, which the source treats as a no-op~~ WITHDRAWN 2026-08-25 (second pass: the open question resolved in the port's favour — not filed)

**Resolution.** The draft was right that the C *tolerates* byte 0
(`SetMoveEffect`'s `switch (sStatusFlagsForMoveEffects[...])`,
`reference/pokeemerald/src/battle_script_commands.c:2268-2271`, entry 0 matches
no `case`) and therefore hands the port no guarantee to inherit. Its open
question — can any of the five port call sites pass 0? — is now answered: **no.**
`:2979` passes `(randomValue % 3) + MOVE_EFFECT_BURN`; `:4051` is guarded by
`moveEffectByte !== 0`, mirroring `Cmd_seteffectwithchance`'s own
`&& gBattleCommunication[MOVE_EFFECT_BYTE]` (`:2924-2926`); `:4024` would need a
bare `MOVE_EFFECT_CERTAIN` byte, which no `setmoveeffect` in
`data/battle_scripts_1.s` emits; `:4073` (`Cmd_seteffectprimary`) and `:4097`
(`Cmd_seteffectsecondary`) are each preceded by a nonzero `setmoveeffect` in
every committed script, and their two C-entered exceptions —
`BattleScript_SynchronizeActivates` and `BattleScript_ApplySecondaryEffect` —
take their byte from `battle_util.c:2971-3000` and `:2801/:2816/:2831/:2846`,
all of which write nonzero values under guards the port mirrors
(`battleScriptHitChainOpcode.ts:3493-3504`,
`battleScriptMoveEndOpcode.ts:312-330`, `:592-607`). Row reclassified **PROVED**
in §3.3 with the full citation chain.

### Draft E — ~~`factoryBattleScriptFullTurnDecision.ts:2512` asserts a battler resolution the source cannot fail~~ WITHDRAWN 2026-08-25 (second pass: premise proved unreachable by construction — not filed)

**Resolution.** The draft's C observation stands — the source has no equivalent
failure mode, because `Cmd_openpartyscreen` takes the battler as an opcode
operand (`reference/pokeemerald/src/battle_script_commands.c:5108-5124`). But
"no C line rules it out" is not the same as "reachable", and the port's own
construction rules it out. `actingBattler =
battlerByTurnOrder[currentTurnActionNumber]` (`:2502-2503`) indexes a frozen
four-tuple (`src/engine/battleScriptRulesContext.ts:883`, `:2815-2819`), so it is
never `undefined` unless the index reaches 4; the cell's only writer on this path
is `withTurnOrderPositions`
(`src/engine/factoryBattleScriptFullTurnDecision.ts:1930-1953`), called with the
literal `0` at `:3007` and the literal `1` at `:2771-2775` and writing
`[mover1, mover2, 2, 3]` — so slots 0/1 hold the two singles movers (0 and 1,
both `< battlersCount === 2`) and the inert 2/3 padding is never indexed. The
`handleBattleActionFinished` bump (`src/engine/battleActionFinished.ts:140`)
happens at `:2669-2677`, *after* the resume, and the sole `resumeAt:
"run-end-turn"` producer (`:2730`) snapshots the pre-bump context. The C carries
the matching invariant: `gCurrentTurnActionNumber` is zeroed at
`battle_main.c:4926` and `RunTurnActionsFunctions` hands off to the end-turn
table as soon as it reaches `gBattlersCount` (`:4945`). Row reclassified
**PROVED (by construction)** in §3.4. The double-faint and last-slot shapes the
draft proposed do not reach it: both leave `currentTurnActionNumber` at 0 or 1.

### Draft F — `factoryBattleScriptFullTurnDecision.ts:2564` crashes on a second forced switch inside a mid-action resume (ISSUES #119's shape on the #89 path)

**Symptom.** `src/engine/factoryBattleScriptFullTurnDecision.ts:2562-2566` throws
"factory full-turn decision move-action resume unexpectedly halted on a second
player-choice-required opcode" when the ISSUES #89 mid-action resume
(`resumeAt` `"run-action1"` / `"run-action2"`) re-runs a halted **move** script
with `runScriptToOwnEnd` (`:2559`) and that run halts a second time on
`openpartyscreen`'s player branch. This is a CRASH on a state the same function
already treats as ordinary twenty lines later.

**Confirmed from the reference.** The fainted-dance sibling republishes exactly
this halt as a second forced-switch boundary and cites ISSUES #119 for it
(`src/engine/factoryBattleScriptFullTurnDecision.ts:2588-2621`). A move script
reaches the same re-entry in the source: `Cmd_switchineffects`
(`reference/pokeemerald/src/battle_script_commands.c:5219`) applies Spikes under
the guard at `:5228-5231` (`!(gSideStatuses[side] & SIDE_STATUS_SPIKES_DAMAGED)
&& (gSideStatuses[side] & SIDE_STATUS_SPIKES) && !IS_BATTLER_OF_TYPE(...,
TYPE_FLYING) && ability != ABILITY_LEVITATE`) and then selects the damage script
**by its own operand** at `:5248-5253`. `BattleScript_EffectBatonPass` ends in
`switchineffects BS_ATTACKER`
(`reference/pokeemerald/data/battle_scripts_1.s:1713`), so the replacement takes
`BattleScript_SpikesOnAttacker` → `tryfaintmon_spikes BS_ATTACKER,
BattleScript_SpikesOnAttackerFainted` → `goto BattleScript_HandleFaintedMon`
(`:3390-3400`), whose `openpartyscreen BS_FAINTED` halts player-choice-required
inside the same script run. The port models the branch:
`src/engine/battleScriptSwitchinOpcode.ts:1143-1160` reproduces the
`SIDE_STATUS_SPIKES_DAMAGED` guard and picks `"BattleScript_SpikesOnAttacker"`
at `:1155`.

**Leads.** Fix layer is the throw: republish the pending bundle the way
`:2588-2621` already does for the dance path, preserving this pause's own
`resumeAt` and its banked `pendingSecondAction`. Repro (cheapest first):
`winning-coverage --vary-rng` biased to a rental pool carrying both SPIKES and
BATON_PASS — one Spikes layer costs `maxHP / 8`, so the bench slot must already
be below that when it is passed to. Directed alternative: a `mechanicLab`
`overrides.parties` recipe with three legal Level-50 mons per side, opponent
slots knowing SPIKES only, player lead knowing BATON_PASS only, and the player's
bench slot chipped by real damage first; then check whether the ROM asks for a
second switch inside the same script. Same family as #119 and #89 — file
alongside them.

---

## 6. Method caveats

- The stage-2 word filter demonstrably under-collects (see the
  `battleScriptActionAdmission.ts:3547` bonus row, and the `:2375` sibling noted
  in §3.1 whose message says *requires* rather than *must*). Treat 235 as a lower
  bound on premise-worded throws and 50 as a lower bound on live-kernel premises.
- The §1 stage-3 figure of **48** is superseded as an approximation. The second
  pass re-ran the filter over the 14 files the first pass listed as unclassified
  and found **26** sites there, not 24; it did not re-censure the other files, so
  a third pass should re-derive stage 3 from scratch before treating any total as
  exact. What matters for this document's purpose is that no row was dropped:
  §3.6 accounts for every site the first pass listed, plus the two it undercounted.
- Classes A/B/C in §2 were excluded by *file group and enclosing function name*,
  not by reading each site. That trade has now visibly leaked in both directions:
  `factoryAiDecisionPolicy.ts:126`/`:155` and `factoryBattleScriptDecision.ts:168`/`:195`
  are class-A/C validators that survived the filter on naming alone, and
  `battleTurn.ts:130`/`:174` are class-B staging that survived on filename alone —
  all six are TS-CONTRACT in §3. The
  `battleScriptRulesContext.ts:2519-2531` Bide-cell contract is still the one
  flagged for a second look in the other direction.
- Reachability rankings in §4 are argued from source structure and the port's
  call graph, not measured. Only #126 itself has a measured rate (1/600 varied
  full chains).
- **Two first-pass verdicts were wrong for the same reason** (citing a line
  without reading its enclosing function): the withdrawn Draft C read
  `gAbsentBattlerFlags |=` sites outside `Cmd_openpartyscreen`, and the withdrawn
  Draft B read `orchestration.kind` in the message string instead of the `if` on
  the line above it. Both were premise-*worded* throws whose guard turned out to
  be narrower than the message implied. When in doubt, read the guard, not the
  message.
