# Status-animation sprite audit (S10A, side lane, evidence only)

Complete OBJ / palette / `sSpriteOrder` audit of every `gBattleAnims_StatusConditions` script reachable in Factory
Level-50 singles, on both battler sides, twice fresh. No production code, no existing file touched.

Receipt `tools/integration/fixtures/status-animation-sprite-audit.json` (pins, per scenario/window rows, summary);
window raw `tools/integration/fixtures/status-animation-sprite-raw/` (change rows only, 52 files, 720 KB);
tools `tools/integration/statusAnimationSprite{Probe,Batch,Receipt}.py`; model `tools/integration/spriteOrderEventModel.py`.

## Method

- Direct mGBA processes (independent of the oracle services), `battle-scene-on` profile (the same one every earlier
  sprite/allocator probe and the playable integration uses; status animations only exist as sprites there).
- 13 staged scenarios x 2 orientations = **26 scenarios**, each run **twice fresh** (52 runs). Scenarios are the existing legal
  `tools/battle-lab/mechanic-*.json` (three complete legal Pokémon per side, four identical opponent slots) with two
  extra `A,A` turns appended so next-turn / turn-end status animations occur. Only `A`/`RIGHT` controller input; nothing injected.
- **Activation signal** (status animations are not `sAnimMoveIndex` move scripts): `gAnimScriptActive` rising edge while
  `sAnimMoveIndex == 0` (`LaunchBattleAnimation(isMoveAnim=FALSE)` zeroes it, battle_anim.c:230). The script is named from
  `sBattleAnimScriptPtr` (nearest `Status_*`/`General_*` label); affected battler = `gBattleAnimAttacker` (== target for status
  scripts). End = first frame `gAnimScriptActive` clears. Window = activation-1 .. end+8 (late frames).
- Per frame: occupied OBJ mask, `sSpriteOrder[64]`, `sSpritePaletteTags[16]`, per-bank md5 of `gPlttBufferUnfaded` OBJ
  (palette writes outside the faded buffer), per create: template (symbol), tileTag/paletteTag, callback, OAM bank.
  Creates/destroys are observed as per-frame mask edges (a slot created and destroyed inside one frame is invisible; none
  occurs in these scripts' window per the stream counts matching).
- Model check: `spriteOrderEventModel.step` ("array" variant) is run over the whole run from the battle-entry
  `ResetSpriteData`, and hit/miss counted on every frame in each window (and whole run).
- Reachability: statuses by source (`constants/battle_anim.h` 391-400): PSN, CONFUSION, BRN, INFATUATION, SLP, PRZ, FRZ,
  CURSED, NIGHTMARE; `B_ANIM_STATUS_WRAPPED 9` is commented "does not actually exist" (table has 9 entries).

Scenarios: Toxic (Clamperl/Onix), Confuse Ray (Chinchou/Onix), Will-O-Wisp (Shuppet/Shuckle), Attract (Eevee/Onix), Hypnosis
(Politoed/Onix) + Spore (Parasect/Onix), Thunder Wave (Flaaffy/Shuckle), Ice Beam (Delcatty/Shuckle), Curse-ghost
(Haunter/Magikarp), Hypnosis+Nightmare (Haunter/Shuckle), Wrap (Tentacool), Fire Spin (Charmeleon), Bind (Onix/Murkrow).

## Results

Every window (77 = 59 status-table + 18 supplementary) in both fresh runs: identical raw (26/26 full outputs byte-identical,
26/26 window-raw sha256 equal, analysis equal). **All 59 status-table windows, on both sides, are net-zero**: the occupied set
at end and at end+8 equals the set at activation-1, no late create/destroy after the script ends, and every create is
destroyed inside the window. Model: **5,342 hits / 0 misses over the 59 status-table windows**, 0 misses over all windows
and 94,213/94,213 frames over the whole 26 runs.

| status script | B_ANIM | windows (opp/player affected) | net-zero | free-order `F` changed by window | model hit/miss |
|---|---|---|---|---|---|
| `Status_Poison` | PSN | o:3 p:3 | 6/6 | 0/6 | 480 / 0 |
| `Status_Confusion` | CONFUSION | o:3 p:3 | 6/6 | 4/6 | 654 / 0 |
| `Status_Burn` | BRN | o:4 p:4 | 8/8 | 4/8 | 384 / 0 |
| `Status_Infatuation` | INFATUATION | o:2 p:2 | 4/4 | 4/4 | 424 / 0 |
| `Status_Sleep` | SLP | o:11 p:7 | 18/18 | 9/18 | 1908 / 0 |
| `Status_Paralysis` | PRZ | o:2 p:2 | 4/4 | 4/4 | 192 / 0 |
| `Status_Freeze` | FRZ | o:2 p:3 | 5/5 | 0/5 | 628 / 0 |
| `Status_Curse` | CURSED | o:2 p:2 | 4/4 | 0/4 | 336 / 0 |
| `Status_Nightmare` | NIGHTMARE | o:3 p:1 | 4/4 | 3/4 | 336 / 0 |
| (WRAPPED) | — | not a status script | — | — | — |
| supplementary `Status_BindWrap`/`FireSpin` (turn-trap) | `playanimation B_ANIM_TURN_TRAP` | o:7 p:7 | 14/14 | 7/14 | 1128 / 0 |
| supplementary `General_HeldItemEffect` | — | o:2 p:2 | 4/4 | 0/4 | 884 / 0 |

### Create/destroy stream per status (identical on both sides and across every window of that status)

Frames relative to activation (`act`); slots are `CreateSprite` lowest-free results in these fixtures (occupied before: ...6, 8,
60-63, free head 3,4,5,7,9,10,11...); the rule to apply is "lowest free slot", slot numbers are not constants.

| status | creates (act+frame: template) | destroys | lifetime | palette tag (bank) |
|---|---|---|---|---|
| Poison | none (task-only: `AnimTask_ShakeMon2`, `blend_color_cycle`) | none | 70 | none loaded |
| Confusion | +3 x5 `gConfusionDuckSpriteTemplate` (slots 3,4,5,7,9) | all 5 at +92 | 99 | 0x2759 (bank 7) |
| Burn | +3,+9,+15 `gBurnFlameSpriteTemplate` | +26,+32,+38 | 38 | 0x272d (7) |
| Infatuation | +3,+20,+37 `gMagentaHeartSpriteTemplate` | +62,+79,+96 | 96 | 0x27e2 (7) |
| Sleep | +3,+35 `gSleepLetterZSpriteTemplate` | +64,+96 | 96 | 0x27f4 (7) |
| Paralysis | 8 x `gElectricitySpriteTemplate` +3,+7,..,+31 alternating slots 3/4 | +10,+14,..,+38 | 38 | 0x271b (7) |
| Freeze | +6 `sFrozenIceCubeSpriteTemplate` | +109 (lifetime 115, 116 in 2nd/3rd windows) | 115-116 | 0x271a (7) |
| Curse | +6 `gCurseGhostSpriteTemplate` | +47 | 74 | 0x27d8 (7) |
| Nightmare | +6 `gNightmareDevilSpriteTemplate` | +47 | 74 | 0x27ed (7) |

(Turn-trap, not status-table: BindWrap 2x`gConstrictBindingSpriteTemplate` +3,+12, both destroyed +53, tag 0x27ca; FireSpin 12x
`gFireSpinSpriteTemplate` 0x272d +3..+47 step 4, destroyed +28..+78.) Exact per-window streams: receipt `scenarios.*.windows[].creates/destroys`.

### Palette

- Every status script that loads graphics does `LoadSpritePalette(tag)` at activation (frame +0) and `FreeSpritePaletteByTag` at the end frame; the tag
  occupies **bank 7** in all runs (reserved count 7; tags 0xd432/0xd6ff/0xd704 unchanged before/after: `sSpritePaletteTags` identical at window start and end).
- Burn tag 0x272d (= Small Ember; also Fire Spin), Confusion duck 0x2759 and others share nothing but the bank; the OBJ bank 7 in `gPlttBufferUnfaded` is
  rewritten at activation for Burn/Confusion/Curse/Nightmare/Infatuation/Sleep/BindWrap/FireSpin. Paralysis (0x271b spark) and Freeze showed **no
  unfaded bank-7 change** in these runs (likely bank 7 already held identical stale data from the preceding Thunder Wave / Ice Beam spark/ice
  palettes — inferred, not separately proven); they still load/free the tag. Poison writes no OBJ palette (only blends the battler's own faded palette).
- Bank 7 content is **left stale after the free** (unfaded buffer is not restored), which is the history a later allocator/palette consumer sees.

### Free-slot order (sprite-order provider)

Sprite occupancy is net-zero, but `F` (free-slot order) is **not** invariant: each destroy puts its slot at the head of `F`, so any window whose
streams create k slots and destroy them in a different order than the lowest-free creation order permutes `F` (e.g. Burn `[4,3,5,..] -> [5,4,3,..]`;
Paralysis `[3,4,..] -> [4,3,..]`; Infatuation `[3,4,5,..] -> [5,4,3,..]`; Fire Spin reorders 6 slots). Poison/Curse/Freeze (single slot 3 at head)
left `F` unchanged in these samples but only because slot 3 was already the head. So a production `SpriteOrderState` must **apply the status stream** (not
treat it as a no-op) — and the model reproduces every frame exactly (0 misses), so applying the create/destroy stream is sufficient.

## What a production "audited status animation" rule needs

1. Do **not** invalidate the sprite-allocator history on `status-animation` for the nine audited scripts; instead advance it by the stream above:
   occupancy unchanged at the end, `F` updated by the model's destroy-to-head rule per destroy (in destroy-frame order; same-frame destroys in
   previous array order — Confusion's 5 ducks are destroyed in one frame at +92 and Burn/Infatuation/Sleep are single-frame destroys).
2. Per status the production script needs only: sprite count, create frame offsets, destroy frame offsets, tag, bank = first free bank >= reserved
   count (7 here). Frame offsets above are measured `gAnimScriptActive` frames; the production animation clock owns whether they coincide.
3. **Palette history**: a status animation is *not* palette-neutral for bank 7 unfaded data (stale remains) even though tags are restored. The palette
   history must either keep the stale-bank-7 record per tag (Burn/Confusion already have receipts) or still invalidate for consumers that read bank 7.
   Poison alone is palette-neutral for OBJ banks.
4. Only `isStatus2`/status values that map to the nine scripts qualify; WRAPPED has no script; trap anims arrive through `playanimation B_ANIM_TURN_TRAP`
   (a different event kind than `status-animation`, so the current invalidation never fires for them — they are net-zero but permute `F` like the rest
   and are *not* tracked today).
5. `Status_Sleep`/`Status_Paralysis`/`Status_Infatuation` fire both on application and on later turns; the script is identical, so one stream per status suffices.

## Negatives / caveats

- **WRAPPED**: `B_ANIM_STATUS_WRAPPED` has no table entry. Wrap/Bind/Fire Spin turn damage plays `General_TurnTrap` -> `Status_BindWrap/FireSpin`
  (supplementary rows above; Whirlpool/Clamp/Sand Tomb scripts not staged).
- **Freeze**: Ice Beam 10% chance; found by seed sweep (seeds 305419955..305419994 on the player-carrier scenario: 9/40 froze; pinned 305419958 for the opponent-affected side;
  the opponent-carrier scenario freezes the player with its own seed). Chance-driven, so staging is seed-dependent but legal.
- "Fully paralyzed" and "confused/asleep/in-love can't move" triggers were not separately classified: windows are every status script that fired
  in the 3-turn traces (the script and stream are the same regardless of trigger). Poison/Burn turn-end triggers appear as later windows.
- Streams were measured in one battler/field setup family (Onix/Shuckle/Magikarp/Murkrow targets, slots 6,8,60-63 occupied); slot numbers and bank 7 follow the
  allocator rules and will differ with other occupancy. Template/tag/frame offsets are source constants.
- Scene ON only; Scene OFF behaviour of these scripts was not measured.
- Held-item windows (Spore scenarios) are supplementary and incidental.

## Reproduce

```
export PYTHONPATH=../../vendor/libmgba-py
python3 tools/integration/statusAnimationSpriteBatch.py /tmp/sa/final --runs 2      # 52 probe runs, <=4 concurrent, ~80 s
python3 tools/integration/statusAnimationSpriteReceipt.py /tmp/sa/final --write      # rewrites the receipt + window raw
python3 tools/integration/statusAnimationSpriteBatch.py /tmp/sa/sweep --runs 1 --only frz-ice-beam-by-player --seeds 305419955:40   # freeze seed sweep
```
