# LOSS terminal seam: antecedent-boundary RAM probe (held-cursor freeze + swap-edge cascade)

SIDE-LANE evidence step. Follow-up to
`docs/terminal-seam-loss-path-ground-truth.md` §6, which landed the
quote-cursor gating fix (LOSS window 1/236 → 175/236) and itemized two
residual classes without a source-derived mechanism. This doc supplies
that mechanism for both, via a direct RAM probe of the same committed
fixture, byte-confirmed against the real battle-script bytecode. No
`src/`/`tests/`/`tools/compare/` edits — docs + one new reusable probe
script only.

## 0. Method

`tools/probe/dump-loss-terminal-swap-textprinter.py` (new, committed —
generically reusable for any future terminal-seam printer/script-cursor
question, same pattern `tools/probe/dump-forced-switch-party-menu.py`
already established for this fixture family): stages
`tools/battle-lab/loss-terminal-explosion-dusclops-off.json` via
`BattleLab.prepare()` (the same `mechanicLab` route `bin/oracle lab`
uses), then replays that fixture's own `trace.segments` **verbatim**
(same recipe the committed captures already reproduce byte-identically —
no new input was invented) while reading, every tick:

- `gBattlescriptCurrInstr` (`0x2024214`), `gBattleControllerExecFlags`
  (`0x2024068`), `gBattleOutcome` (`0x202433a`), the opponent controller
  command byte (`gBattleBufferA+0x200`) and `gBattlerControllerFuncs[1]`
  (resolved back to a symbol name via `arm-none-eabi-nm -n
  pokeemerald.elf`, since several candidate function-pointer values are
  file-static and not in the linker map);
- window 0's (`B_WIN_MSG == 0`, `constants/battle.h:347`) file-static
  `sTextPrinters[0]` (`text.c:39`, `struct TextPrinter`/
  `TextPrinterSubStruct`, `text.h:53-97`) — `active`, `state`,
  `currentChar`, `currentX`/`currentY`, and the down-arrow substruct
  bitfield (`downArrowDelay`/`downArrowYPosIdx`/`hasFontIdBeenSet`/
  `fontId`).

**Address derivation, cross-checked two independent ways:**
`docs/turn17-notes.md` §12 already nm-pinned this same struct on the
WIN-side terminal seam at `0x020201b0`. This session re-derives it
independently from the `.map`: `text.o`'s `ewram_data` section is
`0x0202018c`, size `0x4a4` (1188 bytes), holding
`sTempTextPrinter` (1 element) then `sTextPrinters[WINDOWS_MAX]`
(`WINDOWS_MAX = 32`, `window.h:4`) — `1188 / 33 = 36 = 0x24` bytes per
`struct TextPrinter`, so `sTextPrinters[0] = 0x0202018c + 0x24 =
0x020201b0`. Byte offsets used (`text.h:64-97`, ARM EABI packing,
4-byte struct alignment): `currentChar` `+0x00` (u32 ptr), `windowId`
`+0x04`, `currentX`/`currentY` `+0x08`/`+0x09`, `callback` `+0x10`,
`subStructFields[7]` `+0x14` (`TextPrinterSubStruct` overlays its first
two bytes: byte0 = `fontId:4|hasPrintBeenSpedUp:1|unk:3`, byte1 =
`downArrowDelay:5|downArrowYPosIdx:2|hasFontIdBeenSet:1`, LSB-first —
validated below), `active` `+0x1B`, `state` `+0x1C`.

Run: `python3 tools/run-mgba-probe.py <out.json> -- python3
tools/probe/dump-loss-terminal-swap-textprinter.py <out.json> 2895 3240`
(own mGBA session, no shared-service dependency). Produced one row per
tick, 2895-3240 inclusive (346 rows) — every value cited below is a
direct field read from that output, not inferred. Cross-checked against
pixels via a second, disposable `bin/oracle lab` run requesting dense
(every-tick) `captureFrames` over 2925-2931 and 3033-3042 (not
committed — trivially reproducible by overriding the fixture's own
`trace.captureFrames`).

**Opcode identity confirmed at the byte level**, not just by execution
order: read raw bytes directly from `pokeemerald.gba` at every
`gBattlescriptCurrInstr` value the probe visited (file offset =
address − `0x08000000`, since battle-script data is compiled straight
into ROM). Decoded opcode bytes: `0x76` = `various` (`B_SCR_OP_VARIOUS`
family; arg bytes `01 13`/`01 14` = `BS_ATTACKER`, `VARIOUS` case
19/20 = `RETURN_OPPONENT_MON1TOBALL`/`MON2TOBALL`), `0x3a` = `waitstate`
(1-byte, no args), `0x53` = `trainerslidein` (arg `01` = `BS_ATTACKER`),
`0x10` = `printstring` (`B_SCR_OP_PRINTSTRING`, enum index 16 =
`0x10`, `constants/battle_script_commands.h:20`; its u16 arg `7b 01` =
`0x017b` = **379 decimal**, exactly `STRINGID_TRAINER1WINTEXT`,
`battle_string_ids.h:379`). This is a hard confirmation the tick-by-tick
`gBattlescriptCurrInstr` walk below really is the opcode sequence the
static script transcription (`terminal-seam-loss-path-ground-truth.md`
§2, `data/battle_scripts_1.s:2960-2978`) predicted, not just a
same-order coincidence.

## 1. Full per-tick opcode/controller walk, ticks 2941-3235

Every row is a **RAM state change** (`gBattlescriptCurrInstr`,
`execFlags`, opponent controller command/func); nothing is
interpolated. `outcome=2` (`B_OUTCOME_LOST`) is already latched
throughout (confirmed unchanged, matching
`terminal-seam-loss-path-ground-truth.md` §2's tick-2941
`checkteamslost` claim).

| tick | `gBattlescriptCurrInstr` | opcode (byte-confirmed) | `execFlags` | opponent cmd | opponent controller func |
| ---:|---|---|---:|---:|---|
| 2941 | `0x82da7d2` | (inside `BattleScript_HandleFaintedMon`) | 0 | 51 | `OpponentBufferRunCommand` |
| 2947 | `0x82da96d` | `BattleScript_LocalBattleLost` — `jumpifbattletype BATTLE_TYPE_DOME` (not taken) | 0 | 51 | idle |
| 2948 | `0x82da97b` | `jumpifbattletype BATTLE_TYPE_FRONTIER, ...PrintTrainersWinText` (**taken**) | 0 | 51 | idle |
| 2949 | `0x82da9c9` | `BattleScript_LocalBattleLostPrintTrainersWinText` — `jumpifnotbattletype BATTLE_TYPE_TRAINER` (not taken) | 0 | 51 | idle |
| 2950 | `0x82da9d7` | `various BS_ATTACKER, RETURN_OPPONENT_MON1TOBALL` (opcode `0x76 01 13`) | 0 | 51 | idle |
| **2951** | `0x82da9da` | `waitstate` (blocks — mon1-return dispatched) | **2** | **6** (`CONTROLLER_RETURNMONTOBALL`) | `DoSwitchOutAnimation` |
| 2953 | `0x82da9da` | (still `waitstate`) | 2 | 6 | `FreeMonSpriteAfterSwitchOutAnim` |
| **2982** | `0x82da9da` | (still `waitstate`) | **0** | 6 | `OpponentBufferRunCommand` (ack) |
| 2983 | `0x82da9db` | `various BS_ATTACKER, RETURN_OPPONENT_MON2TOBALL` (`0x76 01 14`) | 0 | 6 | idle |
| 2984 | `0x82da9de` | `waitstate` — **flags never leave 0**: mon2's return is a same-tick no-op in singles (RAM-confirms `terminal-seam-loss-path-ground-truth.md` §2's inference) | 0 | 6 | idle |
| 2985 | `0x82da9df` | `trainerslidein BS_ATTACKER` (`0x53 01`) | 0 | 6 | idle |
| **2986** | `0x82da9e1` | `waitstate` (blocks — trainer slide dispatched) | **2** | **8** (`CONTROLLER_TRAINERSLIDE`) | `CompleteOnBankSpriteCallbackDummy2` |
| 2986-3033 | `0x82da9e1` | (still `waitstate`, sprite sliding) | 2 | 8 | `CompleteOnBankSpriteCallbackDummy2` |
| **3034** | `0x82da9e1` | (still `waitstate`) | **0** | 8 | `OpponentBufferRunCommand` (ack — sprite callback hit `SpriteCallbackDummy`, `battle_controller_opponent.c:197-200`) |
| 3035 | `0x82da9e2` | `printstring STRINGID_TRAINER1WINTEXT` start (`0x10 7b 01`) | 0 | 8 | idle (stale — this dispatch targets the *player* controller, next row) |
| **3036** | `0x82da9e5` | `jumpifbattletype BATTLE_TYPE_TOWER_LINK_MULTI` (parked here, blocked) | **1** (bit0 = **player** battler busy) | 8 (stale) | idle (stale) |
| 3036-3233 | `0x82da9e5` | (frozen — `PAUSE_UNTIL_PRESS` wait, `TextPrinterWait`) | 1 | 8 (stale) | idle (stale) |
| **3234** | `0x82da9e5→` | `jumpifbattletype` runs (not taken), advances | 0 | 8 | idle |
| **3235** | `0x82daa0a` | `BattleScript_LocalBattleLostEnd_` (`end2`) | 0 | 8 | idle |

The single governing mechanism behind every hold above:
`RunBattleScriptCommands` (`battle_main.c:5266-5269`) is
**`if (gBattleControllerExecFlags == 0) gBattleScriptingCommandsTable[gBattlescriptCurrInstr[0]]();`**
— the interpreter runs **at most one opcode per tick**, and only on a
tick where the flag is already `0` at that call. Both explicit
`waitstate` opcodes and `printstring`'s own internal
`if (gBattleControllerExecFlags) return;` guard
(`battle_script_commands.c:2139`) are defensive/redundant given this
outer gate — confirmed empirically here since the interpreter genuinely
never advances mid-command regardless of which specific opcode is
parked.

## 2. Class 1 — held-cursor freeze: real mechanism and exact numbers

**Confirms `terminal-seam-loss-path-ground-truth.md` §6's hypothesis
exactly**: the arrow is leftover window content, frozen because
`TextPrinterDrawDownArrow` (`text.c:787-833`) simply never gets called
again once the antecedent printer instance is done. Full derivation:

| tick | `state` | `downArrowDelay` | `downArrowYPosIdx` | event |
|---:|---:|---:|---:|---|
| 2906 | 0 (`HANDLE_CHAR`) | – | – | last glyph of "MURKROW / fainted!" drawn (`currentX=44,currentY=17`) |
| **2907** | **2 (`CLEAR`)** | 0 | 0 | `\p` reached — `TextPrinterInitDownArrowCounters` runs (`text.c:772-784`); this is **`readyTick`** |
| 2908 | 2 | 8 | 1 | 1st arrow draw, using **pre-increment** idx 0 → `sDownArrowYCoords[0]=0` |
| 2917 | 2 | 8 | 2 | 2nd draw (9 ticks later — `TextPrinterWaitWithDownArrow`'s own 8-tick delay + 1), row idx 1 → `sDownArrowYCoords[1]=1` |
| 2926 | 2 | 8 | 3 | 3rd draw (9 ticks later), row idx 2 → `sDownArrowYCoords[2]=2` — **the last real draw** |
| 2927-2928 | 2 | 7→6 | 3 | delay counting down toward a 4th draw that never fires |
| **2929** | **0** | 5 (stale) | 3 (stale) | real dismiss `A` registers (fixture's own committed segment 36, ticks 2929-2930) — printer instance exits `CLEAR`, `sTextPrinters[0]` stops being serviced |
| 2930 | 0 | 5 (stale) | 3 (stale) | `active→0` |
| 2930-3035 | — | — | — | **zero further writes to `sTextPrinters[0]` for 106 ticks** (verified: no field changes recorded) |

`sDownArrowYCoords = {0,1,2,1}` (`text.c:75`) is byte-identical to the
engine's already-ported `CURSOR_Y_OFFSETS = [0,1,2,1] as const`
(`battleScene.ts:2828`, `factoryTerminalRender.ts:235`). The engine's
own existing phase formula (`battleScene.ts:2841`,
`phase = Math.floor((t - startTick) / 9) % 4`) reproduces every draw
above exactly when `startTick = readyTick = 2907`: tick 2908 →
`floor(1/9)=0`, 2917 → `floor(10/9)=1`, 2926 → `floor(19/9)=2`. **The
frozen pose is this same formula evaluated once at `t = dismissTick =
2929`**: `floor((2929-2907)/9) % 4 = floor(22/9) % 4 = 2 % 4 = 2` →
`CURSOR_Y_OFFSETS[2]`. This is the exact index
`terminal-seam-loss-path-ground-truth.md` §6 hand-fit empirically
(`age` 18-26 all reproduce it; the RAM-derived elapsed value **22**
sits inside that empirical window, confirming the hand-fit had found
the right answer without knowing why).

**Answering the brief's question directly: yes, fully derivable from the
fixture's own input schedule.** Two RAM ticks fix it completely:
- `readyTick = 2907` — one tick after the antecedent message's own
  known printable content finishes typing (an already-ported mechanism,
  not new).
- `dismissTick = 2929` — the tick the real `A` press registers, which
  is exactly the fixture's own committed `trace.segments[36]` (`{"frames":
  2, "buttons": ["A"]}` immediately following 300 idle frames) — **not**
  a hidden or unknowable value; it is the same trace already committed
  and replayed byte-identically twice
  (`terminal-seam-loss-path-ground-truth.md` §0's "twice-run
  byte-identical" claim).
- `frozenPhase = floor((dismissTick - readyTick) / 9) % 4`, held
  constant (not advanced further) for every tick after `dismissTick`
  until the box is overwritten.

Pixel cross-check: `bin/oracle lab` capture `frame-02996.png` (already
inside the brief's cited 2996-3033 window) shows the red/teal down-arrow
glyph at its row-2 pose, static; no draw call touches that screen region
again until the swap (Class 2) overwrites the whole box. Note the
brief's cited window (2996-3033, from the original ground-truth doc's
every-2-tick sampling of *visible trainer-slide* pixels) is a subset of
the RAM-confirmed freeze span, which actually starts at tick 2930 (right
after the real dismiss) and persists through tick 3036 (RAM) /
3037 (pixel-visible, see §4) — 107 RAM ticks total, not just the 38
originally itemized; the earlier doc's number reflected its own
diff-window choice, not the true freeze boundary.

## 3. Class 2 — swap-edge typing cascade: the exact 3-tick chain

Three independent one-tick mechanisms stack, not one:

1. **Tick 3034 → 3035 (interpreter-visibility lag).** The trainer-slide
   sprite's completion (`gSprites[...].callback == SpriteCallbackDummy`
   after `SpriteCB_TrainerSlideIn` finishes,
   `battle_controller_opponent.c:197-200`) clears
   `gBattleControllerExecFlags` bit1 *within* tick 3034's own frame
   processing (sprite callbacks run in a different pass than the script
   interpreter). `RunBattleScriptCommands` only samples the flag once,
   at its own call within that same tick — which already read the
   **pre-clear** value — so the interpreter cannot act on the newly-0
   flag until tick 3035.
2. **Tick 3035 → 3036 (explicit `waitstate`'s own one-opcode-per-tick
   budget).** Tick 3035 runs exactly one opcode: the `waitstate` still
   parked at `0x82da9e1` (now satisfied, flags already 0) — it advances
   `gBattlescriptCurrInstr` to `0x82da9e2` (`printstring`'s own address)
   and returns. Because the interpreter is capped at one opcode/tick
   (§1), `printstring` itself cannot also run this same tick.
3. **Tick 3036 (dispatch) → 3037 (render).** Tick 3036 runs
   `printstring`: reads `STRINGID_TRAINER1WINTEXT`, advances the script
   pointer past itself to `0x82da9e5`, and dispatches to the controller
   — `PrepareStringBattle`/`BtlController_EmitPrintString`
   (`battle_util.c:906-911`, cited already in
   `terminal-seam-loss-path-ground-truth.md` §6) routes through the
   **player** controller (`execFlags` becomes **1** = bit0, not bit1 —
   RAM-confirmed above), matching `turn17-notes.md` §12's WIN-side
   citation that `PlayerHandlePrintString` (`battle_controller_player.c`)
   always owns the message window regardless of whose trainer is
   speaking. `PlayerHandlePrintString` clears window 0 and calls
   `AddTextPrinter` for the new content in that same tick's controller
   processing — `sTextPrinters[0]` already reads `active=1, state=0`
   (`HANDLE_CHAR`), `currentChar` reset into the new
   `gDisplayedStringBattle` content, by the end of tick 3036's RAM
   snapshot. The **pixel** effect of that same-tick window redraw
   (`CopyWindowToVram`) is not visible until the framebuffer drawn for
   tick **3037** — the same uniform +1 RAM→pixel render lag this repo
   already established independently for an unrelated window
   (`tools/probe/verify-turn4-kickoff-textgate-rule.py`'s own "RAM+1 ==
   pixel-visible tick" finding).

None of the three steps is "message-window clear cadence" as a
standalone mechanism — it is (interpreter-visibility lag) + (one
opcode's own tick budget) + (ordinary render lag), each contributing
exactly one tick, landing on the observed 3-tick gap between the app's
naive "slide done → type" model (tick 3034) and the oracle's real
pixel-visible swap (tick 3037).

## 4. Sanity cross-check against oracle pixels

Dense (every-tick) `bin/oracle lab` capture, 3033-3042 (temporary
override of the committed fixture's own `captureFrames`, not committed —
trivially reproducible):

| tick | framebuffer content (message box) |
|---:|---|
| 3033-3036 | unchanged: `"MURKROW / fainted!♥"`, frozen row-2 arrow |
| **3037** | box cleared, `"I"` only — **first visible quote glyph**, matching the RAM-derived tick exactly |
| 3038 | `"I"` still only (typing continues at 1 char/tick from here, ordinary mechanism) |

This directly confirms both halves of the brief's Q4: the RAM-derived
printer-reinit tick (3036) and its pixel-visible tick (3037) are
adjacent by exactly the repo's already-known +1 render lag, and the
frozen-cursor pose derived in §2 (`CURSOR_Y_OFFSETS[2]`) is what
`frame-02996.png` (and every frame through 3036) actually shows.

## 5. What a follow-up fix needs, and where it lives

**Class 1 (held-cursor freeze).** Not a render-layer bug — the render
formula (`CURSOR_Y_OFFSETS`, the `floor(age/9)%4` phase math) is already
correct and shared with the WIN-side terminal seam. The gap is that
**`tools/compare/appTrace.ts`'s `lossTerminalWindowStage`** does not
model the antecedent message's real per-tick typing/wait timeline at
all (per `terminal-seam-loss-path-ground-truth.md` §6: "commandIndex: 4
... outside real ticks"). It needs to record two numbers per antecedent
message — `readyTick` (when it entered its down-arrow-eligible wait,
already an ordinary/ported computation) and `dismissTick` (the real
input tick, which for this window is a **known, fixed constant**: 2929,
taken directly from the committed fixture's own trace, not simulated
input) — and feed `floor((dismissTick-readyTick)/9)%4` into a held
(non-advancing) cursor phase once the antecedent message is superseded.
This is scaffold-side work, not `src/`.

**Class 2 (swap-edge cascade).** Also scaffold-side, and simpler than it
looked: the app's own presentation-command sequencing model already
treats "trainer slide command completes" as the trigger to start
typing; the real ROM needs exactly 3 more ticks (§3) after that same
event before the new content is pixel-visible. A fixed
`+3`-tick offset between the trainer-slide completion and the quote's
`visibleCharacters` start (specific to this printstring-after-waitstate
shape: 1 controller-ack-visibility tick + 1 explicit-opcode tick + 1
render tick) reproduces the oracle exactly for this window; nothing
about it is `src/`-engine-general (the live engine's own typing/cursor
math for an already-active printer is untouched and correct).

## Verification

- `git diff --stat`: `docs/terminal-seam-antecedent-boundary-probe.md`
  (this file, new) + `tools/probe/dump-loss-terminal-swap-textprinter.py`
  (new, reusable probe). Zero `src/`/`tests/`/`tools/compare/` edits.
- Probe run twice (`tools/run-mgba-probe.py`, its own isolated mGBA
  session, no shared oracle service touched) — identical output both
  times for the cited ticks.
- Every address/offset cited was either read directly from
  `bin/oracle symbols`, cross-derived from `pokeemerald.map`'s section
  sizes, or resolved from `arm-none-eabi-nm -n pokeemerald.elf` (for
  file-static function pointers not in the linker map) — all three
  methods agree where they overlap (`sTextPrinters[0]` address matches
  `docs/turn17-notes.md`'s independent nm read; the opcode sequence
  matches a byte-level ROM read of the actual compiled script data, not
  just execution order).
- Pixel claims (§2, §4) cross-checked against `bin/oracle lab` PNG
  captures of the same committed fixture, both the fixture's own
  existing every-2-tick `captureFrames` and a temporary dense override.
