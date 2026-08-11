# Issue 55: encrypted accessor timing slice

Battle Scene OFF, 2026-08-10. Initial instruction/fetch slice: `eb4ab2c8`.
`__umodsi3(personality, 24)` composition: `d7820e25`.

This is a source/ELF instruction-fetch checkpoint, not a complete
`GetBoxMonData2` duration model. It deliberately keeps the complete accessor
and all EWRAM-dependent loop totals at `cycles: null`.

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

Each of its 12 iterations has three EWRAM word reads and two EWRAM word
writes: **36 reads / 24 writes**. The checksum has four six-read loops, seven
setup/pointer halfwords, and five taken loop edges per substruct:

```text
(4 × 6 × 8 + 7) × 2 + (4 × 5) × 6 = 518 instruction-fetch cycles
```

Its EWRAM data count is **24 halfword reads**. These data-access costs are not
folded into the 328/518 subtotals, and no +18 service stall or VBlank/IRQ
pause is absorbed.

## Receipt check and remainder

The Tier-1 slice checks the committed OFF v2 packets, whose construction /
ambient / total event counts are **242/52/294**, **112/31/143**, and
**202/30/232**, with full hashes:

- anchor: `631bd21408ba41e03c0e119dde3d83d94dda023cee93ebc3e470e6d94741cc2a`
- LILIANA: `ae1282b74f74de6a85b8772adfbcd83028fad09f8aa3e3ecd518aafeab17b443`
- varied trainer: `3e10197a34f4ea7a08a23bead04ae5b6113c653304722167095612a9b0626987`

The census exposes a **1,174**-cycle decrypt/checksum/encrypt instruction-
fetch subtotal on each of the **180** shared reads. Source and ELF audit now
pin the exact eight-call order as outer setup `[0, 1, 2, 3]`, then checksum
`[0, 1, 2, 3]`; the census exposes the resulting source-general GetSubstruct
subtotal and its sum with the 1,174 shared cycles. For example, the full-u32
personality `0xffffffff` produces an eight-call function subtotal of **6,824**
and a **7,998** ROM-only composed subtotal. This is not an accessor duration.

The committed OFF v2 events expose interrupt/resume points rather than a
clean GetBoxMonData2 entry/return interval. Where the stat receipts do expose
the enclosing direct-call boundary, all **156** encrypted reads remain
strictly greater than the known GetMonData shell plus their source-only
composed subtotal after subtracting recorded pauses. The positive remainder
is not fitted or absorbed. Complete accessor `cycles` therefore remains null:
EWRAM word/halfword access, field tails, async +18 service, and VBlank/IRQ
costs remain external. The construction clock remains unwired.
