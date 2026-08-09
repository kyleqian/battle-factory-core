# Unsupported-branch reachability triage (S10 close-out)

This is the current source-audit record for every production
`unsupported-branch` halt in the Level-50 Factory engine. It is intentionally
about reachability, not about whether a guard is useful defensively. The
evidence is the current production source plus the pinned
`reference/pokeemerald` source and committed battle-script program.

The current history contains the Enigma Berry retirement (`d92248bb`), so the
live `Cmd_accuracycheck` count is 10. A/B work is not
being re-opened here: A3, A5, A6, A7, A8, A9, A10, and A11 are implemented in
the current source; A4 and A12 are source-refuted as unreachable in Factory
singles. The widened-scope `printfromtable` table-pointer family is now
source-complete for the current program; its generic pointer subcase remains
a defensive future-input guard classified D below.

## Counting contract

The inventory is one row per `unsupportedBranch(...)` call site, excluding the
helper definition. The two `factoryAi*` modules have the equivalent literal
`kind: "unsupported-branch"` site and are counted the same way. A composite
site is assigned its strongest remaining classification once: a site with a
live B subcase is counted as B even when another subcase at that same guard is
proven C. This keeps the module sum and category sum machine-checkable.

```text
BARRIER_COUNTS = {"A": 0, "B": 0, "C": 22, "D": 24, "total": 46}
PINNED_MODULE_TOTAL = 46
REMAINING_A = 0
REMAINING_B = 0
CONFIRMED_C = 22
CONFIRMED_D = 24
```

These totals must match `PINNED_BARRIER_COUNTS` and `barrierCallSitesIn` in
`tests/executableFrontierRatchet.test.ts`. The module counts are:

| Production module | count | classification |
| --- | ---: | --- |
| `battleScriptHitChainOpcode.ts` | 10 | 10 D |
| `battleScriptAttackCancelerOpcode.ts` | 2 | 2 C |
| `battleScriptMoveEndOpcode.ts` | 1 | 1 C |
| `battleScriptJumpifbyteOpcode.ts` | 1 | 1 C |
| `battleScriptJumpifwordOpcode.ts` | 1 | 1 C |
| `battleScriptJumpifhalfwordOpcode.ts` | 1 | 1 C |
| `battleScriptOpenPartyScreenOpcode.ts` | 1 | 1 C |
| `battleScriptGetexpOpcode.ts` | 2 | 1 C, 1 D |
| `battleScriptCheckteamslostOpcode.ts` | 3 | 3 C |
| `battleScriptSwitchinOpcode.ts` | 4 | 4 C |
| `battleScriptStatbuffchangeOpcode.ts` | 3 | 1 C, 2 D |
| `battleScriptDamagingWeatherOpcode.ts` | 4 | 4 D |
| `battleScriptTryCastformDataChangeOpcode.ts` | 0 | — |
| `battleScriptIngrainLeechSeedWrapOpcode.ts` | 2 | 2 D |
| `battleScriptRemoveitemOpcode.ts` | 1 | 1 D |
| `battleScriptStatusPrimaryOpcode.ts` | 3 | 3 D |
| `battleScriptTargetIterationOpcode.ts` | 1 | 1 C |
| `battleScriptProtectlikeOpcode.ts` | 0 | — |
| `battleScriptTryKOOpcode.ts` | 0 | — |
| `battleScriptForceSwitchOpcode.ts` | 1 | 1 C |
| `battleScriptSemiInvulnerableOpcode.ts` | 1 | 1 D |
| `battleScriptJumpifcantswitchOpcode.ts` | 1 | 1 C |
| `factoryBattleScriptFullTurnDecision.ts` | 1 | 1 C |
| `factoryAiCheckBadMove.ts` | 1 | 1 C |
| `factoryAiCheckViability.ts` | 1 | 1 C |

## A/B reconciliation

### Closed A items

- **A1, A2 — implemented.** The complete `AI_CheckBadMove` and
  `AI_CheckViability` effect tables now dispatch through source-shaped
  handlers. Their remaining generic guards are listed below as C because all
  effects in the current committed tables have handlers.
- **A3 — implemented.** Focus Band’s holder-only OHKO roll and continuation
  are source-complete. The old `adjustnormaldamage`/`adjustsetdamage` gap is
  not a live barrier; the source proof and both deterministic continuation
  regressions are in `tests/battleScriptTryKOOpcode.test.ts`.
- **A4 — source-refuted.** The pinned Lightning Rod branch in
  `src/battle_util.c:3854-3861` requires an
  `ABILITYEFFECT_COUNT_OTHER_SIDE` query whose target ability is not
  Lightning Rod. In a two-battler Factory battle, the only other side is the
  target itself; `targetBattler ^= BIT_FLANK` selects 2/3 when
  `gBattlersCount == 2`, and the source loop is bounded by `i <
  gBattlersCount` (`src/battle_util.c:3160-3165`). The current guard at
  `battleScriptAttackCancelerOpcode.ts:274` is therefore C, not a live A
  route. Doubles are outside this contract.
- **A5 — implemented.** `VARIOUS_GET_BATTLER_FAINTED` is accepted by the
  current handler. The same composite site remains as a C guard for excluded
  Arena/link/general-battle IDs; it is not evidence that the fainted-battler
  case is unreachable.
- **A6 — implemented.** `battleScriptFullTurnDecision.ts:1524` retains only
  the real doubles flank/multi-hit topology guard (`gMultiHitCounter != 1`).
  Factory singles do not enter that branch.
- **A7 — implemented.** `battleScriptGetexpOpcode.ts:106-118` resolves
  `BS_FAINTED`, and the pinned Spikes producers are
  `data/battle_scripts_1.s:3394-3397` and `:3424-3427`. The remaining
  selector guard at `:164` is D (future selector input); the separate general
  EXP guard at `:183` is C for the Frontier/Factory short-circuit.
- **A8 — implemented.** `B_ANIM_FOCUS_PUNCH_SETUP` is registered in
  `battleScriptStatbuffchangeOpcode.ts:257-268`, matching
  `data/battle_scripts_1.s:3712`. The unknown-animation guard at `:293` is C:
  the only unregistered concrete animation in the committed program is the
  wild-only Smoke Ball escape at `data/battle_scripts_1.s:3050-3054`.
  Argument-shape and `jumpifstatus2` guards remain D.
- **A9 — implemented in its registered tables.** The current
  `PRINTFROMTABLE_TABLES` includes the defrost and obedience tables
  (`battleScriptHitChainOpcode.ts:526-546`), covering the source paths for
  `BattleScript_MoveUsedUnfroze` (`data/battle_scripts_1.s:3761-3762`) and
  Truant’s `BattleScript_MoveUsedLoafingAroundMsg` (`:4238-4239`, with the
  source callback in `src/battle_util.c:2086-2093`). The current-program
  inventory is now complete; the three formerly missing source tables are
  receipted below, and the pointer guard is D because only a future table
  pointer outside that finite inventory can reach it.
- **A10 — implemented/retired.** `battleScriptProtectlikeOpcode.ts` has no
  unsupported-branch call site. The pinned four-entry table at
  `src/battle_script_commands.c:719-723` is now handled with the measured
  adjacent-byte fallback; the adjacent `sMovesForbiddenToCopy` data begins at
  `:725`. See `docs/protectlike-oob-adjacent-byte.md`.
- **A11 — implemented/retired.** The former manipulatedamage barrier is gone.
  The four committed producers (`data/battle_scripts_1.s:349`, `:865`,
  `:1953`, and `:3272`) use the source’s three handled damage modes; the
  remaining Ingrain count of two is for COPYARRAY and JUMPIFABILITY, not
  MANIPULATEDAMAGE. Beat Up is therefore no longer a remaining B item.
- **A12 — source-refuted.** The current outcome guard at
  `battleScriptAttackCancelerOpcode.ts:353` is C. In the pinned source,
  `RunTurnActionsFunctions` first forces `gCurrentActionFuncId =
  B_ACTION_FINISHED` (`src/battle_main.c:4937-4943`), so the move-action
  dispatch cannot recursively produce this outcome handoff. The only fresh
  move-script producer is `HandleAction_UseMove` (`src/battle_util.c:78`), and
  `ActionFinished` assigns the next action and returns
  (`src/battle_util.c:658-683`); `BattleTurnPassed` has the same preemption
  shape (`src/battle_main.c:3988-3992`).

### Source-complete `Cmd_printfromtable` receipt

The pinned `data/battle_scripts_1.s` inventory has 43 distinct
`printfromtable` pointer symbols. The only three absent from the former
registry are now transcribed directly from `src/battle_message.c`:

- `gWeatherStartsStringIds` (`battle_message.c:1156-1174`): 16 entries for
  `WEATHER_NONE` through `WEATHER_ABNORMAL`, including the source's
  `STRINGID_SANDSTORMISRAGING` and `STRINGID_SUNLIGHTSTRONG` rows. Its
  `BattleScript_OverworldWeatherStarts` continuation is pinned at
  `data/battle_scripts_1.s:3242-3246`.
- `gNoEscapeStringIds` (`battle_message.c:899-905`): 5 indexed wild/run-fail
  entries, retained even though the current Factory scope does not enter the
  wild escape path.
- `gBattlePalaceFlavorTextTable` (`battle_message.c:1388-1394`): 4 indexed
  Palace flavor entries, retained as defensive current-program completeness.

`tests/battleScriptHitChainOpcode.test.ts` pins every row and length, the
weather continuation, and the exact 43-symbol committed-program inventory.
This is a source/Tier-1 receipt only; it makes no oracle or Gate-6 claim.

### B reconciliation (none remain)

- **B1 — retired on this branch base.** The Enigma-vs-item-table
  `Cmd_accuracycheck` case is source-complete; the former call site is gone,
  leaving the HitChain module at its pinned count of 10. The retirement is
  recorded by the current history and its focused regression; no B1 guard is
  included in the inventory below.
- **B2 / table-pointer family — retired.** The exact source tables
  `gWeatherStartsStringIds`, `gNoEscapeStringIds`, and
  `gBattlePalaceFlavorTextTable` are now registered. Tier 1 pins all 16, 5,
  and 4 indexed rows, respectively, and pins the committed program's exact
  43-symbol `printfromtable` pointer inventory. The generic pointer guard at
  `battleScriptHitChainOpcode.ts:4137` remains in place for future input/data,
  but no current-program pointer is outside the registry, so this call site
  is classified D rather than B.
- **B2 / `VARIOUS` family — retired.** `VARIOUS_IS_RUNNING_IMPOSSIBLE` now
  ports `IsRunningFromBattleImpossible`'s exact source precedence, including
  Smoke Ball/Enigma, Run Away, trapping abilities, trapped/rooted state, and
  position-derived sides. `VARIOUS_SET_TELEPORT_OUTCOME` writes source
  outcomes 5/10. The full legal non-trainer Teleport script reaches its own
  terminal continuation in Tier 1. The composite guard remains counted as C
  for excluded Arena/link/general-battle IDs, so the module's call-site pin
  correctly remains four.

## Confirmed C sites (22)

C means the guard is a legitimate defensive boundary, but the current
Factory-single program cannot reach the guarded source branch. These are
listed by current production call site; source line numbers in the reason
refer to the pinned source unless marked otherwise.

1. `battleScriptAttackCancelerOpcode.ts:274` — Lightning Rod’s
   `COUNT_OTHER_SIDE` topology (`src/battle_util.c:3854-3861`), as proved for
   A4 above.
2. `battleScriptAttackCancelerOpcode.ts:353` — outcome handoff after the
   source action scheduler (`src/battle_main.c:4937-4943`), as proved for A12.
3. `battleScriptCheckteamslostOpcode.ts:93` — in-game partner HP-count
   branch (`src/battle_script_commands.c:3543-3551`).
4. `battleScriptCheckteamslostOpcode.ts:101` — Arena lost-mon exclusions
   (`src/battle_script_commands.c:3552-3577`).
5. `battleScriptCheckteamslostOpcode.ts:117` — link/multi empty-slot branch
   (`src/battle_script_commands.c:3579-3590`).
6. `battleScriptForceSwitchOpcode.ts:262` — `BattleScript_SuccessForceOut`
   reaches the trainer continuation at `data/battle_scripts_1.s:3324-3332`;
   Factory’s trainer bit takes the continuation rather than the
   `setoutcomeonteleport` arm.
7. `battleScriptGetexpOpcode.ts:183` — general EXP/evolution states
   (`src/battle_script_commands.c:3287-3300`) are short-circuited by the
   Frontier battle-type mask (`include/constants/battle.h:78,91`).
8. `battleScriptJumpifbyteOpcode.ts:141` — the 65 concrete byte compares
   are modeled except the non-Factory paths: battle-style/party-size in
   `data/battle_scripts_1.s:2849-2863`, wild run outcomes at `:1931-1932`,
   Dome draw at `:2958-2959`, and Arena results at `:4499-4500`.
9. `battleScriptJumpifwordOpcode.ts:227` — current maps handle
   `gBattleMoveDamage` and `HITMARKER_NO_ATTACKSTRING`; the remaining
   unregistered value cases are the non-Factory loss/link scripts at
   `data/battle_scripts_1.s:2945-2950`, `:2993`, and `:3000`. None is on
   Factory’s own fainted-handler path.
10. `battleScriptJumpifhalfwordOpcode.ts:165` — 14 of 15 concrete
    comparisons resolve; the remaining `gTrainerBattleOpponent_A ==
    TRAINER_SECRET_BASE` call is `BattleScript_LocalBattleLost` at
    `data/battle_scripts_1.s:2950`, after the Frontier short-circuit at
    `:2947`.
11. `battleScriptMoveEndOpcode.ts:982` — `NEXT_TARGET` is a doubles-only
    source branch (`src/battle_script_commands.c:6590-6612`).
12. `battleScriptOpenPartyScreenOpcode.ts:149` — link/multi/double party
    collection (`src/battle_script_commands.c:4876-4905`); Factory uses the
    ordinary singles path.
13. `battleScriptSwitchinOpcode.ts:317` — `switchhandleorder` case 0 is the
    multi-battler collection/order case; Factory’s committed call sites do
    not require it (`src/battle_script_commands.c:5152-5190`, with the link
    producers at `data/battle_scripts_1.s:2902-2904`).
14. `battleScriptSwitchinOpcode.ts:442` — cross-battler WRAPPED identity
    (`src/battle_script_commands.c:3199-3210`) requires more than two
    battlers.
15. `battleScriptSwitchinOpcode.ts:676` — Arena points initialization
    (`src/battle_script_commands.c:4674-4696`); Factory is not Arena.
16. `battleScriptSwitchinOpcode.ts:796` — the remaining generic `Cmd_various`
    boundary covers excluded Arena/link/general-battle IDs after the legal
    widened-scope Teleport cases were implemented. No current Factory-singles
    producer reaches an unmodeled ID.
17. `battleScriptTargetIterationOpcode.ts:114` — target iteration is
    doubles-only (`src/battle_script_commands.c:6594-6608`).
18. `battleScriptStatbuffchangeOpcode.ts:293` — unknown animation type;
    the only concrete unregistered use is the wild Smoke Ball escape noted
    above (`data/battle_scripts_1.s:3050-3054`).
19. `battleScriptJumpifcantswitchOpcode.ts:167` — the partner/multi and
    active-party scan (`src/battle_script_commands.c:4714-4848`) is outside
    Factory’s two-battler singles topology.
20. `battleScriptFullTurnDecision.ts:1524` — the remaining multi-hit flank
    rule is doubles-only (`gMultiHitCounter != 1`).
21. `factoryAiCheckBadMove.ts:2642` — the current explicit AI effect table
    covers all 109/109 committed entries; this generic guard is a
    source-synchronization boundary, not a current Factory effect route.
22. `factoryAiCheckViability.ts:7205` — the current explicit viability table
    covers all 122/122 committed entries; this generic guard is likewise
    defensive. Both AI sites are retained because the source census, not an
    assumption about future data, owns their count.

## Confirmed D sites (24)

D means the guard protects malformed operands, unsupported selectors, or
other future input/data that is not produced by the current committed Factory
program. The guard can be reached only by changing the input/data contract.

- `battleScriptHitChainOpcode.ts:1150,2345,2390,2466,3318,4128,4137,4148,4533`
  — accuracy move shape; hitanimation/healthbar/datahp selector shape;
  unsupported SetMoveEffect family; printfromtable operand/pointer/index
  shape; updatestatusicon shape; and cleareffectsonfaint selector shape. The
  Factory call sites use the registered selectors and effect family. The
  print-table pointer guard is the future-input D subcase at `:4137`.
- `battleScriptDamagingWeatherOpcode.ts:258,276,327,381` — all current
  addbyte, bicword, and jumpifarraynotequal operands are registered. In
  particular, the current handler accepts `sTRIPLE_KICK_POWER`’s delta 10;
  the stale rejection prose in the module comment is not the current guard
  behavior.
- `battleScriptGetexpOpcode.ts:164` — all five committed `getexp` selectors
  resolve to `BS_TARGET`, `BS_ATTACKER`, or `BS_FAINTED`; the guard preserves
  the future-selector boundary.
- `battleScriptIngrainLeechSeedWrapOpcode.ts:327,432` — all 16 committed
  COPYARRAY tuples and all 18 JUMPIFABILITY call sites are registered. The
  latter includes `BS_SCRIPTING`; the implementation’s old error text naming
  only target/attacker is stale, not a new live route.
- `battleScriptRemoveitemOpcode.ts:45` and
  `battleScriptSemiInvulnerableOpcode.ts:69` — selector/operand shape guards;
  current Factory calls use the registered `BS_SCRIPTING`/`BS_ATTACKER` forms.
- `battleScriptStatbuffchangeOpcode.ts:301,426` — playanimation argument
  shape and `jumpifstatus2` value map. The current six status2 values are
  `SUBSTITUTE`, `CONFUSION`, `MULTIPLETURNS`, `FOCUS_ENERGY`,
  `ESCAPE_PREVENTION`, and `NIGHTMARE` (`:410-417`); all committed calls
  resolve.
- `battleScriptStatusPrimaryOpcode.ts:112,139,172` — status1, type, and
  side-affecting value maps; all 21/5/10 committed call sites use registered
  values.

The ten HitChain, four weather, one getexp, two Ingrain, two selector, two
Statbuff, and three StatusPrimary sites above sum to 24. No source or current
call-site evidence supports reclassifying any D site as live A/B.

## Audit boundary

This close-out does not classify ordinary controller-busy blocks, explicit
`player-choice-required` halts, or unsupported behavior that has no
`unsupported-branch` census entry. Those are separate engine contracts. It
also does not use emulator traces: the C/D claims above are source/topology
claims, and the A/B ledger records only changes already present in the
current production history.
