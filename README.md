# pokeemerald-factory-core

The canonical Battle Factory reproduction — the continuation of the
warm-bison run, promoted to a standalone repo with its full history.
A TypeScript reimplementation of Pokémon
Emerald's Battle Factory, byte- and pixel-verified against a headless
mGBA oracle running a source-built Emerald ROM.

## Layout — two layers, org-chart style

```
.                      ← TOP: humans and planning. Nothing here is edited
│                        by autonomous agents.
├── README.md            this file
├── NOTES.md             the human's planning notebook
├── oracle/              shared oracle service (ground truth; mGBA + ROM)
├── bin/oracle           human-facing oracle CLI (see BATTLE_LAB.md)
├── tools/probe/receipts harness-level probe receipts
├── run-oracle.sh        start the oracle (battle-scene-on :8012 / off :8014)
├── run-play.sh          interactive oracle player (:8022)
└── workspace/         ← the agent org. Supervisors and workers live here
                         and never need to read or write above this line.
                         See workspace/AGENTS.md.
```

- `workspace/` is the former `runs/20260717-004950_warm-bison` directory,
  moved wholesale. All coordination docs (AGENTS.md, SUPERVISOR.md,
  PROGRESS.md, ISSUES.md, ROADMAP.md, lane docs) are in there, unchanged.
- The Rust port was removed from master in cln241 and lives on the `core-rs-archive` branch
  (`workspace/docs/cln241-core-rs-removal.md`). The TypeScript engine in `workspace/src/` is the only implementation.
- `workspace/bin/oracle` is the agent-facing oracle CLI copy, pinned by
  `tests/oracleTooling.test.ts`; the top-level `bin/oracle` is the human
  copy. They have drifted before — the workspace copy is authoritative.
- Agent launchers are Claude only: `workspace/run-supervisor.sh` (one
  supervisor) and `workspace/tools/run-subagent.sh` (one worker launcher; lanes
  ts, side, integration). The Codex, DeepSeek, OpenCode, animation-supervisor
  and rust-supervisor paths were removed in cln239 (`workspace/docs/cln239-launchers.md`).

## Machine-local dependencies (not in this repo)

Huge, reproducible things live in `../vendor/` (pokebench level), exactly
as before: `vendor/pokeemerald` (reference source checkout),
`vendor/libmgba-py`, `vendor/mgba-venv`. `workspace/reference/pokeemerald`
is a symlink into it. The oracle resolves `../vendor` relative to this
repo's parent, so this repo must sit directly under `pokebench/`.

## History

This repo's git history IS the warm-bison run's history (1,100+ ledger
entries). The old harness at `../pokeemerald-factory` (initializer,
`_template`, other runs) is kept for reference but is no longer canonical;
its copy of warm-bison is frozen as of 2026-08-11.
