# subp1m: what the ROM does with `\p` in a Factory battle message

Read/measure only (no change under `src/` or `tests/`; `npm test` deliberately not run per the step).
Follows `docs/hpd1-hp-hold.md` item S2 (hpf4m Substitute hit: ROM A at f1122 cleared the message at f1125 after 719 rows; our app moves on after a 24-row message).

## 1. Rule

**In a Factory (frontier) battle a `\p` holds the battle until a NEW A or B press. There is no auto-advance and no N frames.**
No press = stall forever (measured >= 2600 rows). The same A/B gate applies to `\l` (mid-string scroll) and `{PAUSE_UNTIL_PRESS}`.

Source (`reference/pokeemerald`):

- `\p` = `CHAR_PROMPT_CLEAR` (0xFB) -> `RENDER_STATE_CLEAR` -> `TextPrinterWaitWithDownArrow` (`text.c:865-882`).
  - `gTextFlags.autoScroll == 0`: waits for `JOY_NEW(A_BUTTON | B_BUTTON)` and draws the blinking down arrow.
  - `autoScroll != 0`: would auto-advance after 49 ticks (`TextPrinterWaitAutoMode`).
- `BattlePutTextOnWindow` (`battle_message.c:3002-3005`) sets `autoScroll = TRUE` only for `BATTLE_TYPE_LINK | BATTLE_TYPE_RECORDED`.
  Factory/frontier (`BATTLE_TYPE_FACTORY | TRAINER | IS_MASTER` = 0x8000c in the lab) is FALSE, so no auto-advance exists and there is no N.
- `\l` = `CHAR_PROMPT_SCROLL` -> `RENDER_STATE_SCROLL_START`, same A/B gate (arrow, then a scroll). `{PAUSE_UNTIL_PRESS}` -> `RENDER_STATE_WAIT` -> `TextPrinterWait` (A/B, no arrow).
- The print handlers install `CompleteOnInactiveTextPrinter(2)` (`!IsTextPrinterActive(B_WIN_MSG)`), so `gBattleControllerExecFlags` stays 1 until the press.
  Any script command that checks exec flags stalls with it. `Cmd_waitmessage B_WAIT_TIME_LONG` (64 rows) only starts counting after release.
- A or B releases. START does nothing.
- A press while the text is still typing is wasted: it speeds up printing, but `JOY_NEW` is not remembered at the prompt. The first accepted press is bounded by typing completion.

## 2. ROM measurements (OFF :8014 unless noted)

Tool: `tools/integration/subp1mProbe.py <scenario> <on|off> <out.json> <totalFrames> <pressFrame|never> [button]`
(variant of `hpd2Probe.py`; records per frame script ptr, exec flags, comm, act, ctl, anim, gTextFlags, hp). Run with
`PYTHONPATH=/srv/pokebench/vendor/libmgba-py /srv/pokebench/vendor/mgba-venv/bin/python`.
Labs: `tools/battle-lab/hpf4m-subhit-off.json` (existing) and the new `tools/battle-lab/subp1m-{subfade,roar}-{off,on}.json`.

Substitute hit (`STRINGID_SUBSTITUTEDAMAGED`, `hpf4m-subhit`), message printed at f382:

| press | result |
|---|---|
| none (`never`) | exec=1 stalled to the end of the capture (>= 2600 rows) |
| A at 500 / A at 2500 | released at press+3 (503 / 2503) |
| B at 600 | released at 603 (same as A) |
| START at 600 | no release, stalled |
| A at 418, 419 | rejected (still typing) |
| A at 420 | accepted: earliest accept = print + 38 |
| ON (:8012), A at 700 | released at 703 |
| ON, never | stalled |

Note: the print is made by `Cmd_healthbarupdate` (`battle_script_commands.c:1818`), with the script pointer parked at `datahpupdate`.
`docs/hpd1-hp-hold.md` says datahpupdate prints it; that is wrong (see section 5).

Other strings:

| string | lab | observation |
|---|---|---|
| `PKMNSUBSTITUTEFADED` | subp1m-subfade | a fade animation (~111 rows) first, then print at f816; stalled to f1500 with no press |
| `PKMNWASDRAGGEDOUT` (Roar) | subp1m-roar | A at 700 and B at 700 both release at 703 |
| faint `\p` (faintpoison) | existing faint labs | stalls until the press (message identity inferred from the script ptr) |
| Static `\l` (paralysis via ability, seed 4) | `static4*` | stall at `MoveEffectParalysis+0x7` from f332; A at 600 -> exec falls at 633; then 64 rows of `waitmessage`; next command at 697 |

Static `\l`: release at 633 rather than 603 was not re-checked (the `\l` scroll after the press adds its own scroll time before the second line is typed). Open item for Tier-2 calibration.

Raw per-frame outputs are in `/tmp/subp1m/` (scratch, not committed); they are reproducible with the probe and labs above.

## 3. Factory-reachable strings with `\p` / `\l` / PAUSE_UNTIL_PRESS, and how the engine presents them

Engine model: `advance: "automatic" | "button"` in `src/engine/battleResolutionPresentation.ts` (~4899). Button messages use
`isBattleResolutionButtonMessageReady` (`phaseElapsed >= printable length + 1`) and retire only on input. Automatic messages use the 24-row floor.
The orchestrator dismisses with A only (`factoryRoundBattleOrchestrator.ts` ~2792-2830); the ROM accepts A or B.

Already button-gated (ROM waits, engine waits): faint messages (target and attacker), terminal-seam strings, trainer intro, the selection-time rejection family (`docs/torment-selection-rejection-ground-truth.md`), and the trapped-switch ability text (ISSUES #217).

GAPS (ROM waits, engine `automatic` with the 24-row floor):

| string | source | notes |
|---|---|---|
| `SUBSTITUTEDAMAGED` | `Cmd_healthbarupdate` | the hpf4m S2 case |
| `PKMNSUBSTITUTEFADED` | `BattleScript_SubstituteFade` | fade animation precedes the print |
| `PKMNWASDRAGGEDOUT` | `BattleScript_...Roar`/Whirlwind/Dragon Tail/Circle Throw | measured |
| `MoveUsedIs*` family (Disabled / Tormented / Taunted / Imprisoned) | `BattleScript_MoveUsedIs*` | button, then 64 rows of `waitmessage` after release |
| Trick `\p` | `BattleScript_EffectTrick` | mid-string `\p`: two button gates in one message |
| `\l` ability strings (Static, Cute Charm, Poison Point, etc. `...ByAbility`) | `battle_message.c` templates | mid-string `\l` gate, then `waitmessage` |
| A-only dismissal | orchestrator | ROM also accepts B |

Not reachable in the Factory (frontier skips them): EXP / level-up / learn move (`Cmd_getexp`), money and Pay Day (0 sets carry Pay Day), whiteout text, run/escape/FLED, catch/Safari, two-trainer text, `ENEMYABOUTTOSWITCH` prompt.

The full list of templates with `\p`/`\l` can be regenerated with
`grep -n '\\\\p\|\\\\l' src/data/gen/battle-message-templates.json` and cross-checked against `battle-frontier-mons.json` move/ability sets.

## 4. Proposed landing (separate steps, not done here)

1. In `battleResolutionPresentation.ts` set `advance: "button"` for SUBSTITUTEDAMAGED, SUBSTITUTEFADED, DRAGGEDOUT, the MoveUsedIs* family, Trick, and the `\l` ability strings (a table keyed by string id, next to the existing button ids at ~2170).
2. Accept A or B in `factoryRoundBattleOrchestrator.ts` (~2792-2830); START must stay a no-op.
3. Hazard: the turn-end rule (~5609) pushes a `turn-end` command only when the segment has no button message. Flipping SUBSTITUTEDAMAGED to button must not suppress turn-end for the rest of the segment; scope the rule to the button message's own segment position.
4. Readiness: `L+1` rows from message start versus the ROM's earliest accept at print + 38 (typing-bound) and release at press + 3. Calibrate against the sweep (A at 418/419/420 and +3 release), and account for the text-speed option, which changes typing time.
5. After release, `MoveUsedIs*` and the `\l` ability strings hold 64 rows (`waitmessage`) before the next command; Substitute-damaged does not (message is followed by the damage script).
6. `PKMNSUBSTITUTEFADED`: model the ~111-row fade animation before the message becomes ready.
7. Tier-2 test: replay `subp1mProbe.py` sweeps (never / A@420 / A@500 / B@600 / START@600) against the engine's button flow; assert exec-equivalent hold and `press+3` release.

## 5. Correction to hpd1 S2

`docs/hpd1-hp-hold.md` hpf4m S2: the Substitute damage string is printed by `Cmd_healthbarupdate` (`battle_script_commands.c:1818`), not datahpupdate; the script pointer is merely parked at datahpupdate while exec holds. The delay is a button wait (any length), not a fixed N-frame pause.
