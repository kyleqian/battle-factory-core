# Frame catcher

A by-hand bug catcher, not a test. It plays whole ordinary Battle Factory battles twice, on our engine and on the real ROM, with the
same player choices, and compares every frame and every sound, stretch by stretch. Run it now and then over a few different battles;
nothing runs it by default.

## Run it

From `workspace/`:

```sh
tools/frame-catcher/run.sh OUTDIR TRACE.json [TRACE.json ...]
```

- `TRACE.json` is a challenge trace in the site's shape (`{challenge: {battleScene, gameplaySeed, presentationSeed, start: "draft",
  frontier}, segments: [{frames, buttons}]}`): a live player's trace from the admin API, or one made by `makeTrace.mjs`.
- `GAME=/path/to/workspace` plays another build's `src/` (for a site build: `git archive <core commit> workspace/src workspace/package.json
  | tar -x -C DIR` and link `node_modules` into `DIR/workspace`). Default: this workspace.
- `JOBS=N` battles at a time (default 3; each ROM run is one Python process). `KEEP=1` keeps the frame stores (needed by `peek.py`).
- Writes `OUTDIR/<trace name>/report.md` (ranked differences with ROM | ours | diff pictures), `findings.json`, `images/`, and
  `OUTDIR/summary.md` over all traces. Without `KEEP=1` only the differing frames stay on disk.

Make traces to run (the soak's seeded test player plays a fresh challenge; `full` explores menus, switches and cancels,
`winning-swap` plays to win and swaps):

```sh
node --experimental-strip-types --no-warnings tools/frame-catcher/makeTrace.mjs /abs/t5.json --seed 5 --scene off --policy full --battles 2
```

`t5.lines.txt` next to it holds the battle text, to pick traces that show what you want (faints, Protect, berries, weather, ...).

Look at any frames of a kept run: `python3 tools/frame-catcher/peek.py RUNDIR out.png engine:17480-17740/52 rom:18420-18680/52`.

Time: about 1 to 2 minutes per two-battle trace (engine 10 to 35 s, ROM 40 to 80 s, compare 10 to 30 s); Kyle's 50,000-frame live
round takes about 2 minutes. Five traces at once (`JOBS=5`) take as long as the slowest one. First findings: `docs/frame-catcher-2026-11-20.md`.

## How it works

1. `engineRun.mjs` replays the trace on `FactorySession` and records every frame's picture (each distinct picture once), every sound
   event (the engine's sound sink), the screen owner, and which menu waits for the player with its cursor (`engineMenus.mjs`: battle
   action / move / party menus and the party submenu, the summary, the draft cursor / menu / YES-NO, the swap screen, the GO ON
   multichoice and the swap YES/NO). It also writes what the ROM needs to play the same round: the six rentals, and per battle the
   trainer, the opponent's records, the transition, the RNG before the trainer roll and the battle RNG at the first action menu.
2. `romRun.py` (mGBA in process, no oracle server) sets the ROM up as the engine's round and drives it:
   - the draft: the six rental records and the first trainer and sets are written, and the select screen is entered again (the lab's
     own staging, `oracle/battle_lab.py`);
   - each later trainer roll: from the GO ON answer, gRngValue is held at the value that makes the ROM's own roll give the engine's
     trainer and sets (found by trying from a saved state), so the attendant's comments are the ROM's own;
   - each battle-start transition: the frame that builds the opponent's party is stepped again with a trap at
     `GetSpecialBattleTransition` that sets gRngValue for the engine's transition;
   - each battle's opponent party: personality, IVs, ability bit and stats are patched to the engine's (the ROM builds them with VBlank
     draws in between, which the engine cannot follow);
   - each battle's first turn: gRngValue and gRandomTurnNumber are written to the engine's on the frame the turn's action selection
     starts. Everything after that in the battle is the ROM's own (Frontier battles draw no VBlank RNG).

   Then the ROM is driven by the engine's choices. Every menu where the engine waited for the player is an anchor: when the ROM opens
   the same kind of menu, the engine's presses there are made again at the same frame offset from the menu's first frame, each
   checked against the engine's cursor (a press without effect is repeated; a cursor elsewhere is first steered to the engine's
   entry). Between menus the engine's presses are made again at the same offset from the last menu, never at a ROM menu. A ROM that
   waits at a text the engine's presses missed gets an A after the engine's own gap plus 4 seconds ("rescue"). Sounds come from
   `tools/audio/soundEventProbe.py`'s hybrid stepping (a frame is stepped instruction by instruction only when the music RAM changed).
3. `compare.py` cuts both runs at the matched menus into stretches and classes each one:
   - **identical**: the same pictures for the same frames, the same sounds on the same frames;
   - **timing**: every picture and sound of one side is also in the other side's stretch, only earlier, later or longer;
   - **content**: a picture or a sound one side shows that the other never shows in that stretch.

   Pictures are judged pixel by pixel: a pixel is "shown by the other side" when some frame of the other side near the same point of
   the stretch (60 frames past its ends included) has that colour at that place. So text printed faster on one side under the same
   animation is timing, while a wrong Pokemon, a missing fade or a sprite one tile off is content. The pixels never shown are cut into
   blobs, followed over frames, and grouped across stretches into ranked differences. Sounds: the (kind, id) lists of a stretch are
   aligned in order; an event with no partner is content (an event the other side plays just past the stretch's end is timing).

## What it cannot compare yet

- The ROM's re-entered draft screen fades in; the engine's starts settled. The first stretch (up to the first draft menu) is skipped.
- A start other than `draft` (`after-save`, the Lobby) and a non-fresh Factory record (symbols, heard speech) are not staged on the
  ROM; Noland's battles are not staged.
- After a divergence the ROM cannot follow the engine's choices (an unplanned ROM menu, a battle that went differently): the run stops
  there ("stuck-at-unplanned-menu") and the report covers the stretches before it. A battle that goes differently on the ROM is an
  engine bug (or a set-up gap); it shows as content differences from that point on.
- Presses between menus are replayed by frame offset: when the two sides drift apart inside a stretch, the presses that only speed
  up text land elsewhere, so long stretches are mostly timing; that is expected.
- The test player's `full` policy browses the summary's move-select mode and other corners the driver has no cursor model for
  (`steer_button`); a press there is replayed but not steered.
- Pan changes of a running sound (`pan` events) are not compared; cry pitch / length details are not checked.
