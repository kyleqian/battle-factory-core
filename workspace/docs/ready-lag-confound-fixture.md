# Ready-lag confound-closing fixture: real `factoryLegal`, low `dispatchDelay` (side lane, 2026-08-14)

**Headline:** `factoryLegal` low-dispatch route: oracle ready = **1810**,
pre-fix predicted = **1806**, residual **+4**.

This is the sixth row for `docs/ready-lag-discriminator-scout.md`'s table and
the fixture that dossier's §4 named as the confound-closer: every previously
confirmed `dispatchDelay(opponent) < 101` data point (TANGELA/silver Noland
reveal, PUPITAR/DELCATTY mechanicLab probe) was *also* built through
`overrides.parties`, so "low dispatchDelay" and "override-constructed" were
never tested independently. This fixture is a **real, unstaged `factoryLegal`
rental-generation route** (no `overrides.parties` anywhere) whose opponent
lead happens to have `dispatchDelay < 101` in the wild.

## Tuple

Found via the dossier's own §4/round-6 technique: brute-force
`generateFactoryOpponent` (`src/engine/factoryOpponentGeneration.ts`) at
`factoryWinStreak:0, battleIndex:0, storedTrainerIds:[],
savedRentalSetIds:[110,130,150,115,135,145]` (the same recipe
`docs/intro-cry-shadow-evidence.md` Part 2 used for the MAGNETON tuple) over
`rngValue` 1..20000, stopping at the first opponent lead with
`cryDurationTicks < 58` (`= cryDurationTicks(GROVYLE)`, the exact
`dispatchDelay < 101` boundary). The very first seed tried (`rngValue=1`)
already qualified — low-dispatch species are common, not rare, once
override-construction stops being required to reach one.

```json
{
  "mode": "factoryLegal",
  "trainerId": 38,
  "challengeNum": 0,
  "battleNum": 0,
  "playerSetIds": [110, 130, 150],
  "opponentSetIds": [165, 198, 129],
  "seed": 1
}
```

- **Trainer:** 38, `FRONTIER_TRAINER_QUINN`, class `FACILITY_CLASS_POKEFAN_M`
  ("POKéFAN QUINN").
- **Opponent lead:** WEEPINBELL (species id 70, set id 165), cry **42t**.
  Full opponent party: WEEPINBELL/MASQUERAIN/SKIPLOOM.
- **Player lead:** GRIMER (species id 88, set id 110, same
  `playerSetIds=[110,130,150]` as the already-committed
  `factory-arbitrary-intro-yoshi-off.json`), cry **30t**. Full player party:
  GRIMER/NUZLEAF/NOSEPASS.
- **Legality:** enforced by the oracle itself (species/item-duplicate and
  challenge-0/rank-0 range rules), not asserted by the brute-force script.
  `bin/oracle lab` on the committed fixture returns no error and echoes
  `opponent[0].species=70` (WEEPINBELL) / `player[0].species=88` (GRIMER) —
  confirms the tuple is real-generation-legal. (The freshness/staleness
  script may FAIL this fixture as "stale" — known false positive per this
  step's brief, not evidence of a problem.)

Fixture file: `tools/battle-lab/factory-readylag-lowdispatch-legal-off.json`
(`preCheckpointCaptureAllFrames: true`, 2007 pre-checkpoint frames — same
size class as the GRIMER/YOSHI, KADABRA/SHIZUKA, DELCATTY/MAGNETON, and
PUPITAR/DELCATTY-mechanicLab-probe fixtures already in
`docs/ready-lag-discriminator-scout.md`'s table).

## Measurement

`dispatchDelay(WEEPINBELL) = 101 + (cryDurationTicks(WEEPINBELL=42) -
cryDurationTicks(GROVYLE=58)) = 85` — **below the 101 baseline**, the same
regime as both existing +7 fixtures (TANGELA 86, PUPITAR 67), and
coincidentally almost identical to TANGELA's own 86.

Three timing anchors, all directly measured against a dense
`preCheckpointCaptureAllFrames:true` oracle run (`bin/oracle lab` against the
committed fixture, :8014, `battle-scene-off` profile):

| Anchor | Frame | Method |
| --- | --- | --- |
| `handoffTick` | **1580** | Message box printing "POKéFAN QUINN sent / out WEEPINBELL!" reaches its last glyph ("!") at frame 1577 (frame 1576 shows "...WEEPINBELL" with no "!", frame 1577 shows the "!"). Frames 1577-1579 are then pixel-identical (`SENDOUT_HANDOFF_LAG=3`, `battleScene.ts:3329`), and frame 1580 is the first frame of the post-text handoff's large pixel jump (1014 changed pixels vs. 0 the frame before) — matches `sendOutHandoffTick`'s own source-cited definition (`battleScene.ts:3334-3340`) exactly: text-complete + 3. |
| `throwVisibleTick` | **1678** | Cross-confirmed by two independent frame-image landmarks, both falling exactly where the formula predicts from `handoffTick` alone (not independently pixel-hunted): frame 1665 (`= handoffTick 1580 + dispatchDelay 85`) is the first frame of "Go! GRIMER!" printing (message box just cleared, showing "G"); frame 1678 (`= 1665 + visualLag 13`) is the first frame the player's own trainer sprite appears in its throw pose. Both land exactly on the predicted tick, not off by even one frame — strong corroboration that `handoffTick=1580` and `dispatchDelay=85` are both correct. |
| `oracleReadyTick` | **1810** | First `preCheckpointCaptures` frame with `state.engine.playerControllerCommand===18 && state.engine.controllerExecFlags===1` (the same semantic ready-gate predicate `tools/probe/probe-overrides-ready-lag.ts` and `docs/trainer-pic-off-window-scout.md` §A use). 197 consecutive frames (1810-2006) all satisfy it — a clean, unambiguous first transition, not a blink-phase false hit. |

Pre-fix formula prediction (`generatedBattleStartCommandReady`,
`src/engine/battleScene.ts:4590-4600`, current master in this worktree —
this step deliberately ran against the PRE-fix formula per the brief):

```
predictedReady = throwVisibleTick + GENERATED_PLAYER_READY_LAG_BASELINE(98) + cryDurationTicks(GRIMER=30)
                = 1678 + 98 + 30
                = 1806
```

**Residual = oracleReadyTick − predictedReady = 1810 − 1806 = +4.**

## Verdict

Neither of the dossier's two live hypotheses predicted +4 exactly:

- The pure `dispatchDelay(opponent) < 101` hypothesis (§4a/§4b) predicted a
  flat **+7** late-fire for any `dispatchDelay < 101` fixture, override or
  not. This fixture has `dispatchDelay=85` — almost identical to TANGELA's
  86 — but residual **+4**, not +7. **The flat +7 does not survive
  construction-route-independently**, weakening the "regime is the whole
  story" reading.
- The override-family confound (also named in §3/§4) predicted **0** for any
  real, unstaged `factoryLegal` route regardless of `dispatchDelay` (since
  all three previously-confirmed 0-residual fixtures were real generation).
  This fixture is real generation too, but residual is **+4**, not 0.
  **The confound is not simply "override presence" either.**

So this fixture rules out both of the dossier's clean binary stories: the
+7 is not a species-independent flat regime constant, and "real generation
always nets 0 / any override always adds the correction" is also false. The
data now spans three residuals across the two known
`dispatchDelay<101`-adjacent points and this one: **0** (three
`dispatchDelay>=101` fixtures), **+4** (this fixture, `dispatchDelay=85`,
real generation), **+7** (TANGELA `dispatchDelay=86` and PUPITAR
`dispatchDelay=67`, both override-constructed) — consistent with a
**construction-route-dependent** correction (override vs. real generation
changes the residual at a similar `dispatchDelay`) rather than a pure
formula-regime constant, but with only one real-generation low-dispatch data
point, this is not yet triangulated to a specific rule (e.g. whether it
scales with `dispatchDelay` itself, given WEEPINBELL's 85 landed at +4 while
PUPITAR's considerably lower 67 landed at +7). Left for whoever picks up the
fix next — per this step's brief, either sign of result was the deliverable,
and the honest result is a **non-zero, non-+7 residual**, which is itself
informative: it reopens the construction-route question the morning's
`overrides-ready-lag-probe.md` seemed to close, since that probe only ever
tested "does staging shift timing when the party content is held fixed",
not "does dispatchDelay<101 recur identically across override vs. real
generation at the same dispatchDelay."

## Reproduce

Ran twice this session; both the oracle-side measurement and the arithmetic
below reproduced byte-identical.

```sh
# 1. Oracle-side: reproduces oracleReadyTick=1810 (and legality/species echo)
bin/oracle lab tools/battle-lab/factory-readylag-lowdispatch-legal-off.json -o /tmp/lab-readylag-lowdispatch

# 2. App-formula side: reproduces dispatchDelay/predictedReady/residual from
#    the cited oracle anchors above (read-only, no oracle calls)
node --experimental-strip-types tools/probe/probe-readylag-lowdispatch-legal.ts
```

Run 1 (`probe-readylag-lowdispatch-legal.ts`):

```
RESULT: factoryLegal low-dispatch route: oracle ready = 1810, pre-fix predicted = 1806, residual +4
```

Run 2 (identical):

```
RESULT: factoryLegal low-dispatch route: oracle ready = 1810, pre-fix predicted = 1806, residual +4
```

`bin/oracle lab` re-run independently a second time against the committed
fixture also reproduced `oracleReadyTick=1810` and the same echoed species
(`opponent=[70,312,188]`, `player=[88,299,320]`).
