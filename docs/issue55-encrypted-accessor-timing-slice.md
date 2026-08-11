# Issue 55: encrypted accessor timing slice

Battle Scene OFF, 2026-08-10. Initial instruction/fetch slice: `eb4ab2c8`.
`__umodsi3(personality, 24)` composition: `d7820e25`.

This is a source/ELF component checkpoint, not a complete `GetBoxMonData2`
duration model. The encrypted loops and receipt-used field tails now have
complete component cycles; the outer accessor deliberately remains
`cycles: null`.

## GetSubstruct

The pinned `reference/pokeemerald/src/pokemon.c` source is `GetSubstruct`'s
24-way `personality % 24` permutation. Its Thumb-bit ELF symbol is
`0x0806a271`, size `0x2a8`; the 24 non-contiguous arm entries are
`0x0806a2f8..0x0806a4e0`. `reduceFactoryGetSubstructTiming` enumerates every
arm for all four source substruct types.

The separate libgcc symbol is exactly `__umodsi3` at Thumb-bit
`0x082e7be1`, size 192 bytes (`0x082e7be0..0x082e7ca0`, SHA-256
`dddbf9d8f5abc4af089a4c4397384388199f4fd8b3a85f849d491390975547dd`).
`GetSubstruct` calls it at `0x0806a27e` and resumes at `0x0806a282`; the
helper's fast, ordinary, and correction exits are independently pinned at
`0x082e7bea`, `0x082e7c66`, and `0x082e7c94`. The reducer deliberately uses a
narrow `%24` reconstruction rather than assuming it shares `__udivsi3`:
this ELF body resets Loop3's temporary quotient group and has register-ROR
correction work that the unsigned-division core does not have.

The common dispatch shell, excluding the body of `__umodsi3`, is:

```text
16 Thumb halfwords × 2
+ 3 taken refills × 6
+ 2 ROM fetch premiums × (11 - 2)
= 68 cycles
```

The 96 arm paths are ROM-only pointer arithmetic and control flow. They total
**5,172** instruction/refill cycles, ranging from **32** to **86**. The
reducer replays the full `%24` helper for every u32 personality, feeds its
computed remainder into the arm selection, and returns the exact call/resume
and helper-return PC, loop widths, ROR internal cycles, arm PC, physical slot,
secure offset, halfword count, and refill count. `cycles` is now the complete
ROM-only GetSubstruct cost (helper + 68-cycle shell + selected arm); it does
not include any BoxMon EWRAM access.

## Shared crypt/checksum loops

The source helpers are `DecryptBoxMon`, `EncryptBoxMon`, and
`CalculateBoxMonChecksum` in `pokemon.c`; their ELF bodies are respectively
`0x0806a24c..0x0806a26e`, `0x0806a228..0x0806a24a`, and
`0x08068c78..0x08068d08`.

Each crypt helper has 5 prologue + 120 loop + 3 epilogue halfwords and 11
loop-back refills plus the return refill:

```text
128 × 2 + 12 × 6 = 328 instruction-fetch cycles
```

Each of its 12 iterations has three aligned EWRAM word reads and two aligned
EWRAM word writes: **36 reads / 24 writes**. Retail EWRAM is a 16-bit bus. The
source-general reducer charges aligned byte/halfword accesses **2** cycles and
aligned words two 16-bit transfers, **4** cycles. It rejects u16/u32
misalignment rather than claiming ARM7TDMI rotation behavior not used by this
source. Thus one crypt helper has **240** bus cycles, of which **120** exceed
the load/store instruction baselines already present above, and completes at:

```text
328 instruction/fetch + 120 bus premium = 448 cycles
```

The checksum has four six-read loops, seven
setup/pointer halfwords, and five taken loop edges per substruct:

```text
(4 × 6 × 8 + 7) × 2 + (4 × 5) × 6 = 518 instruction-fetch cycles
```

Its EWRAM data count is **24 aligned halfword reads = 48 bus cycles**. Their
two-cycle instruction baselines are already in the 518 subtotal, so the
complete loop remains **518**. Across decrypt/checksum/encrypt the exposed bus
subtotal is **240 + 48 + 240 = 528**, with **240** premium cycles. No +18
service stall or VBlank/IRQ pause is absorbed.

The compact Scene-OFF sibling receipt
`tests/fixtures/factory-ewram-access-boundaries-v1/anchor.json` was produced by
the opt-in `FACTORY_EWRAM_ACCESS_EVIDENCE=1` path. It retains only exact ELF
instruction PCs, mGBA's pipelined PC, width/access class, address modulo 4,
and clean cycle deltas. Two fresh runs are byte-identical at SHA-256
`bff98549ef1bf901be467b04341c8d1132550754e58f9f10ed5f262c1c28ee92`.
Its independent whole-component boundaries contain
**1,099 decrypt**, **1,105 encrypt**, and **1,590 checksum-loop** samples; the
clean minima are exactly **448/448/518**. Individual word instruction deltas
can expose only part of the bus stall because mGBA assigns pipeline work at
adjacent boundaries, so the reducer is justified by the retail two-transfer
bus rule plus the whole-component join—not by treating those deltas as a
duration lookup.

## Checksum and receipt field tails

The post-checksum source branch begins at `0x0806a6d0` and rejoins dispatch at
`0x0806a6f2`. Valid checksum executes 6 halfwords, one taken refill, and one
u16 read: **2 bus / 18 complete cycles**. Invalid checksum executes 17
halfwords with no taken refill, then marks both BoxMon flags and substruct-3's
egg bit: one u16 read plus two u8 reads/two u8 writes, **10 bus / 34 complete
cycles**. This route is selected only by the input checksum result.

Every receipt-used switch arm is also complete through the common tail at
`0x0806ac8c`:

| fields | entry PC(s) | input-derived route | reads | bus | complete |
| --- | --- | --- | --- | ---: | ---: |
| 11 | `0x0806a95e` | normal species | u8 flag + u16 species | 4 | 34 |
| 11 | `0x0806a95e` | bad egg (preexisting or checksum-invalid) | u8 flag | 2 | 24 |
| 25 | `0x0806a97c` | experience | u32 | 4 | 14 |
| 26–31 | `0x0806a9a4..0x0806a9b8` | EV byte | u8 | 2 | 10 |
| 39/41/44 | `0x0806a9f6`, `0x0806aa06`, `0x0806aa1e` | IV bitfield | u8 | 2 | 14 |
| 40/43 | `0x0806a9fe`, `0x0806aa16` | IV bitfield | u16 | 2 | 14 |
| 42 | `0x0806aa0e` | IV bitfield | u32 | 4 | 16 |

## Receipt check and remainder

The Tier-1 slice checks the committed OFF v2 packets, whose construction /
ambient / total event counts are **242/52/294**, **112/31/143**, and
**202/30/232**, with full hashes:

- anchor: `631bd21408ba41e03c0e119dde3d83d94dda023cee93ebc3e470e6d94741cc2a`
- LILIANA: `ae1282b74f74de6a85b8772adfbcd83028fad09f8aa3e3ecd518aafeab17b443`
- varied trainer: `3e10197a34f4ea7a08a23bead04ae5b6113c653304722167095612a9b0626987`

The census preserves the **1,174**-cycle decrypt/checksum/encrypt instruction-
fetch subtotal on each of the **180** shared reads. Source and ELF audit now
pin the exact eight-call order as outer setup `[0, 1, 2, 3]`, then checksum
`[0, 1, 2, 3]`; the census exposes the resulting source-general GetSubstruct
subtotal and its sum with the 1,174 shared cycles. For example, the full-u32
personality `0xffffffff` produces an eight-call function subtotal of **6,824**
and a **7,998** ROM-only composed subtotal. This is not an accessor duration.

Each row now additionally exposes `sharedDataBusCycles` (**528**),
`sharedDataBusPremiumCycles` (**240**), checksum/field-tail timings,
`tailDataBusCycles`, `tailCycles`, and `composedKnownCycles`. The latter is the
eight complete GetSubstruct calls plus **448 + 518 + 448** and the selected
tails; it is still not an accessor duration.

The committed OFF v2 events expose interrupt/resume points rather than a clean
GetBoxMonData2 entry/return interval. The positive outer remainder is not
fitted or absorbed. Complete accessor `cycles` therefore remains null only
for the outer prologue/setup/dispatch/common-return instruction and memory
work, asynchronous +18 service, and VBlank/IRQ costs. The construction clock
remains unwired.
