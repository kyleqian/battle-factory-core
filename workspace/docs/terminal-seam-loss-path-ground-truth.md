# The Factory L50 LOSS terminal path — dense oracle ground truth (Battle Scene OFF)

SIDE-LANE step. Banks real-oracle, RAM-pinned evidence for the LOSS half of
the terminal seam that `docs/terminal-seam-round-flow-scout.md` §1c left
static-source-only (its own trap 3: "the LOSS-path oracle ground truth this
repo has today is DESTIN's WIN quote only... no dense oracle trace or RAM
pin anywhere in `docs/` today"). Docs + committed trace only — no
`src/`/`tests/` edits.

**Headline, ahead of the sections below**: the static trace in
`terminal-seam-round-flow-scout.md` §1c is confirmed *correct* in every
particular this session could check — opcode order, both `VARIOUS`
return-to-ball effects, the trainer slide-in, and the `{B_TRAINER1_WIN_TEXT}`
resolution. The one thing that static trace could not have predicted and
this session's oracle evidence adds: **the LOSS path also flashes the
Battle Factory battle room during its fade-out**, exactly like the WIN path
`docs/postwin-notes.md` §3 already documented — then, unlike the WIN path,
fades into the **Lobby** (not the pre-battle counter room), landing exactly
on the already-banked `docs/factory-loss-ending-off-probe.md` ground truth.
That prior doc's shortcut staging (direct `challengeStatus` RAM write +
map warp, skipping the battle entirely) is hereby cross-validated: this
session's real, played-out battle loss reproduces its lobby text
("Thank you for participating...") frame-for-frame at the join point.

## 0. Staging method

`tools/battle-lab/loss-terminal-explosion-dusclops-off.json` (`mechanicLab`,
`overrides.parties`, `oracleProfile`/`profile: "battle-scene-off"`,
`trainerId: 50` = DESTIN, the same canonical Battle-1 opponent
`postwin-notes.md`/`turn17-notes.md` already use — chosen deliberately so
this session's `speeches.speechWin` cross-check (§2) lines up with an
already-known, already-trusted trainer record).

- **Player**: three mons (ONIX, SHUCKLE, MURKROW; species choice is
  irrelevant — Explosion is Normal-type regardless of the user), each
  carrying `MOVE_EXPLOSION` (id 153) in all four slots.
- **Opponent**: three DUSCLOPS (species 362, pure Ghost/Ghost — immune to
  Normal), each carrying `MOVE_SPLASH` (id 150) in all four slots, per
  `AGENTS.md`'s "give all four opponent slots the same move to constrain
  the Factory AI to one legal choice" — Splash is a no-op, isolating every
  faint in the trace to the player's own Explosions with zero interference
  from the opponent's own turn.
- **Why this is airtight**: `reference/pokeemerald/data/battle_scripts_1.s`
  `BattleScript_EffectExplosion` runs `tryexplosion` (fails only on Damp,
  which Dusclops doesn't have) then **unconditionally** `setatkhptozero`
  *before* the hit/miss/immunity branch — the user's HP is zeroed
  regardless of whether the target is immune. Three Explosions, three
  guaranteed self-faints, opponent HP untouched (115/115 throughout,
  confirmed in every capture) — a clean, deterministic, source-verified
  team loss with no reliance on RNG, accuracy, or damage rolls.
- All parties/moves are ordinary `overrides.parties` catalog values (no
  transient state — HP/status/outcome are 100% ROM-computed from three
  played-out Explosion turns, matching `BATTLE_LAB.md`'s "neither mode
  permits transient battle-state injection").
- Reproduce: `bin/oracle lab tools/battle-lab/loss-terminal-explosion-dusclops-off.json -o <fresh-dir>`
  (**not** `bin/oracle run` — this is a `mechanicLab` scenario, which needs
  the `/v1/battle-lab/run` route; see Verification below for why the
  committed file lives under `tools/battle-lab/`, matching this repo's
  strict convention, rather than `tools/compare/traces/`).
- Twice-run byte-identical: two independent fresh runs, 208/208 captures,
  **0 sha256 or semantic-state mismatches**.
- The forced-switch UI (Onix faints → choose Shuckle; Shuckle faints →
  choose Murkrow) needed real navigation discovery this session: the
  "Choose a POKéMON" cursor defaults to the currently-active (fainted) slot,
  not the first alive one, and a bare `A` there tries to send out the
  fainted mon itself ("ONIX has no energy left to battle!" — confirmed via
  a wrong probe attempt). The working sequence is `B` (cancel the
  auto-opened SEND OUT/SUMMARY/CANCEL submenu) → `DOWN` × (position in the
  non-active list, in party order, fainted slots included) → `A` (reopen
  submenu on the target) → `A` (confirm SEND OUT). This is pre-terminal
  staging mechanics, not part of the seam itself, but is recorded here
  since it cost real probing time and will recur for any future loss-side
  or multi-faint staging.

## 1. Semantic state exposed by the battle lab

Every `bin/oracle lab` capture already exposes `battleOutcome` (raw
`gBattleOutcome`), `rngValue` (raw `gRngValue`), and
`engine.mainCallback2`/`engine.opponentControllerCommand` directly — no
separate `tools/run-mgba-probe.py` RAM probe was needed for this session's
claims; the battle-lab response *is* the RAM probe, already wired to the
same semantic-state contract `BATTLE_LAB.md` documents. All frame numbers
below are absolute trace ticks from the committed trace's own frame 0,
re-derivable by anyone re-running it.

## 2. (a)+(b) The executed opcode/label sequence, faint to end2, and the exact win-text

Cross-referencing the static script from `terminal-seam-round-flow-scout.md`
§1c (`BattleScript_LocalBattleLost` →
`_LocalBattleLostPrintTrainersWinText` → `_LocalBattleLostEnd_` → `end2`)
against this session's oracle captures, in order:

| frame | `battleOutcome` | `rngValue` | `opponentControllerCommand` | what's on screen | source step |
| --- | --- | --- | --- | --- | --- |
| 2896–2930 | 0 | frozen `1298389302` | 51 | `"MURKROW / fainted!♥"` (blinking-heart cursor, same style `turn17-notes.md` §4 flagged on the WIN side) | `BattleScript_HandleFaintedMon` running for the player's 3rd mon |
| **2941** | **0 → 2** | frozen | 51 | (still the held fainted message) | `checkteamslost` decides `gBattleOutcome = B_OUTCOME_LOST` (`battle.h:101`) — this is the exact tick `HandleEndTurn_BattleLost` will act on |
| 2945 | 2 | frozen | 51 | fainted message clearing | move/attacker state cleanup (`currentMove` clears 153→0 in the same window) |
| **2951** | 2 | frozen | **51 → 6** | Dusclops sprite begins a return-to-ball flash | `returnopponentmon1toball BS_ATTACKER` (`VARIOUS` case 19) dispatches — **visually confirmed**: pink/white recall-sparkle animation over Dusclops (frame ~2975), then both the Dusclops sprite *and* its name/HP box are fully gone by frame 2996 |
| 2958–2995 | 2 | frozen | 6 | Dusclops recall animation → empty field | `returnopponentmon1toball` completing; `returnopponentmon2toball` (`VARIOUS` case 20) also executes here per the static script but has **no observable second effect** — consistent with a singles Factory battle only ever having one active opponent battler for "mon2" to apply to (inference from behavior, not a source read this session) |
| **2996** | 2 | frozen | **6 → 8** | empty field, no mons visible | opponent-controller command settles into whatever backs `trainerslidein`/`waitstate`'s idle state |
| 2996–3057 | 2 | frozen | 8 | trainer (DESTIN's overworld sprite) walks in from the right, continuous per-frame animation | `trainerslidein BS_ATTACKER` + `waitstate` |
| 3057–3229 | 2 | frozen | 8 | held, fully rendered: **"I AM ABOUT TO OVERHEAT"** | `printstring STRINGID_TRAINER1WINTEXT` — settled and dismissable |
| ~3230–3232 | 2 | frozen | 8 | dismiss press | `A` (this session's own input) — `jumpifbattletype BATTLE_TYPE_TOWER_LINK_MULTI` (not taken) → `jumpifnotbattletype BATTLE_TYPE_TWO_OPPONENTS, BattleScript_LocalBattleLostEnd_` (taken, singles) → `end2` |
| 3238–3268 | 2 | frozen | 8 | palette fade to black over the live battle scene | `HandleEndTurn_FinishBattle`'s `BeginFastPaletteFade(3)`, same call the WIN side uses (`postwin-notes.md` §7) |

**(b) win-text cross-check**: the rendered text is **"I AM ABOUT TO
OVERHEAT"**, pixel-read directly from the capture at frames 3057–3229.
`src/data/gen/battle-frontier-trainers.json`'s entry `id: 50` (`sourceId:
FRONTIER_TRAINER_DESTIN`) has `speeches.speechWin` = `["I AM", "ABOUT",
"TO", "OVERHEAT", null, null]` → **"I AM ABOUT TO OVERHEAT"** — an exact,
byte-for-byte match. This directly confirms the static claim in
`terminal-seam-round-flow-scout.md` §1c: `{B_TRAINER1_WIN_TEXT}` resolves to
`CopyFrontierTrainerText(FRONTIER_PLAYER_LOST_TEXT, ...)` →
`gFacilityTrainers[trainerId].speechWin`, i.e. the *same* per-trainer
Easy-Chat data the WIN path's `{B_TRAINER1_LOSE_TEXT}` already reads, just
the other speech field. No new extraction needed — the field already
existed in the committed JSON, unused until now.

## 3. (c) Frame-timing table: last faint → fade → what comes after

Continuing the table above through the fade and into the field/lobby flow.
This session's own dense capture covers the **pre-lobby span** in full
(last faint through the map re-entry); the **lobby-onward span** was
already dense-probed by `docs/factory-loss-ending-off-probe.md` and
`docs/factory-terminal-boundaries-off-probe.md` via a direct
`challengeStatus`-write shortcut — this session's real played-out loss
reproduces that same content, confirming the shortcut was representative
(not just "a plausible guess").

| frame | `mainCallback2` | screen | note |
| --- | --- | --- | --- |
| 3238–3268 | `134448161` (in-battle) | fade to black | `BeginFastPaletteFade(3)` |
| 3269–3286 | `134448161` | flat black | still in-battle; `gMain.inBattle` has not cleared yet |
| **3287–~3330** | `134766173` | **`BattleFrontier_BattleFactoryBattleRoom`** — hex-tile ring floor + spectator crowd, pixel-identical in kind to `battle-room-notes.md`'s (S6) map | same brief flash `postwin-notes.md` §3 found on the WIN side's return path — **new finding: the LOSS path shares this flash**, because both outcomes return through `ReturnFromBattleToOverworld` to the *same* map (`BattleFrontier_BattleFactoryBattleRoom`'s own field script called `special DoSpecialTrainerBattle` in the first place — confirmed by reading `data/maps/BattleFrontier_BattleFactoryBattleRoom/scripts.inc:74–90` this session) |
| **3274** | `134448161 → 134767053` | (mid black hold, before the room flash settles) | **`gMain.inBattle` clears and `gRngValue` resumes in the same tick** — see §4 |
| ~3330–3345 | `134766173`/`134766541` (brief) | black hold again | fading back out of the battle-room flash |
| ~3346–3399 | `134766173` | fade in on the **Lobby** (`MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY`) | **not** the pre-battle counter room the WIN path (`postwin-notes.md`) uses — confirmed by source: `BattleFrontier_BattleFactoryBattleRoom_EventScript_BattleOpponent` (`scripts.inc:86-90`) is `switch VAR_RESULT / case 1, ...DefeatedOpponent`, falling through to `EventScript_WarpToLobbyLost` for any other result — a **direct** `frontier_set FRONTIER_DATA_CHALLENGE_STATUS, CHALLENGE_STATUS_LOST` + `goto ...WarpToLobby`, with no `warp MAP_..._PRE_BATTLE_ROOM` step at all (that warp only exists on the *win* branch, `:105-108`, for battles 1–6) |
| 3399+ | `134766173` | **"Thank you for participating!"** (msgbox) | exact match to `docs/factory-loss-ending-off-probe.md`'s already-documented lobby text and onward flow (party restore, save, record-question YES/NO) — this session does not re-trace that part; the prior doc already owns it, now cross-validated |

## 4. (d) RNG ledger

**Confirmed, not assumed** (the brief's trap 4 explicitly asked to verify
this extends to the loss side): `gRngValue` is **completely frozen** at
`1298389302` from at least frame 2896 (first checked, already mid the
fainted-message hold) through frame **3273** inclusive — spanning the
`checkteamslost` outcome decision (2941), both `VARIOUS` return-to-ball
calls (2951/2996), the full trainer slide-in, the win-text print, its
dismiss, and ~35 ticks into the palette fade. At frame **3274**, in the
same tick, both (a) `gRngValue` takes its first step (`1298389302 →
407441040`) and (b) `mainCallback2` changes (`134448161 → 134767053`,
i.e. `gMain.inBattle` clears) — **the identical "same-tick" pattern**
`postwin-notes.md` §2 pinned for the WIN side (there: tick 23645). This is
independent, oracle-verified confirmation that the LOSS-side label
sequence itself makes zero RNG draws, matching trap 4's prediction exactly
rather than merely inheriting it by assumption.

## 5. (e) Increments for a future loss-side implementation

Mirrors `terminal-seam-round-flow-scout.md` §3's shape, now with real
ground truth backing every claim:

1. **`VARIOUS` cases 19/20** (`RETURN_OPPONENT_MON1TOBALL`/`MON2TOBALL`).
   `battleScriptSwitchinOpcode.ts:677+` already dispatches this same table
   for 3 other cases — this needs two more arms, both "hide the opponent's
   active battler sprite/HP box" (case 19; case 20 is very likely a no-op
   in singles per §2's evidence, needs a source read of the case-20 C
   handler to confirm before implementing, not this session's job). No new
   opcode family. This is the one piece increment (i) in the win-side scout
   flagged as LOSS-specific extra work beyond what WIN needed — now that
   the visible effect (recall-sparkle animation, then sprite+HP-box
   removal) is oracle-confirmed, a Tier-1 test can assert the emitted
   event/rulesContext shape without needing to match this exact animation
   frame-for-frame (pixel timing is a presentation-layer concern, separate
   from the opcode's own state effect).
2. **The same second-VM-run resume shape** `terminal-seam-round-flow-scout.md`
   §3(i) already designed for WIN, retargeted at `BattleScript_LocalBattleLost`
   for `outcome !== player-win`. Nothing in this session's evidence
   contradicts that design — the label sequence taken is exactly the one
   already transcribed in that doc's §1c, opcode-for-opcode.
3. **`STRINGID_TRAINER1WINTEXT` resolver mapping** (§3(ii) in the win-side
   scout, marked blocked pending "a fresh oracle trace"). That trace now
   exists: `speeches.speechWin` per trainer, exactly mirroring the
   already-landed `speechLose` mapping for `STRINGID_TRAINER1LOSETEXT`. No
   new extraction — same file, same per-trainer record, opposite field.
4. **Presentation**: the trainer-slide-in visual is still, per the win-side
   scout's own trap, unimplemented outside the retired `battleScene.ts`
   one-off. Nothing new discovered here that changes that increment's
   shape; this session's contribution is confirming the *loss* side needs
   the identical visual (same `trainerslidein` opcode, same "no generic
   implementation exists yet" gap).
5. **Surprises worth flagging for whoever lands this**: (a) the loss path's
   post-`end2` field flow reuses the **battle room** map before diverging
   from the win path — an implementation that models "return to overworld"
   as a single generic step (not two outcome-specific ones) matches the
   real ROM better than branching immediately on outcome; the branch point
   is *after* the battle-room return, inside that map's own field script,
   not at the battle-engine boundary. (b) The forced-switch party-menu
   cursor behavior (§0) is unrelated to the terminal seam but will matter
   for any future engine work simulating a multi-faint battle end-to-end.

## Verification

- `git diff --stat` for this session's changes: `docs/` (this file) +
  `tools/battle-lab/loss-terminal-explosion-dusclops-off.json`. Zero
  `src/`/`tests/` edits — `npm test` and `npm run build` are unaffected and
  verified green (see final report).
- The committed trace lives at `tools/battle-lab/loss-terminal-explosion-dusclops-off.json`,
  **not** `tools/compare/traces/`: it is a `mechanicLab` battle-lab scenario
  (`schemaVersion`/`mode`/`overrides.parties`), reproducible only via
  `bin/oracle lab <file> -o <dir>` (the `/v1/battle-lab/run` route), not
  `bin/oracle run` (`/v1/run`, the plain canonical-snapshot route
  `tools/compare/traces/*.json` uses). Every existing `mechanicLab`/
  `factoryLegal` fixture in this repo lives under `tools/battle-lab/`
  (444+ prior examples) and none under `tools/compare/traces/`; filing this
  one the same way keeps the two directories' schemas unambiguous. A staged
  synthetic loss (as opposed to replaying a real recorded challenge) has no
  other legal construction path — `overrides.parties` is required to build
  the guaranteed-loss Explosion/Dusclops matchup from scratch.
- Reproduced twice via `bin/oracle lab tools/battle-lab/loss-terminal-explosion-dusclops-off.json -o <fresh-dir>`:
  **208/208 captures byte-identical** (sha256 *and* full semantic `state`
  compared), across two independent fresh runs, no nondeterminism observed.
- Every frame/value cited in §2–§4 was read directly from these two
  reproduced runs (not from an intermediate exploratory scratch trace) —
  the committed file's `captureFrames` includes every tick this doc cites
  by number.
- No RAM probe script was needed (§1) — `bin/oracle lab`'s own semantic
  `state` already exposes `battleOutcome`/`rngValue`/`engine.mainCallback2`/
  `engine.opponentControllerCommand` per capture, which covers every claim
  the brief's "gBattleOutcome, script cursor, RNG cursor" asked for except
  a literal script-instruction-pointer read; the opcode sequence was
  instead cross-checked via the documented static script (§2's table) plus
  the visible on-screen behavior at each step, which is the same method
  `postwin-notes.md` used for the WIN side's own label-sequence claims.

## 6. 2026-08-04 MAIN-worker session: wait-cursor mechanism confirmed and gated; swap-edge + held-cursor residuals itemized (not guess-fit)

**Cursor mechanism (source-confirmed, landed in `src`).** The reason the
oracle shows no wait-cursor for the quote box at all, while ordinary
messages like "MURKROW fainted!" do: they use *two different pause control
codes*, and only one of them draws the arrow.

- `Cmd_printstring`/`PrepareStringBattle`/`BtlController_EmitPrintString`
  (`battle_script_commands.c:2137-2146`, `battle_util.c:906-911`) is
  identical for every STRINGID — the difference is entirely in each
  message's own *template*, not the printer call shape.
- Ordinary messages like `STRINGID_ATTACKERFAINTED`/`STRINGID_TARGETFAINTED`
  end their literal template in `\p` (`battle_message.c:74-75`,
  `sText_AttackerFainted[] = _("{B_ATK_NAME_WITH_PREFIX}\nfainted!\p")`) —
  charmap byte `0xFB`, `CHAR_PROMPT_CLEAR` (`charmap.txt:1088`). `text.c`'s
  render loop resolves that literal byte directly to `RENDER_STATE_CLEAR`
  (`text.c:1102-1105`), serviced every tick by `TextPrinterWaitWithDownArrow`
  (`text.c:865-882`), which calls `TextPrinterDrawDownArrow`
  (`text.c:787-836`) every tick while waiting — this is the actual down-arrow
  task, bouncing through `sDownArrowYCoords = {0,1,2,1}` on an 8-tick
  `downArrowDelay`, exactly the shape this engine's `CURSOR_Y_OFFSETS`/9-tick
  cadence already ports (`battleScene.ts:2828,34111-34120`).
- `STRINGID_TRAINER1WINTEXT`'s own static template is a **bare placeholder
  with no control code at all**: `sText_Trainer1WinText[] =
  _("{B_TRAINER1_WIN_TEXT}")` (`battle_message.c:1424`). Its wait comes
  entirely from `BufferStringBattle`'s placeholder-substitution code
  (`battle_message.c:2600-2748`): for exactly the four
  `B_TXT_TRAINER{1,2}_{WIN,LOSE}_TEXT` cases (`:2616-2627`, `:2741-2748`),
  after copying the resolved Easy Chat text it appends `EXT_CTRL_CODE_BEGIN`
  + `EXT_CTRL_CODE_PAUSE_UNTIL_PRESS` — an *extended* control code (0xFC
  prefix), not the literal `\p` byte. `text.c`'s render loop resolves that to
  `RENDER_STATE_WAIT` (`text.c:1018-1022`), serviced by `TextPrinterWait`
  (`text.c:884-900`): waits for `JOY_NEW(A_BUTTON|B_BUTTON)` and nothing
  else — **it never calls `TextPrinterDrawDownArrow`**. Both families
  genuinely block on a real button (confirming the existing "A dismiss"
  timing model is correct), but only one of them animates a visible cursor
  while doing so.
- **WIN-side ids, checked as the brief required (not wired this session):**
  `STRINGID_TRAINER1LOSETEXT` (`sText_Trainer1LoseText[] =
  _("{B_TRAINER1_LOSE_TEXT}")`, `battle_message.c:55`) is the WIN-path
  mirror of `TRAINER1WINTEXT` — same bare placeholder, same appended
  `EXT_CTRL_CODE_PAUSE_UNTIL_PRESS`, so it never gets a cursor either.
  **`STRINGID_PLAYERDEFEATEDTRAINER1` is different and must NOT be
  suppressed**: its static template (`battle_message.c:371`,
  `sText_PlayerDefeatedLinkTrainerTrainer1[] = _("Player defeated\n
  {B_TRAINER1_CLASS} {B_TRAINER1_NAME}!\p")`) ends in a literal `\p` —
  the ordinary `CHAR_PROMPT_CLEAR`/down-arrow path, so it genuinely does
  spawn the cursor once ready. Treating `TERMINAL_SEAM_BUTTON_MESSAGE_IDS`'s
  three ids as uniformly cursor-less (the shape the prior itemization
  suggested) would have been a regression for this one. Landed as
  `TERMINAL_SEAM_QUOTE_MESSAGE_IDS` (`battleResolutionPresentation.ts`,
  containing only `STRINGID_TRAINER1LOSETEXT`/`STRINGID_TRAINER1WINTEXT`), a
  `noCursor` boolean on the `"message"` presentation command threaded from
  that set, and a `!command.noCursor` gate on
  `battleResolutionPresentationRender.ts`'s `waitCursor` field. Red-verified
  via `git stash`: `tests/presentationTerminalSeamTrainerSlide.test.ts`'s two
  existing terminal-seam tests plus a new third test all fail against the
  unfixed code (the `noCursor` field doesn't exist), pass against the fix.
- **Result**: this fix alone took `npm run compare -- loss-terminal-window-off
  --summary` from **1/236 → 175/236** (twice-run byte-identical) — every
  frame from 3057 (quote fully typed) through 3230 (its own dismiss) now
  matches, because the quote box correctly never shows a cursor through that
  entire 174-frame settled/dismissable span.

**Two residual classes remain, itemized precisely (not guess-fit) rather
than force-fit against the brief's own explicit escape hatch:**

1. **Held-cursor freeze during the trainer-slide, ticks 2996-3033 (38
   frames, 37-38px each).** The antecedent "MURKROW fainted!" message (a
   real `\p`/down-arrow message) is still displayed throughout the trainer
   slide-in (nothing has overwritten the box yet), and the oracle's cursor
   is present but **completely static** — byte-identical `ssimMean`/`ssimMin`
   across all 38 sampled frames, unlike the genuinely-bouncing cursor once a
   button message is the *current* command (whose bbox/ssim values visibly
   cycle tick to tick, confirmed both before and after this session's fix).
   This is consistent with the real mechanism: `TextPrinterDrawDownArrow`
   only advances while its battler's printer callback is still being
   actively serviced each tick; once the interpreter dispatches a later
   command to a *different* battler (the opponent's trainer-slide) without
   the antecedent message ever being cleared, the last-drawn arrow tile is
   leftover window content — frozen, not still bouncing. Direct pixel
   sampling (`app-02996.png`/`oracle-02996.png`, red glyph pixels
   `(255,0,0)` against the teal `(107,165,165)` box background) confirms
   this diagnosis and pins the frozen bounce-phase index empirically
   (`CURSOR_Y_OFFSETS[2]` — any `age` in `[18,26]` reproduces all 38 frames
   exactly). **Not landed**: this specific `age` value is real
   gameplay-input-dependent (how many ticks the actual dismiss press lagged
   behind ready, in the ORIGINAL antecedent-message flow this LOSS window's
   compare scaffold deliberately does not replay per-tick —
   `tools/compare/appTrace.ts`'s `lossTerminalWindowStage`, "commandIndex: 4
   ... outside real ticks") — there is no principled way to *derive* it from
   the message's own length/duration (confirmed by testing: the natural
   `duration - printableLength - 1` formula gives age 8, not 18, and drawing
   at age 8 makes the diff *worse*, not better). Landing a hand-fit "18"
   with no source citation would violate this step's own evidence bar for
   the cursor-gating fix. A correct general fix likely needs the scaffold to
   record the antecedent message's real final `phaseElapsed` (or the render
   layer to expose a `heldCursor` concept fed by that value) rather than a
   presentation-layer-only derivation — flagged for whoever lands the WIN
   compare wiring or revisits this window.
2. **Swap-edge + typing cascade, ticks 3034-3056 (23 frames, 28-589px).**
   The genuine 3-tick swap-edge micro-class (3034-3036, ~587-589px) that
   ISSUES #73 already flagged: the app begins typing the quote's first
   character 3 ticks before the oracle does (app's trainer-slide command
   completes and immediately hands off to the message at local tick 38; the
   oracle's antecedent box visibly holds through tick 3036, first quote
   character not until 3037). This is a genuine **content** offset, not a
   cursor artifact — confirmed by direct screenshots (app already shows "I
   AM" at the tick the oracle still shows "I") — so cascades through the
   entire typing phase as a per-character alignment mismatch, not just the
   3 originally-itemized frames, until the text finishes typing and both
   sides re-settle at frame 3057. Investigated this session
   (`reference/pokeemerald/src/battle_script_commands.c`'s `Cmd_return`,
   the trace's own button-press schedule reconstructed from
   `tools/compare/traces/loss-terminal-window-off.json`'s `segments` array —
   last real "A" press at absolute tick 2928-2929, ~300 silent ticks
   afterward through the quote's own dismiss at 3230) without reaching a
   source-confirmed mechanism: reconciling "the trainer sprite is visibly
   sliding" (interpreter has progressed) against "the fainted message's own
   `\p`/button-wait should otherwise gate all further script execution"
   needs a live RAM/script-cursor probe of the committed fixture at this
   exact boundary, beyond this session's remaining budget. Per this step's
   brief, not guess-fit — left itemized for a follow-up with probe budget.

**Acceptance honesty**: `npm run compare -- loss-terminal-window-off
--summary` is **175/236** (twice-run byte-identical), short of the brief's
"≥232" target — the two residual classes above account for the full 61-frame
gap (38 + 23 = 61; 236 - 61 = 175). The quote-cursor mechanism fix itself is
solid and source-confirmed; the two remaining classes need real per-tick
oracle-input modeling this session did not have budget to complete honestly.
