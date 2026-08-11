# Switch-in entry hooks — OFF source audit and receipts

Scope: evidence only; no production or generated-data edits.

## Six barrier families, not six abilities

`tests/executableFrontierRatchet.test.ts:151-163` pins the six named
families in `battleScriptSwitchinOpcode.ts`:

| Barrier | Source / reachability test | Verdict |
| --- | --- | --- |
| `switchhandleorder` cases 0/1 | `battle_script_commands.c:5162`; Factory singles use case 2/3, exercised in `tests/battleScriptSwitchinOpcode.test.ts` | (b), multi-battler/order-only |
| `SwitchInClearSetData` wrapped cross-clear | `battle_main.c:3199`; handler gates it on `battlersCount !== 2` | (b), Factory is singles |
| Arena point init | `Cmd_switchinanim`, `battle_script_commands.c:4696`; Factory has no Arena flag | (b), topology-unreached |
| other `various` ids | `battle_script_commands.c:6326`; `RESET_PLAYER_FAINTED` (7) is registered/tested by the forced-switch tail (`factoryBattleScriptTerminalDecision.test.ts`) | (b), distinct call-site work |
| Truant reset hack | `Cmd_switchineffects:5258-5263`; test `switchineffects: Truant switch-in-hack is a named barrier` | reachable: L50 set 51 Slakoth |
| grouped ON_SWITCHIN dispatch | `AbilityBattleEffects`, `battle_util.c:2485-2599`; test `switchineffects: ... trigger ability` | reachable, substantive step |

## Exact source order

`Cmd_switchineffects` clears the fainted/replacement flags, then handles
Spikes. A hazard script returns to this opcode, so the order is:

`switchinanim/healthbox controller round trip → Spikes (if any) → Truant
reset → AbilityBattleEffects(ON_SWITCHIN) → on-switch item → clear guard /
cancel-partner / hpOnSwitchout tail`.

This is directly from `battle_script_commands.c:5219-5299`. A hook pushes its
own script and returns before the opcode tail and before the next hook.

- Drizzle, Sand Stream, Drought: set permanent weather and push their script
  only when that permanent weather is absent; same weather is no-op.
- Intimidate marks `STATUS3_INTIMIDATE_POKES`; its script loop skips
  Substitute and prints prevention for Clear Body, Hyper Cutter, White Smoke,
  otherwise does normal `statbuffchange` then the Attack-cut message
  (`battle_scripts_1.s:4024-4048`).
- Trace marks `STATUS3_TRACE`; its script selects/copies an opposing ability,
  then prints `STRINGID_PKMNTRACED`.
- Forecast calls `CastformDataTypeChange`; Cloud Nine/Air Lock scan each
  battler for that same form helper. They have no standalone announcement.

## Factory L50 census

Joined `battle-frontier-mons.json` entries 0..349 to `species-stats.json`.
Representative reachable set IDs: Trace 5 Ralts / 48 Kirlia / 168 Porygon-1;
Intimidate 53 Ekans / 72 Snubbull / 136 Growlithe / 152 Mawile;
Cloud Nine 103 Psyduck; Forecast 204 Castform-1 / 309 Castform-2; Truant 51
Slakoth. Drizzle, Sand Stream, Drought, and Air Lock have **zero L50
carriers**. Intimidate target classes are reachable: Clear Body 78 Beldum,
Hyper Cutter 58 Trapinch, White Smoke 252 Torkoal; Substitute is a target
state, not an entry ability.

## Reproducible OFF receipts

New fixtures are `tools/battle-lab/mechanic-switchin-*-off.json`; read them
with the read-only `tools/probe/audit-switchin-entryhooks-off.py` through the
required wrapper:

```sh
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
$PY tools/run-mgba-probe.py /tmp/switchin.json -- \
  $PY tools/probe/audit-switchin-entryhooks-off.py \
  tools/battle-lab/mechanic-switchin-trace-off.json /tmp/switchin.json
```

The probe wraps `BattleLab.prepare` before stock initial entry, records
`sRandCount`, RNG, weather, ability fields, Attack stages, controller command
bytes and displayed-string bytes, and makes no post-construction ROM writes.
Fresh verified seed `0x12345679` results:

| Fixture | Receipt |
| --- | --- |
| `trace` | tick 1178 `[36,69]`, then tick 1829 `[69,69]`: Trace copied Onix Sturdy; `sRandCount` stays 9327 across dispatch; controller becomes `[47,0,47,47]` at its message script. |
| `drizzle-own-weather` | at 1178 `[2,2]`; weather 0→5 at 1935. No second weather write/message: same-weather no-op. |
| `drizzle-intimidate` | at 1178 `[2,22]`; weather 0→5 at 1894 with `sRandCount` 9327 across Drizzle dispatch. This banks the legal multi-hook construction/order seam. |
| `intimidate` | at 1178 `[50,22]`, `lastUsedAbility=22`, stages `[6,6]`. This **falsifies** treating initial setup alone as an Intimidate stage/message receipt: its deferred loop needs a real later switch. |

The final row is intentionally an honest partial. A consumer must make one
real switch after action selection and pin stage 6→5, then repeat against an
already-substituted active and a Clear Body/Hyper Cutter/White Smoke active.
Do not fake that with construction-time party overrides.

## Existing state owners

- `battleScriptSwitchinOpcode.ts`: party rebuild, neutral-stage reset,
  Spikes, hit markers and switch-in control seam — add dispatch here.
- `battleScriptStatbuffchangeOpcode.ts`: normal stat-change path needed by
  Intimidate; do not direct-write stages.
- `battleScriptJumpifabilitypresentOpcode.ts`: Cloud Nine/Air Lock field
  checks only, not ON_SWITCHIN form dispatch.
- `battleScriptTryCastformDataChangeOpcode.ts`: Castform form owner.
- `battleScriptFaintedActionsOrchestration.ts`: consumer of entry-hook flags,
  not an implementation home.

Suggested main-lane split: first Truant + weather/Trace/Forecast scheduling;
then the Intimidate target loop using the existing stat/message seam and the
missing real-switch receipts. Healthbox and hazards already have owners.
