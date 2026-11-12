# `full` + `vanilla` 0:240 re-sweeps on the post-#104 soak semantics (2026-08-22, supervisor)

Tree: clean `cd59eeec` worktree (the session's baseline; engine = the 1370/1371 tree), render off,
default budgets (600,000 frames per seed), 4 parallel 120-seed chunks, ~30 min wall-clock.
This closes PROGRESS 1370's outstanding item (4): only `winning` had been re-swept on the new
OK/HANG semantics.

| policy | seeds | OK | CRASH | HANG | carry ≥ 7 | ≥ 14 |
|---|---|---|---|---|---|---|
| vanilla | 0:240 | **240** | 0 | 0 | 240/240 | 0 |
| full | 0:240 | **236** | 4 | 0 | 17/240 | 0 |

`full` crashes (all re-run on master `a84d74c9` after this session's fixes):

| seed | frame | signature | status on `a84d74c9` |
|---|---|---|---|
| 110 | 225,998 | `Cmd_switchhandleorder` no decided `monToSwitchIntoId` (ISSUES #102 crash half) | **OK** (fixed `3a5fed10`) |
| 230 | 473,326 | `STRINGID_PKMNRAGEBUILDING` `{B_DEF_NAME_WITH_PREFIX}` (ISSUES #108) | **OK** (fixed `a84d74c9`) |
| 108 | 338,124 | `FactoryRoundOrchestratorError: resolution handoff battler 0 display does not match the genuine next boundary` | **CRASH** → ISSUES #112 |
| 192 | 362,924 | `Cmd_openpartyscreen: unresolved battler selector BS_FAINTED at program counter 2046` | **CRASH** → ISSUES #113 |

Reading: the standing gates (`vanilla` 0:20 = 20/20, `full` 0:60 = 60/60) hold at 4× / 12× range;
the two surviving signatures are `full`-only (they sit behind the exploratory POKEMON/forced-switch
traffic `vanilla` and `winning` rarely produce) and are both ≤ 9 s repros, so they go straight to a
worker. `vanilla` still never wins a round past the anchor first round (carry ≥ 14 = 0/240), which
matches M-B step 1's verdict (a): the default policies are honest bad play, not a win-path defect.
