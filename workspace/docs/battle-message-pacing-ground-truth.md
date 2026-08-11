# Battle move-resolution message pacing ground truth (ISSUES #81 remainder 4b / #78 open 1256-1407)

Ground-truth scout for the battle-message **pacing** class behind the last two
`fight-menu-chrome-torment-off` frames (1100/1200, doc §8.1) and #78's open
1256-1407 turn-boundary window. The real printer types **1 glyph/frame** (the
app's model is right on cadence) but **holds** each completed message for a
script-determined number of frames that the app drops (`holdFrames: 0`).

Measured against the Battle Scene OFF oracle on two fixtures, each **run twice
fresh and byte-identical**:

- Torment route: `tools/battle-lab/scratch-torment-pacing-dense-a-off.json`
  (captures 1040-1260 every tick; derived table
  `tools/probe/ground-truth/torment-pacing-dense-table.json`).
- Switch route: `tools/battle-lab/scratch-mid-battle-switch-pacing-b-off.json`
  (captures 1256-1407 every tick; derived table
  `tools/probe/ground-truth/switch-pacing-dense-table.json`).

Verify script: `tools/probe/verify-battle-message-pacing.ts` (PASS).

---

## 1. Per-tick table — torment window 1040-1260 (RUNG A)

Message box occupies y112-159, bg `(107,165,165)`; white `(255,255,255)` text
rows y118-134 (line 1) and y138-156 (line 2). Fight submenu (bg white) shows
through 1051; the message box opens at 1052.

| Frame | Event |
| ---: | --- |
| 1040-1051 | fight submenu window (white bg, ~2810/3057 px of white/line) |
| **1052** | message box opens; **"Foe MURKROW used\nTORMENT!" first glyph** (L1 16px) |
| 1052-1067 | L1 types 1 glyph/frame; spaces consume a frame with no pixels (1055, 1063) |
| 1068 | L1 complete (257px); **line 2 first glyph** (13px) |
| 1068-1075 | L2 types 1 glyph/frame (144px at 1075) |
| **1075** | M1 fully typed (two lines) |
| **1076-1113** | **M1 HOLD — 38 frames** (every frame byte-identical) |
| **1114** | **"But it failed!" first glyph** (24px) |
| 1114-1127 | types 1 glyph/frame, spaces at 1117/1120 (160px at 1127) |
| **1128-1206** | **M2 HOLD — 79 frames** (every frame byte-identical) |
| **1207** | **"BUTTERFREE used\nGUST!" first glyph** (24px) |
| 1207-1221 | L1 types 1 glyph/frame, space at 1217 (251px at 1221) |
| 1222 | **line 2 first glyph** (18px) |
| 1222-1226 | L2 types 1 glyph/frame (75px at 1226) |
| 1227-1260 | M3 hold (still holding at end of window) |

**What the oracle shows at exactly 1100 and 1200:**
- **1100**: M1 "Foe MURKROW used TORMENT!" **fully typed on both lines and
  held** (257+144px) — the app at 1100 already shows "But it failed!" typing
  (it auto-advances at 1076).
- **1200**: M2 "But it failed!" **fully typed and held** (160px) — the app at
  1200 already shows "BUTTERFREE used GUST!" typing (auto-advances at 1102).

**Schedule facts the app's current model violates:**
1. `STRINGID_USEDMOVE` (M1, M3) is typed with no hold on this route, but the
   oracle holds M1 for **38 frames** (1076-1113) before "But it failed!" — the
   `pause B_WAIT_TIME_SHORT` in the ButItFailed path.
2. `STRINGID_BUTITFAILED` (M2) is held for **79 frames** (1128-1206) — the
   `waitmessage B_WAIT_TIME_LONG` (64) plus turn-end — while the app gives it
   `holdFrames: 0` because `STRINGID_BUTITFAILED` is not in
   `WAITMESSAGE_LONG_MESSAGE_IDS` (`battleResolutionPresentation.ts:497-504`).

Typing cadence (1 glyph/frame, spaces consuming a frame) **already matches** —
only the holds are wrong.

## 2. Per-tick table — switch window 1256-1407 (RUNG C)

| Frame | Event |
| ---: | --- |
| 1256 | "Foe RATTATA used\nSPLASH!" L1 tail (216px) |
| 1257 | L1 complete (235px) |
| 1258-1264 | L2 "SPLASH!" types 1 glyph/frame (17→117px) |
| 1265-1303 | **M1 HOLD — 39 frames** (byte-identical) |
| **1304** | **"But nothing happened!" first glyph** (24px) |
| 1304-1324 | types 1 glyph/frame, spaces at 1307/1315 (284px at 1324) |
| 1325-1398 | **M2 HOLD — 74 frames** (byte-identical) |
| **1399** | message box clears (text pixels to 0) |
| 1400-1405 | empty box (box frame still drawn) |
| **1406** | action menu (FIGHT/PKMN/BAG/RUN) drawn in the box region |
| **1407** | fight-menu submenu/input edge — **verified = ISSUES #78's cited 1407** |

Pacing-class attribution (PROGRESS 967 style):
- M1 "used SPLASH!" = **same attackstring class as torment M1** — no
  `waitmessage` after it; the 39-frame hold is the SPLASH script's
  `attackanimation`/`waitanimation` controller span
  (`BattleScript_EffectSplash`, `data/battle_scripts_1.s:1172-1181`).
- M2 "But nothing happened!" = **same `waitmessage B_WAIT_TIME_LONG` class as
  torment M2** (74 = 64 + 10 turn-end).
- The 1399-1407 fight-menu redraw is a **different mechanism** (menu chrome /
  action-menu window + submenu), the #78 window's own binding target.

## 3. Source mechanism (RUNG B)

### 3.1 Typing cadence — text speed FAST

Battle message window typing speed = the player's Options text speed, NOT a
battle constant:

| Text speed | `optionsTextSpeed` | Glyph delay |
| --- | --- | --- |
| SLOW | 0 | 8 frames |
| MID | 1 | 4 frames |
| FAST | 2 | **1 frame** |

`sTextSpeedFrameDelays[]` (`reference/pokeemerald/src/menu.c:77-82`),
`GetPlayerTextSpeedDelay` (`menu.c:481-488`), applied at
`battle_message.c:3014` for `B_WIN_MSG`. **The canonical bootstrap save runs
FAST** — confirmed by every measured message typing exactly 1 glyph/frame.
Spaces are zero-width glyphs that still consume a frame (`text.c:963-966`,
`GetGlyphWidth_Normal`), which is why the measured tables show 2-frame gaps at
space positions.

### 3.2 The messages and their strings

| Message | ID | Template (file:line) |
| --- | --- | --- |
| "Foe MURKROW used\nTORMENT!" | `STRINGID_USEDMOVE` | `sText_AttackerUsedX = "{B_ATK_NAME_WITH_PREFIX} used\n{B_BUFF2}"` — `battle_message.c:419` |
| "But it failed!" | `STRINGID_BUTITFAILED` | `sText_ButItFailed = "But it failed!"` — `battle_message.c:334`, table `:736` |
| "But nothing happened!" | `STRINGID_BUTNOTHINGHAPPENED` | `sText_ButNothingHappened = "But nothing happened!"` — `battle_message.c:333`, table `:735` |

The `\n` in the used-move template is why M1/M3 are two-line while "But it
failed!" is one line.

### 3.3 The holds — `Cmd_waitmessage` / `Cmd_pause`

Constants (`reference/pokeemerald/include/constants/battle.h`):

| Constant | Value |
| --- | --- |
| `B_WAIT_TIME_LONG` | 64 (battle.h:324) |
| `B_WAIT_TIME_MED` | 48 (battle.h:325) |
| `B_WAIT_TIME_SHORT` | 32 (battle.h:326) |

`Cmd_waitmessage` (`battle_script_commands.c:2159-2178`): after the message
finishes printing (controller idle), counts `gPauseCounterBattle` one per
script tick until `>= toWait`, then clears `MSG_DISPLAY` — the **countdown
starts at print completion**, so typing time is NOT part of the hold.
`Cmd_pause` (`:3914-3925`) is the same unconditional tick counter with no
`MSG_DISPLAY` dependency — it paces script steps, not message holds.

Torment route (`BattleScript_EffectTorment`, `data/battle_scripts_1.s:2139-2149`):

```
attackcanceler
attackstring          ; M1 "Foe MURKROW used TORMENT!" — MSG_DISPLAY=0, NO waitmessage
ppreduce
accuracycheck BattleScript_ButItFailed, ACC_CURR_MOVE
settorment BattleScript_ButItFailed   ; already tormented -> jump (:2144)
; -> BattleScript_ButItFailed (:2058-2063)
pause B_WAIT_TIME_SHORT               ; 32 frames  <-- M1's hold
orbyte gMoveResultFlags, MOVE_RESULT_FAILED
resultmessage                         ; M2 "But it failed!" — MSG_DISPLAY=1
waitmessage B_WAIT_TIME_LONG          ; 64 frames  <-- M2's hold
goto BattleScript_MoveEnd
```

So M1's 38-frame hold = `pause B_WAIT_TIME_SHORT` (32) + ~6 script/dispatch
steps (ppreduce/accuracycheck/settorment/orbyte/resultmessage emit). M2's
79-frame hold = `waitmessage B_WAIT_TIME_LONG` (64) + ~15 (moveendall + turn
end + next move's attackstring dispatch to M3's first glyph).

Switch route (`BattleScript_EffectSplash`, `data/battle_scripts_1.s:1172-1181`):

```
attackcanceler
attackstring          ; M1 "Foe RATTATA used SPLASH!" — MSG_DISPLAY=0, NO waitmessage
ppreduce
attackanimation       ; 39-frame hold = controller lifetime (Scene OFF still consumes)
waitanimation
incrementgamestat GAME_STAT_USED_SPLASH
printstring STRINGID_BUTNOTHINGHAPPENED   ; M2 — MSG_DISPLAY=1
waitmessage B_WAIT_TIME_LONG              ; 64 frames <-- M2's hold
goto BattleScript_MoveEnd
```

### 3.4 Cross-check: schedule from constants vs measured

| Window | Term | Constant math | Measured |
| --- | --- | --- | --- |
| Torment M1 typing | 24 glyphs × 1/frame (16+8, `\n` free) | 1052-1075 | **exact** |
| Torment M1 hold | `pause 32` + ~6 script steps | 38 | **exact (1076-1113)** |
| Torment M2 typing | 14 glyphs × 1/frame | 1114-1127 | **exact** |
| Torment M2 hold | `waitmessage 64` + ~15 turn-end/dispatch | 79 | **exact (1128-1206)** |
| Torment M3 typing | 15+5 glyphs × 1/frame | 1207-1226 | **exact** |
| Switch M1 hold | SPLASH anim controller ~35 + dispatch | 39 | **exact (1265-1303)** |
| Switch M2 typing | 21 glyphs × 1/frame | 1304-1324 | **exact** |
| Switch M2 hold | `waitmessage 64` + 10 turn-end | 74 | **exact (1325-1398)** |

Every tick matches. Where it "does not" match the naive reading: `STRINGID_USEDMOVE`
has **no** `waitmessage` of its own (attackstring sets `MSG_DISPLAY=0`,
`battle_script_commands.c:1202`) — its on-box time is whatever the following
script steps take (a `pause`, an animation span, or — on the standard hit
chain — the move/hit/HP commands). That is exactly why a blanket 64-frame
`USEDMOVE` hold would be wrong (the existing hold-cadence doc's §5.2 warning),
but a **route-scoped** `USEDMOVE` hold is required on the ButItFailed path.

## 4. App seam and bind plan (for a MAIN worker)

The live route drives `battleResolutionPresentation` from the kernel event
stream. Current state:

- `MESSAGE_TIMING = { minimumFrames: 24, holdFrames: 0 }`
  (`battleResolutionPresentation.ts:427`).
- `WAITMESSAGE_LONG_MESSAGE_IDS` (`:497-504`) covers the stat-change ids plus
  `SUPEREFFECTIVE` / `NOTVERYEFFECTIVE` / `CRITICALHIT` / `ONEHITKO` /
  `PKMNENDUREDHIT` — **missing `STRINGID_BUTITFAILED` and
  `STRINGID_BUTNOTHINGHAPPENED`**.
- Timing selection at `:2868-2874`; duration formula
  `battleResolutionCommandDuration` (`battleResolutionPresentationRender.ts:
  750-753`) = `max(minimumFrames, printableLength) + holdFrames`.

**Bind steps:**

1. **Add `STRINGID_BUTITFAILED` and `STRINGID_BUTNOTHINGHAPPENED` to
   `WAITMESSAGE_LONG_MESSAGE_IDS`** → both get `holdFrames: 64`. This fixes
   torment frame 1200 (M2 held 64+turn-end instead of auto-advancing at 1102)
   and the switch M2 hold. Run the §5 census to confirm no other result-message
   id is missed (the #72 lesson: census, not a player).
2. **Route-scoped `STRINGID_USEDMOVE` hold on the ButItFailed path.** The 38
   frames at 1076-1113 are `pause B_WAIT_TIME_SHORT` (32) + dispatch — there
   is no `waitmessage`. Same shape as the already-landed
   `TORMENT_ROUTE_BOUNCE_SCHEDULE`: a staging-context-supplied
   `usedMessageHoldFrames` (or a script-derived pause) for the torment route
   only, leaving the standard hit chain untouched (its `USEDMOVE` is correctly
   held by subsequent move/hit/HP commands via `latestMessage` persistence).
   Value 38 on the ButItFailed path lands M2's first glyph at exactly 1114.
3. **Leave typing cadence alone** (1 glyph/frame is already exact) and leave
   `advance: "automatic"` (both windows auto-advance on script, no button).
4. **Verify against the committed spec after the bind** — the existing
   `fight-menu-chrome-torment-off` spec should go **57/57** (55/57 → +1100
   +1200). Add the named new spec window `mid-battle-switch-pacing-b-off`
   over the scratch fixture's 1256-1407 captures (frames 1256-1407 from
   `scratch-mid-battle-switch-pacing-b-off.json`, which the oracle runs
   twice byte-identical per this doc's §2 table).

**Kernel note (why the presentation can't derive the hold):** `waitmessage`/
`pause` are scheduler-only (`battleScriptSourceCommands.ts:968-1016`); the
resolved operand is not carried on the message event
(`battleScriptEvents.ts:27-31`). Option 1 (constants family + route-scoped
override) matches the #77 direction; option 2 (emit the resolved wait on the
message event) is the generalization that removes the census burden.

## 5. Verification

- `tools/probe/verify-battle-message-pacing.ts` replays both scratch fixtures
  twice fresh via `bin/oracle lab` and asserts: byte-identical runs (221/221 +
  152/152), the first-glyph ticks, both holds' byte-stability, the box-clear at
  1399, and the 1406/1407 menu edges. **PASS.**
- Per-tick derived tables (the doc's §1/§2 numbers) are committed under
  `tools/probe/ground-truth/`; `torment-frame-1100.png` / `1200.png` are the
  held-message reference captures.
- Tier 1 after bind (MAIN): pins for the two added ids' `holdFrames: 64`
  and the route-scoped `USEDMOVE` hold, red-verified by stashing the src
  change.

## Out of scope / notes

- The bounce/freeze schedule (`BattleCommandBounceSchedule`) is separate and
  landed; this doc is the message-pacing class only.
- The switch 1407 fight-menu redraw chrome is the #78 window's own binding
  target (menu chrome, healthbox, submenu) — this doc maps the message pacing
  up to the box-clear at 1399 and records the 1407 edge.
- `B_WAIT_TIME_MED` (48) not exercised by either window; same mechanism.
