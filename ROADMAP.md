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
paletteFade.ts`, `src/engine/summaryScreen.ts`) but not yet wired into
render; the static Info page has no renderer yet (blocked on missing
type/dex-number/ability-text/gender extraction — see `PROGRESS.md` #10 and
`docs/summary-screen-notes.md` §6). No compare traces for this stage exist
yet.

### [ ] S5 — Complete the draft: rent 3, confirmations, exit sequence
RENT/OTHERS flows, ball palette change on selection, the 2nd/3rd-pick
message variants, deselection/cancel paths, final party confirmation, fade
out to the pre-battle room and the attendant dialogue up to the battle
transition trigger.
**Acceptance:** committed trace drafting slots 1/2/3 through the fade into
the pre-battle room passes compare with 0 diff on dense captures (including
the fade frames); Tier-1 tests pin the pick/cancel state machine.

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
