# aud240d: Lobby / PreBattleRoom / BattleRoom script sounds, fanfares and the map BGM

S11 audio step 4, last slice. Part 1 (`63a2f7334`) taught the aud238 extractor to follow `msgbox`/std scripts and
shared `call` targets (adds `MUS_OBTAIN_B_POINTS` 459 and SaveBattle's `SE_SAVE`; see `docs/aud238-sound-sources.md`).
Part 2 adds write-only `emitSound` calls (`src/engine/screenSounds.ts`, wired from `src/engine/core.ts`) in the same
branch as the ROM sound. Nothing here changes engine state, RNG, kernel FactoryEvents, frame hashes or pixels:
`emitSound` is a no-op unless a tick is collected (`collectSoundTick`), and `tests/aud240dScriptSounds.test.ts` proves
the final state is byte-identical with and without collection on every window.

Event frames are 1-based tick numbers (an event during the k-th advance is frame k), exactly as `tools/audio/soundEventProbe.py` logs them.

## Fanfare semantics

`playfanfare X` is `m4aMPlayStop(BGM)` then `m4aSongNumStart(X)`; when the fanfare task ends the ROM calls
`m4aMPlayContinue(BGM)`. Our events are `stop` (player BGM, id 469 = `MUS_B_FACTORY`), `fanfare`, then (scheduled) `continue` (player BGM).
`SoundEvent.kind` gained `"continue"` for this.

| fanfare | id | start | continue |
| --- | --- | --- | --- |
| `MUS_HEAL` | 368 | accepted A tick + 1 (`scheduleHealFanfare`) | fanfare + 160 |
| `MUS_OBTAIN_B_POINTS` | 459 | A tick + 1 (`battlePointMutationDelay`) | fanfare + 313 |

## text.c rule behind the SE_SELECTs

An A or B press on a paged text wait (`\p` / `\l`, `TextPrinterWaitWithDownArrow`) plays `SE_SELECT`; a `MSGBOX_DEFAULT`
`waitbuttonpress` (final box) is silent. `Menu_ProcessInputNoWrap` A plays `SE_SELECT`; B on a multichoice with
`ignoreBPress` FALSE plays `SE_SELECT` (script_menu.c); a cursor move plays it only if the cursor moved. The terminal and
postwin emitters apply this rule at the release edges the presentation state already tracks.

## Timing constants

| constant | value | meaning | pinned by |
| --- | --- | --- | --- |
| `FANFARE_CONTINUE_DELAY` | 160 | heal fanfare to BGM continue | heal-window, postwin-record-window |
| `BP_FANFARE_CONTINUE_DELAY` | 313 | BP fanfare to BGM continue | seventh-win-window |
| `TERMINAL_SAVE_AFTER_RESTORE` | 122 | party restore to `SE_SAVE` (loss: second-page release + 50; win: exchange release + 49) | loss-terminal-window, seventh-win-window |
| `TERMINAL_RECORD_YES_SAVE_DELAY` | 19 | terminal record YES to SaveBattle `SE_SAVE` | loss-terminal-window |
| `POSTWIN_RECORD_YES_SAVE_DELAY` | 20 | postwin record-YES SE_SELECT edge to `SE_SAVE` | postwin-record-window |
| `POKENAV_CALL_AFTER_HEAL_FANFARE` | 163 | Brain heal fanfare to `SE_POKENAV_CALL` (continue + 3) | brain-heal-setup-window (relation) |

## ROM windows (`tools/audio/fixtures/`)

Each fixture has the probe output and, where replayable, the input `trace` embedded; `tests/aud240dScriptSounds.test.ts`
requires our `(frame, kind, id, pan)` to equal the ROM's over the whole window.

| fixture | profile | window | ROM events | result |
| --- | --- | --- | --- | --- |
| `heal-window.json` | **ON** (primary) | `battle1-swapyes-b` from 25700, 1000 frames | stop 469 / fanfare 368 @25803, continue 469 @25963 | equal |
| `postwin-record-window.json` | OFF lab | postwin record-YES lab (route generated-orchestrator, stage win-terminal-window-off@4623) from 5100, 1746 frames | heal triple @5534/5694, SE_SELECT @6635/6640/6716/6720, SE_SAVE @6740 | equal |
| `loss-terminal-window.json` | OFF lab | loss terminal from 3330, 1834 frames | SE @3533, 3835; SE_SAVE @4007; SE @4137, 4539, 4989; SE_SAVE @5008 | equal |
| `seventh-win-window.json` | OFF staged | `stage-factory-seventh-win-timeline-off.py`, 4425 frames, A releases at 300 / 1100 / 2200 / 3500 / 4400 / 4424 | SE @1100; stop 469 + fanfare 459 @2201; continue @2514; SE @3500; SE_SAVE @3671; SE @4400, 4424 | equal |
| `brain-heal-setup-window.json` | OFF lab setup log | `factory-brain-silver-walkup-callscene-01-off` with `--log-setup` | stop/fanfare 368 @634, continue @794, SE_POKENAV_CALL 263 @797 | relation only (see below) |

OFF vs ON: only `heal-window` is a Scene ON window, which is the primary oracle. The terminal, record and Lobby paths
exist only as OFF traces/stages (the ON oracle has no replayable route to them), so those three are OFF. The heal fanfare appears in both an ON window (heal-window) and OFF windows (postwin-record-window), at the same
relative spacing (+160); the other script sounds are not measured on ON.

No BGM / fanfare start-frame mismatch exists in any equal window (size 0 frames).

### Brain heal (`brain-heal-setup-window.json`): measured relation, not window equality

The Brain call scene is only reachable in the lab as a setup log whose frames are not an input trace we can replay on our
engine, so the setup frames cannot be compared one-for-one. The ROM log gives the spacing: fanfare @634, continue +160, then
`playse SE_POKENAV_CALL` +163 after the fanfare start (the `waitfanfare`, `HealPlayerParty` and `frontier_getbrainstatus` settle).
We emit it at heal fanfare + 163 only when `postwin.frontierBrain`; the test pins both the ROM spacing and ours on the staged
call-scene trace. Absolute alignment of the Brain heal against the ROM is therefore unmeasured. The staged
`call-scene-start` app stage begins with the heal text still pending whereas the ROM lab window begins after the fanfare, so
our emission shows a heal fanfare inside that staged trace where the ROM window shows none; it is a staging artifact of the
stage, not a play path.

## Site map: handled, not emitted, unreachable

Sites from `data/maps/BattleFrontier_BattleFactory*/scripts.inc` (aud238 `mapMusic`):

| site | status |
| --- | --- |
| PreBattleRoom ReturnToRoomFromBattle `MUS_HEAL` | emitted, ROM-pinned (ON heal-window, OFF postwin-record-window) |
| PreBattleRoom Brain branch `SE_POKENAV_CALL` | emitted at fanfare + 163, spacing from the ROM setup log; absolute frame unmeasured |
| RecordBattle -> SaveBattle `SE_SAVE` (postwin and terminal) | emitted, ROM-pinned (+20 / +19) |
| Lobby LostChallenge `SE_SAVE` + page SEs | emitted, ROM-pinned (loss-terminal-window) |
| Lobby GiveBattlePoints `MUS_OBTAIN_B_POINTS` + `SE_SAVE` | emitted, ROM-pinned (seventh-win-window, staged WonChallenge terminal) |
| Lobby WonChallenge Brain congratulation scroll SE | emitted from the text.c rule on `congratsScrollReleaseAge` (Brain only); unmeasured |
| Win-profile record-prompt SE timing | shares the loss-profile code (`recordMenuInputDelay` 25 vs 24 differs); unmeasured on the win profile |
| PreBattleRoom PauseChallenge (REST) `SE_SAVE` | not emitted, unmeasured. The REST option is a menu choice outside the lanes measured here |
| BattleRoom DefeatedNolandSilver / Gold `MUS_OBTAIN_SYMBOL` 466 | not emitted, unmeasured (the symbol script is not yet reproduced as an audible step on our route) |
| Lobby ResumeChallenge `SE_SAVE` | unreachable: we never load a saved challenge |
| `Common_EventScript_SaveGame` | no script-level sounds; the save screen's SE is C code in the start menu, out of scope |
| Lobby door / warp SEs, exit-warp SE_EXIT | unreachable: the Lobby free-roam is a deliberate divergence with no exit warp and silent NPCs; Attendant A hands off straight to the draft (nch231), skipping the attendant dialogue, save prompt and warp |

### Battle-return sounds: measured, not implemented

At the postwin/terminal start P after a battle the ROM plays: SE_SELECT at P, a fade at P+6 (id 412 for a win, 476 for a loss),
a no-op stop of song 90 at P+43, `bgm 469` (the map BGM restore) at P+53, and `SE_EXIT` (9) at P+79. The ON-trace values at
P=23602 are fade 412 @23608, stop 90 (no-op) @23645, bgm 469 @23655, SE_EXIT @23681. These belong to the battle-return
hand-off (aud241 territory) and are created at several postwin/terminal creation sites, so they are left unimplemented here; the
map BGM start/restore after a fanfare is covered by the `continue` event, which is the ROM's own mechanism for the Factory music.

## Verification record

See the final commit message and the run output of this step. Commands: `npm run typecheck`, `npm run test:smoke`, the
importer tests (`git grep` of `screenSounds` / `soundEvents`), `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/gate6CoverageManifest.test.ts`,
`npm run build`, `npm run build:lib`, `npm run compare:differential` (standard set) against the parent commit.
