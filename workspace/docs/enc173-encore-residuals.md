# enc173 — Encore residuals after act156 (ISSUES #171)

## 1. Results

**No engine change was needed.** Both residuals PASS at the base commit `5e78e4030` (`git diff 5e78e4030 HEAD -- src` is empty).
The deliverable is the evidence: three new ROM receipts, a pinning test, and a source argument that case (a) cannot reach a turn start.

| Item | Result |
| --- | --- |
| (b) `enc173-thr`: mid-turn Encore into THRASH, 21 turns | **PASS → PASS**, first divergence none. Covers the locked + Encored shape (turn 2 pays no `GetMoveTarget`). A free-landing Thrash re-lock was not reproduced: Thrash's confusion after-effect kept the Encore from reaching a re-lock in this card |
| (b) `enc173-upr`: mid-turn Encore into UPROAR, 20 turns | **PASS → PASS**. Turn 13 is the free-state, differing-chosen-move shape; draw count, Uproar duration and HP match the ROM |
| (b) `enc173-rol`: mid-turn Encore into ROLLOUT, 20 turns | **PASS → PASS**. Turns 13 and 19 are the free-state, differing-chosen-move shape; the action-time Encore arm pays exactly one `GetMoveTarget`, as the ROM does |
| (a) overwritten Encore (Mimic / Transform / Sketch) | **Not reachable at a turn start; no receipt staged.** See section 3. Port and source agree for every reachable state |
| enc160 hbenc / c2ice / fpenc; rcp154 C1 / C1f / C2 / C2u; rcp143 R1 / R2 / R3 / R3-control; `verify-rcp143-r4.ts` | all PASS |
| Receipts | each card run twice in fresh processes, byte-identical (`probeOutputSha256 == probeOutputSha256Rerun`) |
| Tests | `tests/enc173Receipts.test.ts`, 9 tests. Vitest quartet plus the new file: 5 files / 63 tests pass. `npm run typecheck` and `npm run test:smoke` (8 files / 448 tests) pass |
| Census 0..999 | **Not run: it cannot move.** `src/` is byte-identical to the base commit, so every battle trajectory is identical by construction. No moved battle needs attributing |
| Acceptance item "staged kernel control that fails without the fix" | **Not met, deliberately.** There is no fix, so no control can fail without it. Inventing one would be fabricated evidence |
| Full `npm test` / `npm run build`, soak | see section 5 |

## 2. Part (b): a mid-turn Encore into a locking move

Question: when a faster foe Encores a battler into Thrash / Uproar / Rollout / Ice Ball, can the round orchestrator's locked-move
check trip?

Source order in `HandleAction_UseMove` (`battle_util.c:99-138`): locked arm (`:107-110`, no `GetMoveTarget`), then Encore arm 1
(`:111-117`, `GetMoveTarget`), arm 2 (`:119-128`), chosen-move-changed arm (`:130-134`).

The two shapes:

- **Free battler, Encore lands before its action, chosen move differs from the Encored one.** Not locked yet, so Encore arm 1
  runs the Encored locking move and draws `GetMoveTarget`. `enc173-rol` turns 13 / 19 and `enc173-upr` turn 13.
- **Already locked, Encore lands.** The locked arm wins and draws nothing. This is the enc160 shape (hbenc / c2ice), and `enc173-thr` turn 2.

`actionRetargetsAtExecution` (lock guard from enc160) and `actionEncoreArm` / `lockedMoveDecision` in `runMoveAction`
reproduce both. The lock check does not trip on a mid-turn Encore into a locking move.

## 3. Part (a): an overwritten Encore

Source clears an overwritten Encore only at the battler's own action (`battle_util.c:119-128`). The port clears it at turn start
for both battlers (`clearOverwrittenEncoreAtAction` at the turn-start site, `factoryBattleScriptFullTurnDecision.ts`). These
agree for every reachable state, because the state never reaches a turn start:

1. Mimic, Sketch and Transform overwrite only the user's own `moves[]`.
2. `ENDTURN_ENCORE` (`battle_util.c:1719-1735`) clears an Encore whose `moves[encoredMovePos] != encoredMove`, with no timer
   decrement. The port does the same (`battleEndTurnOrchestration.ts:1666-1681`). So an overwritten Encore is gone by the end of
   the turn in which it was overwritten.
3. For the overwrite to precede a later action, it must happen before that action in the same turn, and `Cmd_trysetencore`
   (`battle_script_commands.c:8017`) refuses to set an Encore unless the target's last move is still in its `moves[]`. A battler
   that already ran Mimic / Transform has lost that slot, so the Encore fails. The one way to get an Encore onto a Mimic slot is
   to Encore the user into Mimic itself; Mimic then overwrites the slot during its own action, and step 2 clears it at the end of
   that turn.
4. Therefore arm 2 (`:119-128`) never runs in a state the port could mis-order, and the only mid-turn effect of a stale Encore
   (blocking a second `trysetencore`) fails anyway.

Factory pool: Mimic exists on JIGGLYPUFF and ABRA, Transform on DITTO only, Sketch not at all. An Abra card was staged (Mimic /
Flash x3 vs Plusle ENCORE x4): the AI pair never produced a turn where the Encored Abra overwrote its own slot, which is
consistent with the argument above, and it was dropped rather than committed as a non-test. No port change is proposed.

## 4. Remaining work

- A free-landing Thrash re-lock card (needs a seed where Thrash's confusion does not interrupt).
- A Jigglypuff Mimic-into-Mimic card, if a ROM demonstration of section 3 step 3 is wanted. It would be PASS → PASS.

## 5. Reproduce

```sh
python3 tools/probe/gen-enc173-cards.py                      # writes tools/probe/rcp154/enc173-*-off.json
for k in thr upr rol; do
  for n in 1 2; do
    python3 tools/run-mgba-probe.py /tmp/${k}_$n.json -- python3 tools/probe/probe-rcp154-action-time.py \
      tools/probe/rcp154/enc173-$k-*-off.json /tmp/${k}_$n.json --slot-plan 0,1 --attribute 0:9028
  done
  python3 tools/probe/derive-enc173-slots.py /tmp/${k}_1.json   # portPlayerSlots / portPlayerTargets for the spec
  python3 tools/probe/build-rcp154-receipt.py tools/probe/rcp154/enc173-$k-spec.json /tmp/${k}_1.json /tmp/${k}_2.json tools/probe/receipts/enc173-$k.json
  npx tsx tools/probe/verify-rcp154.ts tools/probe/receipts/enc173-$k.json --write
done
npx vitest run tests/enc173Receipts.test.ts
```

Needs the Scene OFF oracle (`POKEBENCH_ORACLE_URL=http://127.0.0.1:8014`, profile `battle-scene-off`).

Tooling added: `gen-enc173-cards.py`, `derive-enc173-slots.py`, an Uproar `SetMoveEffect+0xa32` caller mapping in `verify-rcp143.ts`,
and `STRINGID_ITHURTCONFUSION` as a dispatch announcement in `verify-rcp154.ts` (a confusion self-hit turn dispatches the
move's script and announces the hurt message instead of `USEDMOVE`). Neither changes gameplay.
