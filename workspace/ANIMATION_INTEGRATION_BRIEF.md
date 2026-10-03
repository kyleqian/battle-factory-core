# Playable animation integration lane

## Current mandate and location — 2026-10-02

The user consolidated all remote code, recovered work, required assets and chat
history onto this Mac, then authorized continued integration using the repository
supervisor with Sol 6.1. hcloud was deleted after backup and local validation.
Historical remote-only instructions and isolated cloud branches are superseded.

Canonical checkout: `/Users/kyle/Developer/pokebench/pokeemerald-factory-core`,
branch `master`; run commands in `workspace/`. Read `LOCAL_SETUP.md` and
`ANIMATION_INTEGRATION_PROGRESS.md`. Launch this lane with:

```sh
./run-supervisor.sh --lane integration --headless
```

The supervisor follows `ANIMATION_INTEGRATION_SUPERVISOR.md` on primary master;
bounded workers use `tools/run-subagent.sh --lane integration --base <green-ref>`
in temporary worktrees. Only one supervisor writes primary master. Keep logs,
evidence and unfinished refs locally before cleaning up worker worktrees.

This mandate authorizes the necessary engine/presentation seam, browser option,
live renderer adaptation, tests and preview. It supersedes old roadmap deferrals
of playable Scene ON and the Factory worker's animation-only file restriction.
Preserve gameplay outcomes, RNG, damage, turn order and facility progression.
Document deliberate module-boundary changes; never silently widen ratchets.

## Established baseline and remaining work

Production `b4befb4f7` has 65 live adapters, ordinary Scene ON/OFF selection,
typed move requests/completion, queue resume, real-route regression tests and
a verified local preview at <http://127.0.0.1:5191/>. Its local receipt records
1,477 files / 11,708 tests passed, typecheck and build (844 modules), 1,832 Rust
tests, fresh source checks and browser replay. Later migration/tooling/docs
commits do not invalidate unchanged production receipts.

Factory bodies are separately 276/277 accepted; 211 accepted moves still need
live integration. Helping Hand is blocked on legal doubles staging. A live
adapter is not whole-playable arbitrary-history framebuffer exactness. Current
palette providers remain bounded, and switch/party-return ownership and Shadow
Punch history residuals are explicit gaps. Read the latest progress before
repeating earlier investigations.

`PLAYABLE_ANIMATION_INTEGRATION_AUDIT.md` documents the original pre-integration
seam problems; many have since been implemented. Treat it as historical design
context, not a fresh list of missing features. Production must supply current
species, geometry, graphics and per-frame host state; never import capture rows
or fixture builders into gameplay or substitute generic effects as exact moves.

First review `codex/recovered-physical2-20261002`, the interrupted fourteen-move
snapshot. Adapt only useful changes to current master and verify independently;
its older base and unverified contents prohibit blind merging or count credit.

## Deliverables

1. Extend live adapters and reusable source-derived providers in bounded batches.
   Inventory each accepted move's identities, host state, production provider,
   completion and blocker. Preserve independent per-move dense acceptance and
   report gaps honestly. Stay within Factory scope; no 77 non-Factory expansion.
2. Preserve ordinary real-input presentation through text, HP, hits, faint,
   switching and menus. Verify both attacking orientations with current Pokémon
   and reach subsequent valid command prompts. Injected presentation stages
   cannot replace this demonstration.
3. Extend meaningful real-route regressions for repeat/status/no-hit/miss/
   no-effect/multi-hit/two-turn/switch/KO cases as the new batch requires.
   Logical outcomes and RNG ownership must remain equal across scene modes.
4. Complete party-return/switch palette ownership and broader rendering history
   when source proof supports it. Name every residual and bounded claim.
5. Refresh and verify a build-stamped local playable preview at green checkpoints,
   with reproducible ordinary input, canvas/PNG checks, replayable error/session
   export, mode restart and no browser errors. Record the served commit and
   evidence receipt, then continue the remaining integration work.

## Validation and resources

Read `AGENTS.md` and `ANIMATION_VERIFICATION.md`; the latter overrides blanket
full gates for unchanged code and tooling/evidence checkpoints. New production
requires affected semantic/framebuffer controls, smoke, full test/build gates
and typecheck where relevant. Supervisor clean folds may reuse same-code worker
receipts after independent central proof; conflicts or new union code require
fresh full gates. Run one independent final full pair when production changed.

The local Mac has 16 CPUs / 128 GiB RAM. Bound Vitest to four workers and
serialize heavy tests/build/typecheck. Reference assets and direct mGBA Python
are local; use the existing harness-root resolver and oracle helpers. ON listens
on localhost 8012; OFF on 8014 is the logical control. Workers validate services
and never restart or mutate them. Source probes should use independent direct
mGBA processes instead of changing shared HTTP staging. Never print credentials.

Report tested commit IDs, working playable behavior, remaining gaps and the
next executable step in `ANIMATION_INTEGRATION_PROGRESS.md`. Keep integration
readiness separate from Factory acceptance. Technical blockers need evidence
and a resume condition, not repeated status-only reports.
