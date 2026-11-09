<!-- Read-only worker report (aud243d scout, 2026-11-09, Sonnet 5.5, ~2 min). Saved verbatim by the supervisor; UNVERIFIED: a design from source reading only, no probe was run. -->

# aud243d scout: ROM-side semantic input driver

**aud243d design: ROM-side semantic input driver (read-only scout, no files changed)**

**1. Where the driver lives, and which ROM symbols identify each state**
- **Where:** a closed-loop Python driver in the lab process, run once to generate a trace, then frozen as plain segments.
  - `soundEventProbe.py` already advances frame by frame in Python (`advance(seg.buttons)`) with `oracle.read_u8/u16/u32` available between frames. No debugger is needed.
  - Add `lab --drive DECISIONS.json`. It replaces the static segment loop with `while not gBattleOutcome: buttons = driver.next(oracle); advance(buttons)`.
  - It writes the executed RLE segments back as `trace.segments`. `validate_request` accepts any trace dict, so the existing `lab_replay_trace` and the audioProbeFixtures replay stay deterministic and open-loop.
  - It also writes `trace.anchors` (see section 3).
  - Pre-computed engine segments are exactly what drifts (aud243c §3). The closed loop runs only at generation time.
- **Symbols:** `oracle.symbols` parses only `pokeemerald.map`, so file-local handlers are missing.
  - Resolve them once from `reference/pokeemerald/pokeemerald.elf` with `arm-none-eabi-nm` (or plain `nm`, which worked here).
  - The player controller funcs are the **08057588** (`HandleInputChooseAction`), 08057bfc (`HandleInputChooseMove`), 08059828 (`WaitForMonSelection`) and 080597cc (`OpenPartyMenuToChooseMon`) entries.
  - `HandleInputChooseAction` also appears at 081593d8 (a different controller), so match by address, not by name.
  - Thumb addresses carry the +1 bit.
- **Controller func:** read `gBattlerControllerFuncs[0]` at 0x03005d60 (u32, mask bit 0).
  - Action menu open (ready for input): equals `HandleInputChooseAction` (cursor in `gActionSelectionCursor` 0x020244ac, u8 per battler).
  - Move menu open: equals `HandleInputChooseMove` (cursor in `gMoveSelectionCursor` 0x020244b0). A different func (`HandleInputChooseTarget`, `HandleMoveSwitching`) means a sub-state, which singles shouldn't reach.
  - Forced switch / party menu open: equals `WaitForMonSelection` and the party-menu task is live. Check that some `gTasks` (0x03005e00) entry has `func == Task_HandleChooseMonInput` (081b1370), then read `gPartyMenu.slotId`. `gPartyMenu` is at 0x0203cec8, and slotId is byte offset 9 per `struct PartyMenu`, which I read from the header. Navigate closed-loop (DOWN or UP until `slotId == target`, then A) so the party-menu layout never needs modeling.
  - Round over: `gBattleOutcome` (0x0202433a) is non-zero.
- **Early-menu guard:** the existing `_before_first_action_choices` / `ready()` pair (`gBattleBufferA[0] == CONTROLLER_CHOOSE_ACTION` and `gBattleControllerExecFlags == PLAYER_CONTROLLER_FLAG`) is a good guard against the func pointer changing a frame before the menu draws.
- **"Waiting for A" message boxes: not identified by symbol.** I did not find a single symbol for them.
  - Players' `CompleteOnInactiveTextPrinter*` funcs mean a text printer is running, and the A-wait lives in the text printer state.
  - Fallback: any frame that is not one of the three menu states gets the lab's existing idiom (A for 1 frame every 16, otherwise idle). The engine's `play()` does the same.
  - A 15-minute probe is needed to see which messages in these battles actually block (faint/switch strings, `waitbutton`).

**2. Engine-side decision list**
- Today `play()` in `soundCensusRomReplay.ts` records only RLE `inputs`. The decisions are implicit in two places.
  - The fight-menu pick (`slot`, least-used legal slot via `legalMoveBySlot`, ~line 150).
  - The forced-switch `target` (lowest legal `partyIndex`, in `until`'s `forcedSelector` branch).
- Add `decisions: {kind:'move'|'switch', slot|partyIndex, menuOpenFrame, commitFrame}[]`, relative to `frame0`, and put it in `result()`. Every action is a move (the census policy never switches voluntarily), so the list is slot picks plus forced-switch party indices.
- The ROM driver consumes the same list in order: one entry per action-menu open, plus one per forced-switch open. A forced switch is its own entry, not a turn.
- Seed 177 note: the ROM ran Toxic (slot 2) where the engine's policy would pick slot 1. That was input drift and disappears once the engine's decisions are replayed, not re-derived.
- **Engine bug blocker:** with the aud243c §4 engine bug (`Cmd_datahpupdate` never clears `HITMARKER_IGNORE_SUBSTITUTE`) unfixed, seed 177's engine decision list diverges from the ROM at turn 2. Use 224 and 552 for acceptance, or fix that first.

**3. Keeping sound comparable when menu-open frames differ**
- Anchor per decision, not per frame. The driver logs the ROM frame at each menu-open event and each A-commit event, and the engine logs the same pair (`menuOpenFrame`, `commitFrame`).
- Split sound rows into segments: `[commit_k, menuOpen_{k+1})` is "resolution k", and `[menuOpen_k, commit_k)` is "menu k".
- Compare each segment as an ordered (kind, id, pan) list using offsets relative to the segment's anchor.
  - Allow the presentation-length drift (the aud243c example is the forced switch at 2364 engine vs 6939 ROM).
  - Report the first segment whose sequence differs.
- Menu SEs (`SE_SELECT` from navigation) are input-driven, so keep them in their own bucket per menu.
  - The cursor start can differ because the ROM's `gMoveSelectionCursor` persists.
  - So compare the count of presses only after both sides' cursors are read at menu open (the engine's `fightCursor`).

**4. 2-hour plan**
1. (20 min) Add `decisions` to `play()` and `result()`. Acceptance: seed 224 ON emits roughly 3 move decisions plus 1 forced switch.
2. (40 min) Write the symbol loader, `lab --drive`, the menu state machine and the A-pulse fallback.
   - Output: frozen segments, anchors and a `gBattleOutcome` stop.
   - Acceptance: it reaches turn 3 of 224 ON. aud243c stopped at ROM frame 6946 in turn 3 on a frame-timed trace.
3. (20 min) Run `romStateTimeline.py` on the frozen trace, then `compare`.
   - Acceptance: the 224 ON/OFF and 552 hp/rng/last-move rows keep matching through the forced switch.
   - 552 previously blocked at the ROM's forced party select, so it now passes it.
4. (20 min) Sound segment diff per section 3, written to the ignored `.integration/evidence/aud243d/` dir. Acceptance: a first-differing-segment report for 224 ON, 224 OFF and 552 ON.
5. (20 min) `test_sound_event_probe_args.py` coverage for the new flag, plus the usual gates.

**Main risks**
- Local symbols come only from the ELF. Two `HandleInputChooseAction` copies exist, so match by address and check the ELF matches the ROM that `pokeemerald.gba` was built from.
- Unclassified A-wait states: a stuck loop on an unexpected blocking message. Add a no-progress watchdog (for example 600 frames without a state or HP change) that aborts with a dump.
- Step-mode speed: `--fast` (hybrid) calls `advance` per frame, so it should work, but check it. The setup alone took ~6.6 s.
- The party-menu cursor layout may not move linearly with DOWN, which is why the loop is closed.
- ROM-only prompts the engine lacks, such as the "switch Pokémon?" yes/no after an opponent faint (if the battle style isn't Set), would add ROM-only decisions and need a default of "no".

Blocked or mis-scoped: neither. I did not run the probe or build the driver; this is a design from source reading only. The worktree was left untouched.
