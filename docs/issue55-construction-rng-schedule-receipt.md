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
| `CalculateMonStats` entry → return | 12 | 140,999–154,160 | bounded direct-call audit below; no generic reducer yet |
| stats return → construction return | 12 | 22 | exact sub-boundary; retained with the unresolved stats operation |
| construction return → factory post-mon end | 12 | 127,759–140,592 | unresolved |
| post-mon end → next construction entry | 9 | 130–279 | resolved outer-loop path below; one 261→279 span carries +18 service |
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

## Instruction-level +18 queue-observable checkpoint (2026-08-10)

The existing construction probe now has a separate opt-in
`FACTORY_RESIDUAL_18_INSTRUCTION_EVIDENCE=1` path. It selects the anchor's
source-reduced `__divsi3(9300, 100)` clean control and nearby
`__divsi3(11300, 100)` +18 member: both are mon-3 calls through the same
`0x082e7542` entry / `0x08068f3e` return and both have a 318-cycle compiled
source budget. The hook records each retired instruction boundary, its local
cycle delta, and CPU `nextEvent` distance. It does not alter the v1/v2
construction or residual packets.

The intended semantic queue observation could not be banked in this bounded
step. Two fresh Battle Scene OFF attempts to dereference libmgba-py's exposed
`mTiming.root` during that selected window terminated with SIGSEGV (exit 139)
before writing JSON; `tools/run-mgba-probe.py` rejected both outputs. Walking
`mTimingEvent.next` and reading the root event's name were tested separately
and both fail the same wrapper contract. The landed hook therefore leaves
`eventQueue` empty rather than retaining an unsafe pointer token or pretending
endpoint distance identifies an event.

This is narrowing evidence, not a timing result: the next missing observable
is a safe libmgba API/shim that snapshots the due timing-event callback name
and queue position before/after one `core.step()`. Until that exists, the
instruction packet cannot expose the responsible event identity, no fresh
receipt is committed, +18 remains external, and both cycle contracts remain
null/unwired.

## Recurring +18 source-boundary census (2026-08-10)

The opt-in sibling mode `FACTORY_RESIDUAL_18_EVIDENCE=1` replays all three
wrapper-validated Battle Scene OFF epochs and snapshots only exact compiled
boundaries plus scalar CPU scheduler, IRQ, DMA, bus, and ROM-prefetch state.
Deterministic gzip packets live under
`tests/fixtures/factory-construction-residual-boundaries-v1/`; they retain no
trainer/set/mon identity, RNG cursor, app tick, or duration key.

Tier 1 joins them to the existing source receipts by exact master cycle and PC:

| compiled segment | exact boundary PCs | +18 | clean controls |
| --- | --- | ---: | ---: |
| nature attempt | `0x0806d08a` → next `0x0806f5ce` or `0x08067b4e` | 11 | 267 |
| non-final selectable Factory tail | `0x0819b614` → `0x08068636` | 1 | 8 |
| encrypted stats accessor | `0x0806a51a` → exact caller return | 67 | 77 |
| level-50 EXP loop only | `0x08069090` → `0x080690ac` | 3 | 8 |
| signed divide | `0x082e7542` → exact caller return | 1 | 71 |
| direct `GetNature` | `0x0806d072` → exact caller return | 2 | 57 |
| **total** | | **85** | **488** |

The accessor histogram remains exactly
**0×77 / +18×67 / +117×5 / +245×6 / +263×1**. The level audit preserves the
isolated post-accessor composition **43 + 21 + 2,200 + 18 = 2,282**.

This refutes a missing fixed source instruction/refill/fetch segment: every
compiled segment has clean siblings at the same entry and source-relative
return class. It also finds no boundary-visible IRQ/DMA service. All **85**
members and **488** clean controls have `activeDMA=-1`, `performingDMA=0`,
`cpuBlocked=false`, `IF=0`, and ROM prefetch enabled. Members occupy more than
75 distinct cycle phases, and `nextEvent-cpu.cycles` overlaps clean controls.

The exact missing discriminator is therefore the instruction-to-instruction
scheduler event crossed *inside* each span: its timing-event identity/queue
state immediately before and after the 18-cycle increment. Endpoint evidence
cannot yet distinguish (b) prefetch/bus overlap from (c) a non-IRQ
asynchronous PPU/timer/audio service that completes before return. No reducer
or +18 constant lands; all accessor/clock cycle contracts stay null/unwired.

### Non-final outer-loop component (2026-08-10)

`reduceFactoryOuterLoopTiming` covers every non-final
`factory-post-mon-end → construction-entry` span. The boundary begins with the
first loop-test instruction after the preceding held-item `SetMonData`, follows
the non-final back edge and next-record loads, and ends at the next
`CreateMonWithEVSpreadNatureOTID` entry:

| source function | executed Thumb boundary | v2 spans | source decomposition | measured / residual service |
| --- | --- | ---: | --- | --- |
| `CreateFrontierFactorySelectableMons` | `0x0819B612 → 0x0819B5A4 → 0x08068634` | anchor 5 | `61×2 + 6×8 + 5×11 + 4×9 = 261` | `261 / 261 / 261 / 279 / 261`; residual `0 / 0 / 0 / 18 / 0` |
| `FillFactoryFrontierTrainerParty` | `0x0816376C → 0x08163706 → 0x08068634` | LILIANA 2 + varied 2 | `27×2 + 2×8 + 3×11 + 3×9 = 130` | four `130`; four zero residuals |

The four terms are ordinary prefetched Thumb work (**2** cycles), taken
control flow including refill (**8**), PC-relative ROM literal loads (**11**),
and ROM facility-table loads (**9**). Stack and IWRAM accesses remain hidden by
prefetch in the ordinary class. A fresh instruction-step audit reproduced
those classes at every executed instruction. It also placed the sole extra
**18** cycles between `0x0819B528` and `0x0819B52A`, an ordinary shift pair,
matching the already-classified asynchronous hardware-service stall rather
than any source branch. None of the nine same-frame spans contains a complete
VBlank entry-to-resume pause.

The selectable path is branch-general rather than anchor-fitted. Its inputs are
only the next source loop index, `GetNumPastRentalsRank` result, and challenge
number: an elevated rental executes the compiled `challengeNum + 1` arm, and
`GetFactoryMonFixedIV`'s retail `challenge > 8` clamp is modeled separately
(challenge 8 intentionally remains the documented out-of-bounds row). Loaded
set/species/nature/EV values do not branch or alter bus timing, and
`sourceSetId` remains diagnostic only. The construction clock now emits a
`factory-outer-loop` operation between non-final mons; no live caller is wired.

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

### `CalculateMonStats` direct-call audit (2026-08-10)

The already-pinned operation is now independently split at every direct call:
executed boundaries `0x08068D0C → 0x080686EA` (mGBA pipelined PCs
`0x08068D0E → 0x080686EC`). Three opt-in, Battle Scene OFF probe packets live
beside—not inside—the frozen v2 receipt:
`tests/fixtures/factory-calculate-mon-stats-v1/{anchor,liliana,factory-varied}.json`.
Fresh wrapped repeats were byte-identical at SHA-256
`92d3feb4…`, `136efa4a…`, and `ea323d9e…`, respectively. They contain no party
pointer, trainer/set id, frame, cursor, or duration lookup key: only scalar
ABI inputs/results, accepted personality, direct-call PCs, and master cycles.

`pokemon.c:2823-2889` / ELF `CalculateMonStats` at `0x08068D0C` makes exactly
**40** direct calls on every observed normal Factory path: **15**
`GetMonData2`, **1** `GetLevelFromMonExp`, **8** `SetMonData`, **6**
`__divsi3`, **5** `GetNature`, and **5** `ModifyStatByNature`. Across all
**12/12** operation spans this is **480** independently paired calls. The
receipt pins each caller, callee, return PC, field id or arithmetic ABI values,
the six divisor-100 divisions, five `personality % 25` nature values, and
stat indexes 1–5. It therefore proves the operation scheduler's existing
`calculate-mon-stats` emission receives the accepted personality it needs;
the scheduler remains deliberately unwired.

After subtracting the seven fully contained VBlank pauses, total source spans
are **140,999–154,160** cycles. The direct callees account for
**139,916–153,077** cycles; the caller interstitial is just **1,081** or
**1,083** cycles in the committed cases. That parent slice is now exact:
`reduceFactoryCalculateMonStatsParentTiming` walks the ELF branches using only
species, old max HP, current HP, and newly calculated max HP. Its retail timing
classes are ordinary prefetched Thumb halfwords (**2**), taken-flow refill
(**+6**), PC-relative ROM literal (**11** total), and `gSpeciesInfo` ROM byte
read (**9** total); stack/IWRAM/EWRAM accesses in this body remain hidden by
prefetch in the ordinary class.

The precise split is the `gBattleScripting.levelUpHP` branch at
`0x08068E38`. The field is u8, so it tests
`(newMaxHp - oldMaxHp) & 0xff`: a nonzero value takes the branch and costs
`345×2 + 51×6 + 5×(11−2) + 6×(9−2) = 1,083`; zero falls through two extra
halfwords but avoids one refill and costs
`347×2 + 50×6 + 5×(11−2) + 6×(9−2) = 1,081`. The receipt contains **10**
nonzero and **2** zero cases, all exact. Source-derived tests additionally pin
the u8 wrap-to-zero case, normal initialize/adjust/early-return paths, and
Shedinja's omitted max-HP divide and HP branches.

This does **not** reduce the complete operation. The encrypted `GetMonData2`
and `SetMonData` callees still use personality-dependent `%24` substruct
routes; level lookup depends on growth/experience; `GetNature` uses `%25`; and
the six direct signed `__divsi3` calls retain their own compiled paths. Exact
ROM/EWRAM timing for those remaining nested direct callees is still required.
A case duration table, fixture identity, or observed residual is not an
admissible substitute, and the clock stays unwired.

### `ModifyStatByNature` direct-callee component (2026-08-10)

`reduceFactoryModifyStatByNatureTiming` now exactly reduces the bounded
direct callee at `pokemon.c:5878-5911` / ELF
`0x0806D8D4→0x0806D932`. The reducer accepts only the source ABI values:
valid `GetNature` output (**0–24**), source-u16 incoming stat, and source-u8
stat index. It never receives mon memory, species, set/trainer, battle/frame/
tick/cursor, receipt identity, or an observed duration.

The compiled path first narrows all three arguments, skips the nature table
for stat index **0** or **6–255**, then otherwise fetches the signed
`gNatureStatTable[nature][statIndex - 1]` byte through one PC-relative ROM
literal (**11** cycles total) and one ROM byte read (**9** total). Neutral rows
return the input; raise/lower rows execute `stat * 110` or `stat * 90`, truncate
the product to u16 exactly as the retail `retVal`, and replay the nested
`__udivsi3(..., 100)` Loop1/2/3 path instruction-by-instruction. The reducer
also models ARM7TDMI `muls` early termination from the zero-extended stat:
one internal cycle through **255**, two from **256–65535**. Its branch tests
cover the guard (**48** cycles), neutral return (**98**), both table signs,
u16 product wrap, and the higher multiply-width route; the Factory receipt's
actual stat values are all in the one-cycle multiply class.

All **60/60** committed calls reduce exactly after the receipt's contained-
interrupt subtraction (there are no contained VBlank pauses inside these
short calls): **52** neutral calls at **98** cycles, **3×416 + 1×418** raise
calls, and **3×408 + 1×410** lower calls. A fresh wrapped Scene-OFF anchor
probe reproduced its packet byte-for-byte at
`92d3feb4686cddfdaf7a6b14be3931514f2007f59052f0f4a64deb5bba287773`, including
the anchor's **28×98 + 416 + 410 = 3,570** nature-modification cycles.

This resolves **60/480** direct-call sites (**12.5%**) and **8,396** of the
combined **1,768,691** pause-subtracted direct-callee cycles across the 12
stats spans (**0.475%**; **0.471%** of all **1,781,683** source cycles). The
small percentage is expected: encrypted `GetMonData2` dominates the remaining
budget. It does not license a complete `CalculateMonStats` cost or live-clock
wiring; the unresolved Get/Set, level, `%25` nature-fetch, signed-divide, and
VBlank/audio work remain explicit.

### `GetNature` direct-callee component (2026-08-10)

`reduceFactoryGetNatureTiming` reduces the distinct direct-call boundary at
`pokemon.c:5493-5496` / ELF `0x0806D070→0x0806D088` from the full accepted
personality alone. This is not the construction loop's already-pinned
`GetNatureFromPersonality+2` boundary. `GetNature` first takes the field-zero
`GetMonData2→GetBoxMonData2` path, then executes
`__umodsi3(personality, 25)` and returns its u8 result.

The fixed field-zero accessor costs **180** cycles: **54** sequential Thumb
halfwords, **9** pipeline refills, one PC-relative ROM literal, one ROM jump-
table word, and one 32-bit EWRAM personality read. The `GetNature` wrapper
outside its nested callees adds **42** cycles. The modulo path remains fully
personality-dependent and reuses the existing instruction-exact nature-attempt
reducer after subtracting only its named **66**-cycle accepted-call shell; the
existing **278-call** rejection receipt and reducer contract are unchanged.

All **60/60** calls yield the recorded nature exactly and account for **59,900**
source cycles: anchor **29,875**, LILIANA **14,830**, varied **15,195**. Of the
raw direct-call spans, **57** equal the reducer directly, **2** are reducer
**+18**, and **1** is reducer **+245**, for **60,181** observed cycles total.
A temporary fresh instruction trace placed the +245 entirely in a nested
`VCountIntr→m4aSoundVSync` IRQ (**80** ISR/BIOS instructions) before resuming
`__umodsi3`; the two +18 spans are the already-classified asynchronous timing-
service class. Neither external cost is absorbed into the source reducer. A
fresh wrapped anchor packet remained byte-identical at `92d3feb4…`.

This resolves another **60/480** direct-call sites (**12.5%**) and **59,900 /
1,768,691 = 3.386%** of pause-subtracted direct-callee cycles. Together with
`ModifyStatByNature`, the two completed families cover **120/480** sites and
**68,296** direct-callee cycles. Encrypted Get/Set, level/growth, direct signed
divide, and VBlank/audio arbitration remain unresolved, so this does not wire
or complete `CalculateMonStats`.

### Direct signed-division component (2026-08-10)

`reduceFactorySignedDivisionTiming` now reduces all **72/72** direct signed
divisions in the v1 packets: six per mon across the anchor/LILIANA/varied
**6/3/3** mon boundaries. The ABI is only a source signed i32 dividend and
divisor. The reducer validates those widths, returns the retail signed result
and u32 result bits, and has no mon, target, set, trainer, frame, tick, cursor,
fixture, or observed-duration input.

The pinned ELF body starts at the measured `0x082E7542` boundary. Its wrapper
replays divisor-zero `__div0`, sign capture in `ip`, each source-sign
`negs`, and final result-sign `negs`. For nonzero divisors it enters the
inline unsigned core at `0x082E755C`; that core is factored with the exact
Loop1/Loop2/Loop3 instruction sequence already used by the distinct
`__udivsi3` boundary at `0x082E7B68`, while each symbol's setup and return
remain separate. The core is the unsigned shift/subtract algorithm, not the
different `__umodsi3` rotation/correction body.

All 72 calls have divisor `100`. The source-cycle histograms are anchor
`194×1 + 258×2 + 318×16 + 320×10 + 322×7 = 11,252`, LILIANA
`258×2 + 318×5 + 320×9 + 322×2 = 5,630`, and varied
`256×1 + 318×3 + 320×9 + 322×5 = 5,700`: **22,582** cycles total. Every
direct call contains zero fully contained VBlank pauses. Raw spans decompose
as **71×exact + 1×(+18)**; the sole residual is the anchor mon-3
`11300/100` `sp-attack` call (reducer **318**, raw **336**) and is retained as
asynchronous timing service, not folded into the reducer. Source tests also
pin negative operands, zero dividend/divisor, and retail `INT_MIN / -1`
wraparound (`0x80000000`).

This closes **72/480** direct calls (**15%**) and **22,582 / 1,768,691 =
1.277%** of the pause-subtracted direct-callee cycles. It is a bounded
component only: encrypted Get/Set, level/growth, nature fetch, VBlank/audio,
and the aggregate `CalculateMonStats` operation remain unresolved; the
construction clock stays unwired.

### Direct `SetMonData` party-write component (2026-08-10)

`reduceFactorySetMonDataTiming` now exactly reduces the 8 direct
`SetMonData` calls made by each normal `CalculateMonStats` body: **96/96**
across the three v1 packets. Its sole input is the source ABI's signed `field`
selector in r1. The pointer/data value is intentionally not accepted: the
direct arms copy bytes to a fixed `struct Pokemon` offset, with no
value-dependent compare, branch, width selection, or address calculation.
No mon, target, case, set/trainer, frame/tick/cursor, fixture, or duration is
used to select timing.

The source is `pokemon.c:4105-4141`; the exact retail ELF body is
`SetMonData` `0x0806ACAC..0x0806AD98`, measured at mGBA's pipelined entry
`0x0806ACAE`. The compiled direct dispatch first executes 11 Thumb
halfwords—the push, signed-selector `field - 55`, unsigned `bhi` guard,
table-base literal, indexed table pointer load, and `mov pc, r0`. The source
instruction audit sees both ROM word loads as **11** master cycles total (not
the prefetchable 9-cycle byte-table class), and every `mov pc`/case branch/
`bx` adds the normal 6-cycle pipeline refill. Party-data loads/stores remain
within the ordinary 2-cycle instruction class at this boundary.

| source selector(s) | compiled direct arm | write width / offset | Thumb halfwords / refills / ROM words | source cycles |
| --- | --- | --- | ---: | ---: |
| 55 | status | u32 / `0x50` | 25 / 3 / literal+table | 86 |
| 56 | level | u8 / `0x54` | 18 / 3 / literal+table | 72 |
| 57–63 | HP, max HP, ATK, DEF, SPEED, SPATK, SPDEF | u16 / `0x56..0x62` | 21 / 3 / literal+table | 78 |
| 64 | mail | u8 / `0x55` | 18 / 3 / literal+table | 72 |
| 65 | `MON_DATA_SPECIES_OR_EGG` | explicit no-op | 13 / 2 / literal+table | 56 |

The receipt calls are exactly field 56 once and fields 57–63 seven times per
mon, so their instruction derivations are `18×2 + 3×6 + 2×(11−2) = 72` and
`21×2 + 3×6 + 2×(11−2) = 78`, respectively. All 96 are exact with zero
contained VBlank pause and zero external-service residual:

| case | calls | source cycles | exact / residual |
| --- | ---: | ---: | --- |
| anchor | 48 | 3,708 | 48 / 0 |
| LILIANA | 24 | 1,854 | 24 / 0 |
| legal varied | 24 | 1,854 | 24 / 0 |
| total | 96 | **7,416** | **96 / 0** |

For source fields below 55 or above 65, the same signed selector arithmetic
takes the default `bhi` arm into `SetBoxMonData` at pipelined
`0x0806AD9E`. The standalone result deliberately reports the exact
pre-delegate **30** cycles and return-shell **10** cycles but leaves its full
`cycles` null: the encrypted decrypt/checksum/re-encrypt body remains a
separate unresolved component. This is not a fitted fallback and does not
alter the clock wiring. The four completed direct-call families now cover
**288/480** sites and **98,294 / 1,768,691 = 5.557%** pause-subtracted direct
callee cycles; the aggregate CalculateMonStats operation remains unresolved.

### Direct `GetMonData2` party-read component (2026-08-10)

The v1 packets' **180** direct `GetMonData2` calls decompose by the source
field selector and compiled route as follows. Every row occurs once per each
of the **12** recorded mons:

| source fields | source targets | calls | compiled route |
| --- | --- | ---: | --- |
| 57, 58 | current HP, old max HP | 24 | jump table → direct party u16 read |
| 26–31 | six EVs | 72 | range compare default → `GetBoxMonData2` |
| 39–44 | six IVs | 72 | range compare default → `GetBoxMonData2` |
| 11 | species | 12 | range compare default → `GetBoxMonData2` |

`reduceFactoryGetMonDataTiming` accepts only the source signed-i32 field. At
the pipelined `0x0806A51A` boundary, a simple direct party route executes 19
Thumb halfwords, four pipeline refills, one 11-cycle ROM literal, one 11-cycle
ROM jump-table word, and an ordinary EWRAM byte/halfword read:
`19×2 + 4×6 + 2×(11−2) = 80` cycles. Thus all **24/24** receipt-used
direct reads are exact with zero contained VBlank pauses and zero external
service residual: anchor/LILIANA/varied **960/480/480 = 1,920** cycles. Fresh
wrapped Battle Scene OFF packets for all three cases were byte-identical to
the committed evidence at `92d3feb4…`, `136efa4a…`, and `ea323d9e…`.

The same instruction reducer covers source-general simple party fields 55–58,
64, and 84–88. The u32 status arm executes two fewer Thumb halfwords but its
6-cycle EWRAM word read yields the same **80** total. Fields 59–63 first call
`GetDeoxysStat`; they expose the exact **68**-cycle nested-entry shell and
**26/42**-cycle override/party-fallback return shells, but full timing remains
`null`. Default fields below 55 or above 88 expose the exact **36**-cycle
entry and **12**-cycle return shells around `GetBoxMonData2`; jump-table holes
65–83 expose **68/12**. The encrypted/default body remains unresolved: no
personality route, duration table, or observed residual is adopted.

The five completed direct-call families now cover **312/480** sites (**65%**)
and **100,214 / 1,768,691 = 5.666%** of pause-subtracted direct-callee cycles.
The unresolved **156** receipt reads are precisely the 13 encrypted fields
listed above, not an undifferentiated 180-call remainder. Level/growth,
encrypted reads/writes, and live VBlank/audio arbitration still prevent an
aggregate `CalculateMonStats` cost or construction-clock wiring.

### Direct `GetLevelFromMonExp` source-state/route checkpoint (2026-08-10)

The **12/12** direct level calls are now audited at source and ELF boundaries,
but are deliberately **not** counted as reduced. `pokemon.c:2910-2919` /
`0x08069054..0x080690B4` first makes two encrypted `GetMonData2` calls for
species (field 11) and experience (field 25), then walks
`gExperienceTables[gSpeciesInfo[species].growthRate]` from level 1 through the
first threshold above the current experience. The functional minimum is
therefore species (or its growth-rate byte) plus experience. Complete timing
also needs the accepted personality already carried by construction: both
encrypted accessors route `GetSubstruct` through the full
`__umodsi3(personality, 24)` path. The normal Factory route additionally
assumes its freshly constructed checksum is valid; the compiled bad-egg path
differs when it is not.

The opt-in probe now records only those scalars and five exact pipelined
boundaries, never the party pointer or decrypted storage. Twice-fresh
Scene-OFF packets are byte-identical at full SHA-256
`92d3feb4686cddfdaf7a6b14be3931514f2007f59052f0f4a64deb5bba287773`,
`136efa4a46777d1e0665f0af3efd6a9ef3b694c68048d3ef46b9140532de5358`, and
`ea323d9e8e881da6730c78af8965a579258cfd528a6a903a6c0c2dc23b005ce6`.
All twelve source states resolve to level 50 and cover growth rates **0, 2, 3,
5** with experiences **117,360 / 125,000 / 142,500 / 156,250**.

The post-accessor path is independently instruction/fetch exact. From the EXP
accessor return it is **43** cycles through the growth-rate load, **21** to the
first table comparison, **2,200** for the level-50 loop, and **18** for the
common `level - 1`/return tail: **2,282** source cycles. The loop term is
`553×2 + 49×6 + 50×(9−2) + 50×(11−2) = 2,200`. Eight observations
equal that path, three are **+18** external timing service, and varied mon 2
is **+308** with explicit `VCountIntr → m4aSoundVSync → VCountIntr`
entry/return evidence. None of those asynchronous costs is absorbed.

After subtracting the two fully contained VBlank pauses, complete callee
totals remain anchor/LILIANA/varied **123,879 / 61,954 / 61,089 = 246,922**
cycles. The two encrypted-accessor blocks account for **110,169 / 55,090 /
53,917 = 219,176** observed cycles; their decrypt/checksum/%24 instruction-
fetch and EWRAM timing is still the same unresolved component as the 156
encrypted direct stats reads. Consequently no complete `GetLevelFromMonExp`
reducer, keyed duration, identity branch, residual absorption, aggregate
stats cost, or construction-clock wiring landed.

### Shared encrypted `GetBoxMonData2` dependency census (2026-08-10)

The **156** unresolved direct stats reads and the **24** species/EXP reads
nested in `GetLevelFromMonExp` all take the same encrypted source route in
`pokemon.c:3727-4080` / ELF `0x0806A674..0x0806ACAA`. The 180-call census is
now explicit: species **24**, experience **12**, EV-byte **72**, and IV-
bitfield **72**. Each invocation performs four initial `GetSubstruct` calls,
a 12-word decrypt loop, a checksum containing four more `GetSubstruct` calls
and 24 halfword reads, one field extraction tail, and a 12-word re-encrypt
loop. Valid-checksum and corrupt-checksum/bad-egg branches are distinct source
states; the committed Factory observations all take the valid route.

`censusFactoryGetBoxMonDataDependency` accepts only field, personality,
checksum validity, and the species-tail bad-egg flag. It source-derives all
**24/24** `personality % 24` logical-to-physical substruct permutations and
the selected secure offset without accepting a pointer or decrypted bytes.
The twelve observed mons exercise modulo routes **2, 3, 5, 6, 7, 10, 18, 19,
20**; Tier 1 independently enumerates all 24 source rows and their exact ELF
jump-arm entries (`0x0806A2F8..0x0806A4E0`, explicitly non-contiguous).
Extraction tails
are pinned exactly: species `0x0806A95E`, EXP `0x0806A97C`, EVs
`0x0806A9A4..0x0806A9B8`, and IVs
`0x0806A9F6/9FE/AA06/AA0E/AA16/AA1E`. Their fetch classes remain explicit
(EWRAM u8/u16/u32, conditional or bitfield) rather than collapsed into a
recorded duration.

Stable common boundaries are likewise exposed: GetBox entry/probe
`0x0806A674/A676`, first GetSubstruct BL `A698`, decrypt/checksum BLs
`A6C6/A6CC`, dispatcher `A6F2`, common/encrypt/return tails
`AC8C/AC94/AC98`; GetSubstruct entry/modulo/dispatch/return
`A270/A27E/A288/A510`; decrypt/checksum/encrypt loops
`A256/068CB2/A232`. Twice-fresh wrapped Scene-OFF packets remain byte-identical
to the committed scalar-only receipts at `92d3feb4…`, `136efa4a…`, and
`ea323d9e…`; no new fixture or raw secure storage was required.

The result deliberately reports `cycles: null`. Exact total timing still
requires instruction/fetch reduction of `__umodsi3`, the personality-selected
GetSubstruct arms, ROM dispatcher reads, EWRAM bus-width accesses, and both
shared crypt/checksum loops. No duration/identity table, residual fit,
aggregate stats cost, or construction-clock wiring is implied.

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
