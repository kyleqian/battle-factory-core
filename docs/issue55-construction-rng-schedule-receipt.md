# ISSUES #55 — construction RNG schedule receipt

Side-lane evidence, Battle Scene OFF. The machine-readable packet is
`tests/fixtures/factory-construction-rng-schedule-evidence.json`; its
`sequence` arrays are the complete gapless `Random()` chain from the selected
source function's entry cursor through its return cursor. Each row is tagged
`construction` (`CreateMonWithEVSpreadNatureOTID`) or `ambient`
(`VBlankIntr+0x87`) and carries frame, caller, pre-cursor, and post-cursor.
The receipt test recomputes every edge, frame histogram, and nature-rejection
boundary without importing the packet into production.

| case | source epoch | frames | construction / ambient | attempt counts | entry → return cursor |
| --- | --- | ---: | ---: | --- | --- |
| anchor draft | `CreateFrontierFactorySelectableMons`, sets 156/149/180/153/179/181 | 6696–6748 (53) | 242 / 52 | 23, 25, 51, 16, 2, 4 | `0xC09C88A4` → `0x75695192` |
| WIN GO ON LILIANA | `FillFactoryFrontierTrainerParty`, sets 169/170/130 | 11313–11344 (32) | 112 / 31 | 13, 7, 36 | `0x2F959DF4` → `0x0AB569B5` |
| legal varied | `FillFactoryFrontierTrainerParty`, `factory-varied.json`, sets 460/648/540 | 963–993 (31) | 202 / 30 | 59, 12, 30 | `0x7F6DDAD4` → `0xAED73C3C` |

The two three-mon epochs are materially different while using the same source
function. Construction bursts occur in one frame per mon, but the number of
ambient-only frames before the next burst changes with the actual work: the
LILIANA bursts begin at frames 11313/11323/11335, while the varied case begins
at 963/974/984. Ambient ticks also continue after the final mon before the
function returns. The first frame's VBlank may be before function entry, so
the table deliberately counts only the function-entry-to-return epoch; the
full probe keeps its call indices and the fixture keeps the exact epoch chain.

## Verdict

- Fixed video-frame insertion is insufficient: a frame tick identifies the
  interrupt boundary, not whether the source call has crossed it.
- Mon-boundary insertion is insufficient: the ambient count is not a fixed
  constant at a mon boundary and continues during post-final-mon work.
- A repeatable draw-count/work budget is insufficient: the same
  `FillFactoryFrontierTrainerParty` path has attempt vectors `[13, 7, 36]`
  and `[59, 12, 30]`, with different frame gaps `[10, 12]` and `[11, 10]`.
  Species/stat work and the interrupt phase contribute as well.
- The smallest source-general contract that can reproduce all checked cases
  is a construction RNG cursor plus a deterministic construction clock: the
  initial cycle/phase within the VBlank period, exact source-operation cycle
  budget (including species/stat work), and an ambient callback for each
  crossed period. This is not available to the current source-state-only
  TypeScript tick model. The evidence therefore refutes per-fixture cursor
  adoption as the production model; it does not add a red contract test or
  production schedule. Personality-exact live construction remains an honest
  boundary until that clock contract exists.

## Reproduction

Run each case twice with fresh output paths and compare the JSON bytes:

```sh
python3 tools/run-mgba-probe.py /tmp/fresh-anchor-a.json -- \
  python3 tools/probe/trace-factory-construction-rng.py /tmp/fresh-anchor-a.json anchor
python3 tools/run-mgba-probe.py /tmp/fresh-anchor-b.json -- \
  python3 tools/probe/trace-factory-construction-rng.py /tmp/fresh-anchor-b.json anchor
cmp /tmp/fresh-anchor-a.json /tmp/fresh-anchor-b.json
```

Use `liliana` and `factory-varied` as the final argument for the other two
cases. All six runs used here were byte-identical; the hashes are recorded in
the fixture. The known mGBA teardown SIGSEGV is accepted only after the
wrapper validates the newly written JSON.

## V2 cycle receipt (2026-08-10)

Set `FACTORY_CONSTRUCTION_CYCLE_EVIDENCE=1` in the wrapped probe command. The
three direct generated outputs are committed under
`tests/fixtures/factory-construction-cycle-v2/`; canonical JSON serialization,
hashes, LCG replay, phase ordering, operation boundaries, interrupt ordering,
and the candidate timing decomposition are pinned by
`tests/factoryConstructionCycleEvidenceV2.test.ts`.

| case | SHA-256 (both fresh runs) | first Random phase | cycles since prior VBlank |
| --- | --- | ---: | ---: |
| anchor | `631bd21408ba41e03c0e119dde3d83d94dda023cee93ebc3e470e6d94741cc2a` | 91,673 | 50,560 |
| LILIANA | `ae1282b74f74de6a85b8772adfbcd83028fad09f8aa3e3ecd518aafeab17b443` | 257,104 | 215,990 |
| legal varied trainer 222 | `3e10197a34f4ea7a08a23bead04ae5b6113c653304722167095612a9b0626987` | 248,986 | 207,872 |

The v2 result first refuted the operation-only cost key. The candidate half is
now resolved source-generally: the operation carries the actual Random32
personality facts and `reduceFactoryNatureAttemptTiming` replays the compiled
`__umodsi3` path. It explains 267/278 boundaries directly; the other 11 are
each exactly +18 asynchronous hardware-service cycles (case counts `5/2/4`),
so all 278 are pinned as instruction path plus external service. A fresh
wrapped anchor run remained byte-identical at the hash above.

This is still not a production construction schedule. Live VBlank/audio/DMA
state, interrupt/event-entry latency, and the other construction operations'
source budgets remain missing. None may be selected by trainer, set, battle,
tick, or receipt cursor.

### Source-return component (2026-08-10)

The non-nature v2 boundary inventory below is computed after subtracting every
fully contained recorded VBlank entry-to-resume pause. Except for the resolved
rows, these net spans may still include the same separately classified
asynchronous hardware-service cycles seen by the nature receipt; the ranges
are evidence boundaries, not adopted reducer constants.

| boundary family | spans | net source-cycle range | disposition |
| --- | ---: | ---: | --- |
| construction entry → first `Random` | 12 | 58 | resolved below |
| `CreateMon` entry → return | 12 | 1,238,617–2,361,713 | unresolved |
| `CreateMon` return → `CalculateMonStats` entry | 12 | 26,672–41,256 | bounded EV-spread audit below; accepted personality is now exposed, exact memory-access timing remains unresolved |
| `CalculateMonStats` entry → return | 12 | 140,999–154,160 | unresolved |
| stats return → construction return | 12 | 22 | exact sub-boundary; retained with the unresolved stats operation |
| construction return → factory post-mon end | 12 | 127,759–140,592 | unresolved |
| post-mon end → next construction entry | 9 | 130–279 | unresolved outer-loop path; one 261→279 span carries +18 service |
| final post-mon end → source return | 3 | 32–40 | resolved below |

`reduceFactorySourceReturnTiming` now covers the complete `source-return`
operation after the final mon. The probe boundaries are the instruction after
the final held-item write through the first resumed caller instruction
(`battle_factory_screen.c:1757-1778`, `battle_tower.c:1867-1885`):

| source function | executed Thumb boundary | v2 cases | measured source cycles | VBlank pause / residual service |
| --- | --- | ---: | ---: | ---: |
| `CreateFrontierFactorySelectableMons` | `0x0819B612` → `0x0819A9FE` | anchor | 40 | 0 / 0 |
| `FillFactoryFrontierTrainerParty` | `0x0816376C` → `0x081635B2` | LILIANA + varied | 32 each | 0 / 0 |

The first tail takes the final `bhi` after its six-mon loop; the second lets
the final `bls` fall through after its three-mon loop. Both then restore the
same saved-register set and return via `bx`. At retail WS0 timing this is
respectively 14 sequential Thumb instructions plus two pipeline refills, and
13 sequential instructions plus one refill. All **3/3** applicable v2 spans
match directly. This reducer selects only the compiled source function; it
does not inspect trainer, set, mon, frame, cursor, or receipt identity.

CreateMon, EV-spread, CalculateMonStats, factory-post-mon, and the live
VBlank/audio/DMA workload remain unresolved, so the clock remains unwired.

### EV-spread operation audit (2026-08-10)

The complete measured operation starts at the first instruction after
`CreateMon` returns and ends at entry to `CalculateMonStats`: pipelined probe
PCs `0x0806869E → 0x08068D0E`, corresponding to executed boundaries
`0x0806869C → 0x08068D0C`. The compiled source path is:

- `pokemon.c:2577-2592`, `0x0806869C-0x080686E8`: six-bit population loop,
  `MAX_TOTAL_EVS / statCount`, six branch-sensitive stat iterations, and the
  final `CalculateMonStats` BL;
- signed positive division `__divsi3`, `0x082E7540-0x082E75C6`;
- each selected bit calls `SetMonData`, `0x0806ACAC-0x0806AD98`, which routes
  EV fields through `SetBoxMonData`, `0x0806AD9C-0x0806B3F8`;
- each `SetBoxMonData` performs four direct `GetSubstruct` calls, decrypts,
  checks the checksum (four more `GetSubstruct` calls), writes the selected
  EV byte, recomputes the checksum (another four calls), and re-encrypts.
  The relevant callees are `GetSubstruct` `0x0806A270-0x0806A516`,
  `DecryptBoxMon` `0x0806A24C-0x0806A26E`, `CalculateBoxMonChecksum`
  `0x08068C78-0x08068D08`, and `EncryptBoxMon` `0x0806A228-0x0806A24A`.

After subtracting every fully contained VBlank entry-to-resume pause, the 12
source spans remain:

| case | EV spreads | net source cycles | fully contained VBlank pauses |
| --- | --- | --- | --- |
| anchor (6) | `37,17,17,17,3,17` | `40,410 / 28,616 / 26,672 / 27,878 / 28,148 / 26,876` | six zeroes |
| LILIANA (3) | `5,36,17` | `27,080 / 27,524 / 28,190` | three zeroes |
| varied (3) | `6,37,37` | `27,098 / 38,673 / 41,256` | `0 / 36,217 / 0` cycles (one pause in mon 1) |

These cover two-stat and three-stat paths and selected-bit siblings across
five stat positions (all but Speed). They also refute an `evSpread`/`statCount`-only
reducer: spread 17 alone occupies 26,672–28,616 cycles. The smallest missing
source input was the **full accepted personality**. `SetBoxMonData` reads it
for every `GetSubstruct -> __umodsi3(personality, 24)` call; the compiled
division path depends on the full dividend, not only its remainder. The
construction clock now propagates that accepted personality to its
`create-mon`, `ev-spread`, and `calculate-mon-stats` operation keys, with a
red-verified Tier-1 pin. OT ID participates only in fixed-path XOR encryption
and does not select a branch here.

This checkpoint does **not** publish a timing reducer. Exact instruction-fetch
and EWRAM data-access timing across the decrypt/checksum/re-encrypt calls was
not completed in the bounded step, so the observed values above remain
receipt assertions rather than constants. Consequently no +18 asynchronous
service residual can yet be separated honestly from the instruction path;
none is silently absorbed. The sole fully contained VBlank pause is classified
separately as shown above. The clock remains unwired.

### Construction-entry component (2026-08-10)

`reduceFactoryConstructionEntryTiming` covers the complete
`construction-entry` operation from the first instruction of
`CreateMonWithEVSpreadNatureOTID` through entry to its first `Random` call.
The applicable source callers prepare different arguments at distinct Thumb
call sites, but both have converged on the same unconditional callee path by
the measured boundary:

| source function | compiled BL / callee entry / first `Random` | v2 spans | measured source cycles | VBlank pause / residual service |
| --- | --- | ---: | ---: | ---: |
| `CreateFrontierFactorySelectableMons` | `0x0819B5A4` / `0x08068634` / `0x0806F5CC` | anchor 6 | 58 each | 0 / 0 |
| `FillFactoryFrontierTrainerParty` | `0x08163706` / `0x08068634` / `0x0806F5CC` | LILIANA 3 + varied 3 | 58 each | 0 / 0 |

The source sites are `battle_factory_screen.c:1765`, `battle_tower.c:1870`,
and `pokemon.c:2562-2570`. The instruction decomposition is: five halfwords
to save five low and three high registers; four to allocate locals, preserve
the mon pointer, and load the two stack arguments; fourteen to normalize and
preserve species, level, nature, fixed IV, and EV spread; one to zero
`statCount`; and the two-halfword `BL Random`. At retail WS0 timing this is
**26 × 2 = 52** sequential master cycles plus one **6**-cycle taken-call
pipeline refill, for **58** total. The receipt additionally pins each entry's
saved LR to the relevant compiled caller (`BL + 5`, including the Thumb bit),
so the equal total cannot mask different entry paths.

All **12/12** applicable spans decompose directly after subtracting fully
contained VBlank entry-to-resume pauses: case counts are **6/3/3**, every
contained-pause sum is **0**, and every residual asynchronous-service count is
**0**. The reducer accepts only the already-exposed source function, solely to
retain the audited caller provenance; neither argument values nor runtime
identity can branch before the first Random boundary.

CreateMon, EV-spread, CalculateMonStats, factory-post-mon, and the live
VBlank/audio/DMA workload remain unresolved, so the clock remains unwired.
