# S10A d4later — first vs later body D4 phase (Sheer Cold / Extrasensory opponent), Sky Attack strike length

Base: master `2ac607535` (production src tree `503eb721`). Evidence banked by later58 (docs/next-adapters-later58.md). All counters
come from independent direct-mGBA `speciesAudit2Counters.py` processes (Scene ON), never from the shared HTTP oracles. Every scenario
carries an explicit lab `"seed"` (ISSUES #154) and ran twice fresh in one batch.

## Counter evidence (`tools/integration/d4laterCounters.{sh,py}` → `fixtures/d4later/counters.json`, 98 scenarios, 98/98 r0 == r1)

Each body is a maximal run of `gAnimScriptActive` frames for the move. A lag frame is one where the playTime main-loop pass counter does
not advance. The **first** body has no earlier animation run in the battle, the same rule as the order host's `firstBody`. Scenarios: the
later58 Sheer Cold / Extrasensory / Sky Attack scenarios, plus the accepted Extrasensory (6) and Sky Attack strike (8) lab scenarios.

| move, parameter | side | first bodies (lag : none) | later bodies (lag : none) | earlier banked |
|---|---|---|---|---|
| Sheer Cold 329, age 171 | opponent | 0 : 12 | **5 : 0** | issue151 5 : 11 (all first bodies: swapped-species attackers) |
| Sheer Cold 329, age 171 | player | 14 : 0 | 4 : 1 | issue151 13 : 2 |
| Extrasensory 326, task row 142 (counter age 141) | opponent | 3 : 4 (ALAKAZAM → GOLEM lags) | **11 : 0** | prep30 2 : 4, both sides, first bodies |
| Extrasensory 326 | player | 1 : 6 (prep30 ESPEON → CROBAT lags) | 8 : 3 (declines; out of scope) | |
| Sky Attack 143 STRIKE, age 161 | both | — (a strike always follows its charge) | 18 : 18 | — |

The split is dominant for each class, and for the opponent's later bodies it is clean: every one of them lags.

## Policy keys (`src/engine/liveMoveTimingPolicy.ts`)

- New optional field `body: "later"`. It applies to a known order-host lend that has no `firstBody`. A body-keyed parameter takes
  precedence over the unkeyed parameter of the same kind and side. Without a key, a parameter covers every other body. No lend, or an
  unknown one, counts as "first", which keeps the status quo.
- 329 `{ side: "opponent", body: "later" }`: lag 5 : 0 → event, 191 rows.
- 326 `{ side: "opponent", body: "later" }`: lag 11 : 0 → event, 162 rows.
- The first-body parameters are unchanged: issue151 / prep30 counts, and every one of those windows is a first body.
- The player Sheer Cold entry is unchanged (lag). The player later bodies (4 : 1) agree with it.
- 143 (strike): optional lag at 161, fixed lags 141 / 142, 178 iterations, 18 : 18. A tie, so the no-event phase applies (180 rows, the
  accepted strike). The renderer is unchanged. The duration reads `liveMoveTimingBodyRows(143)`.

The body class reaches the renderer by two paths:
- **Reducer:** `liveSheerColdInputs({ body })` sets `restoreFadeEndAge`; `liveExtrasensoryInputs({ lateLag })`.
- **Duration:** `battleResolutionCommandDuration(command, field, liveMoveTimingBodyOf(state.liveMoveSpriteOrderInput))` →
  `liveMoveAnimationDuration(request, field, bodyClass)`.

The harness follows the same rules. `liveAdapterFramebuffer` computes `expectedDuration` from the lend's class. `d4aTimingCheck` picks
the body-keyed parameter for the fixture's class.

Sky Attack: battle-first strike 5 : 12 against later strike 13 : 16 would be a per-move strike-count key. Production has no such key, and
this step does not add one.

## Windows (`d4aTimingCheck.ts`, production live renderer, two fresh probe runs each)

- later58 opponent windows, 32 (`fixtures/d4later/d4-timing-later58-opponent.json`):
  - All **16 later bodies** (5 Sheer Cold at 191 rows, 11 Extrasensory at 162) are in the policy phase: **0 px, twice fresh, duration =
    window**.
  - The 14 first bodies are unchanged: 12 at 0 px. The 2 ALAKAZAM → GOLEM first-body lag windows differ only on the documented rows
    143..158 (293,344 px).
- Sky Attack strikes, 11 (`fixtures/d4later/windows`):
  - The 8 accepted strikes (wrappers) and the later58 FEAROW → SHUCKLE player strike 1 are **0 px at 180 rows**.
  - The two 181-row strikes (FEAROW → SHUCKLE opponent strike 1, player strike 2) differ only on **ages 163..178** (294,896 / 303,888 px,
    ≤ 18,993 px/row). That is one fade step later, now documented in the live-status entry.
- Before d4later, the 16 later bodies rendered the other phase: Sheer Cold 274,160-288,128 px, Extrasensory 293,344-307,696 px, each on
  16 tail rows (`fixtures/later58/d4-timing-check.json`).

## Accounting

Sky Attack 143 moves from scoped exact to faithful timing: out of `LIVE_MOVE_ANIMATION_IDS`, into
`LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS`. The live-status entry moved in place. `remainingAdaptersCensus --write --doc`:
**240+13+23 → 239+13+24 = 276**.

## Reproduce

    export PYTHONPATH=../../vendor/libmgba-py
    L=tools/integration/fixtures/later58/scenarios
    sh tools/integration/d4laterCounters.sh /tmp/d4l 14 /tmp/d4l/counters.json $L/sheer-cold-*.json $L/extrasensory-*.json $L/sky-attack-*.json \
      tools/battle-lab/{prep25,prep30}-extrasensory-alt-*.json tools/battle-lab/mechanic-extrasensory-*.json <the 8 q2-live strike scenarios>
    POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts /tmp/d4l/opp.json \
      tools/integration/fixtures/later58/live/sheer-cold-opp-*.json tools/integration/fixtures/later58/live/extrasensory-opp-*.json
    POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts /tmp/d4l/sky.json tools/integration/fixtures/d4later/windows/*.json
    OUT=/tmp/d4a-all P=9 sh tools/integration/d4aRegressionAll.sh
    npx vitest run tests/animation/d4laterTiming.test.ts
