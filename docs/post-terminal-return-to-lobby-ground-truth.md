# Post-terminal return span: ground truth for WIN and LOSS (Battle Scene OFF)

SIDE-LANE scout. Context: `docs/terminal-seam-win-window-probe.md` §5-6 fixed
the party-identity crash that previously blocked both windows from reaching
`finishBattle` at all; that same §6 found the app now renders the wrong
thing past the handoff (WIN: solid black; LOSS: a 28-tick sprint to a fully
rendered lobby where the real game needs 800+). Nobody had mapped what the
real game actually shows in that span. This doc maps it, from dense
`bin/oracle lab` replays of the two committed `mechanicLab` fixtures
(`tools/battle-lab/win-terminal-explosion-dusclops-off.json`,
`tools/battle-lab/loss-terminal-explosion-dusclops-off.json`) plus source
cites from `reference/pokeemerald/data/maps/BattleFrontier_BattleFactory*`.

**Headline, upfront, because it corrects the step brief's own framing**:
**WIN does not return to the Lobby.** This fixture stages `battleNum: 0`
(the *first* of seven battles), a **non-terminal** win. Source-confirmed
(`data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:98-107`,
`EventScript_IncrementBattleNum`): only `case 7` (the seventh win) or a loss
warps to `MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY`. Every other win warps to
`MAP_BATTLE_FRONTIER_BATTLE_FACTORY_PRE_BATTLE_ROOM, 8, 8` instead, landing in
`EventScript_ReturnToRoomFromBattle` — the heal-message/swap-offer flow that
precedes the *next* battle, never touching the Lobby map at all. **LOSS does**
go to the Lobby — a loss always ends the challenge
(`BattleFrontier_BattleFactoryBattleRoom_EventScript_WarpToLobbyLost`,
scripts.inc:88-90), regardless of which battle number. The two fixtures are
not the same "return to lobby" flow with different content; they are two
genuinely different destination maps that happen to share the machinery that
gets you out of the battle. §3 below is the load-bearing section for anyone
implementing this: it separates the truly shared span from the two
maps'-worth of divergent content.

## Method

Both fixtures' own `trace.segments` (the real recorded input schedule) are
replayed verbatim via `bin/oracle lab` from scratch scenario files copied
into `tools/battle-lab/scratch-{win,loss}-post-terminal-probe.json`
(committed alongside this doc per this lane's own "scratch fixtures if
needed for probing" allowance — byte-identical to the committed fixtures
except a denser `trace.captureFrames`) — no new input invented, no edits to
the committed fixtures or `tools/compare/`. `bin/oracle lab`'s own semantic
`state` (`engine.mainCallback2`, `battleOutcome`, per-side `parties`) plus raw
framebuffer sha256 are enough to place every phase boundary; no RAM probe was
needed (`mainCallback2` transitions plus PNG content are conclusive, and the
destination map for each transition is independently nailed by matching
displayed text to unique strings in specific `scripts.inc` files — see
below). Passes taken: a 2-tick coarse sweep of each fixture's full remaining
span to find the shape, then 1-tick dense sweeps across every transition
found, then targeted PNG reads at representative ticks to read on-screen
text. `bin/oracle lab` replays this fixture (5512/4938 total frames) in
~2.5-3s per call.

All ticks below are absolute frame numbers from each fixture's own frame 0
(same convention `terminal-seam-win-window-probe.md` uses). Both fixtures
share the same `seed` (305419896) and DESTIN roster/script shape, so the
dismiss-relative offsets below line up almost exactly between WIN and LOSS —
called out explicitly where they do.

## 1. WIN timeline, tick 5011 onward (`win-terminal-explosion-dusclops-off.json`, dismiss tick 5010)

| tick | span | what's on screen / `mainCallback2` | mechanism |
|---:|---|---|---|
| 5010–5017 | held | quote still on screen (RAM-ahead-of-pixel; `finishBattle`/lifecycle already advanced) | — |
| **5018–5047** | 30 ticks | fade to black, one unique frame per tick | `HandleEndTurn_FinishBattle`'s `BeginFastPaletteFade(3)`, dismiss+8 (matches `terminal-seam-win-window-ground-truth.md` §2's own citation) |
| 5048–5053 | 6 ticks | solid black, `mainCallback2=134448161` (still the battle callback) | fade complete, battle callback not yet swapped |
| 5054 | 1 tick | `mainCallback2→134767053` (transient) | `gMain.inBattle` clear edge |
| 5055–5064 | 10 ticks | `mainCallback2=134766837`, still solid black | intermediate field-load callback |
| 5065–5067 | 3 ticks | `mainCallback2=134766173`, still solid black | settled overworld callback (same value both fixtures use post-battle) |
| **5068–5106** | 39 ticks | fade-in + brightness pulse revealing `BattleFrontier_BattleFactoryBattleRoom` (hex ring, spectator crowd) — pixel-confirmed, matches the already-committed ground truth's "battle-room flash" | standard end-of-battle return-to-field transition; **outcome-agnostic, see §3** |
| 5107–5112 | 6 ticks | solid black again — **second** fade-to-black | `EventScript_DefeatedOpponent`→`IncrementBattleNum` (scripts.inc:92-107) auto-runs (no player input) and immediately fires `warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_PRE_BATTLE_ROOM, 8, 8` |
| 5113 | 1 tick | `mainCallback2→134766541` (transient) | warp dispatch |
| 5114 | 1 tick | `mainCallback2→135492097` (transient, distinct value) | one-tick task/script-context callback during the warp |
| 5115–5122 | 8 ticks | `mainCallback2=134766589` | map-load callback |
| 5123–5125 | 3 ticks | `mainCallback2=134766173` (settled again), still solid black | back to the generic overworld callback, now on the new map |
| **5126–5140** | 15 ticks | fade-in, reveals `BattleFrontier_BattleFactoryPreBattleRoom` interior (rental shelves, attendant NPC) — pixel-confirmed, unique frame per tick | `PreBattleRoom_OnWarp`/`OnFrame` field scripts take over |
| 5141–5149 | 9 ticks | static held frame, empty/opening message box | `EventScript_ReturnToRoomFromBattle` (scripts.inc:54-57) issues `msgbox Text_LetUsRestoreMons, MSGBOX_DEFAULT`; box-open animation |
| 5150–5201 | 52 ticks | dynamic, text typing in progress — pixel-read "Thank you for competing! / Let us restore your P..." growing character by character | printer running |
| **5202** | — | text fully typed: **"Thank you for competing!\nLet us restore your POKéMON!"** (exact string match, `data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:456-458`) | printer reaches its own text length; message is `MSGBOX_DEFAULT` ending in a plain `$` (no `\p`) |
| **5202–5512** | 310 ticks, pixel-identical every sampled tick (verified at the fixture's own final tick, 5512) | **held, zero pixel change at all — no blinking cursor observed** | genuinely waiting for a player `A` the fixture's own recorded schedule never provides (its `trace.segments` end at frame 5512 with a 500-tick idle tail and no further button press) — **this is WIN's own input-ready boundary** |

**No further input exists in this fixture past its own recorded schedule.**
The next real step (not captured, since the recording stops here) is
`playfanfare MUS_HEAL; waitfanfare; special HealPlayerParty` (no input),
then `frontier_getbrainstatus`→`AskReadyForRegularOpponent`, which for
`FRONTIER_DATA_BATTLE_NUM==1` calls a short "here's opponent 2" comment, then
(assuming recording is possible) an interactive `multichoice 19, 4,
MULTI_GO_ON_RECORD_REST_RETIRE` — a **second, deeper interactive layer this
fixture's own schedule never reaches**, per the "stop at the boundary" rule.

## 2. LOSS timeline, tick 3231 onward (`loss-terminal-explosion-dusclops-off.json`, dismiss tick 3230)

The shared machinery (§3) reproduces **tick-for-tick, dismiss-relative**,
against WIN — same durations, same `mainCallback2` values, same transient
markers — so it's given at 1-tick precision here too, then the two
timelines diverge.

| tick | span | what's on screen / `mainCallback2` | mechanism |
|---:|---|---|---|
| 3230–3237 | held | quote still on screen (RAM-ahead-of-pixel) | dismiss+0..+7 |
| **3238–3267** | 30 ticks | fade to black (dismiss+8..+37, identical duration/offset to WIN) | `BeginFastPaletteFade(3)` |
| 3268–3273 | 6 ticks | solid black, `mainCallback2=134448161` | — |
| 3274 | 1 tick | `mainCallback2→134767053` (transient — same value WIN uses) | `inBattle` clear edge |
| 3275–3284 | 10 ticks | `mainCallback2=134766837` | field-load callback |
| 3285–3287 | 3 ticks | `mainCallback2=134766173` | settled overworld callback |
| **3288–3326** | 39 ticks | fade-in + brightness pulse, `BattleFrontier_BattleFactoryBattleRoom` reveal (identical duration to WIN's 5068-5106) | shared machinery, §3 |
| 3327–3332 | 6 ticks | solid black, second fade | `EventScript_DefeatedOpponent`/loss path fires immediately |
| 3333 | 1 tick | `mainCallback2→134766541` | warp dispatch |
| 3334 | 1 tick | `mainCallback2→135492097` (same distinct value WIN's tick 5114 shows) | one-tick task/script-context callback |
| 3335–3342 | 8 ticks | `mainCallback2=134766589` | map-load callback |
| 3343–3345 | 3 ticks | `mainCallback2=134766173` | settled, now on the new map |
| **3346–~3360** | ≥15 ticks | fade-in begins (dismiss+116, same offset as WIN's 5126) | reveals `BattleFrontier_BattleFactoryLobby` this time, not the PreBattleRoom — **divergence point, see §3** |
| ~3350 (coarse, ±8) | — | Lobby interior visible: counter, attendant NPC, wall-mounted monitor, potted plants (matches `docs/factory-lobby-terminal-assets.md`'s object list) | `BattleFrontier_BattleFactoryLobby_OnWarp` turns the player north; `OnFrame` dispatches `LostChallenge` |
| ~3350–3510 (coarse, 8-tick resolution) | ~160 ticks | repeating 3-frame, 24-tick cycle (`daa3241959`/`3e017efb76`/`80bd9cb1c2`) | scripted NPC/player movement loop (walk-cycle), not yet text |
| ~3542–3598 (coarse) | ~56 ticks | 8 distinct frames, one every 8 ticks — text typing | a message begins |
| **~3558–3702 (PNG-confirmed)** | — | **"I will return your POKéMON in exchange for our rental POKéMON.♥"** — exact pixel read, held cursor (heart icon) visible | `LostChallenge` event script's opening line |
| 3606–3830 (coarse) | ~224 ticks | repeating 3-frame, 24-tick cycle (held-cursor blink, same family as `terminal-seam-antecedent-boundary-probe.md`'s Class-1 mechanism, different cadence) | held, awaiting dismiss |
| **3834** | — | this fixture's own recorded `A` press (segment `3834-3836`) | dismiss of the above quote |
| 3838–3878 (coarse) | ~40 ticks | new unique frames each 8 ticks | next content begins |
| **3886–4046** | **168 ticks, one single unchanged sha the whole span** | fully static, no cursor at all | `party restore/save` class of fixed-duration auto-wait (`waitfanfare`/`special`-class, matches `factory-terminal-boundaries-off-probe.md`'s "Loss... Party restore/save clears status... without a BP mutation" citation — no button, pure duration) |
| 4054–4110 (coarse) | ~56 ticks | new unique frames every 8 ticks | next message begins typing |
| **~4078 (PNG-confirmed)** | — | "Would you like to record" (typing in progress) | record-question text, matches `factory-terminal-boundaries-off-probe.md`'s "Loss...record question prints" citation |
| 4118–4158 (coarse) | ~40 ticks | further changes | text settles, `DrawMultichoiceMenu` creates the YES/NO window (same `MULTI_YESNO` class the boundaries-off-probe doc already pinned a 2-tick create→ready gap for; not re-derived at 1-tick precision this session) |
| **~4198 (PNG-confirmed)** | — | **"BATTLE FACTORY match on your FRONTIER PASS?" with a YES/▶NO menu** | the interactive record prompt |
| **4136–4138** | — | this fixture's own **last** recorded `A` press (segment `4136-4138`) — occurs *before* the prompt is even drawn | the fixture's own recorded schedule provides no more input after this |
| **4198–4934 (both PNG- and coarse-sha-confirmed, byte-identical at the fixture's own final captured tick 4938)** | **≥736 ticks, zero pixel change** | held YES/▶NO menu, default cursor on NO | **this is LOSS's own input-ready boundary** — genuinely awaiting a player decision the recording never supplies |

## 3. Structure comparison

**Shared, byte-for-byte in relative timing (dismiss+8 through dismiss+115,
108 ticks total), for both outcomes:**

1. Fade to black: dismiss+8 → dismiss+37 (30 ticks, `BeginFastPaletteFade(3)`).
2. Black hold: dismiss+38 → dismiss+43 (6 ticks), battle callback still live.
3. Callback-clear transient: dismiss+44 (`mainCallback2→134767053`, 1 tick).
4. Field-load callback: dismiss+45 → dismiss+54 (10 ticks, `134766837`).
5. Settle: dismiss+55 → dismiss+57 (3 ticks, `134766173`).
6. Fade-in + brightness-pulse "battle room flash": dismiss+58 → dismiss+96
   (39 ticks) — reveals `BattleFrontier_BattleFactoryBattleRoom` regardless
   of outcome (this is the ordinary post-battle return-to-field transition,
   not Factory- or outcome-specific machinery).
7. Second black hold: dismiss+97 → dismiss+102 (6 ticks) — the field script's
   own automatic (no-input) branch on win/loss has already fired by this
   point and dispatched its own `warp`.
8. Warp transient pair: dismiss+103 (`134766541`), dismiss+104
   (`135492097`, distinctive value, same in both fixtures) — 1 tick each.
9. Map-load callback: dismiss+105 → dismiss+112 (8 ticks, `134766589`).
10. Settle: dismiss+113 → dismiss+115 (3 ticks, `134766173`).

Steps 1-10 are pixel- and callback-identical between WIN and LOSS at every
sampled tick this session probed (both dense 1-tick sweeps agree exactly).
This directly confirms `terminal-seam-win-window-ground-truth.md` §4(3)'s own
prediction ("an implementation modeling 'return to overworld' as one generic
outcome-agnostic step... matches the real ROM on both outcomes") — now with
actual dense-tick data on both sides, not just a qualitative claim.

**Diverges starting dismiss+116** (the second fade-in): the pixels behind
the fade are a genuinely different map (`BattleFrontier_BattleFactoryPreBattleRoom`
for WIN vs. `BattleFrontier_BattleFactoryLobby` for LOSS), because the
field script itself already chose a different `warp` target one tick
earlier, per source:

- WIN (non-terminal win, `FRONTIER_DATA_BATTLE_NUM` incrementing to a value
  ≠ 7): `EventScript_IncrementBattleNum` falls through its `switch`,
  `setvar VAR_0x8006, 1`, `warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_PRE_BATTLE_ROOM,
  8, 8` (`BattleFrontier_BattleFactoryBattleRoom/scripts.inc:100-107`).
- LOSS (any battle number — a loss always ends the challenge):
  `EventScript_WarpToLobbyLost` → `frontier_set FRONTIER_DATA_CHALLENGE_STATUS,
  CHALLENGE_STATUS_LOST` → `EventScript_WarpToLobby` →
  `warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY, 4, 8` (singles;
  `scripts.inc:88-90,222-227`).
- (Not exercised by either fixture, noted for completeness: the seventh win
  takes the *same* `WarpToLobby` target as a loss —
  `EventScript_WarpToLobbyWon`, `scripts.inc:109-111` — so the Lobby-return
  machinery this doc traces for LOSS is also what a terminal WIN would need,
  not what this fixture's own battle-0 WIN needs.)

**Content past divergence is unrelated between the two** — not a shared
component with different data, two different field-script trees:

| | WIN (→ PreBattleRoom) | LOSS (→ Lobby) |
|---|---|---|
| First message | "Thank you for competing! Let us restore your POKéMON!" (`MSGBOX_DEFAULT`, no held cursor observed, `scripts.inc:456-458`) | "I will return your POKéMON in exchange for our rental POKéMON.♥" (held cursor) |
| Between messages | none captured (fixture ends) | scripted walk-cycle movement (~160 ticks, coarse), then a ~168-tick fully-static no-input wait (party restore/save) |
| Terminal interactive prompt | none reached — fixture ends mid-message-hold | `multichoice`-class YES/▶NO "record to Frontier Pass?" prompt, held indefinitely |
| Next real step past this fixture's own schedule | `playfanfare MUS_HEAL`→`HealPlayerParty`→`AskReadyForRegularOpponent`'s own `multichoice 19,4,MULTI_GO_ON_RECORD_REST_RETIRE` — continues the *same* challenge | accept/decline record → pause/retire-class prompts → eventually returns to free overworld control — **ends** the challenge |

Neither fixture's own recorded schedule reaches a truly "free-roam,
input-ready overworld" frame; both stop at a **held interactive prompt**
(WIN: a not-yet-drawn `MSGBOX_DEFAULT`, one press from the next known-modeled
step; LOSS: an already-drawn `MULTI_YESNO`). Per the step brief's own
"un-mappable, stop and say so" rule: **the LOSS record-prompt's own YES
branch (`RecordBattle`) and every prompt after it (pause/retire, the actual
free-roam Lobby) is out of both fixtures' own recorded input and was not
probed this session** — a further session would need its own new
`mechanicLab` fixture with the record prompt's own dismiss authored in, not
just denser replay of the current one.

## 4. App consumer map (read-only)

- **`src/engine/roundController.ts:362,512`**: `presentingBattleWin` is a
  real `RoundControllerState.rules.phase` value, entered at line 512 from
  the `case "presentingBattleWin"` handling at line 362 — this is the
  phase name the step brief cites as reaching "no render branch."
- **`src/engine/postwin.ts:240-257`, `createPostwinStateFromRound`**: its
  own internal guard (`round.rules.phase !== "presentingBattleWin"` →
  throw, line 250) shows this function is written specifically **for** this
  phase — `postwin.ts` is very likely the intended consumer for §1's whole
  WIN timeline, not a gap to build from scratch. Its exported surface
  already names most of what §1 found: `postwinHealVisibleChars`/
  `postwinHealInputReady` (:353-361, the heal message + fanfare),
  `postwinDialogueDelay`/`VisibleChars`/`InputReady` (:471-498, the
  "comment on opponent type/style" lines `CommentOnOpponentType`/
  `CommentOnOpponentStyle` call in `scripts.inc:207-345`), `movePostwinSwapCursor`/
  `acceptPostwinSwapDecline` (:516-532, the swap-offer Y/N), and
  `postwinRightThisWayVisibleChars`/`InputReady`/`acceptPostwinRightThisWayDismiss`
  (:552-568, `EventScript_EnterBattleRoom`'s `Text_RightThisWay` walk to the
  next battle, `scripts.inc:43-49`). This module appears to already model
  most of §1's real sequence; the likely gap is wiring, not missing
  mechanics — see next bullet.
- **`src/engine/core.ts:577-604`**: the only place `createPostwinStateFromRound`
  is actually called (line 586), gated on
  `state.factoryRoundBattleOrchestrator?.battleResolutionPresentation` being
  truthy (line 577) **and** `generatedRound.presentation?.command.type ===
  "battleWon"` (line 585). Both this doc's fixtures reach `presentingBattleWin`
  through `tools/compare/appTrace.ts`'s bespoke `winTerminalWindowStage`
  `commandIndex` scaffold (per `terminal-seam-win-window-probe.md` §5's own
  description: "driving the resolution lifecycle generically off... `commandIndex`/
  `lifecycle.phase`"), which is a different mechanism than a real
  `factoryRoundBattleOrchestrator.battleResolutionPresentation` advance —
  **not fully step-traced this session**, but the most likely explanation
  for the solid-black frame: this specific code path's own
  `command.type === "battleWon"` condition (or the outer
  `battleResolutionPresentation` truthy-gate) never evaluates true for the
  scaffold's own tick sequence, so `postwin` never gets constructed even
  though the round's `phase` already reads `presentingBattleWin`. First
  place to set a breakpoint.
- **`src/engine/factoryRoundBattleOrchestrator.ts:750` (`finishBattle`),
  `:771` (`deriveBattleResolutionFromTerminalBoundary` call), `:1339`
  (`advanceFactoryRoundBattleResolution`)**: the real hand-off point per
  `terminal-seam-win-window-probe.md` §5's own trace — unchanged this
  session, cited for continuity.
- **`src/engine/factoryTerminalPresentation.ts`**: already implements a
  *superset* of what §2's LOSS timeline needs — `createFactoryTerminalLossPresentation`
  (:208) plus `createFactoryTerminalRoundWonPresentation`/
  `isFactoryTerminalRoundWon` (:230,202 — for a **terminal**, 7th-battle
  WIN, which reaches the Lobby exactly like LOSS per §3's table, not this
  fixture's own battle-0 WIN), `factoryTerminalRestoreAge` (:388, the
  168-tick static restore/save wait), `factoryTerminalRecordPromptFirstAge`/
  `TextFirstAge`/`InputReady` (:403-421) and `factoryTerminalRecordMenuVisible`/
  `Drawn`/`InputReady` (:356-372, the YES/▶NO prompt). Per
  `terminal-seam-win-window-probe.md` §6, this module **does** fire for
  `roundLost` today, but its modeled timing (28 ticks total) has never been
  calibrated against this fixture's own 800+-tick real schedule — §2 above
  is exactly that calibration data, keyed to the same exported functions.
- **`src/engine/core.ts:2155` (`renderPostwinState`), `:2501`
  (`if (state.postwin) return renderPostwinState(state);`), `:2713`
  (`render`)**: the render-side dispatch **already** handles `postwin`
  unconditionally ahead of the generic map/overworld fallthrough — so the
  solid-black frame this doc's §1 starts from is **not** a missing render
  branch, contrary to how `terminal-seam-win-window-probe.md` §6 phrased
  it. `state.postwin` is simply never populated for this scaffold's own
  tick sequence, which routes the bug entirely to the *creation* side
  (previous bullet, `core.ts:577-604`) — confirming the render/consumer
  code for WIN's whole §1 timeline may already exist end to end, and the
  gap is wiring one state transition, not building a presentation.

## 5. Bounded slice plan

Ordered by dependency; each slice's compare command needs a **new** scratch
`mechanicLab`/compare-trace fixture with `captureFrames` extended past the
current 389/236 bound (out of this docs-only lane's authority — for whoever
picks this up next):

1. **Shared return-to-field machinery (dismiss+8 → dismiss+115, 108 ticks,
   identical for WIN/LOSS).** Implement/verify the fade-out → callback
   transient → fade-in "battle room flash" → second fade-out → warp
   transient sequence as one outcome-agnostic step. Proof: extend
   `win-terminal-window-off`'s captured window to frame 5125 (dismiss+115)
   and `loss-terminal-window-off` to frame 3345 (same relative offset) —
   expect exact pixel/frame-count parity through that tick on **both**
   traces from the same implementation, no WIN/LOSS branch in this slice's
   code.
2. **LOSS's Lobby arrival + first message + held-cursor dismiss (dismiss+116
   → 3834, i.e., frame 3346-3834, ~488 ticks).** Wire `factoryTerminalPresentation.ts`'s
   existing `createFactoryTerminalLossPresentation` timing to this fixture's
   real schedule (message text "I will return your POKéMON in exchange for
   our rental POKéMON.", held-cursor dismiss at the real tick 3834, not the
   current 28-tick model). Proof: extend `loss-terminal-window-off` to frame
   3834; expect the message text and held-cursor state to match this doc's
   §2 citations at every intermediate captured tick, not just the endpoint.
3. **LOSS's restore/save wait + record prompt (frame 3834 → 4938, ~1104
   ticks).** The 168-tick static restore wait, the record-question typing,
   and the final YES/▶NO hold. Proof: extend to the fixture's own final
   frame, 4938; expect a byte-identical held YES/▶NO frame at the end,
   matching this doc's §2 PNG citation at tick ~4198.
4. **WIN's PreBattleRoom arrival + heal message (dismiss+116 → 5202, i.e.,
   frame 5126-5202, ~76 ticks).** Wire `postwin.ts`'s existing
   `createPostwinStateFromRound` into whatever code path the terminal-window
   scaffold actually advances through (§4's flagged gap — needs its own
   short investigation first, not assumed). Proof: extend
   `win-terminal-window-off` to frame 5202; expect the "Thank you for
   competing..." message fully typed and held, matching §1's PNG citation.
5. **Out of either fixture's own recorded reach — needs new fixtures, not
   just denser replay:** WIN's `multichoice 19,4,MULTI_GO_ON_RECORD_REST_RETIRE`
   swap-offer-and-beyond, and LOSS's record-accept/decline branch through to
   free-roam Lobby control. Flagged per the step brief's own "stop at the
   boundary" rule rather than guessed.

## Verification

- `git diff --stat`: this doc (new) + two scratch scenario files
  (`tools/battle-lab/scratch-{win,loss}-post-terminal-probe.json`, byte-identical
  copies of the committed fixtures except their `trace.captureFrames`
  arrays, kept so the exact `bin/oracle lab` reproductions cited above are
  re-runnable). Zero `src/`/`tests/`/`tools/compare/` edits.
- Every tick cited in §1-§3 was read directly from this session's own
  `bin/oracle lab` manifests (`engine.mainCallback2`, raw framebuffer
  sha256) and cross-checked by reading the actual PNG captures for text
  content at every tick marked "PNG-confirmed" above.
- Source cites (`scripts.inc` line numbers) are from
  `reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc`
  and `.../BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc`, read
  directly this session, not inferred.
- `npm run test:smoke` run once before commit (mid-step sanity gate per this
  lane's own brief); full `npm test`/`npm run build` run before the final
  commit.
