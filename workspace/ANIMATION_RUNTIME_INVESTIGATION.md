# Remaining-animation runtime investigation — 2026-09-22

## Decision being tested

Would shared animation machinery reduce the work still required for the **77
non-Factory moves**, compared with extending the existing helpers? Historical
savings and replacing the 266 accepted Factory implementations are not goals.
The user explicitly authorized this parallel investigation, then clarified that
only future payoff matters. Factory work, including Outrage, continues on
Hetzner using the current approach.

**Decision after the forward comparison: adopt shared animation machinery
incrementally for unfinished families. Keep existing helpers for cheap moves.
Do not make a complete VM/graphics port a prerequisite for the remaining 77.**
There is no identified architectural blocker to a native TypeScript animation
runtime. The evidence supports reusable scheduling and callbacks; it does not
establish that porting all animation infrastructure upfront would finish this
backlog sooner. No battle-engine rewrite is needed for this presentation work.

This branch is `codex/animation-runtime-investigation`, based on animation-main
`899b3c034`. It runs locally in a separate worktree. Nothing is wired into the
production renderer or campaign, and no coverage status has been promoted.
Do not merge this experiment into the campaign or restart its services.

## First bounded result

An experimental TypeScript script interpreter, task scheduler and task-driven
affine helper execute source-extracted scripts. **Splash is the new, unfinished
move tested.** Tail Whip and Bind are regression controls, not rewrite targets.
The runtime dispatches source commands/callbacks; it has no move-name tests,
per-move start-age tables, or per-move display-delay adjustments.

| Case, per orientation | Complete source rows | Selected OBJ transfer rows |
| --- | ---: | ---: |
| Splash — previously unsupported, Magikarp | 116/116 | 115/115 |
| Tail Whip — existing control | 77/77 | 76/76 |
| Bind — existing control | 42/42 | 41/41 |

Both player and opponent orientations pass. A second fresh Splash capture is
identical to the first in both orientations. Transfer comparisons begin on the
second row, after the initial context has seeded the scheduler.

Source comparisons include the script pointer, active/wait state, arguments,
visual/sound task counts, allocated task slots, priority links, all task data,
battler offsets, affine mode and matrices. Transfer checks compare the selected
battler OBJ records and active hardware matrices. They **do not** compare full
OAM ordering or render a framebuffer. The runtime predicts these values from
initial state and source logic; later oracle rows are assertions, except for
the unported audio host's per-frame `IsSEPlaying` input.

The useful reusable part for the remaining backlog is the task-affine path:
`PrepareAffineAnimInTaskData` / `RunAffineAnimFromTaskData`, with the Splash
callback, source command data, integer storage and frame scheduling. Splash's
callback is also used with different parameters by Mud Sport and Sketch.
Meditate and Slack Off also use the task-affine machinery. Those moves have
additional work and are not implemented or validated by this result.

## What is still unproven

- This is a source/selected-transfer experiment, **not Splash pixel acceptance**
  or a browser integration. Coverage remains unsupported.
- Sprite creation, sprite animation, graphics allocation, palette/BG/window
  composition, GPU register timing and presentation RNG are absent. Existing
  `gbaObjCompositor.ts` and `gpuRegisterQueue.ts` should be reused where suitable.
- The runtime accepts caller-owned battler geometry and preallocated matrix
  state. Initial active tasks other than `TaskDummy` fail explicitly. Real
  captures here begin with no active tasks; occupied-slot behavior has focused
  scheduler tests, not an oracle-backed resource-pressure claim.
- Audio command/task scheduling is implemented; the audio engine is not.
  Completion is conditional on the external host's busy signal. No claim of
  independently reproducing sound lifetime or audio pixels/cycle timing.
- Only extracted frame/end task-affine commands and zero rotation are supported;
  unknown opcodes, callbacks, affine loops/jumps/rotation and exhausted task
  slots fail. Contest, doubles, transformed species and VCOUNT timing are outside
  this experiment. Inputs must eventually preserve live presentation history.

## Forward backlog assessment

The pinned component graph gives the following **source-overlap counts**, not
estimates of remaining effort or certified reusable TypeScript callbacks:

| Graph IDs absent from exact moves' full source graphs | Remaining moves |
| --- | ---: |
| 0 | 16 |
| 1 | 25 |
| 2 | 17 |
| 3 or more | 19 |

Of 132 distinct absent graph IDs, 126 occur in only one remaining move. Recurring
new native callbacks/templates include Splash (3 moves), spinning bone (2) and
fire plume (2). A full VM cannot remove the cost of those unique callbacks,
assets, staging, and per-move verification. Broad shared plumbing still appears
frequently: monbg in 47 remaining moves, hitsplats in 29, ShakeMon in 24 and
ShakeMon2 in 17.

The graph needs caution in both directions. Waterfall looks fully represented
through Secret Power's full graph, while Secret Power's accepted Factory body
is the Strength branch. Nature Power's apparent new Ancient Power subroutine
comes from label fallthrough; the actual mechanic chooses another move's
animation. Neither should be treated as a ready callback count.

## Forward comparison completed

Fresh, local mGBA captures of Ekans using Snatch and Geodude using Mud Sport
exercise remaining non-Factory work. Each is captured in both orientations.
Their source learnsets permit those moves; duplicate move slots constrain the
AI in MechanicLab, following the existing capture convention.

| Case, per orientation | Component source rows | Selected transfer rows | New execution logic for this comparison |
| --- | ---: | ---: | --- |
| Snatch, existing `windUpLunge.ts` | 52/52 | 51/51 | None |
| Mud Sport, existing experimental Splash task | 228/228 | 228/228 | None |

There are zero mismatches and no move-specific timing corrections. Both
`src/animation/windUpLunge.ts` and `runtime.ts` are unchanged. Added work is
comparison tooling, source decoding, fixtures, observations and tests. This is
a structural cost comparison, not a controlled wall-clock productivity
benchmark or a delivery-time forecast.

Snatch uses its source-extracted arguments with the existing helper. Checks
cover offsets, task lifetime/phase, and the selected battler's software/hardware
OAM coordinates over the complete 52-row animation. The ordinary frame ordering
explains the transfer delay. This is enough to establish helper reuse, but not
full pixels, script/audio completion or production integration. The helper's
comment about an immediate constructor step is imprecise: the source initializer
sets Step1, and the first RunTasks invocation advances it. No behavior change
was necessary.

Mud Sport reuses the Splash callback with six hops instead of three, and a new
species with different sprite geometry. This comparison is intentionally an
**isolated task projection**: capture supplies the creation boundary once
(age 4), and the preceding context seeds a synthetic create-task/wait harness.
Source-extracted arguments and the unchanged callback predict every subsequent
row through task destruction. All 16 task data fields, slot, priority, callback,
battler state and selected OBJ/matrix transfers match. Task links to unrelated
sound tasks, those sound tasks, global script/counters, resource loading and mud
particles are excluded. The full Mud Sport script still fails explicitly at
`loadspritegfx`; the decoder recognizing a command does not implement it.
This proves the callback carries forward, not that Mud Sport is finished.

Retained data and scope are in `tools/animation/runtime-spike/forward-receipt.json`.
The tests also corrupt later observations and require mismatch detection, so
the comparator cannot silently consume those observations as predicted motion.

## Why an upfront full port is the wrong investment boundary

A reproducible source-graph audit of the 77 remaining roots finds:

| Requirement somewhere in the source graph | Moves |
| --- | ---: |
| Load sprite graphics | 68 |
| Direct `createsprite` instructions, excluding macro-created sprites | 57 |
| Move a battler onto a background (`monbg`) | 47 |
| Alpha blending | 41 |
| Basic hitsplats | 29 |
| Two-turn dispatch (`choosetwoturnanim`) | 5 |
| `jumpreteq` dispatch (Weather Ball) | 1 |

These count whole source graphs, not accepted or necessarily reachable gameplay
branches. `audit-forward.py` and `forward-graphics-audit.json` retain the exact
inputs, hashes and consumers. Graphics state and composition dominate the
missing capabilities; adding branch opcodes is comparatively small. A VM also
still needs each distinctive C callback translated and each move validated.

Bone Club and Bone Rush show the useful boundary. They share the spinning-bone
template, graphics, background, hitsplat and shake sequence. The new projectile
callback in `battle_anim_ground.c:184` mainly sets up target coordinates and
calls linear translation; `animLinearTranslation.ts` and the BONE art in
`assets/bonemerang.json` already exist. But the affine program rotates and jumps
(`battle_anim_ground.c:37`), and the spike lacks sprite lifecycle, resource
allocation, background and palette execution. Bone Club adds a palette blend.
The family is a sensible consumer of those shared additions, not evidence that
copying its script alone finishes the pair.

## Recommended eventual implementation

1. Deliver cheap remaining moves such as Snatch through existing helpers.
   Their completion should not wait for generic graphics infrastructure.
2. Promote the useful scheduler/task-affine pieces while completing the
   Splash/Mud Sport/Sketch family. Reuse task-affine execution for Meditate and
   Slack Off where applicable, while implementing their additional callbacks.
3. Add sprite lifecycle and frame/affine playback with a concrete unfinished
   family such as Bone Club/Bone Rush. Preserve source slot allocation,
   immediate callbacks, fixed-width arithmetic and persistent presentation
   state. Reuse the current compositor and GPU register queue.
4. Add shared background/alpha/hitsplat handling as those consumers require it.
   These are stateful tasks and palette/scroll operations, not mere flags.

The delivery condition remains dense bilateral framebuffer parity for each
move, including its legal branches. For shared infrastructure, the practical
payoff check is the second unfinished consumer: it should reuse the mechanism
with source data/parameters and its own callback, without new per-move frame
corrections. If it needs another timing reconstruction, fix the shared boundary
before expanding that abstraction. Never promote a component proof as move
acceptance.

This is a positive decision for incremental reuse and a decision against an
upfront general port. It does not justify interrupting the current Factory
campaign, rewriting its accepted moves, or promising a particular speedup.

## Verification and handoff

### Subsequent user-authorized implementation on hcloud

The user subsequently asked to build this now using spare capacity and clarified
that execution should be on hcloud. On 2026-09-22 at 05:25 UTC, a separate bounded
implementation run was launched as `pokebench-animation-runtime.service` on
95.216.222.140. Its parent branch is `codex/animation-runtime-hcloud`, setup
commit `32f423c09`, based on this research's `d7c8493bb`.

Remote parent workspace:
`/srv/pokebench/pokeemerald-factory-core/workspace/.worktrees/animation-runtime/workspace`.
Read its `NATIVE_ANIMATION_BRIEF.md` and `NATIVE_ANIMATION_PROGRESS.md` for scope
and handoff. The standard animation worker launcher creates a disposable child
worktree; review its committed output before merging into the isolated parent.
The first assignment is a reusable full-script Splash/Mud Sport runtime with
sprite/resource lifecycle and mud particles, dense bilateral validation and
rendering integration toward full pixel acceptance. The worker is Sol/high
under the repository's novel-integration routing, with a 180-minute cap,
7 GiB service memory limit and two CPUs. There is no recurring timer.

This records dispatch, not completion. The existing Factory supervisor remained
active and unchanged. No automatic merge into Factory or master is authorized
by this setup, and no move acceptance is implied by the research receipts below.

- Focused tests: 25 tests across runtime, forward comparison, boundary and inventory.
- Fresh local mGBA: all rows in both tables pass; Splash repeats identically.
- Coverage, existing asset audit and diff checks pass; full production tests and
  build are reused from the unchanged baseline under ANIMATION_VERIFICATION.md.
- `npm run typecheck` passes on the experiment and its tests.
- Reproduction commands and retained receipts are in
  `tools/animation/runtime-spike/README.md`.

During the initial spike, the regular Hetzner supervisor remained active; its
Extrasensory worker completed corrected bilateral repeated captures and was
analyzing its evidence. This investigation did not call its oracle or run tests
on its machine. The forward comparison likewise made no remote service,
campaign, production implementation or coverage changes.
