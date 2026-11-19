# Claude Code project instructions

This is the TOP (human/planning) layer of battle-factory-core (the folder on the Mac keeps its old name, pokeemerald-factory-core).
README.md is the public front page; the layout notes for sessions are here.

- Sessions working ON THE GAME belong in `workspace/` — read and follow
  `workspace/AGENTS.md` from there.
- Sessions at this level are for planning, auditing, and oracle
  infrastructure only. Do not edit files under `workspace/` here unless
  the user asks for it.

## Layout: two layers

```
.                      TOP: humans and planning; autonomous agents don't edit here
├── oracle/            shared oracle service (ground truth: mGBA + ROM)
├── bin/oracle         human-facing oracle CLI (see oracle/BATTLE_LAB.md)
├── tools/probe/receipts  harness-level probe receipts
├── run-oracle.sh      start the oracle (battle-scene-on :8012 / off :8014)
├── run-play.sh        interactive oracle player (:8022)
└── workspace/         the agent org: supervisors and workers live here and never
                       need to read or write above it (workspace/AGENTS.md)
```

- `workspace/bin/oracle` is the agent-facing copy of the oracle CLI, pinned by
  `tests/oracleTooling.test.ts`; the top-level `bin/oracle` is the human copy. They
  have drifted before; the workspace copy is authoritative.
- Launchers are Claude only: `workspace/run-supervisor.sh` and
  `workspace/tools/run-subagent.sh` (`workspace/docs/cln239-launchers.md`). The Rust
  port lives on the `core-rs-archive` branch (`workspace/docs/cln241-core-rs-removal.md`).
- Machine-local dependencies live in `../vendor/` (pokebench level):
  `vendor/pokeemerald` (the decompilation, pinned at 83df84e40), `vendor/libmgba-py`,
  `vendor/mgba-venv`. `reference/pokeemerald` and `workspace/reference/pokeemerald`
  are symlinks into it. The oracle resolves `../vendor` relative to this repo's
  parent, so this repo must sit directly under `pokebench/`.
