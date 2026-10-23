# Roadmap — Battle Factory

Reproduce Pokémon Emerald's Battle Factory challenge in native TypeScript,
verified frame-by-frame against the oracle. The canonical start state is the
oracle's bootstrap anchor (see `bin/oracle info`): **the Level-50 single
challenge's rental-draft screen, already open** — the demo has no overworld
at all. In scope: the rental draft (6 candidates, summary views, pick 3),
the 7-battle round with post-win swaps, and the gen-3 single-battle engine
those battles need. Out of scope: the lobby/frontier overworld and every
screen before the draft, Battle Points economy beyond a single round, double
battles, and the open-level rule set (until the single-battle loop is solid).

**Audio marker:** sound effects, cries, fanfares, and music are a separate,
later milestone — stage S11 below (user decision, 2026-07-28). No earlier
stage's acceptance includes audio.

## Current execution priority — 2026-10-13

The current main mission is **S10A plus the Factory accuracy finish-up**:
remaining animation variants, presentation corrections and battle-engine
defects are all authorized by the user's 2026-10-13 direction. See
`docs/factory-finish-scope.md`; the presentation-only restriction is superseded
for source-proven engine fixes in that scope. Return -> Frustration (#165) is
DONE (ret165, 2026-10-13); RNG fixes (#141 / #140) and Focus Punch preparation
(#139) have landed, with their named edge cases still open. CAX31 has also
landed trn178 / trn181 / fpc180 / snd182 / sub183 / pfr192 / ont193. The next
2026-10-22 session first repairs and validates the retained lsd194 + lsd196
branch before folding it, then draws the Leech Seed drain animation and
continues remaining variants. Follow PROGRESS.md's top entry and
`docs/cax31-session-handoff.md`; do not repeat already accepted work.
Run the normal `./run-supervisor.sh`; the roadmap determines its mission.
Integration runs on `master` in the assigned host's checkout, with bounded
temporary worker checkouts and the existing model routing. There is no separate
integration supervisor program. The Mac supervisor stays stopped during CAX31 work.
This user-directed priority supersedes historical optional-animation and
Scene-ON-selector deferrals below. Fix the in-scope mechanics debt instead of
parking it behind the animation stage. Reuse earlier proofs where valid;
do not restart unrelated campaigns or schedule audio ahead of this work.

Read `ANIMATION_INTEGRATION_PROGRESS.md` for the exact latest production receipt
and next step, and `ANIMATION_INTEGRATION_SUPERVISOR.md` for detailed execution
and verification. Update `PROGRESS.md` at meaningful checkpoints and wind-down;
retain detailed source/rendering evidence in the integration progress record.
`ANIMATION_VERIFICATION.md` controls scoped checks and unchanged-code reuse.

**User decision D3, 2026-10-06:** the next run is authorized to implement a
separate deterministic presentation RNG for Random2 animations, preserve its
seed in session exports, and report those live adapters as "faithful random"
separately from exact claims. S10A below defines the scope and acceptance.
This resolves D3; no further user approval is needed for that implementation.
Implemented 2026-10-06: `docs/presentation-rng.md`; 13 faithful-random adapters live (2026-10-08).
**User decision D4, 2026-10-07:** option (b) is approved. Implement deterministic
dominant measured CPU-load timing in a separate "faithful timing" category;
see `docs/faithful-timing.md` and ANIMATION_VERIFICATION.md. This also covers
further evidenced lag-frame / VBlank-phase cases without asking again. The user
authorized unblocking and finishing S10A; prioritize remaining adapters and
ordinary-play continuation, batch shared mechanisms and reuse valid evidence.
Implemented 2026-10-07: `src/engine/liveMoveTimingPolicy.ts` + `docs/faithful-timing-policy.md`; 18 faithful-timing adapters live (2026-10-08).

**User scope decision, 2026-10-11:** include Struggle (`MOVE_STRUGGLE`, 165)
in S10A and work it first in the next run, alongside the missing stat-change
animation (#166). Forced moves reachable in Factory play are part of playable
completion even when absent from rental move lists. This supersedes Struggle's
previous exclusion and the generic outside-Factory restriction for this move.
See `docs/struggle-integration-scope.md` for the work and acceptance contract.
Headline ordinary-play coverage must include Struggle; excluding it is only a
diagnostic. The 276 already accepted catalogue bodies retain their historical
counts; Struggle is one additional required body.
Implemented 2026-10-11: Struggle live (`docs/stl109-struggle-live.md`, doll cells `docs/sdl119-struggle-doll-live.md`; 895 / 1,001 census
Struggle commands live, the rest declining on other moves' order-host gaps) and #166's stat-change animation live in both scenes.

**User scope decision, 2026-10-13:** all remaining animation variants,
presentation corrections and the discussed battle-engine accuracy bugs are in
the current finish-up scope. Main-lane fixes to gameplay, damage, AI, RNG and
event ordering are authorized when proved against the original source;
presentation-only work must preserve the same corrected rules across scene
modes. See `docs/factory-finish-scope.md` for ownership and gates. Audio stays
deferred; previously settled exceptions and unrelated expansion remain parked.

## Operational notes

- **Log backup (2026-08-10):** Codex/DeepSeek session logs (`.codex-logs/`,
  `.opencode-logs/`, both gitignored) and Claude's local transcripts live
  only on this machine's disk. At the end of a milestone or a long session,
  run `tools/backup-logs-to-r2.sh` to copy them to R2 — it's additive-only
  (never deletes the remote copy) and safe to re-run any time. Requires an
  `r2` rclone remote configured locally.

## Staged plan (authored by the run supervisor, iteration 0, 2026-07-17)

Verification commands used below, all runnable today:
- `npm run compare -- tools/compare/traces/<name>.json` — replays a trace
  against oracle + app, writes PNGs, exits non-zero on any differing capture.
  "0 diff" means every captured frame matches strictly.
- `npm test` / `npm run build` — Tier-1 suite and production build.
- `bin/oracle run <trace> -o <dir>` — oracle-only probing.
- Dev-time RAM inspection (ground truth for hidden state — see recipe in
  Domain notes): pins constants that Tier-1 tests then assert.

### [x] S1 — Close the comparison loop: pixel-exact static anchor frame
Engine skeleton with a pure tick/render split (`src/engine/`: no DOM, no
timers, no `Math.random`; browser shell and `tools/compare/appTrace.ts` both
drive the same core). Dev-time extractors under `tools/extract/` writing
`src/assets/gen/` + `src/data/gen/` (factory_screen tileset/tilemaps/
palettes, ball + arrow sprites, font glyphs & widths & charmap for the text
on screen). Render the anchor draft screen exactly; wire `appTrace.ts`.
**Acceptance:** `npm run compare -- tools/compare/traces/anchor.json`
(committed, 1 frame) → 0 diff; `npm test` and `npm run build` green;
`npm run dev` shows the same screen at 240×160 under `?pokebench=1`.

### [x] S2 — Draft-screen interaction parity: cursor, header, menu, timing
Cursor movement across the 6 slots (incl. wrap + held-button repeat), per-
slot header text, A → ball-open animation + mon sprite + SUMMARY/RENT/OTHERS
menu, B/close paths, message-box updates — frame-exact against dense capture
windows.
**Acceptance:** committed traces `draft-cursor.json` (full sweep both
directions, captures every ≤4 frames) and `draft-menu.json` (open/navigate/
close on ≥2 slots) pass compare with 0 diff; Tier-1 tests pin the draft
state machine (cursor index, menu open/close, input repeat). Also holds
under every-frame capture: `draft-menu-slot6.json` (0-65, every tick) is
66/66 — the redraw-scheduling transients formerly tracked in `ISSUES.md` #3
(cursor-move header/arrow redraw, menu-highlight redraw, close-phase OAM
lag) are all pinned (`CursorRedrawState`/`MenuHighlightRedrawState` in
`factoryDraftScreen.ts`, close-table fixes in `monPic.ts`).

### [x] S3 — Rental data, RNG core, anchor mons pinned
Gen-3 LCG (constants verified from `reference/pokeemerald/src/random.c`)
with the per-frame VBlank advance rule (see Domain notes); extract
`gBattleFrontierMons` + species/moves/nature tables; RAM-dump the anchor's
six rental mons (PID, IVs, EVs, nature, ability, moves, stats) via the
inspection recipe and commit the dump under `src/data/gen/`.
**Acceptance:** Tier-1 tests derive the six rentals' full battle stats from
extracted data and match the committed RAM dump exactly; a Tier-1 test pins
gRngValue evolution over N idle frames (anchor seed `0xd2ddeec8`); `npm
test` green.

### [x] S4 — Summary screen parity (draft's SUMMARY view)
The summary screen as invoked from the draft menu (confirm exact mode/pages
from `battle_factory_screen.c`), including page navigation and return to the
draft.
**Acceptance:** committed trace(s) opening SUMMARY on ≥2 different slots,
paging through every reachable page, and backing out pass compare with 0
diff on dense captures; Tier-1 tests pin the summary state machine.
**Slice 1 progress:** entry/exit palette-fade math and the fade-phase state
machine are oracle-pinned and hermetically tested (`src/engine/
paletteFade.ts`, `src/engine/summaryScreen.ts`); Info-page species data is
extracted and tested (`src/data/gen/summary-info.json`,
`src/engine/monGender.ts`); the static Info-page renderer
(`src/engine/summaryInfoPage.ts`) is built and wired into `core.ts`'s
`EngineState`/`tick`/`render` (A on SUMMARY opens it, B closes it, fades
render via `src/engine/fadeRender.ts`). `tools/compare/traces/
summary-info-onix.json` (dense, 122 captures, SUMMARY-press through the
settled Info page, the full B-exit fade-out/black-hold/fade-in, back to
the resettled draft screen) is **0 diff** — the B-exit render bug
(ISSUES #4) is fixed: the exit's black-hold phase shares the entry's
"last tick peeks at fade-in's first step" quirk (`core.ts`'s `render()`),
which the original implementation only wired for the entry direction.
`tools/compare/traces/summary-info-magby.json` (132 every-frame captures,
slot 2, own timing probed) is also **0 diff** — the "≥2 different slots"
criterion is met for the Info page.
**Supervisor re-scope (2026-07-17, second session):** S4 slice 1 (Info
page on 2 slots, entry/exit fades, pinned by the two traces above) is
complete; the remainder — page navigation RIGHT/LEFT + scroll-wipe,
UP/DOWN mon-switching, move-select, and the per-species front-sprite
idle animation (`sMonAnimationDelayTable`, fires at SUMMARY-press+65 for
MAGBY) — is explicitly deferred behind S5 per the "re-scoped by the
supervisor" rule below. Rationale: S5→S8 is the mission's critical path;
the data the deferred pages need (moves/exp/items) is being extracted in
parallel. S5 may begin. **(Supervisor, 2026-07-18, at S5 completion: the
same recorded rationale extends this deferral behind the S5→S8 critical
path — S6 may begin with S4's remainder still open.)**
**Completion (2026-07-24, supervisor-verified):** the deferred routes are
closed through generic summary state and presentation mechanisms: all four
pages navigate with source-relative layered wipes; UP/DOWN switches rentals
on Info and both Moves pages; the Factory's `LOCK_MOVES` Battle/Contest
selectors open, navigate, and close without mutating move order; and the six
named rental front-sprite programs use extracted animation types/frame data.
Dense OFF evidence is exact for both entry species (**122/122 + 132/132**),
MAGBY's complete animated hold (**201/201**), page transitions
(**3/3 + 25/25 + 56/56 + 36/36 + 16/16**), Info switches
(**54/54 + 87/87**), both selectors (**93/93 + 93/93**), and complete
Battle/Contest Moves DOWN→UP→B switches (**80/80 + 80/80**). Tier-1 and the
production build are green.

### [x] S5 — Complete the draft: rent 3, confirmations, exit sequence
RENT/OTHERS flows, ball palette change on selection, the 2nd/3rd-pick
message variants, deselection/cancel paths, final party confirmation, fade
out to the pre-battle room and the attendant dialogue up to the battle
transition trigger.
**Acceptance:** committed trace drafting slots 1/2/3 through the fade into
the pre-battle room passes compare with 0 diff on dense captures (including
the fade frames); Tier-1 tests pin the pick/cancel state machine.
**Slice 1 progress (2026-07-17):** RENT/DESELECT state machine (numbering +
renumbering rule), ball palette swap, message variants, and the rented
ball's idle/rock animation + its `Random()%5` stream are implemented and
RAM-verified (`src/engine/ballAnim.ts`, `tests/ballAnim.test.ts` pins the
engine RNG against dumped `gRngValue` incl. SUCCESS and FAILURE rolls).
`rent-slot1.json` is committed at 125/139 — blocked short of 0 diff only by
pre-existing ISSUES #5 (mon-pic close bad-window render bug, not S5 code).
Groundwork banked: pre-battle-room scene fully extracted and composite-
verified 0/38400 px vs oracle (`docs/prebattle-room-notes.md`,
`prebattle-room-*.json` gen files); moves/exp/items data extracted for the
Skills/Moves pages and S6/S7 (`moves.json`, `exp-tables.json`,
`item-names.json`); confirm flow fully scouted
(`docs/confirm-flow-notes.md`).
**Slice 2 complete (2026-07-17 evening, supervisor-verified):**
post-confirm cursor-input gate (`isCursorInputReady`); species-name-breathe
rule pinned (keep cumulative cursor-mode ticks < 105, no model needed);
multi-ball model finished — LEFT/RIGHT stall keyed to the entering slot's
species ({BAYLEEF, HAUNTER} safe-list, RAM-pinned 12/12 data points),
per-slot displayTile lag (slot 0: 2 ticks, others: 1), cursor-redraw fast
path with 2+ rented balls, OPEN_TABLE_B degenerate-window tick — all
Tier-1-pinned (suite at 276). `rent-3picks.json` committed at **157/190**
with every diff frame individually attributed to ISSUES #5's settled-policy
pattern (the amended 0-diff bar per that entry's user-delegated decision);
ISSUES #7 closed and deleted.
**Slice 3 complete (2026-07-17 night, supervisor-verified):** the confirm
flow from the 3rd RENT confirm through the settled YES/NO idle is
implemented (`src/engine/confirmReveal.ts` + reveal render paths) and
trace-pinned: `confirm-flow.json` committed at **79/95** — frames 210-279
(flash, wide window, 3 chosen-mon sprites, YES/NO box, long 3-ball idle)
byte-exact; the 16 diff frames are all ISSUES #5's settled pattern (the
3rd pick's own popup close). RNG stream RAM-pinned through the whole
window. Along the way five distinct render/timing bugs were root-caused
and fixed (ISSUES #8/#9/#10, all closed and deleted), including a real
`font.ts` glyph-width bug. Suite: 297 Tier-1 tests, 9 committed traces.
**Stage complete (2026-07-18, supervisor-verified):** the decline path
(YES/NO cursor, B/A-on-NO, 20-tick un-reveal, species-name breathe model,
post-decline ball stalls) is pinned by `confirm-decline.json` at **67/67
byte-exact**; the accept path (YES-press, exit fade, pre-battle room,
"Right this way, please!" fully printed + idle) by `accept-prebattle.json`
at **137/137 byte-exact** (fade frames included), with RNG continuity
RAM-verified across the scene switch. ISSUES #8-#14 all root-caused,
fixed, and deleted along the way. The three older traces carrying
ISSUES #5-attributed frames (rent-slot1 125/139, rent-3picks 157/190,
confirm-flow 79/95) ship under that entry's user-delegated settled
policy; sole open debt is ISSUES #15 (baked msgbox frame asset,
non-blocking). Suite at stage close: 341 Tier-1 tests, 12 committed
traces.

### [x] S6 — Battle bring-up: transition → first action menu, opponent exact
**Status (CLOSED by user decision, 2026-07-19 ~11:30):** every window of
the chain is implemented and trace-pinned every-tick (13 committed
per-window traces, walk-warpout through menu-idle); `s6-acceptance.json`
(anchor→settled action menu, uniform 8-tick grid, 228 captures) ships at
**224/228** with every diff individually attributed — 3 frames are ISSUES
#5's user-settled WIN0V pattern (x88-151-verified), 1 frame (tick 1496,
3px) is ISSUES #18's particle z-order residual, **accepted/parked
permanently by the user** (option: build whole-scene persistent
`sSpriteOrder` state was declined as out of proportion — full mechanism
derivation in battle-scene-notes.md §7.32). `sendout.json` ships at
255/256 under the same attribution. RNG-exactness + opponent-pin
criteria met (opponentGen tests vs RAM dump).
Battle transition effect, battle scene init (backgrounds, healthboxes,
sprites, send-out), intro text, through the first action menu. Opponent
selection + team generation reproduced RNG-exactly (frontier battles do NOT
advance RNG per frame — see Domain notes; verify opponent identity/team via
intro text pixels and a RAM dump of the same trace).
**Acceptance:** committed trace from anchor through a fixed draft into
battle until the first action menu passes compare with 0 diff on dense
captures; Tier-1 test pins the generated opponent (trainer id, mon set) vs
the RAM dump.
**Scope note (S5 scout, 2026-07-17):** battle 1's opponent + team are
generated in `EventScript_EnterRoom` BEFORE the draft screen opens — i.e.
before frame 0, baked into the anchor like the rental pool. So for battle 1
they are constants (RAM-dump the anchor); trace-dependent opponent
generation first matters for battles 2-7 (S8). See `docs/rent-flow-notes.md`.
**Corrections (S6 scout, 2026-07-17, `docs/battle-bringup-notes.md`):**
(1) only opponent *identity* is pre-anchor — RAM-dumped: trainer 50
DESTIN (Bug Catcher), team Grovyle/Murkrow/Pidgeotto vs player
Onix/Magby/Bayleef; the opponent mons' *personalities* are rolled fresh
inside `DoSpecialTrainerBattle` via a variable-length `Random32()`
rejection loop at battle start. (2) `Random()` keeps advancing once per
VBlank through the entire walk/warp/dialogue/transition window — the
"no per-frame RNG" rule applies only once actually in battle. (3) The
battle transition is a RANDOM 12-way pick
(`GetSpecialBattleTransition(B_TRANSITION_GROUP_B_FACTORY)`,
`battle_setup.c:864-909`) — reproducing which transition plays requires
the RNG stream to be exact from the anchor all the way to the trigger.
**Groundwork banked (2026-07-17):** battle-1 static assets extracted and
mostly oracle-cross-checked (mon front/back pics + coord tables, trainer
pics, battle bg, healthbox family, battle window/font —
`extract-battle-*.ts`) and all 12 frontier transition variants' assets +
parameter tables extracted source-verified
(`extract-battle-transition-frontier.ts`).
**Slice 0 complete (2026-07-18, supervisor-verified):**
`tools/compare/traces-groundtruth/battle1-intro.json` (1886 frames, 254
captures) pins the full A-press-through-first-action-menu window with
sha256-cited frame boundaries and RAM-verified RNG/personality/
transition checkpoints (`docs/battle-bringup-notes.md` "Slice-0 ground
truth" — incl. two evidence-filed corrections to the earlier dossier);
engine slices now implement against fixed targets.
**Slice 1b complete (2026-07-18, supervisor-verified):** the slice-0 §4
loose ends are resolved in the dossier — transition RAM-confirmed as
`B_TRANSITION_FRONTIER_CIRCLES_MEET` (id 34, `gTasks[].data[1]` +
function-pointer + screenshot corroboration; the 1077-1197 "streaks" are
`BeginBattleIntro` scene assembly, transition tasks destroyed at 1044);
transition-end pinned to tick 1227 (text milestones through the ♥ glyph
+ 4-phase/36-tick idle from 1292); post-freeze draws re-attributed
(1741 = `TryDoEventsBeforeFirstTurn`, RAM-confirmed; 1745 plausibly
opponent-AI switch heuristics; the 5-step 1747 draw remains unpinned —
S7 concern, not S6).
**Slice 1a complete (2026-07-18):** the A-press → closemessage → guided
walk (attendant + player, camera scroll, attendant set_invisible) → warp
fade-to-black window (ticks 400-519) is engine-implemented and RAM/pixel-
pinned; `tools/compare/traces/walk-warpout.json` (125/125, 0 diff). Battle-
room entry (frame 520+) and everything after is still open.
**Battle-room groundwork banked (2026-07-18, supervisor-verified):** the
warp-destination room's scene assets are extracted and composite-verified
(`extract-battle-room.ts`; tick 624 full-frame 0/38400, ticks 740-838
0/21600 on y<90 — residual exactly the not-yet-extracted opponent-speech
msgbox), `docs/battle-room-notes.md`. Camera pans tracking the invisible
real player; opponent walk-in gfx = `OBJ_EVENT_GFX_BUG_CATCHER`. Open for
the engine slices: camera sub-tile timing, the 520-535 fade-in curve,
walk/turn transient frames (extracted, pixel-unverified), msgbox variant.
**Slice 2a complete (2026-07-18):** the room ENTRY window (warp fade-in +
camera pan + decoy walk to settle, ticks 520-624) is engine-implemented and
RAM/pixel-pinned (`src/engine/battleRoom.ts` + `battleRoomRender.ts`);
`tools/compare/traces/room-entry.json` (110/110, 0 diff). Resolved: the
fade-in is `paletteFade.ts`'s `FADE_IN` (indexed by `elapsed` directly, not
`elapsed+1`); the camera pans a clean 1px/tick, no sub-tile curve; the
decoy is screen-fixed the whole window (walks in exact lockstep with the
camera pan) - only its walk-cycle frame changes. Scientists turn + opponent
walk-in (624-739) and the opponent-speech msgbox (739-843) are still open
for slices 2b/2c.
**Slice 2b complete (2026-07-18):** the SCIENTISTS-TURN + OPPONENT WALK-IN
window (ticks 624-717) is engine-implemented and RAM/pixel-pinned (same
`battleRoom.ts`/`battleRoomRender.ts`, no new assets needed - #49's
`battle-room-layout.json` already carried the object inventory);
`tools/compare/traces/room-npcs.json` (98/98, 0 diff). Ended the trace at
717 (before the msgbox appears at 718, per #51's groundwork) rather than
739 - the print window is slice 2c's. Resolved: the scientists' turn is
only 2 visually-distinct ticks (not the RAM `duration=4`, which counts
movement-step calls, not frames); the opponent is added and takes its
first walk step within the same engine tick; its walk screenY is a clean
1px/tick ramp (no sub-tile easing), same convention as the entry camera
pan. The opponent-speech msgbox (718-843) is still open for slice 2c.
**Slice 2c complete (2026-07-18):** the OPPONENT-SPEECH MSGBOX window
(ticks 718-843) is engine-implemented and oracle-pinned (`battleRoom.ts`
gains `msgboxIdle`/`msgboxClosing`/`settled` phases; `battleRoomRender.ts`
reuses `prebattleRoomRender.ts`'s box compositor, now exported/factored
rather than duplicated); `tools/compare/traces/room-msgbox.json` (142/142,
0 diff). The close latency (press-to-vanish) was derived analytically from
the ground-truth trace's own committed button segment + readKeys.ts's
edge-triggered newKeys semantics, not guessed.
**Transition slice complete (2026-07-18):** the CIRCLES_MEET battle
transition (ticks 843-1040: static hold → gray flicker → circle-sprite
slide+meet → center-logo BLDALPHA blend → fade to black → hold black) is
engine-implemented (`src/engine/battleTransition.ts`, wired into
`battleRoom.ts`'s existing "settled" phase - no new phase needed);
`tools/compare/traces/transition.json` (206/206, 0 diff). S6's remaining
open window: scene assembly (1031-1300+), off `docs/battle-scene-notes.md`
(PROGRESS #55) - the transition now holds solid black indefinitely past
tick 1030, exactly where that slice takes over. Out of scope for both:
RNG-modeling which of the 12 transition variants plays (a separate step
owns RNG-exactness) and the other 11 variants' own pixel behavior.
**Scene-assembly slice COMPLETE (2026-07-18, PROGRESS #58→#70, seven
iterations):** `src/engine/battleScene.ts` implements the 1040-1295
window; `tools/compare/traces/scene-assembly.json` is **256/256** —
byte-exact end to end (42→40→41→104→151→255→256; each iteration
converged to a strictly smaller named gap, per the user's recorded
keep-iterating decision, honored to completion). Load-bearing
discoveries: a **systemic one-tick render lag** on every intro-task-
driven register (#63/#64/#68, incl. evaEvb's ramp anchor); the trainer
OBJs DO slide in during the reveal (#66, correcting #63's settled-corner-
only sampling); BG3 is 512px wide (`screenSize=1`, #66); mGBA blends in
its native 8-bit domain, not 5-bit hardware space (#68, mathematically
proven — `blendChannel` is battleScene-local, `paletteFade.ts`'s 5-bit
blend stays oracle-validated elsewhere); the player status bar has a
RAM-confirmed asymmetric one-tick `x2` stall at creation the opponent
bar lacks (#70); the "missing palette bank 4" was a tilemap
normalization bug (#62, extractor fixed).
**RNG-exactness criterion satisfied (2026-07-18, PROGRESS #61):**
`src/engine/opponentGen.ts` + `tests/opponentGen.test.ts` pin battle 1's
personality rejection loops, `Random32()` word order, and the 12-way
transition pick bit-exact against the RAM dump (28/16/95 iterations, all
3 personalities/natures, draw 22624 → CIRCLES_MEET), with the inter-loop
ambient VBlank draws (11/7/8) modeled as an explicit parameter.
**Groundwork status: COMPLETE for all of S6** — dense every-frame ground
truth now covers the full 1886-tick bring-up (battle1-intro +
transition/scene/sendout/menu dense traces, 969 captures total across 4
committed groundtruth traces) and every flagged asset is extracted
byte-exact (battle room, interface widgets, send-out particles/ball-open/
materialize tables). Remaining engine slices after scene assembly:
send-out window 1300-1560 (`docs/battle-scene-notes.md` §7) and player
send-out + action menu 1560-1810 (`docs/battle-menu-notes.md`), then the
S6 acceptance trace end-to-end.

### [x] S7 — Turn resolution: the anchor round's first battle exact
Move selection UI, turn order, damage, accuracy/crit rolls, HP-bar drain
timing, battle text, faint/switch/win — with move animations for the
movesets actually in play, added until full capture windows pass.
**Slice 1 complete (2026-07-19, supervisor-verified):** the pure-logic core
— `damageCalc.ts` (CalculateBaseDamage bit-exact incl. its unconditional
final `+2`, crit/STAB/type/spread/accuracy), `turnOrder.ts` (priority →
speed → `Random()&1` tie-break, tie branch synthetic-unit-tested),
`turnRng.ts` (turn-1's 12-step ledger) — hermetically pinned against
`battle1-turn1-ram-dump.json`'s LCG transitions (19 Tier-1 tests,
`docs/battle-turn-notes.md` §10, incl. two evidence-cited corrections to
the earlier groundwork's worked examples). Later cross-validated bit-exact
by turn 2's DRAGON_BREATH (first special-branch exercise, §12).
**Turn-1 UI/animation chain (2026-07-19 session, supervisor-verified):**
FIGHT submenu open/nav/close (`fight-submenu.json` 234/235, ISSUES #19's
1 frame) → move confirm + kickoff text (`turn1-kickoff.json` 81/81) →
DOUBLE_TEAM clone anim + real-BG1 stat banner (`turn1-cloneanim.json`
230/230) → full ROCK_SLIDE window incl. 20-rock OAM slot-allocation
simulation (`turn1-rockslide.json` 250/256 — 6 frames are §11.1's
pre-existing 1px shake-sampling bug) → HP drain + turn end
(`turn1-drain.json` 102/102; ISSUES #16 partial-HP path oracle-validated
exactly). The 1px shake residual is CLOSED (§11.1, real cause was the
player healthbox's bleed-mask heuristic, `turn1-rockslide.json` 256/256).
Ground truth banked through turn 14's forced switch (§12-§14: turns 2-5
ledgers, faint + Pidgeotto switch-in, PP exhaustion, SEND OUT sequence).
**Turn-2 slice E1 (2026-07-19 session):** FIGHT submenu reopen (dynamic PP
9/10, real FONT_NORMAL pipeline) → DRAGON_BREATH confirm → ENDEAVOR's
kickoff text, fully printed and held (`turn2-endeavor.json` 76/77, the 1
residual is ISSUES #19's own family, confirmed recurring); ENDEAVOR's HP-
diff math pinned hermetically. **Slice E1b (this session):** Onix's own
HP-bar drain (117→101, `endeavorOnixHp`) + the player healthbox's own
HP-digit overlay (`composePlayerHealthboxHpOverlay`, FONT_SMALL) landed
(`turn2-endeavor-drain.json` 105/106, same ISSUES #19 residual). ENDEAVOR's
own attack animation (source-confirmed a genuinely custom asset —
attacker squish/sweat-droplet/yellow-blend + target shake+hitsplat,
`Move_ENDEAVOR` — NOT "plain generic hit" as earlier assumed, ticks
3003-3094) **through render 3060 is now landed** (§15-§15e: squish/blend/
droplets/shake/hitsplat all RAM-probed and wired, `turn2-endeavor-
drain.json` 166/167, contiguous green 3000-3060). **Slice E1 CLOSED
(2026-07-19 night, supervisor-verified):** the 3061-3094 tail landed
(two new mechanisms: player-healthbox post-hit wobble + Onix post-hit
flicker, both `render=RAM+1`; §15f) — `turn2-endeavor-drain.json`
**200/201**, green contiguously 3000→3120, sole residual = ISSUES #19's
family frame. **Slice E2 scouted (same night):** DRAGON_BREATH's real
pixel window is **3137→3846** (3095-3136 is ENDEAVOR's own HP-drain
tail, already green); ground truth banked in `docs/dragon-breath-notes.md`
(dense trace 3095-3346, task/sprite inventory, §12 ledger re-verified,
sole missing asset `small_ember.png`).
**Slices E2a/E2b landed (2026-07-20, supervisor-verified):** kickoff text,
target shake (`AnimTask_ShakeMon2`), the two red-fade blends, Grovyle's HP
drain 101→88, text-clear and the turn-3 menu reopen —
`tools/compare/traces/turn2-dragonbreath.json` **166/166**.
**Fire projectiles PARKED as a named remainder (supervisor decision
2026-07-20 ~01:10, under the session's stated escalation default after the
question went unanswered — see ISSUES #23; reversible, the user may
re-open):** renders 3177-3235 are excluded from `captureFrames` rather
than committed red, exactly as this run treats every un-green span. Four
bounded attempts pinned the geometry (21-entry matrix table, base, lag,
cadence, frame cycling), closed the palette-blend theory by source proof,
and eliminated the shared affine sampler by a 4-variant sweep; no attempt
shipped known-wrong pixels. S7's acceptance is unaffected — it asks for
committed traces green on their captures, which this trace is.
Remaining for S7: the parked projectile gap (ISSUES #23), the tick-3337
flicker, faint/forced-switch engine slice. **Slice F landed (2026-07-20
bounded worker):** turn 3's FIGHT-submenu reopen (cursor persistence off
turn 2's own confirmed slot, PP, bounce-anchor) — `tools/compare/traces/
turn3-menu.json` **250/250**; turn 3's own actual move resolution (and
everything past it — turn 4, the turn-5 faint, DESTIN's switch-in, Onix's
own later faint, forced party-select/SEND OUT) remains unbuilt, see
`docs/battle-turn-notes.md` §19.
**Turns 3-5 + the faint COMPLETE (supervisor, 2026-07-20 afternoon
session, slices G through K + residual cleanup, §20-§24):** turn 3
(`turn3-endeavor` 192/192, `turn3-rockslide` 256/256), turn 4
(`turn4-menu` 44/44, `turn4-doubleteam` 249/249, `turn4-rockslide`
250/250), turn 5 through the KO (`turn5-menu` 41/41, `turn5-endeavor`
254/254, `turn5-rockslide` 256/256, `turn5-faint` 110/110) — all 0 diff
on their captures. Both long-standing excluded-residual families were
root-caused and FIXED (stale-`gBattleMovePower` shake amplitude; turn-3
bounce +1 phase), all 16 excluded ticks restored; the engine's first
input-gated battle text (the KO hold) landed Tier-1-pinned both
branches. Healthbox band/sliver/empty-bar coverage is now fully
oracle-confirmed (ISSUES #16 trimmed to status-icons only). The
switch-in tail (slice L: sent-out text → materialize → healthbox
slide-in → Sitrus proc → settled menu vs PIDGEOTTO) is in flight with
all formulas/assets banked (`docs/faint-switch-notes.md` §3-§8).
Remaining known residual classes: the isolated redraw-extremum ticks
(4934, 5927 — same documented class), ISSUES #23 (parked).
**Turn-16 FIRE_PUNCH cast landed (2026-07-23 bounded worker):**
`turn16-rung3.json` is **236/236 exact** for every canonical tick
`21170-21405`, source/RAM-derived through red blend, four spiral embers,
fist/hitsplat/shake, seven-ember spread, generic hit response, and visible
HP drain. Exact predecessor rungs remain green; the next boundary is the
atomic opponent-HP write at **21406**. See `docs/turn16-notes.md` §6.6.
**Turn-16 burn resolution landed (2026-07-23 bounded worker):**
`turn16-rung4.json` is **155/155 exact** for every canonical tick
`21406-21560`: atomic HP/status/RNG writes, the three-flame status animation,
burned-message typing/hold, the reusable BRN healthbox compositor at 21542,
`gCurrentMove` reset, and the first four residual-message handoff ticks.
ISSUES #16 is closed; burn damage and tick 21561 onward remain untouched.
See `docs/turn16-notes.md` §6.7.
**Turn-16 completion accepted by the supervisor (2026-07-23):**
Turn 16 is complete through its turn-17 menu handoff:
`turn16-rung5.json` is **175/175 exact** for every canonical tick
`21561-21735`, covering the second Status_Burn animation,
`floor(142/8)=17`, MURKROW `75→58`, atomic HP and both AI/RNG boundaries,
message clear, and the freshly-bouncing `What will MAGBY do?` redraw.
All turn-16 rungs 1-5 and verifier regressions remain exact; see
`docs/turn16-notes.md` §6.8. This does not propose ticking S7 complete.
**Turn-17 rung 1 accepted by the supervisor (2026-07-23):**
`turn17-rung1.json` is **118/118 exact** for every canonical tick
`21736-21853`, covering the settled menu, turn-17 FIGHT reopen with
FIRE_PUNCH `14/15`, confirmation, MURKROW-first/currentMove dispatch, and
the no-crit/RAM-pinned `52` damage roll. Source/RAM confirms **21854** is
the first FAINT_ATTACK animation-owned render and therefore the next
boundary. This does not propose ticking S7 complete.
**Turn-17 rung 2 accepted by the supervisor (2026-07-23):**
`turn17-rung2.json` is **221/221 exact** for every canonical tick
`21854-22074`, reusing the source-derived FAINT_ATTACK body with the live
MAGBY `79/138` and MURKROW `58/142 BRN` composition. Tick **22074** is the
final animation-owned displayed VBlank; post-hit resolution from 22075 is
still open. The dense window, predecessor rung, turn-17 verifier, Tier-1
suite, and production build were independently reverified. This does not
propose ticking S7 complete.
**Turn-17 rung 3 accepted by the supervisor (2026-07-23):**
`turn17-rung3.json` is **143/143 exact** for every canonical
tick `22075-22217`, covering post-hit wobble/blink, MAGBY's `79→27`
display drain and atomic HP write, chance-0 secondary RNG, battler/target/
currentMove handoff, FIRE_PUNCH accuracy/text/PP/crit/damage lead-in, and
the controller handoff. Fresh buffer/RAM/source evidence corrects the
initial endpoint estimate: **22218**, not ~22198, is the first
FIRE_PUNCH-animation-owned displayed state. The animation body and later
resolution remain open. The dense window, predecessor rung, turn-17
verifier, Tier-1 suite, and production build were independently reverified.
This does not propose ticking S7 complete.
**Turn-17 rung 4 accepted by the supervisor (2026-07-23):**
`turn17-rung4.json` is **200/200 exact** for every canonical tick
`22218-22417`, reusing the shared FIRE_PUNCH reducers/compositor from shared
age 27 through red blend, spiral/impact/spread effects, generic hit response,
and MURKROW's lethal visible `58→0` drain with BRN retained. A fresh
two-frame boundary check matches 22417 and intentionally diverges at 22418;
the verifier/RAM dossier independently places the atomic HP write at 22418,
which remains untouched. Turn-17 rung 3 and Turn-16 rung 3 remain exact,
the Turn-17 verifier passes, and Tier-1/build are green; the supervisor
independently reverified each of those claims. S7 remains `[~]`; atomic
HP/status/faint/victory flow remains open.
**Turn-17 rung 5 accepted by the supervisor (2026-07-23):**
`turn17-rung5.json` is **113/113 exact** for every canonical
tick `22418-22530`: atomic lethal HP state, unconditional-but-blocked
secondary roll, steady hold, formula-reused seven-step MURKROW sink,
healthbox/BRN teardown and status clear, faint-text glyph cadence, settle,
and the fully typed wait-cursor/input gate. Rung 4 remains **200/200** and
the earlier shared `turn5-faint.json` path remains **110/110**; the Turn-17
verifier, Tier-1 suite, and build pass, all independently reverified by the
supervisor. See `docs/turn17-notes.md` §10. S7 remains `[~]`; tick 22531
onward, the long hold/dismiss, and victory flow remain open.
**Turn-17 rung 6 accepted by the supervisor (2026-07-23):**
`turn17-rung6a.json` and `turn17-rung6b.json`
gaplessly cover every canonical tick `22531-22826` at **255/255** and
**41/41 exact**. The confirmation-relative faint gate remains idle until
the real A edge, freezes its live cursor phase on dismissal, writes
`gBattleOutcome=B_OUTCOME_WON` at dismiss+17 with no visible change, and
retains the old faint framebuffer through dismiss+25. Rung 5 stays
**113/113**, the Turn-17 verifier passes **245/245**, and Tier-1/build are
green, all independently reverified by the supervisor. See
`docs/turn17-notes.md` §11. S7 remains `[~]`; tick 22827 onward and the
visible victory/trainer flow remain open.
**Turn-17 rung 7 accepted by the supervisor (2026-07-23):**
`turn17-rung7a.json` and `turn17-rung7b.json` gaplessly cover every
canonical tick `22827-23228` at **255/255** and **147/147 exact**. The
first-dismiss-relative outcome printer types all 34 glyphs, exposes its true
input gate at +59 and its first visible cursor at +61, holds indefinitely,
stores the real second A once, and freezes that live outcome pose through
second-dismiss +27; the first trainer-transition render is pinned at +28
but remains outside this slice. Rung 6b stays **41/41**, the Turn-17
verifier passes **245/245**, and Tier-1/build are green, all independently
reverified by the supervisor. See `docs/turn17-notes.md` §12. S7 remains
`[~]`; tick 23229 onward, the trainer transition/loss quote, and post-battle
flow remain open.
**Turn-17 rung 8 accepted; S7 complete (supervisor, 2026-07-23):**
`turn17-rung8a.json` and `turn17-rung8b.json` gaplessly cover
every canonical tick `23229-23601` at **255/255** and **118/118 exact**.
The source-derived DESTIN slide, old-message ownership through the pause,
loss-quote printer, real no-arrow input wait, and stable endpoint are all
Tier-1 pinned relative to the stored second dismiss edge. Rung 7b remains
**147/147**, the Turn-17 verifier passes **245/245**, and Tier-1/build are
green, all independently reverified by the supervisor. S7's committed-trace
and Tier-1 acceptance is met; parked #38 explicitly does not block canonical
acceptance. Input after 23601 and post-battle flow are S8. See
`docs/turn17-notes.md` §13.
**Acceptance:** committed traces playing scripted turns of battle 1 pass
compare with 0 diff first at text/menu/HP checkpoints, then on full windows
as animations land (both trace sets stay committed); Tier-1 tests pin
damage/order/RNG-consumption values against a RAM dump of the same turns.

### [x] S8 — Post-battle swap + the 7-battle round loop
Victory flow, the swap offer + factory swap screen, chaining into battles
2–7, round completion and loss endings (BP beyond the single round stays out
of scope).

**Authoritative completion reset (user decision, 2026-07-23):** this paragraph
supersedes the older incremental commentary below. The first complete battle,
post-win NO path, Battle 2 setup/action menu, and one shared ROCK SLIDE
mechanic through tick **33331** are sufficient vertical-slice and portability
evidence. **Stop the canonical Battle 2 turn march there.** Tick 33332/SAND
ATTACK, later turns, and Battles 3–7 must not become sequential pixel-window
milestones. Repeated battles are now staged state/controller coverage; use
deterministic scenarios, controlled seeds, source-derived state, or short
targeted oracle probes instead of replaying the complete prefix.

Stage 8 has three finite completion gates:

1. [x] **Generic round core:** a pure, data-driven controller supports battle
   indexes 0–6, deterministic opponent generation/no-repeat rules, per-battle
   healing, swap accept/decline party changes, advancement after wins, loss
   from every index, and seventh-win completion. Tier-1 scenario tests cover
   all seven wins plus representative losses/swaps without battle-number,
   turn-number, or absolute-tick rendering branches.
2. [x] **Unique remaining UI:** the swap-YES screen and interactions, loss ending,
   and seventh-win/round-summary ending are implemented and proven with
   committed dense OFF-profile traces over their unique dynamic windows.
   Repeated inter-battle NO traversal may reuse the generic controller and
   needs state coverage, not six full pixel replays.
3. [x] **Portability proof:** one staged Battle 2 turn runs end-to-end through the
   generic battle/presentation seam under Battle Scene OFF, from action choice
   through logical resolution and the next input-ready state. Its core outcome
   is source/RAM pinned, and a short representative trace passes compare. This
   is one proof, not the start of another turn-by-turn ladder.

**Reset-gate checkpoint (2026-07-23, supervisor-accepted):** gates 1 and 3
are complete. `roundController.ts` and the source-derived Factory trainer
schedule cover indexes 0–6, healing, accept/decline swaps, all seven wins,
representative losses, no-repeat selection, and terminal completion through
pure scenario tests. The staged OFF-profile ROCK SLIDE proof consumes the
source/RAM-pinned 12-call RNG sequence, reaches the exact logical outcome,
and is **16/16 exact** through the next accepted input. Gate 2 remains open:
the pure swap controller and source-extracted loss/seventh-win policies are
banked, while the live swap-YES presentation is exact through its input-ready
player picker (**101/101**) and the complete action fade/slide (**36/36**).
The source-relative mon-picture open extends the options trace to **58/58**,
and the settled options popup/cursor is now **44/44 exact** with a generic
state handoff at +57, first sampled input at +58, default `SUMMARY`, and
phase-relative B/DOWN/A dispatch. Screen-ball and selected-ball animation
epochs remain independent. Source/RAM evidence now pins B-close back to the
player picker at +113 (next sampled input +114); that return is now **59/59
exact**. SWAP evidence pins enemy mode at canonical tick 29886, picker input
at 29935, and accept-ready state at 29999 / first sampled prompt input 30000.
YES commits ONIX→GROVYLE at 30021 and exits at 30041; NO/B return to enemy
picker input at 30087 without mutation.
The default-YES response/exit is now implemented with selected-state mutation,
script-result semantics, and a committed dense OFF trace at **43/43 exact**
through the 30041 field-script handoff. Its input-ready prompt remains
**66/66 exact**. The source-equivalent NO and B responses now each have a
committed **69/69 exact** dense trace through the restored enemy-picker input
at 30087, with party/rental identity unchanged and no round decision emitted.
Source extraction now also pins the terminal field-message gates and the
seventh-win `MSGBOX_GETPOINTS` fanfare/wait path. The committed staged OFF
fixture pins the regular Level 50 seventh-win BP award at +2201, fanfare end
at +2513, party/status restoration at +3549, and its default-NO record menu
draw/accepted input at +4422/+4424 without replaying Battles 2–7.
The distinct loss path clears status at +210 and draws/accepts the same menu
at +622/+624. The LOSS opening is now implemented through that +210
party/status-clear boundary with a source-extracted circular lobby
map/NPC/message/down-arrow renderer and a committed dense OFF comparison at
**210/210 exact**. The terminal text artifact fully resolves the canonical
player name `MEMORY`, the Level-50 award of 3 BP, control bytes, and default
NO record choice. The later LOSS record question/menu is now exact across
every +211..+624 frame (**414/414**), including the shared `\l` fast-scroll,
default-NO draw at +622, and first sampled input at +624. The generic
seventh-win `roundWon` seam is now live and densely exact from its
staged `CB2_LoadMap` handoff through congratulations, the source-relative
award gates, 0→3 BP mutation at +2201, and the complete 312-frame
`MSGBOX_GETPOINTS` fanfare wait through +2513 (**2513/2513**). It preserves
the immutable round controller, RNG, battle index, parties, and opponent
inputs. A gapless second staged OFF fixture proves every +2514..+4424 frame
(**1911/1911**): exchange text, party/status restore and challenge clear at
+3549, save-SE wait, shared record-menu creation at +4422, and first accepted
default-NO input at +4424. LOSS and round-won use the same generic record
question/menu reducer and renderer with source-relative clocks. Gate 2
remains open because the source-to-trace audit identified four unique swap-YES
remainders outside the accepted ONIX→GROVYLE route: SUMMARY return, quit
prompt/exit/returns, enemy `PKMN FOR SWAP` return, and duplicate-species
rejection. A committed staged OFF fixture now pins player-B quit acceptance,
prompt readiness, default-YES no-mutation exit, and NO/B return. The reusable
player-origin live presentation is now exact for B and CANCEL transition-out,
prompt/input, YES keep-party exit, and NO/B transition-in return across four
committed every-frame windows: **31/31 + 67/67 + 67/67 + 68/68**. TRUE script
result, field handoff, fresh returned-picker input, and immutable party/rental
state are Tier-1 pinned. Enemy-origin quit chrome remains bounded and is not
claimed by this player proof. A separate compact OFF fixture now pins enemy
`PKMN FOR SWAP` from its accepted action edge through two-button enemy-chrome
teardown, four-action player-picker reconstruction, and the first fresh player
input, with immutable parties/rentals. That source-relative action is now live
and **115/115 exact**, including the 5→4 action switch, independent ball
callbacks, install-frame rejection, and first fresh RIGHT without party,
rental, decision, or selection-RNG mutation. The normal SUMMARY round trip is
now live and **147/147 exact** across every frame from the selected player
popup through summary open/input/close, `CB2_InitSwapScreen` reconstruction,
the returned default-SUMMARY popup, and accepted fresh DOWN/display copy.
Tier-1 pins the rejected/accepted gates, `SUMMARY_MODE_NORMAL`, current/max
indexes, callback ownership, four-action popup semantics, fresh ball clocks,
and immutable parties/rentals/result. A compact enemy-quit fixture pins both
B and CANCEL origins, staggered
`PKMN FOR SWAP`/CANCEL teardown and reconstruction, shared YES exit and NO/B
returns, install-frame rejection, fresh enemy input, and immutable identities.
That reusable enemy-origin presentation is now live and exact across every
dynamic frame: B default-YES **65/65**, B NO **113/113**, B return **113/113**,
and CANCEL default-YES **65/65**. It reuses the player prompt/response reducer,
owns no party/rental/result or selection-RNG mutation, and leaves only
duplicate-species rejection in the finite swap-YES UI audit.
The duplicate reducer/presentation seam is exact across its complete
picker→OpenMonPic→error→close→reconstruction audit (**52/52**), including
source-relative task/window/OAM timing, already-loaded versus logical species
ownership, and first fresh enemy input. Supervisor re-verification on
2026-07-23 also reconfirmed the loss ending (**210/210 + 414/414**), seventh-win
ending (**2513/2513 + 1911/1911**), representative swap routes, all Tier-1
tests, and the production build. The three finite reset gates are therefore
complete; S8 is closed without extending the canonical Battle-2 march beyond
tick 33331.
The parallel Scene-ON adapter
now proves FIRE PUNCH in both orientations (**225/225** and **277/277**) and
its canonical residual windows (**236/236** and **200/200**), making it
`exact`. ROCK SLIDE is likewise portable (**175/175**) and canonical
(**256/256**) and is `exact`; DOUBLE TEAM is portable and canonical
(**230/230** each) and is `exact`; ENDEAVOR is portable across both attacker
sides (**141/141**) and canonical (**237/237**) and is `exact`; FAINT ATTACK
is portable and canonical (**221/221**) but remains `partial` for its
separately parked residual. ICE PUNCH is now `partial` with its source-composed
opening, inward spiral, complete seven-spawn `IceCrystalEffectShort` burst,
move-script teardown, and generic hit reaction **222/222 exact**, including
the generic
semi-transparent OBJ-over-BG rule,
affine growth/flicker lifetimes, OAM ordering, and target-palette restoration.
The reusable teardown pins BG palette restoration, `clearmonbg`/`blendoff`,
and sound-gated `end` through frame 2525; shared healthbox wobble, target
blink, immutable HP drain, super-effective text, no-freeze secondary path,
`gCurrentMove` clear, and the seven-frame blank message-box hold are exact
through frame 2701 (**363/363**). The next controller display transition at
2702 and evidence-required geometry/orientation variants remain.
Level 50 animation coverage is therefore **4 exact / 9 partial / 263
unsupported**. This parallel Scene-ON breadth does not block completed S8.

New Stage 8 traces set `"oracleProfile": "battle-scene-off"` explicitly.
Historical traces below remain Battle Scene ON regression evidence. The
animation-on lane may improve move presentation in parallel under the
`AGENTS.md` worker-lane contract, but it does not block functional
seven-battle completion.

**Acceptance (re-scoped by user decision, 2026-07-19):** battle 1's win and
the swap traversal into battle 2's first action menu are pinned by a
**chain of overlapping committed traces** (each ≤ the oracle's frame cap,
each passing compare with 0 diff on dense captures, adjacent traces
sharing verbatim button-script prefixes so coverage is gapless) — a single
end-to-end trace is NOT required. Rationale: `battle-turn-notes.md` §14's
frame-budget analysis (supervisor-verified) shows no proven winning line
fits one trace from the anchor; the user chose multi-trace assembly over
raising the oracle cap or adding snapshot/restore. Tier-1 tests pin swap
logic and round-loop state as before.
**Groundwork banked (2026-07-19, supervisor-verified):** the full
acceptance chain is ground-truthed end to end —
`battle1-winline-b-swap.json` (33031 frames, 127 captures) reaches
battle 2's settled first action menu (FISHERMAN JENSON / KABUTO) via
battle 1's WIN and the declined swap offer, with §16's RAM-truthed
ledgers (Murkrow fight, victory text, free heal, opponent-2 scouting
text). Caveat pinned in §16: outside battle, per-VBlank RNG advance
resumes, so battle 2's opponent identity is timing-sensitive — extend
the chain only by reusing the committed segments verbatim. Open: the
swap-YES branch (factory swap screen UI) and battle 2 itself.
**Battle 2 opponent send-out increment (2026-07-23):** canonical
32531-32681 is committed at **151/151 exact** in
`battle2-kabuto-sendout-dense.json`. Shared send-out mechanisms are
encounter-parameterized for FISHERMAN JENSON/KABUTO, including KABUTO's
live 101-callback H-slide-wobble and Lv50 91/91 healthbox. S8 remains open;
`battle2-player-sendout-dense.json` now covers every frame 32680-32849 at
**170/170 exact**. The independently queued `Go! ONIX!` printer stays
opponent-handoff-relative, while Brendan, player summary, ball/open/
particles, ONIX materialize/back animation, and the Lv50 117/117 healthbox
reuse Battle 1 through one inherited visual delay.
`battle2-action-menu-dense.json` now captures every canonical frame
32848-33056 at **209/209 exact**, with a live KABUTO 91/91 vs. healed ONIX
117/117 field. Exact replay corrected the earlier
boundary ledger: ONIX's inherited shake finishes 32850-32854, `Go! ONIX!`
holds through 32894, the six clear frames are 32895-32900, and the atomic
input-ready menu begins 32901. The endpoint RNG is 3530724670 with
controller exec flags 1. The bounded interaction presses A at 33031,
reveals ONIX's full-PP FIGHT submenu at 33037, navigates DOWN from ROCK
SLIDE to DRAGONBREATH, and B-closes to the resettled action menu at 33051
without confirming a move. S8 remains open for Battle 2 turns, swap YES,
and battles 3-7.
**Battle 2 turn-1 ROCK SLIDE increment (2026-07-23):** canonical A at 33071
confirms ONIX's default ROCK SLIDE and the engine is exact through **33331**,
one frame before KABUTO takes attacker/current-move ownership.
`battle2-turn1-rockslide.json` is **191/191 exact**, with dense capture
windows across confirmation/text, animation, and the complete KABUTO
healthbox drain/settle. The Battle-1 ROCK SLIDE clocks/render mechanisms are
reused confirm-relatively on the live ONIX/KABUTO field; Tier-1 pins ONIX-
first order, PP 10→9, the accuracy/spread/non-flinch RNG calls, damage 28
noncrit, KABUTO 91→63, and the 33331/33332 boundary. Frame 33332+, SAND
ATTACK, later turns, swap YES, battles 3-7, and round completion remain
open, so S8 stays `[ ]`.
**Frame cap raised (user decision #2, 2026-07-19 ~17:00):** §15's scout
proved the WIN unreachable under the 20000-frame cap for ANY plausible
line (best verified line: Onix faints at 19147 with Murkrow untouched at
142/142; floor arithmetic for WIN + swap + battle-2 menu ≈ 22500+). The
user chose raising the oracle cap (option 1) over snapshot/restore or
another re-scope: harness commit `ccd7554` sets `MAX_FRAMES = 45_000`,
service restarted and verified (`bin/oracle info` → 45000). The
multi-trace chain acceptance above stands unchanged; maxCaptures stays
256, so the chain model is still how capture density is achieved.
**Engine dependency noted (2026-07-19 night):** the FIGHT submenu's text
now renders through the live glyph pipeline (ISSUES #20 closed —
`fightSubmenuText.ts`, KABUTO's moveset proven rendering in tests), but
`core.ts` still feeds it battle-1's fixed moveset; wiring the per-battle
moveset from battle-setup state through `EngineState` into that render
call is an S8 engine slice prerequisite for battle-2 menu parity.
**First postwin engine increment (2026-07-23, supervisor-accepted):**
canonical ticks **23602-23800** (DESTIN loss-quote dismiss through the
settled/input-ready heal message) are implemented and committed at
**199/199 exact**, every tick captured in `battle1-postwin-heal.json`.
The slice includes the no-cursor quote gate/stored edge, source
`BeginFastPaletteFade` battle fade and teardown, `gMain.inBattle` clear +
VBlank-RNG resume at dismiss+43, the Battle Factory battle-room flash,
second black hold, prebattle-counter fade-in, attendant/player composition,
and both heal-message lines. Tier-1 pins delayed-edge shift, phase
ownership, the +43 RNG transition/bursts, challenge number +79, opponent
rental IDs +137, and the distinct last-glyph (+191) / true input-ready
(+194) boundaries. The same state layer also corrects the pre-existing
battle-entry ownership edge: VBlank RNG remains active through the
source/RAM-relative opponent-generation draws and freezes only at
`CB2_InitBattleInternal`, not when the attendant speech is dismissed.
This is **partial S8 progress only**: heal dismiss,
party heal write, continuation menu, swap paths, battles 2-7, and round
completion remain open, so S8 stays `[ ]`. The supervisor independently
reverified the dense window, its predecessor, the Turn-17 verifier, full
Tier-1 suite, and production build before accepting the increment.
**Second postwin engine increment (2026-07-23, supervisor-accepted):**
the canonical input-gated heal hold, dismiss, delayed party heal, and
second-match prompt now extend the modeled endpoint through **26009**, the
true first continuation-menu input tick. `battle1-postwin-next-prompt.json`
reuses the committed 146-segment script verbatim, anchors the static
23800-25801 hold, and captures every tick 25800-26009 at **216/216 exact**;
`battle1-postwin-heal.json` remains **199/199 exact**. Fresh RAM reconfirms
the atomic 25965 HP write `[0,27,153]→[117,138,153]`, unchanged zero
statuses, and uninterrupted outside-battle VBlank RNG ownership. Tier-1
pins early/delayed heal A edges and shifts every downstream boundary from
the stored edge. The source-backed continuation menu is visible at 26008
but first accepts input at 26009. This remains **partial S8**: canonical
menu hold/GO ON at 28002, scouting pages, swap decision/UI, Battle 2, and
the rest of the round remain open; S8 stays `[ ]`. The supervisor
independently reviewed the timing-relative implementation and reverified
the new trace, predecessor, full Tier-1 suite, and production build.
**Third postwin engine increment (2026-07-23, supervisor-accepted):**
the canonical continuation-menu hold, GO ON at 28002, all three opponent
scouting pages, and the swap offer now extend the modeled endpoint through
**29601**, the held/input-ready YES/NO prompt before a choice. Adjacent
verbatim-prefix traces `battle1-postwin-scout-a.json` and `-b.json` are
**171/171 + 164/164 exact** and capture every tick of every dynamic
transition/typing/menu span; `battle1-postwin-next-prompt.json` remains
**216/216 exact**. Fresh input sweeps and RAM/source evidence pin true A
readiness at 26009, 28074, 28476, 28874, and 29272 (swap text final 29265,
menu visible 29268). Tier-1 stores all accepted edges, rejects adjacent early
edges, shifts under delayed GO ON, and pins the edge-relative 28003-equivalent
five-call RNG burst while retaining outside-battle VBlank ownership. This is
still **partial S8**: neither YES nor NO is selected, and swap UI/decline,
Battle 2, battles 3-7, and round completion remain open; S8 stays `[ ]`
after supervisor review. The supervisor independently reviewed the
stored-edge state/RNG/render paths and reverified both new traces, their
predecessor, full Tier-1 suite, and production build.
**Fourth postwin engine increment (2026-07-23, supervisor-accepted):**
the canonical NO branch now extends the modeled endpoint through **30031**,
the held/input-ready `"Right this way, please!"` field message, stopping
before its dismissal or the walk/warp. `battle1-postwin-decline.json`
reuses the accepted 146-segment prefix verbatim and is **73/73 exact**,
capturing every tick 29601-29660 plus sparse anchors over the settled hold;
`battle1-postwin-scout-b.json` remains **164/164 exact**. Fresh sweeps pin
DOWN acceptance at 29272 with a one-VBlank cursor-copy lag, canonical stored
edges DOWN 29602 / NO 29632, guide text final at 29658, and true first
dismiss input at 29660. Tier-1 pins early/delayed cursor and A behavior,
stored-edge-relative clocks, healed party state, and ordinary VBlank RNG
ownership; a fresh 434-row RAM audit finds one LCG call on every tick through
30031. This remains **partial S8**: the message dismissal, walk/warp, Battle
2, battles 3-7, and round completion remain open, so S8 stays `[ ]`.
The supervisor independently reviewed the cursor/message state path and
reverified the new trace, predecessor, full Tier-1 suite, and build.
**Fifth postwin engine increment (2026-07-23, supervisor-accepted):**
the canonical NO path now extends through A at **30032**, the shared
attendant/player walk, field warp, Battle Factory battle-room entry, and
FISHERMAN JENSON's settled/input-ready opening quote at **32031**, stopping
before dismissal. Prefix-identical `battle2-room-a.json` and
`battle2-room-b.json` are **225/225 + 131/131 exact**, capturing every
dynamic frame 30031-30382 plus proven-static hold anchors through 32031;
`battle1-postwin-decline.json` remains **73/73**. Fresh input/RAM/source
evidence pins the frame-29660 ready gate, canonical stored edge, returning
attendant animation alternation, room/object boundaries, Fisherman gfx and
JENSON Easy Chat quote, and relative +109/+110 map-load RNG bursts. This is
still **partial S8**: the quote dismissal, Battle 2 trainer-intro/transition
and battle, battles 3-7, swap-YES path, and round completion remain open, so
S8 stays `[ ]`.
The supervisor independently reviewed the postwin-to-room state/render/RNG
handoff and reverified the 225/225 + 131/131 new traces, 73/73 + 125/125
regressions, all 1086 Tier-1 tests, and production build.
**Sixth postwin checkpoint (2026-07-23, supervisor-accepted partial):**
fresh edge probes pin the JENSON quote's first accepted A at **30383**
(30382 rejected; canonical 32031 delayed) and the trainer-intro first
accepted A at **32479** (32478 rejected; canonical 32531 delayed). A fresh
32020-33031 RAM replay pins field VBlank RNG ownership, relative setup bursts
`+50/+22/+4/+1`, transition-table index 10
(`FRONTIER_CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ`), Battle 2 scene handoff at
32245, and `gMain.inBattle` freeze at 32250. Engine state now preserves
FISHERMAN JENSON/KABUTO, the healed ONIX/MAGBY/BAYLEEF party, and ONIX's real
moveset across setup; source trainer and KABUTO assets are extracted. This is
an evidence/setup checkpoint, **not** endpoint pixel acceptance: the live
sequential spiral, parameterized intro/send-outs, KABUTO healthbox, and
composed Battle 2 menu remain. No Battle 1 full-frame menu harvest was reused
as Battle 2 chrome. Battle 2 actions, battles 3-7, swap YES, and round
completion also remain open, so S8 stays `[ ]`.
The supervisor independently reviewed the encounter-relative state/RNG/setup
handoff and reverified the 131/131 + 73/73 predecessor traces, all 1089
Tier-1 tests, and production build; no new endpoint pixel acceptance is
implied.
**Seventh postwin increment (2026-07-23, supervisor-accepted):**
canonical **32031-32279** is now **249/249 exact** in
`battle2-transition.json`, capturing every frame from JENSON's held quote
through delayed-A close/setup, the shared gray intro, the live three-circle
sequential asymmetric spiral, center-logo blend/hold, room fade, and final
black handoff. Source-relative transition selection ages parameterize the
shared renderer; `Sin2`/`Cos2` geometry, 16-tick creation staggering, and
`SortSprites` signed-Y overlap ordering are Tier-1 pinned. The predecessor
`battle2-room-b.json` remains **131/131**, Battle 1's `transition.json`
remains **206/206**, Tier-1 is **1095/1095**, and build passes. Frame 32280
and all visible Battle 2 battle-scene rendering remain open, as do battles
3-7, swap YES, and round completion; S8 stays `[ ]`.
The supervisor independently reviewed the encounter-selected live geometry,
OAM ordering, and compositor integration, then reverified the 249/249 new
trace, 131/131 + 206/206 regressions, all 1095 Tier-1 tests, and build.
**Eighth postwin increment (2026-07-23, supervisor-accepted):** canonical **32280-32530** is now
**251/251 exact** in `battle2-intro-dense.json`, with every frame captured
from the first visible Battle 2 framebuffer through FISHERMAN JENSON's held,
input-ready intro immediately before A at 32531. The shared
BattleIntroSlide3/reveal/status-summary/message/cursor renderer now selects
trainer art and text parameters from the preserved encounter identity;
JENSON's two-character-shorter first line reanchors only the cursor start.
`battle2-transition.json` remains **249/249**, Battle 1 `scene-assembly.json`
remains **256/256**, Tier-1 is **1098/1098**, and build passes. KABUTO/ONIX
send-outs, the Battle 2 action menu and turns, battles 3-7, swap YES, and
round completion remain open, so S8 stays `[ ]`.
The supervisor independently reviewed encounter preservation and the shared
trainer/text/cursor selection, then reverified the 251/251 new trace,
249/249 + 256/256 regressions, all 1098 Tier-1 tests, and build.
**S8 opening evidence checkpoint (2026-07-23, supervisor-accepted; no engine change):**
the canonical segments 154--155 boundary ledger was recorded in
`docs/battle2-opening-notes.md`: JENSON's accepted A at 32531 hands off at
32570; KABUTO uses the shared ball/healthbox mechanics but species-specific
`ANIM_H_SLIDE_WOBBLE`; ONIX's inherited throw anchor is 32682. Its earlier
32850/32856 menu-boundary claim is superseded by the every-frame checkpoint
above: clear 32895-32900, atomic input-ready reveal 32901.
Frame 33030 is the held KABUTO 91/91 vs ONIX 117/117 FIGHT-menu endpoint.
Sparse app diagnostics rank only live-render gaps (max 11,210 px at 32831),
not an acceptance claim.  S8 remains `[ ]`.
The supervisor independently reviewed the source/RAM boundary ledger and
reverified all 1098 Tier-1 tests and production build.
**Ninth postwin increment (2026-07-23, supervisor-accepted):** canonical
**32531-32569** is **39/39 exact** in
`battle2-jenson-sendout-text.json`: delayed A dismissal, the shared
five-frame registration hold, encounter-parameterized 32-glyph
`FISHERMAN JENSON sent / out KABUTO!` printing, and its final post-text
hold. `battle2-intro-dense.json` remains **251/251 exact**. Frame 32570's
trainer exit/ball/species handoff and everything later remain open, so S8
stays `[ ]`. Tier-1 is **1099/1099** and the production build passes.
The supervisor independently reviewed the encounter-relative send-out
printer and reverified the 39/39 new trace, 251/251 predecessor, all 1099
Tier-1 tests, and build.

### [x] S9 — Deferred interface and breadth workstreams (non-blocking)

Finish the intentionally deferred S4 summary-screen interactions, then add
bounded data/input breadth where it exercises shared mechanisms. Move-animation
breadth is a parallel optional workstream against the Battle Scene ON oracle,
not a requirement to replay every eligible matchup before the round loop can
be called complete.

**Acceptance:** S4's named remaining summary routes have committed targeted
traces; ≥10 deterministic scenario/fuzz cases cover varied draft orders,
menu detours, opponents, swaps, wins, and losses at the state layer; selected
unique UI windows pass compare; `npm test`/`npm run build` are green.

**Completion (2026-07-24, supervisor-verified):** S4's named routes are
accepted by the exact targeted traces recorded above. The generic
`roundScenarioMatrix` supplies 12 deterministic state-layer cases spanning
varied seeds, draft order/menu detours, opponent schedules, swaps, wins,
losses, and seventh-win completion. The final summary gate is **1351/1351**
Tier-1 tests plus a green production build. Scene-ON move breadth remains an
independent coverage lane and does not alter this bounded interface verdict.

### [x] S10 — Parameterized battle laboratory + complete Level-50 singles engine

**Stage closed 2026-08-10 (supervisor):** all six gates are checked; the
family-level Gate-6 program completed 2026-08-09→10 (five families in one
session plus the surge audit's same-session class fixes). Per the
2026-08-09 user sequencing decision, the next milestone BEFORE S11 audio
is the short "playable round" user-polish pass (#71, #73,
session-trace-driven pacing fixes).

**User decisions (2026-08-10, solo session — post-close priorities):**

1. **#55 construction clock: GRIND IT OUT.** The user explicitly authorized
   continuing the bounded source-derived cycle-timing program to completion
   ("I would like to grind that out. I would like to attempt to."), knowing
   the payoff is stream-exact personality/opponent provenance, not
   playability. The existing discipline stands — only independently
   source-proven components, no fitted constants. The user wants a
   progress/opinion check-in after a few more sessions rather than an
   open-ended run.
2. **#71: playable path stays FAITHFUL — no intro-animation divergence.**
   Fact-check confirmed both sides animate in the real game only under
   Battle Scene ON; the playable OFF profile genuinely skips send-out
   intros (ISSUES #71 Slice-D record, four independent sources). Offered a
   browser-only divergence; the user chose "keep it faithful, skip intros."
   #71's remainder (§1e patch-site retirement, KABUTO/MAGBY/ONIX hand-fit
   retirements) is internal code health at filler priority.
3. **#39 stays deferred** until the items above are done (reaffirms the
   standing demotion).
4. **Pacing polish is user-driven:** the user will play on their own time;
   session traces arrive via the recorder. No worker pacing slices until
   real traces exist.
5. **S11 audio is OUT OF SCOPE for now** — see the dated note on the S11
   stage heading. The stage entry remains in the roadmap by user
   instruction; nothing schedules it.
6. **Noland is back IN scope** (reverses the 2026-07-28 ruling going
   forward; decided after a source fact-check the user requested). The
   user's rationale: deep-streak RNG-exact sequence testing (the #55
   program's payoff) reaches his silver/gold battles (final battle of
   challenge indices 2 and 5). Source facts recorded for the brief:
   Noland is NOT an invariant — `FillFactoryBrainParty`
   (`reference/pokeemerald/src/battle_factory.c:759`) RNG-draws his
   rentals live via the `GetFactoryMonId` rejection loop (no Unown, no
   species/item duplicates, and **excludes the player's current
   rentalMons**), constructs them through the same
   `CreateMonWithEVSpreadNatureOTID` path #55 models, at
   `GetFactoryMonFixedIV(challengeNum + 2)` — two IV tiers above the
   round's ordinary opponents. In-scope consequence: his party
   generation, the battles-21/42 round-loop branch, and a designed
   Frontier-Brain staging representation for the mechanic lab (the
   "not an ordinary trainer ID" schema rejection stays correct — the cure
   is a Brain-specific representation, not pretending). Sequencing: this
   work rides WITH the #55 sequence-testing program, not ahead of it.
   Unchanged: the Gate-2 tick and its close-time disposition record stand;
   symbol/BP/reward bookkeeping keeps its existing scope.

**User decisions (2026-08-13, planning session — the promised #55 check-in):**

1. **#55 grind: PARKED (supersedes decision 1 above).** After a deep audit
   of pace (~26 proven cycles per ~65-minute round) against the remaining
   surface (mixer/CgbSound at zero cycles priced, CreateMon 1.24M–2.36M
   cycles ×12 unresolved, no completion estimate recorded anywhere), the
   user ruled the remaining payoff — byte-exact stream parity for
   arbitrary seeds — is a verification capability no player can observe,
   and not worth an unbounded opaque grind now. Parked at the clean CGB4
   v44 checkpoint; all evidence stands; resumable if ever re-authorized.
2. **Distribution parity is the product bar for live generation.** Same
   candidate pools, same rejection rules, same odds as hardware — the
   ported algorithms already meet it (the filtered-ledger proof stands).
   Live generation may now wire the engine's clean RNG stream, with
   personality-exactness versus hardware documented as out of model.
   Byte-exact verification continues against captured seeds only. The
   no-fitted-constants discipline still guards anything claiming hardware
   timing.
3. **The Noland program is the main lane's next objective**, unblocked
   from #55: port `FillFactoryBrainParty`
   (`reference/pokeemerald/src/battle_factory.c:759`) with the
   `GetFactoryMonId` rejection loop, `GetFactoryMonFixedIV(challengeNum +
   2)`, the battles-21/42 round-loop branch, and the Frontier-Brain
   staging representation per decision 6 above — verified by
   pool/rules/odds receipts, not stream exactness.
4. **Rust M7c** consequently waits on the TS live-generation port, not on
   #55. The Rust charter note is updated at the next Rust supervisor
   session (lane files deliberately untouched while its round ran).

**Noland program status (supervisor, 2026-08-14):** decision-3 items are
landed through the workspace layer. `generateFactoryBrainOpponent`
(`factoryBrainOpponentGeneration.ts`) ports `FillFactoryBrainParty` with
10 Tier-1 receipts; twice-fresh mGBA ground truth exists for silver AND
gold (`tools/probe/receipts/noland-brain-party-*.json`, dossier
`docs/noland-brain-ground-truth.md`) with every draw LR-attributed, and
`tests/factoryBrainOpponentRomReceipts.test.ts` replays both ledgers
against the engine with zero discrepancies (per-mon adopted-cursor
byte-exact; whole-stream exactness is impossible because the fill spans
~28 frames and ambient VBlank draws interleave — the empirical
confirmation of the 2026-08-13 captured-seeds-only bar).
`frontierBrainStatus.ts` + the orchestrator branch schedule the brain at
battles 21/42 (symbol-gated, singles; `tests/factoryBrainRoundShape.test.ts`
drives six real wins into the battleIndex-6 brain for both shapes).
`docs/noland-brain-staging-design.md` designs the mechanic-lab staging
representation (`factoryBrain` mode; `overrides.parties` alone proven
deficient — the AI mask reads the trainer id). **Remaining, in order:**
(a) the harness-side lab implementation (USER-level: harness changes go
through the user — handoff list in the design doc §5); (b) post-brain-battle
consequences (BP/symbol/streak bookkeeping — audit doc
`docs/noland-brain-post-battle-audit.md`); (c) brain-battle presentation,
which waits on (a) for its oracle ground truth.

**User decisions (2026-08-14, planning session — the post-Brain queue):**

Status update to the remaining-list above: (a) the harness-side lab mode
is LIVE (top-layer commit `33354440`; workspace §5.2 consumers landed per
PROGRESS 1266) and (c) the brain-battle presentation program ran
end-to-end (silver 648/701, gold 700/701 dense live compares; the
residual is ISSUES #87). Only (b) remains.

1. **Next main-lane order:** (i) post-brain-battle consequences — steps
   1-3 of `docs/noland-brain-post-battle-audit.md` §5's prioritized
   worklist (award table incl. the +10 brain bonus, symbol grant and BP
   as round-controller OUTPUTS, brain congrats text). Its step-4
   prerequisite exists now, so the numbers are end-to-end verifiable
   against the real ROM. **(i) COMPLETE** (2026-08-14 eve session,
   PROGRESS 1269-1272): `applyFactoryBrainRoundOutcome`
   (`factoryBrainRoundOutcome.ts`) ports
   `GiveBattlePoints`/`GiveFacilitySymbol` exactly, wired into
   `factoryRoundBattleOrchestrator.ts` as a `roundOutcome` output;
   brain congrats text landed with its two scroll-gate ages
   live-bisected against the ROM; BP 0→14 + silver symbol flag
   live-pinned (`docs/brain-terminal-live-verification.md`).
   **(ii) COMPLETE as an evidence program** (rounds 15-17,
   `docs/trainer-pic-off-window-scout.md`): the ack model is built and
   honestly bounded — no source-predictable formula exists; ISSUES #87
   records the three fix-shape options awaiting a pick.
   **(iii) COMPLETE**: `docs/noland-walkup-dialogue-scoping.md`
   presents FAITHFUL/TRIM/SKIP with costs (recommendation: TRIM); the
   user decides before any build.
2. **Follow-on objective — continuous play.** The user's bar: boot the
   app and play round after round indefinitely, matching what a real
   Emerald player would see at distribution parity. Audited gaps
   (2026-08-14 planning session): the draft screen is built exactly
   once, at boot, from the captured anchor records (`core.ts:581` is
   the only construction site — the canonical S1 start state; live
   rental generation `factoryRentalGeneration.ts` is proven but unwired
   into any next-round entry), and the roundCompleted terminal has no
   continue path into a next round's draft (no challenge advance, no
   in-session streak carry) — so battle 21 (silver Noland) is
   unreachable by natural play. After 1(i) lands, wire both:
   generated-draft round entry + round-to-round chaining with
   in-session streak/symbol/BP carry. Cross-session persistence
   (saving) stays OUT of scope; the standing lobby trims stand
   unchanged. **WIRED (2026-08-14 eve, PROGRESS 1271-1272):**
   `factoryRoundChaining.ts` + the terminal→next-draft path are live
   (supervisor decision: continue re-enters a fresh generated draft
   directly after the record menu, no new lobby-dialogue surfaces);
   the newly-reachable generated-battle-1 crash it exposed (#88) was
   fixed at root cause same-session (vanilla soak 14/20→20/20).
   Battle 21 is now reachable by natural play. Remaining under this
   objective: #89 (pre-existing Baton Pass `openpartyscreen` gap, hit
   by full-policy soak seed 27) and distribution-parity soak breadth.

**User decisions (2026-08-14 eve, planning session — the two waiting
picks from PROGRESS 1273):**

1. **Walk-up = FAITHFUL** (supersedes the memo's TRIM recommendation —
   user pick with the costs on the table). Full sequence per
   `docs/noland-walkup-dialogue-scoping.md`'s FAITHFUL option: the
   attendant call-scene + PreBattleRoom ready/swap/retire menu, Noland
   placement/entrance in the battle room, silver 8-page + gold 4-page
   speeches gated by the per-tier heard-speech flags (in-session only —
   cross-session saving stays out of scope). Consequence accepted: the
   PreBattleRoom menu + call-scene is a GENERAL pre-battle feature
   (ordinary matches 2-6 show the same menu), so this program builds it
   once for all Factory matches, not as a brain-only fork. The memo's
   sequencing note stands: resolve its §1.6 gold-discrepancy probe
   before writing gold's disputed box. Estimated 4-6 worker steps.
   **PROGRESS (2026-08-15 supervisor session):** §1.6 probe RESOLVED
   (lab artifact; faithful gold = "Get a move on!" per decomp); script
   ground truth extracted (`factory-brain-walkup-script.json`); silver
   dense evidence banked (`noland-silver-walkup-presentation-map.md`);
   BattleRoom brain entrance BUILT + app-side staged-compare harness
   (B1/B1b, entrance window 256/256); silver 8-page speech + battle-cry
   + in-session heard-flag + handoff BUILT (B2, four speech windows
   exact). **UPDATE (2026-08-16 supervisor session):** the top-layer
   `BattleLab.prepare()` staging gap is FIXED (harness commit
   `3e29880b`, `factoryBrain` + `walkup: true` + gold symbol flag;
   services serve it) — oracle acceptance for the call-scene + gold is
   UNBLOCKED. brainMoving cadence largely closed by B1c (fixture 03
   43/256 → 162/256; bounded ~1px mid-ramp residual honestly flagged
   in battleRoom.ts). Gold ground truth REFRESHED post-fix
   (`docs/noland-brain-intro-gold-ground-truth.md`: gold has its own
   4-page speech, escort text = silver's "Get a move on!", ready frame
   1889→3370; app gold reveal compare honestly 0/701 pending gold
   presentation work). REMAINING: step A build (design memo
   `docs/walkup-step-a-design.md`; its §4 "no oracle evidence" note is
   stale — walkup staging provides it); gold entrance/speech +
   compare-trace recalibration; the B1c mid-ramp residual (next probe:
   `gSpriteCoordOffsetY`/OAM latch).
2. **#87 = option (c)**: every committed window that ends before its
   ready transition stays exactly as-is; calibrate only windows that
   must cross it (today: the silver Brain-reveal tail, 648/701), each
   constant labeled measured-not-derived and validated by the
   RAM-handshake probe. Recorded in ISSUES #87.

Order for the next runs (stability first): #89 → #90 triage → #87(c)
calibration (small) → the FAITHFUL walk-up program → chained-round
distribution-parity breadth. **#87(c) calibration DONE** (2026-08-15,
PROGRESS 1276): silver Brain-reveal 648/701 → 690/701, gold + pre-ready
windows unaffected; ISSUES #87 trimmed to a settled mechanism record.

**FAITHFUL walk-up program: COMPLETE (2026-08-17, PROGRESS-archive
1317; stale "B1 dense-compare leg queued" line corrected twice on
2026-08-19 — the second time after a read-only scout live-verified the
tree).** Every walk-up window closed to its full bar: entrance fixtures
02 AND 03 both 256/256 exact (constants RAM-measured, entries
1280/1296/1307/1308; re-verified live 2026-08-19 — 256/256 + 256/256,
differential 563/563, full suite green), speech closed both tiers
(1305/1309/1310), brain-room transition wiring closed (1315/1316,
ISSUES #98 deleted). No open walk-up work remains; M-A is the
milestone.

**User decision (2026-08-19, planning session — the next milestone):
measure play depth first; the chained-round distribution-parity program
is COMPLETE, and the #39/ladder housekeeping is DEMOTED.**

**Correction to the standing queue.** "Chained-round distribution-parity
breadth" (the last item of the 2026-08-14 eve order above) was carried as
an unstarted queue entry through the 2026-08-19 supervisor sessions and
reported to the user as untouched. It is **not** unstarted — all three
dispatchable steps of `docs/chained-round-distribution-parity-plan.md` §4
landed on 2026-08-16/17 and no one updated this line:

- **Step 1 DONE** (`96e1dd4b`): `tests/factoryRoundChaining.test.ts`'s
  "(b)" case drives four consecutive completed rounds through the real
  `tick()` path, asserting streak 7/14/21/28 and `generation.challengeNum`
  at every hop, and reaching a genuine `TRAINER_FRONTIER_BRAIN` silver
  encounter at hop 3 *by carry* — plan claims C1/C2/C3/C4.
- **Step 2 DONE**: `factoryRentalGeneration.ts:229-239` carries the
  challengeNum-8 retail-OOB rationale, citing `config.h:48` +
  `Makefile:6` (claim C6).
- **Step 3 DONE** (`6366ee33`; swept, `6d92ddf1`): the opt-in `winning`
  `SoakPolicy` exists and has been swept wide. Standing coverage
  `vanilla` 0:60, `full` 0:180, `winning` 0:180 — **all green, zero
  crashes** (`docs/soak-winning-sweep-2026-08-16{,-part2}.md`,
  `docs/soak-resweep-2026-08-16-part{3,4}.md`,
  `docs/soak-sweep-2026-08-17-part{5,6}.md`).
- **Step 4** was already marked SATISFIED by harness commit `3e29880b`.

**The gap those steps left — and why it is the milestone.** Every sweep
above reports *whether a seed crashed*. **None reports how deep it
played.** `randomRoundSoakDriver.ts:163` declares `carriedWinStreak`
("the deepest chained-streak value this run reached ... used by the soak
depth report") and `:907` populates it on every result — and **nothing in
the tree ever reads it**: not `tools/soak/randomRoundSoak.ts`, not a
test, not a sweep doc (one incidental mention of one seed's `0`;
`rg carriedWinStreak` re-run live 2026-08-19). So the honest status of
the "play round after round indefinitely" bar is **unknown**. It is fully
consistent with all 420 clean seeds that every one of them lost in round
1 — which would leave challengeNum ≥ 2 (the escalated rental tier/IV
rows, `CHECK_BAD_MOVE` AI at challenge 2-3 and the full triad at 4+, and
the battle-21 silver Brain) exercised only by step 1's scripted-win test
and never by play.

**Milestone M-A — "how deep does play actually get?"** User pick
(2026-08-19): **measure first, then scope** — deliberately one cheap step
before committing worker weeks.

**M-A MEASUREMENT COMPLETE (2026-08-19, same-day): all 3 steps landed
and verified** — step 1 `4570aa11`+`ecb2e5de` (real running-max fields
+ CLI distribution, red-verified test; PROGRESS 1354), steps 2-3
`78f11bee`/`a395d436`/`1e654c62` (`docs/soak-depth-measure-2026-08-19
.md` + committed 300-line per-seed log). **The number: play gets past
challenge 1 regularly but never deep.** `winning` 0:180 — 64/180
(35.6%) reach carry ≥ 7, 10/180 (5.6%) reach carry ≥ 14, 0/180 reach
carry ≥ 21; `vanilla` 0:60 — 16/60 / 3/60 / 0/60 (deepest anywhere:
seed 24 at battle-depth 20 = ladder battle 21); `full` 0:60 — never
completes a round (0/60 at carry ≥ 7). All 300 seeds OK, zero
CRASH/HANG. So challenge 3 is entered by ~5% of chaining-policy seeds,
and challenge 4+ (carry ≥ 21), the full AI triad tier, and everything
past ladder battle 21 remain unreached by play — exercised only by the
scripted chaining test. Per this block's own falsifiability clause the
result is between the two recorded outcomes; the follow-on scope
decision returns to the user with these numbers (DEFERRED.md D2).

1. Build real max-depth tracking, and **do not trust the field that
   already exists**. Audited live 2026-08-19, two defects, both must be
   handled or the measurement lies:
   - **`carriedWinStreak` is a snapshot, not a maximum.**
     `randomRoundSoakDriver.ts:907` reads
     `orchestrator?.config.factoryWinStreak` — the streak carried into
     whatever round is current *when diagnostics are taken*. A loss
     resets the carry to 0 (`advanceFactoryCarry`), and the sweeps show
     the large majority of seeds end on `roundLost`, so this field reads
     **0 for almost every run no matter how deep it got earlier**. Its
     own doc comment ("the deepest chained-streak value this run
     reached") is **wrong** — believe the code, not the comment. What is
     needed is a running max of the carry observed across the run's chain
     events, which does not exist today.
   - **Diagnostics are not CLI-reachable.** `diagnostics` appears only in
     the driver (`RunOptions`, `:794`); `tools/soak/randomRoundSoak.ts`
     has zero mentions, so the CLI cannot enable them even for the
     flawed snapshot. Needs an opt-in flag.
   Then print max depth per seed and as a distribution in the sweep
   summary. Still no engine change, no policy change, no new standing
   gate — but this is a driver step with a test, not a one-line print.
2. Re-run over ranges already swept (`winning` 0:180 at minimum, plus
   `vanilla`/`full` for contrast). This is a re-measure of known-green
   ground, so it needs no new crash-triage budget.
3. Report the distribution: how many seeds ever reach streak 7 / 14 / 21
   (challengeNum 1 / 2 / 3), and the deepest reached anywhere.

Falsifiable either way, recorded now so the result cannot be
rationalized after the fact: if play routinely reaches challengeNum ≥ 2,
the late-game worry is answered and M-A closes as a documented number. If
depth is shallow (the plan's own §0 / §3-gap-3 prediction), the follow-on
milestone is making deep play *reachable* — and **that** scope decision
returns to the user with the measurement in hand, not before.

**Demoted — explicitly NOT the next objective:** (a) ISSUES #39's
`battleScene.ts` canonical split (76 movable symbols left of 226; it is
refactoring, and since each landed batch is independently verified and
differential-clean, parking it mid-way costs nothing); (b) the
presentation-seam ladder's Slice 3 (`status-change`/`outcome` declared
but unemitted — the ladder doc itself records that nothing is blocked on
it, so it is a note, not work). Both remain available as filler for spare
capacity; neither is a milestone, and neither should be reported as the
next objective again.

**User decision (2026-08-19, resolving DEFERRED D2): option (b) — make
deep play REACHABLE. Milestone M-B.** Presented with M-A's numbers, the
user chose the bounded follow-on over accepting the measured depth. D2 is
answered and removed from DEFERRED.md; the next supervisor run is
unblocked.

**Milestone M-B — "the late game gets reached by playing, and survives
it."** Bar: a soak sweep observes carry ≥ 21 (ladder battle 22+, i.e. a
genuine third consecutive round win) under a policy that is still
arbitrary-but-legal play, and the depth it opens is swept for crashes.
Ordered:

1. **Find out why `full` never wins a round** (0/60 at carry ≥ 7, M-A's
   most surprising number, and folded in here from the user's third
   option). `full` is the DEFAULT policy and the one the standing
   `full` 0:180 gate uses, so today that gate's entire coverage is
   "round 1, lost, re-chained, round 1 again" — it has never once
   observed a won round. Determine whether that is the policy being
   genuinely bad, or a real defect in the win path it happens to expose.
   Cheap, read-only first: `vanilla` (plainer!) wins 27% of the time, so
   `full`'s extra exploration is doing something actively harmful —
   that asymmetry is the lead. Report before changing anything.
2. **Raise the win rate until carry ≥ 21 is observed.** Strengthen the
   `winning` policy (or add a stronger opt-in sibling) — better move
   choice, smarter switching, whatever it takes. Constraint carried from
   step 3 of the parity program: it stays *arbitrary-but-legal player
   behavior*, never an oracle for the AI, and never a guaranteed-win
   script tied to one staged scenario (that is `strong-route`'s narrow
   job). Standing `full`/`vanilla` gates and `DEFAULT_RUN_OPTIONS`
   unchanged; this lands opt-in.
3. **Sweep the newly-reachable depth for crashes**, and report the depth
   distribution again (M-A's instrument already prints it). Target:
   carry ≥ 21 observed in a sweep, ideally carry ≥ 28 (challenge 4+,
   where the full `CHECK_BAD_MOVE`+triad AI tier switches on).
4. **Triage what it finds** by the standing convention: crashes that
   block reaching deeper get fixed (otherwise step 3 cannot finish);
   everything else is filed in ISSUES.md. The soak driver still never
   fixes engine behavior.

**M-B STATUS (2026-08-20, supervisor): bar REACHED same-day, step 4 in
progress.** Step 1 DONE (PROGRESS 1357: verdict (a), `full` is honest bad
play). Driver defect ISSUES #99 found+fixed on the way (1358: the swap
offer was never answered by its own branch; every policy accepted swaps).
Step 2 landed opt-in in `winning`: type-effectiveness × STAB move choice
(1359) and swap-offer decline (fold `781c8827`); draft-by-strength measured
worse on 60 seeds and is WITHHELD on branch `worker/side-20260820-113153`
(`e9a415a7`) pending a larger sample; a walled-matchup switch heuristic is
in flight. Step 3 sweep `docs/soak-deep-sweep-2026-08-20.{md,log}`:
`winning` 0:240 → carry ≥ 7 105/240, ≥ 14 33/240, **≥ 21 1/240 (seed 99,
verified chained 0→7→14→21, battle-depth 25 = ladder battle 26)**, ≥ 28
0/240, 238 OK / 2 CRASH / 0 HANG. Step 4 triage: #100 fixed (1360); #101
(Lock-On string), #102 (switchhandleorder after a mid-round faint), #103
(CheckViability 0xFFFF sentinel) filed — fixes are the current main-lane
queue, then a re-sweep with every lever for the carry ≥ 28 stretch.

**M-B STATUS UPDATE (2026-08-20 afternoon, supervisor):** the final 0:480
sweep (`docs/soak-deep-sweep-2026-08-20-final.{md,log}`, PROGRESS 1365) is
480/480 OK with carry ≥ 21 in 5/480 (1.04%) — bar reconfirmed at 2× range —
but its "carry ≥ 28 not reached; wall at battle 7 of the carry-21 round"
reading is WITHDRAWN: the three deepest seeds stopped in the round-end
terminal with the record prompt answered YES, which the engine never
continues (ISSUES #104, engine half), and the soak driver's cumulative
post-round grace then reported them OK (#104, driver half). The depth
instrument had therefore been capped at ~3 re-chains since M-A; whether the
challenge-4 AI tier (carry ≥ 28) is reachable by play is UNMEASURED until
both halves land and a sweep is re-run. Levers folded into `winning` today:
type-effectiveness × STAB move choice (1359), swap-offer decline
(`781c8827`), true-immunity walled-matchup switch with a ≥50%-HP bench gate
(`3fa78a98`). Withheld on `wip/mb-step2b-draft-heuristic` (`e9a415a7`):
draft-by-strength (measured worse at n=60; re-measure at n ≥ 180 on the
fixed tree before deciding). Refuted and pinned: the #102-derived
end-turn-skip lead (`tests/endTurnFaintResumeIssue104.test.ts`).

**M-B RESULT on the #104-fixed tree (2026-08-20 15:05, supervisor's own
run, `winning` 0:60 `--render-every 0`, master `e3176a05`):** carry ≥ 7
**60/60**, ≥ 14 **56/60**, ≥ 21 **13/60**, **≥ 28 1/60 (seed 24, battle-depth
28 = challenge 4, the full `CHECK_BAD_MOVE`+triad AI tier, reached by
play)**; 58 OK (`budget`) / 2 CRASH (seeds 40 + 50, both ISSUES #105, the
Conversion/Color-Change type-name string — being fixed) / 0 HANG. Compare
the same morning: 35.6% / 5.6% / 0% / 0%. The milestone's bar AND its
stretch target are met; step 4 continues as crash triage at the new depth.

Acceptance: a committed sweep log showing carry ≥ 21 reached by play,
with the crash outcome at that depth stated honestly (including "we got
there and it broke, here is the issue number"). Explicitly NOT in scope:
oracle-backed evidence for what a player sees on a genuinely-chained deep
arrival (that is the parity plan's C5, still gated on trace cost, not on
this milestone); cross-session saving; the Open level rule set.

**User scope decision (2026-07-23):** S8's finite controller gates prove the
round/presentation architecture but do not complete the mission's arbitrary
single-battle rules breadth. S9 remains the bounded deferred interface stage.
S10 explicitly owns the source-derived battle system, trainer/opponent corpus,
and the parameterized oracle needed to develop them. Checking S9 must not be
interpreted as claiming these mechanics complete.

**User scope decision (2026-07-28):** with the move-effect census closed at
100%, the next objective is **held-item and ability parity**, driven by a
census-generator worklist mirroring the move census (hook tables + carrier
weighting + named-barrier cross-reference). Clarified standing scope:

- **Trainer AI in general — including the native switch decision module and
  `battle_ai_switch_items.c`'s item branch — is IN scope.** It need not land
  in the item/ability milestone, but Gate 5's AI acceptance (switch/item
  selection, challenge-policy branches) is a real commitment, not a parked
  remainder. (Factory trainers carry no usable Bag items, so the item-use
  branch is expected to close as a source-faithful proof of its no-op shape
  rather than deep behavior.)
- **Doubles and the Open-level rule set remain OUT of scope.**
- **The browser Battle Scene ON/OFF selector is OUT of scope** (user
  decision, 2026-07-30). The playable browser path stays Battle Scene OFF;
  Scene ON is proven by the animation lane, not exposed as a player toggle.
- **Noland / Frontier Brain battles are OUT of scope for now** (Gate 2's
  explicit schema rejection stands; not a blocker for Gates 3–6).
  **UPDATE (user decision 2026-08-10): Noland is back IN scope** — see item
  6 of the S10-close "User decisions (2026-08-10)" block and the addendum
  in `docs/gate2-noland-scope-note.md`. The Gate-2 tick is NOT reopened;
  this is forward scope.
- **Audio is its own later milestone — S11**; no S10 gate includes it.

**User ordering decision (2026-07-30):** work the remaining program in this
order — **Gate 5 first, then ISSUES #39, then Gate 6.** Gate 5 is the
headline: it is what makes a real generated Factory run possible, so it leads
even though #39 is older debt. #39 is not getting worse (AGENTS.md already
forbids new turn-keyed branches), so its slices fill gaps around Gate-5 work
rather than blocking it. Gate 6's breadth sweep depends on Gate 5 landing
first and follows it.

**User ordering decision (2026-08-08): S10 closure is the headline.** Work
the S10 remainder in this order, ahead of everything else:

1. **Burn down the ten remaining bucket-A barriers** in
   `docs/barrier-reachability-triage.md` (A3–A12; A1/A2 were retired
   2026-08-08 by the completed AI scoring stack). Each is small and bounded.
2. **Resolve the single bucket-B item** under the widened 2026-08-05
   full-parity scope, and confirm the bucket-C/D citations stand as the
   "prove unreachable" record.
3. **Assemble the Gate-6 close-out artifacts:** the mechanics coverage
   manifest, at least one parameterized-oracle semantic trace per distinct
   effect/hook family, the interaction-focused pairwise/property tests, and
   multiple seeded end-to-end Factory rounds. Gate-4 semantic verification
   rides this same worklist — the ability/item census's "engine-referenced"
   is not "verified". Record Gate 2's checkbox disposition explicitly: its
   only remainder is the two Noland items, which stay out of scope by the
   2026-07-28 ruling.

**Soak + evidence policy (user-directed 2026-08-09; gate set extended by
user decision 2026-08-22):** `npm run soak`
(`tools/soak/randomRoundSoak.ts` — seeded random legal play through the
production path, full rounds) is the standing instrument for Gate 6's
"multiple seeded legal Factory rounds run end-to-end" clause. Every
supervisor wind-down runs all four gates and records each count:
- `npm run soak -- --policy vanilla --seeds 0:20` — must stay **20/20 OK**;
- `npm run soak -- --seeds 0:60` (the `full` policy) — record the count;
- `npm run soak -- --policy winning --seeds 0:60` — record the count;
- `npm run soak -- --policy winning-swap --seeds 0:60` — record the count.
- **Fifth gate (varied-RNG crash coverage, user decision 2026-08-24, shape
  pinned in SUPERVISOR.md the same day):** `npm run soak -- --policy winning
  --vary-rng --first-round --start-carry {0,14,28} --seeds 0:100
  --render-every 0` (three sweeps) plus `--policy winning-swap --vary-rng
  --first-round --start-carry 0 --seeds 0:100 --render-every 0` — record
  all four counts; each must stay 100/100 OK (`budget` counts as OK). The
  four gates above stay UNVARIED.

Opt-in, NOT a gate: `--policy oracle-strength` (same as `winning` except the
fight slot, which the engine's own Factory AI scorer picks for the player) —
the lever-2 measurement instrument of
`docs/soak-policy-strength-scout-2026-08-23.md`; see that doc's "Result".
Opt-in, NOT a gate: `--policy winning-coverage` (same as `winning` except the
draft, which rents the coverage-first 3-of-6 instead of a random 3-of-6) — the
lever-4' measurement instrument of the same doc; see its "Result — lever 4'".

ISSUES #85 tracks the current crash wall. Receipt hygiene (ADVISORY —
user-clarified 2026-08-09: worker TIME is the constraint, repo weight is
not): prefer committing the staged scenario + probe/verify script +
compact assertion block; a dump that is expensive to regenerate MAY be
committed as-is. Never spend a worker step regenerating or slimming an
existing receipt for hygiene alone.

**Semantics update (2026-08-20, ISSUES #104 retune, PROGRESS 1368):** under
continuous play a soak run never ends by itself (every round re-chains), so
the per-seed outcome is now: **OK** = the frame budget (`DEFAULT_MAX_FRAMES_BY_POLICY`)
is reached while the run is still progressing (`endState: "budget"`), or
`--max-rounds N` round decisions were observed, or the lobby was reached;
**HANG** = no progress (round identity / battle index / turn / input surface /
round phase) for `--stall-frames` (default 30,000) frames; **CRASH** unchanged.
The standing gates therefore read "no stall and no crash within the budget".
Every pre-#104 sweep's "OK" was a cumulative-grace artifact (the run stopped
after ~3 re-chains) — compare depth numbers only within one semantics era.

**Gate coverage note (2026-08-22, resolved by user decision 2026-08-22 —
closes ISSUES #116):** `vanilla` draws no RNG of its own and the engine RNG
advances only on draws, so every `vanilla` seed replays ONE trajectory
(240/240 identical end states, `docs/soak-full-vanilla-0-240-2026-08-22.md`);
the "vanilla 0:20 = 20/20" gate is a single-trajectory smoke — kept
deliberately as a rigid canary (any change in its result means engine
behavior changed). The seed-diverse deep coverage comes from the two gates
added by the same decision: `winning 0:60` and `winning-swap 0:60` (the only
policies that win rounds and exercise the post-win swap screen). Baseline on
the 2026-08-22 tree: winning 0:480 = 480/480, winning-swap 0:360 = 359/360
(the one crash was #119, fixed at `d41bc58c`), so both 0:60 gates start
green. `vanilla` itself stays unchanged (option (b)'s seed-backed draft was
declined).


**Gate-6 evidence granularity + sequencing (user decision 2026-08-09):**
the 561-item per-move hook-gap census (300 item + 261 ability) is NOT to be
closed gap-by-gap. Re-group it into effect/hook families; each family gets
ONE deterministic parameterized-oracle receipt on a representative member,
and siblings get Tier-1 batch checks against the same table data. A full
receipt for a sibling is authored only when its batch check or the soak
finds a divergence. This is gate 6's own written standard ("every distinct
effect/hook family has at least one deterministic parameterized-oracle
semantic trace; table siblings are batch-checked") and leaves the
2026-08-05 all-Gen-3 implementation-breadth ruling untouched. Ordered
sequencing: (1) ISSUES #85 until seeded soak rounds complete end-to-end,
reporting completions/60 at every wind-down; (2) the family-level Gate-6
worklist; (3) close-out assembly — manifest, interaction tests, the soak
as the seeded-rounds artifact, the Noland scope note — then tick gates
2/3/4/6; (4) a short "playable round" user-polish milestone (#71, #73,
session-trace-driven pacing fixes) before S11 audio is scheduled.

**ISSUES #39 and the animation lane are demoted to filler** until S10's six
gates are checked. The audited `turn10OnixDarkPalette` Family-F slice is
deferred, not canceled; entry 1024's named-next-owner handoff is overridden
by this decision.

**#39 rank-7 completion (2026-08-01, `1f276c95` + `c0821a65`):** the
opponent-owned locked action now retains one immutable charge/strike
resolution identity through its genuine intervening command and owns the
published forced selector through send-out. The exact renderer's
`turn14Resolved` and `turn15PartySelect` mirrors are deleted; all ordinary
and delayed historical pins held by differential replay. Rank 8 is next.

**#39 rank-8 completion (2026-08-01, `d410cfe5`):** the source-derived
MAGBY/MURKROW Scene-OFF full turn is an immutable generic resolution whose
commands own both HP changes, FIRE PUNCH PP, burn/status-icon sequencing,
residual damage, and the next command. Its compatibility presentation owns
the confirmation-relative redraw edge until the existing typed terminal owner
takes over. `turn16Resolved` and the old submenu redraw mirror are deleted;
all requested Turn-16/Turn-17 rungs and delayed-input insurance are
byte-identical to clean `60acda9c` (**2,163 captures**). Rank 8 is closed;
continue only with earlier #39 mirrors, never a canonical Battle-2 march.

**#39 rank-3 mirror follow-up (2026-08-01, `88fd05f6`):** the
`turn5KoDismissElapsed` census found one producer and only its own one-shot
guard as a reader; render, continuation, PP, and requests never consumed it.
The dead field/branch is deleted while the immutable staged KO→switch-in→
Sitrus→next-command lifecycle remains authoritative. All rank-3 and insurance
pins plus +30 delayed-dismiss variants are byte-identical to clean
`7d65832d` (**3,505 captures total**). Its remaining predecessor is now
retired (`73cb7455` + `891a44d7` + `97de11a4`): the typed completed-turn-5/
next-command handoff owns PP **[6,20,19,10]**, persisted slot 0, and the
existing settled/ready boundary facts, while the adapter continues to own
switch/Sitrus content. Clean-`feffce4c` app replay held **1,742/1,742**
requested rank-3 and boundary-insurance captures byte-identical.

**#39 rank-2 predecessor checkpoint (2026-08-01):** the analogous
`turn13Resolved` mirror cannot yet retire. Its existing FLY owner represents
the already-completed following charge (DRAGON_BREATH **17/20**), not the
post-turn-13 next-command boundary (**18/20**), and does not own that
boundary's redraw readiness or persisted slot. The adjacent opponent-faint
dismiss edge remains live in cursor freeze and switch-in continuation. The
bounded census and Tier-1 proof are in
`docs/rank2-turn13resolved-predecessor-audit.md`; no runtime behavior changed.

Build the rules engine from the pinned source's actual structure: generated
tables plus a typed Battle Script IR/interpreter and source-mapped item,
ability, end-turn, AI, and switching hooks. Do not grow a collection of
move-name, battle-number, turn-number, or canonical-tick branches. Battle
logic/RNG emits semantic events; Scene-OFF and Scene-ON presentation consume
those events without owning outcomes.

**Testability architecture decision (2026-07-24):** before substantially more
Gate-3 opcode breadth, publish one battle-level decision-boundary contract.
After initialization, an immutable, serializable `BattleState` owns the RNG
state; submitting one currently requested player or trainer decision returns
the next state, ordered semantic events, and either the next decision request
or a terminal outcome. The protocol may collect both singles commands before
resolution and may request a voluntary or forced switch. A headless runner can
auto-acknowledge presentation-only barriers, but those acknowledgements may
never change rules state or consume RNG.

The native Emerald trainer AI is a separately unit-testable, injected policy
module. It consumes a source-faithful battle view/history, the kernel's legal
decisions, the selected Factory AI policy, and explicit RNG state, then returns
one legal decision, updated RNG, and an inspectable decision trace. The kernel
does not know whether a decision came from a player, Emerald AI, a test, or a
future stronger policy. Tier-1 tests may construct arbitrary validated
transient battle states for focused mechanics coverage; this does not relax
Gate 2's prohibition on injecting transient state into the stock-ROM oracle.

**Immediate vertical-composition reset (2026-07-24, user-directed):** pause
large isolated mechanic expansion. The next Gate-3 acceptance unit is one
headless executable slice: construct a validated immutable `BattleState` with
explicit RNG, submit one currently requested legal move through
`BattleDecisionBoundary`, run a real source-complete Battle Script machine
path, and return frozen rules state, ordered semantic events, updated RNG, and
the next request, barrier, or outcome. Canonical serialization must replay the
same transition. This slice must not import `core.ts`, `battleScene.ts`,
rendering, wall clock, oracle, or emulator code.

**Immediate vertical-composition checkpoint (2026-07-24):** the first unit is
implemented through a legal Level-50 Factory command, without registering
opcode 0. A validated asleep set-15 TYROGUE requests its four source moves;
submitting PROTECT slot 1 maps the real `BattleScript_EffectProtect` opcode-0
entry through the already-complete asleep admission helper into
`BattleScript_MoveUsedIsAsleep`. The production machine executes source
opcodes **16, 18, 100, 40** (print, wait, status animation, goto), safely
acknowledges presentation/controller ownership, and returns an explicit
machine barrier before unsupported `BattleScript_MoveEnd` opcode **46**.
Ordered message/status events, sleep **4→3**, unchanged PP, zero-call explicit
RNG preservation, deep freezing, and canonical replay are Tier-1 pinned. This
proves the composition contract only; move-end, later action resolution, and
the general kernel remain Gate-3 work.

**[SUPERSEDED 2026-07-24 by the Executable-frontier reset below — opcode 0
may now register under the (a)/(b) barrier policy; this paragraph is kept for
history only.]**
Opcode 0 remains unregistered until all of `Cmd_attackcanceler` is executable,
including its delegated controller/Pressure-PP/resume effects and the ordered
Snatch, Lightning Rod, Protect, and fallthrough branches. Current source
evidence proves Snatch absent from all Factory sets and Lightning Rod
redirection unreachable in singles, but both remain source-required command
semantics. If completing that command is not one bounded slice, use the
smallest already-source-complete opcode sequence among the existing handlers
to prove the adapter and enumerate this remainder explicitly; never partially
register opcode 0.

Immediately after the kernel composition is proven, add the minimal injected
Factory-AI policy boundary: source-faithful view plus kernel-provided legal
decisions plus explicit RNG returns one legal decision, updated RNG, and an
inspectable trace, then submits through the same kernel boundary as a player.

**Factory-AI vertical-composition checkpoint (2026-07-24):** the minimal
injected boundary is implemented for ordinary Level-50 singles mask **0**.
The pure policy consumes all four setup draws in move-slot order (including
illegal slots), initializes source scores at **100** and authoritatively zeros
kernel-illegal decisions, runs no scoring scripts, and consumes the final tie
draw even for one best move. Its frozen trace records the existing mask
selection receipt, before/after RNG, raw and simulated values, slot scores,
best slots, and tie selection. A generic composition wrapper submits the
resulting `BattleDecisionSubmission` through the published
`submitBattleDecision` function and advances that same kernel-owned RNG cursor
before rules execution. Canonical replay and next-request/terminal returns are
Tier-1 pinned. Masks 1/7, switching, forced switching, Tent/Open/doubles, and
their path-dependent mechanics/RNG remain explicitly unsupported.

**Source-fidelity correction (2026-07-24):** native singles AI selects only a
move slot; `OpponentHandleChooseMove` then redirects user-targeting moves to
the trainer battler. Kernel-provided legal decisions are therefore
target-authoritative: the policy returns the selected slot's exact decision,
including battler **1** for `FRONTIER_MON_PLUSLE_2`'s Wish, and rejects
ambiguous multiple decisions for one slot.

**AI-to-machine vertical-composition checkpoint (2026-07-24):** the staged
asleep production adapter now has one side-generic state creator and reducer;
the player TYROGUE route remains executable, with all request targets derived
from generated `gBattleMoves[].target`. A validated trainer-owned
`FRONTIER_MON_PLUSLE_2` state exposes Thunderbolt, Thunder Wave, and Seismic
Toss against player battler **0**, and Wish against trainer battler **1**.
With explicit seed **1**, the ordinary mask-0 policy chooses Wish, synchronizes
its four setup draws plus mandatory tie draw into the same kernel RNG cursor,
and submits through `BattleDecisionBoundary`. The existing asleep admission
helper and production machine then execute source opcodes **16→18→100→40**,
emit frozen PLUSLE message/status events, decrement sleep **4→3**, preserve PP,
and stop at the honest move-end SETBYTE barrier with RNG `0x79e39ac4 / 5
calls`. Canonical serialization replays identically. Opcode 0 remains
unregistered; this adds no move-end, mask, switch, mechanic, core, render, or
oracle breadth.

**SETBYTE vertical-composition checkpoint (2026-07-24):** source-complete
opcode **46** is now registered through one generic immutable byte-lvalue
resolver, never a `sMOVEEND_STATE` special case. Generated program,
opcode-observation, and handler-lexical catalogs mechanically pin exactly
**214** concrete starts, fixed **[4,1]** operands, **96** concrete value
spellings, and the complete **24-expression** pointer universe. Existing
source-equivalent fields are reused; the remaining explicit byte cells plus
signed `gBattleMoveDamage` and the triple-kick halfword preserve all unaffected
bytes. Every start executes in Tier 1 with no RNG, controller, or event effect,
and unknown pointer/value spellings are rejected before registration.

Both the player TYROGUE and trainer-AI PLUSLE asleep paths now execute
`BattleScript_MoveEnd`'s SETBYTE, leave `moveendState=0`, and stop at the next
honest opcode **73** `B_SCR_OP_MOVEEND` / `Cmd_moveend` barrier. Ordered
message/status events, PP, player zero-call RNG, and the AI's exact five-call
`0x79e39ac4` cursor remain unchanged. Opcodes **0** and **73** are still
unregistered. Completing opcode 73 requires all of `Cmd_moveend`'s cases,
loop/end-mode control, delegated ability/item/status/visibility/update hooks,
controller synchronization, script handoffs, and every reachable state/RNG
effect; no individual move-end case is implemented by this checkpoint.

**MOVEEND source-boundary checkpoint (2026-07-24):** opcode **73** remains
unregistered. A regenerable pinned-source receipt now enumerates all **17**
executable cases plus sentinel, all **24** assembled sites, fixed `[1,1]`
operands, end modes **0/1/2 = 6/4/14**, wrapper families, and each case's
verbatim body plus call/global/mutation/controller/return/script-target
candidates. It records the exact missing durable item/special/protect/history/
doubles state and effect delegates; the staged player/AI barrier is unchanged.

**MOVEEND battler-metadata dependency checkpoint (2026-07-24):** dependency
step 1 adds source-shaped durable metadata to the existing four frozen rules
battlers: `u16 item`, all eight signed `s8 statStages`, SpecialStatus's
sprite-restoration bit and signed physical/special damage, and ProtectStruct's
charging bit. Construction strictly validates widths/cardinality and freezes
nested values; unrelated immutable updates retain identity. The staged real
Factory sets derive held items and neutral stages, and canonical player/AI
replays preserve them. Opcode **73** remains unregistered and no move-end case
or delegate is implemented.

**MOVEEND choice/change dependency checkpoint (2026-07-24):** dependency step
2a extends that same immutable rules owner with `gChosenMove`, four `u16`
choice/change-item cells, the separate BattleStruct absent mask,
`dynamicMoveType`, and four Enigma hold-effect bytes. Source-shaped pure
reducers pin Choice Band assignment, failed Baton Pass's early exit,
stale-choice clearing, and changed-item copy+clear through an explicit future
topology count dependency. Generated numeric item data resolves normal,
implicit-none, and Enigma effects; the exact `GET_MOVE_TYPE` expansion covers
generated types and masked dynamic Normal. Widths, both absent masks, recursive
freezing, SETBYTE identity, canonical replay, and both existing player/AI
verticals are Tier-1 pinned. Move history/topology/controllers/delegates remain
absent, and opcodes **73** and **0** remain unregistered.

**MOVEEND history dependency checkpoint (2026-07-24):** dependency step 2 is
complete. The same frozen rules context now owns six independent four-battler
history arrays and BattleStruct's exact 16-byte `lastTakenMove` plus 32-byte
`lastTakenMoveFrom` buffers. Pure state-14/state-15 reducers normalize
`MOVE_UNAVAILABLE`, perform the source attacker/target swap before indexed
writes, apply both absent masks and the exact hit/result/effect gates, resolve
dynamic resulting types and generated Mirror Move flags, and serialize packed
history in source little-endian `[target][attacker][byte]` order. Widths,
freezing, identity, canonical replay, and existing player/AI verticals are
Tier-1 pinned. Topology, controllers, delegates, loop/end-mode dispatch, and
opcode registration remain absent; opcodes **73** and **0** are unregistered.

**MOVEEND topology dependency checkpoint (2026-07-24):** dependency step 3 is
complete. The frozen rules context now owns exact `gBattlersCount`,
`gBattleTypeFlags`, and all four source `gBattlerPositions`, including the
singles inactive-slot `0xFF` values. An assignment audit of
`battle_controllers.c:149-581` found every active count assignment is exactly
`2` or `MAX_BATTLERS_COUNT` (4), while `battle_main.c:157`'s zero is only the
pre-init value; the immutable count is therefore typed and runtime-validated
as `2 | 4`, and `BATTLE_TYPE_DOUBLE` is required iff the count is 4. Active
positions are range/uniqueness validated; source-shaped position lookup scans
only `i < gBattlersCount`, returns the count sentinel, and composes
`BATTLE_PARTNER` by position rather than battler-id parity. The exact
nine-ProtectStruct-bit
`WasUnableToUseMove` predicate adds only `targetNotAffected` and
`flag2Unknown`; state 13 is cardinality-pinned, and state 16 returns a typed
partner replay/advance result after all exact gates and HP lookup. The replay
result deliberately leaves `MoveValuesCleanUp`, effect-script push, and the
`BattleScript_FlushMessageBox` jump for the later transfer step. Production
Factory player/AI states explicitly carry legal Level-50 singles topology.
Controllers, delegates, loop/end modes, and opcodes **73/0** remain absent.

**MOVEEND controller dependency checkpoint (2026-07-24):** dependency step 4
is complete without registering opcode 73. A generic `controller-return`
machine directive atomically commits one frozen rules mutation, one
battler-scoped semantic controller event, and exactly one active pending
battler while preserving the current instruction PC and call stack.
Acknowledgement remains scheduler-only, and a pre-existing controller flag
identity-blocks before rules reads. The source-shaped status-data event carries
the raw post-clear `u32 STATUS1`; sprite visibility now carries both boolean
values. Single-case ownership for states 1 and 8--10 pins every source gate,
state/status/status3/special-status write, active battler, event order, zero
local RNG, and replay. State 1's separate `call-current` control pushes opcode
73's current PC before transferring to `BattleScript_DefrostedViaFireMove`, so
the script's return resumes the same instruction. The 17-state/end-mode loop,
delegates, cleanup, Factory continuation, and opcodes **73/0** remain absent.

**MOVEEND delegate extraction checkpoint (2026-07-24):** dependency step 5 is
not implemented, but its source surface is now mechanically pinned before API
design. The committed receipt covers exactly the four requested
`AbilityBattleEffects` modes and two requested `ItemBattleEffects` modes,
recording **7** `Random()` sites, **2** controller emissions/pending marks,
**42** script-transfer candidates, and **4** loop sites with source ranges and
text hashes. Mutation facts remain explicitly lexical candidates rather than
alias-analysis claims. No delegate semantics, RNG draw, controller request,
script transfer, production handler, or opcode registration was added.

### Executable-frontier reset (2026-07-24, user-directed)

**Why.** A survey between supervisor sessions found the kernel's *executable*
frontier is not moving in proportion to its output. As of `856b3b4`: **28 of
249** topology opcodes are registered, and the registered set is dominated by
the trivial print/wait/goto family. The entire executable surface is "a mon
that cannot act does not act" (asleep TYROGUE; asleep AI PLUSLE). **No move
resolves damage.** `roundController.ts` still consumes injected
`CompletedBattle` fixtures, so Gate 5's "consumes real battle outcomes" has no
path to being exercised. Meanwhile ~5,000 lines of correct, Tier-1-pinned
`Cmd_attackcanceler` phase logic sit unwired. The bottleneck is not
implementation throughput — it is the **registration gate**.

**1. Registration policy — supersedes "never partially register opcode 0".**
The old rule's purpose was sound: a half-implemented opcode silently produces a
plausible wrong outcome. That guarantee is preserved by a cheaper mechanism.
An opcode **may** be registered when every source branch is either

- (a) implemented source-completely, or
- (b) guarded by an explicit precondition that halts the machine with a new
  `unsupported-branch` `BattleScriptHaltReason` naming the source construct,
  file, and line — never falling through, never defaulting.

Each (b) guard must be proven reachable by a Tier-1 test that drives the
machine into the barrier. A branch that cannot be *reached* under the current
scope (Level-50 singles) is still a (b) guard, not an omission. Silent
fallthrough on any unimplemented branch remains prohibited, and that
prohibition — not opcode-level all-or-nothing — is the invariant workers are
held to.

**2. Next acceptance unit: opcode 0, then one damaging move end-to-end.**
Not another `Cmd_moveend` dependency step. Ordered:

- **(i) Register opcode 0** by wiring the fifteen existing phase reducers in
  `battleScriptActionAdmission.ts:1208-3686` (flags, asleep, frozen, truant,
  recharge, flinch, disabled, taunted, imprisoned, confused, paralyzed,
  in-love, bide, thaw, PP) plus `battleScriptAttackCanceler.ts`'s loop and
  `battleScriptMagicCoat.ts`. Snatch (absent from all Factory sets) and
  Lightning Rod redirection (unreachable in singles) are legitimate (b)
  barriers with their existing source evidence cited.
- **(ii) Register the standard hit chain.** Mechanically derived from the
  committed program, `BattleScript_EffectHit`'s linear path needs **sixteen**
  more opcodes on the hit branch — `accuracycheck`, `attackstring`,
  `ppreduce`, `critcalc`, `damagecalc`, `typecalc`, `adjustnormaldamage`,
  `attackanimation`, `effectivenesssound`, `hitanimation`, `healthbarupdate`,
  `datahpupdate`, `critmessage`, `resultmessage`, `seteffectwithchance`,
  `tryfaintmon`. **[Corrected 2026-07-24, supervisor source-verified:** the
  miss branch needs **no** extra opcode — `accuracycheck`'s miss jump targets
  `BattleScript_PrintMoveMissed` directly (`data/battle_scripts_1.s:244`),
  skipping the `orbyte`-bearing `BattleScript_MakeMoveMissed` label, which
  only Swagger/Flatter's Substitute-block path reaches.**]**
  (`waitanimation`, `waitstate`, `waitmessage`, `pause`, `goto`, `end`,
  `setbyte` on that path are already registered.) With opcodes 0 and 73 that
  is **eighteen registrations for a complete damaging move**. `damageCalc.ts`
  is already a bit-exact port and should be consumed, not rewritten.
  Executable ground truth for this step: `tools/probe/verify-hit-chain-ground-truth.ts`
  + `docs/hit-chain-ground-truth.md` (hit = exactly 4 attributed `Random()`
  rolls — accuracy, crit, damage-adjust, effect-chance; miss = 1).
- **(iii) Register opcode 73** (`moveend`) — the existing dependency ladder's
  steps 1--4 are banked and step 5's receipt is committed; finish it under the
  policy above rather than continuing to build prerequisites ahead of a use.
- **(iv) Close the loop:** one legal Level-50 Factory battle runs to a real
  terminal outcome through `submitBattleDecision`, and `roundController.ts`
  consumes that outcome instead of a fixture.

**Opcode-73 registration checkpoint (2026-07-24):** step (iii) is complete.
`Cmd_moveend`'s do-while state loop, `moveendState` increment semantics, and
`endMode`/`endState` postlude (all three assembled forms) are source-complete
— that is the opcode. States 0, 6, 7, 13-16 are source-complete (mostly by
reusing the already-banked dependency-ladder reducers); states 1 and 8-10
reuse the already-tested controller dependency step directly. Seven states
carry a narrow `unsupported-branch` barrier gated on their own real trigger
(named abilities/hold-effects/doubles-only paths), each with a reachability
and pass-through test. The staged plain-hit integration scenario now runs
through `moveend` to the script's own `end` with the banked 4-roll RNG ledger
unchanged. Registering opcode 73 turned out to be global: it also changed
`factoryBattleScriptDecision.ts`'s staged asleep-move adapter, which had been
using the unregistered opcode as its own stopping checkpoint — that adapter
now runs its committed player/AI routes to genuine script completion instead
(fixed minimally, no new shared boundary type). Opcode **0** remains
registered; step (iv) is next, blocked on ISSUES #42
(`checkteamslost`/party-HP modeling) for a *real* terminal outcome.

**Step (iv) completion checkpoint (2026-07-25, supervisor-verified):**
step (iv) is complete, in three verified parts. (1) `BattleScriptRulesContext`
gained the Option-A party-HP slice (`{species,isEgg,hp}`×6 per side +
`partyIndex`), `datahpupdate` write-through, and registrations of
`jumpifbyte`/`getexp` (Frontier short-circuit)/`checkteamslost` — a real
`battleOutcome` 0→1 is computed from the party sum (ISSUES #42 closed).
(2) The `HandleFaintedMonActions` orchestration equivalent (scheduling
logic, not an opcode), the genuine `BS_FAINTED` selector role (ISSUES #43
closed), and the first real end-to-end terminal boundary through
`submitBattleDecision` (`{kind:"terminal", outcome:"player-win"}`, RNG
ledger pinned at 4 rolls). (3) The pure `BattleResolution` adapter
(`battleResolutionAdapter.ts`) with facility-verified outcome mapping
(draw→loss, `docs/battle-resolution-adapter-ground-truth.md` §4) and a
zero-fixture win+loss integration proof through `resolveRoundBattle` —
`roundController.ts`'s API untouched. Suite 191 files / 2263 tests at
`eee7129`. **Per §3's hard ordering constraint, the next battle-lane brief
is the presentation-seam checkpoint** — evidence pack:
`docs/presentation-seam-scout.md` §7 (ordered 4-step plan, `turn5-faint.json`
re-pinned live at 110/110).

**§3 presentation-seam checkpoint: PASSED (2026-07-25, supervisor-verified
live).** `turn5-faint.json` matches **110/110** with the fainted branch
re-driven from real kernel events: `battleStringResolver.ts` (gap 5,
`STRINGID_TARGETFAINTED` with source-faithful nickname splice),
`presentationEventWindowBridge.ts` (gap 7, `sourceLabel:
BattleScript_FaintTarget` + `hp-change{to:0}` instead of turn booleans), and
a staged real KO hit chain (`turn5FaintPresentationStaging.ts`); the
`TURN5_FAINTED_LINE1/2` literals are deleted. 22 turn3-6 regression traces
unchanged. Suite 194 files / 2276 tests at `7f27094`. Kernel breadth past
(iv) is now unblocked. Known adjacent gap surfaced by the checkpoint:
`Cmd_ppreduce` barriers on `MOVE_TARGET_BOTH`/`OPPONENTS_FIELD`/
`FOES_AND_ALLY` Pressure counting (`battleScriptHitChainOpcode.ts:679-697`),
blocking ROCK_SLIDE-class moves from the hit chain — next registration
slice's first rung.

**Leverage, so this is not mistaken for one move's worth of work:** **69 of
197** `BattleScript_Effect*` scripts reach that shared hit chain, covering
**155 of 355 moves (44%)** — including every `setmoveeffect`+`goto` status-hit
wrapper. This is the roadmap's own "shared effect scripts are the
implementation unit" principle applied to its highest-value target.

**Session checkpoint (2026-07-25 evening, supervisor-verified):** the
executable frontier moved **53→73/214 effects, 105→152/355 moves, 77→118/276
Factory-L50** in one session (census self-checks 17→25, support set now
mechanically derived from the engine dispatch — ex-ISSUES #44). Landed and
live-verified: forced-switch §4 slice 10 (the player-side forced-switch
decision request through `submitBattleDecision` — §4's list 1-10 is
complete); MOVE_EFFECT_CONFUSION/FLINCH in the SetMoveEffect dispatch, both
feeding the existing canceler reducers; screens/weather setters + the
complete `DoFieldEndTurnEffects` field loop (F2-F5, F7-F10) +
`TRYCASTFORMDATACHANGE` (source-complete non-Castform gate; a genuinely
fielded Forecast Castform is the one named barrier — Castform has 2 real
rental entries, so the form-change table is a real future step; runtime
weather-form loop also still needs `addbyte`/`jumpifbytenotequal` widened
past their `gBattleCommunication`-only modeling); the Factory-AI
move-selection port (CheckBadMove + TryToFaint full, CheckViability as
source-complete table + named handler barriers, masks 0/1/7 dispatched per
`GetAiScriptsInBattleFactory`, all three banked scenario ledgers reproduced
at their instrument-attributed 11/11/13 policy draws — the older 15/15/17
window totals are now proven to bundle two non-decision draws); and the
full-turn reducer consuming the real mask-7 policy for the trainer side plus
the non-terminal forced-switch full-turn variant. Presentation-seam
retirement continued: `turn1-rockslide.json` (window 2) re-driven from
kernel events at its recorded **256/256**, first production
`stat-stage-change` emission proven. Gate-5's "AI returns only a
kernel-enumerated legal decision and enters through the same submission
boundary" is now demonstrably true for ordinary L50 singles move selection;
switch/item AI, entry-hook breadth, and the CheckViability handler bodies
remain the named remainder.

**3. Presentation seam checkpoint — required before kernel breadth past (iv).**
The kernel currently has no consumer. `battleScene.ts` is 17,056 lines (30% of
`src/engine`) whose `BattleSceneState` is keyed to the *one canonical battle*:
74 declaration lines name a specific turn (`turn13Resolved`,
`turn15PartySelect`, `turn17KoDismissElapsed`), 969 lines reference a turn
number, and it reads HP out of committed RAM dumps
(`battleScene.ts:651-653`). Nothing in it can consume a semantic event.
Before growing the kernel beyond (iv), one **already-exact** presentation
window must be re-driven from kernel semantic events rather than turn-N state,
with its committed trace still passing at its recorded count. Any window
qualifies; pick the smallest. Discovering the seam does not fit *after* the
kernel lands is the expensive outcome this checkpoint exists to prevent.
**This is a hard ordering constraint, not a preference.** Once (iv) lands, the
next battle-lane brief is this checkpoint. Registering further opcodes is
cheaper and more legible than proving the seam, so the failure mode is drift:
opcode 44, 45, 46 all pass the executable-frontier gate individually while the
question of whether *anything* can consume them stays unasked. If the
checkpoint fails, that is a finding worth more than the opcodes it displaces.

**4. Overfit containment.** AGENTS.md already forbids *new* battle/turn/tick
branches. Additionally: **no new production import of a canonical recording.**
Engine modules must not read `src/data/gen/*-ram-dump.json`,
`*-probe.json`, `*-watch.json`, or `*-boundaries.json` at runtime; those are
dev-time evidence for tests and extractors. Existing violations are tracked as
ISSUES #39--#41 and are not grandfathered into new code.
**Enforced, not advisory:** `tests/executableFrontierRatchet.test.ts` pins the
exact allowlist of existing recording imports (four, across two modules) and
fails on any addition; the allowlist may only shrink, and a retired entry must
be deleted from it so the win is recorded. The same file pins the per-module
`unsupported-branch` barrier counts from §1 — that policy is safe only while
barriers stay narrow, and an opcode that is mostly barrier is registered on
paper and inert in practice. Raising a pinned count is a decision the brief
must justify, not a formality.

S10 has six ordered completion gates:

1. [x] **Complete Factory corpus:** mechanically extract and validate all 300
   Frontier trainers (name, facility class, all three Easy Chat speeches,
   eligible mon sets, and AI flags), all 882 Frontier mon sets with the 850
   Level-50-eligible boundary preserved, all relevant species base
   stats/types/abilities, held items, moves, trainer classes, and presentation
   lookup tables. Generated-data tests enumerate every trainer and legal set;
   no runtime dependency on `reference/`, the ROM, or the oracle is added.

   **Completion (2026-07-24, supervisor-verified):** deterministic generated
   catalogs enumerate all **300** ordinary Frontier trainers, **882** mon sets
   (Level-50 indexes **0–849**, Open-only **850–881**), **411** real species,
   **63** Frontier held-item rows, **355** moves, **82** Facility Class
   presentation rows, and **25** natures. Every trainer joins to its three
   six-word speeches, expanded eligible-set list, class, trainer picture,
   front-picture coordinates, and display class; every set joins to source
   species stats/types/two ability slots, nature, held-item indirection, four
   move records, and the exact six-bit EV-spread constants. The source
   `BattleFrontierTrainer` record has no per-trainer AI field: the separate
   generated Factory AI policy preserves all 13 named masks and all five
   challenge/level/Frontier-Brain branches of
   `GetAiScriptsInBattleFactory`, rather than fabricating flags on trainer
   rows. Noland is not one of `gBattleFrontierTrainers`' 300 ordinary rows and
   remains explicit Gate-2/Gate-5 work. Isolated extractor tests reproduce
   each core artifact byte-for-byte; production has no `reference/`, ROM, or
   oracle dependency. Supervisor reran the focused joins/regeneration tests,
   the full **97-file / 1383-test** suite, and the production build.

2. [x] **Parameterized battle oracle:** extend the existing deterministic
   stock-ROM mGBA service additively (the canonical `/v1/run` contract and its
   ON/OFF anchors remain unchanged) with a semantic battle-lab scenario
   contract. A request selects trainer ID, player/opponent Frontier set IDs,
   rental-swap count, level, seed, and scene profile; the oracle restores a
   clean pre-battle checkpoint, lets the real source initialize both parties
   and battle controllers, and returns the resolved roster plus pixel and
   semantic state/RNG captures. `factoryLegal` rejects impossible Factory
   compositions and follows the source's rental-rank candidate bands.

   A separate explicit `mechanicLab` mode must provide a complete **pre-battle
   Pokémon builder**, not a live battle-state editor. Per party Pokémon it can
   select species, level, nature, six IVs, six EVs (including legal per-stat
   and total bounds), moves, PP Ups, held item,
   species-valid ability slot, friendship, and mechanic-relevant personality
   properties such as gender or shininess. The stock ROM's Pokémon
   construction path must derive types, ability, stats, max HP, gender,
   maximum/current PP, and the battle-ready structures before normal battle
   initialization.
   Action plans/controller input may then select moves, items, or switches.

   Neither mode may inject transient battle state: HP damage, permanent
   status, volatile effects, stat stages, weather/timers, side conditions,
   delayed effects, faint state, or outcomes must arise from actual
   ROM-executed moves, items, abilities, switching, and end-turn processing.
   Captures still expose those values read-only so tests can assert the
   consequences. Raw addresses and structure flags are implementation details,
   never trace ABI.

   **Battle-lab v1 groundwork landed (2026-07-23, umbrella harness
   `56c21c5`, hardened through `19eeb4b`):** additive
   `/v1/battle-lab/run` now stages arbitrary legal
   Level-50 trainer/set combinations through the real rental constructor and
   `FillFactoryFrontierTrainerParty`, captures typed battle state/RNG beside
   pixels, accepts source-accurate past-rental ranks and nontrivial candidate
   selection order, and keeps canonical `/v1/run` hashes unchanged. The former
   HP/status/stage/volatile/weather/side-condition injector was explicitly
   retired by user decision on
   2026-07-24. Live Scene-OFF and Scene-ON smoke traces now create Leech Seed,
   Swords Dance, confusion plus Own Tempo immunity, Choice Band-amplified
   damage, Rain Dance weather, and Perish Song counters only through real
   controller-selected ROM actions, with transient state observed read-only. A
   separate live sweep reached the action menu at both trainer-range boundaries
   across all eight challenge bands (28 regular/final-battle combinations).
   Validation also
   rejects Boolean numeric aliases, invalid source IDs, forbidden state
   fields, malformed symbol limits, and negative HTTP body lengths with
   structured errors.

   **Pre-battle Pokémon builder SHIPPED (harness `b30c5d8`, edge coverage
   `d3a0cbb`, 2026-07-24 14:10--14:18 — after this run's previous ROADMAP
   revision, so earlier entries describing it as missing are stale):**
   `overrides.parties` is now the preferred `mechanicLab` contract and
   satisfies this gate's builder requirement in full. It constructs **three
   complete Pokémon on each side** — species, level, nature, six IVs, six EVs
   (per-stat `0..255`, total `<= 510`), four moves, PP Ups, held item,
   species-valid `abilitySlot`, friendship, `gender`, `shiny`, and an optional
   exact `personality` — writing valid encrypted, checksummed Gen-3
   `struct Pokemon` records after the normal Factory constructors and **before
   `CB2_InitBattle`**, so the stock ROM derives types, ability, experience,
   stats, max/current HP, and current PP from the pinned tables. Consequences
   for this run, each previously listed as an open Gate-2 remainder and now
   **closed**:
   - **switch-in hooks are real** — Drought, Sand Stream, Intimidate, and Trace
     run at their true time rather than being retro-applied;
   - **bench construction is real** — all three persistent records per side
     survive, `state.parties.player`/`.opponent` expose IVs/EVs/PP/HP/status/
     personality/derived types/ability/`checksumValid`, active battlers carry
     `partyIndex`, and an ordinary party-menu switch reconstructs from the
     custom party;
   - **controlled opponent actions are available without injecting an AI
     result** — give all four opponent slots the same move and the Factory AI
     still executes normally against a single legal choice.
   The legacy `overrides.battlers` active-loadout form remains only for old
   traces and is mutually exclusive with `overrides.parties`; it does **not**
   replay missed entry hooks and reconstructs switches from the unmodified
   party, so new mechanic work uses `overrides.parties`. Also landed:
   `bin/oracle lab` CLI exposure (`a23f01c`), loadout staging before either
   side's first action choice (`96603ae`), type/friendship hook proofs
   (`becf6ba`), a padded-`SideTimer` decode fix (`e24c3ea`), and live Factory
   trainer-AI decision coverage (`6f62bcd`).

   **Gate 2 remainder (exactly two items):** Noland's challenge-2/challenge-5
   final battles are explicitly rejected until the schema can represent
   Frontier Brains without pretending they are ordinary trainer IDs; and the
   lab's first checkpoint sits *after* the scouting dialogue, so trainer/set
   staging controls the battle but cannot yet regenerate the attendant's
   favorite-type/style commentary (needs an earlier semantic checkpoint).
   Version 1 is otherwise bounded to Level-50 singles, challenge indices 0--7,
   and one fixed Battle Scene profile per running service. **No other Gate-2
   capability blocks Gates 3--6:** abilities, switching, entry hooks, held
   items, statuses, and trainer-AI decisions are all directly verifiable
   against the stock ROM today. Contract and examples:
   `../../oracle/BATTLE_LAB.md`; scenarios in `tools/battle-lab/`.

   **Completion (2026-08-10, supervisor):** the semantic battle-lab
   contract, `factoryLegal`, and the complete `mechanicLab`
   `overrides.parties` pre-battle builder have been live acceptance
   surfaces for weeks (2026-08-01 revision note above). The two recorded
   remainders are dispositioned in `docs/gate2-noland-scope-note.md`
   (2026-08-10): Noland/Frontier-Brain battles stay schema-rejected and
   out of scope per the 2026-07-28 ruling, and the post-scouting-dialogue
   first checkpoint stands as a documented contract bound, not a blocker.
3. [x] **General battle kernel:** replace preset-damage/action fixtures as the
   production rules path with source-derived action selection, priority/speed
   ordering, accuracy, critical hits, damage, targeting, PP, move-script
   execution, end-turn ordering, fainting, victory/loss, and deterministic RNG
   accounting. Every Gen-3 move has supported Level-50 single-battle semantics,
   including correct failure behavior for moves whose required context is
   absent; shared effect scripts are the implementation unit. Mechanically
   translate the source Battle Script command stream and referenced tables into
   a typed, inspectable IR executed by one generic interpreter. Moves select
   scripts/data; they do not each define a bespoke control path. Source-mapped
   item, ability, status, weather, targeting, switching, faint, and end-turn
   hooks read and mutate one explicit battle context, schedule further effects,
   and emit typed semantic events for messages, HP/status/stage changes,
   animations, switches, and outcomes. Tier-1 architecture tests prove that
   sibling moves sharing a source effect execute the same handler sequence,
   that event replay cannot alter rules state or RNG, and that no presentation
   consumer owns a logical side effect. The public headless transition API is
   deterministic from a complete state plus submitted decision, preserves
   every caller-owned input, carries RNG only inside the returned state, and
   reaches a next-decision or terminal boundary without a DOM, renderer,
   wall-clock, oracle, emulator, or mutable singleton.
   **Completion (2026-08-10, supervisor):** the source-derived kernel is
   the production rules path (routing flip 2026-07-30, #53); the
   executable-frontier census holds **214/214 effects and 355/355 moves
   static-executable** with the ratchets pinned; every effect/hook family
   carries family-level semantic proof per the 2026-08-09 user standard
   (gate 6 note below); Tier-1 architecture tests pin shared-handler
   siblings, replay immutability, and the deterministic headless
   transition API. Named `unsupported-branch` barriers remain
   ratchet-pinned and only shrink.
4. [x] **Persistent mechanics:** implement all battle statuses and volatile
   effects, every stat stage, weather and side conditions, multi-turn effects,
   held-item hooks, ability hooks/immunities, and their switch/faint/end-turn
   lifecycles. This explicitly includes confusion, Leech Seed, Perish Song,
   sleep/poison/toxic/burn/freeze/paralysis, screens, trapping, recharge,
   recoil/drain, berries, Leftovers, Quick Claw, Choice Band, White Herb,
   Wonder Guard/Levitate/Intimidate/Pressure/contact abilities, and the other
   source-reachable Level-50 singles cases rather than only this named sample.
   **Completion (2026-08-10, supervisor):** the ability/item parity census
   closed **69/69 abilities + 42/42 hold effects (1096/1096, 850/850
   weighted)** on 2026-07-29; statuses/volatiles/stages/weather/side
   conditions ride the closed effect census with 55/55 state rows carrying
   focused Tier-1 evidence; the per-move hook-join program (gate 6)
   supplies the semantic receipts; the interaction matrix (28 axis-pair
   rows, 6 kernel-proven + 22 oracle-receipted, 0 receipt gaps) covers the
   cross-mechanic boundaries.
5. [x] **Facility integration:** generate initial rentals and all seven real
   opponent parties through the source-exact range/retry/personality/IV/
   ability/item rules; run the native Factory AI; compute the attendant's
   favorite-type/style commentary from the generated party; render arbitrary
   trainer classes/names/speeches and arbitrary legal parties; support
   voluntary and forced switching. The round controller consumes real battle
   outcomes rather than injected results. Source-faithful AI tests independently
   cover move limitations, per-script score changes, tie RNG, battle history
   and known-information behavior, switch/item selection, and every Factory
   challenge-policy branch. Integration tests prove that the AI returns only a
   kernel-enumerated legal decision and enters through the same submission
   boundary as a player or test decision.

   **Completion (2026-07-31, supervisor-verified):** every clause was
   audited verbatim against evidence in `docs/gate5-acceptance-audit.md`
   (2026-07-30 session): six clauses discharged at audit time with checked
   citations (arbitrary trainer/party render, voluntary+forced switching,
   real-outcome consumption, single submission boundary), and the audited
   remainder landed the same session: attendant commentary verified against
   ROM ground truth across 10 `preview_report` seeds — 6 distinct favorite
   types, 6 styles, all matching, including tie/no-favorite and FLEXIBLE
   fallbacks (`tests/factoryCommentaryRomReceipts.test.ts`,
   `docs/commentary-preview-report-receipts.md`); the anchor-draft receipt
   link at the probed pre-generation cursors
   (`tests/anchorDraftReceiptLink.test.ts`,
   `docs/anchor-draft-cursor-receipt.md` — selection byte-exact, all
   setId-derived fields byte-exact, construction algorithm proven via
   filtered ledger; the ambient-VBlank stream-model boundary is tracked as
   ISSUES #55, not silently absorbed); factory-AI barrier-count ratchet
   pins for the CBM/CV modules; and a public dense arbitrary-trainer intro
   comparison via the harness pre-checkpoint capture contract — YOSHI/BUG
   CATCHER (never-rendered trainer, COMBUSKEN/POLIWHIRL/PORYGON) at
   **650/751** with every residual frame named (ISSUES #56), the
   GROVYLE-validated windows intact (**128/128**, **715/715**), and the
   species-dependent send-out delay solved at the mechanism level
   (cry-duration gate, source-cited, triangulated exactly on two
   independent species; `src/data/gen/cry-durations.json`).
   Recorded scope rulings: remaining ~70 CBM / ~55 CV AI table handlers
   behind named, tested, ratchet-pinned barriers are Gate-6 breadth work
   (entry 755); battles-3-7 per-battle opponent receipts stay declined per
   the S8 reset policy; the P..B pre-battle fade for arbitrary trainers is
   #39-class ownership work, not a Gate-5 clause.
6. [x] **Breadth acceptance:** a committed mechanics coverage manifest has no
   unsupported move/effect, status, volatile-effect, held-item, ability,
   trainer, or Level-50 Frontier-set entries. Every distinct effect/hook family
   has at least one deterministic parameterized-oracle semantic trace; table
   siblings are batch-checked, and interaction-focused pairwise/property tests
   cover weather, status, item, ability, stat-stage, switching, and immunity
   boundaries without attempting the infeasible Cartesian product of every
   team. Multiple seeded legal Factory rounds run end-to-end, selected unique
   UI windows pass pixel compare under the appropriate scene profile, and
   `npm test`/`npm run build` are green.

   **Completion (2026-08-10, supervisor):** the committed manifest
   (`docs/gate6-coverage-manifest.md`, regeneration byte-idempotent)
   reaches **296/300 source-proven per-move hook-join rows on each axis**
   across ten proven families, each family carrying at least one
   deterministic parameterized-oracle receipt (fresh 2026-08-09/10 packs:
   Shell Bell, item-move-end Cheri cure, Covet, Recycle, Role Play,
   Own-Tempo-blocked Confuse Ray; cited pre-existing receipts for King's
   Rock, Knock Off/Trick, Skill Swap, immunity-cure) plus Tier-1 sibling
   batch checks. The only remaining rows are the four dynamic-dispatch
   moves (`MOVE_ASSIST`, `MOVE_METRONOME`, `MOVE_MIRROR_MOVE`,
   `MOVE_SLEEP_TALK`) on both axes — explicit documented exception rows
   (entry scripts jump into the runtime-chosen move's script; the invoked
   move's own proven row carries the hook join), the Tickle-class
   disposition under the 2026-08-09 family-granularity decision, hardened
   by the 2026-08-10 read-only surge audit (3 defects found, all fixed
   same-session as class fixes; ISSUES #86 records the remaining
   route-certificate self-description enhancement as debt, not a gap).
   Seeded rounds: `docs/gate6-seeded-rounds-artifact.md` (vanilla 0:20 =
   20/20 OK, full 0:60 = 60/60 OK, 2026-08-10). Interaction matrix: 28/28
   rows, 0 receipt gaps. `npm test` + `npm run build` green at every fold.

The finite catalogs are exhaustively enumerable; their Cartesian product is
not. Acceptance therefore enumerates every trainer/set/move/hook and proves
each shared semantic family plus interaction boundaries, rather than claiming
quality from brute-forcing every possible three-mon team against every other
team.

**Breadth scope expansion (user decision, 2026-08-05):** gate 4's and gate
6's "source-reachable Level-50 singles cases" clauses extend beyond
Factory-reachable compositions to **all legal Gen-3 species, moves,
abilities, and held items in singles battles**. Named `unsupported-branch`
barriers whose justification was Factory-set absence (Snatch,
Castform/Forecast, non-Factory held items, and kin) become implementation
targets: each is either implemented source-completely or carries a proof it
cannot occur in any legal singles battle. `mechanicLab overrides.parties` is
the staging surface. Doubles remains out of scope (supervisor-stated
interpretation, user-uncorrected 2026-08-05).

### [ ] S10A — Playable animation integration (current main stage)

Starting checkpoint: 79 verified live adapters out of 276 accepted Factory
animation bodies; 197 accepted bodies still need integration. The recovered
fourteen-move physical batch is verified and folded. Helping Hand remains
unaccepted pending legal doubles staging. No whole-playable arbitrary-history
framebuffer exactness is claimed.

Next (2026-10-13): 236 scoped-exact + 13 faithful-random + 27 faithful-timing live adapters for the historical 276 (census
`236+13+27+0+0=276`; Smokescreen moved to faithful timing under D4) **plus Struggle 165 live** (`additionalRequiredBodies.MOVE_STRUGGLE`).
The 2026-10-12 evening session finished ISSUES #168: every Scene ON status-condition animation (PSN, PRZ, BRN, SLP, CONFUSION,
INFATUATION, FRZ, CURSED, NIGHTMARE) is presented with the ROM's controller rows (sa125), the IsBattleSEPlaying wait after a neutral hit
(seg127 / sag130 / gaf140) and its drawing (sar131 / sad133 / sae135: 88 dense ROM windows 0 px; `generalAnimations` status-animation line);
the same SE wait now precedes stats-change banners (both scenes) and multi-hit 2nd+ hits (sgs134 / sgl138); #166's Double Team tail and
Smokescreen's first-use phase (tmr136); ordinary Scene ON rows draw ONIX's tracked idle rest (rst139 / rsl141); ord124's order plans
landed (ordl126). Ordinary-play census (`.integration/validation/final-63f6850b2/census/merged.json`): **99.34 % of move-animation
commands / 99.60 % of frames live** (session start 98.95 / 99.32). Live audits 27 / 28: 0 defects. Resume points:
0. FIRST, AUTHORIZED 2026-10-13: fix the battle-engine accuracy backlog through main-lane steps under `docs/factory-finish-scope.md`.
   [x] #165 Return -> Frustration DONE (ret165, docs/ret165-return-to-frustration.md: ROM receipt, census Return 84 -> 0); [x] #141's missing
   rampage / Sticky Hold RNG draws and #140's chosen-move targeting draw DONE (rng146 + thr153, docs/rng146-rng-draw-fixes.md); next #139's Focus Punch pre-pass.
   Intentional source-correct damage / AI / RNG / event-order changes are permitted; prove them and run the gameplay gates.
1. Presentation (cheap, can proceed independently): land the BANKED inv142 patch (docs/inv142-status-animation-invisible-battler.md: a status animation over a hidden Dig
   battler draws its sprites; 5 census commands). Then FRZ's frozen-turn 115 / 116 phase (aud137 §; D4 class, 1 frame).
2. Remaining move-animation fallbacks (census 181 commands): Hyper Beam 63 (Random2 orb words), Astonish 310 (small words law),
   Extrasensory 326 player later bodies (scanout split), doll cells, Castform weather keys (#143), stale move power (Endeavor), Memento after
   a Dragon Dance; `unknown` x2-history rows (rst139: 12,477 ONIX frames not claimable).
3. Timeline remainders: #167 (Rest's OFF attack pause, sprite-visibility / stat-stage-change next receipts, the charge-turn EMPTYSTRING3
   print), #153 (Scene OFF skips the Substitute body), idle94's unproven lead moves / per-move tails; the SE gate's unmeasured paths
   (Overheat / Superpower / AncientPower self-drops, Yawn after a hit, Thrash after sandstorm: sgs134 / sag130 docs).
4. DONE 2026-10-13 (`bba4d9dc6`): the app-only presentation-rng differential traces were regenerated on the current timeline
   (173 -> 190 captures); regenerate again with tools/integration/presentationRngTraces.ts after timeline-moving folds.
5. A live audit after every batch (audits 21..28 tools; ALWAYS on production accepted windows: tools/integration/audit21Align.py).
Struggle is required by the 2026-10-11 user decision; its adapter is live since 2026-10-11 (stl109), with the remaining declines above.
Validate new adapters with alternate-species dense proofs whose windows are the production accepted window aligned to the
source activation frame (tools/integration/audit21Align.py), not only the accepted fixture species.
Latest progress supersedes this starting checkpoint as verified work lands.

Acceptance:

- The current Factory finish-up includes the battle-engine defects in `docs/factory-finish-scope.md`; no presentation-only
  scope exclusion may leave them unworked. Prove intentional gameplay/RNG corrections against the source and run the applicable
  gameplay gates. Scene ON/OFF and presentation seeds must still agree on corrected logical outcomes.
- Include Struggle as an additional required body and in headline ordinary-play coverage. Historical 276-body catalogue completion
  alone does not satisfy S10A; report Struggle's pending / accepted / live state separately without granting unproved credit.
- Each newly integrated body has complete dense source/framebuffer proof through
  the production live renderer, both orientations, twice fresh, and every
  evidence-required variant. Use the existing per-move integration verifiers;
  name their exact commands and tested trees in each receipt. Never consume
  capture rows in production or credit generic fallback effects as exact.
- **D3 exception for Random2-derived visuals only:** faithful-random adapters use
  complete dense proofs with pinned source random values through the production
  live renderer, both orientations, twice fresh, and required variants. Verify
  the RNG recurrence, draw order/count and value transformations; exercise
  ordinary routes with the surrogate, seed export/replay/reset and Scene ON/OFF
  gameplay/RNG parity. Normal-play surrogate frames carry a faithful-random
  claim; controlled pinned-word proofs do not establish oracle-exact randomness
  in arbitrary play. Keep timing, geometry, resources, lifecycle and cleanup
  requirements intact, and retain fallback for other unproved host state.
- **D4 exception for evidenced CPU-load timing only:** deterministic dominant
  measured phases may be promoted as faithful timing under
  ANIMATION_VERIFICATION.md. Preserve all other source/pixel requirements;
  quantify alternate-phase residuals and prove ordinary completion and
  gameplay/RNG parity. Keep a disjoint census; adapters using both D3 and D4
  count once as faithful timing with an explicit D3 flag. Existing exact
  fixture proofs do not make the widened timing claim exact.
- Ordinary real command input reaches subsequent valid prompts through the
  relevant repeated/status/miss/multi-hit/two-turn/switch/KO cases. Scene ON/OFF
  controls preserve logical outcomes, RNG ownership and facility progression.
- Inventory `docs/animation-integration-live-status.json` names each accepted
  move's live provider and remaining blocker. Adapters, Factory acceptance and
  stronger rendering-history claims remain separate. Do not expand into the
  77 non-Factory animations or conceal unknown ownership behind a count.
  Report faithful-random and faithful-timing adapters separately from existing scoped exact claims;
  do not inflate exact coverage or change Factory body acceptance for this work.
- Follow `ANIMATION_VERIFICATION.md`: affected controls, smoke, full
  `npm test` / `npm run build` for changed production, independent central
  reproduction and an independent final full pair at session wind-down.
  Reuse same-code receipts where that contract allows; serialize heavy gates.
- Publish each green checkpoint locally with
  `bash tools/integration/start-local-preview.sh`, then verify ordinary-input
  replay, canvas/PNG hashes, session export, mode restart and browser errors
  with the existing integration replay tools. Record the served revision and
  browser receipt. A first preview does not finish the remaining adapters.

### [ ] S11 — Audio (separate milestone, user-directed 2026-07-28)

**OUT OF SCOPE for now (user decision 2026-08-10):** do not schedule,
brief, or begin this stage. The entry stays in the roadmap by explicit user
instruction ("just write that it's out of scope for now, but don't remove
it"); a future user decision re-opens it.

Sound effects, mon cries, fanfares, and background music across the draft,
battle, swap, and ending flows. Deliberately unscheduled until S10's parity
gates close; no earlier stage's acceptance may be reinterpreted to include
audio. Acceptance criteria are authored when this stage is scheduled.
Groundwork that already exists and should be reused, not rebuilt: the kernel
emits `play-se`/`play-fanfare`/`play-faint-cry` semantic events, and the
animation lane's evidence recipes already byte-pin both hardware audio
players/pans through mGBA RAM probes — a state-parity acceptance channel
that does not require waveform capture.

Stages ship in order for the main functional lane. The animation lane may run
in parallel behind the presentation seam, and later scenario/data groundwork
may begin early when it is file-disjoint and does not redefine an unfinished
earlier-stage interface.

## Domain notes (verified during iteration 0 unless cited)

- **Color pipeline:** the oracle PNG's 15→24-bit expansion is
  `(c<<3)|(c>>2)` per channel — verified against all 22 distinct colors of
  the anchor frame. Keep verifying implicitly via strict diff on new screens.
- **RNG:** `Random()` advances once per VBlank **except** in frontier
  battles: `main.c:366` — `if (!gMain.inBattle || !(gBattleTypeFlags &
  (BATTLE_TYPE_LINK | BATTLE_TYPE_FRONTIER | BATTLE_TYPE_RECORDED)))
  Random();`. So the draft screen consumes 1 RNG/frame (input-independent),
  while factory battles consume RNG only on demand. Anchor
  `gRngValue = 0xd2ddeec8` (RAM-verified).
- **Dev-time RAM inspection recipe** (sanctioned ground-truth channel;
  never at runtime): run a script with
  `/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python`, put
  `<harness>/oracle/` on `sys.path`, instantiate
  `emerald_core.EmeraldOracle(rom, map, bootstrap/factory.json)` — replay
  reproduces the canonical anchor byte-exactly (sha verified) — then
  `read_u8/read_u32` at `bin/oracle symbols` addresses; drive further frames
  with the same segment format to inspect later states. Quirks: mGBA spews
  log lines to stdout (write JSON results to a file, don't parse stdout) and
  the interpreter segfaults at teardown AFTER results are written (exit 139
  is benign — check the output file, not the exit code).
- **Draft-screen timings observed:** RIGHT/LEFT (held 2f) → cursor+header
  fully settled by input-frame+4 (transient partial-redraw frames at +2/+3 -
  avoid capturing those, or match them exactly); this holds for a bare
  `JOY_NEW` tap AND for each `JOY_REPEAT` pulse alike. Key-repeat timing is
  `main.c`'s exactly: first repeat 40 ticks after the press tick, then every
  5 ticks (`gKeyRepeatStartDelay=40`, `gKeyRepeatContinueDelay=5`, one shared
  counter across all buttons, reset on any change to the held combination).
  A on a slot → ball-open settled by input-frame+~30 (not the `~f45` guessed
  in iteration 0); B-close settled by input-frame+~20-24. Menu cursor
  (UP/DOWN) reposition settles in ~2-3 frames, same as the slot cursor.
  **Idle screens are pixel-stable only up to ~104 frames** — past that,
  `Select_Task_FadeSpeciesName` starts a perpetual palette breathe on the
  species name text (not yet modeled); keep traces under that or model
  it explicitly.
- **Input-ready lags visual-stable by a few ticks on the summary Info
  page** (S4 slice-1 B-exit fix, ISSUES #4 investigation): the settled
  Info page's pixels are sha-stable from press-tick+59 (see the S4 entry
  above), but a `B` pressed at +62 (absolute frame press-tick+62, still
  well inside that stable window) is silently dropped — `Task_HandleInput`'s
  `!gPaletteFade.active` guard isn't actually true that early despite the
  screen looking settled. `B` first registers at +63 (one tick later still
  failed in one probe, +63 is the earliest confirmed working offset from
  the anchor's own SUMMARY-open trigger tick 42, i.e. absolute frame 105).
  Dense-probing any interaction gated on "looks stable" on this screen
  should confirm the input actually registers (check for the expected
  pixel change a few ticks later), not just trust the pixel-stable window.
- **Rented-ball sprites consume RNG** (S5 scout): `SpriteCB_Pokeball`
  (`battle_factory_screen.c:1059-1090`) rolls `Random() % 5` on a ~32-frame
  cooldown per rented ball for as long as the sprite exists — so once pick 1
  lands, draft-screen RNG consumption is no longer exactly 1/frame. Model
  these calls exactly or later RNG-dependent outcomes drift. Details +
  timings in `docs/rent-flow-notes.md`. Now implemented + RAM-confirmed
  (S5 slice 1, `ballAnim.ts`): within a tick the standard VBlank advance
  happens first, the ball roll second; first roll-eligibility is 2 ticks
  after selection; a successful roll rests 32 ticks, a failed one rerolls
  when the short idle anim ends; the visible ball tile lags internal anim
  state by 2 ticks (2-stage shift register).
- **Draft candidates live in `sFactorySelectScreen`** (S3, RAM-verified):
  fully-instantiated `struct Pokemon` objects at the file-static
  `sFactorySelectScreen->mons[i].monData` (statics aren't in the linker map —
  resolved via `nm` on the pinned ELF, `0x0300127c`; recipe documented in
  `tools/extract/inspect-anchor.py`). `gSaveBlock2Ptr->frontier.rentalMons[]`
  carries only `monId` pre-pick; its personality/IVs/ability fields are
  stale until a pick commits.
- **Oracle limits:** maxFrames 45000 (raised from 20000 by user decision
  2026-07-19, harness commit `ccd7554`), maxCaptures 256; long traces
  ~10-30s; service serializes runs (parallel workers safe).
- **Reference geography:** draft/swap UI `src/battle_factory_screen.c`
  (4314 lines); challenge logic `src/battle_factory.c` (919); rental mons +
  frontier trainers `src/data/battle_frontier/`; factory screen art
  `graphics/battle_frontier/factory_screen/` (menu.bin/.png, interface.pal,
  pokeball.png + gray/selected .pal, arrow.png, mon_pic_bg.*, text.pal);
  fonts `graphics/fonts/` + `charmap.txt`; battle engine `src/battle_*.c`,
  `data/battle_scripts_1.s`.
- **Engine contract for successive workers:** pure core in `src/engine/`
  (`tick(buttons)` / render into a 240×160 RGBA `Uint8Array`), assets/data
  only from `src/assets/gen/` + `src/data/gen/` (committed, regenerable via
  `tools/extract/`), browser shell and `appTrace.ts` share the core. The
  production build never touches ROM/emulator/oracle/`reference/`.
