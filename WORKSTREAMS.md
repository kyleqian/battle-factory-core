# Workstreams after the first complete battle

This file is the ownership map for the finite Stage 8 reset in `ROADMAP.md`.
The supervisor remains the single integration owner. The three worker lanes
are capacity, not three competing plans: use a lane only when its brief is
independent and useful.

## Main lane — round and battle core

Oracle profile: **Battle Scene OFF**.

Own:

- deterministic `BattleScenario`/fixture injection for tests and dev probes;
- a generic battle/round controller for battle indexes 0–6;
- healing, opponent generation/no-repeat rules, swap results, advancement,
  loss, seventh-win completion, and core battle commands/events;
- the public seam between battle logic and presentation.

Do not extend the old canonical Battle 2 script after tick 33331. In
particular, 33332/SAND ATTACK is evidence already gathered, not the next
implementation milestone. A mechanism is complete when state tests and one
representative oracle slice prove it works generically; Battles 3–7 are
scenario tests, not six more frame-by-frame projects.

## Side lane — staged scenarios and data

Oracle profile: **Battle Scene OFF**.

Good independent briefs include source-derived rental/trainer/move data,
controlled-seed generation, deterministic state fixtures, swap-screen assets,
or file-disjoint test breadth. Staging a later battle directly is encouraged:
derive or construct its initial state, run the shared controller, and compare a
short targeted window. Replaying every prior canonical input is unnecessary.

The side lane must not redesign shared controller interfaces in parallel with
the main lane. If it needs a new shared shape, the supervisor lands that small
interface on main first, then rebases or briefs the side worker against it.

## Animation lane — optional, modular presentation

Oracle profile: **Battle Scene ON**.

Own move-animation timelines, particles, sprites, presentation assets, and
animation-specific compare traces. Keep this lane behind the battle
presentation interface: it consumes core battle commands/events and reports
completion, but does not decide damage, RNG, turn order, round advancement, or
facility state.

Animation work may run beside main/side work and may be merged incrementally.
It does not block a functionally complete seven-battle round using the OFF
presentation. Do not launch it merely to fill a slot; launch it when there is a
bounded move/presentation module with disjoint files.

## Shared architecture contract

The intended dependency direction is:

```text
BattleCore / RoundController
        │ emits commands + committed state events
        ▼
BattlePresentation
   ├── sceneOff: text, HP/status, menus, minimal transitions
   └── sceneOn:  sceneOff semantics + move animation timelines
        │ reports presentation completion
        ▼
BattleCore may advance to the next command
```

Both modes must produce identical logical outcomes for the same scenario and
input. Mode selection changes presentation timing, never RNG consumption or
game rules. Keep central event/interface files owned by the main lane; prefer
new animation modules and assets in the animation lane.

## Oracle and scenario rules

- Main/side use `http://127.0.0.1:8014` (`battle-scene-off`).
- Animation uses `http://127.0.0.1:8012` (`battle-scene-on`).
- New compare traces must set `oracleProfile` explicitly. Historical traces
  without it retain Battle Scene ON semantics.
- Controlled seeds, source-derived snapshots, RAM probes, and direct scenario
  fixtures are valid dev-time tools. Nothing from the ROM/oracle may be loaded
  by the production app.
- Use full canonical traversal for unique facility transitions and endings.
  Use short staged probes for repeated battle mechanics.

The supervisor verifies and merges worktree branches one at a time, reruns the
full suite after each merge, and owns `PROGRESS.md`, `ISSUES.md`, and roadmap
updates for side/animation work.
