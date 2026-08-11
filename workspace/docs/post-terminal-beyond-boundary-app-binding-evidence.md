# Post-terminal beyond-boundary: app binding evidence for the WIN GO-ON menu and the LOSS decline/free-roam span (Battle Scene OFF)

SIDE-LANE binding packet, continuing `docs/post-terminal-beyond-boundary-ground-truth.md`
("the ground-truth doc"), which mapped both fixtures one press past their own
recorded input boundary. This packet measures the **current app** against that
ground truth, using the ground-truth doc's own committed scratch fixtures as
the oracle schedule (`tools/battle-lab/scratch-win-beyond-boundary-probe.json`,
`tools/battle-lab/scratch-loss-beyond-boundary-probe.json`), and reports the
exact first residual frames/classes and whether existing mechanisms suffice.
**No `src/`, `tests/`, `tools/compare/` existing file, canonical trace, or
battle-lab fixture was edited; only two new compare specs plus this doc were
created** (file-disjoint, per the side-lane contract).

**Headline:** the two sides are not symmetric. **WIN is already exact end to
end through the new GO ON/RECORD/REST/RETIRE boundary** — 228/228 frames,
0 residual classes, with the existing `postwin` continuation machinery
(`createPostwinStateFromRound` + `renderPostwinState`'s continuation branch).
**LOSS is exact through frame 4989 (51/51 held-prompt frames), then diverges
at frame 4990** — the app holds the YES/NO record multichoice forever because
`advanceFactoryTerminalRecordPrompt`'s `recordChoice` write is never consumed
anywhere downstream. The Lobby field render itself is already byte-exact
against the oracle's free-roam frame (0 differing pixels in y0-63 at 5093).

## 1. Specs and results

Both new compare specs (`tools/compare/traces-groundtruth/`) reuse the
canonical terminal scaffolds' existing `appStage` ids at their canonical
stage frames — no app-stage change was made or needed:

| spec | appStage | oracleBattleLab scenario | segments | captures | result |
|---|---|---|---|---|---|
| `win-beyond-boundary-off.json` | `win-terminal-window-off` @ 4623 | `scratch-win-beyond-boundary-probe.json` | scratch's 24, sum 6134, byte-identical | 5513-5739 dense + 6133 | **228/228 exact, 0 diff** |
| `loss-beyond-boundary-off.json` | `loss-terminal-window-off` @ 2996 | `scratch-loss-beyond-boundary-probe.json` | scratch's 52, sum 5254, byte-identical | 4939-5093 dense + 28 movement samples | **51/183 exact** (4939-4989); first residual **4990** |

Segment arrays were copied verbatim from each scratch fixture's own
`trace.segments` (verified byte-identical with a JSON-equality check); no
input was invented. Capture frames are pure observation points, not input.

## 2. WIN side: already exact through the GO ON/RECORD/REST/RETIRE boundary

Frames 5513-5739 dense plus the held tail at 6133 are **228/228 byte-identical**.
The oracle's measured schedule (re-derived from this run's own PNGs, matching
the ground-truth doc): held heal box 5513-5698 (zero pixel change, including
the 166-tick fanfare/heal hold after the 5532-5533 dismiss press), box interior
clears at 5699 (1484 px), "The 2nd match is next!\nAre you ready?" types
5700-5738, and the **GO ON / RECORD / REST / RETIRE multichoice pops fully
drawn at 5739** (4075 px) and holds through 6133. The app reproduces every one
of those frames without adjustment.

Mechanism sufficiency: **yes — the existing `postwin` continuation is the
whole story.** The generated-route `createPostwinStateFromRound` (`postwin.ts`)
already models `POSTWIN_NEXT_LINE1/2` ("The 2nd match is next!" / "Are you
ready?"), the source-relative fanfare/heal hold
(`POSTWIN_PARTY_HEAL_DELAY` 163, `POSTWIN_NEXT_BOX_CLEAR_DELAY` 166,
`POSTWIN_NEXT_TEXT_FIRST_DELAY` 167, settled 202), and the menu
(`POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY` 206, input-ready 207); the
`renderPostwinState` branch at `core.ts:2321-2332` draws the GO ON/RECORD/
REST/RETIRE window with the default-GO-ON cursor. With the app's existing
postwin clock (`elapsed = frame − 5011`) all of these land exactly on the
measured boundaries — **the WIN "next terminal boundary" needs no new
mechanism and no calibration**. No input was authored past 5739 (the held
boundary), so choosing an option inside the menu remains unmapped, exactly as
the ground-truth doc §5 prescribed.

## 3. LOSS side: exact to 4989, first residual frame 4990

Frames 4939-4989 (51 dense frames, including the 4988-4989 decline press) are
byte-identical. The first residual is **frame 4990**, the precise tick the
real game takes the decline branch (the oracle's own 4989→4990 change is
1707 px — the same 1707 px the app is wrong by; see §4 classes).

The oracle's schedule (re-derived from this run's own PNGs, matching the
ground-truth doc §2): held YES/NO multichoice through 4989; the multichoice
clears at 4990-4991; "We look forward to your next visit." types 4992-5027
and holds through 5089; the second dismiss at 5090-5091 clears the whole box
at 5093 (9057 px) into a held free-roam Lobby frame (5093-5172, zero pixel
change); the fixture's own DOWN at 5172-5173 then proves real movement
(5173→5174 = 193 px, continuous walk-cycle 5174-5200, settle by 5254).

## 4. Exact residual classes (all LOSS)

Measured per-band from this run's diff PNGs (out dirs listed in §6):

| class | frames | region | what's wrong |
|---|---|---|---|
| **L1** | 4990+ | bbox 161,65-206,110 (~1707 px, constant) | the app's **YES/NO multichoice window** is still drawn; the real game's vanished with the decline branch |
| **L2** | 4992+ | box text y120-151 (grows 4992→5028 as the farewell types) | the app keeps drawing the record question "BATTLE FACTORY match on your FRONTIER PASS?" while the real box prints/holds "We look forward to your next visit." |
| **L3** | 5093+ | whole box y112-159 (~9057-10719 px) | after the real second dismiss the box is gone entirely (free-roam Lobby); the app still holds the full record prompt |
| **L4** (evidence-only) | 5174+ | player walk-cycle region (to ~11001 px) | the fixture's own DOWN proves the oracle's player walks; the app's control was never released so its player stays static |

Notably the **Lobby field y0-63 is byte-exact at 5093** (0 differing pixels
vs the oracle's free-roam frame) — the extracted field + player sprite already
render the free-roam overworld correctly; the residual is entirely the
never-dismissed record prompt on top of it.

## 5. The binding gap (LOSS) and mechanism sufficiency verdict

**Gap:** `advanceFactoryTerminalRecordPrompt` writes `recordChoice`
(`src/engine/factoryTerminalPresentation.ts:528`) but **nothing downstream
ever reads it** — a `grep` for `recordChoice` across `src/` shows only the
write, the two state types, the initializers, and the reducer's own
`recordChoice === null` gate. The app therefore has:
1. no decline-branch transition (no "We look forward to your next visit."
   message, no second dismiss, no `releaseall`/free-roam state), and
2. no Lobby player-movement input handling after the terminal flow (the
   `factoryTerminal` machine simply idles on the released record prompt).

The ground-truth doc's two headline findings map directly onto this gap: the
decline branch is **two held prompts, not one** (the farewell message needs
its own A before control releases), and free-roam is reached on the same
`BattleFrontier_BattleFactoryLobby` map with no warp — so a future
continuation can stay on the existing terminal/Lobby render state through both
dismisses, exactly as the ground-truth doc §3 item 4 prescribed.

**Verdict:** WIN's existing `postwin` continuation machinery is **sufficient**
for the WIN boundary (no work needed). The LOSS `factoryTerminal` machinery is
**not** — `recordChoice` is a dead-end; the decline continuation is unbuilt.
The existing `appStage` (loss-terminal-window-off) can consume the appended
schedule without crashing, but the existing-stage-only spec above is the
honest binding: it reproduces the held-prompt span exactly and documents the
precise first divergence rather than papering over it. This packet deliberately
**implements nothing** (side-lane scope; the fix is a main-lane
`factoryTerminal`/Lobby-continuation slice).

## 6. Reproducing the numbers

```sh
npm run compare -- win-terminal-window-off --summary   # 503/503 (regression, unchanged)
npm run compare -- win-beyond-boundary-off --summary   # 228/228
npm run compare -- loss-beyond-boundary-off --summary  # 51/183; first DIFF frame 4990
```

Runs used for this packet (byte-identical across re-runs):
`tools/compare/out/run-2026-08-05-07-26-50Z-8663` (WIN),
`tools/compare/out/run-2026-08-05-07-27-10Z-8800` (LOSS).

New files (only): `tools/compare/traces-groundtruth/win-beyond-boundary-off.json`,
`tools/compare/traces-groundtruth/loss-beyond-boundary-off.json`, and this doc.

## 7. Checks

`npm run test:smoke` 347/347 green; full `npm test` and `npm run build` green
(see the committing entry). Canonical `win-terminal-window-off` re-ran 503/503
after the new specs landed (untouched; the `loss-terminal-window-off` 1943/1943
window is unchanged because no trace it depends on was edited). PAPERCUT: none
new.
