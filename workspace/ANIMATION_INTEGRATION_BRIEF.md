# Playable animation integration lane

## Current user mandate — 2026-10-02

Consolidate all remote code, branches, worktree changes, chat/agent logs and required assets onto the user’s Mac. Merge verified animation work into local master, preserve unfinished and experimental work in recoverable branches/archives, and verify local operation before deleting the hcloud server and associated paid resources. Continue subsequent implementation locally. This supersedes the hcloud-only execution and remote-service isolation requirements below for this controlled migration. No new remote workers or scheduled runs.

## User mandate — 2026-09-22

The user requested a separate Codex task and separate worktree doing all the
integration needed to see accepted animations in ordinary playable battles,
while the existing Factory animation campaign continues independently. Actual
implementation and heavy execution belong on hcloud. Start implementation now;
this is not another investigation-only assignment. The experimental shared
runtime is lower priority and is not a prerequisite.

This current user mandate authorizes the necessary engine/presentation seam,
browser option, live renderer adaptation, tests, and integration preview work.
It supersedes older roadmap deferrals of playable Scene ON for this lane. This
is an integration owner, not the Factory animation worker: the animation-only
engine-file restriction does not prohibit its required presentation changes.
Keep gameplay outcomes, RNG, damage, turn order, and facility progression intact.
Document deliberate module-boundary changes; do not silently widen ratchets.

## Location and isolation

- hcloud: root@95.216.222.140, then run repository commands as pokebench.
- SSH key on the coordinating Mac: /Users/kyle/.ssh/pokebench-autonomy-ed25519.
- Repository: /srv/pokebench/pokeemerald-factory-core.
- Integration worktree: /srv/pokebench/pokeemerald-factory-core/workspace/.worktrees/animation-integration.
- Work inside that worktree's workspace/ directory.
- Branch: codex/animation-integration.
- Pinned baseline: 689d475cd, the supervisor-verified Extrasensory closure.
  Its recorded full suite passed 1,416 files / 11,468 tests, and build passed.
  Reuse this receipt only under ANIMATION_VERIFICATION.md's unchanged-code rules.
- The app's additional local worktree is for task coordination; do not mistake
  its older master snapshot for the implementation baseline.
- Keep ANIMATION_INTEGRATION_PROGRESS.md as this lane's durable checkpoint and
  maintain an explicit integration-readiness inventory separately from exact
  per-move animation acceptance.

Leave pokebench-supervisor@animation.service and pokebench-animation.timer,
animation-main, its active worker worktrees, Rust, and the shared-runtime lane
alone. Do not run run-supervisor.sh --lane animation: it selects animation-main.
Bring newer verified animation commits one-way into integration, with union
validation. Do not push integration changes back into the active Factory lane.
Use isolated workers if helpful and authorized by the repository workflow;
tools/run-subagent.sh can be run from this parent with an explicit base and a
brief carrying this broader integration scope. It supports ts/side/animation/
rust, not an invented integration option. Read its appended profile constraints
before choosing it. Continue supervising and folding results, not just dispatch.

## Existing audit

Read PLAYABLE_ANIMATION_INTEGRATION_AUDIT.md before repeating exploration.
The default generated battle forces battleScene: off. The isolated Scene-ON
probe has no ordinary start/completion/return handshake, and live resolution
has rendering precedence. MOVE_ANIMATION events already contain useful move
parameters, but presentation commands discard them and can skip no-hit moves.
Accepted coverage is not playable coverage. Some older renderers restrict
species/HUD to fixture pairs (Tail Whip, Dragon Rage); complex newer ones such
as Psywave require per-frame host state supplied by oracle rows in verifiers.
Production must supply that state; never import capture rows/fixture builders
into the game or claim staged render tests prove live integration.

## Deliverables and order

1. Establish a typed live request/completion contract: preserve move parameters
   from real battle events, construct current battler/species/geometry/graphics
   inputs, start/advance/finish the animation, clean up, and resume the actual
   presentation queue with correct text, HP, hit, faint, switch and menu order.
   Keep Scene OFF available as a regression control.
2. First playable milestone: use ordinary draft/command input or deterministic
   real-route replay to select one damaging and one status/no-hit move, render
   current Pokémon in both attacking orientations, and reach the next valid
   command prompt through subsequent turns. No injected sceneOnPresentation
   stage may stand in for this demonstration. Choose low-dependency moves after
   checking the live renderer contract; adapt fixture-bound identity if needed.
3. Add meaningful real-route integration/replay tests covering repeated moves,
   status/no-hit, miss/no-effect, multi-hit, two-turn, switching and KO/cleanup.
   Check equal logical outcomes and RNG ownership across presentation modes.
4. Inventory every accepted Factory move by production readiness: fixture-bound
   identities, required host state, available production provider, completion
   signals, and remaining blocker. Implement needed adapters/generalization in
   reusable batches, with live and existing per-move acceptance. Report missing
   moves honestly; never silently substitute a generic effect and call it exact.
   Fold remaining Factory moves, including Open-only Outrage, as their own lane
   supplies verified commits. Waiting for unfinished moves does not block work
   on already-accepted ones. Do not expand into the 77 non-Factory moves.
5. Produce a build-stamped playable integration preview and a reproducible input
   trace demonstrating the live path, with the existing replayable error/session
   export. Verify the preview's branch/revision; no current user URL was supplied.
   Prepare the verified union for eventual main/release integration. Do not
   overwrite another preview or change the active animation service to do so.

The first milestone is a checkpoint, not the finish line: keep implementing
the remaining integration within this task, committing verified increments.
If genuinely blocked, record the exact missing dependency and next executable
step rather than repeatedly restating an unchanged status.

## Validation and resource discipline

Read workspace AGENTS.md, the relevant engine/roadmap context, and
ANIMATION_VERIFICATION.md. Follow its scoped checkpoint gates, preserving dense
move pixel acceptance. Production integration handoffs require affected tests,
smoke, full npm test and npm run build on the actual final code. Use npm run
typecheck rather than bare tsc. Do not repeat the 30-minute full suite on
unchanged code merely as a heartbeat.

hcloud has 8 vCPUs / 16 GiB RAM. Give the ongoing Factory run priority and
serialize heavyweight suites/build/typecheck within this lane; avoid overlapping
memory-heavy checks with that lane. Use bounded resources for any remote worker
(the previous parallel runtime used 2 CPUs, 7 GiB RAM and one Vitest worker).
Reference lives at /srv/pokebench/vendor/pokeemerald and direct mGBA Python at
/srv/pokebench/vendor/mgba-venv/bin/python. Link reference locally as needed;
give this worktree independent writable dependency/build artifacts. Remote rg
is absent; use grep/find. Never print credential files or the environment file.
Do not restart or mutate the shared HTTP oracle's staging under the other lane;
use independent direct mGBA processes or coordinate an isolated oracle instance.

Report progress in terms of working playable behavior and remaining integration
gaps, with tested commit IDs and evidence. Do not equate an exact-animation
inventory total with the number of moves that work during ordinary play.
