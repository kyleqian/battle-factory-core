# aud129 — live audit 27 (S10A main lane, 2026-10-12): ord124's Golbat Mega Punch flag, and elevated parties widened

Base: the FIXED master `1352d2130` (production src `0d315f39b`). Evidence only, new files only, no patch. Every render ran in a git-archive copy
of `1352d2130`. Direct mGBA only, with the lab seed pinned in every scenario. Two fresh probe batches gave `derive` / `lends` r1 == r2. Inside
`audit21Check.ts`, two more fresh probes ran per scenario: per-row digests r1 == r2 on **105 / 105** windows. The whole runner ran twice into
fresh dirs, and every receipt was `same`.

Runner: `sh tools/integration/aud129Run.sh <fresh-out-dir>` (~9 min). Add `AUD129_CENSUS=1` for the census exposure (+2 min).

## Results

**No DEFECT.** All 105 windows are live, lend == ROM `sSpriteOrder` on 105 / 105, and r1 == r2 on 105 / 105:
- **85 windows are 0 px** on every row.
- **20 windows are TIMING-PHASE (D4 class).** In each of them, every residual row is exactly the other one-frame CPU phase. Proof: those rows
  render at **0 px against production one age off** (21 / 21 shifted renders, `aud129-shift-base.txt`).
- **The ord124 flag is TIMING-PHASE, not a defect and not an alignment artefact.**
- **Spark is an ALIGNMENT artefact.** A checker that renders from the activation reports 1.2 M px per window. At production's accepted window
  (activation + 9) it is 0 px, 8 / 8.

| # | Windows | Verdict | Rows / px | Mechanism (source) |
|---|---|---|---|---|
| 1 | **flag**: ord124 `wos-opp-143-42-5-s11` c0. Player GOLBAT Mega Punch 5 -> opponent SNORLAX; first body of the battle | **TIMING-PHASE** | 17 / 159 rows, **287,402 px**: row 71 (16,906) and rows 141..156 (16 x 16,906) | Two one-frame CPU phases of Mega Punch's own BG program (§1) |
| 2 | **flag**: ord124 `wos-ply-143-42-5-s11` c0. Opponent GOLBAT Mega Punch -> player SNORLAX | **TIMING-PHASE** | 1 / 160 rows, **17,984 px** (row 71) | The BG-write row only (§1) |
| 3 | flag c2: the same Mega Punch after Odor Sleuth, both routes | OK | 160 / 160, 0 px | — |
| 4 | iso: Mega Punch with sides / roles swapped, both orientations each. Golbat -> Snorlax (Harden defender), Snorlax -> Golbat, Cacturne 345 (non-elevated) -> Snorlax, Golbat -> Onix 95 (non-Snorlax) | **OK 8 / 8** (+ 16 Harden OK) | 160 / 160, 0 px | No party dependency: neither Golbat's elevation nor Snorlax's picture causes the flag |
| 5 | wide, elevated opponent attacker: Ninjask 302 Slash 163, Flygon 334 Crunch 242, Electrode 101 Swift 129, Voltorb 100 Spark 209, Crobat 169 Screech 103 | **OK 5 / 5** | 0 px (Spark aligned) | — |
| 6 | wide, elevated opponent target: Flygon Crunch -> Ninjask is PHASE (see 9); Ninjask Slash -> Flygon, Voltorb Spark -> Electrode, Electrode Swift -> Voltorb, Koffing 109 Smokescreen 108 -> Crobat | **OK 5 / 5** | 0 px | — |
| 7 | wide: elevated opponent Koffing Smokescreen -> player Crobat | TIMING-PHASE | rows 49..122, 74,436 px | Smokescreen phase (§2) |
| 8 | ordl126 bodies (species other than CHANSEY / WOBBUFFET): Struggle 165 by the elevated opponent GOLBAT after False Swipe 206 (player JOLTEON 135); Stockpile 254 (ordl126's `254:opponent` class) by the elevated opponent PELIPPER 310, twice, after Odor Sleuth 316. Also the route's Harden / 2 Taunt | **OK 3 / 3** (+ 3 OK) | Struggle 112 / 112, Stockpile 99 / 99, 0 px | — |
| 9 | Crunch PHASE windows: wide Flygon -> Ninjask c0; phase `crunch-ply-s2` c2 | TIMING-PHASE (the documented a13fix parameter) | rows 123..138, 284,048 / 290,096 px; ROM body 141 rows | Crunch's optional lag at 121 is absent (§2) |
| 10 | iso2: Spark by Voltorb at Snorlax / Shuckle (spark62's accepted targets) / Electrode, both sides | **ARTIFACT** unaligned, **OK 6 / 6** aligned | 126 rows rendered from the activation: ~1.24 M px; aligned 115 / 115, 0 px | The accepted window starts at activation + 9 (§3) |
| 11 | iso2 + phase: Smokescreen. Koffing at Snorlax / Onix, Weezing 110 at Crobat; the committed `mechanic-smokescreen-*` scenarios at seeds 0..3 | TIMING-PHASE 16 windows, OK 8 | rows 49..122, 61,004..83,292 px each | Smokescreen phase (§2); production presents the minority phase on a battle's FIRST Smokescreen |
| 12 | phase: the committed `mechanic-mega-punch-*` / `mechanic-crunch-*` scenarios at seeds 0..3 | OK, except one Crunch (row 9) | 0 px | — |

Census 0..999 exposure (base, `stg107Census.sh`; 27,245 / 27,426 live = the ordl126 landed headline; `aud129-exposure-base-1352d2130.json`):

| Move | Live commands / frames | First use in the battle (use1) |
|---|---:|---:|
| Mega Punch 5 | 8 / 1,320 | 6 / 990 |
| Crunch 242 | 185 / 27,195 | 117 / 17,199 |
| Smokescreen 108 | 138 / 17,940 | **66 / 8,580** |
| Spark 209 | 90 / 10,350 | 48 / 5,520 |

## 1. The flag (rows 1..4)

**Rerun.** `aud129Stage.py` writes ord124's two routes **byte-identically**: it was checked against `ord124Stage.py` + `plans69Probe.scenario`.
Window c0 reproduces ord124 exactly: 287,402 px (142 / 159 rows exact) and 17,984 px (159 / 160 rows exact). The lend is ROM on both.

**Alignment.** Mega Punch has no idle lead: it is not in `LIVE_MOVE_IDLE_LEAD_ROWS`, and `liveMoveAnimationDuration` 5 is 160. Production's
accepted window therefore starts at the activation, and audit21Align / aud110Align leave it unchanged. Rows 0..70 and 72..140 are exact. A
misaligned window would shift every row. **Verdict: not an artefact.**

**Mechanism** (`data/battle_anim_scripts.s` Move_MEGA_PUNCH, `SetImpactBackground`; `battle_anim.c` Task_FadeToBg):
- **Row 71.** `changebg BG_IMPACT_*` loads the impact BG: `LoadMoveBg`, an LZ decompression in the script iteration.
  - In the flag routes the VBlank lands before the new palette is uploaded. The ROM shows the faded black BG on row 71 (`000000`, where
    production already shows `ffff00`), and the yellow impact BG one row later.
  - This is the `bg-write-row` kind of `liveMoveTimingPolicy.ts` (the later write row = "event").
  - Proof: ROM row 71 == production age 70, 0 px, on both flag windows.
- **Rows 141..156** (opponent-Snorlax route only). `restorebg` runs Task_FadeToBg, then `LoadDefaultBg`, then the fade back in.
  - Production's 160-row body includes an optional lag frame there. This route's ROM body has none: 159 rows, and the fade-in runs one frame
    ahead.
  - The `optional-lag-age` kind, the Megahorn / Crunch class of `docs/faithful-timing.md`.
  - Proof: ROM rows 141..158 == production ages 142..159, 0 px.
- **Measured phases** (19 Mega Punch windows):

  | Parameter | Production's phase (dominant) | Flag routes |
  |---|---|---|
  | BG write | row 71: 17 windows | row 72: the 2 flag c0 windows |
  | Restore fade | the lag: 18 windows (160 rows) | no lag: 1 window (flag-opp c0, 159 rows) |

  **Production ships the dominant phase of both parameters.** Production is unchanged; the residual is quantified above.

**Isolation (row 4).** Every Mega Punch is 0 px in every swap:
- the same pair with the roles swapped (Snorlax -> Golbat, both orientations);
- a non-elevated attacker at Snorlax (Cacturne);
- Golbat at a non-Snorlax target (Onix);
- Golbat -> Snorlax again, with a Harden defender instead of Odor Sleuth.

So no party causes it: neither the elevated attacker's y / shadow nor the target's picture height. The phase follows the route's CPU load, and
the flag battles were the only ones in their phase.

## 2. One-frame phases found by widening (rows 7, 9, 11)

**Crunch 242.** `liveMoveTimingBodyRows(242)` = 142 is the a13fix faithful-timing policy (optional lag at 121). 2 of 15 windows are the no-lag
phase: 141 rows, with the restore fade on rows 123..138 one frame ahead (shift proof 0 px). This is already a documented D4 parameter. The
counts here are 13 : 2 for the chosen phase.

**Smokescreen 108.** Production has a fixed 125 rows (`case 108: return 125`) and no policy entry.
- In 24 measured windows the ROM body is 124 or 125 rows. The rows before 49 are always exact.
- In the 124-row phase the black-smoke sprites (`AnimBlackSmoke_Step`: `invisible ^= 1` and the x2 drift every frame, 75 frames) run one frame
  ahead from row 49 on:
  - the flicker parity is inverted on rows 49..122;
  - shift proof: ROM rows 49..123 == production ages 50..124, 0 px, on 16 / 16.
- The phase follows **the move's use in the battle**:

  | Use | 124 rows | 125 rows |
  |---|---:|---:|
  | First Smokescreen of the battle (use1) | **15** | 1 |
  | Later Smokescreens (use2+) | 1 | **7** |

  - The split is not the order host's `firstBody` class (`aud129-phase-base.txt` lists both columns). The 16 use1 windows cover:
    - Koffing and Weezing, both sides;
    - targets Snorlax, Onix and Crobat;
    - the committed `mechanic-smokescreen-*` scenarios at four seeds.
  - The source mechanism behind the first-use dependence (the CPU work around `SmokescreenImpact`'s sheet load at row ~48) was not identified
    inside the cap.
- **The precise remaining item: a D4 policy entry for Smokescreen keyed by use in the battle.**
  - Kind: `optional-lag-age`, with the optional lag before row 49.
  - use1: no-event, 124 rows (15 : 1).
  - use2+: event, 125 rows (7 : 1).
  - Today production presents a battle's first Smokescreen in its minority phase: **66 live commands / 8,580 frames** on seeds 0..999,
    ~75 rows each with the smoke flicker one frame off.
  - The policy's only body classes are the order host's `first` / `later`, so this needs a new key: the move's use count per battle. That is a
    production change beyond this evidence-only step. It is not banked.

## 3. The Spark artefact (row 10)

`liveMoveAnimation.ts` documents Spark's accepted window: `case 209: return 115`, "Spark 79..193 / 83..197 (activation + 9 ...)" (spark62). So
the ROM's 126-row body = 9 lead rows + 115 + 2.
- Rendered from the activation (as ord124-style checks do; `aud129-spark-unaligned.txt`), every Spark window shows ~1.24 M px:
  - row 0 is the elevated opponent's shadow;
  - rows 2..45 are the `blend_color_cycle` BG blend, one cycle off.
- `aud129Align.py` adds Spark to the audit21Align method (activation + 9, 115 rows, ageOffset 0). Then all 8 Spark windows are 0 px, including
  spark62's accepted pairs (Voltorb -> Snorlax / Shuckle) and Electrode targets / attackers.
- **Checker artefact.** Future audits must align Spark.

## 4. Scenarios, method, tools

`aud129Stage.py` writes 54 `pb-*` scenarios (every body is a window). INTERNAL species ids; Factory-legal (species, move) pairs were checked
against `battle-frontier-mons.json` for every wide attacker. The elevations are from `enemy-mon-elevations.json`.

| Group | Scenarios |
|---|---|
| flag | ord124's 2 routes |
| iso | 8 Mega Punch pairs |
| wide | 6 elevated battles, one per (pair, orientation), 2 turns |
| ordl | the Struggle (stg107 taunt route, plan `sbtttt`, player slot 2 = False Swipe) and Stockpile routes |
| iso2 | 12 Spark / Smokescreen pairs |
| phase | the committed mechanic-{mega-punch, crunch, smokescreen} scenarios, seeds 0..3, both sides |

The bodies without a live adapter are history only: Odor Sleuth, False Swipe and the Onix defenders' Tackle.

Pipeline (in `aud129Run.sh`):
1. `audit20Probes.py` x2, then `audit20Fixtures.py` (pb rule), then `audit20Check.ts` with `AUDIT20_LENDS_ONLY` (lend vs ROM).
2. Align: `aud110Align.py` (Harden / Taunt), then `aud129Align.py` (Spark).
3. `stf115Check.sh` with `STF115_CHECK=audit21Check`, then `stf115Summary.py`, then `aud129Phase.py` (per-window verdict + body-row tally).
4. `aud129Shift.py`: the one-age-off renders of every PHASE window.
5. Optional: `stg107Census.sh`, then `aud129Exposure.py`.

Receipts (`tools/integration/fixtures/aud129/`):

| Receipt | Content |
|---|---|
| `aud129-derive.txt` | the derived fixtures |
| `aud129-lends-base.jsonl` | the lends vs ROM |
| `aud129-windows-base.txt` | the stf115 lines |
| `aud129-phase-base.txt` | the verdicts, residual runs and tallies |
| `aud129-spark-unaligned.txt` | the Spark windows rendered unaligned |
| `aud129-shift-base.txt` | the one-age-off renders |
| `aud129-exposure-base-1352d2130.json` | the census exposure |

Not covered: an elevated PLAYER-side party. Elevation is enemy-only (`gEnemyMonElevation`), so every elevated window here has the elevated
species on the opponent side, as attacker or as target.
