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

Static `\l`: A at 600 released at 633 (not 603). The cause (scroll time after the press) is unverified; open item for Tier-2 calibration.

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
| `PKMNWASDRAGGEDOUT` | `BattleScript_TrainerBattleForceOut` (Roar / Whirlwind in a trainer battle) | measured |
| `MoveUsedIs*` family (Disabled / Tormented / Taunted / Imprisoned) | `BattleScript_MoveUsedIs*` | button, then 64 rows of `waitmessage` after release |
| `PKMNOBTAINEDXYOBTAINEDZ` (Trick/Switcheroo when both mons hold items) | `gItemSwapStringIds[B_MSG_ITEM_SWAP_BOTH]` | mid-string `\p`: first line, then a second after the press; the single-item variants (`PKMNOBTAINEDX`/`X2`) have no `\p` |
| `PKMNWASPARALYZEDBY` (Static paralysis, `B_MSG_STATUSED_BY_ABILITY`) | `sText_PkmnWasParalyzedBy` (the only `\l` ability string in `battle_message.c`) | mid-string `\l` gate, then 64 rows of `waitmessage` after release; measured |
| `PKMNPREVENTSUSAGE`, `PREVENTEDFROMWORKING`, `PKMNSXPREVENTSYSZ` | `battle_scripts_1.s:4074`, `:4046`, `battle_message.c` ability-prevention tables | ability-blocking family; `\p` endings were seen in the template grep but their engine advance mode was not individually audited here |
| A-only dismissal | orchestrator | ROM also accepts B |

Not reachable in the Factory (frontier skips them): EXP / level-up / learn move (`Cmd_getexp`), money and Pay Day (0 sets carry Pay Day), whiteout text, run/escape/FLED, catch/Safari, two-trainer text, `ENEMYABOUTTOSWITCH` prompt.

The full list of templates with `\p`/`\l` can be regenerated with
`grep -n '\\\\p\|\\\\l' src/data/gen/battle-message-templates.json` and cross-checked against `battle-frontier-mons.json` move/ability sets.

## 4. Proposed landing (separate steps, not done here)

1. In `battleResolutionPresentation.ts` set `advance: "button"` for SUBSTITUTEDAMAGED, SUBSTITUTEFADED, DRAGGEDOUT, the MoveUsedIs* family, `PKMNOBTAINEDXYOBTAINEDZ` (two gates), and `PKMNWASPARALYZEDBY` (`\l`) (a table keyed by string id, next to the existing button ids at ~2170).
2. Accept A or B in `factoryRoundBattleOrchestrator.ts` (~2792-2830); START must stay a no-op.
3. Hazard: the turn-end rule (~5609) pushes a `turn-end` command only when the segment has no button message. Flipping SUBSTITUTEDAMAGED to button must not suppress turn-end for the rest of the segment; scope the rule to the button message's own segment position.
4. Readiness: `L+1` rows from message start versus the ROM's earliest accept at print + 38 (typing-bound) and release at press + 3. Calibrate against the sweep (A at 418/419/420 and +3 release), and account for the text-speed option, which changes typing time.
5. After release, `MoveUsedIs*` and the `\l` ability strings hold 64 rows (`waitmessage`) before the next command; Substitute-damaged does not (message is followed by the damage script).
6. `PKMNSUBSTITUTEFADED`: model the ~111-row fade animation before the message becomes ready.
7. Tier-2 test: replay `subp1mProbe.py` sweeps (never / A@420 / A@500 / B@600 / START@600) against the engine's button flow; assert exec-equivalent hold and `press+3` release.

## 5. Correction to hpd1 S2

`docs/hpd1-hp-hold.md` hpf4m S2: the Substitute damage string is printed by `Cmd_healthbarupdate` (`battle_script_commands.c:1818`), not datahpupdate; the script pointer is merely parked at datahpupdate while exec holds. The delay is a button wait (any length), not a fixed N-frame pause.

## 6. btn1: the landing (2026-11-19, ISSUES #223)

Presentation / input only: kernel events, RNG and logical outcomes do not move (census below), both scenes share the rule. The only behaviour change is that the messages below now wait for a NEW A or B press, as the ROM does.

### Model

- **Which strings.** The gate set is read from the templates, not from a hand list: `battleStringPromptGates(messageId)` (`battleStringResolver.ts`) returns one gate per `\p` (clear), `\l` (scroll) or `PAUSE_UNTIL_PRESS` (wait) segment, with `afterLines` = the number of resolved lines printed before it. `tests/btn1PromptGates.test.ts` pins that every template with such a marker has gates and no other template does.
- **Pieces.** `promptGatedMessageCommands` (`battleResolutionPresentation.ts`) turns one message command into pieces: a `button` piece per gate (`promptGate: true`, ready one row after its glyphs are typed, `messageCommandTypedRows + 1`, the existing button-message rule) and a trailing `automatic` piece for the text after the last gate. A `\l` scroll keeps the last typed line on screen (`startChars`) and spends `PROMPT_SCROLL_ROWS` (5) rows scrolling before the rest types; a `\p` clear starts the next page empty. The original `holdFrames` (the `waitmessage` 64 rows of `MoveUsedIs*` / Static) ride on the last piece, or on an automatic zero-typing hold piece when the gate is the string's last marker. Faint and terminal-seam strings keep their old single `button` command (no `promptGate`).
- **Turn-end.** The segment's `turn-end` is still emitted for gated pieces (the old rule suppressed it for any button message; it now excludes `promptGate` pieces). Faint buttons still suppress it.
- **Input.** `advanceFactoryRoundBattleResolutionCore` accepts A or B (a NEW press: a held key does not release the next piece); START and SELECT do nothing; a press while the text types is not remembered.
- **Scene view** draws the pieces' `lines[0..1]` as before (the retained line after a scroll is the first row).

Strings that now wait (Factory-reachable): Substitute damaged (`SUBSTITUTEDAMAGED`) and faded (`PKMNSUBSTITUTEFADED`), Roar / Whirlwind "dragged out", the `MoveUsedIs*` family (Disable / Torment / Taunt / Imprison / Seal; 64 rows after release), Trick / Switcheroo with both items (a mid-string `\p`: two pages), Static's paralysis text (`\l`, then 64 rows), and the ability-blocking family (`PREVENTEDFROMWORKING`, `PKMNPREVENTSUSAGE`, `PKMNSXPREVENTSYSZ`: a `\l` gate, no trailing prompt; the earlier audit left these open, the templates answer it).

### ROM windows (this step; `subp1mProbe.py`, direct mGBA, both scenes, 1000 frames)

Release = the first `exec` 1 -> 0 after the press; every row below was re-run today on the labs of section 2.

| lab | scene | print | no press | A 419 | A 420 | A 500 | B 600 | START 600 |
|---|---|---|---|---|---|---|---|---|
| hpf4m-subhit | OFF | 382 | stalls | rejected | released 423 | 503 | 603 | stalls |
| hpf4m-subhit | ON | 393 | stalls | rejected | rejected (print + 27) | 503 | 603 | stalls |
| subp1m-roar | OFF | before 300 | stalls | released 422 | 423 | 503 | 603 | stalls |
| subp1m-roar | ON | 458 | stalls | rejected | rejected | 503 | 603 | stalls |

Earliest accept is print + 38 on the Substitute lab (OFF: 382 -> 420; ON: 393 -> 431, so A at 420 is rejected), the glyph count of "The SUBSTITUTE took damage / for RATTATA!" (38); release is press + 3 in every accepted row; B equals A; START never releases.
Engine side: the same Substitute string with 38 glyphs types in `messageCommandTypedRows` = 38 rows and the engine accepts from row 39 (`typedRows + 1`, the convention of the existing faint button messages), releases on the press row, and rejects every press made while typing (Tier-1: `tests/btn1PromptGates.test.ts`, 27 tests: stall with no press, START / SELECT no-op, A and B release at the first accepted row, an early press is not remembered, turn-end kept, the 64-row hold piece, scroll / clear piece shapes; they fail without the change).
No `npm run compare` stage exists for these labs (the app-stage generator has no Substitute-hit / Roar staging), so the before / after is the probe sweep against the Tier-1 engine rows, not a matched-frames count.

### Census 0..199, both scenes (`lsd194Census.sh` + `rst197CensusDelta.py` + `soundCensusDelta.py`)

Base arm = master at the btn1 engine commit's parent tree (`2227c7e66` with `93de61555` reverted), final = the btn1 tip. eventsDigest and error identical on all 200 seeds in Scene ON and in Scene OFF; 0 errors in all four arms (no seed newly stalls). 40 battles differ per scene (160 identical): 25 only move command frames, 15 gain extra command pieces (seeds 2 (+2 commands), 6, 27, 53, 69, 70, 84, 87, 102, 119, 128, 137, 140, 168, 177 (+1 each): the mid-string-gate strings, so `rst197CensusDelta.py` lists them as `typeSequence`). Sound: T1 Scene ON 54,005 exact, known-offset 0 / missing 0 / extra 0, non-move 21,973 exact; Scene OFF has no move animations (0), non-move 901 exact; arm vs arm 159 seeds identical, 41 changed (40 gain one `se 5`, the prompt-press SE the engine already plays for button messages, and later events move with the changed rows).

### Gates and re-pins

`npm run typecheck` 0; `npm run build` 0; `npm run build:lib` 0; `npm run test:gate` 362 files / 2,844 tests; every test importing the changed modules or naming these strings (250 files) green after the re-pins; soaks OK: vanilla 0:20 Scene OFF 20 / 20, Scene ON 20 / 20 (two 10-seed calls), winning 0:60 `--max-rounds 3` Scene OFF 60 / 60 and Scene ON 60 / 60 (the unbounded winning run is ~10 min per 20 seeds on this loaded box); `npm run play:random -- --minutes 3 --scene both`: 0 page errors, 0 console errors, 0 stalls.
Re-pins: `tests/lbrd.test.ts` seeds 0 -> 2 (all three roles; scan 1..15, only 2 passes all 15); `tests/randomRoundSoak.test.ts` Baton Pass pin seed 4 -> 12 (scan 0..29, the only candidate), `full` seed 1 frames 92558 / turn 27 -> 95264 / turn 29 (seed 0 unmoved), carry-14 seed 4 -> 13 (scan 0..29, the only seed with carry 14); `tests/liveSpriteOrderHost.test.ts` sweep pin 846 / 745 -> 847 / 746 (one more known command edge, 0 mismatches); `tests/factoryRoundBattleOrchestrator.test.ts` ISSUES #84(5) now presses A at the Taunt prompt; line expectations of `tests/presentationStringBatch2.test.ts` (row 26), `presentationStringBatch3.test.ts` (row 7) and `presentationStringIssue72Batch2.test.ts` (3 cases) now name the two pieces of a gated string; `tests/substituteFadePresentation.test.ts` expects `message:button` before the fade. In-repo drivers: the soak `onResolution` presser, the census drivers, `soundCensusRomReplay`, `playableAnimationReplay`, `play:random` already press A at `awaiting-message-dismiss` / mash A, so none needed a change; `ENGINE_BUILD` moves (`eb-0e3532b0bcd67531` -> `eb-16a7388b0824ca50`): an old trace that passed a gated message no longer replays.

### Open

- **Scroll length.** `PROMPT_SCROLL_ROWS = 5` is a fit to Static's one measurement (A at 600 releases at 633 = press + 3 + 5 scroll rows + 25 glyphs of "It may be unable to move!"), not a separate ROM measurement of the scroll; the ability-blocking family uses the same value and has no ROM window.
- **`\p` clear delay** between the two Trick pages is modelled as 0 rows (unmeasured); press + 3 and the `typedRows + 1` accept row are inherited from the existing button-message model (a +/-1 row convention question against the ROM's print + 38 is not separated here).
- **Item 6** (the Substitute fade): not measured in this step; the engine's 106-row fade (`tests/substituteFadePresentation.test.ts`) stays against the ROM's ~111-row observation; left in ISSUES.
