# Battle-message hold cadence ground truth (ISSUES #77)

Ground-truth scout for ISSUES #77: live-play battle messages ("It's super
effective!" etc.) flash for a fraction of a second in the app, while the real
game holds them on a fixed cadence. This doc pins the source constants, the
exact `Cmd_waitmessage`/`Cmd_pause` semantics, one dense Battle-Scene-OFF
oracle receipt over a super-effective + not-very-effective hit pair, and a
concrete bind plan a MAIN worker can execute without re-deriving anything.

Everything below was measured twice fresh (two independent oracle runs of the
same staged trace) and the two runs are **byte-identical**: 638/638 PNG
`sha256`s and all semantic state equal. The measurement is therefore
deterministic for this staged trace.

Scratch trace: `tools/battle-lab/scratch-message-hold-dense-probe.json`
(commit-reduced capture list — the oracle caps one request at 256 captures,
so the dense 25..660 sweep was split into three identical-segment chunk runs;
the committed trace's `captureFrames` re-cover every message boundary frame).
Per-frame analysis helper: `tools/probe/analyze-message-box.py`.

---

## 1. Source constants

| Constant | Value | Source |
| --- | --- | --- |
| `B_WAIT_TIME_LONG` | **64** frames | `reference/pokeemerald/include/constants/battle.h:324` |
| `B_WAIT_TIME_MED` | **48** frames | `reference/pokeemerald/include/constants/battle.h:325` |
| `B_WAIT_TIME_SHORT` | **32** frames | `reference/pokeemerald/include/constants/battle.h:326` |

Battle text typing speed (glyphs per frame) is the player's Options text
speed, NOT a battle constant:

| Text speed option | `optionsTextSpeed` | Glyph delay (frames) |
| --- | --- | --- |
| SLOW | 0 | 8 |
| MID | 1 | 4 |
| FAST | 2 | 1 |

`sTextSpeedFrameDelays` (`reference/pokeemerald/src/menu.c:77-82`),
`GetPlayerTextSpeedDelay` (`menu.c:481-488`), applied to the battle message
window at `BattlePutTextOnWindow` (`reference/pokeemerald/src/battle_message.c:3007-3016`).
**The canonical bootstrap save runs FAST (1 frame/glyph)** — confirmed by the
measured schedule below (every message types exactly ~1 glyph/frame).

---

## 2. `Cmd_waitmessage` / `Cmd_pause` semantics (file:line)

`Cmd_waitmessage` (`reference/pokeemerald/src/battle_script_commands.c:2159-2178`):

```c
if (gBattleControllerExecFlags == 0) {
    if (!gBattleCommunication[MSG_DISPLAY]) gBattlescriptCurrInstr += 3; // no message -> skip wait
    else {
        u16 toWait = T2_READ_16(gBattlescriptCurrInstr + 1);
        if (++gPauseCounterBattle >= toWait) {            // one increment per script tick
            gPauseCounterBattle = 0;
            gBattlescriptCurrInstr += 3;
            gBattleCommunication[MSG_DISPLAY] = 0;        // "logical" hold over, box stays drawn
        }
    }
}
```

Key semantics, each confirmed against the oracle schedule:

1. **The countdown starts at print completion, not at `printstring`.**
   `Cmd_printstring` (`battle_script_commands.c:2137-2146`) emits a controller
   print command and sets `MSG_DISPLAY=1`. The print-string controller prints
   one glyph/frame and only completes when the text printer is inactive
   (`OpponentHandlePrintString` installs `CompleteOnInactiveTextPrinter`,
   `battle_controller_opponent.c:1522-1533,434-438`; same shape on the player
   side). While any controller is busy, `gBattleControllerExecFlags != 0`, so
   `Cmd_waitmessage` returns without counting (line 2161). **The 64-tick
   countdown therefore runs *after* the last glyph lands — typing time is not
   part of the wait.** This matches the measured "post-typing hold = 64"
   numbers in §4 exactly.
2. **The countdown is exactly `toWait` script ticks** (one increment per
   frame, line 2170), with no button-skip and no printer re-check. A press
   during the hold does nothing to it.
3. **`MSG_DISPLAY` clearing is logical, not visual.** When the counter
   reaches `toWait`, the *script* proceeds, but the message box is not wiped —
   the box keeps showing the last message until the next `printstring` wipes
   it (`BattlePutTextOnWindow`'s `FillWindowPixelBuffer`, `battle_message.c:2972`).
   So the real *visual* hold = `B_WAIT_TIME_*` + whatever script steps follow
   (moveend/turn-end), until the next box repaint. Measured in §4.
4. **`Cmd_pause`** (`battle_script_commands.c:3914-3925`) is the same
   unconditional tick counter (`++gPauseCounterBattle >= value`), gated only
   on `gBattleControllerExecFlags == 0`, with no `MSG_DISPLAY` dependency —
   it paces script steps (e.g. the miss path's `pause B_WAIT_TIME_SHORT`)
   rather than holding a message.

The kernel already mirrors all of this: `B_SCR_OP_WAITMESSAGE` /
`B_SCR_OP_PAUSE` handlers in
`src/engine/battleScriptSourceCommands.ts:968-1016` gate on
`ports.isControllerIdle` (the `gBattleControllerExecFlags` mirror) and track
`scheduler.messageDisplayActive` / `scheduler.pauseCounterBattle` in
`src/engine/battleScriptMachine.ts:154-155`. The kernel is not the problem;
the live presentation drops the wait (see §5).

## 3. Message classes on the standard hit chain and their waits

`BattleScript_EffectHit` — the standard damaging-hit chain
(`reference/pokeemerald/data/battle_scripts_1.s:236-267`):

```
BattleScript_EffectHit:::
  attackcanceler
  accuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE   ; :244
  attackstring                                               ; prints "{B_ATK_NAME_WITH_PREFIX} used\n{B_BUFF2}"
  ppreduce
  critcalc / damagecalc / typecalc / adjustnormaldamage
  attackanimation / waitanimation                            ; Scene OFF still consumes controller time
  effectivenesssound / hitanimation / waitstate
  healthbarupdate BS_TARGET / datahpupdate BS_TARGET
  critmessage                                                ; prints STRINGID_CRITICALHIT if crit
  waitmessage B_WAIT_TIME_LONG                               ; :262
  resultmessage                                              ; prints STRINGID_SUPEREFFECTIVE / NOTVERYEFFECTIVE / ...
  waitmessage B_WAIT_TIME_LONG                               ; :264
  seteffectwithchance
  tryfaintmon BS_TARGET
BattleScript_MoveEnd:::
```

| Message class | Printed by | Wait after it | Value |
| --- | --- | --- | --- |
| "X used Y!" (STRINGID_USEDMOVE) | `Cmd_attackstring` (`battle_script_commands.c:1191-1203`, sets `MSG_DISPLAY=0`) | **none** — held by animation+HP time, then replaced | — |
| "A critical hit!" (STRINGID_CRITICALHIT) | `Cmd_critmessage` (`:1989-1999`, sets `MSG_DISPLAY=1`) | `waitmessage B_WAIT_TIME_LONG` (`battle_scripts_1.s:262`) | 64 |
| "It's super effective!" (STRINGID_SUPEREFFECTIVE) / "It's not very effective…" (STRINGID_NOTVERYEFFECTIVE) / one-hit-KO / endured / failed / "doesn't affect" lines | `Cmd_resultmessage` (`battle_script_commands.c:2049-2135`, effectiveness ids at `:2065-2082`, sets `MSG_DISPLAY=1`) | `waitmessage B_WAIT_TIME_LONG` (`battle_scripts_1.s:264`) | 64 |
| **No** result line for a plain neutral hit with no flags | `Cmd_resultmessage` default branch (`:2124-2127`, `MSG_DISPLAY=0`, no print) | — | — |

Miss path for reference (`BattleScript_PrintMoveMissed`,
`battle_scripts_1.s:271-282`): `attackstring` → `ppreduce` → **`pause
B_WAIT_TIME_SHORT`** (`:277`, 32) → `effectivenesssound` → `resultmessage` →
`waitmessage B_WAIT_TIME_LONG`. So the SHORT wait is a *pacing pause* on the
miss path, not a message hold; the miss result line still holds LONG.

Note on `canABSpeedUpPrint` (`battle_message.c:3016`): an A press during
typing can fast-forward the printer, but none of the standard hit-chain
messages are button-gated to *advance* — the box auto-advances on
`waitmessage`. The app's `advance: "automatic"` for these ids is correct
(`battleResolutionPresentation.ts:2683-2688`).

## 4. Measured oracle schedule (Battle Scene OFF, dense every-frame)

Staged `mechanicLab overrides.parties` (three complete legal Pokémon/side),
Battle Scene OFF, `profile: "battle-scene-off"`, seed 1:
`tools/battle-lab/scratch-message-hold-dense-probe.json`.

- Player lead **LOMBRE (296)**, all four slots **WATER GUN** (move 55,
  `EFFECT_HIT`, power 40, accuracy 100 — `data/battle_moves.h:718-726`).
- Opponent lead **NOSEPASS (320, pure Rock)**, all four slots **EARTHQUAKE**
  (move 89) to constrain the Factory AI to one legal choice.
- LOMBRE speed 70 > NOSEPASS 50, so the player acts first and one turn
  produces **both** a super-effective line and a not-very-effective line.
- WATER GUN is 2x on Rock (not 4x), so it does 36-42 of NOSEPASS's 105 HP
  (no KO); EARTHQUAKE is 0.5x on Grass/Water LOMBRE, 18-21 of 135 (no KO).
  Neither side faints and no secondary effect fires — a clean, two-message
  turn.
- Trace input: `A`(2) + 30 idle + `A`(2) + idle — the standard
  fight-menu-commit pattern used by every committed hit-chain scenario.

Per-message boundaries (frame = oracle trace frame; the battle starts at the
Fight menu, so frame 0 already has the menu open; the first `A` at 0-1
commits the player's move):

| Message | First-glyph | Last-glyph | Typing | Stable hold | Next box change | Hold after typing | Total on box |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| "LOMBRE used WATER GUN!" (attackstring) | 44 | 64 | 21 | 65–182 | 183 (replaced) | 118 | 139 (44→182) |
| "It's super effective!" (resultmessage) | 183 | 203 | 21 | 204–280 | 281 (replaced) | **77 = 64 + 13** | 98 (183→280) |
| "NOSEPASS used EARTHQUAKE!" (attackstring) | 281 | 308 | 28 | 309–416 | 417 (replaced) | 108 | 136 (281→416) |
| "It's not very effective…" (resultmessage) | 417 | 440 | 24 | 441–506 | 507 (box cleared) | **66 = 64 + 2** | 90 (417→506) |

Turn-end aftermath: opponent HP lands 105→70 during frame 179 (inside the
"used" hold, `Cmd_datahpupdate`); player HP lands 135→116 at frame 413
(inside the opponent "used" hold). After the not-very-effective line the box
is cleared at frame 507, the Fight menu opens (`playerControllerCommand` 18)
at frame 522, and the menu UI is drawn at frame 527 — the next input-ready
state.

What the numbers prove:

1. **Post-typing hold for both `waitmessage B_WAIT_TIME_LONG` lines is
   exactly 64 frames plus a small turn-end remainder** (13 and 2 frames), and
   the box then *keeps showing the text* until the next event wipes it. The
   effective on-box time for "It's super effective!" is **98 frames**; for
   "It's not very effective…" **90 frames**.
2. **The two `attackstring` boxes are NOT wait-gated**: their 118/108-frame
   holds are the Scene-OFF move execution (skipped attack/hit animation
   controller lifetime + health-bar drain). They are replaced, not cleared,
   by the following result message.
3. **Typing is 1 glyph/frame** — the source strings are `"It's super
   effective!"` (21 glyphs → 21 frames, `battle_message.c:317`), `"It's not
   very effective…"` (24 glyphs incl. the single U+2026 ellipsis → 24 frames,
   `battle_message.c:316`), and `"NOSEPASS used EARTHQUAKE!"` (25 glyphs → 28
   frames, the extra 3 being space-glyph/cursor frames). Consistent with
   Options text speed FAST.
4. Determinism: the whole 638-frame dense sweep re-run fresh is byte-identical
   (PNG `sha256` + semantic state).

## 5. App seam: where the live route drops the wait (read-only findings)

The live play route drives `battleResolutionPresentation` from the kernel's
semantic event stream:

- **Seam (the bug):** `projectBattleResolutionCommands`
  (`src/engine/battleResolutionPresentation.ts:2594`) picks a message's
  timing at **`battleResolutionPresentation.ts:2690-2692`**:
  ```ts
  timing: STAT_CHANGE_MESSAGE_IDS.has(payload.messageId)
    ? STAT_CHANGE_MESSAGE_TIMING   // { minimumFrames: 24, holdFrames: 64 }
    : MESSAGE_TIMING,              // { minimumFrames: 24, holdFrames: 0 }  <-- STRINGID_SUPEREFFECTIVE lands here
  ```
  `MESSAGE_TIMING` is `{ minimumFrames: 24, holdFrames: 0 }`
  (`battleResolutionPresentation.ts:383`); `STAT_CHANGE_MESSAGE_TIMING` is
  `{ minimumFrames: 24, holdFrames: 64 }` (`:403-406`), scoped to the six
  stat-change ids only (`STAT_CHANGE_MESSAGE_IDS`, `:395-402`). The module
  doc comment (`:51-58`) already acknowledges the gap verbatim: *"not
  modeled for every message kind here — see STAT_CHANGE_MESSAGE_IDS at the
  call site."* **`STRINGID_SUPEREFFECTIVE` / `STRINGID_NOTVERYEFFECTIVE` /
  `STRINGID_CRITICALHIT` / the faint-family ids all fall through to
  `holdFrames: 0`.**
- **Duration formula:** `battleResolutionCommandDuration`
  (`src/engine/battleResolutionPresentationRender.ts:257-304`), message case
  at `:262-269`:
  ```ts
  return Math.max(command.timing.minimumFrames,
                  battleStringPrintableLength(command.lines))
       + command.timing.holdFrames;
  ```
  With `holdFrames: 0` and a ~21-glyph message, an effectiveness line holds
  only `max(24, 21) = 24` frames — the user's "fraction of a second" flash.
- **Completion advance:** `factoryRoundBattleOrchestrator.ts:1523` retires a
  command when `isBattleResolutionCommandComplete`
  (`battleResolutionPresentationRender.ts:306-329`) passes — for automatic
  messages purely via the duration above.
- **Text persistence during later commands is already correct:** the renderer
  keeps the last message fully visible while non-message commands (move
  animation, HP) present (`battleResolutionPresentationRender.ts:475-481`,
  `latestMessage` at `:494-499`), and `battleStringVisibleCharacters`
  (`battleStringResolver.ts:109-122`) caps at full printable length during
  any hold — so giving these ids a nonzero `holdFrames` keeps the full line
  on screen for exactly that many extra frames, which is the real cadence.
- The kernel-side wait values are *not* surfaced on the message event
  (`battleScriptEvents.ts:27-31` action snapshot carries no wait; the
  `waitmessage` opcode is scheduler-only, no event), so the presentation
  cannot currently derive the hold from the kernel without a kernel change.

### Bind plan (for a MAIN worker)

Scope: `src/` edits are the MAIN lane's job; this plan names the exact seams
and the acceptance bar. Everything is a constants-family change, matching the
ISSUES #77 direction ("a small constants family, not per-message work").

1. **Promote the shared hold-constants family.** Keep
   `STAT_CHANGE_MESSAGE_TIMING`'s `{ minimumFrames: 24, holdFrames: 64 }`
   and extend the id selection at `battleResolutionPresentation.ts:2690-2692`
   to a `WAITMESSAGE_LONG_MESSAGE_IDS` family that adds at minimum:
   `STRINGID_SUPEREFFECTIVE`, `STRINGID_NOTVERYEFFECTIVE`,
   `STRINGID_CRITICALHIT` (the `critmessage`/`resultmessage` class, §3), plus
   every other id whose emitting script prints it and then runs
   `waitmessage B_WAIT_TIME_LONG`. Reuse the `STAT_CHANGE_MESSAGE_TIMING`
   value (or extract a single shared `WAITMESSAGE_LONG_TIMING` constant so the
   family is one knob).
2. **Do NOT touch `STRINGID_USEDMOVE`** — the attackstring has no
   `waitmessage` (§3) and its real hold is the animation+HP span, which the
   route already models as subsequent commands with `latestMessage`
   persistence. Giving it a 64 hold would double-count and desync the hit
   chain.
3. **Leave `advance` as-is** (`"automatic"` for these ids) — confirmed
   correct against the oracle (auto-advance on `waitmessage`, no button gate).
4. **Census guard:** after wiring the family, run a quick census of resolved
   `messageId`s emitted by the standard hit-chain scripts (or, cheapest, the
   `Cmd_resultmessage`/`Cmd_critmessage`/`Cmd_printstring` string ids from
   `reference/pokeemerald/src/battle_script_commands.c:2050-2132` +
   `:1989-1999`) and assert every waity-followed id is in the family — the
   #72 lesson: find missing ids by census, not by a player.
5. **Optionally (stronger), kernel-sourced waits:** emit the resolved
   `waitmessage`/`pause` operand on the message event (or a sibling scheduler
   event) from `battleScriptSourceCommands.ts:968-1016`, and have the
   presentation read it. This removes the static family and its census
   burden entirely, at the cost of a small event-contract change. ISSUES #77's
   "small constants family" phrasing points at option 1; option 2 is the
   generalization that would also cover `B_WAIT_TIME_SHORT` pacing and any
   future script.

### Acceptance bar

- **Tier-1:** flip the pins that currently assert `{ minimumFrames: 24,
  holdFrames: 0 }` for `STRINGID_SUPEREFFECTIVE` in
  `tests/battleResolutionPresentation.test.ts:398,415` to the family's
  `holdFrames: 64` (red-verify by stashing the src edit first, per the run's
  convention); add one pin for `STRINGID_CRITICALHIT` and one for the
  faint-family id, and one asserting `STRINGID_USEDMOVE` stays at
  `holdFrames: 0`.
- **Oracle:** replay
  `tools/battle-lab/scratch-message-hold-dense-probe.json` (or the full
  dense chunk set) and require, per §4: "It's super effective!" post-typing
   hold = 64 (stable 204→267 before any turn-end), "It's not very
   effective…" = 64 (441→504), with the box still showing the full line at
  the end of the hold. Dense compare must show the message held, not
  cleared, across the whole 64-frame window.
- **Full suite + build:** `npm test` and `npm run build` green at the commit.

## Out of scope / notes

- `B_WAIT_TIME_MED` (48) is not exercised by the standard hit chain — it
  appears on status/weather/pivot scripts (e.g. switch/send-out lines). Bind
  it later against whichever script first needs it; the mechanism is the same.
- The Confuse Ray crash (#76) is a separate MAIN item; this scout's staged
  trace intentionally avoids status moves.
- Text speed: the measured 1-glyph/frame typing assumes the canonical save's
  Options text speed FAST. If the app ever supports other speeds, the typing
  term (not the hold) must scale by `sTextSpeedFrameDelays` (`menu.c:79-81`).
