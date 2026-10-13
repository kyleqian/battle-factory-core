# fpp150 (main/ts lane, ISSUES #139): the Focus Punch "tightening its focus" pre-pass — kernel + both scene modes

User-authorized gameplay-order fix (`docs/factory-finish-scope.md`): a new end2 script before action 1, no RNG. Base `c94a282bd`.

## 1. Results first

| check | result |
|---|---|
| `verify-rcp143-r4.ts` (OFF arms: message order + every `Random()` draw) | **PASS** (was FAIL); control arm PASS before and after; receipt refolded (`--write`), pin flipped in `tests/rcp143Receipts.test.ts` |
| Kernel tier-1 (`tests/factoryBattleScriptFocusPunchPrePassFullTurn.test.ts`, 8) | slower / faster player user, opponent user (attacker 1), two users in battler-index order, asleep and Truant-loafing guards, control (another move), Scene OFF (no animation event, same RNG / HP) |
| Pre-pass anchors through production (`tools/integration/fpp150Anchors.ts`, `tests/fpp150FocusPunchPrePassPresentation.test.ts`, 5) | R4 Scene OFF: empty box **72**, focus glyph **109**, foe's glyph **215** == ROM. Scene ON: empty box **72**, general animation **75 .. 198** (X + 1 .. X + 124), focus glyph **199**, foe's glyph **305** == ROM. Control arms calibrate the map (first glyph 46 == ROM) |
| fps147's 7 dense Scene ON windows **through the production render** (`tools/integration/fpp150ProductionCompare.ts`) | **0 px on 7 / 7** (rel -1 .. 122 full screen, 124 rows each, incl. the elevated GOLBAT shadow window); rel 123 .. 128 0 px outside the message band. Controls age+1 / wrong-side / no-effect: 0 / 7 clean. `fixtures/fpp150/production-compare*.json` |
| Census 0..999 (Scene ON, `ret88Census.sh`) | command keys + `battleDigestExcludingFrames` **identical**, live 27,016 / 27,196 unchanged; **36 battles** changed frames only (+20,848), **36 / 36 attributed** (§3) |
| Soak vanilla 0:20 `--parallel 5` | **20 / 20 OK**; every per-seed line (`b4 t0`, budget, carry <= 7, depth <= 9) identical to thr153's: no seed changed |
| `compare:differential` fight-submenu / battle1-postwin-next-prompt / presentation-rng-playable-live-bodies-seeded-on vs `c94a282bd` | **PASS, 641 / 641 captures byte-identical** (no Focus Punch in those traces) |
| Full `npm test` | mid-step: 1 failure, the deliberate fps147 "is unwired" pin (flipped: only `battleScene.ts` imports the reducer). Final tree (4 shards): **1,663 files / 13,822 tests passed, 0 failed** (44 / 223 skipped); typecheck 0; smoke 448; build OK |

## 2. What changed

**Kernel** (`factoryBattleScriptFullTurnDecision.ts` `runFocusPunchSetUpPrePass`, between the turn-order fix and action 1).
CheckFocusPunch_ClearVarsBeforeTurnStarts (`battle_main.c:4906-4923`): battlers 0, 1 in index order. A battler qualifies if its banked
`chosenMoveByBattler` (thr153's F3 bank) is MOVE_FOCUS_PUNCH, it is not STATUS1_SLEEP, and its `truantCounter` is 0. noValidMoves
is subsumed by the bank, because an AreAllMovesUnusable battler banks MOVE_NONE. A qualifying battler runs
`BattleScript_FocusPunchSetUp` to its own end2, with selectorRoles.attacker set to it. The playanimation takes Cmd_playanimation's
own gates: Scene OFF calls BattleScript_Pausex20 and emits no event. The pre-pass draws no RNG.

**Presentation** (`battleResolutionPresentation.ts`):

- **`general-animation` command** (`FOCUS_PUNCH_SETUP`, Scene ON). It runs 124 frames, ROM rows X + 1 .. X + 124, where X is
  the playanimation row. If the battler has STATUS2_SUBSTITUTE at turn start it runs 3 frames: TryHandleLaunchBattleTableAnimation
  returns early and the focus glyph lands at X + 4.
- **Pre-pass empty box** (EMPTYSTRING3). It lasts the kernel's interpreter executions to the script's next presented receipt, plus
  waitmessage 1's controller row: Scene ON 2 + 1 = 3, Scene OFF 36 + 1 = 37 (Pausex20's call, pause 32 and return).
- **Focus print.** It keeps waitmessage B_WAIT_TIME_LONG and adds an **11-frame** end2 -> action-1 lead
  (`FOCUS_PUNCH_PRE_PASS_ACTION_LEAD_FRAMES`). Before a second user's pre-pass the lead is 7 (unprobed).
- **Confirm handoff** on a pre-pass turn ends after `stop-bounce-request`. The ROM prints the empty box 3 rows after turn order,
  versus 9 rows for an action's first print.

**Render** (`battleResolutionPresentationRender.ts` effect `general-animation`, age = phaseElapsed - 1 = fps147's rel;
`battleScene.ts` `generalAnimationRenderView`). This is fps147 §4e path 2: `focusPunchSetUpDisplayRow` draws the attacker's red
OBJ-palette blend, ShakeMon2 x2, the Endure particles (slots 9, 7, 5, 4, 3) and SpriteCB_EnemyShadow's hide on rows 1 .. 121. It
draws nothing over the doll.

**x2 history:** FOCUS_PUNCH_SETUP zeroes the attacker's side, because ShakeMon2 ends at 0 absolute. The orchestrator hands the
command the tracked x2 input, as it does for status-animation.

**Census tool:** `liveShareCensus.ts` reports `generalAnimations` separately from `commands`, so digests are unchanged.

## 3. Ripple

| where | change | attribution |
|---|---|---|
| census 0..999 (Scene ON) | 36 battles +20,848 frames (226 .. 234 per pre-pass; 2,656 for battle 417's 20 pre-passes); keys / outcomes / live counts identical | **each of the 36 rerun alone == census-after, and == base with the kernel pre-pass toggled off** (`.integration/validation/fpp150/census-toggle.json`). 17 of them carry a Focus Punch move command. In the other 19 the user chose Focus Punch but never struck (it lost its focus or fainted first), and the pre-pass still runs, as in the ROM |
| general animations (census, counted apart) | **100** FOCUS_PUNCH_SETUP commands (opponent 65, player 35), 10,343 frames, 10,209 drawn. The undrawn frames are each command's age -1 row plus the behind-a-Substitute 3-frame commands | — |
| tests | `rcp143Receipts` R4 pin FAIL -> PASS; fps147 "is unwired" -> "only battleScene.ts imports it" | deliberate |
| RNG | none: verify-rcp143-r4 draws match on both arms; census `battleDigestExcludingFrames` identical | — |

## 4. Not done / open

- **Charge-turn EMPTYSTRING3 (ISSUES #167 sentence kept).** No charge-turn window exists per scene: rcp143 R3's SOLAR BEAM user is
  slept before it charges. off108's anchor ("command after the opener at G + 1", G = the print row) implies 0 – 1 frames under
  production's first-glyph convention; "2 rows" would need P adjusted. This needs a dense charge-turn card per scene and an anchor run
  like `fpp150Anchors.ts`. The multi-hit / Triple Kick / HitsAllWithUndergroundBonus EMPTYSTRING3 prints (waitmessage 1, inside
  calibrated hit loops) are unchanged too.
- **A player voluntary switch against an opponent Focus Punch.** The kernel order is right (the pre-pass comes before the switch
  action). The presentation, however, puts its synthesized recall receipts (`withSynthesizedSwitchRecallEvents`, sequences -2 / -1)
  ahead of the pre-pass, and that handoff path's timing is unmeasured.
- Two pre-passes in one turn (lead 7) and the 11-frame lead after action-1 prologues other than R4's StatDown are unprobed.
  Production's fixed-length confirm handoff carries the same assumption.
- core-rs: no CheckFocusPunch port found (only move-data / metadata tests mention Focus Punch); not edited.

## 5. Reproduce

```sh
node --experimental-strip-types tools/probe/verify-rcp143-r4.ts                       # R4: PASS
node --experimental-strip-types --no-warnings tools/integration/fpp150Anchors.ts       # per-arm anchors
sh tools/integration/fps147Run.sh <fresh>                                              # ROM dumps (ALL SAME)
node --experimental-strip-types --no-warnings tools/integration/fpp150ProductionCompare.ts <fresh>/dump out.json [--neg=age+1|wrong-side|no-effect]
sh tools/integration/ret88Census.sh shards <dir> HEAD                                  # census; base = thr153 census-f1 (same src tree)
npx vitest run tests/factoryBattleScriptFocusPunchPrePassFullTurn.test.ts tests/fpp150FocusPunchPrePassPresentation.test.ts tests/rcp143Receipts.test.ts tests/fps147FocusPunchSetUp.test.ts
```
