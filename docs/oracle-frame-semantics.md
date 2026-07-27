# Oracle trace frame semantics

`captureFrames` numbers states, not input events:

- Frame `0` is the canonical anchor before any trace input is applied.
- Each requested segment frame holds that segment's buttons for one emulator
  or engine advance.
- The advance from state `N` produces state and capture frame `N + 1`.
- Therefore, a button segment that begins after `K` idle frames first applies
  during the advance from frame `K` to frame `K + 1`.

For example, this trace holds `A` for two advances after three idle advances:

```json
{
  "segments": [
    { "frames": 3, "buttons": [] },
    { "frames": 2, "buttons": ["A"] },
    { "frames": 1, "buttons": [] }
  ],
  "captureFrames": [3, 4, 5, 6]
}
```

| Capture | Buttons used to produce it | Meaning |
| --- | --- | --- |
| `3` | none | Last pre-press state |
| `4` | `A` | First state after an `A`-held advance |
| `5` | `A` | Second state after an `A`-held advance |
| `6` | none | First state after release |

The first *visible* response may occur later than frame `K + 1`: the real game
can sample input in one task and render its effect in a later frame. Describe
that separately as a visible-effect boundary rather than shifting the
press-tick.

The HTTP oracle implements this contract in `oracle/server.py::run_trace`.
The app comparator implements and tests the same sequence through
`tools/compare/traceReplay.ts`.
