# Animation verification contract

Shared by animation supervisors and workers. Updated by the user-authorized
2026-09-19 and 2026-09-22 maintenance passes. For animation work this overrides blanket
full-suite-at-every-commit requirements in AGENTS.md and older launch briefs.
Dense, twice-fresh, both-orientation, actual-core framebuffer acceptance and
all required variants remain unchanged.

## Choose gates from the changed files

- **Evidence, test, or tooling only:** run every affected source/staging/evidence
  verifier and test, the animation boundary and inventory checks, coverage,
  animation audit, and `git diff --check`. Run typecheck when TypeScript test
  interfaces change. No full game suite or production build is required when
  no production module, asset, dependency, production configuration, or shared
  production helper changes. A docs-only checkpoint requires only diff and ledger checks.
- **Production animation, assets, engine seam, dependencies, or production configuration:**
  run the affected semantic/framebuffer tests, applicable shared-component
  controls, smoke tests, full `npm test`, and `npm run build` once before the
  worker handoff. Preserve the unchanged dense acceptance bar.
- Record the tested code commit/tree, commands, outcomes, and scope. A result
  from before a code repair is not a receipt for the repaired code.

## Supervisor acceptance

Review the diff and independently reproduce its central source/evidence or
framebuffer claim. On a clean fast-forward or a merge with no other code
change, reuse the worker's same-code full-suite/build receipt; run affected
checks plus smoke rather than repeating both full gates. Resolve conflicts,
new master code, failed gates, production repairs, or missing receipts with a
fresh full suite/build on the actual union. Serialize heavyweight commands.

Run one independent complete suite/build at session wind-down when production
code changed during that session; a full pair already run by the supervisor on
the final code counts. Evidence/test/tooling-only sessions use their scoped
gates above. An unchanged idle session with a valid green baseline must not
repeat full tests/builds or create a ledger-only commit merely because the timer
fired. Check the derived work plan, tree/receipt identity, and blocker conditions,
then exit if there is truly no dispatchable work. This idle exception overrides
older unconditional wind-down wording. At session start,
reuse a recorded green baseline when the production tree and relevant
environment are unchanged. Tooling/test/evidence deltas need their recorded
scoped gates before dispatch; production/dependency/configuration deltas or a
missing production receipt need a full baseline. Documentation alone does not
invalidate a code receipt. Never invent or assume a green result.

## Random2 live integration — user-approved D3, 2026-10-06

The user authorized a separate deterministic presentation RNG for the next
S10A run. This narrowly changes the arbitrary-play randomness claim for the
52 Random2-dependent remaining adapters; the source animation algorithms,
timing, geometry, resources, lifecycle and cleanup still need their proofs.

- Verify the source RNG recurrence, draw order/count and value transformations
  against the reproduced known-activation vectors. RNG state belongs to
  presentation, is seeded independently per battle, and never consumes or
  mutates gameplay RNG. Rendering a frame again must not advance the stream.
- Prove controlled bodies with pinned source random values through the
  production live renderer: dense full windows, both orientations, twice
  fresh, alternate species and every required variant. Vary seeds/words to
  exercise the source branches and ranges. Keep pinned and surrogate provenance
  explicit; a pinned fixture proves the controlled body, not arbitrary-play
  oracle RNG synchronization.
- Exercise ordinary surrogate-driven routes through cleanup and following
  prompts, with repeat/multi-hit/switch/faint cases as relevant. Prove unchanged
  gameplay outcomes and RNG with Scene ON/OFF and different presentation seeds.
  Persist seed and policy version in session exports; replay/reset is visually
  reproducible, including the documented default for legacy exports.
- Count promoted surrogate adapters separately as "faithful random" in the
  live inventory and reports. Preserve existing scoped exact claims and
  Factory body acceptance; no production capture-row inputs or exact credit
  for surrogate randomness. Unproved non-random host history keeps its fallback.
- Production changes still require the normal affected controls, smoke,
  typecheck where applicable, full suite/build and independent supervisor
  reproduction. Approval resolves D3 only; it does not waive any other gate.

## Keep move checks local

Global totals, work-plan accounting, and queue priority are checked centrally in
`tests/animation/factoryAnimationInventory.test.ts`. A move test/audit checks
that move and its real source/component dependencies, not the total number of
accepted moves or unrelated queue members. Stable evidence hashes must exclude
global counts and unrelated queue state. Adding another accepted move must not
rewrite old ROM, semantic, or framebuffer receipts. Do not weaken per-move
source, asset, lifecycle, latch, or framebuffer assertions to satisfy this rule.

## Work exhaustion is an explicit accounting result

`animationWorkPlan()` derives all non-exact Factory moves from the inventory:
Level 50 first, then Open-only Outrage (added by the user on 2026-09-22).
Blocked Level 50 moves do not prevent dispatching ready Open-only work.
Each unfinished Factory move must appear either in `ready` or in `blocked`, with reason, evidence, and
resume condition. `ANIMATION_COVERAGE.json.queue` only sets priority; an empty
manual list never means the remaining moves are unauthorized or exhausted.
`state: blocked` differs from `state: complete`. Component reuse and dormant
contest-only track obligations never waive move acceptance or hide ready moves.
The 77 moves outside the Factory are outside this campaign scope.
