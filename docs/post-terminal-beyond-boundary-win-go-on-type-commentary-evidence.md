# Post-terminal beyond-boundary: WIN GO ON → opponent-type commentary page (Battle Scene OFF)

SIDE-LANE binding packet, continuing
`docs/post-terminal-beyond-boundary-win-go-on-scout-evidence.md` (which proved
the app exact 143/143 through the first scouting message, held input-ready
from frame 6704, and stopped without pressing it). This packet authors the
**second press past the boundary** — exactly one more 2-tick `A` on that held
scouting message — in a new scratch battle-lab fixture, banks the ROM's
opponent-type commentary page with short-coarse then dense oracle captures,
stops at its next genuine held input boundary (the fully-typed
`MSGBOX_DEFAULT` commentary, unpressed), and measures the current app over the
whole new span with the same `win-terminal-window-off` appStage.

**Headline**: the new fixture's press (frames 7237-7238) lands on a
byte-identical held scouting message, and the ROM then clears the box, types
`"The TRAINER appears to have no clear / favorites when it comes to type."`
(1 glyph/tick, 67 glyphs), and holds it input-ready with the 3×3 wait-cursor
from **frame 7308** through the fixture end. **The app already reproduces
every one of those frames** — the new compare spec is **93/93 exact, 0
residual classes** — so the existing `postwin` dialogue-page machinery
(`acceptPostwinDialoguePage` → `dialoguePage 2` → `POSTWIN_SCOUTING_LINES[1]`)
is **sufficient** for the favorite-type commentary boundary with no
calibration. There is **no first mismatch** to record.

## 1. New fixture and prefix proof

`tools/battle-lab/scratch-win-go-on-type-commentary-probe.json` is a copy of
the committed `tools/battle-lab/scratch-win-go-on-scout-probe.json` with all
27 existing `trace.segments` preserved **byte-for-byte** (JSON-equality
verified: the first 27 segments are identical; the entire top-level payload
except `trace.segments`/`trace.captureFrames` is identical). Two segments are
appended — the single 2-tick `A` press and a 900-frame bounded idle tail —
giving 29 segments / 8138 total frames. The press therefore lands at frames
7237-7238, ~530 ticks inside the scouting message's confirmed-held span
(6704-7236) extended by the appended idle margin.

Held-span proof (the "safely inside the proven held scouting message"
criterion): the new fixture's pre-press and press frames were compared against
the prior packet's own recorded held sha `24a9fff888d7…`:

| source | frames | sha256 | match |
|---|---|---|---|
| committed fixture (`scratch-win-go-on-scout-probe.json`) | 7236 | `24a9fff888d75d36…` | — |
| new fixture pre-press anchors | 7236-7239 | `24a9fff888d75d36…` | ✅ byte-identical |
| new fixture press frames | **7237, 7238** | `24a9fff888d75d36…` | ✅ byte-identical (press lands on held message) |

## 2. Boundary ledger (this fixture's extension)

`bin/oracle lab` manifest (raw framebuffer sha256, dense 7236-7440 + sparse
tail; both dense runs byte-identical):

| tick | sha256 (prefix) | what's on screen | mechanism |
|---:|---|---|---|
| 6704-7239 | `24a9fff888d7` | held "I've conducted a little investigation / about your upcoming opponent." + wait-cursor | the prior packet's own held boundary, still constant at the press |
| **7237-7238** | `24a9fff888d7` | same held message (no visual change during the press) | this fixture's **single new `A` press**; `MSG_DISPLAY` dismisses the scouting `msgbox` and `call_if_eq VAR_0x8005, …` dispatches the type commentary (`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:208-227`) |
| 7240 | `4bf39eb6ea32` | message box interior cleared, blank box | `closemessage`-class box clear into the reused box (`scripts.inc:230`'s next `msgbox`) |
| **7241-7307** | 67 frames, 56 distinct shas (11 2-frame repeats = invisible space glyphs) | **"The TRAINER appears to have no clear / favorites when it comes to type."** types at the same 1-visible-glyph/tick cadence as the scouting page (36+31 visible glyphs, final visible glyph 7307; the 11 no-change frames are the `\n` pair and interior spaces) | `OpponentUsesNoMostCommonType`-class branch (`scripts.inc:297-299`, the `NUMBER_OF_MON_TYPES` case) — this fixture's generated opponent has no single most-common type |
| **7308** | `b28f2422bb45cb7b` | fully typed message + 3×3 wait-cursor at box right — the 7307→7308 pixel diff is exactly that 9px arrow cluster (bbox 182-184, 147-149) | `MSGBOX_DEFAULT` wait handoff — **the next genuine held input boundary** (the opponent-type commentary); unpressed per this step's contract |
| 7308-8138 (431 ticks) | `b28f2422bb45cb7b` constant | held, input-ready | fixture's bounded idle tail; `mainCallback2` stays `134766173` (same settled overworld callback), `battleOutcome` 1, ordinary one-LCG-per-VBlank outside-battle RNG ownership |

Exact text (`reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:564-566`):

> `BattleFrontier_BattleFactoryPreBattleRoom_Text_TrainerHasNoClearFavorite:`
> `.string "The TRAINER appears to have no clear\n"`
> `.string "favorites when it comes to type.$"`

The typed span is exactly the two source lines (36 + 31 glyphs), matching
the 7241-7307 67-frame cadence with the 11 2-frame repeats attributed to the
invisible `\n`/space glyphs (the same cadence family the scouting page
exhibited). The favorite-type line is the **second** `CommentOnOpponentType`
message; the battle-style commentary (`CommentOnOpponentStyle`,
`scripts.inc:301-311`) is *not* reached — no further press is authored.

## 3. Hash reproduction (twice each)

- **Dense oracle run** (205 captures, 7236-7440): run 1 vs run 2 → **205/205
  identical sha256**, 0 diffs.
- **Tail oracle run** (18 sparse anchors, 7441-8138): all `b28f2422bb45cb7b`
  constant — the held boundary holds through the fixture end.
- **App compare** (93 captures): run 1 vs run 2 → **93/93 matched**, 0 diffs.

## 4. App binding result

New compare spec `tools/compare/traces-groundtruth/win-go-on-type-commentary-off.json`
reuses the canonical `win-terminal-window-off` appStage at its canonical stage
frame 4623 and copies the new fixture's 29 segments + 93 captureFrames
verbatim (verified byte-identical). Result:

| spec | appStage | oracleBattleLab scenario | segments | captures | result |
|---|---|---|---|---|---|
| `win-go-on-type-commentary-off.json` | `win-terminal-window-off` @ 4623 | `scratch-win-go-on-type-commentary-probe.json` | 29, sum 8138 | 10 sparse held anchors + 75 dense 7236-7310 + 8 tail anchors | **93/93 exact, 0 diff** |

**No first mismatch exists** on the new span: the app is byte-identical on
the held scouting anchors, both press frames, every dense dismiss/clear/typing
frame 7236-7310 (including the 7240 box-clear, the 67-frame typing cadence
with its 11 invisible-glyph repeats, and the 7308 wait-cursor appearance), and
the 7308-8138 held tail. Mechanism sufficiency: **yes — the existing `postwin`
dialogue-page machine is the whole story.** `core.ts:918-926` feeds the A
press to `acceptPostwinDialoguePage` (postwin.ts:568-574), which stores the
page-2 edge and advances `dialoguePage` 1→2; `core.ts:2288-2303` renders
`POSTWIN_SCOUTING_LINES[1]` (postwin.ts:146-152, computed for the canonical
party via `getFactoryOpponentCommentary` — the source-exact
`TrainerHasNoClearFavorite` pair, since the canonical opponent party's type
counts are all tied) with the existing edge-relative
`POSTWIN_DIALOGUE_*_DELAY` clocks. No new mechanism and no calibration are
needed for the favorite-type commentary boundary.

The only remaining gap past this boundary is the battle-style commentary page,
the swap offer, and the swap decision — each requires its own A press and is
outside this packet's single-input contract.

## 5. Reproducing the numbers

```sh
npm run compare -- win-go-on-type-commentary-off --summary  # 93/93 (new)
npm run compare -- win-go-on-scout-off --summary           # 143/143 (regression)
npm run compare -- win-beyond-boundary-off --summary       # 228/228 (regression)
npm run compare -- win-terminal-window-off --summary       # 890/890 (regression)
```

Runs used: `tools/compare/out/run-2026-08-05-08-22-46Z-40600` and
`run-2026-08-05-08-25-31Z-41087` (both 93/93); oracle lab out dirs
`/tmp/goon-type-d1` + `/tmp/goon-type-d1b` (205/205 identical),
`/tmp/goon-type-tail`.

## 6. Checks

`npm run test:smoke` and the full `npm test` / `npm run build` were run green
before the final commit (see the committing entry). Only new files were
committed: the scratch fixture, the ground-truth spec, and this doc. No
`src/`, `tests/`, `tools/compare/traces/`, canonical trace, or existing
fixture was edited. PAPERCUT: none new.
