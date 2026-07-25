# Presentation-seam checkpoint — scout (read-only recon)

Pre-banked evidence for ROADMAP "Executable-frontier reset" §3's mandatory
checkpoint (`ROADMAP.md:1204-1221`): after step (iv) lands, one already-exact
presentation window must be re-driven from kernel semantic events instead of
turn-N state, with its committed trace still passing at its recorded count.
This document is reconnaissance only — **no production code was changed**.

## 1. Kernel semantic event surface as it exists today

The event union is declared in full at `src/engine/battleScriptEvents.ts:40-144`
(19 `kind` variants). For each: the emitting opcode(s) and whether it is
actually reachable today.

| kind | payload fields | emitting opcode(s) — file:line | status |
| --- | --- | --- | --- |
| `message` | `messageId: string`, `substitutions: string[]` | `B_SCR_OP_PRINTSTRING` `battleScriptSourceCommands.ts:863-883`; `B_SCR_OP_ATTACKSTRING` `battleScriptHitChainOpcode.ts:608-649`; `critmessage` `battleScriptHitChainOpcode.ts:1362-1383`; `resultmessage` `battleScriptHitChainOpcode.ts:1466-1520`; `healthbarupdate`'s substitute branch `battleScriptHitChainOpcode.ts:1217-1220` | emitted (registered opcodes) |
| `selection-message` | `stringId`, full `BattleScriptSelectionMessageSnapshot` (all 3 text buffers, battler abilities) | `B_SCR_OP_PRINTSELECTIONSTRING`/`…FROMTABLE` `battleScriptSourceCommands.ts:884-913` | emitted |
| `play-se` | `songId` | `B_SCR_OP_PLAYSE` `battleScriptSourceCommands.ts:914-915`; `effectivenesssound` `battleScriptHitChainOpcode.ts:1110-1147` | emitted |
| `play-fanfare` | `songId` | `B_SCR_OP_FANFARE` `battleScriptSourceCommands.ts:916-917` | emitted |
| `play-faint-cry` | — | `B_SCR_OP_PLAYFAINTCRY` `battleScriptSourceCommands.ts:918-923` | emitted |
| `hide-party-status-summary` | — | `B_SCR_OP_HIDEPARTYSTATUSSUMMARY` `battleScriptSourceCommands.ts:924-929` | emitted |
| `set-battler-sprite-visibility` | `invisible: boolean` | `B_SCR_OP_MAKEVISIBLE` `battleScriptSourceCommands.ts:930-939`; moveend controllers `battleScriptMoveEndControllers.ts:193,225,252` (banked, opcode 73 not yet registered) | partially reachable (moveend not wired) |
| `set-battler-status-data` | `status1: number` | thaw handling `battleScriptAttackCancelerOpcode.ts:190`; moveend controllers `battleScriptMoveEndControllers.ts:173` | emitted (canceler); moveend copy not yet reachable |
| `set-battler-pp-data` | `movePosition`, `pp` | `ppreduce` `battleScriptHitChainOpcode.ts:696-712` | emitted |
| `trainer-slide-in`/`-out` | — | `B_SCR_OP_TRAINERSLIDEIN`/`OUT` `battleScriptSourceCommands.ts:940-943` | emitted |
| `status-animation` | `isStatus2`, `status` | `B_SCR_OP_STATUSANIMATION` family, `battleScriptSourceCommands.ts:944+`; preparation port `battleScriptRulesContext.ts:1583` | emitted |
| `hp-change` | `from`, `to` | `datahpupdate` `battleScriptHitChainOpcode.ts:1250-1359` (event at `:1356`) | emitted |
| `health-bar-update` | `healthValue` | `healthbarupdate` `battleScriptHitChainOpcode.ts:1191-1231` (event at `:1228`) | emitted |
| `animation` | `animationId`, `battler`, `arguments: string[]` | `attackanimation` `battleScriptHitChainOpcode.ts:1026-1107` (event at `:1089-1103`); `hitanimation` `battleScriptHitChainOpcode.ts:1154-1188` (event at `:1184`) | emitted |
| `status-change` | `from`, `to` | **none found** — only referenced in the exhaustive freeze-switch `battleScriptMachine.ts:594-623` (case at `:617`) | **declared, never emitted** |
| `stat-stage-change` | `stat`, `from`, `to` | **none found** — freeze-switch case `battleScriptMachine.ts:618` | **declared, never emitted** |
| `switch` | `side`, `fromPartyIndex`, `toPartyIndex` | **none found** — freeze-switch case `battleScriptMachine.ts:619` | **declared, never emitted** |
| `outcome` | `outcome: "player-win"\|"opponent-win"\|"draw"` | **none found** — freeze-switch case `battleScriptMachine.ts:620` | **declared, never emitted** |

Confirmed by grepping every `kind: "<exact-variant>"` occurrence across
`src/engine/battleScript*.ts` (excluding the type-definition file itself) and
reading each hit. The five pure-calculation hit-chain opcodes —
`accuracycheck`, `critcalc`, `damagecalc`, `typecalc`, `adjustnormaldamage`
(all in `battleScriptHitChainOpcode.ts`) — mutate `rulesContext` only and emit
zero events, confirmed by scanning each handler body for `events:`.

**The `message` port itself is not generally implemented.** `prepareMessage`
is a rules-injected port (type at `battleScriptSourceCommands.ts:69-72`); the
only production implementation found is the single hardcoded case in
`factoryBattleScriptDecision.ts:569-580` (`STRINGID_PKMNFASTASLEEP` only, a
literal string match on `operand.expression`). There is no general
`STRINGID_* -> English text + substitution splice` table wired into any
consuming module today.

## 2. Candidate presentation windows

`battleScene.ts` is 17,056 lines with **81** `turn<N>...` field declarations/
parameters found via `grep -nE '^  turn[0-9]+[A-Za-z]*(\??): '
src/engine/battleScene.ts` (type block `battleScene.ts:1414-1610` plus
threaded function parameters at `:4991-5104`, `:5366-5381`, `:13709-13711`,
etc.) and RAM-dump imports at `battleScene.ts:651-652`
(`battle1TurnRamDumpAsset`, `battle1Turn2RamDumpAsset`).

Examined candidates (trace file, recorded count from `docs/battle-turn-notes.md`
/ `docs/battle-menu-notes.md`, leaf draw function, coupling):

| trace | recorded | leaf function | turn-keyed inputs at the leaf | RAM-dump reads | battleScene.ts lines involved |
| --- | --- | --- | --- | --- | --- |
| `turn1-kickoff.json` | 81/81 (`docs/battle-menu-notes.md:1351`) | `drawActionMenuIdleContent`/idle-bounce path | 0 at the leaf (idle chrome, pre-confirm) | 0 | small, but **no battle semantics to map** — rejected, see below |
| `turn5-faint.json` | 110/110 (`docs/battle-turn-notes.md:4264`) | `drawTurn5RockSlideWindow` fainted branch, `battleScene.ts:11654-11683` (branch at `:11663-11671`) | 2, only at the *dispatch* level: `turn4Resolved` (true) / `turn5Resolved` (false), consumed by `drawTurn5EndeavorText` at `battleScene.ts:5235-5241` and the `if (turn5Resolved)` guard at `:5182`. The leaf function's own signature is `(fb, t)` — **zero** turn-keyed params reach it directly (`battleScene.ts:11654`) | 0 in this branch (fainted text is a hardcoded literal, no HP interpolation needed once HP has reached 0) | leaf ~30 lines (`:11654-11683`), dispatch routing ~10 lines |
| `turn1-rockslide.json` | 256/256 (`docs/battle-turn-notes.md:5470`) | `drawRockSlideWindow`/`drawRockSlideAttack`, `battleScene.ts:11706-11731`/`:11753-11772` | 4, again only at dispatch: `turn2Resolved`/`turn3Resolved`/`turn4Resolved` (all false, `battleScene.ts:5235-5259`) plus `turn5Resolved` (false, `:5182`). Leaf signature is `(fb, t, pressTick)` — 0 booleans reach it | 2: `anchorOpponentBattler.hp` (143) and `anchorOpponentAfterTurnHp` (101), both read from `battle1TurnRamDumpAsset` at `battleScene.ts:915-921` | leaf ~60 lines (`:11706-11772`), dispatch routing ~40 lines within `drawFightSubmenuWindow` (`:5086-5266`) |
| `turn5-rockslide.json` | 256/256 (`docs/battle-turn-notes.md:5309`) | `drawTurn5EndeavorText`/`drawTurn5RockSlideWindow`'s attack branch | same dispatch gate as `turn5-faint.json` | 2: `anchorPlayerAfterTurn3Hp`/`anchorPlayerAfterTurn5Hp` (Endeavor HP-drain interpolation) plus `anchorOpponentAfterTurn4Hp` | larger — includes the Endeavor squish + HP-drain machinery, `battleScene.ts:6861-6900`+ |

`drawFightSubmenuWindow` (`battleScene.ts:5086-5266+`) is the shared
dispatcher: its own signature threads **14 turn-keyed booleans plus 2
elapsed-tick fields** (`turn1Resolved` through `turn17...`, params at
`:5090-5104`), confirming the roadmap's "969 lines reference a turn number"
claim is not confined to leaf draw functions — every one of the windows above
passes through this single dispatcher regardless of how narrow its own leaf
function is. **This is the "reads more hidden state than its declaration
suggests" finding the brief asked to flag explicitly**: a window's own draw
function can have a two-argument signature while still being unreachable
without correctly threading over a dozen booleans through its caller.

## 3. Ranking

By coupling surface at the leaf (turn-keyed inputs + RAM-dump reads + window
size), smallest first among windows that actually carry battle content (idle
chrome like `turn1-kickoff.json` has zero coupling but also nothing to
re-drive — see note below):

1. **`turn5-faint.json`** — 0 RAM-dump reads, 2 dispatch-only booleans, ~30
   leaf lines, 110 recorded frames.
2. **`turn1-rockslide.json`** — 2 RAM-dump reads, 4 dispatch-only booleans,
   ~60 leaf lines, 256 recorded frames.
3. `turn5-rockslide.json` — same dispatch gate as #1 but a wider leaf (HP-drain
   interpolation across two RAM-dump constants), 256 recorded frames.

**Note on "any window qualifies, pick the smallest":** the literal smallest
is `turn1-kickoff.json` (idle menu-bounce, zero turn-keyed inputs, zero
RAM-dump reads) — but it renders no message, no animation, no HP delta, so
there is nothing in it to map onto a kernel semantic event; picking it would
satisfy the letter of the checkpoint without exercising the seam it exists to
prove. This scout ranks only among windows with real battle-semantic content,
per this brief's own step 4 (build a turn-N-input -> kernel-event mapping
table), which presupposes a window that has such inputs.

## 4. Mapping tables

### Top candidate — `turn5-faint.json` (`drawTurn5RockSlideWindow`, `battleScene.ts:11654-11683`, fainted branch `:11663-11671`)

| turn-N input consumed | kernel semantic event that would replace it | today? |
| --- | --- | --- |
| `turn4Resolved`=true / `turn5Resolved`=false (dispatch routing, `battleScene.ts:5235-5241`, `:5182`) | none — this is "which script/turn is the machine executing," not a battle-content event | **no plausible mapping**: named gap — see §5.7 |
| `TURN5_ROCKSLIDE_PRESS_TICK` (hardcoded tick anchor, `battleScene.ts:11655`) | would need a tick/frame timestamp on the emitted event that started this sequence | **gap**: `BattleScriptEventProvenance` (`battleScriptEvents.ts:1-9`) carries `programCounter`/`opcodeId`/`instructionExecution` (an execution-count sequence number) but no tick/frame correlate |
| `TURN5_FAINTED_LINE1`/`LINE2` = "Foe GROVYLE"/"fainted!" (hardcoded text, `battleScene.ts:7424-7425`) | `message` event, `messageId: "STRINGID_FAINTED"`, `substitutions: ["GROVYLE"]` | **kind is emitted today** (`message` mechanism exists), but the STRINGID_FAINTED emission site itself lives in `Cmd_printstring` inside the moveend/faint dependency chain behind **opcode 73**, not yet registered (ROADMAP step iii, `PROGRESS.md` #434 "Next: ... then step (iii) opcode 73"). Also no production string-table resolver exists (§1) — even once emitted, nothing turns the `messageId` into these literal glyphs today |
| implicit precondition "Grovyle's HP has reached 0" (baked into being on this code path, not read explicitly in this branch) | `hp-change` event with `to: 0` | **kind is emitted today** (`datahpupdate`, `battleScriptHitChainOpcode.ts:1356`) — this is the strongest, most direct candidate substitution found in this scout |
| `turn5FaintedTextVisibleChars(t, pressTick)` / cursor-reveal timing (pure tick math) | n/a — presentation-only scroll/cursor timing, not battle content | not applicable (no turn-N *battle* input, just tick arithmetic) |

### Runner-up — `turn1-rockslide.json` (`drawRockSlideWindow`/`drawRockSlideAttack`, `battleScene.ts:11706-11772`)

| turn-N input consumed | kernel semantic event that would replace it | today? |
| --- | --- | --- |
| `turn2Resolved`/`turn3Resolved`/`turn4Resolved`/`turn5Resolved` (all false, dispatch routing `battleScene.ts:5182,5223,5235,5243,5251`) | none — scene-sequencing state, same class as the faint window's gap | **no plausible mapping** — named gap, §5.7 |
| `anchorOpponentBattler.hp` (143, RAM dump `before_turn.battler1.hp`, `battleScene.ts:915-917`) | `hp-change` event's `from` field | **emitted today** (`battleScriptHitChainOpcode.ts:1356`) |
| `anchorOpponentAfterTurnHp` (101, RAM dump `after_turn.battler1.hp`, `battleScene.ts:919-921`) | `hp-change` event's `to` field | **emitted today** |
| `rockSlideOpponentHp(t, pressTick, startHp, endHp)` tick interpolation between those two HPs | needs a tick anchor tied to the `hp-change` event's occurrence | **gap**: same missing-timestamp issue as above |
| `ROCK_SLIDE_LINE1`/`LINE2` = "ONIX used\nROCK SLIDE!" (hardcoded, imported from `battleMenu.ts`, `battleScene.ts:457-458`) | `message` event, `messageId: "STRINGID_USEDMOVE"` | **kind AND this specific opcode are emitted today** — `attackstring` is one of the eighteen registered hit-chain opcodes (`battleScriptHitChainOpcode.ts:608-649`). Closest-to-wired input found in this scout. Still blocked on the missing string-table resolver (§1) |
| `rockSlideBg3Y`/`rockSlideRockState`/`rockSlideMonBlinkInvisible`/`rockSlideHealthboxWobbleY2` (shake + falling-rock + blink choreography, `battleScene.ts:11706-11772` and helpers) | `animation` event, `animationId: "MOVE_ANIMATION"` | **kind is emitted today** (`battleScriptHitChainOpcode.ts:1089-1103`), but payload is only an opaque id + 6 numeric-string `arguments` (move id, anim-turn counter, power, damage, friendship, multihit) — **gap**: no frame-by-frame choreography (shake amplitude/timing, rock spawn positions) is in the payload; battleScene.ts's own ~10 `rockSlide*` helper functions currently hold 100% of that choreography by hand |
| effectiveness SFX cue (`SE_SUPER_EFFECTIVE` etc., `battleScriptHitChainOpcode.ts:1144`) | `play-se` event | **emitted today**, but moot for this checkpoint specifically: the oracle comparison is pixel-only (PNG framebuffer), so no committed trace can verify audio-event wiring either way — a structural blind spot independent of which window is chosen |
| "Foe GROVYLE's evasiveness rose!" banner (`STAT_ROSE_LINE1`/`LINE2`, `battleMenu.ts:1592`, drawn earlier in the same dispatcher path, `battleScene.ts:5265`) | `stat-stage-change` event | **named gap**: this event kind is declared but has zero emission sites anywhere (§1) — DOUBLE_TEAM's evasion-rise banner has no kernel event to consume even in principle today |

## 5. Named gaps (ranked by how many candidate windows they block)

1. **`outcome` event is declared but never emitted anywhere** (`battleScriptEvents.ts:141-144`, only referenced at `battleScriptMachine.ts:620`). Blocks any win/loss/draw presentation window (e.g. the `turn17-rung*` family) and is exactly what ROADMAP step (iv) — "close the loop... `roundController.ts` consumes that outcome" — will need to add.
2. **`switch` event is declared but never emitted** (`battleScriptEvents.ts:135-140`, `battleScriptMachine.ts:619`). Blocks every `turn15-sendout-rung*`/`turn15-party-select*` window (10 committed traces) that presents a mid-battle mon swap.
3. **`status-change` and `stat-stage-change` events are declared but never emitted** (`battleScriptEvents.ts:116-128`, `battleScriptMachine.ts:617-618`). Blocks the stat-rose/stat-fall banner in the very trace this scout examined (`turn1-rockslide.json`'s DOUBLE_TEAM evasion-rise text) and any sleep/paralysis/burn-onset presentation.
4. **No tick/frame timestamp on any emitted event.** `BattleScriptEventProvenance` (`battleScriptEvents.ts:1-9`) has `programCounter`/`opcodeId`/`instructionExecution` (an execution-count sequence number) but nothing a presentation layer can anchor a `pressTick`-style tick countdown to. Blocks the *timing* half of every single-window mapping in §4, even where the *content* half (hp-change, message, animation) already exists.
5. **No production message-string resolver.** Only one hardcoded case exists (`factoryBattleScriptDecision.ts:569-580`, `STRINGID_PKMNFASTASLEEP` only). Every hardcoded `*_LINE1`/`*_LINE2` literal in `battleScene.ts`/`battleMenu.ts` (dozens, across all 163 committed traces) would need this before any message-kind event could replace it.
6. **`animation` event payload has no frame-by-frame choreography**, only an opaque `animationId` + numeric-string `arguments` (`battleScriptEvents.ts:129-134`). The ~30 `rockSlide*`/`turn*Shake`/`turn*Wobble` helper functions in `battleScene.ts` currently hold all of that choreography by hand; nothing downstream of the event could reproduce pixel-exact motion without a separate animation-timeline interpreter (plausibly the animation lane's Battle-Scene-ON track, unverified here — out of this scout's scope).
7. **Dispatch-level `turn<N>Resolved` booleans have no kernel-event counterpart by design** — they answer "which script/turn is the machine executing," which is scheduler/program-counter state, not battle-content. Every candidate window in §4 needed at least one such input with **no plausible event mapping**. Re-driving any window from kernel events still needs a bridge from "the battle-script machine is at label/PC X" to "presentation should show window Y" — this bridge does not exist in either direction today.
8. **Audio events are unverifiable by the pixel-only oracle.** `play-se`/`play-fanfare` are emitted today, but no committed trace can confirm correct wiring either way, since captures are RGB888 framebuffers only. Independent of which window is chosen for the checkpoint.

## 6. Recommendation

Re-drive **`turn5-faint.json`** (110/110, `docs/battle-turn-notes.md:4264`)
first: its leaf function (`drawTurn5RockSlideWindow`'s fainted branch,
`battleScene.ts:11654-11683`) has the narrowest signature and zero RAM-dump
reads of any candidate examined, and its single meaningful content
dependency — "Grovyle's HP has reached 0" — maps directly onto the `hp-change`
event that already executes today (`battleScriptHitChainOpcode.ts:1356`).
The remaining two inputs (the `STRINGID_FAINTED` message and the dispatch
booleans) are exactly the two structural gaps worth surfacing early: the
message needs opcode 73 (moveend, ROADMAP step iii, not yet registered) plus
a string-table resolver that does not exist in production code anywhere
(gap #5); the dispatch booleans need a scheduler-to-window bridge that has no
design yet (gap #7). Both gaps are real work items, not window-specific
accidents — they will recur on every other window in §4's table, so finding
them via the cheapest window first is exactly this checkpoint's purpose.
