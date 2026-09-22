# Remaining-animation runtime investigation — 2026-09-22

## Decision being tested

Would shared animation machinery reduce the work still required for the **77
non-Factory moves**, compared with extending the existing helpers? Historical
savings and replacing the 266 accepted Factory implementations are not goals.
The user explicitly authorized this parallel investigation, then clarified that
only future payoff matters. Factory work, including Outrage, continues on
Hetzner using the current approach.

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

## Next decision gate

Do not commit to a full runtime rewrite on this result. Compare incremental
implementation and verification work on remaining moves:

1. **Snatch via the existing helper:** its short script can use the already
   parameterized `windUpLunge.ts`. This is the inexpensive baseline.
2. **Mud Sport's Splash task reuse:** carry the tested callback and affine
   scheduler forward with six hops and delayed sprite creation. Measure added
   machinery and exceptions; do not claim the mud sprites are solved.
3. **Bone Club → Bone Rush**, if more runtime investment is warranted: new
   spinning-bone sprites plus shared background/hitsplat/shake paths provide a
   more useful graphics comparison than implementing another accepted move.

Record source files/callbacks added, hand-authored timing exceptions, elapsed
implementation and validation effort, and dense residuals. Prefer the existing
helper route for cheap moves. Extend shared machinery only when its next use
on unfinished work demonstrates a benefit. This experiment does not establish a
net speedup over that baseline yet.

## Verification and handoff

- Focused tests: 19 tests across runtime, animation boundary and inventory.
- Fresh local mGBA: all rows in the table pass; Splash repeats identically.
- Coverage, existing asset audit and diff checks pass; full production tests and
  build are reused from the unchanged baseline under ANIMATION_VERIFICATION.md.
- `npm run typecheck` passes on the experiment and its tests.
- Reproduction commands and retained receipts are in
  `tools/animation/runtime-spike/README.md`.

The regular Hetzner supervisor remained active during the experiment; its
Extrasensory worker completed corrected bilateral repeated captures and was
analyzing its evidence. This investigation did not call its oracle or run tests
on its machine.
