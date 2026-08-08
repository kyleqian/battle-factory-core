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
