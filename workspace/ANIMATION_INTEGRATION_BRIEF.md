# Playable animation integration lane

## Current mandate and location — 2026-10-02

The user consolidated all remote code, recovered work, required assets and chat
history onto this Mac, then authorized continued integration using the repository
supervisor with Sol 6.1. On 2026-10-03 the user directed integration to be the
next main roadmap stage, with no separate supervisor lane. hcloud was deleted
after backup and local validation.
On 2026-10-04 the user changed the defaults to Claude Opus 5.5 supervision
and Claude Sonnet 5.5 workers.
On 2026-10-06 the user approved D3 option (a) for the next run: implement a
separate deterministic presentation RNG, persist replay seeds in session
exports, and count Random2 adapters separately as "faithful random". The
implementation and acceptance contract lives in ROADMAP S10A,
ANIMATION_INTEGRATION_SUPERVISOR.md and ANIMATION_VERIFICATION.md; gameplay
outcomes and RNG remain unchanged. This decision needs no further approval.
On 2026-10-07 the user approved D4 option (b) and authorized unblocking and
finishing S10A: implement deterministic dominant measured CPU-load timing as
separately counted "faithful timing". Follow `docs/faithful-timing.md` and
ANIMATION_VERIFICATION.md; further evidenced cases of the same lag-frame /
VBlank-phase class need no renewed approval. Batch shared mechanisms and reuse
valid receipts while prioritizing the remaining adapters and ordinary play.
On 2026-10-11 the user explicitly included Struggle 165 in S10A. Implement it
first in the next run, alongside #166, under `docs/struggle-integration-scope.md`.
This overrides the outside-Factory restriction for this forced move. Include
Struggle in headline ordinary-play coverage and keep its required/pending state
separate from the historical 276 accepted catalogue bodies until proved.
On 2026-10-13 the user included all remaining animation variants, presentation
corrections and battle-engine accuracy defects in the current finish-up mission.
See `docs/factory-finish-scope.md`. The main/ts lane is authorized to fix #165,
#141, #140 and #139 with source-proven gameplay/RNG changes; integration workers
still own presentation only. This supersedes the S10A-wide mechanics exclusion.
Historical remote-only instructions and isolated cloud branches are superseded.

Canonical checkout: `/Users/kyle/Developer/pokebench/pokeemerald-factory-core`,
branch `master`; run commands in `workspace/`. Read `LOCAL_SETUP.md` and
`ANIMATION_INTEGRATION_PROGRESS.md`. Launch this lane with:

```sh
./run-supervisor.sh
```

The main supervisor follows `ROADMAP.md` and its S10A detail in
`ANIMATION_INTEGRATION_SUPERVISOR.md` on primary master;
bounded workers use `tools/run-subagent.sh --lane integration --base <green-ref>`
in temporary worktrees. Only one supervisor writes primary master. Keep logs,
evidence and unfinished refs locally before cleaning up worker worktrees.

This mandate authorizes the necessary engine/presentation seam, browser option,
live renderer adaptation, tests and preview. It supersedes old roadmap deferrals
of playable Scene ON and the Factory worker's animation-only file restriction.
Presentation-only steps preserve gameplay outcomes, RNG, damage, turn order
and facility progression. Source-proven main-lane engine corrections are
authorized by the 2026-10-13 scope update, with `docs/factory-finish-scope.md`'s
verification and intentional-change accounting.
Document deliberate module-boundary changes; never silently widen ratchets.

## Established baseline and remaining work

The latest production receipt and preview revision are in
`ANIMATION_INTEGRATION_PROGRESS.md`, which also holds the current live adapter
count (250 scoped-exact + 13 faithful-random + 13 faithful-timing of 276 accepted Factory bodies at the
2026-10-07 evening wind-down; 0 remain; D4 implemented).
The established path includes ordinary Scene ON/OFF selection, typed requests
and completion, queue resume, real-route regressions and browser verification.
Reuse recorded same-code full-suite/build receipts under the verification policy.

Helping Hand remains blocked on legal doubles staging. A live adapter is not
whole-playable arbitrary-history framebuffer exactness. Unknown status, entry,
switch, summary, substitute and transform ownership remain explicit gaps;
known-entry party/B-cancel return is bounded. Read latest progress before
repeating earlier investigations or counting any unmerged candidate.

`docs/archive/PLAYABLE_ANIMATION_INTEGRATION_AUDIT.md` documents the original pre-integration
seam problems; many have since been implemented. Treat it as historical design
context, not a fresh list of missing features. Production must supply current
species, geometry, graphics and per-frame host state; never import capture rows
or fixture builders into gameplay or substitute generic effects as exact moves.

Light Screen is folded as a known-entry first-body allocator consumer
(2026-10-04). Resume the latest ledger's next step: bounded adapter batches,
then reusable host providers (derived battler anchors, wall-family allocator
plans, net-zero allocator history, sprite order).

## Deliverables

1. Extend live adapters and reusable source-derived providers in bounded batches.
   Inventory each accepted move's identities, host state, production provider,
   completion and blocker. Preserve independent per-move dense acceptance and
   report gaps honestly. Include the user-approved forced Struggle body; no
   general 77 non-Factory expansion is authorized.
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
