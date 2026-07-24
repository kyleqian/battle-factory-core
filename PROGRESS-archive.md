## 352 — S9 OFF Info rental DOWN→UP round trip: **GREEN — 87/87 exact**

- **State:** settled ONIX switches DOWN to input-ready MAGBY, then UP returns
  through the same slot-relative task to input-ready ONIX with zero pixel diff.
- **Did:** generalized replacement history so the outgoing sprite callback
  advances through teardown, the destination owns a fresh local animation
  clock, and the already-installed text window follows its subsequent-copy
  timing. Tier-1 pins the reverse destination, direction, in-flight gates,
  endpoint clamps, and Info/slot ownership.
- **Next:** supervisor verify this checkpoint and choose the next bounded S9
  route; Moves/Battle Moves/Contest Moves and move-select remain untouched.
- **Notes:** `summary-info-mon-down-up.json` **87/87**; DOWN **54/54**; Info
  ONIX **122/122** + MAGBY **132/132**; install **3/3**; RIGHT **25/25**;
  LEFT **56/56**. Tier-1 **1298/1298** and build green. No absolute ticks,
  framebuffer assets, runtime oracle/ROM, battle/controller, or ROADMAP/
  ISSUES edits.

---
## 351 — S9 OFF Info-page rental DOWN switch: **GREEN — 54/54 exact**

- **State:** settled ONIX Info now switches DOWN to MAGBY through the generic
  slot-relative replacement task and returns true input ownership at +20.
- **Did:** added direction/destination ownership, endpoint clamps, in-flight
  rejection, source-ordered portrait/ball/type/text replacement, and MAGBY's
  replacement-local vertical-squish callback. Tier-1 pins both directions,
  readiness, page ownership, and no-wrap behavior.
- **Next:** add targeted UP pixel acceptance, then continue the remaining
  bounded S9 Moves-page and move-select routes.
- **Notes:** `summary-info-mon-down.json` **54/54**; Info ONIX **122/122** +
  MAGBY **132/132**; install **3/3**; RIGHT **25/25**; LEFT round trip
  **56/56**. Supervisor reverified the new dense trace and merged the disjoint
  ON lane: ICE PUNCH is now exact at **1294/1294** opposite-side and
  **462/462** player-side, with FIRE PUNCH **225/225** preserved. Integrated
  Tier-1 **1297/1297** and build green. No deferred questions.

---
## 350 — S9 OFF Skills→Info reverse layered wipe: **GREEN — 56/56 exact**

- **State:** LEFT now returns settled ONIX Skills to an input-ready Info page
  through the generic eight-step BG1/BG2 wipe; the full round trip is zero diff.
- **Did:** reused source-relative layer offsets for the outgoing page, kept
  fixed BG3/OBJ, cleared moving-page windows, and deferred source title/
  pagination replacement until install. Tier-1 pins reverse offsets, gates,
  readiness, and immutable selected-slot ownership.
- **Next:** supervisor verify this LEFT checkpoint and choose the next bounded
  S9 route; mon switching, Moves pages, and move-select remain unclaimed.
- **Notes:** round trip **56/56** (RIGHT **25/25** preserved); install **3/3**;
  Info ONIX **122/122** + MAGBY **132/132**. Tier-1 **1289/1289**, build
  green. No absolute ticks, framebuffer assets, runtime oracle/ROM, or
  ROADMAP/ISSUES edits.

---
## 349 — S9 OFF Info→Skills layered summary wipe: **GREEN — 25/25 exact**

- **State:** RIGHT now carries Skills through the source's eight 32px BG1/BG2
  steps over fixed BG3/OBJ, then installs the destination windows at +10.
  The complete transition and settled ONIX Skills hold are zero diff.
- **Did:** added generic page-layer offsets, clipped screen-block composition,
  Skills pagination/EXP/stat strings from source data, and the exact flipped
  ONIX horizontal-hop callback. Tier-1 pins both directions' layer geometry,
  shared clocks, and immutable selected-slot ownership.
- **Next:** supervisor verify this RIGHT/Skills checkpoint and choose the next
  bounded S9 summary route; LEFT, mon switching, Moves pages, and move-select
  remain intentionally unclaimed.
- **Notes:** `summary-info-to-skills.json` **25/25**; install **3/3**; Info
  ONIX **122/122** + MAGBY **132/132**. Tier-1 **1287/1287**, build green.
  No absolute ticks, framebuffer assets, runtime oracle/ROM, or ROADMAP/ISSUES
  edits.

---
## 348 — S9 OFF summary page-navigation install: **GREEN CHECKPOINT — 3/3 exact**

- **State:** the generic Info↔Skills page reducer owns direction, destination,
  source-relative scroll clock, slot preservation, and in-flight input
  rejection. Full Skills/wipe pixel acceptance remains open.
- **Did:** added the 10-tick page-transition state, RIGHT/LEFT/B gates, page
  ownership, a source-data Skills compositor, and source-extracted second
  front-pic frames. `summary-page-transition-install.json` pins accepted
  RIGHT plus rejected in-flight B at **3/3 exact**.
- **Next:** compose elapsed +3..+9 as scrolling BG1/BG2 over fixed BG3/OBJ,
  then align pagination, EXP bar, Skills text geometry, and ONIX animation;
  current settled frame 116 is **3,662 px** different. Add dense full
  RIGHT→Skills→LEFT acceptance only when all frames are exact.
- **Notes:** Info regressions **122/122 + 132/132 exact**. Tier-1
  **1273/1273** and build green. No absolute ticks, framebuffer assets,
  runtime oracle/ROM, battle/controller edits, or ROADMAP/ISSUES changes.

---
## 347 — S8 OFF duplicate-species composition: **GREEN — 52/52 exact**

- **State:** the final enumerated swap-YES UI remainder is exact across the
  staged duplicate picker, OpenMonPic, source error, close, reconstruction,
  and first fresh input. All finite Gate-2 UI fixtures are now green; ROADMAP
  remains untouched for supervisor verification.
- **Did:** corrected the dev-only stage to exercise the live duplicate branch,
  then added phase-relative direct-open window/OAM timing, PKMN error chrome,
  gray target-2 ball composition, logical-vs-loaded species-window ownership,
  popup suppression, and returned-picker copy transients.
- **Next:** supervisor verify the finite S8 gates and record stage disposition;
  do not resume canonical Battle 2 after tick 33331.
- **Notes:** duplicate **52/52**, from **1/52 / 97,450 px** to zero diff.
  Regressions: **130/130 + 66/66 + 69/69 + 44/44 + 59/59 + 113/113**.
  Tier-1 **1268/1268**, build **5.679 MB**. No logic/RNG/identity mutation,
  absolute ticks, framebuffer assets, runtime oracle/ROM, or ROADMAP edits.

---
## 346 — S8 OFF duplicate-species loaded-display repair: **GREEN PARTIAL**

- **State:** presentation preserves the source's already-loaded GROVYLE display
  while the staged logical enemy is MAGBY. Gate 2 remains open: dense audit
  improves strictly to **1/52 exact**, **97,450** aggregate differing pixels.
- **Did:** added a presentation-owned loaded-species seam and propagated it
  phase-relatively through duplicate open/close/return for name/category/pic.
- **Next:** align the bounded duplicate OpenMonPic/message/close composition
  using task/window evidence; do not alter identity or RNG ownership.
- **Notes:** improved **2,014 px**; +2 exact, +0 **243 px**, peak +27
  **4,982 px**, +51 **2,001 px**. Integrated Tier-1 **1267/1267**, build
  **5.677 MB**; ICE PUNCH **363/363**, FIRE PUNCH **225/225**. No framebuffer
  assets, RGB fitting, absolute ticks, runtime oracle/ROM, or logic mutation.

---
## 344 — S8 OFF enemy-origin swap quit: **GREEN — 356/356 exact**

- **State:** enemy picker B and enemy CANCEL now share the existing quit
  prompt/response reducer while using the source's enemy-only two-button
  teardown/reconstruction. Only duplicate-species rejection remains in the
  finite swap-YES UI audit; S8 stays open.
- **Did:** wired staggered PKMN FOR SWAP/CANCEL slide-out, default-YES
  no-mutation exit, NO/B reverse transition, install-frame rejection, and
  first fresh enemy input. Tier-1 pins source-relative gates, five actions,
  TRUE result/field handoff, immutable parties/rentals, and no round decision.
- **Next:** implement the bounded duplicate-species rejection fixture. Do not
  resume the retired canonical Battle-2 march.
- **Notes:** new B YES **65/65**, B NO **113/113**, B return **113/113**,
  CANCEL YES **65/65**; Tier-1 **1262/1262**, build **5.675 MB**. Existing
  player quit **68/68** and sampled swap regressions **69/69 + 43/43 +
  69/69 + 66/66 + 130/130 + 115/115** unchanged. No absolute tick lookup,
  framebuffer asset, mutation, or selection RNG.

---
## 343 — S8 OFF swap SUMMARY return: **GREEN — 147/147 exact**

- **State:** player popup `SUMMARY` now round-trips through the shared normal
  summary and `CB2_InitSwapScreen` to the same selected options popup. All 15
  swap windows and four terminal windows are exact. A disjoint OFF fixture
  now pins enemy-origin quit chrome; ICE PUNCH is exact through hit reaction.
- **Did:** generalized summary mode/return ownership, wired source-relative
  open/input/close gates and callback reconstruction, and rebuilt the popup
  with fresh ball clocks, default SUMMARY, four actions, and accepted DOWN.
  Tier-1 pins rejected edges, mode/index/max, callbacks, cursors, and no
  party/rental/result mutation.
- **Next:** implement enemy-origin quit chrome from its staged fixture, then
  duplicate-species rejection. Animation continues ICE at HP drain frame 2561.
- **Notes:** new SUMMARY **147/147**; prior 14 swap windows unchanged; terminal
  **210/210 + 414/414 + 2513/2513 + 1911/1911**; Tier-1 **1258/1258**,
  build **5.675 MB**. Integrated Tier-1 **1259/1259**, build **5.675 MB**;
  ICE **222/222**, FIRE PUNCH **225/225**. No absolute tick/frame lookup or
  framebuffer asset.

---
## 342 — S8 OFF enemy PKMN FOR SWAP return: **GREEN — 115/115 exact**

- **State:** enemy action 3 now returns through reusable transition-out,
  party-screen switch, and transition-in tasks to an input-ready four-action
  player picker. All 14 swap windows and four terminal windows are exact.
  A disjoint OFF fixture now pins SUMMARY's normal-mode callback round trip
  to the originating options popup; ICE PUNCH is exact through script teardown.
- **Did:** wired the source DOWN jump and accepted A dispatch, staggered
  two-button teardown, reverse three-ball cycle with independent callback
  clocks, player action reconstruction, transition palette/chrome, install-
  frame rejection, and first fresh RIGHT. Tier-1 pins task boundaries,
  5→4 actions, cursor copies, no decision, and immutable identities.
- **Next:** implement swap SUMMARY return from its staged fixture, then
  enemy-origin quit chrome and duplicate-species rejection from short staged
  OFF fixtures. Animation continues ICE at generic resolution frame 2526.
- **Notes:** new return **115/115**; prior 13 swap windows unchanged; terminal
  **210/210 + 414/414 + 2513/2513 + 1911/1911**; Tier-1 **1254/1254**,
  build **5.670 MB**. Integrated Tier-1 **1255/1255**, build **5.671 MB**;
  ICE **187/187**, FIRE PUNCH **225/225**. No absolute tick/frame lookup,
  framebuffer asset, party/rental mutation, or selection RNG roll.

---
## 341 — S8 OFF player-origin swap quit: **GREEN — 233/233 exact**

- **State:** one reusable phase-relative quit interaction covers player
  picker B and CANCEL, prompt opening/input, default-YES keep-party exit, and
  NO/B transition-in return. Four dense OFF windows are zero diff.
- **Did:** exposed the source's four player actions, wired CANCEL to the same
  quit callback as B, and added transition-out, prompt, no-picture exit/return,
  field handoff, and fresh picker input gates. Tier-1 pins rejected/accepted
  edges, TRUE result semantics, and no party/rental mutation.
- **Next:** implement enemy `PKMN FOR SWAP`, SUMMARY return, enemy-origin quit
  chrome, and duplicate-species rejection.
- **Notes:** quit YES **31/31**, NO **67/67**, B **67/67**, CANCEL+YES
  **68/68**; Tier-1 **1250/1250**, build **5.667 MB**. No absolute tick lookup,
  framebuffer asset, or Battle-2 continuation.

---

## 340 — S8 OFF seventh-win terminal continuation: **GREEN — 4424/4424 exact**

- **State:** the staged seventh-win route is gaplessly exact through exchange,
  party/status restore at +3549, save-SE wait, record menu creation at +4422,
  and first accepted default-NO input at +4424. Player-origin swap quit
  evidence now pins its prompt/YES/NO/B boundaries without a Battle-2 replay.
- **Did:** added the phase-relative exchange/restore continuation and reused one
  shared record prompt/menu reducer and renderer for LOSS and round-won.
  Tier-1 pins early-gate rejection, restore/clear, menu creation/visibility/
  input, and immutable round rules, RNG, battle index, parties, and schedule.
  ICE PUNCH's complete inward spiral is now **73/73 exact**.
- **Next:** implement the reusable player-origin quit presentation from the
  staged OFF fixture (prompt, YES exit, NO/B return). Gate 2 also retains
  SUMMARY return, enemy `PKMN FOR SWAP`, enemy quit chrome, and
  duplicate-species rejection. Animation continues at ICE frame 2412.
- **Notes:** seventh-win **2513/2513 + 1911/1911**, LOSS **210/210 + 414/414**.
  Merged Tier-1 **1245/1245**, build **5.665 MB**; ICE **73/73**, FIRE PUNCH
  **225/225**. No deferred questions. No absolute tick, framebuffer/screenshot
  asset, Battles 2–7 replay, YES recording/save branch, repeat challenge, or
  Stage 8 completion claim.

---

## 339 — S8 OFF seventh-win roundWon through fanfare: **GREEN — 2513/2513 exact**

- **State:** the staged seventh-win route is exact from its `CB2_LoadMap`
  handoff through congratulations, the BP award, `MSGBOX_GETPOINTS`, and the
  complete points-fanfare wait at +2513. A source audit confirms four
  swap-YES interaction families remain beyond the accepted canonical route.
- **Did:** connected generic `roundCompleted` to a phase-relative `roundWon`
  terminal adapter and live lobby renderer. Stored gates are +300/+1100/+2200;
  displayed BP changes 0→3 at +2201 and the 312-frame fanfare reaches zero at
  +2513 without controller, RNG, battle-index, party, or opponent mutation.
  ICE PUNCH now extends through its inward crystal spiral at **63/63 exact**.
- **Next:** continue only the source-relative seventh-win remainder at +2514:
  exchange message through party/status restore +3549, then reuse the shared
  record-question/menu machinery through +4424. Swap still needs SUMMARY
  return, quit flows, enemy `PKMN FOR SWAP`, and duplicate-species rejection;
  use staged short windows, not a Battle-2 replay.
- **Notes:** seventh-win **2513/2513**, LOSS **210/210 + 414/414**, Tier-1
  merged **1242/1242**, build **5.663 MB**; ICE **63/63**, FIRE PUNCH
  **225/225**. No deferred questions. No absolute tick, framebuffer asset,
  screenshot lookup, canonical Battle-2 extension, or premature UI claim.

---

## 338 — S8 OFF terminal LOSS record menu: **GREEN — 414/414 exact**

- **State:** the LOSS route is exact from its prior +210 completion through
  the shared record question's default-NO menu at +622 and first sampled input
  at +624. Seventh-win OFF evidence now pins the complete source-driven
  +1..+4424 timeline; Scene-ON coverage is **4 exact / 9 partial / 263
  unsupported** after the first ICE PUNCH component.
- **Did:** added a phase-relative reusable record-question transition with
  live `\l` fast-scroll, standard-window/menu chrome, stored-edge readiness,
  default NO, early-input rejection, and YES/NO/B result state. A disjoint
  fixture pins 3 BP at +2201, fanfare end +2513, restore +3549, and shared
  menu +4422/+4424. ICE PUNCH's opening palette overlay is **35/35 exact**.
- **Next:** implement the seventh-win/round-summary presentation from the
  staged fixture through the shared record menu; do not replay Battles 2–7.
  Animation continues ICE PUNCH at age 35 with the crystal spiral.
- **Notes:** LOSS continuation **414/414** and opening **210/210** exact;
  merged Tier-1 **1235/1235**, build **5.655 MB**; ICE opening **35/35**.
  No deferred questions. No absolute clock, screenshot/framebuffer harvest,
  terminal outcome mutation, or canonical Battle-2 extension.

---

## 337 — Animation dependency/composition pivot: **GREEN — 354 moves mapped**

- **State:** move acceptance remains **4 exact / 8 partial / 264 unsupported**,
  but implementation work is now source-ranked by **935** reusable components
  and **3,190** move/component edges across all **354** Emerald moves.
- **Did:** generated the animation-script call/dependency graph, added
  component leverage and related-move reporting, and introduced overlapping
  component tracks. The first track treats FIRE PUNCH as an exact punch
  chassis for ICE/THUNDER overlays without excluding those moves from other
  elemental tracks. Also fixed and pruned eight compare/probe/launcher
  papercuts.
- **Next:** animation: work the `elemental-punch` track and independently
  accept ICE/THUNDER windows. Main: implement the later LOSS record menu or
  seventh-win summary; do not resume Battle 2.
- **Notes:** graph regeneration and coverage validation are byte-for-byte
  tested. Tier-1 is **1229/1229** and build remains **5.651 MB** because the
  graph is dev-only; no gameplay/RNG/facility behavior changed.

---
## 336 — S8 OFF terminal LOSS opening: **GREEN — 210/210 exact**

- **State:** the source-relative Factory Lobby LOSS path is exact from its
  staged `CB2_LoadMap` handoff through party restore/status clear at +210.
  `compare:factory-terminal-loss` covers every +1..+210 frame and both
  source A releases at +80/+160.
- **Did:** added an immutable `roundLost` terminal adapter, circular field
  map/NPC compositor, live fade/message/printer/down-arrow path, dev-only
  wrapped mGBA comparison fixture, and Tier-1 input/completion coverage.
  Completion acknowledges the presentation command at +210 without changing
  round rules/RNG. Source extraction now includes all field-visible NPCs and
  the regular down-arrow; corrected the terminal-message extractor root. The
  disjoint ON lane also promoted ENDEAVOR to exact across both attacker sides.
- **Next:** implement the distinct later LOSS record question/menu
  (+380..624), or the seventh-win/round-summary ending. Do not extend this
  opening past +210 as part of the same mechanism and do not resume Battle 2.
- **Notes:** dense LOSS **210/210**, Tier-1 **1223/1223**, build **5.651 MB**.
  Swap NO-return remains **69/69**. ENDEAVOR is portable **141/141** and
  canonical **237/237**; Level-50 animation coverage is **4 exact / 8 partial
  / 264 unsupported**. No screenshot/framebuffer asset, absolute tick branch,
  outcome mutation, BP change, record menu, or seventh-win flow.

---
## 335 — S8 OFF accept NO/B return: **GREEN — 69/69 + 69/69 exact**

- **State:** A-on-NO and B share the source response/close/transition path and
  restore the input-ready enemy picker at response +67 / canonical 30087.
  Dense OFF traces `battle1-swap-enemy-accept-no-return.json` and
  `battle1-swap-enemy-accept-b-return.json` are both **69/69 exact**.
- **Did:** added a distinct `acceptReturn` phase with the popup BG/OAM erase
  lag, variant-B mon-picture close, staggered enemy action-button return,
  palette restore, and `Swap_Task_HandleChooseMons` gate. Tier-1 covers both
  controls, rejects response +66, accepts +67, preserves selected identities
  and byte-for-byte party/rentals, and keeps the round decision seam null.
- **Next:** implement one source-pinned S8 gate-2 terminal UI edge: loss or
  seventh-win/round-summary. Do not traverse later field/battle flow or resume
  the retired Battle-2 march.
- **Notes:** Tier-1 **1219/1219**, build **5.571 MB**. YES exit, prompt,
  enemy picker, B-close, popup, options, and player picker remain **43/43**,
  **66/66**, **130/130**, **59/59**, **44/44**, **58/58**, and **101/101**.
  No mutation, script handoff, absolute tick/frame lookup, or screenshot path.

---
## 334 — S8 OFF default-YES accept/exit: **GREEN — 43/43 exact**

- **State:** default YES is exact from the first sampled prompt edge through
  `CB2_ReturnToFieldContinueScript` at response +41 / canonical 30041. Dense
  OFF trace `battle1-swap-enemy-accept-exit.json` is **43/43 exact**; the
  input-ready accept prompt remains **66/66**.
- **Did:** added source-owned accept-response/mon-picture-close/exit phases,
  `gSpecialVar_Result=FALSE` at +20, selected-record ONIX→GROVYLE commit at
  +21, all-palette fade, and an explicit field-script handoff. Tier-1 rejects
  the +63 A, proves no early mutation, pins rental monId 188 / PID 1094072807
  / IV 3 / ability 0 / friendship 0, and opens the round decision seam only
  after the atomic commit.
- **Next:** implement one distinct remaining S8 gate-2 edge: accept NO/B
  return to enemy input at 30087, or a source-pinned loss/seventh-win ending.
  Do not extend the retired Battle-2 march.
- **Notes:** Tier-1 **1215/1215**, build **5.568 MB**. Enemy picker, B-close,
  popup, options, and player picker remain **130/130**, **59/59**, **44/44**,
  **58/58**, and **101/101**. No absolute tick/frame lookup, screenshot asset,
  canonical-party replacement branch, NO/B response, or post-handoff path.

---
## 333 — S8 OFF enemy accept prompt opening: **GREEN — 66/66 exact**

- **State:** the eligible GROVYLE branch is exact from the input-ready enemy
  picker through the input-ready YES/NO prompt at phase +64. Dense OFF trace
  `battle1-swap-enemy-accept-prompt.json` is **66/66 exact** without capture
  thinning; no YES, NO, or B response is processed.
- **Did:** modeled the selected-species copy against the prior hardware
  palette for one VBlank, corrected the later `OpenMonPic` affine/task epoch
  by two relative ticks so its full flash hands off to the gray-ball-aware
  degenerate WIN0 window, and separated immediate YES/NO BG copy from the
  next-OAM highlight. Tier-1 pins all three phase-relative boundaries.
- **Next:** implement one distinct accept response/exit seam (YES commit or
  NO/B return) with dense OFF evidence; retain the +64 input-ready boundary.
  S8 unique-UI gate 2 also still needs loss and seventh-win ending pixels.
- **Notes:** Tier-1 **1210/1210**, build **5.565 MB**. Enemy picker, B-close,
  popup, options, and player picker remain **130/130**, **59/59**, **44/44**,
  **58/58**, and **101/101**. #39 is fixed and pruned; no absolute tick,
  frame table, screenshot asset, response handling, or Battle-2 march.

---
## 332 — S8 OFF enemy accept prompt: **PARTIAL — 51/66 exact**

- **State:** eligible GROVYLE A now runs phase-relatively from the input-ready
  five-action picker through `Swap_AskAcceptMon`, the blended mon-picture
  opening, and the first input-ready `Swap_Task_HandleYesNo` boundary at
  +64. The dense OFF trace `battle1-swap-enemy-accept-prompt.json` is
  **51/66 exact**; no YES, NO, or B choice is processed.
- **Did:** added the two-button transition-out, accept text handoff at +41,
  enemy front-sprite lookup, GROVYLE aperture/sprite, YES/NO popup, and
  prompt gating. Tier-1 rejects enemy A at switch +132, accepts it at +133,
  and rejects prompt A at +63 before readiness at +64.
- **Next:** close exactly #39's 15-frame render remainder: tick 29936's
  selected-species window-copy edge, the blended-flash/gray-ball overlap at
  29978--29990, and tick 30000's first YES/NO copy/OAM transient. Then stop
  again before any prompt choice.
- **Notes:** Tier-1 **1204/1204**, build **5.562 MB**. Enemy picker, B-close,
  popup, options, and player picker remain **130/130**, **59/59**, **44/44**,
  **58/58**, and **101/101**. This is an honest partial, not S8 acceptance;
  no tick/frame lookup, screenshot, runtime oracle asset, or terminal path.

---
## 331 — S8 OFF enemy-screen switch/picker: **GREEN — 130/130 exact**

- **State:** SWAP now reaches the input-ready five-action enemy picker and
  stops before mon selection. Dense OFF trace
  `battle1-swap-enemy-picker.json` is **130/130 exact**, including the first
  accepted LEFT edge and its action-4 highlight.
- **Did:** implemented source-named `Swap_Task_SwitchPartyScreen`, three
  independent ball cycles, `Swap_InitActions(SWAP_ENEMY_SCREEN)` (3→5),
  GROVYLE/MURKROW/PIDGEOTTO identity/order, staggered PKMN-FOR-SWAP/CANCEL
  slides, labels/category/species, and
  `Swap_Task_ScreenInfoTransitionIn` → `HandleChooseMons`. LEFT/RIGHT wraps
  all five actions with category/species/OAM copy lag; the selected-ball and
  species tasks retain ownership.
- **Next:** implement the distinct eligible enemy-mon A path through
  `Swap_AskAcceptMon`; stop at its input-ready YES/NO prompt before a choice.
- **Notes:** Tier-1 **1199/1199**, build **5.556 MB**. B-close, popup,
  options, and picker remain **59/59**, **44/44**, **58/58**, **101/101**.
  No absolute-tick, battle-number, screenshot, or captured-asset path.

---
## 330 — S8 OFF popup B-close/player-picker return: **GREEN — 59/59 exact**

- **State:** the evidence-pinned B path is complete from the `playerOptions`
  ready edge through restored `HandleChooseMons` input. The dense OFF trace
  `battle1-swap-player-options-b-close.json` is **59/59 exact**; popup,
  options, and picker regressions remain **44/44**, **58/58**, and **101/101**.
- **Did:** reject B through +57, accept at +58, run source-named
  `Task_CloseMonPic` → `SpriteCB_CloseMonPic` →
  `Swap_Task_ScreenInfoTransitionIn`, and restore `playerPicker` at +113
  with RIGHT accepted at +114. The selected-ball and species-breathe tasks
  retain their own clocks; the ball callbacks now continue through the full
  source animation command stream, and generic category/species/OAM cursor
  copies retain their observed VBlank ordering. Parallel source/RAM probes pin
  the enemy accept YES commit at tick 30021 and NO/B return at 30087, and stage
  the opposite-side GROVYLE→ONIX FIRE PUNCH geometry/outcome.
- **Next:** implement the distinct SWAP transition into the input-ready enemy
  picker through canonical tick 29935; stop before accept-prompt rendering.
- **Notes:** supervisor verification is Tier-1 **1196/1196**, build
  **5.551 MB**, B-close **59/59**, portable FIRE PUNCH **225/225**. The
  opposite-side move remains evidence-only/`partial`; no deferred decision.

---
## 329 — S8 OFF popup B-close: **GREEN evidence checkpoint**

- **State:** the source-relative B-close → restored player-picker boundary is
  pinned without runtime changes. The true menu-state handoff is +57, with
  the first injectable B on the next frame (+58 / tick 29760); the generic
  return reaches `HandleChooseMons` at +113 / tick 29815.
- **Did:** captured every frame 29759--29981 from the committed prefix,
  inspected `Task_CloseMonPic`, `Swap_Task_ScreenInfoTransitionIn`, live
  task callbacks, WIN0V/DISPCNT, and proved a delayed RIGHT changes the
  restored picker cursor. Documented the separate selected-ball and
  species-breathe task ownership in
  `docs/factory-swap-player-options-b-close-probe.md`. Parallel evidence
  pins the enemy picker at mode +84, input +133, and accept-ready +197;
  the Scene-ON lane added a generic geometry/profile adapter and a portable
  ONIX→GROVYLE FIRE PUNCH case at **225/225 exact**.
- **Next:** implement only this generic phase-relative close/return seam;
  then leave the next player-picker-A/options boundary distinct. Preserve
  popup **44/44**, options **58/58**, and picker **101/101** regressions.
- **Notes:** supervisor verification is Tier-1 **1193/1193**, build
  **5.549 MB**; canonical FIRE PUNCH controls remain **227/236** (known
  residual) and **200/200**. No deferred decision or absolute-tick rule.

---
## 328 — S8 player-options popup: **GREEN — 44/44 exact**

- **State:** the source-relative player-options seam is complete through the
  settled popup and DOWN cursor response. The new dense OFF trace
  `battle1-swap-player-options-popup.json` is **44/44 exact**; prior options
  and picker traces remain **58/58** and **101/101**.
- **Did:** opened input at `playerOptions +56`, reused the mon-picture clock
  for popup text at `+58` and highlight settle at `+59`, added the one-VBlank
  logical/display cursor handoff, and dispatched A/B to `summaryFade`,
  `playerPickerReturn`, or `enemySwitch`. Screen-ball and selected-ball loops
  remain separate phase-relative clocks. Merged source-extracted terminal
  message/fanfare gates and a deterministic ONIX→GROVYLE Scene-ON FIRE PUNCH
  staging probe; the latter remains `partial`, not a pixel-acceptance claim.
- **Next:** implement exactly one next distinct path: summary fade/screen,
  popup B-close/player-picker return, or enemy-screen switch presentation.
- **Notes:** supervisor merged/verified all three lanes: Tier-1 **1189/1189**,
  build **5.547 MB**; FIRE PUNCH canonical regressions **227/236** (known
  residual) and **200/200**. No deferred decision or absolute-tick branch.

---
## 327 — S8 player-options popup handoff: **GREEN evidence checkpoint**

- **State:** the next OFF mechanism is source/oracle pinned without runtime
  changes. The popup first draws at options edge **+58** / tick **29760**
  with `SUMMARY / SWAP / RECHOOSE` and default `SUMMARY`; the controller
  input gate opens at **+56**.
- **Did:** dense edge probes prove +55 B rejected, +56 A/B accepted, DOWN at
  +79 with visible cursor response at +80, and SWAP A at +99. Documented the
  exact `Swap_Task_HandleMenu`, summary, B-close, cursor, and enemy-screen
  dispatch paths in `docs/factory-swap-player-options-popup-probe.md`.
- **Next:** implement this single popup seam phase-relatively, preserving
  `battle1-swap-player-options.json` **58/58** and the picker **101/101**.
  Stop at the next distinct summary/B-close/enemy-screen presentation path.
- **Notes:** supervisor corrected one evidence-table tick typo (`29782`, not
  `29802`) against the probe's stated +80 offset. No deferred decision; S8
  unique-UI gate 2 remains the only reset gate open.

---
## 326 — S8 swap player mon-picture reveal: **GREEN — 58/58 exact**

- **State:** `battle1-swap-player-options.json` is now **58/58 exact** from
  the selected-player A edge through the complete mon-picture aperture/reveal.
  Supervisor verification is **1178/1178**, build **5.546 MB**, the player
  picker remains **101/101**, and shared draft mon-picture regression is
  **38/38**.
- **Did:** reused the source-relative `OpenMonPic` task cadence with the swap
  screen's first-open flat flash, one-pixel WIN0 aperture, vertical reveal,
  and screen-local three-ball centers. The shared renderer keeps its existing
  six-ball defaults.
- **Next:** continue at tick **29760** / options edge **+58**, where the
  distinct settled options popup first appears. Then cover option input,
  enemy picker, accept/exit/message, and post-swap identity.
- **Notes:** S8 gates 1 and 3 remain complete; unique-UI gate 2 remains open.
  Preserve both exact swap prefixes and keep presentation clocks phase-relative.

---
## 325 — S8 reset gates 1/3 complete; swap UI advancing: **GREEN**

- **State:** the generic seven-battle core and staged OFF portability proof
  complete reset gates **1 and 3**. Gate 2 is partial: the live swap-YES
  presentation is **101/101** through the input-ready player picker and
  **36/36** through its action fade/slide. Supervisor verification is
  **1177/1177**, build **5.546 MB**, and the staged turn is **16/16**.
- **Did:** landed source-exact indexes 0–6 trainer scheduling/RNG, round
  healing/win/loss/swap/completion control, source swap/terminal contracts,
  and a relative Scene-OFF staged turn seam. Closed the swap entry and action
  transition. The ON lane closed Murkrow transfer and FLY text timing
  (`turn14-fly-miss` **206/206**), proved the seven-frame FLY affine remainder
  unsafe to patch, and narrowed DRAGON_BREATH to compressed-only overdraw.
- **Next:** continue the OFF swap options at edge **+36** / tick **29738**:
  implement the mon-picture aperture, settled options, enemy picker,
  accept/exit/message, and post-swap identity. Then render the source-extracted
  loss and seventh-win endings. Do not resume the canonical Battle-2 march.
- **Notes:** no deferred decision. S8 remains `[~]` with only unique-UI gate 2
  open. Keep all clocks phase-relative and preserve the two exact swap prefixes.

---
## 324 — S8 swap action fade/slide: **GREEN — 36/36 exact**

- **State:** `battle1-swap-player-options.json` now captures every frame from
  the selected-player A edge through the completed CANCEL offscreen slide at
  **36/36 exact**. Tier-1 is **1177/1177** and build passes (**5.546 MB**);
  the prior player-picker trace remains **101/101 exact**.
- **Did:** implemented the distinct BG2 action-text fade using exact GBA
  5-bit arbitrary-target palette math, the source `tXIncrement=6` CANCEL OBJ
  slide/window clear, and the selected ball's intervening 8-frame source
  commands. All clocks are relative to the player-options phase edge.
- **Next:** continue at edge **+36** (oracle tick **29738**), where the
  mon-picture window begins as a 1-pixel aperture, then expands before the
  settled player options popup. Preserve the 36/36 prefix.
- **Notes:** first excluded frame 29738 differs by exactly 1 pixel in the new
  mon-picture aperture. No screenshot assets, absolute ticks, battle/turn
  render branches, trace thinning, controller changes, or Battle-2 work.

---
## 323 — S8 swap player-options opening edge: **GREEN — 6/6 exact**

- **State:** the live relative adapter now carries the player-options phase
  clock into rendering and starts the selected slot-0 ball's source-table
  animation after the input-ready picker. The explicit-OFF
  `battle1-swap-player-options.json` is **6/6 exact** for every frame
  currently claimed (A edge through the last unchanged CANCEL frame).
  Tier-1 is **1175/1175** and build passes (**5.545 MB**).
- **Did:** added a phase-relative selected-ball epoch, live render wiring,
  and Tier-1 coverage. No screenshots, absolute ticks, or controller changes.
- **Next:** continue at player-options edge **+6** (oracle tick 29708):
  `SWAP_WIN_ACTION_FADE` begins fading CANCEL toward gray, followed by its
  source `tXIncrement=6` offscreen slide, then the mon-pic/popup reveal.
  Do not reuse the draft mon-pic clock from edge 0; the swap task has this
  distinct pre-reveal transition.
- **Notes:** a broader local reuse attempt was rejected and removed after
  dense comparison exposed the separate action-fade phase. Enemy picker,
  accept popup, accepted exit/message, and post-swap GROVYLE continuation
  remain open.

---
## 322 — S8 live swap-YES player-picker prefix: **GREEN — 101/101 exact**

- **State:** offer YES now enters the presentation-acknowledged swap controller;
  the explicit-OFF `battle1-swap-player-picker.json` is **101/101 exact** over
  every frame from the held offer through the input-ready player picker.
  Tier-1 is **1175/1175** and build passes (**5.545 MB**).
- **Did:** added a relative accepted-edge adapter, source-table ball motion,
  code-native/extracted picker compositor, canonical player/offered parties,
  and live input wiring. The entry gate (+99), player-options (+79),
  enemy-picker (+199), accept (+99), mutation, and preserved NO path are
  Tier-1 pinned. No screenshots or absolute-tick render branches were added.
- **Next:** extend the same state-driven adapter through player options, party
  slide, enemy picker, accept popup, accepted exit/message, and continuation.
  Do not expose hard-coded ONIX after the accepted GROVYLE mutation.
- **Notes:** the committed exact trace claims the complete entry/picker dynamic
  window only; options/enemy/accept/exit pixels and post-swap Battle-2 identity
  remain open. Controller state already reaches accepted GROVYLE.

---
## 320 — S8 OFF turn portability proof: **GREEN — 16/16 exact**

- **State:** the staged Battle-2 turn resolves through a reusable logical
  event → relative Scene-OFF command → completion-ack queue, and
  `battle2-off-turn1-staged.json` is **16/16 exact**. Tier-1 is
  **1157/1157** and build passes (**5.537 MB**).
- **Did:** added a data-driven two-action turn resolver, explicit RNG ledger,
  typed text/PP/HP/stat/turn-end/menu commands, paced OFF adapter, and staged
  next-input gate. Added dev-only named `appStage` compare metadata (stripped
  before oracle replay), compact trace inheritance, and a live primitive-based
  ONIX/KABUTO OFF compositor.
- **Next:** continue only with S8's unique swap-YES/loss/round-summary UI or
  separately scoped generation work. Do not extend the canonical ON ladder.
- **Notes:** PP **10→9 / 15→14**, KABUTO **91→63**, ONIX accuracy **6→5**,
  final RNG **3121225034**; early/out-of-order completion is rejected.

---
## 319 — S8 Factory trainer schedule/RNG port: **GREEN — source selection live**

- **State:** the generic controller has source-exact Factory trainer selection
  for battle indexes **0–6**. Tier-1 is **1152/1152** and build passes.
- **Did:** ported the scaled trainer ranges, retry/history loop, explicit RNG
  ledger, and deterministic seven-trainer schedule while preserving fixtures.
- **Next:** stage one representative Battle 2 turn through the generic OFF
  presentation seam; unique swap/end UI remains open.
- **Notes:** commits `14e9f39`, `13652f5`; no renderer or Battle-2 march.

---
## 318 — S8 generic round/presentation core: **GREEN — architecture foundation landed**

- **State:** a pure scenario-driven controller now covers battle indexes
  **0–6**; the source-exact Factory round policy is also mechanically
  extracted. Tier-1 is **1146/1146** and build passes (**5.525 MB**).
  Canonical pixel behavior remains unchanged and intentionally unwired.
- **Did:** added deterministic no-repeat opponent selection, party HP/status
  healing, win/loss/swap transitions, seventh-win completion, and typed
  presentation commands with idempotent completion acknowledgements that
  cannot mutate rules/RNG. `createInitialState({ battleScenario })` exposes
  opt-in fixtures while its default remains `null`. Added reproducible
  `factory-round-policy.json` plus a cited source dossier covering trainer/
  rental rejection rules, healing, swap mutation, and terminal counters.
  Independently, the ON animation lane closed ISSUES #33 by modeling the
  one-render OBJ-VRAM lead at Murkrow's two frame-transfer boundaries.
- **Next:** wire the extracted trainer ranges/retry policy and an explicit RNG
  port into scenario generation, then stage one OFF-profile Battle 2 turn
  through the seam. Unique swap-YES/loss/round-summary UI remains open. Do not
  resume the canonical tick-33332 march.
- **Notes:** commits `3aee24e`, `bae76ea`; tests cover seven sequential wins,
  accepted/declined swaps, inter-battle healing, deterministic no-repeat
  inputs, loss at every index, invalid transitions, and presentation
  completion/RNG isolation. Source policy extraction is `2f10f68` (merged);
  it deliberately leaves retry-draw counts and the pinned `BUGFIX` IV branch
  as explicit implementation inputs. ON regressions are `turn13-switchin.json`
  **242/242** and `turn14-fly-miss.json` **185/185**; the direct seven-frame
  RAM/VRAM verifier is also 0 diff. No OFF oracle trace or renderer work was
  performed.

---
## 317 — User-directed Stage 8 reset: **READY — finite, staged completion**

- **State:** canonical Battle 2 remains exact through tick **33331** at
  `b5be9b6`; the baseline is **1128/1128** with build green (**5.522 MB**).
  S8 is now `[~]` under a finite completion contract rather than an open-ended
  battle/turn replay.
- **Did:** retired 33332/SAND ATTACK as the next milestone; defined a generic
  seven-battle round core, unique swap/end UI, and one staged OFF-profile
  Battle 2 portability proof as the only S8 gates. Added dual oracle routing
  and main/side/animation worker-lane guidance.
- **Next:** first land the `BattleScenario`/presentation seam and generic
  round-controller state model with Tier-1 tests. Then stage a representative
  Battle 2 turn under Battle Scene OFF. Do **not** resume the canonical
  turn-by-turn ladder.
- **Notes:** main + side use `battle-scene-off` (8014); optional animation work
  uses `battle-scene-on` (8012). Historical traces default ON; every new trace
  names its profile. Both profiles pass harness smoke; `turn1-cloneanim.json`
  confirms their battle presentation diverges while the anchor SHA is shared.
  `AGENTS.md` owns lane/file boundaries.

---
## 316 — S8 Battle 2 turn 1 ROCK SLIDE: **GREEN — through 33331**

- **State:** `battle2-turn1-rockslide.json` is **191/191 exact** through the
  last ONIX-owned frame 33331. Tier-1 is **1126/1126**; build passes
  (**5.522 MB**). S8 remains `[ ]`.
- **Did:** stored A 33071, resolved ONIX first, committed PP 10→9 and the
  three-call accuracy/spread/non-flinch RNG stream, rendered the full shared
  ROCK SLIDE animation on live ONIX/KABUTO, and drained/committed KABUTO
  91→63. Pure tests pin 19→28 noncrit damage and the 33331/33332 boundary.
- **Next:** resume exactly at **33332**, where KABUTO becomes attacker with
  current move SAND ATTACK. That handoff and everything later are unclaimed.
- **Notes:** captures include every frame 33115-33181 and 33270-33331 plus
  sparse mid-animation anchors. Battle-2 action/menu/send-outs/intro/
  transition/rooms remain exact; Battle-1 send-out remains **255/256**
  (#18 only). No framebuffer lookup, harvest, fitting, or thinning.

---
## 315 — S8 Battle 2 turn 1 33030-prefix probe: **GREEN — evidence only**

- **State:** oracle-only Battle 2 first-turn evidence is committed; no
  runtime engine/test/accepted-trace changes. Baseline remains **1118/1118**
  and build green.
- **Did:** normalized `battle2-turn1.json` to the exact action-menu prefix
  ending 33030 (never inherits the later DOWN/B round trip), then fresh
  twice-ran oracle/RAM/task/bar/AI probes. Edges are A 33031 (open) and A
  33071 (confirm ROCK SLIDE); ROCK SLIDE hits KABUTO 91→63, KABUTO uses
  SAND ATTACK (ONIX accuracy 6→5, no damage), next menu reveals/input-ready
  at 33614. 169 capture manifest is twice-run identical to 33671.
- **Next:** S8 stays `[ ]`; do not implement this turn from this worker
  checkpoint without a separately assigned engine step.
- **Notes:** trace `tools/compare/traces-groundtruth/battle2-turn1.json`,
  source/RAM ledger `docs/battle2-opening-notes.md`; no fitting, harvest,
  absolute-tick lookup, capture thinning, or second-turn input.

---
## 314 — S8 Battle 2 FIGHT submenu round-trip: **GREEN — 32848-33056 exact**

- **State:** extended `battle2-action-menu-dense.json` is **209/209 exact**
  through the resettled Battle-2 action menu. Intro remains **251/251**,
  KABUTO **151/151**, player send-out **170/170**, and Battle-1 send-out
  **255/256** (#18 only). Tier-1 is **1118/1118**; build passes
  (**5.519 MB**).
- **Did:** reused generic FIGHT state/chrome/text with menu-relative clocks
  on the live JENSON field; canonical A opens ONIX's full-PP moves, DOWN
  transitions ROCK SLIDE→DRAGONBREATH, and B closes without confirming.
  Added Tier-1 pins for the 32901 A gate, moves/PP, display lag, and close.
- **Next:** S8 stays `[ ]`; continue only with a separately assigned
  Battle-2 turn, swap-YES, or later round-loop increment.
- **Notes:** canonical interaction edges: A 33031, submenu blank 33036,
  reveal 33037, DOWN 33040/display 33042, B 33044, action-menu return
  33051. Commits `33bd561`, `94f6c31`; no harvest, fitting, thinning,
  confirm, or absolute-tick framebuffer cases.

---
## 313 — S8 Battle 2 first action menu: **GREEN — 32848-33030 exact**

- **State:** `battle2-action-menu-dense.json` is **183/183 exact** across
  canonical 32848-33030, including two predecessor-overlap frames. KABUTO
  remains **151/151**, player send-out **170/170**, intro **251/251**, and
  Battle 1 send-out **255/256** (#18 only). Tier-1 is **1115/1115** and
  build passes (**5.519 MB**).
- **Did:** composed the Battle 2 field live from KABUTO/ONIX sprites and
  91/91 + 117/117 healthboxes, reusing only shared action-window chrome;
  added encounter menu state, input boundary, and on-demand RNG/exec-state
  reducers/tests. No Grovyle full-frame base or canonical-tick lookup.
- **Correction:** exact canonical replay disproves the old 32850/32856
  ledger: ONIX's inherited shake finishes 32850-32854, `Go! ONIX!` holds
  through 32894, the six clear frames are **32895-32900**, and the atomic
  input-ready menu reveal is **32901**.
- **Next:** S8 stays `[ ]`; continue only with a separately assigned Battle
  2 action/turn or swap-YES/round-loop increment. This worker stops at the
  held FIGHT menu and does not consume input.
- **Notes:** RNG is flat through 32893, then +1 at 32894, +2 at 32898, +5
  at 32900; endpoint is 3530724670 with execFlags=1. Commits `2f7b284`,
  `1d3d295`; no harvest, fitting, thinning, or absolute tick cases.

---
## 312 — S8 Battle 2 player send-out: **GREEN — 32680-32849 exact**

- **State:** `battle2-player-sendout-dense.json` is **170/170 exact**
  across canonical 32680-32849. Predecessors remain KABUTO **151/151** and
  intro **251/251**; Battle 1 send-out remains accepted at **255/256**
  (frame 1496, 3px, #18 only). Tier-1 is **1110/1110** and build passes
  (**5.517 MB**).
- **Did:** separated the handoff-relative `Go! ONIX!` printer from Battle
  2's inherited player-controller visual clock. Brendan, party summary,
  thrown-ball arc/spin/open/hide, ONIX materialize/back animation, particles,
  and the 117/117 healthbox all reuse the Battle-1 mechanisms at visual
  delay +45; callback-age 14 advances only the summary eva coefficient.
- **Audit:** independent live RAM/IO replay now proves that sole exception:
  32741 has the shared task/sprite state but immediate `BLDALPHA=0x0808`;
  mapped Battle-1 1588 has its `0x0808` write buffered behind live `0x0709`,
  reconverging at the next callback. See `battle2-opening-notes.md`.
- **Next:** resume at **32850**, the first six-tick blank action-menu frame,
  then compose the Battle 2 ONIX/KABUTO action menu. Do not reopen the exact
  send-out span. S8 remains `[ ]`.
- **Notes:** visual mappings are 32727→1574 (throw starts), 32760→1607
  (ball first visible), 32768→1615 (spin), 32805→1652 (open), and
  32820→1667 (healthbox first visible); summary eva's sole phase boundary is
  canonical 32741 / callback age 14. No harvest, absolute-tick lookup,
  fitting, thinning, or work at 32850+.

---
## 311 — S8 Battle 2 player send-out: **PARTIAL — 32680-32726 exact**

- **State:** new every-frame `battle2-player-sendout-dense.json` is
  **47/170 exact** across canonical 32680-32849: the exact prefix now reaches
  32726, immediately before Brendan's first inherited visible pose at 32727.
  Predecessors remain KABUTO **151/151**, intro **251/251**, and Battle 1
  send-out **255/256** (#18 only). Tier-1 is **1109/1109**; build passes
  (**5.517 MB**).
- **Did:** reanchored the Battle-1 player ball/materialize/healthbox clock to
  the encounter handoff, retained KABUTO after its H-slide-wobble callback,
  pinned Battle 2's separate inherited trainer/summary clock and exact
  one-glyph-per-tick `Go! ONIX!` boundary, and added three Tier-1 tests.
- **Next:** resume exactly at **32727**. Derive Brendan's inherited
  entrance/throw pose + translation and its live OAM overlap with the ball;
  then close 32727-32849 without changing the accepted clocks or entering
  the 32850 blank-menu handoff. S8 remains `[ ]`.
- **Notes:** first visible trainer callback is handoff+157, while ball spin,
  open, materialize, and permanent settle remain handoff+153/+190/+191/+240.
  The dense remainder is intentionally unthinned and not claimed exact. No
  harvest, canonical-tick lookup, RGB/coordinate fitting, or menu work.

---
## 310 — S8 Battle 2 KABUTO opponent send-out: **GREEN — 32570-32681 exact**

- **State:** `battle2-kabuto-sendout-dense.json` is **151/151 exact**
  across canonical **32531-32681**, including the assigned **112/112**
  frames 32570-32681. Battle 2 intro remains **251/251**; Battle 1 send-out
  remains its accepted **255/256** (#18 only). Tier-1 is **1106/1106** and
  build passes (**5.517 MB**).
- **Did:** encounter-parameterized trainer exit, ball/particles, affine
  materialize, summary exit, and healthbox slide; added KABUTO's real
  two-frame 101-callback H-slide-wobble, tint ownership, and literal GBA
  sine table. Pinned handoff, ball/materialize/hide, 91/91 Lv50 healthbox,
  and species-animation boundaries.
- **Next:** resume S8 at canonical **32682** with Brendan/player ball, ONIX
  materialization/player healthbox, then the Battle 2 action menu. S8
  remains `[ ]`.
- **Notes:** JENSON's particle callback stall is encounter-relative +1;
  KABUTO healthbox first appears at handoff+32 at dx=-110, holds one render,
  then advances +5. No harvest, absolute tick lookup, fitting, or thinning.

---
## 306 — Supervisor-accepted S8 Battle 2 trainer intro: **GREEN — 32280-32530 exact**

- **State:** canonical **32280-32530** is **251/251 exact**, every frame
  captured from the first visible Battle 2 framebuffer through the held,
  input-ready FISHERMAN JENSON intro before A at 32531. Battle 2 transition
  remains **249/249** and Battle 1 scene assembly remains **256/256**.
  Tier-1 is **1098/1098**; build passes (**5.496 MB**).
- **Did:** preserved encounter identity across battle-scene advances and
  parameterized the shared BattleIntroSlide3/reveal/settled trainer/text/
  cursor renderer for Fisherman Jenson. Added `battle2-intro-dense.json`
  with all 251 captures and three encounter-selection Tier-1 pins.
- **Next:** resume at canonical A **32531**; reuse the shared send-out path
  for JENSON/KABUTO, then ONIX and the composed Battle 2 action menu. S8
  stays `[ ]`.
- **Notes:** scene elapsed zero remains 32245, so the shared local visual
  clock maps first visible 1075→32280. Text starts at local 1234 for both
  encounters; JENSON's 37 characters create the visible cursor at 1272,
  while its controller first accepts input at 1274. Cursor X remains
  width-derived 123. No absolute trace-time branch/table, framebuffer
  harvest, fitting, excluded capture, or thinning. Supervisor independently
  reviewed identity preservation and shared renderer selection, then
  reverified all three traces, all 1098 Tier-1 tests, and build.

---
## 308 — Supervisor-accepted S8 Battle 2 send-out text: **GREEN — 32531-32569 exact**

- **State:** canonical **32531-32569 = 39/39 exact**, stopping one frame
  before the 32570 visual handoff; Battle 2 intro remains **251/251 exact**.
  Tier-1 is **1099/1099** and build passes (**5.497 MB**).
- **Did:** reused the stored delayed-A/send-out clock and registration lag,
  parameterized the shared printer from encounter identity as `FISHERMAN
  JENSON sent / out KABUTO!` (32 glyphs), and retained the Fisherman scene
  through both final post-text hold frames. Added the dense trace and Tier-1
  pins while preserving DESTIN/GROVYLE defaults.
- **Next:** begin at **32570** with trainer exit/ball/KABUTO materialize and
  healthbox only in a separately scoped increment. S8 stays `[ ]`.
- **Notes:** no trainer exit, ball, species, healthbox, particles, absolute
  tick lookup, framebuffer harvest, fitting, or trace thinning. Supervisor
  independently reviewed the press-relative encounter parameterization and
  reverified both traces, all 1099 Tier-1 tests, and build.

---
## 302 — Supervisor-accepted S8 postwin increment: **GREEN — NO through held guide message**

- **State:** canonical **29601-30031** now reaches the settled/input-ready
  `"Right this way, please!"` message without dismissing it. The committed
  trace is **73/73 exact**, predecessor `-scout-b` is **164/164**, Tier-1 is
  **1083/1083**, and build passes (**5.472 MB**).
- **Did:** stored logical/display swap cursor edges, reproduced the real
  one-VBlank cursor copy, accepted canonical NO at 29632, and printed the
  source guide string through the live field window/font path. Fresh sweeps
  pin early/delayed DOWN/A; a 434-row RAM audit pins unchanged healed state
  and one VBlank LCG call on every tick.
- **Next:** resume from held canonical **30031**; first eligible dismiss is
  29660, but this worker intentionally did not consume it. Dismissal,
  attendant/player walk, warp, Battle 2, battles 3-7, and round completion
  remain open; S8 stays `[ ]`.
- **Notes:** implementation/trace `7c0ebe8`; evidence/docs commit follows.
  True edges: swap input 29272; canonical DOWN 29602 (visible 29603); NO
  29632; text final 29658; message input-ready 29660. Prefix `[0:146]` is
  byte-identical. No forbidden asset/table, tick/trace branch, fitting,
  exclusion, or dynamic thinning. Supervisor independently reviewed the
  logical/display cursor handoff and edge-relative message path, then
  reverified the 73/73 trace, 164/164 predecessor, all 1083 Tier-1 tests,
  and production build.

---
## 303 — Supervisor-accepted S8 postwin increment: **GREEN — Battle 2 opening quote exact**

- **State:** canonical **30031-32031** now reaches FISHERMAN JENSON's held,
  input-ready `"MY POKéMON WILL MAKE YOU DOWNCAST"` quote without dismissing
  it. Prefix-identical traces are **225/225 + 131/131 exact**, predecessor
  decline is **73/73**, Tier-1 is **1086/1086**, and build passes
  (**5.484 MB**).
- **Did:** stored the canonical 30032 guide dismiss edge, reused the shared
  close/walk/warp/camera/room/message machinery, source-selected Fisherman
  gfx + JENSON's Easy Chat quote, and modeled the returning attendant's real
  standard-animation alternation. Fresh RAM pins room/sprite boundaries and
  relative +109/+110 RNG bursts.
- **Next:** resume from held **32031**; freshly bisect the quote-dismiss
  gate, then implement Battle 2's trainer-intro transition toward the first
  action menu. This worker intentionally did not dismiss the quote. Battle
  2+, swap YES, and round completion remain open; S8 stays `[ ]`.
- **Notes:** implementation/traces `e149116`; evidence/docs commit follows.
  Every dynamic frame 30031-30382 is captured, with byte-static anchors
  through 32031. Gate: frame 29660 ready/first accepted press start, stored
  edge 29661; canonical starts 30031/stores 30032. No forbidden asset,
  lookup/table, tick/trace branch, fitting, exclusion, or thinning. Supervisor
  independently reviewed the cross-layer state/render/RNG handoff, then
  reverified both new traces, both regressions, all 1086 Tier-1 tests, and
  production build.

---

## 301 — Supervisor-accepted S8 postwin increment: **GREEN — GO ON through swap prompt ready**

- **State:** canonical **26009-29601** is extended through the held,
  input-ready swap-offer YES/NO prompt. Adjacent traces are **171/171 +
  164/164 exact**, with every dynamic tick captured; predecessor is
  **216/216 exact**. Tier-1 is **1080/1080** and build passes
  (**5.471 MB**).
- **Did:** stored canonical GO ON/page edges, ported all three source scouting
  strings and swap offer through live field window/font pipelines, separated
  swap text settle/menu-visible/input-ready, and pinned the edge-relative
  five-call GO ON RNG burst under continuing VBlank ownership. Fresh paired
  input sweeps and a compact RAM/task ledger pin readiness.
- **Next:** resume after **29601** with canonical YES at 29602 or NO-path
  selection; this worker intentionally stopped before choosing. Swap UI/
  decline, Battle 2, battles 3-7, and round completion remain open; S8 stays
  `[ ]`.
- **Notes:** implementation `9b747fe`, dense traces `a542eb8`; evidence/docs
  commit follows this entry. True accepted A ticks: menu 26009, scouting
  28074/28476/28874, swap 29272 (text final 29265, menu visible 29268).
  Ground-truth segments `[0:146]` are byte-identical. No forbidden frame
  asset/table, canonical-tick branch, fitting, exclusion, or thinning.
  Supervisor independently reviewed the stored-edge state/RNG/render paths
  and reverified the 171/171 + 164/164 traces, 216/216 predecessor, all
  1080 Tier-1 tests, and production build.

---

## 300 — Supervisor-accepted S8 postwin increment: **GREEN — heal dismiss through next-match input ready**

- **State:** canonical dynamic ticks **25800-26009** are gaplessly
  **210/210 exact**, with six earlier static-hold anchors; the committed
  trace is **216/216**. `battle1-postwin-heal.json` remains **199/199**.
  Tier-1 is **1076/1076** and build passes (**5.469 MB**).
- **Did:** made the ~2000-frame heal hold a genuine stored A gate, modeled
  source `MUS_HEAL`/`waitfanfare` timing, atomic party HP restoration
  `[0,27,153]→[117,138,153]` at dismiss+163, box clear, 36-glyph next-match
  printer, and the source-tile four-choice menu through its true +207 input
  boundary. Early/delayed edges and VBlank RNG ownership are Tier-1 pinned.
- **Next:** resume after canonical **26009** if extending the input-ready
  menu hold, or at the canonical GO ON A **28002**. Scouting pages, swap
  paths, Battle 2, and the round loop remain open; S8 stays `[ ]`.
- **Notes:** implementation `dd76bc1`, dense trace `ef43ad6`. Fresh RAM dump
  is byte-identical to the committed 6007-row ledger; fresh DOWN sweep proves
  26008 is visible-but-rejecting and 26009 first accepts input. No forbidden
  framebuffer asset/table, absolute-tick/trace branch, fitting, exclusion,
  or dynamic capture thinning. Supervisor independently reviewed the
  edge-relative state/render path and reverified the 216/216 new trace,
  199/199 predecessor, all 1076 Tier-1 tests, and production build.

---

## 299 — Supervisor-accepted S8 first postwin increment: **GREEN — loss dismiss through heal prompt exact**

- **State:** canonical `23602--23800` is **199/199 exact**, every tick
  captured in `battle1-postwin-heal.json`; `turn17-rung8b.json` remains
  **118/118**. Tier-1 is **1073/1073** and build passes (**5.465 MB**).
- **Did:** added the real no-cursor DESTIN quote gate/stored edge,
  source-relative fast fade, battle teardown and +43 `inBattle`/RNG-mode
  handoff, battle-room flash, second black hold, counter-room fade/attendant
  composition, and both heal-message lines through the true +194 input
  boundary. State pins challenge battle 0→1 at +79 and opponent rental IDs
  `[188,184,135]` at +137.
- **Next:** resume at **23801** only if extending the held prompt, or at the
  explicitly out-of-scope heal dismiss **25802** for the next S8 slice;
  delayed party heal write 25965, continuation menu, swap flow, and battle 2
  remain untouched. S8 stays `[ ]`.
- **Notes:** implementation `258e7ad`, dense trace `df718a9`, RNG ownership
  correction `f32bddb`. The latter keeps VBlank RNG live through battle
  setup, applies the RAM/source-relative opponent-generation draws, and
  freezes only at `CB2_InitBattleInternal`, not the speech edge. Fresh
  23792-23796 input sweeps prove 23796 first accepts; a fresh RAM rerun
  exactly matches the committed RNG dump. All timing is dismiss-relative;
  no forbidden baked frame/table, absolute-tick/trace branch, fitting,
  exclusion, or thinning. Supervisor independently reverified the dense
  window, predecessor, verifier, full Tier-1 suite, and production build.

---

## 293 — Bounded worker (S7 turn 17 rung 3): **GREEN — FAINT_ATTACK resolution exact**

- **State:** canonical `22075--22217` is **143/143 exact**, every tick
  captured. Turn-17 rungs 2/1 remain **221/221** and **118/118**;
  `verify-turn17.ts` passes all **245** checks; Tier-1 is **1052/1052** and
  build passes (**5.458 MB**).
- **Did:** parameterized the shared tail by the actual `79→27` HP delta,
  reproducing wobble/blink, visible drain, tick-22168 atomic HP write,
  secondary/accuracy/crit/damage RNG, battler/target/currentMove and PP
  handoffs, plus FIRE_PUNCH text/controller lead-in. Committed dense
  `turn17-rung3.json`.
- **Next:** resume at **22218**, freshly proven as the first
  FIRE_PUNCH-animation-owned displayed state. Animation body, lethal hit,
  faint/WIN flow, and later ticks remain untouched; #38 stays parked.
- **Notes:** implementation commits `d147fa6` and `ff3bc44`. Fresh
  `gBattleBufferA`/animation RAM plus source corrected the expected ~22197
  endpoint: PRINTSTRING still owns that lead-in; MOVEANIMATION queues at
  22216 and `gAnimScriptActive` first displays at 22218. No forbidden
  framebuffer/absolute-tick/per-frame/trace-fitting mechanism or excluded
  capture. Supervisor independently reverified the dense window, predecessor
  rung, turn-17 verifier, full Tier-1 suite, and production build; ROADMAP
  status accepted. S7 remains `[~]`.

---
## 291 — Bounded worker (S7 turn 17 rung 1): **GREEN — dispatch prefix exact**

- **State:** canonical `21736--21853` is **118/118 exact**, every tick
  captured. Turn-16 rungs 5/4 remain **175/175** and **155/155**; verifiers
  pass **233/233** (turn 16) and all turn-17 checks (**245 captures**);
  Tier-1 is **1048/1048** and build passes (**5.457 MB**).
- **Did:** added honest turn-17 epoch/redraw state, preserved MAGBY
  `79/138` and MURKROW `58/142 BRN`, reopened FIRE_PUNCH at `14/15` PP,
  accepted the 21801 confirm, and pinned MURKROW-first ownership,
  FAINT_ATTACK currentMove, no-crit RNG, and the RAM `52` damage roll.
  Added a direct source-accurate burned-physical-damage regression and
  committed dense `turn17-rung1.json`.
- **Next:** resume at **21854**, confirmed as the first FAINT_ATTACK
  animation-owned render. Animation body, HP drain, FIRE_PUNCH response,
  faint/WIN flow, and everything later remain untouched; #38 stays parked.
- **Notes:** implementation commit `210ace5`; all scheduling derives from
  the stored turn-16/17 confirmation and redraw ages. No absolute battle
  tick, framebuffer/screenshot asset, per-frame table, trace branch,
  coordinate/RGB fitting, or excluded capture. Supervisor independently
  reverified the dense window, both oracle verifiers, full Tier-1 suite, and
  build; ROADMAP status accepted. The dossier's old burn-halving inference
  is corrected: DARK is special in Gen 3, so the exact 52 is variance.

---
## 290 — Bounded worker (S7 turn 16 rung 5): **GREEN — turn complete**

- **State:** canonical `21561--21735` is **175/175 exact**, every tick
  captured. Rung 4 is **155/155**, rung 3 **236/236**, rung 2b **123/123**,
  rung 2a **221/221**, rung 1 canonical/delayed **81/81** each, verifier
  **233/233**, Tier-1 **1040/1040**, and build (**5.456 MB**) pass.
- **Did:** completed the typed/held burn-residual message, reused the source
  Status_Burn flames, applied `floor(142/8)=17`, drained MURKROW `75→58`
  with BRN retained, committed HP at 21714, reproduced both tail AI/RNG
  boundaries, then cleared/redrew into turn 17's freshly-bouncing action
  menu. Committed dense `turn16-rung5.json`.
- **Next:** S7 may resume at **21736** with the already-settled turn-17
  action menu; turn-17 selection/resolution was explicitly out of scope.
  Do not reopen exact turn-16 rungs 1--5; #38 remains parked.
- **Notes:** implementation commit `5cbcd69`; all timing is local
  FIRE_PUNCH/action-menu age. No forbidden framebuffer, absolute-tick,
  per-frame table, trace branch, fitted color/coordinate, or excluded capture.
  Supervisor independently reverified the dense tail, predecessor rung,
  verifier, full Tier-1 suite, and build; the ROADMAP status is accepted.

---
## 289 — Bounded worker (S7 turn 16 rung 4): **GREEN — burn proc + BRN badge**

- **State:** canonical `21406--21560` is **155/155 exact**, every tick
  captured. Rung 3 is **236/236**, rung 2b **123/123**, rung 2a **221/221**,
  rung 1 canonical/delayed **81/81** each, verifier **233/233**, Tier-1
  **1037/1037**, and build (**5.455 MB**) pass.
- **Did:** added local-age atomic HP/status/RNG/reset state, the source/RAM
  three-flame burn animation, exact burned/residual-message handoff, and the
  reusable opponent BRN compositor including `HEALTHBOX_GFX_0/65` end caps.
  Committed dense `turn16-rung4.json`; closed and deleted ISSUE #16.
- **Next:** resume S7 at canonical **21561** with the already-started burn-
  residual message, then residual HP damage/turn-end. Do not reopen exact
  turn-16 rungs 1--4; #38 remains parked.
- **Notes:** implementation commit `f7a8629`; every-tick comparison corrected
  the old dossier/verifier label: first burned-message `F` is 21453, while
  21465 is only its cited partial-text SHA. No forbidden pixel/trace mechanism
  or excluded capture. Supervisor independently reverified the dense window,
  predecessor rung, verifier, full Tier-1 suite, and production build; the
  factual ROADMAP status note and ISSUE #16 deletion are accepted.

---
## 288 — Bounded worker (S7 turn 16 rung 3): **GREEN — complete FIRE_PUNCH cast**

- **State:** canonical `21170--21405` is **236/236 exact**, every tick
  captured. Rung 2b remains **123/123**, rung 2a **221/221**, rung 1
  canonical/delayed **81/81** each, turn-16 verifier **233/233**, Tier-1
  **1034/1034**, and build (**5.454 MB**) pass.
- **Did:** source-extracted FIRE_PUNCH's shared ember and fist assets and
  added confirmation-relative reducers for target red blend/restore, four
  spiral embers, fist + hitsplat, target shake, seven spread embers with
  RAM-backed stable OAM ordering, generic hit wobble/blink, and the visible
  `142→75` HP drain. Committed dense `turn16-rung3.json`.
- **Next:** resume S7 at canonical **21406**, FIRE_PUNCH's atomic opponent-HP
  write. Secondary burn roll/message, BRN badge, burn residual, and turn-end
  are also untouched; #38 remains parked.
- **Notes:** implementation commit `acd37de`; no framebuffer/screenshots,
  absolute-tick lookup, per-frame pixel/SHA table, trace branch,
  coordinate/RGB fitting, or excluded capture.

---
## 287 — Bounded worker (S7 turn 16 rung 2b): **GREEN — FAINT_ATTACK resolution tail**

- **State:** canonical `21047--21169` is **123/123 exact**. Rung 2a remains
  **221/221**, rung 1 canonical/delayed remain **81/81** each, turn-16
  verifier **233/233**, Tier-1 **1028/1028**, and build (**5.432 MB**) pass.
- **Did:** added confirmation-relative post-hit wobble/blink reducers,
  parameterized 1-HP/tick MAGBY drain `138→79`, atomic battle-HP and
  zero-chance secondary-roll state, then the target/current-move/attacker
  handoff and FIRE_PUNCH accuracy/text boundary. Committed the dense
  prefix-exact `turn16-rung2b.json`.
- **Next:** resume S7 at canonical **21170**, the first FIRE_PUNCH
  animation-owned frame. Do not reopen exact turn-16 rungs 1, 2a, or 2b;
  #38 remains parked.
- **Notes:** implementation commit `a24b857`; first FIRE_PUNCH text pixels
  are `M`/`MA` at 21168/21169, while the cast animation begins at 21170.
  No absolute-tick lookup, framebuffer asset, per-frame table, RGB/coordinate
  fitting, trace branch, or excluded capture. Supervisor independently
  reverified every number above. A second false usage-limit digest matched
  project text inside a successful structured command event; detection now
  parses only provider failure events, with both positive and negative logs
  checked.

---
## 286 — Supervisor wind-down (S7 turn 16 rung 2a): **CANONICAL GREEN; +30 REGISTER-RACE FRAME PARKED AS #38**

- **State:** canonical `20826--21046` is **221/221 exact**. The requested
  delayed twin is **220/221**: only delayed tick **21006** differs. Rung 1
  remains **81/81** each, frozen send-out rung 6 **195/195** each,
  turn-16 verifier **233/233**, Tier-1 **1024/1024**, and build
  (**5.430 MB**) pass.
- **Did:** implemented source-extracted `BG_DARK`, BG3 darken/restore,
  Murkrow's source sine ellipse and alpha handoffs, Magby shake, and the
  generic hitsplat; added pure boundary reducers/tests and a dense,
  prefix-verbatim canonical trace. A fresh two-oracle SHA comparison and
  direct RAM/register probes falsified relative identity at age 150:
  animation task state is identical, but canonical hardware `BLDALPHA` is
  `0x0e02` while delayed is `0x0d03`.
- **Next:** resume S7 at canonical **21047** with FAINT_ATTACK's HP-drain/
  move-handoff tail. Do not reopen exact canonical rung 2a; #38 parks the
  extra delayed-control frame unless a general cycle/register-queue model is
  introduced.
- **Notes:** implementation/evidence commit `d74ab10`; the delay sweep
  `+0..+8,+15,+16,+30,+31,+32` reproduced the early register exposure only
  at +30. No framebuffer assets, per-frame tables, RGB/coordinate fitting,
  absolute-tick lookup, trace branch, or red delayed trace was committed.
  Supervisor independently reverified every number above. The launcher's
  first post-run verdict was a false usage-limit positive: its broad regex
  matched `--no-rate-limit` inside a late `ps` listing; no provider limit
  occurred, and the detector is now hardened.

---
## 284 — Bounded worker (ISSUES #37 rung 6): **GREEN — issue closed**

- **State:** canonical `20551--20745` and delayed `20581--20775` are both
  **195/195 exact**. Rung 5 remains **144/144** each, rung 4a **16/16** each,
  verifier **17/17**, Tier-1 **1018/1018**, and build (**5.414 MB**) pass.
- **Did:** added the confirmation-relative six-frame blank-message phase,
  honest action-menu phase, fresh `menuIdleBounce` re-anchor, and dynamic
  standard-font `MAGBY do?` prompt; committed both contiguous 195-frame traces.
- **Next:** supervisor chooses the next open roadmap/issue increment; #37 has
  no remainder through its scoped frame 20745/20775 endpoint.
- **Notes:** implementation commit `61b4a5e`; unmodified A/B was **0/195**
  each. No screenshots, absolute ticks, per-frame tables, coordinate/RGB
  fitting, trace branches, or excluded captures.

---
## 283 — Bounded worker (ISSUES #37 rung 5): **GREEN — MAGBY healthbox/send-out**

- **State:** canonical `20407--20550` and delayed `20437--20580` are both
  **144/144 exact**. Rung 4a remains **16/16** each, verifier **17/17**,
  Tier-1 **1017/1017**, and build (**5.413 MB**) pass.
- **Did:** added a data-driven player-healthbox compositor (MAGBY, Lv50,
  female, 138/138), confirmation-relative create/populate/110→0 slide, and
  source `BACK_ANIM_SHAKE_GLOW_RED` reducer. Preserved the release particle
  stall/order and added task-data probing plus dense canonical/delayed traces.
- **Next:** #37 rung 6 starts at blank-box ownership: canonical **20551**,
  delayed **20581**. Build the blank hold and re-anchored action-menu bounce;
  do not reopen exact rungs 1--5.
- **Notes:** unmodified A/B was **0/144** each; no screenshots, per-frame RGB,
  absolute battle-tick tables, coordinate patches, or trace branches.

---
## 282 — Bounded worker (ISSUES #37 rung 4a): **GREEN — MAGBY release**

- **State:** canonical `20391--20406` and delayed `20421--20436` are both
  **16/16 exact**. Frozen rung-2 traces remain **43/43** each and rung-3
  traces **46/46** each. Tier-1 **1012/1012** and build (**5.409 MB**) pass.
- **Did:** landed a SEND-OUT-relative release reducer (logical tick 0 at
  elapsed 145) that parameterizes the initial ONIX affine materializer and
  turn-5 clean particle/palette-fade mechanisms for MAGBY. Raw BG banks use
  source `BlendPalette`; player terrain occlusion remains at the established
  row 112 boundary. Committed dense canonical/delayed 16-frame traces.
- **Next:** #37 rung 5 begins with healthbox ownership at canonical **20407**
  (delayed **20437**). Do not reopen exact rung 1--4a windows.
- **Notes:** commit `3222c92`; no per-frame assets, absolute-tick lookup,
  screenshot harvesting, coordinate fitting, or trace-specific branching.

---
## 281 — Uninterrupted supervisor policy: **GREEN**

- **State:** game code and accepted rung-3 renderer are unchanged. The latest
  full verification remains Tier-1 **1011/1011**, build (**5.400 MB**), and
  deadline-helper tests **5/5** green.
- **Did:** made both Claude and Codex supervisors autonomous through the full
  cap: they exercise best judgment instead of asking mid-session, record only
  genuinely unsafe-to-guess decisions in `DEFERRED.md`, continue independent
  safe work, and summarize deferred questions at wind-down. An open deferred
  entry now blocks the next supervisor launch for both providers.
- **Next:** resume #37 rung 4a under the existing Codex tier policy; do not
  interrupt the session for judgment calls.
- **Notes:** `ISSUES.md` remains the confirmed bug/debt backlog.
  `DEFERRED.md` is currently empty. Direct sessions without injected model
  metadata use `Agent-model: unknown` rather than guessing.

---
## 280 — Codex supervised-run hardening: **GREEN**

- **State:** game code and accepted rung-3 renderer are unchanged. Tier-1
  **1011/1011**, build (**5.400 MB**), and deadline-helper tests **5/5** are
  green.
- **Did:** made Codex workers default to Sol/medium, added supervisor-directed
  Sol/high escalation for cross-layer or failed repairs, enforced Codex caps
  over the full process group, separated JSONL from stderr, fixed managed
  launch instructions, and added clean-start/commit/clean-finish checks plus
  Codex-only anti-overfit acceptance guardrails. Claude defaults and launch
  behavior remain unchanged.
- **Next:** resume #37 rung 4a under a Sol/high Codex supervisor. The authorized
  repair qualifies for a Sol/high worker; ordinary later implementation should
  return to Sol/medium.
- **Notes:** keep the supervisor at Sol/high. Both Codex launchers cap Sol at
  high; Terra/xhigh remains available only as an explicit override; max and
  ultra are refused.

---
## 279 — Supervisor wind-down (ISSUES #37 rung 4a): **GREEN, RETRY AUTHORIZED**

- **State:** accepted rung-3 renderer is unchanged and the tree is clean.
  Supervisor Tier-1 **1011/1011** and build (**5.400 MB**) remain green; the
  six frozen traces were exact at the preceding checkpoint.
- **Did:** a second consecutive worker did not land rung 4a. It confirmed the
  particle ownership as OAM slots 5--16, palette 7, tiles 417--419 around
  (68,117), but its 38-minute cap failed to stop it and it produced no commit;
  supervisor interrupted it during deadline wind-down.
- **Next:** resume with one narrow worker deriving the
  stagger/identity reducer from those transferred OAM rows, still requiring
  canonical/delayed 20391--20406 to be 16/16 exact before healthbox work.
- **Direction:** user authorized one more OAM-derived rung-4a repair attempt
  in the next supervised session.
- **Notes:** no uncommitted worker edits existed when stopped. Worker logs:
  `/tmp/warm-bison-sendout-rung4a.jsonl` and `...-repair.jsonl`.

---
## 278 — Supervisor accepted (ISSUES #37 rung 4a): **GREEN EVIDENCE CHECKPOINT**

- **State:** renderer remains at accepted rung-3 baseline; independent Tier-1
  **1011/1011** and build (**5.400 MB**) are green. Worker also reconfirmed all
  six frozen traces exact, verifier **17/17**, and compositor **5/5**.
- **Did:** accepted the direct boundary and rejected the non-exact prototype:
  MAGBY allocates at 20389, first owns pixels at **20391**, and the healthbox
  first owns pixels at **20407** (all delayed +30). Best lawful reuse was 9/16.
- **Next:** #37 rung 4a repair only: inspect transferred affine and particle
  OAM/order/palettes on 20396--20402, then require both 16-frame traces exact.
- **Notes:** no production, asset, extractor, or trace change survived the
  checkpoint. PAPERCUT: mGBA probe stdout spew, ~3 min.

---
## 277 — Bounded worker (ISSUES #37 rung 4a): **CHARACTERIZED, NOT LANDED**

- **State:** no renderer change committed. Direct canonical OAM/VRAM probe
  confirms MAGBY's affine allocation at 20389 but first framebuffer ownership
  at **20391**; the clean particle callback is already staggered there. The
  forbidden player-healthbox boundary remains **20407** (delayed +30).
- **Did:** tested a `sendOutElapsed`-anchored reuse of MAGBY's battle-back,
  emerge/tint, BG ramp and clean particles. It reached 9/16 exact at best;
  20396--20402 retain small, uncharacterized affine/particle residuals, so
  the prototype and its traces were removed rather than curve-fit.
- **Next:** rerun the direct probe narrowly over 20396--20402 with transferred
  affine OAM plus particle OAM ordering/palette evidence before another rung-4a
  implementation. Do not enter healthbox, clear, or menu work.
- **Notes:** baseline restored clean before final verification. PAPERCUT:
  direct OAM probing emits multi-megabyte mGBA diagnostics for a 4.8MB JSON,
  ~3 min.

---
## 276 — Supervisor accepted (ISSUES #37 rung 3): **GREEN — forced-switch player ball**

- **State:** canonical/delayed rung-3 traces 46/46 exact; party 200/200 and
  rung-2 43/43 frozen traces exact. Tier-1 1011/1011 and build green.
- **Did:** direct evidence identified slot 6 as the player Poké Ball and
  landed its confirmation-relative closed/spin path through 20390.

---

## 275 — Supervisor accepted (ISSUES #37 rung 2): **GREEN — field fade + complete MAGBY text only**

- **State:** canonical/delayed rung-2 traces 43/43 exact; frozen party traces
  200/200. Tier-1 1010/1010 and build green.
- **Did:** confirmation-relative 20302 indexed field fade and `Go! MAGBY!`
  text; first visible ball ownership established at 20345.

---

## 274 — Supervisor accepted (ISSUES #37 rung 1): **CLOSED — raw split exit OBJ composition**

- **State:** canonical/delayed dense party traces 200/200 exact; 20302/20332
  raw field boundary exact. Tier-1 1009/1009, build, verifier 17/17,
  compositor 5/5 green.
- **Did:** raw BGR555/OAM exit compositor with balls → icons → status and
  transparent ownership fixed.

---

## 273 — Supervisor accepted (ISSUES #37 rung 1): **GREEN EVIDENCE CHECKPOINT**

Archived from `PROGRESS.md`; direct OAM established balls 6--9 behind icons
3--5 and status 1--2 in front. The later accepted 274 entry records its
full raw-compositor closure.

---

## 272 — Supervisor accepted (ISSUES #37 rung 1): **CLOSED FIELD BOUNDARY — GREEN**

- **State:** independently accepted: canonical and delayed party traces are **193/200**; 20302 and
  delayed 20332 are byte-exact. The only red frames are party residuals:
  5px at 20248/50/58/60/62 and 273px at 20253/54 (delayed +30). Tier-1 is
  **1008/1008**; build is **5.393 MB** (<6 MB); verifier **17/17** and
  party compositor **5/5**.
- **Did:** regenerated the 73KB raw indexed 20302 asset from direct PPU
  state (BG size-1 maps are 0x1000); wired it only at SEND OUT's
  press-relative battle-fade boundary; removed the stale faint-frame/
  `fadeTurn15BattleFirstFrame` approximation. Captured OAM affine matrices
  from transferred OAM, added affine compositing, and corrected mGBA's
  packed-RGB darken transfer.
- **Next:** #37 rung 1 has only the seven named party residuals left; do not
  reopen the exact 20302 field boundary. Later SEND OUT animation rungs stay
  separately scoped.
- **Notes:** supervisor reran both dense compares, Tier-1 **1008/1008**, build,
  verifier **17/17**, and compositor **5/5**; asset audit confirms indexed
  PPU inputs only. Direct probe exits 139 after valid JSON. Initial raw integration
  exposed a 1551px MURKROW shift (bbox 123,0–196,71); transferred affine
  geometry resolved it to 0px without a coordinate patch.

---

## 271 — Bounded worker (ISSUES #37 rung 1): **GREEN TRANSFER CHECKPOINT — raw field asset next**

- **State:** safe baseline retained: canonical/delayed **192/200**; the same
  seven party frames plus 20302/20332 remain. Tier-1 **1007/1007**, build
  **5.32 MB**, verifier **17/17**, party compositor **5/5**.
- **Did:** replaced the misleading 5-bit BLDY helper with source-pinned mGBA
  expanded packed-RGB `_darken` semantics (tests pin white `16,15,15` and a
  non-white BGR555 case); corrected the size-1 text-BG map capture to 0x1000.
- **Next:** run direct 20302 probe, regenerate the compact indexed asset, wire
  it only at the party send-out battle-fade boundary, then compare both traces.
- **Notes:** Tier-1 PPU test and build green. The direct probe can validly
  write JSON despite its expected mGBA teardown SIGSEGV.

---
## 269 — Bounded worker (ISSUES #37 rung 1): **GREEN CHECKPOINT — raw field asset still required**

- **State:** restored and committed-green at the existing rung-1 checkpoint:
  canonical **192/200** (5px 20248/50/58/60/62; 273px 20253/54; 38400px
  20302). The palette-only experiment did not reduce this set safely.
- **Did:** re-ran the direct probe (valid 1.5 MB JSON despite expected exit
  139) and traced the five pixels to the top MAGBY/status overlap and the
  273px family to party-menu ball bank1/index15. A direct blue substitution
  merely shifted that family to 20252/53; swapping the screenshot overlays
  expanded it into 13--204px sprite diffs. Both were reverted.
- **Next — SUPERVISOR DECISION:** the authorized worker stopped before the
  central field task, so split it out: extract/compose BG char/map/palette +
  field OAM for 20302 only and improve both traces **192→193/200**. Party-
  menu OAM/palette residuals are a later increment. Do not use screenshot,
  overlay/mask, or RGB-candidate fitting.
- **Notes:** no production changes shipped. PAPERCUT: valid mGBA probe ends
  SIGSEGV 139, ~3 min.

---

## 268 — Bounded worker (ISSUES #37 rung 1): **GREEN PROBE CHECKPOINT — exact palette/field blocker**

- **State:** baseline green: Tier-1 **1005/1005**, build **5.32 MB**;
  party traces **192/200** (five 5px frames, two 273px frames, 20302 red).
- **Did:** captured direct palette/OAM/BG/VRAM state and documented that
  20302 is `DISPCNT=1f40`, with BG3 charbase 2/screenbase 26.
- **Next:** compose the raw register-derived field without timing changes or
  screenshot/color fitting.

---
## 267 — Bounded worker (ISSUES #37 rung 1): **GREEN CHECKPOINT — palette source blocker**

- **State:** Tier-1 **1005/1005**, build **5.32 MB**, verifier **17/17**,
  compositor **5/5**; both party traces **192/200** with the same residuals.
- **Did:** banked SEND OUT-edge-relative hold/fade/black timing and live
  chrome/icon rendering; no absolute tick branch or full-screen replay.
- **Next:** probe real palette/OAM state before corrective field work.
- **Notes:** residuals: 5px at 20248/50/58/60/62, 273px at 20253/54, full
  frame at 20302. PAPERCUT: verbose compare output, ~2 min.

---
---
## 266 — Bounded characterization worker (ISSUES #37 post-SEND OUT): **READY FOR IMPLEMENTATION**

- **State:** **SUPERVISOR ACCEPTED** — post-confirm path is oracle/RAM-
  characterized only; no `src/` engine change. Independently reproduced
  **17/17 PASS** over 316 fresh dense oracle captures; party canonical +
  delayed remain **143/143**, Tier-1 **1004/1004**, build green.
- **Did:** added `docs/turn15-sendout-notes.md`, dense pixel verifier and
  RAM/OAM/VRAM dump. Pinned confirm/fade/black, field/text, Brendan+ball,
  particles/MAGBY tint, healthbox 268→158 slide, blank 20551–56, settled
  menu 20557 + bounce; recorded exact primitive-by-primitive reuse map.
- **Next:** implement #37 rung 1 only (submenu exit/fade/black), using its
  documented dense capture range; preserve no absolute tables/assets rule.
- **Notes:** RAM settles MAGBY 138/138, PP 15/20/10/20, cursor 0; healthbox
  pieces 1/63/62 slide -5 px/tick. PAPERCUT: mGBA emits megabytes of
  diagnostics unless redirected, ~2 min.

---
## 265 — Bounded worker (ISSUES #37 entry residual): **CLOSED — user-authorized probe outcome**

- **State:** committed at `d0f843c`; direct sprite/VRAM/palette probe closed
  the eight initial-icon residuals; canonical + delayed dense compares were
  **143/143**, composite **5/5**, and Tier-1 **1004/1004**.
- **Did:** BAYLEEF slot 8 stayed live through black; source frame1 bytes
  reached OBJ VRAM one VBlank after command advance and owned 20061--68.
  Added matching source-erased `listOnixFrame1` chrome; no coordinate patch,
  absolute branch, or replay asset.

---
## 264 — Bounded worker (ISSUES #37 entry transition): **CHECKPOINT — OBJ ownership narrowed to BAYLEEF's initial icon frame**

- **State:** committed at `c13f645`; supervisor independently reproduced
  `npm test` **1003/1003**, build green (production JS **5.16 MB**), composite
  **5/5 PASS**. Both dense compares are **135/143** (same eight residual
  frames, delayed +30).
- **Did:** corrected the press-relative phase boundary and added source-derived
  OAM ownership masks. All fade-out frames became exact; only fade-in
  20061–68 retained 48px.
- **Next:** user authorized a third, probe-first attempt; direct BAYLEEF OBJ
  evidence subsequently closed this in entry 265.
- **Notes:** no coordinate patch or absolute-tick branch.

---
## 262 — Bounded worker (ISSUES #37 icon/OAM half): **CLOSED** — live icon-free party compositor; canonical + delayed traces **62/62, 0 diff**

- **State:** `npm test` **1001/1001**, `npm run build` green; production JS
  **5.16 MB** (<6 MB). `composite-party-menu.ts` **5/5 PASS, 0/38400 each**.
- **Did:** Regenerated persistent chrome with every source icon/status texel
  erased; production redraws source-extracted ONIX/MAGBY/BAYLEEF + BAYLEEF
  status OBJ over it from `PartySelectState.elapsed/cursor`, including
  selection panel state, 30/31 ONIX hop, full-icon 7/8 frame cadence, and
  the documented two-frame stall. Added Tier-1 layer/schedule tests. Both
  party traces gained 16 representative ONIX/MAGBY selected plateau captures
  (**46→62**) and remain 0 diff.
- **Next:** ISSUES #37 only: 80-frame entry fade/black and post-SEND-OUT
  ball/materialization/healthbox/menu. Keep per-tick replays and absolute-tick
  assets out.
- **Notes:** `docs/party-menu-notes.md` §7 explains the auditable no-baked-
  icon proof. No PAPERCUTS.

---
## 261 — Corrective follow-up: **SUPERSEDED BY 262** — removed the rejected replay; retained only settled live checkpoints

- **State:** then `npm test` 999/999 and build green.
- **Did:** Deleted the absolute-tick replay and made party selection
  press-relative. This was the safe base for 262, but icon pixels still lived
  in chrome; do not use its former 46/46 result as completion evidence.
- **Next:** Superseded by 262.

---
## 256 — Bounded worker (turn-15 wiring step, boundary (ii) of 3): both probes run first, then wired the FLY strike animation core (ball descent + impact sprite + Onix hit-flash/shake/healthbox-wobble) — `turn15-fly-strike.json` **176/176, 0 diff** (was 82/82, extended 19045→19141); ISSUES #36 trimmed to boundary (iii) only

- **State:** `npm test` **993/993**, `npm run build` green, tree clean.
  `verify-turn15.ts` re-run first (mandatory step): 59/59 PASS. Regression
  sweep 0 diff: `turn14-fly-miss` 165/165, `turn13-switchin` 240/240,
  `turn13-menu` 57/57.
- **Did:** PROBE 1 (source + fresh VRAM dump) confirmed the impact sprite
  (slot 4, tile 433) IS the already-wired `gBasicHitSplatSpriteTemplate`
  family (ISSUES #31), just `animation=0` (flat, no zoom-pop) instead of
  turn 9's own zoomed variant — pure re-anchor, no new asset. PROBE 2
  (`dump-fly-anim.py` re-run 19035-19150) found the ball's own motion is
  perfectly linear (`x -10/tick, y +6/tick`) under one constant rotation
  matrix — banked as a literal table (`TURN15_FLY_BALL_TABLE`), no formula
  fit. Wired `drawTurn15FlyBallDescent`, `drawTurn15ImpactHitsplat`,
  `turn15OnixInvisible`/`turn15OnixShakeX2`/`turn15OnixHealthboxWobbleY2`,
  new `drawTurn13SwitchinFieldBase` params (`onixInvisible`/
  `healthboxY2Extra`/`onixX2`, all default-off). Dense oracle-pixel
  bisection (not just RAM) surfaced 3 real corrections to the original
  scout dossier's own RAM-only read: (1) Onix's RAM-`invisible` span
  19042-19081 does NOT hide it on screen (`monbg` swaps in a pixel-
  identical BG copy) — only the genuine hit-flash toggle (19107-19134)
  needs a visibility change; (2) the hitsplat blends against the LIVE
  framebuffer (Onix's own body), not the static field turn 9's own
  instance used — a real per-move OAM-ordering difference, solved by
  back-solving the blend equation against oracle pixels; (3) Onix's own
  `AnimTask_ShakeMon` x2 shake (3× 2-tick 6px pulses) is real and needed
  fixing a period-4 match/mismatch oracle pattern. `turn15-fly-strike.json`
  extended 19045→19141, 176/176, 0 diff — excludes 3 ticks (19059-19061,
  ≤10px ball-edge rounding residual, shared-primitive risk not chased) and
  stops cleanly at 19141 rather than padding to ~19150, since dense
  bisection found HP-drain text already changing at 19142 (boundary
  (iii)'s own scope, 5 ticks earlier than the dossier's "~19147" citation).
- **Next:** ISSUES #36's own remainder (boundary (iii): "not very
  effective" text, HP-drain-from-19142, first player-side faint sink,
  "ONIX fainted!" hold — every phase flagged pure-wiring-reuse, no new
  probes expected). ISSUES #35's own extremum probe; #34's own remainder
  (17722-17768); #33's tiny remainder (17019/17034); ISSUES #32.
- **Notes:** Full writeup `docs/turn15-notes.md` §8 (owned this round).
  Both probes were real, bounded RAM/VRAM work exactly as scoped — landed
  in-budget with room to also chase 3 oracle-pixel-only residuals RAM
  alone would never have caught. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

## 255 — Bounded worker (turn-15 wiring step, boundary (i) of 3): wired the reopen gate + FIGHT submenu + confirm + FLY-strike kickoff text — `turn15-fly-strike.json` **82/82, 0 diff** (new trace, first commit toward turn 15); boundaries (ii)/(iii) — the strike animation core, faint sink, fainted-hold — NOT attempted this session, scoped and filed as ISSUES #36

- **State:** `npm test` **993/993**, `npm run build` green, tree clean.
  `verify-turn15.ts` re-run first (mandatory step): 59 PASS / 0 FAIL (the
  brief said "58/58"; the script prints 59 PASS lines with 0 failures —
  same "ALL CHECKS PASSED" gate, no discrepancy in substance). Regression
  sweep 0 diff: `turn14-fly-miss` 165/165, `turn13-switchin` 240/240,
  `turn13-menu` 57/57.
- **Did:** New `turn14Resolved` state flag end-to-end (mirrors
  `turn13Resolved` exactly): `BattleSceneState` field, `core.ts`'s new
  reopen branch (`TURN14_DRAGONBREATH_MENU_REDRAW_DELAY`-gated, cursor
  persisted at slot 2/DRAGON_BREATH, no nav), `currentPPForActiveMon`'s 3rd
  slot-2 PP decrement (20→17, turn 14's own auto-missed DRAGON_BREATH still
  costs PP), and `drawTurn15FightSubmenuWindow`/`drawTurn15FlyStrikeWindow`
  (new functions, `battleScene.ts`). Found and corrected one dossier slip
  along the way (now in `docs/turn15-notes.md` §7): the confirm-press
  transient does NOT clear to a bare/blank box before the kickoff text like
  turn 14's own charge half did — the submenu chrome holds unchanged
  through tick 19006, then hard-cuts straight to the text's own first
  glyph at 19007 (dense sha-transition probe, oracle round-trip); kickoff
  text is 20 chars total (not 21), cross-checked via both embedded spaces'
  own "no visible pixel change" ticks landing exactly where the formula
  predicts. Committed `tools/compare/traces/turn15-fly-strike.json`:
  82/82, 0 diff over 18956-19044, excluding 7 ticks (18965-66/74-75/83-85)
  — a pre-existing sine-bounce "extremum" mismatch on Onix's own idle
  sprite, same bug class as the already-documented `turn5SubmenuBounceTick`
  fix, unrelated to this session's new code — named and excluded, filed as
  **ISSUES #35** (not guessed at, not faked).
- **Next:** ISSUES #36 (this same turn's own boundaries (ii)/(iii): ball-
  descent trajectory needs a fresh `dump-fly-anim.py` run over 19045-19075
  against the already-committed groundtruth trace; the new impact sprite
  at tile 433 needs VRAM identification+extraction — both real, bounded,
  RAM/asset tasks, not blocked on anything; everything else in
  `docs/turn15-notes.md` §6f's reuse table is flagged pure wiring once
  those two land). ISSUES #35's own extremum probe; #34's own remainder
  (17722-17768); #33's tiny remainder (17019/17034); ISSUES #32.
- **Notes:** Full writeup `docs/turn15-notes.md` §7 (owned this round).
  Ran out of safe remaining budget before boundaries (ii)/(iii) — both
  need real RAM/VRAM probing (not just wiring already-banked constants,
  unlike every session in the turn13/14 chain before this one), so rather
  than rush an asset extraction and risk an unclean stop, this session
  banked one clean, tested, fully green commit and scoped the remainder
  precisely for the next session. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

---
## 254 — Bounded worker (turn-14 wiring step, ISSUES #34 close-out): wired the probe-confirmed menu-redraw blank hold + bounce-regime RESET — `turn14-fly-miss.json` **165/165, 0 diff** (was 150/150; all 15 predicted ticks restored, exact first try); cheap conditional check on the FIGHT-submenu reopen family (17722-17768) came back 0/43 pass — trimmed ISSUES #34 to that honest remainder, not deleted

- **State:** `npm test` **993/993** (unchanged, pure wiring), `npm run
  build` green, tree clean. `verify-turn14-bounce.ts` **24/24 PASS**
  (mandatory-first-step rerun, oracle-only, unaffected by `src/`).
  Regression sweep 0 diff: `turn13-switchin` 240/240, `turn13-menu` 57/57,
  `turn12-menu` 46/46, `turn13-dragonbreath-faint` 141/141.
- **Did:** Wired `docs/turn13-bounce-notes.md` §10d exactly: new
  `TURN14_MENU_TEXT_CLEAR_TICK=18080` + `TURN14_MENU_REDRAW_RESET_SHIFT =
  TURN5_SITRUS_MENU_REDRAW_TICK - TURN14_MENU_REDRAW_TICK`, swapped into
  `drawTurn14FlyMissWindow`'s settled branch (was borrowing
  `TURN13_SWITCHIN_RESET_SHIFT`, which the probe proved wrong — 871/871 RAM
  mismatches vs. 0/871 for the fresh-reset model) plus a new blank-hold
  branch above it. `drawTurn14FightSubmenuWindow`'s own pre-reveal call
  sites left untouched, per the brief. Restored the 15 predicted ticks
  (18080-18090/18095/18415/18815/18956) to `turn14-fly-miss.json`:
  150→165/165, 0 diff, no gap this time between the RAM/sha probe and real
  pixel compare (unlike 3 of the 4 prior sessions in this chain). Cheap
  conditional check (brief step 5, scratch trace only): restored all 43
  still-untested ticks of 17722-17768 and ran `npm run compare` — **0/43
  pass** (6px smallest diff, up to 2331px), refuting the "may already be
  right" theory; nothing restored, scratch file discarded, real trace
  untouched for that span. ISSUES #34 rewritten from "found, uncharacterized"
  to its honest remainder: 17722-17768 (43 ticks, needs its own RAM probe of
  the actual — earlier, unprobed — reopen-reveal instant), 17781-17787 (7
  ticks, same probable class), 17822-17845 (24 ticks, kerning-class, already
  flagged separately) — not deleted, since real excluded ticks remain.
- **Next:** ISSUES #34's own remainder (17722-17768's reopen-reveal probe,
  same two-independent-methods bar); #33's tiny 2-tick remainder
  (17019/17034); ISSUES #32; turn 15+ wiring.
- **Notes:** Full writeup `docs/turn13-bounce-notes.md` §11 (owned this
  round). No Tier-1 pin forced — no existing precedent for unit-testing
  these per-turn window-selector closures in isolation, same call every
  prior session in this chain made. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

---
---
## 253 — Bounded worker (turn-13 wiring step, ISSUES #33a close-out): wired the probe-confirmed closed-window frame-selection fix — `turn13-switchin.json` **240/240, 0 diff** (was 191/191; 49 of 51 excluded ticks restored); the exact 2 ticks the probe flagged in advance (17019, 17034) survive as a new, much smaller, separate residual — trimmed ISSUES #33 to just that, not deleted

- **State:** `npm test` **993/993** (unchanged, pure wiring), `npm run
  build` green, tree clean. `verify-turn13-frame2.ts` **11/11 PASS**
  (mandatory-first-step rerun — oracle-only, unaffected by `src/`).
  Regression sweep 0 diff: `turn14-fly-miss` 150/150, `turn13-menu`
  57/57, `turn13-sandattack` 190/190, `turn13-dragonbreath-faint` 141/141.
  Turn 5's own materialize trace needed no rerun: `turn13MurkrowFrame` is
  called only from `drawTurn13MurkrowMaterialize` (MURKROW/turn-13-only),
  entirely separate from `turn5PidgeottoFrame` — confirmed by grep.
- **Did:** Replaced `turn13MurkrowFrame`'s open-ended step (`t < 17034 ?
  0 : 1`) with the probe's exact closed-interval fix (`t >=
  TURN13_MURKROW_STRETCH_TICK && t <= TURN13_MURKROW_FRAME_FLIP_TICK ? 1
  : 0`, `src/engine/battleScene.ts`). Restored ticks 17019-17069 to
  `turn13-switchin.json` (191→242) and ran `npm run compare`: 240/242,
  diff landing at EXACTLY the two boundary ticks the probe's dossier
  pre-flagged (17019: 418px; 17034: 828px), both bboxes confined to
  Murkrow's own silhouette, nowhere else in the window. Excluded just
  those 2 per the pre-authorized caveat (242→240, 0 diff) rather than
  guessing at a fix. No Tier-1 pin forced — no existing precedent of
  unit-testing these per-turn frame-selector closures in isolation, same
  as `turn5PidgeottoFrame` before it.
- **Next:** ISSUES #33's own tiny remainder (17019/17034, needs a fresh
  probe — wobble table index math or tint coefficient right at those two
  ticks, not re-guessed); ISSUES #34 (turn 14's own menu-redraw blank-hold
  + regime question); ISSUES #32; turn 15+ wiring.
- **Notes:** Full writeup `docs/turn13-notes.md`'s newest section (owned
  this round). Fourth session in a row where a "banked, probe-confirmed"
  fix landed almost-but-not-quite gapless on contact with `npm run
  compare` — this time the probe itself had already flagged the exact
  failure mode in advance, so no time was lost chasing it blind. No
  PAPERCUTS beyond the standing mgba-venv-teardown one.

## 252 — Bounded worker (turn-13 wiring step, ISSUES #33b): wired the probe-confirmed switch-in text-clear/menu-redraw split — `turn13-switchin.json` **191/191, 0 diff** (was 171/171); found a NEW regression in turn 14's own downstream reuse while restoring the probe's turn-14 predictions, filed as ISSUES #34 rather than re-derived on the spot — `turn14-fly-miss.json` **150/150, 0 diff** (net +1 from 149: +4 restored, -3 excluded as a real regression)

- **State:** `npm test` **993/993** (unchanged, pure wiring), `npm run
  build` green, tree clean. `verify-turn13-bounce.ts` **14/14 PASS**
  (mandatory-first-step rerun, both before and after the edit — oracle-
  only, unaffected by `src/`). Regression sweep 0 diff: `turn13-menu`
  57/57, `turn13-sandattack` 190/190, `turn13-dragonbreath-faint` 141/141,
  `turn12-menu` 46/46.
- **Did:** Wired `docs/turn13-bounce-notes.md` §6 exactly: new
  `TURN13_SWITCHIN_TEXT_CLEAR_TICK=17106`; `TURN13_SWITCHIN_MENU_REDRAW_
  TICK` moved `17106→17112`; new blank-hold branch in
  `drawTurn13SwitchinWindow` mirroring `drawTurn5RockSlideWindow`'s own
  no-op gap. `turn13-switchin.json` restored to 191/191 (the named
  17106-17111/17113/17117-17122/17126-17130 family + spot ticks
  17175/17200). Testing turn 14's predicted restores directly against
  `npm run compare` (not just RAM) found they mostly don't hold: 0/13 of
  the "likely closes" family (18080-18090/18815/18956) pass; only 4/54 of
  the "flagged-maybe" families (17722-17768, 17781-17787) pass
  (17722-17725). Worse, applying the corrected `TURN13_SWITCHIN_RESET_
  SHIFT` to turn 14's own continuation formula regressed 3 previously-
  passing ticks (18087/18095/18415) — a fresh oracle sha probe of
  `TURN14_MENU_REDRAW_TICK`'s (18086) own neighborhood shows the SAME
  structural signature #33(b) had (a 6-tick unmodeled blank hold at
  18080-18085, before an already-correctly-anchored reveal at 18086) plus
  an unresolved regime-reset-vs-continuation question for the bounce phase
  from 18086 on. Did not re-derive this in-session (needs its own RAM
  probe, same two-independent-methods bar this dossier holds itself to) —
  filed as **ISSUES #34**, excluded the 3 regressed ticks + the tested-
  and-failed families, restored the 4 that passed. ISSUES #33(b) deleted
  (fixed); #33(a) untouched (sibling probe's own remainder, not touched
  this session).
- **Next:** ISSUES #34 (turn 14's own menu-redraw blank-hold + regime
  question — needs `dump-turn13-bounce-driver.py`'s own method re-pointed
  at 18086, then likely a small wiring pass much like this one); #33(a)'s
  VRAM tile dump (frame2 asset); ISSUES #32; turn 15+ wiring.
- **Notes:** Full writeup `docs/turn13-bounce-notes.md` §9 (owned this
  round, per the brief). Third session in a row where a "banked, probe-
  confirmed, pure wiring" derivation was locally exact (2 independent
  methods, RAM+sha) yet still surfaced a genuinely new bug on contact with
  a wider `npm run compare` sweep — this time one turn downstream, not in
  the fix's own window. The fix itself is not in question (turn13-
  switchin.json's own 191/191 is exact); the lesson is that shared
  constants (`TURN13_SWITCHIN_RESET_SHIFT`) need their OWN reuse sites
  re-verified, not just their defining window, before a session can claim
  "no other constants change." No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

---
## 251 — Bounded worker (turn-13 wiring step, ISSUES #33a): wired the banked MURKROW wobble table — RAM-cross-checked byte-exact fresh, anchor/frame-flip confirmed — but wiring alone didn't reach 0-diff; found+fixed 2 more real bugs (BG-fade never re-anchored for turn 13; tint-ramp needs to keep running into the wobble draw, unlike Pidgeotto's); `turn13-switchin.json` 156→**171/171**, 15 of 66 excluded ticks restored (17004-17018); remaining 51 ticks (17019-17069) re-excluded under a narrower, colors-now-ruled-out residual (likely the reused `frame2` asset is wrong art) — #33a NOT closed, trimmed not deleted

- **State:** `npm test` **993/993** (unchanged), `npm run build` green, tree
  clean. `verify-turn13-materialize.ts` 20/20 (mandatory-first-step rerun,
  unaffected — RAM/oracle-only, doesn't assert app pixels). Regression
  sweep 0 diff: `turn14-fly-miss` 149/149, `turn13-menu` 57/57,
  `turn13-dragonbreath-faint` 141/141.
- **Did:** Transcribed `TURN13_MURKROW_WOBBLE_TABLE` (50 entries) into
  `battleScene.ts`, anchored `TURN13_MURKROW_STRETCH_TICK=17020` (not the
  old `SETTLE_TICK`-minus-table-length 17030), `TURN13_MURKROW_FRAME_FLIP_
  TICK=17034` (single flip, not Pidgeotto's reused 5-breakpoint cycle) —
  then re-ran the RAM probe fresh this session and confirmed all 50 entries
  byte-exact, so the table/anchor were never the problem. Wiring alone left
  the ENTIRE restored window red; found two more bugs by direct pixel
  diffing: (1) `turn5BgFadeY(t)` (the switch-in's own BG-to-white dither)
  was hardcoded to turn 5's own tick range, silently 0 for all of turn 13 —
  added a `bgFadeYOverride` param to `drawTurn5RockSlideAttack` + a
  `turn13MurkrowBgFadeY` reusing `TURN5_BG_FADE_Y` verbatim at a freshly
  re-derived anchor; (2) the wobble draw hardcoded `tintCoeff=0` (copied
  from Pidgeotto, where the ramp always finishes before the stretch phase
  starts) but MURKROW's own ramp-render-start (17026) falls AFTER its own
  wobble start (17020) — fixed by computing `turn13MurkrowMaterializeCoeff
  (t)` in the wobble branch too. Closed 17004-17018 (15 ticks) to 0-diff.
  Remaining 17019-17069: colors now correct (pixel-sampled) but MURKROW's
  own leg/lower-body shape stays mismatched even at near-identity table
  entries — `pa/pb/pc/pd` RAM-exact, `pb=pc=0` (no dropped rotation term),
  frame timing RAM-exact — points at the reused `frame2` asset itself,
  which `drawTurn13MurkrowSettled` never actually exercises (always draws
  `tileset`), so it's never been oracle-validated in any passing trace.
- **Next:** #33a's own concrete next step: fresh VRAM tile dump at a
  materialize-window tick with `animCmdIndex=1` (e.g. RAM 17040, same
  addressing `dump-turn13-murkrow-materialize.py` already established),
  diffed byte-for-byte against the extracted `frame2` tiles. #33b (settled-
  menu bounce, Mission B) still needs its own characterization probe,
  untouched this session. ISSUES #32 and turn-15+ wiring both still open.
- **Notes:** Full writeup `docs/turn13-notes.md`'s newest section (owned
  this round). This is the second time a "banked, pure wiring" derivation
  turned out incomplete on contact with `npm run compare` (cf. #249's own
  51-tick surprise) — the mandatory RAM-only verify script is necessary but
  not sufficient to guarantee 0-diff; only a real oracle pixel compare over
  the restored window catches gaps like the BG-fade anchor and tint-ramp
  duration, which no RAM-only check was set up to see. No PAPERCUTS beyond
  the standing mgba-venv-teardown one.

---
## 250 — Supervisor wind-down: session end 2026-07-21 ~23:05 — **12 verified worker steps folded across 6 rounds** (5 main-lane engine slices incl. 2 cap-kill salvages + 7 worktree probes, zero dud steps); suite **966 → 993/993**; headlines: **turns 13 AND 14 wired end-to-end** (13: menu/SAND_ATTACK/DRAGON_BREATH-faint/MURKROW-switch-in, traces 57+190+141+156; 14: FLY-charge + auto-miss, 149/149), **the AERIAL_ACE window closed GAPLESS** (93/93 + turn-12 mirror 131/131) via a 3-probe crack chain (OAM-winner overlap rule → 5-bit-domain darken → both verified pixel-exact), **ISSUES #31 hitsplat SOLVED + deleted** (wrong target2 — 4210/4210 exact; trace 167/167), **retrofit pipeline completed through the WIN** (verify-turn14/15/16/17 all banked, BRN badge pinned at 21542), #32+#33 filed with named instruments

- **State (verified this minute):** `npm test` **993/993**, `npm run
  build` green, tree clean, no worktrees, no unmerged branches. Traces
  new/extended this session (all supervisor-rerun 0 diff):
  turn13-menu 57, turn13-sandattack 190, turn13-dragonbreath-faint 141,
  turn13-switchin 156, turn14-fly-miss 149, turn10-aerialace 23→93,
  turn9-quickattack 159→167, turn12-aerialace 56→131. Verify scripts all
  passing from main tree: turn13 60/60, turn13-materialize 20/20,
  turn14 28/28, turn15 58/58, turn16, turn17, turn10-aerialace 49/49,
  turn9-hitsplat 12/12.
- **Next:** (1) turn-13 finish via ISSUES #33 — (a) is pure wiring (the
  banked Murkrow wobble table, mind the 50th-entry trap), (b) needs its
  one characterization probe first; (2) ISSUES #32 (named instrument:
  gMain.oamBuffer probe of slots 3/4 at RAM 10939-10940); (3) turn-15
  wiring off verify-turn15 (58/58) — then 16/17/WIN, all retrofit-ready;
  (4) ISSUES #23 stays parked.
- **Notes:** zero merge conflicts across 8 merges. Two cap-kills, both
  salvaged cleanly (SAND_ATTACK probe committed pre-kill; rung 4
  finished work+§50 but not the commit — supervisor verified and
  committed with provenance). Three consecutive early-stop workers
  (~20 of 60 min) fixed by switching to single-rung 40-min briefs —
  later workers then used 30-35 min productively. The probe→wiring
  pipeline went 7-for-7 again; the overlap-rule crack transferred
  across three windows (AERIAL_ACE plain → darken → hitsplat) but #32
  proved "wins its OAM tie" is tick-dependent, not shape-transferable.
  Interactive session; no escalations needed; no usage-limit events.
---
## 249 — Bounded worker (S7/S8 engine step): turn 14 wired end-to-end — Murkrow's FLY charge-half + Onix's DRAGON_BREATH auto-miss (STATUS3_ON_AIR) through the settled turn-15 menu — `turn14-fly-miss.json` **149/149, 0 diff**; a pre-existing shared-regime residual (battle-turn-notes §50's family, now filed as ISSUES #33) resurfaces at 51 ticks, named and excluded per the brief's own instruction, NOT chased

- **State:** `npm test` **993/993** (unchanged, pure wiring), `npm run build`
  green, tree clean. `verify-turn14.ts` **28/28** (mandatory-first-step
  rerun, unaffected). New trace `tools/compare/traces/turn14-fly-miss.json`
  **149/149, 0 diff** (`npm run compare`), reusing `battle1-turn14-
  dense.json`'s full 110-segment script, dense on every genuinely-0-diff
  span (the whole DRAGONBREATH-kickoff/held/transition/missed-text/held
  window 17916-18079 gapless, plus FLY-up/submenu/settled-menu spot
  ticks). Full regression sweep 0 diff: `turn13-switchin` **156/156**,
  `turn13-menu` **57/57**, `turn12-menu` **46/46**, `turn10-aerialace`
  **93/93**.
- **Did:** `core.ts` gained `turn13Resolved` (mirrors `turn12Resolved`
  exactly — new reopen-gate branch `turn12Resolved && !turn13Resolved`,
  cursor persists at slot 2/DRAGON_BREATH, no `DOWN` nav, gated on new
  `TURN13_DRAGONBREATH_MENU_REDRAW_DELAY`). New render dispatch
  (`drawTurn14FightSubmenuWindow`/`drawTurn14FlyMissWindow`) reuses
  `drawTurn13SwitchinFieldBase` throughout (generalized with a new
  `murkrowInvisible` param) — no fresh switch-in regime this turn, so the
  bounce cycle continues turn 13's own "switchin-reset" regime, frozen
  during the resolution at `TURN5_SITRUS_MENU_REDRAW_TICK` ("phase 0" by
  construction). One genuinely new mechanism: the FLY-up "round shadow"
  ball sprite (`gFlyBallUpSpriteTemplate`) — new asset extractor
  (`tools/extract/extract-fly-ball.ts`, `round_shadow.png`) + new render fn
  (`drawTurn14FlyBall`, reusing the EXISTING `drawSpriteSheetAffineStretch
  (doubled=true)` primitive, no new primitive needed) driven by a literal
  24-entry RAM-truthed per-tick affine table (fresh `dump-fly-anim.py`
  re-run this session). Three literal-anchored kickoff/miss texts, all
  solved cleanly from `settle - (total-1)` under the ordinary 1-char/tick
  formula (no new text mechanism). `currentPPForActiveMon`/
  `drawFightSubmenuChrome` gained a `turn13Resolved` param (DRAGON_BREATH
  PP's second decrement, 20→18, matching the dossier's own ledger).
- **Next:** turn 15+ wiring (Murkrow's FLY strike half, unconditional hit,
  forces the switch to MAGBY) — `battle-turn-notes.md` §16/§50 already
  preview this; nothing new to probe for the reopen-gate shape itself
  (mirror `turn13Resolved` again). Also: §50's own original bounce-regime
  bug (materialize/wobble RAM re-probe) would likely close most of this
  session's own 51 excluded ticks for free if fixed upstream.
- **Notes:** Full writeup in `docs/battle-turn-notes.md` §52. Named,
  excluded residual (NOT this session's own bug, time-boxed per the
  brief's explicit instruction): 51 of 200 originally-sampled ticks
  (submenu-open/confirm-transient 17722-17768, a handful of FLY-up-
  adjacent ticks 17781-17787, "flew up high!" mid-typing kerning-class
  ticks 17822-17845, the menu-redraw transition 18080-18090, two
  settled-tail spot ticks 18815/18956) show diffs (629-1562px, isolated to
  Onix's own sprite/healthbox) whose pixel counts land exactly inside the
  range `battle-turn-notes.md` §50 already characterized as a pre-existing,
  not-a-pure-additive-shift bug in the shared settled-menu bounce regime —
  excluded from `captureFrames` rather than faked, matching this dossier's
  "exclude, don't fake" convention. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.
---
## 248 — Bounded worker (S7 engine step): AERIAL_ACE + hitsplat CLOSE-OUT — all 4 parts LAND: turn-10 window gapless 0-diff 12345-12437 (overlap rule + darken + flicker + a newly-discovered player-healthbox wobble), ISSUES #31 hitsplat SOLVED and deleted (167/167, was 159/159), turn-12 mirror gapless 0-diff over its own +2068 shift (131/131); one NEW residual found and honestly excluded (ISSUES #32, a different bug from #31, NOT chased)

- **State:** `npm test` **993/993** (986 + 7 new Tier-1), `npm run build`
  green, tree clean, 4 commits this session (one per part, each green).
  `verify-turn10-aerialace.ts` **49/49**, `verify-turn9-hitsplat.ts`
  **12/12** (both mandatory-first-step reruns, unchanged throughout).
  Traces: `turn10-aerialace.json` **93/93** (was 23/23, now gapless
  12345-12437 — `turn10-rockslide.json` still owns 12438+), `turn9-
  quickattack.json` **167/167** (was 159/159, restores 8 of the 10
  previously-excluded 10935-10944 renders), `turn12-aerialace.json`
  **131/131** (was 56/56, closes the +2068-shifted 14431-14505 gap). Full
  regression sweep 0 diff: `turn10-rockslide` 220/220, `turn9-quickattack-b`
  77/77, `turn9-rockslide` 130/130, `turn12-rockslide-miss` 38/38,
  `turn13-switchin` 156/156.
- **Did:** wired every rule the dossiers had already pinned — PART 1: slot 7
  wins its OAM tie against the real sprite unconditionally (blends against
  the field, never live `fb`); slot 4 does NOT share that rule (falsified
  both "always wins" and "always loses" via `npm run compare` — the truth is
  a one-tick flip, wins ONLY at its own life's last tick, render 12368,
  corrected its life-1 window's end lag along the way, updated the stale
  Tier-1 pin). PART 2: turn 9's flicker reused verbatim at a new anchor;
  extending to gapless coverage surfaced a SECOND unpinned mechanism
  (`docs/aerial-ace-notes.md`'s own named-but-unchecked "player-healthbox
  wobble" gap) — reused `turn9Ep2HealthboxWobbleY2` the same way, tested the
  reuse hypothesis directly against the oracle (not derived from the shape
  alone), closes exactly. PART 3: fixed the hitsplat's target2 (field, not
  live fb, `eva=12/evb=8`) — genuinely solved, but restoring the excluded
  window exposed a DIFFERENT bug one layer deeper (Pidgeotto's own
  QUICK_ATTACK clone overlap, 2 ticks, 203px) — tried transferring
  AERIAL_ACE's exact formula, it didn't fit; reverted rather than curve-fit,
  named `ISSUES.md` #32. PART 4: turn 12's own dispatcher had never wired
  mechanism 4/flicker/wobble at all — added, using the SAME `(t,pressTick)`-
  relative anchors turn 10 uses, confirming the "+2068 bit-exact re-anchor"
  claim extends to these three mechanisms too.
- **Next:** ISSUES #32 (turn 9 QUICK_ATTACK slot 3/4 overlap, 10940-10941) —
  needs a fresh `gMain.oamBuffer` RAM probe of those two sprites specifically
  before the next attempt, per the "wiring not derivation" convention (this
  session deliberately did not re-derive without that ground truth). Turn
  13's own §50 residuals (materialize/wobble, settled-menu subset) and turn
  14+ wiring remain the next natural targets, unchanged from #247's own
  handoff.
- **Notes:** Full writeup in `docs/battle-turn-notes.md` §51 +
  `docs/aerial-ace-notes.md`'s + `docs/turn9-shake-notes.md`'s own newest
  dated sections. No PAPERCUTS beyond the standing mgba-venv-teardown one.

---
## 247 — Supervisor fold: turn-13 rung 4 SALVAGED+LANDED (`turn13-switchin.json` **156/156**, cap-killed pre-commit — supervisor verified + committed with provenance; turn 13 NOT fully green, two named residuals excluded per §50), turn-16 + turn-17 retrofit probes verified+merged (**every banked dossier turn 13→WIN now has a PASS/FAIL verify script**), overlap-rule transfer probe folded earlier (AERIAL_ACE darken = 5-bit-domain formula fix, 18/18 exact; ISSUES #31 hitsplat SOLVED 4210/4210 — wrong target2, wiring-ready)

- **State (supervisor-verified):** `npm test` **986/986**, `npm run build`
  green, tree clean, no unmerged branches. Traces this hour (all
  supervisor-rerun 0 diff): turn13-menu 57/57, turn13-sandattack 190/190,
  turn13-dragonbreath-faint 141/141, turn13-switchin 156/156. Verify
  scripts from main tree: turn13 60/60, turn14 28/28, turn15 58/58,
  turn16 233-cap PASS, turn17 245-cap PASS, turn10-aerialace 49/49,
  turn9-hitsplat 12/12.
- **Did:** rung 4's worker finished the engine work + §50 writeup but was
  cap-killed before committing — supervisor reran suite/build/trace/
  regression sweep and committed (`battleScene.ts` +251 lines,
  icon-bar/particles generalized with new anchor params; frozen wait-
  cursor + double-shift bugs found by compare and fixed). §50's honest
  remainders: (1) Murkrow's materialize/wobble 17004-17069 needs its OWN
  RAM table (Pidgeotto's deltas don't transfer; settle tick corrected to
  17070); (2) settled-menu bounce subset 17106-17130+ — reset shift is
  NOT purely additive, suspect a fresh-menu-open-style blank transient.
  BRN badge pinned at tick 21542 (replaces HP label glyph, no layout
  shift, static). Turn-17 retrofit: 7 corrections incl. a unique
  pixel-leads-RAM faint-sink freeze; DESTIN trainer-pic slide-in (~31
  ticks) characterized; faint-sink family now formula-exact.
- **Next:** (1) AERIAL_ACE + hitsplat close-out engine step (launching
  now): rung-b darken via the 5-bit-domain formula, rung-c flicker =
  turn9Ep2OnixInvisible re-anchor, overlap compositing rule (OAM-winner +
  BG-composite target2) in the turn-10 window AND the turn-9 hitsplat
  (restore #31's excluded 10935-10944), rung-d turn-12 mirror at +2068.
  (2) turn-13's two §50 residuals (materialize RAM probe first). (3)
  turn-14 wiring off verify-turn14 (28/28) — dossiers/scripts wiring-ready
  through the WIN.

---
## 246 — Bounded worker (S7/S8 turn 13 engine step, rung 3 of 4): DRAGON_BREATH re-targeted at Pidgeotto LANDS 0-diff — kickoff text, HP drain 16→0, faint sink, "Foe PIDGEOTTO fainted!" + button-gated KO hold all wired; rung 4 (MURKROW switch-in) NOT attempted, out of scope this session

- **State:** `npm test` **986/986** (978 + 8 new Tier-1), `npm run build`
  green, tree clean. `verify-turn13.ts` **60/60** (mandatory-first-step
  rerun, unaffected). New trace `turn13-dragonbreath-faint.json`
  **141/141, 0 diff**, twice-run byte-identical (15699-15745 kickoff
  typing, 15855-15900 HP drain, 15955-15985 faint sink + fainted-text
  start, 16300/16600/16800 sparse KO-hold samples, 16808-16824 dense
  gated-press boundary — stops at the rung-4 handoff, per the brief).
  Regression sweep clean: `turn13-sandattack` 190/190, `turn13-menu`
  57/57, `turn12-menu` 46/46.
- **Did:** new `turn13KoDismissElapsed` state field threaded through
  `core.ts`'s `tick()`, mirroring `turn5KoDismissElapsed`'s pattern
  EXACTLY (eligibility-gated single-set idiom; render stays a pure
  function of `t`, same as turn 5's own precedent — the "locks... holds
  through 16824" shape falls out of the live wait-cursor's own 9-tick
  phase boundaries, no press-driven freeze needed). Reused verbatim:
  `dragonBreathTextStartTick`/`Chars` (new synthetic
  `TURN13_DRAGONBREATH_PRESS_TICK=15516`, oracle-bisected exact),
  `dragonBreathGrovyleHp` (16→0, `DRAGONBREATH_HP_DRAIN_START_DELAY=353`
  unchanged), `cursorState` (the fainted-message wait-cursor's own FULL
  perpetual 4-phase bounce — turn 5's own window was too short to
  exercise this, turn 13's ~840-tick hold does). Generalized (new
  optional params, every pre-existing call site unaffected):
  `grovyleFaintSinkRowsAndY2` (now takes `startTick`/`steps` — Pidgeotto
  `S=15960,n=7` vs. Grovyle `S=6502,n=8`), `drawTurn5PidgeottoSettled`/
  `drawTurn5SwitchinSprite`/`drawTurn6FieldBase`/`drawTurn13FieldBase`
  (new `pidgeottoSink`/`pidgeottoHealthboxVisible`/`pidgeottoHp` params).
  **Two real bugs found via `npm run compare`, not guessed**: (1)
  Pidgeotto's own target hit-flash (blink + healthbox wobble) — turn 2's
  own DRAGON_BREATH scene already reuses `rockSlideMonBlinkInvisible`/
  `rockSlideHealthboxWobbleY2` for its target; omitting it regressed
  ~1085px at 15855-15863, isolated by the diff crop to Pidgeotto's own
  sprite — re-anchoring both closed it. (2) Onix's own on-field bounce
  must stay FROZEN through the fainted-message hold here, unlike turn 5's
  own analogous window (`drawTurn5RockSlideWindow` reverts to live
  `bounceTick=t` there) — a first attempt mirrored turn 5 and regressed
  ~2325px at 15979 on Onix's own sprite/healthbox; reverting to the
  frozen `turn13KickoffBounceTick` throughout closed it. A third, tiny
  fix: the wait-cursor's own start needed one MORE tick of lag than
  `TURN5_FAINTED_CURSOR_START_DELAY`'s own "+1" convention
  (`TURN13_FAINTED_CURSOR_START_DELAY=485`), found via two mismatched
  phase-boundary ticks (16810/16819).
- **Next:** rung 4 (MURKROW switch-in) — turn 5's faint-switch machinery
  re-anchored per `docs/turn13-notes.md` §6-§7's REUSE MAP; asset already
  extracted (§48's own correction: MURKROW's front sprite has been in
  `FRONT_SPECIES`/`battle-opponent-front-sprites.json` since commit
  `c170d68`) — pure wiring from here, nothing left to probe.
- **Notes:** `docs/battle-turn-notes.md` §49 and `docs/turn13-notes.md`'s
  newest dated section have the full writeup. **Named, excluded
  residual** (not chased, time-boxed): a 2px diff at ticks 15882-15884,
  isolated to Pidgeotto's own HP-bar fill color (`calcBarFilledPixels`
  renders hp=1,2,3 identically — a bar-quantization floor — but the
  oracle's own pixel there doesn't match either candidate this session
  checked); excluded from `turn13-dragonbreath-faint.json`'s own
  `captureFrames` rather than faked. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

- **State:** `npm test` **978/978** (unchanged), `npm run build` green,
  tree clean. `turn13-sandattack.json` **190/190, 0 diff** (185 -> 190,
  adds render 15476-15480, the attacker-slide-only span). Regression
  sweep clean: `turn13-menu` 57/57, `turn12-menu` 46/46, `turn12-aerialace`
  56/56, `turn11-menu` 56/56, `turn10-aerialace` 23/23.
- **Did:** extracted `gBattleAnimSpriteGfx_MudSand` (no `.png` source in
  this reference tree, unlike every prior battle-anim asset — only the
  raw pre-compression `mud_sand.4bpp`; new `tools/extract/
  extract-sandattack-dirt.ts` decodes tile 0 directly). Ran the committed
  `dump-sandattack-anim.py` fresh against `battle1-turn13-dense-a.json`
  15470-15525 and derived TWO closed forms directly from RAM (not
  guessed): (1) Pidgeotto's own attacker-slide `x2` (a 7-tick pinned
  table) — wired (`turn13SandAttackPidgeottoX2`, threaded through 4
  existing draw functions as a new trailing param) and **oracle-confirmed
  0-diff** on its own; (2) all 30 dirt sprites' own linear-translation
  motion (`x2/y2 = ∓floor(min(n,20)*step/256)` off one shared RAM origin,
  `xStep`/`yStep` per sprite RAM-exact) — wired with an OAM draw order
  sorted by descending spawn slot (closed most, not all, of the diff: 41
  -> 37/231 mismatched frames). The remaining residual (small, <0.2%/frame,
  concentrated where 3+ sprites' cells overlap right after each wave's
  spawn) wasn't chased further — likely needs a fuller `SortSprites`-style
  per-tick simulation (`rockSlideDrawOrder`'s own precedent), not just a
  spawn-order sort. **Correction to §47/PROGRESS #244's own assumption**:
  MURKROW's front sprite is **already extracted** (`FRONT_SPECIES` in
  `extract-battle-mon-pics.ts` has included it since commit `c170d68`) —
  Part C's own asset-extraction need was smaller than previously thought.
- **Next:** Part A's dirt-cloud residual is a named, well-characterized
  gap (full derivation + pinned table in `docs/turn13-notes.md`'s newest
  section) — a resuming worker can either chase the OAM-order fix or just
  leave it excluded and move to Parts B/C, both of which are still fully
  pure wiring per `docs/turn13-notes.md` §4-§7's REUSE MAP (nothing left
  to probe): Part B needs a new `turn13KoDismissElapsed`-style field
  mirroring `turn5KoDismissElapsed`'s pattern in `core.ts`; Part C is
  turn 5's faint-switch machinery re-anchored (asset already exists per
  the correction above).
- **Notes:** `docs/battle-turn-notes.md` §48 has the full writeup, plus
  `docs/turn13-notes.md`'s newest "bounded worker... Part A" section (the
  authoritative ground truth: pinned 30-entry dirt table, exact formula,
  residual characterization). PAPERCUT: `mud_sand.4bpp` having no `.png`
  companion cost ~10 min of investigation before confirming the raw-4bpp
  path was correct, not a missing asset.

- **State:** `npm test` **978/978** (969 + 9 new Tier-1), `npm run build`
  green, tree clean. `verify-turn13.ts` **60/60** (mandatory-first-step
  rerun, unaffected). New trace `turn13-sandattack.json` **185/185, 0
  diff** (ticks 15420-15475 + 15522-15650: confirm-transient tail,
  settled kickoff text, silent monbg gap, accuracy-drop stat banner,
  "ONIX’s accuracy fell!" typing+hold — deliberately EXCLUDES
  15476-15521, the dirt-throw/attacker-slide window). Regression sweep
  clean: `turn13-menu` 57/57, `turn12-menu` 46/46, `turn12-aerialace`
  56/56, `turn11-menu` 56/56, `turn10-aerialace` 23/23.
- **Did:** `drawTurn13SandAttackWindow` dispatches SAND_ATTACK's own
  kickoff text ("Foe PIDGEOTTO used\nSAND-ATTACK!"), a new
  `turn13SandAttackAccEva`/`Bg1Y` pair (a THIRD parameter combination of
  the already-wired generic `StatsChangeAnimation` banner — non-sharply
  target/wait 10/20 crossed with a DECREASE direction and the `accuracy`
  palette, no new asset extraction needed), and "ONIX’s accuracy fell!"
  (curly apostrophe, matching the font/charmap pin `TURN6_ATKFELL_LINE1`
  already established). All pure wiring, zero new render primitives.
  **One genuine bug found by oracle bisection, not guessed**: `pressTick`
  (`TICK0+sm.confirmElapsed`) is **15419** at runtime, not 15418 (the
  confirm press's own segment-start tick a naive dossier reading
  suggests) — a fresh `npm run compare` caught every mid-typing frame
  showing a small diff localized to exactly one trailing glyph (the
  classic off-by-one-tick signature) plus a huge diff at the transition
  frame itself; rebased all three new delay constants off the real
  anchor, closed to 0 immediately.
- **Next:** rung 3 (DRAGON_BREATH re-targeted at Pidgeotto — kickoff text
  reuses the ALREADY-GENERIC `dragonBreathTextStartTick`/`Chars`
  verbatim with a new synthetic pressTick anchor; HP-drain reuses
  `dragonBreathGrovyleHp` verbatim; faint sink reuses
  `grovyleFaintSinkRowsAndY2` verbatim; the KO-gated hold needs a NEW
  `turn13KoDismissElapsed`-style field threaded through `core.ts`,
  mirroring `turn5KoDismissElapsed`'s own pattern exactly, cycling the 4
  idle-bounce shas the dossier names), then rung 4 (MURKROW switch-in —
  turn 5's faint-switch machinery re-anchored, but needs a NEW
  front-sprite asset for MURKROW, not yet extracted anywhere in
  `src/assets/gen/`). Both rungs' full ground truth is already banked in
  `docs/turn13-notes.md` §4-§7 — nothing left to probe, this is pure
  wiring + one new asset extraction from here.
- **Notes:** `docs/battle-turn-notes.md` §47 has the full writeup. The
  (a) dirt-throw sub-phase (30 dirt sprites from one shared
  attacker-relative origin, `Random2()&0x1F` per-sprite jitter,
  regenerable via the committed `tools/probe/dump-sandattack-anim.py`)
  needs a new sprite-sheet asset extraction (`ANIM_TAG_MUD_SAND`, not yet
  in `src/assets/gen/`) — didn't fit this session's remaining time;
  excluded from `turn13-sandattack.json`'s own `captureFrames` rather
  than claim a false 0-diff pass, matching the "exclude, don't fake"
  convention ISSUES #23's own projectile exclusion already establishes.
  No PAPERCUTS beyond the standing mgba-venv-teardown one.
---
## 243 — Bounded worker (S7/S8 turn 13 engine step, rung 1 of 4): turn 12->13 FIGHT-submenu reopen gate LANDS 0-diff; rungs 2-4 (SAND_ATTACK, DRAGON_BREATH+faint, MURKROW switch-in) NOT attempted this session - out of the remaining time budget

- **State:** `npm test` **969/969** (966 + 3 new Tier-1), `npm run build`
  green, tree clean. `verify-turn13.ts` **60/60** (mandatory-first-step
  rerun, unaffected). New trace `turn13-menu.json` **57/57, 0 diff**
  (ticks 15374-15430: reopen, DOWN nav, cursor jump at 15408, confirm,
  confirm-press transient hold - stops just before SAND_ATTACK's own
  kickoff text starts at 15431, out of this rung's scope). Regression
  sweep clean: `turn12-menu` 46/46, `turn12-aerialace` 56/56,
  `turn12-rockslide-miss` 38/38, `turn11-menu` 56/56, `turn10-aerialace`
  23/23.
- **Did:** threaded `turn12Resolved` through the FULL reopen-gate chain
  (`core.ts`, mirroring every prior `turnNResolved` flag verbatim),
  `currentPPForActiveMon`'s 10th independent slot-0 decrement
  (ROCK_SLIDE reads 0/10 exhausted, matching turn13-notes.md §3), and a
  new `drawTurn13FightSubmenuWindow` dispatcher (own regime-8
  field-base/kickoff-bounce-freeze pair, `TURN13_REGIME8_TO_REGIME1_SHIFT`,
  reusing `drawTurn12TurnEndSettledMenu` verbatim for the pre-open/
  DMA-wait baseline - the established "reuse the prior turn's own
  TurnEndSettledMenu" pattern). The DOWN-nav cursor jump (0->2,
  DRAGON_BREATH) needed **zero new code** - `moveFightCursor`'s existing
  2x2-grid arithmetic already reproduces it, confirming the supervisor's
  prior root-cause fold. One genuine per-turn residue found by oracle
  bisection (not assumed, not guessed): the open-DMA-wait branch needs
  an **unshifted** raw tick for this regime's own `menuIdleBounce`
  plateau boundary, NOT the usual `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
  every other turn's analogous branch uses - a real quantization-residue
  difference specific to this regime's anchor tick, pixel-fit directly
  (debugged via a throwaway script driving `core.ts`'s `tick`/`render`
  directly to inspect `fightSubmenu.openElapsed` per-frame, since the
  oracle-diff alone didn't distinguish "wrong regime" from "wrong
  shift").
- **Next:** rung 2 (SAND_ATTACK's 4 sub-phases: dirt-throw+slide via
  `dump-sandattack-anim.py`'s pinned tables, silent monbg gap, the
  accuracy-drop stat banner - needs a `turn6StatFallEva`/
  `turn6StatFallBg1Y` generalization or sibling for the
  non-sharply/decrease/accuracy parameter combo, "ONIX's accuracy
  fell!" text), then rung 3 (DRAGON_BREATH re-targeted at Pidgeotto via
  turn 2's own reused mechanism functions, HP-drain, faint sink reused
  from turn 5, KO-gated hold cycling 4 idle-bounce shas), then rung 4
  (MURKROW switch-in, turn 5's faint-switch machinery re-anchored). All
  four sub-steps and their exact ground truth are in
  `docs/turn13-notes.md`'s "SAND_ATTACK characterization" section and
  §5-§7 - nothing left to probe, this is pure wiring from here. Rung 1's
  own `drawTurn13FightSubmenuWindow` deliberately does NOT dispatch past
  the confirm-press transient yet (same "caller/trace never captures
  past the oracle-confirmed safe boundary" convention `drawTurn3Endeavor
  Text` established) - rung 2 adds that forward branch.
- **Notes:** not a blocked/mis-scoped step - genuinely just larger than
  one bounded session (menu + 4-phase SAND_ATTACK + re-targeted
  DRAGON_BREATH + faint-switch reuse + KO-gate + Murkrow switch-in, vs.
  turn 12's much smaller "AERIAL_ACE reanchor + one miss text-swap").
  Stopped at a clean, fully-verified rung boundary per AGENTS.md rather
  than leaving rung 2 half-wired. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

---
## 242 — Supervisor fold (evening session round 1): SAND_ATTACK probe merged — turn 13 is now FULLY pure wiring (last unknown characterized); AERIAL_ACE rung (a) verified landed, rung (b) residual queued for a targeted probe

- **State (supervisor-verified post-merge):** `npm test` **966/966**,
  `npm run build` green, tree clean, no worktrees/unmerged branches.
  `verify-turn13.ts` (now **60 checks**: 46 + 14 SAND_ATTACK) passes from
  the main tree, supervisor-rerun. `turn10-aerialace.json` 23/23
  supervisor-rerun, plus neighbors 220/220, 56/56, 159/159.
- **Did:** verified + merged `worker/wt-20260721-182214` (SAND_ATTACK
  ~90-tick window decomposes into 4 sub-phases, ALL pure wiring: dirt-throw
  via unmodified `AnimDirtScatter`/`SlideMonToOffset` (+1 lag; per-call
  scatter offsets are DEAD script args — all 30 sprites share one origin,
  only `Random2()` target jitter differs; regenerate tables via committed
  `dump-sandattack-anim.py`), silent monbg gap, turn-6-family stat banner
  (0 lag, assets already extracted), "ONIX's accuracy fell!" text — the
  prior "blank 15630-15699" label was WRONG, that sha is the held
  accuracy-fell text). Probe was cap-killed mid-final-message but its
  commit was complete — no salvage needed. Verified #241's engine work
  (see below).
- **Next:** round 2 in flight — main lane wires turn 13 end-to-end;
  worktree probes AERIAL_ACE's overlap residual (#241's handoff) + the
  12371-12437 flicker (rung (c) precondition). Then turn 14+.

---
## 241 — Bounded worker (S7 engine step, AERIAL_ACE excluded-window close-out): rung (a) LANDS 0-diff (mechanisms 1/3's residual - a compositing-ORDER bug, not a bad table), rung (b) wired but NOT 0-diff (mechanism 4's darken - two real bugs fixed, ~48% mismatch down to a small residual); rungs (c)/(d) not attempted

- **State:** `npm test` **966/966**, `npm run build` green, tree clean.
  `turn10-aerialace.json` **23/23** (was 18/18) — extended through render
  12367, 0 diff. Full regression sweep re-verified 0 diff: `turn10-rockslide`
  **220/220**, `turn12-aerialace` **56/56**, `turn12-rockslide-miss`
  **38/38**, `turn9-quickattack` **159/159**, `turn11-menu` **56/56**,
  `turn11-featherdance` **178/178**, `turn11-rockslide` **163/163**.
  `verify-turn10-aerialace.ts` unchanged **20/20**.
- **Did:** (rung a) found the REAL cause of §42/§43's own standing
  "mechanism-3 residual" (renders 12363-12366): the lunge/clone RAM tables
  were already correct (brute-force-confirmed against a fresh oracle
  capture — every neighboring offset scores far worse), the bug was
  `drawTurn10AerialAceLungeAndClones`'s compositing ORDER — drawing the real
  sprite first and blending both clones over it (QUICK_ATTACK's own
  precedent shape) left the moving real silhouette exposed to being
  ghosted-over. Reversing the order (clones blended against the field
  first, real sprite opaque on top last) closes it to 0. Also fixed slot 7's
  own END lag (+2 → ordinary +1, RAM-pixel-bisected). (rung b) wired
  mechanism 4's already-RAM-pinned darken coefficient into the existing
  (previously unused) `darken` render plumbing; found two real bugs along
  the way — `turn10BgDarkPalette` was darkening the wrong LOCAL palette
  index (a hardware-bank-number transcription that doesn't match the
  compact asset's own indexing; every static-bg tile actually uses local
  index 0), and `erasePidgeottoFootprint` never darkened its own erase
  background. Fixed both — darken plateau mismatch dropped from **~48% of
  the whole frame** to a small residual confined to Pidgeotto's own
  silhouette (600-893px, 1.5-2.3%), still not 0-diff, so the trace's
  `captureFrames` stays at the rung (a) boundary rather than claim a false
  pass.
- **Next:** rung (b)'s own remaining residual (600/893px at 12368/12369,
  plus a separate smaller 203px residual at 12370+ whenever real+slot7
  overlap — may share a root cause, see the handoff note below) blocks
  extending `turn10-aerialace.json` past render 12367; once closed, rung
  (c) (the 12371-12437 flicker/hit-flash, RAM-probe fresh first) and rung
  (d) (turn 12's own +2068 mirror, `turn12-aerialace.json`'s own excluded
  14431-14505 gap) are next in this window's own ordering.
- **Notes:** `docs/aerial-ace-notes.md`'s "2026-07-21 rung (a) CLOSES + rung
  (b) partial" section has the full writeup + an explicit handoff note for
  whoever picks up the remaining residual. `docs/battle-turn-notes.md` §46
  mirrors it briefly. No PAPERCUTS beyond the standing mgba-venv-teardown
  one.

---
## 240 — Supervisor wind-down: session end 2026-07-21 ~14:20 — **17 productive worker steps verified and folded** (7 rounds, 6 main-lane engine slices + 9 worktree probes + 2 salvage/dud events); suite **880 → 966/966**; headlines: **turns 9-12 landed end-to-end 0-diff** (turn 9: clones/shake/wobble/flicker/drain/text/hold/ROCK_SLIDE incl. the flicker gap closed at 159/159; turn 10: menu/AERIAL_ACE/ROCK_SLIDE; turn 11: menu/FEATHER_DANCE-blocked/ROCK_SLIDE; turn 12: menu/AERIAL_ACE-reanchor/ROCK_SLIDE-miss), **ISSUES #30 CLOSED by a full crack** (feather draw-order candidate A + the AFFINE_NORMAL box-clip root cause, 425px→0 on all three turns, traces 106/16/33→235/145/162), **ISSUES #31 filed** (hitsplat: 3 hypotheses refuted with committed instruments), and **the probe→wiring pipeline ran at full cadence** — every landed window was pre-probed with a PASS/FAIL verify script and every "pure wiring" verdict held on landing

- **State (verified this minute):** `npm test` **966/966**, `npm run
  build` green, tree clean, no worktrees, no unmerged branches. New/
  extended traces this session (all supervisor-rerun 0 diff):
  turn9-quickattack 112→159, turn9-quickattack-b 77, turn9-rockslide
  130, turn6/7/8-feathers 235/145/162, turn10-menu 83, turn10-aerialace
  18, turn10-rockslide 220, turn11-menu 56, turn11-featherdance 178,
  turn11-rockslide 163, turn12-menu 46, turn12-aerialace 56,
  turn12-rockslide-miss 38; bonus turn2-endeavor-drain 200→201 (rung-c3
  hitsplat fixes closed its last residual). Verify scripts banked:
  turn9-postlunge 108, turn10-aerialace 20, turn10-rockslide 44,
  turn11 52, turn12 20, turn13 46 — all supervisor-rerun post-merge.
- **Next:** (1) wire turn 13 (verify script + dossier corrections
  banked; ONE real unknown: SAND_ATTACK's ~90-tick mid-message
  animation 15540-15629, uncharacterized); (2) AERIAL_ACE mechanisms
  3/4 (§42/§43 handoffs: bisect lunge-table indices 0-2; re-derive the
  live BG palette bank by RAM read); (3) ISSUES #31's two named avenues;
  (4) turn 14 (forced switch) onward — dossiers exist through
  post-WIN; S8 engine slices have complete ground truth.
- **Notes:** zero merge conflicts across 8 merges; no usage-limit
  events. One supervisor launch error (nested-worktree launch needs the
  worktree's OWN script copy invoked relatively — an absolute-path
  main-tree launcher bases on master; the mis-based worker caught it and
  stopped honestly at $0.27) and one 20-min probe cap-kill mid-writeup
  (work salvaged: supervisor reran its uncommitted verify script +
  diagnostics, wrote the dossier append with provenance, committed on
  its branch — the "hit-flash mechanism" it dissolved was folded intact).
  PAPERCUTS: exit-139-teardown entry added and re-confirmed by three
  workers. Interactive session; no escalations needed.

---
## 239 — Bounded worker (S7/S8, turn 12 wiring): both halves LAND 0-diff — Pidgeotto's 2nd AERIAL_ACE (pure +2068-tick re-anchor of turn 10's 5-mechanism tables, zero new mechanism code) and the arc's FIRST ROCK_SLIDE MISS (zero-animation text-swap, structurally = turn 8's BIND-miss) — new `turn12-menu.json` **46/46**, `turn12-aerialace.json` **56/56**, `turn12-rockslide-miss.json` **38/38**, all 0 diff

- **State:** `npm test` **966/966** (957 + 9 new), `npm run build`
  green, `verify-turn12.ts` unchanged **20/20**. Full regression sweep 0
  diff, every count matches the acceptance criteria exactly:
  `turn11-menu.json` **56/56**, `turn11-featherdance.json` **178/178**,
  `turn11-rockslide.json` **163/163**, `turn10-aerialace.json` **18/18**,
  `turn10-rockslide.json` **220/220**, `turn8-bind-a.json` **256/256**.
- **Did:** added `turn11Resolved` as a new `BattleSceneState` field
  threaded through the FULL existing reopen-gate chain (mirroring every
  prior `turnNResolved` flag verbatim) — ROCK_SLIDE now a 9th slot-0 PP
  use, 1/10 entering turn 12 (corrects the brief's own stale "2/10").
  `drawTurn12AerialAceWindow` calls turn 10's own five mechanism
  functions VERBATIM (re-anchored to a fresh live `pressTick`, Onix's HP
  14→4) via a new `drawTurn12FieldBase`/`turn12KickoffBounceTick` regime-7
  wrapper — no new mechanism code anywhere. `drawTurn12RockSlideWindow`
  mirrors `drawTurn8BindWindow`'s own text-swap-over-frozen-field
  structure exactly (synthetic `TURN12_ROCKSLIDE_PRESS_TICK=14237`,
  reused `ROCK_SLIDE_LINE1/2`→`TURN8_MISS_LINE1/2` swap, 95-tick
  miss-hold, 7-tick clear-to-redraw). One real gap correctly EXCLUDED not
  fixed: turn 10's own committed traces leave RAM 12363-12437
  uncaptured (mechanism-3 residual + an unmodeled hit-flash flicker); the
  first `turn12-aerialace.json` draft sampled inside the +2068-shifted
  equivalent and showed real diffs (up to 4.33%) — corrected by excluding
  that same relative range, per the brief's own explicit instruction.
- **Next:** turn 13 — its probe/verify script (`verify-turn13.ts`,
  46/46) already landed two sessions ago; natural next step is wiring it
  the same way, adding a `turn12Resolved` flag off
  `TURN12_ROCKSLIDE_MENU_REDRAW_DELAY` (already exported).
- **Notes:** `docs/battle-turn-notes.md` §45 has the full writeup.
  AERIAL_ACE mechanisms 3/4 (§42/§43) and the hitsplat (ISSUES #31)
  remain untouched, out of scope. No PAPERCUTS beyond the standing
  mgba-venv-teardown one.

---
## 238 — Supervisor merge fold ×3 + ISSUES #31 filed: (1) turn-12 probe (`wt-125234`): AERIAL_ACE recurs **bit-exact at +2068 RAM ticks** off turn 10's 5-mechanism tables (pressTick=14373, zero corrections); ROCK_SLIDE-miss half RAM-proven **zero-animation** (pressTick=14237; kickoff text only, hit mechanisms never fire — bit-exact to turn 8's BIND-miss precedent incl. the identical 95-tick miss→clear gap); `verify-turn12.ts` **20/20** — turn 12 is pure wiring, both halves. (2) hitsplat palette-tint probe (`wt-130606`): REFUTED — `gPlttBufferFaded` byte-identical to unfaded, bank 7, every live tick (supervisor-rerun) — third refuted hypothesis, filed as **ISSUES #31** with the two untested avenues. (3) turn-13 probe (`wt-131215`): `verify-turn13.ts` **46/46**, wiring-only verdict, 3 dossier §4 corrections (6 idle-bounce phases not one plateau; cursor-jump at exactly 15408; a previously-missed ~90-tick SAND_ATTACK mid-message animation 15540-15629 = the ONE real unknown before that half renders)

- **State (supervisor-verified post-merges):** `npm test` **957/957**,
  `npm run build` green; verify scripts fresh from main tree: turn12
  20/20, turn13 46/46 (turn9-postlunge 108/108 + turn11 52/52 an hour
  earlier). No worktrees, no unmerged branches. Turns 9/10/11 traces all
  supervisor-rerun this hour: 159+77+163 / 83+18+220 / 56+178+163.
- **Notes:** probe scoreboard this session: turn-10-rockslide,
  turn-11, turn-12, turn-13 all "pure wiring" verdicts with PASS/FAIL
  scripts; the three hitsplat refutations close every named lead — #31
  carries the avenue list so nobody re-fits blends. Turn-13's probe also
  demonstrated the verify-script convention retrofits onto an
  already-folded dossier cleanly.

---
## 237 — Bounded worker (S7 slice R rung 0 + turn 11 rungs 1-3): turn 9's flicker gap CLOSED (20→32-tick table extension, `turn9-quickattack.json` 159/159) and turn 11's whole arc (menu reopen, FEATHER_DANCE-blocked half, ROCK_SLIDE half) LANDS 0-diff through the turn-12 menu boundary — new `turn11-menu.json` **56/56**, `turn11-featherdance.json` **178/178**, `turn11-rockslide.json` **163/163**; one genuine cross-regime idle-bounce bug found + fixed along the way

- **State:** `npm test` **957/957** (946 + 11 new), `npm run build`
  green, both mandatory verify scripts fresh: `verify-turn9-postlunge.ts`
  **108/108**, `verify-turn11.ts` **52/52**, both unchanged. Full
  regression sweep 0 diff, every count matches the acceptance criteria
  exactly: `turn9-quickattack.json` **159/159** (117 base + 42 new),
  `turn9-quickattack-b.json` **77/77**, `turn9-rockslide.json` **130/130**,
  `turn10-menu.json` **83/83**, `turn10-rockslide.json` **220/220**,
  `turn6-feathers.json` **235/235**.
- **Did:** (rung 0) bumped `TURN9_EP2_FLICKER_TOTAL_TICKS` 20→32 — the
  4th flicker block and the task's own force-visible tick both fall out
  of the existing `n % PERIOD < ON` gate with no special-casing, exactly
  as the dossier's own addendum predicted (no new mechanism). (rungs 1-3)
  added `turn10Resolved` as a new `BattleSceneState` field threaded
  through the FULL existing reopen-gate chain in `core.ts` (mirroring
  every prior `turnNResolved` flag verbatim) + `drawFightSubmenuWindow`'s
  dispatch chain + `currentPPForActiveMon`'s PP-decrement chain (ROCK_SLIDE
  now an 8th slot-0 use, 2/10 entering turn 11); `drawTurn11FeatherDanceWindow`
  reuses turns 6/7/8's own kickoff-text functions unchanged, omits the
  feather-sprite draw calls entirely (RAM-confirmed they never fire), then
  dispatches the new ATK-floor message; `drawTurn11RockSlideAttack`/`Window`/
  `TurnEndSettledMenu` mirror turns 6/7/9/10's own instances with only the
  press tick + Pidgeotto's HP (38→16) new. One real bug found via
  `npm run compare` itself (not guessed): turn 11's own FIGHT-submenu
  browsing phase needs its OWN regime-shift constant
  (`TURN11_REGIME6_TO_REGIME1_SHIFT` + `drawTurn11FieldBase`), not turn
  10's — `menuIdleBounce`'s underlying task genuinely restarts at every
  turn's own menu redraw. Also caught+fixed a 1-tick error in the dossier's
  own "13858" text-clear citation (real hardware holds through 13858,
  clears at 13859).
- **Next:** turn 12 (a sibling probe owns `turn12-notes.md` this round,
  out of scope here) — `battle-turn-notes.md` §15's own predicted
  ROCK_SLIDE miss (PP 1/10→0/10) is the natural next full-turn scout.
  Standing named gaps unchanged: the hitsplat tip/edge residual (10935-10944,
  next instrument: `gPlttBufferFaded` tint dump — do NOT re-attempt a
  blend-coefficient fit, decisively refuted); AERIAL_ACE mechanisms 3/4
  (§42/§43's gaps, untouched this session, out of scope).
- **Notes:** `docs/battle-turn-notes.md` §44 has the full writeup. No
  PAPERCUTS beyond the standing mgba-venv-teardown one.

## 236 — Supervisor merge fold ×2: (1) turn-9 gap-probe SALVAGE (`wt-120256`, cap-killed mid-writeup, supervisor verified+committed its work): §41's "new hit-flash mechanism" DISSOLVED — it's the flicker task's FOURTH 4-tick block (`DoHitAnimBlinkSpriteEffect` runs 32 ticks = 4 blocks; the earlier probe stopped sampling at RAM 10977; the "position-dependent recolor" was background showing through the erasure) — `verify-turn9-postlunge.ts` now **108/108**; hitsplat stale-coefficient hypothesis REFUTED decisively (best brute-force (eva,evb) fit 62.2%; RAM-true 12/8 scores WORSE than current 16/16; floor-vs-round also refuted; RAM attrs banked: objMode=1, BLDCNT=0x3f40, BLDALPHA=0x080c; next instrument named: gPlttBufferFaded tint dump). (2) turn-11 probe (`wt-123722`): BOTH halves pure parameterizations — ROCK_SLIDE pressTick=13137 (full draw-order sequence verified vs real sSpriteOrder, 0/117 + 0/980 mismatches), FEATHER_DANCE pressTick=13339 with **0 feather-template OAM hits — direct RAM proof the blocked stat change short-circuits before createsprite**, so no feather table needed; ONE new branch (ATK-floor "won't go lower!" message, +83 delay, real apostrophe U+2019); `verify-turn11.ts` **52/52**

- **State (supervisor-verified post-merges):** `npm test` **946/946**,
  `npm run build` green, verify scripts fresh: turn9-postlunge 108/108,
  turn11 52/52 (plus turn10-rockslide 44/44, turn10-aerialace 20/20
  earlier this hour). Turn-12 probe in flight on `wt-20260721-123745`-
  family branch. Turn-9's capture gap (10945-10986) is now closeable:
  the 4th-block fix is a table extension; only hitsplat-live renders
  10935-10944 stay blocked (palette-tint instrument named).
- **Notes:** salvage protocol: verified the killed worker's uncommitted
  verify-script/diagnostics by rerunning them myself, wrote the dossier
  append from its in-code comments + script outputs, committed on its
  branch with provenance noted. Both diagnostics' NEGATIVES (coefficient
  + rounding) are the load-bearing finding — do NOT re-brief a blend-fit.

---
## 235 — Bounded worker (S7 slice R rung (a)): turn 10's ROCK_SLIDE half LANDS 0-diff end-to-end (kickoff through the turn-11 menu boundary) — `TURN10_ROCKSLIDE_PRESS_TICK=12169` wired through the existing turns-6/7/9-style dispatcher parameterization, plus Onix's own AERIAL_ACE-drain aftermath (HP drain 24→14 + "not very effective" text, both fresh-oracle-bisected); new `turn10-rockslide.json` **220/220, 0 diff**; rungs (b)/(c)/(d) NOT attempted this session (time-boxed), gaps unchanged from §42

- **State:** `npm test` **946/946** (936 + 10 new), `npm run build`
  green, both mandatory verify scripts (`verify-turn10-rockslide.ts`,
  `verify-turn10-aerialace.ts`) still fully passing, unchanged. Full
  regression sweep 0 diff: `turn10-menu.json` **83/83**,
  `turn10-aerialace.json` **18/18**, `turn9-quickattack.json`
  **117/117**, `turn9-quickattack-b.json` **77/77**, `turn9-rockslide.json`
  **130/130**, `turn1-rockslide.json` **256/256**.
- **Did:** `drawTurn10RockSlideAttack`/`Window`/`TurnEndSettledMenu`
  mirror `drawTurn9RockSlideAttack`/`Window` exactly, reusing every
  `rockSlide*` mechanism function unchanged with turn 10's own synthetic
  pressTick + Pidgeotto's 61→38 drain. `drawTurn10AerialAceWindow` now
  threads Onix's live draining HP (`turn10AerialAceOnixHp`, 24→14)
  through a new `onixHp` param on `drawTurn10FieldBase` (defaulted,
  every pre-existing caller unaffected), swaps to "It's not very
  effective..." once the drain settles, then hands off to the ROCK_SLIDE
  window at its own kickoff text start. Three new turn-end delay
  constants (super-effective text, text-clear, menu-redraw) each
  fresh-bisected via a scratch `drawText`+charmap probe against a live
  oracle capture, not assumed transferable from prior turns' own values.
- **Next:** rungs (b)/(c)/(d) — see §42's own handoff, unchanged: (1)
  mechanism 3's residual (renders 12363-12366, bisect the LUNGE table's
  early entries), (2) mechanism 4 (re-derive the live BG palette BANK
  NUMBER via direct RAM read, `dump-aerialace-anim.py` precedent, before
  retrying the darken render), (3) once both close, extend
  `turn10-aerialace.json` past 12362 through the dossier's own 12389
  settle boundary. No `src/` code for mechanisms 3/4 touched this
  session (nothing to revert).
- **Notes:** `docs/battle-turn-notes.md` §43 has the full writeup. No
  PAPERCUTS beyond the standing mgba-venv-teardown one.

## 234 — Supervisor merge fold: turn 10's ROCK_SLIDE half is a PROVEN pure parameterization (`worker/wt-20260721-114115` merged) — synthetic `pressTick=12169` satisfies EVERY shipped rockSlide* delay constant from turns 3/5/6/7/9 and reproduces turn 10's RAM through the real unmodified `rockSlideRockState`/`rockSlideDrawOrder` with 0 mismatches (261+125 sampled ticks); both HP drains re-pinned (Onix 24→14, Pidgeotto 61→38); dossier CORRECTED (turn-11 menu boundary has the standard idle-bounce, NOT flat); `tools/probe/verify-turn10-rockslide.ts` **44/44 supervisor-rerun** post-merge

- **State (supervisor-verified post-merge):** `npm test` **936/936**,
  `npm run build` green, verify script 44/44 fresh (145 ticks), worktree
  cleaned up. One honest unresolved probe gap: a RAM "target invisible"
  signal spans the rock-fall window with NO pixel effect (same family as
  §37's invisible-bit rule — flagged so nobody models a phantom hide).
- **Notes:** with #233's AERIAL_ACE state, turn 10's remaining work =
  (a) mechanical ROCK_SLIDE wiring, (b) mechanism-4 palette-pulse render
  retry (§42 handoff, pure table already Tier-1-pinned), (c) extend
  aerialace coverage past 12362. Turn-9 gap probe (hitsplat tip +
  hit-flash) in flight on `worker/wt-20260721-120256`.

---
## 233 — Bounded worker (S7 slice R rung (b) implementation): all 5 AERIAL_ACE mechanisms wired; mechanism 5 (slice) fully 0-diff, mechanisms 1/3 (lunge+clones) land their own first tick with a small unresolved residual just past it, mechanism 4 (palette pulse) REVERTED as badly wrong (pure table kept) — `turn10-aerialace.json` **18/18, 0 diff** (12345-12362, smaller than the dossier's full window)

- **State:** `npm test` **936/936** (921 + 15 new), `npm run build`
  green, `verify-turn10-aerialace.ts` **20/20 fresh** (mandatory first
  step, rerun unchanged after implementation). Full regression sweep 0
  diff, unchanged counts: `turn10-menu.json` **83/83**,
  `turn9-quickattack.json` **117/117**, `turn9-quickattack-b.json`
  **77/77**, `turn9-rockslide.json` **130/130**, `turn1-cloneanim.json`
  **230/230**.
- **Did:** wired all 5 mechanisms into a new `drawTurn10AerialAceWindow`
  dispatcher (`turn10AerialAceLungeOffset`/`Slot4Offset`/`Slot7Offset`/
  `OnixShakeY2`/`PaletteDarkenCoeff`/`SliceState`), loaded the
  cutting-slice asset (`battleAnimCuttingSlice`), and threaded
  `onixY2Extra`/`darken`/`paletteOverride` params through
  `drawTurn5RockSlideAttack`/`drawTurn6FieldBase`/`drawTurn10FieldBase`/
  `staticBgPixel` (all defaulted no-ops, confirmed by the sweep). The
  slice sprite's own per-tick table turned out RAM-tick-indexed despite
  its own "render tick" column header — resolved by matching the
  oracle's own 71px onset patch pixel-for-pixel against the asset's
  frame-0 opacity mask (a CENTER-based OAM corner, uniform +1 lag).
  Mechanism 3 needed the SAME asymmetric "+1 extra tick at each life's
  START only" fix §39 already root-caused for QUICK_ATTACK's own
  clones, plus QUICK_ATTACK's own ground-clip constant reused verbatim
  — closed the worst of the residual but not all of it (small residual
  renders 12363-12366, shrinking 666→29px, NOT feet-related, not
  root-caused). Mechanism 4's render application came out badly wrong
  (~48-54% of the whole frame mismatches at the plateau) — reverted
  per the brief's own "revert partial render code, keep the pure
  table" rule; `darken` is hardcoded false in the dispatcher now.
- **Next:** (1) mechanism 3's residual — bisect the lunge table's own
  early entries (indices 0-2) first, a "disable clones" experiment this
  session ran rules out a pure clone-position bug. (2) mechanism 4 —
  re-derive the live BG palette BANK NUMBER via direct RAM read (this
  session guessed by RGB-proximity against the extracted static asset,
  which is why it's wrong). (3) once both close, extend
  `turn10-aerialace.json` past 12362 through the dossier's own 12389
  settle boundary in one pass (mechanism 2 becomes independently
  provable there too, since its own window opens right after).
- **Notes:** `docs/battle-turn-notes.md` §42 has the full writeup incl.
  the exact pixel evidence for both the landed mechanisms and the two
  named gaps. No PAPERCUTS beyond the standing mgba-venv-teardown one.

## 232 — Supervisor merge fold: AERIAL_ACE fully RAM-pinned and asset-ready (stacked chain `worker/wt-20260721-111226`+`112501` merged, 3 commits) — cutting-slice sheet extracted + **VRAM-verified 0 mismatches** (OAM is AFFINE-OFF + OBJ-BLEND, checked not assumed), all FIVE mechanisms pinned in `docs/aerial-ace-notes.md` (live pressTick 12305 instrumented; two §40 corrections: lunge window +1 tick, clone life-ends +1 tick; mechanisms 1/3 need **+2** render lag vs 5's +1; mechanism 4 is a SOFTWARE `BlendPalette()` 2-step, not BLDY hardware — the brief's own assumption falsified with evidence; 71px onset patch attributed to mechanism 5). `tools/probe/verify-turn10-aerialace.ts` **20/20 supervisor-rerun** post-merge

- **State (supervisor-verified post-merge):** `npm test` **921/921**
  (917 + 4 asset pins), `npm run build` green, verify script 20/20
  fresh from the main tree, worktree chain cleaned up. Turn-10 rung-(c)
  probe (ROCK_SLIDE/turn-end) in flight on `worker/wt-20260721-114115`.
- **Notes:** next engine slice (AERIAL_ACE wiring) is a wiring job:
  asset + all tables banked, verify script gates it. Also verified this
  fold: rung c3's hitsplat fixes closed `turn2-endeavor-drain`'s last
  residual (now **201/201**, was 200/201 since S7 slice E1) — supervisor-
  rerun confirmed, no capture changes.

---
## 231 — Bounded worker (S7 slice R rungs c3/c4/d): rungs (c4) and (d) LAND 0-diff (`turn9-quickattack-b.json` **77/77**, new `turn9-rockslide.json` **130/130**); rung (c3) lands Onix's own shake exactly but the hitsplat's own pixels + a pre-existing slot4-tail residual stay a named small gap, and a genuine NEW mechanism (Onix's own brief whole-sprite hit-flash, render 10983-10986) was found and left unmodeled

- **State:** `npm test` **917/917** (896 + 21 new), `npm run build`
  green, `verify-turn9-postlunge.ts` **99/99 fresh** (mandatory first
  step, reran unchanged after implementation too). Full regression sweep
  0 diff: `turn9-quickattack.json` **117/117** (unchanged, NOT extended —
  see gap), `turn9-menu.json` **111/111**, `turn10-menu.json` **83/83**,
  `turn2-endeavor-drain.json` **201/201**, `turn1-rockslide.json`
  **256/256**.
- **Did:** wired ep2 (healthbox y2 wobble + the SEPARATE Onix flicker,
  two independent tables per the brief), Onix's HP drain (31→24), the
  single-line "not very effective" reveal, the settled hold, and the full
  ROCK_SLIDE half (synthetic `TURN9_ROCKSLIDE_PRESS_TICK=10717`,
  cross-confirmed by 3 independent shared-constant offsets landing on
  the dossier's own cited ticks) — new `drawTurn9QuickAttackWindow`
  dispatcher replaces the old "kickoff text held forever" stub. Onix's
  own x2 shake (ep1) is pixel-proven exact in isolation. The hitsplat
  itself got 2 real RAM-grounded fixes (matrix 303 not ENDEAVOR's 372;
  force-blended at `eva=16,evb=16` against live `fb`, not a flat
  palette) that took its diff from ~1700px to ~150-380px/tick but not to
  0 — a fine edge/tip residual, time-boxed. A pre-existing rung-(c2) bug
  (afterimage clones ignoring the lunge's own ground-clip) was fixed
  along the way (`maxY` added to `drawSpriteSheetBlendedOverFb`).
- **Next:** (1) hitsplat tip-pixel residual — dump the exact sampled
  source index at 2-3 mismatched tips to find the affine-scale rounding
  fix. (2) the new hit-flash discovery (10983-10986) needs a direct
  `gPlttBufferFaded`/OBJ-palette-bank RAM read — sampling proved it's
  NOT a simple per-color blend or remap (position-dependent output for
  identical input colors). (3) once both close, extend
  `turn9-quickattack.json` into 10935-10986 for a fully contiguous
  rung (c3)/(c4) capture.
- **Notes:** `docs/battle-turn-notes.md` §41 has the full writeup incl.
  every RAM probe and the exact math that solved the blend ratio. No
  PAPERCUTS beyond the standing mgba-venv-teardown one.

## 230 — Supervisor merge fold: turn 9's ENTIRE post-lunge window ground-truthed by a two-probe stacked chain (`worker/wt-20260721-103557` merged, 2 commits) — shake episode 2 ROOT-CAUSED as two independent RAM+1 mechanisms (20-tick healthbox y2 wobble + a separate 3-block Onix visibility flicker; Onix's sprite never moves), episode-1/hitsplat lag classes pinned (+1 hitsplat, +2 shake incl. a creation-tick stall), and the full C4 territory pinned (HP drain 31→24 lag-free w/ band flip at 10999; message reveal 1 char/tick 11005→11028, ONE line — dossier corrected; settled hold 11028-11109 FLAT; rung-(d) transition anchor 11110). `tools/probe/verify-turn9-postlunge.ts` **99/99 supervisor-rerun** from the merged main tree

- **State (supervisor-verified post-merge):** `npm test` **896/896**,
  `npm run build` green, verify script 99/99 fresh, no worktrees, no
  unmerged branches. Two turn9-notes.md label corrections folded with
  my own PNG re-read at 11040 (one-line message, Onix 24/117).
- **Notes:** probe chain = round-2 worktree (12.5 min) + stacked
  follow-up (19 min, nested worktree base 832e65a). One mis-based
  launch in between (my error: invoking the MAIN tree's launcher by
  absolute path from inside a worktree bases the new worktree on
  master, NOT the branch — nesting requires the worktree's OWN script
  copy invoked relatively); the worker caught it and stopped honestly
  at $0.27. PAPERCUTS: exit-139 teardown-segfault entry added (two
  workers re-confirmed it this session). Rungs (c3)/(c4)/(d) are now
  wiring jobs against the 99-check script.

---
## 229 — Bounded worker (S7 slice R rung (a)): turn 10's FIGHT-submenu reopen LANDS 0-diff, zero navigation presses — `turn10-menu.json` **83/83, 0 diff**; rung (b) (AERIAL_ACE's animation) RAM-probed to a concrete 5-mechanism inventory, NOT implemented — one mechanism needs a genuinely new sprite asset, out of cap

- **State:** `npm test` **896/896** (892 + 4 new), `npm run build` green,
  tree clean. `turn10-menu.json` (new, 83/83, 0 diff) covers the reopen
  (12262) through AERIAL_ACE's own kickoff text settling (12344), one
  tick before the animation's first pixel change. Full regression sweep
  (~35 traces incl. `turn9-menu` 111, `turn9-quickattack` 117,
  `turn6-feathers` 235, `turn1-rockslide` 256) all re-verified 0 diff,
  unchanged counts.
- **Did:** `turn9Resolved` state flag (mirrors turn1..turn8Resolved),
  cursor persists ROCK_SLIDE(0), PP ledger gains a 7th slot-0 decrement
  (3/10). Real bug found and fixed along the way: the settled menu for
  the gap between turn 9's own (unmodeled) resolution and turn 10's own
  press isn't gated by a button-press flag — it's a pure-`t` redraw check
  inside turn 9's OWN dispatcher (same shape `drawTurn7RockSlideWindow`/
  `drawTurn8BindWindow` already establish), safe since it only fires past
  `turn9-quickattack.json`'s own committed window. `TURN9_MENU_REDRAW_
  DELAY` fresh-oracle-bisected to 574 (NOT the dossier's own prose value
  579 — the bounce task resets 5 ticks before the visual settle, per
  `MENU_BOUNCE_RAM_SETUP_TICK`'s own precedent) against the new trace's
  own capture, 0/83 mismatches vs. 5-46 at every other delta from -5 to
  +8 tried. Then RAM-probed rung (b) (mandatory first step, per the
  brief): `Move_AERIAL_ACE`'s script is FIVE concurrent mechanisms
  (Pidgeotto's own short elliptical lunge, Onix's own shake, two blended
  trace/afterimage clones — parameterizable from QUICK_ATTACK's own
  code, a background palette-blend pulse, and a "cutting slice" sprite
  that needs a genuinely new asset+render routine) — exact RAM tables for
  all five banked in battle-turn-notes.md §40, none implemented.
- **Next:** rung (b)'s 4 parameterizable mechanisms could land quickly;
  the cutting-slice sprite (asset extraction + new draw routine) is
  comparable scope to this whole session's rung (a) on its own. Rung (c)
  (ROCK_SLIDE + both HP drains + turn-end through turn-11's own menu)
  entirely unattempted.
- **Notes:** `docs/battle-turn-notes.md` §40 has the full RAM probe
  (task/sprite tables, exact x2/y2 sequences per mechanism, source script
  cross-read). No PAPERCUTS this session.

## 228 — Supervisor merge fold: **ISSUES #30 FULLY CRACKED and closed** by the round-1 worktree worker (branch `worker/wt-20260721-095153` merged) — candidate A's sSpriteOrder draw-order adopted AND the real root cause of BOTH residual classes found: feathers are `ST_OAM_AFFINE_NORMAL` (not `_DOUBLE`), so `drawSpriteSheetAffineRotate`'s unconditional doubled destination box painted rotated feather corners over Onix; new `doubleSizeBox=false` param at the feather call only. Turn-6 residual window 425px → **0px on all 129 ticks**, turns 7/8 likewise; feather traces extended **106→235, 16→145, 33→162**, suite **892/892**

- **State (all supervisor-verified post-merge, main tree):** `npm test`
  **892/892**, `npm run build` green. Supervisor-rerun 0 diff:
  `turn6-feathers` 235/235, `turn7-feathers` 145/145, `turn8-feathers`
  162/162, `turn9-quickattack` 117/117, plus spot-checks `sendout`
  255/256 (ISSUES #18's settled tick), `turn6-rockslide-a` 255/255,
  `turn8-bind-a` 256/256, `turn6-statfall` 127/127. Source claim
  independently verified (`battle_anim_flying.c:175`,
  `gOamData_AffineNormal_ObjNormal_32x32`). Worktree + branch cleaned up.
- **Notes:** the "two independent residual classes" forensic split (#224)
  dissolved — one box-clip bug explained both signatures. The default-true
  param keeps every other affine caller byte-identical (ball spin
  verified via `sendout`). Dossier: `docs/feather-order-notes.md`'s
  2026-07-21 adoption section. ISSUES #30 removed this commit.

---
## 227 — Bounded worker (S7 slice R rung (c2)): QUICK_ATTACK's two afterimage clones LAND 0-diff — three real bugs found by RAM re-probe + oracle-PNG bisection (a boundary-transcription truncation, a blend-target-2 rule, a creation-lag tick, plus a "feet stay grounded" clip), `turn9-quickattack.json` **117/117, 0 diff** (up from 112)

- **State:** `npm test` **888/888** (880 + 8 new Tier-1 pins), `npm run
  build` green, tree clean. `turn9-quickattack.json` captureFrames extended
  112→117 (adds 10930-10934, the whole window provable before rung (c3)'s
  unmodeled hitsplat obscures further ticks), 0 diff. Regressions
  re-verified 0 diff: `turn9-menu.json` 111, `turn8-menu.json` 88,
  `turn1-cloneanim.json` 230.
- **Did:** Per the retry handoff's mandatory first step, fresh RAM re-probe
  (`dump-quickattack-anim.py`) of the slot-3/4 boundary ticks confirmed
  §36/§38's table EXCEPT slot 3's second life, transcribed as `[67,69]`
  (RAM 10938-10940) but actually alive through RAM 10945 — a 5-tick
  truncation bug, corrected to `[67,74]`. Fixing just that didn't move the
  needle (reproduced §38's exact prior diff counts), so bisected further
  via cropped oracle-PNG pixel diffs and found two more real bugs: (1)
  `blendedTile`'s target-2 must be the LIVE framebuffer, not the plain
  static background, whenever a clone overlaps the real sprite (RAM's
  `BLDCNT` target-2 mask includes OBJ) — clones now draw AFTER the real
  sprite's own opaque redraw, blending over `fb` (new `blendedTileOverFb`/
  `drawSpriteSheetBlendedOverFb`); (2) a freshly-created clone needs ONE
  MORE tick of latency than the usual render=RAM+1 lag before its first
  blended pixel (proven via the already-exact render 10929, which
  regresses if slot 3 draws there — blending a color with itself at
  `eva+evb=20` doesn't preserve it); (3) the real sprite's own feet stay
  grounded (unmoved) through the whole lunge — new `TURN9_QUICKATTACK_
  LUNGE_GROUND_CLIP_Y=74` clips both the footprint erase and the redraw
  below that absolute screen row. All three pixel-confirmed, not guessed.
- **Next:** rung (c3) (hitsplat, slot 7, RAM-created 10934/render 10935,
  `drawEndeavorHitsplats`'s own 10-tick precedent; Onix's shake episode 1,
  slot 6, `x2` square-wave `5,5,0,0,5,5,0,0` RAM 10936-10943 — this
  session's own fresh probe, §39) fully unattempted, ran out of cap after
  landing (c2). Landing (c3) will also retroactively test Bug 2's
  untested half (slot 3 life-2 start, slot 4's own start), since the
  hitsplat's own render window overlaps both. Rung (d) ROCK_SLIDE still
  waits on (c) finishing.
- **Notes:** `docs/battle-turn-notes.md` §39 has the full diagnosis (RAM
  table, all three bugs, the fix, honest scope of what's independently
  pixel-proven vs. reasoned-by-symmetry). No PAPERCUTS this session.

## 226 — Supervisor wind-down: session end 2026-07-21 ~06:30 — **16 worker steps verified and folded** (8 main-lane + 8 worktree, 10 rounds); suite **821 → 880/880**; headlines: **turns 6-9 landed as engine slices** (turn 6 complete end to end incl. the stat-fall banner and ROCK_SLIDE vs Pidgeotto; turns 7/8 complete minus feather sub-windows; turn 9 through QUICK_ATTACK's lunge), **the dossier pipeline is GAPLESS from anchor through battle 1's WIN to battle 2's swap prompt** (turns 15/16/17 + post-WIN scouted, prefix-verified, incl. the run's first status-condition ground truth and the RNG-resume/opponent-2 window bisected to 105 ticks), and **FIVE standing issues resolved by the probe-first pattern** (#26 Sitrus ring closed via closed-form crack, #27 RNG call attributed, #28+#29 bounce-shift families root-caused AND fixed — 32 excluded ticks restored, #30 narrowed: candidate A crowned, half-texel eliminated, residual split into two named classes)

- **State (verified this minute):** `npm test` **880/880**, `npm run
  build` green, tree clean, no worktrees, no unmerged branches. Traces
  landed/extended this session (all supervisor-rerun 0 diff):
  turn5-sitrus-c 150→181, turn6-menu 33→44, turn6-statfall 127,
  turn6-rockslide-{a,b} 255+105, turn6-feathers 106, turn7-menu 85→93,
  turn7-rockslide-{a-d} 787, turn7-feathers 16, turn8-menu 78→88,
  turn8-bind-{a,b} 322, turn8-feathers 33, turn9-menu 111,
  turn9-quickattack 112. Groundtruth: battle1-turn{15,16,17}-dense +
  battle1-postwin-dense (854 captures total, all prefix-chain-verified).
- **The probe pattern was the session's engine:** five 30-min
  RAM/source-first worktree probes (8-17 min each) resolved what
  repeated bounded fitting could not — every "quirk" label fell to a
  small real engine bug or a closed form. Two fix steps then restored
  37 previously-excluded ticks across 4 traces. The pattern is now
  standard: probe ships a verify script, fix worker re-runs it first.
- **Next:** (1) slice R rung (c2)+(d) — afterimage clones (§38's
  bisection plan: single-digit-% per-tick diffs, skip-mask ruled out)
  then ROCK_SLIDE/turn-end to finish turn 9; (2) turns 10-13 as
  parameterizations (dossiers exist); (3) adopt #30's candidate A
  (mechanical recipe banked) + chase its class-(b) occlusion bug; (4)
  turn 9's shake-episode-2 parity + #30 class (a) + #23 remain the hard
  unknowns; (5) S8 engine slices (win sequence → post-WIN scenes →
  swap) now have complete ground truth.
- **Notes:** no usage-limit events; zero merge conflicts across 8
  worktree merges (incl. one intentional stacked/nested pair, folded in
  one merge, cleaned inner-first); no PAPERCUTS.md changes (three
  in-dossier notes, none tooling-class); worker discipline strong (three
  honest no-land stops, every one with banked findings the next attempt
  landed on; the cwd-persistence gotcha bit the SUPERVISOR twice —
  memory updated). Interactive session; no escalations needed — the
  one near-trigger (slice R's consecutive non-landings) resolved under
  the established convergence-counting convention (§35→§36→§37→landed).
---
## 225 — Bounded worker (S7 engine slice R rung (c) RETRY #3): mandatory diagnostic CONFIRMS the LIVE pressTick (10871) mismatches §36/§37's assumed anchor (10867) by 4 ticks — rung (c1) (lunge + erase-footprint) LANDS clean, `turn9-quickattack.json` **112/112, 0 diff**; rung (c2) (afterimage clones) gets close (diff shrinks to single digits % at every tick) but not 0-diff, reverted honestly

- **State:** `src/engine/battleScene.ts` has rung (c1) only (lunge table +
  `erasePidgeottoFootprint` + `drawTurn9QuickAttackLunge`, wired into
  `drawTurn9FightSubmenuWindow`). `npm test` **880/880** (877+3 new
  Tier-1 pins), `npm run build` green. New `tools/compare/traces/
  turn9-quickattack.json` committed, **112/112, 0 diff** (extends
  `turn9-menu.json`'s own 10818-10928 boundary one tick to 10929, the
  animation's own first active render). Regressions unchanged:
  `turn9-menu.json` **111/111**, `turn8-menu.json` **88/88**,
  `turn1-cloneanim.json` **230/230**.
- **Did:** Per the retry brief's mandatory first step, instrumented the
  LIVE dispatcher (`tools/compare/scratch/diag-quickattack-anchor.ts`,
  committed) instead of re-guessing — ran `battle1-turn9-dense.json`'s
  own script through the real `core.ts` `tick()` and printed
  `fightSubmenu.confirmElapsed` at the key ticks: constant `9831`
  throughout, so `pressTick = TICK0+confirmElapsed = 10871`, not
  §36/§37's assumed `10867`. **This confirms suspect (1) outright** (a
  4-tick anchor error, not eliminated as a red herring). Re-wrote the
  lunge table's delay constant from the correct algebra (`57 =
  10928-10871`, not the reverted attempt's `61 = 10928-10867`) — same
  RAM-tabled offsets from §36, same erase/redraw shape as the reverted
  attempt, only the anchor fixed. Suspect (2) (axis/mirror) never needed
  invoking — checked by precedent first (`drawDoubleTeamClones`/
  `endeavorShakeX2` both apply RAM `x2` via plain addition to the
  opponent-side corner, no mirror; this fix uses the same convention)
  and confirmed sufficient by the clean pixel match. Landed (c1) fully
  green (0 diff 10924-10929, the lunge's first active tick). Attempted
  (c2) (the two `TraceMonBlended` afterimage clones, `drawSpriteSheetBlended`
  reused verbatim, undarkened per §36): diff pixel counts shrank
  substantially at every touched tick (e.g. 10933: 1180→123px, 10934:
  1125→39px) confirming the general approach right, but none reached 0
  — ruled out the healthbox-skip-mask as the cause (removing it left
  diff counts byte-identical), crop-diffed tick 10930 and found the
  afterimage's own rendered detail looks flatter than the oracle's, not
  root-caused before the cap — reverted rather than commit a
  shrunk-but-nonzero diff as if it were a landed rung.
- **Next:** round 13 — rung (c2) retry: `docs/battle-turn-notes.md` §38
  has the full diagnostic (live-pressTick console output, the c1 table,
  the c2 diff-shrinkage data, the ruled-out skip-mask candidate, and a
  4-step bisection plan — RAM-reverify the slot-3/4 lifetime boundary
  ticks first, then isolate slot 3 alone before debugging both
  afterimages together). Rungs (c3) (hitsplat + shake episode 1) and
  (c4) (drain/text) remain fully unattempted. Rung (d) (ROCK_SLIDE)
  still waits on (c) landing a correct prefix.
- **Notes:** the mandatory-diagnostic-first discipline the brief
  demanded paid off directly — a 5-minute `console.log` harness found
  the exact 4-tick anchor bug the PRIOR session's retry (#223) spent its
  whole cap failing to root-cause blind. PAPERCUT: none beyond prior
  sessions' own.

## 224 — Worktree probes ×2 (supervisor-folded, stacked branches): ISSUES #30's pixel test CROWNS CANDIDATE A (425→230px, ≤B on 129/129 ticks, turns 7/8 generalize 46→17px; mechanical adoption recipe banked) and the half-texel lead is ELIMINATED DECISIVELY (11/11 variants 78-142× worse — the sampler's center convention is CONFIRMED correct); forensics splits the remaining ~230px into TWO independent classes — soft-gradient unknown (a) and an ONIX-GRAY occlusion-boundary error at the priority split (b), a different, locatable code path; merged, suite 877/877

- **State:** both stacked probe branches merged in one merge, `npm
  test` 877/877 + build green, nested worktrees cleaned inner-first.
  ISSUES #30 rewritten with the three-probe state + the two-class
  split. The second probe caught its own early methodology error
  (ungated compositing patch) via palette forensics before it could
  mislead — the gated `matchesReal` protocol held.
- **Next:** third targeted attempt at slice R rung (c) launching now
  (40-min cap, §37's named diagnostic first: pressTick anchor vs
  axis/mirror); then wind-down. Future sessions: adopt candidate A
  (mechanical), chase #30 class (b) as an ordinary occlusion bug, turn
  9 rung (d) + turns 10-13 parameterizations, #30 class (a) + #23 stay
  the two hard unknowns.
- **Notes:** probes in contract (12.7 + 17.2 of 30 each).

---
## 223 — Bounded worker (S7 engine slice R rung (c) RETRY): §36 puzzle #1 (real-sprite hide/unhide) RESOLVED by direct pixel evidence — the `invisible` RAM bit never gates rendering, real sprite draws continuously at its own x2/y2; implementation attempt hit an unresolved on-screen position bug and was **reverted rather than committed broken** — no engine code landed, `npm test` 877/877 + build green unchanged

- **State:** no `src/` changes this session (written, tested against
  fresh oracle PNGs, found wrong, `git checkout`-reverted). `npm test`
  **877/877**, `npm run build` green, both unchanged from #222's own
  state. `turn9-menu.json` still 111/111 (untouched). Rung (c) is
  **still not landed** — no `turn9-quickattack.json` committed.
- **Did:** Per the retry brief, pulled fresh `bin/oracle run` PNGs
  (scratch trace, not committed) at every tick 10924-10950 and
  4x-upscaled crops of the Pidgeotto region — **directly answers §36's
  own puzzle #1**: at RAM 10925-10927 (`invisible=true`), rendered
  pixels are byte-identical to the pre-lunge baseline (not hidden); at
  render 10933, the PNG shows TWO distinct opaque-looking Pidgeotto
  shapes overlapping — impossible if the real sprite were actually
  hidden. Conclusion: `invisible` doesn't gate rendering here at all;
  the real sprite draws continuously at its own `x2`/`y2` (§36's
  table), same "render = RAM+1" lag as the afterimages — one lag
  convention for the whole mechanism, not a distinct 3rd class.
  Implemented `erasePidgeottoFootprint` (mirrors `eraseGrovyleFootprint`,
  reusing `healthboxBackgroundColorAt` as-is) + lunge/afterimage offset
  tables keyed off `pressTick=10867` (§36's own anchor), wired into
  `drawTurn9FightSubmenuWindow`. Type-checked clean, but pixel-compared
  wrong inside the window (10929-10946 all DIFF) — the offset barely
  showed up on screen at all at 10929, not a subtle sign flip. Not
  root-caused before the cap (likely `pressTick` mismatch between §36's
  probe anchor and the dispatcher's live `sm.confirmElapsed`-derived
  value, unverified — or an axis/mirror error for the opponent side).
  Reverted `src/engine/battleScene.ts` outright per the "never commit a
  red step" rule rather than land broken pixels.
- **Next:** round 12 — rung (c1)/(c2) retry #2: **first** instrument the
  LIVE `pressTick` this dispatcher branch actually computes and diff it
  against `10867` directly (this session skipped that one cheap check
  and paid for it) — battle-turn-notes.md §37 has the full precise
  handoff (exact table values, the 3 diagnostic ticks to re-check
  first, and the still-unattempted-but-in-range hitsplat/shake-episode-1
  sub-rungs). Once the position bug is fixed, hitsplat (slot 7, 10-tick
  `drawEndeavorHitsplats`-shaped precedent) and Onix's shake episode 1
  are both within the already-probed window and cheap next adds. Rung
  (d) (ROCK_SLIDE) still waits on (c) landing a correct prefix.
- **Notes:** `docs/battle-turn-notes.md` §37 (new) has the full
  derivation + precise handoff. PAPERCUT: none beyond #222's own —
  the puzzle #1 resolution itself took ~25 min of PNG-crop-eyeballing
  that a tighter "diff the live pressTick first" discipline could have
  front-loaded before writing any table code.

---

---
## 222 — Bounded worker (S7 engine slice R rungs (c)+(d), QUICK_ATTACK animation + ROCK_SLIDE): **NOT LANDED** — RAM-probed the animation window exhaustively (new `dump-quickattack-anim.py`) and found 3-4 CONCURRENT lag classes plus a §35 sprite-slot correction (real Pidgeotto sprite is slot 5, not 2), but could not resolve a pixel-exact render within the cap; no engine code changed, no traces committed — banked as §36 (battle-turn-notes.md) for the next session, `npm test` 877/877 + build green unchanged

- **State:** no `src/` changes this session. `npm test` **877/877**,
  `npm run build` green (both unchanged from #220's own state — this
  session made zero engine edits, only a new probe script and docs).
  `turn9-menu.json` still **111/111** (untouched). Rungs (c)/(d) from
  the supervisor's brief are **NOT landed**: no `turn9-quickattack.json`
  or `turn9-rockslide*.json` committed.
- **Did:** RAM-probed QUICK_ATTACK's animation window exhaustively
  (`tools/probe/dump-quickattack-anim.py`, new, committed — dumps
  x/y/x2/y2/invisible/objMode/paletteNum for an explicit sprite-slot
  list + BLDCNT/BLDALPHA + `gBattlerSpriteIds`, over any tick range),
  cross-checked against 20 spot pixel captures (sha256 + connected-
  component diffs, not eyeballed). Found: (1) §35's own sprite-slot
  claim was wrong — direct `gBattlerSpriteIds` read shows Pidgeotto's
  real sprite is slot **5**, not 2 (slot 2 is unrelated, untouched all
  window); slots 3/4 are the `TraceMonBlended` afterimage copies, slot
  7 the hitsplat (both confirmed right). (2) The blend registers
  (`BLDCNT=0x3f40`/`BLDALPHA=0x080c`, EVA=12/EVB=8) match
  `drawSpriteSheetBlended`'s existing DOUBLE_TEAM-clone blend ratio
  EXACTLY — no new blend primitive needed. (3) A full per-tick table
  for the 10925-10946 lunge/trace/hitsplat window is now banked (§36).
  (4) The real sprite's own hide (RAM 10925) and un-hide (RAM 10946→
  10947) instants do NOT fit either a 0-tick or 1-tick render lag
  against the observed 0-diff-through-10928/first-diff-10929/0-diff-
  again-10947 pixel evidence — a genuine 3rd(+) lag class this session
  ran out of time bisecting. (5) A second shake episode (~10957-10976,
  Onix's healthbox wobbling in lockstep, ENDEAVOR's own "3 sprites at
  once" shape) shows RAM alternating every tick while three sampled
  render ticks spanning both parities are PIXEL-IDENTICAL — RAM change
  doesn't always cross a rendered pixel boundary. Wrote up the full
  ledger as `docs/battle-turn-notes.md` §36 rather than guess at a
  render and risk red captures.
- **Next:** round 11 — the render-lag puzzle above is the concrete
  next step (§36 has the full per-tick table + the exact contradiction
  to resolve — likely needs 2-3 more spot pixel probes right at the
  10925-10928 and 10946-10947 boundaries specifically, not a re-run of
  the wide sweep this session already did). Once resolved,
  `drawSpriteSheetBlended`/`drawPlayerHealthboxHpOverlay` are both
  already-generic and ready to wire in with zero new primitives. Rung
  (d) (ROCK_SLIDE) is unblocked by strong precedent (turn 6/7's own
  `drawTurn6RockSlideAttack`/`drawTurn7RockSlideAttack`) but
  structurally waits on rung (c) landing a correct prefix first.
- **Notes:** PAPERCUT: none of the existing probe scripts dumped an
  explicit, arbitrary sprite-slot list cross-checked against
  `gBattlerSpriteIds` — every prior one either hardcoded a slot or
  resolved it from `gBattleAnimAttacker`'s own single-attacker
  assumption, which is why §35's own slot-2 mislabel went unnoticed
  for a full session; the new `dump-quickattack-anim.py` fixes this
  generally, worth reusing as-is for future multi-sprite windows.
  Session spent most of its 60-minute cap on RAM/pixel investigation
  (deep multi-sprite/multi-lag animation, genuinely harder than any
  prior single-mechanism window in this arc) rather than code -
  landed a probe-only "scout" outcome per the brief's own explicit
  "never red" fallback, matching the shape of prior worktree-probe
  entries (#219/#221) even though this was a main-lane, not worktree,
  session.

---
## 221 — Worktree probe (supervisor-folded): ISSUES #30's sSpriteOrder lead NARROWED TO 2 CANDIDATES — the real mechanism (source-read) is a full per-frame insertion sort whose history only matters at exact (priority, wrapped-Y) ties, and the mirrored-pair feathers make ties pervasive (why fresh Y-sorts can't model it); of the 2^3 unknowable initial pair-orders, ONLY the (4,7) pair matters — 2 live candidates, identical across turns 6/7/8; `docs/feather-order-notes.md` + rerunnable simulation script merged (supervisor-rerun reproduces), suite 877/877

- **State:** merged into master post-slice-R, `npm test` 877/877 +
  build green, worktree/branch cleaned. ISSUES #30 updated with the
  narrowing + the named next step (render both candidates over turn
  6's residual window, diff vs fresh oracle captures — decisive either
  way). Probe stopped honestly at cap before the pixel test.
- **Next:** round 10 — main: QUICK_ATTACK's animation (slice R rung
  (c), §35's RAM-probed task inventory banked: elliptical lunge +
  blended afterimage + shake, tasks/slots pinned) then rung (d)
  (ROCK_SLIDE + turn-end); worktree: the #30 candidate pixel test
  (scratch-render, no engine code). Wind-down begins ~07:45.
- **Notes:** probe in contract (9.3 of 30 min), honest cap stop.

---
## 219 — Worktree probe (supervisor-folded): **ISSUES #29 ROOT-CAUSED, both families** — the same missing-`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` mechanism as #28, one dispatch branch earlier (Family A: pre-reveal idle window must key the shift off `openElapsed !== null`, not `revealTick`; Family B: `turn7KickoffBounceTick`'s pre-freeze branch returns unshifted `t`); supervisor re-ran the committed verify script — both families PASS, zero neighbor regressions; probe scoreboard this session: **4-for-4** (#27, #26, #28, #29); merged, suite 865/865

- **State:** merged into master post-feathers, `npm test` 865/865 +
  build green, worktree/branch cleaned. ISSUES #29 rewritten to
  one-fix-step-owed with the probe's rules + the honest open flag
  (turn 6/8 kickoff wrappers share Family B's code shape, unprobed).
- **Next:** round 9 — main: #29 fix as rung (a) (verify-script-first,
  restore 6 ticks: menus → 44/93/88) + turn 9 slice as rungs (b+)
  (turn9-notes.md exists; both published lines reconverge at turn 9);
  worktree: ISSUES #30 probe (simulate SortSprites' persistent
  adjacent-swap order over the committed feather probe tables — all
  inputs committed, pure computation; then the half-texel lead).
- **Notes:** probe in contract (12.0 of 30 min). Every excluded tick
  in turns 1-8 now has either a root-caused fix pending (#29's 6) or
  a live named-lead investigation (#30's feather windows); no
  speculative labels remain.

---

## 220 — Bounded worker (S7 engine slice R, rungs (a)+(b)): **ISSUES #29 FIXED** (both families, all 3 menu traces restored 0 diff) **+ turn 9's menu-reopen/LEFT-nav/confirm/QUICK_ATTACK-kickoff-text chain landed clean** — `turn9-menu.json` **111/111**; QUICK_ATTACK's own animation + everything downstream (impact/drain/message/ROCK_SLIDE/turn-end) NOT modeled — RAM-probed and precisely characterized (§35), not guessed

- **State:** `npm test` **877/877** (+12), `npm run build` green, tree
  committed. `turn6-menu.json` 44/44, `turn7-menu.json` 93/93,
  `turn8-menu.json` 88/88 (rung a's restoration), `turn9-menu.json`
  **111/111** (new, rung b: reopen through the kickoff text's own
  settled plateau, one tick before the animation's first pixel change
  at 10929). Zero regressions across the full menu/kickoff/rockslide/
  feathers sweep (`turn8-bind-a/b.json` 256/256+66/66, `turn7-
  rockslide-d.json` 19/19, `turn6-rockslide-a.json` 255/255,
  `turn6/7/8-feathers.json` 106/16/33, `turn6-featherdance.json`
  90/90).
- **Did:** Rung (a) — verify script re-run FIRST (both families PASS)
  per policy; Family A (`drawTurn6ActionMenuIdleWindow`/
  `drawTurn7RockSlideTurnEndSettledMenu` gained an optional
  `bounceTick`/`bounceRawTick` param, default `t`); Family B
  (`turn7KickoffBounceTick`'s pre-freeze branch now shifts). ISSUES
  #29 deleted. Rung (b) — `turn8Resolved` state flag (mirrors
  turn1-7Resolved), cursor persists at BIND(1) then `LEFT` returns it
  to ROCK_SLIDE(0) via the already-generic `cursor^1` arithmetic, PP
  ledger gains BIND's own miss-still-decrements-PP rule (19/20), a
  4th bounce regime (`TURN9_REGIME4_TO_REGIME1_SHIFT`), QUICK_ATTACK's
  own kickoff text (timing fit against a FRESH oracle run, not the
  dossier's own loose prose range — that undershot by 4 ticks),
  `turnOrder.ts`'s nonzero-priority branch gets its first real-scenario
  Tier-1 pin (QUICK_ATTACK +1 forces Pidgeotto first).
- **Next:** QUICK_ATTACK's animation (RAM ground truth already banked
  in §35: task window 10925-10949, `AnimTask_TranslateMonElliptical_
  Step`+`AnimTask_TraceMonBlended_Step`+`AnimTask_ShakeMon_Step`,
  sprite slots 2/3/4/7) through the impact/drain/"not very
  effective"/ROCK_SLIDE(82→61)/turn-end — one contiguous block, not
  attempted this session (time). `docs/turn9-notes.md` has the full
  ledger.
- **Notes:** docs updated in the same commit — `docs/bounce-blip-
  notes.md` "Fix landed" section, `docs/battle-turn-notes.md` §35,
  `ISSUES.md` #29 deleted. PAPERCUT: the turn9-notes.md dossier's own
  prose timing ranges (e.g. "text typing in 10878-10929") are
  approximate orientation, not exact render constants — cost ~5 min
  re-fitting `TURN9_QUICKATTACK_TEXT_DELAY` against a fresh oracle run
  instead of trusting the cited range directly.

---
## 219 — Worktree probe (supervisor-folded): **ISSUES #29 ROOT-CAUSED, both families** — the same missing-`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` mechanism as #28, one dispatch branch earlier (Family A: pre-reveal idle window must key the shift off `openElapsed !== null`, not `revealTick`; Family B: `turn7KickoffBounceTick`'s pre-freeze branch returns unshifted `t`); supervisor re-ran the committed verify script — both families PASS, zero neighbor regressions; probe scoreboard this session: **4-for-4** (#27, #26, #28, #29); merged, suite 865/865

- **State:** merged into master post-feathers, `npm test` 865/865 +
  build green, worktree/branch cleaned. ISSUES #29 rewritten to
  one-fix-step-owed with the probe's rules + the honest open flag
  (turn 6/8 kickoff wrappers share Family B's code shape, unprobed).
- **Next:** round 9 — main: #29 fix as rung (a) (verify-script-first,
  restore 6 ticks: menus → 44/93/88) + turn 9 slice as rungs (b+)
  (turn9-notes.md exists; both published lines reconverge at turn 9);
  worktree: ISSUES #30 probe (simulate SortSprites' persistent
  adjacent-swap order over the committed feather probe tables — all
  inputs committed, pure computation; then the half-texel lead).
- **Notes:** probe in contract (12.0 of 30 min). Every excluded tick
  in turns 1-8 now has either a root-caused fix pending (#29's 6) or
  a live named-lead investigation (#30's feather windows); no
  speculative labels remain.

---
## 218 — Bounded worker (S7 engine slice Q, dedicated feathers step): rung (a) partially cracked — a real same-priority feather draw-order bug found+fixed (`compareFeatherDrawOrder`, ~2000px→425px residual on the 7421-7549 window, 9/129 ticks exact) but not a full 0-diff crack; rungs (b)/(c) landed clean — `turn7-feathers.json` **16/16**, `turn8-feathers.json` **33/33**, both 0 diff, confirming the SAME residual recurs at the identical relative offset in all three turns (ISSUES #30 filed)

- **State:** `npm test` **865/865** (+6), `npm run build` green, tree
  clean. `turn6-feathers.json` unchanged **106/106** (fix doesn't touch
  the already-green non-overlapping prefix). Zero regressions:
  `turn6-featherdance.json` 90/90, `turn6-menu.json` 42/42,
  `turn7-menu.json` 91/91, `turn8-menu.json` 86/86, `turn5-sitrus-
  a.json` 110/110, all 0 diff.
- **Did:** rung (a) — hand-derived the real GBA tiebreak rule from
  `reference/pokeemerald/src/sprite.c`'s `SortSprites` (lower OAM index
  wins ties; all 8 FEATHER_DANCE spawns share one `subpriority` per
  `Cmd_createsprite`, so this codebase's own `slot` is the practical
  proxy) and empirically confirmed descending-slot beats both ascending-
  slot (the old bug, reproduced exactly) and descending-Y (445px,
  slightly worse — rules out "a fresh Y-sort every frame" as the
  complete model). Shipped since it's strictly better and doesn't
  regress the committed 106/106, but the residual isn't fully gone —
  characterized precisely in §34/ISSUES #30 rather than force-fit.
  Rungs (b)/(c) — generalized `featherDance.ts` to a small factory
  (`makeFeatherSpriteLookup`), probed turn 7 (RAM 8434-8600) and turn 8
  (RAM 9483-9660) with the existing `dump-feather-dance-sprites.py`
  unchanged (both twice-run byte-identical), confirmed the identical
  +8-tick spawn cadence/~121-tick lifetime and the shared `+1` render
  lag (explicitly re-bisected against lag 0, which badly fails both:
  2/16 and 18/33 matches). Landed each turn's own clean prefix up to its
  first mismatch (turn7: 8439-8454, turn8: 9468-9500), matching turn 6's
  own reduced-scope precedent.
- **Next:** the ordering residual's real fix (model `sSpriteOrder`'s own
  persistent incremental insertion-sort state, or pursue the untried
  half-pixel sampling-center lead) — ISSUES #30. Independently: ISSUES
  #29 (2 small bounce-blip families), turn 9+ parameterizations.
- **Notes:** checked (not assumed) whether this crack explains ISSUES
  #23's DRAGON_BREATH residual — it doesn't (different mechanism: #23 is
  a single-sprite scale-regime sampling defect, not a multi-sprite
  draw-order contest), documented in §34 per the brief's own ask.

---
## 217 — Worktree scout (supervisor-folded): post-WIN scene transition ground-truthed — **the S8 dossier chain is now GAPLESS from anchor to battle 2**: `battle1-postwin-dense.json` (29601 ticks, 208 captures) joins turn17's end (23601) to §17's swap-prompt start (29601, endpoint sha byte-identical to `battle1-swapyes-a.json`'s same-tick frame); headline pins: **`gMain.inBattle` clears + per-VBlank RNG resumes at tick 23645**, and **opponent-2's identity (`rentalMons[3..5]`) is written by 23700-23750** — the timing-sensitive window §16 HEADLINE 4 warned about is now bisected to 105 ticks; `docs/postwin-notes.md` merged, suite 861/861

- **State:** merged into master post-#28-fix, `npm test` 861/861 +
  build green, worktree/branch cleaned. Supervisor re-verified:
  prefix chain re-flattened (turn17 ⊂ postwin ⊂ winline-b-swap,
  script-exact — the shared prefix serves BOTH swap branches since the
  joint precedes the YES/NO divergence), fresh rerun (208 captures,
  endpoint sha reproduced), 2 labels PNG-read (heal text in the
  pre-battle room at 23800; the settled YES/NO swap prompt at 29601).
  §16 HEADLINE 4 refined at this fold with the bisected window.
- **Did:** the return is a THREE-scene sequence (fade → ~38-tick flash
  of the S6 battle room → black → fade-in on S5's pre-battle room),
  both scenes already extracted/modeled — no new assets needed (camera
  path for the flash honestly flagged not re-verified). Heal RAM write
  lands 163 ticks AFTER the heal-text dismiss (screen frozen the whole
  gap); loss-quote cursor question remains open (honest flag).
- **Next:** round 8 — main: feathers dedicated step (turn-7/8 tables +
  §29 sampling-residual leads); worktree: ISSUES #29 probe (the two
  boundary families, same RAM-first method). Then turn 9+ slices; S8
  engine work now has complete ground truth end to end.
- **Notes:** scout in contract (16.3 of 40 min); PAPERCUT noted in the
  dossier (two supplementary RAM dumps run once, not twice — trace
  itself twice-run; acceptable, flagged in-doc).

---

## 216 — Bounded worker (S7 engine fix): **ISSUES #28 CLOSED** — `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` applied at the 3 turn-6/7/8 browsing-branch call sites; 20 of 26 named ticks restored 0-diff, 6 more surfaced as TWO DIFFERENT out-of-domain families (filed ISSUES #29) rather than force-fit

- **State:** `npm test` **861/861** (+4), `npm run build` green, tree
  clean. `turn6-menu.json` **42/42** (33 base + 6 period-9 + the separate
  7348-7350 set, 0 diff), `turn7-menu.json` **91/91** (85 base + 6, 0
  diff), `turn8-menu.json` **86/86** (78 base + 10, all 10 named ticks
  landed clean, 0 diff). Zero regressions across 12 rerun traces
  (`turn6-featherdance` 90/90, `turn6-feathers` 106/106, `turn6-statfall`
  127/127, `turn8-bind-a` 256/256, `turn8-bind-b` 66/66, `turn5-menu`
  42/42, `turn6/7-rockslide-*` all at committed counts).
- **Did:** re-ran `tools/probe/verify-bounce-blip-rule.py` FIRST per its
  own policy — 18/18 named ticks reproduced exactly, confirming the root
  cause before touching code. Fix: `battleScene.ts`'s 3 browsing-branch
  ternaries (`drawTurn6/7/8FightSubmenuWindow`, the `: t` arm) changed to
  `: t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` — the one-token change the probe
  banked. Restoring `captureFrames` then showed the model check (which
  computes the formula directly, blind to actual branch dispatch) had
  over-claimed 6 of the 26: **7315-7316** (turn 6) and **9383-9384** (turn
  8) land BEFORE `revealTick`, still in the pre-reveal idle window, not
  the browsing branch this fix touches; **8380-8381** (turn 7) lands right
  AFTER a confirm press inside `turn7-menu.json`'s own script, in the
  confirm/kickoff branch instead. Per the brief's own instruction, kept
  these 6 excluded rather than force-fitting, and filed them precisely as
  **ISSUES #29** (two distinct sub-families, both plausibly the same
  "missing shift" shape on a different anchor — a future probe's lead, not
  chased this session). 4 Tier-1 pins added (`tests/battleScene.test.ts`,
  new "ISSUES #28 fix" describe block): the shifted formula matches the
  committed RAM dumps at 3 restored ticks per turn (6 and 8), paired with
  a same-ticks pin proving the pre-fix unshifted formula would have
  mismatched — the fix is demonstrably load-bearing. Exported
  `TURN8_REGIME3_TO_REGIME1_SHIFT` (one word) so the turn-8 pin could
  reuse the real composition instead of re-deriving it. ISSUES #28
  deleted; `docs/bounce-blip-notes.md` got a "Fix landed" section with the
  full per-turn breakdown.
- **Next:** ISSUES #29 (the 2 newly-surfaced small families - a probe
  step, RAM-dump both driver sprites' y2 across the idle-branch reopen
  window and the kickoff-branch post-confirm window). Engine: turn 8's own
  feather sub-window, turn 9+ parameterizations. Then: feathers dedicated
  step (turns 6/7/8 tables), post-WIN scene-transition scout.
- **Notes:** landed in ~25 of the 30-minute cap. The brief's own
  "restore ALL the excluded ticks... if it does NOT pass, leave it
  excluded and say so precisely" fallback fired for real, twice, on ticks
  the prior probe step's own model check had marked as clean — a useful
  reminder that a pure-arithmetic model check doesn't see which code
  branch a tick is actually rendered through; pixel compare remains the
  final arbiter.

---

## 215 — Worktree probe (supervisor-folded): **ISSUES #28 ROOT-CAUSED** — the 26 period-9 excluded ticks across turns 6/7/8 are ONE engine bug: the turn-6+ browsing-branch dispatch drops `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` (the existing constant every turn-1-5 wrapper applies); probe model-check fixes 18/18 RAM-probed named ticks with zero new mismatches, turn 7 retrodicts; the ~9 cadence is sinIndex(+7/tick) crossing ~64-wide plateaus, two seeds (192/128) → the region alternation; `docs/bounce-blip-notes.md` + verify script merged, suite 857/857

- **State:** merged into master post-#26-fix, `npm test` 857/857 +
  build green, worktree/branch cleaned. Supervisor verified the
  constant's existence and turns-1-5 usage in code directly
  (battleMenu.ts:843, `turn2ReopenedSubmenuBounceTick` et al.); pixel
  proof comes with the fix step's compare runs. ISSUES #28 rewritten:
  root-caused, one implementation step owed
  (`tools/probe/verify-bounce-blip-rule.py` committed for the fix
  worker to re-run first, per the residual-elimination policy).
- **Notes:** probe in contract (13.6 of 30 min). The session's probe
  scoreboard is now 3-for-3 (#27 attributed, #26 cracked+closed, #28
  root-caused) — every "quirk-at-an-extremum" label so far has fallen
  to a small real engine bug, none survived a dedicated probe.
- **Next:** round 7 — main: the #28 fix (3 call sites + restore 26
  ticks across turn6/7/8-menu traces + the separate 7348-7350
  restoration §28 already enabled); worktree: post-WIN scene-transition
  scout (loss quote 23601 → §17's swap-offer joint). Then: feathers
  dedicated step (turns 6/7/8 tables + §29's sampling-residual leads),
  turn 9+.

---
## 214 — Bounded worker (S7 engine fix): **ISSUES #26 CLOSED** — Sitrus THIN_RING implemented from §16's banked closed form (`turn5SitrusRingMatrix`, first-attempt render), `turn5-sitrus-c.json`'s excluded 7042-7072 restored to **181/181 0 diff**; z-order caveat resolved by reusing the already-established terrain-occlusion clip (`PLAYER_BALL_OPEN_VISIBLE_BOTTOM`), not a shadow-sprite priority contest

- **State:** `npm test` **857/857** (+5), `npm run build` green, tree
  clean. `turn5-sitrus-c.json` 181/181 (150 prior + 31 restored), 0 diff.
  Zero regressions, all rerun at full committed counts: `turn5-sitrus-
  a.json` 110/110, `turn5-sitrus-b.json` 82/82, `turn5-sitrus-d.json`
  133/133, `turn5-switchin.json` 241/241, `turn6-menu.json` 33/33.
- **Did:** the fix was purely mechanical per the brief (§16's own closed
  form ported verbatim, zero re-fitting): `turn5SitrusRingMatrix(t)` -
  `a=d=floor(4096/n)`, `n=clamp(ramTick-7039,1,31)`, ordinary +1 lag,
  fixed center (72,88), wired into `drawTurn5RockSlideAttack` via the
  existing `drawSpriteSheetAffineRotate` sampler + the already-extracted
  ring gfx. The one non-mechanical piece (the z-order caveat) resolved on
  the first attempt: the probe's rows-112-114 residual color `(74,66,82)`
  is an exact match to this dossier's own already-cited terrain-occlusion
  color (`PLAYER_BALL_OPEN_VISIBLE_BOTTOM=112`, §7.27's "lands mostly
  BEHIND the battlefield's foreground terrain tile") - a BG-over-sprite
  compositing rule tied to the player's own field position, not an
  OAM-priority contest against a literal drop-shadow sprite as §13/§15
  had speculated. Added an optional `clipBottom` param to
  `drawSpriteSheetAffineRotate` (no-op for its other 2 call sites) and
  passed the existing constant through - no new mechanism invented.
  5 Tier-1 pins added (both clamp ends, the 2 probe-verified sample
  ticks, the identity tick, the lag/window cutoffs). `faint-switch-
  notes.md` §17 written; ISSUES #26 deleted.
- **Next:** engine: turn 8's own feather sub-window (out of scope this
  step); turn 9+ parameterizations. Probes: #28 (period-9 excluded-tick
  family, worktree-banked per PROGRESS #213, still open). Scout: post-WIN
  scene transition dense ground truth.
- **Notes:** landed well inside the 40-minute cap, first-attempt render
  on both the closed form and the z-order clip - the probe step (§16)
  and this run's own residual-elimination policy (re-reading already-
  committed cross-file findings before touching pixels) did the actual
  hard work; this step was exactly as mechanical as advertised.

---

## 213 — Worktree probe (supervisor-folded): **ISSUES #26's THIN_RING CRACKED ANALYTICALLY** — the ring's matrix is a pure isotropic scale with a closed form (`a=d=floor(4096/n)`, `b=c=0`, `n=clamp(ramTick-7039,1,31)`, center (72,88), render lag **+1** — NOT §13's +2 rotation class), placement verified pixel-exact with ZERO fitting (6/6 px at render 7042, 92/92 at 7048, existing sampler + existing gfx verbatim); after 3 failed fitting attempts across 3 sessions, one 15-min probe made the fix MECHANICAL; `faint-switch-notes.md` §16 + committed probe JSON merged, suite 852/852

- **State:** merged into master post-turn-8, `npm test` 852/852 + build
  green, worktree/branch cleaned. Supervisor re-verified the closed form
  myself against all 32 live ticks of the committed probe JSON (exact
  match, center invariant (72,88)). ISSUES #26 rewritten at this fold:
  from "excluded after 3 attempts" to "analytically placed — one
  mechanical fix step owed" (params in the entry + §16).
- **Did:** probe identified the sprite (slot 4, matrixNum 2, affineMode
  3/double, 64x64, priority 2, alive 7040-7071), dumped per-tick state
  (twice-run byte-identical), tested §13's +2-lag lead FIRST as briefed —
  refuted it (ordinary +1 fits all samples; the +2 class is
  rotation-specific, matching §29's independent negative). Larger-tick
  residuals attributed to the known drop-shadow z-order at rows 112-114,
  named as the fix's one non-mechanical caveat.
- **Next:** round 6 launching now — main: the #26 fix + restore
  turn5-sitrus-c.json's 7042-7072 (mechanical, params banked); worktree:
  ISSUES #28's period-9 probe (3rd recurrence banked by turn 8, §33).
  Then: turn 9+ parameterizations, feathers dedicated step, post-WIN
  scene scout.
- **Notes:** probe in contract (15.0 of 30 min). Pattern now 2-for-2
  this session (after #27): the 30-min probe-only worktree step resolves
  what repeated bounded fitting attempts could not — RAM-first is the
  instrument, not the fallback.

---
## 212 — Bounded worker (S7 engine slice P): turn 8 landed end to end minus its own feather sub-window — the winning line's own divergence turn (RIGHT onto BIND, BIND MISSES, FEATHER_DANCE proceeds) — `turn8-menu.json` **78/78**, `turn8-bind-{a,b}.json` **256+66/322**, all 0 diff, first-attempt render (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **852/852** (+7), `npm run build` green, tree
  clean. `turn8-menu.json` 78/78 (9380-9467 minus 10 known-class residual
  ticks) + `turn8-bind-{a,b}.json` 322/322 (9739-10060 contiguous), all
  0 diff. Zero regressions: `turn7-menu.json` 85/85, `turn7-rockslide-
  {a,b,c,d}.json` 256/256/256/19, `turn6-rockslide-a.json` 255/255,
  `turn6-menu.json` 33/33.
- **Did:** a pure parameterization of turn 7's own dispatcher shape
  (`drawTurn7FeatherDanceKickoffText`/`drawTurn7RockSlideWindow`), fed
  this turn's own real confirm pressTick (9425). The 3 genuinely-new
  pieces the brief flagged: (1) the FIGHT-submenu RIGHT nav onto BIND —
  `moveFightCursor`'s existing `cursor^1` grid arithmetic needed ZERO new
  code (already generic since turn 3), only `core.ts`'s own confirm gate
  needed extending (`cursor===0||cursor===2` → also `cursor===1`); (2)
  BIND's own kickoff text + the first-ever-rendered MISS message
  (`sText_AttackMissed`, no move animation plays on a miss — pure
  text-swap over a frozen static field, no new attack-animation function
  needed); (3) the ATK-stage floor-clamp — confirmed (both from source
  and a 0-diff compare run) to produce NO visible message difference this
  turn, matching the dossier's own finding. One real find: the turn-end
  clear-to-redraw gap is 6 ticks here, not every prior turn's own 7 —
  freshly fit, not chased further (flagged, doesn't change what renders).
  A 3rd recurrence of ISSUES #28's period-9 residual class (10 ticks
  excluded from `turn8-menu.json`, same shape as turns 6/7's own 8-tick
  instances) — banked as further evidence, not re-diagnosed (out of
  scope).
- **Next:** rung (b) analogues for turn 7 AND turn 8's own feather
  sub-windows (both still deferred, bankable together); then turn 9
  (ROCK_SLIDE's own return, one `LEFT` press back from BIND, per
  docs/turn8-notes.md §7) as the next parameterization, or the turn
  15+/16+ scout territory already banked.
- **Notes:** no papercuts; `battle1-turn8-dense.json`'s own already-
  committed ground-truth dossier (docs/turn8-notes.md, a prior
  worktree-probe session) was thorough enough that NO fresh oracle sweep
  was needed this session — went straight from its own cited sha/tick
  table to render code, verified via `npm run compare` (which passed the
  BIND/miss window first-attempt; only the known-class #28 residual and
  the 6-vs-7-tick gap needed one correction each). docs/battle-turn-
  notes.md §33; turn8-notes.md left untouched (ground-truth dossier, not
  engine docs).

## 211 — Worktree probe (supervisor-folded): **ISSUES #27 RESOLVED in one 8-minute probe** — the "unattributed" HP-write+5 Random() is `Cmd_seteffectwithchance`'s UNCONDITIONAL secondary-effect roll (`battle_script_commands.c:2923`: `Random()` is the FIRST operand of the `&&` chain, consumed even at `secondaryEffectChance=0` — C evaluation order, source-verified by the supervisor directly); the offset is SCHEDULE-DEPENDENT, not fixed (+5 = 4 minimal-cost script commands; turn 15's "missing" instance was actually at +93, delayed by the faint sequence); `docs/rng-attribution-notes.md` merged, suite 845/845

- **State:** merged into master post-turn-7, `npm test` 845/845 + build
  green, worktree/branch cleaned. Supervisor verified the source claim
  directly (read `Cmd_seteffectwithchance` — the `&&` order is exactly
  as claimed) and the evidence table (LCG transitions for all three
  instances). Dossier reattributions applied at this fold (turn15/16/17
  §2 lines, strikethrough + citation); ISSUES #27 deleted.
- **Did (the predictive rule engine work now inherits):** every damaging
  move reaching `BattleScript_EffectHit`'s tail consumes EXACTLY ONE
  secondary-effect roll on connect, regardless of chance — misses divert
  before the roll, immunity is checked after it. FIRE_PUNCH's burn roll
  (21411/22423) is the same call site with chance=10. Both prior
  candidates ruled out (FLAME_BODY sweep; King's-Rock is a LATER stage,
  `Cmd_moveend`). Turn 13/14's 17105/17111/18079 stay a separate
  (AI-prescoring) family — correctly out of scope.
- **Also at this fold:** ISSUES **#28 filed** — the period-9 excluded-
  tick family in browsing-submenu windows has now RECURRED at turn 7
  (8 ticks, §32, same cadence as turn 6's §27 set); upgraded from
  dossier footnote to standing backlog per the residual-elimination
  policy (one probe survived, no root cause yet).
- **Next:** engine: turn 8+ parameterizations; feathers dedicated step
  (turn-7 probe table + window, §29's sampling-residual leads); probes:
  #28 (period-9 family), #26 (Sitrus ring); scout: post-WIN scene
  transition dense ground truth.
- **Notes:** probe in contract (8.3 of 30 min), cleanest step of the
  session — a 30-min cap on pure-attribution probes is comfortably
  sized; keep using it.

---
## 210 — Bounded worker (S7 engine slice O): turn 7 landed end to end minus its own feather sub-window — `turn7-menu.json` **85/85**, `turn7-rockslide-{a,b,c,d}.json` **256+256+256+19/787**, all 0 diff; a pure parameterization of turn 6's own N-4 rungs, one real bug found+fixed (a second bounce-reset regime turn 7's own idle window needed that turn 6 never exercised) (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **845/845** (+8), `npm run build` green, tree
  clean. `turn7-menu.json` 85/85 (8346-8438 minus 8 known-class residual
  ticks) + `turn7-rockslide-{a,b,c,d}.json` 787/787 (8593-9379 contiguous),
  all 0 diff. Zero regressions: `turn6-rockslide-a.json` 255/255,
  `turn6-statfall.json` 127/127, `turn6-feathers.json` 106/106,
  `turn6-menu.json` 33/33.
- **Did:** rungs (a)+(c)+(d) of the brief's own ladder landed together
  (turn 6's own dispatcher already unifies kickoff-text/stat-banner/ATK-fell
  into one function, so parameterizing it lands both at once); every
  pressTick-generic turn-6 function reused UNCHANGED, fed a fresh dense
  oracle sweep's own real pressTick (8379) or a new synthetic ROCK_SLIDE
  anchor (`TURN7_ROCKSLIDE_PRESS_TICK=8406`). Found and fixed a real bug
  `npm run compare` caught immediately (6.93% diff, first attempt): turn 7's
  own pre-confirm idle/browsing window comes AFTER turn 6's own ROCK_SLIDE
  reset the bounce cycle fresh at ITS OWN redraw (8122) and dropped
  Pidgeotto to 113 HP — `drawTurn6FieldBase` silently assumed neither had
  happened (true for every turn ≤6 caller, false for turn 7). Fixed with a
  `drawTurn7FieldBase` wrapper (an algebraic regime-1↔regime-2 anchor shift,
  not a fitted constant) plus an explicit Pidgeotto-HP repaint. 4 new
  literal constants for ROCK_SLIDE, none transferable from turn 6's own
  values (freshly fit each time, matching this dossier's own convention) —
  notably `TURN7_SUPER_EFFECTIVE_TEXT_DELAY=634` vs turn 6's 646 (the
  smaller -31 HP delta drains faster). Text wording re-verified via direct
  PNG read, not assumed ("harshly fell" holds for the 2nd ATK drop too).
- **Next:** rung (b) — turn 7's own feather sub-window (8439-8592,
  currently unrendered but harmlessly excluded, not wrongly rendered): rerun
  `dump-feather-dance-sprites.py` against this window, commit
  `turn7-feather-sprites-probe.json`, add a tick-range-dispatched second
  table. Then turns 8-13 as further parameterizations, or the turn 15+/16+
  scout territory already banked.
- **Notes:** no papercuts; `npm run compare`'s pixel diff again caught a
  real bug immediately and precisely (this session's own regime-2 finding),
  same pattern §31 noted for its own two bugs — hand-verifying
  mechanism-reuse arithmetic before writing render code catches the
  ARITHMETIC, but genuinely NEW situations (a window past a redraw reset
  that no prior turn's code path ever needed) still need the pixel compare
  to surface. docs/battle-turn-notes.md §32; turn6-notes.md/turn7-notes.md
  left untouched (ground-truth dossiers, not engine docs).

---

## 209 — Worktree scout (supervisor-folded): turn 17 + the WIN ground truth BANKED — **battle 1 is now ground-truthed turn-by-turn from anchor through the victory text**, a gapless prefix-verified dense-trace chain (turns 6-17 dossiers + winline); Murkrow faints at 22418, **`gBattleOutcome` flips 0→1 at tick 22818** (16 ticks after the dismiss press, while the OLD text still shows — §16's "instant the screen appears" corrected at this fold), DESTIN's loss quote "PLEASE I NEED / SOME WATER" held un-dismissed at trace end 23601; `battle1-turn17-dense.json` (256 captures) + `docs/turn17-notes.md`; merged, suite 837/837 on the merged tree

- **State:** merged into master post-rung-(b), `npm test` 837/837 +
  build green post-merge, worktree/branch cleaned. Supervisor
  re-verified independently: prefix chain re-flattened (turn16 ⊂ turn17
  ⊂ winline-b-swap, script-exact), fresh rerun reproduced 11/11 cited
  shas at exact ticks, 2 climax labels PNG-read ("Player defeated BUG
  CATCHER DESTIN!♥" at 22885; the held quote + trainer sprite at 23601).
- **Did (the 7 briefed questions, all answered):** burn roll STILL
  FIRES vs an already-burned+fainted target (`Cmd_seteffectwithchance`
  unconditional; `SetMoveEffect`'s hp==0 gate short-circuits after the
  roll — both source-cited); burn residual absent this turn
  (`ENDTURN_BURN` gates on hp!=0); BRN badge rides with the healthbox
  (both vanish at 22508, same tick status1 clears); faint sink VERBATIM
  vs turns 13/15, novelty = post-dismiss branches to the win sequence
  (last mon); MAGBY exits 27/138, FIRE_PUNCH PP 13. ISSUES **#27 filed
  at this fold**: the unattributed Random() at HP-write+5 has now
  appeared twice at the IDENTICAL offset (21152, 22173) — upgraded from
  "tail noise" to suspected fixed mechanism, one probe step owed.
- **Next:** engine: turns 7-13 as parameterizations (turn 6 is complete
  end to end per #208), then turn-14+ (FLY halves, player switch, win
  seq — all ground-truthed); probes: ISSUES #27 (RNG attribution), #26
  (Sitrus ring), feather residual 7421-7549; scout territory: the
  post-WIN scene transition (§17's swap screen is next unscouted dense
  ground).
- **Notes:** scout in contract (16.0 of 40 min); 1 PAPERCUT noted in
  the dossier (256-capture budget forced an uncommitted stride-2
  side-probe for the faint-sink boundary — an accepted convention, not
  tooling friction; no PAPERCUTS.md change).

---
## 208 — Bounded worker (S7 slice N-4 rung (b)): Onix's ROCK_SLIDE vs. PIDGEOTTO landed in full — turn 6 resolved END TO END — `turn6-rockslide-a.json` **255/255**, `turn6-rockslide-b.json` **105/105**, both 0 diff, first-attempt on the mechanics half; a pure parameterization, no new HP-drain formula needed after all (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **837/837** (+6), `npm run build` green, tree
  clean. `turn6-rockslide-{a,b}.json` 0 diff (7765-8124 contiguous).
  Zero regressions: `turn6-statfall.json` 127/127, `turn6-feathers.json`
  106/106, `turn6-featherdance.json` 90/90, `turn6-menu.json` 33/33,
  `turn5-rockslide.json` 256/256, `turn3-rockslide.json` 256/256,
  `turn1-rockslide.json` 256/256.
- **Did:** rung (a) first — fresh dense oracle capture of the full
  7765-8124 window (360 frames), which RESOLVED §30's own flagged
  "8039-8114 uncaptured gap": it's not a second unmodeled mechanism, it's
  the flat hold of "It's super effective!" (ROCK-vs-FLYING), whose own
  message-box swap starts at 8018, 21 ticks earlier than §30's gap
  boundary. Rung (b): every existing ROCK_SLIDE mechanism (rocks/shake/
  hit-flash/drain) reused UNCHANGED behind a synthetic press anchor
  (`TURN6_ROCKSLIDE_PRESS_TICK=7372`) that reproduces the fresh capture's
  own transition ticks exactly by hand-arithmetic before any code was
  written. The brief's flagged "fresh HP-drain pixel formula" turned out
  to be unnecessary — `calcBarFilledPixels` was already maxHp-agnostic
  and `rockSlideOpponentHp` was already value-agnostic; Pidgeotto's own
  156-max bar just needed `pidgeottoHealthboxContentForHp(hp)`, a direct
  copy of the existing per-HP memoization. New: "It's super effective!"
  text (curly-apostrophe fix caught by `npm run compare`'s 14px diff),
  and the turn-end settled-menu function (a missing base-background paint
  caught by a 47%-diff `npm run compare` failure, despite looking correct
  in a side-by-side PNG glance — fixed immediately).
- **Next:** turn 7 as a parameterization of turn 6's own mechanisms
  (turn7-notes.md's dossier already exists), or turns 8-13; scout
  territory: turn 17+ (Murkrow faints 22418 → the WIN arc, per §16);
  ISSUES #26 probe; feather residual 7421-7549 (§29's named leads, still
  open, low priority).
- **Notes:** no papercuts. `npm run compare`'s pixel-diff caught both real
  bugs immediately and precisely (apostrophe glyph, missing bg paint) —
  hand-verifying the mechanism-reuse arithmetic BEFORE writing render code
  (per §30's own mandate, extended to pixels not just RAM) meant the
  mechanics half (255 frames) passed compare on the very first attempt.

---

## 207 — Worktree scout (supervisor-folded): turn 16 ground truth BANKED — the first MAGBY-vs-MURKROW turn: speed order pinned (MURKROW 97 > MAGBY 89, acts first), FAINT_ATTACK skips accuracy entirely (source: `.accuracy=0`), FIRE_PUNCH rolls accuracy even at 100% AND **its 10% burn proc SUCCEEDS** (`status1` 0→16 at tick 21411, burn residual `floor(142/8)=17` at turn-end) — **the run's FIRST status-condition ground truth**, BRN badge PNG-pinned (absent 21540 → present 21548); `battle1-turn16-dense.json` (256 captures) + `docs/turn16-notes.md`; merged, suite 831/831 on the merged tree

- **State:** merged into master post-N-4, `npm test` 831/831 + build
  green post-merge, worktree/branch cleaned. Supervisor re-verified
  independently: prefix chain re-flattened myself (turn15-dense ⊂
  turn16-dense ⊂ winline-b-swap, script-exact), fresh oracle rerun
  reproduced 15/15 cited shas at exact ticks, 3 label PNGs read directly
  (MAGBY's first-ever FIGHT submenu — FIRE PUNCH/SMOKESCREEN/CONFUSE
  RAY/SMOG, PP 15/15, TYPE/FIRE — and the BRN absent→present pair).
  ISSUES #16 trimmed at this fold: ground truth exists now; the engine's
  own status-icon compositor path is the open remainder.
- **Did:** 8 Random() calls in 20745-21773 (crit+dmg for FAINT_ATTACK —
  no accuracy roll; acc+crit+dmg+burn for FIRE_PUNCH; 1 unattributed
  mid-turn at 21152 — FLAME_BODY hypothesis RULED OUT by source,
  FAINT_ATTACK has no contact flag in this ROM; 2-step tail cluster
  21719/21724 matching the "AI-prescoring" shape, first time seen
  mid-battle). Damage: 59 (MAGBY 138→79), 67 (MURKROW 142→75), burn 17
  (75→58). Both new move animations sketched coarse-only (open items).
- **Next:** main lane — N-4 rung (b), Onix's ROCK_SLIDE vs Pidgeotto
  (§30's sha-sweep handoff); scout — turn 17 (§16's "turn 2": Murkrow
  faints 22418 → the WIN sequence); then ISSUES #26 probe, feather
  residual 7421-7549, turns 7-13 parameterizations.
- **Notes:** scout in contract (15.7 of 40 min); no papercuts; its
  proposed "close #16" was corrected to a trim at the fold (ground truth
  ≠ engine validation).

---
---
## 206 — Bounded worker (S7 slice N-4, rung a): turn 6's stat-fall window landed — §29's flagged ~7570+ residual RESOLVED (it's the generic StatsChangeAnimation banner, already built for turn 1's DOUBLE_TEAM, just never parameterized for a stat DECREASE) — `turn6-statfall.json` **127/127, 0 diff**, first-attempt; rung (b) (Onix's own ROCK_SLIDE vs. Pidgeotto) NOT attempted, precise ground-truth handoff banked in battle-turn-notes.md §30 (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **831/831** (+6), `npm run build` green, tree
  clean. `turn6-statfall.json` **127/127, 0 diff** (7558-7684). Zero
  regressions: `turn6-feathers.json` 106/106, `turn6-featherdance.json`
  90/90, `turn6-menu.json` 33/33, `turn5-rockslide.json` 256/256,
  `turn1-rockslide.json` 256/256.
- **Did:** RAM-probed the residual (`dump-task-and-sprite-callbacks.py`)
  and found `gTasks` slot 1 running `StatsChangeAnimation_Step1/2/3` from
  RAM tick 7567 — the SAME OBJ-window-masked BG1 alpha-blend banner turn
  1's own `drawStatsBanner` already renders, just for a DECREASE
  (`aSharply=TRUE` → `tTargetBlend=13`/`tWaitTime=30`) masked to ONIX
  instead of Grovyle. A direct register probe (`BLDALPHA`/`gBattle_BG1_X`/
  `gBattle_BG1_Y`, stride-1) decoded a clean deterministic step function
  that matched the oracle 0-diff on the FIRST attempt, no bisection
  needed. Also folded a message-sequencing correction directly into
  turn6-notes.md's own understanding (superseding turn7-notes.md §5's
  "generic box transition" guess): the "ONIX's ATTACK harshly fell!" text
  starts at tick 7659 as a plain instant swap, not a box-close/reopen
  slide — the "4 shared frames" turn7-notes noticed is just both messages
  starting with the literal characters "ONIX".
- **Next:** rung (b) — Onix's own ROCK_SLIDE vs. Pidgeotto (7765-8122ish,
  battle-turn-notes.md §30 has a full sha-transition sweep of the whole
  window banked: kickoff transition/hold, rock animation ~7805-7924,
  impact flash ~7935-7955, HP-drain ~7970-8038, an uncaptured gap
  8039-8114 almost certainly "It's super effective!", turn-end 8115-8124).
  Needs: Pidgeotto-parameterized shake/blink (sprite+corner already exist
  from the switch-in code), a fresh HP-drain pixel formula (156-max bar,
  turn6-notes §5 already flagged it's NOT 1-unit-per-tick like turn 1's),
  and the flinch/AI RNG cluster. Pidgeotto's healthbox sits at the SAME
  screen origin Grovyle's did once settled (`turn5PidgeottoHealthboxSlideDx`
  → 0), so the existing wobble geometry should be directly reusable.
  Beyond that: turns 7-13 as parameterizations, turn 15+ scout (FLY
  strike/first forced switch — already banked per #205), ISSUES #26.
- **Notes:** no papercuts. Session was research-heavy (RAM-probing to
  find the real mechanism cost real time) but paid off — first-attempt
  0-diff is rare in this dossier and validates the "RAM-probe before
  writing render code" mandate directly. Stopped rung (b) before
  attempting implementation once it became clear it needed several NEW
  sub-mechanisms (not a pure parameterization as the brief hoped) and the
  session budget was better spent banking precise ground truth than
  rushing a half-fit.

## 205 — Worktree scout (supervisor-folded): turn 15 ground truth BANKED — **FLY's strike half rolls REAL accuracy/crit/damage (3 Random() calls — NOT RNG-free like its own charge half)**, hits for "not very effective" 11 clipped to Onix's 4 HP (hp0→0 at tick 19147), and the battle's first **PLAYER-side forced switch** is ground-truthed end to end (faint sink → button-gated "ONIX fainted!" → party-select, cursor defaulting to the fainted slot → SEND OUT → MAGBY 138/138 materialize → settled menu at 20558); `battle1-turn15-dense.json` (245 captures) + `docs/turn15-notes.md`; merged, suite 825/825 on the merged tree

- **State:** merged into master post-N-3, `npm test` 825/825 + build
  green post-merge, worktree/branch cleaned. Supervisor re-verified
  independently: prefix chain re-flattened myself (turn14-dense ⊂
  turn15-dense ⊂ winline-b-swap, script-exact), fresh oracle rerun
  reproduced 16/16 cited shas at their exact ticks, and 4 label-bearing
  PNGs read directly (incl. §5h's negative finding — the blank message
  box where §14-addendum's trace showed the "Get 'em, MAGBY!" quip).
- **Did:** 6 Random() calls total in 18956-20745: accuracy 19003 /
  crit 19029 / damage-variance 19032 (the strike half joins the normal
  hit flow at BattleScript_HitFromAtkString — each half of a two-turn
  move must be checked independently), turn-tail bookkeeping 19240,
  AI-prescoring pair 20550/20556. STATUS2_MULTIPLETURNS clears 19000,
  STATUS3_ON_AIR 19004. Reuse map: faint sink SAME-SHAPE (first
  player-side instance, battler0 params), KO hold / party-select /
  SEND OUT VERBATIM vs §14-addendum, materialize/healthbox SAME-SHAPE
  (honestly not byte-verified), LAX_INCENSE no proc (matches turn 13).
  New finding: the send-out flavor quip is RNG-line-dependent, NOT
  deterministic on matchup — absent on this exact committed line.
- **Next:** engine critical path: turn-6 rungs (c)/(d) (stat-fall
  anim + ATK-fall message ~7559-7684, Onix's ROCK_SLIDE), feather
  residual 7421-7549 (§29's named leads), then turns 7-13 as
  parameterizations; scout territory: turn 16+ (MAGBY vs MURKROW,
  Murkrow faints 22418 per §16 → the WIN arc); ISSUES #26 probe.
- **Notes:** scout stayed in contract (15.6 min of a 40 cap); no
  papercuts; its brief-assumption note (two-turn-move halves are
  asymmetric) folded into this entry's Did line.

---

---
## 204 — Bounded worker (S7 slice N-3): FEATHER_DANCE's feather sprites — all 4 rungs attempted, rungs (a)/(b)/(c) landed in full, rung (d) landed as a reduced-scope prefix — `turn6-feathers.json` **106/106, 0 diff** (7307-7420, 16 new ticks past the prior 7404 cutoff); the fuller 7421-7658 window has a small, precisely-characterized residual, documented not chased (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **825/825** (+4), `npm run build` green, tree
  clean. `turn6-feathers.json` **106/106, 0 diff**. Zero regressions:
  `turn6-menu.json` 33/33, `turn6-featherdance.json` 90/90,
  `turn5-sitrus-a.json` 110/110, `turn1-rockslide.json` 256/256.
- **Did:** (a) extracted `ANIM_TAG_WHITE_FEATHER` gfx (byte-exact);
  (b) RAM-probed the full 7404-7658 window for all 8 feather sprites
  (`src/data/gen/turn6-feather-sprites-probe.json`) — new finding: all 8
  fully despawn by 7558, so the back half of the brief's window has zero
  live feathers; (c) pinned the ALREADY-EXISTING generic affine blit
  (`drawSpriteSheetAffineRotate`, from S7 slice M-3) against this
  mechanism's own real matrix + a multi-tile fixture; (d) attempted a
  line-by-line port of `AnimFallingFeather_Step` (validated the phase
  accumulator exactly, but the Y accumulator / `gOamMatrices` write didn't
  reproduce the probe tick-for-tick — a genuine, documented dead end, see
  battle-turn-notes.md §29), then pivoted to a RAM-table renderer
  (`src/engine/featherDance.ts`) — bisected a uniform +1 render lag AND a
  priority-split z-order against Onix's own sprite (both empirically
  verified against the oracle), landing a 0-diff 16-tick prefix of the
  animation. A real latent bug (slot reuse past despawn) was caught by the
  new Tier-1 test before it ever reached a pixel compare.
- **Next:** (1) the 7421-7658 window's own small residual (§29: likely
  same-priority feather-vs-feather ordering, or a half-pixel affine-center
  convention for even-sized sprites — cheapest repro is 7421-7440) and the
  separate ~7570+ stat-flash mechanism (not itemized, out of scope this
  session); (2) rungs (c)/(d) of turn 6 itself (ATK-fall message, Onix's
  ROCK_SLIDE); (3) turn-7..13 as parameterizations; (4) turn-15+ scout
  (FLY strike, Onix's likely KO → first FORCED PLAYER SWITCH → WIN arc);
  (5) ISSUES #26 ring probe; (6) turn6-menu.json's 7348-7350 restoration
  (still open, not attempted this session either).
- **Notes:** no papercuts this session. The algorithmic-port dead end cost
  real time (~20 min) before the RAM-table pivot — worth flagging for
  whoever writes the NEXT animation-heavy brief: RAM-table-driven
  rendering (this session's own fallback) may be the right DEFAULT for
  sine/accumulator-heavy sprite effects in this codebase, not just a
  fallback, given this is the second such mechanism (after the Sitrus
  rotation table) where the real hardware's exact tick-level timing
  resisted a straight source port within a bounded session.

---

## 202 — Worktree scout (supervisor-folded): turn 14 ground truth BANKED — Murkrow opens with **FLY** (the arc's first two-turn semi-invulnerable move): charge half deals no damage, Onix's DRAGON_BREATH **auto-misses the airborne target at ZERO RNG cost** (`STATUS3_ON_AIR` short-circuit, `battle_script_commands.c:1061`, gRngValue flat through the miss); `battle1-turn14-dense.json` (248 captures) + `docs/turn14-notes.md`; merged `4fe427a`, suite 821/821 on the merged tree

- **State:** merged into master, `npm test` 821/821 + build green
  post-merge. Supervisor re-verified: prefix chain (turn13-b ⊂ turn14 ⊂
  winline-b-swap, script-exact), trace rerun deterministic, and the
  final frame PNG-read: Murkrow's healthbox full at 142/142 with its
  SPRITE INVISIBLE (airborne) over the settled menu — the two-turn
  state pinned visually and in RAM (STATUS2_MULTIPLETURNS set 17820,
  STATUS3_ON_AIR set 17913, both persisting across the turn boundary
  to the trace's last tick 18956).
- **Did:** turn 14 = FLY charge (empty "used" string — STRINGID_
  EMPTYSTRING3 in BattleScriptFirstChargingTurn, then "flew up high!")
  + the auto-miss; nobody takes damage; no forced switch this turn.
  §16's coarse ledger row fully confirmed, refined by one exact
  bookkeeping Random() at 18079. PAPERCUT from the worker
  (dump-battler-full.py struct offsets undocumented outside the script
  body) recorded in PAPERCUTS.md at this fold.
- **Next:** engine critical path unchanged (slice N-3 feather renderer
  → rungs c/d → turns 7-13 parameterizations); dossier pipeline now
  covers turns 6-14; turn-15+ (FLY's strike half, Onix's likely KO →
  the first FORCED PLAYER SWITCH → the WIN arc) is the next scout
  territory.
- **Notes:** scout stayed in contract; 40-min cap, landed in 14.

## 201 — Worktree scout (supervisor-folded): turn 13 ground truth BANKED — Pidgeotto FAINTS to DRAGON_BREATH, MURKROW switches in (142/142, LAX_INCENSE, NO switch-in proc), and the REUSE MAP says the whole faint/switch window is turn-5 machinery VERBATIM with new params; **the projectile table is bit-identical to turn 2's** (one closed-form dy param: target yOffset 11 vs 4) so ISSUES #23's exclusion covers turn 13 with no fresh crack; `battle1-turn13-dense-{a,b}.json` (256+223 captures) + `docs/turn13-notes.md`; merged `95524d4`, suite 821/821 on the merged tree

- **State:** merged into master, `npm test` 821/821 + build green
  post-merge. Supervisor re-verified: prefix chain (turn12 ⊂ turn13-a ⊂
  turn13-b ⊂ winline-b-swap, script-exact), switch-commit sha (16944)
  reproduced fresh, final capture PNG-read (settled menu vs MURKROW,
  Onix 4/117). One "surprise" ROOT-CAUSED at the fold: the reported
  cursor "double-decrement" (DOWN: 0→2) is the FIGHT submenu's ordinary
  2×2 grid row move (`battleMenu.ts:981`, `cursor ^ 2`; turn 8's RIGHT
  = +1 column move corroborates) — dossier corrected, nothing open.
- **Reuse map (scout's verdicts):** faint sink verbatim (closed form
  gives n=7 for Pidgeotto's yOffset), ball prop / particle burst /
  landing-bounce verbatim byte-exact; stretch/wobble/tint + healthbox
  slide same-shape but honestly NOT re-verified to the byte; KO-gated
  hold verbatim, pixel-frozen. Also: 0-PP moves are never auto-skipped;
  Onix accuracy stage 6→5 from SAND_ATTACK under the held kickoff.
- **Next:** slice N-3 — the feather animation's affine renderer (8
  per-tick-rotating sprites, §28's RAM ground truth + implementation
  sketch); then rungs (c)/(d); then turn-7..13 slices are all
  parameterizations except the #23-excluded projectile ticks. BIND-hit
  (Test 2) never exercised on this line — battles 2-7 may exercise it.
- **Notes:** scout stayed in contract; no papercuts.

---
## 200 — Bounded worker (S7 slice N rung (b), reduced scope): FEATHER_DANCE's kickoff text + settled hold LANDED — `turn6-featherdance.json` 90/90, 0 diff; a real rung-(a) bug found+fixed (region-A onix-sprite bounce wasn't frozen, only region B was); the feather/starburst SPRITE ANIMATION itself deferred (genuinely new affine-rotation rendering, no precedent in this codebase) — RAM ground truth banked, not implemented

- **State:** `npm test` **821/821** (+3), `npm run build` green, tree
  clean. New committed trace `turn6-featherdance.json` (90 captures,
  7307-7404, same 4 pre-confirm residual pairs excluded as §27, zero new
  exclusions) **0 diff**. Regression sweep: `turn6-menu.json` 33/33,
  `turn5-sitrus-c.json` 150/150, `turn5-sitrus-d.json` 133/133, `turn3-
  rockslide.json` 256/256, `turn5-rockslide.json` 256/256, `turn5-menu.json`
  42/42, `turn4-menu.json` 44/44, `turn5-endeavor.json` 254/254, `turn1-
  cloneanim.json` 230/230 — zero regressions.
- **Did:** kickoff text ("Foe PIDGEOTTO used FEATHERDANCE!") timing
  RAM/pixel-nailed (`turn6FeatherDanceTextStartTick = pressTick+13` = 7358,
  settles 7388, oracle-reprobed fresh — NOT either of the two existing
  generic-kickoff delay constants, both checked and ruled out). Extending
  the captured window past rung (a)'s own 7350 cutoff immediately exposed
  rung (a)'s named "region A" residual on EVERY subsequent tick — RAM-
  probed (`gSprites[gBattlerSpriteIds[0]]`/`[gHealthboxSpriteIds[0]]`'s own
  `y2`, both flat 0 for the whole post-confirm hold) and fixed: (1)
  `drawTurn5RockSlideAttack` never threaded its own `bounceTick` param for
  the on-field Onix sprite's bounce (always used live `t`, even when
  called from a frozen-hold context) — added one, default-preserves every
  other caller; (2) the frozen anchor itself (`pressTick`) sat on a
  `{onixY2:1, healthboxY2:0}` point in `menuIdleBounce`'s own cycle, not
  the real `{0,0}` — moved to `pressTick - 4`, a scanned `{0,0}` plateau.
  This retroactively fixes rung (a)'s own 7348-7350 exclusion too (not
  applied to the already-shipped `turn6-menu.json` this session, to avoid
  churning it under time pressure — noted as an optional cleanup).
  Determined the animation's own true first pixel-change tick is **7405**
  (RAM/pixel-confirmed, earlier than the brief's "~7450" eyeball estimate)
  — `turn6-featherdance.json`'s captureFrames stop there.
- **Did NOT land (scope call, not a resistance-with-no-findings):** the
  feather/starburst sprite animation (7405-7658). RAM-probed the spawn
  timeline (8 `gFallingFeatherSpriteTemplate` sprites, groups of 1/2/2/2/1
  at 8-tick spacing, all spawning at (72,64) — script-confirmed against
  `Move_FEATHER_DANCE`/`data/battle_anim_scripts.s:3975`) and read the
  render mechanism (`AnimFallingFeather`/`_Step`,
  `src/battle_anim_flying.c:572`): each sprite writes an independent
  rotation+scale matrix into `gOamMatrices` every tick from a sine-table
  phase accumulator — a genuinely new affine-rotation sprite primitive
  this codebase has no precedent for (existing affine helpers only ever do
  a single uniform scale or a single externally-supplied static matrix).
  Per the brief's own explicit permission ("if they resist wholesale, stop
  and document rather than shipping a half-fit"), stopped here rather than
  force a bounded-effort implementation that wouldn't reach this dossier's
  0-diff/RAM-verified standard in the remaining time. Full writeup +
  banked RAM data: `docs/battle-turn-notes.md` §28.
- **Next:** the feather/starburst animation itself (§28's own sketch: a
  generic affine-matrix sprite blitter, a full per-tick RAM probe of
  `gOamMatrices`/sprite state across 7405-7658, and `ANIM_TAG_WHITE_FEATHER`
  gfx extraction via `extract-battle-move-anim-assets.ts`'s convention —
  none attempted this session beyond the spawn-timeline scan). Then rung
  (c) (ATK-fall message) and rung (d) (Onix's ROCK_SLIDE, parameterizable).
- **Notes:** PAPERCUT: none new this session — the chained-trace-stitching
  risk flagged in §27 turned out to be moot here (verified `battle1-
  turn6-dense.json`'s own script has zero button presses between the turn-6
  confirm and turn 7's reopen, so `turn6-menu.json`'s already-committed
  idle tail already covered the whole window — no stitching needed at all).

---

---
## 199 — Worktree scout (supervisor-folded): turn 12 ground truth BANKED — the scout CORRECTLY FALSIFIED the brief's premise (supervisor transcription slip: ROCK_SLIDE entered at 1/10 not 2/10): turn 12 = AERIAL_ACE hit (Onix 14→4) + ROCK_SLIDE **MISS** (PP-exhausted at 0/10), NOBODY faints; the real faint is **turn 13 via DRAGON_BREATH** (tick 15887, Murkrow in at 16944, light RAM scan, unverified); 4th consecutive line reconvergence; `battle1-turn12-dense.json` (252/252 captures) + `docs/turn12-notes.md`; merged `0a3ccf4`, suite 818/818 on the merged tree

- **State:** merged into master, `npm test` 818/818 + build green
  post-merge. Supervisor re-verified: prefix chain (turn11 ⊂ turn12 ⊂
  winline-b-swap, script-exact), miss-hold sha reproduced fresh, PNG-read
  the held "ONIX used ROCK SLIDE!" frame with Onix at 4/117. Scout
  discipline was exemplary: did the assigned turn-12 work as it ACTUALLY
  happens, added only a clearly-labeled unverified turn-13 scan, deferred
  the reuse map to the turn-13 session with three sharp bullets.
- **Did:** turn 12 both-halves ledger RAM-truthed (AERIAL_ACE 0.5× vs
  ROCK/GROUND — PNG-caught, easy to misremember; ROCK_SLIDE's miss = 1
  Random() only). The unattributed RNG step re-confirmed a 4th time at
  bit-exact offsets (93 after HP-commit, 9 before curMove) — solidly tied
  to the damaging-move HP-commit path now. Murkrow snapshot RAM-confirmed
  3rd time; held item corrected to LAX_INCENSE (no switch-in proc,
  unlike Sitrus).
- **Planning implication (supervisor):** turn 13's faint arrives via
  DRAGON_BREATH — ISSUES #23's PARKED projectile animation is therefore
  ON the winline. The turn-13 engine slice will need #23's exclusion
  treatment for the projectile ticks unless #23 is cracked first;
  sequence a dedicated #23 probe (its named "isolate a single spawn"
  instrument, never attempted) before or alongside that slice.
- **Next:** slice N rung (b) — FEATHER_DANCE's animated path (turn 6,
  7358-7658), per §27's precise scoping; then rungs (c)/(d); then
  turn-13 scout (faint + Murkrow switch-in reuse map).
- **Notes:** scout stayed in contract; no scout papercuts (the main-lane
  stitching papercut recorded separately).

---
## 198 — Bounded worker (S7 slice N rung (a) only): turn 6's FIGHT-submenu reopen + move confirm LANDED — `turn6-menu.json` 33/33, 0 diff; rungs (b)/(c)/(d) NOT attempted (60-min cap, not a resistance finding) — precisely scoped for the next session

- **State:** `npm test` **818/818** (+5), `npm run build` green, tree
  clean. New committed trace `turn6-menu.json` (33 captures, 7307-7350,
  11 named bounce-extremum ticks excluded) 0 diff. Regression sweep:
  `turn5-sitrus-c.json` 150/150, `turn5-sitrus-d.json` 133/133, `turn3-
  rockslide.json` 256/256, `turn5-rockslide.json` 256/256, `turn5-menu.json`
  42/42, `turn4-menu.json` 44/44, `turn5-endeavor.json` 254/254 — zero
  regressions.
- **Did:** turn 6's reopen (press 7313) + confirm (7345, cursor 0 -
  ROCK_SLIDE, no nav needed) — the first FIGHT-submenu reopen against a
  NEW opponent (Pidgeotto, not Grovyle), so `drawFightSubmenuWindow` now
  short-circuits on a new `turn5Resolved` flag into a dedicated
  `drawTurn6FightSubmenuWindow`/`drawTurn6FieldBase` (Onix/Pidgeotto's
  own already-proven-0-diff primitives, factored out of
  `drawTurn5RockSlideWindow`'s own tail — zero formula changes) instead of
  threading a 5th tier through the Grovyle-shaped `menuIdleBase` helpers.
  Two real bugs found via compare-driven bisection: (1) the window's own
  right-edge border strip (x=232-239) wasn't filled under the reopened
  submenu — turns 1-5 never exercised this since `menuIdleBase`'s full-
  screen static harvest always covered it; fixed by drawing the same
  y≥112 chrome crop before the submenu's own opaque box. (2) a chained-
  trace stitching bug (not an engine bug) — the scratch probe silently
  inserted 8 redundant idle frames, shifting press ticks 8 late in the
  trace's own frame-index space (pixels still matched since oracle+app
  replay the identical script, but citations would've been wrong); fixed
  by trimming the overshoot so the committed trace's ticks match the
  dossier's own cited 7313/7345 exactly.
- **Next:** rung (b) — the FEATHER_DANCE kickoff text + feather/starburst
  animation (~7358-7658, docs/turn6-notes.md §5/§6), genuinely new gfx-
  extraction work, this session's own designated centerpiece, untouched.
  Then (c) the ATK-fall message, (d) Onix's ROCK_SLIDE (parameterizable
  from turns 1/3/4/5's own unchanged mechanism) to the settled turn-7 menu.
- **Notes:** 3 named single-tick bounce-extremum residuals excluded from
  `turn6-menu.json` (7315-7316, 7324-7325/7333-7334/7342-7343, 7348-7350) —
  same well-precedented class already resolved elsewhere in this dossier
  (ticks 3337/3465/3721/3879/3888/4934/5927); the last one (post-confirm,
  region-A Onix-sprite bounce, NOT the healthbox) is grid-search-ruled-out
  as the healthbox freeze and needs a direct `gSprites[onixSlot].y2` RAM
  probe next. PAPERCUT: none this session beyond the chained-trace
  stitching gotcha above (self-inflicted, ~15 min lost, now documented in
  battle-turn-notes.md §27 so it isn't repeated).

---

---
## 197 — Worktree scout (supervisor-folded): turn 11 ground truth BANKED — the ATK-floor falsifiable test FIRES POSITIVE ("ONIX's ATTACK won't go lower!", sText_StatsWontDecrease, PNG-read; PP charged + accuracy roll consumed but stat write blocked), and the blocked effect SKIPS the feather animation (33-tick static kickoff hold vs turns 6-8's ~290-tick animated holds — rationale corrected in the fold: animation keys on effect-success, not move class); third consecutive line reconvergence; `battle1-turn11-dense.json` (14340 frames, 256 captures) + `docs/turn11-notes.md`; merged `961344a`, suite 813/813 on the merged tree

- **State:** merged into master, `npm test` 813/813 + build green
  post-merge. Supervisor re-verified: prefix chain (turn10 ⊂ turn11 ⊂
  winline-b-swap, script-exact), 5/5 cited shas reproduced fresh, the
  headline message PNG-read directly ("won't go lowe[r]" mid-typing at
  13447, Onix 14/117). One rationale corrected in the fold (see headline;
  observation was right, generalization was wrong and would have broken
  turns 6/7 engine slices).
- **Did:** turn 11 = FEATHER_DANCE reselected at ATK floor (first
  positive on standing test 1; PP 12→11, accuracy roll consumed, stat
  write silently blocked) + ROCK_SLIDE hit (Pidgeotto 38→16). The
  unattributed +14-tick RNG step is ABSENT this turn — narrows its call
  site to a damaging move's HP-commit path (test 3 sharpened, still
  open). Pidgeotto crosses yellow→red at tick 13740 (~20.5%, matches
  turn 9's Onix threshold). Turn 12 is near-certain to hold Pidgeotto's
  faint + MURKROW switch-in (16/156 vs ~22/hit ROCK_SLIDE).
- **Also this fold:** ISSUES #26 filed (Sitrus THIN_RING exclusion,
  7042-7072, 3 bounded attempts, leads incl. the untried +2-lag class);
  M-5's stray scratch script removed; scout's .gitignore note (the
  `reference` symlink pattern) left as-is — cosmetic, not worth a churn
  commit.
- **Next:** turn-6 engine slice (FIGHT submenu at 7317 through turn 6's
  full resolution — FEATHER_DANCE's REAL animated path this time, per
  turn6-notes + the corrected §5 rows); turn-12 scout (the faint/Murkrow
  switch-in window).
- **Notes:** scout stayed in contract; no papercuts.

---
## 196 — Bounded worker (S7 slice M-5): rungs (d)+(e) LANDED — tint + heal message + HP climb + settled turn-6 menu; `turn5-sitrus-c.json` 150/150, `turn5-sitrus-d.json` 133/133, both 0 diff; ring excluded (bounded effort, 3rd resistance, precise ticks); **the faint/forced-switch sequence is COMPLETE**

- **State:** `npm test` **813/813** (+8), `npm run build` green, tree
  clean. New committed traces `turn5-sitrus-c.json` (150 captures,
  7035-7215 excluding the ring's own 7042-7072) and `turn5-sitrus-d.json`
  (133 captures, 7180-7312, covers past the 7307 acceptance boundary) —
  both 0 diff. Regression sweep: `turn5-sitrus-a.json` 110/110,
  `turn5-sitrus-b.json` 82/82, `turn5-healthbox.json` 55/55,
  `turn5-switchin.json` 241/241 — zero regressions.
- **Did:** Tint — RAM-probed fresh (`gPlttBufferFaded`/`Unfaded`, all 15
  usable palette colors, Onix's own paletteNum=0 not Pidgeotto's 1),
  brute-forced target+coeff jointly and got a UNIQUE fit: `RGB5(17,31,25)`,
  coeff sequence 7/5/3/1/0 held 5 RAM ticks each — genuinely NOT
  `MATERIALIZE_TINT_COLOR` reused (an initially-plausible hypothesis the
  brute force ruled out). Heal message ("ONIX’s SITRUS BERRY"/"restored
  health!", 7078→7112, held to 7215) PNG-diff-timed; found and fixed one
  real bug (a straight ASCII apostrophe the charmap doesn't map — the
  codebase's own convention is the curly `’`, per `STAT_ROSE_LINE1`). HP
  climb: 1→31, exactly 1 unit/tick, render 7180→7209, PNG-crop-matched 0px
  against `composePlayerHealthboxHpOverlay` at every candidate hp — this
  **corrects §11's own hedge** ("HP digits/bar still climbing past 7306"):
  they're not; hp is flat at 31 from 7209, every later change in that
  region is the ordinary `menuIdleBounce` y-shift (yOffset 0/1/2, never a
  different hp). Settled menu: chrome text cropped from `menuIdleBase`'s
  own y≥112 (never changes across turns), bounce reuses `menuIdleBounce`
  UNCHANGED re-anchored so tick 7222 (menu redraw) lines up with
  `MENU_IDLE_BLANK_END_TICK+1` — grid-search found a unique shift with zero
  mismatches across 17 samples. Tick 7307 byte-identical (full 64-hex sha)
  to turn6-notes.md §5's own citation. Ring: excluded per the brief's own
  allowance — with tint correct, the residual in 7042-7072 is provably
  100% the ring (diff overlay shows a clean red ring outline, growing
  6px→628px matching its own expand-then-fade shape) — third documented
  resistance, still open. +8 Tier-1 tests.
- **Next:** the turn-6 engine slice proper (FIGHT submenu open at 7317+)
  against `turn6-notes.md`'s dossier; then turn-7/8/9/10 slices against
  their own four dossiers.
- **Notes:** no papercuts this session. Docs: `faint-switch-notes.md` new
  §15 (trimmed §14's "not reached" pointer to it).

---

---
## 195 — Worktree scout (supervisor-folded): turn 10 ground truth BANKED — SECOND consecutive full reconvergence (AERIAL_ACE + ROCK_SLIDE hit, RAM bit-identical to BOTH published lines' turn-10 rows incl. gRngValue), all three standing falsifiable tests still negative; `battle1-turn10-dense.json` (13306 frames, 208 captures) + `docs/turn10-notes.md`; merged `9834116`, suite 805/805 on the merged tree

- **State:** merged into master, `npm test` 805/805 + build green
  post-merge. Supervisor re-verified: prefix chain (turn9-dense ⊂
  turn10-dense ⊂ winline-b-swap, script-exact), 3/4 cited shas
  reproduced + the 4th was a tabulation slip (cited sha belongs to tick
  12320, not 12345 — label PNG-verified correct, two fresh oracle runs
  byte-identical; row corrected in the fold). Cursor-persistence got its
  strongest data point: zero navigation presses this turn, cursor0
  RAM-flat on ROCK_SLIDE across the whole window.
- **Did:** turn 10 = AERIAL_ACE (new to arc: EFFECT_ALWAYS_HIT skips the
  accuracy roll entirely, RAM-confirmed; slash-on-target animation shape,
  no attacker mover) vs ROCK_SLIDE hit; Onix 24→14, Pidgeotto 61→38. The
  unattributed +14-tick RNG step reproduced a 3rd time and one candidate
  explanation was RULED OUT (identical-text/typing-timing — turn 2's
  differently-typed pair hits the same offset): looks like a fixed
  engine-level cost. Turn-9's "4-frame shared prefix" reproduction
  attempt honestly flagged as method-incomplete (skipped the baseline
  bisection), an open gap not a contradiction.
- **Cross-lane note:** M-4's worker cd'd into this scout's LIVE worktree
  early on (cwd persistence) leaving uncommitted scratch debris; scout
  reported it, merge carries none of it, PAPERCUTS.md entry added
  (supervisor). M-4's own deliverable verified separately in the main
  tree (`turn5-sitrus-b.json` 82/82, suite 805/805).
- **Next:** M-5 (Sitrus rungs d+e per faint-switch-notes §14: tint/
  sparkle/ring/message/HP-climb, then settled menu ≥7307 — completes the
  faint/forced-switch sequence); then turn-6..10 engine slices against
  the five banked dossiers.
- **Notes:** no scout papercuts; turn-11+ boundaries noted in the
  dossier, not densely probed.

## 194 — Bounded worker (S7 slice M-4): rung (c) LANDED — `GrantingStarsEffect`'s two star sprites RAM-probed fresh (spawn ticks 10 apart, corrects the source's own "8 ticks" framing) and byte-exact; `turn5-sitrus-b.json` 82/82, 0 diff, 6960-7041; rungs (d)/(e) NOT reached (out of session time) — precisely scoped for the next session

- **State:** `npm test` **805/805** (+5), `npm run build` green, tree
  clean. New committed trace `turn5-sitrus-b.json` (82 captures,
  6960-7041) 0 diff. Regression sweep: `turn5-sitrus-a.json` 110/110,
  `turn5-healthbox.json` 55/55, `turn5-switchin.json` 241/241,
  `turn5-sentout.json` 141/141 — zero regressions.
- **Did:** RAM-probed the two `gGrantingStarsSpriteTemplate` sprites fresh
  (`tools/probe/specs/turn5-sitrus-star-scan.json`, a 64-slot sweep then a
  targeted slot-3/4 x/y/x2/y2/animCmdIndex/flags trace) rather than
  trusting `General_HeldItemEffect`'s own "8 ticks apart" prose — real
  spawn gap is **10 ticks** (RAM 6968/6978), fixed screen anchors
  `(57,88)`/`(84,83)`, anim frame `floor(local/7)%8` (matches the
  source-cited 8-frame/7-tick shape exactly), and a genuinely new-this-
  session finding: a slow `y2` creep, `floor(local/8)` (0..7 over each
  star's own 62-tick life) — no prior citation predicted this. Corner
  convention `(ramX-16, ramY+y2-16)`, RAM-to-render lag **+1**, bisected
  against 6 independent (tick,star,frame) triples via brute-force pixel
  search, all 0px. Found and fixed two real bugs via the committed trace
  (not guessed up front): a 1px z-order overlap (GBA composites lower
  sprite-slot indices in front — draw order reversed) and creation-tick
  invisibility (`local===0` never renders, same shape as the switch-in
  particle burst's own `age = tick - spawnTick - 1`). Wired
  `turn5GrantingStarPlacement` (pure, exported) + `drawGrantingStars`
  into `drawTurn5RockSlideAttack`. +5 Tier-1 tests.
- **Next:** rung (d) — tint (Onix's own palette recolor, first diff 7042,
  same `gPlttBufferFaded` method §8c already used for the materialize),
  ring (`ANIM_TAG_THIN_RING`, gfx extracted/cited two sessions running,
  affine-scale placement search still not attempted — bounded effort,
  exclude precisely if it resists per the brief), heal message ("ONIX's
  SITRUS BERRY.../restored health!", start 7078, 1 char/tick to 7112) +
  HP climb (1->31, §2's pinned formula, needs digit-overlay+bar-refill
  render) + wait-cursor bounce (~7180-7209, period 9, `turn5Fainted-
  CursorYOffset`'s own family, likely reusable). Then rung (e): settled
  turn-6 menu to >=7307 — §11 already flagged the tail is NOT static (HP
  digits/bounce still cycling at 7306), needs the live formula threaded
  through, not a frozen harvest.
- **Notes:** no papercuts (one self-inflicted ~10min detour: an early `cd`
  into a stale sibling worktree left the shell's cwd there, so several
  early probe/compare commands silently ran against that worktree's
  unmodified tree until `pwd` caught it — no bad data landed, just lost
  time; worth remembering `cd` in Bash calls doesn't get reset between
  calls). Docs: `faint-switch-notes.md` §14 added.

---
## 193 — Worktree scout (supervisor-folded): turn 9 ground truth BANKED — the pinned ATK-floor test came back NEGATIVE (Pidgeotto uses QUICK_ATTACK, not a 4th FD; "won't go lower" variant still untested) and **both published lines reconverge RNG-exactly at turn 9** (BIND-miss and ROCK_SLIDE-miss consume identical Random() counts → same gRngValue); `battle1-turn9-dense.json` (12272 frames, 256/256 captures) + `docs/turn9-notes.md`; merged `782eaab`, suite 801/801 on the merged tree

- **State:** merged into master, `npm test` 801/801 + build green
  post-merge (docs+trace+probe-spec only). Supervisor re-verified: prefix
  chain (turn8-dense ⊂ turn9-dense ⊂ winline-b-swap, script-exact), cited
  shas reproduced fresh, submenu label frames read as images. **One row
  corrected in the fold** (supervisor pixel-diff evidence, two fresh
  oracle runs byte-identical): the "no visible change during the press"
  claim at 10869-10877 hid a real 5-tick healthbox-region transient
  (bea3024eb2f3, bbox x:127-229 y:74-110, bounce-family) — turn9-notes §5
  row now carries both shas. Verification lesson holds: representative-
  tick sha citations can mask un-itemized sub-phases; diff the WHOLE
  cited span when a row claims "no change".
- **Did:** turn 9 = QUICK_ATTACK (Pidgeotto, 82→61... Onix 31→24) vs
  ROCK_SLIDE (hit, Pidgeotto 82→61); first turn in the arc where both
  sides land damage — first "not very effective" (0.5×) message
  PNG-confirmed, first healthbar color-zone transitions pixel-sampled
  (Pidgeotto green→yellow at 50%, Onix yellow→red). Cursor persistence
  reconfirmed in RAM across the closed action menu (gMoveSelectionCursor
  holds BIND before reopen; LEFT flips it inside the press window). The
  turn-2 "unattributed RNG step" recurs (+14 ticks before next accuracy
  roll) specifically when both combatants use damaging moves — still
  unattributed to a call site. The 4-frame shared box-open prefix theory
  refined: holds box-region-only, within matched transition categories.
- **Next:** M-4 (Sitrus rungs c-e: GrantingStars 6970→~7040, tint/
  sparkle/ring/message/HP-climb, settled menu ≥7307); then turn-6/7/8/9
  engine slices against the four dossiers.
- **Notes:** scout stayed in contract; no papercuts.

---

## 192 — Bounded worker (S7 slice M-3): Sitrus rotation window LANDED — the "small-angle rounding gap" §12 flagged was actually a +2 (not +1) render-tick lag miswiring, NOT a sampler bug; `drawSpriteSheetAffineRotate` needed zero changes; `turn5-sitrus-a.json` 110/110, 0 diff; rungs (c)-(e) not attempted (out of time)

- **State:** `npm test` **801/801** (+8), `npm run build` green, tree
  clean. New committed trace `turn5-sitrus-a.json` (110 captures,
  6860-6969) 0 diff, twice-run identical. Full 47-trace sweep: every trace
  at its own previously-established count, zero regressions —
  `turn5-healthbox.json` 55/55 (the trace this exact change regressed last
  session), `turn5-switchin.json` 241/241, `turn5-sentout.json` 141/141,
  `turn5-rockslide.json` 256/256, `sendout.json` 255/256,
  `s6-acceptance.json` 224/228, `turn2-dragonbreath.json` 237/237 (ISSUES
  #23's parked residual — unaffected, as expected: the sampler itself
  wasn't touched).
- **Did:** RAM-probed the full 32-entry Sitrus rotation matrix table fresh
  (`tools/probe/dump-onix-sitrus-rotate-matrix.py`, battler-0 variant of
  §12's own probe) — reproduces §12's cited values exactly. Bisected the
  render-vs-RAM tick correspondence directly against oracle PNG hashes
  (not assumed): the render stays byte-identical to the flat pose through
  tick 6874 and first visibly changes at 6875, which pins the lag at **+2**
  (not this run's usual +1) — RAM tick `T`'s matrix first shows at render
  `T+2`. §12's reverted attempt used lag 0, which is the actual root cause
  of last session's regression — **not** a sampler rounding bug. Re-verified
  with a from-scratch pixel classifier (oracle PNG vs. simulated output,
  background resolved via the identity frame's own confirmed-transparent
  set): at the correct lag + `y2` threaded alongside the full matrix (not
  instead of it), `drawSpriteSheetAffineRotate` reproduces the oracle
  exactly — every residual the naive classifier still flagged traced to a
  separately-drawn drop-shadow sprite (constant color, bottom-edge rows
  only) this function was never asked to model, confirmed zero via the
  real `npm run compare` renderer. Swept 6 alternate sampler conventions
  (round-to-nearest, pixel-center bias, axis transpose, matrix inverse)
  against the oracle — the existing plain floor (`>>8`) convention was
  already the best fit at every one, confirming no sampler change was
  needed. Wired `onixSitrusRotateMatrix(t)` into `drawTurn5RockSlideAttack`'s
  existing Onix draw call, identity/null fall-through to the unchanged
  plain static draw. +8 Tier-1 tests (`drawSpriteSheetAffineRotate` pinned
  against a hand-built fixture at identity/tiny/90° angles;
  `onixSitrusRotateMatrix` pinned at the window edges and both bisection
  ticks).
- **Next:** rung (c) `GrantingStarsEffect` (~6968-~7040, confirmed this
  session to start exactly at render 6970 where the rotation's own window
  ends — probed the boundary two-sided before trimming the committed trace,
  diffs there are a real new element, not sampler noise) — two
  `gGrantingStarsSpriteTemplate` sprites, gfx not yet extracted. Then rung
  (d) (tint/sparkle/ring/message/HP-climb, §11's own scope) and rung (e)
  (settled turn-6 menu, coverage to ≥7307).
- **Notes:** no papercuts. Docs: `faint-switch-notes.md` §13 added (root
  cause, the lag bisection method, what landed, exactly where rung (c)
  starts). Ladder rungs (a)+(b) both closed this session — (c)-(e) not
  attempted, ran out of the session's own time budget partway through
  writing up the (a)/(b) findings rather than starting (c) half-done.

---

---
## 191 — Worktree scout (supervisor-folded): turn 8 ground truth BANKED — winline-b takes **BIND, and it MISSES** (8 Random() calls, miss short-circuits crit/spread/effect); ATK stage hits its floor (2→0) yet prints the ordinary "harshly fell" (source-traced: the "won't go lower" variant needs the stat already AT floor before the attempt); `battle1-turn8-dense.json` (10826 frames, 226/226 captures) + `docs/turn8-notes.md`; merged `fc0d23c`, suite 793/793 on the merged tree

- **State:** merged into master, `npm test` 793/793 + build green
  post-merge (docs+trace only). Supervisor re-verified: prefix chain
  (turn7-dense ⊂ turn8-dense ⊂ winline-b-swap, script-exact), 5/5 cited
  boundary shas reproduced fresh, cursor-on-BIND submenu frame (9420, PP
  20/20 TYPE/NORMAL) read as an image. Scout PNG-read every text label
  per the new discipline.
- **Did:** turn 8 on the committed line = Pidgeotto's 3rd FEATHER_DANCE
  (Onix ATK floor 2→0) then Onix's BIND miss (acc 75 — corrects §14's
  prose "85"; roll at RAM 9844 fires under the PREVIOUS text, 2 ticks
  before the box transition). No HP change either side. BIND's trap
  mechanic (EFFECT_TRAP/STATUS2_WRAPPED, maxHP/16 end-of-turn) inventoried
  from source but NOT exercised (missed; RAM wrap-status flat). The
  4-frame shared box-open prefix reconfirmed 3× within this turn; the
  stat-write→"fell"-text gap is 293 ticks (vs 294/293 turns 6/7).
  "Won't go lower" variant's real trigger pinned = a 4th FD (turn-9
  scout's falsifiable test). Minor flag: BIND's description text
  ("2 to 5 turns") vs source-implemented 3-6 wrap duration — noted in
  the doc, not chased.
- **Next:** M-3 (affine-sampler small-angle fix per §12's bisect-at-6887
  instrument, then the Sitrus stages); turn-6/7/8 engine slices against
  the three dossiers (turn 8 = text-only resolution, cheapest of the
  three).
- **Notes:** scout stayed in contract; no papercuts.

---

## 190 — Bounded worker (S7 slice M-2): Onix "idle bob" ROOT-CAUSED and NAMED — it's the Sitrus proc's own opening animation stage (`General_HeldItemEffect`, a genuine GBA affine-OAM rotation), starting at tick 6869 not ~7042; render fix attempted and REVERTED (regresses the protected healthbox trace on a small-angle rounding gap) — NOT landed, no new committed traces

- **State:** `npm test` 793/793 (unchanged), `npm run build` green, tree
  clean. No `src/` changes committed (one attempted engine change was
  tried, found to regress `turn5-healthbox.json`, and reverted per this
  run's own no-red-trace discipline). Regression check clean:
  `turn5-healthbox.json` 55/55, `turn5-switchin.json` 241/241,
  `turn5-sentout.json` 141/141, `turn5-rockslide.json` 256/256, all still
  0 diff/unchanged.
- **Did:** ladder rung (a) ("NAME the bob mechanism") fully closed, source-
  cited AND RAM-verified 100%. §11's "idle bob" isn't idle - it's the
  OPENING stage of the Sitrus Berry proc's own battle animation
  (`General_HeldItemEffect`, `B_ANIM_HELD_ITEM_EFFECT`), launched at RAM
  tick 6869 via `TryHandleLaunchBattleTableAnimation`
  (`battle_gfx_sfx_util.c`) - ~170 ticks before the sparkle/tint every
  prior session assumed was the proc's start. Its first 3 steps
  (`AnimTask_RotateMonToSideAndRestore` x3) are a genuine GBA affine-OAM
  ROTATION of Onix's sprite, not a y-only bounce: `y2 = |gOamMatrices[
  matrixNum].c| >> 3` is a BYPRODUCT of the rotation matrix
  (`SetBattlerSpriteYOffsetFromRotation`, `battle_anim_mons.c`), RAM-
  verified exact at every probed tick (matrix `(a,b,c,d)` cross-read
  directly against `y2`, 100% match). This is exactly why the prior
  session's "apply y2 as a signed pixel offset" attempt failed BOTH
  directions - a rotation shears every row horizontally too; §11's own
  hypotheses (a)/(b)/(c) are superseded, not confirmed. 3 back-to-back
  32-tick rotation cycles (identity at RAM ticks 6872/6904/6936/6968),
  then a genuinely new, still-unitemized `GrantingStarsEffect` stage
  (~6968-~7040) BEFORE the tint/ring/message stage §11 already scoped -
  the "flat window" framing is gone entirely; the whole 6869-7222+ span is
  actively animating. Attempted to wire the fix in (reusing the engine's
  existing, already-proven `drawSpriteSheetAffineRotate` primitive built
  for the thrown ball's own spin - no new renderer needed, just a 32-entry
  RAM-read table) - but it regresses the PROTECTED `turn5-healthbox.json`
  (ticks 6873/6874 go from 0 diff to 600px), a genuine small-angle
  sub-pixel rounding gap in the existing sampler (ruled out a simple
  pb/pc axis swap as the cause). Reverted rather than ship red.
- **Next:** audit `drawSpriteSheetAffineRotate`'s nearest-neighbor
  rounding at SMALL rotation magnitudes specifically (bisect against the
  oracle at a fixed large-in-cycle tick like 6887 first, `a=251,b=49,
  c=-49,d=251`), then reuse the table/call-site banked in
  `faint-switch-notes.md` §12 verbatim - no need to re-derive the
  mechanism. After that: `GrantingStarsEffect` gfx/timing (unitemized),
  then §11's own tint/sparkle/ring/message/HP-climb/settled-menu chain.
- **Notes:** no papercuts. Docs: `faint-switch-notes.md` §12 added (full
  mechanism, RAM proof, the reverted attempt's exact diagnostic data, and
  the corrected 3-stage timeline); small dev-tool addition (`isActive`
  field in `tools/probe/dump-task-and-sprite-callbacks.py`, not `src/`);
  archived #187 to keep the ledger to 3 entries.

---

---
## 189 — Worktree scout (supervisor-folded): turn 7 ground truth BANKED + two REAL corrections to the turn-6 dossier — `battle1-turn7-dense.json` (9380 frames, 256/256 captures, twice-run identical, verbatim winline extension) + `docs/turn7-notes.md`; **turn 7 brings NO new mechanism** (repeats turn 6's FEATHER_DANCE/ROCK_SLIDE pair); merged `af7a3e3`, suite 793/793 on the merged tree

- **State:** merged into master, `npm test` 793/793 + build green
  post-merge (docs+trace only). Supervisor re-verified: prefix check
  (turn6-dense ⊂ turn7-dense ⊂ winline-b-swap, script-exact), 4/4 cited
  boundary shas reproduced on a fresh oracle run, and the label-bearing
  frames READ as images (8354: submenu with cursor persisted on ROCK
  SLIDE, PP 5/10 — §19's rule exercised at a real turn boundary).
- **Did:** turn 7 ledger RAM-confirmed on the winline (Pidgeotto 113→82,
  −31; PP ROCK_SLIDE 5→4, FD 14→13; ATK stage 4→2; 11 Random() calls,
  same shape as turn 6). Turn-8 divergence state pinned (BIND vs
  ROCK_SLIDE choice). **Corrections (supervisor PNG-verified against the
  regenerated turn-6 captures, then folded into turn6-notes §5):** (1)
  turn 6's "ATK-fall message window 7385-7558" rows were mislabeled — the
  FEATHERDANCE kickoff text holds ~7358-7658 with the feather attack
  animation playing during the hold; the RAM `onixAtkStage` write (7391)
  precedes the "harshly fell!" text by ~294 ticks (separate battle-script
  steps, not one unit); the ATK-fall text is fully drawn at 7684. (2) the
  "byte-identical 26-frame msgbox pair" claim shrank to first-4-frames
  under re-verification. Lesson recorded: sha reproduction validates
  determinism, NOT semantic labels — supervisor label-checks now read
  the PNGs.
- **Next:** slice M-2 (Onix idle-bob root cause + Sitrus window, §11's
  three hypotheses); then turn-6/turn-7 engine slices against the two
  dossiers (turn 7 = pure parameterization of turn 6).
- **Notes:** scout stayed in contract; no papercuts. Turn-6 engine slice
  must budget for the FEATHER_DANCE attack animation (feathers/starburst,
  ~7450-7658) that the original dossier's mislabeled table hid.

---
## 188 — Bounded worker (S7 slice M): Pidgeotto's healthbox slide-in LANDED (`turn5-healthbox.json` 55/55, 0 diff, 6820-6874) — Sitrus proc + settled menu NOT landed, blocked on a newly-discovered Onix on-field idle-bob (RAM table pinned, screen mapping unresolved)

- **State:** `npm test` **793/793** (+3), `npm run build` green, tree clean.
  New committed trace `turn5-healthbox.json` (55 captures, 6820-6874) 0
  diff. Regression clean: `turn5-switchin.json` 241/241, `turn5-sentout.json`
  141/141, `turn5-rockslide.json` 256/256.
- **Did:** assigned the full 6828→~7307 window (healthbox slide-in, Sitrus
  proc, settled menu vs PIDGEOTTO). Landed the healthbox slide-in cleanly:
  Pidgeotto's own opponent healthbox was never drawn at all past 6828 (a
  real gap, not just unverified) — composited (name/level/gender, gender
  pixel-confirmed male via an oracle crop) and wired in with the same
  23-step slide `healthboxSlideDx` (now generalized to an arbitrary anchor)
  already used for S6's own send-out. Found and fixed a real off-by-one:
  the naive anchor (matching §8e's own cited RAM tick, 6828) reproduces the
  oracle's slide sequence exactly one tick early throughout — needs the
  ordinary +1 RAM-to-render lag every other mechanism in this dossier
  carries, isolated via a diff-vs-fixed-background pixel scan applied
  identically to oracle and app frames. +3 Tier-1 pins. Then RAM-probed
  past the slide (`tools/probe/specs/switchin-b0-sprite.json`, twice-run
  identical) and found the "flat" window right after settle (6852-7040) is
  NOT actually static: Onix's own sprite (the player's battler, not
  Pidgeotto's) plays a continuous idle vertical bob on a clean 32-tick
  period starting RAM tick 6870 — a genuinely new mechanism (Onix is drawn
  perfectly static through the whole already-verified 6588-6828 span, so
  this only engages once it's just standing idle). The RAM table itself is
  solid (pixel bbox of the affected region matches Onix's sprite footprint
  exactly, nothing else). But applying it as a direct render-tick `y2`
  offset does NOT reproduce the oracle (large residual diffs both signs
  tried) — tried and reverted rather than ship red, per this run's own
  discipline. Also ran a fresh full-window oracle diff scan sharpening
  §3e's own `~`-estimates to exact ticks (sparkle/tint window ~7042-7075,
  Sitrus message exact 7078-7112 (35 chars, byte-length-matched), a big
  redraw at 7222, and — new finding — the HP-climb/menu window keeps
  visibly changing all the way to the 7307 acceptance boundary, so a
  single flat "final frame" harvest won't work for the settled menu).
- **Next:** re-derive the Onix idle-bob's RAM→screen mapping (three
  hypotheses banked in `docs/faint-switch-notes.md` §11 — scale factor,
  wrong sprite-slot assumption, or a second uncontrolled simultaneous
  change) before the Sitrus sparkle/tint/ring/message/HP-climb/settled-menu
  chain can proceed, since the idle-bob renders underneath all of it. The
  Sitrus ring gfx (§8a) also still needs its own pixel-placement pass,
  unchanged from before this session.
- **Notes:** no papercuts. Docs: `faint-switch-notes.md` §11 added (both
  the landed piece and the precise blocker, with the exact pixel/RAM data
  needed to resume without re-deriving); archived #185 to keep the ledger
  to 3 entries.

---

---
## 187 — Worktree scout (supervisor-folded): turn 6 ground truth BANKED — prefix consistency of the whole engine chain vs the WIN line CONFIRMED (one line, no divergence through turn 7); `battle1-turn6-dense.json` (8346 frames, 251 captures, twice-run identical) + `docs/turn6-notes.md`; merged `858f482`, suite 790/790 on the merged tree

- **State:** merged into master, `npm test` 790/790 + build green
  post-merge (docs+trace only, no src changes). Supervisor re-verified
  independently: script-level prefix check (turn5-switchin ⊂ turn6-dense ⊂
  winline-b-swap, exact) and 4/4 cited boundary shas reproduced on a fresh
  oracle run.
- **Did:** turn 6 = FEATHER_DANCE (Pidgeotto acts first, speed 77 vs 76 —
  RAM-confirmed, previously unpublished) then Onix's ROCK_SLIDE (43 dmg,
  Pidgeotto 156→113, drain window ~7970-8019 at ~3 ticks/pixel-column —
  NOT the 1-unit-per-tick pattern of small bars). RNG ledger: 11
  `Random()` calls, LCG-step-verified. Boundaries sha-cited: menu 7307,
  submenu 7317, confirm 7344, FD kickoff ~7358, ATK-fall msg 7385-7558,
  RS kickoff ~7770, impact 7935-7956, turn-7 menu settled 8122 (+222
  ticks margin to the next winline press). New-to-turn-6 mechanism
  inventoried: FEATHER_DANCE (EFFECT_ATTACK_DOWN_2, two chained message
  phases, `statStages` write mid-message at 7391, no HP drain). One
  characterized-not-attributed find: ticks 7659-7684 and 7765-7784 are a
  byte-identical 26-frame msgbox open/close sequence (likely one generic
  slide routine; lead: shared `gBattlerControllerFuncs[1]`=134609789).
- **Next:** unchanged from #186 — healthbox slide-in/Sitrus/settled-menu
  slice (§8e/§2/§3e), then a turn-6 engine slice against this dossier.
- **Notes:** scout stayed in contract (no src/, no ledger edits); no
  papercuts.

---

## 186 — Bounded worker (S7 slice L-4): materialize ramp-down + wobble phase CLOSED, `turn5-switchin.json` extended **167→241** (6588-6828, full ball-to-settle window), **0 diff, ZERO exclusions** — two independent bugs root-caused (a corrupted coefficient table + a healthbox Z-order miss)

- **State:** `npm test` **790/790** (+3), `npm run build` green, tree clean
  at `9faddea`. No worktrees. `turn5-switchin.json` now covers the FULL
  ball-to-settle window, 0 diff, no excluded ticks.
- **Did:** assigned to close the ramp-down residual (~1100-1350px/frame,
  render 6768-6782) and verify the wobble phase. RAM-probed `oam.affineMode`/
  `gOamMatrices` directly (new `tools/probe/dump-switchin-materialize-
  affine.py`) across the ramp window — matrix pinned at pure identity,
  `affineMode=NORMAL` throughout, ruling out geometry entirely. Root cause
  was the palette coefficient itself: the PRIOR session's own
  `TURN5_MATERIALIZE_RAMP_COEFF` table and its "same render tick" lag
  finding were BOTH corrupted — decoded from a degenerate `gPlttBufferFaded`
  offset (`+0x222..0x228`) where `BlendPalette`'s integer truncation
  collapses several coefficients onto identical output. Reprobed at
  `+0x230` (a non-degenerate color, cross-checked against 3 independent
  oracle pixels) and found the REAL sequence: flat coefficient 16 through
  render 6767, then a perfectly linear 15->0 countdown from render 6768,
  with the ORDINARY +1 RAM-to-render lag (not same-tick as previously
  believed). Unified growing+ramp into one draw call via new
  `drawSpriteSheetAffineTintedBlend` (identical to the old flat-tint call
  at coeff=16, no seam). Wobble phase needed `doubled=true`
  (`ST_OAM_AFFINE_DOUBLE`, RAM-confirmed) threaded into
  `drawSpriteSheetAffineStretch` — verified as its own isolated 0-diff
  span. A SEPARATE bug surfaced once the window widened past 6754: the
  opponent's own particle burst painted over the player's healthbox UI —
  real hardware sets ALL healthbox pieces to OAM priority 0 during battle
  animations (`LaunchBattleAnimation`/`UpdateOamPriorityInAllHealthboxes(0)`,
  `battle_anim.c`), unconditionally on top; moved `drawMenuHealthboxPlayer`/
  `drawPlayerHealthboxHpOverlay` to draw after `drawTurn5SwitchinSprite` in
  `drawTurn5RockSlideWindow`. +3 Tier-1 pins (`turn5MaterializeCoeff`).
  Regression-swept clean at unchanged counts: `turn5-sentout` 141/141,
  `turn5-rockslide` 256/256, `turn4-doubleteam` 250/250, `turn5-menu`
  42/42, `fight-submenu-reopen` 90/90, `turn3-menu` 254/254,
  `turn4-rockslide` 250/250, `turn5-endeavor` 254/254. Docs:
  `faint-switch-notes.md` §10 rewritten (both prior "not landed" items
  closed, the Z-order finding added, status CLOSED); archived #183 to
  `PROGRESS-archive.md` to keep the ledger to 3 entries.
- **Next:** the faint/forced-switch sequence's last unexplored territory
  is past `TURN5_PIDGEOTTO_SETTLE_TICK`(6828) — healthbox slide-in, Sitrus
  proc, settled menu vs PIDGEOTTO (§8e/§2/§3e, fully spec'd, untouched).
  Then turn 6+ toward battle 1's WIN.
- **Notes:** no new papercuts. One self-corrected false start: an
  intermediate "constant coefficient 15" hypothesis for the flat span
  looked plausible from a degenerate RAM decode but was caught by a direct
  oracle pixel cross-check before it was ever committed.

---
## 185 — Supervisor wind-down: session end 2026-07-20 ~16:00 — **15 worker steps verified and folded** (9 main-lane + 6 worktree, 41 commits); suite **744 → 787/787**; headlines: **turns 3, 4, and 5 of battle 1 are COMPLETE and pixel-exact through Grovyle's faint** (11 new committed traces), **every excluded residual tick in turns 1-5 is now RESTORED and GREEN** (four separate root-caused engine bugs, zero "hardware quirk" labels left standing), and the **user-reported FIGHT B-close/reopen strand (ISSUES #25) was root-caused, oracle-verified, and fixed same-day**

- **State (verified this minute):** `npm test` **787/787**, `npm run
  build` green, tree clean at `a05e9d0`+docs, no worktrees, no unmerged
  branches. Full sweep spot-rechecked by supervisor this hour:
  `turn4-doubleteam` 250/250, `turn5-menu` 42/42, `fight-submenu-reopen`
  90/90, `fight-submenu` 235/235, `turn3-menu` 254/254, `turn5-switchin`
  167/167, `turn5-sentout` 141/141 — all 0 diff; `sendout` 255/256 and
  `s6-acceptance` 224/228 unchanged (#5/#18 policy-settled).
- **Session narrative (~09:30-16:00, 8 rounds, two lanes):** turn 3
  (slices G/H), turn 4 (I, I-2 after a characterized-not-committed first
  attempt), turn 5 through the KO (J, K) all landed by the
  "parameterize, don't rebuild" pattern — every slice RAM-probed anchors
  before render code. The switch-in tail landed in three rungs (L
  no-land with findings banked → L-2 resolved the 6727 icon-bar
  transient → L-3 landed ball/particles/materialize-growth); its
  remainder (materialize ramp-down residual ~6768-6782, healthbox
  slide-in, Sitrus, settled menu) is precisely bounded in
  faint-switch-notes §10 / battle-turn-notes §26. Worktree lane ran 6
  scouts/probes: faint/switch-in AI rule + Sitrus formula, switch-in
  itemization + Pidgeotto verification, shake/bounce residual probes
  (Families A/B), slice-L gap closure (4/5), and the extremum probe —
  each folded with supervisor re-verification of a central claim.
- **The residual-elimination thread (session's best result):** four
  independent excluded-tick families were root-caused as REAL,
  small engine bugs and fixed with all ticks restored: stale
  `gBattleMovePower` shake amplitude (general rule + a turn-5
  prediction pinned BEFORE its window rendered — confirmed live);
  turn-3 bounce composition uniformly +1 tick (visible only at sine
  plateau crossings); the turn-4 kickoff-text delay-family gate; the
  turn-5 reopen's same-tick phase switch. Turns 1-5 traces now capture
  every tick of their windows except ISSUES #23's parked projectile span.
- **User interaction:** mid-session bug report (FIGHT → B → A dead) —
  supervisor root-caused the state-machine strand + banked oracle ground
  truth (reopen + cursor persistence) within the hour; fix landed as
  ISSUES #25 (filed → fixed → deleted same day), `fight-submenu-reopen
  .json` 90/90.
- **Next:** (1) finish the switch-in tail from §10's bounded remainder
  (ramp-down residual first — RAM palette-buffer approach per the
  PAPERCUTS note); (2) then turn 6+ toward battle 1's WIN (§14-§16
  ground truth banked); (3) ISSUES #23 stays parked; (4) the §ISSUES-25
  "sine quantization edge" family in the reopened submenu's later dwell
  is the one new named-open residual (same family as the pre-existing
  resumed-menu tick 2073 note).
- **Notes:** no usage-limit events; one launcher failure (inline brief
  with `!(` — zsh parse, papercut recorded, relaunched via brief file);
  4 new PAPERCUTS entries total this session. Worker discipline was
  strong: two honest no-lands (slice L attempt 1, slice I attempt 1)
  both banked findings instead of shipping red, and both windows landed
  on the sharpened retry.
---

## 184 — Bounded worker: PROGRESS #183's two extremum ticks CLOSED — both verified corrective rules applied, both restored 0-diff; `turn4-doubleteam.json` **250/250**, `turn5-menu.json` **42/42**, `npm test` **787/787** (+2), build green, zero regressions across turns 1-5

- **State:** `npm test` 787/787, `npm run build` green, tree clean (2
  commits, `73bce5b` fix 4934 + `a05e9d0` fix 5927). Turns 1-5 now carry
  **zero excluded residual ticks**.
- **Did:** applied both rules verbatim from `docs/turn3-residual-probe-
  notes.md` "The extremum class, probed", each verified first via its own
  `tools/probe/verify-turn{4,5}-*.py` (reran clean before touching code, per
  the brief). (4934) `battleScene.ts`'s `drawFightSubmenuWindow` `textStart`
  gate now additionally excludes `turn3Resolved && !turn4Resolved` from the
  ENDEAVOR-family test, so turn 4's own DOUBLE_TEAM kickoff gets the right
  delay family. (5927) `drawActionMenuIdleWindow` gained an optional
  `turn5ReopenPressTick` param (threaded from `sm.openElapsed` at the one
  DMA-wait call site) that holds the unshifted
  `turn4RockSlideResettledBounceTick` formula for exactly `t === pressTick`,
  switching to the shifted `turn5SubmenuBounceTick` from `pressTick+1` on -
  single-tick-scoped, matches the doc's "delay the switch by one tick"
  framing exactly. Both traces restored to their captureFrames (249→250,
  41→42), both 0 diff. Regression sweep (turn4-rockslide 250/250, turn5-
  endeavor 254/254, turn5-sentout 141/141, turn3-menu 254/254, turn2-
  dragonbreath 237/237, fight-submenu-reopen 90/90, turn1-cloneanim
  230/230) all unchanged, 0 diff. +2 Tier-1 pins (`tests/battleScene.test.ts`:
  the kickoff-text gate at 4933/4934/4935, the Onix bounce phase at
  5926/5927/5928). Docs: both ticks marked RESOLVED in `turn3-residual-
  probe-notes.md`, one-line corrections at `battle-turn-notes.md` §22/§23's
  old exclusion notes; archived #181 to `PROGRESS-archive.md` to keep the
  ledger to 3 entries.
- **Next:** resume the roadmap where #181/#182 left off - materialize's own
  ramp-down/wobble phases (`docs/faint-switch-notes.md` §10) + everything
  past them (healthbox slide-in, Sitrus, settled-menu). No other residuals
  remain open in the turn 1-5 window.
- **Notes:** caught one arithmetic slip mid-session: the reopen's own
  `sm.openElapsed` encodes `pressTick - TICK0` (not `+1` as a first read of
  `core.ts`'s call-site comment suggested) - verified against
  `fightSubmenu.test.ts`'s own pinned `openElapsed` value before trusting
  the offset, caught by the first compare run (41/42, not 42/42) rather than
  shipped wrong.

---
## 183 — Worktree probe (supervisor-folded): BOTH remaining "redraw extremum" ticks ROOT-CAUSED as real engine bugs (label retired) — 4934 = kickoff-text delay-family mis-selected by the monotonic `turn2Resolved` gate during turn 4's DOUBLE_TEAM window; 5927 = the -2 bounce phase shift applied in the SAME render tick the reopen press registers (hardware switches one tick later); merged `7d93103`, suite 785/785 on the merged tree

- **State:** merged into master, `npm test` 785/785 + build green
  post-merge. New: 6 probe specs + twice-run outputs, 3 verification
  scripts (supervisor re-ran `verify-turn4-kickoff-textgate-rule.py` and
  `verify-turn5-reopen-switch-rule.py` in the worktree — both VERDICT
  sections pass), `docs/turn3-residual-probe-notes.md` "The extremum
  class, probed". No engine changes (by design).
- **Did:** (4934) the RAM `OpponentHandlePrintString` tick is
  move-family-specific (+9 DOUBLE_TEAM, +8 ENDEAVOR), render lag uniform
  +1; the engine's `textStart` gate keys off monotonic `turn2Resolved`
  so turn 4 wrongly gets ENDEAVOR-family delay. Corrective rule (add
  `&& !(turn3Resolved && !turn4Resolved)`) verified across all 5 turns,
  zero collateral. (5927) `core.ts` applies `turn5SubmenuBounceTick`'s
  shift in the press-registering tick itself; the real bouncer is smooth
  through it — the rule is a ONE-TICK-LATE formula switch, single-tick-
  scoped, cannot touch 5928+ (all already exact). A non-causal 2-tick
  sSinIndex stall one tick later was found and honestly ruled out.
- **Next:** a small cleanup slice applies both rules + restores 4934/
  5927 to their traces' captureFrames (turns 1-5 would then have ZERO
  excluded residual ticks).
- **Notes:** no new papercuts.

---

## 182 — Bounded worker: ISSUES #25 FIXED — FIGHT-submenu B-close/reopen strand (user-reported) — new dispatch branch reopens after a settled B-close with cursor persisted, at every turn epoch, no epoch flag advanced; `fight-submenu-reopen.json` (new) **90/90, 0 diff**, `npm test` **785/785** (+4), build green, zero regressions

- **State:** `npm test` 785/785, `npm run build` green, tree clean.
  `tools/compare/traces/fight-submenu-reopen.json` (`fight-submenu.json`'s
  script verbatim + `A`(2f) + 60 idle, dense stride-1 captures 2040-2129 -
  B-close, settle, A, reopen transient, reopened submenu's own idle start)
  **90/90, 0 diff** (new). Regression sweep at exact prior counts, all
  unchanged: `fight-submenu.json` 235/235, `turn3-menu.json` 254/254,
  `turn4-menu.json` 44/44, `turn5-menu.json` 41/41, `turn5-sentout.json`
  141/141, `turn5-switchin.json` 167/167, `turn1-rockslide.json` 256/256.
- **Did:** ISSUES #25 (user-reported, supervisor already root-caused the
  mechanism + banked oracle ground truth - implemented faithfully, no
  re-derivation). `core.ts` gained one new dispatch branch: once the close
  redraw settles (`closeElapsed !== null && sceneT >= closeElapsed +
  FIGHT_SUBMENU_CLOSE_DELAY`), a fresh A calls `openFightSubmenu` directly
  (same "old state -> fresh open in one step" shape the existing turn-epoch
  reopen branches already use), threading `fightSubmenu.cursor` through
  instead of a literal - no new "reset" state needed, generalizes to
  unlimited close/reopen cycles at any epoch for free. Oracle-probed (not
  assumed) two new timing facts: this reopen's own redraw is ONE TICK
  LONGER than a fresh open (pressTick+6, not +5 - modeled via `elapsed+2`
  at this one call site) and its bounce overlay is NOT reset, just keeps
  accumulating the already-documented "+2 ticks of drift per DMA-wait
  hard-cut" (new `FIGHT_SUBMENU_REOPEN_BOUNCE_SHIFT=6`, gated by a new
  `FightSubmenuState.reopenedFromClose` flag so the render can tell this
  apart from turn 1's own first open). 4 new Tier-1 pins: the too-early
  gate, full reopen with cursor persistence + all 4 `turnNResolved` flags
  unchanged, a 2-cycle close→reopen→nav→close→reopen, and the same
  mechanism at a SECOND turn epoch (turn 3's own already-reopened submenu).
  Docs: `docs/battle-menu-notes.md` new §ISSUES-25 (mechanism + full timing
  evidence + the residual below); ISSUES #25 deleted.
- **Next:** a recurring small residual (2-6% of frame, Onix/healthbox
  bounce-sprite edge pixels only, ~every 9 ticks) starts a few ticks into
  the reopened submenu's own idle dwell, past this session's committed
  clean window - same still-unattributed "sine quantization edge" family
  `FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT`'s own doc already flags as open for
  the plain resumed-menu window (its own tick 2073), not chased further
  here (see §ISSUES-25's own "Scope note"). Otherwise resume the roadmap
  where #181 left off (materialize ramp-down/wobble phases, §10 of
  faint-switch-notes.md).
- **Notes:** the render-path subtlety that made this non-trivial: naively
  resetting `fightSubmenu` to a "never opened" shape on close-settle would
  have swapped the resumed-menu's own proven-correct render formula for an
  entirely different (epoch-remap) one and likely broken `fight-submenu
  .json`'s own 235/235 - avoided by keeping `openElapsed`/`closeElapsed`
  meaning exactly what they always did and only adding a NEW branch/flag,
  never an intermediate reset state.

---
## 181 — Bounded worker: S7 slice L-3 — ball prop + open-particle burst + materialize GROWING phase LANDED; `turn5-switchin.json` (new) **167/167, 0 diff**, `npm test` **781/781** (+1), build green, zero regressions; materialize's own ramp-down/wobble phases + everything past them (healthbox/Sitrus/settled-menu) NOT reached

- **State:** `npm test` 781/781, `npm run build` green, tree clean.
  `turn5-switchin.json` (ball prop create/open/openFinal, the open-particle
  burst, Pidgeotto's materialize GROWING silhouette, tick 6588-6754)
  **167/167, 0 diff** (new). Full regression sweep at exact prior counts,
  all 0 diff: `turn5-sentout` 141/141, `turn5-faint` 110/110, `turn5-
  rockslide` 256/256, `turn5-endeavor` 254/254, `turn5-menu` 41/41, `turn4-
  rockslide` 250/250, `turn4-doubleteam` 249/249, `turn3-rockslide`
  256/256, `turn1-rockslide` 256/256, `fight-submenu` 235/235, `turn3-
  endeavor` 192/192, `turn3-menu` 254/254, `turn2-endeavor-drain` 201/201,
  `turn4-menu` 44/44, `turn2-dragonbreath` 237/237, `turn1-cloneanim`
  230/230, `menu-idle` 69/69, `turn2-endeavor` 77/77, `s6-acceptance`
  224/228, `scene-assembly` 256/256, plus `sendout.json` **255/256**
  (unchanged, pre-existing named residual).
- **Did:** per the brief's own instruction, RAM-probed ambiguities against
  the already-committed probes first, then iterated render code against the
  live oracle. Landed the ball prop (`TURN5_BALL_HANDOFF_TICK=6727`,
  reusing `drawSendOutBall` verbatim - zero new ball code), a NEW clean
  open-particle-burst formula (`drawTurn5SwitchinParticles` - reusing
  `drawBallOpenParticles` verbatim was WRONG, it bakes in an S6-specific
  one-off RAM-stall correction that doesn't apply here), and Pidgeotto's
  materialize GROWING phase (reuses `affineEmergeAccumulator`/
  `MATERIALIZE_Y2_TABLE` verbatim, including the `+1` logical-offset
  correction §7.21 already established for Grovyle). Found and fixed two
  real bugs mid-session: (1) the switch-in window's own BG-to-white dither
  table was under-resolved on a first pass (a low-dynamic-range sky swatch
  hid two real steps) - re-derived from a ground swatch, exact; missing
  this produced a >16000px/43% full-frame diff that read like a sprite bug
  until isolated. (2) Pidgeotto's own front-sprite frame-parity mapping was
  inverted from the naive even/odd guess - pixel-verified and flipped
  (474px -> 26px residual). The coefficient ramp-down phase (render
  6768-6782) still carries a real ~3% residual not root-caused this
  session (RAM-exact coefficients, something else off - see docs); the
  wobble-table phase (~6786-6828) looks clean in spot checks but wasn't
  independently verified as its own 0-diff span. Per AGENTS.md, cut the
  committed trace at the longest verified-clean boundary (6754, right
  before the ramp phase) rather than ship the residual ticks.
- **Next:** close the coefficient-ramp residual (render 6768-6782, exact
  RAM values already known - `docs/faint-switch-notes.md` §10 item 1),
  verify the wobble-table phase as its own dense span (item 2), which
  unlocks `TURN5_PIDGEOTTO_SETTLE_TICK`(6828, already pixel-confirmed) as
  a clean extension boundary. Healthbox slide-in through Sitrus/settled-menu
  (§8e/§2/§3e, fully spec'd) remain completely untouched.
- **Notes:** PAPERCUT: ~25-30 min lost to a background-fade-table
  under-resolution that read as a sprite-geometry bug (huge 43% diff)
  before isolating it to a palette-blend table built from too low a
  dynamic-range swatch - worth flagging in any future "pixel-sample a
  fade table" task: verify against a swatch whose unfaded value has enough
  headroom in EVERY channel to resolve each step distinctly, or solve
  directly from RAM palette-buffer data (as this session ultimately did for
  the ramp-down coefficient) rather than a screenshot color read.

---

## 180 — Bounded worker: S7 slice L-2 (retry) — icon-bar re-trigger LANDED, tick-6727 transient RESOLVED (RAM-probed, not guessed); `turn5-sentout.json` (new) **141/141, 0 diff**, `npm test` **780/780** (+4), build green, zero regressions

- **State:** `npm test` 780/780, `npm run build` green, tree clean.
  `turn5-sentout.json` (icon-bar create/slide/settle/text/fade/destroy,
  tick 6588-6728) **141/141, 0 diff** (new). Full regression sweep at exact
  prior counts, all 0 diff: `turn5-faint` 110/110, `turn5-rockslide`
  256/256, `turn5-endeavor` 254/254, `turn5-menu` 41/41, `turn4-rockslide`
  250/250, `turn4-doubleteam` 249/249, `turn3-rockslide` 256/256, `turn1-
  rockslide` 256/256, `fight-submenu` 235/235, `turn3-endeavor` 192/192,
  `turn3-menu` 254/254, `turn2-endeavor-drain` 201/201, `turn4-menu`
  44/44, `turn2-dragonbreath` 237/237, `turn1-cloneanim` 230/230,
  `menu-idle` 69/69, `turn2-endeavor` 77/77, `s6-acceptance` 224/228,
  `scene-assembly` 256/256, plus `sendout.json` **255/256** (unchanged,
  pre-existing named residual).
- **Did:** per the supervisor's own explicit instruction, RAM-probed BOTH
  of #179's open unknowns BEFORE writing any render code (two new
  `ram-probe.py` specs, `switchin-iconbar-{slidein,transient}.json`, each
  run twice, byte-identical). Result: (1) the icon slide-in is NOT
  per-icon-staggered as #179 guessed - all 7 sprites (bar + 6 icons) share
  one IDENTICAL `x2` curve, bit-for-bit `OPP_BAR_X2` itself, zero stagger.
  (2) the tick-6727 "mystery transient" RESOLVED: at RAM 6725 all 7
  sprites' OAM `objMode` flips `NORMAL`->`BLEND` simultaneously (`x`/`y`/
  `x2`/`y2` unchanged - ruling out a position explanation), then all 7 are
  destroyed together at RAM 6742 - the same `Task_HidePartyStatusSummary`
  alpha-blend-then-destroy shape already modeled for the PLAYER bar's own
  S6-intro exit (`playerSummaryFadeEva`), just a flatter cadence here (1
  unit/tick, not "every other"). Implemented `drawTurn5IconBar` (reuses
  `OPP_BAR_X2`/`tableX2`/`drawBallStatusBar`/`blendedSetPixel` - zero new
  low-level drawing code) + the sent-out text hard-cut at the oracle-pinned
  absolute tick 6687. Landed BOTH the mandatory rung (a) and rung (b) in
  one commit (`turn5-sentout.json`, 6588-6728) since both were RAM-resolved
  before any code was written - stops one tick before the unimplemented
  ball prop's own first pixel (confirmed via a pixel-level diff that the
  gap is ball-shaped, not icon-bar-shaped: mismatched region isolated to
  x170-181/y58-69, the ball's own resting corner, ball-open-palette
  colors). Added 4 Tier-1 pins (icon-flip state, 3 for the tick-6727
  eva-ramp mechanism, 1 for the sent-out text timing). Docs: `docs/faint-
  switch-notes.md` §9 gained a "Resolution" subsection; new §25 in
  `docs/battle-turn-notes.md`.
- **Next:** the ball prop (fully spec'd, §8b: slot 7, static `(176,64)`,
  6727-6756) through Sitrus/settled-menu - all still pinned in docs, none
  reached this session (ran out of cap after landing the icon-bar
  mechanism cleanly). The two-anchor design (ball/tint/particles vs. the
  front-sprite stretch tables, 24 ticks apart) is unaffected by this
  session's findings and remains the right shape for that work.
- **Notes:** no new papercuts - the RAM-probe-first approach (both
  unknowns resolved before writing render code) avoided #179's own
  papercut (a large speculative draft reverted after burning most of the
  cap) entirely; worth keeping as the default order for future sessions
  chasing an undocumented pixel transient.

---
## 179 — Bounded worker: S7 slice L attempt (switch-in tail) — NOT LANDED, ran out of the 60-min cap mid-verification; speculative engine draft reverted (uncommitted); one real new blocker pinned precisely, `npm test` 776/776 + build unchanged (docs-only commit)

- **State:** tree unchanged from #178 except one docs-only addition
  (`docs/faint-switch-notes.md` §9). `npm test` **776/776**, `npm run build`
  green — identical to the pre-session baseline; no engine code shipped.
- **Did:** implemented a full draft of the switch-in tail (party-icon-bar
  re-trigger, "sent out PIDGEOTTO!" text, ball prop, materialize/stretch/
  particle-burst reuse, healthbox slide-in) in `src/engine/battleScene.ts`
  and iteratively verified it against the oracle via `npm run compare`
  (dense scratch traces, ticks 6580-6815). Two pieces came back **byte-
  exact**: the sent-out text (6687-6726, every tick 0 diff) and the icon-
  bar retrigger's own SETTLED state (6608-6726, 0 diff) — both safe for the
  next session to re-add verbatim. Found and pixel-verified a real
  correction to §3b's own guess: the flipped icon (GROVYLE's own former
  slot, index 5) renders as `"Statused"`, not `"Fainted"` (0/37 mismatched
  px, byte-exact). Found a genuinely NEW, previously-undocumented blocker:
  at render tick 6727 (exactly when the ball prop spawns), the icon-bar
  region changes AGAIN (a 16-tick alternating-magnitude transient, then a
  third distinct steady state) — not itemized anywhere in §3/§7/§8, and it
  conflates with the ball/materialize window in any compare run spanning
  both, so it blocks clean verification of everything from the ball prop
  onward. Ran out of the session's 60-minute cap before RAM-probing this
  directly (the fast path to resolve it) or reaching a clean 0-diff
  boundary anywhere past tick 6726. Per AGENTS.md ("keep the tree green at
  each commit," never ship a non-0-diff trace as done), reverted the
  speculative `battleScene.ts` draft rather than commit broken/unverified
  engine code — kept only the docs findings (real, oracle-verified,
  independent of the reverted code).
- **Next:** re-implement slice L starting from
  `docs/faint-switch-notes.md` §9's own findings (saves re-deriving the
  text/icon-settle mechanisms and the two-anchor materialize-timing
  hypothesis). RAM-probe the tick-6727 icon-bar interaction FIRST
  (`gSprites[]` for the 6 icon-bar sprites across render ticks 6720-6745,
  same `path`-based technique as `switchin-b1-sprite.json`) — it's the one
  new unknown gating everything downstream (ball/materialize/particles/
  healthbox-slide/Sitrus/settled-menu, all still unattempted).
- **Notes:** PAPERCUT: the switch-in window's timing turned out to need
  TWO independent anchor points (ball/tint/particles off one RAM tick,
  front-sprite materialize/stretch tables off a different one 24 ticks
  later) rather than the S6 intro's own single shared `handoffTick` — cost
  significant time to even suspect, since every existing precedent in this
  file (`drawSendOutHandoff`) assumes one shared anchor; worth flagging in
  the mapping table for whoever writes the eventual §9 follow-up. No other
  new papercuts.

---
## 178 — Worktree scout (supervisor-folded): slice L's five asset/formula gaps — 4/5 CLOSED with implementable numbers, 2 corrections to prior docs (the "thrown ball" is STATIC at (176,64), no arc exists; the particle burst is 16 sprites, not 13); merged `0f17f5c`, suite 776/776 on the merged tree

- **State:** merged into master, `npm test` 776/776 + build green
  post-merge (supervisor-verified). New: `docs/faint-switch-notes.md`
  §8, `tools/extract/extract-battle-anim-item-heal.ts` +
  `src/assets/gen/battle-anim-item-heal.json`, probe specs + twice-run
  outputs. No engine changes.
- **Did:** (gap 2) ball prop: slot 7, created 6727, static (176,64),
  lifetime 6727-6756, reuses extracted ball-open gfx — no arc, no new
  asset. (gap 3) materialize tint: bit-for-bit the same
  `MATERIALIZE_TINT_COLOR` + 15-tick ramp as Grovyle's send-out,
  re-anchored (hold 24, ramp 15). (gap 4) particle burst x2/y2 verified
  400/400 exact vs the ALREADY-IMPLEMENTED gbaSin/gbaCos formula; count
  corrected 13→16 (3 reused freed slots the earlier scan missed).
  (gap 5) healthbox slide-in: same sprite slot throughout; old box goes
  invisible in lockstep with the sink destroy tick (no slide-out);
  new box = the identical 23-step linear slide-in from send-out.
  (gap 1) Sitrus sparkle extracted BYTE-EXACT (0/115px); ring extracted
  + source-cited but NOT pixel-verified — which affine-anim table
  (`cmds1`/`cmds2`) applies is the one remaining unknown (§8a), a 2-way
  choice slice L can settle by direct oracle diff.
- **Next:** slice L (the switch-in window, tick 6588 → settled menu vs
  PIDGEOTTO ~7256) has every formula/asset it needs; the ring affine
  choice is its only in-flight unknown.
- **Notes:** no new papercuts (known ram-probe bitfield gap worked
  around as documented).


## 177 — Bounded worker: S7 slice K — turn 5's ROCK_SLIDE (Grovyle 1→0, the faint), the faint sink, the button-gated KO hold, and "Foe GROVYLE fainted!", landed green, ending BEFORE "DESTIN sent out PIDGEOTTO!"; `turn5-rockslide.json` (new) **256/256**, `turn5-faint.json` (new) **110/110**, both 0 diff, `npm test` **776/776** (+8), build green, zero regressions

- **State:** `npm test` 776/776, `npm run build` green, tree clean.
  `turn5-rockslide.json` (kickoff/shake/rocks/hit-flash/drain, tick
  6222-6477) **256/256**, `turn5-faint.json` (pre-sink hold tail through
  the sink, healthbox vanish, fainted text, cursor, the real KO-dismiss `A`
  press, and 26 post-press static ticks, tick 6478-6587) **110/110**, both
  0 diff. Full regression sweep at exact prior counts, all 0 diff:
  `turn5-endeavor` 254/254, `turn5-menu` 41/41, `turn4-rockslide` 250/250,
  `turn4-doubleteam` 249/249, `turn3-rockslide` 256/256, `turn1-rockslide`
  256/256, `fight-submenu` 235/235, `turn3-endeavor` 192/192, `turn3-menu`
  254/254, `turn2-endeavor-drain` 201/201, `turn4-menu` 44/44, `turn2-
  dragonbreath` 237/237, `turn1-cloneanim` 230/230, `menu-idle` 69/69,
  `turn2-endeavor` 77/77, plus `sendout.json` **255/256** (unchanged - the
  pre-existing named tick-1496 particle-color residual, untouched).
- **Did:** RAM/pixel-probed turn 5's own ROCK_SLIDE window first (dense
  oracle sweeps, no new committed probe traces needed - reused the
  already-committed groundtruth). Parameterized turn 3's own ROCK_SLIDE
  mechanism unchanged (synthetic anchor `TURN5_ROCKSLIDE_PRESS_TICK=5829`,
  cross-confirmed two independent ways: the kickoff-text hard-cut pixel
  tick AND the drain formula's own raw-hp-field-write prediction both land
  on 6429 exactly). Implemented the faint sink as THE FORMULA (§7a's closed
  form: `grovyleFaintSinkRowsAndY2`, handoff S=6502, n=8, +1 render lag),
  not a table - pinned against every one of the 8 RAM-confirmed step ticks.
  Re-probed (not assumed) and answered the brief's own "what happens to
  Grovyle's healthbox" question: it vanishes entirely at S+19=6521, a fact
  not itemized anywhere in the prior dossier. Implemented the KO-text
  button gate as real state (`BattleSceneState.turn5KoDismissElapsed`,
  `sendOutPressElapsed`'s own "created directly" idiom) - `core.ts`'s
  `tick()` has no auto-advance timer that could fire past this point, so
  "hold indefinitely" falls out of the state machine's own shape rather
  than a bolted-on freeze check; both branches (idle-forever, A-advances)
  Tier-1-pinned. Found and fixed two real bugs the naive intro-cursor reuse
  would have shipped wrong, both pixel-confirmed via `npm run compare`
  before committing: the wait-cursor's X position is text-width-relative
  (`LINE2_ORIGIN.x + measureText(...line2)`), not the fixed `CURSOR_DEST_X`
  the S6 intro's own case coincidentally matches; and this cursor's own
  bounce is a one-shot climb-then-hold (0→1→2 over 9-tick steps, then flat
  through this trace's own stopping tick), not `cursorState`'s perpetual
  4-phase loop - both generalized as real parameters on `cursorState`/
  `drawCursor` rather than a second copy-pasted mechanism, S6 intro
  behavior re-verified byte-exact (`sendout.json`, `s6-acceptance.json`
  unaffected). The opponent's own EMPTY healthbox bar (Grovyle's hp=0) is
  oracle-exercised for the first time - `calcBarFilledPixels`'s existing
  general formula already renders it correctly, zero compositor changes,
  confirmed via `npm run compare` not assumed. Added 8 Tier-1 pins: 3 sink-
  formula (all 8 RAM steps + before/after-destroy boundaries), 1
  eligibility-boundary, 2 KO-gate state-machine (both branches), 1 early-
  press-dropped, 1 empty-bar `composeOpponentHealthbox` pin (mirrors the
  existing hp=1/117 player-side pin). Docs: new §24 in
  `docs/battle-turn-notes.md`.
- **Next:** the switch-in tail (tick 6588 on - party-icon-bar re-trigger,
  DESTIN's own "sent out PIDGEOTTO!" text at 6687, ball-throw/materialize
  reusing `GROVYLE_STRETCH_TABLE` per §7b, healthbox slide-in, Onix's own
  Sitrus proc per §2's exact formula, the next settled menu) is the
  immediate next slice - ground truth already substantially banked in
  `docs/faint-switch-notes.md` §3/§6/§7.
- **Notes:** no new papercuts this session.

---
## 176 — Worktree scout (supervisor-folded): switch-in formula verification — faint sink PINNED as a closed form (source+RAM agree tick-for-tick), materialize stretch is a BYTE-EXACT re-anchored reuse of `GROVYLE_STRETCH_TABLE` (41/41), Sitrus = 2 sprites (`ANIM_TAG_THIN_RING`/`ANIM_TAG_SPARKLE_2`, gfx confirmed unextracted); merged `4fd6489`, suite 768/768 on the merged tree

- **State:** merged into master, `npm test` 768/768 + build green
  post-merge (supervisor-verified; sink formula re-checked vs
  `battle_main.c:2783` by supervisor). New: `docs/faint-switch-notes.md`
  §7 + 2 probe specs with twice-run outputs. No engine changes.
- **Did:** (1) faint sink closed form: handoff at 6502, `n = 8 -
  floor(yOffset/8)` erase steps at `S+1,S+3,…,S+2n-1` (`y2` 8→64),
  destroy at `S+2n+1` = 6519 — matches §3a pixel evidence tick-for-tick.
  (2) Pidgeotto's materialize stretch geometry = `GROVYLE_STRETCH_TABLE`/
  `_EARLY_TABLE` verbatim, re-anchored 1503→6791 — no new table needed.
  Open-particle burst shape confirmed (13 sprites, 1-tick stagger,
  26-tick life) but its radial motion formula was not captured. (3)
  Sitrus effect: exactly 2 sprites, cross-checked vs
  `General_HeldItemEffect`'s two `loadspritegfx` calls; gfx genuinely
  unextracted (checked, not assumed).
- **Next (slice L's named gaps):** thrown-ball prop sprite identity/
  table; materialize palette tint RAM confirmation; particle burst
  motion formula; Sitrus ring+sparkle gfx extraction; healthbox
  slide-in ramps (not reached). Slice K (ROCK_SLIDE→faint→gate→fainted
  text) needs NONE of these.
- **Notes:** worker PAPERCUT (ram-probe.py path vocab can't shift/mask
  sub-byte bitfields — blocked the tint check) recorded in PAPERCUTS.md.

---
## 175 — Bounded worker: S7 slice J — turn 5's FIGHT-submenu reopen + Grovyle's ENDEAVOR (Onix 88→1), landed green, ending BEFORE Onix's own ROCK_SLIDE kickoff; `turn5-menu.json` (new) **41/41**, `turn5-endeavor.json` (new) **254/254**, both 0 diff, `npm test` **768/768** (+7), build green, zero regressions

- **State:** `npm test` 768/768, `npm run build` green, tree clean.
  `turn5-menu.json` (reopen 5926→confirm-wait through tick 5967, 41 dense
  captures, tick 5927 excluded) and `turn5-endeavor.json` (kickoff text 5968
  through the safe boundary 6221, 254 dense captures) both **0 diff**. Full
  regression sweep at exact prior counts, all 0 diff: `turn4-rockslide`
  250/250, `turn4-doubleteam` 249/249, `turn3-endeavor` 192/192, `turn3-menu`
  254/254, `turn2-endeavor-drain` 201/201, `fight-submenu` 235/235, plus
  `turn4-menu` 44/44, `turn3-rockslide` 256/256, `turn2-dragonbreath`
  237/237, `turn1-rockslide` 256/256, `turn1-cloneanim` 230/230, `menu-idle`
  69/69, `turn2-endeavor` 77/77.
- **Did:** RAM-probed turn 5's own window first (`tools/probe/ram-probe.py`,
  `tools/probe/specs/turn5-endeavor-watch.json`) to nail real anchors before
  touching render code: `TURN5_CONFIRM_PRESS_TICK=5959` (real press, +6 to
  `gCurrentMove`->283 matching every prior turn), `gBattleMovePower`==75 for
  the ENTIRE window (turn 4's own ROCK_SLIDE, stale) confirming the residual-
  cleanup slice's own turn-5 shake prediction (symmetric 3/3) FOR REAL
  against oracle pixels for the first time, `gBattleMons[0].hp` 88->1 at RAM
  tick 6201. Added `BattleSceneState.turn4Resolved` + a `core.ts` reopen
  branch gated on the newly-exported `TURN4_ROCKSLIDE_MENU_REDRAW_DELAY`
  (directly usable — turn 4's own ROCK_SLIDE was already real-press-
  anchored, no synthetic-anchor arithmetic needed unlike slice I's own
  gate). Threaded `turn4Resolved` one epoch further through every render
  dispatch tier (`drawMenuIdleBaseWithOpponentHp`/`drawActionMenuIdleContent`/
  `drawActionMenuIdleWindow`/`drawFightSubmenuWindow`/`drawFightSubmenuChrome`/
  `currentPPForActiveMon`) — zero new render mechanisms, pure parameterize-
  don't-rebuild. New `drawTurn5EndeavorText` reuses `drawEndeavorSquish`/
  `endeavorOnixHp` unchanged. Grid-searched `turn5KickoffBounceTick`'s frozen
  plateau (`d` in `[-4..4]`, center 0) against a live oracle diff. One named
  single-tick residual (5927, 769px, Onix silhouette) — tested and RULED OUT
  a uniform `-1` shift (fixes 5927 but breaks 3 other ticks), so excluded per
  this run's "characterize, don't force-fit" rule, same class as this
  dossier's other redraw-extremum residuals. Dense-swept 6014-6249 to find
  the safe stopping boundary: 0 diff through tick 6221, hard-cut to Onix's
  own ROCK_SLIDE kickoff at 6222 (out of scope) — confirmed the exact
  boundary rather than guessing. The player healthbox's green→yellow→red
  bands + the hp=1 "never fully empty" sliver rule (ISSUES #16's own "never
  oracle-exercised on the player side" gap) needed ZERO compositor changes —
  verified exact across the whole 88→1 drain. Added 7 Tier-1 pins: reopen/
  confirm replay, reopen-gate-still-closed, PP 7/10, two ENDEAVOR-window
  determinism/smoke checks, `endeavorOnixHp` with the real 88→1 numbers, and
  the player-healthbox hp=1 red-sliver pin (`calcBarFilledPixels`/
  `pickHpBarBand`/tile content). Docs: new `docs/battle-turn-notes.md` §23
  (anchors, the shake-prediction verdict, the residual-tick investigation,
  the band/sliver findings).
- **Next:** Onix's own ROCK_SLIDE (tick 6222 onward — hitting Grovyle, 1→0,
  the faint itself) through DESTIN's forced Pidgeotto switch-in and the next
  settled menu is the immediate next slice — ground truth already fully
  banked in §13 (the button-gated KO-text finding, Onix's own Sitrus Berry
  proc, DESTIN's non-sequential switch-in pick). Tick 4934's and this
  slice's own tick-5927 residuals remain a different, still-open class.
- **Notes:** no new papercuts. `git status`/stash discipline held; no
  mid-experiment checkouts; scratch probe traces (uncommitted) deleted
  after use, only the named committed traces + RAM-probe spec/dump kept.

---
## 174 — Bounded worker: S7 residual-cleanup slice — Family A (stale shake power) + Family B (turn-3 bounce phase) both APPLIED; `turn3-endeavor.json` **192/192**, `turn3-menu.json` **254/254**, both 0 diff, all 16 excluded ticks restored, `npm test` **761/761** (+5), build green, zero regressions

- **State:** `npm test` 761/761, `npm run build` green, tree clean.
  `turn3-endeavor.json` **192/192** (12 shake ticks restored: 3958/3959/
  3962/3963/3966/3967/3984/3985/3988/3989/3992/3993). `turn3-menu.json`
  **254/254** (3879/3888 restored, 3861/3870 added as the predicted-but-
  never-captured crossings). Full regression sweep at exact prior counts,
  all 0 diff: `turn4-menu` 44/44, `turn4-doubleteam` 249/249, `turn4-
  rockslide` 250/250, `turn3-rockslide` 256/256, `turn2-dragonbreath`
  237/237, `turn2-endeavor-drain` 201/201, `turn2-endeavor` 77/77, `fight-
  submenu` 235/235, `battle1-fight-submenu-idle` (groundtruth) 256/256,
  `turn1-rockslide` 256/256, `turn1-cloneanim` 230/230, `menu-idle` 69/69.
- **Did:** implemented both already-root-caused (#171/#173) fixes as
  faithful, general rules — no re-derivation, per the brief. **Family A**
  (`src/engine/battleScene.ts`): replaced the literal `ENDEAVOR_SHAKE_STEP`
  constant with `endeavorShakeSteps(stalePower)` (the source-derived
  `downStep=amp/2`/`upStep=downStep+(amp&1)` formula), threaded a new
  `stalePower` param through `endeavorShakeX2`/`drawEndeavorSquish` from
  each ENDEAVOR call site — turn 2 passes `ROCK_SLIDE_MOVE_POWER=75`
  (unchanged, still symmetric 3/3), turn 3 passes
  `DRAGON_BREATH_MOVE_POWER=60` (now asymmetric 2/3, matching the RAM-
  proven mechanism). **Family B**: `turn3SubmenuBounceTick` now subtracts
  one additional tick (`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT - 1`), scoped to
  this composition only — `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` itself is
  untouched, so turn 2's own reopen windows (proven correctly calibrated)
  are unaffected. Both fixes verified 0 diff via `npm run compare` before
  and after restoring/adding the excluded ticks. Added 5 Tier-1 pins:
  `endeavorShakeSteps` against all three RAM-confirmed data points
  (75→3/3 ×2 including the turn-5 prediction, 60→2/3) plus clamp bounds;
  `turn3SubmenuBounceTick`+`menuIdleBounce` against the committed RAM
  pointer-chase dump (`src/data/gen/turn3-menu-bouncer-raw-probe.json`,
  38+38 region-ticks, zero exceptions) plus the two named residuals
  individually. Docs: both families marked RESOLVED in
  `docs/turn3-residual-probe-notes.md` (short subsection each); one-line
  correction notes added to `docs/battle-turn-notes.md` §19/§20 pointing
  at the resolution, history left intact.
- **Next:** turn 5's own reopen (input tick 5926) is the natural next
  engine slice — it inherits both fixes for free (Family A predicts
  symmetric 3/3 again, stale 75 from turn 4's own ROCK_SLIDE, now pinned)
  and the faint/switch-in ground truth §3-§6 already banked. Tick 4934's
  excluded redraw-extremum is a different, still-open residual class (out
  of this slice's scope).
- **Notes:** no new papercuts.

---
## 173 — Worktree probe (supervisor-folded): Family B (menu-idle ticks 3879/3888) ROOT-CAUSED — no hardware quirk; the engine's turn-3 reopened-submenu bounce composition is uniformly ONE RAM tick ahead of the real invisible bouncer's `sSinIndex`, visible only at sine-plateau crossings; merged `42b26f9`, suite 756/756 on the merged tree

- **State:** merged into master, `npm test` 756/756 + build green
  post-merge (supervisor-verified; verification script re-run in the
  worktree by supervisor — all 5 checks PASS). New: multi-hop `"path"`
  support in `tools/probe/ram-probe.py` (backward-compat verified),
  `tools/probe/verify-turn3-menu-bounce-rule.py`, probe spec + twice-run
  dump, `docs/turn3-residual-probe-notes.md` "Family B, continued".
- **Did:** pointer-chase (`gBattleSpritesDataPtr` → `healthBoxesData[0]`
  → bouncer sprite ids → `gSprites[].data[]`) proves the bouncer's
  `sSinIndex` ticks a perfectly uniform +7/tick (both regions, 41 ticks,
  zero exceptions) with plain read-before-increment sampling
  (`battle_main.c:2967-2979`). `model(t) == real_screen(t+1)` holds with
  ZERO violations: a constant miscalibration, masked on shared plateaus,
  visible exactly at crossings — 3861/3870/3879/3888 in this window.
  OVERTURNS §19's "hardware quirk at a bounce extremum" reading. The
  earlier "1-tick shift ruled out" test had shifted the WRONG WAY
  (2→1 advances further); the corrective direction is 2→3 for this
  composition. Caveat flagged: predicted mismatches at 3861 (onix) and
  3870 (healthbox) are NOT in captureFrames — the fix slice must add
  them alongside restoring 3879/3888.
- **Next:** one small main-lane cleanup slice applies Family A's
  stale-power shake rule + Family B's phase correction and restores all
  16 excluded ticks (12 shake + 3879/3888 + 3861/3870); then turn 5.
- **Notes:** no new papercuts.

---
## 172 — Bounded worker retry: S7 slice I-2 — the turn-4 clone-window residual ROOT-CAUSED and FIXED (2 real bugs, not the bounce/HP candidates §22 suspected); `turn4-doubleteam.json` (new) **249/249**, `turn4-rockslide.json` (new) **250/250**, `npm test` **756/756** (+3), build green, zero regressions

- **State:** `npm test` 756/756, `npm run build` green, tree clean. New
  `tools/compare/traces/turn4-doubleteam.json` (kickoff text/clone/banner/
  stat-rose-text, ticks 4934→5317, 249 captures, dense over every actively-
  changing window + strided over the provably-static holds) and `turn4-
  rockslide.json` (ticks 5318→5925, 250 captures, dense at every boundary +
  stride-2 through the shake/rock-fall midsection — the 256-capture service
  ceiling forced that one compromise, noted honestly rather than silently)
  are both **0 diff**, one tick (4934) excluded with restated §22-style
  evidence (13292px, both neighbors exact, same "redraw extremum" family as
  3337/3465/3721/3879/3888). Zero regressions at exact prior counts:
  `turn4-menu` 44/44, `turn3-rockslide` 256/256, `turn3-endeavor` 180/180,
  `turn1-cloneanim` 230/230, `turn1-rockslide` 256/256, `turn2-dragonbreath`
  237/237.
- **Did:** followed the brief's mandated autopsy order instead of re-fitting
  pixel formulas. (1) Diffed app-vs-oracle at tick 4978 directly: pixels
  showed a clean "app(x) == oracle(x+1)" substitution, not noise. (2) Diffed
  turn 1's oracle (tick 1972, the same `n=8` into DOUBLE_TEAM's clone motion)
  against turn 4's oracle (tick 4978) directly — genuinely DIFFERENT
  real-hardware pixels at the identical `n`, AND turn 4's *app* matched
  turn 1's *oracle* exactly — proof the code was faithfully reproducing
  turn 1's mechanism while turn 4's real hardware does something else. (3)
  RAM-probed the actual clone sprites (`gSprites[3]`/`gSprites[4]`, found by
  scanning all 64 slots' callback pointers): `x2`/`data[]` progressions are
  BIT-IDENTICAL to the model at matching `n` — the offset formula was never
  wrong. RAM-probed `BLDCNT`/`BLDALPHA`/BG scroll registers: also identical
  both turns. RAM-probed Grovyle's own front-sprite palette (`gPlttBuffer
  {Unfaded,Faded}`): also byte-identical both turns. Then RAM-probed
  `sSpriteOrder` (`0x020217F4`, the same static array `rockSlideDrawOrder`
  already uses) at both turns' analogous ticks — **found it**: the two
  clones tie exactly on `SortSprites`' key (`oam.priority`/`subpriority`/
  `oam.y` all raw-copied identical via `CloneBattlerSpriteWithBlend`), and
  the tie-break (whichever's earlier in the persistent, history-dependent
  `sSpriteOrder`) is B-before-A for turn 1 but A-before-B for turn 4 — same
  two slots (3/4) both times, opposite order. Fixed via a new `frontClone`
  param on `drawDoubleTeamClones` (RAM-verified per turn, NOT a general
  `SortSprites` simulation — scoped honestly in the code comment, since
  unlike the rock-stacking fix these two sprites only ever tie against each
  other, once per turn). (4) Sweeping the full window past this fix (stride-
  1, 4934-5925) surfaced a SECOND, unrelated bug: `drawTurn4RockSlideWindow`
  never wired in the "Foe GROVYLE's evasiveness\nrose!" text phase turn 1's
  own `drawRockSlideWindow` already has — it jumped straight to the
  ROCK_SLIDE line 265 ticks early. Ported the same three-phase text gate
  (`TURN_KICKOFF`→`STAT_ROSE`→`ROCK_SLIDE`, `statRoseTextStartTick`/
  `rockSlideTextStartTick`, both already generic `pressTick`-parameterized
  functions) — closed it outright, 250/250. Grovyle's 41→1 drain (the first
  turn to cross the healthbox's yellow/red HP bands, ISSUES #16's own "never
  oracle-exercised" note) needed ZERO new compositor code — bands render
  correctly already. Added 3 Tier-1 pins: the two pixel fixes (clone
  z-order at (191/192,17)/t4978, stat-rose text at (16/17,124)/t5210) plus
  `rockSlideOpponentHp`'s real 41→1 numbers.
- **Next:** the ENTIRE turn-4 window (4934-5925) is now committed and
  verified — S7 slice I is fully closed. Turn 5's own reopen (input tick
  5926) is the natural next engine slice; it inherits the Family A stale-
  shake fix #171 already root-caused (predicts turn 5's ENDEAVOR shake is
  symmetric, stale 75 from turn 4's ROCK_SLIDE) and the faint/switch-in
  ground truth §3-§6 already banked.
- **Notes:** none — no papercuts this session; `git status`/stash discipline
  held throughout (no mid-experiment checkouts).

---

## 171 — Worktree probe (supervisor-folded): slice G's 12-tick shake asymmetry ROOT-CAUSED (stale `gBattleMovePower` drives shake amplitude — 75→±3, 60→+3/-2, source formula reproduces BOTH turns); menu-idle ticks 3879/3888 localized but need a pointer-chase probe; merged `e8edc8d`, suite 753/753 on the merged tree

- **State:** merged into master, `npm test` 753/753 + build green
  post-merge (supervisor-verified). New: `docs/turn3-residual-probe-notes.md`,
  probe specs + twice-run outputs under `tools/probe/specs/` /
  `src/data/gen/`. No engine changes (by design — mechanism only).
- **Did:** (Family A, §20's 12 excluded ticks) `AnimTask_ShakeTargetBased
  OnMovePowerOrDmg` reads `gAnimMovePower` = stale `gBattleMovePower`,
  written ONLY by `CalculateBaseDamage` — ENDEAVOR never calls it. Turn
  2's shake inherited 75 (turn 1's ROCK_SLIDE) → 75/12=6 even → ±3; turn
  3's inherited 60 (turn 2's DRAGON_BREATH) → 60/12=5 odd → down=2/up=3.
  Supervisor re-verified the formula at `battle_anim_mon_movement.c:
  971-998`. Predicts turn 5's ENDEAVOR shake is symmetric again (stale
  75 from turn 4's ROCK_SLIDE). READY for a small engine fix (stale-power
  state + restore the 12 ticks). (Family B, ticks 3879/3888) render=
  RAM+1 confirmed; at both ticks the model's bounce-`y2` plateau
  transition leads real hardware by exactly 1 tick; constant-offset fix
  RULED OUT (breaks 3 passing ticks). Root cause needs the bouncer
  sprite's raw `sSinIndex`/task state behind `gBattleSpritesDataPtr->
  healthBoxesData[]` — a pointer-chase not reached.
- **Next:** fold the Family A fix into the next shake-touching engine
  slice (turn 5 needs the rule anyway); Family B pointer-chase probe is
  a clean 30-45 min worktree step.
- **Notes:** worker PAPERCUT (ram-probe.py spews mGBA logs to stdout,
  docstring implies stderr) recorded in PAPERCUTS.md by supervisor.

---
## 170 — Bounded worker: S7 slice I — turn 4's FIGHT-submenu reopen landed green (44/44, 0 diff); the DOUBLE_TEAM/ROCK_SLIDE resolution itself does NOT land — a real uncracked pixel residual, not a scope choice

- **State:** `npm test` **753/753** (+4), `npm run build` green, tree
  clean. New `tools/compare/traces/turn4-menu.json` (extends `turn3-
  rockslide.json`'s own 4890-frame prefix with the groundtruth trace's own
  turn-4 reopen+confirm presses verbatim, through tick 4933, 44 dense
  captures) is **44/44, 0 diff**. Zero regressions, exact prior counts:
  `turn3-rockslide` 256/256, `turn3-endeavor` 180/180, `turn3-menu` 250/250,
  `turn1-cloneanim` 230/230, `turn1-rockslide` 256/256, `turn2-dragonbreath`
  237/237.
- **Did:** New `BattleSceneState.turn3Resolved` + `core.ts` reopen gate
  (`TURN3_ROCKSLIDE_REOPEN_GATE_DELAY=465`, derived from turn 3's own
  synthetic-vs-real press-tick anchors' difference) — cursor stays at 0
  (ROCK_SLIDE, no nav needed, §13's own finding), PP reads 8/10
  (`currentPPForActiveMon` gained a `turn3Resolved` param, a second
  independent slot-0 decrement). Wrote (but could NOT pixel-verify) the
  DOUBLE_TEAM+banner+ROCK_SLIDE resolution itself, parameterizing turn 1's
  own mechanism with a REAL press tick (`TURN4_CONFIRM_PRESS_TICK=4925` —
  unlike turn 3, no synthetic anchor needed since turn 4's preceding move IS
  DOUBLE_TEAM again, same as turn 1). Six independent RAM/pixel anchors
  (`gCurrentMove` flip, evasion stage, accuracy/crit/damage rolls, ROCK_SLIDE
  kickoff-text tick, HP field update) all landed EXACTLY where turn 1's own
  unchanged formulas predict — strong evidence for zero-code-change reuse —
  **but a live oracle diff still shows a real, unexplained ~2% residual
  inside the clone-animation window** (728px, `x=145-205,y=17-70`, the
  Grovyle sprite region — confirmed NOT bounce-related: invariant across the
  entire bounce-tick grid-search plateau that fixed the confirm-wait
  window's own separate bounce bug). Per this run's "never commit red" rule,
  did not commit that window or the ROCK_SLIDE window (untested downstream
  of the same unresolved issue) — only the reopen/confirm-registration
  prefix, which IS fully verified.
- **Next:** RAM-probe `BLDALPHA`/`BLDCNT`/the palette buffer directly at
  the clone-window residual (tick 4978) before re-sweeping pixel formulas
  blind — root-causing that is the hard blocker for the rest of turn 4.
  Full writeup + every anchor/number: `docs/battle-turn-notes.md` §22.
- **Notes:** mid-session accident — a scratch grid-search loop's own `git
  checkout -- src/engine/battleScene.ts` (meant to revert a throwaway
  experiment) wiped that file's real uncommitted edits too, since nothing
  had been committed yet. Recovered by re-applying the same edits from
  memory (verified via fresh `tsc`/`npm test`), but cost real time —
  PAPERCUT: never `git checkout` a file mid-experiment without committing
  or stashing real work first, ~15 min lost.

---
## 169 — Worktree scout (supervisor-folded): switch-in window fully itemized + Pidgeotto front sprite verified byte-exact (0/1087) — the faint engine slice now has complete pinned ground truth; merged `18c7bbd`, suite 749/749 on the merged tree

- **State:** merged into master, `npm test` 749/749 + build green
  post-merge (supervisor-verified). New: 4 dense stride-1 groundtruth
  traces (`battle1-switchin-dense-{a,b,c,d}.json`, ticks 6350-7312,
  twice-run/0 sha mismatches), `docs/faint-switch-notes.md` §3-§6.
- **Did:** (goal 1) Pidgeotto's front pic was ALREADY extracted (S6
  groundwork `38f687c`; #167's "not extracted" claim was a stale false
  negative) — verified byte-exact vs a fresh oracle capture, and the
  corner formula generalizes: `(144, 8 + gMonFrontPicCoords[species]
  .yOffset)`, 2 species cross-checked. (goal 2) Full frame-accurate
  itemization: hit-flicker → erase-and-sink faint (source-cited
  `SpriteCB_FaintOpponentMon`, NOT fade/dissolve) → text phases →
  party-summary-bar re-trigger → ball throw/tinted materialize →
  healthbox slide-in → Sitrus proc text+heal-bar. CORRECTS §13: real
  animation plays inside the "frozen 6429-6560" window, and the menu
  visually settles ~7250-7256, not 7215. (goal 3) §6 grades each element
  reused-verbatim / similar-unverified / genuinely-new (faint-sink and
  Sitrus sparkle are new; ball/materialize not formula-verified).
- **Next:** turn 4 engine slice is in flight (main lane); after it, the
  turn-5 + faint/switch-in engine slice implements directly against
  §3-§6 + §13.
- **Notes:** worker PAPERCUT (contact-sheet row-slicing desync) recorded
  in PAPERCUTS.md by supervisor.

---

## 168 — Bounded worker: S7 slice H — turn 3's ROCK_SLIDE resolution (the turn's second half) landed by PARAMETERIZING turn 1's own ROCK_SLIDE mechanism with ZERO code changes; `turn3-rockslide.json` (new) **256/256, 0 diff**, `npm test` **749/749** (+3), build green, zero regressions

- **State:** `npm test` 749/749, `npm run build` green, tree clean.
  New `tools/compare/traces/turn3-rockslide.json` (`turn3-endeavor.json`'s
  own button script, idle frames extended to 4890 total, dense stride-1
  over the kickoff/shake/rocks/hit-flash/drain/text-clear/redraw transient
  + light stride over the rock settle-wobble tail/settled plateau, 256
  captures) is **256/256, 0 diff**. This session ALSO validated the full
  window at full stride-1 density across four unbudgeted scratch
  `npm run compare` passes (4080-4891, every single tick) before settling
  on the committed 256-capture subset — 0 diff on all 812 extra probed
  ticks too. Full regression sweep re-verified at exact prior counts:
  `turn3-endeavor` **180/180**, `turn3-menu` **250/250**, `turn1-rockslide`
  **256/256**, `turn1-drain` **102/102**, `turn2-dragonbreath` **237/237**,
  `turn2-endeavor-drain` **201/201**.
- **Did:** Extended `drawTurn3EndeavorText` (slice G's own ENDEAVOR-half
  function) to hand off into a new `drawTurn3RockSlideWindow` once ROCK_
  SLIDE's own kickoff text hard-cuts the message box (tick 4080, slice G's
  own pixel-confirmed boundary) — same handoff shape `drawTurn2KickoffText`
  already established for DRAGON_BREATH. ROCK_SLIDE is the SAME move/same
  target (Grovyle) turn 1 already modeled end-to-end, so every one of turn
  1's own mechanism functions (`rockSlideBg3Y`/`rockSlideRockState`/
  `rockSlideDrawOrder`/`rockSlideMonShakeY2`/`rockSlideHealthboxWobbleY2`/
  `rockSlideMonBlinkInvisible`/`rockSlideOpponentHp`) is reused with **ZERO
  code changes** — only a new synthetic press-tick anchor (`TURN3_ROCKSLIDE_
  PRESS_TICK=3687`, chosen so `rockSlideTextStartTick` lands on 4080) plus
  two new turn-3-specific delay constants for the post-drain RNG-cost tail
  (`TURN3_ROCKSLIDE_TEXT_CLEAR_DELAY=662`/`MENU_REDRAW_DELAY=669`, both
  exactly +5 past turn 1's own constants — fully explained by the bigger
  HP-drain diff, 47 vs 42, not a new mechanism; verified via §13's own
  turn-3 RNG ledger matching turn 1's v5 correction table tick-for-tick
  relative to each turn's own hp-field-update). Directly checked (not
  assumed) the brief's own OAM-slot-state caution: fresh `dump-rockslide-
  slot-order.py` run shows turn 3's own baseline-slot occupancy matches
  turn 1's `ROCK_SLIDE_BASELINE_SLOTS` 9/9 exact, and while the raw
  `sSpriteOrder` seed differs in 9/64 positions, all 9 are free filler
  slots that a full single-pass `SortSprites` re-sort makes unobservable —
  confirmed empirically by the 0-diff sweep above, not just argued. New
  anchor `anchorOpponentAfterTurn3Hp` (41, Grovyle's post-ROCK_SLIDE HP).
  Full writeup: `docs/battle-turn-notes.md` §21.
- **Next:** Turn 4 entirely (menu-reopen input at tick 4892, DOUBLE_TEAM
  instead of a third ENDEAVOR — ground truth banked §13) is the immediate
  next slice. Slice G's own 12-tick shake-asymmetry exclusions and
  `turn3-menu.json`'s own 3879/3888 residuals remain untouched. ISSUES #23
  (fire projectiles) stays parked.
- **Notes:** no papercuts. The RAM-probe-first workflow (`ram-probe.py` +
  `dump-rockslide-sprites.py`/`dump-rockslide-slot-order.py`, all already
  committed, no new tooling needed) resolved every anchor before any pixel
  fitting, per slice G's own "mind the render lag, don't assume turn
  symmetry" lesson — paid off directly this time (the OAM-seed divergence
  the brief flagged as a real risk turned out to be provably inconsequential,
  not something a curve-fit would have caught cleanly).

---
## 167 — Worktree scout (supervisor-folded): faint/switch-in unknowns — the Pidgeotto-over-Murkrow AI rule SOURCE-TRACED + RAM-confirmed, the Sitrus heal formula PINNED exactly (flat +30, not a maxHP fraction); merged `7f4edcb`, suite 746/746 on the merged tree

- **State:** merged into master (`3be0276`), `npm test` 746/746 + build
  green post-merge (supervisor-verified). New: `docs/faint-switch-notes.md`,
  `tools/probe/dump-switch-decision.py` (twice-run byte-identical),
  `src/data/gen/battle1-grovyle-switch-decision.json`. No engine changes.
- **Did:** (§13 open item 1) `GetMostSuitableMonToSwitchInto`
  (`battle_ai_switch_items.c:629-790`) is a two-phase algorithm; phase 1's
  source-commented bug (scores the candidate taking the MOST damage from
  the opponent's own types) ties Murkrow/Pidgeotto 0-0 (both Flying,
  zeroed by Ground immunity) → falls to phase 2's damage fallback.
  Corrected a probe-docstring error: this opponent type's real party
  lives in `gFrontierTempParty`, not `rentalMons[3..5]`; banked Murkrow's
  first-ever RAM stat/moveset ground truth via a plaintext struct-offset
  read. Honestly flagged unresolved: phase 2's `AI_CalcDmg` reads a stale
  `gCurrentMove` (RAM-pinned to ROCK_SLIDE all decision window) and a
  naive hand-trace of that predicts the WRONG winner — needs stack-local
  tracing the oracle probes can't reach; do NOT model phase 2 from this
  dossier alone. (Item 5) Sitrus = `HOLD_EFFECT_RESTORE_HP`, flat
  `holdEffectParam=30`, gate `hp <= maxHP/2`, capped at maxHP
  (supervisor re-verified vs `items.h:1753`/`battle_util.c:3336`); 1+30=31
  exact, §13's floor(117/4) guess was the wrong generation's formula.
- **Next:** scout goals 1/4 NOT reached (time-boxed): the 6684-7215
  switch-in animation window is still un-itemized (dense pixels already
  committed in `battle1-grovyle-faint.json` — narrate from those), and
  **Pidgeotto's front sprite is NOT extracted** (`src/assets/gen/` has
  nothing for it) — hard prerequisite for the faint engine slice.
- **Notes:** supervisor also re-tested slice F's excluded ticks 3879/3888
  against the #22/#24 fixes directly — still DIFF (769px/1573px), NOT
  that family; §19's RAM-probe follow-up stands.

---
## 166 — Bounded worker: S7 slice G — turn 3's ENDEAVOR resolution (the turn's first half) landed by PARAMETERIZING turn 2's own mechanisms, not rebuilding; `turn3-endeavor.json` (new) **180/180**, `npm test` **746/746** (+2), build green, zero regressions

- **State:** `npm test` 746/746, `npm run build` green, tree clean.
  New `tools/compare/traces/turn3-endeavor.json` (`turn3-menu.json`'s own
  button script + 190 idle frames, through tick 4079) is **180/180**
  (192 dense captures minus 12 characterized shake-residual exclusions,
  see below). Full regression sweep re-verified at exact prior counts:
  `turn3-menu.json` **250/250**, `turn2-dragonbreath.json` **237/237**,
  `turn2-endeavor-drain.json` **201/201**, `turn2-endeavor.json` **77/77**,
  `fight-submenu.json` **235/235**.
- **Did:** Extended `core.ts`'s dispatch so turn 3's own confirm (cursor 0,
  ROCK_SLIDE selected by the player) still resolves Grovyle's ENDEAVOR
  first (speed order), reusing turn 2's own ENDEAVOR sub-mechanisms
  (kickoff text, squish/blend/droplets/hitsplat/healthbox-wobble/flicker —
  all already `pressTick`-relative, needed ZERO formula changes) —
  parameterized the two turn-2-hardcoded anchors (`drawEndeavorSquish`
  gained `opponentHp`/`kickoffBounceTick` params, `drawActionMenuIdleContent`
  gained an optional `playerHp` param) and wired a new `drawTurn3EndeavorText`
  + `turn3KickoffBounceTick`/`TURN3_KICKOFF_FROZEN_BOUNCE_TICK`. All anchors
  RAM/pixel-probed fresh, not assumed: `TURN3_CONFIRM_PRESS_TICK=3891`,
  kickoff text start 3900 (same `-1` reopened-submenu correction turn 2
  needed), HP drain 101→88 completing at tick 4057 (`ENDEAVOR_HP_DRAIN_
  START_DELAY=153` unchanged), window-safe boundary tick 4079 (ROCK_SLIDE's
  own kickoff text hard-cuts the message box at 4080). One genuine
  divergence found and NOT curve-fit: turn 3's own target-shake RAM reads
  asymmetric `+3/-2` (not turn 2's symmetric `±3`) — 12 ticks excluded,
  precisely characterized (px count, region, bbox) rather than chased.
  Full writeup: `docs/battle-turn-notes.md` §20.
- **Next:** the ROCK_SLIDE half of turn 3 (Onix's own move hitting Grovyle
  again, kickoff text starting sometime after tick 4080, ground truth
  banked §13) and the turn-4 menu reopen are the immediate next slice. The
  shake-asymmetry residual (§20) is a clean, scoped follow-up needing one
  RAM read (`gAnimMovePower` at ticks 3956-3966) before touching render
  code. ISSUES #23 (fire projectiles) stays parked.
- **Notes:** no papercuts. `tools/probe/ram-probe.py` (generic, already
  committed) was the right tool for the RAM-side anchors this session —
  no new probe script needed, unlike most prior ENDEAVOR-window sessions.

---
## 165 — Supervisor wind-down: session end 2026-07-20 ~02:45 — **12 verified worker steps** (9 main + 3 worktree, every one folded green); suite **685 → 744/744**; headline: **turn 2 is COMPLETE end to end** (`turn2-dragonbreath.json` 237/237) and **three long-standing residual families were root-caused and closed** (ISSUES #19, #22, #24 — all three were harvest/dispatch bugs, none was the timing mystery they looked like)

- **State (verified this minute):** `npm test` **744/744**, `npm run
  build` green, tree clean at `fe8015b`, no worktrees, no unmerged
  branches. Full acceptance sweep, supervisor-rerun:
  `turn2-endeavor-drain` **201/201**, `turn2-endeavor` **77/77**,
  `turn2-dragonbreath` **237/237**, `turn3-menu` **250/250**,
  `fight-submenu` **235/235**, `turn1-rockslide` 256/256,
  `battle1-fight-submenu-idle` **256/256**, `sendout` 255/256 (#18
  policy-settled), `s6-acceptance` 224/228 (#5/#18 policy-settled).
- **Session summary (supervised, ~22:10-02:45, 6 rounds):** S7's ENDEAVOR
  window CLOSED (tail 3061-3094: healthbox wobble + Onix flicker); the
  whole DRAGON_BREATH half built from scouted ground truth — kickoff
  text, `AnimTask_ShakeMon2`, both red-fade blends, Grovyle's HP drain,
  text-clear, turn-3 menu reopen, and the 3347-3846 tail (where a dense
  probe caught a live-bounce/HP-digit bug the reference stride would have
  missed); slice F opened turn 3 (the engine previously DEAD-ENDED after
  turn 2) at 250/250. ISSUES #20 closed (FIGHT submenu on the live
  FONT_NARROW pipeline) and S8's per-battle-moveset dependency closed
  (`battleSetup.ts`, KABUTO proven through the state machine). S8
  swap-screen assets extracted, 0 unexplained mismatches/1404 px.
- **The residual-family thread (the session's best result):** #19's
  root cause was an extractor bbox cropping a rare sine-peak state, NOT a
  timing model — which generated the supervisor hypothesis that the other
  named single-tick residuals shared that class. Confirmed: #22's 2135
  plus 3465/3721 were the SAME class on a different asset (Onix's own
  `y2=2` peak, never harvested); 3337 was already silently fixed. That
  fix then TRADED tick 2901 (supervisor caught this: the landing report
  called it an unrelated pre-existing bug, but re-adding 2901 reproduced
  a byte-identical 769px signature) → filed #24 → closed by a ONE-LINE
  missing dispatch arm (`turn1Resolved`), not the two-anchor model the
  brief predicted. Net: four ticks green simultaneously, +4 Tier-1 pins.
- **Next:** (1) S7's faint/forced-switch slice is the biggest open item —
  turn 3's move resolution, turns 4-5, the faint, the AI switch-in, SEND
  OUT (ground truth banked, §13/§14/§19; slice F is only its menu
  prefix); (2) ISSUES #23 (fire projectiles, PARKED by supervisor default
  after 4 attempts — reversible, findings fully banked); (3) S8 engine
  work is unblocked end to end; (4) S4's remainder stays deferred.
- **Notes:** no usage-limit events; worker cost ~$3.7-14/step, 10-40
  min/step, 12/12 landed or returned a clean named negative. One worker
  edited ROADMAP.md (supervisor-owned) — content was accurate status
  only, kept, boundary noted. One new PAPERCUTS entry (supervisor
  mid-worker commits on the shared tree).

---
## 164 — Bounded worker: ISSUES #24 CLOSED — the §8c "tick 2901 regression" was a missing dispatch arm in `drawActionMenuIdleWindow`'s bounce-tick selection, not a second asset bug; all four RAM-verified ticks (2901/2135/3465/3721) now correct simultaneously; `npm test` **744/744** (+4), build green, zero regressions

- **State:** `npm test` 744/744, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` **201/201** (was 200/200, tick 2901
  restored), `battle1-fight-submenu-idle.json` **256/256** (unchanged),
  `turn2-dragonbreath.json` **237/237** (unchanged). `fight-submenu.json`
  235/235, `turn3-menu.json` 250/250, `s6-acceptance.json` 224/228,
  `sendout.json` 255/256, `menu-idle.json` 69/69, `turn1-kickoff.json`
  81/81, `rent-3picks.json` 157/190, `rent-slot1.json` 125/139,
  `confirm-flow.json` 79/95 — all unchanged. Bonus: `turn2-endeavor.json`
  **77/77** (was 76/77, same one-line fix happens to cover it too).
- **Did:** ISSUES #24 asked to find the anchor that gets all 4 named
  ticks right simultaneously, RAM-grounded rather than grid-searched.
  Read `reference/pokeemerald/src/battle_main.c`'s real `DoBounceEffect`/
  `SpriteCB_BounceEffect`/`EndBounceEffect` mechanism first (confirms this
  file's existing "resettled" anchors — `rockSlideResettledBounceTick`/
  `turn2SubmenuBounceTick`/`turn3SubmenuBounceTick` — model a REAL
  per-turn reset, not a curve-fit), then replayed each trace's real button
  script through `core.ts`'s actual `tick()` (a scratch script, not hand
  derivation) to find exactly which render branch owns each of the 4
  ticks. Result: 2135/3465/3721 were ALREADY correct pre-session (their
  own formulas, `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` and
  `dragonBreathResettledBounceTick`, both unchanged by this fix — §8c's
  asset fix really was sufficient for those three). Tick 2901 sits in a
  DIFFERENT branch entirely: `drawActionMenuIdleWindow`'s open-DMA-wait
  hold, whose bounce-tick dispatch was `turn2Resolved ?
  turn3SubmenuBounceTick(t) : t` — missing the `turn1Resolved` arm
  entirely, so turn 2's OWN reopen (which per the source read above DOES
  inherit a reset bounce task) fell through to a plain, never-reset `t`.
  That formula is only correct for the very first, truly-never-reset
  epoch. One-line fix: add the missing arm, reusing
  `turn2SubmenuBounceTick` (already established, already verified
  elsewhere in this same window) — not a new anchor, not a magic offset.
  The "two different anchors" the brief's strong lead predicted turned out
  to be ONE anchor applied to a code path that had never been given the
  case at all. RAM-verified all 4 ticks pass now, restored 2901 to
  `turn2-endeavor-drain.json`'s `captureFrames`. New Tier-1 describe block
  (`tests/battleMenu.test.ts`, "ISSUES #24") pins the reachable
  `FightSubmenuState` + resulting `onixY2` at all 4 ticks against the
  RAM-probed truth, plus a regression guard proving the fix is scoped to
  tick 2901 alone (2902-2905 agree under both the old and new formula).
  Full writeup: `docs/battle-menu-notes.md` §8d.
- **Next:** faint/forced-switch is still the biggest remaining S7 item
  (§13-§14 ground truth already banked); S8 engine work is unblocked
  separately. ISSUES.md is now clean of the #22/#24 onix-bounce family.
- **Notes:** no papercuts. The `battle1-fight-submenu-idle.json` groundtruth
  trace (`tools/compare/traces-groundtruth/`) was re-run directly this
  session (not just inferred from the acceptance sweep) to get its own
  exact `FightSubmenuState` at tick 2135 — worth knowing this fixture is
  runnable the same way as the committed `tools/compare/traces/` ones.

---
## 163 — Bounded worker: ISSUES #22 ROOT-CAUSED AND CLOSED — same asset-harvest bug class as #19, but region A (onix), not region B (healthbox); also closed the two DRAGON_BREATH sine-peak residuals (3465/3721) named in E2b/E2b-2, plus tick 3337 turned out to already be fixed — one NEW single-tick residual surfaced and correctly scoped out (not fixed, different mechanism); `npm test` **740/740** (+8), build green

- **State:** `npm test` 740/740, `npm run build` green, tree clean.
  `battle1-fight-submenu-idle.json` **256/256** (was 255/256, ISSUES #22
  CLOSED). `turn2-dragonbreath.json` **237/237** (was 235/235, +3465/
  +3721). `turn2-endeavor-drain.json` **200/200** (was 201/201, −1 —
  see "Notes"). `fight-submenu.json` 235/235, `s6-acceptance.json`
  224/228, `sendout.json` 255/256 — all unchanged. Broader sweep
  unchanged: `menu-idle.json` 69/69, `turn1-kickoff.json` 81/81, `turn2-
  endeavor.json` 76/77, `turn3-menu.json` 250/250, `confirm-flow.json`
  79/95, `rent-3picks.json` 157/190, `rent-slot1.json` 125/139.
- **Did:** The brief's hypothesis (ISSUES #22's tick 2135 + DRAGON_BREATH's
  named ticks 3337/3465/3721 might be the same family as #19, a harvested
  asset with a bbox/state that excludes the sine table's rare peak) was
  **CONFIRMED for 3 of 4, for a second asset** — pixel-dumped all four:
  2135/3465/3721 share an EXACT bbox `(44,50)-(99,111)` and byte-identical
  color-transition histogram (769px each); tick 3337 turned out to
  already be fixed (0 diff — an apparent side effect of S7 slice E2b-2's
  earlier `yOffset` fix, never re-tested against that specific tick
  since it sits outside E2b-2's own rescan window). Root cause:
  `extract-menu-idle-window.ts` only ever harvested ONE onix-region patch
  (a `y2=1` tick) — `battleScene.ts` openly named the gap ("`onixY2>=1`
  degrades to the same y2=1 patch") rather than hiding it, but region A
  never got the y1/y2 split #19 already gave region B. Fixed in two
  stacked layers (same order #19's own derivation implies): (1) harvested
  a real `y2=2` patch (`ONIX_Y2_TICK=1877`, found via `onixSinIndex(n)
  mod 256 == 64`), renamed the shared type to `MenuIdleBounceTwoStateAsset`
  and factored the y1/y2 dispatch into one `drawTwoStateBounceRect`
  helper for both regions — closed 769px→3px; (2) `ONIX_BBOX` itself was
  ALSO 1 row short (height 62→63, rows 49-110→49-111) — the SAME bug #19
  found in region B's own bbox, stacked on top of layer 1's missing-patch
  bug. Both layers landed, all three ticks 0 diff. Full writeup:
  `docs/battle-menu-notes.md` §8c.
- **Next:** faint/forced-switch is still the biggest remaining S7 item
  (§13-§14 ground truth already banked); S8 engine work is unblocked
  separately. Whoever wants the NEW tick-2901 residual (see Notes) should
  RAM-probe the ONIX sprite's `sSinIndex`/bounce-task state directly at
  RAM tick 2900 during turn 2's own pre-confirm dwell.
- **Notes:** fixing #22 surfaced a DIFFERENT, previously-invisible bug:
  `turn2-endeavor-drain.json` tick 2901 (turn 2's own idle dwell, before
  the ENDEAVOR confirm) computes the correct `onixY2=2` via the closed
  form, but the REAL oracle pixels there match the `y1` patch, not `y2` —
  `drawActionMenuIdleWindow`'s "plain `t`" bounce-tick convention for this
  window (previously "oracle-confirmed fine," per its own doc comment)
  has its own unmodeled anchor error at the rare peak, invisible until
  now because the OLD always-degrade-to-y1 approximation coincidentally
  produced correct pixels here. Different mechanism (a bounce-tick anchor
  bug, not a harvest-asset bug) and out of this step's own scope (asset
  fixes only) — named tick 2901 excluded from `captureFrames`
  (`201→200`), not silently shipped wrong, dense neighbors (2894-2950)
  stay captured and green. No papercuts.

---
## 162 — Bounded worker: S7 slice F — turn 3's FIGHT-submenu reopen (cursor persistence, PP, bounce-anchor) landed; the faint itself and everything past it is honestly OUT of scope this session; `turn3-menu.json` (new) **250/250**, `npm test` **738/738** (+6), build green, zero regressions

- **State:** `npm test` 738/738, `npm run build` green, tree clean.
  New `tools/compare/traces/turn3-menu.json` (extends `turn2-dragonbreath
  .json`'s 3846-frame prefix verbatim, +50 frames through tick 3896) is
  **250/250** (two named single-tick residuals excluded, see below).
  Regressions re-confirmed: `turn2-dragonbreath.json` **235/235**,
  `turn2-endeavor-drain.json` **201/201**, `fight-submenu.json` **235/235**,
  plus a broader sweep (`turn1-drain`, `turn1-rockslide`, `turn1-kickoff`,
  `menu-idle`, `turn2-endeavor`, `sendout`, `s6-acceptance` all unchanged —
  the latter two's own pre-existing gaps, 224/228 and 255/256, untouched).
- **Did:** The engine only ever modeled turns 1-2 and then dead-ended: a
  fresh A-press on turn 2's own resettled menu did nothing (`core.ts`'s
  reopen-FIGHT branch was gated `!turn1Resolved`, one-shot by construction).
  Added a second boolean (`BattleSceneState.turn2Resolved`) and a new
  `core.ts` branch, same shape as turn 1→2's own gate, keyed off
  `DRAGONBREATH_MENU_REDRAW_DELAY` (now exported) having elapsed since turn
  2's own confirm. This is the FIRST reopen that genuinely exercises cursor
  persistence (§13: `gMoveSelectionCursor` reads 2, DRAGON_BREATH, at turn
  3's reopen — turn 1→2's own reopen coincidentally rested at slot 0 both
  times, so it never distinguished "always reset" from "persist"):
  `openFightSubmenu` gained an optional `initialCursor` param (default 0,
  every existing call site unaffected). Fixing this surfaced 3 real
  rendering gaps in shared, previously-turn-1/2-only code (never triggered
  before because no earlier state needed a battler's own HP to differ from
  the static harvest while ALSO dwelling in the FIGHT-submenu's *generic*
  idle/DMA-wait draw path): Grovyle's opponent-HP overlay was frozen at
  turn 1's end value (101, not turn 2's real 88); Onix's own HP overlay
  wasn't drawn AT ALL in the generic path (only turn-2-specific bespoke
  functions had it, each with their own manual overdraw); and the idle-
  bounce phase (`turn2SubmenuBounceTick`, anchored to turn 1's own confirm)
  is turn-2-specific — reusing it for turn 3 produced a 6.1%-of-frame
  whole-silhouette mismatch on every captured tick, fixed with a new
  `turn3SubmenuBounceTick`/`TURN2_CONFIRM_PRESS_TICK`(2945) composing
  `dragonBreathResettledBounceTick`'s existing remap. `currentPPForActiveMon`
  also gained a `turn2Resolved` param (DRAGON_BREATH 20→19 PP, §14's own
  ground truth). Two named single-tick residuals (ticks **3879** and
  **3888**, isolated Onix-sprite/healthbox bounce blips, same "hardware
  quirk at a bounce extremum" class as this dossier's tick 3337/3465/3721)
  excluded from `captureFrames`, not chased further. 6 new
  Tier-1 tests (`openFightSubmenu` cursor persistence, `currentPPForActive
  Mon`'s new decrement, and a 3-test `core.ts`-integration suite driving the
  new reopen gate through `tick()` directly). Full writeup in
  `docs/battle-turn-notes.md`'s new §19.
- **Next:** turn 3's own actual RESOLUTION (ENDEAVOR hits Onix 101→88 again,
  ROCK_SLIDE hits Grovyle 88→41) is next, starting from `turnKickoffTextStartTick`
  on — §13's ledger already has every HP/RNG value banked, no new oracle
  scouting needed, just engine work (expect it to cost about what turn 2's
  own E1/E1b/E2a/E2b slices each did). After that: turn 4 (DOUBLE_TEAM),
  turn 5 (the actual faint — Grovyle 1→0), the button-gated KO text, DESTIN's
  Pidgeotto switch-in, then — much later — Onix's OWN faint (§14) and the
  forced party-select/SEND OUT sequence. This session did NOT touch any of
  that; "faint/forced-switch" as a whole is still almost entirely unbuilt.
- **Notes:** no papercuts. The brief's own suggested trace name
  (`turn3-faint.json`) was NOT used since this session's actual window
  doesn't reach anywhere near the faint — named `turn3-menu.json` instead,
  for what it actually covers, per this run's own "name it for what it
  covers if your window differs" convention.

---
## 161 — Bounded worker: S7 slice E2b-2 — the `3347-3846` tail closed, but NOT a "cheap confirm pass" as expected: found and fixed a real live-bounce/HP-digit-overlay bug, plus two new named single-tick residuals (same class as tick 3337); `turn2-dragonbreath.json` **235/235**, `npm test` **732/732** (+1), build green, zero regressions

- **State:** `npm test` 732/732, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **235/235** (`3121-3346` minus tick 3337, plus
  the `3347-3846` tail at stride 10 + two dense 11-tick windows, minus
  ticks 3465/3721). Regressions re-run and confirmed: `turn2-endeavor-
  drain.json` **201/201**, `fight-submenu.json` **235/235**, `s6-
  acceptance.json` **224/228** (this trace's own pre-existing gap,
  unchanged). The `3177-3235` fire-projectile gap (ISSUES #23) untouched.
- **Did:** Probed the `3347-3846` hold with scratch traces first (own
  capture budget, not the committed trace's) rather than assuming E2b's
  "already pixel-stable" handoff note meant nothing to find. A stride-5
  sweep found a **401px mismatch on ~half the ticks**, in alternating
  15-20-tick runs — not the single-tick blip expected. Root cause: the
  resettled menu's healthbox bounce is LIVE here (unlike every earlier
  resettled-menu path), and `drawPlayerHealthboxHpOverlay` (added in E2b)
  blitted Onix's HP digits at a fixed `y`, unaware of the healthbox's own
  1-2px bounce — so the digits floated free of the bar whenever the
  bounce was non-zero. Fixed with an optional `yOffset` param (default 0,
  every other call site unaffected) fed from `menuIdleBounce(bounceTick)
  .healthboxY2`. Re-swept dense (2×250 stride-1 scratch captures) to
  confirm: only two single-tick 769px residuals remained, at ticks 3465
  and 3721 — traced analytically (not swept) to `onixSinIndex(n) mod 256
  == 64`, the sine table's own peak entry, recurring exactly every 256
  ticks (next occurrence 3977 is past this trace's end) — same
  "hardware quirk at a bounce extremum" class as E2b's own tick-3337
  residual, formula already textbook-exact there. Extended `turn2-
  dragonbreath.json` to 235 captures: stride 10 across the tail (denser
  than the groundtruth's own stride 20 — a stride-20 sample had a real
  chance of missing the half-the-ticks-wrong bug entirely) plus two dense
  windows pinning the new residuals as excluded, same-neighbor-density
  convention as tick 3337. One new Tier-1 pixel pin (`tests/battleScene
  .test.ts`, "S7 slice E2b-2") exercising the new `yOffset` plumbing
  directly (same coordinate, offset 0 vs 1, digit present vs shifted
  away). Full writeup in `docs/dragon-breath-notes.md`'s new "Engine
  slice E2b-2" section.
- **Next:** with this tail closed, `turn2-dragonbreath.json` has no more
  un-investigated span between 3121 and 3846 — everything left is one of
  three precisely named, deliberately-excluded single ticks (3337, 3465,
  3721) plus the parked `3177-3235` fire-projectile gap (ISSUES #23).
  Whoever wants to chase 3465/3721 further should RAM-probe the ONIX
  battler sprite's own `sSinIndex` at ticks 3464-3466 directly, not sweep
  the formula (already provably exact everywhere else). Otherwise:
  faint/forced-switch is the next S7 engine slice (§13-§14 ground truth
  already banked per #160); S8 engine work is unblocked separately.
- **Notes:** no papercuts, though worth flagging: this run's git repo is
  shared live with the concurrent supervisor process (direct commits
  landing on `master` mid-session, observed via a `git status`/`git diff`
  race on `ROADMAP.md` that resolved itself a few seconds later) — not a
  problem this session, but worth the supervisor knowing if a future
  worker's `git stash`/diff timing ever looks inconsistent. Scratch probe
  traces (`tools/compare/scratch/probe-tail-*.json`) were deleted after
  use, not committed, matching this run's own no-new-scratch-tooling
  precedent.


---

## 160 — Supervisor: round 5 folded — **turn 2's RESOLUTION half landed (`turn2-dragonbreath.json` 84→166/166)** + **S8's per-battle-moveset dependency CLOSED** (suite 731/731); projectile attempt #4 rejected the supervisor's own sampler hypothesis with clean evidence

- **State (supervisor-verified this minute):** `npm test` **731/731**,
  `npm run build` green, tree clean at the `29a0c51` merge + this docs
  commit, no worktrees/stray branches. Supervisor-rerun on the MERGED
  tree: `turn2-dragonbreath.json` **166/166**, `fight-submenu.json`
  235/235, `turn2-endeavor-drain.json` 201/201, `sendout.json` 255/256.
- **Did:** Main lane `0df7b03` (attempt #4): the supervisor's
  sampling-convention hypothesis for the fire projectiles was tested and
  **REJECTED** on evidence — all 4 rounding/offset variants scored WORSE
  than the current convention (8181 diff-px vs 11410/21469/21933), and
  the double-size iteration box was source-confirmed already correct
  (`gOamData_AffineDouble_ObjNormal_32x32`, same mode as the working ball
  spin). The shared affine sampler is therefore ELIMINATED as the cause.
  Main lane `a66249a` (E2b): DRAGON_BREATH's resolution half — Grovyle's
  HP drain 101→88, text-clear, turn-3 menu reopen, and the target
  hit-flash REUSED from ROCK_SLIDE's existing wobble/blink mechanism
  rather than rebuilt; caught a real stale-HP-digit bug pre-ship. Trace
  84→**166/166** (3236-3336 + 3338-3346 added; tick 3337 is a named
  single-tick hardware mid-bounce flicker, left OUT of captureFrames per
  this run's no-red-frames convention). Worktree `29a0c51` (merged):
  ROADMAP S8's named engine dependency CLOSED — new
  `src/engine/battleSetup.ts` resolves the active mon's moveset from
  `anchor-state.json` through `EngineState` into the live submenu
  renderer; identity byte-exact on 6 traces + a 32-trace sweep; 13 new
  tests incl. battle-2 KABUTO driven end-to-end THROUGH the state machine.
- **Named remainders (honest, not faked):** (1) fire projectiles,
  renders 3177-3235 — 4 bounded attempts, geometry/matrix/lag/base all
  pinned, palette-blend closed by source proof, sampler eliminated;
  remaining instrument = isolate one spawn on a blank canvas. Supervisor
  recommendation to the user: PARK as a named remainder. (2)
  `currentPPForActiveMon` decrements slot 0 only — no second oracled
  data point exists for non-ROCK_SLIDE PP; generalizing would fake data.
  (3) tick 3337. (4) ISSUES #22 (idle fixture 2135).
- **Next:** E2b-2 (tail 3347-3846 dense/strided capture pass) is RUNNING;
  then faint/forced-switch engine slice (§13-§14 ground truth banked) is
  the biggest remaining S7 item, and S8's engine work is unblocked.
- **Notes:** worker costs $3.84/$7.83/$10.83 (12/23/27 min). Zero merge
  conflicts across the session's 5 worktree merges.

---

## 159 — Bounded worker: S7 slice E2b — DRAGON_BREATH's RESOLUTION half landed (HP-bar drain, hit-flash reuse, text-clear, turn-3 menu reopen): `turn2-dragonbreath.json` extended 3121-3176/3236-3263 (84/84) -> +3264-3346 minus one named tick, **166/166 green**; `npm test` **718/718** (+7 Tier-1), build green, zero regressions

- **State:** `npm test` 718/718, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **166/166** (`3121-3176`+`3236-3263`+`3264-3346`
  minus `3337`). Regressions re-run and confirmed: `turn2-endeavor-drain.json`
  **201/201**, `turn1-drain.json` **102/102**, `fight-submenu.json`
  **235/235**. The `3177-3235` fire-projectile gap (E2a-2..E2a-5, parked)
  is untouched, per the brief's explicit out-of-scope.
- **Did:** Landed all four of the brief's E2b priorities. (1) **Grovyle's
  HP-bar drain**: `dragonBreathGrovyleHp` (exported, `battleScene.ts`) —
  same 1-HP/tick clamped shape as `rockSlideOpponentHp`/`endeavorOnixHp`,
  start=101 (`anchorOpponentAfterTurnHp`, reused — the phase table's own
  "100→88" prose was a minor imprecision, the committed ram-dump's
  `before_turn2.battler1.hp` actually reads 101, matching 101-88=13 =
  the locked damage roll), end=88 (new `anchorOpponentAfterTurn2Hp`).
  (2) **Hit-flash**: DRAGON_BREATH's own `SpriteCB_HitAnimHealthoxEffect`
  (3263-3283, 20 ticks) turned out to be the SAME generic mechanism
  ROCK_SLIDE's own `rockSlideHealthboxWobbleY2`/`rockSlideMonBlinkInvisible`
  already model — reused via input-translation (a `pressTick` offset
  constant) rather than rebuilt, exactly the "check if already modeled
  under a different name" the scout doc flagged. `drawOpponentHealthbox
  Wobble` gained an optional `content` param (default unchanged) so it
  could take Grovyle's real 101-HP content instead of the full-143 one
  every ROCK_SLIDE caller assumes. (3) **Text-clear + (4) turn-3 menu
  reopen**: `drawTurn2KickoffText` extended with `DRAGONBREATH_TEXT_CLEAR_
  DELAY`(384)/`DRAGONBREATH_MENU_REDRAW_DELAY`(391), same two-phase shape
  `drawRockSlideWindow`/`drawTurnEndSettledMenu` already use for ROCK_
  SLIDE's own turn-end. Caught a real bug via a 60px oracle diff before
  shipping: the resettled menu also needed an explicit Onix HP-digit
  overlay (`drawPlayerHealthboxHpOverlay`) — unlike ROCK_SLIDE's own
  turn-1→2 transition (Onix still full HP there), Onix already carries
  ENDEAVOR's own damage by turn 2's end, so `menuIdleBase`'s stale
  pre-turn-1 "117/117" harvest needed the same overdraw treatment
  Grovyle's bar already gets. All new constants iteration-verified against
  `npm run compare`, not assumed from prose (a `DRAGONBREATH_MENU_REDRAW_
  DELAY` sweep of ±1/±2 confirmed 391 is the unique best fit). Full
  writeup in `docs/dragon-breath-notes.md`'s new "Engine slice E2b"
  section. 7 new Tier-1 tests in `tests/battleScene.test.ts` (1 numeric
  suite for `dragonBreathGrovyleHp`, 5 real-framebuffer pixel pins for the
  drain/hit-flash/text-clear/menu-redraw dispatch).
- **Next:** one named single-tick residual (render 3337, the phase table's
  own "mid-bounce flicker") excluded from `captureFrames` rather than
  chased — the redraw-delay/bounce-anchor formula is already swept to a
  provable optimum (1 mismatch out of 11 ticks in that sub-window; every
  neighboring value scores strictly worse), so closing it needs a direct
  RAM probe of the bounce task's own re-init state at that one tick, not
  more formula sweeping. Otherwise: the `3347-3846` tail is likely a cheap
  dense-capture-and-confirm pass (already pixel-stable per the scout's own
  phase table, turn-3 menu already fully modeled here) for whoever picks
  this up next; the `3177-3235` fire-projectile gap remains the standing
  open item (per #157's escalation, still awaiting a supervisor/user call
  on a dedicated non-bounded session vs. parking permanently); faint/
  forced-switch and ISSUES #22 untouched.
- **Notes:** no papercuts. File ownership respected — `src/engine/core.ts`,
  `fightSubmenuText.ts`, `battleMenu.ts`, `docs/battle-menu-notes.md`
  untouched (only imported two more existing exports from `battleMenu.ts`:
  `HIT_FLASH_RAM_ANCHOR_DELAY`, already-exported `rockSlideHealthboxWobbleY2`/
  `rockSlideMonBlinkInvisible` were already imported).

---

## 158 — Bounded worker: S7 slice E2a-5 attempt — fire-projectile attempt #4: SUPERVISOR'S SAMPLING-CONVENTION HYPOTHESIS TESTED AND REJECTED by direct 4-variant sweep (every alternative to the current convention scored 1.4x-2.7x WORSE); pulled a fourth time, no wrong pixels shipped, `npm test` **711/711** (unchanged), build green

- **State:** `npm test` 711/711, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **unchanged** (`3121-3176` + `3236-3263`,
  84/84 green) — `3177-3235` still open. No engine code left changed
  (shared `drawSpriteSheetAffineRotate` is byte-identical to E2a-4's own
  baseline — nothing to regress-check against).
- **Did:** Per the brief, tested the supervisor's specific hypothesis
  FIRST (not a fresh RAM-probe cycle): re-wired E2a-3's exact settled
  config verbatim, then swept `drawSpriteSheetAffineRotate`'s sampling
  convention. (1) **Iteration-box question answered from source, not
  swept**: `gDragonBreathFireSpriteTemplate.oam =
  &gOamData_AffineDouble_ObjNormal_32x32` (`battle_anim_dragon.c:93`) —
  same `ST_OAM_AFFINE_DOUBLE` mode the ball spin already uses; the
  existing `-w..w`/`-h..h` loop already implements exactly this
  doubled-window convention (source-confirmed correct, not an open
  question). (2) **Rounding/offset convention swept, 4 variants**
  (`"default"` = unchanged original body, `"halfPixel"` = sample at
  `dx+0.5`, `"round"` = `+128`-before-`>>8` round-to-nearest,
  `"halfPixelRound"` = both — all kept in fixed-point, no floats, to
  avoid JS's truncate-toward-zero-before-shift trap) against the dense
  3177-3235 scratch trace, summed `diffPixels` over 59 frames: default
  **8181** (baseline) vs halfPixel 21469 (2.6x worse), round 21933 (2.7x
  worse), halfPixelRound 11410 (1.4x worse) — **every alternative is
  worse**, the opposite of the hypothesis's prediction. Cross-checked the
  default run's own per-tick numbers against E2a-4's banked reads (23px@
  3178, 2px@3208, 342px@3220 — all three exact matches) to confirm this
  was an apples-to-apples reproduction before trusting the sweep.
  GBATEK/Tonc's documented OBJ affine formula (plain integer
  floor-via-arithmetic-shift, no half-pixel destination offset) is
  already what `"default"` implements, consistent with the sweep result.
  **Verdict: hypothesis REJECTED** — the residual's cause is something
  else, not the sampler's rounding/offset convention. Full writeup
  (formula citation, fixed-point sweep mechanics, the table, the
  `halfPixelRound`-beats-neither-alone signal and what it implies) in
  `docs/dragon-breath-notes.md`'s new "Engine slice E2a-5" section.
  Pulled (`git checkout -- src/engine/battleScene.ts`) per the
  no-wrong-pixels rule — `drawSpriteSheetAffineRotate` carries no
  `variant` param in the committed tree.
- **Next:** the brief's own step-4 fallback (isolate the magnified-half
  missing blob: render spawn 7 alone against a blank canvas, diff against
  an oracle capture with all other content subtracted) was NOT attempted
  — the hypothesis test consumed the full time budget. That's the next
  concrete lead, not a fresh sweep of position/scale/sign/lag/box (all
  now closed questions across E2a-3/4/5). Per #157's own open
  escalation: this is a 4th bounded attempt with a real, provable
  negative result (one more hypothesis eliminated) but still no closure —
  worth the supervisor/user weighing a dedicated non-bounded session
  (isolated single-spawn pixel trace) against parking `3177-3235` as a
  named remainder and moving to E2b (3347+)/faint-switch, none of which
  depend on this gap.
- **Notes:** no papercuts. Scratch sweep infra (`tools/compare/out/e2a5-*`,
  gitignored, not committed) reproduced E2a-4's own numbers exactly — no
  new committed scratch tooling this session (reused E2a-3/E2a-4's
  `dragonbreath-projectile-window.json` and `dump-dragonbreath-anim.py`
  unchanged).

---
## 157 — Supervisor: round 4 folded + **OPEN ESCALATION to the user (fire projectiles: 3 bounded attempts, each narrowing, none closing)** — swap-screen assets extracted & composite-verified; suite 711/711, build green, tree clean, no worktrees

- **State (supervisor-verified this minute):** `npm test` **711/711**,
  `npm run build` green, tree clean at the `99ec13e` merge + this docs
  commit, no worktrees/stray branches. Trace counts unchanged and
  supervisor-spot-checked: `turn2-dragonbreath.json` 84/84,
  `turn2-endeavor-drain.json` 201/201.
- **Did:** Worktree lane (`99ec13e`, merged): swap-screen assets
  extracted — `action-box`/`action-highlight` (slide buttons) +
  `swap-screen-windows.json` (BG/window templates, mechanically parsed
  from source), composite-verified vs FRESH oracle pixels at **0
  unexplained mismatches / 1404 opaque px** (supervisor reran the
  verification script itself); everything else the swap screen draws is
  source-confirmed verbatim reuse of draft-screen gen assets. §17
  ADDENDUM 3. Main lane (`f71448a`): projectile attempt #3 — the
  ember-palette-blend suspect is now CLOSED by source-level call-chain
  proof (not just empirics), and the residual is renamed precisely:
  salt-and-pepper edge OVER-DRAW when compressed (|matrixA|>256) vs an
  isolated MISSING blob when magnified, correct core both sides. Pulled
  again (no wrong pixels shipped).
- **ESCALATION (open, asked in-terminal 2026-07-20 ~00:35):** the fire
  projectiles have now taken 3 bounded attempts with real narrowing each
  time and no closure. Asked the user how to spend the remaining ~3.5h.
  Supervisor recommendation: ONE more targeted attempt on a specific new
  hypothesis (below), then park as a named remainder if it misses.
  Attempt #4 launched concurrently with the question (cancelable).
- **Supervisor hypothesis driving attempt #4** (`E2a-5`): the defect is
  in `drawSpriteSheetAffineRotate`'s SAMPLING CONVENTION (battleScene.ts
  ~2337), not in any DRAGON_BREATH value — correct core + wrong edges,
  opposite artifacts either side of 1:1 scale, is the signature of a
  half-texel/rounding mismatch in a backward-mapped affine sampler; and
  this sampler's only other rotating consumer (ball spin) never exceeds
  |pa|=255 while DRAGON_BREATH starts at 703, i.e. the bug's regime was
  never exercised before. Brief mandates hardware-semantics derivation +
  a 4-variant sweep + a hard regression gate on every shared consumer.
- **Next:** fold attempt #4 and the concurrent core.ts per-battle-moveset
  plumbing step (S8 prerequisite named in ROADMAP S8); then E2b (HP drain
  + turn end, 3347-3846), faint/forced-switch slice. ISSUES #22 open
  (idle fixture tick 2135, informational).
- **Notes:** worker costs $5.26 + $5.10 (17/16 min). ISSUES #19's fix
  left `battle1-fight-submenu-idle.json` at 255/256 (tick 2135 = #22).

---
## 156 — Bounded worker: S7 slice E2a-4 attempt — fire-projectile attempt #3: PRIME SUSPECT (concurrent ember-palette blend) definitively RULED OUT by source+pixel evidence; residual precisely characterized (two scale-dependent artifact shapes, present from a spawn's very first tick) but NOT closed — pulled a third time; `npm test` **711/711** (unchanged), build green, zero regressions, no trace change

- **State:** `npm test` 711/711, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **unchanged** (`3121-3176` + `3236-3263`,
  84/84 green) — `3177-3235` still open. Regression spot-checks:
  `turn2-endeavor-drain.json` **201/201** (unchanged, ISSUES #19 already
  closed by #155).
- **Did:** Per the brief's mandatory method, re-wired E2a-3's exact
  best-fit config (base=(72,88), lag=1, direct matrix, `drawSpriteSheet
  AffineRotate`) and ran a diff-COLOR dump FIRST (`tools/compare/scratch/
  diffdump.mjs`/`diffmap.mjs`, both new, committed, generic — reusable by
  the next worker). Findings: (1) **prime suspect ruled out two ways** —
  source trace shows `AnimTask_BlendBattleAnimPal`'s `F_PAL_TARGET`
  structurally cannot reach the embers' own palette slot (unrelated gfx
  tag), and every mismatched pixel this session sampled is a clean
  small-ember yellow-red-ramp color, never a blended/wrong hue — this is a
  shape defect, not a color one. (2) The residual splits into two distinct
  scale-dependent shapes: salt-and-pepper edge over-draw when the sprite is
  compressed (`|matrixA|>256`, small `n`) vs. one isolated ~15x15 missing
  blob when magnified (`|matrixA|<256`, large `n`) that doesn't reduce to a
  spawn-duration off-by-one (tested clamping `n` to 21 — made tick 3220
  WORSE, 342px→649px, hypothesis killed and reverted within the session).
  (3) **Caught a false claim before it shipped**: initially assumed the
  reverted code was a no-op over the already-green `3121-3176`/`3236-3263`
  captures; actually re-ran `npm run compare` with the code temporarily
  back in and found it regresses `3175`/`3176` (12px/15px) — spawn 0's
  first visible tick falls inside the currently-captured range. Docs
  corrected to reflect the checked result, not the assumption. Pulled
  (`git checkout -- src/engine/battleScene.ts`) per the no-wrong-pixels
  rule — full writeup in `docs/dragon-breath-notes.md`'s new "Engine slice
  E2a-4" section.
- **Next:** per the brief, this was the last attempt before escalation —
  **recommend the supervisor treat this as the escalation trigger**: three
  bounded-worker attempts (E2a-2/E2a-3/E2a-4) have each made real, provable
  progress (scale-only → full rotated matrix → palette ruled out + shape
  characterized) without closing the gap, and the remaining work needs
  either a dedicated non-bounded session (isolated single-spawn pixel
  tracing, masking out every other draw call — sketched in the docs) or
  accepting `3177-3235` as a permanently named remainder and moving on to
  hit-flash (3263-3283)/E2b (HP drain 3298+, turn-end 3329+)/faint-switch,
  none of which depend on this gap closing first.
- **Notes:** no papercuts. `tools/compare/scratch/dragonbreath-projectile-
  window.json` (a ready `captureFrames` 3177-3235 scratch trace) also left
  committed for the next attempt to reuse without rebuilding the harness.

---
## 155 — Supervisor: round 3 folded — **ISSUES #19 ROOT-CAUSED AND CLOSED (asset harvest 1 row short): fight-submenu 235/235, turn2-endeavor 77/77, turn2-endeavor-drain 201/201 — all three now PERFECT**; shake/blend Tier-1 debt backfilled (711/711); fire-projectile pulled a 2nd time (findings banked, 3rd attempt briefed with a new instrument)

- **State (supervisor-verified this minute):** `npm test` **711/711**,
  `npm run build` green, tree clean at the `779e484` merge + this docs
  commit, no worktrees. Supervisor-rerun on the MERGED tree:
  `fight-submenu.json` **235/235**, `turn2-endeavor.json` **77/77**,
  `turn2-endeavor-drain.json` **201/201**, `s6-acceptance.json` 224/228
  (unchanged, #5/#18 policy-settled), `turn2-dragonbreath.json` 84/84.
- **Did:** Worktree lane (`779e484`, merged): #19 was never a timing
  mechanism — `extract-menu-idle-window.ts` hardcoded the healthbox
  bounce harvest at height:37, cropping row 111 of the rare y2=2 sine
  peak (once per ~256-tick lap); bbox→38 + regenerated asset fixed all
  three affected traces with zero code changes and a 30-trace sweep
  clean. Its sibling anomaly tick 2135 in the idle groundtruth fixture
  is NOT the same family (769px vs 99px) — filed as new ISSUES #22
  (informational fixture, low priority); tick 2071 IS closed. Main lane
  (`6a11221`): E2a-2's untested shake/blend formulas now pinned (4
  tests, fresh-capture cross-checked; 707→711); fire-projectile retry
  PULLED again per the no-wrong-pixels rule — but the matrix is now a
  settled 21-entry table (a==d, b==-c, identical across all 8 spawns,
  non-inverting family confirmed from source), base=(72,88), lag=1;
  remaining residual is flat ~15-100px/tick, mechanism unnamed.
- **Next:** Round 4: main = E2a-4 projectile attempt #3 with a NEW
  instrument — diff-COLOR dump first (geometry vs palette
  discrimination), prime suspect: a concurrent AnimTask_BlendBattleAnimPal
  instance also blends the EMBER palette while the engine renders it
  unblended. If #3 misses, ESCALATE to the user (options: park as named
  remainder / dedicated deep session). Worktree = S8 swap-screen asset
  extraction (from §17's inventory). Then E2b (3347-3846), faint/switch.
- **Notes:** worker costs $3.66 + $8.60 (15/28 min). ISSUES #19 deleted,
  #22 opened. Convergence per the strictly-smaller-named-gap rule is
  real but slowing on the projectile — attempt #3 is the last before
  escalation.

---
## 154 — Bounded worker: S7 slice E2a-3 attempt — Tier-1 pins backfilled for E2a-2's shake/blend (debt closed); fire-projectile RE-PULLED after a much-closer-but-not-exact retry; `npm test` **711/711** (+4), build green, zero regressions, no trace change

- **State:** `npm test` 711/711, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` **unchanged** (still `3121-3176` + `3236-3263`,
  84/84 green) — the `3177-3235` gap is still open. Regression:
  `turn2-endeavor-drain.json` 200/201 (unchanged, pre-existing ISSUES #19
  residual).
- **Did:** (1) **Tier-1 debt closed** (required per the brief): 4 new pins
  in `tests/battleScene.test.ts` for `dragonBreathShakeX2`/
  `dragonBreathBlendCoeff`, oracle-cross-checked against a FRESH scratch
  `bin/oracle run` capture (not reused data). (2) **Fire-projectile retry**:
  extended `tools/probe/dump-dragonbreath-anim.py` to read `matrixB`/
  `matrixC` (previously only `a`/`d`) — found the full matrix is clean
  (`a===d`, `b===-c` always, one 21-entry table, identical across all 8
  spawns, banked in docs). Confirmed from source (per the brief's explicit
  ask) that the sprite template uses the generic `RunAffineAnimFrame`/
  `ObjAffineSet` system (same family as the ball spin, NOT squish's
  `SetSpriteRotScale`) — no inversion needed feeding RAM-read values
  straight into `drawSpriteSheetAffineRotate`. Empirically swept base
  position + render lag + sign convention against fresh oracle PNGs: best
  fit is base=(72,88) exact (no half-width correction), lag=1 tick, direct
  matrix (no source flip) — MUCH closer than E2a-2's scale-only attempt
  (~15-100px/tick flat, not a growing-to-1000px curve) but still not 0.
  **Pulled again** (`git checkout -- src/engine/battleScene.ts`) rather
  than ship non-exact pixels — full writeup + exact tables +
  narrowed-down "what's likely still wrong" in
  docs/dragon-breath-notes.md's new "Engine slice E2a-3" section.
  Hit-flash not attempted (all time went to the above).
- **Next:** the fire-projectile residual is now small enough (a per-tile
  edge/rounding artifact, not a wrong position/scale/sign — all ruled out
  this session) that a resuming worker should instrument
  `drawSpriteSheetAffineRotate`'s own sample loop pixel-by-pixel against a
  single isolated spawn (ticks 3177-3197) rather than re-sweep whole-frame
  diffs — base=(72,88)/lag=1/direct-matrix and all three data tables
  (matrix/position/frame) are settled, not open questions. Then hit-flash
  (3263-3283), Grovyle's HP-bar drain (3298+) + turn-end (3329+) = E2b,
  then faint/forced-switch, ISSUES #19 root cause.
- **Notes:** no papercuts. This mechanism has now been attempted twice and
  pulled twice for the same reason (close but not pixel-exact) — if a
  third attempt also falls short, worth the supervisor considering whether
  to timebox it differently (e.g. a dedicated non-bounded session, or
  accepting the `3177-3235` gap as a named remainder past this slice) rather
  than repeating the same RAM-probe-then-sweep pattern a fourth time.

---
## 153 — Supervisor: round 2 folded — **ISSUES #20 CLOSED (FIGHT submenu on the live FONT_NARROW glyph pipeline, arbitrary movesets render)** + DRAGON_BREATH shake/blend/kickoff landed; suite **707/707**, build green, zero regressions, no worktrees

- **State (supervisor-verified this minute):** `npm test` **707/707**,
  `npm run build` green, tree clean at the `a7eb084` merge + this docs
  commit, no worktrees/stray branches. Supervisor-rerun on the MERGED
  tree: `fight-submenu.json` 234/235, `turn2-dragonbreath.json` 84/84,
  `turn2-endeavor-drain.json` 200/201 — the two lanes' shared
  `battleScene.ts` edits merged conflict-free and stayed exact.
- **Did:** Round 2 = three workers. Main lane #151 (`f0324d6`+`906734e`):
  DRAGON_BREATH kickoff text 3121-3176 green + `small_ember.png`
  extracted. Main lane #152 (`6e6b334`): probe-first landed
  `AnimTask_ShakeMon2` (±2px, lag=1) + both red-fade
  `AnimTask_BlendBattleAnimPal` instances (exact formulas, lag=2);
  fire-projectile attempt PULLED honestly — its affine pop is a genuine
  ~178.6° rotation (first rotating affine in this codebase), exact
  per-tick data banked in `docs/dragon-breath-notes.md`. Worktree lane
  (`a7eb084`, merged): ISSUES #20 remainder closed — new
  `src/engine/fightSubmenuText.ts` renders move names (FONT_NARROW),
  TYPE/ mixed-font run, PP digits + full 4-band PP-color state machine;
  identity preserved byte-exact on both submenu traces (same sole #19
  frames); KABUTO's real battle-2 moveset renders (+14 tests).
- **Next:** Round 3: main = E2a-3 fire-projectile retry (dump
  `gOamMatrices` per tick for the projectile slots — use REAL matrix
  values, not scale approximations; MUST also backfill #152's missing
  Tier-1 pins for shake/blend); worktree = ISSUES #19 root-cause scout.
  Then: E2b (HP drain + turn end 3347-3846), faint/forced-switch slice.
- **Notes:** worker costs $4.23/$14.25/$7.26 (10-34 min). #152 landed
  without Tier-1 pins (gap flagged, folded into E2a-3's brief).
  ISSUES #20 deleted (remainder = per-battle moveset wiring through
  `core.ts` is S8 engine scope, noted in ROADMAP S8).

---
## 152 — Bounded worker: S7 slice E2a-2 increment — DRAGON_BREATH shake + red-fade blend land, oracle-verified (**`turn2-dragonbreath.json` 84/84 green, new contiguous block 3236-3263**); fire-projectile attempt pulled after failing pixel-exactness; `npm test` **693/693** (unchanged), build green

- **State:** `npm test` 693/693, `npm run build` green, tree clean.
  `turn2-dragonbreath.json` `captureFrames` now `3121-3176` (unchanged) +
  `3236-3263` (new, 28 ticks) — **84/84 green**. Regression:
  `turn2-endeavor-drain.json` 200/201 (unchanged, pre-existing ISSUES #19
  residual).
- **Did:** RAM-probed all 5 remaining priorities first (new
  `tools/probe/dump-dragonbreath-anim.py`, ticks 3170-3350 — mandatory
  per the brief). Landed 2: (1) target shake (`dragonBreathShakeX2`) —
  `AnimTask_ShakeMon2`'s own fixed ±2px alternation, RAM-solved exactly,
  render lag **1 tick**; (2) target red-fade blend
  (`dragonBreathBlendCoeff`) — two `AnimTask_BlendBattleAnimPal` instances
  (fade 0→9 then 9→0) via the same `BlendPalette` bit-math ENDEAVOR's own
  blend uses, RAM-solved exactly, render lag **2 ticks** (a THIRD distinct
  lag value in this window, oracle-confirmed independently, not assumed —
  matches the brief's own warning that ENDEAVOR's window had three lag
  conventions too). `drawSpriteSheetAffineStretch` gained an optional `x2`
  param (default 0, other call sites unaffected); new `drawDragonBreathScene`
  wired into `drawTurn2KickoffText`'s fallback branch. **Pulled** the
  8-fire-projectile mechanism after a real attempt: position/spawn-cadence/
  frame-cycle are all RAM-verified EXACT (banked in
  docs/dragon-breath-notes.md's new "Engine slice E2a-2" section, ready to
  wire), but the affine "pop" is a genuine ~178.6° ROTATION (not
  `rotation=0` like every prior affine-scale mechanism in this codebase),
  and a `Math.abs(matrixA)`-as-scale approximation (ignoring the rotation's
  shear, never probed) was close but not pixel-exact (small, smoothly
  growing diffs through the projectiles' own span) — pulled rather than
  ship known-wrong pixels or regress the previously-green 3121-3176 block.
  Hit-flash not attempted (time-boxed out).
- **Next:** fire-projectile mechanism needs `gOamMatrices[].b/c` (this
  session only read `a`/`d`) rendered via the general 2x2 sampler already
  built for the ball-spin mechanism (`drawSpriteSheetAffineRotate`), not
  the diagonal-only `drawSpriteSheetAffineStretch` — all other data
  (position table, spawn ticks, frame formula) already banked. Then
  hit-flash (`SpriteCB_HitAnimHealthoxEffect`, 3263-3283), then Grovyle's
  own HP-bar drain (3298+) + turn-end (3329+) = slice E2b, then faint/
  forced-switch, ISSUES #19 root cause, #20 FONT_NARROW rewire (sibling
  worktree).
- **Notes:** no papercuts. Three distinct RAM/pixel render-lag values
  confirmed independently in one window (shake=1, blend=2, text-family=1
  elsewhere) — don't assume mechanisms in the same window share a lag.

---
## 151 — Bounded worker: S7 slice E2a increment — DRAGON_BREATH kickoff text lands (**`turn2-dragonbreath.json` new, 56/56 green, renders 3121-3176**) + `small_ember.png` extracted; `npm test` **693/693** (unchanged), build green

- **State:** `npm test` 693/693, `npm run build` green, tree clean, 3
  commits this session. New trace `tools/compare/traces/turn2-dragonbreath.json`
  (verbatim 50-segment script from the scout's groundtruth trace, dense
  captureFrames 3121-3176) is 56/56. Regression: `turn2-endeavor-drain.json`
  200/201 (unchanged, pre-existing ISSUES #19 residual).
- **Did:** landed priorities 1-2 of 5 from the brief (docs/dragon-breath-notes.md's
  new "Engine slice E2a" section has the full writeup). (1) `drawTurn2KickoffText`
  (`battleScene.ts`) now switches from ENDEAVOR's held text to "ONIX
  used\nDRAGONBREATH!" at render 3137 (pressTick+192), holds through 3176 -
  all new code in `battleScene.ts` only (not `drawFightSubmenuWindow`, not
  `battleMenu.ts` - both off-limits per this session's file-ownership split
  with a sibling FIGHT-submenu-text worktree). (2) `small_ember.png`
  extracted (`extract-battle-move-anim-assets.ts`, `battle-anim-small-ember.json`),
  independently byte-verified against the raw PNG via PIL (0/5120 pixel
  mismatches; palette matches after the expected GBA round-trip).
- **Next:** priorities 3-5 (8-projectile mechanism, red-fade blend,
  `AnimTask_ShakeMon2`, hit-flash) - explicitly NOT attempted this session;
  the projectile mechanism needs a fresh RAM probe first (this codebase's
  own `AnimTranslateLinear_WithFollowup` precedent, `TRAINER_EXIT_X2`, found
  that primitive does NOT reduce to a clean formula - expect a literal
  RAM-probed table, not a derived one). Full detail + what to probe in
  docs/dragon-breath-notes.md's new section. Then: E2b (HP drain + turn
  end), faint/forced-switch slice, ISSUES #19 root cause, #20 FONT_NARROW
  rewire (sibling worktree, separate from this session).
- **Notes:** no papercuts. Stayed on the assigned step; did not attempt
  priority 3+ rather than risk landing it half-verified against the
  45-minute cap.

---
## 150 — Supervisor: round 1 folded — **ENDEAVOR window fully CLOSED (S7 slice E1 done end to end)** + DRAGON_BREATH window scouted/ground-truthed (slice E2 unblocked); suite **693/693**, build green, scout branch merged clean, no worktrees

- **State (supervisor-verified this minute):** `npm test` **693/693**,
  `npm run build` green, tree clean at merge `6f8b005`, no worktrees or
  stray branches. `turn2-endeavor-drain.json` **200/201** (supervisor-rerun;
  sole residual = tick 2906, ISSUES #19 family, pre-attributed);
  regression spot-checks `turn1-drain.json` 102/102,
  `turn1-rockslide.json` 256/256.
- **Did:** Round 1 = two 45-min workers in parallel. Main lane (#149,
  `f6a53da`): ENDEAVOR tail 3061-3094 landed via RAM-probe-first — two NEW
  mechanisms (player-healthbox post-hit wobble ±1px/20 ticks; Onix
  post-hit invisible-flicker 4-on/4-off ×4), both `render=RAM+1`,
  §15's "same mechanisms' tail" guess disproven by probe before any code.
  Worktree lane (`5cdff4b`, merged): DRAGON_BREATH ground truth —
  corrected window boundary (**3137→3846 pixel-visible**; 3095-3136 is
  ENDEAVOR's own HP-drain tail through ~3116 + handoff), §12 RNG ledger
  re-verified 0 corrections, per-tick task/sprite inventory committed
  (8 fire projectiles @4-tick spawn/20-tick life, target red-fade
  `AnimTask_BlendBattleAnimPal`, `AnimTask_ShakeMon2` ±2px, hit-flash
  sprite), dense every-tick trace 3095-3346 (252 caps, verbatim 50-segment
  prefix — supervisor-verified byte-equal), only `small_ember.png` needs
  extraction. Docs: `docs/dragon-breath-notes.md` (new).
- **Next:** Round 2: main = DRAGON_BREATH engine slice E2a (ember
  extraction + kickoff text + projectile mechanism vs the banked ground
  truth); worktree = ISSUES #20 FONT_NARROW rewire (real glyph pipeline for
  the FIGHT submenu, unblocks S8 battle-2 menus). Then: E2b (blend/shake/
  flash + HP drain + turn end), faint/forced-switch slice, #19 root cause.
- **Notes:** worker costs $8.75 + $4.73, 24.6 + 15.2 min. Zero merge
  conflicts, zero regressions.

---
## 149 — Bounded worker: S7 slice E1 tail increment — **ENDEAVOR's animation window CLOSES**: `turn2-endeavor-drain.json` green span now runs contiguously **3000→3094+** (merges into the pre-existing 3095-3120 block); `npm test` **693/693** (+8), `npm run build` green

- **State:** `npm test` **693/693**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` `captureFrames` grown 167→201 (every tick
  3061-3094 added, closing the gap between the committed 3000-3060 block
  and the pre-existing dense 3095-3120 block); `tools/probe/dump-endeavor-
  tail.py` committed (new).
- **Did:** RAM-probed the 3061-3094 tail FIRST (mandatory per the brief) by
  extending both §15e-era probes over RAM 3050-3100 - both came back flat
  (shake/hitsplat fields empty, squish matrix neutral, attacker palette
  unchanged), ruling out §15's own "same mechanisms' own tail" guess before
  touching render code. A from-scratch full-sprite-table scan then found
  TWO new, previously-unmodeled mechanisms: (1) the player healthbox's own
  brief post-hit "wobble" - 3 sprites (`gHealthboxSpriteIds[0]` + 2
  lockstep neighbors) alternating `y2=+1/-1` every RAM tick for 20 ticks
  then a hard stop, a different mechanism from `menuIdleBounce`'s own slow
  never-negative sine; (2) Onix's own brief post-hit "flicker" -
  `struct Sprite.invisible` toggling 4-on/4-off for 4 cycles then settling
  visible for good (two other hypotheses - a palette blend, a hardware
  BLDCNT/BLDALPHA flash - were RAM-checked and ruled out first). Both lags
  independently pixel-confirmed at `render=RAM+1` (blend/droplet's family,
  not squish/shake's `render=RAM+2`). Wired into `drawEndeavorSquish`
  (`ENDEAVOR_SQUISH_TABLE` extended with 36 more neutral rows through
  `t=3092` so its primitive-reconstruction path keeps covering the tail);
  `drawMenuHealthboxPlayer` gained an optional `dy` param (default 0, other
  2 call sites unaffected). Landed first-try, zero further mismatches once
  wired. 8 new Tier-1 pins, oracle-cross-checked. True settle tick pinned
  at render 3093 (1-2 ticks earlier than §15's own coarse estimate). Full
  writeup: `docs/battle-menu-notes.md` §15f.
- **Next:** S7's ENDEAVOR slice (§15-§15f) is fully DONE. Remaining S7 work:
  DRAGON_BREATH's own window (~3129+), faint/forced-switch engine slice,
  ISSUES #19 root cause, FONT_NARROW rewire (#20) - all out of this
  session's own scope.
- **Notes:** no papercuts. `tools/compare` full regression check across
  `turn2-endeavor.json` (76/77), `turn1-rockslide.json` (256/256),
  `turn1-cloneanim.json` (230/230), `turn1-drain.json` (102/102) - all
  unchanged, zero regressions.

---
## 148 — Supervisor wind-down: session end 2026-07-19 ~20:30 — **14 verified worker steps** (9 main + 5 worktree, every one folded green); suite **648 → 685/685**; headline: **oracle frame cap raised to 45000 (user decision, harness `ccd7554`)** after proving no battle-1 WIN fits 20000 → the full S8 acceptance chain is now ground-truthed (WIN + BOTH swap branches + battle-2 first menus + battle-2 turn 1); turn-2's ENDEAVOR half is engine-green 3000→3060

- **State (verified this minute):** `npm test` **685/685**, `npm run
  build` green, tree clean at `32f1a9e` + this docs commit, no
  worktrees, no unmerged branches, oracle serving `maxFrames: 45000`.
  Committed-trace counts: turn1-rockslide **256/256** (shake residual
  closed #134), turn2-endeavor 76/77, turn2-endeavor-drain **166/167**
  (contiguous dense green 2999-3060; both residuals = ISSUES #19's
  family), all earlier traces at their established counts.
- **Session summary (supervised, ~16:15-20:30):** S7 turn-2 first half
  built from zero across #135/#137/#142/#144/#146/#147 (dynamic
  FONT_NORMAL PP digits, player HP-digit compositor, ENDEAVOR: HP-diff
  core + squish/blend/droplets/hitsplat/shake — each mechanism
  RAM-probed, three distinct render-lag conventions pinned). One failed
  landing (#140, X-axis misfit) recovered by the RAM-probe-first retry
  (#142: wrong-subsystem root cause). S8: §15 scout proved the WIN
  unreachable at 20000 (idle-timing is NOT an in-battle RNG lever;
  best line: Pidgeotto KO 15887, Onix faints 19147, Murkrow untouched)
  → escalated → **user chose raising the cap** (harness `ccd7554`,
  service restarted+verified) → §16 WIN chain (Magby beats Murkrow,
  victory → decline → battle-2 menu at 33031), §17 swap-YES branch
  (full swap screen, GROVYLE swapped in, asset inventory), §18
  battle-2 turn 1 (BATTLE_ARMOR crit short-circuit; rentalMons probe
  fixed+validated; frontier RNG freeze at 33286). ISSUES #21 opened
  from §18's honest damage flag and CLOSED same session (derivation
  omitted the `+2`; engine bit-exact, supervisor-reproduced). ISSUES
  #19's family recurrence pinned at 2906 (now 3 affected frames across
  3 traces, same 99px row-111 fingerprint).
- **Next:** (1) ENDEAVOR tail 3061-3094 (second hitsplat/shake round +
  settle) to close the whole anim window; (2) slice E2: DRAGON_BREATH
  window 3129-3846 (turn-2 second half); (3) faint/forced-switch engine
  slice (§13-§14 ground truth banked); (4) ISSUES #19 root cause, #20
  FONT_NARROW rewire; (5) S8 engine work is fully unblocked
  (ground truth complete end to end); S4 remainder stays deferred.
- **Notes:** no usage-limit events; worker cost ~$5.5-23/step, 14-41
  min/step. One harness change this session (`ccd7554`, cap 45000) —
  recorded in ROADMAP S8 + Domain notes with rationale.

---
## 147 — Bounded worker (session's LAST): S7 slice E1 hitsplat/shake increment — **both remaining ENDEAVOR sub-mechanisms landed green; the 3008-3023/3034-3049 gaps are CLOSED, `turn2-endeavor-drain.json` runs contiguously 3000→3060**; `npm test` **685/685** (+7), `npm run build` green — closes the brief's own acceptance criteria exactly

- **State:** `npm test` **685/685**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` `captureFrames` now covers every tick
  2999-3060 contiguously (grown 135→167); `tools/probe/dump-endeavor-
  hitsplat-shake.py` committed (new).
- **Did:** RAM-probed `gAnimMovePower` (**75** for ENDEAVOR, never confirmed
  before despite three prior sessions flagging it — the move's *listed*
  power is 0 but `GetMovePower`'s real HP-diff placeholder is 75), the
  target's own `sprite->x2` (shake), and both `AnimHitSplatBasic` sprites'
  real position + OAM matrix. First hitsplat probe attempt found zero
  sprites (filtering on `callback==AnimHitSplatBasic`'s address fails since
  that function reassigns its own sprite's callback on its first
  invocation) — fixed by filtering on the stable `affineAnims` field
  instead. Wired `endeavorShakeX2`/`drawEndeavorHitsplats` into
  `drawEndeavorSquish`. First wiring attempt (shake using the same
  `RAM=render-1` lag as blend/droplets) landed round-0 hitsplat exactly but
  half-missed shake on alternating render ticks — pixel-solved the real lag
  as `RAM=render-2` (matching squish's matrix, a THIRD distinct lag
  confirmed in this one window) via a neutral-baseline diff against fresh
  oracle captures; fixed, then the whole 3000-3060 window landed first-try
  with zero further mismatches. Also found the hitsplat's own OAM matrix is
  a RAM-confirmed CONSTANT (372) for its whole visible life, not a ramp —
  corrects this run's own earlier banked asset-doc summary (not edited in
  place, corrected via engine-code doc comment per this run's convention). 7
  new Tier-1 pins, oracle-cross-checked. Full writeup:
  `docs/battle-menu-notes.md` §15e.
- **Next:** OUT of this session's scope but flagged for whoever picks it up:
  renders past 3060 (`3061-3094`) are still red/uncaptured — likely the same
  mechanisms' own tail, never RAM-probed (§15's own original scan called it
  "alternating two distinct shapes", unattributed). Otherwise S7 slice E1
  (ENDEAVOR) is DONE per the brief's own acceptance criteria.
- **Notes:** no papercuts. Session's last main-lane increment — tree is
  resume-ready (clean, green, no worktrees).

---

---
## 146 — Bounded worker: S7 slice E1d batch-1 increment — **batch-1 droplets confirmed (zero code changes needed) + extended squish/blend table wired (both cycles) + two new "inter-round lull" islands landed green**; the true wall found and pinned exactly: render 3008, gated by an unmodeled hitsplat sprite, not a droplet/squish bug; `npm test` **678/678** (+4), `npm run build` green

- **State:** `npm test` **678/678**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` `captureFrames` grown 114→135 (dense
  3000-3007 unchanged, PLUS two newly-verified-green islands 3024-3033 and
  3050-3060); `ENDEAVOR_SQUISH_TABLE` extended 8→57 rows (`t=3000..3056`,
  both squish/blend cycles). No new probe scripts needed (reused
  `dump-endeavor-squish-blend-ext.py`, re-run since the prior session's own
  dump was scratch/uncommitted).
- **Did:** RAM-probed the full squish+blend window fresh (RAM 2996-3055,
  `gOamMatrices`+`gPlttBufferFaded`/`Unfaded` solved for `coeff` per
  `BlendPalette`'s exact formula — found and fixed a probe bug along the
  way: the blend only touches palette indices 1-15, `numEntries=15`, index
  0 is transparent and was polluting the coeff solve) and wired all 57 rows
  into `ENDEAVOR_SQUISH_TABLE`. Verified batch-1 (upper) droplets need ZERO
  code changes: the existing `RAM=render-1`/`n>=1` convention generalizes
  exactly, confirmed both by a targeted oracle pixel check (render 3018,
  the batch's own first-visible tick — one later than §15c's rough "~3017"
  guess) and by the fact that no diff bbox ever touches the attacker-side
  droplet region across the whole 3008-3049 span. Extended dense captures
  tick-by-tick past 3007 and found the wall immediately at 3008: a discrete
  red-starburst diff confined to `x=41-102` (Onix's own body) — a hitsplat
  sprite's own pop-in, unmodeled, not a squish/blend/droplet defect (the
  attacker side stays 100%-exact through the entire span, proving the
  extended table + droplets are correct). Individually diffing every tick
  (not sampled) also surfaced two real "inter-round lull" islands inside
  what §15's coarser scan called one continuous span — `3024-3033` and
  `3050-3060` both diff exactly zero pixels — landed both as `captureFrames`
  additions per this trace's own established sparse+dense convention; the
  red spans between them (3008-3023, 3034-3049) were left OUT of
  `captureFrames` entirely rather than committed red. 4 new Tier-1 pins,
  all oracle-cross-checked (scratch `bin/oracle run` captures, not this
  engine's own output). Full writeup: `docs/battle-menu-notes.md` §15d.
- **Next:** model `AnimHitSplatBasic` (gfx + affine pop table already
  derived, §15) and `AnimTask_ShakeTargetBasedOnMovePowerOrDmg` (needs
  `gAnimMovePower` for ENDEAVOR RAM-confirmed — still open) to close the
  3008-3023/3034-3049 gaps; once landed, the two islands this session found
  should merge into one contiguous green block through ≥3060.
- **Notes:** no papercuts. Session's last main-lane increment — tree is
  resume-ready (clean, green, no worktrees).

---
## 145 — Supervisor: **ISSUES #21 CLOSED — not an engine bug** (the §18 hand-derivation omitted `CalculateBaseDamage`'s unconditional `+2`, the same pitfall §10 documents; `damageCalc.ts` reproduces the RAM values bit-exact, supervisor-reproduced independently: 19 pre-STAB / 28 post-STAB); scout merged

- **State:** `npm test` **674/674**, `npm run build` green, tree clean;
  no worktrees, no unmerged branches.
- **Did:** verified and merged worker/wt-20260719-191802: §18
  'ROOT-CAUSED' addendum; probe `dump-battler-full.py` extended with
  statStages[]/side statuses/crit multiplier;
  `battle2-turn1-fullstate-dump.json` (twice-run) ruled out every other
  #21 lead (stages neutral, side statuses zero, both hold SITRUS_BERRY —
  no damage hook, STURDY/BATTLE_ARMOR touch no damage branch,
  BATTLE_TYPE_FACTORY blocks badge boosts). ISSUES #21 deleted per
  policy. Also verified+accepted #144 (droplets batch 0 green,
  turn2-endeavor-drain 113/114, suite 674/674).
- **Next:** final main-lane increment of the session (batch-1 droplets +
  banked extended squish table, §15c's named next step), then wind-down
  (~21:00-21:30).
- **Notes:** none.

## 144 — Bounded worker: S7 slice E1d droplets increment — **first ENDEAVOR sweat-droplet batch RAM-probed and landed green** (renders 3006-3007, real hardware sprite reads, not a pixel fit); `npm test` **674/674** (+2), `npm run build` green

- **State:** `npm test` **674/674**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` dense window now 2999-3007 (was 2999-3005);
  `tools/probe/dump-endeavor-droplets.py` and `dump-endeavor-squish-blend-
  ext.py` committed.
- **Did:** RAM-probed all 16 droplet sprites (`AnimFacadeSweatDrop`'s own
  static callback address, thumb-bit-adjusted, since it's not exported)
  across both squish cycles — found §15's own banked table had the two
  `CreateSweatDroplets` offset variants (upper/-20 vs lower/+20) mislabeled
  relative to which `tTimer` triggers which, corrected in `battleScene.ts`'s
  own doc comment. Landing the FIRST batch found a second bug: droplets
  aren't visible on their own `CreateSprite` tick — the naive "same render
  lag as the squish matrix" guess put every droplet one physics step ahead
  of the oracle; fixed via a fresher lag (`RAM=render-1`, matching blend's
  own) plus requiring the sprite's `n>=1` (not `n>=0`), reproducing both the
  previously-pinned clean tick (3005) and the newly-contaminated one (3006)
  at once. Also RAM-probed (not pixel-solved) the ENTIRE squish+blend window
  across both cycles (`gPlttBufferFaded` read directly, `coeff` solved via
  `BlendPalette`'s own real formula) and found/fixed an off-by-one in §15b's
  own prose (matrix lag is `render-2`, not `render-3` — the committed table
  values were always right, only the restated formula was wrong). Tried
  extending `ENDEAVOR_SQUISH_TABLE`/droplets through both full cycles but
  `npm run compare` showed real residual diffs starting render 3008 (batch-1
  droplet timing not yet re-verified past batch 0, and/or shake/hitsplat) —
  trimmed to the last green tick (3007) rather than commit red, per this
  run's own discipline. Full writeup: `docs/battle-menu-notes.md` §15c.
- **Next:** batch-1 (upper) droplet timing — verify/correct the same
  render-lag convention past render 3017 (the analogous first-visible tick);
  once both batches/cycles close, the already-RAM-probed extended squish
  table (banked, not wired) should drop in directly. After that: shake/
  hitsplat (still fully unmodeled, `gAnimMovePower` for ENDEAVOR still not
  RAM-confirmed).
- **Notes:** no papercuts.

---
## 143 — Supervisor: battle-2 scout merged (§17 debts closed + §18 battle-2 turn-1 ground truth); **new ISSUES #21** — RAM-observed base damage 19 vs formula 17 on ROCK_SLIDE-vs-KABUTO, a damageCalc generality gap

- **State:** `npm test` **672/672**, `npm run build` green, tree clean at
  merge `031bfc5`; no worktrees, no unmerged branches.
- **Did:** verified and merged worker/wt-20260719-184149 (3 commits):
  rentalMons[] probe fixed (root cause: global.h's field comments are
  SaveBlock2-absolute offsets, the old probe double-added frontier's
  0x64C base) and validated two ways (pre-swap == anchor dump 3/3 slots;
  post-swap slot0 == pre-swap slot3 per CopySwappedMonData); YES-branch
  LCG ledger committed (bonus: frontier RNG freeze begins tick 33286);
  battle2-turn1.json (33672f/168c, twice-run) + §18 ledger — new pinned
  mechanic: KABUTO's BATTLE_ARMOR short-circuits the crit roll's
  Random() call. Damage discrepancy honestly flagged → filed as ISSUES
  #21 (leads: probe defense/statStages at calc tick). Also
  verified+accepted #142 (squish+blend landed via RAM-probed matrices,
  turn2-endeavor-drain 111/112).
- **Next:** (1) main lane: ENDEAVOR droplets increment (spawn boundary
  pixel-pinned at 3006, physics banked in §15); (2) worktree: root-cause
  ISSUES #21; (3) wind down ~21:30-21:45 (deadline 22:16).
- **Notes:** none.

---
## 142 — Bounded worker: S7 slice E1d-retry — **ENDEAVOR squish RAM-probed and landed green** (renders 3000-3005, real hardware `gOamMatrices` values, not a pixel fit); `npm test` **672/672** (+3), `npm run build` green

- **State:** `npm test` **672/672**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` dense window now 2999-3005 (was bare 2999);
  `tools/probe/dump-endeavor-squish.py` committed.
- **Did:** RAM-probed the attacker's real `gOamMatrices[matrixNum]`
  per-tick (§15a's own recommendation) — found squish uses a DIFFERENT,
  non-inverting battle-anim subsystem (`SetSpriteRotScale`/
  `RunAffineAnimFromTaskData`) than mechanism 4's own inverting one, which
  is what actually caused §15a's X-axis miss (wrong subsystem, not a wrong
  axis — no swap needed, `xScale`→X/`yScale`→Y exactly as labeled).
  `drawSpriteSheetAffineStretch` already had the right (direct, unswapped)
  convention; added an opt-in `doubled` scan-window param (RAM-confirmed
  `ST_OAM_AFFINE_DOUBLE`, re-derived from `CalcCenterToCornerVec`) to let
  the silhouette grow past its native 64px box. Also found (pixel-solving
  the oracle's own captures, not assumed) that §15's "independently driven"
  palette blend is wrong — it's ALREADY ramping across this whole window,
  not scheduled later — and that the matrix/blend don't share one render
  lag (matrix: 2 ticks; blend: the usual 1). Landed squish+blend together
  (blend reused `drawSpriteSheetAffineStretch`'s own existing tint params,
  no new primitive). Droplets contaminate 1 tick earlier than §15 estimated
  (3006, not 3008) — window trimmed 3000-3007→3000-3005 rather than commit
  a knowingly-red pair; full analysis in `docs/battle-menu-notes.md` §15b.
- **Next:** droplets are the clear next increment (asset extracted, physics
  formula banked in §15, spawn boundary now pixel-pinned) — same
  land-green-then-extend discipline. After that: blend/shake/hitsplat per
  §15's leverage order, then DRAGON_BREATH (E2) or ISSUES #19/#20.
- **Notes:** no papercuts.

---
## 141 — Supervisor: swap-YES scout merged — **the factory swap screen is fully ground-truthed** (entry fade → party picker → popup → opponent picker → accept → completed swap → battle 2's menu: swapped-in GROVYLE 143/143 vs KABUTO); S8 ground truth is now essentially complete on both swap branches

- **State:** `npm test` **669/669**, `npm run build` green, tree clean at
  this merge; no worktrees, no unmerged branches.
- **Did:** verified (suite in worktree, 34081-frame trace re-run, final
  frame visually confirmed) and merged worker/wt-20260719-181044:
  `battle1-swapyes-{a,b}.json` (30001f/235c, 34081f/194c, verbatim
  prefix off battle1-winline-b-swap.json's committed swap-offer prompt
  at tick 29601, both twice-run byte-identical), §17 (swap-screen UI
  sequence + asset inventory: nearly all draft-screen assets literally
  shared; only action-button pills + swap text bank are new). Worker
  honestly deleted a broken `rentalMons[]` probe (offset bug, §17 open
  item) rather than commit implausible data; YES-branch LCG ledger also
  still open.
- **Next:** (1) main lane: ENDEAVOR squish X-axis via RAM-probing the
  real affine matrices (§15a's own recommendation) — second landing
  attempt; if it fails again, park the anim and move to E2/#19/#20;
  (2) worktree: §17 debt (rentalMons offset fix + YES-branch ledger) +
  battle-2 opening-turns ground truth; (3) wind-down prep ~21:45.
- **Notes:** none.

## 140 — Bounded worker: S7 slice E1d — ENDEAVOR squish wired + oracle-fitted, X-axis MISFITS — reverted, nothing landed; suite unchanged **669/669** (`docs/battle-menu-notes.md` §15a FITTED addendum has the full empirical writeup)

- **State:** `npm test` **669/669** (unchanged), `npm run build` green,
  tree clean, no trace changes. Engine code was written and tested this
  session but **reverted** (`git checkout`) once it was clear it only
  half-fit — this run's own "never commit red" rule, not a scope call.
- **Did:** confirmed `drawSpriteSheetAffineStretch` (already in
  `battleScene.ts`, built for GROVYLE_STRETCH) is the renderer §15 asked
  for — no new primitive needed, just pre-invert the accumulator
  (`0x10000/acc`) before calling it, since squish is table-driven
  (`AFFINEANIMCMD_FRAME`/real `ObjAffineSet`, same family as materialize)
  unlike GROVYLE_STRETCH's own bespoke direct-write function. Ran a fresh
  dense oracle probe (`turn2-endeavor-drain.json`'s own prefix, captures
  2996-3012) that sharpened §15's bbox table to the exact tick: 2999
  neutral, 3000 first visible, 3006 widest, 3008 target-side contamination
  starts — pins `ENDEAVOR_SQUISH_START_DELAY=54`. Fitting against that
  data found the **Y axis matches the oracle exactly** (`dxScale`'s own
  accumulator maps to rendered Y, not X — a real axis-label correction)
  but the **X axis doesn't**: oracle wants a 76px-wide silhouette (12px
  past the 64px neutral canvas), the fitted renderer only reaches 63px —
  a whole-silhouette misalignment, not an edge residual. Tried both
  remaining axis-mapping directions and an `ST_OAM_AFFINE_DOUBLE`-style
  doubled destination box (added as a backward-compatible opt-in param,
  since reverted with everything else) — neither closed the gap.
- **Next:** RAM-probe `gSprites[]`'s own affine data fields for X directly
  (same `dump-rockslide-sprites.py`/`sendout-grovyle-stretch.json`
  precedent this run already has) rather than continuing to pixel-fit
  blind — recommended over more guessing, per §15a's own "open questions"
  list (possible causes: a transcription error in the extracted step
  table, or a concurrent mechanism, e.g. the blend task, already
  contributing pixels earlier than assumed). Once X fits, land exactly
  per the original brief's staged order (squish sub-window 3000-3007 →
  droplets → blend → shake → hitsplat).
- **Notes:** no papercuts. Time-boxed session spent its remaining room on
  pixel-fit attempts rather than switching to a RAM probe soon enough —
  flagged in §15a so the next session doesn't repeat the same dead ends.

## 139 — Bounded worker: S7 slice E1c — ENDEAVOR's own attack animation, GROUNDWORK ONLY (2 gfx assets extracted + full 5-mechanism source derivation + oracle-timed transition table, `docs/battle-menu-notes.md` §15); engine wiring NOT landed, this session's own explicit scope call — suite unchanged **669/669**

- **State:** `npm test` **669/669** (unchanged, no engine code touched),
  `npm run build` green, tree clean. New gen assets
  `src/assets/gen/battle-anim-{sweat-drop,hitsplat}.json`; `endeavor` key
  added to `src/data/gen/battle-move-anim-tables.json`. No trace
  added/changed (deliberate — see below).
- **Did:** source-read `Move_ENDEAVOR` (`battle_anim_scripts.s:3789-3803`)
  and found FIVE concurrent sub-mechanisms, not the "generic hit" the
  original handoff assumed and #137 already flagged: attacker 2-axis
  squish (affine scale — the engine's only existing affine renderer is
  uniform-scale-only, built for materialize), 16 sweat-droplet sprites
  (new gfx + particle physics), a 16-color palette blend ramp (new
  primitive, distinct from the existing `blendedTile` alpha-compositor),
  two target-shake task instances, two hitsplat sprites (new gfx + its own
  affine "pop"). Extracted both new gfx assets (`sweat_drop.png` 1 tile,
  `impact.png` 16 tiles) via the established `extract-battle-move-anim-
  assets.ts` convention; hand-derived exact formulas for all five
  mechanisms from source (steps/offsets/timings, see §15); ran a scratch
  dense every-tick oracle capture (2999-3095, not committed) and built a
  full bbox-transition table — confirms §14's coarse "two 0-diff lulls"
  finding at full resolution and isolates a clean squish-only sub-window
  (3000-3007, attacker side only, before droplets/shake/hitsplat
  contaminate it) as the cheapest possible incremental landing point.
- **Next:** wire the engine per §15's "what a follow-up session needs"
  list, in order of leverage: (1) a 2-axis affine sprite renderer
  (generalizes the existing materialize one); (2) land the isolated
  3000-3007 squish-only sub-window as its own green trace slice first,
  proving the renderer before adding droplets/blend/shake/hitsplat; (3)
  RAM-probe the 3008-3049/3064-3084 spans (dump-rockslide-sprites.py-style)
  to attribute sub-mechanism boundaries precisely, and confirm
  `gAnimMovePower` for ENDEAVOR (shake amplitude depends on it). Otherwise
  DRAGON_BREATH's window (3129+, slice E2) or ISSUES #19/#20.
- **Notes:** scope call made explicitly, not improvised — this run's own
  precedent (ROCK_SLIDE, §11) shows comparable per-mechanism complexity
  took a full session and still left a residual; five concurrent
  mechanisms here made a rushed pixel-fit likelier to land wrong or red
  than useful, so this session banked the (expensive, otherwise-repeated)
  research instead. No papercuts.

---
## 138 — Supervisor: WIN-chain scout merged — **battle 1's WIN, swap decline, and battle 2's first action menu fully ground-truthed at tick 33031** (11969 under the new 45000 cap); S8's acceptance chain is now provably pinnable

- **State:** `npm test` **669/669**, `npm run build` green, tree clean at
  merge `2eed99a`; no worktrees, no unmerged branches.
- **Did:** verified (suite in worktree, 33031-frame trace re-run on the
  restarted service, final frame visually confirmed: KABUTO vs healed
  ONIX 117/117 at a settled action menu) and merged the worktree scout:
  Magby chosen over Bayleef on RAM-dumped evidence, Murkrow killed in 2
  turns (Magby survives 27/138), burn residual pinned `floor(maxHP/8)`,
  full victory text → free heal → GO ON → swap offer declined →
  battle 2 = FISHERMAN JENSON / KABUTO. Traces
  `battle1-winline-b{,-swap}.json` + 3 RAM dumps + §16 (ledger
  discipline). Load-bearing methodology note (§16): OUTSIDE battle,
  idle-timing DOES shift RNG (per-VBlank advance resumes) — battle 2's
  opponent identity is timing-sensitive; scripts extending the chain
  must reuse the committed segments verbatim. Also verified+accepted
  #137 (slice E1b drain+digits, turn2-endeavor-drain 105/106; ENDEAVOR
  anim descoped on source evidence — real custom assets).
- **Next:** (1) main lane: ENDEAVOR attack-anim asset slice (ticks
  3003-3094, `Move_ENDEAVOR` at battle_anim_scripts.s:3789) to complete
  turn 2's first half; then E2 (DRAGON_BREATH window 3129-3846); (2)
  worktree lane: swap-YES branch + factory swap screen ground truth +
  asset inventory (S8's only un-scouted UI); (3) ISSUES #19 family
  (3 traces now), #20 rewire remainder.
- **Notes:** none.

## 137 — Bounded worker: S7 slice E1b — Onix's own HP-bar drain (117→101) + player-healthbox HP digits, `turn2-endeavor-drain.json` **105/106** (the 1 residual is the same ISSUES #19 family already accepted in `turn2-endeavor.json`) — suite **669/669**; ENDEAVOR's own attack animation stays OUT OF SCOPE (real custom asset, not "plain generic" as briefed)

- **State:** `npm test` **669/669** (+9 Tier-1 pins), `npm run build`
  green, tree clean. New committed trace
  `tools/compare/traces/turn2-endeavor-drain.json` (same verbatim 44+6
  prefix as `turn2-endeavor.json`, idle extended to tick 3132, +29
  captures dense 3095-3120 + 3 settle samples) **105/106**. Zero
  regressions at exact prior counts: `turn2-endeavor` 76/77 (untouched),
  `turn1-rockslide` 256/256, `turn1-drain` 102/102, `fight-submenu`
  234/235, `turn1-kickoff` 81/81, `turn1-cloneanim` 230/230.
- **Did:** landed the drain+digits half of slice E1b, per the brief's own
  fallback clause, after source-checking (not assuming) that ENDEAVOR's
  own attack animation is genuinely custom asset work (`Move_ENDEAVOR`:
  attacker squish/sweat-droplet/yellow-blend task + two rounds of
  target shake+hitsplat, `data/battle_anim_scripts.s:3789`) — NOT the
  "plain generic hit, no move-specific asset" the handoff assumed.
  Oracle-confirmed the animation's own onscreen window is 3003-3091
  (whole-frame diff against the tick-2999 baseline), settling back to
  an exact match (aside from the healthbox itself) from 3095 on — so
  this session's own trace captures densely from 3095 through the
  settle, explicitly skipping 3003-3094. `endeavorOnixHp` (`battleMenu
  .ts`) reproduces `rockSlideOpponentHp`'s exact shape with its own
  anchor delay (153, not 597) — grid-search-confirmed the same "no
  extra render lag" rule holds player-side too (verified independently,
  not assumed, since the player/opponent controllers are different
  source files). `composePlayerHealthboxHpOverlay`
  (`healthboxAssembly.ts`) is a small sparse patch (bar fill + FONT_SMALL
  digit text) layered on the existing flat player-healthbox harvest,
  NOT a full frame compositor (that's its own future slice, a player-
  side ISSUES #16 analogue) — caught a real bug mid-session where an
  initial fit reused the opponent's own 11-row text-window constants
  verbatim (ink-exact, but clobbering 2 rows of the frame's own static
  divider line with the printer window's own bg-fill color); re-fit
  against a wider pixel check (not just ink) found the real 9-row
  footprint, now Tier-1-regression-guarded. Full derivation in
  docs/battle-menu-notes.md §14.
- **Next:** ENDEAVOR's own attack animation (new sweat-droplet/hitsplat/
  squish-blend assets, ticks 3003-3094 — a real asset-extraction slice,
  not a formula reuse) is the natural continuation of this exact window;
  otherwise DRAGON_BREATH's own window (3129+, slice E2) or ISSUES #19's
  anomaly family.
- **Notes:** no papercuts.

---
## 136 — Supervisor: S8's blocking question answered (WIN unreachable at 20000) → **user decision: oracle frame cap raised to 45000** (harness `ccd7554`, service restarted + verified); §15 winline scout merged — Pidgeotto-KO line verified (tick 15887), Murkrow's first RAM ground truth

- **State:** `npm test` **659/659**, `npm run build` green, tree clean at
  the merge commit `f8b0649`; no worktrees, no unmerged branches. Oracle
  answers with `maxFrames: 45000` (smoke-tested on anchor.json).
- **Did:** (1) Worktree scout (merged): confirmed idle-timing is NOT an
  RNG lever (probe: +4-frame shift reproduces §12's ledger shifted +4) —
  move-choice sequence is; found+verified a line KO'ing Pidgeotto at tick
  15887 (BIND at turn 8), settled menu vs Murkrow at 17722; Murkrow RAM
  ground truth (Lv50 142/142 DARK/FLYING, INSOMNIA, LAX INCENSE, Spd 97,
  FAINT_ATTACK/FLY/TORMENT/TAUNT); Onix (4/117 after felling Pidgeotto)
  faints at 19147 dealing 0 to Murkrow — WIN provably misses the 20000
  cap for every plausible line (floor ≈22500 incl. swap + battle-2 menu).
  Traces `battle1-winline-a{,-murkrow}.json` + 2 RAM dumps + new probe
  `dump-battler-full.py` committed (§15). (2) Escalated; user chose
  raising the cap over snapshot/restore or re-scope: harness commit
  `ccd7554` (`MAX_FRAMES = 45_000`), service restarted, verified.
  ROADMAP S8 + Domain notes updated. (3) Verified+accepted workers #134
  (shake residual, turn1-rockslide 256/256) and #135 (slice E1,
  turn2-endeavor 76/77) — see their entries.
- **Next:** (1) scout lane: ground-truth the full WIN → swap → battle-2
  first-menu line under the 45000 cap (extend §15's winline; keep Onix
  healthier / voluntary switch options open); (2) main lane: slice E1b —
  ENDEAVOR attack anim + Onix HP drain 116→101 + player-side HP-digit
  compositor (ticks 2999-3128, §13 handoff: digits are FONT_SMALL,
  already extracted); then E2 (DRAGON_BREATH window, 3129-3846); (3)
  ISSUES #19 family (now 2 traces affected), #20 rewire remainder.
- **Notes:** oracle restart was deferred until the main lane was idle (a
  mid-flight restart would have broken E1's compares). Old cap's two
  stale Thursday `server.py` processes (not on :8012) left untouched.

---
## 135 — Bounded worker: S7 slice E1 — turn 2's FIGHT-submenu reopen through ENDEAVOR's kickoff text, `turn2-endeavor.json` **76/77** (the 1 residual is ISSUES #19's own pre-existing family, confirmed recurring, not new) — suite **659/659**

- **State:** `npm test` **659/659** (+12 Tier-1 pins), `npm run build`
  green, tree clean. New committed trace
  `tools/compare/traces/turn2-endeavor.json` (exact 44-segment prefix +
  `battle1-turn2.json`'s own next 6 segments verbatim, final idle trimmed
  so the trace ends at tick 2999) **76/77**. Zero regressions at exact
  prior counts: `turn1-rockslide` 256/256, `turn1-drain` 102/102,
  `fight-submenu` 234/235, `turn1-kickoff` 81/81, `turn1-cloneanim`
  230/230.
- **Did:** FIGHT submenu reopens for turn 2 (cursor rests at slot 0,
  matching — not yet generalizing — the ground truth) with PP now dynamic
  (9/10, was static 10/10): rendered through the REAL FONT_NORMAL pipeline
  per the brief's own ask (`ppRemainingGlyphCodes` + a new `font.ts` export,
  `drawGlyphCodes`, needed for `CHAR_SPACER`'s own non-charmap glyph code),
  not a second static harvest — oracle-pixel-confirmed 0/450 mismatches,
  and `getCurrentPPToMaxPPState(9,10)` confirmed (not assumed) the color
  band stays full, no palette change. `DOWN` to DRAGON_BREATH (slot 2, PP
  20/20, its harvest already valid, 0 mismatches re-checked) → `A` confirms
  → "Foe GROVYLE used\nENDEAVOR!" prints and holds. Three real bugs found
  and fixed along the way (docs/battle-menu-notes.md §13 has the full
  derivation for each): (1) Grovyle's HP was forgotten by every render path
  except slice D's own `drawTurnEndSettledMenu` — fixed at the root via one
  new `turn1Resolved`-gated helper (`drawMenuIdleBaseWithOpponentHp`)
  threaded through every `menuIdleBase` draw site, not a per-site patch;
  (2) the submenu's own bounce overlay must inherit the RESETTLED menu's
  phase (`rockSlideResettledBounceTick`), not turn 1's own plain-`t`
  formula, which only worked for turn 1 by coincidence (its open predates
  any resettle event); (3) the post-confirm frozen bounce state and the
  kickoff-text hard-cut tick both needed their own grid-search corrections
  (mirroring `turnKickoffFrozenBounceTick`'s own established precedent),
  landing at `TURN2_KICKOFF_FROZEN_BOUNCE_TICK=2119` and a 1-tick-earlier
  `turn2KickoffTextStartTick`. ENDEAVOR's HP-diff math
  (`calculateEndeavorDamage`/`resolveEndeavorDamage`, damageCalc.ts) is
  pinned hermetically against the RAM dump (117,101→16, the 0.5x
  intermediate scale to 8, the restore back to 16) per the brief's own ask,
  independent of the (not-yet-wired) visual drain.
- **Stopped exactly at:** the kickoff text fully printed and held (tick
  2999) — the FIRST real pixel change past that point is oracle-confirmed
  at tick 3003 (ENDEAVOR's own attack animation beginning), well before the
  3128 cap. ENDEAVOR's animation, Onix's HP-bar drain (3098-3116), and the
  player healthbox's own HP-digit compositor (117/117→101/117, needs a
  player-side analogue of `composeOpponentHealthbox` — confirmed this
  session to need nothing new font-wise, just FONT_SMALL again, source-
  traced via `AddTextPrinterAndCreateWindowOnHealthbox`) are explicitly
  NOT wired this session — left for a follow-up slice, per this step's own
  fallback clause.
- **Next:** the deferred visual half (ENDEAVOR anim → HP drain → player
  healthbox digits → settled at tick ~3128) is the natural continuation;
  otherwise ISSUES #19's own anomaly family (now confirmed general, not
  turn-1-specific) or S8's faint/forced-switch slice per #133's own list.
- **Notes:** the grid-search-against-cropped-oracle-regions technique (§8's
  own convention) resolved all three bugs above without ever needing a
  fresh scratch trace — the already-committed `battle1-turn2.json` ground
  truth had every tick this session needed. No papercuts.

---

## 134 — Bounded worker: §11.1's 1px shake residual CLOSED — misdiagnosed as `drawStaticBgShiftedY`; real cause was the player healthbox's bleed-mask heuristic coincidentally matching the unshifted background — `turn1-rockslide.json` **250/256 → 256/256**; suite **649/649**

- **State:** `npm test` **649/649** (+1 Tier-1 pin), `npm run build`
  green, tree clean. `tools/compare/traces/turn1-rockslide.json`
  **256/256, 0 diff**. Full regression sweep, zero change at established
  counts: `turn1-drain` 102/102, `turn1-cloneanim` 230/230,
  `turn1-kickoff` 81/81, `fight-submenu` 234/235, `sendout` 255/256,
  `s6-acceptance` 224/228, `menu-idle` 69/69, `scene-assembly` 256/256.
- **Did:** the brief's own hypothesis (`drawStaticBgShiftedY` sampling a
  wrong tile pixel at a boundary) turned out to be a misdiagnosis —
  `staticBgPixel(173, 85)` genuinely returns `(247,247,255)`, the
  correct raw BG3 sample for that shifted map row. The real bug is one
  layer up: `drawMenuHealthboxPlayer`'s bleed mask
  (`getMenuHealthboxPlayerContentMask`) infers "background bleed" for a
  harvested rectangular pixel by comparing it against the plain,
  always-unshifted background — correct for the settled action-menu
  window it was harvested from, but this same draw call is reused inside
  the Rock Slide shake window, where BG3 genuinely scrolls. One harvested
  pixel (a white frame highlight at screen (173,92)) coincidentally
  equals the *unshifted* background's color there, so the heuristic
  always called it a hole — invisible on `0`-shift ticks (live bg is
  white there too, same coincidence), wrong on `-7`-shift ticks (live bg
  samples a different, non-white tile row). Root-cause fix, not a
  special case: the harvest's bleed set forms exactly 4 connected regions
  (sizes 8/55/260/**1**) — real bleed is a byproduct of the healthbox's
  true non-rectangular shape, so it comes in contiguous patches, never a
  lone pixel stranded inside solid content. The mask now despeckles:
  any bleed-classified pixel whose 4-neighbors are all content gets
  reclassified as content too — generalizes to the whole class of
  coincidence, leaves all genuine bleed regions and every other trace
  untouched. Full derivation + fix in docs/battle-menu-notes.md §11.1
  ("FIXED" note appended, not rewritten — the original attribution stays
  visible as the record of what was tried first and why it was wrong).
- **Next:** ISSUES #19's 99px single-row anomaly family; S7 continues
  (turn-2+ engine slices against §12-§14 ground truth); ISSUES #20
  rewire when S8 nears.
- **Notes:** the misdiagnosis cost real time — confirming
  `drawStaticBgShiftedY`'s math was innocent (dumping the tilemap/tileset
  JSON directly, cross-checking against the oracle's own PNGs pixel-by-
  pixel across the whole 8x8 tile and neighboring ticks) before finding
  the actual layer. A naive first fix attempt (compare the healthbox
  harvest against the *live* framebuffer instead of the flat background)
  made things worse, not better: same 6 failing frames but 1px→211px
  diff each, by reclassifying ~210 genuine bleed pixels as content;
  reverted in favor of the despeckle approach once connected-component
  analysis on the bleed mask made the real distinguishing signal
  (isolated vs. contiguous) obvious. No papercuts otherwise.

---
## 133 — Supervisor wind-down: session end 2026-07-19 ~16:05 — **S6 ticked [x] (user), S7 turn 1 nearly complete** (kickoff 81/81 + clone 230/230 + rockslide 250/256 + drain 102/102), FIGHT submenu playable, S7 core (damage/order/RNG) landed + twice cross-validated, ground truth through turn 14's forced switch — suite **555 → 648/648**, 18 verified worker steps

- **State (verified this minute):** `npm test` **648/648**, `npm run build`
  green, tree clean at `27473b1` + this docs commit, no worktrees, no
  unmerged branches. Committed compare traces (28): turn1-drain 102/102,
  turn1-cloneanim 230/230, turn1-kickoff 81/81, turn1-rockslide 250/256
  (6 frames = §11.1's pre-existing 1px shake-sampling bug), fight-submenu
  234/235 (ISSUES #19), sendout 255/256 + s6-acceptance 224/228 (settled
  #5/#18 attributions), all earlier traces at their long-established
  counts.
- **Session summary (supervised, ~10:15-16:05, 18 worker steps: 9 main +
  9 worktree, every one verified green before folding; 9 merges, 2
  trivial conflicts hand-resolved):** S6 closed by user decision (1496
  parked, ISSUES #18 policy-settled). S7 built from zero: hermetic core
  (damageCalc with the newly-found unconditional `+2` at
  `pokemon.c:3371`, turnOrder, turnRng) later cross-validated bit-exact
  by DRAGON_BREATH (special branch) and RAM intermediates; FIGHT submenu
  (open/nav/confirm) + turn-kickoff text + DOUBLE_TEAM clone anim + stat
  banner (real BG1 scroll, extracted) + full ROCK_SLIDE window (20-rock
  slot-allocation simulation) + HP drain/turn-end. Ground truth banked
  through turn 14: turns 2-5 ledgers, faint + Pidgeotto switch-in,
  PP-exhaustion mechanic, forced-switch SEND OUT sequence (wrong-cursor
  root cause), frame-budget analysis → user re-scoped S8 acceptance to
  multi-trace assembly (ROADMAP updated, commit 4b435d0). FONT_NARROW
  extracted + proven (ISSUES #20 → rewire-only). ISSUES #16 partial-HP
  path oracle-validated exactly (0 residual), trimmed to yellow/red
  bands + status icons.
- **Next:** (1) turn1-rockslide's §11.1 1px shake residual (250→256);
  (2) ISSUES #19's 99px single-row anomaly family; (3) S7 continues:
  turn-2+ engine slices against §12-§14 ground truth (ENDEAVOR's HP-diff
  path, DRAGON_BREATH window), then the faint/forced-switch engine
  slice; (4) ISSUES #20 rewire when S8 nears; (5) S4 remainder stays
  deferred per the recorded re-scope.
- **Notes:** no usage-limit events. Worker cost ~$6.6/step avg, 12-34
  min/step. Two user decisions this session: S6 [x] (1496 parked) and
  S8 multi-trace acceptance — both recorded in ROADMAP with rationale.

## 132 — Bounded worker: S7 slice D — HP drain + turn-end CLOSED, `turn1-drain.json` **102/102, 0 diff** on first attempt; closes ISSUES #16's deferred partial-HP oracle validation — suite **648/648**

- **State:** `npm test` **648/648** (+5 Tier-1 pins), `npm run build`
  green, tree clean. New committed trace
  `tools/compare/traces/turn1-drain.json` (canonical 44-segment prefix,
  102 captures: dense every tick 2510-2600 + strided to 2655) **102/102,
  0 diff**. Zero regressions: turn1-rockslide 250/256, turn1-cloneanim
  230/230, turn1-kickoff 81/81, fight-submenu 234/235, sendout 255/256,
  s6-acceptance 224/228 — all re-verified unchanged.
- **Did:** implemented the whole window (`battleMenu.ts` pure fns +
  `battleScene.ts` render, docs/battle-menu-notes.md §12 has the full
  derivation) from a fresh 161-frame scratch dense capture (ticks
  2500-2660, grid-search only, not committed). Three findings: (1) the
  HP-bar drain renders with **no extra frame of render lag** (every other
  ROCK_SLIDE mechanism in this window uses a `-1` lag; this one doesn't —
  fit exact against all 15 fill-pixel-count transitions after that
  hypothesis was tried and rejected first); (2) the resettled action
  menu's idle-bounce cycle re-anchors to a **fresh** local tick
  (`MENU_IDLE_BLANK_END_TICK+1`), matched by the very first menu's own
  distinctive "1-tick blip then 9-tick dwell" opening shape recurring
  identically at the redraw tick — not a continuation of the frozen
  pre-turn absolute-tick counter; (3) the reused flat `menuIdleBase`
  harvest's two bounce regions are both on the PLAYER's (Onix, undamaged)
  side, so it stays valid for the resettled menu EXCEPT the opponent's own
  healthbox, which now needs a live per-tick overdraw
  (`opponentHealthboxContentForHp`, a small memoized cache — only 43
  distinct integer HPs ever needed) instead of the old static
  full-HP-only constant.
- **ISSUES #16 outcome:** the partial-HP half is RESOLVED, not a headline
  fix — `calcBarFilledPixels`'s existing `floor(hpFraction*48)` formula
  already agreed with real oracle pixels for all 43 HPs this trace
  exercises (0 residual, no model change). Trimmed the entry to what's
  still unvalidated: yellow/red band thresholds and every status icon
  (this seed's battle never leaves the green band or inflicts status).
- **Next:** the §11.1-named 1px `drawStaticBgShiftedY` residual (single
  stray pixel at (173,92) on `rockSlideBg3Y=-7` ticks, turn1-rockslide
  250/256→256/256) is the next small pickup; otherwise turn 2+ ground
  truth / the victory-scout lane's own next steps per #130.
- **Notes:** the grid-search-against-a-scratch-capture technique (build a
  throwaway dense trace via `bin/oracle run`, crop specific pixel regions
  with PIL to isolate one mechanism's own sha/pixel transitions from
  everything else moving on screen at the same time, rather than reading
  full-frame shas alone) resolved all three findings above in well under
  an hour combined — no papercuts.

---
## 131 — Bounded worker: S7 slice C — rock-vs-rock OAM stacking order CLOSED via real slot-allocation + `SortSprites` simulation — `turn1-rockslide.json` **181/256 → 250/256**; suite **643/643**

- **State:** `npm test` **643/643** (+5 Tier-1 pins), `npm run build`
  green, tree clean. `tools/compare/traces/turn1-rockslide.json`
  **250/256** — the brief's own named residual (75 frames, all in
  2362-2453, rock-vs-rock stacking) is **fully closed (0 remaining)**.
  Zero regressions: turn1-cloneanim 230/230, turn1-kickoff 81/81,
  fight-submenu 234/235, sendout 255/256, s6-acceptance 224/228, menu-idle
  69/69 — all re-verified unchanged.
- **Did:** ported the real `CreateSprite` "lowest free slot" allocator +
  `SortSprites` insertion-sort comparator (`reference/pokeemerald/
  src/sprite.c`) into a pure TS simulation (`rockSlideDrawOrder`,
  `battleMenu.ts`), seeded from a live RAM read of `sSpriteOrder` (no
  exported symbol — address resolved via `nm`, new probe
  `tools/probe/dump-rockslide-slot-order.py`). RAM-validated **0
  mismatches**: slot assignment for all 20 rocks + the shake sprite
  across 143 sampled RAM ticks, AND the resulting draw order across all
  117 multi-rock ticks (56 with an exact on-screen-Y tie). Key
  simplification (also empirically confirmed, not just argued): the
  20 rocks are RAM-confirmed the *only* sprites in the scene that ever
  share an exact `oam.priority`/`subpriority` key, so — by a stable
  sort's own defining property — the simulation only needs to track the
  20 rocks, not the other ~50 `gSprites[]` slots. Full derivation in
  docs/battle-menu-notes.md §11.1.
- **Also found (not fixed, out of scope per this step's brief) — a
  separate, PRE-EXISTING 6-frame residual**: sweeping the full 256
  frames (not done with this precision before) surfaced 1px mismatches
  at ticks 2349/2350/2353/2354/2357/2358, confirmed present before this
  session's changes too (`git stash` + re-run). All 6 land exactly on
  `rockSlideBg3Y=-7` ticks, a single stray pixel at (173,92) — a narrow
  `drawStaticBgShiftedY` sampling bug, unrelated to rock ordering. The
  prior session's §11 claim that the shake was "independently
  pixel-exact" was inaccurate (never swept at full precision). Named
  precisely in docs/battle-menu-notes.md §11.1 rather than worked around,
  since this step's brief explicitly said not to rework the shake.
- **Next:** a future session should own `drawStaticBgShiftedY`'s 1px
  residual (§11.1's own attribution) to close `turn1-rockslide.json` to
  256/256. Then slice D (drain/turn-end, `pressTick+596`=2516 on —
  closes ISSUES #16's deferred validation) is next up on the main lane;
  the victory-scout worktree (SEND OUT confirm + frame-budget analysis,
  #130's own next-action) is unaffected by this session.
- **Notes:** the RAM-probe environment
  (`vendor/mgba-venv/bin/python tools/probe/*.py`) plus
  `arm-none-eabi-nm -n --defined-only reference/pokeemerald/
  pokeemerald.elf` for resolving `static` EWRAM symbols with no exported
  name (this run already used this technique for callback addresses;
  this session extended it to `sSpriteOrder`/`sSpritePriorities`) made
  the whole derivation tractable inside one bounded session — no
  papercuts.

---

## 130 — Supervisor: victory scout merged — battle 1's win line is LONGER than one oracle trace: ROCK_SLIDE PP exhausts (silent no-op at 0 PP), Onix faints turn 14 → forced player switch (party ONIX/MAGBY/BAYLEEF revealed); trace ends at 19634 frames vs the 20000 oracle cap — suite **638/638**

- **State (verified post-merge):** `npm test` **638/638**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-rockslide re-verified
  181/256 (slice-C target, #129); turn1-cloneanim 230/230.
- **Did (worktree scout, verified then merged, conflict-free):**
  `battle1-victory.json` (19634 frames, twice-run 0/256 mismatch) +
  3.7MB RAM dump + `battle-turn-notes.md` §14. Headlines: **PP exhaustion
  is real and silent** (0-PP selection does nothing — no RNG, no text; a
  fixed-script harness deadlocks); DRAGON_BREATH fallback adapted; turn-13
  genuine miss; **Onix faints turn 14** (priority QUICK_ATTACK) and the
  battle does NOT end — forced party-select (SEND OUT/SUMMARY/CANCEL)
  with reserves MAGBY/BAYLEEF at full HP; trace ends there, one confirm
  press from continuing vs Pidgeotto at 1/143 HP. Open: the SEND OUT
  confirm button sequence (several attempts didn't commit the switch);
  **the full win may not fit the oracle's 20000-frame cap** from anchor —
  needs either a tighter script or a harness-level cap decision.
- **Next:** round 9 (final this session) — main lane: slice-C completion
  (rock slot-allocation simulation → 256/256 + the deferred Tier-1 pins);
  worktree: crack the SEND OUT confirm + frame-budget analysis (can an
  efficient line win under 20000 frames? — if provably not, that is an
  escalation-worthy harness finding for next session). Then slice D
  (drain/turn-end + ISSUES #16 validation) next session.

---
## 129 — Bounded worker: **S7 slice C — ROCK_SLIDE window engine, LARGE MAJORITY LANDED, not yet 0-diff** — `turn1-rockslide.json` **0/256 → 181/256** (2963px total residual, avg ~40px/frame, max 172px, all in the 2362-2453 rock-overlap sub-range); suite **638/638**

- **State:** `npm test` **638/638**, `npm run build` green, tree clean.
  New committed trace `tools/compare/traces/turn1-rockslide.json` (256
  captures, 2193-2515) **181/256** — acceptance (0 diff) **not met**, but
  every mechanism except rock-vs-rock stacking order is independently
  pixel-exact (see below). Zero regressions: turn1-cloneanim 230/230,
  turn1-kickoff 81/81, fight-submenu 234/235, menu-idle 69/69, sendout
  255/256, s6-acceptance 224/228 — all re-verified unchanged.
- **Did:** implemented the whole window (`battleMenu.ts` pure fns +
  `battleScene.ts` render, docs/battle-menu-notes.md §11 has the full
  derivation) — the two text boxes (stat-rose + used-move), the
  `gBattle_BG3_Y` shake (a new background-only resampler,
  `drawStaticBgShiftedY`, since OBJs stay fixed on real hardware but this
  engine's usual `menuIdleBase` harvest bakes bg+OBJs into one flat image),
  all 20 falling rocks' spawn schedule + per-rock ellipse motion
  (call-timing model reverse-engineered tick-by-tick against fresh RAM
  probes — the naive "1 call/tick from spawn" reading was off by one call
  on the spawn tick specifically), the generic hit-flash, and — a genuine
  new finding, not predicted by the existing docs — Grovyle's own
  `AnimTask_ShakeMon` bounce, which §9.6 had predicted an engine could skip
  during the `monbg`-hidden window; a per-tick pixel brute-force proved
  otherwise (period-4 `[5,5,0,0]` render pattern, ticks 2362-2455). Also
  fixed a silent text bug (the stat-rose apostrophe needs the game's own
  U+2019 glyph, not ASCII `'` — the font has no glyph for the latter) and a
  background-wrap bug (BG3's real vertical period, 256px, wasn't being
  applied to the shake's negative `mapY`, blanking the top 7 screen rows).
- **Notes:** docs/battle-menu-notes.md §11 has the full per-mechanism
  accounting + RAM-probe citations. PAPERCUT: none new — the RAM-probe
  scripts committed by the earlier ground-truth scout session
  (§9.5/`dump-registers.py`/`dump-rockslide-sprites.py`) were directly
  reusable against the already-committed dense traces, saved a lot of time
  versus re-deriving from source alone.

---

## 128 — Supervisor: Grovyle-faint ground truth merged (turns 3-5, KO + Pidgeotto switch-in) — suite **638/638**; round 8 = slice C (ROCK_SLIDE engine) + victory scout

- **State (verified post-merge):** `npm test` **638/638**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-cloneanim re-verified
  **230/230** on the merged tree (slice B complete).
- **Did (worktree scout, verified then merged, conflict-free):**
  `battle1-grovyle-faint.json` (7312 frames, 256 captures, twice-run 0
  mismatch) + full RAM dump + `battle-turn-notes.md` §13 (turns 3-5
  ledgers, faint timeline, 7-item open list). Headlines: DESTIN switches
  in **PIDGEOTTO, not Murkrow** (party index 0→2 — a real AI decision,
  rule unresolved); **a KO's message is button-gated** (control run froze
  ~2996 ticks without an A press — every future script must press A at
  KOs); turn-4 falsified §12's AI-repeat prediction (DOUBLE_TEAM, not
  ENDEAVOR); Onix's Sitrus Berry auto-proc'd (player-side items
  previously unmodeled); +2 formula re-confirmed on RAM intermediates.
- **Next:** round 8 — main lane: slice C (ROCK_SLIDE window engine,
  2193→~2515: move text, monbg Grovyle-hide, BG3 shake, 20 rocks,
  hit-flash — all §9-pinned); worktree: victory scout (extend through
  Murkrow+Pidgeotto KOs to the battle-1 WIN and whatever follows — S8's
  swap-screen prep). Then slice D (drain/turn-end, closes #16's deferred
  validation) next session if time runs out.


---

## 127 — Bounded worker: **S7 slice B COMPLETE** — banner's real BG1 scroll extracted+composited, clone-edge residual root-caused to opponent-healthbox z-order — `turn1-cloneanim.json` **168/230 → 230/230**; suite 634 → **638/638**

- **State:** `npm test` **638/638** (+4 Tier-1 pins), `npm run build` green,
  tree clean. `tools/compare/traces/turn1-cloneanim.json` **230/230 - S7
  slice B ACCEPTANCE MET.** Zero regressions: turn1-kickoff 81/81,
  fight-submenu 234/235, menu-idle 69/69, sendout 255/256, s6-acceptance
  224/228, scene-assembly 256/256 - all re-verified unchanged.
- **Did (two separate green commits, per the brief):** (1) **Gap 1's 4
  sub-pixel clone-edge ticks (2075/2082/2088/2089) CLOSED** - re-verified
  the offset table bit-exact against a fresh RAM probe first (not a fit);
  root cause was DOUBLE_TEAM's clones reaching peak excursion (41-42px)
  right where their own chin/jaw tile overlaps the OPPONENT HEALTHBOX's
  right border, and this run's clone compositor painting over that
  higher-priority UI element instead of respecting its z-order.
  `isOpponentHealthboxOpaqueAt` (`battleScene.ts`) clips the clone draw.
  (2) **Gap 2 (banner) CLOSED** - new extractor `tools/extract/
  extract-stat-anim.ts` -> `stat-anim-banner.json` (reference/pokeemerald's
  `graphics/battle_anims/stat_change/` is all plain/uncompressed dev-time
  source, no LZ77 decoder needed - same situation `extract-battle-bg.ts`'s
  header already flagged; extracted the full 8-palette/2-tilemap family,
  wired only the evasion/increase pair DOUBLE_TEAM needs); rewrote
  `drawStatsBanner` to sample the real scrolling BG1 tilemap (same alpha-
  blend shape as the intro-slide's own `drawSlideScene`) instead of a flat
  white flash. The scroll anchor needed the SAME one-tick render lag `bg1X`
  already established for BG scroll registers (NOT `statsBannerEva`'s own
  no-lag convention - a different register class) - root-caused via a
  per-tick brute-force pixel sweep (`tools/compare/scratch/
  diagnose_banner.mjs`) after a naive same-tick mapping got the mechanism
  right but not bit-exact (halved the diff, didn't zero it).
- **Next:** round 8 — slice C (ROCK_SLIDE) or slice D (drain/turn-end,
  closes #16's deferred validation) — supervisor's call. The parallel
  ground-truth scout lane (turn-2, then faint-to-victory) continues
  independently.
- **Notes:** docs/battle-menu-notes.md §10 marked COMPLETE (§10c/§10d added).
  PAPERCUT: none - both residuals were exactly as scoped by #125: gap 1 was
  a real, small, root-causeable bug (not a fit), gap 2 was genuinely new
  extraction+compositing work, no rework of the already-CLOSED clone-motion
  formula needed.
## 126 — Supervisor: turn-2 scout merged — DRAGON_BREATH validates damageCalc's special branch **bit-exact**; ENDEAVOR discovered as Grovyle's AI move (HP-diff mechanic documented) — battle-1 move coverage 3→5 of 8; suite **634/634**

- **State (verified post-merge):** `npm test` **634/634**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-cloneanim re-verified
  168/230 (slice-B target, #125).
- **Did (worktree scout, verified then merged, conflict-free):**
  `battle1-turn2.json` (3846 frames, 221 captures, twice-run 0 mismatch) +
  `battle1-turn2-ram-dump.json` (953 rows, 4 probes re-run byte-identical)
  + `battle-turn-notes.md` §12: all 14 turn-2 Random() steps LCG-attributed
  (1 single-step at tick 3121 honestly open); DRAGON_BREATH (first special-
  split move probed) reproduced bit-exact by the +2-corrected formula
  (15 pre-spread → 13 final); ENDEAVOR's `setdamagetohealthdifference`
  path documented (typecalc scales then copyword restores — type only
  gates immunity); paralysis didn't proc this seed; falsifiable turn-3
  prediction recorded.
- **Next:** round 7 — main lane: slice-B completion (extract
  `gStatAnim_*` via a new LZ77-BG extractor, OBJ-window-clipped BG1-scroll
  compositor, + the 4 near-1px clone ticks → 230/230); worktree:
  faint-to-victory ground-truth scout (extend the script through
  Grovyle's KO + Murkrow send-out — S7 tail + S8 prep). Then slice C/D.

---
## 125 — Bounded worker: **S7 slice B convergence retry** — Gap 1 (clone motion) CLOSED via RAM probe, Gap 2 (banner) REFRAMED to a smaller source-confirmed residual — `turn1-cloneanim.json` **49/230 → 168/230**; suite 631 → **634/634**

- **State:** `npm test` **634/634** (+3 Tier-1 pins), `npm run build` green,
  tree clean. `tools/compare/traces/turn1-cloneanim.json` (unchanged, per
  the brief) now **168/230** (was 49/230) - acceptance (230/230) not yet
  met but both named gaps individually advanced per the brief's discipline.
  Zero regressions: turn1-kickoff 81/81, fight-submenu 234/235, menu-idle
  69/69, sendout 255/256, s6-acceptance 224/228 - all re-verified unchanged.
- **Did:** new probe `tools/probe/dump-doubleteam-sprites.py` (identifies
  the two clone sprites by `callback === AnimDoubleTeam`, `nm`-resolved
  since it's `static`) dumped their `data[]`/`x2` every tick 1955-2200
  directly off RAM. **Gap 1 CLOSED**: found the prior session's formula had
  two bugs, not the "non-uniform call cadence" it suspected - (a) the two
  clones are NOT a shared `+offset`/`-offset` table (C's arithmetic-shift
  truncation isn't symmetric around zero at small amplitude, RAM-proved:
  clone A `x2=0` but clone B `x2=-1` at the same tick, not `-0`) - fixed by
  simulating both clones independently (`DOUBLE_TEAM_CLONE_OFFSETS_A`/`_B`,
  `battleMenu.ts`); (b) the anchor tick was actually already correct once
  combined with fix (a) and this run's established one-tick render-lag
  convention - re-verified against the compare tool directly (clone window
  1964-2093: pervasive multi-KB diffs → 0 diff except 4 near-1px edge
  ticks). **Gap 2 REFRAMED**: tested `frame2` first as instructed - RAM
  disproves it outright (Grovyle's own sprite fields are perfectly flat the
  whole banner window). Re-read `StatsChangeAnimation_Step1-3` source
  directly and found the real mechanism: target-1 is **BG1** (not flat
  white, the prior session's 2-sample algebraic solve was a coincidence),
  loaded with a real scrolling stat-arrow tilemap/palette
  (`gStatAnim_Increase_Tilemap`/`gStatAnim_Evasion_Pal`) that
  `StatsChangeAnimation_Step3` scrolls via `gBattle_BG1_Y += tVelocity`
  (`tVelocity=3`) UNCONDITIONALLY every tick including the "flat eva/evb"
  hold - RAM-confirmed exact (`gBattle_BG1_Y`: flat 0 through 2129, then a
  clean `0,3,6,...,180` ramp 2130-2189, matching `tVelocity=3` exactly).
- **Next:** slice B is NOT done - gap 2's residual is now well-bounded but
  requires real new work (extract `gStatAnim_Evasion_Pal`/`_Tilemap`/`_Gfx`,
  new LZ77-BG extractor, wire an OBJ-window-clipped BG1-scroll compositor -
  the OBJ-window registers `StatsChangeAnimation_Step1` sets are almost
  certainly why the banner tracks Grovyle's silhouette instead of covering
  the whole screen) - materially larger than a formula fix, flagged for the
  next slice-B session rather than rushed. Gap 1's own 4-tick sub-pixel
  residual (2075/2082/2088/2089, 2-7px each) also left named, not chased
  further this session. Once gap 2 lands, re-run `npm run compare` for
  230/230. ROCK_SLIDE (slice C) and drain/turn-end (slice D) still queued
  behind this.
- **Notes:** docs/battle-menu-notes.md §10 restructured (§10a this
  session's findings, §10b prior attempt preserved for history, superseded).
  PAPERCUT: none - the RAM-probe-first discipline the brief mandated worked
  exactly as intended, turning two prior "grid search found no fit" dead
  ends into one closed formula bug + one correctly-scoped extraction task.
## 124 — Supervisor: FONT_NARROW branch merged (ISSUES #20 → extraction half closed, rewire half open) — **suite 631/631**; round 6 = slice-B convergence retry (two named leads) + turn-2 ground-truth scout

- **State (verified post-merge):** `npm test` **631/631** (+29), `npm run
  build` green, tree clean, no worktrees/branches. turn1-kickoff 81/81
  re-verified post-slice-B-attempt; turn1-cloneanim committed at 49/230
  (in-progress target, #123).
- **Did:** merged the FONT_NARROW lane (extractor + font-narrow.json +
  byte-exact proof vs the submenu harvest, 24 render checks 0 mismatch,
  via the engine's own drawText); trimmed ISSUES #20 to its rewire half
  (PP dynamic-color state machine + mixed-font runs, both source-traced
  in tests/fontNarrow.test.ts's header).
- **Next:** round 6 — main lane: slice-B convergence retry per #123's own
  two named probes (dense gSprites[].data[] over the clone slots;
  frame2 idle-breathing hypothesis under the banner hold) with the
  strictly-smaller-gap discipline; worktree: turn-2 ground-truth scout
  (extend the canonical script into turn 2, pin fresh RNG/damage/text —
  also cross-validates damageCalc's +2-corrected formula on new rolls).
  Then slice C (ROCK_SLIDE) + D (drain/turn-end, closes #16's deferred
  validation).

---
## 123 — Bounded worker: **S7 slice B attempted, NOT accepted** — DOUBLE_TEAM clone anim + stat banner engine code landed and wired, but `turn1-cloneanim.json` scores **49/230** (acceptance was 0 diff); two genuine unresolved mechanisms individually attributed; suite stays **602/602**, zero regressions

- **State:** `npm test` **602/602** (unchanged - no new Tier-1 pins added,
  see Notes), `npm run build` green, tree clean. New trace
  `tools/compare/traces/turn1-cloneanim.json` (canonical prefix, ticks
  1964-2193, 230 captures) committed at **49/230** - **acceptance criterion
  (0 diff) NOT met**. Zero regressions: turn1-kickoff 81/81, fight-submenu
  234/235, menu-idle 69/69, sendout 255/256, s6-acceptance 224/228 - all
  re-verified unchanged.
- **Did:** implemented and wired `battleMenu.ts`'s `doubleTeamCloneOffset`/
  `statsBannerEva` (pure tick formulas) + `battleScene.ts`'s
  `eraseGrovyleFootprint`/`drawSpriteSheetBlended`/`drawDoubleTeamClones`/
  `drawStatsBanner`, hooked into `drawFightSubmenuWindow`'s `confirmElapsed`
  branch right after slice A's `drawTurnKickoffText`. RAM/register findings
  for both windows are solid (re-verified via a fresh stride-1
  `dump-registers.py` re-probe): clone window flat `BLDCNT=0x3F40`/
  `eva=12,evb=8` 1966-2093; gap 2094-2131 exact-match baseline (no code
  needed); banner `BLDCNT=0x3F42`/`eva` ramps 0→10→0 over 2127-2193,
  `evb=16-eva`. Reverse-engineered the banner's true mechanism from raw
  pixels (two independent exact algebraic solves): it's a flat-WHITE flash
  blended IN OVER Grovyle's own real, un-hidden sprite - NOT a BG1-composited
  copy replacing it as first assumed; this fixed an early bug where `eva=0`
  boundary ticks showed background instead of plain Grovyle.
- **Two unresolved gaps, both individually attributed (docs/battle-menu-
  notes.md §10, not curve-fit)**: (1) the clone motion's per-tick advance
  rate doesn't fit any `(anchor, rate)` pair against the decoded C formula -
  long-range zero-crossings (ticks 1999/2024/2092) match the simulated
  sequence exactly, but the oracle already shows motion by tick 1970 while
  the same anchor's short-range formula predicts zero motion through 1975;
  a grid search over anchor/rate found no fit reconciling both ranges. (2)
  the banner's own hold window (2150-2171, `eva`/`evb` RAM-confirmed flat)
  shows the real sprite's OWN raw color cycling through several values
  tick-to-tick - a second, unidentified motion under the blend, not
  `menuIdleBounce` (wrong period/already frozen there). Candidate flagged
  but not tested: `grovyleFrontSprite`'s unused `frame2` asset (a species
  idle-breathing animation, never wired into any renderer).
- **Next:** (1) a dense `gSprites[].data[]` RAM probe (not pixel bboxes) for
  the two clone sprite slots across 1964-2094 to nail the true call cadence;
  (2) check whether wiring `frame2` as a periodic idle swap closes the
  banner gap; (3) then re-run `npm run compare` on the already-committed
  trace until 230/230 - the trace itself doesn't need to change, only the
  rendering formulas. ROCK_SLIDE (slice C) and drain/turn-end (slice D)
  remain queued behind this.
- **Notes:** kept the partial implementation committed rather than reverting
  (this run's "attribute, don't withhold" convention) since it's a real,
  regression-free improvement in understanding even though not yet pixel-
  exact; no new Tier-1 tests were pinned this session since the formulas are
  demonstrably not yet correct (pinning a known-wrong value would be worse
  than not pinning). PAPERCUT: none beyond the inherent difficulty of this
  specific window - the session budget went almost entirely into oracle/RAM
  forensics for a mechanism with two compounding, previously-undocumented
  sub-mechanisms (a non-uniform clone advance rate, a second sprite motion
  under the banner blend) that this session could bound but not fully solve.
## 122 — Supervisor: ROCK_SLIDE ground-truth scout merged — ticks 2094-2600 pinned stride-1 (`battle-move-anim-notes.md` §9); round-4 fold complete, suite **602/602**

- **State (verified post-merge):** `npm test` **602/602**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-kickoff 81/81 and
  fight-submenu 234/235 re-verified on the merged tree.
- **Did (worktree scout, verified then merged, conflict-free):** two dense
  stride-1 groundtruth traces (`battle1-rockslide-dense-a/b.json`,
  2094-2600 complete, twice-run 0 mismatch), two reusable probes
  (`dump-registers.py`, `dump-rockslide-sprites.py`), and §9 tick tables:
  all 20 rock spawns (4-tick cadence 2347-2423, argv-cross-verified),
  exact BG3_Y shake sequence (0,-7,-7,0,0,-7,-7,0,0,-7,-7), hit-flash
  sub-windows (healthbox wobble 2481-2500, mon blink 2482-2513, 4-tick
  cycles), text-timing tables, and a NEW finding: Grovyle's OBJ goes
  BG-composited (invisible as sprite) for 2344-2472 — the `monbg`
  mechanism, target-side. §9 ends with a pinned-vs-open list per engine
  slice B/C/D.
- **Next:** round 5 — main lane: slice B (clone anim 1964-2094 + post-
  clone gap + stat banner + evasiveness text, through 2193); worktree:
  ISSUES #20 (FONT_NARROW extraction + byte-exact validation against the
  committed submenu harvest). Then slice C (ROCK_SLIDE) and D (drain +
  turn end, which also closes ISSUES #16's deferred validation).

---
## 121 — Bounded worker: **S7 slice A landed** — move CONFIRMATION (A on ROCK_SLIDE) + turn kickoff through "Foe GROVYLE used\nDOUBLE TEAM!" — `turn1-kickoff.json` **81/81, 0 diff**; suite 593 → **602/602**

- **State:** `npm test` **602/602** (+9 net Tier-1), `npm run build` green,
  tree clean. New trace `tools/compare/traces/turn1-kickoff.json` (canonical
  `battle1-turn1.json` prefix through the 2nd A press, idle to tick 1964, 81
  dense captures) **81/81, 0 diff** - no residual, no attribution needed.
  Zero regressions: fight-submenu 234/235 (unchanged), menu-idle 69/69,
  sendout 255/256, s6-acceptance 224/228, menu-throw 78/78.
- **Did:** densely re-probed ticks 1900-2020 (own oracle trace + RAM probe,
  twice-run 0 mismatches - §11 never exercised A-confirm, only nav/B-close)
  and found: A-confirm hands off to the engine with **no visible submenu-
  close redraw at all** (unlike B's own DMA round-trip) - the submenu keeps
  showing its idle content for 9 more ticks while `gBattleMainFunc`/
  `gBattlerAttacker`/`gCurrentMove` resolve turn order (Grovyle outspeeds
  Onix), then hard-cuts atomically to the message at tick 1929
  (`gBattle_BG0_Y` 320->0). String pixel-confirmed exact: "Foe GROVYLE
  used\nDOUBLE TEAM!" (`STRINGID_USEDMOVE` + `sText_FoePkmnPrefix`), 1
  tick/char (this save's FAST speed - corrects a stale scratch-doc claim of
  2 ticks/char, now three-for-three confirmed against this cadence rule).
  Reused the existing battle-text printer (`drawMessageTextLines`/
  `battleWindow`, FONT_NORMAL) verbatim - no new asset needed, unlike the
  FIGHT submenu's own FONT_NARROW move list. The onix/healthbox bounce
  overlay stays live for 3 ticks past the press then freezes at a
  grid-searched literal tick (not the live formula's own value at that
  moment) through tick 1964. `battleMenu.ts`'s `FightSubmenuState` gains
  `confirmElapsed`; `core.ts`'s FIGHT-submenu input branch now also guards
  on `confirmElapsed === null` so no further input mutates the submenu once
  confirmed (matches the source's "controller stops polling" behavior, not
  just this trace's own idle script - a real hardening, not just a feature
  add). RNG ledger pinned via a determinism test (identical script replayed
  twice -> identical state), not a `turnRng` integration - this window
  consumes zero `Random()` calls, `turnRng` isn't wired into `core.ts` yet.
- **Next:** the clone animation (tick 1964+, DOUBLE_TEAM's own blend/motion,
  `battle-move-anim-notes.md` §8) is the immediate next window; the stat-
  change banner and ROCK_SLIDE's own resolution (accuracy/crit/damage/
  HP-drain) follow per battle-turn-notes.md §9's tick table.
- **Notes:** docs in `docs/battle-menu-notes.md` §9 (this session's own
  section, per the brief's choice). Stayed in scope (battleMenu.ts/
  battleScene.ts/core.ts + their tests, new trace, this doc's §9,
  PROGRESS.md) - did not touch battle-turn-notes.md/battle-move-anim-notes.md
  or ISSUES #5/#16/#18/#19/#20 per the brief. No PAPERCUT this session.

---
## 120 — Supervisor: **S6 → [x] (user decision — 1496 accepted/parked, ISSUES #18 policy-settled)**; healthbox-compositor branch merged (ISSUES #16 trimmed to its deferred-S7-validation stub) — **suite 593/593**; ISSUES #20 filed (FONT_NARROW gap)

- **State (verified post-merge):** `npm test` **593/593**, `npm run build`
  green, tree clean, no worktrees/branches. Sweeps re-run on the merged
  tree: fight-submenu 234/235, sendout 255/256, s6-acceptance 224/228,
  menu-idle 69/69 — unchanged, the compositor swap is pixel-neutral as
  required.
- **Did:** (1) user decided option 1 on the escalated S6 question: tick
  1496 accepted/parked permanently, ROADMAP S6 → **[x]** (commit
  17794e3), ISSUES #18 rewritten as a policy-settled attribution record
  (mirrors #5's format). (2) merged the worktree healthbox lane:
  `composeOpponentHealthbox` now drives the live send-out render (harvest
  file kept as test fixture only); two both-sides-additive
  `battleScene.ts`/test import conflicts hand-resolved, full suite run
  BEFORE the merge commit per the truncated-merge-output lesson.
  (3) ISSUES #16 trimmed to its one open debt (partial-HP/status oracle
  validation, due in S7's first HP-drain trace). (4) ISSUES #20 filed:
  FONT_NARROW was never extracted — submenu text is a battle-1-only
  harvest, blocks S8/S9 movesets (from #119's flag).
- **Next:** S7 turn execution — move confirmation (A on ROCK_SLIDE) →
  battle-script sequencing → HP-drain trace (which also validates #16's
  partial-HP path against real oracle pixels). Ground truth already
  banked: battle1-turn1.json v5 + RAM dump + §9 tick tables +
  battle-move-anim-notes. The S7 core modules (damageCalc/turnOrder/
  turnRng) are wired-ready but not yet consumed by core.ts.
- **Notes:** round 3 = 2 workers, both green first try ($4.60/11.6min +
  ~$15/47min), zero regressions. This makes 6 verified worker steps + 3
  merges today, suite 555 → 593.

## 120 — Supervisor: **S6 → [x] (user decision — 1496 accepted/parked, ISSUES #18 policy-settled)**; healthbox-compositor branch merged (ISSUES #16 trimmed to its deferred-S7-validation stub) — **suite 593/593**; ISSUES #20 filed (FONT_NARROW gap)

- **State (verified post-merge):** `npm test` **593/593**, `npm run build`
  green, tree clean, no worktrees/branches. Sweeps re-run on the merged
  tree: fight-submenu 234/235, sendout 255/256, s6-acceptance 224/228,
  menu-idle 69/69 — unchanged, the compositor swap is pixel-neutral as
  required.
- **Did:** (1) user decided option 1 on the escalated S6 question: tick
  1496 accepted/parked permanently, ROADMAP S6 → **[x]** (commit
  17794e3), ISSUES #18 rewritten as a policy-settled attribution record
  (mirrors #5's format). (2) merged the worktree healthbox lane:
  `composeOpponentHealthbox` now drives the live send-out render (harvest
  file kept as test fixture only); two both-sides-additive
  `battleScene.ts`/test import conflicts hand-resolved, full suite run
  BEFORE the merge commit per the truncated-merge-output lesson.
  (3) ISSUES #16 trimmed to its one open debt (partial-HP/status oracle
  validation, due in S7's first HP-drain trace). (4) ISSUES #20 filed:
  FONT_NARROW was never extracted — submenu text is a battle-1-only
  harvest, blocks S8/S9 movesets (from #119's flag).
- **Next:** S7 turn execution — move confirmation (A on ROCK_SLIDE) →
  battle-script sequencing → HP-drain trace (which also validates #16's
  partial-HP path against real oracle pixels). Ground truth already
  banked: battle1-turn1.json v5 + RAM dump + §9 tick tables +
  battle-move-anim-notes. The S7 core modules (damageCalc/turnOrder/
  turnRng) are wired-ready but not yet consumed by core.ts.
- **Notes:** round 3 = 2 workers, both green first try ($4.60/11.6min +
  ~$15/47min), zero regressions. This makes 6 verified worker steps + 3
  merges today, suite 555 → 593.

---
## 119 — Bounded worker: FIGHT (move-select) submenu engine slice landed — open/nav (all 4 positions)/B-close wired into core.ts, `fight-submenu.json` **234/235** (1 attributed anomaly); suite 579 → **592/592**

- **State:** `npm test` **592/592** (+13 Tier-1), `npm run build` green,
  tree clean. New trace `tools/compare/traces/fight-submenu.json`
  **234/235** (only tick 2073, a 99px row-shaped anomaly, individually
  attributed — see below). Zero regressions: menu-idle 69/69, menu-throw
  78/78, menu-text 18/18, sendout 255/256 (1496 still the only open item),
  s6-acceptance 224/228 — all unchanged.
- **Did:** `src/engine/battleMenu.ts`'s new `FightSubmenuState`
  (open/nav/close, JOY_NEW-only cursor nav with a real 1-tick display lag,
  matching §11 finding 2's empirically-confirmed no-auto-repeat) +
  `battleScene.ts`'s `drawFightSubmenuWindow` dispatcher + `core.ts` wiring
  (A opens on the settled action menu, RIGHT/LEFT/UP/DOWN nav, B closes).
  **Rendering deviates from the brief's suggestion** (glyph-rendering via
  `font-normal.json`): `B_WIN_MOVE_NAME_*`/`B_WIN_PP`/`B_WIN_MOVE_TYPE` all
  use `FONT_NARROW`, a font this codebase has never extracted (source-
  confirmed genuinely separate glyph tileset from `FONT_NORMAL`, not just
  narrower widths) — flagged as a real asset gap, sidestepped by extending
  this window's own established per-region-harvest convention (§5/§6) one
  level deeper: a static per-slot harvest (4 patches, pixel-confirmed
  byte-identical across each slot's ENTIRE dwell) composited with the
  existing, unmodified onix/healthbox bounce patches. Found and fixed a
  real 2-extra-tick-per-DMA-event drift in the bounce overlay (empirically
  pixel-fit, mechanism plausible but not RAM-confirmed — see docs/
  battle-menu-notes.md §8 for the full derivation and the grid-search that
  ruled out alternatives) and a 1-tick off-by-one in how `core.ts` stamps
  its own press-tick into new state (found via this session's own dense
  compare, unrelated to the pre-existing `sendOutPressElapsed` convention
  which stores the same value one tick earlier by an established, unfixed
  convention this session didn't touch).
- **Open item (individually attributed, not curve-fit):** tick 2073's 99px
  residual — a single row (y=111, x127-225) just below the healthbox
  bounce region's own bbox, same still-unidentified family as §11 finding
  4's own two idle-only-trace anomalies (2071/2135). Grid-searched every
  integer bounce-shift from -9 to 0; -4 is uniquely optimal at 1/66
  mismatches post-close, no better value exists. Not root-caused further
  within this session's cap.
- **Next:** move confirmation (A on a move → turn execution) is next in
  this lane, or S7 turn-execution proper (battle-script sequencing,
  HP-drain, text) per battle-turn-notes — either unblocks real turn play.
- **Notes:** stayed in scope (battleMenu.ts/battleScene.ts/core.ts +
  their tests, new extractor/asset/trace, this doc's §8, PROGRESS.md) -
  did not touch healthboxAssembly.ts/battle-turn-notes.md/ISSUES #5/#16/#18
  per the brief. No PAPERCUT this session.

## 118 — Supervisor: scout lane merged — species-types data gap closed (all 411 species) + FIGHT-submenu ground truth banked (§11) — **suite 579/579**; round 3 launched (FIGHT-submenu engine slice + ISSUES #16 healthbox wiring); S6-vs-1496 decision escalated to the user

- **State (verified post-merge):** `npm test` **579/579**, `npm run build`
  green, tree clean, worktrees/branches cleaned up. Traces: sendout
  255/256 (only 1496 open), s6-acceptance 224/228 (3 = ISSUES #5 pattern,
  1 = 1496), rest unchanged.
- **Did (worktree scout, verified then merged):**
  `tools/extract/extract-species-types.ts` → `src/data/gen/
  species-types.json` (all 411 species, spot-checked ONIX/GROVYLE/MURKROW/
  PIDGEOTTO/MAGBY/BAYLEEF correct; `damageCalc.test.ts` fixtures now
  consume it, pinned values unchanged). FIGHT-submenu ground truth:
  2 twice-run 0-mismatch groundtruth traces + `battle-turn-notes.md` §11
  (atomic submenu draw at tick 1892, JOY_NEW-only nav w/ 1-tick render
  lag, B-close RESUMES the 4-phase cycle in place, gRngValue flat, two
  single-tick anomalous idle frames flagged open).
- **Open question (escalated, non-blocking):** accept/park 1496 and tick
  S6 [x] (s6-acceptance 224/228 all-attributed), vs build persistent
  whole-scene `sSpriteOrder` state (§7.32 documents why a general fix
  needs it), vs leave S6 [~]. Default if unanswered: leave [~], continue
  S7.
- **Next:** verify round 3 (FIGHT-submenu engine slice vs §11;
  healthbox-assembly wiring per ISSUES #16), then S7 turn-execution
  slices (battle-script sequencing, HP-drain, text) per battle-turn-notes.

---
## 117 — Bounded worker: closed ISSUES #18's 1494/1495 (a one-tick `drawOpponentSummaryExit` clock stall, found empirically) — `sendout.json` **253/256 → 255/256**; 1496 read source-first per the brief (`CreateSprite`/`CreateSpriteAtEnd`/`SortSprites`), root mechanism identified and documented, no fix shipped — it needs whole-scene persistent state this engine doesn't model, not a tweak

- **State:** `npm test` **576/576** (+1 Tier-1), `npm run build` green, tree
  clean. Full sweep vs. live oracle: sendout **255/256** (was 253/256,
  only 1496 open), s6-acceptance 224/228 (unchanged — 1494/95 aren't its
  sampled frames, only 1496 is, and 1496 didn't move), menu-throw 78/78,
  menu-materialize 62/62, menu-idle 69/69, menu-text 18/18, scene-assembly
  256/256, transition 206/206 — zero regressions.
- **Did (1496 first, source-first per the brief):** read `sprite.c`'s
  `CreateSprite`/`CreateSpriteAtEnd`/`SortSprites`/`ResetAllSprites` in full.
  Falsified the standing assumption (ISSUES #18/§7.31): send-out particles
  use plain `CreateSprite` (`battle_anim_throw.c:1615`, via
  `PokeBallOpenParticleAnimation`), NOT `CreateSpriteAtEnd` (that allocator
  is real in this scene, but only for the summary bar's icons/healthbox).
  Real finding: `sSpriteOrder` is a PERSISTENT 64-slot permutation reset to
  identity only once (`ResetAllSprites`, battle start) and insertion-sorted
  in place every frame thereafter; on an exact tie (this residual's exact
  case) no swap fires, so two tied slots keep whatever relative order they
  inherited from the ENTIRE prior history of every sprite (any kind) that
  ever occupied those two slot numbers — not their spawn index or raw slot
  number. Resolving slots 6-vs-23's real order at tick 1496 would require
  simulating that whole-scene history as persistent state, a materially
  bigger architecture change than this engine's current stateless per-burst
  Y-sort — out of proportion to a 3px fix and exactly the regression risk
  the brief's sweep-mandate warns about. No fix shipped (a special-cased
  swap would be undocumented curve-fitting, §7.25's own already-reverted
  mistake). Full derivation with source line cites: `docs/battle-scene-
  notes.md` §7.32.
- **Did (1494/1495, with the time this freed up):** extended
  `tools/compare/scratch/diag_1493.mjs` (not rewritten) to bisect the exact
  boundary empirically. Naively extending the draw window while letting
  `elapsed` keep incrementing over-corrects exactly as §7.31 found
  (position slides 2px/tick past where the real sprite stopped). Freezing
  at `elapsed=30` closes 1494 but not 1495; resuming at `elapsed=31` closes
  1495 but not 1494 — both close together once modeled as a one-tick STALL:
  `elapsed = rawElapsed<=30 ? rawElapsed : rawElapsed-1` (render 1494 repeats
  1493's own `elapsed=30`, render 1495 resumes normal counting from there).
  Same stall family as §7.18's already-documented particle stall; plausible
  (not independently RAM-confirmed this session) shared cause is the
  RAM-confirmed slot destroy/reuse event §7.31 already found. New Tier-1
  test pins both the frozen 1494 edge and the resumed, wider 1495 edge.
- **Next:** ISSUES #18 now names only 1496, with a documented architectural
  reason a general fix doesn't fit this engine's current sprite-sort model
  — a future session should decide whether whole-scene persistent
  `sSpriteOrder` state is worth building (S6 → [x] blocker otherwise stays
  parked) or accept it per the run's no-blind-fit policy. S7 (turn
  resolution) otherwise unblocked and is probably the better next lane.
- **Notes:** stayed within scope (`battleScene.ts`, `tests/
  battleScene.test.ts`, `docs/battle-scene-notes.md`, `ISSUES.md`,
  `PROGRESS.md`, `tools/compare/scratch/diag_1493.mjs` extended). No new
  probe scripts needed — the existing five from #115/§7.31 plus source
  reading sufficed. No PAPERCUT this session.

---
## 116 — Supervisor: S7 BEGUN — turn-resolution pure-logic core merged (worktree lane) — damage calc / turn order / RNG ledger hermetically pinned vs the committed RAM dump; **suite 556 → 575/575**; found+fixed a real `+2` bug in the groundwork's damage formula

- **State (verified post-merge):** `npm test` **575/575** (+19 Tier-1),
  `npm run build` green, tree clean at the merge commit, worktree/branch
  cleaned up. Trace counts unchanged from #115 (sendout 253/256,
  s6-acceptance 224/228, rest at their established counts).
- **Did (worktree lane, run parallel to #115, verified then merged):** new
  `src/engine/damageCalc.ts` (`CalculateBaseDamage` bit-exact for battle
  1's physical branches + crit/STAB/type/spread/accuracy),
  `src/engine/turnOrder.ts` (`GetWhoStrikesFirst` incl. the synthetic-only
  `Random()&1` speed-tie test), `src/engine/turnRng.ts` (the 12-step
  turn-1 ledger, reusing S3's LCG). All pinned vs
  `battle1-turn1-ram-dump.json` LCG transitions (accuracy 2310 / crit 2334
  / spread 2337, v5 ticks), `docs/battle-turn-notes.md` §10.
  **Two groundwork corrections, both supervisor-verified in source:**
  (1) `CalculateBaseDamage` ends with an unconditional `return damage+2`
  (`pokemon.c:3371`) — both prior dossier sessions missed it; the
  LCG-decoded real spread roll proves Rock Slide's pre-STAB damage is 32
  (not 30), progression 32→48→42 now exact. (2) `turn-resolution-notes.md`
  §6's Fury Cutter case had a stat typo (def56 = Grovyle's own defense;
  real defender Onix def=187) and its "crit×2" conclusion was an artifact
  of the missing +2 — corrected case pinned instead.
- **Next:** (1) main lane: ISSUES #18 remainder (1494-95 bar boundary,
  1496 particle tie-break via the named `CreateSpriteAtEnd`/`sSpriteOrder`
  source read); (2) worktree lane: scout-ahead — FIGHT-submenu/move-select
  ground truth + the flagged species-types data gap (no committed JSON has
  opponent-side species types; worker used a source-cited fixture);
  (3) then wire the S7 core into turn execution (battle-script
  sequencing, HP-drain timing, text) per battle-turn-notes.
- **Notes:** worker was hermetic as briefed (no oracle/probes); flagged
  the species-types gap instead of probing — correct call. Merge was
  conflict-free (disjoint files by design).

---

---

## 115 — Bounded worker: closed ISSUES #18's tick 1493 (bar composites at `eva=0`, not "skip drawing") — `sendout.json` **252/256 → 253/256**; 1494/95 (bar) + 1496 (particle tie-break) investigated with 6 fresh RAM probes, left open with concrete negative findings (no curve-fit)

- **State:** `npm test` **556/556** (+1 Tier-1), `npm run build` green, tree
  clean. Full sweep: sendout **253/256** (was 252/256), s6-acceptance
  224/228 (unchanged — its own sampled frames are 40/120/192, ISSUES #5's
  pattern, re-confirmed still exactly x88-151, + 1496, this session's own
  remaining residual; 1493 isn't one of its sampled frames), menu-throw
  78/78, menu-materialize 62/62, menu-idle 69/69, menu-text 18/18,
  scene-assembly 256/256, transition 206/206 — zero regressions.
- **Did:** pixel-classified 1493-96 first (`tools/compare/scratch/
  diag_1493.mjs`/`crop_1493.mjs`, committed): 1491/1492 already 0px (closed
  incidentally by #112/§7.30's earlier fixes, not realized until now);
  1493-95 is a clean diagonal edge, app=Grovyle's flat tint, oracle=the
  window's own faded background; 1496 is a literal 2-color swap between two
  particles. Executed §7.29's named VRAM-tile-bytes lead for 1493-95
  (`probe_grovyle_vram.py`/`probe_grovyle_palette.py`/`probe_bar_vram.py`,
  all committed): Grovyle's own tile/accumulator/y2/rotation/palette are
  ALL byte-exact vs. the static extraction across the whole window (a clean
  negative — not the bug); the bar's own tile IS byte-exact too, through
  RAM tick 1493, THEN jumps to a totally different graphic at RAM 1494
  (destroyed+reused, the exact `open.png` pattern recurring). The REAL bug
  was a compositing-model gap the VRAM read incidentally surfaced:
  `drawOpponentSummaryExit` returned early once `blend` hit 0, treating
  "no blend" as "sprite absent" — but real hardware still composites a
  `blend=0` sprite as 100% target-2 (the plain, correctly-faded background,
  hand-verified bit-exact against `SENDOUT_BG_FADE_Y`). Fixed by replacing
  the early return with `SUMMARY_EXIT_LAST_ALIVE_ELAPSED=30` (draw through
  blend=0, stop only once the RAM-confirmed sprite-reuse actually happens).
  Tried extending to render 1494 (bar's tile is STILL genuine there per the
  same VRAM probe) — empirically over-corrects (3 new wrong pixels), so
  left at exactly render 1493, not shipped wider than verified.
- **1496 (particle z-order, §7.25/7.28's long-standing gap)**: RAM-derived
  the pixel-exact tie-break winner from oracle colors (spawn index 14 must
  beat 13, opposite of this engine's current rule) and RAM-probed both
  particles' real `gSprites[]` array positions (`probe_particle_slots.py`,
  committed) to test the one cheap hypothesis (slot-reuse scrambling
  creation order) — ruled OUT (array order matches spawn-index order
  exactly, no scrambling found). Real mechanism likely lives in
  `CreateSpriteAtEnd`'s actual `sSpriteOrder` semantics, not read this
  session (out of RAM-probe budget) — named, not guessed at, in ISSUES #18
  and `docs/battle-scene-notes.md` §7.31.
- **New Tier-1 test** (`tests/battleScene.test.ts`) pins the render-1493
  fix: both newly-fixed pixels equal the faded background, plus a same-tick
  control pixel a few columns over that must STILL show Grovyle's tint.
- **Next:** ISSUES #18's remainder — 1494/95 (bar, narrower-than-modeled
  real boundary) + 1496 (particle tie-break, `sSpriteOrder`/
  `CreateSpriteAtEnd` source read needed) — both have concrete RAM findings
  recorded (§7.31), don't re-run the five clean RAM probes already done.
  S7 (turn resolution) otherwise unblocked whenever picked up.
- **Notes:** stayed within scope (`battleScene.ts`, `tests/
  battleScene.test.ts`, `docs/battle-scene-notes.md`, `ISSUES.md`,
  `PROGRESS.md`, `tools/compare/scratch/*`) per the brief. Seven new
  scratch scripts committed (3 JS pixel diagnostics + 4 Python RAM/VRAM
  probes, cited directly by §7.31's findings) since a future session
  picking up 1494/95/1496 should be able to re-run them without rebuilding
  from scratch. No PAPERCUT this session.

---

## 114 — Supervisor wind-down: session end 2026-07-19 ~06:00 — S6 chain COMPLETE and acceptance-trace-committed (`s6-acceptance.json` **224/228**, every diff attributed); `sendout.json` **214 → 252/256**; suite **477 → 555**; 15 verified worker steps across two lanes

- **State (verified this minute):** `npm test` **555/555**, `npm run
  build` green, tree clean at `b5a499e`, no worktrees, no unmerged
  branches. Trace suite (23 committed): s6-acceptance 224/228 (3 frames =
  ISSUES #5's user-settled WIN0V pattern, x88-151-verified; 1 frame =
  ISSUES #18's 3px particle z-order tick 1496), sendout 252/256 (open:
  1493-96 only, ISSUES #18), menu-text 18/18, menu-throw 78/78,
  menu-materialize 62/62, menu-idle 69/69, scene-assembly 256/256,
  transition 206/206, all draft/room/summary traces at their long-
  established counts. ROADMAP: S6 → **[~]** with recorded status (not [x]
  while #18's 4 ticks stand; RNG-exactness + opponent-pin criteria met).
- **Session summary (supervised, ~23:50-06:00, 15 worker steps + 7
  supervisor merges, every step verified green before folding):** built
  the ENTIRE player-send-out→action-menu window from zero — text print,
  Brendan throw + ball arc + first true-rotation affine sampler (ball
  spin), materialize (BG fade twin, particles, color-fade + settle
  wobble), healthbox slide-in (RAM-exact), atomic menu draw + closed-form
  idle (literal gSineTable — gbaSin is ±1 off at indices 62/63).
  Sendout climbed 214→252 via: silhouette-edge render-lag+y2 (§7.21),
  harvest-bleed mask + §7.22 re-apply (§7.23), late-window compositing
  move (§7.24), the ball's REAL 3rd frame (open.png runtime VRAM
  overwrite, §7.25), SortSprites Y-tiebreak (§7.27), OBJ-vs-OBJ blend
  target-2 hardware quirk (#112 — also closed menu-throw's 8 ticks), and
  tick 1462's twin mechanisms (§7.30). Two wrong models were falsified by
  RAM before shipping (§7.21 shared-root, §7.26 creation-order). ISSUES
  #17 opened+closed same session; #18 filed+trimmed to 1493-96.
- **Next:** (1) ISSUES #18's remainder — 1493-95 (§7.29's untested VRAM
  tile-byte lead) + 1496 (particle z-order) → then S6 → [x] (or user
  re-scope); (2) S7 begins: turn resolution (docs/battle-turn-notes.md /
  turn-resolution-notes.md groundwork exists), fold ISSUES #16's
  healthbox-assembly wiring + deferred partial-HP/status oracle
  validation into its first drain trace; menu-idle window's harvested
  base can be regenerated from the engine's own render now that the
  chain is complete (cheap cleanup, noted #110); (3) S4 remainder stays
  deferred behind S5-S8 per the recorded re-scope.
- **Notes:** no usage-limit events all session. Two battleScene.ts merge
  conflicts (both both-sides-additive, hand-resolved; one briefly
  committed with markers — caught by the immediate post-merge test run,
  amended, and PAPERCUTS-noted via the truncated-merge-output lesson).
  PAPERCUTS gained 2 entries (baseline-A/B-first; extractor drops
  grovyleFrontAnim). Worker cost ~\$7/step avg, 9-39 min/step.

---
## 113 — Bounded worker: closed ISSUES #18's first bullet — sendout tick 1462 (1161px, §7.19's named "settled-bar gap + trainer-exit tail") — both co-located mechanisms fixed — **sendout.json 251/256 → 252/256**

- **State:** `npm test` **555/555** (+1 net: 1 corrected + 1 new Tier-1),
  `npm run build` green, tree clean. Full battle-family sweep against the
  live oracle: sendout **252/256** (was 251/256), scene-assembly 256/256,
  transition 206/206, menu-text 18/18, menu-throw 78/78, menu-materialize
  62/62, menu-idle 69/69, s6-acceptance 224/228 (unchanged — 1462 isn't one
  of its sampled ticks), draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66 — zero regressions.
- **Did:** pixel-classified 1462's 1161px diff by bounding box first
  (`tools/compare/scratch/diag_1462*.mjs`, throwaway): 365px sat outside
  the trainer's 64x64 bbox (icon/bar row), 796px inside it — confirming
  §7.19's two co-located, non-overlapping mechanisms. **(a) Settled-bar
  gap**: `drawSendOutHandoff` skipped the opponent bar+icons entirely at
  `t===handoffTick` (`drawBallIcons` always passed `opponent:false`;
  `drawOpponentSummaryExit` gates on `elapsed>=0`, i.e. handoff+1) — fixed
  with the exact one-line call §7.19 already named:
  `drawBallIcons(fb, t, {opponent: t === handoffTick, ...})`, reusing the
  existing settled-render path. Closed 365px→0. **(b) Trainer-exit tail**:
  NOT a new mechanism — `trainerExitX`'s own already-RAM-probed table
  (`TRAINER_EXIT_X2`) skipped its own index 0 (`et<0` fallback to unshifted
  `OPPONENT_CORNER.x`), so render 1462 showed x2=0 instead of the RAM-true
  x2=2 (`sendout-trainer-exit2.json`'s `sprite4x2`, re-probed live: reads 2
  at RAM 1461, +1 render lag lands at render 1462). §7.19's own "invisible
  at the pixel level" call on this value was wrong — a real 2px OAM shift,
  confirmed independently by an exhaustive oracle-pixel dx/dy sweep
  (`shift_1462.mjs`) landing on the identical +2 before the RAM probe was
  even re-run. Fixed by prepending `2` to `TRAINER_EXIT_X2` and dropping
  the `-1` from the index (`et = t - handoffTick`) — pure index-shift, the
  destroy-cutoff tick (1499) unchanged (verified by hand). Closed 796px→0.
  Tick 1462 is now bit-exact.
- **One pre-existing Tier-1 test corrected**: `tests/battleScene.test.ts`'s
  "opponent party-summary despawn" test asserted
  `pixelAtSentOut(1493,...) === pixelAtSentOut(1462,...)`, which passed
  before only because BOTH ticks accidentally showed background under bug
  (a). With 1462 now correctly showing the icon's own settled color
  `(74,66,90)`, rewrote the test to pin the three ticks' literal
  oracle-confirmed colors instead of the since-invalidated relationship.
- **Next:** ISSUES #18's remaining bullets (1493-95 blended-edge tail,
  1496 particle z-order — both explicitly out of scope for this step,
  untouched); S6 acceptance stays [~] until those close.
- **Notes:** stayed within `src/engine/battleScene.ts` +
  `tests/battleScene.test.ts` + `docs/battle-scene-notes.md` (new §7.30) +
  `ISSUES.md` (trimmed #18's first bullet), per the brief. No new
  committed artifacts (reused `sendout-trainer-exit2.json`, already
  committed); scratch diagnostic scripts intentionally not committed, per
  this file's own throwaway precedent. No PAPERCUT this session.

---
## 112 — Bounded worker: closed `menu-throw.json`'s last 8 excluded ticks (1581-83/1589-91/1597-98) — root cause was NOT icon timing (both RAM-exact) but `blendedSetPixel`/`blendedTile`'s blend target-2, a real GBA OBJ-vs-OBJ hardware quirk — **70/78 → 78/78**, `sendout.json` incidentally 246/256 → 251/256 — **S6 chain (send-out → materialize → idle) fully 0-diff, contiguous, no known gap left**

- **State:** `npm test` **554/554** (+4 Tier-1), `npm run build` green, tree
  clean. Full 23-trace sweep against the live oracle at #111's exact counts
  except two: menu-throw **78/78** (was 70/70+8 excluded) and sendout
  **251/256** (was 246/256, free improvement, same fix) — every other trace
  unchanged (accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67,
  confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu
  38/38, example 4/4, menu-idle 69/69, menu-materialize 62/62, menu-text
  18/18, rent-3picks 157/190, rent-slot1 125/139, room-entry 110/110,
  room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  summary-info-magby 132/132, summary-info-onix 122/122, transition
  206/206, walk-warpout 125/125) — zero regressions.
- **Did:** per the brief, pixel-classified first: the 8 ticks' mismatch
  pixels sit inside **Brendan's own sprite footprint**, not near the
  player-icon region docs assumed — the icon's accelerating exit slide
  travels there fast (icon 0 alone: -84px by tick 1581, -198px by 1585).
  RAM-probed both sprites directly (new `tools/probe/specs/menu-throw-icon-
  exit-timing.json`: `gSprites[3]`/`gSprites[54..59]` `.x2`,
  `gTasks[0..15]` func+`tBlend` scan) across ticks 1560-1611 — both
  `brendanThrowDx` and `playerSummaryIconExitDx`/`playerSummaryFadeEva`
  reproduce RAM **bit-exact at every tick, programmatically verified** —
  ruling out timing/position on either side, exactly as `battle-scene-
  notes.md` §7.26 already ruled out draw order. **Real root cause**: real
  GBA OBJ hardware tracks only the single TOPMOST sprite pixel per dot —
  when the icon (blend target-1) is topmost and Brendan is genuinely
  beneath it, hardware target-2 falls through to the BG layer, never to
  Brendan's own color, since there's no "2nd OBJ pixel" for the blend
  circuit to see. This codebase's `blendedSetPixel`/`blendedTile`
  (`battleScene.ts`) instead blended against whatever the painter's-
  algorithm framebuffer already held (Brendan's raw color) — confirmed
  arithmetically before touching code: `blend(iconColor, backgroundColor)`
  reproduces the oracle's tick-1581/(73,89) `(117,111,131)` exactly;
  `blend(iconColor, brendanColor)` gives the wrong `(61,59,88)` this
  codebase was actually drawing. Fixed by resolving target-2 from
  `healthboxBackgroundColorAt` (an existing helper, reused not duplicated)
  instead of `fb`'s accumulated content.
- **Regression caught by the full sweep before landing** (not shipped
  blind): the fix immediately broke 3 previously-passing ticks (1646-1648,
  `sendout.json` unaffected) — once `playerSummaryFadeEva` bottoms out at 0
  (tick 1605+, real hardware destroys the sprites there,
  `Task_HidePartyStatusSummary_BattleStart_2`), blending at eva=0 was only
  a no-op against the OLD (wrong) target-2; against the new correct
  background target-2 it instead re-painted background over the thrown
  ball's own later animation every tick. Fixed the same way
  `drawOpponentSummaryExit` already handles its own analogous case
  (`if (blend <= 0) return`) — `drawBallIcons` now stops drawing the player
  bar/icons entirely once `playerEva` reaches 0, matching real destruction.
- **Widened `tools/compare/traces/menu-throw.json`**: `captureFrames` from
  70 (1574-1651 minus the 8 excluded) to the full contiguous 1574-1651 (78)
  — **78/78 at 0 diff**. 4 new Tier-1 tests (`tests/battleMenu.test.ts`)
  pin one oracle-verified pixel per excluded tick group plus the
  destroy-cutoff regression guard.
- **Next:** S6 acceptance trace (uniform grid, anchor→1810, supervisor's
  per the brief); `sendout.json`'s remaining 5 ticks (1462, 1470/71/79,
  1491-96 minus whatever this fix already closed — opponent-side,
  concurrent worktree's lane); no other known gap in the S6 chain.
- **Notes:** stayed within `battleMenu.ts`/`battleScene.ts` (a shared
  render-utility fix, `blendedSetPixel`/`blendedTile`/`drawBallIcons` —
  used by both player and opponent code, hence `sendout.json`'s free
  improvement) + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`
  (new §3c), per the brief. New committed artifact: `tools/probe/specs/
  menu-throw-icon-exit-timing.json`. Did not touch `docs/battle-scene-
  notes.md`/`tests/battleScene.test.ts` or `s6-acceptance.json` (left
  untouched, uncommitted, supervisor's). No PAPERCUT this session.

---

## 111 — Bounded worker: closed ISSUES #17 (ONIX color-fade-to-true-color + settle wobble) — `menu-materialize.json` **12/12 → 62/62** (widened 1652-1663 to 1652-1741+samples), also found+fixed two pre-existing bugs it was masking — **the S6 chain (send-out → settled action menu) now has NO unimplemented window**

- **State:** `npm test` **550/550** (+5 Tier-1), `npm run build` green, tree
  clean. Full 23-trace sweep against the live oracle at #110's exact counts
  (accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67, confirm-flow
  79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu 38/38,
  example 4/4, menu-idle 69/69, menu-materialize **62/62** (was 12/12),
  menu-text 18/18, menu-throw 70/70, rent-3picks 157/190, rent-slot1
  125/139, room-entry 110/110, room-msgbox 142/142, room-npcs 98/98,
  scene-assembly 256/256, sendout 246/256, summary-info-magby 132/132,
  summary-info-onix 122/122, transition 206/206, walk-warpout 125/125) —
  zero regressions.
- **Did:** RAM-probed the fade+wobble directly (new
  `tools/probe/specs/menu-player-materialize-taskfade.json`, a full
  `gTasks[0..15]` scan reusing `sendout-grovyle-taskfade.json`'s own watch
  shape, plus `gSprites[6].y2`), cross-validated a second, independent way
  (brute-force pixel decode against `battle1-menu-dense.json`, `tools/
  compare/scratch/menu-audit/decode_player_tint_scratch3.mjs`) — both agree
  at all 39 checked ticks. **Color fade**: `Task_FadeMon_ToNormal_Step`'s
  `tCoeff` (16→0) collapses to a clean closed form once the render lag is
  folded in — 16 constant through render 1675, then -1/tick, true color at
  1691 (`playerMaterializeSettleTintCoeff`, `battleMenu.ts`). **Settle
  wobble**: NOT `DoBounceEffect` (ruled out — wrong amplitude, wrong trigger
  window) — it's ONIX's own species back-sprite entrance animation
  (`BattleAnimateBackSprite`→`GetSpeciesBackAnimSet(SPECIES_ONIX) =
  BACK_ANIM_V_SHAKE`, source-confirmed), a genuine third mechanism exactly
  as `docs/battle-menu-notes.md` §3 item 5 warned — kept as a literal
  RAM-derived table (`PLAYER_SETTLE_WOBBLE_Y2_TABLE`) per this run's own
  convention for exactly this situation. Settles permanently at **1702**,
  independently matching PROGRESS #109's own corrected settle pin (two
  unrelated derivations, same tick). New `drawPlayerMaterializeSettle`
  (`battleScene.ts`) reuses the existing `drawSpriteSheetAffineStretch`
  primitive at the identity matrix purely for its palette+tintCoeff blend
  support.
- **Two pre-existing bugs found and fixed, both masked until now by the much
  larger ONIX-missing gap they happened to overlap**: (1) `brendanThrowFrame`
  used `null` for both "before the throw" and "table exhausted" (a "table
  truncated both ends" case) — `drawSendOutHandoff` conflated the two and
  redrew Brendan's settled on-screen pose at `PLAYER_CORNER` (48,48) once
  his own throw-frame table ran out (render 1690+), when the real game has
  him long gone off-screen; fixed by gating on `t < BRENDAN_THROW_START_TICK`
  directly. (2) `drawPlayerBallOpenParticles` never had its own upper tick
  cutoff (live through render 1692 already) but was missing the SAME
  one-tick RAM-stall correction (`PARTICLE_STALL_LOGICAL_TICK`/
  `PARTICLE_LATE_SPAWN_START_INDEX`) the opponent's own particle function
  already has — a prior session explicitly left it unported since the
  window's then-relevant range stopped short of where it mattered; porting
  it verbatim closed the remaining 104px→13px residual to 0.
- **Widened `tools/compare/traces/menu-materialize.json`**: `captureFrames`
  1652-1710 contiguous + 1720/1730/1741 samples (62 total; the 1702-1741
  hold is one sha per #109, a few samples suffice — `menu-idle.json` owns
  1742+) — **62/62 at 0 diff**. 5 new Tier-1 tests
  (`tests/battleMenu.test.ts`) pin the coefficient ramp, the wobble table
  (incl. the 1693≡1700 phase match the docs' own sha comparison
  independently found), and 5 oracle-pinned pixel samples.
- **With this landed, the S6 chain has NO unimplemented window left**:
  `menu-throw.json` (1574-1651, 70/70) → `menu-materialize.json`
  (1652-1741+, 62/62) → `menu-idle.json` (1742-1810, 69/69) are contiguous
  and all 0-diff.
- **Next:** S6 acceptance trace (uniform grid, anchor→1810 — supervisor's,
  per the brief); remaining known polish, all pre-existing and unrelated to
  this step: menu-throw's 8 icon-exit ticks (§7.26's icon
  `eva`/`iconExitDx` lead, not a reorder), `sendout.json`'s 10 remaining
  ticks (1462, 1470/71/79, 1491-96 — opponent-side, the concurrent worktree
  lane's).
- **Notes:** stayed within `battleMenu.ts`/`battleScene.ts` additive hooks +
  `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md` + `ISSUES.md`
  (deleted #17), per the brief. New committed artifacts: `tools/probe/specs/
  menu-player-materialize-taskfade.json`, `tools/compare/scratch/menu-audit/
  decode_player_tint_scratch3.mjs`. Did not touch the opponent-side sendout
  internals (1491-96, concurrent worktree's) or `docs/battle-scene-notes.md`/
  `tests/battleScene.test.ts`. No PAPERCUT this session.

## 110 — Supervisor: menu-idle branch merged (two-file conflict, hand-resolved incl. a marker that briefly slipped into the merge commit — caught by the post-commit test run, amended before push) — `menu-idle.json` **69/69**; S6 chain has ONE unimplemented window left (1664-1741, ISSUES #17)

- **State (verified post-merge, amended commit):** `npm test` **545/545**,
  `npm run build` green, tree clean. menu-idle 69/69, menu-materialize
  12/12, sendout 246/256, scene-assembly 256/256, menu-throw 70/70,
  menu-text 18/18, transition 206/206, anchor 1/1.
- **Did:** merged `worker/wt-20260719-034821` (action-menu window
  1742-1810): closed-form idle generator (`menuIdleBounce` + literal
  `gSineTable` copy — the `Math.sin`-derived `gbaSin` is off by 1 at
  indices 62/63, which would have produced phantom y2=2 frames at ticks
  1767/1804 inside this very window), atomic menu draw, teal blank pinned
  to `TryDoEventsBeforeFirstTurn`'s `BattlePutTextOnWindow(gText_
  EmptyString3)`, cursor tiles byte-verified. Window base is
  oracle-harvested composition (sibling healthbox work was in flight) —
  honest, documented; regenerating it from the engine's own render once
  #17 closes is a cheap future cleanup. Conflicts: battleScene.ts (2
  regions) + battleMenu.ts (1 region), all both-sides-added — resolved
  keeping both; the battleMenu.ts markers initially slipped into the
  merge commit (compound-command tail truncated the conflict list),
  caught immediately by the test run, amended.
- **Next:** (1) main lane — ISSUES #17 (ONIX color-fade to true color +
  settle wobble, 1664-1701, the LAST unimplemented S6 window; RAM leads
  filed in the issue); (2) worktree — sendout 1491-96 (biggest remaining
  span, opponent-side internals); (3) then S6 acceptance trace (uniform
  ~250-capture grid anchor→1810), remaining polish (menu-throw's 8
  icon-exit ticks, 1470/71/79, 1462), wind-down before 07:55.
- **Notes:** sendout remaining: 1462, 1470/71/79, 1491-96 (10 ticks).
  menu-throw's 8 ticks: §7.26 disproved the order hypothesis; icon
  fade/exit timing is the standing lead.

---
## 109 — Bounded worker: player healthbox slide-in implemented, RAM-exact and region-isolated 0-diff — but found + corrected a wrong settle-tick pin (real settle 1702, not 1693/1696) and the assigned full-frame trace-closure acceptance criterion is BLOCKED by a separate, pre-existing, already-named ONIX materialize-tail gap (new ISSUES #17)

- **State:** `npm test` **530/530** (+8 Tier-1), `npm run build` green, tree
  clean. Full 22-trace sweep against the live oracle: every trace at #108's
  exact counts (accept-prebattle 137/137, anchor 1/1, confirm-decline
  67/67, confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66,
  draft-menu 38/38, example 4/4, menu-materialize **12/12** (unchanged,
  deliberately not widened - see below), menu-text 18/18, menu-throw 70/70,
  rent-3picks 157/190, rent-slot1 125/139, room-entry 110/110, room-msgbox
  142/142, room-npcs 98/98, scene-assembly 256/256, sendout 246/256,
  summary-info-magby 132/132, summary-info-onix 122/122, transition
  206/206, walk-warpout 125/125) — zero regressions.
- **Did:** implemented the PLAYER healthbox slide-in end-to-end:
  RAM-probed `gSprites[0]` directly (`tools/probe/specs/menu-player-
  healthbox.json`, new) rather than pixel-fitting — `x2` starts **110** at
  RAM tick 1666, steps **-5/RAM-tick**, settles **0** at RAM tick 1688;
  `oam.priority` reads **1**. With this window's established +1 render lag,
  the box is first visible at trace tick **1667** (`dx=110`), settles
  (`dx=0`) at **1689**, holds through at least 1741. Pixel-harvested the
  settled content (`extract-menu-healthbox-player.ts` → new
  `src/assets/gen/menu-healthbox-player.json`, bbox `(127,74)-(229,109)`,
  103×36) from `battle1-menu-dense.json`'s own tick 1730, built the
  content mask up front (§7.23's lesson, not discovered after the fact) —
  `getMenuHealthboxPlayerContentMask`/`drawMenuHealthboxPlayer`,
  `battleScene.ts`, wired into `drawSendOutHandoff`. **No spatial overlap
  with ONIX found** (pixel-checked directly) — the brief's own working
  assumption that this window needs #108's SortSprites z-order model was
  disproved for this specific mechanism; no such code was added. Verified
  the mechanism in total isolation: comparing just the healthbox's own bbox
  region against the oracle across ticks 1653-1711 gives **0px diff at
  every tick**, slide and settled alike. 8 new Tier-1 tests
  (`tests/battleMenu.test.ts`) pin the RAM-derived table, geometry, and two
  oracle-pinned pixel samples.
- **Found and corrected a pre-existing wrong pin**: the brief's own
  "scene settles at pinned tick 1693" (inherited from
  `docs/battle-menu-notes.md` §1) is **wrong** — re-verified via two fresh
  `bin/oracle run` replays (byte-identical) plus an independent cross-check
  against `battle1-intro.json`'s identical script: the real, permanent
  static hold starts at trace tick **1702**; ticks 1693-1701 oscillate
  (tick 1693 and 1700 share an identical sha, a 7-tick round-trip) rather
  than settling cleanly. Corrected in `docs/battle-menu-notes.md` §1/§3a.
- **Why the trace can't close (not this session's mechanism, not
  introduced this session)**: every tick from ~1664 onward already has a
  full-frame mismatch regardless of the healthbox, because nothing draws
  ONIX at all past `PLAYER_MATERIALIZE_END_TICK` (1663) — the
  "coefficient-fade-to-true-color... entangled with idle-bob" gap §3 item 5
  already named and deliberately deferred is real, not a formality
  (empirically re-checked: best-candidate plain-sprite tick still
  mismatches by 632px in isolation, no clean single tick closes it) — plus
  a small ONIX-owned ground-shadow triangle tied to the same tail. Filed as
  **ISSUES #17** with RAM-probe leads (`gPaletteFade`, ONIX's own
  `gSprites[6]`) for a future session. Per this run's own harvest-first
  precedent (`sendout.json` held a fixed score across several sessions
  while solved piece by piece), `menu-materialize.json` stays unwidened
  past 1663 (still 12/12, zero regression) rather than widened with
  captures that would fail on a mechanism this step doesn't own; a sibling
  `menu-healthbox.json` trace was considered and rejected for the same
  reason (every candidate tick already fails full-frame on the ONIX gap
  alone, independent of the healthbox).
- **Next:** ISSUES #17 (ONIX materialize-tail: palette-fade + settle
  wobble) is now the hard blocker for closing any menu-window trace past
  1663 — RAM-probe `gPaletteFade`/ONIX's own sprite fields per #17's own
  leads before attempting a pixel-fit. Once closed, revisit whether
  `menu-materialize.json` should widen all the way to 1702+ or a new
  trace should own the healthbox+ONIX-settled window. Menu draw/idle slice
  is the concurrent worktree lane's (separate docs file, not touched here).
- **Notes:** stayed within `battleMenu.ts`/`battleScene.ts` additive hooks
  + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`/`ISSUES.md`,
  per the brief. New committed artifacts: `tools/extract/extract-menu-
  healthbox-player.ts`, `src/assets/gen/menu-healthbox-player.json`,
  `tools/probe/specs/menu-player-healthbox.json`. Did not touch
  `battleScene.ts` opponent-side internals, `sendout.json`, or the
  1694-1741 static hold/1742+ menu draw (out of scope, worktree lane's).
  No PAPERCUT beyond time spent re-verifying a wrong inherited pin (~15min)
  — flagging as a process note, not a tooling papercut: coarse-derived
  tick pins in this codebase's docs should get an independent re-check
  before a brief cites them as a hard acceptance boundary.

---

---
## 107 — Supervisor: idle/menu-draw dossier branch merged (docs/spec only) — final menu slice (1742-1810) fully unblocked; round-11 = SortSprites implementation SOLO

- **State (verified post-merge):** `npm test` **523/523**, `npm run build`
  green, tree clean. New `docs/battle-menu-idle-notes.md` (+ probe spec
  `menu-idle-bounce.json`): idle cycle SOLVED closed-form
  (`DoBounceEffect` drivers on gSprites[6]/gSprites[0], sine step +=7 mod
  256, +1 render lag — even explains the prior dossier's unattributed
  tick-1813 transient); menu idle is INDEPENDENT of the scene-assembly
  idle (re-derive, don't reuse); atomic menu draw = off-screen draw +
  BG0-scroll reveal after DMA3. Still open there: cursor-tile byte-check,
  the 1742-47 teal-blank's specific source call (pointers named).
- **Next (in order):** (1) SOLO main-lane step NOW: implement §7.26's
  derived SortSprites model (priority → subpriority → per-tick screen-Y
  tiebreak) in drawSendOutHandoff — targets sendout 1482-84/1497-98 and
  menu-materialize 1658-62; menu-throw's 8 ticks are NOT this mechanism
  (§7.26 disproved #96's hypothesis — icon fade/exit timing is the new
  lead, separate step); (2) then parallel: healthbox slide-in 1663-1693
  (harvest-based like §7.9's precedent, assembly stays with ISSUES #16)
  + menu draw/idle slice off the new dossier; (3) S6 acceptance
  end-to-end attempt; wind-down with margin before 07:55.
- **Notes:** two model-falsifications this session (§7.21's shared-root,
  §7.26's creation-order) — both caught by RAM before shipping wrong code.

## 108 — Bounded worker: implemented §7.26's real `SortSprites()` Y-tiebreak for both ball-open particle bursts — `sendout.json` **236/256 → 246/256** (+10, closes 1482-84/1497-98), `menu-materialize.json` widened + **12/12** (closes #105's 1658-1662 too — same family, not the particle-vs-ball fallback)

- **State:** `npm test` **525/525** (+2 Tier-1), `npm run build` green, tree
  clean. Full 22-trace sweep against the live oracle: all others at #107's
  exact counts (accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67,
  confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu
  38/38, example 4/4, menu-materialize **12/12**, menu-text 18/18,
  menu-throw 70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry
  110/110, room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  sendout **246/256**, summary-info-magby 132/132, summary-info-onix
  122/122, transition 206/206, walk-warpout 125/125) — zero regressions.
- **Did:** implemented (not re-derived) §7.26 Finding 2: both
  `drawBallOpenParticles`/`drawPlayerBallOpenParticles` (`battleScene.ts`)
  now build the currently-alive particle list per tick and draw it in
  `sortAliveParticlesByScreenY`'s order — ascending computed screen Y (lowest
  drawn first/background, highest drawn last/on top, matching
  `SortSprites`'s "larger Y wins" rule under a painter's-algorithm draw
  order), tie-broken by descending spawn index (an exact Y tie never
  triggers `SortSprites`'s insertion-sort swap, so original ascending
  creation order survives — the older/lower-index particle keeps the lower
  final OAM index, i.e. must be drawn LAST to render on top) — replacing the
  two previously-separate, opposite-direction static index loops §7.26
  identified as narrow curve-fits of this one real rule. Also source-checked
  (no live probe needed — literal already in `reference/pokeemerald`) the
  ball sprite's own `oam.priority` (`sBallOamData.priority=2`,
  `pokeball.c`) against the particles' (`1`, already RAM-verified in #106):
  since particle priority is strictly lower, particles always beat the ball
  unconditionally — the engine's existing ball-before-particles draw order
  was already GBA-correct, so the "if Finding 2 alone doesn't close #105,
  probe the ball" fallback §7.26 flagged needed zero code change, just the
  two constants pinned as documentation/tests
  (`BALL_OAM_PRIORITY`/`PARTICLE_OAM_PRIORITY`/`PARTICLE_OAM_SUBPRIORITY`).
  Widened `tools/compare/traces/menu-materialize.json`'s `captureFrames` to
  the full contiguous 1652-1663 span (was 7 frames skipping 1658-1662) —
  verified 12/12 on a scratch copy before committing the change to the real
  trace file. `docs/battle-scene-notes.md` §7.27 (full derivation + score
  effect); `docs/battle-menu-notes.md` §3/§7 updated in place (not rewritten)
  with forward-references, matching this run's existing correction style.
- **What's still open in `sendout.json` (10 ticks, confirmed unrelated, not
  assumed out of scope)**: `1462` (trainer-exit-tail/settled-bar gap,
  §7.25), `1470/1471/1479` (icon-row residual, different screen region —
  mismatch pixel sets bit-identical before/after this session's change),
  `1491-1496` (§7.25's own separately-named "materialize tint" family, not
  particle-colored). None are the OAM-priority compositor's territory.
- **Next:** healthbox slide-in (1663-1693, harvest-based per §7.9's
  precedent); menu draw/idle slice (source/RAM dossier already landed, #107);
  menu-throw's own 8 Brendan-vs-icon ticks (§7.26 Finding 1's new lead: the
  icon's own `eva`/`iconExitDx` state, NOT a compositing-order bug — do not
  re-attempt a reorder there); then S6 acceptance end-to-end.
- **Notes:** stayed entirely within `battleScene.ts` particle functions +
  `tests/battleScene.test.ts` + the two named docs files, per the brief.
  Did not touch menu-throw's 8 ticks, healthbox, idle, tick 1462, or
  1470/71/79 (checked unaffected, not skipped blindly). No PAPERCUT this
  session.

---
## 106 — Bounded worker: derived the REAL `SortSprites()` OAM-priority model (source+RAM verified) for #96's compositor — disproved PROGRESS #96's Brendan-vs-icon hypothesis, gave the particle z-order family (§7.25) a concrete non-guessed mechanism; no code landed (documentation-only session, ran out of RAM-probe budget before implementing)

- **State:** `npm test` **523/523**, `npm run build` green, tree clean —
  unchanged from #105 (no engine code touched this session). Full sweep not
  re-run (nothing could have regressed; docs/probe-spec only diff).
- **Did:** read `reference/pokeemerald/src/sprite.c`'s actual
  `BuildOamBuffer`/`BuildSpritePriorities`/`SortSprites`/
  `AddSpritesToOamBuffer` chain to derive the REAL compositor rule the
  brief's own model paragraph undersold: pokeemerald sorts sprites into the
  hardware OAM buffer by an insertion sort keyed on `subpriority |
  (oam.priority<<8)` ascending, tie-broken by current unwrapped screen `y`
  descending — NOT by creation order/array index. RAM-probed
  (`tools/probe/specs/menu-throw-oam-priority.json`, new, committed) +
  source-cross-checked (`battle_controller_player.c:2381`,
  `battle_interface.c:678-693/1511`) the two sprites behind PROGRESS #96's
  named 8-tick Brendan-vs-icon blocker: Brendan is `oam.priority=2`, every
  player status icon is `oam.priority=1` — different `oam.priority` means
  the pair never reaches subpriority/OAM-slot/creation-order at all; the
  icon ALWAYS wins, unconditionally, exactly matching what the engine's
  current draw order already does. **#96's "Brendan wins by creation
  order" hypothesis is disproved** — the 8-tick residual is real but is NOT
  a compositing-order bug (root cause still open, new hypothesis: icon's
  own `eva`/`iconExitDx` state, not sprite ordering). Separately,
  source-traced `AnimateBallOpenParticles` (`battle_anim_throw.c:1577`,
  called from `pokeball.c:441`/`757`): every particle in one send-out burst
  shares the exact SAME literal `priority=1, subpriority=28` — so
  same-burst particle overlaps (§7.25's sendout 1482-84/1497-98, likely
  #105's menu-materialize 1658-1662) are resolved ENTIRELY by the Y
  tie-break, recomputed per-tick as each particle's radial position moves —
  not by spawn index (explains why §7.25's static descending-spawn-index
  reorder regressed elsewhere: spawn index is only a coincidental Y proxy,
  since `angle=(i%8)*32` isn't monotonic in age). Full derivation + source
  citations: `docs/battle-scene-notes.md` §7.26. Corrected (not rewrote)
  `docs/battle-menu-notes.md` §3 item 4b's disproved claim with a
  forward-reference.
- **Next:** implement the per-tick Y-sort in `drawBallOpenParticles`/
  `drawPlayerBallOpenParticles` (replace the static ascending/descending
  index loops), verify against `sendout.json` (>236/256) and
  `menu-materialize.json` (12/12 through 1662) with a full 22-trace
  zero-regression sweep; if #105's own 1658-1662 doesn't close from that
  alone (it's particle-vs-BALL, not particle-vs-particle), RAM-probe the
  ball sprite's own `oam.priority`/`subpriority` next (same probe pattern).
  Menu-throw's 8 ticks need fresh investigation along the new eva/
  iconExitDx hypothesis, not a reorder. Then healthbox slide-in, menu draw
  + idle, S6 acceptance.
- **Notes:** this step's brief asked for a full OAM-priority compositor
  rewrite of `drawSendOutHandoff`; the real `SortSprites` model (above)
  turned out to require RAM-probing each relevant sprite PAIR individually
  (not a one-shot "enumerate all slots" table) — only got through one pair
  (Brendan/icon) plus one source-only derivation (particles) before the
  cap. Per the brief's own explicit fallback ("if the full model can't land
  green in-cap... document the rest"), landed research only — a code
  change here without time to verify the 22-trace sweep would have violated
  the brief's own "any regression = stop and bisect" discipline. New
  committed artifact: `tools/probe/specs/menu-throw-oam-priority.json`. No
  PAPERCUT beyond what's already named (dump-task-and-sprite-callbacks.py's
  symbol resolution still requires a separate offline `nm` step, as its own
  docstring already says).

---

## 105 — Bounded worker: applied #104's opponent-side `open.png`/openFinal discovery to the PLAYER ball window — `menu-materialize.json` **6/6 → 7/7** (+1657, contiguous 1652-1657); 1658-1662 residual re-scoped to the already-named particle z-order family

- **State:** `npm test` **523/523** (+2 Tier-1), `npm run build` green, tree
  clean. Full 22-trace sweep against the live oracle: all others at their
  exact #104 counts (accept-prebattle 137/137, anchor 1/1, confirm-decline
  67/67, confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66,
  draft-menu 38/38, example 4/4, menu-materialize **7/7**, menu-text 18/18,
  menu-throw 70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry
  110/110, room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  sendout 236/256, summary-info-magby 132/132, summary-info-onix 122/122,
  transition 206/206, walk-warpout 125/125) — zero regressions.
- **Did:** per #104's own "Next" hypothesis, confirmed §7.25's opponent-side
  `LoadBallGfx` discovery (`pokeball.c:1308-1332` unconditionally DMAs
  `graphics/balls/open.png` over `sBallAnimSeq1`'s nominally-blank
  `ANIMCMD_FRAME(8,5)` slot) is battler-generic, not opponent-only. RAM-probed
  the player ball sprite directly (`tools/probe/specs/menu-player-
  materialize.json`, `gSprites[5]`): `animCmdIndex` flips 0→1 at RAM 1656
  (right after the open pose's own 5-tick hold), holds 5 more ticks
  (`ANIMCMD_FRAME(8,5)`'s own duration), `animEnded` sets at RAM 1661 - with
  the established +1 render lag, openFinal is visible at renders 1657-1662.
  A/B'd against fresh oracle captures BEFORE touching code
  (`tools/compare/scratch/menu-audit/classify_1657_1663.mjs`): tick 1657's
  entire 19px residual is an exact match to openFinal's own tile content
  (19/19), and most of 1658-1662's own residual too (17/19, 20/26, 26/30,
  19/21, 14/16); tick 1663 confirmed NOT part of the window (ball already
  invisible there, oracle-checked directly). Landed: `PLAYER_BALL_OPEN_
  FINAL_END_TICK` (1662, `battleMenu.ts`), widened `playerBallOpenTopLeft`'s
  range to it, `drawPlayerBallOpen` (`battleScene.ts`) now switches tile-row
  offset (0↔2) at `PLAYER_BALL_OPEN_END_TICK`, reusing the SAME extracted
  `battleAnimBallOpen` tileset the opponent's own `BALL_OPEN_FINAL_TILESET`
  already selects. `menu-materialize.json`: **6/6 → 7/7** (tick 1657 exact;
  1652-1657 now contiguous, +1663 non-contiguous past it).
- **What's left (1658-1662, small residual, re-scoped not solved)**: 2-6px
  per tick, pixel-classified as particle-position pixels (oracle color
  `255,173,0`, the known particle-burst color, not in the ball-open palette)
  — the same particle-vs-ball z-order family §7.25 already named and left
  open for the OPPONENT's own send-out (1482-1490/1497-1498), now confirmed
  to have a player-side twin. Not chased this session (§7.25's own "tried
  and reverted" note already warns a naive spawn-index reorder regresses
  elsewhere without real OAM-slot RAM evidence) — belongs with the OAM-
  priority compositor (#96), not a curve-fit on either side alone.
- **Next:** the OAM-priority compositor (#96, solo) — three residual
  families now converge on it: this session's 1658-1662, §7.25's
  1482-84/1491-98, and menu-throw's own 8 Brendan-vs-icon ticks; then
  healthbox slide-in, menu draw + idle (§4/§5, concurrent worktree lane),
  S6 acceptance end-to-end.
- **Notes:** stayed in `battleMenu.ts`/`battleScene.ts` player-side
  functions + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md` §3,
  per the brief. Did not touch §4/§5, `battleScene.ts` opponent-side
  internals, `tests/battleScene.test.ts`, or `sendout.json`. New committed
  artifact: `tools/compare/scratch/menu-audit/classify_1657_1663.mjs`.

---

## 104 — Supervisor: round-8 worktree branch merged — sendout ball's REAL 3rd frame found (`open.png`, runtime VRAM overwrite; never previously extracted) — 1485-1490 pixel mass -95-97%, `sendout.json` holds 236/256 behind a narrow z-order residual

- **State (verified post-merge):** `npm test` **521/521**, `npm run build`
  green, tree clean. sendout 236/256, scene-assembly 256/256,
  menu-materialize 6/6, menu-throw 70/70. Worktree removed, branch deleted.
- **Did:** merged `worker/wt-20260719-023340` (conflict-free): the
  1485-1495 span's dominant residual was the ball sprite rendered as
  nothing — `LoadBallGfx` (pokeball.c:1308-1332) unconditionally DMAs
  `graphics/balls/open.png` (a separate, never-extracted file) over the
  blank `ANIMCMD_FRAME(8,5)` tile range at ball creation; extractor now
  pulls it as `battle-anim-ball-open.json`'s `openFinal`; `drawSendOutBall`
  gained a 3rd branch; `BALL_INVISIBLE_START_OFFSET` 23→29 (RAM). Score
  gated at 236/256 by a 2-7px pre-existing particle z-order residual
  (1482-84/1497-98) — worker tried the naive OAM reorder (+4/-2), reverted
  it correctly; §7.25 documents both plus the untouched 1491-95
  sub-residual. Extractor landmine (grovyleFrontAnim silently dropped on
  re-run) caught pre-commit; PAPERCUTS.md updated.
- **Next:** (1) main lane — apply `openFinal` to the PLAYER ball window
  (the 1657-62 residual #103 narrowed to ball-palette pixels is very
  likely this same missing frame, shared `LoadBallGfx` path); (2) worktree
  — §4 idle-cycle + §5 menu-draw source attribution dossier (unblocks the
  last menu slice); (3) then the OAM-priority compositor SOLO (three
  residual families now converge on it: 1482-84/1497-98, menu-throw's 8
  ticks, likely 1470/71/79); (4) healthbox slide-in; (5) menu draw + idle;
  (6) S6 acceptance end-to-end.
- **Notes:** sendout remaining named: 1462, 1470/71/79, 1482-84/1491-98
  region (z-order + small sub-residual). Two lanes independently converged
  on the same missing ball frame from opposite sides this round.

---

## 103 — Bounded worker: re-derived drawPlayerMaterialize's accumulator/`y2` with the full stack in place (still correct, no change) — the real bug was `PLAYER_BALL_OPEN_END_TICK` over-widened to 1663; RAM-confirmed the true window is 5 ticks (1652-1656) — `menu-materialize.json` **5/5 → 6/6** (+1663); 1657-1662 residual re-scoped, still open

- **State:** `npm test` **520/520**, `npm run build` green, tree clean. Full
  22-trace sweep against the live oracle: all at their exact established
  counts (accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67,
  confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu
  38/38, example 4/4, menu-materialize **6/6**, menu-text 18/18, menu-throw
  70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry 110/110,
  room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256, sendout
  236/256, summary-info-magby 132/132, summary-info-onix 122/122, transition
  206/206, walk-warpout 125/125) — zero regressions.
- **Did:** per the brief's own instruction, re-derived `drawPlayerMaterialize`'s
  `local+2` accumulator lead + `MATERIALIZE_Y2_TABLE` reuse now that the BG
  fade (#99) and particle burst (#101) both sit underneath it — re-ran the
  same exact-tint-pixel-SET brute force §7.21 used (`tools/compare/scratch/
  menu-audit/reprobe_player_materialize.mjs`) against fresh oracle captures:
  **the current values are still the best match at every tick** (the
  residual grows smoothly the same "known-occluder-holes" shape §7.21 itself
  already documented as benign) — no change needed there. Then RAM-probed
  the ball sprite directly (`tools/probe/specs/menu-player-materialize.json`,
  `gSprites[5]`, `animCmdIndex`/`animDelayCounter`): `sBallAnimSeq1`'s "open"
  frame (`ANIMCMD_FRAME(4,5)`) is only active for 5 RAM ticks (1651-1655),
  then a genuinely-blank frame takes over — with this window's established
  +1 render lag, that's renders 1652-1656 only, matching the OPPONENT's own
  already-correct `drawSendOutBall` window exactly (also 5 ticks). #101's
  widening of `PLAYER_BALL_OPEN_END_TICK` to 1663 was an unverified guess;
  shrunk back to 1656. Verified empirically: this leaves ticks 1657-1662
  completely unchanged (proving the wider window was never load-bearing
  there) and newly fixes tick 1663 to exact 0 diff (was 1px).
  `menu-materialize.json`: **5/5 → 6/6** (1652-1656 + 1663, non-contiguous,
  same precedent as `menu-throw.json`'s own excluded-ticks pattern).
- **What's still open (1657-1662, small residual, re-scoped not solved)**:
  every mismatched pixel's color is uniquely in the ball's own palette
  (`battle-anim-ball-open.json`/`summary-ball.json`) — confirmed by direct
  palette scan to have zero overlap with the particle palette or ONIX's own
  back-sprite palette (and mathematically incompatible with any single-
  coefficient blend of ONIX's grayscale-ish true colors toward the tint).
  Both of this session's own candidate mechanisms (materialize
  accumulator/`y2`, ball-open's window) are now proven NOT responsible — a
  future session should look for a still-unidentified third mechanism,
  **not** re-try either of these two. Full accounting:
  `docs/battle-menu-notes.md` §3 item 5.
- **Next:** root-cause the 1657-1662 residual (now precisely bounded — see
  above) to close `menu-materialize.json` the rest of the way to the
  healthbox-slide-in boundary (~1693, still untouched, separately blocked by
  the already-named coefficient-fade-to-true-color + idle-bob entanglement).
  Sendout's own 1485-1495 span remains the concurrent worktree lane's
  territory (unaffected by this session).
- **Notes:** stayed in `battleMenu.ts`/`battleScene.ts` player-side functions
  + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`, per the brief.
  Did not touch `battleScene.ts`'s opponent-side internals,
  `tests/battleScene.test.ts`, or `docs/battle-scene-notes.md`. New
  committed artifacts: `tools/probe/specs/menu-player-materialize.json`,
  `tools/compare/scratch/menu-audit/reprobe_player_materialize.mjs`.
  PAPERCUT: the "materialize-silhouette-edge" naming from #101 turned out to
  describe a symptom (ball-palette colors near the tint boundary), not the
  actual mechanism (which was a ball-open window timing bug one call-site
  over) — cost most of this session's time chasing the accumulator/`y2`
  angle before the RAM probe redirected to the real cause; a future brief
  for a residual like this might explicitly ask "is the named function even
  the one drawing the mismatched pixels" as a first triage step, mirroring
  this session's own eventual A/B-shrink-the-window test.

---

## 102 — Supervisor: round-7 worktree branch merged (one battleScene.ts draw-order conflict, hand-resolved + re-verified) — `sendout.json` **221 → 236/256**; 1504-1518 span closed by a one-line compositing fix

- **State (verified post-merge):** `npm test` **520/520**, `npm run build`
  green, tree clean. Post-merge re-runs: sendout **236/256**,
  scene-assembly 256/256, menu-materialize 5/5, menu-throw 70/70,
  menu-text 18/18, transition 206/206. Worktree removed, branch deleted.
- **Did:** merged `worker/wt-20260719-021108`: the whole 1504-1518
  residual was mechanism 5's LATE window still drawing AFTER the particle
  burst (the early window was already moved pre-particles by §7.22/§7.23);
  every diff pixel in the span was particle-colored inside an alive
  particle's predicted footprint — no formula/task move (§7.24). BONUS:
  falsifies §7.20's 1516/17 "particle survives past age 24" theory — that
  pixel is index 12 at age 22, was just masked by the same ordering bug. The
  merge conflicted with #101's player-particle additions in the same
  drawSendOutHandoff region; resolution keeps #101's player draw calls + the
  branch's Grovyle ordering (stretch pre-particles, settled-only post) —
  re-verified above.
- **Next:** main lane → drawPlayerMaterialize's silhouette-edge residual
  at 1657+ (§7.21-class, named in #101; the opponent-side fix is the
  template) then extend menu-materialize toward the healthbox-slide
  boundary; worktree lane → sendout 1485-1495 (11 ticks, last big span);
  then the #96 OAM-order fix solo, menu draw + idle, S6 acceptance.
- **Notes:** sendout remaining: 1462, 1470/71/79, 1485-1495 (15 ticks
  total). First merge conflict of the session — the two lanes finally
  met in drawSendOutHandoff's z-order; resolution was mechanical.

---

## 101 — Bounded worker: PLAYER-side ball-open particle burst landed (mechanism 3's player-side analogue, docs/battle-menu-notes.md §3 item 5) — `menu-materialize.json` **1/1 → 5/5** (ticks 1652-1656); a distinct materialize-silhouette-edge residual found starting 1657, not root-caused

- **State:** `npm test` **519/519** (+3 Tier-1), `npm run build` green,
  tree clean. Full 22-trace sweep against the live oracle: all 21 others at
  their exact established counts (accept-prebattle 137/137, anchor 1/1,
  confirm-decline 67/67, confirm-flow 79/95, draft-cursor 13/13,
  draft-menu-slot6 66/66, draft-menu 38/38, example 4/4, menu-text 18/18,
  menu-throw 70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry
  110/110, room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  sendout 221/256, summary-info-magby 132/132, summary-info-onix 122/122,
  transition 206/206, walk-warpout 125/125) — zero regressions.
  `tools/compare/traces/menu-materialize.json`: **1/1 → 5/5** (tick 1652 was
  already committed; added 1653-1656).
- **Did:** per the brief's FIRST STEP, confirmed #99's own residual
  classification still held on this session's starting code (100%
  particle-colored, 1653-1663) before writing anything. Implemented
  `drawPlayerBallOpenParticles` (`battleScene.ts`) — same age/radius/frame
  math as the opponent's own `drawBallOpenParticles`, battler-specific only
  in origin/anchor: **origin `(68,106)`**, brute-force pixel-fit against the
  single isolated particle visible at logical tick 0
  (`tools/compare/scratch/menu-audit/fit_player_particle_origin.mjs`, 13/14
  exact — the 14th is the already-established terrain occlusion), **not**
  the naive `sprite->x,y-5` center value directly (that value needs the
  tile's own `-4,-4` half-size folded in first, since `drawParticleTile`'s
  args are a top-left corner); **anchor** `PLAYER_BG_FADE_START_TICK` (1653,
  same "both fire the same RAM tick" reasoning #99 established for the BG
  fade). **Draw order reversed from the opponent's own function** (oldest
  spawn on top) — pixel-confirmed necessary via direct A/B (ascending order
  left 3-24px residuals at 1654-1656, all explained by the two-particles-
  briefly-coexisting-at-radius-0 overlap; reversing fixed all three exact).
  **A second, distinct gap found while wiring this in**: the ball's own
  "open" pose sprite (#98's `drawPlayerBallOpen`) was only modeled for its
  single tick 1652 — real particles exposed that the ball's static art is
  still genuinely on screen (through the same terrain clip) for several more
  ticks; widened `PLAYER_BALL_OPEN_END_TICK` to 1663 (`battleMenu.ts`) —
  alone fixed tick 1653.
  3 new Tier-1 tests (`tests/battleMenu.test.ts`) pin the origin tile,
  a later-tick particle position, and the pre-burst boundary; 2 existing
  tests updated for the widened ball-open window.
- **Why the window stops at 1656, not 1663 (the materialize window's own
  end)**: ticks 1657+ have a small (19-30px), separately-named residual that
  is **NOT** particle-colored — every mismatched pixel is one of the
  ball-open frame's own colors (`66,66,66`/`214,41,41`/`132,0,0`/
  `255,156,123`), appearing where `drawPlayerMaterialize`'s tint is drawn
  instead of the real ball/mon color underneath. **Superseded by #103**:
  this was a materialize-silhouette-EDGE misattribution — #103 proved both
  the materialize accumulator/`y2` AND the ball-open window (widened to 1663
  right here) were not responsible; the 1663 widening itself has since been
  reverted back to the RAM-confirmed 5-tick truth (1656).
- **Notes:** stayed in `battleMenu.ts` (pure timing) + additive
  `battleScene.ts` hooks (new function + one call-site line in the existing
  `drawSendOutHandoff`, plus reordering the three already-existing
  player-materialize-window calls to fix compositing order) +
  `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`, per the brief.
  Did not touch `battleScene.ts`'s opponent-side internals,
  `tests/battleScene.test.ts`, or `docs/battle-scene-notes.md`. Archived
  PROGRESS #97 to `PROGRESS-archive.md` per the brief. No PAPERCUT.

---

## 100 — Supervisor: round-5 worktree branch merged — masking band root-caused (harvest-asset background bleed, not the slide model) + §7.22's mechanism-5 fix re-applied; `sendout.json` **215 → 221/256**

- **State (verified post-merge):** `npm test` **516/516**, `npm run build`
  green, tree clean. Post-merge re-runs: sendout **221/256**,
  scene-assembly 256/256, menu-throw 70/70, menu-materialize 1/1,
  menu-text 18/18. Worktree removed, branch deleted.
- **Did:** merged `worker/wt-20260719-013134` (base 2e42eb5, conflict-free
  with #98/#99's parallel main-lane work). PART 1: §7.22's ~138px sliding
  band was NOT a healthbox-slide-model bug — the §7.9 pixel-harvest asset's
  rectangular bounding box contains real background pixels frozen at their
  post-fade color in the sprite's scalloped-corner margin, and
  `drawSendOutHealthbox` painted the whole rectangle every tick, clobbering
  the correctly-faded background during the materialize plateau
  (renders 1496-1503). Fix: `getHealthboxContentMask()` classifies bleed
  vs content; bleed pixels skipped. +1 (render 1496). PART 2: §7.22's
  7-entry `GROVYLE_STRETCH_EARLY_TABLE` + shortened mechanism-4 window +
  compositing-order split re-applied; RAM tick 1496's raw `(0,0,0)` matrix
  entry replaced by neutral `(256,256,0)` — mechanism-justified (OAM
  matrix not yet re-latched; a literal zero matrix provably blows render
  1497 up to 2362px, which the oracle contradicts). +5 (renders
  1499-1503). Dossier: §7.23.
- **Next:** main lane is on the player-side ball-open particle burst
  (mechanism 3 analogue, present from tick 1653 per #99); worktree lane
  takes sendout's 1504-1518 boundary residual (15 ticks, biggest remaining
  named span; 1485-1495 if same family). Then: healthbox slide-in →
  settle, blank-box + menu draw + idle, the #96 OAM-order fix (solo,
  supervisor-scheduled), S6 acceptance end-to-end.
- **Notes:** sendout remaining gaps now: 1462, 1470/71/79, 1485-1495,
  1504-1518 (35 ticks). ISSUES #16 note: the new content mask composites
  ON TOP of the shipping harvest — #16's eventual assembly wiring should
  subsume both.

---

## 99 — Bounded worker: root-caused + fixed #98's pre-existing ~1653+ full-frame residual — it's the player-side twin of `SENDOUT_BG_FADE_Y` (battle-scene-notes.md §7.10/§7.20); ~99% pixel reduction, but the remaining residual is 100% the (unimplemented) ball-open particle burst, so `menu-materialize.json` still can't extend past its existing 1/1

- **State:** `npm test` **514/514** (+6 Tier-1), `npm run build` green, tree
  clean. Full 21-trace sweep (mandatory this time, not spot-checked): all
  21 at their exact established counts (accept-prebattle 137/137, anchor
  1/1, confirm-decline 67/67, confirm-flow 79/95, draft-cursor 13/13,
  draft-menu-slot6 66/66, draft-menu 38/38, example 4/4, menu-materialize
  1/1, menu-text 18/18, menu-throw 70/70, rent-3picks 157/190, rent-slot1
  125/139, room-entry 110/110, room-msgbox 142/142, room-npcs 98/98,
  scene-assembly 256/256, sendout 215/256, summary-info-magby 132/132,
  summary-info-onix 122/122, transition 206/206, walk-warpout 125/125) —
  zero regressions.
- **Did:** per the brief's FIRST STEP, A/B'd the unmodified baseline over
  1653-1690 first (`npm run compare` against a scratch trace built from
  `battle1-menu-dense.json`'s segments) and reproduced #98's exact
  characterization (2461px at 1653 growing to 18374px by 1675). Root-cause,
  decoded not fitted (`tools/compare/scratch/menu-audit/
  decode_player_bgfade.mjs`): `SpriteCB_ReleaseMonFromBall`
  (`pokeball.c:758`) calls `LaunchBallFadeMonTask(TRUE, sprite->sBattler,
  14, ballId)` for BOTH battlers — the player's own ONIX release
  re-triggers the identical `BeginNormalPaletteFade(14,0,0,16,RGB_WHITE)`
  BG-to-white dither `SENDOUT_BG_FADE_Y` already models for the opponent,
  which the engine only ever applied once. Reversed the already-validated
  `blendComponentToWhite` formula against two clean background swatches,
  cross-checked every tick 1653-1689: the decoded 37-entry y-ramp is
  byte-identical to `SENDOUT_BG_FADE_Y` (same 3-tick y=14 hold included),
  re-anchored at `PLAYER_BALL_OPEN_START_TICK+1` (1653) — the same
  "one tick after ball-open" convention the opponent's own table uses.
  `battleMenu.ts` gained `playerMaterializeBgFadeY`; `battleScene.ts`
  additively ORs it into the existing `drawTileBgFaded` call (the two
  windows never overlap). Verified: 1653-1663 full-frame diff drops ~99%
  (2461px→19px at 1653, 7846px→92px at 1662). 6 new Tier-1 tests pin both
  ramp boundaries (§7.20's lesson: ramps get truncated at both ends).
- **Why `menu-materialize.json` still can't extend**: classified every
  remaining diff pixel at ticks 1653-1663 pixel-for-pixel
  (`tools/compare/scratch/menu-audit/classify_residual.mjs`) — **100%** is
  the ball-open particle burst (mechanism 3's player-side analogue,
  colors `(255,173,0)`/`(255,255,255)`/`(66,66,66)`/`(214,41,41)`/
  `(255,156,123)`/`(132,0,0)` clustered at the ball's own position), not
  yet implemented. Pixel evidence refines the brief's own "expected around
  1662-1665" guess: the burst is present at **every** tick from 1653
  itself (same tick `AnimateBallOpenParticles` fires alongside
  `LaunchBallFadeMonTask`), so no tick in 1653-1663 reaches 0 diff and
  none can be added to the committed trace this session. Ticks 1664+
  remain separately blocked by the already-named coefficient-fade +
  idle-bob entanglement. Per the brief, the particle burst itself was
  **not attempted** (explicitly gated on "everything else done + 15 min
  left," not the case after the root-cause work). Full derivation:
  `docs/battle-menu-notes.md` §3 item 5 (updated this session).
- **Next:** implement the player-side particle burst (origin + render-lag
  offset — likely reusable machinery from the opponent's own
  `drawBallOpenParticles`/`PARTICLE_ORIGIN`/age table, same derivation
  pattern §7.14/§7.18/§7.20 used for the opponent side) — once landed,
  ticks 1653-1663 should flip to full-frame-exact with no further changes
  to the BG fade or materialize accumulator. Then: healthbox slide-in →
  settle 1693 (entangled with materialize's own tail per §3 item 5); blank
  box + menu draw + idle (1742-1810). Brendan-vs-icon sprite-priority
  compositing (#96) and the #96 OAM-order general fix remain
  supervisor-scheduled, untouched.
- **Notes:** stayed in `battleMenu.ts` (pure timing) + additive
  `battleScene.ts` hooks (one new call inside the existing
  `drawSendOutHandoff`, no reordering) + `tests/battleMenu.test.ts` +
  `docs/battle-menu-notes.md`, per the brief. Did not touch
  `battleScene.ts`'s opponent-side internals, `tests/battleScene.test.ts`,
  or `docs/battle-scene-notes.md`. No PAPERCUT — the newest PAPERCUTS.md
  entry's "A/B the baseline first" advice is exactly what let this session
  separate the real root cause from the ONIX-shaped noise immediately.

---
## 97 — Bounded worker: ball-spin GBA affine keyframe animation landed (§3 item 4's named blocker) — `menu-throw.json` densified to every tick 1574-1651, **70/70** 0-diff (was 33/33); ball arrival pinned exact at trace tick 1651

- **State:** `npm test` **507/507** (+6 Tier-1), `npm run build` green,
  tree clean. Full 21-trace sweep against the live oracle: all 20 others at
  their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  sendout 215/256, menu-text 18/18) — zero regressions.
  `tools/compare/traces/menu-throw.json` extended from 33 committed
  captures (1574-1614) to 70 (1574-1651, still minus #96's 8 named-excluded
  Brendan-vs-icon ticks): **70/70** at 0 diff.
- **Did:** implemented `playerThrowBallSpin` (`battleMenu.ts`) +
  `drawSpriteSheetAffineRotate` (`battleScene.ts` - this codebase's first
  TRUE-rotation affine OAM sampler; mechanism 4/5 both special-case
  `rotation=0`), covering trace tick 1615 (where the GBA affine "ball spin"
  starts, `StartSpriteAffineAnim(sprite, 4)`) through arrival. Root-caused
  via source (`SpriteCB_PlayerMonSendOut_2`, `pokeball.c:915-953`) +
  RAM ground-truth (new probe `tools/probe/specs/sendout-ball-spin.json`;
  ball sprite = `gSprites[5]`, ID'd by matching its callback pointer to
  `SpriteCB_PlayerMonSendOut_2`'s address via
  `tools/probe/dump-task-and-sprite-callbacks.py`) rather than hand-sim
  alone — the control flow was subtler than #94's blocker note implied
  (`sprite->sBattler`/`data[6]` inside the branch is the arc's own angular
  step by this point, not the original battler index, since
  `InitAnimArcTranslation` already overwrote it — full derivation in
  docs/battle-menu-notes.md §3 item 4c). The rotation itself is a clean
  closed form (`+=25` GBA angle units/tick, confirmed by hand against RAM),
  but kept as a literal per-tick matrix table (`BALL_SPIN_TABLE`) because
  this codebase's `gbaSin` (`Math.sin`-derived, not a literal
  `gSineTable` copy) is off by up to 1 Q8.8 unit at some indices — invisible
  to the existing sine-ARC mechanisms but not to a rotate SAMPLE kernel
  (confirmed by brute-force oracle diffing: sparse 1-11px edge diffs at
  exactly the affected ticks, gone once swapped to RAM-exact values). Same
  render-lag convention as mechanism 4/5 (§7.21), RAM-confirmed here rather
  than assumed. **Arrival pinned exact: trace tick 1651** (was "~1646"
  coarse) — resolves that "not tick-exact" item in docs §3. 6 new Tier-1
  tests (`tests/battleMenu.test.ts`): keyframe/matrix pinning at the first
  spin tick, the last spin tick, and arrival, plus 3 oracle-cross-checked
  rendered-pixel tests.
- **Window boundary (why 1651, not further):** tick 1652 is where
  `SpriteCB_ReleaseMonFromBall` (which takes over the RAM tick after
  arrival) starts the ball's own "open" pose swap
  (`StartSpriteAnim(sprite,1)`), and tick 1653 is where the magenta
  materialize silhouette color first appears anywhere in the frame
  (oracle-confirmed by direct pixel search) — both the already-named,
  out-of-scope materialize/ball-open mechanism (docs §3 item 5), not a new
  gap. Stopped there per the brief rather than reaching into that mechanism.
- **Next:** (1) materialize (~1653+, ball-open particles + affine-emerge +
  color-fade — assets already confirmed ready per `battle-anim-assets.md`
  §5, "just" placement/timing); (2) Brendan-vs-icon sprite-priority
  compositing (#96's named blocker, 8 ticks, wants a proper
  OAM-priority-aware compositor); (3) healthbox slide-in → settle 1693; (4)
  blank-box + menu draw + idle (1742-1810). Sendout residuals continue
  separately (§7.21's named 1493-1503 matrix-early gap, 1516/17 age
  overrun, 1470/71/79 icon edge, tick 1462).
- **Notes:** stayed out of battleScene.ts's mechanism-5 (GROVYLE stretch)
  internals and tests/battleScene.test.ts (the concurrent worker's
  territory) — only additive `drawSpriteSheetAffineRotate` + a call-site
  hook in `drawSendOutHandoff`. docs/battle-scene-notes.md, oracle/harness,
  ROADMAP.md untouched, per the brief. No PAPERCUT.
  **Supervisor merge addendum (post-#97):** worktree branch
  `wt-20260719-004700` merged (docs-only, §7.22): §7.21's 1493-1503
  matrix-early gap was root-caused and its fix VERIFIED (5 ticks'
  Grovyle region → 0px) but reverted per the step's strict >215 bar — an
  unrelated ~138px band sliding ~5px/tick across x∈[0,42], y∈[17,42]
  (opponent-healthbox slide-in region) masks those ticks from full-frame
  exactness. §7.22 records the 7 RAM table entries + compositing-order
  correction for exact re-application once the band is fixed — that
  combined step is round 5's worktree brief.

---

## 96 — Bounded worker: PLAYER status-bar subsprite-split exit landed (§7.19's opponent-side twin) — `menu-throw.json` densified to every tick 1574-1614, **33/41** 0-diff (was 11/11 on the old sparse trace); one new named blocker found (Brendan-vs-icon sprite-priority compositing, 8 ticks)

- **State:** `npm test` **501/501** (+3 Tier-1), `npm run build` green,
  tree clean. Full 21-trace sweep against the live oracle: all 20 others
  at their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  sendout 215/256, menu-text 18/18) — zero regressions.
  `tools/compare/traces/menu-throw.json` densified from 11 sparse
  captures to every tick 1574-1614 (41 total, minus 8 named-excluded —
  see below): **33/33** of the committed captures at 0 diff.
- **Did:** implemented `drawPlayerSummaryBarExit`/`playerBarExitTableActive`
  in `battleScene.ts` (additive, next to the existing `drawOpponentSummaryExit`
  it mirrors) — the player-side twin of §7.19's opponent bar-exit
  subsprite split. Same shared `SetSubspriteTables(...,
  sStatusSummaryBar_SubspriteTable_Exit)` call and table as the opponent
  (source-confirmed: only h-flip differs between sides), but the
  unflipped player anchor needs **no** analogue of the opponent's
  `EXIT_BAR_TIP_LOCAL_SHIFT` — derived (not fitted) from the fact that the
  player's unflipped render anchors to the table's *first* entry
  (unchanged between Enter/Exit), not the *last* (which is what moves
  under h-flip). This alone took the densified trace from 11/41 to 33/41
  (the 20-136px bar-split residual fully gone). 3 new Tier-1 tests
  (`tests/battleMenu.test.ts`) pin the widened-layout pixels + the
  pre-switch flat frame, oracle-cross-checked. Corrected
  docs/battle-menu-notes.md §3 item 4b + §7 with the full derivation.
- **New named blocker found (not attempted, out of this step's scope):**
  8 of the 41 ticks (1581-1583, 1589-1591, 1597-1598) still diff by a
  small 4-26px margin, but pixel dumps prove it's NOT the bar — it's a
  sprite-priority compositing gap between Brendan's exiting back sprite
  and the player status icon's exit-slide, whenever their screen
  footprints briefly overlap: real GBA OAM resolves the tie by sprite-
  creation order (Brendan, created at the intro, wins), but this engine
  composites strictly in draw-call order (the icon, drawn after Brendan,
  paints over him). Fixing this generally means touching
  `drawSendOutHandoff`'s shared draw order, which also backs
  `sendout.json`'s established 215/256 — too risky to improvise inside
  this step's narrow brief, so the 8 ticks are excluded from the
  committed trace with this exact explanation rather than forced/faked.
- **Next:** (1) the ball's GBA affine "spin" (tick 1615+, needs an
  affine-matrix keyframe renderer); (2) Brendan-vs-icon sprite-priority
  compositing (above) — a real, scoped fix for a future step, likely
  wants a proper OAM-priority-aware compositor rather than another
  one-off reorder; (3) materialize (~1646-1690, assets confirmed ready);
  (4) healthbox slide-in -> settle 1693; (5) blank-box + menu draw + idle
  (1742-1810). Sendout residuals continue separately (§7.21's named
  1493-1503 matrix-early gap, 1516/17 age overrun, 1470/71/79 icon edge,
  tick 1462).
- **Notes:** stayed out of battleScene.ts's mechanism-5 affine-matrix
  region and battleScene.test.ts (the concurrent worker's territory) —
  only additive functions next to the existing opponent-exit code, plus
  the `drawBallIcons` call-site edit. docs/battle-scene-notes.md, oracle/
  harness, ROADMAP.md, sendout.json untouched, per the brief. No
  PAPERCUT.

---

## 95 — Supervisor: both worktree branches merged — mechanism 4 silhouette-edge fix (`sendout.json` **214 → 215/256**) + player-materialize asset audit (zero new extraction needed; §6's MISSING flags were stale)

- **State (verified post-merge):** `npm test` **498/498**, `npm run build`
  green, tree clean. Post-merge re-runs: sendout **215/256** (render 1481
  newly exact), scene-assembly 256/256, transition 206/206, menu-text
  18/18, menu-throw 11/11, anchor 1/1. Draft-family traces not re-run
  post-merge: neither branch touches their code paths, and each branch ran
  a full clean sweep pre-merge (#94's 21-trace + the branch's own 19-trace).
  Both worktrees removed, branches deleted.
- **Did:** (1) merged `worker/wt-20260718-235841` — mechanism 4's
  materialize silhouette-edge residual root-caused by direct RAM probe
  (`gSprites[8]`/`gOamMatrices[2]`, new probe spec committed): an
  accumulator-lookup render-lag off-by-one (render T needs RAM T-1, the
  convention mechanism 5 already had) + a previously-unmodeled `y2`
  vertical bob (14→0 over the 12-tick emerge ramp, literal table). The
  brief's "shared root cause with mechanism 5" hypothesis was FALSIFIED
  (mechanism 5 already correct; call sites genuinely differ via
  `ConvertScaleParam`). Full derivation §7.21. Remaining 1482-1492
  residual re-attributed to the ball sprite's own occlusion footprint;
  new named gap: mechanism 5 writes its affine matrix before its render
  window at 1493-1503. (2) merged `worker/wt-20260719-003214` — asset
  audit for the player materialize window: all three "MISSING" §6 items
  were already extracted this run (`battle-anim-particles/-ball-open/
  -tables.json`, shared `SpriteCB_ReleaseMonFromBall` source) and are now
  pixel-confirmed applicable player-side (particles 14/14+12/12+12/12 at
  1662-1665; color-fade RGB exact; affine-emerge shape holds for a back
  sprite; thrown-ball closed frame 112/112 over 1607-1614). §6 rows
  corrected to point at `docs/battle-anim-assets.md` §5.
- **Next:** (1) player status-bar subsprite-split exit (1575-1604, <1%
  residual/tick — mirror of §7.19's opponent-side EXIT_BAR_TILE_ORDER
  work), then densify menu-throw.json to the full 1574-1614 window; (2)
  ball-spin affine keyframe renderer (1615+, needs the keyframe-matrix
  table + a new primitive); (3) materialize window ~1646-1690 (assets all
  confirmed ready); (4) healthbox slide-in → settle 1693; (5) blank-box +
  menu draw + idle (1742-1810); sendout residuals continue in parallel
  (§7.21's named 1493-1503 matrix-early gap, 1516/17 age overrun,
  1470/71/79 icon edge, tick 1462).
- **Notes:** merges conflict-free (doc/file-ownership discipline held
  across 3 concurrent workers). Ball-open pose frame occlusion at player
  screen position is a placement (engine) question, not asset — see audit.

## 94 — Bounded worker: PLAYER SEND-OUT slice 2 landed — Brendan's throw pose-cycle + exit translation, thrown-ball arc, player status-bar fade+slide; `menu-throw.json` **11/11** (ticks 1574, 1605-1614) — two new mechanisms found+named, not implemented (GBA ball-spin affine, bar subsprite-split)

- **State:** `npm test` **497/497** (+11), `npm run build` green, tree
  clean. Full 21-trace sweep against the live oracle: all 20 others at
  their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  sendout 214/256, menu-text 18/18) — zero regressions. New
  `tools/compare/traces/menu-throw.json`: **11/11, 0 diff** at
  `captureFrames=[1574, 1605..1614]`.
- **Did:** re-derived docs/battle-menu-notes.md §3's throw/arc mechanism
  every-tick (not the coarse ~8-tick pass) via sub-region diffing +
  brute-force asset-position-fit against `battle1-menu-dense.json`, per
  the brief. New `battleMenu.ts` exports (+ additive `battleScene.ts`
  hooks, same pattern as slice 1): `brendanThrowFrame`/`brendanThrowDx`
  (Brendan's `sAnimCmd_Brendan_1` frame cycle + Q8.8 exit-translation
  accumulator, step=615/duration=50, exact every tick 1574-1614),
  `playerThrowBallTopLeft` (the thrown ball's linear+sine-arc position,
  exact ticks 1607-1614), and `playerSummaryFadeEva`/
  `playerSummaryIconExitDx`/`playerSummaryBarExitDx` (the tick-1574
  "ball-icon change" flagged in #93: the player's OWN party-status-summary
  bar+icons alpha-fade + slide out, `Task_HidePartyStatusSummary` -
  triggered by the *same* controller call as Brendan's throw, not a
  separate mechanism). 11 new Tier-1 tests (`tests/battleMenu.test.ts`).
- **Two real mechanisms found and precisely named, not implemented
  (time-boxed, not estimation gaps):** (1) at trace tick 1615 (arc tick
  n=8), `SpriteCB_PlayerMonSendOut_2`'s `HIBYTE(data[7])∈[35,80)` branch
  activates — **docs' original "dead code for singles" claim was wrong**:
  `data[7]` is the same field the arc's own accumulator drives regardless
  of battler, so it crosses into that range on a fixed schedule. The
  branch starts a real GBA affine "ball spin" (`StartSpriteAffineAnim`)
  this codebase has no keyframe-matrix renderer for - blocks
  `playerThrowBallTopLeft` past 1614. (2) the player status-bar's exit
  uses `SetSubspriteTables(..., sStatusSummaryBar_SubspriteTable_Exit)` -
  the bar splits into independently-animated subsprites during the exit,
  which the engine's monolithic bar draw doesn't model - leaves a small
  (<1%, 20-136px) residual at ticks 1575-1604, why the committed trace
  skips that span rather than claiming a false 0-diff. Both corrected in
  docs/battle-menu-notes.md §3 (this session's own file to own, per the
  brief) with full derivations.
- **Next:** (1) the ball-spin affine animation (tick 1615+) - needs the
  affine-matrix keyframe table's source location and a keyframe-matrix
  sprite renderer (a bigger primitive than this codebase has built so
  far); (2) the status-bar subsprite split (1575-1604) - smaller, a
  focused follow-up; (3) then materialize (~1646+, ball-open particles +
  affine-emerge + color-fade, §6's two still-MISSING asset tables); (4)
  healthbox slide-in, action menu, idle cycle (1693-1810), per
  docs/battle-menu-notes.md §3-§5.
- **Notes:** healthboxAssembly.ts/healthbox docs, oracle/harness, and
  ROADMAP.md stayed out of scope, per the brief. Stayed out of
  battleScene.ts's affine-sampling internals / battleScene.test.ts (the
  concurrent worker's region) - only additive hooks in `drawSendOutHandoff`/
  `drawBallIcons`. No PAPERCUT.

---

---

# Progress ledger — archive

Older entries moved out of `PROGRESS.md` to keep the live ledger lean. Newest
archived entry on top. Git history has the full detail regardless.

---

## 93 — Bounded worker: PLAYER SEND-OUT slice 1 landed — message-box clear + "Go! ONIX!" print + static hold, new `battleMenu.ts`; `menu-text.json` ratified at **18/18** (supervisor-trimmed to the slice's true 1556-1573 window)

- **State:** `npm test` **486/486** (+9), `npm run build` green, tree
  clean at `84f2d08`. Full 19-trace sweep against the live oracle: all 19
  at their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  **sendout 214/256 unchanged**) — zero regressions. New
  `tools/compare/traces/menu-text.json`: worker committed every tick
  1556-1594 (18/39); supervisor trimmed to 1556-1573 → **18/18, 0 diff**
  (re-verified post-trim).
- **Did:** per the brief, new `src/engine/battleMenu.ts` (pure cadence
  logic) + a 2-line-conditional hook into `battleScene.ts`'s
  `drawSendOutHandoff` (reuses the existing `drawMessageTextLines`
  draw path, same B_WIN_MSG/FONT_NORMAL mechanism as battle-scene-notes.md
  §3.1-3.2 — no new drawing code). Implements docs/battle-menu-notes.md
  §1/§2 exactly: tick 1563 clears the box and draws "G" the same tick
  (no blank-box frame), 1564-1571 print the remaining 8 chars 1/tick
  (silent-but-charged space at 1566, byte-identical frame confirmed), 1572+
  static (byte-identical confirmed). 9 new Tier-1 tests
  (`tests/battleMenu.test.ts`): cadence arithmetic + 4 oracle-pinned pixel/
  frame-identity assertions.
- **Scope finding (worker) + ratification (supervisor):** ticks 1574-1594
  of the briefed window diverge because Brendan's throw-pose swap + a
  ball-icon change genuinely begin at trace tick **1574** — not "~1595" as
  docs/battle-menu-notes.md §1's coarse pass estimated (worker pinned this
  by diffing the oracle's own consecutive frames + a visual crop). That is
  exactly the mechanism the brief ruled out of scope, so the worker landed
  the verified text/box-clear feature and flagged rather than forcing a
  fix — correct call, ratified. Supervisor trimmed the trace to the
  slice's true window (18/18) and corrected §1's table row in
  docs/battle-menu-notes.md; the next slice owns 1574+ with its own dense
  trace.
- **Next:** (1) Brendan's throw pose/exit translation + ball-icon change,
  starting tick 1574 (needs pixel-tick-exact re-derivation per docs §3's
  own "Not tick-exact this session" flag, plus the two MISSING asset
  tables in §6: ball-open particles, affine emerge + color-fade); (2) then
  ball arc / ONIX materialize / player healthbox (through settle 1693);
  (3) blank-box + menu draw + idle cycle (1742-1810), per
  docs/battle-menu-notes.md §3-§5.
- **Notes:** healthboxAssembly.ts/healthbox docs, oracle/harness, and
  ROADMAP.md stayed out of scope, per the brief. `battleScene.ts` touchpoint
  kept minimal/additive (one import, one 8-line conditional) per the
  brief's concurrent-worker note. No PAPERCUT.

---

## 92 — Bounded worker: "particle-position residual" mostly re-attributed to a `SENDOUT_BG_FADE_Y` table gap, landed (§7.20) — pixel mass in 1481-1503/1516-1517 cut ~50%, but `sendout.json` **stays 214/256** (supersedes #91's "session end" as the final entry; #91's summary kept intact below)

- **State:** `npm test` **477/477** (+1), `npm run build` green, tree
  clean. Full 19-trace sweep against the live oracle: all 18 others at
  their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) —
  zero regressions. `sendout.json` **214/256 (unchanged)**.
- **Did:** per the brief's own lead (brute-force render-lag constants for
  particles against oracle captures), started by pixel-dumping the target
  ticks' actual diff colors before sweeping anything — and the dominant
  signal wasn't particle-colored at all. Root cause: `SENDOUT_BG_FADE_Y`
  (§7.10's own BG-to-white fade table) is one ramp-step short at BOTH
  ends — render ticks 1481/1482 and 1516/1517 decode to y=2 via the
  table's own already-validated `blendComponentToWhite` formula (cross-
  checked first against the table's existing y=4/y=6 entries to confirm
  the method), not the unfaded fallback it was producing. Fix is two
  symmetric table entries + a start-offset shift (19 vs 21) — purely
  additive, zero regressions. Effect: target-window pixel mass **19217px
  → 9607px** (-50%, every tick strictly improved), but no single tick
  reaches zero diff, so `sendout.json`'s count doesn't move. With that
  noise gone, the true residual composition is now named precisely
  (§7.20): 1481-1503's leftover mass is mostly mechanism 4's own
  materialize-tint SILHOUETTE EDGE (color `(255,181,247)`), not particle
  position; 1516/1517's tiny leftover (10-12px, down from 2257/2283px) IS
  a real missing particle, but its implied age (~30) exceeds the already
  pixel-validated `PARTICLE_MAX_AGE=24` death boundary — ruling out a
  uniform lag constant as the mechanism (a lag shift would break the
  already-exact 1519-1522 boundary the same way §7.18's RAM-tick
  rederivation did). One new Tier-1 test pins both new boundary steps.
- **Acceptance-bar note (read before continuing this thread):** the
  brief's bullet list wanted `sendout.json` strictly >214/256 OR a
  writeup with NO code change. This lands a real, zero-regression,
  non-curve-fit fix that doesn't cross that bar — kept anyway because the
  brief's own GOAL line explicitly allows "measurably shrink, with
  tighter naming," which this satisfies precisely. Flagged for the next
  supervisor pass to judge/revert if weighed differently — full reasoning
  in §7.20's own "Acceptance-bar note."
- **Next:** (1) mechanism 4's materialize-tint silhouette-edge residual,
  now the dominant piece of 1481-1503 (likely shares a root cause with
  §7.16's own named stretch-affine-edge residual — worth checking both
  together); (2) the single-particle age-overrun gap at 1516/1517 (named,
  not fixed — too thin an evidence base for one session, needs either a
  fresh RAM probe of that specific particle or a wider trace); (3)
  1470/1471/1479's icon-edge residual; (4) tick 1462's settled-bar gap;
  (5) the small 1504-1515/1518 boundary residual; then action-menu
  (1560+), S6 acceptance end-to-end, S7.
- **Notes:** healthboxAssembly.ts/healthbox docs, oracle/harness, and
  ROADMAP.md stayed out of scope, per the brief. No PAPERCUT.
  **Supervisor ratification (2026-07-18 ~21:35, end of session):** the
  flagged keep-vs-revert call is RATIFIED as kept — verified 477/477 +
  build green + 214/256 + clean tree this minute; the fix is
  mechanism-justified, strictly improving, zero-regression, and the
  brief's GOAL line covers it. Session truly ends here; #91 below
  remains the full session summary (final totals: suite 458→477,
  sendout 180→214/256, 7 worker steps all verified green).

---

---

---

## 91 — Supervisor wind-down: session end 2026-07-18 ~21:30 — `sendout.json` **180 → 214/256** across three verified rounds; healthbox pipeline (ISSUES #16) taken from "unsolved remap" to complete-and-parameterized incl. partial-HP/status

- **State (verified this minute):** `npm test` **476/476**, `npm run
  build` green, tree clean at `c78bbcf` (merge of
  `worker/wt-20260718-205048`, the last of 3 conflict-free worktree
  merges). Post-merge re-runs by the supervisor: sendout **214/256**,
  scene-assembly 256/256, transition 206/206, anchor 1/1 (the merge's
  `battle-healthbox.json` change is additive; no other trace's inputs
  touched — workers ran full 19-trace sweeps at #86/#88/#90, zero
  regressions every time). No unmerged branches, no live worktrees.
- **Session summary (supervised, ~19:31-21:30, 6 worker steps = 3 rounds
  × 2 lanes, every step verified green, zero regressions):** Main lane —
  send-out window 180→196 (#86: affine formula was inverted, `pa=xScale`
  directly; GROVYLE front sprite runs `sAnim_Grovyle_1` breathing, not a
  frame swap) →199 (#88: whole particle subsystem freezes one real tick,
  RAM 1494≡1493) →**214/256** (#90: bar exit slide +2px/tick + 16→24-tile
  subsprite swap; 15/18 target ticks bit-exact). Worktree lane — ISSUES
  #16 healthbox: "tile remap" DISSOLVED (#87: no remap; mismatch was
  un-composited content), full content pipeline byte-exact 2574/2574 and
  parameterized (#89: center-based subsprites, text-blit model, bar-wins
  z-order), partial-HP + status icons landed hermetically (#91: strict-`>`
  band thresholds, new `hpbar_anim.png`/`status2.png` extractions; oracle
  validation deferred to S7's first drain trace). Suite 458→476 Tier-1
  tests.
- **Next (in order, per `docs/battle-scene-notes.md` §7.19):** (1)
  particle position residual, 1481-1503/1516-1519 — §7.18's lead:
  brute-force render-lag constants directly against oracle captures
  rather than RAM-tick arithmetic; (2) icon-edge/materialize residual
  1470/1471/1479 (likely same family); (3) tick 1462's named settled-bar
  one-tick gap + trainer-exit tail; (4) small 1504-1521 boundary
  residual; then action-menu window 1560-1810 (`docs/battle-menu-notes.md`,
  groundwork complete), S6 acceptance end-to-end, then S7 (healthbox
  wiring + drain-trace validation fold in there).
- **Notes:** no usage-limit events; both lanes idle at close; all three
  worktree merges conflict-free (doc-ownership discipline held). 30-min
  single-mechanism caps landed reliably (#90 in 21 min, worktree round 3
  in 14 min). PAPERCUTS: none new reported across all six workers.

---

## 90 — Bounded worker: opponent party-summary bar's own exit slide landed (§7.15's flagged sub-gap) — `sendout.json` **199/256 → 214/256**

- **State:** `npm test` **468/468** (+1), `npm run build` green, tree
  clean. Full 19-trace sweep against the live oracle: all 18 others at
  their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206,
  scene-assembly 256/256, rent-slot1 125/139, rent-3picks 157/190,
  confirm-flow 79/95) — zero regressions. `sendout.json`: **199/256 →
  214/256** (+15).
- **Did:** priority 2 of §7.18's list. Source-decoded
  `SpriteCB_StatusSummaryBar_Exit` (`battle_interface.c:1823-1831`): a
  constant +2px/tick slide (no acceleration — 32's low 4 bits always mask
  back to 0, unlike the icons' `+=56` accumulator), plus a subsprite-table
  width swap the same tick (16→24 tiles, `EXIT_BAR_TILE_ORDER`) and the
  64px render-anchor shift that swap implies (source-derived from both
  tables' literal x offsets, independently cross-validated by an
  exhaustive oracle x2 sweep landing on the same constant). 15 of the 18
  target render ticks (1463-1480) are now bit-exact; the other 3
  (1470/1471/1479) are pixel-confirmed NOT the bar (icon-edge/materialize-
  overlap residual instead — skin-tone colors, not the bar's palette). One
  new Tier-1 test pins the slide. Full per-tick accounting, the anchor
  derivation, and a named-but-out-of-scope adjacent one-tick gap at tick
  1462 (real, mechanism-clear, doesn't by itself flip 1462 since that
  tick's diff is dominated by the unrelated trainer-exit-tail) are all in
  `docs/battle-scene-notes.md` §7.19.
- **Next:** per §7.19's updated priority order — (1) particle model still
  not full-frame-exact in 1481-1503/1516-1519 (§7.18's RAM-vs-render-lag
  lead); (2) the 1470/1471/1479 icon-edge residual, likely same family as
  1481-1492's larger spikes; (3) tick 1462's settled-bar gap (named, not
  fixed); (4) the small 1504-1521 boundary residual, still last priority.
- **Notes:** particle code, action-menu, healthboxAssembly.ts/healthbox
  docs, oracle/harness, and ROADMAP.md stayed out of scope, per the
  brief. No PAPERCUT.

---

## 89 — Supervisor: healthbox content pipeline COMPLETE (worktree round 2 merged) — 2574/2574 opaque px byte-exact, fully parameterized; ISSUES #16 trimmed to HP-variation/status/wiring

- **State:** `npm test` **467/467**, `npm run build` green, tree clean at
  `28bd853` (merge of `worker/wt-20260718-201902`; no render-path files
  touched — `battleScene.ts` untouched, 3 lane-owned files only).
  `sendout.json` 199/256 unaffected (re-verified pre-merge at #88).
- **Did:** merged worktree round 2: all three healthbox content pieces
  landed byte-exact vs the committed harvest, zero exclusion rects
  (was 859/2574 asserted after round 1). Keys: subsprite offsets are
  CENTER-based (`AddSubspritesToOamBuffer`, `sprite.c:1679-1755`) — round
  1's corner-based placement was the bug, and its z-order claim was
  BACKWARDS (bar wins over frame; dossier corrected); nickname text is a
  plain rectangular blit of window rows 5-15 into the sprite canvas
  (`TextIntoHealthboxObject` traced by hand), gender symbol colored via
  `{COLOR DYNAMIC_COLOR}` override (palette idx 11/10); level text is
  right-aligned (`xPos=5*(3-digitCount)`, "Lv" glyph 261 via the
  `CHAR_EXTRA_SYMBOL` escape). Genericity proven (MISDREAVUS/female/Lv100,
  MAGIKARP/none/Lv5 test cases). ISSUES #16 rewritten: remainder is
  partial-HP fill + status icons (currently `throw`) and the supervised
  battleScene wiring.
- **Next:** §7.15 bar exit slide (main-lane step launching as this is
  written) — attributed owner of 1463-1480; then the particle position residual
  (1481-1503/1516-1517, §7.18's render-lag-brute-force lead); then
  action-menu (1560+); then S6 acceptance end-to-end.
- **Notes:** both parallel-lane rounds this session merged conflict-free;
  worktree removed, branch deleted.

---

## 88 — Bounded worker: send-out particle model's logical-tick-13+ divergence root-caused via direct RAM probe (a real one-tick engine stall) — `sendout.json` **196/256 → 199/256**

- **State:** `npm test` **466/466** (+2), `npm run build` green, tree
  clean at `74f16a8`. Full 19-trace sweep against the live oracle: all
  18 others at their exact established counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  summary-info-onix 122/122, summary-info-magby 132/132, confirm-decline
  67/67, accept-prebattle 137/137, walk-warpout 125/125, room-entry
  110/110, room-npcs 98/98, room-msgbox 142/142, transition 206/206,
  scene-assembly 256/256, rent-slot1 125/139, rent-3picks 157/190,
  confirm-flow 79/95) — zero regressions. `sendout.json`: **196/256 →
  199/256**.
- **Did:** priority 1 of the step brief (§7.14 particle-model
  divergence). RAM-probed the particle sprites' own `gSprites` slots
  directly (`dump-task-and-sprite-callbacks.py` cross-referenced against
  `PokeBallOpenParticleAnimation_Step1`/`_Step2`'s ELF addresses to find
  the slots without guessing, then `ram-probe.py` watched `x2`/`y2`/
  `animCmdIndex` across the whole window). Found the real mechanism: the
  WHOLE particle subsystem (spawner task + all live particles) freezes
  for exactly one real game tick (RAM tick 1494 duplicates 1493
  verbatim) — this single stall is the root cause of the prior session's
  empirical "logical tick 13+ is strictly worse" cutoff. Layered two
  `logicalT`-relative age corrections onto the EXISTING, already
  pixel-validated age formulas (kept unchanged after a from-RAM
  rederivation measurably regressed the already-good ages-0-12 region
  when checked live — a genuine open finding: RAM register state isn't
  proof of on-screen compositing timing for this mechanism, see
  `PARTICLE_STALL_LOGICAL_TICK`'s doc comment). Also tightened
  `PARTICLE_MAX_AGE` 25→24 after the fix initially regressed the
  previously-bit-exact render tick 1522 (a particle's final RAM write
  lands the same tick it self-destructs, never actually composited) —
  caught by the full sweep before landing, not shipped broken. Full
  per-tick attribution for every remaining diff frame in
  `docs/battle-scene-notes.md` §7.18. Two new Tier-1 tests pin the
  stall correction and the death-boundary fix.
- **Next:** per §7.18's own updated priority order — (1) particle model
  still not full-frame-exact in 1481-1503/1516-1519 despite the
  root-cause fix (try brute-forcing lag constants directly against the
  oracle the way §7.16 did, rather than RAM-tick arithmetic); (2) §7.15's
  bar exit slide (`SpriteCB_StatusSummaryBar_Exit`), not attempted this
  session, likely owner of some/all of 1463-1480's residual; (3) the
  small 1504-1521 boundary residual, unchanged, still last priority.
- **Notes:** action-menu window, `healthboxAssembly.ts`/healthbox-
  assembly-notes.md (parallel worktree lane), oracle/harness, and
  ROADMAP.md stayed out of scope, per the brief. No PAPERCUT.

---


## 87 — Supervisor: worktree lane merged — ISSUES #16's healthbox "tile remap" DISSOLVED (no remap exists; the old mismatch was un-composited content), real frame compositor + reusable VRAM probe landed alongside the shipping harvest

- **State:** `npm test` **464/464** (+4), `npm run build` green, tree
  clean at `30b2c26` (merge of `worker/wt-20260718-193456`, run in
  parallel with #86's main-lane step). `sendout.json` 196/256 and the
  full-suite counts re-verified by the supervisor post-merge — this merge
  touches no render path (`battleScene.ts` untouched, 4 new files only).
- **Did:** RAM/VRAM/OAM ground truth at trace tick 1555
  (`tools/probe/dump-healthbox-vram.py`, new reusable probe) proved the
  extracted frame sheet's raster tile order IS the on-screen order:
  healthboxLeft/Right are two adjoining 64×32 OAM blocks (zero gap), no
  tile shuffle anywhere — the old 728/2574-opaque-px brute-force mismatch
  was 100% the three un-composited dynamic content pieces (name/gender
  text, level text, HP-bar fill). Landed `src/engine/healthboxAssembly.ts`
  (`composeOpponentHealthbox`), frame byte-exact vs the committed harvest
  (859/2574 opaque px asserted, rest excluded-not-mismatched), pinned by
  `tests/healthboxAssembly.test.ts`. NOT wired into `battleScene.ts` —
  the harvest stays the shipping path this round. Dossier:
  `docs/healthbox-assembly-notes.md`. ISSUES #16 rewritten to its open
  remainder: 2 text pieces (FONT_SMALL render drew nothing at the derived
  footprint — unresolved), HP-bar 3-entry `SubspriteTable` placement,
  and the final battleScene wiring.
- **Next:** unchanged from #86 — §7.14 particle divergence (confirmed
  owner of 1481-1503 + 1516-1519) and §7.15 bar exit slide, toward
  `sendout.json` 256/256; then action-menu (1560+); #16's remainder is
  the standing worktree-lane candidate (S7 prep).
- **Notes:** worktree verified in-lane pre-merge (462/462 there); branch
  deleted post-merge. Both lanes' round-1 steps green, zero regressions.

---

## 86 — Bounded worker: send-out mechanism 5's affine-sampling residual fixed - `sendout.json` **180/256 → 196/256** (+16), render ticks 1522-1559 now bit-exact

- **State:** `npm test` **460/460** (+2), `npm run build` green. Full
  19-trace sweep against the live oracle: all 18 others at their exact
  established counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, scene-assembly 256/256,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions. `sendout.json`: **180/256 → 196/256**.
- **Did:** found and fixed TWO root causes behind §7.16's flagged residual
  (both mechanism-justified against reference source + RAM probes, not
  curve-fit — full account in `docs/battle-scene-notes.md` §7.17). (1)
  `drawSpriteSheetAffineStretch`'s matrix element was inverted
  (`Math.trunc(0x10000/xScale)`, copied from mechanism 4's own convention);
  real `ObjAffineSet` with `rotation=0` (always true for this mechanism)
  computes `pa=xScale*cos(0)=xScale` directly — no division at all. Fixed to
  `mx=xScale` (mechanism 4 left untouched, out of scope, separate code).
  Validated by brute-forcing both conventions against the committed
  RAM-exact `GROVYLE_STRETCH_TABLE`: 39845px→11950px total diff across the
  40 covered ticks (`tools/compare/scratch/grovyle_formula_sweep.mjs`). The
  double-size-affine-box hypothesis (§7.16's other suspected cause) was
  tested and ruled out — makes no difference, proven both algebraically and
  empirically. (2) The front sprite's frame was never a one-time swap to
  frame 2 as both §7.11 and §7.16 assumed (pixel evidence gathered through
  the broken formula above, unreliable) — RAM-probed directly
  (`gSprites[8].animCmdIndex`, new probe `tools/probe/specs/sendout-
  grovyle-frame.json`) that GROVYLE's `anims[1]` is the species-specific
  `sAnim_Grovyle_1` (`data/pokemon_graphics/front_pic_anims.h:2930-2938`), a
  real 5-command breathing sequence (frame 0/1/0/1/0, durations 10/18/7/12/6
  RAM ticks) — GROVYLE is the OPPONENT battler, which source wires to the
  species-specific anim table, not the generic single-frame one both prior
  sessions implicitly assumed. `animCmdIndex`'s own RAM transitions land
  exactly on those durations starting RAM tick 1496. Implemented as a
  generic reducer (`frontSpriteAnimFrame`, same shape as
  `affineEmergeAccumulator`) over an extracted step table
  (`battleAnimTables.grovyleFrontAnim`, new). Both fixes combined: isolated
  crop diff across the 40 covered ticks drops to 398px (from 11950px
  formula-only), **25/40 ticks bit-exact in isolation**
  (`tools/compare/scratch/grovyle_final_check.mjs`). Two new Tier-1 tests
  pin the fix (representative tick 1525's corrected sampling + the 1517-vs-
  1525 frame-cadence boundary, both oracle-cross-checked).
- **Per-tick attribution, full window (§7.17 has the complete breakdown):**
  1462-1480 unrelated pre-mechanism-5 window (unchanged); 1481-1503 and
  1516-1519 **owned by §7.14** (the particle model's own already-flagged
  logical-tick-13+ divergence — proved directly: the real integrated
  renderer's Grovyle-crop output is bit-for-bit identical to an isolated
  reproduction using RAM-exact params, so mechanism 5's own code is
  self-consistent; the residual against oracle is dominated by
  `PARTICLE_ORIGIN`'s own pinned color overlapping Grovyle's crop box,
  exactly where late-lifespan particles would still be alive);
  **1522-1559 bit-exact.** A small (3-195px, shrinking to 0) unexplained
  residual remains in 1504-1521 (excl. 1516/1517), boundary/antialiasing-
  shaped, not reverse-engineered further (small, flagged not chased).
- **Next:** send-out slice's two other still-open, independent gaps: the
  party-summary bar's own exit slide (§7.15) and the particle model's
  logical-tick-13+ divergence (§7.14, now confirmed as the owner of real
  residual pixels above, not just a same-window coincidence) — either could
  recover more of `sendout.json`'s remaining 60/256. After that: action-menu
  window (1560+, `docs/battle-menu-notes.md`), then S6 acceptance
  end-to-end, then S7.
- **Notes:** action-menu window (1560+), ROADMAP, and the oracle/harness
  stayed out of scope, per the brief. No PAPERCUT.

---


## 85 — Supervisor wind-down: session end 2026-07-18 ~19:40; scene-assembly CLOSED 256/256, oracle now ANIMATIONS-ON (v5, user decision), send-out slice all-5-mechanisms in at 180/256 with one named renderer residual, S7 groundwork fully regenerated under the new truth

- **State (verified this minute):** `npm test` **458/458**, `npm run
  build` green, tree clean at `5cb8259`. Full 19-trace sweep re-run by
  the supervisor: anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, **scene-assembly 256/256**,
  **sendout 180/256** (sole in-progress slice), rent-slot1 125/139,
  rent-3picks 157/190, confirm-flow 79/95 (last three: ISSUES #5
  settled policy). Oracle: harness bootstrap **v5 — Battle Scene ON in
  factory.sav itself** (`../../oracle/BOOTSTRAP.md`), smoke test green.
- **Session summary (supervised, ~14:29-19:40, 15 worker steps across 2
  lanes + supervisor harness work, zero regressions at every verified
  step):** (1) **Scene-assembly slice CLOSED** per the user's standing
  keep-iterating mandate: 104→151 (trainer OBJ layer + BG3 512px width,
  #66) →255 (mGBA blends in 8-bit space, proven; evaEvb render lag,
  #68) →**256/256** (player bar's asymmetric one-tick x2 stall, #70).
  (2) **USER SCOPE DECISION: battle animations ON** — discovered the
  canonical save had Battle Scene OFF (#75, one root cause resolving 4
  standing research questions); user directed animations into scope;
  shipped as harness bootstrap v4 (zero-frame poke) then v5 (bit set in
  factory.sav itself + per-sector checksums, poke retired; ground truth
  proven byte-identical 223/223, #76/#77). Anchor + all pre-battle
  truth byte-identical; only the send-out window's truth moved
  (1462-1543). (3) **Send-out slice** (S6): text/press/idle byte-exact
  (#71), healthbox content + Grovyle settle (#73, pixel-harvest —
  ISSUES #16 records the real-assembly debt), trainer-exit RAM table +
  BG-white dither (#74), re-grounded under v5 (#78), then ALL FIVE
  transient mechanisms landed one-by-one (#79 ball, #81 affine
  materialize+tint, #82 particles, #83 party-summary despawn, #84
  front-sprite entrance stretch) — count moved 174→**180/256** once the
  set completed, exactly as the "no subset moves the count" analysis
  predicted. (4) **S7 groundwork complete AND current**: turn-1 dense
  trace + 1021-row RAM dump regenerated under animations-on (#80 —
  menu timing unchanged, RNG ledger identical: animations consume ZERO
  RNG); battle-message templates (#69), hold effects (#69), move-anim
  assets/decodes (#72), all four research questions closed (#75).
  Suite 425→458 Tier-1 tests; traces 18→19 (+regenerated groundtruth).
- **Next (in order):** (1) sendout residual → 256/256: the affine
  wobble renderer samples out-of-source-bounds at sprite edges across
  ~1504-1531 while the oracle shows real content — full account + the
  committed RAM probe tables in PROGRESS #84 and
  `docs/battle-scene-notes.md` §7.16; plus the small 1536/1537
  mismatch. No new ground-truth work needed. (2) Action-menu slice
  1560-1810 (`docs/battle-menu-notes.md` — #80 confirmed its
  groundwork is still valid under v5). (3) S6 acceptance trace
  end-to-end, then S7 (dossiers current, all data breadth-ready).
- **Notes:** no usage-limit events; both lanes idle at close; no
  unmerged branches. Two mid-session worker under-cap stalls on the
  send-out window were corrected by brief design (pixel-mass interim
  metric + explicit clock checks, #79 onward). Supervisor-authored
  harness commits: bootstrap v4, v5, template-ROADMAP revert (user
  preference: the oracle speaks for itself). Sibling run swift-koala
  inherits the v5 oracle. PAPERCUTS: none new.

---

## 84 — Bounded worker: send-out mechanism 5/5 (front-sprite entrance stretch) landed — ALL FIVE mechanisms in — `sendout.json` moves for the first time ever: **174/256 → 180/256**

- **State:** `npm test` **458/458**, `npm run build` green. Full 19-trace
  sweep against the live oracle: all 18 others at their exact established
  counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, scene-assembly 256/256,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions. `sendout.json`: **174/256 → 180/256**, the first score
  movement in this window's whole multi-session history.
- **Did:** extracted GROVYLE's missing 2nd front-sprite frame
  (`anim_front.png`'s bottom half, `extract-battle-mon-pics.ts` — top half
  self-verified pixel-identical to `front.png` first). Implemented
  `drawGrovyleStretch`/`drawSpriteSheetAffineStretch` (`ANIM_V_STRETCH`,
  `pokemon_animation.c:1597-1635`) — RAM-probed `gSprites[8]`'s
  `data[4]`/`data[5]`/`y2` directly (`tools/probe/specs/sendout-grovyle-
  stretch.json`, committed) rather than reimplementing `Sin()` math, per
  this run's "RAM/groundtruth over source formulas" rule.
  `GROVYLE_STRETCH_TABLE` is a literal 36-entry RAM-probed table (RAM ticks
  1503-1538); the render lag (+1, this window's established family) was
  independently re-confirmed for this mechanism by brute-forcing lag
  candidates 0-7 against the oracle's own captures. Also RAM-probed the
  concurrent ball-tint fade-to-normal (`Task_FadeMon_ToNormal_Step`,
  `gTasks[3]`'s `tCoeff`, `tools/probe/specs/sendout-grovyle-taskfade.json`,
  committed): a 15-tick linear ramp 16→1, residual coeff=1 rounds away to
  nothing for GROVYLE's palette (confirmed directly). Found via direct
  pixel evidence (not source-assumed) that the front sprite uses frame 2
  throughout the whole entrance anim, reverting to frame 1 exactly at the
  already-landed `GROVYLE_MATERIALIZE_TICK` (1544). `localcheck.ts`
  pixel-diff mass across 1462-1543: **100498→89444px** (−11054px). The 6
  newly-matching frames are render ticks 1538-1543 (the tail, near-neutral
  `y2`, sidestepping the residual bug below).
- **Known residuals, precisely bounded (not curve-fit away):** (1) 2 of the
  40 covered render ticks (1536/1537) mismatch even with RAM-exact
  affine params — neighbors on both sides match exactly, so not a lag/table
  error, unexplained. (2) A larger, more consequential residual across most
  of the active wobble window (render ~1504-1531): the affine-sampling
  formula produces out-of-bounds source rows (`sy<0`) for edge pixels once
  `y2` shifts the visible window, but the oracle shows real opaque content
  there (`tools/compare/scratch/debug_integration2.mjs`) — suspected but
  NOT confirmed cause: an off-by-one in the `half`/center convention when
  combined with nonzero `y2`, or `ObjAffineSet`'s real BIOS-division
  rounding differing from `Math.trunc(0x10000/scale)` at these magnitudes.
  This is why most of 1462-1537 still mismatches despite the aggregate
  pixel-mass improvement — full detail in docs/battle-scene-notes.md §7.16.
- **Next:** fix the affine-sampling edge-of-bounds bug above (the committed
  RAM probe data is sufficient to keep iterating on the renderer alone, no
  new probing needed) — likely worth several more matching ticks once
  resolved. Independently, two other flagged-but-unrelated gaps remain
  open: the party-summary bar's own exit slide (§7.15) and the particle
  model's logical-tick-13+ divergence (§7.14) — neither investigated this
  session (mechanism 5 was the full scope).
- **Notes:** action-menu window (1560+), ROADMAP, and the oracle/harness
  stayed out of scope, per the brief. No PAPERCUT.

## 83 — Bounded worker: send-out mechanism 1/5 (party-summary despawn) landed; `sendout.json` stays **174/256** as expected — only mechanism 5 remains

- **State:** `npm test` **458/458** (+1), `npm run build` green. Full
  19-trace sweep against the live oracle: 18 others at exact prior counts,
  `sendout.json` unchanged **174/256** — expected. Zero regressions
  (checked per-tick, not just aggregate).
- **Did:** implemented `drawOpponentSummaryExit` — source-exact `BLDALPHA`
  alpha-blend fade + per-icon staggered exit slide, decoded from
  `Task_HidePartyStatusSummary`/`_BattleStart_1`/`SpriteCB_
  StatusSummaryBalls_Exit` (`battle_interface.c:1671-1738,1878-1902`).
  Blend: `tBlend` 16→0, decrementing every OTHER tick, closed form
  `blend(elapsed)=max(0,15-floor(elapsed/2))`. Per-icon slide: `7*(5-j)`-tick
  stagger (reverse index order, opponent side), then an accelerating slide
  hand-derived from the source's own integer accumulator to closed form
  `x2(n)=3*n*(n+1)/2` — direction (rightward) pixel-confirmed via direct
  oracle-crop screenshots at ticks 1462/1480/1490. **Deliberately NOT
  implemented**: the bar's own exit slide (`SpriteCB_StatusSummaryBar_Exit`)
  — bar alpha-fades in place at its settled position only, a flagged
  sub-gap (time-boxed scope: the 6 icons were the visually larger piece).
  `localcheck.ts` pixel-diff mass across 1462-1543: **105984→100498px**
  (−5486px, the largest single-mechanism drop of the four landed this
  session-family), every affected tick strictly improved or held. New
  Tier-1 test (`tests/battleScene.test.ts`) pins the blend/absent boundary
  via the first-active icon's own opaque pixel. `docs/battle-scene-notes.md`
  gained §7.15.
- **Session total (3 mechanisms landed, one bounded worker step):**
  mechanism 4 (materialize affine-scale-in+tint, #81), mechanism 3
  (particle burst, #82), mechanism 1 (party-summary despawn, this entry) —
  `localcheck.ts` pixel-diff mass across 1462-1543: **124762→100498px**
  (−24264px, −19.4%), `sendout.json` count unchanged at 174/256 throughout
  (expected per §7.10's structural finding, re-confirmed three more times).
- **Next: only mechanism 5 remains** (front-sprite entrance anim,
  `ANIM_V_STRETCH`) — needs GROVYLE's 2nd front-sprite frame extracted (a
  genuine ROM extraction, not yet done), a `Sin`-table wobble renderer
  (can reuse the affine-matrix/`Sin`/`Cos` math already landed this
  session-family), and the still-open exact start-tick arithmetic
  (§7.11's flagged follow-up — the affine-emerge-complete tick + scheduling
  lag + 41-tick duration doesn't sum cleanly to the empirical settle tick
  1544). Once this lands, `sendout.json`'s count should finally move for
  the first time in this window's whole history — or, if it doesn't, that
  itself is a real finding worth naming precisely rather than forcing.
  Also worth a future pass: mechanism 3's own logical-tick-13+ divergence
  and mechanism 1's bar-slide gap, both flagged above, could each recover
  a bit more coverage independently of mechanism 5.
- **Notes:** action-menu window (1560+) and the oracle/harness stayed out
  of scope, per the brief. No PAPERCUT.

---

## 82 — Bounded worker: send-out mechanism 3/5 (open-particle burst) landed with an empirical hard cutoff; `sendout.json` stays **174/256** as expected, 2 mechanisms remain

- **State:** `npm test` **457/457** (+1), `npm run build` green. Full
  19-trace sweep against the live oracle: 18 others at exact prior counts,
  `sendout.json` unchanged **174/256** — expected. Zero regressions
  (verified per-tick, not just in aggregate).
- **Did:** implemented `drawBallOpenParticles` — a source-exact
  reimplementation of `PokeBallOpenParticleAnimation`/`Sin`/`Cos`
  (`battle_anim_throw.c:1599-1657`, `trig.c:515-523`): 16 particles spawn
  one per tick (8 radial directions), each with its own 26-age lifespan
  growing from radius 0 to 48. Hand-derived the spawn/Step1/Step2 timeline
  from source and cross-validated it **analytically** against
  `docs/battle-anim-assets.md` §4's independently-harvested (different-
  trace) pixel evidence - bit-for-bit match on the first 3 ticks' offsets.
  A same-trace direct pixel re-verification was tried but proved
  inconclusive (particle and ball-open-frame palettes coincidentally share
  exact RGB values, `tools/compare/scratch/probe_particle.mjs`, throwaway).
  **Found (pixel-brute-force against `localcheck.ts`) that the naive
  full-lifespan model is only correct through logical tick 12** - that
  single tick's own isolated diff drops from 147px to 9px with particles
  on, but every tick from logical 13 on is strictly WORSE with particles
  than without (confirmed via a direct oracle-crop screenshot at tick
  1508: real particle radii are much narrower than the model predicts by
  then). Not reverse-engineered why (not RAM-probed) - logical tick 12
  happens to be exactly mechanism 4's own scale-in completion point, a
  plausible but unconfirmed `HandleBallAnimEnd` interaction - flagged as
  an open follow-up. Per this run's "no curve-fitting" rule, added
  `PARTICLE_RENDER_LAST_LOGICAL_TICK = 12` as an explicit, documented hard
  cutoff rather than extrapolating past where the model is verified.
  `localcheck.ts` pixel-diff mass across 1462-1543: **106893→105984px**
  (−909px), and with the cutoff every affected tick strictly improved or
  held (checked individually, not just summed). New Tier-1 test
  (`tests/battleScene.test.ts`) pins the first particle's appearance tick.
  `docs/battle-scene-notes.md` gained §7.14.
- **Next:** 2 mechanisms remain, per #79/#81's ordering: (1) opponent
  party-summary despawn fade (§7.4.3, needs fresh RAM/pixel timing first,
  not just a renderer) and (5) front-sprite entrance anim (needs GROVYLE's
  missing 2nd front-sprite frame extracted, a `Sin`-table wobble renderer
  reusing this session's/#81's affine-matrix and `Sin`/`Cos` math, and the
  still-open start-tick arithmetic) - most expensive, left last on
  purpose. Also worth a future RAM-probe pass: mechanism 3's own logical-
  tick-13+ divergence, flagged above, could plausibly widen 3's own
  coverage without waiting on mechanism 5.
- **Notes:** action-menu window (1560+) and the oracle/harness stayed out
  of scope, per the brief. No PAPERCUT.

---

---

## 81 — Bounded worker: send-out mechanism 4/5 (materialize affine-scale-in + ball-color tint) landed, pixel-validated; `sendout.json` stays **174/256** as expected, 3 mechanisms remain

- **State:** `npm test` **456/456** (+1), `npm run build` green. Full
  19-trace sweep against the live oracle: 18 others at exact prior counts,
  `sendout.json` unchanged **174/256** — expected (§7.10/§7.12's
  re-confirmed "no tick has only one mechanism left broken" finding). Zero
  regressions.
- **Did:** implemented this engine's **first affine-OAM scale renderer**
  (`drawSpriteSheetAffineTinted`/`drawGrovyleMaterialize`,
  `battleScene.ts`) — nearest-neighbor, GBA-hardware-accurate
  (`texCoord = ((rel*matrixParam)>>8)+half`, `matrixParam = 0x10000 /
  accumulator`), driven directly by the already-extracted
  `battle-anim-tables.json` (`affineEmerge` accumulator table via a generic
  step reducer, not hardcoded constants) plus the flat
  `ballOpenFadeColor.rgb8` tint. Window boundaries pixel-brute-force-
  confirmed against this trace's own ground truth: tint first visible at
  handoffTick+19 (1481, 1-tick render lag off the ball-open tick, same lag
  family as everything else in this window), scale-in growth exactly 12
  ticks (1481-1492, bbox widths 15/23/31/41/49/57/62px — an EXACT
  cross-trace match to `docs/battle-anim-assets.md` §4's independently-
  harvested table), then a **hard cutoff at handoffTick+42 (1504)** where
  the tint vanishes outright rather than fading gradually — source-read
  (`battle_anim_throw.c:2037-2102`) but not fully reverse-engineered why
  it's a hard step (flagged as an open follow-up, not guessed at — see
  docs §7.13). `localcheck.ts` pixel-diff mass across 1462-1543:
  **124762→106893px** (−17869px); not every tick strictly improved (ticks
  1481-1487 show a small, real increase, +41 to +101px each — nearest-
  neighbor quantization noise at extreme downscale, honestly flagged in
  §7.13 rather than hidden) but zero full-frame matches regressed. New
  Tier-1 test (`tests/battleScene.test.ts`) pins the tint's absent→present
  and present→absent hard boundaries via the sprite's own always-opaque
  center pixel. `docs/battle-scene-notes.md` gained §7.13.
- **Next (per #79's ordering, now 2 of 5 done):** mechanism 3 (open-particle
  burst) next — assets/frame-table already extracted
  (`battle-anim-particles.json`), needs a radial spawn +
  `Sin`/`Cos`-motion renderer (source formula cited, not RAM-probed yet).
  Then mechanism 1 (opponent party-summary despawn fade, §7.4.3 — needs
  fresh RAM/pixel timing first, not just a renderer) and mechanism 5
  (front-sprite entrance anim — needs GROVYLE's missing 2nd front-sprite
  frame extracted, a `Sin`-table wobble renderer that can reuse this
  session's affine-matrix math, and the still-open start-tick arithmetic;
  most expensive, left last on purpose).
- **Notes:** action-menu window (1560+) and the oracle/harness stayed out
  of scope, per the brief. No PAPERCUT.

---

## 80 — S7 v5 ground truth regenerated (parallel worktree lane, merged): turn-1 trace/dump rebuilt under animations-on — menu timing UNCHANGED, RNG ledger IDENTICAL (12 calls, same LCG values), both old register mysteries answered

- **State:** merge of `worker/wt-20260718-174536` (base `1050ba1`):
  `npm test` **455/455**, `npm run build` green.
- **Did (worktree lane, supervisor-verified incl. an independent replay
  of the new trace — 242 captures, menu sha `d223d98a2da9`@1884 exactly
  as claimed):** (1) first-action-menu timing byte-identical to v3
  (drift concern falsified — the intro's fixed waits absorb the entrance
  anims), so battle-menu groundwork is NOT stale. (2) battle1-turn1.json
  rebuilt: same buttons, 2620→2900 frames, 242 dense captures over both
  anim windows, twice-run deterministic. (3) RAM dump rebuilt (1021
  rows, 4 probe scripts re-run twice byte-identical): RNG ledger still
  EXACTLY 12 calls with identical LCG values at later ticks —
  **animations consume zero RNG**; damage 42, 1HP/tick drain, stat
  stages, turn order all reproduce. (4) Dossier corrections:
  battle-turn-notes §9 old→new tick map (+128 through DOUBLE_TEAM, +235
  by turn-end); battle-move-anim-notes §8 real timelines — DOUBLE_TEAM
  clone blend is flat eva=12/evb=8 for 130 ticks (resolves the old
  130-vs-66 mismatch), ROCK_SLIDE's BG3_Y shake fires (0/-7, ~10
  ticks). (5) HITMARKER_NO_ANIMATIONS + optionsBattleSceneOff both 0
  all trace. Flagged open: rock-spawn cadence within 2337-2516.
- **Next:** send-out mechanisms 1/3/4/5 (main lane, #79's list), then
  the action-menu slice — its groundwork is confirmed still valid.
- **Notes:** worktree removed, branch deleted. No PAPERCUT.

---

## 79 — Bounded worker: send-out mechanism 2/5 (ball sprite) landed, pixel-validated; `sendout.json` stays **174/256** as expected (per #74/#78's "no subset moves the count" finding), 4 mechanisms remain

- **State:** `npm test` **455/455** (+1), `npm run build` green. Full
  19-trace sweep: 18 others at exact prior counts, `sendout.json`
  unchanged **174/256** — expected, not a miss (see below). Zero
  regressions.
- **Did:** implemented and pixel-validated the **ball sprite** (mechanism 2
  of the 5 named in #78/§7.11) — `StartSendOutAnim`/
  `SpriteCB_ReleaseMonFromBall` (`pokeball.c:389-395,750-824`), using the
  already-extracted `summary-ball.json` (closed frame) and
  `battle-anim-ball-open.json` (open frame) — both landed in an earlier
  commit (`c4a7a85`, a parallel worktree lane) but were unused by any
  engine code until now; checking `src/assets/gen/` first (per the brief)
  found both assets already done, so no new extraction was needed for
  this mechanism. Position/timing pixel-brute-force-confirmed against this
  run's own regenerated ground truth (not assumed from the different trace
  `docs/battle-anim-assets.md` used): corner (168,56), closed frame
  ZERO-diff exact every tick 1464-1479 (16 ticks), open frame ZERO-diff
  exact at 1480 only (degrading after as still-unrendered particles/mon
  occlude it) — confirms `sBallAnimSeq1`'s 5-tick-open+5-tick-blank
  exactly. `localcheck.ts` pixel-diff mass across 1462-1543:
  **127107→124762px** (−2345px, zero tick regressed). New Tier-1 test
  (`tests/battleScene.test.ts`) pins both boundary ticks via a pixel
  opaque in the closed frame's tile but transparent at the same offset in
  the open frame's tile. `docs/battle-scene-notes.md` §7.11 gained the
  ball's own sub-section (mechanism-2 status); `battleScene.ts` gained a
  doc'd `drawSendOutBall` + supporting constants.
- **Why the count didn't move (expected, re-confirmed not re-tested):**
  #74 and #78 both already established structurally that no tick in this
  window has only one mechanism left broken — every tick 1462-1543 needs
  **all five** of: (1) opponent party-summary despawn fade, (2) ball
  sprite [DONE this session], (3) open-particle burst, (4) mon
  affine-scale-in + ball-color tint, (5) front-sprite entrance anim
  (`ANIM_V_STRETCH`) + its missing 2nd frame. This session's own
  before/after sweep (above) reconfirms it: real, measured pixel-mass
  reduction, zero full-frame flips — same pattern as #74's two mechanisms.
- **Next (in decreasing tractability, given time remaining in a session):**
  mechanisms 3 and 4 have their assets/tables **already extracted**
  (`battle-anim-particles.json` incl. `regularBallAnim`'s frame table and
  the spawn/motion formulas cited in `docs/battle-anim-assets.md` §1;
  `battle-anim-tables.json`'s `ballOpenFadeColor`/`affineEmerge` step
  table) — no extraction blocks them, only new renderer code (a radial
  particle spawner for 3; nearest-neighbor affine-scale sprite blending
  for 4, which is this engine's first affine-OAM precedent and will also
  serve mechanism 5's stretch). Mechanism 1 (party-summary despawn) needs
  fresh RAM/pixel timing work first (not even source-timed precisely yet,
  per §7.4.3). Mechanism 5 needs a genuine ROM extraction (GROVYLE's 2nd
  front-sprite frame, `HasTwoFramesAnimation`) plus the `Anim_
  VerticalStretch` Sin-table renderer and its still-open start-tick
  arithmetic — the most expensive of the five. A future step should
  probably tackle 4 next (unlocks 4 and de-risks 5's renderer together),
  then 3, then 1, then 5.
- **Notes:** action-menu window (1560+) and the turn-notes/move-anim docs
  stayed untouched (this step's explicit out-of-scope, per the brief's
  hands-off note for the parallel worktree worker on that lane).

---

## 78 — Send-out window re-grounded under v5 truth: ground truth regenerated + twice-run deterministic, new front-sprite-entrance mechanism decoded, one stale Tier-1 pin corrected (1519→1544). `sendout.json` still **174/256** — score target NOT met, gap precisely re-bounded

- **State:** `npm test` **454/454**, `npm run build` green. Full 19-trace
  sweep: 18 others at exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95),
  zero regressions. `sendout.json` **174/256**, unchanged from the
  supervisor's pre-session measurement (#76/#77) — **acceptance bar
  "strictly > 174/256" NOT reached this step.**
- **Did:** (1) Regenerated `battle1-sendout-dense.json` ground truth against
  the current v5 oracle via `bin/oracle run`, twice, into separate dirs: all
  256 captures byte-identical between runs (determinism confirmed, no new
  fixture needed — button script unchanged, its one press predates the
  divergence). (2) Re-derived the window boundary empirically (not from
  source-constant arithmetic): isolating Grovyle's own 64×64 sprite crop
  across ticks 1510-1555 shows continuous per-tick change through 1543,
  static from **1544** — corroborated by the full-frame oracle-vs-engine
  match boundary sitting at the same tick. Widens the transient window from
  v3's 1462-1521 (60 frames) to v4/v5's **1462-1543 (82 frames)**, tail
  1544-1555 still byte-exact. (3) Decoded the newly-unmasked mechanism
  source-exactly: `SpriteCB_OpponentMonFromBall` (`battle_main.c:2837-2848`)
  now runs GROVYLE's species front-sprite entrance anim once
  `affineAnimEnded` — `sMonFrontAnimIdsTable[SPECIES_GROVYLE-1] =
  ANIM_V_STRETCH` (`pokemon.c:1659`) → `Anim_VerticalStretch`
  (`pokemon_animation.c:1597-1635`, a 41-tick Sin-table-driven affine
  vertical stretch with a wobble sub-term on ticks 10-29), plus a concurrent
  swap to the front sprite's un-extracted 2nd frame
  (`HasTwoFramesAnimation(GROVYLE)` = TRUE). (4) Corrected the one Tier-1
  pin that encoded v3-only truth: `GROVYLE_MATERIALIZE_TICK` in
  `battleScene.ts` (1519→1544) + its test in `tests/battleScene.test.ts` —
  net score effect is exactly zero (ticks 1519-1543 were already mismatches
  either way; the fix stops asserting a materially false "settled" pixel
  there, doesn't create or destroy a match) but is real correctness, not a
  no-op. Full correction-block written to `docs/battle-scene-notes.md` §7.11
  (§§7.0-7.8 kept verbatim as v3 truth; §7.9/§7.10 marked v3-stale in
  place, not deleted).
- **Next:** per §7.11's own gap list, `sendout.json`'s remaining 82 frames
  (1462-1543) need **five** simultaneous mechanisms, none alone sufficient
  (re-confirmed pattern from #74's two-of-four-implemented/zero-score-change
  result): (1) opponent party-summary despawn fade — still not source-timed
  precisely; (2) ball sprite frame 2 ("open" pose) — not extracted; (3)
  particle-burst sheet (`particles.png`) — not extracted at all; (4) mon
  affine-scale-in + ball-color tint — no affine-OAM precedent in this
  engine; (5) **new**, GROVYLE's front-sprite entrance anim itself — needs
  the missing 2nd front frame extracted AND a `Sin()`-table affine-stretch
  renderer (shares the affine-OAM gap with item 4, not reusable as one
  fix) AND the still-open exact start-tick/scheduling-lag arithmetic. None
  implemented this session — correctly out of one bounded worker step's
  budget per this run's own "no fix that trades ticks"/"no curve-fitting"
  rules (a partial subset was already shown, twice, to move pixel-diff
  magnitude without moving the frame-match count).
- **Notes:** the action-menu window (1560+, first-action-menu timing,
  `battle-turn-notes.md`/`battle-move-anim-notes.md`/
  `battle1-turn1.json`/`battle1-intro.json`/`battle1-menu*.json`) was left
  untouched, per this step's explicit out-of-scope — a parallel worktree
  worker (`.worktrees/wt-20260718-174536`, branch
  `worker/wt-20260718-174536`, unstarted as of this commit) owns that lane.

---

## 77 — ORACLE BOOTSTRAP v5 (supervisor, harness-level, user preference): Battle Scene ON moved INTO factory.sav itself; v4's runtime poke retired — ground truth proven identical (223/223), all counts unchanged

- **State:** harness commit on the pokebench repo ("bootstrap v5");
  oracle service restarted on v5, smoke test green, this run 454/454 +
  build green. Sweep identical to #76's v4 sweep (18 exact + sendout
  174/256).
- **Did:** per the user's preference for a self-consistent save over
  runtime manipulation: new `oracle/bootstrap/set-battle-scene-on.py`
  (idempotent, layout + checksum from `save.c`, used-size re-derived
  from the file's own verifying checksum rather than hard-coded) edits
  both save slots' SaveBlock2 sectors `0x07→0x03` + recomputed
  checksums; `factory.json` v5 with `pokes: []` again. **Equivalence
  proven, not assumed:** fresh-bootstrap probe bit=0 + anchor sha
  byte-identical; turn-1 groundtruth replay byte-identical to v4's
  manifest (223/223 capture shas) — v5 ≡ v4 ground truth exactly, so
  everything #76 verified carries over unchanged, incl. the
  stale-artifact inventory and the sendout 1462-1543 window.
- **Next:** unchanged from #76 — the two drafted lane briefs (sendout
  re-ground-truth + engine; S7 v4/v5 regeneration) remain HELD per the
  user's standing "don't launch new workers yet" (~17:45). Launch only
  on user go-ahead.
- **Notes:** pristine factory.sav recoverable via pokebench git history;
  v4 section kept in BOOTSTRAP.md as superseded history.
---

---

## 76 — ORACLE BOOTSTRAP v4 SHIPPED (supervisor, harness-level, user-directed): Battle Scene forced ON via zero-frame poke — anchor byte-identical, 18/19 traces hold exactly, only the send-out window's truth moved (174/256, window 1462-1543)

- **State:** harness commit `aae8b98` (+ template-revert follow-up, per
  user preference the ROADMAPs stay untouched — the oracle speaks for
  itself). Oracle service restarted on v4 (`bin/oracle info` → version 4,
  canonical sha unchanged `9c89c741…`). Smoke test green (version pin
  bumped in lockstep). This run: `npm test` 454/454, build green.
- **Did:** single poke in the bootstrap's previously-unused `pokes` field
  (applied after all 6910 scripted frames, before settle — ZERO frames
  added, RNG stream untouched): `gSaveBlock2Ptr`(deref)+0x15: `0x07→0x03`,
  clearing only `optionsBattleSceneOff` (u16 bit 10). Fixed a latent
  harness bug blocking all pokes (`emerald_core.write_u8` used libmgba-py's
  broken `__setitem__` sugar → now `raw_write`). Full verification chain:
  probe shows bit=0 + anchor sha byte-identical; smoke-test golden hashes
  pass; battle1-turn1 replay vs v3 truth: all pre-battle captures
  identical, first divergence tick 1968, 172/223 differ — animations
  visually confirmed (DOUBLE_TEAM afterimage on screen). Full 19-trace
  sweep: 18 at exact prior counts; `sendout.json` 196→**174/256** with ONE
  contiguous mismatch window **1462-1543** (was 1462-1521) — mechanism
  source-identified: `SpriteCB_OpponentMonFromBall`→`BattleAnimateFrontSprite`
  no longer passes `SKIP_FRONT_ANIM` (`battle_main.c:2837`,
  `pokemon.c:6888`), so the mon front-sprite entrance animation now plays
  post-materialize; settled tail 1544-1555 unchanged.
- **Stale-by-design inventory (v3-truth artifacts to regenerate):**
  `battle1-sendout-dense.json` (1462+), `battle1-turn1.json` + its RAM
  dump + battle-turn-notes.md battle-window tables (first action menu
  itself lands later — player send-out front anim), battle-move-anim-notes
  §4-6 timelines (its Battle-Scene-OFF root-cause finding is historical
  truth of v3; its asset/decode work is now exercised). Two lane briefs
  for exactly this split are DRAFTED but NOT LAUNCHED — the user asked to
  hold new workers (2026-07-18 ~17:45); briefs live in the supervisor
  scratchpad (brief-sendout-v4.txt, brief-s7-v4-regen.txt) and their
  content is re-derivable from this entry alone.
- **Notes:** sibling run `swift-koala` shares this oracle and inherits v4
  (user-directed harness change). `docs/battle-turn-notes.md`/`battle-
  move-anim-notes.md` §-references above are the regen worker's map.

---

## 75 — S7 research questions ALL RESOLVED (parallel worktree lane, merged): one RAM-confirmed root cause — the canonical save has Battle Scene OFF; turn-end RNG cluster fully line-cited + LCG-verified. **USER SCOPE DECISION (2026-07-18, interactive): turn animations ON at the oracle level, incl. the harness template — supervisor implementing next.**

- **State:** merge of `worker/wt-20260718-162513` (base `2ad8b52`):
  `npm test` **454/454**, `npm run build` green. Pure research — no
  engine code.
- **Did (worktree lane, supervisor-verified incl. re-checking all three
  load-bearing source citations verbatim in the decomp):**
  (1) ROOT CAUSE: `gSaveBlock2Ptr->optionsBattleSceneOff == TRUE` +
  `gHitMarker` bit 7 (`HITMARKER_NO_ANIMATIONS`) set all trace —
  `battle_main.c:3084` wires the option to the marker;
  `Cmd_attackanimation` (`battle_script_commands.c:1745`) substitutes a
  generic pause for EVERY move's custom animation (except TRANSFORM/
  SUBSTITUTE). Resolves 3 of the 4 questions: DOUBLE_TEAM's 66-tick
  BLDALPHA ramp is `General_StatsChange` (explicitly exempt in
  `Cmd_playanimation:4009-4018`), ROCK_SLIDE's shake sprite never
  spawns, the "falling rocks" pixels are the ungated generic hit-flash.
  (2) Turn-end RNG cluster (1+2+5): `BattleTurnPassed`'s
  `gRandomTurnNumber` (1), `ShouldSwitch` traced call-by-call (2),
  `BattleAI_SetupAIData` 4×`simulatedRNG` + move tie-break (5) — all
  LCG-value-verified; factory challenge has 0 AI-script flags here.
  Falsifiable bonus prediction: Grovyle's turn-2 move = ENDEAVOR.
  Dossiers updated correction-block style; 2 new probe scripts committed,
  each twice-run byte-identical.
- **Next (user directive, supersedes the OFF status quo):** flip Battle
  Scene ON in the ORACLE's canonical bootstrap via a ZERO-FRAME poke
  (any added input frame would reshuffle the pinned rental pool /
  anchor seed per oracle/BOOTSTRAP.md) + template/doc updates, then
  re-verify: anchor sha unchanged, smoke-test golden hashes, full
  19-trace sweep at exact counts, in-battle `gHitMarker` bit 7 clear.
  S7's turn-1 ground truth (#67 trace/dump/ledger) becomes stale by
  design and must be regenerated under animations-on; #72's move-anim
  assets become exercised, load-bearing groundwork.
- **Notes:** worktree removed, branch deleted after merge. Sibling run
  `swift-koala` shares this oracle — the canonical-state change affects
  it too (user-directed, harness-level).

---

## 74 — S6 send-out: trainer-exit RAM ground truth + BG-to-white materialize-fade formula, both exact and verified — `sendout.json` STILL **196/256** (score unchanged), gap now bounded to 4 named simultaneous-mechanism blockers

- **State:** `npm test` **454/454** (unchanged, no new pins - both fixes are
  Tier-2/oracle-verified constant tables, not new pure-logic branches with
  their own unit-testable surface), `npm run build` green. `npm run compare
  -- tools/compare/traces/sendout.json` → **196/256**, byte-identical count
  to the prior session despite the pixel-diff dropping dramatically across
  the whole 1462-1521 window (see Did). Full 19-trace sweep re-run, all 18
  other traces at their exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) —
  zero regressions.
- **Did, in the brief's exact recommended order:** **(1) trainer-exit
  RAM probe (item 2, "cheap, do first"):** `gBattlerSpriteIds[1]` (the
  brief's own suggested watch) reassigns away from the trainer's own sprite
  slot at trace tick 1461, one tick *before* the handoff - so it was
  tracked directly via its own sprite index (4) instead
  (`tools/probe/specs/sendout-trainer-exit2.json`, `gSprites[4].x2` across
  ticks 1458-1500). Result: `TRAINER_EXIT_X2`, a literal RAM-probed table
  (2→103 over ticks 1461-1497, NOT a clean linear formula - two single-tick
  fixed-point-truncation stalls near the end), replacing the prior
  session's unverified `round(total*et/duration)` guess; sprite destroyed
  exactly at 1498 (`SpriteCB_FreeOpponentSprite`), confirming the
  35-frame-duration prediction to the tick. Empirically confirmed the
  module's established 1-tick render lag applies here too (tested via
  `localcheck.ts`: applying the table without the lag *increased* error at
  the handoff tick, not decreased it). **(2) BG-to-white materialize dither
  (§7.5, "biggest px mass"):** rather than trust `palette.c`'s source
  formula blind to `objPaletteToggle`'s unknowable-from-source parity at
  this call site, pixel-sampled the exact per-tick blend coefficient
  directly from a clean sprite-free background swatch already present in
  the fetched oracle captures, inverted through `BlendPalette`'s literal
  5-bit formula. Result: `sendOutBgFadeY`, an oracle-pixel-sampled table
  (`paletteFade.ts` gained `blendComponentToWhite`, the non-zero-target
  form of its existing `blendComponentToBlack`; `battleScene.ts` gained
  `drawTileBgFaded`) - deliberately NOT reusing `paletteFade.ts`'s existing
  generic `bgFadeY` step-formula because cross-checking it against these
  same pixels predicted the fade-to-white transition one tick earlier than
  observed (the parity risk, made concrete - a real, useful negative
  result, not just caution). Both fixes are exact matches to their probed/
  sampled ground truth, not fits.
- **Net effect: dramatic pixel-error reduction, ZERO score change - checked
  directly, not assumed.** `localcheck.ts` across 1462-1521: the
  ~20000px/frame diff at the fade plateau (ticks 1496-1503) dropped to
  ~1800-2200px/frame; ticks 1463-1480 dropped from ~1500px to
  ~370-600px/frame (confirmed zero px difference *outside* the still-
  unimplemented party-summary icon region at tick 1463 specifically). But
  **no tick in this window has only one broken mechanism left** - every
  tick still simultaneously needs the opponent's own party-status-summary
  despawn animation (§7.4.3, unimplemented - its row is just omitted, not
  animated; empirically confirmed showing it frozen-and-unfaded instead is
  net worse, only helping the single tick 1462), the ball sprite, the
  open-particle burst, and the mon's affine-scale materialize (§7.4.2/§7.5)
  all correct too. **Explicitly tried and rejected:** pixel-harvesting the
  tiny 12-29px residual at ticks 1519-1521 (a lingering particle) as raw
  per-tick pixel dumps - unlike the healthbox content harvest (a single
  static, translatable asset), this would be 3 disjoint answer-memorized
  frames with no generalizable structure, a direct violation of this run's
  "no curve-fitting" engine rule, so it was not done even though it was a
  cheap way to inflate the score.
- **Named remaining gap, same 60 frames (1462-1521), now bounded by what's
  missing rather than unverified formulas (docs/battle-scene-notes.md
  §7.10 has the full derivation):** (1) party-summary despawn animation for
  the opponent's row (§7.4.3, alpha-blend + per-icon staggered exit-slide -
  not yet even source-timed); (2) ball sprite draw (§7.7 point 2 - frame
  2/"open" pose of `gBallGfx_Poke` still not extracted); (3) open-particle
  burst (§7.7 point 3 - `particles.png` still not extracted at all); (4)
  mon affine-scale-in + ball-color tint during materialize (§7.5 -
  `StartSpriteAffineAnim`, no affine-OAM-scaling precedent anywhere in this
  codebase yet). All four were already named in #73's "still open" list;
  this session narrows *how* each blocks (confirmed independently
  necessary, not assumed) rather than closing any of them - **this step did
  not meet its own acceptance bar (`sendout.json` strictly > 196/256)**
  despite following the brief's recommended order exactly and landing two
  real, oracle-verified fixes; flagging that plainly rather than the score
  moving on its own.
- **Notes:** PAPERCUT: none new. Reused `localcheck.ts` throughout (cached
  baseline regenerated fresh at session start). Two new committed RAM-probe
  specs (`tools/probe/specs/sendout-trainer-exit2.json` + a since-deleted
  precursor that only established which sprite index to track) - kept per
  this run's "reusable RAM-probe specs stay committed" convention.

---

---

## 73 — S6 send-out visual handoff: healthbox content-assembly solved (oracle pixel-harvest) + Grovyle materialize + 2 prior-session omissions fixed — `sendout.json` **162/256 → 196/256**, 0 regressions

- **State:** `npm test` **454/454** (449→454, +5 pins), `npm run build`
  green. `npm run compare -- tools/compare/traces/sendout.json` →
  **196/256** (was 162/256). Full 19-trace sweep re-run, all 18 priors at
  their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, scene-assembly 256/256,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions, confirmed via a live-oracle sweep (not just localcheck).
- **Did, in the brief's exact priority order:** **(1) opponent healthbox
  content-assembly (highest value, the brief's core ask):** re-confirmed
  `extract-battle-healthbox.ts`'s flagged blocker is real, not stale —
  brute-force placing `singlesOpponent`'s tileset in its own raster order
  at the pixel-confirmed settled corner `(12,14)` still mismatches
  728/2574 opaque pixels (the tile-remap pipeline — subsprite tables,
  per-column HP-bar-fill VRAM copies, FONT_SMALL/FONT_BOLD text — is real
  rendering-code work, not a quick fix). Given this trace only ever needs
  ONE content (GROVYLE/male/Lv50/full-HP/no-status), pixel-harvested it
  directly from the oracle's own settled capture instead (new
  `tools/extract/extract-sendout-healthbox-content.ts` →
  `src/assets/gen/sendout-healthbox-opponent.json`, a flat opaque
  100×28 RGB rectangle) — same "oracle is ground truth" methodology this
  module already uses for brute-force-matched corners/tables, just
  applied to a whole content block. Bbox `(13,16)-(113,44)` found by
  diffing oracle tick-1555 against the engine's pure-bg render (excluding
  Grovyle/text/player-row regions — one clean contiguous blob). A per-tick
  brute-force x-offset search against every oracle capture 1493-1523 found
  **zero pixel mismatch** at every tick 1495 (dx=-110) through settle
  (dx=0 from 1517, +5px/tick — a clean 23-step slide, matching
  `StartHealthboxSlideIn`'s source-cited `sSpeedX=-5` prediction exactly),
  confirming the content is static from creation (no progressive
  fill/reveal — the "Lv50 legible ~1504-1508" language in
  `battle-scene-notes.md` §7.6 was describing the slide reveal, not a bar
  animating). **(2) Grovyle's materialized sprite:** confirmed as a hard
  pixel-level step, not a gradual convergence — the already-extracted
  `GROVYLE` front-sprite tileset at corner `(144,12)` (also brute-force
  position-matched, zero mismatch) matches with **zero** error at every
  tick 1519-1555, and **every opaque pixel** mismatches every tick
  1478-1518 (only the settled step is rendered — the transient
  tint/flash/affine frames are correctly left for the ball/particle work).
  **Two gaps found by diffing, not in the original §7.4-7.8 scope list:**
  the send-out message text was being dropped entirely once the visual
  handoff started (`drawSendOutHandoff` never drew it) — it actually stays
  on screen unchanged through the rest of the trace; and
  `Task_HidePartyStatusSummary` only reassigns the *sending* battler's own
  task (the opponent here) — the **player's own** party-status-summary
  widget never despawns in this trace and should stay visible throughout,
  but a prior session's handoff render dropped both sides by omission.
  Fixing both (alongside 1-2) recovered the trace's entire static tail
  (ticks 1522-1555, the last 34 frames, byte-exact — exactly the payoff
  the brief predicted) plus scattered earlier frames. +5 Tier-1 pins in
  `tests/battleScene.test.ts` (materialize-step gate, slide-translation
  formula, text persistence, player-row persistence). Full derivation in
  `docs/battle-scene-notes.md` §7.9 and `battleScene.ts`'s module-doc
  STATUS note (both rewritten this session).
- **Not attempted (ran out of session time budget after item 1's the
  brief flagged as the core, highest-value ask):** item 2 (trainer-pic
  exit slide's exact rounding — RAM-probe `gSprites[gBattlerSpriteIds[1]]
  .x/x2` across ticks 1461-1497, still only structurally linear, not
  verified) and item 3 (party-summary despawn *fade itself*, ticks
  ~1463-1494 — moot for this trace's own score since the opponent's row
  simply isn't drawn during the handoff and that already matches every
  tick ≥~1495, but the fade animation itself is still unrendered) were
  not reached.
- **Named remaining gap (60/256 frames, ticks 1462-1521), confirmed not
  guessed:** bg-diffing the still-unmatched ticks shows near-full-screen
  differences (up to ~20000/38400px at ticks 1496-1503) in a
  horizontally-striped pattern consistent with `BeginNormalPaletteFade`'s
  BG-palette-to-white dither (§7.5's own source citation) being genuinely
  unimplemented, not a rounding error — the ball sprite, open-particle
  burst, and materialize tint/white-flash transient frames (§7.4.2/§7.5)
  remain unrendered, exactly the brief's own lowest-priority item 4. Ticks
  1519-1521 have small (12-29px) residual diffs even with Grovyle/
  healthbox both correct there — consistent with a lingering particle
  sprite in front of Grovyle's silhouette, same root cause.
- **Notes:** PAPERCUT: none new. Reused #71's `tools/compare/localcheck.ts`
  for fast local iteration throughout (cached `sendout-baseline`
  regenerated fresh at session start via `npm run compare`); a scratch
  `tools/compare/scratch-dump.ts` (app-frame-to-PNG dumper, same role as
  `localcheck.ts`) was used for visual diffing during development and
  deleted before committing (not needed by the extractor, which calls
  `renderAppTrace` directly).

---

---

## 72 — S7 move-anim groundwork banked (parallel worktree lane, merged): ROCK_SLIDE assets + both turn-1 moves' script decode + oracle phase timelines — `docs/battle-move-anim-notes.md`

- **State:** merge of `worker/wt-20260718-154328` (base `1f63f82`, merged
  onto #71's `42d2258`): `npm test` **449/449** (442+7), `npm run build`
  green.
- **Did (worktree lane, supervisor-verified in the worktree pre-merge):**
  (1) `extract-battle-move-anim-assets.ts` (twice-run byte-identical) →
  `battle-anim-rocks.json` (rocks.png tiles/palette, the 3 frames
  `gFallingRockSpriteTemplate` uses labeled); DOUBLE_TEAM needs ZERO new
  art (clones are struct-copies of Grovyle's extracted front sprite via
  `CloneBattlerSpriteWithBlend` — changes that move's "asset" shape
  entirely). (2) `battle-move-anim-scripts.json` — decoded step lists
  for both moves (20 rock spawns; DOUBLE_TEAM's 9-cue sound schedule);
  `battle-move-anim-tables.json` — per-tick formulas (rock ellipse arc,
  shake tasks, generic hit-flash shared by every damaging move). +7 pins.
  (3) Oracle register watch + phase boundaries for both windows in new
  `docs/battle-move-anim-notes.md` (did not touch battle-anim-assets.md).
- **Open (dossier §5, honestly flagged not chased):** DOUBLE_TEAM's
  66-tick BLDALPHA envelope isn't produced by the script's own single
  `setalpha` (mechanism unidentified — the oracle envelope is the
  trustworthy number); ROCK_SLIDE's unconditional `gBattle_BG3_Y` shake
  never showed in RAM; falling-rocks visible window shorter than naive
  spawn cadence predicts.
- **Notes:** worktree removed, branch deleted after merge. No PAPERCUT.

---

---


---

## 71 — S6 send-out slice STARTED: idle-hold + A-press #3 + "sent out GROVYLE!" text cadence byte-exact — NEW `sendout.json` **162/256**; visual handoff (trainer exit/ball/particles/materialize/healthbox) not yet implemented, precisely scoped for the next session

- **State:** `npm test` **442/442** (438→442, +4 pins), `npm run build`
  green. NEW committed trace `tools/compare/traces/sendout.json` (dense,
  every tick 1300-1555, 256 captures, mirrors
  `traces-groundtruth/battle1-sendout-dense.json`'s own segments/captures
  exactly) → **162/256** via `npm run compare -- tools/compare/traces/
  sendout.json`. Full 19-trace sweep re-run (all 18 prior + this new one),
  every prior trace at its exact prior count (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  summary-info-onix 122/122, summary-info-magby 132/132, confirm-decline
  67/67, accept-prebattle 137/137, walk-warpout 125/125, room-entry
  110/110, room-npcs 98/98, room-msgbox 142/142, transition 206/206,
  scene-assembly 256/256, rent-slot1 125/139, rent-3picks 157/190,
  confirm-flow 79/95) — zero regressions, confirmed not just argued (the
  change surface is one new field on `BattleSceneState` and one new branch
  in `core.ts`'s existing `if (battleScene)` block, inert for every trace
  that never presses A after entering this phase - but re-run rather than
  trusted).
- **Did:** Implemented `docs/battle-scene-notes.md` §7.1-7.3 exactly
  against the dossier's own cited evidence, independently re-verified this
  session (not just trusted) by re-extracting sha256 transitions directly
  from the committed groundtruth trace's own oracle captures
  (`tools/compare/out/sendout-baseline/oracle-*.png`, fetched once via a
  baseline `npm run compare` run, then diffed locally/offline with a
  scratch python script - no repeat network calls needed): idle 9-tick
  cursor-bob cadence continues unbroken through tick 1418 exactly as the
  dossier states; screen frozen through tick 1424 (5-tick registration lag
  off the A-press at 1420, matching press #2's own lag); message-box clear
  + char-0 of "BUG CATCHER DESTIN sent" at 1425; the 4 predicted space-hold
  ticks (1428/1436/1443/1451) all land exactly; last text change at 1459;
  static through 1461; first post-text-handoff pixel change at 1462 - every
  cited tick matched with no adjustment needed. Engine changes: extended
  `BattleSceneState` with `sendOutPressElapsed: number | null` (the elapsed
  value of A-press #3 once registered, folded into the existing flat
  `elapsed`-only state per this module's "no phase enum" convention rather
  than adding one just for this - see the field's own doc comment for why);
  `core.ts` captures it directly (same "created directly, same tick already
  reflects it" idiom every other press-gated window in this codebase uses)
  gated on `sendOutPressEligible` (the idle wait-cursor must actually be
  showing); `renderBattleScene` now branches on press-tick-derived
  `sendOutTextStartTick`/`sendOutHandoffTick` to render the idle hold, then
  the new "sent out GROVYLE!" text (`sendOutTextVisibleChars`,
  `drawMessageTextLines` - generalized the existing single-string
  `drawMessageText` to take arbitrary line pairs), then hands off to
  `drawSendOutHandoff` for the visual window. Added a scratch (but
  committed, reusable) dev aid `tools/compare/localcheck.ts` - diffs the
  app engine locally against already-fetched oracle PNGs with no network
  round-trip, the same role as `ram-probe.py` but for pixel-level oracle
  ground truth instead of RAM.
- **Also started (not yet pixel-exact):** `drawSendOutHandoff` renders the
  §7.4.1 trainer-pic exit slide structurally (linear translation over the
  source-exact 35-tick duration, `TRAINER_EXIT_DELTA`/`TRAINER_EXIT_DURATION`,
  this module's established one-tick render lag) - a quick bg-diff pixel
  probe of the trainer's own right edge in the cached oracle frames showed
  roughly the expected ~3px/tick growth from tick 1463 on (matching the
  dossier's own cited lag), but with enough noise from the ball/particle
  pixels already appearing in the same crop region that the exact per-tick
  fixed-point rounding was NOT confirmed to pixel-exactness - flagged
  honestly rather than guessed-and-shipped. The ball spawn/open-frame anim
  (§7.4.2), particle burst (§7.5), materialize palette-fade/affine-scale-in
  (§7.5), party-status-summary despawn fade (§7.4.3), and opponent
  healthbox slide-in + content assembly (§7.6) are NOT rendered at all yet -
  all fully documented in the dossier and their assets already extracted
  (`battle-anim-ball-open.json`, `battle-anim-particles.json`,
  `battle-anim-tables.json`, `battle-healthbox.json`,
  `battle-opponent-front-sprites.json`), just not yet composed into this
  module. One concrete open question surfaced this session for whoever
  picks this up: the healthbox's *internal* content (name/level/HP-bar
  tile arrangement) was flagged by its own extractor
  (`extract-battle-healthbox.ts`'s header comment) as not fully solved even
  for a single static frame ("the real sprite is assembled from a HP/EXP-
  fill-level-dependent subset of each sheet's tiles in a different
  on-screen arrangement than the sheet's own raster order... a rendering-
  code concern for a later engine slice") - that later slice is this one,
  and it's real, non-trivial remaining work, not just wiring.
- **Next:** close the visual handoff (§7.4-7.6) to reach 256/256 - in
  priority order: (1) opponent healthbox internal tile-assembly + slide-in
  (§7.6, source-exact linear 23-tick slide once the content-assembly
  question above is resolved) - this is the highest-value target since the
  window settles to a STATIC composite from ~tick 1522 through the trace's
  end (1555, 34 frames) once every animation finishes, so solving healthbox
  content + Grovyle's final materialized position alone (without needing
  the transient particle/fade animations pixel-exact) would recover those
  34 frames outright; (2) trainer-pic exit slide's exact rounding (RAM-probe
  `gSprites[gBattlerSpriteIds[1]].x/x2` directly across ticks 1461-1497
  rather than the noisy bg-diff this session used); (3) party-summary
  despawn fade (§7.4.3, alpha blend + per-icon staggered exit); (4) ball
  spawn/open/particle-burst/materialize (§7.4.2/§7.5) - the hardest piece
  (radial trig motion + BlendPalette ramp), lowest priority since it's
  transient (never produces a standalone matching frame on its own - every
  frame in that sub-window also needs the trainer slide + party-summary
  fade + healthbox slide all correct simultaneously to score as a match).
- **Notes:** PAPERCUT: none new - `tools/compare/localcheck.ts` (committed)
  turned what would have been a slow per-iteration network round-trip into
  an instant local diff against one cached oracle fetch, worth keeping for
  whoever continues this slice. Scratch python analysis (sha-transition
  extraction, bg-diff edge probes) was ad hoc and not committed (same
  convention as prior sessions' `ram-probe.py` scratch use) - re-derivable
  from `tools/compare/out/sendout-baseline` if regenerated via `npm run
  compare -- tools/compare/traces/sendout.json tools/compare/out/
  sendout-baseline` (gitignored, not itself committed).

---

## 70 — S6 scene-assembly slice FULLY CLOSED: last residual (trace tick 1229, player status bar) resolved with a RAM+pixel-confirmed asymmetric fix — `scene-assembly.json` **256/256** (was 255/256), 0 regressions

- **State:** `npm test` **438/438** (437→438, +1 pin replacing 1 corrected),
  `npm run build` green. `npm run compare -- tools/compare/traces/
  scene-assembly.json` → **256/256** (was 255/256) — the whole
  scene-assembly slice is now byte-exact end to end. Full 18-trace sweep
  re-run, all others at their exact prior counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  summary-info-onix 122/122, summary-info-magby 132/132, confirm-decline
  67/67, accept-prebattle 137/137, walk-warpout 125/125, room-entry
  110/110, room-npcs 98/98, room-msgbox 142/142, transition 206/206,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions.
- **Did — the brief's mandated RAM probe, then the fix:** RAM-probed
  `gSprites[5]` (player bar) and `gSprites[6]` (opponent bar — identified
  by matching each side's known settled corner against
  `docs/battle-interface-assets.md`, same method #64 banked) tick-by-tick
  across 1226-1239 (`tools/probe/ram-probe.py`, full `Sprite` struct:
  callback, `data[]`, oam fields, subpriority, flags). Found the real
  structural asymmetry the brief asked for: the player bar's `x2` STALLS
  for one extra tick right after creation — `x2=95` at BOTH RAM tick 1228
  (its own creation tick) and 1229, only resuming
  `SpriteCB_StatusSummaryBar_Enter`'s ordinary per-tick `x2 += data[0]`
  decrement at RAM tick 1230 — while the opponent bar's `x2` decrements
  every single tick starting immediately at its own creation (`-95` at
  1231, `-90` at 1232, no stall). Every other RAM field checked (callback
  pointer, `subspriteTables` pointer, subpriority, `inUse`/`invisible`
  flags, `data[1..7]`) was byte-identical in kind between the two sides —
  the stall is specifically in `x2`'s per-tick progression, not a
  visibility-flag or ordering difference. Independently pixel-ground-
  truthed the oracle's own captures (re-ran `bin/oracle run` on
  `battle1-scene-dense.json`, diffed consecutive frames in each side's
  screen region) to re-verify both first-visible ticks from scratch rather
  than trust the brief's numbers: player region is byte-identical
  background through trace tick 1229 and first changes at 1230 (22px,
  matching — hand-computed from the actual tileset asset — the bar's
  leading-tile opaque wedge at exactly `x2=95`); opponent region is
  unchanged through 1231 and first changes at 1232 (22px, same shape).
  Both match the brief's cited ticks exactly. Fix: added
  `PLAYER_BAR_VISIBLE_TICK = PLAYER_CREATE_TICK + 1`, gating ONLY the
  player bar's `visible` field in `ballStatusBarPositions` — the table
  lookup itself (and the opponent bar, and both sides' ball icons) is
  untouched, since the RAM-baked `PLAYER_BAR_X2` table already encodes the
  same stall verbatim as a literal repeated value (`[95, 95, 90, ...]`)
  and the icons' own per-icon flat-delay prefix already keeps them fully
  off-screen through this exact tick regardless (so any analogous stall
  there, if present, produces no visible pixel and needs no correction).
  This is the per-side structural fix the brief required, not a blanket
  offset — confirmed it doesn't disturb the opponent's own first-visible
  tick (1232, re-verified above) or any of the other 255 already-matching
  frames (full sweep, 0 regressions). Updated the one existing Tier-1 test
  that pinned the old (buggy) tick-1229-visible behavior, plus added a new
  pin for the corrected asymmetric gate; `battleScene.ts` module doc point
  3 and its top-of-file STATUS note rewritten with the full derivation.
- **Next:** the scene-assembly slice (S6) is fully closed — no further
  action needed there. Remaining S6/roadmap work: the send-out engine
  slice (ticks 1300-1560, `battle-scene-notes.md` §7) and player send-out
  + menu (1560-1810, `battle-menu-notes.md`) — groundwork complete, assets
  ready, per #65's plan. S7 (battle-turn engine) stays behind S6, dossier
  ready per #67/#69.
- **Notes:** PAPERCUT: none new. RAM-probe scratch output went to
  `/tmp/probe-identify*`, `/tmp/probe-deep*`, `/tmp/gt-recap/` (not
  committed, no stale-cache risk).

---

## 69 — S7 data needs closed (parallel worktree lane, merged): battle-message TEMPLATE system extracted + pixel-cross-checked, DOUBLE_TEAM evasion stage RAM-pinned, held-item damage-path inventory exhaustive

- **State:** merge of `worker/wt-20260718-151756` (base `d1072d3`, merged
  onto #68's `a515081`): `npm test` **437/437** (429+8), `npm run build`
  green, anchor 1/1 post-merge.
- **Did (worktree lane, supervisor-verified in the worktree pre-merge):**
  (1) `extract-battle-messages.ts` → `battle-message-templates.json`
  (365/369 `gBattleStringsTable` entries as structured segments +
  `STRINGID_USEDMOVE` + 52 `B_TXT_*` placeholders + stat-name/
  MULTISTRING sub-tables) and `extract-species-names.ts` →
  `species-names.json` (412) — a real pre-existing gap. Pixel-cross-
  checked against `battle1-turn1.json` captures at ticks 1960/2270
  (supervisor re-inspected both PNGs): "Foe GROVYLE used / DOUBLE TEAM!"
  and "ONIX used / ROCK SLIDE!" — including the "Foe " prefix the
  dossier's prose had dropped (corrected in place). +5 template tests.
  (2) `gBattleMons[1].statStages[EVASION]` flips 6→7 at tick 1959, holds
  to trace end, nothing else moves (probe spec committed, twice-run
  byte-identical) — closes dossier §8 risk 5. (3) BRIGHT_POWDER/
  LAX_INCENSE (`HOLD_EFFECT_EVASION_UP`, params 10/5) and WHITE_HERB
  (`RESTORE_STATS`) each have exactly ONE engine call site, neither in
  `CalculateBaseDamage` — EVASION_UP is accuracy-only (live for
  ROCK_SLIDE's roll vs Grovyle), line-cited in the dossier; full 70-item
  `item-hold-effects.json` extracted + pinned (+3 tests).
- **Next:** S7 stays behind S6. Remaining dossier needs: move-animation
  assets (§7 item 5), turn-end RNG cluster attribution,
  `gBattleControllerExecFlags` decoding.
- **Notes:** worktree removed, branch deleted after merge. No PAPERCUT.

---
---

## 68 — S6 scene-assembly GAP A FULLY RESOLVED: blend precision runs in 8-bit space not 5-bit (mathematically proven, not curve-fit), plus evaEvb's own one-tick render lag — `scene-assembly.json` 255/256 (was 151/256), whole 1075-1226 window byte-exact, 0 regressions

- **State:** `npm test` **429/429** (428→429, +1 pin, 2 corrected), `npm
  run build` green. `npm run compare -- tools/compare/traces/
  scene-assembly.json` → **255/256** (was 151/256). Full 18-trace sweep
  re-run, all others at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, accept-prebattle 137/137, walk-warpout 125/125,
  room-entry 110/110, room-npcs 98/98, room-msgbox 142/142, transition
  206/206, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) —
  zero regressions. Bonus: groundtruth trace `battle1-intro.json` also
  improved 141→167/254 (same fix, different trace, not required).
- **Did — the brief's mandated VRAM probe, then the real fix:** ran
  `tools/probe/ram-probe.py` on BG1CNT (`0x0400000A`), BLDCNT/BLDALPHA
  (`0x04000050`/`0x04000052`), the literal tilemap entry at
  `BG_SCREEN_ADDR(28)` for GAP A's named pixel (tick 1150, x=120/y=84,
  tileRow 10/tileCol 28), that tile's char (`BG_CHAR_ADDR(1)`) and
  palette-RAM bytes — every axis the brief flagged unverified came back
  **clean**: BG1CNT decodes to `screenSize=2` (256px-wide) exactly as
  `gBattleBgTemplates[1]` and this module already assumed (no bug); the
  tile entry (`tileId=8/hFlip=0/vFlip=0`) and its char data match the
  extracted JSON exactly; the entry's raw palette nibble is hardware
  bank 4 (JSON stores it locally as bank 2) but both read the identical
  RGB(222,231,247) — `extract-battle-bg.ts` renumbers only the banks a
  tileset references, a labeling convention, not a data bug. So the
  residual wasn't geometry/extraction. Root cause, found by hand-solving
  the blend equation: oracle's own pixel value there, (242,246,252), is
  **mathematically unreachable** by blending any two GBA palette colors
  in 5-bit space under any `eva`/`evb` — `(c5<<3)|(c5>>2)` only ever
  yields one of 32 fixed values per channel, and none of the three
  oracle values are among them (this holds regardless of which tile is
  blended, since every palette color is itself one of those 32 values —
  a freestanding proof, not a brute-force sample). The same operands run
  through `floor((tgt1_8bit*eva+tgt2_8bit*evb)/16)` **directly on the
  8-bit-expanded colors** (no 5-bit requantize) hit the oracle's value
  exactly on all three channels — apparently mGBA's own blend
  implementation runs in its native 8bpp domain rather than re-deriving
  5-bit hardware precision, and the oracle (not idealized hardware) is
  ground truth. `blendChannel` is local to `battleScene.ts` (only
  caller: `drawSlideScene`), so this only affects this window —
  `paletteFade.ts`'s own blend, used elsewhere, is untouched and still
  5-bit (already oracle-validated there). Fixing the domain took
  151→247/256, leaving exactly 8 mismatches at trace ticks
  1139/1145/1151/.../1181 — precisely the 6-tick BLDALPHA step
  boundaries. `evaEvb` was the one register in this task's model still
  missing the one-tick render lag every other register here already has
  (`bg1X`, the window edges, the scanline shift) — adding `et = t - 1`
  fixed all 8, landing on 255/256. The one remaining mismatch (tick
  1229) is GAP B's own separate, pre-existing, narrower residual (module
  doc point 3, untouched — out of GAP A's scope). Added 1 new Tier-1 pin
  at the exact previously-impossible pixel and corrected 2 stale evaEvb
  schedule pins to their render-lagged boundary ticks.
- **Next:** GAP A is closed — no further action needed on the streak
  window. Remaining scene-assembly work is GAP B's own point-3 residual
  (tick 1229, player bar 22px off — next probe on record: what
  structurally differs between the player widget's creation tick 1228
  and the opponent's 1231, both via `CreatePartyStatusSummarySprites`).
  Not attempted this session (optional stretch, time went to fully
  closing GAP A instead) — carries forward unchanged. After that:
  send-out engine slice
  1300-1560 (`battle-scene-notes.md` §7) and player send-out + menu
  1560-1810 (`battle-menu-notes.md`) — groundwork complete, assets
  ready, per #65's plan.
- **Notes:** PAPERCUT: none new. `bin/oracle run`/`ram-probe.py` scratch
  output went to `/tmp/probe-gapA-*` (not committed, no stale-cache
  risk). Both `docs/battle-scene-notes.md` and `battleScene.ts`'s module
  doc point 2 updated with the full derivation.

---

## 67 — S7 groundwork banked (parallel worktree lane, merged): committed dense turn-1 trace + RAM dump + damage/type data extraction + `docs/battle-turn-notes.md` dossier — S7 engine slices now have fixed targets

- **State:** merge of `worker/wt-20260718-143156` (base `3ac0303`, merged
  onto #66's `19f12bb`): `npm test` **428/428**, `npm run build` green,
  post-merge spot-checks anchor 1/1 + summary-info-onix 122/122 (the
  regenerated `moves.json` with its new fields disturbs nothing).
- **Did (worktree lane, supervisor-verified in the worktree pre-merge):**
  (1) `tools/compare/traces-groundtruth/battle1-turn1.json` — 2620 frames,
  223 dense captures, extends `battle1-intro.json`'s exact button script
  with FIGHT→ROCK_SLIDE; twice-run 0 sha mismatches, and the supervisor's
  own independent replay reconfirmed the dossier's cited shas
  (`d223d98a2da9`@1884, `64857bf16c67`@2323, `70f4821905ff`@2345).
  (2) `src/data/gen/battle1-turn1-ram-dump.json` — 741 per-tick rows
  (gRngValue/HP/bar internals/turn order/damage) + two committed probe
  scripts, re-run and byte-diffed 0 vs the committed dump. (3) Data:
  `extract-moves.ts` now pulls effect/secondaryChance/target/priority/
  flags; new `extract-battle-formula-data.ts` → `type-effectiveness.json`
  (111 matchups) + `damage-formula-constants.json`. (4) `docs/
  battle-turn-notes.md` — frame boundaries with shas, 12-step RNG ledger
  (turn total: 0 for the AI's DOUBLE_TEAM + 4 for ROCK_SLIDE + 8-step
  unattributed turn-end cluster), damage math hand-verified to the dumped
  42 (supervisor re-derived it independently: base 30 → STAB 45 → spread
  [38,45]), HP-drain rule reconfirmed (1 HP/tick; hp updates 1 tick after
  the bar's done sentinel).
- **Next:** S7 remains behind S6 — this is groundwork only, no engine
  code. Open items carried in the dossier §7: the 8-9-step turn-end RNG
  cluster is still unmapped to a call site (AI-scoring hypothesis
  reinforced by a second independent stream, not proven);
  `gBattleControllerExecFlags` bit semantics undecoded; move-animation
  assets deliberately NOT extracted (listed as needs).
- **Notes:** worktree removed, branch `worker/wt-20260718-143156` deleted
  after merge. No PAPERCUT flagged.

---

## 66 — S6 scene-assembly GAP A (streak blend arithmetic) root-caused and substantially fixed: two real bugs the RAM/brief hadn't suspected (trainer OBJ layer omitted; BG3's real hardware width is 512px not 256), plus a genuine blend-precision fix — `scene-assembly.json` 151/256 (was 104/256), 0 regressions. One narrower residual named, next probe on record.

- **State:** `npm test` **428/428** (425→428, +3 pins), `npm run build`
  green. `npm run compare -- tools/compare/traces/scene-assembly.json` →
  **151/256** (was 104/256). Full 18-trace sweep re-run, all others at
  their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95) — zero regressions.
- **Did — the brief's mandated RAM probe, then two bugs it didn't predict:**
  ran `tools/probe/ram-probe.py` on the literal `BLDALPHA`/`BLDCNT` I/O
  registers (`0x04000052`/`0x04000050`) and `gBattle_BG1_Y` across ticks
  1130-1155 as instructed. Result: **the brief's own leading hypothesis was
  wrong** — `BLDALPHA` already reads `eva=6,evb=10` at trace tick 1150 with
  or without a one-tick lag correction (the plateau spans RAM ticks
  1146-1151 either way), and `gBattle_BG1_Y=0` was confirmed exactly as
  RAM always suggested. So the "numerically unreachable ~123 vs min-159"
  problem wasn't the blend ramp at all. Root-caused instead by RAM-probing
  `gSprites[gBattlerSpriteIds[0/1]]` (indices 3=player, 4=opponent) per
  tick: **both trainer OBJs are `invisible=0`/`inUse=1` from creation
  (tick 1074) onward**, sliding in via their own OAM `x2` at the exact same
  per-tick magnitude as `gTasks[0].data[2]` (the already-validated BG3
  scanline-shift value), opposite sign per side. #63's "neither trainer OBJ
  is ever visible during the reveal" was a real misdiagnosis — it only
  sampled each trainer's *settled* corner rect, never the sliding position.
  Wired `drawSlideScene` to draw both OBJs raw into the TGT2 buffer
  (in front of BG3, per their OAM priority) before BG1 blends on top;
  exact pixel match confirmed at the brief's own named pixel (tick 1150,
  x=11/y=40 → the opponent trainer's own raw skin-tone color, no blend
  needed there since BG1 is genuinely transparent at that mapY). Separately
  fixed `blendChannel` to run in 5-bit GBA color space with floor division
  (`paletteFade.ts`'s already-established convention for GBA blends, not
  round-in-8-bit) — off by 1 on roughly a third of blended pixels
  previously. **Biggest single contributor**, found while chasing a
  post-OBJ-fix residual (a phantom duplicate of BG3's sky-gradient tiles
  appearing 200+px away from their real position): `gBattleBgTemplates[3]
  .screenSize = 1` (`battle_bg.c:152-160`) means BG3 (`static`)'s real
  hardware width is **512px** (two side-by-side screen blocks), not 256 —
  `extract-battle-bg.ts`'s existing JSON already has block 2's data at
  tile-rows 32-63 (confirmed uniformly blank for every row this screen
  reaches), `staticBgPixel` just never read it, wrapping `mapX` back into
  block 1 at every 256px instead and re-showing its gradient tiles at the
  wrong column. Fixed the period/block-select math; net alone was 149→151
  (small locally, but it's what unblocked seeing the OBJ fix's true effect
  clearly — many frames' diffs shrank by thousands of px even where the
  match count didn't move). Added 3 Tier-1 pins in `tests/battleScene.test.ts`
  (oracle-verified pixel values) for all three fixes.
- **Still open, narrower than today's:** a pixel within `entrySlide` (BG1)'s
  own confirmed content zone (tick 1150, x=120/y=84) doesn't match the
  oracle under ANY combination brute-forced this session — every
  `bg1Shift`×`bg3Shift` pair (65536 combos) at the RAM-true `eva=6,evb=10`,
  and separately every `eva`×`evb` pair (17×17) with `bg1Shift` free, tops
  out at a handful of incidental matches. Ruled out a third sprite (RAM-
  probed all 65 `gSprites[]` slots' `inUse`/`invisible` at tick 1150 - only
  the two already-modeled trainers are active). Full account + the next
  probe (literal VRAM screen-block bytes at BG1's `BG_SCREEN_ADDR(28)`,
  cross-checked against this exact pixel) in `battleScene.ts`'s module doc
  point 2.
- **Next:** the point-2 VRAM probe above is the concrete next step for
  GAP A's remaining residual. GAP B's own narrow tick-1229 residual
  (point 3) is untouched, exactly as #64 left it — out of this step's
  scope.
- **Notes:** PAPERCUT: none new. This step's RAM probe disproved its own
  brief's leading hypothesis (BLDALPHA lag) within minutes — worth noting
  that the "probe first" discipline paid off by quickly ruling out a wrong
  turn rather than sinking time into it; the actual bugs were found by
  extending the same RAM-cross-check method (`gSprites[]`, `screenSize`)
  to structures the brief hadn't named. `bin/oracle run` scratch output
  went to `/tmp/scene-oracle` (not committed, not `tools/compare/out/` -
  no stale-cache risk left behind).


---

## 65 — Supervisor wind-down: session end 2026-07-18 ~14:30; S6 engine parity anchor→tick 1040 byte-exact, scene assembly 104/256 (one named gap), ALL S6 groundwork + RNG criterion banked

- **State (verified this minute):** `npm test` **425/425**, `npm run
  build` green, tree clean at `b4faa7a` + this docs commit. 18 committed
  parity traces: anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206 — all byte-exact — plus
  scene-assembly **104/256** (sole in-progress slice, see #64/#63) and
  the three ISSUES-#5-policy traces (rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95). Engine covers the anchor through tick
  1040 of the 1886-tick battle-1 bring-up byte-exact; 1040-1295 partial.
- **Session summary (supervised, ~09:10-14:30, 20 worker steps, 2 lanes):**
  engine slices landed: walk+warp 400-519 (125/125), room entry 520-624
  (110/110), scientists+opponent 624-717 (98/98), speech msgbox 718-843
  (142/142), CIRCLES_MEET transition 843-1040 (206/206), scene assembly
  1040-1295 through 4 convergent iterations (42→104/256; systemic
  one-tick render lag discovered, #63); RNG criterion satisfied
  (`opponentGen.ts` bit-exact vs RAM dump, #61); ISSUES #15 root-caused
  + fixed (to5Bit palette-convention bug, #48). Parallel lane banked ALL
  remaining S6 groundwork: transition id RAM-confirmed (CIRCLES_MEET,
  #47), no-heal-icon correction + 843-1031 pinned (#53), scene-assembly
  mechanism (#55), send-out window (#59), menu window (#59), and every
  flagged asset extracted byte-exact (battle room #49, interface widgets
  #57, sendout anim assets #59). Suite 341→425 Tier-1 tests; traces
  13→19 (+4 dense groundtruth). Zero regressions at every one of 20
  verified steps; every worker ended at a green commit.
- **Next:** (1) scene-assembly GAP A residual — the streak window's
  blend arithmetic; exact next RAM probe in #63/`battleScene.ts` module
  doc; **user decision on record: keep iterating, no re-scope** (also in
  ROADMAP S6). (2) Then send-out engine slice 1300-1560
  (`battle-scene-notes.md` §7) and player send-out + menu 1560-1810
  (`battle-menu-notes.md`) — groundwork complete, assets ready. (3) The
  22px tick-1229 widget residual (#64) rides along with GAP A.
- **Notes:** PAPERCUTS.md gained the stale `tools/compare/out/` PNG
  entry (GAP-B worker's flag). No usage-limit events. Escalation
  mid-session (2 consecutive scene-assembly misses) was answered by the
  user in-terminal: keep iterating. One supervisor error caught+fixed:
  a double-rotated archive entry (#55, dedup commit `029c01f`).

---

## 64 — S6 scene-assembly GAP B (widget entrance) resolved: same one-tick render lag GAP A found (#63) applies to the widget sprites too, plus the opponent icon x2 tables were missing their per-icon flat-delay prefix since #60/#62 — `scene-assembly.json` 104/256 (was 41/256), 0 regressions. GAP A (streak blend-arithmetic) untouched, as scoped.

- **State:** `npm test` **425/425**, `npm run build` green. `npm run
  compare -- tools/compare/traces/scene-assembly.json` → **104/256** (was
  41/256 — net +63, close to the brief's ~105 estimate). Full 18-trace
  sweep re-run, all others at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, accept-prebattle 137/137, walk-warpout 125/125,
  room-entry 110/110, room-npcs 98/98, room-msgbox 142/142, transition
  206/206, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) —
  zero regressions.
- **Did — GAP B (widget invisibility), per the brief's method:**
  RAM-probed `gSprites[].{invisible, x2, oam.attr0/1/2}` directly per tick
  for all 14 widget sprites (2 diagonal bars + 12 ball icons; identified
  by matching settled `(x,y)` against known corners, same method #60/#62
  banked) across ticks 1225-1295. Two independent findings, both real bugs
  fixed (not the brief's "tile-index swap" theory, which #62 had already
  ruled out): **(1)** `invisible` and `oam.attr2` (tileNum) never change
  after creation for any of the 14 sprites — there is no separate
  visibility trigger, confirming #62's suspicion the wrong shape was being
  chased. **(2)** pixel-ground-truthing the oracle's own captures directly
  (cross-referencing the RAM-baked `x2` tables against actual pixel
  content, not trusting the table at face value) shows the SAME systemic
  one-tick render lag #63 found for GAP A also governs these sprites: the
  player bar's oracle edge at trace tick 1230 matches the table's
  tick-1229 value, not 1230's own. Wired `ballIcons`/`ballStatusBarPositions`
  to render at `t-1` uniformly (both the table lookup and the visibility
  gate together — #62's own attempt shifted only the table index and left
  the create-tick comparison alone, which desyncs the two and is exactly
  why it "fixed some frames, broke others"). Separately, RAM-probing full
  per-icon `x2` histories (not just the sliding portion) revealed the
  OPP_ICON_X2 tables baked by #60/#62 had been built ONLY from each icon's
  sliding tail, omitting the per-icon flat-delay prefix
  (`SpriteCB_StatusSummaryBalls_Enter`'s `data[1]` countdown before the
  slide starts) — every opponent icon was sliding in 10-54 ticks too early
  regardless of the lag fix. Rebuilt all 14 tables directly from RAM
  ground truth (full prefix included) rather than reconstructing from the
  source formula, per this run's established convention.
- **Still open, narrow:** trace tick 1229 (player bar only) is 22px off —
  the oracle is still plain background there, one tick after our model's
  first drawn frame. A further one-tick-later `visible` gate fixes 1229
  but then breaks the opponent side's own first-visible tick (1232) the
  identical way (pixel-verified both directions) — the two sides do not
  share one extra-tick correction, so this wasn't force-fitted. Full
  account + the concrete next probe (what structurally differs between the
  player and opponent widgets' first visible tick) in `battleScene.ts`'s
  module doc point 3.
- **Next:** GAP A (streak window blend-arithmetic, ticks 1075-1226) is
  untouched this session, exactly as #63 left it — its own next probe
  (literal `BLDALPHA` register vs `gScanlineEffectRegBuffers`, ticks
  1140-1180) is still the right next step there. For GAP B's own residual,
  RAM-probe what's structurally different between the player (tick 1228
  creation, needs the extra tick) and opponent (tick 1231 creation,
  doesn't) widget setup before guessing another blanket offset.
- **Notes:** PAPERCUT: none new. `tools/compare/out/<trace>/` can go stale
  between sessions (its `app-*.png` reflected code from before this
  session's own edits) — always re-run `npm run compare` fresh before
  reasoning from cached PNGs there, don't trust the last run's output as
  current.

---

## 63 — S6 scene-assembly GAP A (streak window): found and fixed a systemic one-tick render lag that was the real blocker behind #60/#62's "sign ambiguity" — geometry + layer model now pixel/RAM-exact, one narrower blend-arithmetic gap remains; `scene-assembly.json` 41/256 (was 40/256), 0 regressions. GAP B (widget invisibility) not started — out of time this session.

- **State:** `npm test` **425/425**, `npm run build` green.
  `npm run compare -- tools/compare/traces/scene-assembly.json` → **41/256**
  (was 40/256 — frame 1227 now exact, plus the near-black frame 1075 is down
  to a handful of anti-aliased-adjacent px; every frame 1075-1226 has a
  *much smaller* diff than #62's baseline even though the raw match count
  barely moved, since GAP A is a color-precision issue across the whole
  window, not a boundary bug — see below). All 17 other traces re-verified
  at their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95) — zero regressions.
- **Did — found the real bug behind two sessions' "sign ambiguity":** per
  the brief's method (RAM-probe the actual DMA'd buffer, not just `data[2]`),
  ran `tools/probe/ram-probe.py` on `gBattle_BG1_X`/`gScanlineEffectRegBuffers`/
  `gScanlineEffect.{srcBuffer,state}` across the whole window, AND
  cross-checked every derived constant against the oracle's own captured
  frames directly (scanning each capture for the first/last non-black row —
  unambiguous ground truth, no tileset aliasing possible, unlike raw pixel-
  color fitting). Both together reveal: **every register this task drives
  shows up in the CAPTURED FRAME one tick later than its own RAM tick**
  (task writes registers this tick; HBlank DMA/VBlank copy shows them to
  the display next tick) — not a sign flip, a lag, and it explains #62's
  "shift=-240 matched one point but a whole scanline didn't": the search
  was comparing tick `t`'s RAM values against tick `t`'s pixels instead of
  tick `t-1`'s. Applying the same one-tick correction to `windowRange`,
  `scanlineShiftMagnitude`, and `bg1X` made the window/shift geometry
  pixel-exact (verified: frame 1075 is now exactly 1px, row 80 only, vs.
  oracle; row 79/120/150 content matches byte-for-byte at tick 1150).
  Source (not RAM) then settled two other true opens: (1) **which register
  the per-scanline DMA targets** — `sIntroScanlineParams16Bit = {&REG_
  BG3HOFS, ...}` (`battle_main.c:250-253`) is a compile-time literal, no
  runtime ambiguity — BG3 (`static`) is shifted per-scanline, BG1
  (`entrySlide`) scrolls uniformly via the ordinary whole-frame
  `gBattle_BG1_X` VBlank write. (2) **OBJ/BG1 priority** — both trainer
  sprites are OAM priority 2 (`gOamData_BattleSprite{Player,Opponent}Side`,
  `battle_main.c:274-301`), strictly behind BG1's priority 0 (frontmost);
  but pixel-sampling both trainer sprites' settled-corner rects at every
  tick 1075-1220 shows **neither is ever actually visible during the
  reveal** — both show plain background throughout, only becoming the real
  pics at the tick-1227 settle. So TGT2 in `BLDCNT`'s `TGT1_BG1|BLEND|
  TGT2_BG3|TGT2_OBJ` is BG3 alone in practice; wired `drawSlideScene` to
  blend BG1 (opaque) over BG3 (raw), and BG3 raw wherever BG1 is
  transparent — the "raw-unless-BG1-opaque" rule #62 confirmed but never
  wired. Updated `tests/battleScene.test.ts`'s window/shift expectations to
  the corrected (pixel-ground-truthed) tick pivots.
- **Still open (honest, narrower than #62's, RAM-informed not guessed):**
  one pixel confirmed to need BG1 content (tick 1150, x=11/y=40 — oracle
  shows a warm/skin-tone streak color, this model still shows plain white
  BG3) is numerically **unreachable** under the modeled `BLDALPHA` ramp: with
  `evaEvb(1150)` = {eva:6, evb:10} and a white (255) BG3 backdrop, the
  minimum any blend can produce is `255*10/16≈159`, already above the
  observed ~123. Either the `evaEvb` ramp's tick-1139 anchor needs the same
  one-tick correction just proven necessary elsewhere (untested this
  session), or something about `entrySlide`'s map coordinates at this exact
  pixel is still wrong (its only non-blank tiles sit at tile-rows 8-13 /
  mapY 64-111, nowhere near mapY=40 under the current `bg1X` - unexplained).
  Full detail + the exact next RAM probe to run (literal `BLDALPHA`
  register, not the derived schedule) in `battleScene.ts`'s module doc
  point 2 and `docs/battle-scene-notes.md` §2's new correction block.
- **Next:** GAP A — RAM-probe the literal `BLDALPHA` register (io reg
  `0x04000052`) alongside `gScanlineEffectRegBuffers` for ticks ~1140-1180,
  cross-checked against the tick-1150/(11,40) pixel this entry names, before
  touching `evaEvb`'s constants again (the one-tick-lag pattern found this
  session is the leading hypothesis, not yet verified for this register).
  GAP B (widget invisibility, ticks ~1228-1291) is untouched — still
  exactly as #62 narrowed it (positions RAM-exact; icons stay invisible
  past their settle tick until an unidentified trigger, `oam.tileNum` not
  touched by `SpriteCB_StatusSummaryBalls_Enter`). Given this session's
  finding, the SAME one-tick-render-lag hypothesis is worth checking there
  too before any new RAM probe of `gSprites[].invisible`.
- **Notes:** PAPERCUT: none new. This session's method — cross-referencing
  RAM values against the oracle's own captured-frame content directly
  (not just trusting a symbol's RAM-read value at face value) — is what
  broke the two-session stall; worth reusing whenever a RAM-confirmed
  value still doesn't reproduce pixels.

---

## 62 — S6 scene-assembly: fixed the extractor "palette bank 4 missing" misdiagnosis from #60; the color-compositing rule it was blocking on is now also correctly understood but not yet wired — `scene-assembly.json` still 40/256 (unchanged), but both open gaps are narrower and more precisely named

- **State:** `npm test` **425/425** (423→425, +2 in `battleBg.test.ts`),
  `npm run build` green. `npm run compare -- tools/compare/traces/scene-
  assembly.json` → still **40/256** (rendering logic unchanged this
  session — see below for why). `transition.json` re-verified **206/206**
  (battle-bg.json is its dependency too, per the brief's caution). All 17
  other traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, accept-prebattle 137/137, walk-warpout 125/125,
  room-entry 110/110, room-npcs 98/98, room-msgbox 142/142, rent-slot1
  125/139, rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did — gap 1 (BG1 streak content), extraction fixed and RAM-confirmed:**
  #60's "entrySlide references palette bank 4, which the extractor never
  captured" was a misdiagnosis, not a real gap. RAM-probed
  `gPlttBufferFaded` at hardware palette bank 4 directly (ticks 1073-1886):
  its 16 live colors are bit-exact equal to `battle-bg.json`'s existing
  local subpalette 2. Source explains why: `DrawMainBattleBackground` loads
  the Frontier palette at `BG_PLTT_ID(2)` for 3 subpalettes (hardware slots
  2/3/4) before the intro slide runs, and `DrawBattleEntryBackground`'s
  `BATTLE_TYPE_FRONTIER` branch never reloads palette RAM — so
  `entrySlide`'s raw nibble 4 is hardware-absolute, same `+2` base as the
  static tilemap, and normalizing it the same way (now done in
  `extract-battle-bg.ts`) lands on the already-captured local index 2. No
  new palette data was ever needed. `entrySlide` now has usable content.
  **But** wiring it into `battleScene.ts` surfaced a SECOND, independent
  bug in the existing fallback: GBA alpha blend only engages where the
  actual topmost non-transparent layer at a pixel is TGT1-flagged (BG1
  only, per RAM-confirmed `BLDCNT`); `entrySlide`'s tilemap is a sparse
  diagonal-streak pattern over a mostly-transparent grid, so most pixels
  in the window have BG1 transparent — meaning BG3/OBJ must draw at RAW
  unscaled color there, not the uniform `evb/16`-scaled brightness the
  existing `drawSlideScene` fallback applies everywhere. Confirmed by
  direct oracle pixel inspection (tick 1090, columns clear of both trainer
  sprites: observed colors are exact *unscaled* palette matches, not
  scaled). This alone would have kept the trace non-exact even with gap 1
  "fixed" naively. Did NOT wire the corrected compositing rule in, because
  the BG3/BG1 shift-sign convention needed to know *which* pixels are
  BG1-transparent wasn't nailed down: a single isolated point matched
  `shift=-240` (opposite sign from the existing `shiftTop`/`shiftBottom`)
  exactly, but a whole-scanline brute-force pixel search was inconclusive
  — the static bg tileset reuses ~5-6 sky colors across many tiles, so
  candidate shifts alias to similar match counts and a plain per-pixel-
  count fit can't be trusted. Left `drawSlideScene` unchanged (still the
  confirmed-wrong fallback) rather than commit a half-verified rule.
- **Did — gap 2 (widget entrance), narrowed but not resolved:** the
  brief's "tile-index swap" framing doesn't match what
  `SpriteCB_StatusSummaryBalls_Enter` actually does — read it directly,
  and it never touches `oam.tileNum` (only `x2` and delay counters). Tried
  a blanket 1-tick shift on the `x2` lookup tables (a plausible off-by-one
  given creation-tick vs first-callback-tick semantics): it fixed frames
  1230/1232-1235 but broke 1228/1229/1231, proving the tables aren't
  uniformly off — reverted rather than commit an unverified guess (tree is
  clean, `git status` confirms no leftover diff). Direct pixel diffing
  (frame 1285, opponent ball-icon slot 0 at its RAM-exact settled corner)
  shows our model already drawing that icon's final "Empty" ring tile
  there, while the oracle shows the same 16 ring-outline pixels as pure
  background — i.e. the icon is positionally settled early but stays
  invisible (or on a blank tile) until some later trigger, unrelated to
  the `x2` slide.
- **Next:** gap 1 needs a direct RAM read of the actual DMA'd
  `gScanlineEffectRegBuffers` content (not just `gTasks[0].data[2]`'s
  value, which is already confirmed) to settle the shift-sign question,
  paying attention to the `dmaSrcBuffers[i] = ...+1` indexing trick in
  `scanline_effect.c` (buffer-index-to-scanline mapping may be off by one
  from a naive reading) — then apply the "raw-unless-BG1-opaque" blend
  rule this session confirmed. Gap 2 needs `gSprites[id].{invisible,
  oam.tileNum}` RAM-probed per tick for the 14 widget sprites across
  1228-1292 (sprite-identification method already banked from #60) to find
  what actually gates visibility. Both are additive, narrower asks than
  what #60 left open — see `battleScene.ts`'s module doc and
  `docs/battle-scene-notes.md` §2's new correction block for the full
  account either can be picked up from cold.
- **Notes:** PAPERCUT: none new. Two full sessions in a row have now hit
  the same wall on gap 1 (color) via pixel-fitting alone — the pattern
  holds: RAM ground truth for *values* (BLDCNT, `data[2]`, `gBattle_BG1_X`)
  has been reliable, but inferring the *sign/indexing convention* those
  values are applied with by brute-forcing pixels against a repetitive
  tileset is not. A future session should probe the DMA buffer's literal
  written content, not just the C-level source variable.

---

## 61 — S6 RNG-exactness step (parallel worktree lane, merged): battle-1 opponent personality gen + transition select implemented as pure logic, Tier-1-pinned bit-exact vs the RAM dump

- **State:** merge of `worker/wt-20260718-123140` (single commit
  `365e1ab`, exactly 2 new files: `src/engine/opponentGen.ts`,
  `tests/opponentGen.test.ts`) on top of #60; `npm test` **423/423** +
  `npm run build` green on the merged result.
- **Did (worker, supervisor-verified):** the exact
  `CreateMonWithEVSpreadNatureOTID` rejection loop, `Random32()`
  low/high word order (empirically confirmed vs the RAM dump), the
  12-entry `RANDOM_TRANSITION` frontier pick, and a chained
  battle-1 generator — 9 Tier-1 tests pin all RAM-dumped values
  bit-exact (28/16/95 iterations, all 3 personalities, natures, raw
  transition draw 22624 → index 4 → id 34 CIRCLES_MEET). **New ground
  truth found, not fudged:** the three loops are separated by exactly
  11/7/8 ambient `Random()` draws — matching the dossier's own tick
  gaps 1:1 (one per-VBlank baseline draw per tick between
  loop-completion ticks; the supervisor folded this into
  `docs/battle-bringup-notes.md` §3.1 this commit). Modeled as an
  explicit `ambientGapSteps` parameter, defaulting to the pure source
  algorithm.
- **Next:** see #60 — the one named scene-assembly gap (BG1 `entrySlide`
  content + palette bank 4 extraction) is the current critical-path
  step; a targeted worker is being launched and the two-consecutive-
  misses escalation is going to the user in parallel.
- **Notes:** worktree removed + branch deleted post-merge. S6 roadmap
  acceptance criterion "Tier-1 test pins the generated opponent vs the
  RAM dump" is now satisfied on the personality/transition side
  (trainer id + mon set were already pinned pre-anchor per §0).

---

## 60 — S6 scene-assembly follow-up: RAM-probed the streak window + ball-widget entrance directly; geometry now RAM-exact, streak color still open — `scene-assembly.json` 40/256 (was 42/256; see below for why the raw count didn't move despite real progress), 0 regressions

- **State:** `npm test` **413/413** (407→413, +6 net in `tests/battleScene.test.ts`
  after rewriting its RAM-derived expectations), `npm run build` green.
  `npm run compare -- tools/compare/traces/scene-assembly.json` →
  **40/256** (was 42/256 at #58 — frames 1040-1074 + 1292-1295 match both
  sessions; #58's remaining ~3 matches were scattered mid-slide frames its
  unverified best-fit happened to land on by coincidence, which this
  session's RAM-exact-but-still-not-color-correct model doesn't reproduce).
  The raw match count is **not** the right signal here — every frame's
  diff *magnitude* through the slide now traces to one identified, named
  remaining gap (BG1's content, see below) instead of an unverified fit;
  see below and PROGRESS-archive.md #58 for contrast. All 17 other traces
  re-verified at their exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, rent-slot1
  125/139, rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did (RAM-first, per the brief's method mandate — no blind pixel
  fitting this session):** ran `tools/probe/ram-probe.py` once over ticks
  1073-1296 watching `gBattle_WIN0V`, `gTasks[0].data[0..6]`, the
  `sGpuRegBuffer` BLDCNT/BLDALPHA/BLDY shadows (nm'd `sGpuRegBuffer` @
  `0x03000818`), `gScanlineEffectRegBuffers` (both halves, several rows),
  and all 64 `gSprites[].{x,x2,y,flags}` — one emulation pass, ~2.7s.
  Confirmed/fixed from the raw values: (1) **`gBattle_WIN0V` has a second
  growth phase** `docs/battle-scene-notes.md` §2 missed entirely —
  `BattleIntroSlide3`'s tState-3 body also decrements `WIN0V` (`-0x3FC`,
  4px/tick) through tick 1118, not just the `-0xFF` (1px/tick) loop that
  stops at 1106; `windowRange()` now models both phases exactly (RAM-
  confirmed top/bottom at every tick, not fit to a brightness threshold).
  (2) **`BLDCNT = TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ` (0x1842) confirmed
  literally** — OBJ (both trainer pics) genuinely are blend targets,
  resolving #58's open question there; `shiftTop`/`shiftBottom` now mirror
  `gTasks[0].data[2]` exactly (240 constant through 1106, then -2/tick to
  0 at 1226) instead of the prior session's best-fit line. (3) **the ball-
  icon + diagonal-bar widget entrance is baked as RAM-exact per-tick `x2`
  tables** for all 14 sprites (2 bars + 12 icons, identified by matching
  settled `(x,y)` against `docs/battle-interface-assets.md`'s known
  corners): player-side created at tick 1228, opponent-side at 1231 (NOT
  simultaneous — confirms a suspicion the groundwork dossier flagged but
  didn't chase); each table transcribed verbatim from RAM since the source
  formula (`SpriteCB_StatusSummaryBalls_Enter`) lands 1-2 ticks off on
  several icons for reasons not tracked down (a controller-handshake frame
  this module doesn't model). Also fixed the docs: `battle-interface-
  assets.md`'s down-arrow dest-Y formula (`135 + offset` → `137 - offset`,
  the brief's flagged one-liner) and `battle-scene-notes.md` §2 (added
  correction blocks for the missed WIN0V phase and the buffer-timing
  off-by-one, both citing this session's RAM values).
- **Still open (honest, not improvised around):** the streak's pixel
  *color* is not byte-exact. RAM resolved WHICH layers blend (BG1 as TGT1,
  BG3+OBJ as TGT2) but not BG1's actual *content* — `gBattle_BG1_X += 8`/
  tick proves something real scrolls there (not a solid color), and
  `battle-bg.json`'s `entrySlide` tileset was the leading candidate, but
  every one of its tilemap entries in the sampled region reference
  **palette bank 4, which the extractor never captured** (`battle-bg.
  json`'s `palette` array only has banks 0-2) — so the hypothesis came
  back transparent everywhere and was numerically untestable, not
  falsified. `drawSlideScene` falls back to treating BG1 as contributing
  black (pure `evb/16` brightness scaling of the shifted BG3+OBJ content) —
  geometrically exact (window shape, shift magnitude) but not color-exact;
  `npm run compare` diffs every frame 1075-1226 (700px near tick 1075,
  growing to 5-figures as the window opens, matching the window's own
  pixel count almost 1:1 — i.e. it's a genuinely wrong color model, not a
  boundary/off-by-one). The 1228-1291 widget window is also not fully
  exact yet despite RAM-exact positions (16-300px/frame) — likely a tile-
  index swap (ring↔filled ball shape) this session didn't model, per
  `docs/battle-interface-assets.md`'s own "icon slots are progressively
  absent/ring-shaped before settling" note.
- **Next:** re-extract `battle-bg.json` (or a new targeted extractor) with
  palette bank 4 included, then re-test entrySlide-as-BG1 (the code path
  for this is straightforward, see `battleScene.ts`'s module doc point 2 —
  it's one extraction task, not a re-derivation). Separately, check
  `battle_interface.c`'s `oam.tileNum` manipulation during
  `SpriteCB_StatusSummaryBalls_Enter` for the ring→filled tile swap. Then
  re-run `scene-assembly.json` — both fixes are additive to what's already
  RAM-verified here.
- **Notes:** PAPERCUT: none new — `tools/probe/ram-probe.py` handled a
  282-watch/223-tick combined probe in one ~2.7s pass with zero changes
  needed, exactly the tool it was built to be.

---

## 59 — Three parallel groundwork branches merged (send-out 1300-1560, menu 1560-1810, anim assets): ground truth for battle1-intro's FULL 1886 ticks is now complete

- **State:** merges of `worker/wt-20260718-113043` (M: send-out window
  dossier §7 + `battle1-sendout-dense.json`, 256 captures),
  `worker/wt-20260718-115156` (O: new `docs/battle-menu-notes.md` +
  `battle1-menu-dense.json`, 251 captures), and
  `worker/wt-20260718-121034` (P: `extract-battle-anim-assets.ts` +
  particle-burst/ball-open/materialize-table gen assets +
  `docs/battle-anim-assets.md`) on top of #58. `npm test` **407/407** +
  `npm run build` green on the merged result. All three supervisor-
  verified in their worktrees (traces re-run green: 256 + 251 PNGs;
  diff scopes exactly as contracted).
- **Highlights (workers, supervisor-verified):** M pinned the opponent
  send-out (trainer-exit slide 1463→~1497, ball spawn 1464 with **no
  throw arc** on the opponent side, pink tint = `gBallOpenFadeColors
  [BALL_POKE]` pixel-exact, healthbox 23-tick slide, settle = exactly
  1522) with 2 small asset gaps → P then extracted those byte-exact
  (particles 38/38 px, ball-open 122/122 px; materialize tables
  timing-verified, flagged as such). O pinned the tail window (player
  send-out DOES arc per source, "Go! ONIX!" 1-tick/char, settle
  **1693** not 1696, message-clear = one steady 6-tick blank 1742-1747,
  menu atomic at **1748** not 1750, idle cycle driven by TWO regions —
  ONIX sprite + healthbox boundary — NOT the wait-cursor/ball-icons as
  previously assumed; driver function honestly left open).
- **Next:** follow-up worker on #58's blocker (streak window 1075-1226 +
  widget entrance 1230-1291) via direct RAM ground truth
  (`gScanlineEffectRegBuffers` + BLD register shadows + widget sprite
  coords per tick) instead of pixel fitting — brief going out now. Then
  (next session): send-out engine slice 1300-1560, menu slice 1560-1810,
  RNG-exactness Tier-1 step (nature rolls/transition select vs the
  RAM-dumped table), S6 acceptance trace.
- **Notes:** all three worktrees removed + branches deleted post-merge.

---

## 58 — S6 scene-assembly engine slice: settled scene/text/cursor/ball-widgets byte-exact; BattleIntroSlide3 streak (1075-1226) and ball-widget entrance slide (1230-1291) BLOCKED, not byte-exact — partial deliverable, honestly reported

- **State:** `npm test` **407/407** (390→407, +17 `tests/battleScene.test.ts`),
  `npm run build` green. New `src/engine/battleScene.ts`, wired into
  `core.ts` as a new top-level scene mode (handoff from `battleRoom`'s
  "settled" phase at elapsed 197 = trace tick 1040, matching the brief's
  convention). New trace `tools/compare/traces/scene-assembly.json` (34
  segments truncated to 1295 frames, 256 every-frame captures 1040-1295)
  — `npm run compare` gives **42/256, NOT the required 256/256** (see
  below). All 17 pre-existing traces re-verified at their exact prior
  counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95) — zero regressions.
- **Did:** (1) black hold 1040-1074 exact. (2) the **settled composite**
  (tick 1227 onward) is **byte-exact** (0/38400): `battle-bg.json`'s
  `static` bg at scroll (0,0) + `trainer-pic-bug-catcher.json` at corner
  **(144,8)** + `trainer-pic-brendan-back.json` frame 3 at corner
  **(48,48)** + `battle-window.json`'s bg0 tilemap at scroll (0,0) —
  confirmed twice independently: brute-force pixel search AND a fresh
  source derivation (`battle_controller_opponent.c:1306-1313`/
  `battle_controller_player.c:2317-2318`'s `xPos/yPos` formulas +
  `CalcCenterToCornerVec`'s `(-32,-32)` for a 64x64 OAM shape — both
  agree exactly). (3) text print cadence, the wait-cursor's 4-phase/
  36-tick bob, and the party-ball widgets' **final settled** positions +
  the previously-undrawn `ball_status_bar` diagonal-bar background
  (corner `(-24,40)` h-flipped opponent / `(136,96)` player, both found
  by brute force, 212/212 exact each) are all byte-exact — frames
  1227-1229 and 1292-1295 match with 0 diff. Fixed one wrong formula
  along the way: the down-arrow cursor's dest-Y is `137 - offset`, not
  `135 + offset` as `docs/battle-interface-assets.md` states (numerically
  different, empirically re-derived this session against 4 oracle ticks).
- **BLOCKED (honest, not improvised around):** (a) the `BattleIntroSlide3`
  per-scanline shift + BLDALPHA blend window (**ticks ~1075-1226**) is
  NOT byte-exact. `docs/battle-scene-notes.md` §2's described mechanism
  (WIN0V vertical-window growth, data[2] per-scanline horizontal shift,
  BLDALPHA cross-fade) does not reproduce real pixels when implemented
  as literally described — this session confirmed via direct pixel
  brute-forcing that the vertical window keeps growing past the
  dossier's claimed tick-1106 stop (a 4px/tick second phase through
  ~1119), and that a plausible shift+blend model (fixed-vs-shifted
  `static` bg, standard BLDALPHA formula) converges to the exact settled
  frame by 1227 but is wrong through most of 1075-1180 — `shiftTop`/
  `shiftBottom`/`windowRange`/`evaEvb` in `battleScene.ts` are this
  session's best-effort empirical fit, documented as NOT verified, not
  asserted correct. (b) the party-ball widgets' entrance slide (**ticks
  ~1230-1291**) is not modeled (hidden until settled tick 1292) — the
  groundwork itself already flagged this as unresolved, not a new gap.
- **Next:** RAM-probe (`tools/probe/ram-probe.py`) `gScanlineEffectRegBuffers`/
  `BLDALPHA`/`WIN0V` directly per-tick through 1075-1226 instead of
  continuing to blind-fit pixels; also check whether OBJ (trainer
  sprites) are themselves blend targets (`BLDCNT` lists
  `TGT2_BG3|TGT2_OBJ`) rather than drawn full-bright as this session's
  model does. Then derive the ball-icon entrance-slide timing
  (`CreatePartyStatusSummarySprites`'s own slide, likely a linear `x2`
  step like `SpriteCB_TrainerSlideIn` — not checked against source yet).
- **Notes:** PAPERCUT: none new. Most of this session went into
  reverse-engineering pixel mechanics by brute force because the
  groundwork dossier's described register semantics didn't reproduce
  byte-exact pixels when implemented literally — a future session should
  RAM-probe directly through the streak window rather than iterate
  blind against pixels alone.

---

## 57 — S6 groundwork (parallel worktree lane, merged): battle-interface assets extracted byte-exact (ball_display + down_arrow wait-cursor); new files only

- **State:** merge of `worker/wt-20260718-110943` (single commit `29f7840`)
  on top of #56; `npm test` **390/390** + `npm run build` green on the
  merged result. New: `tools/extract/extract-battle-interface.ts`,
  `src/assets/gen/battle-interface-ball-display.json` +
  `battle-interface-down-arrow.json`,
  `tools/compare/traces-groundtruth/battle-interface-assets.json` (137
  captures, ticks 1284-1420), `docs/battle-interface-assets.md`.
- **Did (worker, supervisor-verified):** (1) ball_display.png (party-
  status ball icons, Full/Empty/Fainted/Statused) extracted with its own
  embedded palette; screen positions derived from
  `CreatePartyStatusSummarySprites`' formulas + the sprite
  center-to-corner (-4,-4) convention; **1590/1590 px exact** across 12
  icons × 5 ticks; entrance slide settles at tick 1292 exactly. (2) the
  wait cursor: real path is `graphics/fonts/down_arrow_alt.png` (the
  brief's guessed battle_interface path doesn't exist) via `text.c`'s
  `sDarkDownArrowTiles`; a plain triangle that *renders* heart-shaped
  through `gBattleTextboxPalette` bank 0 (already in
  `battle-window.json` palette[0] — no new palette); bob =
  `sDownArrowYCoords={0,1,2,1}` at 9 ticks/phase (the 36-tick cycle);
  **4773/4773 px exact** across all 137 probe ticks. Honestly flagged:
  the source-row-vs-dest-row axis attribution of the bob is empirical —
  the engine slice should treat the additive dest-Y rule as the pinned
  behavior, not the hand-traced address math.
- **Next:** scene-assembly engine slice (1040-1300) briefed on the main
  lane now — all its assets and mechanism tables are banked (#55 + this).
  Send-out scout (1300-1560) in flight on the worktree lane (worker M).
- **Notes:** worktree removed + branch deleted post-merge.

---

## 56 — S6 transition engine slice: CIRCLES_MEET battle transition (ticks 843-1040) implemented, oracle-pinned; `transition.json` committed 206/206

- **State:** `npm test` **390/390** (377→390, +13 in new
  `tests/battleTransition.test.ts`), `npm run build` green. New trace
  `tools/compare/traces/transition.json` (identical to the groundtruth
  dense trace: 1040 frames, 206 every-frame captures 835-1040) passes
  `npm run compare` **206/206, 0 diff**. All 16 pre-existing traces
  re-verified at their exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95) — zero regressions.
- **Did:** new module `src/engine/battleTransition.ts`, wired into
  `core.ts`'s `renderBattleRoomState` as a pure post-process over
  `battleRoom.ts`'s existing "settled" phase — **no new `BattleRoomPhase`
  needed**, every stage (gray flicker, circle-sprite slide, center-logo
  BLDALPHA blend, exit-to-black fade) is a pure function of that phase's
  own `elapsed` counter (`te`, 0 = trace tick 843). Built from source
  (`battle_transition.c`'s `Task_BattleTransition_Intro`,
  `battle_transition_frontier.c`'s `Task_FrontierCirclesMeet`) then
  iterated against `battle1-transition-dense.json`'s 206 real PNGs
  (scratch Python, brute-force + formula cross-checks, not committed)
  until byte-exact — **two corrections to #53's own flagged-as-empirical
  groundwork**, both now source-derived: (1) the circle sprites' OAM
  placement is the plain symmetric `center-32/-32` corner
  (`sCenterToCornerVecTable[square][SPRITE_SIZE(64x64)]`), not a
  per-piece offset — #53's brute-forced asymmetric numbers were fitting
  the ring artwork's own transparent padding within its 64x64 tile, not
  the true OAM corner; (2) the sprites' creation/anchor tick is trace tick
  **921** (not 920), re-derived by brute-forcing against real pixels
  rather than RAM-tick arithmetic alone. Three distinct blend mechanisms
  pixel-verified independently (module doc has the full derivation): gray
  flicker uses the standard 5-bit `BlendPalette` formula (target
  RGB(11,11,11), no BG/OBJ split — `BlendPalettes` touches every palette
  in one call); the center-logo BLDALPHA ramp empirically matches mGBA's
  output only in **8-bit** space (`floor((c1*EVA+c2*EVB)/16)`), not the
  5-bit formula the other two mechanisms use; the exit-to-black fade
  reuses `paletteFade.ts`'s `blendComponentToBlack` at a **3-per-2-ticks**
  cadence (not the usual 2) and **does** carry the same BG/OBJ 1-tick lag
  `paletteFade.ts` documents elsewhere (re-confirmed here, contra an
  early false lead where a fused blend+fade pass was accidentally
  re-quantizing an already-8-bit value through `blendComponentToBlack`'s
  unconditional 5-bit round-trip at y=0 — fixed by skipping that call
  outright when there's no fade yet). The room scene's own share of the
  exit fade (tiles + NPCs) reuses `renderBattleRoomEntryScene`'s existing
  `bgFadeY`/`objFadeY` params from `core.ts` rather than a redundant
  overlay pass.
- **Next:** scene assembly (1031-1300), off `docs/battle-scene-notes.md`
  (PROGRESS #55) — the transition now holds solid black indefinitely past
  tick 1030, which is exactly where that slice needs to take over.
- **Notes:** no papercuts. RNG modeling (transition-variant selection) and
  the other 11 Factory transition variants remain explicitly out of scope
  per the brief — this slice covers CIRCLES_MEET only.

---

## 55 — S6 scene-assembly groundwork (parallel worktree lane, merged): BATTLE-SCENE ASSEMBLY window (1031-1300) mechanism fully decoded; docs + dense ground-truth trace; one missing asset identified

- **State:** merge of `worker/wt-20260718-104713` (commits `9d58839` +
  `503efe0`) on top of #54; `npm test` **377/377** + `npm run build` green
  on the merged result. New: `docs/battle-scene-notes.md` (332 lines,
  sha-cited) + `tools/compare/traces-groundtruth/battle1-scene-dense.json`
  (256 every-frame captures, ticks 1040-1295 — supervisor sanity-ran it
  green, 256 PNGs).
- **Did (worker, supervisor-verified):** (1) first non-black frame
  **corrected to 1075** (prior 1077 was stride-4 aliasing); all
  streak-phase boundaries + the 1227 settle (3-tick plateau) + first
  text glyph 1234 pinned with shas. (2) mechanism decoded: the
  "streaks" are `BattleIntroSlide3` (`battle_intro.c`) — a deterministic
  per-scanline horizontal BG shift (top/bottom halves converge ±240→0
  over 120 ticks) crossfaded via BLDALPHA 8:8→0:16 over 48 ticks; every
  value a plain tick formula, RAM-probed (`gTasks[0].data[]` vs
  `gBattle_BG1_X`/`WIN0V`) and cross-validated against pixel shas; task
  created 1073, destroyed 1227→1228. NO RNG anywhere in the window. (3)
  battle text = `B_WIN_MSG` window, `FONT_NORMAL`, same 1-tick/char
  cadence as the field box (all 5 space-hold ticks arithmetic-exact);
  the "♥" is NOT a charmap glyph — it's `down_arrow_alt.png`, the
  standard `\p` wait-cursor (a heart-shaped asset), whose 4-phase/
  36-tick bob explains the idle-cycle signature seen at 1292+ AND at the
  action menu. (4) party-ball icons identified
  (`CreatePartyStatusSummarySprites`); **missing asset flagged:**
  `graphics/battle_interface/ball_display.png` + pal not extracted
  (extraction worker K in flight); down-arrow cursor also unextracted;
  full settled-scene compositor honestly NOT-REACHED (needs trainer-pic
  placement coords).
- **Next:** transition engine slice (843-1031) briefed on the main lane
  now, off #53's §5; then scene assembly (1031-1300) off this entry once
  worker K's assets merge.
- **Notes:** worktree removed + branch deleted post-merge.

---

## 54 — S6 slice 2c: OPPONENT-SPEECH MSGBOX window (ticks 718-843) implemented, oracle-pinned; `room-msgbox.json` committed 142/142

- **State:** `npm test` **377/377** (365→377, +12 in `tests/battleRoom.test.ts`),
  `npm run build` green. New trace `tools/compare/traces/room-msgbox.json`
  (851 frames, captures 710-851) passes `npm run compare` **142/142, 0
  diff** (first try). All 15 pre-existing traces re-verified at their exact
  prior counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions.
- **Did:** extended `battleRoom.ts`'s state machine off #51's groundwork
  (BattleRoomPhase gains `msgboxIdle`/`msgboxClosing`/`settled` alongside
  the existing `entering`) rather than rebuilding: "entering" stays a pure
  function of the same global `elapsed` through print-complete (msgbox
  appear/print folded in exactly like scientistTurnFrame/opponentStep —
  `msgboxVisual(elapsed)`, appear atomic at elapsed 198/tick 718, 1
  char/tick incl. spaces, print-complete at elapsed 218/tick 738 — both
  values derived from `MSGBOX_LINE1.length + MSGBOX_LINE2.length`, not
  separately-pinned magic numbers), then hands off to `msgboxIdle` (static,
  matches prebattleRoom.ts's own "idle" no-op-under-advance convention).
  core.ts's tick() gates the SAME idiom prebattleRoom.ts's A-press already
  established: `msgboxIdle && newKeys.has("A")` creates `msgboxClosing`
  directly on the press tick; **the close latency (`MSGBOX_CLOSE_TICKS=4`)
  was derived analytically, not guessed** — battle1-intro.json's own
  committed segment 29 (`["A"], frames:2`, right after 838 no-input frames)
  makes readKeys.ts's edge-triggered newKeys fire exactly once, on the
  tick() call producing captured frame 839 (frame 840's call sees A already
  held); working backward from the pinned "static through 842, vanished by
  843" pixels, 4 is the only tick count consistent with both the segment
  data and the pixels — independently re-confirmed via a fresh oracle probe
  before writing any code (frame 717 sha == frame 843's sha, frames
  838-842 == frame 738's "print-complete" sha). Reused
  `prebattleRoomRender.ts`'s box compositor rather than duplicating it —
  exported `drawMessageBoxFrame` (was private) and factored a new
  `drawMessageBoxText` helper (also used by that module's own single-line
  `drawMessageBox` now, a small dedup); `battleRoomRender.ts` calls both
  twice for the two lines (`IT’S WAY TOO` / `HOT HERE`, curly apostrophe
  charmap 180, #51-pinned). No new extractor/asset — confirms #51's own
  finding that this is the literal same `prebattle-room-msgbox.json` box.
  The one pre-existing test needing no change at all: `battleRoom.test.ts`'s
  "holds A for 200 ticks -> elapsed 200" assertion (written for slice 2a)
  turned out to still hold byte-for-byte, since 200 < the print-complete
  boundary (218) — holding A during "entering" is a no-op by construction
  (only `msgboxIdle` reads input), so no existing assertion needed editing.
- **Next:** the transition-to-black engine slice (tick 843+, gray flicker
  871-918 → circle sprites → center-logo blend → fade to black by 1031),
  off #53's own groundwork (RAM-pinned 8-tick gray-flicker toggle, circle-
  sprite linear-slide constants, centerBg asset byte-exact, 6-step
  2-ticks/step fade cadence). `docs/battle-scene-notes.md` scene-assembly
  scout (1031-1300) may also be ready by then per #53's "Notes".
- **Notes:** assumption flagged (not oracle-exercised this session, per the
  brief's own allowance): only the one pinned idle-phase press (well after
  print-complete) is verified; an earlier press right at print-complete is
  modeled as behaving identically (same 4-tick close, no idle-duration
  dependency) — the simplest mechanism consistent with the single pinned
  data point, matching `prebattleRoom.ts`'s own "idle" convention (no
  timeout/duration-sensitivity there either). No papercuts.

---

## 53 — S6 transition groundwork (parallel worktree lane, merged): NO heal-icon overlay exists; ticks 843-1031 fully pinned; CIRCLES_MEET assets confirmed byte-exact; docs + ground-truth trace only

- **State:** merge of `worker/wt-20260718-102848` (single commit `9ca09a6`)
  on top of #52; `npm test` **365/365** + `npm run build` green on the
  merged result. New: `tools/compare/traces-groundtruth/
  battle1-transition-dense.json` (206 every-frame captures, ticks
  835-1040 — supervisor sanity-ran it green, 206 PNGs);
  `docs/battle-bringup-notes.md` gains §5 under Slice-0 ground truth.
- **Did (worker, supervisor-verified):** (1) **the "heal-icon overlay"
  does not exist** — screen byte-identical for all of 843-870;
  `HealPlayerParty` (`script_pokemon_util.c:30-59`) is pure stat
  restoration, zero graphics calls; the earlier dossier claim was a
  coarse-sampling mislabel of the transition's own visuals (corrected).
  (2) full pixel pinning: gray flicker 871-918 matches the RAM-pinned
  8-tick toggle with consistent 1-tick render lag; circle-sprite
  positions at checkpoints 920-970 match source's linear-slide constants,
  pixel-verified 0/3216 per piece; center-logo blend 970-1017 pinned,
  centerBg asset 0/6028; fade-to-black 1018-1031 is a clean 6-step,
  2-ticks-per-step linear fade, black by 1030. (3) coverage: `battle-
  transition-frontier-circles.json` fully covers CIRCLES_MEET
  (`...-logo.json` is only for LOGO_WIGGLE/WAVE — a different source
  image; no gap). Flagged for the engine slice: OAM corner-vector
  convention found empirically; BLDALPHA checked only at tBlend=16;
  fade cadence not source-explained.
- **Next:** main lane slice 2c (speech box 718-843) briefed now off
  PROGRESS #51's groundwork; then the transition engine slice (843-1031)
  directly off this entry's §5. Scene-assembly scout (1031-1300, new
  docs/battle-scene-notes.md) in flight on the worktree lane (worker I).
- **Notes:** worktree removed + branch deleted post-merge.

---

## 52 — S6 slice 2b: SCIENTISTS-TURN + OPPONENT WALK-IN window (ticks 624-717) implemented, oracle-pinned; `room-npcs.json` committed 98/98

- **State:** `npm test` **365/365** (357→365, +8 in `tests/battleRoom.test.ts`),
  `npm run build` green. New trace `tools/compare/traces/room-npcs.json`
  (717 frames, captures 620-717) passes `npm run compare` **98/98, 0 diff**
  (first try — no fix-up needed). All 14 pre-existing traces re-verified at
  their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, rent-slot1 125/139,
  rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did:** chose slice-boundary option (a) from the brief — implemented
  through the settled no-box scene and ended the trace at **tick 717**
  (the 713-717 tail is static, matching #51's own §8.2 finding that the
  room settles by 712); the msgbox print window (718+) stays slice 2c's,
  untouched. RAM-probed all 16 `gObjectEvents` slots + their `gSprites`
  every tick 600-745 (custom script, same struct-offset conventions as
  #50, scratch under `/tmp/s6b/`), cross-checked against source
  (`scripts.inc`'s `EventScript_ScientistsFaceBattle` +
  `EventScript_EnterRoom`'s remove/setxy/add sequence,
  `event_object_movement.c`'s `MovementAction_WalkInPlaceFasterRight/Left`
  + `InitMoveInPlace`, `object_event_anims.h`'s `sAnimTable_Standard`).
  Extended `src/engine/battleRoom.ts` with `scientistTurnFrame(elapsed)`
  and `opponentStep(elapsed)`, wired into `battleRoomRender.ts`/`core.ts`
  (no extractor/asset changes needed — #49's `battle-room-layout.json`
  already carried the scientists' turn directions + opponent spawn/settle
  tiles). Findings: (1) **the scientists' turn is 2 visually-distinct
  ticks, not 4** — the RAM `duration=4` passed to `InitMoveInPlace` counts
  movement-step calls, but the anim's own frame duration is 2 ticks/entry
  and `SetStepAnimHandleAlternation` starts already at cmdIndex 2 (same
  precedent as #50's decoy walk starting at a non-zero cmdIdx); net effect
  is pre-turn (elapsed ≤105) → transient frame 8 (106-107) → settled turned
  frame 2 (≥108), all 6 scientists in exact lockstep (one shared
  `waitmovement`). (2) **the opponent is added and takes its first walk
  step within the same engine tick** — RAM shows it fully hidden through
  elapsed 111, then active *and already one sub-pixel step into its walk*
  at elapsed 112 (screenY -23, not the formula spawn of -24). (3) its walk
  screenY is a **clean 1px/tick ramp with no sub-tile easing** (same
  convention as #50's camera pan), `screenY(elapsed) = elapsed - 135`
  from elapsed 112 to the settle at 191 (screenY 56, independently
  cross-checked against the proven `tileScreenPos` tile-formula since the
  opponent is static there) — screen X never moves and is drawn via that
  same tile formula, sidestepping the raw-sprite-x encoding entirely. (4)
  the walk's picture-frame cycle is `sAnim_GoSouth` (`[3,0,4,0]`, 8
  ticks/frame, matching this game's established 1px/tick object-movement
  speed — 5 tiles × 16 ticks/tile = 80 ticks, elapsed 112-191 exactly);
  settle switches to frame 2 (`sAnim_GoWest` cmdIndex 1) — face west, per
  `Movement_OpponentEnter`'s trailing `face_left`.
- **Next:** S6 slice 2c — the opponent-speech msgbox (ticks 718-843),
  fully groundwork-pinned already (#51: print cadence, appear/close
  choreography, byte-exact frame asset = `prebattle-room-msgbox.json`).
  Then 740+ (heal icon, transition-to-black) per the parallel scouting
  lane.
- **Notes:** no papercuts. Scratch RAM-probe script (`/tmp/s6b/probe.py`)
  removed after use, nothing committed beyond the deliverables.

---

## 51 — S6 slice 2c groundwork (parallel worktree lane, merged): opponent-speech msgbox = same asset as pre-battle box (source-proofed); print cadence + appear/close choreography fully pinned; docs-only

- **State:** merge of `worker/wt-20260718-100953` (single docs commit
  `161f0ae`) on top of #50; `npm test` **357/357** + `npm run build` green
  on the merged result. Docs-only — `docs/battle-room-notes.md` §8 added
  (+180/−5).
- **Did (worker, supervisor-verified):** (1) **no new msgbox asset
  needed** — both "Right this way, please!" and the opponent speech are
  `msgbox X, MSGBOX_DEFAULT` → `Std_MsgboxDefault` → window 0 =
  `sStandardTextBox_WindowTemplates[0]` (27×4 at (2,15)), the literal
  same `message_box.png` frame already derived as
  `prebattle-room-msgbox.json`; byte-exact verified (border 3292/3292 px
  over 7 ticks, frame+fill+text 9948/9948 over 4 ticks). The prior
  "shorter variant, y=115" read was a within-tile gradient artifact —
  corrected in place. (2) print cadence pinned: room settled (no box) by
  712; box+full-white fill appear **atomically at 718**; first glyph 719;
  **exactly 1 tick/character incl. space ticks** (full tick→char table in
  §8.2); line 2 starts 731; print-complete/settle **738**. Rendered
  string confirmed pixel+charmap-exact: `IT'S WAY TOO` / `HOT HERE` with
  the curly apostrophe (charmap 180 — ASCII `'` isn't in the charmap).
  (3) close pinned: A-press #2 pulse 838-839, no visible change through
  842, box vanishes **atomically at 843** — full framebuffer
  byte-identical to tick 717's pre-appear state, static through 851.
- **Next:** S6 slice 2b (scientists turn + opponent walk-in, 624-739,
  main lane — brief going out now), then 2c (speech box) directly off
  this section. Heal-icon + transition-to-black groundwork (843-1031) in
  flight on the worktree lane (worker G).
- **Notes:** worktree removed + branch deleted post-merge.

---

## 50 — S6 slice 2a: battle-room ENTRY window (ticks 520-624) implemented, oracle-pinned; `room-entry.json` committed 110/110

- **State:** `npm test` **357/357** (349→357, +8 in new `tests/battleRoom.test.ts`,
  1 existing test in `tests/prebattleRoomFlow.test.ts` updated for the new
  handoff behavior), `npm run build` green. New trace
  `tools/compare/traces/room-entry.json` (624 frames, captures 515-624)
  passes `npm run compare` **110/110, 0 diff**. All 13 pre-existing traces
  re-verified at their exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, rent-slot1 125/139,
  rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did:** consumed #49's assets unchanged (no re-extraction needed —
  walk-cycle/turn frames turned out pixel-exact on first try). RAM-probed
  ticks 510-629 directly (custom script mirroring `tools/probe/ram-probe.py`'s
  conventions, struct offsets for `Sprite`/`ObjectEvent` from
  `include/sprite.h`/`include/global.fieldmap.h`, not committed — scratch
  under `/tmp/s6entry/`), cross-checked against a dense oracle pixel probe
  (every frame 515-545) for the fade curve. New `src/engine/battleRoom.ts`
  (state machine + oracle-pinned per-tick table) and
  `src/engine/battleRoomRender.ts` (tilemap+border+sprite compositor under
  a panning camera), wired into `core.ts` as a third top-level scene mode
  (`battleRoom`) that `prebattleRoom`'s `warpFade` phase hands off to at a
  fixed elapsed count (`WARP_FADE_TO_ROOM_ELAPSED`) matching the
  ground-truth trace's own first visible-room frame. Findings, all resolving
  #49's SS6 open items for this sub-window: (1) **fade-in reuses
  `paletteFade.ts`'s `FADE_IN` exactly** (same shape as the pre-battle
  room's own fade-in) but the call site indexes it by `elapsed` directly,
  not `elapsed+1` like every other fade call site in this codebase —
  pixel-sampled and algebraically confirmed, 0 mismatches. (2) **the camera
  pans a clean 1px/tick**, resolving #49's "may not be a clean 1px/tick"
  open question — `gTotalCameraPixelOffsetY` read directly is static then
  increments by exactly 1 every tick for 80 ticks, no sub-tile curve. (3)
  **the decoy is screen-fixed the whole window** (a finding, not assumed):
  it walks in exact lockstep with the camera pan (both driven by the shared
  `waitmovement`), so net screen position is constant — only its
  `sAnim_GoNorth` walk-cycle frame changes; this contradicts the natural
  first guess (that its raw RAM `sprite.y` directly gives screen position)
  and cost the first `npm run compare` attempt (216-425px/frame diff,
  root-caused and fixed same session). (4) the 6 scientists are static
  (face-south, pre-turn) the whole window, confirmed by RAM, and shift on
  screen via the same tile-camera formula as the room tiles.
- **Next:** S6 slice 2b — scientists turn + opponent walk-in (ticks
  624-739). Open for that slice: opponent walk-in gfx already extracted
  (#49, `OBJ_EVENT_GFX_BUG_CATCHER`), scientist turn-in-place transient
  frames extracted but still pixel-unverified (#49 SS6 risk 3).
- **Notes:** no papercuts. Scratch RAM-probe script and oracle fade-curve
  probe both inline/`/tmp`, nothing committed beyond the deliverables.

---

## 49 — S6 groundwork (parallel worktree lane, merged): Battle Factory BATTLE ROOM scene extracted, composite-verified 0/38400 at tick 624; NO ENGINE CODE

- **State:** merge of `worker/wt-20260718-094141` (single commit `f943df7`,
  new files only) on top of #48; `npm test` **349/349** + `npm run build`
  green on the merged result. New: `tools/extract/extract-battle-room.ts`
  (deterministic, byte-identical across two runs),
  `src/assets/gen/battle-room-tileset.json` (88 tiles/5 palettes/153
  metatiles), `src/assets/gen/battle-room-npcs.json` (3 nine-frame sheets:
  fake-player decoy, scientist, opponent `OBJ_EVENT_GFX_BUG_CATCHER`),
  `src/data/gen/battle-room-layout.json`, `docs/battle-room-notes.md`.
- **Did (worker, supervisor-verified):** extracted the warp-destination
  room (`BattleFrontier_BattleFactoryBattleRoom`) covering ground-truth
  ticks 520-838. Composite checks: tick 624 **0/38400 full-frame**
  (supervisor independently re-diffed the committed composite vs the
  oracle capture: 0 px), ticks 740-838 **0/21600 on y<90** (region
  excludes the not-yet-extracted opponent-speech msgbox; the full-frame
  residual at tick 800 is confined exactly to the msgbox rows). Findings:
  the camera **pans** (tracks the invisible real player, warp (6,11) →
  settle (6,6)) despite the source's "camera is supposed to remain still"
  comment; opponent gfx resolved via `gTowerMaleFacilityClasses[28]`; no
  attendant object exists in this map.
- **Next:** S6 slice 2a — engine implementation of room entry (fade-in +
  camera pan + decoy walk, ticks 520-624, ending at the verified tick-624
  composite), then 2b (scientists turn + opponent walk-in 624-739), then
  2c (opponent speech msgbox 739-843). Open items from
  `docs/battle-room-notes.md` §6 for those slices: camera pan sub-tile
  timing not derived; tick 520-535 brightness fade-in observed
  (~10→~97 mean) but not modeled; walk-cycle/turn transient frames
  extracted but pixel-unverified; opponent-speech msgbox variant art not
  yet extracted (deliberately deferred behind #48's derivation fix).
- **Notes:** worktree removed + branch deleted post-merge.

---

## 48 — ISSUES #15 root-caused and fixed: pre-battle msgbox frame now derived from `prebattle-room-msgbox.json`, baked asset deleted

- **State:** `npm test` **349/349** (+2 regression tests), `npm run build`
  green, working tree clean. Full 13-trace sweep at exact prior counts —
  **accept-prebattle 137/137**, **walk-warpout 125/125** (acceptance bar),
  anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66,
  example 4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, rent-slot1 125/139, rent-3picks 157/190,
  confirm-flow 79/95 — zero regressions. ISSUES.md: **#15 deleted**.
- **Did:** Root-caused the "one-GBA-step" color offset that made the accept
  worker bake `prebattle-msgbox-frame.json` from a literal oracle capture
  instead of deriving it: `tools/extract/gbaColor.ts`'s `to5Bit()` assumed
  every reference PNG/pal 8-bit value approximates its true 5-bit GBA
  channel via `floor(c5*255/31)` (true for this map's own tileset/NPC
  sprites, verified by direct PLTE-byte inspection), but
  `graphics/text_window/message_box.png`'s embedded palette instead stores
  exact `c5*8` values (a different, plainer export convention) - the old
  formula silently rounded those down one GBA step (e.g. raw 248 -> 5-bit
  30 instead of 31 -> 247 not 255). Fixed by recovering the 5-bit value via
  `v8>>3` (top 5 bits), the correct general inverse regardless of which
  forward convention produced the reference byte - verified against both
  conventions' full value ranges before changing it, and confirmed
  byte-identical regeneration for every *other* extracted asset (tileset,
  layout, NPCs - only `prebattle-room-msgbox.json` actually changed when
  re-extracted). Once fixed, that asset's own palette contains the oracle-
  exact interior white (idx1) *and* the message text's fg/shadow colors
  (idx2/idx3) exactly - the old "two-asset rule" (docs/prebattle-room-
  notes.md §3) was itself an artifact of the same bug, not a real asset-
  boundary. Reverse-engineered `prebattleRoomRender.ts`'s new
  `drawMessageBoxFrame` from the real source
  (`WindowFunc_DrawDialogueFrame`, `reference/pokeemerald/src/menu.c:319-
  402`, the standard width=27/height=4 field window) rather than pixel-
  matching by hand, then byte-exact verified it against the (now-deleted)
  baked capture before deleting it: all 9948 non-transparent frame pixels
  matched exactly, 0 mismatches. Pinned the root cause with two Tier-1
  regressions (`tests/extract.test.ts`: `to5Bit(248)===31`,
  `gbaRoundTrip(248)===255`; `tests/prebattleRoom.test.ts`: msgbox palette
  idx1/2/3 now exactly white/fg/shadow).
- **Next:** S6 slice 1b+ (battle-room entry, heal-icon/transition window) -
  unaffected by this step, per its scope. No open ISSUES entries.
- **Notes:** no papercuts. Scratch verification (pixel sampling, brute-force
  tile-match scripts used to derive/confirm the tile-placement algorithm)
  was all inline `node -e`, nothing committed.

---

## 47 — S6 slice 1b (parallel worktree lane, merged): slice-0 §4 loose ends resolved — transition = CIRCLES_MEET (RAM-confirmed), transition-end = tick 1227, post-freeze draws re-attributed; docs-only

- **State:** merge `a004db2` (branch `worker/wt-20260718-091648`, single
  docs commit `c005d87`) on top of #46; `npm test` **348/348** + `npm run
  build` green on the merged result. Docs-only — `docs/battle-bringup-notes.md`
  +227/−47, no engine/asset/fixture changes.
- **Did (worker, supervisor-verified):** (1) transition variant **RESOLVED**:
  `gTasks[6].data[1]` (`tTransitionId`) reads **34 =
  `B_TRANSITION_FRONTIER_CIRCLES_MEET`** from tick 869 — enum ordinal
  independently re-counted by the supervisor against
  `include/battle_transition.h`; corroborated by `gTasks[7].func` becoming
  `Task_FrontierCirclesMeet` (its state machine matching source math
  tick-for-tick) and screenshots (3 circles converging, ticks 960-990).
  The 1077-1197 "streak" frames are **not** the transition — all
  transition tasks are destroyed by `CB2_InitBattleInternal`'s
  `ResetTasks()` at tick 1044 (same tick as the independently-pinned RNG
  freeze); they're `BeginBattleIntro`'s scene assembly. (2)
  transition-end **pinned**: scene settled (modulo text) tick **1227**
  (plateau through 1229); text milestones "would like to battle!"
  no-heart 1272-1273, ♥ at 1274, true steady state from 1292 = the same
  4-phase/36-tick idle cycle as the action menu (the old "1290 stable"
  claim was a 6-frame transient — corrected in place). (3) post-freeze
  RNG draws re-attributed: **1741 is `TryDoEventsBeforeFirstTurn`'s draw**
  (RAM-confirmed via the `gBattleMainFunc` handoff; the old attribution
  to 1747 was a proximity guess); 1745 (2-step) plausibly opponent-AI
  switch heuristics (`AI_TrySwitchOrUseItem`, bracketed by controller
  busy-bits, not single-stepped); 1747 (5-step) genuinely unpinned
  (AI chain, player controller, TryDoEvents all source-ruled-out) — an
  S7 concern, flagged in the dossier, not an S6 blocker.
- **Next:** S6 slice 2 — battle-room entry scene (frames 520-838). A
  parallel extraction worker (battle-room map/NPCs/opponent overworld
  sprite, new files only) is in flight on the worktree lane as of this
  entry.
- **Notes:** worktree removed + branch deleted post-merge. Worker A's
  ROADMAP slice-1a note was worker-written (convention is propose-only) —
  ratified as accurate; the slice-1b roadmap note is the supervisor's own,
  this commit.

---

## 46 — S6 slice 1a: A-press → closemessage → guided walk → warp fade (ticks 400-519) implemented, oracle-pinned; `walk-warpout.json` committed 125/125

- **State:** `npm test` **348/348** (341→348, +7 in `tests/prebattleRoomFlow.test.ts`),
  `npm run build` green. New trace `tools/compare/traces/walk-warpout.json`
  (520 frames, captures 395-519) passes `npm run compare` **125/125, 0
  diff**. All 12 pre-existing traces re-verified at their exact prior
  counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6
  66/66, example 4/4, summary-info-onix 122/122, summary-info-magby
  132/132, confirm-decline 67/67, accept-prebattle 137/137, rent-slot1
  125/139, rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did:** RAM-probed the whole window directly (`tools/probe/ram-probe.py`,
  scratch spec/output under `/tmp/s6-worker/`, not committed) rather than
  fitting pixel diffs blind: watched `gObjectEvents[0/1]` (player/attendant
  - localId/currentCoords/movementActionId/facing), `gSprites[0/1]`
  (x/y/animNum/animCmdIdx/invisible flag), and `gSpriteCoordOffsetX/Y`
  every tick 395-520. Cross-referencing against `sAnim_Go*`'s ANIMCMD
  tables (`object_event_anims.h`) decoded exact per-tick walk-animation
  frames; cross-referencing screen positions (`sprite.xy + coordOffsetXY -
  {8,16}`) against the room's already-known camera-origin formula proved
  **the player sprite stays screen-fixed at (112,56) the entire walk** (the
  field camera exactly cancels the player's own movement) - only the room
  tiles + the independently-moving attendant actually scroll on screen, a
  finding that collapsed the whole camera-scroll gotcha the brief flagged
  into "no per-tick player-position bookkeeping needed." Also discovered a
  real one-tick **render-lag**: RAM state at tick N only becomes visible in
  the rendered frame N+1 (verified against the ground truth's own frame-403
  boundary). Baked the resulting 80-tick walk (frame 403 → 482, when motion
  freezes) as an oracle-pinned lookup table (`prebattleRoom.ts` `WALK_STEPS`,
  same style as this file's existing `WINDOW_STEPS`/`UNREVEAL_WINDOW_STEPS`
  tables) rather than a general movement formula - safest match for exact
  byte-parity given per-tile timing already deviates from the naive 16-
  frames/tile assumption in places. Pixel-sampled the warp fade separately
  (a static room pixel across frames 478-505) and fit it to the *existing*
  `BlendPalette` shape already modeled in `paletteFade.ts` - new
  `WARP_FADE_OUT` timing constant (startDelay 4), reusing `bgFadeY`/
  `objFadeY` unchanged. New phases `messageClosing` (2-tick input-
  registration lag, matching this file's existing `confirmReveal`
  precedent) → `walking` (80 ticks, `WALK_STEPS`-driven) → `warpFade` (fades
  to black and then holds solid black forever, matching the step's explicit
  "may simply hold black from 501 onward" scope cut). Extended
  `extract-prebattle-room.ts` to pull all 9 standard picture-table poses per
  NPC (was 1 each) - `prebattle-room-npcs.json`'s shape changed from a
  single `tileset` to a `frames[9]` array; updated `prebattleRoomRender.ts`
  (`drawRoomTiles`/`drawNpcFrame` now take an explicit origin/frame index)
  and `tests/prebattleRoom.test.ts` to match. Core.ts wires the A-press
  (`newKeys.has("A")` while `phase==="idle"`) directly into `messageClosing`
  - the only input this screen ever reads in this slice.
- **Next:** S6 slice 1b+: battle-room entry (frame 520+, scientists facing,
  opponent walk-in, opponent overworld speech "IT'S WAY TOO HOT HERE"),
  then the heal-icon/nature-reroll/transition-select window (ticks 842-869)
  and the transition itself - all pinned in `docs/battle-bringup-notes.md`'s
  "Slice-0 ground truth" section (not touched this step, per the step
  brief - a parallel worker owns that file). ISSUES.md still just #15.
- **Notes:** no papercuts this session. All RAM-probe scratch (specs,
  dense-capture trace JSONs used only to derive the table, PNG output under
  `/tmp/s6-worker/`) is scratch per convention, not committed - only
  `tools/compare/traces/walk-warpout.json` (the final byte-exact parity
  trace) and the engine/asset/test diffs are. `docs/battle-bringup-notes.md`
  was read but **not edited**, per the step brief.

---

## 45 — Supervisor wind-down: session end 2026-07-18 ~01:20; S5 COMPLETE [x], S6 slice 0 banked

- **State (verified this minute):** `npm test` **341/341**, `npm run build`
  green, working tree clean. All 12 parity traces verified this session at
  final counts: anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, **confirm-decline 67/67** (new),
  **accept-prebattle 137/137** (new) — plus rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95 (all three ISSUES #5 settled policy).
  Ground-truth trace `traces-groundtruth/battle1-intro.json` committed.
  ISSUES backlog: only **#15** (baked msgbox frame asset, non-blocking
  debt). ROADMAP: **S5 marked [x]**; S4 remainder deferral extended behind
  the S5→S8 critical path (recorded decision); S6 slice 0 done.
- **Session summary (supervised, ~21:20-01:20):** 7 worker steps, all
  supervisor-verified green, zero trace regressions at every step:
  (1) S5 decline path landed (confirm-decline.json first cut 13/67;
  ISSUES #11/#12/#13 filed from its attributions); (2) ISSUES #11
  species-name breathe modeled exactly, 53/67 (`tools/probe/ram-probe.py`
  banked, papercut retired); (3) ISSUES #12 partial — prior hypothesis
  RAM-disproven, ball-grid snapshot fix, 54/67; (4) ISSUES #12 rc2 +
  #13 fixed → **67/67**; (5) S5 accept path (exit fade → pre-battle room →
  message print), 123/137, ISSUES #14 filed + #15 debt filed;
  (6) ISSUES #14 fixed → **137/137** → S5 [x]; (7) S6 slice 0
  ground-truth pinning (battle1-intro.json + dossier corrections).
  Suite 297→341 Tier-1 tests; traces 10→12 parity + 1 ground truth.
- **Next:** S6 slice 1 — engine implementation against
  battle1-intro.json's pinned targets, suggested order: message A-press +
  closemessage + warp fade (extends S5 scene machinery), then the
  heal-icon window (nature-reroll/transition-select ticks 842-869), then
  the transition itself. Early in slice 1 resolve the dossier §4 loose
  ends: transition-end bound (1200-1290), transition-variant pixel
  confirmation (2 of 12 candidates), the 2 unexplained post-freeze
  `Random()` draws (ticks 1741/1745). ISSUES #15 whenever convenient.
- **Notes:** every worker ended at a green commit; no usage-limit events;
  no parallel-lane use this session (all 7 steps serial in the main tree).
  One supervisor error: the ISSUES #15 filing clobbered #14's heading
  line (worker caught + restored it, `ba6ff0d`). PAPERCUTS: battle1-intro
  ground-truth entry retired this commit (trace now committed).


---


## 44 — S6 slice 0: ground-truth bring-up pinning complete — battle1-intro.json (1886f/254 captures) committed, RNG/transition/personality checkpoints RAM-verified, dossier extended; NO ENGINE CODE

- **State:** `npm test` **341/341** (unchanged, no engine touched), `npm run
  build` green. `tools/compare/traces-groundtruth/battle1-intro.json`
  (new dir, +README) committed: 1886 frames (`accept-prebattle.json`'s
  verified 392-frame prefix + A-press@400 + 2 more player-paced A-presses
  + idle through transition/intro/both send-outs), 254 dense captures.
  `bin/oracle run` on it verified green; spot-checked anchor (1/1) and
  confirm-decline (67/67) still exact — zero regressions.
- **Did:** Two chained oracle probe passes (sparse locator, then a dense
  final pass around each located boundary) pinned every frame boundary
  the step asked for (message-close, warp-fade black window, transition
  start/first-visual, both send-out text settles, first-action-menu
  settle at tick 1750 with its 36-frame idle cycle) — see
  `docs/battle-bringup-notes.md`'s new "Slice-0 ground truth, 2026-07-18"
  section for the full sha256-cited list. `tools/probe/ram-probe.py`
  (gRngValue + gBattleTypeFlags + gEnemyParty[0..2].personality, every
  tick from 395) then pinned: the 1/VBlank cadence and its exact freeze
  tick (1044→1045, then one explicit draw at 1066, then a 675-tick true
  battle freeze 1066-1740); all 3 opponent personality rolls (28/16/95
  rejection iterations for Grovyle/Murkrow/Pidgeotto respectively,
  cross-validated 3-for-3 against this file's own expected-nature table
  via `personality % 25`); and the transition-select roll (tick 868→869,
  narrowed to 2 of 12 candidates — see below). **Two corrections to the
  existing dossier filed with full RAM evidence** (not re-probing what
  was already trusted — these surfaced from this session's own new data):
  (1) the 3 nature-rerolls + transition-select happen during the
  **heal-icon animation** (ticks 842-869), roughly 160-200 ticks *before*
  the transition's black screen (1031) — not "the same frame" as the
  transition start, as previously assumed; (2) **4** explicit `Random()`
  draws survive the per-frame freeze, not the previously-documented 2 —
  two of them (ticks 1741, 1745) are unexplained, flagged for a future
  source re-read.
- **Next:** S6 slice 1+ (actual engine implementation: battle transition
  effect, scene init, intro text, first action menu) can now build against
  this committed ground truth instead of re-scouting it. Two loose ends
  flagged in the dossier's §4: (a) the transition-visual identification
  is narrowed to `CIRCLES_MEET` or `CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ` (2
  of 12) via RNG math but not pixel-confirmed — a future session should
  either find the right RAM field for the resolved transition id or do a
  frame-by-frame source cross-check; (b) transition-end (trainer/bg fully
  assembled) is bounded to ticks 1200-1290, not resolved tighter.
  Suggested `ROADMAP.md` S6 wording (not edited here, worker convention):
  append under S6 "**Groundwork banked (2026-07-18):**
  `tools/compare/traces-groundtruth/battle1-intro.json` (1886f, 254
  captures) pins the full A-press-through-first-action-menu window with
  sha256-cited frame boundaries and RAM-verified RNG/personality/
  transition-candidate checkpoints (`docs/battle-bringup-notes.md`
  'Slice-0 ground truth'); engine slices can now implement against fixed
  targets instead of re-scouting timings."
- **Notes:** PAPERCUT retired (not fixed by me, supervisor's file):
  `PAPERCUTS.md`'s "No committed oracle trace for the battle-1 bring-up
  path" entry is superseded by this commit. No new papercuts this
  session. All scratch work (`/tmp/s6-worker/`: probe scripts, sparse/
  dense locator trace JSONs, ram-probe spec/output) is scratch per
  convention, not committed. `src/engine/`, `src/assets/`, `src/data/`,
  and `tools/extract/` were **not touched** — confirmed via `git status`
  before both commits.

---

## 43 — ISSUES #14 root-caused and fixed (two distinct bugs, both the same "accept's own extra-work-free path renders early" mechanism family); `accept-prebattle.json` 123/137 → **137/137**, entry DELETED

- **State:** `npm test` **341/341** (337→341, +4 `tests/prebattleRoomFlow.test.ts`),
  `npm run build` green. `accept-prebattle.json`: **123/137 → 137/137, byte-
  exact on every frame.** All 12 other traces re-verified at their exact
  prior counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-
  menu-slot6 66/66, example 4/4, rent-slot1 125/139, rent-3picks 157/190,
  summary-info-magby 132/132, summary-info-onix 122/122, confirm-flow 79/95,
  confirm-decline 67/67) — zero regressions. ISSUES #14 DELETED.
- **Did:** Also fixed a doc bug inherited from the prior session: the
  supervisor's ISSUES #15 insertion had clobbered #14's own heading line,
  leaving its body under an orphaned continuation fragment (separate commit,
  restored before starting). Root-caused #14 in two layers, both found by
  replaying `accept-prebattle.json`'s exact button script through a scratch
  engine harness and cross-referencing `confirmReveal` state per tick against
  `npm run compare`'s per-frame diff-pixel counts (RAM/IO-register probing,
  the step brief's suggested first approach, was superseded once this
  cross-reference made the mechanism obvious without it). **Root cause #1**
  (the 4-row window-edge band, frames 262-269/270-279, ~11 of the 14 listed
  frames): the accept path's `UNREVEAL_WINDOW_STEPS`/`UNREVEAL_FLASH_WIDTHS`
  table read lands exactly **one tick early** vs decline - confirmed
  air-tight by reproducing every one of the residual's diff-pixel counts
  exactly (96/48/24/12/9px = the precise pixel deltas between adjacent table
  entries × 3 flash centers). Same "decline's extra same-tick work delays
  the render by a tick" mechanism already fixed for `monsVisible` (ISSUES
  #9/#13 family) — just not previously applied to this table. Fixed by
  factoring the table lookup into a pure `closingWindowStep(tick)` and
  reading it at `elapsed+1` (clamped to the last tick, matching decline's
  own tail-hold behavior via the pre-existing `closingFlashResidual`) for
  `accepting`, unchanged for decline. **Root cause #2** (a 36px residual on
  frame 262 surfaced only after fixing #1): the same early-render mechanism
  also hits the window's live ball-grid layer on accept's very first closing
  tick (elapsed 1) - a naive display-only lag (the usual fix for this
  family, tried first and reverted when it broke frame 263) doesn't work
  here because the immediately-following tick permanently freezes via the
  pre-existing `ballAnimStall` mechanism (ISSUES #13), so lagging the stored
  value leaves the wrong tile frozen for the whole stall instead of
  self-correcting. Fixed via a new `ConfirmRevealState.preCloseBallAnims`
  snapshot (every active ball's state as of the tick closing started,
  mirroring the existing `decliningBallAnim` pattern but for all slots)
  consumed by `factoryDraftScreen.ts`'s window-ball rendering only at
  `accepting && elapsed === 1`. Both fixes pinned in
  `tests/prebattleRoomFlow.test.ts` (window/flash table-shift equivalence
  vs. a live decline replay across every tick + the tail clamp, and the
  ball-snapshot's exact one-tick lifecycle).
- **Next:** ISSUES.md backlog is back to just #15 (message-box asset debt,
  out of scope for this step). S6 (battle bring-up) is the next roadmap
  stage, off its already-banked groundwork (`docs/battle-bringup-notes.md`).
- **Notes:** no papercuts this session beyond the doc-heading fix above
  (itself filed/fixed, not left standing). All scratch probing (a Node
  replay harness importing `core.ts` directly, plus Python/PIL pixel
  sampling of `tools/compare/out/latest`) was scratch, deleted before
  finishing - nothing uncommitted beyond the intended
  `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/prebattleRoomFlow.test.ts` + `ISSUES.md`/`PROGRESS.md`/
  `PROGRESS-archive.md`.

---

## 42 — S5 COMPLETE: YES-press accept path (exit fade → pre-battle room → fully-printed "Right this way, please!") implemented, oracle-pinned; `accept-prebattle.json` committed at 123/137, ISSUES #14 filed for the residual

- **State:** `npm test` **337/337** (329→337, +8 `tests/prebattleRoomFlow.test.ts`,
  +2 rewritten in `tests/confirmDecline.test.ts`), `npm run build` green. All
  11 pre-existing traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95, confirm-decline 67/67) —
  zero regressions. New trace `tools/compare/traces/accept-prebattle.json`
  (dense, 137 captures spanning the YES press through the fully-printed,
  settled idle message) committed at **123/137**, all 14 non-matching
  frames individually attributed to a new, precisely-evidenced entry
  (ISSUES #14).
- **Did:** Implemented S5's last piece end-to-end: new `src/engine/
  prebattleRoom.ts` (scene-mode state machine: fadingOut → black → fadingIn
  → roomHold → printing → idle) and `src/engine/prebattleRoomRender.ts`
  (static room composite reusing the already-dossier-verified 17x14-block +
  NPC-sprite assets, plus the message box), wired into `core.ts`'s
  `EngineState`/`tick`/`render` via a new top-level `prebattleRoom` field
  (same shape as `summaryScreen.transition`'s own exclusive-ownership
  pattern). Dense oracle probes this session (own dense captures, not
  reused from prior scratch) pinned: (1) the exit fade-out reuses
  `paletteFade.ts`'s existing `EXIT_FADE_OUT` timing verbatim (same
  `BeginNormalPaletteFade(PALETTES_ALL,0,0,16,RGB_BLACK)` call, source-
  confirmed) but only *starts* once the 20-tick closing/un-reveal
  (`Select_HideChosenMons()`, the SAME function decline calls) finishes -
  not at the button press itself; (2) a new, distinct 14-tick black hold
  (`EXIT_TO_ROOM_BLACK_HOLD_TICKS`, NOT the summary screen's 20); (3) the
  room fade-in reuses `FADE_IN` verbatim; (4) an 8-tick settled-room hold
  before the message box appears (`ROOM_HOLD_TICKS`); (5) the message box
  frame+interior appears fully-formed in one tick (no grow animation) -
  baked directly from an oracle capture into a new asset
  (`src/assets/gen/prebattle-msgbox-frame.json`) after this session's own
  tile/palette brute-force match against `prebattle-room-msgbox.json`
  turned up unexplained ~1-GBA-step color mismatches (PAPERCUT, see below);
  (6) text prints exactly 1 character/tick linearly (no pauses - the
  dossier's own sha-diff-only pass had mistaken 3 space-character ticks for
  timing stalls), glyph origin (16,121) and colors pixel-derived this
  session (corrects `docs/prebattle-room-notes.md` §3's own Risk 1/2 - see
  `prebattleRoomRender.ts`'s module doc for the corrected box geometry,
  y112-159 not y96-159). Root-caused and fixed two real accept-vs-decline
  source divergences along the way (both source-grepped, not guessed):
  `Select_ErasePopupMenu(SELECT_WIN_YES_NO)` is decline-only (accept's
  YES/NO box + cursor highlight stay visible through the whole closing AND
  the exit fade, new `drawYesNoOverlayFaded` export); and the 3 mon pics
  vanish one tick earlier on accept than decline's own cutoff (decline's
  extra same-tick `Select_HandleMonSelectionChange`/`Select_
  PrintSelectMonString` work delays that frame's render, same "extra work
  costs a tick" family as ISSUES #9/#13). RNG continuity (ROADMAP S6's
  correction note) verified two ways: a hermetic hold-yourself test proving
  `rngValue` advances every single tick with no gaps through the whole
  window, and a `tools/probe/ram-probe.py` cross-check pinning the exact
  `gRngValue` at the fully-printed idle tick (bit-exact match, both new
  Tier-1 tests in `tests/prebattleRoomFlow.test.ts`). Ball anims (and their
  RNG rolls) keep advancing through "fadingOut" specifically (source-
  confirmed: `Select_DestroyAllSprites` only runs once the fade completes,
  `battle_factory_screen.c:1512-1519`), then stop for good.
- **Next:** S5 is now fully `[x]`-ready per its own acceptance criteria
  (supervisor to confirm and tick `ROADMAP.md`, per protocol this worker
  doesn't edit it). A future session should pick up ISSUES #14 (the
  window-edge residual below) opportunistically, or move straight to S6
  (battle bring-up) off its already-banked groundwork
  (`docs/battle-bringup-notes.md`).
- **Notes:** **ISSUES #14 filed, not fixed:** a 4-row band at the shrinking
  reveal window's current top/bottom edge shows a wrong color for 8 frames
  of the accept-path closing animation, tapering to 0 by the time the
  window fully collapses (same halving-tapering shape as ISSUES #5's flash-
  bar family) - full pixel evidence + what was ruled out (not a window-
  bounds/table-timing bug, `bg3ColorWide` is flat there, `target2Color`'s
  `bg1Color` fallback is the likely site) is in the entry itself. Chased for
  a meaningful chunk of this session's budget before stopping to bank the
  two *confirmed* source-level bugs instead of guessing further at this
  third one. PAPERCUT: `prebattle-room-msgbox.json`'s own tile/palette data
  didn't reproduce the oracle's box art byte-for-byte when composited per
  the standard `DrawDialogueFrame` tile-index algorithm (source-read
  correctly, cross-checked against the extracted JSON) - colors were
  consistently one GBA 5-bit step brighter than the palette's own entries
  at several positions (border edges, text shadow), not yet root-caused.
  Worked around by baking the exact oracle pixels for the box's pre-text
  frame directly into a new asset instead of re-deriving from tiles/
  palette - functionally correct (0 diff on the box itself) but a future
  session should figure out why the tile-based derivation didn't match
  before extending it (e.g. to a 2nd map's message box) elsewhere. ~20 min
  lost this session on that specific investigation before the baking
  shortcut was chosen.

---

---

## 41 — ISSUES #12 root cause #2 fixed + ISSUES #13 root-caused and fixed; `confirm-decline.json` 54/67 → **67/67**, both entries DELETED

- **State:** `npm test` **328/328** (325→328, +3 in `tests/confirmDecline.test.ts`;
  the 324→325 en route was the #12 pin), `npm run build` green. All 10
  pre-existing traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions.
  `confirm-decline.json`: **54/67 → 67/67, byte-exact on every frame.**
  Both ISSUES #12 and #13 DELETED.
- **Did (Part 1, ISSUES #12 root cause #2):** Dense per-tick pixel diff of
  oracle vs app in the WIN_OPTIONS box (x176-224/y112-144, fresh
  `npm run compare` capture into `tools/compare/out/confirm-decline`)
  showed the YES/NO glyph text is already fully erased (replaced by plain
  window-background pixels) at closing `elapsed===1` — one tick before the
  old `elapsed<2` model — while the cursor-highlight sprite's own red
  pixels stay visible through `elapsed===2`, one tick *after* the old
  `cursorVisible` cutoff, only gone at `elapsed===3`. Fixed in
  `confirmReveal.ts`'s closing branch: `yesNoVisible` now only true at
  `elapsed===0`; `cursorVisible` true through `elapsed<=2`. Pinned
  (`confirmDecline.test.ts`, new ISSUES #12 describe block asserting all 4
  boundary ticks). This alone took `confirm-decline.json` to 55/67 (254
  byte-exact, 255 down from 973px to a 45px residual in the ball-grid area
  — see Part 2).
- **Did (Part 2, ISSUES #13):** RAM-probed `gSprites[]` (position-scanned
  the 6 ball sprites by their known screen centers, `35*i+32,64` —
  confirmed indices 0-5 = grid slots 0-5 exactly) and cross-checked
  `animCmdIndex`/`animNum` tick-by-tick against this engine's own predicted
  `ballAnims[]` state (scratch Python probe via the mgba-venv interpreter +
  a scratch Node replay of `core.ts`, both deleted after use) plus direct
  oracle-vs-app pixel sampling at each ball's grid position. Ground truth:
  starting at the closing phase's `elapsed 0->1` boundary, every
  still-active ball (slots 0/1; slot 2 is already null from the decline
  itself) needs exactly one more internal tick of stall on top of the
  decline's own already-modeled `Select_PrintSelectMonString` stall — a
  **permanent** one-tick downstream shift (proven by diffs recurring on
  every subsequent `MOVING_CMDS` transition all the way to frame 302, long
  after `confirmReveal` itself goes null — only explainable by a genuine
  internal-timer stall via the existing `ballAnimStall` skip-a-tick
  mechanism, ISSUES #6's family, not a brief display-only lag like
  `isRevealStallActive` which self-corrects and can't cascade). Fixed:
  `core.ts` now sets `ballAnimStall = activeSlotsBeforeAction` on the same
  `wasClosingAtZero`-derived tick the speciesNameFade activation already
  fires on. This alone closed 10 of the remaining 11 #13-listed frames plus
  255's residual (66/67). The 12th residual, frame 273 (3px at the 3
  `REVEAL_FLASH_CENTERS`, y=64, exact `FLASH_BLENDED_COLOR` value): the
  closing zoom-out's own final width-1 flash pixel outlives `confirmReveal`
  going null by exactly 1 tick — a pure OAM-teardown render lag, kept
  deliberately separate from (and NOT changing) `confirmReveal`'s own
  already-RAM-verified 20-tick un-reveal duration that gates cursor-input
  readiness. Fixed via a new `DraftScreenState.closingFlashResidual`
  boolean (same shape as this codebase's other post-hoc trailing-render
  fields, e.g. `rentConfirmRedraw`), set for exactly the tick
  `confirmReveal` transitions "closing"->null, consumed by
  `drawConfirmReveal`'s now-non-early-returning null branch. **67/67.**
  Both fixes pinned (`confirmDecline.test.ts`, 3 new describe blocks: the
  #12 boundary timing, the #13 `ballAnimStall` extension + frozen-state
  equality check, and the `closingFlashResidual` one-tick pulse).
- **Next:** ISSUES.md backlog is now EMPTY. S5's last piece: the YES-press
  accept path (exit fade → pre-battle room, `docs/prebattle-room-notes.md`).
  Then S6 off its banked dossier.
- **Notes:** all RAM probing (`tools/probe/ram-probe.py` for the ball-sprite
  position scan + `animCmdIndex` watch, addresses derived from
  `gSprites`'s linker symbol + `sizeof(struct Sprite)=0x44` from
  `reference/pokeemerald/include/sprite.h`) and pixel sampling (scratch
  Python/PIL over `tools/compare/out/confirm-decline`'s fresh captures) was
  scratch, deleted before finishing - nothing uncommitted beyond the
  intended `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/confirmDecline.test.ts` + `ISSUES.md`/`PROGRESS.md`. No new
  papercuts — `tools/probe/ram-probe.py` and the position-scan method from
  PROGRESS-archive #35 both worked as documented.

---

## 40 — ISSUES #12: hypothesis disproven + real root cause #1 found/fixed (declined-ball window-render hold); root cause #2 characterized, still open; `confirm-decline.json` 53/67 → 54/67

- **State:** `npm test` **324/324** (323→324, +1
  `tests/confirmDecline.test.ts`), `npm run build` green. All 10
  pre-existing traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions.
  `confirm-decline.json`: **53/67 → 54/67**; **frame 253 now byte-exact**
  (was 156px); frame 254 251px→95px, frame 255 1129px→973px (both
  shrunk, not yet closed). Step brief's acceptance bar (all of 253-255
  fixed, >=56/67) **not fully met** — see Notes for why this is the right
  stop point rather than a rushed table.
- **Did:** RAM-probed (`tools/probe/ram-probe.py`, scratch spec/output not
  committed) `confirm-decline.json`'s actual decline tick-by-tick and
  **disproved** the prior worker's "decline branch fires 1 tick early"
  hypothesis: `selectingMonsState`/`mons[2].selectedId`/`monPicAnimating`
  all flip together at the exact tick this engine's decline branch already
  fires — timing was already correct. `fadeSpeciesNameActive`'s real
  1-tick-later flip (and its existing `wasClosingAtZero` compensation) is
  confirmed correct and kept; comment updated to record the disproof.
  Pixel-diffed oracle vs app at frames 253-255 (`tools/compare/out/latest`)
  and found the REAL root cause: the un-reveal's "still-shown" hold already
  freezes the 3 front-sprite mon pics via `decliningSpecies`, but the wide
  window's *background ball-grid layer* did not get the same treatment,
  reading live (already-deselected) ball state instead. Verified exactly
  via `blend8` math against `pokeball.selectedPalette`/`grayPalette` (matches
  oracle's declined-ball RGB byte-for-byte with `selectedPalette`, confirmed
  frozen/non-animating across all 3 oracle frames, switching to gray only at
  frame 256). Fixed: new `ConfirmRevealState.decliningBallAnim` snapshot
  (`core.ts`, same hold window as `decliningSpecies`), consumed by
  `factoryDraftScreen.ts`'s `drawConfirmReveal` to override the window's
  ball array for the declined slot. 1 new Tier-1 test pinning the snapshot's
  elapsed-0-through-2 lifetime. Characterized (not fixed) a SECOND, separate
  residual now isolated at frames 254/255: the YES/NO box text + cursor
  highlight (`WIN_OPTIONS`, y112-144 — outside the mon-pic window's y32-96
  clip, unrelated to the window-shrink table) actually starts a multi-tick
  erase transition one tick earlier than modeled and the highlight persists
  one tick later than modeled; full evidence + probe plan filed in ISSUES
  #12 (re-scoped, not deleted). Full trail in the ISSUES #12 entry and
  commit history.
- **Next (supervisor-set, per the original brief):** ISSUES #12's remaining
  YES/NO box erase-transition timing (evidence + a concrete RAM-probe plan
  already filed), then ISSUES #13 (stretch, untouched this session — no
  cap time left after #12), then S5's last piece: the YES-press accept path
  (exit fade → pre-battle room, `docs/prebattle-room-notes.md`). Then S6.
- **Notes:** stopped here rather than push into #12's second sub-bug because
  the erase-transition timing needs its own dense probe (sprite-invisible
  RAM read + per-tick pixel scan) to avoid guessing a wrong table under time
  pressure — a disproven hypothesis + a real, tested, committed partial fix
  is the honest stopping point per the brief's own instruction ("a clean
  disproof + re-filed entry is an acceptable outcome, a silent workaround is
  not"). All scratch RAM-probe specs/outputs and one scratch pixel-math
  script were deleted before finishing; nothing uncommitted beyond the
  intended `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/confirmDecline.test.ts` + `ISSUES.md`/`PROGRESS.md`. No new
  papercuts — `tools/probe/ram-probe.py` (committed last session) worked
  as documented, first try.

---

## 39 — ISSUES #11 fixed: species-name breathe (`Select_Task_FadeSpeciesName`) modeled exactly, RAM-pinned; `confirm-decline.json` 13/67 → 53/67

- **State:** `npm test` **323/323** (310→323, +13
  `tests/speciesNameFade.test.ts`), `npm run build` green. All 10
  pre-existing traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions, the
  breathe never fires within any of their action budgets.
  `confirm-decline.json`: **13/67 → 53/67** (one short of the step brief's
  "exactly 54/67" target - see Notes for why, and why that's the right stop
  point rather than a sign the model is wrong).
- **Did:** Built `tools/probe/ram-probe.py` (generic, reusable per-tick
  RAM-probe over a button-segment script; committed per `PAPERCUTS.md`) and
  used it to pin `fadeSpeciesNameActive`/`fadeOut`/`coeffDelay`/`coeff`/
  `faceSpeciesNameDelay` tick-by-tick (`sFactorySelectScreen+0x2A2..0x2A9`,
  cross-verified against the already-RAM-confirmed `monPicAnimating` at
  `+0x2A0`) from both the anchor (idle) and `confirm-decline.json`'s actual
  decline. Confirmed the state machine matches `Select_Task_FadeSpeciesName`
  exactly, including a subtle quirk: `FADESTATE_RUN`'s `coeff === 0` check is
  unconditional, so the pre-onset ramp bounces through six 16-tick
  `FADESTATE_DELAY` pauses (1 RUN tick each) before `coeff` ever leaves 0 -
  103 ticks of active time, matching ROADMAP.md's empirically-observed
  "~104 cumulative cursor-mode ticks" idle-stable budget exactly (was never
  explained before). Cross-checked `BlendPalette` (reusing
  `paletteFade.ts`'s already-verified `blendComponentToBlack`) against a
  direct pixel probe: reproduces ISSUES #11's oracle sample (coeff 5 → RGB
  173,0,0) exactly, plus the full table (0..6 → 255,239,222,206,189,173,156).
  Found a genuine GBA render lag (RAM `coeff` steps at tick T, the rendered
  pixel only changes at T+1) - modeled via a `renderCoeff` field, same shape
  as this codebase's other queued-write lags (ISSUES #5, `paletteFade.ts`).
  New `src/engine/speciesNameFade.ts` (state + advance + activate/
  deactivate + `speciesNameColor`), wired into `core.ts`: deactivates on
  cursor-mode A (popup open), reactivates on B-close/OTHERS/non-confirming
  RENT-DESELECT directly, and on decline with an extra RAM-required 1-tick
  delay (see Notes and ISSUES #12's update). `factoryDraftScreen.ts` now
  renders WIN_SPECIES through a per-tick-blended palette instead of the
  fixed one. 13 new Tier-1 tests (`tests/speciesNameFade.test.ts`): waveform
  boundaries (7-tick cadence, peak-6 flip, 16-tick pause), the blend table,
  the anchor-onset tick, pause/resume (not reset) semantics, and the
  core.ts wiring. Full mechanics + evidence trail in commit `2013459`.
- **Next (supervisor-set, per the original brief):** ISSUES #12/#13 chases
  (both got new evidence this session, see below - still open, out of
  scope for this step), then S5's last piece: the YES-press accept path
  (exit fade → pre-battle room, `docs/prebattle-room-notes.md`). Then S6.
- **Notes:** **why 53/67, not the brief's "exactly 54/67":** with #11's
  constant baseline gone, an **11th** ball-area frame surfaced - **273**
  (3px, `x=44/120/196,y=64`), the same y54-73 ball-region family as ISSUES
  #13's already-documented 10 frames but much smaller and previously
  invisible under the uniform ~129px species-color diff that used to cover
  256-306. Verified this can't be caused by this session's change (`git
  diff` of the speciesNameFade commit touches only `drawText`'s palette
  argument for the WIN_SPECIES window - zero lines touching `ballAnims`,
  `drawSprite`, or `drawConfirmReveal`), so it's a pre-existing #13-pattern
  gap the original characterization simply didn't enumerate, not a
  regression. Documented as new evidence in ISSUES #13 (not fixed - out of
  scope for this step) rather than chased further. Also appended new
  evidence to ISSUES #12: RAM shows `fadeSpeciesNameActive` truly flips one
  tick after this engine's OTHER decline effects, even though they're the
  same synchronous C statement in the source - likely evidence the existing
  decline branch itself fires 1 tick early (a candidate root cause for #12's
  253-255 residual), compensated here only for this module's own activation
  timing, not fixed at the source. All RAM/pixel probing beyond the
  committed `tools/probe/ram-probe.py` script itself (its one-off spec
  JSONs, a scratch pixel-cross-check script) was scratch, deleted before
  finishing. PAPERCUT: building the per-tick RAM-probe harness from scratch
  (symbol/pointer-deref plumbing, mGBA's exit-139/stdout-spew quirks) ate
  a large fraction of this session before any engine code was written -
  now moot for future sessions since `tools/probe/ram-probe.py` is
  committed and reusable (usage note in its own docstring), but worth
  flagging: ~25-30 min lost this session to (re)deriving it.

---

## 38 — S5 decline path landed: YES/NO cursor UP/DOWN + B/A-on-NO decline + 20-tick un-reveal, oracle-pinned; `confirm-decline.json` committed at 13/67 (54 frames individually attributed, none new/unexplained)

- **State:** `npm test` **310/310** (297→310, +13), `npm run build` green. All
  10 pre-existing traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122, confirm-flow 79/95) — zero regressions.
  `confirm-decline.json` **committed** at 13/67 frames byte-exact; every
  non-matching frame individually attributed in the commit message (none
  newly introduced by unrelated code).
- **Did:** Implemented `docs/confirm-flow-notes.md` §2/§3: YES/NO cursor
  UP/DOWN (repeat-gated toggle) and decline (B anywhere or A-on-NO, modeled
  once): same-tick `mons[2].selectedId`->0, `selectingMonsState` 4->3,
  message revert, YES/NO erased; new `confirmReveal.ts` "closing" phase for
  the 20-tick un-reveal, pixel-pinned tick-by-tick (NOT a mirror of the
  open direction; reuses `monPic.ts` `CLOSE_TABLE_B` values; new
  `decliningSpecies` snapshot field). `core.ts` input gate now keys off
  `confirmReveal` presence; re-pick works the tick it clears. Ball 3 leaves
  the rented set same-tick. 15 new Tier-1 tests
  (`tests/confirmDecline.test.ts`). Full mechanics in commit `9a8e96b`.
  **Trace:** `confirm-decline.json` (dense captures 240-306: DOWN dwell,
  decline, un-reveal, resettle, re-pick A) at 13/67 — frames 240-252 (the
  whole cursor-move + decline + early un-reveal) byte-exact; the 54 diff
  frames split into three groups, now filed as **ISSUES #11** (species-name
  breathe, frames 256-306 baseline — decline re-activates it immediately,
  so it is no longer dodgeable and must be modeled), **#12** (un-reveal
  first-ticks residual, 253-255), **#13** (periodic ball-area bumps on 10
  frames, stall-analogue suspect).
- **Next (supervisor-set):** ISSUES #11 (breathe model — required before
  `confirm-decline.json` can meet the trace bar), then #12/#13 chases, then
  S5's last piece: the YES-press accept path (exit fade → pre-battle room,
  `docs/prebattle-room-notes.md`). Then S6 off its banked dossier.
- **Notes:** all RAM/pixel probing (scratch `tools/compare/scratch/*.ts` +
  `bin/oracle`-backed dense traces, direct RGB sampling via Node/pngjs) was
  scratch, deleted before finishing - nothing uncommitted left beyond the
  intended `src/engine/{confirmReveal,core,factoryDraftScreen}.ts` +
  `tests/confirmDecline.test.ts` + `tests/confirmReveal.test.ts` (renamed
  field) + `tools/compare/traces/confirm-decline.json` + docs changes.
  PAPERCUT: pixel-archaeology on a brand-new state transition (no RAM-probe
  harness available this session, oracle screenshots only) ate a large
  fraction of the session's budget - a reusable RAM-probe script (the
  dossier mentions one built ad hoc last session at
  `sFactorySelectScreen+0x2A0` for `monPicAnimating`) would have cut this
  significantly; worth banking as a real tool next time this kind of
  RAM-verified-dossier-to-pixel-exact-implementation gap comes up.

---

## 37 — Supervisor wind-down: session end 2026-07-17 ~21:00

- **State (verified this minute):** `npm test` **297/297**, `npm run build`
  green, working tree clean. Traces (all re-run by the supervisor at
  wind-down): `anchor` 1/1, `draft-cursor` 13/13, `draft-menu` 38/38,
  `draft-menu-slot6` 66/66, `summary-info-onix` 122/122,
  `summary-info-magby` 132/132 — all 0 diff — plus `rent-slot1` 125/139,
  `rent-3picks` **157/190** (new this session), `confirm-flow` **79/95**
  (new this session), every diff frame in all three individually
  attributed to ISSUES #5's settled pattern. ISSUES.md backlog is EMPTY
  of open bugs (only the #5 settled-policy note + mechanism record
  remain). ROADMAP: S5 slices 1-3 complete; S5 remainder = decline path
  (B/NO) + YES-press exit fade into the pre-battle room
  (`docs/prebattle-room-notes.md`).
- **Session summary (supervised, ~16:08-21:00):** 8 worker steps (7 main
  lane + 1 worktree lane), all supervisor-verified. Landed: (1) ISSUES #7
  resolved after a multi-session saga — the minimal-pair probe step proved
  the HAUNTER "contradiction" was a measurement artifact (a 3rd rent exits
  cursor mode same-tick, so the lone count=3 data point never happened),
  the species-keyed stall safe-list {BAYLEEF, HAUNTER} landed RAM-pinned;
  (2) per-slot displayTile lag fix; (3) cursor-redraw fast path with 2+
  rented balls + OPEN_TABLE_B degenerate-window fix, shipping
  `rent-3picks.json`; (4) confirm-flow state machine + reveal render
  (`confirmReveal.ts`), with five further render/timing bugs root-caused
  across ISSUES #8/#9/#10 (incl. a real `font.ts` glyph-width bug and a
  previously-unmodeled 4th stall source), shipping `confirm-flow.json`;
  (5) ISSUES #5's rent-slot1 re-time question closed empirically (8
  candidates all worse — attribution fallback is now policy). ISSUES
  #7/#8/#9/#10 all closed and deleted.
- **Next:** S5 remainder, in order: the decline path (B/NO,
  `docs/confirm-flow-notes.md` §3), then the YES-press exit fade +
  pre-battle room + attendant dialogue (`docs/prebattle-room-notes.md`,
  scene already extracted + composite-verified). Then S6 off its banked
  dossier (`docs/battle-bringup-notes.md`) + battle-1 assets.
- **Notes:** every worker ended at a green commit; no usage-limit events;
  the one worktree-lane step (rent-slot1 re-time sweep) produced a clean
  negative result and its branch was removed unmerged (no commits). The
  user's own `run-supervisor.sh` remote-control edit was committed on
  request (`c52d42a`).

---

## 36 — ISSUES #10 root-caused and fixed (RAM/oracle-pixel-verified); `confirm-flow.json` COMMITTED — S5's confirm-reveal render surface is now trace-pinned; ISSUES #9 and #10 both deleted

- **State:** `npm test` **297/297** (296→297, +1 net in
  `tests/confirmReveal.test.ts`), `npm run build` green. All 9 pre-existing
  traces re-verified at their exact prior counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, rent-slot1
  125/139, rent-3picks 157/190, summary-info-magby 132/132, summary-info-onix
  122/122) — zero regressions. **`confirm-flow.json` committed** at 79/95
  frames matched, the 16 non-matching frames individually attributed below.
- **Did:** Built a scratch oracle trace (`rent-3picks.json`'s 19 segments +
  90-tick idle, dense `captureFrames` 195-230) and sampled RGB directly at
  the 2 flash-bar centers unshared with any other on-screen element (x=44,
  x=196 - x=120 was ruled out, it sits under an unrelated always-present
  element that coincidentally shares `FLASH_BLENDED_COLOR`) plus a clean
  edge probe at x=8-20 (bar1's own left edge vs the wide window's fixed
  `WIDE_WINDOW_LEFT=16` - a value no flash-bar width can ever produce, the
  one unambiguous discriminator between "bar still on screen" and "window
  opened"). Found: the true flash-width sequence
  (`1,1,4,4,8,8,16,16,32,32,64,64` - unchanged, every value and the doubling
  cadence pixel-confirmed exact) starts exactly 1 tick later than modeled -
  the engine's `elapsed=-1` (existing 1-tick OAM-creation lag) needed a
  *second* hidden tick before `FLASH_WIDTHS[0]` applies, matching the shape
  `monPic.ts`'s own `OPEN_TABLE_*` already models (multiple hidden ticks
  before its first `flash(1)`). Cross-verified against the window-growth
  boundary too: with the extra hidden tick, `WINDOW_STEPS`' previously-added
  2nd `{64,65}` degenerate hold (PROGRESS #33) becomes redundant - dropping
  it (12→11 entries) is the exact 1-tick compensation needed to keep the
  total confirm-to-"shown" duration unchanged, so every already-RAM-verified
  downstream absolute tick (ISSUES #9's ball-anim/stall timing) stays where
  it was; row-scanned BG3 wash content at x=120 for frames 222-226 confirmed
  the growth step (60,69) lands exactly 1 tick after the single degenerate
  hold, not 2. Fixed in `confirmReveal.ts` (`FLASH_WIDTHS` now indexed
  `elapsed-1`, hidden below `elapsed<1`; `WINDOW_STEPS` lost its duplicate
  hold; `advanceConfirmReveal`'s flash→window transition threshold bumped by
  1 to match) and re-pinned in `tests/confirmReveal.test.ts` (boundary
  ticks shifted, 1 test added for the new 2nd hidden tick). Rebuilt
  `confirm-flow.json` (same recipe, `captureFrames` 185-279) and ran
  `npm run compare`: frames 210-279 (the entire flash + window + shown/
  YES-NO-dwell portion, where every ISSUES #9/#10 diff lived) are now
  **byte-exact**. The only remaining diffs, frames 189/190/191/192/193/194/
  195/196/197/198/199/201/203/205/207/209 (107/949/2892/512/512/512/512/512/
  448/64/32/16/8/4/3/1px), exactly reproduce ISSUES #5's own pre-documented
  pattern (tapering 189→199 then the halving tail 199/201/203/205/207/209 -
  32/16/8/4/3/1px, verbatim-matching PROGRESS #35's own prior characterization
  of this same window) - the 3rd pick's own popup-close catch-up, unrelated
  to this session's fix (untouched code path). Committed the trace with each
  attributed frame listed in the commit message. Full 9-trace suite +
  `confirm-flow.json` + `npm test` + `npm run build` all green (counts
  above); ISSUES #9 and #10 both deleted (git keeps history).
- **Next:** S5's confirm-reveal render surface is now fully trace-pinned
  modulo ISSUES #5 (policy-settled, no further fix attempts). S5's remainder:
  the decline path (stretch goal, still open), the YES-press exit fade +
  pre-battle room (`docs/prebattle-room-notes.md`), then S6.
- **Notes:** all RAM/pixel probing (`bin/oracle run` + direct RGB sampling
  via a scratch Node script, `/tmp/issue10/`) was scratch, deleted before
  finishing - nothing uncommitted left beyond the intended
  `src/engine/confirmReveal.ts` + `tests/confirmReveal.test.ts` +
  `tools/compare/traces/confirm-flow.json` + docs changes. PAPERCUT: none
  this session.

---

## 35 — ISSUES #9's ball-anim drift root-caused and fixed (2 independent display-lag bugs, both RAM-verified); `confirm-flow.json` STILL not committed — the fix cleared every ball-OBJ diff but exposed a 5th, unrelated gap in confirmReveal's own flash-bar timing, filed as new ISSUES #10

- **State:** `npm test` **296/296** (292→296, +4), `npm run build` green.
  All 9 committed traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby 132/132,
  summary-info-onix 122/122) — zero regressions. `confirm-flow.json` **not
  committed** (see below).
- **Did:** RAM-probed all 3 ball slots simultaneously (`gSprites[]` located
  by known screen position, `animCmdIndex`/`animNum`/`data[0]` every tick)
  across confirm-flow.json's exact button script (rent-3picks.json's 19
  segments + 90-tick idle, 280 ticks) and cross-correlated tick-by-tick
  against `ballAnim.ts`'s internal state for the same replay (scratch Python/
  TS dump scripts, not committed). Found two independent, clean,
  state-derivable causes, both display-only (RNG-critical internal state
  untouched): (1) slot 0's `displayLagTicks=2` (ISSUES #7) was permanent,
  but RAM-proved to apply only during its *first* moving cycle -
  `REST_INTERNAL_OFFSET`'s own extra tick already resyncs slot 0's internal
  `cmdIndex` with RAM the moment it first enters "resting" (RAM-confirmed:
  slot 0's *second* moving cycle matches RAM's own `animCmdIndex` exactly,
  transition for transition, zero drift) - added `BallAnimState.hasRested`,
  slot 0 now uses lag 2 only while `!hasRested`, lag 1 after (matching every
  other slot always). (2) A previously-unmodeled 4th stall source -
  `Select_CreateChosenMonsSprites()`'s own per-frame cost, same shape as the
  already-modeled LEFT/RIGHT/RENT-confirm text-print stalls
  (`ballAnimMultiBall.test.ts`'s root cause) - adds 1 more display-lag tick
  to every currently-active ball, landing near the reveal's
  window-fully-grown hold (RAM-confirmed via all 3 slots' own next
  `cmdIndex`-transition boundary after that point, all consistent with one
  shared, screen-level event, empirically bounded to a 4-tick window given
  this trace's own granularity) - added `confirmReveal.ts`'s
  `isRevealStallActive` predicate, read by `core.ts`'s ball-anim loop.
  Exhaustive cross-check: **0 `displayTile` mismatches across all 3 slots
  for the full 280-tick window** (down from 15 pre-fix). Pinned with 4 new
  Tier-1 tests (`ballAnimDisplayLag.test.ts`). Committed
  (`src/engine/ballAnim.ts`/`confirmReveal.ts`/`core.ts` +
  `tests/ballAnimDisplayLag.test.ts`).
  **Trace rebuild (not committed):** rebuilt `confirm-flow.json` (same
  recipe as before) and ran `npm run compare`: frames 223-279 (the entire
  window-hold + shown/YES-NO-dwell portion, where every prior ball-OBJ diff
  lived) are now **byte-exact**. Frames 189-209 remain diffing but match
  ISSUES #5's own already-accepted pattern exactly (tapering 189→199 then a
  halving tail 199/201/.../209 - 32/16/8/4/3/1px - the 3rd pick's own
  popup-close catch-up). Frames 210-222 (confirmReveal's own `flash` phase)
  still diff, but pixel-sampled and confirmed **not** ISSUES #5 (a clean,
  deterministic, always-same-direction 1-tick-early shift on *every*
  `FLASH_WIDTHS` doubling step, not a chaotic absolute-tick-dependent
  hardware race) - a genuinely new, unrelated gap in the reveal's own
  flash-bar tick bookkeeping, filed as **ISSUES #10** with the full
  pixel-level evidence. Per the brief's stop condition (residual diff not
  attributable to #5), did not commit the trace.
- **Next:** ISSUES #10 (RAM/register-probe `confirmReveal.ts`'s flash-phase
  tick bookkeeping - likely one more hold tick, same family as this file's
  already-fixed `WINDOW_STEPS` gap, or an `elapsed`-offset bug rather than
  the shared table's values), then rebuild and commit `confirm-flow.json`
  clean modulo ISSUES #5's frames 189-209. One unrelated, pre-existing,
  out-of-window gap also surfaced at absolute tick 114 (a `ballAnimStall`/
  display-lag-chain interaction during slot 0's first cycle, outside
  confirm-flow.json's captured range, already baked into rent-3picks.json's
  long-standing 157/190 count) - not chased, no evidence yet of a clean
  rule. After #10: the decline path (stretch goal, still open), then the
  YES-press exit fade + pre-battle room (`docs/prebattle-room-notes.md`),
  S6.
- **Notes:** all RAM probing (position-scanned `gSprites[]`, same recipe as
  ISSUES #6/#7's own) and the trial `confirm-flow.json` were scratch -
  deleted before finishing, nothing uncommitted left in the tree beyond the
  intended `src/engine/ballAnim.ts`/`confirmReveal.ts`/`core.ts` +
  `tests/ballAnimDisplayLag.test.ts` changes and the `ISSUES.md`/
  `PROGRESS.md` docs. PAPERCUT: none beyond the usual RAM-probe setup cost
  (mgba-venv interpreter segfaults at teardown, exit 139, benign, already
  documented).

---

---

## 34 — ISSUES #8 CLOSED: all 3 remaining render gaps root-caused and fixed (gap 1 reattributed to #5, gap 2 was a 1-tick-early phase transition not a per-slot stagger, gap 3 was a highlight/text draw-order bug plus a real font.ts glyph-overrun bug); `confirm-flow.json` still NOT committed — rebuilding it surfaced a 4th, distinct gap, filed as new ISSUES #9

- **State:** `npm test` **292/292** (291→292, +1), `npm run build` green.
  All 9 committed traces re-verified at their exact prior counts (anchor
  1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66,
  example 4/4, rent-slot1 125/139, rent-3picks 157/190, summary-info-magby
  132/132, summary-info-onix 122/122) — zero regressions. `confirm-flow.json`
  **not committed** (see below).
- **Did:** Rebuilt `confirm-flow.json` (rent-3picks.json's exact prefix +
  90-tick idle, dense captures 185-279) and diagnosed each of #8's 3 gaps
  in priority order. **Gap 1 (frames 190/191, up to 2922px):** cross-checked
  against this same trace's own ball1/ball2 closes (frames 38/39, 114/115 -
  plain deselect closes, unrelated to the reveal) and found byte-for-byte
  identical bbox/magnitude/failure shape, matching ISSUES #5's own
  mechanism record verbatim ("up to 3343px/8.71%"). The 3rd pick's popup
  close is the same `CloseMonPic` path every RENT/DESELECT confirm uses
  (`core.ts`'s RENT branch, unconditional) — never a confirmReveal bug, just
  #5's already-accepted WIN0V hardware-cycle race hitting this instance
  harder. The prior session's "ruled out" call compared only against #5's
  steady 512px frames, not its own documented peak transient frames. No
  code change; #8 updated instead of "fixed" for this lead. **Gap 2 (frame
  233, 4058px):** a fresh RAM probe (`gSprites[]` scanned by screen
  position, same recipe as before) confirmed the previously-recorded slot0-
  vs-slots1/2 sprite-creation stagger is real *in RAM* — but diffing
  consecutive oracle PNGs across the transition shows all 3 front sprites'
  actual pixels appear on the exact same rendered frame, one tick later
  than this engine modeled. The RAM-level stagger is fully absorbed by the
  same BuildOamBuffer-before-RunTasks lag documented elsewhere in this
  codebase and never reaches the screen — modeling 3 per-slot flags would
  have been wrong. Fixed by adding one more hold tick to `WINDOW_STEPS`
  (11→12 entries); `monsAndYesNoVisible` stays a single flag.
  **Gap 3 (frame 249, 81px):** two bundled causes. (a) `drawConfirmReveal`
  drew the YES/NO text *before* the cursor-highlight sprite, opposite the
  working RENT/SUMMARY/OTHERS menu's order in the same file — the highlight
  blotted out "YES"'s own letters when the cursor sat on that row; fixed by
  reordering. (b) A real `font.ts` bug, unrelated to confirmReveal: `drawText`
  painted every glyph's full 16px template cell with the background color
  when `colors.bg != 0`, not just the glyph's own proportional advance width
  — invisible everywhere else (always landing on already-matching
  background) except the last character of the one message long enough to
  reach a border ("Are these three POKéMON OK?"'s "?", 2px short of the info
  window's own yellow frame). Cross-checked against
  `reference/pokeemerald/src/text.c:608-609` (glyphWidth clamped to the
  glyph's own width before `GLYPH_COPY`) and this font's own extracted
  bitmap data (every glyph's ink is confined to columns 0..width-1) —
  confirmed the clamp is safe for every character. Fixed by bounding the
  fill loop to `font.widths[code]`. Frame 189 (107px) re-checked last per
  the brief: unchanged, byte-identical to rent-3picks.json's own already-
  #5-attributed frame 189 — not a 4th gap. **New finding (ISSUES #9):**
  with all 3 of #8's gaps fixed, `confirm-flow.json` still isn't clean
  modulo #5 — periodic small diffs (36-180px) appear in individual rented
  balls' own 32x32 OBJ regions (all 3 slots implicated at different times)
  scattered through both the reveal window and the ~90-tick settled dwell.
  Confirmed pre-existing (byte-identical bboxes already present in the
  *pre-fix* compare run, just +30px from the now-fixed font bug) and
  confirmed NOT ISSUES #5 (wrong region/shape) — it's `ballAnim.ts`'s model
  being exercised, for the first time in any committed trace, by a long
  undisturbed 3-ball idle with zero cursor/menu input to ever resync it
  (`ballAnimStall` stays `[]` the whole window). Filed as ISSUES #9 with
  full bbox/frame evidence rather than folded into #8's now-resolved scope.
- **Next:** ISSUES #9 (RAM-probe `gSprites[]`/`ballAnim.ts`'s internal state
  across a dense 3-ball idle window, same recipe as the now-closed #6/#7),
  then rebuild and commit `confirm-flow.json`. After that: the decline path
  (stretch goal, still open), the YES-press exit fade + pre-battle room
  (`docs/prebattle-room-notes.md`), S6.
- **Notes:** all RAM probing (`gSprites[]` position-scan, per the last
  worker's papercut note) and the trial `confirm-flow.json` were scratch —
  deleted before finishing, nothing uncommitted left in the tree beyond the
  intended `src/engine/confirmReveal.ts`/`factoryDraftScreen.ts`/`font.ts` +
  `tests/confirmReveal.test.ts` changes. PAPERCUT: none this session beyond
  the usual RAM-probe setup cost (mgba-venv interpreter segfaults at
  teardown, exit 139, benign — already documented in
  `tools/extract/inspect-anchor.py`'s own docstring, cost a few minutes to
  remember before checking stdout instead of the exit code).

---

## 33 — ISSUES #8 leads 1-2 CLOSED (real BG3 wide-window content + RAM-verified window-hold fix, both committed); lead 3 (`confirm-flow.json`) STOPPED short of commit per the brief's stop condition — diffs shrank by ~4-10x but a 3rd, unrelated-looking gap remains

- **State:** `npm test` **291/291** (290→291, +1 net in
  `tests/confirmReveal.test.ts` — one test split into two to cover the new
  boundary), `npm run build` green. All 9 committed traces re-verified at
  their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, rent-slot1 125/139,
  rent-3picks 157/190, summary-info-magby 132/132, summary-info-onix
  122/122) — zero regressions. `confirm-flow.json` **not committed** (see
  below).
- **Did:** **Part 1 (BG3 ground truth):** RAM/VRAM-dumped BG3's actual
  tilemap (mapBaseIndex 27 → VRAM 0x0600D800, rows 4-11) during the wide
  reveal window. Found (and cross-confirmed against source,
  `Select_InitBgs`, `battle_factory_screen.c:1202-1206`) that the wide
  window's content is literally 3 copies of the *already-extracted* narrow
  8x8 `mon-pic-bg.json` tile block, placed at 3 disjoint tile-column anchors
  (x=16/88/160) with 2 transparent 8px gaps (x80-88, x152-160) — not a
  continuous 64px-period tiling as the prior slice's `bg3ColorTiled`
  approximated (which was also mis-anchored, wrapping relative to the
  narrow window's own x88 origin instead of the wide window's x16). **Part
  2 (tick boundaries):** RAM-verified `confirmReveal.ts`'s phase boundaries
  via direct `REG_DISPCNT`/`REG_WIN0V` reads plus `gSprites[]` located by
  known screen position (robust against `FactorySelectScreen` struct-offset
  guessing, which a first attempt got wrong by 2-6 bytes). Flash phase (13
  ticks incl. 1-tick creation lag) confirmed exact, no change. Window phase:
  found `Select_Task_OpenChosenMonPics`' case0 (WIN0 on) and case1 (`ShowBg
  (3)`) are 2 separate ticks with NO window movement between them, not 1 as
  implemented — real hardware holds the degenerate (64,65) window for 2
  ticks before the 8-tick growth to (32,96) starts. Fixed: `WINDOW_STEPS`
  gained an extra `{64,65}` hold entry (11 entries total, same as before —
  only the content of indices 1/8/9/10 shifted, so the overall
  flash→window→shown tick budget is unchanged). Also independently
  confirmed the BG3 wash stays visible **permanently** through the settled
  YES/NO idle (pixel-sampled several frames), not just during window
  growth — `confirmReveal.ts`'s existing "shown"-phase window field already
  modeled this correctly, no change needed. **Extractor + render (both
  committed):** `extract-factory-screen.ts` now emits a `wideTilemap`
  (26x8) field in `mon-pic-bg.json`; `monPicRender.ts`'s `bg3ColorTiled` is
  replaced with `bg3ColorWide` (reads the real geometry, no more tiling
  approximation). Narrow single-popup path (`bg3Color`, `mon-pic-bg.json`'s
  original `tilemap` field) untouched. **Part 3 (trace, not committed):**
  rebuilt `confirm-flow.json` (rent-3picks.json's exact button prefix +
  idle to frame 279) and ran `npm run compare`: diffs dropped sharply (was
  1000-5000px/2-14% starting ~confirm+34; now mostly 30-950px/0.1-2.5%,
  frames 185-188 clean) but two frames (191: 2922px, 233: 4058px) are still
  in the old magnitude range, and none of the remaining diffs match ISSUES
  #5's own x88-151-confinement signature (different bboxes, solid-wrong-color
  failure shape rather than partial-window jitter) — not attributable to
  that policy. Bboxed and sampled 5 representative frames (189/190/191/233/
  249); found what looks like 3 *different* gaps (a yellow-pixel mismatch
  early in the flash phase, likely in the 3rd pick's own un-exercised
  post-frame-189 `monPic` close rendering; a probable contributor at the
  "shown" transition tied to a newly-found 1-tick sprite-creation stagger
  between chosen-mon slot0 and slots1-2 that this engine's single
  `monsAndYesNoVisible` boolean doesn't model; and an unrelated red-vs-white
  mismatch near the YES/NO box in the steady dwell). Per the brief's stop
  condition, did not commit the trace; ISSUES #8 rewritten with the full
  bbox/sample evidence and a renumbered lead list for whichever of the 3 a
  future session tackles first.
- **Next:** ISSUES #8's 3 remaining leads (frame 190/191's yellow mismatch,
  the slot0 sprite-creation stagger, frame 249's red-vs-white mismatch) —
  tackle independently, since evidence suggests 3 unrelated bugs, not one.
  Once clean, commit `confirm-flow.json` and delete ISSUES #8. After that:
  the decline path (stretch goal, still open), then the YES-press exit fade
  + pre-battle room (`docs/prebattle-room-notes.md`), S6.
- **Notes:** all RAM/VRAM probing was scratch (`/tmp/confirm_probe*.py`,
  deleted before finishing); the trial `confirm-flow.json` was written then
  removed (not committed) once compare showed remaining diffs — nothing
  uncommitted left in the tree beyond the intended engine/extractor/test
  changes. PAPERCUT: ~15 min lost chasing `FactorySelectScreen`'s struct
  offsets by hand (computed `monPics[]`/`monPicAnimating` byte positions
  from the C struct definition directly, got them wrong by 2-6 bytes twice)
  before switching to a struct-offset-independent approach (scan `gSprites[]`
  for sprites at known screen positions instead) — worth reaching for the
  position-scan method first next time a sprite/task needs locating, rather
  than hand-deriving struct byte offsets from source.

---

## 32 — S5 slice 3 (confirm flow): state machine + RNG landed and Tier-1-pinned; render/trace STOPPED short of commit per the brief's own stop condition (wide-window pixel content not verified) — new ISSUES #8

- **State:** `npm test` **290/290** (276→290, +14 in new
  `tests/confirmReveal.test.ts`), `npm run build` green. All 9 committed
  traces re-verified at their exact prior counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, rent-slot1
  125/139, rent-3picks **157/190**, summary-info-magby 132/132,
  summary-info-onix 122/122) — zero regressions. `confirm-flow.json` **not
  committed** (see below).
- **Did:** Implemented the 3rd-RENT-confirm → reveal → settled YES/NO idle
  state machine (`src/engine/confirmReveal.ts`, wired into `core.ts`/
  `factoryDraftScreen.ts`): cursor/menu input permanently locks out once
  `isMonsConfirmed` (`selectingMonsState > FRONTIER_PARTY_SIZE`, same tick as
  every other confirm — no new logic needed there); the 3rd pick's own
  popup close reuses `monPic.ts`'s existing `CLOSE_TABLE_B` unchanged; once
  `monPic.phase === "closed"`, a new `ConfirmRevealState` machine runs the
  border-sprite flash-zoom at 3 positions (x=44/120/196, reusing the exact
  same 1/1/4/4/8/8/16/16/32/32/64/64 affine-anim widths `monPic.ts`'s own
  flash already pins — verified via source read,
  `sSpriteTemplate_Select_MonPicBgAnim` is literally the same sprite
  template/anim table used by both), then a full-width WIN0 window
  (x16-224, vs the single popup's x88-152) growing (64,65)→(32,96), then
  the 3 chosen-mon front sprites (ordered by `selectedId`, not slot) +
  YES/NO box appear together, cursor highlight 1 tick later (same
  window-copy-vs-OAM lag pattern as everywhere else in this screen).
  Exact tick counts (13 flash incl. 1-tick creation lag, 8 window-growth +
  3 hold, cursor +1) were oracle-probed this slice (dense capture diffing,
  scratch, not committed) against `rent-3picks.json`'s own button prefix
  extended with idle — close settles at confirm+~20 (unchanged), reveal
  settles around confirm+45, matching `docs/confirm-flow-notes.md`'s
  tick+43/44/45 pinning closely. **RNG (mission-critical per the brief):
  zero new logic** — the ball-anim loop in `core.ts` was already
  unconditional (runs regardless of cursor/menu/confirmed state) and this
  slice's confirmed-gate deliberately wraps only the cursor/menu *input*
  branch, not the ball-roll loop, so the existing RAM-verified RNG stream
  (`ballAnim.ts`, untouched) continues exactly through the whole window by
  construction — pinned with a Tier-1 regression test asserting the stream
  never merely advances 1/tick (proving ball-roll draws keep firing) and
  stays fully deterministic. 14 new Tier-1 tests in
  `tests/confirmReveal.test.ts` pin: `isMonsConfirmed`'s threshold, input
  lockout, the `confirmReveal` trigger tick, the full phase-boundary
  sequence (flash widths, window steps, shown/cursor timing), pick-order
  species, and the two RNG properties above.
  **Render/trace (not committed):** built a candidate `confirm-flow.json`
  (rent-3picks.json's exact button prefix + idle to ~280) and ran `npm run
  compare` — diverges hard (1000-5000px, 2-14%) starting at the wide
  window's opening (~frame 223) through the settled YES/NO idle, **well
  outside ISSUES #5's x88-151-confinement pattern** — not attributable to
  that policy. Root cause: `mon-pic-bg.json`'s extracted tilemap is only
  8x8 tiles (scoped for the single-popup window before this slice); the
  reveal's 208px window is approximated by tiling that same pattern every
  64px (`monPicRender.ts`'s new `bg3ColorTiled`), which doesn't match the
  real wide-window BG3 content. Per the brief's stop condition, did not
  commit the trace; filed **ISSUES #8** with the specifics. Decline path
  (B/NO) is unimplemented — explicitly a stretch goal per the brief, and
  time ran out before reaching it.
- **Next:** ISSUES #8: RAM/VRAM-dump the wide-window BG3 content directly
  (not tiled-approximated) and independently RAM-verify `confirmReveal.ts`'s
  tick boundaries (byte-level, like `monPic.ts`'s tables), then rebuild
  `confirm-flow.json` and commit once clean. After that: the decline path
  (stretch goal, still open), then the YES-press exit fade + pre-battle room
  (`docs/prebattle-room-notes.md`, explicitly next slice per the brief), S6.
- **Notes:** all oracle probing this session was scratch (`/tmp/confirm_probe*`,
  deleted before finishing) — nothing uncommitted left in the tree beyond
  the intended `src/engine/confirmReveal.ts` + `tests/confirmReveal.test.ts`
  + small exports added to `monPicRender.ts`/`factoryDraftScreen.ts`.
  PAPERCUT: spent a long time re-deriving the reveal's exact source
  mechanics (two chained tasks, shared `MonPicBgAnim` sprite template
  between the single-popup and 3-mon-reveal paths) from
  `battle_factory_screen.c` directly before writing any code — worth doing
  again for future slices (the dossier's own prose was occasionally
  ambiguous about which task owns which window/sprite), but it ate most of
  the session's budget and left too little time to also nail the wide
  window's exact pixel content; a future session should budget oracle
  RAM-probing time for the render layer *before* implementation, not after.

---

## 31 — ISSUES #7 remainder CLOSED: frames 152/153 root-caused and fixed (cursor-redraw catch-up accelerates with 2+ rented balls), plus a second bug found+fixed along the way (frame 92/168: `OPEN_TABLE_B`'s "extra hold" tick was a wrong flash frame, should be a degenerate 1px window); `rent-3picks.json` committed at 157/190, every remaining diff frame individually attributed to ISSUES #5

- **State:** `npm test` **276/276** (273→276, +3), `npm run build` green.
  All 8 previously-committed traces re-verified UNCHANGED at their exact
  prior counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, rent-slot1 **125/139**,
  summary-info-magby 132/132, summary-info-onix 122/122).
  `tools/compare/traces/rent-3picks.json` **committed** at **157/190**.
- **Did:** Rebuilt the exact 3-pick shape from ISSUES #7 (confirms@37/113/
  189, 36-idle+2RIGHT between rents, dense captures 0-189) and reproduced
  the prior session's diff set exactly, confirming it was stable. Tested
  the assigned hypotheses in order: (1) "perpetual species-name breathe" for
  frame 152 - FALSE, ruled out immediately (frames 154-189 are clean, a
  perpetual breathe would keep diffing them). (2) Cross-checked the FIRST
  RIGHT (1 ball rented): its own +1/+2 frames (76/77) are clean, confirming
  the single/zero-ball 3-tick-staggered redraw timing
  (`CursorRedrawState`'s existing doc) is untouched. (3) Overlaid
  oracle-vs-app crops at frames 152/153: **frame 152** - oracle already
  shows "BAYLEEF" (species text) where the app still shows "MAGBY"; **frame
  153** - oracle's cursor arrow is already under slot 2 where the app's is
  still under slot 1. Both are the SAME mechanism: with 2+ balls already
  rented at the move tick, the whole redraw pipeline lands 1 tick sooner -
  species text catches up alongside category (`elapsed>=1`, not staggered
  to `elapsed>=2`) and the arrow settles at `elapsed>=2` instead of
  `elapsed>=3`. **Root-caused as a clean, state-derivable rule** (not a
  chaotic race): confirmed absent with exactly 1 rented ball (frames 76/77
  clean), present with exactly 2 (frames 152/153, both fixed). Fixed by
  adding a `fast: boolean` field to `CursorRedrawState`, set from
  `activeSlotsBeforeAction.length >= 2` at move time (`core.ts`), consulted
  by `advanceCursorRedraw`'s settle threshold and the species-catch-up
  condition (`factoryDraftScreen.ts`). Pinned with 4 new Tier-1 tests
  (`tests/draftScreen.test.ts`) against both the isolated `advanceCursorRedraw`
  transition and a full `tick()` integration (rent slot0, RIGHT with 1
  ball -> `fast:false`; rent slot0+slot1, RIGHT with 2 balls -> `fast:true`).
  **Along the way, found frame 92 was a diff too** (not mentioned in the
  brief's "already decomposed" list - a gap in the prior sessions' own
  accounting, not a new regression) - **byte-identical bbox/pixel-values to
  frame 168** (both `x92-146/y64`, oracle showing ball-art gradient colors,
  app showing a flat `FLASH_BLENDED_COLOR` (194,233,226) fill). RAM-probed
  (`REG_DISPCNT`/`WIN0V` direct reads) around ticks 88-96: real hardware's
  `DISPCNT` WIN0 bit sets at tick 91, its BG3 bit at tick 92 - i.e.
  `Task_OpenMonPic`'s case0/case1 have already fired by frame 92, but the
  window hasn't started growing yet (still the initial `top=64,bottom=65`
  degenerate 1px window from case0). `monPic.ts`'s `OPEN_TABLE_B` modeled
  this "extra hold" tick (idx15, oracle-measured but never explained) as a
  3rd flat `flash(64,true)` frame; it's actually `win(64,65)` - a real,
  blended 1px window, not the flash sprite. Fixed by replacing that table
  entry; pinned by updating `tests/monPic.test.ts`'s variant-B open test to
  assert the window shape at idx15 instead of a 3rd flash tick. This fix
  incidentally cleared frame 168 too (the exact same table index, hit again
  by the 3rd ball's own open) - **frames 37-57/113-133 (rent-close jitter,
  unaffected, byte-identical to before), 92/152/153/168 (all now CLEAN)**.
  Only **169/170/189** remain, matching the brief's own pre-classification
  ("#5-attributable") exactly: `169` (x88-151/y56-72, 512px) and `170`
  (x88-151/y52-76, 512px) are the same magnitude/location as every other
  accepted ISSUES #5 window-growth frame (e.g. rent1's own 117/118/119/120,
  each 512px in the same x88-151 window); `189` (x93-110/y55-68, 107px)
  matches the brief's own predicted bbox verbatim. Committed
  `rent-3picks.json` (0-189 dense) with all 33 remaining diff frames
  individually attributed in the commit message.
- **Next:** confirm-flow implementation (`docs/confirm-flow-notes.md`),
  exit sequence (`docs/prebattle-room-notes.md`), and S6 remain queued
  behind S5's completion per entry 26 - S5's own acceptance criterion (a
  committed 3-pick trace) is now met modulo the ISSUES #5 window-jitter gap
  (root-caused as an unfixable-at-this-engine's-level hardware cycle race,
  policy settled).
- **Notes:** all RAM probing was scratch (`/tmp/probe_regs.py`,
  `/tmp/probe_ballstate.ts`, `/tmp/probe_monpic.ts`, deleted before
  finishing; trace JSON under `/tmp`) - nothing uncommitted left in the
  tree beyond the final `tools/compare/traces/rent-3picks.json`. Also
  deduplicated an accidental exact-duplicate "## 28" entry in this file
  during the archive rotation (both copies were byte-identical; kept one).
  PAPERCUT: manually decoding PNG filters in pure Python to bbox a diff
  cost ~10 min before switching to PIL (already a dev dependency via the
  system Python, not this project's own toolchain) - worth reaching for
  PIL/Pillow first next time instead of hand-rolling a PNG decoder for
  quick bbox/pixel-dump scripts.

---

## 30 — ISSUES #7 remainder: RAM-pinned + fixed the second-ball display-tile lag (Parts 1-2 landed, committed); Part 3 (`rent-3picks.json`) built a clean candidate but STOPPED short of committing per the brief's own stop condition — more diff frames than expected, though all classify as pre-existing/benign on inspection

- **State:** `npm test` **273/273** (270→273, +3 in
  `tests/ballAnimDisplayLag.test.ts`), `npm run build` green, working tree
  clean except this docs commit. `rent-slot1.json` re-verified unchanged at
  **125/139**. `rent-3picks.json` **still not committed** (see below - not
  blocked by a known bug, just short of a final verification pass).
- **Did:** **Part 1 (RAM probe, committed with Part 2):** wrote a scratch
  `EmeraldOracle` probe (direct `struct Sprite` reads: `animCmdIndex` @0x2B,
  OAM `tileNum` = attr2 bits0-9 @0x04, cross-derived `sFactorySelectScreen`
  base via a pointer DEREF that a first attempt missed) dumping both balls'
  `animCmdIndex` and raw-framebuffer diffs tick-by-tick across a long dwell
  after 2 plain rents (~80 cadence transitions total). Finding: real
  hardware's own display lag from *its own* `animCmdIndex` is a uniform 1
  tick for **every** ball, always (both balls, ~40 transitions each, one
  exception at the full-cycle-restart/reroll boundary which needs+1 more -
  not exercised before tick 189, so out of scope here). Cross-checked
  against the engine's own modeled `cmdIndex` via a throwaway vitest dump:
  slot 0's internal `cmdIndex` runs exactly 1 tick EARLY vs RAM (engine hits
  cmdIndex9 at tick104 in a 2-ball dwell; RAM hits it at tick105) - a
  pre-existing quirk `REST_INTERNAL_OFFSET`'s own comment already flagged as
  present-but-harmless for single-ball; slot 1's matches RAM exactly, no
  offset. This fully explains the old "flat 2" model: it was only ever
  correct for slot 0's own miscalibration, not a real 2-tick hardware lag.
  **Part 2 (committed, `2a29750`):** `advanceBallAnim` now takes a
  `displayLagTicks` param (2 for slot0, 1 for every other slot, wired from
  `core.ts`'s ball-index loop) - purely additive to the shift-register
  logic, `advanceBallAnimCore` (cmdIndex/timer/pendingRest/RNG) untouched,
  so every pre-existing RNG-pinned test passed unmodified. Pinned 3 new
  Tier-1 tests against the RAM checkpoints. Confirmed via `npm run compare`
  against a scratch 2-rent trace that frames 180/188 (the originally-
  reported 176px ball-OBJ-position diffs) are now **0 diff**.
  **Part 3 (not committed):** rebuilt the exact PROGRESS-archive #21 3-pick
  shape (confirms@37/113/189, dense captures 0-189) and ran `npm run
  compare`. Frames 180/188 confirmed clean. But found MORE diff frames than
  the brief's stated expectation ("168-170 and 189 only"): frames 37-57 and
  113-133 (bbox/pixel-count byte-identical to `rent-slot1.json`'s own
  already-committed 14-diff ISSUES #5 pattern, recurring once per rent) and
  frames 152-153 (new location, x196-236/y20-28 then x59-109/y80-92, right
  after the 2nd RIGHT move - the first plausibly matches ROADMAP's
  already-documented "species-name palette breathe, not yet modeled" gap,
  the second unidentified). None are at a ball's OBJ position in a way
  that isn't already independently accepted. Per the brief's own stop
  condition ("any other diff -> STOP, do not commit, document"), did not
  commit the trace despite this analysis suggesting it's likely shippable -
  full breakdown in ISSUES #7.
- **Next:** a future session should (1) identify frame 153's bbox
  (x59-109/y80-92) via RAM/overlay, (2) re-run the exact compare above to
  reconfirm the diff set is stable, (3) if clean, commit
  `rent-3picks.json` with per-frame attributions and delete ISSUES #7.
  Confirm-flow implementation (`docs/confirm-flow-notes.md`), exit sequence
  (`docs/prebattle-room-notes.md`), and S6 remain queued behind this per
  entry 26.
- **Notes:** all oracle probing this session was scratch (Python scripts +
  a throwaway vitest test file under `tests/_scratch_displaylag.test.ts`,
  deleted before finishing; trace JSONs under `/tmp`) - nothing uncommitted
  left in the tree. PAPERCUT: ~10 min lost to a pointer-dereference bug in
  my own probe script (`sFactorySelectScreen` is `struct X *`, not `struct
  X` - reading fields directly off its own address instead of dereferencing
  first silently returned plausible-looking-but-wrong zeros for slots 1-4);
  `inspect-anchor.py`'s existing `oracle.read_u32(SFACTORY_SELECT_SCREEN_ADDR)`
  pattern already does this correctly and is worth grep'ing for before
  hand-deriving struct offsets fresh next time.

---

## 29 — ISSUES #7 Part 1 landed (species-keyed LEFT/RIGHT stall, sanctioned per entries 26-28): fixed, tested, committed; Part 2 (`rent-3picks.json`) STOPPED per the brief's own explicit stop condition — a SECOND, narrower ball-render bug (unrelated to the stall rule) surfaced once the trace was actually built

- **State:** `npm test` **270/270** (264→270, +6 in
  `tests/ballAnimSpeciesStall.test.ts`), `npm run build` green, working tree
  clean. `rent-slot1.json` re-verified still **125/139** (no regression).
  `rent-3picks.json` **still not built** (blocked by a newly-found, different
  bug - see below and ISSUES #7).
- **Did:** **Part 1 (committed, `e3f712e`):** implemented the corrected
  2-species safe-list in `ballAnimStall`'s LEFT/RIGHT branch
  (`cursorMoveStallsBalls`, `factoryDraftScreen.ts`) - stalls every active
  ball only when the entering slot's species is outside `{BAYLEEF,
  HAUNTER}`, keyed by the engine's existing draft-pool species string (not
  slot index). Pinned with 6 new Tier-1 tests against ISSUES #7's
  RAM-derived checkpoints (Probe A: action ticks 79/121/163/205 reproduced,
  decisive HAUNTER-no-stall window 203→207 not 208; Probe C: count=2
  HAUNTER-no-stall windows 276→284/275→307 not 285/308) - every expected
  value hand-derived from documented RAM facts via `MOVING_CMDS`' fixed
  durations, then cross-checked against the implementation before
  committing to the numbers (not the other way around). No existing test
  had pinned the old always-stall behavior, so nothing needed updating.
  **Part 2 (not committed):** rebuilt PROGRESS-archive #21's exact 3-pick
  trace (confirms at press-ticks 37/113/189) and ran `npm run compare`
  (scratch, captures 0-245). First checked the brief's required amendment
  (probe for the first YES/NO-hand-off pixel after tick 189): frame 189
  itself is still clean/#5-attributable, but frames ≥190 diverge
  immediately and explode fast (949px→13271px by 234+, spreading to
  x239/y32-156) - confirms the trace must end at/before 189. Then found
  frames 180 and 188 show a 176px diff at **x56-76/y54-73, outside the
  x88-151 mon-pic window, at ball-index-1's (MAGBY) own OBJ position** -
  the brief's explicit stop condition. Root-caused enough to rule out the
  stall rule as the cause (byte-identical diff before/after Part 1's fix,
  confirmed via `git worktree` against the pre-fix commit; ball 1's
  internal `cmdIndex` timing independently matches pure zero-stall
  arithmetic exactly) and pinned it precisely: the engine's `displayTile`
  lags the oracle by 1 tick at this transition, not the documented-as-2-tick
  constant. Per the brief, stopped without guessing a fix - did not commit
  `rent-3picks.json`, wrote the full finding into ISSUES #7 (trimmed to this
  remainder, historical species-stall investigation trail removed - git
  history has it if ever needed) instead of re-litigating the now-fixed
  stall rule.
- **Next:** a future session should RAM-probe the display-lag mechanism for
  a second active ball directly - the bug reproduces with just 2 plain
  rents and a long-enough dwell, no cursor moves needed (ball 1's own
  cmdIndex8→9→10 transition around tick 179-188). Once that's fixed,
  `rent-3picks.json` should build cleanly against the same trace shape
  already validated here. Confirm-flow implementation
  (`docs/confirm-flow-notes.md`), exit sequence
  (`docs/prebattle-room-notes.md`), and S6 remain queued behind this per
  entry 26.
- **Notes:** all oracle probing this session was scratch (trace JSON files
  under `/tmp`, a throwaway `git worktree` for the before/after comparison,
  a throwaway TS script overlaying candidate ball tiles onto the oracle's
  own PNG per this issue's established zero-residual-diff method) - nothing
  uncommitted left in the tree, worktree removed. PAPERCUT: none beyond the
  usual oracle round-trip overhead; the `git worktree add HEAD~1` +
  symlink-node_modules/reference trick to run `npm run compare` against a
  prior commit without disturbing the working tree is worth remembering for
  future before/after regression checks.

## 28 — ISSUES #7 minimal-pair probes (worker, capped, probe-only): the fifth update's "contradiction" was ITSELF a measurement artifact — P_STALL (HAUNTER, count3/RIGHT/origin3) is RAM-DISPROVEN as a valid data point (count=3 is structurally unreachable via LEFT/RIGHT — completing the 3rd rent exits cursor mode on the same tick); species-only table RESURRECTED with a corrected 2-species safe-list {BAYLEEF, HAUNTER}

- **State:** unchanged from entry 27 — `npm test` **264/264**, `npm run
  build` green, working tree clean before this docs-only commit. No
  `src/`/`tests/` changes this session (probe-only step, per the brief).
  `rent-3picks.json` still not built (remains blocked, see Next).
- **Did:** Followed the supervisor's minimal-pair ruling exactly (PROGRESS
  entry 27). **PROBE A** (HAUNTER, count1/RIGHT/origin3 — differs from
  P_STALL in count only): clean, decisive **NO STALL** (window 203→207,
  gap 4, unambiguous). **PROBE B** (mandated: count3/LEFT/origin5) **could
  not be constructed** — after a 3rd rent, `cursorPos` froze permanently
  and `selectingMonsState` read 4 (not 3); a screenshot confirmed the
  screen had already handed off to the "Are these three POKéMON OK?" YES/NO
  screen. Reference source
  (`battle_factory_screen.c:1965-1966`,`Select_OptionRentDeselect`) confirms
  this is structural: `selectingMonsState` starts at 1, so a 3rd successful
  rent always makes it 4, and `4 > FRONTIER_PARTY_SIZE(3)` ends cursor mode
  on that same tick — no tick exists where 3 balls are active and LEFT/RIGHT
  still works. An **exact tick-for-tick re-replication of the fourth
  worker update's own original R5 script** (rent0→R1→R2→rent2→R3→L1→R4→
  rent3→R5) reproduces the identical freeze: R5's RIGHT never moves
  `cursorPos` off 3. **This proves P_STALL was never a genuine cursor-move
  observation** — it was measured against an already-exited screen.
  Discarding it, HAUNTER now shows NO STALL at every legitimately-tested
  condition (count1/RIGHT/origin3 this session, count1/LEFT/origin5 fifth
  update, count2/RIGHT/origin3 via a bonus Probe C this session) — a second
  "safe" species alongside BAYLEEF, not a contradiction. Full 12-row keyed
  table (every valid LEFT/RIGHT point across all sessions) fits **one
  variable with zero exceptions**: entering species ∈ {BAYLEEF, HAUNTER} →
  no stall; ∈ {MAGBY, BUTTERFREE, ONIX, QUILAVA} → stall. Full evidence:
  ISSUES #7 ("sixth worker update").
- **Next:** get sign-off then (1) implement the corrected 2-species
  safe-list in `ballAnimStall`'s LEFT/RIGHT branch, pin with a Tier-1 test
  against this session's RAM checkpoints; (2) **before building
  `rent-3picks.json`**, re-check its spec (PROGRESS-archive #21) against
  this session's finding that a post-3rd-rent cursor move is impossible in
  the real game — any dense-capture window assuming otherwise needs
  rethinking; (3) confirm-flow implementation, exit sequence, S6 remain
  queued behind this per entry 26.
- **Notes:** all probing was scratch Python under `/tmp/issues7probe/` (not
  committed) — no `src/` edits were ever at risk. Method refinement this
  session: `data[0]` is the real hardware's REST COUNTDOWN (set to 32 at a
  SUCCESS roll, held through the full 128-tick cycle, then decremented
  32→0) — a *repeated* `data[0]` value across two consecutive ticks is a
  more direct stall signature than inferring one from `animCmdIndex` gaps
  alone, and was used to resolve an otherwise-ambiguous BUTTERFREE read via
  cross-calibration against an independent, undisputed RENT-confirm stall
  in the same run. PAPERCUT: none beyond the usual oracle round-trip
  overhead; worth noting for future sessions that `selectingMonsState`
  starting at 1 (not 0) is a real gotcha for anyone scripting a 3rd rent
  and expecting cursor mode to still be live afterward.
- **Supervisor addendum (same day, ~16:45):** the #7 finding is
  independently verified — reference source
  (`battle_factory_screen.c:1298` init-to-1, `:1965-1966` same-call
  handoff) confirms the structural impossibility; the R5-replication
  screenshot shows the YES/NO screen on-screen; probe scripts/logs under
  `/tmp/issues7probe/` inspected. In parallel, a worktree-lane worker
  attempted ISSUES #5's sanctioned `rent-slot1.json` clean-window re-time:
  8 candidates (confirm press-ticks 29-35 + DOWN-tick variations) were ALL
  worse than the committed baseline (15-27 diffs vs 14) — re-time is
  infeasible near the current timing; #5's rent-slot1 note resolves to the
  attribution fallback (125/139 ships permanently, see ISSUES #5; that
  lane's branch had no commits and was removed). Next step (worker
  launching now): implement the 2-species safe-list in `ballAnimStall` +
  Tier-1 pins + `rent-3picks.json` per entry 26 decision 2 — the entry-27
  ruling's precondition (factor isolated) is met, so no fresh user
  sign-off is required.

---

## 27 — S5 slice (worker, capped, LAST of today): STOPPED before implementing — the supervisor-sanctioned ISSUES #7 species-only stall table was RAM-DISPROVEN by a clean counterexample (HAUNTER stalls at one count/direction/origin, does not at another); no code change made, per the brief's own explicit stop condition

- **State:** unchanged from entry 26 — `npm test` **264/264**, `npm run
  build` green, working tree clean before this docs-only commit. No
  `src/`/`tests/` changes this session. All 8 traces (incl. `rent-slot1.json`
  125/139) untouched; `rent-3picks.json` still not built (remains blocked).
- **Did:** Followed the brief exactly through step 1 (probe before
  implementing). RAM-probed the two previously-unprobed species (ONIX,
  QUILAVA - both now confirmed **stall**, first-time data) and re-validated
  BAYLEEF (4th confirmation, still **no stall**) and HAUNTER at a new count/
  direction/origin than previously probed. Method: `EmeraldOracle` +
  corrected `struct Sprite` offsets (same as ISSUES #7's third/fourth
  updates), `ballSpriteId` read directly from
  `sFactorySelectScreen->mons[i].ballSpriteId` rather than assumed, two
  scripts each with exactly **one** active ball throughout (removes all
  multi-ball composition ambiguity), cadence-transition gaps cross-checked
  against 6-8 clean neighboring transitions per run before trusting any
  single reading. **Result: HAUNTER stalls at (count3, RIGHT, origin slot3 -
  prior data) but does NOT stall at (count1, LEFT, origin slot5 - this
  session's fresh probe)** - same entering species, opposite outcome,
  directly falsifying "the entering slot's species alone determines the
  stall." Per the SANCTIONED APPROACH's own explicit instruction ("if ANY
  probe contradicts the species-only rule, STOP, write the contradiction
  into ISSUES #7, do not implement"), stopped immediately - no
  `ballAnimStall` code change, no per-species table, no Tier-1 test, no
  `rent-3picks.json` work attempted. Full evidence table and reasoning:
  ISSUES #7 ("fifth worker update").
- **Next:** ISSUES #7 needs a fresh policy decision before more session time
  goes into it - this is now the *second* consecutive sanctioned/"confirmed"
  rule for this issue that broke on the next data point (species-only
  table, then this). Options queued in ISSUES #7's "Next session" note:
  (a) one more round of targeted single-ball isolated probes (cheap, ~15-20
  min each, this session's method) to find the actual missing variable
  (direction/origin/count in combination with species); (b) revisit the
  pre-simplification "fourth worker update" render-cost-race theory
  (`GetStringRightAlignXOffset` pixel-width timing); (c) accept it as an
  ISSUES #5-class permanent gap (root-caused, not fixable at this engine's
  tick granularity) and ship without `rent-3picks.json`. Whoever holds
  entry 26's user-delegated authority for #7 should pick before the next
  worker spends more budget here.
- **Supervisor ruling for the next session (user-delegated authority,
  2026-07-17 ~15:50 — binding unless the user overrides):** take entry
  27's option (a), with a required method change: **minimal-pair probe
  design only** — every new probe must differ from a known data point in
  exactly ONE variable (species, direction, origin slot, active-ball
  count, ball phase). Start from HAUNTER's contradiction pair
  (count3/RIGHT/origin3 = stall vs count1/LEFT/origin5 = no-stall):
  probe (count1, RIGHT, origin3-equivalent), then (count3, LEFT), etc.,
  until the second variable is isolated; then key the empirical stall
  table on the surviving factor set and proceed per entry 26's decision
  2 (implementation + Tier-1 pins + rent-3picks.json). Both prior rule
  collapses came from multi-variable probe jumps, not from the empirical
  approach. If the factor set still resists after ~5-6 minimal pairs,
  fall back to entry 27's option (b) (probe the render-cost determinant
  directly in RAM) before any thought of (c) — (c) would leave the RNG
  stream unpredictable after any cursor-move-with-rented-ball, which
  effectively blocks S5's exit trace and is a mission-level concession
  the user should make explicitly, not a default.
- **Notes:** all probing was scratch Python/TS under `/tmp` (not committed,
  per instructions) - no `src/` edits were ever at risk. This is the last
  worker of today's session; state is resume-ready via this entry + ISSUES
  #7's "fifth worker update". PAPERCUT: none beyond the usual oracle
  round-trip overhead; worth noting for future RAM-probe sessions that a
  pure-`gRngValue`-only comparison (no sprite-field reads) is a trap for
  this specific kind of test - a 1-tick stall only shows up in `gRngValue`
  at the exact tick a decision-point (`Random()`) draw lands on, not in a
  cumulative/far-future sample, so sparse `gRngValue`-only sampling silently
  under-detects stalls; the sprite-cadence method (direct `animCmdIndex`
  transition gaps) used by prior sessions is the reliable one and should be
  the default, not a fallback.

---


## 26 — Supervisor wind-down: session end 2026-07-17 ~15:20

- **State (verified this minute):** `npm test` **264/264**, `npm run build`
  green, working tree clean. Traces: `anchor` 1/1, `draft-cursor` 13/13,
  `draft-menu` 38/38, `draft-menu-slot6` 66/66, `summary-info-onix`
  122/122, `summary-info-magby` 132/132 — all 0 diff — and `rent-slot1`
  125/139 (gap 100% attributed to ISSUES #5). ROADMAP: S1-S3 [x], S4 [~]
  (slice 1 closed, remainder deferred behind S5 by supervisor re-scope),
  S5 [~], S6-S9 [ ] with heavy groundwork banked.
- **Session summary (supervised, ~10:54-15:20):** 9 main-lane worker steps
  + 7 worktree-lane steps, all verified. Landed: MAGBY summary trace (S4
  "≥2 slots" met); RENT/DESELECT + single-ball rock/idle RNG-exact
  (`rent-slot1.json`); ISSUES #5 root-caused (WIN0V cycle jitter,
  unmodelable at tick level — POLICY QUESTION TO USER, still open);
  multi-ball stall model (ISSUES #6 fixed: text-print stall) + two latent
  ballAnim timing bugs; post-confirm cursor-input gate fixed
  (`isCursorInputReady`); species-name-breathe rule pinned (no model
  needed under 105 cursor-mode ticks). Groundwork merged: moves/exp/items
  data, pre-battle-room scene (composite-verified 0/38400px), S6
  battle-bringup dossier + battle-1 assets + all 12 transition variants,
  S5 confirm-flow dossier, S7 turn-1 ground truth (RAM-truthed damage/
  order/HP-drain). Two PAPERCUTS entries added.
- **DECISIONS (user delegated to supervisor, 2026-07-17 ~15:10):**
  (1) ISSUES #5 policy: 0-diff stays the bar; re-time committed traces
  into jitter-clean windows where feasible; otherwise ship with every
  non-matching frame individually attributed to #5's documented pattern.
  #5 is now a settled policy note, not an open bug. (2) ISSUES #7:
  continue as DATA-DRIVEN empirical modeling (per-species stall table,
  context-validated via RAM probes) — the "no per-species lookup" guard
  is overruled because this race perturbs the RNG stream (unlike #5's
  pixel-only jitter) and must be exact for the S5-exit→transition path;
  an oracle-derived table has the same epistemic status as the engine's
  other pinned empirical constants. Supervisor's own width check
  sharpened this: ALL uppercase glyphs are 6px in font-normal, so
  name/category pixel-width and char-count theories are ALL dead
  (BAYLEEF total 11 chars sits between stalling HAUNTER 10 and MAGBY
  14); and every "count-dependent" data point is species-confounded
  (each non-stalling move entered BAYLEEF) — species alone may be the
  entire cursor-move rule.
- **Next:** worker in flight implementing the per-species stall table +
  rent-3picks.json; then confirm-flow implementation
  (docs/confirm-flow-notes.md), exit sequence
  (docs/prebattle-room-notes.md), S6 off its dossier + assets.
- **Notes:** every worker ended at a green commit; no usage-limit events;
  parallel worktree lane ran 6 extraction/scout steps concurrently with
  zero merge conflicts.

---
## 25 — S5 slice 2 (worker, capped, LAST of this supervised session): STOPPED before implementing a fix — ISSUES #7's "count-dependent" AND "first-event-only" stall hypotheses BOTH RAM-DISPROVEN this session with clean counterexamples; best remaining evidence points to a species-render-cost-dependent race (same class as ISSUES #5), not a clean state rule

- **State:** unchanged from entry 24 — `npm test` **264/264**, `npm run
  build` green, all traces untouched. **No `src/`/`tests/` changes this
  session, no commits to code** (docs-only commit for this entry + ISSUES
  update) — per the brief's own fallback ("if the rule STILL resists,
  commit nothing half-wired, update ISSUES #7, stop").
- **Did:** Ran the discriminating RAM probes entry 24 asked for (corrected
  `struct Sprite` offsets, cadence-transition method - `MOVING_CMDS`'
  4/8/32-tick durations are RNG-independent so an observed `duration+1` gap
  unambiguously means one stall landed there): a fresh 4-rent/6-cursor-move
  trace including a **consecutive** RIGHT at the same 1-active-ball count
  (no rent in between), plus an independent re-derivation of entry 24's own
  original repro shape to cross-check its RIGHT#2 finding rather than trust
  it at face value. Result: the consecutive-RIGHT data point disproves
  "count==1 always stalls" (2nd RIGHT at count=1, no rent between, does
  NOT stall); three later cursor moves (3rd/5th/6th of the session) DO
  stall, disproving "only the first-ever cursor move stalls." What fits all
  8 data points with zero exceptions instead: whether the cursor's
  **entering** slot's species is BAYLEEF (never stalls, 3/3 independent
  occurrences, both directions, two different origin slots) vs
  MAGBY/BUTTERFREE/HAUNTER (always stalls, 5/5). Plain string length
  doesn't explain it (BAYLEEF/HAUNTER are both 7 chars, opposite outcomes) -
  `Select_PrintMonSpecies` computes a variable-width-font pixel offset
  (`GetStringRightAlignXOffset`), a plausible render-cost-dependent hardware
  race, the same *class* of bug as ISSUES #5's WIN0V jitter (also
  root-caused, also not fixed at this engine's tick granularity) rather
  than a game-state formula. Full evidence table and reasoning: ISSUES #7
  ("fourth worker update").
- **Next:** per ISSUES #7's own "Status": determine whether this is
  actually testable further (RAM-read the render-cost-determining register/
  variable directly rather than inferring it from stall outcomes) or
  whether it's unmodelable like ISSUES #5 and should be closed out the same
  way (root-caused, documented, not fixed). Get sign-off before spending
  more session budget here - two consecutive sessions have now each found
  the prior session's "confirmed" rule wrong on closer data, so this issue
  needs either new investigative tooling or an explicit decision to accept
  it as an ISSUES #5-style permanent gap. Do NOT hardcode a per-species
  lookup as a substitute fix. `rent-3picks.json` remains blocked.
- **Notes:** All probing was scratch Python under `/tmp` (mGBA/
  `EmeraldOracle` recipe, not committed) - no `src/` edits were at risk of
  being lost. This is the last worker of this supervised session; state is
  resume-ready via this entry + ISSUES #7's "fourth worker update."
  PAPERCUT: none beyond the usual oracle round-trip overhead.

---

## 24 — S5 slice 2 (worker, capped): STOPPED before implementing a fix — ISSUES #7's tick-204 mystery fully root-caused (RAM-DISPROVEN: `ballAnimStall`'s LEFT/RIGHT branch over-stalls once 2+ balls are active), but the exact replacement rule needs one more RAM data point before it's safe to code

- **State:** unchanged from entry 23 — `npm test` **264/264**, `npm run
  build` green, all traces untouched. **No `src/`/`tests/` changes this
  session, no commits** — per the brief's own fallback ("if the rule
  resists within the cap, commit nothing half-wired, update ISSUES #7,
  stop"), since the corrected rule isn't yet pinned down to more than 2
  data points (see ISSUES #7).
- **Did:** Found a bug in every prior session's own RAM-probe methodology:
  the `struct Sprite` offsets cited for `animNum`/`animCmdIndex`/`data[0]`
  (this entry's own history, `ISSUES.md` #7) don't match
  `reference/pokeemerald/include/sprite.h:194-242` — `animNum`/
  `animCmdIndex` were swapped and `data[0]` was read as a `u8` instead of a
  2-byte `s16`. Rebuilt the RAM probe (`EmeraldOracle`, corrected offsets)
  against entry 21/23's own exact original repro (confirms at press-ticks
  37/113/189) and cross-referenced every `MOVING_CMDS`-cadence transition
  against its zero-stall-expected tick, per ball, per trigger. Result: the
  tick-204 divergence is fully explained — ball 0's 2nd roll (a FAILURE,
  same shape as the single-ball baseline's own frame-201 FAILURE,
  `tests/ballAnim.test.ts`) lands at exactly 201 + (3 real stalls) = 204,
  bit-exact with RAM. But only **3** of ball 0's 4 previously-assumed
  triggers actually cost it a tick: `RIGHT`#1 (1 ball active) and both
  RENT-confirms (#2, #3) do; `RIGHT`#2 — pressed once 2 balls (0 and 1) are
  already active — costs **neither** ball a tick, independently confirmed
  via `cursorPos` genuinely moving (not gate-dropped). The current code
  still stalls both on `RIGHT`#2 (a spurious 4th stall), landing its
  predicted roll one tick late — exactly matching entry 23's own
  observation. This directly overturns entry 23's "RAM-CONFIRMED CORRECT"
  verdict for the 2-simultaneous-stall LEFT/RIGHT case; that verdict was
  built on the same wrong offsets and/or too narrow a sample window to
  reach the ~30-tick-later transition where the missing stall becomes
  visible.
- **Next:** one more RAM data point before coding a fix (only 2 RIGHT
  presses were probed, at 1-active and 2-active — not enough to distinguish
  "stalls only when exactly 1 ball active" from "only the first-ever RIGHT
  ever costs a tick" from a directional LEFT/RIGHT asymmetry): probe a 3rd
  RIGHT press (3 balls active) and/or a LEFT press with 2 active. Then a
  likely-small `core.ts` change narrowing the LEFT/RIGHT branch's
  `ballAnimStall` assignment, re-verify `ballAnim.test.ts`/
  `ballAnimMultiBall.test.ts` stay green unchanged (confirmed this session
  they don't already cover — and so can't already contradict — a
  RIGHT/LEFT-with-2+-active-balls scenario), pin a new Tier-1 test
  (including the tick-204 checkpoint), RAM-verify pixels at frames
  124/155/163, then build `rent-3picks.json` per the brief.
- **Notes:** Full evidence table (per-trigger, per-ball shift/no-shift) is
  in ISSUES #7. All probing was scratch Python under `/tmp` (mGBA/
  `EmeraldOracle` recipe, not committed, per instructions) — no `src/`
  edits were at risk of being lost. PAPERCUT: none beyond the usual
  oracle-round-trip overhead; the offset-mislabeling bug cost real time
  this session (~15 min chasing a nonsensical decrementing "animCmdIndex"
  before checking `sprite.h` directly instead of trusting inherited
  offsets) — worth flagging for future RAM-probe work: verify struct
  offsets against the actual header before reusing offsets cited in prior
  session notes.

---

## 23 — S5 slice 2 (worker, capped): Priority 1 (post-confirm cursor-input gate) FIXED and Tier-1-pinned; Priority 2's two/three-simultaneous-stall question RAM-CONFIRMED CORRECT with no fix needed, but a narrower, different bug found and left open — ISSUES #7 updated, not deleted

- **State:** `npm test` **264/264** (261→264: +2 `cursorInputGate.test.ts`,
  +1 `monPic.test.ts`), `npm run build` green. All 7 existing traces
  untouched (`rent-slot1.json` still 125/139). One commit landed
  (`isCursorInputReady` fix + tests); no `ballAnimStall` code change this
  session (root cause of the narrower remaining bug not yet found - see
  ISSUES #7).
- **Did (Priority 1 - DONE):** Found the exact gate:
  `Select_Task_HandleChooseMons` (`battle_factory_screen.c:1671-1673`)
  early-returns - dropping LEFT/RIGHT/A-open alike, not just cursor moves -
  for as long as `sFactorySelectScreen->monPicAnimating` is TRUE (set the
  instant `CloseMonPic` fires, cleared only once the flash-shrink sprite's
  affine anim ends). RAM-verified the exact tick boundary (direct
  `monPicAnimating` reads, empirically-found struct offset 672): replaying
  `RENT_SLOT1` (confirm press-tick 37), a `RIGHT` at tick 56 is dropped,
  tick 57 (where `monPicAnimating` first reads FALSE) is accepted - exactly
  matches `MonPicState.phase` flipping `"closing"`→`"closed"`. Added
  `isCursorInputReady` (`monPic.ts`, mirrors `isMonPicInputReady`'s open-side
  gate) and gated `core.ts`'s cursor-mode branch on it. Pinned with
  `tests/cursorInputGate.test.ts` + a `monPic.test.ts` unit case.
- **Did (Priority 2 - partially resolved, real remaining bug found):** Built
  a fresh 3-ball RAM probe (`≥40`-tick dwell before every cursor move, per
  the brief) covering rent slot0 → `RIGHT` → rent slot1 (2 balls active) →
  `RIGHT` (the critical 2-simultaneously-active-ball trigger) → rent slot2
  (3 balls active). **Result: `gRngValue` matches bit-exact between RAM and
  engine on all 37 sampled ticks around that trigger** - `ballAnimStall`'s
  existing `activeSlotsBeforeAction` formula (stall *every* active ball, not
  just one) was already correct; no model change needed. A further probe
  step (pressing `RIGHT` a 4th time, past the 3rd/final rent) showed a real
  divergence, but that's `Select_OptionRentDeselect` handing off to the
  YES/NO reveal screen once all 3 picks are made - out of scope per the
  brief, not a `ballAnimStall` bug. Then reproduced ISSUES #7's *original*
  pixel symptom directly (entry 21's own repro shape, `npm run compare` on a
  scratch trace): frames 124/155/163 **still mismatch** - so the fix above
  doesn't resolve this issue. Cross-referencing the same script's RAM vs
  engine `gRngValue`: the two streams match bit-exact through tick 203
  (spanning every frame the pixel mismatches land on) and diverge for the
  first time at **tick 204** - ball 0 (which has accumulated 4 cumulative
  stall events by then, more than any existing pinned test reaches) misses a
  resting→moving reroll transition that RAM shows firing on schedule. Ran
  out of session time before isolating which `ballAnim.ts` internal counter
  is off. Full evidence and next steps: ISSUES #7 (updated, not deleted -
  per the brief's own instruction not to guess a stall model without RAM
  proof).
- **Next:** dump `gSprites[0]` densely from tick ~195-210 (RAM + engine) to
  find the exact `ballAnim.ts` counter desync, fix, re-verify
  `ballAnim.test.ts`/`ballAnimMultiBall.test.ts` stay green unchanged, pin a
  new Tier-1 test, then delete ISSUES #7 and build `rent-3picks.json`.
- **Notes:** Stretch (`rent-3picks.json`) not attempted - Priority 2 took
  the full remaining budget. PAPERCUT: none beyond the usual oracle
  round-trip overhead (~6 oracle/RAM-probe round-trips this session, plus 2
  `npm run compare` runs on scratch traces, none committed).

---
---

## 22 — S5 slice 2 (worker, capped): STOPPED before resolving ISSUES #7 — RAM probe hit a SEPARATE, previously-unknown bug (dropped cursor input after a RENT-confirm close) that contaminated the discriminating scenario before it was reached; #7's own two-simultaneous-stall question is still unresolved

- **State:** unchanged from entry 21 — `npm test` **261/261**, `npm run
  build` green, all 7 traces untouched at prior counts. **No `src/`/`tests/`
  changes this session, no `rent-3picks.json` committed.** ISSUES #7 was
  NOT deleted — its root cause is still not proven.
- **Did:** Built a 3-ball RAM probe (`tools/extract/inspect-anchor.py`
  pattern, dumping `gSprites[ballSpriteId].data[0]`/`animNum`/`animCmdIndex`/
  `animEnded` + `gRngValue` tick-by-tick; cross-checked instrumentation via a
  single-ball control probe that reproduces the already-pinned model
  bit-exact through frame 300 — offsets are correct, not a probe artifact).
  First attempt used a 10-tick dwell before the second cursor `RIGHT`
  (shorter than `ballAnimMultiBall.test.ts`'s proven 40-tick
  `DWELL_TO_SLOT2`) and RAM-confirmed (direct reads of
  `sFactorySelectScreen->cursorPos` and `mons[i].selectedId`) that **real
  hardware silently dropped that `RIGHT`** — cursor never left slot 0, and
  the next `A` press deselected slot 0 instead of selecting slot 1. This
  engine's own replay does NOT reproduce the drop: `core.ts`'s "cursor" mode
  branch has no gate analogous to `isMonPicInputReady()` for input arriving
  too soon after a RENT confirm's popup-close. The resulting "mismatch" I
  was chasing (ball 0's sprite fields resetting at tick 99) was just this
  deselect's palette swap, not a `ballAnimStall` effect — a contaminated
  repro, not new evidence about ISSUES #7's real question. Full writeup +
  exact evidence in ISSUES #7's "Worker update" section.
- **Next:** Rebuild the ISSUES #7 repro with a ≥40-tick dwell before **every**
  cursor move (not just the first), then rerun the same dump-and-diff method
  to actually reach the two-simultaneous-active-balls trigger. The probe
  infrastructure is fast (~2 min end-to-end for the control probe) and the
  method is proven — this should be quick for the next session. Separately
  worth a look: whether "cursor" mode needs its own `isMonPicInputReady`-style
  gate on popup-close completion (currently ungated), since any repro script
  with too-short a post-confirm dwell will silently desync the same way mine
  did.
- **Notes:** No `src/` edits made (probe-only, scratch scripts under `/tmp`,
  not committed). PAPERCUT: none beyond the usual oracle round-trip overhead;
  the wasted probe cycle here was a scripting judgment call (dwell too
  short), not tooling friction.

---

## 21 — S5 slice 2 (worker, capped): STOPPED before writing rent-3picks.json — found a SECOND, distinct multi-ball model gap (ISSUES #7): ball-tile pixel mismatches once a trigger stalls TWO already-active balls at once, a scenario ISSUES #6's fix never RAM-verified

- **State:** unchanged from entry 20 — `npm test` **261/261**, `npm run
  build` green, all 7 existing traces untouched at prior counts
  (`rent-slot1.json` still **125/139**, file byte-identical). **No
  `src/`/`tests/` changes this session** and **no `rent-3picks.json`
  committed** — the investigation below found a real, unattributable model
  gap that blocks building that trace correctly (same "stop and report
  precisely" outcome as entry 19).
- **Did:** Built a candidate 3-pick dense trace (rent slot1 → `RIGHT` → rent
  slot2 → `RIGHT` → rent slot3, each rent = `A`(2f)/idle28f/`DOWN`(2f)/
  idle4f/`A`(2f) confirm, matching `rent-slot1.json`'s own shape; confirms
  land at press-ticks 37/113/189) and ran it through `npm run compare`
  (scratch, not committed). Found `DIFF`s at **ball OBJ positions** during
  plain idle dwell — outside ISSUES #5's popup-close window (`x88-151`)
  entirely. Root-caused *which tile* is objectively correct per mismatched
  frame via a RAM-free method: overlay each of a ball's 3 candidate anim
  tiles directly onto a clone of the **oracle's own PNG** (same `drawSprite`
  call the renderer uses) — the correct tile is the one whose overlay is a
  pixel-exact no-op against the untouched oracle frame. Confirmed 3
  mismatches this way (frame 124 ball-index-1 true=32/engine=0; frame 155
  ball-index-0 true=32/engine=0; frame 163 same ball true=0/engine=32 — not
  a constant offset, oscillates ahead/behind). Traced the likely mechanism:
  by frame ~145 the trace's *second* `RIGHT` (slot1→slot2) stalls **two**
  simultaneously-active balls (index 0 and 1) from one trigger —
  `tests/ballAnimMultiBall.test.ts`'s only multi-ball RAM-pinned case never
  reaches this shape (its trigger always stalls exactly **one** already-
  active ball, never two at once). Ball 0 by frame 163 has accumulated
  three stall-worthy triggers total (the first `RIGHT`, the slot-2 confirm,
  and the second `RIGHT` shared with ball 1) — full details, evidence, and
  the exact repro script are in **ISSUES #7** (new).
- **Next:** ISSUES #7 needs a dev-time RAM probe of the same caliber as
  ISSUES #6's own (`gSprites[ballSpriteId].data[0]`/`animNum`/`animEnded` per
  ball, tick-by-tick) but for a 3-ball scenario with **two sequential**
  cursor moves, to determine whether real hardware stalls both
  simultaneously-active balls per trigger, only one, or something else —
  do not guess/patch `ballAnimStall` without that data (a wrong guess would
  silently re-break the already-verified two-ball case). Once resolved,
  `rent-3picks.json` (dense captures through all 3 picks, ending at "Are
  these three POKéMON OK?" — the exact endpoint tick before ANY reveal-chain
  change was worked out this session: the 3rd confirm's own resulting frame,
  since even the popup-preview close counts as part of the reveal chain per
  `docs/confirm-flow-notes.md` §0) and the accompanying 3-ball `gRngValue`
  Tier-1 RAM-pin are both unblocked and ready to build.
- **Notes:** No `src/` edits were made (the investigation stayed read-only:
  scratch TS probes comparing oracle/app PNGs directly, deleted before
  finishing per instructions; the candidate trace file was likewise deleted
  rather than committed broken, matching entry 19's own precedent of not
  writing the trace when blocked). PAPERCUT: none beyond the usual
  oracle-round-trip overhead (~6 `npm run compare`/probe round-trips this
  session).

---

## 20 — ISSUES #6 root-caused and fixed: multi-ball `SpriteCB_Pokeball` stall was never about mon-pic open/close — it's `Select_Print*` text-printer calls (cursor move + RENT/DESELECT confirm) stealing a tick from every OTHER rented ball; two-ball RNG stream now exact, ISSUES #6 DELETED

- **Supervisor addendum (same day):** verified (208/208 → then merged the
  three parked worktree branches: battle-1 assets, confirm-flow dossier,
  battle-transition assets) — `npm test` now **261/261**, build green,
  worktrees cleaned. S6 static-asset groundwork is complete
  (mon/trainer pics, bg, healthbox, window/font, all 12 transition
  variants) and S5's confirm flow is fully scouted
  (`docs/confirm-flow-notes.md`). ISSUES #5 policy question still awaiting
  the user (asked ~12:35; headless fallback active). Next: rent-3picks
  trace worker (multi-ball model now exact), then confirm-flow
  implementation.
- **State:** `npm test` **208/208** (203→208, +5 new in
  `tests/ballAnimMultiBall.test.ts`), `npm run build` green. All 7 traces
  re-verified at their prior counts, files unchanged (`anchor` 1/1,
  `draft-cursor` 13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66,
  `summary-info-onix` 122/122, `summary-info-magby` 132/132,
  `rent-slot1.json` still **125/139**, gap still 100% attributable to
  ISSUES #5 per entry 18, untouched here).
- **Did:** Overturned the prior session's own working theory (entry 19
  suspected `OpenMonPic`/`CloseMonPic`). RAM-probed (dev-time
  `EmeraldOracle` harness, scratch scripts under `/tmp`, not committed)
  four isolated variants against the pinned single-ball baseline
  (animEnded-equivalent flip at frame 168): a plain cursor **RIGHT move
  with NO popup at all** costs ball 0 a tick (flip→169) — proving the
  effect has nothing to do with mon-pic mechanics; opening a ball's **own**
  popup costs nothing (flip stays 168, answers the brief's self-stall
  question: no); opening a second ball's popup and closing it via **B**
  costs the same single tick as leaving it open (flip→169 either way —
  closing via B/OTHERS adds nothing); only closing via **RENT/DESELECT
  confirm** adds a second, independent tick (flip→170, matching ISSUES #6's
  own cited number exactly). Traced both triggers to source:
  `Select_Task_HandleChooseMons`'s LEFT/RIGHT branch
  (`battle_factory_screen.c` STATE_CHOOSE_MONS_HANDLE_INPUT) calls
  `Select_PrintMonCategory`/`Select_PrintMonSpecies`, and
  `Select_OptionRentDeselect` (:1949-1970) calls `Select_PrintSelectMonString`
  (:1893-1909) — both call `AddTextPrinterParameterized[3]` +
  `CopyWindowToVram(..., COPYWIN_GFX)`; B/OTHERS-close and self-open call
  neither. The stall lands the tick *after* the trigger, matching
  `CB2_SelectScreen`'s `AnimateSprites()`-before-`RunTasks()` ordering
  (:1092-1099) — a same-tick `RunTasks()` text-print can only affect the
  *next* tick's `AnimateSprites()` pass. Modeled as `DraftScreenState.
  ballAnimStall` (`factoryDraftScreen.ts`): a snapshot of which ball slots
  were active *before* this tick's action, consumed to skip exactly those
  slots' `advanceBallAnim` call next tick — LEFT/RIGHT stalls everyone
  active; RENT/DESELECT stalls everyone active *except* the acted-on slot
  (RAM-confirmed via a second ball's own settle timer landing unstalled by
  its own trigger). Along the way, an exhaustive per-frame `gRngValue` diff
  (RAM vs engine, all 260 frames of the two-ball repro, not just
  checkpoints) surfaced two more latent, pre-existing `ballAnim.ts` bugs
  invisible to the single-ball suite (which never sampled a frame in the
  affected gap): the "resting→moving" reroll after a SUCCESS actually lands
  2 ticks later than the naive `REST_TICKS` countdown implied (now
  `REST_INTERNAL_OFFSET`), and a moving cycle ending on a FAILURE (no
  queued rest, immediate reroll) actually rerolls 1 tick later than
  same-tick (now `FAILURE_REROLL_DELAY`) — the latter caught via ball 1's
  own first-ever full cycle (a FAILURE, previously never RAM-tested this
  deep). Both fixes are single-ball-invisible (re-verified 0 mismatches
  across a fresh 400-frame single-ball RAM diff) but required for
  multi-ball interleaving exactness.
- **Next:** S5 slice 2's `rent-3picks.json` is now unblocked (stretch item
  from this session's brief, not attempted — see Notes). ISSUES #6 deleted
  per the fix; ISSUES #5 (real hardware jitter, entry 18) remains the only
  open item blocking `rent-slot1.json`'s last 14 frames — do not re-attempt
  without new information per that entry's own conclusion.
- **Notes:** Only the primary goal was attempted this session (mechanism
  root-cause + engine fix + tests); the stretch goal (RENT-confirm-timing
  jitter probing + committing `rent-3picks.json`) was not reached — ran out
  of session time after the RAM-probe-heavy primary investigation (~15
  oracle round-trips total: 4 discriminating-variant probes, several dense
  per-tick dumps, and one 260-frame exhaustive diff). Whoever picks up
  `rent-3picks.json` next inherits a RNG-exact 2-ball model to build on;
  the two-ball scenario's exhaustive 260-frame diff (0 mismatches) is
  stronger evidence than the checkpoint-only pinning in
  `tests/ballAnimMultiBall.test.ts`, but that full diff isn't itself
  committed (per instructions) — re-run it if extending to 3 balls turns up
  anything suspicious.

---

## 19 — S5 slice 2 (worker, capped): STOPPED before writing rent-3picks.json — found a real, RAM-confirmed multi-ball throttling effect that breaks the "fully independent per-ball RNG" assumption; species-name-breathe rule fully pinned instead (no code changes this session)

- **State:** unchanged from entry 18 — `npm test` **203/203**, `npm run
  build` green, all 7 traces at their prior counts (`rent-slot1.json` still
  125/139, untouched). **No `src/`/`tests/` changes**: the investigation
  below found a real modeling gap that blocks building `rent-3picks.json`
  correctly, so nothing was written that would need reverting. This is a
  "stop and report precisely" session per the brief's own contingency.
- **Did (species-name breathe — fully resolved, no code needed):** Read
  `Select_Task_FadeSpeciesName`/`fadeSpeciesNameActive` (`battle_factory_screen.c:2277-2330`,
  set at :1611/:1636/:1682/:1689/:1714/:1556/:1567) and confirmed with 3
  oracle probes: the fade coefficient only advances while
  `fadeSpeciesNameActive` is true, which is **exactly `mode === "cursor"`
  (no popup open)** — opening a ball's popup (A-press tick) freezes it
  instantly, closing it (B/OTHERS/RENT-continue tick) resumes it, and
  **the underlying counters are never reset, only paused** (probe: idle 95
  active ticks → open popup → sit 100+ ticks inside it, zero pixel diffs the
  entire time → close popup → breathe resumes and trips within ~10 ticks,
  not a fresh ~105-tick cycle). Pure-idle-from-anchor threshold measured
  exactly: **first visible pixel diff at tick 105**, repeating every 7
  ticks thereafter. Rule for future trace-building: sum only the
  cursor-mode (no-popup) ticks since screen init; keep that cumulative sum
  under 105 and the breathe never becomes visible — no engine model needed.
- **Did (multi-ball RNG — blocked, real finding):** `core.ts`'s tick() loop
  already iterates all 6 `ballAnims` slots unconditionally in slot order
  every tick (written in slice 1) — structurally already "N-ball capable"
  and was assumed independent per dossier Risk 2. RAM-verified this
  assumption directly: dumped `gSprites[ballSpriteId]`'s `data[0]`/`animNum`/
  `animEnded` + `gRngValue` tick-by-tick for (a) a single rented ball idling
  220 ticks, vs (b) the same ball PLUS a second ball rented via a RIGHT +
  open-popup + DOWN + RENT-confirm sequence inserted while the first ball's
  128-tick "moving" cycle is in flight. **Result: ball 0's own moving-cycle
  completion (the `animEnded` flip) lands at tick 168 in scenario (a) but
  tick 170 in scenario (b) — a reproducible 2-tick delay**, which cascades
  into its resting countdown and next roll (tick 201 vs tick 203). This
  directly contradicts `SpriteCB_Pokeball`'s own source reading (`data[0]`
  is plainly per-sprite with no shared state) and the module comment in
  `ballAnim.ts` — yet the RAM shows a real divergence correlated with the
  second ball's own popup open/close (2 mon-pic transitions ≈ 2 stalled
  ticks for the *other* ball; not yet proven to be exactly 1 tick/transition,
  only observed as a net +2 over that window). Cross-checked the JS engine
  against the single-ball probe (exact match) and the two-ball probe
  (5 tick-level RNG-value mismatches, all clustered exactly at the two
  delayed transitions) via a throwaway node harness — confirms this is a
  gap in the model, not a probe artifact.
- **Next:** Do **not** attempt `rent-3picks.json` (or extend `ballAnim.ts`
  to N balls) until this throttling mechanism is identified precisely —
  building the trace now would either desync RNG-dependent state silently
  or require guessing at the mechanism, which risks landing something that
  merely *looks* pixel-clean at sparse sample points. Concrete next step for
  whoever picks this up: read `OpenMonPic`/`CloseMonPic` (battle_factory_screen.c,
  the mon-pic-bg palette/tile setup they do) for anything that could cost
  *other* sprites' `AnimateSprites()` a frame — e.g. a blocking VRAM/tile
  allocation call — then RAM-confirm with a probe that inserts exactly ONE
  mon-pic open (no close) vs one open+close to see if the delay is
  per-transition (1 tick each) or a flat per-popup-session cost. ISSUES.md
  #6 has the full data (probe scripts summarized, not committed per
  instructions — recipe is `tools/extract/inspect-anchor.py`'s pattern
  adapted to read `gSprites[]`/`gRngValue` on a custom button script; scratch
  files lived under `/tmp`, not committed).
- **Notes:** Work items 3-4 from the brief (jitter-clean close-window
  probing, the committed `rent-3picks.json` trace) were not reached — they
  depend on item 1 (multi-ball RNG) being solid first, since the trace's
  own churn windows would otherwise assert against an unverified RNG
  stream. PAPERCUT: none beyond the usual RAM-probe/oracle round-trip
  overhead (~3-5s/probe × ~6 probes this session, not a blocker).

---

## 18 — ISSUES #5 root-caused via direct RAM/IO inspection: confirmed genuine GBA cycle-timing jitter, NOT fixable at this engine's tick/state level — no code change, rent-slot1.json stays 125/139

- **State:** unchanged from entry 17 — `npm test` **203/203**, `npm run
  build` green, all 6 pre-existing traces still 0 diff. `rent-slot1.json`
  still **125/139** (not re-timed, not touched — trace file has zero diff
  from what entry 17 committed). No `src/` changes this session: the
  investigation conclusively found there is nothing at this engine's
  modeling granularity left to fix (see below), so no code was written.
- **Did:** Followed the assigned method exactly — read
  `battle_factory_screen.c`'s mon-pic construction (`Task_CloseMonPic`,
  `SpriteCB_*MonPic`, the `sSpriteTemplate_*_MonPicBgAnim` affine sprite),
  then did dense dev-time RAM/IO inspection (scratch scripts using
  `EmeraldOracle.core.memory.u16[...]`, not committed) of `WIN0V`,
  `BLDCNT`/`BLDALPHA`/`BLDY`, `BG3HOFS/VOFS`, the mon-pic-bg palette, and
  `gTasks[]`'s raw state (`0x03005E00`, struct layout from `task.h`) across
  a clean close (press-tick 30) and a bad one (press-tick 36), then swept
  press-tick 20-60 to map the WIN0V sequence exactly. Traced the divergence
  all the way to its true source: `Task_CloseMonPic`'s internal
  `tWinTop`/`tWinBottom` state is **provably clean** (identical, purely
  time-shifted, between the clean and bad runs) — the bug is entirely in
  *when the already-correct value becomes visible*, via GBA's real
  `SetGpuReg` double-buffer (`gpu_regs.c:66-98`): writes queue for the next
  vblank flush unless `REG_VCOUNT` has already crossed into vblank at the
  exact moment `SetGpuReg` executes, which depends on the total CPU cycle
  cost of everything else that ran earlier that frame. Proved this isn't
  reducible to any state this engine tracks: replaying `rent-slot1.json`
  with 0/3/7/10/17 idle frames prepended (preserving every *relative*
  timing this engine models, shifting only absolute session tick) produces
  a **different** catch-up pattern each time — conclusive evidence the
  jitter depends on absolute emulated-cycle count, not on open-variant,
  dwell time, or RENT-flow-local state. Full writeup with file:line
  references, the ruled-out leads (monPicBg static palette confirmed
  unchanged — the earlier "shimmer" suspicion was wrong; task-list
  insertion order confirmed identical between clean/bad — not a
  scheduling-order bug either), and the remaining options is in ISSUES #5
  (kept open, not deleted, per the brief's stop condition).
- **Next:** This exact acceptance criterion (`rent-slot1.json` 0/139
  *without* re-timing) cannot be met without cycle-accurate CPU emulation,
  which is out of scope for this engine's architecture. A future
  supervisor decision is needed on ISSUES #5's two remaining options
  (re-time the RENT-confirm press to a trace-specific clean tick, or accept
  125/139 permanently with the gap documented as attributable to this
  issue) — do not re-attempt a "general fix" without new information (e.g.
  a way to cheaply approximate per-frame cycle cost) that changes the
  tractability conclusion above.
- **Supervisor addendum (same day):** S6 scout dossier merged
  (`docs/battle-bringup-notes.md`, 595 lines; ROADMAP S6 corrections
  folded in: RNG advances per-VBlank until battle proper, transition is a
  random 12-way pick, opponent personalities rolled at battle start;
  battle-1 identities RAM-pinned: trainer 50 DESTIN, Grovyle/Murkrow/
  Pidgeotto vs Onix/Magby/Bayleef). 203/203 + build green post-merge.
  **ISSUES #5 policy question escalated to the user** (0-diff bar vs
  cycle-jitter windows — see the ISSUES entry for the two options);
  battle-1 asset extraction in flight on the worktree lane.
- **Notes:** No commit was needed for `src/`/`tests/` (nothing changed);
  this commit is docs-only (`ISSUES.md` rewritten with the confirmed root
  cause, this entry). Time was spent entirely on RAM-inspection
  investigation per the brief's explicit method — the conclusion is a
  negative result (root cause found, fix infeasible at this level), which
  the brief anticipated as an acceptable outcome ("stop and report
  precisely").

---

## 17 — S5 slice 1 (worker, capped): RENT/DESELECT + ball-rock RNG stream implemented and RAM-verified; pixel trace 125/139 — blocked short of 0 diff by a newly-found pre-existing rendering bug (ISSUES #5), not by anything in this slice's own code

- **State:** `npm test` **173/173** (159→173, +14 new), `npm run build`
  green. All 6 pre-existing traces re-verified 0 diff (`anchor` 1/1,
  `draft-cursor` 13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66,
  `summary-info-onix` 122/122, `summary-info-magby` 132/132) — **no
  regressions**. New `tools/compare/traces/rent-slot1.json` (dense,
  every-frame, popup-open → RENT confirm → 100-tick dwell) → **125/139
  matched, NOT 0 diff** (see Notes — acceptance criterion not met this
  session). New Tier-1 tests **are** fully green and RAM-verified:
  `tests/rentSelect.test.ts` (9 tests, state machine + renumbering) and
  `tests/ballAnim.test.ts` (5 tests, engine `rngValue` pinned against
  RAM-dumped `gRngValue` at frames 0/36/37/39/201 — includes both a
  SUCCESS and a FAILURE roll).
- **Did:** Implemented `src/engine/ballAnim.ts` (new — the
  `SpriteCB_Pokeball` idle/rock state machine + RNG roll, RAM-verified
  timings: first roll-eligibility lands 2 ticks after selection, a 17-step
  Moving cmd table matching `sAnim_Select_Pokeball_Moving` exactly, a
  32-tick rest after a successful roll, immediate reroll after a failed
  one; a `displayTile`/`pendingDisplayTile` 2-stage shift register
  reproduces an oracle-verified 2-tick render lag between the internal
  state transition and the visible tile, kept structurally separate from
  the RNG-critical internal timing). Wired RNG into `EngineState`
  (`rngValue`, seeded `ANCHOR_RNG_VALUE`, advances once/tick unconditionally
  per `main.c:366`, ball rolls consume a *second* step the same tick,
  RAM-confirmed ordering: standard tick first, roll second). Implemented
  RENT/DESELECT in `factoryDraftScreen.ts` (`applySelect`/`applyDeselect`
  pure reducers, the renumbering special case, `selectMonMessage`,
  context-sensitive row-1 label) and wired the confirm path into
  `core.ts`'s `tick()`. Found and fixed two real render bugs along the way:
  (1) the info-window message and popup label lag the palette swap by 2
  ticks (`RentConfirmRedrawState`, same redraw-scheduling pattern as
  `CursorRedrawState`); (2) `monPicRender.ts`'s `ballColor()` helper (used
  for the mon-pic window's blend target2 source) was hardcoded to the gray
  palette/tile 0 for *every* ball regardless of selection state — fixed via
  a shared `ballVisuals()`/`BallVisual` threaded into both `drawMonPic` and
  the OBJ ball loop so they can't drift apart again.
- **Next:** ISSUES #5 (a pre-existing, RENT-independent mon-pic-close
  rendering bug, confirmed via a bare `A`+`B` reproduction with zero RENT
  code involved) is what's between this trace and 0 diff — see that entry
  for the full probe log and a lead (likely an un-modeled palette-cycle/
  shimmer in `monPicBg`). A future slice should either root-cause it
  directly, or re-time `rent-slot1.json`'s RENT-confirm press to land in a
  confirmed-clean window once the periodic pattern is pinned precisely
  enough to predict one reliably (trial-and-error this session found good
  windows at ~31 and ~47+ ticks after open, but shifting into the second one
  just moved a *different* set of diffs into frames outside this trace's
  species-name-breathe budget — see Notes).
- **Supervisor addendum (same day):** verified independently (tests,
  build, 125/139 + no regressions reproduced). Both parallel-lane
  extraction branches merged on top: moves/exp/items data (19 tests) and
  the pre-battle-room scene incl. `docs/prebattle-room-notes.md`
  (11 tests, composite-verified 0/38400 px vs oracle) — `npm test` now
  **203/203**, build green, worktrees cleaned up. ROADMAP S5 marked [~]
  with slice-1 note. Next: root-cause ISSUES #5 (main lane); S6 scout
  dossier in flight on the worktree lane.
- **Notes:** **This is the "STOP and report precisely" case the brief
  anticipated**, just triggered by a different collision than the one it
  named (species-name breathe) — ISSUES #5 instead. Confirmed root-cause
  separation carefully before stopping: (1) reverted the RENT-specific
  trace to a bare `A`-open+`B`-close with no selection/RNG code touched at
  all, and it reproduces the identical diff at the identical relative
  offset — proves this is not a bug in this slice's new code; (2) all of
  this slice's *own* new behavior — palette swap, message/label redraw
  timing, the ball's idle/rock tile sequence, and the RNG stream through
  both a SUCCESS and a FAILURE roll — is independently confirmed exact via
  RAM-dumped `gRngValue` checkpoints (hermetic, unaffected by any pixel
  bug) plus the trace's own frames 58-138, which sit entirely outside every
  close-animation window and are 100% clean. The RAM-inspection recipe
  (`tools/extract/inspect-anchor.py`'s pattern, scratch script not
  committed) was essential here: a per-frame dump of `gSprites[ballId]`'s
  `data[0]`/`animEnded`/`animNum`/`animCmdIndex` alongside `gRngValue`
  turned a confusing pixel-only investigation into an exact tick-by-tick
  state trace, which is what let SETTLE_TICKS/the Moving cmd table/the
  2-stage display lag all get pinned correctly on the first real attempt.

---

## 16 — S4 slice 1 (worker, capped): summary-info-magby.json lands 0 diff — "≥2 different slots" acceptance met, no app changes needed

- **State:** `npm test` **159/159** unchanged, `npm run build` green.
  `tools/compare/traces/summary-info-magby.json` (new, 132 every-frame
  captures 45-176, menu-open through entry fade + a settled-window slice +
  full B-exit fade-out/black-hold/fade-in to the resettled draft-with-menu
  state) → **0 diff, 132/132**. `anchor` (1/1), `summary-info-onix`
  (122/122), `draft-cursor` (13/13), `draft-menu` (38/38),
  `draft-menu-slot6` (66/66) all re-verified 0 diff. **No `src/` changes
  were needed** — the existing generic renderer/state machine already
  handled MAGBY's data (name/types/gender-none/hFlip'd sprite) correctly.
- **Did:** Per the brief's method, probed MAGBY's own timing with `bin/
  oracle run` before writing the trace (did not reuse ONIX's offsets
  blind). Found the RIGHT-cursor-move (+4 settle) and menu-open (+40
  settle) timings are generic/species-independent as expected. The Info
  page's fade-settle timing is **also** generic: MAGBY's Info page goes
  sha-stable at SUMMARY-press-tick **+59**, and `B` first registers at
  **+63** — pixel-identical offsets to ONIX's already-documented ones, now
  empirically confirmed rather than assumed. The real MAGBY-specific find:
  its sha-stable window is only **6 ticks wide (+59..+64)**, not ONIX's
  ~100+, because `PokemonSummaryDoMonAnimation`'s per-species
  `sMonAnimationDelayTable`/front-sprite-bounce-and-cry (`pokemon.c:6858`)
  fires almost immediately for MAGBY (starts at +65) — this is "the mon
  idle animation" PROGRESS #15 already flagged as unscoped/undone. Built
  the trace to press `B` at exactly +63 (relative to the SUMMARY press),
  the last tick inside the stable window before that animation would
  intrude — so the committed trace never exercises those not-yet-modeled
  frames at all, by construction, not by luck.
- **Next:** S4's "≥2 different slots" acceptance criterion is now met.
  **Supervisor decision (this session): S4 slice 1 closed; the remainder
  (page nav + scroll-wipe, UP/DOWN switching, move-select, mon idle
  animation) is explicitly deferred behind S5 — recorded in ROADMAP.md's
  S4 section. Main lane proceeds to S5 (docs/rent-flow-notes.md);
  worktree lane is extracting moves/exp/items data in parallel.**
- **Notes:** Debugging template from #14 worked well again: isolated dense
  oracle probe of the new interaction first, sanity-checked pixels
  actually changed after the "trigger" input rather than trusting a
  stable-looking window. `sMonAnimationDelayTable`/`PokemonSummaryDoMonAnimation`
  (`pokemon.c:6858`, `pokemon_summary_screen.c:3994`) is the concrete
  source location for whoever picks up the idle-animation item — it's a
  per-species (`species - 1` indexed) delay-then-bounce-and-cry, gated on
  `!gPaletteFade.active`, same guard family as the input-ready-lag quirk.

---

## 15 — Supervisor wind-down: session end 2026-07-17 ~05:50

- **State (verified this minute):** `npm test` **159/159**, `npm run build`
  green, all five compare traces 0 diff (`anchor` 1/1, `draft-cursor`
  13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66 every-frame,
  `summary-info-onix` **122/122** every-frame incl. full B-exit).
  `ISSUES.md` empty. Working tree clean. ROADMAP: **S1 [x] S2 [x] S3 [x]
  S4 [~] S5-S9 [ ]** — S4's remainder: MAGBY Info-page trace (probe its
  own stable window), the 3 other pages + scroll-wipe, UP/DOWN
  mon-switching, move-select, the mon idle animation.
- **Session summary (supervised, ~01:00-05:50):** 9 worker steps + 1 merge
  lane. Landed: staged roadmap (iteration 0); S1 pixel-exact anchor +
  compare loop + extraction pipeline; S2 draft interactions frame-exact
  incl. every-frame transients; S3 RNG core + 882 rentals extracted +
  anchor RAM dump (six mons pinned to recomputed stats); S4 fade math,
  Info-page data + renderer, entry+exit fades pixel-exact; scout dossiers
  for S4 (summary-screen-notes.md) and S5 (rent-flow-notes.md). Key
  domain finds in ROADMAP notes: anchor RNG seed, ball-sprite RNG
  consumption, battle-1 opponent is an anchor constant, statics-via-nm
  recipe, fade elapsed+1 + black-hold quirks.
- **Next:** S4 remainder (start with summary-info-magby.json), then S5
  implementation off docs/rent-flow-notes.md. All prerequisites committed.
- **Notes:** Every worker ended at a green commit; no usage-limit events;
  two PAPERCUTS entries total (see file).

---

## 14 — S4 slice 1 (worker, capped): B-exit fade fixed, ISSUES #4 closed; summary-info-onix.json now 0 diff through settle — S4 stays [~] (MAGBY trace still open)

- **State:** `npm test` **159/159** (152→159, +7 new), `npm run build`
  green. `anchor`/`draft-cursor`/`draft-menu`/`draft-menu-slot6` re-verified
  0 diff. `tools/compare/traces/summary-info-onix.json` extended from 64
  captures (entry+settle only) to **122 dense captures, every frame,
  covering SUMMARY-press through the full B-exit (fade-out/black-hold/
  fade-in) back to the resettled draft screen** → **0 diff, all 122
  frames**. `ISSUES.md` #4 deleted (fixed, not worked around).
- **Did:** Per the brief's method: ran a fresh, isolated dense oracle probe
  of the B-exit only (not layered on the entry trace). First probe attempt
  (B pressed at the settled Info page's own press-tick+62, well inside the
  documented pixel-stable window) found B silently did nothing for ~50
  frames — a real gotcha, now in `ROADMAP.md`'s Domain notes: input-ready
  lags visual-stable by a few ticks here (`Task_HandleInput`'s
  `!gPaletteFade.active` guard isn't true yet even though the screen looks
  settled); B first reliably registers at absolute press-tick+63 (a
  parameter sweep confirmed +62 fails, +63 works). With a probe that
  actually triggered the fade, derived the true curve pixel-for-pixel
  (component 90 and 255 samples, matching `paletteFade.test.ts`'s existing
  oracle-pinned values exactly) — the exit fade-out/fade-in curves and
  their `elapsed+1` offset were **already correct** in `core.ts`'s
  `render()`; the actual bug was the black-hold phase: the entry direction
  had a special "hold's own last tick already shows fade-in's first step"
  branch, but the exit direction fell through to always-pure-black instead
  of getting the same treatment — the exit's black hold has the identical
  quirk (oracle-confirmed: the true last hold tick, not pure black, matches
  `bgFadeY(0, FADE_IN)`/`objFadeY(0, FADE_IN)` composited on the *draft*
  screen, symmetric with the entry composing onto the *Info* page).
  Rewrote `render()`'s black-hold branch to apply the peek uniformly by
  direction instead of hardcoding it entry-only. New
  `tests/summaryScreenRender.test.ts` hermetically pins the render()
  *dispatch* itself (which curve/offset/black-hold-quirk applies to which
  phase × direction) — the layer this bug actually lived in, distinct from
  `paletteFade.test.ts`'s already-correct low-level curve math.
- **Next:** `summary-info-magby.json` (stretch, not reached this session —
  probe MAGBY's own stable window first, don't assume ONIX's press-tick+59
  transfers) is the last piece of S4 slice 1's brief before S4's "≥2
  different slots" acceptance criterion is met. After that: S4's remaining
  scope (page navigation RIGHT/LEFT, mon-switching UP/DOWN, move-select) or
  move on to S5 per supervisor call.
- **Notes:** The debugging path here is a good template for future
  fade/dispatch bugs on this screen: (1) isolated dense probe of *only*
  the interaction in question, (2) sanity-check the probe actually
  triggered the intended state transition (don't assume a "stable-looking"
  press registered — verify pixels actually start changing where expected
  before trusting the rest of the derivation), (3) compare the app's
  actual rendered pixels against the oracle's directly (not against a
  hand-derived formula) to localize which specific composited region
  disagrees, since that pinpoints the dispatch bug far faster than
  re-deriving curve math that was already right.

---

## 13 — S4 slice 1 (worker, capped): Info-page renderer built and wired; entry+settle trace 0 diff; B-exit gap found — S4 stays [~]

- **State:** `npm test` **152/152** (146→152, +6 new), `npm run build`
  green. `anchor`/`draft-cursor`/`draft-menu`/`draft-menu-slot6` all
  re-verified 0 diff this session (untouched code paths, but re-ran given
  how much of `src/engine/` this slice touched). **New:**
  `tools/compare/traces/summary-info-onix.json` (dense, every frame from
  the SUMMARY press through the settled Info page's stable window, 64
  captures) → **0 diff**. `ROADMAP.md` still `[~]` — see gap below.
- **Did:** Built `src/engine/summaryInfoPage.ts` (the static Info-page
  compositor: BG3 tilemap, type/markings/ball/mon sprites, all text
  windows, per `docs/summary-screen-notes.md` §7) and wired
  `summaryScreen.ts`+`paletteFade.ts` into `core.ts` (`EngineState` gains
  `summaryScreen`; `tick()` routes A-on-SUMMARY/B-on-Info-page; `render()`
  dispatches flat/faded draft or Info-page rendering by transition phase).
  Then debugged the render pixel-exact against dense oracle captures
  (iterating `npm run compare`'s diff PNGs, per the brief) until the ONIX
  settled Info page and the full entry-fade sequence hit 0 diff. Real bugs
  found and fixed along the way (all still applicable, see commit
  `ec234e9` for the settled-frame set and `5729950` for the fade-timing
  set): `sTextColors` colorId0/1 were transposed (hid/blackened most text);
  the A-button icon is colored by its **window's** palette, not its source
  PNG's; `PositionStatusSlidingWindow`'s on-load reset lands on a flat
  fill, not a redraw of `page_info.bin`'s stale default; `{NO}`/`{LV}` are
  single-glyph control codes with ligature bitmaps already sitting in
  `font-normal.json` at raw codes 264/52 (bypass the charmap, which only
  covers quoted single-char entries); and — the big one — `render()`'s fade
  curves need `bgFadeY(t.elapsed + 1, timing)`/`objFadeY(t.elapsed + 1,
  timing)`, not `t.elapsed` directly (`BeginNormalPaletteFade`'s first
  blend step lands within its own trigger tick), plus the black-hold
  phase's own **last** tick already shows the fade-in's first step (BG
  only — OBJ is a further tick behind even there), which needed its own
  branch instead of always rendering solid black. Extraction: new
  `src/engine/fadeRender.ts` (fading variants of the `drawTileBg`/
  `drawSprite`/`drawText` primitives, `y<=0` reproduces the originals
  exactly — used for both the summary Info page and a new
  `renderFactoryDraftScreenFaded`), `drawSprite` gained an `hFlip` param
  (all 6 anchor species render hFlip'd on this screen, confirmed from
  `species_info.h`'s `noFlip` field — opposite of the draft-screen pic),
  and `src/assets/gen/summary-ball.json` (the summary screen's caught-ball
  icon is a **different** asset than the draft screen's rental-ball
  sprite, `graphics/balls/poke.png` not `factory_screen/pokeball.png` —
  confirmed every rental defaults to `ITEM_POKE_BALL` via
  `pokemon.c:2261`).
- **Next:** **The B-exit (Info page → draft screen) path is unresolved.**
  The state machine's phase/tick bookkeeping looks structurally right
  (settles at the expected tick, `onInfoPage` flips back correctly), but
  the *rendered pixels* diverge severely starting ~2 ticks into the exit
  fade-out and get progressively more wrong (SSIM trending toward 0, not a
  small residual) — this does **not** fit the same "+1" pattern that fixed
  entry, so applying it blindly would likely be wrong. Exact repro: trace
  `2×A, wait 40, 2×A, wait 60, 2×B, wait N`, dense-capture frames 104-165;
  104-106 match, first divergence at 107 (2 ticks after the B press
  registers). Needs a **fresh dense oracle probe of the exit fade
  specifically** (isolated, not layered on the entry trace) before
  guessing further — do not reuse the entry "+1" fix without re-deriving
  it from oracle pixels for this direction. Once that's resolved: extend
  `summary-info-onix.json` to cover the B-exit back to the settled draft
  screen (per the original brief), then `summary-info-magby.json` (stretch
  — probe MAGBY's own stable window first, don't assume ONIX's +59..+64
  transfers).
- **Notes:** `docs/summary-screen-notes.md` §7's spec was excellent — the
  BG-layering/composition-order/window-geometry reasoning all held up
  against oracle pixels with zero corrections needed. Every bug found this
  session was in territory the spec explicitly flagged as unresolved (text
  colors, ball asset, hFlip) or genuinely out of scope for a static-page
  spec (the fade-timing "+1", the black-hold boundary tick, the
  `{NO}`/`{LV}` control codes) — a good sign the extraction-then-implement
  split this run's been using is working. `PAPERCUT`: the `bin/oracle
  run`-vs-`npm run compare` frame-numbering question (are "press-tick N"
  labels from a direct oracle probe always directly comparable to
  `appTrace.ts`'s frame counter?) came up twice this session and cost real
  time both times — worth a `bin/oracle info`/`ROADMAP.md` Domain-notes
  clarification for the next worker who dense-probes a fresh interaction.

---

## 11 — Supervisor: S5 scout merged (rent-flow dossier)

- **State:** `docs/rent-flow-notes.md` merged; main tree `npm test`
  **138/138**, build green, all traces 0 diff. ROADMAP updated: S6 scope
  note + rented-ball RNG domain note (committed).
- **Did:** Verified + merged the S5 scout. Corrections vs prior
  assumptions: RENT is instant (no per-pick confirm; only yes/no is the
  final "Are these three POKeMON OK?"); OTHERS = cancel; DESELECT is
  RENT's relabel on a rented ball. Load-bearing finds: battle 1's opponent
  generated BEFORE frame 0 (anchor constant); rented ball sprites roll
  `Random()%5` per ~32f cooldown per ball (must be modeled from S5 on).
  S5→S6 boundary pinned: the "Right this way, please!" hold.
- **Next:** S4 slice-1 finisher (see entry 10's blocker list): extract
  Info-page data (type/dex/ability text/gender), render the static Info
  page, commit summary-info traces captured inside the stable +59..+64
  window, 0 diff. Then S5 implementation.
- **Notes:** Ledger hygiene: entry 8 was pre-archived by a worker while
  still live here; dropped it from the ledger without re-appending.

---

## 10 — S4 slice 1 (worker, capped): fade math + state machine landed; Info-page rendering NOT reached — S4 stays [~]

- **State:** `npm test` **138/138** (115→138), `npm run build` green.
  Existing 4 compare traces (`anchor`, `draft-cursor`, `draft-menu`,
  `draft-menu-slot6`) still all 0 diff (untouched this slice). **No new
  compare traces committed** — `summary-info-onix.json`/`-magby.json` from
  the step brief were NOT produced; the Info page has no renderer yet, so
  there was nothing to capture against. `ROADMAP.md` S4 stays `[ ]`
  (unstarted rendering-wise; foundation only).
- **Did:** Landed the hard, reusable half of S4 first: dense oracle
  probing (fresh, this session — not just reading the scout's dossier) of
  all 4 `BeginNormalPaletteFade(PALETTES_ALL, 0, ..., RGB_BLACK)` calls
  (entry fade-out/in, exit fade-out/in) fully pinned the per-frame 5-bit
  blend curve and the BG/OBJ 1-tick stagger (`objPaletteToggle`) —
  `src/engine/paletteFade.ts`, self-consistent with the dossier's
  press-tick+59/+53 settle points (20+24+15=59, 18+20+15=53 ticks exactly).
  Wired those tick counts into a summary-screen entry/exit state machine
  (`src/engine/summaryScreen.ts`: transition direction/phase/elapsed,
  selectedSlot, page id) mirroring `Select_Task_OpenSummaryScreen`'s
  3-state machine. 23 new hermetic Tier-1 tests, all pinned against literal
  oracle pixel values (no oracle/pixels at test time). Also confirmed the
  brief's requested number: **first mon idle-animation churn frame is
  press-tick+65** (slot 1/ONIX; settled Info page is stable from +59
  through +64, every frame differs from +65 onward through +151 with no
  further stable window found) — MAGBY (slot 2) not independently probed.
  Addendum written to `docs/summary-screen-notes.md` §6 with full detail.
  Neither module is wired into `core.ts`/render yet.
- **Next:** The Info page renderer itself, blocked on missing extraction
  (found while scoping, not yet done): `species-stats.json` has no
  type/dex-number fields; no ability name/description text table; no
  gender-ratio table. Next slice: (1) extract those (types + dex numbers
  likely cheap additions to `extract-species-header.ts`'s source files;
  ability names/descriptions from `gAbilityNames`/
  `gAbilityDescriptionPointers` need a small new extractor); (2) build the
  Info-page renderer (BG3 tilemap from already-extracted
  `summary-bg.json`, the window/text fields per the dossier's §2/§3, type
  icons from `summary-type-icons.json`) for a **static** frame (mon
  idle-anim can stay a documented remainder, captures must stay ≤
  press-tick+64 per the churn frame above); (3) wire
  `summaryScreen.ts`+`paletteFade.ts` into `core.ts`'s tick/render,
  blending the draft-screen framebuffer during entry-out/exit-in and the
  new Info-page framebuffer during entry-in/exit-out; (4) only then are
  `summary-info-onix.json`/`-magby.json` (dense through the fades, ≤4-frame
  elsewhere) achievable — build and commit those to actually close S4
  slice 1's acceptance criteria, which this session did not reach.
- **Notes:** This slice hit its 50-minute cap on research + the (large,
  now-done-once) fade-curve derivation before rendering could start —
  flagging per `AGENTS.md`'s "stop at a green commit, report exact
  frames/pixels" guidance rather than shipping a rushed/unverified
  renderer. The fade math is the part most likely to have been gotten
  subtly wrong by guessing (5-bit space, BG/OBJ stagger, per-transition
  dead-frame delays all differ from naive assumptions) — glad it's now
  oracle-pinned and covered, since every future summary-screen fade (S4
  paging is a redraw not a fade, but S5's draft-exit fade and S6's battle
  transition likely reuse this exact mechanism).

---

## 9 — Supervisor: S4 scout merged; S2 verified complete

- **State:** Scout branch `worker/wt-20260717-032349` merged: summary-screen
  art extracted (`src/assets/gen/summary-*.json`) + implementation dossier
  `docs/summary-screen-notes.md` (entry `SUMMARY_MODE_LOCK_MOVES`, all 4
  pages + UP/DOWN mon-switching reachable, OT suppressed for rentals,
  ranked frame-exactness risks). Merged tree: `npm test` **115/115**,
  build green, all four compare traces 0 diff. Worktree cleaned up.
- **Did:** Verified the #3 fix (66/66) and the scout deliverables myself;
  merged; re-ran the full battery on the merged tree.
- **Next:** S4 implementation slice 1 — entry fade → static Info page →
  B-exit restore, dense-capture traces 0-diff (dossier §1/§2 is the map;
  keep traces clear of the looping mon idle anim per dossier risk #1).
- **Notes:** Dossier flags the return path re-entering the draft via
  `CB2_InitSelectScreen` (fresh init, `fromSummaryScreen=TRUE`,
  `gLastViewedMonIndex` can move the cursor) — treat exit traces as
  first-class acceptance, not an afterthought.

---

## 8 — ISSUES #3 closed: slot6 every-frame trace 58/66 → 66/66; S2 COMPLETE

- **State:** `npm test` **115/115**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` 38/38,
  `draft-menu-slot6.json` **66/66** — all 0 diff, no regressions. `ISSUES.md`
  #3 deleted (fixed). S2 ticked `[x]` in `ROADMAP.md`.
- **Did:** Root-caused and fixed the 3 remaining redraw-scheduling clusters
  via single-purpose dense oracle probes (LEFT-only, DOWN-only, and B-only
  from a settled state), all traced to `CB2_SelectScreen`'s
  `AnimateSprites`/`BuildOamBuffer`/`RunTextPrinters`/`UpdatePaletteFade`/
  `RunTasks` ordering (RunTasks runs last, so any OAM change it makes isn't
  picked up until the *next* frame's `BuildOamBuffer`, while window/text
  copies land same-tick): (1) LEFT/RIGHT cursor moves reveal category text,
  species text, then the arrow sprite on 3 successive ticks, not atomically
  — new `CursorRedrawState` in `factoryDraftScreen.ts`; (2) UP/DOWN menu nav
  keeps the highlight bar on the old row for 2 full ticks before jumping to
  the new one (no piecemeal reveal, single OAM move) — new
  `MenuHighlightRedrawState`; (3) `monPic.ts`'s close tables were missing
  the same front-sprite/highlight-bar 1-tick OAM lag the open tables already
  modeled, and (surprise, oracle-verified against both draft-menu.json's own
  first close and draft-menu-slot6.json's) the close's window-shrink shape
  does NOT mirror hasActed-at-close or the open variant letter — only an
  open that was variant C gets the skip+duplicate shape; A and B both close
  clean. Added Tier-1 tests for all three (monPic.test.ts 15→20,
  draftScreen.test.ts 12→16).
- **Next:** S4 — summary screen parity (draft's SUMMARY view, page
  navigation, return to draft). See `ROADMAP.md` S4 acceptance criteria.
- **Notes:** The "mirror the open variant" hypothesis for the close table
  seemed elegant but was empirically wrong — always re-verify against a
  fresh dense probe of the *specific* trace in question rather than
  generalizing from one data point, even when the generalization is
  structurally tempting.

---

## 7 — ISSUES #3 partial: slot6 every-frame trace 40/66 → 58/66

- **State:** `npm test` **110/110**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` 38/38 —
  still all 0 diff (no regressions). `draft-menu-slot6.json` (every-frame
  0-65) **58/66** (was 40/66). S2 stays `[~]` — 8 frames still differ, all
  redraw-scheduling transients (see `ISSUES.md` #3, trimmed to just these).
- **Did:** Root-caused and fixed the two clusters inside the mon-pic
  sub-state machine (`src/engine/monPic.ts`): (1) the ball-open flash bar's
  flat-vs-blended color was wrongly tied to the hasActed timing variant —
  it actually tracks a separate, session-persistent "has BLDCNT ever been
  configured" flag, now `MonPicState.blended`; (2) that same
  first-ever-open-after-a-cursor-move case needs its own window-growth
  timing table ("variant C"), pinned from dense oracle probing of
  draft-menu-slot6.json. Added 4 new hermetic Tier-1 tests (15→19) pinning
  variant C and the blend/variant decoupling.
- **Next:** Fix the remaining 3 clusters (all `Select_Task_Handle*`'s
  redraw scheduling, not mon-pic): f1-f3 cursor-move header/arrow redraw,
  f37-f38 menu-highlight redraw (likely same mechanism as f1-f3), f44/47-48
  close-phase transients. `ISSUES.md` #3 has a dedicated probing plan for
  each (isolate with single-purpose dense traces before fixing against the
  combined slot6 trace). Then tick S2 `[x]`, then S4.
- **Notes:** The end-states are already exact — only 8/66 frames differ,
  all transient (settle within 2-4 ticks); this is scheduling/timing, not
  missing mechanisms.

---

## 1 — Iteration 0: staged plan authored (supervisor)

- **State:** Baseline green (`npm test` 3/3, `npm run build` OK, oracle
  answering). `ROADMAP.md` now carries the staged plan S1–S9; no engine code
  yet. `tools/compare/traces/anchor.json` committed.
- **Did:** Verified skeleton baseline; probed the oracle (anchor = Lv-50
  single draft screen, ONIX slot 1; RIGHT/A semantics + timings observed);
  pinned the color expansion `(c<<3)|(c>>2)` against all 22 anchor colors;
  verified the dev-time RAM-inspection recipe (replay matches canonical sha
  byte-exactly; anchor `gRngValue = 0xd2ddeec8`); confirmed the per-frame
  VBlank `Random()` rule (`main.c:366`); authored ROADMAP.md stages S1–S9
  with command-backed acceptance criteria.
- **Next:** S1 via worker briefs — extraction pipeline + engine skeleton +
  `appTrace.ts` wiring, driving `npm run compare -- tools/compare/traces/
  anchor.json` to 0 diff.
- **Notes:** RAM-inspection quirks (mGBA log spam on stdout, benign exit-139
  teardown segfault) are documented in ROADMAP.md Domain notes.

---

## 0 — Run initialized

- **State:** Fresh run from the harness template. `npm test` and
  `npm run build` green on the skeleton; engine not started.
- **Did:** Template stamped by `initialize-run.sh` (see `.run.json` for the
  pinned reference revision, ROM SHA-1, and oracle bootstrap version).
- **Next:** Supervisor iteration 0 — bootstrap the plan: probe the oracle,
  survey the reference, replace `ROADMAP.md`'s PLAN PENDING section with
  staged, command-backed acceptance criteria (`SUPERVISOR.md` § "Fresh
  run"), and commit it before any implementation brief.
- **Notes:** The oracle contract and canonical-state description are in
  `bin/oracle info`. Read `AGENTS.md` before anything else.
## 2 — S1 worker: extraction + engine skeleton, anchor frame 94% pixel-exact

- **State:** `npm test` 22/22 green, `npm run build` green, `npm run dev`
  serves without errors. `npm run compare -- tools/compare/traces/
  anchor.json` → **DIFF 2161/38400px (5.63%), ssimMean=0.8171** — NOT yet
  0 diff. All 2161 diff pixels are inside the four text windows (title/
  category/species/message); BG1 chrome tilemap and the OBJ ball+arrow
  sprites are pixel-exact (verified 0 diff outside text regions).
- **Did:** Built `tools/extract/` (indexed-PNG decoder preserving raw
  palette indices — pngjs alone loses them on duplicate colors; JASC .pal
  parser; tile/tilemap decoders; charmap.txt parser) writing committed
  `src/assets/gen/*.json` + `src/data/gen/*.json` from
  `reference/pokeemerald`. Pinned the GBA color round-trip precisely:
  reference art's 8-bit RGB must go 8-bit → 5-bit (`round(v*31/255)`) → the
  oracle's real expansion (`(c<<3)|(c>>2)`), not used as-is (verified
  against real anchor-screenshot colors, e.g. interface.pal's `164,115,246`
  → oracle's actual `165,115,247`). Discovered `sPokeball_Gfx` (factory_
  screen/pokeball.png) is dead code — the real ball art is `graphics/
  starter_choose/pokeball_selection.png` (`gPokeballSelection_Gfx`); menu.png
  supplies BG1's own palette directly (not interface.pal, which is OBJ-only
  for the arrow/highlights). Built `src/engine/` (pure `tick`/`render`,
  240x160 RGBA, no DOM/timers/Math.random): `bg.ts`/`sprites.ts` tile
  compositors, `font.ts` text layout, `factoryDraftScreen.ts` assembling the
  anchor from `sSelect_WindowTemplates` + `CreateSprite` coordinates
  transcribed from `battle_factory_screen.c` (not eyeballed). Wired
  `main.ts` and `tools/compare/appTrace.ts` to the same core. Added 19 new
  Tier-1 tests (tile/tilemap decode, color round-trip, text measurement, an
  anchor-render regression pinning the current output).
- **Next:** Close the remaining 5.63% — see `ISSUES.md` #1: the font
  renderer needs `sFontHalfRowOffsets`/`GenerateFontHalfRowLookupTable`
  (`reference/pokeemerald/src/text.c:41-51,363-420,526-560`) replicated
  exactly; our current `drawText` treats source glyph pixels as directly
  selecting bg/fg/shadow, but the real renderer blends pairs of source
  nibbles through that lookup table first. Fix either in the extractor
  (bake correct bitmaps into `font-normal.json`) or in `src/engine/font.ts`
  at render time, then re-run `npm run compare` to confirm 0 diff and update
  the pinned hash in `tests/anchorRender.test.ts`.
- **Notes:** `npm run dev` checked via `curl` against the Vite dev server
  (200 on `/` and `/src/main.ts`), not a real browser — no headless browser
  was available in this session; worth a real visual check next session.
## 4 — S2 worker: cursor sweep 0-diff; menu state machine done, ball-open art not yet — S2 PARTIAL

- **State:** `npm test` 39/39 green, `npm run build` green.
  `tools/compare/traces/anchor.json` still **1/1, 0 diff** (no regression).
  `tools/compare/traces/draft-cursor.json` (new, committed) → **13/13
  frames matched, 0 diff** — full RIGHT sweep across all 6 slots with wrap,
  full LEFT sweep back with wrap. `tools/compare/traces/draft-menu.json`
  (new, committed) → **10/38 matched** — every frame outside the ball-open
  "mon pic" window is exact; diff is confined to a ~64x64px region (see
  `ISSUES.md` #2 for the full diagnosis). S2 is therefore only partially
  done; see `ROADMAP.md`'s `[~]` status line for the precise breakdown.
- **Did:** Ported `reference/pokeemerald/src/main.c`'s `ReadKeys()` JOY_NEW/
  JOY_REPEAT model exactly (`src/engine/keyRepeat.ts`: one shared repeat
  counter, 40-tick start delay, 5-tick continue delay, reset on any change
  to the held combination) - pinned against a hand-derived tick sequence in
  `tests/keyRepeat.test.ts` (fires at ticks 1, 41, 46, 51...). Wired the
  draft screen's cursor mode (`LEFT`/`RIGHT` with wrap,
  `Select_UpdateBallCursorPosition`) and menu mode (`A` opens SUMMARY/RENT/
  OTHERS with `menuCursorPos=0`, `UP`/`DOWN` navigate with wrap, `B` OR `A`
  on OTHERS closes back to cursor mode - `Select_OptionOthers` is a no-op
  cancel, confirmed from source) into `src/engine/core.ts`'s `tick()`, all
  pinned by 12 new hermetic tests in `tests/draftScreen.test.ts`. Extracted
  the 6 anchor rental-pool species' header text (species name + Pokedex
  category) via a new `tools/extract/extract-species-header.ts` reading
  `species_names.h` + `pokedex_entries.h`, replacing S1's placeholder empty
  slots 2-6 (`src/data/gen/draft-pool-header.json`). Extracted the menu
  highlight sprite pair (`menu_highlight_left/right.png`) and render the
  SUMMARY/RENT/OTHERS popup text + highlight bar when the menu is open.
  Reverse-engineered (and probed against the oracle) the exact settle
  timing for cursor moves, key-repeat, menu nav, and menu open/close - see
  `ROADMAP.md` Domain notes; also discovered idle screens only stay
  pixel-stable for ~104 frames before a previously-unknown species-name
  color pulse (`Select_Task_FadeSpeciesName`) kicks in, and kept both new
  traces safely under that.
- **Next:** The ball-open reveal (`Task_OpenMonPic`/`Task_CloseMonPic`'s
  WIN0 growth + `BG3`/`BG1`/`OBJ` alpha blend, plus the front-sprite
  extraction for ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/QUILAVA) is the one
  remaining piece for S2 - `ISSUES.md` #2 has the full mechanism, register
  values, and timing already reverse-engineered; re-run
  `draft-menu.json` (already committed with dense captures over both
  transitions, on 2 different slots) to check progress once implemented.
  After that: S3 is proceeding in a parallel worktree (rental data/RNG) -
  don't touch `src/engine/rng.ts` or `src/data/gen/rental*`/`anchor-state.json`.
- **Notes:** PAPERCUT: none this session - the oracle's dense-capture probing
  loop (`bin/oracle run <trace> -o <dir>` + comparing manifest sha256s) was
  fast and effective for reverse-engineering exact frame timing; no friction.

---

## 3 — S1 worker: font glyph fix closes the anchor compare — S1 COMPLETE

- **State:** S1 acceptance fully met. `npm run compare -- tools/compare/
  traces/anchor.json` → **1/1 frames matched, 0 diff, ssimMean=1.0000, exit
  0** (was 2161/38400px, 5.63%). `npm test` 22/22 green, `npm run build`
  green, `npm run dev` serves (curl 200 on `/` and `/src/main.ts`; still no
  real-browser check — no headless browser available in this session
  either).
- **Did:** Fixed `ISSUES.md` #1 (now deleted). Two distinct bugs in
  `src/engine/font.ts`, both pinned against `reference/pokeemerald/src/
  text.c`: (1) the raw-glyph-pixel → color role mapping was wrong — traced
  `sFontHalfRowOffsets`/`GenerateFontHalfRowLookupTable` (text.c:41-51,
  363-511) by hand and confirmed it is **not** a blend of adjacent source
  pixels (contra the ISSUES.md lead) but a per-pixel remap table (raw 0-3 →
  role bg/fg/shadow, raw 3 folds back onto role 0/bg) vectorized 4-at-a-time
  for GBA speed; also ported `GLYPH_COPY`'s "skip writing when the resolved
  color index is literal 0" transparency rule (text.c:585), replacing the
  old "raw===0 is always transparent" logic. Verified empirically against
  oracle pixel colors (text.pal index1=black=bgColor, index2=white=fgColor
  matches the observed title-text look) before committing. (2)
  `DecompressGlyph_Normal` (text.c:1883) hardcodes `gCurGlyph.height = 15`
  for Latin glyphs regardless of the 16px cell size — our render loop used
  the full `cellSize` and leaked stray bgColor pixels into the row directly
  below the title text. Added `glyphHeight` to `font-normal.json`/`FontData`
  and capped the row loop to it; re-ran the extractor (only `font-normal.
  json` changed). Updated the pinned hash in `tests/anchorRender.test.ts`
  and the `FontData` test fixture in `tests/font.test.ts`. Ticked S1 `[x]`
  in `ROADMAP.md`.
- **Next:** S2 — draft-screen interaction parity (cursor movement, header
  text, A → ball-open + SUMMARY/RENT/OTHERS menu, B/close, message-box
  updates). See `ROADMAP.md` S2 acceptance criteria. S3 (rental data/RNG)
  is running in a parallel worktree per the supervisor's scoping — don't
  touch `src/engine/rng.ts` or `src/data/gen/rental*`.
- **Notes:** No headless browser tooling (playwright/puppeteer) is
  installed in this run; `npm run dev` has only ever been curl-smoke-tested,
  not visually verified. Worth adding if a future stage needs real DOM/
  canvas verification.

---

## 5 — Supervisor: S3 merged from worktree lane — S3 COMPLETE

- **State:** Merged `worker/wt-20260717-012856` (S3: RNG core, rental data,
  anchor RAM dump) into master; on the merged tree `npm test` **91/91**
  green, `npm run build` green, `anchor.json` 1/1 and `draft-cursor.json`
  13/13 still 0 diff. Worktree + branch cleaned up. S3 ticked `[x]` in
  ROADMAP; S2 remains `[~]` with `ISSUES.md` #2 (ball-open reveal) open.
- **Did:** Verified S3 in the worktree (74/74 there; LCG constants checked
  against `random.c`; dump spot-checked: `gRngValue 0xd2ddeec8`, six
  species in pinned order with RAM-read Lv50 stats). Added the
  `sFactorySelectScreen` finding to ROADMAP Domain notes.
- **Next:** Finish S2 via `ISSUES.md` #2 (mon-pic window growth + GBA
  5-bit-space alpha blend + 6 front-sprite extraction), then S4.
- **Notes:** Statics aren't in the linker map — `nm` on the pinned ELF
  resolves them (recipe in `tools/extract/inspect-anchor.py`).

---

## 6 — Ball-open reveal landed (38/38); every-frame capture exposes transients

- **State:** `npm test` **106/106**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` **38/38**
  — all 0 diff. NEW `draft-menu-slot6.json` (every-frame captures 0-65)
  → **40/66**: the ≤4-frame-spaced traces skip transient frames that are
  not yet exact. S2 stays `[~]`; remainder is `ISSUES.md` #3 (clusters +
  diff forensics there). ISSUES #2 deleted (fixed: reveal + blend + 6 front
  sprites, monPic sub-state Tier-1-pinned).
- **Did:** Worker landed the mon-pic reveal (WIN0 growth, 5-bit-space
  blend, front-sprite extraction for all 6 species) + 15 hermetic tests;
  hit its 50-min cap while building the slot-6 trace. Supervisor verified
  all compares/tests, ran the unfinished trace, inspected diff PNGs,
  filed #3 with per-cluster diagnosis, committed the trace.
- **Next:** Fix `ISSUES.md` #3 → `draft-menu-slot6.json` 66/66, then tick
  S2 `[x]`. Then S4 (summary screen).
- **Notes:** Transient mechanisms are all in battle_factory_screen.c
  (affine open anim, redraw scheduling, close-phase sprite visibility).

---
## 12 — S4 slice 1 (worker, capped): Info-page extraction landed; renderer/traces still NOT reached — S4 stays [~]

- **State:** `npm test` **146/146** (138→146, +8 new), `npm run build`
  green. Existing traces (`anchor`, `draft-cursor`, `draft-menu`,
  `draft-menu-slot6`) untouched, still 0 diff (not re-run this session but
  no shared code was touched). **`summary-info-onix.json`/`-magby.json`
  were NOT produced** — no Info-page renderer exists yet, so there is
  nothing to capture against. `ROADMAP.md` S4 stays `[~]`.
- **Did:** Closed the slice-1 blocker the brief asked for first:
  `tools/extract/extract-summary-info.ts` extracts, for the 6 anchor
  species, National Dex number (RAM-probed `FLAG_SYS_NATIONAL_DEX` at the
  anchor to confirm National — not Hoenn — numbering applies, bit read
  back `1`/TRUE), types, and `genderRatio` from `species_info.h`, plus
  ability name+description text for every ability the pool uses, into
  `src/data/gen/summary-info.json`. Added `src/engine/monGender.ts`
  (pure port of `GetGenderFromSpeciesAndPersonality`). Both pinned in
  `tests/summaryInfo.test.ts` (8 new tests) against the anchor's real
  personality values (e.g. confirms ONIX shows male, MAGBY female).
  Then spent the remainder of the session's budget researching the
  renderer itself (window pixel geometry, text-color tables, sprite
  positions/priorities/anchoring, BG-layer reasoning, a nature-memo
  two-tone-color-code gap in `font.ts`, a few unresolved assumptions) and
  wrote it all up as `docs/summary-screen-notes.md` §7 rather than ship
  unverified rendering code with no oracle pixels behind it — building the
  actual `summaryInfoPage.ts` renderer, wiring `summaryScreen.ts`+
  `paletteFade.ts` into `core.ts` (confirmed **zero existing call sites**
  for either), and capturing/debugging the two dense traces against the
  oracle is real multi-hour work that didn't fit in what was left of this
  session's cap after the research above.
- **Next:** Follow `docs/summary-screen-notes.md` §7 directly — it's a
  resolved implementation spec, not a scouting task: (1) build
  `src/engine/summaryInfoPage.ts` (BG3 tilemap via `drawTileBg` + all
  text windows via `drawText` + type icon/markings/ball/mon-front sprites
  via `drawSprite`); (2) resolve the 4 flagged open items before trusting
  pixels — nature-memo two-tone color codes (§7's caveat), mon-sprite
  `hFlip` table membership for the 6 species, rental-mon caught-ball item
  (assumed but unverified `ITEM_POKE_BALL`), and markings anim-frame-0
  appearance; (3) wire `summaryScreen.ts`+`paletteFade.ts` into
  `core.ts`'s `EngineState`/`tick()`/`render()` per §7's exact branch
  points; (4) only then capture `summary-info-onix.json`/`-magby.json`
  (dense through both fades + the settled +59..+64 window; probe MAGBY's
  own stable window independently, don't assume ONIX's) and iterate to 0
  diff.
- **Notes:** This is the same "stop rather than ship a guessed renderer"
  call the prior slice made for the fade math — the difference this time
  is the blocker (extraction) is actually closed, and the open unknowns
  left for next time are few, named, and cheap to resolve (each is one
  more source grep), not a wide-open scouting problem. `PAPERCUT`: none
  new this session — the RAM-inspection recipe for a single save flag
  (national dex) was fast once `inspect-anchor.py`'s pattern was reused.

---
## 203 — Supervisor wind-down: session end 2026-07-20 ~20:45 — **17 worker steps verified and folded** (8 main-lane + 9 worktree scouts, 9 rounds); suite **787 → 821/821**; headlines: **the faint/forced-switch sequence is COMPLETE end to end** (ball prop through the settled turn-6 menu, tick 7307 byte-identical — six traces, three sessions' worth of blockers root-caused), **the turn-6 engine slice has begun** (submenu reopen 33/33 + FEATHER_DANCE kickoff 90/90), and **the ground-truth dossier pipeline now covers turns 6-14** (9 dossiers + 10 dense traces, every one prefix-verified against the WIN line)

- **State (verified this minute):** `npm test` **821/821**, `npm run
  build` green, tree clean, no worktrees, no unmerged branches. Engine
  traces this session: `turn5-switchin` 167→241, `turn5-healthbox` 55,
  `turn5-sitrus-{a,b,c,d}` 110/82/150/133, `turn6-menu` 33,
  `turn6-featherdance` 90 — all 0 diff, supervisor-rerun.
- **The Sitrus saga (session's centerpiece, slices L-4→M-5):** the
  materialize ramp-down "hardware quirk" fell as a corrupted coefficient
  table (degenerate palette-offset decode); the "idle bob" fell as the
  Sitrus proc's own opening rotation (AnimTask_RotateMonToSideAndRestore,
  y2 a matrix byproduct — why y-only fits failed both signs); the
  "sampler rounding gap" fell as a +2 render lag (sampler was never
  wrong); GrantingStars spawn spacing corrected 8→10 vs source (RAM
  wins); healthboxes draw above battle-anim particles
  (UpdateOamPriorityInAllHealthboxes). Sole remainder: ISSUES #26 (the
  THIN_RING, 7042-7072 excluded, 3 attempts, untried +2-lag lead).
- **Dossier pipeline discoveries (turns 6-14):** both published lines
  reconverge RNG-exactly at turn 9 (and stay converged through a
  PP-exhaustion boundary); the ATK-floor "won't go lower!" fired and a
  blocked stat change PROVABLY skips the move's animation (33-tick vs
  ~290-tick holds — engine must gate animation on effect-success);
  BIND misses at 8 Random() calls; AERIAL_ACE skips accuracy entirely;
  turn 13's faint arrives via DRAGON_BREATH with the projectile table
  bit-identical to turn 2's (ISSUES #23's exclusion covers it — no
  fresh crack needed) and the Murkrow switch-in is turn-5 machinery
  verbatim; FLY's charge half auto-misses DRAGON_BREATH at ZERO RNG
  cost (STATUS3_ON_AIR short-circuit). Five dossier slips caught and
  corrected at folds (each with supervisor PNG/pixel-diff evidence).
- **Next:** (1) slice N-3 — the feather animation's affine renderer (8
  per-tick-rotating sprites; §28 has RAM ground truth + sketch; needs a
  fresh 60-min cap); (2) rungs (c)/(d) of turn 6, then turns 7-13 as
  parameterizations; (3) turn-15+ scout (FLY strike, Onix's likely KO →
  first FORCED PLAYER SWITCH, the WIN arc); (4) ISSUES #26 ring probe;
  (5) turn6-menu's 8 excluded period-9 ticks (tested this session
  post-bounce-fix: still real, still named).
- **Notes:** no usage-limit events; zero merge conflicts across 9
  worktree merges; 3 new PAPERCUTS entries (cwd persistence — bit a
  worker AND the supervisor, trace-stitching, struct offsets); one
  supervisor brief slip (turn-12 PP) gracefully falsified by the scout;
  worker discipline strong all session (three honest reduced-scope
  stops, every one with banked findings that landed next round).

---
## 259–257 — Supervisor/worker turn-15 wind-down (archived 2026-07-22)

Historical ledger detail moved out of `PROGRESS.md` to preserve its three-entry
resume window. These entries cover the completed turn-13/14 bounce fixes and
turn-15 FLY strike/faint-text wiring; their full contemporaneous text remains
in git history immediately before corrective commits `d5ac217` and `9942a8d`.

---
## 285 — Bounded worker (S7 turn 16 rung 1): **GREEN — cross-layer handoff**

- **State:** canonical `20745--20825` and delayed `20775--20855` both
  **81/81 exact**; turn-16 verifier **233/233**, Tier-1 **1019/1019**, and
  build (**5.415 MB**) passed.
- **Did:** reset stale turn-15 choice after forced SEND OUT, restored MAGBY's
  real moveset, and added confirmation-relative submenu, bounce-freeze, and
  FAINT_ATTACK kickoff rendering with canonical/+30 traces.
- **Next at archive time:** canonical **20826** / delayed **20856**.
- **Notes:** implementation commit `de7e334`; no forbidden pixel or
  absolute-tick mechanism.

---
## 292 — Bounded worker (S7 turn 17 rung 2): **GREEN — repeated FAINT_ATTACK body exact**

- **State:** canonical `21854--22074` was **221/221 exact**, every tick
  captured; Turn-17 verifier, Tier-1, and build passed.
- **Did:** reused the confirmation-relative FAINT_ATTACK body with MAGBY
  `79→27` and explicit MURKROW `58/142 BRN`, pinning ownership ages
  `0..220` in `turn17-rung2.json`.
- **Next at archive time:** canonical **22075**, the post-hit tail.
- **Notes:** implementation commit `4dcdcaf`; no forbidden pixel or
  absolute-tick mechanism.

---
## 294 — Bounded worker (S7 turn 17 rung 4): **GREEN — lethal FIRE_PUNCH pre-write exact**

- **State:** canonical `22218--22417` was **200/200 exact**, every tick
  captured; Turn-17 rung 3 and Turn-16 rung 3 remained exact, with verifier,
  Tier-1, and build green.
- **Did:** reused the shared FIRE_PUNCH cast, parameterized MURKROW's
  `58→0 BRN` profile, and modeled lethal `CalcBarFilledPixels` behavior.
- **Next at archive time:** canonical **22418**, the atomic HP write.
- **Notes:** implementation commit `aad02b4`; no forbidden pixel or
  absolute-tick mechanism.

---
## 295 — Bounded worker (S7 turn 17 rung 5): **GREEN — lethal faint through typed gate exact**

- **State:** canonical `22418--22530` was **113/113 exact**, every tick
  captured. Turn-17 rung 4 remained **200/200**, `turn5-faint.json` remained
  **110/110**, the Turn-17 verifier passed, and Tier-1/build were green.
- **Did:** parameterized the shared FIRE_PUNCH profile for the atomic
  `58→0` write, lethal secondary RNG/no-op, seven-step opponent sink,
  healthbox+BRN teardown/status clear, faint glyph cadence, settle, and
  fully typed wait-cursor/input gate.
- **Next at archive time:** canonical **22531**, the long faint hold.
- **Notes:** implementation commit `de79bdf`; no forbidden pixel or
  absolute-tick mechanism.

---
## 296 — Bounded worker (S7 turn 17 rung 6): **GREEN — faint hold/dismiss latency exact**

- **State:** canonical `22531--22826` was gaplessly **296/296 exact** in
  adjacent dense traces (**255/255 + 41/41**). Rung 5 remained **113/113**,
  the Turn-17 verifier, Tier-1 suite, and build passed.
- **Did:** added confirmation-relative faint input readiness, stored the real
  dismiss A, froze its cursor phase, and modeled the +17 WIN write/+26
  render boundary.
- **Next at archive time:** canonical **22827**, the victory-text printer.
- **Notes:** implementation commit `ed2b46a`; no forbidden pixel or
  absolute-tick mechanism.

---
## 297 — Bounded worker (S7 turn 17 rung 7): **GREEN — outcome message through frozen second dismiss**

- **State:** canonical `22827--23228` is gaplessly **402/402 exact** in two
  adjacent dense traces (**255/255 + 147/147**). Rung 6b remains **41/41**,
  `verify-turn17.ts` passes **245/245**, Tier-1 is **1065/1065**, and build
  passes (**5.461 MB**).
- **Did:** added faint-dismiss-relative 34-glyph outcome typing, separated
  the true +59 input gate from the +61 visible cursor, stored the real
  second A once, froze its live pose, and pinned the old framebuffer through
  second-dismiss +27 / first trainer render at +28.
- **Next:** resume at **23229**, the first trainer-transition frame. The
  trainer slide, DESTIN loss-quote typing/hold, post-battle swap/round flow,
  and #38 remain untouched; S7 stays `[~]`.
- **Notes:** implementation commit `c431bb3`. Fresh RAM pins the printer's
  final glyph/state at 22860, controller hold through the A, script handoff,
  and trainer controller ownership; fresh early-A oracle sweeps pin true
  readiness. No forbidden screenshot/table, absolute-tick/trace branch,
  fitted color/coordinate, excluded capture, or thinning. Supervisor
  independently reverified both dense windows, predecessor, turn-17
  verifier, full Tier-1 suite, and production build; ROADMAP status accepted.

---
## 298 — Supervisor-accepted S7 completion: **GREEN — Battle 1 win endpoint exact**

- **State:** canonical `23229--23601` is gaplessly **373/373 exact** in two
  adjacent dense traces (**255/255 + 118/118**). Rung 7b remains **147/147**,
  `verify-turn17.ts` passes **245/245**, Tier-1 is **1067/1067**, and build
  passes (**5.462 MB**).
- **Did:** ported the source `-2px/callback` DESTIN trainer slide, retained
  the frozen outcome text/arrow through the three-frame settled pause, then
  switched to source-expanded Easy Chat loss text with exact glyph cadence,
  real `PAUSE_UNTIL_PRESS` gate, no cursor, and stable hold through 23601.
- **Next:** begin S8 only after tick **23601** with the loss-quote dismiss
  and post-battle swap/round flow. Parked/unrelated issues, including #38,
  remain untouched.
- **Notes:** implementation begins at `366234e`; a final fresh printer-RAM
  audit distinguishes glyph settle at 23279 from the real WAIT gate at
  23280. All timing is relative to the stored second outcome-dismiss edge
  and shifts under delayed-edge Tier-1 coverage. No framebuffer/screenshot
  asset, absolute-tick/trace branch, per-frame table, fitted geometry/color,
  excluded capture, or thinning. Supervisor independently reverified both
  dense windows, predecessor, turn-17 verifier, full Tier-1 suite, and
  production build; ROADMAP S7 marked complete.

---
## 304 — Supervisor-accepted S8 Battle 2 opening: **GREEN setup; pixels incomplete**

- **State:** the assigned 33030/33031 pixel endpoint is **not complete**.
  The last committed exact endpoint remains JENSON's held quote at 32031
  (**131/131**); predecessor decline remains **73/73**. Battle 2 identity,
  party, moves, room-to-scene RNG ownership, and input gates are now modeled
  and Tier-1 pinned. Full Tier-1 is **1089/1089** and build passes
  (**5.485 MB**).
- **Did:** freshly bisected quote and trainer-intro A gates; RAM-audited
  32020-33031 RNG/inBattle ownership; source-selected the sequential
  asymmetric-spiral transition; extracted Fisherman/KABUTO sprites; carried
  JENSON/KABUTO, healed `[117,138,153]`, and ONIX moves
  `[157,20,225,201]` through `EngineState`. Commits `012161f` and `d2d905f`.
- **Next:** implement the live three-circle sequential spiral, then
  encounter-parameterize Fisherman/KABUTO intro and both send-outs; compose
  the Battle 2 menu without Battle 1's harvested Grovyle base. Dense-capture
  all dynamic frames through 33030/33031 in ≤256-frame trace pieces. Stop
  before menu input. S8 stays `[ ]`.
- **Notes:** first accepted room-quote A starts at 30383 (30382 rejects);
  first accepted intro A starts at 32479 (32478 rejects). Canonical
  32031/32531 edges are delayed-valid. Setup RNG extras are
  `+50/+22/+4/+1`, selecting Frontier transition index 10; battle-scene
  elapsed zero is 32245 and in-battle freeze is 32250. No new pixel trace is
  claimed exact; no screenshot/tick lookup, fitting, or disguised chrome.
  Supervisor independently reviewed the encounter-relative setup/core path
  and reverified both predecessor traces, all 1089 Tier-1 tests, and build.

---
## 305 — Supervisor-accepted S8 Battle 2 transition: **GREEN — 32031-32279 exact**

- **State:** canonical **32031-32279** is **249/249 exact**, every frame
  captured from JENSON's held quote through the final black frame.
  `battle2-room-b.json` remains **131/131** and Battle 1 `transition.json`
  remains **206/206**. Tier-1 is **1095/1095**; build passes (**5.487 MB**).
- **Did:** encounter-parameterized the shared Frontier circle transition,
  implemented source-exact sequential asymmetric-spiral geometry/timing,
  dynamic signed-Y OAM overlap order, center blend/hold, and exit fade.
  Added dense `battle2-transition.json` and six Tier-1 pins.
- **Next:** start at **32280**, the first visible Battle 2 framebuffer;
  implement Fisherman/KABUTO intro, KABUTO and ONIX send-outs, then the
  composed Battle 2 menu. S8 stays `[ ]`.
- **Notes:** settled age 0 is 32036; gray 25-72; circle render starts
  76/92/108; final settle/blend start 140; full blend 156; fade 190; black
  201. Fresh RAM callback probe: task 7, sprite slots 10/11/12; signed-Y
  stable tie at 32162. Frame 32280 is excluded by scope. No framebuffer
  harvest, absolute-tick branch/table, fitting, or capture thinning.
  Supervisor independently reviewed the live geometry/OAM/compositor path
  and reverified all three traces, all 1095 Tier-1 tests, and build.

---
## 307 — Supervisor-accepted S8 Battle 2 opening probe: **GREEN evidence checkpoint**

- **State:** exact renderer endpoint remains **32280--32530 = 251/251**;
  canonical 33030 is documented only, not claimed pixel-exact. Tier-1 is
  **1098/1098** and build passes (**5.496 MB**).
- **Did:** replayed canonical segments 154--155 unchanged and added the
  source/RAM/OAM-ready 32531--33030 ledger in `docs/battle2-opening-notes.md`:
  JENSON handoff 32570; KABUTO ball/healthbox/species H-slide; ONIX throw,
  materialize, and menu blank/draw 32850--32856; 33030 full-HP FIGHT menu.
  Sparse app samples are exact at 32531/32533 then rank the remaining live
  gap (peak 11,210 px at 32831), without an acceptance claim or harvest.
- **Next:** implement only the ledgered live Battle-2 send-outs/menu in a
  later scoped increment; S8 stays `[ ]`.
- **Notes:** fresh RAM has `gMain.inBattle=2` throughout; no ordinary VBlank
  RNG. On-demand RNG is flat to 32893 then +1/+2/+5 at 32894/32898/32900
  (pre-turn/AI); 33030 is 3530724670 with execFlags=1. No trace/assets/runtime
  changes, screenshot lookup, tick fitting, or dynamic thinning. Supervisor
  independently reviewed the source/RAM boundary ledger and reverified all
  1098 Tier-1 tests and build.

---
## 309 — Codex launcher attribution: **GREEN — mechanical and model-authoritative**

- **State:** Codex supervisor/worker launchers now pass their resolved model
  and effort to a Codex-only commit-message hook. Hook regression tests are
  **3/3** in both this run and the factory template; Tier-1 remains
  **1099/1099** and build passes (**5.497 MB**).
- **Did:** made launcher metadata replace any guessed/manual attribution,
  added the mechanical `Agent-effort` trailer, retained `unknown` fallbacks,
  and removed attribution instructions from agent-facing Markdown. Claude
  launches do not enable the hook and retain their provider-owned attribution.
- **Next:** resume S8 at **32570** with trainer exit/ball/KABUTO materialize
  and healthbox only; do not reopen exact Battle 2 send-out text.
- **Notes:** `tools/test-codex-git-attribution.sh` proves exact replacement,
  unknown fallback, and an untouched Claude commit. Shell syntax, resolved
  launcher configs, Codex deadline tests (**3/3**), Tier-1, and build pass.

---

## 345 — S8 OFF duplicate-species rejection: **GREEN LOGIC CHECKPOINT**

- **State:** the live generic swap seam now takes the source duplicate-species
  branch, owns its exact fixture-relative input gates, closes the error, and
  reconstructs an input-gated enemy picker. S8 stays open pending dense pixel
  verification of this staged-only branch.
- **Did:** added direct OpenMonPic/error/close/restore phases, +24 message
  A/B readiness, +23 picker reconstruction, install-frame rejection, and
  first fresh input. Tier-1 pins immutable player/enemy/rentals/result,
  absent copy/round semantics, and source-relative picture ownership.
- **Next:** compare the live rendered +0..+49 staged window against the
  fixture/probe framebuffer hashes, correct any presentation offsets, and
  commit the dense deterministic verifier/trace before closing S8.
- **Notes:** Tier-1 **1267/1267**, build **5.677 MB**; existing enemy accept
  prompt **66/66 exact**. No absolute ticks, framebuffer assets, mutation,
  round ownership, or selection RNG.

---
