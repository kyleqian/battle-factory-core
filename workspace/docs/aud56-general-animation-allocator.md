# S10A aud56 — general / hit / stat animations vs the live sprite ALLOCATOR (ISSUES #156)

Side lane, evidence and production in one step. Master `a860ded6a` (production src tree `93d0f033`). Production grant:
`prepareResolutionPalette` (`src/engine/factoryRoundBattleOrchestrator.ts`) and `src/engine/liveMoveSpriteAllocator.ts`.

## Results

**Every general / hit / stat animation reachable in Factory play that the probes could stage is allocator NET-ZERO on the ROM.**
That is 19 general units plus HIT_ANIMATION: 93 jobs, each run twice in fresh direct-mGBA processes in ONE batch (186 runs), all
A == B, every job with an explicit lab `seed`. "Net-zero" here covers the OBJ slots and also the sprite tile allocator,
the palette tags and the affine matrices.

Production now **fails closed**. In `prepareResolutionPalette`'s `scanThrough`, every crossed or trailing kernel `animation` event
other than MOVE_ANIMATION invalidates the sprite allocator host unless its unit is in the new pinned set
`LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS` (20 units, `liveSpriteAllocatorAnimationNetZero`).
- Units that now invalidate: SUBSTITUTE_FADE, SNATCH_MOVE, DOOM_DESIRE_HIT, TURN_TRAP (Clamp / any other wrapped move),
  WEATHER_VAR with an argument other than 12 / 13, SCENE_OFF_ATTACK_PAUSE, and any id the kernel adds later.
- Unchanged: the palette host and status animations (prep50 / prep52 set).

**Census seeds 0..299 (`liveShareCensus.ts`, a860ded6a vs this branch): identical.**
- The command-record jsonl is byte-identical (sha256 `1bb87f8b…`).
- Live 7510 / 7970 = **94.23 %** by count and 1114736 / 1168201 = **95.42 %** by frames, both before and after.
- Delta **0 commands / 0 frames**, 0 live → fallback, 0 pairing mismatches.
- Battle digest `0fd00eae…` and command digest `d096164f…` are unchanged.

The new fail-closed rule fires once in the 300 battles (SUBSTITUTE_FADE on battler 1). No live allocator consumer follows it
before the host is next reseeded.

No unit is NOT net-zero, so no unit is kept live across a carry, and no dense window is required.
No existing pin moved: the gate files and the full suite are green with no expectation changes.

Receipts:
- `tools/integration/fixtures/aud56-live-receipt.json`: audit summary, exposure ranking, census before / after.
- `tools/integration/fixtures/aud56-net-zero-audit.json`: every instance, every scenario with its seed, raw sha256.
- `tools/integration/fixtures/aud56-exposure-before-seeds0-299.json`.

### (1) Enumeration and exposure (`aud56ExposureCensus.ts`, seeds 0..299 on a860ded6a)

**Kernel ids.** The kernel emits these `animation` event ids (every `animationId: "…"` literal under `src/engine`):
- MOVE_ANIMATION (move bodies: the move seam)
- HIT_ANIMATION (`Cmd_hitanimation`)
- STATS_CHANGE
- the `Cmd_playanimation` table (`battleScriptStatbuffchangeOpcode.ts`): RAIN / SUN / SANDSTORM_CONTINUES, INGRAIN_HEAL,
  LEECH_SEED_DRAIN, TURN_TRAP (named by the wrapped move: FIRE_SPIN / WHIRLPOOL / SAND_TOMB / BIND, others plain TURN_TRAP),
  WISH_HEAL, FUTURE_SIGHT_HIT, DOOM_DESIRE_HIT, HELD_ITEM_EFFECT, FOCUS_BAND, ITEM_STEAL, ITEM_KNOCKOFF, SNATCH_MOVE,
  SUBSTITUTE_FADE, FOCUS_PUNCH_SETUP
- WEATHER_VAR (12 = SANDSTORM_CONTINUES, 13 = HAIL_CONTINUES)
- CASTFORM_CHANGE
- SCENE_OFF_ATTACK_PAUSE

`tests/aud56GeneralAnimationAllocator.test.ts` re-scans these literals, so a new id fails the test until it is classified.

**Exposure.** For each unit, the instrument counts how many live wall-family allocator consumers followed it while the host was
known. Those are the only bodies that read `spriteAllocatorInput`. The tracker is cleared at every invalidation, switch-in reseed
and party menu.

| rank | unit | live allocator consumers carried across | live bodies (host known) after it | events (host known / all) | verdict |
|---:|---|---:|---:|---|---|
| 1 | HIT_ANIMATION | 193 | 3819 | 3789 / 5512 | NET-ZERO |
| 2 | STATS_CHANGE | 105 | 2267 | 1002 / 1395 | NET-ZERO |
| 3 | HELD_ITEM_EFFECT | 69 | 1255 | 730 / 1008 | NET-ZERO |
| 4 | HAIL_CONTINUES | 19 | 232 | 83 / 97 | NET-ZERO (battler 0, source rule) |
| 5 | SANDSTORM_CONTINUES | 13 | 227 | 130 / 181 | NET-ZERO (battler 0, source rule) |
| 6 | RAIN_CONTINUES | 10 | 322 | 177 / 274 | NET-ZERO (battler 0, source rule) |
| 7 | LEECH_SEED_DRAIN | 7 | 72 | 75 / 133 | NET-ZERO |
| 8 | FUTURE_SIGHT_HIT | 4 | 33 | 11 / 18 | NET-ZERO (also prep52) |
| 9 | SUN_CONTINUES | 2 | 150 | 95 / 123 | NET-ZERO |
| 10 | WISH_HEAL | 2 | 139 | 27 / 47 | NET-ZERO |
| 11 | TURN_TRAP_WHIRLPOOL | 2 | 94 | 33 / 40 | NET-ZERO |
| 12 | TURN_TRAP_BIND | 2 | 66 | 34 / 43 | NET-ZERO |
| 13 | INGRAIN_HEAL | 2 | 46 | 40 / 55 | NET-ZERO |
| 14 | ITEM_KNOCKOFF | 2 | 46 | 16 / 20 | NET-ZERO |
| 15 | FOCUS_BAND | 1 | 27 | 10 / 13 | NET-ZERO |
| 16 | TURN_TRAP_FIRE_SPIN | 0 | 13 | 12 / 27 | NET-ZERO |
| 17 | SUBSTITUTE_FADE | 0 | 0 | 1 / 8 | UNAUDITED → invalidates |
| — | TURN_TRAP_SAND_TOMB, ITEM_STEAL, CASTFORM_CHANGE, FOCUS_PUNCH_SETUP | 0 (not seen) | | | NET-ZERO |
| — | SNATCH_MOVE, DOOM_DESIRE_HIT, TURN_TRAP (Clamp), WEATHER_VAR(other), SCENE_OFF_ATTACK_PAUSE | 0 (not seen) | | | UNAUDITED → invalidate |

Status units appear in the same ranking: SLP 36, CONFUSION 25, PSN 14, PRZ 10, BRN 5, FRZ 4 (prep50 / prep52 audited, unchanged).

### (2) Per-unit verdicts (`aud56-net-zero-audit.json`)

Verdict rule (`aud56Extract.py`), using the `docs/allocator-net-zero-audit.md` definition for each complete instance:
- baseline (activation − 1) == end (first inactive frame);
- created == destroyed;
- every occupied-set change in the 8 frames after cleanup is owned by the next action (the next script or the healthbox hit effect);
- the tile allocator (`sSpriteTileAllocBitmap`, sha256), the palette tags (`sSpritePaletteTags[16]`) and the matrices
  (`gOamMatrixAllocBitmap`) are equal at baseline and end.

NET-ZERO also needs at least one known-entry instance on each battler side, except under a source battler rule (below).

| unit | ROM key | complete instances (known entry ply / opp) | species of the animation battler | created / instance | jobs |
|---|---|---|---|---|---:|
| HIT_ANIMATION | `SpriteCB_HitAnimHealthoxEffect` sprite window | 278 (135 / 142) | 26 species | 1 (slot 3, lifetime 20, released before the next script) | 93 |
| STATS_CHANGE | `General_StatsChange` | 12 (8 / 4) | 95, 143, 166 | 1 | 6 |
| HELD_ITEM_EFFECT | `General_HeldItemEffect` | 18 (8 / 10) | 95, 143, 289 | 6 | 13 |
| HAIL_CONTINUES | `Move_HAIL`, sAnimMoveIndex 0 | 8 (8 / 0) | 95, 143, 225 | 22–24 | 4 |
| SANDSTORM_CONTINUES | `Move_SANDSTORM`, index 0 | 8 (8 / 0) | 95, 143, 231 | 14 | 4 |
| RAIN_CONTINUES | `General_Rain` | 16 (16 / 0) | 95, 143, 194, 385 | 80 | 6 |
| SUN_CONTINUES | `Move_SUNNY_DAY`, index 0 | 16 (15 / 1) | 95, 143, 182, 385 | 0, 12 | 6 |
| LEECH_SEED_DRAIN | `General_LeechSeedDrain` | 12 (6 / 6) | 42, 102, 143 | 16 | 4 |
| WISH_HEAL | `General_WishHeal` | 4 (2 / 2) | 42, 143, 387 | 10 | 4 |
| INGRAIN_HEAL | `General_IngrainHeal` | 12 (6 / 6) | 42, 143, 345 | 14 | 4 |
| TURN_TRAP_WHIRLPOOL | `Status_Whirlpool` | 15 (8 / 7) | 42, 95, 143 | 14 | 6 |
| TURN_TRAP_FIRE_SPIN | `Status_FireSpin` | 16 (9 / 7) | 42, 95, 143 | 12 | 6 |
| TURN_TRAP_SAND_TOMB | `Status_SandTomb` | 9 (3 / 6) | 95, 143 | 14 | 5 |
| TURN_TRAP_BIND | `Status_BindWrap` | 16 (8 / 8) | 42, 95, 143 | 4 | 6 |
| ITEM_KNOCKOFF | `General_ItemKnockoff` | 4 (2 / 2) | 42, 95, 143 | 1–2 | 4 |
| FOCUS_BAND | `General_FocusBand` | 4 (2 / 2) | 10, 129 | 3 | 4 |
| ITEM_STEAL | `General_ItemSteal` | 3 (1 / 2) | 143, 213 | 2 | 3 |
| FUTURE_SIGHT_HIT | `General_FutureSightHit` | 5 (3 / 2) | 64, 143 | 0 (late: healthbox hit effect) | 5 |
| CASTFORM_CHANGE | `CastformChangeContinue` | 2 (1 / 1) | 385 (the only Forecast species) | 0 | 2 |
| FOCUS_PUNCH_SETUP | `General_FocusPunchSetUp` | 4 (3 / 1) | 143, 307 | 15 | 4 |

**HIT_ANIMATION (source + ROM).**
- `Player/OpponentHandleHitAnimation` → `DoHitAnimHealthboxEffect` creates one invisible sprite (`sInvisibleSpriteTemplate`,
  `SpriteCB_HitAnimHealthoxEffect`), which destroys itself on its 21st callback.
- `DoHitAnimBlinkSpriteEffect` holds the controller for 32 frames, so the survivor is gone before the script continues.
- On the ROM, all 278 windows took slot 3 for 20 frames, were released before the next animation-script activation, and left
  tiles, palettes and matrices unchanged.
- An invisible target creates nothing: `PlayerHandleHitAnimation` returns early.

**ITEM_KNOCKOFF and FOCUS_BAND (the plans48 / plans51 "carry").** These are net-zero for the allocator.
- The survivor (`gKnockOffItemSpriteTemplate` / `AnimKnockOffOpponentsItem`; `gSlideMonToOriginalPosSpriteTemplate` /
  `SlideMonToOriginalPos_Step`) is destroyed on the script's cleanup frame. `createsprite` counts toward `gAnimVisualTaskCount`,
  and `end` waits for it.
- So at cleanup the occupancy is the baseline (e.g. knock-off: slot 3 created at f203, destroyed at f243 = cleanup).
- The order-host "carry" is a sprite-ORDER effect (the free list), not an occupancy survivor.

**Weather continuing: the source battler rule.**
- In both setter orientations and with 4–5 species, all 32 HAIL / SANDSTORM / RAIN instances played on battler 0.
- `DoFieldEndTurnEffects` (`battle_util.c:1186`) sets `gBattlerAttacker` to the first non-absent battler. The continue scripts
  play on `BS_ATTACKER`; Drizzle / Sand Stream use `BS_BATTLER_0`.
- `gAbsentBattlerFlags` is set only by `Cmd_openpartyscreen` when no replacement exists, and in singles that ends the battle before
  another end turn. So every Factory instance is on battler 0.
- The probes `*-opp-sd-*` (the player's lead uses Selfdestruct in the weather turn) showed no continue animation at all.
- The **kernel's event battler for these is often 1** (it carries the last attacker): 35 census events. That divergence is
  presentation-only here, so the production set keys these units on the unit name alone.
- A first draft keyed them by event battler (`:player`). That cost 35 live → fallback commands (HAIL 17, SANDSTORM 11, RAIN 7;
  3825 frames) with no ROM case behind them, so it was dropped.

**Unaudited (production invalidates):**
- SUBSTITUTE_FADE: plans51 found no staging that shows `General_SubstituteFade`; not re-staged.
- SNATCH_MOVE and DOOM_DESIRE_HIT: no Factory set has Snatch or Doom Desire.
- TURN_TRAP (Clamp): the `cl-*` staging never showed the trap turn.
- WEATHER_VAR with any other argument.
- SCENE_OFF_ATTACK_PAUSE: a scene-off pause, not an animation.

### (3) Production shape

- `liveMoveSpriteAllocator.ts`:
  - `LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS` (20 names);
  - `liveSpriteAllocatorAnimationUnit`, which mirrors `liveSpriteOrderHost.ts`'s naming (TURN_TRAP by wrapped move, WEATHER_VAR by
    argument);
  - `liveSpriteAllocatorAnimationNetZero`.
- `factoryRoundBattleOrchestrator.ts` `prepareResolutionPalette` `scanThrough`: an `animation` payload whose unit is not in the
  set sets `crossedAllocatorUnknown`, the same flag and invalidate point the status set already uses.
- Tests (`tests/aud56GeneralAnimationAllocator.test.ts`, 22):
  - set == the receipt's NET-ZERO units, with A == B and explicit seeds;
  - every kernel `animationId` literal is classified;
  - the unaudited ids return false;
  - crossed / trailing orchestrator cases: HIT / STATS / HELD_ITEM / HAIL / WHIRLPOOL stay known, while SUBSTITUTE_FADE /
    SNATCH_MOVE / Clamp / WEATHER_VAR(5) / an unknown id invalidate.
- Revert experiment: with the `scanThrough` branch disabled, all 10 fail-closed cases fail.

## Instrument

- `aud56ExposureCensus.ts`: prep52AllocatorCensus.ts plus a carried-unit tracker (`report.aud56Exposure`). After the change it also
  attributes allocator declines to `general animation <unit>@<battler>`.
- `aud56NetZeroProbe.py`: prep52NetZeroProbe.py, plus per-frame tile / palette-tag / matrix state and hit windows (the
  `SpriteCB_HitAnimHealthoxEffect` sprite lifetime, its battler from `data[1]` vs `gHealthboxSpriteIds`).
- `aud56Probe.py`: the 93 jobs. Every job is written as a variant with an explicit `seed` (ISSUES #154).
- `aud56Extract.py`: the verdicts.
- `aud56Receipt.py`: the live receipt.

## Reproduce

    export PYTHONPATH=../../vendor/libmgba-py PY=../../vendor/mgba-venv/bin/python
    $PY tools/integration/aud56Probe.py <out> --jobs 10            # ~70 s, 186 runs
    python3 tools/integration/aud56Extract.py <out> <out>/audit.json  # == fixtures/aud56-net-zero-audit.json except raw sha / paths
    node --experimental-strip-types --no-warnings tools/integration/aud56ExposureCensus.ts --seeds=0..299 --out=<x>.json --commands=<x>.jsonl
    node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=census-after.json --commands=census-after.jsonl
    python3 tools/integration/prep43CensusDelta.py census-before.json census-before.jsonl census-after.json census-after.jsonl delta.json
    python3 tools/integration/aud56Receipt.py <scratch> tools/integration/fixtures/aud56-live-receipt.json

## Follow-ups (not done here)

- The kernel's `animation` event battler for RAIN / HAIL / SANDSTORM_CONTINUES is the last attacker, but source plays them on
  battler 0. This is presentation-only for the allocator; the Scene ON renderer's pan / attacker for those units may differ.
- SUBSTITUTE_FADE staging (plans51's resume note) would let the 1 census crossing stay known.
