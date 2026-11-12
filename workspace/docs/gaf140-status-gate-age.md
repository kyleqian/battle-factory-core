# gaf140 (S10A, ISSUES #168 live defect): a gated status animation's age skips the IsBattleSEPlaying gate

Base: `361829128` (production src `11e979d67`). Fix commit `c0ede0b31` (production src `81aae6038`). **Pixels only**: no command,
frame, kernel, RNG, damage, turn-order or facility change (census identical, below).

The defect (found by sae135, docs/sae135-status-animation-render-3.md §6): sag130 made the Scene ON `status-animation` command last
`gate + STATUS_ANIMATION_ADDED_ROWS[animation]` rows (seg127's IsBattleSEPlaying gate: the controller polls the hit SE before
`InitAndLaunchChosenStatusAnimation`), but the render effect's age was the command age, so on a gated command the renderers (sar131 PSN /
PRZ, sad133 CURSED / NIGHTMARE / CONFUSION / FRZ, sae135 SLP / BRN / INFATUATION) drew the animation from the command's first row while
the ROM still shows the field as it is — every row of the body `gate` rows early, then a held last frame.

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| **The field + the age rule** (sgl138's stats-change shape) | `battleResolutionPresentation.ts`: the `status-animation` command's timing gains `seGateFrames` (present only when > 0) = `statusAnimationSeGate` (seg127's gate); `minimumFrames` unchanged = gate + added rows. `battleResolutionPresentationRender.ts`: the `status-animation` effect exists only from `phaseElapsed >= seGateFrames`, with `age = phaseElapsed - seGateFrames`. On the gate rows there is no effect: the ordinary field (the elevated shadow shown, no tracked rest, no sprites) — the ROM has not launched the script (`gAnimScriptActive` 0), so `SpriteCB_EnemyShadow` still shows the shadow. sar131's one-row shadow hold after the command (`postBodyShadowHiddenAt`) is unchanged: the command's end did not move. `battleScene.ts` untouched (it reads the effect's age). Ungated commands: no field, byte-identical | `git diff 361829128 -- src/` (2 files, +12 / -6) |
| **ROM windows** (seg127's 16 gate > 0 receipts: Flamethrower BRN, Ice Beam FRZ, Psybeam CONFUSION, Sludge Bomb PSN, Cute Charm INFATUATION, Flame Body BRN, Poison Point PSN, Effect Spore PRZ, Yawn SLP; both sides except Sludge Bomb / Flame Body; gates 1..18) | Dense direct-mGBA captures (`gaf140Probe.py` = stat101Probe.py with a 32-row pre-rise dump so the instruction row and the gate rows are in the dump), Scene ON, committed lab seeds: **r1 == r2 16 / 16**; `gaf140Rom.py`: **16 / 16 at seg127's X / gate / active rows** | `fixtures/gaf140/probe-sha256.json`, `rom-r1.json` |
| **Production comparator** (`gaf140Compare.ts`: sar131's transplant comparator through `createBattleResolutionPresentationRenderView` + `renderBattleResolutionLiveView`, the command as production builds it; full screen; rows **statusanimation row − 1 .. release + 2**, gate rows included) | **16 / 16 windows 0 px on every row** (1,417 rows; the 139 gate rows 0 px; the two next-command rows 0 px incl. the message band). Per window: section 2 | `fixtures/gaf140/production-compare.json` |
| **Controls (must fail)** | `prefix` (the pre-fix command: no `seGateFrames`, effect age = command age): **0 / 16** (≥ 9,526 px each; even the gate rows are clean on only 4 / 16 — the animations whose first rows draw nothing). `gate-1`: **0 / 16**. `gate+1`: **0 / 16** | `fixtures/gaf140/controls.json` |
| **Census 0..999** (sar131Census.sh / sar131CensusDelta.py, base `361829128` vs `c0ede0b31`) | **Identical**: 27,402 move records, **0 key / frame / status / liveFrames / decline / battle / segment changes**; battleDigestExcludingFrames / battleDigest / battleFrames / commandDigest identical on 10 / 10 shards; 15,926,929 battle frames both; 8,063 status-animation commands, of them **72 gated / 729 gate frames** (PRZ 38, CONFUSION 13, BRN 6, FRZ 5, PSN 5, SLP 5) — sag130's count | `fixtures/gaf140/census-delta.json` |
| **App routes** (`sar131RouteRender.ts`, Scene ON, base `361829128` vs final, `gaf140RouteDelta.py`) | **4 / 4 OK**: 41:0 (player GRIMER PRZ, gate 16), 92:0 (opponent RATICATE PSN, gate 8), 2:1 (opponent PLUSLE PRZ, gate 6), 22:1 (player RATICATE PSN, gate 7). Identical frame count / per-frame (key, type, age); **every differing frame inside the gated command** (50 / 62 / 40 / 59 frames), ungated status animations 0 differing, 0 unexplained. The 4 routes are every gated one found by `--scan` over seeds 0..119 slot 0 + 0..59 slot 1 (many shards of the scan stop on the replay's pre-existing "lost battle ownership" throw) | `fixtures/gaf140/routes-delta.json` |
| **Ungated receipts** (sar131 / sad133 / sae135 runners on the final code) | Every probe / ROM / comparator / control / x2 / next-body receipt **SAME** (sar131 17 / 17 windows, sae135 37 / 37 command rows, sad133: section 4). Their `routes-delta.json` is **DIFF on master already**: those runners compare against old bases (05c6e898f / a9310d3f2) whose deltas do not know the later drawn animations (sad133's CONFUSION, sag130's gate timing). Proof it is not this change: all 11 of their routes render **byte-identically** at `361829128` and at the final tree (0 differing frames, same timelines; none has a gated command) | section 4 |

## 2. Per window (production-compare.json)

| window (seg127-…) | animation | side | instruction | gate | rows | px | gate-row px |
|---|---|---|---|---|---|---|---|
| flamethrower-snorlax-opp | BRN | player | MoveEffectBurn | 5 | 47 | 0 | 0 |
| flamethrower-snorlax-ply | BRN | opponent | MoveEffectBurn | 8 | 50 | 0 | 0 |
| ice-beam-opp-delcatty-shuckle | FRZ | player | MoveEffectFreeze | 17 | 137 | 0 | 0 |
| ice-beam-ply-delcatty-shuckle | FRZ | opponent | MoveEffectFreeze | 18 | 138 | 0 | 0 |
| psybeam-snorlax-opp | CONFUSION | player | MoveEffectConfusion | 12 | 115 | 0 | 0 |
| psybeam-snorlax-ply | CONFUSION | opponent | MoveEffectConfusion | 15 | 118 | 0 | 0 |
| sludge-bomb-gyarados-ply | PSN | opponent | MoveEffectPoison | 1 | 75 | 0 | 0 |
| tackle-clefable-cute-charm-opp | INFATUATION | opponent | CuteCharmActivates | 4 | 104 | 0 | 0 |
| tackle-clefable-cute-charm-ply | INFATUATION | player | CuteCharmActivates | 8 | 108 | 0 | 0 |
| tackle-magmar-flame-body-ply | BRN | player | MoveEffectBurn | 3 | 45 | 0 | 0 |
| tackle-nidoking-poison-point-opp | PSN | opponent | MoveEffectPoison | 3 | 77 | 0 | 0 |
| tackle-nidoking-poison-point-ply | PSN | player | MoveEffectPoison | 7 | 81 | 0 | 0 |
| tackle-parasect-effect-spore-opp | PRZ | opponent | MoveEffectParalysis | 6 | 48 | 0 | 0 |
| tackle-parasect-effect-spore-ply | PRZ | player | MoveEffectParalysis | 10 | 52 | 0 | 0 |
| yawn-tyranitar-sand-stream-opp | SLP | player | YawnMakesAsleep | 11 | 111 | 0 | 0 |
| yawn-tyranitar-sand-stream-ply | SLP | opponent | YawnMakesAsleep | 11 | 111 | 0 | 0 |

Frame mapping: command age a == ROM row X + 1 + a (X = the instruction's last row; a = gate = the first gAnimScriptActive row R;
effective age a − gate == sar131's age). The comparator's previous command is the battler's `status` command when the instruction
follows the script's own status1 write (`GAF140_INFLICTED`: MoveEffectBurn / Freeze / Poison / Paralysis, YawnMakesAsleep — production
emits it there, and sad133's FRZ lag reads it as `inflicted`); a message otherwise. With a message before the FRZ windows (lag 1) they
fail from effective age 8 — the harness, not production: production's gated Ice Beam FRZ follows its `status` command.

## 3. Tier-1 test (`tests/gaf140StatusGateAge.test.ts`, 4 tests)

Constructed gated / ungated effect ages; production route 2:1 (Scene ON): the gated PRZ command carries `seGateFrames` 6 = minimumFrames −
39, no effect on its gate rows, age = a − 6 after, ungated commands age = a; the receipts (16 / 16, controls 0 / 16, r1 == r2, seg127
match, census zero, routes OK); every window's production frame sha256 per row == the receipt and the pre-fix command differs on all 16.
**Revert experiment** (base `battleResolutionPresentationRender.ts`): **3 / 4 fail** (the receipt-only test passes); restored from git.

## 4. Ungated runners on the final code

- `sar131Run.sh`: scenarios / probes 7 / 7 r1 == r2 / probe-sha256 / rom-r1 / comparator 17 / 17 (r1 == r2 == committed) / six controls /
  next-body-x2 **SAME**; routes 3 / 5 OK -> `routes-delta.json` DIFF (pre-existing, above: its 5 routes byte-identical 361829128 vs final).
- `sae135Run.sh`: stq132 probes / rom-windows / comparator (r1 == r2 == committed) / diag / redraw / four controls / next-body **SAME**;
  routes 5 / 6 OK -> DIFF (route 34:0's 88 "unexplained" frames are inside a CONFUSION command, drawn since sad133, unknown to sae135's
  delta; its 6 routes byte-identical 361829128 vs final).
- `sad133Run.sh`: stp128 probes 14 / 14 r1 == r2 (28 / 28 sha256) / rom-windows / comparator (31 / 34 all rows, 34 / 34 command rows;
  r1 == r2 == committed) / seven controls / x2 34 / 34 / sar131 PSN / PRZ 17 / 17 / sad133 test 16 / 16 **SAME**; routes 3 / 5 OK ->
  DIFF. Of its 5 routes, 4 render byte-identically 361829128 vs final (incl. the failing 19:0: 319 "unexplained" frames pre-existing);
  22:0 differs on **57 frames, all inside its gated PSN command** (RATICATE after Endeavor, gate 3: this fix) — its other 893
  "unexplained" frames are pre-existing.

## 4b. Gates (final code)

- Targeted (4 workers): gaf140StatusGateAge, sa125, sag130, sar131, sad133, sae135, sgl138, battleResolutionPresentation,
  animation/factoryAnimationInventory, playableAnimationIntegration: **10 files / 118 tests passed**.
- `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
- Full suite, four shards x 4 workers: shard 1 **414 files / 2,995 tests**, shard 2 **412 / 4,171**, shard 3 **411 / 3,277**, shard 4
  **415 / 3,262** passed (44 files / 223 tests skipped); total **1,652 files / 13,705 tests passed, 0 failed**.
- `npm run build`: green.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 361829128`:
  **PASS, 624 / 624 captures byte-identical**.
- `git diff --check 361829128 HEAD`: clean.
- `sh tools/integration/gaf140Run.sh <out> --census` from a fresh git-archive copy (HEAD `39083fd67`, `git init` + empty commit):
  **ALL SAME** (windows, probes 16 / 16 r1 == r2, rom-r1, comparator, controls, probe sha256, routes 4 / 4, census delta, receipt).

## 5. Rerun

    sh tools/integration/gaf140Run.sh <fresh-out-dir> [--census]     # from workspace/ (or a fresh git-archive copy inside the repo)

windows == committed; 16 probes x {r1 (dump), r2}: r1 == r2 == probe-sha256; rom-r1 == committed, r2 == r1; comparator ==
production-compare.json; controls == controls.json; 4 routes in a base archive copy (361829128, from the first enclosing repo that has
it) and this workspace: routes-delta == committed; `--census`: 10 + 10 shards, census-delta == committed; receipt ==
`tools/integration/fixtures/gaf140-live-receipt.json`. Raw dumps and the base copy are deleted at the end (`GAF140_KEEP=1` keeps them).

## 6. Open (not in scope)

- The ordinary (message) rows' missing opponent idle rest (sar131 §6) applies to the gate rows too (they are ordinary rows); none of the
  16 windows' opponents has a nonzero tracked rest there, so it does not show.
- The sar131 / sae135 runners' route deltas are stale against later drawn animations (pre-existing; a refresh is a ledger / tooling task).
