# sgl138 (S10A timeline fidelity): sgs134's IsBattleSEPlaying gate LIVE — stats-change (both scenes), multi-hit 2nd+ hits (Scene ON)

Production change: sgs134's banked patch (`tools/integration/fixtures/sgs134/sgs134-gate.diff`) landed on master `8de3a0441` with
`patch -p1` (applied cleanly; its +/- lines == the banked diff's, and `sgl138Run.sh` checks final src == base src + the diff). Only
`battleResolutionPresentation.ts` / `battleResolutionPresentationRender.ts`, exactly the patch's regions. Rule: seg127's
(`docs/seg127-status-se-gate.md`), fixed rows 44 (a hit's stat-change secondary, HandleBattleAnimation) / 62 (a multi-hit move's 2nd+
hit, HandleMoveAnimation) from sgs134 (`docs/sgs134-se-gate-other-requests.md`, 32 open ROM receipts, residual 0, both scenes).

## 1. Results first

| class | scene | anchors | gated / gate frames (gates) | production gate == sgs134's census projection | banner / body start | following print / later hit | gate rows' pixels == previous row |
|---|---|---|---|---|---|---|---|
| stats-change on the target (StatDown) | ON | 38 stats-change (both classes) | 10 / 151 (6, 8, 9, 22, 23) | yes | row `gate` | glyph gate + rows + hold | 10 / 10 |
| | OFF | 41 stats-change (both classes) | 10 / 151 | yes | row `gate` | glyph gate + rows + hold | 10 / 10 |
| stats-change on the attacker (StatUp) | ON | (in the 38) | 2 / 36 (8, 28) | yes | row `gate` | glyph gate + rows + hold | 2 / 2 |
| | OFF | (in the 41) | 2 / 36 | yes | row `gate` | glyph gate + rows + hold | 2 / 2 |
| multi-hit 2nd+ hit | ON | 11 later hits | 9 / 42 (2, 3, 5, 8) | yes | 1st hit's + gate | span 1st hit's + gate | 9 / 9 |
| **total** | | **90** | **33 / 416** | **90 / 90** | **79 / 79 + 11 / 11** | **79 / 79 + 11 / 11** | **33 / 33** |

- **Anchors** (`tests/sgl138SeGateLive.test.ts`, receipt `tools/integration/fixtures/sgl138-live-receipt.json`, tool
  `tools/integration/sgl138Live.ts`): census battles 0 / 9 / 19 / 32 (seg127 / sgs134's battle loop), both scenes, through the production
  orchestrator and `renderBattleResolutionPresentation` + `renderBattleResolutionLiveView` (core.ts's path). 90 anchors, **33 gated / 416
  gate frames**, covering all 10 cells: stats-change-target and stats-change-attacker x battler 0 / 1 x Scene ON / OFF, multi-hit x
  battler 0 / 1 (Scene ON). Gates seen: stats-change 6 .. 28, multi-hit 2 .. 8.
- **The ROM row.** sgs134's ROM receipts (rom-r1 / rom-off-r1, direct mGBA, both scenes): a gated `playanimation` launches at poll + gate
  and its controller rows are gate + 76 (16 / 16 per scene); a gated multi-hit `attackanimation` launches at poll + 2 + gate and
  ctl(hit k) − gate == ctl(hit 1). Production at gate 0 is the measured ungated timeline (sc106 / scf117: 76 / 90 from the rise, +1 to
  the print's first glyph; iu120 later hits == the 1st hit). With the gate: the banner's first row is command row `gate` (age 0 there),
  the following print's first glyph is command row gate + rows + hold, a later hit's body start and its command span are the 1st hit's
  + gate — i.e. each lands exactly `gate` rows later than the ungated timeline, as the ROM does.
- **The gate rows draw the field as it is.** For every gated anchor (33 / 33) every gate row's production frame hash == the previous
  command's last row (stats-change: no render effect before row `gate`; later hit: the move effect at age 0, which iu120 / idle98 proved
  is the activation row's image == the field). sgs134's ROM receipts carry **no screens** (probe JSONs: rows / polls / SE only), so the
  pixel claim is production-internal: the ROM shows nothing new while IsBattleSEPlaying holds the controller (no request launched yet).
- **Revert experiment** (scratch copy, `sgs134RequestSeGate` forced to 0): the four seed tests fail (receipt mismatch); per anchor,
  gate == projection drops to 57 / 90 and **33 / 33 gated anchors land exactly `gate` rows early** (print / later hit and banner / body).

## 2. Census 0..999, base `8de3a0441` vs final (both scenes; sgs134's census tools, `sgl138Run.sh` step 3)

`fixtures/sgl138/census-delta.json` (sgs134CensusDelta.py on sgs134Production.ts `--all`, 40 processes): **ok: true**, and every gate
field == sgs134's patched copy (`fixtures/sgs134/census-delta.json`, base `b9669e7d8` + the diff) — the frame totals too.

| scene | battles same end / kernel digest / command types | gated commands | gate frames | message parity (±1) | problems | frames base -> final |
|---|---|---|---|---|---|---|
| ON | 1,000 / 1,000 | move-animation 126, stats-change 240 (= 366, projection cells 172 / 172) | 540 + 3,114 = **3,654** | 106 | 0 | 15,915,831 -> 15,919,489 |
| OFF | 1,000 / 1,000 | stats-change 240 (projection cells 126 / 126) | **3,114** | 78 | 0 | 12,256,349 -> 12,259,481 |

Every changed command carries seGateFrames and changes by exactly it; the only other differences are sgs134's documented allowance:
button-dismissed messages ±1 frame after an odd cumulative shift (the census driver presses A on even frames while a message awaits
dismissal). Gameplay identical (same end, kernel-events digest and command-type sequence on every battle, both scenes), 0 command
status / type changes.

## 3. Pins (full suite on a patched archive copy of `203a6cfd3`, four shards; `fixtures/sgl138/pins.json`)

| file | pin | from -> to | why |
|---|---|---|---|
| `tests/sc106StatsChangeCommand.test.ts` | route seed 0 slot 2 `route.frames` | 6,722 -> 6,739 | + 8 + 9 = the route's two gated Icy Wind secondaries (sgs134's prediction) |
| `tests/animation/liveMultihitMoveAdapters.test.ts` | COMET_PUNCH seed 226 hit 2 `body.ages` | 40 -> 41 rows | + 1 = hit 2's multi-hit gate (hits 1 / 3: gate 0); re-pinned with per-hit `seGates` |

Not a pin: `tests/appDifferential.test.ts` "reports a missing trace before creating a worktree" failed in the copy only (one-commit repo:
`--base HEAD^` does not resolve); green on the main checkout. **No soak pin moved** (randomRoundSoak tests green); no other change.

## 4. Gates (final code)

Code tested: production src of `39f239cc8` (== a9e606e36's src; later commits are tests / tools / fixtures / docs).

- Targeted (serialized, 4 workers): sgl138 + sgs134 + seg127 + sag130 + sa125 + sc106 + liveMultihitMoveAdapters +
  battleResolutionPresentation + animation/factoryAnimationInventory + playableAnimationIntegration: **10 files / 110 tests passed**.
- `npm run typecheck` green; `npm run test:smoke` 448 / 448; `git diff --check` clean.
- Full suite, four shards (`npm test -- --maxWorkers=4 --shard=k/4`, POKEBENCH_VITEST_MAX_WORKERS=4): 414 / 412 / 411 / 412 files,
  2,994 / 4,169 / 3,263 / 3,254 tests = **1,649 files / 13,680 tests passed, 0 failed** (44 files / 223 tests skipped).
- `npm run build` green.
- `sgl138Run.sh` (run1, before the runner's `.orig` fix): receipt SAME, tests 15 / 15, census ok and == sgs134's patched copy; the src
  check (patch's `.orig` backup) re-run by hand after the fix: SAME.
- `npm run soak -- --policy vanilla --seeds 0:20 --parallel 5` **20 / 20 OK**; `npm run soak -- --seeds 0:20 --parallel 5` **20 / 20 OK**.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 8de3a0441`: **PASS, 624 / 624 captures byte-identical** (235 + 216 + 173; the app-only trace did not move).

## 5. Reproduction (from workspace/)

```
sh tools/integration/sgl138Run.sh <fresh-out-dir-inside-the-repo> [<base-rev, default 8de3a0441>]   # ALL SAME expected (~10 min)
node --experimental-strip-types --no-warnings tools/integration/sgl138Live.ts --out=<receipt.json>  # == fixtures/sgl138-live-receipt.json
npm test -- tests/sgl138SeGateLive.test.ts
```

The runner: base / final git-archive copies (two-commit repos), final src == base src + `sgs134-gate.diff`, the anchor receipt and
tests in the final copy, then sgs134Production.ts `--all` seeds 0..999 x both trees x both scenes (40 processes) and
sgs134CensusDelta.py == `fixtures/sgl138/census-delta.json` with its gate fields == sgs134's patched copy.
