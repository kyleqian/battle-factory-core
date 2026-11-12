# S10A prep50 — sprite ALLOCATOR history after STATUS ANIMATIONS (and the post-KO reseed)

Evidence only (side lane, new files only). The question: on today's production, which units leave the production allocator host
unknown? Can the status animations (SLP, CONFUSION, PSN, PRZ, BRN) stop invalidating it? Does tonight's order-host work let
the post-KO send-out reseed the host in the census's cases? Measured with a TEMPORARY production patch (kept as `.diff`,
reverted before every commit). Master `eb3ae0163` (production src tree `f1f2de08`).

## Results

**Census delta, seeds 0..299 (300 battles, 7970 paired commands, same seeds and driver without / with the patch). Command
sequence is identical: 0 pairing mismatches and an identical battle digest (`069618f1…`, 4,093,168 frames, 5,756 player turns).
0 live → fallback regressions.**

| src | live by count | live by frames | allocator-unknown declines |
|---|---|---|---|
| master `eb3ae0163` | 7333 / 7970 = **92.01 %** | 1090865 / 1168196 = **93.38 %** | 147 cmds / 15787 frames |
| + status patch (`prep50-temp-src.diff`) | **7388 = 92.70 % (+55)** | **1097167 = 93.92 % (+6302)** | 92 / 9485 (−40 % of the allocator frames) |

The chain predictor (`prep50Chains.py --cleared-status SLP,CONFUSION,PSN,PRZ,BRN`, "live iff chain ⊆ cleared set") predicts
**55 commands / 6302 frames**. That equals the measured delta exactly, as it did for prep44.

### (1) Ranking on master (`fixtures/prep50/chains-before-seeds0-299.json`, `census-before-seeds0-299.json`)

147 declines / 15787 frames. Chain lengths: 1:77, 2:35, 3:25, 4:3, 5:5, 8:1, 9:1. prep44's 50 net-zero bodies have landed,
so chains are much shorter than prep44's (prep44 had 38 single-unit chains of 232). Greedy chain-clearing order (cumulative
unlock):

| step | unit | cumulative cmds | cumulative frames | involvement (cmds / frames) | solo |
|---:|---|---:|---:|---|---|
| 1 | status animation **SLP** | 28 | 3321 | 36 / 4141 | 28 / 3321 |
| 2 | status animation **CONFUSION** | 38 | 4281 | 30 / 2891 | 10 / 960 |
| 3 | status animation **PSN** | 49 | 5564 | 15 / 1599 | 6 / 668 |
| 4 | body FUTURE SIGHT (the delayed hit, not audited) | 57 | 6172 | 11 / 860 | 5 / 380 |
| 5 | status animation **PRZ** | 60 | 6541 | 19 / 2223 | 3 / 369 |
| 6 | status animation **BRN** | 63 | 6910 | 5 / 580 | 3 / 369 |
| 7 | body SEISMIC TOSS | 66 | 7232 | | |
| 8 | body ICE BALL | 69 | 7529 | | |
| 9 | status animation FRZ (not audited) | 71 | 7775 | 4 / 448 | 2 / 246 |
| 10 | forced switch-in (allocator not reseedable) | 73 | 8021 | 4 / 413 | 1 / 123 |
| 11+ | long tail of bodies (PERISH SONG, LEAF BLADE, ICE PUNCH, FRUSTRATION, FORESIGHT, SWAGGER, ...), about 2 cmds each | | | | |

Post-KO units never appear solo: `command switch-in` 33 / 3552 and `command party-summary` 32 / 3466 are involved only. By
*first* invalidating unit (`allocatorInvalidatingUnits`): SLP 34 / 3989, CONFUSION 20 / 1918, party-summary 12 / 1284, PSN 10
/ 1078, PRZ 8 / 984, FUTURE SIGHT 6 / 468, then bodies with ≤ 4 commands each.

### (2) Per-unit verdicts

**NET-ZERO: SLP, CONFUSION, PSN, PRZ, BRN** (`fixtures/prep50/status-net-zero-audit.json`). For each, every complete
status-script body, on BOTH sides, has baseline == end == the known entry `[0,1,2,6,8,60,61,62,63]` and created ==
destroyed, with no occupied-set change in the 8 frames after cleanup. That is the `docs/allocator-net-zero-audit.md`
definition. Each of 35 scenario jobs ran twice in fresh direct-mGBA processes, and all 35 pairs are byte-identical. A second
independent `prep50Run.sh` run reproduced the receipt byte-identically.

| status (ROM script, `data/battle_anim_scripts.s`) | ELF | bodies player / opponent | created / destroyed per body | afflicted species (scenarios) |
|---|---|---|---|---|
| SLP `Status_Sleep` :10260 (2× `createsprite gSleepLetterZSpriteTemplate`) | 0x82d7df3 | 6 / 6 | 2 / 2 | Onix (Lovely Kiss, Hypnosis, both orientations), Sealeo (Snore, both) |
| CONFUSION `Status_Confusion` :10230 (`call ConfusionEffect`) | 0x82d7d85 | 6 / 8 | 5 / 5 | Onix (Confuse Ray, Supersonic, Sweet Kiss, both), Golem (Teeter Dance, opponent) |
| PSN `Status_Poison` :10224 (shake + `blend_color_cycle`; no sprite) | 0x82d7d5a | 7 / 8 | 0 / 0 | Onix (Toxic, both), Shuckle (Water Spout tiers + Toxic, both) |
| PRZ `Status_Paralysis` :10268 (`call ElectricityEffect`) | 0x82d7e1f | 3 / 3 | 16 / 16 | Onix (Stun Spore, both), Shuckle (Thunder Wave, both; Glare, both) |
| BRN `Status_Burn` :10235 (3× `call BurnFlame`) | 0x82d7d8e | 2 / 4 | 12 / 12 (3 flames; callback swaps count as replace) | Shuckle (Will-O-Wisp, both), Golem (prep18 alt) |

ROM / source evidence for the method:
- Status animations launch through `LaunchStatusAnimation` → `LaunchBattleAnimation(gBattleAnims_StatusConditions, id, FALSE)`.
  That sets `sAnimMoveIndex = 0` (`src/battle_anim.c:231`), so the move-keyed probe (`tools/compare/allocatorNetZeroProbe.py`)
  cannot see them.
- `tools/integration/prep50StatusProbe.py` is that probe, keyed on the script instead. A body is an active interval of
  `gAnimScriptActive` whose script at the first active frame is the status label, and `sAnimMoveIndex == 0`. The script is
  the ELF label containing `sBattleAnimScriptPtr`. When the pointer is inside a called subroutine (ConfusionEffect,
  ElectricityEffect, BurnFlame), the label containing `sBattleAnimScriptRetAddr` is used (`Cmd_call`, `battle_anim.c:1046`).
  The return address is used only when the pointer's own label is not a script entry, because it is stale after `return`.
- The first draft of the probe used the return address unconditionally. It misattributed a Tackle and a Splash that followed
  a status script. Requiring `sAnimMoveIndex == 0` plus the entry-label rule removed both. The committed receipt is from the
  fixed probe.
- Production names the event with `spriteOrderStatusAnimationName` (`spriteOrderEventTransform.ts:217`). That mirrors ROM
  `InitAndLaunchChosenStatusAnimation`: FRZ ==0x20, PSN (POISON or TOXIC → the same `Status_Poison` script), BRN, SLP (&7),
  PRZ, then CONFUSION for status2. Toxic is therefore covered by the PSN rows (the Toxic scenarios).
- Excluded, not counted: 2 PSN bodies still active at the end of the Toxic traces ("no cleanup within trace", one per side).
  The row lists them. Scenarios with no status body are also listed: Rest (Teddiursa), Petal Dance, Outrage, Thrash alt,
  and Sludge (no poison roll).

**NOT AUDITED:** FRZ (`Status_Freeze` runs `AnimTask_FrozenIceCube` plus `monbg`; 4 cmds / 448 frames involved),
INFATUATION / CURSED / NIGHTMARE / WRAPPED (not in the census's chains). These still invalidate in the patch.

**Post-KO send-out reseed: NOT an allocator question. It is blocked on the ORDER host.** `prep50AllocatorCensus.ts` records the
allocator host and the order host's reseed inputs (`liveSpriteAllocatorReseedable`, `liveSpriteOrderHost.ts:573`:
`tracker.lastUnit`, `occupantRoles`, `spriteOrderTrackerRoleIsomorphic`, `invalidReason`) at every switch-in command
activation and forced switch-in entry (`census-before-seeds0-299.json` `allocatorReseeds`, master):
- switch-in commands with the host unknown: **407 of 566 reseed** (lastUnit send-out / switch-in, roles known, isomorphic, order
  valid). Every one of the 159 that does NOT reseed has an INVALID order host:
  - 116: `no EXACT plan: body <id>` / `general animation <X>` (e.g. bodies 240 Rain Dance, 189 Mud-Slap, 28 Sand-Attack,
    210, 258, 301, 291, 340, 351; RAIN_CONTINUES, HAIL_CONTINUES, FOCUS_BAND, SUBSTITUTE_FADE)
  - 20: `return to ball`
  - 15: `next-mon summary while the opponent battler is tracked`
  - 8: `reshow without the opponent battler`

  With the order host invalid, `iso=false`, so `reseedLiveSpriteAllocatorAfterSendOut` correctly declines.
- forced switch-ins: 348 reseed (host unknown → known) and 152 stay known. 20 do not reseed; again the order host is invalid
  (return to ball 13, reshow without the opponent battler 7).

Tonight's order-host work made the valid cases reseed: no case has a valid order host and fails to reseed. The remaining
`command switch-in` / `command party-summary` chain units (33 / 3552, 32 / 3466) clear only when the ORDER host gets EXACT
plans for those bodies / general animations or models those units. That is order-host scope, and out of scope here.

### (3) Patch shape (`fixtures/prep50/prep50-temp-src.diff`, 17 lines)

- `src/engine/liveMoveSpriteAllocator.ts:73` (after `NET_ZERO_MOVES`): export
  `LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS = new Set(["SLP", "CONFUSION", "PSN", "PRZ", "BRN"])`, with a doc comment
  citing `tools/integration/fixtures/prep50/status-net-zero-audit.json`.
- `src/engine/factoryRoundBattleOrchestrator.ts` `prepareResolutionPalette`:
  - `scanThrough` (~:2314-2326) keeps `crossedUnknownGraphics`. It still drives the PALETTE invalidation unchanged, because
    `Status_Poison` blends palettes. `scanThrough` also sets a new `crossedAllocatorUnknown` when the event's
    `spriteOrderStatusAnimationName(isStatus2 !== 0, status)` is not in the set. A null name counts as unknown.
  - The allocator invalidate (~:2416) becomes `if (crossedAllocatorUnknown && spriteHost)`, replacing
    `(hasTrailingUnknownGraphics || crossedUnknownGraphics)`. One flag covers both the crossed and the trailing scan.
  - The diff also adds 2 imports.

A production fold must add:
- `tests/liveSpriteAllocator.test.ts`: a pin that the new set equals the receipt's `summary` NET-ZERO labels, mapped
  `Status_Sleep→SLP, Status_Confusion→CONFUSION, Status_Poison→PSN, Status_Paralysis→PRZ, Status_Burn→BRN`. This follows the
  existing net-zero pin at :153-170.
- An orchestrator test (next to `tests/livePaletteStatusCursor.test.ts`, which pins the palette side at :28-35 and must stay
  green unchanged). It should check:
  - a SLP (or PSN) status-animation event crossed between two bodies keeps `liveMoveSpriteAllocatorHost.host.historyKnown`
    true while `liveMovePaletteHost.host.historyKnown` goes false
  - a FRZ event (and a status2 such as INFATUATION) still invalidates the allocator
  - the same two cases hold for a TRAILING event after the segment's final command
- Run the full suite. This session did NOT run `npm test` with the patch applied (out of scope per the step), so no existing
  test was observed to need moving. The patch was exercised only by the two 300-battle censuses.

Residual after the patch (`chains-after-seeds0-299.json`): 92 declines / 9485 frames. Chain lengths: 1:43, 2:34, 3:8, 4:4,
5:1, 7:1, 8:1. Greedy next steps: FUTURE SIGHT's hit (8 / 608), SEISMIC TOSS, ICE BALL, FRZ, the forced switch-in reseed,
PERISH SONG, then about 2-command bodies. Top first unit: `command party-summary` 20 / 2233 (order host, above).

## Instrument

- `tools/integration/prep50AllocatorCensus.ts`: a copy of prep44's instrument (the allocator rules it shadows are unchanged
  since prep44; only the orchestrator line numbers moved). It adds:
  - `report.allocatorReseeds` (above)
  - status-animation shadowing that reads the patch's `LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS` through a namespace
    import. The export is absent on master, so the set is empty there and the master report is unchanged.
- `tools/integration/prep50Chains.py`: prep44Chains.py plus `--cleared-status`.
- `prep50StatusProbe.py` (probe), `prep50Probe.py` (35 jobs × 2 fresh runs), `prep50Extract.py` (receipt and verdict rule).
- The pairing / delta step uses the existing `prep43CensusDelta.py`, unchanged.

## Reproduce

    OUT=/tmp/p50-repro REC=/tmp/p50-rec sh tools/integration/prep50Run.sh   # ~5.5 min; SKIP_PROBES=1 / SKIP_CENSUS=1
    # prints "same <file>" for all 7 receipts in tools/integration/fixtures/prep50/; src is applied from the .diff and reverted

Verified once end to end on this branch: 7 / 7 `same`, `src reverted`.
