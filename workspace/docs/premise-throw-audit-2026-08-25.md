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

Every C line cited below was read this session from `reference/pokeemerald/`.
No source file, test, or ledger was changed by this audit; nothing was fixed.

---

## 1. Scope + method

Commands, in order, with the count after each stage:

| # | Stage | Command / filter | Count |
| --- | --- | --- | --- |
| 1 | All throw sites | `rg -n "throw new Error" src/engine` | **1,554** sites across **194** files |
| 2 | Premise-worded | message matches `must` / `expected` / `unexpected` / `impossible` / `cannot` / `should never` / `invariant` / `unreachable` / `never happen` / `should not` (messages reassembled across continuation lines, since ~40% of throws wrap) | **235** |
| 3 | Minus exclusions (§2) | drop validator-function sites, presentation/staging modules, and construction/generation/parse-boundary modules | **48** live-kernel premise sites |
| 4 | Classified (§3) | read the TS site *and* the C it claims to port | **24** |
| 5 | Remainder | UNCLASSIFIED, listed in §3.5 | **24** |

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

## 3. The table — 24 classified live-kernel premise sites

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
| `battleScriptActionAdmission.ts:3517` | `CANCELER_BIDE does not accept absent battlers: the GetMoveTarget fallback is source-unreachable at a continuing Level-50 singles action boundary` | **UNPROVEN** | **The source models this exact state rather than ruling it out.** `battle_util.c:2237-2238`: `if (gAbsentBattlerFlags & gBitTable[gBattlerTarget]) gBattlerTarget = GetMoveTarget(MOVE_BIDE, MOVE_TARGET_SELECTED + 1);` — a live redirect sitting three lines after the `gBideTarget` read that #126 crashed on. `gAbsentBattlerFlags` is raised on faint at `battle_script_commands.c:4886/4915/4937/4958/4980/5043/5059/5109` and cleared only on switch-in (`:4689`, `battle_util.c:1909`), so it is nonzero for the whole window between a faint and its replacement. The port replaces a modeled source branch with a premise; that is the #126 shape by definition. Scenario in §4. |
| `battleScriptActionAdmission.ts:3547` *(bonus row; missed by the stage-2 regex)* | `STATUS2_BIDE counter 3 is not reachable from Cmd_setbide in the Level-50 singles locked-action flow` | **PROVED** | `Cmd_setbide` (`battle_script_commands.c:7122-7129`) ORs `STATUS2_BIDE_TURN(2)` into a 2-bit field; the only other write is the `-= STATUS2_BIDE_TURN(1)` at `battle_util.c:2225`. Reaching 3 needs a second `Cmd_setbide` while the field is 1, which the canceler forecloses: once `STATUS2_BIDE` is set, `battle_util.c:2225-2245` diverts the biding battler to `BattleScript_BideStoringEnergy` / `BideAttack` / `BideNoEnergyToAttack` inside `AtkCanceler`, before the move's own script (and so before `Cmd_setbide`) can run again. **Port half:** the port sets Bide only through `battleScriptSetbideOpcode.ts` and reaches it through the same canceler phase. |
| `battleScriptActionAdmission.ts:3553` | `gBideDmg[N] must be nonnegative in reachable Level-50 singles state` | **PROVED** | `Cmd_datahpupdate` splits on sign first: `battle_script_commands.c:1897-1903` handles `gBattleMoveDamage < 0` as HP gain and touches neither `gBideDmg` nor `gBideTarget`; the accumulation `gBideDmg[gActiveBattler] += gBattleMoveDamage` at `:1912` is reachable only from the `else` at `:1904`, i.e. with non-negative damage. `Cmd_setbide` zeroes the cell at `:7125`. **Port half — both halves confirmed:** `battleScriptHitChainOpcode.ts:2521` (`if (damage < 0)`) early-returns on the heal branch *before* the bide accumulation at `:2551-2564`, exactly mirroring the C split, and `battleScriptSetbideOpcode.ts:44-46` zeroes the attacker's cell. The post-#126 `HITMARKER_IGNORE_BIDE` strip is at `battleScriptHitChainOpcode.ts:2552-2554`. |
| `battleScriptActionAdmission.ts:3780` | `CANCELER_THAW Level-50 singles attacker must be battler 0 or 1` | **PROVED (by scope)** | Same gate as `:3512` (`battle_controllers.c:177`). |

### 3.2 Switch / faint orchestration

| file:line | message (trimmed) | verdict | evidence |
| --- | --- | --- | --- |
| `battleScriptSwitchinOpcode.ts:347` | `Cmd_switchhandleorder: battler N has no decided monToSwitchIntoId -- openpartyscreen must run first` | **UNPROVEN** | **The source has no such precondition.** `Cmd_switchhandleorder` cases 2 and 3 *write* the cell rather than requiring it: `battle_script_commands.c:5183-5191` does `gBattleCommunication[0] = gBattleBufferB[gActiveBattler][1]; *(gBattleStruct->monToSwitchIntoId + gActiveBattler) = gBattleBufferB[gActiveBattler][1];` — the value comes from the controller buffer at the moment the opcode runs, so a `PARTY_SIZE` sentinel there is simply not a state the C can be in. The port instead stores the decision directly in `monToSwitchIntoId` and asserts it was decided upstream, which makes the throw a *port-internal* contract with no source backing. The #126 tell is already on record: ISSUES #121 documents that the engine omits **both** the `Cmd_openpartyscreen` clear `*(gBattleStruct->monToSwitchIntoId + gActiveBattler) = PARTY_SIZE` (`battle_script_commands.c:5117`) **and** `GetMostSuitableMonToSwitchInto`'s early return on a pre-decided id (`battle_ai_switch_items.c:646-647`). The cell's lifecycle in the port therefore already diverges from the source's at both ends of this premise. |
| `battleScriptSwitchinOpcode.ts:387` | `Cmd_getswitchedmondata: battler N has no decided monToSwitchIntoId -- openpartyscreen must run first` | **UNPROVEN** | Same defect, one opcode later. `Cmd_getswitchedmondata` (`battle_script_commands.c:4606-4619`) reads `gBattlerPartyIndexes[gActiveBattler] = *(gBattleStruct->monToSwitchIntoId + gActiveBattler)` unconditionally — no sentinel check, no failure mode. Whatever is in the cell is committed. The port adds a premise the C does not have. |
| `battleScriptFaintedActionsOrchestration.ts:322` | `fainted-actions orchestration hit an unexpected <kind> step inside <label> -- outside this rung's modeled (setbyte/getexp/checkteamslost/jumpifbyte/openpartyscreen/end2) domain` | **UNPROVEN** | The neighbouring branches (`:302-319`) already surface `halted` with every real halt reason, including `unsupported-branch`, as a `barrier` result rather than a crash — the author's own note at `:317-319` says a barrier "is the same kind of real machine boundary … not a crash." This throw catches the residual `stepped.kind`, which for `stepBattleScriptMachine` includes the controller-busy `blocked` transition (`battleScriptMachine.ts:890`). `Cmd_openpartyscreen` is inside this rung and marks controllers pending, so a `blocked` step inside the rung is a state the machine itself produces. No C line rules it out — this is a port-orchestration domain guard, not a source premise. Scenario in §4. |

### 3.3 Damage / status / stat-stage handling

| file:line | message (trimmed) | verdict | evidence |
| --- | --- | --- | --- |
| `battleScriptStatbuffchangeOpcode.ts:121` | `Cmd_statbuffchange: changeStatBuffs returned blocked-silent, but every concrete statbuffchange call site sets STAT_CHANGE_ALLOW_PTR -- unreachable in the real topology` | **PROVED** | All **31** `statbuffchange` invocations in `data/battle_scripts_1.s` carry `STAT_CHANGE_ALLOW_PTR` (verified by `rg -n "statbuffchange" data/*.s \| rg -v STAT_CHANGE_ALLOW_PTR` returning nothing); `include/constants/battle_script_commands.h:371` states the same ("Set in every use of statbuffchange"). The C tests exact equality `flags == STAT_CHANGE_ALLOW_PTR` (`battle_script_commands.c:6965`, `:6991`, `:7012`, `:7025`) *after* stripping the three co-flags at `:6943-6957` (`MOVE_EFFECT_AFFECTS_USER`, `MOVE_EFFECT_CERTAIN`, `STAT_CHANGE_NOT_PROTECT_AFFECTED`), so composite call sites still reduce to exactly the ALLOW_PTR bit. **Port half:** `battleScriptStatBuffs.ts:186-193` strips the identical three bits in the identical order and computes `allowPtr = flags === STAT_CHANGE_ALLOW_PTR`. The blocked-silent producer at `battleScriptStatBuffs.ts:302` fires only under `!allowPtr`, and its other caller (`battleScriptHitChainOpcode.ts:3964`, the Intimidate/ability route with `jumpProgramCounter: null`) handles it as an ordinary advance instead of throwing. |
| `battleScriptHitChainOpcode.ts:3475` | `applySetMoveEffect: unreachable MOVE_EFFECT_BYTE <n>` | **UNPROVEN** | The `default:` arm of a switch whose only cases are the six primary statuses (SLEEP/POISON/BURN/FREEZE/PARALYSIS/TOXIC), guarded upstream by `if (effectByte > PRIMARY_STATUS_MOVE_EFFECT)` (`:2961`). That leaves `effectByte === 0` (`MOVE_EFFECT_NONE`) falling into the switch with no matching case. **In C this is a silent no-op, not an error:** `SetMoveEffect` switches on `sStatusFlagsForMoveEffects[gBattleCommunication[MOVE_EFFECT_BYTE]]` (`battle_script_commands.c:2268-2271`), whose entry for byte 0 is 0 and matches no `case`, so control falls out of the switch and the command simply advances. The port converts a source no-op into a crash — a distinct sub-species of the #126 shape (the source does not *rule out* the state, it *tolerates* it). Reachability of byte 0 at `Cmd_seteffectprimary` / `Cmd_seteffectwithchance` was not established; see §4. |
| `battleScriptMoveEndOpcode.ts:271` | `Cmd_moveend: statStages width invariant violated` | **TS-CONTRACT** | `replaceStatStage` (`:264-275`) spreads a fixed-width tuple into `mutable`, assigns one index, then checks `mutable.length`. Array spread cannot change length and the index is a typed stat id. No game state is involved. |
| `battleScriptMultiTurnCancellation.ts:52` | `CancelMultiTurnMoves battler must be a battler id 0..3` | **TS-CONTRACT** | Domain check on a `BattleScriptBattlerId`-typed parameter at a pure helper's entry; the type already excludes out-of-range values and no caller widens it. |

### 3.4 Round-controller / decision seams

| file:line | message (trimmed) | verdict | evidence |
| --- | --- | --- | --- |
| `factoryBattleScriptFullTurnDecision.ts:2512` | `factory full-turn decision forced-switch resume cannot resolve the acting battler at the current turn position` | **UNPROVEN** | Fires when the resume path cannot map the turn position back to a battler. The source's equivalent, `Cmd_openpartyscreen` / `HandleFaintedMonActions`, has no such failure mode: `battle_script_commands.c:5108-5124` assigns `gActiveBattler = battler` from the opcode operand and proceeds. No C line was found that rules the port's unresolvable state out; scenario not constructed in time. |
| `factoryBattleScriptFullTurnDecision.ts:2624` | `factory full-turn decision forced-switch resume produced an unexpected <kind> result` | **UNPROVEN** | Same family as `battleScriptFaintedActionsOrchestration.ts:322`: a premise over the *port's own* orchestration result union. Any opcode inside the resumed rung that returns an `unsupported-branch` barrier — the sanctioned (b) class, of which there are 43 live in `src/engine` — surfaces as a `kind` this arm rejects. A barrier is a designed outcome, so a throw here converts a sanctioned halt into a crash. |
| `factoryBattleScriptTerminalDecision.ts:722` | `factory terminal decision forced-switch resume produced an unexpected <kind> result` | **UNPROVEN** | Identical shape to `:2624`, on the terminal-decision path. |
| `factoryBattleScriptDecision.ts:474` | `awaiting-command phase must not already own a selected move` | **TS-CONTRACT** | Phase invariant on the decision-boundary state machine, checked at `rulesAt` when rebuilding a context; the phase tag and the selected-move cell are both port-owned and set together. |
| `factoryAiDecisionPolicy.ts:988` | `Factory AI turn-start random-number owner must be decision or battle-turn-boundary` | **TS-CONTRACT** | Exhaustiveness `else` over a two-variant discriminated union whose tag is validated by `exactKeys` on the two branches above (`:966`, `:976`). No game state can produce a third tag. |
| `battleScriptCallbackStack.ts:223` | `activateAbilityScript: end3 underflow immediately after its own matching push -- unreachable, indicates a bug in this prototype` | **TS-CONTRACT** | `pushCursorAndCallback` at `:219` and `popEnd3` at `:221` operate on the same local `stack` value with no intervening mutation. The premise is about this function's four lines, not about battle state. |
| `battleScriptTryhealhalfhealthOpcode.ts:51` | `Cmd_tryhealhalfhealth: unexpected battler operand <x> -- the committed program's only …` | **TS-CONTRACT** | Guards the operand of the *committed* battle-script program, a module-load constant; the same file asserts the instruction count at construction. Not reachable from a game state. |
| `battleScriptMagicCoat.ts:471` | `Battle Script Magic Coat join cannot push a full BattleScriptsStack` | **UNPROVEN** | The C `BattleScriptPush` has no overflow error path — `gBattleResources->battleScriptsStack` overrun is silent in the source, so there is no C line that rules the state out and none that makes it an error. Depth reachability under Magic Coat + nested effect scripts was not computed; scenario not constructed in time. |

### 3.5 UNCLASSIFIED — 24 live-kernel premise sites not reached

Counted honestly, not silently cut. All are premise-worded, all survive §2's
exclusions, none were read against the C this session:

| File | Sites |
| --- | --- |
| `src/engine/battleScriptActionAdmission.ts` | 5 (the imprisoned-move scan cluster, `:2365`–`:2400`) |
| `src/engine/factoryBattleScriptFullTurnDecision.ts` | 3 |
| `src/engine/factoryAiDecisionPolicy.ts` | 2 |
| `src/engine/factoryBattleScriptTerminalDecision.ts` | 2 |
| `src/engine/factoryBattleScriptDecision.ts` | 2 |
| `src/engine/battleTurn.ts` | 2 (`:130` PP precondition, `:174`) |
| `src/engine/battleScriptTrywishOpcode.ts` | 2 |
| `src/engine/battleScriptSetsubstituteOpcode.ts` | 1 |
| `src/engine/battleScriptTrysetfutureattackOpcode.ts` | 1 |
| `src/engine/battleScriptSetdestinybondOpcode.ts` | 1 |
| `src/engine/battleScriptDisablelastusedattackOpcode.ts` | 1 |
| `src/engine/battleScriptFriendshipToDamageOpcode.ts` | 1 |
| `src/engine/battleScriptWeightDamageOpcode.ts` | 1 |
| `src/engine/core.ts` | 1 (`:1364`, `"generated postwin NO must publish swapResolved"` — round-controller seam) |

Most of the opcode-module singletons look like committed-program shape checks
(the `battleScriptTrywishOpcode.ts` / `battleScriptSetdestinybondOpcode.ts`
"must emit N instructions" family), which would land TS-CONTRACT; they are
counted UNCLASSIFIED because that was not verified. `battleTurn.ts:130` and
`core.ts:1364` are the two with real game-state flavour and should head the
next pass.

### 3.6 Counts

| Verdict | Count |
| --- | --- |
| **PROVED** (incl. PROVED-by-scope, incl. the bonus `:3547` row) | **7** |
| **TS-CONTRACT** | **8** |
| **UNPROVEN** | **9** |
| **UNCLASSIFIED** | **24** |

---

## 4. Ranked UNPROVEN list — most reachable first

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

**2. `factoryBattleScriptFullTurnDecision.ts:2624` + `factoryBattleScriptTerminalDecision.ts:722` + `battleScriptFaintedActionsOrchestration.ts:322` — orchestration result-union premises.**
*Why reachable:* all three reject a `kind` that the port's own machine
deliberately produces. `src/engine` has 43 live `unsupported-branch` barriers,
each a sanctioned halt that the ratchet at
`tests/executableFrontierRatchet.test.ts:482` expects to grow; the
fainted-actions rung converts halts to `barrier` results at `:302-319` precisely
so they are *not* crashes, but the sibling seams in the two Factory decision
modules do not. Any barrier reached inside a forced-switch resume — a Focus
Band, a multi-battler `switchhandleorder` case, an unmodeled `moveend` state —
becomes a crash instead of a halt. Add the controller-busy `blocked` transition
(`battleScriptMachine.ts:890`) for `:322`, which `openpartyscreen` inside the
same rung can produce.
*Cheapest instrument:* soak. `full` policy at high carry maximises barrier
exposure per chain; `winning-coverage` widens the move pool. A directed
alternative: stage a `mechanicLab` `overrides.parties` recipe with a Focus Band
holder at 1 HP so the faint rung reaches the item barrier during a forced switch.
*Likely fix layer:* **the throw** — these should return the same `barrier`
result the fainted-actions rung already models at `:302-319`, and the two
Factory decision modules should propagate it.

**3. `battleScriptActionAdmission.ts:3517` — `CANCELER_BIDE` with any absent battler.**
*Why reachable:* the source spends two lines handling this exact state
(`battle_util.c:2237-2238`) — you do not write a redirect for a state that
cannot occur. `gAbsentBattlerFlags` is nonzero for the whole window between a
faint (`battle_script_commands.c:4886`…`:5109`) and the replacement's switch-in
(`:4689`). Note the port's condition is broader than the source's: it throws on
`absentBattlerFlags !== 0` (any battler) where the C tests only the Bide
target's bit.
*Concrete Level-50 singles scenario:* attacker holds a Bide user (any rental
with BIDE; Metronome can also roll it — that is how #126 surfaced). Bide's
2-turn lock elapses while the opponent faints to residual damage in the same
turn window (Wrap/Leech Seed/poison at `DoBattlerEndTurnEffects`, or Destiny
Bond), so `CANCELER_BIDE` runs for the release on the following turn's action
boundary while the opponent slot is still flagged absent.
*Cheapest instrument:* `mechanicLab` `overrides.parties` against the stock ROM —
three complete legal Level-50 mons per side; player mon knows BIDE only,
opponent mons all know WRAP only (a single legal AI choice); let Wrap chip the
opponent to a residual-damage faint on the turn Bide's counter expires, and read
the ROM's `gBattlerTarget` at release. Falls back to the `winning --vary-rng`
soak that found #126.
*Likely fix layer:* **the throw** — port `battle_util.c:2237-2238`'s
`GetMoveTarget` redirect verbatim, exactly as #126's fix ported the `:2236`
target read verbatim.

**4. `battleScriptHitChainOpcode.ts:3475` — `MOVE_EFFECT_NONE` reaches `applySetMoveEffect`'s `default:`.**
*Why reachable:* the C tolerates byte 0 as a no-op
(`battle_script_commands.c:2268-2271`; `sStatusFlagsForMoveEffects[0] == 0`
matches no `case`, control falls through the switch), so there is no source
guarantee to inherit — only whatever the port's callers happen to filter. Five
call sites feed this function (`:2979`, `:4024`, `:4051`, `:4073`, `:4097`),
including the Tri Attack recursion at `:2979` and the secondary-effect roll at
`:4051`.
*Scenario:* **not constructed in time.** The open question is whether any port
caller can pass `rulesContext.moveEffectByte === 0` — the C's
`Cmd_seteffectwithchance` filters a zero effect before dispatching, and whether
the port reproduces that filter at all five sites was not checked.
*Cheapest instrument:* a static read of the five call sites first (minutes, no
ROM); only if one can pass 0, a `mechanicLab` recipe with a no-secondary-effect
move routed through the same opcode.
*Likely fix layer:* **the throw** — the C's fall-through is a silent advance;
mirroring it costs one `return passThrough()`.

**5. `battleScriptMagicCoat.ts:471` — Magic Coat join onto a full script stack.**
*Why reachable:* no C error path exists to inherit; `BattleScriptPush` overruns
silently in the source, so the port's premise is stricter than the game.
*Scenario:* **not constructed in time.** Requires computing the port's maximum
nested-script depth under Magic Coat plus ability/item callbacks against the
source stack size.
*Cheapest instrument:* static depth analysis of `pushCursorAndCallback` callers;
a soak is unlikely to reach it by chance.
*Likely fix layer:* undetermined until depth is known.

**6. `factoryBattleScriptFullTurnDecision.ts:2512` — forced-switch resume cannot resolve the acting battler.**
*Why reachable:* no source counterpart (`battle_script_commands.c:5108-5124`
assigns the battler from the opcode operand and cannot fail).
*Scenario:* **not constructed in time** — it needs a resume whose turn position
no longer maps to a battler, most plausibly a double-faint or a forced switch
that lands on the last living slot.
*Cheapest instrument:* `winning-swap --vary-rng` at carry 28, where double-KO
turns are densest.
*Likely fix layer:* likely **the throw**, but the resume's position→battler
mapping should be re-derived from the C first.

---

## 5. Ready-to-file ISSUES drafts (top 5 UNPROVEN)

Not appended to `ISSUES.md` — the supervisor files these. House style: symptom /
confirmed / leads, with exact `file:line` on both the engine and the source.

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

### Draft B — Orchestration seams crash on `unsupported-branch` barriers instead of propagating them

**Symptom.** Three orchestration seams throw on a result `kind` the machine
deliberately produces:
`src/engine/factoryBattleScriptFullTurnDecision.ts:2624`
("forced-switch resume produced an unexpected … result"),
`src/engine/factoryBattleScriptTerminalDecision.ts:722` (same message), and
`src/engine/battleScriptFaintedActionsOrchestration.ts:322` ("hit an unexpected
… step … outside this rung's modeled domain"). A sanctioned (b) barrier reached
inside a forced-switch resume becomes a CRASH.

**Confirmed.** `src/engine` carries 43 live `unsupported-branch` barriers
(returned as `kind: "unsupported-branch"` result literals, e.g.
`src/engine/battleScriptSwitchinOpcode.ts:184`,
`src/engine/battleScriptMoveEndOpcode.ts:1026`), and
`tests/executableFrontierRatchet.test.ts:482` pins their per-module counts as a
growing, deliberate class. `src/engine/battleScriptFaintedActionsOrchestration.ts:302-319`
already models the correct handling — halts, including barriers, are returned as
`kind: "barrier"` with the author's note at `:317-319` that a barrier "is the
same kind of real machine boundary as an unregistered opcode — surface it the
same way, not a crash". The two Factory decision modules do not do this, and
`:322` additionally rejects the controller-busy `blocked` transition that
`src/engine/battleScriptMachine.ts:890` produces and that `openpartyscreen`
inside the same rung can trigger.

**Leads.** Fix layer is the throw: return/propagate the existing `barrier`
result instead. No C citation is needed to justify the change — the source has
no equivalent failure mode, since an unimplemented opcode is not a concept it
has. Repro: `full` policy soak at high carry (maximum barrier exposure per
chain), or a staged `mechanicLab` `overrides.parties` recipe with a Focus Band
holder at 1 HP to reach the item barrier during a forced switch.

### Draft C — `CANCELER_BIDE` throws on absent battlers where the source redirects (#126 sibling)

**Symptom.** `src/engine/battleScriptActionAdmission.ts:3515-3519` throws
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

### Draft D — `applySetMoveEffect` crashes on `MOVE_EFFECT_NONE`, which the source treats as a no-op

**Symptom.** `src/engine/battleScriptHitChainOpcode.ts:3475` throws
"applySetMoveEffect: unreachable MOVE_EFFECT_BYTE 0" — the `default:` arm of a
switch whose cases are only the six primary statuses, entered whenever
`effectByte <= PRIMARY_STATUS_MOVE_EFFECT` (guard at `:2961`). Byte 0 has no
case.

**Confirmed from the reference.** `SetMoveEffect` switches on
`sStatusFlagsForMoveEffects[gBattleCommunication[MOVE_EFFECT_BYTE]]`
(`reference/pokeemerald/src/battle_script_commands.c:2268-2271`). The table
entry for byte 0 is 0, matching no `case`, so control falls out of the switch
and the command advances — a silent no-op. The C therefore does not rule this
state out; it tolerates it, and the port turns a tolerated state into a crash.

**Leads.** Reachability unresolved: five call sites feed the function
(`src/engine/battleScriptHitChainOpcode.ts:2979` Tri Attack recursion, `:4024`,
`:4051` secondary-effect roll, `:4073`, `:4097`), and whether any can pass 0 —
the C filters a zero `gBattleScripting.moveEffect` before dispatching from
`Cmd_seteffectwithchance` — was not checked. Cheapest next step is a static read
of those five sites (no ROM needed). Fix layer is the throw: mirror the C's
fall-through with `return passThrough()`.

### Draft E — `factoryBattleScriptFullTurnDecision.ts:2512` asserts a battler resolution the source cannot fail

**Symptom.** `src/engine/factoryBattleScriptFullTurnDecision.ts:2512` throws
"factory full-turn decision forced-switch resume cannot resolve the acting
battler at the current turn position".

**Confirmed from the reference.** The source's forced-switch/faint path has no
equivalent failure: `Cmd_openpartyscreen`'s per-battler branch assigns
`gActiveBattler = battler` from the opcode operand and proceeds
(`reference/pokeemerald/src/battle_script_commands.c:5108-5124`), and
`Cmd_getswitchedmondata` resolves the battler from `GetBattlerForBattleScript`
(`:4610`). There is no C line making an unresolvable acting battler impossible,
because in the source the battler is an operand, not a lookup.

**Leads.** Scenario not constructed. Most plausible shapes are a double-faint
turn or a forced switch resolved onto the last living slot. Repro instrument:
`winning-swap --vary-rng` at carry 28, where double-KO turns are densest. Before
changing anything, re-derive the resume's turn-position→battler mapping from
`battle_main.c`'s `gBattlerByTurnOrder` handling rather than from the port's
comments.

---

## 6. Method caveats

- The stage-2 word filter demonstrably under-collects (see the
  `battleScriptActionAdmission.ts:3547` bonus row). Treat 235 as a lower bound
  on premise-worded throws and 48 as a lower bound on live-kernel premises.
- Classes A/B/C in §2 were excluded by *file group and enclosing function name*,
  not by reading each site. That is the correct trade at this cap, but a site
  inside a class-C module that is actually called mid-turn would be missed. The
  `battleScriptRulesContext.ts:2519-2531` Bide-cell contract is flagged above as
  the one worth a second look.
- Reachability rankings in §4 are argued from source structure and the port's
  call graph, not measured. Only #126 itself has a measured rate (1/600 varied
  full chains).
