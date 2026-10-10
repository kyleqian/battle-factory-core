# doll81 — Substitute-doll cell gates, banked for the next landing (evidence only)

Main lane, new files only. FIXED base: master `1e2f48b8a`, production src tree `cdae97b8`. Every measurement ran on `git archive` copies
of that commit. The production change is the temporary patch `tools/integration/fixtures/doll81/doll81-cells.diff`, applied only to a
copy (`patch -p1`). Nothing ran on the live checkout.

Probes were direct mGBA only, with the explicit lab seed 305419897 in every scenario. Each scenario ran twice from fresh processes,
and both runs of all scenarios ran in one batch (ISSUES #154): **60 / 60 scenarios r1 == r2 byte-identical**, and every measured window
has identical r1 / r2 residual digests.

## 0. Results first

Census context (seeds 0..999, base): 255 Substitute-doll declines, 8,160 frames (each one a 32-frame duration fallback).

How to read the table:
- **px**: the production live renderer on the PATCHED copy vs the ROM, every row of the dense window, run 1 / run 2 identical.
  - For attacker dolls the window is the composite: swap-in, idle row, body, swap-back, and the first inactive row.
  - For defender dolls it is the body (activation .. first inactive row) at the doll-free control's calibrated shift.
- **base**: what master draws today (the decline fallback), in px over the same window.
- **(explore)**: the cells NOT in the fold patch were measured on a second copy patched with `doll81-explore.diff`. That patch has every
  candidate cell, the explored framing, Double Team / Recover in the self-target set, and Psych Up / Dig / Iron Tail / Double-Edge player in
  the defender set. Those px are in `receipts/summary-explore.tsv`.
- Pairs: `P` = PERSIAN <-> SLOWBRO. `G` = GENGAR -> GOLBAT (player attacker; GOLBAT is the elevated opponent defender) or GOLBAT -> LAPRAS
  (elevated opponent attacker).

| cell (census cmds) | class | windows (pairs) | px (patched) | base px | verdict |
|---|---|---|---|---|---|
| Dream Eater 138 opponent (17) | attacker doll | 2 first windows (P, G) | **0 / 0** on 348 rows each | 4.9M / 5.1M | **PROVEN**. 4 later windows (history [.., 156 Rest, 138, ..]) have an UNKNOWN sprite order, doll-free too. There production presents the swaps and the body rows fall to the static field (4.5M / 4.6M px vs 4.9M / 5.0M fallback). This is the existing order-unknown semantics of the cell set |
| Dream Eater 138 player (3) | attacker doll | P, G | G **0**; P 302,499 (rows 291..351) | 5.0M / 5.1M | **RESIDUAL, not in the patch**: PERSIAN's ROM body is 1 row longer (266 vs GENGAR's 265: window 352 vs 351), so its swap-back is 1 row late. This is a pair-dependent body length (CPU-phase class) |
| Double Team 104 opponent (15) + player (8) | self-target | 2 + 2 windows per side | 274k..451k with framing `{rows: 159, shift: 0}` (explore) | 469k..611k | **RESIDUAL, not in the patch** (§2): the attacker's clone rows are off from body age ~1, and the adapter's 230 rows include the stats banner, which the ROM shows after MON_TO_SUBSTITUTE |
| Leaf Blade 348 opponent (15) + player | defender doll | P, G both sides | **0 / 0** (224 rows, 4 / 4) | declines | **PROVEN** both sides (controls 0 px) |
| ThunderPunch 9 opponent (13) + player | defender doll | P, G both sides | **0** on P (both sides) and GENGAR -> GOLBAT; GOLBAT -> LAPRAS 200 px on row 0 | declines | **PROVEN** both sides. The 200 px is the doll-free control's own row-0 elevated-attacker shadow, equal in the control (as Psychic's HAUNTER row in prep38). Shift -10, 136 rows |
| GrassWhistle 320 opponent (11) | attacker doll | P, G | 228,007 / 181,050 (rows ~206..218, whole field) | 3.3M / 3.4M | **RESIDUAL, not in the patch**: 13 whole-field rows near the body's end (age 206..218) |
| GrassWhistle 320 player | attacker doll | P, G x2 windows | **0 / 0** (306 rows, 4 / 4) | 3.4M / 3.5M | **PROVEN** with framing `{rows: 221, shift: 0}` (adapter 225) |
| SolarBeam 76 opponent (10) / player (8) | attacker doll | charge turn: 2 opp + 5 player windows | **0 / 0** (189 / 193 rows, 7 / 7) | 265k..350k | **PROVEN for the charge turn (t0) only**. The fire turn (t1, 238 ROM rows vs adapter 160) is the doll-free control's own residual (prep40), so it stays declined (`request.turn !== 0` gate) |
| SolarBeam 76 player, both dolls (7) | both dolls | not staged | — | — | not addressed (needs a doll on both sides; unchanged decline) |
| Recover 105 opponent (10) / player (3) | self-target | P, G both sides | 151k..198k with framing `{rows: 184, shift: -15}` (explore). A one-off scan of shifts -16..0 gave 143k..233k, never 0 | 387k..506k | **RESIDUAL, not in the patch**: orb sprites (10x10 boxes, ~76-78 px/row) are off from body age ~10 for every framing shift tried. Not a framing input; unresolved |
| Lovely Kiss 142 opponent (9) + player | attacker doll | P, G (opp 1 window each; player 2 each) | **0 / 0** (234 / 238 rows, 6 / 6) | 394k..496k | **PROVEN** both sides, framing `{rows: 153, shift: 0}` (adapter 152). D3 move: the activation value is pinned from the probe |
| Focus Punch 264 opponent (9) | attacker doll | P x2, G | 280k..290k (rows 173..188 with framing 155) | 2.7M / 2.8M | **RESIDUAL, not in the patch**: 16 whole-field rows. The player side is 0 px on 4 / 5 windows; GENGAR's 2nd window has a 1-row-shorter ROM body (153) and 309,615 px. Not in the patch |
| Psych Up 244 player (9) | defender doll | P, G both sides | 211k..342k, every row (explore) | 3.0M | **REAL DECLINE (palette)**: the Psych Up adapter composes the species palettes (`composeLivePalettes(art.player.speciesSymbol, art.opponent.speciesSymbol)`, liveMoveAnimation.ts:3678), and with the cell lifted it draws in the doll box (1.2k..1.9k px/row from row 0). Megahorn's fix (`composeLiveFieldPalettes` + doll art) is the resume input. Controls 0 px |
| Dig 91 player (7) | defender doll | P, G both sides | 188k..388k (explore; not meaningful) | 58k..428k | **NOT MEASURED**: the doll-free CONTROL is already off (107k..134k px, HP-box rows y 124..149, every row), and prep38Fixtures.py carries no two-turn request field. Needs a two-turn fixture first |
| Sing 47 player (7) | attacker doll | P, G x2 windows | **0 / 0** (331 rows, 4 / 4) | 638k / 680k | **PROVEN** with framing `{rows: 246, shift: 0}` |
| Sing 47 opponent (5) | attacker doll | P, G | 38,363 / 34,597 | 510k / 550k | **RESIDUAL, not in the patch**: the ROM body length depends on the pair (242 PERSIAN / 244 GOLBAT vs the player's 246) |
| Sunny Day 241 opponent (5) + player (4) | self-target | P, G both sides | **0 / 0** (239 / 243 rows, 4 / 4) | 1.03M..1.11M | **PROVEN**: the self-target composite renders through the existing swap path (§2) |
| Double-Edge 38 player (4) | defender doll | P, G | G **0**; P 480 px on 1 row (age 63; y 1..2 full width) (explore) | 691k / 737k | **RESIDUAL, not in the patch**: prep38's UNRESOLVED-HISTORY pixel reproduces exactly after an earlier Double-Edge (outside the doll). The GENGAR pair is 0 |
| Iron Tail 231 opponent (3) | defender doll | P, G both sides | 2,782..4,716 px (explore): doll-only rows 116..125 (~250-475 px/row), plus the controls' own 8..244 px at ages ~10-12 / 42-44 | 141k..218k | **RESIDUAL, not in the patch**: rows 116..125 are absent from the doll-free control |

Struggle (165) is excluded: it is not a rental move.

**Proven and in the patch: 13 (move, side) cells.** Census commands they cover (base): Dream Eater opp 17, Leaf Blade opp 15, ThunderPunch
opp 13, SolarBeam opp 10 + player 8 (charge turns), Lovely Kiss opp 9, Sing player 7, Sunny Day 5 + 4. The census delta is in §3.

## 1. FOLD INSTRUCTIONS

Apply `tools/integration/fixtures/doll81/doll81-cells.diff` (`patch -p1` from workspace/; base `1e2f48b8a`):

1. `src/engine/liveSubstituteSwap.ts`
   - `LIVE_SUBSTITUTE_SWAP_BODY_CELLS` += 138 Dream Eater [opponent], 320 GrassWhistle [player], 76 SolarBeam [both], 142 Lovely Kiss
     [both], 47 Sing [player], 241 Sunny Day [both].
   - `LIVE_SUBSTITUTE_SWAP_BODY_FRAMING` += 320 `{rows: 221, shift: 0}`, 142 `{rows: 153, shift: 0}`, 47 `{rows: 246, shift: 0}`.
   - New `LIVE_SUBSTITUTE_SWAP_SELF_TARGET_IDS = {241}`. In `liveSubstituteSwapApplies`, a self-target request applies only for those ids:
     `(request.target === request.attacker ? LIVE_SUBSTITUTE_SWAP_SELF_TARGET_IDS.has(request.moveId) : battlerOf(field, request.target).substituteDoll !== true)`.
     Every other self-target request keeps declining (the pin at substituteSwapPresentation.test.ts:81 stays green).
   - SolarBeam gate: `&& !(request.moveId === 76 && request.turn !== 0)`.
2. `src/engine/liveMoveAnimation.ts`: `LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS` += 348 Leaf Blade [both], 9 ThunderPunch [both].
3. `tools/integration/liveShareCensusGates.ts`: the `SWAP_SELF` needle becomes `"return (request.target === request.attacker"`.
   Without it the census aborts at load.

Pins a fold must move (`receipts/pins.txt`; the four related files on the patched copy: 3 failed / 74 passed of 77):
- `tests/substituteDollDefenderLive.test.ts:35` — the defender proven-cell allowlist gains `9:player`, `9:opponent`, `348:player`,
  `348:opponent` (37 -> 41 entries).
- `tests/substituteSwapAttdollCells.test.ts:64` — the framing keys gain 47, 142, 320 (add the three `[id, adapter, rows, shift, sides]`
  rows: `[47, 245, 246, 0, ["player"]]`, `[142, 152, 153, 0, ["player", "opponent"]]`, `[320, 225, 221, 0, ["player"]]`).
- `tests/substituteDollAdapterDecline.test.ts:111` — route `CRADILY 144/35 player attacker`: its SolarBeam `76:0->1` is a charge turn
  behind the doll, which is now presented (`declined` false). Re-point the route to a still-declining attacker-doll body (e.g. Double Team
  or Recover), or assert the swap for 76 t0.

Also add Tier-1 pins for the new cells (sides, framing, the self-target id set, the 76 turn gate) and record a live receipt (as
`attdoll-live-receipt.json` / `dolldef-live-receipt.json`) from `doll81Run.sh`'s `rec/` directory.

## 2. Self-target class (Double Team, Recover, Sunny Day with an attacker doll)

Source: `PlayerDoMoveAnimation` (battle_controller_player.c:2494-2541) and the opponent twin. State 0 launches `B_ANIM_SUBSTITUTE_TO_MON` whenever the
ACTIVE battler (the attacker) is `behindSubstitute` and `flag_x8` is clear. **The move's target is never consulted.**
- State 1 runs the body on the mon.
- State 2 launches `B_ANIM_MON_TO_SUBSTITUTE` after the script (multihit < 2).

So a self-target body by a subbed battler is the same composite as any attacker-doll body: the doll is not displayed during the body. The
probes confirm it: every subbed Double Team / Recover / Sunny Day has a `Special_SubstituteToMon` before it.

The existing adapter path renders it: `liveSubstituteSwapView` + `substituteSwapBodyField` treat the attacker as the mon during the body,
whatever the target. Production declined only because `liveSubstituteSwapApplies` required `target !== attacker`.

- **Sunny Day: 4 / 4 windows 0 px**, both sides.
- **Double Team:** declines for two named inputs.
  - (a) The doll-free adapter's 230 rows end with the stats banner (ages 163..229). With the doll, the ROM runs MON_TO_SUBSTITUTE right
    after the 159-row body, so the banner comes later.
  - (b) The clone phase is keyed by the attacker sprite's `data[3]` step counter (dt60). Residual rows start at body age ~1 in the
    attacker region even with framing 159. The state SUBSTITUTE_TO_MON leaves in `data[3]` is the suspect.
- **Recover:** the orb residual above, unresolved.

## 3. Census (seeds 0..999, one process each; base vs patched copy)

CENSUS_PENDING

## 4. Reproduce

```sh
sh tools/integration/doll81Run.sh <fresh-out-dir>            # archives + patch, fresh probes x2, checks, summary, pins (~6 min)
sh tools/integration/doll81Run.sh <fresh-out-dir> --census   # + both 0..999 censuses (~16 min)
PROBES=<existing probe dir> sh tools/integration/doll81Run.sh <fresh-out-dir>   # reuse a probe dir
```

The runner prints `same` / `DIFF` per committed receipt:
- `receipts/summary.tsv`: one line per window, with the patched px, the r1 == r2 identity, bad ages and the base px;
- `receipts/summary-explore.tsv`: the same over the explore copy;
- `receipts/pins.txt`;
- `receipts/census-delta.json` and `receipts/census-check.txt` (with `--census`).

Tools:
- `doll81Stage.py` (scenarios), `doll81Probes.sh`, `doll81Bodies.py` (body list);
- `doll81DefFixtures.py`: prep38Fixtures.py redirected to the doll81 scenarios;
- `doll81Summary.py`, `doll81CensusCheck.py`.

The attacker check is attdollLiveCheck.ts, unchanged, through `speciesAudit14SwapCheck.ts` (`S14_SCENARIOS`). The defender check is
prep38Check.ts, unchanged.
