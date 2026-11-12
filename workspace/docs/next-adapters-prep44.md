# S10A prep44 — sprite ALLOCATOR history gaps: which units invalidate the host, and which can stop doing it

Evidence only (side lane, new files only). Question: for each "sprite allocator history unknown" decline (Protect, Light Screen,
Reflect, Barrier, Magic Coat, Mirror Coat; gate `liveMoveAnimation.ts` `if (!spriteAllocatorInput?.historyKnown) return null`),
which earlier unit invalidated the production allocator host, and does a PLAN or a NET-ZERO proof exist for it? Measured with a
TEMPORARY production patch (kept as `.diff`, reverted before every commit). Master `c99c8c6bd` (src tree `e3fc2240`).

## Results

**Census delta, seeds 0..299 (300 battles, 7970 paired commands, same seeds and driver without / with the patch). Command
sequence is identical: 0 pairing mismatches and an identical battle digest (4,093,242 frames, 5,756 player turns). 0 live → fallback
regressions.**

| patch | ids added to `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS` | live by count | live by frames | allocator-unknown declines |
|---|---|---|---|---|
| master | — | 6499 / 7970 = **81.54 %** | 936788 / 1168273 = **80.19 %** | 232 cmds / 24987 frames |
| tier 1 (`prep44-temp-src.diff`) | 21 | 6530 = 81.93 % (+31) | 939992 = 80.46 % (+3204) | 201 / 21783 |
| tier 1+2 (`prep44-temp-src-tier2.diff`) | 50 | **6574 = 82.48 % (+75)** | **944805 = 80.87 % (+8017)** | 157 / 16970 (−32 %) |

**Main finding: the cause is CHAINS, not single units.** The production allocator host never recovers from an invalidation
except at a reseedable send-out. A decline therefore goes live only when *every* invalidating unit since the host was last
known stops invalidating. Only 38 of 232 declines have a single-unit chain. Chain lengths: 1:38, 2:56, 3:33, 4:24, 5:18, 6:19,
7:16, 8:9, 9..13:19 (`chains-before-seeds0-299.json`). The "first invalidator" ranking requested by the step (below) is a
poor predictor of gain. Clearing FOLLOW ME, the top unit at 2290 frames, alone unlocks 246 frames, because FAKE TEARS or
SAND-ATTACK earlier in the chain takes over. The chain predictor ("live iff chain ⊆ cleared set", `prep44Chains.py
--cleared`) equals the measured census delta exactly for both patches: 31 / 3204 and 75 / 8017.

### (1) Ranked first-invalidating units (master, seeds 0..299; `census-before-seeds0-299.json` `allocatorInvalidatingUnits`)

| # | unit (the unit that took the host known → unknown) | fallback frames | commands | verdict |
|---|---|---:|---:|---|
| 1 | body FOLLOW ME | 2290 | 19 | **NET-ZERO** |
| 2 | body DOUBLE TEAM | 1599 | 13 | **NET-ZERO** |
| 3 | status animation SLP | 1406 | 13 | NOT AUDITED (status-animation path, see below) |
| 4 | status animation CONFUSION | 1321 | 14 | NOT AUDITED |
| 5 | body ICE BEAM | 1316 | 11 | **NET-ZERO** |
| 6 | body DRAGONBREATH | 1183 | 10 | **NET-ZERO** |
| 7 | body AERIAL ACE | 869 | 10 | **NET-ZERO** |
| 8 | body QUICK ATTACK | 809 | 8 | **NET-ZERO** |
| 9 | body ROCK SLIDE | 756 | 7 | **NET-ZERO** |
| 10 | body COSMIC POWER | 668 | 6 | **NET-ZERO** |
| 11 | status animation PSN | 656 | 6 | NOT AUDITED |
| 12 | body ICY WIND | 654 | 6 | **NET-ZERO** |
| 13 | body WATER PULSE | 615 | 5 | **NET-ZERO** |
| 14 | body BOUNCE | 580 | 5 | **NET-ZERO** (both bodies of the two-turn move) |
| 15 | body THUNDERBOLT | 565 | 7 | **NET-ZERO** |

Totals by family: move bodies with no plan and not in the net-zero list: 196 cmds / 21235 frames (52 distinct bodies).
Status animations (SLP, CONFUSION, PSN, BRN): 34 / 3506. Party-summary command: 2 / 246. Most of the bodies are moves
that became live (or ordinary-play reachable) **after** the 110-id net-zero audit. The list's own comment says such moves
"must not be added here until they are" audited; nobody had audited them.

### (2) Per-unit verdicts (`net-zero-audit.json`)

**NET-ZERO (50 bodies)**, each in both orientations, two fresh direct-mGBA processes per scenario, all 103 raw pairs
byte-identical. Every body has baseline == end == `[0,1,2,6,8,60,61,62,63]` (the known entry) and created == destroyed
(`docs/allocator-net-zero-audit.md` definition, unchanged probe `tools/compare/allocatorNetZeroProbe.py`). A second
independent `prep44Run.sh` probe run reproduced `net-zero-audit.json` byte-identically.
- tier 1 (census rank): 24 DOUBLE_KICK, 57 SURF, 58 ICE_BEAM, 60 PSYBEAM, 73 LEECH_SEED, 85 THUNDERBOLT, 89 EARTHQUAKE,
  98 QUICK_ATTACK, 104 DOUBLE_TEAM, 157 ROCK_SLIDE, 185 FAINT_ATTACK, 189 MUD_SLAP, 196 ICY_WIND, 203 ENDURE, 225 DRAGONBREATH,
  240 RAIN_DANCE, 263 FACADE, 266 FOLLOW_ME, 322 COSMIC_POWER, 332 AERIAL_ACE, 352 WATER_PULSE.
- tier 2 (chain involvement): 19 FLY, 28 SAND_ATTACK, 35 WRAP, 52 EMBER, 53 FLAMETHROWER, 59 BLIZZARD, 80 PETAL_DANCE,
  86 THUNDER_WAVE, 91 DIG, 129 SWIFT, 133 AMNESIA, 142 LOVELY_KISS, 173 SNORE, 184 SCARY_FACE, 202 GIGA_DRAIN, 212 MEAN_LOOK,
  219 SAFEGUARD, 226 BATON_PASS, 236 MOONLIGHT, 250 WHIRLPOOL, 258 HAIL, 273 WISH, 282 KNOCK_OFF, 291 DIVE, 313 FAKE_TEARS,
  315 OVERHEAT, 317 ROCK_TOMB, 340 BOUNCE, 345 MAGICAL_LEAF.
  Two-turn moves (Dig, Fly, Dive, Bounce): both bodies are audited and net-zero.
- Scenarios: existing accepted battle-lab scenarios, plus 2 staged by `prep44Stage.py` (`fixtures/prep44/scenarios/`):
  - Dragonbreath opponent: the accepted trace ends before cleanup (row `window-incomplete`), so the idle tail is lengthened from
    500 to 900 frames.
  - Rock Slide opponent: the accepted player scenario's two complete legal `overrides.parties` swapped.

**NOT AUDITED:**
- 248 FUTURE_SIGHT. The probe measured only the setup body (net-zero). The delayed hit never activates inside the window,
  so 248 is **excluded from the patch** even though the receipt's summary lists it.
- Status animations SLP / CONFUSION / PSN / PRZ / BRN / FRZ. These invalidate through the `crossedUnknownGraphics` path
  (`factoryRoundBattleOrchestrator.ts:2391`), not through `prepareLiveMoveSpriteAllocator`. A proof needs a status-animation
  probe keyed on the status script, not `sAnimMoveIndex`, plus a production hook in that path. After the patch they are
  the largest remaining auditable family: greedy SLP + CONFUSION + PSN = 39 cmds / 4428 frames.
- SEISMIC TOSS, ICE BALL, PERISH SONG and the long tail (≤ 3 cmds each after the patch).

**BLOCKED (not an allocator question):** `command party-summary` + `command switch-in`, 61 cmds / 6679 frames involved,
never solo. These are post-KO send-outs where `reseedLiveSpriteAllocatorAfterSendOut` declined because
`liveSpriteAllocatorReseedable(orderHost)` was false. The fix lives in the order host (prep43 scope), not here. The same
holds for `forced switch-in (allocator not reseedable)`: 4 cmds / 413 frames.

**PLAN:** none needed. Every audited unit is net-zero, so no allocator PLAN (the wall-family slot format) is required. The
six PLANS consumers are unchanged. The tie-audit license (`docs/allocator-consumer-tie-audit.md`) covers those consumers
regardless of which net-zero bodies preceded them.

### (3) Patch shape

`src/engine/liveMoveSpriteAllocator.ts:64` (end of `LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS`): append the 50 ids, with a
comment citing `tools/integration/fixtures/prep44/net-zero-audit.json` (`fixtures/prep44/prep44-temp-src-tier2.diff`; tier 1
alone: `prep44-temp-src.diff`). A production fold must also:
- update the pin in `tests/liveSpriteAllocator.test.ts:161-164`. It asserts the list equals the union of the two earlier
  receipts; extend that union with this receipt's NET-ZERO ids minus 248.
- reword the list's doc comment ("Live move ids ... at the time of the audit").

Residual after the patch (`chains-after-all-seeds0-299.json`): 157 declines / 16970 frames. Chain lengths 1:62, 2:36, 3:41,
4:9, 5:7, 8:1, 9:1. Greedy next steps: status animations SLP → CONFUSION → PSN (cumulative 39 / 4428), FUTURE SIGHT's hit,
PRZ, SEISMIC TOSS, ICE BALL, BRN, the forced switch-in reseed, PERISH SONG (59 / 6534 total).

## Instrument

`tools/integration/prep44AllocatorCensus.ts` is a copy of `liveShareCensus.ts`'s driver; that script runs at import and exports
nothing, so it cannot be imported. The copy keeps the same CLI, policy and report, and adds:
- a per-step tracker of `state.liveMoveSpriteAllocatorHost.host.historyKnown`. On the known → unknown step it records the unit
  in the orchestrator's own reason order:
  - a body with no plan and not net-zero (`liveMoveSpriteAllocator.ts:84-88`)
  - a switch-out / switch-in / party-summary / trainer-slide / recall command (`factoryRoundBattleOrchestrator.ts:2374-2379`)
  - crossed or trailing status-animation events (`:2391`)
  - a party-menu open (`:2953`)
  - a forced switch-in that is not reseedable (`:2256`)
- a shadow of the same rules with a private event cursor, which records every later unit while the host stays unknown (the
  chain). The chain resets whenever the host is known again (reseed).

Each allocator decline carries `decline.detail = "allocator: <first unit>"` and `allocatorChain`. The report adds
`allocatorInvalidatingUnits` and `allocatorInvalidationsAll`. The master report's content equals `liveShareCensus.ts`'s, apart
from these additions and the schema name. Overall 81.54 % / 80.19 % on seeds 0..299.

## Reproduce

    OUT=/tmp/p44-repro REC=/tmp/p44-rec sh tools/integration/prep44Run.sh   # ~7 min; SKIP_PROBES=1 / SKIP_CENSUS=1
    # prints "same <file>" for every receipt in tools/integration/fixtures/prep44/; src is applied from the .diff and reverted

Files:
- `prep44AllocatorCensus.ts`: instrument
- `prep44Chains.py`: chain ranking and prediction
- `prep44Probe.py`: job list; runs the probe twice fresh per job
- `prep44Extract.py`: receipt
- `prep44Stage.py`: 2 staged scenarios
- `prep43CensusDelta.py`: pairing and delta (existing, unchanged)
