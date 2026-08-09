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
singles. The two remaining B sites are composite guards whose current
call-site inventories still include an unmodeled subcase.

## Counting contract

The inventory is one row per `unsupportedBranch(...)` call site, excluding the
helper definition. The two `factoryAi*` modules have the equivalent literal
`kind: "unsupported-branch"` site and are counted the same way. A composite
site is assigned its strongest remaining classification once: a site with a
live B subcase is counted as B even when another subcase at that same guard is
proven C. This keeps the module sum and category sum machine-checkable.

```text
BARRIER_COUNTS = {"A": 0, "B": 2, "C": 21, "D": 23, "total": 46}
PINNED_MODULE_TOTAL = 46
REMAINING_A = 0
REMAINING_B = 2
CONFIRMED_C = 21
CONFIRMED_D = 23
```

These totals must match `PINNED_BARRIER_COUNTS` and `barrierCallSitesIn` in
`tests/executableFrontierRatchet.test.ts`. The module counts are:

| Production module | count | classification |
| --- | ---: | --- |
| `battleScriptHitChainOpcode.ts` | 10 | 1 B, 9 D |
| `battleScriptAttackCancelerOpcode.ts` | 2 | 2 C |
| `battleScriptMoveEndOpcode.ts` | 1 | 1 C |
| `battleScriptJumpifbyteOpcode.ts` | 1 | 1 C |
| `battleScriptJumpifwordOpcode.ts` | 1 | 1 C |
| `battleScriptJumpifhalfwordOpcode.ts` | 1 | 1 C |
| `battleScriptOpenPartyScreenOpcode.ts` | 1 | 1 C |
| `battleScriptGetexpOpcode.ts` | 2 | 1 C, 1 D |
| `battleScriptCheckteamslostOpcode.ts` | 3 | 3 C |
| `battleScriptSwitchinOpcode.ts` | 4 | 1 B, 3 C |
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
  current `battleScriptSwitchinOpcode.ts:749-766` handler. The one remaining
  `VARIOUS` guard at `:762` is B because the committed program still has the
  Teleport/force-switch subcase; it is not evidence that the fainted-battler
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
  (`battleScriptHitChainOpcode.ts:519-540`), covering the source paths for
  `BattleScript_MoveUsedUnfroze` (`data/battle_scripts_1.s:3761-3762`) and
  Truant’s `BattleScript_MoveUsedLoafingAroundMsg` (`:4238-4239`, with the
  source callback in `src/battle_util.c:2086-2093`). The pointer guard at
  `:4092` remains B because the committed source also has weather and other
  non-registered table-pointer families. Its proven C subcases are recorded
  below without a second inventory count.
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

### Remaining B items

- **B1 — retired on this branch base.** The Enigma-vs-item-table
  `Cmd_accuracycheck` case is source-complete; the former call site is gone,
  leaving the HitChain module at its pinned count of 10. The retirement is
  recorded by the current history and its focused regression; no B1 guard is
  included in the inventory below.
- **B2 / table-pointer family — 1 site.**
  `battleScriptHitChainOpcode.ts:4092` still rejects a pointer outside the
  registered tables. `gWeatherStartsStringIds` is a source-produced family
  (`data/battle_scripts_1.s:3242-3246`, callback from
  `src/battle_util.c:2529`), and the wild no-escape and Palace flavor-text
  families are likewise outside the registered quartet. The defrost and
  obedience subcases are implemented as noted for A9.
- **B2 / `VARIOUS` family — 1 site.**
  `battleScriptSwitchinOpcode.ts:762` still protects unregistered
  `Cmd_various` IDs. `VARIOUS_GET_BATTLER_FAINTED` is implemented, but the
  committed force-switch/Teleport producer remains a distinct live subcase;
  the guard is therefore retained and counted B. The source command’s broad
  dispatch is `src/battle_script_commands.c:6250-6330`.

## Confirmed C sites (21)

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
13. `battleScriptSwitchinOpcode.ts:289` — `switchhandleorder` case 0 is the
    multi-battler collection/order case; Factory’s committed call sites do
    not require it (`src/battle_script_commands.c:5152-5190`, with the link
    producers at `data/battle_scripts_1.s:2902-2904`).
14. `battleScriptSwitchinOpcode.ts:414` — cross-battler WRAPPED identity
    (`src/battle_script_commands.c:3199-3210`) requires more than two
    battlers.
15. `battleScriptSwitchinOpcode.ts:648` — Arena points initialization
    (`src/battle_script_commands.c:4674-4696`); Factory is not Arena.
16. `battleScriptTargetIterationOpcode.ts:114` — target iteration is
    doubles-only (`src/battle_script_commands.c:6594-6608`).
17. `battleScriptStatbuffchangeOpcode.ts:293` — unknown animation type;
    the only concrete unregistered use is the wild Smoke Ball escape noted
    above (`data/battle_scripts_1.s:3050-3054`).
18. `battleScriptJumpifcantswitchOpcode.ts:167` — the partner/multi and
    active-party scan (`src/battle_script_commands.c:4714-4848`) is outside
    Factory’s two-battler singles topology.
19. `battleScriptFullTurnDecision.ts:1524` — the remaining multi-hit flank
    rule is doubles-only (`gMultiHitCounter != 1`).
20. `factoryAiCheckBadMove.ts:2642` — the current explicit AI effect table
    covers all 109/109 committed entries; this generic guard is a
    source-synchronization boundary, not a current Factory effect route.
21. `factoryAiCheckViability.ts:7205` — the current explicit viability table
    covers all 122/122 committed entries; this generic guard is likewise
    defensive. Both AI sites are retained because the source census, not an
    assumption about future data, owns their count.

## Confirmed D sites (23)

D means the guard protects malformed operands, unsupported selectors, or
other future input/data that is not produced by the current committed Factory
program. The guard can be reached only by changing the input/data contract.

- `battleScriptHitChainOpcode.ts:1105,2300,2345,2421,3273,4083,4103,4136,4488`
  — accuracy move shape; hitanimation/healthbar/datahp selector shape;
  unsupported SetMoveEffect family; printfromtable operand/index shape;
  updatestatusicon shape; and cleareffectsonfaint selector shape. The Factory
  call sites use the registered selectors and effect family. The print-table
  pointer guard at `:4092` is the separate B site.
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

The nine HitChain, four weather, one getexp, two Ingrain, two selector, two
Statbuff, and three StatusPrimary sites above sum to 23. No source or current
call-site evidence supports reclassifying any D site as live A/B.

## Audit boundary

This close-out does not classify ordinary controller-busy blocks, explicit
`player-choice-required` halts, or unsupported behavior that has no
`unsupported-branch` census entry. Those are separate engine contracts. It
also does not use emulator traces: the C/D claims above are source/topology
claims, and the A/B ledger records only changes already present in the
current production history.
