# WIN GO ON → LILIANA far-side dynamic window (Battle Scene OFF)

Side-lane ground-truth receipt for the generic seven-battle round seam after
the Battle-1 WIN, swap decline, guide dismissal, room re-entry, and Battle-2
opponent walk-in. It deliberately stops at the first fully typed opponent
quote frame; it does not dismiss that quote or replay a Battle-2 action.

## Exact replay linkage

`tools/compare/traces-groundtruth/win-go-on-swap-offer-no-liliana-far-side-off.json`
is a derived trace whose `sourceTrace` is the committed
`win-go-on-swap-offer-no-guide-dismiss-off.json`. It has no appended inputs,
so it reuses that full recorded 39-segment / 11,308-frame prefix byte-for-byte.
It explicitly retains the `generated-orchestrator` route,
`win-terminal-window-off` app stage at frame 4623, and the same committed
`mechanicLab` fixture
`tools/battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json`.

The additive capture window is dense **10638..10752 inclusive** (115 frames,
below the oracle's 256-capture limit): LILIANA's first visible sprite pixels,
the full walk-in, message-box creation at 10724, and every quote-printing
frame through the held `I WON’T GIVE UP / UNTIL I WIN` boundary at 10752.

## Provenance and verdict

The source-generated trainer presentation resolves trainer **9 LILIANA**:
`FRONTIER_TRAINER_LILIANA`, `FACILITY_CLASS_SCHOOL_KID_F` (`0x27`) →
`OBJ_EVENT_GFX_GIRL_3` (`14`) → the extracted `GIRL_3` room walk-in sheet;
her `speechBefore` supplies the displayed two-line quote. The generic room
timing is unchanged — this receipt proves the content seam, not an
absolute-tick rendering branch.

Two fresh Battle Scene OFF comparisons both passed **115/115 exact**:

```sh
npm run compare -- win-go-on-swap-offer-no-liliana-far-side-off --summary
```

`tests/winBattle2LilianaFarSideReceipt.test.ts` locks the derived-spec →
source-prefix → fixture linkage, dense capture span, trainer/class/gfx/sheet,
and quote provenance. The pre-existing guide-dismiss trace remains the
broader regression window.
