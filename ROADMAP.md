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

### [~] S4 — Summary screen parity (draft's SUMMARY view)
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
parallel. S5 may begin.

### [~] S5 — Complete the draft: rent 3, confirmations, exit sequence
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
ISSUES #7 closed and deleted. Remaining for S5: the confirm flow (3-mon
reveal + YES/NO, `docs/confirm-flow-notes.md`), the decline path, and the
exit fade into the pre-battle room + attendant dialogue
(`docs/prebattle-room-notes.md`).

### [ ] S6 — Battle bring-up: transition → first action menu, opponent exact
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

### [ ] S7 — Turn resolution: the anchor round's first battle exact
Move selection UI, turn order, damage, accuracy/crit rolls, HP-bar drain
timing, battle text, faint/switch/win — with move animations for the
movesets actually in play, added until full capture windows pass.
**Acceptance:** committed traces playing scripted turns of battle 1 pass
compare with 0 diff first at text/menu/HP checkpoints, then on full windows
as animations land (both trace sets stay committed); Tier-1 tests pin
damage/order/RNG-consumption values against a RAM dump of the same turns.

### [ ] S8 — Post-battle swap + the 7-battle round loop
Victory flow, the swap offer + factory swap screen, chaining into battles
2–7, round completion and loss endings (BP beyond the single round stays out
of scope).
**Acceptance:** committed trace winning battle 1 and traversing the swap
screen into battle 2's first action menu passes compare with 0 diff on
dense captures; Tier-1 tests pin swap logic and round-loop state.

### [ ] S9 — Breadth & robustness: arbitrary traces from the anchor
Full Lv-50 opponent/rental data breadth (sprites, moves, animations used by
the eligible pools), input-fuzz hardening.
**Acceptance:** a committed set of ≥10 varied/fuzz traces (different draft
orders, menu detours, battle lines) all pass compare with 0 diff; `npm
test`/`npm run build` green.

Stages ship in order; later stages may begin only when every earlier stage
is `[x]` or its remainder is explicitly re-scoped here by the supervisor.

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
- **Oracle limits:** maxFrames 20000, maxCaptures 256; long traces ~10-15s;
  service serializes runs (parallel workers safe).
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
