# Trainer-pic OFF-window prep scout

## A. Ground truth

### Fixture and method

Banked fixture: `tools/battle-lab/factory-trainer-pic-shizuka-off.json`. It is
a legal Level-50 Factory matchup with `challengeNum: 2`, `battleNum: 2`,
`trainerId: 110`, source set IDs, and Battle Scene OFF. It uses
`factoryLegal`, not `mechanicLab`: this is an ordinary Factory entrance, so
neither custom Pokémon nor injected transient state is needed.
`FRONTIER_TRAINER_SHIZUKA` is id 110
(`reference/pokeemerald/include/constants/battle_frontier_trainers.h:108-116`),
so the trainer is not canonical Battle-1/Battle-2 identity.

Public Battle Lab cannot expose this intro: `BattleLab.prepare` drives the
source route to action menu then resets its public clock
(`../../oracle/battle_lab.py:510-534`); public frame 0 is documented as the
first player action menu (`../../oracle/BATTLE_LAB.md:53-62`). The fixture
therefore honestly has only public capture `[0]`.

Dense evidence used a throwaway subclass of that same source-owned pre-reset
route—no app change and no injected state. Every frame is under
`/var/folders/wk/mq92yc6s53jfllv0m6rwvydc0000gn/T/pokebench-trainer-pic-reprobe.XXXXXX.l7EmJc4COx/oracle-output/`,
with validated receipt
`/var/folders/wk/mq92yc6s53jfllv0m6rwvydc0000gn/T/pokebench-trainer-pic-reprobe.XXXXXX.l7EmJc4COx/receipt.json`.
`tools/run-mgba-probe.py` accepted its known teardown SIGSEGV only after the
receipt parsed. Public fixture output was separately checked with
`bin/oracle lab` in disposable output; PNGs are not committed.

### Timing anchors

All numbers are receipt frames. **P** is route frame 959, the first A edge
that dismisses the Factory-room message and starts the pre-battle transition.
**B** is frame 1171, first `gBattlersCount == 2` and
`gBattleMainFunc == BeginBattleIntro`; `B=P+212`. Every P..1885 frame was
captured (927 inclusive). The receipt reads named RAM symbols—main function,
controller flags, buffer, sprites, healthboxes—resolved by `bin/oracle
symbols`, not fitted pixels.

| Event | Frame / B offset | Evidence |
| --- | --- | --- |
| Transition boundary | P=959 / B-212 | Receipt frame 959 has A; P..B densely covers fade/circles/black. |
| Intro begins | 1171 / B+0 | `BeginBattleIntro` (`reference/pokeemerald/src/battle_main.c:3019-3032`). |
| Opponent pic created | 1197 / B+26 | Battle emits DrawTrainerPic (`reference/pokeemerald/src/battle_main.c:3393-3440`); controller sets x=176, x2=-DISPLAY_WIDTH, speed 2 (`reference/pokeemerald/src/battle_controller_opponent.c:1267-1322`). |
| Pic first step / settle | 1230 / +59; 1349 / +178 | RAM x2 changes -240→-238 then reaches 0. |
| Party summaries | 1197..1350 / +26..+179 | Source emits opponent then player summaries (`reference/pokeemerald/src/battle_main.c:3491-3538`). |
| “BLACK BELT SHIZUKA would like to battle!” | 1351/+180 dispatch; 1356/+185 printer | `STRINGID_INTROMSG` then wait (`reference/pokeemerald/src/battle_main.c:3564-3608`); A at 1541-1542/+370..+371. |
| “BLACK BELT SHIZUKA sent out MAGNETON!” | 1544 / +373 | `STRINGID_INTROSENDOUT` dispatch (`reference/pokeemerald/src/battle_main.c:3583-3608`). |
| Opponent ball task / mon visible | 1582/+411; 1601/+430 | Intro ball task source (`reference/pokeemerald/src/battle_main.c:3642-3683`; `reference/pokeemerald/src/battle_controller_opponent.c:1867-1924`); receipt clears mon invisible at 1601. |
| Opponent healthbox start / settle | 1614/+443; 1637/+466 | RAM x2=-110 then +5/frame to 0; source ball-complete gate starts/slides/makes visible (`reference/pokeemerald/src/battle_controller_opponent.c:292-325`). |
| Player text / ball task | 1693/+522; 1707/+536 | Player intro source (`reference/pokeemerald/src/battle_main.c:3711-3738,3776-3817`). |
| Player mon visible | 1786/+615 | Receipt clears invisible; controller owns intro throw task (`reference/pokeemerald/src/battle_controller_player.c:2931-2959,2977-3007`). |
| Player healthbox start / settle | 1800/+629; 1822/+651 | RAM x2=110 then -5/frame to 0; source gate (`reference/pokeemerald/src/battle_controller_player.c:979-1011`). |
| Visible menu / player-ready | 1881/+710; 1885/+714 | Main becomes action selection at 1881; at 1885 buffer is `CONTROLLER_CHOOSE_ACTION` (18), flags `PLAYER_CONTROLLER_FLAG` (1), matching the lab predicate (`../../oracle/battle_lab.py:1405-1423`). |

Fixture species are evidence of normal controllers, not reusable art/text.
Future rendering must use its own typed party records.

### Trainer-to-pic mapping

SHIZUKA is `FACILITY_CLASS_BLACK_BELT`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_trainers.h:883-889`).
`GetFrontierTrainerFrontSpriteId` maps a Frontier facility class through
`gFacilityClassToPicIndex` (`reference/pokeemerald/src/battle_tower.c:1404-1419`).
That lookup maps BLACK_BELT to `TRAINER_PIC_BLACK_BELT`
(`reference/pokeemerald/src/data/pokemon/trainer_class_lookups.h:1-14`), id
11 (`reference/pokeemerald/include/constants/trainers.h:25-40`). It is in the
50-item extracted catalog, entry id 11 and source
`graphics/trainers/front_pics/black_belt.png`, at
`src/assets/gen/frontier-trainer-pics.json:1`.

## B. Consumer map

| Concern | Existing seam | State-driven? |
| --- | --- | --- |
| Trainer identity and assets | `src/engine/factoryTrainerPresentation.ts:32-89`; `src/engine/battleScene.ts:13522-13558` | Identity/pic selection typed; intro clock legacy. |
| Intro slide/text | `src/engine/battleScene.ts:2671-2740,13707-13780,15915-16021` | Optional typed trainer, but canonical encounter/absolute timing; fixed “would like to battle!”. |
| Send-out/exit | `src/engine/battleScene.ts:2933-3047,13575-13705` | Trainer line 1 typed; KABUTO/GROVYLE line 2 and x2/clock canonical. |
| Generic field/healthboxes | `src/engine/battleCommandPresentation.ts:58-104`; `src/engine/battleCommandFieldArt.ts:56-103`; `src/engine/battleScene.ts:5950-6025` | Typed species art and healthboxes at command window. |
| Generated battle start | `src/engine/battlePresentation.ts:12-18`; `src/engine/roundController.ts:153-158,201-206`; `tools/compare/appTrace.ts:92-128` | `battleStart` carries player party/opponent, but current stage completes it. |
| Resolution/send-out seam | `src/engine/factoryRoundBattleOrchestrator.ts:424-472,739-775` | Typed command/resolution begins after start; no intro lifecycle. |

### Exact gap list

1. **No generated battle-start adapter.** `battleStart` already has player
   party and opponent, but appTrace completes it immediately
   (`tools/compare/appTrace.ts:116-122`). Derive/freeze trainer presentation
   via `factoryTrainerPresentationForOpponent`
   (`src/engine/factoryTrainerPresentation.ts:102-119`) in an app owner, not
   appTrace.
2. **No typed intro lifecycle/relative clock.** Command phases begin at
   `action-enter` (`src/engine/battleCommandPresentation.ts:74-104`); source
   orders slide, summaries, first text, acknowledgement, two send-outs,
   readiness (`reference/pokeemerald/src/battle_main.c:3380-3800`). Extend
   typed lifecycle; no battle-number or absolute-tick branch.
3. **Text is only half generic.** Current text fixes line 2/species
   (`src/engine/battleScene.ts:2695-2727,2933-3003`). Reproduce
   `STRINGID_INTROMSG`/`STRINGID_INTROSENDOUT`
   (`reference/pokeemerald/src/battle_main.c:3564-3608,3711-3738`) from typed
   trainer/active party.
4. **Pic choreography is legacy-clock driven.** Selection works, but slide/
   exit are legacy tables (`src/engine/battleScene.ts:3005-3047,13575-13705`).
   Extend resolver with controller choreography
   (`reference/pokeemerald/src/battle_controller_opponent.c:1240-1322,1867-1924`).
5. **No battle-start summary contract.** Source emits both summaries before
   text (`reference/pokeemerald/src/battle_main.c:3491-3538`). Reuse Slice-5
   compositor with start parties; do not bake fixture icons.
6. **No generic initial release lifecycle.** Typed field art/healthboxes exist,
   but generated renderer starts at command window
   (`src/engine/battleScene.ts:16024-16029`). Reuse those views for normal
   opponent/player controller order, not GROVYLE/KABUTO helpers.
7. **No public dense-lab intro trace.** Lab frame 0 is post-intro
   (`../../oracle/BATTLE_LAB.md:60-62`). A generated route must reach P or
   harness deliberately add pre-reset capture. **PREDICTION:** keep the
   private route as probe until generated route exists; no harness change here.

   **PREDICTION FALSIFIED (2026-07-30).** The harness took the second branch
   the next morning: `preCheckpointCaptureFrames` (`8251953`) plus
   `preCheckpointCaptureAllFrames` (`38fea69`) expose the rental-selection and
   intro-cutscene frames, so this window is publicly capturable and slice 4's
   trace no longer depends on the generated route reaching P first. Mind the
   separate absolute frame numbering — see
   `interactive-routing-flip-design.md` §6.2.

### Recommended slices

1. **Start-command contract (<=35 min):** freeze trainer, parties, active
   indexes, text inputs. No pixel claim.
2. **Generic pre-send-out intro (<=45 min):** relative handoff, pic slide,
   summaries, first printer/cursor/A gate.
3. **Opponent release (<=45 min):** typed sent-out text, exit, ball/release,
   materialization, healthbox; checkpoints B+411/+430/+443/+466.
4. **Player release to command (<=45 min):** player text/throw/release,
   healthbox, menu handoff. This slice claims the OFF generated-route trace:
   estimated **927 captures** (P..B+714).

Open remainder: ground truth is complete, but no public generated app/oracle
trace reaches P yet. This scout intentionally did not create one.

## C. Absolute pre-checkpoint coordinate mapping (2026-07-30 probe)

Ground truth above (P/B/B+offsets) uses the throwaway private-route frame
numbering from the original scout. The harness has since shipped
`preCheckpointCaptureFrames`/`preCheckpointCaptureAllFrames`
(`../../oracle/BATTLE_LAB.md` "Pre-checkpoint captures"), a **separate,
absolute** coordinate space (frame 0 = immediately after `new_session()`).
This section maps §A's window onto that public numbering by direct probe
against the running main OFF oracle, using the exact same banked fixture
(`tools/battle-lab/factory-trainer-pic-shizuka-off.json`: `factoryLegal`,
`challengeNum: 2`, `battleNum: 2`, `trainerId: 110` (SHIZUKA),
`playerSetIds: [274, 354, 338]`, `opponentSetIds: [349, 339, 327]`,
`seed: 1`) so §A's landmark descriptions apply unchanged. Set 274 is
`FRONTIER_MON_KADABRA_2` (species KADABRA, id 64); set 349 is
`FRONTIER_MON_MAGNETON_2` (species MAGNETON, id 82) — confirmed against
`src/data/gen/battle-frontier-mons.json`.

### Method

1. **Coarse**: added `"preCheckpointCaptureFrames"` with a 246-frame grid
   (step 15, `0..3664`) to `bin/oracle lab`. Only 134 frames (`0..1995`)
   came back — the internal route for this fixture is shorter than the
   3664-frame ceiling, so requested frames past its real end are silently
   absent (matches `BATTLE_LAB.md`'s "never exceeds" wording; it is not a
   fixed length).
2. **Dense**: reran with `"preCheckpointCaptureAllFrames": true` (single
   request, no enumeration cap). Returned **2007 captures, frames `0..2006`
   inclusive** — the complete internal route for this exact fixture. All 134
   coarse-grid hashes matched the dense run's hashes at the same frame
   numbers (cross-check, 0 mismatches).
3. Symbol-resolved two callback addresses to anchor the transition precisely:
   `bin/oracle symbols CB2_InitBattle BattleMainCB2` → `0x8036760` /
   `0x8038420`. Observed `state.engine.mainCallback2` values `134440801`
   (`0x8036761`) and `134448161` (`0x8038421`) are exactly those addresses
   +1 (GBA Thumb bit) — i.e. directly identified, not guessed from behavior.
4. Decoded `pngBase64` at candidate frames to disk and read them as images
   to confirm on-screen content against §A's cited text/sprites.

### Mapping table (absolute preCheckpointCaptureFrames numbering)

| §A landmark | Absolute frame | Evidence |
| --- | --- | --- |
| P — Factory-room message showing, pre-dismiss | 959 | PNG: room + "SHOW ME THAT YOU'RE SERIOUS!" visible; `sha256` constant `953..962`, first change at `963` (dismiss animation starts). |
| `CB2_InitBattle` running (fade/circles/black) | 1160–1187 | `mainCallback2 == 0x8036761` (`CB2_InitBattle`+1) for this whole span; PNGs are solid black (192-byte PNGs). |
| B — `gBattlersCount==2` ∧ `gBattleMainFunc==BeginBattleIntro` | 1171 (inferred exactly; see note) | `InitSinglePlayerBtlControllers` sets both in the same statement block for a non-double singles battle (`reference/pokeemerald/src/battle_controllers.c:161-177`), which runs **inside** the `CB2_InitBattle` window above (before the `BattleMainCB2` switch) — consistent with B preceding the 1188 callback switch below. Pinned by the B+26 sub-event next row landing at exactly `1171+26=1197`. |
| `gMain.callback2` switches to `BattleMainCB2` | 1188 | `mainCallback2 == 0x8038421` (`BattleMainCB2`+1) first at 1188; constant through frame 2006 (gMain.callback2 stays `BattleMainCB2` for the whole battle — `gBattleMainFunc` sub-state isn't a separately exposed field). |
| Opponent pic created / battlers struct populated (B+26) | **1197** | `state.battlers.player.species=64`, `opponent.species=82` first nonzero at exactly `1171+26=1197` — matches §A's own "Opponent pic created \| 1197/B+26" row verbatim, confirming **offset 0** at B. |
| Party summaries (B+26..+179) | 1198–1350 | Dense per-frame `sha256` churn across `1198..1350`, matching §A's "1197..1350/+26..+179" almost frame for frame. |
| "BLACK BELT SHIZUKA would like to battle!" fully printed | ~1400 (dispatch ≈1351, printer ≈1356 per §A) | PNG at 1400 shows the full line including the heart glyph. |
| Message ack / sent-out dispatch | 1541–1544 (stable), box redraw starts 1545 | `sha256` constant `1541..1544`, first change at 1545 — matches §A's ack "1541-1542" / dispatch "1544" almost exactly. |
| "…sent out MAGNETON!" + release flash (B+443) | 1614 | PNG confirms text + pink release-flash sprite. |
| "Go! KADABRA!" + both healthboxes settled (B+651) | 1822 | PNG confirms both healthboxes and the line. |
| Checkpoint predicate first true (`CONTROLLER_CHOOSE_ACTION`=18, `PLAYER_CONTROLLER_FLAG`=1) — §A's B+714 | **1885** | `state.engine.playerControllerCommand==18 && controllerExecFlags==1` first true at exactly 1885 — the same absolute frame number §A reports for B+714. |
| True checkpoint (pixel-identical to post-checkpoint frame 0) | 1887 | `preCheckpointCaptures[frame=1887].sha256 == captures[0].sha256` exactly (the ordinary post-checkpoint trace's frame 0). Recurs every ~37–39 frames after (1926, 1963, 1999…) — an idle blink-cycle repeating the same pixels, not further motion. 2 frames later than the RAM-predicate-only match at 1885; likely an edge-sampling difference between this probe and §A's throwaway subclass, not a real behavior gap. |
| Route end (`preCheckpointCaptureAllFrames` last frame) | 2006 | Total 2007 frames captured. The harness overshoots the logical checkpoint (1885/1887) by up to ~121 frames because the internal acknowledgment loop only re-checks its stop condition at coarse polling-chunk boundaries (consistent with `BATTLE_LAB.md`'s "up to 12 further chunks of up to 134 frames": `2006-1872=134`). This is harmless for capture (every frame through 2006 is still returned), just a cue that "last captured frame" ≠ "the semantic checkpoint frame" — use the predicate/hash match (1885/1887) for that. |

**Verdict: the offset between §A's private-route numbering and the public
absolute `preCheckpointCaptureFrames` numbering is 0 for this fixture**,
confirmed independently at P (959), at B via its B+26 sub-landmark (1197),
at the message/send-out/release/healthbox landmarks (1400/1544/1614/1822),
and at the checkpoint predicate (1885) — with only a 2-frame slack at the
finest (pixel-identical-to-post-checkpoint) granularity. §A's frame numbers
can be used directly as absolute `preCheckpointCaptureFrames` values for
this fixture; a future fixture with a different rental-selection frame count
(non-`(0,1,2)` pick order — the range is 1886–1936 per `BATTLE_LAB.md`)
should re-verify P using the same message-content probe before assuming the
same equivalence, since P sits immediately after rental selection ends.

### Determinism check

Ran the identical dense request (`preCheckpointCaptureAllFrames: true`,
same fixture) twice back to back:

- Both runs: **2007/2007 frames**, identical frame index list (`0..2006`).
- **0 `sha256` diffs** across all 2007 pre-checkpoint captures.
- **0 diffs** in the full semantic `state` dict across all 2007 captures
  (deep equality, not just the pixel hash).
- Post-checkpoint `captures[0].sha256` identical between runs.
- Combined-sequence digest (`sha256` of the concatenation of all 2007
  per-frame `sha256` hex strings, both runs):
  `47e7d635f6084ba47bb76c5216449e090698f7a34c959b983468f2a7256d44b2`.

**Verdict: fully deterministic.** Absolute numbering and pixel hashes are
stable across runs; the chunked intro-acknowledgment polling does not
introduce frame jitter for this fixture, and it does not affect which
frames get returned (`preCheckpointCaptureAllFrames` still returns every
frame through the (later) actual stop point, run to run).

**Secondary finding — seed sensitivity.** Reran a spot-check (19 enumerated
`preCheckpointCaptureFrames`, the landmark rows above) with `seed: 999999`
instead of `1`, same `trainerId`/`playerSetIds`/`opponentSetIds`. 16/19
landmark frames matched the seed-1 hashes exactly byte-for-byte (transition,
send-out, ball-throw, materialize, healthbox, and checkpoint frames — 959,
963, 1171, 1197, 1582, 1601, 1614, 1637, 1693, 1786, 1800, 1822, 1885, 1887,
1911, 2006). Three frames inside the *"would like to battle!"* message's
text-print window (1351, 1400, 1544) did **not** match — the variant-seed
PNG at 1400 shows the line mid-print ("would like to batt") where seed 1
already shows it complete — but the two runs resynchronize by 1582 (the
next structural landmark). So: **structural landmarks (transition, pic
slide, send-out/release/materialize, healthbox, checkpoint) are seed-
invariant; text-print completion timing inside a message box is not.** A
future comparison fixture must match the app's actual seed to claim an
exact pixel match across the *whole* P..B+714 window; matching only
trainer/party identity (not seed) is sufficient for every landmark outside
message-print sub-windows.

### Feasibility verdict for the consumer step

**The comparable subwindow is P..B+714** (the pre-battle transition plus
the full intro cutscene through command-menu readiness), reproducible
pixel-for-pixel by the app's generated route — but only via the *non-
reversed* workflow, and not yet exercised for an arbitrary (non-anchor)
trainer:

- This window's content is determined entirely by **trainer identity +
  final player lead/party + final opponent party** (species, names,
  trainer class, speech), never by *how* the rental-selection screen was
  navigated to reach that roster. `factoryLegal`'s internal route stages
  the requested `trainerId`/`playerSetIds`/`opponentSetIds` directly
  ("replaces the semantic Factory IDs... selects the requested three
  candidates through controller input", `BATTLE_LAB.md:30-35`) rather than
  reproducing any particular menu-navigation path, so its P..B+714 output
  is valid ground truth regardless of how a *different* route (the app's)
  arrived at the same roster.
- The app does **not** let you request an arbitrary `trainerId`/
  `opponentSetIds` directly (that's a lab-only staging shortcut). It must
  instead *compute* them from a seed via its own source-derived generation:
  `src/engine/factoryOpponentGeneration.ts` (`GenerateOpponentMons`
  trainer/set selection, `battle_factory.c:316-375`) and
  `src/engine/factoryTrainerSchedule.ts` (`selectFactoryTrainer`, an
  explicit-RNG-port pure function) already port this math and are already
  consumed by `factoryRoundBattleOrchestrator.ts` for battles 2–7. **This
  means no seed search is needed**: run the app's own generation function
  for a candidate seed/challenge/battle state, read off the resulting
  `(trainerId, opponentSetIds)` (and the player-side drafted set ids, in
  the same slot order the app assigns them — lead/active-battler order
  matters for which species sends out first), then request *exactly that*
  combination from `factoryLegal` with `preCheckpointCaptureFrames`/
  `preCheckpointCaptureAllFrames` to get pixel ground truth. Reversing the
  direction — picking a canned lab fixture first and trying to make the
  app's seed-driven draft reproduce it — would need an actual seed search
  and should be avoided.
- What's still missing is **not** the harness/capture contract (this probe
  shows it is deterministic, dense, and pixel-exact) — it's the
  presentation/rendering side for an *arbitrary* trainer: §B's exact gap
  list (trainer pic choreography, generic intro text, generic release
  lifecycle) is still open, which is exactly why no such comparison trace
  exists yet. This probe removes the "is the harness ready" question from
  that remaining work.
- **Not claimed comparable:** the `0..P` window (the rental-selection
  screen itself). `factoryLegal`'s navigation to reach specific requested
  candidate IDs is a scripted shortcut through the menu, not the same input
  sequence the app's actual draft UI/adapter would produce for a given
  seed's candidate offering — comparing that window needs the app's own
  draft-screen trace (already separately covered, e.g. `tests/
  draftScreen.test.ts`), not this pre-checkpoint capture of the lab's
  internal shortcut route.
- **Seed caveat** (from the determinism section above): matching
  `trainerId`/`playerSetIds`/`opponentSetIds` is sufficient for every
  structural landmark in P..B+714, but an exact pixel match through the
  message-print sub-windows also requires the comparison fixture's `seed`
  to match the app's actual seed for that battle.

## D. Public dense arbitrary-trainer intro comparison, slice 1 (2026-07-30)

**Tuple (non-reversed workflow).** Ran `generateFactoryOpponent`
(`factoryOpponentGeneration.ts`) directly with `rngValue=42`,
`factoryWinStreak=0`, `battleIndex=0`, `storedTrainerIds=[]`,
`savedRentalSetIds=[110,130,150,115,135,145]` (legal challenge-0/rank-0 range
110-199) and read off `trainerId=49` (YOSHI, `FACILITY_CLASS_BUG_CATCHER`),
`opponentSetIds=[189,155,168]` (COMBUSKEN/POLIWHIRL/PORYGON) —
`selectionRngValue=918039689`, final `rngValue=2909125605`. Not DESTIN(50)/
JENSON(58)/SHIZUKA(110, §C's own mapping fixture); species disjoint from all
three casts. `playerSetIds=[110,130,150]` (GRIMER/NUZLEAF/NOSEPASS) is the
app's own already-drafted roster in slot order, staged directly via
`rentals.type: "currentRecords"` — same convention `battle-command-
generated-off` and the `factoryBattleStartIntro` unit tests already use; the
`0..P` draft UI itself stays out of scope per this slice's brief.

**Ground truth.** `tools/battle-lab/factory-arbitrary-intro-yoshi-off.json`:
`factoryLegal`, `challengeNum:0`/`battleNum:0`/`trainerId:49`/that
`playerSetIds`/`opponentSetIds`, `seed:42`, `preCheckpointCaptureAllFrames:
true` → 2007 captures, frames `0..2006` (same total as the SHIZUKA fixture;
`selectedRentalPositions` is also `[0,1,2]`).

**Per-fixture landmark re-probe** (§C's own caveat: re-verify per fixture,
don't assume offset 0). Message-dismiss plateau is unchanged: `sha256`
constant `900..962`, first change `963` → **P=959**, identical to SHIZUKA (a
generic, trainer-independent room-message dismiss). But `mainCallback2==
CB2_InitBattle+1` first at **1168** (SHIZUKA ~1160) and battlers
species-populate (B+26) at **1205** (SHIZUKA 1197) — **+8 vs SHIZUKA**,
species-sprite-load-dependent, not text/seed; inferred **B=1179**. Checkpoint
predicate true at **1853**, pixel-match-to-post-checkpoint-frame-0 at
**1855** (SHIZUKA 1885/1887) — B-relative duration **674** vs SHIZUKA's
**714** (40 fewer frames), matching the shorter "BUG CATCHER YOSHI"/
"COMBUSKEN" text vs "BLACK BELT SHIZUKA"/"MAGNETON" (confirmed by the dense
comparison below: the character-by-character print of the full message
matches exactly, so the duration delta is real text-length cost, not drift).

**App side.** New `factory-arbitrary-intro-yoshi-off` `AppStage`
(`tools/compare/appTrace.ts`) builds the same tuple via
`createFactoryRoundBattleOrchestrator` + `beginFactoryRoundBattleStartIntro`
— the existing generated pre-send-out intro machinery (`factoryBattleStart
Intro.ts`, wired generically into `core.ts`'s `tick`/`render`, landed the
same day as this scout per §B's now-falsified item 7 prediction) — mirroring
`battle-command-generated-off`'s staging pattern with no new battle-number/
turn/tick branch.

**Consumer extension.** `tools/compare/oracleClient.ts`'s
`runOracleBattleLab` gained an additive `oracleBattleLab.
preCheckpointFrameOffset` field. When set: decode `battleLab.
preCheckpointCaptures` (instead of ordinary post-checkpoint `captures`),
rebase each frame to app-relative (`absolute - offset`), and filter to the
trace's own `captureFrames` — so `run.ts`'s existing compare loop is
unchanged and every other fixture (`battle-command-generated-off` etc.,
which never set this field) is byte-for-byte unaffected. The post-checkpoint
request this path sends the oracle is deliberately minimal (`captureFrames:
[0]`) since pre-checkpoint captures don't depend on it — avoids extra
full-route replay batches for frames never read.

**Frame mapping.** `app_trace_frame 0 == oracle absolute frame 1171`
(`preCheckpointFrameOffset: 1171`), derived from `GENERATED_BATTLE_INTRO_
ROOM_HANDOFF_DELAY=8` (`battleScene.ts:3872`) and this fixture's own `B=1179`
(`1179-8=1171`). **This app stage does not render the P..B fade/circles/
black room transition at all** — `beginFactoryRoundBattleStartIntro` installs
the intro only 8 frames before `BeginBattleIntro`; the ~212-frame P..B fade
is owned by the canonical-only `battleRoom.ts` lifecycle (DESTIN/JENSON
only), not the generic intro. So the achievable app-side window is
**B-8..checkpoint**, not P..checkpoint — a real, characterized gap (§B's
"no generic initial release lifecycle" item), not attempted this slice.

**Seed alignment (task 5).** Best-effort only: used `seed=42` (the app's own
`config.rngValue` entering `generateFactoryOpponent`) as the fixture's
`seed`. This is **not provably** the same RNG-injection point the lab's
`seed` field writes to (`BATTLE_LAB.md` only documents that precisely for the
separate `preview_report` anchor — "written immediately after
`new_session()`, thousands of frames before generation runs"; `factoryLegal`'s
own injection point relative to its internal rental-selection-screen
navigation isn't specified, and per entry 756's HONEST-STOP the count of
ambient per-VBlank `Random()` ticks between any earlier point and generation
is not committed evidence anywhere). Genuinely unresolvable with committed
evidence this slice — same class of gap as entry 756 — so proceeded with the
best-effort value rather than blocking. In the event, no text-print-window
divergence was observed at all (see below), so this caveat did not bite for
this specific run.

**Comparison run.** `npm run compare -- tools/compare/traces/factory-
arbitrary-intro-yoshi-off.json --summary`, app-relative window `0..750`.

**Result: 415/751 frames matched.** Frames **0..373 (374 consecutive
frames) are pixel-identical byte-for-byte** — the entire trainer-slide,
party-summary, and full "BUG CATCHER YOSHI / would like to battle!♥"
text-print animation (character-by-character) plus idle cursor blink, for a
genuinely arbitrary, never-before-rendered trainer/species pair. That
contiguous exact match is the headline finding for this slice.

**First divergence: app-relative frame 374 (absolute oracle frame 1545).**
Oracle: the message box clears and starts a new, barely-printed message at
exactly frame 1545 — the lab's internal automated route auto-acknowledges
the `PAUSE_UNTIL_PRESS` gate and advances to the send-out message at a
near-fixed absolute frame (1545 here, versus the unrelated SHIZUKA fixture's
1544/1545 "ack/dispatch" landmarks in §C's own table — schedule-driven, not
reactive to this fixture's shorter text). App: still renders the completed
"would like to battle!" box + cursor at frame 374 regardless of whether the
trace's own scripted `A` press had already been placed at app-relative frame
374 or 379 (both tried; identical output) — the acknowledgement transition
had not visibly taken effect by then either way. Root cause not isolated
this slice: candidates are (a) an off-by-a-few-frames error in the
`app_trace_frame`↔`elapsed` mapping used to choose the `A`-press timing, or
(b) a multi-frame lag in `factoryBattleStartIntro`'s post-acknowledgement
render. Renderer/lifecycle sites: `battleScene.ts:3904-3946`
(`renderGeneratedBattleStartPreSendOut`), `factoryBattleStartIntro.ts:69-86`
(`advanceFactoryBattleStartIntro`'s `acknowledgedElapsed` handling). The
residual 336/751 mismatched frames (send-out, release, healthbox settle,
command-ready) are entirely downstream of this one handoff-timing
divergence — no independent divergence was found in that tail, consistent
with a single upstream misalignment propagating forward rather than several
separate rendering bugs.

Per this slice's brief: characterized and stopped here rather than
marathon-fixing. **Next slice:** pin the exact acknowledgement-handoff frame
(compare oracle frames 1544/1545/1546 against a spread of app `A`-press
offsets, or instrument `state.acknowledgedElapsed`/`elapsed` directly) before
re-attempting a full-window dense claim for this tuple.
