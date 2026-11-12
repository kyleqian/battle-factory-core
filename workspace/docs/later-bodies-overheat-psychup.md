# Later bodies: Overheat (both sides) and Psych Up (opponent attacker) — lb21

Evidence only; no tracked file changed (the src edits used for the experiment are kept as
`tools/integration/fixtures/later-bodies-bg-2/lb21-temp-bypass.patch`, applied for the runs and reverted).
Direct mGBA, fresh processes; each fixture rendered 4 times (2 processes x 2 renders) — all identical.

## Results

**All 17 fixtures: 0 residual pixels, every row exact, 4/4 renders identical** (receipt
`tools/integration/fixtures/later-bodies-bg-2-receipt.json`).

| fixture | move | attacker | predecessors (move id, side) | rows | residual px | renders |
|---|---|---|---|---|---|---|
| oh2-o-growl-b0 | OVERHEAT | opponent | 45p → 0p | 230 | 0 | 4 renders, identical |
| oh2-o-psychic-b0 | OVERHEAT | opponent | 94p | 230 | 0 | 4 renders, identical |
| oh2-o-splash-b0 | OVERHEAT | opponent | 150p | 230 | 0 | 4 renders, identical |
| oh2-o-swordsdance-b0 | OVERHEAT | opponent | 14p → 0p | 230 | 0 | 4 renders, identical |
| oh2-o-tackle-b0 | OVERHEAT | opponent | 33p | 230 | 0 | 4 renders, identical |
| oh2-p-growl-b0 | OVERHEAT | player | 45o → 0o | 230 | 0 | 4 renders, identical |
| oh2-p-psychic-b0 | OVERHEAT | player | 94o | 230 | 0 | 4 renders, identical |
| oh2-p-splash-b0 | OVERHEAT | player | 150o | 230 | 0 | 4 renders, identical |
| oh2-p-swordsdance-b0 | OVERHEAT | player | 14o → 0o | 230 | 0 | 4 renders, identical |
| oh2-p-tackle-b0 | OVERHEAT | player | 33o | 230 | 0 | 4 renders, identical |
| pu-o-first-b0 | PSYCH_UP | opponent | (none: first body) | 179 | 0 | 4 renders, identical |
| pu-o-growl-b0 | PSYCH_UP | opponent | 45p → 0p | 179 | 0 | 4 renders, identical |
| pu-o-psychic-b0 | PSYCH_UP | opponent | 94p | 179 | 0 | 4 renders, identical |
| pu-o-splash-b0 | PSYCH_UP | opponent | 150p | 179 | 0 | 4 renders, identical |
| pu-o-swordsdance-b0 | PSYCH_UP | opponent | 14p → 0p | 179 | 0 | 4 renders, identical |
| pu-o-tackle-b0 | PSYCH_UP | opponent | 33p | 179 | 0 | 4 renders, identical |
| pu-o-tackle-b1-ownpsychup | PSYCH_UP | opponent | 33p → 244o → 0p → 33p | 179 | 0 | 4 renders, identical |

Predecessor ids: 33 Tackle, 150 Splash, 94 Psychic, 45 Growl, 14 Swords Dance, 0 = a STATS_CHANGE unit (statAnimation class
fed as the production `stat-animation` event), 244 Psych Up, 315 Overheat; side p/o = player/opponent (attacker side of the unit).

### Gate recommendation

* **OVERHEAT 315, both sides: drop the `firstBody` requirement** (`liveMoveAnimation.ts` case 315: keep `spriteOrderInput.known` + known-entry
  occupancy, exactly as 318/244). 5 distinct predecessors per side measured (Tackle, Splash, Psychic, Growl+stat, Swords Dance+stat),
  all 0 px with the production inputs unchanged (the first-body constants). Consistent with the compositor read set (Overheat reads
  `bldalpha` only, rewritten every age). **Caveat that already holds in production:** a later Overheat after the same side's/any earlier
  *Overheat* body has no production order plan (`Sprite order unknown for OVERHEAT` from the fixture harness on the first attempt:
  scenarios lb21-oh-* with Overheat on every turn), so the lend is unknown and `known` declines — no extra gate needed, and no
  claim is made for that case.
* **PSYCH UP 244, opponent attacker: widen** — needs (a) `liveMoveAnimationDuration` 244: `179` for either attacker (now `attacker === 0 ? 179 : null`),
  (b) `livePsychUpInputs` accepting the opponent (patch below), (c) the same `known` lend gate. First body + 5 later bodies (+1 after an own
  earlier Psych Up) exact.
  Opponent-orientation inputs, taken from the first-body capture (`psychUpInputsFor("opponent-front")`) and then confirmed by the 0 px runs:
  spiral `subpriority 38` (player 28), `painterInsertionIndex 7` (6), `scaleMatrixSlot 2` (1), monBg `layer bg1, battlerId 1, copyPaletteBank 8,
  initialBgCnt 0x9c00, monBgCnt 0x5c02` (player bg2/0/9/0x5e00/0x5e02), palettes `attackerBank 17` (16), `attackerPictureOrigin = attacker.spriteCenter`
  (player: `picOffsetPoint`), attacker sprite from the opponent side, target sprite player side. Not independently varied: only one
  species pair per side (opponent JUMPLUFF vs Sableye/Shuckle-class foes), so a species-breadth pass (the player rule had several) is the
  next step before calling it whole-playable; `scoped exact` matches the existing gate language.

### Overheat's own stat drop

Overheat's SpAtk -2 STATS_CHANGE unit runs *after* its body, so it never feeds that body. It matters only for a *following* body
(its unit is plan class 2 in `precedingBodies`, e.g. the oh2 chains' following bodies) and for the next Overheat, which declines (above).
Measured: the Overheat bodies themselves are 0 px with nothing but the lend; the drop did not change any compared pixel.

## Method

1. Scenarios `tools/battle-lab/lb21-*.json` (`lb21Scenarios.py`): `oh2-*` = the prep16 psychup-{player,opp}-after-X scenario with the Psych Up
   lead's moves replaced by Overheat (315), so Overheat runs once, *after* the foe's predecessor in turn 1 (no own earlier Overheat);
   `pu-o-*` = prep16 psychup-opp scenarios (the opponent Jumpluff attacks after the player's X; `first` = prep16 opp-first-shuckle, opponent first).
   First attempt `lb21-oh-*` (prep16 overheat scenarios, Overheat every turn, 4 turns) put an own Overheat before every later body — order unknown,
   deleted before commit.
2. Windows: direct-mGBA bodies probes (`lb21Probe.sh` -> `overheatBodiesProbe.py` / `psychUpBodiesProbe.py`, `bodyWindows[k]` activation .. first
   inactive), body lists from `bgHistoryProbe.py` (precedingBodies). Fixtures `lb21Fixtures.py` (later-bodies-bg shape).
3. Dense run (`lb21Dense.sh`, harness `liveAdapterFramebuffer.ts`, production renderer + production order lend replay) with the temporary src patch.
   Receipt `lb21Receipt.py`.

## Reproduce

```
export PYTHONPATH=../../vendor/libmgba-py PY=../../vendor/mgba-venv/bin/python
python3 tools/integration/lb21Scenarios.py
ls tools/battle-lab/lb21-*.json | xargs -n1 basename | sed 's/lb21-//;s/.json//' | xargs -P 8 -n 1 sh -c 'sh tools/integration/lb21Probe.sh a $0; python3 tools/run-mgba-probe.py /tmp/lb21/h/lb21-$0.json -- $PY tools/integration/bgHistoryProbe.py tools/battle-lab/lb21-$0.json /tmp/lb21/h/lb21-$0.json >/dev/null 2>&1'   # mkdir -p /tmp/lb21/h first
python3 tools/integration/lb21Fixtures.py /tmp/lb21/a /tmp/lb21/h
git apply tools/integration/fixtures/later-bodies-bg-2/lb21-temp-bypass.patch     # TEMPORARY
sh tools/integration/lb21Dense.sh p1; sh tools/integration/lb21Dense.sh p2
git checkout src                                                                    # revert
python3 tools/integration/lb21Receipt.py /tmp/lb21/dense/p1 /tmp/lb21/dense/p2
```
