# aud243c: census ROM replay alignment (S11 step 7, T2 feasibility, second attempt)

Result: **the first-decision divergence of aud243b was replay staging, now fixed.** The engine and the ROM run one RNG stream from the action menu, and
the engine's own per-frame inputs replayed on the ROM reproduce the moves, HP and RNG of turn 1 on all four runs: 224 ON and OFF (AI mask 1), 552 ON
and 177 ON (mask 7). Seeds 224 ON/OFF and 552 also match through turn 2 and the forced switch-in. Seed 177 found a **real engine bug** in turn 2
(Substitute bypassed after Leftovers; §4). Per the brief it is diagnosed here, not fixed: no `src/` change.

Evidence (ignored dir): `.integration/evidence/aud243c/` = `ai224-on.json` (ROM AI state + per-frame RNG log), `setup*.json`, `engine*.json`,
`run*.json` (the lab request carrying the engine inputs), `tl*.json` (ROM timeline), `cmp*.json` (compare).

## 1. Cause: the ROM's action-menu `gRngValue` is post-AI

In Emerald the opponent's controller answers while the player's action menu is still open. At `STATE_BEFORE_ACTION_CHOSEN`
(`battle_main.c` HandleTurnActionSelectionState), both battlers get CHOOSE_ACTION. `OpponentHandleChooseAction` runs `AI_TrySwitchOrUseItem()`
(`battle_controller_opponent.c:1540-1544`). Then CHOOSE_MOVE runs `BattleAI_SetupAIData(ALL_MOVES_MASK)` + `BattleAI_ChooseMoveOrAction()` (:1566-1567).
The lab's frame-0 condition (`_finish_intro_to_action_menu`: player buffer = CHOOSE_ACTION, exec flags = player only) is reached only after this.
The engine spends the same draws at the turn commit. aud243b aligned the engine's menu RNG with the ROM's post-AI value, so the engine's AI
drew its scores 7 positions late.

ROM proof, seed 224 ON (`tools/audio/romAiDecision.py ... --rng-log`, ROM `gRngValue` changes per frame):

| frame | draws | top16 values | what (source) |
|---|---|---|---|
| 1883 | 1 | 16159 | `gRandomTurnNumber = Random()` (battle_main.c:3140) |
| 1887 | 2 | 47456, 28904 | `AI_TrySwitchOrUseItem` → ShouldSwitch path (the engine ledger's `opponentShouldSwitch`, 2 calls, `src/engine/turnRng.ts`) |
| 1889 | 4 | 12573, 32748, 2887, 32914 | `BattleAI_SetupAIData` `simulatedRNG[i] = 100 - Random() % 16` (battle_ai_script_commands.c:344). ROM `ai->simulatedRNG` = **[87, 88, 93, 98]** = 100 − (13, 12, 7, 2) ✓ |
| 1890 | 1 | 29971 | best-score tie-break. ROM `ai->score` = [100, 100, 100, 100]; 29971 % 4 = **3** |

At the menu the ROM opponent reply `gBattleBufferB[1][0..3]` = `[33, 10, 3, 0]` = CONTROLLER_TWORETURNVALUES, B_ACTION_EXEC_SCRIPT, **slot 3 =
Scary Face (184)**, target 0. These are exactly the 7 "extra" draws of aud243b. They are not lab-only and not missing from the engine; the engine
just spends them later. Nothing lies between them and the next turn-order draw, so the order difference is invisible to outcomes. **No engine
change is needed.**

## 2. Hypotheses

1. **AI mask mismatch: refuted.** The replay engine is built with `factoryWinStreak = (seed*11)%49` (224 → 14). `selectFactoryAiMask({levelMode 0,
   battleMode 0, factoryWinStreak 14, trainerOpponentId 115})` = mask 1 `AI_SCRIPT_CHECK_BAD_MOVE` (branch challengeBelow4). The ROM lab stages
   streak `challengeNum*7` = 14, so challengeNum 2 → the same flag. Trainer 115, battleNum 0: no Frontier Brain on either side. The ROM scores
   [100,100,100,100] are what CHECK_BAD_MOVE leaves for Earthquake/Eruption/Body Slam/Scary Face here. (`aiFlags` reads 0 at the menu because
   BattleAI_ChooseMoveOrAction shifts it out per script.) Seeds 552 (streak 45 → 42 staged) and 177 (36 → 35) both give challengeNum ≥ 4 → mask 7
   on both sides, and they align too.
2. **7 extra ROM Random() calls: confirmed and named** (§1): turn number, then 2 ShouldSwitch, 4 simulatedRNG and 1 tie-break, all modeled by the
   engine at commit.
3. **AI score inputs: not needed.** With the stream aligned before the AI draws, the engine picks Scary Face. aud243b's `scan --draws=9 --patch=1`
   overwrote the RNG with the post-AI value and so spent the AI draws twice. Its k=9 non-damaging pick was the correct alignment, not chance.

## 3. Fix (tooling, committed) and results

- `soundEventProbe.py lab --setup-out` also writes `randomTurnNumber` and `opponentReply` (the ROM's `gBattleBufferB[1][0..3]`).
- `soundCensusRomReplay.ts replay` aligns on gRandomTurnNumber. It picks the engine pre-battle draw count k whose action-menu turn number equals
  the ROM's and whose menu RNG is LCG⁻ʲ(ROM menu RNG). It reports `engineDrawsBeforeActionMenu` k and `romOpponentDrawsBeforeActionMenu` j.
  Pre-aud243c setups need `--turn-number=N`.
- New `compare` mode: each engine timeline state (hp0, hp1, rng, gLastMoves[0..1]) must appear in order among the ROM timeline states.
- `romStateTimeline.py` rows gain `gLastMoves[0]`, `gLastMoves[1]`; new probe `romAiDecision.py`.

Commands per seed (S, SC): `soundEventProbe.py OUT lab req$S-$SC.json --profile SC --setup-out setup.json` → `soundCensusRomReplay.ts replay
--seed=S --scene=SC --setup=setup.json --out=engine.json` → a lab request with `trace.segments = engine.inputs` → `romStateTimeline.py` → `compare`.
Requests are the aud243b ones (`.integration/validation/sv-20261108/aud243b/req*.json`).

All four: k = 9, j = 7.

| seed / scene | turn number | matched engine states (engine frame → ROM frame: hp0/hp1, rng, last moves) | stops at |
|---|---|---|---|
| 224 ON | 16159 | T1 9→1326: 129/49, 392910476, [188 Sludge Bomb, 184 Scary Face]; T2 1304→4110: 0/49, 712339641, opp 284 Eruption KO; switch-in + poison 2364→6939: 161/33, 74431800 | ROM input trace exhausted (ROM at frame 6946 of its turn 3) |
| 224 OFF | 16159 | same three states, at ROM frames 869 / 2506 / 4798 | input trace exhausted |
| 552 ON | 48790 | T1 9→808: 17/45, 1392071469, [25, 224]; T2 803→1720: 0/45, 638470153, opp 224 KO | ROM waits at the forced party select; the engine's frame-timed inputs run out first |
| 177 ON | 20393 | T1 9→772: 6/165, 1970019264, [164 Substitute, 57 Surf] | **T2: engine and ROM both end at RNG 185369341 after a critical Shadow Ball. The ROM's Substitute absorbs it (player HP stays 6). The engine KOs the player (HP 0).** §4 |

Damage, crits and draw counts match wherever both sides ran: every matched row has equal HP and gRngValue.

Limits: the inputs are the engine's frame-timed inputs. The engine's presentation is not ROM-frame-exact (224 ON forced switch: engine 2364 vs ROM
6939), so after the first faint/switch the ROM falls behind and the trace ends. For 177 the ROM also ran Toxic (slot 2) where the engine's policy
would pick slot 1, which is input drift. The next step for replay past turn 2 is a ROM-side semantic driver: press A at
CHOOSE_ACTION, navigate to the engine's slot at CHOOSE_MOVE, pick the engine's party index at the forced switch. Sound diff (Phase 2) was not run.

## 4. Engine divergence found: `Cmd_datahpupdate` does not clear HITMARKER_IGNORE_SUBSTITUTE

Source (`battle_script_commands.c:1863-1897`). If the target has no active substitute, or `HITMARKER_IGNORE_SUBSTITUTE` is set, the else branch
first runs `gHitMarker &= ~HITMARKER_IGNORE_SUBSTITUTE;` (:1895), then the HP gain (`gBattleMoveDamage < 0`) or loss.
Engine (`src/engine/battleScriptHitChainOpcode.ts`, Cmd_datahpupdate handler ~2507-2640): the negative-damage branch (~2556) and the damage branch
(~2584) clear only `HITMARKER_PASSIVE_HP_UPDATE` / `HITMARKER_IGNORE_BIDE`; `HITMARKER_IGNORE_SUBSTITUTE` is never cleared there.

Seed 177 trace:
1. Turn 1: Shuckle sets Substitute (subHP 22).
2. End of turn 1: Leftovers runs `BattleScript_ItemHealHP_Ret`, which does `orword gHitMarker, HITMARKER_IGNORE_SUBSTITUTE; healthbarupdate;
   datahpupdate BS_ATTACKER` (data/battle_scripts_1.s:4377-4384). The ROM clears the bit in that datahpupdate. The engine keeps it.
3. Turn 2 starts with engine `hitMarker = 256` (= HITMARKER_IGNORE_SUBSTITUTE). Slowbro's Shadow Ball goes through the substitute: events
   `STRINGID_CRITICALHIT`, `health-bar-update`, `STRINGID_TARGETFAINTED`, no STRINGID_SUBSTITUTEDAMAGED.
4. Draw count is unchanged (both sides at 185369341).

**Proposed fix (for a briefed main/ts worker):** in the Cmd_datahpupdate handler, when `substituteActive` is false, set
`hitMarker &= ~HITMARKER_IGNORE_SUBSTITUTE` before both the negative-damage and the damage branch, mirroring :1895. MOVE_RESULT_NO_EFFECT keeps
skipping the whole block as in source.

**Expected blast radius:** no Random() count change, so RNG streams are unchanged. Outcomes change only when the bit leaks out of an `orword ...
IGNORE_SUBSTITUTE` script and a substitute holder is hit before the next HandleAction_ActionFinished (which clears it, `battle_util.c:664`).
That means end-of-turn scripts (Leftovers / Shell Bell-type item heal `BattleScript_ItemHealHP_Ret` / `_RemoveItem`, `BattleScript_IngrainTurnHeal`,
`BattleScript_LeechSeedTurnDrain`, `BattleScript_DoTurnDmg` (poison/burn/curse/nightmare), Rain Dish, Wish, Perish Song, Spikes on switch-in, Berry
heals) followed by the next turn's first action hitting a battler with a substitute. Within one action the bit is cleared at ActionFinished anyway.
`BattleScript_DamagingWeatherLoop` bicwords the bit itself. The trajectory shows more damage absorbed by subs, and fewer KOs and sub-bypasses in
turns following an end-turn HP change. Rebaseline any fixture with a substitute plus an end-turn heal/damage on the sub holder. Needs the Factory
engine-correction gates of ANIMATION_VERIFICATION.md (staged ROM route: seed 177 ON from this doc is a ready one).

## Gates (tooling-only step)

Tested tree = this commit (see the final report).
- `npm run typecheck` exit 0.
- `python3 tools/test_sound_event_probe_args.py` OK (3 tests).
- `vitest tests/audioProbeFixtures.test.ts` 719 passed / 18 skipped.
- `vitest tests/audioHeadlessBoundary.test.ts tests/battleDecisionBoundary.test.ts` 16 passed.
- `npm run animation:coverage` 0 and `npm run animation:audit` 0.
- `py_compile` of the three probes; `git diff --check` clean. No `src/` change.
