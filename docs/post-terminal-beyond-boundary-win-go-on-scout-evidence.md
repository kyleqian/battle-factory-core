# Post-terminal beyond-boundary: WIN GO ON → first scouting message (Battle Scene OFF)

SIDE-LANE binding packet, continuing `docs/post-terminal-beyond-boundary-ground-truth.md`
(which mapped the held GO ON/RECORD/REST/RETIRE menu at ticks 5739-6133 and
deliberately stopped without pressing it) and
`docs/post-terminal-beyond-boundary-app-binding-evidence.md` (which proved the
app byte-exact 228/228 through that same held boundary). This packet authors
the **first press past that boundary** — exactly one 2-tick `A` on the held
GO ON — in a new scratch battle-lab fixture, banks the real ROM's next phase
boundaries with short-coarse then dense oracle captures, stops at the next
genuine held input boundary (the **first scouting message**, unpressed), and
measures the current app over the whole new span with the existing
`win-terminal-window-off` appStage.

**Headline**: the new fixture's GO ON press (frames 6634-6635) lands on a
byte-identical held menu, and the ROM then dismisses the menu, types the
first scouting message `"I've conducted a little investigation / about your
upcoming opponent."`, and holds it input-ready from **frame 6704** through the
fixture end. **The app already reproduces every one of those frames** — the
new compare spec is **143/143 exact, 0 residual classes** — so the existing
`postwin` continuation machinery (`acceptPostwinContinuation` →
`dialoguePage 1` → `POSTWIN_SCOUTING_LINES[0]`) is **sufficient** for the WIN
next-terminal boundary with no calibration. There is **no first mismatch** to
record.

## 1. New fixture and prefix proof

`tools/battle-lab/scratch-win-go-on-scout-probe.json` is a copy of the
committed `tools/battle-lab/scratch-win-beyond-boundary-probe.json` with
**all 24 existing `trace.segments` preserved byte-for-byte** (JSON-equality
verified: the first 24 segments and the entire top-level payload except
`trace.captureFrames` are identical). Three segments are appended — a 500-frame
idle, the single 2-tick `A` press, a 600-frame bounded idle tail — giving 27
segments / 7236 total frames. The press therefore lands at frames 6634-6635,
**~900 ticks inside** the GO ON menu's confirmed-held span (5739-6133) extended
by the appended idle margin.

Held-span proof (the "safely inside the proven held GO ON selection"
criterion): the untouched committed fixture was re-run at its own final frame,
and its sha256 was compared against the new fixture's pre-press and press
frames:

| source | frames | sha256 | match |
|---|---|---|---|
| committed fixture (`scratch-win-beyond-boundary-probe.json`) | 6133 | `e83628935be1…00769f` | — |
| new fixture pre-press anchors | 6134, 6200, 6300, 6400, 6500, 6600, 6620, 6630, 6633 | `e83628935be1…` | ✅ byte-identical |
| new fixture press frames | **6634, 6635** | `e83628935be1…` | ✅ byte-identical (press lands on held menu) |

## 2. Boundary ledger (this fixture's extension)

`bin/oracle lab` manifest (raw framebuffer sha256 + `engine.mainCallback2`,
all 143 captures; both runs byte-identical across re-runs):

| tick | sha256 (prefix) | what's on screen | mechanism |
|---:|---|---|---|
| 6133-6633 | `e83628935be1` | held GO ON/RECORD/REST/RETIRE menu, cursor GO ON | the already-mapped held boundary (still constant ~900 ticks past 5739) |
| **6634-6635** | `e83628935be1` | same held menu (no visual change during the press) | this fixture's **single new `A` press**; `multichoice 19,4,MULTI_GO_ON_RECORD_REST_RETIRE` (`scripts.inc:92`) stores GO ON → `case 0, AskSwapMon` (`scripts.inc:94`) |
| 6636-6638 | `cf0ef6761ee7` / `4bf39eb6ea32` | multichoice window closing, box cleared to blank field message box | `AskSwapMon` (`scripts.inc:137`): `factory_generateopponentmons`, `factory_getopponentmontype`, `factory_getopponentstyle`; next `msgbox` window reused |
| **6639-6703** | 65 frames, one sha per glyph (4 glyphs take a 2-frame repeat) | **"I've conducted a little investigation\nabout your upcoming opponent."** types (66-glyph string, final glyph 6703) | `CommentOnOpponentType` (`scripts.inc:143`) → `msgbox Text_InvestigatedUpcomingOpponent, MSGBOX_DEFAULT` (`scripts.inc:208`) |
| **6704** | `24a9fff888d7` | fully typed message + 3×3 wait-cursor (down arrow) at box right — the 6703→6704 pixel diff is exactly that 9px arrow cluster | `MSGBOX_DEFAULT` wait handoff — **the next genuine held input boundary** (first scouting message); unpressed per this step's contract |
| 6704-7236 (533 ticks) | `24a9fff888d7` constant | held, input-ready | fixture's bounded idle tail; `mainCallback2` stays `134766173` throughout (same settled overworld callback), `battleOutcome` 1, ordinary one-LCG-per-VBlank outside-battle RNG ownership |

Exact text (`reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:492-494`):

> `BattleFrontier_BattleFactoryPreBattleRoom_Text_InvestigatedUpcomingOpponent:`
> `.string "I've conducted a little investigation\n"`
> `.string "about your upcoming opponent.$"`

The source-encoded right apostrophe (`’`) is one glyph; total 66 glyphs,
matching the 6638/6639→6703 typing span. The scouting text is the **first**
`CommentOnOpponentType` message; the type/style commentary that follows
(`TrainerSkilledIn…`) is *not* reached — no further press is authored.

## 3. Hash reproduction (twice each)

- **Dense oracle run** (134 captures, 6633-6760 + 6 tail anchors): run 1 vs
  run 2 → **134/134 identical sha256**, 0 diffs.
- **Prefix proof** (committed fixture at its final frame 6133): run 1 vs run 2
  → identical `e83628935be1…`.
- **App compare** (143 captures): run 1 vs run 2 → **143/143 matched**, 0 diffs.

## 4. App binding result

New compare spec `tools/compare/traces-groundtruth/win-go-on-scout-off.json`
reuses the canonical `win-terminal-window-off` appStage at its canonical stage
frame 4623 and copies the new fixture's 27 segments + 143 captureFrames
verbatim (verified byte-identical). Result:

| spec | appStage | oracleBattleLab scenario | segments | captures | result |
|---|---|---|---|---|---|
| `win-go-on-scout-off.json` | `win-terminal-window-off` @ 4623 | `scratch-win-go-on-scout-probe.json` | 27, sum 7236 | 9 sparse held anchors + 128 dense 6633-6760 + 6 tail anchors | **143/143 exact, 0 diff** |

**No first mismatch exists** on the new span: the app is byte-identical on the
held GO ON anchors, both press frames, every dense dismiss/typing frame
6633-6760 (including the 6636-6638 dismiss/clear transition, the 65-frame
typing cadence, and the 6704 wait-cursor appearance), and the 6704-7236 held
tail. Mechanism sufficiency: **yes — the existing `postwin` continuation is
the whole story.** `core.ts:915` feeds the A press to
`acceptPostwinContinuation` (postwin.ts:524), which stores the GO ON edge and
advances `dialoguePage` 0→1; `core.ts:2288-2303` renders
`POSTWIN_SCOUTING_LINES[0]` (postwin.ts:129-130, exactly the
`Text_InvestigatedUpcomingOpponent` text) with the existing edge-relative
`POSTWIN_DIALOGUE_*_DELAY` clocks. No new mechanism and no calibration are
needed for the WIN next-terminal boundary.

The only remaining gap past this boundary is the scouting text still to come
(type page, style page, swap offer) — each requires its own A press and is
outside this packet's single-input contract.

## 5. Reproducing the numbers

```sh
npm run compare -- win-go-on-scout-off --summary  # 143/143 (new)
npm run compare -- win-beyond-boundary-off --summary  # 228/228 (regression)
npm run compare -- win-terminal-window-off --summary  # 890/890 (regression)
```

Runs used: `tools/compare/out/run-2026-08-05-07-48-42Z-22793` and
`run-2026-08-05-07-48-54Z-22851` (both 143/143); oracle lab out dirs
`/tmp/goon-dense` + `/tmp/goon-dense-2` (134/134 identical), `/tmp/goon-final`.

## 6. Checks

`npm run test:smoke` and the full `npm test` / `npm run build` were run green
before the final commit (see the committing entry). Only new files were
committed: the scratch fixture, the ground-truth spec, and this doc. No
`src/`, `tests/`, `tools/compare/traces/`, canonical trace, or existing
fixture was edited. PAPERCUT: none new.
