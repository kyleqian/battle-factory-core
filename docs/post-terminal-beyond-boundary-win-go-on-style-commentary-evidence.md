# Post-terminal beyond-boundary: WIN opponent-type → opponent-style commentary page (Battle Scene OFF)

SIDE-LANE binding packet, continuing
`docs/post-terminal-beyond-boundary-win-go-on-type-commentary-evidence.md` (which
proved the app exact 93/93 through the opponent-type commentary `"The TRAINER
appears to have no clear / favorites when it comes to type."`, held input-ready
from frame 7308, and stopped without pressing it). This packet authors the
**third press past the boundary** — exactly one more 2-tick `A` on that held
type-commentary page — in a new scratch battle-lab fixture, banks the ROM's
opponent-**style** commentary page (`CommentOnOpponentStyle`) with dense oracle
captures, stops at its next genuine held input boundary (the fully-typed
`MSGBOX_DEFAULT` style commentary, unpressed — **before** the swap offer), and
measures the current app over the whole new span with the same
`win-terminal-window-off` appStage.

**Headline**: the new fixture's press (frames 8138-8139) lands on a
byte-identical held type-commentary message, and the ROM then clears the box,
types `"The favorite battle style appears to / be free-spirited and
unrestrained."` (the `FACTORY_STYLE_NONE` branch — this fixture's generated
opponent party has no style-specialized move counts), and holds it input-ready
from **frame 8212** through the fixture end. **The app already reproduces every
one of those frames** — the new compare spec is **92/92 exact, 0 residual
classes** — so the existing `postwin` dialogue-page machinery
(`acceptPostwinDialoguePage` → `dialoguePage 3` → `POSTWIN_SCOUTING_LINES[2]`)
is **sufficient** for the opponent-style commentary boundary with no
calibration. There is **no first mismatch** to record.

## 1. New fixture and prefix proof

`tools/battle-lab/scratch-win-go-on-style-commentary-probe.json` is a copy of
the committed `tools/battle-lab/scratch-win-go-on-type-commentary-probe.json`
with all 29 existing `trace.segments` preserved **byte-for-byte** (JSON-equality
verified: the first 29 segments are identical; the entire top-level payload
except `trace.segments`/`trace.captureFrames` is identical). Two segments are
appended — the single 2-tick `A` press and a 900-frame bounded idle tail —
giving 31 segments / 9040 total frames. The press therefore lands at frames
8138-8139, **830 ticks inside** the type-commentary message's confirmed-held
span (7308-8138) extended by the appended idle margin.

Held-span proof (the "safely inside the proven held type-commentary message"
criterion): the new fixture's pre-press and press frames were compared against
the prior packet's own recorded held sha `b28f2422bb45cb7b…`:

| source | frames | sha256 | match |
|---|---|---|---|
| committed fixture (`scratch-win-go-on-type-commentary-probe.json`) | 8138 | `b28f2422bb45cb7b…` | — |
| new fixture pre-press anchors | 8136-8137 | `b28f2422bb45cb7b…` | ✅ byte-identical |
| new fixture press frames | **8138, 8139** | `b28f2422bb45cb7b…` | ✅ byte-identical (press lands on held message) |
| new fixture post-press anchors | 8140-8141 | `b28f2422bb45cb7b…` | ✅ byte-identical (no visual change during the press) |

## 2. Boundary ledger (this fixture's extension)

`bin/oracle lab` manifest (raw framebuffer sha256, dense 8136-8220 + 7 tail
anchors; both dense runs byte-identical):

| tick | sha256 (prefix) | what's on screen | mechanism |
|---:|---|---|---|
| 7308-8141 | `b28f2422bb45` | held "The TRAINER appears to have no clear / favorites when it comes to type." + wait-cursor | the prior packet's own held boundary, still constant at the press |
| **8138-8139** | `b28f2422bb45` | same held message (no visual change during the press) | this fixture's **single new `A` press**; `MSG_DISPLAY` dismisses the type `msgbox` and the script proceeds to `CommentOnOpponentStyle` (`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:301-311`) |
| 8142 | `4bf39eb6ea32` | message box interior cleared, blank box | `closemessage`-class box clear into the reused box (`scripts.inc:312`'s next `msgbox`) |
| **8143-8211** | 69 frames, 61 distinct shas (8 2-frame repeats = invisible glyphs) | **"The favorite battle style appears to / be free-spirited and unrestrained."** types at the same 1-visible-glyph/tick cadence family as the prior pages (final visible glyph 8211) | `FACTORY_STYLE_NONE` branch (`scripts.inc:314` → `Text_StyleUnrestrained`) — this fixture's generated opponent party's `factory_getopponentstyle` score falls below every style threshold |
| **8212** | `0876b5f15bc6` | fully typed message + 3×3 wait-cursor at box right — the 8211→8212 pixel diff is exactly that 9px arrow cluster | `MSGBOX_DEFAULT` wait handoff — **the next genuine held input boundary** (the opponent-style commentary); unpressed per this step's contract |
| 8212-9040 (829 ticks) | `0876b5f15bc6` constant | held, input-ready | fixture's bounded idle tail; `engine.mainCallback2` stays `134766173` (same settled overworld callback), `battleOutcome` 1, ordinary one-LCG-per-VBlank outside-battle RNG ownership |

Exact text (`reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:600-602`):

> `BattleFrontier_BattleFactoryPreBattleRoom_Text_StyleUnrestrained:`
> `.string "The favorite battle style appears to\n"`
> `.string "be free-spirited and unrestrained.$"`

The style line is the **first** `CommentOnOpponentStyle` message
(`scripts.inc:301-311` dispatch, `FACTORY_STYLE_NONE` → `StyleUnrestrained` at
`:313-314`); the swap offer (`Text_LikeToSwapMon`, `MSGBOX_YESNO`, `:316-319`)
is *not* reached — no further press is authored.

## 3. Hash reproduction (twice each)

- **Dense oracle run** (92 captures, dense 8136-8220 + 7 tail anchors): run 1
  vs run 2 → **92/92 identical sha256**, 0 diffs.
- **Held tail** (anchors 8250, 8300, 8400, 8600, 8800, 9000, 9040): all
  `0876b5f15bc6` constant — the held boundary holds through the fixture end.
- **App compare** (92 captures): run 1 vs run 2 → **92/92 matched**, 0 diffs.

## 4. App binding result

New compare spec `tools/compare/traces-groundtruth/win-go-on-style-commentary-off.json`
reuses the canonical `win-terminal-window-off` appStage at its canonical stage
frame 4623 and copies the new fixture's 31 segments + 92 captureFrames verbatim
(verified byte-identical). Result:

| spec | appStage | oracleBattleLab scenario | segments | captures | result |
|---|---|---|---|---|---|
| `win-go-on-style-commentary-off.json` | `win-terminal-window-off` @ 4623 | `scratch-win-go-on-style-commentary-probe.json` | 31, sum 9040 | 6 held anchors + 79 dense 8136-8220 + 7 tail anchors | **92/92 exact, 0 diff** |

**No first mismatch exists** on the new span: the app is byte-identical on the
held type-commentary anchors, both press frames, every dense dismiss/clear/
typing frame 8142-8220 (including the 8142 box-clear, the 69-frame typing
cadence with its 8 invisible-glyph repeats, and the 8212 wait-cursor
appearance), and the 8212-9040 held tail. Mechanism sufficiency: **yes — the
existing `postwin` dialogue-page machine is the whole story.**
`core.ts:918-926` feeds the A press to `acceptPostwinDialoguePage`
(postwin.ts:568-577), which stores the page-3 edge and advances `dialoguePage`
2→3; `core.ts:2303` renders `POSTWIN_SCOUTING_LINES[2]` (postwin.ts:149, the
`battleStyleLines` member) with the existing edge-relative
`POSTWIN_DIALOGUE_*_DELAY` clocks. The lines are computed for the generated
route's round opponent via `createPostwinStateFromRound`'s
`createFactoryCorpusParty(round.rules.currentOpponent.rentalRecords)` → the
win-terminal stage's generated opponent (setIds 122/118/110 = ARON / DELIBIRD /
GRIMER), whose `getFactoryOpponentBattleStyle` (factoryCommentary.ts:228-250)
scores every style below its required move count → `FACTORY_STYLE_NONE` →
`STYLE_LINES[0]` = exactly the `Text_StyleUnrestrained` pair
(factoryCommentary.ts:275). Since the app and the ROM render byte-identical
pixels across the whole typing span, the ROM's own generated opponent party
likewise fell into the `FACTORY_STYLE_NONE` branch. No new mechanism and no
calibration are needed for the opponent-style commentary boundary.

The only remaining gap past this boundary is the swap offer (`Text_LikeToSwapMon`,
YES/NO) and the swap decision — each requires its own A press and is outside
this packet's single-input contract.

## 5. Reproducing the numbers

```sh
npm run compare -- win-go-on-style-commentary-off --summary  # 92/92 (new)
npm run compare -- win-go-on-type-commentary-off --summary  # 93/93 (regression)
npm run compare -- win-go-on-scout-off --summary           # 143/143 (regression)
npm run compare -- win-beyond-boundary-off --summary       # 228/228 (regression)
npm run compare -- win-terminal-window-off --summary       # 2082/2082 (canonical)
```

Runs used: `tools/compare/out/run-2026-08-05-08-49-31Z-53752` and
`run-2026-08-05-08-50-21Z-54021` (both 92/92); oracle lab out dirs
`/tmp/style-dense` + `/tmp/style-dense-2` (92/92 identical sha256).

## 6. Checks

`npm run test:smoke` and the full `npm test` / `npm run build` were run green
before the side-lane commit (see the committing entry). Only new files were
committed: the scratch fixture, the ground-truth spec, and this doc. No
`src/`, `tests/`, `tools/compare/traces/`, canonical trace, or existing
fixture was edited. PAPERCUT: none new.
