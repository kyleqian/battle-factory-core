# S10A ordinary-play live-share census

How often ordinary Battle Factory play (Scene ON) shows a **live adapter** for a move body vs the **scene-off fallback**, and
which production gate made each fallback. Tooling + evidence only: `tools/integration/liveShareCensus.ts` (driver) and
`tools/integration/liveShareCensusGates.ts` (classifier); no `src/` change, no oracle. Production tree as of master `4efff4321`.

## Latest (2026-10-10 day, production src `4c4fe4c7`, master `bf082c6e1`)

| seeds | commands | live | **live by count** | **live by frames** | faithful-random history (count / frames) |
|---|---:|---:|---:|---:|---|
| 0..999 (`report-seeds0-999-final-20261010-day.json`, sha256 `16e19fb8`; two runs byte-identical) | 27518 | 25809 | **93.79 %** | **97.37 %** | 1,036 / 154,586 (3.76 % / 3.91 %) |
| 50000..50999 (`report-seeds50000-50999-final-20261010-day.json`) | 27041 | 25742 | 95.20 % | 97.18 % | |

Session start (src `06b791ff`): 91.89 % / 95.82 % on seeds 0..999. The day peaked at 94.37 % / 98.18 % (src `d73cf1af`) before two
honest corrections moved wrong live claims back to fallback: every body while a Castform is shown in a weather form (cf78, 54 commands;
ISSUES #143) and Return's order at Factory friendship 0 (ret80, 123 commands; ISSUES #165). Earlier the same day hide66 removed 90 live
commands that had drawn a hidden semi-invulnerable battler. Remaining fallback frames on seeds 0..999 by reason: no adapter (Struggle, not
a rental move) 33,792 (1,056 commands), sprite-order lend unknown 26,027 (129), case-local gates 14,582 (109), Castform weather form 10,116
(58), allocator history unknown 5,145 (52), later-body 4,416 (27), Substitute doll cells ~7.8k. Gameplay command key sequence identical
at every fold. Per-range censuses (`liveShareCensus.ts --seeds=a..b`) number battles per range, so split runs are a DIFFERENT battle set
from one 0..999 run — compare deltas within one split only.

Previous (2026-10-09 day, src `06b791ff`): 91.89 % / 95.82 % on seeds 0..999 (`report-seeds0-999-final-20261009-day.json`).

Earlier (2026-10-09 overnight, src `f7cf9a74`): 87.23 % / 91.13 % on seeds 0..999 (`report-seeds0-999-final-20261009.json`).

The sections below describe the instrument and the first (2026-10-08) results.

## Results (seeds 0..999, 1000 battles; receipts `tools/integration/fixtures/live-share-census/`)

| scope | commands | live | partial | fallback | presented frames | live frames | **live share by count** | **live share by frames** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| all (move-animation + substitute-fade) | 27520 | 19968 | 17 | 7535 | 3770715 | 2833661 | **72.56 %** | **75.15 %** |
| move-animation | 27485 | 19933 | 17 | 7535 | 3767055 | 2830001 | 72.52 % | 75.13 % |
| substitute-fade | 35 | 35 | 0 | 0 | 3660 | 3660 | 100 % | 100 % |
| *different seed set 50000..50999 (all)* | 27042 | 20314 | 18 | 6710 | 3821195 | 2909234 | *75.12 %* | *76.13 %* |

- 1000 battles, 997 reached their terminal boundary, 3 hit the 200000-frame budget in very long battles (seed 434 / streak 21,
  339 player turns; 796 / 34, 369 turns; 881 / 38, 269 turns; all mid-resolution, i.e. stall wars, not hangs; the frames
  presented before the cap are counted). 20644 player turns, 14.44 M battle frames. Seeds 50000..: 999 terminal, 1 at the cap.
- Substitute swaps: 2868 presented swap rows were live (`liveSubstituteSwapView` kind "swap"); 17 commands are **partial**
  (Seismic Toss with a subbed attacker: the swap rows are live, the body falls back on the order-lend gate).
- **(d) sanity:** every 97th live frame (29213 frames; 29993 on the other seed set) was rendered through
  `renderBattleResolutionLiveView` with the production view: **0 throws**.
- **Determinism:** two runs of seeds 0..999 are byte-identical (`sha256 afd335f35e67b6719809e4b1567def300f0149ebc6feccfd7529cc23252e868d`,
  `report-seeds0-999-a.json` == `report-seeds0-999-b.json`; an earlier pair with the first classifier revision was also identical).
- **Stability:** on seeds 50000..50999 the top-10 buckets by frames overlap 9/10 and by count 10/10 (rank columns below), and
  the same seven reasons lead the per-reason table, the top three in the same order (sprite-order lend unknown = 72 % / 75 % of fallback frames).

### Where the fallback frames go (per-reason totals, seeds 0..999; 937054 fallback frames, 7552 non-live commands)

| reason (stage: production gate) | count | fallback frames | % of all presented frames | % of fallback frames | distinct moves | seeds 50000.. frames / count |
|---|---:|---:|---:|---:|---:|---|
| presentation: sprite-order lend unknown | 3840 | 674982 | 17.90 | 72.0 | 77 | 684766 / 3822 |
| presentation: sprite allocator history unknown | 825 | 86237 | 2.29 | 9.2 | 6 | 80771 / 766 |
| presentation: unclassified (case-local gate) | 247 | 62032 | 1.65 | 6.6 | 5 | 55762 / 222 |
| duration: no adapter (no liveMoveAnimationDuration case) | 1058 | 33856 | 0.90 | 3.6 | 8 | 18496 / 578 |
| presentation: later-body (order lend not a first body) | 192 | 33592 | 0.89 | 3.6 | 11 | 30379 / 184 |
| duration: no opponent-attacker adapter | 821 | 26272 | 0.70 | 2.8 | 3 | 19776 / 618 |
| duration: no player-attacker adapter | 222 | 7104 | 0.19 | 0.8 | 1 | 6560 / 205 |
| duration: attacker doll: swap body cell unproven (LIVE_SUBSTITUTE_SWAP_BODY_CELLS) | 106 | 3392 | 0.09 | 0.4 | 7 | 2656 / 83 |
| duration: defender doll: unproven body cell (LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS) | 89 | 2848 | 0.08 | 0.3 | 18 | 1984 / 62 |
| duration: unsupported turn 1 | 64 | 2048 | 0.05 | 0.2 | 1 | 3040 / 95 |
| presentation: battler has a status condition | 9 | 1731 | 0.05 | 0.2 | 2 | 4663 / 24 |
| duration: attacker doll: self-target body | 48 | 1536 | 0.04 | 0.2 | 4 | 992 / 31 |
| presentation: stale move power unknown | 12 | 816 | 0.02 | 0.1 | 1 | 1700 / 25 |
| duration: attacker doll: both battlers shown as dolls | 8 | 256 | 0.01 | 0.0 | 2 | 0 / 0 |
| duration: unsupported turn 0 | 7 | 224 | 0.01 | 0.0 | 1 | 288 / 9 |
| duration: defender doll: other-side body cell (LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS) | 4 | 128 | 0.00 | 0.0 | 1 | 128 / 4 |

**The single big lever is the sprite-order host:** 17.9 % of all presented move frames (72 % of fallback frames, 77 moves)
fall back only because the order lend is absent. The production order host records why it stopped lending
(`spriteOrderEventTransform.ts:256` "no EXACT plan: <unit>", or a survivor / entry rule). Its state at those bodies:

| order host state at the lend-unknown body | count | fallback frames | distinct bodies |
|---|---:|---:|---:|
| no EXACT plan: status animation CONFUSION | 538 | 97356 | 92 |
| 4 survivors: status animation PRZ | 294 | 61394 | 67 |
| no EXACT plan: body 202:player | 191 | 38517 | 23 |
| no EXACT plan: body 91:opponent | 202 | 26597 | 26 |
| no EXACT plan: general animation WEATHER_VAR | 162 | 26336 | 53 |
| no EXACT plan: general animation RAIN_CONTINUES | 140 | 25510 | 39 |
| no EXACT plan: body 202:opponent | 104 | 22013 | 24 |
| no EXACT plan: body 91:player | 164 | 21447 | 18 |
| no EXACT plan: body 280:player | 98 | 18331 | 31 |
| no EXACT plan: general animation LEECH_SEED_DRAIN | 83 | 16943 | 34 |
| command resolution without an action prompt | 74 | 13579 | 20 |
| return to ball | 73 | 12772 | 26 |

(Each row is the host's `tracker.invalidReason` when the lend-unknown body presented: the reason the host recorded when it
stopped lending.) The CONFUSION status animation, PRZ (4 survivors), the Giga Drain / Dig bodies and WEATHER_VAR /
RAIN_CONTINUES rows together cover ~319k frames (≈ 8.5 % of all presented frames).

### (b) Top-25 fallback buckets by frames

| # | move | side | reason | gate | fallback frames | count | Factory weight % | rank on seeds 50000.. | order-host state (top) |
|---|---|---|---|---|---:|---:|---:|---:|---|
| 1 | DOUBLE TEAM | player | sprite-order lend unknown | `liveMoveAnimation.ts:2638` | 58880 | 256 | 1.72 | 1 | 41x order host: no EXACT plan: status animation CONFUSION; 40x order host: 4 survivors: status animation PRZ |
| 2 | GIGA DRAIN | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:2591` | 41400 | 180 | 1.375 | 4 | 42x order host: no EXACT plan: body 202:opponent; 26x order host: no EXACT plan: status animation CONFUSION |
| 3 | DIG | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:3041` | 38593 | 293 | 0.75 | 3 | 117x order host: no EXACT plan: body 91:opponent; 20x order host: no EXACT plan: body 19:opponent |
| 4 | DIG | player | sprite-order lend unknown | `liveMoveAnimation.ts:3041` | 29760 | 221 | 0.75 | 5 | 109x order host: no EXACT plan: body 91:player; 23x order host: no EXACT plan: general animation WEATHER_VAR |
| 5 | PROTECT | opponent | sprite allocator history unknown | `liveMoveAnimation.ts:1498` | 28659 | 233 | 1.153 | 7 |  |
| 6 | ICY WIND | player | unclassified (case-local gate) | `liveMoveAnimation.ts:1786` | 28413 | 99 | 0.621 | 8 |  |
| 7 | PROTECT | player | sprite allocator history unknown | `liveMoveAnimation.ts:1498` | 26568 | 216 | 1.153 | 6 |  |
| 8 | GIGA DRAIN | player | sprite-order lend unknown | `liveMoveAnimation.ts:2591` | 24380 | 106 | 1.375 | 2 | 45x order host: no EXACT plan: body 202:player; 11x order host: no EXACT plan: general animation LEECH_SEED_DRAIN |
| 9 | THUNDERBOLT | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:2477` | 22989 | 97 | 1.618 | 10 | 26x order host: 4 survivors: status animation PRZ; 9x order host: no EXACT plan: status animation CONFUSION |
| 10 | ICE BEAM | player | sprite-order lend unknown | `liveMoveAnimation.ts:2789` | 20909 | 103 | 1.98 | 11 | 17x order host: 4 survivors: status animation PRZ; 11x order host: no EXACT plan: status animation CONFUSION |
| 11 | ICE BEAM | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:2789` | 20300 | 100 | 1.98 | 12 | 19x order host: 4 survivors: status animation PRZ; 13x order host: no EXACT plan: body 202:player |
| 12 | THUNDERBOLT | player | sprite-order lend unknown | `liveMoveAnimation.ts:2477` | 18012 | 76 | 1.618 | 20 | 16x order host: 4 survivors: status animation PRZ; 11x order host: no EXACT plan: status animation CONFUSION |
| 13 | WATER PULSE | player | sprite-order lend unknown | `liveMoveAnimation.ts:3148` | 17760 | 111 | 0.471 | >25 | 19x order host: no EXACT plan: body 189:player; 18x order host: no EXACT plan: status animation CONFUSION |
| 14 | STRUGGLE | opponent | no adapter (no liveMoveAnimationDuration case) | `liveMoveAnimation.ts:1191` | 17376 | 543 | 0 | 18 |  |
| 15 | DOUBLE TEAM | opponent | no opponent-attacker adapter | `liveMoveAnimation.ts:1080` | 16800 | 525 | 1.72 | 17 |  |
| 16 | STRUGGLE | player | no adapter (no liveMoveAnimationDuration case) | `liveMoveAnimation.ts:1191` | 16256 | 508 | 0 | >25 |  |
| 17 | CURSE | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:3271` | 13376 | 76 | 0.521 | 16 | 13x order host: no EXACT plan: status animation CONFUSION; 8x order host: no EXACT plan: general animation WEATHER_VAR |
| 18 | PETAL DANCE | player | sprite-order lend unknown | `liveMoveAnimation.ts:2049` | 13176 | 54 | 0.253 | 15 | 15x order host: no EXACT plan: status animation CONFUSION; 7x order host: no EXACT plan: body 210:player |
| 19 | SILVER WIND | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:3205` | 12936 | 66 | 0.517 | >25 | 14x order host: no EXACT plan: status animation CONFUSION; 5x order host: no EXACT plan: body 240:player |
| 20 | PETAL DANCE | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:2049` | 12200 | 50 | 0.253 | 13 | 19x order host: command resolution without an action prompt; 8x order host: no EXACT plan: status animation CONFUSION |
| 21 | BLIZZARD | opponent | unclassified (case-local gate) | `liveMoveAnimation.ts:1786` | 10830 | 30 | 0.369 | 21 |  |
| 22 | WATER PULSE | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:3148` | 10720 | 67 | 0.471 | 22 | 13x order host: no EXACT plan: body 189:opponent; 11x order host: no EXACT plan: general animation TURN_TRAP |
| 23 | SEISMIC TOSS | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:2477` | 10253 | 45 | 0.248 | >25 | 16x order host: no EXACT plan: body 202:player; 10x order host: no EXACT plan: general animation SUBSTITUTE_FADE |
| 24 | HEAL BELL | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:1896` | 10179 | 39 | 0.142 | >25 | 9x order host: return to ball; 6x order host: 4 survivors: status animation PRZ |
| 25 | ICY WIND | opponent | unclassified (case-local gate) | `liveMoveAnimation.ts:1786` | 9471 | 33 | 0.621 | >25 |  |

### (b) Top-25 fallback buckets by count

| # | move | side | reason | gate | count | fallback frames | Factory weight % | rank on seeds 50000.. |
|---|---|---|---|---|---:|---:|---:|---:|
| 1 | STRUGGLE | opponent | no adapter (no liveMoveAnimationDuration case) | `liveMoveAnimation.ts:1191` | 543 | 17376 | 0 | 2 |
| 2 | DOUBLE TEAM | opponent | no opponent-attacker adapter | `liveMoveAnimation.ts:1080` | 525 | 16800 | 1.72 | 1 |
| 3 | STRUGGLE | player | no adapter (no liveMoveAnimationDuration case) | `liveMoveAnimation.ts:1191` | 508 | 16256 | 0 | 10 |
| 4 | DIG | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:3041` | 293 | 38593 | 0.75 | 4 |
| 5 | DOUBLE TEAM | player | sprite-order lend unknown | `liveMoveAnimation.ts:2638` | 256 | 58880 | 1.72 | 3 |
| 6 | FAINT ATTACK | opponent | no opponent-attacker adapter | `liveMoveAnimation.ts:1045` | 243 | 7776 | 0.952 | 9 |
| 7 | PROTECT | opponent | sprite allocator history unknown | `liveMoveAnimation.ts:1498` | 233 | 28659 | 1.153 | 6 |
| 8 | ROCK SLIDE | player | no player-attacker adapter | `liveMoveAnimation.ts:1059` | 222 | 7104 | 2.117 | 7 |
| 9 | DIG | player | sprite-order lend unknown | `liveMoveAnimation.ts:3041` | 221 | 29760 | 0.75 | 8 |
| 10 | PROTECT | player | sprite allocator history unknown | `liveMoveAnimation.ts:1498` | 216 | 26568 | 1.153 | 5 |
| 11 | GIGA DRAIN | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:2591` | 180 | 41400 | 1.375 | 12 |
| 12 | WATER PULSE | player | sprite-order lend unknown | `liveMoveAnimation.ts:3148` | 111 | 17760 | 0.471 | 25 |
| 13 | GIGA DRAIN | player | sprite-order lend unknown | `liveMoveAnimation.ts:2591` | 106 | 24380 | 1.375 | 11 |
| 14 | ICE BEAM | player | sprite-order lend unknown | `liveMoveAnimation.ts:2789` | 103 | 20909 | 1.98 | 13 |
| 15 | ICE BEAM | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:2789` | 100 | 20300 | 1.98 | 14 |
| 16 | ICY WIND | player | unclassified (case-local gate) | `liveMoveAnimation.ts:1786` | 99 | 28413 | 0.621 | 17 |
| 17 | THUNDERBOLT | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:2477` | 97 | 22989 | 1.618 | 15 |
| 18 | LIGHT SCREEN | player | sprite allocator history unknown | `liveMoveAnimation.ts:1488` | 82 | 7216 | 0.814 | 16 |
| 19 | MUD-SLAP | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:3103` | 79 | 4029 | 0.539 | >25 |
| 20 | THUNDERBOLT | player | sprite-order lend unknown | `liveMoveAnimation.ts:2477` | 76 | 18012 | 1.618 | >25 |
| 21 | CURSE | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:3271` | 76 | 13376 | 0.521 | 19 |
| 22 | MUD-SLAP | player | sprite-order lend unknown | `liveMoveAnimation.ts:3103` | 68 | 3468 | 0.539 | 23 |
| 23 | WATER PULSE | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:3148` | 67 | 10720 | 0.471 | 22 |
| 24 | SILVER WIND | opponent | sprite-order lend unknown | `liveMoveAnimation.ts:3205` | 66 | 12936 | 0.517 | >25 |
| 25 | LIGHT SCREEN | opponent | sprite allocator history unknown | `liveMoveAnimation.ts:1488` | 63 | 5544 | 0.814 | 20 |

Factory weight = fraction of Level-50 Factory move slots (ranges 0..6, 4 moves per set; the
`tools/integration/remainingAdaptersCensus.mjs` model). STRUGGLE has weight 0 (never a rental move) but is common here
because the policy cycles all four slots until PP runs out in long battles.

## What the top buckets would need (gate -> lever -> evidence)

| buckets | gate (production) | what would make them live | evidence / prior work |
|---|---|---|---|
| Double Team (player), Giga Drain, Thunderbolt, Ice Beam, Water Pulse, Curse, Petal Dance, Silver Wind, Seismic Toss, Heal Bell, Mud-Slap (lend unknown) | `liveMoveAnimation.ts:2638 / 2591 / 2477 / 2789 / 3148 / 3271 / 2049 / 3205 / 1896 / 3103` `if (!spriteOrderInput?.known) return null` | EXACT order-host plans for the invalidating units in the table above (CONFUSION, PRZ survivors, WEATHER_VAR, RAIN_CONTINUES, LEECH_SEED_DRAIN, TURN_TRAP, return to ball, bodies 202 / 91 / 280 / 240 / 189) in `spriteOrderEventTransform.ts` (`no EXACT plan` at :256) | `docs/sprite-order-body-plans.md`, `docs/sprite-order-gap-causes.md`, `docs/sprite-order-plan-gaps-28.md`, `docs/sprite-order-plan-coverage.md` |
| Dig (both sides) | `liveMoveAnimation.ts:3041` (`!spriteOrderInput` / `afterDigSetup` / `firstBody`) | the Dig body (91) itself invalidates the host ("no EXACT plan: body 91:<side>" is the host state at 117 + 109 of the 514 Dig lend-unknown commands), so the unleash never gets `afterDigSetup`; an EXACT plan for the Dig setup unit, then the first-body rule (64 later-body commands) | `docs/s10a-random2-order-lend-blocker.md`, prep18 s1.1 (comment at `liveMoveAnimation.ts:3036`) |
| Protect, Light Screen, Reflect, Barrier, Magic Coat, Mirror Coat | `liveMoveAnimation.ts:1498 / 1488` `if (!spriteAllocatorInput?.historyKnown) return null` | a move body without an allocator PLAN (and not net-zero) invalidates the allocator host (`liveMoveSpriteAllocator.ts:84-88`); plans for the bodies that drop it | `docs/allocator-plan-v2-evidence.md`, `docs/allocator-net-zero-audit.md`, `docs/allocator-net-zero-audit-ext.md` |
| Icy Wind, Blizzard (unclassified) | `liveMoveAnimation.ts:1785-1786` `!provableEffectOrder(...)` (module-private, so the classifier cannot evaluate it and leaves it unclassified) | per its comment (`liveMoveAnimation.ts:645-651`): the OAM slot table is proven only at the accepted geometry; other species pairs need the CreateSprite/SortSprites order proven (`icyWind.ts:257`, `blizzard.ts:562`) | accepted Icy Wind / Blizzard windows (duration comments `liveMoveAnimation.ts` case 196 / 59) |
| Double Team (opponent), Faint Attack (opponent), Rock Slide (player) | `liveMoveAnimation.ts:1080 / 1045 / 1059` (side-only duration cases) | the missing attacker side's accepted window | `docs/double-team-portable-staging-probe.md`, `docs/faint-attack-portable-staging-probe.md`, `docs/rock-slide-portable-staging-probe.md` |
| Struggle | no `liveMoveAnimationDuration` case (`default: return null` at `liveMoveAnimation.ts:1190`; the receipt cites the switch's closing line :1191) | a Struggle adapter (1051 commands / 33.6k frames here; weight 0 in rentals) | none found |
| Return, Pursuit, Extrasensory, Mach Punch, Signal Beam, Sheer Cold, Fury Cutter, Memento, Sky Attack, Bonemerang | `firstBody` gates (`liveMoveAnimation.ts:3335 / 3296 / 3555 / 2965 / 2871 / 2885 / 3317 / 2232 / 2901 / 2916`) | later-body BG / scanline history (192 commands, 33.6k frames) | `docs/s10a-random2-order-lend-blocker.md`, `ANIMATION_INTEGRATION_PROGRESS.md` prep notes |
| Dive turn 1, Curse (Ghost) turn 0 | duration cases 291 / 174 (`unsupported turn`) | the Dive attack body / Curse Ghost branch (71 commands) | comments at the duration cases |
| Substitute | `liveSubstituteSwap.ts:170-173`, `liveMoveAnimation.ts:780-788` | more swap body cells (Dream Eater, Solar Beam, Lovely Kiss, Focus Punch, Grass Whistle, Sing) and defender-doll cells (18 moves, 89 commands) | `docs/next-adapters-prep37.md`, `prep38.md`, `tools/integration/fixtures/dolldef-live-receipt.json` |

## Faithful-random history (S10A words46)

After a Random2-words order unit (Sand-Attack, Mud-Slap, Rain Dance, RAIN_CONTINUES) the order host lends a word-free deferred
marker to any consumer. The render seam resolves it with that unit's surrogate presentation words
(docs/next-adapters-prep46.md, `liveWordsUnitPostFree` in `src/engine/liveMoveAnimation.ts`). Such a command is live, but its order history is
**faithful random** (ANIMATION_VERIFICATION.md D3), not scoped exact:

- Per frame, the census reads the production presentation's `faithfulRandomHistory` flag. It is set only when the adapter read
  the resolved lend.
- `faithfulRandomHistoryFrames` is recorded on each command.
- `overall.faithfulRandomHistory` reports `commands` (live commands with the flag), `frames`, both shares, and the live share
  without them.
- These commands remain in `live` / `liveFrames`. The bucket is a separate claim beside them, not a subtraction from the census.

Seeds 0..299, master `553cef6b5` vs words46 (`tools/integration/fixtures/words46/census/`):

| | live by count | live by frames | faithful-random history |
|---|---|---|---|
| `553cef6b5` | 6884 / 7970 = 86.37 % | 1013245 / 1168273 = 86.73 % | (no flag) |
| words46 | 7023 = 88.12 % (+139) | 1034572 = 88.56 % (+21,327) | 128 commands (1.61 %) / 21,283 frames (1.82 %) |

- There are 0 live -> fallback regressions and 0 pairing mismatches, and the battle digest is identical.
- 121 of the 139 newly live commands are in the bucket.
- The other 18 are Mud-Slap bodies made live by the slide-helper seed. Mud-Slap is a faithful-random adapter already.
- 7 commands that were live before (Flamethrower 4, Rock Slide 3) read the resolved lend now, so they moved into the bucket.

## Method

- **Battles.** Battle *i* uses `seed = from + i`, `streak = (i * 11) % 49` (every streak 0..48, challenges 0..6, ~20 battles
  each), generated rentals 0..2, `playerTrainerId 416049562`, Scene ON, through the production orchestrator
  (`createFactoryRoundBattleOrchestrator` / `advanceFactoryRoundBattle*`, as `generatedCommandAnimationReplay.ts`), plus
  `core.ts` tick's presentation seam (`tickLiveMovePresentationRngSession` with the default-seed session, fresh per battle;
  the view is built with `rng.host` as `core.ts` render does), so faithful-random adapters (Rain Dance, ...) get their host.
- **Input policy (ordinary controller input only).** At each action menu: A (FIGHT), then the least-used **legal** slot
  (`legalMoveBySlot`, ties to the lowest), cursor moves + A. Messages are dismissed with A, forced replacements answered with
  the first healthy member (the existing selector rule). Played to the terminal boundary (no owner left) or the frame budget.
- **Live / fallback per frame** is decided exactly as `renderBattleResolutionLiveView` does: `liveSubstituteSwapView` (swap
  rows = live), else `liveMoveAnimationPresentation(...)` on the (swap) view's effect inputs; a substitute-fade frame is live
  when the view has the fade effect and `substituteFadeRenderView` is non-null. A command is live / partial / fallback by
  its frames.
- **Decline reasons (production predicates, in production order).** Duration null: `liveSubstituteSwapApplies` (its four
  conjuncts in source order), `liveMoveSubstituteDollDeclines`, then the duration switch: no case = "no adapter"; a case that
  returns null is attributed to the request field whose flip makes the production `liveMoveAnimationDuration` non-null
  (attacker side, turn, rollout counter, power), else "unclassified duration null" (none occurred in the final runs).
  Presentation null: the move case's `if (...) return null` gates, read from the production source in order, each disjunct
  evaluated on the actual inputs with only the function's parameters, its pre-switch consts and the case's own base-level
  single-line consts in scope. A gate that needs anything else (a module-private helper, a case-local value) or sits inside
  a branch is **opaque**: the walk stops and the command is "unclassified" with that gate's line (247 commands, all Icy
  Wind / Blizzard `provableEffectOrder`, Flatter `rng` words, Mud-Slap draws, Ice Ball counter). Nothing is guessed.
- The "order host" detail is read from the production order host (`state.liveMoveSpriteAllocatorHost.orderHost.tracker`).

## Commands

```
# 1000 battles, ~8 min each (run in parallel: ~8 min wall)
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..999 \
  --out=tools/integration/fixtures/live-share-census/report-seeds0-999-a.json
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..999 \
  --out=tools/integration/fixtures/live-share-census/report-seeds0-999-b.json
cmp tools/integration/fixtures/live-share-census/report-seeds0-999-{a,b}.json   # byte-identical
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=50000..50999 \
  --out=tools/integration/fixtures/live-share-census/report-seeds50000-50999.json
# optional: --commands=<file.jsonl> writes every classified command (not committed; ~27k lines)
```

`tools/` is outside the `tsconfig.json` include (`src`, `tests`), so `npm run typecheck` does not cover these scripts; they run
under `node --experimental-strip-types`. Checked separately with the project's strict options (exit 0, no diagnostics): a temp
tsconfig outside the repo that `extends` the workspace `tsconfig.json` with `"files"` = the two scripts, then
`NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc -p <that tsconfig>`.

## Limitations

- One input policy (cycle all four legal slots); real players pick moves differently, so per-move counts (and Struggle) are
  policy-weighted. The Factory weight column gives the rental-slot prior for comparison.
- Battle 1 of a challenge only per seed (fresh orchestrator per battle; streak drives the opponent tier), default presentation
  seed, both rentals and opponents generated; the lend / allocator histories therefore start at the battle entry each time.
- Opaque gates are reported, not resolved (the Icy Wind / Blizzard bucket is "unclassified" by design).
