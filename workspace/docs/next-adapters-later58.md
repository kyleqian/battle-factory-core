# S10A later58 — later-body consumer gates (side lane, narrow production grant)

Base: master `99493737c` (production src tree `db20b3ec`). Method: docs/next-adapters-prep48.md (the prep48 / later48 recipe). Every ROM
number is from independent direct-mGBA `prep48Probe.py` processes (Scene ON), never the shared HTTP oracles. Every scenario carries an
explicit lab `"seed"` (ISSUES #154) and ran twice fresh in one batch: **166/166 r1 == r2**. Every window then ran through the production
renderer (`liveAdapterFramebuffer.ts`) in two more fresh probe processes, with the digests agreeing.

## Results

Eight of the nine moves are live at later bodies. Each narrowed gate is "known lend AND (firstBody OR both species front-idle rests {0,0})",
plus the extra condition shown in the table. Receipt: `tools/integration/fixtures/later58-live-receipt.json`.

| move | history the renderer reads at a later body | later windows (twice fresh) | narrowed gate (extra) | census 0..299 |
|---|---|---|---|---|
| **Signal Beam 324** | Only the order lend and the battler x2 rest. WIN0 is (0,0) at the ROM's later activation, but the inputs carry the first-body (240,161) at age 0; no pixel reads it (WININ = WINOUT). BGnCNT / DISPCNT / BG1VOFS history is unread. | **24/24 0 px**. Opponent ONIX: 5 declined. Unguarded, its Quick Attack costs **40,367 px** (ages 0..36). | — | +8 / +1,159 |
| **Mach Punch 183** (D4a) | BG3HOFS / BLDCNT / BLDALPHA / BLDY are still S0. Palette bank 9 (the healthbar trace) and the allocator equal the first body. | **16**: 10 exact in the lag phase; 6 no-lag windows differ only on the documented rows 92..107 | the target-rest guard is unchanged | +6 / +660 |
| **Sheer Cold 329** (D4) | Register history unread; allocator = first body. | **8**: 2 exact; 6 other-phase, residual only on rows 173..188 (documented 172..189) | — | +5 / +953 |
| **Extrasensory 326** (D4c) | Opponent attacker (player target): 65 displayed scanline lines differ from the intro residue after an own earlier body, and none is read. | **11/11 opponent windows**: rows 0..142 and the tail exact, residual only on the documented lag rows 143..158 | **opponent attacker only** | +2 / +322 |
| **Sky Attack 143** charge | WIN0 (0,0), exactly as for the strike: a later charge now passes `firstBody: false` to `registersFor`. BGnCNT history unread. | **16/16 0 px** (148 rows) | strike unchanged | +2 / +296 |
| **Bonemerang 155** | A later hit 1 / hit 2 starts from history BG1CNT 0x9c01 / 0x5c02 / 0x1c00 and BG2CNT 0x5e02. The pixels never show it, given the builder's split base. | **23/23 0 px** (71 rows) | — | +3 / +213 |
| **Outrage 200** | Register history unread. | **13/13 0 px**. DRAGONITE → opponent ONIX: 6 declined. | — | +2 / +238 |
| **Fury Cutter 210** | The counter: request power (gBattleMovePower after damagecalc) = 10 << (counter−1), ×1.5 under SWARM. | **12/12 counter-1 0 px** (43 rows) | **power 10 / 15** | +4 / +172 |
| Memento 262 | **The scanline entry.** The prep34 decline fixture `s10a-live-declines/memento-later-player-weezing-chimecho` (after Psywave) differs. | after Quick Attack: 0 px on 174..178 rows (`check-memento.json`) | **unchanged: declines** | 0 |

**Census** (`liveShareCensus.ts` seeds 0..299, `prep43CensusDelta.py`; `fixtures/later58/census-*.json`):
- 7970 paired commands, **0 pairing mismatches** (identical command sequence).
- **0 live → fallback regressions**.
- Battle digest `0fd00eae20781498…` is identical.

| | live by count | live by frames |
|---|---|---|
| `99493737c` | 7510 = 94.23 % | 1,114,736 / 1,168,201 = 95.42 % |
| final | **7542 = 94.63 % (+32)** | **1,118,749 = 95.77 % (+4,013)** |

The later-body stop goes from 43 cmds / 5,685 frames to **11**. Seven are later-body declines that remain: Extrasensory player 5, Memento 2.
Four are case-local gates (shiny / palette).

**D4.** `d4aTimingCheck.ts` ran on all 77 Mach Punch, Sheer Cold and opponent-Extrasensory fixtures, first and later bodies, each through
its existing policy: **0 violations** (`fixtures/later58/d4-timing-check.json`). Two skews are flagged for the supervisor:
- All **5 opponent later Sheer Cold** windows measured the age-171 lag. The opponent policy is no-lag, and all 12 opponent first bodies
  were no-lag.
- All **11 opponent later Extrasensory** windows measured the age-142 lag. The policy is no-lag.

So these later bodies render the documented alternate-phase BLDY step: 16 rows, about 17-19k px per row. A context-aware phase (first vs
later body) would be a policy change. That is out of this grant, and the policies are kept as they are.

## Method

1. `later58Scenarios.py` builds the scenarios in `fixtures/later58/scenarios`, 166 in all. It starts from the accepted lab scenarios of
   each move, both attacker sides and two species pairs, and replaces only the foe lead's moves: `qa` Quick Attack x4, `growl` Growl x4,
   `splash` Splash x4. The trace is 3-4 turns, so the move's own earlier body precedes the later bodies. Extra scenarios:
   - Sheer Cold: six more seeds per base, so that a turn-1 miss makes a later hit.
   - Fury Cutter: `*slow` variants, which make the user slower so that its first (counter-1) body follows Growl / Splash.
   - Signal Beam: an opponent-ONIX copy.
   - Memento / Outrage: the mechanic bases keep their ONIX.
2. `later58Probes.sh` runs every scenario twice fresh. `later58Fixtures.py` writes one `liveAdapterFramebuffer` fixture per target body,
   with the prep48DigFixtures recipe:
   - the scenario's own activation / length and the ROM HP;
   - `precedingBodies`: moves, the Growl stat-down as `statAnimation 22`, and `Status_Confusion` as `statusAnimation CONFUSION`;
   - the D4 phase from the window length.
   Fixturing stops at a faint + send-in or at a unit `precedingBodies` cannot carry (Special_ switch, General_ held item). For Fury Cutter
   it also stops after the user's own body, because the order host has no plan there.
3. `later58Check.sh` / `later58Check.ts` run the production renderer under a temporary patch (`fixtures/later58/later58-temp-src-*.diff`,
   reverted). They record:
   - per-age residuals;
   - the D4 phase verdict;
   - from the probe: the registers that differ from S0, the scanline lines that differ from S0, each allocator component vs the same
     scenario's first body, BG maps, lend == ROM `sSpriteOrder`, and the ROM x2.
   At every later activation, the tile bitmap, palette tags, matrix bitmap and tasks equal the first body. Only the tile-tag table differs
   (stale tags; the bitmap decides allocation). BG maps equal the first body. The `lentOrderEqualsRom` mismatches are the harness replay
   without prompt cycles, as in prep48, and the windows are still 0 px.
4. Each move was landed as its own commit: evidence + gate + `tests/animation/later58LiveGates.test.ts`. That test pins ROM RGB sha256 rows
   of two later windows per move (an other-phase window minus its documented rows) and the gate cases. It fails without the gate change
   (3 failed per move, checked by reverting the src hunk).

**Moved pins**, each with its reason in the test comment:
- `liveProfileMoveAdapters` Signal Beam, `liveSheerColdAndFix150`, `liveFaithfulTimingAdapters` Mach Punch gate, `liveQ2Adapters` Sky Attack
  and `livePrep29Adapters` Bonemerang: "a later body declines" → "a later body only on rest-free battlers".
- `liveFaithfulTimingAdapters` route MACH_PUNCH 11/7 HITMONTOP, a later body after Intimidate's stat animation: declined → **active, with
  Scene ON/OFF parity**. This is the parity route through a lifted later body.

## Not lifted

- **Extrasensory, player attacker** (opponent target): all 11 later windows carry an undocumented scanout-split residual. It is 18 px on rows
  95..98 after a Quick Attack alone, where the buffers are still the intro residue, and 54 px to 298k px after other predecessors. This is
  the CPU-phase scanout split (prep30 §1.4), shifted by the history. Not modelled, so it still declines (5 cmds / 805 frames on 0..299).
- **Memento**: the renderer reads the scanline entry (the battle intro's residue). A scanline predecessor such as Psywave changes it, and
  production has no scanline-history input; adding one would mean the order host or a new seam, outside this grant. It is exact after Quick
  Attack, so a "no scanline body yet" input would lift it.
- **Fury Cutter counter 2+**: needs the gComplexPaletteBlend provider (oam1). After the user's own body, production's order lend is unknown
  anyway.
- **Sheer Cold after its own body**: always a KO + send-in, which was not fixtured.

## Reproduce

    export PYTHONPATH=../../vendor/libmgba-py
    python3 tools/integration/later58Scenarios.py                                  # scenarios (byte-identical to the committed ones)
    OUT=/tmp/l58 JOBS=12 sh tools/integration/later58Probes.sh                      # 166 scenarios x2 fresh (~3 min)
    python3 tools/integration/later58Fixtures.py /tmp/l58/r1 /tmp/l58/live          # == fixtures/later58/live
    # the final src has the gates; the fixtures/later58/later58-temp-src-*.diff are the patches the receipts were measured with (on 99493737c)
    OUT=/tmp/l58 JOBS=12 sh tools/integration/later58Check.sh tools/integration/fixtures/later58/live /tmp/l58/check.json
    python3 tools/integration/later58Receipt.py /tmp/l58 /tmp/l58/receipt.json tools/integration/fixtures/later58/check-{signal-beam,mach-punch,sheer-cold,extrasensory,sky-attack,bonemerang,outrage,fury-cutter}.json
    POKEBENCH_LIVE_PROBE_SHARE=1 node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts /tmp/d4.json tools/integration/fixtures/later58/live/mach-punch-*.json
    node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=after.json --commands=after.jsonl
    python3 tools/integration/prep43CensusDelta.py before.json before.jsonl after.json after.jsonl delta.json
