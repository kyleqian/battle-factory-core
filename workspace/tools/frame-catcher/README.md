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
   trainer, the opponent's records, the player's three, the transition, the RNG before the trainer roll and the battle RNG at the first
   action menu.
2. `romRun.py` (mGBA in process, no oracle server) sets the ROM up as the engine's round and drives it:
   - the draft: the six rental records and the first trainer and sets are written, and the select screen is entered again (the lab's
     own staging, `oracle/battle_lab.py`). The re-entered screen builds its six afresh from the set ids alone, with personalities of its
     own (CreateFrontierFactorySelectableMons), and the three rented become the party; so once the cursor task runs (the six were built
     one step earlier, none is half made) each is re-stored with the engine's personality and OT id as CreateMon would have built it
     (`mons.py`): gender, the ability for a species with two, shininess and Spinda's spots follow; stats, moves and item are the ROM's own
     (the nature is the same). At each battle's first turn the player's three are checked against the engine's (personality, species,
     ability bit, gender, level, HP, stats) in the set-up list. Before this, seed 6's GROWLITHE was female without Intimidate on the
     ROM and the battle drifted from its first switch-in (docs/snd2-catcher-sounds.md);
   - each later trainer roll: from the GO ON answer, gRngValue is held at the value that makes the ROM's own roll give the engine's
     trainer and sets (found by trying from a saved state), so the attendant's comments are the ROM's own;
   - each battle-start transition: the frame that builds the opponent's party is stepped again with a trap at
     `GetSpecialBattleTransition` that sets gRngValue for the engine's transition;
   - each battle's opponent party: personality, IVs, ability bit and stats are patched to the engine's (the ROM builds them with VBlank
     draws in between, which the engine cannot follow), on the frame the battle transition starts: the build can run over several
     frames, and a patch on a half-built Pokemon is overwritten when the ROM finishes it. At the first turn the whole record (species,
     experience, level, HP, stats) is checked against the engine's; a mismatch is logged in the report's set-up list;
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
   aligned in order; an event with no partner is content (an event the other side plays just past the stretch's end is timing). The ROM
   log keeps only calls that changed the m4a RAM and ours logs every call, so before comparing: a press's sound on the first frame of the
   menu it opened counts for the menu that took the press, the same sound twice on one frame counts once, and a volume change to the
   volume the music has and a cry stop after the cry is over are left out (docs/snd2-catcher-sounds.md).

Menus that open only after a printed question: the after-battle RECORD / RETIRE question and the Lobby's "record your last match?"
after a round are menus from the frame their YES/NO box is drawn (the game's own `postwinQuestionWindowVisible` /
`factoryTerminalRecordMenuDrawn`, handed to `engineMenus.mjs` by `engineRun.mjs`), as on the ROM, where `message` + `waitmessage` come
before `multichoicedefault`. The plan starts at the mount frame (frame 0), so a press on the round's very first frame is replayed.

When a sprite is in a different place on the two sides, check a frame after it has stopped moving: during a walk the two sides pass
through the same tiles at different moments (the first look at Kyle's Tuber picked a ROM frame mid-walk and missed the one-tile offset).

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
- Round 2 and later: the ROM plays round 1 itself, but round 2's draft builds the ROM's own rentals; traces are best cut in the Lobby
  after the round (docs/fcs1-catcher-sweep.md, "Catcher limits left", says what staging round 2 would take).
- The draft's YES/NO: the ROM's `Select_Task_HandleYesNo` is live about 43 frames before the cursor is set to YES
  (`battle_factory_screen.c:1850`), so the driver reads NO, steers, and the comparator then drops the ROM's A click as a steer press
  (a false "ours plays SE_SELECT" in the draft). The engine's swap-screen picker counts as a menu while it still fades in, so the
  stretch lengths around it do not compare.
