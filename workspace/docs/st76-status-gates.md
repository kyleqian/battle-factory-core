# st76 (S10A main lane, 2026-10-10): Dive 291 and Meteor Mash 309 play live with a displayed status

Base `1462c4b87` (src `e6f98bf9`). The only production change is in `src/engine/liveMoveAnimation.ts`: cases 291 and 309 lose their
"battler has a status condition" gates. Receipt: `tools/integration/fixtures/st76-live-receipt.json`. Windows and ROM row hashes:
`tools/integration/fixtures/st76-windows.json`. Only direct mGBA processes were used. The shared HTTP oracles were not touched. Every
scenario pins lab seed 305420547 (+ k for the sweeps).

## 1. Results first

The hypothesis holds. `renderBattleResolutionLiveView` redraws both healthboxes over every live body, and the redraw includes the status
icon. The staged DIVE / METEOR_MASH branches draw status-free healthboxes, but that output is overwritten. Neither body blends or fades the
OBJ healthboxes: Meteor Mash's `fadetobg BG_COSMIC` writes BLDCNT 0xE8, which targets BG3 and the backdrop only, and Dive has no fade.
Both gates are removed. No gate was kept or narrowed.

### Windows

Each window ran twice, in two fresh direct-mGBA processes, through the production live renderer (`liveAdapterFramebuffer.ts`), with
the gate removed. Statuses were staged by real moves: Toxic, Will-O-Wisp or Thunder Wave by the foe; the attacker's own turn-1 Toxic; or
the target's Rest after the first hit.

| window | body | status (side) | attacker → target | rows | px r1 / r2 | lag ages | production lend == ROM |
|---|---|---|---|---|---|---|---|
| `mm-ply-prz-atk-body` | Meteor Mash | PRZ (attacker, player) | METANG → ONIX | 215 | 0 / 0 | [194] | n/a (no order input) |
| `mm-opp-brn-atk-body` | Meteor Mash | BRN (attacker, opponent) | METANG → ONIX | 215 | 0 / 0 | [194] | n/a |
| `mm-ply-psn-tgt-body` | Meteor Mash | PSN (target, opponent) | METAGROSS → GOLEM | 215 | 0 / 0 | [194] | n/a |
| `mm-opp-slp-tgt-body` | Meteor Mash | SLP (target, player) | METANG → ONIX | 215 | 0 / 0 | [194] | n/a |
| `dive-ply-psn-atk-attack` | Dive attack | PSN (attacker, player) | CHINCHOU → ONIX | 93 | 0 / 0 | [84, 85] | yes |
| `dive-opp-brn-atk-attack` | Dive attack | BRN (attacker, opponent) | CHINCHOU → ONIX | 93 | 0 / 0 | [84, 85] | yes |
| `dive-ply-psn-tgt-attack` | Dive attack | PSN (target, opponent) | LANTURN → GOLEM | 93 | 0 / 0 | [84, 85] | yes |
| `dive-opp-slp-tgt-attack` | Dive attack | SLP (target, player) | CHINCHOU → SNORLAX | 93 | 0 / 0 | [84, 85] | yes |
| `dive-ply-psn-tgt-setup` | Dive setup | PSN (target, opponent) | LANTURN → GOLEM | 118 | 0 / 0 | [67] | yes |
| `dive-opp-slp-tgt-setup` | Dive setup | SLP (target, player) | CHINCHOU → SNORLAX | 115 | 0 / 0 | [] | yes |
| `dive-ply-psn-atk-setup` | Dive setup | PSN (attacker, player) | CHINCHOU → ONIX | 118 | 284 / 284 (row 68 only) | [68] | yes |
| `dive-opp-brn-atk-setup` | Dive setup | BRN (attacker, opponent) | CHINCHOU → ONIX | 115 | 15,777 / 15,777 (rows 66..95) | [64] | yes |

**Totals:** 12 windows, 1,698 rows, r1 == r2 in 12 / 12. 10 / 12 windows are 0 px on every row. The production order lend equals the ROM
`sSpriteOrder` in 8 / 8 Dive windows: it replays the full history, including the status and held-item animations (`st76Check.ts`).

**The two non-exact windows are the documented Dive setup CPU phases, not the status icon.** Every differing pixel is in the field. The
status icon is in the chrome rows, which are 0 px. Lag ages were measured by `issue151Counters.sh` (two runs, identical).

- `dive-ply-psn-atk-setup` is the `oam-transfer-row` no-event phase. It lags at age 68, while the exact player setup lags at 67. The
  residual is row 68 only, 284 px, which is exactly the documented `alternatePhaseResidual` (ages [68], max 284 px per row).
- `dive-opp-brn-atk-setup` is the `optional-lag-age 64` phase. Rows 66..95 run one row late, which is the documented CLAMPERL window's
  rows. Status-independent:
  - an **unstatused** control (seed +2, where Will-O-Wisp missed) lags at 64;
  - five burned seeds (+1 / +4 / +6 / +7 / +8) do not.

### A Dive attack timing phase (flagged, not gated)

Seed sweeps used `prep22Probe`, two runs each, with identical bodies in 136 / 136 runs. They found a 94-row attack body, with an extra
main-loop lag at age 17 (lags [17, 85, 86] instead of [84, 85]), in **5 of 34** PSN player-attacker windows. The 94-row body occurred in 0 / 73 unstatused windows (including the 6 PSN-route seeds where
Toxic missed) and 0 / 29 BRN opponent-attacker windows.

- With the one repeated ROM row skipped (`denseSegments`), seeds +2 and +4 are **93 / 93 rows 0 px** in two fresh runs. So every displayed
  image, status icon included, is the production image. The only difference is one inserted lag row.
- The mechanism of the age-17 lag is **not identified**. RAM at activation was the same (HP, status, spawns).
- The policy's 93-row phase dominates on this route (29 / 34). Under the D4 rule this is an alternate-phase residual. A poisoned player
  diver's 94-row attack is presented one frame short from age 17.
- It is reported here for the supervisor. `docs/animation-integration-live-status.json` is unchanged.

### Census, parity

**Census seeds 0..999** (base `1462c4b87` vs final):

- 27,518 commands.
- The command KEY sequence (battle, kind, moveId, side, attacker, target) is identical.
- `battleDigestExcludingFrames` is identical in all 10 ranges, and total frames are identical (3,952,274).
- **+31 commands / +4,035 live frames, all from "battler has a status condition" to live:**
  - Dive opponent 15 / 1,565;
  - Dive player 9 / 965;
  - Meteor Mash opponent 5 / 1,075;
  - Meteor Mash player 2 / 430.
- **0 live → fallback.** 0 status-gate declines remain.
- Live share: 25,784 → 25,815 by count (93.70 → 93.81 %), and 3,859,021 → 3,863,056 by frames (97.64 → 97.74 %).
- Method: ten ranges of 100 seeds per tree, run in scratch copies of `liveShareCensus.ts` with a 2-line `--index-from` (the range's battle
  ids / streaks = the single-process ones), and `fix74CensusDelta.py`.
- Delta file: `tools/integration/fixtures/st76-census-delta-seeds0-999.json`.

**Scene ON / OFF parity** (`hide66Parity.ts --moves=291`) on two statused census Dive routes. Battle RNG, rules context and boundary are
equal at every turn boundary on both.

| route | Dive side | boundaries | digest |
|---|---|---|---|
| seed 428 / streak 4 | player | 37 | `0ac8f392…` |
| seed 518 / streak 14 | opponent | 26 | `448c35f4…` |

Receipts: `fixtures/st76-parity-seed{428,518}.json`.

**Gates** (final code, tested at `76c1e77a2`, src tree in the receipt; four Vitest workers), 0 failed throughout:

- Targeted: 144 files (every test matching 291 / 309 / DIVE / METEOR_MASH, plus st76, the inventory and playableAnimationIntegration):
  136 passed / 8 skipped, 2,290 tests passed / 45 skipped.
- `npm run typecheck`: green.
- `npm run test:smoke`: 8 files / 448 tests.
- `npm test` shard 1/2: 804 files passed / 22 skipped, 6,900 tests passed / 119 skipped.
- `npm test` shard 2/2: 804 files passed / 22 skipped, 6,329 tests passed / 104 skipped.
- `npm run build`: green.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base
  1462c4b87`: 624 / 624 captures byte-identical.
- `git diff --check`: clean.

## 2. What landed

- `src/engine/liveMoveAnimation.ts`, cases 309 and 291: the `field.{player,opponent}.status` declines are removed and the comments are
  updated. The shiny, lend and words gates are unchanged. The staged configs still pass `playerStatus: "none"`, because the live view
  redraws the healthboxes.
- `tests/st76StatusGates.test.ts` checks:
  - the receipt shape: per body, both sides, status on the attacker and on the target, at least 2 species pairs and at least 2 statuses;
  - that the non-exact windows match the documented phase rows;
  - ROM row vectors: every 7th row of the 10 exact windows renders to the ROM RGB888 sha256;
  - every status on either side stays live, and a shiny battler still declines.

  With the gates restored, 2 / 4 of these tests fail.
- `tests/animation/liveDiveAttackAdapter.test.ts`: a displayed status now plays live. Before, it declined.
- Tools:
  - `st76Scenarios.py` writes the scenarios.
  - `st76Fixtures.py` builds the fixtures.
  - `st76Check.ts` checks lend == ROM and live ages.
  - `st76Receipt.py` writes the windows and sweeps summary.
  - `st76LiveReceipt.py` writes the live receipt.
- `liveAdapterFramebuffer.ts` `wordsChain` gained a `status` step, an optional side on `general`, and the Dive setup splash context for a
  fixture's own setup body.

## 3. Rerun

```sh
python3 tools/integration/st76Scenarios.py
sh tools/integration/dive70Probes.sh <scratch>/probes 2 tools/integration/fixtures/st76/scenarios/*.json
python3 tools/integration/st76Fixtures.py <scratch>/probes
npx tsx tools/integration/st76Check.ts tools/integration/fixtures/st76/*.json > <scratch>/check.jsonl
POKEBENCH_LIVE_EVIDENCE_DIR=<scratch>/evidence npx tsx tools/integration/liveAdapterFramebuffer.ts tools/integration/fixtures/st76/<tag>.json > <scratch>/live/<tag>.json
sh tools/integration/issue151Counters.sh <scratch>/counters 8 tools/integration/fixtures/st76/*.json
python3 tools/integration/st76Receipt.py <scratch> tools/integration/fixtures/st76-windows.json
# sweeps: the st76 / base mechanic-dive scenarios with "seed" = 305420547 + k (k = 1..40; unstatused base 0..43), dive70Probes.sh, 2 runs
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=A..A+99 --index-from=A --out=... --commands=...  # scratch copies, x10 x {base, final}
python3 tools/integration/fix74CensusDelta.py <census-dir> 0 100 200 300 400 500 600 700 800 900
node --experimental-strip-types --no-warnings tools/integration/hide66Parity.ts --seed=428 --streak=4 --moves=291 --out=...
python3 tools/integration/st76LiveReceipt.py [gates.json]
```
