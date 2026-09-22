# Playable animation integration audit — 2026-09-22

## Decision

Prioritize a live battle-to-animation integration lane over additional
non-Factory runtime work. Existing accepted move implementations can support
this work now. Finishing the remaining Factory animations and integrating the
accepted ones into ordinary play are separate workstreams.

This was a read-only code/branch audit. No playable options, gameplay code,
services, or existing campaign scope changed. No new implementation run was
launched by this audit.

## Verified state

- At 14:59 UTC, hcloud `animation-main` was `9efa9d232`; main was `3f76b234d`.
  `git rev-list --left-right --count master...animation-main` returned `0 761`.
  That counts all commits, including tests/docs; it is not a feature count.
  The animation supervisor owns inbound main merges; outbound folds into main
  belong to the main/integration owner (ANIMATION_SUPERVISOR.md:125–131).
- The browser starts `createInitialState()` in `src/main.ts:21`, defaulting to
  `generated-orchestrator` (`src/engine/core.ts:848` in the local inspected
  animation snapshot). Fresh generated battles explicitly choose
  `battleScene: "off"` in `factoryRoundBattleOrchestrator.ts:987`; this was
  confirmed on the current hcloud branch as well.
- The Scene-ON state is labeled a dev-probe surface and initialized to null.
  The app can advance and render it when supplied, but normal battle flow
  does not construct it. On hcloud its initializer is `core.ts:871` and its
  special tick branch is `core.ts:1147`. Tests/tools supply the state directly.
- The live battle-resolution render branch selects
  `renderBattleResolutionSceneOffView`, ahead of the isolated Scene-ON branch.
  See local `core.ts:3401–3418` and `:3567`. Assigning the isolated field alone
  would therefore not integrate it into live resolution ownership.
- The rules engine already emits a MOVE_ANIMATION event with move identity,
  turn, power, damage, friendship and multi-hit data
  (`battleScriptHitChainOpcode.ts:2197–2290`).
- The live presentation command retains only battler/event sequence/timing
  (`battleResolutionPresentation.ts:126`). Its builder treats MOVE_ANIMATION
  and SCENE_OFF_ATTACK_PAUSE together, uses the fixed Scene-OFF pause, and
  skips the command when no associated hit event exists (`:3336–3378`).
  The live render view has hit/stat/status branches but no move-effect branch
  (`battleResolutionPresentationRender.ts:1120`).
- The isolated Scene-ON advance function only increments age
  (`sceneOnPresentation.ts:12336`); a live owner still needs creation,
  completion, cleanup, and return-to-resolution behavior.
- Example accepted-move verification, `tools/compare/foresightActualCore.ts`,
  builds explicit geometry/allocation/palette/background inputs from a staged
  capture, then injects `sceneOnPresentation` into `core.render()`. This proves
  the production move rendering path, not ordinary battle-to-animation wiring.
  Production must construct equivalent inputs from live presentation state.

Local source references above use animation snapshot `899b3c034`; the key route,
command, and ownership facts were separately confirmed on hcloud `9efa9d232`.
The old roadmap explicitly deferred the browser ON/OFF selector and kept the
playable route OFF. That explains the separation; it is not a reason to treat
future integration as impossible or require the new experimental runtime.

## Useful parallel work

1. **Playable integration, first priority.** Start from a pinned green animation
   commit in an isolated integration branch. Preserve move identity/parameters
   in live commands; construct typed presentation inputs from current battlers,
   species, geometry and persistent graphics state; own the animation clock and
   completion; restore text/HP/hit/faint/menu sequencing. Prove one actual
   generated battle, both attackers, through the next command prompt. Then add
   status/no-hit, multi-hit, two-turn, switching and KO cases. A toggle alone is
   not this deliverable. Keep the existing OFF path as a regression control.
2. **End-to-end QA, independently useful.** Build deterministic input/replay
   scenarios starting at the real draft/command route, with no injected
   Scene-ON stage. Check visible move dispatch, repeated moves, cleanup, HP and
   faint order, and return to input. Compare rules outcomes/RNG ownership across
   presentation modes. This can be file-disjoint from animation implementations
   once the integration request/completion contract is fixed.
3. **Fold and playable preview.** Bring a verified animation snapshot into the
   integration build, prove the union, expose a build-stamped playable preview,
   and make errors export the existing replayable session trace. Do not assume
   the user's current preview serves animation-main: no current browser URL or
   deployment revision was provided or established by this audit.
4. **Validation portability, smaller optional task.** Fix shared raw-RGB archive
   reading/packaging so Mac AppleDouble members cannot break Linux checks;
   preserve actual frame hashes and membership. The runtime worker encountered
   this on old evidence. This is useful independent test infrastructure, but
   not a substitute for live integration.

Most implementation can live in new adapter/contract/test files. The live
animation lane also edits `core.ts` and `battleScene.ts`, so the final hooks
need a coordinated merge and union validation; this is not perfectly disjoint
work. Do not stop or rewrite the running Factory lane to begin the audit/adapter.

Success means selecting a move in an ordinary playable battle, seeing the
already-verified animation with current battlers, then reaching the correct
next input state. Individual move coverage numbers alone do not establish that.
