# hpb3 - the hp command's length against the ROM's (both scenes)

Side lane, presentation / sound timing only (no battle rule, damage, RNG). S11 #219 item 0.

## The rule the ROM has (already ported)

`CalcNewBarValue` / `MoveBattleBar` (`battle_interface.c:2234-2395`): with scale 48 and toAdd 1 a bar of maxHP >= 48 moves 1 HP per frame (bar frames = |from - to|); maxHP < 48 takes the Q24.8 branch (hpb202).
`Cmd_datahpupdate` blocks until the controller flag clears (bar + 2 rows after the `healthbarupdate` row), then the script runs one instruction per frame. The ROM has **no 28-row floor**.
`battleHealthBarAnimationFrames` already models this exactly, so the open gap is only the hold after the bar: the engine's hp command is `max(minimumFrames, bar + 1) + tailFrames`, and `HP_TIMING` (min 28, no tail) is the default for every shape no rule matched.

## Where the 28-row floor is still used (counted on the T2 command traces)

44 of 1,026 hp commands (Scene OFF) and 41 of 737 (Scene ON); about 29 per scene have a bar under 27 rows (the only ones the floor changes).
Shapes: hit -> MoveEnd x2 -> held-item animation (Shell Bell), hit -> Focus Band, hit -> message that is not the hit's effect print (Triple Kick), Pain Split pairs, drain heal that changes nothing, hit -> stats-change (s7295), s8108 ON hit -> message, s2230 d1 ON status.

## Experiment: remove the floor everywhere (x1)

`HP_TIMING.minimumFrames` 28 -> 0 regressed T2: ON 11,949 -> 12,570 (+621), OFF 1,348 -> 1,359 (+11), 0 / 0 missing / extra. Gains only in three windows (s4235 d2 -98, s6 d3 -38, s97 d11 -18); the big regressions are shapes where the floor is the compensation for another engine error:

* **s8108 ON d44, Triple Kick (+378)**: the ROM's hit -> print is `healthbarupdate` .. `datahpupdate` + the `printstring` rows (hp 114, ROM print row 144, 30 rows on a 3-row bar). The engine's hit-animation command ends 20 rows before the ROM's `healthbarupdate` row finishes, so the 28 floor is what lines the print up. A tail rule needs the hit-animation length first (not this step).
* **s648 ON d10, Pain Split (+60)**: the first hp starts 10 rows early (SE 194 chain), the 28-row floor lands the second hp on the ROM row (456 vs 452 + engine offset 4). The ROM interval is bar + 7 (18 on an 11-row bar); fixing it moves the hp 10 earlier and needs the preceding command fixed in the same change.
* s97 d12 / d13, s2230 d1, s648 d6, s3738 d6 / d39: same family (floor absorbs an earlier engine lag).

Conclusion: a blanket floor removal is wrong; each shape needs its own ROM-derived tail, and only where the neighbouring commands already agree.

## Shapes changed (`applyHpHitTails`, `src/engine/battleResolutionPresentation.ts`)

1. **hit -> `BattleScript_ItemHealHP_Ret` (Shell Bell on the attacker)**: `hpItemAnimationRows`. ROM, every window (s97 d11 bar 25, d12 / d13 bar 20, hie1-shellbell-on bar 40): the item's `playanimation` is **11 executions after `datahpupdate`**, i.e. bar + 13 after the bar row. The engine's HELD_ITEM_EFFECT command leads its script row by 9 (its first SE is at command + 17, the ROM's at the script row + 8), so the hit's hp tail is `rows - 1 - 9` = 1 (floor-free). Before: floor 28 (8 rows early on a 25-row bar, 3 on 20, 0 on 40 only because the bar exceeded the floor).
   Open: the ROM SE after the script row is +12 in s97 d12 / d13 (foe battler, pan 63) against +8 in d11 and the lab; the tail 1 leaves those two windows 4 rows early (T2 d12 +28, d13 +100) while the other windows gain.
2. **hit -> Focus Band** (`BattleScript_FocusBandActivates` right after `datahpupdate`): drv2 OFF s4235 d2, 8 -> 1: ROM bar 7, `datahpupdate` row +9, Focus Band script +3 after it, Pausex20 +1. Tail = the stat-next convention (4 ON / 5 OFF). Before: floor 28, 15 rows late.
3. **drain heal bar that changes nothing** (`BattleScript_AbsorbUpdateHp`, `to == from`, then the print): the hpf2 hp -> print hold (`messageRows` = datahpupdate -> print + 2) now also applies when the heal is 0 (T2 ON s6 d3: ROM bar row 521, print row 525; the floor held the print 28 rows).

Not changed (ROM shape not proven or not floor shapes): Pain Split, Triple Kick and other multihit hits, Icy Wind (`statNext` already floor-free), recoil (`HP_RECOIL_LEAD_ROWS`).

## Numbers

T2 (`rescoreAll.sh` into `.integration/evidence/hpb3/t2-{base,after}`, `soundScoreboard.py`, both 0 missing / 0 extra):

| scene | base mass (exact) | after mass (exact) |
|---|---|---|
| ON | 11,949 (3,006) | 11,862 (3,033) |
| OFF | 1,348 (781) | 1,333 (781) |

Per window (`t2Attribute.py` + `drv2/delta.py`): ON s4235 d2 -110, s6 d3 -46, s2 d4 / d7 / d10 -16 / -7 / -9, s97 d6 / d7 / d8 / d11 -6 / -10 / -7 / -9, s97 d12 +28, d13 +100, d9 +5; OFF s4235 d2 -15.

Labs (`labCompare.sh --scene both`, base vs after; nine labs, both scenes): only `hie1-shellbell-on` Scene ON moves, mass 5 -> 0 (15 / 15 SEs exact, the SE at 766 on the ROM frame). Identical (mass unchanged): hie1-sitrus-on (0 / 0), hie1-leftovers-off (0 OFF / 2 ON), aud242k-recover-player-on (0 OFF / 84 ON), aud242b-icywind-opponent-on (0 / 0), stc1-icywind-foe-off (5 OFF / 0 ON), hpd1-toss10-on (0 / 12), fsc1-eqko-on (1 / 1), mechanic-recover-player-kadabra-opponent-onix (2 / 29).

Census 0..199, both scenes (`lsd194Census.sh` WORKTREE vs HEAD, `rst197CensusDelta.py --digest`): eventsDigest + error identical 200 / 200 in each; no type-sequence changes (43 / 19 battles change command timing).

## Pins moved

`tests/hie3HeldItemSounds.test.ts` hie3-shellbell-on: commandStart 748 -> 749 and lab drift 1 -> 0. ROM row: `hie3-shellbell-on` first SE 766 = engine command 749 + 17; the engine's first SE now lands on the ROM frame (drift 0).

## Gates

`tests/hpb3HpBarLength.test.ts` (Tier 1): the Shell Bell hit's hp is floor-free with tail 1 and followed by the two sprite-visibility rows. Focus Band and the no-change drain heal are covered by T2 only (the Focus Band needs a 10 % roll).

## Not solved / not investigated (named for the next step)

* g180m s648 d10 (Pain Split): probed above; the first hp starts 10 rows early and the floor compensates. Needs the preceding command's length first.
* t2k4 window 2 (ON s6912 d5 Recover, hp 477 vs 458, message hold 88 vs 98) and window 3 (ON s648 d0 Earthquake KO, SE 13 -> faint message 150 ROM vs ~181 engine): **not probed in this step**; the Recover heal already takes the floor-free hpf2 print hold and the KO the hpf1 faint-next rule, so they are not floor cases.
* drv2 OFF s97 d13 (Leftovers heal, message 6 early) and hcr3m's Rollout / Ice Ball (hp = damage + 8): **not probed in this step**; no floor is involved in the shapes as projected today.
* The Shell Bell +4 mismatch of s97 d12 / d13 (ROM SE +12 after the script row against +8 elsewhere).
