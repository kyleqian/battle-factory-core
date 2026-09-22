# Native animation runtime lane

## 2026-09-22 — authorized implementation started on hcloud

User requested reusable animation machinery now, tested on unfinished non-Factory moves, and clarified execution belongs on hcloud. Existing Factory campaign remains independent.

- Branch: codex/animation-runtime-hcloud.
- Starting evidence: d7c8493bb, following initial spike32a72418e.
- Workspace: /srv/pokebench/pokeemerald-factory-core/workspace/.worktrees/animation-runtime/workspace.
- First bounded implementation: full Splash/Mud Sport scripts, reusable task/sprite/resource machinery, new mud particle family, dense bilateral source/transfer evidence and rendering integration toward full pixel acceptance.
- Dispatch: existing tools/run-subagent.sh, one animation-profile Sol/high worker (novel scheduling/OAM integration per repository routing),180-minute cap. Dedicated service pokebench-animation-runtime; no recurring timer and no changes to other services.
- Scope and source notes: NATIVE_ANIMATION_BRIEF.md.
- Status: provisioned; starting the bounded worker immediately after this checkpoint. Worker code will be on the launcher-created child branch until independently reviewed and merged into this isolated parent.
- No production code or move coverage changed by setup.
