# battleScene.ts canonical split — partition & design

**Status: PLAN ONLY. Nothing moves in this program.** `src/engine/battleScene.ts`
stays exactly as committed. This doc decides the cut line; the next step makes
the cut. All numbers below are produced by
`tools/report/battlescene-split-partition.ts` (a re-runnable generator in the
`tools/report/` idiom), run twice on this tree with byte-identical output.

- Run commit: master `2520322b`. `battleScene.ts`/`core.ts` were unchanged
  between `c70031cf` (session start) and `2520322b` (session end, after a
  concurrent side-lane merge), so the partition is valid for both; the
  numbers were re-verified byte-identical on `2520322b`.
- Rerun: `node --experimental-strip-types tools/report/battlescene-split-partition.ts`
- Determinism: two consecutive runs produced identical output (diff empty).

## 1. The three buckets (symbols AND lines)

`battleScene.ts` is **36,898 lines**. It has **1,225 top-level symbols**:
448 functions, 730 const/let, 36 interfaces, 11 types — across **280 top-level
`export` declarations** (two of those are destructured pairs, so 280
declarations bind 282 exported symbols). 199 of the 448 functions are named
after a specific turn of the ONE recorded canonical battle (`turn10OnixDarkPalette`,
`drawTurn2KickoffText`, …) — the retained pixel ground truth.

| Bucket | Symbols | Declaration lines | What it is |
| --- | --- | --- | --- |
| **LIVE** | **248** | **20,588** | Reachable from the generated-orchestrator route: the transitive closure of what the 5 live engine files import from `battleScene.ts`, minus the canonical entry points and anything reachable only from them. |
| **CANONICAL** | **572** | **5,302** | Reachable from the canonical entry points (`renderBattleScene`, `advanceBattleScene`, `INITIAL_BATTLE_SCENE_STATE`, `BattleSceneState`) and/or only from `tests/`+`tools/probe/`, and NOT from the generated route. Includes the 2-symbol residual below. |
| **SHARED** | **405** | **3,131** | Genuinely reachable from both routes. Reported in full by the script; see §2. |
| *(residual)* | *(2)* | *(2)* | `BALL_WIDGETS_SETTLED_TICK`, `TURN5_SITRUS_RING_RENDER_LAG` — reachable from **no** entry surface (see §4). Folded into CANONICAL so the three buckets account for every symbol. |

**Reconciliation: 248 + 572 + 405 = 1,225 == the file's own top-level symbol
count.** The script asserts this every run (`RECONCILED`).

The 5,302 canonical lines sit in **570 canonical-only symbols**, of which **322
are dependency leaves** (reference no other canonical-only symbol) and **281
are self-contained literals** (reference no file-internal symbol at all) — the
safe first-move pool. See §6.

## 2. The SHARED bucket — the entangled set, reported, not hidden

SHARED is the whole difficulty of this task, so it is printed in full by the
script and summarized here. **405 symbols / 3,131 lines** sit in both the live
closure and the canonical closure. Its composition is dominated by *shared
infrastructure*, not by turn-specific logic:

- asset/data constants (`battleBg`, `ballDisplay`, `frontierTrainerPicBySymbol`,
  `menuHealthboxPlayer`, the `*Asset` interface family, ball/sprite/particle
  tilesets and corners);
- generic draw primitives (`drawSpriteSheet`, `drawTileBg`, `drawMessageTextLines`,
  `drawFightSubmenuChromeFromLatest`, healthbox compositors);
- cross-route state/types (`BattleSceneState`, `FightSubmenuState`,
  `LatestCompletedCommandHandoff`, `CLOSED_FIGHT_SUBMENU_STATE`);
- 71 turn-named symbols that both routes genuinely consume — the same
  `TURN13_SWITCHIN` / `turn5SitrusRingMatrix`-class helpers drive the canonical
  replay *and* the generic `renderSceneOffTurnView`/staged scenarios.

**The decisive finding — the cut is clean.** The script computes a
bucket-acyclicity validation: *no LIVE or SHARED symbol references a
CANONICAL-only symbol*. It reports **CLEAN — 0 leaked edges**. The dependency
structure is strictly downward:

```
CANONICAL  ──references──▶  SHARED ──references──▶ LIVE
(never the reverse; CANONICAL-only ↛ SHARED/LIVE is the only prohibited edge,
 and it does not exist)
```

Consequence: moving CANONICAL into its own file is a pure one-way move. The new
file imports its dependencies (SHARED/LIVE) from `battleScene.ts`; `battleScene.ts`
never needs to import back, so **no module cycle** is created and the pixel
surface cannot change by construction. The SHARED bucket is *large* but it is
large in the harmless direction: it stays in `battleScene.ts` and is imported
by both sides. This is not a "cannot be cleanly split" outcome.

Limitation (documented per the acceptance): the reachability pass is
identifier-based (a symbol references every universe name that appears as a
whole word in its own declaration text), so it can over-approximate on
same-named locals and string/comment mentions. That can only inflate closures
— hence the SHARED count of 405 is an *upper bound* on the true dual-need set,
and the CANONICAL/LIVE counts are correspondingly pessimistic. It never shrinks
a bucket, so no symbol is wrongly classified as *movable* when it is actually
needed; the worst case is a few extra symbols staying behind in `battleScene.ts`.

## 3. Proposed target file

**One file: `src/engine/battleSceneCanonical.ts`.**

Justification: the 570 canonical-only symbols are one coherent unit — the
recorded canonical battle's replay renderer (its four entry points, the 199
turn functions, and their private constants). They already cross-reference
across turn ranges (turn-13 windows reuse turn-5 healthbox factories; the
switch-in/send-out clusters share clocks), so splitting by turn range
(`battleSceneCanonicalTurns1to8.ts`, `…9to17.ts`) would fight the existing
structure and manufacture an import web *between* the pieces. A single file of
~5,300 lines is well within the range this codebase already carries, keeps the
whole ground-truth replay in one diffable place, and gives the slice plan a
single final cut: move the cluster, flip the entry-point import in `core.ts`.

## 4. Honest scope statement — read this twice

**This is a move within the same module graph, not a dead-code removal.**
After the split, `core.ts` imports the canonical entry points from
`battleSceneCanonical.ts` instead of from `battleScene.ts`; `battleScene.ts`
drops the 570 canonical symbols. The canonical code therefore **STILL SHIPS in
the production bundle** — it is just in a different file. The 199 turn
functions remain executable ground truth for the committed
`"appRoute": "canonical-recorded"` comparison traces.

This program does **not** deliver a bundle-size win. Removing the canonical
code from the production bundle would additionally require making the
canonical branch *injectable* (the `appRoute === "canonical-recorded"` branch
constructed in `core.ts` is hard-wired, not dependency-injected) and pruning
the ~46 files that import from `battleScene.ts`. **Neither is this program.**
If a future program wants the bundle win, this split is the enabling first
step for it — nothing more.

The two-symbol residual (`BALL_WIDGETS_SETTLED_TICK`, `TURN5_SITRUS_RING_RENDER_LAG`)
is not part of any route today. `TURN5_SITRUS_RING_RENDER_LAG` is only
referenced by the module-eval invariant guard at `battleScene.ts:10318` (which
asserts the 1-tick asymmetry against `ONIX_SITRUS_ROTATE_RENDER_LAG`); that
guard is the file's *only* top-level executable statement and must travel with
the constant it pins. `BALL_WIDGETS_SETTLED_TICK` is referenced nowhere. Both
move with the canonical cluster; neither is deleted.

## 5. Standing acceptance for every future slice

A pure move must not move a pixel. Every slice in §6 must pass, on a clean
tree, `npm run typecheck` (exit 0), `npm run build` (exit 0), and the
app-vs-app differential against the pre-slice parent:

```sh
npm run compare:differential -- turn1-rockslide-off turn2-dragonbreath-off \
  turn5-faint turn5-switchin turn13-dragonbreath-faint turn15-fly-strike \
  battle-command-generated-off --base <clean parent sha> --summary
```

`--base` is the commit the slice starts from (the parent of the move commit).
The seven trace names above were verified to resolve in
`tools/compare/traces/` on this tree; **one was corrected from the draft**:
`turn1-rockslide` → `turn1-rockslide-off` (only the `-off` trace exists;
`resolveCompareTracePath` would throw on the bare name). The other six were
already exact. The differential is app-vs-app (no oracle), so the legacy
traces without `oracleProfile` are still valid replay targets — PROGRESS #997
ran the same shapes byte-identical (3055/3055).

## 6. Slice plan — smallest and safest first

Every slice below keeps `battleScene.ts` re-exporting the moved symbol
(`export { X } from "./battleSceneCanonical.ts"`) so no caller changes until
the final slice. The move is a text cut: body deleted from `battleScene.ts`,
pasted verbatim into the canonical file. Module-eval guards travel with their
constants.

- **Slice 1 — scaffold + the unreachable pair.** Create
  `battleSceneCanonical.ts`; move `BALL_WIDGETS_SETTLED_TICK`,
  `TURN5_SITRUS_RING_RENDER_LAG`, and the line-10318 invariant guard (it pins
  the latter). Zero callers exist, so the only risk is the scaffold itself.
  Acceptance: §5 commands. **This also lands the one top-level executable
  statement the file has, proving the move machinery handles them.**

- **Slice 2 — the 281 self-contained literal constants.** The exact list is
  emitted by the partition script's "zero-ref leaves" set (representative:
  `GROVYLE_CORNER`, `TURN10_AERIALACE_LINE1`, `ROCK_SLIDE_MOVE_POWER`,
  `PARTICLE_OAM_PRIORITY`, `INITIAL_BATTLE_SCENE_STATE`, …). These reference no
  file-internal symbol, so a cut-and-paste move cannot change any value they
  depend on. Acceptance: §5 commands.

- **Slice 3 — the remaining 41 canonical-only leaves** (referencing only
  SHARED/LIVE symbols that stay in `battleScene.ts`). The new file imports
  those dependencies from `./battleScene.ts`. Acceptance: §5 commands.

- **Slice 4 — the 248 non-leaf canonical-only symbols**, in topological batches
  (all of a batch's canonical-only dependencies already moved). Mechanical
  batch selection is exactly what the script's adjacency makes possible; a
  batch is ~50 symbols. Acceptance: §5 commands per batch.

- **Final slice — entry-point flip + caller migration.** `core.ts` imports the
  four entry points from `battleSceneCanonical.ts`; the ~31 test files, 9
  `tools/probe/` files, and remaining 4 engine files update their import paths
  from `./battleScene.ts` to `./battleSceneCanonical.ts` for the symbols they
  take; the re-exports are dropped. Acceptance: §5 commands plus the full
  `npm test` (the earlier slices need only `npm run test:smoke` + the
  differential, since no import path changes).

If any slice regresses the differential, the slice is reverted wholesale — a
pure move has no partial-correct state.

## 7. Hazards (call-outs, not drive-bys)

1. **`tests/animation/animationBoundaryRatchet.test.ts` pins the
   engine/animation import boundary from BOTH sides.** (a) `src/animation` may
   only import from the three pinned shared-infra engine modules; (b) only
   `src/engine/battleScene.ts` and `src/engine/core.ts` may consume
   `src/animation/`. The canonical cluster demonstrably uses animation
   presentation helpers (`onixSitrusRotateMatrix`/`turn5SitrusRingMatrix` →
   `../animation/heldItemHeal.ts`, plus the feather/dragon/… helpers), so
   **the new `src/engine/battleSceneCanonical.ts` cannot import `../animation/*`
   without tripping the ratchet.** Resolution options, in recommended order:
   re-export the needed animation helpers through `battleScene.ts` (it is
   already an allowed consumer) so the canonical file only imports
   `./battleScene.ts`; or, if the supervisor prefers direct imports, widen the
   ratchet's `allowedConsumers` to include `battleSceneCanonical.ts` — that is
   a **cross-program decision, not a drive-by** this step may take.

2. **~46 files import from `battleScene.ts` and must be updated when symbols
   move.** Measured: 31 files under `tests/`, 9 under `tools/probe/`, and the
   5 engine files (`core.ts`, `summaryInfoPage.ts`, `factoryBattleStartIntro.ts`,
   `factoryRoundBattleOrchestrator.ts`, `stagedBattleTurn.ts`). The ratchet test
   file itself references the path string but does not import. These import
   paths change only in the final slice (§6), where `npm test` re-verifies them.

## 8. Verification notes — measured vs. the step brief

The brief's stated facts were re-derived and mostly confirmed. Two are
corrected, one trace name corrected:

- **`summaryInfoPage.ts` imports 1 symbol from `battleScene.ts`
  (`drawSpriteSheetAffineRotate`), not 8.** The live engine import surface is
  44 total / 43 unique symbols (core 34, summaryInfoPage 1, factoryBattleStartIntro 5,
  factoryRoundBattleOrchestrator 2, stagedBattleTurn 2), not 51.
- **The importing-file count is 46, not 54**: 31 tests + 9 probe + 5 engine +
  1 ratchet path-string reference.
- `280 export declarations` confirmed (282 exported symbols via 2 destructured
  declarations); `199/448` turn-named functions confirmed; `36,897`→`36,898`
  lines (trailing newline accounting).
- Trace `turn1-rockslide` corrected to `turn1-rockslide-off` (see §5).

One further nuance the mechanical definition cannot remove, reported honestly:
**15 LIVE symbols are turn-named**, e.g. `TURN14_DRAGONBREATH_MENU_REDRAW_DELAY`,
`turn15KoDismissEligible`, `applyTurn17PostwinFastFade`. These are canonical-window
constants that `core.ts` imports *directly* (outside the four named entry
points), so the brief's mechanical rule puts them in the generated-route
closure. They are not generated-route content; when the move happens they are
candidates to stay as `core.ts`'s direct imports or be re-pointed — a review
item for the final slice, not a blocker.
