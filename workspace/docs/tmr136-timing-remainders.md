# tmr136 (S10A, integration): two Scene ON timing remainders — the live Double Team stats-change tail (ISSUES #166) and Smokescreen's first-use phase (D4)

Base: `5c170e32f` (production src `58fa6ec74`). Presentation only: no kernel, RNG, damage, turn order or facility change; the status-animation
plumbing, the order host and the allocator are untouched. A live adapter is not whole-playable arbitrary-history exactness.

## 1. Results

| Item | Result | Evidence |
|---|---|---|
| **(A) Double Team tail** | **Landed: + 9 rows.** `liveMoveAnimation.ts` case 104 = 230 + `LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS` (9) = **239**. Ages 230..238 are the General_StatsChange's rel 69..77 (the field after the banner, the ROM's next instruction on rel 77); the DT reducer is unchanged, so every existing body row (-1..229) is byte-identical. The following message now starts on window age 239 = rel 78, the ROM's box-change row (was 230 = rel 69, 9 rows early). The Substitute swap composite frames the ROM body (`LIVE_SUBSTITUTE_SWAP_BODY_FRAMING` 159 rows) and is unchanged (244 / 240). Scene OFF has no live DT body (byte-identical) | `tools/integration/fixtures/tmr136/dt-tail/*.json`: **12 / 12 dense windows** (6 dt60 scenarios = 6 species pairs, both sides, both DT bodies each; tmr136Probe.py r1 == r2 6 / 6, per-row digests r1 == r2 12 / 12): body rows -1..229 **0 px**, the **9 added rows 0 px** each, ROM's first box change on age **239** in 12 / 12 (bbox inside the message box, rows 124..149) |
| **(B) Smokescreen 108** | **Landed: faithful timing (D4), use-keyed.** `liveMoveTimingPolicy.ts` 108: `optional-lag-age` 49 with a new `use` key: the battle's first Smokescreen 15 : 1 -> no lag (**124 rows**), later ones 1 : 7 -> lag (**125**). In the no-lag phase rows >= 49 render age + 1 (`liveSmokescreenAheadFromAge`). Unknown use -> the status quo 125 | `tools/integration/fixtures/tmr136/smoke-final.json`: aud129's 16 Smokescreen scenarios re-probed (direct mGBA, two fresh probes per scenario inside the checker): **24 / 24 r1 == r2; the 22 policy-phase windows 0 px** (15 first-use 124-row + 7 later 125-row); the 2 other-phase windows only on rows 49..122 (74 rows, 83,292 px, max 1,283 px/row). **Revert** (`smoke-revert.json`, use withheld = production's previous fixed 125): 16 windows in the other phase |
| **(B) use-count source** | **The Scene ON x2 history host** (`liveBattlerX2History.ts`): it already is a per-battle (`battleCallStart`-scoped) fold of the battle's own kernel semantic events with the orchestrator's cursor discipline (advanced strictly before a body's own event). It now also counts the MOVE_ANIMATION bodies of the use-keyed moves (`moveUses`); `liveMoveBattlerX2InputForBody` gives a Smokescreen body `moveUse` = earlier bodies + 1 (any battler). Unseen events (`invalidateLiveBattlerX2Host(.., eventsUnseen)`, an undrained previous resolution) -> `moveUsesUnknown` -> no `moveUse` -> 125. Render-pure and replay-deterministic (a fold of presented history; no RNG, no gameplay state; reset / replay recreate the same host). Why this host: the order host is out of scope (and its `firstBody` is the battle's first presentation unit, not the move's use; aud129 showed the split is not that class), and the x2 host is the only per-battle presentation fold whose input already reaches both the duration (`state.liveMoveBattlerX2Input`) and the renderer (`battlerX2Input`) | `tests/tmr136TimingRemainders.test.ts` (host fold, replay, invalidation, route seed 4) |
| **Accounting** | Smokescreen moves from scoped exact to faithful timing: **237 + 13 + 26 -> 236 + 13 + 27 + 0 + 0 = 276** (`remainingAdaptersCensus.mjs`: live 85.07 %, faithful timing 10.60 %). `implementedCount` 238 -> 237 (incl. Struggle) | `docs/animation-integration-live-status.json`, `docs/remaining-adapters-census.md`, `tools/integration/fixtures/remaining-adapters-census.json` |
| Route | seed 4 (player KOFFING Smokescreen x 3): presented rows 130 / 130 / 130 -> **129** / 130 / 130; Scene ON / OFF boundaries, rules, RNG, facility equal | test "ordinary route seed 4" |

## 2. (A) detail

- ROM row model (sc106 §2, dt60): DT activation = age 0 (dense windows start at activation, ageOffset -1); the script ends on 158; the stats change's
  `gAnimScriptActive` rises on age 161 (rel 0); its first inactive frame is rel 75 (E); the ROM's next script instruction runs on rel 77 and the box
  changes on rel 78 = **age 239** (measured: `romGlyphAge` 239 in 12 / 12, the frame-to-frame diff after the tail).
- Fix shape: the window holds the extra rows (choice (1) of sc106 §2 / scf117 §6), not a separate command and not the trimmed window: the existing DT
  body rows stay byte-identical (same reducer, same ages), and no DT pin other than the window length / following message moves.
- `tmr136Probe.py` is `prep48Probe.py` with a 12-frame tail (so the window reaches rel 87); `tmr136DtTail.ts` replays dt60Check.ts's lend chain and renders
  every age -1 .. D - 1 through `renderBattleResolutionLiveView`.

## 3. (B) detail

- Mechanism (aud129 §2): `AnimBlackSmoke_Step` (`invisible ^= 1` and the x2 drift every frame, 75 frames) runs one frame ahead from row 49 in the
  124-row phase; every row before 49 is the same in both phases (shift proof `aud129-shift-base.txt`: ROM rows 49..123 == ages 50..124, 0 px, 16 / 16).
  The source cause of the first-use dependence (CPU work around SmokescreenImpact's sheet load near row 48) is not identified; the key is measured.
- Production: `liveMoveAnimationDuration(request, field, bodyClass, moveUse)` (new optional 4th parameter; case 108 = `liveMoveTimingBodyRows(108,
  .., liveMoveTimingUseOf(moveUse)) ?? 125`); `battleResolutionPresentationRender.ts` passes `state.liveMoveBattlerX2Input?.moveUse` to the command
  duration and the universal-row clamp; `liveMoveAnimationPresentation` maps age >= 49 to age + 1 in the no-lag phase.
- Other-phase windows (D4: retained, quantified): `pb-aud129-wide-109-108-169-103-c1` (first use, ROM 125 rows) and
  `pb-aud129-phase-smokescreen-opp-s1-c3` (second use, ROM 124 rows): rows 49..122 only, 83,292 px each.
- Census exposure (aud129, seeds 0..999 on `a4ab64cb9`): 66 first-use live Smokescreen commands / 8,580 frames were in the minority phase.

## 4. Pins moved (all timing, each exactly explained)

| File / test | Move | Why |
|---|---|---|
| `sc106StatsChangeCommand.test.ts` live DT route (seed 10 slot 2) | message 837 -> **846**, body -> message 230 -> **239**, route total + **54** (= 6 DT bodies x 9) | (A) |
| `sc106StatsChangeCommand.test.ts` DT doll fields | durations [230, 230, 244, 244] -> [**239, 239**, 244, 244] | (A); the composite is unchanged |
| `doll90DollCells.test.ts`, `substituteSwapAttdollCells.test.ts` | the doll-free DT adapter duration 230 -> 239 | (A); framing {159, -1} unchanged |
| `animation/liveDoubleTeamSides.test.ts` | duration 230 -> 239; route seed 3014 body ages 0..229 -> 0..238 | (A) |
| `animation/livePrep9MoveAdapters.test.ts` | DT duration [230, 230] -> [239, 239] (+ the ordinary-route ages) | (A) |
| `liveStatusImplementedCount.test.ts`, `animation/factoryAnimationInventory.test.ts`, `animation/fp100FocusPunchTiming.test.ts`, `animation/shp116ShadowPunchTiming.test.ts` | 237 + 13 + 26 -> 236 + 13 + 27; implementedCount 238 -> 237 | (B) accounting |

Pins were enumerated on the final tree (the DT / Smokescreen / accounting test sets first, then the full suite, §5).

## 5. Gates (final production code `af0fa717e`; later commits are docs / runner / receipt only)

Receipt: `tools/integration/fixtures/tmr136-live-receipt.json` (commit / src tree and every outcome).

- Targeted (4 workers): the Double Team test set (60 files) and the Smokescreen / accounting / x2 / policy set (95 files) green after the pin moves;
  `tests/tmr136TimingRemainders.test.ts` 9 / 9. `npm run typecheck` green; `npm run test:smoke` 448 / 448.
- Full suite, four shards x 4 workers: **1,648 files / 13,667 tests passed, 0 failed** (413 + 411 + 410 + 414 files; 44 files / 223 tests skipped).
- `npm run build`: green (887 modules).
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 5c170e32f`:
  fight-submenu 235 / 235 and battle1-postwin-next-prompt 216 / 216 **byte-identical** (canonical); the app-only presentation-rng trace 172 / 173:
  **one moved capture, frame 3622 (673 px)**. Against `d83d10655` (A only) the same trace is 173 / 173, so the moved capture is (A)'s Double Team
  window (B moves none). Its exact command was not localized inside the cap.
- **Census 0..999 base vs final: NOT RUN (time cap).** Expected from the evidence: every live DT command + 9 frames (the window), every first-use
  Smokescreen command - 1 frame (aud129: 66 commands / 66 frames on 0..999), 0 status changes, Scene OFF byte-identical (no live body in OFF).
  Command: `sh tools/integration/sar131Census.sh shards <fresh-base> 5c170e32f` and `... <fresh-final> <final-commit>`, then
  `python3 tools/integration/sar131CensusDelta.py <base> <final> <out.json>`.
- `git diff --check`: clean.
- `tmr136Run.sh` from a fresh git-archive copy of `a4cc57772`: probes r1 == r2 6 / 6, **ALL `same`** (6 DT tail receipts, smoke-derive / smoke-final / smoke-revert).

## 6. Reproduction (from workspace/)

```
sh tools/integration/tmr136Run.sh <fresh-out-dir-inside-the-repo>      # (A) 12 DT tail windows + (B) 24 Smokescreen windows final / revert; `same` vs banked
npx vitest run tests/tmr136TimingRemainders.test.ts
sh tools/integration/tmr136Probes.sh <out> <scenario.json>...            # dense direct-mGBA probes, r1 / r2
node --experimental-strip-types --no-warnings tools/integration/tmr136DtTail.ts tools/integration/fixtures/dt60/fixtures <scenario> <out> <out.json>
STF115_CHECK=tmr136SmokeCheck sh tools/integration/stf115Check.sh <fx-dir> . <fresh-check-dir>    # TMR136_USE=off: the revert experiment
python3 tools/integration/tmr136SmokeSummary.py <check-dir> <fx-dir> <out.json>
```
