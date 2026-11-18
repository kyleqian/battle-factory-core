# Fix 46: the rental rank reads the rent count as one byte (2026-11-18, round replay)

## What was wrong for a player

The draft of each challenge gets better rentals the more the player has rented in an unbroken streak: from 15 rents one of the six comes from
the next challenge's sets with its higher IV, from 22 two, up to five from 43 (`GetNumPastRentalsRank`, "the rental rank"). The game keeps the
count as a 16-bit number but reads it into an 8-bit one for the rank, so at 256 rents the rank falls back to 0 and climbs again (271 rents is
rank 1). The engine kept the top rank forever. Reachable only after 256 rents without a lost challenge (for example 37 won challenges with a
swap after every battle, about 260 battles), so very rare; but then the drafts differ.

## The source

`GetNumPastRentalsRank` (`battle_factory.c:868-886`): `u8 rents = gSaveBlock2Ptr->frontier.factoryRentsCount[battleMode][lvlMode];`
(`factoryRentsCount` is `u16`, `include/global.h`). Two callers: the draft (`GenerateInitialRentalMons`, `battle_factory.c:551-560`: the first
`rank` rentals from the better range) and the select screen (`Select_InitMonsData`, `battle_factory_screen.c:1754-1763`: the first `rank`
rentals get the next challenge's IV).

## The ROM

Lab staging of challenge 0 (seed 25's census request), with the singles Level 50 count (SaveBlock2 +0xDF2) written to a value before the
select screen runs; the select screen builds the three rentals at positions 0, 1, 2. The rentals' IVs:

| Rents | IVs | Rank |
|---|---|---|
| 0 | 3, 3, 3 | 0 |
| 15 | 6, 3, 3 | 1 |
| 256 | 3, 3, 3 | 0 |
| 271 | 6, 3, 3 | 1 |

The engine gave rank 5 at 256 and 271 (the first five rentals from the better range, IV 6).

## The fix

`getFactoryRentalRank` takes the count modulo 256 before the thresholds. Test: `tests/parityMacRentalRankByte.test.ts` (fails without the fix).
The probe is a scratch script around `BattleLab.prepare` that writes +0xDF2 next to the lab's own +0xDF6 write; not kept in the repo.
