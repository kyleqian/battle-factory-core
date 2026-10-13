# enc160 — a LOCKED + ENCORED battler takes no Encore retarget draw (ISSUES #172, #140 family)

## 1. Results

| Gate | Result |
| --- | --- |
| `enc160-hbenc` (Hyper Beam recharge + Encore) | **FAIL → PASS**. Pre-fix first divergence: turn 2, index 0. The port drew `GetMoveTarget` for the recharging SNORLAX; the ROM's first draw is WOBBUFFET's `accuracycheck`. 6 / 6 turns now match on draws, HP and dispatches |
| `enc160-c2ice` (Ice Ball + Encore, census 771 shape) | **FAIL → PASS**. Pre-fix first divergence: turn 3, index 1 (the ROM's draw there is SEALEO's `accuracycheck`). 20 / 20 turns now match |
| `enc160-fpenc` (control: Focus Punch, no lock) | PASS → PASS. It takes the `:111-117` Encore arm and pays `GetMoveTarget` either way |
| rcp154 C1 / C1f / C2 / C2u; rcp143 R1 / R2 / R3 / R3-control; R4 (`verify-rcp143-r4.ts`) | all PASS |
| ROM receipts | rebuilt from fresh Scene OFF runs, twice per card, byte-identical. Every ROM / evidence field equals audit aud159's receipt; only the card path, and so the probe-output sha, differ |
| Census 0..999 (Scene ON, `ret88Census.sh`), base `sub157/census-base-on` @ `bbd9c6748` | **1 battle changed: 771**. Commands 27,261 → 27,207, all from 771 (99 → 45). Played / terminal / stalled / errors / renderThrows identical (1000 / 997 / 3 / 0 / 0); only shard 7's digest moved |
| Soak vanilla 0:20 `--parallel 10` | see §3 |
| Tests | `tests/enc160Receipts.test.ts`, 11 tests. Without the guard, 3 fail (the hbenc / c2ice replays and the staged lock test) |

## 2. The fix

Source order in `HandleAction_UseMove` (`battle_util.c:99-138`): the STATUS2_MULTIPLETURNS / STATUS2_RECHARGE locked arm
(`:107-110`) comes BEFORE the Encore arms (`:111-128`). The locked arm sets `gCurrentMove = gLockedMoves[attacker]` and
makes no `GetMoveTarget` call. `Cmd_trysetencore` (`battle_script_commands.c:8017`) never checks for a lock, so a battler in
Thrash / Rollout / Ice Ball / Uproar / Bide or on a recharge turn can be Encored. On every later locked turn the locked arm
wins.

`factoryBattleScriptFullTurnDecision.ts` `actionRetargetsAtExecution` read the turn-start Encore with no lock guard, and
its comment wrongly said "a locked battler carries no Encore". It now returns `false` when
`battlerStatusMoveLock(preClearRulesContext, battler) !== 0`. The two action-time arms already had the guard:
`actionEncoreArm` and `actionTakesChosenMoveChangedArm`. If a faster foe clears the lock mid-turn (sleep or freeze runs
`CancelMultiTurnMoves`), the action-time `actionEncoreArm` still takes the Encore arm and draws.

Tooling changes this needed (no gameplay effect):

- `verify-rcp154.ts` now stages the active battler's `level`. This uses a new optional `FactoryFullTurnBattlerConfig.level`,
  default 50. Before this, c2ice's L10 SEALEO was staged at L50 and turn 1 HP diverged. No production caller sets the
  field: `factoryBattleStart` builds its state from the rules context, and the adapters' object literals carry no `level`.
- `verify-rcp154.ts` now counts `STRINGID_PKMNMUSTRECHARGE` as a `HandleAction_UseMove` dispatch announcement, next to
  `STRINGID_USEDMOVE`. A recharge turn dispatches the Hyper Beam script and stops at attackcanceler. The port's messages
  already matched the ROM's.

## 3. Ripple

- **Census battle 771** (QUILAVA / MINUN / … vs SEALEO): command idx 6 is MINUN's ENCORE landing on the ICE BALL-locked
  SEALEO; idx 7–9 (SEALEO ICE BALL, MINUN CHARM, SEALEO ICE BALL) are identical. A scratch tree that logs every guard hit
  (`/tmp/enc160/val/trace-tree`, run alone with `--seeds=771..771 --index-from=771`) reproduces head's 771 exactly
  (45 / 45 records). It hits twice, both SEALEO (`status2 0x1000` = MULTIPLETURNS, encoredMove 301 ICE BALL, timer 2
  then 1). Those are the next two locked + Encored turns. The guard is the only behavioural difference between base and
  head, so the first hit is the first RNG divergence: pre-fix, the port paid an extra `GetMoveTarget` draw. The shift first
  shows at idx 10 (QUILAVA's AI choice, SWIFT → FURY SWIPES).
- **0 unattributed battles.**
- Soak vanilla 0:20 `--parallel 10`: SOAK_RESULT_PLACEHOLDER

## 4. Receipts and cards

| Receipt (`tools/probe/receipts/`) | Card / spec (`tools/probe/rcp154/`) | Probe args |
| --- | --- | --- |
| `enc160-hbenc-hyperbeam-recharge-encore-off.json` | `enc160-hbenc-hyperbeam-recharge-encore-off.json` / `enc160-hbenc-spec.json` | `--slot-plan 0 --attribute 0:2404` |
| `enc160-c2ice-iceball-encore-census771-off.json` | `enc160-c2ice-iceball-encore-census771-off.json` / `enc160-c2ice-spec.json` | `--slot-plan 0,1 --attribute 0:9028` |
| `enc160-fpenc-focuspunch-encore-off.json` | `enc160-fpenc-focuspunch-encore-off.json` / `enc160-fpenc-spec.json` | `--slot-plan 1,0 --attribute 0:2404` |

Each spec's `portSitesAtHead.preFix` records the pre-fix verdict and first divergence. The receipts' `port` /
`comparison` / `predictedPostFix` fields were folded with `verify-rcp154.ts --write` after the fix.

## 5. Not done / notes

- Thrash / Outrage / Petal Dance, Uproar, Bide and a two-turn charge move (Solar Beam / Razor Wind / Skull Bash / Sky
  Attack) + Encore have no ROM card of their own. They share the same `battlerStatusMoveLock` predicate, so the fix covers
  them by construction.
- The turn-start `clearOverwrittenEncoreAtAction` hoist does not consult the lock. In source, a locked battler whose
  Encored slot was overwritten keeps its Encore until an unlocked action takes the `:119-128` arm. Overwriting a slot
  needs Mimic / Sketch / Transform on a locked + Encored battler. This is unprobed and not changed here.

## 6. Reproduce

```sh
C=tools/probe/rcp154; R=tools/probe/receipts
python3 tools/run-mgba-probe.py /tmp/hb1.json -- python3 tools/probe/probe-rcp154-action-time.py \
  $C/enc160-hbenc-hyperbeam-recharge-encore-off.json /tmp/hb1.json --slot-plan 0 --attribute 0:2404   # twice -> hb2
python3 tools/probe/build-rcp154-receipt.py $C/enc160-hbenc-spec.json /tmp/hb1.json /tmp/hb2.json $R/enc160-hbenc-hyperbeam-recharge-encore-off.json
node --experimental-strip-types tools/probe/verify-rcp154.ts $R/enc160-hbenc-hyperbeam-recharge-encore-off.json [--write]
sh tools/integration/ret88Census.sh shards <fresh-dir> HEAD     # base: .integration/validation/sub157/census-base-on (bbd9c6748)
npx vitest run tests/enc160Receipts.test.ts tests/rcp154Receipts.test.ts tests/act156ActionTimeFixes.test.ts tests/rcp143Receipts.test.ts
```
