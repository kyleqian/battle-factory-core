# S10 move-parameterization audit

Audit date: 2026-07-24. Read-only advisory evidence for S10 Gates 3--6; it does not claim gate completion or change roadmap scope.

## Verdict

**No: production move mechanics and presentation are not yet sufficiently parameterized for arbitrary Level-50 singles.** The source-derived catalogs, typed Battle Script IR, interpreter substrate, event types, and S8 round controller are sound groundwork. The live canonical battle route still resolves the historic vertical slice through move-, turn-, and absolute-scene-tick branches. The typed script machine is currently a tested seam rather than the production rules path; staged turns receive precomputed damage/actions; Scene-ON receives immutable, move-specific profiles.

This is bounded legacy vertical-slice debt, not an S8 defect. `ROADMAP.md:511-656` closes S8 without extending Battle 2 beyond tick 33331. `ROADMAP.md:1007-1047` assigns the general kernel, persistence, facility integration, and breadth proof to S10 Gates 3--6.

## Generated coverage and interpreter

| Evidence | Measured coverage | Meaning |
| --- | --- | --- |
| `src/data/gen/moves.json` | 355 records (354 non-`MOVE_NONE`), 198 move-table `effect` values; records include type, power, accuracy, PP, effect, chance, target, priority, and flags. | Complete generated metadata, not production execution. |
| `battle-frontier-mons.json` | 882 sets; indexes 0--849 are Level-50. Those 850 sets name 300 non-none moves spanning 176 move-table effect values. | Broad Factory input corpus. |
| `battle-script-topology.json` | 214 script effect entrypoints, 249 opcode slots, 355 move mappings, 276 Level-50-reachable script moves, 166 Level-50-reachable script effect families. | Source-script join; its 276/166 denominator differs correctly from the roster's 300/176 move-table denominator. |
| `battle-script-program.json` / `battle-script-opcode-observations.json` | 619 label blocks, 3,306 concrete typed starts, 232 used opcode IDs (17 source slots unused). | Strong source/macro/operand provenance. |
| `src/engine/battleScriptProgram.ts:1-220`, `battleScriptMachine.ts:80-170,298-319,669-867` | Immutable IR, call stack, scheduler, audited RNG, unsupported-opcode halt. | Credible generic interpreter substrate, not yet wired from `core.ts`. |

The current handler composition is exactly 25 IDs: five control
(`GOTO/RETURN/END/END2/CALL`), 16 scheduler/controller commands, three
multi-hit rules commands, and `MOVEVALUESCLEANUP`. See
`battleScriptMachine.ts:503-529`, `battleScriptSourceCommands.ts:720-878`,
`battleScriptRuleCommands.ts:93-240`, and
`battleScriptMoveValuesCommands.ts:75-104`.

That is **25/249 = 10.0%** of source slots, **25/232 = 10.8%** of used
slots, and **1,343/3,306 = 40.6%** observed starts. The high start fraction
is generic print/wait/control repetition, not mechanic coverage. Missing
rules-spine starts include ATTACKCANCELER (130), ACCURACYCHECK (66),
DAMAGECALC (11), TYPECALC (23), ATTACKANIMATION (92), HEALTHBARUPDATE (41),
DATAHPUPDATE (41), STATBUFFCHANGE (31), TRYFAINTMON (34), JUMPIFABILITY
(18), and JUMPIFSTATUS (21). Their exact source handler provenance is already
cataloged in `battle-script-command-handlers.json`.

`battleScriptEvents.ts:40-137` correctly declares typed HP, status,
stat-stage, animation, switch, and outcome events, and
`battleScriptPresentation.ts:21-39` provides replay without rules mutation.
At present those latter event variants have no opcode producer (the
reproduction `rg` below returns only their declarations).

## Generic seams versus reachable vertical-slice debt

- `battleScenario.ts:1-259` and `roundController.ts:102-421` are genuinely
  data-driven for Factory schedules, healing, swaps, and all seven outcomes.
  But `resolveRoundBattle` accepts caller-provided `BattleResolution`; it
  is not invoked by `core.ts`.
- `battleTurn.ts:3-181` is a deterministic fixture reducer: actions supply
  damage/stat delta, RNG reasons, and end-turn RNG count. Its mon state has
  only `status: "none"`, one accuracy stage, and a string PP map.
  `stagedBattleTurn.ts:1-86` and `core.ts:271-275,403-422` explicitly mark
  this as a dev/staged port.
- The live canonical route imports and runs fixed Battle-2 ROCK SLIDE state
  from `battle2Turn1.ts:10-134` at `core.ts:1146-1172`. It retains
  `turn1Resolved` through `turn16Resolved` (`core.ts:777-791`) and
  chained move/turn gates (`:807-1124`).
- `battleMenu.ts:2515-2587` derives PP from individual historic turn flags
  for ROCK SLIDE/BIND/DRAGON BREATH. It retains synthetic per-turn anchors,
  e.g. `TURN6_ROCKSLIDE_PRESS_TICK` at :2277 and TURN7 at :2361.
- Absolute scene timing is reachable through `SCENE_TICK0`
  (`core.ts:122-131,762-763`) and named Battle-2 tick constants
  (`battle2Turn1.ts:16-24`). These are legacy branches to migrate, never
  extend. This audit found no screenshot/framebuffer lookup or RGB fitting.

## Rules gaps

| Required capability | Current state / gap |
| --- | --- |
| Selection, target legality, priority/speed | Staged reducer consumes preordered actions; no source-derived production path. |
| Accuracy, critical, STAB/type/random damage | Source records exist, but ATTACKCANCELER/ACCURACYCHECK/DAMAGECALC/TYPECALC are unsupported. |
| PP/failure | Fixture decrements supplied names; menu derives historic slots. No PP-Up, Pressure, choice/failure model. |
| Status, volatile state, all stages | STATUSANIMATION is display receipt only; fixture has none + accuracy. No lifecycle/immunity model. |
| Items/abilities | Generated item/ability data exist, but no source-mapped hook dispatcher. |
| Weather/side/multi-turn/end turn | No persistent context/timers or source ordering; fixture accepts end-turn RNG counts. |
| Faint/switch/outcome | Event types and round acceptance exist, but no live kernel producer, bench/switch hooks, or core integration. |

## Presentation

`sceneOnPresentation.ts:388-402` is a union of **12 named moves**: FIRE
PUNCH, ICE PUNCH, FAINT ATTACK, ROCK SLIDE, DOUBLE TEAM, ENDEAVOR, FEATHER
DANCE, QUICK ATTACK, AERIAL ACE, SAND ATTACK, BOUNCE, and FLY. The component
has reusable geometry (`:84-105`), side transforms, HP interpolation
(`:367-386`), healthbox/message/sprite composition, and correctly consumes
already-resolved inputs (`:659-710`). It nevertheless uses per-move,
species/orientation controller profiles at `:1303-1683`, such as
`ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE` and
`GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE`.

The animation ledger is therefore ahead of rules, not a substitute for it:
`ANIMATION_PROGRESS.md:15-31` records **10 exact / 4 partial / 262
unsupported** Level-50 presentation moves, with per-move evidence in
`ANIMATION_COVERAGE.json`. Reusable presentation components should consume
kernel events; individual move timelines may remain source/evidence-driven.

## Ranked next bounded migrations

1. **Main — battle context and action-result seam.** Publish active/bench
   context and typed rules events; wire RoundController to kernel outcomes
   instead of injected BattleResolution. This blocks further `turnNResolved`
   growth.
2. **Main — first rules-spine opcode family.** Implement
   ATTACKCANCELER/ACCURACYCHECK/DAMAGECALC/TYPECALC with PP and HP update as
   one source-mapped family. It gives generated move data its first production
   consumer without move-name dispatch.
3. **Side — generated move/script/effect/hook join.** Produce a file-disjoint
   artifact/test joining each Level-50 move to script entrypoint, effect,
   target/flags, and item/ability hook category, explicitly recording null
   joins. This establishes Gate 3/4/6 denominators.
4. **Main — persistent mechanics scheduler.** Add primary/volatile statuses,
   all stages, weather/side state, switch/faint/end-turn hooks to that one
   context, with representative mechanicLab traces per family.
5. **Animation — event-to-profile adapter.** Consume immutable kernel events
   and catalog-derived geometry rather than hand-created controller fixtures;
   retain proven move timelines but never own damage/RNG/outcomes.

## Reproduction

Run at the worktree root:

```sh
bin/oracle info
npm test
npm run build

node - <<'NODE'
const fs = require('fs');
const read = (f) => JSON.parse(fs.readFileSync(`src/data/gen/${f}.json`, 'utf8'));
const moves = read('moves').moves, mons = read('battle-frontier-mons').entries;
const topo = read('battle-script-topology'), obs = read('battle-script-opcode-observations');
const l50 = mons.filter((m) => m.index < 850);
const names = new Set(l50.flatMap((m) => m.moves).filter((m) => m !== 'MOVE_NONE'));
const rows = moves.filter((m) => names.has(m.move));
console.log({allMoves:moves.length, allEffects:new Set(moves.map(m=>m.effect)).size,
  l50Sets:l50.length, l50Moves:rows.length, l50Effects:new Set(rows.map(m=>m.effect)).size,
  topology:topo.counts, observations:obs.counts});
NODE

rg -n 'install\("B_SCR_OP|installHandler\(program, handlers' src/engine/battleScript{Machine,RuleCommands,MoveValuesCommands,SourceCommands}.ts
rg -n 'SCENE_TICK0|turn[0-9]+Resolved|ROCK_SLIDE|DRAGON_BREATH|BIND' src/engine/core.ts src/engine/battleMenu.ts src/engine/battle2Turn1.ts
rg -n 'kind: "(hp-change|status-change|stat-stage-change|switch|outcome|animation)"' src/engine --glob '*.ts'
rg -n 'resolveRoundBattle\(' src/engine tests --glob '*.ts'
```
