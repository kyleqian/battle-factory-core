# Local playable animation supervisor

The user's 2026-10-02 instruction authorizes this local supervisor to continue
integration through `./run-supervisor.sh --lane integration`. Read `AGENTS.md`,
`LOCAL_SETUP.md`, `ANIMATION_INTEGRATION_BRIEF.md`, the latest integration
progress, and `ANIMATION_VERIFICATION.md`. The latter controls scoped gates.
The mechanics mission in `SUPERVISOR.md` is not this lane's work queue.

## Ownership and starting point

- Supervise primary local `master`. Only one supervisor may write this checkout;
  do not start a concurrent main or integration supervisor.
- Production receipt `b4befb4f7` covers 65 live adapters, 276 accepted Factory
  bodies and 211 accepted moves still needing integration. Reuse its recorded
  local full-suite/build receipt when production and environment are unchanged,
  with scoped checks for subsequent tooling changes.
- First review `codex/recovered-physical2-20261002`: an interrupted, unverified
  fourteen-move snapshot from an older base. Adapt useful changes to current
  master; never merge blindly or count unverified adapters. Pick a bounded
  subset when proof for all fourteen will not fit a worker step.
- Continue accepted-move adapters and source-derived host providers. Preserve
  gameplay outcomes, RNG ownership, damage, turn order and facility state.
  Helping Hand's doubles blocker does not block accepted moves. No new Factory
  acceptance campaign, Rust port, or outside-Factory expansion.
- Whole-playable arbitrary-history framebuffer exactness remains unclaimed.
  Preserve explicit palette/switch/party-return limitations until proven fixed.

## Delegate one bounded step at a time

Use only `tools/run-subagent.sh`, one integration worker at a time. Write a brief
naming moves/providers, source dependencies, permitted files, central evidence
claim, required variants and finish gates. Launch from a clean verified base:

```sh
./tools/run-subagent.sh --lane integration --base HEAD --cap-minutes 60 \
  --model gpt-5.6-sol --effort high --brief-file /tmp/integration-step.txt
```

The supervisor defaults to `gpt-6.1-sol/high`. Ordinary Codex workers retain
`gpt-5.6-terra/max` for source reconnaissance, `gpt-5.6-luna/max` for bounded
established work, and `gpt-5.6-sol/high` for novel diagnosis or implementation.
Choose the smallest suitable role; use Sol for unresolved host-state ownership.
Workers use fresh worktrees and the Battle Scene ON oracle; OFF is the logical
parity control. Workers do not edit supervisor progress or Factory ledgers.

Run the launcher directly through a managed tool session, without shell `&`,
`nohup`, or a detached wrapper. Keep the handle and supervise until completion.
Use bounded waits, inspect the handoff and exit status, and stop on account
usage/rate-limit exit 42 rather than retrying. A cap kill is not proof. Review
committed partial work before salvage; resume only from a verified base.

## Verify, fold, and show the result

1. Review the complete diff and proof on the worker's exact code/tree. Source
   acceptance needs complete dense windows, both orientations, twice fresh,
   and every source-required variant through the production live renderer.
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
and the next executable step. Use `ANIMATION_INTEGRATION_DEFERRED.md` only for
material user decisions; technical unknowns belong in progress with a specific
resume condition. Continue in-scope until the launcher deadline, then leave
clean committed master with a handoff. Do not stop after dispatch or the first
preview. Reuse valid unchanged receipts rather than repeating idle full gates.
