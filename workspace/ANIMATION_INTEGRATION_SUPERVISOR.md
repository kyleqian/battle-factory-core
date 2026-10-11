# Playable animation stage — main supervisor detail

The user's 2026-10-03 direction makes integration the next main roadmap stage,
run through the normal `./run-supervisor.sh`. This file details S10A for the main
supervisor; it is not an independent supervisor program. Read `AGENTS.md`,
`LOCAL_SETUP.md`, `ANIMATION_INTEGRATION_BRIEF.md`, the latest integration
progress, and `ANIMATION_VERIFICATION.md`. The latter controls scoped gates.
Follow `SUPERVISOR.md` for the common supervision/model-routing workflow;
S10A's mission and scoped acceptance policy control this stage's work queue.

## Ownership and starting point

- Supervise primary local `master`. Only one main supervisor may write this
  checkout. Start from the latest integration progress and exact tested tree.
- The 2026-10-02 session verified and folded all fourteen recovered physical
  adapters (65 to 79). Do not repeat that recovery. Reuse the latest recorded
  local full-suite/build receipt when production and environment are unchanged,
  with scoped checks for subsequent tooling changes.
- Resume the latest ledger and ROADMAP S10A's ordered steps. D3 option (a) was
  approved and implemented on 2026-10-06 (presentation RNG host, seed export,
  separate faithful-random accounting). Production (src tree `4c4fe4c7`, 2026-10-10 evening) has 239 scoped-exact
  + 13 faithful-random + 24 faithful-timing live adapters; reuse its recorded green baseline when code
  and environment match. Pick bounded batches.
- Continue accepted-move adapters and source-derived host providers. Preserve
  gameplay outcomes, RNG ownership, damage, turn order and facility state.
  Helping Hand's doubles blocker does not block accepted moves. No new Factory
  acceptance campaign, Rust port, or outside-Factory expansion.
- Whole-playable arbitrary-history framebuffer exactness remains unclaimed.
  Preserve explicit palette/switch/party-return limitations until proven fixed.

## Approved Random2 implementation — D3, 2026-10-06

The user approved a separate deterministic visual RNG for the next run.
Implement the source LCG, draw order/count and value transformations in a
presentation-owned module/host. Seed once per battle from a non-gameplay
source; never consume, reseed or derive this stream from gameplay RNG.
Document the presented-frame advancement policy rather than claiming to
reconstruct the oracle's variable wireless-link lag. Rendering must be pure:
repainting a frame cannot consume extra random values.

Persist the presentation seed and policy version as separate session-export
metadata. Reset and replay reproduce the same visuals; provide a documented
deterministic default for legacy exports. Keep this state outside the logical
battle/RNG state and preserve Scene ON/OFF gameplay parity.

Add "faithful random" accounting to the live inventory/report pipeline before
promoting these adapters. Existing exact claims retain their scoped limits;
surrogate frames do not add exact coverage or Factory acceptance. A pinned
source value may prove a controlled body exactly, with explicit provenance.

Use `docs/random2-trackability.md` and `docs/visual-randomness-prep.md` for the
source rules and known-activation vectors. Start with the module, replay/export
contract and accounting, then a bounded representative batch (Double Kick and
Astonish have reproduced vectors). Expand by shared source components while
continuing independent non-Random2 fixes. Other graphics-provider blockers
remain real; approval adds no adapter credit by itself. Follow the Random2
acceptance section in `ANIMATION_VERIFICATION.md`. D3 is answered; do not ask
the user to approve this choice again.

## Approved CPU-load timing and completion priority — D4, 2026-10-07

The user approved option (b) and directed us to unblock and finish S10A. Read
`docs/faithful-timing.md` and the D4 section of ANIMATION_VERIFICATION.md.
Implement separate faithful-timing accounting, then deterministic dominant
measured lag/VBlank phases using the banked source models. Adapters using both
D3 and D4 count once as faithful timing with a D3 flag. Keep exact fixture proofs
within their scopes and quantify alternate-phase differences. All other
source/pixel, ordinary-route, gameplay/RNG and production gates still apply.

Apply this approval to further evidenced cases of the same CPU-phase class;
do not defer the same choice again. Prioritize the remaining 18 accepted
adapters and required continuation/history providers. Batch siblings sharing a
proved mechanism, reuse valid unchanged receipts, and independently prove new
production integrations. Do not continue phase scouting solely to pursue
exactness that D4 has relaxed. Stop at a truthful completed S10A checkpoint when
its acceptance is satisfied, or leave specific remaining blockers at the cap;
no audio or outside-Factory work is authorized by this completion direction.

## Delegate one bounded step at a time

Use only `tools/run-subagent.sh`, one integration worker at a time. Write a brief
naming moves/providers, source dependencies, permitted files, central evidence
claim, required variants and finish gates. Launch from a clean verified base:

```sh
./tools/run-subagent.sh --lane integration --base HEAD --cap-minutes 60 \
  --brief-file /tmp/integration-step.txt
```

The supervisor defaults to Claude Opus 5.5 with Sonnet 5.5 workers. Inherit
that worker profile without Codex model or effort flags. With `-S codex`,
the supervisor uses `gpt-6.1-sol/high`; ordinary Codex workers retain
`gpt-5.6-terra/max`, `gpt-5.6-luna/max`, and `gpt-5.6-sol/high` according to
the routing rubric in `SUPERVISOR.md`. In that profile use Sol for unresolved
host-state ownership.
Workers use fresh worktrees and the Battle Scene ON oracle; OFF is the logical
parity control. Workers do not edit supervisor progress or Factory ledgers.

Follow the launcher's worker execution instructions: Claude supervisors retain
the background job PID and output path and poll until the launcher exits;
Codex supervisors retain the managed execution handle without shell backgrounding.
Supervise until completion.
Use bounded waits, inspect the handoff and exit status, and stop on account
usage/rate-limit exit 42 rather than retrying. A cap kill is not proof. Review
committed partial work before salvage; resume only from a verified base.

## Verify, fold, and show the result

1. Review the complete diff and proof on the worker's exact code/tree. Source
   acceptance needs complete dense windows, both orientations, twice fresh,
   and every source-required variant through the production live renderer.
   D3/D4 claims use their explicit exceptions in ANIMATION_VERIFICATION.md;
   exact scopes retain the zero-residual requirement.
   Captured fixture rows must never become production rendering inputs.
2. Independently reproduce the central source/framebuffer claim. Exercise
   ordinary commands and subsequent queue completion, relevant repeat/status/
   miss/multi-hit/two-turn/switch/KO cases, and ON/OFF state/RNG parity. Staged
   render tests alone do not prove ordinary playable behavior.
3. Follow `ANIMATION_VERIFICATION.md`: reuse same-code worker full gates for a
   clean fold, with affected checks and smoke. Conflicts or changed union code
   need fresh full-suite/build gates. Serialize heavy commands. Run one final
   independent full pair at wind-down if production changed.
4. Commit verified increments to master. Maintain readiness in
   `docs/animation-integration-live-status.json` and progress in
   `ANIMATION_INTEGRATION_PROGRESS.md`, distinguishing adapters, Factory
   acceptance, and stronger whole-playable claims. Do not edit Factory ledgers
   for integration-only work.
5. Refresh the build-stamped local preview at green production checkpoints with
   `bash tools/integration/start-local-preview.sh`. Verify ordinary-input replay,
   canvas/PNG evidence, session export, ON/OFF restart and browser errors using
   the existing integration evidence tools. Record served revision and receipt.
6. Preserve worker refs, event logs and needed ignored evidence before removing
   temporary worktrees. Logs live under primary `.codex-logs/`; retain recovered
   work and the private migration archive. Never remove a worktree containing
   the only copy of unfinished work or ignored evidence.

## Local operation and interruption

This Mac has 16 CPUs and 128 GiB RAM. Bound Vitest to four workers and serialize
full tests, typecheck and builds. Services are local ON 8012 / OFF 8014; vendor
ROM/ELF/map and direct mGBA Python are under local harness/vendor paths. Resolve
them through existing helpers. Do not mutate shared HTTP staging for source
probes; use independent direct mGBA runs. There is no hcloud resource to contact.

Keep truthful progress with tested commit IDs, fresh evidence, remaining gaps
and the next executable step. Update `PROGRESS.md` at checkpoints and wind-down,
with detailed evidence in the integration ledger. Use `DEFERRED.md` only for
material user decisions; technical unknowns belong in progress with a specific
resume condition. Continue in-scope until the launcher deadline, then leave
clean committed master with a handoff. Do not stop after dispatch or the first
preview. Reuse valid unchanged receipts rather than repeating idle full gates.
