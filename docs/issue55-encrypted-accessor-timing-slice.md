# Issue 55: encrypted accessor timing slice

Battle Scene OFF, 2026-08-10. Implementation: `eb4ab2c8`.

This is a source/ELF instruction-fetch checkpoint, not a complete
`GetBoxMonData2` duration model. It deliberately keeps the complete accessor
and all EWRAM-dependent loop totals at `cycles: null`.

## GetSubstruct

The pinned `reference/pokeemerald/src/pokemon.c` source is `GetSubstruct`'s
24-way `personality % 24` permutation at lines 3603-3657. The ELF is
`0x0806a270..0x0806a516`; the 24 non-contiguous arm entries are
`0x0806a2f8..0x0806a4e0`. `reduceFactoryGetSubstructTiming` enumerates every
arm for all four source substruct types.

The common dispatch shell, excluding the body of `__umodsi3`, is:

```text
16 Thumb halfwords × 2
+ 3 taken refills × 6
+ 2 ROM fetch premiums × (11 - 2)
= 68 cycles
```

The 96 arm paths are ROM-only pointer arithmetic and control flow. They total
**5,172** instruction/refill cycles, ranging from **32** to **86**. The
reducer returns the exact arm PC, physical slot, secure offset, halfword
count, and refill count. The `%24` helper and the complete `cycles` field stay
unresolved.

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
fetch subtotal on each of the **180** shared reads, but its complete total
remains null. The remaining evidence boundary is the source-general
`__umodsi3(personality, 24)` composition, EWRAM word/halfword bus timing and
field tails, and deterministic live async workload. The construction clock
therefore remains unwired.
